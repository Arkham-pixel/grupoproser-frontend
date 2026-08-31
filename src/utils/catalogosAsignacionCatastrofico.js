/** Normaliza texto para comparar ciudades (sin acentos / mayúsculas). */
export function normCiudadCatastrofico(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ');
}

const CAPITAL_POR_DEPTO = {
  'VALLE DEL CAUCA': { depto: 'VALLE DEL CAUCA', capital: 'CALI' },
  QUINDIO: { depto: 'QUINDIO', capital: 'ARMENIA' },
  RISARALDA: { depto: 'RISARALDA', capital: 'PEREIRA' },
  CALDAS: { depto: 'CALDAS', capital: 'MANIZALES' },
  CAUCA: { depto: 'CAUCA', capital: 'POPAYAN' },
  CHOCO: { depto: 'CHOCO', capital: 'QUIBDO' },
  TOLIMA: { depto: 'TOLIMA', capital: 'IBAGUE' },
  HUILA: { depto: 'HUILA', capital: 'NEIVA' },
  CAQUETA: { depto: 'CAQUETA', capital: 'FLORENCIA' },
  SANTANDER: { depto: 'SANTANDER', capital: 'BUCARAMANGA' },
  ANTIOQUIA: { depto: 'ANTIOQUIA', capital: 'MEDELLIN' },
  'BOGOTA D C': { depto: 'BOGOTA, D.C.', capital: 'BOGOTA, D.C.' },
  BOGOTA: { depto: 'BOGOTA, D.C.', capital: 'BOGOTA, D.C.' },
};

const DEPTO_POR_MUNICIPIO = {
  CALI: 'VALLE DEL CAUCA',
  BUGA: 'VALLE DEL CAUCA',
  PEREIRA: 'RISARALDA',
  DOSQUEBRADAS: 'RISARALDA',
  'SANTA ROSA DE CABAL': 'RISARALDA',
  ARMENIA: 'QUINDIO',
  MANIZALES: 'CALDAS',
  POPAYAN: 'CAUCA',
  QUIBDO: 'CHOCO',
  IBAGUE: 'TOLIMA',
  NEIVA: 'HUILA',
  FLORENCIA: 'CAQUETA',
  BUCARAMANGA: 'SANTANDER',
  MEDELLIN: 'ANTIOQUIA',
  'BOGOTA D C': 'BOGOTA, D.C.',
  BOGOTA: 'BOGOTA, D.C.',
  FACATATIVA: 'CUNDINAMARCA',
};

/** Unifica Cali / Pereira / Bogotá y, si vino un departamento, deja la capital. */
export function homologarCiudadCatastrofico(valor) {
  const texto = String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!texto) return '';
  const clave = normCiudadCatastrofico(texto);
  if (
    clave === 'CALI' ||
    clave === 'CALI VALLE' ||
    clave === 'CALI VALLE DEL CAUCA' ||
    /^SANTIAGO DE CALI\b/.test(clave)
  ) {
    return 'CALI';
  }
  if (clave === 'PEREIRA' || clave === 'PEREIRA RISARALDA') {
    return 'PEREIRA';
  }
  if (clave === 'BOGOTA' || clave === 'BOGOTA D C' || clave === 'SANTAFE DE BOGOTA') {
    return 'BOGOTA, D.C.';
  }
  const deptoHit = CAPITAL_POR_DEPTO[clave];
  if (deptoHit?.capital) return deptoHit.capital;
  return texto;
}

/** Separa departamento vs ciudad. Valle del Cauca en ciudad → depto + CALI. */
export function resolverUbicacionCatastrofico(ciudad, departamento = '') {
  const deptoIn = String(departamento ?? '').trim();
  const ciudadHom = homologarCiudadCatastrofico(ciudad);
  const claveOrig = normCiudadCatastrofico(ciudad);
  const deptoHit = CAPITAL_POR_DEPTO[claveOrig];
  if (deptoHit) {
    return {
      ciudad: deptoHit.capital || '',
      departamento: deptoIn || deptoHit.depto,
    };
  }
  const claveMun = normCiudadCatastrofico(ciudadHom);
  return {
    ciudad: ciudadHom,
    departamento: deptoIn || DEPTO_POR_MUNICIPIO[claveMun] || '',
  };
}

/** Mapea filas de /api/responsables a opciones de select. */
export function mapResponsablesAOpciones(lista = []) {
  return lista
    .map((r) => {
      const codigo = String(r.codiRespnsble ?? r.codigo ?? r.value ?? r._id ?? '').trim();
      const nombre = String(
        r.nmbrRespnsble || r.nombre || r.nombreResponsable || r.label || ''
      ).trim();
      if (!nombre) return null;
      return { value: nombre, label: nombre, codigo };
    })
    .filter(Boolean)
    .filter((r, idx, arr) => arr.findIndex((x) => x.value === r.value) === idx)
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/** Mapea filas de catálogos catastróficos (ajustador/inspector) a opciones. */
export function mapCatalogoCatastroficoAOpciones(lista = [], modulo = '') {
  const mapped = lista
    .map((r) => {
      const codigo = String(r.codigo ?? r.value ?? r._id ?? '').trim();
      const nombre = String(r.nombre || r.label || '').trim();
      const ciudad = String(r.ciudad || '').trim();
      const modulos = Array.isArray(r.modulos) ? r.modulos : [];
      if (!nombre) return null;
      return { value: nombre, label: nombre, codigo, ciudad, modulos };
    })
    .filter(Boolean)
    .filter((r, idx, arr) => arr.findIndex((x) => x.value === r.value && x.ciudad === r.ciudad) === idx)
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  return filtrarCatalogoPorModulo(mapped, modulo);
}

/**
 * Filtra opciones por ciudad del caso.
 * Incluye cobertura «Todas» (ajustador/inspector nacional) sin quitar el filtro por ciudad.
 */
export function filtrarOpcionesPorCiudad(opciones = [], ciudadCaso) {
  const target = normCiudadCatastrofico(ciudadCaso);
  if (!target) return [];
  return opciones.filter((o) => {
    const c = normCiudadCatastrofico(o.ciudad);
    return c === target || c === 'TODAS';
  });
}

/**
 * Asegura que el valor ya guardado siga en el select (aunque no esté en el filtro),
 * para no perder la asignación al abrir/guardar el caso.
 */
export function asegurarOpcionActual(opciones = [], valorActual = '') {
  const v = String(valorActual || '').trim();
  if (!v) return opciones;
  if (opciones.some((o) => o.value === v || o.codigo === v)) return opciones;
  return [{ value: v, label: `${v} (asignado)`, codigo: '', ciudad: '' }, ...opciones];
}

/** Ajustadora líder de Zurich (quien asigna). No sustituye su rol de ajustadora de campo. */
export const LIDER_ZURICH = 'Ladys Andrea Escalante';

/** Needle de nombre para el líder fijo por módulo. */
export function needleLiderPorModulo(modulo = '') {
  const m = String(modulo || '').toLowerCase();
  if (m === 'alfa') return 'SILVIA';
  if (m === 'sura') return 'BERNARDO';
  if (m === 'zurich' || m === 'zurich-listado' || m === 'zurichlistado') return 'LADYS';
  if (m === 'bbvacat' || m === 'bbva' || m === 'bbva-cat' || m === 'bbva-cat-listado') {
    return 'BAEZ';
  }
  return '';
}

function claveModuloCatalogo(valor) {
  return String(valor || '')
    .toLowerCase()
    .replace(/[-_\s]/g, '');
}

function esModuloBbvaCat(modulo = '') {
  const c = claveModuloCatalogo(modulo);
  return c === 'bbvacat' || c === 'bbva' || c === 'bbvacatlistado';
}

function esModuloAlfa(modulo = '') {
  const c = claveModuloCatalogo(modulo);
  return c === 'alfa' || c === 'segurosalfa';
}

function esModuloZurich(modulo = '') {
  const c = claveModuloCatalogo(modulo);
  return c === 'zurich' || c === 'zurichlistado';
}

function esExcluidoCatalogoZurich(opcion = {}) {
  const n = normCiudadCatastrofico(
    `${opcion.label || ''} ${opcion.value || ''} ${opcion.nombre || ''}`
  );
  return n.includes('ARNALDO') && n.includes('TAPIA');
}

/**
 * Equipos cerrados: BBVA y Alfa solo listan a quienes tienen ese módulo.
 * Catálogo general (sin modulos): Zurich, Sura, Previsora, Allianz, Equidad CAT.
 */
export function filtrarCatalogoPorModulo(opciones = [], modulo = '') {
  const clave = claveModuloCatalogo(modulo);
  const bbva = esModuloBbvaCat(modulo);
  const alfa = esModuloAlfa(modulo);
  return opciones.filter((o) => {
    const mods = (Array.isArray(o.modulos) ? o.modulos : [])
      .map(claveModuloCatalogo)
      .filter(Boolean);
    if (bbva) return mods.some((m) => m === 'bbvacat' || m === 'bbva');
    if (alfa) return mods.some((m) => m === 'alfa' || m === 'segurosalfa');
    if (esModuloZurich(modulo) && esExcluidoCatalogoZurich(o)) return false;
    if (!mods.length) return true;
    if (!clave) {
      return mods.some(
        (m) => m !== 'bbvacat' && m !== 'bbva' && m !== 'alfa' && m !== 'segurosalfa'
      );
    }
    return mods.includes(clave);
  });
}

/**
 * Líder recomendado por módulo (default al crear):
 * Alfa → Silvia; Sura → Bernardo y Mario Pinilla; BBVA → Miguel Báez; Zurich → Ladys.
 * El select de Gestionar usa `opcionesLideresParaSelect` (lista completa).
 */
export function filtrarLideresPorModulo(lideres = [], modulo = '') {
  const m = String(modulo || '').toLowerCase();
  if (m === 'alfa') {
    return lideres.filter((l) =>
      normCiudadCatastrofico(l.label || l.value).includes('SILVIA')
    );
  }
  if (m === 'sura') {
    return lideres.filter((l) => {
      const blob = normCiudadCatastrofico(
        `${l.label || ''} ${l.value || ''} ${l.codigo || ''}`
      );
      const codigo = String(l.codigo || '').replace(/\D/g, '');
      return blob.includes('BERNARDO') || blob.includes('PINILLA') || codigo === '72288319';
    });
  }
  if (esModuloBbvaCat(modulo)) {
    return lideres.filter((l) => {
      const blob = normCiudadCatastrofico(`${l.label || ''} ${l.value || ''} ${l.codigo || ''}`);
      return blob.includes('BAEZ') || blob.includes('BAES');
    });
  }
  if (esModuloZurich(modulo)) {
    return lideres.filter((l) =>
      normCiudadCatastrofico(`${l.label || ''} ${l.value || ''}`).includes('LADYS')
    );
  }
  const needle = needleLiderPorModulo(modulo);
  if (!needle) return lideres;
  return lideres.filter((l) =>
    normCiudadCatastrofico(l.label || l.value).includes(needle)
  );
}

/**
 * Resuelve el ajustador líder por módulo.
 * Alfa → Silvia; Sura → Bernardo; BBVA → Miguel Báez; Zurich → Ladys.
 */
export function resolverLiderPorModulo(lideres = [], modulo = '') {
  const filtrados = filtrarLideresPorModulo(lideres, modulo);
  if (String(modulo || '').toLowerCase() === 'sura') {
    const bernardo = filtrados.find((l) =>
      normCiudadCatastrofico(l.label || l.value).includes('BERNARDO')
    );
    if (bernardo) return bernardo.value || '';
  }
  if (esModuloBbvaCat(modulo)) {
    const miguel = filtrados.find((l) =>
      normCiudadCatastrofico(l.label || l.value).includes('MIGUEL')
    );
    if (miguel) return miguel.value || '';
  }
  if (esModuloZurich(modulo)) {
    const ladys = filtrados.find((l) =>
      normCiudadCatastrofico(l.label || l.value).includes('LADYS')
    );
    return ladys?.value || LIDER_ZURICH;
  }
  return filtrados[0]?.value || '';
}

/**
 * Select de ajustador líder en agregar/gestionar: todos los responsables.
 * El recomendado del módulo va primero; el valor ya guardado no se pierde.
 */
export function opcionesLideresParaSelect(lideres = [], modulo = '', valorActual = '') {
  const recomendados = filtrarLideresPorModulo(lideres, modulo);
  const recKeys = new Set(recomendados.map((l) => String(l.value || '')));
  const resto = lideres.filter((l) => !recKeys.has(String(l.value || '')));
  const ordenados =
    recomendados.length && recomendados.length < lideres.length
      ? [...recomendados, ...resto]
      : [...lideres];
  return asegurarOpcionActual(ordenados, valorActual);
}
