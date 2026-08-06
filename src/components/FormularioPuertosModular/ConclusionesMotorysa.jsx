import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

/** Sección 5 — CONCLUSIONES (Motorysa) */
export default function ConclusionesMotorysa({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
        border: `2px solid ${theme === 'dark' ? '#DC2626' : '#DC2626'}`,
      }}
    >
      <h3 className="text-lg font-bold mb-3" style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}>
        {t('ports.ui.formulario.motorysa.conclusiones.titulo')}
      </h3>
      <textarea
        value={formData.conclusiones || ''}
        onChange={(e) => onInputChange('conclusiones', e.target.value)}
        rows={4}
        className="w-full rounded px-3 py-2 text-sm"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          border: `1px solid ${borderColor}`,
        }}
        placeholder={t('ports.ui.formulario.motorysa.conclusiones.placeholder')}
        disabled={cargando}
      />
      <p className="text-xs mt-1" style={{ color: textSecondary }}>
        {t('ports.ui.formulario.motorysa.conclusiones.ayuda')}
      </p>
    </div>
  );
}
