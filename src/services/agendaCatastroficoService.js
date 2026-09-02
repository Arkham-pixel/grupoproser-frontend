import { BASE_URL } from '../config/apiConfig.js';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function leerJson(response) {
  const texto = await response.text();
  if (!texto) throw new Error(`Respuesta vacía del servidor (${response.status})`);
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }
}

async function getAgenda(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const suffix = qs.toString() ? `?${qs}` : '';
  const response = await fetch(`${BASE_URL}/api/agenda-catastrofico${path}${suffix}`, {
    headers: { Accept: 'application/json', ...authHeaders() },
    cache: 'no-store',
  });
  if (response.status === 401 || response.status === 403) {
    return { success: false, data: [], total: 0 };
  }
  if (!response.ok) {
    throw new Error(`Error al cargar la agenda (${response.status})`);
  }
  return leerJson(response);
}

export async function obtenerEventosAgendaCatastrofico({ desde, hasta, persona, rol } = {}) {
  const json = await getAgenda('', { desde, hasta, persona, rol });
  return {
    desde: json.desde,
    hasta: json.hasta,
    total: json.total || 0,
    alcance: json.alcance || '',
    data: Array.isArray(json.data) ? json.data : [],
  };
}

export async function obtenerAgendaCatastroficoHoy() {
  const json = await getAgenda('/hoy');
  return {
    fecha: json.fecha,
    total: json.total || 0,
    alcance: json.alcance || '',
    data: Array.isArray(json.data) ? json.data : [],
  };
}

export async function obtenerDisponibilidadAgendaCatastrofico({
  fecha,
  ajustador,
  inspector,
  excludeId,
} = {}) {
  const json = await getAgenda('/disponibilidad', { fecha, ajustador, inspector, excludeId });
  return {
    fecha: json.fecha || fecha || '',
    ocupados: Array.isArray(json.ocupados) ? json.ocupados : [],
  };
}

export async function obtenerPersonasAgendaCatastrofico() {
  const json = await getAgenda('/personas');
  return {
    ajustadores: Array.isArray(json.ajustadores) ? json.ajustadores : [],
    inspectores: Array.isArray(json.inspectores) ? json.inspectores : [],
    alcance: json.alcance || '',
  };
}
