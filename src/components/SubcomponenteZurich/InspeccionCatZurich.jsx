import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowDown,
  FaArrowUp,
  FaCloudUploadAlt,
  FaFileWord,
  FaGripVertical,
  FaSave,
  FaTrash,
} from 'react-icons/fa';
import logoZurich from '../../assets/zurich-logo.png';
import {
  actualizarArchivoZurich,
  actualizarCasoZurich,
  eliminarArchivoZurich,
  getCasoZurichById,
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
import {
  EVIDENCIA_CAT_VACIA,
  SEVERIDAD_CAT_ZURICH,
  normalizeEvidenciaCat,
  normalizeSeveridadCatNiveles,
  derivarSeveridadCatDesdeNiveles,
  formatDateIso,
} from './zurichHelpers.js';
import { descargarDesprendibleCatZurich } from './generarDesprendibleCatZurich.js';

const SEVERIDAD_MANUAL_CAT = SEVERIDAD_CAT_ZURICH.map((s) => ({
  nivel: s.valor,
  descripcion: s.descripcion,
}));

const OBJETIVO_MANUAL =
  'Objetivo: entregar al ajustador información clave, sencilla y resumida para clasificar la severidad, completar la base de Excel y registrar evidencia fotográfica/documental. Este documento no autoriza a confirmar cobertura, negar cobertura, prometer pagos o actuar como vocero de Zurich.';

const INTRO_SEVERIDAD =
  'La severidad es un criterio operativo preliminar para priorizar el reporte de exposición. No constituye definición de cobertura ni liquidación del siniestro. Indique Aplica o No aplica en cada tipo de daño observado.';

const RECORDATORIO =
  'Recordatorio operativo: documentar hechos observables, no conclusiones de cobertura. Mantener trazabilidad de fecha, hora, ubicación, fuente y soporte.';

const esImagen = (fileOrName) => {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName?.name || '';
  const type = typeof fileOrName === 'object' ? fileOrName?.type || '' : '';
  return type.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(name);
};

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
  const [archivos, setArchivos] = useState(() => casoZurich?.archivos || []);
  const [observacionesCat, setObservacionesCat] = useState(
    () => casoZurich?.observacionesCat || ''
  );

  const [severidadNiveles, setSeveridadNiveles] = useState(() =>
    normalizeSeveridadCatNiveles(casoZurich?.severidadCatNiveles, casoZurich?.severidadCat)
  );
  const [evidenciaCat, setEvidenciaCat] = useState(() =>
    normalizeEvidenciaCat(casoZurich?.evidenciaCat)
  );

  useEffect(() => {
    setSeveridadNiveles(
      normalizeSeveridadCatNiveles(casoZurich?.severidadCatNiveles, casoZurich?.severidadCat)
    );
    setEvidenciaCat(normalizeEvidenciaCat(casoZurich?.evidenciaCat));
    setArchivos(casoZurich?.archivos || []);
    setObservacionesCat(casoZurich?.observacionesCat || '');
  }, [casoZurich?._id, casoZurich?.updatedAt]);

  useEffect(() => {
    return () => {
      Object.values(descripcionTimeoutRef.current || {}).forEach((id) => clearTimeout(id));
    };
  }, []);

  const setSeveridadAplica = (nivel, aplica) => {
    const key = String(nivel);
    setSeveridadNiveles((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { aplica: null, observacion: '' }), aplica },
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

  const actualizarDescripcionFoto = (fotoId, descripcion) => {
    const clave = String(fotoId);
    setArchivos((prev) =>
      (prev || []).map((a, i) => (idFoto(a, i) === clave ? { ...a, descripcion } : a))
    );

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
    setArchivos((prev) =>
      (prev || []).map((a, i) => (idFoto(a, i) === clave ? { ...a, descripcion } : a))
    );
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
      setError('Seleccione solo fotos (JPG, PNG, GIF o WEBP).');
      return;
    }
    if (!casoZurich?._id) {
      setError(t('zurich.reportUnique.savedCaseRequired'));
      return;
    }
    setError('');
    setMensaje('');
    setSubiendo(true);
    try {
      const subidos = [];
      for (const file of files) {
        const creado = await subirArchivoZurich(casoZurich._id, file, 'FOTOS', {
          descripcion: '',
        });
        if (creado) subidos.push(creado);
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
    const niveles = normalizeSeveridadCatNiveles(severidadNiveles);
    const evidencia = normalizeEvidenciaCat(evidenciaCat);
    const severidadCat = derivarSeveridadCatDesdeNiveles(niveles);
    const accesoPredio = evidencia.noAcceso?.aplica === 'SI' ? 'NO' : 'SI';
    const fechaVisita =
      formatDateIso(casoZurich?.fechaInspeccion) || formatDateIso(new Date());
    const payload = {
      ...casoZurich,
      severidadCat,
      severidadCatNiveles: niveles,
      accesoPredio,
      evidenciaCat: { ...EVIDENCIA_CAT_VACIA, ...evidencia },
      observacionesCat: observacionesCat || null,
      fechaInspeccion: fechaVisita,
    };
    delete payload._id;
    delete payload.__v;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.archivos;
    return { payload, niveles, evidencia, severidadCat };
  };

  const guardarCat = async () => {
    if (!casoZurich?._id) {
      setError(t('zurich.reportUnique.savedCaseRequired'));
      return null;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const { payload } = buildCatPayload();
      const actualizado = await actualizarCasoZurich(casoZurich._id, payload);
      onCasoChange?.(actualizado);
      setMensaje(t('zurich.cat.savedOk'));
      return actualizado;
    } catch (err) {
      setError(err.message || t('zurich.cat.savedError'));
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const guardarYDesprendible = async () => {
    if (!casoZurich?._id) {
      setError(t('zurich.reportUnique.savedCaseRequired'));
      return;
    }
    setGenerandoDoc(true);
    setError('');
    setMensaje('');
    try {
      const { payload } = buildCatPayload();
      const guardado = await actualizarCasoZurich(casoZurich._id, payload);
      onCasoChange?.(guardado);
      const base = {
        ...(guardado || {}),
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
      const { payload } = buildCatPayload();
      const base = {
        ...(casoZurich || {}),
        ...payload,
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {error ? <div className={expressAlertError}>{error}</div> : null}
      {mensaje ? <div className={expressAlertSuccess}>{mensaje}</div> : null}

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="space-y-1">
          <p className="font-heading text-sm font-bold tracking-widest text-[#002060]">ZURICH</p>
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">
            Manual para Inspecciones.
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
                <th className={`${th} w-44`}>Aplica / No aplica</th>
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
                      <div className="flex flex-col gap-1.5">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`sev-aplica-${fila.nivel}`}
                            checked={item.aplica === 'SI'}
                            onChange={() => setSeveridadAplica(fila.nivel, 'SI')}
                          />
                          Aplica
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`sev-aplica-${fila.nivel}`}
                            checked={item.aplica === 'NO'}
                            onChange={() => setSeveridadAplica(fila.nivel, 'NO')}
                          />
                          No aplica
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
          <div className={expressAlertError}>
            Debe abrir un caso Zurich guardado para subir fotos.
          </div>
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
          accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
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
              const url = urlDescargaArchivoZurich(f.ruta);
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
                      <img
                        src={url}
                        alt={f.nombreOriginal || 'Foto'}
                        draggable={false}
                        className="h-36 w-full rounded-lg object-cover"
                      />
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
