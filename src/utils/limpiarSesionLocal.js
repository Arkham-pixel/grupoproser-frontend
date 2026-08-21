/** Claves de sesión de plataforma / enlace externo de subtarea. */
const CLAVES_SESION = [
  'token',
  'rol',
  'login',
  'nombre',
  'tipoUsuario',
  'sessionStartTime',
  'sessionStart',
  'tokenNeedsRenewal',
  'subtareaExternaReturn',
];

/** Limpia credenciales locales (incluye sesión limitada de subtarea externa). */
export function limpiarSesionLocal() {
  CLAVES_SESION.forEach((k) => localStorage.removeItem(k));
  try {
    sessionStorage.removeItem('arnald_draft_prompt_done');
    sessionStorage.removeItem('arnald_auto_restore_formkey');
    sessionStorage.removeItem('arnald_draft_prompt_later');
    sessionStorage.removeItem('arnald_draft_prompt_scanned');
  } catch {
    // ignore
  }
}
