import {
  actualizarArchivoBbvaCat,
  eliminarArchivoBbvaCat,
  getCasoBbvaCatById,
  subirArchivoBbvaCat,
  urlDescargaArchivoBbvaCat,
} from '../../services/bbvaCatService.js';
import {
  eliminarArchivoBbvaCatListado,
  getCasoBbvaCatListadoById,
  subirArchivoBbvaCatListado,
  urlDescargaArchivoBbvaCatListado,
} from '../../services/bbvaCatListadoService.js';

/** API de archivos según módulo (CAT vs listado). No mezclar colecciones. */
export function bbvaCatArchivosApi(origen = 'cat') {
  if (origen === 'listado') {
    return {
      getById: getCasoBbvaCatListadoById,
      subir: subirArchivoBbvaCatListado,
      eliminar: eliminarArchivoBbvaCatListado,
      actualizar: async () => null,
      url: urlDescargaArchivoBbvaCatListado,
    };
  }
  return {
    getById: getCasoBbvaCatById,
    subir: subirArchivoBbvaCat,
    eliminar: eliminarArchivoBbvaCat,
    actualizar: actualizarArchivoBbvaCat,
    url: urlDescargaArchivoBbvaCat,
  };
}
