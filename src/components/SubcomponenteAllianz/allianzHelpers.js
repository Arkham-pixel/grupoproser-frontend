import { crearFechaLocal } from '../../utils/fechaUtils.js';
import { homologarCiudadCatastrofico, resolverUbicacionCatastrofico } from '../../utils/catalogosAsignacionCatastrofico.js';

export const ALLIANZ_REPORTE_PAGE_SIZE = 25;

export const ESTADO_ALLIANZ_DEFAULT = 'CASO NUEVO';
export const ESTADO_ALLIANZ_INSPECCION = 'COORDINANDO INSPECCIÓN';
export const ESTADO_ALLIANZ_ANALISIS = 'ANÁLISIS DEL CASO';
export const ESTADO_ALLIANZ_PENDIENTE_DOCS = 'PENDIENTE DE DOCUMENTO';
export const ESTADO_ALLIANZ_OBJECION = 'OBJECIÓN';
export const ESTADO_ALLIANZ_OBJETADO = 'OBJETADO';
export const ESTADO_ALLIANZ_AUTORIZACION = 'AUTORIZACIÓN ANALISTA';
export const ESTADO_ALLIANZ_PAGO = 'CASO PARA PAGO';
export const ESTADO_ALLIANZ_PAGADO = 'PAGADO';
export const ESTADO_ALLIANZ_ANULADO = 'ANULADO';

export const ESTADOS_ALLIANZ = [
  ESTADO_ALLIANZ_DEFAULT,
  ESTADO_ALLIANZ_INSPECCION,
  ESTADO_ALLIANZ_ANALISIS,
  ESTADO_ALLIANZ_PENDIENTE_DOCS,
  ESTADO_ALLIANZ_OBJECION,
  ESTADO_ALLIANZ_OBJETADO,
  ESTADO_ALLIANZ_AUTORIZACION,
  ESTADO_ALLIANZ_PAGO,
  ESTADO_ALLIANZ_PAGADO,
  ESTADO_ALLIANZ_ANULADO,
];

export const ESTADOS_CIERRE_ALLIANZ = new Set([
  ESTADO_ALLIANZ_OBJETADO,
  ESTADO_ALLIANZ_PAGADO,
  ESTADO_ALLIANZ_ANULADO,
]);

export const ESTADOS_TEMPRANOS_ALLIANZ = new Set([
  ESTADO_ALLIANZ_DEFAULT,
  ESTADO_ALLIANZ_INSPECCION,
]);

export const MODALIDADES_ALLIANZ = ['CAMPO', 'VIDEOPERITAJE'];

export const FECHA_ACCION_POR_ESTADO_ALLIANZ = {
  'CASO NUEVO': 'fechaCasoNuevo',
  'COORDINANDO INSPECCIÓN': 'fechaCoordinandoInspeccion',
  'ANÁLISIS DEL CASO': 'fechaAnalisisCaso',
  'PENDIENTE DE DOCUMENTO': 'fechaSolicitudDocumento',
  OBJECIÓN: 'fechaObjecion',
  OBJETADO: 'fechaObjetado',
  'AUTORIZACIÓN ANALISTA': 'fechaAutorizacionAnalista',
  'CASO PARA PAGO': 'fechaCasoParaPago',
  PAGADO: 'fechaCasoPagado',
  ANULADO: 'fechaAnulado',
};

export const CAMPOS_FECHA_ACCION_ALLIANZ = [
  'fechaCasoNuevo',
  'fechaCoordinandoInspeccion',
  'fechaAnalisisCaso',
  'fechaSolicitudDocumento',
  'fechaRecepcionDocumento',
  'fechaObjecion',
  'fechaObjetado',
  'fechaAutorizacionAnalista',
  'fechaCasoParaPago',
  'fechaCasoPagado',
  'fechaAnulado',
];

const ESTADOS_ALLIANZ_LEGACY = {
  PENDIENTE: 'CASO NUEVO',
  'EN INSPECCION': 'COORDINANDO INSPECCIÓN',
  DOCUMENTACION: 'PENDIENTE DE DOCUMENTO',
  LIQUIDADO: 'CASO PARA PAGO',
  'ENVIADO ASEGURADORA': 'CASO PARA PAGO',
  OBJECTED: 'OBJETADO',
  'CASO OBJETADO': 'OBJETADO',
  'OBJECION CERRADA': 'OBJETADO',
  'OBJECION FINAL': 'OBJETADO',
  PAGO: 'PAGADO',
  'CASO PAGADO': 'PAGADO',
  INDEMNIZADO: 'PAGADO',
  GIRADO: 'PAGADO',
  'CASE PAID': 'PAGADO',
  CERRADO: 'PAGADO',
  'CERRADO MANUAL': 'PAGADO',
  CANCELADO: 'ANULADO',
  'SIN COBERTURA': 'ANULADO',
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
  const idxInsp = ESTADOS_ALLIANZ.indexOf(ESTADO_ALLIANZ_INSPECCION);
  return idx > idxInsp;
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
  'INCENDIO',
  'TERREMOTO',
  'TODO RIESGO',
  'PYME',
  'INDUSTRIAL',
  'OTRO',
];

export const esTipoPolizaOtroAllianz = (valor) =>
  /^OTROS?$/.test(String(valor || '').trim().toUpperCase());

export const etiquetaTipoPolizaAllianz = (caso = {}) => {
  const tipo = String(caso.tipoPoliza || '').trim();
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
  fechaCoordinandoInspeccion: '',
  horaInicioCoordinacion: '',
  horaFinCoordinacion: '',
  fechaAnalisisCaso: '',
  fechaSolicitudDocumento: '',
  fechaRecepcionDocumento: '',
  fechaObjecion: '',
  fechaObjetado: '',
  fechaAutorizacionAnalista: '',
  fechaCasoParaPago: '',
  fechaCasoPagado: '',
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
        .filter((clave) => clave !== 'evidenciaCat' && clave !== 'severidadCatNiveles')
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
  if (base.tipoPoliza && !TIPOS_POLIZA_ALLIANZ.includes(base.tipoPoliza)) {
    if (!base.tipoPolizaOtro) base.tipoPolizaOtro = base.tipoPoliza;
    base.tipoPoliza = 'OTRO';
  }
  base.estado = homologarEstadoAllianz(base.estado);
  const ub = resolverUbicacionAllianz(base.ciudad, base.departamento);
  if (ub.ciudad) base.ciudad = ub.ciudad;
  if (ub.departamento) base.departamento = ub.departamento;
  return base;
};

const TIPOS_INFORME_REPORTE_ALLIANZ = new Set(['unico', 'final', 'preliminar']);

function claveTipoInformeReporteAllianz(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Tipo de informe guardado (único / final / preliminar). Vacío si no hay informe. */
export function tipoInformeCasoAllianz(caso = {}) {
  const inf = caso.informeUnico;
  if (!inf || typeof inf !== 'object') return '';
  const clave = claveTipoInformeReporteAllianz(inf.tipoInforme);
  if (TIPOS_INFORME_REPORTE_ALLIANZ.has(clave)) return clave;
  return Object.keys(inf).length ? 'unico' : '';
}

export function casoAllianzTieneLiquidador(caso = {}) {
  return Boolean(caso?.liquidador && typeof caso.liquidador === 'object');
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
