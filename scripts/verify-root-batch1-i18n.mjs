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

const namespaces = ['acta.', 'siniestros.', 'session.', 'map.'];
let nsOk = true;
for (const ns of namespaces) {
  const a = Object.keys(es).filter((k) => k.startsWith(ns));
  const b = Object.keys(en).filter((k) => k.startsWith(ns));
  const onlyEs = a.filter((k) => !b.includes(k));
  const onlyEn = b.filter((k) => !a.includes(k));
  console.log(ns, 'es/en', a.length, b.length, 'Δ', onlyEs.length + onlyEn.length);
  if (onlyEs.length || onlyEn.length) {
    nsOk = false;
    if (onlyEs.length) console.log('  onlyEs', onlyEs.slice(0, 20));
    if (onlyEn.length) console.log('  onlyEn', onlyEn.slice(0, 20));
  }
}

const files = [
  'src/components/ActaInspeccion.jsx',
  'src/components/SeccionFirmasActa.jsx',
  'src/components/SiniestroForm.jsx',
  'src/components/SiniestrosList.jsx',
  'src/components/SessionTimer.jsx',
  'src/components/SessionIndicator.jsx',
  'src/components/MapaUbicacion.jsx',
];

const used = new Set();
const withT = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('useTranslation')) withT.push(path.basename(f));
  const re = /\bt\(\s*['`]([^'`]+)['`]/g;
  let m;
  while ((m = re.exec(s))) {
    if (!m[1].includes('${')) used.add(m[1]);
  }
}

const missing = [...used].filter((k) => !Object.prototype.hasOwnProperty.call(es, k));
const missingEn = [...used].filter((k) => !Object.prototype.hasOwnProperty.call(en, k));

console.log('files', files.length, 'with useTranslation', withT.length, withT.join(', '));
console.log('tKeys', used.size, 'missing', missing.length, 'missingEn', missingEn.length);
if (missing.length) console.log(missing.slice(0, 40));
if (missingEn.length) console.log(missingEn.slice(0, 40));

const ok =
  missing.length === 0 &&
  missingEn.length === 0 &&
  nsOk &&
  withT.length === files.length &&
  Object.keys(es).filter((k) => k.startsWith('acta.')).length > 0;

console.log(ok ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);
