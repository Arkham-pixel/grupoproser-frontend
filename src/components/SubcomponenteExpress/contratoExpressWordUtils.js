export function escapeXml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function withXmlSpace(attrs, text) {
  const needs =
    text.startsWith(' ') || text.endsWith(' ') || text.includes('  ') || text.includes('\n');
  if (!needs || /xml:space=/.test(attrs)) return attrs;
  return `${attrs} xml:space="preserve"`;
}

export function assertWellFormedXml(xml) {
  const openT = (xml.match(/<w:t(?=[\s>])/g) || []).length;
  const closeT = (xml.match(/<\/w:t>/g) || []).length;
  if (openT !== closeT) {
    throw new Error(`XML inválido: w:t desbalanceados (${openT} vs ${closeT})`);
  }
}

function collectWtNodes(xml) {
  const nodes = [];
  const re = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    nodes.push({
      attrs: m[1],
      text: m[2],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return nodes;
}

/** Reemplaza el texto entre dos marcadores literales dentro del OOXML (varios <w:t>). */
export function replaceOoxmlTextBetween(xml, startText, endText, newText) {
  const nodes = collectWtNodes(xml);
  const fullText = nodes.map((n) => n.text).join('');
  const startChar = fullText.indexOf(startText);
  if (startChar < 0) {
    throw new Error(`No se encontró el texto de inicio en la plantilla: ${startText}`);
  }
  const endChar = fullText.indexOf(endText, startChar + startText.length);
  if (endChar < 0) {
    throw new Error(`No se encontró el texto de fin en la plantilla: ${endText}`);
  }

  let charPos = 0;
  const withPos = nodes.map((n) => {
    const charStart = charPos;
    charPos += n.text.length;
    return { ...n, charStart, charEnd: charPos };
  });

  const firstIdx = withPos.findIndex((n) => n.charEnd > startChar);
  let lastNodeIdx = -1;
  for (let i = 0; i < withPos.length; i += 1) {
    if (withPos[i].charStart < endChar) lastNodeIdx = i;
  }
  if (firstIdx < 0 || lastNodeIdx < firstIdx) {
    throw new Error('No se pudo ubicar los nodos de texto para reemplazar la descripción');
  }

  const firstNode = withPos[firstIdx];
  const lastNode = withPos[lastNodeIdx];
  let result = xml;

  const rangeNodes = withPos.slice(firstIdx, lastNodeIdx + 1);
  const sortedByDescStart = [...rangeNodes].sort((a, b) => b.start - a.start);

  for (const n of sortedByDescStart) {
    let newNodeText = '';

    if (firstIdx === lastNodeIdx) {
      const prefix = n.text.slice(0, startChar - n.charStart);
      const suffix = n.text.slice(endChar - n.charStart);
      newNodeText = prefix + newText + suffix;
    } else if (n.start === firstNode.start) {
      newNodeText = n.text.slice(0, startChar - n.charStart) + newText;
    } else if (n.start === lastNode.start) {
      newNodeText = n.text.slice(endChar - n.charStart);
    }

    const newMatch = `<w:t${withXmlSpace(n.attrs, newNodeText)}>${escapeXml(newNodeText)}</w:t>`;
    result = result.slice(0, n.start) + newMatch + result.slice(n.end);
  }

  return result;
}

/** Reemplaza en orden cada run con resaltado amarillo. Quita el highlight. */
export function replaceYellowRunsInOrder(xml, values) {
  let valueIdx = 0;
  const runRe = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;

  return xml.replace(runRe, (run) => {
    if (!/w:highlight[^>]*w:val="yellow"/i.test(run)) return run;
    if (!/<w:t[^>]*>[^<]*<\/w:t>/.test(run)) return run;
    if (valueIdx >= values.length) return run;

    const newVal = String(values[valueIdx++] ?? '');
    let newRun = run
      .replace(/<w:highlight[^>]*\/>/gi, '')
      .replace(/<w:highlight[^>]*>[\s\S]*?<\/w:highlight>/gi, '');

    const wtRe = /(<w:t)([^>]*)>([^<]*)<\/w:t>/;
    const wtMatch = newRun.match(wtRe);
    if (!wtMatch) return run;

    const safe = escapeXml(newVal);
    newRun = newRun.replace(wtRe, (_match, open, attrs) => {
      return `${open}${withXmlSpace(attrs, newVal)}>${safe}</w:t>`;
    });
    return newRun;
  });
}

/** Reemplaza texto exacto dentro de nodos <w:t> (marcadores sin resaltar). */
export function replaceWtExactTexts(xml, pairs = []) {
  let result = xml;
  for (const [search, replacement] of pairs) {
    if (!search) continue;
    const re = new RegExp(`(<w:t)([^>]*)>${escapeRegex(search)}(</w:t>)`, 'g');
    result = result.replace(re, (_m, open, attrs, close) => {
      const val = String(replacement ?? '');
      return `${open}${withXmlSpace(attrs, val)}>${escapeXml(val)}${close}`;
    });
  }
  return result;
}

/**
 * Reemplaza un literal que puede estar partido en varios <w:t> (p. ej. «D» + «IEGO…»).
 * Sustituye todas las ocurrencias.
 */
export function replaceOoxmlLiteral(xml, searchText, newText) {
  const search = String(searchText ?? '');
  if (!search) return xml;

  let result = xml;
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const nodes = collectWtNodes(result);
    const fullText = nodes.map((n) => n.text).join('');
    const startChar = fullText.indexOf(search);
    if (startChar < 0) break;
    const endChar = startChar + search.length;

    let charPos = 0;
    const withPos = nodes.map((n) => {
      const charStart = charPos;
      charPos += n.text.length;
      return { ...n, charStart, charEnd: charPos };
    });

    const firstIdx = withPos.findIndex((n) => n.charEnd > startChar);
    let lastNodeIdx = -1;
    for (let i = 0; i < withPos.length; i += 1) {
      if (withPos[i].charStart < endChar) lastNodeIdx = i;
    }
    if (firstIdx < 0 || lastNodeIdx < firstIdx) break;

    const firstNode = withPos[firstIdx];
    const lastNode = withPos[lastNodeIdx];
    const rangeNodes = withPos.slice(firstIdx, lastNodeIdx + 1);
    const sortedByDescStart = [...rangeNodes].sort((a, b) => b.start - a.start);

    for (const n of sortedByDescStart) {
      let newNodeText = '';
      if (firstIdx === lastNodeIdx) {
        const prefix = n.text.slice(0, startChar - n.charStart);
        const suffix = n.text.slice(endChar - n.charStart);
        newNodeText = prefix + newText + suffix;
      } else if (n.start === firstNode.start) {
        newNodeText = n.text.slice(0, startChar - n.charStart) + newText;
      } else if (n.start === lastNode.start) {
        newNodeText = n.text.slice(endChar - n.charStart);
      }

      const newMatch = `<w:t${withXmlSpace(n.attrs, newNodeText)}>${escapeXml(newNodeText)}</w:t>`;
      result = result.slice(0, n.start) + newMatch + result.slice(n.end);
    }
  }
  return result;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
