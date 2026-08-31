/**
 * Cotización PDF → capturas de página + monto final (base de deducible).
 * Pensado para liquidadores CAT; el primer uso es Zurich.
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  compactarMontosEnLineaCOP,
  documentoUsaTildeMiles,
  esMontoMillonesTruncadoCOP,
  normalizarSeparadoresMilesCOP,
  parsearMontoCOP,
  RE_MONTO_COP,
} from '../../utils/parsearMontoCOP.js';

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

function parsearMontoCotizacion(valor) {
  return parsearMontoCOP(valor);
}

function esAnioOCodigo(n, crudo) {
  if (n >= 1900 && n <= 2100 && !/[.,'~]/.test(String(crudo))) return true;
  if (n > 0 && n < 50 && !String(crudo).includes(',')) return true;
  return false;
}

function esMontoMillonesTruncado(crudo, monto) {
  return esMontoMillonesTruncadoCOP(crudo, monto);
}

function documentoUsaApostrofoMillones(rows = []) {
  return documentoUsaTildeMiles(rows);
}

function itemsPdfUsanTilde(items = []) {
  return (items || []).some((it) => documentoUsaTildeMiles([it?.str]));
}

function documentoUsaCerosDeMiles(rows = []) {
  return (rows || []).some((l) => /\d[.\s'~]*000\b/.test(String(l || '')));
}

/** Une `61'642` + `.000` cuando el PDF los dejó en renglones distintos. */
function fusionarLineasMonto(rows = []) {
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    let linea = String(rows[i] || '').trim();
    if (!linea) continue;
    for (let salto = 1; salto <= 2 && i + salto < rows.length; salto += 1) {
      const next = String(rows[i + salto] || '').trim();
      const compacta = linea.replace(/\s+/g, '');
      const nextCompacta = next.replace(/\s+/g, '');
      if (
        /\d(?:[.'~\u00B4\u2019]\d{3})$/.test(compacta) &&
        /^\.??000\b/.test(nextCompacta) &&
        nextCompacta.length <= 8
      ) {
        linea = `${linea.replace(/\s+$/, '')}.${next.replace(/^\s*\.?\s*/, '')}`;
        i += salto;
        break;
      }
    }
    out.push(linea);
  }
  return out;
}

function unirPartesLinea(partes = []) {
  const sorted = [...partes].sort((a, b) => a.x - b.x);
  let out = '';
  for (let i = 0; i < sorted.length; i += 1) {
    const cur = String(sorted[i].str || '');
    if (!out) {
      out = cur;
      continue;
    }
    const curCompact = cur.replace(/\s+/g, '');
    const outCompact = out.replace(/\s+/g, '');
    if (/^\.?000$/.test(curCompact) && /\d{3}$/.test(outCompact)) {
      out = `${out.replace(/\s+$/, '')}.000`;
      continue;
    }
    const prevCh = out.slice(-1);
    const curCh = cur.charAt(0);
    const esFragNum = /[\d$.,'~]/.test(prevCh) && /[\d$.,'~]/.test(curCh);
    const gap = sorted[i].x - (sorted[i - 1].x + (sorted[i - 1].w || 0));
    if (esFragNum || (Number.isFinite(gap) && gap >= 0 && gap < 2.5)) {
      out += cur;
    } else {
      out += ` ${cur}`;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function reconstruirLineasPdf(items = []) {
  const partes = [];
  for (const it of items) {
    const str = normalizarSeparadoresMilesCOP(it?.str ?? '').trim();
    if (!str) continue;
    const tr = it?.transform || [];
    const x = Number(tr[4]);
    const y = Number(tr[5]);
    const h = Number(it?.height) || Math.abs(Number(tr[3])) || 10;
    const w = Number(it?.width);
    partes.push({
      str,
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      h: Number.isFinite(h) && h > 0 ? h : 10,
      w: Number.isFinite(w) && w > 0 ? w : 0,
    });
  }
  partes.sort((a, b) => b.y - a.y || a.x - b.x);
  const filas = [];
  for (const p of partes) {
    const tol = Math.max(8, p.h * 0.6);
    let fila = filas.find((f) => Math.abs(f.y - p.y) <= Math.max(tol, f.h * 0.6));
    if (!fila) {
      fila = { y: p.y, h: p.h, partes: [] };
      filas.push(fila);
    }
    fila.partes.push(p);
    fila.y = fila.partes.reduce((s, q) => s + q.y, 0) / fila.partes.length;
    fila.h = Math.max(fila.h, p.h);
  }
  filas.sort((a, b) => b.y - a.y);
  return fusionarLineasMonto(filas.map((f) => unirPartesLinea(f.partes)));
}

export function extraerMontoFinalCotizacion(
  texto = '',
  { lineas = null, usaTilde = false } = {}
) {
  const rowsCrudas = Array.isArray(lineas) && lineas.length
    ? lineas
    : String(texto || '')
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
  const rows = fusionarLineasMonto(rowsCrudas);
  const usaApostrofo = Boolean(usaTilde) || documentoUsaApostrofoMillones(rowsCrudas);
  const hayCerosDeMiles = documentoUsaCerosDeMiles(rows);
  const brutos = [];
  rows.forEach((lineaCruda, idx) => {
    const linea = compactarMontosEnLineaCOP(lineaCruda);
    const lineaAnt = compactarMontosEnLineaCOP(rows[idx - 1] || '');
    RE_MONTO_COP.lastIndex = 0;
    const matches = String(linea).match(RE_MONTO_COP) || [];
    for (const crudo of matches) {
      const monto = parsearMontoCotizacion(crudo);
      if (!(monto >= 1000) || esAnioOCodigo(monto, crudo)) continue;
      brutos.push({
        monto,
        crudo: crudo.trim(),
        linea,
        lineaAnt,
        idx,
      });
    }
  });
  const hayMillones = brutos.some((c) => c.monto >= 1000000);
  const candidatos = brutos.map((c) => {
    const etiquetaCerca =
      TOTAL_FUERTE.test(c.linea) ||
      (c.linea.length < 48 && TOTAL_FUERTE.test(c.lineaAnt));
    const totalCerca =
      TOTAL_SUAVE.test(c.linea) ||
      (c.linea.length < 48 && TOTAL_SUAVE.test(c.lineaAnt));
    let monto = c.monto;
    let crudo = c.crudo;
    const truncado = esMontoMillonesTruncado(crudo, monto);
    const completar =
      truncado &&
      (usaApostrofo ||
        hayMillones ||
        hayCerosDeMiles ||
        etiquetaCerca ||
        (totalCerca && (/\$/.test(crudo) || /\$/.test(c.linea))));
    if (completar) {
      monto *= 1000;
      if (!/\.000\b/.test(crudo)) crudo = `${crudo}.000`;
    }
    let score = 0;
    if (etiquetaCerca) score += 80;
    else if (totalCerca) score += 40;
    if (DESCARTAR.test(c.linea) && !etiquetaCerca) score -= 35;
    if (/\$/.test(crudo) || /\$/.test(c.linea)) score += 8;
    score += Math.round((c.idx / Math.max(rows.length, 1)) * 18);
    if (monto >= 100000) score += 4;
    if (monto >= 1000000) score += 18;
    if (completar && etiquetaCerca) score += 30;
    return { monto, crudo, linea: c.linea, score };
  });
  candidatos.sort((a, b) => b.score - a.score || b.monto - a.monto);
  const unico = [];
  const vistos = new Set();
  for (const c of candidatos) {
    const key = String(Math.round(c.monto));
    if (vistos.has(key)) continue;
    vistos.add(key);
    unico.push(c);
    if (unico.length >= 8) break;
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
  let usaTildePdf = false;

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
      const items = textContent.items || [];
      if (itemsPdfUsanTilde(items)) usaTildePdf = true;
      const lineas = reconstruirLineasPdf(items);
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
  const extraido = extraerMontoFinalCotizacion(textoCompleto, {
    lineas: lineasTodas,
    usaTilde: usaTildePdf,
  });
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

/** Ventanas de cotización PDF en Alfa: materiales, mano de obra y completo. */
export const SLOTS_COTIZACION_PDF_ALFA = [
  { id: 'materiales', label: 'Materiales' },
  { id: 'manoObra', label: 'Mano de obra' },
  { id: 'completo', label: 'Completo' },
];

export function defaultCotizacionesPdfAlfa() {
  return { materiales: null, manoObra: null, completo: null };
}

export function normalizarCotizacionesPdfAlfa(liquidador = {}) {
  const raw =
    liquidador?.cotizacionesPdf && typeof liquidador.cotizacionesPdf === 'object'
      ? liquidador.cotizacionesPdf
      : {};
  return {
    materiales: raw.materiales && typeof raw.materiales === 'object' ? raw.materiales : null,
    manoObra: raw.manoObra && typeof raw.manoObra === 'object' ? raw.manoObra : null,
    completo:
      (raw.completo && typeof raw.completo === 'object' ? raw.completo : null) ||
      (liquidador?.cotizacionPdf && typeof liquidador.cotizacionPdf === 'object'
        ? liquidador.cotizacionPdf
        : null),
  };
}

export function serializarCotizacionesPdfAlfa(cotizaciones = null, liquidador = {}) {
  const norm = normalizarCotizacionesPdfAlfa({
    cotizacionesPdf: cotizaciones,
    cotizacionPdf: liquidador?.cotizacionPdf,
  });
  return {
    materiales: serializarCotizacionPdf(norm.materiales),
    manoObra: serializarCotizacionPdf(norm.manoObra),
    completo: serializarCotizacionPdf(norm.completo),
  };
}

export function resumenCotizacionesPdfAlfa(liquidador = {}) {
  const slots = normalizarCotizacionesPdfAlfa(liquidador);
  const filas = SLOTS_COTIZACION_PDF_ALFA.map((slot) => {
    const cot = slots[slot.id];
    const monto = montoCotizacionPdf(cot);
    const usada = usaCotizacionComoBasePresupuesto(cot);
    const tieneArchivo = Boolean(
      (Array.isArray(cot?.paginas) && cot.paginas.length) || cot?.archivoPdf || cot?.nombreOriginal
    );
    return {
      id: slot.id,
      label: slot.label,
      cotizacion: cot,
      monto,
      usada,
      tieneArchivo,
    };
  });
  const usadas = filas.filter((f) => f.usada);
  const total = usadas.reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
  return {
    slots,
    filas,
    usadas,
    total: Math.round(total * 100) / 100,
    nUsadas: usadas.length,
    usaComoBase: usadas.length > 0 && total > 0,
  };
}

export function paginasTodasCotizacionesPdfAlfa(liquidador = {}, informe = null) {
  const delInforme = Array.isArray(informe?.fotosCotizacion)
    ? informe.fotosCotizacion.filter((f) => f && (f.ruta || f._id || f.preview || f.file))
    : [];
  const resumen = resumenCotizacionesPdfAlfa(liquidador);
  const delLiq = [];
  resumen.filas.forEach((fila) => {
    const pags = Array.isArray(fila.cotizacion?.paginas) ? fila.cotizacion.paginas : [];
    pags.forEach((p) => {
      if (!p || !(p.ruta || p._id || p.preview || p.file)) return;
      delLiq.push({
        ...p,
        descripcion:
          p.descripcion || `Cotización ${fila.label} · página ${p.pagina || ''}`.trim(),
      });
    });
  });
  if (!delInforme.length) return delLiq;
  const keys = new Set(delInforme.map((f) => String(f._id || f.ruta || '')).filter(Boolean));
  const extra = delLiq.filter((f) => !keys.has(String(f._id || f.ruta || '')));
  return [...delInforme, ...extra];
}
