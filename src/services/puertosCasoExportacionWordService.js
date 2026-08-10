import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableBorders,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import portadaFoto from '../img/Captura de pantalla 2026-06-17 092246.png';
import logoBolivar from '../img/seguros-bolivar.png';
import {
  construirSeguimientoConsolidado,
  puntosComentariosSupervision,
  SEGUIMIENTO_COLS_MM,
  assetImportadoABase64,
  formatearFechaCorta,
  formatearFechaLarga,
  formatearFechaMayus,
  imagenInformeABase64,
  obtenerInspector,
  resumenMercancia,
  construirMercanciaConsolidada,
  captionImagenPdf,
  prepararFotosSeccion3Mercancia,
  textoPunto,
} from './puertosCasoExportacionPdfHelpers';

const CONTACTO_BOLIVAR = {
  intro: 'Para mayor información, contactarse con el ingeniero de riesgos encargado de su cuenta corporativa.',
  nombre: 'Carlos Barrios Garrido',
  cargo: 'Ingeniero de control y prevención de riesgos corporativos',
  gerencia: 'Gerencia de Clientes Corporativos',
  empresa: 'Seguros Comerciales Bolívar S.A.',
  email: 'Carlos.barrios@segurosbolivar.com',
};

// Tipografía del informe Word: Arial (cuerpo, títulos y tablas).
const FONT = 'Arial';
const FONT_FALLBACK = 'Arial';
// Tamaños docx en half-points (pt × 2) — iguales al PDF.
const SIZE = {
  headerTitle: 44, // 22pt
  title: 28, // 14pt
  body: 24, // 12pt
  table: 20, // 10pt
  caption: 18, // 9pt
};
const COLOR = {
  greenBrand: '006B2B',
  greenBarBg: '89B49B',
  green: '006B2B',
  text: '212121',
  muted: '5A5A5A',
  border: 'B4B4B4',
  labelBg: 'F5F5F5',
  white: 'FFFFFF',
  gold: 'C79836',
  legendBg: '232323',
};

// Página A4: mismos márgenes del PDF (mm) left/right 15, bottom 20.
// El encabezado va a sangre (ancho completo); el contenido arranca bajo la franja.
const MM_TO_TWIP = 56.6929;
const MM_TO_PX = 3.77953;
const mmTw = (mm) => Math.round(mm * MM_TO_TWIP);
const mmPx = (mm) => Math.round(mm * MM_TO_PX);
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_LR_MM = 15;
const HEADER_BAR_H_MM = 22;
const HEADER_GAP_MM = 12;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_LR_MM * 2;
const CONTENT_W_TW = mmTw(CONTENT_W_MM);
const PAGE_W_TW = mmTw(PAGE_W_MM);
/** Zona del logo en el encabezado (igual que el PDF: 40 mm). */
const HEADER_LOGO_W_MM = 40;
const HEADER_GREEN_W_MM = PAGE_W_MM - HEADER_LOGO_W_MM;

const BORDE = { style: BorderStyle.SINGLE, size: 4, color: COLOR.border };
const BORDES_TABLA = {
  top: BORDE,
  bottom: BORDE,
  left: BORDE,
  right: BORDE,
  insideHorizontal: BORDE,
  insideVertical: BORDE,
};
const BORDES_NINGUNO = TableBorders.NONE;
const BORDES_CELDA_NINGUNO = {
  top: { style: BorderStyle.NONE, size: 0, color: COLOR.white },
  bottom: { style: BorderStyle.NONE, size: 0, color: COLOR.white },
  left: { style: BorderStyle.NONE, size: 0, color: COLOR.white },
  right: { style: BorderStyle.NONE, size: 0, color: COLOR.white },
};
const MARGEN_CELDA = { top: 40, bottom: 40, left: 60, right: 60 };
const MARGEN_CERO = { top: 0, bottom: 0, left: 0, right: 0 };
/** Interlineado 1.15 (240 = sencillo en twips). */
const LINE_SPACING = 276;

function fontRun() {
  return { ascii: FONT, hAnsi: FONT, eastAsia: FONT_FALLBACK, cs: FONT_FALLBACK };
}

function tr(texto, { bold = false, size = SIZE.body, color = COLOR.text } = {}) {
  return new TextRun({
    text: String(texto ?? ''),
    bold,
    size,
    color,
    font: fontRun(),
  });
}

function parrafo(
  texto,
  { bold = false, size = SIZE.body, align = AlignmentType.JUSTIFIED, after = 100, before = 0 } = {}
) {
  return new Paragraph({
    alignment: align,
    spacing: { after, before, line: LINE_SPACING },
    children: [tr(texto, { bold, size })],
  });
}

function parrafoCentrado(texto, size = SIZE.body, bold = false) {
  return parrafo(texto, { size, bold, align: AlignmentType.CENTER, after: 60 });
}

function tituloNumerado(numero, texto) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 120, line: LINE_SPACING },
    children: [tr(`${numero}. ${String(texto).toUpperCase()}`, { bold: true, size: SIZE.title })],
  });
}

function tituloSeccion(texto) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 100, line: LINE_SPACING },
    children: [tr(String(texto).toUpperCase(), { bold: true, size: SIZE.title })],
  });
}

function subtitulo(texto) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 100, after: 80, line: LINE_SPACING },
    children: [tr(texto, { bold: true, size: SIZE.title })],
  });
}

function tituloCentrado(texto) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 120, line: LINE_SPACING },
    children: [tr(texto, { bold: true, size: SIZE.title })],
  });
}

/** Barra gris con borde y título centrado (mismo estilo del PDF). */
function barraTituloContenedor(titulo) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 100, line: LINE_SPACING },
    shading: { type: ShadingType.CLEAR, fill: COLOR.labelBg },
    border: {
      top: { ...BORDE, space: 2 },
      bottom: { ...BORDE, space: 2 },
      left: { ...BORDE, space: 2 },
      right: { ...BORDE, space: 2 },
    },
    children: [tr(titulo, { bold: true, size: SIZE.title })],
  });
}

/** Barra verde con leyenda blanca centrada bajo las fotos. */
function leyendaBloqueFotos(texto) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80, line: LINE_SPACING },
    shading: { type: ShadingType.CLEAR, fill: COLOR.greenBrand },
    children: [tr(String(texto || '').trim(), { size: SIZE.caption, color: COLOR.white, bold: true })],
  });
}

function listaViñetas(puntos) {
  const items = (puntos || []).map(textoPunto).filter(Boolean);
  return items.map(
    (texto) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 60, line: LINE_SPACING },
        indent: { left: mmTw(5), hanging: mmTw(5) },
        children: [tr(`✓ ${texto}`, { size: SIZE.body })],
      })
  );
}

/** Convierte data URLs no soportados por docx (webp) a JPEG mediante canvas. */
async function normalizarDataUrlParaDocx(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (!dataUrl.includes('image/webp')) return dataUrl;
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 600;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
}

function tipoImagenDocx(dataUrl) {
  return dataUrl.includes('image/png') ? 'png' : 'jpg';
}

async function imagenRun(dataUrl, anchoMm, altoMm) {
  const normalizado = await normalizarDataUrlParaDocx(dataUrl);
  if (!normalizado) return null;
  const base64 = normalizado.split(',')[1];
  if (!base64) return null;
  try {
    return new ImageRun({
      data: base64,
      type: tipoImagenDocx(normalizado),
      transformation: { width: mmPx(anchoMm), height: mmPx(altoMm) },
    });
  } catch {
    return null;
  }
}

function celdaVacia() {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [] })],
  });
}

/**
 * Grilla de fotos equivalente a PdfLayout.grillaFotos: tablas de N columnas,
 * con captions, leyenda de fila completa o leyendas por celda.
 */
async function grillaFotos(imagenes, columnas = 3, altoCelda = 42, opciones = {}) {
  const lista = (imagenes || []).filter(Boolean);
  if (!lista.length) return [];

  const { sinCaption = false, leyendasPorCelda = null, leyendaFila = null } = opciones;
  const gapMm = 3;
  const cols = Math.max(1, columnas);
  const cellWMm = (CONTENT_W_MM - gapMm * (cols - 1)) / cols;
  const imgWMm = cellWMm - 2;
  const imgHMm = altoCelda - 2;
  const anchosCols = Array.from({ length: cols }, () => mmTw(CONTENT_W_MM / cols));

  const elementos = [];

  for (let i = 0; i < lista.length; i += cols) {
    const slice = lista.slice(i, i + cols);
    const celdas = [];

    for (let c = 0; c < cols; c++) {
      const img = slice[c];
      if (!img) {
        celdas.push(celdaVacia());
        continue;
      }
      const data = await imagenInformeABase64(img);
      const run = data ? await imagenRun(data, imgWMm, imgHMm) : null;
      const children = [];
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: run ? [run] : [tr('Sin imagen', { size: SIZE.caption, color: COLOR.muted })],
        })
      );
      if (leyendasPorCelda) {
        children.push(leyendaBloqueFotos(leyendasPorCelda[c] || ''));
      } else if (!sinCaption && !leyendaFila) {
        const cap = captionImagenPdf(img);
        if (cap) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [tr(cap, { size: SIZE.caption })],
            })
          );
        }
      }
      celdas.push(
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          margins: MARGEN_CELDA,
          children,
        })
      );
    }

    elementos.push(
      new Table({
        width: { size: CONTENT_W_TW, type: WidthType.DXA },
        columnWidths: anchosCols,
        layout: TableLayoutType.FIXED,
        borders: BORDES_TABLA,
        rows: [new TableRow({ children: celdas })],
      })
    );

    if (leyendaFila) {
      elementos.push(leyendaBloqueFotos(leyendaFila));
    } else {
      elementos.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    }
  }

  return elementos;
}

async function imagenCentrada(dataUrl, altoMm = 44) {
  if (!dataUrl) return [];
  const run = await imagenRun(dataUrl, CONTENT_W_MM * 0.88, altoMm);
  if (!run) return [];
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [run],
    }),
  ];
}

/** Tabla DATOS GENERALES: cabecera centrada + filas etiqueta/valor (labels tal cual). */
function tablaDatosGeneralesWord(filas, tituloCabecera = 'DATOS GENERALES') {
  const labelW = mmTw(58);
  const valW = CONTENT_W_TW - labelW;

  const filaCabecera = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        margins: MARGEN_CELDA,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [tr(String(tituloCabecera).toUpperCase(), { bold: true, size: SIZE.title })],
          }),
        ],
      }),
    ],
  });

  const filasDatos = filas.map(
    ([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: labelW, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: MARGEN_CELDA,
            children: [new Paragraph({ children: [tr(label, { bold: true })] })],
          }),
          new TableCell({
            width: { size: valW, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: MARGEN_CELDA,
            children: [new Paragraph({ children: [tr(String(value || '').trim() || '—')] })],
          }),
        ],
      })
  );

  return new Table({
    width: { size: CONTENT_W_TW, type: WidthType.DXA },
    columnWidths: [labelW, valW],
    layout: TableLayoutType.FIXED,
    borders: BORDES_TABLA,
    rows: [filaCabecera, ...filasDatos],
  });
}

/** Tabla con cabecera verde sage + filas etiqueta (mayúsculas) / valor. */
function tablaCaracteristicasBarco(filas, titulo = 'CARACTERISTICAS DEL BARCO') {
  const labelW = mmTw(58);
  const valW = CONTENT_W_TW - labelW;

  const filaCabecera = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        margins: MARGEN_CELDA,
        shading: { type: ShadingType.CLEAR, fill: COLOR.greenBarBg },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              tr(String(titulo).toUpperCase(), { bold: true, size: SIZE.title, color: COLOR.greenBrand }),
            ],
          }),
        ],
      }),
    ],
  });

  const filasDatos = filas.map(
    ([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: labelW, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: MARGEN_CELDA,
            children: [new Paragraph({ children: [tr(String(label).toUpperCase(), { bold: true })] })],
          }),
          new TableCell({
            width: { size: valW, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: MARGEN_CELDA,
            children: [new Paragraph({ children: [tr(String(value || '').trim() || '—')] })],
          }),
        ],
      })
  );

  return new Table({
    width: { size: CONTENT_W_TW, type: WidthType.DXA },
    columnWidths: [labelW, valW],
    layout: TableLayoutType.FIXED,
    borders: BORDES_TABLA,
    rows: [filaCabecera, ...filasDatos],
  });
}

/**
 * Tabla DESCRIPCIÓN DE LA MERCANCÍA consolidada (como el Word de referencia):
 * cabecera verde oscura con texto blanco, una subfila por producto con su
 * cantidad, y N° contenedores, B/L, tipo de carga y destino combinados
 * verticalmente cuando el caso los comparte. Cierra con la fila Total.
 */
function tablaMercanciaWord(lineas, total) {
  const { productos, grupos } = construirMercanciaConsolidada(lineas);
  const anchosMm = [18, 22, 56, 20, 32, 32];
  const escala = CONTENT_W_MM / anchosMm.reduce((a, b) => a + b, 0);
  const anchos = anchosMm.map((w) => mmTw(w * escala));
  const headers = ['N° CONTENEDORES', 'B/L N°', 'PRODUCTO', 'CANTIDAD', 'TIPO DE CARGA', 'DESTINO'];

  const filaTitulo = new TableRow({
    tableHeader: true,
    children: [
      celdaHeaderVerde('DESCRIPCIÓN DE LA MERCANCÍA', CONTENT_W_TW, {
        columnSpan: headers.length,
      }),
    ],
  });

  const filaHeaders = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => celdaHeaderVerde(h, anchos[i])),
  });

  const grupoDe = (lista, i) => lista.find((g) => i >= g.inicio && i <= g.fin);
  const filasDatos = productos.map((p, i) => {
    const celdaCombinada = (lista, colIdx) => {
      const g = grupoDe(lista, i);
      const combinada = g.fin > g.inicio;
      if (combinada && i > g.inicio) return celdaContinuacion(anchos[colIdx]);
      return celdaSeguimiento(
        g.valor,
        anchos[colIdx],
        combinada ? { verticalMerge: VerticalMergeType.RESTART } : {}
      );
    };
    return new TableRow({
      children: [
        celdaCombinada(grupos.numCont, 0),
        celdaCombinada(grupos.bl, 1),
        celdaSeguimiento(p.producto, anchos[2]),
        celdaSeguimiento(p.cantidad, anchos[3]),
        celdaCombinada(grupos.tipoCarga, 4),
        celdaCombinada(grupos.destino, 5),
      ],
    });
  });

  const filaTotal = new TableRow({
    children: [
      new TableCell({
        width: { size: anchos[0] + anchos[1] + anchos[2], type: WidthType.DXA },
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        margins: MARGEN_CELDA,
        shading: { type: ShadingType.CLEAR, fill: COLOR.labelBg },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [tr('Total', { bold: true, size: SIZE.table })],
          }),
        ],
      }),
      new TableCell({
        width: { size: anchos[3], type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: MARGEN_CELDA,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [tr(total > 0 ? `${total} UDS` : '—', { bold: true, size: SIZE.table })],
          }),
        ],
      }),
      new TableCell({
        width: { size: anchos[4] + anchos[5], type: WidthType.DXA },
        columnSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [] })],
      }),
    ],
  });

  return new Table({
    width: { size: CONTENT_W_TW, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: BORDES_TABLA,
    rows: [filaTitulo, filaHeaders, ...filasDatos, filaTotal],
  });
}

function celdaHeaderVerde(texto, ancho, opciones = {}) {
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: MARGEN_CELDA,
    shading: { type: ShadingType.CLEAR, fill: COLOR.green },
    ...opciones,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: texto
          ? [tr(texto, { bold: true, size: SIZE.table, color: COLOR.white })]
          : [],
      }),
    ],
  });
}

function celdaSeguimiento(lineas, ancho, opciones = {}) {
  const textos = (Array.isArray(lineas) ? lineas : [lineas]).filter(
    (l) => String(l ?? '').trim() !== ''
  );
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: MARGEN_CELDA,
    ...opciones,
    children: textos.length
      ? textos.map(
          (l) =>
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [tr(l, { size: SIZE.table })],
            })
        )
      : [new Paragraph({ children: [] })],
  });
}

function celdaContinuacion(ancho) {
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    verticalMerge: VerticalMergeType.CONTINUE,
    children: [new Paragraph({ children: [] })],
  });
}

/**
 * Tabla de seguimiento consolidada (como el Word de referencia): encabezado
 * verde de dos niveles, celdas del vehículo combinadas sobre sus porciones,
 * contenedores compartidos entre vehículos unidos verticalmente (bultos por
 * vehículo) y fila COMENTARIOS con viñetas dentro de la tabla.
 */
function tablaSeguimientoConsolidada(informe) {
  const { filas, vehiculos, contenedores } = construirSeguimientoConsolidado(
    informe.seguimiento || []
  );

  const escala = CONTENT_W_MM / SEGUIMIENTO_COLS_MM.reduce((a, b) => a + b, 0);
  const anchos = SEGUIMIENTO_COLS_MM.map((w) => mmTw(w * escala));

  const headerFila1 = new TableRow({
    tableHeader: true,
    children: [
      celdaHeaderVerde('Fecha - Hora Ingreso Vehículo', anchos[0], {
        verticalMerge: VerticalMergeType.RESTART,
      }),
      celdaHeaderVerde('Placa vehículos', anchos[1], { verticalMerge: VerticalMergeType.RESTART }),
      celdaHeaderVerde('Descargue', anchos[2] + anchos[3], { columnSpan: 2 }),
      celdaHeaderVerde('Bultos', anchos[4], { verticalMerge: VerticalMergeType.RESTART }),
      celdaHeaderVerde('Cantidad', anchos[5], { verticalMerge: VerticalMergeType.RESTART }),
      celdaHeaderVerde('N° Contenedor', anchos[6], { verticalMerge: VerticalMergeType.RESTART }),
      celdaHeaderVerde('Llenado de contenedores', anchos[7] + anchos[8], { columnSpan: 2 }),
      celdaHeaderVerde('Sellos de Seguridad', anchos[9], {
        verticalMerge: VerticalMergeType.RESTART,
      }),
    ],
  });

  const headerFila2 = new TableRow({
    tableHeader: true,
    children: [
      celdaHeaderVerde('', anchos[0], { verticalMerge: VerticalMergeType.CONTINUE }),
      celdaHeaderVerde('', anchos[1], { verticalMerge: VerticalMergeType.CONTINUE }),
      celdaHeaderVerde('Inicio', anchos[2]),
      celdaHeaderVerde('Final', anchos[3]),
      celdaHeaderVerde('', anchos[4], { verticalMerge: VerticalMergeType.CONTINUE }),
      celdaHeaderVerde('', anchos[5], { verticalMerge: VerticalMergeType.CONTINUE }),
      celdaHeaderVerde('', anchos[6], { verticalMerge: VerticalMergeType.CONTINUE }),
      celdaHeaderVerde('Inicio', anchos[7]),
      celdaHeaderVerde('Final', anchos[8]),
      celdaHeaderVerde('', anchos[9], { verticalMerge: VerticalMergeType.CONTINUE }),
    ],
  });

  const filasDatos = filas.map((f, i) => {
    const veh = vehiculos[f.vehIdx];
    const cont = contenedores[f.contIdx];
    const iniciaVeh = veh.inicio === i;
    const iniciaCont = cont.inicio === i;
    const mergeVeh = veh.fin > veh.inicio;
    const mergeCont = cont.fin > cont.inicio;
    const propsVeh = mergeVeh
      ? { verticalMerge: iniciaVeh ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE }
      : {};
    const propsCont = mergeCont
      ? { verticalMerge: iniciaCont ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE }
      : {};

    const celdaVeh = (lineas, colIdx) =>
      !mergeVeh || iniciaVeh
        ? celdaSeguimiento(lineas, anchos[colIdx], propsVeh)
        : celdaContinuacion(anchos[colIdx]);
    const celdaCont = (lineas, colIdx) =>
      !mergeCont || iniciaCont
        ? celdaSeguimiento(lineas, anchos[colIdx], propsCont)
        : celdaContinuacion(anchos[colIdx]);

    return new TableRow({
      children: [
        celdaVeh(veh.lineasIngreso, 0),
        celdaVeh(veh.placa, 1),
        celdaVeh(veh.descargueInicio, 2),
        celdaVeh(veh.descargueFin, 3),
        celdaSeguimiento(f.bultos, anchos[4]),
        celdaCont(cont.cantidad, 5),
        celdaCont(cont.numero, 6),
        celdaCont(cont.llenadoInicio, 7),
        celdaCont(cont.llenadoFin, 8),
        celdaCont(cont.sellos, 9),
      ],
    });
  });

  const rows = [headerFila1, headerFila2, ...filasDatos];

  const puntos = puntosComentariosSupervision(informe.comentariosSupervision);
  if (puntos.length) {
    const wIzq = anchos[0] + anchos[1] + anchos[2] + anchos[3];
    const wDer = anchos[4] + anchos[5] + anchos[6] + anchos[7] + anchos[8] + anchos[9];
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: wIzq, type: WidthType.DXA },
            columnSpan: 4,
            verticalAlign: VerticalAlign.CENTER,
            margins: MARGEN_CELDA,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [tr('COMENTARIOS', { bold: true, size: SIZE.table })],
              }),
            ],
          }),
          new TableCell({
            width: { size: wDer, type: WidthType.DXA },
            columnSpan: 6,
            verticalAlign: VerticalAlign.CENTER,
            margins: MARGEN_CELDA,
            children: puntos.map(
              (p) =>
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { after: 60 },
                  bullet: { level: 0 },
                  children: [tr(p, { size: SIZE.table })],
                })
            ),
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: CONTENT_W_TW, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: BORDES_TABLA,
    rows,
  });
}

/** Encabezado a sangre: franja sage «REPORTE DE SUPERVISIÓN» + logo (igual al PDF). */
function encabezadoSupervision(logoRun) {
  const greenW = mmTw(HEADER_GREEN_W_MM);
  const logoW = mmTw(HEADER_LOGO_W_MM);
  return new Header({
    children: [
      new Table({
        width: { size: PAGE_W_TW, type: WidthType.DXA },
        columnWidths: [greenW, logoW],
        // Compensa el margen izquierdo de la página para pegar la franja al borde.
        indent: { size: -mmTw(MARGIN_LR_MM), type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        borders: BORDES_NINGUNO,
        rows: [
          new TableRow({
            height: { value: mmTw(HEADER_BAR_H_MM), rule: HeightRule.EXACT },
            children: [
              new TableCell({
                width: { size: greenW, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                margins: MARGEN_CERO,
                borders: BORDES_CELDA_NINGUNO,
                shading: { type: ShadingType.CLEAR, fill: COLOR.greenBarBg },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 240 },
                    children: [
                      tr('REPORTE DE SUPERVISIÓN', {
                        bold: true,
                        size: SIZE.headerTitle,
                        color: COLOR.greenBrand,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: logoW, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                margins: MARGEN_CERO,
                borders: BORDES_CELDA_NINGUNO,
                shading: { type: ShadingType.CLEAR, fill: COLOR.white },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0, line: 240 },
                    children: logoRun ? [logoRun] : [tr('')],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function piePagina() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: fontRun(),
            size: SIZE.caption,
            color: COLOR.muted,
          }),
        ],
      }),
    ],
  });
}

async function seccionPortada(formData) {
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: LINE_SPACING },
      children: [
        tr(`Número de solicitud: ${formData.numeroSolicitud || '—'}`, {
          bold: true,
          size: SIZE.body,
        }),
      ],
    })
  );

  const portadaData = await assetImportadoABase64(portadaFoto);
  if (portadaData) {
    const run = await imagenRun(portadaData, CONTENT_W_MM * 0.88, 100);
    if (run) {
      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, children: [run] })
      );
    }
  }

  // Bloque inferior de la portada (línea dorada centrada + datos del creador).
  children.push(
    new Paragraph({
      spacing: { before: mmTw(38) },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 16, color: COLOR.gold, space: 4 },
      },
      indent: { left: mmTw(CONTENT_W_MM * 0.24), right: mmTw(CONTENT_W_MM * 0.24) },
      children: [],
    }),
    new Paragraph({ spacing: { after: 60 }, children: [] }),
    parrafoCentrado('SEGUROS BOLÍVAR S.A.', SIZE.title, true),
    parrafoCentrado(`Creado por: ${formData.creadoPor || '—'}`),
    parrafoCentrado(`Email: ${formData.emailCreador || '—'}`),
    parrafoCentrado(`Fecha: ${formatearFechaLarga(formData.fechaInforme)}`),
    new Paragraph({ children: [new PageBreak()] })
  );

  return children;
}

function seccionDatosEIntroduccion(formData, responsables, informe) {
  const children = [];

  children.push(
    parrafoCentrado(
      formData.departamentoInforme ||
        'Departamento de Ingeniería y Control de Riesgos - Seguros Bolívar S.A.'
    ),
    new Paragraph({ spacing: { after: 120 }, children: [] })
  );

  children.push(
    tablaDatosGeneralesWord([
      ['Nombre o Razón Social:', formData.asgrBenfcro],
      ['Actividad:', formData.actividad],
      ['Solicitado:', formData.funcAsgrdraNombre],
      ['Fecha Asignación', formatearFechaMayus(formData.fchaAsgncion)],
      ['Ciudad del Riesgo:', formData.ciudadRiesgo],
      ['Labor Realizada:', formData.laborRealizada],
      ['Lugar:', formData.lugar],
      ['Fecha Inspección:', formatearFechaMayus(formData.fchaInspccion)],
      ['Inspector:', obtenerInspector(formData, responsables)],
      ['Consecutivo:', formData.consecutivo],
    ])
  );

  children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  children.push(tituloNumerado(1, 'Introducción'));
  if (informe.introduccion) children.push(parrafo(informe.introduccion));
  if (informe.proposito) children.push(parrafo(informe.proposito));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  return children;
}

async function seccionBuque(informe) {
  const buque = informe.buque || {};
  const children = [];

  children.push(tituloNumerado(2, 'Particularidades del buque'));

  if (buque.imagenBuque) {
    const data = await imagenInformeABase64(buque.imagenBuque);
    children.push(...(await imagenCentrada(data, 50)));
  }

  children.push(
    tablaCaracteristicasBarco([
      ['ORIGEN', buque.origen],
      ['PUERTO DE EMBARQUE', buque.puertoEmbarque],
      ['PUERTO DE DESCARGUE', buque.puertoDescargue],
      ['NOMBRE', buque.nombre],
      ['BANDERA', buque.bandera],
      ['TIPO DE BUQUE', buque.tipoBuque],
      ['IMO NRO.', buque.imo],
      ['TONELAJE BRUTO', buque.tonelajeBruto],
      ['PESO MUERTO', buque.pesoMuerto],
      ['ESLORA X MANGA', buque.esloraManga],
      ['AÑO DE CONSTRUCCIÓN', buque.anioConstruccion],
      ['FECHA DE ARRIBO', formatearFechaCorta(buque.fechaArribo)],
    ])
  );

  return children;
}

function seccionMercancia(informe) {
  const { lineas, total } = resumenMercancia(informe);
  const children = [];

  children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  children.push(tituloNumerado(3, 'Información general'));
  children.push(tablaMercanciaWord(lineas, total));

  if (informe.contenidoCajasNota) {
    children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    children.push(parrafo(informe.contenidoCajasNota));
  }

  return children;
}

async function seccionFotosMercancia(informe) {
  const bloque = prepararFotosSeccion3Mercancia(informe);
  if (!bloque.tieneFotos) return { children: [], extras: null };

  const children = [];
  children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));

  if (bloque.filaPrincipal?.length) {
    children.push(
      ...(await grillaFotos(bloque.filaPrincipal, 2, 42, {
        leyendasPorCelda: bloque.leyendasPrincipal,
      }))
    );
  }

  for (const fila of bloque.filasExtra || []) {
    children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    children.push(
      ...(await grillaFotos(fila.imagenes, 2, 42, {
        leyendasPorCelda: fila.leyendas,
      }))
    );
  }

  return { children, extras: bloque.extras };
}

function seccionSupervisionTabla(informe) {
  const children = [];

  children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  children.push(tituloNumerado(4, 'Reporte de supervisión'));
  children.push(subtitulo('Seguimiento contenedor'));

  children.push(tablaSeguimientoConsolidada(informe));

  return children;
}

async function seccionSupervisionBloques(informe, extrasMercancia = null) {
  const children = [];

  // Registro fotográfico inicial: lado a lado con descripción completa.
  const fotosInicialRaw = (informe.imagenesRegistroInicialSupervision || []).filter(
    (img) => img?.ruta || img?.preview || img?.file || img?.src || img?.base64
  );
  if (fotosInicialRaw.length) {
    children.push(...(await grillaFotos(fotosInicialRaw, 2, 52)));
  }

  const contenedoresExtra = [...(extrasMercancia?.contenedores || [])];
  const vehiculosExtra = [...(extrasMercancia?.vehiculos || [])];
  if (contenedoresExtra.length) {
    children.push(barraTituloContenedor('Contenedor (es) asignado (s)'));
    children.push(...(await grillaFotos(contenedoresExtra, 2, 40, { sinCaption: true })));
  }
  if (vehiculosExtra.length) {
    children.push(barraTituloContenedor('Vehículo (s) asignado (s)'));
    children.push(...(await grillaFotos(vehiculosExtra, 2, 40, { sinCaption: true })));
  }

  const registrosSupervision = informe.registrosFotograficosSupervision || [];
  for (const reg of registrosSupervision) {
    if (!reg.imagenes?.length) continue;
    const tituloReg =
      reg.titulo ||
      (reg.numeroContenedor
        ? `N° Contenedor ${reg.numeroContenedor} con sellos de seguridad`
        : 'Contenedor');
    children.push(barraTituloContenedor(tituloReg));
    children.push(...(await grillaFotos(reg.imagenes, 2, 48)));
  }

  const bloques = [
    {
      titulo: 'Condición de la carga',
      texto: informe.condicionCargaTexto,
      imgs: informe.imagenesCondicionCarga,
      cols: 2,
      alto: 42,
    },
    {
      titulo: 'Durante la inspección de arribo se observó',
      texto: informe.inspeccionArriboIntro,
      puntos: informe.inspeccionArriboPuntos,
      imgs: informe.imagenesInspeccionArribo,
      cols: 2,
    },
    {
      titulo: 'Equipos usados en la operación de cargue/descargue',
      texto: informe.equiposOperacionIntro,
      puntos: informe.equiposOperacionPuntos,
      imgs: informe.imagenesEquiposOperacion,
      cols: 2,
    },
    {
      titulo: 'Condiciones meteorológicas durante el descargue',
      texto: informe.condicionesMeteoTexto,
      imgs: informe.imagenesCondicionesMeteo,
      cols: 2,
    },
  ];

  for (const bloque of bloques) {
    const tieneContenido = bloque.texto || bloque.puntos?.length || bloque.imgs?.length;
    if (!tieneContenido) continue;

    children.push(tituloSeccion(bloque.titulo));
    if (bloque.texto) children.push(parrafo(bloque.texto));
    if (bloque.puntos?.length) children.push(...listaViñetas(bloque.puntos));
    if (bloque.imgs?.length) {
      children.push(...(await grillaFotos(bloque.imgs, bloque.cols, bloque.alto || 42)));
    }
  }

  return children;
}

async function seccionConclusiones(informe) {
  const tieneAlgo =
    informe.conclusionesTexto ||
    informe.conclusionesPuntos?.length ||
    informe.registrosFotograficosContenedores?.length;
  if (!tieneAlgo) return [];

  const children = [];
  children.push(tituloSeccion('Conclusiones y comentarios'));
  if (informe.conclusionesTexto) children.push(parrafo(informe.conclusionesTexto));
  children.push(...listaViñetas(informe.conclusionesPuntos));

  const registros = informe.registrosFotograficosContenedores || [];
  if (registros.length) {
    children.push(tituloCentrado('REGISTRO FOTOGRÁFICO'));
    for (const reg of registros) {
      const titulo =
        reg.titulo ||
        (reg.numeroContenedor
          ? `N° Contenedor ${reg.numeroContenedor} con sellos de seguridad`
          : 'Contenedor');
      children.push(barraTituloContenedor(titulo));
      children.push(...(await grillaFotos(reg.imagenes, 3, 48)));
    }
  }

  return children;
}

function seccionContacto() {
  return [
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    parrafo(CONTACTO_BOLIVAR.intro),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    parrafo(CONTACTO_BOLIVAR.nombre, { bold: true, size: SIZE.title, align: AlignmentType.LEFT, after: 40 }),
    parrafo(CONTACTO_BOLIVAR.cargo, { align: AlignmentType.LEFT, after: 40 }),
    parrafo(CONTACTO_BOLIVAR.gerencia, { align: AlignmentType.LEFT, after: 40 }),
    parrafo(CONTACTO_BOLIVAR.empresa, { align: AlignmentType.LEFT, after: 40 }),
    parrafo(CONTACTO_BOLIVAR.email, { align: AlignmentType.LEFT, after: 40 }),
  ];
}

/**
 * Genera y descarga el Word del informe de exportación, réplica del PDF
 * (mismo formato Word Seguros Bolívar de puertosCasoExportacionPdfService).
 */
export async function generarWordInformeExportacion(
  formData,
  { responsables = [] } = {}
) {
  const informe = formData.informeExportacion || {};

  const logoData = await assetImportadoABase64(logoBolivar);
  // Logo un poco más angosto que la celda de 40 mm para que quede centrado sin desbordar.
  const logoRun = logoData ? await imagenRun(logoData, 32, 14) : null;

  const children = [];
  children.push(...(await seccionPortada(formData)));
  children.push(...seccionDatosEIntroduccion(formData, responsables, informe));
  children.push(...(await seccionBuque(informe)));
  children.push(...seccionMercancia(informe));
  const fotosMercancia = await seccionFotosMercancia(informe);
  children.push(...fotosMercancia.children);
  children.push(...seccionSupervisionTabla(informe));
  children.push(...(await seccionSupervisionBloques(informe, fotosMercancia.extras)));
  children.push(...(await seccionConclusiones(informe)));
  children.push(...seccionContacto());

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: fontRun(),
            size: SIZE.body,
            color: COLOR.text,
          },
          paragraph: {
            spacing: { line: LINE_SPACING },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W_TW, height: mmTw(PAGE_H_MM) },
            margin: {
              // Contenido bajo la franja: barH 22 + gap 12 = 34 mm (igual al PDF).
              top: mmTw(HEADER_BAR_H_MM + HEADER_GAP_MM),
              bottom: mmTw(20),
              left: mmTw(MARGIN_LR_MM),
              right: mmTw(MARGIN_LR_MM),
              header: 0,
              footer: mmTw(8),
            },
          },
        },
        headers: { default: encabezadoSupervision(logoRun) },
        footers: { default: piePagina() },
        children,
      },
    ],
  });

  const nombreBase =
    formData.consecutivo ||
    formData.numeroSolicitud ||
    `informe-exportacion-${Date.now()}`;
  const nombreArchivo = `Reporte Supervisión Exportación - ${nombreBase}.docx`;

  const blob = await Packer.toBlob(doc);
  saveAs(blob, nombreArchivo);
  return nombreArchivo;
}

/** Carga el caso por id y genera el Word (desde el listado). */
export async function generarWordInformeExportacionDesdeId(
  id,
  { aseguradoraOptions = [], responsables = [] } = {}
) {
  const { getPuertosCaso } = await import('./puertosService.js');
  const { normalizarCasoApiParaFormulario } = await import(
    '../components/PuertosActas/puertosCasoExportacionNormalize.js'
  );
  const caso = await getPuertosCaso(id);
  const formData = normalizarCasoApiParaFormulario(caso);
  return generarWordInformeExportacion(formData, { aseguradoraOptions, responsables });
}
