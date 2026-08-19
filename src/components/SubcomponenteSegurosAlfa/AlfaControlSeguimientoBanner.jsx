import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getControlSeguimientoAlfaStatus,
  checkControlSeguimientoAlfa,
  dismissControlSeguimientoAlfaNotification,
  getImportExcelAlfaStatus,
  executeImportExcelAlfa,
} from '../../services/segurosAlfaService.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { esUsuarioAlfaExcelActualizar } from './ModalImportarExcelAlfa.jsx';
import {
  buildAlfaCsModalKey,
  buildAlfaCsNoChangesKey,
  isCompleteAlfaCsModalKey,
  shouldAutoOpenAlfaCsModal,
  shouldAutoOpenAlfaCsNoChangesModal,
  wasAlfaCsModalSeen,
  markAlfaCsModalSeen,
  successMessageAfterAlfaSync,
} from './alfaControlSeguimientoModal.js';
import {
  normalizeAlfaPreviewRows,
  buildAlfaModalViewModel,
  formatAlfaDateTime,
} from './alfaActualizacionesModalPresentacion.js';
import ModalActualizacionesSegurosAlfa from './ModalActualizacionesSegurosAlfa.jsx';
import ModalSinActualizacionesAlfa from './ModalSinActualizacionesAlfa.jsx';

const toneClass = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  error:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
  neutral:
    'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
};

/**
 * Banner + modal automático de actualizaciones Control y Seguimiento.
 * Visible solo para el usuario autorizado (1065012991).
 */
export default function AlfaControlSeguimientoBanner({ onCompleted }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [executeSummary, setExecuteSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [noChangesOpen, setNoChangesOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showAllChanges, setShowAllChanges] = useState(false);
  const [rows, setRows] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [autoOpenedKey, setAutoOpenedKey] = useState(null);
  const [autoOpenedNoChangesKey, setAutoOpenedNoChangesKey] = useState(null);
  const [pinnedSessionId, setPinnedSessionId] = useState(null);
  const puedeActualizar = esUsuarioAlfaExcelActualizar();

  const source = status?.source;
  const summary = source?.summary || {};

  const key = useMemo(
    () =>
      buildAlfaCsModalKey({
        itemId: source?.itemId,
        eTag: source?.eTag || source?.lastPreviewedEtag,
        previewImportId: source?.lastPreviewImportId || pinnedSessionId,
      }),
    [
      source?.itemId,
      source?.eTag,
      source?.lastPreviewedEtag,
      source?.lastPreviewImportId,
      pinnedSessionId,
    ]
  );

  const noChangesKey = useMemo(
    () =>
      buildAlfaCsNoChangesKey({
        itemId: source?.itemId,
        eTag: source?.eTag || source?.lastPreviewedEtag,
      }),
    [source?.itemId, source?.eTag, source?.lastPreviewedEtag]
  );

  const viewModel = useMemo(
    () =>
      buildAlfaModalViewModel({
        summary,
        rows,
        source: {
          ...source,
          lastPreviewImportId: pinnedSessionId || source?.lastPreviewImportId,
        },
        statusMeta: { lastCheckedAt: status?.lastCheckedAt },
      }),
    [summary, rows, source, pinnedSessionId, status?.lastCheckedAt]
  );

  const loadPreviewRows = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setLoadingPreview(true);
    setModalError(null);
    try {
      const data = await getImportExcelAlfaStatus(sessionId);
      setRows(normalizeAlfaPreviewRows(data));
    } catch (err) {
      setModalError(err.message || 'No se pudo cargar el preview');
      setRows([]);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const openUpdatesModal = useCallback(
    async ({ markSeen = false, sessionId: sid } = {}) => {
      const sessionId = sid || source?.lastPreviewImportId || pinnedSessionId;
      if (!sessionId) return;
      setNoChangesOpen(false);
      setPinnedSessionId(sessionId);
      setShowAllChanges(false);
      setConfirmOpen(false);
      setModalOpen(true);
      if (markSeen && isCompleteAlfaCsModalKey(key)) {
        markAlfaCsModalSeen(window.localStorage, key);
      }
      await loadPreviewRows(sessionId);
    },
    [source?.lastPreviewImportId, pinnedSessionId, key, loadPreviewRows]
  );

  const openNoChangesModal = useCallback(
    ({ markSeen = true } = {}) => {
      setModalOpen(false);
      setConfirmOpen(false);
      setNoChangesOpen(true);
      if (markSeen && isCompleteAlfaCsModalKey(noChangesKey)) {
        markAlfaCsModalSeen(window.localStorage, noChangesKey);
      }
    },
    [noChangesKey]
  );

  const openResultForStatus = useCallback(
    async (data, { force = false } = {}) => {
      const ui = data?.uiStatus;
      const src = data?.source;
      if (ui === 'updates_available' || ui === 'requires_review') {
        if (src?.lastPreviewImportId) {
          await openUpdatesModal({
            markSeen: true,
            sessionId: src.lastPreviewImportId,
          });
        }
        return;
      }
      if (ui === 'up_to_date') {
        const nk = buildAlfaCsNoChangesKey({
          itemId: src?.itemId,
          eTag: src?.eTag || src?.lastPreviewedEtag,
        });
        if (force || !wasAlfaCsModalSeen(window.localStorage, nk)) {
          openNoChangesModal({ markSeen: true });
        }
      }
    },
    [openUpdatesModal, openNoChangesModal]
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getControlSeguimientoAlfaStatus();
      setStatus(data);
      if (data?.source?.notification?.pending) {
        setToast(
          data.source.notification.message || 'Hay nuevas actualizaciones de Seguros Alfa'
        );
      }
      return data;
    } catch (err) {
      setError(err.message);
      setStatus({
        uiStatus: 'error',
        headline: '⚠ No fue posible consultar Control y Seguimiento',
        detail: err.message,
        tone: 'error',
        canReview: false,
        canConfirm: false,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!puedeActualizar) {
      setLoading(false);
      return undefined;
    }
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load, puedeActualizar]);

  // Auto: hay actualizaciones
  useEffect(() => {
    if (!puedeActualizar) return;
    const ui = status?.uiStatus;
    const seen = wasAlfaCsModalSeen(window.localStorage, key);
    const should = shouldAutoOpenAlfaCsModal({
      uiStatus: ui,
      modalKey: key,
      wasSeen: seen,
      alreadyAutoOpenedForKey: autoOpenedKey === key,
      modalOpen: modalOpen || noChangesOpen,
    });
    if (!should) return;
    if (!source?.lastPreviewImportId) return;

    setAutoOpenedKey(key);
    markAlfaCsModalSeen(window.localStorage, key);
    setPinnedSessionId(source.lastPreviewImportId);
    setShowAllChanges(false);
    setConfirmOpen(false);
    setNoChangesOpen(false);
    setModalOpen(true);
    loadPreviewRows(source.lastPreviewImportId);
  }, [
    status?.uiStatus,
    source?.lastPreviewImportId,
    key,
    autoOpenedKey,
    modalOpen,
    noChangesOpen,
    loadPreviewRows,
    puedeActualizar,
  ]);

  // Auto: sin actualizaciones (una vez por eTag)
  useEffect(() => {
    if (!puedeActualizar) return;
    const ui = status?.uiStatus;
    const seen = wasAlfaCsModalSeen(window.localStorage, noChangesKey);
    const should = shouldAutoOpenAlfaCsNoChangesModal({
      uiStatus: ui,
      noChangesKey,
      wasSeen: seen,
      alreadyAutoOpenedForKey: autoOpenedNoChangesKey === noChangesKey,
      anyModalOpen: modalOpen || noChangesOpen,
    });
    if (!should) return;

    setAutoOpenedNoChangesKey(noChangesKey);
    markAlfaCsModalSeen(window.localStorage, noChangesKey);
    setNoChangesOpen(true);
  }, [
    status?.uiStatus,
    noChangesKey,
    autoOpenedNoChangesKey,
    modalOpen,
    noChangesOpen,
    puedeActualizar,
  ]);

  const handleDismissToast = async () => {
    setToast(null);
    try {
      await dismissControlSeguimientoAlfaNotification();
    } catch {
      /* ignore */
    }
  };

  const handleCheck = async () => {
    if (!puedeActualizar) return;
    setChecking(true);
    try {
      await checkControlSeguimientoAlfa({ force: false });
      const data = await load();
      // Tras revisión manual siempre mostrar ventana emergente del resultado
      await openResultForStatus(data, { force: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleRevisarDespues = () => {
    if (isCompleteAlfaCsModalKey(key)) {
      markAlfaCsModalSeen(window.localStorage, key);
    }
    setConfirmOpen(false);
    setModalOpen(false);
  };

  const handleCloseNoChanges = () => {
    if (isCompleteAlfaCsModalKey(noChangesKey)) {
      markAlfaCsModalSeen(window.localStorage, noChangesKey);
    }
    setNoChangesOpen(false);
  };

  const handleConfirmExecute = async () => {
    if (!puedeActualizar) {
      setModalError('Solo el usuario autorizado puede actualizar ARNALD');
      return;
    }
    const sessionId = pinnedSessionId || source?.lastPreviewImportId;
    if (!sessionId) {
      setModalError('No hay importSessionId disponible');
      return;
    }
    setExecuting(true);
    setModalError(null);
    try {
      // SharePoint puede re-previsualizar el mismo archivo (mismo hash) tras un
      // execute previo; sin force=true el backend bloquea ALREADY_IMPORTED.
      const data = await executeImportExcelAlfa(sessionId, { force: true });
      if (isCompleteAlfaCsModalKey(key)) {
        markAlfaCsModalSeen(window.localStorage, key);
      }
      setConfirmOpen(false);
      setModalOpen(false);
      const totals = data?.totals || {};
      setExecuteSummary({
        created: totals.created ?? 0,
        updated: totals.updated ?? 0,
      });
      setSuccessMsg('ARNALD actualizado correctamente');
      const refreshed = await load();
      // Evitar popup “sin actualizaciones” justo después de aplicar cambios
      const nk = buildAlfaCsNoChangesKey({
        itemId: refreshed?.source?.itemId || source?.itemId,
        eTag:
          refreshed?.source?.eTag ||
          refreshed?.source?.lastPreviewedEtag ||
          source?.eTag ||
          source?.lastPreviewedEtag,
      });
      if (isCompleteAlfaCsModalKey(nk)) {
        markAlfaCsModalSeen(window.localStorage, nk);
        setAutoOpenedNoChangesKey(nk);
      }
      const msg = successMessageAfterAlfaSync(refreshed?.uiStatus);
      if (msg) setSuccessMsg(msg);
      onCompleted?.({
        ...data,
        successMessage: msg || '✓ ARNALD está actualizado con Seguros Alfa',
      });
    } catch (err) {
      setModalError(err.message || 'Error al ejecutar la actualización');
      setConfirmOpen(false);
    } finally {
      setExecuting(false);
    }
  };

  if (!puedeActualizar) return null;

  if (loading && !status) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
        Consultando Control y Seguimiento…
      </div>
    );
  }

  const tone = status?.tone || 'neutral';
  const lastAt = status?.lastCheckedAt
    ? new Date(status.lastCheckedAt).toLocaleString('es-CO')
    : null;
  const canAct =
    status?.uiStatus === 'updates_available' || status?.uiStatus === 'requires_review';
  const isError = status?.uiStatus === 'error';

  return (
    <div className="space-y-2">
      {toast && !isError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
          <p>
            <strong>Notificación:</strong> {toast}
          </p>
          <button type="button" className={expressBtnGhost} onClick={handleDismissToast}>
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p className="font-semibold">{successMsg}</p>
          {executeSummary && successMsg.startsWith('ARNALD actualizado') && (
            <p className="mt-1 text-xs">
              {executeSummary.created} casos creados · {executeSummary.updated} casos
              actualizados
            </p>
          )}
        </div>
      )}

      <div className={`rounded-lg border px-4 py-3 ${toneClass[tone] || toneClass.neutral}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-sm font-bold tracking-wide">
              CONTROL Y SEGUIMIENTO — SEGUROS ALFA
            </p>
            <p className="mt-1 font-heading text-base font-semibold">
              {status?.headline || '—'}
            </p>
            <p className="mt-0.5 font-body text-sm opacity-90">{status?.detail}</p>
            {lastAt && !isError && (
              <p className="mt-1 font-body text-xs opacity-70">Última revisión: {lastAt}</p>
            )}
            {canAct && (
              <p className="mt-2 font-body text-xs">
                {summary.created ?? 0} nuevos · {summary.updated ?? 0} actualizados ·{' '}
                {summary.claimNumberAssignments ?? 0} siniestros ·{' '}
                {summary.policyNumberUpdates ?? 0} pólizas · {summary.ambiguous ?? 0} ambiguos ·{' '}
                {summary.rejected ?? 0} rechazados
              </p>
            )}
            {error && status?.uiStatus !== 'error' && (
              <p className="mt-1 text-xs text-red-700">{error}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeActualizar && (
              <button
                type="button"
                className={expressBtnGhost}
                disabled={checking}
                onClick={handleCheck}
              >
                {checking
                  ? isError
                    ? 'Reintentando…'
                    : 'Revisando…'
                  : isError
                    ? 'Reintentar consulta'
                    : 'Actualizar estado'}
              </button>
            )}
            {canAct && (source?.lastPreviewImportId || pinnedSessionId) && (
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={() => openUpdatesModal({ markSeen: true })}
              >
                Revisar actualizaciones
              </button>
            )}
            {status?.uiStatus === 'up_to_date' && (
              <button
                type="button"
                className={expressBtnGhost}
                onClick={() => openNoChangesModal({ markSeen: true })}
              >
                Ver detalle
              </button>
            )}
          </div>
        </div>
      </div>

      <ModalActualizacionesSegurosAlfa
        open={modalOpen}
        viewModel={viewModel}
        showAllChanges={showAllChanges}
        confirmOpen={confirmOpen}
        loadingPreview={loadingPreview}
        executing={executing}
        error={modalError}
        onClose={handleRevisarDespues}
        onToggleAll={() => setShowAllChanges((v) => !v)}
        onAskConfirm={() => setConfirmOpen(true)}
        onCancelConfirm={() => setConfirmOpen(false)}
        onConfirmExecute={handleConfirmExecute}
        allowExecute={puedeActualizar}
      />

      <ModalSinActualizacionesAlfa
        open={noChangesOpen}
        fileName={source?.fileName || status?.fileName}
        lastModifiedDisplay={formatAlfaDateTime(
          source?.lastModifiedDateTime || source?.lastModified
        )}
        lastCheckedDisplay={formatAlfaDateTime(
          status?.lastCheckedAt || source?.lastCheckedAt
        )}
        onClose={handleCloseNoChanges}
      />
    </div>
  );
}
