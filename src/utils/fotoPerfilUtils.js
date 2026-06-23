const OUTPUT_SIZE = 512;

export function calcularEscalaBase(naturalWidth, naturalHeight, viewportSize) {
  if (!naturalWidth || !naturalHeight) return 1;
  return Math.max(viewportSize / naturalWidth, viewportSize / naturalHeight);
}

export function generarBlobFotoPerfil(img, { viewportSize, zoom, offsetX, offsetY, outputSize = OUTPUT_SIZE }) {
  return new Promise((resolve, reject) => {
    if (!img?.naturalWidth) {
      reject(new Error('Imagen no cargada'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('No se pudo crear el canvas'));
      return;
    }

    const baseScale = calcularEscalaBase(img.naturalWidth, img.naturalHeight, viewportSize);
    const displayScale = baseScale * zoom;
    const dw = img.naturalWidth * displayScale;
    const dh = img.naturalHeight * displayScale;
    const factor = outputSize / viewportSize;
    const dx = (viewportSize / 2 - dw / 2 + offsetX) * factor;
    const dy = (viewportSize / 2 - dh / 2 + offsetY) * factor;

    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw * factor, dh * factor);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      },
      'image/jpeg',
      0.92
    );
  });
}

export async function cargarImagenDesdeSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

export async function archivoAFotoRecortada(file, opciones) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
  const img = await cargarImagenDesdeSrc(dataUrl);
  return generarBlobFotoPerfil(img, opciones);
}
