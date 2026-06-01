import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Diálogo para restaurar datos guardados automáticamente
 * Se muestra cuando hay datos guardados disponibles
 */
export default function AutoSaveRestoreDialog({
  isOpen,
  savedData,
  metadata,
  onRestore,
  onDiscard,
  onCancel,
}) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  // Formatear fecha de guardado
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  // Obtener tiempo transcurrido
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    const now = new Date();
    const saved = new Date(dateString);
    const diff = Math.floor((now - saved) / 1000); // segundos
    
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
    return `hace ${Math.floor(diff / 86400)} días`;
  };

  // Contar campos llenados
  const countFilledFields = (data) => {
    if (!data) return 0;
    
    return Object.values(data).filter(value => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    }).length;
  };

  const filledFields = countFilledFields(savedData);
  const savedAt = metadata?.savedAt;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          backdropFilter: 'blur(4px)',
        }}
        onClick={onCancel}
      />

      {/* Diálogo */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: theme === 'dark' ? '#2d3748' : '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: '500px',
          width: '90%',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${theme === 'dark' ? '#4a5568' : '#e2e8f0'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#4299e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              💾
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: theme === 'dark' ? '#e2e8f0' : '#2d3748',
                }}
              >
                Datos guardados encontrados
              </h3>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: theme === 'dark' ? '#a0aec0' : '#718096',
                }}
              >
                {savedAt && getTimeAgo(savedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ padding: '24px' }}>
          <div
            style={{
              backgroundColor: theme === 'dark' ? '#1a202c' : '#f7fafc',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '14px',
                  color: theme === 'dark' ? '#cbd5e0' : '#4a5568',
                  marginBottom: '4px',
                }}
              >
                📊 Información guardada
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: theme === 'dark' ? '#e2e8f0' : '#2d3748',
                }}
              >
                {filledFields} campos completados
              </div>
            </div>

            {savedAt && (
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    color: theme === 'dark' ? '#cbd5e0' : '#4a5568',
                    marginBottom: '4px',
                  }}
                >
                  🕐 Última actualización
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: theme === 'dark' ? '#a0aec0' : '#718096',
                  }}
                >
                  {formatDate(savedAt)}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#edf2f7',
              borderLeft: '4px solid #4299e1',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#2d3748',
                lineHeight: '1.5',
              }}
            >
              <strong>💡 ¿Qué deseas hacer?</strong>
              <br />
              Puedes restaurar el progreso guardado o descartarlo para empezar de nuevo.
            </p>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onRestore}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#3182ce'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4299e1'}
            >
              <span>✓</span>
              <span>Restaurar datos</span>
            </button>

            <button
              onClick={onDiscard}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: '#e53e3e',
                border: '2px solid #e53e3e',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e53e3e';
                e.target.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#e53e3e';
              }}
            >
              <span>🗑️</span>
              <span>Descartar</span>
            </button>
          </div>

          <button
            onClick={onCancel}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
              backgroundColor: 'transparent',
              color: theme === 'dark' ? '#cbd5e0' : '#718096',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#4a5568' : '#f7fafc';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Decidir después
          </button>
        </div>
      </div>
    </>
  );
}
