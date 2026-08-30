import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const ALFA_REPORTE_PAGE_SIZE = 25;

/**
 * Catálogo único de estado (barra Alfa).
 * Une lineamiento correo + cierre de liquidación.
 */
export const ESTADOS_ALFA = [
  'Sin contactar',
  'Contactado y programado',
  'Inspeccionado',
  'Sin respuesta',
  'Solicitud de documentos',
  'LIQUIDADO',
  'ENVIADO ASEGURADORA',
  'CERRADO',
];

/** @deprecated Usar ESTADOS_ALFA (un solo eje). */
export const ESTADOS_GESTION_ALFA = [
  'Sin contactar',
  'Contactado y programado',
  'Inspeccionado',
  'Sin respuesta',
  'Solicitud de documentos',
];

export const GRUPOS_BARRA_ESTADOS_ALFA = [
  {
    id: 'gestion',
    label: 'Gestión',
    estados: [
      'Sin contactar',
      'Contactado y programado',
      'Inspeccionado',
      'Sin respuesta',
      'Solicitud de documentos',
    ],
  },
  {
    id: 'cierre',
    label: 'Cierre',
    estados: ['LIQUIDADO', 'ENVIADO ASEGURADORA', 'CERRADO'],
  },
];

export const ESTADOS_REQUIEREN_OBS_ALFA = new Set([
  'Sin respuesta',
  'Solicitud de documentos',
]);

/** @deprecated Alias de ESTADOS_REQUIEREN_OBS_ALFA */
export const ESTADOS_GESTION_REQUIEREN_OBS = ESTADOS_REQUIEREN_OBS_ALFA;

const ESTADOS_ALFA_SET = new Set(ESTADOS_ALFA);

const LEGACY_ESTADO_A_UNIFICADO = {
  PENDIENTE: 'Sin contactar',
  'EN TRAMITE': 'Contactado y programado',
  'EN TRÁMITE': 'Contactado y programado',
  'EN INSPECCION': 'Contactado y programado',
  'EN INSPECCIÓN': 'Contactado y programado',
  DOCUMENTACION: 'Solicitud de documentos',
  DOCUMENTACIÓN: 'Solicitud de documentos',
  LIQUIDADO: 'LIQUIDADO',
  'ENVIADO ASEGURADORA': 'ENVIADO ASEGURADORA',
  CERRADO: 'CERRADO',
};

function normKeyEstado(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/** Homologa valores legacy / duales al catálogo único. */
export function homologarEstadoAlfa(valor, extras = {}) {
  const raw = String(valor || '').trim();
  if (ESTADOS_ALFA_SET.has(raw)) return raw;

  const key = normKeyEstado(raw);
  if (key === 'EN INSPECCION' || key === 'EN TRAMITE') {
    if (extras.fechaInspeccion) return 'Inspeccionado';
    return LEGACY_ESTADO_A_UNIFICADO[raw] || LEGACY_ESTADO_A_UNIFICADO['EN INSPECCIÓN'] || 'Contactado y programado';
  }

  if (LEGACY_ESTADO_A_UNIFICADO[raw]) return LEGACY_ESTADO_A_UNIFICADO[raw];
  for (const [k, v] of Object.entries(LEGACY_ESTADO_A_UNIFICADO)) {
    if (normKeyEstado(k) === key) return v;
  }

  const eg = String(extras.estadoGestion || '').trim();
  if (ESTADOS_ALFA_SET.has(eg)) return eg;

  return 'Sin contactar';
}

/**
 * Vista Excel AD (ESTADO GESTION): solo los 5 del correo.
 * En cierre de liquidación se reporta Inspeccionado.
 */
export function estadoGestionDesdeEstadoAlfa(estado) {
  const e = homologarEstadoAlfa(estado);
  if (isAlfaEstadoDefinido(e)) return 'Inspeccionado';
  if (ESTADOS_GESTION_ALFA.includes(e)) return e;
  return 'Sin contactar';
}

/** Plantilla de comunicación cuando el reclamo queda bajo deducible. */
export const PLANTILLA_COMUNICACION_BAJO_DEDUCIBLE = `Asunto: Comunicación — reclamación bajo deducible

Estimado(a) asegurado(a):

Tras la inspección y evaluación del siniestro, el valor de la pérdida resulta inferior al deducible aplicable a la póliza, por lo cual no procede indemnización.

Quedamos atentos a cualquier inquietud y a la carga de la constancia de esta comunicación en el expediente (etiqueta COMUNICACION / OBJECION_DEDUCIBLE).

Cordialmente,
Equipo de ajuste Seguros Alfa`;

export function casoTieneEvidenciaComunicacionBajoDeducible(caso = {}) {
  const archivos = Array.isArray(caso.archivos) ? caso.archivos : [];
  return archivos.some((a) => {
    const et = String(a?.etiqueta || a?.tag || '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toUpperCase();
    return et.includes('COMUNICACION') || et.includes('OBJECION_DEDUCIBLE') || et.includes('FINIQUITO');
  });
}

/** Tomadores base del consolidado Alfa (columna TOMADOR). */
export const TOMADORES_ALFA_DEFAULT = [
  'BANCO AV VILLAS',
  'BANCO BOGOTA',
  'BANCO OCCIDENTE',
  'BANCO POPULAR',
  'BANCO W',
  'MI BANCO',
  'MUNDO MUJER',
];

export const ETIQUETAS_ARCHIVO_ALFA = [
  'GENERAL',
  'POLIZA',
  'INSPECCION',
  'LIQUIDACION',
  'INFORME',
  'FOTOS',
  'COMUNICACION',
  'SOLICITUD_DOCUMENTOS',
  'DESISTIMIENTO',
  'OBJECION_DEDUCIBLE',
  'FINIQUITO',
  'COTIZACION',
  'OTRO',
];

/** SLA: máx. 2 días hábiles calendario tras inspección sin actualizar docs/estado. */
export const SLA_DIAS_POST_INSPECCION_ALFA = 2;

export function isAlfaEstadoDefinido(estado) {
  const n = String(estado || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
  return n.includes('LIQUIDADO') || n.includes('ENVIADO') || n === 'CERRADO';
}

export function casoAlfaVenceSla2Dias(caso = {}, ahora = new Date()) {
  if (!caso.fechaInspeccion) return false;
  const estado = homologarEstadoAlfa(caso.estado, caso);
  if (isAlfaEstadoDefinido(estado)) return false;
  const fi = new Date(caso.fechaInspeccion);
  if (Number.isNaN(fi.getTime())) return false;
  const limite = new Date(fi.getTime() + SLA_DIAS_POST_INSPECCION_ALFA * 86400000);
  const tieneDoc =
    caso.fechaUltimoDocumento ||
    (Array.isArray(caso.archivos) && caso.archivos.length > 0);
  const gestionOk = ['Inspeccionado', 'Solicitud de documentos'].includes(estado);
  if (tieneDoc && gestionOk) return false;
  return ahora.getTime() > limite.getTime();
}

export function contarKpisGestionAlfa(casos = []) {
  const base = {
    sinContactar: 0,
    contactadoProgramado: 0,
    inspeccionado: 0,
    solicitudDocumentos: 0,
    sinRespuesta: 0,
    definidos: 0,
    slaVencido: 0,
    fueraDeZona: 0,
  };
  for (const c of casos) {
    const g = homologarEstadoAlfa(c.estado, c);
    if (g === 'Sin contactar') base.sinContactar += 1;
    else if (g === 'Contactado y programado') base.contactadoProgramado += 1;
    else if (g === 'Inspeccionado') base.inspeccionado += 1;
    else if (g === 'Solicitud de documentos') base.solicitudDocumentos += 1;
    else if (g === 'Sin respuesta') base.sinRespuesta += 1;
    if (isAlfaEstadoDefinido(g)) base.definidos += 1;
    if (casoAlfaVenceSla2Dias(c)) base.slaVencido += 1;
    if (c.fueraDeZona) base.fueraDeZona += 1;
  }
  return base;
}

/** Fecha de llamada con valor usable (no vacío / no fecha inválida). */
export function casoAlfaTieneFechaLlamada(caso = {}) {
  const v = caso?.fechaLlamada;
  if (v == null || v === '') return false;
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  const s = String(v).trim();
  if (!s || s === 'Invalid Date' || s === 'null' || s === 'undefined') return false;
  return true;
}

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

export const normTexto = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

export const buildOpcionesFiltro = (casos = [], campo) => {
  const porNorm = new Map();
  for (const item of casos) {
    const raw = item?.[campo];
    if (!raw) continue;
    const norm = normTexto(raw);
    if (!norm) continue;
    if (!porNorm.has(norm)) {
      porNorm.set(norm, { value: norm, label: String(raw).trim() });
    }
  }
  return [...porNorm.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
};

export const coincideFiltroTexto = (valorCaso, filtro) => {
  if (!filtro) return true;
  return normTexto(valorCaso) === normTexto(filtro);
};

/** Fecha ISO (YYYY-MM-DD) para inputs date desde valores de la API */
export const fechaParaInput = (value) => formatDateIso(value);

export const FORM_VACIO_ALFA = {
  siniestro: '',
  identificacion: '',
  asegurado: '',
  tomador: '',
  ajustadorLider: '',
  ajustador: '',
  inspector: '',
  numeroPoliza: '',
  direccionPredio: '',
  numeroCredito: '',
  informacionContacto: '',
  correo: '',
  celular: '',
  canalRadicacion: '',
  ciudad: '',
  departamento: '',
  fechaSiniestro: '',
  fechaAviso: '',
  fechaInicioPoliza: '',
  fechaFinPoliza: '',
  valorAseguradoSid: '',
  valorAseguradoInmueble: '',
  valorAseguradoContenidos: '',
  cobertura: '',
  estadoPagoPrimas: '',
  valorReservaPreventivaPromedio: '',
  valorComercialInmueble: '',
  reserva: '',
  valorReclamado: '',
  valorLiquidado: '',
  fechaLlamada: '',
  observacionLlamada: '',
  fechaInspeccion: '',
  fechaUltimoDocumento: '',
  fechaLiquidado: '',
  fechaAceptacionLiquidacion: '',
  fechaEnvioAseguradora: '',
  estado: 'Sin contactar',
  observacionesGestion: '',
  zonaAsignada: '',
  fueraDeZona: false,
  noAceptacionOferta: false,
  grupoReclamacion: '',
  fechaComunicacionBajoDeducible: '',
};

export const CAMPOS_FECHA_ALFA = [
  'fechaSiniestro',
  'fechaAviso',
  'fechaInicioPoliza',
  'fechaFinPoliza',
  'fechaLlamada',
  'fechaInspeccion',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
  'fechaComunicacionBajoDeducible',
];

export const CAMPOS_NUMERICOS_ALFA = [
  'valorAseguradoSid',
  'valorAseguradoInmueble',
  'valorAseguradoContenidos',
  'valorReservaPreventivaPromedio',
  'valorComercialInmueble',
  'reserva',
  'valorReclamado',
  'valorLiquidado',
];

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

export const construirFormDesdeCasoAlfa = (caso = {}) => {
  const base = {
    ...FORM_VACIO_ALFA,
    ...Object.fromEntries(
      Object.keys(FORM_VACIO_ALFA).map((clave) => {
        const valor = caso[clave];
        if (clave === 'fueraDeZona' || clave === 'noAceptacionOferta') return [clave, Boolean(valor)];
        if (valor === null || valor === undefined)
          return [clave, clave === 'fueraDeZona' || clave === 'noAceptacionOferta' ? false : ''];
        if (CAMPOS_FECHA_ALFA.includes(clave)) return [clave, fechaParaInput(valor)];
        if (CAMPOS_NUMERICOS_ALFA.includes(clave)) return [clave, formatMiles(valor)];
        return [clave, String(valor)];
      })
    ),
    fueraDeZona: Boolean(caso.fueraDeZona),
    noAceptacionOferta: Boolean(caso.noAceptacionOferta),
  };
  base.estado = homologarEstadoAlfa(caso.estado, {
    fechaInspeccion: caso.fechaInspeccion,
    estadoGestion: caso.estadoGestion,
  });
  return base;
};

/** Persistencia filtros reporte Alfa (sobrevive al entrar/salir de un caso). */
export const ALFA_REPORTE_FILTROS_STORAGE_KEY = 'alfa-reporte-filtros-v1';
/** v2: columnas por defecto incluyen valores (reserva, reclamado, liquidado…). */
export const ALFA_COLUMNAS_STORAGE_KEY = 'alfa-reporte-columnas-v2';

export const FILTROS_REPORTE_ALFA_DEFAULT = {
  busqueda: '',
  filtroCiudad: '',
  filtroDepto: '',
  filtroEstado: '',
  filtroSla: '',
  filtroAjustadorLider: '',
  filtroAjustador: '',
  filtroInspector: '',
  filtroTomador: '',
  filtroCobertura: '',
  filtroCanal: '',
  filtroEstadoPago: '',
  filtroZona: '',
  filtroDocumento: '',
  tipoFecha: 'fechaSiniestro',
  fechaInicio: '',
  fechaFin: '',
  soloMisCasos: false,
  pagina: 1,
};

export function cargarFiltrosReporteAlfa() {
  try {
    const raw = sessionStorage.getItem(ALFA_REPORTE_FILTROS_STORAGE_KEY);
    if (!raw) return { ...FILTROS_REPORTE_ALFA_DEFAULT };
    const parsed = JSON.parse(raw);
    const filtroEstadoRaw = String(parsed?.filtroEstado || '').trim();
    // Migrar valores legacy (PENDIENTE, EN TRÁMITE…) al catálogo unificado.
    const filtroEstado = filtroEstadoRaw
      ? ESTADOS_ALFA_SET.has(filtroEstadoRaw)
        ? filtroEstadoRaw
        : homologarEstadoAlfa(filtroEstadoRaw)
      : '';
    return {
      ...FILTROS_REPORTE_ALFA_DEFAULT,
      ...parsed,
      filtroEstado: ESTADOS_ALFA_SET.has(filtroEstado) ? filtroEstado : '',
      pagina: Math.max(1, Number(parsed?.pagina) || 1),
      soloMisCasos: Boolean(parsed?.soloMisCasos),
    };
  } catch {
    return { ...FILTROS_REPORTE_ALFA_DEFAULT };
  }
}

export function guardarFiltrosReporteAlfa(filtros = {}) {
  try {
    sessionStorage.setItem(
      ALFA_REPORTE_FILTROS_STORAGE_KEY,
      JSON.stringify({ ...FILTROS_REPORTE_ALFA_DEFAULT, ...filtros })
    );
  } catch {
    /* ignore */
  }
}

export function limpiarFiltrosReporteAlfaStorage() {
  try {
    sessionStorage.removeItem(ALFA_REPORTE_FILTROS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function cargarColumnasReporteAlfa(todasLasColumnas = []) {
  try {
    const raw = localStorage.getItem(ALFA_COLUMNAS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.claves) || !parsed.claves.length) return null;
    const ordenadas = parsed.claves
      .map((clave) => todasLasColumnas.find((c) => c.clave === clave))
      .filter(Boolean);
    return ordenadas.length > 0 ? ordenadas : null;
  } catch {
    return null;
  }
}

export function guardarColumnasReporteAlfa(columnas = []) {
  try {
    localStorage.setItem(
      ALFA_COLUMNAS_STORAGE_KEY,
      JSON.stringify({ claves: columnas.map((c) => c.clave) })
    );
  } catch {
    /* ignore */
  }
}
