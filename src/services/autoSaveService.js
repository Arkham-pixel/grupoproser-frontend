/**
 * Servicio de autoguardado para formularios
 * Maneja el almacenamiento local de datos de formularios
 */

const AUTO_SAVE_PREFIX = 'autosave_';
const AUTO_SAVE_METADATA_PREFIX = 'autosave_meta_';
const AUTO_SAVE_CONFIG_PREFIX = 'autosave_config_';

class AutoSaveService {
  /**
   * Guarda datos en localStorage
   * @param {string} formKey - Identificador único del formulario
   * @param {Object} data - Datos a guardar
   */
  save(formKey, data) {
    try {
      const storageKey = `${AUTO_SAVE_PREFIX}${formKey}`;
      const metadataKey = `${AUTO_SAVE_METADATA_PREFIX}${formKey}`;
      
      // Guardar datos
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      // Guardar metadata
      const metadata = {
        savedAt: new Date().toISOString(),
        version: '1.0',
        formKey,
      };
      localStorage.setItem(metadataKey, JSON.stringify(metadata));
      
return true;
    } catch (error) {
      console.error('❌ Error al guardar en localStorage:', error);
      
      // Manejar QuotaExceededError
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ Espacio en localStorage agotado, limpiando autoguardados antiguos...');
        this.cleanOldSaves();
        
        // Intentar guardar de nuevo
        try {
          const storageKey = `${AUTO_SAVE_PREFIX}${formKey}`;
          localStorage.setItem(storageKey, JSON.stringify(data));
          return true;
        } catch (retryError) {
          console.error('❌ Error al reintentar guardar:', retryError);
          return false;
        }
      }
      
      return false;
    }
  }

  /**
   * Obtiene datos guardados
   * @param {string} formKey - Identificador único del formulario
   * @returns {Object|null} - Datos guardados o null
   */
  get(formKey) {
    try {
      const storageKey = `${AUTO_SAVE_PREFIX}${formKey}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        return {
          data: JSON.parse(savedData),
          formKey,
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error al obtener datos de localStorage:', error);
      return null;
    }
  }

  /**
   * Obtiene metadata de un autoguardado
   * @param {string} formKey - Identificador único del formulario
   * @returns {Object|null} - Metadata o null
   */
  getMetadata(formKey) {
    try {
      const metadataKey = `${AUTO_SAVE_METADATA_PREFIX}${formKey}`;
      const metadata = localStorage.getItem(metadataKey);
      
      if (metadata) {
        return JSON.parse(metadata);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error al obtener metadata:', error);
      return null;
    }
  }

  /**
   * Verifica si existen datos guardados
   * @param {string} formKey - Identificador único del formulario
   * @returns {boolean}
   */
  has(formKey) {
    const storageKey = `${AUTO_SAVE_PREFIX}${formKey}`;
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Elimina datos guardados
   * @param {string} formKey - Identificador único del formulario
   */
  clear(formKey) {
    try {
      const storageKey = `${AUTO_SAVE_PREFIX}${formKey}`;
      const metadataKey = `${AUTO_SAVE_METADATA_PREFIX}${formKey}`;
      const configKey = `${AUTO_SAVE_CONFIG_PREFIX}${formKey}`;
      
      localStorage.removeItem(storageKey);
      localStorage.removeItem(metadataKey);
      localStorage.removeItem(configKey);
      
} catch (error) {
      console.error('❌ Error al eliminar datos:', error);
    }
  }

  /**
   * Limpia autoguardados antiguos (más de 7 días)
   */
  cleanOldSaves() {
    try {
      const keys = Object.keys(localStorage);
      const now = new Date().getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
      
      keys.forEach(key => {
        if (key.startsWith(AUTO_SAVE_METADATA_PREFIX)) {
          try {
            const metadata = JSON.parse(localStorage.getItem(key));
            const savedAt = new Date(metadata.savedAt).getTime();
            
            if (now - savedAt > maxAge) {
              const formKey = metadata.formKey;
this.clear(formKey);
            }
          } catch (error) {
            // Si hay error al parsear, eliminar la entrada
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error al limpiar autoguardados antiguos:', error);
    }
  }

  /**
   * Lista todos los autoguardados disponibles
   * @returns {Array} - Lista de autoguardados con metadata
   */
  listAll() {
    try {
      const keys = Object.keys(localStorage);
      const autoSaves = [];
      
      keys.forEach(key => {
        if (key.startsWith(AUTO_SAVE_PREFIX) && !key.includes('_meta_') && !key.includes('_config_')) {
          const formKey = key.replace(AUTO_SAVE_PREFIX, '');
          const metadata = this.getMetadata(formKey);
          
          autoSaves.push({
            formKey,
            metadata,
            hasData: true,
          });
        }
      });
      
      return autoSaves;
    } catch (error) {
      console.error('❌ Error al listar autoguardados:', error);
      return [];
    }
  }

  /**
   * Guarda configuración de autoguardado (si está habilitado)
   * @param {string} formKey - Identificador único del formulario
   * @param {boolean} enabled - Si el autoguardado está activo
   */
  setEnabled(formKey, enabled) {
    try {
      const configKey = `${AUTO_SAVE_CONFIG_PREFIX}${formKey}`;
      localStorage.setItem(configKey, JSON.stringify({ enabled }));
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
    }
  }

  /**
   * Obtiene configuración de autoguardado
   * @param {string} formKey - Identificador único del formulario
   * @returns {boolean} - Si el autoguardado está activo
   */
  isEnabled(formKey) {
    try {
      const configKey = `${AUTO_SAVE_CONFIG_PREFIX}${formKey}`;
      const config = localStorage.getItem(configKey);
      
      if (config) {
        return JSON.parse(config).enabled;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error al obtener configuración:', error);
      return false;
    }
  }

  /**
   * Obtiene el tamaño total usado por autoguardados
   * @returns {number} - Tamaño en bytes
   */
  getTotalSize() {
    try {
      let totalSize = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(AUTO_SAVE_PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length + key.length;
          }
        }
      });
      
      return totalSize;
    } catch (error) {
      console.error('❌ Error al calcular tamaño:', error);
      return 0;
    }
  }

  /**
   * Obtiene el tamaño total usado formateado
   * @returns {string} - Tamaño formateado (KB, MB)
   */
  getTotalSizeFormatted() {
    const bytes = this.getTotalSize();
    
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}

// Exportar instancia única (singleton)
export const autoSaveService = new AutoSaveService();
export default autoSaveService;
