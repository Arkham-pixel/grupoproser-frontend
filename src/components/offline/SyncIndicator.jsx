import React, { useState } from 'react';
import useSyncStatus from '../../hooks/useSyncStatus';
import { OFFLINE_FIRST_ENABLED } from '../../config/autoSaveConfig.js';
import SyncPanel from './SyncPanel.jsx';

/**
 * Indicador discreto de estado offline / sync.
 */
export default function SyncIndicator() {
  const { status, isOnline, pendingCount, refresh } = useSyncStatus();
  const [panelOpen, setPanelOpen] = useState(false);

  if (!OFFLINE_FIRST_ENABLED) return null;

  let label = status.message || 'Listo';
  let color = '#059669';
  if (!isOnline) {
    label =
      pendingCount > 0
        ? `Sin conexión — ${pendingCount} pendientes`
        : 'Sin conexión — puedes continuar trabajando';
    color = '#B45309';
  } else if (status.state === 'saving') {
    label = 'Guardando…';
    color = '#2563EB';
  } else if (status.state === 'syncing') {
    label = 'Sincronizando…';
    color = '#2563EB';
  } else if (status.state === 'error' || status.state === 'pending') {
    label =
      pendingCount > 0
        ? `${pendingCount} cambios pendientes`
        : status.message || 'Hay cambios pendientes';
    color = '#B45309';
  } else if (status.state === 'saved_local') {
    label = 'Guardado en este dispositivo';
    color = '#047857';
  } else if (status.state === 'synced' && pendingCount === 0) {
    label = 'Sincronizado';
    color = '#059669';
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          refresh();
          setPanelOpen(true);
        }}
        title="Estado de sincronización"
        style={{
          position: 'fixed',
          right: 12,
          bottom: 12,
          zIndex: 9998,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 'min(92vw, 320px)',
          padding: '8px 12px',
          borderRadius: 999,
          border: '1px solid rgba(0,0,0,0.08)',
          background: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          fontSize: 12,
          fontWeight: 600,
          color: '#1f2937',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </button>
      {panelOpen ? <SyncPanel onClose={() => setPanelOpen(false)} /> : null}
    </>
  );
}
