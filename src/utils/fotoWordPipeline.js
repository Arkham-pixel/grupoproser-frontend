/**
 * Carga y compactación de fotos para informes Word (Sura y módulos CAT).
 * Reduce JPEG al tamaño de impresión para no inflar el .docx en redes lentas.
 */

export const FOTO_FETCH_PARALELO = 8;
export const FOTO_WORD_MAX_LADO = 960;
export const FOTO_WORD_CALIDAD = 0.72;

export async function mapConCurrencia(items, limite, iterar) {
  const lista = Array.isArray(items) ? items : [];
  const resultados = new Array(lista.length);
  let siguiente = 0;
  const n = Math.max(1, Math.min(limite, lista.length || 1));
  await Promise.all(
    Array.from({ length: lista.length ? n : 0 }, async () => {
      while (siguiente < lista.length) {
        const idx = siguiente;
        siguiente += 1;
        resultados[idx] = await iterar(lista[idx], idx);
      }
    })
  );
  return resultados;
}

function bytesDeEntrada(img) {
  if (!img) return null;
  if (img instanceof Uint8Array) return img;
  if (img instanceof ArrayBuffer) return new Uint8Array(img);
  if (img.bytes instanceof Uint8Array) return img.bytes;
  if (img.bytes instanceof ArrayBuffer) return new Uint8Array(img.bytes);
  return null;
}

function tipoDeEntrada(img, bytes) {
  if (img && typeof img === 'object' && img.type) {
    return img.type === 'png' ? 'png' : 'jpg';
  }
  if (bytes?.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  return 'jpg';
}

/** Reduce el JPEG al tamaño de impresión. Recibe { bytes, type } o Uint8Array. */
export async function compactarFotoParaWord(img) {
  const original = bytesDeEntrada(img);
  if (!original?.length) return null;
  const tipoOriginal = tipoDeEntrada(img, original);

  const compactados = await new Promise((resolve) => {
    try {
      const esPng = tipoOriginal === 'png';
      const blob = new Blob([original], { type: esPng ? 'image/png' : 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      const el = new Image();
      el.onload = () => {
        try {
          let w = el.naturalWidth || el.width;
          let h = el.naturalHeight || el.height;
          if (!w || !h) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          const scale = Math.min(1, FOTO_WORD_MAX_LADO / Math.max(w, h));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(el, 0, 0, w, h);
          canvas.toBlob(
            async (out) => {
              URL.revokeObjectURL(url);
              if (!out) {
                resolve(null);
                return;
              }
              resolve(new Uint8Array(await out.arrayBuffer()));
            },
            'image/jpeg',
            FOTO_WORD_CALIDAD
          );
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      el.src = url;
    } catch {
      resolve(null);
    }
  });

  if (compactados?.length) {
    return { bytes: compactados, type: 'jpg' };
  }
  return { bytes: original, type: tipoOriginal };
}
