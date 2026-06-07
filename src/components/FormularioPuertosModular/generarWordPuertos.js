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
  ImageRun,
  PageBreak,
  Header,
  VerticalAlign,
  ShadingType
} from "docx";
import { saveAs } from "file-saver";
import Logo from '../../img/Logo.png';

/**
 * Función auxiliar para generar párrafos de sección
 */
const seccion = (titulo, color = "000000") =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text: titulo,
        bold: true,
        font: "Calibri",
        size: 28,
        color: color
      }),
    ],
  });

/**
 * Función auxiliar para subsecciones
 */
const subseccion = (titulo) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 300, after: 150 },
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text: titulo,
        bold: true,
        font: "Calibri",
        size: 26,
        color: "000000"
      }),
    ],
  });

/**
 * Función auxiliar para generar líneas de texto
 */
const linea = (texto, bold = false, color = null) =>
  new Paragraph({
    children: [
      new TextRun({
        text: (texto || "").replace(/\s+/g, " "), // Normalizar espacios múltiples
        bold,
        font: "Calibri",
        size: 24,
        color: color || "000000"
      }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 100 },
  });

/**
 * Función auxiliar para celdas de encabezado
 */
const encabezadoTabla = (texto, opciones = {}) =>
  new TableCell({
    // Sin shading (sin fondo) - transparente
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text: texto, bold: true, size: 24, font: "Calibri", color: "000000" })],
        alignment: opciones.alignment || AlignmentType.LEFT,
      }),
    ],
    ...opciones
  });

/**
 * Función auxiliar para celdas de texto
 */
const celdaTexto = (texto, bold = false, opciones = {}) =>
  new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ 
          text: String(texto || "").replace(/\s+/g, " "), // Normalizar espacios múltiples
          bold, 
          size: 24, 
          font: "Calibri",
          color: "000000"
        })],
        alignment: opciones.alignment || AlignmentType.LEFT,
      }),
    ],
    ...opciones
  });

/**
 * Función auxiliar para filas dobles (título 25%, valor 75%)
 */
const filaDoble = (titulo, valor) =>
  new TableRow({
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: titulo, bold: true, size: 24, font: "Calibri", color: "000000" })] })],
      }),
      new TableCell({
        width: { size: 75, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: String(valor || "").replace(/\s+/g, " "), size: 24, font: "Calibri", color: "000000" })] })],
      }),
    ],
  });

/**
 * Función para obtener el color de fondo según el valor R
 */
const getCellColor = (r) => {
  if (r >= 13) {
    return "FF0000"; // rojo - Extremo
  } else if (r >= 9) {
    return "FFA500"; // naranja - Alto
  } else if (r >= 5) {
    return "FFFF00"; // amarillo - Medio
  } else {
    return "92D050"; // verde claro - Bajo
  }
};

/**
 * Función para crear celdas de la matriz de calor
 * Con colores de fondo y texto negro siempre
 */
const celdaMatrizRiesgo = (R, porcentaje, textoRiesgo) => {
  const colorFondo = getCellColor(R);
  
  return new TableCell({
    shading: {
      fill: colorFondo,
    },
    borders: {
      top: { color: "000000", size: 2 },
      bottom: { color: "000000", size: 2 },
      left: { color: "000000", size: 2 },
      right: { color: "000000", size: 2 },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `${R}`,
            bold: true,
            color: "000000", // texto negro siempre
            size: 20,
            font: "Calibri",
          }),
          new TextRun({
            text: ` (${porcentaje}%)`,
            color: "000000", // texto negro siempre
            size: 18,
            font: "Calibri",
            break: 1,
          }),
          textoRiesgo ? new TextRun({
            text: textoRiesgo.replace(/\s+/g, " "),
            color: "000000", // texto negro siempre
            size: 16,
            font: "Calibri",
            break: 1,
          }) : undefined,
        ].filter(Boolean),
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
      }),
    ],
    verticalAlign: VerticalAlign.CENTER,
  });
};

/**
 * Convierte imagen importada a base64
 */
const convertirImagenImportadaABase64 = async (imagePath) => {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error convirtiendo imagen a base64:', error);
    return null;
  }
};

/**
 * Convierte imagen a buffer para Word
 */
const convertirImagenABuffer = async (imagen) => {
  try {
    // Si es un File object
    if (imagen.file && typeof imagen.file.arrayBuffer === "function") {
      return await imagen.file.arrayBuffer();
    }
    // Si tiene base64
    if (imagen.base64) {
      const base64Data = imagen.base64.split(',')[1] || imagen.base64;
      return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    }
    // Si tiene preview como base64
    if (imagen.preview && typeof imagen.preview === 'string' && imagen.preview.startsWith('data:image')) {
      const base64Data = imagen.preview.split(',')[1];
      return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    }
    // Si tiene src en base64
    if (imagen.src && imagen.src.startsWith('data:image')) {
      const base64Data = imagen.src.split(',')[1];
      return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    }
    // Si es URL del servidor
    if (imagen.ruta || (imagen.src && (imagen.src.startsWith('http://') || imagen.src.startsWith('https://')))) {
      const url = imagen.ruta || imagen.src;
      const imagenUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      const response = await fetch(imagenUrl);
      if (response.ok) {
        return await response.arrayBuffer();
      }
    }
    return null;
  } catch (error) {
    console.error('Error convirtiendo imagen a buffer:', error);
    return null;
  }
};

/**
 * Función principal para generar el documento Word
 * @param {Object} formData - Todos los datos del formulario
 * @returns {Promise<void>}
 */
export const generarWordPuertos = async (formData, incluirMapaCalor = true) => {
const docContent = [];

  // Convertir logo a base64
  let logoBase64 = null;
  try {
    logoBase64 = await convertirImagenImportadaABase64(Logo);
} catch (error) {
    console.error('❌ Error convirtiendo logo:', error);
  }

  // Formatear fecha (asegurar formato DD/MM/YYYY correcto)
  let fechaFormateada = '';
  if (formData.fecha) {
    try {
      const fecha = new Date(formData.fecha + 'T00:00:00');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const año = fecha.getFullYear();
      fechaFormateada = `${dia}/${mes}/${año}`;
    } catch (error) {
      // Si hay error, usar fecha actual
      const hoy = new Date();
      const dia = String(hoy.getDate()).padStart(2, '0');
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const año = hoy.getFullYear();
      fechaFormateada = `${dia}/${mes}/${año}`;
    }
  } else {
    // Si no hay fecha, usar fecha actual
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const año = hoy.getFullYear();
    fechaFormateada = `${dia}/${mes}/${año}`;
  }

  // Obtener año vigente
  const anoVigente = formData.fecha 
    ? new Date(formData.fecha + 'T00:00:00').getFullYear()
    : new Date().getFullYear();

  // ========== HEADER (ENCABEZADO) ==========
  const headerTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      // Fila 1: Logo y título principal
      new TableRow({
        children: [
          // Columna izquierda: Solo logo en recuadro blanco
          new TableCell({
            width: {
              size: 50,
              type: WidthType.PERCENTAGE,
            },
            children: logoBase64 ? [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: logoBase64.replace('data:image/png;base64,', ''),
                    transformation: {
                      width: 220,  // 5.81 cm ≈ 220 píxeles
                      height: 83   // 2.2 cm ≈ 83 píxeles
                    }
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 }
              })
            ] : [],
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            verticalAlign: "center",
            shading: {
              fill: "FFFFFF" // Fondo blanco para el recuadro
            }
          }),
          
          // Columna derecha: Información del reporte
          new TableCell({
            width: {
              size: 50,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "INFORME DE INSPECCIÓN",
                    font: 'Arial',
                    size: 24,
                    bold: true,
                    color: "000000"
                  })
                ],
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: (formData.nombreMotonave || 'NOMBRE DE BUQUE').toUpperCase(),
                    font: 'Arial',
                    size: 18,
                    bold: true,
                    color: "000000"
                  })
                ],
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 }
              }),
              // Tabla para puertos, ubicación y fecha
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `PUERTOS: ${formData.codigoReferencia || formData.codigoCPD || `CPD-${anoVigente}-XXX`}`,
                                font: 'Arial',
                                size: 14,
                                color: "000000"
                              })
                            ],
                            alignment: AlignmentType.LEFT
                          })
                        ],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: (() => {
                                  let texto = formData.nombreEmpresa || formData.puertoDescargue || formData.municipio || "";
                                  // Capitalizar primera letra de cada palabra
                                  if (texto) {
                                    texto = texto.split(' ').map(palabra => {
                                      return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
                                    }).join(' ');
                                    // Asegurar que "Bahía" tenga tilde
                                    texto = texto.replace(/Bahia/gi, 'Bahía');
                                  }
                                  return texto;
                                })(),
                                font: 'Arial',
                                size: 14,
                                color: "000000"
                              })
                            ],
                            alignment: AlignmentType.LEFT
                          })
                        ],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `FECHA: ${fechaFormateada}`,
                                font: 'Arial',
                                size: 14,
                                color: "000000"
                              })
                            ],
                            alignment: AlignmentType.LEFT
                          })
                        ],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                      })
                    ]
                  })
                ]
              })
            ],
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            shading: {
              fill: "FFFFFF" // Fondo blanco para el recuadro
            }
          })
        ]
      })
    ]
  });

  // ========== PRIMERA PÁGINA - CARTA DE PRESENTACIÓN ==========
  // 1. Ciudad + Fecha + Código de Referencia
  const ciudad = formData.municipio || "Cartagena de Indias";
  const fechaTexto = formData.fecha 
    ? new Date(formData.fecha + 'T00:00:00').toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : new Date().toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

  // Primera línea: Ciudad + Fecha
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${ciudad}, ${fechaTexto}`,
          size: 24,
          font: "Calibri",
          color: "000000"
        })
      ],
      spacing: { before: 100, after: 50 },
    })
  );

  // Segunda línea: Código CPD
  if (formData.codigoReferencia) {
    docContent.push(
      new Paragraph({
        children: [
          new TextRun({
            text: formData.codigoReferencia,
            size: 24,
            font: "Calibri",
            color: "000000"
          })
        ],
        spacing: { before: 0, after: 200 },
      })
    );
  }

  // 2. Datos del Contacto del Cliente
  if (formData.nombreContacto || formData.empresaCliente) {
    // Nombre del contacto (en negrilla) - Ya incluye Sr. en los datos
    if (formData.nombreContacto) {
      docContent.push(
        new Paragraph({
          children: [new TextRun({ text: formData.nombreContacto, size: 24, bold: true, font: "Calibri", color: "000000" })],
          spacing: { after: 0 },
        })
      );
    }

    // Cargo (sin negrilla)
    if (formData.cargoContacto) {
      docContent.push(
        new Paragraph({
          children: [new TextRun({ text: formData.cargoContacto, size: 24, font: "Calibri", color: "000000" })],
          spacing: { after: 0 },
        })
      );
    }

    // Empresa (en negrilla y mayúsculas)
    if (formData.empresaCliente) {
      docContent.push(
        new Paragraph({
          children: [new TextRun({ text: formData.empresaCliente.toUpperCase(), size: 24, bold: true, font: "Calibri", color: "000000" })],
          spacing: { after: 0 },
        })
      );
    }

    // Email (en azul)
    if (formData.emailContacto) {
      docContent.push(
        new Paragraph({
          children: [new TextRun({ text: formData.emailContacto, size: 24, color: "000000", font: "Calibri" })],
          spacing: { after: 0 },
        })
      );
    }

    // Ciudad
    if (formData.ciudadContacto) {
      docContent.push(
        new Paragraph({
          children: [new TextRun({ text: formData.ciudadContacto, size: 24, font: "Calibri", color: "000000" })],
          spacing: { after: 200 },
        })
      );
    }
  }

  // 3. Título del Informe en Rojo y Negrilla
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `INFORME INSPECCIÓN ASEGURADO: ${formData.empresaCliente || formData.nombreCliente || "CLIENTE"}`,
          size: 24,
          bold: true,
          color: "000000",
          font: "Calibri",
        }),
      ],
      spacing: { before: 50, after: 150 },
    })
  );

  // 4. Párrafo explicativo
  // Formatear fecha de arribo si existe
  let fechaArriboTexto = '';
  if (formData.fechaArriboMotonave) {
    try {
      const fechaArribo = new Date(formData.fechaArriboMotonave + 'T00:00:00');
      const dia = fechaArribo.getDate();
      const mes = fechaArribo.toLocaleDateString("es-CO", { month: "long" });
      const año = fechaArribo.getFullYear();
      fechaArriboTexto = `${dia} de ${mes}`;
    } catch (error) {
      fechaArriboTexto = formData.fechaArriboMotonave;
    }
  }

  const textoPárrafo = [
    new TextRun({ 
      text: "De acuerdo con la asignación recibida, me permito remitir el informe de inspección correspondiente a las revisiones efectuadas ", 
      size: 24, 
      font: "Calibri",
      color: "000000"
    }),
    new TextRun({ 
      text: formData.fechasInspeccion ? `los días ${formData.fechasInspeccion}` : "los días (Fechas de inspección)", 
      size: 24, 
      font: "Calibri",
      color: "000000"
    }),
    new TextRun({ 
      text: " a la motonave ", 
      size: 24, 
      font: "Calibri",
      color: "000000"
    }),
    new TextRun({ 
      text: formData.nombreMotonave ? formData.nombreMotonave : "(Nombre de la motonave)", 
      size: 24, 
      bold: true,
      font: "Calibri",
      color: "000000"
    })
  ];

  // Agregar fecha de arribo si existe
  if (fechaArriboTexto) {
    textoPárrafo.push(
      new TextRun({ 
        text: `, arribada el ${fechaArriboTexto}`, 
        size: 24, 
        font: "Calibri",
        color: "000000"
      })
    );
  }

  // Agregar número de vehículos si existe
  if (formData.numeroVehiculos) {
    textoPárrafo.push(
      new TextRun({ 
        text: ` con un total de ${formData.numeroVehiculos} vehículos`, 
        size: 24, 
        font: "Calibri",
        color: "000000"
      })
    );
  }

  // Agregar puerto de descargue (capitalizar correctamente)
  let puerto = formData.puertoDescargue || 'Puerto Bahía';
  // Capitalizar primera letra de cada palabra
  if (puerto) {
    puerto = puerto.split(' ').map(palabra => {
      return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
    }).join(' ');
    // Asegurar que "Bahía" tenga tilde
    puerto = puerto.replace(/Bahia/gi, 'Bahía');
  }
  textoPárrafo.push(
    new TextRun({ 
      text: `, actualmente almacenados en los patios de ${puerto}.`, 
      size: 24, 
      font: "Calibri",
      color: "000000"
    })
  );

  docContent.push(
    new Paragraph({
      children: textoPárrafo,
      spacing: { before: 0, after: 200 },
      alignment: AlignmentType.JUSTIFIED,
    })
  );

  // 5. GEOLOCALIZACIÓN con Mapa (Título en Negrilla, Rojo y Centrado)
  docContent.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "GEOLOCALIZACIÓN",
          size: 24,
          bold: true,
          color: "000000",
          font: "Calibri",
        }),
      ],
      spacing: { before: 50, after: 100 },
      alignment: AlignmentType.CENTER,
    })
  );

  // INSERTAR MAPA
  try {
    let mapaBuffer = null;
    
    if (formData.imagenMapa) {
      if (typeof formData.imagenMapa === 'string' && formData.imagenMapa.startsWith('data:image')) {
        const base64Data = formData.imagenMapa.split(',')[1];
        mapaBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
      }
    }
    
    if (mapaBuffer) {
      docContent.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: mapaBuffer,
              transformation: { width: 500, height: 300 },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        })
      );
} else {
      docContent.push(
        new Paragraph({
          children: [new TextRun({ text: "[Mapa no disponible]", size: 24, font: "Calibri", color: "000000", italics: true })],
          alignment: AlignmentType.CENTER,
        })
      );
    }
  } catch (error) {
    console.error('❌ Error insertando mapa:', error);
  }

  // ========== PÁGINA 2: DOCUMENTOS DEL TRANSPORTE ==========
  docContent.push(
    new Paragraph({ children: [], pageBreakBefore: true }),
    seccion("DOCUMENTOS DEL TRANSPORTE")
  );

  // Información básica del transporte
  docContent.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        filaDoble("BILL OF LADING", formData.billOfLading || ""),
        filaDoble("CANTIDAD DE VEHÍCULOS", formData.cantidadVehiculos || ""),
        filaDoble("TIPO DE MERCANCÍA", formData.tipoMercancia || ""),
        filaDoble("TIPO DE EMBARQUE", formData.tipoEmbarque || ""),
        filaDoble("ORIGEN DE LA IMPORTACIÓN", formData.origenImportacion || ""),
        filaDoble("PUERTO DE EMBARQUE", formData.puertoEmbarque || ""),
        filaDoble("PUERTO DE DESCARGUE", formData.puertoDescargue || formData.municipio || ""),
        filaDoble("MOTONAVE", formData.motonaveTransporte || formData.nombreMotonave || ""),
        filaDoble("FECHA DE LLEGADA", formData.fechaLlegada 
          ? new Date(formData.fechaLlegada + 'T00:00:00').toLocaleDateString("es-CO")
          : ""),
      ],
    })
  );

  // Tabla ORIGEN
  const tablaOrigen = formData.tablaOrigen || [];
  if (tablaOrigen.length > 0) {
    docContent.push(
      new Paragraph({ text: "", spacing: { after: 300 } }),
      subseccion("ORIGEN")
    );

    const filasTablaOrigen = [
      new TableRow({
        children: [
          encabezadoTabla("B/L No."),
          encabezadoTabla("PUERTO ORIGEN"),
          encabezadoTabla("CANTIDAD", { alignment: AlignmentType.CENTER }),
          encabezadoTabla("TIPO VEHÍCULO"),
          encabezadoTabla("PESO KGS", { alignment: AlignmentType.CENTER }),
        ],
      })
    ];

    // Agregar filas de datos
    tablaOrigen.forEach(fila => {
      const puertoOrigen = formData.origenImportacion && formData.puertoEmbarque
        ? `${formData.origenImportacion} - ${formData.puertoEmbarque}`
        : fila.puertoOrigen || "";
      
      filasTablaOrigen.push(
        new TableRow({
          children: [
            celdaTexto(fila.billOfLading || ""),
            celdaTexto(puertoOrigen),
            celdaTexto(fila.cantidad || "", false, { alignment: AlignmentType.CENTER }),
            celdaTexto(fila.tipoVehiculo || ""),
            celdaTexto(fila.pesoKgs || "", false, { alignment: AlignmentType.CENTER }),
          ],
        })
      );
    });

    // Fila de totales
    const totalCantidad = tablaOrigen.reduce((sum, fila) => sum + (parseInt(fila.cantidad) || 0), 0);
    const totalPeso = tablaOrigen.reduce((sum, fila) => sum + (parseFloat(fila.pesoKgs) || 0), 0);

    filasTablaOrigen.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: "TOTALES:", bold: true, size: 20, font: "Calibri", color: "000000" })],
                alignment: AlignmentType.RIGHT,
              })
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(totalCantidad), bold: true, size: 20, font: "Calibri", color: "000000" })],
                alignment: AlignmentType.CENTER,
              })
            ],
          }),
          celdaTexto(""),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: totalPeso.toFixed(2), bold: true, size: 20, font: "Calibri", color: "000000" })],
                alignment: AlignmentType.CENTER,
              })
            ],
          }),
        ],
      })
    );

    docContent.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: filasTablaOrigen,
      })
    );
  }

  // ========== INSPECCIÓN A BORDO DEL BUQUE ==========
  const imagenesInspeccionBordo = formData.imagenesInspeccionBordo || [];
  if (imagenesInspeccionBordo.length > 0) {
    docContent.push(
      new Paragraph({ text: "", spacing: { after: 300 } }),
      subseccion("INSPECCIÓN A BORDO DEL BUQUE")
    );

    // Insertar imágenes en grid 2x2
    const filas = [];
    for (let i = 0; i < imagenesInspeccionBordo.length; i += 2) {
      const celdasImagen = [];
      const celdasDescripcion = [];

      for (let j = i; j < i + 2 && j < imagenesInspeccionBordo.length; j++) {
        const img = imagenesInspeccionBordo[j];
        const imgBuffer = await convertirImagenABuffer(img);
        
        if (imgBuffer) {
          celdasImagen.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imgBuffer,
                      transformation: { width: 250, height: 180 },
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
          );
          celdasDescripcion.push(
            new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: (img.descripcion || "").replace(/\s+/g, " "), size: 20, font: "Calibri", color: "000000" })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
            })
          );
        }
      }

      if (celdasImagen.length > 0) {
        filas.push(new TableRow({ children: celdasImagen }));
        filas.push(new TableRow({ children: celdasDescripcion }));
      }
    }

    if (filas.length > 0) {
      docContent.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: filas,
        })
      );
    }

    // Comentarios sobre inspección a bordo
    if (formData.comentariosInspeccionBordo) {
      docContent.push(
        new Paragraph({ text: "", spacing: { after: 200 } }),
        linea(formData.comentariosInspeccionBordo)
      );
    }
  }

  // ========== INSPECCIÓN EN APROCHE - DESCARGUE ==========
  const imagenesInspeccionDescargue = formData.imagenesInspeccionDescargue || [];
  if (imagenesInspeccionDescargue.length > 0) {
    docContent.push(
      new Paragraph({ text: "", spacing: { after: 300 } }),
      subseccion("INSPECCIÓN EN APROCHE - DESCARGUE")
    );

    // Insertar imágenes
    const filas = [];
    for (let i = 0; i < imagenesInspeccionDescargue.length; i += 2) {
      const celdasImagen = [];
      const celdasDescripcion = [];

      for (let j = i; j < i + 2 && j < imagenesInspeccionDescargue.length; j++) {
        const img = imagenesInspeccionDescargue[j];
        const imgBuffer = await convertirImagenABuffer(img);
        
        if (imgBuffer) {
          celdasImagen.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imgBuffer,
                      transformation: { width: 250, height: 180 },
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
          );
          celdasDescripcion.push(
            new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: (img.descripcion || "").replace(/\s+/g, " "), size: 20, font: "Calibri", color: "000000" })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
            })
          );
        }
      }

      if (celdasImagen.length > 0) {
        filas.push(new TableRow({ children: celdasImagen }));
        filas.push(new TableRow({ children: celdasDescripcion }));
      }
    }

    if (filas.length > 0) {
      docContent.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: filas,
        })
      );
    }

    // Comentarios sobre descargue
    if (formData.comentariosInspeccionDescargue) {
      docContent.push(
        new Paragraph({ text: "", spacing: { after: 200 } }),
        linea(formData.comentariosInspeccionDescargue)
      );
    }
  }

  // ========== INSPECCIÓN EN PATIO DE ALMACENAMIENTO ==========
  docContent.push(
    new Paragraph({ text: "", spacing: { after: 300 } }),
    subseccion("INSPECCIÓN EN PATIO DE ALMACENAMIENTO")
  );

  // Comentario introductorio
  if (formData.comentarioPatioAlmacenamiento) {
    docContent.push(
      linea(formData.comentarioPatioAlmacenamiento)
    );
  }

  // Tabla de Averías
  const tablaAverias = formData.tablaAverias || [];
  if (tablaAverias.length > 0) {
    docContent.push(
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              encabezadoTabla("VIN"),
              encabezadoTabla("AVERÍAS"),
              encabezadoTabla("CÓDIGO"),
              encabezadoTabla("DAÑO"),
            ],
          }),
          ...tablaAverias.map(fila =>
            new TableRow({
              children: [
                celdaTexto(fila.vin || ""),
                celdaTexto(fila.averias || ""),
                celdaTexto(fila.codigo || ""),
                celdaTexto(fila.dano || ""),
              ],
            })
          ),
        ],
      })
    );
  }

  // ========== ANÁLISIS DE RIESGOS ==========
  docContent.push(
    new Paragraph({ children: [], pageBreakBefore: true }),
    seccion("ANÁLISIS DE RIESGOS")
  );

  const tablaAnalisisLibre = formData.tablaAnalisisLibre || [];
  if (tablaAnalisisLibre.length > 0) {
    docContent.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              encabezadoTabla("RIESGO", { width: { size: 30, type: WidthType.PERCENTAGE } }),
              encabezadoTabla("ANÁLISIS", { width: { size: 70, type: WidthType.PERCENTAGE } }),
            ],
          }),
          ...tablaAnalisisLibre.map(fila =>
            new TableRow({
              children: [
                celdaTexto(fila.riesgo || ""),
                celdaTexto(fila.analisis || ""),
              ],
            })
          ),
        ],
      })
    );
  }

  // ========== CLASIFICACIÓN DEL RIESGO ==========
  const tablaRiesgos = formData.tablaRiesgos || [];
  if (tablaRiesgos.length > 0) {
    docContent.push(
      new Paragraph({ text: "", spacing: { after: 300 } }),
      subseccion("CLASIFICACIÓN DEL RIESGO"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              encabezadoTabla("RIESGO"),
              encabezadoTabla("PROB.", { alignment: AlignmentType.CENTER }),
              encabezadoTabla("SEVER.", { alignment: AlignmentType.CENTER }),
              encabezadoTabla("R", { alignment: AlignmentType.CENTER }),
              encabezadoTabla("ÍNDICE", { alignment: AlignmentType.CENTER }),
              encabezadoTabla("CLASIFICACIÓN", { alignment: AlignmentType.CENTER }),
            ],
          }),
          ...tablaRiesgos.map((riesgo) => {
            const p = parseInt(riesgo.probabilidad) || 0;
            const s = parseInt(riesgo.severidad) || 0;
            const r = p * s;
            const indice = Math.round((r / 25) * 100);
            const clasificacion = r <= 4 ? "Bajo" : r <= 8 ? "Medio" : r <= 12 ? "Alto" : "Extremo";
            const colorFondo = r <= 4 ? "90EE90" : r <= 8 ? "FFFF00" : r <= 12 ? "FFA500" : "FF0000";

            return new TableRow({
              children: [
                celdaTexto(riesgo.riesgo || ""),
                celdaTexto(String(p), false, { alignment: AlignmentType.CENTER }),
                celdaTexto(String(s), false, { alignment: AlignmentType.CENTER }),
                celdaTexto(String(r), true, { alignment: AlignmentType.CENTER }),
                celdaTexto(`${indice}%`, false, { alignment: AlignmentType.CENTER }),
                celdaTexto(clasificacion, true, { alignment: AlignmentType.CENTER }),
              ],
            });
          }),
        ],
      })
    );

    // ========== MATRIZ DE CALOR DE RIESGOS ==========
    // Solo incluir si se solicita (para informe completo)
    if (incluirMapaCalor) {
      docContent.push(
        new Paragraph({ text: "", spacing: { after: 300 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: "MATRIZ DE CALOR DE RIESGOS",
              bold: true,
              font: "Calibri",
              size: 28,
              color: "000000"
            })
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 300 },
          alignment: AlignmentType.LEFT,
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: 'single', size: 6, color: '000000' },
            bottom: { style: 'single', size: 6, color: '000000' },
            left: { style: 'single', size: 6, color: '000000' },
            right: { style: 'single', size: 6, color: '000000' },
            insideHorizontal: { style: 'single', size: 6, color: '000000' },
            insideVertical: { style: 'single', size: 6, color: '000000' },
          },
          rows: [
            // Encabezado de Severidad
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({ text: "" })],
                  // Sin fondo - transparente
                }), // Celda vacía para esquina
                ...["INSIGNIFICANTE (1)", "MENOR (2)", "MODERADO (3)", "MAYOR (4)", "CATASTRÓFICO (5)"].map((label) =>
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: label, bold: true, size: 18, font: "Calibri", color: "000000" })] 
                    })],
                    // Sin fondo - transparente
                  })
                ),
              ],
            }),
            // Filas de Probabilidad (Frecuente a Improbable)
            ...[5, 4, 3, 2, 1].map((pValue, rowIndex) => {
              const probLabels = ["FRECUENTE (5)", "POSIBLE (4)", "PROBABLE (3)", "BAJA (2)", "IMPROBABLE (1)"];

              return new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: probLabels[rowIndex], bold: true, size: 18, font: "Calibri", color: "000000" })] 
                    })],
                    // Sin fondo - transparente
                  }),
                  ...[1, 2, 3, 4, 5].map((sValue) => {
                    const riesgoEncontrado = tablaRiesgos.find(
                      (r) => parseInt(r.probabilidad) === pValue && parseInt(r.severidad) === sValue
                    );

                    const R = pValue * sValue;
                    const porcentaje = Math.round((R / 25) * 100);
                    const textoRiesgo = riesgoEncontrado ? (riesgoEncontrado.riesgo || "") : "";

                    return celdaMatrizRiesgo(R, porcentaje, textoRiesgo);
                  }),
                ],
              });
            }),
          ],
        })
      );
    }
  }

  // ========== INFORME FOTOGRÁFICO POR VIN ==========
  const registrosPorVin = formData.registrosPorVin || [];
  if (registrosPorVin.length > 0) {
    docContent.push(
      new Paragraph({ children: [], pageBreakBefore: true }),
      seccion("INFORME FOTOGRÁFICO")
    );

    for (const registro of registrosPorVin) {
      if (registro.vin || registro.danos) {
        // Título del registro
        const tituloRegistro = `VIN Nro. ${registro.vin || "N/A"}${registro.danos ? ` - ${registro.danos}` : ""}`;
        docContent.push(
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: tituloRegistro.replace(/\s+/g, " "), size: 22, bold: true, color: "000000", font: "Calibri" })],
            spacing: { after: 200 },
          })
        );
      }

      // Fotos del registro
      const fotos = registro.fotos || [];
      if (fotos.length > 0) {
        const filas = [];
        
        for (let i = 0; i < fotos.length; i += 3) {
          const celdasImagen = [];
          const celdasDescripcion = [];

          for (let j = i; j < i + 3 && j < fotos.length; j++) {
            const foto = fotos[j];
            const imgBuffer = await convertirImagenABuffer(foto);
            
            if (imgBuffer) {
              celdasImagen.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: imgBuffer,
                          transformation: { width: 180, height: 135 },
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                })
              );
              celdasDescripcion.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: (foto.descripcion || "").replace(/\s+/g, " "), size: 20, font: "Calibri", color: "000000" })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                })
              );
            }
          }

          if (celdasImagen.length > 0) {
            filas.push(new TableRow({ children: celdasImagen }));
            filas.push(new TableRow({ children: celdasDescripcion }));
          }
        }

        if (filas.length > 0) {
          docContent.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: filas,
            }),
            new Paragraph({ text: "", spacing: { after: 300 } })
          );
        }
      }
    }
  }

  // ========== RECOMENDACIONES ==========
  const recomendaciones = formData.recomendaciones || [];
  if (recomendaciones.length > 0) {
    docContent.push(
      new Paragraph({ children: [], pageBreakBefore: true }),
      seccion("RECOMENDACIONES")
    );

    recomendaciones.forEach((rec, index) => {
      docContent.push(
        new Paragraph({
          children: [
            new TextRun({ text: "✓ ", size: 22, bold: true, color: "000000", font: "Calibri" }),
            new TextRun({ text: (rec.texto || "").replace(/\s+/g, " "), size: 22, color: "000000", font: "Calibri" }),
          ],
          spacing: { after: 150 },
          bullet: { level: 0 },
        })
      );
    });
  }

  // ========== FIRMA DEL INSPECTOR ==========
  docContent.push(
    new Paragraph({ text: "", spacing: { after: 600 } })
  );

  // Texto de despedida
  docContent.push(
    new Paragraph({
      children: [new TextRun({ text: "Agradeciendo de antemano su valiosa atención me suscribo de usted,", size: 24, font: "Calibri", color: "000000" })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Cordialmente,", size: 24, font: "Calibri", color: "000000" })],
      spacing: { after: 200 },
    })
  );

  // Imagen de la firma
  if (formData.imagenFirma) {
    try {
      let firmaBuffer = null;
      
      if (typeof formData.imagenFirma === 'string' && formData.imagenFirma.startsWith('data:image')) {
        const base64Data = formData.imagenFirma.split(',')[1];
        firmaBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
      }
      
      if (firmaBuffer) {
        docContent.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: firmaBuffer,
                transformation: { width: 200, height: 80 },
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    } catch (error) {
      console.error('❌ Error insertando firma:', error);
    }
  }

  // Datos del firmante
  if (formData.nombreFirmante) {
    docContent.push(
      new Paragraph({
        children: [new TextRun({ text: formData.nombreFirmante, size: 24, bold: true, font: "Calibri", color: "000000" })],
        spacing: { after: 50 },
      })
    );
  }

  if (formData.cargoFirmante) {
    docContent.push(
      new Paragraph({
        children: [new TextRun({ text: formData.cargoFirmante, size: 24, font: "Calibri", color: "000000" })],
        spacing: { after: 100 },
      })
    );
  }

  // Email y Celular
  if (formData.emailFirmante) {
    docContent.push(
      new Paragraph({
        children: [
          new TextRun({ text: "E-Mail: ", size: 24, bold: true, color: "000000", font: "Calibri" }),
          new TextRun({ text: formData.emailFirmante, size: 24, color: "000000", font: "Calibri" }),
        ],
        spacing: { after: 50 },
      })
    );
  }

  if (formData.celularFirmante) {
    docContent.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Celular: ", size: 24, bold: true, color: "000000", font: "Calibri" }),
          new TextRun({ text: formData.celularFirmante, size: 24, color: "000000", font: "Calibri" }),
        ],
        spacing: { after: 50 },
      })
    );
  }

  // ========== GENERAR Y DESCARGAR ==========
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      headers: {
        default: new Header({
          children: [headerTable],
        }),
      },
      children: docContent,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const nombreArchivo = `Informe_Puertos_${formData.empresaCliente || formData.nombreCliente || 'Puerto'}_${new Date().getTime()}.docx`;
    saveAs(blob, nombreArchivo);
return { success: true, nombreArchivo };
  } catch (error) {
    console.error('❌ Error al generar documento Word:', error);
    throw error;
  }
};
