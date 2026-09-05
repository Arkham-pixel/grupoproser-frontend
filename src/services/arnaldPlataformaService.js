import { BASE_URL } from '../config/apiConfig.js';
import { isTokenNearExpiry, refreshToken } from './api.js';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function sanitizarPayload(valor, profundidad = 0) {
  if (valor == null) return valor;
  if (profundidad > 8) return undefined;
  if (typeof valor === 'string') {
    if (valor.startsWith('data:')) return '[archivo-omitido]';
    if (valor.length > 40000) return `${valor.slice(0, 200)}…`;
    return valor;
  }
  if (typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) {
    return valor.slice(0, 200).map((item) => sanitizarPayload(item, profundidad + 1));
  }
  const limpio = {};
  for (const [clave, item] of Object.entries(valor)) {
    if (clave === 'historialDocs' || clave === 'password' || clave === 'pswd' || clave === 'token') {
      continue;
    }
    const sanitizado = sanitizarPayload(item, profundidad + 1);
    if (sanitizado !== undefined) limpio[clave] = sanitizado;
  }
  return limpio;
}

function buildDraftBody({ formKey, modulo, recursoId, titulo, payload }) {
  return {
    formKey,
    modulo: modulo || 'plataforma',
    recursoId: recursoId || '',
    titulo: titulo || '',
    nombre: localStorage.getItem('nombre') || '',
    login: localStorage.getItem('login') || '',
    payload: sanitizarPayload(payload) || {},
    token: localStorage.getItem('token') || '',
  };
}

/** True si el JWT ya expiró (o no se puede leer). */
function tokenYaExpiro(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return payload.exp <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

/**
 * Renueva el JWT si está por vencer.
 * A diferencia del flujo offline de refreshToken, aquí no devolvemos un token ya vencido
 * (evita POST de telemetría → 403 en consola).
 */
async function asegurarTokenValido() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (!isTokenNearExpiry(token, 1)) return token;
  const renovado = await refreshToken(true);
  if (!renovado || tokenYaExpiro(renovado)) return null;
  return renovado;
}

/** Tras un fallo de auth en telemetría, no seguir spameando la red esta sesión. */
let telemetriaNavegacionPausada = false;

/**
 * fetch con renovación preventiva y reintento ante 401/403.
 */
async function fetchConAuth(url, options = {}, { intentos = 3, renovar = true } = {}) {
  let ultimo = null;
  let yaRenovo = false;

  if (renovar) {
    const ok = await asegurarTokenValido();
    if (!ok) throw new Error('Error 401');
  }

  for (let i = 0; i < intentos; i += 1) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders(),
          ...(options.headers || {}),
        },
      });
      if (res.ok) return res;

      if (
        renovar &&
        !yaRenovo &&
        (res.status === 401 || res.status === 403)
      ) {
        yaRenovo = true;
        const nuevo = await refreshToken(true);
        if (nuevo) {
          ultimo = new Error(`Error ${res.status}`);
          continue;
        }
      }

      ultimo = new Error(`Error ${res.status}`);
      if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403) {
        break;
      }
      if ((res.status === 401 || res.status === 403) && yaRenovo) {
        break;
      }
    } catch (error) {
      ultimo = error;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw ultimo || new Error('No se pudo completar la petición');
}

export async function guardarBorradorArnald({
  formKey,
  modulo,
  recursoId,
  titulo,
  payload,
  keepalive = false,
}) {
  const token = localStorage.getItem('token');
  if (!token || !formKey) return null;

  if (!keepalive) {
    const fresco = await asegurarTokenValido();
    if (!fresco) return null;
  }

  const body = buildDraftBody({ formKey, modulo, recursoId, titulo, payload });

  if (keepalive && typeof navigator !== 'undefined') {
    try {
      const res = await fetch(`${BASE_URL}/api/arnald-drafts`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (res.ok) return { ok: true };
      // Token vencido al cerrar pestaña: beacon acepta JWT decodificado
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
        navigator.sendBeacon(`${BASE_URL}/api/arnald-drafts/beacon`, blob);
        return { ok: true, beacon: true };
      }
      return { ok: false };
    } catch {
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
          navigator.sendBeacon(`${BASE_URL}/api/arnald-drafts/beacon`, blob);
          return { ok: true, beacon: true };
        }
      } catch {
        return null;
      }
      return null;
    }
  }

  const response = await fetchConAuth(`${BASE_URL}/api/arnald-drafts`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function obtenerBorradorArnald(formKey) {
  const token = localStorage.getItem('token');
  if (!token || !formKey) return null;
  try {
    const response = await fetchConAuth(
      `${BASE_URL}/api/arnald-drafts?formKey=${encodeURIComponent(formKey)}`,
      { method: 'GET' },
      { intentos: 2 }
    );
    const data = await response.json();
    return data?.draft || null;
  } catch {
    return null;
  }
}

export async function eliminarBorradorArnald(formKey) {
  const token = localStorage.getItem('token');
  if (!token || !formKey) return;
  try {
    await fetchConAuth(
      `${BASE_URL}/api/arnald-drafts?formKey=${encodeURIComponent(formKey)}`,
      { method: 'DELETE' },
      { intentos: 2 }
    );
  } catch {
    // best-effort
  }
}

export async function listarMisBorradoresArnald() {
  const token = localStorage.getItem('token');
  if (!token) return [];
  try {
    const response = await fetchConAuth(`${BASE_URL}/api/arnald-drafts/mios`, {
      method: 'GET',
    }, { intentos: 2 });
    const data = await response.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function listarLogsArnald(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const response = await fetchConAuth(`${BASE_URL}/api/arnald-logs?${query.toString()}`, {
    method: 'GET',
  });
  return response.json();
}

export async function listarBorradoresAdminArnald(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const response = await fetchConAuth(
    `${BASE_URL}/api/arnald-drafts/admin?${query.toString()}`,
    { method: 'GET' }
  );
  return response.json();
}

export async function registrarNavegacionArnald({ ruta, titulo, modulo } = {}) {
  const token = localStorage.getItem('token');
  if (!token || !ruta) return;

  // Tras re-login en la misma pestaña, reanudar telemetría si el JWT ya es válido.
  if (telemetriaNavegacionPausada && !tokenYaExpiro(token)) {
    telemetriaNavegacionPausada = false;
  }
  if (telemetriaNavegacionPausada) return;

  try {
    const fresco = await asegurarTokenValido();
    if (!fresco) {
      telemetriaNavegacionPausada = true;
      return;
    }

    // Un solo intento, sin reintentos: un 4xx no debe repetirse ni spamear consola.
    const res = await fetch(`${BASE_URL}/api/arnald-logs/evento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${fresco}`,
      },
      body: JSON.stringify({
        accion: 'NAVIGATE',
        ruta,
        titulo: titulo || '',
        modulo: modulo || '',
        nombre: localStorage.getItem('nombre') || '',
        resumen: titulo ? `${titulo} (${ruta})` : ruta,
      }),
    });
    if (res.status === 401 || res.status === 403) {
      telemetriaNavegacionPausada = true;
    }
  } catch {
    // Telemetría: nunca debe romper la UI
  }
}
