import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SelectBuscable from '../SelectBuscable';
import { Seccion, Campo, inputCls, attrsInput } from './PuertosCasoDatosGenerales';

export default function PuertosCasoPagina1({
  formData,
  onChange,
  aseguradoraOptions = [],
  soloLectura = false,
}) {
  const { t } = useTranslation();

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

  const opcionesCliente = useMemo(
    () => aseguradoraOptions.map((a) => ({ value: a.value, label: a.label })),
    [aseguradoraOptions]
  );

  return (
    <div className="space-y-5">
      <Seccion titulo={t('ports.ui.casoExportacion.portada.sectionTitle')}>
        <Campo label={t('ports.ui.casoExportacion.portada.numeroSolicitud')}>
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
        <Campo label={t('ports.ui.casoExportacion.portada.cliente')} obligatorio>
          <SelectBuscable
            options={opcionesCliente}
            value={formData.codiAsgrdra || ''}
            onChange={(v) => onChange('codiAsgrdra', v)}
            placeholder={t('ports.ui.common.select')}
            searchPlaceholder={t('ports.ui.common.searchList')}
            noResultsText={t('ports.ui.common.noResults')}
            buttonClassName={inputCls}
            disabled={soloLectura}
          />
        </Campo>
        {labelCliente && (
          <Campo label={t('ports.ui.casoExportacion.portada.nombrePortada')}>
            <input className={inputCls} readOnly value={labelCliente.toUpperCase()} />
          </Campo>
        )}
        <Campo label={t('ports.ui.casoExportacion.portada.creadoPor')}>
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              name: 'creadoPor',
              value: formData.creadoPor || '',
              onChange: handle,
            })}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.portada.email')}>
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
        <Campo label={t('ports.ui.casoExportacion.portada.fechaInforme')}>
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
        <Campo label={t('ports.ui.casoExportacion.portada.departamento')} className="sm:col-span-2">
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              name: 'departamentoInforme',
              value: formData.departamentoInforme || '',
              onChange: handle,
            })}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.portada.consecutivo')}>
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              name: 'consecutivo',
              value: formData.consecutivo || '',
              onChange: handle,
              placeholder: t('ports.ui.casoExportacion.portada.consecutivoPlaceholder'),
            })}
          />
        </Campo>
      </Seccion>
    </div>
  );
}
