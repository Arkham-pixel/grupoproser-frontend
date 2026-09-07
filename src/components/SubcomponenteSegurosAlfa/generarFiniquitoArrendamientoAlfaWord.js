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
import {
  formatearMonto,
  FECHA_TERREMOTO_ALFA_LARGA,
  resolverMontoIndemnizarAlfa,
  sumarOtrosAmparosAlfa,
} from './liquidadorAlfaHelpers.js';
import { parrafosFirmaClienteAlfa } from './firmaClienteAlfaWord.js';

/**
 * Finiquito parcial Alfa — gastos de arrendamiento por inhabitabilidad.
 * Header: solo logo Seguros Alfa (sin Grupo Proser).
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

async function buildLogoAlfaHeader() {
  const base = import.meta.env.BASE_URL || '/';
  const alfa = await loadLogoBytes(`${base}templates/logo-seguros-alfa.png`);

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

function celdaValorBanco(valor) {
  return new TableCell({
    borders,
    width: { size: 3120, type: WidthType.DXA },
    children: [new Paragraph({ children: [run(valor || '', { size: 18 })] })],
  });
}

/** Prioriza arriendo/inhabitabilidad de otros amparos; si no hay, total a indemnizar. */
export function resolverMontoArrendamientoFiniquitoAlfa(liquidador = {}, totalesInput) {
  const otros = Array.isArray(liquidador.otrosAmparos) ? liquidador.otrosAmparos : [];
  const arriendo = otros.filter((it) => {
    if (it?.aplica === false) return false;
    const tipo = String(it?.tipo || '').toLowerCase();
    const nombre = String(it?.nombre || '').toLowerCase();
    return tipo === 'arriendo' || /arriend|rentas|inhabitab/.test(nombre);
  });
  const sumaArriendo = sumarOtrosAmparosAlfa(arriendo);
  if (sumaArriendo > 0) return sumaArriendo;
  const { totalIndemnizar } = resolverMontoIndemnizarAlfa(liquidador, totalesInput);
  return Math.max(0, Number(totalIndemnizar) || 0);
}

/**
 * Genera y descarga el finiquito parcial de arrendamiento por inhabitabilidad.
 */
export async function descargarFiniquitoArrendamientoAlfaWord(liquidador = {}, totalesInput) {
  const enc = liquidador.encabezado || {};
  const monto = resolverMontoArrendamientoFiniquitoAlfa(liquidador, totalesInput);
  const banco = liquidador.datosBancarios || liquidador.finiquitoBancario || {};

  const tomador = enc.tomador || '—';
  const asegurado = enc.asegurado || enc.contacto || tomador || '—';
  const ramo = enc.cobertura || enc.evento || enc.ramo || 'TERREMOTO';
  const poliza = enc.poliza || '—';
  const siniestro = String(enc.siniestro || '—');
  const cedula = formatearCedula(enc.identificacion || enc.cedula);
  const ciudad = enc.ciudad || enc.ciudadFirma || banco.ciudadFirma || 'CALI';
  const firma = partesFechaFirma(enc.fechaImpreso || new Date());
  const montoNum = formatearMonto(monto, { decimals: 0 });

  const logosTable = await buildLogoAlfaHeader();
  const firmasCliente = await parrafosFirmaClienteAlfa({
    liquidador,
    cedula,
    nombre: asegurado,
    etiquetaFirma: 'FIRMA',
  });

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
          p('FINIQUITO PARCIAL – GASTOS DE ARRENDAMIENTO POR INHABITABILIDAD', {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
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
              { text: 'Yo, ' },
              { text: asegurado, bold: true },
              { text: ', identificado(a) con cédula de ciudadanía No. ' },
              { text: cedula, bold: true },
              {
                text: ', en calidad de asegurado(a)/beneficiario(a), declaro haber recibido de SEGUROS ALFA S.A. la suma de $',
              },
              { text: montoNum, bold: true },
              {
                text: `, correspondiente única y exclusivamente al reconocimiento de la cobertura de gastos de arrendamiento derivados de la inhabitabilidad del inmueble asegurado, con ocasión del terremoto ocurrido el día ${FECHA_TERREMOTO_ALFA_LARGA}.`,
              },
            ],
            { after: 200 }
          ),

          p(
            'El presente documento constituye un finiquito parcial y específico respecto de los valores reconocidos por concepto de gastos de arrendamiento por inhabitabilidad.',
            { after: 200 }
          ),

          p(
            'En consecuencia, el presente finiquito no constituye una transacción, renuncia, desistimiento ni cierre definitivo de la totalidad del siniestro, y expresamente se deja a salvo cualquier reclamación que pueda corresponder al asegurado por daños materiales, reparaciones, reposición de bienes u otros conceptos amparados por la póliza, que no hayan sido objeto de reconocimiento mediante el presente pago.',
            { after: 200 }
          ),

          p(
            'El pago aquí relacionado se limita exclusivamente al concepto de gastos de arrendamiento por inhabitabilidad, sin que pueda entenderse como indemnización total y definitiva de los daños o perjuicios derivados del evento.',
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
                  celdaValorBanco(banco.numeroCuenta || banco.cuenta || ''),
                  celdaValorBanco(banco.banco || ''),
                  celdaValorBanco(banco.tipoCuenta || banco.tipo || ''),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 220 }, children: [] }),

          p(
            `En constancia de lo anterior, se suscribe el presente FINIQUITO PARCIAL en la Ciudad de ${ciudad} a los ${firma.dia} días del mes de ${firma.mes} del año ${firma.anio}.`,
            { after: 200 }
          ),

          ...firmasCliente,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safe = String(asegurado || siniestro || 'caso')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 50);
  const nombre = `Finiquito_Arrendamiento_Inhabitabilidad_Alfa_${safe}.docx`;
  saveAs(blob, nombre);
  return { blob, nombre };
}
