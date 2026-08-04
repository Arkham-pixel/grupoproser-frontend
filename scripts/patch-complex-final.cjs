/**
 * Parche robusto (CRLF) del español UI restante Complex.
 * node scripts/patch-complex-final.cjs
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function load(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function save(rel, s) {
  fs.writeFileSync(path.join(root, rel), s);
  console.log('saved', rel);
}
function repl(s, re, to) {
  const n = (s.match(re) || []).length;
  if (!n) console.warn('  no match:', String(re).slice(0, 70));
  return s.replace(re, to);
}

// ---- subtareasComplexUtils ----
{
  let s = load('src/components/SubcomponenteCompex/subtareasComplexUtils.js');
  s = repl(s, /label: 'Al día'/, "get label() { return t('complex.ui.subtareas_complex_utils.al_dia'); }");
  s = repl(s, /label: 'En curso \/ próximo a vencer'/, "get label() { return t('complex.ui.subtareas_complex_utils.en_curso_proximo_a_vencer'); }");
  s = repl(s, /label: 'Vencida'/, "get label() { return t('complex.ui.subtareas_complex_utils.vencida'); }");
  s = repl(s, /label: 'Cancelada'/, "get label() { return t('complex.ui.subtareas_complex_utils.cancelada'); }");
  s = repl(
    s,
    /export const ESTADO_LABELS = \{[\s\S]*?\};/,
    `export const ESTADO_LABELS = {
  get pendiente() { return t('complex.ui.subtareas_complex_utils.pendiente'); },
  get en_progreso() { return t('complex.ui.subtareas_complex_utils.en_progreso'); },
  get completada() { return t('complex.ui.subtareas_complex_utils.completada'); },
  get cancelada() { return t('complex.ui.subtareas_complex_utils.cancelada'); },
};`
  );
  const labelMap = [
    ['Fecha de recepción / asignación', 'fecha_recepcion_asignacion'],
    ['Fecha de cargue / asignación', 'fecha_cargue_asignacion'],
    ['Fecha de contacto inicial', 'fecha_contacto_inicial'],
    ['Fecha de la llamada', 'fecha_de_la_llamada'],
    ['Fecha programada de inspección', 'fecha_programada_inspeccion'],
    ['Fecha de inspección', 'fecha_inspeccion'],
    ['Fecha de solicitud de documentos', 'fecha_solicitud_documentos'],
    ['Fecha de informe preliminar', 'fecha_informe_preliminar'],
    ['Fecha de seguimiento de documentos', 'fecha_seguimiento_documentos'],
    ['Fecha de reporte de actividades', 'fecha_reporte_actividades'],
    ['Fecha de informe final', 'fecha_informe_final'],
    ['Fecha de aceptación / autorización compañía', 'fecha_aceptacion_autorizacion'],
    ['Fecha de presentación de cifras', 'fecha_presentacion_cifras'],
    ['Fecha de seguimiento docs de pago', 'fecha_seguimiento_docs_pago'],
    ['Fecha de envío de finiquito', 'fecha_envio_finiquito'],
  ];
  for (const [esLabel, key] of labelMap) {
    s = s.split(`label: '${esLabel}'`).join(`get label() { return t('complex.ui.subtareas_complex_utils.${key}'); }`);
  }
  s = repl(s, /coordinacion: '1\. Coordinación'/, "coordinacion: () => t('complex.ui.subtareas_complex_utils.fase_1_coordinacion')");
  s = repl(s, /inspeccion: '2\. Inspección y acta'/, "inspeccion: () => t('complex.ui.subtareas_complex_utils.fase_2_inspeccion_acta')");
  s = repl(s, /decidir: '3\. Entrega al ajustador'/, "decidir: () => t('complex.ui.subtareas_complex_utils.fase_3_entrega_ajustador')");
  s = repl(s, /preliminar: '3\. Informe preliminar \(opcional\)'/, "preliminar: () => t('complex.ui.subtareas_complex_utils.fase_3_informe_preliminar')");
  s = repl(s, /return mapa\[String\(fase \|\| ''\)\.trim\(\)\] \|\| '';/, "return mapa[String(fase || '').trim()]?.() || '';");
  s = repl(
    s,
    /return \{\s*asignado_decide: 'El asignado decide después del acta',\s*exige_preliminar: 'Informe preliminar obligatorio',\s*solo_acta: 'Solo acta y entrega al ajustador',\s*\}\[String\(politica \|\| ''\)\.trim\(\)\] \|\| 'El asignado decide después del acta';/,
    `const mapa = {
    asignado_decide: () => t('complex.ui.subtareas_complex_utils.politica_asignado_decide'),
    exige_preliminar: () => t('complex.ui.subtareas_complex_utils.politica_exige_preliminar'),
    solo_acta: () => t('complex.ui.subtareas_complex_utils.politica_solo_acta'),
  };
  return mapa[String(politica || '').trim()]?.() || t('complex.ui.subtareas_complex_utils.politica_asignado_decide');`
  );

  // adjuntos
  const adjMap = {
    'Adjuntos del contacto inicial': 'adjuntos_contacto_inicial',
    'Acta de inspección': 'acta_inspeccion',
    'Adjunto de solicitud de documentos': 'adjunto_solicitud_docs',
    'Adjunto del informe preliminar': 'adjunto_informe_preliminar',
    'Adjunto del último documento': 'adjunto_ultimo_documento',
    'Adjunto del reporte de actividades': 'adjunto_reporte_actividades',
    'Adjunto del informe final': 'adjunto_informe_final',
    'Adjunto de presentación de cifras': 'adjunto_presentacion_cifras',
    'Adjunto de envío de finiquito': 'adjunto_envio_finiquito',
  };
  // add keys later to locales; for now patch with keys we'll add
  for (const [esLabel, key] of Object.entries(adjMap)) {
    s = s.split(`'${esLabel}'`).join(`t('complex.ui.subtareas_complex_utils.${key}')`);
  }
  s = s.split(`'Adjuntar documento de la etapa'`).join(`t('complex.ui.subtareas_complex_utils.adjuntar_documento_etapa')`);
  s = s.split(`'Fechas de la etapa (protocolo)'`).join(`t('complex.ui.subtareas_complex_utils.fechas_etapa_protocolo')`);
  s = s.split(`'Fecha de la etapa (protocolo)'`).join(`t('complex.ui.subtareas_complex_utils.fecha_etapa_protocolo')`);
  save('src/components/SubcomponenteCompex/subtareasComplexUtils.js', s);
}

// Add missing adjunto keys
{
  const esPath = path.join(root, 'src/locales/es.json');
  const enPath = path.join(root, 'src/locales/en.json');
  const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  Object.assign(es.complex.ui.subtareas_complex_utils, {
    adjuntos_contacto_inicial: 'Adjuntos del contacto inicial',
    acta_inspeccion: 'Acta de inspección',
    adjunto_solicitud_docs: 'Adjunto de solicitud de documentos',
    adjunto_informe_preliminar: 'Adjunto del informe preliminar',
    adjunto_ultimo_documento: 'Adjunto del último documento',
    adjunto_reporte_actividades: 'Adjunto del reporte de actividades',
    adjunto_informe_final: 'Adjunto del informe final',
    adjunto_presentacion_cifras: 'Adjunto de presentación de cifras',
    adjunto_envio_finiquito: 'Adjunto de envío de finiquito',
    adjuntar_documento_etapa: 'Adjuntar documento de la etapa',
    fechas_etapa_protocolo: 'Fechas de la etapa (protocolo)',
    fecha_etapa_protocolo: 'Fecha de la etapa (protocolo)',
  });
  Object.assign(en.complex.ui.subtareas_complex_utils, {
    adjuntos_contacto_inicial: 'Initial contact attachments',
    acta_inspeccion: 'Inspection report',
    adjunto_solicitud_docs: 'Document request attachment',
    adjunto_informe_preliminar: 'Preliminary report attachment',
    adjunto_ultimo_documento: 'Last document attachment',
    adjunto_reporte_actividades: 'Activity report attachment',
    adjunto_informe_final: 'Final report attachment',
    adjunto_presentacion_cifras: 'Figures presentation attachment',
    adjunto_envio_finiquito: 'Settlement dispatch attachment',
    adjuntar_documento_etapa: 'Attach stage document',
    fechas_etapa_protocolo: 'Stage dates (protocol)',
    fecha_etapa_protocolo: 'Stage date (protocol)',
  });
  // extra UI keys used below
  Object.assign(es.complex.ui.seguimiento, {
    error_subiendo_archivo_fallback: 'Error subiendo archivo ({{status}})',
    subiendo_s3: 'Subiendo a S3…',
  });
  Object.assign(en.complex.ui.seguimiento, {
    error_subiendo_archivo_fallback: 'Error uploading file ({{status}})',
    subiendo_s3: 'Uploading to S3…',
  });
  Object.assign(es.complex.ui.control_horas_editor, {
    atencion: es.complex.ui.control_horas_editor.atencion || 'Atención',
  });
  fs.writeFileSync(esPath, JSON.stringify(es, null, 2) + '\n');
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
  console.log('locales adjuntos ok');
}

function patchMany(rel, pairs) {
  let s = load(rel);
  let changed = 0;
  for (const [from, to] of pairs) {
    if (typeof from === 'string') {
      if (!s.includes(from)) {
        console.warn('  miss', rel, from.slice(0, 60));
        continue;
      }
      const c = s.split(from).length - 1;
      s = s.split(from).join(to);
      changed += c;
    } else {
      const before = s;
      s = s.replace(from, to);
      if (s !== before) changed += 1;
      else console.warn('  miss re', rel, String(from).slice(0, 60));
    }
  }
  if (!s.includes('i18n.t.bind') && !s.includes('const { t } = useTranslation') && !s.includes('useTranslation()')) {
    const ip = rel.includes('SubcomponenteCompex') ? '../../i18n' : '../i18n';
    s = `import i18n from '${ip}';\nconst t = i18n.t.bind(i18n);\n` + s;
  }
  if (s.includes('useTranslation();') && !s.includes('const { t }')) {
    s = s.replace(/useTranslation\(\);/, 'const { t } = useTranslation();');
  }
  save(rel, s);
  console.log(' ', changed, 'changes');
}

// Facturacion remaining
patchMany('src/components/SubcomponenteCompex/Facturacion.jsx', [
  ['subtitulo="Fase 1: liquidación y envío a Elkin o Iskharly"', `subtitulo={t('complex.ui.facturacion.fase1_liquidacion')}`],
  ["exportandoExcel ? 'Generando...' : 'Descargar Excel'", `exportandoExcel ? t('complex.ui.facturacion.generando') : t('complex.ui.facturacion.descargar_excel')`],
  ['titulo="Envío de Control de Horas"', `titulo={t('complex.ui.facturacion.envio_control_horas')}`],
  ['subtitulo="Fase 2: evidencia y notificación a facturación (Adriana)"', `subtitulo={t('complex.ui.facturacion.fase2_evidencia')}`],
  ['titulo="Autorización"', `titulo={t('complex.ui.facturacion.autorizacion')}`],
  ['subtitulo="Fechas, comentarios y documentos de autorización"', `subtitulo={t('complex.ui.facturacion.fechas_comentarios_docs_autorizacion')}`],
  ['titulo="Facturación"', `titulo={t('complex.ui.facturacion.facturacion')}`],
  ['subtitulo="Documentos y fechas de facturación"', `subtitulo={t('complex.ui.facturacion.documentos_y_fechas_facturacion')}`],
  ['titulo="Guarde el caso"', `titulo={t('complex.ui.facturacion.guarde_el_caso')}`],
  [
    "'IMPORTANTE: Debe hacer clic en el botón «Guardar» que está arriba del caso para guardar los cambios.\\n\\n' +\n          'Si no lo hace, el control de horas no quedará guardado.'",
    "t('complex.ui.facturacion.importante_guardar_caso')",
  ],
  ['titulo="Correo del analista"', `titulo={t('complex.ui.facturacion.correo_del_analista')}`],
]);

// add generando key
{
  const es = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/es.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));
  es.complex.ui.facturacion.generando = 'Generando...';
  en.complex.ui.facturacion.generando = 'Generating...';
  fs.writeFileSync(path.join(root, 'src/locales/es.json'), JSON.stringify(es, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'src/locales/en.json'), JSON.stringify(en, null, 2) + '\n');
}

patchMany('src/components/SubcomponenteCompex/ControlHorasEditor.jsx', [
  ["titulo = 'Atención'", `titulo = t('complex.ui.control_horas_editor.atencion')`],
  ["'Descripción pendiente'", `t('complex.ui.control_horas_editor.descripcion_pendiente')`],
  ["'Analista pendiente'", `t('complex.ui.control_horas_editor.analista_pendiente')`],
  ["'Correo del analista'", `t('complex.ui.control_horas_editor.correo_del_analista')`],
]);

patchMany('src/components/SubcomponenteCompex/Trazabilidad.jsx', [
  [/alert\(['"]No se pudo descargar el documento\.['"]\)/, `alert(t('complex.ui.trazabilidad.no_descargar_documento'))`],
]);

patchMany('src/components/SubcomponenteCompex/Seguimiento.jsx', [
  ['errorResp.error || `Error subiendo archivo (${response.status})`', `errorResp.error || t('complex.ui.seguimiento.error_subiendo_archivo', { status: response.status })`],
  ['vacio="Sin documento"', `vacio={t('complex.ui.seguimiento.sin_documento')}`],
  ["titulo=\"Resumen de seguimiento\"", `titulo={t('complex.ui.seguimiento.resumen_de_seguimiento')}`],
  [/mensaje='\$\{t\('complex\.ui\.seguimiento\.no_hay_seguimientos'\)\}'/, `mensaje={t('complex.ui.seguimiento.no_hay_seguimientos')}`],
]);

for (const [rel, ns] of [
  ['src/components/SubcomponenteCompex/SeguimientoAutorizacionCompania.jsx', 'seguimiento_autorizacion_compania'],
  ['src/components/SubcomponenteCompex/SeguimientoDocumentosPago.jsx', 'seguimiento_documentos_pago'],
  ['src/components/SubcomponenteCompex/SeguimientoDocumentosPendientes.jsx', 'seguimiento_documentos_pendientes'],
]) {
  patchMany(rel, [
    ['errorResp.error || `Error subiendo archivo (${response.status})`', `errorResp.error || t('complex.ui.${ns}.error_subiendo_archivo', { status: response.status })`],
    ["subiendo ? 'Subiendo a S3…' : 'Agregar seguimiento'", `subiendo ? t('complex.ui.seguimiento.subiendo_s3') : t('complex.ui.${ns}.agregar_seguimiento')`],
    [`titulo="Resumen — autorización compañía"`, `titulo={t('complex.ui.seguimiento_autorizacion_compania.resumen_autorizacion')}`],
    [`titulo="Resumen — seguimiento documental"`, `titulo={t('complex.ui.seguimiento_documentos_pendientes.resumen_documental')}`],
  ]);
}

console.log('final batch A done');
