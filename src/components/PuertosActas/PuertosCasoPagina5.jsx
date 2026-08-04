import React from 'react';
import { useTranslation } from 'react-i18next';
import { Seccion, Campo, inputCls, attrsTextarea } from './PuertosCasoDatosGenerales';
import PuertosCasoListaPuntos from './PuertosCasoListaPuntos';
import PuertosCasoRegistrosFotograficosContenedores from './PuertosCasoRegistrosFotograficosContenedores';

export default function PuertosCasoPagina5({ formData, onInformeChange, soloLectura = false }) {
  const { t } = useTranslation();
  const informe = formData.informeExportacion || {};

  return (
    <div className="space-y-5">
      <Seccion titulo={t('ports.ui.casoExportacion.conclusiones.sectionTitle')} cols={1}>
        <Campo label={t('ports.ui.casoExportacion.conclusiones.parrafoPrincipal')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '100px' },
              value: informe.conclusionesTexto || '',
              onChange: (e) => onInformeChange('conclusionesTexto', e.target.value),
              placeholder: t('ports.ui.casoExportacion.conclusiones.parrafoPlaceholder'),
            })}
          />
        </Campo>
        <PuertosCasoListaPuntos
          titulo={t('ports.ui.casoExportacion.conclusiones.puntosTitulo')}
          puntos={informe.conclusionesPuntos || []}
          onChange={(updater) => onInformeChange('conclusionesPuntos', updater)}
          placeholder={t('ports.ui.casoExportacion.conclusiones.puntoPlaceholder')}
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
