import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

export default function ProteccionPuertos({ formData, onInputChange, cargando }) {
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
        {t('ports.ui.formulario.proteccion.titulo')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.proteccion.extintores')}
          </label>
          <textarea
            value={formData.extintor || ''}
            onChange={(e) => onInputChange('extintor', e.target.value)}
            rows={3}
            placeholder={t('ports.ui.formulario.proteccion.extintoresPlaceholder')}
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
            {t('ports.ui.formulario.proteccion.rci')}
          </label>
          <textarea
            value={formData.rci || ''}
            onChange={(e) => onInputChange('rci', e.target.value)}
            rows={3}
            placeholder={t('ports.ui.formulario.proteccion.rciPlaceholder')}
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
            {t('ports.ui.formulario.proteccion.rociadores')}
          </label>
          <textarea
            value={formData.rociadores || ''}
            onChange={(e) => onInputChange('rociadores', e.target.value)}
            rows={3}
            placeholder={t('ports.ui.formulario.proteccion.rociadoresPlaceholder')}
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
            {t('ports.ui.formulario.proteccion.deteccion')}
          </label>
          <textarea
            value={formData.deteccion || ''}
            onChange={(e) => onInputChange('deteccion', e.target.value)}
            rows={3}
            placeholder={t('ports.ui.formulario.proteccion.deteccionPlaceholder')}
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
            {t('ports.ui.formulario.proteccion.alarmas')}
          </label>
          <textarea
            value={formData.alarmas || ''}
            onChange={(e) => onInputChange('alarmas', e.target.value)}
            rows={3}
            placeholder={t('ports.ui.formulario.proteccion.alarmasPlaceholder')}
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
            {t('ports.ui.formulario.proteccion.brigadas')}
          </label>
          <textarea
            value={formData.brigadas || ''}
            onChange={(e) => onInputChange('brigadas', e.target.value)}
            rows={3}
            placeholder={t('ports.ui.formulario.proteccion.brigadasPlaceholder')}
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
            {t('ports.ui.formulario.proteccion.bomberos')}
          </label>
          <input
            type="text"
            value={formData.bomberos || ''}
            onChange={(e) => onInputChange('bomberos', e.target.value)}
            placeholder={t('ports.ui.formulario.proteccion.bomberosPlaceholder')}
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
