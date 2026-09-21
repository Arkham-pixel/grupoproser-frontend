function blobDesdeBitmap(bitmap, quality = 0.95) {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width || bitmap.videoWidth || 0;
  canvas.height = bitmap.height || bitmap.videoHeight || 0;
  if (!canvas.width || !canvas.height) return Promise.resolve(null);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
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

export async function capturarFotoHd({ videoEl, mediaStreamTrack } = {}) {
  if (mediaStreamTrack && typeof ImageCapture === 'function') {
    try {
      const ic = new ImageCapture(mediaStreamTrack);
      if (typeof ic.takePhoto === 'function') {
        const still = await ic.takePhoto();
        if (still && still.size > 8000) return still;
      }
      if (typeof ic.grabFrame === 'function') {
        const frame = await ic.grabFrame();
        const blob = await blobDesdeBitmap(frame, 0.95);
        if (blob && blob.size > 2000) return blob;
      }
    } catch {
      /* iOS / Safari a menudo no soporta ImageCapture */
    }
  }

  const el = videoEl;
  if (el?.videoWidth) {
    return blobDesdeBitmap(el, 0.95);
  }
  return null;
}
