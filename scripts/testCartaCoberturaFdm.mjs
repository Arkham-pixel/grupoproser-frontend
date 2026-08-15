/**
 * Prueba de carta de cobertura FDM: liquidación, textos y plantilla Word.
 * Uso: node scripts/testCartaCoberturaFdm.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

globalThis.localStorage = {
  getItem: () => 'es',
  setItem() {},
  removeItem() {},
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fails = [];
let passed = 0;

function ok(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  OK  ${name}`);
  } else {
    fails.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const {
  calcularLiquidacionFdm,
  causaEventoCarta,
  fechaCartaEs,
  buildCartaCoberturaPreview,
  letrasCartaCobertura,
  montoALetrasFdm,
  crearItem,
} = await import('../src/components/SubcomponenteEquidadFdm/liquidadorEquidadFdmHelpers.js');

console.log('\n== Liquidación ==');
const liquidador = {
  encabezado: {
    asegurado: 'MARIA PEREZ',
    cedula: '1234567',
    poliza: 'POL-99',
    evento: 'TERREMOTO 10 AGOSTO 2026',
    fechaSiniestro: '2026-08-10',
    fechaImpreso: '2026-08-15',
    ciudadFirma: 'Cali',
  },
  contenidos: [crearItem('Contenidos', 5_000_000)],
  edificios: [],
  deducible: { anioSMMLV: 2026, valorSMMLV: 1_750_905, cantidadSMMLV: 0.75, porcentaje: 10 },
  subsidio: 0,
};
const tot = calcularLiquidacionFdm(liquidador);
ok('pérdida 5.000.000', tot.totalPerdida === 5_000_000, String(tot.totalPerdida));
ok(
  'deducible SMMLV = 0.75 × 1.750.905',
  Math.abs(tot.deducibleSMMLV - 1_750_905 * 0.75) < 0.01,
  String(tot.deducibleSMMLV)
);
ok('usa SMMLV (mayor que 10%)', tot.usaSMMLV === true);
ok(
  'indemnización = pérdida − deducible',
  Math.abs(tot.totalIndemnizar - (5_000_000 - tot.deducibleAplicado)) < 0.01,
  String(tot.totalIndemnizar)
);

console.log('\n== Textos de carta ==');
ok('TEMBLOR → del terremoto', causaEventoCarta('TEMBLOR') === 'del terremoto');
ok(
  'TERREMOTO 10 AGOSTO 2026 → del terremoto',
  causaEventoCarta('TERREMOTO 10 AGOSTO 2026') === 'del terremoto'
);
ok('ANEGACION → de la ola invernal', causaEventoCarta('ANEGACION') === 'de la ola invernal');
ok('OLA INVERNAL → de la ola invernal', causaEventoCarta('OLA INVERNAL') === 'de la ola invernal');
ok(
  'fecha carta 10 de Agosto de 2026',
  fechaCartaEs('2026-08-10') === '10 de Agosto de 2026',
  fechaCartaEs('2026-08-10')
);
ok(
  'letras sin Pesos M/Cte.',
  letrasCartaCobertura(montoALetrasFdm(5_000_000)) === 'Cinco Millones',
  letrasCartaCobertura(montoALetrasFdm(5_000_000))
);

const preview = buildCartaCoberturaPreview(liquidador, tot);
ok('ciudad carta es Bogotá (emisor)', preview.ciudadCarta === 'Bogotá');
ok('fecha evento 10 de Agosto de 2026', preview.fechaEventoCarta === '10 de Agosto de 2026');
ok('fecha carta 15 de Agosto de 2026', preview.fechaCarta === '15 de Agosto de 2026');
ok('causa del terremoto', preview.causaEvento === 'del terremoto');
ok('asegurado MARIA PEREZ', preview.asegurado === 'MARIA PEREZ');
ok('póliza POL-99', preview.poliza === 'POL-99');

console.log('\n== Plantilla Word ==');
const templatePath = path.join(root, 'public/templates/carta-cobertura-primera-perdida-fdm.docx');
ok('plantilla existe', fs.existsSync(templatePath), templatePath);

const zipCheck = await JSZip.loadAsync(fs.readFileSync(templatePath));
ok('membrete encabezado', Boolean(zipCheck.file('word/header2.xml')));
ok('membrete pie', Boolean(zipCheck.file('word/footer2.xml')));
ok('imagen encabezado', Boolean(zipCheck.file('word/media/image1.png')));
ok('imagen pie', Boolean(zipCheck.file('word/media/image2.png')));
const docXml = await zipCheck.file('word/document.xml').async('string');
ok('document referencia header', docXml.includes('headerReference'));
ok('document referencia footer', docXml.includes('footerReference'));

function escapeXml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function withXmlSpace(attrs, text) {
  const needs =
    text.startsWith(' ') || text.endsWith(' ') || text.includes('  ') || text.includes('\n');
  if (!needs || /xml:space=/.test(attrs)) return attrs;
  return `${attrs} xml:space="preserve"`;
}
function findNextWtOpen(xml, fromIdx) {
  const re = /<w:t(?=[\s>])/g;
  re.lastIndex = fromIdx;
  const m = re.exec(xml);
  return m ? m.index : -1;
}
function readWt(xml, tStart) {
  const openEnd = xml.indexOf('>', tStart);
  const tEnd = xml.indexOf('</w:t>', openEnd);
  const attrs = xml.slice(tStart + 4, openEnd);
  return { tEnd, attrs };
}
function findLastTagOpen(xml, tagName, beforeIdx) {
  const re = new RegExp(`<w:${tagName}(?=[\\s>])`, 'g');
  let last = -1;
  let m;
  const slice = xml.slice(0, beforeIdx);
  while ((m = re.exec(slice)) !== null) last = m.index;
  return last;
}
function replaceWtAt(xml, tStart, newText) {
  const { tEnd, attrs } = readWt(xml, tStart);
  const safe = escapeXml(newText);
  return (
    xml.slice(0, tStart) +
    `<w:t${withXmlSpace(attrs, String(newText ?? ''))}>${safe}</w:t>` +
    xml.slice(tEnd + 6)
  );
}
function replaceValueAfterLabel(xml, label, newValue) {
  const idx = xml.indexOf(label);
  if (idx < 0) throw new Error(`missing ${label}`);
  return replaceWtAt(xml, findNextWtOpen(xml, idx + label.length), newValue);
}
function replaceWtContaining(xml, marker, newText) {
  const idx = xml.indexOf(marker);
  if (idx < 0) throw new Error(`missing ${marker}`);
  return replaceWtAt(xml, findLastTagOpen(xml, 't', idx + 1), newText);
}

const zip = zipCheck;
let xml = docXml;
xml = replaceValueAfterLabel(xml, 'Fecha:', ` ${preview.ciudadCarta}, ${preview.fechaCarta}`);
xml = replaceWtContaining(
  xml,
  'a causa del terremoto ocurrido el día',
  ` a causa ${preview.causaEvento} ocurrido el día ${preview.fechaEventoCarta}`
);
xml = replaceValueAfterLabel(xml, 'Asegurado / Beneficiario:', ` ${preview.asegurado}`);
xml = replaceValueAfterLabel(xml, 'Cédula de ciudadanía:', ` ${preview.cedula}`);
xml = replaceValueAfterLabel(xml, 'Número de póliza:', ` ${preview.poliza}`);
xml = replaceWtContaining(xml, '[Valor en números]', `$ ${preview.indemnizacion}`);
xml = replaceWtContaining(
  xml,
  '[Valor en letras]',
  `${preview.indemnizacionLetrasCarta} pesos M/CTE`
);

const openT = (xml.match(/<w:t(?=[\s>])/g) || []).length;
const closeT = (xml.match(/<\/w:t>/g) || []).length;
ok('XML w:t balanceados', openT === closeT, `${openT} vs ${closeT}`);

const text = xml
  .replace(/<\/w:p>/g, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&');

ok('Word tiene Bogotá y fecha de firma', text.includes('Bogotá, 15 de Agosto de 2026'));
ok('Word tiene causa y fecha del sismo', text.includes('a causa del terremoto ocurrido el día 10 de Agosto de 2026'));
ok('Word tiene asegurado', text.includes('MARIA PEREZ'));
ok('Word tiene póliza', text.includes('POL-99'));
ok('Word no deja [Nombre completo]', !text.includes('[Nombre completo]'));
ok('Word no deja [Valor en números]', !xml.includes('[Valor en números]'));
ok('Word no deja [Valor en letras]', !xml.includes('[Valor en letras]'));
ok('Word incluye valor en números', text.includes(`$ ${preview.indemnizacion}`));
ok('Word incluye valor en letras', text.includes(`${preview.indemnizacionLetrasCarta} pesos M/CTE`));

console.log('\n== UI e i18n ==');
const liquidadorJsx = fs.readFileSync(
  path.join(root, 'src/components/SubcomponenteEquidadFdm/LiquidadorEquidadFdm.jsx'),
  'utf8'
);
ok('botón carta en liquidador', liquidadorJsx.includes("setPreviewDoc('carta')"));
ok('handler descarga carta', liquidadorJsx.includes('descargarCartaCoberturaFdmWord'));

const es = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));
ok('i18n ES generateCoverageLetter', Boolean(es.equidadFdm.settlement.generateCoverageLetter));
ok('i18n EN generateCoverageLetter', Boolean(en.equidadFdm.settlement.generateCoverageLetter));
ok('i18n ES downloadCoverageLetter', Boolean(es.equidadFdm.settlement.downloadCoverageLetter));
ok('i18n EN downloadCoverageLetter', Boolean(en.equidadFdm.settlement.downloadCoverageLetter));

console.log(`\nResultado: ${passed} OK, ${fails.length} FAIL`);
if (fails.length) {
  console.error(fails.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
console.log('Todas las pruebas pasaron.');
