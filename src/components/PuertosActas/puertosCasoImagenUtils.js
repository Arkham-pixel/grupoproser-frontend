import { getImageUrl } from '../../utils/imageUtils';
import { isStoredFileReference } from '../../utils/storedFilePath';

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

export function imagenNecesitaSubida(imagen) {
  if (!imagen || typeof imagen !== 'object') return false;
  if (imagen.file instanceof File) return true;
  if (typeof imagen.src === 'string' && imagen.src.startsWith('data:')) return true;
  return false;
}

export async function prepararFileDesdeImagen(imagen) {
  if (!imagen) return null;
  if (imagen.file instanceof File) return imagen.file;
  if (typeof imagen.src === 'string' && imagen.src.startsWith('data:')) {
    const res = await fetch(imagen.src);
    const blob = await res.blob();
    return new File([blob], imagen.nombre || 'imagen.jpg', {
      type: blob.type || 'image/jpeg',
    });
  }
  return null;
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
  return {
    id: imagen.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ruta: imagen.ruta,
    nombre: imagen.nombre || '',
    descripcion: imagen.descripcion || '',
    tamaño: imagen.tamaño,
    tipoMime: imagen.tipoMime,
    src: imagen.src,
  };
}
