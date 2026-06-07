import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Componente de notificación y control de autoguardado
 * Muestra el estado del autoguardado y permite activarlo/desactivarlo
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
}) {
  const { theme } = useTheme();
  const [showNotification, setShowNotification] = useState(false);
  const [showPrompt, setShowPrompt] = useState(showEnablePrompt);

  // Log para debugging
  useEffect(() => {
}, [isEnabled, showEnablePrompt, showPrompt, hasUnsavedChanges, saveStatus]);

  // Actualizar showPrompt cuando cambia showEnablePrompt
  useEffect(() => {
setShowPrompt(showEnablePrompt);
  }, [showEnablePrompt]);

  // Mostrar notificación temporalmente cuando se guarda
  useEffect(() => {
    if (saveStatus === 'saved') {
      setShowNotification(true);
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Formatear tiempo transcurrido
  const getTimeAgo = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000); // segundos
    
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} días`;
  };

  // Manejar cierre del prompt
  const handleDismissPrompt = () => {
    setShowPrompt(false);
    if (onDismissPrompt) {
      onDismissPrompt();
    }
  };

  // Manejar activación
  const handleEnable = () => {
    onEnable();
    setShowPrompt(false);
    if (onDismissPrompt) {
      onDismissPrompt();
    }
  };

  // Estilos base
  const baseStyles = {
    position: 'fixed',
    zIndex: 1000,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'all 0.3s ease',
  };

  // Estilos del prompt de activación
  const promptStyles = {
    ...baseStyles,
    top: '80px', // Más abajo para que sea más visible
    right: '20px',
    padding: '16px 20px',
    backgroundColor: theme === 'dark' ? '#2d3748' : '#ffffff',
    border: `2px solid ${theme === 'dark' ? '#4a5568' : '#e2e8f0'}`,
    maxWidth: '400px',
    display: showPrompt ? 'block' : 'none',
    zIndex: 9999, // Asegurar que esté encima de todo
  };

  // Estilos del indicador de estado
  const statusBarStyles = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: theme === 'dark' ? '#2d3748' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#4a5568' : '#e2e8f0'}`,
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    fontSize: '14px',
    color: theme === 'dark' ? '#e2e8f0' : '#2d3748',
  };

  // Estilos de la notificación flotante
  const notificationStyles = {
    ...baseStyles,
    top: '20px',
    right: showPrompt ? '440px' : '20px',
    padding: '12px 16px',
    backgroundColor: '#48bb78',
    color: 'white',
    display: showNotification ? 'flex' : 'none',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
  };

  return (
    <>
      {/* Prompt para activar autoguardado */}
      <div style={promptStyles}>
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: theme === 'dark' ? '#e2e8f0' : '#2d3748',
          }}>
            💾 Protege tu trabajo
          </h4>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            lineHeight: '1.5',
            color: theme === 'dark' ? '#cbd5e0' : '#4a5568',
          }}>
            Activa el autoguardado para evitar perder información si se cierra la página o hay problemas de conexión.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleEnable}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#3182ce'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#4299e1'}
          >
            ✓ Activar
          </button>
          <button
            onClick={handleDismissPrompt}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: theme === 'dark' ? '#cbd5e0' : '#718096',
              border: `1px solid ${theme === 'dark' ? '#4a5568' : '#cbd5e0'}`,
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#4a5568' : '#f7fafc';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Ahora no
          </button>
        </div>
      </div>

      {/* Notificación de guardado exitoso */}
      <div style={notificationStyles}>
        <span>✓</span>
        <span>Guardado automáticamente</span>
      </div>

      {/* Barra de estado del autoguardado */}
      {isEnabled && (
        <div style={statusBarStyles}>
          {/* Indicador de estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saveStatus === 'saving' && (
              <>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#f6ad55',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
                <span style={{ fontSize: '13px' }}>Guardando...</span>
              </>
            )}
            
            {saveStatus === 'saved' && lastSaveTime && (
              <>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#48bb78',
                  }}
                />
                <span style={{ fontSize: '13px' }}>
                  Guardado {getTimeAgo(lastSaveTime)}
                </span>
              </>
            )}
            
            {saveStatus === 'error' && (
              <>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#f56565',
                  }}
                />
                <span style={{ fontSize: '13px' }}>Error al guardar</span>
              </>
            )}

            {saveStatus === 'idle' && (
              <>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#48bb78',
                  }}
                />
                <span style={{ fontSize: '13px' }}>Autoguardado activo</span>
              </>
            )}
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            {hasUnsavedChanges && (
              <button
                onClick={onSaveNow}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#4299e1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#3182ce'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#4299e1'}
                title="Guardar ahora"
              >
                💾 Guardar ahora
              </button>
            )}
            
            <button
              onClick={onDisable}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: theme === 'dark' ? '#cbd5e0' : '#718096',
                border: `1px solid ${theme === 'dark' ? '#4a5568' : '#cbd5e0'}`,
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#4a5568' : '#f7fafc';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
              title="Desactivar autoguardado"
            >
              ✕ Desactivar
            </button>
          </div>
        </div>
      )}

      {/* Estilos de animación */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </>
  );
}
