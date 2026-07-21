export const ROLES_VALIDOS = ['admin', 'soporte', 'usuario', 'visualizador', 'puertos'];

export function normalizarRol(rol) {
  return String(rol || '').trim().toLowerCase();
}

export function obtenerRolAlmacenado() {
  return normalizarRol(localStorage.getItem('rol'));
}

export function esRolVisualizador(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === 'visualizador';
}

export function esRolPuertos(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === 'puertos';
}

/** Sesión externa de subtarea Complex (enlace mágico): solo formulario de ajuste. */
export function esRolExterno(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === 'externo';
}

export function rutaInicioPorRol(rol = obtenerRolAlmacenado()) {
  const r = normalizarRol(rol);
  if (r === 'visualizador') return '/matrices-riesgo';
  if (r === 'puertos') return '/puertos/actas';
  if (r === 'externo') {
    return localStorage.getItem('subtareaExternaReturn') || '/login';
  }
  return '/inicio';
}

const RUTAS_CUENTA = ['/cuenta', '/micuenta'];

export function rutaPermitidaParaRol(pathname, rol = obtenerRolAlmacenado()) {
  const r = normalizarRol(rol);
  const path = pathname || '';

  if (r === 'visualizador') {
    return (
      path.startsWith('/matriz-riesgo-avanzada') ||
      path.startsWith('/matriz-riesgo-reporte') ||
      path.startsWith('/matrices-riesgo')
    );
  }

  if (r === 'puertos') {
    return path.startsWith('/puertos') || RUTAS_CUENTA.some((p) => path === p || path.startsWith(`${p}/`));
  }

  if (r === 'externo') {
    return path.startsWith('/ajuste') || path.startsWith('/complex/subtarea');
  }

  return true;
}

export function etiquetaRol(rol) {
  const r = normalizarRol(rol);
  if (r === 'admin' || r === 'administrador') return 'Administrador';
  if (r === 'soporte') return 'Soporte';
  if (r === 'visualizador') return 'Visualizador';
  if (r === 'puertos') return 'Puertos';
  if (r === 'usuario') return 'Usuario';
  if (!rol) return 'Usuario';
  return String(rol).charAt(0).toUpperCase() + String(rol).slice(1);
}
