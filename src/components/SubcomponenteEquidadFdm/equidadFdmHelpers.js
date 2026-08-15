import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const FDM_COLUMNAS_STORAGE_KEY = 'equidad-fdm-reporte-columnas-v2';
export const FDM_REPORTE_PAGE_SIZE = 25;

/** Login que solo ve casos con documentos en el archivero */
export const LOGIN_FDM_SOLO_CON_ARCHIVOS = '1065012991';

export const ESTADOS_FDM = ['PENDIENTE', 'LIQUIDADO', 'OBJETADO', 'GIRADO'];
export const EVENTOS_FDM = ['OLA INVERNAL', 'TERREMOTO 10 AGOSTO 2026'];

export const cantidadArchivosFdm = (caso = {}) =>
  Array.isArray(caso?.archivos) ? caso.archivos.length : 0;

export const casoTieneArchivosFdm = (caso = {}) => cantidadArchivosFdm(caso) > 0;

export const loginActualFdm = () => {
  try {
    const directo = localStorage.getItem('login');
    if (directo) return String(directo).trim();
    const raw = localStorage.getItem('usuario');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return String(u?.login || u?.usuario || u?.id || '').trim();
  } catch {
    return '';
  }
};

export const esUsuarioFdmSoloConArchivos = () =>
  String(loginActualFdm()) === LOGIN_FDM_SOLO_CON_ARCHIVOS;

export const CAMPOS_NUMERICOS_FDM = [
  'valorEdificio',
  'valorContenido',
  'valoresIndemnizables',
  'perdidaContenidos',
  'perdidaEdificio',
  'totalPerdida',
  'deducible',
  'totalLiquidado',
  'subsidio',
  'valorIndemnizadoAjustador',
  'valorIndemnizado',
];

/** Formatea entero con puntos de miles (es-CO): 5000000 → 5.000.000 */
export const formatMiles = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const digitos = String(valor).replace(/[^\d]/g, '');
  if (!digitos) return '';
  const sinCeros = digitos.replace(/^0+(?=\d)/, '');
  return sinCeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatMilesInput = (valor) => formatMiles(valor);

export const esCasoNuevoFdm = (caso = {}) => caso?.esNuevo === true;

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '$0';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export const parseDate = (value) => crearFechaLocal(value);

export const formatDate = (value) => {
  const date = crearFechaLocal(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fechaEnRango = (fecha, desde, hasta) => {
  const iso = formatDate(fecha);
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

/** Opciones únicas para un select de filtro a partir de los casos */
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

export const SIN_CIUDAD_FDM = 'SIN CIUDAD';

export const ciudadClaveFdm = (caso = {}) => {
  const norm = normTexto(caso.municipio);
  return norm || SIN_CIUDAD_FDM;
};

/** Ciudades del lote, ordenadas por cantidad (Cali, Quibdó, etc.). */
export const buildCiudadesFdm = (casos = []) => {
  const porNorm = new Map();
  for (const item of casos) {
    const value = ciudadClaveFdm(item);
    const crudo = String(item.municipio || '').replace(/\s+/g, ' ').trim();
    if (!porNorm.has(value)) {
      porNorm.set(value, {
        value,
        label: value === SIN_CIUDAD_FDM ? 'Sin ciudad' : crudo.toUpperCase(),
        count: 0,
      });
    }
    porNorm.get(value).count += 1;
  }
  return [...porNorm.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, 'es');
  });
};

/** Fecha ISO (YYYY-MM-DD) para inputs date desde valores de la API */
export const fechaParaInput = (value) => formatDate(value);
