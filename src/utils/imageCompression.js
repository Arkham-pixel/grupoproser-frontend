import { asegurarJpeg, esHeic } from './heicToJpeg.js';

const TIPOS_CANVAS = new Set(['image/jpeg', 'image/png', 'image/webp']);

function tipoSalidaCanvas(file) {
  const type = String(file?.type || '').toLowerCase();
  if (TIPOS_CANVAS.has(type)) return type;
  return 'image/jpeg';
}

function nombreConTipo(file, mime) {
  const original = String(file?.name || 'foto');
  if (mime === 'image/jpeg' && !/\.jpe?g$/i.test(original)) {
    return original.replace(/\.[^.]+$/, '') + '.jpg';
  }
  if (mime === 'image/png' && !/\.png$/i.test(original)) {
    return original.replace(/\.[^.]+$/, '') + '.png';
  }
  if (mime === 'image/webp' && !/\.webp$/i.test(original)) {
    return original.replace(/\.[^.]+$/, '') + '.webp';
  }
  return original;
}

// Utilidad para comprimir imágenes antes de subirlas
export class ImageCompression {
  
  /**
   * Comprime una imagen manteniendo la calidad
   * @param {File} file - Archivo de imagen
   * @param {number} maxWidth - Ancho máximo (por defecto 1920)
   * @param {number} maxHeight - Alto máximo (por defecto 1080)
   * @param {number} quality - Calidad de compresión (0.1 a 1.0, por defecto 0.8)
   * @param {number} maxSizeKB - Tamaño máximo en KB (por defecto 500KB)
   * @returns {Promise<File>} - Archivo comprimido
   */
  static async compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8, maxSizeKB = 500) {
    const listo = esHeic(file) ? await asegurarJpeg(file) : file;
    const outputType = tipoSalidaCanvas(listo);

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo la proporción
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // Configurar canvas
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob con compresión
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir la imagen'));
              return;
            }
            
            // Verificar tamaño final
            const sizeKB = blob.size / 1024;
// Si aún es muy grande, reducir calidad
            if (sizeKB > maxSizeKB && quality > 0.1) {
              const newQuality = Math.max(0.1, quality - 0.2);
this.compressImage(listo, maxWidth, maxHeight, newQuality, maxSizeKB)
                .then(resolve)
                .catch(reject);
              return;
            }
            
            // Crear nuevo archivo con el blob comprimido
            const compressedFile = new File([blob], nombreConTipo(listo, outputType), {
              type: outputType,
              lastModified: Date.now()
            });
            
            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = URL.createObjectURL(listo);
    });
  }
  
  /**
   * Comprime múltiples imágenes
   * @param {File[]} files - Array de archivos de imagen
   * @param {Object} options - Opciones de compresión
   * @returns {Promise<File[]>} - Array de archivos comprimidos
   */
  static async compressImages(files, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      maxSizeKB = 500
    } = options;
    
const compressedFiles = [];
    for (const file of files) {
      try {
        const listo = await this.compressImage(file, maxWidth, maxHeight, quality, maxSizeKB);
        compressedFiles.push(listo);
      } catch (error) {
        console.error(`❌ Error comprimiendo ${file.name}:`, error);
        try {
          compressedFiles.push(await asegurarJpeg(file));
        } catch {
          compressedFiles.push(file);
        }
      }
    }
    
return compressedFiles;
  }
  
  /**
   * Verifica si una imagen necesita compresión
   * @param {File} file - Archivo de imagen
   * @param {number} maxSizeKB - Tamaño máximo en KB
   * @returns {boolean} - True si necesita compresión
   */
  static needsCompression(file, maxSizeKB = 500) {
    const sizeKB = file.size / 1024;
    return sizeKB > maxSizeKB;
  }
  
  /**
   * Obtiene información de una imagen
   * @param {File} file - Archivo de imagen
   * @returns {Promise<Object>} - Información de la imagen
   */
  static async getImageInfo(file) {
    const listo = esHeic(file) ? await asegurarJpeg(file) : file;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          sizeKB: (listo.size / 1024).toFixed(1),
          aspectRatio: (img.width / img.height).toFixed(2)
        });
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = URL.createObjectURL(listo);
    });
  }
}
