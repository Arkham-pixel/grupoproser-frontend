/**
 * Autoguardado Offline First (Dexie).
 * No usa localStorage para el payload completo del formulario.
 */
import {
  saveFormLocally,
  queueSync,
  loadLocalData,
  findLocalFormByHistorialId,
  findLocalFormsByCaseAndType,
  newClientId,
} from './offlineDatabase.js';
import { OFFLINE_FIRST_ENABLED, AUTOSAVE_DEBOUNCE_MS } from '../config/autoSaveConfig.js';

const listeners = new Set();
let globalStatus = {
  state: 'idle', // idle | saving | saved_local | pending | syncing | synced | offline | error
  pendingCount: 0,
  message: '',
  updatedAt: null,
};

export function getAutosaveStatus() {
  return { ...globalStatus };
}

export function subscribeAutosaveStatus(fn) {
  listeners.add(fn);
  fn(getAutosaveStatus());
  return () => listeners.delete(fn);
}

function emitStatus(patch) {
  globalStatus = {
    ...globalStatus,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  listeners.forEach((fn) => {
    try {
      fn(getAutosaveStatus());
    } catch {
      // ignore
    }
  });
}

export function setAutosaveUiStatus(patch) {
  emitStatus(patch);
}

/**
 * Crea un controlador de autoguardado para un formulario.
 */
export function createFormAutosave({
  formType,
  getFormId,
  getCaseId,
  getHistorialId,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
} = {}) {
  let timer = null;
  let dirty = false;
  let lastSavedSnapshot = '';
  let localFormId = null;

  const ensureLocalId = async () => {
    if (localFormId) return localFormId;
    const hid = typeof getHistorialId === 'function' ? getHistorialId() : null;
    if (hid) {
      const existing = await findLocalFormByHistorialId(hid);
      if (existing) {
        localFormId = existing.id;
        return localFormId;
      }
    }
    localFormId = newClientId();
    return localFormId;
  };

  const persist = async (data, { force = false } = {}) => {
    if (!OFFLINE_FIRST_ENABLED) return null;
    const snapshot = JSON.stringify(data);
    if (!force && snapshot === lastSavedSnapshot) {
      dirty = false;
      return null;
    }
    emitStatus({ state: 'saving', message: 'Guardando…' });
    const id = await ensureLocalId();
    const caseId = typeof getCaseId === 'function' ? getCaseId() : '';
    const historialId = typeof getHistorialId === 'function' ? getHistorialId() : null;
    const record = await saveFormLocally({
      id,
      caseId,
      formType,
      data,
      historialId,
      syncStatus: 'pending',
    });
    await queueSync({
      entityType: 'form',
      entityId: id,
      operation: historialId ? 'UPDATE' : 'CREATE',
      payload: {
        localFormId: id,
        historialId,
        formType,
        caseId,
        data,
        expectedVersion: record.dataVersion,
        clientId: record.clientId,
      },
    });
    lastSavedSnapshot = snapshot;
    dirty = false;
    emitStatus({
      state: 'saved_local',
      message: 'Guardado en este dispositivo',
      pendingCount: (globalStatus.pendingCount || 0) + 1,
    });
    return record;
  };

  const schedule = (data) => {
    if (!OFFLINE_FIRST_ENABLED) return;
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      persist(data).catch((err) => {
        emitStatus({ state: 'error', message: err?.message || 'Error al guardar local' });
      });
    }, debounceMs);
  };

  const flush = async (data, opts = {}) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (data !== undefined) return persist(data, opts);
    return null;
  };

  const hasUnsavedLocal = () => dirty;

  const bindBeforeUnload = () => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  };

  const resolveLocalFormId = () => localFormId;
  const setLocalFormId = (id) => {
    localFormId = id;
  };

  return {
    schedule,
    flush,
    persist,
    hasUnsavedLocal,
    bindBeforeUnload,
    resolveLocalFormId,
    setLocalFormId,
    ensureLocalId,
  };
}

export async function recoverLocalDraft({ formType, historialId, caseId }) {
  if (historialId) {
    const byHist = await findLocalFormByHistorialId(historialId);
    if (byHist) return byHist;
  }
  if (caseId || formType) {
    const list = await findLocalFormsByCaseAndType(caseId, formType);
    if (list.length) {
      return list.sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      )[0];
    }
  }
  return null;
}

export { loadLocalData, OFFLINE_FIRST_ENABLED };
