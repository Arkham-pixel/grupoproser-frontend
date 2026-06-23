import React from 'react';
import { Seccion, Campo, inputCls } from './PuertosCasoDatosGenerales';

export default function PuertosCasoPagina2({
  formData,
  onChange,
  onInformeChange,
  responsables = [],
}) {
  const handle = (e) => {
    onChange(e.target.name, e.target.value);
  };

  const informe = formData.informeExportacion || {};

  return (
    <div className="space-y-5">
      <Seccion titulo="Datos generales">
        <Campo label="Nombre o razón social (exportador)" obligatorio>
          <input className={inputCls} name="asgrBenfcro" value={formData.asgrBenfcro || ''} onChange={handle} />
        </Campo>
        <Campo label="Actividad">
          <input
            className={inputCls}
            name="actividad"
            value={formData.actividad || ''}
            onChange={handle}
            placeholder="ELABORACIÓN DE PRODUCTOS DE MOLINERÍA"
          />
        </Campo>
        <Campo label="Solicitado por">
          <input
            className={inputCls}
            name="funcAsgrdraNombre"
            value={formData.funcAsgrdraNombre || ''}
            onChange={handle}
            placeholder="ING. CARLOS BARRIOS G – JORGE RUÍZ, PRECOCIDOS DEL ORIENTE"
          />
        </Campo>
        <Campo label="Fecha asignación">
          <input type="date" className={inputCls} name="fchaAsgncion" value={formData.fchaAsgncion || ''} onChange={handle} />
        </Campo>
        <Campo label="Ciudad del riesgo">
          <input
            className={inputCls}
            name="ciudadRiesgo"
            value={formData.ciudadRiesgo || ''}
            onChange={handle}
            placeholder="BARRANQUILLA, ATLÁNTICO"
          />
        </Campo>
        <Campo label="Labor realizada">
          <input className={inputCls} name="laborRealizada" value={formData.laborRealizada || ''} onChange={handle} />
        </Campo>
        <Campo label="Lugar" className="sm:col-span-2">
          <input
            className={inputCls}
            name="lugar"
            value={formData.lugar || ''}
            onChange={handle}
            placeholder="SPRB PATIO 14 ENMALLADO DE EXPORTACIÓN – BODEGA 9"
          />
        </Campo>
        <Campo label="Fecha inspección">
          <input type="date" className={inputCls} name="fchaInspccion" value={formData.fchaInspccion || ''} onChange={handle} />
        </Campo>
        <Campo label="Inspector" obligatorio>
          <select className={inputCls} name="codiRespnsble" value={formData.codiRespnsble || ''} onChange={handle}>
            <option value="">Seleccionar inspector</option>
            {responsables.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Campo>
      </Seccion>

      <Seccion titulo="1. Introducción" cols={1}>
        <Campo label="Párrafo principal">
          <textarea
            className={`${inputCls} min-h-[140px]`}
            value={informe.introduccion || ''}
            onChange={(e) => onInformeChange('introduccion', e.target.value)}
            placeholder="Por instrucciones de Seguros Bolívar S.A., Proserpuertos Ltda. ha sido nominada para..."
          />
        </Campo>
        <Campo label="Propósito de la supervisión">
          <textarea
            className={`${inputCls} min-h-[100px]`}
            value={informe.proposito || ''}
            onChange={(e) => onInformeChange('proposito', e.target.value)}
            placeholder="El propósito de esta supervisión, control de descargue y recibo, es realizar inspección de riesgos..."
          />
        </Campo>
      </Seccion>
    </div>
  );
}
