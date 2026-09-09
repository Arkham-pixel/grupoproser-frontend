import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { parrafoSoloImagenFirmaClienteAlfa } from './firmaClienteAlfaWord.js';

/**
 * Cartas oficiales Seguros Alfa (terremoto):
 * - Objeción / inferior al deducible (plantilla oficial)
 * - Desistimiento
 * Header: solo logo Seguros Alfa (sin Grupo Proser).
 */

const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: none, bottom: none, left: none, right: none };
const ALFA_GREEN = '1B5E20';

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

async function loadLogoBytes(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
    const isJpg = u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8;
    if (!isPng && !isJpg) return null;
    return { bytes: u8, type: isPng ? 'png' : 'jpg' };
  } catch {
    return null;
  }
}

async function loadAssetPreferido(paths) {
  for (const url of paths) {
    const img = await loadLogoBytes(url);
    if (img) return img;
  }
  return null;
}

/** Header oficial: «Página X de Y» izquierda + logo Alfa (solo imagen) derecha. */
async function buildHeaderObjecionAlfa() {
  const base = import.meta.env.BASE_URL || '/';
  // Solo la imagen del cubo; no agregar texto «seguros alfa» (queda duplicado / mal).
  const alfa = await loadAssetPreferido([
    `${base}templates/logo-seguros-alfa-carta.png`,
    `${base}templates/logo-seguros-alfa.png`,
  ]);

  const logoChildren = alfa
    ? [
        new ImageRun({
          data: alfa.bytes,
          transformation: { width: 110, height: 110 },
          type: alfa.type,
        }),
      ]
    : [new TextRun({ text: 'SEGUROS ALFA', bold: true, font: 'Arial', size: 28 })];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: 4680, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: 'Página ', font: 'Arial', size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16 }),
                  new TextRun({ text: ' de ', font: 'Arial', size: 16 }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: 'Arial',
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: noBorders,
            width: { size: 4680, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: logoChildren,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Solo logo Alfa (cartas simples / desistimiento). */
async function buildLogosHeader() {
  const base = import.meta.env.BASE_URL || '/';
  const alfa = await loadAssetPreferido([
    `${base}templates/logo-seguros-alfa-carta.png`,
    `${base}templates/logo-seguros-alfa.png`,
  ]);

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: 9360, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: alfa
                  ? [
                      new ImageRun({
                        data: alfa.bytes,
                        transformation: { width: 140, height: 48 },
                        type: alfa.type,
                      }),
                    ]
                  : [
                      new TextRun({
                        text: 'SEGUROS ALFA',
                        bold: true,
                        font: 'Arial',
                        size: 18,
                      }),
                    ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Pie oficial de la carta de objeción. */
function buildFooterObjecionAlfa() {
  return new Footer({
    children: [
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [6200, 3160],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: noBorders,
                width: { size: 6200, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: 'Seguros Alfa S.A. y Seguros de Vida Alfa S.A.',
                        bold: true,
                        font: 'Arial',
                        size: 16,
                        color: ALFA_GREEN,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: noBorders,
                width: { size: 3160, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: 'www.segurosalfa.com.co',
                        bold: true,
                        font: 'Arial',
                        size: 16,
                        color: ALFA_GREEN,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 20, before: 40 },
        children: [
          new TextRun({
            text: 'Líneas de atención al cliente:',
            bold: true,
            font: 'Arial',
            size: 15,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({ text: 'Bogotá: ', bold: true, font: 'Arial', size: 14 }),
          new TextRun({ text: '(601) 307 70 32, ', font: 'Arial', size: 14 }),
          new TextRun({ text: 'a nivel nacional: ', bold: true, font: 'Arial', size: 14 }),
          new TextRun({ text: '01 8000 12 25 32. ', font: 'Arial', size: 14 }),
          new TextRun({ text: 'Lunes a viernes,', bold: true, font: 'Arial', size: 14 }),
          new TextRun({
            text: ' de 8:00 a.m. a 8:00 p.m. en jornada continua y ',
            font: 'Arial',
            size: 14,
          }),
          new TextRun({ text: 'sábados', bold: true, font: 'Arial', size: 14 }),
          new TextRun({ text: ' de 8:00 a.m. a 12 m.', font: 'Arial', size: 14 }),
        ],
      }),
    ],
  });
}

const run = (text, opts = {}) =>
  new TextRun({
    text: String(text ?? ''),
    font: 'Arial',
    size: opts.size || 22,
    bold: !!opts.bold,
    italics: !!opts.italics,
    color: opts.color,
  });

const p = (text, opts = {}) =>
  new Paragraph({
    alignment: opts.alignment || AlignmentType.BOTH,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: opts.line || 276 },
    children: Array.isArray(text)
      ? text.map((part) =>
          typeof part === 'string' ? run(part, opts) : run(part.text, { ...opts, ...part })
        )
      : [run(text, opts)],
  });

function formatearCedula(cedula) {
  const digits = String(cedula || '').replace(/\D/g, '');
  if (!digits) return cedula || '__________';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function partesFecha(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const base = Number.isNaN(d.getTime()) ? new Date() : d;
  return {
    dia: String(base.getDate()).padStart(2, '0'),
    mes: MESES_ES[base.getMonth()],
    anio: String(base.getFullYear()),
  };
}

function safeNombreArchivo(valor, fallback = 'caso') {
  return String(valor || fallback)
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 50);
}

function datosCartaDesdeLiquidador(liquidador = {}) {
  const enc = liquidador.encabezado || {};
  const asegurado =
    enc.asegurado || enc.contacto || liquidador.nombreFirmante || enc.tomador || 'XXXXXXXXXX';
  const ciudad = enc.ciudad || enc.municipio || enc.ciudadFirma || 'Bogotá';
  const fecha = partesFecha(enc.fechaImpreso || new Date());
  const cedula = formatearCedula(enc.identificacion || enc.cedula);
  const poliza = enc.poliza || '_______________';
  const siniestro = String(enc.siniestro || '');
  return { enc, asegurado, ciudad, fecha, cedula, poliza, siniestro };
}

async function empaquetarYDescargar(doc, nombre) {
  const blob = await Packer.toBlob(doc);
  saveAs(blob, nombre);
  return { blob, nombre };
}

function documentoBase(logosTable, children, { footer } = {}) {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            // Márgenes plantilla oficial (~1.76 cm laterales, ~2.0 cm vertical)
            margin: { top: 1134, bottom: 1134, left: 1080, right: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: [logosTable],
          }),
        },
        footers: footer
          ? {
              default: footer,
            }
          : undefined,
        children,
      },
    ],
  });
}

async function parrafoFirmaAutorizadaHbAlfa() {
  const base = import.meta.env.BASE_URL || '/';
  const firma = await loadAssetPreferido([
    `${base}templates/firma-autorizada-alfa-hb.png`,
  ]);
  if (!firma) {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 40, before: 80 },
      children: [run('___________________________', { size: 22 })],
    });
  }
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 40, before: 80 },
    children: [
      new ImageRun({
        data: firma.bytes,
        transformation: { width: 110, height: 55 },
        type: firma.type,
      }),
    ],
  });
}

/**
 * Carta de objeción: monto de la pérdida inferior al deducible (sin indemnización).
 * Réplica de la plantilla oficial Seguros Alfa (CARTA - INFERIOR AL DEDUCIBLE).
 */
export async function descargarCartaInferiorDeducibleAlfaWord(liquidador = {}) {
  const { asegurado, ciudad, fecha, siniestro } = datosCartaDesdeLiquidador(liquidador);
  const headerTable = await buildHeaderObjecionAlfa();
  const footer = buildFooterObjecionAlfa();
  const firmaHb = await parrafoFirmaAutorizadaHbAlfa();

  const doc = documentoBase(
    headerTable,
    [
      p(`Bogotá D.C., ${fecha.dia} de ${fecha.mes} de ${fecha.anio}`, {
        alignment: AlignmentType.BOTH,
        italics: true,
        after: 200,
        before: 80,
      }),
      p('', { after: 80 }),
      p('Estimado:', { alignment: AlignmentType.BOTH, after: 40 }),
      p(asegurado, { alignment: AlignmentType.BOTH, bold: true, after: 40 }),
      p(`${ciudad}, Colombia`, { alignment: AlignmentType.BOTH, after: 160 }),
      p('', { after: 80 }),
      p(
        [
          { text: 'Asunto: ', bold: true },
          { text: 'MONTO DEL DEDUCIBLE DE LA PÓLIZA CONTRATADA', bold: true },
        ],
        { alignment: AlignmentType.BOTH, after: 200 }
      ),
      p('', { after: 40 }),
      p('Reciba un cordial saludo.', { alignment: AlignmentType.BOTH, after: 160 }),
      p(
        'En Seguros Alfa S.A. lamentamos las afectaciones ocasionadas en su vivienda como consecuencia del reciente evento sísmico ocurrido en Colombia y reiteramos nuestro compromiso de acompañarlo durante esta situación.',
        { alignment: AlignmentType.BOTH, after: 160 }
      ),
      p(
        'Una vez revisada la reclamación presentada y las condiciones de la póliza contratada, encontramos que los daños parciales estructurales reportados tienen cobertura bajo el amparo de terremoto. Sin embargo, al efectuar la liquidación correspondiente, se estableció que el valor de la pérdida es inferior al deducible citado en la póliza de seguro todo-riesgo, razón por la cual no hay lugar al reconocimiento de indemnización.',
        { alignment: AlignmentType.BOTH, after: 160 }
      ),
      p(
        'Es importante señalar que esta determinación obedece únicamente a la aplicación de las condiciones contractuales acordadas y no a una exclusión de cobertura del evento reclamado.',
        { alignment: AlignmentType.BOTH, after: 160 }
      ),
      p(
        'Agradecemos la confianza depositada en Seguros Alfa S.A. y reiteramos nuestra disposición para atender cualquier inquietud relacionada con su póliza.',
        { alignment: AlignmentType.BOTH, after: 200 }
      ),
      p('', { after: 80 }),
      p('Cordialmente,', { alignment: AlignmentType.BOTH, after: 120 }),
      firmaHb,
      p('FIRMA AUTORIZADA', { alignment: AlignmentType.BOTH, bold: true, after: 40 }),
      p('Seguros Alfa S.A.', { alignment: AlignmentType.BOTH, after: 80 }),
      p(
        [
          { text: 'Elaboro: ', italics: true, size: 16 },
          { text: 'Katherine Vega Flórez', italics: true, size: 16 },
        ],
        { alignment: AlignmentType.BOTH, after: 40 }
      ),
    ],
    { footer }
  );

  const nombre = `Carta_Objecion_Inferior_Deducible_Alfa_${safeNombreArchivo(asegurado || siniestro)}.docx`;
  return empaquetarYDescargar(doc, nombre);
}

/**
 * Carta / constancia de desistimiento de reclamación por terremoto.
 */
export async function descargarCartaDesistimientoAlfaWord(liquidador = {}) {
  const { asegurado, fecha, cedula, poliza, siniestro } =
    datosCartaDesdeLiquidador(liquidador);
  const logosTable = await buildLogosHeader();
  const firmaClienteParrafo = await parrafoSoloImagenFirmaClienteAlfa(liquidador);

  const doc = documentoBase(logosTable, [
    p(`Bogotá D.C., ${fecha.dia} de ${fecha.mes} de ${fecha.anio}`, {
      alignment: AlignmentType.LEFT,
      after: 240,
    }),
    p('Señores:', { alignment: AlignmentType.LEFT, after: 40 }),
    p('SEGUROS ALFA S.A.', { alignment: AlignmentType.LEFT, bold: true, after: 40 }),
    p('Bogotá D.C., Colombia', { alignment: AlignmentType.LEFT, after: 200 }),
    p(
      [
        { text: 'Asunto: ', bold: true },
        { text: 'Desistimiento reclamación terremoto', bold: true },
      ],
      { alignment: AlignmentType.LEFT, after: 200 }
    ),
    p('Reciba un cordial saludo.', { after: 160 }),
    p(
      [
        { text: 'Yo ' },
        { text: asegurado, bold: true },
        { text: ', identificado(a) con cédula No. ' },
        { text: cedula, bold: true },
        { text: ', titular de la póliza No. ' },
        { text: String(poliza), bold: true },
        {
          text:
            ', manifiesto mi decisión voluntaria de desistir de la reclamación presentada por los daños reportados con ocasión del terremoto ocurrido en Colombia el 10 de agosto de 2026.',
        },
      ],
      { after: 280 }
    ),
    p('Atentamente,', { alignment: AlignmentType.LEFT, after: 280 }),
    p(
      [
        { text: 'Nombre completo: ', bold: true },
        { text: asegurado },
      ],
      { alignment: AlignmentType.LEFT, after: 80 }
    ),
    p(
      [
        { text: 'C.C. No. ', bold: true },
        { text: cedula },
      ],
      { alignment: AlignmentType.LEFT, after: 80 }
    ),
    firmaClienteParrafo,
  ]);

  const nombre = `Carta_Desistimiento_Alfa_${safeNombreArchivo(asegurado || siniestro)}.docx`;
  return empaquetarYDescargar(doc, nombre);
}
