/**
 * Firma del cliente del liquidador Alfa → ImageRun / párrafos Word.
 * Fuente única: liquidador.firmaCliente (data URL del pad).
 */
import { AlignmentType, ImageRun, Paragraph, TextRun } from 'docx';
import {
  dimensionesFirmaWord,
  obtenerDimensionesDataUrl,
} from '../../utils/normalizarFirmaImagen.js';

const run = (text, opts = {}) =>
  new TextRun({
    text: String(text ?? ''),
    font: opts.font || 'Arial',
    size: opts.size || 20,
    bold: !!opts.bold,
  });

/**
 * @returns {Promise<{ data: ArrayBuffer, type: string, width: number, height: number } | null>}
 */
export async function imagenFirmaClienteAlfa(firmaDataUrl) {
  if (!firmaDataUrl || typeof firmaDataUrl !== 'string') return null;
  const trimmed = firmaDataUrl.trim();
  if (!trimmed.startsWith('data:image')) return null;

  const mimeMatch = trimmed.match(/^data:image\/(png|jpe?g|gif|webp);base64,/i);
  const idx = trimmed.indexOf('base64,');
  const raw = idx !== -1 ? trimmed.slice(idx + 7) : '';
  if (!raw) return null;

  let tipo = 'png';
  if (mimeMatch) {
    const ext = mimeMatch[1].toLowerCase();
    tipo = ext === 'jpg' || ext === 'jpeg' ? 'jpg' : ext === 'webp' ? 'png' : ext;
  }

  try {
    const data = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)).buffer;
    let width = 220;
    let height = 90;
    try {
      const dims = await obtenerDimensionesDataUrl(trimmed);
      const sized = dimensionesFirmaWord(dims.width, dims.height, {
        maxWidthPx: 240,
        maxHeightPx: 110,
      });
      width = sized.width;
      height = sized.height;
    } catch {
      /* defaults */
    }
    return { data, type: tipo, width, height };
  } catch {
    return null;
  }
}

/**
 * Párrafos de firma del beneficiario/cliente para Finiquito y cartas.
 * Si hay firma en el liquidador, la inserta; si no, deja la línea en blanco.
 */
export async function parrafosFirmaClienteAlfa({
  liquidador = {},
  cedula = '',
  nombre = '',
  etiquetaFirma = 'FIRMA',
  mostrarLineaSiVacia = true,
} = {}) {
  const firmaUrl = liquidador?.firmaCliente || '';
  const nombreFinal =
    String(liquidador?.nombreFirmante || nombre || '').trim() || '—';
  const img = await imagenFirmaClienteAlfa(firmaUrl);

  const out = [];

  if (img) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40, before: 80 },
        children: [
          new ImageRun({
            data: img.data,
            transformation: { width: img.width, height: img.height },
            type: img.type,
          }),
        ],
      })
    );
  } else if (mostrarLineaSiVacia) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40, before: 80 },
        children: [run('___________________________', { size: 20 })],
      })
    );
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 40 },
      children: [run(etiquetaFirma, { bold: true, size: 20 })],
    })
  );

  if (cedula) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40 },
        children: [run('CC. ', { bold: true }), run(String(cedula))],
      })
    );
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [run('Nombre: ', { bold: true }), run(nombreFinal)],
    })
  );

  return out;
}

/** Solo la imagen (o null) para insertar junto a un rótulo "Firma:". */
export async function parrafoSoloImagenFirmaClienteAlfa(liquidador = {}) {
  const img = await imagenFirmaClienteAlfa(liquidador?.firmaCliente || '');
  if (!img) {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 40 },
      children: [run('Firma: _______________________', { size: 20 })],
    });
  }
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 40, before: 40 },
    children: [
      run('Firma: ', { bold: true, size: 20 }),
      new ImageRun({
        data: img.data,
        transformation: { width: img.width, height: img.height },
        type: img.type,
      }),
    ],
  });
}
