import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

export default function SeguridadPuertos({ formData, onInputChange, cargando }) {
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
        {t('ports.ui.formulario.seguridad.titulo')}
      </h2>

      <div className="mb-6">
        <h3
          className="text-lg font-semibold mb-3"
          style={{ color: textPrimary }}
        >
          {t('ports.ui.formulario.seguridad.seguridadElectronica')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              {t('ports.ui.formulario.seguridad.alarmaMonitoreada')}
            </label>
            <input
              type="text"
              value={formData.alarmaMonitoreada || ''}
              onChange={(e) => onInputChange('alarmaMonitoreada', e.target.value)}
              placeholder={t('ports.ui.formulario.seguridad.alarmaMonitoreadaPlaceholder')}
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
              {t('ports.ui.formulario.seguridad.cctv')}
            </label>
            <input
              type="text"
              value={formData.cctv || ''}
              onChange={(e) => onInputChange('cctv', e.target.value)}
              placeholder={t('ports.ui.formulario.seguridad.cctvPlaceholder')}
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
              {t('ports.ui.formulario.seguridad.mantenimientoSeguridad')}
            </label>
            <textarea
              value={formData.mantenimientoSeguridad || ''}
              onChange={(e) => onInputChange('mantenimientoSeguridad', e.target.value)}
              rows={2}
              placeholder={t('ports.ui.formulario.seguridad.mantenimientoSeguridadPlaceholder')}
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
              {t('ports.ui.formulario.seguridad.comentariosSeguridadElectronica')}
            </label>
            <textarea
              value={formData.comentariosSeguridadElectronica || ''}
              onChange={(e) => onInputChange('comentariosSeguridadElectronica', e.target.value)}
              rows={3}
              placeholder={t('ports.ui.formulario.seguridad.observacionesAdicionales')}
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

      <div>
        <h3
          className="text-lg font-semibold mb-3"
          style={{ color: textPrimary }}
        >
          {t('ports.ui.formulario.seguridad.seguridadFisica')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              {t('ports.ui.formulario.seguridad.tipoVigilancia')}
            </label>
            <input
              type="text"
              value={formData.tipoVigilancia || ''}
              onChange={(e) => onInputChange('tipoVigilancia', e.target.value)}
              placeholder={t('ports.ui.formulario.seguridad.tipoVigilanciaPlaceholder')}
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
              {t('ports.ui.formulario.seguridad.horariosVigilancia')}
            </label>
            <input
              type="text"
              value={formData.horariosVigilancia || ''}
              onChange={(e) => onInputChange('horariosVigilancia', e.target.value)}
              placeholder={t('ports.ui.formulario.seguridad.horariosVigilanciaPlaceholder')}
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
              {t('ports.ui.formulario.seguridad.accesos')}
            </label>
            <input
              type="text"
              value={formData.accesos || ''}
              onChange={(e) => onInputChange('accesos', e.target.value)}
              placeholder={t('ports.ui.formulario.seguridad.accesosPlaceholder')}
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
              {t('ports.ui.formulario.seguridad.personalCierre')}
            </label>
            <input
              type="text"
              value={formData.personalCierre || ''}
              onChange={(e) => onInputChange('personalCierre', e.target.value)}
              placeholder={t('ports.ui.formulario.seguridad.personalCierrePlaceholder')}
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
              {t('ports.ui.formulario.seguridad.cerramientoPredio')}
            </label>
            <input
              type="text"
              value={formData.cerramientoPredio || ''}
              onChange={(e) => onInputChange('cerramientoPredio', e.target.value)}
              placeholder={t('ports.ui.formulario.seguridad.cerramientoPredioPlaceholder')}
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
              {t('ports.ui.formulario.seguridad.otrosCerramientos')}
            </label>
            <input
              type="text"
              value={formData.otrosCerramiento || ''}
              onChange={(e) => onInputChange('otrosCerramiento', e.target.value)}
              placeholder={t('ports.ui.formulario.seguridad.otrosCerramientosPlaceholder')}
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
              {t('ports.ui.formulario.seguridad.comentariosSeguridadFisica')}
            </label>
            <textarea
              value={formData.comentariosSeguridadFisica || ''}
              onChange={(e) => onInputChange('comentariosSeguridadFisica', e.target.value)}
              rows={3}
              placeholder={t('ports.ui.formulario.seguridad.observacionesAdicionales')}
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
