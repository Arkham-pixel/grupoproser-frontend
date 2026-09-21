/**
 * Módulo de videoperitaje en prueba: solo estos logins/cédulas lo ven y usan.
 * Debe coincidir con backend/config/videoperitajePermitidos.js
 */
export const LOGINS_VIDEOPERITAJE = String(
  import.meta.env.VITE_LOGINS_VIDEOPERITAJE || '1065012991'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function usuarioPuedeVideoperitaje(login, cedula) {
  const ids = [login, cedula].map((v) => String(v || '').trim());
  return ids.some((id) => id && LOGINS_VIDEOPERITAJE.includes(id));
}

export function sesionPuedeVideoperitaje() {
  return usuarioPuedeVideoperitaje(
    localStorage.getItem('login'),
    localStorage.getItem('cedula')
  );
}
