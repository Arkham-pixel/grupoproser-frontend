import React from 'react';
import { useTranslation } from 'react-i18next';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { attrsCampoCaso } from '../../utils/permisosCasoPorRol.js';
import {
  asegurarOpcionActual,
  opcionesLideresParaSelect,
} from '../../utils/catalogosAsignacionCatastrofico.js';

const optsDe = (lista = [], valorActual, t) => (
  <>
    <option value="">{t('common.select')}</option>
    {valorActual &&
      !lista.some((r) => r.value === valorActual || r.codigo === valorActual) && (
        <option value={valorActual}>{valorActual}</option>
      )}
    {lista.map((r) => (
      <option key={`${r.codigo || r.value}-${r.ciudad || ''}`} value={r.value}>
        {r.ciudad && String(r.ciudad).trim().toUpperCase() !== 'TODAS'
          ? `${r.label} (${r.ciudad})`
          : r.label}
      </option>
    ))}
  </>
);

/**
 * Tres selects de asignación con listas independientes.
 * El filtro por ciudad es opcional (`filtrarPorCiudad`).
 * Alfa y BBVA usan equipos cerrados (sin filtro por ciudad).
 * BBVA oculta Inspector (`mostrarInspector={false}`).
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
  };

  return (
    <div className="col-span-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Campo
        label={t(`${i18nNs}.fields.ajustadorLider`, {
          defaultValue: 'Ajustador líder (quien asigna)',
        })}
      >
        <SelectFenix
          value={form.ajustadorLider || ''}
          onChange={setCampo('ajustadorLider')}
          {...attrsCampoCaso(rol, 'ajustadorLider', permisoOpts)}
        >
          {optsDe(listaLideres, form.ajustadorLider, t)}
        </SelectFenix>
      </Campo>
      <Campo label={t(`${i18nNs}.fields.ajustador`, { defaultValue: 'Ajustador' })}>
        <SelectFenix
          value={form.ajustador || ''}
          onChange={setCampo('ajustador')}
          {...attrsCampoCaso(rol, 'ajustador', permisoOpts)}
          disabled={attrsCampoCaso(rol, 'ajustador', permisoOpts).disabled || sinCiudad}
        >
          {sinCiudad ? (
            <option value="">
              {t(`${i18nNs}.placeholders.selectCityFirst`, {
                defaultValue: 'Primero seleccione ciudad',
              })}
            </option>
          ) : listaAjustadores.length === 0 ? (
            <option value="">
              {t(`${i18nNs}.placeholders.noCatastrophicAdjusters`, {
                defaultValue:
                  'Sin ajustadores catastróficos — créelos en Administración → Ajustadores catastróficos',
              })}
            </option>
          ) : (
            optsDe(listaAjustadores, form.ajustador, t)
          )}
        </SelectFenix>
      </Campo>
      {mostrarInspector ? (
      <Campo label={t(`${i18nNs}.fields.inspector`, { defaultValue: 'Inspector' })}>
        <SelectFenix
          value={form.inspector || ''}
          onChange={setCampo('inspector')}
          {...attrsCampoCaso(rol, 'inspector', permisoOpts)}
          disabled={attrsCampoCaso(rol, 'inspector', permisoOpts).disabled || sinCiudad}
        >
          {sinCiudad ? (
            <option value="">
              {t(`${i18nNs}.placeholders.selectCityFirst`, {
                defaultValue: 'Primero seleccione ciudad',
              })}
            </option>
          ) : listaInspectores.length === 0 ? (
            <option value="">
              {t(`${i18nNs}.placeholders.noCatastrophicInspectors`, {
                defaultValue:
                  'Sin inspectores — créelos en Administración → Inspectores catastróficos',
              })}
            </option>
          ) : (
            optsDe(listaInspectores, form.inspector, t)
          )}
        </SelectFenix>
      </Campo>
      ) : null}
    </div>
  );
}
