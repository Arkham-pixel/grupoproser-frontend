import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFilePdf, FaTrash, FaUpload } from 'react-icons/fa';
import {
  expressAlertError,
  expressBtnGhost,
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, InputFenix, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { formatMilesInputNsr10, formatMilesNsr10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { getImageUrl } from '../../utils/imageUtils.js';
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
  return new File([blob], nombre, { type: tipo });
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
} = {}) {
  const { t } = useTranslation();
  const tq = (key, opts) => t(`${i18nPrefix}.${key}`, opts);
  const inputRef = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [pdfArchivoId, setPdfArchivoId] = useState('');
  const cotizacion = value && typeof value === 'object' ? value : null;
  const paginas = Array.isArray(cotizacion?.paginas) ? cotizacion.paginas : [];
  const pdfsArchivero = useMemo(
    () => archivosPdfCotizacion(archivosCaso),
    [archivosCaso]
  );

  useEffect(
    () => () => {
      revocarPreviewsCotizacion(paginas);
    },
    // solo al desmontar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const emitir = (next) => {
    onChange?.(next);
  };

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
      usarComoBasePresupuesto: true,
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
        descripcion: 'Cotización de reparación (PDF original)',
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
        usarComoBasePresupuesto: true,
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
          {tq('quoteTitle')}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {tq('quoteHint')}
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
        </div>
      )}

      {cotizacion && (
        <>
          {paginas.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginas.map((pagina, idx) => {
              const src =
                pagina.preview ||
                getImageUrl(pagina) ||
                (pagina.ruta ? getImageUrl({ ruta: pagina.ruta }) : '');
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
                    <img
                      src={src}
                      alt={pagina.descripcion || `Página ${pagina.pagina || idx + 1}`}
                      className="h-48 w-full object-contain bg-gray-50 dark:bg-gray-950"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-xs text-gray-400">
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
                    <button
                      type="button"
                      className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                      disabled={disabled || procesando}
                      onClick={() => eliminarPagina(idx)}
                    >
                      {tq('quoteRemovePage')}
                    </button>
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
            {cotizacion?.montoDetectado
              ? tq('quoteAmountHintDetected', {
                  valor: formatMilesNsr10(cotizacion.montoDetectado),
                })
              : tq('quoteAmountHintManual')}
          </p>
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
        </>
      )}
    </div>
  );
}
