/**
 * Normaliza imágenes de firma (fotos o firmas dibujadas) para el Word:
 * - Recorta al trazo de tinta (quita márgenes/fondo)
 * - Intenta enderezar inclinaciones leves
 * - Genera PNG limpio sobre fondo blanco, a buen tamaño
 */

const FIRMA_MAX_ANCHO = 900;
const FIRMA_MAX_ALTO = 320;
const UMBRAL_TINTA = 235;
const PADDING_RECORTE = 18;

function cargarImagenDesdeSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen de firma'));
    img.src = src;
  });
}

/**
 * Preferimos createImageBitmap para respetar orientación EXIF de fotos móviles.
 * Fallback a <img> si no está disponible.
 */
async function cargarBitmapFirma(src) {
  try {
    if (typeof createImageBitmap === 'function' && src.startsWith('data:')) {
      const res = await fetch(src);
      const blob = await res.blob();
      // imageOrientation: from-image corrige torceduras de EXIF en JPG de celular
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    }
  } catch {
    /* fallback abajo */
  }
  return cargarImagenDesdeSrc(src);
}

function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}

function obtenerBoundingBoxTinta(imageData, umbral = UMBRAL_TINTA) {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      // Tinta: pixels suficientemente oscuros o semitransparentes con color
      const esTinta =
        a > 20 && (r < umbral || g < umbral || b < umbral || (a < 250 && (r + g + b) / 3 < 250));
      if (!esTinta) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Estima la inclinación dominante del trazo (grados) mirando la "fila de tinta"
 * más ancha cerca del centro vertical del bounding box.
 */
function estimarAnguloGrados(imageData, box) {
  const { data, width } = imageData;
  const midY = Math.round((box.minY + box.maxY) / 2);
  const band = Math.max(4, Math.round((box.maxY - box.minY) * 0.18));
  const puntos = [];

  for (let y = midY - band; y <= midY + band; y += 1) {
    if (y < 0 || y >= imageData.height) continue;
    for (let x = box.minX; x <= box.maxX; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 20 && (r + g + b) / 3 < UMBRAL_TINTA) {
        puntos.push({ x, y });
      }
    }
  }

  if (puntos.length < 30) return 0;

  // Regresión lineal y ~ a + b*x
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const p of puntos) {
    sumX += p.x;
    sumY += p.y;
    sumXX += p.x * p.x;
    sumXY += p.x * p.y;
  }
  const n = puntos.length;
  const den = n * sumXX - sumX * sumX;
  if (Math.abs(den) < 1e-6) return 0;
  const slope = (n * sumXY - sumX * sumY) / den;
  let deg = (Math.atan(slope) * 180) / Math.PI;
  // Solo corregimos inclinaciones leves típicas de fotos de celular
  if (Math.abs(deg) < 1.2 || Math.abs(deg) > 18) return 0;
  return -deg;
}

function dibujarFondoBlanco(ctx, w, h) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
}

/**
 * Normaliza una firma (dataURL o blob URL) y devuelve PNG dataURL listo para Word.
 * Si falla, retorna el original.
 */
export async function normalizarFirmaClienteDataUrl(src, opciones = {}) {
  if (!src || typeof src !== 'string') return src || '';

  try {
    const img = await cargarBitmapFirma(src);
    const w0 = img.width || img.naturalWidth || 0;
    const h0 = img.height || img.naturalHeight || 0;
    if (!w0 || !h0) return src;

    // Canvas de análisis (limitar tamaño para rendimiento)
    const maxAnalisis = 1400;
    const scaleAnalisis = Math.min(1, maxAnalisis / Math.max(w0, h0));
    const aw = Math.max(1, Math.round(w0 * scaleAnalisis));
    const ah = Math.max(1, Math.round(h0 * scaleAnalisis));

    const canvasAnalisis = document.createElement('canvas');
    canvasAnalisis.width = aw;
    canvasAnalisis.height = ah;
    const ctxA = canvasAnalisis.getContext('2d', { willReadFrequently: true });
    if (!ctxA) return src;
    dibujarFondoBlanco(ctxA, aw, ah);
    ctxA.drawImage(img, 0, 0, aw, ah);

    let imageData = ctxA.getImageData(0, 0, aw, ah);
    let box = obtenerBoundingBoxTinta(imageData);
    if (!box) {
      // Sin tinta detectable: al menos reescalar manteniendo proporción
      return escalarFirmaSimple(img, opciones);
    }

    const angulo = opciones.enderezar === false ? 0 : estimarAnguloGrados(imageData, box);

    // Recortar con padding y, si aplica, rotar/enderezar en un canvas limpio
    const pad = PADDING_RECORTE;
    const sx = Math.max(0, box.minX - pad);
    const sy = Math.max(0, box.minY - pad);
    const sw = Math.min(aw - sx, box.maxX - box.minX + pad * 2 + 1);
    const sh = Math.min(ah - sy, box.maxY - box.minY + pad * 2 + 1);

    const crop = document.createElement('canvas');
    crop.width = sw;
    crop.height = sh;
    const ctxCrop = crop.getContext('2d');
    if (!ctxCrop) return src;
    dibujarFondoBlanco(ctxCrop, sw, sh);
    ctxCrop.drawImage(canvasAnalisis, sx, sy, sw, sh, 0, 0, sw, sh);

    let firmado = crop;
    if (Math.abs(angulo) >= 1.2) {
      const rad = (angulo * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const rw = Math.ceil(sw * cos + sh * sin);
      const rh = Math.ceil(sw * sin + sh * cos);
      const rot = document.createElement('canvas');
      rot.width = rw;
      rot.height = rh;
      const ctxR = rot.getContext('2d', { willReadFrequently: true });
      if (ctxR) {
        dibujarFondoBlanco(ctxR, rw, rh);
        ctxR.translate(rw / 2, rh / 2);
        ctxR.rotate(rad);
        ctxR.drawImage(crop, -sw / 2, -sh / 2);
        // Re-crop tras rotación
        const dataRot = ctxR.getImageData(0, 0, rw, rh);
        const boxRot = obtenerBoundingBoxTinta(dataRot);
        if (boxRot) {
          const px = Math.max(0, boxRot.minX - pad);
          const py = Math.max(0, boxRot.minY - pad);
          const pw = Math.min(rw - px, boxRot.maxX - boxRot.minX + pad * 2 + 1);
          const ph = Math.min(rh - py, boxRot.maxY - boxRot.minY + pad * 2 + 1);
          const finalCrop = document.createElement('canvas');
          finalCrop.width = pw;
          finalCrop.height = ph;
          const ctxF = finalCrop.getContext('2d');
          if (ctxF) {
            dibujarFondoBlanco(ctxF, pw, ph);
            ctxF.drawImage(rot, px, py, pw, ph, 0, 0, pw, ph);
            firmado = finalCrop;
          } else {
            firmado = rot;
          }
        } else {
          firmado = rot;
        }
      }
    }

    // Escalar al tamaño de salida (llenar el área disponible, manteniendo proporción)
    const maxW = opciones.maxAncho || FIRMA_MAX_ANCHO;
    const maxH = opciones.maxAlto || FIRMA_MAX_ALTO;
    let dw = firmado.width;
    let dh = firmado.height;
    const scale = Math.min(maxW / dw, maxH / dh);
    dw = Math.max(1, Math.round(dw * scale));
    dh = Math.max(1, Math.round(dh * scale));

    const out = document.createElement('canvas');
    out.width = dw;
    out.height = dh;
    const ctxOut = out.getContext('2d');
    if (!ctxOut) return src;
    dibujarFondoBlanco(ctxOut, dw, dh);
    ctxOut.imageSmoothingEnabled = true;
    ctxOut.imageSmoothingQuality = 'high';
    ctxOut.drawImage(firmado, 0, 0, dw, dh);

    return canvasToDataUrl(out);
  } catch (err) {
    console.warn('⚠️ No se pudo normalizar la firma del cliente:', err);
    return src;
  }
}

function escalarFirmaSimple(img, opciones = {}) {
  const maxW = opciones.maxAncho || FIRMA_MAX_ANCHO;
  const maxH = opciones.maxAlto || FIRMA_MAX_ALTO;
  let dw = img.width || img.naturalWidth || 1;
  let dh = img.height || img.naturalHeight || 1;
  const r = Math.min(maxW / dw, maxH / dh);
  dw = Math.max(1, Math.round(dw * r));
  dh = Math.max(1, Math.round(dh * r));
  const out = document.createElement('canvas');
  out.width = dw;
  out.height = dh;
  const ctx = out.getContext('2d');
  if (!ctx) return '';
  dibujarFondoBlanco(ctx, dw, dh);
  ctx.drawImage(img, 0, 0, dw, dh);
  return canvasToDataUrl(out);
}

/**
 * Dimensiones para ImageRun (docx) respetando el ratio de la imagen.
 */
export function dimensionesFirmaWord(naturalWidth, naturalHeight, { maxWidthPx = 220, maxHeightPx = 100 } = {}) {
  const w = Number(naturalWidth) || maxWidthPx;
  const h = Number(naturalHeight) || maxHeightPx;
  const ratio = Math.min(maxWidthPx / w, maxHeightPx / h);
  return {
    width: Math.max(80, Math.round(w * ratio)),
    height: Math.max(36, Math.round(h * ratio)),
  };
}

/**
 * Lee dimensiones naturales desde dataURL (para calcular ratio en Word).
 */
export async function obtenerDimensionesDataUrl(dataUrl) {
  if (!dataUrl) return { width: 0, height: 0 };
  try {
    const img = await cargarImagenDesdeSrc(dataUrl);
    return {
      width: img.naturalWidth || img.width || 0,
      height: img.naturalHeight || img.height || 0,
    };
  } catch {
    return { width: 0, height: 0 };
  }
}
