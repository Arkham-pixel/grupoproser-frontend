/**
 * Interruptor global de autoguardado.
 * Desactivado hasta estabilizar la funcionalidad en todos los formularios.
 * Para reactivar: cambiar a true y probar formulario por formulario.
 */
export const AUTO_SAVE_ENABLED = false;

/** Persistencia en historial (servidor) — independiente del autoguardado en localStorage */
export const HISTORIAL_AUTO_SAVE_ENABLED = true;

export const isAutoSaveGloballyEnabled = () => AUTO_SAVE_ENABLED;
