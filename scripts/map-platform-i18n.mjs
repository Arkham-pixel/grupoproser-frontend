/**
 * Auditoría completa i18n de la plataforma frontend.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const COMPONENTS = path.join(SRC, 'components');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['copia', 'node_modules', '.git'].includes(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(jsx|tsx)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function flatten(obj, prefix = '', out = {}) {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    out[prefix] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else out[p] = v;
  }
  return out;
}

function topFolder(rel) {
  const parts = rel.split('/');
  if (parts[0] !== 'components') return 'other';
  if (parts.length === 2) return '_root';
  return parts[1];
}

function extractTKeys(code) {
  const keys = new Set();
  const re = /\bt\(\s*['`]([^'`]+)['`]/g;
  let m;
  while ((m = re.exec(code))) {
    if (!m[1].includes('${')) keys.add(m[1]);
  }
  return keys;
}

function countSpanishUiHints(code) {
  const phrases = [
    'Guardar',
    'Exportar',
    'Cargando',
    'Seleccionar',
    'Agregar',
    'Eliminar',
    'Buscar',
    'Cancelar',
    'Confirmar',
    'Ningún',
    'Aceptar',
    'Observaciones',
    'Descripción',
    'Fecha',
    'Estado',
    'Nombre',
    'Dirección',
    'Teléfono',
    'Correo',
    'Contraseña',
    'Historial',
    'Informe',
    'Inspección',
    'Formulario',
    'Cliente',
    'Empresa',
    'Aseguradora',
    'Recomendación',
    'Arrastra y suelta',
    'No hay',
    'Error al',
    'Éxito',
  ];
  let hits = 0;
  const found = [];
  // Prefer JSX text / string literals that look like UI (not comments only)
  for (const p of phrases) {
    // rough: appears in quotes or as JSX text
    const re = new RegExp(`(>\\s*[^<{]*${p}|['"\`][^'"\`]{0,40}${p})`, 'i');
    if (re.test(code) && !code.includes(`t('`) && !code.includes('useTranslation')) {
      // file without i18n at all counted separately
    }
    if (code.includes(p)) {
      // skip if only in comments? hard — count occurrence in non-comment lines
      const lines = code.split(/\r?\n/);
      let c = 0;
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
        if (t.includes(p)) c++;
      }
      if (c > 0) {
        hits += c;
        found.push(`${p}×${c}`);
      }
    }
  }
  return { hits, found: found.slice(0, 8) };
}

const all = walk(COMPONENTS);
const byFolder = new Map();

for (const abs of all) {
  const rel = path.relative(SRC, abs).split(path.sep).join('/');
  const folder = topFolder(rel);
  if (!byFolder.has(folder)) {
    byFolder.set(folder, { files: [], withI18n: 0, withoutI18n: 0, tKeys: new Set(), spanishHits: 0, samples: [] });
  }
  const bucket = byFolder.get(folder);
  bucket.files.push(rel);
  const code = fs.readFileSync(abs, 'utf8');
  const hasI18n = /useTranslation/.test(code) || /\bt\(\s*['`]/.test(code);
  if (hasI18n) bucket.withI18n++;
  else bucket.withoutI18n++;
  for (const k of extractTKeys(code)) bucket.tKeys.add(k);
  const { hits, found } = countSpanishUiHints(code);
  if (!hasI18n && hits > 0) {
    bucket.spanishHits += hits;
    bucket.samples.push({ file: rel.split('/').pop(), hits, found });
  } else if (hasI18n && hits > 15) {
    // possibly residual even with i18n
    bucket.samples.push({ file: rel.split('/').pop(), hits, found, note: 'con-i18n-pero-mucho-ES' });
  }
}

const es = JSON.parse(fs.readFileSync(path.join(SRC, 'locales/es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(SRC, 'locales/en.json'), 'utf8'));
const flatEs = flatten(es);
const flatEn = flatten(en);

const topNamespaces = {};
for (const k of Object.keys(flatEs)) {
  const ns = k.split('.')[0];
  topNamespaces[ns] = (topNamespaces[ns] || 0) + 1;
}
const topNamespacesEn = {};
for (const k of Object.keys(flatEn)) {
  const ns = k.split('.')[0];
  topNamespacesEn[ns] = (topNamespacesEn[ns] || 0) + 1;
}

const nsParity = {};
for (const ns of new Set([...Object.keys(topNamespaces), ...Object.keys(topNamespacesEn)])) {
  const a = Object.keys(flatEs).filter((k) => k === ns || k.startsWith(ns + '.'));
  const b = Object.keys(flatEn).filter((k) => k === ns || k.startsWith(ns + '.'));
  const onlyEs = a.filter((k) => !b.includes(k));
  const onlyEn = b.filter((k) => !a.includes(k));
  nsParity[ns] = { es: a.length, en: b.length, onlyEs: onlyEs.length, onlyEn: onlyEn.length };
}

// Classify folders
function classify(folder, data) {
  const total = data.files.length;
  const pct = total ? Math.round((data.withI18n / total) * 100) : 0;
  if (pct >= 85 && data.spanishHits < 20) return 'DONE';
  if (pct >= 40) return 'PARTIAL';
  if (pct > 0) return 'STARTED';
  return 'PENDING';
}

const report = {
  totals: {
    componentFiles: all.length,
    localeLeavesEs: Object.keys(flatEs).length,
    localeLeavesEn: Object.keys(flatEn).length,
  },
  namespaces: nsParity,
  folders: {},
};

for (const [folder, data] of [...byFolder.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const status = classify(folder, data);
  report.folders[folder] = {
    status,
    files: data.files.length,
    withI18n: data.withI18n,
    withoutI18n: data.withoutI18n,
    pctI18n: data.files.length ? Math.round((data.withI18n / data.files.length) * 100) : 0,
    tKeysUsed: data.tKeys.size,
    spanishHintHitsInNoI18n: data.spanishHits,
    topSamples: data.samples.sort((a, b) => b.hits - a.hits).slice(0, 5),
  };
}

fs.writeFileSync(path.join(ROOT, 'scripts/_platform_i18n_map.json'), JSON.stringify(report, null, 2));

// Human summary
const groups = { DONE: [], PARTIAL: [], STARTED: [], PENDING: [] };
for (const [f, d] of Object.entries(report.folders)) {
  groups[d.status].push({ f, ...d });
}

console.log('=== PLATAFORMA i18n — MAPA ===\n');
console.log(`Componentes JSX/TSX: ${report.totals.componentFiles}`);
console.log(`Claves hoja es/en: ${report.totals.localeLeavesEs} / ${report.totals.localeLeavesEn}\n`);

console.log('--- Namespaces locales ---');
for (const [ns, p] of Object.entries(nsParity).sort((a, b) => b[1].es - a[1].es)) {
  const ok = p.onlyEs === 0 && p.onlyEn === 0 ? '✓' : `Δes=${p.onlyEs} Δen=${p.onlyEn}`;
  console.log(`  ${ns}: es=${p.es} en=${p.en} ${ok}`);
}

for (const status of ['DONE', 'PARTIAL', 'STARTED', 'PENDING']) {
  console.log(`\n=== ${status} (${groups[status].length} carpetas) ===`);
  for (const g of groups[status].sort((a, b) => b.files - a.files)) {
    console.log(
      `  ${g.f}: ${g.withI18n}/${g.files} archivos con i18n (${g.pctI18n}%) | tKeys=${g.tKeysUsed} | esHints=${g.spanishHintHitsInNoI18n}`
    );
    for (const s of g.topSamples.slice(0, 3)) {
      console.log(`     · ${s.file} hits=${s.hits}${s.note ? ' [' + s.note + ']' : ''}`);
    }
  }
}
