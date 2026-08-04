const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const esPath = path.join(root, 'src/locales/es.json');
const enPath = path.join(root, 'src/locales/en.json');
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

Object.assign(es.complex.ui.protocolo_tiempos_complex, { guardando: 'Guardando…' });
Object.assign(en.complex.ui.protocolo_tiempos_complex, { guardando: 'Saving…' });
Object.assign(es.complex.ui.gestion_estados_complex, { guardando: 'Guardando...' });
Object.assign(en.complex.ui.gestion_estados_complex, { guardando: 'Saving...' });
Object.assign(es.complex.ui.informe_indicadores2025complex, { generando: 'Generando…' });
Object.assign(en.complex.ui.informe_indicadores2025complex, { generando: 'Generating…' });
Object.assign(es.complex.ui.reporte_casos_mejorado, {
  sin_asignar: 'Sin asignar',
  sin_estado: 'Sin estado',
  primera_pagina: 'Primera página',
  pagina_anterior: 'Página anterior',
  pagina_siguiente: 'Página siguiente',
  ultima_pagina: 'Última página',
  caso_eliminado_ok: 'Caso eliminado exitosamente',
  error_eliminar_caso: 'Error al eliminar el caso: {{mensaje}}',
});
Object.assign(en.complex.ui.reporte_casos_mejorado, {
  sin_asignar: 'Unassigned',
  sin_estado: 'No status',
  primera_pagina: 'First page',
  pagina_anterior: 'Previous page',
  pagina_siguiente: 'Next page',
  ultima_pagina: 'Last page',
  caso_eliminado_ok: 'Case deleted successfully',
  error_eliminar_caso: 'Error deleting the case: {{mensaje}}',
});

fs.writeFileSync(esPath, JSON.stringify(es, null, 2) + '\n');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
console.log('locales ok');

let s = fs.readFileSync(path.join(root, 'src/components/ReporteCasosPersona.jsx'), 'utf8');

if (!s.includes('react-i18next')) {
  s = s.replace(
    "import React, { useEffect, useState, useRef } from 'react';",
    "import React, { useEffect, useState, useRef, useMemo } from 'react';\nimport { useTranslation } from 'react-i18next';"
  );
}
if (!s.includes('const UI_RCP')) {
  s = s.replace(
    "import { useTheme } from '../context/ThemeContext';",
    "import { useTheme } from '../context/ThemeContext';\n\nconst UI_RCP = 'complex.ui.reporte_casos_mejorado';"
  );
}

s = s.replace(/\{ clave: '([^']+)', label: '[^']*' \}/g, "{ clave: '$1' }");

if (!s.includes('const { t } = useTranslation()')) {
  s = s.replace(
    'export default function ReporteCasosPersona() {',
    `export default function ReporteCasosPersona() {
  const { t } = useTranslation();
  const camposFechaConLabel = useMemo(
    () => camposFechaDisponibles.map(({ clave }) => ({ clave, label: t(\`\${UI_RCP}.campos_fecha.\${clave}\`) })),
    [t]
  );
  const todosLosCamposConLabel = useMemo(
    () => todosLosCampos.map(({ clave }) => ({ clave, label: t(\`\${UI_RCP}.campos.\${clave}\`) })),
    [t]
  );`
  );
}

const reps = [
  ["'Sin asignar'", 't(`${UI_RCP}.sin_asignar`)'],
  ["'sin asignar'", 't(`${UI_RCP}.sin_asignar`).toLowerCase()'],
  ["'Sin estado'", 't(`${UI_RCP}.sin_estado`)'],
  [
    "alert('No se encontró el identificador del caso para editarlo.');",
    'alert(t(`${UI_RCP}.no_se_encontro_identificador`));',
  ],
  [
    "alert('No tienes permisos para eliminar casos');",
    'alert(t(`${UI_RCP}.sin_permiso_eliminar`));',
  ],
  ["alert('Caso eliminado exitosamente');", 'alert(t(`${UI_RCP}.caso_eliminado_ok`));'],
  [
    "alert('Este caso no se puede eliminar desde aquí. Solo se pueden eliminar casos Complex.');",
    'alert(t(`${UI_RCP}.no_se_puede_eliminar`));',
  ],
  [
    'alert(`Error al eliminar el caso: ${error.message}`);',
    'alert(t(`${UI_RCP}.error_eliminar_caso`, { mensaje: error.message }));',
  ],
  [
    'placeholder="Número de ajuste, siniestro, asegurado, ciudad…"',
    'placeholder={t(`${UI_RCP}.placeholder_buscar`)}',
  ],
  ['title="Primera página"', 'title={t(`${UI_RCP}.primera_pagina`)}'],
  ['title="Página anterior"', 'title={t(`${UI_RCP}.pagina_anterior`)}'],
  ['title="Página siguiente"', 'title={t(`${UI_RCP}.pagina_siguiente`)}'],
  ['title="Última página"', 'title={t(`${UI_RCP}.ultima_pagina`)}'],
];

for (const [a, b] of reps) {
  if (!s.includes(a)) console.warn('miss', a.slice(0, 70));
  else s = s.split(a).join(b);
}

// confirm delete - flexible
s = s.replace(
  /window\.confirm\(\s*`¿Estás seguro de que deseas eliminar el caso \$\{numeroAjuste\}\?\\n\\nEsta acción no se puede deshacer\.`\s*\)/,
  'window.confirm(t(`${UI_RCP}.confirmar_eliminar`, { numero: numeroAjuste }))'
);

s = s.replace(/camposFechaDisponibles\.map/g, 'camposFechaConLabel.map');
s = s.replace(/todosLosCampos\.map\(\(\{\s*clave,\s*label\s*\}\)/g, 'todosLosCamposConLabel.map(({ clave, label })');

fs.writeFileSync(path.join(root, 'src/components/ReporteCasosPersona.jsx'), s);
console.log('ReporteCasosPersona patched');
