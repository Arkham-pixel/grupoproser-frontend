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
  calcularLiquidacionZurich,
  formatearMonto,
  formatDateLarga,
} from './liquidadorZurichHelpers.js';

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

const ASEGURADORA = 'Zurich S.A.';

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
  const Zurich = await loadLogoBytes(`${base}templates/logo-zurich.png`);

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
    children: Zurich
      ? [
          new ImageRun({
            data: Zurich.bytes,
            transformation: { width: 150, height: 66 },
            type: Zurich.type,
          }),
        ]
      : [new TextRun({ text: 'Zurich', bold: true, font: 'Arial', size: 18 })],
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
 * Finiquito / Constancia de indemnización Zurich
 * (mismo esquema legal que Fundación de la Mujer / Equidad FDM),
 * con nombres de Zurich y logos Proser + Zurich.
 */
export async function descargarFiniquitoZurichWord(liquidador = {}, totalesInput) {
  const enc = liquidador.encabezado || {};
  const totales = totalesInput || calcularLiquidacionZurich(liquidador);

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
  const fechaImpresoLarga = formatDateLarga(enc.fechaImpreso || new Date());
  const ciudadFirma = enc.ciudad || enc.ciudadFirma || 'Colombia';

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
              filaDato('TOMADOR:', tomador),
              filaDato('ASEGURADO Y BENEFICIARIO:', asegurado),
              filaDato('COBERTURA / RAMO:', cobertura),
              filaDato('PÓLIZA:', poliza),
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

          p(
            `TERCERO. - Que en consecuencia de lo anterior declaro a PAZ Y SALVO y libre de posteriores reclamos a ${ASEGURADORA}, por los hechos el ${fechaSiniestroLarga}.`,
            { after: 140 }
          ),

          p(
            `CUARTO. - De acuerdo con lo establecido por los artículos 15, 2.483 y concordantes del Código Civil Colombiano, renuncio y desisto de las acciones y derechos que me confieren las leyes civiles y penales, para iniciar en un futuro acción alguna que persiga el pago de perjuicios materiales y morales en contra de ${ASEGURADORA}, en consideración a que los daños fueron indemnizados en su totalidad.`,
            { after: 180 }
          ),

          p(`Para constancia de lo anterior se firma en ${ciudadFirma} ${fechaImpresoLarga}.`, {
            after: 360,
          }),

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
  const nombre = `Finiquito_Constancia_Zurich_${safe}.docx`;
  saveAs(blob, nombre);
  return { blob, filename: nombre };
}
