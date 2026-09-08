import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

/**
 * Genera PDF del acuerdo de confidencialidad a partir del texto + firma.
 */
export async function generarPdfConfidencialidadFirmada({
  textoPlano,
  firmaDataUrl,
  firmante,
  cedula,
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margen = 50;
  const pageWidth = 595;
  const pageHeight = 842;
  const maxWidth = pageWidth - margen * 2;
  const fontSize = 10;
  const lineHeight = 13;

  const wrap = (text, f, size) => {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let current = '';
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margen;

  const drawLine = (text, bold = false) => {
    const f = bold ? fontBold : font;
    const lines = wrap(text, f, bold ? 12 : fontSize);
    for (const line of lines) {
      if (y < margen + 40) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margen;
      }
      page.drawText(line, {
        x: margen,
        y,
        size: bold ? 12 : fontSize,
        font: f,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= bold ? 16 : lineHeight;
    }
  };

  drawLine('ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN', true);
  drawLine('PROSER AJUSTES S.A.S.', true);
  y -= 10;

  const bloques = String(textoPlano || '')
    .split(/\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const bloque of bloques.slice(0, 200)) {
    drawLine(bloque);
    y -= 4;
  }

  if (y < 200) {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margen;
  }

  y -= 20;
  drawLine('CONSTANCIA DE FIRMA', true);
  drawLine(
    `Yo, ${firmante}, cédula ${cedula}, declaro haber leído y aceptado el presente acuerdo. Fecha: ${new Date().toLocaleString('es-CO')}`
  );
  y -= 10;
  drawLine('Firma:');

  if (firmaDataUrl) {
    const bytes = await dataUrlToUint8Array(firmaDataUrl);
    const png = await pdf.embedPng(bytes).catch(async () => pdf.embedJpg(bytes));
    const maxW = 220;
    const scale = Math.min(maxW / png.width, 80 / png.height);
    if (y - png.height * scale < margen) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margen;
    }
    page.drawImage(png, {
      x: margen,
      y: y - png.height * scale,
      width: png.width * scale,
      height: png.height * scale,
    });
  }

  const out = await pdf.save();
  return new Blob([out], { type: 'application/pdf' });
}
