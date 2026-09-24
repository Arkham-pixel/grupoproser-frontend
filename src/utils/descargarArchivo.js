import { saveAs } from 'file-saver';

/**
 * Descarga un Blob/File de forma segura en producción.
 * Evita createObjectURL + revoke inmediato (causa net::ERR_FILE_NOT_FOUND
 * cuando el navegador aún no terminó la descarga o abre el blob en otra pestaña).
 */
export function descargarBlob(blob, nombreArchivo = 'archivo') {
  if (!blob) return;
  saveAs(blob, nombreArchivo);
}

/**
 * Lee bytes desde una blob: URL sin fetch/XHR (CSP connect-src suele bloquear blob:).
 * Usa Image + canvas; solo válido para imágenes.
 */
export async function arrayBufferDesdeBlobUrlImagen(blobUrl) {
  if (!blobUrl || typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) {
    return null;
  }
  const imgEl = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('No se pudo cargar la imagen blob'));
    el.src = blobUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = imgEl.naturalWidth || imgEl.width || 1;
  canvas.height = imgEl.naturalHeight || imgEl.height || 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(imgEl, 0, 0);
  const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!jpegBlob) return null;
  return jpegBlob.arrayBuffer();
}

/**
 * Lee preview local (blob: o data:) sin fetch — seguro bajo CSP en producción.
 * @returns {Promise<Uint8Array|null>}
 */
export async function bytesDesdePreviewLocal(preview) {
  if (!preview || typeof preview !== 'string') return null;
  if (preview.startsWith('data:')) {
    const idx = preview.indexOf('base64,');
    const raw = idx !== -1 ? preview.slice(idx + 7) : null;
    if (!raw) return null;
    try {
      return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    } catch {
      return null;
    }
  }
  if (preview.startsWith('blob:')) {
    try {
      const buf = await arrayBufferDesdeBlobUrlImagen(preview);
      return buf ? new Uint8Array(buf) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Convierte blob: URL de imagen a dataURL (evita fetch bloqueado por CSP).
 */
export async function dataUrlDesdeBlobUrlImagen(blobUrl) {
  const buffer = await arrayBufferDesdeBlobUrlImagen(blobUrl);
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}
