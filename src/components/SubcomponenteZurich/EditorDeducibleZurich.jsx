import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Campo,
  expressBtnGhost,
  expressBtnPrimary,
  InputFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { AIU_PORCENTAJE_DEFAULT_NSR10_CAT } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { formatMiles } from './zurichHelpers.js';

function limpiarNumeroEditable(crudo) {
  const raw = String(crudo ?? '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  if ((raw.match(/\./g) || []).length > 1) return null;
  return raw;
}

/**
 * Deducible Zurich del liquidador PDF: % y mínimo SMMLV o SMDLV, más AIU.
 * Vive en liquidacionCotizacionPdf; no escribe el recuadro NSR «Liquidación presupuesto».
 */
export default function EditorDeducibleZurich({
  cfg = {},
  aiuPorcentaje = AIU_PORCENTAJE_DEFAULT_NSR10_CAT,
  valorAsegurado = '',
  mostrarAiu = false,
  mostrarValorAsegurado = true,
  titulo,
  hint,
  onDeducibleChange,
  onAiuChange,
  onValorAseguradoChange,
  disabled = false,
} = {}) {
  const { t } = useTranslation();
  const emitir = (patch) => {
    if (disabled) return;
    onDeducibleChange?.(patch);
  };
  const tipoMinimo = cfg.tipoMinimo === 'SMDLV' ? 'SMDLV' : 'SMMLV';
  const esSmdlv = tipoMinimo === 'SMDLV';
  const cantidadMinimo = esSmdlv ? cfg.cantidadSMDLV : cfg.cantidadSMMLV;
  const aiuPctUi = String(
    Math.round(
      Number(
        aiuPorcentaje === '' || aiuPorcentaje == null
          ? AIU_PORCENTAJE_DEFAULT_NSR10_CAT
          : aiuPorcentaje
      ) * 10000
    ) / 100
  );

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {titulo || t('zurich.settlement.deductibleEditorTitle')}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {hint || t('zurich.settlement.deductibleEditorHint')}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
          {t('zurich.settlement.deductibleMinimoTipo')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            className={tipoMinimo === 'SMMLV' ? expressBtnPrimary : expressBtnGhost}
            onClick={() =>
              emitir({
                tipoMinimo: 'SMMLV',
                cantidadSMMLV:
                  cfg.cantidadSMMLV === '' || cfg.cantidadSMMLV == null
                    ? cfg.cantidadSMDLV ?? ''
                    : cfg.cantidadSMMLV,
              })
            }
          >
            {t('zurich.settlement.deductibleMinimoSmmlv')}
          </button>
          <button
            type="button"
            disabled={disabled}
            className={esSmdlv ? expressBtnPrimary : expressBtnGhost}
            onClick={() =>
              emitir({
                tipoMinimo: 'SMDLV',
                cantidadSMDLV:
                  cfg.cantidadSMDLV === '' || cfg.cantidadSMDLV == null
                    ? cfg.cantidadSMMLV ?? ''
                    : cfg.cantidadSMDLV,
              })
            }
          >
            {t('zurich.settlement.deductibleMinimoSmdlv')}
          </button>
        </div>
      </div>

      {mostrarValorAsegurado ? (
      <Campo label={t('zurich.settlement.insuredValue')}>
        <InputFenix
          inputMode="numeric"
          disabled={disabled}
          value={formatMiles(valorAsegurado || '')}
          placeholder="245.000.000"
          title={t('zurich.settlement.insuredValueHint')}
          onChange={(e) => onValorAseguradoChange?.(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">{t('zurich.settlement.insuredValueHint')}</p>
      </Campo>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label={t('zurich.settlement.deductiblePercent')}>
          <InputFenix
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={cfg.porcentaje ?? ''}
            placeholder="3"
            title={t('zurich.settlement.deductiblePercentTitle')}
            onChange={(e) => {
              const raw = limpiarNumeroEditable(e.target.value);
              if (raw == null) return;
              emitir({ porcentaje: raw === '' ? '' : raw });
            }}
          />
        </Campo>
        <Campo
          label={
            esSmdlv
              ? t('zurich.settlement.deductibleSmdlv')
              : t('zurich.settlement.deductibleSmmlv')
          }
        >
          <InputFenix
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={cantidadMinimo ?? ''}
            placeholder={esSmdlv ? '10' : '3'}
            onChange={(e) => {
              const raw = limpiarNumeroEditable(e.target.value);
              if (raw == null) return;
              const valor = raw === '' ? '' : raw;
              emitir(
                esSmdlv
                  ? { cantidadSMDLV: valor, tipoMinimo: 'SMDLV' }
                  : { cantidadSMMLV: valor, tipoMinimo: 'SMMLV' }
              );
            }}
          />
        </Campo>
      </div>

      {mostrarAiu ? (
        <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
          <Campo label={t('zurich.settlement.aiuPercent')}>
            <InputFenix
              type="number"
              min="0"
              step="0.1"
              disabled={disabled}
              value={aiuPctUi}
              title={t('zurich.settlement.quoteAiuHint')}
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
          </Campo>
          <p className="mt-1 text-xs text-gray-500">{t('zurich.settlement.quoteAiuHint')}</p>
        </div>
      ) : null}
    </div>
  );
}
