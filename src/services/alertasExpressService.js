import { BASE_URL } from '../config/apiConfig.js';

const ALERTAS_EXPRESS_URL = `${BASE_URL}/api/siniestros-express/alertas`;

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Error HTTP ${response.status}`);
  }
  return data;
}

export async function obtenerTodasAlertasExpress() {
  const response = await fetch(`${ALERTAS_EXPRESS_URL}/todas`);
  return parseJson(response);
}

export async function obtenerResumenAlertasExpress() {
  const response = await fetch(`${ALERTAS_EXPRESS_URL}/resumen`);
  return parseJson(response);
}

export async function obtenerAlertasCasoExpress(id) {
  if (!id) return { success: false, totalAlertas: 0, alertas: [] };
  const response = await fetch(`${ALERTAS_EXPRESS_URL}/caso/${encodeURIComponent(id)}`);
  return parseJson(response);
}

export async function obtenerProtocoloExpress() {
  const response = await fetch(`${ALERTAS_EXPRESS_URL}/protocolo`);
  return parseJson(response);
}

export async function enviarAlertasExpressTodas({ forzar = true } = {}) {
  const qs = forzar ? '?forzar=true' : '';
  const response = await fetch(`${ALERTAS_EXPRESS_URL}/enviar${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forzar }),
  });
  return parseJson(response);
}
