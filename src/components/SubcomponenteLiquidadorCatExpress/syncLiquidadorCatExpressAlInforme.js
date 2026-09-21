/**
 * Pasa el liquidador express CAT al informe (UI, Word y resumen de ítems).
 * Usa las mismas filas/totales/deducible del express; no recalcula otra fórmula.
 */
import { mapearItemsNsr10APresupuestoInforme } from '../SubcomponenteFormularioCatastrofico/syncPresupuestoNsr10AlInforme.js';
import {
  esLiquidadorExpress,
  filasExpressConCantidad,
  liquidacionExpressConDeducible,
  totalFilaPresupuesto,
} from './liquidadorCatExpressHelpers.js';

export { esLiquidadorExpress };

export function payloadExpressParaInforme(
  liquidador = {},
  { modulo = '', aiuPorcentaje } = {}
) {
  if (!esLiquidadorExpress(liquidador)) return null;
  const tot = liquidacionExpressConDeducible(liquidador, { aiuPorcentaje, modulo });
  const filasConCantidad = filasExpressConCantidad(tot.filas);
  const aiuPct = Number(tot.aiuPorcentaje);
  return {
    ...tot,
    filasConCantidad,
    itemsInforme: mapearItemsNsr10APresupuestoInforme(filasConCantidad),
    itemsPlanos: filasConCantidad.map((it, idx) => {
      const total = totalFilaPresupuesto(it) || 0;
      return {
        id: it.id || it.catalogoId || `exp-${idx}`,
        concepto: it.actividad || it.componente || 'Ítem',
        grupo: it.capitulo || '',
        actividad: it.actividad || '',
        cantidad: it.cantidad,
        valorUnitario: it.valorUnitario,
        valorReclamado: total,
        valorIndemnizable: total,
      };
    }),
    textoDeducible: tot.cfg?.texto || 'Deducible',
    aiuPct: Number.isFinite(aiuPct) ? Math.round(aiuPct * 1000) / 10 : 25,
    indemnizacionSugerida: String(Math.round(Number(tot.totalIndemnizar) || 0)),
  };
}

/** Filas que debe pintar el Word: express con cantidad, o las NSR ya guardadas. */
export function filasPresupuestoParaWord(
  liquidador = {},
  filasNsr = [],
  { modulo = '', aiuPorcentaje } = {}
) {
  const express = payloadExpressParaInforme(liquidador, { modulo, aiuPorcentaje });
  if (express?.filasConCantidad?.length) return express.filasConCantidad;
  return Array.isArray(filasNsr) ? filasNsr : [];
}

export function footerExpressParaWord(express) {
  if (!express) return null;
  return {
    subtotal: express.subtotal,
    aiu: express.aiu,
    imprevistos: 0,
    impuestos: 0,
    total: express.total,
    deducibleAplicado: express.deducibleAplicado,
    totalIndemnizar: express.totalIndemnizar,
    aiuPct: express.aiuPct,
    textoDeducible: express.textoDeducible,
  };
}
