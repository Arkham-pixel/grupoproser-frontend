import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SelectBuscable from '../SelectBuscable';
import { Seccion, Campo, inputCls, attrsInput, attrsTextarea } from './PuertosCasoDatosGenerales';

export default function PuertosCasoPagina2({
  formData,
  onChange,
  onInformeChange,
  responsables = [],
  soloLectura = false,
}) {
  const { t } = useTranslation();

  const handle = (e) => {
    onChange(e.target.name, e.target.value);
  };

  const informe = formData.informeExportacion || {};

  const opcionesInspector = useMemo(
    () => responsables.map((r) => ({ value: r.value, label: r.label })),
    [responsables]
  );

  return (
    <div className="space-y-5">
      <Seccion titulo={t('ports.ui.casoExportacion.datosGenerales.sectionTitle')}>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.exportador')} obligatorio>
          <input {...attrsInput(soloLectura, { className: inputCls, name: 'asgrBenfcro', value: formData.asgrBenfcro || '', onChange: handle })} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.actividad')}>
          <input
            className={inputCls}
            name="actividad"
            value={formData.actividad || ''}
            onChange={handle}
            placeholder="ELABORACIÓN DE PRODUCTOS DE MOLINERÍA"
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.solicitadoPor')}>
          <input
            className={inputCls}
            name="funcAsgrdraNombre"
            value={formData.funcAsgrdraNombre || ''}
            onChange={handle}
            placeholder="ING. CARLOS BARRIOS G – JORGE RUÍZ, PRECOCIDOS DEL ORIENTE"
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.fechaAsignacion')}>
          <input type="date" className={inputCls} name="fchaAsgncion" value={formData.fchaAsgncion || ''} onChange={handle} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.ciudadRiesgo')}>
          <input
            className={inputCls}
            name="ciudadRiesgo"
            value={formData.ciudadRiesgo || ''}
            onChange={handle}
            placeholder="BARRANQUILLA, ATLÁNTICO"
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.laborRealizada')}>
          <input className={inputCls} name="laborRealizada" value={formData.laborRealizada || ''} onChange={handle} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.lugar')} className="sm:col-span-2">
          <input
            className={inputCls}
            name="lugar"
            value={formData.lugar || ''}
            onChange={handle}
            placeholder="SPRB PATIO 14 ENMALLADO DE EXPORTACIÓN – BODEGA 9"
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.fechaInspeccion')}>
          <input type="date" className={inputCls} name="fchaInspccion" value={formData.fchaInspccion || ''} onChange={handle} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.inspector')} obligatorio>
          <SelectBuscable
            options={opcionesInspector}
            value={formData.codiRespnsble || ''}
            onChange={(v) => onChange('codiRespnsble', v)}
            placeholder={t('ports.ui.casoExportacion.datosGenerales.selectInspector')}
            searchPlaceholder={t('ports.ui.common.searchList')}
            noResultsText={t('ports.ui.common.noResults')}
            buttonClassName={inputCls}
            disabled={soloLectura}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.casoExportacion.datosGenerales.introduccionTitle')} cols={1}>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.parrafoPrincipal')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: `${inputCls} min-h-[140px]`,
              value: informe.introduccion || '',
              onChange: (e) => onInformeChange('introduccion', e.target.value),
              placeholder: t('ports.ui.casoExportacion.datosGenerales.introduccionPlaceholder'),
            })}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.datosGenerales.propositoSupervision')}>
          <textarea
            className={`${inputCls} min-h-[100px]`}
            value={informe.proposito || ''}
            onChange={(e) => onInformeChange('proposito', e.target.value)}
            placeholder={t('ports.ui.casoExportacion.datosGenerales.propositoPlaceholder')}
          />
        </Campo>
      </Seccion>
    </div>
  );
}
