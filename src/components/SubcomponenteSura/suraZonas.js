/** Zonas de atención SURA pedidas para asignar inspectores. */

function norm(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

const CIUDADES_NORTE_VALLE = new Set(
  [
    'CARTAGO',
    'ZARZAL',
    'ROLDANILLO',
    'LA UNION',
    'TORO',
    'OBANDO',
    'ALCALA',
    'ANSERMANUEVO',
    'ARGELIA',
    'BOLIVAR',
    'EL AGUILA',
    'EL CAIRO',
    'EL DOVIO',
    'VERSALLES',
    'ULLOA',
    'SEVILLA',
    'CAICEDONIA',
  ].map(norm)
);

export const ZONAS_ATENCION_SURA = ['Zona Cafetera', 'Occidente', 'Chocó', 'Otros'];

export function zonaAtencionSura(caso = {}) {
  const depto = norm(caso.departamento || caso.departamentoCiudad);
  const ciudad = norm(caso.ciudad || caso.nombreCiudad || caso.ciudadSiniestro);

  if (depto.includes('CHOCO') || ciudad.includes('QUIBDO')) return 'Chocó';

  if (depto.includes('CALDAS') || depto.includes('RISARALDA')) return 'Zona Cafetera';
  if (depto.includes('VALLE') && CIUDADES_NORTE_VALLE.has(ciudad)) return 'Zona Cafetera';

  if (
    depto.includes('VALLE') ||
    depto.includes('CAUCA') ||
    depto.includes('NARINO')
  ) {
    return 'Occidente';
  }

  return 'Otros';
}

export function sugerenciaInspectorZonaSura(zona) {
  if (zona === 'Occidente') return 'Jimmy (Buenaventura / Occidente)';
  return '';
}
