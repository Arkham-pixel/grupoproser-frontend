import React from 'react';
import { useTranslation } from 'react-i18next';
import { Seccion, Campo, inputCls } from './PuertosCasoDatosGenerales';

export default function PuertosCasoInformeExportacion({ formData, onInformeChange, onNestedChange }) {
  const { t } = useTranslation();
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
        {t('ports.ui.casoExportacion.informeLegacy.intro')}
      </p>

      <Seccion titulo={t('ports.ui.casoExportacion.informeLegacy.introduccionTitle')} cols={1}>
        <Campo label={t('ports.ui.casoExportacion.informeLegacy.textoIntroductorio')}>
          <textarea
            className={`${inputCls} min-h-[120px]`}
            value={intro}
            onChange={(e) => onInformeChange('introduccion', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.casoExportacion.informeLegacy.buqueTitle')}>
        <Campo label={t('ports.ui.casoExportacion.buque.nombreMotonave')}>
          <input
            className={inputCls}
            value={buque.nombre || ''}
            onChange={(e) => setBuque('nombre', e.target.value)}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.puertoEmbarque')}>
          <input
            className={inputCls}
            value={buque.puertoEmbarque || ''}
            onChange={(e) => setBuque('puertoEmbarque', e.target.value)}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.puertoDescargue')}>
          <input
            className={inputCls}
            value={buque.puertoDescargue || ''}
            onChange={(e) => setBuque('puertoDescargue', e.target.value)}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.fechaArribo')}>
          <input
            type="date"
            className={inputCls}
            value={buque.fechaArribo || ''}
            onChange={(e) => setBuque('fechaArribo', e.target.value)}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.imo')}>
          <input
            className={inputCls}
            value={buque.imo || ''}
            onChange={(e) => setBuque('imo', e.target.value)}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.bandera')}>
          <input
            className={inputCls}
            value={buque.bandera || ''}
            onChange={(e) => setBuque('bandera', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.casoExportacion.informeLegacy.conclusionesTitle')} cols={1}>
        <Campo label={t('ports.ui.casoExportacion.informeLegacy.conclusionesLabel')}>
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
