import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { buildConstanciaPreview, calcularLiquidacionFdm } from './liquidadorEquidadFdmHelpers.js';

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/constancia-fdm.docx`;

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

/** Solo <w:t> / <w:t ...>, nunca <w:tc>, <w:tr>, etc. */
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

/** Última coincidencia de etiqueta OOXML exacta antes de beforeIdx (evita <w:pPr>, <w:rPr>, <w:tc>…). */
function findLastTagOpen(xml, tagName, beforeIdx) {
  const re = new RegExp(`<w:${tagName}(?=[\\s>])`, 'g');
  let last = -1;
  let m;
  const slice = xml.slice(0, beforeIdx);
  while ((m = re.exec(slice)) !== null) last = m.index;
  return last;
}

/** Inicio real de <w:p> (no <w:pPr>, <w:pgSz>, etc.). */
function findParagraphStart(xml, beforeIdx) {
  return findLastTagOpen(xml, 'p', beforeIdx);
}

/**
 * Reemplaza el texto de un <w:p> que contiene `marker`.
 * Deja un solo run con el texto nuevo y elimina los demás <w:r> que solo tenían texto
 * (evita <w:t> vacíos y proofErr huérfanos que Word rechaza).
 */
function replaceParagraphContaining(xml, marker, newText) {
  const idx = xml.indexOf(marker);
  if (idx < 0) {
    throw new Error(`No se encontró el marcador en la plantilla: ${marker}`);
  }
  const pStart = findParagraphStart(xml, idx);
  const pEnd = xml.indexOf('</w:p>', idx);
  if (pStart < 0 || pEnd < 0) {
    throw new Error(`No se pudo ubicar el párrafo de: ${marker}`);
  }
  const before = xml.slice(0, pStart);
  const para = xml.slice(pStart, pEnd + 6);
  const after = xml.slice(pEnd + 6);
  const safe = escapeXml(newText);

  const firstWt = findNextWtOpen(para, 0);
  if (firstWt < 0) {
    throw new Error(`El párrafo no tiene nodos <w:t>: ${marker}`);
  }
  const { attrs } = readWt(para, firstWt);
  const firstRunStart = findLastTagOpen(para, 'r', firstWt);
  // Conservar pPr + primer run con texto actualizado; quitar runs de texto siguientes
  const pPrEnd = para.indexOf('</w:pPr>');
  const head =
    pPrEnd >= 0 && (firstRunStart < 0 || pPrEnd < firstRunStart)
      ? para.slice(0, pPrEnd + 8)
      : para.slice(0, firstRunStart >= 0 ? firstRunStart : firstWt);

  let runBlock;
  if (firstRunStart >= 0 && firstRunStart < firstWt) {
    const rPrStart = para.indexOf('<w:rPr', firstRunStart);
    const rPrEnd = para.indexOf('</w:rPr>', firstRunStart);
    const rPr =
      rPrStart > firstRunStart && rPrEnd > rPrStart && rPrEnd < firstWt
        ? para.slice(rPrStart, rPrEnd + 8)
        : '';
    runBlock = `<w:r>${rPr}<w:t${withXmlSpace(attrs, newText)}>${safe}</w:t></w:r>`;
  } else {
    runBlock = `<w:r><w:t${withXmlSpace(attrs, newText)}>${safe}</w:t></w:r>`;
  }

  const newPara = `${head}${runBlock}</w:p>`;
  return before + newPara + after;
}

/** Reemplaza el primer <w:t> real después de una etiqueta (celda valor). */
function replaceValueAfterLabel(xml, label, newValue) {
  const idx = xml.indexOf(label);
  if (idx < 0) {
    throw new Error(`Etiqueta no encontrada en plantilla: ${label}`);
  }
  const tStart = findNextWtOpen(xml, idx + label.length);
  if (tStart < 0) {
    throw new Error(`Sin valor después de: ${label}`);
  }
  const { tEnd, attrs } = readWt(xml, tStart);
  const safe = escapeXml(newValue);
  return (
    xml.slice(0, tStart) +
    `<w:t${withXmlSpace(attrs, String(newValue ?? ''))}>${safe}</w:t>` +
    xml.slice(tEnd + 6)
  );
}

function letrasConstancia(letras) {
  return String(letras || '')
    .replace(/\s*Pesos M\/Cte\.?/i, ' PESOS M/CTE.')
    .trim();
}

function formatearCedula(cedula) {
  const digits = String(cedula || '').replace(/\D/g, '');
  if (!digits) return cedula || '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function assertWellFormedXml(xml) {
  // Solo valida que no haya w:t/w:r rotos de forma obvia tras el replace de valores.
  const openT = (xml.match(/<w:t(?=[\s>])/g) || []).length;
  const closeT = (xml.match(/<\/w:t>/g) || []).length;
  if (openT !== closeT) {
    throw new Error(`XML inválido: w:t desbalanceados (${openT} vs ${closeT})`);
  }
}

/**
 * Rellena la plantilla oficial Word (Arial Nova 9, tabla) con los datos del liquidador.
 */
export async function generarConstanciaFdmBlob(liquidador, totalesParam) {
  const totales = totalesParam || calcularLiquidacionFdm(liquidador);
  const c = buildConstanciaPreview(liquidador, totales);
  const letras = letrasConstancia(c.indemnizacionLetras);
  const cedulaFmt = formatearCedula(c.cedula);

  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error(`No se pudo cargar la plantilla Word (${res.status})`);
  }
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml').async('string');

  xml = replaceValueAfterLabel(xml, 'TOMADOR:', c.tomador);
  xml = replaceValueAfterLabel(xml, 'ASEGURADO Y BENEFICIARIO:', c.asegurado);
  xml = replaceValueAfterLabel(xml, 'RAMO:', c.ramo);
  xml = replaceValueAfterLabel(xml, 'POLIZA:', c.poliza);
  xml = replaceValueAfterLabel(xml, 'ORDEN:', String(c.orden ?? ''));
  xml = replaceValueAfterLabel(xml, 'SINIESTRO:', String(c.siniestro || '0'));
  xml = replaceValueAfterLabel(xml, 'AGENCIA:', c.agencia);

  xml = replaceParagraphContaining(
    xml,
    'como aparece al pie de mi firma',
    `${c.asegurado} identificado (a) como aparece al pie de mi firma, obrando en calidad de asegurado (a) beneficiario (a), y afectado (a) por el siniestro de la póliza citada, por medio del presente documento hago constar:`
  );

  xml = replaceParagraphContaining(
    xml,
    'PRIMERO. -',
    `PRIMERO. - Que he llegado con LA EQUIDAD SEGUROS GENERALES O.C., aseguradora de los riesgos de Básico Empresa Fundación de la Mujer, a un arreglo transaccional definitivo, con ocasión al evento ${c.evento} que afectó el bien asegurado, en la dirección: ${c.direccion}, en hechos ocurridos el ${c.fechaSiniestroLarga}.`
  );

  xml = replaceParagraphContaining(
    xml,
    'SEGUNDO. -',
    `SEGUNDO. - Que recibiré de LA EQUIDAD SEGUROS GENERALES O.C., la suma de: ($${c.indemnizacion})-(${letras}), valor en que estimo los perjuicios sufridos, dado que el total de la pérdida según valor ajustado por la aseguradora es por valor de ($${c.totalPerdida}) menos deducible de ${c.tasaTxt} ($${c.deducible}), para un total a indemnizar de: ($${c.indemnizacion}) + Subsidio ($${c.subsidio}) = ($${c.indemnizacion}).`
  );

  xml = replaceParagraphContaining(
    xml,
    'TERCERO. -',
    `TERCERO. - Que en consecuencia de lo anterior declaro a PAZ Y SALVO y libre de posteriores reclamos a LA EQUIDAD SEGUROS GENERALES O.C., por los hechos el ${c.fechaSiniestroLarga}.`
  );

  xml = replaceParagraphContaining(
    xml,
    'Para constancia de lo anterior se firma en',
    `Para constancia de lo anterior se firma en ${c.ciudadFirma} ${c.fechaImpresoLarga}.`
  );

  xml = replaceValueAfterLabel(xml, 'Asegurado (a)', c.asegurado);
  xml = replaceValueAfterLabel(xml, 'Cedula de Ciudadanía No', cedulaFmt);

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
    nombre: `Constancia_Indemnizacion_FDM_${safe}.docx`,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

export async function descargarConstanciaFdmWord(liquidador, totales) {
  const { blob, nombre } = await generarConstanciaFdmBlob(liquidador, totales);
  saveAs(blob, nombre);
}
