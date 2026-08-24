import React, { useMemo, useState } from 'react';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import {
  FDM_FILTRO_COL_LLENO,
  FDM_FILTRO_COL_VACIO,
  PRESETS_FILTRO_COLUMNAS_FDM,
  contarCeldasColumnaFdm,
} from './equidadFdmHelpers.js';
import { ExpressModal, InputFenix, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressBtnGhost, expressBtnPrimary } from '../SubcomponenteExpress/expressFenixUi.js';

export default function FiltrosColumnasFdmModal({
  open,
  onClose,
  columnas = [],
  casosBase = [],
  filtrosColumnas = {},
  onChangeFiltros,
}) {
  const { t } = useTranslation();
  const [busquedaCol, setBusquedaCol] = useState('');
  const [borrador, setBorrador] = useState(filtrosColumnas);

  React.useEffect(() => {
    if (open) setBorrador({ ...filtrosColumnas });
  }, [open, filtrosColumnas]);

  const columnasFiltradas = useMemo(() => {
    const q = busquedaCol.trim().toLowerCase();
    if (!q) return columnas;
    return columnas.filter(
      (col) =>
        col.label.toLowerCase().includes(q) || String(col.clave).toLowerCase().includes(q)
    );
  }, [columnas, busquedaCol]);

  const statsPorColumna = useMemo(() => {
    const map = new Map();
    for (const col of columnas) {
      map.set(col.clave, contarCeldasColumnaFdm(casosBase, col.clave));
    }
    return map;
  }, [columnas, casosBase]);

  const activos = Object.values(borrador).filter(
    (m) => m === FDM_FILTRO_COL_VACIO || m === FDM_FILTRO_COL_LLENO
  ).length;

  const setModoColumna = (clave, modo) => {
    setBorrador((prev) => {
      const next = { ...prev };
      if (!modo) delete next[clave];
      else next[clave] = modo;
      return next;
    });
  };

  const aplicarPreset = (preset) => {
    setBorrador((prev) => ({ ...prev, ...preset.columnas }));
  };

  const limpiarColumnas = () => setBorrador({});

  const guardar = () => {
    onChangeFiltros(borrador);
    onClose();
  };

  return (
    <ExpressModal
      open={open}
      onClose={onClose}
      title={t('equidadFdm.report.columnFiltersTitle')}
      extraWide
    >
      <div className="space-y-4">
        <p className="font-body text-sm text-gray-600 dark:text-gray-400">
          {t('equidadFdm.report.columnFiltersHelp')}
        </p>

        <div className="flex flex-wrap gap-2">
          {PRESETS_FILTRO_COLUMNAS_FDM.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => aplicarPreset(preset)}
              className={expressBtnGhost}
            >
              {t(`equidadFdm.report.columnPresets.${preset.id}`)}
            </button>
          ))}
          {activos > 0 && (
            <button type="button" onClick={limpiarColumnas} className={expressBtnGhost}>
              <FaTimes />
              {t('equidadFdm.report.columnFiltersClear')}
            </button>
          )}
        </div>

        <InputFenix
          type="search"
          value={busquedaCol}
          onChange={(e) => setBusquedaCol(e.target.value)}
          placeholder={t('equidadFdm.report.columnFiltersSearch')}
        />

        <div className="max-h-[min(55vh,520px)] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900/90">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">{t('equidadFdm.report.columns')}</th>
                <th className="px-3 py-2 text-right font-semibold">{t('equidadFdm.report.columnEmptyCount')}</th>
                <th className="px-3 py-2 text-right font-semibold">{t('equidadFdm.report.columnFilledCount')}</th>
                <th className="px-3 py-2 text-left font-semibold">{t('equidadFdm.report.columnFilterMode')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {columnasFiltradas.map((col) => {
                const stats = statsPorColumna.get(col.clave) || { vacios: 0, llenos: 0 };
                const modo = borrador[col.clave] || '';
                return (
                  <tr key={col.clave} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{col.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-400">
                      {stats.vacios}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {stats.llenos}
                    </td>
                    <td className="px-3 py-2">
                      <SelectFenix
                        value={modo}
                        onChange={(e) => setModoColumna(col.clave, e.target.value)}
                        className="min-w-[140px]"
                      >
                        <option value="">{t('equidadFdm.report.all')}</option>
                        <option value={FDM_FILTRO_COL_VACIO}>
                          {t('equidadFdm.report.columnEmptyOnly')}
                        </option>
                        <option value={FDM_FILTRO_COL_LLENO}>
                          {t('equidadFdm.report.columnFilledOnly')}
                        </option>
                      </SelectFenix>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {activos > 0 && (
          <p className="font-body text-sm text-fenix-primario">
            {t('equidadFdm.report.columnFiltersActive', { count: activos })}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button type="button" onClick={onClose} className={expressBtnGhost}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={guardar} className={expressBtnPrimary}>
            <FaFilter />
            {t('equidadFdm.report.columnFiltersApply')}
          </button>
        </div>
      </div>
    </ExpressModal>
  );
}

/** Chips de filtros activos bajo la barra de filtros. */
export function FiltrosColumnasFdmChips({ columnas = [], filtrosColumnas = {}, onChangeFiltros }) {
  const { t } = useTranslation();
  const activos = Object.entries(filtrosColumnas || {}).filter(
    ([, modo]) => modo === FDM_FILTRO_COL_VACIO || modo === FDM_FILTRO_COL_LLENO
  );
  if (!activos.length) return null;

  const labelPorClave = Object.fromEntries(columnas.map((c) => [c.clave, c.label]));

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t('equidadFdm.report.columnFiltersChips')}
      </span>
      {activos.map(([clave, modo]) => (
        <button
          key={clave}
          type="button"
          onClick={() => {
            const next = { ...filtrosColumnas };
            delete next[clave];
            onChangeFiltros(next);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-fenix-primario/30 bg-fenix-primario/10 px-2.5 py-1 font-body text-xs font-medium text-fenix-primario hover:bg-fenix-primario/20"
          title={t('equidadFdm.report.columnFilterRemove')}
        >
          {labelPorClave[clave] || clave}:{' '}
          {modo === FDM_FILTRO_COL_VACIO
            ? t('equidadFdm.report.columnEmptyOnly')
            : t('equidadFdm.report.columnFilledOnly')}
          <FaTimes className="text-[10px]" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChangeFiltros({})}
        className={expressBtnGhost}
      >
        {t('equidadFdm.report.columnFiltersClearAll')}
      </button>
    </div>
  );
}
