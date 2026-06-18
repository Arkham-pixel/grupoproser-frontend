/**
 * Registro de handlers para sincronizar con el servidor al volver la conexión.
 * Cada formulario activo registra su función de guardado en servidor.
 */

const handlers = new Map();
let listenerAttached = false;

async function flushAllHandlers() {
  const entries = Array.from(handlers.entries());
  for (const [, handler] of entries) {
    try {
      await handler();
    } catch (error) {
      console.warn('[offline-sync] Error al sincronizar formulario:', error);
    }
  }
}

function attachGlobalOnlineListener() {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;
  window.addEventListener('online', () => {
    flushAllHandlers();
  });
}

export function registerOfflineSyncHandler(syncKey, handler) {
  if (!syncKey || typeof handler !== 'function') return;
  attachGlobalOnlineListener();
  handlers.set(syncKey, handler);
}

export function unregisterOfflineSyncHandler(syncKey) {
  if (!syncKey) return;
  handlers.delete(syncKey);
}

export function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export async function flushOfflineSyncNow() {
  await flushAllHandlers();
}

export async function flushOfflineSyncHandler(syncKey) {
  const handler = handlers.get(syncKey);
  if (handler) {
    await handler();
  }
}
