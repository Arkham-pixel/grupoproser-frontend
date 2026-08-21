import { TOMADORES_ALFA_DEFAULT } from './segurosAlfaHelpers.js';

const STORAGE_KEY = 'segurosAlfa.tomadoresExtra';

export const normalizarTomadorAlfa = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/**
 * Reglas de deducible por tomador (póliza / banco).
 * - valor_asegurable: MAX(% del valor asegurado, N SMMLV)
 * - perdida: % del valor de la pérdida (sin mínimo SMMLV)
 */
export const DEDUCIBLES_POR_TOMADOR_ALFA = {
  'BANCO BOGOTA': {
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable afectado, mínimo 2 SMMLV',
  },
  'BANCO DE BOGOTA': {
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable afectado, mínimo 2 SMMLV',
  },
  'BANCO OCCIDENTE': {
    base: 'perdida',
    porcentaje: 1,
    cantidadSMMLV: 0,
    texto: '1% del valor de la pérdida',
  },
  'BANCO DE OCCIDENTE': {
    base: 'perdida',
    porcentaje: 1,
    cantidadSMMLV: 0,
    texto: '1% del valor de la pérdida',
  },
  'BANCO AV VILLAS': {
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable afectado, mínimo 2 SMMLV',
  },
  'AV VILLAS': {
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable afectado, mínimo 2 SMMLV',
  },
  'BANCO POPULAR': {
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable afectado, mínimo 2 SMMLV',
  },
};

/** Default si el tomador no tiene regla (misma lógica Bogotá / Popular). */
export const DEDUCIBLE_TOMADOR_ALFA_DEFAULT = {
  base: 'valor_asegurable',
  porcentaje: 2,
  cantidadSMMLV: 2,
  texto: '2% del valor asegurable afectado, mínimo 2 SMMLV',
};

export function resolverReglaDeducibleTomadorAlfa(tomador = '') {
  const key = normalizarTomadorAlfa(tomador);
  if (!key) return { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT, tomadorKey: '', conocida: false };

  if (DEDUCIBLES_POR_TOMADOR_ALFA[key]) {
    return { ...DEDUCIBLES_POR_TOMADOR_ALFA[key], tomadorKey: key, conocida: true };
  }

  if (key.includes('OCCIDENTE')) {
    return { ...DEDUCIBLES_POR_TOMADOR_ALFA['BANCO OCCIDENTE'], tomadorKey: key, conocida: true };
  }
  if (key.includes('BOGOTA')) {
    return { ...DEDUCIBLES_POR_TOMADOR_ALFA['BANCO BOGOTA'], tomadorKey: key, conocida: true };
  }
  if (key.includes('VILLAS')) {
    return { ...DEDUCIBLES_POR_TOMADOR_ALFA['BANCO AV VILLAS'], tomadorKey: key, conocida: true };
  }
  if (key.includes('POPULAR')) {
    return { ...DEDUCIBLES_POR_TOMADOR_ALFA['BANCO POPULAR'], tomadorKey: key, conocida: true };
  }

  return { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT, tomadorKey: key, conocida: false };
}

/** Parche de deducibleConfig al elegir tomador (conserva año/valor SMMLV). */
export function patchDeducibleDesdeTomadorAlfa(tomador, cfgActual = {}) {
  const regla = resolverReglaDeducibleTomadorAlfa(tomador);
  return {
    ...cfgActual,
    aplica: true,
    porcentaje: regla.porcentaje,
    cantidadSMMLV: regla.cantidadSMMLV,
    baseDeducible: regla.base,
    tipoMinimo: 'SMMLV',
    texto: regla.texto,
    tomadorDeducible: regla.tomadorKey || normalizarTomadorAlfa(tomador),
  };
}

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
