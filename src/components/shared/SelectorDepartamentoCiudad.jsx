import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SelectBuscable from '../SelectBuscable.jsx';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  filtrarCiudadesPorDepartamento,
  listarDepartamentos,
  normalizarCiudadTexto,
  opcionHuerfanaTexto,
  opcionesCiudadSelect,
} from '../../utils/ciudadesColombia.js';

const BTN_DEFAULT =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

/**
 * Departamento primero + ciudad filtrada sin duplicados (patrón SURA).
 *
 * onDepartamentoChange(valorString)
 * onCiudadChange(valorString, { ciudad, departamento, label })
 */
export default function SelectorDepartamentoCiudad({
  ciudadesRaw = [],
  departamento = '',
  ciudad = '',
  onDepartamentoChange,
  onCiudadChange,
  disabled = false,
  disabledDepartamento = false,
  disabledCiudad = false,
  cargando = false,
  requireDepto = true,
  i18nNs = 'segurosSura',
  labelDepartamento,
  labelCiudad,
  wrapInCampo = true,
  buttonClassName = BTN_DEFAULT,
  classNameDepto = '',
  classNameCiudad = '',
  deptoSelectProps = {},
  ciudadSelectProps = {},
}) {
  const { t } = useTranslation();

  const departamentos = useMemo(() => listarDepartamentos(ciudadesRaw), [ciudadesRaw]);

  const ciudadesFiltradas = useMemo(
    () =>
      filtrarCiudadesPorDepartamento(ciudadesRaw, departamento, {
        requireDepto,
      }),
    [ciudadesRaw, departamento, requireDepto]
  );

  const opcionesCiudad = useMemo(
    () => opcionesCiudadSelect(ciudadesFiltradas, ciudad),
    [ciudadesFiltradas, ciudad]
  );

  const lblDepto =
    labelDepartamento ??
    t(`${i18nNs}.fields.departamento`, { defaultValue: 'Departamento' });
  const lblCiudad =
    labelCiudad ?? t(`${i18nNs}.fields.ciudad`, { defaultValue: 'Ciudad' });

  const deptoDisabled =
    disabled || disabledDepartamento || (cargando && departamentos.length === 0);
  const ciudadDisabled =
    disabled ||
    disabledCiudad ||
    (requireDepto && !String(departamento || '').trim()) ||
    (cargando && ciudadesRaw.length === 0);

  const handleDepto = (e) => {
    const valor = e?.target ? e.target.value : e;
    onDepartamentoChange?.(valor);
  };

  const handleCiudad = (val) => {
    const encontrada = ciudadesFiltradas.find(
      (c) =>
        String(c.value) === String(val) ||
        normalizarCiudadTexto(c.value) === normalizarCiudadTexto(val)
    );
    onCiudadChange?.(val, {
      ciudad: val,
      label: encontrada?.label || val,
      departamento: encontrada?.departamento || departamento,
      codigo: encontrada?.codigo,
    });
  };

  const deptoControl = (
    <SelectFenix
      value={departamento || ''}
      onChange={handleDepto}
      disabled={deptoDisabled}
      {...deptoSelectProps}
    >
      <option value="">{t('common.select', { defaultValue: 'Seleccionar…' })}</option>
      {opcionHuerfanaTexto(departamento, departamentos) && (
        <option value={departamento}>{departamento}</option>
      )}
      {departamentos.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </SelectFenix>
  );

  const ciudadControl = (
    <SelectBuscable
      options={opcionesCiudad}
      value={ciudad || ''}
      onChange={handleCiudad}
      disabled={ciudadDisabled}
      placeholder={
        String(departamento || '').trim() || !requireDepto
          ? t(`${i18nNs}.placeholders.selectCity`, {
              defaultValue: 'Seleccione una ciudad…',
            })
          : t(`${i18nNs}.placeholders.selectDepartmentFirst`, {
              defaultValue: 'Primero seleccione departamento',
            })
      }
      searchPlaceholder={t('common.searchEllipsis', { defaultValue: 'Buscar ciudad…' })}
      buttonClassName={buttonClassName}
      {...ciudadSelectProps}
    />
  );

  if (!wrapInCampo) {
    return (
      <>
        <div className={classNameDepto}>{deptoControl}</div>
        <div className={classNameCiudad}>{ciudadControl}</div>
      </>
    );
  }

  return (
    <>
      <Campo label={lblDepto} className={classNameDepto}>
        {deptoControl}
      </Campo>
      <Campo label={lblCiudad} className={classNameCiudad}>
        {ciudadControl}
      </Campo>
    </>
  );
}
