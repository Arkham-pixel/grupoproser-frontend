import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  filasLiquidacionPorCoberturaZurich,
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
  const coberturas = useMemo(
    () => filasLiquidacionPorCoberturaZurich(liquidador, totales),
    [liquidador, totales]
  );
  if (!filas.length && !coberturas.length) return null;
  const usaCotiz = totales.origenPresupuesto === 'cotizacion';
  const tituloMostrar =
    titulo ||
    (usaCotiz
      ? t('zurich.settlement.quoteSettlementTitle')
      : t('zurich.settlement.budgetSettlementTitle'));
  const hintMostrar =
    hint ||
    (usaCotiz
      ? t('zurich.settlement.quoteSettlementHint')
      : t('zurich.settlement.budgetSettlementHint'));

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {coberturas.length ? (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Liquidación por coberturas
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Cada amparo con su pérdida y su deducible. Los gastos sin deducible van al final.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800">
                <th className="px-3 py-1.5 text-left font-semibold">Cobertura</th>
                <th className="px-3 py-1.5 text-right font-semibold">Pérdida</th>
                <th className="px-3 py-1.5 text-right font-semibold">Deducible</th>
                <th className="px-3 py-1.5 text-right font-semibold">Neto</th>
              </tr>
            </thead>
            <tbody>
              {coberturas.map((fila) => (
                <tr
                  key={fila.id}
                  className={
                    fila.total
                      ? 'bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-t border-gray-100 dark:border-gray-800'
                  }
                >
                  <td className={`px-3 py-2 ${fila.total ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    {fila.cobertura}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    $ {formatearMontoPlataformaZurich(fila.perdida)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    $ {formatearMontoPlataformaZurich(fila.deducible)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${fila.total ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                    $ {formatearMontoPlataformaZurich(fila.neto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {tituloMostrar}
        </p>
        {hintMostrar ? (
          <p className="mt-0.5 text-xs text-gray-500">{hintMostrar}</p>
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
