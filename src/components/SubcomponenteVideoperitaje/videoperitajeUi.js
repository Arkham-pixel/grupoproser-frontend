import { DEFAULT_PROD_FRONTEND } from '../../config/platformUrls.js';

export const vpPage = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';
export const vpWrap = 'mx-auto w-full max-w-6xl';
export const vpCard =
  'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-6';
export const vpBtnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50';
export const vpBtnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';
export const vpInput =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';
export const vpLabel = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500';

export function etiquetaEstado(estado) {
  const map = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  };
  return map[estado] || estado;
}

export function etiquetaTipo(tipo) {
  return tipo === 'guided' ? 'Autoinspección' : 'Videollamada';
}

function tokenDesdeUrlOValor(urlOToken) {
  const raw = String(urlOToken || '').trim();
  if (!raw) return '';
  try {
    const path = raw.startsWith('http') ? new URL(raw).pathname : raw;
    const parte = path.split('/videoperitaje/unirse/')[1] || '';
    return decodeURIComponent(parte.split('/')[0] || '');
  } catch {
    return raw.includes('/') ? '' : raw;
  }
}

/** Enlace que se copia, envía y abre en el celular: siempre Arnald. */
export function urlPortalAsegurado(urlPublica, tokenRaw) {
  const token = tokenDesdeUrlOValor(tokenRaw) || tokenDesdeUrlOValor(urlPublica);
  if (token) return `${DEFAULT_PROD_FRONTEND}/videoperitaje/unirse/${encodeURIComponent(token)}`;
  const raw = String(urlPublica || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.hostname.endsWith('grupoproser.com.co')) return raw.replace(/\/+$/, '');
    return `${DEFAULT_PROD_FRONTEND}${u.pathname}`;
  } catch {
    return raw;
  }
}

/** Prueba en este navegador (Vite / backend local), sin ir a producción. */
export function urlPortalLocalPrueba(urlPublica, tokenRaw) {
  const token = tokenDesdeUrlOValor(tokenRaw) || tokenDesdeUrlOValor(urlPublica);
  if (!token) return '';
  return `/videoperitaje/unirse/${encodeURIComponent(token)}`;
}
