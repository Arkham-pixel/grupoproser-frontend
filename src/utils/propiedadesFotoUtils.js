import { isStoredFileReference } from './storedFilePath.js';

/** Máximo de fotos por sección (cocina, sala, alcoba N, etc.) */
export const MAX_FOTOS_POR_SECCION = 15;

/** Máximo total de fotos en todo el formulario */
export const MAX_FOTOS_TOTAL = 120;

/** Tamaño máximo por archivo antes de comprimir (MB) */
export const MAX_FOTO_TAMANO_MB = 8;

export const FOTO_COMPRESION_OPCIONES = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  maxSizeKB: 500,
};

export const AREAS_FOTOS_ANIDADAS = ['alcobas', 'banosAlcobas', 'closetsAlcobas'];

export const esAreaFotosAnidada = (area) => AREAS_FOTOS_ANIDADAS.includes(area);

export function contarFotosEnLista(fotos) {
  return Array.isArray(fotos) ? fotos.length : 0;
}

export function contarFotosEnSeccion(fotosAreas, area, alcobaNum = null) {
  if (!fotosAreas) return 0;
  if (esAreaFotosAnidada(area) && alcobaNum != null) {
    return contarFotosEnLista(fotosAreas[area]?.[alcobaNum]);
  }
  return contarFotosEnLista(fotosAreas[area]);
}

export function contarFotosTotales(fotosAreas) {
  if (!fotosAreas || typeof fotosAreas !== 'object') return 0;
  let total = 0;
  for (const [area, fotos] of Object.entries(fotosAreas)) {
    if (esAreaFotosAnidada(area) && fotos && typeof fotos === 'object' && !Array.isArray(fotos)) {
      for (const lista of Object.values(fotos)) {
        total += contarFotosEnLista(lista);
      }
    } else {
      total += contarFotosEnLista(fotos);
    }
  }
  return total;
}

export async function normalizarFotoParaEnvio(foto) {
  if (!foto || typeof foto !== 'object') return null;

  const base = {
    id: foto.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    nombre: foto.nombre || 'imagen',
    descripcion: foto.descripcion || '',
  };

  if (foto.archivo && foto.archivo instanceof File) {
    return { ...base, archivo: foto.archivo };
  }

  if (isStoredFileReference(foto.ruta)) {
    return {
      ...base,
      ruta: foto.ruta,
      tamaño: foto.tamaño,
      tipoMime: foto.tipoMime,
    };
  }

  if (foto.base64 && !foto.ruta) {
    return { ...base, base64: foto.base64 };
  }

  if (foto.url && foto.url.startsWith('blob:')) {
    try {
      const response = await fetch(foto.url);
      const blob = await response.blob();
      const file = new File([blob], base.nombre || 'imagen.jpg', {
        type: blob.type || 'image/jpeg',
      });
      return { ...base, archivo: file };
    } catch {
      return base;
    }
  }

  return base;
}

export async function prepararFotosAreasParaGuardar(fotosAreas) {
  const resultado = {};

  for (const [area, fotos] of Object.entries(fotosAreas || {})) {
    if (esAreaFotosAnidada(area)) {
      resultado[area] = {};
      for (const [clave, lista] of Object.entries(fotos || {})) {
        const normalizadas = await Promise.all(
          (lista || []).map((f) => normalizarFotoParaEnvio(f))
        );
        resultado[area][clave] = normalizadas.filter(Boolean);
      }
    } else {
      const normalizadas = await Promise.all(
        (fotos || []).map((f) => normalizarFotoParaEnvio(f))
      );
      resultado[area] = normalizadas.filter(Boolean);
    }
  }

  return resultado;
}
