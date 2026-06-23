import { useState, useEffect, useRef, useCallback } from 'react';
import { autoSaveService } from '../services/autoSaveService';
import useOnlineStatus from './useOnlineStatus';

/**
 * Hook personalizado para autoguardado de formularios (localStorage).
 *
 * @param {Object} params - Parámetros de configuración
 * @param {string} params.formKey - Identificador único del formulario
 * @param {Object} params.formData - Datos del formulario a guardar
 * @param {boolean} params.enabled - Si el autoguardado está activo
 * @param {number} params.interval - Intervalo de autoguardado en ms (default: 30000)
 * @param {function} params.onRestore - Callback cuando se restauran datos
 * @param {Array} params.excludeFields - Campos a excluir del autoguardado
 * @param {boolean} params.skipRestoreOnMount - No ofrecer restaurar al abrir (p. ej. edición desde reporte)
 *
 * @returns {Object} - Objeto con métodos y estado del autoguardado
 */
export const useAutoSave = ({
  formKey,
  formData,
  enabled = true,
  interval = 300000,
  debounceMs = 400,
  saveOnChange = true,
  onRestore,
  excludeFields = [],
  skipRestoreOnMount = false,
  /** Con caso en BD y red: no pisar localStorage cada intervalo (evita conflictos entre ventanas). */
  preferServerWhenOnline = false,
  /** Ref opcional: si devuelve true, se omite el autoguardado por cambio (p. ej. recarga desde servidor). */
  shouldSkipSaveRef = null,
}) => {
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error, offline-saved, syncing
  const intervalRef = useRef(null);
  const debounceRef = useRef(null);
  const formDataRef = useRef(formData);
  const isFirstRender = useRef(true);
  const hasShownRestorePrompt = useRef(false);
  const omitirPorCargaInicialRef = useRef(true);
  const isOnline = useOnlineStatus();

  // Actualizar la referencia del formData
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Función para guardar
  const saveToStorage = useCallback((options = {}) => {
    if (!isAutoSaveEnabled || !formKey) return;

    const force = options.force === true;
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (preferServerWhenOnline && online && !force) {
      return;
    }

    try {
      setSaveStatus('saving');
      
      // Filtrar campos excluidos
      const dataToSave = { ...formDataRef.current };
      excludeFields.forEach(field => {
        delete dataToSave[field];
      });

      autoSaveService.save(formKey, dataToSave);
      setLastSaveTime(new Date());
      if (!online) {
        autoSaveService.setPendingServerSync(formKey, true);
        setSaveStatus('offline-saved');
      } else {
        setSaveStatus('saved');
      }
      
} catch (error) {
      console.error('❌ Error en autoguardado:', error);
      setSaveStatus('error');
    }
  }, [formKey, isAutoSaveEnabled, excludeFields, preferServerWhenOnline]);

  // Guardar de inmediato al perder conexión (borrador local seguro)
  useEffect(() => {
    const onOffline = () => {
      if (isAutoSaveEnabled && formKey) {
        saveToStorage({ force: true });
      }
    };
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, [isAutoSaveEnabled, formKey, saveToStorage]);

  const markSyncing = useCallback(() => setSaveStatus('syncing'), []);
  const markSynced = useCallback(() => setSaveStatus('saved'), []);
  const markSyncError = useCallback(() => setSaveStatus('error'), []);

  // Función para restaurar datos guardados
  const restoreFromStorage = useCallback(() => {
    if (!formKey) return null;

    try {
      const savedData = autoSaveService.get(formKey);
      
      if (savedData && savedData.data) {
        const metadata = autoSaveService.getMetadata(formKey);
return {
          data: savedData.data,
          metadata: metadata,
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error al restaurar datos:', error);
      return null;
    }
  }, [formKey]);

  // Función para activar el autoguardado
  const enableAutoSave = useCallback(() => {
    setIsAutoSaveEnabled(true);
    autoSaveService.setEnabled(formKey, true);
  }, [formKey]);

  // Función para desactivar el autoguardado
  const disableAutoSave = useCallback(() => {
setIsAutoSaveEnabled(false);
    autoSaveService.setEnabled(formKey, false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [formKey]);

  // Función para limpiar datos guardados
  const clearSavedData = useCallback(() => {
autoSaveService.clear(formKey);
    setLastSaveTime(null);
    setSaveStatus('idle');
  }, [formKey]);

  // Función para guardar manualmente
  const saveNow = useCallback((options) => {
    saveToStorage(options);
  }, [saveToStorage]);

  useEffect(() => {
    if (skipRestoreOnMount) {
      isFirstRender.current = false;
      return;
    }

    if (isFirstRender.current && formKey && !hasShownRestorePrompt.current) {
      const savedInfo = restoreFromStorage();
      
if (savedInfo && savedInfo.data) {
        hasShownRestorePrompt.current = true;
        
// Llamar al callback de restauración si existe
        if (onRestore) {
          onRestore(savedInfo);
        } else {
          console.warn('⚠️ [useAutoSave] onRestore no está definido');
        }
      } else {
}
      
      // Verificar si el autoguardado estaba activo
      const wasEnabled = autoSaveService.isEnabled(formKey);
if (wasEnabled) {
        setIsAutoSaveEnabled(true);
      }
      
      isFirstRender.current = false;
    }
  }, [formKey, restoreFromStorage, onRestore, skipRestoreOnMount]);

  // Autoguardado al estilo Word/OneDrive: cada cambio, tras una pausa breve (debounce)
  useEffect(() => {
    if (!isAutoSaveEnabled || !enabled || !formKey || !saveOnChange || debounceMs <= 0) {
      return undefined;
    }

    if (omitirPorCargaInicialRef.current) {
      omitirPorCargaInicialRef.current = false;
      return undefined;
    }

    if (shouldSkipSaveRef?.current) {
      return undefined;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setSaveStatus((prev) => (prev === 'syncing' ? prev : 'saving'));

    debounceRef.current = setTimeout(() => {
      saveToStorage({ force: !preferServerWhenOnline });
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    formData,
    isAutoSaveEnabled,
    enabled,
    formKey,
    saveOnChange,
    debounceMs,
    saveToStorage,
    preferServerWhenOnline,
    shouldSkipSaveRef,
  ]);

  useEffect(() => {
    if (isAutoSaveEnabled && enabled && formKey && interval > 0) {
      // Limpiar intervalo anterior si existe
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Crear nuevo intervalo
      intervalRef.current = setInterval(() => {
        saveToStorage();
      }, interval);

      // Reflejar guardados de otra ventana (misma clave) en el indicador
      const onStorageSync = (event) => {
        if (event.key !== `autosave_${formKey}` || !event.newValue) return;
        try {
          const meta = autoSaveService.getMetadata(formKey);
          if (meta?.savedAt) {
            setLastSaveTime(new Date(meta.savedAt));
            setSaveStatus(navigator.onLine ? 'saved' : 'offline-saved');
          }
        } catch {
          /* ignore */
        }
      };
      window.addEventListener('storage', onStorageSync);

// Limpieza
      return () => {
        window.removeEventListener('storage', onStorageSync);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isAutoSaveEnabled, enabled, formKey, interval, saveToStorage]);

  // Guardar cuando se desmonta el componente (si está habilitado)
  useEffect(() => {
    return () => {
      if (isAutoSaveEnabled && formKey) {
const dataToSave = { ...formDataRef.current };
        excludeFields.forEach(field => {
          delete dataToSave[field];
        });
        autoSaveService.save(formKey, dataToSave);
      }
    };
  }, [formKey, isAutoSaveEnabled, excludeFields]);

  return {
    // Estado
    isAutoSaveEnabled,
    lastSaveTime,
    saveStatus,
    isOnline,
    pendingServerSync: autoSaveService.hasPendingServerSync(formKey),
    
    // Métodos
    enableAutoSave,
    disableAutoSave,
    clearSavedData,
    saveNow,
    restoreFromStorage,
    markSyncing,
    markSynced,
    markSyncError,
    
    // Utilidades
    hasSavedData: () => autoSaveService.has(formKey),
    getMetadata: () => autoSaveService.getMetadata(formKey),
  };
};
