import { TOMADORES_SURA_DEFAULT } from './segurosSuraHelpers.js';

const STORAGE_KEY = 'segurosSura.tomadoresExtra';

export const normalizarTomadorSura = (valor) =>
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
    const key = normalizarTomadorSura(nombre);
    if (!map.has(key)) map.set(key, nombre.toUpperCase());
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
};

export const leerTomadoresExtraSura = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return dedupeOrdenado(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
};

export const guardarTomadoresExtraSura = (lista = []) => {
  const limpia = dedupeOrdenado(lista).filter(
    (nombre) =>
      !TOMADORES_SURA_DEFAULT.some(
        (def) => normalizarTomadorSura(def) === normalizarTomadorSura(nombre)
      )
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limpia));
  return limpia;
};

export const agregarTomadorExtraSura = (nombre) => {
  const n = normalizarTomadorSura(nombre);
  if (!n) return leerTomadoresExtraSura();
  if (TOMADORES_SURA_DEFAULT.some((def) => normalizarTomadorSura(def) === n)) {
    return leerTomadoresExtraSura();
  }
  return guardarTomadoresExtraSura([...leerTomadoresExtraSura(), n]);
};

export const eliminarTomadorExtraSura = (nombre) => {
  const key = normalizarTomadorSura(nombre);
  return guardarTomadoresExtraSura(
    leerTomadoresExtraSura().filter((item) => normalizarTomadorSura(item) !== key)
  );
};

export const listarTomadoresSura = (extras = leerTomadoresExtraSura()) =>
  dedupeOrdenado([...TOMADORES_SURA_DEFAULT, ...extras]);

export const esTomadorDefaultSura = (nombre) =>
  TOMADORES_SURA_DEFAULT.some(
    (def) => normalizarTomadorSura(def) === normalizarTomadorSura(nombre)
  );
