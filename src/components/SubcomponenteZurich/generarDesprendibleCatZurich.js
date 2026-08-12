/**
 * Desprendible Manual CAT Zurich (inspección / exposición).
 * Incluye severidad por nivel (Aplica / No aplica + observación) y evidencia.
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
import { urlDescargaArchivoZurich } from '../../services/zurichService.js';
import {
  DISCLAIMER_CAT_ZURICH,
  EVIDENCIA_CAT_KEYS,
  SEVERIDAD_CAT_ZURICH,
  derivarSeveridadCatDesdeNiveles,
  formatDate,
  labelSeveridadCat,
  normalizeEvidenciaCat,
  normalizeEvidenciaItem,
  normalizeSeveridadCatNiveles,
} from './zurichHelpers.js';

const thin = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const W = 10080; // ~7" usable

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
  if (aplica === 'NO') return 'NO APLICA';
  return 'SIN MARCAR';
};

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

  const parrafos = [];
  let incluidas = 0;
  for (let i = 0; i < fotosOrdenadas.length; i += 1) {
    const a = fotosOrdenadas[i];
    const titulo = `${i + 1}. ${a.nombreOriginal || a.nombreArchivo || 'Foto'}`;
    const descripcion = String(a.descripcion || '').trim();
    const url = urlDescargaArchivoZurich(a.ruta);
    const img = url ? await fetchImageBytes(url) : null;

    if (img) {
      incluidas += 1;
      parrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 160, after: 40 },
          children: [
            new ImageRun({
              data: img.bytes,
              transformation: { width: 480, height: 320 },
              type: img.type,
            }),
          ],
        })
      );
      parrafos.push(
        p(titulo, {
          align: AlignmentType.CENTER,
          size: 16,
          bold: true,
          before: 40,
          after: descripcion ? 20 : 80,
        })
      );
      if (descripcion) {
        parrafos.push(
          p(descripcion, {
            align: AlignmentType.CENTER,
            size: 16,
            before: 0,
            after: 120,
          })
        );
      }
    } else {
      parrafos.push(
        p(
          `${titulo}${descripcion ? ` — ${descripcion}` : ''} (foto no embebida: no se pudo descargar)`,
          { size: 16, italics: true, before: 80, after: 80 }
        )
      );
    }
  }

  if (!incluidas && parrafos.length) {
    parrafos.unshift(
      p('No se pudieron embeber las imágenes. Verifique acceso a los archivos subidos.', {
        italics: true,
        size: 16,
        before: 40,
        after: 80,
      })
    );
  }

  return parrafos;
}

/**
 * @param {object} caso — caso Zurich (con severidadCatNiveles / evidenciaCat)
 */
export async function generarDesprendibleCatZurich(caso = {}) {
  const niveles = normalizeSeveridadCatNiveles(caso.severidadCatNiveles, caso.severidadCat);
  const evidencia = normalizeEvidenciaCat(caso.evidenciaCat);
  const severidadDerivada =
    caso.severidadCat ?? derivarSeveridadCatDesdeNiveles(niveles);

  const headerInfo = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [2520, 2520, 2520, 2520],
    rows: [
      new TableRow({
        children: [
          cell('Consecutivo', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.consecutivo || '—', { width: 2520 }),
          cell('Insured Name', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.asegurado || '—', { width: 2520 }),
        ],
      }),
      new TableRow({
        children: [
          cell('Risk ID', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.riskId || caso.identificacion || '—', { width: 2520 }),
          cell('Distancia epicentro (km)', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(
            caso.distanciaEpicentroKm === 0 || caso.distanciaEpicentroKm
              ? String(caso.distanciaEpicentroKm)
              : '—',
            { width: 2520 }
          ),
        ],
      }),
      new TableRow({
        children: [
          cell('Tipo negocio homologado', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.tipoNegocioHomologado || '—', { width: 2520 }),
          cell('CAT ubicación referencia', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.catUbicacionReferencia || '—', { width: 2520 }),
        ],
      }),
      new TableRow({
        children: [
          cell('Address Number', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.addressNumber || '—', { width: 2520 }),
          cell('Grupo inspección', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.grupoInspeccion || '—', { width: 2520 }),
        ],
      }),
      new TableRow({
        children: [
          cell('Dirección inspección sugerida', { bold: true, width: 2520, fill: 'D9E2F3' }),
          new TableCell({
            borders,
            columnSpan: 3,
            width: { size: 7560, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: caso.direccionInspeccionSugerida || '—',
                    font: 'Arial',
                    size: 15,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          cell('Link Google Maps', { bold: true, width: 2520, fill: 'D9E2F3' }),
          new TableCell({
            borders,
            columnSpan: 3,
            width: { size: 7560, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: caso.linkGoogleMaps || '—',
                    font: 'Arial',
                    size: 14,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          cell('Afectación', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.afectacion || '—', { width: 2520 }),
          cell('Grado afectación', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.gradoAfectacion || '—', { width: 2520 }),
        ],
      }),
      new TableRow({
        children: [
          cell('Lucro cesante', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.lucroCesante || '—', { width: 2520 }),
          cell('Fecha inspección', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(formatDate(caso.fechaInspeccion), { width: 2520 }),
        ],
      }),
      new TableRow({
        children: [
          cell('Severidad CAT', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(
            severidadDerivada
              ? `${severidadDerivada} — ${labelSeveridadCat(severidadDerivada)}`
              : '—',
            { width: 2520 }
          ),
          cell('Estado', { bold: true, width: 2520, fill: 'D9E2F3' }),
          cell(caso.estado || '—', { width: 2520 }),
        ],
      }),
    ],
  });

  const severidadRows = [
    new TableRow({
      children: [
        headCell('Nivel', 1440),
        headCell('Descripción del daño observado', 6480),
        headCell('Aplica / No aplica', 2160),
      ],
    }),
    ...SEVERIDAD_CAT_ZURICH.map((s) => {
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

  const evidenciaRows = [
    new TableRow({
      children: [
        headCell('Evidencia', 2160),
        headCell('Mínimo requerido', 3600),
        headCell('Cuándo aplica', 2160),
        headCell('Aplica', 2160),
      ],
    }),
    ...EVIDENCIA_CAT_KEYS.map((fila) => {
      const item = normalizeEvidenciaItem(evidencia[fila.key]);
      const aplicaFill =
        item.aplica === 'SI' ? 'C6EFCE' : item.aplica === 'NO' ? 'FFC7CE' : 'FFFFFF';
      return new TableRow({
        children: [
          cell(fila.evidencia, { bold: true, width: 2160 }),
          cell(fila.minimo, { width: 3600, fontSize: 16 }),
          cell(fila.cuando, { width: 2160, fontSize: 16 }),
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

  const evidenciaTable = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [2160, 3600, 2160, 2160],
    rows: evidenciaRows,
  });

  const fotoParrafos = await construirParrafosFotos(caso);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              p('ZURICH', { bold: true, size: 18, color: '002060', before: 0, after: 0 }),
              p('Grupo Proser — ARNALD', { size: 16, color: '666666', before: 0, after: 0 }),
            ],
          }),
        },
        children: [
          p('Manual para Inspecciones', { bold: true, size: 28, before: 0, after: 40 }),
          p('Inspecciones visuales y reporte de exposición por Evento CAT', {
            bold: true,
            size: 22,
            before: 0,
            after: 120,
          }),
          p('DESPRENDIBLE DE INSPECCIÓN CAT (diligenciado)', {
            bold: true,
            size: 20,
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
                        'Objetivo: entregar al ajustador información clave, sencilla y resumida para clasificar la severidad, completar la base de Excel y registrar evidencia fotográfica/documental. Este documento no autoriza a confirmar cobertura, negar cobertura, prometer pagos o actuar como vocero de Zurich.',
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

          p('2. Registro fotográfico y documental', {
            bold: true,
            size: 22,
            before: 280,
            after: 120,
          }),
          evidenciaTable,

          p('3. Observaciones generales de inspección', {
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

          p('4. Fotos de la inspección', {
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
                      p(DISCLAIMER_CAT_ZURICH, { size: 15, italics: true, before: 40, after: 60 }),
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

export async function descargarDesprendibleCatZurich(caso) {
  const doc = await generarDesprendibleCatZurich(caso);
  const blob = await Packer.toBlob(doc);
  const nombre = `Desprendible_CAT_Zurich_${caso.consecutivo || caso.identificacion || 'caso'}.docx`;
  saveAs(blob, nombre);
  return nombre;
}
