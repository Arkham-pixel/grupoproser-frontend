/**
 * Helpers compartidos para el catálogo DIVIPOLA (/api/ciudades).
 * El API trae centros poblados: hay que deduplicar por municipio+departamento
 * y NUNCA resolver ciudad por substring (TADO ≠ APARTADO).
 */

export function normalizarCiudadTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

/** Alias usado por formularios catastróficos. */
export const normTxt = normalizarCiudadTexto;

export function extraerListaCiudadesApi(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

/**
 * Mapea filas del API a { ciudad, departamento, codigo }.
 * No deduplica: usar deduplicarMunicipios después si hace falta.
 */
export function mapearCiudadesDesdeApi(lista = []) {
  return (Array.isArray(lista) ? lista : [])
    .map((c) => {
      const ciudad = String(
        c.descMunicipio || c.ciudad || c.label || c.nombre || c.value || ''
      ).trim();
      const departamento = String(
        c.descDepto || c.departamento || c.departamentoCiudad || ''
      ).trim();
      const codigo = String(c.codiMunicipio || c.codigo || c.value || '').trim();
      if (!ciudad) return null;
      return { ciudad, departamento, codigo: codigo || undefined };
    })
    .filter(Boolean);
}

/** Una fila por municipio+departamento (ignora múltiples centros poblados). */
export function deduplicarMunicipios(lista = []) {
  const vistas = new Map();
  for (const c of lista) {
    const ciudad = String(c.ciudad || c.label || c.value || '').trim();
    const departamento = String(c.departamento || '').trim();
    if (!ciudad) continue;
    const clave = `${normalizarCiudadTexto(ciudad)}|${normalizarCiudadTexto(departamento)}`;
    if (vistas.has(clave)) continue;
    vistas.set(clave, {
      ciudad,
      departamento,
      codigo: c.codigo,
      value: ciudad,
      label: ciudad,
    });
  }
  return [...vistas.values()].sort((a, b) => {
    const byDepto = String(a.departamento).localeCompare(String(b.departamento), 'es');
    if (byDepto !== 0) return byDepto;
    return String(a.ciudad).localeCompare(String(b.ciudad), 'es');
  });
}

export function listarDepartamentos(lista = []) {
  const map = new Map();
  for (const c of lista) {
    const d = String(c.departamento || '').trim();
    if (!d) continue;
    const key = normalizarCiudadTexto(d);
    if (!map.has(key)) map.set(key, d);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Nombres de ciudad únicos dentro del departamento (o todos si depto vacío y allowSinDepto). */
export function filtrarCiudadesPorDepartamento(lista = [], departamento = '', { requireDepto = true } = {}) {
  const deptoNorm = normalizarCiudadTexto(departamento);
  if (!deptoNorm && requireDepto) return [];

  const unicas = new Map();
  for (const c of lista) {
    if (deptoNorm && normalizarCiudadTexto(c.departamento) !== deptoNorm) continue;
    const ciudad = String(c.ciudad || c.label || c.value || '').trim();
    if (!ciudad) continue;
    const key = normalizarCiudadTexto(ciudad);
    if (unicas.has(key)) continue;
    unicas.set(key, {
      ciudad,
      departamento: c.departamento || departamento,
      codigo: c.codigo,
      value: ciudad,
      label: ciudad,
    });
  }
  return [...unicas.values()].sort((a, b) =>
    String(a.ciudad).localeCompare(String(b.ciudad), 'es')
  );
}

/**
 * Coincide solo por igualdad exacta o normalizada (sin tildes/mayúsculas).
 * Nunca por substring.
 */
export function coincidirCiudadExacta(lista = [], valor = '', departamento = '') {
  const guardada = String(valor ?? '').trim();
  if (!guardada || !lista.length) return null;
  const guardadaNorm = normalizarCiudadTexto(guardada);
  const deptoNorm = normalizarCiudadTexto(departamento);

  const coincide = (c) => {
    const ciudad = String(c.ciudad || c.label || c.value || '').trim();
    if (!ciudad) return false;
    if (ciudad === guardada) return true;
    if (normalizarCiudadTexto(ciudad) === guardadaNorm) return true;
    if (c.codigo && String(c.codigo) === guardada) return true;
    return false;
  };

  if (deptoNorm) {
    const enDepto = lista.find(
      (c) => normalizarCiudadTexto(c.departamento) === deptoNorm && coincide(c)
    );
    if (enDepto) return enDepto;
  }
  return lista.find(coincide) || null;
}

export function ciudadSigueValidaTrasCambioDepto(lista = [], ciudad = '', departamento = '') {
  const ciudadNorm = normalizarCiudadTexto(ciudad);
  if (!ciudadNorm) return true;
  const deptoNorm = normalizarCiudadTexto(departamento);
  if (!deptoNorm) return false;
  return lista.some(
    (c) =>
      normalizarCiudadTexto(c.departamento) === deptoNorm &&
      normalizarCiudadTexto(c.ciudad || c.label || c.value) === ciudadNorm
  );
}

export function opcionHuerfanaTexto(valor, opciones = []) {
  const v = String(valor || '').trim();
  if (!v) return false;
  return !opciones.some((op) => {
    const texto = typeof op === 'string' ? op : op?.value ?? op?.label ?? op?.ciudad ?? '';
    return normalizarCiudadTexto(texto) === normalizarCiudadTexto(v);
  });
}

/** Opciones {value,label} para SelectBuscable, con huérfana si la ciudad guardada no está. */
export function opcionesCiudadSelect(ciudadesFiltradas = [], ciudadActual = '') {
  const base = ciudadesFiltradas.map((c) => {
    if (typeof c === 'string') return { value: c, label: c };
    const v = c.value || c.ciudad || c.label || '';
    return { value: v, label: c.label || v };
  });
  const actual = String(ciudadActual || '').trim();
  if (actual && opcionHuerfanaTexto(actual, base)) {
    return [{ value: actual, label: actual }, ...base];
  }
  return base;
}

/**
 * Aplica cambio de departamento sobre un form parcial.
 * Limpia ciudad si deja de ser válida en el nuevo depto.
 */
export function aplicarCambioDepartamento(prev, valorDepto, lista = [], campos = {}) {
  const {
    departamentoKey = 'departamento',
    departamentoCiudadKey = 'departamentoCiudad',
    ciudadKey = 'ciudad',
    ciudadExtraKeys = [],
  } = campos;
  const valor = valorDepto == null ? '' : String(valorDepto);
  const siguiente = {
    ...prev,
    [departamentoKey]: valor,
  };
  if (departamentoCiudadKey) siguiente[departamentoCiudadKey] = valor;

  const ciudadActual = prev[ciudadKey] || '';
  if (!valor || !ciudadSigueValidaTrasCambioDepto(lista, ciudadActual, valor)) {
    siguiente[ciudadKey] = '';
    for (const k of ciudadExtraKeys) siguiente[k] = '';
  }
  return siguiente;
}

/** Convierte lista mapeada a formato options de react-select / Complex. */
export function aOpcionesSelect(lista = []) {
  return deduplicarMunicipios(lista).map((c) => ({
    value: c.ciudad,
    label: c.ciudad,
    departamento: c.departamento,
    codigo: c.codigo,
  }));
}
