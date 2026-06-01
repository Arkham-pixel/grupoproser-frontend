import React from 'react';
import { FaBoxOpen } from 'react-icons/fa';
import IAInteligente from './IAInteligente';
import { useTheme } from '../../context/ThemeContext';

export default function SalvamentosAjuste({ formData, onInputChange, numeroSeccion = '9' }) {
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  return (
    <div className="space-y-6">
      <div className="pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <h2 className="text-2xl font-bold flex items-center" style={{ color: textPrimary }}>
          <FaBoxOpen className="mr-3" style={{ color: theme === 'dark' ? '#FDBA74' : '#EA580C' }} />
          {numeroSeccion}. SALVAMENTOS
        </h2>
        <p className="mt-2" style={{ color: textSecondary }}>
          Bienes recuperables, venta de salvamento y disposición de restos
        </p>
      </div>

      <div className="p-4 rounded-lg" style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}>
        <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
          Salvamentos
        </label>
        <textarea
          value={formData.salvamentos || ''}
          onChange={(e) => onInputChange('salvamentos', e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded-md focus:outline-none resize-vertical"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Describe los salvamentos identificados, su estado y las acciones recomendadas..."
        />
      </div>

      <IAInteligente
        textoActual={formData.salvamentos || ''}
        onTextoCambiado={(texto) => onInputChange('salvamentos', texto)}
        contextoFormulario={formData}
        tipoSeccion="salvamentos"
        tituloSeccion="Salvamentos"
      />
    </div>
  );
}
