/**
 * Helpers de geocodificación Alfa (cliente).
 * Debe alinearse con alfaBloquesCercaniaService del backend.
 */

const LOCATION_TYPES_PRECISOS = new Set([
  'ROOFTOP',
  'RANGE_INTERPOLATED',
  'GEOMETRIC_CENTER',
]);

const TIPOS_SOLO_CIUDAD = new Set([
  'locality',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'administrative_area_level_5',
  'country',
  'political',
  'postal_code',
]);

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

export function resultadoGeocodeEsUtil(result) {
  if (!result?.geometry?.location) return false;
  const locType = String(result.geometry.location_type || '').toUpperCase();
  if (LOCATION_TYPES_PRECISOS.has(locType)) return true;
  if (locType !== 'APPROXIMATE') return false;
  const types = Array.isArray(result.types) ? result.types : [];
  if (!types.length) return false;
  return types.some((t) => !TIPOS_SOLO_CIUDAD.has(String(t)));
}

export function elegirResultadoGeocodeUtil(results = []) {
  const lista = Array.isArray(results) ? results : [];
  return (
    lista.find((r) =>
      LOCATION_TYPES_PRECISOS.has(String(r?.geometry?.location_type || '').toUpperCase())
    ) ||
    lista.find((r) => resultadoGeocodeEsUtil(r)) ||
    null
  );
}

export function ubicacionTienePrecisionCalle(u = {}) {
  if (u?.geocodeStatus === 'manual') return true;
  const tipo = String(u?.locationType || '').toUpperCase();
  if (LOCATION_TYPES_PRECISOS.has(tipo)) return true;
  if (tipo === 'APPROXIMATE' && u?.geocodeStatus === 'ok') return true;
  return false;
}

/**
 * Geocodifica en el navegador.
 * Acepta calle/tramo y APPROXIMATE de lugar; rechaza solo centro de ciudad.
 */
export function geocodeConGooglePreciso(address) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.Geocoder) {
      resolve({ status: 'failed', error: 'Google Maps no cargado', geocodeQuery: address });
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { address, region: 'CO', componentRestrictions: { country: 'CO' } },
      (results, status) => {
        if (status !== 'OK' || !results?.length) {
          resolve({
            status: 'failed',
            error: status || 'ZERO_RESULTS',
            geocodeQuery: address,
          });
          return;
        }
        const elegido = elegirResultadoGeocodeUtil(results);
        if (!elegido?.geometry?.location) {
          resolve({
            status: 'failed',
            error: 'PRECISION_TOO_LOW',
            locationType: results[0]?.geometry?.location_type || 'APPROXIMATE',
            formattedAddress: results[0]?.formatted_address || address,
            placeTypes: results[0]?.types || [],
            geocodeQuery: address,
          });
          return;
        }
        const loc = elegido.geometry.location;
        resolve({
          status: 'ok',
          lat: loc.lat(),
          lng: loc.lng(),
          locationType: elegido.geometry.location_type || '',
          formattedAddress: elegido.formatted_address || address,
          placeTypes: Array.isArray(elegido.types) ? elegido.types : [],
          geocodeQuery: address,
        });
      }
    );
  });
}

export function urlGoogleMaps(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return '';
  return `https://www.google.com/maps?q=${la},${ln}&z=18&t=k`;
}

export function coordsUbicacionPredio(caso) {
  const u = caso?.ubicacionPredio;
  const lat = Number(u?.lat);
  const lng = Number(u?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (u?.geocodeStatus && u.geocodeStatus !== 'ok' && u.geocodeStatus !== 'manual') {
    return null;
  }
  return { lat, lng };
}

export function necesitaGeocodeCliente(caso) {
  if (!esDireccionPredioGeocodableAlfa(caso?.direccionPredio)) return false;
  const u = caso?.ubicacionPredio;
  if (!u) return true;
  if (['stale', 'pending', 'failed'].includes(u.geocodeStatus)) return true;
  if (u.geocodeStatus === 'ok' || u.geocodeStatus === 'manual') {
    if (!(Number.isFinite(Number(u.lat)) && Number.isFinite(Number(u.lng)))) return true;
    if (u.geocodeStatus === 'ok' && !ubicacionTienePrecisionCalle(u)) return true;
    return false;
  }
  return true;
}

