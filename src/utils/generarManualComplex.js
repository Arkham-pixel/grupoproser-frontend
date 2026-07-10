import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import {
  MANUAL_COMPLEX_TITULO,
  MANUAL_COMPLEX_VERSION,
  SECCIONES_MANUAL_COMPLEX,
} from '../config/manualComplexContent.js';

function crearRunsConNegrilla(texto, base = {}) {
  const partes = String(texto).split(/(\*\*[^*]+\*\*)/g);
  return partes
    .filter((p) => p.length > 0)
    .map((parte) => {
      if (parte.startsWith('**') && parte.endsWith('**')) {
        return new TextRun({
          text: parte.slice(2, -2),
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '000000',
          ...base,
        });
      }
      return new TextRun({
        text: parte,
        size: 24,
        font: 'Calibri',
        color: '000000',
        ...base,
      });
    });
}

function crearParrafo(texto, { indent = false, italic = false, bold = false, color } = {}) {
  const runs = crearRunsConNegrilla(texto, { italics: italic, bold });
  if (bold && runs.length === 1) runs[0].bold = true;
  if (color) runs.forEach((r) => { r.color = color; });
  return new Paragraph({
    children: runs,
    spacing: { after: indent ? 120 : 200 },
    indent: indent ? { left: 400 } : undefined,
    alignment: AlignmentType.JUSTIFIED,
  });
}

function crearTituloSeccion(texto, pageBreak = false) {
  return [
    pageBreak ? new Paragraph({ children: [], pageBreakBefore: true }) : null,
    new Paragraph({
      children: [
        new TextRun({
          text: texto,
          bold: true,
          size: 32,
          font: 'Calibri',
          color: 'C8102E',
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 200 },
    }),
  ].filter(Boolean);
}

function crearSubtitulo(texto) {
  return new Paragraph({
    children: [
      new TextRun({
        text: texto,
        bold: true,
        size: 26,
        font: 'Calibri',
        color: '1E1E1E',
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 160 },
  });
}

function crearNota(texto) {
  return new Paragraph({
    children: crearRunsConNegrilla(texto, { italics: true }),
    spacing: { before: 120, after: 200 },
    indent: { left: 200, right: 200 },
    shading: { fill: 'FDE8E8' },
    border: {
      left: { color: 'C8102E', size: 12, style: 'single' },
    },
  });
}

function crearZonaCaptura(numero, leyenda, instruccion, archivo) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `FIGURA ${numero}: ${leyenda || 'Captura de pantalla'}`,
          bold: true,
          size: 22,
          font: 'Calibri',
          color: 'C8102E',
        }),
      ],
      spacing: { before: 280, after: 160 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `[ INSERTAR CAPTURA DE PANTALLA AQUÍ ]`,
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '666666',
        }),
      ],
      spacing: { before: 200, after: 120 },
      alignment: AlignmentType.CENTER,
      shading: { fill: 'FFF9C4' },
    }),
    crearParrafo(instruccion || leyenda || '', { italic: true, color: '666666' }),
    archivo
      ? new Paragraph({
          children: [
            new TextRun({
              text: `Archivo sugerido: public/manual-complex/${archivo}`,
              size: 20,
              font: 'Calibri',
              color: '888888',
              italics: true,
            }),
          ],
          spacing: { after: 360 },
          alignment: AlignmentType.CENTER,
        })
      : new Paragraph({ spacing: { after: 360 } }),
  ];
}

function bloquesADocx(bloques, screenshotCounterRef) {
  const elementos = [];

  bloques.forEach((bloque) => {
    switch (bloque.tipo) {
      case 'texto':
        elementos.push(crearParrafo(bloque.contenido));
        break;
      case 'subtitulo':
        elementos.push(crearSubtitulo(bloque.contenido));
        break;
      case 'lista':
        (bloque.items || []).forEach((item) => {
          elementos.push(crearParrafo(`• ${item}`, { indent: true }));
        });
        break;
      case 'nota':
        elementos.push(crearNota(bloque.contenido));
        break;
      case 'imagen':
        screenshotCounterRef.n += 1;
        elementos.push(
          ...crearZonaCaptura(
            screenshotCounterRef.n,
            bloque.leyenda,
            bloque.instruccion,
            bloque.archivo
          )
        );
        break;
      default:
        break;
    }
  });

  return elementos;
}

export function construirDocumentoManualComplex() {
  const docContent = [];
  const screenshotCounterRef = { n: 0 };

  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'MANUAL DE UTILIZACIÓN',
          bold: true,
          size: 52,
          font: 'Calibri',
          color: 'C8102E',
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'MÓDULO COMPLEX — ARNALD DATAFLOW',
          bold: true,
          size: 36,
          font: 'Calibri',
          color: '1E1E1E',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Versión ${MANUAL_COMPLEX_VERSION} · Grupo Proser`,
          size: 22,
          font: 'Calibri',
          color: '666666',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    crearParrafo(
      'Este documento explica el funcionamiento del área COMPLEX: gestión de casos, trazabilidad por etapas, indicadores de gestión, alertas del protocolo e informe anual. Incluye zonas marcadas en amarillo para insertar capturas de pantalla antes de la presentación a gerencia.',
      { bold: false }
    ),
    crearNota(
      'IMPORTANTE: Complete las 9 figuras con capturas de pantalla de Arnald. Los recuadros amarillos indican dónde pegar cada imagen en Word (Insertar → Imágenes).'
    )
  );

  SECCIONES_MANUAL_COMPLEX.forEach((seccion, index) => {
    docContent.push(...crearTituloSeccion(seccion.titulo, index > 0));
    docContent.push(...bloquesADocx(seccion.bloques || [], screenshotCounterRef));
  });

  docContent.push(
    new Paragraph({ children: [], pageBreakBefore: true }),
    crearSubtitulo('Control de figuras'),
    crearParrafo('Use esta lista como guía al armar la presentación:', { indent: false }),
    ...[
      'Fig. 1 — Menú / navegación COMPLEX',
      'Fig. 2 — Datos generales (fecha y hora de asignación)',
      'Fig. 3 — Resumen de trazabilidad',
      'Fig. 4 — Detalle de una fase (plazo, fecha, documentos)',
      'Fig. 5 — Plantilla de correo contacto inicial',
      'Fig. 6 — Indicadores históricos',
      'Fig. 7 — Indicadores del protocolo',
      'Fig. 8 — Mis alertas',
      'Fig. 9 — Informe 2025',
    ].map((item) => crearParrafo(`• ${item}`, { indent: true }))
  );

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
          },
        },
        children: docContent,
      },
    ],
  });
}

export async function generarManualComplexBuffer() {
  const doc = construirDocumentoManualComplex();
  return Packer.toBuffer(doc);
}

export async function generarManualComplexDescarga() {
  const { saveAs } = await import('file-saver');
  const doc = construirDocumentoManualComplex();
  const blob = await Packer.toBlob(doc);
  const nombreArchivo = `Manual_Utilizacion_COMPLEX_Arnald_${MANUAL_COMPLEX_VERSION}.docx`;
  saveAs(blob, nombreArchivo);
  return { success: true, nombreArchivo };
}
