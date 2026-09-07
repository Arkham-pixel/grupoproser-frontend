/**
 * Novedades de la plataforma (letrero al iniciar sesión).
 *
 * En cada release:
 * 1. Sube NOVEDADES_VERSION (ej. 2026-09-07-a → 2026-09-07-b o fecha nueva).
 * 2. Reemplaza `items` con lo que cambió (es / en).
 * 3. Despliega. Quienes ya cerraron una versión anterior verán el letrero de nuevo.
 */
export const NOVEDADES_VERSION = '2026-09-07-a';

export const NOVEDADES = {
  version: NOVEDADES_VERSION,
  /** Título corto opcional; si vacío, el banner usa el i18n genérico. */
  titulo: {
    es: 'Novedades de la plataforma',
    en: "What's new",
  },
  items: [
    {
      es: 'Mejoras en el registro fotográfico: conversión HEIC/HEIF a JPEG para ver y subir fotos de iPhone sin problemas.',
      en: 'Photo registry improvements: HEIC/HEIF to JPEG conversion so iPhone photos display and upload reliably.',
    },
  ],
};

export const NOVEDADES_STORAGE_KEY = 'novedades_dismissed_version';
