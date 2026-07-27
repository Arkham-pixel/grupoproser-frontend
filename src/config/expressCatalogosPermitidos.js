/**
 * Acceso a Catálogos Express (/admin/catalogos-express).
 * Debe coincidir con backend/config/expressCatalogosPermitidos.js
 */
export const LOGIN_CATALOGOS_EXPRESS_EXTRA = [
  '1048210029', // Alexander Escalante
  '1007183772', // Maria Garcias
  '1044800214', // Gabriel Moreno
];

export const EMAILS_CATALOGOS_EXPRESS_EXTRA = [
  'aescalante@proserpuertos.com.co',
];

/**
 * Responsables visibles en carga/edición Express.
 * Solo estos tres (filtro sobre la lista de /api/responsables).
 */
export const RESPONSABLES_EXPRESS_PERMITIDOS = [
  {
    clave: 'maria garcia',
    // María García / Maria Garcias (sin exigir "trinidad")
    match: (n) => n.includes('maria') && (n.includes('garcia') || n.includes('garcias')),
  },
  {
    clave: 'gabriel moreno',
    match: (n) => n.includes('gabriel') && n.includes('moreno'),
  },
  {
    clave: 'alexander escalante',
    // Alex / Alexander Escalante — excluye Ladys u otros Escalante
    match: (n) =>
      n.includes('escalante') &&
      (n.includes('alexander') || n.includes('alex')) &&
      !n.includes('ladys') &&
      !n.includes('andrea') &&
      !n.includes('bossio'),
  },
];

export function normalizarTextoResponsableExpress(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function esResponsableExpressPermitido(nombre = '') {
  const n = normalizarTextoResponsableExpress(nombre);
  if (!n) return false;
  return RESPONSABLES_EXPRESS_PERMITIDOS.some(({ match }) => match(n));
}

export function rolPuedeCatalogosExpress(rol) {
  const r = String(rol || '')
    .trim()
    .toLowerCase();
  return r === 'admin' || r === 'administrador' || r === 'soporte';
}

export function usuarioAutorizadoCatalogosExpress(cedula, login, email, rol) {
  if (rolPuedeCatalogosExpress(rol)) return true;
  const c = String(cedula || '').trim();
  const l = String(login || '').trim();
  const e = String(email || '')
    .trim()
    .toLowerCase();
  if (LOGIN_CATALOGOS_EXPRESS_EXTRA.includes(c) || LOGIN_CATALOGOS_EXPRESS_EXTRA.includes(l)) {
    return true;
  }
  return EMAILS_CATALOGOS_EXPRESS_EXTRA.includes(e);
}
