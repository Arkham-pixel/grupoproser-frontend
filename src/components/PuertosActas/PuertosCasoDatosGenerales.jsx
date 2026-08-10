/* eslint-disable react-refresh/only-export-components */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SelectBuscable from '../SelectBuscable';
import {
  puertosCard,
  puertosCardHeader,
  puertosCardBody,
  puertosInput,
  puertosLabel,
  puertosSectionTitle,
} from './puertosFenixUi';

export const inputCls = puertosInput;

const clsSoloLectura = 'bg-gray-50 cursor-default dark:bg-gray-900/60';

export function attrsInput(soloLectura, props = {}) {
  if (!soloLectura) return props;
  return {
    ...props,
    readOnly: true,
    className: props.className ? `${props.className} ${clsSoloLectura}` : `${inputCls} ${clsSoloLectura}`,
  };
}

export function attrsSelect(soloLectura, props = {}) {
  if (!soloLectura) return props;
  return {
    ...props,
    disabled: true,
    className: props.className ? `${props.className} ${clsSoloLectura}` : `${inputCls} ${clsSoloLectura}`,
  };
}

export function attrsTextarea(soloLectura, props = {}) {
  return attrsInput(soloLectura, props);
}

export function Seccion({ titulo, children, cols = 2 }) {
  const gridCls =
    cols === 1
      ? 'grid-cols-1'
      : cols === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2';
  return (
    <section className={puertosCard}>
      <header className={puertosCardHeader}>
        <h3 className={puertosSectionTitle}>{titulo}</h3>
      </header>
      <div className={`${puertosCardBody} grid ${gridCls} gap-4`}>{children}</div>
    </section>
  );
}

export function Campo({ label, obligatorio = false, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className={puertosLabel}>
        {label}
        {obligatorio && <span className="ml-0.5 text-fenix-primario">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function PuertosCasoDatosGenerales({
  formData,
  onChange,
  aseguradoraOptions = [],
  responsables = [],
}) {
  const { t } = useTranslation();

  const handle = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  const opcionesCliente = useMemo(
    () => aseguradoraOptions.map((a) => ({ value: a.value, label: a.label })),
    [aseguradoraOptions]
  );
  const opcionesResponsable = useMemo(
    () => responsables.map((r) => ({ value: r.value, label: r.label })),
    [responsables]
  );

  return (
    <div className="space-y-5">
      <Seccion titulo={t('ports.ui.casoExportacion.datosGenerales.identificacionTitle')}>
        <Campo label={t('ports.ui.casoExportacion.portada.consecutivo')}>
          <input
            className={inputCls}
            name="consecutivo"
            value={formData.consecutivo || ''}
            onChange={handle}
            placeholder={t('ports.ui.casoExportacion.datosGenerales.consecutivoPlaceholder')}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.portada.numeroSolicitud')}>
          <input
            className={inputCls}
            name="numeroSolicitud"
            value={formData.numeroSolicitud || ''}
            onChange={handle}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.casoExportacion.datosGenerales.clienteResponsableTitle')}>
        <Campo label={t('ports.ui.casoExportacion.portada.cliente')} obligatorio>
          <SelectBuscable
            options={opcionesCliente}
            value={formData.codiAsgrdra || ''}
            onChange={(v) => onChange('codiAsgrdra', v)}
            placeholder={t('ports.ui.casoExportacion.datosGenerales.selectCliente')}
            searchPlaceholder={t('ports.ui.common.searchList')}
            noResultsText={t('ports.ui.common.noResults')}
            buttonClassName={inputCls}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.responsableCaso')}>
          <SelectBuscable
            options={opcionesResponsable}
            value={formData.codiRespnsble || ''}
            onChange={(v) => onChange('codiRespnsble', v)}
            placeholder={t('ports.ui.casoExportacion.datosGenerales.selectResponsable')}
            searchPlaceholder={t('ports.ui.common.searchList')}
            noResultsText={t('ports.ui.common.noResults')}
            buttonClassName={inputCls}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.casoExportacion.datosGenerales.exportadorOperacionTitle')}>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.exportadorNombre')} obligatorio>
          <input
            className={inputCls}
            name="asgrBenfcro"
            value={formData.asgrBenfcro || ''}
            onChange={handle}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.actividadMercancia')}>
          <input className={inputCls} name="actividad" value={formData.actividad || ''} onChange={handle} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.ciudadPuerto')}>
          <input
            className={inputCls}
            name="ciudadRiesgo"
            value={formData.ciudadRiesgo || ''}
            onChange={handle}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.lugarOperacion')}>
          <input className={inputCls} name="lugar" value={formData.lugar || ''} onChange={handle} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.laborRealizada')} className="sm:col-span-2">
          <input
            className={inputCls}
            name="laborRealizada"
            value={formData.laborRealizada || ''}
            onChange={handle}
          />
        </Campo>
      </Seccion>
    </div>
  );
}
