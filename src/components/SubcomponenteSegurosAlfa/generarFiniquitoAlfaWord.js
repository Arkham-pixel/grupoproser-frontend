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
import { montoALetrasFdm } from '../SubcomponenteEquidadFdm/liquidadorEquidadFdmHelpers.js';
import {
  formatearMonto,
  formatDateLarga,
  resolverMontoIndemnizarAlfa,
} from './liquidadorAlfaHelpers.js';

/**
 * Finiquito oficial Seguros Alfa — plantilla
 * «FINIQUITO DE INDEMNIZACIÓN SINIESTRO SISMO»
 * (FINIQUITO DE GENERALES). Solo se reemplazan los campos marcados con X.
 */

const thin = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
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

/** Etiqueta + valor en una sola línea (como la plantilla Alfa). */
const lineaCampo = (label, value) =>
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 60, line: 276 },
    children: [
      run(`${label}`, { bold: true, size: 20 }),
      run('\t'),
      run(String(value || '—'), { size: 20 }),
    ],
  });

function formatearCedula(cedula) {
  const digits = String(cedula || '').replace(/\D/g, '');
  if (!digits) return cedula || '—';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function letrasFiniquito(valor) {
  const raw = montoALetrasFdm(valor) || '';
  return String(raw)
    .replace(/\s*Pesos M\/Cte\.?/i, '')
    .replace(/\s*PESOS M\/CTE\.?/i, '')
    .trim()
    .toUpperCase();
}

function partesFechaFirma(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      dia: String(now.getDate()),
      mes: MESES_ES[now.getMonth()],
      anio: String(now.getFullYear()),
    };
  }
  return {
    dia: String(d.getDate()),
    mes: MESES_ES[d.getMonth()],
    anio: String(d.getFullYear()),
  };
}

function celdaBanco(label) {
  return new TableCell({
    borders,
    width: { size: 3120, type: WidthType.DXA },
    children: [
      new Paragraph({
        spacing: { after: 40 },
        children: [run(label, { bold: true, size: 18 })],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [run(' ', { size: 18 })],
      }),
    ],
  });
}

/**
 * Genera y descarga el Finiquito de Generales (siniestro sismo) Seguros Alfa.
 */
export async function descargarFiniquitoAlfaWord(liquidador = {}, totalesInput) {
  const enc = liquidador.encabezado || {};
  // Blindaje: monto = recálculo del liquidador (nunca totalesInput / valorLiquidado viejo)
  const { totalIndemnizar } = resolverMontoIndemnizarAlfa(liquidador, totalesInput);
  const banco = liquidador.datosBancarios || liquidador.finiquitoBancario || {};

  const tomador = enc.tomador || '—';
  const asegurado = enc.asegurado || enc.contacto || tomador || '—';
  const ramo = enc.cobertura || enc.evento || enc.ramo || 'TODO RIESGO DAÑO MATERIAL';
  const poliza = enc.poliza || '—';
  const siniestro = String(enc.siniestro || '—');
  const cedula = formatearCedula(enc.identificacion || enc.cedula);
  const ciudad = enc.ciudad || enc.ciudadFirma || '____________';
  const fechaEventoLarga =
    formatDateLarga(enc.fechaSiniestro) || '10 de agosto de 2026';
  const firma = partesFechaFirma(enc.fechaImpreso || new Date());

  const montoNum = formatearMonto(totalIndemnizar, { decimals: 2 });
  const montoLetras = letrasFiniquito(totalIndemnizar);

  const logosTable = await buildLogosHeader();

  const doc = new Document({
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
        children: [
          p('FINIQUITO DE GENERALES', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 28,
            after: 280,
            before: 80,
          }),

          lineaCampo('RAMO:', ramo),
          lineaCampo('POLIZA:', poliza),
          lineaCampo('TOMADOR:', tomador),
          lineaCampo('ASEGURADO:', asegurado),
          lineaCampo('CC.', cedula),
          lineaCampo('SINIESTRO:', siniestro),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          p(
            [
              { text: 'Nosotros, ' },
              { text: asegurado, bold: true },
              { text: ' identificado con CC: ' },
              { text: cedula, bold: true },
              {
                text:
                  ' en calidad de BENEFICIARIO, declaro haber recibido de la COMPAÑÍA SEGUROS ALFA S.A., con NIT 860.031.979-8, de conformidad y a entera satisfacción la suma de ',
              },
              { text: `${montoLetras} PESOS M/CTE.`, bold: true },
              { text: ' ($' },
              { text: montoNum, bold: true },
              {
                text: `) a título de indemnización total y definitiva por el terremoto ocurrido, el pasado ${fechaEventoLarga}, en una parte del territorio nacional.`,
              },
            ],
            { after: 200 }
          ),

          p(
            'De conformidad con lo anterior, mediante el presente FINIQUITO, declaro quedar indemnizado(a) a entera satisfacción de conformidad con lo pactado en el contrato de seguro citado, así como de todo perjuicio ocasionado en relación con el evento ocurrido, razón por la que de manera voluntaria no iniciaré acciones de carácter civil, penal, mercantil o de cualquiera otra índole en contra de SEGUROS ALFA S.A.',
            { after: 200 }
          ),

          p(
            'Así mismo, de acuerdo con lo dispuesto en el artículo 1096 del Código de Comercio, demás normas concordantes y a lo pactado en la Póliza de Seguro en mención, manifiesto expresamente que conozco y acepto que mediante el presente documento, SEGUROS ALFA S.A. se subroga hasta por la cantidad pagada, en todos los derechos y acciones en contra terceros que se pudieran derivar como consecuencia del siniestro ocurrido, por lo que me obligo a prestar la ayuda necesaria, a comparecer a juicio, a cumplir con las obligaciones pactadas en el contrato de seguro y a realizar todas las actividades razonables en el momento y bajo las condiciones que la Aseguradora así lo requiera, con el objeto que la misma pueda ejercer su derecho de subrogación.',
            { after: 240 }
          ),

          p('DATOS BANCARIOS PARA PAGO:', {
            alignment: AlignmentType.LEFT,
            bold: true,
            after: 120,
          }),

          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [3120, 3120, 3120],
            rows: [
              new TableRow({
                children: [
                  celdaBanco('No. CUENTA'),
                  celdaBanco('BANCO'),
                  celdaBanco('TIPO DE CUENTA'),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    width: { size: 3120, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [run(banco.numeroCuenta || banco.cuenta || '', { size: 18 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders,
                    width: { size: 3120, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [run(banco.banco || '', { size: 18 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders,
                    width: { size: 3120, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [
                          run(banco.tipoCuenta || banco.tipo || '', { size: 18 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 220 }, children: [] }),

          p(
            `En constancia de lo anterior, se suscribe el presente FINIQUITO en la Ciudad de ${ciudad} a los ${firma.dia} del mes de ${firma.mes} del año ${firma.anio}.`,
            { after: 400 }
          ),

          p('___________________________', {
            alignment: AlignmentType.LEFT,
            after: 40,
          }),
          p('FIRMA', { alignment: AlignmentType.LEFT, bold: true, after: 40 }),
          p(
            [
              { text: 'CC. ', bold: true },
              { text: cedula },
            ],
            { alignment: AlignmentType.LEFT, after: 40 }
          ),
          p(
            [
              { text: 'Nombre: ', bold: true },
              { text: asegurado },
            ],
            { alignment: AlignmentType.LEFT, after: 80 }
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safe = String(asegurado || siniestro || 'caso')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 50);
  const nombre = `Finiquito_Generales_Alfa_${safe}.docx`;
  saveAs(blob, nombre);
  return { blob, nombre };
}
