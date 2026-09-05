import { asegurarJpeg, esHeic } from './heicToJpeg.js';

/**
 * Compresión para subidas: siempre JPEG.
 * PNG/WebP con canvas.toBlob ignoran `quality` y no bajan de peso (capturas enormes → timeout S3).
 */
function nombreJpeg(file) {
  const original = String(file?.name || 'foto.jpg').trim() || 'foto.jpg';
  const sinExt = original.replace(/\.[^.]+$/i, '') || 'foto';
  return `${sinExt}.jpg`;
}

function blobAFile(blob, fileName) {
  return new File([blob], fileName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar la imagen'));
    };
    img.src = url;
  });
}

function dimensionesObjetivo(width, height, maxWidth, maxHeight) {
  let w = width;
  let h = height;
  if (w > maxWidth) {
    h = (h * maxWidth) / w;
    w = maxWidth;
  }
  if (h > maxHeight) {
    w = (w * maxHeight) / h;
    h = maxHeight;
  }
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
}

function canvasAJpegBlob(img, width, height, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas no disponible'));
      return;
    }
    // Fondo blanco: PNG con alpha → JPEG sin franjas negras
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Error al comprimir la imagen'));
        else resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

export class ImageCompression {
  /**
   * @param {File} file
   * @param {number} maxWidth
   * @param {number} maxHeight
   * @param {number} quality
   * @param {number} maxSizeKB
   * @returns {Promise<File>}
   */
  static async compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8, maxSizeKB = 500) {
    if (!file) return file;

    const listo = esHeic(file) ? await asegurarJpeg(file) : file;
    const img = await cargarImagen(listo);
    const { width, height } = dimensionesObjetivo(img.width, img.height, maxWidth, maxHeight);
    const fileName = nombreJpeg(listo);

    let q = Math.min(0.92, Math.max(0.35, quality));
    let blob = await canvasAJpegBlob(img, width, height, q);
    let guard = 0;

    while (blob.size / 1024 > maxSizeKB && q > 0.35 && guard < 6) {
      q = Math.max(0.35, q - 0.12);
      blob = await canvasAJpegBlob(img, width, height, q);
      guard += 1;
    }

    // Si aún pesa mucho, bajar resolución
    if (blob.size / 1024 > maxSizeKB && (width > 1280 || height > 720)) {
      const smaller = dimensionesObjetivo(img.width, img.height, 1280, 720);
      blob = await canvasAJpegBlob(img, smaller.width, smaller.height, Math.min(q, 0.72));
    }

    return blobAFile(blob, fileName);
  }

  static async compressImages(files, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      maxSizeKB = 500,
    } = options;

    const compressedFiles = [];
    for (const file of files) {
      try {
        compressedFiles.push(
          await this.compressImage(file, maxWidth, maxHeight, quality, maxSizeKB)
        );
      } catch (error) {
        console.error(`❌ Error comprimiendo ${file?.name}:`, error);
        try {
          compressedFiles.push(await asegurarJpeg(file));
        } catch {
          compressedFiles.push(file);
        }
      }
    }
    return compressedFiles;
  }

  static needsCompression(file, maxSizeKB = 500) {
    if (!file) return false;
    const type = String(file.type || '').toLowerCase();
    if (type === 'image/png' || type === 'image/webp' || type === 'image/bmp') return true;
    return file.size / 1024 > maxSizeKB;
  }

  static async getImageInfo(file) {
    const listo = esHeic(file) ? await asegurarJpeg(file) : file;
    const img = await cargarImagen(listo);
    return {
      width: img.width,
      height: img.height,
      sizeKB: (listo.size / 1024).toFixed(1),
      aspectRatio: (img.width / img.height).toFixed(2),
    };
  }
}
