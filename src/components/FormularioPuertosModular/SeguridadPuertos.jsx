import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function SeguridadPuertos({ formData, onInputChange, cargando }) {
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
        8. SEGURIDAD
      </h2>

      {/* Seguridad Electrónica */}
      <div className="mb-6">
        <h3 
          className="text-lg font-semibold mb-3"
          style={{ color: textPrimary }}
        >
          Seguridad Electrónica
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              Alarma Monitoreada
            </label>
            <input
              type="text"
              value={formData.alarmaMonitoreada || ''}
              onChange={(e) => onInputChange('alarmaMonitoreada', e.target.value)}
              placeholder="Sí/No - Empresa monitoreadora"
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
              CCTV
            </label>
            <input
              type="text"
              value={formData.cctv || ''}
              onChange={(e) => onInputChange('cctv', e.target.value)}
              placeholder="Cantidad de cámaras y ubicación"
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
              Mantenimiento de Seguridad
            </label>
            <textarea
              value={formData.mantenimientoSeguridad || ''}
              onChange={(e) => onInputChange('mantenimientoSeguridad', e.target.value)}
              rows={2}
              placeholder="Frecuencia y tipo de mantenimiento..."
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
              Comentarios Seguridad Electrónica
            </label>
            <textarea
              value={formData.comentariosSeguridadElectronica || ''}
              onChange={(e) => onInputChange('comentariosSeguridadElectronica', e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales..."
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

      {/* Seguridad Física */}
      <div>
        <h3 
          className="text-lg font-semibold mb-3"
          style={{ color: textPrimary }}
        >
          Seguridad Física
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              Tipo de Vigilancia
            </label>
            <input
              type="text"
              value={formData.tipoVigilancia || ''}
              onChange={(e) => onInputChange('tipoVigilancia', e.target.value)}
              placeholder="Ej: Empresa especializada, propia..."
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
              Horarios de Vigilancia
            </label>
            <input
              type="text"
              value={formData.horariosVigilancia || ''}
              onChange={(e) => onInputChange('horariosVigilancia', e.target.value)}
              placeholder="Ej: 24/7"
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
              Accesos
            </label>
            <input
              type="text"
              value={formData.accesos || ''}
              onChange={(e) => onInputChange('accesos', e.target.value)}
              placeholder="Número y tipo de accesos..."
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
              Personal de Cierre
            </label>
            <input
              type="text"
              value={formData.personalCierre || ''}
              onChange={(e) => onInputChange('personalCierre', e.target.value)}
              placeholder="Personal responsable del cierre..."
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
              Cerramiento del Predio
            </label>
            <input
              type="text"
              value={formData.cerramientoPredio || ''}
              onChange={(e) => onInputChange('cerramientoPredio', e.target.value)}
              placeholder="Tipo de cerramiento..."
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
              Otros Cerramientos
            </label>
            <input
              type="text"
              value={formData.otrosCerramiento || ''}
              onChange={(e) => onInputChange('otrosCerramiento', e.target.value)}
              placeholder="Concertinas, mallas, etc..."
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
              Comentarios Seguridad Física
            </label>
            <textarea
              value={formData.comentariosSeguridadFisica || ''}
              onChange={(e) => onInputChange('comentariosSeguridadFisica', e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales..."
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
    </div>
  );
}

