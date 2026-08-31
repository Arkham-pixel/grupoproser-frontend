import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const ZURICH_REPORTE_PAGE_SIZE = 25;

export const ESTADO_ZURICH_DEFAULT = 'CASO NUEVO';
export const ESTADO_ZURICH_ASIGNADO = 'ASIGNADO';
export const ESTADO_ZURICH_INSPECCION_COORDINADA = 'INSPECCIÓN COORDINADA';
export const ESTADO_ZURICH_ANALISIS = 'ANALISIS DEL CASO';
export const ESTADO_ZURICH_PENDIENTE_DOCS = 'PENDIENTE DOCUMENTOS (INFORME PRELIMINAR)';
export const ESTADO_ZURICH_LIQUIDAR = 'LIQUIDAR (INFORME UNICO / FINAL)';
export const ESTADO_ZURICH_AUTORIDAD_DELEGADA = 'AUTORIDAD DELEGADA';
export const ESTADO_ZURICH_ACEPTACION_CLIENTE = 'ACEPTACIÓN CLIENTE';
export const ESTADO_ZURICH_FINALIZADO = 'FINALIZADO';

export const ESTADOS_ZURICH = [
  ESTADO_ZURICH_DEFAULT,
  ESTADO_ZURICH_ASIGNADO,
  ESTADO_ZURICH_INSPECCION_COORDINADA,
  ESTADO_ZURICH_ANALISIS,
  ESTADO_ZURICH_PENDIENTE_DOCS,
  ESTADO_ZURICH_LIQUIDAR,
  ESTADO_ZURICH_AUTORIDAD_DELEGADA,
  ESTADO_ZURICH_ACEPTACION_CLIENTE,
  ESTADO_ZURICH_FINALIZADO,
];

export const MODALIDADES_ZURICH = ['CAMPO', 'VIDEOPERITAJE'];

export const FECHA_ACCION_POR_ESTADO_ZURICH = {
  [ESTADO_ZURICH_DEFAULT]: 'fechaCasoNuevo',
  [ESTADO_ZURICH_ASIGNADO]: 'fechaAsignacion',
  [ESTADO_ZURICH_INSPECCION_COORDINADA]: 'fechaCoordinandoInspeccion',
  [ESTADO_ZURICH_ANALISIS]: 'fechaAnalisisCaso',
  [ESTADO_ZURICH_PENDIENTE_DOCS]: 'fechaInformePreliminar',
  [ESTADO_ZURICH_LIQUIDAR]: 'fechaInformeFinal',
  [ESTADO_ZURICH_AUTORIDAD_DELEGADA]: 'fechaAutoridadDelegada',
  [ESTADO_ZURICH_ACEPTACION_CLIENTE]: 'fechaAceptacionCliente',
  [ESTADO_ZURICH_FINALIZADO]: 'fechaFinalizado',
};

export const CAMPOS_FECHA_ACCION_ZURICH = [
  'fechaCasoNuevo',
  'fechaAsignacion',
  'fechaCoordinandoInspeccion',
  'fechaAnalisisCaso',
  'fechaInspeccionado',
  'fechaVerificado',
  'fechaSolicitudDocumento',
  'fechaRecepcionDocumento',
  'fechaInformePreliminar',
  'fechaInformeFinal',
  'fechaAutoridadDelegada',
  'fechaAceptacionCliente',
  'fechaObjecion',
  'fechaLiquidado',
  'fechaFinalizado',
];

const ESTADOS_ZURICH_LEGACY = {
  PENDIENTE: ESTADO_ZURICH_DEFAULT,
  'EN INSPECCION': ESTADO_ZURICH_INSPECCION_COORDINADA,
  'COORDINANDO INSPECCION': ESTADO_ZURICH_INSPECCION_COORDINADA,
  'INSPCCION COODINADA': ESTADO_ZURICH_INSPECCION_COORDINADA,
  'INSPCION COORDINADA': ESTADO_ZURICH_INSPECCION_COORDINADA,
  INSPECCIONADO: ESTADO_ZURICH_ANALISIS,
  VERIFICADO: ESTADO_ZURICH_ANALISIS,
  DOCUMENTACION: ESTADO_ZURICH_PENDIENTE_DOCS,
  'PENDIENTE DE DOCUMENTO': ESTADO_ZURICH_PENDIENTE_DOCS,
  'PENDIENTE DE DOCUMENTOS': ESTADO_ZURICH_PENDIENTE_DOCS,
  'INFORME PRELIMINAR': ESTADO_ZURICH_PENDIENTE_DOCS,
  'INFORME UNICO': ESTADO_ZURICH_LIQUIDAR,
  'INFORME FINAL': ESTADO_ZURICH_LIQUIDAR,
  LIQUIDADO: ESTADO_ZURICH_FINALIZADO,
  OBJECION: ESTADO_ZURICH_FINALIZADO,
  OBJETADO: ESTADO_ZURICH_FINALIZADO,
  'CASO OBJETADO': ESTADO_ZURICH_FINALIZADO,
  'CASO PARA PAGO': ESTADO_ZURICH_FINALIZADO,
  'ENVIADO ASEGURADORA': ESTADO_ZURICH_FINALIZADO,
  'AUTORIZACION ANALISTA': ESTADO_ZURICH_AUTORIDAD_DELEGADA,
  'AUTORIDAD DELEGADA': ESTADO_ZURICH_AUTORIDAD_DELEGADA,
  'ACEPTACION CLIENTE': ESTADO_ZURICH_ACEPTACION_CLIENTE,
  'ACEPTACION LIQUIDACION': ESTADO_ZURICH_ACEPTACION_CLIENTE,
  CERRADO: ESTADO_ZURICH_FINALIZADO,
};

export const ESTADOS_TEMPRANOS_ZURICH = new Set([
  ESTADO_ZURICH_DEFAULT,
  ESTADO_ZURICH_ASIGNADO,
  ESTADO_ZURICH_INSPECCION_COORDINADA,
]);

const claveEstadoZurich = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

const claveBaseEstadoZurich = (valor) =>
  claveEstadoZurich(valor)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function homologarEstadoZurich(valor) {
  const raw = String(valor || '').trim();
  if (!raw) return ESTADO_ZURICH_DEFAULT;
  if (ESTADOS_ZURICH.includes(raw)) return raw;
  const key = claveEstadoZurich(raw);
  const exacto = ESTADOS_ZURICH.find((est) => claveEstadoZurich(est) === key);
  if (exacto) return exacto;
  const base = claveBaseEstadoZurich(raw);
  const porBase = ESTADOS_ZURICH.find((est) => claveBaseEstadoZurich(est) === base);
  if (porBase) return porBase;
  return ESTADOS_ZURICH_LEGACY[key] || ESTADOS_ZURICH_LEGACY[base] || raw;
}

export function esEstadoCerradoZurich(estado) {
  return homologarEstadoZurich(estado) === ESTADO_ZURICH_FINALIZADO;
}

export function esEstadoPendienteDocsZurich(estado) {
  return homologarEstadoZurich(estado) === ESTADO_ZURICH_PENDIENTE_DOCS;
}

function tipoInformeZurich(valor) {
  const t = String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
  if (t === 'preliminar' || t === 'final' || t === 'unico') return t;
  return '';
}

/** Único/final avanzan a LIQUIDAR si el caso aún está en un estado anterior. */
export function estadoZurichPorTipoInforme(tipoInforme, estadoActual) {
  const tipo = tipoInformeZurich(tipoInforme);
  const actual = homologarEstadoZurich(estadoActual);
  if (actual === ESTADO_ZURICH_FINALIZADO) return actual;
  if (tipo !== 'unico' && tipo !== 'final') return actual;
  const orden = ESTADOS_ZURICH.indexOf(actual);
  const idxLiquidar = ESTADOS_ZURICH.indexOf(ESTADO_ZURICH_LIQUIDAR);
  if (orden >= 0 && orden >= idxLiquidar) return actual;
  return ESTADO_ZURICH_LIQUIDAR;
}

export function campoFechaPorEstadoZurich(estado) {
  const homologado = homologarEstadoZurich(estado);
  if (FECHA_ACCION_POR_ESTADO_ZURICH[homologado]) return FECHA_ACCION_POR_ESTADO_ZURICH[homologado];
  const key = claveEstadoZurich(homologado);
  const match = Object.keys(FECHA_ACCION_POR_ESTADO_ZURICH).find(
    (k) => claveEstadoZurich(k) === key
  );
  return match ? FECHA_ACCION_POR_ESTADO_ZURICH[match] : '';
}

const fechaEstadoVacia = (valor) =>
  valor == null || valor === '' || (typeof valor === 'string' && !valor.trim());

/** Pasa fechas del catálogo viejo (análisis / pago / autorización) a los campos vigentes. */
export function migrarFechasEstadoZurich(caso = {}) {
  const out = { ...caso, estado: homologarEstadoZurich(caso.estado) };
  if (fechaEstadoVacia(out.fechaAnalisisCaso)) {
    out.fechaAnalisisCaso =
      caso.fechaInspeccionado || caso.fechaInspeccion || caso.fechaVerificado || out.fechaAnalisisCaso;
  }
  if (fechaEstadoVacia(out.fechaInformePreliminar)) {
    out.fechaInformePreliminar = caso.fechaSolicitudDocumento || out.fechaInformePreliminar;
  }
  if (fechaEstadoVacia(out.fechaFinalizado) && out.estado === ESTADO_ZURICH_FINALIZADO) {
    out.fechaFinalizado =
      caso.fechaLiquidado || caso.fechaObjecion || caso.fechaCasoParaPago || out.fechaFinalizado;
  }
  if (fechaEstadoVacia(out.fechaInformeFinal) && out.estado === ESTADO_ZURICH_LIQUIDAR) {
    out.fechaInformeFinal = caso.fechaLiquidado || out.fechaInformeFinal;
  }
  if (fechaEstadoVacia(out.fechaAutoridadDelegada) && out.estado === ESTADO_ZURICH_AUTORIDAD_DELEGADA) {
    out.fechaAutoridadDelegada = caso.fechaAutorizacionAnalista || out.fechaAutoridadDelegada;
  }
  if (fechaEstadoVacia(out.fechaAceptacionCliente) && out.estado === ESTADO_ZURICH_ACEPTACION_CLIENTE) {
    out.fechaAceptacionCliente = caso.fechaAceptacionLiquidacion || out.fechaAceptacionCliente;
  }
  return out;
}

function diaCalendarioMsZurich(valor) {
  const d = crearFechaLocal(valor);
  if (!d) return null;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

export function origenFechaEstadoZurich(caso = {}) {
  const migrado = migrarFechasEstadoZurich(caso);
  const clave = campoFechaPorEstadoZurich(migrado.estado);
  return (
    (clave && migrado[clave]) ||
    caso.updatedAt ||
    caso.createdAt ||
    null
  );
}

export function diasEnEstadoZurich(caso = {}) {
  const origen = origenFechaEstadoZurich(caso);
  const inicio = diaCalendarioMsZurich(origen);
  const hoy = diaCalendarioMsZurich(new Date());
  if (inicio == null || hoy == null) return '';
  return String(Math.max(0, Math.round((hoy - inicio) / 86400000)));
}

export function ultimaGestionZurich(caso = {}) {
  const claves = [
    ...CAMPOS_FECHA_ACCION_ZURICH,
    'fechaAsignacion',
    'fechaVisita',
    'fechaLlamada',
    'fechaInspeccion',
    'fechaInspeccionado',
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
export const TIPOS_IDENTIFICACION_ZURICH = [
  'CC',
  'CE',
  'NIT',
  'PASAPORTE',
  'PEP',
  'RC',
  'TI',
  'OTRO',
];

export const TIPOS_POLIZA_ZURICH = [
  'HOGAR',
  'INCENDIO',
  'TERREMOTO',
  'TODO RIESGO',
  'PYME',
  'INDUSTRIAL',
  'OTRO',
];

export const esTipoPolizaOtroZurich = (valor) =>
  /^OTROS?$/.test(String(valor || '').trim().toUpperCase());

export const etiquetaTipoPolizaZurich = (caso = {}) => {
  const tipo = String(caso.tipoPoliza || '').trim();
  const detalle = String(caso.tipoPolizaOtro || '').trim();
  if (esTipoPolizaOtroZurich(tipo) && detalle) return detalle;
  return tipo;
};

/** Tomadores base del consolidado Zurich (columna TOMADOR). */
export const TOMADORES_ZURICH_DEFAULT = [
  'BANCO AV VILLAS',
  'BANCO BOGOTA',
  'BANCO OCCIDENTE',
  'BANCO POPULAR',
];

export const ETIQUETAS_ARCHIVO_ZURICH = [
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

export const ETIQUETAS_ARCHIVO_ZURICH_LISTADO = [
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

/** Manual CAT Zurich: severidad 1–6 (reporte de exposición). Textos exactos del Word. */
export const SEVERIDAD_CAT_ZURICH = [
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

/** Parseo de montos con puntos de miles (es-CO). */
export const parseNumeroZurich = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(/\./g, '').replace(/[^\d-]/g, ''));
  return Number.isNaN(n) ? null : n;
};

export const hayAfectacionDesdeNivelesZurich = (niveles, severidadLegacy = null) => {
  const norm = normalizeSeveridadCatNiveles(niveles, severidadLegacy);
  for (let n = 1; n <= 6; n += 1) {
    if (norm[String(n)]?.aplica === 'SI') return true;
  }
  return false;
};

/**
 * Mapea lo diligenciado en la encuesta/inspección CAT al cuadro de datos del reporte.
 */
export function derivarCuadroDesdeInspeccionZurich({
  caso = {},
  cat = {},
  marcarInspeccionado = false,
} = {}) {
  const niveles = cat.severidadCatNiveles || caso.severidadCatNiveles;
  const severidad = cat.severidadCat ?? derivarSeveridadCatDesdeNiveles(niveles);
  const fechaInspeccion = cat.fechaInspeccion || caso.fechaInspeccion || null;
  const out = {
    fechaInspeccion,
    observacionesCat: cat.observacionesCat ?? caso.observacionesCat ?? null,
    accesoPredio: cat.accesoPredio ?? caso.accesoPredio ?? null,
    severidadCat: severidad,
  };

  const haySi = hayAfectacionDesdeNivelesZurich(niveles, severidad);
  const checklist = esChecklistCatLleno({
    severidadCatNiveles: niveles,
    severidadCat: severidad,
  });
  if (haySi) {
    out.afectacion = 'SI';
    if (severidad) out.gradoAfectacion = String(severidad);
  } else if (checklist) {
    out.afectacion = 'NO';
  }

  const obsCat = String(cat.observacionesCat ?? '').trim();
  if (obsCat && !String(caso.observaciones || '').trim()) {
    out.observaciones = obsCat;
  }

  const reserva = parseNumeroZurich(cat.reserva);
  if (reserva != null) out.reserva = reserva;
  if (cat.observacionReserva != null && String(cat.observacionReserva).trim()) {
    out.observacionReserva = String(cat.observacionReserva).trim();
  }

  const estadoActual = homologarEstadoZurich(caso.estado);
  if (marcarInspeccionado && ESTADOS_TEMPRANOS_ZURICH.has(estadoActual)) {
    out.estado = ESTADO_ZURICH_ANALISIS;
    out.fechaAnalisisCaso = fechaInspeccion || new Date().toISOString().slice(0, 10);
    out.fechaInspeccionado = out.fechaAnalisisCaso;
    if (!out.fechaInspeccion) out.fechaInspeccion = out.fechaAnalisisCaso;
  }
  return out;
}

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

export const ACCESO_PREDIO_ZURICH = ['SI', 'NO', 'PARCIAL'];

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

export const DISCLAIMER_CAT_ZURICH =
  'Documento operativo para clasificar severidad, completar la base de exposición y registrar evidencia. No autoriza confirmar ni negar cobertura, prometer pagos ni actuar como vocero de Zurich. La severidad es preliminar y no constituye liquidación del siniestro.';

export const labelSeveridadCat = (nivel) => {
  const n = Number(nivel);
  const found = SEVERIDAD_CAT_ZURICH.find((s) => s.valor === n);
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

/** Cifra corta para frisos: $ 5.105 M en lugar de $ 5.105.100.000. */
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

/** Compacto de torre: $ 5.105 MM; vacío distinto de cero. */
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

/** Unifica Cali / Pereira y variantes de Excel para listados y dashboard. */
export const homologarCiudadZurich = (valor) => {
  const texto = String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!texto) return '';
  const clave = normTexto(texto);
  if (
    clave === 'CALI' ||
    clave === 'CALI VALLE' ||
    clave === 'CALI VALLE DEL CAUCA' ||
    /^SANTIAGO DE CALI\b/.test(clave)
  ) {
    return 'CALI';
  }
  if (clave === 'PEREIRA' || clave === 'PEREIRA RISARALDA') {
    return 'PEREIRA';
  }
  return texto;
};

export const CAUSA_ZURICH_DEFAULT = 'TERREMOTO';

/**
 * Unifica vacíos y variantes (Terremoto / TERREMOTO / sismo) en TERREMOTO.
 * Esta cartera Zurich es el evento CAT; si no hay causa, es terremoto.
 */
export const homologarCausaZurich = (valor) => {
  const texto = String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const clave = normTexto(texto);
  if (!clave) return CAUSA_ZURICH_DEFAULT;
  if (
    clave === 'TERREMOTO' ||
    clave === 'SISMO' ||
    clave === 'SEISMO' ||
    clave === 'EARTHQUAKE' ||
    clave === 'TEMBLOR' ||
    /\bTERREMOTO\b/.test(clave) ||
    /\bSISMO\b/.test(clave) ||
    clave.includes('MOVIMIENTO TELURICO') ||
    clave.includes('MOVIMIENTO SISMICO')
  ) {
    return CAUSA_ZURICH_DEFAULT;
  }
  return texto;
};

/** Departamento del catálogo de ciudades; CALI → Valle del Cauca si no hay catálogo. */
export function departamentoPorCiudadZurich(ciudad, catalogo = []) {
  const raw = String(ciudad || '').trim();
  if (!raw) return '';
  const objetivo = normTexto(homologarCiudadZurich(raw) || raw);
  for (const c of catalogo) {
    const nom = String(c?.ciudad || '').trim();
    if (!nom) continue;
    if (normTexto(nom) === normTexto(raw) || normTexto(homologarCiudadZurich(nom) || nom) === objetivo) {
      const depto = String(c.departamento || '').trim();
      if (depto) return depto;
    }
  }
  if (objetivo === 'CALI') return 'VALLE DEL CAUCA';
  return '';
}

/** Departamento del caso, o inferido por ciudad/dirección (p. ej. CALI → Valle del Cauca). */
export function resolverDepartamentoZurich(caso = {}, catalogo = []) {
  const directo = String(caso?.departamento || '').trim();
  if (directo && directo !== '—' && directo !== '-') return directo;
  const ciudad = caso?.ciudad || '';
  const direccion = caso?.direccionPredio || caso?.direccion || '';
  const texto = `${ciudad} ${direccion}`;
  return (
    departamentoPorCiudadZurich(ciudad, catalogo) ||
    departamentoPorCiudadZurich(direccion, catalogo) ||
    (/valle\s+del\s+cauca/i.test(texto) ? 'VALLE DEL CAUCA' : '')
  );
}

export function primeraFechaNoVaciaZurich(...valores) {
  for (const v of valores) {
    if (v == null || v === '') continue;
    const s = String(v).trim();
    if (!s || s === '—' || s === '-' || s === 'null' || s === 'undefined') continue;
    return v;
  }
  return '';
}

export const buildOpcionesFiltro = (casos = [], campo) => {
  const porNorm = new Map();
  for (const item of casos) {
    const raw = item?.[campo];
    if (campo !== 'causa' && !raw) continue;
    const label =
      campo === 'ciudad'
        ? homologarCiudadZurich(raw) || String(raw).trim()
        : campo === 'causa'
          ? homologarCausaZurich(raw)
          : String(raw).trim();
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

export const coincideFiltroCiudadZurich = (valorCaso, filtro) => {
  if (!filtro) return true;
  return coincideFiltroTexto(homologarCiudadZurich(valorCaso), filtro);
};

export const coincideFiltroCausaZurich = (valorCaso, filtro) => {
  if (!filtro) return true;
  return coincideFiltroTexto(homologarCausaZurich(valorCaso), filtro);
};

/** Fecha ISO (YYYY-MM-DD) para inputs date desde valores de la API */
export const fechaParaInput = (value) => formatDateIso(value);

export const FORM_VACIO_ZURICH = {
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
  fechaInspeccionado: '',
  fechaVerificado: '',
  fechaAnalisisCaso: '',
  fechaSolicitudDocumento: '',
  fechaRecepcionDocumento: '',
  fechaObjecion: '',
  fechaAutorizacionAnalista: '',
  fechaCasoParaPago: '',
  fechaLiquidado: '',
  fechaInformePreliminar: '',
  fechaInformeFinal: '',
  fechaAutoridadDelegada: '',
  fechaAceptacionCliente: '',
  fechaFinalizado: '',
  documentoFaltante: '',
  observacionPendienteDocumento: '',
  motivoObjecion: '',
  responsableAporteDocumento: '',
  numeroPoliza: '',
  tipoPoliza: '',
  tipoPolizaOtro: '',
  causa: 'TERREMOTO',
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

export const TIPOS_NEGOCIO_HOMOLOGADO_ZURICH = [
  'Lider Zurich 100%',
  'coaseguro aceptado',
  'coaseguro cedido',
];

/** Afectación / Lucro cesante parametrizados */
export const OPCIONES_SI_NO_ZURICH = ['SI', 'NO'];

/** Grado de afectación (1–6), independiente de la severidad CAT del desprendible */
export const GRADOS_AFECTACION_ZURICH = ['1', '2', '3', '4', '5', '6'];

export const normalizarSiNoZurich = (raw) => {
  const n = normTexto(raw);
  if (!n) return '';
  if (['SI', 'S', 'YES', 'TRUE', '1', 'APLICA'].includes(n)) return 'SI';
  if (['NO', 'N', 'FALSE', '0', 'NO APLICA', 'NA', 'N/A'].includes(n)) return 'NO';
  return String(raw ?? '').trim();
};

export const normalizarGradoAfectacionZurich = (raw) => {
  if (raw === '' || raw == null) return '';
  const n = Number(String(raw).trim().replace(',', '.'));
  if (Number.isFinite(n) && n >= 1 && n <= 6) return String(Math.round(n));
  return String(raw).trim();
};

export const CAMPOS_FECHA_Zurich = [
  'fechaSiniestro',
  'fechaInicioPoliza',
  'fechaFinPoliza',
  'fechaLlamada',
  'fechaInspeccion',
  'fechaInspeccionado',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
  'fechaAsignacion',
  'fechaVisita',
  ...CAMPOS_FECHA_ACCION_ZURICH,
];

export const CAMPOS_NUMERICOS_ZURICH = [
  'valorAseguradoInmueble',
  'valorAseguradoContenidos',
  'valorReservaPreventivaPromedio',
  'valorComercialInmueble',
  'reserva',
  'valorReclamado',
  'valorLiquidado',
];

/** Decimales libres (distancia epicentro, etc.) — no usan formato de miles */
export const CAMPOS_DECIMAL_ZURICH = ['distanciaEpicentroKm'];

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

export const construirFormDesdecasoZurich = (caso = {}) => {
  const base = {
    ...FORM_VACIO_ZURICH,
    ...Object.fromEntries(
      Object.keys(FORM_VACIO_ZURICH)
        .filter((clave) => clave !== 'evidenciaCat' && clave !== 'severidadCatNiveles')
        .map((clave) => {
          const valor = caso[clave];
          if (valor === null || valor === undefined) return [clave, ''];
          if (CAMPOS_FECHA_Zurich.includes(clave)) return [clave, fechaParaInput(valor)];
          if (CAMPOS_NUMERICOS_ZURICH.includes(clave)) return [clave, formatMiles(valor)];
          if (CAMPOS_DECIMAL_ZURICH.includes(clave)) {
            return [clave, valor === 0 || valor ? String(valor) : ''];
          }
          if (clave === 'severidadCat') return [clave, valor === 0 || valor ? String(valor) : ''];
          if (clave === 'afectacion' || clave === 'lucroCesante') {
            return [clave, normalizarSiNoZurich(valor)];
          }
          if (clave === 'gradoAfectacion') {
            return [clave, normalizarGradoAfectacionZurich(valor)];
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
  if (base.tipoPoliza && !TIPOS_POLIZA_ZURICH.includes(base.tipoPoliza)) {
    if (!base.tipoPolizaOtro) base.tipoPolizaOtro = base.tipoPoliza;
    base.tipoPoliza = 'OTRO';
  }
  base.estado = homologarEstadoZurich(base.estado);
  if (!base.fechaAnalisisCaso) {
    base.fechaAnalisisCaso = fechaParaInput(
      caso.fechaAnalisisCaso || caso.fechaInspeccionado || caso.fechaInspeccion || ''
    );
  }
  if (!base.fechaFinalizado) {
    base.fechaFinalizado = fechaParaInput(
      caso.fechaFinalizado || caso.fechaLiquidado || caso.fechaObjecion || caso.fechaCasoParaPago || ''
    );
  }
  if (!base.fechaInformePreliminar) {
    base.fechaInformePreliminar = fechaParaInput(
      caso.fechaInformePreliminar || caso.fechaSolicitudDocumento || ''
    );
  }
  if (!base.fechaAutoridadDelegada) {
    base.fechaAutoridadDelegada = fechaParaInput(
      caso.fechaAutoridadDelegada || caso.fechaAutorizacionAnalista || ''
    );
  }
  if (!base.fechaAceptacionCliente) {
    base.fechaAceptacionCliente = fechaParaInput(
      caso.fechaAceptacionCliente || caso.fechaAceptacionLiquidacion || ''
    );
  }
  base.createdAt = caso.createdAt || '';
  base.updatedAt = caso.updatedAt || '';
  return base;
};
