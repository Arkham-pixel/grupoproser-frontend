function esFotoArchivo(a) {
  const et = String(a?.etiqueta || '').toUpperCase();
  const nombre = String(a?.nombreOriginal || a?.nombreArchivo || a?.nombre || '');
  return (
    et === 'FOTOS' ||
    et === 'INSPECCION' ||
    et.startsWith('FOTO_') ||
    /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(nombre) ||
    String(a?.tipoMime || '').startsWith('image/')
  );
}

/** Quita File/blob del informe para persistir solo metadatos en Mongo. */
export function serializarFotosInspeccion(fotos = []) {
  return (Array.isArray(fotos) ? fotos : [])
    .map((f, i) => ({
      _id: f?._id ? String(f._id) : undefined,
      ruta: typeof f?.ruta === 'string' ? f.ruta : '',
      nombre: String(f?.nombre || f?.nombreOriginal || `Foto ${i + 1}`),
      nombreOriginal: String(f?.nombreOriginal || f?.nombre || `Foto ${i + 1}`),
      descripcion: String(f?.descripcion || ''),
      tipoMime: String(f?.tipoMime || ''),
      etiqueta: String(f?.etiqueta || 'FOTOS'),
      orden: Number.isFinite(Number(f?.orden)) ? Number(f.orden) : i,
    }))
    .filter((f) => f.ruta || f._id);
}

export function sanitizarInformeUnicoFotos(informe = {}) {
  if (!informe || typeof informe !== 'object') return {};
  return {
    ...informe,
    fotosInspeccion: serializarFotosInspeccion(informe.fotosInspeccion),
  };
}

/** Galería del informe: fotosInspeccion + archivos FOTOS del caso. */
export function fotosInformeDesdeCaso(caso = {}, guardado = null) {
  const delInforme = Array.isArray(guardado?.fotosInspeccion)
    ? guardado.fotosInspeccion.filter((f) => f && (f.ruta || f._id || f.preview || f.file))
    : [];
  const delCaso = (Array.isArray(caso?.archivos) ? caso.archivos : [])
    .filter(esFotoArchivo)
    .sort((a, b) => (Number(a?.orden) || 0) - (Number(b?.orden) || 0))
    .map((a, i) => ({
      _id: a._id,
      ruta: a.ruta,
      nombre: a.nombreOriginal || a.nombre || `Foto ${i + 1}`,
      nombreOriginal: a.nombreOriginal || a.nombre,
      descripcion: a.descripcion || '',
      tipoMime: a.tipoMime,
      etiqueta: a.etiqueta || 'FOTOS',
      orden: a.orden ?? i,
    }));
  if (!delInforme.length) return delCaso;
  const keys = new Set(delInforme.map((f) => String(f._id || f.ruta || '')).filter(Boolean));
  const extra = delCaso.filter((f) => !keys.has(String(f._id || f.ruta || '')));
  return [...delInforme, ...extra];
}
