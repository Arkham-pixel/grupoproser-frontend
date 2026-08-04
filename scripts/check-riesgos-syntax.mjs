import fs from 'fs';

const files = [
  'src/components/SubcomponentesRiesgo/AgregarCasoRiesgo.jsx',
  'src/components/SubcomponentesRiesgo/ActivacionRiesgo.jsx',
  'src/components/SubcomponentesRiesgo/TrazabilidadRiesgo.jsx',
  'src/components/SubcomponentesRiesgo/FacturacionRiesgo.jsx',
  'src/components/SubcomponentesRiesgo/SeguimientoRiesgo.jsx',
  'src/components/SubcomponentesRiesgo/RiesgoUiBlocks.jsx',
  'src/components/SubcomponentesRiesgo/ListaCasosRiesgo.jsx',
  'src/components/SubcomponentesRiesgo/AccionesRiesgoMenu.jsx',
  'src/components/SubcomponentesRiesgo/DatosPrecargados.jsx',
  'src/components/SubcomponenteRiesgoDash/Dashboard.jsx',
  'src/components/FormularioInspeccion.jsx',
  'src/components/ListaMatricesRiesgo.jsx',
  'src/components/MatrizRiesgoAvanzada/MatrizRiesgoAvanzada.jsx',
  'src/components/MatrizRiesgoAvanzada/MatrizUiBlocks.jsx',
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log(f + ': MISSING');
    continue;
  }
  const s = fs.readFileSync(f, 'utf8');
  const issues = [];
  const open = (s.match(/\{/g) || []).length;
  const close = (s.match(/\}/g) || []).length;
  if (Math.abs(open - close) > 8) issues.push('braceDiff=' + (open - close));
  const openP = (s.match(/\(/g) || []).length;
  const closeP = (s.match(/\)/g) || []).length;
  if (Math.abs(openP - closeP) > 8) issues.push('parenDiff=' + (openP - closeP));
  // broken i18n: t( without closing
  if (/\bt\(\s*['"][^'"]*$/m.test(s)) issues.push('unclosed t(');
  // title=Word without quote
  const unquoted = s.match(/\s(label|title|placeholder)=[A-Za-z][^\s={'"`>]*/g);
  if (unquoted) issues.push('unquoted: ' + unquoted.slice(0, 3).join(','));
  console.log(f.split('/').pop() + ': ' + (issues.length ? issues.join('; ') : 'ok'));
}

const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8'));
console.log('risks.followUp', en.risks?.followUp, es.risks?.followUp);
console.log('risks.billing', en.risks?.billing, es.risks?.billing);
console.log('risks.traceability', en.risks?.traceability, es.risks?.traceability);
