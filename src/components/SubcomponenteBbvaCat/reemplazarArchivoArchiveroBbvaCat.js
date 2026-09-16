/**
 * Reemplaza en el archivero BBVA los archivos que coincidan con el filtro,
 * sube el nuevo y actualiza el estado del caso.
 */
export async function reemplazarArchivosArchiveroBbvaCat({
  api,
  casoId,
  archivosActuales = [],
  file,
  etiqueta,
  origenCarga = 'ajustador',
  descripcion = '',
  coincide,
  onAppend,
  onRemoveIds,
}) {
  if (!api || !casoId || !file) return null;

  const lista = Array.isArray(archivosActuales) ? archivosActuales : [];
  const viejos = typeof coincide === 'function' ? lista.filter(coincide) : [];

  for (const arch of viejos) {
    if (!arch?._id) continue;
    try {
      await api.eliminar(casoId, arch._id);
    } catch (err) {
      console.warn('No se pudo eliminar archivo anterior del archivero BBVA:', err);
    }
  }
  if (viejos.length) onRemoveIds?.(viejos.map((a) => a._id));

  const creado = await api.subir(casoId, file, etiqueta, {
    origenCarga,
    descripcion,
  });
  onAppend?.([creado]);
  return creado;
}

export function esLiquidadorBbvaCatArchivado(arch) {
  const etiqueta = String(arch?.etiqueta || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  const nombre = String(arch?.nombreOriginal || arch?.nombre || '').toLowerCase();
  if (etiqueta.includes('LIQUIDACION') && /liquidador_bbva_cat/i.test(nombre)) return true;
  if (/liquidador_bbva_cat/i.test(nombre) && /\.(pdf|xlsx)$/i.test(nombre)) return true;
  return false;
}

export function esInformeUnicoBbvaCatArchivado(arch) {
  const etiqueta = String(arch?.etiqueta || '').toUpperCase();
  const nombre = String(arch?.nombreOriginal || arch?.nombre || '').toLowerCase();
  if (etiqueta === 'INFORME' && /informe_unico_bbva_cat/i.test(nombre)) return true;
  if (/informe_unico_bbva_cat/i.test(nombre) && /\.docx$/i.test(nombre)) return true;
  return false;
}
