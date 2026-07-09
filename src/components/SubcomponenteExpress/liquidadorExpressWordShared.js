/** Utilidades compartidas para generación Word del liquidador Express */

import {
  AlignmentType,
  Footer,
  Header,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import zurichLogoUrl from '../../assets/zurich-logo.png';

export const FONT = 'Tahoma';
export const FONT_FOOTER = 'Calibri Light';
export const AZUL_ZURICH = '002060';
export const AZUL_ZURICH_FOOTER = '285EA0';

/** Márgenes de R_indemnizacion.dotx (twips) */
export const MARGENES_ZURICH = {
  top: 1417,
  right: 1701,
  bottom: 1417,
  left: 1701,
  header: 708,
  footer: 708,
};

let zurichLogoCache = null;

export async function loadZurichLogo() {
  if (zurichLogoCache) return zurichLogoCache;
  const response = await fetch(zurichLogoUrl);
  zurichLogoCache = await response.arrayBuffer();
  return zurichLogoCache;
}

const runFooter = (text) =>
  new TextRun({
    text,
    font: FONT_FOOTER,
    size: 20,
    color: AZUL_ZURICH_FOOTER,
  });

/** Encabezado Zurich: logo alineado a la derecha (plantilla R_indemnizacion.dotx). */
export function buildZurichHeader(logoBuffer) {
  if (!logoBuffer) return new Header({ children: [] });
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 130, height: 81 },
          }),
        ],
      }),
    ],
  });
}

/** Pie de página Zurich (Of. 1201 según macro VBA del Excel). */
export function buildZurichFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [runFooter('Zurich Colombia Seguros S.A.   |   NIT 860.002.534-0')],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [runFooter('Calle 116 # 7-15 Of. 1201  |  T. +57 1 5188482 / 3190730')],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [runFooter('Bogotá, Colombia')],
      }),
    ],
  });
}

/** Sección Word con branding Zurich (logo + pie + márgenes plantilla). */
export async function buildZurichSection(children) {
  const logoBuffer = await loadZurichLogo();
  return {
    properties: {
      page: { margin: MARGENES_ZURICH },
    },
    headers: { default: buildZurichHeader(logoBuffer) },
    footers: { default: buildZurichFooter() },
    children,
  };
}

export const OPCIONES_APLICA = ['Aplica', 'No Aplica'];

export { NOTAS_SALVAMENTO } from './liquidadorExpressHelpers.js';

export const run = (text, { bold = false, size = 20, color, highlight, italics } = {}) =>
  new TextRun({
    text: text ?? '',
    bold,
    font: FONT,
    size,
    italics,
    ...(color ? { color } : {}),
    ...(highlight ? { highlight } : {}),
  });

export const parrafo = (children, { align = AlignmentType.BOTH, spacingAfter = 120, spacingBefore = 0 } = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: align,
    spacing: { after: spacingAfter, before: spacingBefore },
  });

export const parrafoTexto = (texto, opts = {}) =>
  parrafo([run(texto, { size: opts.size || 20, bold: opts.bold })], opts);

export const tituloSeccion = (texto) =>
  parrafo([run(texto, { bold: true, size: 22, color: AZUL_ZURICH })], {
    spacingBefore: 200,
    spacingAfter: 160,
  });

export const tituloBanner = (texto) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: AZUL_ZURICH },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [run(texto, { bold: true, size: 22, color: 'FFFFFF' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

export const celda = (texto, { bold = false, shading, align = AlignmentType.LEFT, width } = {}) =>
  new TableCell({
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
    ...(shading ? { shading: { fill: shading } } : {}),
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align,
        children: [run(String(texto ?? ''), { bold, size: 18 })],
      }),
    ],
  });

export const celdaEncabezado = (texto) => celda(texto, { bold: true, shading: 'D9E2F3', align: AlignmentType.CENTER });

export const filaLabelValor = (label, valor, { valorBold = false, valorShading } = {}) =>
  new TableRow({
    children: [
      celda(label, { bold: true, width: 35 }),
      celda(valor, { bold: valorBold, shading: valorShading, width: 65 }),
    ],
  });

export const formatearFechaWord = (fechaISO) => {
  if (!fechaISO) return '';
  const d = new Date(`${fechaISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return fechaISO;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatearFechaCorta = (fechaISO) => {
  if (!fechaISO) return '';
  const d = new Date(`${fechaISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return fechaISO;
  return d.toLocaleDateString('es-CO');
};

export const nombreArchivoSeguro = (texto, fallback = 'documento') =>
  String(texto || fallback).replace(/[^a-zA-Z0-9_-]/g, '_');

import { parsearNumero } from './liquidadorExpressHelpers.js';

export function totalesAnalisisPerdida(items = []) {
  const totalReclamado = items.reduce((s, i) => s + parsearNumero(i.reclamado), 0);
  const totalAjustado = items.reduce((s, i) => s + parsearNumero(i.ajustado), 0);
  return { totalReclamado, totalAjustado };
}
