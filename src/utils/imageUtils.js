/**
 * Utilidades centralizadas para manejo de imágenes en todos los formularios
 * 
 * Este módulo proporciona funciones reutilizables para:
 * - Obtener URLs de imágenes con fallbacks automáticos
 * - Verificar si una imagen existe antes de intentar cargarla
 * - Manejar errores de carga de imágenes de manera consistente
 * - Proporcionar mensajes claros cuando las imágenes no están disponibles
 */

import { getUploadsUrlCandidates, isStoredUploadPath } from '../config/apiConfig';
import { debug } from './appLogger.js';

/**
 * Obtiene todas las URLs candidatas para una imagen (con fallbacks)
 * @param {Object|string} imagen - Objeto de imagen o string base64
 * @returns {Array<string>} Array de URLs candidatas en orden de prioridad
 */
export function getImageUrlCandidates(imagen) {
  const candidates = [];
  
  if (!imagen) return candidates;
  
  // String: data/blob, URL pública o ruta almacenada (s3:, /uploads/)
  if (typeof imagen === 'string') {
    if (imagen.startsWith('data:') || imagen.startsWith('blob:')) {
      return [imagen];
    }
    if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
      return [imagen];
    }
    if (isStoredUploadPath(imagen)) {
      return getUploadsUrlCandidates(imagen);
    }
  }
  
  // Si es un objeto
  if (typeof imagen === 'object' && imagen !== null) {
    // Prioridad 1: Preview (blob URL local - para imágenes recién cargadas)
    if (imagen.preview && typeof imagen.preview === 'string') {
      candidates.push(imagen.preview);
    }
    
    // Prioridad 2: URL temporal (blob:) - compatibilidad con código antiguo
    if (imagen.url && typeof imagen.url === 'string') {
      candidates.push(imagen.url);
    }
    
    // Prioridad 3: Base64
    if (imagen.base64 && typeof imagen.base64 === 'string') {
      candidates.push(imagen.base64);
    }
    
    // Prioridad 4: Ruta del servidor (con fallbacks)
    if (imagen.ruta && typeof imagen.ruta === 'string') {
      const rutaCandidates = getUploadsUrlCandidates(imagen.ruta);
      candidates.push(...rutaCandidates);
    }
  }
  
  // Eliminar duplicados manteniendo el orden
  return [...new Set(candidates.filter(Boolean))];
}

/**
 * Obtiene la primera URL disponible para una imagen
 * @param {Object|string} imagen - Objeto de imagen o string base64
 * @returns {string|null} Primera URL disponible o null
 */
export function getImageUrl(imagen) {
  const candidates = getImageUrlCandidates(imagen);
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Descarga una imagen almacenada en servidor/S3 probando URLs candidatas.
 * @returns {Promise<string|null>} data URL o null si ninguna URL respondió.
 */
async function fetchUrlAsArrayBuffer(url) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Descarga un archivo almacenado (s3:, /uploads/, URL) probando candidatos.
 * @param {string} rutaOrUrl - Ruta guardada en BD
 * @returns {Promise<ArrayBuffer|null>}
 */
export async function fetchStoredFileAsArrayBuffer(rutaOrUrl) {
  if (!rutaOrUrl || typeof rutaOrUrl !== 'string') return null;
  if (rutaOrUrl.startsWith('data:')) {
    const base64Data = rutaOrUrl.split(',')[1] || rutaOrUrl;
    return Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)).buffer;
  }
  const candidates = getUploadsUrlCandidates(rutaOrUrl);
  for (const url of candidates) {
    const buffer = await fetchUrlAsArrayBuffer(url);
    if (buffer) return buffer;
  }
  return null;
}

export async function fetchStoredImageAsDataUrl(imagen) {
  const candidates = getImageUrlCandidates(imagen);
  for (const url of candidates) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) continue;
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return dataUrl;
    } catch {
      // Probar siguiente candidato (localhost → producción, etc.)
    }
  }
  return null;
}

/**
 * Verifica si una URL de imagen es válida (no es base64 ni blob)
 * @param {string} url - URL a verificar
 * @returns {boolean} true si es una URL del servidor
 */
export function isServerUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return !url.startsWith('data:') && !url.startsWith('blob:') && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'));
}

/**
 * Crea un handler de error para imágenes que intenta múltiples URLs
 * @param {Object} imagen - Objeto de imagen
 * @param {Function} onAllFailed - Callback cuando todas las URLs fallan
 * @returns {Function} Handler para el evento onError de <img>
 */
export function createImageErrorHandler(imagen, onAllFailed = null) {
  return function handleImageError(e) {
    const img = e.target;
    const currentSrc = img.src;
    const candidates = getImageUrlCandidates(imagen);
    const currentIndex = candidates.findIndex(url => url === currentSrc);
    
    // Prevenir múltiples intentos del mismo error
    if (img.dataset.errorHandled === 'true') {
      return; // Ya se manejó este error
    }
    
    // Intentar siguiente candidato
    if (currentIndex >= 0 && currentIndex < candidates.length - 1) {
      const nextUrl = candidates[currentIndex + 1];
      // Solo intentar si no hemos intentado este fallback antes
      if (!img.dataset.triedFallback || img.dataset.triedFallback !== nextUrl) {
        debug(`🔄 Intentando URL alternativa para imagen:`, nextUrl);
        img.dataset.triedFallback = nextUrl;
        img.src = nextUrl;
        return;
      }
    }
    
    // Si no hay más candidatos o ya intentamos todos, marcar como manejado
    img.dataset.errorHandled = 'true';
    
    // Si no hay más candidatos, mostrar error (solo loguear una vez)
    if (!img.dataset.errorLogged) {
      img.dataset.errorLogged = 'true';
      console.warn('⚠️ Imagen no disponible en el servidor:', {
        nombre: imagen?.nombre || imagen?.ruta || 'desconocida',
        ruta: imagen?.ruta,
        urlIntentada: currentSrc
      });
    }
    
    // Ocultar la imagen
    img.style.display = 'none';
    
    // Si hay callback, ejecutarlo
    if (onAllFailed) {
      onAllFailed(img, imagen);
    } else {
      // Comportamiento por defecto: mostrar mensaje de error
      const container = img.closest('.relative') || img.parentElement;
      if (container && !container.querySelector('.image-error-message')) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'image-error-message w-full h-full rounded-lg flex items-center justify-center';
        errorDiv.style.backgroundColor = '#E5E7EB';
        errorDiv.innerHTML = `
          <span class="text-xs text-center px-2 text-gray-600">
            Imagen no disponible<br/>
            en el servidor
          </span>
        `;
        container.appendChild(errorDiv);
      }
    }
  };
}

/**
 * Componente de imagen con manejo robusto de errores
 * NOTA: Este componente requiere que el archivo tenga extensión .jsx
 * Si prefieres mantener .js, usa las funciones getImageUrl y createImageErrorHandler directamente
 * 
 * @param {Object} props - Props del componente
 * @param {Object|string} props.imagen - Objeto de imagen o string base64
 * @param {string} props.alt - Texto alternativo
 * @param {string} props.className - Clases CSS
 * @param {Function} props.onClick - Handler de click
 * @param {Function} props.onError - Handler de error personalizado
 * @param {Object} props.style - Estilos inline
 * @returns {JSX.Element} Elemento <img> con manejo de errores
 */
// Comentado temporalmente para evitar problemas con .js
// export function RobustImage({ imagen, alt = 'Imagen', className = '', onClick = null, onError = null, style = {}, ...props }) {
//   const imageUrl = getImageUrl(imagen);
//   const candidates = getImageUrlCandidates(imagen);
//   
//   const handleError = onError || createImageErrorHandler(imagen);
//   
//   if (!imageUrl) {
//     return (
//       <div 
//         className={`flex items-center justify-center bg-gray-200 ${className}`}
//         style={style}
//       >
//         <span className="text-xs text-gray-500 text-center px-2">
//           Sin imagen
//         </span>
//       </div>
//     );
//   }
//   
//   return (
//     <img
//       src={imageUrl}
//       alt={alt}
//       className={className}
//       onClick={onClick}
//       onError={handleError}
//       style={style}
//       data-image-candidates={candidates.length}
//       {...props}
//     />
//   );
// }

/**
 * Verifica si una imagen tiene una ruta válida del servidor
 * @param {Object} imagen - Objeto de imagen
 * @returns {boolean} true si tiene ruta válida
 */
export function hasValidServerPath(imagen) {
  if (!imagen || typeof imagen !== 'object') return false;
  if (!imagen.ruta || typeof imagen.ruta !== 'string') return false;
  return imagen.ruta.startsWith('/uploads/') && !imagen.ruta.startsWith('data:');
}

/**
 * Filtra imágenes que tienen rutas válidas del servidor
 * @param {Array} imagenes - Array de objetos de imagen
 * @returns {Array} Array filtrado con solo imágenes con rutas válidas
 */
export function filterImagesWithValidPaths(imagenes) {
  if (!Array.isArray(imagenes)) return [];
  return imagenes.filter(hasValidServerPath);
}

/**
 * Normaliza una imagen para asegurar que tenga la estructura correcta
 * @param {Object|string} imagen - Imagen a normalizar
 * @returns {Object} Imagen normalizada
 */
export function normalizeImage(imagen) {
  if (typeof imagen === 'string') {
    if (imagen.startsWith('data:') || imagen.startsWith('blob:')) {
      return {
        id: Date.now() + Math.random(),
        base64: imagen,
        nombre: 'Imagen',
        descripcion: ''
      };
    }
    // Si es una ruta
    return {
      id: Date.now() + Math.random(),
      ruta: imagen,
      nombre: 'Imagen',
      descripcion: ''
    };
  }
  
  if (typeof imagen === 'object' && imagen !== null) {
    return {
      id: imagen.id || Date.now() + Math.random(),
      nombre: imagen.nombre || imagen.descripcion || 'Imagen',
      descripcion: imagen.descripcion || '',
      ruta: imagen.ruta || null,
      base64: imagen.base64 || null,
      url: imagen.url || null,
      ...imagen
    };
  }
  
  return {
    id: Date.now() + Math.random(),
    nombre: 'Imagen',
    descripcion: ''
  };
}
