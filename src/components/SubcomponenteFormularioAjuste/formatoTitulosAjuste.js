/** Título de sección: TODO EN MAYÚSCULAS */
export function tituloAjuste(texto) {
  return String(texto ?? '').trim().toLocaleUpperCase('es-CO');
}

/** Subtítulo o etiqueta descriptiva: solo la inicial en mayúscula */
export function subtituloAjuste(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return '';
  const lower = t.toLocaleLowerCase('es-CO');
  return lower.charAt(0).toLocaleUpperCase('es-CO') + lower.slice(1);
}
