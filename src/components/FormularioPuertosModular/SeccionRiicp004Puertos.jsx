import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

export default function SeccionRiicp004Puertos({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const inputClass = 'w-full rounded px-2 py-1.5 text-sm';
  const inputStyle = {
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor,
    border: `1px solid ${borderColor}`,
  };

  const codigo = formData.codigoInforme?.trim();
  const tituloSeccion = codigo
    ? t('ports.ui.formulario.riicp004.seccion.tituloConCodigo', { codigo })
    : t('ports.ui.formulario.riicp004.seccion.tituloSinCodigo');

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${theme === 'dark' ? '#2563EB' : '#1D4ED8'}`,
      }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ color: theme === 'dark' ? '#93C5FD' : '#1D4ED8' }}>
          {tituloSeccion}
        </h3>
        <p className="text-xs mt-1" style={{ color: textSecondary }}>
          {t('ports.ui.formulario.riicp004.seccion.descripcion')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.codigoInforme')}
          </label>
          <input
            type="text"
            value={formData.codigoInforme || ''}
            onChange={(e) => onInputChange('codigoInforme', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={t('ports.ui.formulario.riicp004.seccion.codigoInformePlaceholder')}
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.asegurado')}
          </label>
          <input
            type="text"
            value={formData.asegurado || ''}
            onChange={(e) => onInputChange('asegurado', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={t('ports.ui.formulario.riicp004.seccion.aseguradoPlaceholder')}
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.patioOperacion')}
          </label>
          <input
            type="text"
            value={formData.patioOperacion || ''}
            onChange={(e) => onInputChange('patioOperacion', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={t('ports.ui.formulario.riicp004.seccion.patioOperacionPlaceholder')}
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.numeroPoliza')}
          </label>
          <input
            type="text"
            value={formData.numeroPoliza || ''}
            onChange={(e) => onInputChange('numeroPoliza', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={t('ports.ui.formulario.riicp004.seccion.numeroPolizaPlaceholder')}
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.fechaPoliza')}
          </label>
          <input
            type="date"
            value={formData.fechaPoliza || ''}
            onChange={(e) => onInputChange('fechaPoliza', e.target.value)}
            className={inputClass}
            style={inputStyle}
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.version')}
          </label>
          <input
            type="text"
            value={formData.versionInforme || '1'}
            onChange={(e) => onInputChange('versionInforme', e.target.value)}
            className={inputClass}
            style={inputStyle}
            disabled={cargando}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.fechasDescargue')}
          </label>
          <input
            type="text"
            value={formData.fechasDescargue || ''}
            onChange={(e) => onInputChange('fechasDescargue', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={t('ports.ui.formulario.riicp004.seccion.fechasDescarguePlaceholder')}
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.inspectores')}
          </label>
          <input
            type="text"
            value={formData.inspectores || ''}
            onChange={(e) => onInputChange('inspectores', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={t('ports.ui.formulario.riicp004.seccion.inspectoresPlaceholder')}
            disabled={cargando}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
          {t('ports.ui.formulario.riicp004.seccion.billOfLading')}
        </label>
        <textarea
          value={formData.listaBLs || formData.billOfLading || ''}
          onChange={(e) => {
            onInputChange('listaBLs', e.target.value);
            onInputChange('billOfLading', e.target.value);
          }}
          rows={3}
          className="w-full rounded px-2 py-1.5 text-sm"
          style={inputStyle}
          disabled={cargando}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.origenProcedencia')}
          </label>
          <input
            type="text"
            value={formData.origenImportacion || ''}
            onChange={(e) => onInputChange('origenImportacion', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={t('ports.ui.formulario.riicp004.seccion.origenProcedenciaPlaceholder')}
            disabled={cargando}
          />
          <p className="text-xs mt-1" style={{ color: textSecondary }}>
            {t('ports.ui.formulario.riicp004.seccion.origenProcedenciaAyuda')}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.seccion.fechasInspeccion')}
          </label>
          <input
            type="text"
            value={formData.fechasInspeccion || ''}
            onChange={(e) => onInputChange('fechasInspeccion', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={t('ports.ui.formulario.riicp004.seccion.fechasInspeccionPlaceholder')}
            disabled={cargando}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
          {t('ports.ui.formulario.riicp004.seccion.modelosVehiculos')}
        </label>
        <input
          type="text"
          value={formData.modelosVehiculos || ''}
          onChange={(e) => onInputChange('modelosVehiculos', e.target.value)}
          className={inputClass}
          style={inputStyle}
          disabled={cargando}
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
          {t('ports.ui.formulario.riicp004.seccion.textoObservaciones')}
        </label>
        <textarea
          value={formData.textoObservacionesGeneral || ''}
          onChange={(e) => onInputChange('textoObservacionesGeneral', e.target.value)}
          rows={4}
          className="w-full rounded px-2 py-1.5 text-sm"
          style={inputStyle}
          placeholder={t('ports.ui.formulario.riicp004.seccion.textoObservacionesPlaceholder')}
          disabled={cargando}
        />
        <p className="text-xs mt-1" style={{ color: textSecondary }}>
          {t('ports.ui.formulario.riicp004.seccion.textoObservacionesAyuda')}
        </p>
      </div>
    </div>
  );
}
