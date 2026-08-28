import React from 'react';
import { Campo, InputFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

export function textoSugeridoDeducibleAllianz(cfg = {}) {
  const modo = cfg.modo || 'max_pct_minimo';
  const pct = cfg.porcentaje === '' || cfg.porcentaje == null ? '' : Number(cfg.porcentaje);
  const cant = cfg.cantidadSMMLV === '' || cfg.cantidadSMMLV == null ? '' : Number(cfg.cantidadSMMLV);
  if (modo === 'no_aplica') return 'No aplica';
  if (modo === 'valor_fijo') return 'Valor fijo';
  if (modo === 'solo_porcentaje') {
    return Number.isFinite(pct) ? `${pct}% del valor asegurable` : '';
  }
  if (modo === 'solo_minimo') {
    return Number.isFinite(cant) ? `Mínimo ${cant} SMMLV` : '';
  }
  if (Number.isFinite(pct) && Number.isFinite(cant) && cant > 0) {
    return `${pct}% del valor asegurable, mínimo ${cant} SMMLV`;
  }
  if (Number.isFinite(pct)) return `${pct}% del valor asegurable`;
  if (Number.isFinite(cant)) return `Mínimo ${cant} SMMLV`;
  return '';
}

/**
 * Deducible Allianz: solo el texto y la fórmula (% / SMMLV).
 */
export default function EditorDeducibleLibreAllianz({
  cfg = {},
  onChange,
  disabled = false,
} = {}) {
  const emitir = (patch) => {
    if (disabled) return;
    onChange?.(patch);
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <Campo label="Deducible">
        <textarea
          className="min-h-[72px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={3}
          disabled={disabled}
          value={cfg.texto || ''}
          placeholder="Ej. 2% del valor asegurable, mínimo 3 SMMLV"
          onChange={(e) => emitir({ texto: e.target.value })}
        />
      </Campo>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
