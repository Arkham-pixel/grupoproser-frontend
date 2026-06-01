import { BASE_URL } from '../config/apiConfig.js';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchExpressCatalogo(tipo) {
  const res = await fetch(`${BASE_URL}/api/express-catalogos/${tipo}`);
  if (!res.ok) throw new Error(`No se pudo cargar catálogo ${tipo}`);
  return res.json();
}

export async function crearExpressCatalogo(tipo, nombre) {
  const res = await fetch(`${BASE_URL}/api/express-catalogos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ tipo, nombre }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo crear el ítem');
  return data.data;
}

export async function actualizarExpressCatalogo(id, nombre) {
  const res = await fetch(`${BASE_URL}/api/express-catalogos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ nombre }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el ítem');
  return data.data;
}

export async function eliminarExpressCatalogo(id) {
  const res = await fetch(`${BASE_URL}/api/express-catalogos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el ítem');
  return data.data;
}

export const normCatalogoLabel = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

export function resolverNombreCatalogo(items, value) {
  if (!value) return '';
  const objetivo = normCatalogoLabel(value);
  const hit = items.find((i) => normCatalogoLabel(i.nombre) === objetivo);
  return hit?.nombre ?? value;
}

export function opcionesCatalogo(items, valorActual) {
  const opciones = items.map((i) => ({ value: i.nombre, label: i.nombre, id: i._id }));
  const actual = String(valorActual ?? '').trim();
  if (actual && !opciones.some((o) => normCatalogoLabel(o.value) === normCatalogoLabel(actual))) {
    opciones.unshift({ value: actual, label: `${actual} (histórico)` });
  }
  return opciones;
}
