/**
 * Regresión dashboard listado BBVA CAT: no mezclar cuantía, reserva BBVA,
 * reserva ajustador ni valor a liquidar.
 *
 * Uso: node scripts/testDashboardBbvaCatListadoStats.mjs
 */
globalThis.localStorage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
};

const {
  construirDashboardBbvaCatListado,
} = await import(
  '../src/components/SubcomponenteBbvaCat/dashboardBbvaCatListadoStats.js'
);
const {
  diferenciaValoresProserBbvaCat,
  numeroGuardadoBbvaCat,
  tieneValorALiquidarBbvaCat,
  valorALiquidarEsCeroCalculadoBbvaCat,
} = await import('../src/components/SubcomponenteBbvaCat/bbvaCatHelpers.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const CUANTIA = 18_147_313;
const milCasos = Array.from({ length: 1000 }, (_, i) => ({
  estado: 'CASO NUEVO',
  valorEstimadoAseguradora: CUANTIA,
  reserva: 99_000_000,
  valorLiquidado: i === 0 ? 5_000_000 : null,
  valorALiquidar: null,
}));

const mil = construirDashboardBbvaCatListado(milCasos);
assert(mil.kpis.estimadoPorCaso === CUANTIA, `mediana debe ser ${CUANTIA}, fue ${mil.kpis.estimadoPorCaso}`);
assert(mil.kpis.estimadoPorCaso !== CUANTIA * 1000, 'no se debe sumar la cuantía probable');
assert(mil.kpis.valorLiquidado === 5_000_000, 'KPI reserva ajustador solo suma valorLiquidado');
assert(mil.kpis.valorALiquidar === 0, 'sin valorALiquidar la suma Proser a liquidar es 0');
assert(mil.kpis.casosConValorALiquidar === 0, 'reserva BBVA no cuenta como valor a liquidar');
assert(mil.kpis.casosConLiquidado === 1, 'un solo caso con reserva ajustador');
assert(mil.kpis.completitud.soloReserva === 1, '1 caso solo con reserva ajustador');
assert(mil.kpis.completitud.ninguno === 999, `esperaba 999 sin Proser, fue ${mil.kpis.completitud.ninguno}`);

const mixto = construirDashboardBbvaCatListado([
  { estado: 'ANÁLISIS DEL CASO', valorLiquidado: 1_000_000, valorALiquidar: 800_000, reserva: 50 },
  { estado: 'CASO NUEVO', valorLiquidado: 2_000_000, valorALiquidar: null, reserva: 80 },
  {
    estado: 'PENDIENTE DE DOCUMENTO',
    valorLiquidado: null,
    valorALiquidar: 0,
    liquidador: { encabezado: { ok: true } },
    reserva: 90,
  },
  { estado: 'CASO NUEVO', reserva: 123, valorEstimadoAseguradora: CUANTIA },
  { estado: 'CASO PARA PAGO', valorLiquidado: 400_000, valorALiquidar: 350_000, reserva: 10 },
]);
assert(mixto.kpis.valorLiquidado === 3_400_000, 'suma reserva ajustador incluye pago');
assert(mixto.kpis.valorALiquidar === 350_000, 'valor a liquidar solo en caso para pago');
assert(mixto.kpis.casosConValorALiquidar === 1, 'liquidador en análisis no cuenta como valor a liquidar');
assert(mixto.kpis.completitud.ambos === 1, 'ambos solo si ya está para pago');
assert(mixto.kpis.completitud.soloReserva === 2, 'análisis y caso nuevo con reserva');
assert(mixto.kpis.completitud.soloALiquidar === 0, 'liquidador solo no es valor a liquidar');
assert(mixto.kpis.completitud.ninguno === 2, 'sin reserva Proser ni liquidación de pago');
assert(
  mixto.reservaPorEstado.every((f) => typeof f.valor === 'number'),
  'gráficos de reserva usan montos de valorLiquidado'
);

assert(numeroGuardadoBbvaCat(0) === 0, '0 es un número guardado');
assert(numeroGuardadoBbvaCat('') == null, 'vacío no es número');
assert(tieneValorALiquidarBbvaCat({ valorALiquidar: 0 }) === true, '0 guardado es valor a liquidar');
assert(valorALiquidarEsCeroCalculadoBbvaCat({ valorALiquidar: 0 }) === true, 'cero calculado');
assert(
  valorALiquidarEsCeroCalculadoBbvaCat({ liquidador: { x: 1 } }) === true,
  'liquidador sin monto se trata como cero calculado'
);

const d0 = diferenciaValoresProserBbvaCat(800_000, 800_000);
assert(d0.comparable && d0.diferencia === 0, 'diferencia 0 cuando coinciden');
const d1 = diferenciaValoresProserBbvaCat(900_000, 800_000);
assert(d1.comparable && d1.diferencia === 100_000, 'diferencia positiva');
const d2 = diferenciaValoresProserBbvaCat('', 800_000);
assert(!d2.comparable, 'no comparable si falta un valor');

console.log('OK dashboard BBVA CAT listado: campos financieros no mezclados');
