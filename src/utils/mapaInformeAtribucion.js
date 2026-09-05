/**
 * Textos de pie bajo capturas de mapa en informes (Word/Excel).
 * Cumple atribución visible de Google Maps Static API / satélite.
 */

export const FUENTE_MAPA_GOOGLE =
  'Fuente del mapa: Google Maps Static API (vista satelital). Map data © Google. Imagery © Google.';

export function extraerLatLngTextoMapa(texto) {
  const parts = String(texto || '')
    .split(',')
    .map((c) => parseFloat(String(c).trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { latitud: parts[0].toFixed(6), longitud: parts[1].toFixed(6) };
  }
  return { latitud: '', longitud: '' };
}

/**
 * Líneas a mostrar debajo del mapa en informes.
 * @returns {string[]}
 */
export function lineasPieMapaInforme({
  direccion = '',
  coordenadas = '',
  incluirAtribucion = true,
} = {}) {
  const lineas = [];
  const dir = String(direccion || '').trim();
  const coordsTxt = String(coordenadas || '').trim();
  const { latitud, longitud } = extraerLatLngTextoMapa(coordsTxt);

  if (dir) lineas.push(`Dirección geográfica: ${dir}`);
  if (coordsTxt) lineas.push(`Coordenadas: ${coordsTxt}`);
  if (latitud && longitud) {
    lineas.push(`Latitud: ${latitud}    Longitud: ${longitud}`);
  }
  if (incluirAtribucion) lineas.push(FUENTE_MAPA_GOOGLE);
  return lineas;
}
