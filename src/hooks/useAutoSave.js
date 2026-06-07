import { useState, useEffect, useRef, useCallback } from 'react';
import { autoSaveService } from '../services/autoSaveService';

/**
 * ⚠️ DESACTIVACIÓN GLOBAL TEMPORAL DEL AUTOGUARDADO
 * Cambiar esta constante a false para reactivar el autoguardado
 */
const GLOBAL_AUTO_SAVE_DISABLED = true;

/**
 * Hook personalizado para autoguardado de formularios
 * 
 * ⚠️ TEMPORALMENTE DESACTIVADO - El autoguardado está desactivado globalmente
 * 
 * @param {Object} params - Parámetros de configuración
 * @param {string} params.formKey - Identificador único del formulario
 * @param {Object} params.formData - Datos del formulario a guardar
 * @param {boolean} params.enabled - Si el autoguardado está activo
 * @param {number} params.interval - Intervalo de autoguardado en ms (default: 30000)
 * @param {function} params.onRestore - Callback cuando se restauran datos
 * @param {Array} params.excludeFields - Campos a excluir del autoguardado
 * 
 * @returns {Object} - Objeto con métodos y estado del autoguardado
 */
export const useAutoSave = ({
  formKey,
  formData,
  enabled = false, // ⚠️ DESACTIVADO POR DEFECTO - Cambiar a true cuando se reactive
  interval = 30000, // 30 segundos por defecto
  onRestore,
  excludeFields = [],
}) => {
  // ⚠️ DESACTIVACIÓN GLOBAL TEMPORAL - Forzar desactivación
  if (GLOBAL_AUTO_SAVE_DISABLED) {
    enabled = false;
  }
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const intervalRef = useRef(null);
  const formDataRef = useRef(formData);
  const isFirstRender = useRef(true);
  const hasShownRestorePrompt = useRef(false);

  // Actualizar la referencia del formData
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Función para guardar
  const saveToStorage = useCallback(() => {
    // ⚠️ DESACTIVACIÓN GLOBAL - No guardar nada
    if (GLOBAL_AUTO_SAVE_DISABLED) {
return;
    }
    
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
      setSaveStatus('saved');
      
} catch (error) {
      console.error('❌ Error en autoguardado:', error);
      setSaveStatus('error');
    }
  }, [formKey, isAutoSaveEnabled, excludeFields]);

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
    // ⚠️ DESACTIVACIÓN GLOBAL - No permitir activación
    if (GLOBAL_AUTO_SAVE_DISABLED) {
return;
    }
    
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

  // Verificar si hay datos guardados al montar el componente
  // ⚠️ DESACTIVADO - No restaurar datos mientras el autoguardado está desactivado
  useEffect(() => {
    // ⚠️ DESACTIVACIÓN GLOBAL - Saltar restauración
    if (GLOBAL_AUTO_SAVE_DISABLED) {
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
  }, [formKey, restoreFromStorage, onRestore]);

  // Configurar intervalo de autoguardado
  useEffect(() => {
    // ⚠️ DESACTIVACIÓN GLOBAL - No configurar intervalos
    if (GLOBAL_AUTO_SAVE_DISABLED) {
      // Limpiar cualquier intervalo existente
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
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
      // ⚠️ DESACTIVACIÓN GLOBAL - No guardar al desmontar
      if (GLOBAL_AUTO_SAVE_DISABLED) {
        return;
      }
      
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
    
    // Métodos
    enableAutoSave,
    disableAutoSave,
    clearSavedData,
    saveNow,
    restoreFromStorage,
    
    // Utilidades
    hasSavedData: () => autoSaveService.has(formKey),
    getMetadata: () => autoSaveService.getMetadata(formKey),
  };
};
