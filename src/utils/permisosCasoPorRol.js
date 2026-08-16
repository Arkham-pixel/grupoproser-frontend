/**
 * Permisos de formularios "agregar/editar caso" por rol de usuario.
 *
 * - ajustador_lider: edita todo (quien asigna)
 * - ajustador: edita todo excepto ajustadorLider, ajustador, inspector
 * - inspector: solo ve y modifica estado
 * - admin / soporte: todo
 * - resto (usuario, etc.): todo (compatibilidad)
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

/** Admin, soporte y líder editan todo; roles legacy también. */
export function puedeEditarTodoElCaso(rol = obtenerRolAlmacenado()) {
  const r = normalizarRol(rol);
  if (esRolAdminOSoporte(r) || r === ROL_AJUSTADOR_LIDER) return true;
  if (r === ROL_AJUSTADOR_CASO || r === ROL_INSPECTOR) return false;
  return true;
}

export function puedeEditarCampoCaso(rol = obtenerRolAlmacenado(), campo) {
  const r = normalizarRol(rol);
  const key = String(campo || '');
  if (!key) return false;
  if (puedeEditarTodoElCaso(r)) return true;
  if (r === ROL_INSPECTOR) return key === 'estado';
  if (r === ROL_AJUSTADOR_CASO) return !esCampoAsignacionCaso(key);
  return true;
}

export function attrsCampoCaso(rol = obtenerRolAlmacenado(), campo) {
  return { disabled: !puedeEditarCampoCaso(rol, campo) };
}

/**
 * Filtra un payload de update según el rol.
 * @returns {{ payload: object, soloEstado: boolean }}
 */
export function filtrarPayloadCasoPorRol(rol, payload = {}, base = {}) {
  const r = normalizarRol(rol);
  if (puedeEditarTodoElCaso(r)) {
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
