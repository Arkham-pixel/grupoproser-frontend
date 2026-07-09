import { BASE_URL } from '../config/apiConfig.js';
import { obtenerProtocoloPorDefecto } from '../config/protocoloSiniestrosDefaults.js';

let cacheProtocolo = null;

export async function obtenerProtocoloSiniestros(force = false) {
  if (cacheProtocolo && !force) {
    return cacheProtocolo;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/alertas/protocolo`);
    const data = await response.json();
    if (data.success && data.data?.activo) {
      cacheProtocolo = data.data.activo;
      return cacheProtocolo;
    }
  } catch (error) {
    console.warn('No se pudo cargar protocolo desde API, usando defaults:', error);
  }

  cacheProtocolo = obtenerProtocoloPorDefecto();
  return cacheProtocolo;
}

export async function guardarProtocoloSiniestros(protocolo) {
  const response = await fetch(`${BASE_URL}/api/alertas/protocolo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(protocolo),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Error guardando protocolo');
  }
  cacheProtocolo = data.data;
  return data.data;
}

export async function restaurarProtocoloSiniestros() {
  const response = await fetch(`${BASE_URL}/api/alertas/protocolo/restaurar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Error restaurando protocolo');
  }
  cacheProtocolo = data.data;
  return data.data;
}

export function invalidarCacheProtocolo() {
  cacheProtocolo = null;
}
