/**
 * Convierte fotos HEIC/HEIF (iPhone) a JPEG para que Chrome, Edge,
 * Word y la galería las puedan mostrar.
 */

export const ACCEPT_ARCHIVOS_IMAGEN =
  'image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif';

/** accept de <input type="file">: image/* en Windows no lista HEIC. */
export const ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA =
  'image/*,.heic,.heif,image/heic,image/heif';

const HEIC_EXT = /\.hei[cf]$/i;
const IMAGEN_EXT = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i;

export function esHeic(fileOrName, mime = '') {
  const name =
    typeof fileOrName === 'string'
      ? fileOrName
      : fileOrName?.name || fileOrName?.nombreOriginal || fileOrName?.nombre || '';
  const type = String(
    mime ||
      (typeof fileOrName === 'object' ? fileOrName?.type || fileOrName?.tipoMime || '' : '')
  ).toLowerCase();
  return type.includes('heic') || type.includes('heif') || HEIC_EXT.test(name);
}

export function esArchivoImagen(fileOrName) {
  const name =
    typeof fileOrName === 'string'
      ? fileOrName
      : fileOrName?.name || fileOrName?.nombreOriginal || fileOrName?.nombre || '';
  const type = String(
    typeof fileOrName === 'object' ? fileOrName?.type || fileOrName?.tipoMime || '' : ''
  ).toLowerCase();
  if (type.startsWith('image/')) return true;
  return IMAGEN_EXT.test(name);
}

export function nombreJpegDesdeHeic(nombre) {
  const raw = String(nombre || 'foto.heic').trim() || 'foto.heic';
  if (HEIC_EXT.test(raw)) return raw.replace(HEIC_EXT, '.jpg');
  if (/\.jpe?g$/i.test(raw)) return raw;
  const sinExt = raw.replace(/\.[^.]+$/, '');
  return `${sinExt || 'foto'}.jpg`;
}

function blobAJpegViaCanvas(blob, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) {
          URL.revokeObjectURL(url);
          reject(new Error('HEIC sin dimensiones'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas no disponible'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (out) => {
            URL.revokeObjectURL(url);
            if (!out) reject(new Error('No se pudo generar JPEG'));
            else resolve(out);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('El navegador no pudo leer el HEIC'));
    };
    img.src = url;
  });
}

async function blobAJpegConWasm(blob, quality = 0.88) {
  const mod = await import('heic-to/csp');
  const heicTo = mod.heicTo || mod.default?.heicTo;
  if (typeof heicTo !== 'function') {
    throw new Error('heic-to no disponible');
  }
  const jpeg = await heicTo({
    blob,
    type: 'image/jpeg',
    quality,
  });
  return jpeg;
}

export function esHeicBytes(bytes) {
  if (!bytes || bytes.length < 12) return false;
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const brand = String.fromCharCode(b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11]);
  return brand.startsWith('ftyp') && /hei[cfx]|mif1|msf1|hevc/i.test(brand.slice(4));
}

/**
 * Devuelve un File JPEG. Si no es HEIC, retorna el mismo archivo.
 */
export async function asegurarJpeg(file) {
  if (!file) return file;
  if (!esHeic(file)) return file;

  const blobFuente = file instanceof Blob ? file : null;
  if (!blobFuente) return file;

  let jpegBlob = null;
  try {
    jpegBlob = await blobAJpegViaCanvas(blobFuente);
  } catch {
    try {
      jpegBlob = await blobAJpegConWasm(blobFuente);
    } catch (err) {
      console.warn('No se pudo convertir HEIC en el navegador:', err);
      return file;
    }
  }

  if (!jpegBlob) return file;
  const nombre = nombreJpegDesdeHeic(file.name || 'foto.heic');
  return new File([jpegBlob], nombre, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

/**
 * Si los bytes son HEIC, los convierte a JPEG. JPEG/PNG se dejan igual.
 */
export async function jpegDesdeBytesImagen(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xd8) return u8;
  if (u8.length >= 8 && u8[0] === 0x89 && u8[1] === 0x50) return u8;
  if (!esHeicBytes(u8)) return u8;
  const file = new File([u8], 'foto.heic', { type: 'image/heic' });
  const jpeg = await asegurarJpeg(file);
  const out = new Uint8Array(await jpeg.arrayBuffer());
  if (out.length >= 2 && out[0] === 0xff && out[1] === 0xd8) return out;
  return u8;
}
