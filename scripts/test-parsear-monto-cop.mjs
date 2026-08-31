import {
  compactarMontosEnLineaCOP,
  documentoUsaTildeMiles,
  parsearMontoCOP,
  RE_MONTO_COP,
} from '../src/utils/parsearMontoCOP.js';

const a = "'";
const casos = [
  [`$61${a}642.000`, 61642000],
  ['$61.642.000', 61642000],
  ['$61~642.000', 61642000],
  [`$61 ${a} 642 . 000`, 61642000],
  ['$9.842.000', 9842000],
  [`$21${a}568.750`, 21568750],
  ['$12,450.00', 12450],
  ['12.450.000', 12450000],
];

let fallos = 0;
for (const [crudo, esperado] of casos) {
  const n = parsearMontoCOP(crudo);
  const ok = n === esperado;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'OK ' : 'FAIL'} ${crudo} => ${n} (esperado ${esperado})`);
}

RE_MONTO_COP.lastIndex = 0;
const matchTilde = String(`$61${a}642.000`).match(RE_MONTO_COP);
const okMatch = matchTilde && matchTilde[0].includes('642');
if (!okMatch) fallos += 1;
console.log(`${okMatch ? 'OK ' : 'FAIL'} regex lee la tilde`, matchTilde);

const okUsa = documentoUsaTildeMiles([`TOTAL $61${a}642.000`]);
if (!okUsa) fallos += 1;
console.log(`${okUsa ? 'OK ' : 'FAIL'} detecta tilde en documento`);

const compact = compactarMontosEnLineaCOP(`TOTAL $61${a}642.000`);
const okCompact = compact.includes('61.642.000');
if (!okCompact) fallos += 1;
console.log(`${okCompact ? 'OK ' : 'FAIL'} compactar ${compact}`);

process.exit(fallos ? 1 : 0);
