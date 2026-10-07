/**
 * Genera el manual Word de la Bandeja control de horas Zurich.
 * Uso: node docs/manual-bandeja-zurich/generar-manual-docx.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  LevelFormat,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imgDir = path.join(__dirname, 'img');
const outPath = path.join(__dirname, 'Manual-Bandeja-Control-Horas-Zurich.docx');

function img(nombre, width = 500, height = 460) {
  const full = path.join(imgDir, nombre);
  if (!fs.existsSync(full)) return null;
  const data = fs.readFileSync(full);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        type: 'png',
        data,
        transformation: { width, height },
        altText: { title: nombre, description: nombre, name: nombre },
      }),
    ],
  });
}

function imgReal(nombre, width = 540, height = 300) {
  const full = path.join(imgDir, nombre);
  if (!fs.existsSync(full)) return null;
  const data = fs.readFileSync(full);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        type: 'png',
        data,
        transformation: { width, height },
        altText: { title: nombre, description: nombre, name: nombre },
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: 'C8102E' })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text, bold: true, color: '1F2937' })],
  });
}

function p(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function tip(text) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: 'C8102E', space: 8 },
    },
    children: [
      new TextRun({ text: 'Nota: ', bold: true, size: 20, color: 'C8102E' }),
      new TextRun({ text, size: 20, italics: true }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'pasos', level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function cap(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 18, italics: true, color: '6B7280' })],
  });
}

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 120 },
    children: [
      new TextRun({
        text: 'ARNALD DATA FLOW',
        bold: true,
        size: 28,
        color: 'C8102E',
        allCaps: true,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: 'Manual de uso',
        size: 40,
        bold: true,
        color: '111827',
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: 'Bandeja control de horas — Zurich',
        size: 32,
        bold: true,
        color: '374151',
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: 'Zona / lotes · Envíos notificados · Descarga Excel',
        size: 22,
        color: '6B7280',
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: `Fecha: ${new Date().toLocaleDateString('es-CO')}  ·  Grupo Proser`,
        size: 18,
        color: '9CA3AF',
      }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] }),

  h1('1. ¿Para qué sirve esta zona?'),
  p(
    'La Bandeja control de horas de Zurich permite marcar casos para facturar, agruparlos en carpetas (lotes), cerrarlos como Facturado y descargar Excel para control interno o envío a gerencia.'
  ),
  p('Flujo resumido:'),
  bullet('En el Reporte listado Zurich, marcar el caso con el botón Facturar.'),
  bullet('El caso aparece en la bandeja como caso suelto (Por facturar).'),
  bullet('Seleccionar varios casos sueltos y Crear lote (carpeta).'),
  bullet('Descargar Excel de la zona o del lote.'),
  bullet('Al cerrar el lote (Cerrar / Facturado) se descarga también el Excel del lote.'),

  h1('2. Cómo entrar'),
  bullet('Inicie sesión en ARNALD Data Flow.'),
  bullet('En el menú izquierdo abra ZURICH.'),
  bullet('Pulse Bandeja control de horas.'),
  tip('También puede abrir la bandeja desde el botón Reporte listado dentro de la misma pantalla.'),
];

const real = imgReal('m00-bandeja-real.png', 540, 300);
if (real) {
  children.push(real);
  children.push(cap('Vista real de la bandeja (Zona / lotes y Descargar Excel arriba).'));
}

children.push(
  h1('3. Pantalla principal: Zona / lotes'),
  p(
    'Al entrar verá el título «Bandeja control de horas», los botones Zona / lotes, Envíos notificados, Descargar Excel y Reporte listado.'
  )
);

const i1 = img('m01-bandeja-excel.png', 500, 460);
if (i1) {
  children.push(i1);
  children.push(cap('Lámina 1 — Botones resaltados: Zona / lotes y Descargar Excel.'));
}

children.push(
  h2('Botones superiores'),
  bullet('Zona / lotes: casos por facturar y carpetas/lotes (vista principal).'),
  bullet('Envíos notificados: histórico de correos de control de horas / gerencia.'),
  bullet('Descargar Excel: genera el archivo .xlsx de lo que está en pantalla (casos sueltos + lotes + detalle).'),
  bullet('Reporte listado: vuelve al listado de casos Zurich para marcar Facturar.'),

  h2('Casos sueltos (Por facturar)'),
  p(
    'Aquí aparecen los casos que alguien marcó Facturar en el listado. Marque el checkbox de varios, ponga un nombre de lote (opcional) y pulse Crear lote.'
  )
);

const i2 = img('m02-casos-sueltos.png', 500, 460);
if (i2) {
  children.push(i2);
  children.push(cap('Lámina 2 — Casos sueltos con checkboxes y botón Crear lote.'));
}

children.push(
  tip(
    'Si la tabla dice «No hay casos sueltos», aún no hay casos marcados Facturar. Use el paso 4.'
  ),

  h2('Carpetas / lotes'),
  p(
    'Cada lote agrupa casos. Acciones: Ver casos, Excel (descarga solo ese lote), Cerrar / Facturado (marca el lote y descarga Excel).'
  )
);

const i3 = img('m03-lote-excel.png', 500, 460);
if (i3) {
  children.push(i3);
  children.push(cap('Lámina 3 — Acciones del lote: Excel y Cerrar / Facturado.'));
}

children.push(
  h1('4. Marcar un caso para facturar (desde el listado)'),
  bullet('Vaya a ZURICH → Reporte listado (o use el botón Reporte listado de la bandeja).'),
  bullet('Busque el caso por ZC, STRO, asegurado, etc.'),
  bullet('En la columna FACTURAR pulse el botón rojo Facturar.'),
  bullet('El caso quedará listo para verse en la bandeja como caso suelto.')
);

const i4 = img('m04-facturar.png', 500, 268);
if (i4) {
  children.push(i4);
  children.push(cap('Lámina 4 — Botón rojo Facturar en el Reporte listado Zurich.'));
}

children.push(
  tip(
    'También puede abrir el caso (Acciones / Gestionar) y usar la pestaña de Facturación del caso para marcar Facturar.'
  ),

  h1('5. Crear un lote y descargar Excel'),
  bullet('En Bandeja → Zona / lotes, marque los checkboxes de los casos sueltos deseados.'),
  bullet('Opcional: escriba un nombre de lote (ej. «Lote marzo Zurich»).'),
  bullet('Pulse Crear lote.'),
  bullet('Para descargar todo: Descargar Excel (arriba).'),
  bullet('Para un solo lote: en la fila del lote pulse Excel.'),
  tip(
    'El Excel de zona incluye 3 hojas: Casos sueltos, Lotes y Detalle lotes. El Excel de un lote trae solo los casos de esa carpeta.'
  ),

  h1('6. Cerrar lote / Facturado'),
  bullet('En un lote abierto pulse Cerrar / Facturado.'),
  bullet('Puede indicar el número de factura (opcional) y confirmar.'),
  bullet('Los casos del lote quedan en estado de facturación Facturado.'),
  bullet('Automáticamente se descarga el Excel del lote cerrado.'),

  h1('7. Envíos notificados'),
  p(
    'Esta pestaña muestra el histórico de notificaciones de control de horas o gerencia (quién recibió el correo). Puede filtrar por jefe/gerente, tipo de envío y fechas, y usar Descargar Excel para exportar ese histórico.'
  )
);

const iEnv = imgReal('03-envios-notificados.png', 540, 280);
if (iEnv) {
  children.push(iEnv);
  children.push(cap('Pestaña Envíos notificados.'));
}

children.push(
  h1('8. Preguntas frecuentes'),
  h2('No veo casos sueltos'),
  p(
    'Primero marque Facturar en el Reporte listado Zurich. Sin ese paso la bandeja permanece vacía.'
  ),
  h2('El botón Descargar Excel no genera archivo'),
  p(
    'Si no hay casos ni lotes, el sistema avisa que no hay datos para exportar. Cree o marque casos primero.'
  ),
  h2('¿Puedo quitar un caso de un lote?'),
  p(
    'Sí, abra Ver casos en el lote y use Quitar (solo si el lote sigue abierto).'
  ),
  h2('¿Quién puede usar esta zona?'),
  p(
    'Usuarios con permiso de bandeja / facturación Zurich (líderes y perfiles autorizados). Si no tiene acceso, contacte a administración ARNALD.'
  ),

  h1('9. Contacto interno'),
  p(
    'Para soporte técnico de la plataforma use Tickets / Soporte dentro de ARNALD Data Flow.'
  )
);

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [{ id: 'Normal', run: { font: 'Calibri', size: 22 } }],
      },
    },
  },
  numbering: {
    config: [
      {
        reference: 'pasos',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 420, hanging: 240 } } },
          },
        ],
      },
    ],
  },
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
            new Paragraph({
              children: [
                new TextRun({
                  text: 'ARNALD · Manual Bandeja control de horas Zurich',
                  size: 16,
                  color: '9CA3AF',
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Página ', size: 16, color: '9CA3AF' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9CA3AF' }),
                new TextRun({ text: ' de ', size: 16, color: '9CA3AF' }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 16,
                  color: '9CA3AF',
                }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log('OK ->', outPath);
