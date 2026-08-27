import { TOMADORES_ALFA_DEFAULT } from './segurosAlfaHelpers.js';

const STORAGE_KEY = 'segurosAlfa.tomadoresExtra';

export const normalizarTomadorAlfa = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const normPoliza = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

/**
 * Catálogo de deducibles TERREMOTO por banco/póliza
 * (INFORME CARTERAS DEUDORES BANCOS 2026).
 * base: valor_asegurable | perdida
 */
export const OPCIONES_DEDUCIBLE_ALFA = [
  // AV VILLAS
  {
    id: 'avv-27192',
    tomadorKey: 'AV VILLAS',
    tomadorLabel: 'AV VILLAS',
    poliza: '27192',
    tipoCartera: 'COLECTIVA',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'avv-001',
    tomadorKey: 'AV VILLAS',
    tomadorLabel: 'AV VILLAS',
    poliza: '001',
    tipoCartera: 'INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'avv-002',
    tomadorKey: 'AV VILLAS',
    tomadorLabel: 'AV VILLAS',
    poliza: '002',
    tipoCartera: 'INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'avv-003',
    tomadorKey: 'AV VILLAS',
    tomadorLabel: 'AV VILLAS',
    poliza: '003',
    tipoCartera: 'INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'avv-hogar-27168',
    tomadorKey: 'AV VILLAS',
    tomadorLabel: 'AV VILLAS',
    poliza: 'HOGAR 27168',
    tipoCartera: 'HOGAR INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'avv-008',
    tomadorKey: 'AV VILLAS',
    tomadorLabel: 'AV VILLAS',
    poliza: '008',
    tipoCartera: 'INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'avv-010',
    tomadorKey: 'AV VILLAS',
    tomadorLabel: 'AV VILLAS',
    poliza: '010',
    tipoCartera: 'INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  // BANCO BOGOTÁ
  {
    id: 'bog-25334-25336',
    tomadorKey: 'BANCO BOGOTA',
    tomadorLabel: 'BANCO BOGOTÁ',
    poliza: '25334 Y 25336',
    tipoCartera: 'COLECTIVA',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'bog-005',
    tomadorKey: 'BANCO BOGOTA',
    tomadorLabel: 'BANCO BOGOTÁ',
    poliza: '005',
    tipoCartera: 'INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'bog-007',
    tomadorKey: 'BANCO BOGOTA',
    tomadorLabel: 'BANCO BOGOTÁ',
    poliza: '007',
    tipoCartera: 'INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'bog-011-capa0',
    tomadorKey: 'BANCO BOGOTA',
    tomadorLabel: 'BANCO BOGOTÁ',
    poliza: '011',
    tipoCartera: 'INDIVIDUAL CAPA 0',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'bog-012-stock',
    tomadorKey: 'BANCO BOGOTA',
    tomadorLabel: 'BANCO BOGOTÁ',
    poliza: '012',
    tipoCartera: 'INDIVIDUAL STOCK',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del inmueble, mínimo 2 SMMLV',
  },
  {
    id: 'bog-27471-leasing',
    tomadorKey: 'BANCO BOGOTA',
    tomadorLabel: 'BANCO BOGOTÁ',
    poliza: '27471',
    tipoCartera: 'LEASING COLECTIVA',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable del ítem afectado, mínimo 2 SMMLV',
  },
  // BANCO OCCIDENTE
  {
    id: 'occ-2187-hip',
    tomadorKey: 'BANCO OCCIDENTE',
    tomadorLabel: 'BANCO OCCIDENTE',
    poliza: '2187-2188 Y 2189',
    tipoCartera: 'HIPOTECARIO Y LEASING HAB. COLECTIVA',
    base: 'perdida',
    porcentaje: 1,
    cantidadSMMLV: 0,
    texto: '1% del valor de la pérdida',
  },
  {
    id: 'occ-2210-leasing',
    tomadorKey: 'BANCO OCCIDENTE',
    tomadorLabel: 'BANCO OCCIDENTE',
    poliza: '2210-2203-2211-2212',
    tipoCartera: 'LEASING COLECTIVA',
    base: 'perdida',
    porcentaje: 2,
    cantidadSMMLV: 1,
    texto: '2% sobre valor de la pérdida, mínimo 1 SMMLV',
  },
  /**
   * Condición especial Occidente: riesgos con antigüedad / vetustez > 30 años.
   * Caso p.ej. INDUSTRIAS TREBOL (821001749) · ALFA-2026-08-1647 · TRDM-2210.
   */
  {
    id: 'occ-vetustez-30-terremoto',
    tomadorKey: 'BANCO OCCIDENTE',
    tomadorLabel: 'BANCO OCCIDENTE',
    poliza: 'VETUSTEZ >30 AÑOS',
    tipoCartera: 'ESPECIAL · TERREMOTO (antigüedad >30 años)',
    base: 'valor_asegurable',
    porcentaje: 3,
    cantidadSMMLV: 5,
    texto: '3% del valor asegurable, mínimo 5 SMMLV (riesgos >30 años · terremoto)',
  },
  {
    id: 'occ-vetustez-30-demas',
    tomadorKey: 'BANCO OCCIDENTE',
    tomadorLabel: 'BANCO OCCIDENTE',
    poliza: 'VETUSTEZ >30 AÑOS',
    tipoCartera: 'ESPECIAL · DEMÁS EVENTOS (antigüedad >30 años)',
    base: 'perdida',
    porcentaje: 10,
    cantidadSMMLV: 2,
    texto: '10% del valor de la pérdida, mínimo 2 SMMLV (riesgos >30 años · demás eventos)',
  },
  // BANCO POPULAR
  {
    id: 'pop-27405',
    tomadorKey: 'BANCO POPULAR',
    tomadorLabel: 'BANCO POPULAR',
    poliza: '27405',
    tipoCartera: 'HIPOTECARIO Y LEASING HAB. COLECTIVA',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable, mínimo 2 SMMLV',
  },
  {
    id: 'pop-25312-hogar',
    tomadorKey: 'BANCO POPULAR',
    tomadorLabel: 'BANCO POPULAR',
    poliza: '25312',
    tipoCartera: 'HOGAR INDIVIDUAL',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 3,
    texto: '2% del valor asegurable, mínimo 3 SMMLV',
  },
  {
    id: 'pop-27342-leasing',
    tomadorKey: 'BANCO POPULAR',
    tomadorLabel: 'BANCO POPULAR',
    poliza: '27342 - 27189',
    tipoCartera: 'UNIDAD DE LEASING COLECTIVO',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 3,
    texto: '2% del valor asegurable, mínimo 3 SMMLV',
  },
  // BANCO W
  {
    id: 'bw-2184',
    tomadorKey: 'BANCO W',
    tomadorLabel: 'BANCO W',
    poliza: '2184 Y 2194',
    tipoCartera: 'HIPOTECARIO Y LEASING HAB. COLECTIVA',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 2,
    texto: '2% del valor asegurable, mínimo 2 SMMLV',
  },
  // MI BANCO
  {
    id: 'mib-27479',
    tomadorKey: 'MI BANCO',
    tomadorLabel: 'MI BANCO',
    poliza: '27479',
    tipoCartera: 'HIPOTECARIO Y LEASING HAB. COLECTIVA',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 1,
    texto: '2% del valor asegurable, mínimo 1 SMMLV',
  },
  // MUNDO MUJER
  {
    id: 'mm-27488',
    tomadorKey: 'MUNDO MUJER',
    tomadorLabel: 'MUNDO MUJER',
    poliza: '27488',
    tipoCartera: 'HIPOTECARIO Y LEASING HAB. COLECTIVA',
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 0,
    texto: '2% del valor asegurado',
  },
];

/** Default si el tomador no tiene regla (misma lógica Bogotá / Popular). */
export const DEDUCIBLE_TOMADOR_ALFA_DEFAULT = {
  base: 'valor_asegurable',
  porcentaje: 2,
  cantidadSMMLV: 2,
  texto: '2% del valor asegurable afectado, mínimo 2 SMMLV',
};

/** @deprecated Mapa simple; preferir OPCIONES_DEDUCIBLE_ALFA. */
export const DEDUCIBLES_POR_TOMADOR_ALFA = {
  'BANCO BOGOTA': { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT },
  'BANCO DE BOGOTA': { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT },
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
  'BANCO AV VILLAS': { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT },
  'AV VILLAS': { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT },
  'BANCO POPULAR': { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT },
  'BANCO W': { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT },
  'MI BANCO': {
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 1,
    texto: '2% del valor asegurable, mínimo 1 SMMLV',
  },
  'MUNDO MUJER': {
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 0,
    texto: '2% del valor asegurado',
  },
  'MUNDO MUJERR': {
    base: 'valor_asegurable',
    porcentaje: 2,
    cantidadSMMLV: 0,
    texto: '2% del valor asegurado',
  },
};

function claveTomadorCatalogo(tomador = '') {
  const key = normalizarTomadorAlfa(tomador);
  if (!key) return '';
  if (key.includes('OCCIDENTE')) return 'BANCO OCCIDENTE';
  if (key.includes('BOGOTA')) return 'BANCO BOGOTA';
  if (key.includes('VILLAS')) return 'AV VILLAS';
  if (key.includes('POPULAR')) return 'BANCO POPULAR';
  if (key.includes('BANCO W') || key === 'W') return 'BANCO W';
  if (key.includes('MI BANCO')) return 'MI BANCO';
  if (key.includes('MUNDO MUJER')) return 'MUNDO MUJER';
  return key;
}

export function listarOpcionesDeduciblePorTomadorAlfa(tomador = '') {
  const key = claveTomadorCatalogo(tomador);
  if (!key) return [];
  return OPCIONES_DEDUCIBLE_ALFA.filter((o) => o.tomadorKey === key);
}

export function etiquetaOpcionDeducibleAlfa(opcion) {
  if (!opcion) return '';
  return `Póliza ${opcion.poliza} · ${opcion.tipoCartera} · ${opcion.texto}`;
}

export function obtenerOpcionDeducibleAlfaPorId(id) {
  return OPCIONES_DEDUCIBLE_ALFA.find((o) => o.id === id) || null;
}

/** Intenta casar número de póliza del caso con una opción del banco. */
export function resolverOpcionDeduciblePorPolizaAlfa(tomador = '', numeroPoliza = '') {
  const opciones = listarOpcionesDeduciblePorTomadorAlfa(tomador);
  if (!opciones.length) return null;
  // No auto-elegir condiciones especiales (vetustez / excepciones): el usuario las marca.
  const opcionesNormales = opciones.filter(
    (o) => !String(o.id || '').includes('vetustez') && !String(o.tipoCartera || '').includes('ESPECIAL')
  );
  const pool = opcionesNormales.length ? opcionesNormales : opciones;
  const pol = normPoliza(numeroPoliza);
  if (!pol) return pool[0];
  const hit = pool.find((o) => {
    const p = normPoliza(o.poliza);
    if (!p) return false;
    if (p === pol) return true;
    if (p.includes(pol) || pol.includes(p)) return true;
    // tokens numéricos dentro de "2187-2188 Y 2189"
    const tokens = String(o.poliza).match(/\d{3,}/g) || [];
    return tokens.some((t) => pol.includes(t) || t.includes(pol));
  });
  return hit || pool[0];
}

export function resolverReglaDeducibleTomadorAlfa(tomador = '') {
  const key = claveTomadorCatalogo(tomador);
  if (!key) return { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT, tomadorKey: '', conocida: false };

  const opciones = listarOpcionesDeduciblePorTomadorAlfa(key);
  if (opciones.length) {
    const o = opciones[0];
    return {
      base: o.base,
      porcentaje: o.porcentaje,
      cantidadSMMLV: o.cantidadSMMLV,
      texto: o.texto,
      tomadorKey: key,
      conocida: true,
      opcionId: o.id,
    };
  }

  if (DEDUCIBLES_POR_TOMADOR_ALFA[key]) {
    return { ...DEDUCIBLES_POR_TOMADOR_ALFA[key], tomadorKey: key, conocida: true };
  }

  return { ...DEDUCIBLE_TOMADOR_ALFA_DEFAULT, tomadorKey: key, conocida: false };
}

export function patchDeducibleDesdeOpcionAlfa(opcion, cfgActual = {}) {
  if (!opcion) return { ...cfgActual };
  return {
    ...cfgActual,
    aplica: true,
    porcentaje: opcion.porcentaje,
    cantidadSMMLV: opcion.cantidadSMMLV,
    baseDeducible: opcion.base,
    tipoMinimo: 'SMMLV',
    texto: opcion.texto,
    tomadorDeducible: opcion.tomadorKey,
    opcionDeducibleId: opcion.id,
    polizaDeducible: opcion.poliza,
  };
}

/** Parche de deducibleConfig al elegir tomador (opcionalmente con póliza). */
export function patchDeducibleDesdeTomadorAlfa(tomador, cfgActual = {}, numeroPoliza = '') {
  const opciones = listarOpcionesDeduciblePorTomadorAlfa(tomador);
  let opcion = null;
  if (cfgActual.opcionDeducibleId) {
    opcion = opciones.find((o) => o.id === cfgActual.opcionDeducibleId) || null;
  }
  if (!opcion) {
    opcion = resolverOpcionDeduciblePorPolizaAlfa(
      tomador,
      numeroPoliza || cfgActual.polizaDeducible || ''
    );
  }
  if (opcion) return patchDeducibleDesdeOpcionAlfa(opcion, cfgActual);

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
    opcionDeducibleId: regla.opcionId || '',
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
