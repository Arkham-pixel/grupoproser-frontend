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
}
