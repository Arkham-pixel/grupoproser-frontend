import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudUploadAlt, FaDownload, FaTrash, FaTimes, FaUpload } from 'react-icons/fa';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  ETIQUETAS_ARCHIVO_BBVA_CAT,
  ETIQUETAS_ARCHIVO_BBVA_CAT_LISTADO,
  formatDate,
} from './bbvaCatHelpers.js';
import { bbvaCatArchivosApi } from './bbvaCatArchivosApi.js';

/** Alineado con multer en bbvaCat / bbvaCatListado (25 MB). */
const MAX_ARCHIVO_BYTES = 25 * 1024 * 1024;

const formatBytes = (n) => {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

/** Copia inmediata: FileList se vacía al resetear el input. */
function copiarArchivos(fileList) {
  return Array.from(fileList || []).filter((f) => f?.name);
}

function claveArchivo(file) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

function inferirEtiqueta(nombre, fallback, permitidas) {
  const n = String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const candidata = (() => {
    if (/poliza|policy/.test(n)) return 'POLIZA';
    if (/liquid|finiquito/.test(n)) return 'LIQUIDACION';
    if (/informe/.test(n)) return 'INFORME';
    if (/pago|comprobante/.test(n)) return 'PAGO';
    if (/\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(n) || /foto|inspeccion/.test(n)) return 'FOTOS';
    return fallback || 'GENERAL';
  })();
  if (Array.isArray(permitidas) && permitidas.length && !permitidas.includes(candidata)) {
    return fallback || permitidas[0] || 'GENERAL';
  }
  return candidata;
}

/** El GET de listado no trae archivos; solo un conteo que el front convierte en `{}`. */
function esArchivoVisible(arch) {
  if (!arch || typeof arch !== 'object') return false;
  return Boolean(arch.ruta || arch.nombreOriginal || arch.nombreArchivo);
}

function archivosVisibles(lista) {
  return (Array.isArray(lista) ? lista : []).filter(esArchivoVisible);
}

function nombreArchivoMostrar(arch) {
  return String(arch?.nombreOriginal || arch?.nombreArchivo || '').trim();
}

function tamañoArchivo(arch) {
  return arch?.tamaño ?? arch?.tamano ?? arch?.size;
}

export default function ArchiveroBbvaCat({
  caso,
  onClose,
  onChanged,
  origen = 'cat',
  etiquetas,
  etiquetaInicial = 'GENERAL',
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const api = useMemo(() => bbvaCatArchivosApi(origen), [origen]);
  const opcionesEtiqueta =
    etiquetas ||
    (origen === 'listado' ? ETIQUETAS_ARCHIVO_BBVA_CAT_LISTADO : ETIQUETAS_ARCHIVO_BBVA_CAT);
  const [archivos, setArchivos] = useState(() => archivosVisibles(caso?.archivos));
  const [etiqueta, setEtiqueta] = useState(etiquetaInicial || 'GENERAL');
  const [pendientes, setPendientes] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(() => Boolean(caso?._id));
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const dragCountRef = useRef(0);

  useEffect(() => {
    if (!caso?._id) {
      setArchivos([]);
      setCargando(false);
      return undefined;
    }
    setArchivos(archivosVisibles(caso?.archivos));
    setCargando(true);
    let cancelado = false;
    (async () => {
      try {
        const actualizado = await api.getById(caso._id);
        if (cancelado) return;
        setArchivos(archivosVisibles(actualizado.archivos));
      } catch {
        /* el listado no trae archivos; el getById los hidrata */
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [caso?._id, api]);

  useEffect(() => {
    if (etiquetaInicial) setEtiqueta(etiquetaInicial);
  }, [etiquetaInicial]);

  const refrescar = async () => {
    const actualizado = await api.getById(caso._id);
    setArchivos(archivosVisibles(actualizado.archivos));
    if (onChanged) onChanged(actualizado);
    return actualizado;
  };

  const subirLote = async (lote) => {
    if (!lote?.length || !caso?._id) return;

    const demasiadoGrandes = lote.filter((item) => Number(item.file?.size) > MAX_ARCHIVO_BYTES);
    const validos = lote.filter((item) => Number(item.file?.size) <= MAX_ARCHIVO_BYTES);

    const mensajeDemasiadoGrandes = () => {
      const nombres = demasiadoGrandes
        .slice(0, 3)
        .map((item) => `${item.file.name} (${formatBytes(item.file.size)})`)
        .join(', ');
      const extra =
        demasiadoGrandes.length > 3
          ? t('bbvaCat.archive.fileTooLargeMore', { count: demasiadoGrandes.length - 3 })
          : '';
      return t('bbvaCat.archive.fileTooLarge', {
        maxMb: 25,
        files: `${nombres}${extra}`,
      });
    };

    if (demasiadoGrandes.length) {
      setError(mensajeDemasiadoGrandes());
      setExito(null);
      setPendientes(validos);
      if (!validos.length) return;
    } else {
      setError(null);
      setExito(null);
    }

    setSubiendo(true);
    setProgreso({ current: 0, total: validos.length });
    try {
      for (let i = 0; i < validos.length; i += 1) {
        setProgreso({ current: i + 1, total: validos.length });
        await api.subir(caso._id, validos[i].file, validos[i].etiqueta || etiqueta);
      }
      setPendientes([]);
      await refrescar();
      setExito(
        validos.length === 1
          ? t('bbvaCat.archive.uploadOk')
          : t('bbvaCat.archive.uploadOkMultiple', { count: validos.length })
      );
      if (demasiadoGrandes.length) setError(mensajeDemasiadoGrandes());
    } catch (err) {
      const msg = String(err?.message || '');
      const esRed =
        /failed to fetch|networkerror|load failed|network request failed/i.test(msg);
      setError(
        esRed
          ? t('bbvaCat.archive.uploadNetworkError', { maxMb: 25 })
          : msg || t('bbvaCat.archive.uploadError')
      );
      try {
        await refrescar();
      } catch {
        /* ignore */
      }
    } finally {
      setSubiendo(false);
      setProgreso(null);
    }
  };

  const recibirArchivos = async (fileList) => {
    const files = copiarArchivos(fileList);
    if (!files.length || subiendo) return;

    const demasiadoGrandes = files.filter((f) => Number(f.size) > MAX_ARCHIVO_BYTES);
    const validos = files.filter((f) => Number(f.size) <= MAX_ARCHIVO_BYTES);

    if (demasiadoGrandes.length) {
      const nombres = demasiadoGrandes
        .slice(0, 3)
        .map((f) => `${f.name} (${formatBytes(f.size)})`)
        .join(', ');
      const extra =
        demasiadoGrandes.length > 3
          ? t('bbvaCat.archive.fileTooLargeMore', { count: demasiadoGrandes.length - 3 })
          : '';
      setError(
        t('bbvaCat.archive.fileTooLarge', {
          maxMb: 25,
          files: `${nombres}${extra}`,
        })
      );
      setExito(null);
    } else {
      setError(null);
      setExito(null);
    }

    if (!validos.length) return;

    const nuevos = validos.map((file) => ({
      id: claveArchivo(file),
      file,
      etiqueta: inferirEtiqueta(file.name, etiqueta, opcionesEtiqueta),
    }));

    if (nuevos.length === 1 && pendientes.length === 0 && !demasiadoGrandes.length) {
      await subirLote(nuevos);
      return;
    }

    setPendientes((prev) => {
      const vistos = new Set(prev.map((p) => p.id));
      const extra = nuevos.filter((n) => !vistos.has(n.id));
      return extra.length ? [...prev, ...extra] : prev;
    });
  };

  const handleUpload = async (e) => {
    const files = copiarArchivos(e.target.files);
    e.target.value = '';
    await recibirArchivos(files);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current = 0;
    setArrastrando(false);
    if (subiendo) return;
    const files = copiarArchivos(e.dataTransfer?.files);
    await recibirArchivos(files);
  };

  const handleDelete = async (archivoId) => {
    if (!archivoId) return;
    if (!window.confirm(t('bbvaCat.archive.confirmDelete'))) return;
    setError(null);
    setExito(null);
    try {
      await api.eliminar(caso._id, archivoId);
      await refrescar();
      setExito(t('bbvaCat.archive.deleteOk'));
    } catch (err) {
      setError(err.message || t('bbvaCat.archive.deleteError'));
    }
  };

  const textoBotonSubida = () => {
    if (subiendo && progreso?.total > 1) {
      return t('bbvaCat.archive.uploadingCount', {
        current: progreso.current,
        total: progreso.total,
      });
    }
    if (subiendo) return t('bbvaCat.archive.uploading');
    return t('bbvaCat.archive.uploadMass');
  };

  return (
    <div
      className="space-y-4 p-4 sm:p-6"
      onDragEnter={(e) => {
        e.preventDefault();
        dragCountRef.current += 1;
        if (!subiendo) setArrastrando(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCountRef.current = Math.max(0, dragCountRef.current - 1);
        if (dragCountRef.current === 0) setArrastrando(false);
      }}
      onDrop={handleDrop}
    >
      <div>
        <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
          {t('bbvaCat.archive.title')}
        </h3>
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {t(origen === 'listado' ? 'bbvaCat.archive.subtitleListado' : 'bbvaCat.archive.subtitle', {
            caseNumber: caso?.consecutivo || caso?.identificacion || '',
          })}
        </p>
        {origen !== 'listado' && (
          <p className="mt-1 font-body text-xs text-amber-800 dark:text-amber-200">
            {t('bbvaCat.cat.evidenciaHint')}
          </p>
        )}
      </div>

      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <div
        className={`flex cursor-pointer flex-col items-stretch gap-3 rounded-xl border-2 border-dashed p-4 text-center sm:p-6 ${
          arrastrando
            ? 'border-fenix-primario bg-red-50 dark:bg-red-950/30'
            : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/40'
        }`}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!subiendo) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!subiendo) inputRef.current?.click();
          }
        }}
      >
        <FaCloudUploadAlt className="mx-auto text-3xl text-fenix-primario" />
        <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t('bbvaCat.archive.massTitle')}
        </p>
        <p className="font-body text-sm text-gray-600 dark:text-gray-300">
          {t('bbvaCat.archive.dropHint')}
        </p>
        <div
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Campo label={t('bbvaCat.archive.label')}>
            <SelectFenix value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
              {opcionesEtiqueta.map((op) => (
                <option key={op} value={op}>
                  {t(`bbvaCat.archive.labels.${op}`, { defaultValue: op })}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            disabled={subiendo}
            onChange={handleUpload}
          />
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={subiendo}
            onClick={() => inputRef.current?.click()}
          >
            <FaUpload />
            {textoBotonSubida()}
          </button>
        </div>
      </div>

      {pendientes.length > 0 && (
        <div className="space-y-3 rounded-xl border border-fenix-primario/30 bg-white p-4 dark:border-fenix-primario/40 dark:bg-[#1A1A1A]">
          <div>
            <p className="font-heading text-sm font-bold text-gray-900 dark:text-white">
              {t('bbvaCat.archive.massTitle')}
            </p>
            <p className="font-body text-sm text-gray-600 dark:text-gray-300">
              {t('bbvaCat.archive.massReady', { count: pendientes.length })}
            </p>
          </div>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
            {pendientes.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm text-gray-800 dark:text-gray-200">
                    {item.file.name}
                  </p>
                  <p className="font-body text-xs text-gray-500">{formatBytes(item.file.size)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SelectFenix
                    value={item.etiqueta}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPendientes((prev) =>
                        prev.map((p) => (p.id === item.id ? { ...p, etiqueta: next } : p))
                      );
                    }}
                  >
                    {opcionesEtiqueta.map((op) => (
                      <option key={op} value={op}>
                        {t(`bbvaCat.archive.labels.${op}`, { defaultValue: op })}
                      </option>
                    ))}
                  </SelectFenix>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                    disabled={subiendo}
                    onClick={() =>
                      setPendientes((prev) => prev.filter((p) => p.id !== item.id))
                    }
                  >
                    <FaTimes />
                    {t('bbvaCat.archive.removeFile')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={expressBtnSecondary}
              disabled={subiendo}
              onClick={() => setPendientes([])}
            >
              {t('bbvaCat.archive.massCancel')}
            </button>
            <button
              type="button"
              className={expressBtnPrimary}
              disabled={subiendo}
              onClick={() => subirLote(pendientes)}
            >
              <FaUpload />
              {subiendo
                ? textoBotonSubida()
                : t('bbvaCat.archive.massUpload', { count: pendientes.length })}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('bbvaCat.archive.file')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('bbvaCat.archive.label')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('bbvaCat.archive.size')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('bbvaCat.archive.date')}
              </th>
              <th className="px-3 py-2 text-right font-body text-xs font-semibold uppercase text-gray-500">
                {t('bbvaCat.report.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
            {cargando && archivos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center font-body text-sm text-gray-500">
                  {t('bbvaCat.workspace.loading')}
                </td>
              </tr>
            ) : archivos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center font-body text-sm text-gray-500">
                  {t('bbvaCat.archive.empty')}
                </td>
              </tr>
            ) : (
              archivos.map((arch, idx) => {
                const url = api.url(arch.ruta);
                const nombre = nombreArchivoMostrar(arch);
                return (
                  <tr key={arch._id || arch.ruta || `archivo-${idx}`}>
                    <td className="px-3 py-2 font-body text-sm text-gray-800 dark:text-gray-200">
                      {nombre || '—'}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {t(`bbvaCat.archive.labels.${arch.etiqueta || 'GENERAL'}`, {
                        defaultValue: arch.etiqueta || 'GENERAL',
                      })}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {formatBytes(tamañoArchivo(arch))}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(arch.fechaSubida) || '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={nombre || undefined}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-gray-700 dark:text-sky-300"
                          >
                            <FaDownload />
                            {t('bbvaCat.archive.download')}
                          </a>
                        )}
                        {arch._id ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40"
                            onClick={() => handleDelete(arch._id)}
                          >
                            <FaTrash />
                            {t('bbvaCat.report.delete')}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {onClose && (
        <div className="flex justify-end">
          <button type="button" className={expressBtnGhost} onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      )}
    </div>
  );
}
