/**
 * En Word, cada sección es independiente. Si solo la primera declara Header
 * y luego cambia orientación (portrait → landscape), el encabezado «salta».
 * Se aplica el mismo Header a todas las secciones (o el que ya traiga cada una).
 */
export function seccionesConEncabezadoUnico(sections = [], header) {
  if (!header) return sections;
  return (Array.isArray(sections) ? sections : []).map((sec) => {
    if (!sec || typeof sec !== 'object') return sec;
    if (sec.headers?.default) return sec;
    return {
      ...sec,
      headers: { ...(sec.headers || {}), default: header },
    };
  });
}
