/**
 * Aplica reemplazos de UI español restante en archivos Complex.
 * node scripts/patch-complex-remaining-files.cjs
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content);
  console.log('patched', rel);
}
function ensureI18n(src, importPath) {
  if (src.includes("from '" + importPath) || src.includes('from "' + importPath)) {
    if (!src.includes('const t = i18n.t.bind')) {
      // has import but maybe different pattern
    }
    return src;
  }
  if (src.includes("from '../../i18n'") || src.includes("from '../i18n'")) return src;
  return `import i18n from '${importPath}';\nconst t = i18n.t.bind(i18n);\n` + src;
}

// ---------- subtareasComplexUtils.js ----------
{
  let s = read('src/components/SubcomponenteCompex/subtareasComplexUtils.js');
  s = ensureI18n(s, '../../i18n');
  s = s.replace(
    /export const SEMAFORO_STYLES = \{[\s\S]*?\n\};\n/,
    `export const SEMAFORO_STYLES = {
  verde: {
    get label() { return t('complex.ui.subtareas_complex_utils.al_dia'); },
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  },
  amarillo: {
    get label() { return t('complex.ui.subtareas_complex_utils.en_curso_proximo_a_vencer'); },
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  },
  rojo: {
    get label() { return t('complex.ui.subtareas_complex_utils.vencida'); },
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
  },
  gris: {
    get label() { return t('complex.ui.subtareas_complex_utils.cancelada'); },
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
};

`
  );
  s = s.replace(
    /export const ESTADO_LABELS = \{[\s\S]*?\n\};\n/,
    `export const ESTADO_LABELS = {
  get pendiente() { return t('complex.ui.subtareas_complex_utils.pendiente'); },
  get en_progreso() { return t('complex.ui.subtareas_complex_utils.en_progreso'); },
  get completada() { return t('complex.ui.subtareas_complex_utils.completada'); },
  get cancelada() { return t('complex.ui.subtareas_complex_utils.cancelada'); },
};

`
  );
  s = s.replace(
    /export const CAMPOS_PROTOCOLO_POR_ETAPA = \{[\s\S]*?\n\};\n/,
    `export const CAMPOS_PROTOCOLO_POR_ETAPA = {
  recepcionAsignacion: [
    { campo: 'fchaAsgncion', get label() { return t('complex.ui.subtareas_complex_utils.fecha_recepcion_asignacion'); }, requerido: true },
  ],
  carguePlataforma: [
    { campo: 'fchaAsgncion', get label() { return t('complex.ui.subtareas_complex_utils.fecha_cargue_asignacion'); }, requerido: true },
  ],
  contactoInicial: [
    { campo: 'fchaContIni', get label() { return t('complex.ui.subtareas_complex_utils.fecha_contacto_inicial'); }, requerido: true },
  ],
  coordinacionInspeccion: [
    { campo: 'fchaCoordInspeccion', get label() { return t('complex.ui.subtareas_complex_utils.fecha_de_la_llamada'); }, requerido: true },
    { campo: 'fchaProgInspeccion', get label() { return t('complex.ui.subtareas_complex_utils.fecha_programada_inspeccion'); }, requerido: true },
  ],
  inspeccion: [
    { campo: 'fchaInspccion', get label() { return t('complex.ui.subtareas_complex_utils.fecha_inspeccion'); }, requerido: true },
  ],
  solicitudDocs: [
    { campo: 'fchaSoliDocu', get label() { return t('complex.ui.subtareas_complex_utils.fecha_solicitud_documentos'); }, requerido: true },
  ],
  informePreliminar: [
    { campo: 'fchaInfoPrelm', get label() { return t('complex.ui.subtareas_complex_utils.fecha_informe_preliminar'); }, requerido: true },
  ],
  seguimientoDocsPendientes: [
    { campo: 'fchaUltSegui', get label() { return t('complex.ui.subtareas_complex_utils.fecha_seguimiento_documentos'); }, requerido: true },
  ],
  ultimoDocumento: [
    { campo: 'fchaRepoActi', get label() { return t('complex.ui.subtareas_complex_utils.fecha_reporte_actividades'); }, requerido: true },
  ],
  reporteActividades: [
    { campo: 'fchaRepoActi', get label() { return t('complex.ui.subtareas_complex_utils.fecha_reporte_actividades'); }, requerido: true },
  ],
  informeFinal: [
    { campo: 'fchaInfoFnal', get label() { return t('complex.ui.subtareas_complex_utils.fecha_informe_final'); }, requerido: true },
  ],
  seguimientoAutorizacionCompania: [
    {
      campo: 'fchaAceptacionCifrasAseguradora',
      get label() { return t('complex.ui.subtareas_complex_utils.fecha_aceptacion_autorizacion'); },
      requerido: true,
    },
  ],
  presentacionCifras: [
    { campo: 'fchaPresentacionCifras', get label() { return t('complex.ui.subtareas_complex_utils.fecha_presentacion_cifras'); }, requerido: true },
  ],
  seguimientoDocumentosPago: [
    { campo: 'fchaUltSegui', get label() { return t('complex.ui.subtareas_complex_utils.fecha_seguimiento_docs_pago'); }, requerido: true },
  ],
  envioFiniquito: [
    { campo: 'fchaEnvioFiniquito', get label() { return t('complex.ui.subtareas_complex_utils.fecha_envio_finiquito'); }, requerido: true },
  ],
};

`
  );
  s = s.replace(
    /export function etiquetaFaseFlujoVisita\(fase\) \{[\s\S]*?\n\}/,
    `export function etiquetaFaseFlujoVisita(fase) {
  const mapa = {
    coordinacion: () => t('complex.ui.subtareas_complex_utils.fase_1_coordinacion'),
    inspeccion: () => t('complex.ui.subtareas_complex_utils.fase_2_inspeccion_acta'),
    decidir: () => t('complex.ui.subtareas_complex_utils.fase_3_entrega_ajustador'),
    preliminar: () => t('complex.ui.subtareas_complex_utils.fase_3_informe_preliminar'),
  };
  return mapa[String(fase || '').trim()]?.() || '';
}`
  );
  s = s.replace(
    /export function etiquetaPoliticaEntregaFlujoVisita\(politica\) \{[\s\S]*?\n\}/,
    `export function etiquetaPoliticaEntregaFlujoVisita(politica) {
  const mapa = {
    asignado_decide: () => t('complex.ui.subtareas_complex_utils.politica_asignado_decide'),
    exige_preliminar: () => t('complex.ui.subtareas_complex_utils.politica_exige_preliminar'),
    solo_acta: () => t('complex.ui.subtareas_complex_utils.politica_solo_acta'),
  };
  return mapa[String(politica || '').trim()]?.() || t('complex.ui.subtareas_complex_utils.politica_asignado_decide');
}`
  );
  write('src/components/SubcomponenteCompex/subtareasComplexUtils.js', s);
}

// ---------- subtareaProtocoloUtils.js ----------
{
  let s = read('src/components/SubcomponenteCompex/subtareaProtocoloUtils.js');
  s = ensureI18n(s, '../../i18n');
  s = s.replace(
    /export const ETAPAS_TRAZABILIDAD_SUBTAREA = \[[\s\S]*?\];/,
    `export const ETAPAS_TRAZABILIDAD_SUBTAREA = [
  { tipo: 'recepcionAsignacion', get titulo() { return t('complex.ui.etapas_trazabilidad.recepcion_asignacion'); } },
  { tipo: 'carguePlataforma', get titulo() { return t('complex.ui.etapas_trazabilidad.cargue_asignacion_interna'); } },
  { tipo: 'contactoInicial', get titulo() { return t('complex.ui.etapas_trazabilidad.contacto_inicial'); } },
  { tipo: 'coordinacionInspeccion', get titulo() { return t('complex.ui.etapas_trazabilidad.coordinacion_inspeccion'); } },
  { tipo: 'inspeccion', get titulo() { return t('complex.ui.etapas_trazabilidad.inspeccion'); } },
  { tipo: 'solicitudDocs', get titulo() { return t('complex.ui.etapas_trazabilidad.solicitud_docs'); } },
  { tipo: 'informePreliminar', get titulo() { return t('complex.ui.etapas_trazabilidad.informe_preliminar'); } },
  { tipo: 'seguimientoDocsPendientes', get titulo() { return t('complex.ui.etapas_trazabilidad.seguimiento_docs_pendientes'); } },
  { tipo: 'ultimoDocumento', get titulo() { return t('complex.ui.etapas_trazabilidad.ultimo_documento'); } },
  { tipo: 'informeFinal', get titulo() { return t('complex.ui.etapas_trazabilidad.informe_final'); } },
  { tipo: 'seguimientoAutorizacionCompania', get titulo() { return t('complex.ui.etapas_trazabilidad.seguimiento_autorizacion_compania'); } },
  { tipo: 'presentacionCifras', get titulo() { return t('complex.ui.etapas_trazabilidad.presentacion_de_cifras'); } },
  { tipo: 'seguimientoDocumentosPago', get titulo() { return t('complex.ui.etapas_trazabilidad.seguimiento_docs_de_pago'); } },
  { tipo: 'envioFiniquito', get titulo() { return t('complex.ui.etapas_trazabilidad.envio_de_finiquito'); } },
];`
  );
  s = s.replace(
    /function normalizarEtiquetaPlazo\(etiqueta, etapaLike\) \{[\s\S]*?\n\}/,
    `function normalizarEtiquetaPlazo(etiqueta, etapaLike) {
  if (etiqueta && !String(etiqueta).includes('undefined')) return etiqueta;
  const lim = etapaLike?.limite;
  if (lim && lim.valor != null && lim.unidad) {
    if (lim.unidad === 'horas') return t('complex.ui.subtarea_protocolo_utils.horas', { valor: lim.valor });
    if (lim.unidad === 'dias_habiles') return t('complex.ui.subtarea_protocolo_utils.dias_habiles', { valor: lim.valor });
    if (lim.unidad === 'dias') return t('complex.ui.subtarea_protocolo_utils.dias', { valor: lim.valor });
    if (lim.unidad === 'mismo_dia') return t('complex.ui.subtarea_protocolo_utils.mismo_dia');
  }
  return t('complex.ui.subtarea_protocolo_utils.sin_plazo_fijo');
}`
  );
  write('src/components/SubcomponenteCompex/subtareaProtocoloUtils.js', s);
}

// ---------- trazabilidadFenixUi.jsx ----------
{
  let s = read('src/components/SubcomponenteCompex/trazabilidadFenixUi.jsx');
  s = s.replace(
    /export const ETAPAS_TRAZABILIDAD = \[[\s\S]*?\];/,
    `export const ETAPAS_TRAZABILIDAD = [
  { tipo: 'recepcionAsignacion', get titulo() { return t('complex.ui.etapas_trazabilidad.recepcion_asignacion'); }, Icon: FaInbox },
  { tipo: 'carguePlataforma', get titulo() { return t('complex.ui.etapas_trazabilidad.cargue_asignacion_interna'); }, Icon: FaUserCheck },
  { tipo: 'contactoInicial', get titulo() { return t('complex.ui.etapas_trazabilidad.contacto_inicial'); }, Icon: FaPhone },
  { tipo: 'coordinacionInspeccion', get titulo() { return t('complex.ui.etapas_trazabilidad.coordinacion_inspeccion'); }, Icon: FaCalendarAlt },
  { tipo: 'inspeccion', get titulo() { return t('complex.ui.etapas_trazabilidad.inspeccion'); }, Icon: FaSearch },
  { tipo: 'solicitudDocs', get titulo() { return t('complex.ui.etapas_trazabilidad.solicitud_docs'); }, Icon: FaFileAlt },
  { tipo: 'informePreliminar', get titulo() { return t('complex.ui.etapas_trazabilidad.informe_preliminar'); }, Icon: FaChartBar },
  { tipo: 'seguimientoDocsPendientes', get titulo() { return t('complex.ui.etapas_trazabilidad.seguimiento_docs_pendientes'); }, Icon: FaEnvelopeOpenText },
  { tipo: 'ultimoDocumento', get titulo() { return t('complex.ui.etapas_trazabilidad.ultimo_documento'); }, Icon: FaPaperclip },
  { tipo: 'informeFinal', get titulo() { return t('complex.ui.etapas_trazabilidad.informe_final'); }, Icon: FaFileInvoice },
  { tipo: 'seguimientoAutorizacionCompania', get titulo() { return t('complex.ui.etapas_trazabilidad.seguimiento_autorizacion_compania'); }, Icon: FaBuilding },
  { tipo: 'presentacionCifras', get titulo() { return t('complex.ui.etapas_trazabilidad.presentacion_de_cifras'); }, Icon: FaChartLine },
  { tipo: 'seguimientoDocumentosPago', get titulo() { return t('complex.ui.etapas_trazabilidad.seguimiento_docs_de_pago'); }, Icon: FaMoneyCheckAlt },
  { tipo: 'envioFiniquito', get titulo() { return t('complex.ui.etapas_trazabilidad.envio_de_finiquito'); }, Icon: FaFileInvoice },
];`
  );
  write('src/components/SubcomponenteCompex/trazabilidadFenixUi.jsx', s);
}

console.log('Utils/etapas done');
