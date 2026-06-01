import { BASE_URL } from '../config/apiConfig.js';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseError = async (res, fallback) => {
  const payload = await res.json().catch(() => ({}));
  throw new Error(payload.error || payload.detalle || payload.message || fallback);
};

export async function getEstadosExpress() {
  const res = await fetch(`${BASE_URL}/api/estados/express`);
  if (!res.ok) throw new Error('Error al obtener estados Express');
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function crearEstadoExpress(codiEstdo, descEstdo) {
  const res = await fetch(`${BASE_URL}/api/estados/express`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ codiEstdo, descEstdo }),
  });
  if (!res.ok) await parseError(res, 'Error al crear estado Express');
  const payload = await res.json();
  return payload.data ?? payload;
}

export async function actualizarEstadoExpress(id, { codiEstdo, descEstdo }) {
  const res = await fetch(`${BASE_URL}/api/estados/express/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ codiEstdo, descEstdo }),
  });
  if (!res.ok) await parseError(res, 'Error al actualizar estado Express');
  const payload = await res.json();
  return payload.data ?? payload;
}

export async function eliminarEstadoExpress(id) {
  const res = await fetch(`${BASE_URL}/api/estados/express/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res, 'Error al eliminar estado Express');
  return res.json();
}
