/**
 * Heurística para no listar en Gestión de Documentos perfiles de contacto / aseguradora.
 * Solo afecta esta pantalla; no modifica usuarios en BD.
 */
export function esPerfilAseguradoraDocumentos(u) {
  if (!u || typeof u !== 'object') return false;

  const priv = String(u.privAdmin || '').toLowerCase();
  if (priv.includes('aseguradora') || priv.includes('aseg_ext') || priv.includes('contacto_aseg')) {
    return true;
  }

  const cargos = String(u.cargos || '').toLowerCase();
  if (/\baseguradora\b/.test(cargos) && !/proser/.test(cargos)) return true;
  if (cargos.includes('funcionario') && cargos.includes('aseguradora')) return true;

  const empresa = String(u.empresa || '').toLowerCase();
  if (empresa.includes('aseguradora') && !empresa.includes('proser')) return true;

  const nombre = String(u.name || u.nombre || '').toLowerCase();
  if (nombre.includes('aseguradora') && nombre.includes('contacto')) return true;

  const rol = String(u.role || u.rol || '').toLowerCase();
  const email = String(u.email || u.correo || '').toLowerCase();
  if (rol === 'visualizador') {
    if (empresa.trim() && !/proser|grupo\s*proser/i.test(empresa)) return true;
    if (email.trim() && !/proser|grupoproser/i.test(email)) return true;
  }

  return false;
}
