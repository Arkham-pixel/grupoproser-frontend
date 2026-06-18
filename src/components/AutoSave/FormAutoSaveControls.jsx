import React from 'react';
import AutoSaveNotification from './AutoSaveNotification';
import AutoSaveRestoreDialog from './AutoSaveRestoreDialog';

/**
 * UI estándar de autoguardado (notificación + diálogo de restauración).
 */
export default function FormAutoSaveControls({
  enabled = true,
  isAutoSaveEnabled,
  lastSaveTime,
  saveStatus,
  enableAutoSave,
  disableAutoSave,
  saveNow,
  syncNow,
  showRestoreDialog,
  savedDataToRestore,
  onRestore,
  onDiscard,
  onCancelRestore,
  pendingServerSync = false,
  isOnline = true,
}) {
  if (!enabled) return null;

  const handleSaveOrSync = () => {
    if (syncNow) {
      syncNow();
      return;
    }
    saveNow?.();
  };

  return (
    <>
      <AutoSaveNotification
        isEnabled={isAutoSaveEnabled}
        lastSaveTime={lastSaveTime}
        saveStatus={saveStatus}
        onEnable={enableAutoSave}
        onDisable={disableAutoSave}
        onSaveNow={handleSaveOrSync}
        hasUnsavedChanges={false}
        showEnablePrompt={false}
        onDismissPrompt={() => {}}
        pendingServerSync={pendingServerSync}
        isOnline={isOnline}
      />

      <AutoSaveRestoreDialog
        isOpen={showRestoreDialog}
        savedData={savedDataToRestore?.data}
        metadata={savedDataToRestore?.metadata}
        onRestore={onRestore}
        onDiscard={onDiscard}
        onCancel={onCancelRestore}
      />
    </>
  );
}
