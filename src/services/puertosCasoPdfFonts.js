import { PDF_FONT } from './puertosCasoExportacionPdfHelpers';

/** Fuentes empaquetadas en public/fonts (mismo origen — compatible con CSP). */
const FONT_BASE = `${import.meta.env.BASE_URL || '/'}fonts/`;
const FONT_URLS = {
  regular: `${FONT_BASE}RobotoCondensed-Regular.ttf`,
  bold: `${FONT_BASE}RobotoCondensed-Bold.ttf`,
};

let fuentesBase64 = null;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function validarTtf(buffer, etiqueta) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10000) {
    throw new Error(`Fuente ${etiqueta} inválida o corrupta (${bytes.length} bytes)`);
  }
  const esTtf = bytes[0] === 0 && bytes[1] === 1;
  const esOtf = bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f;
  if (!esTtf && !esOtf) {
    throw new Error(`Fuente ${etiqueta} no es un archivo TTF/OTF válido`);
  }
}

async function cargarFuentesBase64() {
  if (fuentesBase64) return fuentesBase64;

  const [regularBuf, boldBuf] = await Promise.all(
    [FONT_URLS.regular, FONT_URLS.bold].map(async (url, i) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`No se pudo cargar la fuente local: ${url}`);
      }
      const buf = await res.arrayBuffer();
      validarTtf(buf, i === 0 ? 'Regular' : 'Bold');
      return buf;
    })
  );

  fuentesBase64 = {
    regular: arrayBufferToBase64(regularBuf),
    bold: arrayBufferToBase64(boldBuf),
  };
  return fuentesBase64;
}

/** Registra Roboto Condensed en una instancia jsPDF. */
export async function registrarFuentesPdf(doc) {
  const { regular, bold } = await cargarFuentesBase64();
  doc.addFileToVFS('RobotoCondensed-Regular.ttf', regular);
  doc.addFileToVFS('RobotoCondensed-Bold.ttf', bold);
  doc.addFont('RobotoCondensed-Regular.ttf', PDF_FONT.family, 'normal');
  doc.addFont('RobotoCondensed-Bold.ttf', PDF_FONT.familyBold, 'normal');
  doc.setFont(PDF_FONT.family, 'normal');
}

/** Nombre de familia jsPDF según peso. */
export function familiaPdf(estilo = 'normal') {
  return estilo === 'bold' ? PDF_FONT.familyBold : PDF_FONT.family;
}
