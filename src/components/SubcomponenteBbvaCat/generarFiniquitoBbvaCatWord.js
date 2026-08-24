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
  calcularLiquidacionBbvaCat,
  formatearMonto,
  formatDateLarga,
} from './liquidadorBbvaCatHelpers.js';
import {
  inferirTipoLiquidadorBbvaCat,
  textosLetrerosBbvaCat,
} from './deduciblesBbvaCat.js';

const thin = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: none, bottom: none, left: none, right: none };
const lineBottom = {
  top: none,
  left: none,
  right: none,
  bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
};

const ASEGURADORA = 'BBVA SEGUROS COLOMBIA S.A.';

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
  const BbvaCat =
    (await loadLogoBytes(`${base}templates/logo-bbva.png`)) ||
    (await loadLogoBytes(`${base}templates/logo-bbvaCat.png`)) ||
    (await loadLogoBytes(`${base}templates/logo-zurich.png`));

  const left = new Paragraph({
    spacing: { after: 0 },
    children: proser
      ? [
          new ImageRun({
            data: proser.bytes,
            transformation: { width: 150, height: 48 },
            type: proser.type,
          }),
        ]
      : [new TextRun({ text: 'GRUPO PROSER', bold: true, font: 'Arial', size: 18 })],
  });

  const right = new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 0 },
    children: BbvaCat
      ? [
          new ImageRun({
            data: BbvaCat.bytes,
            transformation: { width: 150, height: 66 },
            type: BbvaCat.type,
          }),
        ]
      : [new TextRun({ text: 'BBVA CAT', bold: true, font: 'Arial', size: 18 })],
  });

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
            children: [left],
          }),
          new TableCell({
            borders: noBorders,
            width: { size: 4680, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [right],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: lineBottom,
            columnSpan: 2,
            width: { size: 9360, type: WidthType.DXA },
            children: [new Paragraph({ spacing: { after: 40 }, children: [] })],
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
    size: opts.size || 18,
    bold: !!opts.bold,
  });

const p = (text, opts = {}) =>
  new Paragraph({
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    children: [run(text, opts)],
  });

const pMixed = (parts, opts = {}) =>
  new Paragraph({
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    children: parts.map((part) =>
      typeof part === 'string' ? run(part, opts) : run(part.text, { ...opts, ...part })
    ),
  });

/** Fila etiqueta | valor — estilo constancia FDM, sin colores */
const filaDato = (label, value) =>
  new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 3200, type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [run(`${label}`, { bold: true, size: 17 })],
          }),
        ],
      }),
      new TableCell({
        borders,
        width: { size: 6160, type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [run(value || '—', { size: 17 })],
          }),
        ],
      }),
    ],
  });

function formatearMontoConstancia(valor) {
  return formatearMonto(valor, { decimals: 2 });
}

function formatearCedula(cedula) {
  const digits = String(cedula || '').replace(/\D/g, '');
  if (!digits) return cedula || '—';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function letrasConstancia(letras) {
  return String(letras || '')
    .replace(/\s*Pesos M\/Cte\.?/i, ' PESOS M/CTE.')
    .trim();
}

function tasaDeducibleTxt(totales) {
  if (totales?.deducibleTexto) return String(totales.deducibleTexto);
  if (totales.usaSMMLV) {
    return `${String(totales.cantidadSMMLV ?? 0).replace('.', ',')} SMMLV`;
  }
  return `${totales.porcentaje || 0}%`;
}

/**
 * Finiquito / Constancia de indemnización BbvaCat
 * (mismo esquema legal que Fundación de la Mujer / Equidad FDM),
 * con nombres de BbvaCat y logos Proser + BbvaCat.
 */
export async function descargarFiniquitoBbvaCatWord(liquidador = {}, totalesInput) {
  const enc = liquidador.encabezado || {};
  const totales = totalesInput || calcularLiquidacionBbvaCat(liquidador);

  const tomador = enc.tomador || '—';
  const asegurado = enc.asegurado || enc.contacto || '—';
  const cobertura = enc.cobertura || enc.evento || enc.ramo || '—';
  const poliza = enc.poliza || '—';
  const orden = enc.consecutivo || enc.orden || '—';
  const siniestro = enc.siniestro || '0';
  const agencia = enc.ciudad || enc.agencia || '—';
  const cedula = formatearCedula(enc.identificacion || enc.cedula);
  const evento = enc.evento || enc.cobertura || '—';
  const direccion = enc.direccion || '—';
  const fechaSiniestroLarga = formatDateLarga(enc.fechaSiniestro);
  const datos = liquidador.datosFiniquito || {};
  const tipo = inferirTipoLiquidadorBbvaCat({
    tipoLiquidador: liquidador.tipoLiquidador,
    encabezado: enc,
  });
  const letreros = textosLetrerosBbvaCat(tipo);
  const meses = [
    '',
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
  const ciudadFirma =
    datos.ciudadFirma || enc.ciudad || enc.ciudadFirma || '________________';
  const diaFirma = datos.diaFirma || '________';
  const mesFirma = meses[Number(datos.mesFirma)] || datos.mesFirma || '________';
  const anioFirma = datos.anioFirma || '________';
  const aceptacion = String(liquidador.aceptacionIndemnizacion || '').toUpperCase();
  const marcaAcepto = aceptacion === 'ACEPTO' ? 'X' : ' ';
  const marcaRechazo = aceptacion === 'RECHAZO' ? 'X' : ' ';
  const observaciones = String(liquidador.observacionesFiniquito || '').trim();
  const tipoLabel = tipo === 'leasing' ? 'Liquidador leasing' : 'Liquidador deudores';

  const totalPerdida = formatearMontoConstancia(
    totales.totalDanios ?? totales.totalPerdida ?? totales.totalIndemnizable
  );
  const deducible = String(totales.deducibleTexto || totales.diagrama?.deducible || 'No aplica');
  const indemnizacion = formatearMontoConstancia(totales.totalIndemnizar);
  const letras = letrasConstancia(montoALetrasFdm(totales.totalIndemnizar));
  const tasaTxt = tasaDeducibleTxt(totales);
  const hospedaje = formatearMontoConstancia(totales.diagrama?.gastosHospedaje || 0);

  const logosTable = await buildLogosHeader();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, bottom: 850, left: 900, right: 900 },
          },
        },
        headers: {
          default: new Header({
            children: [logosTable],
          }),
        },
        children: [
          p('CONSTANCIA DE INDEMNIZACIÓN Y PAZ Y SALVO', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 22,
            after: 200,
            before: 40,
          }),

          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [3200, 6160],
            rows: [
              filaDato('TIPO LIQUIDADOR:', tipoLabel),
              filaDato('TOMADOR:', tomador),
              filaDato('ASEGURADO Y BENEFICIARIO:', asegurado),
              filaDato('COBERTURA / RAMO:', cobertura),
              filaDato('PÓLIZA:', poliza),
              filaDato('N° CRÉDITO:', enc.credito || '—'),
              filaDato('ORDEN / CONSECUTIVO:', orden),
              filaDato('SINIESTRO:', String(siniestro)),
              filaDato('CIUDAD / AGENCIA:', agencia),
            ],
          }),

          p(
            `${asegurado} identificado (a) como aparece al pie de mi firma, obrando en calidad de asegurado (a) beneficiario (a), y afectado (a) por el siniestro de la póliza citada, por medio del presente documento hago constar:`,
            { before: 220, after: 160 }
          ),

          p(
            `PRIMERO. - Que he llegado con ${ASEGURADORA}, aseguradora de los riesgos de la póliza citada, a un arreglo transaccional definitivo, con ocasión al evento ${evento} que afectó el bien asegurado, en la dirección: ${direccion}, en hechos ocurridos el ${fechaSiniestroLarga}.`,
            { after: 140 }
          ),

          p(
            `SEGUNDO. - Que recibiré de ${ASEGURADORA}, la suma de: ($${indemnizacion})-(${letras}), valor en que estimo los perjuicios sufridos, dado que el total de daños según presupuesto NSR-10 es por valor de ($${totalPerdida}), más gastos de hospedaje ($${hospedaje}), con deducible: ${tasaTxt}, para un total a indemnizar de: ($${indemnizacion}).`,
            { after: 140 }
          ),

          p(`Deducibles. ${letreros.avisoDeducible}`, { after: 120 }),
          p(`Objeto de la póliza. ${letreros.objetoPoliza}`, { after: 140 }),
          p(letreros.pazYSalvo, { after: 140 }),

          p(
            `ACEPTO INDEMNIZACIÓN  ( ${marcaAcepto} )          RECHAZO INDEMNIZACIÓN  ( ${marcaRechazo} )`,
            { alignment: AlignmentType.CENTER, after: 140 }
          ),

          p(
            `En aceptación de lo anterior, firmamos el presente documento en la ciudad de ${ciudadFirma}, a los ${diaFirma} días del mes de ${mesFirma} de ${anioFirma}.`,
            { after: 140 }
          ),

          p(letreros.autorizacionPago, { bold: true, after: 140 }),

          observaciones
            ? p(`OBSERVACIONES: ${observaciones}`, { after: 180 })
            : p('OBSERVACIONES:', { after: 180 }),

          p('Firma:', { alignment: AlignmentType.LEFT, after: 280 }),
          p('_________________________________', {
            alignment: AlignmentType.LEFT,
            after: 60,
          }),
          pMixed(
            [
              { text: 'Asegurado (a): ', bold: true },
              { text: asegurado },
            ],
            { alignment: AlignmentType.LEFT, after: 40 }
          ),
          pMixed(
            [
              { text: 'Cédula de Ciudadanía No: ', bold: true },
              { text: cedula },
            ],
            { alignment: AlignmentType.LEFT, after: 200 }
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safe = String(asegurado || siniestro || 'caso')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 50);
  const nombre = `Finiquito_Constancia_BbvaCat_${safe}.docx`;
  saveAs(blob, nombre);
}
