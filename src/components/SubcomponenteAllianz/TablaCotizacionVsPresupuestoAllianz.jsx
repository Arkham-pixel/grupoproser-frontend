import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { expressBtnGhost } from '../SubcomponenteExpress/expressFenixUi.js';
import { InputFenix, InputMonedaExpress } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  diferenciaFilaCotizacionVsPresupuestoAllianz,
  filaCotizacionVsPresupuestoAllianz,
  filasConDatoCotizacionVsPresupuestoAllianz,
  formatearMonto,
  motivoFilaCotizacionVsPresupuestoAllianz,
} from './liquidadorAllianzHelpers.js';

export default function TablaCotizacionVsPresupuestoAllianz({
  filas = [],
  onChange,
  disabled = false,
}) {
  const { t } = useTranslation();
  const lista =
    Array.isArray(filas) && filas.length
      ? filas.map((fila) => filaCotizacionVsPresupuestoAllianz(fila))
      : [filaCotizacionVsPresupuestoAllianz()];
  const conDato = filasConDatoCotizacionVsPresupuestoAllianz(lista);

  const emitir = (next) => {
    onChange?.(next);
  };

  const setFila = (idx, key, valor) => {
    emitir(lista.map((fila, i) => (i === idx ? { ...fila, [key]: valor } : fila)));
  };

  const addFila = () => emitir([...lista, filaCotizacionVsPresupuestoAllianz()]);

  const removeFila = (idx) => {
    const next = lista.filter((_, i) => i !== idx);
    emitir(next.length ? next : [filaCotizacionVsPresupuestoAllianz()]);
  };

  const etiquetaMotivo = (motivo) => {
    if (motivo === 'no_paga') return t('allianz.settlement.quoteVsBudgetUnpaid');
    if (motivo === 'menor_valor') return t('allianz.settlement.quoteVsBudgetLower');
    return '—';
  };

  return (
    <div className="space-y-2">
      <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
        {t('allianz.settlement.quoteVsBudgetTitle')}
      </p>
      <p className="font-body text-sm text-gray-600 dark:text-gray-400">
        {t('allianz.settlement.quoteVsBudgetHint')}
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr className="text-left text-gray-500">
              <th className="px-2 py-2 font-semibold">
                {t('allianz.settlement.quoteVsBudgetConcept')}
              </th>
              <th className="px-2 py-2 font-semibold">
                {t('allianz.settlement.quoteVsBudgetQuote')}
              </th>
              <th className="px-2 py-2 font-semibold">
                {t('allianz.settlement.quoteVsBudgetBudget')}
              </th>
              <th className="px-2 py-2 font-semibold">
                {t('allianz.settlement.quoteVsBudgetDiff')}
              </th>
              <th className="px-2 py-2 font-semibold">
                {t('allianz.settlement.quoteVsBudgetReason')}
              </th>
              <th className="min-w-[220px] px-2 py-2 font-semibold">
                {t('allianz.settlement.quoteVsBudgetNotes')}
              </th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {lista.map((fila, idx) => {
              const motivo = motivoFilaCotizacionVsPresupuestoAllianz(fila);
              const vacia =
                !String(fila.concepto || '').trim() &&
                !fila.valorCotizacion &&
                !fila.valorPresupuesto &&
                !String(fila.observaciones || '').trim();
              const saleEnWord = Boolean(motivo);
              return (
                <tr
                  key={fila.id || idx}
                  className={
                    !vacia && !saleEnWord ? 'bg-gray-50/80 dark:bg-gray-900/40' : undefined
                  }
                >
                  <td className="align-top px-2 py-2">
                    <InputFenix
                      value={fila.concepto || ''}
                      disabled={disabled}
                      placeholder={t('allianz.settlement.quoteVsBudgetConceptPh')}
                      onChange={(e) => setFila(idx, 'concepto', e.target.value)}
                    />
                  </td>
                  <td className="align-top px-2 py-2">
                    <InputMonedaExpress
                      className="font-mono tabular-nums"
                      value={fila.valorCotizacion || ''}
                      disabled={disabled}
                      placeholder="$ 0"
                      onChange={(e) => setFila(idx, 'valorCotizacion', e.target.value)}
                    />
                  </td>
                  <td className="align-top px-2 py-2">
                    <InputMonedaExpress
                      className="font-mono tabular-nums"
                      value={fila.valorPresupuesto || ''}
                      disabled={disabled}
                      placeholder="$ 0"
                      onChange={(e) => setFila(idx, 'valorPresupuesto', e.target.value)}
                    />
                  </td>
                  <td className="align-top whitespace-nowrap px-2 py-2 font-mono tabular-nums">
                    {vacia ? '—' : `$ ${formatearMonto(diferenciaFilaCotizacionVsPresupuestoAllianz(fila))}`}
                  </td>
                  <td className="align-top px-2 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {etiquetaMotivo(motivo)}
                  </td>
                  <td className="align-top px-2 py-2">
                    <textarea
                      className="min-h-[64px] w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
                      rows={2}
                      disabled={disabled}
                      value={fila.observaciones || ''}
                      placeholder={t('allianz.settlement.quoteVsBudgetNotesPh')}
                      onChange={(e) => setFila(idx, 'observaciones', e.target.value)}
                    />
                  </td>
                  <td className="align-top px-2 py-2">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      disabled={disabled}
                      onClick={() => removeFila(idx)}
                      title={t('allianz.settlement.delete')}
                    >
                      <FaTrash className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={expressBtnGhost} disabled={disabled} onClick={addFila}>
          <FaPlus /> {t('allianz.settlement.quoteVsBudgetAdd')}
        </button>
        <p className="font-body text-xs text-gray-500">
          {t('allianz.settlement.quoteVsBudgetWordCount', { count: conDato.length })}
        </p>
      </div>
    </div>
  );
}
