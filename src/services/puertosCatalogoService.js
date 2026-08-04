import { BASE_URL } from '../config/apiConfig.js';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function parseApiError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  const detalle = data.error || data.message || data.detalle;
  if (res.status === 404) {
    throw new Error(
      detalle ||
        `Ruta no encontrada (${res.status}). Reinicie el backend para cargar los catálogos de Puertos.`
    );
  }
  if (res.status === 401) {
    throw new Error(detalle || 'Sesión expirada. Vuelva a iniciar sesión para agregar ítems.');
  }
  if (res.status === 403) {
    throw new Error(detalle || 'No tiene permiso para modificar catálogos de Puertos.');
  }
  if (res.status === 0 || res.type === 'opaque') {
    throw new Error('No hay conexión con el servidor. Verifique que el backend esté en ejecución.');
  }
  throw new Error(detalle || fallback);
}

export const TIPOS_CATALOGO_PUERTOS = [
  { id: 'regional', label: 'Regionales' },
  { id: 'inspector', label: 'Inspectores' },
  { id: 'empaque', label: 'Empaques' },
  { id: 'tipo_averia', label: 'Tipos de avería' },
  { id: 'tipo_inspeccion', label: 'Tipos de inspección' },
  { id: 'tipo_transporte', label: 'Tipos de transporte' },
  { id: 'tipo_mercancia', label: 'Tipos de mercancía' },
  { id: 'aseguradora', label: 'Aseguradoras' },
  { id: 'asegurado', label: 'Asegurados' },
  { id: 'sucursal', label: 'Sucursales' },
  { id: 'estado_acta', label: 'Estados de acta' },
];

export async function fetchPuertosCatalogo(tipo) {
  const res = await fetch(`${BASE_URL}/api/puertos/catalogos/${tipo}`);
  if (!res.ok) await parseApiError(res, `No se pudo cargar catálogo ${tipo}`);
  return res.json();
}

export async function fetchTodosPuertosCatalogos() {
  const res = await fetch(`${BASE_URL}/api/puertos/catalogos`);
  if (!res.ok) await parseApiError(res, 'No se pudieron cargar los catálogos de Puertos');
  return res.json();
}

export async function crearPuertosCatalogo(tipo, nombre, extras = {}) {
  if (!localStorage.getItem('token')) {
    throw new Error('Debe iniciar sesión para agregar ítems al catálogo.');
  }
  const res = await fetch(`${BASE_URL}/api/puertos/catalogos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ tipo, nombre, ...extras }),
  });
  if (!res.ok) await parseApiError(res, 'No se pudo crear el ítem');
  const data = await res.json();
  return data.data;
}

export async function actualizarPuertosCatalogo(id, nombre, extras = {}) {
  if (!localStorage.getItem('token')) {
    throw new Error('Debe iniciar sesión para editar el catálogo.');
  }
  const payload =
    typeof nombre === 'object' && nombre !== null
      ? nombre
      : { nombre, ...extras };
  const res = await fetch(`${BASE_URL}/api/puertos/catalogos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseApiError(res, 'No se pudo actualizar el ítem');
  const data = await res.json();
  return data.data;
}

export async function eliminarPuertosCatalogo(id) {
  if (!localStorage.getItem('token')) {
    throw new Error('Debe iniciar sesión para eliminar ítems del catálogo.');
  }
  const res = await fetch(`${BASE_URL}/api/puertos/catalogos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await parseApiError(res, 'No se pudo eliminar el ítem');
  const data = await res.json();
  return data.data;
}

export async function seedPuertosCatalogos() {
  if (!localStorage.getItem('token')) {
    throw new Error('Debe iniciar sesión para restaurar valores base.');
  }
  const res = await fetch(`${BASE_URL}/api/puertos/catalogos/seed/defaults`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) await parseApiError(res, 'No se pudo inicializar catálogos');
  return res.json();
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

export function labelTipoCatalogo(tipo) {
  return TIPOS_CATALOGO_PUERTOS.find((t) => t.id === tipo)?.label ?? tipo;
}
