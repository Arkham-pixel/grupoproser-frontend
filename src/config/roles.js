export const ROLES_VALIDOS = [
  'admin',
  'soporte',
  'usuario',
  'visualizador',
  'puertos',
  'ajustador_lider',
  'ajustador',
  'inspector',
  'contractor_zurich',
  'contractor_alfa',
  'contractor_sura',
  'contractor_solo_zurich',
  'contractor_solo_bbva',
  'contractor_solo_equidad',
  'contractor_solo_equidad_cat',
  'contractor_solo_express',
  'contractor_solo_previsora',
  'contractor_catastroficos',
  'contractor_era',
];

/** Contratista con Zurich + Alfa + Sura + BBVA (Rodrigo y similares). */
export const ROLES_CONTRACTOR_TRES = ['contractor_zurich', 'contractor_alfa', 'contractor_sura'];

/** Contratista solo módulo Zurich (nuevo, aparte de los tres). */
export const ROL_SOLO_ZURICH = 'contractor_solo_zurich';

/** Contratista solo módulo BBVA CAT. */
export const ROL_SOLO_BBVA = 'contractor_solo_bbva';

/** Contratista solo bandeja Equidad FDM. */
export const ROL_SOLO_EQUIDAD = 'contractor_solo_equidad';

/** Contratista solo módulo Equidad CAT. */
export const ROL_SOLO_EQUIDAD_CAT = 'contractor_solo_equidad_cat';

/** Contratista solo módulo Express. */
export const ROL_SOLO_EXPRESS = 'contractor_solo_express';

/** Contratista solo módulo Previsora (Home + Previsora). */
export const ROL_SOLO_PREVISORA = 'contractor_solo_previsora';

/** Contratista con todos los módulos catastróficos. */
export const ROL_CATASTROFICOS = 'contractor_catastroficos';

/** Contratista ERA: módulos catastróficos sin Equidad FDM. */
export const ROL_ERA = 'contractor_era';

export const ROLES_CONTRACTOR = [
  ...ROLES_CONTRACTOR_TRES,
  ROL_SOLO_ZURICH,
  ROL_SOLO_BBVA,
  ROL_SOLO_EQUIDAD,
  ROL_SOLO_EQUIDAD_CAT,
  ROL_SOLO_EXPRESS,
  ROL_SOLO_PREVISORA,
  ROL_CATASTROFICOS,
  ROL_ERA,
];

export const CONFIG_CONTRACTOR_TRES = {
  seccionesMenu: ['alfa', 'zurich', 'bbvaCat', 'sura'],
  inicio: '/zurich/reporte',
  prefijosRuta: ['/zurich', '/seguros-alfa', '/sura', '/bbva-cat', '/agenda-catastrofico'],
  etiqueta: 'Zurich, Alfa, Sura y BBVA',
};

export const CONFIG_SOLO_ZURICH = {
  seccionesMenu: ['zurich'],
  inicio: '/zurich/listado/dashboard',
  prefijosRuta: ['/zurich', '/agenda-catastrofico'],
  rutasExcluidas: [
    '/zurich/carga',
    '/zurich/caso',
    '/zurich/dashboard',
    '/zurich/reporte',
    '/zurich/boletin',
    '/zurich/liquidador',
    '/zurich/informe-unico',
  ],
  etiqueta: 'Zurich',
};

export const CONFIG_SOLO_BBVA = {
  seccionesMenu: ['bbvaCat'],
  inicio: '/bbva-cat/listado/analista',
  prefijosRuta: ['/bbva-cat', '/agenda-catastrofico'],
  rutasExcluidas: ['/bbva-cat/listado/reporte'],
  etiqueta: 'BBVA',
};

export const CONFIG_SOLO_EQUIDAD = {
  /** Home + Fundación de la Mujer (dashboard + bandeja). */
  seccionesMenu: ['equidadFdm'],
  inicio: '/inicio',
  prefijosRuta: ['/inicio', '/equidad-fdm'],
  rutasExcluidas: [
    '/equidad-fdm/carga',
    '/equidad-fdm/liquidador',
  ],
  /** Rutas FDM visibles en menú/tabs (consulta). */
  rutasMenuFdm: ['/equidad-fdm/dashboard', '/equidad-fdm/reporte'],
  soloBandeja: true,
  incluirHome: true,
  etiqueta: 'Equidad FDM',
};

export const CONFIG_SOLO_EQUIDAD_CAT = {
  seccionesMenu: ['equidadCat', 'allianz'],
  inicio: '/equidad-cat/reporte',
  prefijosRuta: ['/equidad-cat', '/allianz', '/allias', '/agenda-catastrofico'],
  etiqueta: 'Equidad CAT',
};

export const CONFIG_SOLO_EXPRESS = {
  seccionesMenu: ['express'],
  inicio: '/express/reporte',
  prefijosRuta: ['/express'],
  etiqueta: 'Express',
};

export const CONFIG_SOLO_PREVISORA = {
  /** Home + módulo Previsora completo. */
  seccionesMenu: ['previsora'],
  inicio: '/inicio',
  prefijosRuta: ['/inicio', '/previsora', '/agenda-catastrofico'],
  incluirHome: true,
  etiqueta: 'Previsora',
};

export const CONFIG_CATASTROFICOS = {
  /** Orden: Previsora, Zurich, BBVA, Alfa, Sura, Allianz, Equidad CAT. */
  seccionesMenu: ['previsora', 'zurich', 'bbvaCat', 'alfa', 'sura', 'allianz', 'equidadCat'],
  inicio: '/previsora/listado/reporte',
  prefijosRuta: [
    '/previsora',
    '/zurich',
    '/bbva-cat',
    '/seguros-alfa',
    '/sura',
    '/allianz',
    '/equidad-cat',
    '/catastrofico',
    '/agenda-catastrofico',
  ],
  etiqueta: 'Catastróficos',
};

export const CONFIG_ERA = {
  ...CONFIG_CATASTROFICOS,
  etiqueta: 'ERA',
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
  if (r === ROL_SOLO_BBVA) return CONFIG_SOLO_BBVA;
  if (r === ROL_SOLO_EQUIDAD) return CONFIG_SOLO_EQUIDAD;
  if (r === ROL_SOLO_EQUIDAD_CAT) return CONFIG_SOLO_EQUIDAD_CAT;
  if (r === ROL_SOLO_EXPRESS) return CONFIG_SOLO_EXPRESS;
  if (r === ROL_SOLO_PREVISORA) return CONFIG_SOLO_PREVISORA;
  if (r === ROL_CATASTROFICOS) return CONFIG_CATASTROFICOS;
  if (r === ROL_ERA) return CONFIG_ERA;
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

export function esRolSoloBbva(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_SOLO_BBVA;
}

export function esRolSoloEquidad(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_SOLO_EQUIDAD;
}

export function esRolSoloEquidadCat(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_SOLO_EQUIDAD_CAT;
}

export function esRolSoloExpress(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_SOLO_EXPRESS;
}

/** Agenda CAT: todos menos visualizador, puertos, externo, FDM-only y Express-only. */
export function puedeVerAgendaCatastrofico(rol = obtenerRolAlmacenado()) {
  const r = normalizarRol(rol);
  if (!r || r === 'visualizador' || r === 'puertos' || r === 'externo') return false;
  if (r === ROL_SOLO_EQUIDAD || r === ROL_SOLO_EXPRESS) return false;
  return true;
}

export function esRolSoloPrevisora(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_SOLO_PREVISORA;
}

export function esRolCatastroficos(rol = obtenerRolAlmacenado()) {
  const r = normalizarRol(rol);
  return r === ROL_CATASTROFICOS || r === ROL_ERA;
}

export function esRolEra(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_ERA;
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
    const permitida =
      contractor.prefijosRuta.some((prefijo) => path === prefijo || path.startsWith(`${prefijo}/`)) ||
      path === '/inicio';
    const excluida = (contractor.rutasExcluidas || []).some(
      (ex) => path === ex || path.startsWith(`${ex}/`)
    );
    return (
      (permitida && !excluida) ||
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
  if (r === 'ajustador_lider') return translate('roles.ajustador_lider', 'Ajustador líder');
  if (r === 'ajustador') return translate('roles.ajustador', 'Ajustador');
  if (r === 'inspector') return translate('roles.inspector', 'Inspector');
  if (r === 'visualizador') return translate('roles.visualizador', 'Visualizador');
  if (r === 'puertos') return translate('roles.puertos', 'Puertos');
  const contractor = obtenerConfigContractor(r);
  if (contractor) {
    return translate(`roles.${r}`, contractor.etiqueta);
  }
  if (r === 'usuario' || !rol) return translate('roles.usuario', 'Usuario');
  return String(rol).charAt(0).toUpperCase() + String(rol).slice(1);
}
