import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { crearWorkbookLiquidadorExpress } from './generarLiquidadorExpressExcel.js';

/** Área de impresión de FORMATO_LIQUIDACION en la plantilla. */
const FILA_INI = 1;
const FILA_FIN = 37;
const COL_INI = 1;
const COL_FIN = 8;
const EMU_POR_MM = 914400 / 25.4;

function nombreArchivoSeguro(valor) {
  return String(valor || 'liquidador')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Lee ancho/alto IHDR de un PNG para conservar la proporción del logo. */
function ratioPng(u8) {
  if (!u8 || u8.length < 24) return null;
  // Firma PNG
  if (u8[0] !== 0x89 || u8[1] !== 0x50) return null;
  const w = (u8[16] << 24) | (u8[17] << 16) | (u8[18] << 8) | u8[19];
  const h = (u8[20] << 24) | (u8[21] << 16) | (u8[22] << 8) | u8[23];
  if (!w || !h) return null;
  return w / h;
}

function excelColWidthToMm(width) {
  // Ancho Excel (caracteres) → mm (aprox. Calibri/Arial en plantilla Zurich)
  return (width == null || width <= 0 ? 10 : width) * 2.05;
}

function excelRowHeightToMm(height) {
  // Alto Excel en puntos → mm
  return (height == null || height <= 0 ? 15 : height) * 0.352778;
}

function argbToRgb(argb) {
  if (!argb) return null;
  const hex = String(argb).replace(/^FF/i, '').replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function colorDesdeExcel(color) {
  if (!color) return null;
  if (color.argb) return argbToRgb(color.argb);
  // Temas típicos de la plantilla: 0 = blanco, 1 = negro
  if (color.theme === 0) return [255, 255, 255];
  if (color.theme === 1) return [0, 0, 0];
  return null;
}

function fillRgb(cell) {
  const fill = cell.fill;
  if (!fill || fill.type !== 'pattern' || fill.pattern === 'none') return null;
  return colorDesdeExcel(fill.fgColor) || colorDesdeExcel(fill.bgColor);
}

function fontRgb(cell) {
  return colorDesdeExcel(cell.font?.color) || [0, 0, 0];
}

function formatearNumeroPlantilla(n, numFmt = '') {
  const fmt = String(numFmt || '');
  if (fmt.includes('%')) {
    const pct = n * (Math.abs(n) <= 1.5 ? 100 : 1);
    return `${String(pct.toFixed(1)).replace('.', ',')}%`;
  }
  const abs = Math.abs(n);
  const entero = Math.round(abs);
  const conMiles = entero.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  if (n < 0) return `(${conMiles})`;
  if (n === 0 && (fmt.includes('-') || fmt.includes('_('))) return '-';
  return conMiles;
}

function valorCeldaVisible(cell) {
  let v = cell.value;
  if (v === null || v === undefined || v === '') return '';

  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) {
      return v.richText.map((t) => t.text || '').join('');
    }
    if (v.formula != null || v.sharedFormula != null) {
      v = v.result;
      if (v === null || v === undefined || v === '') return '';
    }
    if (v instanceof Date) {
      return v.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    if (typeof v === 'object' && v.text != null) return String(v.text);
    if (typeof v === 'object' && v.result !== undefined) {
      v = v.result;
      if (v === null || v === undefined || v === '') return '';
    }
  }

  if (typeof v === 'number') {
    return formatearNumeroPlantilla(v, cell.numFmt);
  }

  // Fechas ISO guardadas como string
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(`${v.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }

  return String(v);
}

function mapaMerges(sheet) {
  const merges = sheet.model?.merges || [];
  const cubiertas = new Set();
  const maestros = new Map();

  merges.forEach((ref) => {
    const [a, b] = String(ref).split(':');
    if (!a || !b) return;
    // ExcelJS Address
    const start = sheet.getCell(a);
    const end = sheet.getCell(b);
    const r1 = start.row;
    const c1 = start.col;
    const r2 = end.row;
    const c2 = end.col;
    maestros.set(`${r1}:${c1}`, { r1, c1, r2, c2 });
    for (let r = r1; r <= r2; r += 1) {
      for (let c = c1; c <= c2; c += 1) {
        if (r === r1 && c === c1) continue;
        cubiertas.add(`${r}:${c}`);
      }
    }
  });

  return { cubiertas, maestros };
}

function anchosColumnasMm(sheet) {
  const widths = [];
  for (let c = COL_INI; c <= COL_FIN; c += 1) {
    widths.push(excelColWidthToMm(sheet.getColumn(c).width));
  }
  return widths;
}

function altosFilasMm(sheet) {
  const heights = [];
  for (let r = FILA_INI; r <= FILA_FIN; r += 1) {
    heights.push(excelRowHeightToMm(sheet.getRow(r).height));
  }
  return heights;
}

function offsetX(widths, col) {
  let x = 0;
  const limite = COL_INI + widths.length;
  for (let c = COL_INI; c < col && c < limite; c += 1) {
    x += widths[c - COL_INI] || 0;
  }
  return x;
}

function offsetY(heights, row) {
  let y = 0;
  const limite = FILA_INI + heights.length;
  for (let r = FILA_INI; r < row && r < limite; r += 1) {
    y += heights[r - FILA_INI] || 0;
  }
  return y;
}

function spanAncho(widths, c1, c2) {
  let w = 0;
  for (let c = c1; c <= c2; c += 1) w += widths[c - COL_INI] || 0;
  return w;
}

function spanAlto(heights, r1, r2) {
  let h = 0;
  for (let r = r1; r <= r2; r += 1) h += heights[r - FILA_INI] || 0;
  return h;
}

function dibujarBordes(doc, x, y, w, h, border, scale) {
  if (!border) return;
  const lados = [
    ['top', x, y, x + w, y],
    ['bottom', x, y + h, x + w, y + h],
    ['left', x, y, x, y + h],
    ['right', x + w, y, x + w, y + h],
  ];
  lados.forEach(([lado, x1, y1, x2, y2]) => {
    const b = border[lado];
    if (!b || b.style === 'none') return;
    const groso =
      b.style === 'medium' || b.style === 'thick' ? 0.45 * scale : 0.2 * scale;
    const rgb = colorDesdeExcel(b.color) || [0, 0, 0];
    doc.setDrawColor(...rgb);
    doc.setLineWidth(groso);
    doc.line(x1, y1, x2, y2);
  });
}

/**
 * Renderiza la hoja FORMATO_LIQUIDACION del workbook (plantilla Excel real) a PDF.
 */
function renderHojaLiquidacionAPdf(workbook, sheet) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margen = 10;

  const widths = anchosColumnasMm(sheet);
  const heights = altosFilasMm(sheet);
  const totalW = widths.reduce((a, b) => a + b, 0);
  const totalH = heights.reduce((a, b) => a + b, 0);

  const scale = Math.min((pageW - margen * 2) / totalW, (pageH - margen * 2) / totalH);
  const scaledW = widths.map((w) => w * scale);
  const scaledH = heights.map((h) => h * scale);
  const origenX = margen + ((pageW - margen * 2) - totalW * scale) / 2;
  const origenY = margen + ((pageH - margen * 2) - totalH * scale) / 2;

  const { cubiertas, maestros } = mapaMerges(sheet);

  for (let r = FILA_INI; r <= FILA_FIN; r += 1) {
    for (let c = COL_INI; c <= COL_FIN; c += 1) {
      const key = `${r}:${c}`;
      if (cubiertas.has(key)) continue;

      const merge = maestros.get(key);
      const r2 = merge ? merge.r2 : r;
      const c2 = merge ? merge.c2 : c;

      const cell = sheet.getCell(r, c);
      const x = origenX + offsetX(scaledW, c);
      const y = origenY + offsetY(scaledH, r);
      const w = spanAncho(scaledW, c, Math.min(c2, COL_FIN));
      const h = spanAlto(scaledH, r, Math.min(r2, FILA_FIN));

      const bg = fillRgb(cell);
      if (bg) {
        doc.setFillColor(...bg);
        doc.rect(x, y, w, h, 'F');
      }

      dibujarBordes(doc, x, y, w, h, cell.border, scale);

      const texto = valorCeldaVisible(cell);
      if (texto) {
        const fontSize = Math.max(6, (cell.font?.size || 10) * scale * 0.9);
        doc.setFont('helvetica', cell.font?.bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(...fontRgb(cell));

        const pad = 1.2 * scale;
        const align = cell.alignment?.horizontal || 'left';
        const valign = cell.alignment?.vertical || 'middle';
        const maxW = Math.max(4, w - pad * 2);
        const lines = doc.splitTextToSize(String(texto), maxW);
        const lineH = fontSize * 0.4;
        const blockH = lines.length * lineH;
        let textY = y + pad + lineH;
        if (valign === 'middle') textY = y + (h - blockH) / 2 + lineH * 0.85;
        if (valign === 'bottom') textY = y + h - pad - blockH + lineH;

        let textX = x + pad;
        let jsAlign = 'left';
        if (align === 'center') {
          textX = x + w / 2;
          jsAlign = 'center';
        } else if (align === 'right') {
          textX = x + w - pad;
          jsAlign = 'right';
        }

        doc.text(lines, textX, textY, { align: jsAlign });
      }
    }
  }

  // Logo Zurich: respetar proporción natural del PNG (no estirar al recuadro Excel)
  try {
    const imgs = sheet.getImages?.() || [];
    imgs.forEach((img) => {
      const media = workbook.getImage(img.imageId);
      if (!media?.buffer) return;
      const tl = img.range?.tl;
      if (!tl) return;

      // ExcelJS oneCell: tl.col / tl.row pueden ser fraccionarios
      const colF = tl.col != null ? tl.col : (tl.nativeCol ?? 0);
      const rowF = tl.row != null ? tl.row : (tl.nativeRow ?? 0);
      const colOffMm = (tl.nativeColOff || 0) / EMU_POR_MM;
      const rowOffMm = (tl.nativeRowOff || 0) / EMU_POR_MM;

      const colBase = Math.floor(colF) + 1;
      const rowBase = Math.floor(rowF) + 1;
      const fracCol = colF - Math.floor(colF);
      const fracRow = rowF - Math.floor(rowF);

      const colW =
        scaledW[Math.min(Math.max(colBase, COL_INI), COL_FIN) - COL_INI] || 10;
      const rowH =
        scaledH[Math.min(Math.max(rowBase, FILA_INI), FILA_FIN) - FILA_INI] || 5;

      let xBox =
        origenX +
        offsetX(scaledW, Math.min(Math.max(colBase, COL_INI), COL_FIN)) +
        fracCol * colW +
        colOffMm * scale;
      let yBox =
        origenY +
        offsetY(scaledH, Math.min(Math.max(rowBase, FILA_INI), FILA_FIN)) +
        fracRow * rowH +
        rowOffMm * scale;

      const bytes =
        media.buffer instanceof ArrayBuffer
          ? media.buffer
          : media.buffer.buffer.slice(
              media.buffer.byteOffset,
              media.buffer.byteOffset + media.buffer.byteLength
            );
      const u8 = new Uint8Array(bytes);
      const ratioNatural = ratioPng(u8) || 671 / 417;

      // Preferir tamaño ext (px @96dpi → mm) si la plantilla ya viene corregida
      const ext = img.range?.ext;
      let wMm;
      let hMm;
      if (ext?.width && ext?.height) {
        wMm = (ext.width / 96) * 25.4 * scale;
        hMm = (ext.height / 96) * 25.4 * scale;
      } else {
        const br = img.range?.br;
        let boxW = 36 * scale;
        let boxH = 24 * scale;
        if (br) {
          const brCol = (br.nativeCol ?? 0) + 1;
          const brRow = (br.nativeRow ?? 0) + 1;
          const xBr = origenX + offsetX(scaledW, Math.min(brCol, COL_FIN + 1));
          const yBr = origenY + offsetY(scaledH, Math.min(brRow, FILA_FIN + 1));
          boxW = Math.max(12, xBr - xBox);
          boxH = Math.max(10, yBr - yBox);
        }
        wMm = boxW;
        hMm = wMm / ratioNatural;
        if (hMm > boxH) {
          hMm = boxH;
          wMm = hMm * ratioNatural;
        }
      }

      // Ajuste fino: si el ext no respeta ratio, forzar ratio natural
      const ratioExt = wMm / hMm;
      if (Math.abs(ratioExt - ratioNatural) / ratioNatural > 0.05) {
        hMm = wMm / ratioNatural;
      }

      let binary = '';
      for (let i = 0; i < u8.length; i += 0x8000) {
        binary += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      }
      const fileExt = (media.extension || 'png').toLowerCase();
      const dataUrl = `data:image/${fileExt};base64,${btoa(binary)}`;
      doc.addImage(
        dataUrl,
        fileExt === 'jpg' || fileExt === 'jpeg' ? 'JPEG' : 'PNG',
        xBox,
        yBox,
        wMm,
        hMm
      );
    });
  } catch (err) {
    console.warn('[Express PDF] No se pudo renderizar imagen de la plantilla:', err);
  }

  return doc;
}

/**
 * PDF = hoja FORMATO_LIQUIDACION del Excel plantilla, rellena y renderizada.
 * Misma fuente de datos/estilos que el .xlsx (equivalente a “Guardar como PDF”).
 */
export async function generarLiquidadorExpressPdfBlob(liquidador = {}, totales = {}, opciones = {}) {
  const workbook = await crearWorkbookLiquidadorExpress(liquidador, totales, {
    ...opciones,
    soloLiquidacion: true,
    incluirSalvamento: false,
  });

  const sheet =
    workbook.getWorksheet('FORMATO_LIQUIDACION') || workbook.worksheets[0];
  if (!sheet) {
    throw new Error('No se encontró la hoja FORMATO_LIQUIDACION en la plantilla Excel.');
  }

  const doc = renderHojaLiquidacionAPdf(workbook, sheet);
  const reclamo = liquidador?.encabezado?.reclamo || 'sin-reclamo';
  const blob = doc.output('blob');

  return {
    blob,
    nombre: `Liquidador_Express_PDF_${nombreArchivoSeguro(reclamo)}.pdf`,
    mime: 'application/pdf',
  };
}

export async function descargarLiquidadorExpressPdf(liquidador, totales, opciones = {}) {
  const { blob, nombre } = await generarLiquidadorExpressPdfBlob(liquidador, totales, opciones);
  saveAs(blob, nombre);
}
