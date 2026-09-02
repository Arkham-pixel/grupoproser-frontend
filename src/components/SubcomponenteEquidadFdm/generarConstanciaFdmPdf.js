import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import {
  calcularLiquidacionFdm,
  fechaLargaEs,
  formatearMonto,
  montoALetrasFdm,
} from './liquidadorEquidadFdmHelpers.js';

/**
 * PDF liquidador FDM — orientación horizontal, estilo hoja Liquidador del Excel.
 */

// A4 landscape
const PAGE_W = 297;
const PAGE_H = 210;
const M = 10;
const FRAME_X = M;
const FRAME_Y = M;
const FRAME_W = PAGE_W - M * 2;
const FRAME_H = PAGE_H - M * 2;

const BEIGE = [220, 220, 210];
const PEACH = [255, 228, 196];
const GREEN = [0, 140, 60];
const RED = [190, 30, 30];
const BLUE_SEL = [0, 70, 140];
const INK = [30, 30, 30];
const GRID = [90, 90, 90];

function drawCheck(doc, cx, cy, ok) {
  const s = 2.2;
  if (ok) {
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.55);
    doc.line(cx - s, cy, cx - 0.4, cy + s * 0.7);
    doc.line(cx - 0.4, cy + s * 0.7, cx + s, cy - s);
  } else {
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.55);
    doc.line(cx - s, cy - s, cx + s, cy + s);
    doc.line(cx + s, cy - s, cx - s, cy + s);
  }
}

async function loadDataUrl(path) {
  const res = await fetch(path);
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function money(valor, { emptyDash = true } = {}) {
  const n = Number(valor) || 0;
  if (!n && emptyDash) return '$ -';
  return `$ ${formatearMonto(n)}`;
}

function formatearCedula(cedula) {
  const digits = String(cedula || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function strokeRect(doc, x, y, w, h, width = 0.35) {
  doc.setDrawColor(...GRID);
  doc.setLineWidth(width);
  doc.rect(x, y, w, h);
}

function fill(doc, x, y, w, h, rgb) {
  doc.setFillColor(...rgb);
  doc.rect(x, y, w, h, 'F');
}

function textFit(doc, text, x, y, maxW, opts = {}) {
  const lines = doc.splitTextToSize(String(text ?? ''), maxW);
  doc.text(lines[0] || '', x, y, opts);
}

/** Celda etiqueta (peach) + valor */
function fieldRow(doc, x, y, labelW, valueW, h, label, value) {
  fill(doc, x, y, labelW, h, PEACH);
  strokeRect(doc, x, y, labelW, h, 0.25);
  strokeRect(doc, x + labelW, y, valueW, h, 0.25);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(String(label), x + labelW - 1.5, y + h * 0.68, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  textFit(doc, value, x + labelW + 1.5, y + h * 0.68, valueW - 3);
}

function sectionTitle(doc, x, y, w, h, title) {
  fill(doc, x, y, w, h, BEIGE);
  strokeRect(doc, x, y, w, h, 0.3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(title, x + w / 2, y + h * 0.7, { align: 'center' });
}

function colHeader(doc, x, y, widths, labels, h) {
  let cx = x;
  const total = widths.reduce((a, b) => a + b, 0);
  fill(doc, x, y, total, h, BEIGE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  labels.forEach((lab, i) => {
    strokeRect(doc, cx, y, widths[i], h, 0.25);
    const align = i === 0 ? 'center' : i === labels.length - 1 ? 'right' : 'left';
    const tx =
      align === 'center' ? cx + widths[i] / 2 : align === 'right' ? cx + widths[i] - 1.8 : cx + 1.5;
    doc.text(lab, tx, y + h * 0.68, { align });
    cx += widths[i];
  });
}

function colRow(doc, x, y, widths, values, h, { bold = false, fillRgb = null } = {}) {
  let cx = x;
  if (fillRgb) fill(doc, x, y, widths.reduce((a, b) => a + b, 0), h, fillRgb);
  values.forEach((val, i) => {
    strokeRect(doc, cx, y, widths[i], h, 0.2);
    doc.setFont('helvetica', bold && i === values.length - 1 ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    const align = i === 0 ? 'center' : i === values.length - 1 ? 'right' : 'left';
    const tx =
      align === 'center' ? cx + widths[i] / 2 : align === 'right' ? cx + widths[i] - 1.8 : cx + 1.5;
    textFit(doc, val, tx, y + h * 0.68, widths[i] - 2.5, { align });
    cx += widths[i];
  });
}

function summaryRow(doc, x, y, labelW, valueW, h, label, value, { strong = false, peach = true } = {}) {
  if (peach) fill(doc, x, y, labelW, h, PEACH);
  if (strong) fill(doc, x + labelW, y, valueW, h, BEIGE);
  strokeRect(doc, x, y, labelW, h, 0.25);
  strokeRect(doc, x + labelW, y, valueW, h, 0.25);
  doc.setFont('helvetica', strong ? 'bold' : 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(label, x + 2, y + h * 0.68);
  doc.setFont('helvetica', strong ? 'bold' : 'normal');
  doc.text(String(value), x + labelW + valueW - 1.8, y + h * 0.68, { align: 'right' });
}

/**
 * Genera PDF liquidador horizontal estilo Excel.
 */
export async function generarLiquidadorFdmPdfBlob(liquidador, totalesParam) {
  const totales = totalesParam || calcularLiquidacionFdm(liquidador);
  const enc = liquidador.encabezado || {};
  const contenidos = [...(liquidador.contenidos || [])];
  const edificios = [...(liquidador.edificios || [])];
  while (contenidos.length < 10) contenidos.push({ item: '', valor: '' });
  while (edificios.length < 10) edificios.push({ item: '', valor: '' });

  const letras = montoALetrasFdm(totales.totalIndemnizar);
  const base = import.meta.env.BASE_URL || '/';
  const [logoProser, logoEquidad] = await Promise.all([
    loadDataUrl(`${base}templates/logo-proserpuertos.jpg`),
    loadDataUrl(`${base}templates/logo-equidad.png`),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `Liquidador FDM - ${enc.asegurado || ''}`,
    creator: 'Arnald DataFlow',
  });

  // Marco exterior
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.rect(FRAME_X, FRAME_Y, FRAME_W, FRAME_H);

  const innerX = FRAME_X + 4;
  const innerW = FRAME_W - 8;
  const gap = 5;
  const colW = (innerW - gap) / 2;
  const leftX = innerX;
  const rightX = innerX + colW + gap;

  let y = FRAME_Y + 3;

  // Logos
  if (logoProser) doc.addImage(logoProser, 'JPEG', leftX, y, 42, 13);
  if (logoEquidad) doc.addImage(logoEquidad, 'PNG', rightX + colW - 48, y, 46, 13);
  y += 15;

  // Encabezado 5+5 campos
  const rowH = 5.4;
  const labW = 32;
  const valW = colW - labW;
  const labWR = 38;
  const valWR = colW - labWR;

  const leftFields = [
    ['TOMADOR:', enc.tomador || 'FUNDACION DE LA MUJER'],
    ['ASEGURADO:', enc.asegurado || ''],
    ['POLIZA:', enc.poliza || ''],
    ['ORDEN:', enc.orden || ''],
    ['SINIESTRO:', enc.siniestro || ''],
  ];
  const rightFields = [
    ['FECHA SINIESTRO:', fechaLargaEs(enc.fechaSiniestro)],
    ['DIRECCION:', enc.direccion || ''],
    ['EVENTO:', enc.evento || 'ANEGACION'],
    ['CEDULA:', formatearCedula(enc.cedula)],
    ['RAMO:', enc.ramo || ''],
  ];

  leftFields.forEach((f, i) => fieldRow(doc, leftX, y + i * rowH, labW, valW, rowH, f[0], f[1]));
  rightFields.forEach((f, i) =>
    fieldRow(doc, rightX, y + i * rowH, labWR, valWR, rowH, f[0], f[1])
  );
  y += 5 * rowH + 3;

  // Títulos CONTENIDOS / EDIFICIOS
  const titleH = 5.8;
  sectionTitle(doc, leftX, y, colW, titleH, 'CONTENIDOS');
  sectionTitle(doc, rightX, y, colW, titleH, 'EDIFICIOS');
  y += titleH;

  const wN = 12;
  const wV = 32;
  const wI = colW - wN - wV;
  const widths = [wN, wI, wV];
  const headH = 5.5;
  colHeader(doc, leftX, y, widths, ['N°', 'ITEM', 'VALOR'], headH);
  colHeader(doc, rightX, y, widths, ['N°', 'ITEM', 'VALOR'], headH);
  y += headH;

  const itemH = 5.2;
  for (let i = 0; i < 10; i += 1) {
    const c = contenidos[i];
    const e = edificios[i];
    const cHas = c?.item || Number(c?.valor);
    const eHas = e?.item || Number(e?.valor);
    colRow(doc, leftX, y, widths, [
      String(i + 1),
      c?.item || '',
      cHas ? money(c.valor, { emptyDash: false }) : '',
    ], itemH);
    colRow(doc, rightX, y, widths, [
      String(i + 1),
      e?.item || '',
      eHas ? money(e.valor, { emptyDash: false }) : '',
    ], itemH);
    y += itemH;
  }

  // Subtotales
  const subH = 5.8;
  colRow(
    doc,
    leftX,
    y,
    widths,
    ['', 'SUBTOTAL', money(totales.subtotalContenidos)],
    subH,
    { bold: true, fillRgb: BEIGE }
  );
  colRow(
    doc,
    rightX,
    y,
    widths,
    ['', 'SUBTOTAL', money(totales.subtotalEdificios)],
    subH,
    { bold: true, fillRgb: BEIGE }
  );
  y += subH + 4;

  // Bloque inferior
  const smmlvOk = Boolean(totales.usaSMMLV) && !totales.usaManual;
  const pctOk = !totales.usaSMMLV && !totales.usaManual;
  const qtyLabel = String(totales.cantidadSMMLV ?? 0.75).replace('.', ',');
  const pctLabel = `${String(totales.porcentaje ?? 10).replace('.', ',')}%`;
  const bottomTop = y;

  // Izquierda: subsidio / SMMLV / deducible
  let ly = bottomTop;
  const sLab = 30;
  const sVal = colW - sLab;
  fieldRow(doc, leftX, ly, sLab, sVal, 5.5, 'SUBSIDIO', money(totales.subsidio));
  ly += 5.5;
  fieldRow(
    doc,
    leftX,
    ly,
    sLab,
    sVal,
    5.5,
    `SMMLV ${totales.anioSMMLV || ''}`,
    money(totales.valorSMMLV, { emptyDash: false })
  );
  ly += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text('DEDUCIBLE', leftX + 1, ly);
  ly += 2;

  const dedH = 6;
  const row1Y = ly;
  if (smmlvOk) fill(doc, leftX, row1Y, colW, dedH, [230, 255, 235]);
  strokeRect(doc, leftX, row1Y, 18, dedH, 0.25);
  strokeRect(doc, leftX + 18, row1Y, colW - 18 - 14, dedH, 0.25);
  strokeRect(doc, leftX + colW - 14, row1Y, 14, dedH, 0.25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(qtyLabel, leftX + 9, row1Y + 4.1, { align: 'center' });
  doc.text(money(totales.deducibleSMMLV, { emptyDash: false }), leftX + colW - 16, row1Y + 4.1, {
    align: 'right',
  });
  drawCheck(doc, leftX + colW - 7, row1Y + 3.2, smmlvOk);
  doc.setTextColor(...INK);

  const row2Y = row1Y + dedH;
  if (pctOk) {
    fill(doc, leftX, row2Y, colW, dedH, BLUE_SEL);
  }
  strokeRect(doc, leftX, row2Y, 18, dedH, 0.25);
  strokeRect(doc, leftX + 18, row2Y, colW - 18 - 14, dedH, 0.25);
  strokeRect(doc, leftX + colW - 14, row2Y, 14, dedH, 0.25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...(pctOk ? [255, 255, 255] : INK));
  doc.text(pctLabel, leftX + 9, row2Y + 4.1, { align: 'center' });
  doc.text(
    money(totales.deduciblePorcentajeExcel, { emptyDash: false }),
    leftX + colW - 16,
    row2Y + 4.1,
    { align: 'right' }
  );
  drawCheck(doc, leftX + colW - 7, row2Y + 3.2, pctOk);
  doc.setTextColor(...INK);

  // Derecha: liquidación
  let ry = bottomTop;
  const rLab = 52;
  const rVal = colW - rLab;
  const rH = 5.6;
  const resumen = [
    ['PERDIDA ESTABLECIDA', money(totales.totalPerdida, { emptyDash: false }), false],
    ['(-) DEDUCIBLE', money(totales.deducibleAplicado, { emptyDash: false }), false],
    ['(=) TOTAL', money(totales.totalAntesSubsidio, { emptyDash: false }), false],
    ['(+) SUBSIDIO', money(totales.subsidio), false],
    ['(=) INDEMNIZACIÓN', money(totales.totalIndemnizar, { emptyDash: false }), true],
  ];
  resumen.forEach(([lab, val, strong]) => {
    summaryRow(doc, rightX, ry, rLab, rVal, rH, lab, val, { strong, peach: true });
    ry += rH;
  });

  ry += 3;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  const letraLines = doc.splitTextToSize(letras, colW - 2);
  doc.text(letraLines, rightX + 1, ry);

  // Impreso
  const impreso = `Impreso: ${fechaLargaEs(enc.fechaImpreso || new Date())}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(impreso, FRAME_X + FRAME_W - 4, FRAME_Y + FRAME_H - 3, { align: 'right' });

  const blob = doc.output('blob');
  const safe = String(enc.asegurado || 'liquidador')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 60);

  return {
    blob,
    nombre: `Liquidador_FDM_${safe}.pdf`,
    mime: 'application/pdf',
  };
}

export async function generarConstanciaFdmPdfBlob(liquidador, totales) {
  return generarLiquidadorFdmPdfBlob(liquidador, totales);
}

export async function descargarLiquidadorFdmPdf(liquidador, totales) {
  const { blob, nombre } = await generarLiquidadorFdmPdfBlob(liquidador, totales);
  saveAs(blob, nombre);
}

export async function descargarConstanciaFdmPdf(liquidador, totales) {
  return descargarLiquidadorFdmPdf(liquidador, totales);
}
