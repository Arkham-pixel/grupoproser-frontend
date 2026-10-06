/**
 * Smoke: deducible Previsora = 3% del valor de la pérdida (no del VA).
 */
import assert from 'node:assert/strict';

const VA = 17_770_237_800;
const PERDIDA = 1_707_951_664;
const pctVa = Math.round(VA * 0.03 * 100) / 100;
const pctPerdida = Math.round(PERDIDA * 0.03 * 100) / 100;

assert.equal(pctVa, 533_107_134);
assert.ok(Math.abs(pctPerdida - 51_238_549.92) < 1 || Math.abs(pctPerdida - 51_238_550) < 1);

function resolverDeducibleAplicadoVisible({ montoPct = 0, montoSmmlv = 0, tope = null } = {}) {
  const mayor = Math.max(Number(montoPct) || 0, Number(montoSmmlv) || 0);
  if (tope === null || tope === undefined || tope === '') return Math.round(mayor * 100) / 100;
  const cap = Math.max(0, Number(tope) || 0);
  return Math.round(Math.min(mayor, cap) * 100) / 100;
}

// Con base = pérdida
const aplicadoPres = resolverDeducibleAplicadoVisible({
  montoPct: pctPerdida,
  montoSmmlv: 1_750_905,
  tope: PERDIDA,
});
assert.equal(aplicadoPres, pctPerdida);

// Contenidos sin pérdida: aplicado 0 (antes devolvía el bruto)
const aplicadoCont = resolverDeducibleAplicadoVisible({
  montoPct: pctVa,
  montoSmmlv: 1_750_905,
  tope: 0,
});
assert.equal(aplicadoCont, 0);

const indemnizar = Math.round((PERDIDA - aplicadoPres) * 100) / 100;
assert.ok(indemnizar > 1_650_000_000);
assert.ok(indemnizar < 1_660_000_000);

console.log('OK smoke deducible Previsora sobre pérdida:', {
  pctVa,
  pctPerdida,
  aplicadoPres,
  aplicadoCont,
  indemnizar,
});
