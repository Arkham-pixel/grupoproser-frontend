import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Cartas oficiales Seguros Alfa (terremoto):
 * - Inferior al deducible
 * - Desistimiento
 * Plantillas: CARTA - INFERIOR AL DEDUCIBLE / CARTA - DESISTIMIENTO.
 */

const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: none, bottom: none, left: none, right: none };

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

async function buildLogosHeader() {
  const base = import.meta.env.BASE_URL || '/';
  let proser = await loadLogoBytes(`${base}templates/logo-grupoproser.png`);
  if (!proser) proser = await loadLogoBytes(`${base}templates/logo-grupoproser.jpg`);
  const alfa = await loadLogoBytes(`${base}templates/logo-seguros-alfa.png`);

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
                spacing: { after: 0 },
                children: proser
                  ? [
                      new ImageRun({
                        data: proser.bytes,
                        transformation: { width: 140, height: 45 },
                        type: proser.type,
                      }),
                    ]
                  : [new TextRun({ text: 'GRUPO PROSER', bold: true, font: 'Arial', size: 18 })],
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
                children: alfa
                  ? [
                      new ImageRun({
                        data: alfa.bytes,
                        transformation: { width: 140, height: 62 },
                        type: alfa.type,
                      }),
                    ]
                  : [new TextRun({ text: 'SEGUROS ALFA', bold: true, font: 'Arial', size: 18 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

const run = (text, opts = {}) =>
  new TextRun({
    text: String(text ?? ''),
    font: 'Arial',
    size: opts.size || 20,
    bold: !!opts.bold,
  });

const p = (text, opts = {}) =>
  new Paragraph({
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0, line: opts.line || 276 },
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
    dia: String(base.getDate()),
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

function documentoBase(logosTable, children) {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, bottom: 900, left: 1080, right: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: [logosTable],
          }),
        },
        children,
      },
    ],
  });
}

/**
 * Carta: monto de la pérdida inferior al deducible (sin indemnización).
 */
export async function descargarCartaInferiorDeducibleAlfaWord(liquidador = {}) {
  const { asegurado, ciudad, fecha, siniestro } = datosCartaDesdeLiquidador(liquidador);
  const logosTable = await buildLogosHeader();

  const doc = documentoBase(logosTable, [
    p(`Bogotá D.C., ${fecha.dia} de ${fecha.mes} de ${fecha.anio}`, {
      alignment: AlignmentType.LEFT,
      after: 240,
    }),
    p('Estimado:', { alignment: AlignmentType.LEFT, after: 40 }),
    p(asegurado, { alignment: AlignmentType.LEFT, bold: true, after: 40 }),
    p(`${ciudad}, Colombia`, { alignment: AlignmentType.LEFT, after: 200 }),
    p(
      [
        { text: 'Asunto: ', bold: true },
        { text: 'MONTO DEL DEDUCIBLE DE LA PÓLIZA CONTRATADA', bold: true },
      ],
      { alignment: AlignmentType.LEFT, after: 200 }
    ),
    p('Reciba un cordial saludo.', { after: 160 }),
    p(
      'En Seguros Alfa S.A. lamentamos las afectaciones ocasionadas en su vivienda como consecuencia del reciente evento sísmico ocurrido en Colombia y reiteramos nuestro compromiso de acompañarlo durante esta situación.',
      { after: 160 }
    ),
    p(
      'Una vez revisada la reclamación presentada y las condiciones de la póliza contratada, encontramos que los daños parciales estructurales reportados tienen cobertura bajo el amparo de terremoto. Sin embargo, al efectuar la liquidación correspondiente, se estableció que el valor de la pérdida es inferior al deducible citado en la póliza de seguro todo-riesgo, razón por la cual no hay lugar al reconocimiento de indemnización.',
      { after: 160 }
    ),
    p(
      'Es importante señalar que esta determinación obedece únicamente a la aplicación de las condiciones contractuales acordadas y no a una exclusión de cobertura del evento reclamado.',
      { after: 160 }
    ),
    p(
      'Agradecemos la confianza depositada en Seguros Alfa S.A. y reiteramos nuestra disposición para atender cualquier inquietud relacionada con su póliza.',
      { after: 240 }
    ),
    p('Cordialmente,', { alignment: AlignmentType.LEFT, after: 320 }),
    p('FIRMA AUTORIZADA', { alignment: AlignmentType.LEFT, bold: true, after: 40 }),
    p('Seguros Alfa S.A.', { alignment: AlignmentType.LEFT, after: 120 }),
    p('Elaboró: Katherine Vega Flórez', { alignment: AlignmentType.LEFT, after: 40 }),
  ]);

  const nombre = `Carta_Inferior_Deducible_Alfa_${safeNombreArchivo(asegurado || siniestro)}.docx`;
  return empaquetarYDescargar(doc, nombre);
}

/**
 * Carta / constancia de desistimiento de reclamación por terremoto.
 */
export async function descargarCartaDesistimientoAlfaWord(liquidador = {}) {
  const { asegurado, ciudad, fecha, cedula, poliza, siniestro } =
    datosCartaDesdeLiquidador(liquidador);
  const logosTable = await buildLogosHeader();

  const doc = documentoBase(logosTable, [
    p(`Bogotá D.C., ${fecha.dia} de ${fecha.mes} de ${fecha.anio}`, {
      alignment: AlignmentType.LEFT,
      after: 240,
    }),
    p('Estimado:', { alignment: AlignmentType.LEFT, after: 40 }),
    p(asegurado, { alignment: AlignmentType.LEFT, bold: true, after: 40 }),
    p(`${ciudad}, Colombia`, { alignment: AlignmentType.LEFT, after: 200 }),
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
    p('Firma: _______________________', { alignment: AlignmentType.LEFT, after: 40 }),
  ]);

  const nombre = `Carta_Desistimiento_Alfa_${safeNombreArchivo(asegurado || siniestro)}.docx`;
  return empaquetarYDescargar(doc, nombre);
}
