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

/** Elige el candidato con más texto visible (evita que un '' pise contenido válido).
 * Prefiere HTML que conserve cuadros/tablas cuando el texto es similar.
 */
export function elegirHtmlMasCompleto(...candidatos) {
  let mejor = '';
  let mejorScore = -1;
  for (const c of candidatos) {
    if (typeof c !== 'string') continue;
    const len = textoPlanoHtml(c).length;
    const tieneTabla = /<table[\s>]/i.test(c) ? 500 : 0;
    const tieneEstilo = /<(b|strong|i|em|ul|ol|li)\b/i.test(c) ? 50 : 0;
    const score = len + tieneTabla + tieneEstilo;
    if (score > mejorScore) {
      mejor = c;
      mejorScore = score;
    }
  }
  return mejor;
}
