import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { crearWorkbookLiquidadorExpress } from './generarLiquidadorExpressExcel.js';
import {
  calcularLiquidacion,
  listaConceptosLiquidador,
  parsearNumero,
} from './liquidadorExpressHelpers.js';

/** Área de impresión de FORMATO_LIQUIDACION en la plantilla. */
const FILA_INI = 1;
const FILA_FIN = 37;
const COL_INI = 1;
const COL_FIN = 8;
const EMU_POR_MM = 914400 / 25.4;

function nombreArchivoSeguro(valor) {
  return String(valor || 'liquidador')
    .trim()
    // eslint-disable-next-line no-control-regex -- Se eliminan caracteres de control inválidos en nombres de archivo.
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
  // Ancho Excel (caracteres) → mm. Default 8.43 = ancho estándar de Excel.
  return (width == null || width <= 0 ? 8.43 : width) * 2.05;
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
  const rgb = colorDesdeExcel(fill.fgColor) || colorDesdeExcel(fill.bgColor);
  if (!rgb) return null;
  // theme 0 / blanco: Excel no lo pinta; si lo dibujamos tapa bordes y textos
  if (esColorClaro(rgb)) return null;
  return rgb;
}

function esColorClaro(rgb) {
  if (!rgb) return true;
  return rgb[0] + rgb[1] + rgb[2] > 600;
}

function fontRgb(cell) {
  const fill = fillRgb(cell);
  const fromFont = colorDesdeExcel(cell.font?.color);
  if (fromFont) {
    // theme 0 = blanco: correcto sobre azul Zurich, ilegible sobre fondo claro
    if (esColorClaro(fromFont) && esColorClaro(fill || [255, 255, 255])) {
      return [0, 0, 0];
    }
    return fromFont;
  }
  return esColorClaro(fill || [255, 255, 255]) ? [0, 0, 0] : [255, 255, 255];
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

/** Columnas visibles (Excel no imprime las hidden, p. ej. D). */
function geometriaColumnasVisibles(sheet) {
  const visibles = [];
  let x = 0;
  for (let c = COL_INI; c <= COL_FIN; c += 1) {
    const col = sheet.getColumn(c);
    if (col.hidden) continue;
    const w = excelColWidthToMm(col.width);
    visibles.push({ c, x, w });
    x += w;
  }
  return { visibles, totalW: x, byIndex: new Map(visibles.map((v) => [v.c, v])) };
}

function spanVisible(byIndex, c1, c2) {
  let w = 0;
  for (let c = c1; c <= c2; c += 1) {
    const col = byIndex.get(c);
    if (col) w += col.w;
  }
  return w;
}

function altosFilasMm(sheet) {
  const heights = [];
  for (let r = FILA_INI; r <= FILA_FIN; r += 1) {
    heights.push(excelRowHeightToMm(sheet.getRow(r).height));
  }
  return heights;
}

function offsetY(heights, row) {
  let y = 0;
  const limite = FILA_INI + heights.length;
  for (let r = FILA_INI; r < row && r < limite; r += 1) {
    y += heights[r - FILA_INI] || 0;
  }
  return y;
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

function textoConceptoEnCelda(r, c, item, cell) {
  if (!item) return null;
  if (c === 1) return String(item.concepto || '').trim();
  if (c === 2) return String(item.detalle || item.concepto || '').trim();
  if (c === 8) {
    if (item.valor === '' || item.valor === null || item.valor === undefined) return '';
    return formatearNumeroPlantilla(parsearNumero(item.valor), cell.numFmt);
  }
  return null;
}

/** Renderiza la hoja FORMATO_LIQUIDACION como la vista previa de Excel (1 página, apaisado). */
function renderHojaLiquidacionAPdf(workbook, sheet, { conceptos = [], totales = {}, titulo = 'FORMATO DE LIQUIDACIÓN EXPRESS' } = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margenX = 12;
  const margenTop = 16;
  const margenBot = 10;

  const geo = geometriaColumnasVisibles(sheet);
  const heights = altosFilasMm(sheet);
  const totalH = heights.reduce((a, b) => a + b, 0);
  const areaW = pageW - margenX * 2;
  const areaH = pageH - margenTop - margenBot;
  const scale = Math.min(areaW / (geo.totalW || 1), areaH / (totalH || 1));
  const scaledH = heights.map((h) => h * scale);
  const origenX = margenX + (areaW - geo.totalW * scale) / 2;
  const origenY = margenTop + (areaH - totalH * scale) / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(String(titulo || 'FORMATO DE LIQUIDACIÓN EXPRESS'), pageW / 2, 9, { align: 'center' });

  const { cubiertas, maestros } = mapaMerges(sheet);
  const conceptoPorFila = new Map();
  conceptos.slice(0, 12).forEach((item, idx) => {
    conceptoPorFila.set(14 + idx, item);
  });

  for (let r = FILA_INI; r <= FILA_FIN; r += 1) {
    for (let c = COL_INI; c <= COL_FIN; c += 1) {
      if (!geo.byIndex.has(c)) continue;
      const key = `${r}:${c}`;
      if (cubiertas.has(key)) continue;

      const merge = maestros.get(key);
      const r2 = merge ? merge.r2 : r;
      const c2 = merge ? merge.c2 : c;
      const colGeo = geo.byIndex.get(c);

      const cell = sheet.getCell(r, c);
      const x = origenX + colGeo.x * scale;
      const y = origenY + offsetY(scaledH, r);
      const w = spanVisible(geo.byIndex, c, Math.min(c2, COL_FIN)) * scale;
      const h = spanAlto(scaledH, r, Math.min(r2, FILA_FIN));
      if (w <= 0 || h <= 0) continue;

      const bg = fillRgb(cell);
      if (bg) {
        doc.setFillColor(...bg);
        doc.rect(x, y, w, h, 'F');
      }

      dibujarBordes(doc, x, y, w, h, cell.border, scale);

      let texto = valorCeldaVisible(cell);
      const itemFila = conceptoPorFila.get(r);
      const textoConcepto = textoConceptoEnCelda(r, c, itemFila, cell);
      if (textoConcepto) texto = textoConcepto;
      if (r === 26 && c === 8 && totales.totalPerdida != null && totales.totalPerdida !== '') {
        texto = formatearNumeroPlantilla(Number(totales.totalPerdida) || 0, cell.numFmt);
      }
      if (r === 27 && c === 8 && totales.deducibleAplicado != null) {
        texto = formatearNumeroPlantilla(Number(totales.deducibleAplicado) || 0, cell.numFmt);
      }
      if (r === 28 && c === 8 && totales.totalIndemnizar != null && totales.totalIndemnizar !== '') {
        texto = formatearNumeroPlantilla(Number(totales.totalIndemnizar) || 0, cell.numFmt);
      }
      if (texto) {
        const fontSize = Math.max(7, (cell.font?.size || 11) * scale * 0.95);
        doc.setFont('helvetica', cell.font?.bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(...fontRgb(cell));

        const pad = Math.max(0.8, 1.1 * scale);
        const align = cell.alignment?.horizontal || 'left';
        const valign = cell.alignment?.vertical || 'middle';
        const maxW = Math.max(4, w - pad * 2);
        const lines = doc.splitTextToSize(String(texto), maxW);
        const lineH = fontSize * 0.352778 * 1.2;
        const blockH = lines.length * lineH;
        let textY = y + pad + lineH * 0.85;
        if (valign === 'middle') textY = y + (h - blockH) / 2 + lineH * 0.8;
        if (valign === 'bottom') textY = y + h - pad - blockH + lineH * 0.8;
        if (textY < y + lineH * 0.75) textY = y + lineH * 0.85;

        let textX = x + pad;
        let jsAlign = 'left';
        if (align === 'center') {
          textX = x + w / 2;
          jsAlign = 'center';
        } else if (align === 'right') {
          textX = x + w - pad;
          jsAlign = 'right';
        }

        try {
          doc.saveGraphicsState();
          doc.rect(x, y, w, h);
          doc.clip();
          if (typeof doc.discardPath === 'function') doc.discardPath();
          doc.text(lines, textX, textY, { align: jsAlign });
          doc.restoreGraphicsState();
        } catch {
          doc.text(lines, textX, textY, { align: jsAlign });
        }
      }
    }
  }

  try {
    const imgs = sheet.getImages?.() || [];
    imgs.forEach((img) => {
      const media = workbook.getImage(img.imageId);
      if (!media?.buffer) return;
      const tl = img.range?.tl;
      if (!tl) return;

      const colF = tl.col != null ? tl.col : (tl.nativeCol ?? 0);
      const rowF = tl.row != null ? tl.row : (tl.nativeRow ?? 0);
      const colOffMm = (tl.nativeColOff || 0) / EMU_POR_MM;
      const rowOffMm = (tl.nativeRowOff || 0) / EMU_POR_MM;

      const colBase = Math.floor(colF) + 1;
      const rowBase = Math.floor(rowF) + 1;
      const fracCol = colF - Math.floor(colF);
      const fracRow = rowF - Math.floor(rowF);

      const colGeo = geo.byIndex.get(colBase) || geo.visibles[geo.visibles.length - 1];
      if (!colGeo) return;
      const rowH = scaledH[Math.min(Math.max(rowBase, FILA_INI), FILA_FIN) - FILA_INI] || 5;

      const xBox = origenX + colGeo.x * scale + fracCol * colGeo.w * scale + colOffMm * scale;
      const yBox =
        origenY + offsetY(scaledH, Math.min(Math.max(rowBase, FILA_INI), FILA_FIN)) +
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

      const ext = img.range?.ext;
      let wMm;
      let hMm;
      if (ext?.width && ext?.height) {
        wMm = (ext.width / 96) * 25.4 * scale;
        hMm = (ext.height / 96) * 25.4 * scale;
      } else {
        wMm = 36 * scale;
        hMm = wMm / ratioNatural;
      }

      const ratioExt = wMm / (hMm || 1);
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
  void totales;
  const conceptos = listaConceptosLiquidador(liquidador);
  const liquidadorNorm = { ...liquidador, conceptos };
  const totalesNorm = calcularLiquidacion(liquidadorNorm);
  const titulo = String(opciones.locale || 'es').toLowerCase().startsWith('en')
    ? 'EXPRESS LIQUIDATION FORM'
    : 'FORMATO DE LIQUIDACIÓN EXPRESS';

  const workbook = await crearWorkbookLiquidadorExpress(liquidadorNorm, totalesNorm, {
    ...opciones,
    soloLiquidacion: true,
    incluirSalvamento: false,
  });

  const sheet =
    workbook.getWorksheet('FORMATO_LIQUIDACION') || workbook.worksheets[0];
  if (!sheet) {
    throw new Error('No se encontró la hoja FORMATO_LIQUIDACION en la plantilla Excel.');
  }

  const doc = renderHojaLiquidacionAPdf(workbook, sheet, {
    conceptos,
    totales: totalesNorm,
    titulo,
  });
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
