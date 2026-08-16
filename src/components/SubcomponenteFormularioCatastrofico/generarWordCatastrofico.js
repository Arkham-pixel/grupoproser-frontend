import {
  AlignmentType,
  Document,
  HeadingLevel,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
  VerticalAlign,
} from 'docx';
import Logo from '../../img/Logo.png';
import {
  calcularValorFinalItem,
  calcularResumenPresupuesto,
  calcularDiagramaLiquidacion,
  AIU_PORCENTAJE_DEFAULT,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from './catalogoPresupuestoCatastrofico.js';
import { obtenerTotalDaniosParaInforme, resolverPresupuestoParaWord, tienePresupuestoNsr10, sincronizarPresupuestoNsr10AlInforme } from './syncPresupuestoNsr10AlInforme.js';
import {
  resolverCronologiaCatastrofico,
  cargarImagenCronologiaComoDataUrl,
} from './catalogoCronologiaCatastrofico.js';

const border = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const borders = { top: border, bottom: border, left: border, right: border };
const borderActa = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const bordersActa = {
  top: borderActa,
  bottom: borderActa,
  left: borderActa,
  right: borderActa,
  insideHorizontal: borderActa,
  insideVertical: borderActa,
};
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const bordesEncabezado = {
  top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

/** Quita placeholders tipo «DILIGENCIAR» para no imprimirlos en el Word. */
const txt = (v, fallback = '') => {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  if (/^diligenciar$/i.test(s) || /^n\/?a$/i.test(s) || /^sin información$/i.test(s)) {
    return fallback;
  }
  return s;
};

async function convertirImagenImportadaABase64(imagePath) {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error al convertir logo:', error);
    return null;
  }
}

const miniTexto = (text, opts = {}) =>
  new Paragraph({
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: { after: opts.after ?? 0 },
    children: [
      new TextRun({
        text: String(text ?? ''),
        font: 'Arial',
        size: opts.size || 14,
        bold: !!opts.bold,
        color: opts.color || '000000',
      }),
    ],
  });

/**
 * Encabezado: logo | título + subtítulo + código/versión/fecha.
 * Acta → «INFORME DE INSPECCION» (como Ajuste) + nombre del ajustador.
 * Informe → «CATASTROFICO» + asegurado.
 */
async function crearEncabezadoCatastrofico(fd = {}, { modo = 'informeUnico' } = {}) {
  const logoBase64 = await convertirImagenImportadaABase64(Logo);
  const esActa = modo === 'actaInspeccion';
  const titulo = esActa ? 'INFORME DE INSPECCION' : 'CATASTROFICO';
  const subtitulo = esActa
    ? txt(
        fd.actaAjustadorNombre ||
          fd.nombreFirmante ||
          fd.inspector ||
          fd.funcionarioFirma,
        'INSPECTOR'
      ).toUpperCase()
    : txt(fd.asegurado, 'ASEGURADO').toUpperCase();
  const codigo = txt(
    fd.codigoReporte || fd.metadata?.codigoReporte || fd.numeroCaso || fd.metadata?.numeroAjuste,
    'N/A'
  );
  const version = txt(fd.versionReporte || fd.metadata?.versionReporte, '1');
  const fecha = fmtFecha(new Date());

  const celdaMeta = (texto) =>
    new TableCell({
      borders: esActa ? noBorders : borders,
      children: [miniTexto(texto, { size: 14 })],
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      shading: { fill: 'FFFFFF' },
    });

  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: esActa ? noBorders : bordesEncabezado,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 42, type: WidthType.PERCENTAGE },
                borders: esActa ? noBorders : bordesEncabezado,
                children: logoBase64
                  ? [
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: String(logoBase64).replace(/^data:image\/\w+;base64,/, ''),
                            transformation: { width: 200, height: 75 },
                            type: 'png',
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0 },
                      }),
                    ]
                  : [
                      miniTexto('GRUPO PROSER', {
                        bold: true,
                        size: 18,
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                margins: { top: 120, bottom: 120, left: 120, right: 120 },
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: 'FFFFFF' },
              }),
              new TableCell({
                width: { size: 58, type: WidthType.PERCENTAGE },
                borders: esActa ? noBorders : bordesEncabezado,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: titulo,
                        font: 'Arial',
                        size: esActa ? 22 : 24,
                        bold: true,
                        color: esActa ? '000000' : '0066CC',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 80 },
                    children: [
                      new TextRun({
                        text: subtitulo,
                        font: 'Arial',
                        size: 16,
                        color: '333333',
                      }),
                    ],
                  }),
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: esActa ? noBorders : borders,
                    rows: [
                      new TableRow({
                        children: [
                          celdaMeta(`CÓDIGO: ${codigo}`),
                          celdaMeta(`VERSIÓN: ${version}`),
                          celdaMeta(`FECHA: ${fecha}`),
                        ],
                      }),
                    ],
                  }),
                ],
                margins: { top: 120, bottom: 120, left: 160, right: 120 },
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: 'FFFFFF' },
              }),
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

const fmtMoney = (valor) => {
  const n = Number(valor) || 0;
  const entero = Math.round(n) === n;
  return `$${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: entero ? 0 : 2,
    maximumFractionDigits: entero ? 0 : 2,
  }).format(n)}`;
};

const fmtFecha = (valor) => {
  if (!valor) return '';
  try {
    const raw = String(valor).trim();
    // YYYY-MM-DD sin zona: evitar corrimiento por UTC
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(d.getTime())) return raw;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return String(valor);
  }
};

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { before: opts.before ?? 80, after: opts.after ?? 80 },
    alignment: opts.alignment,
    children: [
      new TextRun({
        text: String(text ?? ''),
        bold: !!opts.bold,
        size: opts.size || 22,
        font: 'Calibri',
      }),
    ],
  });

const heading = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Calibri' })],
  });

const borderCuadro = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
const bordersCuadro = {
  top: borderCuadro,
  bottom: borderCuadro,
  left: borderCuadro,
  right: borderCuadro,
  insideHorizontal: borderCuadro,
  insideVertical: borderCuadro,
};

const cell = (text, opts = {}) =>
  new TableCell({
    borders: opts.noBorder ? noBorders : opts.cuadro ? bordersCuadro : borders,
    width: { size: opts.width || 2500, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: opts.shading ? { fill: opts.shading } : { fill: 'FFFFFF' },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? ''),
            bold: !!opts.bold,
            size: opts.size || 20,
            font: opts.font || 'Calibri',
            color: opts.color || '000000',
          }),
        ],
      }),
    ],
  });

const filaDos = (izq, der, opts = {}) =>
  new TableRow({
    children: [
      cell(izq, {
        bold: true,
        width: opts.w1 || 4200,
        shading: opts.labelShading,
        size: opts.size || 20,
        cuadro: opts.cuadro,
      }),
      cell(der, {
        width: opts.w2 || 4800,
        size: opts.size || 20,
        cuadro: opts.cuadro,
      }),
    ],
  });

/** Título azul con «ÚNICO» subrayado, como la plantilla de referencia. */
function crearTituloInformeUnico() {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 240 },
    children: [
      new TextRun({
        text: 'INFORME ',
        bold: true,
        size: 28,
        font: 'Calibri',
        color: '0070C0',
      }),
      new TextRun({
        text: 'ÚNICO',
        bold: true,
        size: 28,
        font: 'Calibri',
        color: '0070C0',
        underline: {},
      }),
      new TextRun({
        text: '  DE SINIESTRO',
        bold: true,
        size: 28,
        font: 'Calibri',
        color: '0070C0',
      }),
    ],
  });
}

/**
 * Cuadro principal del informe único (plantilla Juliet):
 * tabla 2 columnas etiqueta | valor, sin sombreado gris, borde negro.
 */
function construirCuadroPrincipalInforme(fd = {}) {
  const filas = [
    ['REPORTE No', 'Único'],
    ['SINIESTRO No', txt(fd.numeroSiniestro)],
    ['FUNCIONARIO QUE ASIGNA', txt(fd.funcionarioAsigna)],
    ['TOMADOR', txt(fd.tomador || fd.asegurado)],
    ['VIGENCIA', txt(fd.vigenciaPoliza)],
    ['ASEGURADO', txt(fd.asegurado)],
    [
      'IDENTIFICACION',
      txt(fd.identificacionActa || fd.metadata?.numeroDocumento),
    ],
    ['DIRECCION RIESGO ASEGURADO', txt(fd.direccionRiesgo)],
    ['UBICACIÓN RIESGO AFECTADO', txt(fd.ubicacionRiesgo)],
    ['TIPO DE EVENTO', txt(fd.tipoEvento || fd.tipoSiniestro || fd.tipoRiesgoActa)],
    ['FECHA DE OCURRENCIA', fmtFecha(fd.fechaOcurrencia || fd.fechaSiniestro)],
    ['FECHA DE ASIGNACION', fmtFecha(fd.fechaAsignacion || fd.fechaReporte)],
    ['FECHA DE VISITA', fmtFecha(fd.fechaInspeccion)],
    ['INDEMNIZACIÓN SUGERIDA', fmtMoney(fd.indemnizacionSugerida)],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4200, 4800],
    borders: bordersCuadro,
    rows: filas.map(
      ([etiqueta, valor]) =>
        new TableRow({
          children: [
            cell(etiqueta, {
              bold: true,
              width: 4200,
              size: 20,
              cuadro: true,
            }),
            cell(valor, {
              width: 4800,
              size: 20,
              cuadro: true,
            }),
          ],
        })
    ),
  });
}

const crearTituloActa = (texto) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [
      new TextRun({
        text: texto,
        font: 'Arial',
        size: 28,
        bold: true,
        color: '000000',
      }),
    ],
  });

const crearTextoArial = (texto, opciones = {}) =>
  new Paragraph({
    ...(opciones.heading ? { heading: opciones.heading } : {}),
    alignment: opciones.alignment || AlignmentType.JUSTIFIED,
    spacing: {
      before: opciones.spacingBefore ?? opciones.spacing?.before ?? 0,
      after: opciones.spacingAfter ?? opciones.spacing?.after ?? 200,
    },
    children: [
      new TextRun({
        text: String(texto ?? ''),
        font: 'Arial',
        size: opciones.size || 24,
        bold: opciones.bold !== undefined ? opciones.bold : !!opciones.heading,
        color: opciones.color || '000000',
        italics: !!opciones.italics,
      }),
    ],
  });

const crearParrafosDesdeTexto = (texto, opciones = {}) => {
  if (!texto || typeof texto !== 'string') return [crearTextoArial(texto || '', opciones)];
  const lineas = texto.split('\n').filter((l) => l.trim() !== '');
  if (!lineas.length) return [crearTextoArial(texto, opciones)];
  return lineas.map((linea) => crearTextoArial(linea.trim(), opciones));
};

const mensajeSinInfo = (campo) =>
  crearTextoArial(`[${campo} - No se ha proporcionado información]`, {
    spacingAfter: 200,
    italics: true,
    color: '666666',
  });

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

const stripMapaBase64 = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  const idx = dataUrl.indexOf('base64,');
  if (idx !== -1) return dataUrl.slice(idx + 7);
  return dataUrl.replace(/^data:image\/\w+;base64,/, '');
};

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Resuelve captura del mapa (base64, http o ruta upload) para el Word. */
async function cargarMapaDataUrl(fd = {}) {
  const im = fd.imagenMapa;
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

async function construirBloqueMapaDanios(fd = {}) {
  const bloques = [];
  const mapaDataUrl = await cargarMapaDataUrl(fd);
  const coordenadas = txt(fd.coordenadasRiesgo);

  if (!mapaDataUrl && !coordenadas && !txt(fd.direccionRiesgo)) {
    return bloques;
  }

  bloques.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: 'Ubicación del riesgo',
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
      ],
    })
  );

  if (mapaDataUrl) {
    bloques.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new ImageRun({
            data: stripMapaBase64(mapaDataUrl),
            transformation: { width: 420, height: 300 },
            type: 'png',
          }),
        ],
      })
    );
  }

  if (coordenadas) {
    bloques.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `Coordenadas: ${coordenadas}`,
            size: 20,
            font: 'Calibri',
            color: '0070C0',
          }),
        ],
      })
    );
  }

  if (txt(fd.direccionRiesgo)) {
    bloques.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: `Dirección: ${txt(fd.direccionRiesgo)}`,
            size: 20,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  return bloques;
}

/** Bloque FIRMAS idéntico al acta de Ajuste (Cliente | Ajustador + Proser Ajustes SAS). */
async function construirFirmasActaCatastrofico(fd = {}) {
  const bordePunteado = { style: BorderStyle.DASHED, size: 4, color: '000000' };
  const bordesFirmas = {
    top: bordePunteado,
    bottom: bordePunteado,
    left: bordePunteado,
    right: bordePunteado,
    insideHorizontal: bordePunteado,
    insideVertical: bordePunteado,
  };

  let imgClienteSrc = fd.actaClienteFirma || '';
  if (imgClienteSrc) {
    try {
      const { normalizarFirmaClienteDataUrl } = await import('../../utils/normalizarFirmaImagen.js');
      imgClienteSrc = await normalizarFirmaClienteDataUrl(imgClienteSrc);
    } catch {
      /* keep original */
    }
  }

  const imgCliente = await imagenDesdeDataUrl(imgClienteSrc);
  const imgAjustador = await imagenDesdeDataUrl(
    fd.actaAjustadorFirmaImagen || fd.firmaFuncionario || ''
  );

  const nombreCliente = txt(fd.actaClienteNombre, 'NOMBRE DEL CLIENTE / TITULAR').toUpperCase();
  const nombreAjustador = txt(
    fd.actaAjustadorNombre || fd.nombreFirmante || fd.funcionarioFirma,
    'NOMBRE DEL AJUSTADOR'
  ).toUpperCase();
  const cargoCliente = txt(fd.actaClienteCargo, '—');
  const emailCliente = txt(fd.actaClienteEmail, '—');
  const cargoAjustador = txt(fd.actaAjustadorCargo || fd.cargoFirmante || fd.cargoFuncionario, '—');
  const emailAjustador = txt(fd.actaAjustadorEmail || fd.emailFuncionario, '—');

  const parrafoFirmaOGuion = (img) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 100 },
      children: img
        ? [
            new ImageRun({
              data: img.data,
              transformation: { width: img.width || 220, height: img.height || 90 },
              type: img.type,
            }),
          ]
        : [
            new TextRun({
              text: '________________________',
              font: 'Arial',
              size: 24,
              color: '000000',
            }),
          ],
    });

  const margFirma = { top: 80, bottom: 80, left: 100, right: 100 };
  const celdaFirma = (children, { span = 1 } = {}) =>
    new TableCell({
      columnSpan: span > 1 ? span : undefined,
      width: { size: span > 1 ? 100 : 50, type: WidthType.PERCENTAGE },
      margins: margFirma,
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: bordePunteado,
        bottom: bordePunteado,
        left: bordePunteado,
        right: bordePunteado,
      },
      children:
        Array.isArray(children) && children.length > 0
          ? children
          : [new Paragraph({ children: [] })],
    });

  return [
    crearTextoArial('FIRMAS', {
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 150 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: bordesFirmas,
      rows: [
        new TableRow({
          children: [
            celdaFirma([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
                children: [
                  new TextRun({ text: 'FIRMA DE CLIENTE', font: 'Arial', size: 22, bold: true }),
                ],
              }),
            ]),
            celdaFirma([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: 'FIRMA DEL AJUSTADOR',
                    font: 'Arial',
                    size: 22,
                    bold: true,
                  }),
                ],
              }),
            ]),
          ],
        }),
        new TableRow({
          children: [
            celdaFirma([parrafoFirmaOGuion(imgCliente)]),
            celdaFirma([parrafoFirmaOGuion(imgAjustador)]),
          ],
        }),
        new TableRow({
          children: [
            celdaFirma([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: nombreCliente,
                    font: 'Arial',
                    size: 22,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
            ]),
            celdaFirma([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: nombreAjustador,
                    font: 'Arial',
                    size: 22,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
            ]),
          ],
        }),
        new TableRow({
          children: [
            celdaFirma([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [
                  new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                  new TextRun({ text: cargoCliente, font: 'Arial', size: 20 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: 'Correo: ', font: 'Arial', size: 20, bold: true }),
                  new TextRun({
                    text: emailCliente,
                    font: 'Arial',
                    size: 20,
                    color: '0066CC',
                  }),
                ],
              }),
            ]),
            celdaFirma([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [
                  new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                  new TextRun({ text: cargoAjustador, font: 'Arial', size: 20 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: 'E-Mail: ', font: 'Arial', size: 20, bold: true }),
                  new TextRun({
                    text: emailAjustador,
                    font: 'Arial',
                    size: 20,
                    color: '0066CC',
                  }),
                ],
              }),
            ]),
          ],
        }),
        new TableRow({
          children: [
            celdaFirma(
              [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 },
                  children: [
                    new TextRun({
                      text: 'Proser Ajustes SAS',
                      font: 'Arial',
                      size: 24,
                      bold: true,
                      color: 'C00000',
                    }),
                  ],
                }),
              ],
              { span: 2 }
            ),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 300 } }),
  ];
}

/** Cuerpo del acta: tabla 4 columnas alineada + secciones + firmas. */
async function construirBloqueActaInspeccionCatastrofico(fd = {}) {
  const wLabel = 2200;
  const wValor = 2800;
  const marg = { top: 80, bottom: 80, left: 100, right: 100 };

  const encabezadoCelda = (texto) =>
    new TableCell({
      width: { size: wLabel, type: WidthType.DXA },
      borders: bordersActa,
      margins: marg,
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: 'D9D9D9' },
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: String(texto || ''), bold: true, font: 'Arial', size: 18 }),
          ],
        }),
      ],
    });

  const celdaValor = (texto) =>
    new TableCell({
      width: { size: wValor, type: WidthType.DXA },
      borders: bordersActa,
      margins: marg,
      verticalAlign: VerticalAlign.CENTER,
      shading: { fill: 'FFFFFF' },
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: String(texto || ''), font: 'Arial', size: 18, color: '000000' }),
          ],
        }),
      ],
    });

  const fila = (l1, v1, l2, v2) =>
    new TableRow({
      children: [encabezadoCelda(l1), celdaValor(v1), encabezadoCelda(l2), celdaValor(v2)],
    });

  const identificacion = txt(fd.identificacionActa || fd.metadata?.numeroDocumento);
  const tipoRiesgo = txt(fd.tipoRiesgoActa || fd.tipoEvento || fd.tipoSiniestro);

  return [
    crearTituloActa('ACTA DE INSPECCIÓN'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [wLabel, wValor, wLabel, wValor],
      borders: bordersActa,
      rows: [
        fila(
          'FECHA INSPECCIÓN',
          fmtFecha(fd.fechaInspeccion),
          'CIUDAD',
          txt(fd.ciudad)
        ),
        fila(
          'DIRECCIÓN',
          txt(fd.direccionRiesgo),
          'TIPO DE RIESGO',
          tipoRiesgo
        ),
        fila(
          'ASEGURADO',
          txt(fd.asegurado),
          'IDENTIFICACIÓN',
          identificacion
        ),
        fila(
          'No. SINIESTRO',
          txt(fd.numeroSiniestro),
          'FECHA SINIESTRO',
          fmtFecha(fd.fechaSiniestro || fd.fechaOcurrencia)
        ),
      ],
    }),
    new Paragraph({ children: [], spacing: { after: 200 } }),
    crearTextoArial('DESCRIPCIÓN DE RIESGO', {
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 150 },
    }),
    ...(String(fd.descripcionRiesgo || '').trim()
      ? crearParrafosDesdeTexto(fd.descripcionRiesgo, { spacingAfter: 200 })
      : [mensajeSinInfo('Descripción del riesgo')]),
    crearTextoArial('DESCRIPCIÓN DEL SINIESTRO', {
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 150 },
    }),
    ...(String(fd.descripcionSiniestro || '').trim()
      ? crearParrafosDesdeTexto(fd.descripcionSiniestro, { spacingAfter: 200 })
      : [mensajeSinInfo('Descripción del siniestro')]),
    crearTextoArial('OBSERVACIONES (ACTA)', {
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 150 },
    }),
    ...(String(fd.actaObservaciones || '').trim()
      ? crearParrafosDesdeTexto(fd.actaObservaciones, { spacingAfter: 200 })
      : [mensajeSinInfo('Observaciones del acta')]),
    ...(await construirFirmasActaCatastrofico(fd)),
  ];
}

/**
 * Genera el .docx del informe único catastrófico.
 * @returns {Promise<{ blob: Blob, fileName: string }>}
 */
export async function generarWordCatastrofico(formData = {}, { modo = 'informeUnico' } = {}) {
  const fd = formData;
  const children = [];
  const encabezado = await crearEncabezadoCatastrofico(fd, { modo });

  if (modo === 'actaInspeccion') {
    children.push(...(await construirBloqueActaInspeccionCatastrofico(fd)));
  } else {
    const ciudadFecha = `${txt(fd.ciudad, 'Ciudad')}, ${fmtFecha(new Date())}`;
    children.push(p(ciudadFecha, { after: 200 }));
    children.push(p('Señor (a;es)'));
    children.push(p(`Atn: ${txt(fd.destinatario)}`));
    children.push(p(`Cargo: ${txt(fd.cargo)}`));
    children.push(p(`Compañía: ${txt(fd.aseguradora)}`));
    children.push(p(txt(fd.ciudadDestino || fd.ciudad), { after: 200 }));

    children.push(crearTituloInformeUnico());
    children.push(construirCuadroPrincipalInforme(fd));
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));

    children.push(heading('ANTECEDENTES'));
    children.push(p(txt(fd.antecedentes, 'Sin información')));

    {
      const mapaEventoDataUrl = await convertirImagenImportadaABase64(
        `${import.meta.env.BASE_URL || '/'}templates/mapa-evento-siniestro.png`
      );
      if (mapaEventoDataUrl) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 80 },
            children: [
              new ImageRun({
                data: stripMapaBase64(mapaEventoDataUrl),
                transformation: { width: 480, height: 342 },
                type: 'png',
              }),
            ],
          })
        );
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Mapa del evento — impacto del sismo en Colombia',
                size: 18,
                font: 'Calibri',
                color: '555555',
              }),
            ],
          })
        );
      }
    }

    children.push(heading('CIRCUNSTANCIA DEL SINIESTRO'));
    children.push(
      p(txt(fd.circunstanciasSiniestro || fd.descripcionSiniestro, 'Sin información'))
    );

    {
      const cronologia = resolverCronologiaCatastrofico(fd);
      const cronologiaDataUrl = await cargarImagenCronologiaComoDataUrl(cronologia);
      if (cronologiaDataUrl) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 80 },
            children: [
              new ImageRun({
                data: stripMapaBase64(cronologiaDataUrl),
                transformation: { width: 520, height: 350 },
                type: 'jpg',
              }),
            ],
          })
        );
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: cronologia?.leyenda || 'Diagrama cronología de la emergencia',
                bold: true,
                size: 20,
                font: 'Calibri',
              }),
            ],
          })
        );
      }
      if (txt(fd.diagramaCronologiaNota)) {
        children.push(p(fd.diagramaCronologiaNota));
      }
    }

    children.push(heading('DESCRIPCIÓN DE LOS DAÑOS Y/O PERJUICIOS'));
    children.push(p(txt(fd.descripcionDanios || fd.descripcionRiesgo, 'Sin información')));
    children.push(...(await construirBloqueMapaDanios(fd)));

    if (txt(fd.areaLote) || txt(fd.nivelesInmueble) || txt(fd.claseInmueble) || txt(fd.tipoInmueble)) {
      if (txt(fd.claseInmueble) || txt(fd.tipoInmueble)) {
        children.push(
          p(
            `Tipo de inmueble: ${[txt(fd.claseInmueble), txt(fd.tipoInmueble)].filter(Boolean).join(' · ')}`
          )
        );
      }
      if (txt(fd.areaLote)) children.push(p(`Área Lote (m2): ${txt(fd.areaLote)}`));
      if (txt(fd.nivelesInmueble)) children.push(p(`Niveles: ${txt(fd.nivelesInmueble)}`));
    }

    const distribucion = Array.isArray(fd.distribucionInmueble) ? fd.distribucionInmueble : [];
    if (distribucion.length) {
      children.push(p('Distribución inmueble', { bold: true, before: 160 }));
      children.push(
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          rows: [
            new TableRow({
              children: [cell('Zona', { bold: true }), cell('Cantidad', { bold: true })],
            }),
            ...distribucion.map(
              (row) =>
                new TableRow({
                  children: [cell(row.zona), cell(row.cantidad)],
                })
            ),
          ],
        })
      );
    }

    const espacios = Array.isArray(fd.espaciosAfectados) ? fd.espaciosAfectados : [];
    if (espacios.length) {
      children.push(p('Secciones internas', { bold: true, before: 160 }));
      children.push(
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          rows: [
            new TableRow({
              children: [
                cell('Espacios', { bold: true }),
                cell('Dimensiones', { bold: true }),
                cell('Área Aprox. (m2)', { bold: true }),
              ],
            }),
            ...espacios.map(
              (row) =>
                new TableRow({
                  children: [cell(row.espacio), cell(row.dimensiones), cell(row.area)],
                })
            ),
          ],
        })
      );
    }

    children.push(heading('INSPECCIÓN (REGISTRO FOTOGRÁFICO)'));
    const nFotos = Array.isArray(fd.imagenesInspeccion) ? fd.imagenesInspeccion.length : 0;
    children.push(
      p(
        nFotos
          ? `Se adjunta registro fotográfico (${nFotos} imagen(es)). Las fotos se gestionan en la plataforma.`
          : 'Pendiente registro fotográfico (recomendado entre 4 y 9 fotos).'
      )
    );

    // Fuente de verdad: hoja Presupuesto NSR-10 (re-mapeo fresco en cada Word)
    let presupuesto = resolverPresupuestoParaWord(fd);
    if (tienePresupuestoNsr10(fd)) {
      const sync = sincronizarPresupuestoNsr10AlInforme(fd, { forzar: true });
      if (sync?.presupuestoCatastrofico) {
        presupuesto = sync.presupuestoCatastrofico;
      }
    }
    let items = Array.isArray(presupuesto.items) ? presupuesto.items : [];
    const esNsr10 =
      presupuesto.fuente === 'nsr10' ||
      tienePresupuestoNsr10(fd) ||
      items.some(
        (it) =>
          it?.codigoEvaluacion ||
          it?.capitulo ||
          it?.componente ||
          String(it?.id || '').startsWith('nsr10-')
      );
    const resumen = esNsr10
      ? {
          costoDirecto: Number(presupuesto.totalesNsr10?.subtotal) || 0,
          aiu: Number(presupuesto.totalesNsr10?.aiu) || 0,
          imprevistos: Number(presupuesto.totalesNsr10?.imprevistos) || 0,
          impuestos: Number(presupuesto.totalesNsr10?.impuestos) || 0,
          total: Number(presupuesto.totalesNsr10?.total) || 0,
        }
      : {
          ...calcularResumenPresupuesto(
            items,
            presupuesto.aiuPorcentaje ?? AIU_PORCENTAJE_DEFAULT
          ),
          imprevistos: 0,
          impuestos: 0,
        };
    const liquidacion = fd.liquidacionCatastrofico || {};
    const totalDaniosInforme = obtenerTotalDaniosParaInforme(presupuesto);
    const totalContenidosNsr = Number(presupuesto?.totalesNsr10?.totalContenidos);
    const diagrama = calcularDiagramaLiquidacion({
      valorAsegurado: liquidacion.valorAsegurado,
      totalDanios: totalDaniosInforme,
      totalContenidos: Number.isFinite(totalContenidosNsr) ? totalContenidosNsr : null,
      hospedajePorcentaje: liquidacion.hospedajePorcentaje ?? HOSPEDAJE_PORCENTAJE_DEFAULT,
      hospedajeManual: liquidacion.hospedajeManual,
      deducible: liquidacion.deducible,
      deducibleConfig: liquidacion.deducibleConfig,
    });

    children.push(
      heading(
        esNsr10
          ? 'PRESUPUESTO DE INTERVENCIÓN / REPARACIÓN POST-SISMO (NSR-10)'
          : 'PRESUPUESTO DAÑOS'
      )
    );
    children.push(
      p(
        txt(
          presupuesto.intro ||
            (esNsr10
              ? 'Presupuesto de intervención / reparación post-sismo (plantilla evaluación NSR-10).'
              : '')
        )
      )
    );

    // Mismo cuadro del liquidador NSR-10 de la plataforma (sin código eval.).
    children.push(p('LIQUIDADOR NSR-10 · MISMO CUADRO DE LA PLATAFORMA', { bold: true, before: 160 }));
    children.push(
      p(
        'Capítulo, componente, actividad, unidad, cantidad, vlr. unitario/total, prioridad, cubierto y observación.',
        { before: 40, after: 80 }
      )
    );

    const W = {
      cap: 1200,
      comp: 1100,
      act: 1600,
      uni: 550,
      cant: 700,
      vu: 900,
      vt: 900,
      pri: 700,
      cub: 700,
      obs: 1350,
    };
    const W_TOTAL = Object.values(W).reduce((a, b) => a + b, 0);
    const cellNsr = (text, width, opts = {}) =>
      cell(text, {
        width,
        size: 14,
        bold: !!opts.bold,
        shading: opts.shading || undefined,
      });
    const cellSpan = (text, spanWidth, opts = {}) =>
      new TableCell({
        borders,
        columnSpan: opts.span || 7,
        width: { size: spanWidth, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        shading: { fill: opts.shading || 'F3F4F6' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: String(text ?? ''),
                bold: true,
                size: 14,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      });
    const filaResumenNsr = (etiqueta, valor) =>
      new TableRow({
        children: [
          cellSpan(etiqueta, W.cap + W.comp + W.act + W.uni + W.cant + W.vu, {
            span: 6,
          }),
          cellNsr(fmtMoney(valor), W.vt, { bold: true, shading: 'F3F4F6' }),
          cellNsr('', W.pri, { shading: 'F3F4F6' }),
          cellNsr('', W.cub, { shading: 'F3F4F6' }),
          cellNsr('', W.obs, { shading: 'F3F4F6' }),
        ],
      });

    const aiuPctLabel = Math.round(Number(presupuesto.aiuPorcentaje ?? 0.05) * 100);
    const imprPctLabel = Math.round(Number(presupuesto.imprevistosPorcentaje ?? 0.1) * 100);
    const impPctLabel = Math.round(Number(presupuesto.impuestosPorcentaje ?? 0) * 100);

    const filasResumen = [
      filaResumenNsr('SUBTOTAL', resumen.costoDirecto),
      filaResumenNsr(`AIU (${aiuPctLabel}%)`, resumen.aiu),
    ];
    if (esNsr10) {
      filasResumen.push(
        filaResumenNsr(`IMPREVISTOS (${imprPctLabel}%)`, resumen.imprevistos),
        filaResumenNsr(`IMPUESTOS (${impPctLabel}%)`, resumen.impuestos)
      );
    }
    filasResumen.push(filaResumenNsr('TOTAL ESTIMADO', resumen.total));

    children.push(
      new Table({
        width: { size: W_TOTAL, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [
              cellNsr('CAPÍTULO', W.cap, { bold: true, shading: 'E5E7EB' }),
              cellNsr('COMPONENTE', W.comp, { bold: true, shading: 'E5E7EB' }),
              cellNsr('ACTIVIDAD / REPARACIÓN', W.act, { bold: true, shading: 'E5E7EB' }),
              cellNsr('UND', W.uni, { bold: true, shading: 'E5E7EB' }),
              cellNsr('CANT.', W.cant, { bold: true, shading: 'E5E7EB' }),
              cellNsr('VLR. UNITARIO', W.vu, { bold: true, shading: 'E5E7EB' }),
              cellNsr('VLR. TOTAL', W.vt, { bold: true, shading: 'E5E7EB' }),
              cellNsr('PRIORIDAD', W.pri, { bold: true, shading: 'E5E7EB' }),
              cellNsr('¿CUBIERTO?', W.cub, { bold: true, shading: 'E5E7EB' }),
              cellNsr('OBSERVACIÓN', W.obs, { bold: true, shading: 'E5E7EB' }),
            ],
          }),
          ...(items.length
            ? items.map(
                (item) =>
                  new TableRow({
                    children: [
                      cellNsr(item.capitulo || '', W.cap),
                      cellNsr(item.componente || '', W.comp),
                      cellNsr(item.actividad || '', W.act),
                      cellNsr(item.unidad || 'und', W.uni),
                      cellNsr(String(item.cantidad ?? 0), W.cant),
                      cellNsr(fmtMoney(item.valorUnitario), W.vu),
                      cellNsr(fmtMoney(calcularValorFinalItem(item)), W.vt),
                      cellNsr(item.prioridad || '', W.pri),
                      cellNsr(item.cubierto || '', W.cub),
                      cellNsr(item.observacion || '', W.obs),
                    ],
                  })
              )
            : [
                new TableRow({
                  children: [
                    cellSpan('Sin ítems de presupuesto', W_TOTAL, { span: 10 }),
                  ],
                }),
              ]),
          ...filasResumen,
        ],
      })
    );

    children.push(heading('DIAGRAMA DE LIQUIDACIÓN'));
    children.push(
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [cell('ITEM', { bold: true }), cell('VALOR', { bold: true })],
          }),
          filaDos('VALOR ASEGURADO', fmtMoney(diagrama.valorAsegurado)),
          filaDos('DAÑOS', fmtMoney(diagrama.danios)),
          filaDos(
            `GASTOS DE HOSPEDAJE (${Math.round((Number(liquidacion.hospedajePorcentaje) || HOSPEDAJE_PORCENTAJE_DEFAULT) * 100)}% DEL VALOR ASEGURADO)`,
            fmtMoney(diagrama.gastosHospedaje)
          ),
          filaDos(
            diagrama.deducibleAplica
              ? `DEDUCIBLE (${diagrama.deducible || 'aplicado'})`
              : 'DEDUCIBLE',
            diagrama.deducibleAplica
              ? fmtMoney(diagrama.deducibleAplicado || 0)
              : diagrama.deducible || 'No aplica'
          ),
          filaDos('TOTAL A INDEMNIZAR', fmtMoney(diagrama.totalIndemnizar)),
        ],
      })
    );

    children.push(heading('OBSERVACIÓN'));
    children.push(p(txt(fd.observacionesInforme || fd.actaObservaciones, 'Sin información')));
    children.push(p(''));
    children.push(
      p(
        'De esta manera nos permitimos entregar el presente informe, agradeciendo la confianza depositada en nuestra firma.'
      )
    );
    children.push(p('Cordialmente,', { before: 200, after: 200 }));
    children.push(...(await construirFirmasActaCatastrofico(fd)));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 720, left: 720, right: 720 },
          },
        },
        headers: {
          default: encabezado,
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const asegurado = txt(fd.asegurado, 'caso').replace(/[^\w\- ]+/g, '').slice(0, 40);
  const fileName =
    modo === 'actaInspeccion'
      ? `Acta_Inspeccion_Catastrofico_${asegurado || 'caso'}.docx`
      : `Informe_Unico_Catastrofico_${asegurado || 'caso'}.docx`;

  return { blob, fileName };
}

export function descargarBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
