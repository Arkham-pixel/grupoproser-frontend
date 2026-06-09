/**
 * Nombre seguro para subidas multipart/S3 (solo ASCII).
 * Tildes y ñ en originalname rompen la firma SigV4 de S3 si no se codifican en metadatos.
 */
export function sanitizeUploadFileName(name, fallback = 'archivo') {
  const raw = String(name || fallback).trim() || fallback;
  const lastDot = raw.lastIndexOf('.');
  const ext = lastDot > 0 ? raw.slice(lastDot) : '';
  const stem = lastDot > 0 ? raw.slice(0, lastDot) : raw;
  const safeStem =
    stem
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 120) || fallback;
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '') || '';
  return `${safeStem}${safeExt}`;
}

/**
 * Añade archivo o blob a FormData con nombre seguro para el backend/S3.
 */
export function appendUploadFile(formData, fieldName, fileOrBlob, nameOrFallback = 'archivo') {
  const fallback = typeof nameOrFallback === 'string' ? nameOrFallback : 'archivo';
  const sourceName =
    fileOrBlob instanceof File
      ? fileOrBlob.name
      : typeof nameOrFallback === 'string'
        ? nameOrFallback
        : fallback;
  const safeName = sanitizeUploadFileName(sourceName, fallback);
  formData.append(fieldName, fileOrBlob, safeName);
}
