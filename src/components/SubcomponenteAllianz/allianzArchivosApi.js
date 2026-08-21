import {
  actualizarArchivoAllianz,
  eliminarArchivoAllianz,
  getCasoAllianzById,
  subirArchivoAllianz,
  urlDescargaArchivoAllianz,
} from '../../services/allianzService.js';
import {
  eliminarArchivoAllianzListado,
  getCasoAllianzListadoById,
  subirArchivoAllianzListado,
  urlDescargaArchivoAllianzListado,
} from '../../services/allianzListadoService.js';

/** API de archivos según módulo (CAT vs listado). No mezclar colecciones. */
export function allianzArchivosApi(origen = 'cat') {
  if (origen === 'listado') {
    return {
      getById: getCasoAllianzListadoById,
      subir: subirArchivoAllianzListado,
      eliminar: eliminarArchivoAllianzListado,
      actualizar: async () => null,
      url: urlDescargaArchivoAllianzListado,
    };
  }
  return {
    getById: getCasoAllianzById,
    subir: subirArchivoAllianz,
    eliminar: eliminarArchivoAllianz,
    actualizar: actualizarArchivoAllianz,
    url: urlDescargaArchivoAllianz,
  };
}
