import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCloudUploadAlt,
  FaExternalLinkAlt,
  FaFolderOpen,
  FaBan,
  FaSync,
} from 'react-icons/fa';
import {
  expressAlertSuccess,
  expressBtnGhost,
} from '../SubcomponenteExpress/expressFenixUi.js';

const ACTIONABLE = new Set(['pending', 'syncing', 'failed', 'disabled', 'pending_destination']);

/**
 * Banner + alertas de sync SharePoint + controles Subir / No subir.
 */
export default function AlfaSharePointSyncBanner({
  summary,
  loading,
  hasActivity,
  pendingTotal = 0,
  justSynced = [],
  documents = [],
  onRefresh,
  onOpenArchivero,
  onDismissSynced,
  onSetEnabled,
  compact = false,
}) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [expanded, setExpanded] = useState(true);

  const queueDocs = useMemo(() => {
    return (documents || [])
      .filter((d) => {
        const st = d.sync?.status || 'none';
        return ACTIONABLE.has(st) && d.archivoId;
      })
      .slice(0, 40);
  }, [documents]);

  const handleToggle = async (archivoId, enabled) => {
    if (!onSetEnabled || !archivoId) return;
    setActionError('');
    setBusyId(archivoId);
    try {
      await onSetEnabled(archivoId, enabled);
    } catch (err) {
      setActionError(err?.message || t('segurosAlfa.archive.sharepoint.toggleError'));
    } finally {
      setBusyId(null);
    }
  };

  if (!hasActivity && !justSynced.length && !queueDocs.length) return null;

  return (
    <div className={compact ? 'space-y-2' : 'mb-4 space-y-2'}>
      {justSynced.map((item) => (
        <div
          key={item.archivoId}
          className={`${expressAlertSuccess} flex flex-wrap items-center justify-between gap-2`}
        >
          <p className="min-w-0 flex-1 font-body text-sm">
            {t('segurosAlfa.archive.sharepoint.syncedToast', {
              name: item.nombre,
              defaultValue: '«{{name}}» ya está en SharePoint (SINIESTROS).',
            })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {item.webUrl && (
              <a
                href={item.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white/80 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-white dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <FaExternalLinkAlt />
                {t('segurosAlfa.archive.sharepoint.open')}
              </a>
            )}
            {onDismissSynced && (
              <button
                type="button"
                className="text-xs font-semibold underline opacity-80"
                onClick={() => onDismissSynced(item.archivoId)}
              >
                {t('common.close', { defaultValue: 'Cerrar' })}
              </button>
            )}
          </div>
        </div>
      ))}

      {(hasActivity || queueDocs.length > 0) && summary && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 font-body text-xs text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold">
                {t('segurosAlfa.archive.sharepoint.summaryTitle')}
              </span>
              {' · '}
              {t('segurosAlfa.archive.sharepoint.bannerLine', {
                synced: summary.synced || 0,
                pending: pendingTotal,
                failed: summary.failed || 0,
                defaultValue:
                  '{{synced}} en SharePoint · {{pending}} en cola · {{failed}} con error',
              })}
              <span className="mt-0.5 block text-[11px] opacity-80">
                {t('segurosAlfa.archive.sharepoint.chooseHint', {
                  defaultValue:
                    'Revise cada archivo y pulse «Subir» solo cuando esté listo. Por defecto no se copia a SharePoint.',
                })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {queueDocs.length > 0 && (
                <button
                  type="button"
                  className={expressBtnGhost}
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded
                    ? t('segurosAlfa.archive.sharepoint.hideQueue', {
                        defaultValue: 'Ocultar cola',
                      })
                    : t('segurosAlfa.archive.sharepoint.showQueue', {
                        count: queueDocs.length,
                        defaultValue: 'Ver cola ({{count}})',
                      })}
                </button>
              )}
              {onRefresh && (
                <button
                  type="button"
                  className={expressBtnGhost}
                  onClick={onRefresh}
                  disabled={loading}
                >
                  <FaSync className={loading ? 'animate-spin' : undefined} />
                  {t('segurosAlfa.archive.sharepoint.refresh')}
                </button>
              )}
              {onOpenArchivero && (
                <button type="button" className={expressBtnGhost} onClick={onOpenArchivero}>
                  <FaFolderOpen />
                  {t('segurosAlfa.archive.sharepoint.viewArchive', {
                    defaultValue: 'Ver Archivero',
                  })}
                </button>
              )}
            </div>
          </div>

          {actionError && (
            <p className="mt-2 text-[11px] font-semibold text-red-700 dark:text-red-300">
              {actionError}
            </p>
          )}

          {expanded && queueDocs.length > 0 && onSetEnabled && (
            <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto border-t border-sky-200/80 pt-2 dark:border-sky-900/60">
              {queueDocs.map((doc) => {
                const st = doc.sync?.status || 'none';
                const id = String(doc.archivoId);
                const busy = busyId === id;
                const excluded = st === 'disabled';
                const waitingId = st === 'pending_destination';
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/70 px-2 py-1.5 dark:bg-black/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                        {doc.nombre || 'documento'}
                      </p>
                      <p className="text-[10px] opacity-70">
                        {waitingId
                          ? t('segurosAlfa.archive.status.pendingDestination', {
                              defaultValue: 'Pendiente de destino (cédula)',
                            })
                          : excluded
                            ? t('segurosAlfa.archive.sharepoint.status.disabled', {
                                defaultValue: 'No subir',
                              })
                            : t(`segurosAlfa.archive.sharepoint.status.${st}`, {
                                defaultValue: st,
                              })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {st === 'syncing' ? (
                        <span className="text-[10px] font-semibold opacity-70">
                          {t('segurosAlfa.archive.sharepoint.status.syncing')}
                        </span>
                      ) : waitingId ? (
                        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                          {t('segurosAlfa.archive.sharepoint.needIdHint', {
                            defaultValue: 'Falta cédula para destino',
                          })}
                        </span>
                      ) : excluded ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggle(id, true)}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                          title={t('segurosAlfa.archive.sharepoint.doUploadHint', {
                            defaultValue: 'Encolar copia a SharePoint SINIESTROS',
                          })}
                        >
                          <FaCloudUploadAlt />
                          {t('segurosAlfa.archive.sharepoint.doUpload', {
                            defaultValue: 'Subir',
                          })}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggle(id, false)}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                          title={t('segurosAlfa.archive.sharepoint.doNotUploadHint', {
                            defaultValue: 'Queda solo en ARNALD; no se copia a SharePoint',
                          })}
                        >
                          <FaBan />
                          {t('segurosAlfa.archive.sharepoint.doNotUpload', {
                            defaultValue: 'No subir',
                          })}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
