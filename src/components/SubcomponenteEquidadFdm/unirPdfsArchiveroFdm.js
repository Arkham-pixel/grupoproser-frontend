import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { urlDescargaArchivoFdm } from '../../services/equidadFdmService.js';
import { candidatosUrlArchivo } from '../../services/storageSignedUrl.js';

/** Etiquetas que NUNCA entran al PDF unificado (liquidador / modelo Excel). */
export const ETIQUETAS_EXCLUIDAS_MERGE_PDF = new Set([
  'LIQUIDACION',
  'MODELO_LIQUIDACION',
]);

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
const WORD_EXTS = new Set(['.docx']);
const EXCEL_EXTS = new Set(['.xlsx', '.xlsm']);
const PDF_EXTS = new Set(['.pdf']);

const authFetchHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const asUint8 = (bytes) => {
  if (!bytes) return new Uint8Array();
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (ArrayBuffer.isView(bytes)) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  return new Uint8Array(bytes);
};

const extDeArchivo = (arch) => {
  const nombre = String(arch?.nombreOriginal || arch?.name || '').toLowerCase();
  const i = nombre.lastIndexOf('.');
  return i >= 0 ? nombre.slice(i) : '';
};

const escapeHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const esExcluidoDelExpedienteFdm = (arch) => {
  const etiqueta = String(arch?.etiqueta || '').toUpperCase();
  if (ETIQUETAS_EXCLUIDAS_MERGE_PDF.has(etiqueta)) return true;
  const nombre = String(arch?.nombreOriginal || '');
  return /Liquidador_FDM/i.test(nombre) && /\.pdf$/i.test(nombre);
};

const detectarTipoPorBytes = (bytes, nombre = '', mime = '') => {
  const u8 = asUint8(bytes);
  const mimeL = String(mime || '').toLowerCase();
  const ext = extDeArchivo({ nombreOriginal: nombre });
  if (u8.length >= 5) {
    const ascii = String.fromCharCode(u8[0], u8[1], u8[2], u8[3], u8[4]);
    if (ascii.startsWith('%PDF')) return 'pdf';
    if (u8[0] === 0xff && u8[1] === 0xd8) return 'image';
    if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) return 'image';
    if (ascii.startsWith('GIF')) return 'image';
    if (u8[0] === 0x42 && u8[1] === 0x4d) return 'image';
    if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) return 'image';
    if (u8[0] === 0x50 && u8[1] === 0x4b) {
      if (EXCEL_EXTS.has(ext) || mimeL.includes('spreadsheet')) return 'excel';
      if (WORD_EXTS.has(ext) || mimeL.includes('wordprocessing')) return 'word';
      if (ext === '.docx') return 'word';
      if (ext === '.xlsx' || ext === '.xlsm') return 'excel';
    }
  }
  if (mimeL.includes('pdf') || PDF_EXTS.has(ext)) return 'pdf';
  if (mimeL.startsWith('image/') || IMAGE_EXTS.has(ext)) return 'image';
  if (mimeL.includes('spreadsheet') || EXCEL_EXTS.has(ext)) return 'excel';
  if (mimeL.includes('wordprocessingml') || WORD_EXTS.has(ext)) return 'word';
  if (ext === '.doc' || (mimeL.includes('msword') && ext === '.doc')) return 'word_legacy';
  return null;
};

export const tipoConvertibleFdm = (arch, bytes = null) => {
  if (!arch || esExcluidoDelExpedienteFdm(arch)) return null;
  if (bytes) {
    return detectarTipoPorBytes(bytes, arch.nombreOriginal || arch.name, arch.tipoMime || arch.type);
  }
  const mime = String(arch?.tipoMime || arch?.type || '').toLowerCase();
  const ext = extDeArchivo(arch);
  if (mime.includes('pdf') || PDF_EXTS.has(ext)) return 'pdf';
  if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) return 'image';
  if (mime.includes('spreadsheet') || EXCEL_EXTS.has(ext)) return 'excel';
  if (mime.includes('wordprocessingml') || WORD_EXTS.has(ext) || ext === '.doc') {
    if (ext === '.doc' && !mime.includes('wordprocessingml')) return 'word_legacy';
    return 'word';
  }
  return null;
};

export const archivosParaExpedienteFdm = (archivos = []) =>
  (archivos || []).filter((a) => {
    const tipo = tipoConvertibleFdm(a);
    return tipo === 'pdf' || tipo === 'image' || tipo === 'word' || tipo === 'excel';
  });

export const archivosPdfParaUnirFdm = archivosParaExpedienteFdm;

async function fetchArchivoBytes(arch) {
  const urls = await candidatosUrlArchivo(arch.ruta, urlDescargaArchivoFdm(arch.ruta));
  if (!urls.length) throw new Error(`Sin URL de descarga: ${arch.nombreOriginal}`);
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: authFetchHeaders() });
      if (res.ok) return res.arrayBuffer();
      lastErr = new Error(`No se pudo leer ${arch.nombreOriginal} (${res.status})`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error(`No se pudo leer ${arch.nombreOriginal}`);
}

async function appendPdfBytes(merged, pdfBytes) {
  const src = await PDFDocument.load(asUint8(pdfBytes), { ignoreEncryption: true });
  if (!src.getPageCount()) {
    throw new Error('El PDF de origen no tiene páginas');
  }
  const pages = await merged.copyPages(src, src.getPageIndices());
  pages.forEach((p) => merged.addPage(p));
}

const loadHtmlImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = url;
  });

/** Cualquier imagen del navegador → JPEG (evita webp/gif/bmp vacíos en pdf-lib). */
async function rasterizarImagenAJpeg(imageBytes) {
  const blob = new Blob([asUint8(imageBytes)]);
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadHtmlImage(url);
    const w = Math.max(1, img.naturalWidth || img.width || 0);
    const h = Math.max(1, img.naturalHeight || img.height || 0);
    if (w < 2 || h < 2) throw new Error('La imagen está vacía o dañada');
    const maxSide = 2400;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const jpegBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('No se pudo convertir la imagen'))),
        'image/jpeg',
        0.9
      );
    });
    return jpegBlob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageBytesToPdfBytes(imageBytes) {
  const jpegBytes = await rasterizarImagenAJpeg(imageBytes);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedJpg(asUint8(jpegBytes));
  const pageW = 612;
  const pageH = 792;
  const landscape = image.width > image.height;
  const pw = landscape ? pageH : pageW;
  const ph = landscape ? pageW : pageH;
  const page = pdf.addPage([pw, ph]);
  const margin = 28;
  const maxW = pw - margin * 2;
  const maxH = ph - margin * 2;
  const scale = Math.min(maxW / image.width, maxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, {
    x: (pw - w) / 2,
    y: (ph - h) / 2,
    width: w,
    height: h,
  });
  return pdf.save();
}

const waitFrames = (n = 3) =>
  new Promise((resolve) => {
    const step = (left) => {
      if (left <= 0) return resolve();
      requestAnimationFrame(() => step(left - 1));
    };
    step(n);
  });

async function waitForImages(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
    )
  );
}

/**
 * HTML visible (opacity baja) → PDF paginado, sin páginas extra en blanco.
 */
async function htmlToPdfBytes(html, { title = '' } = {}) {
  const host = document.createElement('div');
  host.setAttribute('data-fdm-html-convert', '1');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:794px',
    'padding:36px 40px 48px',
    'background:#ffffff',
    'color:#111111',
    'font-family:Arial,Helvetica,sans-serif',
    'font-size:12pt',
    'line-height:1.45',
    'opacity:0.02',
    'pointer-events:none',
    'z-index:2147483646',
    'overflow:visible',
    'box-sizing:border-box',
  ].join(';');
  host.innerHTML = `
    ${title ? `<div style="margin-bottom:12px;font-size:10pt;color:#555;">${escapeHtml(title)}</div>` : ''}
    <div class="fdm-html-body">${html}</div>
  `;
  document.body.appendChild(host);

  try {
    await waitFrames(4);
    await waitForImages(host);
    await waitFrames(2);

    const captureH = Math.max(host.scrollHeight, host.offsetHeight, 200);
    const canvas = await html2canvas(host, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: 794,
      height: captureH,
      windowWidth: 794,
      windowHeight: captureH,
      scrollX: 0,
      scrollY: 0,
    });

    if (!canvas.width || canvas.height < 8) {
      throw new Error('La captura del documento quedó vacía');
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;
    const pxPerPt = canvas.width / usableW;
    const pagePx = Math.max(1, Math.round(usableH * pxPerPt));
    const totalPages = Math.max(1, Math.ceil(canvas.height / pagePx));

    for (let p = 0; p < totalPages; p += 1) {
      const srcY = p * pagePx;
      const sliceHpx = Math.min(pagePx, canvas.height - srcY);
      if (sliceHpx <= 2) break;

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHpx;
      const ctx = sliceCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);

      const dataUrl = sliceCanvas.toDataURL('image/jpeg', 0.9);
      if (p > 0) pdf.addPage();
      const sliceHpt = sliceHpx / pxPerPt;
      pdf.addImage(dataUrl, 'JPEG', margin, margin, usableW, sliceHpt);
    }

    return pdf.output('arraybuffer');
  } finally {
    host.remove();
  }
}

async function docxBytesToPdfBytes(docxBytes, nombre = 'documento.docx') {
  const u8 = asUint8(docxBytes);
  const arrayBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read('base64');
        return { src: `data:${image.contentType};base64,${base64}` };
      }),
    }
  );
  const html = String(result.value || '').trim() || '<p>(Documento sin texto visible)</p>';
  return htmlToPdfBytes(html, { title: nombre });
}

function valorCeldaExcel(cell) {
  if (!cell) return '';
  if (cell.text != null && String(cell.text).trim() !== '') return String(cell.text);
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    if (v.richText) return v.richText.map((p) => p.text || '').join('');
    if (v.hyperlink) return String(v.text || v.hyperlink);
  }
  return String(v);
}

async function excelBytesToPdfBytes(excelBytes, nombre = 'libro.xlsx') {
  const wb = new ExcelJS.Workbook();
  const u8 = asUint8(excelBytes);
  await wb.xlsx.load(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('El Excel no tiene hojas');

  let table = '<table style="border-collapse:collapse;width:100%;font-size:9pt;">';
  const maxRow = Math.min(ws.rowCount || 0, 200);
  const maxCol = Math.min(ws.columnCount || 0, 20) || 12;
  for (let r = 1; r <= Math.max(maxRow, 1); r += 1) {
    const row = ws.getRow(r);
    table += '<tr>';
    for (let c = 1; c <= maxCol; c += 1) {
      table += `<td style="border:1px solid #ccc;padding:3px 5px;vertical-align:top;">${escapeHtml(
        valorCeldaExcel(row.getCell(c))
      )}</td>`;
    }
    table += '</tr>';
  }
  table += '</table>';
  return htmlToPdfBytes(table, { title: nombre });
}

async function bytesAPdf(bytes, nombre, mime) {
  const tipo = detectarTipoPorBytes(bytes, nombre, mime) || tipoConvertibleFdm({
    nombreOriginal: nombre,
    tipoMime: mime,
  });
  if (tipo === 'pdf') return asUint8(bytes);
  if (tipo === 'image') return imageBytesToPdfBytes(bytes);
  if (tipo === 'word') return docxBytesToPdfBytes(bytes, nombre);
  if (tipo === 'excel') return excelBytesToPdfBytes(bytes, nombre);
  if (tipo === 'word_legacy') {
    throw new Error(`${nombre}: el .doc antiguo no es compatible. Guárdelo como .docx.`);
  }
  throw new Error(`${nombre}: tipo no convertible a PDF`);
}

async function archivoAPdfBytes(arch) {
  const bytes = await fetchArchivoBytes(arch);
  return bytesAPdf(bytes, arch.nombreOriginal || 'documento', arch.tipoMime || '');
}

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
      const n = String(a.nombreOriginal || '');
      if (/liquidador_fdm/i.test(n) && /\.pdf$/i.test(n)) return false;
      if (/liquidador_fdm/i.test(n) && /\.xlsx?$/i.test(n)) return false;
      const tipo = tipoConvertibleFdm(a);
      return tipo === 'pdf' || tipo === 'image' || tipo === 'word' || tipo === 'excel';
    });

async function localFileAPdfBytes(meta) {
  const bytes = await meta._file.arrayBuffer();
  return bytesAPdf(bytes, meta.nombreOriginal, meta.tipoMime);
}

async function guardarPdfUnido(merged, nombreBase, { descargar = true } = {}) {
  if (!merged.getPageCount()) {
    throw new Error('El PDF unido quedó vacío. Revise que los archivos de origen se puedan abrir.');
  }
  const out = asUint8(await merged.save());
  const blob = new Blob([out], { type: 'application/pdf' });
  const safe = String(nombreBase || 'Expediente_FDM')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 60);
  const nombre = `${safe}_expediente.pdf`;
  if (descargar) saveAs(blob, nombre);
  return { blob, nombre };
}

export async function unirArchivosLocalesFdm(
  files = [],
  { nombreBase = 'Expediente_FDM', onProgress, descargar = false } = {}
) {
  const candidatos = archivosLocalesParaExpedienteFdm(files);
  if (!candidatos.length) {
    throw new Error(
      'Seleccione PDF, Word (.docx), Excel (.xlsx) o imágenes. El liquidador no se une.'
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

export async function unirDocumentosArchiveroFdm(
  archivos = [],
  { nombreBase = 'Expediente_FDM', onProgress, descargar = false } = {}
) {
  const candidatos = archivosParaExpedienteFdm(archivos);
  if (!candidatos.length) {
    throw new Error(
      'No hay documentos convertibles (PDF, Word, Excel o imágenes). El liquidador se excluye.'
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
      throw new Error(`Error con «${arch.nombreOriginal}»: ${err?.message || err}`);
    }
  }

  const { blob, nombre } = await guardarPdfUnido(merged, nombreBase, { descargar });
  return { blob, nombre, count: candidatos.length };
}

export async function unirPdfsArchiveroFdm(archivos, opts) {
  return unirDocumentosArchiveroFdm(archivos, opts);
}
