/**
 * Remanentes pequeños + ReporteCasosPersona.
 * node scripts/patch-complex-batch-c.cjs
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function patch(rel, fn) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, 'utf8');
  const out = fn(s);
  fs.writeFileSync(p, out);
  console.log('ok', rel);
}

// small remnants
patch('src/components/SubcomponenteCompex/AsignarSubtareaModal.jsx', (s) =>
  s.replace(/\? 'Guardar cambios'/, "? t('complex.ui.asignar_subtarea_modal.guardar_cambios')")
);

patch('src/components/SubcomponenteCompex/ProtocoloTiemposComplex.jsx', (s) =>
  s.replace(
    /guardando \? 'Guardando…' : 'Guardar cambios'/,
    "guardando ? t('complex.ui.protocolo_tiempos_complex.guardando') : t('complex.ui.protocolo_tiempos_complex.guardar_cambios')"
  )
);

patch('src/components/SubcomponenteCompex/GestionEstadosComplex.jsx', (s) =>
  s.replace(
    /guardando \? 'Guardando\.\.\.' : 'Guardar Estado'/,
    "guardando ? t('complex.ui.gestion_estados_complex.guardando') : t('complex.ui.gestion_estados_complex.guardar_estado')"
  )
);

for (const rel of [
  'src/components/SubcomponenteCompex/SeguimientoAutorizacionCompania.jsx',
  'src/components/SubcomponenteCompex/SeguimientoDocumentosPago.jsx',
  'src/components/SubcomponenteCompex/SeguimientoDocumentosPendientes.jsx',
]) {
  const ns = path.basename(rel, '.jsx').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  // map names
  const map = {
    SeguimientoAutorizacionCompania: 'seguimiento_autorizacion_compania',
    SeguimientoDocumentosPago: 'seguimiento_documentos_pago',
    SeguimientoDocumentosPendientes: 'seguimiento_documentos_pendientes',
  };
  const key = map[path.basename(rel, '.jsx')];
  patch(rel, (s) =>
    s.replace(
      /errorResp\.error \|\| errorResp\.message \|\| `Error subiendo archivo \(\$\{response\.status\}\)`/g,
      `errorResp.error || errorResp.message || t('complex.ui.${key}.error_subiendo_archivo', { status: response.status })`
    )
  );
}

patch('src/components/InformeIndicadores2025Complex.jsx', (s) => {
  s = s.replace(
    /exportando \? 'Generando…' : 'Descargar informe Excel'/,
    "exportando ? t('complex.ui.informe_indicadores2025complex.generando') : t('complex.ui.informe_indicadores2025complex.descargar_informe_excel')"
  );
  s = s.replace(
    /subtitle=\{`Cierre total \$\{graf\.porcentajeCierreTotal \?\? cons\.porcentajeCierreTotal \?\? 0\}% · Éxito \(facturado\) \$\{graf\.porcentajeCierreExitoso \?\? cons\.porcentajeCierreExitoso \?\? 0\}%`\}/,
    `subtitle={t('complex.ui.informe_indicadores2025complex.cierre_total_exito', { pctCierre: graf.porcentajeCierreTotal ?? cons.porcentajeCierreTotal ?? 0, pctExito: graf.porcentajeCierreExitoso ?? cons.porcentajeCierreExitoso ?? 0 })}`
  );
  return s;
});

// locales extras
{
  const es = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/es.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));
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
  fs.writeFileSync(path.join(root, 'src/locales/es.json'), JSON.stringify(es, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'src/locales/en.json'), JSON.stringify(en, null, 2) + '\n');
}

// ---- ReporteCasosPersona ----
patch('src/components/ReporteCasosPersona.jsx', (s) => {
  if (!s.includes("from 'react-i18next'") && !s.includes('from "react-i18next"')) {
    s = s.replace(
      /import React, \{([^}]*)\} from 'react';/,
      `import React, {$1} from 'react';\nimport { useTranslation } from 'react-i18next';`
    );
    // if useEffect already there
    if (!s.includes('useTranslation')) {
      s = `import { useTranslation } from 'react-i18next';\n` + s;
    }
  }
  if (!s.includes('const UI_RCP')) {
    s = s.replace(
      /import \{ useTheme \} from '\.\.\/context\/ThemeContext';/,
      `import { useTheme } from '../context/ThemeContext';\n\nconst UI_RCP = 'complex.ui.reporte_casos_mejorado';`
    );
  }

  // Strip labels from campo arrays - keep only clave
  s = s.replace(/\{ clave: '([^']+)', label: '[^']*' \}/g, "{ clave: '$1' }");

  // Add useTranslation + memos after export default function
  if (!s.includes('const { t } = useTranslation()')) {
    s = s.replace(
      /export default function ReporteCasosPersona\(\) \{/,
      `export default function ReporteCasosPersona() {\n  const { t } = useTranslation();`
    );
  }

  // After state declarations for campos - need useMemo for labels.
  // Find where camposFechaDisponibles is used and inject helpers.
  if (!s.includes('camposFechaConLabel')) {
    // Insert after component start once we have hooks area - look for first useState
    s = s.replace(
      /const \{ t \} = useTranslation\(\);\n/,
      `const { t } = useTranslation();\n  const camposFechaConLabel = React.useMemo(\n    () => camposFechaDisponibles.map(({ clave }) => ({ clave, label: t(\`\${UI_RCP}.campos_fecha.\${clave}\`) })),\n    [t]\n  );\n  const todosLosCamposConLabel = React.useMemo(\n    () => todosLosCampos.map(({ clave }) => ({ clave, label: t(\`\${UI_RCP}.campos.\${clave}\`) })),\n    [t]\n  );\n`
    );
  }

  // Replace usages of todosLosCampos that need labels with todosLosCamposConLabel where .label is accessed
  // Keep todosLosCampos for clave-only ops.

  // Common Spanish replacements
  const reps = [
    ["'Sin asignar'", `t(\`\${UI_RCP}.sin_asignar\`)`],
    ["'sin asignar'", `t(\`\${UI_RCP}.sin_asignar\`).toLowerCase()`],
    ["'Sin estado'", `t(\`\${UI_RCP}.sin_estado\`)`],
    [
      "alert('No se encontró el identificador del caso para editarlo.');",
      "alert(t(`${UI_RCP}.no_se_encontro_identificador`));",
    ],
    [
      "alert('No tienes permisos para eliminar casos');",
      "alert(t(`${UI_RCP}.sin_permiso_eliminar`));",
    ],
    [
      'window.confirm(\n      `¿Estás seguro de que deseas eliminar el caso ${numeroAjuste}?\\n\\nEsta acción no se puede deshacer.`\n    )',
      'window.confirm(\n      t(`${UI_RCP}.confirmar_eliminar`, { numero: numeroAjuste })\n    )',
    ],
    ["alert('Caso eliminado exitosamente');", "alert(t(`${UI_RCP}.caso_eliminado_ok`));"],
    [
      "alert('Este caso no se puede eliminar desde aquí. Solo se pueden eliminar casos Complex.');",
      "alert(t(`${UI_RCP}.no_se_puede_eliminar`));",
    ],
    [
      'alert(`Error al eliminar el caso: ${error.message}`);',
      "alert(t(`${UI_RCP}.error_eliminar_caso`, { mensaje: error.message }));",
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
    if (!s.includes(a)) console.warn('miss RCP', a.slice(0, 60));
    else s = s.split(a).join(b);
  }

  // Map camposFechaDisponibles -> camposFechaConLabel in JSX select options
  s = s.replace(/camposFechaDisponibles\.map/g, 'camposFechaConLabel.map');
  // For column pickers that use todosLosCampos and .label
  s = s.replace(/todosLosCampos\.map\(\(\{ clave, label \}\)/g, 'todosLosCamposConLabel.map(({ clave, label })');
  s = s.replace(/todosLosCampos\.filter\(\(c\) =>/g, 'todosLosCamposConLabel.filter((c) =>');
  // careful - some filters only need clave. ConLabel still has clave so OK.

  return s;
});

console.log('batch C done');
