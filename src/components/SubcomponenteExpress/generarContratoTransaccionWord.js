import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  assertWellFormedXml,
  replaceOoxmlLiteral,
  replaceWtExactTexts,
  replaceYellowRunsInOrder,
} from './contratoExpressWordUtils.js';
import {
  buildContratoTransaccionReplacements,
  buildContratoTransaccionTextReplacements,
  calcularLiquidacion,
} from './liquidadorExpressHelpers.js';
import { nombreArchivoSeguro } from './liquidadorExpressWordShared.js';

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/CONTRATO_TRANSACCION.docx`;

export async function generarContratoTransaccionBlob(liquidador, totalesParam) {
  const totales = totalesParam || calcularLiquidacion(liquidador);
  const replacements = buildContratoTransaccionReplacements(liquidador, totales);
  const textReplacements = buildContratoTransaccionTextReplacements(liquidador);
  const enc = liquidador.encabezado || {};

  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error(`No se pudo cargar la plantilla del contrato de transacción (${res.status})`);
  }

  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml').async('string');

  xml = replaceYellowRunsInOrder(xml, replacements);
  // Literales que pueden estar partidos en varios <w:t> (p. ej. DIEGO = «D»+«IEGO…»)
  for (const [search, replacement] of textReplacements) {
    xml = replaceOoxmlLiteral(xml, search, replacement);
  }
  xml = replaceWtExactTexts(xml, textReplacements);
  assertWellFormedXml(xml);

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  const reclamoSafe = nombreArchivoSeguro(enc.reclamo, 'reclamo');
  return {
    blob,
    nombre: `Contrato_Transaccion_${reclamoSafe}.docx`,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

export async function descargarContratoTransaccionWord(liquidador, totales) {
  const { blob, nombre } = await generarContratoTransaccionBlob(liquidador, totales);
  saveAs(blob, nombre);
}
