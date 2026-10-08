/**
 * Sustituye placeholders del acuerdo de confidencialidad (X, [Diligenciar], etc.)
 * con los datos del colaborador.
 */

function safe(valor, fallback = '________________') {
  const s = String(valor ?? '').trim();
  return s || fallback;
}

/**
 * @param {string} contenido texto plano o HTML
 * @param {{
 *   nombre?: string,
 *   cedula?: string,
 *   correo?: string,
 *   celular?: string,
 *   direccion?: string,
 *   ciudad?: string,
 *   fecha?: Date,
 * }} datos
 */
export function rellenarAcuerdoConfidencialidad(contenido, datos = {}) {
  const nombre = safe(datos.nombre);
  const cedula = safe(datos.cedula);
  const correo = safe(datos.correo);
  const celular = safe(datos.celular);
  const direccion = safe(datos.direccion);
  const ciudad = safe(datos.ciudad);
  const fecha = datos.fecha instanceof Date ? datos.fecha : new Date();
  const dia = String(fecha.getDate());

  let out = String(contenido || '');

  out = out.replace(/\[NOMBRE COMPLETO DE LA PERSONA NATURAL\]/gi, nombre);
  out = out.replace(/\[NOMBRE DEL CONTRATISTA\]/gi, nombre);
  out = out.replace(/\[CEDULA\]/gi, cedula);
  out = out.replace(/C\.C\.\s*No\.\s*\[CEDULA\]/gi, `C.C. No. ${cedula}`);
  out = out.replace(/C\.C\.\s*No\.\s*X{5,}/gi, `C.C. No. ${cedula}`);
  out = out.replace(/\[X{5,}\]/g, nombre);
  // Línea de firma del contratista (solo X sueltas, no parte de otras palabras)
  out = out.replace(/(^|[\s>])X{8,}(?=[\s<\n]|$)/gm, `$1${nombre}`);

  out = out.replace(/Direcci[oó]n:\s*\[Diligenciar\]/gi, `Dirección: ${direccion}`);
  out = out.replace(/Ciudad:\s*\[Diligenciar\]/gi, `Ciudad: ${ciudad}`);
  out = out.replace(/Atte\.:\s*\[Diligenciar\]/gi, `Atte.: ${nombre}`);
  out = out.replace(/Tel:\s*\[Diligenciar\]/gi, `Tel: ${celular}`);
  out = out.replace(/E-?mail:\s*\[Diligenciar\]/gi, `E-mail: ${correo}`);
  out = out.replace(/a los \[Diligenciar\] d[ií]as/gi, `a los ${dia} días`);
  out = out.replace(/domicilio en \[diligenciar\]/gi, `domicilio en ${direccion !== '________________' ? direccion : ciudad}`);
  out = out.replace(
    /c[eé]dula de ciudadan[ií]a No\.\s*\[diligenciar\]/gi,
    `cédula de ciudadanía No. ${cedula}`
  );

  out = out.replace(/\[Diligenciar\]/gi, '________________');
  out = out.replace(/\[diligenciar\]/gi, '________________');

  return out;
}

/**
 * Mejora la estructura visual del HTML del NDA (bloques de partes / notificaciones).
 */
export function estructurarHtmlAcuerdoConfidencialidad(html) {
  let out = String(html || '');

  // Separar visualmente el bloque de notificaciones de cada parte
  out = out.replace(
    /(PROSER AJUSTES SAS)(\s*)(Direcci[oó]n:)/i,
    '<div class="nda-parte"><strong class="nda-parte-titulo">$1</strong>$2$3'
  );
  out = out.replace(
    /(E-?mail:\s*[^<]+)(\s*)(<[^>]+>)?\s*(EL CONTRATISTA|Direcci[oó]n:)/i,
    '$1</div>$2$3<div class="nda-parte"><strong class="nda-parte-titulo">EL CONTRATISTA</strong>$4'
  );

  // Cierre aproximado antes del párrafo de modificación de direcciones
  out = out.replace(
    /(Cualquier modificaci[oó]n de las direcciones)/i,
    '</div><p class="nda-nota">$1'
  );

  return `<div class="nda-documento">${out}</div>`;
}

/**
 * Rellena placeholders dentro de un .docx (document.xml) y devuelve un Blob.
 */
export async function rellenarDocxAcuerdoConfidencialidad(arrayBuffer, datos) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Documento Word inválido');
  const xml = await docFile.async('string');
  const filled = rellenarAcuerdoConfidencialidad(xml, datos);
  zip.file('word/document.xml', filled);
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
