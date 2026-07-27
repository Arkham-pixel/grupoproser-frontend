import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const PROPIEDADES_COLUMNAS_STORAGE_KEY = 'propiedades-reporte-columnas-v1';
export const PROPIEDADES_REPORTE_PAGE_SIZE = 25;

export const CLASES_TIPOS_INMUEBLE = {
  Residencial: [
    'Casa',
    'Apartamento',
    'Apartaestudio',
    'Casa en conjunto cerrado',
    'Casa campestre',
    'Local mixto (vivienda)',
  ],
  Comercial: [
    'Local comercial',
    'Oficina',
    'Consultorio',
    'Bodega comercial',
    'Local en centro comercial',
  ],
  Industrial: ['Bodega industrial', 'Nave industrial', 'Planta industrial', 'Taller'],
  Mixto: ['Edificio mixto', 'Casa con local comercial', 'Apartamento con oficina'],
  Institucional: [
    'Edificio educativo',
    'Edificio de salud',
    'Edificio religioso',
    'Edificio gubernamental',
    'Otro institucional',
  ],
};

export const CLASES_INMUEBLE = Object.keys(CLASES_TIPOS_INMUEBLE);

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

export const fechaParaInput = (value) => formatDate(value);

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

export const etiquetaInspeccion = (caso) =>
  caso?.inspeccionId ? 'Con inspección' : 'Sin inspección';
