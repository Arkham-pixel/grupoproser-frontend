/**
 * Novedades de la plataforma (letrero al iniciar sesión).
 *
 * En cada release:
 * 1. Sube NOVEDADES_VERSION (ej. 2026-09-07-a → 2026-09-07-b o fecha nueva).
 * 2. Reemplaza `items` con lo que cambió (es / en).
 * 3. Despliega. Quienes ya cerraron una versión anterior verán el letrero de nuevo.
 */
export const NOVEDADES_VERSION = '2026-09-19-a';

export const NOVEDADES = {
  version: NOVEDADES_VERSION,
  /** Título corto opcional; si vacío, el banner usa el i18n genérico. */
  titulo: {
    es: 'Novedades de la plataforma',
    en: "What's new",
  },
  items: [
    {
      es: 'En Mac/Safari las actualizaciones a veces no se veían por la caché. La app ahora se actualiza sola y hay un botón “Actualizar ahora” para limpiar caché.',
      en: 'On Mac/Safari updates sometimes stayed cached. The app now refreshes itself, and there is an “Update now” button to clear cache.',
    },
  ],
};

export const NOVEDADES_STORAGE_KEY = 'novedades_dismissed_version';
