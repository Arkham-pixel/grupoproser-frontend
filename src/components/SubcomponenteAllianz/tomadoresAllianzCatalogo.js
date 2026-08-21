import { TOMADORES_ALLIANZ_DEFAULT } from './allianzHelpers.js';

const STORAGE_KEY = 'allianz.tomadoresExtra';

export const normalizarTomadorAllianz = (valor) =>
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
    const key = normalizarTomadorAllianz(nombre);
    if (!map.has(key)) map.set(key, nombre.toUpperCase());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

export const leerTomadoresExtraAllianz = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return dedupeOrdenado(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

export const guardarTomadoresExtraAllianz = (lista = []) => {
  const limpia = dedupeOrdenado(lista).filter(
    (nombre) =>
      !TOMADORES_ALLIANZ_DEFAULT.some(
        (def) => normalizarTomadorAllianz(def) === normalizarTomadorAllianz(nombre)
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limpia));
  return limpia;
};

export const agregarTomadorExtraAllianz = (nombre) => {
  const n = normalizarTomadorAllianz(nombre);
  if (!n) return leerTomadoresExtraAllianz();
  if (TOMADORES_ALLIANZ_DEFAULT.some((def) => normalizarTomadorAllianz(def) === n)) {
    return leerTomadoresExtraAllianz();
  }
  return guardarTomadoresExtraAllianz([...leerTomadoresExtraAllianz(), n]);
};

export const eliminarTomadorExtraAllianz = (nombre) => {
  const key = normalizarTomadorAllianz(nombre);
  return guardarTomadoresExtraAllianz(
    leerTomadoresExtraAllianz().filter((item) => normalizarTomadorAllianz(item) !== key)
  );
};

export const listarTomadoresAllianz = (extras = leerTomadoresExtraAllianz()) =>
  dedupeOrdenado([...TOMADORES_ALLIANZ_DEFAULT, ...extras]);

export const esTomadorDefaultAllianz = (nombre) =>
  TOMADORES_ALLIANZ_DEFAULT.some(
    (def) => normalizarTomadorAllianz(def) === normalizarTomadorAllianz(nombre)
  );
