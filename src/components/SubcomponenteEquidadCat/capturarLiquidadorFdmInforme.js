import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { generarLiquidadorFdmPdfBlob } from '../SubcomponenteEquidadFdm/generarConstanciaFdmPdf.js';
import {
  calcularLiquidacionFdm,
  parsearNumero,
} from '../SubcomponenteEquidadFdm/liquidadorEquidadFdmHelpers.js';

if (typeof window !== 'undefined' && pdfWorkerUrl) {
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export function esLiquidadorFdmEquidadCat(liq = null) {
  if (!liq || typeof liq !== 'object') return false;
  if (liq.modelo === 'nsr10' && !Array.isArray(liq.contenidos) && !Array.isArray(liq.edificios)) {
    return false;
  }
  return (
    Array.isArray(liq.contenidos) ||
    Array.isArray(liq.edificios) ||
    (liq.deducible && typeof liq.deducible === 'object' && !liq.evaluacionSismicaNSR10)
  );
}

export function normalizarLiquidadorFdm(liq = {}) {
  if (!liq || typeof liq !== 'object') {
    return { contenidos: [], edificios: [], deducible: {} };
  }
  return {
    ...liq,
    contenidos: Array.isArray(liq.contenidos) ? liq.contenidos : [],
    edificios: Array.isArray(liq.edificios) ? liq.edificios : [],
  };
}

export function itemsPlanosLiquidadorFdm(liquidador = {}) {
  const filas = [];
  const push = (it, grupo) => {
    const concepto = String(it?.item || '').trim();
    const valor = parsearNumero(it?.valor);
    if (!concepto && !(valor > 0)) return;
    filas.push({
      concepto: concepto || grupo,
      grupo,
      valorReclamado: valor,
      valorIndemnizable: valor,
    });
  };
  (Array.isArray(liquidador.contenidos) ? liquidador.contenidos : []).forEach((it) =>
    push(it, 'Contenidos')
  );
  (Array.isArray(liquidador.edificios) ? liquidador.edificios : []).forEach((it) =>
    push(it, 'Edificios')
  );
  return filas;
}

function canvasADataUrl(canvas, quality = 0.86) {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Genera el PDF del liquidador FDM (mismo layout Excel) y lo rasteriza
 * para el informe único y el Word.
 */
export async function capturarPaginasLiquidadorFdm(liquidador, totalesParam) {
  if (!liquidador || typeof liquidador !== 'object') return [];
  const liq = normalizarLiquidadorFdm(liquidador);
  const totales = totalesParam || calcularLiquidacionFdm(liq);
  const { blob } = await generarLiquidadorFdmPdfBlob(liq, totales);
  const data = new Uint8Array(await blob.arrayBuffer());
  if (data.length < 5 || String.fromCharCode(data[0], data[1], data[2], data[3]) !== '%PDF') {
    throw new Error('No se pudo generar el PDF del liquidador FDM');
  }

  const loadingTask = getDocument({ data, disableRange: true, disableStream: true });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages || 0;
  const paginas = [];

  for (let i = 1; i <= total; i += 1) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const maxLado = 2000;
    const scale = Math.min(2.2, maxLado / Math.max(base.width, base.height, 1));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;
    paginas.push({
      dataUrl: canvasADataUrl(canvas),
      width: canvas.width,
      height: canvas.height,
      nombre: `Liquidador FDM · página ${i}`,
    });
  }
  return paginas;
}
