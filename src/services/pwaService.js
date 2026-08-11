/**
 * Utilidades PWA / almacenamiento persistente.
 */
import { requestPersistentStorage, estimateStorage } from './offlineDatabase.js';
import { offlineLog } from '../offline/offlineLog.js';
import { OFFLINE_RETENTION_DAYS } from '../config/autoSaveConfig.js';
import { cleanupSyncedForms } from './offlineDatabase.js';

export async function initPwaStorage() {
  try {
    const persisted = await requestPersistentStorage();
    const est = await estimateStorage();
    if (est?.ratio >= 0.8) {
      offlineLog('STORAGE_WARNING', est);
    }
    await cleanupSyncedForms(OFFLINE_RETENTION_DAYS);
    return { persisted, estimate: est };
  } catch (e) {
    return { persisted: false, error: e?.message };
  }
}

export function isPwaInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}
