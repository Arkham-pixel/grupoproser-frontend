import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  buildCartaCoberturaPreview,
  calcularLiquidacionFdm,
} from './liquidadorEquidadFdmHelpers.js';

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/carta-cobertura-primera-perdida-fdm.docx`;

function escapeXml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function withXmlSpace(attrs, text) {
  const needs =
    text.startsWith(' ') || text.endsWith(' ') || text.includes('  ') || text.includes('\n');
  if (!needs || /xml:space=/.test(attrs)) return attrs;
  return `${attrs} xml:space="preserve"`;
}

function findNextWtOpen(xml, fromIdx) {
  const re = /<w:t(?=[\s>])/g;
  re.lastIndex = fromIdx;
  const m = re.exec(xml);
  return m ? m.index : -1;
}

function readWt(xml, tStart) {
  const openEnd = xml.indexOf('>', tStart);
  if (openEnd < 0) throw new Error('w:t sin cierre de etiqueta');
  const tEnd = xml.indexOf('</w:t>', openEnd);
  if (tEnd < 0) throw new Error('w:t sin </w:t>');
  const attrs = xml.slice(tStart + 4, openEnd);
  return { openEnd, tEnd, attrs, content: xml.slice(openEnd + 1, tEnd) };
}

function findLastTagOpen(xml, tagName, beforeIdx) {
  const re = new RegExp(`<w:${tagName}(?=[\\s>])`, 'g');
  let last = -1;
  let m;
  const slice = xml.slice(0, beforeIdx);
  while ((m = re.exec(slice)) !== null) last = m.index;
  return last;
}

function replaceWtAt(xml, tStart, newText) {
  const { tEnd, attrs } = readWt(xml, tStart);
  const safe = escapeXml(newText);
  return (
    xml.slice(0, tStart) +
    `<w:t${withXmlSpace(attrs, String(newText ?? ''))}>${safe}</w:t>` +
    xml.slice(tEnd + 6)
  );
}

function replaceValueAfterLabel(xml, label, newValue) {
  const idx = xml.indexOf(label);
  if (idx < 0) {
    throw new Error(`Etiqueta no encontrada en plantilla: ${label}`);
  }
  const tStart = findNextWtOpen(xml, idx + label.length);
  if (tStart < 0) {
    throw new Error(`Sin valor después de: ${label}`);
  }
  return replaceWtAt(xml, tStart, newValue);
}

function replaceWtContaining(xml, marker, newText) {
  const idx = xml.indexOf(marker);
  if (idx < 0) {
    throw new Error(`No se encontró el marcador en la plantilla: ${marker}`);
  }
  const tStart = findLastTagOpen(xml, 't', idx + 1);
  if (tStart < 0) {
    throw new Error(`Sin nodo de texto para: ${marker}`);
  }
  return replaceWtAt(xml, tStart, newText);
}

function formatearCedula(cedula) {
  const digits = String(cedula || '').replace(/\D/g, '');
  if (!digits) return cedula || '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function assertWellFormedXml(xml) {
  const openT = (xml.match(/<w:t(?=[\s>])/g) || []).length;
  const closeT = (xml.match(/<\/w:t>/g) || []).length;
  if (openT !== closeT) {
    throw new Error(`XML inválido: w:t desbalanceados (${openT} vs ${closeT})`);
  }
}

export async function generarCartaCoberturaFdmBlob(liquidador, totalesParam) {
  const totales = totalesParam || calcularLiquidacionFdm(liquidador);
  const c = buildCartaCoberturaPreview(liquidador, totales);
  const cedulaFmt = formatearCedula(c.cedula);
  const asegurado = c.asegurado && c.asegurado !== '—' ? c.asegurado : '';
  const poliza = c.poliza && c.poliza !== '—' ? c.poliza : '';

  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error(`No se pudo cargar la plantilla Word (${res.status})`);
  }
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml').async('string');

  xml = replaceValueAfterLabel(xml, 'Fecha:', ` ${c.ciudadCarta}, ${c.fechaCarta}`);
  xml = replaceWtContaining(
    xml,
    'a causa del terremoto ocurrido el día',
    ` a causa ${c.causaEvento} ocurrido el día ${c.fechaEventoCarta}`
  );
  xml = replaceValueAfterLabel(xml, 'Asegurado / Beneficiario:', ` ${asegurado}`);
  xml = replaceValueAfterLabel(xml, 'Cédula de ciudadanía:', ` ${cedulaFmt}`);
  xml = replaceValueAfterLabel(xml, 'Número de póliza:', ` ${poliza}`);
  xml = replaceWtContaining(xml, '[Valor en números]', `$ ${c.indemnizacion}`);
  xml = replaceWtContaining(
    xml,
    '[Valor en letras]',
    `${c.indemnizacionLetrasCarta} pesos M/CTE`
  );

  assertWellFormedXml(xml);

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  const safe = String(c.asegurado || 'asegurado')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 60);

  return {
    blob,
    nombre: `Carta_Cobertura_Primera_Perdida_FDM_${safe}.docx`,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

export async function descargarCartaCoberturaFdmWord(liquidador, totales) {
  const { blob, nombre } = await generarCartaCoberturaFdmBlob(liquidador, totales);
  saveAs(blob, nombre);
}
