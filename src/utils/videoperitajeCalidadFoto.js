/**
 * Elige la foto más nítida entre varias (varianza del Laplaciano).
 */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function bitmapDesdeBlob(blob) {
  if (!blob) return null;
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* fallback */
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Puntuación de nitidez: más alto = más nítida. */
export async function puntuarNitidezBlob(blob) {
  if (!blob || blob.size < 800) return 0;
  const bmp = await bitmapDesdeBlob(blob);
  if (!bmp) return blob.size;
  const maxW = 320;
  const scale = Math.min(1, maxW / (bmp.width || maxW));
  const w = Math.max(8, Math.round((bmp.width || maxW) * scale));
  const h = Math.max(8, Math.round((bmp.height || maxW) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  ctx.drawImage(bmp, 0, 0, w, h);
  if (typeof bmp.close === 'function') bmp.close();
  const { data } = ctx.getImageData(0, 0, w, h);
  // Escala de grises + Laplaciano 4-vecinos → varianza
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const lap =
        gray[i - w] + gray[i - 1] + gray[i + 1] + gray[i + w] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n += 1;
    }
  }
  if (!n) return blob.size;
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  // Preferir también algo de resolución (bytes) como desempate suave
  return variance + Math.min(blob.size, 400_000) / 400_000;
}

export async function elegirMejorBlob(blobs = []) {
  const validos = (blobs || []).filter((b) => b && b.size > 800);
  if (!validos.length) return null;
  if (validos.length === 1) return validos[0];
  let mejor = validos[0];
  let mejorScore = await puntuarNitidezBlob(mejor);
  for (let i = 1; i < validos.length; i += 1) {
    const score = await puntuarNitidezBlob(validos[i]);
    if (score > mejorScore) {
      mejor = validos[i];
      mejorScore = score;
    }
  }
  return mejor;
}

/**
 * Toma dos capturas con un pequeño intervalo y devuelve solo la más nítida.
 * @param {() => Promise<Blob|null>} capturarUna
 * @param {{ delayMs?: number }} [opts]
 */
export async function capturarMejorDeDos(capturarUna, opts = {}) {
  const delayMs = Number(opts.delayMs) >= 0 ? Number(opts.delayMs) : 140;
  const a = await capturarUna();
  await sleep(delayMs);
  const b = await capturarUna();
  return elegirMejorBlob([a, b]);
}
