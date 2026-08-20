import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AutoSaveRestoreDialog from './AutoSave/AutoSaveRestoreDialog.jsx';

export default function ArnaldDraftChrome({
  draftStatus = 'idle',
  lastDraftAt = null,
  showRestore = false,
  savedDataToRestore = null,
  onRestore,
  onDiscard,
  onCancel,
  consumeDraft,
}) {
  const { t } = useTranslation();
  const mostrarBanner = draftStatus === 'saving' || draftStatus === 'saved' || draftStatus === 'error';
  const autoApply = Boolean(savedDataToRestore?.metadata?.autoApply);

  const restaurarYBorrarTemporal = () => {
    onRestore?.();
    consumeDraft?.(savedDataToRestore?.data);
  };

  useEffect(() => {
    if (showRestore && autoApply) {
      restaurarYBorrarTemporal();
    }
    // Solo al aplicar en automático el letrero de plataforma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRestore, autoApply]);

  return (
    <>
      {mostrarBanner && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 9998,
            maxWidth: '300px',
            padding: '8px 12px',
            borderRadius: '10px',
            backgroundColor: draftStatus === 'error' ? '#7f1d1d' : '#111827',
            color: '#e5e7eb',
            fontSize: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {draftStatus === 'saving' && t('plataforma.draft.saving')}
          {draftStatus === 'saved' &&
            t('plataforma.draft.saved', {
              time: lastDraftAt
                ? lastDraftAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                : '',
            })}
          {draftStatus === 'error' && t('plataforma.draft.error')}
        </div>
      )}
      <AutoSaveRestoreDialog
        isOpen={showRestore && !autoApply}
        savedData={savedDataToRestore?.data}
        metadata={savedDataToRestore?.metadata}
        onRestore={restaurarYBorrarTemporal}
        onDiscard={onDiscard}
        onCancel={onCancel}
      />
    </>
  );
}
