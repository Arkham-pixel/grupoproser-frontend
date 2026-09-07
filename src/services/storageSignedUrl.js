/**
 * URLs firmadas S3 a nivel plataforma.
 * Evita saturar el proxy /api/storage/file al ver/descargar archivos.
 *
 * Flujo: ref s3:… → GET /api/storage/signed-url → URL directa a S3/CDN
 * Fallback: proxy (HEIC, legacy, error de firma).
 */

import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';
import { authFetch } from './authFetch.js';
import { isStoredFileReference } from '../utils/storedFilePath.js';

const cache = new Map();
/** Renovar un poco antes de que expire la firma (segundos). */
const MARGEN_EXPIRACION_S = 120;

function claveCache(ref) {
  return String(ref || '').trim();
}

function esUrlLocalInstantanea(ref) {
  const s = String(ref || '');
  return s.startsWith('blob:') || s.startsWith('data:');
}

function esUrlHttpAbsoluta(ref) {
  return /^https?:\/\//i.test(String(ref || ''));
}

/**
 * Resuelve una referencia de archivo a una URL usable en el navegador.
 * @param {string} ref - s3:…, /uploads/…, http(s), blob, data
 * @returns {Promise<string|null>}
 */
export async function resolverUrlArchivo(ref) {
  const raw = String(ref || '').trim();
  if (!raw) return null;

  if (esUrlLocalInstantanea(raw)) return raw;

  // Proxy ya armado o URL absoluta no-storage: devolver tal cual
  if (esUrlHttpAbsoluta(raw) && !raw.includes('/api/storage/file')) {
    return raw;
  }

  const key = claveCache(raw);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() && hit.url) {
    return hit.url;
  }

  const proxyFallback = () => {
    if (raw.includes('/api/storage/file')) return raw;
    return resolveUploadsUrl(raw) || null;
  };

  try {
    const refParam = raw.includes('/api/storage/file')
      ? new URL(raw, BASE_URL).searchParams.get('ref') || raw
      : raw;

    const res = await authFetch(
      `${BASE_URL}/api/storage/signed-url?ref=${encodeURIComponent(refParam)}`
    );
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.url) {
      return proxyFallback();
    }

    const url = String(payload.url);
    const expiresIn = Number(payload.expiresIn);
    const ttlMs = Number.isFinite(expiresIn) && expiresIn > 0
      ? Math.max(30_000, (expiresIn - MARGEN_EXPIRACION_S) * 1000)
      : 30 * 60 * 1000;

    cache.set(key, { url, expiresAt: Date.now() + ttlMs });
    return url;
  } catch (err) {
    console.warn('⚠️ resolverUrlArchivo fallback proxy:', err?.message || err);
    return proxyFallback();
  }
}

/**
 * Abre/descarga un archivo por referencia (archiveros).
 * Usa URL firmada; no pasa el binario por el API.
 */
export async function abrirODescargarArchivo(ref, { nombre } = {}) {
  const url = await resolverUrlArchivo(ref);
  if (!url) throw new Error('No se pudo resolver la URL del archivo');

  // Navegación directa: no requiere CORS en el bucket
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  if (nombre) a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}

/**
 * Para refs de imagen en galerías: prioriza firma; blob/data al instante.
 * Acepta objeto foto { preview, ruta, … } o string.
 */
export async function resolverUrlImagen(imagenORef) {
  if (!imagenORef) return null;
  if (typeof imagenORef === 'string') {
    if (esUrlLocalInstantanea(imagenORef)) return imagenORef;
    return resolverUrlArchivo(imagenORef);
  }
  if (imagenORef.preview && typeof imagenORef.preview === 'string') {
    return imagenORef.preview;
  }
  if (imagenORef.url && esUrlLocalInstantanea(imagenORef.url)) {
    return imagenORef.url;
  }
  if (imagenORef.base64 && typeof imagenORef.base64 === 'string') {
    return imagenORef.base64;
  }
  if (imagenORef.ruta) {
    return resolverUrlArchivo(imagenORef.ruta);
  }
  if (isStoredFileReference(imagenORef)) {
    return resolverUrlArchivo(String(imagenORef));
  }
  return null;
}

export function invalidarCacheUrlArchivo(ref) {
  if (!ref) {
    cache.clear();
    return;
  }
  cache.delete(claveCache(ref));
}
