import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const ALFA_REPORTE_PAGE_SIZE = 25;

export const ESTADOS_GESTION_ALFA = [
  'EN GESTIÓN',
  'CONTACTADO/PROGRAMADO',
  'LIQUIDADO',
  'INSPECCIONADO',
  'SIN RESPUESTA EFECTIVA',
];

export const ESTADOS_SINIESTRO_ALFA = [
  'PENDIENTE',
  'DESISTIDO',
  'CERRADO',
  'OBJETADO',
  'PROCESO DE PAGO',
  'PENDIENTE ACEPTACION CIFRAS',
];

/** Alias de compatibilidad (filtro de estado actual). */
export const ESTADOS_ALFA = ESTADOS_SINIESTRO_ALFA;

export const GRUPOS_BARRA_ESTADOS_ALFA = [
  {
    id: 'gestion',
    label: 'Estado gestión',
    tone: 'gestion',
    estados: [
      { id: 'EN GESTIÓN', label: 'En gestión' },
      { id: 'CONTACTADO/PROGRAMADO', label: 'Contactado/Programado' },
      { id: 'LIQUIDADO', label: 'Liquidado' },
      { id: 'INSPECCIONADO', label: 'Inspeccionado' },
      { id: 'SIN RESPUESTA EFECTIVA', label: 'Sin respuesta efectiva' },
    ],
  },
  {
    id: 'siniestro',
    label: 'Estado de siniestro',
    tone: 'cierre',
    estados: [
      { id: 'PENDIENTE', label: 'Pendiente' },
      { id: 'DESISTIDO', label: 'Desistido' },
      { id: 'CERRADO', label: 'Cerrado' },
      { id: 'OBJETADO', label: 'Objetado' },
      { id: 'PROCESO DE PAGO', label: 'Proceso de pago' },
      { id: 'PENDIENTE ACEPTACION CIFRAS', label: 'Pendiente aceptacion cifras' },
    ],
  },
];

/** Etiqueta de reporte (boletín / Excel) para estado de siniestro canonical. */
export function etiquetaEstadoAlfaReporte(estado, extras = {}) {
  return homologarEstadoSiniestroAlfa(estado, extras);
}

export const ESTADOS_REQUIEREN_OBS_ALFA = new Set([
  'SIN RESPUESTA EFECTIVA',
]);

/** Tipo de pérdida (casilla solicitada por la compañía). */
export const TIPOS_PERDIDA_ALFA = [
  { id: 'PARCIAL', label: 'Parcial' },
  { id: 'TOTAL', label: 'Total' },
];

export function homologarTipoPerdidaAlfa(valor) {
  const n = String(valor || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .trim();
  if (n === 'PARCIAL' || n.includes('PARCIAL')) return 'PARCIAL';
  if (n === 'TOTAL' || n.includes('TOTAL')) return 'TOTAL';
  return '';
}

/** @deprecated Alias de ESTADOS_REQUIEREN_OBS_ALFA */
export const ESTADOS_GESTION_REQUIEREN_OBS = ESTADOS_REQUIEREN_OBS_ALFA;

const ESTADOS_ALFA_SET = new Set(ESTADOS_ALFA);
const ESTADOS_GESTION_ALFA_SET = new Set(ESTADOS_GESTION_ALFA);
const ESTADOS_SINIESTRO_ALFA_SET = new Set(ESTADOS_SINIESTRO_ALFA);

const LEGACY_ESTADO_A_GESTION = {
  'SIN CONTACTAR': 'EN GESTIÓN',
  // Ya hubo gestión (docs pedidos): no cuenta como «por llamar» / EN GESTIÓN.
  'SOLICITUD DE DOCUMENTOS': 'INSPECCIONADO',
  'EN GESTION': 'EN GESTIÓN',
  'EN GESTIÓN': 'EN GESTIÓN',
  'CONTACTADO Y PROGRAMADO': 'CONTACTADO/PROGRAMADO',
  'CONTACTADO - PROGRAMADO': 'CONTACTADO/PROGRAMADO',
  INSPECCIONADO: 'INSPECCIONADO',
  'SIN RESPUESTA': 'SIN RESPUESTA EFECTIVA',
  'SIN RESPUESTA EFECTIVA': 'SIN RESPUESTA EFECTIVA',
  LIQUIDADO: 'LIQUIDADO',
};

const LEGACY_ESTADO_A_SINIESTRO = {
  PENDIENTE: 'PENDIENTE',
  DESISTIDO: 'DESISTIDO',
  DESISTIDOS: 'DESISTIDO',
  DESISTIMIENTO: 'DESISTIDO',
  CERRADO: 'CERRADO',
  'CERRADO TOTALMENTE': 'CERRADO',
  'CERRADOS TOTALMENTE': 'CERRADO',
  OBJETADO: 'OBJETADO',
  OBJETADOS: 'OBJETADO',
  'CASO OBJETADO': 'OBJETADO',
  OBJECION: 'OBJETADO',
  'OBJECIÓN': 'OBJETADO',
  'ENVIADO ASEGURADORA': 'PROCESO DE PAGO',
  'EN PROCESO DE PAGO': 'PROCESO DE PAGO',
  'PROCESO DE PAGO': 'PROCESO DE PAGO',
  'PENDIENTE ACEPTACION DE CIFRAS': 'PENDIENTE ACEPTACION CIFRAS',
  'PENDIENTE ACEPTACIÓN DE CIFRAS': 'PENDIENTE ACEPTACION CIFRAS',
  'PENDIENTE ACEPTACION CIFRAS': 'PENDIENTE ACEPTACION CIFRAS',
};

function normKeyEstado(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function aceptoCifrasAlfa(extras = {}) {
  const acep = String(extras?.liquidador?.aceptacionIndemnizacion || extras?.aceptacionIndemnizacion || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_');
  if (acep === 'ACEPTO') return true;
  return Boolean(extras?.fechaAceptacionLiquidacion);
}

export function homologarEstadoGestionAlfa(valor) {
  const raw = String(valor || '').trim();
  if (ESTADOS_GESTION_ALFA_SET.has(raw)) return raw;
  const key = normKeyEstado(raw);
  if (LEGACY_ESTADO_A_GESTION[key]) return LEGACY_ESTADO_A_GESTION[key];
  return 'EN GESTIÓN';
}

export function homologarEstadoSiniestroAlfa(valor, extras = {}) {
  const raw = String(valor || '').trim();
  if (ESTADOS_SINIESTRO_ALFA_SET.has(raw)) return raw;
  const key = normKeyEstado(raw);

  if (key === 'LIQUIDADO') {
    return aceptoCifrasAlfa(extras) ? 'PROCESO DE PAGO' : 'PENDIENTE ACEPTACION CIFRAS';
  }

  if (LEGACY_ESTADO_A_SINIESTRO[key]) return LEGACY_ESTADO_A_SINIESTRO[key];

  // Cuando llega un estado de gestión legacy en el campo siniestro, cae en pendiente.
  const gestion = homologarEstadoGestionAlfa(raw);
  if (gestion === 'LIQUIDADO') {
    return aceptoCifrasAlfa(extras) ? 'PROCESO DE PAGO' : 'PENDIENTE ACEPTACION CIFRAS';
  }

  return 'PENDIENTE';
}

/** @deprecated Alias de compatibilidad histórica. */
export function homologarEstadoAlfa(valor, extras = {}) {
  return homologarEstadoSiniestroAlfa(valor, extras);
}

/**
 * @deprecated No usar para nuevos guardados. Se mantiene para migraciones.
 */
export function estadoGestionDesdeEstadoAlfa(estado) {
  return homologarEstadoGestionAlfa(estado);
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
  'BANCO ITAU',
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
  return homologarEstadoSiniestroAlfa(estado) !== 'PENDIENTE';
}

/** Observación que se escribe sola al marcar OBJETADO / DESISTIDO (Excel OBSERVACION). */
export const OBSERVACIONES_AUTO_CIERRE_ALFA = {
  OBJETADO: 'Caso objetado.',
  DESISTIDO: 'Caso desistido.',
};

function normObsAutoAlfa(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

const OBS_AUTO_CIERRE_ALFA_NORM = new Set(
  Object.values(OBSERVACIONES_AUTO_CIERRE_ALFA).map((t) => normObsAutoAlfa(t))
);

export function observacionAutoCierreAlfa(estado) {
  const e = homologarEstadoSiniestroAlfa(estado);
  return OBSERVACIONES_AUTO_CIERRE_ALFA[e] || '';
}

/**
 * Completa o sustituye la observación automática de OBJETADO/DESISTIDO.
 * No pisa un texto que haya escrito el ajustador.
 */
export function aplicarObservacionAutoCierreAlfa(estado, observacionActual = '') {
  const plantilla = observacionAutoCierreAlfa(estado);
  const actual = String(observacionActual || '').trim();
  const actualEsAuto = !actual || OBS_AUTO_CIERRE_ALFA_NORM.has(normObsAutoAlfa(actual));
  if (plantilla) return actualEsAuto ? plantilla : actual;
  return actualEsAuto ? '' : actual;
}

/** ESTADO SINIESTRO en SharePoint: etiquetas reales del boletín (sin forzar CERRADO). */
export function estadoAlfaParaSharePoint(estado) {
  return homologarEstadoSiniestroAlfa(estado);
}

export function casoAlfaVenceSla2Dias(caso = {}, ahora = new Date()) {
  if (!caso.fechaInspeccion) return false;
  const estadoSiniestro = homologarEstadoSiniestroAlfa(caso.estado, caso);
  if (estadoSiniestro !== 'PENDIENTE') return false;
  const fi = new Date(caso.fechaInspeccion);
  if (Number.isNaN(fi.getTime())) return false;
  const limite = new Date(fi.getTime() + SLA_DIAS_POST_INSPECCION_ALFA * 86400000);
  const tieneDoc =
    caso.fechaUltimoDocumento ||
    (Array.isArray(caso.archivos) && caso.archivos.length > 0);
  const estadoGestion = homologarEstadoGestionAlfa(caso.estadoGestion || caso.estado);
  const gestionOk = ['INSPECCIONADO', 'EN GESTIÓN'].includes(estadoGestion);
  if (tieneDoc && gestionOk) return false;
  return ahora.getTime() > limite.getTime();
}

export function contarKpisGestionAlfa(casos = []) {
  const base = {
    enGestion: 0,
    contactadoProgramado: 0,
    inspeccionado: 0,
    liquidado: 0,
    sinRespuesta: 0,
    siniestroDefinido: 0,
    slaVencido: 0,
    fueraDeZona: 0,
  };
  for (const c of casos) {
    const g = homologarEstadoGestionAlfa(c.estadoGestion || c.estado);
    if (g === 'EN GESTIÓN') base.enGestion += 1;
    else if (g === 'CONTACTADO/PROGRAMADO') base.contactadoProgramado += 1;
    else if (g === 'INSPECCIONADO') base.inspeccionado += 1;
    else if (g === 'LIQUIDADO') base.liquidado += 1;
    else if (g === 'SIN RESPUESTA EFECTIVA') base.sinRespuesta += 1;
    if (homologarEstadoSiniestroAlfa(c.estado, c) !== 'PENDIENTE') base.siniestroDefinido += 1;
    if (casoAlfaVenceSla2Dias(c)) base.slaVencido += 1;
    if (c.fueraDeZona) base.fueraDeZona += 1;
  }
  // Alias legacy (UI/reporte antiguos)
  base.sinContactar = base.enGestion;
  base.solicitudDocumentos = base.liquidado;
  base.definidos = base.siniestroDefinido;
  return base;
}

/** Filas del tablero de gestión (etiquetas oficiales actuales). */
export const KPI_GESTION_ALFA_FILAS = [
  { key: 'enGestion', label: 'EN GESTIÓN' },
  { key: 'contactadoProgramado', label: 'CONTACTADO/PROGRAMADO' },
  { key: 'inspeccionado', label: 'INSPECCIONADO' },
  { key: 'liquidado', label: 'LIQUIDADO' },
  { key: 'sinRespuesta', label: 'SIN RESPUESTA EFECTIVA' },
  { key: 'siniestroDefinido', label: 'SINIESTRO DEFINIDO' },
];

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
  const n = pesosOficialesAlfa(value);
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
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
  liquidadoCoberturaTerremo: '',
  deducibleTerremoto: '',
  valorLiquidacionCoberturasAdicionales: '',
  deducibleCoberturasAdicionales: '',
  valorTotalPagar: '',
  fechaLlamada: '',
  observacionLlamada: '',
  fechaInspeccion: '',
  horaInicioCoordinacion: '',
  horaFinCoordinacion: '',
  fechaUltimoDocumento: '',
  fechaLiquidado: '',
  fechaAceptacionLiquidacion: '',
  fechaEnvioAseguradora: '',
  estadoGestion: 'EN GESTIÓN',
  estado: 'PENDIENTE',
  observacionesGestion: '',
  zonaAsignada: '',
  tipoPerdida: '',
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
  'liquidadoCoberturaTerremo',
  'deducibleTerremoto',
  'valorLiquidacionCoberturasAdicionales',
  'deducibleCoberturasAdicionales',
  'valorTotalPagar',
];

/**
 * Parsea COP sin concatenar centavos al entero.
 * Acepta 36208706.98 | "36.208.706,98" | "36.208.707".
 */
export function parseMontoCopAlfa(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  let numero = String(valor).trim().replace(/[^\d.,-]/g, '');
  if (!numero || numero === '-' || numero === '.' || numero === '-.') return null;
  const neg = numero.startsWith('-');
  if (neg) numero = numero.slice(1);
  if (numero.includes(',') && numero.includes('.')) {
    const lastComma = numero.lastIndexOf(',');
    const lastDot = numero.lastIndexOf('.');
    numero =
      lastComma > lastDot
        ? numero.replace(/\./g, '').replace(',', '.')
        : numero.replace(/,/g, '');
  } else if ((numero.match(/,/g) || []).length > 1) {
    numero = numero.replace(/,/g, '');
  } else if (numero.includes(',')) {
    numero = numero.replace(',', '.');
  } else if (numero.includes('.')) {
    const partes = numero.split('.');
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  }
  const n = Number(numero);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/**
 * Pesos enteros: 36208706.98 → 36208707.
 * Si concatenaron centavos (3.668.964.288), divide ×100.
 * No divide cédulas: 1.118.293.088 no es un monto inflado.
 */
export function pareceIdentificacionComoMontoAlfa(valor, identificacion) {
  const idn = Number(String(identificacion ?? '').replace(/\D/g, ''));
  const v = Number(valor);
  if (!Number.isFinite(idn) || idn < 100_000) return false;
  if (!Number.isFinite(v) || v <= 0) return false;
  if (Math.abs(v - idn) <= 1) return true;
  if (idn >= 1_000_000_000 && Math.abs(v - Math.round(idn / 100)) <= 1) return true;
  return false;
}

export function pesosOficialesAlfa(valor, identificacion) {
  const n = parseMontoCopAlfa(valor);
  if (n == null || !Number.isFinite(n)) return null;
  if (pareceIdentificacionComoMontoAlfa(n, identificacion)) return null;
  if (Math.abs(n) >= 1_000_000_000) {
    const divided = Math.round(n / 100);
    if (pareceIdentificacionComoMontoAlfa(divided, identificacion)) return null;
    return divided;
  }
  return Math.round(n);
}

function formatEnteroConMiles(entero) {
  const n = Math.trunc(entero);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '0';
  const sign = n < 0 ? '-' : '';
  return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Al escribir: solo dígitos + puntos de miles (no interpreta decimales). */
export const formatMilesInput = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const digitos = String(valor).replace(/[^\d]/g, '');
  if (!digitos) return '';
  const sinCeros = digitos.replace(/^0+(?=\d)/, '');
  return sinCeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Formatea pesos enteros con puntos de miles (es-CO).
 * 36208706.98 → 36.208.707  (no 3.620.870.698)
 */
export const formatMiles = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const oficial =
    typeof valor === 'number' && Number.isFinite(valor)
      ? pesosOficialesAlfa(valor)
      : parseMontoCopAlfa(valor) != null
        ? pesosOficialesAlfa(valor)
        : null;
  if (oficial != null) return formatEnteroConMiles(oficial);
  return formatMilesInput(valor);
};

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
    tipoPerdida: homologarTipoPerdidaAlfa(caso.tipoPerdida),
  };
  base.estado = homologarEstadoSiniestroAlfa(caso.estado, caso);
  base.estadoGestion = String(caso.estadoGestion || '').trim()
    ? homologarEstadoGestionAlfa(caso.estadoGestion)
    : homologarEstadoGestionAlfa(caso.estado);
  base.observacionesGestion = aplicarObservacionAutoCierreAlfa(
    base.estado,
    base.observacionesGestion
  );
  return base;
};

/** Persistencia filtros reporte Alfa (sobrevive al entrar/salir de un caso). */
export const ALFA_REPORTE_FILTROS_STORAGE_KEY = 'alfa-reporte-filtros-v1';
/** v4: orden fijo de columnas de control de liquidación en reporte/Excel. */
export const ALFA_COLUMNAS_STORAGE_KEY = 'alfa-reporte-columnas-v4';

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
