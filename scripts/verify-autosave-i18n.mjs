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
const a = Object.keys(es).filter((k) => k.startsWith('autoSave.'));
const b = Object.keys(en).filter((k) => k.startsWith('autoSave.'));
console.log('autoSave es/en', a.length, b.length);
console.log('Δ', a.filter((k) => !b.includes(k)).length, b.filter((k) => !a.includes(k)).length);

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.jsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = walk('src/components/AutoSave');
const used = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /\bt\(\s*['`]([^'`]+)['`]/g;
  let m;
  while ((m = re.exec(s))) {
    if (!m[1].includes('${')) used.add(m[1]);
  }
}
const missing = [...used].filter((k) => !Object.prototype.hasOwnProperty.call(es, k));
console.log('files', files.length, 'tKeys', used.size, 'missing', missing.length);
if (missing.length) console.log(missing.slice(0, 40));
const withT = files.filter((f) => fs.readFileSync(f, 'utf8').includes('useTranslation')).length;
console.log('with useTranslation', withT);
console.log(missing.length === 0 && a.length === b.length && a.length > 0 ? 'RESULT: OK' : 'RESULT: FAIL');
