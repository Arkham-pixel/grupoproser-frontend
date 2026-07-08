import React from 'react';
import { FaSync } from 'react-icons/fa';
import { opcionesCatalogo } from '../../services/puertosCatalogoService.js';

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100';

export default function SelectorCatalogoPuertos({
  label,
  obligatorio = false,
  tipo,
  items = [],
  value = '',
  onChange,
  onRefresh,
  cargando = false,
  className = '',
  placeholder = 'Seleccionar',
}) {
  const opciones = opcionesCatalogo(items, value);

  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {obligatorio && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      <div className="flex gap-2">
        <select
          className={`${inputCls} flex-1`}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={cargando}
        >
          <option value="">{cargando ? 'Cargando…' : placeholder}</option>
          {opciones.map((o) => (
            <option key={`${tipo}-${o.value}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={cargando}
            className="shrink-0 rounded-lg border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-emerald-700 dark:text-emerald-300 disabled:opacity-50"
            title="Actualizar catálogo"
          >
            <FaSync className={cargando ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </label>
  );
}
