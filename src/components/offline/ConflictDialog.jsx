import React from 'react';

/**
 * Diálogo de conflicto de versión / recuperación de sesión.
 */
export default function ConflictDialog({
  title = 'Cambios en este dispositivo',
  message,
  localUpdatedAt,
  serverUpdatedAt,
  onKeepLocal,
  onUseServer,
  onCompare,
  onClose,
  mode = 'recovery', // recovery | conflict
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(440px, 100%)',
          background: '#fff',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{title}</h2>
        <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.45 }}>
          {message ||
            (mode === 'conflict'
              ? 'Existe una versión más reciente de este formulario en el servidor.'
              : 'Encontramos cambios guardados en este dispositivo.')}
        </p>
        {(localUpdatedAt || serverUpdatedAt) && (
          <p style={{ fontSize: 12, color: '#64748b' }}>
            {localUpdatedAt ? `Local: ${new Date(localUpdatedAt).toLocaleString()}` : ''}
            {localUpdatedAt && serverUpdatedAt ? ' · ' : ''}
            {serverUpdatedAt ? `Servidor: ${new Date(serverUpdatedAt).toLocaleString()}` : ''}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {onKeepLocal ? (
            <button
              type="button"
              onClick={onKeepLocal}
              style={{
                minHeight: 44,
                borderRadius: 10,
                border: 0,
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              Continuar con versión local
            </button>
          ) : null}
          {onUseServer ? (
            <button
              type="button"
              onClick={onUseServer}
              style={{
                minHeight: 44,
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontWeight: 600,
              }}
            >
              Usar versión del servidor
            </button>
          ) : null}
          {onCompare ? (
            <button
              type="button"
              onClick={onCompare}
              style={{
                minHeight: 44,
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontWeight: 600,
              }}
            >
              Revisar diferencias
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              style={{
                minHeight: 40,
                border: 0,
                background: 'transparent',
                color: '#64748b',
              }}
            >
              Cerrar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
