import { subirArchivoAlfa } from '../../services/segurosAlfaService.js';
import { serializarFotosInspeccion } from '../fotosInformeUnicoHelpers.js';

/**
 * Sube fotos extraídas del Excel CAT (ANEXOS) al archivero del caso Alfa.
 * @returns {{ fotosMeta: object[], nOk: number, nFail: number }}
 */
export async function subirFotosAnexosCatAlCaso({
  casoId,
  fotosAnexos = [],
  onArchivoCreado,
} = {}) {
  if (!casoId) throw new Error('Caso requerido para subir fotos del Excel CAT.');
  const lista = Array.isArray(fotosAnexos) ? fotosAnexos : [];
  const fotosMeta = [];
  let nOk = 0;
  let nFail = 0;

  for (let i = 0; i < lista.length; i += 1) {
    const foto = lista[i];
    const buffer = foto?.buffer;
    if (!buffer?.length) {
      nFail += 1;
      continue;
    }
    const mime = foto.mime || 'image/jpeg';
    const nombre = foto.nombre || `anexo-cat-${i + 1}.jpg`;
    try {
      const file = new File([buffer], nombre, { type: mime });
      const creado = await subirArchivoAlfa(casoId, file, 'FOTOS', {
        descripcion: foto.descripcion || '',
      });
      if (typeof onArchivoCreado === 'function') onArchivoCreado(creado);
      fotosMeta.push({
        _id: creado?._id ? String(creado._id) : undefined,
        ruta: typeof creado?.ruta === 'string' ? creado.ruta : '',
        nombre: creado?.nombreOriginal || nombre,
        nombreOriginal: creado?.nombreOriginal || nombre,
        descripcion: foto.descripcion || '',
        tipoMime: creado?.tipoMime || mime,
        etiqueta: 'FOTOS',
        orden: i,
      });
      nOk += 1;
    } catch (err) {
      console.error('Subir foto anexo CAT:', err);
      nFail += 1;
    }
  }

  return { fotosMeta: serializarFotosInspeccion(fotosMeta), nOk, nFail };
}

/** Fusiona fotos ya en informe con las recién subidas del Excel. */
export function fusionarFotosInspeccionAlfa(existentes = [], nuevas = []) {
  const base = serializarFotosInspeccion(existentes);
  const add = serializarFotosInspeccion(nuevas);
  const seen = new Set(base.map((f) => String(f._id || f.ruta || '')));
  const out = [...base];
  for (const f of add) {
    const key = String(f._id || f.ruta || '');
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push({ ...f, orden: out.length });
  }
  return out;
}
