import React from 'react';
import {
  puertosCard,
  puertosCardHeader,
  puertosCardBody,
  puertosInput,
  puertosLabel,
  puertosSectionTitle,
} from './puertosFenixUi';

export const inputCls = puertosInput;

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
  const handle = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="space-y-5">
      <Seccion titulo="Identificación del caso">
        <Campo label="Consecutivo">
          <input
            className={inputCls}
            name="consecutivo"
            value={formData.consecutivo || ''}
            onChange={handle}
            placeholder="Se genera al guardar si está vacío"
          />
        </Campo>
        <Campo label="Número de solicitud">
          <input
            className={inputCls}
            name="numeroSolicitud"
            value={formData.numeroSolicitud || ''}
            onChange={handle}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Cliente y responsable (patrón Complex)">
        <Campo label="Cliente (aseguradora)" obligatorio>
          <select
            className={inputCls}
            name="codiAsgrdra"
            value={formData.codiAsgrdra || ''}
            onChange={handle}
          >
            <option value="">Seleccionar cliente</option>
            {aseguradoraOptions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Responsable del caso">
          <select
            className={inputCls}
            name="codiRespnsble"
            value={formData.codiRespnsble || ''}
            onChange={handle}
          >
            <option value="">Seleccionar responsable</option>
            {responsables.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Campo>
      </Seccion>

      <Seccion titulo="Exportador y operación">
        <Campo label="Nombre o razón social del exportador" obligatorio>
          <input
            className={inputCls}
            name="asgrBenfcro"
            value={formData.asgrBenfcro || ''}
            onChange={handle}
          />
        </Campo>
        <Campo label="Actividad / mercancía">
          <input className={inputCls} name="actividad" value={formData.actividad || ''} onChange={handle} />
        </Campo>
        <Campo label="Ciudad del riesgo / puerto">
          <input
            className={inputCls}
            name="ciudadRiesgo"
            value={formData.ciudadRiesgo || ''}
            onChange={handle}
          />
        </Campo>
        <Campo label="Lugar de la operación">
          <input className={inputCls} name="lugar" value={formData.lugar || ''} onChange={handle} />
        </Campo>
        <Campo label="Labor realizada" className="sm:col-span-2">
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
