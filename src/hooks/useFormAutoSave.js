import { useEffect, useRef, useCallback, useState } from 'react';
import { useAutoSave } from './useAutoSave';
import useOnlineStatus from './useOnlineStatus';
import { autoSaveService } from '../services/autoSaveService';
import {
  registerOfflineSyncHandler,
  unregisterOfflineSyncHandler,
  isBrowserOnline,
} from '../services/offlineSyncRegistry';

/**
 * Clave de localStorage por formulario. Si hay recordId, el borrador queda
 * asociado a esa misma copia (no se mezcla con otros registros).
 */
export function buildFormAutoSaveKey(formKeyBase, recordId) {
  if (recordId && recordId !== 'nuevo') {
    return `${formKeyBase}-${recordId}`;
  }
  return `${formKeyBase}-nuevo`;
}

/**
 * Autoguardado unificado: localStorage + servidor (solo actualización).
 * Sin conexión: guarda en local y encola sincronización al reconectar.
 */
export function useFormAutoSave({
  formKeyBase,
  recordId = null,
  formData,
  enabled = true,
  localInterval = 30000,
  serverInterval = 60000,
  excludeFields = [],
  skipRestoreOnMount = null,
  onRestore,
  onServerUpdate = null,
  serverReady = true,
  canSaveServer = null,
}) {
  const formKey = buildFormAutoSaveKey(formKeyBase, recordId);
  const formDataRef = useRef(formData);
  const recordIdRef = useRef(recordId);
  const guardandoServidorRef = useRef(false);
  const isOnline = useOnlineStatus();
  const [pendingServerSync, setPendingServerSync] = useState(() =>
    autoSaveService.hasPendingServerSync(formKey)
  );

  const [savedDataToRestore, setSavedDataToRestore] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    recordIdRef.current = recordId;
  }, [recordId]);

  useEffect(() => {
    setPendingServerSync(autoSaveService.hasPendingServerSync(formKey));
  }, [formKey, isOnline]);

  const handleRestorePrompt = useCallback(
    (savedInfo) => {
      if (onRestore) {
        onRestore(savedInfo);
        return;
      }
      setSavedDataToRestore(savedInfo);
      setShowRestoreDialog(true);
    },
    [onRestore]
  );

  const tieneRecordId = Boolean(recordId && recordId !== 'nuevo');

  const autoSave = useAutoSave({
    formKey,
    formData,
    enabled,
    interval: localInterval,
    excludeFields,
    skipRestoreOnMount: skipRestoreOnMount ?? tieneRecordId,
    onRestore: handleRestorePrompt,
  });

  useEffect(() => {
    if (!enabled) return;
    if (!autoSave.isAutoSaveEnabled) {
      autoSave.enableAutoSave();
    }
  }, [enabled, autoSave.isAutoSaveEnabled, autoSave.enableAutoSave]);

  const ejecutarGuardadoServidor = useCallback(async () => {
    const id = recordIdRef.current;
    if (!id || id === 'nuevo' || !onServerUpdate || !serverReady) return false;
    if (canSaveServer && !canSaveServer()) return false;
    if (guardandoServidorRef.current) return false;

    if (!isBrowserOnline()) {
      autoSave.saveNow();
      autoSaveService.setPendingServerSync(formKey, true);
      setPendingServerSync(true);
      return false;
    }

    guardandoServidorRef.current = true;
    autoSave.markSyncing();

    try {
      await onServerUpdate(formDataRef.current, { recordId: id });
      autoSaveService.clearPendingServerSync(formKey);
      setPendingServerSync(false);
      autoSave.markSynced();
      return true;
    } catch (error) {
      console.warn('[auto-guardado servidor]', error);
      if (!isBrowserOnline()) {
        autoSave.saveNow();
        autoSaveService.setPendingServerSync(formKey, true);
        setPendingServerSync(true);
      } else {
        autoSave.markSyncError();
      }
      return false;
    } finally {
      guardandoServidorRef.current = false;
    }
  }, [onServerUpdate, serverReady, canSaveServer, formKey, autoSave]);

  useEffect(() => {
    if (!enabled || !onServerUpdate) return undefined;

    registerOfflineSyncHandler(formKey, ejecutarGuardadoServidor);
    return () => unregisterOfflineSyncHandler(formKey);
  }, [enabled, formKey, onServerUpdate, ejecutarGuardadoServidor]);

  useEffect(() => {
    if (!enabled || !onServerUpdate) return undefined;

    const onOnline = () => {
      ejecutarGuardadoServidor();
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [enabled, onServerUpdate, ejecutarGuardadoServidor]);

  useEffect(() => {
    if (!enabled || !onServerUpdate || !serverReady) return undefined;

    const timer = setInterval(() => {
      ejecutarGuardadoServidor();
    }, serverInterval);

    return () => clearInterval(timer);
  }, [enabled, onServerUpdate, serverReady, serverInterval, ejecutarGuardadoServidor]);

  const syncNow = useCallback(async () => {
    autoSave.saveNow();
    return ejecutarGuardadoServidor();
  }, [autoSave, ejecutarGuardadoServidor]);

  const handleRestoreData = useCallback(
    (setFormData, currentFormData) => {
      if (!savedDataToRestore?.data) return;
      setFormData({
        ...currentFormData,
        ...savedDataToRestore.data,
      });
      setShowRestoreDialog(false);
      autoSave.enableAutoSave();
    },
    [savedDataToRestore, autoSave.enableAutoSave]
  );

  const handleDiscardSavedData = useCallback(() => {
    autoSave.clearSavedData();
    autoSaveService.clearPendingServerSync(formKey);
    setPendingServerSync(false);
    setShowRestoreDialog(false);
    setSavedDataToRestore(null);
  }, [autoSave.clearSavedData, formKey]);

  const handleCancelRestore = useCallback(() => {
    setShowRestoreDialog(false);
  }, []);

  return {
    formKey,
    ...autoSave,
    isOnline,
    pendingServerSync,
    syncNow,
    savedDataToRestore,
    showRestoreDialog,
    setShowRestoreDialog,
    setSavedDataToRestore,
    handleRestoreData,
    handleDiscardSavedData,
    handleCancelRestore,
  };
}

/**
 * Solo autoguardado en servidor (actualización). Respeta modo offline.
 */
export function useServerAutoSaveUpdate({
  recordId,
  enabled = true,
  interval = 60000,
  onUpdate,
  ready = true,
  isBlocked = null,
  syncKey = null,
  onOfflineFallback = null,
}) {
  const recordIdRef = useRef(recordId);
  const guardRef = useRef(false);
  const isOnline = useOnlineStatus();
  const handlerKey = syncKey || `server-sync-${recordId || 'none'}`;

  useEffect(() => {
    recordIdRef.current = recordId;
  }, [recordId]);

  const ejecutar = useCallback(async () => {
    const id = recordIdRef.current;
    if (!id || id === 'nuevo') return false;
    if (isBlocked?.()) return false;
    if (guardRef.current) return false;

    if (!isBrowserOnline()) {
      onOfflineFallback?.(id);
      return false;
    }

    guardRef.current = true;
    try {
      await onUpdate(id);
      return true;
    } catch (error) {
      console.warn('[auto-guardado servidor]', error);
      if (!isBrowserOnline()) {
        onOfflineFallback?.(id);
      }
      return false;
    } finally {
      guardRef.current = false;
    }
  }, [onUpdate, isBlocked, onOfflineFallback]);

  useEffect(() => {
    if (!enabled || !ready || !onUpdate) return undefined;
    registerOfflineSyncHandler(handlerKey, ejecutar);
    return () => unregisterOfflineSyncHandler(handlerKey);
  }, [enabled, ready, onUpdate, handlerKey, ejecutar]);

  useEffect(() => {
    if (!enabled || !ready || !onUpdate) return undefined;
    const onOnline = () => ejecutar();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [enabled, ready, onUpdate, ejecutar]);

  useEffect(() => {
    if (!enabled || !ready || !onUpdate) return undefined;

    const timer = setInterval(() => {
      ejecutar();
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, ready, onUpdate, interval, ejecutar, isOnline]);

  return { isOnline, syncNow: ejecutar };
}
