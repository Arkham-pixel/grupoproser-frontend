/**
 * Honorarios Zurich — tarifa por intervalos de valor liquidado (ajuste bruto).
 * No es cobro por horas: rangos fijos + 1,5% en el tramo superior.
 */

export const PORCENTAJE_HONORARIOS_ZURICH_SUPERIOR = 0.015;

/** Rangos inclusivos; el último usa porcentaje sobre el valor liquidado. */
export const RANGOS_HONORARIOS_ZURICH = Object.freeze([
  { id: 'r1', desde: 0, hasta: 15_000_000, honorarios: 1_200_000, modo: 'fijo' },
  { id: 'r2', desde: 15_000_001, hasta: 30_000_000, honorarios: 1_600_000, modo: 'fijo' },
  { id: 'r3', desde: 30_000_001, hasta: 70_000_000, honorarios: 3_200_000, modo: 'fijo' },
  { id: 'r4', desde: 70_000_001, hasta: 130_000_000, honorarios: 7_000_000, modo: 'fijo' },
  { id: 'r5', desde: 130_000_001, hasta: 200_000_000, honorarios: 10_000_000, modo: 'fijo' },
  { id: 'r6', desde: 200_000_001, hasta: 350_000_000, honorarios: 14_000_000, modo: 'fijo' },
  { id: 'r7', desde: 350_000_001, hasta: 700_000_000, honorarios: 26_000_000, modo: 'fijo' },
  { id: 'r8', desde: 700_000_001, hasta: 1_500_000_000, honorarios: 35_000_000, modo: 'fijo' },
  { id: 'r9', desde: 1_500_000_001, hasta: 3_000_000_000, honorarios: 45_000_000, modo: 'fijo' },
  {
    id: 'r10',
    desde: 3_000_000_001,
    hasta: Number.POSITIVE_INFINITY,
    honorarios: null,
    modo: 'porcentaje',
    porcentaje: PORCENTAJE_HONORARIOS_ZURICH_SUPERIOR,
  },
]);

export function parsearValorLiquidadoZurich(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const limpio = String(valor)
    .replace(/[$\sCOP]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export function formatearCopZurich(valor) {
  if (valor == null || !Number.isFinite(Number(valor))) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(valor)));
}

export function formatearRangoZurich(rango) {
  if (!rango) return '';
  const desde = formatearCopZurich(rango.desde);
  const hasta =
    rango.hasta === Number.POSITIVE_INFINITY
      ? 'en adelante'
      : formatearCopZurich(rango.hasta);
  if (rango.modo === 'porcentaje') {
    const pct = Math.round((rango.porcentaje || PORCENTAJE_HONORARIOS_ZURICH_SUPERIOR) * 1000) / 10;
    return `${desde} – ${hasta} → ${pct}% del ajuste bruto`;
  }
  return `${desde} – ${hasta} → ${formatearCopZurich(rango.honorarios)}`;
}

export function opcionesTarifaZurich() {
  return RANGOS_HONORARIOS_ZURICH.map((rango) => ({
    id: rango.id,
    label: formatearRangoZurich(rango),
    rango,
  }));
}

export function buscarRangoZurichPorId(rangoId) {
  return RANGOS_HONORARIOS_ZURICH.find((r) => r.id === rangoId) || null;
}

export function resolverRangoZurichPorValor(valorLiquidado) {
  const valor = parsearValorLiquidadoZurich(valorLiquidado);
  if (valor == null) return null;
  return (
    RANGOS_HONORARIOS_ZURICH.find((r) => valor >= r.desde && valor <= r.hasta) ||
    RANGOS_HONORARIOS_ZURICH[RANGOS_HONORARIOS_ZURICH.length - 1]
  );
}

export function calcularHonorariosZurich(rango, valorLiquidado) {
  if (!rango) return null;
  const valor = parsearValorLiquidadoZurich(valorLiquidado) ?? 0;
  if (rango.modo === 'porcentaje') {
    const pct = rango.porcentaje ?? PORCENTAJE_HONORARIOS_ZURICH_SUPERIOR;
    return Math.round(valor * pct);
  }
  return Math.round(Number(rango.honorarios) || 0);
}

/**
 * Resuelve tarifa sugerida (o de un rango forzado) según valor liquidado.
 */
export function resolverTarifaHonorariosZurich(valorLiquidado, rangoIdForzado = null) {
  const valor = parsearValorLiquidadoZurich(valorLiquidado);
  const rango =
    (rangoIdForzado && buscarRangoZurichPorId(rangoIdForzado)) ||
    resolverRangoZurichPorValor(valor) ||
    null;
  if (!rango) {
    return {
      valorLiquidado: valor,
      tieneValor: valor != null && valor >= 0,
      rangoId: null,
      label: '',
      honorarios: null,
      modo: null,
      porcentaje: null,
    };
  }
  const honorarios = calcularHonorariosZurich(rango, valor);
  return {
    valorLiquidado: valor,
    tieneValor: valor != null && valor >= 0,
    rangoId: rango.id,
    label: formatearRangoZurich(rango),
    honorarios,
    modo: rango.modo,
    porcentaje: rango.porcentaje ?? null,
  };
}

export function construirPaqueteFacturacionZurich({
  valorLiquidado,
  tarifa,
  fecha = new Date().toISOString().slice(0, 10),
} = {}) {
  if (!tarifa?.rangoId || tarifa.honorarios == null) return null;
  return {
    valorLiquidado: tarifa.valorLiquidado ?? parsearValorLiquidadoZurich(valorLiquidado),
    honorarios: Math.round(tarifa.honorarios),
    rangoId: tarifa.rangoId,
    rangoLabel: tarifa.label || '',
    modo: tarifa.modo,
    porcentaje: tarifa.porcentaje,
    fecha,
  };
}
