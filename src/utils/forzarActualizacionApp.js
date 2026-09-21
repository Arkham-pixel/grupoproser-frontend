export const ARNALD_BUILD_STORAGE_KEY = 'arnald_build_id';

/** Borra Service Worker y Cache Storage (Safari/Mac no lo hacen solos). */
export async function limpiarCachePwa() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    /* Safari privado / permisos */
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Quita el Service Worker y la caché de la PWA, luego recarga.
 * Safari / Mac suelen seguir sirviendo el build viejo si no se hace esto.
 */
export async function forzarActualizacionApp() {
  await limpiarCachePwa();
  const url = new URL(window.location.href);
  url.searchParams.set('_r', String(Date.now()));
  window.location.replace(url.toString());
}
