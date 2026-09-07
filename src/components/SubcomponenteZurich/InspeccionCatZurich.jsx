import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowDown,
  FaArrowUp,
  FaCloudUploadAlt,
  FaFileWord,
  FaGripVertical,
  FaSave,
  FaTimes,
  FaTrash,
} from 'react-icons/fa';
import logoZurich from '../../assets/zurich-logo.png';
import {
  actualizarArchivoZurich,
  eliminarArchivoZurich,
  getCasoZurichById,
  guardarCatEnCasoZurich,
  reordenarArchivosZurich,
  subirArchivoZurich,
  urlDescargaArchivoZurich,
} from '../../services/zurichService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, InputFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  EVIDENCIA_CAT_VACIA,
  SEVERIDAD_CAT_ZURICH,
  normalizeEvidenciaCat,
  normalizeSeveridadCatNiveles,
  finalizarSeveridadCatNiveles,
  derivarSeveridadCatDesdeNiveles,
  formatDateIso,
  formatMilesInput,
  parseNumeroZurich,
} from './zurichHelpers.js';
import { descargarDesprendibleCatZurich } from './generarDesprendibleCatZurich.js';
import { getImageUrl, createImageErrorHandler } from '../../utils/imageUtils';
import { AUTOSAVE_DEBOUNCE_MS } from '../../config/autoSaveConfig.js';
import { ACCEPT_ARCHIVOS_IMAGEN, asegurarJpeg, esArchivoImagen } from '../../utils/heicToJpeg.js';

const SEVERIDAD_MANUAL_CAT = SEVERIDAD_CAT_ZURICH.map((s) => ({
  nivel: s.valor,
  descripcion: s.descripcion,
}));

const OBJETIVO_MANUAL =
  'Objetivo: entregar al ajustador información clave, sencilla y resumida para clasificar la severidad, completar la base de Excel y registrar evidencia fotográfica/documental. Este documento no autoriza a confirmar cobertura, negar cobertura, prometer pagos o actuar como vocero de Zurich.';

const INTRO_SEVERIDAD =
  'La severidad es un criterio operativo preliminar para priorizar el reporte de exposición. No constituye definición de cobertura ni liquidación del siniestro. Marque Aplica en cada tipo de daño observado; si no lo marca, se registra como No aplica.';

const RECORDATORIO =
  'Recordatorio operativo: documentar hechos observables, no conclusiones de cobertura. Mantener trazabilidad de fecha, hora, ubicación, fuente y soporte.';

const esImagen = (fileOrName) => esArchivoImagen(fileOrName);

const esFotoArchivo = (a) => {
  const et = String(a?.etiqueta || '').toUpperCase();
  const nombre = String(a?.nombreOriginal || a?.nombreArchivo || a?.nombre || '');
  return (
    et === 'FOTOS' ||
    et === 'INSPECCION' ||
    et.startsWith('FOTO_') ||
    esImagen(nombre) ||
    String(a?.tipoMime || '').startsWith('image/')
  );
};

const idFoto = (f, index = 0) => String(f?._id || f?.ruta || `tmp-${index}`);

const ordenarFotos = (lista) =>
  [...(lista || [])].sort((a, b) => {
    const oa = Number.isFinite(Number(a?.orden)) ? Number(a.orden) : Number.MAX_SAFE_INTEGER;
    const ob = Number.isFinite(Number(b?.orden)) ? Number(b.orden) : Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    const fa = a?.fechaSubida ? new Date(a.fechaSubida).getTime() : 0;
    const fb = b?.fechaSubida ? new Date(b.fechaSubida).getTime() : 0;
    return fa - fb;
  });

/**
 * Manual CAT Zurich:
 * 1) Cada nivel de daño: APLICA / NO APLICA
 * 2) Fotos con descripción y reordenamiento (como inspección fotográfica)
 */
export default function InspeccionCatZurich({ casoZurich = null, onCasoChange }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const descripcionTimeoutRef = useRef({});
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [generandoDoc, setGenerandoDoc] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [arrastrandoId, setArrastrandoId] = useState(null);
  const [destinoArrastreId, setDestinoArrastreId] = useState(null);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const [archivos, setArchivos] = useState(() => casoZurich?.archivos || []);
  const [observacionesCat, setObservacionesCat] = useState(
    () => casoZurich?.observacionesCat || ''
  );
  const [fechaInspeccion, setFechaInspeccion] = useState(
    () => formatDateIso(casoZurich?.fechaInspeccion) || formatDateIso(new Date())
  );
  const [reservaPerito, setReservaPerito] = useState(
    () => formatMilesInput(casoZurich?.reserva ?? '')
  );
  const [observacionReserva, setObservacionReserva] = useState(
    () => casoZurich?.observacionReserva || ''
  );

  const [severidadNiveles, setSeveridadNiveles] = useState(() =>
    normalizeSeveridadCatNiveles(casoZurich?.severidadCatNiveles, casoZurich?.severidadCat)
  );
  const [evidenciaCat, setEvidenciaCat] = useState(() =>
    normalizeEvidenciaCat(casoZurich?.evidenciaCat)
  );
  const catListoRef = useRef(false);

  useEffect(() => {
    catListoRef.current = false;
    // Solo al cambiar de caso: no resetear severidad al subir fotos / refrescar updatedAt
    setSeveridadNiveles(
      normalizeSeveridadCatNiveles(casoZurich?.severidadCatNiveles, casoZurich?.severidadCat)
    );
    setEvidenciaCat(normalizeEvidenciaCat(casoZurich?.evidenciaCat));
    setArchivos(casoZurich?.archivos || []);
    setObservacionesCat(casoZurich?.observacionesCat || '');
    setFechaInspeccion(
      formatDateIso(casoZurich?.fechaInspeccion) || formatDateIso(new Date())
    );
    setReservaPerito(formatMilesInput(casoZurich?.reserva ?? ''));
    setObservacionReserva(casoZurich?.observacionReserva || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoZurich?._id]);

  useEffect(() => {
    return () => {
      Object.values(descripcionTimeoutRef.current || {}).forEach((id) => clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (!imagenAmpliada) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setImagenAmpliada(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imagenAmpliada]);

  const setSeveridadAplica = (nivel, marcado) => {
    const key = String(nivel);
    setSeveridadNiveles((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { aplica: null, observacion: '' }),
        aplica: marcado ? 'SI' : 'NO',
      },
    }));
  };

  const fotos = useMemo(
    () => ordenarFotos((archivos || []).filter(esFotoArchivo)),
    [archivos]
  );

  const refrescarArchivos = async () => {
    if (!casoZurich?._id) return;
    const actualizado = await getCasoZurichById(casoZurich._id);
    setArchivos(actualizado.archivos || []);
    onCasoChange?.(actualizado);
    return actualizado;
  };

  const persistirOrdenFotos = async (fotosOrdenadas) => {
    const ids = fotosOrdenadas.map((f) => f._id).filter(Boolean);
    setArchivos((prev) => {
      const ordenMap = new Map(fotosOrdenadas.map((f, i) => [idFoto(f, i), i]));
      return (prev || []).map((a, i) => {
        const clave = idFoto(a, i);
        if (!ordenMap.has(clave)) return a;
        return { ...a, orden: ordenMap.get(clave) };
      });
    });
    if (!casoZurich?._id || !ids.length) return;
    try {
      await reordenarArchivosZurich(casoZurich._id, ids);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el orden de las fotos');
    }
  };

  const moverFoto = (fotoId, delta) => {
    const idx = fotos.findIndex((f, i) => idFoto(f, i) === String(fotoId));
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= fotos.length) return;
    const copia = [...fotos];
    [copia[idx], copia[next]] = [copia[next], copia[idx]];
    persistirOrdenFotos(copia);
  };

  const reordenarFotos = (origenId, destinoId) => {
    if (!origenId || !destinoId || origenId === destinoId) return;
    const origenIdx = fotos.findIndex((f, i) => idFoto(f, i) === String(origenId));
    const destinoIdx = fotos.findIndex((f, i) => idFoto(f, i) === String(destinoId));
    if (origenIdx < 0 || destinoIdx < 0) return;
    const copia = [...fotos];
    const [item] = copia.splice(origenIdx, 1);
    copia.splice(destinoIdx, 0, item);
    persistirOrdenFotos(copia);
  };

  const sincronizarArchivosEnCaso = (nextArchivos) => {
    onCasoChange?.((prev) => (prev ? { ...prev, archivos: nextArchivos } : prev));
  };

  const actualizarDescripcionFoto = (fotoId, descripcion) => {
    const clave = String(fotoId);
    setArchivos((prev) => {
      const next = (prev || []).map((a, i) =>
        idFoto(a, i) === clave ? { ...a, descripcion } : a
      );
      sincronizarArchivosEnCaso(next);
      return next;
    });

    if (descripcionTimeoutRef.current[clave]) {
      clearTimeout(descripcionTimeoutRef.current[clave]);
    }
    descripcionTimeoutRef.current[clave] = setTimeout(async () => {
      if (!casoZurich?._id || !clave || clave.startsWith('tmp-')) return;
      try {
        await actualizarArchivoZurich(casoZurich._id, clave, { descripcion });
      } catch (err) {
        setError(err.message || 'No se pudo guardar la descripción de la foto');
      }
    }, 400);
  };

  const flushDescripcionFoto = async (fotoId, descripcion) => {
    const clave = String(fotoId);
    if (descripcionTimeoutRef.current[clave]) {
      clearTimeout(descripcionTimeoutRef.current[clave]);
      delete descripcionTimeoutRef.current[clave];
    }
    setArchivos((prev) => {
      const next = (prev || []).map((a, i) =>
        idFoto(a, i) === clave ? { ...a, descripcion } : a
      );
      sincronizarArchivosEnCaso(next);
      return next;
    });
    if (!casoZurich?._id || !clave || clave.startsWith('tmp-')) return;
    try {
      await actualizarArchivoZurich(casoZurich._id, clave, { descripcion });
    } catch (err) {
      setError(err.message || 'No se pudo guardar la descripción de la foto');
    }
  };

  const subirFotos = async (fileList) => {
    const files = Array.from(fileList || []).filter(esImagen);
    if (!files.length) {
      setError('Seleccione solo fotos (JPG, PNG, GIF, WEBP o HEIC).');
      return;
    }
    if (!casoZurich?._id) {
      setError(t('zurich.cat.needSavedCase'));
      return;
    }
    setError('');
    setMensaje('');
    setSubiendo(true);
    try {
      const subidos = [];
      for (const original of files) {
        const file = await asegurarJpeg(original);
        const preview = URL.createObjectURL(file);
        const creado = await subirArchivoZurich(casoZurich._id, file, 'FOTOS', {
          descripcion: '',
        });
        if (creado) subidos.push({ ...creado, preview });
        else URL.revokeObjectURL(preview);
      }
      setArchivos((prev) => [...(prev || []), ...subidos]);
      try {
        await refrescarArchivos();
      } catch (refreshErr) {
        console.warn('Refresh archivos Zurich:', refreshErr);
      }
      setMensaje(
        files.length === 1
          ? t('zurich.archive.uploadOk')
          : `${files.length} fotos subidas correctamente.`
      );
    } catch (err) {
      setError(err.message || t('zurich.archive.uploadError'));
    } finally {
      setSubiendo(false);
    }
  };

  const handleDropZone = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    await subirFotos(e.dataTransfer?.files);
  };

  const handleFileInputChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await subirFotos(files);
  };

  const handleDeleteArchivo = async (archivoId) => {
    if (!window.confirm(t('zurich.archive.confirmDelete'))) return;
    try {
      await eliminarArchivoZurich(casoZurich._id, archivoId);
      setArchivos((prev) => (prev || []).filter((a) => String(a._id) !== String(archivoId)));
      await refrescarArchivos();
    } catch (err) {
      setError(err.message || t('zurich.archive.deleteError'));
    }
  };

  const buildCatPayload = () => {
    const niveles = finalizarSeveridadCatNiveles(severidadNiveles);
    const evidencia = normalizeEvidenciaCat(evidenciaCat);
    const severidadCat = derivarSeveridadCatDesdeNiveles(niveles);
    const accesoPredio = evidencia.noAcceso?.aplica === 'SI' ? 'NO' : 'SI';
    const fechaVisita = fechaInspeccion || formatDateIso(new Date());
    const cat = {
      severidadCat,
      severidadCatNiveles: niveles,
      accesoPredio,
      evidenciaCat: { ...EVIDENCIA_CAT_VACIA, ...evidencia },
      observacionesCat: observacionesCat || null,
      fechaInspeccion: fechaVisita,
      reserva: parseNumeroZurich(reservaPerito),
      observacionReserva: observacionReserva || null,
    };
    return { cat, niveles, evidencia, severidadCat };
  };

  const persistirCat = async ({ silencioso = false } = {}) => {
    if (!casoZurich?._id) {
      if (!silencioso) setError(t('zurich.cat.needSavedCase'));
      return null;
    }
    if (!silencioso) {
      setGuardando(true);
      setError('');
      setMensaje('');
    }
    try {
      const { cat } = buildCatPayload();
      const actualizado = await guardarCatEnCasoZurich({
        casoId: casoZurich._id,
        cat,
        casoBase: casoZurich,
        marcarInspeccionado: !silencioso,
      });
      if (!silencioso) {
        setSeveridadNiveles(
          finalizarSeveridadCatNiveles(
            actualizado?.severidadCatNiveles ?? cat.severidadCatNiveles,
            actualizado?.severidadCat ?? cat.severidadCat
          )
        );
      }
      onCasoChange?.(actualizado);
      if (!silencioso) setMensaje(t('zurich.cat.savedOk'));
      return actualizado;
    } catch (err) {
      if (!silencioso) setError(err.message || t('zurich.cat.savedError'));
      return null;
    } finally {
      if (!silencioso) setGuardando(false);
    }
  };

  useEffect(() => {
    if (!casoZurich?._id) return undefined;
    if (!catListoRef.current) {
      catListoRef.current = true;
      return undefined;
    }
    const timer = setTimeout(() => {
      persistirCat({ silencioso: true });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severidadNiveles, observacionesCat, evidenciaCat, fechaInspeccion, reservaPerito, observacionReserva, casoZurich?._id]);

  const guardarCat = async () => persistirCat({ silencioso: false });

  const guardarYDesprendible = async () => {
    if (!casoZurich?._id) {
      setError(t('zurich.cat.needSavedCase'));
      return;
    }
    setGenerandoDoc(true);
    setError('');
    setMensaje('');
    try {
      const { cat } = buildCatPayload();
      const guardado = await guardarCatEnCasoZurich({
        casoId: casoZurich._id,
        cat,
        casoBase: casoZurich,
        marcarInspeccionado: true,
      });
      onCasoChange?.(guardado);
      const base = {
        ...(guardado || {}),
        ...cat,
        archivos: archivos?.length ? archivos : guardado?.archivos || casoZurich.archivos || [],
      };
      const nombre = await descargarDesprendibleCatZurich(base);
      setMensaje(`Guardado en el caso y desprendible descargado: ${nombre}`);
    } catch (err) {
      setError(err.message || 'No se pudo guardar o generar el desprendible Word');
    } finally {
      setGenerandoDoc(false);
    }
  };

  /** Solo Word con el estado actual de pantalla (no persiste en el caso). */
  const exportarDesprendibleSinGuardar = async () => {
    setGenerandoDoc(true);
    setError('');
    setMensaje('');
    try {
      const { cat } = buildCatPayload();
      const base = {
        ...(casoZurich || {}),
        ...cat,
        archivos: archivos?.length ? archivos : casoZurich?.archivos || [],
      };
      const nombre = await descargarDesprendibleCatZurich(base);
      setMensaje(`Desprendible exportado (sin guardar): ${nombre}`);
    } catch (err) {
      setError(err.message || 'No se pudo generar el desprendible Word');
    } finally {
      setGenerandoDoc(false);
    }
  };

  const th =
    'border border-gray-300 bg-gray-100 px-2 py-2 text-left font-body text-[11px] font-bold uppercase tracking-wide text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200';
  const td =
    'border border-gray-300 px-2 py-2 font-body text-sm text-gray-800 dark:border-gray-600 dark:text-gray-100 align-top';

  const abrirFotoGrande = (e, foto, url) => {
    e.preventDefault();
    e.stopPropagation();
    if (arrastrandoId || !url) return;
    setImagenAmpliada({
      url,
      descripcion: foto?.descripcion || '',
      nombre: foto?.nombreOriginal || 'Foto',
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {imagenAmpliada ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setImagenAmpliada(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de la foto"
        >
          <button
            type="button"
            onClick={() => setImagenAmpliada(null)}
            className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/20"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <FaTimes size={24} />
          </button>
          <div className="max-h-full max-w-7xl overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={imagenAmpliada.url}
              alt={imagenAmpliada.descripcion || imagenAmpliada.nombre || 'Vista ampliada'}
              className="max-h-[90vh] max-w-full rounded object-contain"
            />
            {(imagenAmpliada.descripcion || imagenAmpliada.nombre) && (
              <p className="mt-4 rounded bg-black/70 px-4 py-2 text-center font-body text-sm text-white">
                {imagenAmpliada.descripcion || imagenAmpliada.nombre}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {error ? <div className={expressAlertError}>{error}</div> : null}
      {mensaje ? <div className={expressAlertSuccess}>{mensaje}</div> : null}

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="space-y-1">
          <p className="font-heading text-sm font-bold tracking-widest text-[#002060]">ZURICH</p>
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">
            Encuesta ágil de inspección
          </h2>
          <p className="font-body text-base font-semibold text-gray-800 dark:text-gray-200">
            Inspecciones visuales y reporte de exposición por Evento CAT
          </p>
        </div>
        <img
          src={logoZurich}
          alt="Zurich"
          className="h-14 w-auto max-w-[180px] object-contain"
        />
      </header>

      <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 font-body text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        {OBJETIVO_MANUAL}
      </div>

      {!casoZurich?._id ? (
        <div className={expressAlertError}>{t('zurich.cat.needSavedCase')}</div>
      ) : null}

      <section>
        <h3 className="mb-2 font-heading text-lg font-bold text-gray-900 dark:text-white">
          1. Clasificación de severidad para reporte de exposición
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-300">{INTRO_SEVERIDAD}</p>

        <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-24`}>Nivel</th>
                <th className={th}>Descripción del daño observado</th>
                <th className={`${th} w-36`}>Aplica</th>
              </tr>
            </thead>
            <tbody>
              {SEVERIDAD_MANUAL_CAT.map((fila) => {
                const key = String(fila.nivel);
                const item = severidadNiveles[key] || { aplica: null, observacion: '' };
                return (
                  <tr key={fila.nivel} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className={`${td} font-semibold`}>Nivel {fila.nivel}</td>
                    <td className={`${td} font-semibold`}>{fila.descripcion}</td>
                    <td className={td}>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.aplica === 'SI'}
                          onChange={(e) => setSeveridadAplica(fila.nivel, e.target.checked)}
                        />
                        Aplica
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label={t('zurich.fields.fechaInspeccion')}>
          <InputFenix
            type="date"
            value={fechaInspeccion}
            onChange={(e) => setFechaInspeccion(e.target.value)}
          />
        </Campo>
        <Campo label={t('zurich.fields.reservaPerito')}>
          <InputFenix
            className="font-mono"
            inputMode="numeric"
            value={reservaPerito}
            onChange={(e) => setReservaPerito(formatMilesInput(e.target.value))}
            placeholder="0"
          />
        </Campo>
        <Campo label={t('zurich.fields.observacionReserva')} className="sm:col-span-2">
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            value={observacionReserva}
            onChange={(e) => setObservacionReserva(e.target.value)}
            placeholder={t('zurich.placeholders.observacionReserva')}
          />
        </Campo>
      </section>

      <section>
        <h3 className="mb-2 font-heading text-lg font-bold text-gray-900 dark:text-white">
          2. Fotos de la inspección
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-300">
          Suba fotos, escriba la descripción de cada una y reordene arrastrando o con las flechas
          (igual que en inspección fotográfica).
        </p>

        {!casoZurich?._id ? (
          <div className={expressAlertError}>{t('zurich.cat.needSavedCase')}</div>
        ) : null}

        <label className="mb-1 block font-body text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('zurich.fields.observacionesCat')}
        </label>
        <textarea
          className="mb-4 min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          value={observacionesCat}
          onChange={(e) => setObservacionesCat(e.target.value)}
          placeholder={t('zurich.placeholders.observacionesCat')}
        />

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ARCHIVOS_IMAGEN}
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onClick={() => !subiendo && casoZurich?._id && inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (casoZurich?._id && !subiendo) setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (casoZurich?._id && !subiendo) setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
          }}
          onDrop={handleDropZone}
          className={`mb-4 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragOver
              ? 'border-fenix-primario bg-fenix-primario/10'
              : 'border-gray-300 bg-gray-50 hover:border-fenix-primario/60 dark:border-gray-600 dark:bg-gray-900/40'
          } ${!casoZurich?._id || subiendo ? 'pointer-events-none opacity-60' : ''}`}
        >
          <FaCloudUploadAlt className="mb-2 text-3xl text-fenix-primario" />
          <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
            {subiendo
              ? t('zurich.archive.uploading')
              : 'Arrastre fotos aquí o haga clic para seleccionar'}
          </p>
          <p className="mt-1 font-body text-xs text-gray-500">
            JPG, PNG, GIF o WEBP — puede subir varias a la vez
          </p>
        </div>

        {fotos.length === 0 ? (
          <p className="font-body text-sm text-gray-500">
            Aún no hay fotos. Use la zona de arrastre de arriba.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((f, index) => {
              const clave = idFoto(f, index);
              const url = getImageUrl(f) || urlDescargaArchivoZurich(f.ruta);
              const esOrigen = arrastrandoId === clave;
              const esDestino =
                destinoArrastreId === clave && arrastrandoId && arrastrandoId !== clave;
              return (
                <div
                  key={clave}
                  draggable
                  onDragStart={(e) => {
                    setArrastrandoId(clave);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', clave);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (arrastrandoId && arrastrandoId !== clave) {
                      setDestinoArrastreId(clave);
                    }
                  }}
                  onDragLeave={() => {
                    if (destinoArrastreId === clave) setDestinoArrastreId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const origenId = e.dataTransfer.getData('text/plain') || arrastrandoId;
                    reordenarFotos(origenId, clave);
                    setArrastrandoId(null);
                    setDestinoArrastreId(null);
                  }}
                  onDragEnd={() => {
                    setArrastrandoId(null);
                    setDestinoArrastreId(null);
                  }}
                  className={`relative rounded-lg border-2 bg-gray-50 p-3 transition dark:bg-gray-900/50 ${
                    esDestino
                      ? 'border-fenix-primario shadow'
                      : 'border-gray-200 dark:border-gray-700'
                  } ${esOrigen ? 'opacity-50' : ''}`}
                  style={{ cursor: 'grab' }}
                >
                  <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-1 text-xs text-gray-600 dark:bg-black/70 dark:text-gray-200">
                    <FaGripVertical className="h-3 w-3" />
                    <span>{index + 1}</span>
                  </div>

                  <div className="relative">
                    {url ? (
                      <button
                        type="button"
                        className="block w-full cursor-zoom-in p-0"
                        title="Clic para ampliar"
                        onClick={(e) => abrirFotoGrande(e, f, url)}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <img
                          src={url}
                          alt={f.nombreOriginal || 'Foto'}
                          draggable={false}
                          className="h-36 w-full rounded-lg object-cover"
                          onError={createImageErrorHandler(f, () => {})}
                        />
                      </button>
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-lg bg-gray-200 text-xs dark:bg-gray-800">
                        Sin vista previa
                      </div>
                    )}
                    <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-white disabled:cursor-not-allowed disabled:opacity-40"
                        title="Subir"
                        onClick={(e) => {
                          e.stopPropagation();
                          moverFoto(clave, -1);
                        }}
                      >
                        <FaArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === fotos.length - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-white disabled:cursor-not-allowed disabled:opacity-40"
                        title="Bajar"
                        onClick={(e) => {
                          e.stopPropagation();
                          moverFoto(clave, 1);
                        }}
                      >
                        <FaArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white"
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (f._id) handleDeleteArchivo(f._id);
                        }}
                      >
                        <FaTrash className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 truncate font-body text-sm font-medium text-gray-800 dark:text-gray-100">
                    {f.nombreOriginal || 'Foto'}
                  </p>
                  <textarea
                    value={f.descripcion || ''}
                    rows={3}
                    placeholder="Descripción de la foto (hechos observables)…"
                    className="mt-1 w-full resize-y rounded border border-gray-300 bg-white px-2 py-1.5 font-body text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-fenix-primario dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      actualizarDescripcionFoto(clave, e.target.value);
                    }}
                    onBlur={(e) => {
                      flushDescripcionFoto(clave, e.target.value);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded border border-gray-300 bg-gray-50 px-4 py-3 font-body text-sm leading-relaxed text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
        {RECORDATORIO}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={expressBtnPrimary}
          onClick={guardarCat}
          disabled={guardando || generandoDoc || !casoZurich?._id}
        >
          <FaSave className="mr-2 inline" />
          {guardando ? t('zurich.actions.saving') : t('zurich.cat.saveCat')}
        </button>
        <button
          type="button"
          className={expressBtnSecondary}
          onClick={guardarYDesprendible}
          disabled={guardando || generandoDoc || !casoZurich?._id}
        >
          <FaFileWord className="mr-2 inline" />
          {generandoDoc ? 'Generando…' : 'Guardar y descargar desprendible'}
        </button>
        <button
          type="button"
          className={expressBtnGhost}
          onClick={exportarDesprendibleSinGuardar}
          disabled={guardando || generandoDoc}
          title="Genera el Word con lo que ve en pantalla, sin guardar en el caso"
        >
          <FaFileWord className="mr-2 inline" />
          {generandoDoc ? 'Generando…' : 'Solo exportar (sin guardar)'}
        </button>
      </div>
    </div>
  );
}
