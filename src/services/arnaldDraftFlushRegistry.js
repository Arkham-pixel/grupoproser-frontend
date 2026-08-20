/**
 * Varios formularios CAT pueden estar montados a la vez (carga + workspace).
 * Hay que vaciar todos al cerrar sesión, no solo el último.
 */
const flushers = new Map();
let seq = 0;

export function registerArnaldDraftFlusher(fn) {
  if (typeof fn !== 'function') return () => {};
  const id = ++seq;
  flushers.set(id, fn);
  return () => {
    flushers.delete(id);
  };
}

export async function flushArnaldDraftsNow({ keepalive = true } = {}) {
  const lista = [...flushers.values()];
  if (!lista.length) return false;
  const resultados = await Promise.allSettled(
    lista.map((fn) => fn({ keepalive, force: true }))
  );
  return resultados.some((r) => r.status === 'fulfilled');
}
