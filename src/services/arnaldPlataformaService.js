import { BASE_URL } from '../config/apiConfig.js';

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

  const body = {
    formKey,
    modulo: modulo || 'plataforma',
    recursoId: recursoId || '',
    titulo: titulo || '',
    nombre: localStorage.getItem('nombre') || '',
    login: localStorage.getItem('login') || '',
    payload: sanitizarPayload(payload) || {},
    token,
  };

  if (keepalive && typeof navigator !== 'undefined') {
    try {
      await fetch(`${BASE_URL}/api/arnald-drafts`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
        keepalive: true,
      });
      return { ok: true };
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

  const response = await fetchConReintento(`${BASE_URL}/api/arnald-drafts`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status} al guardar borrador`);
  }
  return response.json();
}

async function fetchConReintento(url, options, intentos = 3) {
  let ultimo = null;
  for (let i = 0; i < intentos; i += 1) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      ultimo = new Error(`Error ${res.status}`);
    } catch (error) {
      ultimo = error;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw ultimo || new Error('No se pudo guardar el borrador');
}

export async function obtenerBorradorArnald(formKey) {
  const token = localStorage.getItem('token');
  if (!token || !formKey) return null;
  const response = await fetch(
    `${BASE_URL}/api/arnald-drafts?formKey=${encodeURIComponent(formKey)}`,
    { headers: authHeaders() }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data?.draft || null;
}

export async function eliminarBorradorArnald(formKey) {
  const token = localStorage.getItem('token');
  if (!token || !formKey) return;
  await fetch(`${BASE_URL}/api/arnald-drafts?formKey=${encodeURIComponent(formKey)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function listarMisBorradoresArnald() {
  const token = localStorage.getItem('token');
  if (!token) return [];
  const response = await fetch(`${BASE_URL}/api/arnald-drafts/mios`, {
    headers: authHeaders(),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data?.items) ? data.items : [];
}

export async function listarLogsArnald(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const response = await fetch(`${BASE_URL}/api/arnald-logs?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Error ${response.status}`);
  }
  return response.json();
}

export async function listarBorradoresAdminArnald(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const response = await fetch(`${BASE_URL}/api/arnald-drafts/admin?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Error ${response.status}`);
  }
  return response.json();
}

export async function registrarNavegacionArnald({ ruta, titulo, modulo } = {}) {
  const token = localStorage.getItem('token');
  if (!token || !ruta) return;
  try {
    await fetch(`${BASE_URL}/api/arnald-logs/evento`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        accion: 'NAVIGATE',
        ruta,
        titulo: titulo || '',
        modulo: modulo || '',
        nombre: localStorage.getItem('nombre') || '',
        resumen: titulo ? `${titulo} (${ruta})` : ruta,
      }),
    });
  } catch {
    // La navegación no debe fallar por el log
  }
}
