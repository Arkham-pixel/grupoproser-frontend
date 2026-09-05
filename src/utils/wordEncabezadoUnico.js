/**
 * En Word, cada sección con su propio Header es independiente:
 * editar el de la pág. 1 no cambia el resto. Si solo la primera sección
 * declara headers, las siguientes quedan «igual que el anterior».
 */
export function seccionesConEncabezadoUnico(sections = [], header) {
  if (!header) return sections;
  return (Array.isArray(sections) ? sections : []).map((sec, index) => {
    if (!sec || typeof sec !== 'object') return sec;
    if (index === 0) {
      return {
        ...sec,
        headers: { ...(sec.headers || {}), default: header },
      };
    }
    const { headers: _omit, ...rest } = sec;
    return rest;
  });
}
