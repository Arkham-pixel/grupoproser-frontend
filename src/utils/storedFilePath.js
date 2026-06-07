/**
 * Referencias de archivos persistidas en MongoDB (S3 o disco legacy).
 * Alineado con isStoredFileReference del backend.
 */
export function isStoredFileReference(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) return false;
  if (trimmed.startsWith('s3:') || trimmed.startsWith('s3://')) return true;
  if (trimmed.startsWith('/uploads/')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  return false;
}
