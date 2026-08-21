import { subirArchivoAlfa } from '../../services/segurosAlfaService.js';

const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Sube un blob al archivero del caso (ARNALD → cola SharePoint SINIESTROS).
 * @returns {Promise<object|null>} archivo creado o null si no hay caso/blob
 */
export async function archivarBlobEnCasoAlfa({
  casoId,
  blob,
  nombre,
  mime = MIME.xlsx,
  etiqueta = 'GENERAL',
} = {}) {
  if (!casoId) {
    throw new Error('Guarde el caso antes de copiar al archivero.');
  }
  if (!blob || !nombre) {
    throw new Error('No hay archivo para archivar.');
  }
  const file = new File([blob], nombre, { type: mime || MIME.xlsx });
  return subirArchivoAlfa(casoId, file, etiqueta || 'GENERAL');
}

export { MIME as MIME_ARCHIVO_ALFA };
