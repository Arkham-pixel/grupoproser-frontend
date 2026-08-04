/**
 * Verifica módulos i18n marcados como listos.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'copia' || ent.name === 'node_modules') continue;
      walk(p, acc);
    } else if (/\.(jsx?|tsx?)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function rel(abs) {
  return path.relative(SRC, abs).split(path.sep).join('/');
}

function match(relPath, preds) {
  return preds.some((p) =>
    typeof p === 'string' ? relPath === p || relPath.startsWith(p) : p.test(relPath)
  );
}

const MODULES = {
  login: {
    include: ['components/login.tsx'],
    ns: ['common'],
  },
  layout: {
    include: ['components/Layout.jsx'],
    ns: ['nav', 'common'],
  },
  complex: {
    include: [
      'components/SubcomponenteCompex/',
      'components/DashboardComplex.jsx',
      'components/InformeIndicadores2025Complex.jsx',
      'components/IndicadoresProtocoloComplex.jsx',
      'components/IndicadoresHistoricosComplex.jsx',
      'components/IndicadoresAlertasComplex.jsx',
      'components/AlertasComplex.jsx',
      'components/ReporteCasosPersona.jsx',
      'components/ReporteCasosMejorado.jsx',
    ],
    ns: ['complex'],
  },
  riesgos: {
    include: [
      'components/SubcomponentesRiesgo/',
      'components/SubcomponenteRiesgoDash/',
      'components/SubcompoeneteRiesgoExport/',
      'components/ListaMatricesRiesgo.jsx',
    ],
    ns: ['risks'],
  },
  matriz: {
    include: ['components/MatrizRiesgoAvanzada/'],
    ns: ['riskMatrix'],
  },
  express: {
    include: ['components/SubcomponenteExpress/'],
    ns: ['express'],
  },
  sgsst: {
    include: ['components/SubcomponenteSGSST/'],
    ns: ['sgsst'],
  },
  inspeccion: {
    include: [
      'components/FormularioInspeccion.jsx',
      'components/RegistroFotografico.jsx',
      'components/BotonesHistorial.jsx',
      'components/MapaGoogleEarth.jsx',
      'components/SubcomponenteFRiesgo/',
      'components/inspeccion/',
      'data/bancoRecomendacionesI18n.js',
    ],
    ns: ['inspection'],
  },
  propiedades: {
    include: [
      'components/FormularioInspeccionPropiedades.jsx',
      'components/propiedadesUi.jsx',
      'components/inspeccion/seccionesInformePropiedades.js',
      'components/inspeccion/propiedadesAreasConfig.js',
    ],
    ns: ['inspection'],
  },
  admin_parcial: {
    include: [
      'components/AdminUsuarios.jsx',
      'components/EditarPerfilUsuario.jsx',
      'components/SessionSettings.jsx',
      'components/GestionDocumentos/',
      'components/SubcomponenteCuenta/Cuenta.jsx',
    ],
    ns: ['admin', 'account'],
  },
};

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

function hasKey(flat, key) {
  if (Object.prototype.hasOwnProperty.call(flat, key)) return true;
  if (Object.keys(flat).some((k) => k.startsWith(key + '.'))) return true;
  // i18next plurals: key_one / key_other / key_zero
  if (
    Object.prototype.hasOwnProperty.call(flat, `${key}_one`) ||
    Object.prototype.hasOwnProperty.call(flat, `${key}_other`) ||
    Object.prototype.hasOwnProperty.call(flat, `${key}_zero`)
  ) {
    return true;
  }
  return false;
}

function extractTKeys(code) {
  const keys = new Set();
  const re = /\bt\(\s*['`]([^'`]+)['`]/g;
  let m;
  while ((m = re.exec(code))) {
    if (!m[1].includes('${')) keys.add(m[1]);
  }
  const re2 = /\btp\(\s*['`]([^'`]+)['`]/g;
  while ((m = re2.exec(code))) {
    if (!m[1].includes('${')) keys.add(`inspection.ui.formulario_propiedades.${m[1]}`);
  }
  return keys;
}

function scanResiduals(code) {
  const hits = new Map();
  // only look for clear Spanish UI phrases (avoid false positives from code)
  const phrases = [
    'Cargando casos',
    'Cargando Google Maps',
    'Filtra por fechas',
    'Campo de fecha',
    'Eliminar cuenta aquí',
    'Guardar en Historial',
    'Exportar ',
    'Seleccionar archivo',
    'Ningún archivo',
    'Arrastra y suelta',
    'Agregar Área',
    'Inventario de Equipos',
    'Buscar dirección',
    'Tiene alarma',
    'Vigilancia',
    'Tienen armas',
    'Tienen radio',
    'Cordialmente',
    'Apreciados Señores',
    'ASEGURADO:',
    'PREDIO INSPECCIONADO',
  ];
  for (const p of phrases) {
    if (code.includes(p)) hits.set(p, (hits.get(p) || 0) + 1);
  }

  // JSX text with accents (simple)
  const re = />\s*([A-Za-zÁÉÍÓÚáéíóúñÑ¿¡][^<{]{2,60})\s*</g;
  let m;
  while ((m = re.exec(code))) {
    const t = m[1].trim();
    if (/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t) && !/SEGUROS|BOLÍVAR|ZÚRICH|ITAÚ/.test(t)) {
      hits.set(t, (hits.get(t) || 0) + 1);
    }
  }
  return hits;
}

const allFiles = walk(path.join(SRC, 'components')).concat(walk(path.join(SRC, 'data')));
const es = JSON.parse(fs.readFileSync(path.join(SRC, 'locales/es.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(SRC, 'locales/en.json'), 'utf8'));
const flatEs = flatten(es);
const flatEn = flatten(en);

const report = {};

for (const [name, mod] of Object.entries(MODULES)) {
  const files = allFiles.filter((f) => match(rel(f), mod.include));
  const keys = new Set();
  const residual = new Map();
  let filesWithT = 0;
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    const k = extractTKeys(code);
    if (k.size) filesWithT++;
    for (const x of k) keys.add(x);
    for (const [t, c] of scanResiduals(code)) residual.set(t, (residual.get(t) || 0) + c);
  }

  const missingEs = [...keys].filter((k) => !hasKey(flatEs, k)).sort();
  const missingEn = [...keys].filter((k) => !hasKey(flatEn, k)).sort();

  const nsParity = {};
  for (const ns of mod.ns) {
    const esKeys = Object.keys(flatEs).filter((k) => k === ns || k.startsWith(ns + '.'));
    const enKeys = Object.keys(flatEn).filter((k) => k === ns || k.startsWith(ns + '.'));
    const onlyEs = esKeys.filter((k) => !enKeys.includes(k));
    const onlyEn = enKeys.filter((k) => !esKeys.includes(k));
    nsParity[ns] = {
      es: esKeys.length,
      en: enKeys.length,
      onlyEs: onlyEs.length,
      onlyEn: onlyEn.length,
      onlyEsSample: onlyEs.slice(0, 5),
      onlyEnSample: onlyEn.slice(0, 5),
    };
  }

  let verdict = 'OK';
  if (missingEs.length || missingEn.length) verdict = 'CLAVES_FALTANTES';
  else if (residual.size) verdict = 'RESIDUAL_MENOR';
  else {
    const badParity = Object.values(nsParity).some((p) => p.onlyEs || p.onlyEn);
    if (badParity) verdict = 'PARIDAD_NS';
  }

  report[name] = {
    verdict,
    files: files.length,
    filesWithT,
    tKeys: keys.size,
    missingEsCount: missingEs.length,
    missingEnCount: missingEn.length,
    missingEs: missingEs.slice(0, 20),
    missingEn: missingEn.slice(0, 20),
    residual: [...residual.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([t, c]) => ({ text: t, count: c })),
    nsParity,
  };
}

fs.writeFileSync(
  path.join(ROOT, 'scripts/_i18n_verify_report.json'),
  JSON.stringify(report, null, 2)
);

console.log('MAPA DE VERIFICACIÓN — módulos listos\n');
for (const [name, r] of Object.entries(report)) {
  const icon = r.verdict === 'OK' ? '✅' : r.verdict === 'RESIDUAL_MENOR' ? '⚠️' : '❌';
  console.log(
    `${icon} ${name.toUpperCase()} → ${r.verdict} | archivos=${r.files} (con t=${r.filesWithT}) claves=${r.tKeys} missES=${r.missingEsCount} missEN=${r.missingEnCount} residual=${r.residual.length}`
  );
  if (r.missingEn.length) console.log('   missEN:', r.missingEn.join(' | '));
  if (r.missingEs.length) console.log('   missES:', r.missingEs.join(' | '));
  if (r.residual.length)
    console.log(
      '   residual:',
      r.residual
        .slice(0, 6)
        .map((x) => `${x.count}×"${x.text}"`)
        .join(', ')
    );
  for (const [ns, p] of Object.entries(r.nsParity)) {
    const ok = p.onlyEs === 0 && p.onlyEn === 0;
    console.log(
      `   ns ${ns}: es=${p.es} en=${p.en}${ok ? ' ✓' : ` Δes=${p.onlyEs} Δen=${p.onlyEn}`}`
    );
  }
  console.log('');
}
