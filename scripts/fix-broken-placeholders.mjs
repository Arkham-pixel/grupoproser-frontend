import fs from 'fs';

const path = 'src/components/FormularioInspeccion.jsx';
let s = fs.readFileSync(path, 'utf8');

// Map leftover Spanish fragments (after malformed placeholder={t(...)}) → full i18n key
const fixes = [
  [
    /placeholder=\{t\('inspection\.ui\.formulario_inspeccion\.description'\)\}\s*de Procesos/g,
    "placeholder={t('inspection.ui.formulario_inspeccion.processDescription')}",
  ],
  [
    /placeholder=\{t\('inspection\.ui\.formulario_inspeccion\.description'\)\}\s*de los contenidos/g,
    "placeholder={t('inspection.ui.formulario_inspeccion.contentsDescription')}",
  ],
  [
    /placeholder=\{t\('inspection\.ui\.formulario_inspeccion\.description'\)\}\s*del Equipamiento/g,
    "placeholder={t('inspection.ui.formulario_inspeccion.equipmentDescription')}",
  ],
  [
    /placeholder=\{t\('inspection\.ui\.formulario_inspeccion\.number'\)\}\s*de cámaras que posee/g,
    "placeholder={t('inspection.ui.formulario_inspeccion.numberOfCameras')}",
  ],
  [
    /placeholder=\{t\('inspection\.ui\.formulario_inspeccion\.number'\)\}\s*de vigilantes/g,
    "placeholder={t('inspection.ui.formulario_inspeccion.numberOfGuards')}",
  ],
  [
    /placeholder=\{t\('inspection\.ui\.formulario_inspeccion\.number'\)\}\s*de líneas de producción/g,
    "placeholder={t('inspection.ui.formulario_inspeccion.numberOfProductionLines')}",
  ],
  [
    /placeholder=\{t\('inspection\.ui\.formulario_inspeccion\.capacity'\)\}\s*instalada de la planta de producción/g,
    "placeholder={t('inspection.ui.formulario_inspeccion.installedProductionCapacity')}",
  ],
  [
    /placeholder=\{t\('inspection\.ui\.formulario_inspeccion\.comments'\)\}\s*adicionales sobre protección contra incendios/g,
    "placeholder={t('inspection.ui.formulario_inspeccion.additionalFireProtectionComments')}",
  ],
];

const counts = [];
for (const [re, repl] of fixes) {
  const before = s;
  s = s.replace(re, repl);
  const n = (before.match(re) || []).length;
  // recount differently
  let c = 0;
  before.replace(re, () => {
    c += 1;
    return '';
  });
  counts.push({ repl, c });
}

// Catch any remaining: placeholder={t('...')} <spanish junk before next attr/tag>
const leftover = [];
const reLeft = /placeholder=\{t\('([^']+)'\)\}([^\n<{]+)/g;
let m;
while ((m = reLeft.exec(s))) {
  const rest = m[2].trim();
  if (rest && !/^(disabled|value|onChange|className|style|rows|cols|type|name|id|checked|readOnly|required)=/.test(rest)) {
    leftover.push({ key: m[1], rest: rest.slice(0, 80), at: m.index });
  }
}

fs.writeFileSync(path, s);
console.log(JSON.stringify({ counts, leftoverCount: leftover.length, leftover: leftover.slice(0, 30) }, null, 2));
