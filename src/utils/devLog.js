/** Logs solo visibles en desarrollo (localhost / Vite). */
const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    /^51(73|74|75)$/.test(window.location.port) ||
    window.location.port === '3000');

export function devLog(...args) {
  if (isDev) console.log(...args);
}

export function devWarn(...args) {
  if (isDev) console.warn(...args);
}

export function devGroup(label) {
  if (isDev) console.group(label);
}

export function devGroupEnd() {
  if (isDev) console.groupEnd();
}
