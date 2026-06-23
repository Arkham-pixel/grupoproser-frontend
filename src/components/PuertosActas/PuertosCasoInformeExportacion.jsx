import React from 'react';
import { Seccion, Campo, inputCls } from './PuertosCasoDatosGenerales';

export default function PuertosCasoInformeExportacion({ formData, onInformeChange, onNestedChange }) {
  const buque = formData.informeExportacion?.buque || {};
  const intro = formData.informeExportacion?.introduccion || '';
  const conclusiones = formData.informeExportacion?.conclusiones || '';

  const setBuque = (campo, valor) => {
    onNestedChange('informeExportacion', {
      ...formData.informeExportacion,
      buque: { ...buque, [campo]: valor },
    });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Informe de exportación (formato Precocidos del Oriente). Se ampliará con tablas de mercancía,
        seguimiento de contenedores y registro fotográfico.
      </p>

      <Seccion titulo="Introducción" cols={1}>
        <Campo label="Texto introductorio">
          <textarea
            className={`${inputCls} min-h-[120px]`}
            value={intro}
            onChange={(e) => onInformeChange('introduccion', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Particularidades del buque">
        <Campo label="Nombre motonave">
          <input
            className={inputCls}
            value={buque.nombre || ''}
            onChange={(e) => setBuque('nombre', e.target.value)}
          />
        </Campo>
        <Campo label="Puerto de embarque">
          <input
            className={inputCls}
            value={buque.puertoEmbarque || ''}
            onChange={(e) => setBuque('puertoEmbarque', e.target.value)}
          />
        </Campo>
        <Campo label="Puerto de descargue">
          <input
            className={inputCls}
            value={buque.puertoDescargue || ''}
            onChange={(e) => setBuque('puertoDescargue', e.target.value)}
          />
        </Campo>
        <Campo label="Fecha de arribo">
          <input
            type="date"
            className={inputCls}
            value={buque.fechaArribo || ''}
            onChange={(e) => setBuque('fechaArribo', e.target.value)}
          />
        </Campo>
        <Campo label="IMO">
          <input
            className={inputCls}
            value={buque.imo || ''}
            onChange={(e) => setBuque('imo', e.target.value)}
          />
        </Campo>
        <Campo label="Bandera">
          <input
            className={inputCls}
            value={buque.bandera || ''}
            onChange={(e) => setBuque('bandera', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Conclusiones" cols={1}>
        <Campo label="Conclusiones y comentarios">
          <textarea
            className={`${inputCls} min-h-[120px]`}
            value={conclusiones}
            onChange={(e) => onInformeChange('conclusiones', e.target.value)}
          />
        </Campo>
      </Seccion>
    </div>
  );
}
