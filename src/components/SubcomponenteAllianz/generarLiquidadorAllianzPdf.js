import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import {
  armarInformeLiquidacionAllianz,
  calcularLiquidacionAllianz,
  formatearMonto,
} from './liquidadorAllianzHelpers.js';
import logoAllianzUrl from '../../assets/logo-allianz.jpg';

/** Portrait A4 — misma composición del Informe Liquidación Allianz. */
const PAGE_W = 210;
const M = 18;
const INK = [33, 37, 41];
const MUTED = [90, 98, 104];
const LINE = [0, 0, 0];
const TABLE_HEAD = [232, 232, 232];
const BLUE = [0, 115, 177];

function money(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '$ 0,00';
  return `$ ${formatearMonto(n, { decimals: 2 })}`;
}

function txt(v, fallback = '') {
  const s = String(v ?? '').trim();
  if (!s || s === 'null' || s === 'undefined') return fallback;
  return s;
}

function fmtFechaCorta(value) {
  const d = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  }
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

async function loadLogoDataUrl(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return '';
    const blob = await resp.blob();
    if (!blob || blob.size < 40) return '';
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

/** Logo Allianz oficial (wordmark + icono): 159×47 → ~3,38:1 */
function drawAllianzLogos(doc, dataUrl) {
  if (!dataUrl) return false;
  const wLogo = 42;
  const hLogo = 12.4;
  try {
    doc.addImage(dataUrl, 'JPEG', M, 10, wLogo, hLogo);
    doc.addImage(dataUrl, 'JPEG', PAGE_W - M - wLogo, 10, wLogo, hLogo);
    return true;
  } catch {
    return false;
  }
}

function sectionRule(doc, title, x, y, w) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(title, x, y);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.7);
  doc.line(x, y + 2.2, x + w, y + 2.2);
  return y + 8;
}

function fieldPair(doc, left, right, x, y, w) {
  const col = (w - 10) / 2;
  const draw = (ox, label, value) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`${label}`, ox, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(txt(value, '—'), col);
    doc.text(lines.slice(0, 3), ox, y + 5.5);
  };
  draw(x, left.label, left.value);
  draw(x + col + 10, right.label, right.value);
  return y + 16;
}

function totalsRow(doc, items, x, y, w) {
  const n = items.length;
  const gap = 4;
  const colW = (w - gap * (n - 1)) / n;
  items.forEach((item, i) => {
    const ox = x + i * (colW + gap);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(item.label, ox, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    const amount = money(item.value);
    const lines = doc.splitTextToSize(amount, colW);
    doc.text(lines[0] || '', ox, y + 6);
  });
  return y + 14;
}

/**
 * PDF Informe Liquidación Allianz, con los totales del liquidador.
 */
export async function generarLiquidadorAllianzPdfBlob(liquidador, totales, caso = {}) {
  const tot = totales || calcularLiquidacionAllianz(liquidador || {});
  const data = armarInformeLiquidacionAllianz(liquidador || {}, tot, caso);
  const enc = liquidador?.encabezado || {};

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `Informe Liquidación Allianz - ${data.siniestro || enc.asegurado || ''}`,
    creator: 'Grupo Proser',
  });

  const x = M;
  const w = PAGE_W - M * 2;
  const logoDataUrl = await loadLogoDataUrl(logoAllianzUrl);
  const pintados = drawAllianzLogos(doc, logoDataUrl);
  if (!pintados) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...BLUE);
    doc.text('Allianz', x, 18);
    doc.text('Allianz', PAGE_W - M, 18, { align: 'right' });
  }

  let y = 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text('Informe Liquidación', x, y);

  y += 10;
  y = sectionRule(doc, 'Datos generales', x, y, w);
  y = fieldPair(
    doc,
    { label: 'Número de siniestro:', value: data.siniestro },
    { label: 'Fecha de creación:', value: fmtFechaCorta(data.fechaCreacion) },
    x,
    y,
    w
  );

  y += 1;
  y = sectionRule(doc, 'Asegurado', x, y, w);
  y = fieldPair(
    doc,
    { label: 'Nombre:', value: data.asegurado },
    { label: 'Identificación:', value: data.identificacion },
    x,
    y,
    w
  );
  y = fieldPair(
    doc,
    { label: 'Teléfono celular:', value: data.telefono },
    { label: 'E-Mail:', value: data.email },
    x,
    y,
    w
  );

  y += 1;
  y = sectionRule(doc, 'Liquidación', x, y, w);

  const filas = Array.isArray(data.filas) && data.filas.length ? data.filas : [];
  autoTable(doc, {
    startY: y,
    margin: { left: x, right: M },
    tableWidth: w,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: INK,
      lineColor: [180, 180, 180],
      lineWidth: 0.15,
      cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 },
      valign: 'middle',
    },
    headStyles: {
      fillColor: TABLE_HEAD,
      textColor: INK,
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 52 },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 38, halign: 'right' },
      4: { cellWidth: w - 138 },
    },
    head: [['#', 'Bien afectado', 'Valor reclamado', 'Valor liquidación', 'Cobertura']],
    body: filas.map((fila) => [
      String(fila.n || ''),
      txt(fila.bienAfectado, '—'),
      money(fila.valorReclamado),
      money(fila.valorLiquidacion),
      txt(fila.cobertura, '—'),
    ]),
  });

  y = (doc.lastAutoTable?.finalY || y) + 10;
  y = totalsRow(
    doc,
    [
      { label: 'Valor total reclamado', value: data.valorTotalReclamado },
      { label: 'Valor total liquidación', value: data.valorTotalLiquidacion },
      { label: 'Deducible', value: data.deducible },
      { label: 'Valor a indemnizar', value: data.valorAIndemnizar },
    ],
    x,
    y,
    w
  );

  y += 6;
  y = sectionRule(doc, 'Observaciones', x, y, w);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const obs = txt(data.observaciones, '—');
  const obsLines = doc.splitTextToSize(obs, w);
  obsLines.forEach((ln) => {
    if (y > 277) {
      doc.addPage();
      drawAllianzLogos(doc, logoDataUrl);
      y = 30;
    }
    doc.text(ln, x, y);
    y += 5;
  });

  return doc.output('blob');
}

export async function descargarLiquidadorAllianzPdf(liquidador, totales, caso = {}) {
  const blob = await generarLiquidadorAllianzPdfBlob(liquidador, totales, caso);
  const enc = liquidador?.encabezado || {};
  const safe = String(enc.siniestro || enc.consecutivo || 'Allianz')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  const filename = `Informe_Liquidacion_Allianz_${safe}.pdf`;
  saveAs(blob, filename);
  return { blob, filename };
}
