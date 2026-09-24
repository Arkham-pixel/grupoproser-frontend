/**
 * Módulo de videoperitaje: abierto a todos los usuarios autenticados.
 * Admin (vaciar / cupo): VITE_LOGINS_VIDEOPERITAJE_ADMIN o rol admin.
 * Debe coincidir con backend/config/videoperitajePermitidos.js
 */

function parseLogins(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Acceso al módulo: siempre abierto (no depende del build/env de Coolify). */
export const LOGINS_VIDEOPERITAJE = ['*'];

export const LOGINS_VIDEOPERITAJE_ADMIN = parseLogins(
  import.meta.env.VITE_LOGINS_VIDEOPERITAJE_ADMIN || '1065012991'
);

export function accesoVideoperitajeAbierto() {
  return true;
}

export function usuarioPuedeVideoperitaje(_login, _cedula) {
  return true;
}

export function usuarioEsAdminVideoperitaje(login, cedula, rol) {
  const ids = [login, cedula].map((v) => String(v || '').trim()).filter(Boolean);
  if (ids.some((id) => LOGINS_VIDEOPERITAJE_ADMIN.includes(id))) return true;
  const r = String(rol || '').trim().toLowerCase();
  return r === 'admin' || r === 'administrador' || r === 'administrator';
}

export function sesionPuedeVideoperitaje() {
  // Cualquier sesión autenticada ve el módulo (Layout ya exige login).
  return true;
}

export function sesionEsAdminVideoperitaje() {
  return usuarioEsAdminVideoperitaje(
    localStorage.getItem('login'),
    localStorage.getItem('cedula'),
    localStorage.getItem('rol')
  );
}
