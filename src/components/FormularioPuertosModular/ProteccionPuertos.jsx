import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function ProteccionPuertos({ formData, onInputChange, cargando }) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  return (
    <div 
      className="mt-8 p-6 rounded shadow-sm"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <h2 
        className="text-xl font-bold mb-4"
        style={{ color: textPrimary }}
      >
        7. PROTECCIÓN CONTRA INCENDIOS
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Extintores
          </label>
          <textarea
            value={formData.extintor || ''}
            onChange={(e) => onInputChange('extintor', e.target.value)}
            rows={3}
            placeholder="Descripción de extintores disponibles..."
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            RCI (Red Contra Incendios)
          </label>
          <textarea
            value={formData.rci || ''}
            onChange={(e) => onInputChange('rci', e.target.value)}
            rows={3}
            placeholder="Descripción de la red contra incendios..."
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Rociadores
          </label>
          <textarea
            value={formData.rociadores || ''}
            onChange={(e) => onInputChange('rociadores', e.target.value)}
            rows={3}
            placeholder="Sistema de rociadores automáticos..."
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Detección
          </label>
          <textarea
            value={formData.deteccion || ''}
            onChange={(e) => onInputChange('deteccion', e.target.value)}
            rows={3}
            placeholder="Sistemas de detección de incendios..."
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Alarmas
          </label>
          <textarea
            value={formData.alarmas || ''}
            onChange={(e) => onInputChange('alarmas', e.target.value)}
            rows={3}
            placeholder="Sistema de alarmas..."
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Brigadas
          </label>
          <textarea
            value={formData.brigadas || ''}
            onChange={(e) => onInputChange('brigadas', e.target.value)}
            rows={3}
            placeholder="Brigadas de emergencia..."
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div className="md:col-span-2">
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Bomberos / Distancia
          </label>
          <input
            type="text"
            value={formData.bomberos || ''}
            onChange={(e) => onInputChange('bomberos', e.target.value)}
            placeholder="Ej: Estación de bomberos a 5km..."
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>
      </div>
    </div>
  );
}

