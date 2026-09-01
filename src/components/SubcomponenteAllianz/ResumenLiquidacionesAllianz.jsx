import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatearMonto } from './liquidadorAllianzHelpers.js';

function Fila({ label, valor, bold = false, last = false }) {
  return (
    <div
      className={`flex justify-between px-4 py-2 text-sm ${
        last ? '' : 'border-b border-gray-200 dark:border-gray-700'
      } ${bold ? 'font-bold' : ''}`}
    >
      <span>{label}</span>
      <span>$ {formatearMonto(valor)}</span>
    </div>
  );
}

/**
 * Dos liquidadores Allianz: cotización del asegurado y presupuesto NSR-10 del ajustador.
 * Cada uno aplica el mismo deducible de póliza sobre su propia base.
 */
export default function ResumenLiquidacionesAllianz({
  totales = {},
  desgloseNsr = {},
} = {}) {
  const { t } = useTranslation();
  const cot = totales.liquidacionCotizacion || {};
  const desgloseCot = cot.desglose || {};
  const tieneCotiz = Number(cot.monto) > 0;
  const diag = totales.diagrama || {};
  const hospCot = Number(cot.gastosHospedaje) || 0;
  const otrosCot = (Array.isArray(cot.otrosAmparos) ? cot.otrosAmparos : []).filter(
    (it) => Number(it?.valor) > 0
  );
  const hayAuxiliosCot = hospCot > 0 || otrosCot.length > 0;

  return (
    <div className={`grid max-w-4xl grid-cols-1 gap-4 ${tieneCotiz ? 'lg:grid-cols-2' : ''}`}>
      {tieneCotiz ? (
        <div>
          <p className="mb-1 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
            {t('allianz.settlement.quoteSettlementTitle')}
          </p>
          <p className="mb-2 font-body text-xs text-gray-500">
            {t('allianz.settlement.quoteSettlementHint')}
          </p>
          <div className="grid grid-cols-1 gap-1 border border-gray-200 dark:border-gray-700">
            <Fila label={t('allianz.settlement.totalQuote')} valor={cot.monto} />
            {Number(desgloseCot.montoPct) > 0 ? (
              <Fila label={desgloseCot.etiquetaPct} valor={desgloseCot.montoPct} />
            ) : null}
            {Number(desgloseCot.montoSmmlv) > 0 ? (
              <Fila label={desgloseCot.etiquetaSmmlv} valor={desgloseCot.montoSmmlv} />
            ) : null}
            <Fila
              label={t('allianz.settlement.deductibleToApply')}
              valor={cot.deducibleAplicado}
            />
            {hayAuxiliosCot ? (
              <Fila
                label={t('allianz.settlement.suggestedAfterDeductible')}
                valor={cot.neto}
              />
            ) : null}
            {hospCot > 0 ? (
              <Fila label={t('allianz.settlement.lodgingAllowance')} valor={hospCot} />
            ) : null}
            {otrosCot.map((it) => (
              <Fila
                key={it.id || `${it.tipo}-${it.nombre}`}
                label={it.nombre || it.tipo}
                valor={it.valor}
              />
            ))}
            <Fila
              label={
                hayAuxiliosCot
                  ? t('allianz.settlement.quoteTotalAfterDeductibleAndAllowances')
                  : t('allianz.settlement.suggestedAfterDeductible')
              }
              valor={cot.total ?? cot.neto}
              bold
              last
            />
          </div>
          {desgloseCot.texto ? (
            <p className="mt-2 text-xs text-gray-500">{desgloseCot.texto}</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="mb-1 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t('allianz.settlement.nsrSettlementTitle')}
        </p>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('allianz.settlement.nsrSettlementHint')}
        </p>
        <div className="grid grid-cols-1 gap-1 border border-gray-200 dark:border-gray-700">
          <Fila label={t('allianz.settlement.totalDamagesNsr')} valor={totales.totalDanios} />
          <Fila label="Hospedaje" valor={diag.gastosHospedaje} />
          <Fila label={desgloseNsr.etiquetaPct} valor={desgloseNsr.montoPct} />
          <Fila label={desgloseNsr.etiquetaSmmlv} valor={desgloseNsr.montoSmmlv} />
          <Fila
            label={t('allianz.settlement.deductibleToApply')}
            valor={desgloseNsr.aplicado}
          />
          <Fila label="Otros amparos (sin deducible)" valor={totales.totalOtrosAmparos} />
          <Fila
            label={t('allianz.settlement.suggestedAfterDeductible')}
            valor={totales.totalIndemnizar}
            bold
            last
          />
        </div>
        {desgloseNsr.texto ? (
          <p className="mt-2 text-xs text-gray-500">{desgloseNsr.texto}</p>
        ) : null}
      </div>
    </div>
  );
}
