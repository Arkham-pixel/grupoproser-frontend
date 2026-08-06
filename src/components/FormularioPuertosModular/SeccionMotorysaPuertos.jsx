import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { META_FORMATO_MOTORYSA } from './generarWordMotorysa';

export default function SeccionMotorysaPuertos({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const accent = theme === 'dark' ? '#93C5FD' : '#1D4ED8';
  const sectionBg = theme === 'dark' ? '#0F0F0F' : '#F8FAFC';

  const inputClass = 'w-full rounded px-2 py-1.5 text-sm';
  const inputStyle = {
    backgroundColor: inputBg,
    color: textPrimary,
    border: `1px solid ${borderColor}`,
  };

  const Field = ({ label, children, className = '', help }) => (
    <div className={className}>
      <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
        {label}
      </label>
      {children}
      {help ? (
        <p className="text-xs mt-1" style={{ color: textSecondary }}>
          {help}
        </p>
      ) : null}
    </div>
  );

  const Bloque = ({ titulo, children }) => (
    <div
      className="rounded p-3 mb-4"
      style={{ backgroundColor: sectionBg, border: `1px solid ${borderColor}` }}
    >
      <h4 className="text-sm font-bold mb-3" style={{ color: accent }}>
        {titulo}
      </h4>
      {children}
    </div>
  );

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${theme === 'dark' ? '#2563EB' : '#1D4ED8'}`,
      }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ color: accent }}>
          {t('ports.ui.formulario.motorysa.seccion.tituloConCodigo', {
            codigo: formData.codigoInforme || META_FORMATO_MOTORYSA.codigo,
          })}
        </h3>
        <p className="text-xs mt-1" style={{ color: textSecondary }}>
          {t('ports.ui.formulario.motorysa.seccion.descripcion')}
        </p>
      </div>

      {/* Meta fijo + asegurado */}
      <Bloque titulo={t('ports.ui.formulario.motorysa.seccion.bloqueMeta')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label={t('ports.ui.formulario.motorysa.seccion.codigoInforme')}>
            <input
              type="text"
              value={formData.codigoInforme || ''}
              onChange={(e) => onInputChange('codigoInforme', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.codigoInformePlaceholder')}
              disabled={cargando}
            />
          </Field>
          <Field label={t('ports.ui.formulario.motorysa.seccion.version')}>
            <input
              type="text"
              value={formData.versionInforme || ''}
              onChange={(e) => onInputChange('versionInforme', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.versionPlaceholder')}
              disabled={cargando}
            />
          </Field>
          <Field label={t('ports.ui.formulario.motorysa.seccion.fechaFormato')}>
            <input
              type="text"
              value={formData.fechaFormatoInforme || ''}
              onChange={(e) => onInputChange('fechaFormatoInforme', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.fechaFormatoPlaceholder')}
              disabled={cargando}
            />
          </Field>
          <Field label={t('ports.ui.formulario.motorysa.seccion.asegurado')}>
            <input
              type="text"
              value={formData.asegurado || ''}
              onChange={(e) => onInputChange('asegurado', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.aseguradoPlaceholder')}
              disabled={cargando}
            />
          </Field>
        </div>
      </Bloque>

      {/* 1. Datos del despacho */}
      <Bloque titulo={t('ports.ui.formulario.motorysa.seccion.despachoTitulo')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label={t('ports.ui.formulario.motorysa.seccion.cantidadVehiculos')}>
            <input
              type="text"
              value={formData.numeroVehiculos || formData.cantidadVehiculos || ''}
              onChange={(e) => {
                onInputChange('numeroVehiculos', e.target.value);
                onInputChange('cantidadVehiculos', e.target.value);
              }}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.cantidadVehiculosPlaceholder')}
              disabled={cargando}
            />
          </Field>
          <Field label={t('ports.ui.formulario.motorysa.seccion.marcaDespacho')}>
            <input
              type="text"
              value={formData.marcaDespacho || ''}
              onChange={(e) => onInputChange('marcaDespacho', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.marcaDespachoPlaceholder')}
              disabled={cargando}
            />
          </Field>
          <Field label={t('ports.ui.formulario.motorysa.seccion.origen')}>
            <input
              type="text"
              value={formData.origenImportacion || ''}
              onChange={(e) => onInputChange('origenImportacion', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.origenPlaceholder')}
              disabled={cargando}
            />
          </Field>
          <Field label={t('ports.ui.formulario.motorysa.seccion.fechasDescargue')}>
            <input
              type="text"
              value={formData.fechasDescargue || ''}
              onChange={(e) => onInputChange('fechasDescargue', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.fechasDescarguePlaceholder')}
              disabled={cargando}
            />
          </Field>
        </div>
        <Field
          label={t('ports.ui.formulario.motorysa.seccion.billOfLading')}
          help={t('ports.ui.formulario.motorysa.seccion.billOfLadingAyuda')}
        >
          <textarea
            value={formData.listaBLs || formData.billOfLading || ''}
            onChange={(e) => {
              onInputChange('listaBLs', e.target.value);
              onInputChange('billOfLading', e.target.value);
            }}
            rows={2}
            className="w-full rounded px-2 py-1.5 text-sm"
            style={inputStyle}
            placeholder={t('ports.ui.formulario.motorysa.seccion.billOfLadingPlaceholder')}
            disabled={cargando}
          />
        </Field>
      </Bloque>

      {/* 2. Localización */}
      <Bloque titulo={t('ports.ui.formulario.motorysa.seccion.localizacionTitulo')}>
        <Field
          label={t('ports.ui.formulario.motorysa.seccion.textoLocalizacion')}
          className="mb-3"
        >
          <textarea
            value={formData.textoLocalizacion || ''}
            onChange={(e) => onInputChange('textoLocalizacion', e.target.value)}
            rows={3}
            className="w-full rounded px-2 py-1.5 text-sm"
            style={inputStyle}
            placeholder={t('ports.ui.formulario.motorysa.seccion.textoLocalizacionPlaceholder')}
            disabled={cargando}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label={t('ports.ui.formulario.motorysa.seccion.marcaVehiculo')}>
            <input
              type="text"
              value={formData.marcaVehiculo || ''}
              onChange={(e) => onInputChange('marcaVehiculo', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.marcaVehiculoPlaceholder')}
              disabled={cargando}
            />
          </Field>
          <Field label={t('ports.ui.formulario.motorysa.seccion.patioOperacion')}>
            <input
              type="text"
              value={formData.patioOperacion || ''}
              onChange={(e) => onInputChange('patioOperacion', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.patioOperacionPlaceholder')}
              disabled={cargando}
            />
          </Field>
        </div>

        <Field
          label={t('ports.ui.formulario.motorysa.seccion.modeloVehiculo')}
          help={t('ports.ui.formulario.motorysa.seccion.modeloVehiculoAyuda')}
          className="mb-3"
        >
          <textarea
            value={formData.modelosVehiculos || ''}
            onChange={(e) => onInputChange('modelosVehiculos', e.target.value)}
            rows={3}
            className="w-full rounded px-2 py-1.5 text-sm"
            style={inputStyle}
            placeholder={t('ports.ui.formulario.motorysa.seccion.modeloVehiculoPlaceholder')}
            disabled={cargando}
          />
        </Field>

        <Field
          label={t('ports.ui.formulario.motorysa.seccion.textoEstadoVehiculos')}
          className="mb-3"
        >
          <textarea
            value={formData.textoEstadoVehiculos || ''}
            onChange={(e) => onInputChange('textoEstadoVehiculos', e.target.value)}
            rows={4}
            className="w-full rounded px-2 py-1.5 text-sm"
            style={inputStyle}
            placeholder={t('ports.ui.formulario.motorysa.seccion.textoEstadoVehiculosPlaceholder')}
            disabled={cargando}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('ports.ui.formulario.motorysa.seccion.fechasInspeccion')}>
            <input
              type="text"
              value={formData.fechasInspeccion || ''}
              onChange={(e) => onInputChange('fechasInspeccion', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.fechasInspeccionPlaceholder')}
              disabled={cargando}
            />
          </Field>
          <Field label={t('ports.ui.formulario.motorysa.seccion.inspectores')}>
            <input
              type="text"
              value={formData.inspectores || ''}
              onChange={(e) => onInputChange('inspectores', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder={t('ports.ui.formulario.motorysa.seccion.inspectoresPlaceholder')}
              disabled={cargando}
            />
          </Field>
        </div>
      </Bloque>
    </div>
  );
}
