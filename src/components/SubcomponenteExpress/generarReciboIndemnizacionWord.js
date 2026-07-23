import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { buildReciboPreview, textoDescripcionSiniestroRecibo } from './liquidadorExpressHelpers.js';
import { buildZurichSection } from './liquidadorExpressWordShared.js';

const FONT = 'Tahoma';
const SIZE_BODY = 20; // 10pt
const SIZE_HEADER = 22; // 11pt

const run = (text, { bold = false, size = SIZE_BODY, highlight } = {}) =>
  new TextRun({
    text: text || '',
    bold,
    font: FONT,
    size,
    ...(highlight ? { highlight } : {}),
  });

const parrafo = (children, { align = AlignmentType.BOTH, spacingAfter = 120, spacingBefore = 0 } = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [children],
    alignment: align,
    spacing: { after: spacingAfter, before: spacingBefore },
  });

const parrafoTexto = (texto, opts = {}) =>
  parrafo([run(texto, { size: opts.size || SIZE_BODY, bold: opts.bold })], opts);

/** Campo con etiqueta en negrita y valor (formato plantilla R_indemnizacion.dotx). */
const parrafoCampo = (etiqueta, valor) =>
  parrafo([run(`${etiqueta}: `, { bold: true }), run(valor || '—')]);

/**
 * Genera el blob del Recibo de Indemnización (sin descargar).
 */
export async function generarReciboIndemnizacionBlob(liquidador, totales) {
  const recibo = buildReciboPreview(liquidador, totales);
  const { texto: descStro, esGenerico } = textoDescripcionSiniestroRecibo(liquidador);

  const parrafoPrincipal = parrafo(
    [
      run('Declaramos que hemos recibido de Zúrich Colombia Seguros S.A. la suma de '),
      run(recibo.valorLetras, { bold: true }),
      run(' MCE '),
      run(`($${recibo.valor})`, { bold: true }),
      run(', como indemnización única, total y definitiva con ocasión de '),
      run(descStro, esGenerico ? { highlight: 'yellow' } : {}),
      run('.'),
    ],
    { spacingAfter: 160 }
  );

  const cuerpo = [
    parrafo([run('Recibo de Indemnización', { bold: true, size: SIZE_HEADER })], {
      align: AlignmentType.CENTER,
      spacingAfter: 160,
    }),
    parrafo([run(`Reclamo [${recibo.reclamo}]`, { bold: true, size: SIZE_HEADER })], {
      align: AlignmentType.CENTER,
      spacingAfter: 200,
    }),
    parrafoCampo('Asegurado', recibo.asegurado),
    parrafoCampo('Nit', recibo.nit),
    parrafoCampo('Póliza', recibo.poliza),
    parrafoCampo('Fecha de siniestro', recibo.fecha),
    parrafoTexto('', { spacingAfter: 80 }),
    parrafoPrincipal,
    parrafoTexto(
      'Bajo la gravedad de juramento manifestamos que estamos de acuerdo con el pago total, único y definitivo pactado ya que, con esta, quedan resarcidos integralmente todos los eventuales perjuicios que pudimos haber sufrido amparado por la póliza antes mencionada y que no existe persona con igual o mejor derecho que puedan afectar en nuestro nombre esta reclamación.'
    ),
    parrafoTexto(
      'Así mismo, declaramos que no hemos celebrado otro contrato de seguro de igual naturaleza y que no existe otra persona natural o jurídica que tenga interés asegurable sobre los bienes motivos de la reclamación, en consecuencia, declaro a la compañía Zúrich Colombia Seguros S.A. a paz y salvo, libre de cualquier ulterior reclamación que pudiere derivarse de dicha pérdida.'
    ),
    parrafoTexto(
      'En virtud de habernos sido liquidada la pérdida sufrida, traspasamos a Zúrich Colombia todos los derechos que tengamos o pudiéramos tener a consecuencia de los daños y pérdidas arriba mencionadas, quedando la citada compañía subrogada en nuestro lugar respecto de cualquier persona natural o jurídica y en todo lo que se relacione con la reclamación aquí documentada.'
    ),
    parrafoTexto(
      `En señal de aceptación de lo antes expuesto suscribimos el presente documento en la ciudad de ____________, el ____ de ______________ de ${recibo.anio}.`
    ),
    parrafoTexto('', { spacingAfter: 200 }),
    parrafoTexto('', { spacingAfter: 200 }),
    parrafoTexto('Representante Legal'),
    parrafoTexto(recibo.asegurado),
    parrafoTexto('Nombre:'),
    parrafoTexto('Documento: '),
  ];

  const doc = new Document({
    sections: [await buildZurichSection(cuerpo)],
  });

  const blob = await Packer.toBlob(doc);
  const reclamoSafe = String(recibo.reclamo || 'reclamo').replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    blob,
    nombre: `Recibo_Indemnizacion_${reclamoSafe}.docx`,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

/**
 * Genera y descarga el Recibo de Indemnización (equivalente R_indemnizacion.dotx + macro VBA).
 */
export async function descargarReciboIndemnizacionWord(liquidador, totales) {
  const { blob, nombre } = await generarReciboIndemnizacionBlob(liquidador, totales);
  saveAs(blob, nombre);
}

