import { BASE_URL } from '../config/apiConfig.js';

const API_POR_MODULO = {
  allianz: `${BASE_URL}/api/allianz`,
  previsora: `${BASE_URL}/api/previsora`,
  sura: `${BASE_URL}/api/sura`,
};

function authHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function bandejaAuthHeaders() {
  const headers = { 'Content-Type': 'application/json', ...authHeaders() };
  const login = typeof localStorage !== 'undefined' ? localStorage.getItem('login') : '';
  if (login) headers['X-Usuario-Login'] = login;
  return { headers, login };
}

function apiBase(modulo) {
  const url = API_POR_MODULO[modulo];
  if (!url) throw new Error(`Módulo de bandeja no soportado: ${modulo}`);
  return url;
}

async function leerRespuesta(response, accionPorDefecto) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || accionPorDefecto);
  }
  return data;
}

export async function obtenerBandejaFacturacionModulo(modulo, params = {}) {
  const qs = new URLSearchParams();
  const login =
    params.login ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('login') : '') ?? '';
  const nombre =
    params.nombre ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('nombre') : '') ?? '';
  if (login) qs.set('login', login);
  if (nombre) qs.set('nombre', nombre);
  if (params.gerente) qs.set('gerente', params.gerente);
  if (params.tipo) qs.set('tipo', params.tipo);
  if (params.desde) qs.set('desde', params.desde);
  if (params.hasta) qs.set('hasta', params.hasta);
  if (params.q) qs.set('q', params.q);
  if (params.verTodos) qs.set('verTodos', '1');

  const response = await fetch(`${apiBase(modulo)}/bandeja-facturacion?${qs.toString()}`, {
    headers: authHeaders(),
  });
  return leerRespuesta(response, 'Error al cargar la bandeja de facturación');
}

export async function corregirEnvioBandejaFacturacionModulo(modulo, payload) {
  const { headers, login } = bandejaAuthHeaders();
  const body = JSON.stringify({ ...payload, login });
  let response = await fetch(`${apiBase(modulo)}/bandeja-facturacion/envio`, {
    method: 'PATCH',
    headers,
    body,
  });
  if (response.status === 404) {
    response = await fetch(`${apiBase(modulo)}/bandeja-facturacion/envio/corregir`, {
      method: 'POST',
      headers,
      body,
    });
  }
  return leerRespuesta(response, 'No se pudo corregir el destinatario');
}

export async function eliminarEnvioBandejaFacturacionModulo(modulo, payload) {
  const { headers, login } = bandejaAuthHeaders();
  const body = JSON.stringify({ ...payload, login });
  let response = await fetch(`${apiBase(modulo)}/bandeja-facturacion/envio`, {
    method: 'DELETE',
    headers,
    body,
  });
  if (response.status === 404) {
    response = await fetch(`${apiBase(modulo)}/bandeja-facturacion/envio/eliminar`, {
      method: 'POST',
      headers,
      body,
    });
  }
  return leerRespuesta(response, 'No se pudo quitar el registro');
}
