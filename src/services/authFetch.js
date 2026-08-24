import { isTokenNearExpiry, refreshToken } from './api.js';

/**
 * fetch autenticado: renueva el JWT si está vencido/por vencer
 * y reintenta una vez ante 401/403.
 */
export async function authFetch(url, options = {}, { intentos = 2 } = {}) {
  let yaRenovo = false;

  const token = localStorage.getItem('token');
  if (token && isTokenNearExpiry(token, 1)) {
    await refreshToken(true);
    yaRenovo = true;
  }

  let ultimo = null;
  for (let i = 0; i < intentos; i += 1) {
    const t = localStorage.getItem('token');
    const headers = {
      ...(options.headers || {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
    try {
      const res = await fetch(url, { ...options, headers });
      if (res.ok) return res;

      if (!yaRenovo && (res.status === 401 || res.status === 403)) {
        yaRenovo = true;
        const nuevo = await refreshToken(true);
        if (nuevo) {
          ultimo = new Error(`Error ${res.status}`);
          continue;
        }
      }
      return res;
    } catch (error) {
      ultimo = error;
    }
  }
  if (ultimo) throw ultimo;
  throw new Error('No se pudo completar la petición');
}
