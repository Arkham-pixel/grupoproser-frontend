/**
 * Fotos por fila del checklist NSR-10 → informe único / archivero Sura.
 */

import {
  actualizarArchivoSura,
  getCasoSuraById,
  guardarInformeUnicoEnCasoSura,
  guardarSeccionCasoSura,
  subirArchivoSura,
} from '../../services/segurosSuraService.js';
import { defaultInformeUnicoSura } from './liquidadorSuraHelpers.js';
import {
  fusionarFotosAgilEnInforme,
  anexarFotosGaleriaSinDup,
  fotosGaleriaDesdeArchiveroSura,
  serializarFotosAgilSura,
} from './informeAgilSuraHelpers.js';

export function descripcionFotoNsr(item = {}) {
  const codigo = String(item.codigo || '').trim();
  const elemento = String(item.elemento || '').trim();
  if (codigo && elemento) return `${codigo} — ${elemento}`;
  return codigo || elemento || 'Foto evaluación NSR-10';
}

/** Extrae fotos adjuntas a ítems NSR para la galería del informe. */
export function fotosInformeDesdeItemsNsr(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((it) => it?.fotoArchivoId || it?.fotoRuta)
    .map((it) => ({
      _id: it.fotoArchivoId || undefined,
      ruta: it.fotoRuta || '',
      nombre: it.fotoRef || descripcionFotoNsr(it),
      nombreOriginal: it.fotoRef || descripcionFotoNsr(it),
      descripcion: descripcionFotoNsr(it),
      codigoNsr: it.codigo || '',
      origen: 'liquidador-nsr10',
    }));
}

/**
 * Fusiona fotos NSR en fotosInspeccion sin borrar las subidas manualmente en el informe.
 * - Actualiza/inserta por `_id` o `codigoNsr`
 * - Quita entradas origen liquidador-nsr10 cuyo código ya no tiene foto
 */
export function fusionarFotosNsrEnInforme(fotosInforme = [], itemsNsr = []) {
  const desdeNsr = fotosInformeDesdeItemsNsr(itemsNsr);
  const codigosConFoto = new Set(desdeNsr.map((f) => String(f.codigoNsr || '')));
  const idsNsr = new Set(desdeNsr.map((f) => String(f._id || '')).filter(Boolean));

  const base = (Array.isArray(fotosInforme) ? fotosInforme : []).filter((f) => {
    if (f?.origen === 'liquidador-nsr10') {
      const cod = String(f.codigoNsr || '');
      if (cod && !codigosConFoto.has(cod)) return false;
      if (f._id && idsNsr.has(String(f._id))) return false; // se reinserta abajo
      if (cod && codigosConFoto.has(cod)) return false;
    }
    return true;
  });

  const sinDup = base.filter((f) => {
    if (f?._id && idsNsr.has(String(f._id))) return false;
    return true;
  });

  return [...sinDup, ...desdeNsr];
}

export async function subirFotoFilaNsrSura({ casoId, file, item }) {
  if (!casoId) throw new Error('El caso debe estar guardado para adjuntar fotos.');
  if (!file) throw new Error('Archivo de imagen requerido.');

  const creado = await subirArchivoSura(casoId, file, 'FOTOS');
  const descripcion = descripcionFotoNsr(item);
  if (creado?._id) {
    try {
      await actualizarArchivoSura(casoId, creado._id, { descripcion });
    } catch {
      /* no bloqueante */
    }
  }

  return {
    fotoRef: file.name || creado?.nombreOriginal || descripcion,
    fotoArchivoId: creado?._id ? String(creado._id) : '',
    fotoRuta: creado?.ruta || '',
    fotoPreview: '',
  };
}

/** Persiste informeUnico.fotosInspeccion sincronizado desde ítems NSR. */
export async function sincronizarFotosNsrEnInformeCaso({
  casoId,
  casoBase = {},
  itemsNsr = [],
}) {
  if (!casoId) return null;
  const baseInforme = defaultInformeUnicoSura(casoBase);
  const guardado =
    casoBase.informeUnico && typeof casoBase.informeUnico === 'object'
      ? casoBase.informeUnico
      : {};
  const informe = {
    ...baseInforme,
    ...guardado,
    fotosInspeccion: fusionarFotosNsrEnInforme(
      Array.isArray(guardado.fotosInspeccion) ? guardado.fotosInspeccion : [],
      itemsNsr
    ),
  };
  return guardarInformeUnicoEnCasoSura({
    casoId,
    informeUnico: informe,
    casoBase,
  });
}

/** Persiste fotosAgil y las copia a informeUnico.fotosInspeccion (Word / pestaña Documentos). */
export async function sincronizarFotosAgilEnInformeCaso({
  casoId,
  casoBase = {},
  fotosAgil = [],
}) {
  if (!casoId) return null;
  const lista = serializarFotosAgilSura(fotosAgil);
  const baseInforme = defaultInformeUnicoSura(casoBase);
  const guardado =
    casoBase.informeUnico && typeof casoBase.informeUnico === 'object'
      ? casoBase.informeUnico
      : {};
  const informe = {
    ...baseInforme,
    ...guardado,
    fotosInspeccion: fusionarFotosAgilEnInforme(
      Array.isArray(guardado.fotosInspeccion) ? guardado.fotosInspeccion : [],
      lista
    ),
  };
  return guardarSeccionCasoSura({
    casoId,
    casoBase,
    patch: { fotosAgil: lista, informeUnico: informe },
  });
}

/**
 * Copia fotos del archivero a fotosAgil e informeUnico.fotosInspeccion.
 * `archivoIds` limita a esos archivos; si se omite, trae todas las pendientes.
 */
export async function importarFotosArchiveroAlInformeCaso({
  casoId,
  casoBase = {},
  archivoIds = null,
} = {}) {
  if (!casoId) throw new Error('El caso debe estar guardado para traer fotos al informe.');
  const fresco = await getCasoSuraById(casoId);
  const archivos = Array.isArray(fresco?.archivos)
    ? fresco.archivos
    : Array.isArray(casoBase?.archivos)
      ? casoBase.archivos
      : [];
  const galeria = Array.isArray(fresco?.fotosAgil)
    ? fresco.fotosAgil
    : Array.isArray(casoBase?.fotosAgil)
      ? casoBase.fotosAgil
      : [];
  const idsFiltro = Array.isArray(archivoIds) && archivoIds.length
    ? new Set(archivoIds.map((id) => String(id)))
    : null;
  const extra = fotosGaleriaDesdeArchiveroSura(archivos).filter((f) =>
    idsFiltro ? idsFiltro.has(String(f._id)) : true
  );
  const mezcladas = anexarFotosGaleriaSinDup(galeria, extra);
  const prevCount = serializarFotosAgilSura(galeria).length;
  const nextCount = serializarFotosAgilSura(mezcladas).length;
  const imported = Math.max(0, nextCount - prevCount);
  if (imported === 0) {
    return { caso: fresco, imported: 0, fotosAgil: galeria };
  }
  const actualizado = await sincronizarFotosAgilEnInformeCaso({
    casoId,
    casoBase: fresco,
    fotosAgil: mezcladas,
  });
  return {
    caso: actualizado,
    imported,
    fotosAgil: Array.isArray(actualizado?.fotosAgil) ? actualizado.fotosAgil : mezcladas,
  };
}
