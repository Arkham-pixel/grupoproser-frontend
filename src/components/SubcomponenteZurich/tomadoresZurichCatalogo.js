import { TOMADORES_ZURICH_DEFAULT } from './zurichHelpers.js';

const STORAGE_KEY = 'zurich.tomadoresExtra';

export const normalizarTomadorZurich = (valor) =>
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
    const key = normalizarTomadorZurich(nombre);
    if (!map.has(key)) map.set(key, nombre.toUpperCase());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

export const leerTomadoresExtraZurich = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return dedupeOrdenado(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

export const guardarTomadoresExtraZurich = (lista = []) => {
  const limpia = dedupeOrdenado(lista).filter(
    (nombre) =>
      !TOMADORES_ZURICH_DEFAULT.some(
        (def) => normalizarTomadorZurich(def) === normalizarTomadorZurich(nombre)
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limpia));
  return limpia;
};

export const agregarTomadorExtraZurich = (nombre) => {
  const n = normalizarTomadorZurich(nombre);
  if (!n) return leerTomadoresExtraZurich();
  if (TOMADORES_ZURICH_DEFAULT.some((def) => normalizarTomadorZurich(def) === n)) {
    return leerTomadoresExtraZurich();
  }
  return guardarTomadoresExtraZurich([...leerTomadoresExtraZurich(), n]);
};

export const eliminarTomadorExtraZurich = (nombre) => {
  const key = normalizarTomadorZurich(nombre);
  return guardarTomadoresExtraZurich(
    leerTomadoresExtraZurich().filter((item) => normalizarTomadorZurich(item) !== key)
  );
};

export const listarTomadoresZurich = (extras = leerTomadoresExtraZurich()) =>
  dedupeOrdenado([...TOMADORES_ZURICH_DEFAULT, ...extras]);

export const esTomadorDefaultZurich = (nombre) =>
  TOMADORES_ZURICH_DEFAULT.some(
    (def) => normalizarTomadorZurich(def) === normalizarTomadorZurich(nombre)
  );
