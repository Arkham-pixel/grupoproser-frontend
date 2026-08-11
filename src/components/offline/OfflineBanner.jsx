import React from 'react';
import useSyncStatus from '../../hooks/useSyncStatus';
import { OFFLINE_FIRST_ENABLED } from '../../config/autoSaveConfig.js';

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useSyncStatus();
  if (!OFFLINE_FIRST_ENABLED || isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        padding: '10px 16px',
        backgroundColor: '#744210',
        color: '#FFFAF0',
        fontSize: 14,
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        lineHeight: 1.4,
      }}
    >
      Sin conexión — puedes continuar trabajando
      {pendingCount > 0 ? ` (${pendingCount} cambios pendientes)` : ''}. Se sincronizará al
      recuperar red.
    </div>
  );
}
