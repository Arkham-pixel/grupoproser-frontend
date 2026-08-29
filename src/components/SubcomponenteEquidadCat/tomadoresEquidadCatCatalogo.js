import { TOMADORES_EQUIDAD_CAT_DEFAULT } from './equidadCatHelpers.js';

const STORAGE_KEY = 'equidadCat.tomadoresExtra';

export const normalizarTomadorEquidadCat = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const dedupeOrdenado = (lista = []) => {
  const map = new Map();
  for (const item of lista) {
    const nombre = String(item || '').trim();
    if (!nombre) continue;
    const key = normalizarTomadorEquidadCat(nombre);
    if (!map.has(key)) map.set(key, nombre.toUpperCase());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

export const leerTomadoresExtraEquidadCat = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return dedupeOrdenado(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

export const guardarTomadoresExtraEquidadCat = (lista = []) => {
  const limpia = dedupeOrdenado(lista).filter(
    (nombre) =>
      !TOMADORES_EQUIDAD_CAT_DEFAULT.some(
        (def) => normalizarTomadorEquidadCat(def) === normalizarTomadorEquidadCat(nombre)
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limpia));
  return limpia;
};

export const agregarTomadorExtraEquidadCat = (nombre) => {
  const n = normalizarTomadorEquidadCat(nombre);
  if (!n) return leerTomadoresExtraEquidadCat();
  if (TOMADORES_EQUIDAD_CAT_DEFAULT.some((def) => normalizarTomadorEquidadCat(def) === n)) {
    return leerTomadoresExtraEquidadCat();
  }
  return guardarTomadoresExtraEquidadCat([...leerTomadoresExtraEquidadCat(), n]);
};

export const eliminarTomadorExtraEquidadCat = (nombre) => {
  const key = normalizarTomadorEquidadCat(nombre);
  return guardarTomadoresExtraEquidadCat(
    leerTomadoresExtraEquidadCat().filter((item) => normalizarTomadorEquidadCat(item) !== key)
  );
};

export const listarTomadoresEquidadCat = (extras = leerTomadoresExtraEquidadCat()) =>
  dedupeOrdenado([...TOMADORES_EQUIDAD_CAT_DEFAULT, ...extras]);

export const esTomadorDefaultEquidadCat = (nombre) =>
  TOMADORES_EQUIDAD_CAT_DEFAULT.some(
    (def) => normalizarTomadorEquidadCat(def) === normalizarTomadorEquidadCat(nombre)
  );
