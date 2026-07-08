import { BASE_URL } from '../config/apiConfig.js';

function paramsLogin() {
  const login = localStorage.getItem('login') || localStorage.getItem('cedula') || '';
  const nombre = localStorage.getItem('nombre') || '';
  return { login, nombre };
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function leerJsonRespuesta(response) {
  const texto = await response.text();
  if (!texto) {
    throw new Error(`Respuesta vacía del servidor (${response.status})`);
  }
  try {
    return JSON.parse(texto);
  } catch {
    const esHtml = texto.trimStart().startsWith('<!');
    throw new Error(
      esHtml
        ? `El servidor no devolvió JSON (${response.status}). ¿Está actualizado el backend? Reinicie npm start en grupoproser-backend.`
        : `Respuesta inválida del servidor (${response.status})`
    );
  }
}

function normalizarMisAlertas(data, login) {
  const casos = Array.isArray(data?.casos) ? data.casos : [];
  const totalAlertas =
    data?.totalAlertas ??
    casos.reduce((sum, c) => sum + (c.totalAlertas ?? c.alertas?.length ?? 0), 0);

  return {
    login: data?.login || login,
    totalCasos: data?.totalCasos ?? casos.length,
    casosConAlertas: data?.casosConAlertas ?? casos.length,
    totalAlertas,
    casos,
  };
}

export async function obtenerMisAlertas() {
  const { login, nombre } = paramsLogin();
  if (!login) {
    throw new Error('No hay usuario en sesión (login). Vuelva a iniciar sesión.');
  }

  const qs = new URLSearchParams({ login, nombre }).toString();
  const headers = authHeaders();

  let response = await fetch(`${BASE_URL}/api/alertas/mis-casos?${qs}`, { headers });

  if (response.status === 404) {
    response = await fetch(
      `${BASE_URL}/api/alertas/ajustador/${encodeURIComponent(login)}`,
      { headers }
    );
  }

  const data = await leerJsonRespuesta(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || `Error cargando alertas (${response.status})`);
  }

  return normalizarMisAlertas(data.data, login);
}

export async function obtenerAlertasCaso(identificador) {
  const response = await fetch(
    `${BASE_URL}/api/alertas/caso/${encodeURIComponent(identificador)}`,
    { headers: authHeaders() }
  );
  const data = await leerJsonRespuesta(response);
  if (!data.success) return null;
  return data.data;
}

export async function obtenerResumenAlertas() {
  const response = await fetch(`${BASE_URL}/api/alertas/resumen`, { headers: authHeaders() });
  const data = await leerJsonRespuesta(response);
  if (!data.success) throw new Error(data.message || 'Error cargando resumen');
  return data.data;
}

export async function obtenerTodasAlertas() {
  const response = await fetch(`${BASE_URL}/api/alertas/todos`, { headers: authHeaders() });
  const data = await leerJsonRespuesta(response);
  if (!data.success) throw new Error(data.message || 'Error cargando alertas');
  return data.data;
}

export async function enviarAlertasAjustador(codigoResponsable) {
  const response = await fetch(
    `${BASE_URL}/api/alertas/enviar/ajustador/${encodeURIComponent(codigoResponsable)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    }
  );
  return leerJsonRespuesta(response);
}

export async function enviarAlertasTodos() {
  const response = await fetch(`${BASE_URL}/api/alertas/enviar/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  return leerJsonRespuesta(response);
}

export async function obtenerHistorialProtocolo(limite = 10) {
  const response = await fetch(
    `${BASE_URL}/api/alertas/protocolo/historial?limite=${limite}`,
    { headers: authHeaders() }
  );
  const data = await leerJsonRespuesta(response);
  if (!data.success) throw new Error(data.message || 'Error cargando historial');
  return data.data;
}
