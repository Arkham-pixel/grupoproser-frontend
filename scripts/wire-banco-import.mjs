import fs from 'fs';

const path = 'src/components/FormularioInspeccion.jsx';
let s = fs.readFileSync(path, 'utf8');

const importLine = `import {
  BANCO_RECOMENDACIONES_ES,
  translateCategoryLabel,
  translateRecommendationText,
  displayRecommendationPreview,
} from '../data/bancoRecomendacionesI18n.js';
`;

if (!s.includes('bancoRecomendacionesI18n')) {
  s = s.replace(
    "import BotonesHistorial from './BotonesHistorial.jsx';",
    `${importLine}import BotonesHistorial from './BotonesHistorial.jsx';`
  );
}

s = s.replace('const { t } = useTranslation();', 'const { t, i18n } = useTranslation();');

const needle = 'return stored ? JSON.parse(stored) : ';
const bankStateIdx = s.indexOf('const [bancoRecomendaciones, setBancoRecomendaciones]');
const nIdx = s.indexOf(needle, bankStateIdx);
if (nIdx < 0) {
  console.error('needle not found');
  process.exit(1);
}
const brace = s.indexOf('{', nIdx + needle.length);
let depth = 0;
let end = -1;
for (let i = brace; i < s.length; i++) {
  if (s[i] === '{') depth++;
  else if (s[i] === '}') {
    depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}
if (end < 0) {
  console.error('end brace not found');
  process.exit(1);
}

const replacement =
  'return stored ? JSON.parse(stored) : structuredClone(BANCO_RECOMENDACIONES_ES)';
const out = s.slice(0, nIdx) + replacement + s.slice(end + 1);
fs.writeFileSync(path, out);
console.log('ok', { nIdx, brace, end, delta: out.length - s.length });
