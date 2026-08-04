const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const es = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));

function flatten(obj, prefix = '') {
  const keys = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) keys.push(prefix);
    return keys;
  }
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

const esPol = flatten(es.pol || {}, 'pol');
const enPol = flatten(en.pol || {}, 'pol');
const esSet = new Set(esPol);
const enSet = new Set(enPol);

const onlyEs = esPol.filter((k) => !enSet.has(k));
const onlyEn = enPol.filter((k) => !esSet.has(k));

const reportePolDir = path.join(root, 'src/components/ReportePol');
const files = fs.readdirSync(reportePolDir).filter((f) => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.tsx'));

const usedKeys = new Set();
const keyRegex = /t\(\s*['"`](pol\.[^'"`]+)['"`]/g;

for (const file of files) {
  const content = fs.readFileSync(path.join(reportePolDir, file), 'utf8');
  let m;
  while ((m = keyRegex.exec(content)) !== null) {
    // strip interpolation args — key is first string only
    usedKeys.add(m[1]);
  }
}

const missing = [...usedKeys].filter((k) => !esSet.has(k) || !enSet.has(k)).sort();
const unused = esPol.filter((k) => !usedKeys.has(k)).sort();

console.log('=== POL i18n verification ===');
console.log('es pol keys:', esPol.length);
console.log('en pol keys:', enPol.length);
console.log('es===en:', esPol.length === enPol.length && onlyEs.length === 0 && onlyEn.length === 0);
console.log('only in es:', onlyEs.length ? onlyEs : '[]');
console.log('only in en:', onlyEn.length ? onlyEn : '[]');
console.log('used in ReportePol t():', usedKeys.size);
console.log('missing=:', missing.length, missing.length ? missing : 0);
console.log('unused (in locales, not referenced):', unused.length);
if (unused.length) console.log(unused.join('\n'));

const ok = esPol.length === enPol.length && onlyEs.length === 0 && onlyEn.length === 0 && missing.length === 0;
console.log(ok ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);
