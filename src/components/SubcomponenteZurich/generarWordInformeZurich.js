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
import { saveAs } from 'file-saver';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10, totalFilaPresupuesto } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { construirTablaContenidosWord } from '../SubcomponenteEvaluacionSismicaNSR10/construirTablaContenidosWord.js';
import {
  calcularLiquidacionZurich,
  defaultInformeUnicoZurich,
  etiquetaArchivoInformeZurich,
  etiquetaEncabezadoInformeZurich,
  etiquetaReporteCuadroZurich,
  etiquetaTituloInformeZurich,
  esInformePreliminarZurich,
  formatearMonto,
  formatDateLarga,
  itemsPlanosZurich,
  mapcasoZurichALiquidador,
  normalizarTipoInformeZurich,
  parsearNumero,
  prefijoArchivoInformeZurich,
  reservaSugeridaZurich,
  totalPresupuestoPreliminarZurich,
} from './liquidadorZurichHelpers.js';
import { urlDescargaArchivoZurich } from '../../services/zurichService.js';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';

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
 * Encabezado formal (fórmula Catastrófico / Motorysa):
 * Logo Proser | Título + subtítulo + código/versión/fecha | Logo Zurich
 */
async function crearEncabezadoZurich({ caso = {}, informe = {} } = {}) {
  const base = import.meta.env.BASE_URL || '/';
  let proser = await loadLogoBytes(`${base}templates/logo-grupoproser.png`);
  if (!proser) proser = await loadLogoBytes(`${base}templates/logo-grupoproser.jpg`);
  const Zurich = await loadLogoBytes(`${base}templates/logo-zurich.png`);

  const siniestro = txt(caso.siniestro || caso.consecutivo, '—');
  const fecha = fmtFechaCorta(informe.fechaInforme || new Date());

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
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: 'Zurich',
                        font: FONT,
                        size: SIZE_12,
                        bold: true,
                        color: '0066CC',
                      }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: etiquetaEncabezadoInformeZurich(informe.tipoInforme),
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
              logoCell(Zurich, 'Zurich', AlignmentType.RIGHT),
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
function crearTituloInformeZurich(info = {}) {
  const tipo = etiquetaTituloInformeZurich(info.tipoInforme);
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

const cell = (text, opts = {}) => {
  const lines = String(text ?? '').split(/\n/);
  return new TableCell({
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
              bold: !!opts.bold,
            }),
          ],
        })
    ),
  });
};

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

/** Cuadro ficha principal del siniestro (plantilla tipo Juliet / Catastrófico). */
function construirCuadroPrincipal({ caso = {}, enc = {}, info = {}, totales = {} } = {}) {
  const vigencia =
    caso.fechaInicioPoliza || caso.fechaFinPoliza
      ? `${fmtFechaCorta(caso.fechaInicioPoliza)} – ${fmtFechaCorta(caso.fechaFinPoliza)}`
      : '—';

  const esPreliminar = esInformePreliminarZurich(info);
  const reserva = reservaSugeridaZurich(info);
  const filas = [
    ['REPORTE No', etiquetaReporteCuadroZurich(info.tipoInforme)],
    ['CONSECUTIVO', txt(caso.consecutivo)],
    ['SINIESTRO No', txt(caso.siniestro || enc.siniestro)],
    ['TOMADOR', txt(caso.tomador || enc.tomador)],
    ['ASEGURADO / CONTACTO', txt(enc.asegurado || caso.informacionContacto)],
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
    ['DIRECCIÓN RIESGO ASEGURADO', txt(caso.direccionPredio || enc.direccion)],
    [
      'CIUDAD / DEPARTAMENTO',
      `${txt(caso.ciudad || enc.ciudad)} / ${txt(caso.departamento || enc.departamento)}`,
    ],
    ['FECHA DE OCURRENCIA', fmtFechaCorta(caso.fechaSiniestro || enc.fechaSiniestro)],
    ['FECHA DE INSPECCIÓN', fmtFechaCorta(caso.fechaInspeccion)],
    ['FECHA DEL INFORME', fmtFechaCorta(info.fechaInforme || new Date())],
    ['AJUSTADOR', txt(info.ajustadorNombre)],
    ...(esPreliminar
      ? [['RESERVA SUGERIDA', money(reserva)]]
      : [
          ['RESERVA PRELIMINAR', money(reserva)],
          ['INDEMNIZACIÓN SUGERIDA', money(totales.totalIndemnizar)],
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

async function fetchImageBytes(url) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') && blob.type !== 'application/octet-stream') return null;
    const buf = await blob.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
    return { bytes: u8, type: isPng || blob.type.includes('png') ? 'png' : 'jpg' };
  } catch {
    return null;
  }
}

async function bytesDesdeFoto(foto = {}) {
  try {
    if (foto?.file instanceof Blob) {
      const buf = await foto.file.arrayBuffer();
      const u8 = new Uint8Array(buf);
      const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
      return { bytes: u8, type: isPng ? 'png' : 'jpg' };
    }
    if (typeof foto?.preview === 'string' && (foto.preview.startsWith('blob:') || foto.preview.startsWith('data:'))) {
      const resp = await fetch(foto.preview);
      if (resp.ok) {
        const blob = await resp.blob();
        const buf = await blob.arrayBuffer();
        const u8 = new Uint8Array(buf);
        const isPng = u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50;
        return { bytes: u8, type: isPng ? 'png' : 'jpg' };
      }
    }
  } catch {
    /* continuar con ruta */
  }
  const candidatos = [
    ...(foto?.ruta ? getUploadsUrlCandidates(foto.ruta) : []),
    urlDescargaArchivoZurich(foto?.ruta),
  ].filter(Boolean);
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
                width: 2200,
                cuadro: true,
                alignment: AlignmentType.CENTER,
              }),
              cell('CONDICIÓN OBSERVADA', {
                bold: true,
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

  if (coordenadas) {
    bloques.push(
      p(`Coordenadas: ${coordenadas}`, {
        alignment: AlignmentType.CENTER,
        after: 60,
        color: '0070C0',
      })
    );
  }
  if (coords.latitud && coords.longitud) {
    bloques.push(
      p(`Latitud: ${coords.latitud}    Longitud: ${coords.longitud}`, {
        alignment: AlignmentType.CENTER,
        after: 80,
        size: SIZE_META,
      })
    );
  }
  if (direccion) {
    bloques.push(
      p(`Dirección del riesgo: ${direccion}`, {
        alignment: AlignmentType.CENTER,
        after: 80,
      })
    );
  }

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
        color: '0066CC',
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
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('ANÁLISIS', {
          bold: true,
          width: 5360,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('CONCLUSIÓN', {
          bold: true,
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

function tablaPresupuestoPreliminarZurich(filas = []) {
  const lista = Array.isArray(filas) ? filas : [];
  const rows = [
    new TableRow({
      children: [
        cell('Capítulo', {
          bold: true,
          width: 2800,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('Descripción del alcance', {
          bold: true,
          width: 4560,
          cuadro: true,
          alignment: AlignmentType.CENTER,
        }),
        cell('Valor estimado', {
          bold: true,
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
        cell('TOTAL RESERVA PRELIMINAR', {
          bold: true,
          width: 7360,
          columnSpan: 2,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
        }),
        cell(money(totalPresupuestoPreliminarZurich(lista)), {
          bold: true,
          width: 2000,
          cuadro: true,
          alignment: AlignmentType.RIGHT,
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


/**
 * Informe preliminar o final Zurich.
 * El preliminar replica la ficha, daños por zona, póliza y reserva.
 * El final reutiliza ese contenido y añade liquidación NSR-10.
 */
export async function descargarWordInformeZurich({ caso = {}, informe = null, liquidador = null } = {}) {
  const info = informe || defaultInformeUnicoZurich(caso);
  const liq = liquidador || mapcasoZurichALiquidador(caso);
  const totales = calcularLiquidacionZurich(liq);
  const enc = liq.encabezado || {};
  const items = itemsPlanosZurich(liq);
  const filasPresupuesto = Array.isArray(liq?.evaluacionSismicaNSR10?.presupuesto?.items)
    ? liq.evaluacionSismicaNSR10.presupuesto.items
    : [];
  const contenidosNsr = liq?.evaluacionSismicaNSR10?.contenidos || {};
  const presupuesto = liq?.evaluacionSismicaNSR10?.presupuesto || {};
  const aiuPct = Math.round(
    (totales.presupuesto?.aiuPct ?? presupuesto.aiuPorcentaje ?? 0.05) * 100
  );
  const imprPct = Math.round(
    (totales.presupuesto?.imprPct ?? presupuesto.imprevistosPorcentaje ?? 0.1) * 100
  );
  const impPct = Math.round(
    (totales.presupuesto?.impPct ?? presupuesto.impuestosPorcentaje ?? 0) * 100
  );
  const criterio = totales.criterio || {};
  const esPreliminar = esInformePreliminarZurich(info);
  const tipoNorm = normalizarTipoInformeZurich(info.tipoInforme, 'preliminar');
  const tipoEtiqueta =
    tipoNorm === 'preliminar' ? 'preliminar' : tipoNorm === 'final' ? 'final' : 'único';
  const seccionFotos = esPreliminar ? 5 : 7;

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
  for (const archivo of fotosParaWord.slice(0, 24)) {
    const img = await bytesDesdeFoto(archivo);
    if (!img) {
      fotoParrafos.push(
        p(`• ${archivo.nombreOriginal || archivo.nombre || 'Foto'} (no embebida)`, {
          size: SIZE_12,
        })
      );
      continue;
    }
    fotosIncluidas += 1;
    fotoParrafos.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 40 },
        children: [
          new ImageRun({
            data: img.bytes,
            transformation: { width: 400, height: 260 },
            type: img.type,
          }),
        ],
      }),
      p(archivo.descripcion || archivo.nombreOriginal || archivo.nombre || `Foto ${fotosIncluidas}`, {
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
    `${baseUrl}templates/mapa-evento-siniestro-Zurich.png`
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

  const header = await crearEncabezadoZurich({ caso, informe: info });

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
    campoFila('Subtotal presupuesto (costo directo)', money(totales.subtotal), {
      labelW: 5000,
      valueW: 5000,
    }),
    campoFila(`AIU (${aiuPct}%)`, money(totales.aiu), { labelW: 5000, valueW: 5000 }),
    campoFila(`Imprevistos (${imprPct}%)`, money(totales.imprevistos), {
      labelW: 5000,
      valueW: 5000,
    }),
    campoFila(`Impuestos (${impPct}%)`, money(totales.impuestos), {
      labelW: 5000,
      valueW: 5000,
    }),
    campoFila('Total presupuesto NSR-10', money(totales.totalPresupuesto ?? totales.presupuesto?.total), {
      labelW: 5000,
      valueW: 5000,
    }),
    campoFila('Total contenidos', money(totales.totalContenidos ?? 0), {
      labelW: 5000,
      valueW: 5000,
    }),
    campoFila('SUMA COMPLETA (presupuesto + contenidos)', money(totales.sumaCompleta ?? totales.totalDanios), {
      boldValue: true,
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
    [`IMPREVISTOS (${imprPct}%)`, money(totales.imprevistos)],
    [`IMPUESTOS (${impPct}%)`, money(totales.impuestos)],
    ['TOTAL ESTIMADO', money(totales.totalDanios)],
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

  const firmasParrafos = await construirZonaFirmasZurich({ caso, enc, info });
  const bloqueDaniosUbicacion = await construirBloqueDaniosUbicacionZurich({ info, caso });

  const pagePortrait = {
    margin: { top: 1400, bottom: 900, left: 900, right: 900 },
    size: { orientation: PageOrientation.PORTRAIT },
  };
  const pageLandscape = {
    margin: { top: 700, bottom: 700, left: 600, right: 600 },
    size: { orientation: PageOrientation.LANDSCAPE },
  };

  const seccionConclusiones = [
    heading('4. Conclusiones y recomendación del ajustador'),
    p('PRESUPUESTO PRELIMINAR DE REPARACIÓN', {
      bold: true,
      before: 40,
      after: 120,
    }),
    tablaPresupuestoPreliminarZurich(info.filasPresupuestoPreliminar),
    p('Conclusiones', { bold: true, before: 180, after: 40 }),
    p(txt(info.conclusiones, 'Pendiente diligenciar conclusiones.'), {
      after: 120,
      alignment: AlignmentType.JUSTIFIED,
    }),
    p('Recomendación', { bold: true, after: 40 }),
    p(txt(info.recomendacion, 'Pendiente diligenciar recomendación.'), {
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
        construirCuadroPrincipal({ caso, enc, info, totales }),
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
        tablaAnalisisPolizaZurich(info.filasPolizaCobertura),
      ],
    },
    {
      properties: { page: pagePortrait },
      headers: { default: header },
      children: seccionConclusiones,
    },
  ];

  if (!esPreliminar) {
    sections.push({
      properties: { page: pageLandscape },
      headers: { default: header },
      children: [
        heading('5. Liquidación de pérdidas (liquidador NSR-10)'),
        p(
          'Presupuesto de intervención / reparación post-sismo (NSR-10) — columnas completas: capítulo, código, componente, actividad, unidad, cantidad, valores, prioridad, cobertura, observación y fuente; con AIU, imprevistos e impuestos.',
          { after: 120 }
        ),
        tablaLiquidadorCompleto,
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
          borders: bordersCuadro,
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
    sections.push({
      properties: { page: pagePortrait },
      headers: { default: header },
      children: [
        heading('6. Relación de valores reclamados vs. valores indemnizables'),
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
    sections,
  });

  const blob = await Packer.toBlob(doc);
  const prefijo = prefijoArchivoInformeZurich(info.tipoInforme);
  const nombre = `${prefijo}_${caso.siniestro || caso.consecutivo || 'caso'}.docx`.replace(
    /[^\w.\-áéíóúÁÉÍÓÚñÑ]+/gi,
    '_'
  );
  saveAs(blob, nombre);
  return { blob, filename: nombre };
}
