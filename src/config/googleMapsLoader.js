/**
 * Opciones únicas para `@react-google-maps/api` → `useJsApiLoader`.
 * El Loader de Google Maps no permite reiniciarse con `id`/`libraries` distintos
 * en la misma sesión (rompe al navegar entre Informe y Bloques Alfa).
 */

export const GOOGLE_MAPS_LOADER_ID = 'script-loader';

/** Debe ser la misma referencia/array en todos los callers. */
export const GOOGLE_MAPS_LIBRARIES = Object.freeze(['places']);

export function googleMapsLoaderOptions(apiKey = '') {
  return {
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey:
      apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  };
}
