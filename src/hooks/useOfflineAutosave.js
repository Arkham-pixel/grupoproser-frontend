import { useCallback, useEffect, useRef } from 'react';
import {
  createFormAutosave,
  recoverLocalDraft,
  OFFLINE_FIRST_ENABLED,
} from '../services/autosaveOfflineService.js';

/**
 * Autoguardado Offline First (IndexedDB + cola).
 * Solo persiste tras cambios del usuario (omite el mount inicial).
 * No confundir con useAutoSave (legacy localStorage).
 */
export default function useOfflineAutosave({
  formType,
  formData,
  enabled = true,
  getCaseId,
  getHistorialId,
  onRecoverDraft,
} = {}) {
  const controllerRef = useRef(null);
  const recoveryDone = useRef(false);
  const skipNextSchedule = useRef(true);
  const prevEnabled = useRef(enabled);

  useEffect(() => {
    // Al activar tras hidratar desde servidor, omitir el primer schedule
    if (enabled && !prevEnabled.current) {
      skipNextSchedule.current = true;
    }
    prevEnabled.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!OFFLINE_FIRST_ENABLED || !enabled) return undefined;
    const ctrl = createFormAutosave({
      formType,
      getCaseId,
      getHistorialId,
    });
    controllerRef.current = ctrl;
    const unbind = ctrl.bindBeforeUnload();
    return () => {
      unbind();
      controllerRef.current = null;
    };
  }, [formType, enabled, getCaseId, getHistorialId]);

  useEffect(() => {
    if (!OFFLINE_FIRST_ENABLED || !enabled || !formData) return;
    if (skipNextSchedule.current) {
      skipNextSchedule.current = false;
      return;
    }
    controllerRef.current?.schedule(formData);
  }, [formData, enabled]);

  useEffect(() => {
    if (!OFFLINE_FIRST_ENABLED || !enabled || recoveryDone.current) return undefined;
    recoveryDone.current = true;
    let cancelled = false;
    (async () => {
      const draft = await recoverLocalDraft({
        formType,
        historialId: getHistorialId?.(),
        caseId: getCaseId?.(),
      });
      if (cancelled || !draft) return;
      if (draft.id) controllerRef.current?.setLocalFormId(draft.id);
      if (typeof onRecoverDraft === 'function') {
        onRecoverDraft(draft);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formType, enabled, getCaseId, getHistorialId, onRecoverDraft]);

  const flush = useCallback(async (data, opts = {}) => {
    if (!controllerRef.current) return null;
    return controllerRef.current.flush(data, { force: true, ...opts });
  }, []);

  return {
    flush,
    enabled: OFFLINE_FIRST_ENABLED && enabled,
    getLocalFormId: () => controllerRef.current?.resolveLocalFormId?.(),
  };
}
