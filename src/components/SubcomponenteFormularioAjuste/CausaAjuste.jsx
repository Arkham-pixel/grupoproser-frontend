import React from 'react';
import { FaSearch } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import IAInteligente from './IAInteligente';
import { useTheme } from '../../context/ThemeContext';

export default function CausaAjuste({ formData, onInputChange, numeroSeccion = 5 }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const sectionYellowBg = theme === 'dark' ? 'rgba(234, 179, 8, 0.15)' : '#FEF9C3';
  const sectionYellowText = theme === 'dark' ? '#FDE047' : '#854D0E';
  const sectionYellowBorder = theme === 'dark' ? 'rgba(234, 179, 8, 0.3)' : '#FDE047';
  
  return (
    <div className="space-y-6">
      <div 
        className="pb-4"
        style={{
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-2xl font-bold flex items-center"
          style={{ color: textPrimary }}
        >
          <FaSearch 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#A78BFA' : '#6366F1' }}
          />
          {numeroSeccion}. {t('adjustment.ui.sections.causa.title')}
        </h2>
        <p 
          className="mt-2"
          style={{ color: textSecondary }}
        >
          {t('adjustment.ui.sections.causa.subtitle')}
        </p>
      </div>

      {/* Campo de texto principal */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          {t('adjustment.ui.sections.causa.label')}
        </label>
        <textarea
          value={formData.causa || ''}
          onChange={(e) => onInputChange('causa', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-md focus:outline-none resize-vertical"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder={t('adjustment.ui.sections.causa.placeholder')}
        />
        <div 
          className="mt-2 text-sm"
          style={{ color: textSecondary }}
        >
          {t('adjustment.ui.sections.causa.minWords')}
        </div>
      </div>

      {/* IA Inteligente */}
      <IAInteligente
        textoActual={formData.causa || ''}
        onTextoCambiado={(texto) => onInputChange('causa', texto)}
        contextoFormulario={formData}
        tipoSeccion="causa"
        tituloSeccion={t('adjustment.ui.sections.causa.iaTitle')}
      />

      {/* Validación de calidad */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: sectionYellowBg,
          border: `1px solid ${sectionYellowBorder}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: sectionYellowText }}
        >
          📊 {t('adjustment.ui.sections.causa.qualityTitle')}
        </h3>
        <div 
          className="text-sm"
          style={{ color: sectionYellowText }}
        >
          <p className="mb-2">
            <strong>{t('adjustment.ui.sections.causa.qualityIntro')}</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>{t('adjustment.ui.sections.causa.tip1')}</li>
            <li>{t('adjustment.ui.sections.causa.tip2')}</li>
            <li>{t('adjustment.ui.sections.causa.tip3')}</li>
            <li>{t('adjustment.ui.sections.causa.tip4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
