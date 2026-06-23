import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';

function getTimeAgo(date) {
  if (!date) return '';

  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

function getStatusInfo({
  saveStatus,
  lastSaveTime,
  pendingServerSync,
  isOnline,
  isEnabled,
}) {
  if (!isEnabled) {
    return {
      dotColor: '#a0aec0',
      shortLabel: 'Autoguardado off',
      detailLabel: 'El autoguardado está desactivado',
    };
  }

  if (saveStatus === 'saving') {
    return {
      dotColor: '#f6ad55',
      pulse: true,
      shortLabel: 'Guardando…',
      detailLabel: 'Guardando cambios…',
    };
  }

  if (saveStatus === 'syncing') {
    return {
      dotColor: '#4299e1',
      pulse: true,
      shortLabel: 'Sincronizando…',
      detailLabel: 'Sincronizando con el servidor…',
    };
  }

  if (saveStatus === 'offline-saved') {
    return {
      dotColor: '#ed8936',
      shortLabel: 'Sin conexión',
      detailLabel: 'Sin conexión — guardado en este equipo',
    };
  }

  if (saveStatus === 'error') {
    return {
      dotColor: '#f56565',
      shortLabel: 'Error al guardar',
      detailLabel: 'No se pudo guardar. Intente de nuevo.',
    };
  }

  if (pendingServerSync && isOnline && saveStatus !== 'syncing') {
    return {
      dotColor: '#ecc94b',
      shortLabel: 'Por sincronizar',
      detailLabel: 'Cambios pendientes de sincronizar con el servidor',
    };
  }

  if (saveStatus === 'saved' && lastSaveTime) {
    const ago = getTimeAgo(lastSaveTime);
    return {
      dotColor: '#48bb78',
      shortLabel: `Guardado ${ago}`,
      detailLabel: `Último guardado ${ago}`,
    };
  }

  return {
    dotColor: '#48bb78',
    shortLabel: 'Autoguardado',
    detailLabel: 'Autoguardado activo',
  };
}

/**
 * Componente de notificación y control de autoguardado.
 * placement="floating": chip compacto arriba a la derecha (no tapa botones del pie).
 * placement="inline": para integrar en cabeceras o barras de acciones del formulario.
 */
export default function AutoSaveNotification({
  isEnabled,
  lastSaveTime,
  saveStatus,
  onEnable,
  onDisable,
  onSaveNow,
  hasUnsavedChanges = false,
  showEnablePrompt = false,
  onDismissPrompt,
  pendingServerSync = false,
  isOnline = true,
  placement = 'floating',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showNotification, setShowNotification] = useState(false);
  const [showPrompt, setShowPrompt] = useState(showEnablePrompt);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);

  const isFloating = placement === 'floating';
  const status = getStatusInfo({
    saveStatus,
    lastSaveTime,
    pendingServerSync,
    isOnline,
    isEnabled,
  });

  useEffect(() => {
    setShowPrompt(showEnablePrompt);
  }, [showEnablePrompt]);

  useEffect(() => {
    if (saveStatus === 'saved') {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleDismissPrompt = () => {
    setShowPrompt(false);
    onDismissPrompt?.();
  };

  const handleEnable = () => {
    onEnable();
    setShowPrompt(false);
    setMenuOpen(false);
    onDismissPrompt?.();
  };

  const handleDisable = () => {
    onDisable();
    setMenuOpen(false);
  };

  const handleSaveNow = () => {
    onSaveNow?.();
    setMenuOpen(false);
  };

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);

  const surfaceBg = isDark ? '#2d3748' : '#ffffff';
  const surfaceBorder = isDark ? '#4a5568' : '#e2e8f0';
  const textPrimary = isDark ? '#e2e8f0' : '#2d3748';
  const textMuted = isDark ? '#cbd5e0' : '#718096';

  const chipButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: surfaceBg,
    border: `1px solid ${surfaceBorder}`,
    borderRadius: '999px',
    boxShadow: isFloating ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
    fontSize: '13px',
    fontWeight: '500',
    color: textPrimary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    maxWidth: isFloating ? '220px' : 'none',
  };

  const wrapperStyle = isFloating
    ? { position: 'fixed', top: '12px', right: '16px', zIndex: 900 }
    : { position: 'relative', display: 'inline-flex' };

  const menuStyle = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    minWidth: '240px',
    padding: '12px',
    backgroundColor: surfaceBg,
    border: `1px solid ${surfaceBorder}`,
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 901,
  };

  const actionBtnStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    textAlign: 'left',
  };

  const showSaveAction = isEnabled && (hasUnsavedChanges || pendingServerSync);

  return (
    <>
      {showPrompt && (
        <div
          style={{
            position: 'fixed',
            top: isFloating ? '52px' : '12px',
            right: '16px',
            zIndex: 9999,
            maxWidth: '360px',
            padding: '16px 20px',
            backgroundColor: surfaceBg,
            border: `2px solid ${surfaceBorder}`,
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '600', color: textPrimary }}>
            Protege tu trabajo
          </h4>
          <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.5, color: textMuted }}>
            Activa el autoguardado para evitar perder información si se cierra la página o hay problemas de conexión.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleEnable}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Activar
            </button>
            <button
              type="button"
              onClick={handleDismissPrompt}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: textMuted,
                border: `1px solid ${surfaceBorder}`,
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      {showNotification && (
        <div
          style={{
            position: 'fixed',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 898,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            backgroundColor: '#48bb78',
            color: 'white',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(72,187,120,0.35)',
            pointerEvents: 'none',
          }}
        >
          <span>✓</span>
          <span>Guardado automáticamente</span>
        </div>
      )}

      <div ref={rootRef} style={wrapperStyle}>
        <button
          type="button"
          onClick={toggleMenu}
          style={chipButtonStyle}
          title={status.detailLabel}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: status.dotColor,
              flexShrink: 0,
              animation: status.pulse ? 'autosave-pulse 1.5s ease-in-out infinite' : undefined,
            }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.shortLabel}</span>
          <span style={{ fontSize: '10px', color: textMuted, flexShrink: 0 }}>▾</span>
        </button>

        {menuOpen && (
          <div style={menuStyle} role="menu">
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: textMuted, lineHeight: 1.4 }}>
              {status.detailLabel}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {showSaveAction && (
                <button
                  type="button"
                  onClick={handleSaveNow}
                  style={{
                    ...actionBtnStyle,
                    backgroundColor: '#4299e1',
                    color: 'white',
                  }}
                >
                  {pendingServerSync ? 'Sincronizar con el servidor' : 'Guardar ahora'}
                </button>
              )}

              {isEnabled ? (
                <button
                  type="button"
                  onClick={handleDisable}
                  style={{
                    ...actionBtnStyle,
                    backgroundColor: isDark ? '#4a5568' : '#f7fafc',
                    color: textPrimary,
                    border: `1px solid ${surfaceBorder}`,
                  }}
                >
                  Desactivar autoguardado
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnable}
                  style={{
                    ...actionBtnStyle,
                    backgroundColor: '#4299e1',
                    color: 'white',
                  }}
                >
                  Activar autoguardado
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes autosave-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
        `}
      </style>
    </>
  );
}
