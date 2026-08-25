/** Normaliza texto para comparar ciudades (sin acentos / mayúsculas). */
export function normCiudadCatastrofico(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
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

/** Needle de nombre para el líder fijo por módulo. */
export function needleLiderPorModulo(modulo = '') {
  const m = String(modulo || '').toLowerCase();
  if (m === 'alfa') return 'SILVIA';
  if (m === 'sura') return 'BERNARDO';
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

/**
 * Equipo cerrado BBVA: solo personas con modulo bbvaCat.
 * Catálogo general (sin modulos): todos los módulos excepto BBVA.
 */
export function filtrarCatalogoPorModulo(opciones = [], modulo = '') {
  const clave = claveModuloCatalogo(modulo);
  const bbva = esModuloBbvaCat(modulo);
  return opciones.filter((o) => {
    const mods = (Array.isArray(o.modulos) ? o.modulos : []).map(claveModuloCatalogo).filter(Boolean);
    if (!mods.length) return !bbva;
    if (!clave) return !mods.some((m) => m === 'bbvacat' || m === 'bbva');
    if (bbva) return mods.some((m) => m === 'bbvacat' || m === 'bbva');
    return mods.includes(clave);
  });
}

/**
 * Solo el líder permitido en el select:
 * Alfa → Silvia; Sura → Bernardo y Mario Pinilla; BBVA → Miguel Báez.
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
  const needle = needleLiderPorModulo(modulo);
  if (!needle) return lideres;
  return lideres.filter((l) =>
    normCiudadCatastrofico(l.label || l.value).includes(needle)
  );
}

/**
 * Resuelve el ajustador líder por módulo.
 * Alfa → Silvia; Sura → Bernardo; BBVA → Miguel Báez.
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
  return filtrados[0]?.value || '';
}
