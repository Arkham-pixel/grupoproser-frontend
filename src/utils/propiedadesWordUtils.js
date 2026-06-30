import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  ImageRun,
  BorderStyle,
  HeadingLevel,
} from 'docx';
import { isStoredFileReference } from './storedFilePath';
import { getUploadsUrlCandidates } from '../config/apiConfig';

export const WORD_FONT = 'Arial';
export const WORD_SIZE_PT12 = 24;

export const estilosDocumentoPropiedades = {
  default: {
    document: {
      run: {
        font: WORD_FONT,
        size: WORD_SIZE_PT12,
      },
      paragraph: {
        alignment: AlignmentType.JUSTIFIED,
      },
    },
  },
};

const bordesCeldaFoto = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' },
};

const margenCelda = { top: 60, bottom: 60, left: 100, right: 100 };
const margenCeldaFoto = { top: 100, bottom: 100, left: 140, right: 140 };

const FOTO_ANCHO_PX = 252;
const FOTO_ALTO_PX = 189;

export function tr(text, opts = {}) {
  return new TextRun({
    text: text ?? '',
    font: WORD_FONT,
    size: opts.size ?? WORD_SIZE_PT12,
    bold: Boolean(opts.bold),
    color: opts.color,
  });
}

export function pBody(text, opts = {}) {
  return new Paragraph({
    children: [tr(text, { bold: opts.bold, size: opts.size })],
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 100, before: opts.before ?? 0 },
  });
}

export function pHeading(text, level = HeadingLevel.HEADING_1, after = 200) {
  return new Paragraph({
    heading: level,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after },
    children: [tr(text, { bold: true })],
  });
}

export function pTitulo(text) {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [tr(text, { bold: true })],
  });
}

export function pSpacer(after = 200) {
  return new Paragraph({ text: '', spacing: { after } });
}

export function pCelda(text, opts = {}) {
  return new Paragraph({
    children: [tr(text, { bold: opts.bold })],
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
  });
}

export function celda(texto, opts = {}) {
  return new TableCell({
    width: opts.width,
    shading: opts.shading,
    margins: opts.margins ?? margenCelda,
    verticalAlign: opts.verticalAlign ?? VerticalAlign.CENTER,
    borders: opts.borders,
    children: [pCelda(texto, { bold: opts.bold, align: opts.align })],
  });
}

export function formatearCumpleWord(valor) {
  if (!valor) return '';
  const v = String(valor).toLowerCase();
  if (v === 'si' || v === 'sí') return '✔';
  if (v === 'no') return '✘';
  if (v === 'parcialmente') return 'Parcialmente';
  if (v === 'na') return 'NA';
  return valor;
}

export function shadingCumpleWord(cumple) {
  const v = cumple?.toLowerCase();
  if (v === 'si' || v === 'sí') return 'C6EFCE';
  if (v === 'no') return 'FFC7CE';
  if (v === 'parcialmente') return 'FFEB9C';
  return 'FFFFFF';
}

export function crearTablaInspeccionItems(items) {
  if (!items?.length) return null;

  const encabezado = (texto) => celda(texto, { bold: true, align: AlignmentType.CENTER });

  const rows = [
    new TableRow({
      children: [
        encabezado('PARÁMETRO'),
        encabezado('CUMPLE'),
        encabezado('SÍNTOMA'),
        encabezado('OBSERVACIÓN'),
      ],
    }),
  ];

  items.forEach((item) => {
    rows.push(
      new TableRow({
        children: [
          celda(item.parametro || ''),
          new TableCell({
            shading: { fill: shadingCumpleWord(item.cumple) },
            margins: margenCelda,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              pCelda(formatearCumpleWord(item.cumple || ''), { align: AlignmentType.CENTER }),
            ],
          }),
          celda(item.sintoma || ''),
          celda(item.observacion || ''),
        ],
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

export function crearTablaDatos(filas) {
  const rows = filas.map(([label, valor]) =>
    new TableRow({
      children: [celda(label, { bold: true }), celda(valor || '')],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

export function base64ToArrayBufferPropiedades(base64) {
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = window.atob(raw);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function fetchImageArrayBuffer(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const contentType = resp.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) return null;

    const blob = await resp.blob();
    if (!blob?.size) return null;
    return await blob.arrayBuffer();
  } catch {
    return null;
  }
}

export async function obtenerBufferFoto(foto) {
  if (!foto) return null;

  if (foto.base64) {
    const base64Data = foto.base64.startsWith('data:')
      ? foto.base64
      : `data:image/jpeg;base64,${foto.base64}`;
    return base64ToArrayBufferPropiedades(base64Data);
  }

  if (isStoredFileReference(foto.ruta)) {
    const candidatos = getUploadsUrlCandidates(foto.ruta);
    for (const url of candidatos) {
      const buf = await fetchImageArrayBuffer(url);
      if (buf) return buf;
    }
    return null;
  }

  if (foto.archivo instanceof File) {
    return foto.archivo.arrayBuffer();
  }

  if (foto.url && !foto.url.startsWith('blob:')) {
    try {
      const response = await fetch(foto.url);
      if (response.ok) {
        const blob = await response.blob();
        return blob.arrayBuffer();
      }
    } catch {
      return null;
    }
  }

  return null;
}

function celdaConFoto(imageBuffer, descripcion, opts = {}) {
  const children = imageBuffer
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: { width: FOTO_ANCHO_PX, height: FOTO_ALTO_PX },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [tr(descripcion || '')],
        }),
      ]
    : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [tr('Imagen no disponible')],
        }),
      ];

  return new TableCell({
    width: { size: opts.fullWidth ? 100 : 50, type: WidthType.PERCENTAGE },
    columnSpan: opts.fullWidth ? 2 : undefined,
    borders: bordesCeldaFoto,
    margins: margenCeldaFoto,
    verticalAlign: VerticalAlign.CENTER,
    children,
  });
}

export async function insertarFotosSeccionWord(docContent, fotos, titulo) {
  if (!fotos?.length) return;

  docContent.push(pHeading(titulo, HeadingLevel.HEADING_2, 160));

  for (let i = 0; i < fotos.length; i += 2) {
    const grupo = fotos.slice(i, i + 2);
    const celdas = [];

    for (const foto of grupo) {
      const buf = await obtenerBufferFoto(foto);
      celdas.push(celdaConFoto(buf, foto.descripcion, { fullWidth: grupo.length === 1 }));
    }

    docContent.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        rows: [new TableRow({ children: celdas })],
      })
    );
    docContent.push(pSpacer(160));
  }

  docContent.push(pSpacer(240));
}
