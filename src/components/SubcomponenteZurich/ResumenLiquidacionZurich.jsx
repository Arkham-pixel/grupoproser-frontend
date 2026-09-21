import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  filasResumenLiquidacionZurich,
  formatearMontoPlataformaZurich,
} from './liquidadorZurichHelpers.js';

/**
 * Cuenta visible de la liquidación: cotización + AIU − deducible + gastos.
 */
export default function ResumenLiquidacionZurich({
  liquidador = {},
  totales = {},
  titulo,
  hint,
} = {}) {
  const { t } = useTranslation();
  const filas = useMemo(
    () => filasResumenLiquidacionZurich(liquidador, totales),
    [liquidador, totales]
  );
  if (!filas.length) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {titulo || t('zurich.settlement.quoteSettlementTitle')}
        </p>
        {hint || t('zurich.settlement.quoteSettlementHint') ? (
          <p className="mt-0.5 text-xs text-gray-500">
            {hint || t('zurich.settlement.quoteSettlementHint')}
          </p>
        ) : null}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {filas.map((fila, idx) => (
            <tr
              key={`${fila.label}-${idx}`}
              className={
                fila.destacado
                  ? 'bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-t border-gray-100 dark:border-gray-800'
              }
            >
              <td
                className={`px-3 py-2 ${
                  fila.bold || fila.destacado
                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-300'
                } ${fila.destacado ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
              >
                {fila.label}
              </td>
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  fila.bold || fila.destacado
                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                    : 'text-gray-800 dark:text-gray-200'
                } ${fila.destacado ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
              >
                $ {formatearMontoPlataformaZurich(fila.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
