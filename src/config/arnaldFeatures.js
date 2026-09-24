/**
 * Interruptores de producto.
 * Videoperitaje en CAT: activo (BBVA / Alfa y módulos con el botón).
 * IA: solo con VITE_ARNALD_IA_ENABLED=true en el build.
 */

function truthy(v) {
  return ['1', 'true', 'yes', 'on'].includes(String(v || '').trim().toLowerCase());
}

/** Botón / panel de videoperitaje dentro de BBVA CAT, Alfa y módulos CAT. */
export function videoperitajeEnCatHabilitado() {
  // Activo por defecto; Coolify ya no puede ocultarlo por falta de VITE_*.
  return true;
}

/** Panel Asistente Arnald (IA). No montar flujos reales hasta activarlo. */
export function arnaldIaHabilitado() {
  return truthy(import.meta.env.VITE_ARNALD_IA_ENABLED);
}

/** Módulos CAT donde se puede lanzar videoperitaje desde el caso. */
export const MODULOS_VIDEOPERITAJE_CAT = Object.freeze({
  BBVA_CAT: 'bbva-cat',
  BBVA_CAT_LISTADO: 'bbva-cat-listado',
  SEGUROS_ALFA: 'seguros-alfa',
});
