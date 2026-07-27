import { BASE_URL } from '../config/apiConfig.js';

function authHeaders(extra = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const login = typeof localStorage !== 'undefined' ? localStorage.getItem('login') : null;
  // Solo cabeceras ya permitidas en CORS del backend (evitar preflight Failed to fetch)
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (login) headers['X-Usuario-Login'] = login;
  return headers;
}

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.message || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function obtenerResumenSubtareasCaso(casoId) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/caso/${casoId}/resumen`, {
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function listarSubtareasCaso(casoId) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/caso/${casoId}`, {
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function crearSubtareaCaso(casoId, payload) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/caso/${casoId}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function actualizarSubtarea(id, payload) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function reasignarSubtarea(id, payload) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/${id}/reasignar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function cancelarSubtarea(id) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function reenviarSubtarea(id) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/${id}/reenviar`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function subirArchivoSubtarea(id, file, options = {}) {
  const form = new FormData();
  form.append('file', file);
  form.append('tipoArchivo', options.tipoArchivo === 'formato' ? 'formato' : 'documento');
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/${id}/archivos`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return parseJson(res);
}

export async function obtenerMisSubtareas() {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/mias`, {
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function obtenerSubtareaPorId(id) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/${id}`, {
    headers: authHeaders(),
  });
  return parseJson(res);
}

export async function obtenerSubtareaPublica(token) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/public/${token}`);
  return parseJson(res);
}

export async function actualizarSubtareaPublica(token, payload) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/public/${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

/**
 * Sesión limitada (rol externo) para diligenciar el formulario de ajuste real
 * de la plataforma desde el enlace de la subtarea.
 */
export async function crearSesionAjusteExterna(token) {
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/public/${token}/sesion-ajuste`, {
    method: 'POST',
  });
  return parseJson(res);
}

export async function subirArchivoSubtareaPublica(token, file, options = {}) {
  const form = new FormData();
  form.append('file', file);
  form.append('tipoArchivo', options.tipoArchivo === 'formato' ? 'formato' : 'documento');
  const res = await fetch(`${BASE_URL}/api/complex-subtareas/public/${token}/archivos`, {
    method: 'POST',
    body: form,
  });
  return parseJson(res);
}
