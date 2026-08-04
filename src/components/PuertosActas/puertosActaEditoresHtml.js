/** Lectura a prueba de fallos de refs React: toma el HTML desde el DOM. */
export function leerHtmlEditoresActaPuertos() {
  const obs = document.querySelector('[data-puertos-editor="observaciones"]');
  const rec = document.querySelector('[data-puertos-editor="recomendaciones"]');
  return {
    observaciones: obs ? String(obs.innerHTML || '') : '',
    recomendaciones: rec ? String(rec.innerHTML || '') : '',
  };
}

export function textoPlanoHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Elige el candidato con más texto visible (evita que un '' pise contenido válido). */
export function elegirHtmlMasCompleto(...candidatos) {
  let mejor = '';
  let mejorLen = -1;
  for (const c of candidatos) {
    if (typeof c !== 'string') continue;
    const len = textoPlanoHtml(c).length;
    if (len > mejorLen) {
      mejor = c;
      mejorLen = len;
    }
  }
  return mejor;
}
