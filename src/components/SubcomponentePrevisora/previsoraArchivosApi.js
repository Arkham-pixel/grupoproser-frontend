import {
  actualizarArchivoPrevisora,
  eliminarArchivoPrevisora,
  getCasoPrevisoraById,
  subirArchivoPrevisora,
  urlDescargaArchivoPrevisora,
} from '../../services/previsoraService.js';
import {
  eliminarArchivoPrevisoraListado,
  getCasoPrevisoraListadoById,
  subirArchivoPrevisoraListado,
  urlDescargaArchivoPrevisoraListado,
} from '../../services/previsoraListadoService.js';

/** API de archivos según módulo (CAT vs listado). No mezclar colecciones. */
export function previsoraArchivosApi(origen = 'cat') {
  if (origen === 'listado') {
    return {
      getById: getCasoPrevisoraListadoById,
      subir: subirArchivoPrevisoraListado,
      eliminar: eliminarArchivoPrevisoraListado,
      actualizar: async () => null,
      url: urlDescargaArchivoPrevisoraListado,
    };
  }
  return {
    getById: getCasoPrevisoraById,
    subir: subirArchivoPrevisora,
    eliminar: eliminarArchivoPrevisora,
    actualizar: actualizarArchivoPrevisora,
    url: urlDescargaArchivoPrevisora,
  };
}
