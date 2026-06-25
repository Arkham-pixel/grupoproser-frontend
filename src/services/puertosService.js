import { BASE_URL } from '../config/apiConfig.js';

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Error ${response.status}`);
  }
  return data;
}

export async function listarRegistrosPuertos(params = {}) {
  const qs = new URLSearchParams();
  if (params.tipo) qs.set('tipo', params.tipo);
  if (params.q) qs.set('q', params.q);
  if (params.estado) qs.set('estado', params.estado);
  if (params.regional) qs.set('regional', params.regional);
  if (params.cliente) qs.set('cliente', params.cliente);
  if (params.fechaDesde) qs.set('fechaDesde', params.fechaDesde);
  if (params.fechaHasta) qs.set('fechaHasta', params.fechaHasta);
  if (params.limit) qs.set('limit', String(params.limit));
  const url = `${BASE_URL}/api/puertos/registros${qs.toString() ? `?${qs}` : ''}`;
  const response = await fetch(url);
  return parseJson(response);
}

export async function getPuertosCaso(id) {
  const response = await fetch(`${BASE_URL}/api/puertos/casos/${id}`);
  return parseJson(response);
}

export async function crearPuertosCaso(datos) {
  const response = await fetch(`${BASE_URL}/api/puertos/casos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  return parseJson(response);
}

export async function actualizarPuertosCaso(id, datos) {
  const response = await fetch(`${BASE_URL}/api/puertos/casos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  return parseJson(response);
}

export async function eliminarPuertosCaso(id) {
  const response = await fetch(`${BASE_URL}/api/puertos/casos/${id}`, { method: 'DELETE' });
  return parseJson(response);
}

export async function getPuertosActa(id) {
  const response = await fetch(`${BASE_URL}/api/puertos/actas/${id}`);
  return parseJson(response);
}

export async function crearPuertosActa(datos) {
  const response = await fetch(`${BASE_URL}/api/puertos/actas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  return parseJson(response);
}

export async function actualizarPuertosActa(id, datos) {
  const response = await fetch(`${BASE_URL}/api/puertos/actas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  return parseJson(response);
}
