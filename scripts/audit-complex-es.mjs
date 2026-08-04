import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx|tsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const roots = [
  'src/components/SubcomponenteCompex',
  'src/components/DashboardComplex.jsx',
  'src/components/IndicadoresProtocoloComplex.jsx',
  'src/components/IndicadoresHistoricosComplex.jsx',
  'src/components/IndicadoresAlertasComplex.jsx',
  'src/components/InformeIndicadores2025Complex.jsx',
  'src/components/ReporteCasosMejorado.jsx',
  'src/components/ReporteCasosPersona.jsx',
  'src/components/MisAlertasComplex.jsx',
  'src/components/AlertasComplex.jsx',
];

const files = [];
for (const r of roots) {
  const full = path.resolve(r);
  if (!fs.existsSync(full)) continue;
  if (fs.statSync(full).isDirectory()) walk(full, files);
  else files.push(full);
}

const words =
  /(Guardar|Cancelar|Buscar|Selecciona|Arrastra|No hay|Adjunte|Resumen de|días hábiles|Control de Horas|Enviando\.\.\.|Limpiar filtros)/;
const hits = [];

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\n/);
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return;
    if (/console\.|import /.test(line)) return;
    if (!words.test(line)) return;
    if (/\bt\(|i18n\.t|defaultValue/.test(line)) return;
    hits.push(`${f.replace(/\\/g, '/')}:${i + 1}: ${line.trim().slice(0, 160)}`);
  });
}

console.log(JSON.stringify({ files: files.length, hits: hits.length, sample: hits.slice(0, 20) }, null, 2));
