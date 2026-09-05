import { BASE_URL } from '../config/apiConfig.js';

const API = `${BASE_URL}/api/sura/facilitadores`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function leerJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error (${response.status})`);
  }
  return payload;
}

export async function listarFacilitadoresSura() {
  const response = await fetch(`${API}?_t=${Date.now()}`, { headers: authHeaders() });
  const payload = await leerJson(response);
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function importarFacilitadoresSura(rows) {
  const response = await fetch(`${API}/importar`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  return leerJson(response);
}

export async function sugerirFacilitadoresDesdeArnald() {
  const response = await fetch(`${API}/sugerir-arnald`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return leerJson(response);
}

export async function actualizarFacilitadorSura(id, patch) {
  const response = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const payload = await leerJson(response);
  return payload.data;
}
