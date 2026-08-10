import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSync } from 'react-icons/fa';
import SelectBuscable from '../SelectBuscable.jsx';
import { opcionesCatalogo } from '../../services/puertosCatalogoService.js';

const selectBtnCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100';

export default function SelectorCatalogoPuertos({
  label,
  obligatorio = false,
  items = [],
  value = '',
  onChange,
  onRefresh,
  cargando = false,
  disabled = false,
  className = '',
  placeholder,
}) {
  const { t } = useTranslation();
  const opciones = useMemo(() => opcionesCatalogo(items, value), [items, value]);
  const placeholderText = placeholder || t('ports.ui.common.select');
  const isDisabled = cargando || disabled;

  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {obligatorio && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      <div className="flex gap-2">
        <SelectBuscable
          className="notranslate min-w-0 flex-1"
          buttonClassName={selectBtnCls}
          options={opciones}
          value={value}
          onChange={onChange}
          disabled={isDisabled}
          placeholder={cargando ? t('ports.ui.common.loading') : placeholderText}
          searchPlaceholder={t('ports.ui.common.searchList')}
          noResultsText={t('ports.ui.common.noResults')}
        />
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isDisabled}
            className="shrink-0 rounded-lg border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-emerald-700 dark:text-emerald-300 disabled:opacity-50"
            title={t('ports.ui.catalogos.refreshCatalog')}
          >
            <FaSync className={cargando ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </label>
  );
}
