import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import AutoSaveNotification from './AutoSaveNotification';
import AutoSaveRestoreDialog from './AutoSaveRestoreDialog';

function AutoSaveManualActivate({ onEnable, placement = 'floating' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isFloating = placement === 'floating';

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: `1px solid ${isDark ? '#4a5568' : '#cbd5e0'}`,
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '500',
    color: isDark ? '#cbd5e0' : '#718096',
    cursor: 'pointer',
  };

  if (isFloating) {
    return (
      <div style={{ position: 'fixed', top: '12px', right: '16px', zIndex: 900 }}>
        <button type="button" onClick={onEnable} style={buttonStyle} title="Activar autoguardado">
          Activar autoguardado
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={onEnable} style={buttonStyle} title="Activar autoguardado">
      Activar autoguardado
    </button>
  );
}

/**
 * UI estándar de autoguardado (notificación + diálogo de restauración).
 * En registros existentes: autoguardado activo por defecto.
 * En cargas nuevas: oculto hasta que el usuario lo active manualmente.
 */
export default function FormAutoSaveControls({
  enabled = true,
  isExistingRecord = false,
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
  /** 'floating' = chip arriba a la derecha; 'inline' = en la barra de acciones del formulario */
  placement = 'floating',
}) {
  if (!enabled) return (
    <AutoSaveRestoreDialog
      isOpen={showRestoreDialog}
      savedData={savedDataToRestore?.data}
      metadata={savedDataToRestore?.metadata}
      onRestore={onRestore}
      onDiscard={onDiscard}
      onCancel={onCancelRestore}
    />
  );

  const handleSaveOrSync = () => {
    if (syncNow) {
      syncNow();
      return;
    }
    saveNow?.();
  };

  const mostrarIndicador = isExistingRecord || isAutoSaveEnabled;

  return (
    <>
      {mostrarIndicador ? (
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
          placement={placement}
        />
      ) : (
        <AutoSaveManualActivate onEnable={enableAutoSave} placement={placement} />
      )}

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
