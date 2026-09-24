/**
 * Módulo de videoperitaje: acceso abierto + admin (vaciar / cupo).
 * Historial compartido entre todos los usuarios con acceso.
 * Debe coincidir con backend/config/videoperitajePermitidos.js
 *
 * VITE_LOGINS_VIDEOPERITAJE=* | all | open → todos
 */

function parseLogins(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const rawAllow = import.meta.env.VITE_LOGINS_VIDEOPERITAJE;
export const LOGINS_VIDEOPERITAJE = parseLogins(
  rawAllow == null || String(rawAllow).trim() === '' ? '*' : rawAllow
);

export const LOGINS_VIDEOPERITAJE_ADMIN = parseLogins(
  import.meta.env.VITE_LOGINS_VIDEOPERITAJE_ADMIN || '1065012991'
);

export function accesoVideoperitajeAbierto() {
  if (LOGINS_VIDEOPERITAJE.length === 0) return true;
  return LOGINS_VIDEOPERITAJE.some((id) =>
    ['*', 'all', 'open', 'todos'].includes(String(id).toLowerCase())
  );
}

export function usuarioPuedeVideoperitaje(login, cedula) {
  if (accesoVideoperitajeAbierto()) return true;
  const ids = [login, cedula].map((v) => String(v || '').trim()).filter(Boolean);
  return ids.some((id) => LOGINS_VIDEOPERITAJE.includes(id));
}

export function usuarioEsAdminVideoperitaje(login, cedula, rol) {
  const ids = [login, cedula].map((v) => String(v || '').trim()).filter(Boolean);
  if (ids.some((id) => LOGINS_VIDEOPERITAJE_ADMIN.includes(id))) return true;
  const r = String(rol || '').trim().toLowerCase();
  return r === 'admin' || r === 'administrador' || r === 'administrator';
}

export function sesionPuedeVideoperitaje() {
  return usuarioPuedeVideoperitaje(
    localStorage.getItem('login'),
    localStorage.getItem('cedula')
  );
}

export function sesionEsAdminVideoperitaje() {
  return usuarioEsAdminVideoperitaje(
    localStorage.getItem('login'),
    localStorage.getItem('cedula'),
    localStorage.getItem('rol')
  );
}
