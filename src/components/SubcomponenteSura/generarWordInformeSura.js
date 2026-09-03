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
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10, totalFilaPresupuesto } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { construirTablaContenidosWord } from '../SubcomponenteEvaluacionSismicaNSR10/construirTablaContenidosWord.js';
import {
  calcularLiquidacionSura,
  completarFilasPolizaCoberturaSura,
  defaultInformeUnicoSura,
  etiquetaEncabezadoInformeSura,
  etiquetaReporteCuadroSura,
  etiquetaTituloInformeSura,
  esInformePreliminarSura,
  formatearMonto,
  formatDateLarga,
  itemsPlanosSura,
  mapCasoSuraALiquidador,
  normalizarTipoInformeSura,
  parsearNumero,
  prefijoArchivoInformeSura,
  presupuestoNsrTieneDatosSura,
  contenidosNsrTienenDatosSura,
  gastosLiquidadorTienenDatosSura,
  RAZON_SOCIAL_SURA,
  reservaSugeridaSura,
  resumenLiquidacionIndependienteSura,
  textoDescripcionDaniosSura,
} from './liquidadorSuraHelpers.js';
import { urlDescargaArchivoSura } from '../../services/segurosSuraService.js';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';
import { jpegDesdeBytesImagen } from '../../utils/heicToJpeg.js';
import {
  fusionarFotosAgilEnInforme,
  fusionarFotosArchiveroEnGaleria,
} from './informeAgilSuraHelpers.js';

/** Bordes estilo informe catastrófico / Puertos */
const borderCuadro = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
const bordersCuadro = {
  top: borderCuadro,
  bottom: borderCuadro,
  left: borderCuadro,
  right: borderCuadro,
  insideHorizontal: borderCuadro,
  insideVertical: borderCuadro,
};
const thin = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: none, bottom: none, left: none, right: none };
const bordesEncabezado = {
  top: borderCuadro,
  bottom: borderCuadro,
  left: borderCuadro,
  right: borderCuadro,
  insideHorizontal: borderCuadro,
  insideVertical: borderCuadro,
};

const FONT = 'Arial';
/** Tamaño Word: half-points → 24 = 12 pt */
const SIZE_12 = 24;
const SIZE_META = 20;
const SIZE_NSR = 14; // 7 pt — tabla presupuesto completa en landscape

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

const firstTxt = (...vals) => {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s && s !== 'null' && s !== 'undefined' && s !== '—') return s;
  }
  return '';
};

const ciudadDepartamentoTxt = (caso = {}, enc = {}) => {
  const ciudad = firstTxt(caso.ciudad, caso.ciudadSiniestro, caso.nombreCiudad, enc.ciudad);
  const depto = firstTxt(caso.departamento, caso.departamentoCiudad, enc.departamento);
  if (ciudad && depto) return `${ciudad} / ${depto}`;
  return txt(ciudad || depto);
};

const fmtFechaCorta = (value) => {
  if (value == null || value === '') return '—';
  try {
    if (typeof value === 'string') {
      const raw = value.trim();
      const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const mm = parts.find((p) => p.type === 'month')?.value;
    const dd = parts.find((p) => p.type === 'day')?.value;
    if (y && mm && dd) return `${dd}/${mm}/${y}`;
    return String(value);
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
 * Encabezado formal (fórmula Catastrófico / Motorysa):
 * Logo Proser | Razón social + tipo de informe | Logo Sura
 * FECHA = día en que se genera el Word (no fecha de asignación).
 */
async function crearEncabezadoSura({ caso = {}, informe = {}, fechaGeneracion = new Date() } = {}) {
  const base = import.meta.env.BASE_URL || '/';
  let proser = await loadLogoBytes(`${base}templates/logo-grupoproser.png`);
  if (!proser) proser = await loadLogoBytes(`${base}templates/logo-grupoproser.jpg`);
  const sura = await loadLogoBytes(`${base}templates/logo-sura.png`);

  const siniestro = txt(caso.siniestro || caso.nmroSinstro || caso.consecutivo, '—');
  const fecha = fmtFechaCorta(fechaGeneracion);

  const celdaMeta = (texto) =>
    new TableCell({
      borders,
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: texto, font: FONT, size: SIZE_META, color: '333333' }),
          ],
        }),
      ],
    });

  const logoCell = (logo, fallbackText, align = AlignmentType.CENTER) =>
    new TableCell({
      borders: bordesEncabezado,
      width: { size: 2200, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          spacing: { after: 0 },
          children: logo
            ? [
                new ImageRun({
                  data: logo.bytes,
                  transformation:
                    logo === sura
                      ? { width: 132, height: 49 }
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
                }),
              ],
        }),
      ],
    });

  return new Header({
    children: [
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 4960, 2200],
        borders: bordesEncabezado,
        rows: [
          new TableRow({
            children: [
              logoCell(proser, 'GRUPO PROSER', AlignmentType.LEFT),
              new TableCell({
                borders: bordesEncabezado,
                width: { size: 4960, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      new TextRun({
                        text: 'SEGUROS GENERALES',
                        font: FONT,
                        size: SIZE_12,
                        bold: true,
                        color: '0033A0',
                      }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: 'SURAMERICANA S.A.',
                        font: FONT,
                        size: SIZE_12,
                        bold: true,
                        color: '0033A0',
                      }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: etiquetaEncabezadoInformeSura(informe.tipoInforme),
                        font: FONT,
                        size: SIZE_12,
                        color: '333333',
                      }),
                    ],
                  }),
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders,
                    rows: [
                      new TableRow({
                        children: [
                          celdaMeta(`SINIESTRO: ${siniestro}`),
                          celdaMeta(`FECHA: ${fecha}`),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              logoCell(sura, 'SURA', AlignmentType.RIGHT),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 80, after: 0 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 4 },
        },
        children: [],
      }),
    ],
  });
}

/** Título azul con PRELIMINAR, FINAL o ÚNICO subrayado. */
function crearTituloInformeUnico(info = {}) {
  const tipo = etiquetaTituloInformeSura(info.tipoInforme);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new TextRun({
        text: 'INFORME ',
        bold: true,
        size: SIZE_12,
        font: FONT,
        color: '0070C0',
      }),
      new TextRun({
        text: tipo,
        bold: true,
        size: SIZE_12,
        font: FONT,
        color: '0070C0',
        underline: {},
      }),
      new TextRun({
        text: '  DE SINIESTRO',
        bold: true,
        size: SIZE_12,
        font: FONT,
        color: '0070C0',
      }),
    ],
  });
}

const p = (text, opts = {}) =>
  new Paragraph({
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 80 },
    children: [
      new TextRun({
        text: String(text ?? ''),
        font: FONT,
        size: opts.size || SIZE_12,
        bold: !!opts.bold,
        color: opts.color || '000000',
      }),
    ],
  });

const heading = (text) =>
  new Paragraph({
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text: String(text),
        font: FONT,
        size: SIZE_12,
        bold: true,
        color: '000000',
      }),
    ],
  });

const cell = (text, opts = {}) =>
  new TableCell({
    borders: opts.cuadro ? bordersCuadro : borders,
    width: { size: opts.width || 2300, type: WidthType.DXA },
    columnSpan: opts.columnSpan || 1,
    margins: {
      top: opts.compact ? 40 : 80,
      bottom: opts.compact ? 40 : 80,
      left: opts.compact ? 40 : 100,
      right: opts.compact ? 40 : 100,
    },
    verticalAlign: opts.verticalAlign || VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: opts.alignment || AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(text ?? ''),
            font: FONT,
            size: opts.size || SIZE_12,
            bold: !!opts.bold,
          }),
        ],
      }),
    ],
  });

/** Fila etiqueta | valor — cuadro formal negro (sin relleno de color) */
const campoFila = (label, value, opts = {}) =>
  new TableRow({
    children: [
      cell(label, {
        bold: true,
        width: opts.labelW || 4200,
        size: opts.size || SIZE_12,
        cuadro: true,
      }),
      cell(String(value ?? '—'), {
        width: opts.valueW || 5160,
        size: opts.size || SIZE_12,
        bold: !!opts.boldValue,
        cuadro: true,
      }),
    ],
  });

function tablaDosColumnasSura(filas = [], moneyFn) {
  return new Table({
    width: { size: 10000, type: WidthType.DXA },
    columnWidths: [5000, 5000],
    borders: bordersCuadro,
    rows: filas.map((fila) =>
      campoFila(
        fila.label,
        fila.tipo === 'texto' ? txt(fila.value) : moneyFn(fila.value),
        {
          boldValue: !!(fila.bold || fila.destacado),
          labelW: 5000,
          valueW: 5000,
        }
      )
    ),
  });
}

function tablaDeducibleContenidosPorArticuloSura(grupos = [], moneyFn) {
  const lista = Array.isArray(grupos) ? grupos : [];
  const w = [1800, 1800, 700, 1400, 1400, 1400, 1500];
  const totalW = w.reduce((a, b) => a + b, 0);
  const head = ['Grupo', 'Cobertura', 'Ítems', 'Suma aseg.', 'Pérdida', 'Deducible', 'Neto'];
  const rows = [
    new TableRow({
      children: head.map((lab, i) =>
        cell(lab, {
          bold: true,
          width: w[i],
          size: SIZE_NSR,
          compact: true,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        })
      ),
    }),
  ];
  let sumaPL = 0;
  let sumaDed = 0;
  let sumaNeto = 0;
  lista.forEach((g) => {
    const perdida = Number(g.sumaPL) || 0;
    const deducible = Number(g.deducible ?? g.aplicado) || 0;
    const neto =
      g.neto != null && g.neto !== ''
        ? Number(g.neto) || 0
        : Math.max(0, perdida - deducible);
    sumaPL += perdida;
    sumaDed += deducible;
    sumaNeto += neto;
    rows.push(
      new TableRow({
        children: [
          cell(txt(g.grupoLabel), { width: w[0], size: SIZE_NSR, compact: true, cuadro: true }),
          cell(txt(g.coberturaLabel), { width: w[1], size: SIZE_NSR, compact: true, cuadro: true }),
          cell(String(g.filas ?? '—'), {
            width: w[2],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.RIGHT,
          }),
          cell(moneyFn(g.sumaVA), {
            width: w[3],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.RIGHT,
          }),
          cell(moneyFn(perdida), {
            width: w[4],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.RIGHT,
          }),
          cell(moneyFn(deducible), {
            width: w[5],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
          cell(moneyFn(neto), {
            width: w[6],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
        ],
      })
    );
  });
  if (!lista.length) {
    rows.push(
      new TableRow({
        children: [
          cell('Sin artículos de contenidos con deducible diligenciado.', {
            width: totalW,
            columnSpan: 7,
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    );
  } else {
    rows.push(
      new TableRow({
        children: [
          cell('SUMA POR ARTÍCULO', {
            width: w[0] + w[1] + w[2] + w[3],
            columnSpan: 4,
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            bold: true,
            alignment: AlignmentType.RIGHT,
          }),
          cell(moneyFn(sumaPL), {
            width: w[4],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
          cell(moneyFn(sumaDed), {
            width: w[5],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
          cell(moneyFn(sumaNeto), {
            width: w[6],
            size: SIZE_NSR,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
        ],
      })
    );
  }
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: w,
    borders: bordersCuadro,
    rows,
  });
}

/** Cuadro ficha principal del siniestro (plantilla tipo Juliet / Catastrófico). */
function construirCuadroPrincipal({
  caso = {},
  enc = {},
  info = {},
  totales = {},
  fechaGeneracion = new Date(),
} = {}) {
  const vigenciaInicio = caso.fechaInicioPoliza || enc.fechaInicioPoliza;
  const vigenciaFin = caso.fechaFinPoliza || enc.fechaFinPoliza;
  const vigencia =
    vigenciaInicio || vigenciaFin
      ? `${fmtFechaCorta(vigenciaInicio)} – ${fmtFechaCorta(vigenciaFin)}`
      : '—';

  const esPreliminar = esInformePreliminarSura(info);
  const reserva = reservaSugeridaSura(info);
  const filas = [
    ['REPORTE No', etiquetaReporteCuadroSura(info.tipoInforme)],
    ['SINIESTRO No', txt(firstTxt(caso.siniestro, enc.siniestro, caso.nmroSinstro))],
    ['CONSECUTIVO', txt(firstTxt(caso.consecutivo, enc.consecutivo))],
    ['TOMADOR', txt(firstTxt(caso.tomador, enc.tomador))],
    [
      'ASEGURADO / CONTACTO',
      txt(firstTxt(caso.asegurado, enc.asegurado, caso.informacionContacto, caso.asgrBenfcro)),
    ],
    ['CORREO ELECTRÓNICO', txt(firstTxt(caso.correo, enc.correo))],
    ['CELULAR', txt(firstTxt(caso.celular, enc.celular))],
    [
      'IDENTIFICACIÓN',
      txt(firstTxt(caso.identificacion, caso.numDocumento, enc.identificacion)),
    ],
    ['N° PÓLIZA', txt(firstTxt(caso.numeroPoliza, caso.nmroPolza, enc.poliza))],
    ['N° CRÉDITO', txt(firstTxt(caso.numeroCredito, enc.credito))],
    ['VIGENCIA', vigencia],
    [
      'COBERTURA / EVENTO',
      txt(firstTxt(caso.cobertura, caso.causa_siniestro, caso.amprAfctdo, enc.cobertura, enc.evento)),
    ],
    [
      'DIRECCIÓN RIESGO ASEGURADO',
      txt(firstTxt(info.direccionRiesgo, caso.direccionPredio, caso.direccion, enc.direccion)),
    ],
    ['SEDE (RIESGO)', txt(firstTxt(caso.sede, caso.sedeRiesgo))],
    ['CIUDAD / DEPARTAMENTO', ciudadDepartamentoTxt(caso, enc)],
    [
      'FECHA DE OCURRENCIA',
      fmtFechaCorta(caso.fechaSiniestro || caso.fchaSinstro || enc.fechaSiniestro),
    ],
    ['FECHA DE INSPECCIÓN', fmtFechaCorta(caso.fechaInspeccion || caso.fchaInspccion)],
    ['FECHA DEL INFORME', fmtFechaCorta(fechaGeneracion)],
    [
      'AJUSTADOR',
      txt(firstTxt(info.ajustadorNombre, caso.ajustador, caso.nombreResponsable, enc.ajustador)),
    ],
    ...(esPreliminar
      ? [['RESERVA SUGERIDA', money(reserva)]]
      : [
          ['RESERVA PRELIMINAR', money(reserva)],
          ...(Number(totales.totalIndemnizar) > 0
            ? [['INDEMNIZACIÓN SUGERIDA', money(totales.totalIndemnizar)]]
            : []),
        ]),
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4200, 5160],
    borders: bordersCuadro,
    rows: filas.map(([etiqueta, valor]) =>
      new TableRow({
        children: [
          cell(etiqueta, { bold: true, width: 4200, size: SIZE_12, cuadro: true }),
          cell(valor, { width: 5160, size: SIZE_12, cuadro: true }),
        ],
      })
    ),
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

function detectarTipoImagen(bytes) {
  if (!bytes || bytes.length < 12) return 'jpg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'png';
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45
  ) {
    return 'webp';
  }
  return 'jpg';
}

function esCabeceraImagen(bytes) {
  if (!bytes || bytes.length < 3) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return true;
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return true;
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return true;
  if (bytes.length >= 12) {
    const brand = String.fromCharCode(...bytes.subarray(4, 12));
    if (brand.startsWith('ftyp')) return true;
  }
  return false;
}

/** Convierte webp/HEIC/otros a JPEG vía canvas para que docx los acepte. */
async function bytesAJpegSiNecesario(bytes, tipo) {
  const comoJpeg = await jpegDesdeBytesImagen(bytes);
  if (comoJpeg?.[0] === 0xff && comoJpeg?.[1] === 0xd8) {
    return { bytes: comoJpeg, type: 'jpg' };
  }
  if (tipo === 'png') {
    return { bytes: comoJpeg || bytes, type: 'png' };
  }
  try {
    const blob = new Blob([bytes], { type: tipo === 'webp' ? 'image/webp' : 'image/*' });
    const url = URL.createObjectURL(blob);
    const imgEl = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    canvas.getContext('2d').drawImage(imgEl, 0, 0);
    URL.revokeObjectURL(url);
    const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!jpegBlob) return { bytes, type: 'jpg' };
    const buf = await jpegBlob.arrayBuffer();
    return { bytes: new Uint8Array(buf), type: 'jpg' };
  } catch {
    return { bytes, type: 'jpg' };
  }
}

async function fetchImageBytes(url) {
  if (!url || typeof url !== 'string') return null;
  // blob: no usar fetch: CSP connect-src suele bloquearlo; img-src sí permite blob
  if (url.startsWith('blob:')) {
    return bytesDesdeBlobUrl(url);
  }
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return null;
    const buf = await response.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length < 32) return null;
    const ct = String(response.headers.get('content-type') || '').toLowerCase();
    // S3/proxy a menudo manda application/octet-stream: no rechazar solo por MIME
    if (!esCabeceraImagen(bytes) && ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) {
      return null;
    }
    const tipo = ct.includes('png')
      ? 'png'
      : ct.includes('webp')
        ? 'webp'
        : detectarTipoImagen(bytes);
    return bytesAJpegSiNecesario(bytes, tipo);
  } catch {
    return null;
  }
}

/** Lee blob: vía Image+canvas (evita fetch bloqueado por CSP). */
async function bytesDesdeBlobUrl(blobUrl) {
  try {
    const imgEl = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('blob image load failed'));
      el.src = blobUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth || imgEl.width || 1;
    canvas.height = imgEl.naturalHeight || imgEl.height || 1;
    canvas.getContext('2d').drawImage(imgEl, 0, 0);
    const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!jpegBlob) return null;
    const buf = await jpegBlob.arrayBuffer();
    return { bytes: new Uint8Array(buf), type: 'jpg' };
  } catch {
    return null;
  }
}

async function resolverBytesFoto(foto, archivosCaso = []) {
  if (!foto) return null;

  let ruta = foto.ruta || '';
  if (!ruta && foto._id) {
    const arch = (archivosCaso || []).find((a) => String(a._id) === String(foto._id));
    if (arch?.ruta) ruta = arch.ruta;
  }

  if (foto.file && typeof foto.file.arrayBuffer === 'function') {
    try {
      const buf = await foto.file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      return bytesAJpegSiNecesario(bytes, detectarTipoImagen(bytes));
    } catch {
      /* continue */
    }
  }

  if (foto.preview && String(foto.preview).startsWith('data:')) {
    const fromData = await imagenDesdeDataUrl(foto.preview);
    if (fromData?.data) {
      const bytes = new Uint8Array(fromData.data);
      const t = fromData.type === 'png' ? 'png' : detectarTipoImagen(bytes);
      return bytesAJpegSiNecesario(bytes, t);
    }
  }
  if (foto.base64 && String(foto.base64).startsWith('data:')) {
    const fromData = await imagenDesdeDataUrl(foto.base64);
    if (fromData?.data) {
      const bytes = new Uint8Array(fromData.data);
      const t = fromData.type === 'png' ? 'png' : detectarTipoImagen(bytes);
      return bytesAJpegSiNecesario(bytes, t);
    }
  }

  // Preferir ruta del servidor antes que blob: local (más estable al generar Word)
  if (ruta) {
    const candidatos = getUploadsUrlCandidates(ruta);
    const primary = urlDescargaArchivoSura(ruta);
    const urls = [...new Set([primary, ...(candidatos || [])].filter(Boolean))];
    for (const url of urls) {
      const img = await fetchImageBytes(url);
      if (img) return img;
    }
  }

  if (foto.preview && String(foto.preview).startsWith('blob:')) {
    const img = await bytesDesdeBlobUrl(foto.preview);
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

/** Página: descripción de daños (texto libre) + mapa de ubicación del predio. */
async function construirBloqueDaniosUbicacionSura({ info = {}, caso = {} } = {}) {
  const bloques = [];
  const descripcion = txt(textoDescripcionDaniosSura(info), '');
  const mapaDataUrl = await cargarMapaRiesgoDataUrl(info);

  bloques.push(heading('2. Descripción de los daños y/o perjuicios'));

  if (descripcion) {
    const paras = String(descripcion)
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    paras.forEach((l, i) => {
      bloques.push(
        p(l, {
          after: i === paras.length - 1 ? 140 : 80,
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    });
  } else {
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
        color: '666666',
      })
    );
  }

  return bloques;
}

/**
 * Zona de firmas Sura: solo ajustador, sin tabla/bordes, abajo a la izquierda.
 */
async function construirZonaFirmasSura({ info = {} } = {}) {
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
    new Paragraph({ spacing: { before: 280, after: 80 }, children: [] }),
    pLeft(
      [
        new TextRun({
          text: 'FIRMA DEL AJUSTADOR',
          font: FONT,
          size: SIZE_12,
          bold: true,
        }),
      ],
      { after: 100 }
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
        color: '0033A0',
      }),
    ]),
    pLeft(
      [
        new TextRun({
          text: 'Proser Ajustes SAS',
          font: FONT,
          size: SIZE_12,
          bold: true,
          color: 'C00000',
        }),
      ],
      { before: 40, after: 40 }
    ),
  ];
}


function tablaAnalisisPolizaSura(filas = []) {
  const lista = (Array.isArray(filas) ? filas : []).filter(
    (f) =>
      String(f?.concepto || '').trim() ||
      String(f?.analisis || '').trim() ||
      String(f?.conclusion || '').trim()
  );
  const wConcepto = 2200;
  const wAnalisis = 4360;
  const wConclusion = 2800;
  const rows = [
    new TableRow({
      children: [
        cell('CONCEPTO', {
          bold: true,
          width: wConcepto,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('ANÁLISIS', {
          bold: true,
          width: wAnalisis,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('CONCLUSIÓN', {
          bold: true,
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
              alignment: AlignmentType.CENTER,
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
 * Informe preliminar, final o único Seguros Sura — misma fórmula visual:
 * encabezado formal, título según tipo, cuadro ficha, secciones y cuadros sin relleno.
 * El único también sale en Word (liquidador + fotos) y en Excel (formato ágil).
 */
export async function descargarWordInformeSura({ caso = {}, informe = null, liquidador = null } = {}) {
  const info = informe || defaultInformeUnicoSura(caso);
  const fechaGeneracion = new Date();
  const esPreliminar = esInformePreliminarSura(info);
  const tipoNorm = normalizarTipoInformeSura(info.tipoInforme, 'preliminar');
  const tipoEtiqueta =
    tipoNorm === 'preliminar' ? 'preliminar' : tipoNorm === 'final' ? 'final' : 'único';
  const liq = liquidador || mapCasoSuraALiquidador(caso);
  const totales = calcularLiquidacionSura(liq);
  const enc = liq.encabezado || {};
  const items = itemsPlanosSura(liq);
  const filasPresupuesto = Array.isArray(liq?.evaluacionSismicaNSR10?.presupuesto?.items)
    ? liq.evaluacionSismicaNSR10.presupuesto.items
    : [];
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
    const mime = String(a.tipoMime || '');
    return (
      et === 'FOTOS' ||
      et === 'INSPECCION' ||
      mime.startsWith('image/') ||
      /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(nombre)
    );
  });
  const fotosInforme = fusionarFotosArchiveroEnGaleria(
    fusionarFotosAgilEnInforme(
      Array.isArray(info?.fotosInspeccion)
        ? info.fotosInspeccion
        : Array.isArray(informe?.fotosInspeccion)
          ? informe.fotosInspeccion
          : [],
      Array.isArray(caso.fotosAgil) ? caso.fotosAgil : []
    ),
    caso.archivos
  );
  const archivosById = new Map(
    fotosArchivos.filter((a) => a?._id).map((a) => [String(a._id), a])
  );

  const fotosParaWord = (
    fotosInforme.length
      ? fotosInforme.map((f) => {
          const arch = f._id ? archivosById.get(String(f._id)) : null;
          return {
            ...f,
            nombreOriginal: f.nombre || f.nombreOriginal || arch?.nombreOriginal,
            descripcion: f.descripcion || arch?.descripcion || '',
            ruta: f.ruta || arch?.ruta || '',
            preview: f.preview || f.base64 || '',
            file: f.file || null,
            tipoMime: f.tipoMime || arch?.tipoMime || '',
          };
        })
      : fotosArchivos
  );

  // Embebidas en paralelo (más rápido) y layout de dos en dos
  const topeFotos = tipoNorm === 'unico' ? 24 : 12;
  const embebidasResueltas = await Promise.all(
    fotosParaWord.slice(0, topeFotos).map(async (archivo) => {
      const img = await resolverBytesFoto(archivo, fotosArchivos);
      if (!img?.bytes?.length) {
        console.warn('Foto no embebida en Word Sura:', archivo?.nombreOriginal || archivo?.nombre);
        return null;
      }
      return {
        bytes: img.bytes,
        type: img.type === 'png' ? 'png' : 'jpg',
        leyenda: String(archivo.descripcion || '').trim() || '',
      };
    })
  );
  const fotosEmbebidas = embebidasResueltas
    .filter(Boolean)
    .map((foto, idx) => ({
      ...foto,
      leyenda: foto.leyenda || `Foto ${idx + 1}`,
    }));
  const fotosIncluidas = fotosEmbebidas.length;

  const fotoParrafos = [];
  if (!fotosEmbebidas.length) {
    fotoParrafos.push(
      p(
        'Pendiente registro fotográfico. Suba las fotos en la pestaña Fotos o en la sección del informe (Carga de Imágenes).',
        { size: SIZE_12 }
      )
    );
  } else {
    // Grid 2 columnas (foto | foto) con anchos DXA fijos — evita que Word apile las celdas
    const COL_W = 4500;
    const IMG_W = 210;
    const IMG_H = 158;
    const filasFoto = [];

    const celdaFoto = (foto) => {
      if (!foto) {
        return new TableCell({
          borders: noBorders,
          width: { size: COL_W, type: WidthType.DXA },
          children: [new Paragraph({ children: [] })],
        });
      }
      return new TableCell({
        borders: noBorders,
        width: { size: COL_W, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        verticalAlign: VerticalAlign.TOP,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [
              new ImageRun({
                data: foto.bytes,
                transformation: { width: IMG_W, height: IMG_H },
                type: foto.type,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: foto.leyenda,
                font: FONT,
                size: SIZE_12,
              }),
            ],
          }),
        ],
      });
    };

    for (let i = 0; i < fotosEmbebidas.length; i += 2) {
      filasFoto.push(
        new TableRow({
          children: [
            celdaFoto(fotosEmbebidas[i]),
            celdaFoto(fotosEmbebidas[i + 1] || null),
          ],
        })
      );
    }

    fotoParrafos.push(
      new Table({
        width: { size: COL_W * 2, type: WidthType.DXA },
        columnWidths: [COL_W, COL_W],
        layout: TableLayoutType.FIXED,
        rows: filasFoto,
      })
    );
  }

  const filasCuadro = [
    new TableRow({
      children: [
        cell('#', { bold: true, width: 600, alignment: AlignmentType.CENTER, cuadro: true }),
        cell('Concepto', { bold: true, width: 4000, cuadro: true }),
        cell('Reclamado', {
          bold: true,
          width: 2200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
        }),
        cell('Indemnizable', {
          bold: true,
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
        cell('', { width: 600, cuadro: true }),
        cell('TOTALES', { bold: true, width: 4000, cuadro: true }),
        cell(money(totales.totalReclamado), {
          bold: true,
          width: 2200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
        }),
        cell(money(totales.totalIndemnizable), {
          bold: true,
          width: 2200,
          alignment: AlignmentType.RIGHT,
          cuadro: true,
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
        children: [new TextRun({ text: l, font: FONT, size: SIZE_12 })],
      })
    );

  const baseUrl = import.meta.env.BASE_URL || '/';
  const mapaEvento = await loadLogoBytes(
    `${baseUrl}templates/mapa-evento-siniestro-sura.png`
  );
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
        color: '555555',
      })
    );
  }

  const header = await crearEncabezadoSura({ caso, informe: info, fechaGeneracion });

  const resumenInd = resumenLiquidacionIndependienteSura(liq, totales);
  const filasDictamen = OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
    ? []
    : [
        campoFila('Dictamen', txt(criterio.dictamen), { labelW: 5000, valueW: 5000 }),
        campoFila(
          'Categoría / Habitabilidad',
          `${txt(criterio.categoria)} / ${txt(criterio.habitabilidad)}`,
          { labelW: 5000, valueW: 5000 }
        ),
      ];
  const tablaResumenDictamen = filasDictamen.length
    ? new Table({
        width: { size: 10000, type: WidthType.DXA },
        columnWidths: [5000, 5000],
        borders: bordersCuadro,
        rows: filasDictamen,
      })
    : null;
  const tablaResumenEdificio = tablaDosColumnasSura(resumenInd.edificio, money);
  const tablaResumenContenidos = tablaDosColumnasSura(resumenInd.contenidos, money);
  const tablaResumenGastos = tablaDosColumnasSura(resumenInd.gastosSinDeducible || [], money);
  const tablaResumenConsolidado = tablaDosColumnasSura(resumenInd.consolidado, money);
  const tablaArticulosContenidos =
    resumenInd.contenidosPorArticulo && resumenInd.grupos.length
      ? tablaDeducibleContenidosPorArticuloSura(resumenInd.grupos, money)
      : null;

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

  const { tabla: tablaContenidos } = construirTablaContenidosWord({
    contenidos: contenidosNsr,
    cell,
    size: SIZE_NSR,
  });

  const tienePresupuestoNsr =
    filasConDatos.length > 0 || presupuestoNsrTieneDatosSura(liq);
  const tieneContenidosNsr = contenidosNsrTienenDatosSura(liq);
  const tieneEdificio =
    tienePresupuestoNsr ||
    Number(totales.subtotal) > 0 ||
    Number(totales.totalPresupuesto ?? totales.presupuesto?.total) > 0;
  const tieneContenidosResumen =
    tieneContenidosNsr || Number(totales.totalContenidos) > 0;
  const tieneGastos = gastosLiquidadorTienenDatosSura(totales);
  const tieneObservacionesLiq = Boolean(String(liq.observaciones || '').trim());
  const tieneResumenLiquidacion =
    tieneEdificio || tieneContenidosResumen || tieneGastos;
  const tieneBloqueLiquidador =
    !esPreliminar &&
    (tienePresupuestoNsr ||
      tieneContenidosNsr ||
      tieneResumenLiquidacion ||
      tieneObservacionesLiq);
  const tieneRelacionReclamado = !esPreliminar && items.length > 0;
  const seccionFotos =
    5 + (tieneBloqueLiquidador ? 1 : 0) + (tieneRelacionReclamado ? 1 : 0);
  const seccionRecomendacion = seccionFotos + 1;
  const numLiquidador = 5;
  const numRelacion = tieneBloqueLiquidador ? 6 : 5;

  const firmasParrafos = await construirZonaFirmasSura({ caso, enc, info });
  const bloqueDaniosUbicacion = await construirBloqueDaniosUbicacionSura({ info, caso });

  const pagePortrait = {
    margin: { top: 1580, bottom: 900, left: 900, right: 900 },
    size: { orientation: PageOrientation.PORTRAIT },
  };
  const pageLandscape = {
    margin: { top: 700, bottom: 700, left: 600, right: 600 },
    size: { orientation: PageOrientation.LANDSCAPE },
  };

  const seccionConclusiones = [
    heading('4. Conclusiones'),
    p(txt(info.conclusiones, 'Pendiente diligenciar conclusiones.'), {
      after: 160,
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
    heading(`${seccionRecomendacion}. Recomendación del ajustador`),
    p(txt(info.recomendacion, 'Pendiente diligenciar recomendación.'), {
      after: 160,
      alignment: AlignmentType.JUSTIFIED,
    }),
    p(
      `Para constancia se firma el presente informe ${tipoEtiqueta} en ${txt(
        caso.ciudad || enc.ciudad,
        'Colombia'
      )}, ${fmtFecha(fechaGeneracion)}.`,
      { before: 200, after: 200 }
    ),
    ...firmasParrafos,
  ];

  const sections = [
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [
        crearTituloInformeUnico(info),
        p(RAZON_SOCIAL_SURA, {
          alignment: AlignmentType.CENTER,
          bold: true,
          size: SIZE_12,
          after: 160,
          color: '333333',
        }),
        construirCuadroPrincipal({ caso, enc, info, totales, fechaGeneracion }),
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
        tablaAnalisisPolizaSura(
          completarFilasPolizaCoberturaSura(info.filasPolizaCobertura, {
            caso,
            encabezado: enc,
            informe: info,
            liquidador: liq,
          })
        ),
      ],
    },
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: seccionConclusiones,
    },
  ];

  if (tieneBloqueLiquidador) {
    const hijosLiquidador = [
      heading(`${numLiquidador}. Liquidación de pérdidas (liquidador NSR-10)`),
    ];
    if (tienePresupuestoNsr) {
      hijosLiquidador.push(
        p(
          mostrarImprevistos || mostrarImpuestos
            ? 'Presupuesto de intervención / reparación post-sismo (NSR-10) — columnas completas: capítulo, código, componente, actividad, unidad, cantidad, valores, prioridad, cobertura, observación y fuente; con AIU, imprevistos e impuestos.'
            : 'Presupuesto de intervención / reparación post-sismo (NSR-10) — columnas completas: capítulo, código, componente, actividad, unidad, cantidad, valores, prioridad, cobertura, observación y fuente; con AIU 25% (único recargo; imprevistos e impuestos van incluidos).',
          { after: 120 }
        ),
        tablaLiquidadorCompleto
      );
    }
    if (tieneContenidosNsr) {
      hijosLiquidador.push(
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
        tablaContenidos
      );
    }
    if (tieneResumenLiquidacion) {
      hijosLiquidador.push(
        p('Resumen de liquidación', { bold: true, before: 180, after: 80, size: SIZE_12 })
      );
      if (tablaResumenDictamen) hijosLiquidador.push(tablaResumenDictamen);
      if (tieneEdificio) {
        hijosLiquidador.push(
          p('Deducible de edificio (presupuesto)', {
            bold: true,
            before: tablaResumenDictamen ? 160 : 40,
            after: 80,
            size: SIZE_12,
          }),
          tablaResumenEdificio,
          p(resumenInd.notaEdificio, { before: 80, after: 80, size: SIZE_META, color: '555555' })
        );
      }
      if (tieneContenidosResumen) {
        hijosLiquidador.push(
          p('Deducible de contenidos (por artículo de póliza)', {
            bold: true,
            before: 160,
            after: 80,
            size: SIZE_12,
          }),
          tablaResumenContenidos,
          ...(tablaArticulosContenidos
            ? [
                p('Desglose por artículo de póliza', {
                  bold: true,
                  before: 120,
                  after: 60,
                  size: SIZE_12,
                }),
                tablaArticulosContenidos,
              ]
            : []),
          p(resumenInd.notaContenidos, { before: 80, after: 80, size: SIZE_META, color: '555555' })
        );
      }
      if (tieneGastos) {
        hijosLiquidador.push(
          p('Gastos y amparos sin deducible', {
            bold: true,
            before: 160,
            after: 80,
            size: SIZE_12,
          }),
          tablaResumenGastos,
          p(resumenInd.notaGastos, { before: 80, after: 80, size: SIZE_META, color: '555555' })
        );
      }
      if (tieneEdificio || tieneContenidosResumen || tieneGastos) {
        hijosLiquidador.push(
          p('Consolidado', { bold: true, before: 160, after: 80, size: SIZE_12 }),
          tablaResumenConsolidado
        );
      }
    }
    if (tieneObservacionesLiq) {
      hijosLiquidador.push(
        p('Observaciones del liquidador:', { bold: true, before: 120, after: 40 }),
        p(liq.observaciones, { after: 80 })
      );
    }
    sections.push({
      properties: { page: pageLandscape },
      headers: { default: header },
      children: hijosLiquidador,
    });
  }

  const hijosCierre = [];
  if (tieneRelacionReclamado) {
    hijosCierre.push(
      heading(`${numRelacion}. Relación de valores reclamados vs. valores indemnizables`),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        columnWidths: [600, 4000, 2200, 2200],
        borders: bordersCuadro,
        rows: filasCuadro,
      }),
      p(`Diferencia reclamado − indemnizable: ${money(totales.diferencia)}`, {
        before: 100,
        after: 160,
        size: SIZE_12,
      })
    );
  }
  hijosCierre.push(...seccionFotosFirmas);
  sections.push({
    properties: { page: pagePortrait },
    headers: { default: header },
    children: hijosCierre,
  });

  const doc = new Document({
    sections,
  });

  const blob = await Packer.toBlob(doc);
  const prefijo = prefijoArchivoInformeSura(info.tipoInforme);
  const nombre = `${prefijo}_${caso.siniestro || caso.consecutivo || 'caso'}.docx`.replace(
    /[^\w.\-áéíóúÁÉÍÓÚñÑ]+/gi,
    '_'
  );
  saveAs(blob, nombre);
  return { blob, nombre, filename: nombre };
}
