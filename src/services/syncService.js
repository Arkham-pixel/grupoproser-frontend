/**
 * Sincronización de cola offline → historialService.
 */
import historialService from './historialService.js';
import {
  getPendingQueueItems,
  getSyncStatusSummary,
  setMetadata,
  offlineDb,
} from './offlineDatabase.js';
import { checkConnectivity, markConnectivityLost } from './connectivityService.js';
import { setAutosaveUiStatus } from './autosaveOfflineService.js';
import { offlineLog } from '../offline/offlineLog.js';
import { OFFLINE_FIRST_ENABLED } from '../config/autoSaveConfig.js';

const BACKOFF_MS = [5000, 15000, 30000, 60000];
let syncing = false;
let syncTimer = null;

function backoffDelay(retryCount) {
  return BACKOFF_MS[Math.min(retryCount || 0, BACKOFF_MS.length - 1)];
}

async function markQueue(id, patch) {
  await offlineDb.sync_queue.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

async function processFormOp(item) {
  const { payload, operation, operationId } = item;
  const token = localStorage.getItem('token');
  if (!token) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }

  // Idempotencia local
  const applied = await offlineDb.applied_operations.get(operationId || item.id);
  if (applied) return { skipped: true };

  const body = {
    tipo: payload.formType,
    titulo:
      payload.data?.titulo ||
      `Formulario ${payload.formType} - ${payload.caseId || payload.localFormId}`,
    asegurado: payload.data?.asegurado || '',
    casoId: String(payload.caseId || payload.data?.numeroCaso || payload.localFormId),
    numeroCaso: String(payload.data?.numeroCaso || payload.caseId || ''),
    estado: payload.data?.estado || 'en_proceso',
    estadoActual: payload.data?.estadoActual,
    datos: payload.data,
    clientId: payload.clientId,
    operationId: operationId || item.id,
    expectedVersion: payload.expectedVersion,
    dataVersion: payload.expectedVersion,
  };

  let result;
  if (operation === 'CREATE' || !payload.historialId) {
    result = await historialService.guardarFormulario(body);
  } else {
    result = await historialService.actualizarFormulario(payload.historialId, body);
  }

  const nuevoId = result?._id || result?.id || result?.data?._id || payload.historialId;
  const serverVersion =
    result?.dataVersion ??
    result?.data?.dataVersion ??
    (Number(payload.expectedVersion) || 1) + 1;
  if (payload.localFormId) {
    await offlineDb.forms.update(payload.localFormId, {
      syncStatus: 'synced',
      historialId: nuevoId ? String(nuevoId) : payload.historialId,
      dataVersion: Number(serverVersion) || 1,
      version: Number(serverVersion) || 1,
      updatedAt: new Date().toISOString(),
    });
  }
  await offlineDb.applied_operations.put({
    operationId: operationId || item.id,
    appliedAt: new Date().toISOString(),
    historialId: nuevoId ? String(nuevoId) : null,
  });
  return result;
}

async function processPhotoOp(item) {
  const photo = await offlineDb.photos.get(item.payload?.photoId || item.entityId);
  if (!photo) return { skipped: true };
  if (photo.syncStatus === 'synced') return { skipped: true };

  const file =
    photo.blob instanceof Blob
      ? new File([photo.blob], photo.fileName || `photo_${photo.id}.jpg`, {
          type: photo.mimeType || 'image/jpeg',
        })
      : null;
  if (!file) throw new Error('Foto sin blob local');

  // Reutiliza pipeline de historial: subir vía FormData interno si existe helper;
  // fallback: guardar referencia en form data al sincronizar el form.
  const formData = new FormData();
  formData.append('imagenes', file, file.name);
  const token = localStorage.getItem('token');
  const { BASE_URL } = await import('../config/apiConfig.js');
  const casoId = photo.caseId || 'offline';
  const res = await fetch(
    `${BASE_URL}/api/historial-formularios/upload-images?casoId=${encodeURIComponent(casoId)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token || ''}` },
      body: formData,
    }
  );
  if (res.status === 401) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Upload foto falló (${res.status})`);
  }
  const json = await res.json().catch(() => ({}));
  const ruta =
    json?.rutas?.[0] ||
    json?.paths?.[0] ||
    json?.data?.rutas?.[0] ||
    json?.url ||
    null;
  await offlineDb.photos.update(photo.id, {
    syncStatus: 'synced',
    remotePath: ruta,
    uploadedAt: new Date().toISOString(),
  });
  return json;
}

async function processAttachmentOp(item) {
  const att = await offlineDb.attachments.get(item.payload?.attachmentId || item.entityId);
  if (!att || att.syncStatus === 'synced') return { skipped: true };
  const file =
    att.blob instanceof Blob
      ? new File([att.blob], att.fileName || `file_${att.id}`, {
          type: att.mimeType || 'application/octet-stream',
        })
      : null;
  if (!file) throw new Error('Adjunto sin blob');
  const formData = new FormData();
  formData.append('imagenes', file, file.name);
  const token = localStorage.getItem('token');
  const { BASE_URL } = await import('../config/apiConfig.js');
  const res = await fetch(
    `${BASE_URL}/api/historial-formularios/upload-images?casoId=${encodeURIComponent(att.caseId || 'offline')}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token || ''}` },
      body: formData,
    }
  );
  if (res.status === 401) {
    const err = new Error('AUTH_REQUIRED');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }
  if (!res.ok) throw new Error(`Upload adjunto falló (${res.status})`);
  await offlineDb.attachments.update(att.id, {
    syncStatus: 'synced',
    uploadedAt: new Date().toISOString(),
  });
  return true;
}

async function processItem(item) {
  if (item.entityType === 'form') return processFormOp(item);
  if (item.entityType === 'photo') return processPhotoOp(item);
  if (item.entityType === 'attachment') return processAttachmentOp(item);
  throw new Error(`entityType desconocido: ${item.entityType}`);
}

export async function syncPendingChanges({ force = false } = {}) {
  if (!OFFLINE_FIRST_ENABLED) return { ok: true, skipped: true };
  if (syncing && !force) return { ok: false, reason: 'busy' };

  const online = await checkConnectivity();
  if (!online) {
    setAutosaveUiStatus({
      state: 'offline',
      message: 'Sin conexión — puedes continuar trabajando',
    });
    return { ok: false, reason: 'offline' };
  }

  syncing = true;
  offlineLog('SYNC_STARTED', {});
  setAutosaveUiStatus({ state: 'syncing', message: 'Sincronizando…' });

  try {
    const items = await getPendingQueueItems();
    let success = 0;
    let failed = 0;

    for (const item of items) {
      if (item.status === 'syncing') continue;
      await markQueue(item.id, { status: 'syncing', lastAttempt: new Date().toISOString() });
      try {
        await processItem(item);
        await markQueue(item.id, { status: 'synced' });
        // Opcional: borrar de cola
        await offlineDb.sync_queue.delete(item.id);
        success += 1;
        offlineLog('SYNC_SUCCESS', { id: item.id, entityType: item.entityType });
      } catch (err) {
        const retryCount = (item.retryCount || 0) + 1;
        const isAuth =
          err?.code === 'AUTH_REQUIRED' ||
          err?.message === 'AUTH_REQUIRED' ||
          /401|AUTH_REQUIRED|unauthorized/i.test(String(err?.message || ''));
        const isConflict =
          err?.status === 409 ||
          err?.code === 'CONFLICT' ||
          err?.conflict === true ||
          err?.response?.status === 409;
        if (isConflict) {
          offlineLog('CONFLICT_DETECTED', { id: item.id });
          await markQueue(item.id, {
            status: 'error',
            retryCount,
            lastError: 'CONFLICT',
            conflict: true,
          });
          try {
            window.dispatchEvent(
              new CustomEvent('offline-conflict', {
                detail: {
                  queueId: item.id,
                  localFormId: item.payload?.localFormId,
                  localData: item.payload?.data,
                  serverData: err?.serverData || err?.formulario?.datos,
                  serverVersion: err?.serverVersion,
                  localUpdatedAt: item.payload?.data?.updatedAt,
                  serverUpdatedAt: err?.updatedAt || err?.formulario?.fechaModificacion,
                },
              })
            );
          } catch {
            // SSR / no window
          }
        } else {
          const isNetwork =
            err?.name === 'TypeError' ||
            /failed to fetch|networkerror|load failed|aborted/i.test(
              String(err?.message || '')
            );
          if (isNetwork) {
            markConnectivityLost('sync_fetch_failed');
          }
          await markQueue(item.id, {
            status: 'error',
            retryCount,
            lastError: err?.message || 'sync_failed',
            authRequired: isAuth || undefined,
          });
          offlineLog('SYNC_FAILED', { id: item.id, error: err?.message });
          if (!isAuth) {
            scheduleRetry(backoffDelay(retryCount));
          }
          if (isNetwork) break; // no seguir drenando sin red real
        }
        failed += 1;
        if (isAuth) break;
      }
    }

    const summary = await getSyncStatusSummary();
    await setMetadata('lastSyncAt', new Date().toISOString());
    setAutosaveUiStatus({
      state: summary.totalPending > 0 ? 'pending' : 'synced',
      pendingCount: summary.totalPending,
      message:
        summary.totalPending > 0
          ? `Hay ${summary.totalPending} cambios pendientes`
          : 'Sincronizado',
    });
    return { ok: failed === 0, success, failed, summary };
  } finally {
    syncing = false;
  }
}

function scheduleRetry(ms) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncPendingChanges().catch(() => {});
  }, ms);
}

export async function retryFailedSync() {
  const items = await offlineDb.sync_queue.where('status').equals('error').toArray();
  for (const item of items) {
    await markQueue(item.id, { status: 'pending' });
  }
  return syncPendingChanges({ force: true });
}

export async function getSyncStatus() {
  return getSyncStatusSummary();
}

export function startSyncOnReconnect() {
  const onOnline = () => {
    checkConnectivity().then((ok) => {
      if (ok) syncPendingChanges().catch(() => {});
    });
  };
  window.addEventListener('online', onOnline);
  // Primer intento
  setTimeout(() => {
    syncPendingChanges().catch(() => {});
  }, 2000);
  return () => window.removeEventListener('online', onOnline);
}
