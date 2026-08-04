import fs from 'fs';
import path from 'path';

function flat(o, p = '', a = {}) {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o)) flat(v, p ? `${p}.${k}` : k, a);
  } else a[p] = o;
  return a;
}

const es = flat(JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8')));
const en = flat(JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8')));

const prefixes = ['equidadFdm.', 'express.', 'properties.'];
const a = Object.keys(es).filter((k) => prefixes.some((p) => k.startsWith(p)));
const b = Object.keys(en).filter((k) => prefixes.some((p) => k.startsWith(p)));
const deltaEs = a.filter((k) => !b.includes(k));
const deltaEn = b.filter((k) => !a.includes(k));
console.log('fdm/express/properties es/en', a.length, b.length);
console.log('Δ', deltaEs.length, deltaEn.length);
if (deltaEs.length) console.log('only es', deltaEs.slice(0, 20));
if (deltaEn.length) console.log('only en', deltaEn.slice(0, 20));

const files = [
  'src/components/SubcomponenteEquidadFdm/LiquidadorEquidadFdm.jsx',
  'src/components/SubcomponenteEquidadFdm/AccionesFdmMenu.jsx',
  'src/components/SubcomponenteExpress/AlertasExpress.jsx',
  'src/components/SubcomponenteExpress/DashboardExpress.jsx',
  'src/components/SubcomponentePropiedades/AccionesPropiedadesMenu.jsx',
  'src/components/SubcomponentePropiedades/CargaPropiedades.jsx',
];

const used = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /\bt\(\s*['`]([^'`]+)['`]/g;
  let m;
  while ((m = re.exec(s))) {
    if (!m[1].includes('${')) used.add(m[1]);
  }
}

const missingEs = [...used].filter((k) => !Object.prototype.hasOwnProperty.call(es, k));
const missingEn = [...used].filter((k) => !Object.prototype.hasOwnProperty.call(en, k));
console.log('files', files.length, 'tKeys', used.size, 'missing', missingEs.length);
if (missingEs.length) console.log('missing es', missingEs);
if (missingEn.length) console.log('missing en', missingEn);

const withT = files.filter((f) => fs.readFileSync(f, 'utf8').includes('useTranslation')).length;
console.log('with useTranslation', withT);

const ok =
  missingEs.length === 0 &&
  missingEn.length === 0 &&
  deltaEs.length === 0 &&
  deltaEn.length === 0 &&
  used.size > 0;

console.log(ok ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);
