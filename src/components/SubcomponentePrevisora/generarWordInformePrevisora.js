import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { descargarBlob } from '../../utils/descargarArchivo.js';
import { lineasPieMapaInforme } from '../../utils/mapaInformeAtribucion.js';
import { seccionesConEncabezadoUnico } from '../../utils/wordEncabezadoUnico.js';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10, totalFilaPresupuesto } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { filasPresupuestoParaWord } from '../SubcomponenteLiquidadorCatExpress/syncLiquidadorCatExpressAlInforme.js';
import { construirTablaContenidosWord } from '../SubcomponenteEvaluacionSismicaNSR10/construirTablaContenidosWord.js';
import {
  calcularLiquidacionPrevisora,
  completarFilasPolizaCoberturaPrevisora,
  defaultInformeUnicoPrevisora,
  esInformePreliminarPrevisora,
  etiquetaEncabezadoInformePrevisora,
  etiquetaReporteCuadroPrevisora,
  etiquetaTituloInformePrevisora,
  formatearMonto,
  formatDateLarga,
  itemsPlanosPrevisora,
  mapcasoPrevisoraALiquidador,
  normalizarTipoInformePrevisora,
  parsearNumero,
  prefijoArchivoInformePrevisora,
  reservaSugeridaPrevisora,
} from './liquidadorPrevisoraHelpers.js';
import { urlDescargaArchivoPrevisora } from '../../services/previsoraService.js';
import {
  paginasTodasCotizacionesPdfRiesgosPrevisora,
  resumenCotizacionesPdfRiesgosPrevisora,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';
import { candidatosUrlArchivoParaFetch } from '../../services/storageSignedUrl.js';
import { fetchBytesImagenUrl } from '../../utils/fetchBytesImagenUrl.js';

/** Estética informe Previsora: misma plantilla limpia que Zurich (Calibri, fichas suaves) */
const COLOR_PREVISORA = '002060';
const COLOR_TEXT = '1E293B';
const COLOR_MUTED = '64748B';
const COLOR_BORDER = 'CBD5E1';
const COLOR_HEADER_BG = 'E8EEF5';
const COLOR_LABEL_BG = 'F1F5F9';
const COLOR_TOTAL_BG = 'ECFDF5';
const COLOR_WHITE = 'FFFFFF';

const borderCuadro = { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER };
const bordersCuadro = {
  top: borderCuadro,
  bottom: borderCuadro,
  left: borderCuadro,
  right: borderCuadro,
  insideHorizontal: borderCuadro,
  insideVertical: borderCuadro,
};
const thin = { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const none = { style: BorderStyle.NONE, size: 0, color: COLOR_WHITE };
const noBorders = { top: none, bottom: none, left: none, right: none };
const bordesEncabezado = {
  top: none,
  bottom: none,
  left: none,
  right: none,
  insideHorizontal: none,
  insideVertical: none,
};
/** Ficha label|valor: borde exterior + líneas horizontales, sin verticales agresivas */
const borderFicha = { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER };
const bordersFicha = {
  top: borderFicha,
  bottom: borderFicha,
  left: borderFicha,
  right: borderFicha,
  insideHorizontal: borderFicha,
  insideVertical: none,
};

const FONT = 'Calibri';
/** Tamaño Word: half-points → 22 = 11 pt */
const SIZE_12 = 22;
const SIZE_TITLE = 32; // 16 pt
const SIZE_HEADING = 26; // 13 pt
const SIZE_META = 18; // 9 pt
const SIZE_NSR = 16; // 8 pt — tabla presupuesto landscape

const PAGE_W_PORTRAIT = 9360;
const PAGE_W_LANDSCAPE = 15200;
/** Fotos de inspección: grilla 2×2 = 4 por página */
const FOTOS_POR_PAGINA = 4;
const FOTOS_COLS = 2;
const FOTO_GRID_ANCHO = 280;
const FOTO_GRID_ALTO = 200;
const FOTO_CELL_W = Math.floor(PAGE_W_PORTRAIT / FOTOS_COLS);

/** Anchos DXA del presupuesto NSR-10 completo (landscape ≈ 15.200 útil). */
const NSR_COLS = {
  widths: [1500, 1500, 2800, 550, 700, 1050, 1050, 850, 850, 1550, 1100],
  labels: [
    'CAPÍTULO',
    'COMPONENTE',
    'ACTIVIDAD / REPARACIÓN',
    'UND',
    'CANT.',
    'VLR. UNITARIO',
    'VLR. TOTAL',
    'PRIORIDAD',
    '¿CUBIERTO?',
    'OBSERVACIÓN',
    'FUENTE',
  ],
};
const NSR_TABLE_W = NSR_COLS.widths.reduce((a, b) => a + b, 0);

const txt = (v, fallback = '—') => {
  const s = String(v ?? '').trim();
  if (!s || s === 'null' || s === 'undefined') return fallback;
  return s;
};

const fmtFechaCorta = (value) => {
  if (value == null || value === '') return '—';
  try {
    const raw = String(value).trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return raw;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return String(value);
  }
};

const fmtFecha = (value) => {
  if (value == null || value === '') return '—';
  return formatDateLarga(value);
};

const money = (v) => `$ ${formatearMonto(v)}`;

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

/**
 * Encabezado limpio (plantilla Zurich): Logo Proser | marca + tipo + siniestro/fecha | Logo Previsora
 * `landscape` usa el ancho de página horizontal para que no se desplace el header.
 */
async function crearEncabezadoPrevisora({ caso = {}, informe = {}, landscape = false } = {}) {
  const base = import.meta.env.BASE_URL || '/';
  let proser = await loadLogoBytes(`${base}templates/logo-grupoproser.png`);
  if (!proser) proser = await loadLogoBytes(`${base}templates/logo-grupoproser.jpg`);
  const Previsora =
    (await loadLogoBytes(`${base}templates/logo-previsora.png`)) ||
    (await loadLogoBytes(`${base}templates/logo-previsora.jpg`));

  const siniestro = txt(caso.siniestro || caso.consecutivo, '—');
  const fecha = fmtFechaCorta(informe.fechaInforme || new Date());
  const pageW = landscape ? PAGE_W_LANDSCAPE : PAGE_W_PORTRAIT;
  const sideW = landscape ? 2800 : 2200;
  const midW = pageW - sideW * 2;

  const logoCell = (logo, fallbackText, align = AlignmentType.CENTER) =>
    new TableCell({
      borders: noBorders,
      width: { size: sideW, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      children: [
        new Paragraph({
          alignment: align,
          spacing: { after: 0 },
          children: logo
            ? [
                new ImageRun({
                  data: logo.bytes,
                  transformation:
                    logo === Previsora
                      ? { width: 140, height: 69 }
                      : { width: 130, height: 42 },
                  type: logo.type,
                }),
              ]
            : [
                new TextRun({
                  text: fallbackText,
                  bold: true,
                  font: FONT,
                  size: SIZE_12,
                  color: COLOR_PREVISORA,
                }),
              ],
        }),
      ],
    });

  return new Header({
    children: [
      new Table({
        width: { size: pageW, type: WidthType.DXA },
        columnWidths: [sideW, midW, sideW],
        borders: bordesEncabezado,
        rows: [
          new TableRow({
            children: [
              logoCell(proser, 'GRUPO PROSER', AlignmentType.LEFT),
              new TableCell({
                borders: noBorders,
                width: { size: midW, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 40, bottom: 40, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    spacing: { after: 20 },
                    children: [
                      new TextRun({
                        text: 'Previsora',
                        font: FONT,
                        size: SIZE_HEADING,
                        bold: true,
                        color: COLOR_PREVISORA,
                      }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: etiquetaEncabezadoInformePrevisora(informe.tipoInforme),
                        font: FONT,
                        size: SIZE_META,
                        color: COLOR_MUTED,
                      }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      new TextRun({
                        text: `SINIESTRO ${siniestro}`,
                        font: FONT,
                        size: SIZE_META,
                        bold: true,
                        color: COLOR_TEXT,
                      }),
                      new TextRun({
                        text: `   ·   FECHA ${fecha}`,
                        font: FONT,
                        size: SIZE_META,
                        color: COLOR_MUTED,
                      }),
                    ],
                  }),
                ],
              }),
              logoCell(Previsora, 'Previsora', AlignmentType.RIGHT),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60, after: 0 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 18, color: COLOR_PREVISORA, space: 1 },
        },
        children: [],
      }),
    ],
  });
}

/** Título centrado con tipo de informe subrayado (misma fórmula Zurich). */
function crearTituloInformeUnico(info = {}) {
  const tipo = etiquetaTituloInformePrevisora(info.tipoInforme);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 200 },
    children: [
      new TextRun({
        text: 'INFORME ',
        bold: true,
        size: SIZE_TITLE,
        font: FONT,
        color: COLOR_PREVISORA,
      }),
      new TextRun({
        text: tipo,
        bold: true,
        size: SIZE_TITLE,
        font: FONT,
        color: COLOR_PREVISORA,
        underline: {},
      }),
      new TextRun({
        text: ' DE SINIESTRO',
        bold: true,
        size: SIZE_TITLE,
        font: FONT,
        color: COLOR_PREVISORA,
      }),
    ],
  });
}

const p = (text, opts = {}) =>
  new Paragraph({
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 100 },
    children: [
      new TextRun({
        text: String(text ?? ''),
        font: FONT,
        size: opts.size || SIZE_12,
        bold: !!opts.bold,
        color: opts.color || COLOR_TEXT,
      }),
    ],
  });

const heading = (text) =>
  new Paragraph({
    spacing: { before: 280, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER, space: 4 },
    },
    children: [
      new TextRun({
        text: String(text),
        font: FONT,
        size: SIZE_HEADING,
        bold: true,
        color: COLOR_PREVISORA,
      }),
    ],
  });

const cell = (text, opts = {}) => {
  const lines = String(text ?? '').split(/\n/);
  const isHeader = Boolean(opts.header);
  const isTotal = Boolean(opts.total);
  const fill = opts.shading
    ? opts.shading
    : isHeader
      ? COLOR_HEADER_BG
      : isTotal
        ? COLOR_TOTAL_BG
        : opts.label
          ? COLOR_LABEL_BG
          : COLOR_WHITE;
  return new TableCell({
    borders: opts.noBorder ? noBorders : opts.cuadro ? bordersCuadro : borders,
    width: { size: opts.width || 2300, type: WidthType.DXA },
    columnSpan: opts.columnSpan || 1,
    margins: {
      top: opts.compact ? 36 : 60,
      bottom: opts.compact ? 36 : 60,
      left: opts.compact ? 40 : 90,
      right: opts.compact ? 40 : 90,
    },
    shading: { fill },
    verticalAlign: opts.verticalAlign || VerticalAlign.CENTER,
    children: lines.map(
      (line) =>
        new Paragraph({
          alignment: opts.alignment || AlignmentType.LEFT,
          spacing: { after: 0 },
          children: [
            new TextRun({
              text: line,
              font: FONT,
              size: opts.size || SIZE_12,
              bold: isHeader || isTotal || !!opts.bold,
              color: opts.color || COLOR_TEXT,
            }),
          ],
        })
    ),
  });
};

/** Fila etiqueta | valor — ficha limpia con label sombreado */
const campoFila = (label, value, opts = {}) =>
  new TableRow({
    children: [
      cell(label, {
        bold: true,
        width: opts.labelW || 4200,
        size: opts.size || SIZE_12,
        cuadro: true,
        label: !opts.total,
        total: !!opts.total,
        shading: opts.labelShading || (opts.total ? undefined : COLOR_LABEL_BG),
      }),
      cell(String(value ?? '—'), {
        width: opts.valueW || 5160,
        size: opts.size || SIZE_12,
        bold: !!opts.boldValue || !!opts.total,
        cuadro: true,
        total: !!opts.total,
        shading: opts.valueShading,
      }),
    ],
  });

/** Cuadro ficha principal del siniestro (plantilla limpia tipo Zurich). */
function construirCuadroPrincipal({ caso = {}, enc = {}, info = {}, totales = {} } = {}) {
  const vigencia =
    caso.fechaInicioPoliza || caso.fechaFinPoliza
      ? `${fmtFechaCorta(caso.fechaInicioPoliza)} – ${fmtFechaCorta(caso.fechaFinPoliza)}`
      : '—';

  const reserva = reservaSugeridaPrevisora(info);
  const esPreliminar = esInformePreliminarPrevisora(info);
  const filas = [
    ['REPORTE No', etiquetaReporteCuadroPrevisora(info.tipoInforme)],
    ['CONSECUTIVO', txt(caso.consecutivo)],
    ['SINIESTRO No', txt(caso.siniestro || enc.siniestro)],
    ['TOMADOR', txt(caso.tomador || enc.tomador)],
    ['ASEGURADO / CONTACTO', txt(enc.asegurado || caso.informacionContacto || caso.asegurado)],
    ['CORREO ELECTRÓNICO', txt(caso.correo)],
    ['CELULAR', txt(caso.celular)],
    ['IDENTIFICACIÓN', txt(caso.identificacion || enc.identificacion)],
    ['TIPO IDENTIFICACIÓN', txt(caso.tipoIdentificacion || enc.tipoIdentificacion)],
    ['N° PÓLIZA', txt(caso.numeroPoliza || enc.poliza)],
    ['TIPO PÓLIZA', txt(caso.tipoPoliza || enc.tipoPoliza)],
    ['CAUSA', txt(caso.causa || enc.causa)],
    ['N° CRÉDITO', txt(caso.numeroCredito || enc.credito)],
    ['VIGENCIA', vigencia],
    ['COBERTURA / EVENTO', txt(caso.cobertura || enc.cobertura || enc.evento)],
    ['DIRECCIÓN RIESGO ASEGURADO', txt(info.direccionRiesgo || caso.direccionPredio || enc.direccion)],
    [
      'CIUDAD / DEPARTAMENTO',
      `${txt(caso.ciudad || enc.ciudad)} / ${txt(caso.departamento || enc.departamento)}`,
    ],
    ['FECHA DE OCURRENCIA', fmtFechaCorta(caso.fechaSiniestro || enc.fechaSiniestro)],
    ['FECHA DE INSPECCIÓN', fmtFechaCorta(caso.fechaInspeccion)],
    ['FECHA DEL INFORME', fmtFechaCorta(info.fechaInforme || new Date())],
    ['AJUSTADOR', txt(info.ajustadorNombre || caso.ajustador || enc.ajustador)],
    ...(esPreliminar
      ? [['RESERVA SUGERIDA', money(reserva || caso.reserva || caso.valorReservaPreventivaPromedio)]]
      : [
          ['RESERVA PRELIMINAR', money(reserva || caso.reserva || caso.valorReservaPreventivaPromedio)],
          ['INDEMNIZACIÓN SUGERIDA', money(totales.totalIndemnizar)],
        ]),
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4200, 5160],
    borders: bordersFicha,
    rows: filas.map(([etiqueta, valor]) => {
      const esTotal =
        /INDEMNIZACIÓN|RESERVA SUGERIDA|RESERVA PRELIMINAR/i.test(String(etiqueta));
      return new TableRow({
        children: [
          cell(etiqueta, {
            bold: true,
            width: 4200,
            size: SIZE_12,
            cuadro: true,
            label: true,
            total: esTotal,
          }),
          cell(valor, {
            width: 5160,
            size: SIZE_12,
            cuadro: true,
            bold: esTotal,
            total: esTotal,
          }),
        ],
      });
    }),
  });
}

/** Tabla N° | ITEM | VALOR — liquidador (sin colores) */
function _tablaItemsLiquidador(titulo, items = [], subtotal = 0) {
  const lista = [...items];
  while (lista.length < 5) lista.push({ item: '', valor: '' });

  const rows = [
    new TableRow({
      children: [
        new TableCell({
          borders: bordersCuadro,
          columnSpan: 3,
          width: { size: 4500, type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          shading: { fill: COLOR_HEADER_BG },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: titulo,
                  font: FONT,
                  size: SIZE_12,
                  bold: true,
                  color: COLOR_TEXT,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('N°', {
          bold: true,
          header: true,
          width: 500,
          alignment: AlignmentType.CENTER,
          cuadro: true,
        }),
        cell('ITEM', { bold: true, header: true, width: 2800, cuadro: true }),
        cell('VALOR', {
          bold: true,
          header: true,
          width: 1200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
        }),
      ],
    }),
  ];

  lista.slice(0, 10).forEach((it, idx) => {
    const monto = parsearNumero(it.valor);
    const has = String(it.item || '').trim() || monto > 0;
    rows.push(
      new TableRow({
        children: [
          cell(String(idx + 1), {
            width: 500,
            alignment: AlignmentType.CENTER,
            cuadro: true,
          }),
          cell(has ? it.item || '' : '', { width: 2800, cuadro: true }),
          cell(has && monto ? money(monto) : '', {
            width: 1200,
            alignment: AlignmentType.RIGHT,
            cuadro: true,
          }),
        ],
      })
    );
  });

  rows.push(
    new TableRow({
      children: [
        cell('', { width: 500, cuadro: true }),
        cell('SUBTOTAL', { bold: true, width: 2800, cuadro: true, total: true }),
        cell(money(subtotal), {
          bold: true,
          width: 1200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
          total: true,
        }),
      ],
    })
  );

  return new Table({
    width: { size: 4500, type: WidthType.DXA },
    columnWidths: [500, 2800, 1200],
    borders: bordersCuadro,
    rows,
  });
}

async function fetchImageBytes(url) {
  if (!url || typeof url !== 'string') return null;
  const got = await fetchBytesImagenUrl(url);
  if (!got?.bytes?.length) return null;
  const u8 = got.bytes;
  const ct = got.contentType || '';
  const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
  return { bytes: u8, type: isPng || ct.includes('png') ? 'png' : 'jpg' };
}

async function bytesDesdeFoto(foto = {}, urlFn) {
  try {
    if (foto?.file instanceof Blob) {
      const buf = await foto.file.arrayBuffer();
      const u8 = new Uint8Array(buf);
      const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
      return { bytes: u8, type: isPng ? 'png' : 'jpg' };
    }
    if (typeof foto?.preview === 'string' && (foto.preview.startsWith('blob:') || foto.preview.startsWith('data:'))) {
      const { bytesDesdePreviewLocal } = await import('../../utils/descargarArchivo.js');
      const u8 = await bytesDesdePreviewLocal(foto.preview);
      if (u8?.length) {
        const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
        return { bytes: u8, type: isPng ? 'png' : 'jpg' };
      }
    }
  } catch {
    /* continuar con ruta */
  }
  const candidatos = await candidatosUrlArchivoParaFetch(
    foto?.ruta,
    urlFn?.(foto?.ruta),
    ...(foto?.ruta ? getUploadsUrlCandidates(foto.ruta) : [])
  );
  const vistos = new Set();
  for (const url of candidatos) {
    if (vistos.has(url)) continue;
    vistos.add(url);
    const img = await fetchImageBytes(url);
    if (img) return img;
  }
  return null;
}

async function imagenDesdeDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const mimeMatch = dataUrl.match(/^data:image\/(png|jpe?g|gif|webp);base64,/i);
  const idx = dataUrl.indexOf('base64,');
  const raw = idx !== -1 ? dataUrl.slice(idx + 7) : dataUrl;
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
      const { obtenerDimensionesDataUrl, dimensionesFirmaWord } = await import(
        '../../utils/normalizarFirmaImagen.js'
      );
      const dims = await obtenerDimensionesDataUrl(dataUrl);
      const sized = dimensionesFirmaWord(dims.width, dims.height, {
        maxWidthPx: 230,
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

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Resuelve captura del mapa de riesgo (base64, http o ruta upload). */
async function cargarMapaRiesgoDataUrl(info = {}) {
  const im = info.imagenMapa;
  if (im && typeof im === 'string' && im.startsWith('data:')) return im;
  if (im && typeof im === 'string' && /^https?:\/\//i.test(im)) {
    try {
      const resp = await fetch(im);
      if (resp.ok) return await blobToDataUrl(await resp.blob());
    } catch {
      /* ignore */
    }
  }
  if (im && typeof im === 'object' && im.ruta) {
    try {
      const { getUploadsUrlCandidates } = await import('../../config/apiConfig.js');
      const urls = getUploadsUrlCandidates(im.ruta);
      for (const url of urls) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          return await blobToDataUrl(await resp.blob());
        } catch {
          /* next */
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function _extraerLatLngTexto(texto) {
  const parts = String(texto || '')
    .split(',')
    .map((c) => parseFloat(String(c).trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { latitud: parts[0].toFixed(6), longitud: parts[1].toFixed(6) };
  }
  return { latitud: '', longitud: '' };
}

/** Celda de grilla fotográfica: imagen centrada + leyenda debajo. */
function celdaFotoInspeccion(foto, { width = FOTO_CELL_W } = {}) {
  const children = [];
  if (foto?.img) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 40 },
        children: [
          new ImageRun({
            data: foto.img.bytes,
            transformation: { width: FOTO_GRID_ANCHO, height: FOTO_GRID_ALTO },
            type: foto.img.type,
          }),
        ],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: String(foto?.leyenda || '—'),
          font: FONT,
          size: SIZE_META,
          color: COLOR_MUTED,
        }),
      ],
    })
  );
  return new TableCell({
    borders: noBorders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children,
  });
}

/**
 * Arma las fotos en páginas de 4 (grilla 2×2).
 * Entre cada bloque de 4 inserta salto de página.
 */
function construirParrafosFotosInspeccion(fotosCargadas = []) {
  const lista = Array.isArray(fotosCargadas) ? fotosCargadas.filter(Boolean) : [];
  if (!lista.length) return [];

  const out = [];
  for (let i = 0; i < lista.length; i += FOTOS_POR_PAGINA) {
    const bloque = lista.slice(i, i + FOTOS_POR_PAGINA);
    if (i > 0) {
      out.push(new Paragraph({ children: [], pageBreakBefore: true, spacing: { after: 0 } }));
    }
    const filas = [];
    for (let r = 0; r < bloque.length; r += FOTOS_COLS) {
      const fila = bloque.slice(r, r + FOTOS_COLS);
      while (fila.length < FOTOS_COLS) fila.push(null);
      filas.push(
        new TableRow({
          children: fila.map((foto) =>
            foto
              ? celdaFotoInspeccion(foto)
              : new TableCell({
                  borders: noBorders,
                  width: { size: FOTO_CELL_W, type: WidthType.DXA },
                  children: [new Paragraph({ children: [] })],
                })
          ),
        })
      );
    }
    out.push(
      new Table({
        width: { size: PAGE_W_PORTRAIT, type: WidthType.DXA },
        columnWidths: [FOTO_CELL_W, FOTO_CELL_W],
        borders: noBorders,
        rows: filas,
      })
    );
  }
  return out;
}

/** Página: descripción de daños + mapa de ubicación + coordenadas. */
async function construirBloqueDaniosUbicacionPrevisora({ info = {}, caso = {} } = {}) {
  const bloques = [];
  const descripcion = txt(info.descripcionDanios, '');
  const coordenadas = txt(info.coordenadasRiesgo, '');
  const direccion = txt(info.direccionRiesgo || caso.direccionPredio, '');
  const mapaDataUrl = await cargarMapaRiesgoDataUrl(info);

  bloques.push(heading('2. Descripción de los daños y/o perjuicios'));
  bloques.push(
    p(descripcion || 'Pendiente diligenciar la descripción de los daños y/o perjuicios.', {
      after: 140,
      alignment: AlignmentType.JUSTIFIED,
    })
  );

  bloques.push(
    p('Ubicación del riesgo', {
      bold: true,
      alignment: AlignmentType.CENTER,
      before: 80,
      after: 120,
    })
  );

  if (mapaDataUrl) {
    const img = await imagenDesdeDataUrl(mapaDataUrl);
    if (img) {
      bloques.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new ImageRun({
              data: img.data,
              transformation: { width: 480, height: 340 },
              type: img.type,
            }),
          ],
        })
      );
    }
  } else {
    bloques.push(
      p('Sin captura de mapa. Use «Actualizar captura» en el informe para generarla.', {
        alignment: AlignmentType.CENTER,
        after: 100,
        color: COLOR_MUTED,
      })
    );
  }

  const pieMapa = lineasPieMapaInforme({ direccion, coordenadas });
  pieMapa.forEach((linea, idx) => {
    const esFuente = /Fuente del mapa|© Google/i.test(linea);
    bloques.push(
      p(linea, {
        alignment: AlignmentType.CENTER,
        after: idx === pieMapa.length - 1 ? 120 : 50,
        size: esFuente ? SIZE_META : SIZE_12,
        color: esFuente
          ? COLOR_MUTED
          : linea.startsWith('Coordenadas:')
            ? COLOR_PREVISORA
            : undefined,
      })
    );
  });

  return bloques;
}

/**
 * Zona de firmas Previsora: solo ajustador, sin tabla/bordes, abajo a la izquierda.
 */
async function construirZonaFirmasPrevisora({ info = {} } = {}) {
  const imgAjustador = await imagenDesdeDataUrl(
    info.firmaAjustador || info.actaAjustadorFirmaImagen || ''
  );

  const nombreAjustador = txt(
    info.actaAjustadorNombre || info.ajustadorNombre,
    'NOMBRE DEL AJUSTADOR'
  ).toUpperCase();
  const cargoAjustador = txt(
    info.actaAjustadorCargo || info.cargoAjustador || info.ajustadorCargo,
    'Ajustador'
  );
  const emailAjustador = txt(info.actaAjustadorEmail || info.emailAjustador, '—');

  const pLeft = (children, spacing = {}) =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60, ...spacing },
      children,
    });

  return [
    heading('FIRMAS'),
    new Paragraph({ spacing: { before: 120, after: 40 }, children: [] }),
    pLeft(
      [
        new TextRun({
          text: 'FIRMA DEL AJUSTADOR',
          font: FONT,
          size: SIZE_META,
          bold: true,
          color: COLOR_MUTED,
        }),
      ],
      { after: 80 }
    ),
    imgAjustador
      ? pLeft(
          [
            new ImageRun({
              data: imgAjustador.data,
              transformation: {
                width: imgAjustador.width || 220,
                height: imgAjustador.height || 90,
              },
              type: imgAjustador.type,
            }),
          ],
          { before: 40, after: 80 }
        )
      : pLeft(
          [
            new TextRun({
              text: '________________________',
              font: FONT,
              size: SIZE_12,
              color: COLOR_TEXT,
            }),
          ],
          { before: 40, after: 80 }
        ),
    pLeft(
      [
        new TextRun({
          text: nombreAjustador,
          font: FONT,
          size: SIZE_12,
          bold: true,
          underline: {},
          color: COLOR_TEXT,
        }),
      ],
      { after: 40 }
    ),
    pLeft([
      new TextRun({ text: 'Cargo: ', font: FONT, size: SIZE_12, bold: true, color: COLOR_TEXT }),
      new TextRun({ text: cargoAjustador, font: FONT, size: SIZE_12, color: COLOR_TEXT }),
    ]),
    pLeft([
      new TextRun({ text: 'E-Mail: ', font: FONT, size: SIZE_12, bold: true, color: COLOR_TEXT }),
      new TextRun({
        text: emailAjustador,
        font: FONT,
        size: SIZE_12,
        color: COLOR_PREVISORA,
      }),
    ]),
    pLeft(
      [
        new TextRun({
          text: 'Proser Ajustes SAS',
          font: FONT,
          size: SIZE_12,
          bold: true,
          color: 'B91C1C',
        }),
      ],
      { before: 40, after: 40 }
    ),
  ];
}

function tablaAnalisisPolizaPrevisora(filas = []) {
  const lista = (Array.isArray(filas) ? filas : []).filter(
    (f) =>
      String(f?.concepto || '').trim() ||
      String(f?.analisis || '').trim() ||
      String(f?.conclusion || '').trim()
  );
  const wConcepto = 2000;
  const wAnalisis = 5360;
  const wConclusion = 2000;
  const rows = [
    new TableRow({
      children: [
        cell('CONCEPTO', {
          bold: true,
          header: true,
          width: wConcepto,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('ANÁLISIS', {
          bold: true,
          header: true,
          width: wAnalisis,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('CONCLUSIÓN', {
          bold: true,
          header: true,
          width: wConclusion,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
      ],
    }),
  ];
  if (!lista.length) {
    rows.push(
      new TableRow({
        children: [
          cell('Pendiente diligenciar el análisis de póliza y cobertura.', {
            width: 9360,
            columnSpan: 3,
            cuadro: true,
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    );
  } else {
    lista.forEach((f) => {
      rows.push(
        new TableRow({
          children: [
            cell(txt(f.concepto), {
              bold: true,
              width: wConcepto,
              cuadro: true,
              verticalAlign: VerticalAlign.TOP,
            }),
            cell(txt(f.analisis), {
              width: wAnalisis,
              cuadro: true,
              verticalAlign: VerticalAlign.TOP,
            }),
            cell(txt(f.conclusion), {
              bold: true,
              width: wConclusion,
              cuadro: true,
              verticalAlign: VerticalAlign.TOP,
            }),
          ],
        })
      );
    });
  }
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [wConcepto, wAnalisis, wConclusion],
    borders: bordersCuadro,
    rows,
  });
}

/**
 * Informe preliminar, final o único Previsora — plantilla visual alineada a Zurich:
 * encabezado limpio, título tipográfico, fichas con sombreado suave y bordes slate.
 * Preliminar y final se complementan; el único va aparte.
 * Final y único incluyen el liquidador NSR-10 (pestaña Liquidador / presupuesto).
 */
export async function descargarWordInformePrevisora({ caso = {}, informe = null, liquidador = null } = {}) {
  const info = informe || defaultInformeUnicoPrevisora(caso);
  const esPreliminar = esInformePreliminarPrevisora(info);
  const tipoNorm = normalizarTipoInformePrevisora(info.tipoInforme, 'unico');
  const tipoEtiqueta =
    tipoNorm === 'preliminar' ? 'preliminar' : tipoNorm === 'final' ? 'final' : 'único';
  const seccionFotos = esPreliminar ? 4 : 6;
  const seccionConclusiones = esPreliminar ? 5 : 7;
  const liq = liquidador || mapcasoPrevisoraALiquidador(caso);
  const totales = calcularLiquidacionPrevisora(liq);
  const enc = liq.encabezado || {};
  const items = itemsPlanosPrevisora(liq);
  const filasPresupuesto = filasPresupuestoParaWord(
    liq,
    liq?.evaluacionSismicaNSR10?.presupuesto?.items,
    { modulo: 'previsora' }
  );
  const contenidosNsr = liq?.evaluacionSismicaNSR10?.contenidos || {};
  const presupuesto = liq?.evaluacionSismicaNSR10?.presupuesto || {};
  const aiuPct = Math.round(
    (totales.presupuesto?.aiuPct ?? presupuesto.aiuPorcentaje ?? 0.25) * 100
  );
  const imprPct = Math.round(
    (totales.presupuesto?.imprPct ?? presupuesto.imprevistosPorcentaje ?? 0) * 100
  );
  const impPct = Math.round(
    (totales.presupuesto?.impPct ?? presupuesto.impuestosPorcentaje ?? 0) * 100
  );
  const mostrarImprevistos = imprPct > 0 || Number(totales.imprevistos) > 0;
  const mostrarImpuestos = impPct > 0 || Number(totales.impuestos) > 0;
  const criterio = totales.criterio || {};

  const fotosArchivos = (Array.isArray(caso.archivos) ? caso.archivos : []).filter((a) => {
    const et = String(a.etiqueta || '').toUpperCase();
    const nombre = String(a.nombreOriginal || a.nombre || '').toLowerCase();
    return et === 'FOTOS' || et === 'INSPECCION' || /\.(jpe?g|png|gif|webp)$/i.test(nombre);
  });
  const fotosInforme = Array.isArray(info?.fotosInspeccion)
    ? info.fotosInspeccion.filter((f) => f && (f.ruta || f.file || f.preview || f._id))
    : [];
  const fotosParaWord = fotosInforme.length ? fotosInforme : fotosArchivos;

  const fotoParrafos = [];
  let fotosIncluidas = 0;
  const fotosCargadas = [];
  const fotosFallidas = [];
  for (const archivo of fotosParaWord.slice(0, 40)) {
    const img = await bytesDesdeFoto(archivo, urlDescargaArchivoPrevisora);
    if (!img) {
      fotosFallidas.push(
        p(`• ${archivo.nombreOriginal || archivo.nombre || 'Foto'} (no embebida)`, {
          size: SIZE_12,
        })
      );
      continue;
    }
    fotosIncluidas += 1;
    fotosCargadas.push({
      img,
      leyenda:
        String(archivo.descripcion || '').trim() ||
        String(archivo.nombreOriginal || archivo.nombre || '').trim() ||
        `Foto ${fotosIncluidas}`,
    });
  }
  if (fotosCargadas.length) {
    fotoParrafos.push(...construirParrafosFotosInspeccion(fotosCargadas));
  }
  fotoParrafos.push(...fotosFallidas);
  if (!fotoParrafos.length) {
    fotoParrafos.push(
      p(
        'Pendiente registro fotográfico. Suba las fotos en la sección 5 del informe (zona de arrastre).',
        { size: SIZE_12 }
      )
    );
  }

  const fotosCotizacionRaw = paginasTodasCotizacionesPdfRiesgosPrevisora(liq, info).filter(
    (f) => f && (f.ruta || f.file || f.preview || f._id)
  );
  const vistosCotiz = new Set();
  const fotosCotizacion = [];
  for (const f of fotosCotizacionRaw) {
    const key = String(f._id || f.ruta || f.preview || '');
    if (key && vistosCotiz.has(key)) continue;
    if (key) vistosCotiz.add(key);
    fotosCotizacion.push(f);
  }
  const cotizacionParrafos = [];
  let cotizacionesIncluidas = 0;
  for (const archivo of fotosCotizacion) {
    const img = await bytesDesdeFoto(archivo, urlDescargaArchivoPrevisora);
    if (!img) continue;
    cotizacionesIncluidas += 1;
    const natW = Number(archivo.width) || 0;
    const natH = Number(archivo.height) || 0;
    let width = 500;
    let height = 680;
    if (natW > 0 && natH > 0) {
      const scale = Math.min(500 / natW, 680 / natH, 1);
      width = Math.max(120, Math.round(natW * scale));
      height = Math.max(160, Math.round(natH * scale));
    }
    cotizacionParrafos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 40 },
        children: [
          new ImageRun({
            data: img.bytes,
            transformation: { width, height },
            type: img.type,
          }),
        ],
      }),
      p(
        archivo.descripcion ||
          archivo.nombreOriginal ||
          archivo.nombre ||
          `Cotización · página ${cotizacionesIncluidas}`,
        {
          alignment: AlignmentType.CENTER,
          size: SIZE_12,
          after: 120,
        }
      )
    );
  }
  const resumenRiesgosWord = resumenCotizacionesPdfRiesgosPrevisora(liq);
  const montoCotizTxt = money(
    totales.cotizacionMonto || resumenRiesgosWord.total || liq?.cotizacionPdf?.montoFinal
  );
  const detalleRiesgosTxt =
    resumenRiesgosWord.nUsadas > 1
      ? ` Suma de ${resumenRiesgosWord.nUsadas} riesgos: ${resumenRiesgosWord.usadas
          .map((f) => `${f.etiqueta} ${money(f.monto)}`)
          .join('; ')}.`
      : '';
  const seccionCotizacion = cotizacionParrafos.length
    ? [
        heading('Cotización de reparación'),
        p(
          totales.origenPresupuesto === 'cotizacion'
            ? `Soporte de la cotización usada como base de liquidación. Monto final: ${montoCotizTxt}.${detalleRiesgosTxt}`
            : `Captura de la cotización adjunta (${cotizacionesIncluidas} página(s)).${detalleRiesgosTxt}`,
          { after: 120, size: SIZE_12 }
        ),
        ...cotizacionParrafos,
      ]
    : [];

  const usaCotizacion = totales.origenPresupuesto === 'cotizacion';
  const tieneCotizacionPdf =
    usaCotizacion ||
    resumenRiesgosWord.filas.some((f) => f.tieneArchivo) ||
    (Array.isArray(liq?.cotizacionPdf?.paginas) && liq.cotizacionPdf.paginas.length > 0) ||
    Boolean(liq?.cotizacionPdf?.archivoPdf);

  const filasCuadro = [
    new TableRow({
      children: [
        cell('#', {
          bold: true,
          header: true,
          width: 600,
          alignment: AlignmentType.CENTER,
          cuadro: true,
        }),
        cell('Concepto', { bold: true, header: true, width: 4000, cuadro: true }),
        cell('Reclamado', {
          bold: true,
          header: true,
          width: 2200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
        }),
        cell('Indemnizable', {
          bold: true,
          header: true,
          width: 2200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
        }),
      ],
    }),
  ];

  if (items.length) {
    items.forEach((it, idx) => {
      filasCuadro.push(
        new TableRow({
          children: [
            cell(String(idx + 1), {
              width: 600,
              alignment: AlignmentType.CENTER,
              cuadro: true,
            }),
            cell(it.concepto || '—', { width: 4000, cuadro: true }),
            cell(money(it.valorReclamado), {
              width: 2200,
              alignment: AlignmentType.RIGHT,
              cuadro: true,
            }),
            cell(money(it.valorIndemnizable), {
              width: 2200,
              alignment: AlignmentType.RIGHT,
              cuadro: true,
            }),
          ],
        })
      );
    });
  } else {
    filasCuadro.push(
      new TableRow({
        children: [
          cell('—', { width: 600, cuadro: true }),
          cell('Sin ítems en el liquidador', { width: 4000, cuadro: true }),
          cell(money(0), { width: 2200, alignment: AlignmentType.RIGHT, cuadro: true }),
          cell(money(0), { width: 2200, alignment: AlignmentType.RIGHT, cuadro: true }),
        ],
      })
    );
  }

  filasCuadro.push(
    new TableRow({
      children: [
        cell('', { width: 600, cuadro: true, total: true }),
        cell('TOTALES', { bold: true, width: 4000, cuadro: true, total: true }),
        cell(money(totales.totalReclamado), {
          bold: true,
          width: 2200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
          total: true,
        }),
        cell(money(totales.totalIndemnizable), {
          bold: true,
          width: 2200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
          total: true,
        }),
      ],
    })
  );

  const infoEventoParrafos = String(info.infoEvento || '')
    .split(/\n+/)
    .filter((l) => l.trim())
    .map((l) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        children: [new TextRun({ text: l, font: FONT, size: SIZE_12, color: COLOR_TEXT })],
      })
    );

  const baseUrl = import.meta.env.BASE_URL || '/';
  const mapaEvento =
    (await loadLogoBytes(`${baseUrl}templates/mapa-evento-siniestro-Zurich.png`)) ||
    (await loadLogoBytes(`${baseUrl}templates/mapa-evento-siniestro.png`));
  const mapaEventoParrafos = [];
  if (mapaEvento) {
    mapaEventoParrafos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [
          new ImageRun({
            data: mapaEvento.bytes,
            transformation: { width: 480, height: 342 },
            type: mapaEvento.type,
          }),
        ],
      }),
      p('Mapa del evento — impacto del sismo en Colombia', {
        alignment: AlignmentType.CENTER,
        size: SIZE_META,
        after: 120,
        color: COLOR_MUTED,
      })
    );
  }

  const header = await crearEncabezadoPrevisora({ caso, informe: info, landscape: false });
  const headerLandscape = await crearEncabezadoPrevisora({
    caso,
    informe: info,
    landscape: true,
  });

  const polizaRows = [
    campoFila('Tomador', txt(caso.tomador || enc.tomador)),
    campoFila('Identificación', txt(caso.identificacion || enc.identificacion)),
    campoFila('Tipo de identificación', txt(caso.tipoIdentificacion || enc.tipoIdentificacion)),
    campoFila('N° póliza', txt(caso.numeroPoliza || enc.poliza)),
    campoFila('Tipo de póliza', txt(caso.tipoPoliza || enc.tipoPoliza)),
    campoFila('Causa', txt(caso.causa || enc.causa)),
    campoFila('N° crédito', txt(caso.numeroCredito || enc.credito)),
    campoFila('Cobertura / evento', txt(caso.cobertura || enc.cobertura || enc.evento)),
    campoFila('Estado pago primas', txt(caso.estadoPagoPrimas)),
    campoFila('Fecha inicio póliza (vigencia)', fmtFecha(caso.fechaInicioPoliza)),
    campoFila('Fecha fin póliza (vigencia)', fmtFecha(caso.fechaFinPoliza)),
    campoFila('Valor asegurado inmueble', money(caso.valorAseguradoInmueble)),
    campoFila('Valor asegurado contenidos', money(caso.valorAseguradoContenidos)),
    campoFila('Dirección predio', txt(caso.direccionPredio || enc.direccion)),
    campoFila(
      'Ciudad / Departamento',
      `${txt(caso.ciudad || enc.ciudad)} / ${txt(caso.departamento || enc.departamento)}`
    ),
    campoFila('Fecha siniestro', fmtFecha(caso.fechaSiniestro || enc.fechaSiniestro)),
    campoFila('Fecha inspección', fmtFecha(caso.fechaInspeccion)),
  ];

  const liquidacionResumen = [
    ...(OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
      ? []
      : [
          campoFila('Dictamen', txt(criterio.dictamen), { labelW: 5000, valueW: 5000 }),
          campoFila(
            'Categoría / Habitabilidad',
            `${txt(criterio.categoria)} / ${txt(criterio.habitabilidad)}`,
            { labelW: 5000, valueW: 5000 }
          ),
        ]),
    ...(usaCotizacion
      ? [
          campoFila('Total cotización de reparación', money(totales.cotizacionMonto), {
            boldValue: true,
            total: true,
            labelW: 5000,
            valueW: 5000,
          }),
        ]
      : [
          campoFila('Subtotal presupuesto (costo directo)', money(totales.subtotal), {
            labelW: 5000,
            valueW: 5000,
          }),
          campoFila(`AIU (${aiuPct}%)`, money(totales.aiu), { labelW: 5000, valueW: 5000 }),
          ...(mostrarImprevistos
            ? [
                campoFila(`Imprevistos (${imprPct}%)`, money(totales.imprevistos), {
                  labelW: 5000,
                  valueW: 5000,
                }),
              ]
            : []),
          ...(mostrarImpuestos
            ? [
                campoFila(`Impuestos (${impPct}%)`, money(totales.impuestos), {
                  labelW: 5000,
                  valueW: 5000,
                }),
              ]
            : []),
          campoFila(
            'Total presupuesto NSR-10',
            money(totales.totalPresupuesto ?? totales.presupuesto?.total),
            {
              labelW: 5000,
              valueW: 5000,
            }
          ),
        ]),
    campoFila('Total contenidos', money(totales.totalContenidos ?? 0), {
      labelW: 5000,
      valueW: 5000,
    }),
    campoFila('SUMA COMPLETA (presupuesto + contenidos)', money(totales.sumaCompleta ?? totales.totalDanios), {
      boldValue: true,
      total: true,
      labelW: 5000,
      valueW: 5000,
    }),
    campoFila('Gastos de hospedaje', money(totales.diagrama?.gastosHospedaje), {
      labelW: 5000,
      valueW: 5000,
    }),
    campoFila(
      totales.deducibleAplicado > 0
        ? `Deducible (${txt(totales.deducibleTexto || 'aplicado')})`
        : 'Deducible',
      totales.deducibleAplicado > 0
        ? money(totales.deducibleAplicado)
        : txt(totales.deducibleTexto || 'No aplica'),
      {
        labelW: 5000,
        valueW: 5000,
      }
    ),
    ...(Array.isArray(totales.otrosAmparos) && totales.otrosAmparos.length
      ? [
          campoFila('Otros amparos (sin deducible)', money(totales.totalOtrosAmparos), {
            labelW: 5000,
            valueW: 5000,
          }),
          ...totales.otrosAmparos.map((it) =>
            campoFila(
              `${txt(it.nombre || it.tipo)}${it.observacion ? ` — ${txt(it.observacion)}` : ''}`,
              money(it.valor),
              { labelW: 5000, valueW: 5000 }
            )
          ),
        ]
      : []),
    campoFila('TOTAL A INDEMNIZAR', money(totales.totalIndemnizar), {
      boldValue: true,
      total: true,
      labelW: 5000,
      valueW: 5000,
    }),
  ];

  const w = NSR_COLS.widths;
  const cellNsr = (text, colIdx, opts = {}) =>
    cell(text, {
      width: w[colIdx],
      size: SIZE_NSR,
      compact: true,
      cuadro: true,
      alignment: opts.alignment || AlignmentType.LEFT,
      bold: !!opts.bold,
      header: !!opts.header,
      total: !!opts.total,
      columnSpan: opts.columnSpan || 1,
    });

  const filasNsr = [
    new TableRow({
      children: NSR_COLS.labels.map((label, i) =>
        cellNsr(label, i, { bold: true, header: true, alignment: AlignmentType.CENTER })
      ),
    }),
  ];

  const filasConDatos = filasPresupuesto.filter(
    (it) =>
      String(it?.actividad || '').trim() ||
      String(it?.componente || '').trim() ||
      String(it?.capitulo || '').trim() ||
      Number(it?.cantidad) > 0
  );

  if (filasConDatos.length) {
    filasConDatos.forEach((it) => {
      const tot = totalFilaPresupuesto(it);
      filasNsr.push(
        new TableRow({
          children: [
            cellNsr(it.capitulo || '—', 0),
            cellNsr(it.componente || '—', 1),
            cellNsr(it.actividad || '—', 2),
            cellNsr(it.unidad || '—', 3, { alignment: AlignmentType.CENTER }),
            cellNsr(
              it.cantidad === '' || it.cantidad == null ? '—' : String(it.cantidad),
              4,
              { alignment: AlignmentType.RIGHT }
            ),
            cellNsr(
              it.valorUnitario === '' || it.valorUnitario == null
                ? '—'
                : money(it.valorUnitario),
              5,
              { alignment: AlignmentType.RIGHT }
            ),
            cellNsr(tot == null ? '—' : money(tot), 6, { alignment: AlignmentType.RIGHT }),
            cellNsr(it.prioridad || '—', 7, { alignment: AlignmentType.CENTER }),
            cellNsr(it.cubierto || '—', 8, { alignment: AlignmentType.CENTER }),
            cellNsr(it.observacion || '—', 9),
            cellNsr(it.fuente || '—', 10),
          ],
        })
      );
    });
  } else {
    filasNsr.push(
      new TableRow({
        children: [
          cell('Sin ítems en el presupuesto NSR-10', {
            width: NSR_TABLE_W,
            columnSpan: 11,
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    );
  }

  const resumenNsrFilas = [
    ['SUBTOTAL (COSTO DIRECTO)', money(totales.subtotal)],
    [`AIU (${aiuPct}%)`, money(totales.aiu)],
    ...(mostrarImprevistos
      ? [[`IMPREVISTOS (${imprPct}%)`, money(totales.imprevistos)]]
      : []),
    ...(mostrarImpuestos ? [[`IMPUESTOS (${impPct}%)`, money(totales.impuestos)]] : []),
    ['TOTAL ESTIMADO', money(totales.totalPresupuesto ?? totales.presupuesto?.total)],
  ];
  resumenNsrFilas.forEach(([lab, val]) => {
    const esTotal = /TOTAL ESTIMADO/i.test(String(lab));
    filasNsr.push(
      new TableRow({
        children: [
          cell(lab, {
            width: w.slice(0, 7).reduce((a, b) => a + b, 0),
            columnSpan: 7,
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            bold: true,
            total: esTotal,
            alignment: AlignmentType.RIGHT,
          }),
          cell(val, {
            width: w[7],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            bold: true,
            total: esTotal,
            alignment: AlignmentType.RIGHT,
          }),
          cell('', {
            width: w.slice(8).reduce((a, b) => a + b, 0),
            columnSpan: 4,
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            total: esTotal,
          }),
        ],
      })
    );
  });

  const tablaLiquidadorCompleto = new Table({
    width: { size: NSR_TABLE_W, type: WidthType.DXA },
    columnWidths: w,
    rows: filasNsr,
  });

  const { tabla: tablaContenidos } = construirTablaContenidosWord({
    contenidos: contenidosNsr,
    cell,
    size: SIZE_NSR,
  });

  const firmasParrafos = await construirZonaFirmasPrevisora({ caso, enc, info });
  const bloqueDaniosUbicacion = await construirBloqueDaniosUbicacionPrevisora({ info, caso });

  const pagePortrait = {
    margin: { top: 1000, bottom: 800, left: 1000, right: 1000 },
    size: { orientation: PageOrientation.PORTRAIT },
  };
  const pageLandscape = {
    margin: { top: 720, bottom: 720, left: 720, right: 720 },
    size: { orientation: PageOrientation.LANDSCAPE },
  };

  const seccionFotosFirmas = [
    heading(`${seccionFotos}. Inspección fotográfica`),
    p(
      fotosIncluidas
        ? `Registro fotográfico del predio (${fotosIncluidas} imagen(es)).`
        : 'Registro fotográfico del predio.',
      { after: 80 }
    ),
    ...fotoParrafos,
    heading(`${seccionConclusiones}. Conclusiones y recomendación del ajustador`),
    p('Conclusiones', { bold: true, after: 40 }),
    p(txt(info.conclusiones, 'Pendiente diligenciar conclusiones.'), {
      after: 120,
      alignment: AlignmentType.JUSTIFIED,
    }),
    p('Recomendación', { bold: true, after: 40 }),
    p(txt(info.recomendacion, 'Pendiente diligenciar recomendación.'), {
      after: 200,
      alignment: AlignmentType.JUSTIFIED,
    }),
    p(
      `Para constancia se firma el presente informe ${tipoEtiqueta} en ${txt(
        caso.ciudad || enc.ciudad,
        'Colombia'
      )}, ${fmtFecha(info.fechaInforme || new Date())}.`,
      { after: 200 }
    ),
    ...firmasParrafos,
  ];

  const sections = [
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [
        crearTituloInformeUnico(info),
        p('Previsora', {
          alignment: AlignmentType.CENTER,
          bold: true,
          size: SIZE_12,
          after: 160,
          color: COLOR_MUTED,
        }),
        construirCuadroPrincipal({ caso, enc, info, totales }),
      ],
    },
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [
        heading('1. Información general del evento'),
        ...(infoEventoParrafos.length ? infoEventoParrafos : [p('Sin información del evento.')]),
        ...mapaEventoParrafos,
      ],
    },
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: bloqueDaniosUbicacion,
    },
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [
        heading('3. Información de póliza y cobertura'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4200, 5160],
          borders: bordersFicha,
          rows: polizaRows,
        }),
        p('Análisis de póliza y cobertura', { bold: true, before: 200, after: 80, size: SIZE_12 }),
        tablaAnalisisPolizaPrevisora(
          completarFilasPolizaCoberturaPrevisora(info.filasPolizaCobertura, {
            caso,
            encabezado: enc,
            informe: info,
            liquidador: liq,
          })
        ),
      ],
    },
  ];

  if (!esPreliminar) {
    sections.push({
      properties: { page: pageLandscape },
      headers: { default: headerLandscape },
      children: [
        heading('4. Liquidación de pérdidas (liquidador)'),
        ...(tieneCotizacionPdf
          ? []
          : [
              p(
                'Presupuesto de intervención / reparación post-sismo (NSR-10) — columnas completas: capítulo, código, componente, actividad, unidad, cantidad, valores, prioridad, cobertura, observación y fuente; con AIU, imprevistos e impuestos. Valores tomados de la pestaña Liquidador.',
                { after: 120 }
              ),
              tablaLiquidadorCompleto,
            ]),
        p('Contenidos del inmueble (bienes muebles)', {
          bold: true,
          before: 180,
          after: 80,
          size: SIZE_12,
        }),
        p(
          contenidosNsr.tipoInmueble
            ? `Tipo de inmueble / riesgo: ${contenidosNsr.tipoInmueble}.`
            : 'Catálogo de contenidos (casa, apartamento, industria, etc.) o ítems libres.',
          { after: 100 }
        ),
        tablaContenidos,
        p('Resumen de liquidación', { bold: true, before: 180, after: 80, size: SIZE_12 }),
        new Table({
          width: { size: 10000, type: WidthType.DXA },
          columnWidths: [5000, 5000],
          borders: bordersFicha,
          rows: liquidacionResumen,
        }),
        ...(liq.observaciones
          ? [
              p('Observaciones del liquidador:', { bold: true, before: 120, after: 40 }),
              p(liq.observaciones, { after: 80 }),
            ]
          : []),
      ],
    });
    if (seccionCotizacion.length) {
      sections.push({
        properties: { page: pagePortrait },
        headers: { default: header },
        children: seccionCotizacion,
      });
    }
    sections.push({
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [
        heading('5. Relación de valores reclamados vs. valores indemnizables'),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [600, 4000, 2200, 2200],
          borders: bordersCuadro,
          rows: filasCuadro,
        }),
        p(`Diferencia reclamado − indemnizable: ${money(totales.diferencia)}`, {
          before: 100,
          size: SIZE_12,
        }),
        ...seccionFotosFirmas,
      ],
    });
  } else {
    sections.push({
      properties: { page: pagePortrait },
      headers: { default: header },
      children: seccionFotosFirmas,
    });
  }

  const doc = new Document({
    sections: seccionesConEncabezadoUnico(sections, header),
  });

  const blob = await Packer.toBlob(doc);
  const prefijo = prefijoArchivoInformePrevisora(info.tipoInforme);
  const nombre = `${prefijo}_${caso.siniestro || caso.consecutivo || 'caso'}.docx`.replace(
    /[^\w.\-áéíóúÁÉÍÓÚñÑ]+/gi,
    '_'
  );
  descargarBlob(blob, nombre);
  return { blob, nombre, filename: nombre };
}
