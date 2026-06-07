import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  Table,
  TableRow,
  TableCell,
  PageBreak,
} from "docx";
import { saveAs } from "file-saver";

/**
 * Función para generar el manual de uso del formulario de puertos en formato Word
 */
export const generarManualPuertos = async () => {
const docContent = [];

  // Título principal
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "MANUAL DE USO",
          bold: true,
          size: 48,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "FORMULARIO DE INSPECCIÓN DE PUERTOS",
          bold: true,
          size: 36,
          font: "Calibri",
          color: "000000"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    })
  );

  // Introducción
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "INTRODUCCIÓN",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Este manual proporciona instrucciones detalladas sobre cómo utilizar el formulario de inspección de puertos. El sistema permite crear informes completos de inspección para vehículos transportados en motonaves, incluyendo documentación fotográfica, análisis de riesgos y recomendaciones.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      alignment: AlignmentType.JUSTIFIED
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "IMPORTANTE: Este documento incluye marcadores específicos donde deben ir los screenshots de cada sección del formulario. Por favor, inserte las capturas de pantalla en los lugares indicados.",
          size: 24,
          bold: true,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.JUSTIFIED
    })
  );

  // Sección 1: Acceso al Formulario
  docContent.push(
    new Paragraph({
      children: [],
      pageBreakBefore: true
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. ACCESO AL FORMULARIO",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Para acceder al formulario de inspección de puertos:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Inicie sesión en el sistema.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Navegue al menú principal y seleccione 'Formularios de Inspección' o 'Puertos'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Haga clic en 'Nuevo Formulario' o 'Crear Inspección de Puertos'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 1: Captura de pantalla del acceso al formulario",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Menú principal mostrando la opción de Puertos o Formularios de Inspección]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 2: Sección Inicial (Carta de Presentación)
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "2. SECCIÓN INICIAL - CARTA DE PRESENTACIÓN",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "La primera sección del formulario permite configurar la información básica que aparecerá en la carta de presentación del informe.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2.1 Campos de Información General",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    })
  );

  // Tabla de campos
  const camposGenerales = [
    { campo: "Ciudad del Reporte", descripcion: "Seleccione la ciudad donde se realiza la inspección. Use el selector desplegable con búsqueda." },
    { campo: "Cliente", descripcion: "Seleccione el cliente de la lista desplegable. Se autocompletarán los datos de contacto." },
    { campo: "Nombre del Contacto", descripcion: "Se completa automáticamente al seleccionar el cliente. Se puede modificar manualmente." },
    { campo: "Cargo del Contacto", descripcion: "Se completa automáticamente al seleccionar el cliente. Se puede modificar manualmente." },
    { campo: "Empresa Cliente", descripcion: "Se completa automáticamente al seleccionar el cliente. Se puede modificar manualmente." },
    { campo: "Email del Contacto", descripcion: "Se completa automáticamente al seleccionar el cliente. Se puede modificar manualmente." },
    { campo: "Ciudad del Contacto", descripcion: "Se completa automáticamente al seleccionar el cliente. Se puede modificar manualmente." },
    { campo: "Fechas de Inspección", descripcion: "Ingrese las fechas en que se realizó la inspección (ej: '28 y 29 de octubre de 2025')." },
    { campo: "Nombre de la Motonave", descripcion: "Ingrese el nombre completo de la motonave donde se transportaron los vehículos." },
    { campo: "Fecha de Arribo", descripcion: "Seleccione la fecha en que la motonave arribó al puerto." },
    { campo: "Número de Vehículos", descripcion: "Ingrese la cantidad total de vehículos inspeccionados." },
    { campo: "Puerto de Descargue", descripcion: "Se completa automáticamente con la ciudad seleccionada. Se puede modificar." }
  ];

  docContent.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Campo",
                      bold: true,
                      size: 22,
                      font: "Calibri",
                      color: "000000"
                    })
                  ]
                })
              ],
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Descripción",
                      bold: true,
                      size: 22,
                      font: "Calibri",
                      color: "000000"
                    })
                  ]
                })
              ],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        ...camposGenerales.map(campo => 
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: campo.campo,
                        size: 22,
                        font: "Calibri",
                        color: "000000"
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: campo.descripcion,
                        size: 22,
                        font: "Calibri",
                        color: "000000"
                      })
                    ]
                  })
                ]
              })
            ]
          })
        )
      ]
    })
  );

  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 2: Captura de pantalla de la Sección Inicial",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista completa de la sección inicial con todos los campos visibles]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Mapa de Geolocalización
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "2.2 Mapa de Geolocalización",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "El mapa de geolocalización permite marcar la ubicación exacta del puerto o lugar de inspección:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Busque la ubicación en el mapa usando la barra de búsqueda o arrastrando el marcador.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. El sistema capturará automáticamente las coordenadas y una imagen del mapa.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Esta imagen aparecerá en la portada del documento Word generado, en la sección 'GEOLOCALIZACIÓN'.",
          size: 24,
          bold: true,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 3: Captura de pantalla del Mapa de Geolocalización",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista del mapa con marcador de ubicación visible]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 3: Documentos del Transporte
  docContent.push(
    new Paragraph({
      children: [],
      pageBreakBefore: true
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. DOCUMENTOS DEL TRANSPORTE",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Esta sección permite documentar toda la información relacionada con el transporte de los vehículos.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3.1 Información Básica del Transporte",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Complete los siguientes campos con la información del transporte:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• BILL OF LADING: Número del documento de embarque (ej: AR2509378-9380-9382...).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• CANTIDAD DE VEHÍCULOS: Número total de vehículos transportados.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• TIPO DE MERCANCÍA: Descripción del tipo de mercancía (ej: VEHÍCULOS TOYOTA).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• TIPO DE EMBARQUE: Tipo de embarque (FCL, LCL, RO-RO, etc.).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• ORIGEN DE LA IMPORTACIÓN: País de origen (ej: ARGENTINA).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• PUERTO DE EMBARQUE: Puerto desde donde se embarcó (ej: ZARATE).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• PUERTO DE DESCARGUE: Puerto donde se descargó (se completa automáticamente).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• MOTONAVE: Nombre de la motonave (se completa automáticamente desde la portada).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• FECHA DE LLEGADA: Fecha en que la motonave arribó al puerto.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    })
  );

  // Tabla ORIGEN
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "3.2 Tabla ORIGEN",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "La tabla ORIGEN permite registrar información detallada por cada Bill of Lading:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Haga clic en 'Agregar Fila' para crear una nueva entrada.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Complete los campos: B/L No., Puerto Origen (se completa automáticamente), Cantidad, Tipo Vehículo y Peso KGS.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. El sistema calculará automáticamente los totales en la última fila.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 4: Captura de pantalla de la Tabla ORIGEN",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista de la tabla ORIGEN con al menos una fila de datos completa]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Inspección a Bordo
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "3.3 Inspección a Bordo del Buque",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "En esta sección se registran las fotografías tomadas durante la inspección a bordo del buque:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Haga clic en el botón 'Agregar Fotografías'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Seleccione una o múltiples imágenes desde su dispositivo.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Para cada foto, agregue una descripción en el campo de texto debajo de la imagen.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4. Puede hacer clic en cualquier imagen para ampliarla y verla en tamaño completo.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "5. Agregue comentarios generales sobre la inspección en el área de texto al final de la sección.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "IMPORTANTE: Estas fotos aparecerán en el documento Word en la sección 'INSPECCIÓN A BORDO DEL BUQUE' de la página 2, organizadas en un grid de 2x2 con sus descripciones debajo.",
          size: 24,
          bold: true,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 5: Captura de pantalla de Inspección a Bordo con fotos",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista de la sección de Inspección a Bordo con al menos 2-3 fotos cargadas y sus descripciones]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Inspección en Descargue
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "3.4 Inspección en Aproche - Descargue",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Similar a la sección anterior, aquí se registran las fotografías del proceso de descargue:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Haga clic en 'Agregar Fotografías del Descargue'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Seleccione las imágenes del descargue.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Agregue descripciones para cada foto.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4. Agregue comentarios generales sobre el proceso de descargue.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "IMPORTANTE: Estas fotos aparecerán en el documento Word en la sección 'INSPECCIÓN EN APROCHE - DESCARGUE' de la página 2, también en grid de 2x2.",
          size: 24,
          bold: true,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 6: Captura de pantalla de Inspección en Descargue",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista de la sección de Inspección en Descargue con fotos cargadas]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 4: Análisis de Riesgos
  docContent.push(
    new Paragraph({
      children: [],
      pageBreakBefore: true
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4. ANÁLISIS DE RIESGOS",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "NOTA: Esta sección solo aparece en el 'Informe Completo'. Para verla, debe seleccionar 'Informe Completo' en el selector de tipo de informe ubicado en la parte superior del formulario.",
          size: 24,
          bold: true,
          font: "Calibri",
          color: "FF0000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "El análisis de riesgos permite documentar los riesgos identificados durante la inspección y crear una matriz de calor.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4.1 Tabla de Análisis Libre",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Esta tabla permite registrar riesgos y su análisis detallado:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Agregue filas usando el botón 'Agregar Fila'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. En la columna 'RIESGO' escriba el nombre del riesgo identificado.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. En la columna 'ANÁLISIS' describa el análisis detallado del riesgo.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4.2 Tabla de Clasificación de Riesgos",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Esta tabla calcula automáticamente la clasificación del riesgo basándose en probabilidad y severidad:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Agregue filas para cada riesgo que desee clasificar.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Complete los campos: RIESGO, PROBABILIDAD (1-5), SEVERIDAD (1-5).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. El sistema calculará automáticamente: R = Probabilidad × Severidad, Índice de Vulnerabilidad % y la Clasificación (Bajo/Medio/Alto/Extremo).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4.3 Matriz de Calor de Riesgos",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "La matriz de calor se genera automáticamente en el documento Word basándose en los datos de la tabla de clasificación. Cada celda muestra el valor R, el porcentaje de vulnerabilidad y el nombre del riesgo (si aplica).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 7: Captura de pantalla del Análisis de Riesgos",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista completa de la sección de Análisis de Riesgos con ambas tablas llenas]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 5: Informe Fotográfico por VIN
  docContent.push(
    new Paragraph({
      children: [],
      pageBreakBefore: true
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "5. INFORME FOTOGRÁFICO POR VIN",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Esta sección permite organizar las fotografías por número de VIN (Vehicle Identification Number) de cada vehículo inspeccionado.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "5.1 Agregar un Registro por VIN",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Para crear un nuevo registro fotográfico:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Haga clic en el botón 'Agregar VIN' en la parte superior de la sección.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Complete el campo 'VIN del Vehículo' con el número de identificación del vehículo (ej: 8AJCA3GS1T0985771).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Opcionalmente, complete el campo 'Daños Registrados' con una descripción de los daños encontrados (ej: parachoque D desconche).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "5.2 Agregar Fotos al Registro",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Para cada registro de VIN:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Haga clic en 'Agregar Fotos' dentro del registro del VIN.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Seleccione una o múltiples imágenes desde su dispositivo.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Para cada foto, agregue una descripción detallada en el campo de texto debajo de la imagen.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4. Puede hacer clic en cualquier imagen para ampliarla.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "5. Use el botón 'Eliminar' para quitar fotos que no desee incluir.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "IMPORTANTE: Las fotos organizadas por VIN aparecerán en el documento Word en la sección 'INFORME FOTOGRÁFICO', agrupadas por VIN con sus descripciones. Cada grupo de fotos se muestra en un grid de 3 columnas.",
          size: 24,
          bold: true,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 8: Captura de pantalla del Informe Fotográfico por VIN",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista de la sección de Informe Fotográfico con al menos 2 registros de VIN diferentes, cada uno con varias fotos y descripciones]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 6: Recomendaciones
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "6. RECOMENDACIONES",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "En esta sección puede agregar recomendaciones que aparecerán al final del informe:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Haga clic en 'Agregar Recomendación' para crear una nueva entrada.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Escriba el texto de la recomendación en el campo de texto.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Puede agregar múltiples recomendaciones usando el botón correspondiente.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4. Use el botón de eliminar (🗑️) para quitar recomendaciones que no desee incluir.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 9: Captura de pantalla de Recomendaciones",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista de la sección de Recomendaciones con al menos 2-3 recomendaciones agregadas]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 7: Firma
  docContent.push(
    new Paragraph({
      children: [],
      pageBreakBefore: true
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "7. FIRMA DEL INSPECTOR",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "En esta sección debe ingresar la información del firmante y su firma digital:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Complete el campo 'Nombre del Firmante' con su nombre completo.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Complete el campo 'Cargo' con su cargo o posición.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Ingrese su 'Email' y 'Celular' de contacto.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4. Para agregar la firma, haga clic en el área de firma y dibuje su firma usando el mouse o el dedo (en dispositivos táctiles).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "5. Use el botón 'Limpiar' para borrar y volver a dibujar la firma si es necesario.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "IMPORTANTE: La firma aparecerá al final del documento Word, junto con los datos del firmante, después del texto 'Cordialmente,'.",
          size: 24,
          bold: true,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 10: Captura de pantalla de la Sección de Firma",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista de la sección de Firma con todos los campos completos y una firma dibujada en el área de firma]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 8: Guardar y Generar Documento
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "8. GUARDAR Y GENERAR DOCUMENTO WORD",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Una vez completado el formulario, tiene tres opciones en los botones al final:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "8.1 Guardar en Historial",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Este botón guarda el formulario en el historial sin generar el documento Word. Útil para guardar el progreso y continuar más tarde.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "8.2 Generar Word",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Este botón genera el documento Word con el tipo de informe seleccionado:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Informe Diario: Incluye toda la información excepto la Matriz de Calor de Riesgos.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Informe Completo: Incluye toda la información, incluyendo la Matriz de Calor de Riesgos.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "8.3 Exportar y Guardar",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Este botón realiza ambas acciones: genera el documento Word y lo guarda en el historial con estado 'completado'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 11: Captura de pantalla de los Botones de Acción",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista de los tres botones al final del formulario: 'Guardar en Historial', 'Generar Word' y 'Exportar y Guardar']",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 9: Ubicación de Fotos en el Documento Word
  docContent.push(
    new Paragraph({
      children: [],
      pageBreakBefore: true
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "9. UBICACIÓN DE FOTOS EN EL DOCUMENTO WORD GENERADO",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "A continuación se detalla dónde aparecen las fotos en el documento Word generado:",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "9.1 Portada - Mapa de Geolocalización",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Ubicación: Primera página, después del párrafo introductorio, en la sección 'GEOLOCALIZACIÓN'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Descripción: Mapa capturado desde el componente de geolocalización, mostrando la ubicación del puerto.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "9.2 Página 2 - Inspección a Bordo del Buque",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Ubicación: Página 2, sección 'INSPECCIÓN A BORDO DEL BUQUE'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Formato: Grid de 2 columnas (2x2), con las descripciones debajo de cada foto.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Origen: Fotos agregadas en la sección 'Inspección a Bordo del Buque' del formulario.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "9.3 Página 2 - Inspección en Aproche - Descargue",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Ubicación: Página 2, sección 'INSPECCIÓN EN APROCHE - DESCARGUE'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Formato: Grid de 2 columnas (2x2), con las descripciones debajo de cada foto.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Origen: Fotos agregadas en la sección 'Inspección en Aproche - Descargue' del formulario.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "9.4 Informe Fotográfico por VIN",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Ubicación: Sección 'INFORME FOTOGRÁFICO' (nueva página después del Análisis de Riesgos).",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Formato: Agrupadas por VIN. Cada grupo tiene un título 'VIN Nro. [número] - [daños]' seguido de un grid de 3 columnas con fotos y descripciones.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Origen: Fotos organizadas por VIN en la sección 'Informe Fotográfico' del formulario.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "9.5 Firma del Inspector",
          bold: true,
          size: 28,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Ubicación: Al final del documento, después de la sección 'RECOMENDACIONES'.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 150 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Formato: Imagen de la firma dibujada, seguida del nombre, cargo, email y celular del firmante.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "SCREENSHOT 12: Ejemplo del Documento Word Generado (Vista Previa)",
          bold: true,
          size: 22,
          font: "Calibri",
          color: "FF0000",
          italics: true
        })
      ],
      spacing: { before: 300, after: 200 },
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "[Insertar captura de pantalla aquí: Vista previa del documento Word generado, mostrando al menos 2-3 secciones con fotos visibles]",
          size: 22,
          font: "Calibri",
          color: "666666",
          italics: true
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      shading: {
        fill: "FFFF00"
      }
    })
  );

  // Sección 10: Consejos y Recomendaciones
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "10. CONSEJOS Y RECOMENDACIONES",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Guarde el formulario regularmente usando 'Guardar en Historial' para no perder información.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Agregue descripciones detalladas a todas las fotos para mejorar la documentación del informe.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Verifique que todas las fotos estén cargadas correctamente antes de generar el documento Word.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Use el selector de 'Tipo de Informe' para elegir entre Informe Diario o Completo según sus necesidades.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Organice las fotos por VIN para facilitar la identificación de cada vehículo en el informe final.",
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { after: 400 },
      indent: { left: 400 }
    })
  );

  // Generar el documento
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: docContent,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const nombreArchivo = `Manual_Formulario_Puertos_${new Date().getTime()}.docx`;
    saveAs(blob, nombreArchivo);
return { success: true, nombreArchivo };
  } catch (error) {
    console.error('❌ Error al generar manual:', error);
    throw error;
  }
};














