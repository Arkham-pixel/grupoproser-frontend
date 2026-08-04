import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import FormularioAreas from '../SubcomponenteFRiesgo/FormularioAreas';

export default function MaquinariaPuertos({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
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
        {t('ports.ui.formulario.maquinaria.titulo')}
      </h2>

      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        {t('ports.ui.formulario.maquinaria.descripcion')}
      </label>
      <textarea
        rows={8}
        placeholder={t('ports.ui.formulario.maquinaria.descripcionPlaceholder')}
        value={formData.maquinariaDescripcion || ''}
        onChange={(e) => onInputChange('maquinariaDescripcion', e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />

      {/* Componente de áreas y equipos */}
      <div className="mt-6">
        <FormularioAreas 
          onChange={(areas) => onInputChange('datosEquipos', areas)} 
          areasIniciales={formData.datosEquipos}
        />
      </div>
    </div>
  );
}
