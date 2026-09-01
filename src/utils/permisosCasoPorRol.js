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

/**
 * Excel de verificación SURA (No. de Reclamo, Número Interno Proser, Asegurado).
 * Bernardo Sojo y Oscar Atencia.
 */
export const SURA_LOGINS_EXCEL_VERIFICACION = Object.freeze(['72134505', '1065012991']);

/**
 * Alfa: estos logins ocultan del reporte los casos con fecha de llamada
 * (cola de contactos). El buscador sí los vuelve a mostrar.
 * Leyna Lucía Alfonso Rojas.
 */
export const ALFA_LOGINS_COLA_FECHA_LLAMADA = Object.freeze(['1098662033']);

export function obtenerContextoPermisoCaso(modulo = '') {
  return {
    modulo: String(modulo || '').toLowerCase(),
    login:
      typeof localStorage !== 'undefined' ? localStorage.getItem('login') || '' : '',
    cedula:
      typeof localStorage !== 'undefined' ? localStorage.getItem('cedula') || '' : '',
    nombre:
      typeof localStorage !== 'undefined' ? localStorage.getItem('nombre') || '' : '',
  };
}

function normalizarClaveDocumentoLogin(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  return digits.length >= 5 ? digits : s.toLowerCase();
}

function normalizarClaveLoginSura(valor) {
  return normalizarClaveDocumentoLogin(valor);
}

export function esLoginConPermisoLiderSura(login, modulo = '') {
  if (String(modulo || '').toLowerCase() !== 'sura') return false;
  const clave = normalizarClaveLoginSura(login);
  if (!clave) return false;
  return SURA_LOGINS_PERMISO_LIDER.map(normalizarClaveLoginSura).includes(clave);
}

export function esLoginColaFechaLlamadaAlfa(login) {
  const clave = normalizarClaveDocumentoLogin(login);
  if (!clave) return false;
  return ALFA_LOGINS_COLA_FECHA_LLAMADA.map(normalizarClaveDocumentoLogin).includes(clave);
}

export function esIdentidadColaFechaLlamadaAlfa(opts = {}) {
  return [opts.login, opts.cedula].some((v) => esLoginColaFechaLlamadaAlfa(v));
}

/** Sesión actual: Leyna (1098662033) ve cola Alfa sin fecha de llamada. */
export function esSesionColaFechaLlamadaAlfa() {
  const ctx = obtenerContextoPermisoCaso('alfa');
  return esIdentidadColaFechaLlamadaAlfa(ctx);
}

export function esIdentidadConPermisoLiderSura(opts = {}) {
  const modulo = opts.modulo || '';
  return [opts.login, opts.cedula].some((v) => esLoginConPermisoLiderSura(v, modulo));
}

/** Sesión actual: Mario Pinilla tiene poderes de líder solo en SURA. */
export function esSesionConPermisoLiderSura() {
  return esIdentidadConPermisoLiderSura(obtenerContextoPermisoCaso('sura'));
}

export function esLoginExcelVerificacionSura(login) {
  const clave = normalizarClaveDocumentoLogin(login);
  if (!clave) return false;
  return SURA_LOGINS_EXCEL_VERIFICACION.map(normalizarClaveDocumentoLogin).includes(clave);
}

/** Sesión actual: Bernardo Sojo o Oscar Atencia ven el Excel de verificación SURA. */
export function esSesionExcelVerificacionSura() {
  const ctx = obtenerContextoPermisoCaso('sura');
  return [ctx.login, ctx.cedula].some((v) => esLoginExcelVerificacionSura(v));
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
  if (esIdentidadConPermisoLiderSura(opts)) return true;
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
    .replace(/\s*\([^)]*\)/g, ' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function tokensPersona(valor) {
  return normalizarClavePersona(valor)
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 4);
}

export function coincidenPersonas(a, b) {
  const na = normalizarClavePersona(a);
  const nb = normalizarClavePersona(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const tokA = tokensPersona(na);
  const tokB = tokensPersona(nb);
  if (!tokA.length || !tokB.length) return false;
  const setB = new Set(tokB);
  return tokA.filter((t) => setB.has(t)).length >= 2;
}

/** Nombre o documento de la sesión (para textos de “mis casos”). */
export function etiquetaSesionPersona(ctx = obtenerContextoPermisoCaso()) {
  return String(ctx.nombre || ctx.login || ctx.cedula || '').trim();
}

export function clavesSesionPersona(ctx = obtenerContextoPermisoCaso()) {
  return [ctx.nombre, ctx.login, ctx.cedula]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
}

/**
 * Caso asignado a la sesión para trabajarlo: ajustador o inspector.
 * No usa ajustadorLider: ese campo es «quién asigna» (p. ej. Ladys en todo Zurich)
 * y no sustituye los casos que el líder también lleva como ajustador de campo.
 */
export function casoAsignadoASesionActual(caso, ctx = obtenerContextoPermisoCaso()) {
  const claves = clavesSesionPersona(ctx);
  if (!claves.length) return false;
  return claves.some(
    (k) =>
      coincidenPersonas(caso?.ajustador, k) || coincidenPersonas(caso?.inspector, k)
  );
}

export function filtrarCasosAsignadosASesion(casos = [], ctx = obtenerContextoPermisoCaso()) {
  return (Array.isArray(casos) ? casos : []).filter((caso) =>
    casoAsignadoASesionActual(caso, ctx)
  );
}

/**
 * Ajustador e inspector: solo casos que el líder les asignó.
 * En SURA, Mario (72288319) ve todos como el líder.
 */
export function rolConVistaRestringidaAsignacion(rol = obtenerRolAlmacenado(), opts = {}) {
  if (esIdentidadConPermisoLiderSura(opts)) return false;
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
  cedula = typeof localStorage !== 'undefined' ? localStorage.getItem('cedula') || '' : '',
  modulo = '',
} = {}) {
  if (!rolConVistaRestringidaAsignacion(rol, { login, cedula, modulo })) {
    return Array.isArray(casos) ? casos : [];
  }
  const claves = [nombre, login, cedula].map((s) => String(s || '').trim()).filter(Boolean);
  if (!claves.length) return [];
  const campo = normalizarRol(rol) === ROL_INSPECTOR ? 'inspector' : 'ajustador';
  return (Array.isArray(casos) ? casos : []).filter((caso) =>
    claves.some((k) => coincidenPersonas(caso?.[campo], k))
  );
}
