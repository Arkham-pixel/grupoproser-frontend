import { BASE_URL } from '../config/apiConfig.js';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function leerJson(response) {
  const texto = await response.text();
  if (!texto) {
    throw new Error(`Respuesta vacía del servidor (${response.status})`);
  }
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }
}

export async function obtenerMisNotificacionesOperativas({ limit = 40 } = {}) {
  const login = localStorage.getItem('login') || localStorage.getItem('cedula') || '';
  const qs = new URLSearchParams({ limit: String(limit) });
  if (login) qs.set('login', login);
  const response = await fetch(`${BASE_URL}/api/notificaciones-operativas/mias?${qs}`, {
    headers: { Accept: 'application/json', ...authHeaders() },
    cache: 'no-store',
  });
  if (response.status === 401 || response.status === 403) {
    return { total: 0, noLeidas: 0, data: [] };
  }
  if (!response.ok) {
    throw new Error(`Error al cargar notificaciones (${response.status})`);
  }
  const json = await leerJson(response);
  return {
    total: json.total ?? 0,
    noLeidas: json.noLeidas ?? 0,
    data: Array.isArray(json.data) ? json.data : [],
  };
}

export async function marcarNotificacionOperativaLeida(id) {
  const response = await fetch(
    `${BASE_URL}/api/notificaciones-operativas/${encodeURIComponent(id)}/leer`,
    {
      method: 'PATCH',
      headers: { Accept: 'application/json', ...authHeaders() },
    }
  );
  if (!response.ok) {
    throw new Error(`No se pudo marcar la notificación (${response.status})`);
  }
  return leerJson(response);
}

export async function marcarTodasNotificacionesOperativasLeidas() {
  const response = await fetch(`${BASE_URL}/api/notificaciones-operativas/leer-todas`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!response.ok) {
    throw new Error(`No se pudieron marcar las notificaciones (${response.status})`);
  }
  return leerJson(response);
}
