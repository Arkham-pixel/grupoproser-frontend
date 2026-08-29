/**
 * Cotización PDF → capturas de página + monto final (base de deducible).
 * Pensado para liquidadores CAT; el primer uso es Zurich.
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfWorkerUrl) {
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export const MAX_PAGINAS_COTIZACION_PDF = 12;
export const ETIQUETA_ARCHIVO_COTIZACION = 'COTIZACION';

const TOTAL_FUERTE =
  /gran\s*total|total\s*(general|cotizaci[oó]n|presupuesto|factura|a\s*pagar|neto|final|costos?)|valor\s*total|importe\s*total|neto\s*a\s*pagar|total\s*a\s*cobrar|costo\s*total/i;
const TOTAL_SUAVE = /\btotal\b/i;
const DESCARTAR =
  /sub\s*total|subtotal|\biva\b|descuento|anticipo|retenci[oó]n|reteica|retefuente|cantidad|p[aá]gina|nit\b|tel[eé]fono|fecha/i;

/** 21'568.750 (Colombia: apóstrofo = millones) → 21.568.750 para el regex. */
function compactarMontosEnLinea(linea = '') {
  return String(linea)
    .replace(/[\u2019\u2018\u00B4\u2032]/g, "'")
    .replace(/(\d)\s*'\s*(\d)/g, '$1.$2')
    .replace(/(\d)\s+\.\s+(\d{3})\b/g, '$1.$2');
}

function parsearMontoCotizacion(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  let numero = String(valor)
    .replace(/[\u2019\u2018\u00B4\u2032]/g, "'")
    .replace(/(\d)'(\d)/g, '$1$2')
    .replace(/[^\d.,-]/g, '');
  if (!numero) return 0;
  if (numero.includes(',') && numero.includes('.')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (numero.includes('.') && !numero.includes(',')) {
    const partes = numero.split('.');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  } else if (numero.includes(',')) {
    const partes = numero.split(',');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3 && !numero.includes('.'))) {
      numero = numero.replace(/,/g, '');
    } else {
      numero = numero.replace(',', '.');
    }
  }
  const n = parseFloat(numero);
  return Number.isFinite(n) ? n : 0;
}

function esAnioOCodigo(n, crudo) {
  if (n >= 1900 && n <= 2100 && !/[.,]/.test(String(crudo))) return true;
  if (n > 0 && n < 50 && !String(crudo).includes(',')) return true;
  return false;
}

function reconstruirLineasPdf(items = []) {
  const filas = [];
  for (const it of items) {
    const str = String(it?.str || '').trim();
    if (!str) continue;
    const y = Number(it?.transform?.[5]);
    const x = Number(it?.transform?.[4]);
    const yKey = Number.isFinite(y) ? Math.round(y / 4) * 4 : filas.length;
    let fila = filas.find((f) => f.yKey === yKey);
    if (!fila) {
      fila = { yKey, partes: [] };
      filas.push(fila);
    }
    fila.partes.push({ x: Number.isFinite(x) ? x : 0, str });
  }
  filas.sort((a, b) => b.yKey - a.yKey);
  return filas.map((f) =>
    f.partes
      .sort((a, b) => a.x - b.x)
      .map((p) => p.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const RE_MONTO =
  /\$\s*\d{1,3}(?:[.'\s]\d{3})+(?:,\d{1,2})?|\$\s*\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\s*\d+(?:[.,]\d{2})?|\d{1,3}(?:[.'']\d{3}){1,4}(?:,\d{1,2})?|\d{1,3}(?:,\d{3}){1,4}(?:\.\d{2})?|\d{4,}(?:[.,]\d{2})?/g;

export function extraerMontoFinalCotizacion(texto = '', { lineas = null } = {}) {
  const rows = Array.isArray(lineas) && lineas.length
    ? lineas
    : String(texto || '')
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
  const candidatos = [];
  rows.forEach((lineaCruda, idx) => {
    const linea = compactarMontosEnLinea(lineaCruda);
    RE_MONTO.lastIndex = 0;
    const matches = String(linea).match(RE_MONTO) || [];
    for (const crudo of matches) {
      const monto = parsearMontoCotizacion(crudo);
      if (!(monto >= 1000) || esAnioOCodigo(monto, crudo)) continue;
      let score = 0;
      if (TOTAL_FUERTE.test(linea)) score += 80;
      else if (TOTAL_SUAVE.test(linea)) score += 40;
      if (DESCARTAR.test(linea) && !TOTAL_FUERTE.test(linea)) score -= 35;
      if (/\$/.test(crudo) || /\$/.test(linea)) score += 8;
      score += Math.round((idx / Math.max(rows.length, 1)) * 18);
      if (monto >= 100000) score += 4;
      candidatos.push({ monto, crudo: crudo.trim(), linea, score });
    }
  });
  candidatos.sort((a, b) => b.score - a.score || b.monto - a.monto);
  const unico = [];
  const vistos = new Set();
  for (const c of candidatos) {
    const key = String(Math.round(c.monto));
    if (vistos.has(key)) continue;
    vistos.add(key);
    unico.push(c);
    if (unico.length >= 6) break;
  }
  const mejor = unico[0] || null;
  return {
    monto: mejor?.monto || 0,
    linea: mejor?.linea || '',
    candidatos: unico,
  };
}

function canvasAJpegBlob(canvas, quality = 0.82) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || !blob.size) {
          reject(new Error('La captura de la página quedó vacía'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Rasteriza un PDF y extrae el monto final más probable.
 * @returns {Promise<{ paginas: object[], textoCompleto: string, montoDetectado: number, candidatos: object[], lineas: string[] }>}
 */
export async function procesarCotizacionPdf(fuente, { maxPaginas = MAX_PAGINAS_COTIZACION_PDF } = {}) {
  const bytes =
    fuente instanceof ArrayBuffer
      ? fuente
      : fuente instanceof Uint8Array
        ? fuente.buffer.slice(fuente.byteOffset, fuente.byteOffset + fuente.byteLength)
        : await fuente.arrayBuffer();
  const data = new Uint8Array(bytes);
  if (data.length < 5 || String.fromCharCode(data[0], data[1], data[2], data[3]) !== '%PDF') {
    throw new Error('El archivo no es un PDF válido');
  }

  const loadingTask = getDocument({ data, disableRange: true, disableStream: true });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages || 0;
  if (!total) throw new Error('El PDF no tiene páginas');
  const hasta = Math.min(total, maxPaginas);
  const paginas = [];
  const lineasTodas = [];

  for (let i = 1; i <= hasta; i += 1) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const maxLado = 1800;
    const scale = Math.min(2, maxLado / Math.max(base.width, base.height, 1));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;
    const blob = await canvasAJpegBlob(canvas);
    const preview = URL.createObjectURL(blob);
    const file = new File([blob], `cotizacion-pagina-${i}.jpg`, { type: 'image/jpeg' });
    let textoPagina = '';
    try {
      const textContent = await page.getTextContent();
      const lineas = reconstruirLineasPdf(textContent.items || []);
      textoPagina = lineas.join('\n');
      lineasTodas.push(...lineas);
    } catch {
      textoPagina = '';
    }
    paginas.push({
      pagina: i,
      preview,
      file,
      tipoMime: 'image/jpeg',
      nombre: file.name,
      nombreOriginal: file.name,
      descripcion: `Cotización · página ${i} de ${total}`,
      etiqueta: ETIQUETA_ARCHIVO_COTIZACION,
      width: canvas.width,
      height: canvas.height,
      texto: textoPagina,
    });
  }

  try {
    await pdf.destroy();
  } catch {
    /* ignore */
  }

  const textoCompleto = lineasTodas.join('\n');
  const extraido = extraerMontoFinalCotizacion(textoCompleto, { lineas: lineasTodas });
  return {
    paginas,
    textoCompleto,
    montoDetectado: extraido.monto,
    candidatos: extraido.candidatos,
    lineas: lineasTodas,
    paginasTotalesPdf: total,
    paginasCapturadas: paginas.length,
  };
}

export function defaultCotizacionPdf() {
  return {
    nombreOriginal: '',
    montoFinal: '',
    montoDetectado: '',
    usarComoBasePresupuesto: true,
    archivoPdf: null,
    paginas: [],
  };
}

export function serializarPaginasCotizacion(paginas = []) {
  return (Array.isArray(paginas) ? paginas : [])
    .map((f, i) => ({
      _id: f?._id ? String(f._id) : undefined,
      ruta: typeof f?.ruta === 'string' ? f.ruta : '',
      nombre: String(f?.nombre || f?.nombreOriginal || `Cotización p.${i + 1}`),
      nombreOriginal: String(f?.nombreOriginal || f?.nombre || `Cotización p.${i + 1}`),
      descripcion: String(f?.descripcion || `Cotización · página ${f?.pagina || i + 1}`),
      tipoMime: String(f?.tipoMime || 'image/jpeg'),
      etiqueta: String(f?.etiqueta || ETIQUETA_ARCHIVO_COTIZACION),
      pagina: Number.isFinite(Number(f?.pagina)) ? Number(f.pagina) : i + 1,
      orden: Number.isFinite(Number(f?.orden)) ? Number(f.orden) : i,
      width: Number.isFinite(Number(f?.width)) ? Number(f.width) : undefined,
      height: Number.isFinite(Number(f?.height)) ? Number(f.height) : undefined,
    }))
    .filter((f) => f.ruta || f._id);
}

export function serializarCotizacionPdf(cotizacion = null) {
  if (!cotizacion || typeof cotizacion !== 'object') return null;
  const montoFinal =
    cotizacion.montoFinal === '' || cotizacion.montoFinal == null
      ? ''
      : cotizacion.montoFinal;
  const archivo = cotizacion.archivoPdf;
  return {
    nombreOriginal: String(cotizacion.nombreOriginal || ''),
    montoFinal,
    montoDetectado:
      cotizacion.montoDetectado === '' || cotizacion.montoDetectado == null
        ? ''
        : cotizacion.montoDetectado,
    usarComoBasePresupuesto: cotizacion.usarComoBasePresupuesto !== false,
    archivoPdf:
      archivo && (archivo.ruta || archivo._id)
        ? {
            _id: archivo._id ? String(archivo._id) : undefined,
            ruta: String(archivo.ruta || ''),
            nombre: String(archivo.nombre || archivo.nombreOriginal || cotizacion.nombreOriginal || ''),
          }
        : null,
    paginas: serializarPaginasCotizacion(cotizacion.paginas),
  };
}

export function parsearMontoCotizacionExport(valor) {
  return parsearMontoCotizacion(valor);
}

export function montoCotizacionPdf(cotizacion = null) {
  return parsearMontoCotizacion(cotizacion?.montoFinal);
}

export function usaCotizacionComoBasePresupuesto(cotizacion = null) {
  if (!cotizacion || typeof cotizacion !== 'object') return false;
  if (cotizacion.usarComoBasePresupuesto === false) return false;
  return montoCotizacionPdf(cotizacion) > 0;
}

export function fotosCotizacionDesdeLiquidador(liquidador = {}, guardado = null) {
  const delInforme = Array.isArray(guardado?.fotosCotizacion)
    ? guardado.fotosCotizacion.filter((f) => f && (f.ruta || f._id || f.preview || f.file))
    : [];
  const delLiq = Array.isArray(liquidador?.cotizacionPdf?.paginas)
    ? liquidador.cotizacionPdf.paginas.filter((f) => f && (f.ruta || f._id || f.preview || f.file))
    : [];
  if (!delInforme.length) return delLiq;
  const keys = new Set(delInforme.map((f) => String(f._id || f.ruta || '')).filter(Boolean));
  const extra = delLiq.filter((f) => !keys.has(String(f._id || f.ruta || '')));
  return [...delInforme, ...extra];
}

export function archivosPdfCotizacion(archivos = []) {
  return (Array.isArray(archivos) ? archivos : []).filter((a) => {
    const nombre = String(a?.nombreOriginal || a?.nombre || '');
    const mime = String(a?.tipoMime || '').toLowerCase();
    return mime.includes('pdf') || /\.pdf$/i.test(nombre);
  });
}

export function revocarPreviewsCotizacion(paginas = []) {
  (Array.isArray(paginas) ? paginas : []).forEach((p) => {
    if (typeof p?.preview === 'string' && p.preview.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(p.preview);
      } catch {
        /* ignore */
      }
    }
  });
}
