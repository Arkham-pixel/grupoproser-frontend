import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMilesInputNsr10, formatMilesNsr10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { formatearMonto, parsearNumero } from './liquidadorBbvaCatHelpers.js';
import {
  calcularLiquidacionCotizacionPdfBbvaCat,
  etiquetaAiuBbvaCat,
  parsearPorcentajeDeducibleBbva,
} from './formatoLiquidacionBbvaCat.js';
import { bbvaCatInput, bbvaCatShell } from './bbvaCatFormUi.js';

const labelExcel =
  'flex min-h-[32px] items-center bg-[#E7EEF5] px-2 py-1 font-body text-[11px] font-semibold uppercase leading-tight text-gray-800 dark:bg-[#1E3A5F] dark:text-gray-100';
const cellExcel =
  'min-h-[32px] border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900';
const cellGray =
  'min-h-[32px] border border-gray-300 bg-[#F3F3F3] px-1.5 py-1 text-right font-body text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

/**
 * Deducible y AIU propios de la cotización PDF (independientes del formato Excel).
 */
export default function LiquidacionCotizacionPdfBbvaCat({
  liquidador = {},
  caso = {},
  disabled = false,
  onDeducibleChange,
  onAiuChange,
  onValorGlobalChange,
} = {}) {
  const { t } = useTranslation();
  const cotiz = useMemo(
    () => calcularLiquidacionCotizacionPdfBbvaCat(liquidador, caso),
    [liquidador, caso]
  );
  const tipos = cotiz.tiposDeducible || {};
  const ded = cotiz.deducibleFormato || {};
  const enc = liquidador.encabezado || {};
  const valorGlobalUi =
    enc.valorGlobal === '' || enc.valorGlobal == null
      ? enc.valorAseguradoInmueble === '' || enc.valorAseguradoInmueble == null
        ? ''
        : formatMilesNsr10(enc.valorAseguradoInmueble)
      : formatMilesNsr10(enc.valorGlobal);
  const pctUi =
    ded.porcentaje == null || ded.porcentaje === ''
      ? ''
      : String(Math.round(parsearPorcentajeDeducibleBbva(ded.porcentaje) * 10000) / 100).replace(
          /\.0+$/,
          ''
        );
  const aiuPctUi = String(Math.round(Number(cotiz.aiuPct || 0) * 10000) / 100);

  return (
    <div className={`${bbvaCatShell} mt-4`}>
      <div className="border-b border-gray-200 bg-[#004481] px-3 py-2 font-body text-sm font-semibold uppercase tracking-wide text-white dark:border-gray-700">
        {t('bbvaCat.settlement.quoteSettlementTitle')}
      </div>
      <p className="border-b border-gray-200 px-3 py-2 font-body text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
        {t('bbvaCat.settlement.quoteSettlementHint')}
      </p>

      <div className="grid grid-cols-[158px_220px_1fr] border-b border-gray-300 dark:border-gray-600">
        <div className={`${labelExcel} border-r border-gray-300 dark:border-gray-600`}>
          Valor global
        </div>
        <div className={`${cellExcel} border-r border-gray-300`}>
          <input
            className={`${bbvaCatInput} text-right font-semibold`}
            disabled={disabled}
            value={valorGlobalUi}
            onChange={(e) => onValorGlobalChange?.(formatMilesInputNsr10(e.target.value))}
          />
        </div>
        <div className={`${cellGray} text-left font-body text-xs`}>
          {cotiz.valorGlobal
            ? `2% valor global: $ ${formatearMonto(tipos.montoPct)} · se aplica el mayor: $ ${formatearMonto(
                tipos.aplicable
              )} (${tipos.tipoAplicadoLabel})`
            : t('bbvaCat.settlement.quoteNeedGlobalValue')}
        </div>
      </div>

      <div className="border-b border-gray-200 px-2 py-1 font-body text-[10px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
        {t('bbvaCat.settlement.quoteDeductibleHint')}
      </div>
      <div className="grid grid-cols-[90px_repeat(4,minmax(0,1fr))]">
        <div className={`${labelExcel} border border-gray-300 dark:border-gray-600`}>
          Deducible
        </div>
        {['SMMLV', 'Porcentaje', 'Dólares', 'Pesos / otro'].map((h) => (
          <div
            key={h}
            className={`${labelExcel} justify-center border border-gray-300 text-center dark:border-gray-600 ${
              (h === 'SMMLV' && tipos.tipoAplicado === 'smmlv') ||
              (h === 'Porcentaje' && tipos.tipoAplicado === 'porcentaje')
                ? '!bg-[#F9E4B7] dark:!bg-[#8B6B2E]'
                : ''
            }`}
          >
            {h}
          </div>
        ))}
        <div className={`${labelExcel} border border-gray-300 dark:border-gray-600`}>Tipos</div>
        <div className={cellExcel}>
          <input
            className={`${bbvaCatInput} text-center`}
            disabled={disabled}
            value={ded.smmlv ?? ''}
            onChange={(e) => onDeducibleChange?.({ smmlv: e.target.value })}
          />
        </div>
        <div className={cellExcel}>
          <input
            className={`${bbvaCatInput} text-center`}
            disabled={disabled}
            value={pctUi}
            onChange={(e) => {
              const n = parsearNumero(String(e.target.value).replace('%', ''));
              onDeducibleChange?.({ porcentaje: n ? n / 100 : 0 });
            }}
          />
        </div>
        <div className={cellExcel}>
          <input
            className={`${bbvaCatInput} text-center`}
            disabled={disabled}
            value={ded.dolares ?? 0}
            onChange={(e) => onDeducibleChange?.({ dolares: e.target.value })}
          />
        </div>
        <div className={cellExcel}>
          <input
            className={`${bbvaCatInput} text-right`}
            disabled={disabled}
            value={ded.pesos === '' || ded.pesos == null ? '' : formatMilesNsr10(ded.pesos)}
            onChange={(e) =>
              onDeducibleChange?.({ pesos: formatMilesInputNsr10(e.target.value) })
            }
          />
        </div>
        <div className={`${labelExcel} border border-gray-300 dark:border-gray-600`}>
          Calculado
        </div>
        <div
          className={`${cellGray} font-semibold ${
            tipos.tipoAplicado === 'smmlv' ? '!bg-[#F9E4B7] dark:!bg-[#8B6B2E]' : ''
          }`}
        >
          $ {formatearMonto(tipos.montoSmmlv)}
        </div>
        <div
          className={`${cellGray} font-semibold ${
            tipos.tipoAplicado === 'porcentaje' ? '!bg-[#F9E4B7] dark:!bg-[#8B6B2E]' : ''
          }`}
        >
          $ {formatearMonto(tipos.montoPct)}
        </div>
        <div
          className={`${cellGray} font-semibold ${
            tipos.tipoAplicado === 'dolares' ? '!bg-[#F9E4B7] dark:!bg-[#8B6B2E]' : ''
          }`}
        >
          $ {formatearMonto(tipos.montoUsd)}
        </div>
        <div
          className={`${cellGray} font-semibold ${
            tipos.tipoAplicado === 'pesos' ? '!bg-[#F9E4B7] dark:!bg-[#8B6B2E]' : ''
          }`}
        >
          $ {formatearMonto(tipos.montoPesos)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 border-t border-gray-200 sm:grid-cols-[1fr_280px] dark:border-gray-700">
        <p className="px-3 py-3 font-body text-xs text-gray-500">
          {t('bbvaCat.settlement.quoteAiuHint')}
        </p>
        <div className="grid grid-cols-[1fr_160px] border-l border-gray-200 dark:border-gray-700">
          <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
            {t('bbvaCat.settlement.totalQuote')}
          </div>
          <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
            $ {formatearMonto(cotiz.monto)}
          </div>
          <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
            AIU (%)
          </div>
          <div className={`${cellExcel} border-b border-gray-300`}>
            <input
              type="number"
              min="0"
              step="0.1"
              className={`${bbvaCatInput} text-right`}
              disabled={disabled}
              title={t('bbvaCat.settlement.quoteAiuTitle')}
              value={aiuPctUi}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onAiuChange?.(0);
                  return;
                }
                const pct = Number(raw);
                onAiuChange?.(Number.isFinite(pct) ? Math.max(0, pct) / 100 : 0);
              }}
            />
          </div>
          <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
            {etiquetaAiuBbvaCat(cotiz.aiuPct)}
          </div>
          <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
            $ {formatearMonto(cotiz.aiu)}
          </div>
          <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
            Total
          </div>
          <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
            $ {formatearMonto(cotiz.totalConAiu)}
          </div>
          <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
            Deducible (el mayor)
          </div>
          <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
            $ {formatearMonto(cotiz.deduciblePoliza ?? tipos.aplicable)}
          </div>
          <div className={`${labelExcel} justify-end pr-3`}>Valor a indemnizar</div>
          <div className={`${cellExcel} text-right font-bold`}>
            $ {formatearMonto(cotiz.valorAIndemnizar)}
          </div>
        </div>
      </div>
    </div>
  );
}
