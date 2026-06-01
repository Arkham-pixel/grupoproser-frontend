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
} from "docx";
import { saveAs } from "file-saver";

/**
 * Funciones auxiliares para generar el manual
 */
function crearTitulo(texto, nivel = HeadingLevel.HEADING_1, pageBreak = false) {
  return [
    pageBreak ? new Paragraph({ children: [], pageBreakBefore: true }) : null,
    new Paragraph({
      children: [
        new TextRun({
          text: texto,
          bold: true,
          size: 32,
          font: "Calibri",
          color: "000000"
        })
      ],
      heading: nivel,
      spacing: { before: 400, after: 200 }
    })
  ].filter(Boolean);
}

function crearParrafo(texto, indent = false) {
  return new Paragraph({
    children: [
      new TextRun({
        text: texto,
        size: 24,
        font: "Calibri",
        color: "000000"
      })
    ],
    spacing: { after: indent ? 150 : 200 },
    indent: indent ? { left: 400 } : undefined,
    alignment: AlignmentType.JUSTIFIED
  });
}

function crearScreenshot(numero, descripcion) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `SCREENSHOT ${numero}: ${descripcion}`,
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
          text: `[Insertar captura de pantalla aquí: ${descripcion}]`,
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
  ];
}

function crearListaItems(items) {
  return items.map(item => 
    crearParrafo(`• ${item}`, true)
  );
}

/**
 * Función para generar el manual de uso de la Matriz de Riesgos en formato Word
 */
export const generarManualMatrizRiesgo = async () => {
  console.log('🚀 Generando manual completo de uso de la Matriz de Riesgos...');
  
  const docContent = [];
  let screenshotCounter = 1;

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
          text: "MATRIZ DE RIESGOS AVANZADA",
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
    ...crearTitulo("INTRODUCCIÓN"),
    crearParrafo("Este manual proporciona instrucciones detalladas sobre cómo utilizar la Matriz de Riesgos Avanzada. El sistema permite identificar, valorar, visualizar y gestionar riesgos organizacionales de manera estructurada y profesional."),
    new Paragraph({
      children: [
        new TextRun({
          text: "IMPORTANTE: Este documento incluye marcadores específicos donde deben ir los screenshots de cada sección. Por favor, inserte las capturas de pantalla en los lugares indicados con recuadros amarillos.",
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

  // Sección 1: Acceso a la Matriz de Riesgos
  docContent.push(
    ...crearTitulo("1. ACCESO A LA MATRIZ DE RIESGOS", HeadingLevel.HEADING_1, true),
    crearParrafo("Para acceder a la Matriz de Riesgos Avanzada:"),
    ...crearListaItems([
      "Inicie sesión en el sistema.",
      "Navegue al menú principal y seleccione 'Matriz de Riesgo' o 'Matriz de Riesgos Avanzada'.",
      "Haga clic en 'Nueva Matriz' o seleccione una matriz existente desde el historial."
    ]),
    ...crearScreenshot(screenshotCounter++, "Captura de pantalla del acceso a la Matriz de Riesgos - Menú principal")
  );

  // Sección 2: Estructura de la Matriz de Riesgos
  docContent.push(
    ...crearTitulo("2. ESTRUCTURA DE LA MATRIZ DE RIESGOS", HeadingLevel.HEADING_1, true),
    crearParrafo("La Matriz de Riesgos Avanzada está organizada en 5 secciones principales:"),
    crearParrafo("1. 📋 INFORMACIÓN:", true),
    ...crearListaItems([
      "Información general de la matriz",
      "Datos de la empresa",
      "Información del responsable",
      "Descripción y propósito de la matriz",
      "Información del ingeniero que recibe la visita",
      "Recomendaciones de gestión de riesgos"
    ]),
    crearParrafo("2. 🔍 IDENTIFICACIÓN:", true),
    ...crearListaItems([
      "Identificación y categorización de riesgos",
      "Procesos asociados",
      "Riesgos identificados",
      "Categorías de riesgo (Estratégico, Cumplimiento, Reputacional, Operativo, Financiero, Tecnológico, Corrupción, DD.HH.)"
    ]),
    crearParrafo("3. 📊 VALORACIÓN:", true),
    ...crearListaItems([
      "Valoración de probabilidad e impacto",
      "Riesgos inherentes y residuales",
      "Cálculo automático de niveles de riesgo",
      "Clasificación de riesgos"
    ]),
    crearParrafo("4. 🔥 MAPA DE CALOR:", true),
    ...crearListaItems([
      "Visualización de la matriz de riesgos en formato 5x5",
      "Distribución de riesgos según probabilidad e impacto",
      "Colores según nivel de riesgo (verde, amarillo, naranja, rojo)",
      "Riesgos inherentes y residuales"
    ]),
    crearParrafo("5. 🛡️ GESTIÓN DE RIESGOS:", true),
    ...crearListaItems([
      "Recomendaciones para cada riesgo",
      "Seguimiento de implementación",
      "Fechas de implementación",
      "Comentarios y observaciones"
    ]),
    ...crearScreenshot(screenshotCounter++, "Vista general de la estructura de la Matriz de Riesgos mostrando las 5 secciones")
  );

  // Sección 3: Información General
  docContent.push(
    ...crearTitulo("3. SECCIÓN: INFORMACIÓN", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección contiene la información general de la matriz de riesgos:"),
    crearParrafo("CAMPOS ESPECÍFICOS:"),
    ...crearListaItems([
      "Nombre de la Empresa: Nombre completo de la empresa para la cual se crea la matriz",
      "Fecha de Creación: Fecha en que se crea la matriz (se completa automáticamente)",
      "Responsable: Nombre de la persona responsable de la matriz",
      "Versión: Versión de la matriz (por defecto 1.0)",
      "Descripción: Descripción detallada del propósito de la matriz"
    ]),
    crearParrafo("INFORMACIÓN DEL INGENIERO QUE RECIBE LA VISITA:"),
    ...crearListaItems([
      "Nombre: Nombre completo del ingeniero",
      "Cargo: Cargo del ingeniero en la empresa",
      "Teléfono: Número de teléfono de contacto",
      "Email: Correo electrónico",
      "Empresa: Nombre de la empresa",
      "Dirección: Dirección de la empresa"
    ]),
    crearParrafo("RECOMENDACIONES DE GESTIÓN DE RIESGOS:"),
    crearParrafo("Puede agregar múltiples recomendaciones. Para cada recomendación debe completar:", true),
    ...crearListaItems([
      "Recomendación: Descripción de la recomendación",
      "Fecha Inicial: Fecha en que se propone la recomendación",
      "Fecha Implementación 1: Primera fecha de implementación",
      "Comentarios Implementación 1: Comentarios sobre la primera implementación",
      "Fecha Implementación 2: Segunda fecha de implementación (si aplica)",
      "Comentarios Implementación 2: Comentarios sobre la segunda implementación"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Información - Formulario de información general")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Información - Información del ingeniero")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Información - Recomendaciones de gestión")
  );

  // Sección 4: Identificación de Riesgos
  docContent.push(
    ...crearTitulo("4. SECCIÓN: IDENTIFICACIÓN DE RIESGOS", HeadingLevel.HEADING_1, true),
    crearParrafo("En esta sección se identifican y categorizan los riesgos:"),
    crearParrafo("CAMPOS ESPECÍFICOS:"),
    ...crearListaItems([
      "Número: Número secuencial del riesgo",
      "Procesos: Puede agregar múltiples procesos asociados al riesgo (nombre y tipo)",
      "Riesgo Identificado: Descripción detallada del riesgo identificado",
      "Categorías: Selección de categorías de riesgo mediante checkboxes:",
      "  - Estratégico",
      "  - Cumplimiento",
      "  - Reputacional",
      "  - Operativo",
      "  - Financiero",
      "  - Tecnológico",
      "  - Corrupción",
      "  - DD.HH. (Derechos Humanos)"
    ]),
    crearParrafo("FUNCIONALIDADES:"),
    ...crearListaItems([
      "Puede agregar nuevos riesgos haciendo clic en 'Agregar Riesgo'",
      "Puede eliminar riesgos haciendo clic en el botón de eliminar",
      "Puede agregar múltiples procesos por riesgo",
      "Puede agregar columnas adicionales personalizadas si es necesario"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Identificación de Riesgos - Tabla de riesgos")
  );

  // Sección 5: Valoración de Riesgos
  docContent.push(
    ...crearTitulo("5. SECCIÓN: VALORACIÓN DE RIESGOS", HeadingLevel.HEADING_1, true),
    crearParrafo("En esta sección se valora cada riesgo según su probabilidad e impacto:"),
    crearParrafo("VALORACIÓN DE RIESGOS INHERENTES:"),
    crearParrafo("Para cada riesgo identificado debe completar:", true),
    ...crearListaItems([
      "Probabilidad: Seleccione un valor del 1 al 5 (1 = Muy Baja/Improbable, 2 = Baja, 3 = Moderada/Probable, 4 = Alta/Posible, 5 = Muy Alta/Frecuente)",
      "Impacto por Categoría: Para cada categoría seleccionada en la identificación, debe asignar un valor de impacto del 1 al 5 (1 = Insignificante, 2 = Menor, 3 = Moderada, 4 = Mayor, 5 = Catastrófica)"
    ]),
    crearParrafo("VALORACIÓN DE RIESGOS RESIDUALES:"),
    crearParrafo("Después de implementar controles, puede valorar el riesgo residual:", true),
    ...crearListaItems([
      "Probabilidad Residual: Nueva probabilidad después de controles (1-5)",
      "Impacto Residual por Categoría: Nuevo impacto después de controles para cada categoría (1-5)"
    ]),
    crearParrafo("IMPORTANTE: El sistema calcula automáticamente los niveles de riesgo basándose en la probabilidad y el impacto. Los riesgos se sincronizan automáticamente desde la sección de Identificación."),
    ...crearScreenshot(screenshotCounter++, "Sección de Valoración - Tabla de valoración de riesgos inherentes")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Valoración - Tabla de valoración de riesgos residuales")
  );

  // Sección 6: Mapa de Calor
  docContent.push(
    ...crearTitulo("6. SECCIÓN: MAPA DE CALOR", HeadingLevel.HEADING_1, true),
    crearParrafo("El Mapa de Calor muestra visualmente la distribución de riesgos en una matriz 5x5:"),
    crearParrafo("CARACTERÍSTICAS:"),
    ...crearListaItems([
      "Eje X (Horizontal): Probabilidad (1 a 5, de izquierda a derecha)",
      "Eje Y (Vertical): Impacto (1 a 5, de abajo hacia arriba)",
      "Colores de las celdas según nivel de riesgo:",
      "  - Verde: Riesgo bajo",
      "  - Amarillo: Riesgo medio",
      "  - Naranja: Riesgo alto",
      "  - Rojo: Riesgo crítico"
    ]),
    crearParrafo("FUNCIONALIDADES:"),
    ...crearListaItems([
      "Visualización de riesgos inherentes: Muestra los riesgos antes de implementar controles",
      "Visualización de riesgos residuales: Muestra los riesgos después de implementar controles",
      "Puede alternar entre vista de riesgos inherentes y residuales",
      "Cada celda muestra los riesgos que tienen esa combinación de probabilidad e impacto",
      "Los riesgos se identifican con su número o ID en cada celda"
    ]),
    crearParrafo("INTERPRETACIÓN:"),
    crearParrafo("Los riesgos en la esquina superior derecha (alta probabilidad, alto impacto) son los más críticos y requieren atención inmediata. Los riesgos en la esquina inferior izquierda (baja probabilidad, bajo impacto) son de menor prioridad.", true),
    ...crearScreenshot(screenshotCounter++, "Sección de Mapa de Calor - Matriz 5x5 con riesgos inherentes")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Mapa de Calor - Matriz 5x5 con riesgos residuales")
  );

  // Sección 7: Gestión de Riesgos
  docContent.push(
    ...crearTitulo("7. SECCIÓN: GESTIÓN DE RIESGOS", HeadingLevel.HEADING_1, true),
    crearParrafo("En esta sección se gestionan las recomendaciones y el seguimiento de implementación:"),
    crearParrafo("CAMPOS ESPECÍFICOS:"),
    ...crearListaItems([
      "Riesgo: Seleccione el riesgo desde un selector desplegable",
      "Recomendación: Descripción detallada de la recomendación para mitigar el riesgo",
      "Estado: Estado de la recomendación (Pendiente, En Proceso, Implementada, etc.)",
      "Responsable: Persona responsable de implementar la recomendación",
      "Fecha Límite: Fecha límite para implementar la recomendación",
      "Fecha de Implementación: Fecha real en que se implementó",
      "Comentarios: Comentarios adicionales sobre la implementación"
    ]),
    crearParrafo("FUNCIONALIDADES:"),
    ...crearListaItems([
      "Puede agregar múltiples recomendaciones por riesgo",
      "Puede eliminar recomendaciones",
      "Puede editar recomendaciones existentes",
      "El sistema permite hacer seguimiento del estado de cada recomendación"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Gestión de Riesgos - Tabla de recomendaciones")
  );

  // Sección 8: Guardar y Exportar
  docContent.push(
    ...crearTitulo("8. GUARDAR Y EXPORTAR", HeadingLevel.HEADING_1, true),
    crearParrafo("En la parte superior del panel principal encontrará varios botones de acción:"),
    crearParrafo("BOTONES PRINCIPALES:"),
    ...crearListaItems([
      "💾 Guardar Matriz: Guarda la matriz de riesgo en la base de datos. Puede guardar como 'en_proceso' para continuar más tarde.",
      "📄 Ver Reporte: Genera y muestra el reporte completo en una nueva ventana del navegador.",
      "💾 Exportar HTML: Exporta el reporte como archivo HTML descargable."
    ]),
    crearParrafo("SELECTOR DE TIPO DE REPORTE:"),
    ...crearListaItems([
      "🚀 Valoración Inicial: Para matrices de riesgo iniciales",
      "📅 Valoración Anual: Para matrices de riesgo anuales"
    ]),
    crearParrafo("IMPORTANTE: El sistema guarda automáticamente los datos en el navegador mientras trabaja. Sin embargo, es recomendable usar el botón 'Guardar Matriz' para guardar en la base de datos."),
    ...crearScreenshot(screenshotCounter++, "Botones de acción y selector de tipo de reporte")
  );

  // Sección 9: Navegación entre Secciones
  docContent.push(
    ...crearTitulo("9. NAVEGACIÓN ENTRE SECCIONES", HeadingLevel.HEADING_1, true),
    crearParrafo("La Matriz de Riesgos tiene un panel de navegación lateral que permite cambiar entre secciones:"),
    ...crearListaItems([
      "Haga clic en cualquier sección del panel lateral para cambiar de sección",
      "La sección activa se resalta visualmente",
      "Puede navegar libremente entre secciones en cualquier momento",
      "Los datos se guardan automáticamente al cambiar de sección"
    ]),
    ...crearScreenshot(screenshotCounter++, "Panel de navegación lateral con las 5 secciones")
  );

  // Sección 10: Consejos y Recomendaciones
  docContent.push(
    ...crearTitulo("10. CONSEJOS Y RECOMENDACIONES", HeadingLevel.HEADING_1, true),
    crearParrafo("Para obtener el mejor resultado:"),
    ...crearListaItems([
      "Complete primero la sección de Información con todos los datos de la empresa",
      "Identifique todos los riesgos relevantes en la sección de Identificación",
      "Valore cuidadosamente la probabilidad e impacto de cada riesgo",
      "Revise el Mapa de Calor para visualizar la distribución de riesgos",
      "Agregue recomendaciones específicas y realizables en la sección de Gestión",
      "Guarde frecuentemente usando el botón 'Guardar Matriz'",
      "Use el selector de tipo de reporte según corresponda (Inicial o Anual)",
      "Revise el reporte generado antes de finalizar"
    ])
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
    const nombreArchivo = `Manual_Matriz_Riesgos_${new Date().getTime()}.docx`;
    saveAs(blob, nombreArchivo);
    console.log('✅ Manual completo generado exitosamente:', nombreArchivo);
    return { success: true, nombreArchivo };
  } catch (error) {
    console.error('❌ Error al generar manual:', error);
    throw error;
  }
};














