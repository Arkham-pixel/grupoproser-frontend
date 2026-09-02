/**
 * Líderes de cada área CAT. Espejo de grupoproser-backend/utils/lideresModuloCatastrofico.js
 */
export const LIDERES_AREA_CATASTROFICO = Object.freeze([
  { clave: 'zurich', needles: ['LADYS'], fuentes: ['zurich', 'zurichListado'] },
  { clave: 'sura', needles: ['BERNARDO'], fuentes: ['sura'] },
  { clave: 'previsora', needles: ['ISKHARLY'], fuentes: ['previsora', 'previsoraListado'] },
  { clave: 'allianz', needles: ['PINILLA'], fuentes: ['allianz', 'allianzListado'] },
  { clave: 'bbva', needles: ['BAEZ'], fuentes: ['bbvaCat', 'bbvaCatListado'] },
  { clave: 'equidad', needles: ['ARNALDO'], fuentes: ['equidadCat'] },
  { clave: 'alfa', needles: ['SILVIA'], fuentes: ['alfa'] },
]);

export function claveFuenteAgenda(modulo = '') {
  return String(modulo || '')
    .toLowerCase()
    .replace(/[-_\s]/g, '');
}

function haystackNombre(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .trim()
    .toUpperCase();
}

export function needlesLiderModulo(modulo = '') {
  const c = claveFuenteAgenda(modulo);
  if (c === 'alfa' || c === 'segurosalfa') return ['SILVIA'];
  if (c === 'sura' || c === 'segurossura') return ['BERNARDO'];
  if (c.includes('zurich')) return ['LADYS'];
  if (c.includes('bbva')) return ['BAEZ'];
  if (c.includes('previsora')) return ['ISKHARLY'];
  if (c.includes('allianz')) return ['PINILLA'];
  if (c.includes('equidad')) return ['ARNALDO'];
  return [];
}

export function identidadCoincideNeedlesLider(identidad = {}, needles = []) {
  const hay = haystackNombre(identidad.name || identidad.nombre || '');
  if (!hay) return false;
  return (needles || []).some((n) => hay.includes(haystackNombre(n)));
}

export function identidadEsLiderDeFuente(identidad = {}, modulo = '') {
  return identidadCoincideNeedlesLider(identidad, needlesLiderModulo(modulo));
}
