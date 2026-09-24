import { crearFechaLocal } from '../../utils/fechaUtils.js';
import { homologarCiudadCatastrofico, resolverUbicacionCatastrofico } from '../../utils/catalogosAsignacionCatastrofico.js';
import { hidratarCamposFacturacion } from '../shared/camposFacturacionAseguradora.js';

export const ALLIANZ_REPORTE_PAGE_SIZE = 25;

export const ESTADO_ALLIANZ_DEFAULT = 'CASO NUEVO';
export const ESTADO_ALLIANZ_PRIMER_CONTACTO = 'PRIMER CONTACTO';
export const ESTADO_ALLIANZ_INSPECCION = 'INSPECCIÓN COORDINADA';
export const ESTADO_ALLIANZ_INSPECCION_REALIZADA = 'INSPECCIÓN REALIZADA';
export const ESTADO_ALLIANZ_ANALISIS = 'ANÁLISIS DE CASO';
export const ESTADO_ALLIANZ_PENDIENTE_DOCS = 'PENDIENTE DOCUMENTOS';
export const ESTADO_ALLIANZ_OBJECION = 'OBJECIÓN';
export const ESTADO_ALLIANZ_AUTORIZACION = 'PENDIENTE APROBACIÓN ANALISTA';
export const ESTADO_ALLIANZ_CIFRAS = 'PRESENTACIÓN DE CIFRAS';
export const ESTADO_ALLIANZ_PAGO = 'CASO PARA PAGO';
export const ESTADO_ALLIANZ_EN_PROCESO_FACTURACION = 'EN PROCESO DE FACTURACIÓN';
export const ESTADO_ALLIANZ_FACTURADO = 'FACTURADO';
export const ESTADO_ALLIANZ_DESISTIDO = 'DESISTIDO';
export const ESTADO_ALLIANZ_ANULADO = 'ANULADO/CANCELADO';
/** Alias de cierre histórico; el selector ya no los muestra. */
export const ESTADO_ALLIANZ_OBJETADO = ESTADO_ALLIANZ_OBJECION;
export const ESTADO_ALLIANZ_PAGADO = ESTADO_ALLIANZ_PAGO;

export const ESTADOS_ALLIANZ = [
  ESTADO_ALLIANZ_DEFAULT,
  ESTADO_ALLIANZ_PRIMER_CONTACTO,
  ESTADO_ALLIANZ_INSPECCION,
  ESTADO_ALLIANZ_INSPECCION_REALIZADA,
  ESTADO_ALLIANZ_ANALISIS,
  ESTADO_ALLIANZ_PENDIENTE_DOCS,
  ESTADO_ALLIANZ_OBJECION,
  ESTADO_ALLIANZ_AUTORIZACION,
  ESTADO_ALLIANZ_CIFRAS,
  ESTADO_ALLIANZ_PAGO,
  ESTADO_ALLIANZ_EN_PROCESO_FACTURACION,
  ESTADO_ALLIANZ_FACTURADO,
  ESTADO_ALLIANZ_DESISTIDO,
  ESTADO_ALLIANZ_ANULADO,
];

export const ESTADOS_ALLIANZ_BLOQUE_INGRESO = Object.freeze([
  ESTADO_ALLIANZ_DEFAULT,
  ESTADO_ALLIANZ_PRIMER_CONTACTO,
  ESTADO_ALLIANZ_INSPECCION,
]);

export const ESTADOS_ALLIANZ_BLOQUE_INSPECCION = Object.freeze([
  ESTADO_ALLIANZ_INSPECCION_REALIZADA,
  ESTADO_ALLIANZ_ANALISIS,
  ESTADO_ALLIANZ_PENDIENTE_DOCS,
  ESTADO_ALLIANZ_AUTORIZACION,
  ESTADO_ALLIANZ_CIFRAS,
]);

export const ESTADOS_ALLIANZ_BLOQUE_CIERRE = Object.freeze([
  ESTADO_ALLIANZ_OBJECION,
  ESTADO_ALLIANZ_PAGO,
  ESTADO_ALLIANZ_EN_PROCESO_FACTURACION,
  ESTADO_ALLIANZ_FACTURADO,
  ESTADO_ALLIANZ_DESISTIDO,
  ESTADO_ALLIANZ_ANULADO,
]);

export const BLOQUES_SUMA_ALLIANZ = Object.freeze([
  {
    id: 'bloque-ingreso',
    titulo: 'Ingreso / contacto',
    subtitulo: 'CASO NUEVO · PRIMER CONTACTO · INSPECCIÓN COORDINADA',
    estados: [...ESTADOS_ALLIANZ_BLOQUE_INGRESO],
  },
  {
    id: 'bloque-inspeccion',
    titulo: 'Inspección, análisis y cifras',
    subtitulo:
      'INSPECCIÓN REALIZADA · ANÁLISIS DE CASO · PENDIENTE DOCUMENTOS · PENDIENTE APROBACIÓN ANALISTA · PRESENTACIÓN DE CIFRAS',
    estados: [...ESTADOS_ALLIANZ_BLOQUE_INSPECCION],
  },
  {
    id: 'bloque-cierre',
    titulo: 'Pago, facturación y salidas',
    subtitulo: 'OBJECIÓN · CASO PARA PAGO · EN PROCESO DE FACTURACIÓN · FACTURADO · DESISTIDO · ANULADO/CANCELADO',
    estados: [...ESTADOS_ALLIANZ_BLOQUE_CIERRE],
  },
]);

export const ESTADOS_CIERRE_ALLIANZ = new Set([
  ESTADO_ALLIANZ_DESISTIDO,
  ESTADO_ALLIANZ_ANULADO,
]);

export const ESTADOS_TEMPRANOS_ALLIANZ = new Set([
  ESTADO_ALLIANZ_DEFAULT,
  ESTADO_ALLIANZ_PRIMER_CONTACTO,
  ESTADO_ALLIANZ_INSPECCION,
]);

export const MODALIDADES_ALLIANZ = ['CAMPO', 'VIDEOPERITAJE'];

export const FECHA_ACCION_POR_ESTADO_ALLIANZ = {
  'CASO NUEVO': 'fechaCasoNuevo',
  'PRIMER CONTACTO': 'fechaPrimerContacto',
  'INSPECCIÓN COORDINADA': 'fechaCoordinandoInspeccion',
  'INSPECCIÓN REALIZADA': 'fechaInspeccionRealizada',
  'ANÁLISIS DE CASO': 'fechaAnalisisCaso',
  'PENDIENTE DOCUMENTOS': 'fechaSolicitudDocumento',
  OBJECIÓN: 'fechaObjecion',
  'PENDIENTE APROBACIÓN ANALISTA': 'fechaAutorizacionAnalista',
  'PRESENTACIÓN DE CIFRAS': 'fechaPresentacionCifras',
  'CASO PARA PAGO': 'fechaCasoParaPago',
  'EN PROCESO DE FACTURACIÓN': 'fechaEnProcesoFacturacion',
  FACTURADO: 'fechaFacturado',
  DESISTIDO: 'fechaDesistido',
  'ANULADO/CANCELADO': 'fechaAnulado',
};

export const CAMPOS_FECHA_ACCION_ALLIANZ = [
  'fechaCasoNuevo',
  'fechaPrimerContacto',
  'fechaCoordinandoInspeccion',
  'fechaInspeccionRealizada',
  'fechaAnalisisCaso',
  'fechaSolicitudDocumento',
  'fechaRecepcionDocumento',
  'fechaObjecion',
  'fechaObjetado',
  'fechaAutorizacionAnalista',
  'fechaPresentacionCifras',
  'fechaCasoParaPago',
  'fechaEnProcesoFacturacion',
  'fechaFacturado',
  'fechaCasoPagado',
  'fechaDesistido',
  'fechaAnulado',
];

const ESTADOS_ALLIANZ_LEGACY = {
  PENDIENTE: 'CASO NUEVO',
  'EN INSPECCION': 'INSPECCIÓN COORDINADA',
  'COORDINANDO INSPECCION': 'INSPECCIÓN COORDINADA',
  'INSPECCION COORDINADA': 'INSPECCIÓN COORDINADA',
  'CASO INSPECCIONADO': 'INSPECCIÓN REALIZADA',
  INSPECCIONADO: 'INSPECCIÓN REALIZADA',
  'INSPECCION REALIZADA': 'INSPECCIÓN REALIZADA',
  'ANALISIS DEL CASO': 'ANÁLISIS DE CASO',
  'ANALISIS DE CASO': 'ANÁLISIS DE CASO',
  DOCUMENTACION: 'PENDIENTE DOCUMENTOS',
  'PENDIENTE DE DOCUMENTO': 'PENDIENTE DOCUMENTOS',
  'PENDIENTE DE DOCUMENTOS': 'PENDIENTE DOCUMENTOS',
  'PENDIENTE DOCUMENTO': 'PENDIENTE DOCUMENTOS',
  'AUTORIZACION ANALISTA': 'PENDIENTE APROBACIÓN ANALISTA',
  'PENDIENTE APROBACION ANALISTA': 'PENDIENTE APROBACIÓN ANALISTA',
  'PRESENTACION DE CIFRAS': 'PRESENTACIÓN DE CIFRAS',
  LIQUIDADO: 'CASO PARA PAGO',
  'ENVIADO ASEGURADORA': 'CASO PARA PAGO',
  OBJECTED: 'OBJECIÓN',
  OBJETADO: 'OBJECIÓN',
  'CASO OBJETADO': 'OBJECIÓN',
  'OBJECION CERRADA': 'OBJECIÓN',
  'OBJECION FINAL': 'OBJECIÓN',
  PAGO: 'CASO PARA PAGO',
  PAGADO: 'CASO PARA PAGO',
  'CASO PAGADO': 'CASO PARA PAGO',
  INDEMNIZADO: 'CASO PARA PAGO',
  GIRADO: 'CASO PARA PAGO',
  'CASE PAID': 'CASO PARA PAGO',
  CERRADO: 'CASO PARA PAGO',
  'CERRADO MANUAL': 'CASO PARA PAGO',
  DESISTIMIENTO: 'DESISTIDO',
  ANULADO: 'ANULADO/CANCELADO',
  CANCELADO: 'ANULADO/CANCELADO',
  'ANULADO CANCELADO': 'ANULADO/CANCELADO',
  'SIN COBERTURA': 'ANULADO/CANCELADO',
};

const claveEstadoAllianz = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

export function homologarEstadoAllianz(valor) {
  const raw = String(valor || '').trim();
  if (!raw) return ESTADO_ALLIANZ_DEFAULT;
  if (ESTADOS_ALLIANZ.includes(raw)) return raw;
  const key = claveEstadoAllianz(raw);
  const exacto = ESTADOS_ALLIANZ.find((est) => claveEstadoAllianz(est) === key);
  if (exacto) return exacto;
  return ESTADOS_ALLIANZ_LEGACY[key] || raw;
}

export function esEstadoCerradoAllianz(estado) {
  return ESTADOS_CIERRE_ALLIANZ.has(homologarEstadoAllianz(estado));
}

export function esEstadoPendienteDocsAllianz(estado) {
  return homologarEstadoAllianz(estado) === ESTADO_ALLIANZ_PENDIENTE_DOCS;
}

/** Ya salió de CASO NUEVO: hay gestión. */
export function casoAtendidoAllianz(caso = {}) {
  return homologarEstadoAllianz(caso.estado) !== ESTADO_ALLIANZ_DEFAULT;
}

/** Visita cargada o el expediente ya superó la coordinación de inspección. */
export function casoInspeccionadoAllianz(caso = {}) {
  if (caso.fechaVisita || caso.fechaInspeccion) return true;
  const estado = homologarEstadoAllianz(caso.estado);
  const idx = ESTADOS_ALLIANZ.indexOf(estado);
  const idxInsp = ESTADOS_ALLIANZ.indexOf(ESTADO_ALLIANZ_INSPECCION_REALIZADA);
  return idx >= idxInsp;
}

export function diasEnEstadoAllianz(caso = {}) {
  const estado = homologarEstadoAllianz(caso.estado);
  const clave = FECHA_ACCION_POR_ESTADO_ALLIANZ[estado];
  const origen = caso[clave] || caso.updatedAt || caso.createdAt;
  if (!origen) return '';
  const d = new Date(origen);
  if (Number.isNaN(d.getTime())) return '';
  return String(Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)));
}

export function ultimaGestionAllianz(caso = {}) {
  const claves = [
    ...CAMPOS_FECHA_ACCION_ALLIANZ,
    'fechaAsignacion',
    'fechaVisita',
    'fechaLlamada',
    'fechaInspeccion',
    'fechaUltimoDocumento',
    'updatedAt',
  ];
  let max = null;
  for (const clave of claves) {
    if (!caso[clave]) continue;
    const d = new Date(caso[clave]);
    if (Number.isNaN(d.getTime())) continue;
    if (!max || d > max) max = d;
  }
  return max;
}

/** Mismos tipos de documento que Complex. */
export const TIPOS_IDENTIFICACION_ALLIANZ = [
  'CC',
  'CE',
  'NIT',
  'PASAPORTE',
  'PEP',
  'RC',
  'TI',
  'OTRO',
];

export const TIPOS_POLIZA_ALLIANZ = [
  'HOGAR',
  'HOGAR DEUDOR',
  'PYME',
  'MULTIRRIESGOS HOGAR',
  'MULTIRRIESGOS EMPRESARIAL',
  'NEGOCIO EMPRESARIAL',
];

const claveTipoPolizaAllianz = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const TIPOS_POLIZA_ALLIANZ_LEGACY = {
  HOMEOWNERS: 'HOGAR',
  'HOME OWNERS': 'HOGAR',
  HOME: 'HOGAR',
  'HOGAR DEUDORES': 'HOGAR DEUDOR',
  DEUDOR: 'HOGAR DEUDOR',
  DEUDORES: 'HOGAR DEUDOR',
  HIPOTECARIO: 'HOGAR DEUDOR',
  PYMES: 'PYME',
  'MULTIRRIESGO HOGAR': 'MULTIRRIESGOS HOGAR',
  'MULTI RIESGOS HOGAR': 'MULTIRRIESGOS HOGAR',
  'MULTI RIESGO HOGAR': 'MULTIRRIESGOS HOGAR',
  'MR HOGAR': 'MULTIRRIESGOS HOGAR',
  'MULTIRRIESGO EMPRESARIAL': 'MULTIRRIESGOS EMPRESARIAL',
  'MULTI RIESGOS EMPRESARIAL': 'MULTIRRIESGOS EMPRESARIAL',
  'MULTI RIESGO EMPRESARIAL': 'MULTIRRIESGOS EMPRESARIAL',
  'MR EMPRESARIAL': 'MULTIRRIESGOS EMPRESARIAL',
  NEGOCIO: 'NEGOCIO EMPRESARIAL',
  'NEGOCIOS EMPRESARIALES': 'NEGOCIO EMPRESARIAL',
};

function resolverTipoPolizaAllianz(valor) {
  const raw = String(valor || '').trim();
  if (!raw) return '';
  if (TIPOS_POLIZA_ALLIANZ.includes(raw)) return raw;
  const key = claveTipoPolizaAllianz(raw);
  if (!key) return '';
  const exacto = TIPOS_POLIZA_ALLIANZ.find((tipo) => claveTipoPolizaAllianz(tipo) === key);
  if (exacto) return exacto;
  if (TIPOS_POLIZA_ALLIANZ_LEGACY[key]) return TIPOS_POLIZA_ALLIANZ_LEGACY[key];
  if (key.includes('HOGAR') && key.includes('DEUDOR')) return 'HOGAR DEUDOR';
  if (key.includes('MULTIRRIESGO') && key.includes('HOGAR')) return 'MULTIRRIESGOS HOGAR';
  if (key.includes('MULTI RIESGO') && key.includes('HOGAR')) return 'MULTIRRIESGOS HOGAR';
  if (key.includes('MULTIRRIESGO') && (key.includes('EMPRESARIAL') || key.includes('EMPRESA'))) {
    return 'MULTIRRIESGOS EMPRESARIAL';
  }
  if (key.includes('MULTI RIESGO') && (key.includes('EMPRESARIAL') || key.includes('EMPRESA'))) {
    return 'MULTIRRIESGOS EMPRESARIAL';
  }
  if (key.includes('NEGOCIO')) return 'NEGOCIO EMPRESARIAL';
  if (key === 'HOGAR' || key === 'HOMEOWNERS' || key === 'HOME') return 'HOGAR';
  if (key === 'PYME' || key === 'PYMES' || /\bPYME/.test(key)) return 'PYME';
  return '';
}

export function homologarTipoPolizaAllianz(valor, detalle = '') {
  return resolverTipoPolizaAllianz(valor) || resolverTipoPolizaAllianz(detalle) || String(valor || '').trim();
}

export const esTipoPolizaOtroAllianz = (valor) =>
  /^OTROS?$/.test(String(valor || '').trim().toUpperCase());

export const etiquetaTipoPolizaAllianz = (caso = {}) => {
  const tipo = homologarTipoPolizaAllianz(caso.tipoPoliza, caso.tipoPolizaOtro);
  const detalle = String(caso.tipoPolizaOtro || '').trim();
  if (esTipoPolizaOtroAllianz(tipo) && detalle) return detalle;
  return tipo;
};

/** Tomadores base del consolidado Allianz (columna TOMADOR). */
export const TOMADORES_ALLIANZ_DEFAULT = [
  'BANCO AV VILLAS',
  'BANCO BOGOTA',
  'BANCO OCCIDENTE',
  'BANCO POPULAR',
];

export const ETIQUETAS_ARCHIVO_ALLIANZ = [
  'GENERAL',
  'POLIZA',
  'INSPECCION',
  'LIQUIDACION',
  'INFORME',
  'INFORME_PRELIMINAR',
  'INFORME_FINAL',
  'INFORME_UNICO',
  'FOTOS',
  'COTIZACION',
  /** Manual CAT — evidencia fotográfica/documental */
  'FOTO_GENERAL',
  'FOTO_DANOS',
  'EQUIPOS_CRITICOS',
  'MITIGACION',
  'NO_ACCESO',
  'OTRO',
];

export const ETIQUETAS_ARCHIVO_ALLIANZ_LISTADO = [
  'GENERAL',
  'POLIZA',
  'LIQUIDACION',
  'INFORME',
  'INFORME_PRELIMINAR',
  'INFORME_FINAL',
  'INFORME_UNICO',
  'FOTOS',
  'COTIZACION',
  'OTRO',
];

/** Manual CAT Allianz: severidad 1–6 (reporte de exposición). Textos exactos del Word. */
export const SEVERIDAD_CAT_ALLIANZ = [
  { valor: 1, label: 'Nivel 1 — Daños menores', descripcion: 'Daños menores' },
  { valor: 2, label: 'Nivel 2 — Fisuras en mampostería', descripcion: 'Fisuras en mampostería' },
  {
    valor: 3,
    label: 'Nivel 3 — Caída de muros y otros elementos no estructurales',
    descripcion: 'Caída de muros y otros elementos no estructurales',
  },
  {
    valor: 4,
    label: 'Nivel 4 — Fisuras en elementos estructurales',
    descripcion: 'Fisuras en elementos estructurales',
  },
  { valor: 5, label: 'Nivel 5 — Colapsos parciales', descripcion: 'Colapsos parciales' },
  { valor: 6, label: 'Nivel 6 — Colapso total', descripcion: 'Colapso total' },
];

export const SEVERIDAD_NIVEL_VACIO = Object.freeze({
  aplica: null, // 'SI' | 'NO' | null
  observacion: '',
});

export const SEVERIDAD_CAT_NIVELES_VACIA = {
  1: { ...SEVERIDAD_NIVEL_VACIO },
  2: { ...SEVERIDAD_NIVEL_VACIO },
  3: { ...SEVERIDAD_NIVEL_VACIO },
  4: { ...SEVERIDAD_NIVEL_VACIO },
  5: { ...SEVERIDAD_NIVEL_VACIO },
  6: { ...SEVERIDAD_NIVEL_VACIO },
};

export const normalizeSeveridadNivelItem = (raw) => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const aplica =
      raw.aplica === 'SI' || raw.aplica === 'NO'
        ? raw.aplica
        : raw.aplica === true
          ? 'SI'
          : raw.aplica === false
            ? 'NO'
            : null;
    return {
      aplica,
      observacion: raw.observacion != null ? String(raw.observacion) : '',
    };
  }
  if (raw === true) return { aplica: 'SI', observacion: '' };
  if (raw === false) return { aplica: 'NO', observacion: '' };
  return { aplica: null, observacion: '' };
};

/**
 * Normaliza mapa de niveles 1–6.
 * Acepta {1:…}, {nivel1:…} o arreglo (Mongo a veces convierte claves numéricas en array).
 * Si solo existe severidadCat numérico legacy, marca ese nivel como APLICA.
 */
export const normalizeSeveridadCatNiveles = (raw = {}, severidadCatLegacy = null) => {
  const out = {};
  for (let n = 1; n <= 6; n += 1) {
    let item;
    if (Array.isArray(raw)) {
      const porNivel = raw.find((it) => Number(it?.nivel) === n);
      item = porNivel ?? raw[n] ?? raw[n - 1];
    } else if (raw && typeof raw === 'object') {
      item = raw[`nivel${n}`] ?? raw[String(n)] ?? raw[n];
    }
    out[String(n)] = normalizeSeveridadNivelItem(item);
  }
  const legacy = Number(severidadCatLegacy);
  const hayAlguno = Object.values(out).some((v) => v.aplica === 'SI' || v.aplica === 'NO');
  if (!hayAlguno && Number.isFinite(legacy) && legacy >= 1 && legacy <= 6) {
    out[String(legacy)] = { aplica: 'SI', observacion: '' };
  }
  return out;
};

/** Nivel más alto marcado como APLICA (para reportes / Excel). */
export const derivarSeveridadCatDesdeNiveles = (niveles = {}) => {
  const norm = normalizeSeveridadCatNiveles(niveles);
  let max = null;
  for (let n = 1; n <= 6; n += 1) {
    if (norm[String(n)]?.aplica === 'SI') max = n;
  }
  return max;
};

/**
 * Checklist CAT lleno: los 6 niveles de severidad tienen APLICA o NO APLICA.
 * Se marca al guardar la inspección CAT (lo no marcado queda NO APLICA).
 */
export const esChecklistCatLleno = (caso = {}) => {
  const niveles = normalizeSeveridadCatNiveles(caso?.severidadCatNiveles, caso?.severidadCat);
  for (let n = 1; n <= 6; n += 1) {
    const aplica = niveles[String(n)]?.aplica;
    if (aplica !== 'SI' && aplica !== 'NO' && aplica !== true && aplica !== false) {
      return false;
    }
  }
  return true;
};

/**
 * Al guardar el formato CAT: lo no marcado como APLICA queda NO APLICA.
 */
export const finalizarSeveridadCatNiveles = (raw = {}, severidadCatLegacy = null) => {
  const norm = normalizeSeveridadCatNiveles(raw, severidadCatLegacy);
  const out = {};
  for (let n = 1; n <= 6; n += 1) {
    const key = String(n);
    const item = norm[key] || { aplica: null, observacion: '' };
    out[key] = {
      ...item,
      aplica: item.aplica === 'SI' ? 'SI' : 'NO',
    };
  }
  return out;
};

export const ACCESO_PREDIO_ALLIANZ = ['SI', 'NO', 'PARCIAL'];

/** Ítem de evidencia CAT: aplica + observación por sección. */
export const EVIDENCIA_ITEM_VACIO = Object.freeze({
  aplica: null, // 'SI' | 'NO' | null
  observacion: '',
});

/** Checklist evidencia — columnas del Manual CAT (Evidencia | Mínimo | Cuándo aplica). */
export const EVIDENCIA_CAT_KEYS = [
  {
    key: 'fotoGeneral',
    etiqueta: 'FOTO_GENERAL',
    obligatorio: 'siempre',
    evidencia: 'Foto general',
    minimo: 'Fachada, acceso, perímetro y contexto del predio.',
    cuando: 'Siempre',
  },
  {
    key: 'fotoDanos',
    etiqueta: 'FOTO_DANOS',
    obligatorio: 'siHayDano',
    evidencia: 'Foto de daños',
    minimo: 'Daño principal, varias perspectivas y escala.',
    cuando: 'Cuando exista daño',
  },
  {
    key: 'equiposCriticos',
    etiqueta: 'EQUIPOS_CRITICOS',
    obligatorio: 'siEquipos',
    evidencia: 'Equipos críticos',
    minimo: 'Placa, marca visible, ubicación, daño y conexión al proceso.',
    cuando: 'Si hay equipos afectados',
  },
  {
    key: 'mitigacion',
    etiqueta: 'MITIGACION',
    obligatorio: 'siExiste',
    evidencia: 'Mitigación',
    minimo: 'Bombeo, secado, apuntalamiento, protección, salvamento o custodia.',
    cuando: 'Si existe',
  },
  {
    key: 'noAcceso',
    etiqueta: 'NO_ACCESO',
    obligatorio: 'siNoIngresa',
    evidencia: 'No acceso',
    minimo: 'Evidencia de bloqueo, restricción, autoridad o imposibilidad de ingreso.',
    cuando: 'Si no se ingresa',
  },
];

/** Normaliza legacy boolean → { aplica, observacion }. */
export const normalizeEvidenciaItem = (raw) => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const aplica =
      raw.aplica === 'SI' || raw.aplica === 'NO'
        ? raw.aplica
        : raw.aplica === true
          ? 'SI'
          : raw.aplica === false
            ? 'NO'
            : null;
    return {
      aplica,
      observacion: raw.observacion != null ? String(raw.observacion) : '',
    };
  }
  if (raw === true) return { aplica: 'SI', observacion: '' };
  if (raw === false) return { aplica: 'NO', observacion: '' };
  return { aplica: null, observacion: '' };
};

export const EVIDENCIA_CAT_VACIA = {
  fotoGeneral: { ...EVIDENCIA_ITEM_VACIO },
  fotoDanos: { ...EVIDENCIA_ITEM_VACIO },
  equiposCriticos: { ...EVIDENCIA_ITEM_VACIO },
  mitigacion: { ...EVIDENCIA_ITEM_VACIO },
  noAcceso: { ...EVIDENCIA_ITEM_VACIO },
};

export const normalizeEvidenciaCat = (raw = {}) => {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const { key } of EVIDENCIA_CAT_KEYS) {
    out[key] = normalizeEvidenciaItem(src[key]);
  }
  return out;
};

/** true si la sección aplica (para exports / prefill). */
export const evidenciaAplicaSi = (item) => normalizeEvidenciaItem(item).aplica === 'SI';

export const DISCLAIMER_CAT_ALLIANZ =
  'Documento operativo para clasificar severidad, completar la base de exposición y registrar evidencia. No autoriza confirmar ni negar cobertura, prometer pagos ni actuar como vocero de Allianz. La severidad es preliminar y no constituye liquidación del siniestro.';

export const labelSeveridadCat = (nivel) => {
  const n = Number(nivel);
  const found = SEVERIDAD_CAT_ALLIANZ.find((s) => s.valor === n);
  return found ? found.label : nivel != null && nivel !== '' ? `Nivel ${nivel}` : '—';
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

/** Cifra corta para frisos: $ 5.105 MM en lugar de $ 5.105.100.000. */
export const formatCurrencyCompact = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return formatCurrency(0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) {
    const millones = abs / 1_000_000;
    const cifra =
      millones >= 100
        ? Math.round(millones).toLocaleString('es-CO')
        : millones.toLocaleString('es-CO', { maximumFractionDigits: 1 });
    return `${sign}$ ${cifra} MM`;
  }
  return formatCurrency(n);
};

export const formatCurrencyMm = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return formatCurrencyCompact(n);
};

export const formatDate = (value) => {
  const date = crearFechaLocal(value);
  if (!date) return '';
  // ISO date-only: preservar calendario sin TZ
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, d] = value.trim().split('-');
    return `${d}/${m}/${y}`;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value.trim())) {
    const fechaPart = value.trim().slice(0, 10);
    const [y, m, d] = fechaPart.split('-');
    // Usar componentes UTC del mediodía guardado (backend guarda 12:00 local ≈ ISO con offset)
    // Preferir día civil en America/Bogota
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date(value));
      const yy = parts.find((p) => p.type === 'year')?.value;
      const mm = parts.find((p) => p.type === 'month')?.value;
      const dd = parts.find((p) => p.type === 'day')?.value;
      if (yy && mm && dd) return `${dd}/${mm}/${yy}`;
    } catch {
      return `${d}/${m}/${y}`;
    }
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
};

/** YYYY-MM-DD para inputs date */
export const formatDateIso = (value) => {
  const date = crearFechaLocal(value);
  if (!date) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    return value.trim().slice(0, 10);
  }
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fechaEnRango = (fecha, desde, hasta) => {
  const iso = formatDateIso(fecha);
  if (!iso) return false;
  if (desde && iso < desde) return false;
  if (hasta && iso > hasta) return false;
  return true;
};

/** Valor del selector «Filtrar fechas por» para inspección coordinada. */
export const CAMPO_FILTRO_FECHA_INSPECCION_COORDINADA = 'fechaCoordinandoInspeccion';

/**
 * Fecha contra la que aplican Desde/Hasta.
 * Si el campo es inspección coordinada, no hay fallback a ingreso.
 */
export function valorFechaFiltroAllianz(caso = {}, campo = '', fallback) {
  const clave = String(campo || '').trim();
  if (clave) {
    const directo = caso[clave];
    if (directo != null && directo !== '') return directo;
    if (clave === CAMPO_FILTRO_FECHA_INSPECCION_COORDINADA) return null;
    return null;
  }
  if (typeof fallback === 'function') return fallback(caso);
  if (fallback !== undefined) return fallback;
  return caso.fechaCasoNuevo || caso.fechaSiniestro || caso.createdAt;
}

export const OPCIONES_FECHA_FILTRO_ALLIANZ_CAT = [
  { value: 'fechaSiniestro', labelKey: 'allianz.fields.fechaSiniestro' },
  { value: 'fechaCasoNuevo', labelKey: 'allianz.fields.fechaCasoNuevo' },
  { value: 'fechaAsignacion', labelKey: 'allianz.fields.fechaAsignacion' },
  { value: CAMPO_FILTRO_FECHA_INSPECCION_COORDINADA, labelKey: 'allianz.fields.fechaCoordinandoInspeccion' },
  { value: 'fechaInspeccion', labelKey: 'allianz.fields.fechaInspeccion' },
  { value: 'fechaLlamada', labelKey: 'allianz.fields.fechaLlamada' },
  { value: 'fechaLiquidado', labelKey: 'allianz.fields.fechaLiquidado' },
  { value: 'fechaInicioPoliza', labelKey: 'allianz.fields.fechaInicioPoliza' },
  { value: 'fechaFinPoliza', labelKey: 'allianz.fields.fechaFinPoliza' },
  { value: 'createdAt', labelKey: 'allianz.report.dateCreated' },
];

export const OPCIONES_FECHA_FILTRO_ALLIANZ_LISTADO = [
  { value: 'createdAt', labelKey: 'allianz.report.dateCreated' },
  { value: 'fechaCasoNuevo', labelKey: 'allianz.fields.fechaCasoNuevo' },
  { value: 'fechaAsignacion', labelKey: 'allianz.fields.fechaAsignacion' },
  { value: CAMPO_FILTRO_FECHA_INSPECCION_COORDINADA, labelKey: 'allianz.fields.fechaCoordinandoInspeccion' },
  { value: 'fechaVisita', labelKey: 'allianz.fields.fechaVisita' },
  { value: 'fechaInspeccionRealizada', labelKey: 'allianz.fields.fechaInspeccionRealizada' },
  { value: 'fechaAnalisisCaso', labelKey: 'allianz.fields.fechaAnalisisCaso' },
  { value: 'fechaSolicitudDocumento', labelKey: 'allianz.fields.fechaSolicitudDocumento' },
  { value: 'fechaRecepcionDocumento', labelKey: 'allianz.fields.fechaRecepcionDocumento' },
  { value: 'fechaObjecion', labelKey: 'allianz.fields.fechaObjecion' },
  { value: 'fechaAutorizacionAnalista', labelKey: 'allianz.fields.fechaAutorizacionAnalista' },
  { value: 'fechaPresentacionCifras', labelKey: 'allianz.fields.fechaPresentacionCifras' },
  { value: 'fechaCasoParaPago', labelKey: 'allianz.fields.fechaCasoParaPago' },
  { value: 'fechaEnProcesoFacturacion', labelKey: 'allianz.fields.fechaEnProcesoFacturacion' },
  { value: 'fechaFacturado', labelKey: 'allianz.fields.fechaFacturado' },
  { value: 'fechaCasoPagado', labelKey: 'allianz.fields.fechaCasoPagado' },
];

export const coincideFiltroContieneAllianz = (valorCaso, filtro) => {
  if (!filtro) return true;
  return normTexto(valorCaso).includes(normTexto(filtro));
};

export const normTexto = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

export const homologarCiudadAllianz = (valor) =>
  resolverUbicacionCatastrofico(valor).ciudad || homologarCiudadCatastrofico(valor);

export const resolverUbicacionAllianz = resolverUbicacionCatastrofico;

export function resolverDepartamentoAllianz(caso = {}) {
  const directo = String(caso?.departamento || '').trim();
  if (directo && directo !== '—' && directo !== '-') return directo;
  return resolverUbicacionAllianz(caso.ciudad, caso.departamento).departamento || '';
}

export const buildOpcionesFiltro = (casos = [], campo) => {
  const porNorm = new Map();
  for (const item of casos) {
    const raw = item?.[campo];
    if (!raw) continue;
    const label =
      campo === 'ciudad' ? homologarCiudadAllianz(raw) || String(raw).trim() : String(raw).trim();
    const norm = normTexto(label);
    if (!norm) continue;
    if (!porNorm.has(norm)) {
      porNorm.set(norm, { value: norm, label });
    }
  }
  return [...porNorm.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
};

export const coincideFiltroTexto = (valorCaso, filtro) => {
  if (!filtro) return true;
  return normTexto(valorCaso) === normTexto(filtro);
};

export const coincideFiltroCiudadAllianz = (valorCaso, filtro) => {
  if (!filtro) return true;
  return coincideFiltroTexto(homologarCiudadAllianz(valorCaso), filtro);
};

/** Fecha ISO (YYYY-MM-DD) para inputs date desde valores de la API */
export const fechaParaInput = (value) => formatDateIso(value);

export const FORM_VACIO_ALLIANZ = {
  siniestro: '',
  zc: '',
  identificacion: '',
  tipoIdentificacion: '',
  asegurado: '',
  intermediario: '',
  correoIntermediario: '',
  telefonoIntermediario: '',
  contactoIntermediario: '',
  telefonoAsegurado: '',
  correoAsegurado: '',
  contactoAsegurado: '',
  observaciones: '',
  tomador: '',
  ajustadorLider: '',
  ajustador: '',
  inspector: '',
  fechaAsignacion: '',
  fechaVisita: '',
  modalidadAtencion: '',
  fechaCasoNuevo: '',
  fechaPrimerContacto: '',
  fechaCoordinandoInspeccion: '',
  horaInicioCoordinacion: '',
  horaFinCoordinacion: '',
  fechaInspeccionRealizada: '',
  fechaAnalisisCaso: '',
  fechaSolicitudDocumento: '',
  fechaRecepcionDocumento: '',
  fechaObjecion: '',
  fechaObjetado: '',
  fechaAutorizacionAnalista: '',
  fechaPresentacionCifras: '',
  fechaCasoParaPago: '',
  fechaEnProcesoFacturacion: '',
  fechaFacturado: '',
  fechaCasoPagado: '',
  fechaDesistido: '',
  fechaAnulado: '',
  documentoFaltante: '',
  observacionPendienteDocumento: '',
  motivoObjecion: '',
  responsableAporteDocumento: '',
  numeroPoliza: '',
  tipoPoliza: '',
  tipoPolizaOtro: '',
  causa: '',
  direccionPredio: '',
  numeroCredito: '',
  informacionContacto: '',
  correo: '',
  celular: '',
  canalRadicacion: '',
  ciudad: '',
  departamento: '',
  fechaSiniestro: '',
  fechaInicioPoliza: '',
  fechaFinPoliza: '',
  valorAseguradoInmueble: '',
  valorAseguradoContenidos: '',
  cobertura: '',
  estadoPagoPrimas: '',
  valorReservaPreventivaPromedio: '',
  valorComercialInmueble: '',
  reserva: '',
  observacionReserva: '',
  valorReclamado: '',
  valorLiquidado: '',
  fechaLlamada: '',
  observacionLlamada: '',
  fechaInspeccion: '',
  fechaUltimoDocumento: '',
  fechaLiquidado: '',
  fechaAceptacionLiquidacion: '',
  fechaEnvioAseguradora: '',
  estado: 'CASO NUEVO',
  riskId: '',
  distanciaEpicentroKm: '',
  tipoNegocioHomologado: '',
  catUbicacionReferencia: '',
  addressNumber: '',
  direccionInspeccionSugerida: '',
  linkGoogleMaps: '',
  grupoInspeccion: '',
  afectacion: '',
  gradoAfectacion: '',
  lucroCesante: '',
  severidadCat: '',
  severidadCatNiveles: { ...SEVERIDAD_CAT_NIVELES_VACIA },
  accesoPredio: '',
  observacionesCat: '',
  evidenciaCat: { ...EVIDENCIA_CAT_VACIA },
  control_horas: null,
  historialDocs: [],
  fecha_control_horas: '',
  fecha_envio_control_horas: '',
  fecha_recibido_control_horas: '',
  fecha_seguimiento_envio_control_horas: '',
  observacion_seguimiento_envio_control_horas: '',
  adjunto_control_horas: '',
  adjunto_evidencia: '',
  adjunto_seguimiento_envio_control_horas: '',
  adjunto_factura: '',
  numero_factura: '',
  valor_servicio: '',
  valor_gastos: '',
  fecha_factura: '',
  fecha_ultima_revision: '',
  observacion_compromisos: '',
};

export const TIPOS_NEGOCIO_HOMOLOGADO_ALLIANZ = [
  'Lider Allianz 100%',
  'coaseguro aceptado',
  'coaseguro cedido',
];

/** Afectación / Lucro cesante parametrizados */
export const OPCIONES_SI_NO_ALLIANZ = ['SI', 'NO'];

/** Grado de afectación (1–6), independiente de la severidad CAT del desprendible */
export const GRADOS_AFECTACION_ALLIANZ = ['1', '2', '3', '4', '5', '6'];

export const normalizarSiNoAllianz = (raw) => {
  const n = normTexto(raw);
  if (!n) return '';
  if (['SI', 'S', 'YES', 'TRUE', '1', 'APLICA'].includes(n)) return 'SI';
  if (['NO', 'N', 'FALSE', '0', 'NO APLICA', 'NA', 'N/A'].includes(n)) return 'NO';
  return String(raw ?? '').trim();
};

export const normalizarGradoAfectacionAllianz = (raw) => {
  if (raw === '' || raw == null) return '';
  const n = Number(String(raw).trim().replace(',', '.'));
  if (Number.isFinite(n) && n >= 1 && n <= 6) return String(Math.round(n));
  return String(raw).trim();
};

export const CAMPOS_FECHA_Allianz = [
  'fechaSiniestro',
  'fechaInicioPoliza',
  'fechaFinPoliza',
  'fechaLlamada',
  'fechaInspeccion',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
  'fechaAsignacion',
  'fechaVisita',
  ...CAMPOS_FECHA_ACCION_ALLIANZ,
];

export const CAMPOS_NUMERICOS_ALLIANZ = [
  'valorAseguradoInmueble',
  'valorAseguradoContenidos',
  'valorReservaPreventivaPromedio',
  'valorComercialInmueble',
  'reserva',
  'valorReclamado',
  'valorLiquidado',
];

/** Decimales libres (distancia epicentro, etc.) — no usan formato de miles */
export const CAMPOS_DECIMAL_ALLIANZ = ['distanciaEpicentroKm'];

/** Formatea entero con puntos de miles (es-CO): 30000000 → 30.000.000 */
export const formatMiles = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const digitos = String(valor).replace(/[^\d]/g, '');
  if (!digitos) return '';
  const sinCeros = digitos.replace(/^0+(?=\d)/, '');
  return sinCeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/** Al escribir: solo dígitos + puntos de miles */
export const formatMilesInput = (valor) => formatMiles(valor);

export const construirFormDesdecasoAllianz = (caso = {}) => {
  const base = {
    ...FORM_VACIO_ALLIANZ,
    ...Object.fromEntries(
      Object.keys(FORM_VACIO_ALLIANZ)
        .filter(
          (clave) =>
            clave !== 'evidenciaCat' &&
            clave !== 'severidadCatNiveles' &&
            clave !== 'control_horas' &&
            clave !== 'historialDocs'
        )
        .map((clave) => {
          const valor = caso[clave];
          if (valor === null || valor === undefined) return [clave, ''];
          if (CAMPOS_FECHA_Allianz.includes(clave)) return [clave, fechaParaInput(valor)];
          if (CAMPOS_NUMERICOS_ALLIANZ.includes(clave)) return [clave, formatMiles(valor)];
          if (CAMPOS_DECIMAL_ALLIANZ.includes(clave)) {
            return [clave, valor === 0 || valor ? String(valor) : ''];
          }
          if (clave === 'severidadCat') return [clave, valor === 0 || valor ? String(valor) : ''];
          if (clave === 'afectacion' || clave === 'lucroCesante') {
            return [clave, normalizarSiNoAllianz(valor)];
          }
          if (clave === 'gradoAfectacion') {
            return [clave, normalizarGradoAfectacionAllianz(valor)];
          }
          return [clave, String(valor)];
        })
    ),
  };
  const ev = caso.evidenciaCat && typeof caso.evidenciaCat === 'object' ? caso.evidenciaCat : {};
  base.evidenciaCat = normalizeEvidenciaCat(ev);
  base.severidadCatNiveles = normalizeSeveridadCatNiveles(
    caso.severidadCatNiveles,
    caso.severidadCat
  );
  if (!base.intermediario && !base.correoIntermediario && !base.telefonoIntermediario) {
    const partes = String(base.contactoIntermediario || '')
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    for (const parte of partes) {
      if (parte.includes('@') && !base.correoIntermediario) base.correoIntermediario = parte;
      else if (parte.replace(/\D/g, '').length >= 7 && !base.telefonoIntermediario) {
        base.telefonoIntermediario = parte;
      } else if (!base.intermediario) base.intermediario = parte;
    }
  }
  if (!base.telefonoAsegurado && !base.correoAsegurado) {
    const texto = String(base.contactoAsegurado || '').trim();
    const email = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (email) base.correoAsegurado = email[0];
    const resto = email ? texto.replace(email[0], ' ').replace(/[|,;]/g, ' ').trim() : texto;
    if (resto.replace(/\D/g, '').length >= 7) base.telefonoAsegurado = resto;
  }
  if (base.tipoPoliza || base.tipoPolizaOtro) {
    base.tipoPoliza = homologarTipoPolizaAllianz(base.tipoPoliza, base.tipoPolizaOtro);
  }
  base.estado = homologarEstadoAllianz(base.estado);
  const ub = resolverUbicacionAllianz(base.ciudad, base.departamento);
  if (ub.ciudad) base.ciudad = ub.ciudad;
  if (ub.departamento) base.departamento = ub.departamento;
  return hidratarCamposFacturacion(base, caso);
};

const TIPOS_INFORME_REPORTE_ALLIANZ = new Set(['unico', 'final', 'preliminar']);

function claveTipoInformeReporteAllianz(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function nArchivosCasoAllianz(caso = {}) {
  if (Number.isFinite(Number(caso.nArchivos))) return Number(caso.nArchivos);
  return Array.isArray(caso.archivos) ? caso.archivos.length : 0;
}

/** Tipo de informe guardado (único / final / preliminar). Vacío si no hay informe. */
export function tipoInformeCasoAllianz(caso = {}) {
  const directo = claveTipoInformeReporteAllianz(caso.tipoInforme);
  if (TIPOS_INFORME_REPORTE_ALLIANZ.has(directo)) return directo;
  const inf = caso.informeUnico;
  if (!inf || typeof inf !== 'object') {
    if (caso.tieneInforme === true || caso.tieneInforme === 'true' || caso.tieneInforme === 1) {
      return 'unico';
    }
    return '';
  }
  const clave = claveTipoInformeReporteAllianz(inf.tipoInforme);
  if (TIPOS_INFORME_REPORTE_ALLIANZ.has(clave)) return clave;
  return Object.keys(inf).length ? 'unico' : '';
}

export function casoAllianzTieneLiquidador(caso = {}) {
  return Boolean(caso?.tieneLiquidador || (caso?.liquidador && typeof caso.liquidador === 'object'));
}

export function casoAllianzTieneInforme(caso = {}) {
  return Boolean(tipoInformeCasoAllianz(caso));
}

export function clavesDocumentosAllianz(caso = {}) {
  const claves = [];
  const tipo = tipoInformeCasoAllianz(caso);
  if (tipo) claves.push(tipo);
  if (casoAllianzTieneLiquidador(caso)) claves.push('liquidador');
  return claves;
}

export function casoAllianzEnReporteInformes(caso = {}) {
  return clavesDocumentosAllianz(caso).length > 0;
}

export function casoAllianzCoincideFiltroDocumento(caso, filtro) {
  if (!filtro) return true;
  return clavesDocumentosAllianz(caso).includes(filtro);
}

export function etiquetaDocumentoAllianz(clave) {
  if (clave === 'preliminar') return 'Informe preliminar';
  if (clave === 'final') return 'Informe final';
  if (clave === 'unico') return 'Informe único';
  if (clave === 'liquidador') return 'Liquidador';
  return '';
}

export function textoDocumentosAllianz(caso = {}) {
  return clavesDocumentosAllianz(caso)
    .map(etiquetaDocumentoAllianz)
    .filter(Boolean)
    .join(', ');
}
