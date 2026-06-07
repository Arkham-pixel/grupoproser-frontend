/**
 * Mapeo de dominios públicos (Arnald).
 * Un solo build de Vite sirve en principal y respaldo; el DNS apunta al activo.
 */

export const DEFAULT_PROD_BACKEND = 'https://arnaldbackend.grupoproser.com.co';
export const DEFAULT_PROD_FRONTEND = 'https://arnald.grupoproser.com.co';

/** Hostname del navegador → URL base del API */
export const API_BY_FRONTEND_HOST = {
  'arnald.grupoproser.com.co': DEFAULT_PROD_BACKEND,
  'aplicacion.grupoproser.com.co': 'https://aplicacion.grupoproser.com.co',
};

/** Referencia operativa Coolify (no usada en runtime del cliente). */
export const COOLIFY_SERVERS = Object.freeze({
  principal: '52.20.220.24',
  respaldo: '18.119.83.81',
});
