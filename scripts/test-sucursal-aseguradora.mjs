import assert from 'assert';
import {
  filtrarSucursalesPorAseguradora,
  sucursalAutomatica,
} from '../src/utils/filtrarSucursalesAseguradora.js';

const catalogo = [
  'ACI CARGO B/QUILLA',
  'ADIDAS',
  'ALLIANZ SEGUROS S.A. SUC MEDELLIN',
  'BBVA - BOGOTA',
  'CHUBB SUC BARRANQUILLA',
  'CHUBB SUC BOGOTA',
  'CHUBB SUC CALI',
  'CHUBB SUC MEDELLIN',
  'MAPFRE SEGUROS - AV. 82 BOGOTA',
  'MAPFRE PRINCIPAL',
  'SBS B/quilla',
  'BOLIVAR -BOGOTA',
  'BOLIVAR B/QUILLA',
  'SEGUROS BOLIVAR MANIZALES',
  'ASISTENCIA BOGOTA',
  'OTRA NO RELACIONADA',
].map((nombre) => ({ nombre }));

const cases = [
  ['ACI CARGO', ['ACI CARGO B/QUILLA'], 'ACI CARGO B/QUILLA'],
  ['ADIDAS COLOMBIA', ['ADIDAS'], 'ADIDAS'],
  ['ALLIANZ SEGUROS S. A.', ['ALLIANZ SEGUROS S.A. SUC MEDELLIN'], 'ALLIANZ SEGUROS S.A. SUC MEDELLIN'],
  ['BBVA SEGUROS', ['BBVA - BOGOTA'], 'BBVA - BOGOTA'],
  ['CHUBB DE COLOMBIA', ['CHUBB SUC BARRANQUILLA', 'CHUBB SUC BOGOTA', 'CHUBB SUC CALI', 'CHUBB SUC MEDELLIN'], ''],
  ['MAPFRE SEGUROS', ['MAPFRE SEGUROS - AV. 82 BOGOTA', 'MAPFRE PRINCIPAL'], ''],
  ['SBS SEGUROS', ['SBS B/quilla'], 'SBS B/quilla'],
  ['SEGUROS BOLIVAR S.A', ['BOLIVAR -BOGOTA', 'BOLIVAR B/QUILLA', 'SEGUROS BOLIVAR MANIZALES'], ''],
  ['SERVICIOS BOLIVAR', ['ASISTENCIA BOGOTA'], 'ASISTENCIA BOGOTA'],
];

for (const [aseg, expectedNames, auto] of cases) {
  const got = filtrarSucursalesPorAseguradora(aseg, catalogo).map((i) => i.nombre);
  assert.deepStrictEqual(got, expectedNames, `filter ${aseg}: got ${JSON.stringify(got)}`);
  assert.strictEqual(sucursalAutomatica(aseg, catalogo), auto, `auto ${aseg}`);
}

console.log('RESULT: OK');
