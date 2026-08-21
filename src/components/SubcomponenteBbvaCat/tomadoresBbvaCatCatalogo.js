import { TOMADORES_BBVA_CAT_DEFAULT } from './bbvaCatHelpers.js';

const STORAGE_KEY = 'bbvaCat.tomadoresExtra';

export const normalizarTomadorBbvaCat = (valor) =>
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
    const key = normalizarTomadorBbvaCat(nombre);
    if (!map.has(key)) map.set(key, nombre.toUpperCase());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

export const leerTomadoresExtraBbvaCat = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return dedupeOrdenado(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

export const guardarTomadoresExtraBbvaCat = (lista = []) => {
  const limpia = dedupeOrdenado(lista).filter(
    (nombre) =>
      !TOMADORES_BBVA_CAT_DEFAULT.some(
        (def) => normalizarTomadorBbvaCat(def) === normalizarTomadorBbvaCat(nombre)
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limpia));
  return limpia;
};

export const agregarTomadorExtraBbvaCat = (nombre) => {
  const n = normalizarTomadorBbvaCat(nombre);
  if (!n) return leerTomadoresExtraBbvaCat();
  if (TOMADORES_BBVA_CAT_DEFAULT.some((def) => normalizarTomadorBbvaCat(def) === n)) {
    return leerTomadoresExtraBbvaCat();
  }
  return guardarTomadoresExtraBbvaCat([...leerTomadoresExtraBbvaCat(), n]);
};

export const eliminarTomadorExtraBbvaCat = (nombre) => {
  const key = normalizarTomadorBbvaCat(nombre);
  return guardarTomadoresExtraBbvaCat(
    leerTomadoresExtraBbvaCat().filter((item) => normalizarTomadorBbvaCat(item) !== key)
  );
};

export const listarTomadoresBbvaCat = (extras = leerTomadoresExtraBbvaCat()) =>
  dedupeOrdenado([...TOMADORES_BBVA_CAT_DEFAULT, ...extras]);

export const esTomadorDefaultBbvaCat = (nombre) =>
  TOMADORES_BBVA_CAT_DEFAULT.some(
    (def) => normalizarTomadorBbvaCat(def) === normalizarTomadorBbvaCat(nombre)
  );
