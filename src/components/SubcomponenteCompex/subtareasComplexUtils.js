import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
import { esUsuarioGerenteFacturacion } from '../../config/gerentesFacturacion';
import { resolveUploadsUrl } from '../../config/apiConfig.js';
import { resolverUrlArchivo } from '../../services/storageSignedUrl.js';

function normalizarRefArchivoSubtarea(archivo) {
  if (!archivo) return '';
  const candidatos = [
    archivo.url,
    archivo.ruta,
    archivo.filename,
  ].filter(Boolean);
  for (const valor of candidatos) {
    let v = String(valor).trim();
    if (!v) continue;
    // Solo nombre de archivo local → ruta uploads
    if (
      !v.startsWith('http') &&
      !v.startsWith('s3:') &&
      !v.startsWith('/') &&
      !v.includes('\\')
    ) {
      v = `/uploads/${v}`;
    }
    return v;
  }
  return '';
}

/** Sync fallback (proxy). Preferir urlArchivoSubtareaAsync para click/descarga. */
export function urlArchivoSubtarea(archivo) {
  const ref = normalizarRefArchivoSubtarea(archivo);
  if (!ref) return '';
  return resolveUploadsUrl(ref) || '';
}

/** URL firmada S3 (o proxy fallback) para abrir/descargar adjuntos de subtarea. */
export async function urlArchivoSubtareaAsync(archivo) {
  const ref = normalizarRefArchivoSubtarea(archivo);
  if (!ref) return '';
  return (await resolverUrlArchivo(ref)) || '';
}

export function puedeGestionarSubtareasFrontend(codiRespnsbleCaso) {
  const login = String(localStorage.getItem('login') || '').trim();
  const rol = String(localStorage.getItem('rol') || '').trim().toLowerCase();
  if (
    rol === 'admin' ||
    rol === 'administrador' ||
    rol === 'gerencia' ||
    rol === 'gerente' ||
    rol.includes('gerencia')
  ) {
    return true;
  }
  if (esUsuarioGerenteFacturacion(login)) return true;
  const codi = String(codiRespnsbleCaso || '').trim();
  return Boolean(login && codi && login === codi);
}

export const SEMAFORO_STYLES = {
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

export const ESTADO_LABELS = {
  get pendiente() { return t('complex.ui.subtareas_complex_utils.pendiente'); },
  get en_progreso() { return t('complex.ui.subtareas_complex_utils.en_progreso'); },
  get completada() { return t('complex.ui.subtareas_complex_utils.completada'); },
  get cancelada() { return t('complex.ui.subtareas_complex_utils.cancelada'); },
};

/** Etapas cuyo entregable es un formato (informe): exigen adjuntarlo para completar. */
export const ETAPAS_REQUIEREN_FORMATO = new Set([
  'informePreliminar',
  'informeFinal',
  'presentacionCifras',
]);

/**
 * Etapas que en trazabilidad NO suben documento: solo fechas (y observaciones).
 * En subtareas se ocultan adjuntos/formato y se piden las mismas fechas del protocolo.
 */
export const ETAPAS_SOLO_FECHA = new Set([
  'recepcionAsignacion',
  'carguePlataforma',
  'coordinacionInspeccion',
  'seguimientoDocsPendientes',
  'seguimientoAutorizacionCompania',
  'seguimientoDocumentosPago',
]);

/**
 * Campos de protocolo por etapa (igual que las bandejas de trazabilidad).
 * Se sincronizan al caso Complex al guardar/completar la subtarea.
 */
export const CAMPOS_PROTOCOLO_POR_ETAPA = {
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

/** Observaciones de la etapa → campo del caso Complex (como en trazabilidad). */
export const CAMPO_OBS_POR_ETAPA = {
  contactoInicial: 'obseContIni',
  coordinacionInspeccion: 'obseCoordInspeccion',
  inspeccion: 'obseInspccion',
};

export function subtareaRequiereFormato(subtarea) {
  if (subtarea?.requiereFormato) return true;
  if (esFlujoVisitaCoordinacion(subtarea)) {
    return politicaEntregaFlujoVisita(subtarea) === 'exige_preliminar';
  }
  const etapa = String(subtarea?.etapaTrazabilidad || '').trim();
  if (ETAPAS_SOLO_FECHA.has(etapa)) return false;
  return ETAPAS_REQUIEREN_FORMATO.has(etapa);
}

export function subtareaEsSoloFecha(etapaOSubtarea) {
  // Flujo visita (coordinación→inspección): solo la 1.ª fase es “solo fechas”
  if (typeof etapaOSubtarea === 'object' && etapaOSubtarea) {
    if (esFlujoVisitaCoordinacion(etapaOSubtarea)) {
      return faseFlujoVisita(etapaOSubtarea) === 'coordinacion';
    }
  }
  const etapa =
    typeof etapaOSubtarea === 'string'
      ? etapaOSubtarea
      : etapaOSubtarea?.etapaTrazabilidad;
  return ETAPAS_SOLO_FECHA.has(String(etapa || '').trim());
}

/** Coordinación asignada = la persona sigue hasta inspección/acta. */
export function esFlujoVisitaCoordinacion(subtarea) {
  return String(subtarea?.etapaTrazabilidad || '').trim() === 'coordinacionInspeccion';
}

export const FASES_FLUJO_VISITA = {
  coordinacion: 'coordinacion',
  inspeccion: 'inspeccion',
  decidir: 'decidir',
  preliminar: 'preliminar',
};

export function faseFlujoVisita(subtarea) {
  if (!esFlujoVisitaCoordinacion(subtarea)) return '';
  const f = String(subtarea?.flujoVisitaFase || '').trim();
  return f || 'coordinacion';
}

export function etiquetaFaseFlujoVisita(fase) {
  const mapa = {
    coordinacion: () => t('complex.ui.subtareas_complex_utils.fase_1_coordinacion'),
    inspeccion: () => t('complex.ui.subtareas_complex_utils.fase_2_inspeccion_acta'),
    decidir: () => t('complex.ui.subtareas_complex_utils.fase_3_entrega_ajustador'),
    preliminar: () => t('complex.ui.subtareas_complex_utils.fase_3_informe_preliminar'),
  };
  return mapa[String(fase || '').trim()]?.() || '';
}

export function politicaEntregaFlujoVisita(subtarea) {
  const politica = String(subtarea?.flujoVisitaEntrega || '').trim();
  return ['asignado_decide', 'exige_preliminar', 'solo_acta'].includes(politica)
    ? politica
    : 'asignado_decide';
}

export function etiquetaPoliticaEntregaFlujoVisita(politica) {
  const mapa = {
    asignado_decide: () => t('complex.ui.subtareas_complex_utils.politica_asignado_decide'),
    exige_preliminar: () => t('complex.ui.subtareas_complex_utils.politica_exige_preliminar'),
    solo_acta: () => t('complex.ui.subtareas_complex_utils.politica_solo_acta'),
  };
  return mapa[String(politica || '').trim()]?.() || t('complex.ui.subtareas_complex_utils.politica_asignado_decide');
}

/** Campos de fecha visibles según la fase del flujo visita. */
export function camposProtocoloFlujoVisita(fase) {
  const f = String(fase || '').trim();
  if (f === 'coordinacion') return CAMPOS_PROTOCOLO_POR_ETAPA.coordinacionInspeccion || [];
  if (f === 'inspeccion' || f === 'decidir') return CAMPOS_PROTOCOLO_POR_ETAPA.inspeccion || [];
  if (f === 'preliminar') return CAMPOS_PROTOCOLO_POR_ETAPA.informePreliminar || [];
  return [];
}

/** Fechas mínimas para cerrar el flujo (coord + inspección). */
export function camposProtocoloCierreFlujoVisita() {
  return [
    ...(CAMPOS_PROTOCOLO_POR_ETAPA.coordinacionInspeccion || []),
    ...(CAMPOS_PROTOCOLO_POR_ETAPA.inspeccion || []),
  ];
}

export function faltanFechasFlujoVisitaParaCerrar(fechasProtocolo) {
  const faltantes = [];
  for (const c of camposProtocoloCierreFlujoVisita().filter((x) => x.requerido)) {
    if (!fechaInputDesdeValor(fechasProtocolo?.[c.campo])) {
      faltantes.push(c.label);
    }
  }
  return faltantes;
}

/** Acta = documento o formato ya cargado (físico o generado). */
export function subtareaTieneActaVisita(subtarea) {
  return (subtarea?.archivos || []).length > 0;
}

export function subtareaTieneFormato(subtarea) {
  return (subtarea?.archivos || []).some((a) => a.tipoArchivo === 'formato');
}

/** Etiquetas de adjunto según etapa (espejo de trazabilidad). */
const ETIQUETA_ADJUNTO_KEYS = {
  contactoInicial: 'adjunto_contacto_inicial',
  inspeccion: 'adjunto_inspeccion',
  solicitudDocs: 'adjunto_solicitud_docs',
  informePreliminar: 'adjunto_informe_preliminar',
  ultimoDocumento: 'adjunto_ultimo_documento',
  reporteActividades: 'adjunto_reporte_actividades',
  informeFinal: 'adjunto_informe_final',
  presentacionCifras: 'adjunto_presentacion_cifras',
  envioFiniquito: 'adjunto_envio_finiquito',
};

/** @deprecated Prefer etiquetaAdjuntoEtapa(etapa, t) */
export const ETIQUETA_ADJUNTO_POR_ETAPA = Object.fromEntries(
  Object.entries(ETIQUETA_ADJUNTO_KEYS).map(([k, key]) => [
    k,
    () => t(`complex.ui.mis_subtareas_complex.${key}`),
  ])
);

export function etiquetaAdjuntoEtapa(etapa, translate) {
  const tr = typeof translate === 'function' ? translate : t;
  const key = String(etapa || '').trim();
  const i18nKey = ETIQUETA_ADJUNTO_KEYS[key];
  if (i18nKey) return tr(`complex.ui.mis_subtareas_complex.${i18nKey}`);
  return tr('complex.ui.mis_subtareas_complex.adjuntar_documento_etapa');
}

export function tituloEtapaSubtarea(etapa, translate) {
  const tr = typeof translate === 'function' ? translate : t;
  const key = String(etapa || '').trim();
  if (!key) return '';
  const i18nKey = `complex.ui.mis_subtareas_complex.titulo_etapa_${key}`;
  const translated = tr(i18nKey);
  return translated && translated !== i18nKey ? translated : key;
}

/**
 * Etapas que en trazabilidad suben documento (no solo fechas).
 * En subtareas el adjunto es el entregable visible en la bandeja del caso.
 */
export const ETAPAS_CON_DOCUMENTO = new Set([
  'contactoInicial',
  'inspeccion',
  'solicitudDocs',
  'informePreliminar',
  'ultimoDocumento',
  'reporteActividades',
  'informeFinal',
  'presentacionCifras',
  'envioFiniquito',
]);

export function subtareaRequiereDocumento(subtarea) {
  const etapa = String(subtarea?.etapaTrazabilidad || '').trim();
  if (ETAPAS_SOLO_FECHA.has(etapa)) return false;
  if (ETAPAS_REQUIEREN_FORMATO.has(etapa)) return false; // el formato cubre el entregable
  return ETAPAS_CON_DOCUMENTO.has(etapa);
}

export function subtareaTieneDocumento(subtarea) {
  return (subtarea?.archivos || []).some(
    (a) => (a.tipoArchivo || 'documento') === 'documento' || a.tipoArchivo === 'formato'
  );
}

export function camposProtocoloDeEtapa(etapa) {
  return CAMPOS_PROTOCOLO_POR_ETAPA[String(etapa || '').trim()] || [];
}

export function formatearFechaSubtarea(fecha, locale) {
  if (!fecha) return '—';
  try {
    const loc = locale || 'es-CO';
    return new Date(fecha).toLocaleDateString(loc, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** Valor para input type="date" (YYYY-MM-DD). */
export function fechaInputDesdeValor(fecha) {
  if (!fecha) return '';
  try {
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) {
      const s = String(fecha).trim();
      return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

/** Etiqueta de la fecha principal (compatibilidad). */
export function etiquetaFechaProtocoloSubtarea(etapa) {
  const campos = camposProtocoloDeEtapa(etapa);
  if (campos.length === 1) return campos[0].label;
  if (campos.length > 1) return t('complex.ui.subtareas_complex_utils.fechas_etapa_protocolo');
  return t('complex.ui.subtareas_complex_utils.fecha_etapa_protocolo');
}

/** True si la etapa tiene hitos de fecha en trazabilidad. */
export function subtareaTieneFechaProtocolo(etapa) {
  return camposProtocoloDeEtapa(etapa).length > 0;
}

/** Inicializa el objeto de fechas de protocolo desde la subtarea. */
export function inicializarFechasProtocoloDesdeSubtarea(subtarea) {
  const etapa = String(subtarea?.etapaTrazabilidad || '').trim();
  let campos = camposProtocoloDeEtapa(etapa);
  // Flujo visita: cargar fechas de coordinación + inspección (+ preliminar si aplica)
  if (esFlujoVisitaCoordinacion(subtarea)) {
    const vistos = new Set();
    campos = [
      ...(CAMPOS_PROTOCOLO_POR_ETAPA.coordinacionInspeccion || []),
      ...(CAMPOS_PROTOCOLO_POR_ETAPA.inspeccion || []),
      ...(CAMPOS_PROTOCOLO_POR_ETAPA.informePreliminar || []),
    ].filter((c) => {
      if (vistos.has(c.campo)) return false;
      vistos.add(c.campo);
      return true;
    });
  }
  const guardadas =
    subtarea?.fechasProtocolo && typeof subtarea.fechasProtocolo === 'object'
      ? subtarea.fechasProtocolo
      : {};
  const out = {};
  for (const c of campos) {
    out[c.campo] = fechaInputDesdeValor(guardadas[c.campo] || '');
  }
  // Compat: una sola fechaProtocolo antigua → primer campo
  if (campos.length && !out[campos[0].campo] && subtarea?.fechaProtocolo) {
    out[campos[0].campo] = fechaInputDesdeValor(subtarea.fechaProtocolo);
  }
  return out;
}

/** Valida que todas las fechas requeridas de la etapa estén diligenciadas. */
export function faltanFechasProtocoloRequeridas(etapa, fechasProtocolo) {
  const campos = camposProtocoloDeEtapa(etapa).filter((c) => c.requerido);
  const faltantes = [];
  for (const c of campos) {
    if (!fechaInputDesdeValor(fechasProtocolo?.[c.campo])) {
      faltantes.push(c.label);
    }
  }
  return faltantes;
}

export function formatearFechaHoraSubtarea(fecha, locale) {
  if (!fecha) return '—';
  try {
    const loc = locale || 'es-CO';
    return new Date(fecha).toLocaleString(loc, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** Texto de duración (usa campos del API o calcula desde fechas). */
export function formatearDuracionSubtarea(subtarea) {
  if (!subtarea) return null;
  if (subtarea.duracionTrabajoTexto) return subtarea.duracionTrabajoTexto;
  const ms = subtarea.duracionTrabajoMs;
  if (ms == null || Number.isNaN(Number(ms)) || ms < 0) return null;
  const totalMin = Math.round(Number(ms) / 60000);
  if (totalMin < 1) return 'menos de 1 min';
  if (totalMin < 60) return `${totalMin} min`;
  const horas = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (horas < 48) return mins > 0 ? `${horas} h ${mins} min` : `${horas} h`;
  const dias = Math.floor(horas / 24);
  const horasRest = horas % 24;
  return horasRest > 0 ? `${dias} d ${horasRest} h` : `${dias} d`;
}
