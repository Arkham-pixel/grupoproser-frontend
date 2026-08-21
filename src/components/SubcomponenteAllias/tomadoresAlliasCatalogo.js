import { TOMADORES_ALLIAS_DEFAULT } from './alliasHelpers.js';

const STORAGE_KEY = 'allias.tomadoresExtra';

export const normalizarTomadorAllias = (valor) =>
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
    const key = normalizarTomadorAllias(nombre);
    if (!map.has(key)) map.set(key, nombre.toUpperCase());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

export const leerTomadoresExtraAllias = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return dedupeOrdenado(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

export const guardarTomadoresExtraAllias = (lista = []) => {
  const limpia = dedupeOrdenado(lista).filter(
    (nombre) =>
      !TOMADORES_ALLIAS_DEFAULT.some(
        (def) => normalizarTomadorAllias(def) === normalizarTomadorAllias(nombre)
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limpia));
  return limpia;
};

export const agregarTomadorExtraAllias = (nombre) => {
  const n = normalizarTomadorAllias(nombre);
  if (!n) return leerTomadoresExtraAllias();
  if (TOMADORES_ALLIAS_DEFAULT.some((def) => normalizarTomadorAllias(def) === n)) {
    return leerTomadoresExtraAllias();
  }
  return guardarTomadoresExtraAllias([...leerTomadoresExtraAllias(), n]);
};

export const eliminarTomadorExtraAllias = (nombre) => {
  const key = normalizarTomadorAllias(nombre);
  return guardarTomadoresExtraAllias(
    leerTomadoresExtraAllias().filter((item) => normalizarTomadorAllias(item) !== key)
  );
};

export const listarTomadoresAllias = (extras = leerTomadoresExtraAllias()) =>
  dedupeOrdenado([...TOMADORES_ALLIAS_DEFAULT, ...extras]);

export const esTomadorDefaultAllias = (nombre) =>
  TOMADORES_ALLIAS_DEFAULT.some(
    (def) => normalizarTomadorAllias(def) === normalizarTomadorAllias(nombre)
  );
