import fs from 'fs';
import path from 'path';

const es = JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));

function flat(o, p = '', a = {}) {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o)) flat(v, p ? `${p}.${k}` : k, a);
  } else a[p] = o;
  return a;
}

const fe = flat(es);
const fn = flat(en);
const a = Object.keys(fe).filter((k) => k.startsWith('machinery.'));
const b = Object.keys(fn).filter((k) => k.startsWith('machinery.'));
console.log('machinery es/en', a.length, b.length);
console.log(
  'Δ',
  a.filter((k) => !b.includes(k)).length,
  b.filter((k) => !a.includes(k)).length
);
if (!a.length) console.log('MISSING NAMESPACE');
else console.log('sample', a.slice(0, 8));

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.jsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = walk('src/components/SubcomponenteMaquinaria');
const used = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /\bt\(\s*['`]([^'`]+)['`]/g;
  let m;
  while ((m = re.exec(s))) {
    if (!m[1].includes('${')) used.add(m[1]);
  }
}
const missing = [...used].filter(
  (k) =>
    !Object.prototype.hasOwnProperty.call(fe, k) &&
    !Object.keys(fe).some((x) => x.startsWith(`${k}.`) || x.startsWith(`${k}_`))
);
console.log('files', files.length, 'tKeys', used.size, 'missing', missing.length);
if (missing.length) console.log(missing.slice(0, 30));

// check withI18n
let withT = 0;
for (const f of files) {
  if (fs.readFileSync(f, 'utf8').includes('useTranslation') || fs.readFileSync(f, 'utf8').includes("t('machinery")) withT++;
}
console.log('jsx with machinery i18n', withT, '/', files.filter((f) => f.endsWith('.jsx')).length);
