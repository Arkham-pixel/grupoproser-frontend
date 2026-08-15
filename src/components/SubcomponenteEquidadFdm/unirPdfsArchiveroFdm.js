import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { urlDescargaArchivoFdm } from '../../services/equidadFdmService.js';

/** Etiquetas que NUNCA entran al PDF unificado (liquidador / modelo Excel). */
export const ETIQUETAS_EXCLUIDAS_MERGE_PDF = new Set([
  'LIQUIDACION',
  'MODELO_LIQUIDACION',
]);

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
const WORD_EXTS = new Set(['.docx']);
const PDF_EXTS = new Set(['.pdf']);

const authFetchHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const extDeArchivo = (arch) => {
  const nombre = String(arch?.nombreOriginal || '').toLowerCase();
  const i = nombre.lastIndexOf('.');
  return i >= 0 ? nombre.slice(i) : '';
};

export const esExcluidoDelExpedienteFdm = (arch) => {
  const etiqueta = String(arch?.etiqueta || '').toUpperCase();
  if (ETIQUETAS_EXCLUIDAS_MERGE_PDF.has(etiqueta)) return true;
  const nombre = String(arch?.nombreOriginal || '');
  return /Liquidador_FDM/i.test(nombre) && /\.pdf$/i.test(nombre);
};

export const tipoConvertibleFdm = (arch) => {
  if (!arch || esExcluidoDelExpedienteFdm(arch)) return null;
  const mime = String(arch?.tipoMime || '').toLowerCase();
  const ext = extDeArchivo(arch);

  if (mime.includes('pdf') || PDF_EXTS.has(ext)) return 'pdf';
  if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) return 'image';
  if (
    mime.includes('wordprocessingml') ||
    mime.includes('msword') ||
    WORD_EXTS.has(ext) ||
    ext === '.doc'
  ) {
    if (ext === '.doc' && !mime.includes('wordprocessingml')) return 'word_legacy';
    return 'word';
  }
  return null;
};

/** Archivos que se pueden convertir/unir (PDF, imagen, Word). Excluye liquidador. */
export const archivosParaExpedienteFdm = (archivos = []) =>
  (archivos || []).filter((a) => {
    const tipo = tipoConvertibleFdm(a);
    return tipo === 'pdf' || tipo === 'image' || tipo === 'word';
  });

/** @deprecated usar archivosParaExpedienteFdm */
export const archivosPdfParaUnirFdm = archivosParaExpedienteFdm;

async function fetchArchivoBytes(arch) {
  const url = urlDescargaArchivoFdm(arch.ruta);
  if (!url) throw new Error(`Sin URL de descarga: ${arch.nombreOriginal}`);
  const res = await fetch(url, { headers: authFetchHeaders() });
  if (!res.ok) {
    throw new Error(`No se pudo leer ${arch.nombreOriginal} (${res.status})`);
  }
  return res.arrayBuffer();
}

async function appendPdfBytes(merged, pdfBytes) {
  const src = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = await merged.copyPages(src, src.getPageIndices());
  pages.forEach((p) => merged.addPage(p));
}

async function imageBytesToPdfBytes(imageBytes, mimeHint = '') {
  const pdf = await PDFDocument.create();
  const mime = String(mimeHint || '').toLowerCase();
  let image;
  const isJpg = mime.includes('jpeg') || mime.includes('jpg');
  const isPng = mime.includes('png');
  try {
    if (isJpg) image = await pdf.embedJpg(imageBytes);
    else if (isPng) image = await pdf.embedPng(imageBytes);
    else {
      try {
        image = await pdf.embedJpg(imageBytes);
      } catch {
        image = await pdf.embedPng(imageBytes);
      }
    }
  } catch {
    throw new Error('No se pudo convertir la imagen a PDF (use JPG o PNG).');
  }

  const pageW = 612; // Letter
  const pageH = 792;
  const page = pdf.addPage([pageW, pageH]);
  const margin = 36;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, {
    x: (pageW - w) / 2,
    y: (pageH - h) / 2,
    width: w,
    height: h,
  });
  return pdf.save();
}

/**
 * Convierte .docx → HTML (mammoth) → canvas (html2canvas) → PDF (jsPDF).
 */
async function docxBytesToPdfBytes(docxBytes, nombre = 'documento.docx') {
  const result = await mammoth.convertToHtml({ arrayBuffer: docxBytes });
  const html = result.value || '<p>(Documento vacío)</p>';

  const host = document.createElement('div');
  host.setAttribute('data-fdm-docx-convert', '1');
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:794px',
    'padding:40px',
    'background:#ffffff',
    'color:#111111',
    'font-family:Arial,Helvetica,sans-serif',
    'font-size:12pt',
    'line-height:1.45',
    'z-index:-1',
  ].join(';');
  host.innerHTML = `
    <div style="margin-bottom:12px;font-size:10pt;color:#666;">${String(nombre)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</div>
    <div class="fdm-docx-body">${html}</div>
  `;
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;
    const imgW = usableW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let remaining = imgH;
    let offsetY = 0;
    const sliceCanvas = document.createElement('canvas');
    const sliceCtx = sliceCanvas.getContext('2d');
    const pxPerPt = canvas.width / imgW;

    while (remaining > 0.5) {
      const sliceHpt = Math.min(usableH, remaining);
      const sliceHpx = Math.max(1, Math.floor(sliceHpt * pxPerPt));
      const srcY = Math.floor(offsetY * pxPerPt);

      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHpx;
      sliceCtx.fillStyle = '#ffffff';
      sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sliceCtx.drawImage(
        canvas,
        0,
        srcY,
        canvas.width,
        sliceHpx,
        0,
        0,
        canvas.width,
        sliceHpx
      );

      const dataUrl = sliceCanvas.toDataURL('image/jpeg', 0.92);
      if (offsetY > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', margin, margin, imgW, sliceHpt);

      offsetY += sliceHpt;
      remaining -= sliceHpt;
    }

    return pdf.output('arraybuffer');
  } finally {
    host.remove();
  }
}

async function archivoAPdfBytes(arch) {
  const tipo = tipoConvertibleFdm(arch);
  const bytes = await fetchArchivoBytes(arch);

  if (tipo === 'pdf') return bytes;
  if (tipo === 'image') {
    return imageBytesToPdfBytes(bytes, arch.tipoMime || extDeArchivo(arch));
  }
  if (tipo === 'word') {
    return docxBytesToPdfBytes(bytes, arch.nombreOriginal || 'documento.docx');
  }
  if (tipo === 'word_legacy') {
    throw new Error(
      `${arch.nombreOriginal}: el formato .doc antiguo no es compatible. Guárdelo como .docx e inténtelo de nuevo.`
    );
  }
  throw new Error(`${arch.nombreOriginal}: tipo no convertible a PDF`);
}

/** Normaliza File local a shape convertible (sin etiqueta de liquidador). */
export const fileLocalAMetaFdm = (file) => ({
  nombreOriginal: file?.name || 'archivo',
  tipoMime: file?.type || '',
  etiqueta: 'GENERAL',
  _file: file,
});

export const archivosLocalesParaExpedienteFdm = (files = []) =>
  [...(files || [])]
    .map(fileLocalAMetaFdm)
    .filter((a) => {
      // No meter Excel de modelo ni liquidador PDF a la unión
      const n = String(a.nombreOriginal || '').toLowerCase();
      if (n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.xlsm')) return false;
      if (/liquidador_fdm/i.test(a.nombreOriginal) && n.endsWith('.pdf')) return false;
      const tipo = tipoConvertibleFdm(a);
      return tipo === 'pdf' || tipo === 'image' || tipo === 'word';
    });

async function localFileAPdfBytes(meta) {
  const file = meta._file;
  const tipo = tipoConvertibleFdm(meta);
  const bytes = await file.arrayBuffer();
  if (tipo === 'pdf') return bytes;
  if (tipo === 'image') return imageBytesToPdfBytes(bytes, meta.tipoMime || extDeArchivo(meta));
  if (tipo === 'word') return docxBytesToPdfBytes(bytes, meta.nombreOriginal);
  if (tipo === 'word_legacy') {
    throw new Error(
      `${meta.nombreOriginal}: use .docx (el .doc antiguo no es compatible).`
    );
  }
  throw new Error(`${meta.nombreOriginal}: tipo no convertible`);
}

async function guardarPdfUnido(merged, nombreBase, { descargar = true } = {}) {
  const out = await merged.save();
  const blob = new Blob([out], { type: 'application/pdf' });
  const safe = String(nombreBase || 'Expediente_FDM')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 60);
  const nombre = `${safe}_expediente.pdf`;
  if (descargar) saveAs(blob, nombre);
  return { blob, nombre };
}

/**
 * Flujo rápido: archivos locales (File[]) → un solo PDF.
 * PDF + imágenes + Word (.docx). Sin liquidador / Excel.
 */
export async function unirArchivosLocalesFdm(
  files = [],
  { nombreBase = 'Expediente_FDM', onProgress, descargar = false } = {}
) {
  const candidatos = archivosLocalesParaExpedienteFdm(files);
  if (!candidatos.length) {
    throw new Error(
      'Seleccione PDF, Word (.docx) o imágenes. El liquidador y el Excel de liquidación no se unen.'
    );
  }

  const merged = await PDFDocument.create();
  let i = 0;
  for (const meta of candidatos) {
    i += 1;
    onProgress?.({ current: i, total: candidatos.length, name: meta.nombreOriginal });
    try {
      const pdfBytes = await localFileAPdfBytes(meta);
      await appendPdfBytes(merged, pdfBytes);
    } catch (err) {
      throw new Error(`Error con «${meta.nombreOriginal}»: ${err?.message || err}`);
    }
  }

  const { blob, nombre } = await guardarPdfUnido(merged, nombreBase, { descargar });
  return { blob, nombre, count: candidatos.length };
}

/**
 * Convertidor desde documentos ya en el archivero.
 */
export async function unirDocumentosArchiveroFdm(
  archivos = [],
  { nombreBase = 'Expediente_FDM', onProgress, descargar = false } = {}
) {
  const candidatos = archivosParaExpedienteFdm(archivos);
  if (!candidatos.length) {
    throw new Error(
      'No hay documentos convertibles (PDF, Word .docx o imágenes). El liquidador y el modelo de liquidación se excluyen.'
    );
  }

  const merged = await PDFDocument.create();
  let i = 0;
  for (const arch of candidatos) {
    i += 1;
    onProgress?.({ current: i, total: candidatos.length, name: arch.nombreOriginal });
    try {
      const pdfBytes = await archivoAPdfBytes(arch);
      await appendPdfBytes(merged, pdfBytes);
    } catch (err) {
      const msg = err?.message || String(err);
      throw new Error(`Error con «${arch.nombreOriginal}»: ${msg}`);
    }
  }

  const { blob, nombre } = await guardarPdfUnido(merged, nombreBase, { descargar });
  return { blob, nombre, count: candidatos.length };
}

/** Alias retrocompatible */
export async function unirPdfsArchiveroFdm(archivos, opts) {
  return unirDocumentosArchiveroFdm(archivos, opts);
}
