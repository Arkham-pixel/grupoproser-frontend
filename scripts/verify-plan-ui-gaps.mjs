/**
 * Verifica gaps del plan bilingüe UI (login locale, helpers, TranslatedTextArea, CuadroEquipos).
 * Uso: node scripts/verify-plan-ui-gaps.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const checks = [
  {
    name: 'login.tsx contains changeLanguage',
    ok: () => read('src/components/login.tsx').includes('changeLanguage'),
  },
  {
    name: 'locale.js exports getAppLocale',
    ok: () => /export\s+function\s+getAppLocale/.test(read('src/utils/locale.js')),
  },
  {
    name: 'Observaciones.jsx imports TranslatedTextArea',
    ok: () => read('src/components/ReportePol/Observaciones.jsx').includes('TranslatedTextArea'),
  },
  {
    name: 'CuadroEquipos uses useTranslation',
    ok: () => read('src/components/SubcomponenteFRiesgo/CuadroEquipos.jsx').includes('useTranslation'),
  },
];

let failed = 0;
for (const check of checks) {
  const pass = check.ok();
  console.log(`${pass ? 'OK' : 'FAIL'}: ${check.name}`);
  if (!pass) failed += 1;
}

if (failed) {
  console.log(`RESULT: FAIL (${failed})`);
  process.exit(1);
}

console.log('RESULT: OK');
