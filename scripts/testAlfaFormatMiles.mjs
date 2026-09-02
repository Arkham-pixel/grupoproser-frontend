/**
 * formatMiles Alfa: no concatenar centavos (36208706.98 ≠ 3.620.870.698).
 * node scripts/testAlfaFormatMiles.mjs
 */
import {
  formatMiles,
  parseMontoCopAlfa,
} from '../src/components/SubcomponenteSegurosAlfa/segurosAlfaHelpers.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(
  formatMiles(36_208_706.98) === '36.208.707',
  `formatMiles no debe concatenar centavos: ${formatMiles(36_208_706.98)}`
);
assert(
  formatMiles(46_194_053.4) === '46.194.053',
  `formatMiles reclamado: ${formatMiles(46_194_053.4)}`
);
assert(
  formatMiles(3_668_964_288) === '36.689.643',
  `formatMiles desinfla .88 concatenados: ${formatMiles(3_668_964_288)}`
);
assert(formatMiles(499_268_321) === '499.268.321', 'SID entero');
assert(parseMontoCopAlfa('36.208.707') === 36_208_707, 'parse 36.208.707');
assert(parseMontoCopAlfa('36.208.706,98') === 36_208_706.98, 'parse 36.208.706,98');
assert(parseMontoCopAlfa(36_208_706.98) === 36_208_706.98, 'parse number');
assert(parseMontoCopAlfa('36.208.707') !== 36.208707, 'puntos no son decimales');

console.log('OK testAlfaFormatMiles');
