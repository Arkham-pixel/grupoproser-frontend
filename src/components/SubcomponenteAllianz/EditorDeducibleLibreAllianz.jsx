import React from 'react';
import {
  Campo,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  ANIOS_SMMLV,
  SMMLV_POR_ANIO,
  valorSmdlvDesdeSmmlv,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import { formatMiles } from './allianzHelpers.js';
import { parsearNumero } from '../SubcomponenteExpress/liquidadorExpressHelpers.js';

const MODOS = [
  ['max_pct_minimo', 'Mayor entre % y mínimo'],
  ['solo_porcentaje', 'Solo %'],
  ['solo_minimo', 'Solo mínimo'],
  ['valor_fijo', 'Valor fijo'],
  ['no_aplica', 'No aplica'],
];

export function textoSugeridoDeducibleAllianz(cfg = {}) {
  const modo = cfg.modo || 'max_pct_minimo';
  const pct = cfg.porcentaje === '' || cfg.porcentaje == null ? '' : Number(cfg.porcentaje);
  const cant = cfg.cantidadSMMLV === '' || cfg.cantidadSMMLV == null ? '' : Number(cfg.cantidadSMMLV);
  if (modo === 'no_aplica') return 'No aplica';
  if (modo === 'valor_fijo') {
    const v = parsearNumero(cfg.valorFijo);
    return v > 0 ? `Valor fijo $ ${formatMiles(v)}` : 'Valor fijo';
  }
  if (modo === 'solo_porcentaje') {
    return Number.isFinite(pct) ? `${pct}% del valor asegurable` : '';
  }
  if (modo === 'solo_minimo') {
    return Number.isFinite(cant) ? `Mínimo ${cant} SMMLV` : '';
  }
  if (Number.isFinite(pct) && Number.isFinite(cant)) {
    return `${pct}% del valor asegurable, mínimo ${cant} SMMLV`;
  }
  if (Number.isFinite(pct)) return `${pct}% del valor asegurable`;
  if (Number.isFinite(cant)) return `Mínimo ${cant} SMMLV`;
  return '';
}

/**
 * Deducible Allianz editable: texto libre + fórmula numérica.
 */
export default function EditorDeducibleLibreAllianz({
  cfg = {},
  onChange,
  disabled = false,
} = {}) {
  const modo = cfg.modo || 'max_pct_minimo';
  const emitir = (patch) => {
    if (disabled) return;
    onChange?.(patch);
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div>
        <h4 className="text-sm font-semibold">Deducible</h4>
        <p className="mt-0.5 text-xs text-gray-500">
          Escríbalo como sale en la póliza. El porcentaje se calcula sobre el valor
          asegurable (inmueble); la cotización PDF o el presupuesto NSR son el tope,
          no la base del %.
        </p>
      </div>

      <Campo label="Texto del deducible (escritura libre)">
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={3}
          disabled={disabled}
          value={cfg.texto || ''}
          placeholder="Ej. 2% del valor asegurable, mínimo 3 SMMLV"
          onChange={(e) => emitir({ texto: e.target.value })}
        />
      </Campo>

      <div className="flex flex-wrap gap-2">
        {MODOS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              modo === id
                ? 'border-blue-500 text-blue-600'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
            }`}
            onClick={() => emitir({ modo: id, aplica: id !== 'no_aplica' })}
          >
            {label}
          </button>
        ))}
      </div>

      {modo !== 'no_aplica' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modo !== 'solo_minimo' && modo !== 'valor_fijo' && (
            <Campo label="% deducible">
              <InputFenix
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={cfg.porcentaje ?? ''}
                placeholder="2"
                onChange={(e) => {
                  const raw = e.target.value.replace(',', '.');
                  emitir({
                    porcentaje: raw === '' ? '' : Number(raw),
                  });
                }}
              />
            </Campo>
          )}
          {modo !== 'solo_porcentaje' && modo !== 'valor_fijo' && (
            <Campo label="Cantidad SMMLV">
              <InputFenix
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={cfg.cantidadSMMLV ?? ''}
                placeholder="3"
                onChange={(e) => {
                  const raw = e.target.value.replace(',', '.');
                  emitir({
                    cantidadSMMLV: raw === '' ? '' : Number(raw),
                    tipoMinimo: 'SMMLV',
                  });
                }}
              />
            </Campo>
          )}
          {modo === 'valor_fijo' && (
            <Campo label="Valor fijo (COP)">
              <InputFenix
                type="text"
                inputMode="numeric"
                disabled={disabled}
                value={cfg.valorFijo ? formatMiles(cfg.valorFijo) : ''}
                placeholder="0"
                onChange={(e) => {
                  const digits = String(e.target.value).replace(/\D/g, '');
                  emitir({
                    valorFijo: digits === '' ? '' : Number(digits),
                  });
                }}
              />
            </Campo>
          )}
          {modo !== 'valor_fijo' && (
            <Campo label="Año SMMLV">
              <SelectFenix
                disabled={disabled}
                value={cfg.anioSMMLV || ANIOS_SMMLV[0]}
                onChange={(e) => {
                  const anio = Number(e.target.value);
                  const valorSMMLV = SMMLV_POR_ANIO[anio];
                  emitir({
                    anioSMMLV: anio,
                    valorSMMLV,
                    valorSMDLV: valorSmdlvDesdeSmmlv(valorSMMLV),
                  });
                }}
              >
                {ANIOS_SMMLV.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio} — $ {formatMiles(SMMLV_POR_ANIO[anio])}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          )}
          {modo !== 'solo_minimo' && modo !== 'valor_fijo' && (
            <p className="sm:col-span-2 text-xs text-gray-500">
              El % aplica sobre el valor asegurable del inmueble. Sin ese valor, se
              compara el mínimo SMMLV con la pérdida (PDF o NSR).
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        className="text-xs font-semibold text-blue-600 hover:underline disabled:text-gray-400"
        onClick={() => emitir({ texto: textoSugeridoDeducibleAllianz(cfg) })}
      >
        Completar texto con la fórmula
      </button>
    </div>
  );
}
