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
  interval = 30000,
  onRestore,
  excludeFields = [],
  skipRestoreOnMount = false,
}) => {
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error, offline-saved, syncing
  const intervalRef = useRef(null);
  const formDataRef = useRef(formData);
  const isFirstRender = useRef(true);
  const hasShownRestorePrompt = useRef(false);
  const isOnline = useOnlineStatus();

  // Actualizar la referencia del formData
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Función para guardar
  const saveToStorage = useCallback(() => {
    if (!isAutoSaveEnabled || !formKey) return;

    try {
      setSaveStatus('saving');
      
      // Filtrar campos excluidos
      const dataToSave = { ...formDataRef.current };
      excludeFields.forEach(field => {
        delete dataToSave[field];
      });

      autoSaveService.save(formKey, dataToSave);
      setLastSaveTime(new Date());
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
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
  }, [formKey, isAutoSaveEnabled, excludeFields]);

  // Guardar de inmediato al perder conexión (borrador local seguro)
  useEffect(() => {
    const onOffline = () => {
      if (isAutoSaveEnabled && formKey) {
        saveToStorage();
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
  const saveNow = useCallback(() => {
saveToStorage();
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

  useEffect(() => {
    if (isAutoSaveEnabled && enabled && formKey) {
      // Limpiar intervalo anterior si existe
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Crear nuevo intervalo
      intervalRef.current = setInterval(() => {
        saveToStorage();
      }, interval);

// Limpieza
      return () => {
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
