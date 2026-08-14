export const ROLES_VALIDOS = [
  'admin',
  'soporte',
  'usuario',
  'visualizador',
  'puertos',
  'contractor_zurich',
  'contractor_alfa',
  'contractor_sura',
  'contractor_solo_zurich',
];

/** Contratista con Zurich + Alfa + Sura (Rodrigo y similares). */
export const ROLES_CONTRACTOR_TRES = ['contractor_zurich', 'contractor_alfa', 'contractor_sura'];

/** Contratista solo módulo Zurich (nuevo, aparte de los tres). */
export const ROL_SOLO_ZURICH = 'contractor_solo_zurich';

export const ROLES_CONTRACTOR = [...ROLES_CONTRACTOR_TRES, ROL_SOLO_ZURICH];

export const CONFIG_CONTRACTOR_TRES = {
  seccionesMenu: ['alfa', 'zurich', 'sura'],
  inicio: '/zurich/reporte',
  prefijosRuta: ['/zurich', '/seguros-alfa', '/sura'],
  etiqueta: 'Zurich, Alfa y Sura',
};

export const CONFIG_SOLO_ZURICH = {
  seccionesMenu: ['zurich'],
  inicio: '/zurich/reporte',
  prefijosRuta: ['/zurich'],
  etiqueta: 'Zurich',
};

export function normalizarRol(rol) {
  return String(rol || '').trim().toLowerCase();
}

export function obtenerRolAlmacenado() {
  return normalizarRol(localStorage.getItem('rol'));
}

export function obtenerConfigContractor(rol = obtenerRolAlmacenado()) {
  const r = normalizarRol(rol);
  if (r === ROL_SOLO_ZURICH) return CONFIG_SOLO_ZURICH;
  if (ROLES_CONTRACTOR_TRES.includes(r)) return CONFIG_CONTRACTOR_TRES;
  return null;
}

export function esRolVisualizador(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === 'visualizador';
}

export function esRolPuertos(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === 'puertos';
}

export function esRolContractor(rol = obtenerRolAlmacenado()) {
  return Boolean(obtenerConfigContractor(rol));
}

export function esRolContractorZurich(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_SOLO_ZURICH;
}

/** Sesión externa de subtarea Complex (enlace mágico): solo formulario de ajuste. */
export function esRolExterno(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === 'externo';
}

export function rutaInicioPorRol(rol = obtenerRolAlmacenado()) {
  const r = normalizarRol(rol);
  if (r === 'visualizador') return '/matrices-riesgo';
  if (r === 'puertos') return '/puertos/actas';
  const contractor = obtenerConfigContractor(r);
  if (contractor) return contractor.inicio;
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

  const contractor = obtenerConfigContractor(r);
  if (contractor) {
    return (
      contractor.prefijosRuta.some((prefijo) => path.startsWith(prefijo)) ||
      path === '/micuenta' ||
      path.startsWith('/micuenta/')
    );
  }

  if (r === 'externo') {
    return path.startsWith('/ajuste') || path.startsWith('/complex/subtarea');
  }

  return true;
}

export function etiquetaRol(rol, t) {
  const r = normalizarRol(rol);
  const translate = typeof t === 'function' ? t : (key, fallback) => fallback;
  if (r === 'admin' || r === 'administrador') return translate('roles.admin', 'Administrador');
  if (r === 'soporte') return translate('roles.soporte', 'Soporte');
  if (r === 'visualizador') return translate('roles.visualizador', 'Visualizador');
  if (r === 'puertos') return translate('roles.puertos', 'Puertos');
  const contractor = obtenerConfigContractor(r);
  if (contractor) {
    return translate(`roles.${r}`, contractor.etiqueta);
  }
  if (r === 'usuario' || !rol) return translate('roles.usuario', 'Usuario');
  return String(rol).charAt(0).toUpperCase() + String(rol).slice(1);
}
