/**
 * API de alto nivel sobre Dexie para formularios / cola / fotos.
 */
import { offlineDb } from '../offline/db.js';
import { offlineLog } from '../offline/offlineLog.js';

export function newClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function stripHeavyBase64(value, depth = 0) {
  if (depth > 12 || value == null) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:image') && value.length > 50_000) {
      return '[omitted-data-url]';
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => stripHeavyBase64(v, depth + 1));
  }
  if (typeof value === 'object') {
    if (value instanceof Blob || value instanceof File) return value;
    const out = {};
    Object.keys(value).forEach((k) => {
      out[k] = stripHeavyBase64(value[k], depth + 1);
    });
    return out;
  }
  return value;
}

/**
 * Guarda o actualiza un formulario en IndexedDB.
 * @returns {Promise<object>} registro guardado
 */
export async function saveFormLocally({
  id,
  caseId = '',
  formType,
  data,
  version = 1,
  historialId = null,
  syncStatus = 'pending',
}) {
  const formId = id || newClientId();
  const now = new Date().toISOString();
  const safeData = stripHeavyBase64(data);
  const existing = await offlineDb.forms.get(formId);
  const record = {
    id: formId,
    clientId: existing?.clientId || formId,
    caseId: caseId || existing?.caseId || '',
    formType: formType || existing?.formType || 'unknown',
    data: safeData,
    updatedAt: now,
    version: Number(existing?.version || version) || 1,
    dataVersion: Number(existing?.dataVersion ?? version) || 1,
    syncStatus,
    historialId: historialId || existing?.historialId || null,
    createdAt: existing?.createdAt || now,
  };
  await offlineDb.forms.put(record);
  offlineLog('LOCAL_SAVE', { formId, formType: record.formType, syncStatus });
  return record;
}

export async function loadLocalData(formId) {
  if (!formId) return null;
  return offlineDb.forms.get(formId);
}

export async function findLocalFormByHistorialId(historialId) {
  if (!historialId) return null;
  return offlineDb.forms.where('historialId').equals(String(historialId)).first().catch(async () => {
    const all = await offlineDb.forms.toArray();
    return all.find((f) => String(f.historialId) === String(historialId)) || null;
  });
}

export async function findLocalFormsByCaseAndType(caseId, formType) {
  const all = await offlineDb.forms.toArray();
  return all.filter(
    (f) =>
      (!caseId || String(f.caseId) === String(caseId)) &&
      (!formType || f.formType === formType)
  );
}

/**
 * Encola operación de sincronización (idempotente por operationId).
 */
export async function queueSync({
  entityType,
  entityId,
  operation,
  payload,
  operationId = null,
}) {
  const opId = operationId || newClientId();
  const existing = await offlineDb.sync_queue
    .where('id')
    .equals(opId)
    .first()
    .catch(() => null);

  // Deduplicar UPDATE del mismo entityId pendiente: actualizar payload
  if (operation === 'UPDATE' && entityId) {
    const pendingSame = await offlineDb.sync_queue
      .where('status')
      .anyOf(['pending', 'error'])
      .filter(
        (row) =>
          row.entityType === entityType &&
          String(row.entityId) === String(entityId) &&
          row.operation === 'UPDATE'
      )
      .toArray();
    if (pendingSame.length) {
      const keep = pendingSame[0];
      await offlineDb.sync_queue.update(keep.id, {
        payload,
        createdAt: keep.createdAt,
        updatedAt: new Date().toISOString(),
        status: 'pending',
      });
      for (let i = 1; i < pendingSame.length; i += 1) {
        await offlineDb.sync_queue.delete(pendingSame[i].id);
      }
      offlineLog('QUEUE_CREATED', { operationId: keep.id, deduped: true, entityType, entityId });
      return keep.id;
    }
  }

  const row = {
    id: opId,
    operationId: opId,
    entityType,
    entityId: String(entityId || ''),
    operation,
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    retryCount: existing?.retryCount || 0,
    lastAttempt: null,
    status: 'pending',
  };
  await offlineDb.sync_queue.put(row);
  offlineLog('QUEUE_CREATED', { operationId: opId, entityType, entityId, operation });
  return opId;
}

export async function getPendingQueueCount() {
  return offlineDb.sync_queue
    .where('status')
    .anyOf(['pending', 'error', 'syncing'])
    .count();
}

export async function getPendingQueueItems() {
  return offlineDb.sync_queue
    .where('status')
    .anyOf(['pending', 'error', 'syncing'])
    .sortBy('createdAt');
}

/** Descarta cola pendiente de un formulario local (p. ej. usuario eligió versión servidor). */
export async function discardPendingForForm(localFormId) {
  if (!localFormId) return 0;
  const items = await offlineDb.sync_queue
    .where('status')
    .anyOf(['pending', 'error', 'syncing'])
    .toArray();
  let n = 0;
  for (const item of items) {
    const match =
      String(item.entityId) === String(localFormId) ||
      String(item.payload?.localFormId || '') === String(localFormId);
    if (match && item.entityType === 'form') {
      await offlineDb.sync_queue.delete(item.id);
      n += 1;
    }
  }
  return n;
}

export async function getSyncStatusSummary() {
  const items = await offlineDb.sync_queue.toArray();
  const photos = await offlineDb.photos.where('syncStatus').anyOf(['pending', 'error']).count();
  const attachments = await offlineDb.attachments
    .where('syncStatus')
    .anyOf(['pending', 'error'])
    .count();
  const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing');
  const errors = items.filter((i) => i.status === 'error');
  return {
    pendingChanges: pending.length,
    errorChanges: errors.length,
    pendingPhotos: photos,
    pendingAttachments: attachments,
    totalPending: pending.length + photos + attachments,
    lastSyncAt: (await offlineDb.metadata.get('lastSyncAt'))?.value || null,
  };
}

export async function setMetadata(key, value) {
  await offlineDb.metadata.put({ key, value, updatedAt: new Date().toISOString() });
}

export async function getMetadata(key) {
  const row = await offlineDb.metadata.get(key);
  return row?.value;
}

export async function saveCaseLocally(caseRecord) {
  const id = caseRecord.id || newClientId();
  const record = {
    ...caseRecord,
    id,
    updatedAt: new Date().toISOString(),
    version: Number(caseRecord.version) || 1,
  };
  await offlineDb.cases.put(record);
  return record;
}

export async function savePhotoLocally(photo) {
  const id = photo.id || newClientId();
  const record = {
    syncStatus: 'pending',
    createdAt: new Date().toISOString(),
    ...photo,
    id,
  };
  await offlineDb.photos.put(record);
  offlineLog('PHOTO_QUEUED', { id, formId: record.formId });
  await queueSync({
    entityType: 'photo',
    entityId: id,
    operation: 'UPLOAD_PHOTO',
    payload: { photoId: id, formId: record.formId, caseId: record.caseId },
    operationId: `photo_${id}`,
  });
  return record;
}

export async function saveAttachmentLocally(att) {
  const id = att.id || newClientId();
  const record = {
    syncStatus: 'pending',
    createdAt: new Date().toISOString(),
    ...att,
    id,
  };
  await offlineDb.attachments.put(record);
  offlineLog('ATTACHMENT_QUEUED', { id });
  await queueSync({
    entityType: 'attachment',
    entityId: id,
    operation: 'UPLOAD_ATTACHMENT',
    payload: { attachmentId: id, formId: record.formId, caseId: record.caseId },
    operationId: `att_${id}`,
  });
  return record;
}

export async function estimateStorage() {
  if (!navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return {
    usage: est.usage || 0,
    quota: est.quota || 0,
    ratio: est.quota ? (est.usage || 0) / est.quota : 0,
  };
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Limpia forms sincronizados más antiguos que retentionDays (nunca pendientes). */
export async function cleanupSyncedForms(retentionDays = 15) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const forms = await offlineDb.forms.toArray();
  for (const f of forms) {
    if (f.syncStatus !== 'synced') continue;
    const t = new Date(f.updatedAt || 0).getTime();
    if (t && t < cutoff) {
      await offlineDb.forms.delete(f.id);
    }
  }
}

export { offlineDb };
