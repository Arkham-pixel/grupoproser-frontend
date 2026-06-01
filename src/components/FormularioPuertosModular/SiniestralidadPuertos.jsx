import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function SiniestralidadPuertos({ formData, onInputChange, cargando }) {
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
        9. SINIESTRALIDAD
      </h2>

      <label 
        className="block text-sm font-semibold mb-2"
        style={{ color: textPrimary }}
      >
        Historial de Siniestros y Observaciones
      </label>
      <textarea
        rows={6}
        placeholder="Describa el historial de siniestros en el puerto, eventos pasados, etc..."
        value={formData.siniestralidad || ''}
        onChange={(e) => onInputChange('siniestralidad', e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>
  );
}

