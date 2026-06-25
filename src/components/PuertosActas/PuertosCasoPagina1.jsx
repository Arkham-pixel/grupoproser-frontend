import React, { useEffect } from 'react';
import { Seccion, Campo, inputCls, attrsInput, attrsSelect } from './PuertosCasoDatosGenerales';

export default function PuertosCasoPagina1({
  formData,
  onChange,
  aseguradoraOptions = [],
  soloLectura = false,
}) {
  const handle = (e) => {
    onChange(e.target.name, e.target.value);
  };

  useEffect(() => {
    if (soloLectura) return;
    if (!formData.creadoPor && typeof localStorage !== 'undefined') {
      const nombre = localStorage.getItem('nombre') || localStorage.getItem('login') || '';
      if (nombre) onChange('creadoPor', nombre);
    }
  }, [formData.creadoPor, onChange, soloLectura]);

  const labelCliente =
    aseguradoraOptions.find((a) => a.value === formData.codiAsgrdra)?.label ||
    formData.nombreAseguradora ||
    '';

  return (
    <div className="space-y-5">
      <Seccion titulo="Portada">
        <Campo label="Número de solicitud">
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              name: 'numeroSolicitud',
              value: formData.numeroSolicitud || '',
              onChange: handle,
              placeholder: '38756933434988',
            })}
          />
        </Campo>
        <Campo label="Cliente (aseguradora)" obligatorio>
          <select
            {...attrsSelect(soloLectura, {
              className: inputCls,
              name: 'codiAsgrdra',
              value: formData.codiAsgrdra || '',
              onChange: handle,
            })}
          >
            <option value="">Seleccionar</option>
            {aseguradoraOptions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Campo>
        {labelCliente && (
          <Campo label="Nombre en portada">
            <input className={inputCls} readOnly value={labelCliente.toUpperCase()} />
          </Campo>
        )}
        <Campo label="Creado por">
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              name: 'creadoPor',
              value: formData.creadoPor || '',
              onChange: handle,
            })}
          />
        </Campo>
        <Campo label="Email">
          <input
            {...attrsInput(soloLectura, {
              type: 'email',
              className: inputCls,
              name: 'emailCreador',
              value: formData.emailCreador || '',
              onChange: handle,
              placeholder: 'mnavarro@proserpuertos.com.co',
            })}
          />
        </Campo>
        <Campo label="Fecha del informe">
          <input
            {...attrsInput(soloLectura, {
              type: 'date',
              className: inputCls,
              name: 'fechaInforme',
              value: formData.fechaInforme || '',
              onChange: handle,
            })}
          />
        </Campo>
        <Campo label="Departamento" className="sm:col-span-2">
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              name: 'departamentoInforme',
              value: formData.departamentoInforme || '',
              onChange: handle,
            })}
          />
        </Campo>
        <Campo label="Consecutivo">
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              name: 'consecutivo',
              value: formData.consecutivo || '',
              onChange: handle,
              placeholder: 'BT618574/2026 — se genera al guardar si está vacío',
            })}
          />
        </Campo>
      </Seccion>
    </div>
  );
}
