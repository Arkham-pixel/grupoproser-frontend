/**
 * Espejo de grupoproser-backend/utils/jerarquiaEra.js
 * Cadena: Líder Proser Ajustes → Líder ERA → Ajustador ERA → Inspector ERA.
 */
import { esRolEra as esRolEraConfig, normalizarRol, ROL_ERA } from '../config/roles.js';

export { ROL_ERA };

export const FIRMA_ERA = 'ERA';

export const LIDER_ERA = Object.freeze({
  login: '4201038754011',
  needles: ['ERICK'],
  etiqueta: 'Líder ERA',
});

export const LIDER_PROSER_AJUSTES = Object.freeze({
  needles: ['SILVIA'],
  etiqueta: 'Líder Proser Ajustes',
  modulo: 'alfa',
});

export function haystackPersona(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .trim()
    .toUpperCase();
}

export function claveDocumentoEra(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  return digits.length >= 5 ? digits : s.toLowerCase();
}

export function esRolEra(rol) {
  return esRolEraConfig(rol) || normalizarRol(rol) === ROL_ERA;
}

export function esEmpresaEra(empresa) {
  return haystackPersona(empresa) === FIRMA_ERA;
}

export function esIdentidadEra(identidad = {}) {
  if (esRolEra(identidad.rol || identidad.role)) return true;
  return esEmpresaEra(identidad.empresa);
}

export function esIdentidadLiderEra(identidad = {}) {
  const login = claveDocumentoEra(identidad.login || identidad.cedula);
  if (login && login === LIDER_ERA.login) return true;
  if (!esIdentidadEra(identidad)) return false;
  const hay = haystackPersona(identidad.name || identidad.nombre || '');
  return Boolean(hay) && LIDER_ERA.needles.some((n) => hay.includes(haystackPersona(n)));
}

export function casoMarcadoFirmaEra(caso = {}) {
  return haystackPersona(caso.firmaAjuste) === FIRMA_ERA;
}

export function identidadSesionEra() {
  if (typeof localStorage === 'undefined') {
    return { rol: '', login: '', cedula: '', name: '', nombre: '', empresa: '' };
  }
  const nombre = localStorage.getItem('nombre') || '';
  return {
    rol: localStorage.getItem('rol') || '',
    login: localStorage.getItem('login') || '',
    cedula: localStorage.getItem('cedula') || '',
    name: nombre,
    nombre,
    empresa: localStorage.getItem('empresa') || '',
  };
}

export function esSesionEra() {
  return esIdentidadEra(identidadSesionEra());
}

export function esSesionLiderEra() {
  return esIdentidadLiderEra(identidadSesionEra());
}
