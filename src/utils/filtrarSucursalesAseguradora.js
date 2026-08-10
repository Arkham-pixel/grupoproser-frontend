/**
 * Filtra sucursales del catálogo Puertos según la aseguradora elegida.
 * Prioridad: 1) campo aseguradoraNombre (catálogo)  2) heurística por nombre / extras.
 */

const STOP_WORDS = new Set([
  'SEGUROS', 'SEGURO', 'SERVICIOS', 'SERVICIO', 'COMPANIA', 'COMPANIAS',
  'GENERALES', 'COLOMBIA', 'DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y',
  'SA', 'SAS', 'LTDA', 'CIA', 'S', 'A',
]);

const EXCLUSIVE = {
  'SERVICIOS BOLIVAR': ['ASISTENCIA BOGOTA'],
  'ADIDAS COLOMBIA': ['ADIDAS'],
};

const EXTRAS = {
  'MAPFRE SEGUROS': [
    'ANTIOQUIA', 'BOGOTA I', 'BOGOTA II', 'DIRECTO', 'GUARNE', 'LA ESTRELLA', 'MANIZALES',
    'REG.CORREDORES CALI', 'REG.CUENTAS CORPORATIV.BOGOTA', 'REG.EJE CAFETERO',
    'REG.NORTE B/QUILLA', 'REG.OCCIDENTE',
  ],
  'SEGUROS BOLIVAR S.A': ['SUCURSAL PEREIRA'],
};

function norm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9/.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensMarca(nombreAseguradora) {
  return norm(nombreAseguradora)
    .split(/[\s./-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}

function itemNombre(item) {
  return typeof item === 'string' ? item : item?.nombre ?? '';
}

function itemPadre(item) {
  if (typeof item === 'string') return '';
  return String(item?.aseguradoraNombre ?? '').trim();
}

function lookupMap(map, aseguradora) {
  const n = norm(aseguradora);
  if (map[n]) return map[n];
  if (map[aseguradora]) return map[aseguradora];
  for (const [k, v] of Object.entries(map)) {
    if (norm(k) === n) return v;
  }
  return null;
}

function coincidePatronExacto(sucNorm, patrones) {
  return patrones.some((p) => sucNorm === norm(p));
}

export function filtrarSucursalesPorAseguradora(aseguradora, sucursales = []) {
  const lista = Array.isArray(sucursales) ? sucursales : [];
  if (!aseguradora || !lista.length) return [];

  const asegNorm = norm(aseguradora);

  const porVinculo = lista.filter((item) => {
    const padre = itemPadre(item);
    return padre && norm(padre) === asegNorm;
  });
  if (porVinculo.length) return porVinculo;

  const exclusive = lookupMap(EXCLUSIVE, aseguradora);
  if (exclusive) {
    return lista.filter((item) => coincidePatronExacto(norm(itemNombre(item)), exclusive));
  }

  const tokens = tokensMarca(aseguradora);
  const marca = tokens.length ? [...tokens].sort((a, b) => b.length - a.length)[0] : '';
  const extras = lookupMap(EXTRAS, aseguradora) || [];

  const out = [];
  const seen = new Set();

  for (const item of lista) {
    const suc = norm(itemNombre(item));
    if (!suc || seen.has(suc)) continue;

    let ok = false;
    if (marca && (suc.includes(marca) || marca.includes(suc))) ok = true;
    if (!ok && tokens.length > 1 && tokens.every((t) => suc.includes(t))) ok = true;
    if (!ok && extras.length && coincidePatronExacto(suc, extras)) ok = true;

    if (ok) {
      seen.add(suc);
      out.push(item);
    }
  }

  return out;
}

export function sucursalAutomatica(aseguradora, sucursales = []) {
  const filtradas = filtrarSucursalesPorAseguradora(aseguradora, sucursales);
  if (filtradas.length !== 1) return '';
  return itemNombre(filtradas[0]);
}

export function sucursalPerteneceAAseguradora(aseguradora, sucursal, sucursales = []) {
  if (!aseguradora || !sucursal) return false;
  const filtradas = filtrarSucursalesPorAseguradora(aseguradora, sucursales);
  const objetivo = norm(sucursal);
  return filtradas.some((item) => norm(itemNombre(item)) === objetivo);
}

export function inferirAseguradoraDeSucursal(nombreSucursal, aseguradoras = []) {
  const lista = aseguradoras.map((a) => (typeof a === 'string' ? a : a?.nombre)).filter(Boolean);
  const fakeItems = [{ nombre: nombreSucursal }];
  for (const aseg of lista) {
    if (filtrarSucursalesPorAseguradora(aseg, fakeItems).length) return aseg;
  }
  return '';
}
