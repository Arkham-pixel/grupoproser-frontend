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
