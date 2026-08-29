import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
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
import { montoALetras } from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
import {
  AZUL_ZURICH_FOOTER,
  FONT,
  FONT_FOOTER,
  MARGENES_ZURICH,
  buildZurichHeader,
  loadZurichLogo,
} from '../SubcomponenteExpress/liquidadorExpressWordShared.js';
import { nombreTipoOtroAmparo } from '../liquidacion/otrosAmparosLiquidacion.js';
import {
  calcularLiquidacionZurich,
  formatearMonto,
  formatDateLarga,
  parsearNumero,
} from './liquidadorZurichHelpers.js';

const SIZE_BODY = 20;
const SIZE_TITLE = 28;
const W_TABLA = 9360;
const W_DESC = 6200;
const W_VALOR = 3160;

const thin = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: thin, bottom: thin, left: thin, right: thin };

const run = (text, { bold = false, size = SIZE_BODY, italics = false, color } = {}) =>
  new TextRun({
    text: String(text ?? ''),
    bold,
    italics,
    font: FONT,
    size,
    ...(color ? { color } : {}),
  });

const parrafo = (children, { align = AlignmentType.BOTH, after = 120, before = 0 } = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: align,
    spacing: { after, before },
  });

const parrafoTexto = (texto, opts = {}) =>
  parrafo([run(texto, { size: opts.size || SIZE_BODY, bold: opts.bold })], opts);

const parrafoCampo = (etiqueta, valor) =>
  parrafo([run(`${etiqueta}: `, { bold: true }), run(valor || '—')]);

function letrasRecibo(monto) {
  const raw = String(montoALetras(monto) || '').trim();
  if (!raw) return 'cero';
  const lower = raw.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function esSismo(enc = {}) {
  const blob = `${enc.causa || ''} ${enc.cobertura || ''} ${enc.evento || ''}`.toLowerCase();
  return /sismo|sism|terremoto|earthquake/.test(blob);
}

function montoCelda(valor, { siempre = false } = {}) {
  if (valor === '' || valor == null) return siempre ? '$0' : '';
  const n = parsearNumero(valor);
  if (!n && !siempre) return '';
  return `$${formatearMonto(n)}`;
}

function celda(texto, { bold = false, align = AlignmentType.LEFT, width = W_DESC } = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { after: 40, before: 40 },
        children: [run(texto, { bold, size: 18 })],
      }),
    ],
  });
}

function filaTabla(descripcion, valor, { bold = false } = {}) {
  return new TableRow({
    children: [
      celda(descripcion, { bold, width: W_DESC }),
      celda(valor, { bold, align: AlignmentType.RIGHT, width: W_VALOR }),
    ],
  });
}

function buildFooterRecibo() {
  const pie = (text) =>
    new TextRun({
      text,
      font: FONT_FOOTER,
      size: 20,
      color: AZUL_ZURICH_FOOTER,
    });
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [pie('Zurich Colombia Seguros S.A.   |   NIT 860.002.534-0')],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [pie('Calle 116 # 7-15 Of. 1201  |  T. +57 1 5188482 / 3190730')],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [pie('Bogotá, Colombia')],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40 },
        children: [
          new TextRun({
            text: 'Confidential \\ Personal Data',
            font: FONT_FOOTER,
            size: 18,
            italics: true,
            color: AZUL_ZURICH_FOOTER,
          }),
        ],
      }),
    ],
  });
}

async function seccionZurich(children) {
  const logoBuffer = await loadZurichLogo();
  return {
    properties: { page: { margin: MARGENES_ZURICH } },
    headers: { default: buildZurichHeader(logoBuffer) },
    footers: { default: buildFooterRecibo() },
    children,
  };
}

function filasDescripcion(totales = {}) {
  const edificio = parsearNumero(totales.totalPresupuesto);
  const contenidos = parsearNumero(totales.totalContenidos);
  const hospedaje = parsearNumero(totales.diagrama?.gastosHospedaje);
  const otros = Array.isArray(totales.otrosAmparos) ? totales.otrosAmparos : [];

  const electrico = otros.find((f) =>
    /el[eé]ctric/i.test(`${f.nombre || ''} ${nombreTipoOtroAmparo(f.tipo, f.nombre)}`)
  );
  const resto = otros.filter((f) => f !== electrico);
  const extra = resto.map((f) => ({
    label: nombreTipoOtroAmparo(f.tipo, f.nombre) || 'Otro ítem',
    valor: parsearNumero(f.valor),
  }));

  const otrosItem = [extra[0], extra[1]];
  const coberturas = [];
  if (hospedaje > 0) coberturas.push({ label: 'Gastos de hospedaje', valor: hospedaje });
  extra.slice(2).forEach((it) => coberturas.push(it));
  while (coberturas.length < 2) coberturas.push(null);

  const lineasValor = [
    edificio,
    contenidos,
    electrico ? parsearNumero(electrico.valor) : 0,
    otrosItem[0]?.valor || 0,
    otrosItem[1]?.valor || 0,
    coberturas[0]?.valor || 0,
    coberturas[1]?.valor || 0,
  ];
  const totalBruto = Math.round(lineasValor.reduce((s, n) => s + (Number(n) || 0), 0) * 100) / 100;

  return {
    totalBruto,
    filas: [
      filaTabla('Descripción', 'Valor', { bold: true }),
      filaTabla('Daños en edificio', montoCelda(edificio, { siempre: true })),
      filaTabla('Contenidos', montoCelda(contenidos)),
      filaTabla(
        'Equipo eléctrico y electrónico',
        electrico ? montoCelda(electrico.valor) : ''
      ),
      filaTabla(otrosItem[0] ? `Otro ítem: ${otrosItem[0].label}` : 'Otro ítem:', montoCelda(otrosItem[0]?.valor)),
      filaTabla(otrosItem[1] ? `Otro ítem: ${otrosItem[1].label}` : 'Otro ítem:', montoCelda(otrosItem[1]?.valor)),
      filaTabla(
        coberturas[0] ? `Cobertura adicional: ${coberturas[0].label}` : 'Cobertura adicional:',
        montoCelda(coberturas[0]?.valor)
      ),
      filaTabla(
        coberturas[1] ? `Cobertura adicional: ${coberturas[1].label}` : 'Cobertura adicional:',
        montoCelda(coberturas[1]?.valor)
      ),
      filaTabla('Total', montoCelda(totalBruto, { siempre: true }), { bold: true }),
      filaTabla(
        'Deducible:',
        montoCelda(totales.deducibleAplicado || totales.diagrama?.sumaDeducibles, { siempre: true })
      ),
      filaTabla('Total indemnización', montoCelda(totales.totalIndemnizar, { siempre: true }), { bold: true }),
    ],
  };
}

/**
 * Recibo de indemnización total Zurich (plantilla oficial de 2 páginas).
 */
export async function generarReciboIndemnizacionZurichBlob(liquidador = {}, totalesInput) {
  const enc = liquidador.encabezado || {};
  const totales = totalesInput || calcularLiquidacionZurich(liquidador);
  const sismo = esSismo(enc);
  const fechaSiniestro = formatDateLarga(enc.fechaSiniestro);
  const fechaDoc = formatDateLarga(new Date());
  const ciudad = String(enc.ciudad || '').trim() || '____________';
  const asegurado = enc.asegurado || '—';
  const nit = enc.identificacion || enc.nit || '—';
  const poliza = enc.poliza || '—';
  const monto = Math.round(parsearNumero(totales.totalIndemnizar) || 0);
  const letras = letrasRecibo(monto);
  const { filas } = filasDescripcion(totales);

  const ocasion = sismo
    ? `los daños ocasionados al inmueble asegurado como consecuencia del evento sísmico ocurrido el ${fechaSiniestro}`
    : `los daños ocasionados al inmueble asegurado como consecuencia del evento ${enc.causa || enc.cobertura || enc.evento || 'reportado'} ocurrido el ${fechaSiniestro}`;

  const ref = sismo
    ? `Reclamo por Pérdida de Daños Materiales por sismo ocurrido el ${fechaSiniestro}`
    : `Reclamo por Pérdida de Daños Materiales por ${enc.causa || enc.cobertura || 'siniestro'} ocurrido el ${fechaSiniestro}`;

  const pagina1 = [
    parrafo([run('Recibo de Indemnización', { bold: true, size: SIZE_TITLE })], {
      align: AlignmentType.CENTER,
      after: 240,
      before: 80,
    }),
    parrafoCampo('Asegurado', asegurado),
    parrafoCampo('Nit / Cédula', nit),
    parrafoCampo('Póliza', poliza),
    parrafoCampo('Fecha', fechaDoc),
    parrafoTexto('', { after: 40 }),
    parrafo([run('REF: ', { bold: true }), run(ref)], { after: 200 }),
    parrafo(
      [
        run('Declaramos que hemos recibido de Zúrich Colombia Seguros S.A. la suma de '),
        run(`${letras} pesos`, { bold: true }),
        run(
          ` como indemnización única, total y definitiva con ocasión de la reclamación presentada por ${ocasion}. De igual forma, me permito manifestar que el valor acá aceptado se compone de la siguiente descripción:`
        ),
      ],
      { after: 200 }
    ),
    new Table({
      width: { size: W_TABLA, type: WidthType.DXA },
      columnWidths: [W_DESC, W_VALOR],
      rows: filas,
    }),
  ];

  const pagina2 = [
    parrafoTexto(
      'Bajo la gravedad de juramento manifestamos de manera libre y voluntaria que estamos de acuerdo con el pago total, único y definitivo pactado ya que, con esta, quedan resarcidos integralmente todos los eventuales perjuicios que pudimos haber sufrido amparados por la póliza antes mencionada y que no existe persona con igual o mejor derecho que puedan afectar en nuestro nombre esta reclamación.',
      { after: 200, before: 80 }
    ),
    parrafoTexto(
      'Así mismo, declaramos que no hemos celebrado otro contrato de seguro de igual naturaleza y que no existe otra persona natural o jurídica que tenga interés asegurable sobre los bienes motivos de la reclamación, en consecuencia, declaro a la compañía Zúrich Colombia Seguros S.A. a paz y salvo, libre de cualquier ulterior reclamación que pudiere derivarse de dicha pérdida.',
      { after: 200 }
    ),
    parrafoTexto(
      'En virtud de habernos sido liquidada la pérdida sufrida, traspasamos a Zúrich Colombia todos los derechos que tengamos o pudiéramos tener a consecuencia de los daños y pérdidas aquí indemnizados quedando la citada compañía subrogada en nuestro lugar respecto de cualquier persona natural o jurídica y en todo lo que se relacione con la reclamación aquí documentada.',
      { after: 200 }
    ),
    parrafoTexto(
      `En señal de aceptación de lo antes expuesto suscribimos el presente documento en la ciudad de ${ciudad} el ${fechaDoc}.`,
      { after: 360 }
    ),
    parrafoTexto('Asegurado / Representante Legal', { after: 200 }),
    parrafo([run('Nombre: ', { bold: true }), run(asegurado)], {
      align: AlignmentType.LEFT,
      after: 80,
    }),
    parrafo([run('Documento: ', { bold: true }), run(nit)], {
      align: AlignmentType.LEFT,
      after: 80,
    }),
  ];

  const doc = new Document({
    sections: [await seccionZurich(pagina1), await seccionZurich(pagina2)],
  });

  const blob = await Packer.toBlob(doc);
  const safe = String(asegurado || enc.siniestro || 'caso')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 50);
  return {
    blob,
    filename: `Recibo_Indemnizacion_Zurich_${safe}.docx`,
    nombre: `Recibo_Indemnizacion_Zurich_${safe}.docx`,
  };
}

export async function descargarReciboIndemnizacionZurichWord(liquidador, totales) {
  const { blob, filename } = await generarReciboIndemnizacionZurichBlob(liquidador, totales);
  saveAs(blob, filename);
  return { blob, filename };
}
