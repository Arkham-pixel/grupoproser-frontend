import React from 'react';
import { Seccion, Campo, inputCls } from './PuertosCasoDatosGenerales';

const ETAPAS = [
  { fecha: 'fchaAsgncion', obs: 'obseContIni', titulo: 'Asignación / Contacto inicial' },
  { fecha: 'fchaCoordInspeccion', obs: 'obseCoordInspeccion', titulo: 'Coordinación de inspección' },
  { fecha: 'fchaProgInspeccion', obs: null, titulo: 'Programación' },
  { fecha: 'fchaInspccion', obs: 'obseInspccion', titulo: 'Inspección en puerto' },
  { fecha: 'fchaInfoFnal', obs: 'obseInfoFnal', titulo: 'Entrega de informe' },
  { fecha: 'fchaFactra', obs: null, titulo: 'Facturación' },
];

export default function PuertosCasoTrazabilidad({ formData, onChange }) {
  const handle = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="space-y-5">
      <p className="font-body text-sm text-gray-600 dark:text-gray-400">
        Misma lógica de trazabilidad que Complex: fechas por etapa para seguimiento del caso.
      </p>
      {ETAPAS.map(({ fecha, obs, titulo }) => (
        <Seccion key={fecha} titulo={titulo}>
          <Campo label="Fecha">
            <input type="date" className={inputCls} name={fecha} value={formData[fecha] || ''} onChange={handle} />
          </Campo>
          {obs && (
            <Campo label="Observaciones">
              <textarea
                className={`${inputCls} min-h-[72px]`}
                name={obs}
                value={formData[obs] || ''}
                onChange={handle}
              />
            </Campo>
          )}
        </Seccion>
      ))}
      <Seccion titulo="Seguimiento general">
        <Campo label="Observaciones de seguimiento" className="sm:col-span-2">
          <textarea
            className={`${inputCls} min-h-[100px]`}
            name="obseSegmnto"
            value={formData.obseSegmnto || ''}
            onChange={handle}
          />
        </Campo>
      </Seccion>
    </div>
  );
}
