/**
 * Descarga bytes de imagen para armar Word/Excel en el navegador.
 *
 * Importante: las URL firmadas de S3 NO deben llevar header Authorization.
 * Si se manda Bearer, el navegador hace preflight OPTIONS y S3 responde sin
 * Access-Control-Allow-Origin → CORS + Word colgado en "Generando…".
 */

function esUrlFirmadaS3(url) {
  const u = String(url || '');
  return (
    /[?&]X-Amz-Algorithm=/i.test(u) ||
    /\.amazonaws\.com/i.test(u) ||
    /\.cloudfront\.net/i.test(u)
  );
}

function esCabeceraImagen(bytes) {
  if (!bytes || bytes.length < 3) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true; // jpeg
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return true; // png
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return true; // gif
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return true; // webp/riff
  return false;
}

/**
 * @param {string} url
 * @returns {Promise<{ bytes: Uint8Array, contentType: string }|null>}
 */
export async function fetchBytesImagenUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return null;

  const firmadaS3 = esUrlFirmadaS3(url);
  const headers = {};
  // Solo autenticar proxy/backend propio — nunca S3 firmado
  if (!firmadaS3) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      mode: 'cors',
      credentials: firmadaS3 ? 'omit' : 'same-origin',
      signal: AbortSignal.timeout(firmadaS3 ? 15_000 : 8_000),
    });
    if (!response.ok) return null;
    const buf = await response.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length < 32) return null;
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (
      !esCabeceraImagen(bytes) &&
      contentType &&
      !contentType.startsWith('image/') &&
      !contentType.includes('octet-stream')
    ) {
      return null;
    }
    return { bytes, contentType };
  } catch {
    return null;
  }
}

export { esUrlFirmadaS3, esCabeceraImagen };
