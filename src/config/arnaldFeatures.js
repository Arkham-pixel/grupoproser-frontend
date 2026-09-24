/**
 * Interruptores de producto (espejo del backend). Todo APAGADO por defecto.
 * Activar solo con VITE_* en el build cuando el equipo lo autorice.
 */

function truthy(v) {
  return ['1', 'true', 'yes', 'on'].includes(String(v || '').trim().toLowerCase());
}

/** Botón / panel de videoperitaje dentro de BBVA CAT y Alfa CAT. */
export function videoperitajeEnCatHabilitado() {
  return truthy(import.meta.env.VITE_VIDEOPERITAJE_EN_CAT);
}

/** Panel Asistente Arnald (IA). No montar flujos reales hasta activarlo. */
export function arnaldIaHabilitado() {
  return truthy(import.meta.env.VITE_ARNALD_IA_ENABLED);
}

/** Módulos CAT donde se podrá lanzar videoperitaje desde el caso. */
export const MODULOS_VIDEOPERITAJE_CAT = Object.freeze({
  BBVA_CAT: 'bbva-cat',
  BBVA_CAT_LISTADO: 'bbva-cat-listado',
  SEGUROS_ALFA: 'seguros-alfa',
});
