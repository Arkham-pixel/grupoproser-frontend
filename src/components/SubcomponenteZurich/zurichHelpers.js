import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const ZURICH_REPORTE_PAGE_SIZE = 25;

export const ESTADOS_ZURICH = [
  'PENDIENTE',
  'EN INSPECCIÓN',
  'DOCUMENTACIÓN',
  'LIQUIDADO',
  'ENVIADO ASEGURADORA',
  'CERRADO',
];

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
  'FOTOS',
  /** Manual CAT — evidencia fotográfica/documental */
  'FOTO_GENERAL',
  'FOTO_DANOS',
  'EQUIPOS_CRITICOS',
  'MITIGACION',
  'NO_ACCESO',
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
 * Si solo existe severidadCat numérico legacy, marca ese nivel como APLICA.
 */
export const normalizeSeveridadCatNiveles = (raw = {}, severidadCatLegacy = null) => {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (let n = 1; n <= 6; n += 1) {
    const key = String(n);
    out[key] = normalizeSeveridadNivelItem(src[key] ?? src[n]);
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

export const FORM_VACIO_ZURICH = {
  siniestro: '',
  identificacion: '',
  asegurado: '',
  tomador: '',
  ajustador: '',
  numeroPoliza: '',
  direccionPredio: '',
  numeroCredito: '',
  informacionContacto: '',
  correo: '',
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
  valorReclamado: '',
  valorLiquidado: '',
  fechaInspeccion: '',
  fechaUltimoDocumento: '',
  fechaLiquidado: '',
  fechaAceptacionLiquidacion: '',
  fechaEnvioAseguradora: '',
  estado: 'PENDIENTE',
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

export const CAMPOS_FECHA_Zurich = [
  'fechaSiniestro',
  'fechaInicioPoliza',
  'fechaFinPoliza',
  'fechaInspeccion',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
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
  return base;
};
