/**
 * Quién puede usar la gestión de documentos de empleados (ruta /admin/documentos).
 * Debe coincidir con backend/config/gestionDocumentosPermitidos.js
 */
export const IDENTIFICADORES_GESTION_DOCUMENTOS = [
  '1065012991', // Oscar Atencia
  '1140829957', // Arnaldo Tapia
  '1143263277', // Adriana Angulo
  '1042241181', // Alejandro Carvajal
  '1042921181',
];

export function usuarioAutorizadoGestionDocumentos(cedula, login) {
  const c = String(cedula || '').trim();
  const l = String(login || '').trim();
  return (
    IDENTIFICADORES_GESTION_DOCUMENTOS.includes(c) ||
    IDENTIFICADORES_GESTION_DOCUMENTOS.includes(l)
  );
}
