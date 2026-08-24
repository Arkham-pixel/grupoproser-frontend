/**
 * Regresión: Valor a Indemnizar Alfa (UI = Excel = Finiquito = valorLiquidado).
 * Fórmula: (subtotal + AIU) − deducible + otros amparos.
 *
 * Uso: node scripts/testIndemnizarAlfa.mjs
 *      npm run test:alfa-indemnizar
 */
globalThis.localStorage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
};

const {
  calcularLiquidacionAlfa,
  resolverMontoIndemnizarAlfa,
  formatearMonto,
} = await import(
  '../src/components/SubcomponenteSegurosAlfa/liquidadorAlfaHelpers.js'
);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Caso real de pantalla (BANCO BOGOTA / terremoto) — montos del Formato liquidación. */
const VALOR_ASEGURADO = 229_147_688;
const SUBTOTAL_ITEMS = 9_897_239;
const AIU_ESPERADO = 1_979_448; // 20%
const DEDUCIBLE_ESPERADO = 4_582_953.76; // 2% VA (mayor que 2 SMMLV)
const OTROS_AMPAROS = 107_200;
const SUBTOTAL_EDIFICIO = 7_293_733; // subtotal + AIU − deducible (redondeo UI)
const VALOR_INDEMNIZAR = 7_400_933; // + otros

const liquidador = {
  encabezado: {
    tomador: 'BANCO BOGOTA',
    asegurado: 'FREYNER ANDRÉS RUIZ FLAKER',
    cobertura: 'TERREMOTO',
    valorAseguradoInmueble: VALOR_ASEGURADO,
  },
  liquidacionCatastrofico: {
    valorAsegurado: VALOR_ASEGURADO,
    deducibleConfig: {
      porcentaje: 2,
      cantidadSMMLV: 2,
      anioSMMLV: 2026,
      valorSMMLV: 1_750_905,
      baseDeducible: 'valor_asegurable',
      pesosOtro: DEDUCIBLE_ESPERADO,
    },
  },
  evaluacionSismicaNSR10: {
    presupuesto: { aiuPorcentaje: 0.2, items: [] },
  },
  detalleLiquidacionCat: [
    { descripcion: 'Demolición estuco y pintura', valorPerdida: 594_000 },
    { descripcion: 'Sellado y reparación de grietas', valorPerdida: 630_630 },
    { descripcion: 'Vinilo cielo tipo 1', valorPerdida: 2_205_225 },
    { descripcion: 'Repello muro 1:3', valorPerdida: 3_228_104 },
    { descripcion: 'Estuco plástico muro', valorPerdida: 1_671_472 },
    { descripcion: 'Vinilo muro tipo 1', valorPerdida: 1_567_808 },
  ],
  otrosAmparos: [
    { tipo: 'retiro_escombros', aplica: true, valor: OTROS_AMPAROS },
  ],
};

const sumaDetalle = liquidador.detalleLiquidacionCat.reduce(
  (s, it) => s + it.valorPerdida,
  0
);
assert(sumaDetalle === SUBTOTAL_ITEMS, `subtotal detalle ${sumaDetalle} ≠ ${SUBTOTAL_ITEMS}`);

const tot = calcularLiquidacionAlfa(liquidador);
assert(
  Math.abs(tot.subtotal - SUBTOTAL_ITEMS) < 0.02,
  `subtotal calc ${tot.subtotal} ≠ ${SUBTOTAL_ITEMS}`
);
assert(Math.abs(tot.aiu - AIU_ESPERADO) < 1, `AIU ${tot.aiu} ≠ ${AIU_ESPERADO}`);
assert(
  Math.abs(tot.deducibleAplicado - DEDUCIBLE_ESPERADO) < 1,
  `deducible ${tot.deducibleAplicado} ≠ ${DEDUCIBLE_ESPERADO}`
);
assert(
  Math.abs(tot.totalOtrosAmparos - OTROS_AMPAROS) < 0.02,
  `otros ${tot.totalOtrosAmparos} ≠ ${OTROS_AMPAROS}`
);
assert(
  Math.abs(tot.indemnizacionPrincipal - SUBTOTAL_EDIFICIO) < 2,
  `subtotal edificio ${tot.indemnizacionPrincipal} ≠ ${SUBTOTAL_EDIFICIO}`
);
assert(
  Math.abs(tot.totalIndemnizar - VALOR_INDEMNIZAR) < 2,
  `indemnizar ${tot.totalIndemnizar} ≠ ${VALOR_INDEMNIZAR}`
);

// Regresión crítica: el % hospedaje NSR no debe colarse (era el bug → 9.69M)
assert(
  Math.abs(tot.totalIndemnizar - 9_692_410.04) > 1000,
  'no debe reaparecer el total inflado por hospedaje NSR (9.69M)'
);

// Blindaje: totales viejos / valorLiquidado incorrecto NO deben ganar
const stale = { totalIndemnizar: 9_692_410.04 };
const resolved = resolverMontoIndemnizarAlfa(liquidador, stale);
assert(
  Math.abs(resolved.totalIndemnizar - VALOR_INDEMNIZAR) < 2,
  `resolver ignoró stale? got ${resolved.totalIndemnizar}`
);
assert(
  Math.abs(resolved.totalIndemnizar - stale.totalIndemnizar) > 1000,
  'stale 9.69M no debe usarse'
);

// Formato moneda del finiquito no debe mostrar el monto viejo
const montoTxt = formatearMonto(resolved.totalIndemnizar, { decimals: 2 });
assert(!montoTxt.includes('9.692.410'), `monto finiquito no debe ser 9.69M: ${montoTxt}`);
assert(
  montoTxt.replace(/\s/g, '').includes('7.400.933') ||
    Math.abs(resolved.totalIndemnizar - 7_400_933) < 2,
  `monto finiquito esperado ~7.400.933, got ${montoTxt}`
);

console.log('OK testIndemnizarAlfa — Valor a Indemnizar blindado:', montoTxt);
console.log('  subtotal', tot.subtotal);
console.log('  AIU', tot.aiu);
console.log('  deducible', tot.deducibleAplicado);
console.log('  otros', tot.totalOtrosAmparos);
console.log('  total', resolved.totalIndemnizar);
