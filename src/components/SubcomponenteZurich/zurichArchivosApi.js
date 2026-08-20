import {
  eliminarArchivoZurich,
  getCasoZurichById,
  subirArchivoZurich,
  urlDescargaArchivoZurich,
} from '../../services/zurichService.js';
import {
  eliminarArchivoZurichListado,
  getCasoZurichListadoById,
  subirArchivoZurichListado,
  urlDescargaArchivoZurichListado,
} from '../../services/zurichListadoService.js';

/** API de archivos según módulo (CAT vs listado). No mezclar colecciones. */
export function zurichArchivosApi(origen = 'cat') {
  if (origen === 'listado') {
    return {
      getById: getCasoZurichListadoById,
      subir: subirArchivoZurichListado,
      eliminar: eliminarArchivoZurichListado,
      url: urlDescargaArchivoZurichListado,
    };
  }
  return {
    getById: getCasoZurichById,
    subir: subirArchivoZurich,
    eliminar: eliminarArchivoZurich,
    url: urlDescargaArchivoZurich,
  };
}
