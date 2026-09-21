/**
 * Tarifa No. 1 Previsora — honorarios por estimación de reserva.
 * Hora = 2,05 SMDLV. SMMLV 2026: $1.750.905.
 */

export const SMMLV_PREVISORA_2026 = 1750905;
export const SMDLV_PREVISORA_2026 = 58364;
export const FACTOR_HORA_ADICIONAL_PREVISORA = 2.05;
/** 2,05 SMDLV 2026, según tabla impresa. */
export const VALOR_HORA_PREVISORA_2026 = 119645;
export const TARIFA_INSPECCION_PREVISORA = 370000;

/** Primer rango: hasta $100.000.000 (incluye reserva ≤ $30.000.000). */
export const RANGOS_HORAS_PREVISORA = [
  { hasta: 100000000, maxHoras: 12.5, maxHonorarios: 1495565 },
  { hasta: 200000000, maxHoras: 25, maxHonorarios: 2991129 },
  { hasta: 300000000, maxHoras: 37.5, maxHonorarios: 4486694 },
  { hasta: 400000000, maxHoras: 50, maxHonorarios: 5982259 },
  { hasta: Number.POSITIVE_INFINITY, maxHoras: 62.5, maxHonorarios: 7477823 },
];

export function parsearReservaPrevisora(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const limpio = String(valor)
    .replace(/[$\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

export function resolverTarifaHonorariosPrevisora(reserva) {
  const valorReserva = parsearReservaPrevisora(reserva);
  const rango =
    RANGOS_HORAS_PREVISORA.find((r) => valorReserva <= r.hasta) ||
    RANGOS_HORAS_PREVISORA[RANGOS_HORAS_PREVISORA.length - 1];
  return {
    valorReserva,
    tieneReserva: valorReserva > 0,
    maxHoras: rango.maxHoras,
    maxHonorarios: rango.maxHonorarios,
    valorHora: VALOR_HORA_PREVISORA_2026,
    inspeccion: TARIFA_INSPECCION_PREVISORA,
    smdlv: SMDLV_PREVISORA_2026,
    factorHoraAdicional: FACTOR_HORA_ADICIONAL_PREVISORA,
  };
}
