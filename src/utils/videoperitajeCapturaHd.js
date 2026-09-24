/** Tope alto: almost sin recortar (evita fotos “chiquitas”). */
const MAX_LADO = 4096;
const JPEG_QUALITY = 0.95;
const TAKE_PHOTO_MS = 2800;

function medidasEscaladas(w, h) {
  const ancho = Number(w) || 0;
  const alto = Number(h) || 0;
  if (!ancho || !alto) return null;
  const largo = Math.max(ancho, alto);
  if (largo <= MAX_LADO) return { width: ancho, height: alto };
  const scale = MAX_LADO / largo;
  return {
    width: Math.max(1, Math.round(ancho * scale)),
    height: Math.max(1, Math.round(alto * scale)),
  };
}

function blobDesdeFuente(fuente, quality = JPEG_QUALITY) {
  const srcW = fuente.width || fuente.videoWidth || 0;
  const srcH = fuente.height || fuente.videoHeight || 0;
  const size = medidasEscaladas(srcW, srcH);
  if (!size) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fuente, 0, 0, size.width, size.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function conTimeout(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

async function blobDesdeTakePhoto(mediaStreamTrack) {
  if (!mediaStreamTrack || typeof ImageCapture !== 'function') return null;
  try {
    const ic = new ImageCapture(mediaStreamTrack);
    if (typeof ic.takePhoto !== 'function') return null;

    let photoSettings;
    try {
      const caps = await ic.getPhotoCapabilities?.();
      if (caps?.imageWidth?.max && caps?.imageHeight?.max) {
        photoSettings = {
          imageWidth: caps.imageWidth.max,
          imageHeight: caps.imageHeight.max,
        };
      }
    } catch {
      /* capabilities opcionales */
    }

    const raw = await conTimeout(
      photoSettings ? ic.takePhoto(photoSettings) : ic.takePhoto(),
      TAKE_PHOTO_MS
    );
    if (!raw || raw.size < 8000) return null;

    // Si el navegador ya entrega JPEG/PNG usable, subirlo sin re-comprimir.
    const tipo = String(raw.type || '');
    if (/^image\/(jpeg|jpg|png|webp)$/i.test(tipo) && raw.size > 40_000) {
      // Re-encode solo si es enorme (>12 MB) para no romper uploads lentos.
      if (raw.size < 12 * 1024 * 1024) return raw;
    }

    const bmp = await createImageBitmap(raw);
    const blob = await blobDesdeFuente(bmp);
    if (typeof bmp.close === 'function') bmp.close();
    return blob && blob.size > 1500 ? blob : null;
  } catch {
    return null;
  }
}

async function blobDesdeGrabFrame(mediaStreamTrack) {
  if (!mediaStreamTrack || typeof ImageCapture !== 'function') return null;
  try {
    const ic = new ImageCapture(mediaStreamTrack);
    if (typeof ic.grabFrame !== 'function') return null;
    const frame = await ic.grabFrame();
    const blob = await blobDesdeFuente(frame);
    if (typeof frame.close === 'function') frame.close();
    return blob && blob.size > 1500 ? blob : null;
  } catch {
    return null;
  }
}

export function pistaVideoDeSala(room) {
  const pubs = room?.localParticipant?.videoTrackPublications;
  if (!pubs) return null;
  for (const pub of pubs.values()) {
    const t = pub?.track?.mediaStreamTrack;
    if (t && t.kind === 'video' && t.readyState === 'live') return t;
  }
  return null;
}

/**
 * Prioridad: still de cámara (takePhoto) → frame HD → canvas del <video>.
 * takePhoto usa el sensor (varios MP); grabFrame solo la resolución del stream.
 */
export async function capturarFotoHd({ videoEl, mediaStreamTrack } = {}) {
  const still = await blobDesdeTakePhoto(mediaStreamTrack);
  if (still) return still;

  const frame = await blobDesdeGrabFrame(mediaStreamTrack);
  if (frame) return frame;

  if (videoEl?.videoWidth) {
    return blobDesdeFuente(videoEl);
  }
  return null;
}

export { capturarMejorDeDos, elegirMejorBlob } from './videoperitajeCalidadFoto.js';
