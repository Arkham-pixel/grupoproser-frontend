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
  const byId = new Map(
    delCaso.filter((a) => a?._id).map((a) => [String(a._id), a])
  );
  const byRuta = new Map(
    delCaso.filter((a) => a?.ruta).map((a) => [String(a.ruta), a])
  );

  const delInforme = Array.isArray(guardado?.fotosInspeccion)
    ? guardado.fotosInspeccion
        .filter((f) => f && (f.ruta || f._id || f.preview || f.file))
        .map((f) => {
          const arch =
            (f._id && byId.get(String(f._id))) ||
            (f.ruta && byRuta.get(String(f.ruta))) ||
            null;
          return {
            ...f,
            descripcion:
              String(f.descripcion || '').trim() ||
              String(arch?.descripcion || '').trim() ||
              '',
            ruta: f.ruta || arch?.ruta || '',
            nombre: f.nombre || f.nombreOriginal || arch?.nombre || arch?.nombreOriginal,
            nombreOriginal:
              f.nombreOriginal || f.nombre || arch?.nombreOriginal || arch?.nombre,
            tipoMime: f.tipoMime || arch?.tipoMime || '',
          };
        })
    : [];
  if (!delInforme.length) return delCaso;
  const keys = new Set(delInforme.map((f) => String(f._id || f.ruta || '')).filter(Boolean));
  const extra = delCaso.filter((f) => !keys.has(String(f._id || f.ruta || '')));
  return [...delInforme, ...extra];
}
