/**
 * Detección de conectividad real (no solo navigator.onLine).
 * Cachea el resultado para evitar spam de probes/logs.
 */
import { BASE_URL } from '../config/apiConfig.js';
import { offlineLog } from '../offline/offlineLog.js';

const PROBE_TTL_MS = 10_000;
let lastProbe = {
  ok: typeof navigator !== 'undefined' ? navigator.onLine : true,
  at: 0,
  status: null,
};
let inFlight = null;

function setProbe(ok, meta = {}) {
  const changed = lastProbe.ok !== ok;
  lastProbe = { ok, at: Date.now(), status: meta.status ?? lastProbe.status ?? null };
  if (changed) {
    offlineLog(ok ? 'CONNECTIVITY_OK' : 'CONNECTIVITY_FAIL', meta);
  }
  return ok;
}

/**
 * @param {{ timeoutMs?: number, force?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function checkConnectivity({ timeoutMs = 4000, force = false } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return setProbe(false, { reason: 'navigator.offLine' });
  }

  if (!force && Date.now() - lastProbe.at < PROBE_TTL_MS) {
    return lastProbe.ok;
  }

  if (inFlight && !force) return inFlight;

  inFlight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `${BASE_URL}/api/health?_=${Date.now()}`;
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        credentials: 'omit',
      });
      // Solo 2xx cuenta como OK. Un 404 significa backend sin ruta health (o URL incorrecta).
      if (res.ok) {
        return setProbe(true, { status: res.status });
      }
      // Si el health no existe aún, probar un endpoint liviano conocido
      if (res.status === 404) {
        return probeHistorialReachable(timeoutMs, controller);
      }
      return setProbe(false, { status: res.status, reason: 'health_not_ok' });
    } catch (err) {
      try {
        return await probeHistorialReachable(timeoutMs, controller);
      } catch {
        return setProbe(false, { error: err?.message || 'network' });
      }
    } finally {
      clearTimeout(timer);
      inFlight = null;
    }
  })();

  return inFlight;
}

async function probeHistorialReachable(timeoutMs, parentController) {
  const signal =
    typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? AbortSignal.timeout(timeoutMs)
      : parentController.signal;
  const res2 = await fetch(`${BASE_URL}/api/historial-formularios?limite=1`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
    signal,
  });
  // Cualquier respuesta HTTP del API = servidor alcanzable (incl. 401).
  // 0 / network error no llega aquí.
  const reachable = res2.status > 0 && res2.status < 500;
  return setProbe(reachable, {
    fallback: true,
    status: res2.status,
  });
}

/** Marca offline tras un fallo de red en sync (sin esperar TTL). */
export function markConnectivityLost(reason = 'sync_fetch_failed') {
  setProbe(false, { reason });
}

export function getLastConnectivityProbe() {
  return { ...lastProbe };
}

export function subscribeConnectivity(onChange) {
  const handleOnline = async () => {
    const ok = await checkConnectivity({ force: true });
    onChange(ok);
  };
  const handleOffline = () => {
    setProbe(false, { reason: 'navigator.offLine' });
    onChange(false);
  };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
