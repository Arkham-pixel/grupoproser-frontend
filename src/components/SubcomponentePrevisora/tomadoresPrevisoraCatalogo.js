import { TOMADORES_PREVISORA_DEFAULT } from './previsoraHelpers.js';

const STORAGE_KEY = 'previsora.tomadoresExtra';

export const normalizarTomadorPrevisora = (valor) =>
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
    const key = normalizarTomadorPrevisora(nombre);
    if (!map.has(key)) map.set(key, nombre.toUpperCase());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

export const leerTomadoresExtraPrevisora = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return dedupeOrdenado(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

export const guardarTomadoresExtraPrevisora = (lista = []) => {
  const limpia = dedupeOrdenado(lista).filter(
    (nombre) =>
      !TOMADORES_PREVISORA_DEFAULT.some(
        (def) => normalizarTomadorPrevisora(def) === normalizarTomadorPrevisora(nombre)
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limpia));
  return limpia;
};

export const agregarTomadorExtraPrevisora = (nombre) => {
  const n = normalizarTomadorPrevisora(nombre);
  if (!n) return leerTomadoresExtraPrevisora();
  if (TOMADORES_PREVISORA_DEFAULT.some((def) => normalizarTomadorPrevisora(def) === n)) {
    return leerTomadoresExtraPrevisora();
  }
  return guardarTomadoresExtraPrevisora([...leerTomadoresExtraPrevisora(), n]);
};

export const eliminarTomadorExtraPrevisora = (nombre) => {
  const key = normalizarTomadorPrevisora(nombre);
  return guardarTomadoresExtraPrevisora(
    leerTomadoresExtraPrevisora().filter((item) => normalizarTomadorPrevisora(item) !== key)
  );
};

export const listarTomadoresPrevisora = (extras = leerTomadoresExtraPrevisora()) =>
  dedupeOrdenado([...TOMADORES_PREVISORA_DEFAULT, ...extras]);

export const esTomadorDefaultPrevisora = (nombre) =>
  TOMADORES_PREVISORA_DEFAULT.some(
    (def) => normalizarTomadorPrevisora(def) === normalizarTomadorPrevisora(nombre)
  );
