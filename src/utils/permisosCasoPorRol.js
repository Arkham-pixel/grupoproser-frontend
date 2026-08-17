/**
 * Permisos de formularios "agregar/editar caso" por rol de usuario.
 *
 * - ajustador_lider: edita todo (quien asigna)
 * - ajustador: edita todo excepto ajustadorLider, ajustador, inspector
 * - inspector: solo ve y modifica estado
 * - admin / soporte: todo
 * - resto (usuario, etc.): todo (compatibilidad)
 *
 * Excepción SURA: login 72288319 (Mario Pinilla) = poderes de líder solo en SURA.
 */

import { normalizarRol, obtenerRolAlmacenado } from '../config/roles.js';

export const ROL_AJUSTADOR_LIDER = 'ajustador_lider';
export const ROL_AJUSTADOR_CASO = 'ajustador';
export const ROL_INSPECTOR = 'inspector';

/** Campos de asignación que el ajustador (no líder) no puede cambiar. */
export const CAMPOS_ASIGNACION_CASO = Object.freeze([
  'ajustadorLider',
  'ajustador',
  'inspector',
]);

/**
 * Logins con poderes de ajustador líder SOLO en módulo SURA.
 * Mario Alberto Pinilla de la Torre.
 */
export const SURA_LOGINS_PERMISO_LIDER = Object.freeze(['72288319']);

export function obtenerContextoPermisoCaso(modulo = '') {
  return {
    modulo: String(modulo || '').toLowerCase(),
    login:
      typeof localStorage !== 'undefined' ? localStorage.getItem('login') || '' : '',
    nombre:
      typeof localStorage !== 'undefined' ? localStorage.getItem('nombre') || '' : '',
  };
}

export function esLoginConPermisoLiderSura(login, modulo = '') {
  if (String(modulo || '').toLowerCase() !== 'sura') return false;
  const l = String(login || '').trim();
  if (!l) return false;
  return SURA_LOGINS_PERMISO_LIDER.includes(l);
}

export function esRolAjustadorLider(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_AJUSTADOR_LIDER;
}

export function esRolAjustadorCaso(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_AJUSTADOR_CASO;
}

export function esRolInspector(rol = obtenerRolAlmacenado()) {
  return normalizarRol(rol) === ROL_INSPECTOR;
}

/** Admin / soporte: ven y editan toda la información del caso. */
export function esRolAdminOSoporte(rol = obtenerRolAlmacenado()) {
  const r = normalizarRol(rol);
  return r === 'admin' || r === 'soporte' || r === 'administrador';
}

export function esCampoAsignacionCaso(campo) {
  return CAMPOS_ASIGNACION_CASO.includes(String(campo || ''));
}

/**
 * Admin, soporte y líder editan todo; en SURA también Mario (72288319).
 * @param {string} rol
 * @param {{ modulo?: string, login?: string }} [opts]
 */
export function puedeEditarTodoElCaso(rol = obtenerRolAlmacenado(), opts = {}) {
  const r = normalizarRol(rol);
  if (esRolAdminOSoporte(r) || r === ROL_AJUSTADOR_LIDER) return true;
  if (esLoginConPermisoLiderSura(opts.login, opts.modulo)) return true;
  if (r === ROL_AJUSTADOR_CASO || r === ROL_INSPECTOR) return false;
  return true;
}

export function puedeEditarCampoCaso(rol = obtenerRolAlmacenado(), campo, opts = {}) {
  const r = normalizarRol(rol);
  const key = String(campo || '');
  if (!key) return false;
  if (puedeEditarTodoElCaso(r, opts)) return true;
  if (r === ROL_INSPECTOR) return key === 'estado';
  if (r === ROL_AJUSTADOR_CASO) return !esCampoAsignacionCaso(key);
  return true;
}

export function attrsCampoCaso(rol = obtenerRolAlmacenado(), campo, opts = {}) {
  return { disabled: !puedeEditarCampoCaso(rol, campo, opts) };
}

/**
 * Filtra un payload de update según el rol.
 * @returns {{ payload: object, soloEstado: boolean }}
 */
export function filtrarPayloadCasoPorRol(rol, payload = {}, base = {}, opts = {}) {
  const r = normalizarRol(rol);
  if (puedeEditarTodoElCaso(r, opts)) {
    return { payload: { ...payload }, soloEstado: false };
  }
  if (r === ROL_INSPECTOR) {
    return {
      payload: {
        estado: payload.estado != null ? payload.estado : base.estado,
      },
      soloEstado: true,
    };
  }
  if (r === ROL_AJUSTADOR_CASO) {
    const next = { ...payload };
    for (const campo of CAMPOS_ASIGNACION_CASO) {
      if (Object.prototype.hasOwnProperty.call(base, campo)) {
        next[campo] = base[campo];
      } else {
        delete next[campo];
      }
    }
    return { payload: next, soloEstado: false };
  }
  return { payload: { ...payload }, soloEstado: false };
}

/** Normaliza nombre/login para comparar asignación. */
export function normalizarClavePersona(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function coincidenPersonas(a, b) {
  const na = normalizarClavePersona(a);
  const nb = normalizarClavePersona(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Ajustador e inspector: solo casos que el líder les asignó.
 * En SURA, Mario (72288319) ve todos como el líder.
 */
export function rolConVistaRestringidaAsignacion(rol = obtenerRolAlmacenado(), opts = {}) {
  if (esLoginConPermisoLiderSura(opts.login, opts.modulo)) return false;
  const r = normalizarRol(rol);
  return r === ROL_AJUSTADOR_CASO || r === ROL_INSPECTOR;
}

/**
 * Filtra lista de casos Alfa/Sura según rol del usuario en localStorage.
 * Admin / soporte / líder / otros: sin filtro.
 * En SURA, Mario (72288319) sin filtro.
 */
export function filtrarCasosPorAsignacionUsuario(casos = [], {
  rol = obtenerRolAlmacenado(),
  nombre = typeof localStorage !== 'undefined' ? localStorage.getItem('nombre') || '' : '',
  login = typeof localStorage !== 'undefined' ? localStorage.getItem('login') || '' : '',
  modulo = '',
} = {}) {
  if (!rolConVistaRestringidaAsignacion(rol, { login, modulo })) {
    return Array.isArray(casos) ? casos : [];
  }
  const claves = [nombre, login].map((s) => String(s || '').trim()).filter(Boolean);
  if (!claves.length) return [];
  const campo = normalizarRol(rol) === ROL_INSPECTOR ? 'inspector' : 'ajustador';
  return (Array.isArray(casos) ? casos : []).filter((caso) =>
    claves.some((k) => coincidenPersonas(caso?.[campo], k))
  );
}
