import React from 'react';
import { FaHandHoldingUsd } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import IAInteligente from './IAInteligente';
import { useTheme } from '../../context/ThemeContext';

export default function RecobroAjuste({ formData, onInputChange, numeroSeccion = '10' }) {
  const { t } = useTranslation();
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
          <FaHandHoldingUsd className="mr-3" style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }} />
          {numeroSeccion}. {t('adjustment.ui.sections.recobro.title')}
        </h2>
        <p className="mt-2" style={{ color: textSecondary }}>
          {t('adjustment.ui.sections.recobro.subtitle')}
        </p>
      </div>

      <div className="p-4 rounded-lg" style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}>
        <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
          {t('adjustment.ui.sections.recobro.label')}
        </label>
        <textarea
          value={formData.recobro || ''}
          onChange={(e) => onInputChange('recobro', e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded-md focus:outline-none resize-vertical"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            border: `1px solid ${borderColor}`
          }}
          placeholder={t('adjustment.ui.sections.recobro.placeholder')}
        />
      </div>

      <IAInteligente
        textoActual={formData.recobro || ''}
        onTextoCambiado={(texto) => onInputChange('recobro', texto)}
        contextoFormulario={formData}
        tipoSeccion="recobro"
        tituloSeccion={t('adjustment.ui.sections.recobro.iaTitle')}
      />
    </div>
  );
}
