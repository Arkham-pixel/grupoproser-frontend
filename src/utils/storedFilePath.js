/**
 * Referencias de archivos persistidas en MongoDB (S3 o disco legacy).
 * Alineado con normalizeStoredFileReference del backend.
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

/** Normaliza rutas S3 corruptas (/s3:..., s3:////...) antes de guardar o descargar. */
export function normalizeStoredFileReference(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') return '';
  let url = storedPath.trim();
  if (!url || url.startsWith('data:')) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      const ref = parsed.searchParams.get('ref');
      if (ref) return normalizeStoredFileReference(ref);

      const pathname = decodeURIComponent(parsed.pathname || '');
      if (/^\/?s3:/i.test(pathname)) {
        return normalizeStoredFileReference(pathname);
      }

      if (pathname.startsWith('/uploads/')) {
        return pathname.replace(/\/{2,}/g, '/');
      }

      return url;
    } catch {
      return url;
    }
  }

  if (/^\/?s3:/i.test(url)) {
    url = url.replace(/^\//, '');
    if (url.toLowerCase().startsWith('s3://')) {
      const key = url.slice(5).replace(/^\/+/, '');
      return key ? `s3:${key}` : '';
    }
    if (url.toLowerCase().startsWith('s3:')) {
      const key = url.slice(3).replace(/^\/+/, '');
      return key ? `s3:${key}` : '';
    }
  }

  if (url.startsWith('uploads/')) {
    return `/${url.replace(/\/{2,}/g, '/')}`;
  }
  if (url.startsWith('/uploads/')) {
    return url.replace(/\/{2,}/g, '/');
  }

  if (url.startsWith('/api/storage/file')) return '';

  if (!url.startsWith('/')) {
    url = `/${url}`;
  }
  return url.replace(/\/{2,}/g, '/');
}
