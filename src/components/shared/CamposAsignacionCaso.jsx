import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Campo } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressSelect } from '../SubcomponenteExpress/expressFenixUi.js';
import SelectBuscable from '../SelectBuscable.jsx';
import { attrsCampoCaso } from '../../utils/permisosCasoPorRol.js';
import {
  asegurarOpcionActual,
  opcionesLideresParaSelect,
} from '../../utils/catalogosAsignacionCatastrofico.js';

function aOpcionesBuscable(lista = []) {
  return (lista || []).map((r) => {
    const ciudad = String(r.ciudad || '').trim();
    const labelBase = r.label || r.value || '';
    const label =
      ciudad && ciudad.toUpperCase() !== 'TODAS' ? `${labelBase} (${ciudad})` : labelBase;
    return {
      value: r.value,
      label,
      codigo: r.codigo || '',
      ciudad,
    };
  });
}

/**
 * Tres selects de asignación con listas independientes y buscador.
 * El filtro por ciudad es opcional (`filtrarPorCiudad`).
 * Alfa y BBVA usan equipos cerrados (sin filtro por ciudad).
 */
export default function CamposAsignacionCaso({
  form,
  setCampo,
  lideres,
  ajustadores,
  inspectores,
  responsables = [],
  rol,
  modulo = '',
  i18nNs = 'segurosSura',
  ciudadSeleccionada = '',
  filtrarPorCiudad = true,
  mostrarInspector = true,
}) {
  const { t } = useTranslation();
  const listaLideres = opcionesLideresParaSelect(
    lideres ?? responsables,
    modulo,
    form.ajustadorLider
  );
  const listaAjustadores = asegurarOpcionActual(
    asegurarOpcionActual(ajustadores ?? [], form.ajustador),
    form.ajustadorLider
  );
  const listaInspectores = inspectores ?? [];
  const sinCiudad = filtrarPorCiudad && !String(ciudadSeleccionada || '').trim();
  const permisoOpts = {
    modulo: String(modulo || '').toLowerCase(),
    login: typeof localStorage !== 'undefined' ? localStorage.getItem('login') || '' : '',
    cedula: typeof localStorage !== 'undefined' ? localStorage.getItem('cedula') || '' : '',
    nombre: typeof localStorage !== 'undefined' ? localStorage.getItem('nombre') || '' : '',
    name: typeof localStorage !== 'undefined' ? localStorage.getItem('nombre') || '' : '',
    caso: form,
  };

  const opcionesLider = useMemo(() => aOpcionesBuscable(listaLideres), [listaLideres]);
  const opcionesAjustador = useMemo(
    () => (sinCiudad ? [] : aOpcionesBuscable(listaAjustadores)),
    [listaAjustadores, sinCiudad]
  );
  const opcionesInspector = useMemo(
    () => (sinCiudad ? [] : aOpcionesBuscable(listaInspectores)),
    [listaInspectores, sinCiudad]
  );

  const placeholderCiudad = t(`${i18nNs}.placeholders.selectCityFirst`, {
    defaultValue: 'Primero seleccione ciudad',
  });
  const placeholderSelect = t('common.select');
  const placeholderBuscar = t('common.searchEllipsis', { defaultValue: 'Buscar…' });
  const placeholderAjustador = sinCiudad
    ? placeholderCiudad
    : listaAjustadores.length === 0
      ? t(`${i18nNs}.placeholders.noCatastrophicAdjusters`, {
          defaultValue:
            'Sin ajustadores catastróficos — créelos en Administración → Ajustadores catastróficos',
        })
      : placeholderSelect;
  const placeholderInspector = sinCiudad
    ? placeholderCiudad
    : listaInspectores.length === 0
      ? t(`${i18nNs}.placeholders.noCatastrophicInspectors`, {
          defaultValue:
            'Sin inspectores — créelos en Administración → Inspectores catastróficos',
        })
      : placeholderSelect;

  const attrsLider = attrsCampoCaso(rol, 'ajustadorLider', permisoOpts);
  const attrsAjustador = attrsCampoCaso(rol, 'ajustador', permisoOpts);
  const attrsInspector = attrsCampoCaso(rol, 'inspector', permisoOpts);

  return (
    <div className="col-span-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Campo
        label={t(`${i18nNs}.fields.ajustadorLider`, {
          defaultValue: 'Ajustador líder (quien asigna)',
        })}
      >
        <SelectBuscable
          options={opcionesLider}
          value={form.ajustadorLider || ''}
          onChange={setCampo('ajustadorLider')}
          placeholder={placeholderSelect}
          searchPlaceholder={placeholderBuscar}
          emptyLabel={placeholderSelect}
          disabled={attrsLider.disabled}
          buttonClassName={expressSelect}
        />
      </Campo>
      <Campo label={t(`${i18nNs}.fields.ajustador`, { defaultValue: 'Ajustador' })}>
        <SelectBuscable
          options={opcionesAjustador}
          value={form.ajustador || ''}
          onChange={setCampo('ajustador')}
          placeholder={placeholderAjustador}
          searchPlaceholder={placeholderBuscar}
          emptyLabel={placeholderSelect}
          disabled={attrsAjustador.disabled || sinCiudad}
          buttonClassName={expressSelect}
        />
      </Campo>
      {mostrarInspector ? (
        <Campo label={t(`${i18nNs}.fields.inspector`, { defaultValue: 'Inspector' })}>
          <SelectBuscable
            options={opcionesInspector}
            value={form.inspector || ''}
            onChange={setCampo('inspector')}
            placeholder={placeholderInspector}
            searchPlaceholder={placeholderBuscar}
            emptyLabel={placeholderSelect}
            disabled={attrsInspector.disabled || sinCiudad}
            buttonClassName={expressSelect}
          />
        </Campo>
      ) : null}
    </div>
  );
}
