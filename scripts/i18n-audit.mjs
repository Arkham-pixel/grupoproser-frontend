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
    /['"`][^'"`]*(Cliente|Inspector|Guardar|Cancelar|Buscar|Filtros|Reporte|Asegurado|Siniestro|Observaciones|Selecciona|Pendiente|Administraci[oó]n|Formulario|Agregar|Eliminar|Exportar|Iniciar|Datos Generales|Limpiar|Bandeja|Protocolo|Responsable|Arrastra|No hay|días hábiles)[^'"`]*['"`]/;
  return re.test(src);
}

function moduleOf(f) {
  const rel = f.replace(/\\/g, '/').split('/components/')[1] || f;
  if (
    rel.startsWith('SubcomponenteCompex') ||
    /Complex|Bandeja|Indicadores|MisAlertas|ReporteCasos|ManualUtilizacion|TestEmailComplex/.test(rel)
  )
    return 'Complex';
  if (
    rel.startsWith('SubcomponentesRiesgo') ||
    rel.startsWith('SubcomponenteRiesgo') ||
    rel.startsWith('SubcompoeneteRiesgo') ||
    /FormularioInspeccion\.jsx|MatrizRiesgo|ListaMatrices|RegistroFotografico/.test(rel)
  )
    return 'Riesgos';
  if (rel.startsWith('SubcomponenteExpress')) return 'Express';
  if (rel.startsWith('SubcomponenteEquidadFdm')) return 'Equidad FDM';
  if (rel.startsWith('SubcomponentePropiedades') || /FormularioInspeccionPropiedades/.test(rel))
    return 'Propiedades';
  if (rel.startsWith('FormularioPuertos') || rel.startsWith('Puertos') || /Puertos/.test(rel))
    return 'Puertos';
  if (
    rel.startsWith('SubcomponenteFormularioAjuste') ||
    /FormularioAjuste|ActaInspeccion|LiquidadorAjuste|Chatbot|SeccionFirmas/.test(rel)
  )
    return 'Ajuste / Acta';
  if (
    /Layout|login|Logout|PaginaError|AdminUsuarios|EditarPerfil|InformacionCompleta|Inicio\.jsx|HelpCenter|Session|Aviso2FA|LanguageSelector|DocumentLanguageSelector|TranslatedTextArea/.test(
      rel
    )
  )
    return 'Shell / Auth / Admin';
  return 'Otros';
}

const files = walk(root);
const byModule = {};

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const m = moduleOf(f);
  byModule[m] ||= { total: 0, withI18n: 0, stillSpanish: 0, noI18n: 0 };
  byModule[m].total++;
  if (hasI18n(src)) byModule[m].withI18n++;
  else byModule[m].noI18n++;
  if (hasSpanishUI(src)) byModule[m].stillSpanish++;
}

const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8'));
function flat(o, p = '') {
  return Object.entries(o || {}).flatMap(([k, v]) =>
    typeof v === 'object' && v && !Array.isArray(v) ? flat(v, p + k + '.') : [[p + k, String(v)]]
  );
}
const enF = Object.fromEntries(flat(en));
const esF = Object.fromEntries(flat(es));
let same = 0;
let totalKeys = 0;
for (const k of Object.keys(enF)) {
  if (!(k in esF)) continue;
  totalKeys++;
  const a = enF[k];
  const b = esF[k];
  if (
    a === b &&
    /[áéíóúñÁÉÍÓÚÑ]|(^|\s)(de|del|la|el|los|las|para|con|por|una|uno|este|esta|selecciona|guardar|buscar|filtro)/i.test(
      a
    )
  ) {
    same++;
  }
}

const rows = [];
let tot = 0;
let wi = 0;
let ss = 0;
for (const [m, v] of Object.entries(byModule).sort()) {
  tot += v.total;
  wi += v.withI18n;
  ss += v.stillSpanish;
  const wiredPct = Math.round((100 * v.withI18n) / v.total);
  const doneFiles = Math.max(0, v.withI18n - Math.min(v.withI18n, v.stillSpanish));
  const estPct = Math.round((100 * doneFiles) / v.total);
  rows.push({ module: m, ...v, wiredPct, estPct });
}

console.log(
  JSON.stringify(
    {
      rows,
      tot,
      wi,
      ss,
      totalKeys,
      enStillSpanishLikely: same,
      enTranslatedPct: Math.round((100 * (totalKeys - same)) / totalKeys),
    },
    null,
    2
  )
);
