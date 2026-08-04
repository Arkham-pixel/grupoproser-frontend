import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Seccion, Campo, inputCls } from './PuertosCasoDatosGenerales';

export default function PuertosCasoTrazabilidad({ formData, onChange }) {
  const { t } = useTranslation();

  const ETAPAS = useMemo(
    () => [
      { fecha: 'fchaAsgncion', obs: 'obseContIni', titulo: t('ports.ui.casoExportacion.trazabilidad.etapas.asignacion') },
      { fecha: 'fchaCoordInspeccion', obs: 'obseCoordInspeccion', titulo: t('ports.ui.casoExportacion.trazabilidad.etapas.coordinacion') },
      { fecha: 'fchaProgInspeccion', obs: null, titulo: t('ports.ui.casoExportacion.trazabilidad.etapas.programacion') },
      { fecha: 'fchaInspccion', obs: 'obseInspccion', titulo: t('ports.ui.casoExportacion.trazabilidad.etapas.inspeccion') },
      { fecha: 'fchaInfoFnal', obs: 'obseInfoFnal', titulo: t('ports.ui.casoExportacion.trazabilidad.etapas.informe') },
      { fecha: 'fchaFactra', obs: null, titulo: t('ports.ui.casoExportacion.trazabilidad.etapas.facturacion') },
    ],
    [t]
  );

  const handle = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="space-y-5">
      <p className="font-body text-sm text-gray-600 dark:text-gray-400">
        {t('ports.ui.casoExportacion.trazabilidad.intro')}
      </p>
      {ETAPAS.map(({ fecha, obs, titulo }) => (
        <Seccion key={fecha} titulo={titulo}>
          <Campo label={t('ports.ui.casoExportacion.trazabilidad.fecha')}>
            <input type="date" className={inputCls} name={fecha} value={formData[fecha] || ''} onChange={handle} />
          </Campo>
          {obs && (
            <Campo label={t('ports.ui.casoExportacion.trazabilidad.observaciones')}>
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
      <Seccion titulo={t('ports.ui.casoExportacion.trazabilidad.seguimientoGeneral')}>
        <Campo label={t('ports.ui.casoExportacion.trazabilidad.observacionesSeguimiento')} className="sm:col-span-2">
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
