import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const SURA_REPORTE_PAGE_SIZE = 25;

/** Flujo pedido tras inducción SURA. */
export const ESTADOS_SURA = [
  'CASO NUEVO',
  'ASIGNADO (PARA ASIGNAR INSPECTOR)',
  'INSPECCIONADO',
  'INFORME DEL INSPECTOR',
  'INFORME PRELIMINAR Y/O ACTUALIZACIÓN',
  'INFORME ÚNICO O FINAL',
  'ANULADO',
];

export const ESTADOS_SURA_CERRADOS = ['ANULADO', 'CERRADO'];

const MAPA_ESTADO_SURA_LEGADO = {
  PENDIENTE: 'CASO NUEVO',
  'EN INSPECCION': 'ASIGNADO (PARA ASIGNAR INSPECTOR)',
  'EN INSPECCIÓN': 'ASIGNADO (PARA ASIGNAR INSPECTOR)',
  DOCUMENTACION: 'INFORME DEL INSPECTOR',
  DOCUMENTACIÓN: 'INFORME DEL INSPECTOR',
  LIQUIDADO: 'INFORME ÚNICO O FINAL',
  'ENVIADO ASEGURADORA': 'INFORME ÚNICO O FINAL',
  CERRADO: 'INFORME ÚNICO O FINAL',
};

function normEstadoClave(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/** Convierte estados viejos al catálogo actual sin perder el dato. */
export function normalizarEstadoSura(valor) {
  const raw = String(valor ?? '').trim();
  if (!raw) return 'CASO NUEVO';
  if (ESTADOS_SURA.includes(raw)) return raw;
  const mapeado = MAPA_ESTADO_SURA_LEGADO[raw] || MAPA_ESTADO_SURA_LEGADO[normEstadoClave(raw)];
  if (mapeado) return mapeado;
  const hit = ESTADOS_SURA.find((e) => normEstadoClave(e) === normEstadoClave(raw));
  return hit || raw;
}

export function esEstadoSuraCerrado(valor) {
  const n = normalizarEstadoSura(valor);
  return ESTADOS_SURA_CERRADOS.includes(n) || normEstadoClave(valor) === 'CERRADO';
}

export const ESTADO_SURA_INFORME_UNICO = 'INFORME ÚNICO O FINAL';

function tipoInformeSuraClave(valor) {
  const t = String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
  if (t === 'preliminar' || t === 'final' || t === 'unico') return t;
  return '';
}

/** Único/final pasan el caso a INFORME ÚNICO O FINAL (equivalente a liquidado). */
export function estadoSuraPorTipoInforme(tipoInforme, estadoActual) {
  const tipo = tipoInformeSuraClave(tipoInforme);
  const actual = normalizarEstadoSura(estadoActual);
  if (actual === 'ANULADO') return actual;
  if (tipo !== 'unico' && tipo !== 'final') return actual;
  return ESTADO_SURA_INFORME_UNICO;
}

export function casoSuraTieneDocumentacion(caso = {}) {
  if (Array.isArray(caso.archivos) && caso.archivos.length > 0) return true;
  if (Array.isArray(caso.fotosAgil?.imagenes) && caso.fotosAgil.imagenes.length > 0) return true;
  const inf = caso.informeUnico;
  if (inf && typeof inf === 'object') {
    if (Array.isArray(inf.fotosInspeccion) && inf.fotosInspeccion.length > 0) return true;
    const texto = [inf.infoEvento, inf.descripcionDanios, inf.conclusiones, inf.recomendacion]
      .map((s) => String(s || '').trim())
      .join('');
    if (texto.length > 40) return true;
  }
  const items = caso.liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (Array.isArray(items) && items.some((it) => String(it?.actividad || '').trim())) return true;
  return false;
}

/** Tomadores base del consolidado Sura (columna TOMADOR). */
export const TOMADORES_SURA_DEFAULT = [
  'BANCO AV VILLAS',
  'BANCO BOGOTA',
  'BANCO OCCIDENTE',
  'BANCO POPULAR',
];

export const ETIQUETAS_ARCHIVO_SURA = [
  'GENERAL',
  'POLIZA',
  'INSPECCION',
  'LIQUIDACION',
  'INFORME',
  'INFORME_PRELIMINAR',
  'INFORME_FINAL',
  'INFORME_UNICO',
  'FOTOS',
  'OTRO',
];

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

export const FORM_VACIO_SURA = {
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
  sede: '',
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
  estado: 'PENDIENTE',
};

export const CAMPOS_FECHA_SURA = [
  'fechaSiniestro',
  'fechaInicioPoliza',
  'fechaFinPoliza',
  'fechaLlamada',
  'fechaInspeccion',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
];

export const CAMPOS_NUMERICOS_SURA = [
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

export const construirFormDesdeCasoSura = (caso = {}) => ({
  ...FORM_VACIO_SURA,
  ...Object.fromEntries(
    Object.keys(FORM_VACIO_SURA).map((clave) => {
      const valor = caso[clave];
      if (valor === null || valor === undefined) return [clave, ''];
      if (CAMPOS_FECHA_SURA.includes(clave)) return [clave, fechaParaInput(valor)];
      if (CAMPOS_NUMERICOS_SURA.includes(clave)) return [clave, formatMiles(valor)];
      return [clave, String(valor)];
    })
  ),
  sede: caso.sede || caso.sedeRiesgo || '',
});
