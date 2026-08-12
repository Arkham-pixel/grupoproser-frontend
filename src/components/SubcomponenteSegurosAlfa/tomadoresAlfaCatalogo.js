import { TOMADORES_ALFA_DEFAULT } from './segurosAlfaHelpers.js';

const STORAGE_KEY = 'segurosAlfa.tomadoresExtra';

export const normalizarTomadorAlfa = (valor) =>
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
    const key = normalizarTomadorAlfa(nombre);
    if (!map.has(key)) map.set(key, nombre.toUpperCase());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

export const leerTomadoresExtraAlfa = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return dedupeOrdenado(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

export const guardarTomadoresExtraAlfa = (lista = []) => {
  const limpia = dedupeOrdenado(lista).filter(
    (nombre) =>
      !TOMADORES_ALFA_DEFAULT.some(
        (def) => normalizarTomadorAlfa(def) === normalizarTomadorAlfa(nombre)
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limpia));
  return limpia;
};

export const agregarTomadorExtraAlfa = (nombre) => {
  const n = normalizarTomadorAlfa(nombre);
  if (!n) return leerTomadoresExtraAlfa();
  if (TOMADORES_ALFA_DEFAULT.some((def) => normalizarTomadorAlfa(def) === n)) {
    return leerTomadoresExtraAlfa();
  }
  return guardarTomadoresExtraAlfa([...leerTomadoresExtraAlfa(), n]);
};

export const eliminarTomadorExtraAlfa = (nombre) => {
  const key = normalizarTomadorAlfa(nombre);
  return guardarTomadoresExtraAlfa(
    leerTomadoresExtraAlfa().filter((item) => normalizarTomadorAlfa(item) !== key)
  );
};

export const listarTomadoresAlfa = (extras = leerTomadoresExtraAlfa()) =>
  dedupeOrdenado([...TOMADORES_ALFA_DEFAULT, ...extras]);

export const esTomadorDefaultAlfa = (nombre) =>
  TOMADORES_ALFA_DEFAULT.some(
    (def) => normalizarTomadorAlfa(def) === normalizarTomadorAlfa(nombre)
  );
