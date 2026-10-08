import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { rellenarAcuerdoConfidencialidad } from './rellenarAcuerdoConfidencialidad';

async function dataUrlToUint8Array(dataUrl) {
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Anexa una página de firma al PDF de política de datos.
 */
export async function generarPdfPoliticaFirmada({ plantillaUrl, firmaDataUrl, firmante, cedula }) {
  const plantillaBytes = await fetch(plantillaUrl).then((r) => r.arrayBuffer());
  const pdf = await PDFDocument.load(plantillaBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  let y = height - 60;

  page.drawText('CONSTANCIA DE ACEPTACIÓN Y FIRMA', {
    x: 50,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;
  page.drawText('Política de tratamiento de datos personales — Proser Ajustes / Grupo Proser', {
    x: 50,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 40;

  const lineas = [
    `Yo, ${firmante}, identificado(a) con cédula ${cedula},`,
    'declaro haber leído y aceptado la Política de tratamiento de datos personales',
    'de Proser Ajustes / Grupo Proser, y firmo de manera voluntaria.',
    '',
    `Fecha y hora: ${new Date().toLocaleString('es-CO')}`,
  ];
  for (const linea of lineas) {
    page.drawText(linea, { x: 50, y, size: 11, font, color: rgb(0.15, 0.15, 0.15), maxWidth: width - 100 });
    y -= 18;
  }

  y -= 20;
  page.drawText('Firma:', { x: 50, y, size: 11, font: fontBold });
  y -= 10;

  if (firmaDataUrl) {
    const bytes = await dataUrlToUint8Array(firmaDataUrl);
    const png = await pdf.embedPng(bytes).catch(async () => pdf.embedJpg(bytes));
    const maxW = 220;
    const scale = Math.min(maxW / png.width, 80 / png.height);
    page.drawImage(png, {
      x: 50,
      y: y - png.height * scale,
      width: png.width * scale,
      height: png.height * scale,
    });
  }

  const out = await pdf.save();
  return new Blob([out], { type: 'application/pdf' });
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/**
 * Genera PDF del acuerdo de confidencialidad con datos diligenciados y layout ordenado.
 */
export async function generarPdfConfidencialidadFirmada({
  textoPlano,
  firmaDataUrl,
  firmante,
  cedula,
  correo = '',
  celular = '',
  direccion = '',
  ciudad = '',
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margen = 48;
  const pageWidth = 595;
  const pageHeight = 842;
  const maxWidth = pageWidth - margen * 2;
  const fontSize = 9.5;
  const lineHeight = 12.5;

  const textoRelleno = rellenarAcuerdoConfidencialidad(textoPlano, {
    nombre: firmante,
    cedula,
    correo,
    celular,
    direccion,
    ciudad,
  });

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margen;

  const ensureSpace = (needed = 40) => {
    if (y < margen + needed) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margen;
    }
  };

  const drawLine = (text, { bold = false, size = fontSize, gap = lineHeight, color = rgb(0.12, 0.12, 0.12) } = {}) => {
    const f = bold ? fontBold : font;
    const lines = wrapText(text, f, size, maxWidth);
    for (const line of lines) {
      ensureSpace();
      page.drawText(line, { x: margen, y, size, font: f, color });
      y -= gap;
    }
  };

  const drawSpacer = (h = 8) => {
    y -= h;
  };

  // Encabezado
  drawLine('ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN', {
    bold: true,
    size: 13,
    gap: 16,
  });
  drawLine('PROSER AJUSTES S.A.S.', { bold: true, size: 11, gap: 14 });
  drawSpacer(6);

  const bloques = String(textoRelleno || '')
    .split(/\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Evitar duplicar títulos que ya dibujamos
  const skipTitles = new Set([
    'ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN',
    'PROSER AJUSTES S.A.S.',
  ]);

  for (const bloque of bloques.slice(0, 220)) {
    if (skipTitles.has(bloque.toUpperCase())) continue;

    const esTituloClausula =
      /^(ANTECEDENTES|CLÁUSULAS|CLÁUSULA|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA|VIG[EÉ]SIMA)/i.test(
        bloque
      ) && bloque.length < 120;

    if (esTituloClausula) {
      drawSpacer(6);
      drawLine(bloque, { bold: true, size: 10, gap: 13 });
      drawSpacer(2);
    } else {
      drawLine(bloque);
      drawSpacer(3);
    }
  }

  // Bloque de firmas ordenado (dos columnas)
  ensureSpace(220);
  drawSpacer(16);
  page.drawLine({
    start: { x: margen, y: y + 6 },
    end: { x: pageWidth - margen, y: y + 6 },
    thickness: 0.8,
    color: rgb(0.75, 0.75, 0.75),
  });
  drawSpacer(14);
  drawLine('FIRMAS DE LAS PARTES', { bold: true, size: 11, gap: 16 });

  const colW = (maxWidth - 20) / 2;
  const leftX = margen;
  const rightX = margen + colW + 20;
  const firmasY = y;

  const drawFirmaColumna = (x, lineasCol) => {
    let cy = firmasY;
    page.drawLine({
      start: { x, y: cy },
      end: { x: x + colW - 10, y: cy },
      thickness: 0.7,
      color: rgb(0.2, 0.2, 0.2),
    });
    cy -= 16;
    for (const linea of lineasCol) {
      const f = linea.bold ? fontBold : font;
      const wrapped = wrapText(linea.text, f, 9, colW - 10);
      for (const w of wrapped) {
        page.drawText(w, { x, y: cy, size: 9, font: f, color: rgb(0.12, 0.12, 0.12) });
        cy -= 12;
      }
    }
    return cy;
  };

  const yIzq = drawFirmaColumna(leftX, [
    { text: 'ELKIN GABRIEL TAPIA GUTIERREZ', bold: true },
    { text: 'Representante Legal' },
    { text: 'PROSER AJUSTES SAS' },
    { text: 'NIT No. 901.287.348-8' },
  ]);
  const yDer = drawFirmaColumna(rightX, [
    { text: String(firmante || '').toUpperCase(), bold: true },
    { text: 'EL CONTRATISTA' },
    { text: `C.C. No. ${cedula || ''}` },
  ]);
  y = Math.min(yIzq, yDer) - 20;

  // Constancia
  ensureSpace(160);
  page.drawRectangle({
    x: margen,
    y: y - 130,
    width: maxWidth,
    height: 140,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });
  y -= 18;
  page.drawText('CONSTANCIA DE FIRMA', {
    x: margen + 12,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 18;
  const constancia = wrapText(
    `Yo, ${firmante}, cédula ${cedula}, declaro haber leído y aceptado el presente acuerdo. Fecha: ${new Date().toLocaleString('es-CO')}`,
    font,
    9.5,
    maxWidth - 24
  );
  for (const linea of constancia) {
    page.drawText(linea, {
      x: margen + 12,
      y,
      size: 9.5,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 13;
  }
  y -= 6;
  page.drawText('Firma:', {
    x: margen + 12,
    y,
    size: 10,
    font: fontBold,
  });
  y -= 8;

  if (firmaDataUrl) {
    const bytes = await dataUrlToUint8Array(firmaDataUrl);
    const png = await pdf.embedPng(bytes).catch(async () => pdf.embedJpg(bytes));
    const maxW = 200;
    const scale = Math.min(maxW / png.width, 55 / png.height);
    page.drawImage(png, {
      x: margen + 12,
      y: y - png.height * scale,
      width: png.width * scale,
      height: png.height * scale,
    });
  }

  const out = await pdf.save();
  return new Blob([out], { type: 'application/pdf' });
}
