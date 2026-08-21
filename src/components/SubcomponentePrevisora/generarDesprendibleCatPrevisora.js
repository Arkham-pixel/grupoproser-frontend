/**
 * Desprendible Manual CAT Previsora (inspección / exposición).
 * Incluye severidad por nivel (Aplica / No aplica), observaciones y fotos.
 * Embebe fotos reales del caso (orden + descripción).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import logoPrevisoraUrl from '../../assets/zurich-logo.png';
import { urlDescargaArchivoPrevisora } from '../../services/previsoraService.js';
import { nombreUsuarioPlataforma } from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
import {
  DISCLAIMER_CAT_PREVISORA,
  SEVERIDAD_CAT_PREVISORA,
  formatDate,
  normalizeSeveridadCatNiveles,
} from './previsoraHelpers.js';

const thin = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: none, bottom: none, left: none, right: none };
const W = 10080; // ~7" usable
const FOTO_COL = 5040;

async function loadLogoBytes(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
    const isJpg = u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8;
    if (!isPng && !isJpg) return null;
    return { bytes: u8, type: isPng ? 'png' : 'jpg' };
  } catch {
    return null;
  }
}

async function fetchImageBytes(url) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const buf = await blob.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
    const isJpg = u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8;
    const type = isPng ? 'png' : isJpg ? 'jpg' : blob.type.includes('png') ? 'png' : 'jpg';
    return { bytes: u8, type };
  } catch {
    return null;
  }
}

const cell = (text, opts = {}) => {
  const {
    bold = false,
    width = 2000,
    fill = null,
    align = AlignmentType.LEFT,
    fontSize = 18,
  } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: text == null || text === '' ? '—' : String(text),
            bold,
            font: 'Arial',
            size: fontSize,
          }),
        ],
      }),
    ],
  });
};

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: opts.before ?? 80, after: opts.after ?? 80 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [
      new TextRun({
        text: text || '',
        bold: Boolean(opts.bold),
        italics: Boolean(opts.italics),
        font: 'Arial',
        size: opts.size || 20,
        color: opts.color,
      }),
    ],
  });

const labelAplica = (aplica) => {
  if (aplica === 'SI') return 'APLICA';
  return 'NO APLICA';
};

function celdaFotoVacia() {
  return new TableCell({
    borders: noBorders,
    width: { size: FOTO_COL, type: WidthType.DXA },
    children: [new Paragraph({ children: [] })],
  });
}

function celdaFoto({ titulo, descripcion, img, fallo }) {
  const children = [];
  if (img) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 40 },
        children: [
          new ImageRun({
            data: img.bytes,
            transformation: { width: 280, height: 190 },
            type: img.type,
          }),
        ],
      })
    );
  } else if (fallo) {
    children.push(
      p(`${titulo} (foto no embebida)`, {
        size: 14,
        italics: true,
        align: AlignmentType.CENTER,
        before: 40,
        after: 20,
      })
    );
  }
  children.push(
    p(titulo, {
      align: AlignmentType.CENTER,
      size: 14,
      bold: true,
      before: 20,
      after: descripcion ? 10 : 60,
    })
  );
  if (descripcion) {
    children.push(
      p(descripcion, {
        align: AlignmentType.CENTER,
        size: 13,
        before: 0,
        after: 60,
      })
    );
  }
  return new TableCell({
    borders: noBorders,
    width: { size: FOTO_COL, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

async function construirParrafosFotos(caso = {}) {
  const archivos = Array.isArray(caso.archivos) ? caso.archivos : [];
  const fotosOrdenadas = [...archivos]
    .filter((a) => {
      const et = String(a?.etiqueta || '').toUpperCase();
      const nombre = String(a?.nombreOriginal || a?.nombreArchivo || '');
      return (
        et === 'FOTOS' ||
        et === 'INSPECCION' ||
        et.startsWith('FOTO_') ||
        /\.(jpe?g|png|gif|webp)$/i.test(nombre) ||
        String(a?.tipoMime || '').startsWith('image/')
      );
    })
    .sort((a, b) => {
      const oa = Number.isFinite(Number(a?.orden)) ? Number(a.orden) : Number.MAX_SAFE_INTEGER;
      const ob = Number.isFinite(Number(b?.orden)) ? Number(b.orden) : Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return 0;
    });

  if (!fotosOrdenadas.length) {
    return [p('Sin fotos adjuntas en la inspección.', { italics: true, size: 18 })];
  }

  const preparadas = [];
  let incluidas = 0;
  for (let i = 0; i < fotosOrdenadas.length; i += 1) {
    const a = fotosOrdenadas[i];
    const titulo = `${i + 1}. ${a.nombreOriginal || a.nombreArchivo || 'Foto'}`;
    const descripcion = String(a.descripcion || '').trim();
    const url = urlDescargaArchivoPrevisora(a.ruta);
    const img = url ? await fetchImageBytes(url) : null;
    if (img) incluidas += 1;
    preparadas.push({ titulo, descripcion, img, fallo: !img });
  }

  const out = [];
  if (!incluidas) {
    out.push(
      p('No se pudieron embeber las imágenes. Verifique acceso a los archivos subidos.', {
        italics: true,
        size: 16,
        before: 40,
        after: 80,
      })
    );
  }

  const filas = [];
  for (let i = 0; i < preparadas.length; i += 2) {
    const izq = preparadas[i];
    const der = preparadas[i + 1];
    filas.push(
      new TableRow({
        children: [
          celdaFoto(izq),
          der ? celdaFoto(der) : celdaFotoVacia(),
        ],
      })
    );
  }

  out.push(
    new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [FOTO_COL, FOTO_COL],
      rows: filas,
    })
  );
  return out;
}

/**
 * @param {object} caso — caso Previsora (con severidadCatNiveles / evidenciaCat)
 */
export async function generarDesprendibleCatPrevisora(caso = {}) {
  const niveles = normalizeSeveridadCatNiveles(caso.severidadCatNiveles, caso.severidadCat);

  const perito =
    nombreUsuarioPlataforma() ||
    String(caso.ajustador || '').trim() ||
    '—';
  const direccion =
    caso.addressNumber ||
    caso.direccion ||
    caso.direccionInspeccionSugerida ||
    '—';

  const headerInfo = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [2520, 2520, 2520, 2520],
    rows: [
      new TableRow({
        children: [
          cell('Asegurado', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.asegurado || '—', { width: 2520 }),
          cell('Risk ID', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.riskId || caso.identificacion || '—', { width: 2520 }),
        ],
      }),
      new TableRow({
        children: [
          cell('Dirección', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(direccion, { width: 2520 }),
          cell('Ciudad', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.catUbicacionReferencia || caso.ciudad || '—', { width: 2520 }),
        ],
      }),
      new TableRow({
        children: [
          cell('Fecha visita', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(formatDate(caso.fechaInspeccion), { width: 2520 }),
          cell('Perito', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(perito, { width: 2520 }),
        ],
      }),
    ],
  });

  const severidadRows = [
    new TableRow({
      children: [
        headCell('Nivel', 1440),
        headCell('Descripción del daño observado', 6480),
        headCell('Aplica', 2160),
      ],
    }),
    ...SEVERIDAD_CAT_PREVISORA.map((s) => {
      const key = String(s.valor);
      const item = niveles[key] || { aplica: null, observacion: '' };
      const aplicaFill =
        item.aplica === 'SI' ? 'C6EFCE' : item.aplica === 'NO' ? 'FFC7CE' : 'FFFFFF';
      return new TableRow({
        children: [
          cell(`Nivel ${s.valor}`, { bold: true, width: 1440 }),
          cell(s.descripcion, { width: 6480, fontSize: 16 }),
          cell(labelAplica(item.aplica), {
            bold: true,
            width: 2160,
            align: AlignmentType.CENTER,
            fill: aplicaFill,
          }),
        ],
      });
    }),
  ];

  const severidadTable = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [1440, 6480, 2160],
    rows: severidadRows,
  });

  const fotoParrafos = await construirParrafosFotos(caso);
  const logoPrevisora = await loadLogoBytes(logoPrevisoraUrl);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, bottom: 720, left: 720, right: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 60 },
                border: {
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                },
                children: logoPrevisora
                  ? [
                      new ImageRun({
                        data: logoPrevisora.bytes,
                        transformation: { width: 110, height: 44 },
                        type: logoPrevisora.type,
                      }),
                    ]
                  : [
                      new TextRun({
                        text: 'PREVISORA',
                        bold: true,
                        font: 'Arial',
                        size: 20,
                        color: '002060',
                      }),
                    ],
              }),
            ],
          }),
        },
        children: [
          p('Manual para Inspecciones', { bold: true, size: 28, before: 0, after: 40 }),
          p('Inspecciones visuales y reporte de exposición por Evento CAT', {
            bold: true,
            size: 20,
            before: 0,
            after: 40,
          }),
          p('DESPRENDIBLE DE INSPECCIÓN CAT (diligenciado)', {
            bold: true,
            size: 18,
            color: '002060',
            before: 0,
            after: 160,
          }),

          headerInfo,
          p('', { before: 120, after: 0 }),

          new Table({
            width: { size: W, type: WidthType.DXA },
            columnWidths: [W],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    width: { size: W, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'FFF2CC' },
                    children: [
                      p(
                        'Objetivo: entregar al ajustador información clave, sencilla y resumida para clasificar la severidad, completar la base de Excel y registrar evidencia fotográfica/documental. Este documento no autoriza a confirmar cobertura, negar cobertura, prometer pagos o actuar como vocero de Previsora.',
                        { size: 17, before: 60, after: 60 }
                      ),
                    ],
                  }),
                ],
              }),
            ],
          }),

          p('1. Clasificación de severidad para reporte de exposición', {
            bold: true,
            size: 22,
            before: 240,
            after: 80,
          }),
          p(
            'La severidad es un criterio operativo preliminar para priorizar el reporte de exposición. No constituye definición de cobertura ni liquidación del siniestro.',
            { size: 17, before: 0, after: 120 }
          ),
          severidadTable,

          p('2. Observaciones generales de inspección', {
            bold: true,
            size: 22,
            before: 280,
            after: 80,
          }),
          p(caso.observacionesCat || 'Sin observaciones generales.', {
            size: 18,
            before: 0,
            after: 120,
          }),

          p('3. Fotos de la inspección', {
            bold: true,
            size: 22,
            before: 200,
            after: 80,
          }),
          ...fotoParrafos,

          p('', { before: 200, after: 0 }),
          new Table({
            width: { size: W, type: WidthType.DXA },
            columnWidths: [W],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    width: { size: W, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
                    children: [
                      p('Recordatorio operativo', { bold: true, size: 17, before: 60, after: 40 }),
                      p(
                        'Documentar hechos observables, no conclusiones de cobertura. Mantener trazabilidad de fecha, hora, ubicación, fuente y soporte.',
                        { size: 16, before: 0, after: 40 }
                      ),
                      p(DISCLAIMER_CAT_PREVISORA, { size: 15, italics: true, before: 40, after: 60 }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          p(
            `Generado desde ARNALD — ${new Date().toLocaleString('es-CO')}`,
            { size: 14, color: '888888', before: 200, after: 0 }
          ),
        ],
      },
    ],
  });

  return doc;
}

function headCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, fill: '002060' },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            bold: true,
            font: 'Arial',
            size: 16,
            color: 'FFFFFF',
          }),
        ],
      }),
    ],
  });
}

export async function descargarDesprendibleCatPrevisora(caso) {
  const doc = await generarDesprendibleCatPrevisora(caso);
  const blob = await Packer.toBlob(doc);
  const nombre = `Desprendible_CAT_PREVISORA_CAT_${caso.consecutivo || caso.identificacion || 'caso'}.docx`;
  saveAs(blob, nombre);
  return nombre;
}
