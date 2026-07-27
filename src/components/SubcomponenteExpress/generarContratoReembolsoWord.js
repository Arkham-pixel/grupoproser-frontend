import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  assertWellFormedXml,
  replaceOoxmlTextBetween,
  replaceYellowRunsInOrder,
  escapeXml,
  withXmlSpace,
} from './contratoExpressWordUtils.js';
import {
  buildContratoReembolsoDescripcion,
  buildContratoReembolsoReplacements,
  calcularLiquidacion,
  formatearMonto,
} from './liquidadorExpressHelpers.js';
import { nombreArchivoSeguro } from './liquidadorExpressWordShared.js';

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/CONTRATO_REEMBOLSO.docx`;

/** Texto fijo de la plantilla que delimita la descripción del siniestro (ANTECEDENTE - PRIMERO). */
const DESCRIPCION_INICIO_PLANTILLA = 'El día 22 de diciembre de 2019';
const DESCRIPCION_FIN_PLANTILLA = 'Por lo anterior, EL ASEGURADO';

/**
 * Respaldo: reemplaza «xxx» tras «por valor de» si aún quedara en la plantilla.
 */
function replaceDeduciblePlaceholder(xml, deducibleTxt) {
  const label = 'por valor de ';
  const labelIdx = xml.indexOf(label);
  if (labelIdx < 0) return xml;

  const wtRe = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let match;
  while ((match = wtRe.exec(xml)) !== null) {
    if (match.index <= labelIdx) continue;
    if (match[2].trim() !== 'xxx') break;
    const safe = escapeXml(deducibleTxt);
    const replacement = `<w:t${withXmlSpace(match[1], deducibleTxt)}>${safe}</w:t>`;
    return xml.slice(0, match.index) + replacement + xml.slice(match.index + match[0].length);
  }
  return xml;
}

export async function generarContratoReembolsoBlob(liquidador, totalesParam) {
  const totales = totalesParam || calcularLiquidacion(liquidador);
  const replacements = buildContratoReembolsoReplacements(liquidador, totales);
  const descripcion = buildContratoReembolsoDescripcion(liquidador);
  const deducibleTxt =
    (totales?.deducibleAplicado ?? 0) > 0
      ? `$${formatearMonto(totales.deducibleAplicado)}`
      : formatearMonto(totales?.deducibleAplicado ?? 0);
  const enc = liquidador.encabezado || {};

  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error(`No se pudo cargar la plantilla del contrato (${res.status})`);
  }

  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml').async('string');

  xml = replaceOoxmlTextBetween(
    xml,
    DESCRIPCION_INICIO_PLANTILLA,
    DESCRIPCION_FIN_PLANTILLA,
    descripcion
  );
  xml = replaceYellowRunsInOrder(xml, replacements);
  xml = replaceDeduciblePlaceholder(xml, deducibleTxt);
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
    nombre: `Contrato_Reembolso_${reclamoSafe}.docx`,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

export async function descargarContratoReembolsoWord(liquidador, totales) {
  const { blob, nombre } = await generarContratoReembolsoBlob(liquidador, totales);
  saveAs(blob, nombre);
}
