/**
 * Novedades de la plataforma (letrero al iniciar sesión).
 *
 * En cada release:
 * 1. Sube NOVEDADES_VERSION (ej. 2026-09-07-a → 2026-09-07-b o fecha nueva).
 * 2. Reemplaza `items` con lo que cambió (es / en).
 * 3. Despliega. Quienes ya cerraron una versión anterior verán el letrero de nuevo.
 */
export const NOVEDADES_VERSION = '2026-09-21-a';

export const NOVEDADES = {
  version: NOVEDADES_VERSION,
  /** Título corto opcional; si vacío, el banner usa el i18n genérico. */
  titulo: {
    es: 'Novedades de la plataforma',
    en: "What's new",
  },
  items: [
    {
      es: 'En Mac/Safari la caché se limpia sola al haber un deploy nuevo. Ya no hay que vaciar caché a mano; el botón “Actualizar app” sigue por si acaso.',
      en: 'On Mac/Safari the cache now clears itself when a new deploy is live. No need to empty caches by hand; “Update app” remains as a fallback.',
    },
  ],
};

export const NOVEDADES_STORAGE_KEY = 'novedades_dismissed_version';
