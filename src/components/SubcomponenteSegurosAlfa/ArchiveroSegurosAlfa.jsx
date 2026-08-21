import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDownload,
  FaExternalLinkAlt,
  FaRedo,
  FaSync,
  FaTrash,
  FaUpload,
} from 'react-icons/fa';
import {
  eliminarArchivoAlfa,
  getCasoAlfaById,
  getPolizasImportadasAlfa,
  reintentarSharePointAlfa,
  setSharePointEnabledAlfa,
  subirArchivoAlfa,
  urlDescargaArchivoAlfa,
} from '../../services/segurosAlfaService.js';
import useAlfaSharePointSyncStatus from '../../hooks/useAlfaSharePointSyncStatus.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { ETIQUETAS_ARCHIVO_ALFA, formatDate } from './segurosAlfaHelpers.js';
import AlfaSharePointSyncBanner from './AlfaSharePointSyncBanner.jsx';

const canRetrySharePoint = () => {
  const rol = String(localStorage.getItem('rol') || '')
    .trim()
    .toLowerCase();
  return rol === 'admin' || rol === 'soporte' || rol === 'administrador' || rol === 'support';
};

const syncChipClass = (status) => {
  switch (status) {
    case 'synced':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
    case 'pending':
    case 'pending_destination':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
    case 'syncing':
      return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900';
    case 'failed':
      return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900';
    case 'disabled':
    case 'none':
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700';
  }
};

export default function ArchiveroSegurosAlfa({ caso, onClose, onChanged }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [archivos, setArchivos] = useState(() => caso?.archivos || []);
  const [etiqueta, setEtiqueta] = useState('GENERAL');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [reintentandoId, setReintentandoId] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const allowRetry = useMemo(() => canRetrySharePoint(), []);

  const {
    summary,
    syncByArchivoId,
    documents: syncDocuments,
    loading: cargandoSync,
    refresh: cargarEstadoSharePoint,
    boostPolling,
    justSynced,
    dismissJustSynced,
    hasActivity,
    pendingTotal,
  } = useAlfaSharePointSyncStatus(caso?._id, { enabled: Boolean(caso?._id) });

  const handleSharePointEnabled = useCallback(
    async (archivoId, enabled) => {
      await setSharePointEnabledAlfa(caso._id, archivoId, enabled);
      await cargarEstadoSharePoint();
      if (enabled) boostPolling();
    },
    [boostPolling, cargarEstadoSharePoint, caso?._id]
  );

  const cargarPolizasImportadas = useCallback(async () => {
    if (!caso?._id) return;
    try {
      const data = await getPolizasImportadasAlfa(caso._id);
      setDocumentos(Array.isArray(data?.documentos) ? data.documentos : []);
    } catch (err) {
      console.warn('Pólizas importadas Alfa no disponibles:', err.message);
      setDocumentos([]);
    }
  }, [caso?._id]);

  const refrescar = async () => {
    const actualizado = await getCasoAlfaById(caso._id);
    setArchivos(actualizado.archivos || []);
    if (onChanged) onChanged(actualizado);
    await Promise.all([cargarEstadoSharePoint(), cargarPolizasImportadas()]);
    return actualizado;
  };

  useEffect(() => {
    setArchivos(caso?.archivos || []);
  }, [caso?._id, caso?.archivos]);

  useEffect(() => {
    cargarPolizasImportadas();
    const timer = setInterval(() => {
      cargarPolizasImportadas();
    }, 45000);
    return () => clearInterval(timer);
  }, [cargarPolizasImportadas]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setExito(null);
    setSubiendo(true);
    try {
      await subirArchivoAlfa(caso._id, file, etiqueta);
      await refrescar();
      boostPolling();
      setExito(t('segurosAlfa.archive.sharepoint.queuedOk', {
        defaultValue:
          'Guardado en ARNALD. En cola hacia SharePoint (SINIESTROS).',
      }));
    } catch (err) {
      setError(err.message || t('segurosAlfa.archive.uploadError'));
    } finally {
      setSubiendo(false);
    }
  };

  const handleDelete = async (archivoId) => {
    if (!window.confirm(t('segurosAlfa.archive.confirmDelete'))) return;
    setError(null);
    setExito(null);
    try {
      await eliminarArchivoAlfa(caso._id, archivoId);
      await refrescar();
      setExito(t('segurosAlfa.archive.deleteOk'));
    } catch (err) {
      setError(err.message || t('segurosAlfa.archive.deleteError'));
    }
  };

  const handleRetry = async (archivoId) => {
    if (!allowRetry) return;
    setError(null);
    setExito(null);
    setReintentandoId(archivoId);
    try {
      await reintentarSharePointAlfa(caso._id, archivoId);
      setExito(t('segurosAlfa.archive.sharepoint.retryOk'));
      boostPolling();
      await cargarEstadoSharePoint();
    } catch (err) {
      setError(err.message || t('segurosAlfa.archive.sharepoint.retryError'));
    } finally {
      setReintentandoId(null);
    }
  };

  const labelForStatus = (status) => {
    if (status === 'pending_destination') {
      return t('segurosAlfa.archive.status.pendingDestination', {
        defaultValue: 'Pendiente de destino',
      });
    }
    if (status === 'imported') {
      return t('segurosAlfa.archive.status.importedFromAlfa', {
        defaultValue: 'Importado desde Alfa',
      });
    }
    const key = `segurosAlfa.archive.sharepoint.status.${status || 'none'}`;
    return t(key, { defaultValue: status || 'none' });
  };

  const resolveDownloadUrl = (doc) => {
    if (doc.origin === 'sharepoint') return doc.downloadUrl || null;
    return urlDescargaArchivoAlfa(doc.ruta || doc.downloadUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
            {t('segurosAlfa.archive.title')}
          </h3>
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">
            {t('segurosAlfa.archive.subtitle', {
              caseNumber: caso?.consecutivo || caso?.identificacion || '',
            })}
          </p>
        </div>
        <button
          type="button"
          className={expressBtnGhost}
          onClick={() => cargarEstadoSharePoint()}
          disabled={cargandoSync}
        >
          <FaSync className={cargandoSync ? 'animate-spin' : undefined} />
          {t('segurosAlfa.archive.sharepoint.refresh')}
        </button>
      </div>

      <AlfaSharePointSyncBanner
        summary={summary}
        loading={cargandoSync}
        hasActivity={hasActivity}
        pendingTotal={pendingTotal}
        justSynced={justSynced}
        documents={syncDocuments}
        onRefresh={cargarEstadoSharePoint}
        onDismissSynced={dismissJustSynced}
        onSetEnabled={handleSharePointEnabled}
        compact
      />

      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Campo label={t('segurosAlfa.archive.label')}>
          <SelectFenix value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
            {ETIQUETAS_ARCHIVO_ALFA.map((op) => (
              <option key={op} value={op}>
                {t(`segurosAlfa.archive.labels.${op}`, { defaultValue: op })}
              </option>
            ))}
          </SelectFenix>
        </Campo>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          type="button"
          className={expressBtnPrimary}
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          <FaUpload />
          {subiendo ? t('segurosAlfa.archive.uploading') : t('segurosAlfa.archive.upload')}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosAlfa.archive.file', { defaultValue: 'Nombre' })}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosAlfa.archive.type', { defaultValue: 'Tipo' })}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosAlfa.archive.origin', { defaultValue: 'Origen' })}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosAlfa.archive.date', { defaultValue: 'Fecha' })}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosAlfa.archive.sharepoint.column', { defaultValue: 'Estado' })}
              </th>
              <th className="px-3 py-2 text-right font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosAlfa.report.actions', { defaultValue: 'Acciones' })}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
            {(documentos.length ? documentos : []).length === 0 && archivos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center font-body text-sm text-gray-500">
                  {t('segurosAlfa.archive.empty')}
                </td>
              </tr>
            ) : documentos.length > 0 ? (
              documentos.map((doc) => {
                const url = resolveDownloadUrl(doc);
                const status = doc.estado || 'none';
                return (
                  <tr key={doc.key || doc.id}>
                    <td className="px-3 py-2 font-body text-sm text-gray-800 dark:text-gray-200">
                      <div>{doc.nombre}</div>
                      {doc.associatedByLabel ? (
                        <div className="mt-0.5 font-body text-[11px] text-gray-500">
                          {doc.associatedByLabel}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {t(`segurosAlfa.archive.labels.${String(doc.tipo || '').toUpperCase()}`, {
                        defaultValue: doc.tipo || '—',
                      })}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {doc.originLabel ||
                        (doc.origin === 'sharepoint' ? 'ALFA / SHAREPOINT' : 'ARNALD')}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(doc.fecha || doc.fechaSubida) || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 font-body text-xs font-semibold ${syncChipClass(
                          status === 'imported'
                            ? 'synced'
                            : status === 'pending_destination'
                              ? 'pending'
                              : status
                        )}`}
                      >
                        {doc.estadoLabel || labelForStatus(status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-gray-700 dark:text-sky-300"
                          >
                            <FaDownload />
                            {t('segurosAlfa.archive.download')}
                          </a>
                        )}
                        {doc.sharepoint?.webUrl && (
                          <a
                            href={doc.sharepoint.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300"
                          >
                            <FaExternalLinkAlt />
                            {t('segurosAlfa.archive.sharepoint.open')}
                          </a>
                        )}
                        {doc.canRetry && allowRetry && doc.archivoId && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300"
                            disabled={reintentandoId === doc.archivoId}
                            onClick={() => handleRetry(doc.archivoId)}
                          >
                            <FaRedo />
                            {reintentandoId === doc.archivoId
                              ? t('segurosAlfa.archive.sharepoint.retrying')
                              : t('segurosAlfa.archive.sharepoint.retry')}
                          </button>
                        )}
                        {doc.origin === 'arnald' && doc.archivoId && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40"
                            onClick={() => handleDelete(doc.archivoId)}
                          >
                            <FaTrash />
                            {t('segurosAlfa.report.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              archivos.map((arch) => {
                const url = urlDescargaArchivoAlfa(arch.ruta);
                const sync = syncByArchivoId[String(arch._id)] || { status: 'none' };
                const status = sync.status || 'none';
                return (
                  <tr key={arch._id}>
                    <td className="px-3 py-2 font-body text-sm text-gray-800 dark:text-gray-200">
                      {arch.nombreOriginal}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {t(`segurosAlfa.archive.labels.${arch.etiqueta || 'GENERAL'}`, {
                        defaultValue: arch.etiqueta || 'GENERAL',
                      })}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      ARNALD
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(arch.fechaSubida) || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 font-body text-xs font-semibold ${syncChipClass(status)}`}
                      >
                        {labelForStatus(status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={arch.nombreOriginal}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-gray-700 dark:text-sky-300"
                          >
                            <FaDownload />
                            {t('segurosAlfa.archive.download')}
                          </a>
                        )}
                        {status === 'synced' && sync.webUrl && (
                          <a
                            href={sync.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300"
                          >
                            <FaExternalLinkAlt />
                            {t('segurosAlfa.archive.sharepoint.open')}
                          </a>
                        )}
                        {status === 'failed' && allowRetry && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300"
                            disabled={reintentandoId === arch._id}
                            onClick={() => handleRetry(arch._id)}
                          >
                            <FaRedo />
                            {t('segurosAlfa.archive.sharepoint.retry')}
                          </button>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40"
                          onClick={() => handleDelete(arch._id)}
                        >
                          <FaTrash />
                          {t('segurosAlfa.report.delete')}
                        </button>
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
