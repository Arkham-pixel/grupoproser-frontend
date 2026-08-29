import {
  eliminarArchivoEquidadCat,
  getCasoEquidadCatById,
  subirArchivoEquidadCat,
  urlDescargaArchivoEquidadCat,
} from '../../services/equidadCatService.js';

/** API de archivos del módulo Equidad CAT (colección única de listado). */
export function equidadCatArchivosApi() {
  return {
    getById: getCasoEquidadCatById,
    subir: subirArchivoEquidadCat,
    eliminar: eliminarArchivoEquidadCat,
    actualizar: async () => null,
    url: urlDescargaArchivoEquidadCat,
  };
}
