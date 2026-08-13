/**
 * Helpers de geocodificación Alfa (cliente).
 * Debe alinearse con esDireccionPredioGeocodableAlfa del backend.
 */

export function esDireccionPredioGeocodableAlfa(direccion = '') {
  const s = String(direccion || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (!s) return false;
  if (/^POR\s*CONFIRM/.test(s)) return false;
  const placeholders = new Set([
    'PENDIENTE',
    'POR CONFIRMAR',
    'PORCONFIRM',
    'N/A',
    'NA',
    'S/D',
    'SD',
    'SIN DIRECCION',
    'NINGUNA',
    'NO APLICA',
    '-',
    '.',
  ]);
  return !placeholders.has(s);
}

export function construirQueryGeocodeAlfa(caso = {}) {
  return [caso.direccionPredio, caso.ciudad, caso.departamento, 'Colombia']
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function necesitaGeocodeCliente(caso) {
  if (!esDireccionPredioGeocodableAlfa(caso?.direccionPredio)) return false;
  const u = caso?.ubicacionPredio;
  if (!u) return true;
  if (['stale', 'pending', 'failed'].includes(u.geocodeStatus)) return true;
  if (u.geocodeStatus === 'ok' || u.geocodeStatus === 'manual') {
    return !(Number.isFinite(Number(u.lat)) && Number.isFinite(Number(u.lng)));
  }
  return true;
}
