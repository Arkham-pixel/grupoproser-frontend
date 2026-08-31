import { getImageUrl } from '../../utils/imageUtils';
import { isStoredFileReference } from '../../utils/storedFilePath';
import { asegurarJpeg, esArchivoImagen } from '../../utils/heicToJpeg.js';

export function imagenYaPersistida(imagen) {
  if (!imagen || typeof imagen !== 'object') return false;
  return isStoredFileReference(imagen.ruta);
}

export function imagenNecesitaSubida(imagen) {
  if (!imagen || typeof imagen !== 'object') return false;
  if (imagenYaPersistida(imagen)) return false;
  if (imagen.file instanceof File) return true;
  if (typeof imagen.src === 'string' && imagen.src.startsWith('data:')) return true;
  return false;
}

export function crearImagenPendiente(file) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    file,
    preview: URL.createObjectURL(file),
    nombre: file.name,
    descripcion: '',
  };
}

export function getPuertosImagenDisplayUrl(imagen) {
  if (!imagen) return null;
  const url = getImageUrl(imagen);
  if (url) return url;
  if (imagen.preview) return imagen.preview;
  if (
    typeof imagen.src === 'string' &&
    (imagen.src.startsWith('data:') || imagen.src.startsWith('blob:'))
  ) {
    return imagen.src;
  }
  return null;
}

function dataUrlToFile(dataUrl, filename = 'imagen.jpg') {
  const [header, base64] = dataUrl.split(',');
  const mime = header?.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

/** Reduce fotos grandes antes de subirlas a S3 (más rápido y menos cuelgues). */
export async function comprimirImagenParaSubida(file, { maxAncho = 1600, calidad = 0.82, umbralBytes = 350 * 1024 } = {}) {
  if (!(file instanceof File) || !esArchivoImagen(file)) return file;
  const listo = await asegurarJpeg(file);
  if (listo.size <= umbralBytes) return listo;
  if (typeof document === 'undefined') return listo;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(listo);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= maxAncho && listo.size <= umbralBytes * 2) {
        resolve(listo);
        return;
      }
      if (width > maxAncho) {
        height = Math.round((height * maxAncho) / width);
        width = maxAncho;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(listo);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(listo);
            return;
          }
          const nombre = (listo.name || 'imagen.jpg').replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], nombre, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        calidad
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(listo);
    };
    img.src = objectUrl;
  });
}

export async function prepararFileDesdeImagen(imagen) {
  if (!imagen) return null;
  let file = null;
  if (imagen.file instanceof File) {
    file = imagen.file;
  } else if (typeof imagen.src === 'string' && imagen.src.startsWith('data:')) {
    file = dataUrlToFile(imagen.src, imagen.nombre || 'imagen.jpg');
  }
  if (!file) return null;
  return comprimirImagenParaSubida(file);
}

export function serializarImagenPersistida(imagen) {
  if (!imagen || !isStoredFileReference(imagen.ruta)) return null;
  return {
    id: imagen.id,
    ruta: imagen.ruta,
    nombre: imagen.nombre || '',
    descripcion: imagen.descripcion || '',
    tamaño: imagen.tamaño,
    tipoMime: imagen.tipoMime,
  };
}

export function normalizarImagenCargada(imagen) {
  if (!imagen || typeof imagen !== 'object') return imagen;
  const normalizada = {
    id: imagen.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ruta: imagen.ruta,
    nombre: imagen.nombre || '',
    descripcion: imagen.descripcion || '',
    tamaño: imagen.tamaño,
    tipoMime: imagen.tipoMime,
  };
  if (isStoredFileReference(normalizada.ruta)) {
    return normalizada;
  }
  if (imagen.src) {
    normalizada.src = imagen.src;
  }
  if (!normalizada.src && imagen.preview && typeof imagen.preview === 'string') {
    normalizada.preview = imagen.preview;
  }
  return normalizada;
}
