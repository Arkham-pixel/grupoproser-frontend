import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaDownload,
  FaExternalLinkAlt,
  FaImages,
  FaRedo,
  FaSync,
  FaTrash,
  FaUpload,
} from 'react-icons/fa';
import {
  eliminarArchivoSura,
  getCasoSuraById,
  getDocumentosSharePointSura,
  getPolizasImportadasSura,
  reintentarSharePointSura,
  subirArchivoSura,
} from '../../services/segurosSuraService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import BotonDescargaStorage from '../shared/BotonDescargaStorage.jsx';
import { ETIQUETAS_ARCHIVO_SURA, formatDate } from './segurosSuraHelpers.js';
import { esSesionConPermisoLiderSura } from '../../utils/permisosCasoPorRol.js';
import {
  esFotoArchiveroParaInformeSura,
  fotosArchiveroPendientesEnInformeSura,
} from './informeAgilSuraHelpers.js';
import { importarFotosArchiveroAlInformeCaso } from './syncFotosNsrAlInformeSura.js';

const POLL_MS = 45000;

const canRetrySharePoint = () => {
  const rol = String(localStorage.getItem('rol') || '')
    .trim()
    .toLowerCase();
  if (rol === 'admin' || rol === 'soporte' || rol === 'administrador' || rol === 'support') {
    return true;
  }
  return esSesionConPermisoLiderSura();
};

const syncChipClass = (status) => {
  switch (status) {
    case 'synced':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
    case 'pending':
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

export default function ArchiveroSegurosSura({ caso, onClose, onChanged }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [archivos, setArchivos] = useState(() => caso?.archivos || []);
  const [etiqueta, setEtiqueta] = useState('GENERAL');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [syncByArchivoId, setSyncByArchivoId] = useState({});
  const [summary, setSummary] = useState(null);
  const [cargandoSync, setCargandoSync] = useState(false);
  const [reintentandoId, setReintentandoId] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [importandoInforme, setImportandoInforme] = useState(false);
  const [importandoId, setImportandoId] = useState(null);
  const allowRetry = useMemo(() => canRetrySharePoint(), []);

  const fotosPendientesInforme = useMemo(
    () => fotosArchiveroPendientesEnInformeSura({ ...caso, archivos }),
    [caso, archivos]
  );
  const idsPendientesInforme = useMemo(
    () => new Set(fotosPendientesInforme.map((f) => String(f._id))),
    [fotosPendientesInforme]
  );

  const cargarPolizasImportadas = useCallback(async () => {
    if (!caso?._id) return;
    try {
      const data = await getPolizasImportadasSura(caso._id);
      setDocumentos(Array.isArray(data?.documentos) ? data.documentos : []);
    } catch (err) {
      console.warn('Pólizas importadas Sura no disponibles:', err.message);
      setDocumentos([]);
    }
  }, [caso?._id]);

  const cargarEstadoSharePoint = useCallback(async () => {
    if (!caso?._id) return;
    setCargandoSync(true);
    try {
      const data = await getDocumentosSharePointSura(caso._id);
      const map = {};
      for (const doc of data.documents || []) {
        map[String(doc.archivoId)] = doc.sync || { status: 'none' };
      }
      setSyncByArchivoId(map);
      setSummary(data.summary || null);
    } catch (err) {
      console.warn('Estado SharePoint Sura no disponible:', err.message);
    } finally {
      setCargandoSync(false);
    }
  }, [caso?._id]);

  const refrescar = async () => {
    const actualizado = await getCasoSuraById(caso._id);
    setArchivos(actualizado.archivos || []);
    if (onChanged) onChanged(actualizado);
    await Promise.all([cargarEstadoSharePoint(), cargarPolizasImportadas()]);
    return actualizado;
  };

  useEffect(() => {
    setArchivos(caso?.archivos || []);
  }, [caso?._id, caso?.archivos]);

  useEffect(() => {
    if (!caso?._id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const actualizado = await getCasoSuraById(caso._id);
        if (cancelled) return;
        setArchivos(actualizado.archivos || []);
        if (onChanged) onChanged(actualizado);
      } catch {
        /* se mantiene el caso de la lista */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo al abrir/cambiar de caso; onChanged no va en deps para no ciclar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caso?._id]);

  useEffect(() => {
    cargarEstadoSharePoint();
    cargarPolizasImportadas();
    const timer = setInterval(() => {
      cargarEstadoSharePoint();
      cargarPolizasImportadas();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [cargarEstadoSharePoint, cargarPolizasImportadas]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError(null);
    setExito(null);
    setSubiendo(true);
    try {
      const creados = [];
      for (const file of files) {
        const creado = await subirArchivoSura(caso._id, file, etiqueta);
        if (creado) creados.push(creado);
      }
      const actualizado = await refrescar();
      const fotosCreadas = creados.filter((c) =>
        esFotoArchiveroParaInformeSura({
          ...c,
          etiqueta: c?.etiqueta || etiqueta,
        })
      );
      const et = String(etiqueta || '').toUpperCase();
      const autoTraer = et === 'FOTOS' || et === 'INSPECCION';
      if (autoTraer && fotosCreadas.length) {
        const result = await importarFotosArchiveroAlInformeCaso({
          casoId: caso._id,
          casoBase: actualizado,
          archivoIds: fotosCreadas.map((c) => String(c._id)),
        });
        if (result?.caso && onChanged) onChanged(result.caso);
        setExito(
          t('segurosSura.archive.importToReportUploaded', {
            count: result?.imported || fotosCreadas.length,
          })
        );
      } else {
        setExito(
          files.length > 1
            ? t('segurosSura.archive.uploadOkMultiple', { count: files.length })
            : t('segurosSura.archive.uploadOk')
        );
      }
    } catch (err) {
      setError(err.message || t('segurosSura.archive.uploadError'));
    } finally {
      setSubiendo(false);
    }
  };

  const handleTraerAlInforme = async (archivoIds = null) => {
    setError(null);
    setExito(null);
    const ids = Array.isArray(archivoIds) && archivoIds.length ? archivoIds : null;
    if (ids?.length === 1) setImportandoId(ids[0]);
    else setImportandoInforme(true);
    try {
      const result = await importarFotosArchiveroAlInformeCaso({
        casoId: caso._id,
        casoBase: { ...caso, archivos },
        archivoIds: ids,
      });
      if (result?.caso) {
        setArchivos(result.caso.archivos || archivos);
        if (onChanged) onChanged(result.caso);
      }
      if (result?.imported > 0) {
        setExito(t('segurosSura.archive.importToReportOk', { count: result.imported }));
      } else {
        setExito(t('segurosSura.archive.importToReportNone'));
      }
    } catch (err) {
      setError(err.message || t('segurosSura.archive.importToReportError'));
    } finally {
      setImportandoInforme(false);
      setImportandoId(null);
    }
  };

  const handleDelete = async (archivoId) => {
    if (!window.confirm(t('segurosSura.archive.confirmDelete'))) return;
    setError(null);
    setExito(null);
    try {
      await eliminarArchivoSura(caso._id, archivoId);
      await refrescar();
      setExito(t('segurosSura.archive.deleteOk'));
    } catch (err) {
      setError(err.message || t('segurosSura.archive.deleteError'));
    }
  };

  const handleRetry = async (archivoId) => {
    if (!allowRetry) return;
    setError(null);
    setExito(null);
    setReintentandoId(archivoId);
    try {
      await reintentarSharePointSura(caso._id, archivoId);
      setExito(t('segurosSura.archive.sharepoint.retryOk'));
      await cargarEstadoSharePoint();
    } catch (err) {
      setError(err.message || t('segurosSura.archive.sharepoint.retryError'));
    } finally {
      setReintentandoId(null);
    }
  };

  const labelForStatus = (status) => {
    if (status === 'pending_destination') {
      return t('segurosSura.archive.status.pendingDestination', {
        defaultValue: 'Pendiente de destino',
      });
    }
    if (status === 'imported') {
      return t('segurosSura.archive.status.importedFromSura', {
        defaultValue: 'Importado desde Sura',
      });
    }
    const key = `segurosSura.archive.sharepoint.status.${status || 'none'}`;
    return t(key, { defaultValue: status || 'none' });
  };

  const resolveDownloadUrl = (doc) => {
    if (doc.origin === 'sharepoint') return doc.downloadUrl || null;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
            {t('segurosSura.archive.title')}
          </h3>
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">
            {t('segurosSura.archive.subtitle', {
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
          {t('segurosSura.archive.sharepoint.refresh')}
        </button>
      </div>

      {summary && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-body text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
          <span className="font-semibold">{t('segurosSura.archive.sharepoint.summaryTitle')}</span>
          {' · '}
          {t('segurosSura.archive.sharepoint.summaryLine', {
            synced: summary.synced || 0,
            pending: summary.pending || 0,
            syncing: summary.syncing || 0,
            failed: summary.failed || 0,
            none: summary.none || 0,
          })}
        </div>
      )}

      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Campo label={t('segurosSura.archive.label')}>
          <SelectFenix value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
            {ETIQUETAS_ARCHIVO_SURA.map((op) => (
              <option key={op} value={op}>
                {t(`segurosSura.archive.labels.${op}`, { defaultValue: op })}
              </option>
            ))}
          </SelectFenix>
        </Campo>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <button
          type="button"
          className={expressBtnPrimary}
          disabled={subiendo || importandoInforme}
          onClick={() => inputRef.current?.click()}
        >
          <FaUpload />
          {subiendo ? t('segurosSura.archive.uploading') : t('segurosSura.archive.upload')}
        </button>
        {fotosPendientesInforme.length > 0 && (
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={importandoInforme || subiendo}
            onClick={() => handleTraerAlInforme()}
          >
            <FaImages />
            {importandoInforme
              ? t('segurosSura.archive.importToReportWorking')
              : t('segurosSura.archive.importToReport', {
                  count: fotosPendientesInforme.length,
                })}
          </button>
        )}
      </div>
      {fotosPendientesInforme.length > 0 && (
        <p className="font-body text-xs text-gray-500 dark:text-gray-400">
          {t('segurosSura.archive.importToReportHint', {
            count: fotosPendientesInforme.length,
          })}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosSura.archive.file', { defaultValue: 'Nombre' })}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosSura.archive.type', { defaultValue: 'Tipo' })}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosSura.archive.origin', { defaultValue: 'Origen' })}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosSura.archive.date', { defaultValue: 'Fecha' })}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosSura.archive.sharepoint.column', { defaultValue: 'Estado' })}
              </th>
              <th className="px-3 py-2 text-right font-body text-xs font-semibold uppercase text-gray-500">
                {t('segurosSura.report.actions', { defaultValue: 'Acciones' })}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
            {(documentos.length ? documentos : []).length === 0 && archivos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center font-body text-sm text-gray-500">
                  {t('segurosSura.archive.empty')}
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
                      {t(`segurosSura.archive.labels.${String(doc.tipo || '').toUpperCase()}`, {
                        defaultValue: doc.tipo || '—',
                      })}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {doc.originLabel ||
                        (doc.origin === 'sharepoint' ? 'SURA / SHAREPOINT' : 'ARNALD')}
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
                        {doc.origin === 'sharepoint' && url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-gray-700 dark:text-sky-300"
                          >
                            <FaDownload />
                            {t('segurosSura.archive.download')}
                          </a>
                        ) : (
                          doc.ruta && (
                            <BotonDescargaStorage
                              ruta={doc.ruta}
                              nombre={doc.nombre}
                              onError={(err) => setError(err.message)}
                            >
                              {t('segurosSura.archive.download')}
                            </BotonDescargaStorage>
                          )
                        )}
                        {doc.sharepoint?.webUrl && (
                          <a
                            href={doc.sharepoint.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300"
                          >
                            <FaExternalLinkAlt />
                            {t('segurosSura.archive.sharepoint.open')}
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
                              ? t('segurosSura.archive.sharepoint.retrying')
                              : t('segurosSura.archive.sharepoint.retry')}
                          </button>
                        )}
                        {doc.origin === 'arnald' &&
                          doc.archivoId &&
                          idsPendientesInforme.has(String(doc.archivoId)) &&
                          esFotoArchiveroParaInformeSura(doc) && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300"
                            disabled={importandoInforme || importandoId === doc.archivoId}
                            onClick={() => handleTraerAlInforme([doc.archivoId])}
                          >
                            <FaImages />
                            {importandoId === doc.archivoId
                              ? t('segurosSura.archive.importToReportWorking')
                              : t('segurosSura.archive.importToReportOne')}
                          </button>
                        )}
                        {doc.origin === 'arnald' && doc.archivoId && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40"
                            onClick={() => handleDelete(doc.archivoId)}
                          >
                            <FaTrash />
                            {t('segurosSura.report.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              archivos.map((arch) => {
                const sync = syncByArchivoId[String(arch._id)] || { status: 'none' };
                const status = sync.status || 'none';
                return (
                  <tr key={arch._id}>
                    <td className="px-3 py-2 font-body text-sm text-gray-800 dark:text-gray-200">
                      {arch.nombreOriginal}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {t(`segurosSura.archive.labels.${arch.etiqueta || 'GENERAL'}`, {
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
                        {arch.ruta && (
                          <BotonDescargaStorage
                            ruta={arch.ruta}
                            nombre={arch.nombreOriginal}
                            onError={(err) => setError(err.message)}
                          >
                            {t('segurosSura.archive.download')}
                          </BotonDescargaStorage>
                        )}
                        {status === 'synced' && sync.webUrl && (
                          <a
                            href={sync.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300"
                          >
                            <FaExternalLinkAlt />
                            {t('segurosSura.archive.sharepoint.open')}
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
                            {t('segurosSura.archive.sharepoint.retry')}
                          </button>
                        )}
                        {idsPendientesInforme.has(String(arch._id)) &&
                          esFotoArchiveroParaInformeSura(arch) && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300"
                            disabled={importandoInforme || importandoId === String(arch._id)}
                            onClick={() => handleTraerAlInforme([arch._id])}
                          >
                            <FaImages />
                            {importandoId === String(arch._id)
                              ? t('segurosSura.archive.importToReportWorking')
                              : t('segurosSura.archive.importToReportOne')}
                          </button>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40"
                          onClick={() => handleDelete(arch._id)}
                        >
                          <FaTrash />
                          {t('segurosSura.report.delete')}
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
