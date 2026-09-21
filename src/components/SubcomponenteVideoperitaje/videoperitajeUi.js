function trimOrigin(url) {
  return typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';
}

export function hostEsPrivado(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

export function urlLivekitEsPrivada(url) {
  try {
    return hostEsPrivado(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function paginaEsArnaldPublico() {
  return typeof window !== 'undefined' && /\.grupoproser\.com\.co$/i.test(window.location.hostname);
}

/** En Arnald no se conecta a LiveKit de localhost/LAN: Chrome pide “red local”. */
export function livekitUsableEnEstaPagina(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'livekit.grupoproser.com.co') return false;
    if (paginaEsArnaldPublico() && hostEsPrivado(host)) return false;
  } catch {
    return false;
  }
  return true;
}

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

/** Enlace que se copia: el que armó el backend (.env), sin reescribir a producción. */
export function urlPortalAsegurado(urlPublica, tokenRaw) {
  const raw = String(urlPublica || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  const token = tokenDesdeUrlOValor(tokenRaw) || tokenDesdeUrlOValor(urlPublica);
  const base =
    trimOrigin(import.meta.env.VITE_VIDEOPERITAJE_PUBLIC_URL) ||
    trimOrigin(import.meta.env.VITE_API_BASE_URL);
  if (token && base) return `${base}/videoperitaje/unirse/${encodeURIComponent(token)}`;
  if (token) return `/videoperitaje/unirse/${encodeURIComponent(token)}`;
  return raw;
}

/** Prueba en este navegador (Vite / backend local), sin ir a producción. */
export function urlPortalLocalPrueba(urlPublica, tokenRaw) {
  const token = tokenDesdeUrlOValor(tokenRaw) || tokenDesdeUrlOValor(urlPublica);
  if (!token) return '';
  return `/videoperitaje/unirse/${encodeURIComponent(token)}`;
}
