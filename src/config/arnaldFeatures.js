/**
 * Interruptores de producto.
 * Videoperitaje en CAT: activo (BBVA / Alfa y módulos con el botón).
 * IA: oculta (no activar hasta que el equipo lo autorice).
 */

/** Botón / panel de videoperitaje dentro de BBVA CAT, Alfa y módulos CAT. */
export function videoperitajeEnCatHabilitado() {
  // Activo por defecto; Coolify ya no puede ocultarlo por falta de VITE_*.
  return true;
}

/** Panel Asistente Arnald (IA). Oculto hasta autorización explícita del equipo. */
export function arnaldIaHabilitado() {
  return false;
}

/** Módulos CAT donde se puede lanzar videoperitaje desde el caso. */
export const MODULOS_VIDEOPERITAJE_CAT = Object.freeze({
  BBVA_CAT: 'bbva-cat',
  BBVA_CAT_LISTADO: 'bbva-cat-listado',
  SEGUROS_ALFA: 'seguros-alfa',
});
