import fs from 'fs';
import {
  completarMillonesTruncadosCOP,
  esMontoMillonesTruncadoCOP,
  parsearMontoCOP,
} from '../src/utils/parsearMontoCOP.js';

const a = "'";
const cop = await import('../src/utils/parsearMontoCOP.js');
const src = fs
  .readFileSync(new URL('../src/components/liquidacion/cotizacionPdfLiquidacion.js', import.meta.url), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/^import[\s\S]*?from [^;]+;\n/gm, '')
  .replace(/if \(typeof window !== 'undefined'[\s\S]*?\n}\n/, '')
  .replace(/^export /gm, '');
const { extraerMontoFinalCotizacion } = new Function(
  'cop',
  `const {
    compactarMontosEnLineaCOP,
    documentoUsaTildeMiles,
    esMontoMillonesTruncadoCOP,
    normalizarSeparadoresMilesCOP,
    parsearMontoCOP,
    RE_MONTO_COP,
  } = cop;
  ${src}
  return { extraerMontoFinalCotizacion };`
)(cop);

let fallos = 0;
function check(nombre, ok, detalle = '') {
  if (!ok) fallos += 1;
  console.log(`${ok ? 'OK ' : 'FAIL'} ${nombre}${detalle ? ` ${detalle}` : ''}`);
}

check('parse 61.642.000', parsearMontoCOP('$61.642.000') === 61642000);
check(`parse 61'642.000`, parsearMontoCOP(`$61${a}642.000`) === 61642000);
check('parse 61.642000 pegado', parsearMontoCOP('61.642000') === 61642000);
check('parse truncado 61.642', parsearMontoCOP('61.642') === 61642);
check('es truncado 61.642', esMontoMillonesTruncadoCOP('61.642', 61642));
check(
  'completar 61.642',
  completarMillonesTruncadosCOP('61.642', 61642) === 61642000
);
check('no truncar 50.000', !esMontoMillonesTruncadoCOP('50.000', 50000));
check('no truncar 12,450.00', !esMontoMillonesTruncadoCOP('$12,450.00', 12450));

const casos = [
  ['solo total truncado (UI actual)', ['TOTAL $61.642'], 61642000],
  ['total con tilde completa', [`TOTAL $61${a}642.000`], 61642000],
  ['total partido', [`TOTAL $61${a}642`, '.000'], 61642000],
  [
    'pdf nuestro aliado',
    [
      `2.8 Retiro $35.000 $5${a}250.000`,
      `SUBTOTAL $51${a}660.000`,
      `iva $9${a}842.000`,
      `TOTAL $61${a}642.000`,
    ],
    61642000,
  ],
  ['lineas ya normalizadas (pdfjs)', ['IVA $9.842.000', 'TOTAL $61.642'], 61642000],
  ['puntos clasico', ['Subtotal $1.000.000', 'TOTAL COTIZACION $12.450.000'], 12450000],
  ['dolares', ['TOTAL $12,450.00'], 12450],
];

for (const [nombre, lineas, esperado] of casos) {
  const r = extraerMontoFinalCotizacion(lineas.join('\n'), { lineas });
  check(nombre, r.monto === esperado, `=> ${r.monto} (esperado ${esperado})`);
}

process.exit(fallos ? 1 : 0);
