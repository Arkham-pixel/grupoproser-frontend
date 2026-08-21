import { subirArchivoAlfa } from '../../services/segurosAlfaService.js';

const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Etiquetas de documentos generados que deben sobrescribirse (no acumular copias). */
const REPLACE_SLOTS = new Set(['LIQUIDACION', 'INFORME']);

/**
 * Sube un blob al archivero del caso (ARNALD → cola SharePoint SINIESTROS).
 * Para LIQUIDACION / INFORME sobrescribe el archivo del mismo slot (etiqueta + extensión).
 * @returns {Promise<object|null>} archivo creado/actualizado
 */
export async function archivarBlobEnCasoAlfa({
  casoId,
  blob,
  nombre,
  mime = MIME.xlsx,
  etiqueta = 'GENERAL',
  replaceSameSlot,
} = {}) {
  if (!casoId) {
    throw new Error('Guarde el caso antes de copiar al archivero.');
  }
  if (!blob || !nombre) {
    throw new Error('No hay archivo para archivar.');
  }
  const et = String(etiqueta || 'GENERAL').trim().toUpperCase() || 'GENERAL';
  const shouldReplace =
    typeof replaceSameSlot === 'boolean'
      ? replaceSameSlot
      : REPLACE_SLOTS.has(et);

  const file = new File([blob], nombre, { type: mime || MIME.xlsx });
  return subirArchivoAlfa(casoId, file, et, { replaceSameSlot: shouldReplace });
}

export { MIME as MIME_ARCHIVO_ALFA, REPLACE_SLOTS as ALFA_ARCHIVO_REPLACE_SLOTS };
