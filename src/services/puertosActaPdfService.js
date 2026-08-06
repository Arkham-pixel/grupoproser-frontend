import { jsPDF } from 'jspdf';
import LogoProser from '../img/Logo.png';
import { registrarFuentesPdf, familiaPdf } from './puertosCasoPdfFonts';
import {
  PDF_CONTENT_W,
  PDF_FONT,
  PDF_MARGINS,
  PDF_PAGE,
  assetImportadoABase64,
  detectarFormatoImagen,
  formatearFechaCorta,
  imagenInformeABase64,
} from './puertosCasoExportacionPdfHelpers';
import { actaApiAFormulario } from '../components/PuertosActas/puertosActaMapper';
import { getPuertosActa } from './puertosService';

/** Colores estilo POL (formulario clásico, sin verde Bolívar). */
const C = {
  text: [20, 20, 20],
  muted: [80, 80, 80],
  border: [90, 90, 90],
  headerBg: [55, 55, 55],
  sectionBg: [230, 230, 230],
  labelBg: [245, 245, 245],
  white: [255, 255, 255],
  accent: [180, 30, 40],
};

const LINE_H = 3.8;
const CELL_PAD = 1.4;

function decodificarEntidadesHtml(str) {
  return String(str ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizarTextoPdf(valor) {
  return decodificarEntidadesHtml(valor)
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function estiloDesdeAtributos(el, estiloPadre) {
  const next = { ...estiloPadre };
  const tag = String(el.tagName || '').toLowerCase();
  if (tag === 'b' || tag === 'strong' || tag === 'th') next.bold = true;
  if (tag === 'i' || tag === 'em') next.italic = true;
  const style = String(el.getAttribute?.('style') || '');
  if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) next.bold = true;
  if (/font-style\s*:\s*italic/i.test(style)) next.italic = true;
  return next;
}

function textoPlanoNodo(node) {
  if (!node) return '';
  if (node.nodeType === 3) return String(node.nodeValue || '');
  if (node.nodeType !== 1) return '';
  const tag = String(node.tagName || '').toLowerCase();
  if (tag === 'br') return '\n';
  return Array.from(node.childNodes)
    .map((c) => textoPlanoNodo(c))
    .join('');
}

/** Extrae runs con estilo desde un nodo (celda / fragmento). */
function nodoARuns(node, estiloBase = { bold: false, italic: false }) {
  const runs = [];
  const push = (texto, estilo) => {
    if (texto == null || texto === '') return;
    const t = String(texto).replace(/\u00a0/g, ' ');
    if (!t) return;
    runs.push({
      text: t.replace(/\n+/g, ' '),
      bold: Boolean(estilo.bold),
      italic: Boolean(estilo.italic),
    });
  };
  const walk = (n, estilo) => {
    if (!n) return;
    if (n.nodeType === 3) {
      push(n.nodeValue || '', estilo);
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = String(n.tagName || '').toLowerCase();
    if (tag === 'br') {
      push(' ', estilo);
      return;
    }
    const next = estiloDesdeAtributos(n, estilo);
    Array.from(n.childNodes).forEach((c) => walk(c, next));
  };
  walk(node, estiloBase);
  const limpios = runs.filter((r) => r.text.length);
  return limpios.length ? limpios : [{ text: ' ' }];
}

function parseWidthRatio(raw, fallback = 0.45) {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  if (s.endsWith('%')) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.min(1, Math.max(0.15, n / 100)) : fallback;
  }
  const n = parseFloat(s);
  // px sin contexto → asumir proporción razonable respecto al ancho útil (~500px típico)
  if (Number.isFinite(n) && n > 0) return Math.min(1, Math.max(0.15, n / 520));
  return fallback;
}

function extraerAnchosTabla(tableEl, cols) {
  const styleW =
    (tableEl.getAttribute('style') || '').match(/width\s*:\s*([^;]+)/i)?.[1] ||
    tableEl.getAttribute('width') ||
    '';
  // Sin ancho explícito → compacto; no asumir 100%
  const widthRatio = parseWidthRatio(styleW, 0.45);

  const ratios = new Array(cols).fill(0);
  const colEls = tableEl.querySelectorAll(':scope > colgroup > col');
  if (colEls.length) {
    Array.from(colEls).slice(0, cols).forEach((col, i) => {
      const raw = col.style?.width || col.getAttribute('width') || '';
      if (raw.endsWith('%')) {
        const n = parseFloat(raw);
        if (Number.isFinite(n) && n > 0) ratios[i] = n;
      } else {
        const n = parseFloat(raw);
        if (Number.isFinite(n) && n > 0) ratios[i] = n;
      }
    });
  }

  if (ratios.every((r) => r <= 0)) {
    const firstRow = tableEl.querySelector('tr');
    if (firstRow) {
      Array.from(firstRow.children)
        .filter((c) => /^(td|th)$/i.test(c.tagName || ''))
        .slice(0, cols)
        .forEach((cell, i) => {
          const raw =
            (cell.getAttribute('style') || '').match(/width\s*:\s*([^;]+)/i)?.[1] ||
            cell.getAttribute('width') ||
            '';
          if (raw.endsWith('%')) {
            const n = parseFloat(raw);
            if (Number.isFinite(n) && n > 0) ratios[i] = n;
          }
        });
    }
  }

  if (ratios.every((r) => r <= 0)) {
    return { widthRatio, colRatios: new Array(cols).fill(1 / cols) };
  }

  // Rellenar huecos
  const missing = ratios.map((r) => (r > 0 ? 0 : 1));
  const assigned = ratios.reduce((a, b) => a + (b > 0 ? b : 0), 0);
  const missCount = missing.reduce((a, b) => a + b, 0);
  const remain = Math.max(0, 100 - assigned);
  const filled = ratios.map((r, i) =>
    r > 0 ? r : missCount ? remain / missCount : 1
  );
  const sum = filled.reduce((a, b) => a + b, 0) || 1;
  return {
    widthRatio,
    colRatios: filled.map((r) => r / sum),
  };
}

function extraerAlignCelda(cell) {
  const style = String(cell.getAttribute?.('style') || '');
  const m = style.match(/text-align\s*:\s*(left|center|right|justify)/i);
  if (m) return m[1].toLowerCase();
  const align = String(cell.getAttribute?.('align') || '').toLowerCase();
  if (align === 'left' || align === 'center' || align === 'right') return align;
  // Por defecto centrado (cuadros compactos de actas)
  return 'center';
}

function extraerTablaDeElemento(tableEl) {
  const rows = [];
  const trList = tableEl.querySelectorAll('tr');
  trList.forEach((tr) => {
    const celdas = [];
    Array.from(tr.children).forEach((cell) => {
      const tag = String(cell.tagName || '').toLowerCase();
      if (tag !== 'td' && tag !== 'th') return;
      const base = { bold: tag === 'th', italic: false };
      const runs = nodoARuns(cell, base);
      celdas.push({
        runs,
        isHeader: tag === 'th',
        align: extraerAlignCelda(cell),
      });
    });
    if (celdas.length) rows.push(celdas);
  });
  if (!rows.length) return null;
  const cols = Math.max(...rows.map((r) => r.length), 1);
  const { widthRatio, colRatios } = extraerAnchosTabla(tableEl, cols);
  return { type: 'table', rows, widthRatio, colRatios };
}

/**
 * HTML del editor → bloques de párrafo o tabla (para PDF fiel al cuadro).
 * @returns {Array<{type:'paragraph', runs}|{type:'table', rows}>}
 */
function htmlABloques(html) {
  const raw = String(html ?? '');
  if (!raw.trim()) return [{ type: 'paragraph', runs: [{ text: ' ' }] }];

  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    return raw
      .replace(/\r\n/g, '\n')
      .split(/\n/)
      .map((linea) => {
        const t = decodificarEntidadesHtml(linea).replace(/\u00a0/g, ' ');
        if (!t.trim()) return null;
        return { type: 'paragraph', runs: [{ text: t.replace(/[ \t]+$/g, '') }] };
      })
      .filter(Boolean);
  }

  if (typeof document === 'undefined') {
    return htmlAParrafosRunsRegex(raw).map((runs) => ({ type: 'paragraph', runs }));
  }

  const root = document.createElement('div');
  root.innerHTML = raw;
  const bloques = [];
  let runs = [];

  const flushParrafo = () => {
    const limpios = runs
      .map((r) => ({
        ...r,
        text: String(r.text || '').replace(/\u00a0/g, ' '),
      }))
      .filter((r) => r.text.length);
    const soloBala =
      limpios.length && limpios.every((r) => /^\s*[-*•–—]+\s*$/.test(r.text));
    if (limpios.length && !soloBala) {
      bloques.push({ type: 'paragraph', runs: limpios });
    }
    runs = [];
  };

  const pushTexto = (texto, estilo) => {
    if (texto == null || texto === '') return;
    const t = String(texto).replace(/\u00a0/g, ' ');
    if (!t) return;
    const partes = t.split('\n');
    partes.forEach((parte, idx) => {
      if (parte) {
        runs.push({
          text: parte,
          bold: Boolean(estilo.bold),
          italic: Boolean(estilo.italic),
        });
      }
      if (idx < partes.length - 1) flushParrafo();
    });
  };

  const stripBalaInicialEnArbol = (node) => {
    if (!node) return false;
    if (node.nodeType === 3) {
      const original = String(node.nodeValue || '');
      const limpio = original.replace(/^\s*[-*•–—]+\s+/, '');
      if (limpio !== original) {
        node.nodeValue = limpio;
        return true;
      }
      return !original.trim();
    }
    if (node.nodeType !== 1) return false;
    const tag = String(node.tagName || '').toLowerCase();
    if (tag === 'br') return true;
    for (const child of Array.from(node.childNodes)) {
      const seguir = stripBalaInicialEnArbol(child);
      if (!seguir) return false;
    }
    return true;
  };

  const walk = (node, estilo) => {
    if (!node) return;
    if (node.nodeType === 3) {
      pushTexto(node.nodeValue || '', estilo);
      return;
    }
    if (node.nodeType !== 1) return;

    const el = node;
    const tag = String(el.tagName || '').toLowerCase();

    if (tag === 'table') {
      flushParrafo();
      const tabla = extraerTablaDeElemento(el);
      if (tabla) bloques.push(tabla);
      return;
    }

    if (tag === 'br') {
      if (runs.length) flushParrafo();
      return;
    }
    if (tag === 'hr') {
      flushParrafo();
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      flushParrafo();
      Array.from(el.childNodes).forEach((child) => walk(child, estilo));
      flushParrafo();
      return;
    }

    const nextEstilo = estiloDesdeAtributos(el, estilo);

    if (tag === 'li') {
      flushParrafo();
      const plano = textoPlanoNodo(el).replace(/\u00a0/g, ' ').trim();
      if (!plano) return;
      const clone = el.cloneNode(true);
      stripBalaInicialEnArbol(clone);
      const plano2 = textoPlanoNodo(clone).replace(/\u00a0/g, ' ').trim();
      if (!plano2) return;
      pushTexto('- ', nextEstilo);
      Array.from(clone.childNodes).forEach((child) => walk(child, nextEstilo));
      flushParrafo();
      return;
    }

    // Celdas/filas huérfanas (sin <table>): no generar un párrafo por celda
    // (eso dejaba huecos enormes en el PDF). Se unen en una sola línea.
    if (tag === 'tr') {
      flushParrafo();
      const celdas = Array.from(el.children).filter((c) =>
        /^(td|th)$/i.test(c.tagName || '')
      );
      celdas.forEach((cell, i) => {
        if (i > 0) pushTexto('  |  ', nextEstilo);
        const base = {
          bold: String(cell.tagName || '').toLowerCase() === 'th' || nextEstilo.bold,
          italic: nextEstilo.italic,
        };
        Array.from(cell.childNodes).forEach((child) => walk(child, base));
      });
      flushParrafo();
      return;
    }
    if (tag === 'td' || tag === 'th' || tag === 'thead' || tag === 'tbody') {
      Array.from(el.childNodes).forEach((child) => walk(child, nextEstilo));
      return;
    }

    const esBloque = /^(p|div|h[1-6]|blockquote)$/i.test(tag);
    // Dentro de una celda, <p> no debe abrir párrafos nuevos del bloque externo
    if (esBloque) flushParrafo();
    Array.from(el.childNodes).forEach((child) => walk(child, nextEstilo));
    if (esBloque) flushParrafo();
  };

  Array.from(root.childNodes).forEach((child) => walk(child, { bold: false, italic: false }));
  flushParrafo();

  return bloques.length ? bloques : [{ type: 'paragraph', runs: [{ text: ' ' }] }];
}

/** Compat: solo párrafos (sin tablas). */
function htmlAParrafosRuns(html) {
  return htmlABloques(html)
    .filter((b) => b.type === 'paragraph')
    .map((b) => b.runs);
}

/** Fallback sin DOM (p.ej. tests). */
function htmlAParrafosRunsRegex(raw) {
  const conSaltos = raw
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    // Una sola bala; si el li ya traía "-", no duplicar
    .replace(/<li[^>]*>\s*[-*•–—]+\s*/gi, '\n«LI»')
    .replace(/<li[^>]*>/gi, '\n«LI»')
    .replace(/<hr\s*\/?>/gi, '\n')
    .replace(/<\/?(ul|ol|p|div|h[1-6])[^>]*>/gi, '');

  let html = conSaltos;
  html = html.replace(
    /<span\b[^>]*style="[^"]*font-weight\s*:\s*(?:bold|[6-9]00)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    '<b>$1</b>'
  );

  const tokenRe =
    /«LI»|<\/?(?:strong|b|em|i|u|span)(?:\s[^>]*)?>|[^<«]+|<\/?[^>]+>/gi;
  const parrafos = [];
  let runs = [];
  let bold = 0;
  let italic = 0;

  const flushParrafo = () => {
    const limpios = runs
      .map((r) => ({ ...r, text: decodificarEntidadesHtml(r.text) }))
      .filter((r) => r.text.length);
    const soloBala =
      limpios.length && limpios.every((r) => /^\s*[-*•–—]+\s*$/.test(r.text));
    if (limpios.length && !soloBala) parrafos.push(limpios);
    runs = [];
  };

  const pushTexto = (t) => {
    if (!t) return;
    const partes = t.split('\n');
    partes.forEach((parte, idx) => {
      if (parte) {
        runs.push({
          text: parte,
          bold: bold > 0,
          italic: italic > 0,
        });
      }
      if (idx < partes.length - 1) flushParrafo();
    });
  };

  let m;
  while ((m = tokenRe.exec(html)) !== null) {
    const tok = m[0];
    const lower = tok.toLowerCase();
    if (tok === '«LI»') {
      flushParrafo();
      pushTexto('- ');
    } else if (lower === '<strong>' || lower === '<b>' || /^<strong\s/i.test(tok) || /^<b\s/i.test(tok)) {
      bold += 1;
    } else if (lower === '</strong>' || lower === '</b>') {
      bold = Math.max(0, bold - 1);
    } else if (lower === '<em>' || lower === '<i>' || /^<em\s/i.test(tok) || /^<i\s/i.test(tok)) {
      italic += 1;
    } else if (lower === '</em>' || lower === '</i>') {
      italic = Math.max(0, italic - 1);
    } else if (tok.startsWith('<')) {
      /* ignore */
    } else {
      pushTexto(tok);
    }
  }
  flushParrafo();
  return parrafos.length ? parrafos : [[{ text: ' ' }]];
}

function aplicarFuenteRun(doc, run, fontSize = 8.5) {
  const weight = run.bold ? 'bold' : 'normal';
  doc.setFont(familiaPdf(weight), 'normal');
  if (run.italic && !run.bold) {
    try {
      doc.setFont(familiaPdf('normal'), 'italic');
    } catch {
      doc.setFont(familiaPdf('normal'), 'normal');
    }
  }
  doc.setFontSize(fontSize);
}

/**
 * Particiona runs en líneas que caben en maxWidth (respeta negrita/cursiva).
 */
function layoutRunsEnLineas(doc, runs, maxWidth, fontSize = 8.5) {
  const lineas = [];
  let linea = [];
  let anchoLinea = 0;

  const medir = (run, textoRun) => {
    aplicarFuenteRun(doc, run, fontSize);
    return doc.getTextWidth(textoRun);
  };

  const empujarLinea = () => {
    if (linea.length) lineas.push(linea);
    linea = [];
    anchoLinea = 0;
  };

  for (const run of runs) {
    const palabras = String(run.text || '').split(/(\s+)/);
    for (const palabra of palabras) {
      if (!palabra) continue;
      const w = medir(run, palabra);
      if (anchoLinea > 0 && anchoLinea + w > maxWidth) {
        empujarLinea();
        if (/^\s+$/.test(palabra)) continue;
      }
      if (w > maxWidth && linea.length === 0) {
        let resto = palabra;
        while (resto) {
          let cortar = resto.length;
          while (cortar > 1 && medir(run, resto.slice(0, cortar)) > maxWidth) cortar -= 1;
          linea.push({ ...run, text: resto.slice(0, cortar) });
          empujarLinea();
          resto = resto.slice(cortar);
        }
        continue;
      }
      linea.push({ ...run, text: palabra });
      anchoLinea += w;
    }
  }
  empujarLinea();
  return lineas.length ? lineas : [[{ text: ' ' }]];
}

function dibujarLineaRuns(doc, linea, x, y, fontSize = 8.5) {
  let cx = x;
  for (const run of linea) {
    aplicarFuenteRun(doc, run, fontSize);
    doc.setTextColor(...C.text);
    doc.text(run.text, cx, y);
    cx += doc.getTextWidth(run.text);
  }
}

function texto(valor) {
  const limpio = normalizarTextoPdf(valor).replace(/\n+/g, ' ');
  return limpio || '';
}

function siNo(valor) {
  return valor ? 'SI' : 'NO';
}

function extraerFechaHora(fechaActa) {
  const raw = String(fechaActa || '');
  if (!raw) return { fecha: '', hora: '' };
  if (raw.includes('T')) {
    const [f, h] = raw.split('T');
    return { fecha: formatearFechaCorta(f) || f, hora: (h || '').slice(0, 5) };
  }
  return { fecha: formatearFechaCorta(raw) || raw, hora: '' };
}

function asegurarEspacio(doc, y, alto, pageRef) {
  if (y + alto > PDF_PAGE.h - PDF_MARGINS.bottom) {
    doc.addPage();
    pageRef.page += 1;
    pintarPiePagina(doc, pageRef);
    return PDF_MARGINS.top;
  }
  return y;
}

function pintarPiePagina(doc, pageRef) {
  doc.setFont(familiaPdf('normal'), 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text(
    'Grupo Proser — Control Portuario',
    PDF_MARGINS.left,
    PDF_PAGE.h - 8
  );
  doc.text(`Página ${pageRef.page}`, PDF_PAGE.w - PDF_MARGINS.right, PDF_PAGE.h - 8, {
    align: 'right',
  });
}

function tituloSeccion(doc, y, titulo) {
  const alto = 6.5;
  doc.setFillColor(...C.headerBg);
  doc.rect(PDF_MARGINS.left, y, PDF_CONTENT_W, alto, 'F');
  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(titulo, PDF_MARGINS.left + 2.5, y + 4.4);
  return y + alto;
}

/**
 * Celda estilo POL: etiqueta bilingüe arriba + valor debajo.
 * @param {{label:string, value:string, span?:number}[]} celdas
 * @param {number[]} fracciones — fracciones de ancho (suman ~1)
 */
function filaCeldas(doc, y, pageRef, celdas, fracciones) {
  const x0 = PDF_MARGINS.left;
  const anchos = fracciones.map((f) => PDF_CONTENT_W * f);

  // Calcular alto según el valor más largo
  let altoMax = 10;
  celdas.forEach((c, i) => {
    const w = anchos[i] - CELL_PAD * 2;
    doc.setFontSize(7);
    const labelLines = doc.splitTextToSize(c.label, w);
    doc.setFontSize(8.5);
    const valLines = doc.splitTextToSize(texto(c.value) || ' ', w);
    const alto = 3.2 + labelLines.length * 3.2 + valLines.length * 3.6 + 2;
    altoMax = Math.max(altoMax, alto);
  });

  y = asegurarEspacio(doc, y, altoMax + 0.5, pageRef);

  let x = x0;
  celdas.forEach((c, i) => {
    const w = anchos[i];
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.setFillColor(...C.white);
    doc.rect(x, y, w, altoMax, 'FD');

    doc.setFont(familiaPdf('normal'), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    const labelLines = doc.splitTextToSize(c.label, w - CELL_PAD * 2);
    doc.text(labelLines, x + CELL_PAD, y + 3.2);

    const labelH = labelLines.length * 3.2;
    doc.setFont(familiaPdf('bold'), 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.text);
    const valLines = doc.splitTextToSize(texto(c.value) || ' ', w - CELL_PAD * 2);
    doc.text(valLines, x + CELL_PAD, y + 3.5 + labelH);

    x += w;
  });

  return y + altoMax;
}

function filaValorCompleto(doc, y, pageRef, label, value) {
  return filaCeldas(doc, y, pageRef, [{ label, value }], [1]);
}

function medirAnchoRuns(doc, runs, fontSize) {
  let w = 0;
  for (const run of runs || []) {
    aplicarFuenteRun(doc, run, fontSize);
    w += doc.getTextWidth(String(run.text || ''));
  }
  return w;
}

function normalizarCeldasFila(row) {
  if (!Array.isArray(row)) return [];
  return row.map((cell) => {
    if (cell && Array.isArray(cell.runs)) return cell;
    if (Array.isArray(cell)) return { runs: cell, isHeader: false, align: 'left' };
    return { runs: [{ text: ' ' }], isHeader: false, align: 'left' };
  });
}

/** Dibuja una tabla HTML del editor dentro del cuadro de observaciones (fiel al editor). */
function dibujarTablaEnBloque(doc, yTexto, pageRef, tabla, maxW, fontSize, yInicioRef) {
  const rowsRaw = tabla.rows || [];
  if (!rowsRaw.length) return yTexto;

  const rows = rowsRaw.map(normalizarCeldasFila);
  const cols = Math.max(...rows.map((r) => r.length), 1);
  const fs = Math.max(8, fontSize - 0.5);
  const padX = 1.6;
  const padY = 1.1;
  const lineH = LINE_H * 0.88;

  // Anchos naturales por contenido (cuadro pequeño, al texto)
  const natural = new Array(cols).fill(0);
  rows.forEach((row) => {
    for (let c = 0; c < cols; c += 1) {
      const cell = row[c] || { runs: [{ text: ' ' }] };
      const w = medirAnchoRuns(doc, cell.runs, fs) + padX * 2 + 0.8;
      if (w > natural[c]) natural[c] = w;
    }
  });
  for (let c = 0; c < cols; c += 1) natural[c] = Math.max(natural[c], 10);

  const naturalSum = natural.reduce((a, b) => a + b, 0) || 1;
  // Siempre compacto: solo un poco más que el texto (máx. ~42% del bloque)
  const tableW = Math.min(maxW * 0.42, naturalSum * 1.08);

  const ratios =
    Array.isArray(tabla.colRatios) && tabla.colRatios.length === cols
      ? tabla.colRatios
      : null;

  let colWidths;
  if (ratios && !ratios.every((r) => Math.abs(r - ratios[0]) < 0.02)) {
    colWidths = ratios.map((r) => tableW * r);
  } else {
    colWidths = natural.map((w) => (w / naturalSum) * tableW);
  }

  let y = yTexto + 1;

  const asegurar = (alto) => {
    if (y + alto > PDF_PAGE.h - PDF_MARGINS.bottom) {
      doc.rect(PDF_MARGINS.left, yInicioRef.y0, PDF_CONTENT_W, y - yInicioRef.y0 + 1);
      doc.addPage();
      pageRef.page += 1;
      pintarPiePagina(doc, pageRef);
      yInicioRef.y0 = PDF_MARGINS.top;
      y = PDF_MARGINS.top + 4;
    }
  };

  rows.forEach((row) => {
    const celdasLayout = [];
    for (let c = 0; c < cols; c += 1) {
      const cell = row[c] || { runs: [{ text: ' ' }], isHeader: false, align: 'center' };
      const lineas = layoutRunsEnLineas(
        doc,
        cell.runs?.length ? cell.runs : [{ text: ' ' }],
        Math.max(6, colWidths[c] - padX * 2),
        fs
      );
      celdasLayout.push({ ...cell, align: cell.align || 'center', lineas });
    }
    const rowH = Math.max(
      4.8,
      ...celdasLayout.map((c) => c.lineas.length * lineH + padY * 2)
    );
    asegurar(rowH + 0.3);

    let x = PDF_MARGINS.left + 2;
    celdasLayout.forEach((cell, c) => {
      const colW = colWidths[c];
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.35);
      doc.setFillColor(...C.white);
      doc.rect(x, y, colW, rowH, 'FD');

      let ty = y + padY + fs * 0.32 + 1.1;
      cell.lineas.forEach((linea) => {
        // Por defecto centrado (como el ejemplo del usuario)
        let lw = 0;
        for (const run of linea) {
          aplicarFuenteRun(doc, run, fs);
          lw += doc.getTextWidth(String(run.text || ''));
        }
        let tx = x + (colW - lw) / 2;
        if (cell.align === 'left') tx = x + padX;
        else if (cell.align === 'right') tx = x + colW - padX - lw;
        dibujarLineaRuns(doc, linea, tx, ty, fs);
        ty += lineH;
      });
      x += colW;
    });
    y += rowH;
  });

  return y + 2.5;
}

function escribirBloque(doc, y, pageRef, titulo, subtitulo, cuerpo) {
  y = asegurarEspacio(doc, y, 16, pageRef);
  y = tituloSeccion(doc, y, titulo);

  if (subtitulo) {
    y = asegurarEspacio(doc, y, 8, pageRef);
    doc.setFont(familiaPdf('normal'), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    const sub = doc.splitTextToSize(subtitulo, PDF_CONTENT_W - 2);
    doc.text(sub, PDF_MARGINS.left + 1, y + 3);
    y += sub.length * 3 + 2;
  }

  const maxW = PDF_CONTENT_W - 4;
  const fontSize = 9;
  const gapParrafo = LINE_H * 0.55;
  const bloques = htmlABloques(cuerpo);

  y = asegurarEspacio(doc, y, 20, pageRef);

  let yTexto = y + 4;
  const yInicioRef = { y0: y };
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);

  const nuevaPaginaCuadro = () => {
    doc.rect(PDF_MARGINS.left, yInicioRef.y0, PDF_CONTENT_W, yTexto - yInicioRef.y0 + 1);
    doc.addPage();
    pageRef.page += 1;
    pintarPiePagina(doc, pageRef);
    y = PDF_MARGINS.top;
    yInicioRef.y0 = y;
    yTexto = y + 4;
  };

  bloques.forEach((bloque, idx) => {
    if (bloque.type === 'table') {
      yTexto = dibujarTablaEnBloque(
        doc,
        yTexto,
        pageRef,
        bloque,
        maxW,
        fontSize,
        yInicioRef
      );
    } else {
      const lineas = layoutRunsEnLineas(doc, bloque.runs || [{ text: ' ' }], maxW, fontSize);
      for (const linea of lineas) {
        if (yTexto + LINE_H > PDF_PAGE.h - PDF_MARGINS.bottom) {
          nuevaPaginaCuadro();
        }
        dibujarLineaRuns(doc, linea, PDF_MARGINS.left + 2, yTexto, fontSize);
        yTexto += LINE_H;
      }
    }
    if (idx < bloques.length - 1) {
      if (yTexto + gapParrafo > PDF_PAGE.h - PDF_MARGINS.bottom) {
        nuevaPaginaCuadro();
      } else {
        yTexto += gapParrafo;
      }
    }
  });

  const altoFinal = Math.max(12, yTexto - yInicioRef.y0 + 2);
  doc.rect(PDF_MARGINS.left, yInicioRef.y0, PDF_CONTENT_W, altoFinal);
  return yInicioRef.y0 + altoFinal + 2;
}

async function pintarEncabezado(doc, form, logoDataUrl) {
  let y = PDF_MARGINS.top - 4;

  // Logo Grupo Proser (izquierda)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', PDF_MARGINS.left, y, 48, 16);
    } catch {
      /* sin logo */
    }
  }

  // Caja ACTA / REPORT (derecha)
  const boxW = 48;
  const boxH = 16;
  const boxX = PDF_MARGINS.left + PDF_CONTENT_W - boxW;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.6);
  doc.rect(boxX, y, boxW, boxH);
  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  doc.text('ACTA / REPORT', boxX + boxW / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(...C.accent);
  doc.text(`No. ${texto(form.nroActa) || '—'}`, boxX + boxW / 2, y + 12, { align: 'center' });

  y += 20;

  // Título centrado
  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.text('CONTROL PORTUARIO, RISK MANAGEMENT', PDF_PAGE.w / 2, y, { align: 'center' });
  y += 4.5;
  doc.text('Y AJUSTES DE SINIESTROS', PDF_PAGE.w / 2, y, { align: 'center' });
  y += 4;
  doc.setFont(familiaPdf('normal'), 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text('PROSER PUERTOS — AJUSTADORES DE SEGUROS', PDF_PAGE.w / 2, y, { align: 'center' });

  y += 5;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.line(PDF_MARGINS.left, y, PDF_MARGINS.left + PDF_CONTENT_W, y);
  return y + 3;
}

async function normalizarImagenFoto(foto) {
  const candidatos = [foto?.src, foto?.preview, foto?.ruta, foto?.url, foto?.nombre].filter(Boolean);
  for (const src of candidatos) {
    if (String(src).startsWith('data:') || String(src).startsWith('blob:')) {
      const convertida = await convertirDataUrlAJpeg(src);
      if (convertida) return convertida;
    }
  }

  const remota = await imagenInformeABase64(foto);
  if (remota) {
    const convertida = await convertirDataUrlAJpeg(remota);
    if (convertida) return convertida;
  }

  for (const src of candidatos) {
    const convertida = await convertirDataUrlAJpeg(src);
    if (convertida) return convertida;
  }

  return null;
}

function convertirDataUrlAJpeg(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string') {
      resolve(null);
      return;
    }

    const formato = detectarFormatoImagen(dataUrl);
    if (formato === 'JPEG' && dataUrl.includes('image/jpeg')) {
      resolve({ data: dataUrl, format: 'JPEG' });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/jpeg', 0.88), format: 'JPEG' });
      } catch {
        resolve({ data: dataUrl, format: formato });
      }
    };
    img.onerror = () => resolve({ data: dataUrl, format: formato });
    img.src = dataUrl;
  });
}

async function pintarFotos(doc, pageRef, form, fotos = []) {
  const preparadas = [];
  for (const foto of fotos) {
    const normalizada = await normalizarImagenFoto(foto);
    if (normalizada?.data) {
      preparadas.push({
        ...foto,
        data: normalizada.data,
        format: normalizada.format || 'JPEG',
      });
    }
  }

  if (!preparadas.length) return;

  doc.addPage();
  pageRef.page += 1;
  pintarPiePagina(doc, pageRef);

  const tituloFotos = (continuacion) => {
    doc.setFont(familiaPdf('bold'), 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.text);
    const nro = texto(form.nroActa) || '—';
    doc.text(
      continuacion ? `Fotos del Acta Nro. ${nro} (cont.)` : `Fotos del Acta Nro. ${nro}`,
      PDF_MARGINS.left,
      PDF_MARGINS.top
    );
  };

  tituloFotos(false);
  let y = PDF_MARGINS.top + 6;

  const gap = 4;
  const anchoFoto = (PDF_CONTENT_W - gap) / 2;
  const altoFoto = 58;
  const altoBloque = altoFoto + 8;
  let col = 0;
  let yFila = y;

  preparadas.forEach((foto, idx) => {
    if (col === 0) {
      const saltaPagina = y + altoBloque + 2 > PDF_PAGE.h - PDF_MARGINS.bottom;
      yFila = asegurarEspacio(doc, y, altoBloque + 2, pageRef);
      if (saltaPagina) {
        tituloFotos(true);
        yFila = PDF_MARGINS.top + 6;
      }
      y = yFila;
    }

    const x = PDF_MARGINS.left + col * (anchoFoto + gap);

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.rect(x, yFila, anchoFoto, altoFoto);

    try {
      doc.addImage(foto.data, foto.format, x + 1, yFila + 1, anchoFoto - 2, altoFoto - 2);
    } catch {
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text('Imagen no disponible', x + 4, yFila + altoFoto / 2);
    }

    doc.setFont(familiaPdf('normal'), 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(`Foto Nro. ${idx + 1}`, x, yFila + altoFoto + 4);

    col += 1;
    if (col >= 2) {
      col = 0;
      y = yFila + altoBloque + 2;
    }
  });
}

function pintarFirmas(doc, y, pageRef, form) {
  y = asegurarEspacio(doc, y, 32, pageRef);
  y += 2;

  const cols = [
    { label: 'Asegurado / Insured', valor: form.asegurado },
    { label: 'Conductor / Driver', valor: form.conductor },
    { label: 'Inspector / Surveyor', valor: form.inspector },
  ];

  const ancho = PDF_CONTENT_W / cols.length;
  const alto = 26;
  const x0 = PDF_MARGINS.left;

  cols.forEach((col, i) => {
    const x = x0 + i * ancho;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.rect(x, y, ancho - (i < cols.length - 1 ? 1.5 : 0), alto);

    // Línea de firma
    doc.setDrawColor(...C.muted);
    doc.setLineWidth(0.2);
    doc.line(x + 4, y + 12, x + ancho - 6, y + 12);

    doc.setFont(familiaPdf('bold'), 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(col.label, x + 2, y + 17);

    doc.setFont(familiaPdf('normal'), 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    const lineas = doc.splitTextToSize(texto(col.valor) || ' ', ancho - 6);
    doc.text(lineas.slice(0, 2), x + 2, y + 22);
  });

  return y + alto + 4;
}

export async function generarPdfActaPuertos(form, fotos = [], extras = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registrarFuentesPdf(doc);
  const logoDataUrl = await assetImportadoABase64(LogoProser);

  const pageRef = { page: 1 };
  const { fecha, hora } = extraerFechaHora(form.fechaActa);
  const docsAdj =
    extras.documentosAdjuntos ||
    form.documentosAdjuntos ||
    {};

  let y = await pintarEncabezado(doc, form, logoDataUrl);
  pintarPiePagina(doc, pageRef);

  // —— Datos generales ——
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Ciudad / City', value: form.ciudad || form.regional },
      { label: 'Tipo Inspección / Type Survey', value: form.tipoInspeccion },
    ],
    [0.5, 0.5]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Fecha / Date', value: fecha },
      { label: 'Fecha de Llegada / Arrival Date', value: formatearFechaCorta(form.fechaLlegada) },
      { label: 'Hora / Hour', value: hora },
      { label: 'Regional', value: form.regional },
    ],
    [0.25, 0.3, 0.2, 0.25]
  );

  // —— Datos del asegurado ——
  // Orden: Aseguradora|Sucursal → Asegurado|Pedido → Empaque|Mercancía → Piezas|Fecha
  y = tituloSeccion(doc, y, 'Datos del Asegurado / Insured Data');
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Aseguradora / Insurer', value: form.aseguradora },
      { label: 'Sucursal / Branch', value: form.sucursal },
    ],
    [0.5, 0.5]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Asegurado / Insured', value: form.asegurado },
      { label: 'Pedido N° / Order N°', value: form.pedido },
    ],
    [0.5, 0.5]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Tipo de Empaque / Type of Package', value: form.empaque },
      { label: 'Clase de Mercancía / Type of commodities', value: form.mercancia },
    ],
    [0.5, 0.5]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'N. de Piezas / No. of Packages', value: form.nroPiezas },
      {
        label: 'Fecha de Construcción / Construction Date',
        value: formatearFechaCorta(form.fechaConstruccion),
      },
    ],
    [0.5, 0.5]
  );

  // —— Transporte exterior ——
  // Orden: Origen|Puerto Origen → Destino final|Puerto Arribo → Motonave|Doc.|Registro
  y = tituloSeccion(doc, y, 'Transporte Exterior / International Transport');
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Origen / Origin', value: form.paisOrigen },
      { label: 'Puerto Origen / Port of Loading', value: form.puertoOrigen },
    ],
    [0.5, 0.5]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Destino Final / Final Place', value: form.paisDestino },
      { label: 'Puerto Arribo / Port of Discharge', value: form.puertoArribo },
    ],
    [0.5, 0.5]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Motonave / Vessel', value: form.motonave },
      { label: 'Doc. de Transporte / Doc. of Transport', value: form.docTransporte },
      { label: 'Registro / Register', value: form.registro },
    ],
    [0.34, 0.36, 0.3]
  );

  // —— Transporte interior ——
  y = tituloSeccion(doc, y, 'Transporte Interior / Domestic Transit');
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Empresa Transportadora / Carrier', value: form.transportadora },
      { label: 'Remesa No. / Remission No.', value: form.remesa },
    ],
    [0.6, 0.4]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Conductor / Driver', value: form.conductor },
      { label: 'Cédula / Identify', value: form.cedula },
      { label: 'Placas / Plates', value: form.placa },
    ],
    [0.4, 0.3, 0.3]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Modelo / Model', value: form.modelo },
      { label: 'Marca / Marks', value: form.marca },
      { label: 'Origen / Origin', value: form.origenDespacho },
    ],
    [0.34, 0.33, 0.33]
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Destino / Arrival Place', value: form.destinoDespacho },
      { label: 'Celular / Movil Phone', value: form.celular },
      { label: 'Carta de Porte / Carry Letter', value: form.cartaPorte },
    ],
    [0.34, 0.33, 0.33]
  );

  // —— Detalle de inspección ——
  y = tituloSeccion(doc, y, 'Detalle de Inspección / Details of Survey');
  y = filaValorCompleto(
    doc,
    y,
    pageRef,
    'Lugar de Reconocimiento / Place of Survey',
    form.lugarReconocimiento
  );
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      { label: 'Peso Tara / Tare Weight', value: form.pesoTara },
      { label: 'Peso Neto / Net Weight', value: form.pesoNeto },
      { label: 'Peso Bruto / Gross Weight', value: form.pesoBruto },
    ],
    [0.34, 0.33, 0.33]
  );
  if (form.contacto || form.averiaSiNo || form.tipoAveria) {
    y = filaCeldas(
      doc,
      y,
      pageRef,
      [
        { label: 'Contacto / Contact', value: form.contacto },
        {
          label: 'Avería / Damage',
          value:
            form.averiaSiNo === 'si' ? 'Sí' : form.averiaSiNo === 'no' ? 'No' : form.averiaSiNo,
        },
        { label: 'Tipo de Avería / Damage Type', value: form.tipoAveria },
      ],
      [0.4, 0.25, 0.35]
    );
  }

  // —— Observaciones ——
  y = escribirBloque(
    doc,
    y,
    pageRef,
    'Observaciones / Remarks',
    '(En caso de novedad relacionar valor de la factura y valor de la pérdida / In any case novelties, statement the invoice value and the damage value)',
    form.observaciones
  );

  // —— Recomendaciones ——
  y = escribirBloque(
    doc,
    y,
    pageRef,
    'Recomendaciones / Recommendations',
    '',
    form.recomendaciones
  );

  // —— Documentos adjuntos ——
  y = tituloSeccion(doc, y, 'Documentos Adjuntos / Attached Documents');
  y = filaCeldas(
    doc,
    y,
    pageRef,
    [
      {
        label: 'Factura Comercial / Commercial Invoice',
        value: siNo(docsAdj.facturaComercial),
      },
      { label: 'Lista de Empaque / Packing List', value: siNo(docsAdj.listaEmpaque) },
      { label: 'Doc de Transporte / Remission', value: siNo(docsAdj.docTransporte) },
    ],
    [0.34, 0.33, 0.33]
  );

  y = pintarFirmas(doc, y + 2, pageRef, form);

  await pintarFotos(doc, pageRef, form, fotos);

  const nombreArchivo = `Acta_${String(form.nroActa || 'Puertos').replace(/[^\w.-]+/g, '_')}.pdf`;
  doc.save(nombreArchivo);
}

export async function generarPdfActaPuertosDesdeId(id) {
  const doc = await getPuertosActa(id);
  const form = actaApiAFormulario(doc);
  const fotos = (doc.fotos || []).map((f, i) => ({
    id: f.id || `foto-${i}`,
    src: f.src || f.ruta || f.url || '',
    nombre: f.nombre || '',
    descripcion: f.descripcion || '',
    ruta: f.ruta,
  }));

  const documentosAdjuntos =
    doc.documentosAdjuntos ||
    (typeof doc.documentos === 'object' && !Array.isArray(doc.documentos) ? doc.documentos : null);

  return generarPdfActaPuertos(form, fotos, { documentosAdjuntos });
}
