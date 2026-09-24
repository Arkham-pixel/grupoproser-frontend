import { BASE_URL } from '../config/apiConfig.js';
import { arnaldIaHabilitado } from '../config/arnaldFeatures.js';

const API = `${BASE_URL}/api/ia`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function parseRes(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalle = Array.isArray(data.intentos)
      ? data.intentos.map((i) => `${i.provider}: ${i.error}`).join(' · ')
      : '';
    const err = new Error(
      [data.error || 'Error IA', data.ayuda, detalle].filter(Boolean).join('\n')
    );
    err.code = data.code;
    err.intentos = data.intentos;
    throw err;
  }
  return data.data || data;
}

export async function estadoArnaldIa() {
  if (!arnaldIaHabilitado()) {
    return { enabled: false, providers: [] };
  }
  const res = await fetch(`${API}/status`, { headers: authHeaders() });
  return parseRes(res);
}

export async function chatArnaldIa(messages, opts = {}) {
  if (!arnaldIaHabilitado()) {
    const err = new Error('Arnald IA deshabilitada en este build');
    err.code = 'IA_DISABLED';
    throw err;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        messages,
        modulo: opts.modulo,
        casoId: opts.casoId,
        preferredProvider: opts.preferredProvider,
        model: opts.model,
      }),
      signal: ctrl.signal,
    });
    return parseRes(res);
  } catch (err) {
    if (err?.name === 'AbortError') {
      const e = new Error(
        'La IA tardó demasiado (fotos/PDF). Espere un momento y vuelva a intentar.'
      );
      e.code = 'IA_TIMEOUT';
      throw e;
    }
    if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(String(err?.message || err))) {
      const e = new Error(
        'No se pudo conectar al backend. ¿Está corriendo en localhost:3000? Si reinició el servidor a mitad de la consulta, reintente.'
      );
      e.code = 'IA_NETWORK';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Sugiere textos de informe a partir de evidencias del caso (fotos/cotización/videoperitaje). */
export async function sugerirInformeCasoIa({ modulo, casoId }) {
  if (!arnaldIaHabilitado()) {
    const err = new Error('Arnald IA deshabilitada en este build');
    err.code = 'IA_DISABLED';
    throw err;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(`${API}/caso/sugerir-informe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ modulo, casoId }),
      signal: ctrl.signal,
    });
    return parseRes(res);
  } catch (err) {
    if (err?.name === 'AbortError') {
      const e = new Error(
        'La IA tardó demasiado analizando evidencias. Espere e intente de nuevo.'
      );
      e.code = 'IA_TIMEOUT';
      throw e;
    }
    if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(String(err?.message || err))) {
      const e = new Error(
        'No se pudo conectar al backend. Reinicie npm start en el backend y reintente.'
      );
      e.code = 'IA_NETWORK';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
