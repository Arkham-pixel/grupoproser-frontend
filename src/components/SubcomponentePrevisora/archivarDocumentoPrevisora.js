const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const REPLACE_SLOTS = new Set([
  'LIQUIDACION',
  'FINIQUITO',
  'INFORME',
  'INFORME_PRELIMINAR',
  'INFORME_UNICO',
  'INFORME_FINAL',
  'DESPRENDIBLE_CAT',
]);

/**
 * Sube un blob al archivero del caso. Informes/liquidación/finiquito
 * se guardan como última versión (misma etiqueta + extensión).
 */
export async function archivarBlobEnCasoPrevisora({
  subir,
  casoId,
  blob,
  nombre,
  mime = MIME.docx,
  etiqueta = 'GENERAL',
  replaceSameSlot,
} = {}) {
  if (!casoId) {
    throw new Error('Guarde el caso antes de copiar al archivero.');
  }
  if (!blob || !nombre || typeof subir !== 'function') {
    throw new Error('No hay archivo para archivar.');
  }
  const et = String(etiqueta || 'GENERAL').trim().toUpperCase() || 'GENERAL';
  const shouldReplace =
    typeof replaceSameSlot === 'boolean' ? replaceSameSlot : REPLACE_SLOTS.has(et);
  const file = new File([blob], nombre, { type: mime || MIME.docx });
  return subir(casoId, file, et, { replaceSameSlot: shouldReplace });
}

export { MIME as MIME_ARCHIVO_PREVISORA, REPLACE_SLOTS as PREVISORA_ARCHIVO_REPLACE_SLOTS };
