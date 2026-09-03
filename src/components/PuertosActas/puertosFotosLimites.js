/** Sin tope de cantidad: se conservan todas las fotos al cargar/guardar. */

export const MAX_FOTOS_SECCION_INSPECCION_ASEGURADO = Number.POSITIVE_INFINITY;

export function validarLimiteFotosInspeccion() {
  return true;
}

export function recortarFotosInspeccionAlLimite(formData = {}) {
  return { datos: formData, huboRecorte: false };
}
