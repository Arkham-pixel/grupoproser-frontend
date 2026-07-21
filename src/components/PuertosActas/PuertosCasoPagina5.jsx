import React from 'react';
import { Seccion, Campo, inputCls, attrsTextarea } from './PuertosCasoDatosGenerales';
import PuertosCasoListaPuntos from './PuertosCasoListaPuntos';
import PuertosCasoRegistrosFotograficosContenedores from './PuertosCasoRegistrosFotograficosContenedores';

export default function PuertosCasoPagina5({ formData, onInformeChange, soloLectura = false }) {
  const informe = formData.informeExportacion || {};

  return (
    <div className="space-y-5">
      <Seccion titulo="5. Conclusiones y comentarios" cols={1}>
        <Campo label="Párrafo principal">
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '100px' },
              value: informe.conclusionesTexto || '',
              onChange: (e) => onInformeChange('conclusionesTexto', e.target.value),
              placeholder:
                'La mercancía de exportación fue estibada y asegurada de acuerdo con las imperantes costumbres del comercio...',
            })}
          />
        </Campo>
        <PuertosCasoListaPuntos
          titulo="Puntos de conclusión (orden del informe)"
          puntos={informe.conclusionesPuntos || []}
          onChange={(updater) => onInformeChange('conclusionesPuntos', updater)}
          placeholder="Ej: Cajas cargadas en contenedores TRITON, CIA y MAERSK..."
          soloLectura={soloLectura}
        />
      </Seccion>

      <PuertosCasoRegistrosFotograficosContenedores
        informe={informe}
        onInformeChange={onInformeChange}
        soloLectura={soloLectura}
      />
    </div>
  );
}
