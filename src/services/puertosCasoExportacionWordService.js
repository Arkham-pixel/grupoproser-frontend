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
  construirFilasMercanciaWord,
  captionImagenPdf,
  prepararFotosSeccion3Mercancia,
  textoPunto,
  agruparFotosSupervisionInicial,
} from './puertosCasoExportacionPdfHelpers';

const CONTACTO_BOLIVAR = {
  intro: 'Para mayor información, contactarse con el ingeniero de riesgos encargado de su cuenta corporativa.',
  nombre: 'Carlos Barrios Garrido',
  cargo: 'Ingeniero de control y prevención de riesgos corporativos',
  gerencia: 'Gerencia de Clientes Corporativos',
  empresa: 'Seguros Comerciales Bolívar S.A.',
  email: 'Carlos.barrios@segurosbolivar.com',
};

// Mismos estilos del PDF (puertosCasoExportacionPdfHelpers) traducidos a Word.
const FONT = 'Roboto Condensed';
// Tamaños docx en half-points (pt × 2).
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

// Página A4 con los mismos márgenes del PDF (mm): top 18, left/right 15, bottom 20.
const MM_TO_TWIP = 56.6929;
const MM_TO_PX = 3.77953;
const mmTw = (mm) => Math.round(mm * MM_TO_TWIP);
const mmPx = (mm) => Math.round(mm * MM_TO_PX);
const CONTENT_W_MM = 180;
const CONTENT_W_TW = mmTw(CONTENT_W_MM);

const BORDE = { style: BorderStyle.SINGLE, size: 4, color: COLOR.border };
const BORDES_TABLA = {
  top: BORDE,
  bottom: BORDE,
  left: BORDE,
  right: BORDE,
  insideHorizontal: BORDE,
  insideVertical: BORDE,
};
const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BORDES_NINGUNO = {
  top: SIN_BORDE,
  bottom: SIN_BORDE,
  left: SIN_BORDE,
  right: SIN_BORDE,
  insideHorizontal: SIN_BORDE,
  insideVertical: SIN_BORDE,
};
const MARGEN_CELDA = { top: 40, bottom: 40, left: 60, right: 60 };

function tr(texto, { bold = false, size = SIZE.body, color = COLOR.text } = {}) {
  return new TextRun({ text: String(texto ?? ''), bold, size, color, font: FONT });
}

function parrafo(texto, { bold = false, size = SIZE.body, align = AlignmentType.JUSTIFIED, after = 120 } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { after },
    children: [tr(texto, { bold, size })],
  });
}

function parrafoCentrado(texto, size = SIZE.body, bold = false) {
  return parrafo(texto, { size, bold, align: AlignmentType.CENTER, after: 80 });
}

function tituloNumerado(numero, texto) {
  return new Paragraph({
    spacing: { before: 160, after: 120 },
    children: [tr(`${numero}. ${String(texto).toUpperCase()}`, { bold: true, size: SIZE.title })],
  });
}

function tituloSeccion(texto) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [tr(String(texto).toUpperCase(), { bold: true, size: SIZE.title })],
  });
}

function subtitulo(texto) {
  return new Paragraph({
    spacing: { before: 120, after: 100 },
    children: [tr(texto, { bold: true, size: SIZE.title })],
  });
}

function tituloCentrado(texto) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 140 },
    children: [tr(texto, { bold: true, size: SIZE.title })],
  });
}

/** Barra gris con borde y título centrado (mismo estilo del PDF). */
function barraTituloContenedor(titulo) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 100 },
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

/** Barra oscura con leyenda blanca centrada bajo las fotos. */
function leyendaBloqueFotos(texto) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    shading: { type: ShadingType.CLEAR, fill: COLOR.legendBg },
    children: [tr(String(texto || '').trim(), { size: SIZE.caption, color: COLOR.white })],
  });
}

function listaViñetas(puntos) {
  const items = (puntos || []).map(textoPunto).filter(Boolean);
  return items.map(
    (texto) =>
      new Paragraph({
        spacing: { after: 60 },
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

function parrafosCelda(texto, { bold = false, size = SIZE.table, align = AlignmentType.CENTER } = {}) {
  const lineas = String(texto ?? '').split('\n');
  return lineas.map(
    (linea) =>
      new Paragraph({
        alignment: align,
        children: [tr(linea, { bold, size })],
      })
  );
}

/** Tabla DESCRIPCIÓN DE LA MERCANCÍA: cabecera sage + columnas + fila total. */
function tablaMercanciaWord(lineas, total) {
  const anchosMm = [18, 22, 56, 20, 32, 32];
  const escala = CONTENT_W_MM / anchosMm.reduce((a, b) => a + b, 0);
  const anchos = anchosMm.map((w) => mmTw(w * escala));
  const headers = ['N° CONTENEDORES', 'B/L N°', 'PRODUCTO', 'CANTIDAD', 'TIPO DE CARGA', 'DESTINO'];

  const dataRows = construirFilasMercanciaWord(lineas);
  dataRows.push(['', '', 'Total', total > 0 ? `${total} UDS` : '—', '', '']);

  const filaTitulo = new TableRow({
    children: [
      new TableCell({
        columnSpan: headers.length,
        verticalAlign: VerticalAlign.CENTER,
        margins: MARGEN_CELDA,
        shading: { type: ShadingType.CLEAR, fill: COLOR.greenBarBg },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              tr('DESCRIPCIÓN DE LA MERCANCÍA', { bold: true, size: SIZE.title, color: COLOR.greenBrand }),
            ],
          }),
        ],
      }),
    ],
  });

  const filaHeaders = new TableRow({
    children: headers.map(
      (h, i) =>
        new TableCell({
          width: { size: anchos[i], type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          margins: MARGEN_CELDA,
          shading: { type: ShadingType.CLEAR, fill: COLOR.greenBarBg },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [tr(h, { bold: true, size: SIZE.table })],
            }),
          ],
        })
    ),
  });

  const filasDatos = dataRows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell, i) =>
            new TableCell({
              width: { size: anchos[i], type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              margins: MARGEN_CELDA,
              children: parrafosCelda(cell, {
                align: i === 2 ? AlignmentType.LEFT : AlignmentType.CENTER,
              }),
            })
        ),
      })
  );

  return new Table({
    width: { size: CONTENT_W_TW, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: BORDES_TABLA,
    rows: [filaTitulo, filaHeaders, ...filasDatos],
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

/** Encabezado de todas las páginas: franja sage «REPORTE DE SUPERVISIÓN» + logo. */
function encabezadoSupervision(logoRun) {
  const sageW = mmTw(140);
  const logoW = CONTENT_W_TW - sageW;
  return new Header({
    children: [
      new Table({
        width: { size: CONTENT_W_TW, type: WidthType.DXA },
        columnWidths: [sageW, logoW],
        layout: TableLayoutType.FIXED,
        borders: BORDES_NINGUNO,
        rows: [
          new TableRow({
            height: { value: mmTw(22), rule: HeightRule.EXACT },
            children: [
              new TableCell({
                width: { size: sageW, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                shading: { type: ShadingType.CLEAR, fill: COLOR.greenBarBg },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
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
                shading: { type: ShadingType.CLEAR, fill: COLOR.white },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: logoRun ? [logoRun] : [],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 120 }, children: [] }),
    ],
  });
}

function piePagina() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT,
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
      spacing: { after: 240 },
      children: [tr(`Número de solicitud: ${formData.numeroSolicitud || '—'}`, { bold: true })],
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
  children.push(barraTituloContenedor('Contenido de la mercancía'));

  if (bloque.fila1.length) {
    children.push(
      ...(await grillaFotos(bloque.fila1, 2, 38, {
        sinCaption: true,
        leyendaFila: 'Contenido de la mercancía',
      }))
    );
  }

  if (bloque.fila2.length) {
    children.push(
      ...(await grillaFotos(bloque.fila2, 2, 38, {
        leyendasPorCelda: bloque.leyendasFila2,
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

  const fotosInicial = agruparFotosSupervisionInicial(informe.imagenesRegistroInicialSupervision);
  const contenedoresExtra = [
    ...(extrasMercancia?.contenedores || []),
    ...fotosInicial.contenedores,
  ];
  const vehiculosExtra = [
    ...(extrasMercancia?.vehiculos || []),
    ...fotosInicial.vehiculos,
  ];

  if (contenedoresExtra.length) {
    children.push(barraTituloContenedor('Contenedor (es) asignado (s)'));
    children.push(...(await grillaFotos(contenedoresExtra, 4, 36)));
  }
  if (vehiculosExtra.length) {
    children.push(barraTituloContenedor('Vehículo (s) asignado (s)'));
    children.push(...(await grillaFotos(vehiculosExtra, 3, 40)));
  }
  if (fotosInicial.bodega.length) {
    children.push(barraTituloContenedor('Carga almacenada en Bodega 9'));
    children.push(...(await grillaFotos(fotosInicial.bodega, 3, 40)));
  }

  const bloques = [
    {
      titulo: 'Condición de la carga',
      texto: informe.condicionCargaTexto,
      imgs: informe.imagenesCondicionCarga,
      cols: 3,
      alto: 38,
    },
    {
      titulo: 'Durante la inspección de arribo se observó',
      texto: informe.inspeccionArriboIntro,
      puntos: informe.inspeccionArriboPuntos,
      imgs: informe.imagenesInspeccionArribo,
      cols: 3,
    },
    {
      titulo: 'Equipos usados en la operación de cargue/descargue',
      texto: informe.equiposOperacionIntro,
      puntos: informe.equiposOperacionPuntos,
      imgs: informe.imagenesEquiposOperacion,
      cols: 3,
    },
    {
      titulo: 'Condiciones meteorológicas durante el descargue',
      texto: informe.condicionesMeteoTexto,
      imgs: informe.imagenesCondicionesMeteo,
      cols: 3,
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
  { aseguradoraOptions = [], responsables = [] } = {}
) {
  const informe = formData.informeExportacion || {};

  const logoData = await assetImportadoABase64(logoBolivar);
  const logoRun = logoData ? await imagenRun(logoData, 34, 15) : null;

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
        document: { run: { font: FONT, size: SIZE.body, color: COLOR.text } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: mmTw(210), height: mmTw(297) },
            margin: {
              top: mmTw(28),
              bottom: mmTw(20),
              left: mmTw(15),
              right: mmTw(15),
              header: mmTw(4),
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
