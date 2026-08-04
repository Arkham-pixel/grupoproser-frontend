import fs from 'fs';
import path from 'path';

const root = path.resolve('src/components');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

function hasI18n(src) {
  return /useTranslation|from ['"].*i18n['"]|i18n\.t/.test(src);
}

function hasSpanishUI(src) {
  const re =
    /['"`][^'"`]*(Cliente|Inspector|Guardar|Cancelar|Buscar|Filtros|Reporte|Asegurado|Siniestro|Observaciones|Selecciona|Pendiente|Administraci[oó]n|Formulario|Agregar|Eliminar|Exportar|Iniciar|Datos Generales|Limpiar|Bandeja|Protocolo|Responsable|Arrastra|No hay|días hábiles|Cargando|Error|Sesión|Confirmar)[^'"`]*['"`]/;
  return re.test(src);
}

const files = walk(root);
const noI18n = [];
const residual = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = f.replace(/\\/g, '/').split('/components/')[1];
  const i18n = hasI18n(src);
  const es = hasSpanishUI(src);
  if (!i18n && es) noI18n.push(rel);
  else if (i18n && es) residual.push(rel);
}

console.log('TOTAL JSX', files.length);
console.log('NO i18n + ES UI:', noI18n.length);
noI18n.slice(0, 60).forEach((x) => console.log('  -', x));
if (noI18n.length > 60) console.log('  ...', noI18n.length - 60, 'more');
console.log('WITH i18n but residual ES hints:', residual.length);
residual.slice(0, 40).forEach((x) => console.log('  ~', x));
