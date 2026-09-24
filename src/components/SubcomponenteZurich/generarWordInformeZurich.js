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
import { esModoDeduciblePorArticuloNsr, filaPresupuestoListaParaDeducible, totalFilaPresupuesto, valoresAsegurablesDesdeLiquidador } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { construirTablaContenidosWord } from '../SubcomponenteEvaluacionSismicaNSR10/construirTablaContenidosWord.js';
import {
  calcularLiquidacionZurich,
  completarFilasPolizaCoberturaZurich,
  defaultInformeUnicoZurich,
  heredarInformePreliminarZurich,
  desgloseDeducibleTerremotoZurich,
  etiquetaArchivoInformeZurich,
  etiquetaEncabezadoInformeZurich,
  etiquetaReporteCuadroZurich,
  etiquetaTituloInformeZurich,
  esInformePreliminarZurich,
  formatearMonto,
  formatDateLarga,
  fotosInformeDesdeCasoZurich,
  mapcasoZurichALiquidador,
  migrarLiquidadorDeducibleTerremotoZurich,
  normalizarTipoInformeZurich,
  parsearNumero,
  prefijoArchivoInformeZurich,
  desgloseReservaPreliminarZurich,
  filasResumenLiquidacionZurich,
  filasLiquidacionPorCoberturaZurich,
  liquidarContenidosPorAmparoZurich,
  formatearPorcentajeLibreZurich,
  reservaSugeridaZurich,
  valorAseguradoPresupuestoZurich,
} from './liquidadorZurichHelpers.js';
import { urlDescargaArchivoZurich } from '../../services/zurichService.js';
import { candidatosUrlArchivoParaFetch } from '../../services/storageSignedUrl.js';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';
import { fetchBytesImagenUrl } from '../../utils/fetchBytesImagenUrl.js';
import { jpegDesdeBytesImagen } from '../../utils/heicToJpeg.js';
import { primeraFechaNoVaciaZurich, resolverDepartamentoZurich } from './zurichHelpers.js';
import {
  filasOtrosAmparosActivos,
  nombreTipoOtroAmparo,
  sumarOtrosAmparos,
  valorMostrarOtroAmparo,
} from '../liquidacion/otrosAmparosLiquidacion.js';
import {
  footerExpressParaWord,
  payloadExpressParaInforme,
} from '../SubcomponenteLiquidadorCatExpress/syncLiquidadorCatExpressAlInforme.js';
import { fotosCotizacionDesdeLiquidador } from '../liquidacion/cotizacionPdfLiquidacion.js';

/** Estética informe Zurich: limpia, formal, sin cuadriculado negro grueso */
const COLOR_ZURICH = '2346A1';
const COLOR_TEXT = '1E293B';
const COLOR_MUTED = '64748B';
const COLOR_BORDER = 'CBD5E1';
const COLOR_HEADER_BG = 'E8EEF9';
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
/** Ficha label|valor: borde exterior + líneas horizontales, sin verticales internas agresivas */
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
const SIZE_UNICO = 18; // 9 pt — liquidador único vertical
/** Tamaño en página (docx px). El JPEG embebido va a ~2× para impresión nítida. */
const FOTO_WORD_ANCHO = 400;
const FOTO_WORD_ALTO = 260;
const FOTO_WORD_MAX_LADO = 960;
const FOTO_WORD_CALIDAD = 0.72;
const FOTO_FETCH_PARALELO = 8;

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

/** Liquidador del informe único en landscape (9 columnas, sin cubierto ni observación). */
const PAGE_W_PORTRAIT = 9360;
const PAGE_W_LANDSCAPE = 15200;
const UNICO_COLS = {
  widths: [1800, 1600, 4200, 700, 800, 1400, 1400, 1100, 2200],
  labels: [
    'CAPÍTULO',
    'COMPONENTE',
    'ACTIVIDAD / REPARACIÓN',
    'UND',
    'CANT.',
    'VLR. UNITARIO',
    'VLR. TOTAL',
    'PRIORIDAD',
    'FUENTE',
  ],
};
const UNICO_TABLE_W = UNICO_COLS.widths.reduce((a, b) => a + b, 0);

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

function construirTablaPolizaCasoZurich({ caso = {}, enc = {}, info = {} } = {}) {
  const departamento = resolverDepartamentoZurich({
    ciudad: caso.ciudad || enc.ciudad,
    departamento: caso.departamento || enc.departamento,
    direccionPredio: caso.direccionPredio || enc.direccion || info.direccionRiesgo,
  });
  const polizaRows = [
    campoFila('Tomador', txt(caso.tomador || enc.tomador)),
    campoFila('Póliza', txt(caso.numeroPoliza || enc.poliza)),
    campoFila('Fecha inicio póliza (vigencia)', fmtFecha(caso.fechaInicioPoliza || enc.fechaInicioPoliza)),
    campoFila('Fecha fin póliza (vigencia)', fmtFecha(caso.fechaFinPoliza || enc.fechaFinPoliza)),
    campoFila('Cobertura', txt(caso.cobertura || enc.cobertura || enc.evento)),
    campoFila('Dirección predio', txt(caso.direccionPredio || enc.direccion || info.direccionRiesgo)),
    campoFila(
      'Ciudad / Departamento',
      `${txt(caso.ciudad || enc.ciudad)} / ${txt(departamento || caso.departamento || enc.departamento)}`
    ),
  ];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4200, 5160],
    borders: bordersFicha,
    rows: polizaRows,
  });
}

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
 * Encabezado limpio: Logo Proser | marca + tipo + siniestro/fecha | Logo Zurich
 * `landscape` usa el ancho de página horizontal para que no se desplace el header.
 */
async function crearEncabezadoZurich({ caso = {}, informe = {}, landscape = false } = {}) {
  const base = import.meta.env.BASE_URL || '/';
  let proser = await loadLogoBytes(`${base}templates/logo-grupoproser.png`);
  if (!proser) proser = await loadLogoBytes(`${base}templates/logo-grupoproser.jpg`);
  const Zurich = await loadLogoBytes(`${base}templates/logo-zurich.png`);

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
                    logo === Zurich
                      ? { width: 118, height: 52 }
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
                  color: COLOR_ZURICH,
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
                        text: 'Zurich',
                        font: FONT,
                        size: SIZE_HEADING,
                        bold: true,
                        color: COLOR_ZURICH,
                      }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: etiquetaEncabezadoInformeZurich(informe.tipoInforme),
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
              logoCell(Zurich, 'Zurich', AlignmentType.RIGHT),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60, after: 0 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 18, color: COLOR_ZURICH, space: 1 },
        },
        children: [],
      }),
    ],
  });
}

/** Título centrado con tipo de informe subrayado. */
function crearTituloInformeZurich(info = {}) {
  const tipo = etiquetaTituloInformeZurich(info.tipoInforme);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 200 },
    children: [
      new TextRun({
        text: 'INFORME ',
        bold: true,
        size: SIZE_TITLE,
        font: FONT,
        color: COLOR_ZURICH,
      }),
      new TextRun({
        text: tipo,
        bold: true,
        size: SIZE_TITLE,
        font: FONT,
        color: COLOR_ZURICH,
        underline: {},
      }),
      new TextRun({
        text: ' DE SINIESTRO',
        bold: true,
        size: SIZE_TITLE,
        font: FONT,
        color: COLOR_ZURICH,
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
        color: COLOR_ZURICH,
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
              color: opts.color || (isHeader ? COLOR_TEXT : COLOR_TEXT),
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
        label: true,
        shading: opts.labelShading || COLOR_LABEL_BG,
      }),
      cell(String(value ?? '—'), {
        width: opts.valueW || 5160,
        size: opts.size || SIZE_12,
        bold: !!opts.boldValue,
        cuadro: true,
        total: !!opts.total,
        shading: opts.valueShading,
      }),
    ],
  });

/** Cuadro ficha principal del siniestro (plantilla tipo Juliet / Catastrófico). */
function extrasReservaWord(info = {}, { caso = {}, enc = {}, liquidador = null } = {}) {
  return {
    caso,
    encabezado: enc,
    liquidador,
    valorAsegurado:
      valorAseguradoPresupuestoZurich(liquidador || {}) || caso?.valorAseguradoInmueble,
    otrosAmparos: liquidador?.otrosAmparos || [],
  };
}

function etiquetaGanadorReservaWord(desglose = {}) {
  if (desglose.tipoGanador === 'valor_asegurado') return '% valor asegurado';
  if (desglose.tipoGanador === 'perdida') return '% pérdida';
  return desglose.tipoMinimo || 'SMMLV';
}

function filasDeducibleReservaWord(desglose = {}) {
  const pctTxt = formatearPorcentajeLibreZurich(desglose.porcentaje);
  const filaPct =
    desglose.basePct === 'perdida'
      ? [`DEDUCIBLE ${pctTxt}% SOBRE LA PÉRDIDA`, money(desglose.montoPctPerdida)]
      : [`DEDUCIBLE ${pctTxt}% SOBRE VALOR ASEGURADO`, money(desglose.montoPctVa)];
  return [
    filaPct,
    [
      `DEDUCIBLE ${desglose.cantidadMinimo || 0} ${desglose.tipoMinimo || 'SMMLV'}`,
      money(desglose.montoMinimo),
    ],
    [
      `DEDUCIBLE APLICADO (EL MAYOR: ${etiquetaGanadorReservaWord(desglose)})`,
      desglose.deducible > 0 ? `− ${money(desglose.deducible)}` : money(0),
    ],
  ];
}

function construirCuadroPrincipal({
  caso = {},
  enc = {},
  info = {},
  totales = {},
  portada = {},
  liquidador = null,
  perdidaAjuste = null,
} = {}) {
  const vigencia =
    caso.fechaInicioPoliza || caso.fechaFinPoliza
      ? `${fmtFechaCorta(caso.fechaInicioPoliza)} – ${fmtFechaCorta(caso.fechaFinPoliza)}`
      : '—';

  const tipoNorm = normalizarTipoInformeZurich(info.tipoInforme, 'preliminar');
  const esPreliminar = tipoNorm === 'preliminar';
  const extras = extrasReservaWord(info, { caso, enc, liquidador });
  const extrasCalc =
    perdidaAjuste != null && perdidaAjuste !== ''
      ? { ...extras, perdida: perdidaAjuste }
      : extras;
  const desgloseReserva = desgloseReservaPreliminarZurich(info, extrasCalc);
  const reserva =
    desgloseReserva.perdida > 0 ? desgloseReserva.reserva : reservaSugeridaZurich(info, extrasCalc);
  const ciudad = caso.ciudad || enc.ciudad || portada.municipio || '';
  const departamento = resolverDepartamentoZurich({
    ciudad,
    departamento: caso.departamento || enc.departamento,
    direccionPredio: caso.direccionPredio || enc.direccion || portada.direccion,
  });
  const fechaOcurrencia = primeraFechaNoVaciaZurich(
    portada.fechaSismo,
    portada.fechaOcurrencia,
    caso.fechaSiniestro,
    enc.fechaSiniestro,
    enc.fechaOcurrencia
  );
  const fechaInspeccion = primeraFechaNoVaciaZurich(
    portada.fechaInspeccion,
    caso.fechaInspeccion,
    caso.fechaVisita,
    caso.fechaInspeccionado,
    caso.fechaCoordinandoInspeccion,
    enc.fechaInspeccion
  );
  const filas = [
    ['REPORTE No', etiquetaReporteCuadroZurich(info.tipoInforme)],
    ['CONSECUTIVO', txt(caso.consecutivo)],
    ['SINIESTRO No', txt(caso.siniestro || enc.siniestro)],
    ['TOMADOR', txt(caso.tomador || enc.tomador)],
    ['ASEGURADO / CONTACTO', txt(caso.asegurado || enc.asegurado || caso.informacionContacto)],
    ['IDENTIFICACIÓN', txt(caso.identificacion || enc.identificacion)],
    ['TIPO IDENTIFICACIÓN', txt(caso.tipoIdentificacion || enc.tipoIdentificacion)],
    ['N° PÓLIZA', txt(caso.numeroPoliza || enc.poliza)],
    ['TIPO PÓLIZA', txt(caso.tipoPoliza || enc.tipoPoliza)],
    ['CAUSA', txt(caso.causa || enc.causa)],
    ['VIGENCIA', vigencia],
    ['COBERTURA / EVENTO', txt(caso.cobertura || enc.cobertura || enc.evento)],
    ['DIRECCIÓN RIESGO ASEGURADO', txt(caso.direccionPredio || enc.direccion || portada.direccion)],
    ['CIUDAD / DEPARTAMENTO', `${txt(ciudad)} / ${txt(departamento)}`],
    ['FECHA DE OCURRENCIA', fmtFechaCorta(fechaOcurrencia)],
    ['FECHA DE INSPECCIÓN', fmtFechaCorta(fechaInspeccion)],
    ['FECHA DEL INFORME', fmtFechaCorta(info.fechaInforme || new Date())],
    ['AJUSTADOR', txt(info.ajustadorNombre)],
    ...(esPreliminar
      ? [
          ['VALOR DE LA PÉRDIDA', money(desgloseReserva.perdida)],
          ...filasDeducibleReservaWord(desgloseReserva),
          ['RESERVA SUGERIDA', money(reserva)],
        ]
      : [
          [
            'INDEMNIZACIÓN SUGERIDA',
            money(totales.totalIndemnizar),
          ],
        ]),
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4200, 5160],
    borders: bordersFicha,
    rows: filas.map(([etiqueta, valor]) => {
      const esTotal =
        /INDEMNIZACIÓN|RESERVA SUGERIDA|VALOR DE LA PÉRDIDA/i.test(String(etiqueta));
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
function tablaItemsLiquidador(titulo, items = [], subtotal = 0) {
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
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: titulo, font: FONT, size: SIZE_12, bold: true }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('N°', { bold: true, width: 500, alignment: AlignmentType.CENTER, cuadro: true }),
        cell('ITEM', { bold: true, width: 2800, cuadro: true }),
        cell('VALOR', {
          bold: true,
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
        cell('SUBTOTAL', { bold: true, width: 2800, cuadro: true }),
        cell(money(subtotal), {
          bold: true,
          width: 1200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
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
  const u8 = await jpegDesdeBytesImagen(got.bytes);
  const ct = got.contentType || '';
  const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
  return { bytes: u8, type: isPng || ct.includes('png') ? 'png' : 'jpg' };
}

async function bytesDesdeFoto(foto = {}) {
  try {
    if (foto?.file instanceof Blob) {
      const buf = await foto.file.arrayBuffer();
      const u8 = await jpegDesdeBytesImagen(new Uint8Array(buf));
      const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
      return { bytes: u8, type: isPng ? 'png' : 'jpg' };
    }
    if (typeof foto?.preview === 'string' && (foto.preview.startsWith('blob:') || foto.preview.startsWith('data:'))) {
      const { bytesDesdePreviewLocal } = await import('../../utils/descargarArchivo.js');
      const raw = await bytesDesdePreviewLocal(foto.preview);
      if (raw?.length) {
        const u8 = await jpegDesdeBytesImagen(raw);
        const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
        return { bytes: u8, type: isPng ? 'png' : 'jpg' };
      }
    }
  } catch {
    /* continuar con ruta */
  }
  const candidatos = await candidatosUrlArchivoParaFetch(
    foto?.ruta,
    ...(foto?.ruta ? getUploadsUrlCandidates(foto.ruta) : []),
    urlDescargaArchivoZurich(foto?.ruta)
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

async function mapConCurrencia(items, limite, iterar) {
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

/** Reduce el JPEG al tamaño de impresión para no inflar el .docx. */
async function jpegCompactoParaWord(bytes) {
  if (!bytes || !bytes.length) return null;
  return new Promise((resolve) => {
    try {
      const esPng = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50;
      const blob = new Blob([bytes], { type: esPng ? 'image/png' : 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
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
          ctx.drawImage(img, 0, 0, w, h);
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
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

async function bytesDesdeFotoParaInforme(foto = {}) {
  const img = await bytesDesdeFoto(foto);
  if (!img) return null;
  if (img.type === 'jpg' && img.bytes.length <= 100 * 1024) return img;
  const compacto = await jpegCompactoParaWord(img.bytes);
  if (compacto && compacto.length && compacto.length < img.bytes.length) {
    return { bytes: compacto, type: 'jpg' };
  }
  return img;
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

function extraerLatLngTexto(texto) {
  const parts = String(texto || '')
    .split(',')
    .map((c) => parseFloat(String(c).trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { latitud: parts[0].toFixed(6), longitud: parts[1].toFixed(6) };
  }
  return { latitud: '', longitud: '' };
}

/** Página: descripción de daños + mapa de ubicación + coordenadas. */
async function construirBloqueDaniosUbicacionZurich({ info = {}, caso = {} } = {}) {
  const bloques = [];
  const descripcion = txt(info.descripcionDanios, '');
  const coordenadas = txt(info.coordenadasRiesgo, '');
  const direccion = txt(info.direccionRiesgo || caso.direccionPredio, '');
  const coords = extraerLatLngTexto(coordenadas);
  const mapaDataUrl = await cargarMapaRiesgoDataUrl(info);

  bloques.push(heading('2. Descripción de los daños y/o perjuicios'));

  const filasDanios = Array.isArray(info.filasDanios) ? info.filasDanios : [];
  const filasDaniosConDato = filasDanios.filter(
    (f) =>
      String(f?.zona || '').trim() ||
      String(f?.condicion || '').trim() ||
      String(f?.nivel || '').trim()
  );
  if (filasDaniosConDato.length) {
    bloques.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 5360, 1800],
        borders: bordersCuadro,
        rows: [
          new TableRow({
            children: [
              cell('ELEMENTO / ZONA', {
                bold: true,
                header: true,
                width: 2200,
                cuadro: true,
                alignment: AlignmentType.CENTER,
              }),
              cell('CONDICIÓN OBSERVADA', {
                bold: true,
                header: true,
                width: 5360,
                cuadro: true,
                alignment: AlignmentType.CENTER,
              }),
              cell('NIVEL DE AFECTACIÓN', {
                bold: true,
                width: 1800,
                cuadro: true,
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          ...filasDaniosConDato.map(
            (f) =>
              new TableRow({
                children: [
                  cell(txt(f.zona), {
                    bold: true,
                    width: 2200,
                    cuadro: true,
                    verticalAlign: VerticalAlign.TOP,
                  }),
                  cell(txt(f.condicion), {
                    width: 5360,
                    cuadro: true,
                    verticalAlign: VerticalAlign.TOP,
                  }),
                  cell(txt(f.nivel), {
                    bold: true,
                    width: 1800,
                    cuadro: true,
                    alignment: AlignmentType.CENTER,
                    verticalAlign: VerticalAlign.TOP,
                  }),
                ],
              })
          ),
        ],
      })
    );
    bloques.push(p('', { after: 80 }));
  }

  if (descripcion) {
    bloques.push(
      p(descripcion, {
        after: 140,
        alignment: AlignmentType.JUSTIFIED,
      })
    );
  } else if (!filasDaniosConDato.length) {
    bloques.push(
      p('Pendiente diligenciar la descripción de los daños y/o perjuicios.', {
        after: 140,
        alignment: AlignmentType.JUSTIFIED,
      })
    );
  }

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
              transformation: { width: 400, height: 250 },
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
        after: idx === pieMapa.length - 1 ? 80 : 40,
        size: esFuente ? SIZE_META : SIZE_12,
        color: esFuente ? COLOR_MUTED : (linea.startsWith('Coordenadas:') ? COLOR_ZURICH : undefined),
      })
    );
  });

  return bloques;
}

/**
 * Zona de firmas Zurich: solo ajustador, sin tabla/bordes, abajo a la izquierda.
 */
async function construirZonaFirmasZurich({ info = {} } = {}) {
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
              color: '000000',
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
        }),
      ],
      { after: 40 }
    ),
    pLeft([
      new TextRun({ text: 'Cargo: ', font: FONT, size: SIZE_12, bold: true }),
      new TextRun({ text: cargoAjustador, font: FONT, size: SIZE_12 }),
    ]),
    pLeft([
      new TextRun({ text: 'E-Mail: ', font: FONT, size: SIZE_12, bold: true }),
      new TextRun({
        text: emailAjustador,
        font: FONT,
        size: SIZE_12,
        color: COLOR_ZURICH,
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

function tablaAnalisisPolizaZurich(filas = []) {
  const lista = (Array.isArray(filas) ? filas : []).filter(
    (f) =>
      String(f?.concepto || '').trim() ||
      String(f?.analisis || '').trim() ||
      String(f?.conclusion || '').trim()
  );
  const rows = [
    new TableRow({
      children: [
        cell('CONCEPTO', {
          bold: true,
          header: true,
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('ANÁLISIS', {
          bold: true,
          header: true,
          width: 5360,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('CONCLUSIÓN', {
          bold: true,
          header: true,
          width: 2000,
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
              width: 2000,
              cuadro: true,
              verticalAlign: VerticalAlign.TOP,
            }),
            cell(txt(f.analisis), {
              width: 5360,
              cuadro: true,
              verticalAlign: VerticalAlign.TOP,
            }),
            cell(txt(f.conclusion), {
              bold: true,
              width: 2000,
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
    columnWidths: [2000, 5360, 2000],
    borders: bordersCuadro,
    rows,
  });
}

function tablaPresupuestoPreliminarZurich(filas = [], info = {}, extras = {}) {
  const lista = Array.isArray(filas) ? filas : [];
  const desglose = desgloseReservaPreliminarZurich(
    {
      ...info,
      filasPresupuestoPreliminar: lista,
    },
    extras
  );
  const rows = [
    new TableRow({
      children: [
        cell('Capítulo', {
          bold: true,
          header: true,
          width: 2800,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('Descripción del alcance', {
          bold: true,
          header: true,
          width: 4560,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('Valor estimado', {
          bold: true,
          header: true,
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
      ],
    }),
  ];
  const conDato = lista.filter(
    (f) =>
      String(f?.capitulo || '').trim() ||
      String(f?.descripcion || '').trim() ||
      parsearNumero(f?.valor) > 0
  );
  if (!conDato.length) {
    rows.push(
      new TableRow({
        children: [
          cell('Pendiente diligenciar el presupuesto preliminar.', {
            width: 9360,
            columnSpan: 3,
            cuadro: true,
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    );
  } else {
    conDato.forEach((f) => {
      rows.push(
        new TableRow({
          children: [
            cell(txt(f.capitulo), {
              bold: true,
              width: 2800,
              cuadro: true,
              verticalAlign: VerticalAlign.TOP,
            }),
            cell(txt(f.descripcion), {
              width: 4560,
              cuadro: true,
              verticalAlign: VerticalAlign.TOP,
            }),
            cell(money(f.valor), {
              width: 2000,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
              verticalAlign: VerticalAlign.TOP,
            }),
          ],
        })
      );
    });
  }
  rows.push(
    new TableRow({
      children: [
        cell('SUBTOTAL (COSTO DIRECTO)', {
          width: 7360,
          columnSpan: 2,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
        cell(money(desglose.subtotal ?? desglose.perdida), {
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell(`AIU (${desglose.aiuPctDisplay ?? Math.round((desglose.aiuPct || 0) * 100)}%)`, {
          width: 7360,
          columnSpan: 2,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
        cell(money(desglose.aiu || 0), {
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('VALOR DE LA PÉRDIDA', {
          width: 7360,
          columnSpan: 2,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
          bold: true,
        }),
        cell(money(desglose.perdida), {
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
          bold: true,
        }),
      ],
    }),
    ...filasDeducibleReservaWord(desglose).map(
      ([etiqueta, valor]) =>
        new TableRow({
          children: [
            cell(etiqueta, {
              width: 7360,
              columnSpan: 2,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
            }),
            cell(valor, {
              width: 2000,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        })
    ),
    new TableRow({
      children: [
        cell('RESERVA SUGERIDA', {
          bold: true,
          width: 7360,
          columnSpan: 2,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
          total: true,
        }),
        cell(money(desglose.reserva), {
          bold: true,
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
          total: true,
        }),
      ],
    })
  );
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 4560, 2000],
    borders: bordersCuadro,
    rows,
  });
}

function totalesLiquidadorUnicoDesdeFilas(filas = [], aiuPct = 25, imprPct = 0, impPct = 0) {
  const subtotal = (Array.isArray(filas) ? filas : []).reduce((s, it) => {
    const t = totalFilaPresupuesto(it);
    return s + (t == null ? 0 : Number(t) || 0);
  }, 0);
  const aiu = subtotal * (Number(aiuPct) || 0) / 100;
  const imprevistos = (Number(imprPct) || 0) > 0 ? (subtotal + aiu) * (Number(imprPct) / 100) : 0;
  const impuestos =
    (Number(impPct) || 0) > 0 ? (subtotal + aiu + imprevistos) * (Number(impPct) / 100) : 0;
  return { subtotal, aiu, imprevistos, impuestos, total: subtotal + aiu + imprevistos + impuestos };
}

function desgloseWordOtrosAmparos(lista = []) {
  const activos = filasOtrosAmparosActivos(lista);
  if (!activos.length) return { activos: [], total: 0, filas: [] };
  return {
    activos,
    total: sumarOtrosAmparos(lista),
    filas: activos.map((it) => {
      const nom = nombreTipoOtroAmparo(it.tipo, it.nombre);
      const obs = String(it.observacion || '').trim();
      return { label: obs ? `${nom} — ${obs}` : nom, valor: valorMostrarOtroAmparo(it) };
    }),
  };
}

function tablaLiquidadorUnicoZurich({
  filas = [],
  totalesFooter = {},
  aiuPct = 25,
  mostrarImprevistos = false,
  mostrarImpuestos = false,
  imprPct = 0,
  impPct = 0,
  otrosAmparos = [],
} = {}) {
  const w = UNICO_COLS.widths;
  const cellU = (text, colIdx, opts = {}) =>
    cell(text, {
      width: w[colIdx] || 900,
      size: SIZE_UNICO,
      compact: true,
      cuadro: true,
      alignment: opts.alignment || AlignmentType.LEFT,
      bold: !!opts.bold,
      header: !!opts.header,
      total: !!opts.total,
      columnSpan: opts.columnSpan || 1,
    });

  const rows = [
    new TableRow({
      children: UNICO_COLS.labels.map((label, i) =>
        cellU(label, i, { bold: true, header: true, alignment: AlignmentType.CENTER })
      ),
    }),
  ];

  const filasConDatos = (Array.isArray(filas) ? filas : []).filter(
    (it) =>
      String(it?.actividad || '').trim() ||
      String(it?.componente || '').trim() ||
      String(it?.capitulo || '').trim() ||
      Number(it?.cantidad) > 0
  );

  if (filasConDatos.length) {
    filasConDatos.forEach((it) => {
      const tot = totalFilaPresupuesto(it);
      rows.push(
        new TableRow({
          children: [
            cellU(it.capitulo || '—', 0),
            cellU(it.componente || '—', 1),
            cellU(it.actividad || '—', 2),
            cellU(it.unidad || '—', 3, { alignment: AlignmentType.CENTER }),
            cellU(
              it.cantidad === '' || it.cantidad == null ? '—' : String(it.cantidad),
              4,
              { alignment: AlignmentType.RIGHT }
            ),
            cellU(
              it.valorUnitario === '' || it.valorUnitario == null
                ? '—'
                : money(it.valorUnitario),
              5,
              { alignment: AlignmentType.RIGHT }
            ),
            cellU(tot == null ? '—' : money(tot), 6, { alignment: AlignmentType.RIGHT }),
            cellU(it.prioridad || '—', 7, { alignment: AlignmentType.CENTER }),
            cellU(it.fuente || '—', 8),
          ],
        })
      );
    });
  } else {
    rows.push(
      new TableRow({
        children: [
          cell('Sin ítems en el presupuesto', {
            width: UNICO_TABLE_W,
            columnSpan: 9,
            size: SIZE_UNICO,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    );
  }

  const resumen = [
    ['SUBTOTAL (COSTO DIRECTO)', money(totalesFooter.subtotal)],
    [`AIU (${aiuPct}%)`, money(totalesFooter.aiu)],
    ...(mostrarImprevistos ? [[`IMPREVISTOS (${imprPct}%)`, money(totalesFooter.imprevistos)]] : []),
    ...(mostrarImpuestos ? [[`IMPUESTOS (${impPct}%)`, money(totalesFooter.impuestos)]] : []),
    ['TOTAL, ESTIMADO', money(totalesFooter.total)],
  ];
  if (Number(totalesFooter.deducibleAplicado) > 0) {
    resumen.push([
      totalesFooter.textoDeducible
        ? `DEDUCIBLE (${totalesFooter.textoDeducible})`
        : 'DEDUCIBLE',
      `− ${money(totalesFooter.deducibleAplicado)}`,
    ]);
    if (totalesFooter.totalIndemnizar != null) {
      resumen.push(['PRESUPUESTO NETO', money(totalesFooter.totalIndemnizar)]);
    }
  }
  if (Number(totalesFooter.contenidosPerdida) > 0) {
    resumen.push(['TOTAL CONTENIDOS (PÉRDIDA)', money(totalesFooter.contenidosPerdida)]);
    if (Number(totalesFooter.contenidosDeducible) > 0) {
      resumen.push([
        'DEDUCIBLE CONTENIDOS (POR CATEGORÍA)',
        `− ${money(totalesFooter.contenidosDeducible)}`,
      ]);
    }
    resumen.push(['CONTENIDOS NETO', money(totalesFooter.contenidosNeto)]);
  }
  const otros = desgloseWordOtrosAmparos(otrosAmparos);
  const netoPresupuesto =
    totalesFooter.totalIndemnizar != null
      ? Number(totalesFooter.totalIndemnizar) || 0
      : Math.max(
          0,
          (Number(totalesFooter.total) || 0) -
            (Number(totalesFooter.deducibleAplicado) || 0)
        );
  if (otros.filas.length) {
    resumen.push(['GASTOS SIN DEDUCIBLE', money(otros.total)]);
    otros.filas.forEach((f) => resumen.push([f.label, money(f.valor)]));
  }
  const totalFinal = Number(totalesFooter.totalIndemnizarFinal);
  const totalConGastos = netoPresupuesto + (Number(totalesFooter.contenidosNeto) || 0) + otros.total;
  if (
    otros.filas.length ||
    Number(totalesFooter.contenidosPerdida) > 0 ||
    (Number.isFinite(totalFinal) && Math.abs(totalFinal - netoPresupuesto) > 0.05)
  ) {
    resumen.push([
      'TOTAL A INDEMNIZAR',
      money(Number.isFinite(totalFinal) && totalFinal > 0 ? totalFinal : totalConGastos),
    ]);
  }
  const wLabel = w.slice(0, 6).reduce((a, b) => a + b, 0);
  resumen.forEach(([lab, val]) => {
    const esTotal = /TOTAL|INDEMNIZAR|NETO|SUBTOTAL/i.test(String(lab));
    rows.push(
      new TableRow({
        children: [
          cell(lab, {
            width: wLabel,
            columnSpan: 6,
            size: SIZE_UNICO,
            compact: true,
            cuadro: true,
            bold: true,
            total: esTotal,
            alignment: AlignmentType.RIGHT,
          }),
          cell(val, {
            width: w[6],
            size: SIZE_UNICO,
            compact: true,
            cuadro: true,
            bold: true,
            total: esTotal,
            alignment: AlignmentType.RIGHT,
          }),
          cell('', { width: w[7], size: SIZE_UNICO, compact: true, cuadro: true }),
          cell('', { width: w[8], size: SIZE_UNICO, compact: true, cuadro: true }),
        ],
      })
    );
  });

  return new Table({
    width: { size: UNICO_TABLE_W, type: WidthType.DXA },
    columnWidths: w,
    borders: bordersCuadro,
    rows,
  });
}

function footerUnicoConDeducibleZurich(base = {}, totales = {}, liq = {}) {
  const desglose = desgloseDeducibleTerremotoZurich(liq, totales.diagrama);
  return {
    ...base,
    deducibleAplicado:
      Number(desglose.aplicado) || Number(totales.deducibleAplicado) || 0,
    textoDeducible: desglose.texto || totales.deducibleTexto || '',
    totalIndemnizar: desglose.neto,
    // El edificio no arrastra contenidos aquí: van en 4.2 / 4.3.
    contenidosPerdida: 0,
    contenidosDeducible: 0,
    contenidosNeto: 0,
    totalIndemnizarFinal: desglose.neto,
  };
}

function tablaResumenLiquidacionZurichWord(filas = []) {
  const list = Array.isArray(filas) ? filas.filter((f) => f && f.label) : [];
  if (!list.length) return null;
  const labelW = 6200;
  const valueW = 3160;
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [labelW, valueW],
    borders: bordersFicha,
    rows: list.map((fila) => {
      const destacado = !!(fila.bold || fila.destacado);
      const esTotal =
        destacado ||
        /INDEMNIZAR|INDEMNIZACIÓN|TOTAL|NETO|RESERVA/i.test(String(fila.label || ''));
      return new TableRow({
        children: [
          cell(fila.label, {
            width: labelW,
            cuadro: true,
            bold: destacado || esTotal,
            label: !esTotal,
            total: esTotal,
          }),
          cell(money(fila.value), {
            width: valueW,
            cuadro: true,
            bold: destacado || esTotal,
            total: esTotal,
            alignment: AlignmentType.RIGHT,
          }),
        ],
      });
    }),
  });
}

function tablaLiquidacionPorCoberturaZurichWord(filas = []) {
  const list = Array.isArray(filas) ? filas.filter((f) => f && f.cobertura) : [];
  if (!list.length) return null;
  const w = [3600, 1920, 1920, 1920];
  const head = ['Cobertura / amparo', 'Pérdida', 'Deducible', 'Neto'];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: w,
    borders: bordersCuadro,
    rows: [
      new TableRow({
        children: head.map((h, i) =>
          cell(h, {
            width: w[i],
            cuadro: true,
            bold: true,
            header: true,
            alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
          })
        ),
      }),
      ...list.map(
        (fila) =>
          new TableRow({
            children: [
              cell(fila.cobertura, {
                width: w[0],
                cuadro: true,
                bold: !!fila.total,
                total: !!fila.total,
              }),
              cell(money(fila.perdida), {
                width: w[1],
                cuadro: true,
                bold: !!fila.total,
                total: !!fila.total,
                alignment: AlignmentType.RIGHT,
              }),
              cell(money(fila.deducible), {
                width: w[2],
                cuadro: true,
                bold: !!fila.total,
                total: !!fila.total,
                alignment: AlignmentType.RIGHT,
              }),
              cell(money(fila.neto), {
                width: w[3],
                cuadro: true,
                bold: !!fila.total,
                total: !!fila.total,
                alignment: AlignmentType.RIGHT,
              }),
            ],
          })
      ),
    ],
  });
}

function tablaDiagramaAjusteZurich(desglose = {}, extras = {}) {
  const rows = [
    new TableRow({
      children: [
        cell('Capítulo', {
          bold: true,
          header: true,
          width: 2800,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('Descripción del alcance', {
          bold: true,
          header: true,
          width: 4560,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('Valor estimado', {
          bold: true,
          header: true,
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('PERDIDA OBRA CIVIL ESTABLECIDA', {
          bold: true,
          width: 2800,
          cuadro: true,
          verticalAlign: VerticalAlign.TOP,
        }),
        cell('VER ITEM PRESUPUESTO', {
          width: 4560,
          cuadro: true,
          verticalAlign: VerticalAlign.TOP,
        }),
        cell(money(desglose.perdida), {
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
          verticalAlign: VerticalAlign.TOP,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('VALOR DE LA PÉRDIDA', {
          width: 7360,
          columnSpan: 2,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
        cell(money(desglose.perdida), {
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('VALOR ASEGURADO', {
          width: 7360,
          columnSpan: 2,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
        cell(money(desglose.valorAsegurado), {
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }),
    ...filasDeducibleReservaWord(desglose).map(
      ([etiqueta, valor]) =>
        new TableRow({
          children: [
            cell(etiqueta, {
              width: 7360,
              columnSpan: 2,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
            }),
            cell(valor, {
              width: 2000,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        })
    ),
    new TableRow({
      children: [
        cell('RESERVA SUGERIDA', {
          bold: true,
          width: 7360,
          columnSpan: 2,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
        cell(money(desglose.reserva), {
          bold: true,
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }),
    ...(() => {
      const otros = desgloseWordOtrosAmparos(extras.otrosAmparos);
      if (!otros.filas.length) return [];
      const extraRows = [
        ...otros.filas.map(
          (f) =>
            new TableRow({
              children: [
                cell(f.label, {
                  width: 7360,
                  columnSpan: 2,
                  cuadro: true,
                  alignment: AlignmentType.RIGHT,
                }),
                cell(money(f.valor), {
                  width: 2000,
                  cuadro: true,
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            })
        ),
        new TableRow({
          children: [
            cell('GASTOS SIN DEDUCIBLE', {
              width: 7360,
              columnSpan: 2,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
            }),
            cell(money(otros.total), {
              width: 2000,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('TOTAL A INDEMNIZAR', {
              bold: true,
              width: 7360,
              columnSpan: 2,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
            }),
            cell(money(Math.round((Number(desglose.reserva) || 0) + otros.total)), {
              bold: true,
              width: 2000,
              cuadro: true,
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      ];
      return extraRows;
    })(),
  ];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 4560, 2000],
    borders: bordersCuadro,
    rows,
  });
}

/**
 * Informe preliminar, final o único Zurich.
 * El preliminar replica la ficha, daños, póliza y reserva.
 * El final reutiliza ese contenido y añade el liquidador del presupuesto.
 * El único es el expediente completo con liquidador.
 */
export async function descargarWordInformeZurich({ caso = {}, informe = null, liquidador = null } = {}) {
  const info = heredarInformePreliminarZurich(
    informe || defaultInformeUnicoZurich(caso),
    informe?.snapshotPreliminar || caso?.informeUnico?.snapshotPreliminar || caso?.informeUnico
  );
  const liq = migrarLiquidadorDeducibleTerremotoZurich(
    liquidador || mapcasoZurichALiquidador(caso),
    caso
  );
  const totales = calcularLiquidacionZurich(liq);
  const enc = liq.encabezado || {};
  const expressWord = payloadExpressParaInforme(liq, { modulo: 'zurich' });
  const filasPresupuesto = expressWord?.filasConCantidad?.length
    ? expressWord.filasConCantidad
    : Array.isArray(liq?.evaluacionSismicaNSR10?.presupuesto?.items)
      ? liq.evaluacionSismicaNSR10.presupuesto.items
      : [];
  const contenidosNsr = liq?.evaluacionSismicaNSR10?.contenidos || {};
  const presupuesto = liq?.evaluacionSismicaNSR10?.presupuesto || {};
  const aiuPct = Math.round(
    (totales.aiuPct ?? totales.presupuesto?.aiuPct ?? presupuesto.aiuPorcentaje ?? 0.25) * 10000
  ) / 100;
  const imprPct = Math.round(
    (totales.presupuesto?.imprPct ?? presupuesto.imprevistosPorcentaje ?? 0) * 100
  );
  const impPct = Math.round(
    (totales.presupuesto?.impPct ?? presupuesto.impuestosPorcentaje ?? 0) * 100
  );
  const mostrarImprevistos = imprPct > 0 || Number(totales.imprevistos) > 0;
  const mostrarImpuestos = impPct > 0 || Number(totales.impuestos) > 0;
  const usaDeduciblePorArticulo = esModoDeduciblePorArticuloNsr(liq.liquidacionCatastrofico || {}, {
    usaDeduciblePorArticulo: totales.contenidos?.usaDeduciblePorArticulo,
    usaDeduciblePorArticuloPresupuesto: totales.presupuesto?.usaDeduciblePorArticulo,
  });
  const esPreliminar = esInformePreliminarZurich(info);
  const tipoNorm = normalizarTipoInformeZurich(info.tipoInforme, 'preliminar');
  const tipoEtiqueta =
    tipoNorm === 'preliminar' ? 'preliminar' : tipoNorm === 'final' ? 'final' : 'único';
  const filasConDatos = filasPresupuesto.filter(
    (it) =>
      String(it?.actividad || '').trim() ||
      String(it?.componente || '').trim() ||
      String(it?.capitulo || '').trim() ||
      Number(it?.cantidad) > 0
  );
  const conLiquidador = !esPreliminar;
  const seccionFotos = conLiquidador ? 6 : 5;
  const aiuPctLiquidadorUnico =
    totales.origenPresupuesto === 'cotizacion' ? 25 : aiuPct;
  const totalesUnicoNsr = totalesLiquidadorUnicoDesdeFilas(
    filasConDatos,
    aiuPctLiquidadorUnico,
    mostrarImprevistos ? imprPct : 0,
    mostrarImpuestos ? impPct : 0
  );
  const perdidaAjusteUnico = Math.round(
    filasConDatos.length
      ? totalesUnicoNsr.total
      : Number(totales.totalPresupuesto) || 0
  );
  const fotosParaWord = fotosInformeDesdeCasoZurich(caso, info);

  const fotoParrafos = [];
  let fotosIncluidas = 0;
  const fotosCargadas = await mapConCurrencia(
    fotosParaWord,
    FOTO_FETCH_PARALELO,
    async (archivo) => {
      const img = await bytesDesdeFotoParaInforme(archivo);
      return { archivo, img };
    }
  );
  for (const { archivo, img } of fotosCargadas) {
    if (!img) {
      fotoParrafos.push(
        p(`• ${archivo.nombreOriginal || archivo.nombre || 'Foto'} (no embebida)`, {
          size: SIZE_12,
        })
      );
      continue;
    }
    fotosIncluidas += 1;
    const leyenda =
      String(archivo.descripcion || '').trim() ||
      String(archivo.nombreOriginal || archivo.nombre || '').trim() ||
      `Foto ${fotosIncluidas}`;
    fotoParrafos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 40 },
        children: [
          new ImageRun({
            data: img.bytes,
            transformation: { width: FOTO_WORD_ANCHO, height: FOTO_WORD_ALTO },
            type: img.type,
          }),
        ],
      }),
      p(leyenda, {
        alignment: AlignmentType.CENTER,
        size: SIZE_12,
        after: 120,
      })
    );
  }
  if (!fotoParrafos.length) {
    fotoParrafos.push(
      p(
        `Pendiente registro fotográfico. Suba las fotos en la sección ${seccionFotos} del informe (zona de arrastre).`,
        { size: SIZE_12 }
      )
    );
  }

  const fotosCotizacionRaw = fotosCotizacionDesdeLiquidador(liq, info).filter(
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
    const img = await bytesDesdeFotoParaInforme(archivo);
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
  const montoCotizTxt = money(totales.cotizacionMonto || liq?.cotizacionPdf?.montoFinal);
  const desgloseDedWord = desgloseDeducibleTerremotoZurich(liq, totales.diagrama);
  const tablaResumenCotiz = tablaResumenLiquidacionZurichWord(
    filasResumenLiquidacionZurich(liq, totales)
  );
  const tieneCotizacionPdf =
    totales.origenPresupuesto === 'cotizacion' ||
    (Array.isArray(liq?.cotizacionPdf?.paginas) && liq.cotizacionPdf.paginas.length > 0) ||
    Boolean(liq?.cotizacionPdf?.archivoPdf);
  const usaCotizacionWord = totales.origenPresupuesto === 'cotizacion' || tieneCotizacionPdf;
  const seccionCotizacion =
    cotizacionParrafos.length || (usaCotizacionWord && tablaResumenCotiz)
      ? [
          heading('Cotización de reparación del asegurado'),
          p(
            cotizacionesIncluidas
              ? `Cotización presentada por el asegurado (${cotizacionesIncluidas} página(s)).${
                  Number(totales.cotizacionMonto) > 0 ? ` Monto indicado: ${montoCotizTxt}.` : ''
                }`
              : `Cotización del asegurado${Number(totales.cotizacionMonto) > 0 ? ` · monto ${montoCotizTxt}` : ''}.`,
            { after: 120, size: SIZE_12 }
          ),
          ...cotizacionParrafos,
          ...(tablaResumenCotiz && totales.origenPresupuesto === 'cotizacion'
            ? [
                p('Resultado de la liquidación', {
                  bold: true,
                  before: 200,
                  after: 80,
                }),
                p(
                  `Sobre la cotización se aplica AIU (${aiuPct}%) y el deducible de terremoto (el mayor entre ${desgloseDedWord.porcentaje}% del valor asegurable y ${desgloseDedWord.cantidadMinimo} ${desgloseDedWord.tipoMinimo}).`,
                  { after: 80, size: SIZE_12 }
                ),
                tablaResumenCotiz,
              ]
            : []),
        ]
      : [];

  const infoEventoParrafos = String(info.infoEvento || '')
    .split(/\n+/)
    .filter((l) => l.trim())
    .map((l) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100 },
        children: [new TextRun({ text: l, font: FONT, size: SIZE_12 })],
      })
    );

  const baseUrl = import.meta.env.BASE_URL || '/';
  let mapaEvento = await loadLogoBytes(`${baseUrl}templates/mapa-evento-siniestro-Zurich.png`);
  if (!mapaEvento) {
    mapaEvento = await loadLogoBytes(`${baseUrl}templates/mapa-evento-siniestro.png`);
  }
  const mapaEventoParrafos = [];
  if (mapaEvento) {
    mapaEventoParrafos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [
          new ImageRun({
            data: mapaEvento.bytes,
            transformation: { width: 400, height: 250 },
            type: mapaEvento.type,
          }),
        ],
      }),
      p('Mapa del evento — impacto del sismo en Colombia', {
        alignment: AlignmentType.CENTER,
        size: SIZE_META,
        after: 120,
        color: '555555',
      })
    );
  }

  const header = await crearEncabezadoZurich({ caso, informe: info, landscape: false });
  const headerLandscape = await crearEncabezadoZurich({
    caso,
    informe: info,
    landscape: true,
  });

  const usaCotizacion = totales.origenPresupuesto === 'cotizacion';

  const w = NSR_COLS.widths;
  const cellNsr = (text, colIdx, opts = {}) =>
    cell(text, {
      width: w[colIdx],
      size: SIZE_NSR,
      compact: true,
      cuadro: true,
      alignment: opts.alignment || AlignmentType.LEFT,
      bold: !!opts.bold,
      columnSpan: opts.columnSpan || 1,
    });

  const filasNsr = [
    new TableRow({
      children: NSR_COLS.labels.map((label, i) =>
        cellNsr(label, i, { bold: true, alignment: AlignmentType.CENTER })
      ),
    }),
  ];

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
            cellNsr(
              [
                it.observacion,
                ...(usaDeduciblePorArticulo && filaPresupuestoListaParaDeducible(it)
                  ? [
                      it.tipoCobertura || it.coberturaAfectar
                        ? `Cobertura: ${it.tipoCobertura || it.coberturaAfectar}`
                        : '',
                      it.deducibleCalculado
                        ? `Deducible: ${money(it.deducibleCalculado)}`
                        : '',
                    ]
                  : []),
              ]
                .filter(Boolean)
                .join(' · ') || '—',
              9
            ),
            cellNsr(it.fuente || '—', 10),
          ],
        })
      );
    });
  } else {
    filasNsr.push(
      new TableRow({
        children: [
          cell('Sin ítems en el presupuesto', {
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
            alignment: AlignmentType.RIGHT,
          }),
          cell(val, {
            width: w[7],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            bold: true,
            alignment: AlignmentType.RIGHT,
          }),
          cell('', {
            width: w.slice(8).reduce((a, b) => a + b, 0),
            columnSpan: 4,
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
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

  const valoresAsegWord = valoresAsegurablesDesdeLiquidador(liq);
  const amparosContenidosWord =
    Array.isArray(totales.contenidosPorAmparo) && totales.contenidosPorAmparo.length
      ? totales.contenidosPorAmparo
      : liquidarContenidosPorAmparoZurich(liq, {
          evalData: liq?.evaluacionSismicaNSR10 || {},
          valores: valoresAsegWord,
        });
  const seccionesContenidosWord = amparosContenidosWord
    .filter((a) => Array.isArray(a.items) && a.items.length)
    .map((amparo, idx) => {
      const { tabla } = construirTablaContenidosWord({
        contenidos: { ...contenidosNsr, items: amparo.items },
        cell,
        size: SIZE_NSR,
        incluirDeduciblePorArticulo: false,
        valoresAsegurablesCaso: valoresAsegWord,
      });
      const n = idx + 2; // 4.2, 4.3, ...
      return {
        heading: `4.${n} ${amparo.cobertura}`,
        tabla,
        amparo,
      };
    });

  const firmasParrafos = await construirZonaFirmasZurich({ caso, enc, info });
  const bloqueDaniosUbicacion = await construirBloqueDaniosUbicacionZurich({ info, caso });

  const pagePortrait = {
    margin: { top: 1000, bottom: 800, left: 1000, right: 1000 },
    size: { orientation: PageOrientation.PORTRAIT },
  };
  const pageLandscape = {
    margin: { top: 720, bottom: 720, left: 720, right: 720 },
    size: { orientation: PageOrientation.LANDSCAPE },
  };

  const seccionConclusiones = [
    heading(
      `${conLiquidador ? 5 : 4}. Conclusiones y recomendación del ajustador`
    ),
    ...(conLiquidador
      ? []
      : tieneCotizacionPdf
        ? [
            p(
              'No se incluye presupuesto preliminar escrito: la cotización PDF es el soporte de reparación.',
              { after: 120 }
            ),
            ...seccionCotizacion,
          ]
        : [
            p('PRESUPUESTO PRELIMINAR DE REPARACIÓN', {
              bold: true,
              before: 40,
              after: 120,
            }),
            tablaPresupuestoPreliminarZurich(
              info.filasPresupuestoPreliminar,
              info,
              extrasReservaWord(info, { caso, enc, liquidador: liq })
            ),
          ]),
    p('Conclusiones', { bold: true, before: 80, after: 40 }),
    p(txt(info.conclusiones, 'Pendiente diligenciar conclusiones.'), {
      after: 80,
      alignment: AlignmentType.JUSTIFIED,
    }),
    p('Recomendación', { bold: true, after: 40 }),
    p(txt(info.recomendacion, 'Pendiente diligenciar recomendación.'), {
      after: 80,
      alignment: AlignmentType.JUSTIFIED,
    }),
  ];

  const seccionFotosFirmas = [
    heading(`${seccionFotos}. Inspección fotográfica`),
    p(
      fotosIncluidas
        ? `Registro fotográfico del predio (${fotosIncluidas} imagen(es)).`
        : 'Registro fotográfico del predio.',
      { after: 80 }
    ),
    ...fotoParrafos,
    p(
      `Para constancia se firma el presente informe ${tipoEtiqueta} en ${txt(
        caso.ciudad || enc.ciudad,
        'Colombia'
      )}, ${fmtFecha(info.fechaInforme || new Date())}.`,
      { before: 200, after: 200 }
    ),
    ...firmasParrafos,
  ];

  const sections = [
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [
        crearTituloInformeZurich(info),
        p('Zurich S.A.', {
          alignment: AlignmentType.CENTER,
          bold: true,
          size: SIZE_12,
          after: 160,
          color: '333333',
        }),
        construirCuadroPrincipal({
          caso,
          enc,
          info,
          totales,
          portada: liq?.evaluacionSismicaNSR10?.portada || {},
          liquidador: liq,
          perdidaAjuste: !esPreliminar ? perdidaAjusteUnico : null,
        }),
      ],
    },
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [
        heading('1. Información general del evento'),
        ...(infoEventoParrafos.length
          ? infoEventoParrafos
          : [p('Sin información del evento.')]),
        ...mapaEventoParrafos,
        ...bloqueDaniosUbicacion,
        heading('3. Información de póliza y cobertura'),
        p('Datos de la ficha del caso (Gestionar).', { after: 80, size: SIZE_META, color: '555555' }),
        construirTablaPolizaCasoZurich({ caso, enc, info }),
        p('Análisis de póliza y cobertura', {
          bold: true,
          before: 80,
          after: 80,
          size: SIZE_12,
        }),
        // Deducible terremoto: manual; si está vacío no sale en el Word.
        tablaAnalisisPolizaZurich(
          completarFilasPolizaCoberturaZurich(info.filasPolizaCobertura, {
            caso,
            encabezado: enc,
            informe: info,
            liquidador: liq,
            totales,
            conLiquidador: !esPreliminar,
            ...(!esPreliminar && perdidaAjusteUnico > 0 ? { perdida: perdidaAjusteUnico } : {}),
          }).filter((f) => {
            const concepto = String(f?.concepto || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            if (!concepto.includes('deducible')) return true;
            return String(f?.analisis || '').trim() || String(f?.conclusion || '').trim();
          })
        ),
      ],
    },
  ];

  if (conLiquidador) {
    const footerExpress = footerExpressParaWord(expressWord);
    const totalesFooterUnico = footerExpress
      ? footerExpress
      : filasConDatos.length
      ? totalesUnicoNsr
      : {
          subtotal: totales.subtotal,
          aiu: totales.aiu,
          imprevistos: totales.imprevistos,
          impuestos: totales.impuestos,
          total: totales.totalPresupuesto ?? totales.presupuesto?.total,
        };
    sections.push({
      properties: { page: pageLandscape },
      headers: { default: headerLandscape },
      children: [
        heading('4. Liquidación (presupuesto de reparación ajustador)'),
        p('4.1 Obra civil / Edificio', {
          bold: true,
          before: 80,
          after: 80,
          size: SIZE_12,
        }),
        ...(seccionCotizacion.length
          ? seccionCotizacion
          : [
              p(
                'Adjunte la cotización PDF del asegurado en el liquidador para que aparezca aquí.',
                { after: 80, size: SIZE_12 }
              ),
            ]),
        ...(usaCotizacion && !seccionCotizacion.length && tablaResumenCotiz
          ? [tablaResumenCotiz]
          : []),
        ...(!usaCotizacion
          ? [
              tablaLiquidadorUnicoZurich({
                filas: filasPresupuesto,
                totalesFooter: footerUnicoConDeducibleZurich(
                  totalesFooterUnico,
                  totales,
                  liq
                ),
                aiuPct: footerExpress?.aiuPct ?? aiuPctLiquidadorUnico,
                mostrarImprevistos,
                mostrarImpuestos,
                imprPct,
                impPct,
                otrosAmparos: [],
              }),
            ]
          : filasConDatos.length
            ? [
                p('Presupuesto NSR-10 (referencia)', {
                  bold: true,
                  before: 160,
                  after: 80,
                }),
                tablaLiquidadorUnicoZurich({
                  filas: filasPresupuesto,
                  totalesFooter: totalesFooterUnico,
                  aiuPct: footerExpress?.aiuPct ?? aiuPct,
                  mostrarImprevistos,
                  mostrarImpuestos,
                  imprPct,
                  impPct,
                  otrosAmparos: [],
                }),
              ]
            : (() => {
                const otros = desgloseWordOtrosAmparos(
                  totales.otrosAmparos || liq.otrosAmparos
                );
                const yaEnResumen =
                  tablaResumenCotiz && totales.origenPresupuesto === 'cotizacion';
                if (!otros.filas.length || yaEnResumen) return [];
                return [
                  p('Gastos sin deducible', {
                    bold: true,
                    before: 160,
                    after: 80,
                  }),
                  tablaResumenLiquidacionZurichWord([
                    ...otros.filas.map((f) => ({ label: f.label, value: f.valor })),
                    {
                      label: 'TOTAL GASTOS SIN DEDUCIBLE',
                      value: otros.total,
                      bold: true,
                      destacado: true,
                    },
                  ]),
                ].filter(Boolean);
              })()),
      ],
    });
    seccionesContenidosWord.forEach((sec) => {
      sections.push({
        properties: { page: pageLandscape },
        headers: { default: headerLandscape },
        children: [
          heading(sec.heading),
          sec.tabla,
          p(
            `Subtotal pérdida ${sec.amparo.cobertura}: ${money(sec.amparo.perdida)}. ` +
              `Deducible terremoto: − ${money(sec.amparo.deducible)}. ` +
              `Indemnización: ${money(sec.amparo.neto)}.`,
            { before: 120, after: 80, size: SIZE_12 }
          ),
          tablaResumenLiquidacionZurichWord([
            { label: 'Subtotal pérdida', value: sec.amparo.perdida },
            { label: 'Deducible terremoto', value: sec.amparo.deducible },
            {
              label: 'INDEMNIZACIÓN',
              value: sec.amparo.neto,
              bold: true,
              destacado: true,
            },
          ]),
        ],
      });
    });
    {
      const coberturas = filasLiquidacionPorCoberturaZurich(liq, totales);
      const tablaCob = tablaLiquidacionPorCoberturaZurichWord(coberturas);
      const otros = desgloseWordOtrosAmparos(totales.otrosAmparos || liq.otrosAmparos);
      const hijos = [];
      if (tablaCob) {
        hijos.push(
          heading(
            `4.${2 + seccionesContenidosWord.length} Diagrama de liquidación`
          ),
          p(
            'Cada amparo se liquida con su pérdida y su deducible. El total a indemnizar es la suma de los netos.',
            { after: 80, size: SIZE_12 }
          ),
          tablaCob
        );
      }
      if (otros.filas.length) {
        hijos.push(
          p('Gastos sin deducible', { bold: true, before: 160, after: 80 }),
          tablaResumenLiquidacionZurichWord([
            ...otros.filas.map((f) => ({ label: f.label, value: f.valor })),
            {
              label: 'TOTAL GASTOS SIN DEDUCIBLE',
              value: otros.total,
              bold: true,
              destacado: true,
            },
            {
              label: 'TOTAL A INDEMNIZAR',
              value: totales.totalIndemnizar,
              bold: true,
              destacado: true,
            },
          ])
        );
      }
      if (hijos.length) {
        sections.push({
          properties: { page: pageLandscape },
          headers: { default: headerLandscape },
          children: hijos,
        });
      }
    }
    sections.push({
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [...seccionConclusiones, ...seccionFotosFirmas],
    });
  } else {
    sections.push({
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [...seccionConclusiones, ...seccionFotosFirmas],
    });
  }

  const doc = new Document({
    sections: seccionesConEncabezadoUnico(sections, header),
  });

  const blob = await Packer.toBlob(doc);
  const prefijo = prefijoArchivoInformeZurich(info.tipoInforme);
  const nombre = `${prefijo}_${caso.siniestro || caso.consecutivo || 'caso'}.docx`.replace(
    /[^\w.\-áéíóúÁÉÍÓÚñÑ]+/gi,
    '_'
  );
  descargarBlob(blob, nombre);
  return { blob, filename: nombre };
}
