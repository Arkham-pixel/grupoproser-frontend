/**
 * Logging centralizado del frontend.
 * - Siempre: un banner de entorno al arrancar (desarrollo vs producción).
 * - Depuración: solo con VITE_DEBUG_LOGS=true en .env
 */

export const isDebugEnabled = import.meta.env.VITE_DEBUG_LOGS === 'true';

export function debug(...args) {
  if (isDebugEnabled) console.log(...args);
}

export function warn(...args) {
  console.warn(...args);
}

export function logAppEnvironment({ isDev, apiUrl, storageHint }) {
  if (typeof window === 'undefined') return;
  if (window.__ARNALD_ENV_LOGGED__) return;
  window.__ARNALD_ENV_LOGGED__ = true;

  const label = isDev ? 'DESARROLLO' : 'PRODUCCIÓN';
  const color = isDev ? '#0d9488' : '#2563eb';

  console.info(
    `%cArnald DataFlow · ${label}`,
    `color:${color};font-weight:700;font-size:13px`,
    `\n  API: ${apiUrl}\n  Archivos: ${storageHint}${
      isDebugEnabled ? '\n  Logs detallados: activados (VITE_DEBUG_LOGS=true)' : ''
    }`
  );
}
