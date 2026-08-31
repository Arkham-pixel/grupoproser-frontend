/**
 * Fotos / adjuntos offline: comprimir, guardar Blob, encolar upload.
 */
import {
  savePhotoLocally,
  saveAttachmentLocally,
  newClientId,
} from './offlineDatabase.js';
import {
  OFFLINE_PHOTO_MAX_EDGE,
  OFFLINE_ATTACHMENT_MAX_BYTES,
} from '../config/autoSaveConfig.js';
import { offlineLog } from '../offline/offlineLog.js';
import { asegurarJpeg, esArchivoImagen } from '../utils/heicToJpeg.js';

function loadImageBitmap(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Comprime imagen a JPEG (lado mayor <= maxEdge).
 */
export async function compressImageFile(file, { maxEdge = OFFLINE_PHOTO_MAX_EDGE, quality = 0.72 } = {}) {
  if (!file || !esArchivoImagen(file)) {
    return { blob: file, fileName: file?.name, mimeType: file?.type, originalSize: file?.size || 0, optimizedSize: file?.size || 0 };
  }
  const originalSize = file.size || 0;
  try {
    const listo = await asegurarJpeg(file);
    const img = await loadImageBitmap(listo);
    let { width, height } = img;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    );
    const optimizedSize = blob?.size || originalSize;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[photo-compress]', { originalSize, optimizedSize, width, height });
    }
    return {
      blob: blob || file,
      fileName: (file.name || 'photo').replace(/\.\w+$/, '.jpg'),
      mimeType: 'image/jpeg',
      originalSize,
      optimizedSize,
    };
  } catch {
    return { blob: file, fileName: file.name, mimeType: file.type, originalSize, optimizedSize: originalSize };
  }
}

export async function queueOfflinePhoto({
  file,
  caseId,
  formId,
  latitude,
  longitude,
}) {
  const compressed = await compressImageFile(file);
  const id = newClientId();
  const record = await savePhotoLocally({
    id,
    caseId: caseId || '',
    formId: formId || '',
    blob: compressed.blob,
    fileName: compressed.fileName,
    mimeType: compressed.mimeType,
    size: compressed.optimizedSize,
    originalSize: compressed.originalSize,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    syncStatus: 'pending',
  });
  offlineLog('PHOTO_QUEUED', { id, size: compressed.optimizedSize });
  return record;
}

export async function queueOfflineAttachment({ file, caseId, formId }) {
  if (!file) throw new Error('Archivo requerido');
  if (file.size > OFFLINE_ATTACHMENT_MAX_BYTES) {
    const mb = (OFFLINE_ATTACHMENT_MAX_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(`El archivo supera el límite offline (${mb} MB). Conéctate para subirlo.`);
  }
  const id = newClientId();
  return saveAttachmentLocally({
    id,
    caseId: caseId || '',
    formId: formId || '',
    blob: file,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    syncStatus: 'pending',
  });
}

export async function uploadPendingPhotos() {
  const { syncPendingChanges } = await import('./syncService.js');
  return syncPendingChanges({ force: true });
}

export async function uploadPendingAttachments() {
  const { syncPendingChanges } = await import('./syncService.js');
  return syncPendingChanges({ force: true });
}
