import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaChevronLeft,
  FaChevronRight,
  FaExternalLinkAlt,
  FaEye,
  FaFilePdf,
  FaSearchMinus,
  FaSearchPlus,
  FaTimes,
  FaTrash,
  FaUpload,
} from 'react-icons/fa';
import {
  expressAlertError,
  expressBtnGhost,
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, InputFenix, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { formatMilesInputNsr10, formatMilesNsr10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { getImageUrl } from '../../utils/imageUtils.js';
import { esMontoMillonesTruncadoCOP } from '../../utils/parsearMontoCOP.js';
import {
  archivosPdfCotizacion,
  ETIQUETA_ARCHIVO_COTIZACION,
  parsearMontoCotizacionExport,
  procesarCotizacionPdf,
  revocarPreviewsCotizacion,
} from './cotizacionPdfLiquidacion.js';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchArchivoComoFile(url, nombre = 'cotizacion.pdf') {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`No se pudo leer el PDF (${res.status})`);
  const blob = await res.blob();
  const tipo = blob.type || 'application/pdf';
  return new File([blob], nombre, { type: tipo.includes('pdf') ? 'application/pdf' : tipo });
}

function srcDePagina(pagina) {
  if (!pagina) return '';
  return (
    pagina.preview ||
    getImageUrl(pagina) ||
    (pagina.ruta ? getImageUrl({ ruta: pagina.ruta }) : '') ||
    ''
  );
}

/**
 * Sube PDF de cotización, genera capturas y deja el monto final editable
 * para usarlo como base del deducible.
 */
export default function CotizacionPdfLiquidacion({
  value = null,
  onChange,
  casoId = null,
  api = null,
  archivosCaso = [],
  onArchivosCreados,
  onArchivosEliminados,
  disabled = false,
  i18nPrefix = 'zurich.settlement',
  titulo = null,
  hint = null,
  descripcionUpload = '',
  mostrarUsarComoBase = true,
  usarComoBasePorDefecto = true,
} = {}) {
  const { t } = useTranslation();
  const tq = (key, opts) => t(`${i18nPrefix}.${key}`, opts);
  const inputRef = useRef(null);
  const pdfBlobUrlRef = useRef('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [pdfArchivoId, setPdfArchivoId] = useState('');
  const [previewPaginaIdx, setPreviewPaginaIdx] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [pdfPreviewNombre, setPdfPreviewNombre] = useState('');
  const [cargandoPdfPreview, setCargandoPdfPreview] = useState(false);
  const cotizacion = value && typeof value === 'object' ? value : null;
  const paginas = Array.isArray(cotizacion?.paginas) ? cotizacion.paginas : [];
  const pdfsArchivero = useMemo(
    () => archivosPdfCotizacion(archivosCaso),
    [archivosCaso]
  );
  const pdfOriginal = useMemo(() => {
    const fromCotiz = cotizacion?.archivoPdf;
    if (fromCotiz?._id) {
      const found = pdfsArchivero.find((a) => String(a._id) === String(fromCotiz._id));
      if (found?.ruta) return found;
    }
    if (fromCotiz?.ruta) return fromCotiz;
    const nombre = String(cotizacion?.nombreOriginal || '').trim().toLowerCase();
    if (nombre) {
      const porNombre = pdfsArchivero.find(
        (a) => String(a.nombreOriginal || a.nombre || '').trim().toLowerCase() === nombre
      );
      if (porNombre?.ruta) return porNombre;
    }
    return fromCotiz?.ruta ? fromCotiz : null;
  }, [cotizacion, pdfsArchivero]);
  const pdfArchiveroSeleccionado = useMemo(
    () => pdfsArchivero.find((a) => String(a._id) === String(pdfArchivoId)) || null,
    [pdfsArchivero, pdfArchivoId]
  );

  const revocarPdfBlob = () => {
    if (pdfBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      } catch {
        /* ignore */
      }
      pdfBlobUrlRef.current = '';
    }
    setPdfBlobUrl('');
    setPdfPreviewNombre('');
  };

  const cerrarPreviews = () => {
    setPreviewPaginaIdx(null);
    setZoom(1);
    revocarPdfBlob();
  };

  const abrirVistaPagina = (idx) => {
    if (idx < 0 || idx >= paginas.length) return;
    revocarPdfBlob();
    setZoom(1);
    setPreviewPaginaIdx(idx);
  };

  const urlDeArchivoPdf = (archivo) => {
    const ruta = archivo?.ruta;
    if (!ruta || !api?.url) return '';
    try {
      return api.url(ruta) || '';
    } catch {
      return '';
    }
  };

  const abrirPdfOriginal = async (archivo) => {
    const url = urlDeArchivoPdf(archivo);
    const nombre =
      archivo?.nombreOriginal ||
      archivo?.nombre ||
      cotizacion?.nombreOriginal ||
      'cotizacion.pdf';
    if (!url) {
      setError(tq('quotePreviewError', { defaultValue: 'No se pudo abrir la vista previa del PDF.' }));
      return;
    }
    setCargandoPdfPreview(true);
    setError('');
    try {
      const file = await fetchArchivoComoFile(url, nombre);
      const pdfBlob = file.type.includes('pdf')
        ? file
        : new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
      revocarPdfBlob();
      const blobUrl = URL.createObjectURL(pdfBlob);
      pdfBlobUrlRef.current = blobUrl;
      setPdfBlobUrl(blobUrl);
      setPdfPreviewNombre(nombre);
      setPreviewPaginaIdx(null);
    } catch (err) {
      console.warn(err);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setCargandoPdfPreview(false);
    }
  };

  useEffect(
    () => () => {
      revocarPreviewsCotizacion(paginas);
      if (pdfBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(pdfBlobUrlRef.current);
        } catch {
          /* ignore */
        }
        pdfBlobUrlRef.current = '';
      }
    },
    // solo al desmontar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const modalAbierto = previewPaginaIdx != null || Boolean(pdfBlobUrl);
    if (!modalAbierto) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrarPreviews();
        return;
      }
      if (previewPaginaIdx == null) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPreviewPaginaIdx((i) => Math.max(0, (i ?? 0) - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPreviewPaginaIdx((i) => Math.min(paginas.length - 1, (i ?? 0) + 1));
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
      }
      if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  // cerrarPreviews usa setState; no hace falta re-suscribir en cada render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPaginaIdx, pdfBlobUrl, paginas.length]);

  const emitir = (next) => {
    onChange?.(next);
  };

  const truncadoAplicadoRef = useRef('');
  useEffect(() => {
    if (procesando) truncadoAplicadoRef.current = '';
  }, [procesando]);
  useEffect(() => {
    if (!cotizacion || disabled || procesando) return;
    const crudo = String(cotizacion.montoFinal || '');
    const monto = parsearMontoCotizacionExport(cotizacion.montoFinal);
    const detectado = parsearMontoCotizacionExport(cotizacion.montoDetectado);
    if (!esMontoMillonesTruncadoCOP(crudo, monto)) return;
    if (detectado > 0 && Math.round(detectado) !== Math.round(monto)) return;
    const clave = `${crudo}|${Math.round(monto)}`;
    if (truncadoAplicadoRef.current === clave) return;
    truncadoAplicadoRef.current = clave;
    const corregido = monto * 1000;
    const cands = Array.isArray(cotizacion.candidatos) ? [...cotizacion.candidatos] : [];
    if (!cands.some((c) => Math.round(Number(c.monto)) === Math.round(corregido))) {
      cands.unshift({
        monto: corregido,
        crudo: `${crudo}.000`,
        linea: 'TOTAL',
        score: 999,
      });
    }
    if (!cands.some((c) => Math.round(Number(c.monto)) === Math.round(monto))) {
      cands.push({
        monto,
        crudo,
        linea: crudo,
        score: 1,
      });
    }
    emitir({
      ...cotizacion,
      montoFinal: formatMilesNsr10(corregido),
      montoDetectado: corregido,
      candidatos: cands,
      millonesCompletados: true,
    });
  }, [cotizacion, disabled, procesando]);

  const notificarEliminados = (ids = []) => {
    const limpios = [...new Set((ids || []).map((id) => String(id || '')).filter(Boolean))];
    if (!limpios.length) return;
    onArchivosEliminados?.(limpios);
  };

  const borrarArchivoServidor = async (archivoId) => {
    if (!casoId || !archivoId || !api?.eliminar) return false;
    try {
      await api.eliminar(casoId, archivoId);
      return true;
    } catch (err) {
      console.warn('No se pudo eliminar archivo de cotización:', err);
      return false;
    }
  };

  const idsCapturasCotizacion = (lista = []) =>
    (lista || []).map((p) => p?._id).filter(Boolean);

  const persistirCapturas = async (resultado, filePdf) => {
    const base = {
      nombreOriginal: filePdf?.name || resultado.nombreOriginal || 'cotizacion.pdf',
      montoFinal:
        resultado.montoDetectado > 0
          ? formatMilesNsr10(resultado.montoDetectado)
          : '',
      montoDetectado: resultado.montoDetectado > 0 ? resultado.montoDetectado : '',
      usarComoBasePresupuesto: usarComoBasePorDefecto,
      archivoPdf: null,
      paginas: resultado.paginas,
      candidatos: resultado.candidatos,
    };
    emitir(base);
    if (!casoId || !api?.subir) return base;

    const creados = [];
    let archivoPdf = null;
    try {
      archivoPdf = await api.subir(casoId, filePdf, ETIQUETA_ARCHIVO_COTIZACION, {
        descripcion: descripcionUpload || 'Cotización de reparación (PDF original)',
      });
      if (archivoPdf) creados.push(archivoPdf);
    } catch (err) {
      console.warn('No se pudo guardar el PDF original de cotización:', err);
    }

    const paginasSubidas = [];
    for (const pagina of resultado.paginas) {
      if (!pagina?.file) {
        paginasSubidas.push(pagina);
        continue;
      }
      try {
        const creado = await api.subir(casoId, pagina.file, ETIQUETA_ARCHIVO_COTIZACION, {
          descripcion: pagina.descripcion || `Cotización · página ${pagina.pagina}`,
        });
        if (creado) creados.push(creado);
        if (pagina.preview && pagina.preview.startsWith('blob:')) {
          URL.revokeObjectURL(pagina.preview);
        }
        paginasSubidas.push({
          ...pagina,
          preview: undefined,
          file: undefined,
          _id: creado?._id,
          ruta: creado?.ruta,
          nombre: creado?.nombreOriginal || pagina.nombre,
          nombreOriginal: creado?.nombreOriginal || pagina.nombreOriginal,
          tipoMime: creado?.tipoMime || pagina.tipoMime,
          etiqueta: creado?.etiqueta || ETIQUETA_ARCHIVO_COTIZACION,
        });
      } catch (err) {
        console.warn('No se pudo guardar captura de cotización:', err);
        paginasSubidas.push(pagina);
      }
    }

    if (creados.length) onArchivosCreados?.(creados);
    const next = {
      ...base,
      archivoPdf: archivoPdf
        ? {
            _id: archivoPdf._id,
            ruta: archivoPdf.ruta,
            nombre: archivoPdf.nombreOriginal,
          }
        : null,
      paginas: paginasSubidas,
    };
    emitir(next);
    return next;
  };

  const procesarFile = async (file) => {
    if (!file) return;
    const esPdf =
      file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    if (!esPdf) {
      setError(tq('quoteInvalid'));
      return;
    }
    setError('');
    setProcesando(true);
    try {
      revocarPreviewsCotizacion(paginas);
      const resultado = await procesarCotizacionPdf(file);
      await persistirCapturas(resultado, file);
    } catch (err) {
      console.error(err);
      setError(err.message || tq('quoteError'));
    } finally {
      setProcesando(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    procesarFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled || procesando) return;
    const file = e.dataTransfer?.files?.[0];
    procesarFile(file);
  };

  const handlePdfArchivero = async () => {
    const arch = pdfsArchivero.find((a) => String(a._id) === String(pdfArchivoId));
    if (!arch) return;
    const url = api?.url?.(arch.ruta);
    if (!url) {
      setError(tq('quoteError'));
      return;
    }
    setProcesando(true);
    setError('');
    try {
      const file = await fetchArchivoComoFile(
        url,
        arch.nombreOriginal || arch.nombre || 'cotizacion.pdf'
      );
      revocarPreviewsCotizacion(paginas);
      const resultado = await procesarCotizacionPdf(file);
      const next = {
        nombreOriginal: file.name,
        montoFinal:
          resultado.montoDetectado > 0
            ? formatMilesNsr10(resultado.montoDetectado)
            : '',
        montoDetectado: resultado.montoDetectado > 0 ? resultado.montoDetectado : '',
        usarComoBasePresupuesto: usarComoBasePorDefecto,
        archivoPdf: {
          _id: arch._id,
          ruta: arch.ruta,
          nombre: arch.nombreOriginal || arch.nombre,
        },
        paginas: resultado.paginas,
        candidatos: resultado.candidatos,
      };
      emitir(next);
      if (!casoId || !api?.subir) return;
      const creados = [];
      const paginasSubidas = [];
      for (const pagina of resultado.paginas) {
        if (!pagina?.file) {
          paginasSubidas.push(pagina);
          continue;
        }
        try {
          const creado = await api.subir(casoId, pagina.file, ETIQUETA_ARCHIVO_COTIZACION, {
            descripcion: pagina.descripcion || `Cotización · página ${pagina.pagina}`,
          });
          if (creado) creados.push(creado);
          if (pagina.preview && pagina.preview.startsWith('blob:')) {
            URL.revokeObjectURL(pagina.preview);
          }
          paginasSubidas.push({
            ...pagina,
            preview: undefined,
            file: undefined,
            _id: creado?._id,
            ruta: creado?.ruta,
            nombre: creado?.nombreOriginal || pagina.nombre,
            nombreOriginal: creado?.nombreOriginal || pagina.nombreOriginal,
            tipoMime: creado?.tipoMime || pagina.tipoMime,
            etiqueta: creado?.etiqueta || ETIQUETA_ARCHIVO_COTIZACION,
          });
        } catch (err) {
          console.warn(err);
          paginasSubidas.push(pagina);
        }
      }
      if (creados.length) onArchivosCreados?.(creados);
      emitir({ ...next, paginas: paginasSubidas });
    } catch (err) {
      console.error(err);
      setError(err.message || tq('quoteError'));
    } finally {
      setProcesando(false);
    }
  };

  const patch = (parcial) => {
    emitir({
      ...(cotizacion || {}),
      ...parcial,
    });
  };

  const eliminarPagina = async (idx) => {
    const pagina = paginas[idx];
    if (!pagina) return;
    if (!window.confirm(tq('quoteRemovePageConfirm'))) return;
    setError('');
    if (previewPaginaIdx === idx) {
      setPreviewPaginaIdx(null);
      setZoom(1);
    } else if (previewPaginaIdx != null && previewPaginaIdx > idx) {
      setPreviewPaginaIdx(previewPaginaIdx - 1);
    }
    if (pagina.preview && String(pagina.preview).startsWith('blob:')) {
      try {
        URL.revokeObjectURL(pagina.preview);
      } catch {
        /* ignore */
      }
    }
    if (pagina._id) {
      const ok = await borrarArchivoServidor(pagina._id);
      if (ok) notificarEliminados([pagina._id]);
    }
    const siguientes = paginas
      .filter((_, i) => i !== idx)
      .map((p, i) => ({
        ...p,
        pagina: i + 1,
        orden: i,
        descripcion: p.descripcion?.replace(/página\s+\d+/i, `página ${i + 1}`) || `Cotización · página ${i + 1}`,
      }));
    if (!siguientes.length) {
      emitir({
        ...(cotizacion || {}),
        paginas: [],
      });
      return;
    }
    patch({ paginas: siguientes });
  };

  const limpiar = async () => {
    if (!window.confirm(tq('quoteClearConfirm'))) return;
    setError('');
    const ids = idsCapturasCotizacion(paginas);
    revocarPreviewsCotizacion(paginas);
    cerrarPreviews();
    emitir(null);
    setPdfArchivoId('');
    const borrados = [];
    for (const id of ids) {
      const ok = await borrarArchivoServidor(id);
      if (ok) borrados.push(id);
    }
    notificarEliminados(borrados);
  };

  const montoNum = parsearMontoCotizacionExport(cotizacion?.montoFinal);
  const candidatos = Array.isArray(cotizacion?.candidatos) ? cotizacion.candidatos : [];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {titulo || tq('quoteTitle')}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {hint || tq('quoteHint')}
        </p>
      </div>

      {error && <p className={expressAlertError}>{error}</p>}

      <div
        className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center dark:border-gray-700 dark:bg-gray-900/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <FaFilePdf className="mx-auto mb-2 h-8 w-8 text-red-600" />
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {procesando
            ? tq('quoteProcessing')
            : tq('quoteDropTitle')}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {tq('quoteDropSubtitle')}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={disabled || procesando}
            onChange={handleFile}
          />
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={disabled || procesando}
            onClick={() => inputRef.current?.click()}
          >
            <FaUpload /> {tq('quoteUpload')}
          </button>
          {(paginas.length > 0 || cotizacion) && (
            <button
              type="button"
              className={expressBtnGhost}
              disabled={disabled || procesando}
              onClick={limpiar}
            >
              <FaTrash /> {tq('quoteClear')}
            </button>
          )}
        </div>
      </div>

      {pdfsArchivero.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <Campo label={tq('quoteFromArchive')} className="flex-1">
            <SelectFenix
              value={pdfArchivoId}
              onChange={(e) => setPdfArchivoId(e.target.value)}
              disabled={disabled || procesando}
            >
              <option value="">{tq('quotePickPdf')}</option>
              {pdfsArchivero.map((a) => (
                <option key={String(a._id)} value={String(a._id)}>
                  {a.nombreOriginal || a.nombre || 'PDF'}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <button
            type="button"
            className={expressBtnGhost}
            disabled={disabled || procesando || !pdfArchivoId}
            onClick={handlePdfArchivero}
          >
            {tq('quoteUseArchive')}
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            disabled={procesando || cargandoPdfPreview || !pdfArchivoId}
            onClick={() => abrirPdfOriginal(pdfArchiveroSeleccionado)}
          >
            <FaEye />
            {cargandoPdfPreview
              ? tq('quotePreviewLoading', { defaultValue: 'Cargando documento…' })
              : tq('quotePreviewArchive', { defaultValue: 'Vista previa' })}
          </button>
        </div>
      )}

      {cotizacion && (
        <>
          {(paginas.length > 0 || pdfOriginal) && (
            <div className="flex flex-wrap items-center gap-2">
              {pdfOriginal && (
                <button
                  type="button"
                  className={expressBtnSecondary}
                  disabled={procesando || cargandoPdfPreview}
                  onClick={() => abrirPdfOriginal(pdfOriginal)}
                >
                  <FaEye />
                  {cargandoPdfPreview
                    ? tq('quotePreviewLoading', { defaultValue: 'Cargando documento…' })
                    : tq('quotePreviewPdf', { defaultValue: 'Ver PDF original' })}
                </button>
              )}
              {paginas.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tq('quotePreviewHint', {
                    defaultValue: 'Clic en una página para ampliarla y revisar el documento.',
                  })}
                </p>
              )}
            </div>
          )}
          {paginas.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginas.map((pagina, idx) => {
              const src = srcDePagina(pagina);
              return (
                <figure
                  key={pagina._id || pagina.preview || `p-${idx}`}
                  className="relative overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    className="absolute right-2 top-2 z-10 rounded-md bg-white/95 p-1.5 text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:bg-gray-900/90 dark:hover:bg-red-950/50"
                    disabled={disabled || procesando}
                    title={tq('quoteRemovePage')}
                    onClick={() => eliminarPagina(idx)}
                  >
                    <FaTrash className="h-3.5 w-3.5" />
                  </button>
                  {src ? (
                    <button
                      type="button"
                      className="group relative block w-full bg-gray-50 dark:bg-gray-950"
                      onClick={() => abrirVistaPagina(idx)}
                      title={tq('quotePreview', { defaultValue: 'Vista previa' })}
                    >
                      <img
                        src={src}
                        alt={pagina.descripcion || `Página ${pagina.pagina || idx + 1}`}
                        className="h-56 w-full object-contain"
                      />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/45">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 opacity-0 shadow-sm transition group-hover:opacity-100">
                          <FaSearchPlus />
                          {tq('quotePreview', { defaultValue: 'Vista previa' })}
                        </span>
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-56 items-center justify-center text-xs text-gray-400">
                      {tq('quotePage', {
                        n: pagina.pagina || idx + 1,
                      })}
                    </div>
                  )}
                  <figcaption className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] text-gray-500">
                    <span>
                      {tq('quotePage', {
                        n: pagina.pagina || idx + 1,
                      })}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        className="font-semibold text-sky-700 hover:underline disabled:opacity-50 dark:text-sky-300"
                        onClick={() => abrirVistaPagina(idx)}
                      >
                        {tq('quotePreview', { defaultValue: 'Vista previa' })}
                      </button>
                      <button
                        type="button"
                        className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                        disabled={disabled || procesando}
                        onClick={() => eliminarPagina(idx)}
                      >
                        {tq('quoteRemovePage')}
                      </button>
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label={tq('quoteAmount')}>
              <InputFenix
                className="font-mono"
                inputMode="decimal"
                value={cotizacion?.montoFinal || ''}
                disabled={disabled || procesando}
                onChange={(e) =>
                  patch({ montoFinal: formatMilesInputNsr10(e.target.value) })
                }
                placeholder="0"
              />
            </Campo>
            {candidatos.length > 1 && (
              <Campo label={tq('quoteDetected')}>
                <SelectFenix
                  value={String(Math.round(montoNum || 0))}
                  disabled={disabled || procesando}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    patch({ montoFinal: formatMilesNsr10(n) });
                  }}
                >
                  {candidatos.map((c) => (
                    <option key={`${c.monto}-${c.crudo}`} value={String(Math.round(c.monto))}>
                      $ {formatMilesNsr10(c.monto)}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {cotizacion?.millonesCompletados
              ? tq('quoteAmountHintMillones', {
                  defaultValue:
                    'El PDF traía $ {{valorCorto}} (faltaba .000). Se tomó $ {{valor}} como total en pesos.',
                  valorCorto: formatMilesNsr10(
                    parsearMontoCotizacionExport(cotizacion.montoFinal) / 1000
                  ),
                  valor: formatMilesNsr10(cotizacion.montoDetectado || cotizacion.montoFinal),
                })
              : cotizacion?.montoDetectado
              ? tq('quoteAmountHintDetected', {
                  valor: formatMilesNsr10(cotizacion.montoDetectado),
                })
              : tq('quoteAmountHintManual')}
          </p>
          {mostrarUsarComoBase ? (
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-blue-700"
              checked={cotizacion?.usarComoBasePresupuesto !== false}
              disabled={disabled || procesando}
              onChange={(e) => patch({ usarComoBasePresupuesto: e.target.checked })}
            />
            <span>
              {tq('quoteUseAsBase')}
              <span className="mt-0.5 block text-xs text-gray-500">
                {tq('quoteUseAsBaseHint')}
              </span>
            </span>
          </label>
          ) : (
            <p className="text-xs text-gray-500">{tq('quoteDoesNotReplaceBudget')}</p>
          )}
        </>
      )}

      {previewPaginaIdx != null && paginas[previewPaginaIdx] && (
        <div
          className="fixed inset-0 z-[120] flex flex-col bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label={tq('quotePreview', { defaultValue: 'Vista previa' })}
          onClick={cerrarPreviews}
        >
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">
              {tq('quotePageOf', {
                n: paginas[previewPaginaIdx].pagina || previewPaginaIdx + 1,
                total: paginas.length,
                defaultValue: 'Página {{n}} de {{total}}',
              })}
              {cotizacion?.nombreOriginal ? ` · ${cotizacion.nombreOriginal}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
                disabled={previewPaginaIdx <= 0}
                title={tq('quotePrevPage', { defaultValue: 'Página anterior' })}
                onClick={() => setPreviewPaginaIdx((i) => Math.max(0, (i ?? 0) - 1))}
              >
                <FaChevronLeft />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
                disabled={previewPaginaIdx >= paginas.length - 1}
                title={tq('quoteNextPage', { defaultValue: 'Página siguiente' })}
                onClick={() =>
                  setPreviewPaginaIdx((i) => Math.min(paginas.length - 1, (i ?? 0) + 1))
                }
              >
                <FaChevronRight />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
                disabled={zoom <= 0.5}
                title={tq('quoteZoomOut', { defaultValue: 'Alejar' })}
                onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
              >
                <FaSearchMinus />
              </button>
              <button
                type="button"
                className="rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20"
                title={tq('quoteZoomReset', { defaultValue: '100%' })}
                onClick={() => setZoom(1)}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
                disabled={zoom >= 3}
                title={tq('quoteZoomIn', { defaultValue: 'Acercar' })}
                onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
              >
                <FaSearchPlus />
              </button>
              {pdfOriginal && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/20"
                  onClick={() => abrirPdfOriginal(pdfOriginal)}
                >
                  <FaFilePdf />
                  {tq('quotePreviewPdf', { defaultValue: 'Ver PDF original' })}
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-100"
                onClick={cerrarPreviews}
              >
                <FaTimes />
                {tq('quotePreviewClose', { defaultValue: 'Cerrar' })}
              </button>
            </div>
          </div>
          <div
            className="relative min-h-0 flex-1 overflow-auto p-3 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={srcDePagina(paginas[previewPaginaIdx])}
              alt={
                paginas[previewPaginaIdx].descripcion ||
                `Página ${paginas[previewPaginaIdx].pagina || previewPaginaIdx + 1}`
              }
              className="mx-auto h-auto rounded-sm bg-white shadow-2xl"
              style={{
                width: `${Math.round(zoom * 100)}%`,
                maxWidth: zoom > 1 ? 'none' : '1100px',
              }}
            />
          </div>
        </div>
      )}

      {pdfBlobUrl && (
        <div
          className="fixed inset-0 z-[130] flex flex-col bg-black/85"
          role="dialog"
          aria-modal="true"
          aria-label={tq('quotePreviewPdf', { defaultValue: 'Ver PDF original' })}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/50 px-3 py-2 text-white">
            <p className="truncate text-sm font-semibold">
              {pdfPreviewNombre || tq('quotePreviewPdf', { defaultValue: 'Ver PDF original' })}
            </p>
            <div className="flex items-center gap-1.5">
              <a
                href={pdfBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                <FaExternalLinkAlt />
                {tq('quoteOpenTab', { defaultValue: 'Abrir en pestaña' })}
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-100"
                onClick={cerrarPreviews}
              >
                <FaTimes />
                {tq('quotePreviewClose', { defaultValue: 'Cerrar' })}
              </button>
            </div>
          </div>
          <iframe
            title={pdfPreviewNombre || 'PDF'}
            src={pdfBlobUrl}
            className="min-h-0 w-full flex-1 bg-neutral-800"
          />
        </div>
      )}
    </div>
  );
}
