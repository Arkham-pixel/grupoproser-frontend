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
 * Función para generar el manual de uso del formulario de inspección de riesgos en formato Word
 */
export const generarManualInspeccion = async () => {
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
          text: "FORMULARIO DE INSPECCIÓN DE RIESGOS",
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
    crearParrafo("Este manual proporciona instrucciones detalladas sobre cómo utilizar el formulario de inspección de riesgos. El sistema permite crear informes completos de inspección de riesgos para empresas, incluyendo análisis de riesgos, registro fotográfico, infraestructura, servicios industriales, protección contra incendios, seguridad y recomendaciones."),
    new Paragraph({
      children: [
        new TextRun({
          text: "IMPORTANTE: Este documento incluye marcadores específicos donde deben ir los screenshots de cada sección del formulario. Por favor, inserte las capturas de pantalla en los lugares indicados con recuadros amarillos.",
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
    ...crearTitulo("1. ACCESO AL FORMULARIO", HeadingLevel.HEADING_1, true),
    crearParrafo("Para acceder al formulario de inspección de riesgos:"),
    ...crearListaItems([
      "Inicie sesión en el sistema.",
      "Navegue al menú principal y seleccione 'Formularios de Inspección' o 'Inspección de Riesgos'.",
      "Haga clic en 'Nuevo Formulario' o 'Crear Inspección'."
    ]),
    ...crearScreenshot(screenshotCounter++, "Captura de pantalla del acceso al formulario - Menú principal mostrando la opción de Inspección de Riesgos")
  );

  // Sección 1.1: Datos Iniciales del Cliente y Foto de Portada
  docContent.push(
    ...crearTitulo("1.1. DATOS INICIALES DEL CLIENTE Y FOTO DE PORTADA", HeadingLevel.HEADING_1, true),
    crearParrafo("Al inicio del formulario, debe completar los datos básicos que aparecerán en la portada del documento Word generado:"),
    ...crearListaItems([
      "Nombre del Cliente/Asegurado: Nombre completo de la empresa o persona asegurada. Este nombre aparecerá en la portada del documento.",
      "Ciudad: Seleccione la ciudad usando el selector desplegable. El departamento se completará automáticamente.",
      "Departamento: Se completa automáticamente al seleccionar la ciudad.",
      "Dirección: Dirección completa del riesgo o predio inspeccionado.",
      "Aseguradora: Nombre de la compañía aseguradora.",
      "Fecha de Inspección: Fecha en que se realiza la inspección (se selecciona con el calendario)."
    ]),
    crearParrafo("IMPORTANTE: Estos datos aparecerán en la portada y en la carta de presentación del documento Word generado."),
    ...crearScreenshot(screenshotCounter++, "Vista de la sección inicial con los campos de datos básicos del cliente")
  );

  // Sección 1.2: Foto de Portada
  docContent.push(
    ...crearTitulo("1.2. FOTO DE PORTADA (FACHADA DEL RIESGO)", HeadingLevel.HEADING_1, true),
    crearParrafo("La foto de portada es una imagen de la fachada del riesgo que aparecerá en la primera página del documento Word generado:"),
    ...crearListaItems([
      "Haga clic en el botón o campo 'Seleccionar Imagen' o 'Cargar Foto' en la sección inicial del formulario.",
      "Seleccione una imagen de la fachada del riesgo desde su computadora (formatos PNG, JPEG son soportados).",
      "La imagen aparecerá como vista previa en el formulario.",
      "Esta foto aparecerá en la portada del documento Word, justo después del título y nombre de la empresa."
    ]),
    crearParrafo("IMPORTANTE: La foto debe ser clara y mostrar la fachada principal del predio inspeccionado. Esta imagen se incluirá automáticamente en la portada del documento Word con el texto 'Fachada del riesgo' debajo."),
    ...crearScreenshot(screenshotCounter++, "Campo para cargar la foto de portada/fachada del riesgo")
  );

  // Sección 2: Información General
  docContent.push(
    ...crearTitulo("2. INFORMACIÓN GENERAL", HeadingLevel.HEADING_1, true),
    crearParrafo("En esta sección inicial debe completar los datos básicos de la inspección. Esta sección aparece después de la tabla de contenido en el formulario:"),
    crearParrafo("CAMPOS DE ESTA SECCIÓN:"),
    ...crearListaItems([
      "Nombre de la Empresa: Ingrese el nombre completo de la empresa (ej: Ladrillera Casablanca S.A.S.)",
      "Dirección: Dirección completa del predio (ej: Km 8 vía El Zulia)",
      "Ciudad del Siniestro: Seleccione la ciudad usando el selector desplegable con búsqueda. Incluye todas las ciudades de Colombia con su departamento.",
      "Persona Entrevistada: Nombre de la persona con quien se realizó la entrevista",
      "Cargo: Cargo de la persona entrevistada en la empresa",
      "Horario Laboral: Horario de trabajo de la empresa",
      "Número de Colaboradores: Cantidad total de empleados de la empresa"
    ]),
    crearParrafo("IMPORTANTE: Estos campos se llenan en la sección '1. INFORMACIÓN GENERAL' que aparece en el formulario después de la vista previa de la carta de presentación."),
    ...crearScreenshot(screenshotCounter++, "Vista completa de la sección '1. INFORMACIÓN GENERAL' con todos los campos visibles")
  );

  // Sección 3: Descripción General de la Empresa
  docContent.push(
    ...crearTitulo("3. DESCRIPCIÓN GENERAL DE LA EMPRESA", HeadingLevel.HEADING_1, true),
    crearParrafo("En esta sección debe proporcionar una descripción detallada de la empresa inspeccionada, incluyendo su actividad principal, sector económico, años de operación y cualquier información relevante sobre su operación."),
    ...crearScreenshot(screenshotCounter++, "Sección de Descripción General de la Empresa")
  );

  // Sección 4: Infraestructura
  docContent.push(
    ...crearTitulo("4. INFRAESTRUCTURA", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección captura información sobre la infraestructura física del riesgo:"),
    ...crearListaItems([
      "Antigüedad del predio",
      "Área del lote (m²)",
      "Área construida (m²)",
      "Número de edificios",
      "Número de pisos",
      "Sótanos (si aplica)",
      "Tenencia (Propio o Arrendado)",
      "Descripción detallada de la infraestructura"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Infraestructura con todos los campos")
  );

  // Sección 5: Procesos
  docContent.push(
    ...crearTitulo("5. PROCESOS", HeadingLevel.HEADING_1, true),
    crearParrafo("Describa los procesos principales de la empresa. Esta sección incluye un campo de texto libre donde puede detallar los procesos industriales, comerciales o de servicios que se realizan en el predio."),
    ...crearScreenshot(screenshotCounter++, "Sección de Procesos")
  );

  // Sección 6: Linderos
  docContent.push(
    ...crearTitulo("6. LINDEROS", HeadingLevel.HEADING_1, true),
    crearParrafo("Especifique los linderos del predio en las cuatro direcciones:"),
    ...crearListaItems([
      "Lindero Norte",
      "Lindero Sur",
      "Lindero Oriente",
      "Lindero Occidente"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Linderos")
  );

  // Sección 7: Mapa de Ubicación
  docContent.push(
    ...crearTitulo("7. MAPA DE UBICACIÓN", HeadingLevel.HEADING_1, true),
    crearParrafo("El mapa permite marcar la ubicación exacta del riesgo:"),
    ...crearListaItems([
      "Busque la ubicación en el mapa usando la barra de búsqueda o arrastrando el marcador.",
      "El sistema capturará automáticamente las coordenadas y una imagen del mapa.",
      "Esta imagen aparecerá en el documento Word generado, en la sección correspondiente."
    ]),
    ...crearScreenshot(screenshotCounter++, "Vista del mapa con marcador de ubicación visible")
  );

  // Sección 8: Características de la Construcción
  docContent.push(
    ...crearTitulo("8. CARACTERÍSTICAS DE LA CONSTRUCCIÓN (5.1)", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección incluye información detallada sobre las características constructivas del edificio. Aparece en el documento Word como '5.1. CARACTERÍSTICAS DE LA CONSTRUCCIÓN'."),
    crearParrafo("CAMPOS ESPECÍFICOS DE ESTA SECCIÓN:"),
    crearParrafo("Comentarios Adicionales (campo de texto libre):", true),
    crearParrafo("Tabla: Edificación Principal - Esta tabla incluye los siguientes campos:", true),
    ...crearListaItems([
      "Año de construcción (selector desde 1900 hasta años futuros)",
      "Tipo de edificio (selector: Edificio, Bodega, Nave Industrial, Casa, Local Comercial, Oficina, Otro)",
      "Área de lote (campo de texto para m²)",
      "Área construida (campo de texto para m²)",
      "Número de pisos (selector: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50)",
      "Cimentación (selector: Pilotes aislados, Zapatas aisladas, Zapatas corridas, Losas de cimentación, Muros de contención, Otro - con campo adicional si se selecciona Otro)",
      "Materiales estructura (selector: Mampostería - Reforzada, Mampostería - No reforzada, Concreto reforzado, Acero estructural, Madera, Mixto, Otro - con campo adicional si se selecciona Otro)",
      "Regularidad de planta (selector: 1 = con irregularidad, 2 = sin irregularidad)",
      "Daños previos (selector: 1 = inmueble con daños previos, 2 = inmueble sin daños previos)",
      "Reforzamientos estructurales (selector: 1 = trabes coladas en sitio, 2 = trabes prefabricadas, 3 = losas macizas, 4 = losas aligeradas, No aplica)",
      "Sistema estructural (selector: Estructura portante, Estructura de acero, Estructura de concreto, Estructura mixta, Muros de carga, Otro - con campo adicional si se selecciona Otro)",
      "Estructura cubierta (selector: Metálica, Concreto, Madera, Mixta, Otro - con campo adicional si se selecciona Otro)",
      "Regular de altura (selector: 1 = irregular, 2 = regular)",
      "Daños reparados (selector: 1 = inmueble con daños reparados, 2 = inmueble sin daños reparados)"
    ]),
    crearParrafo("IMPORTANTE: Todos estos campos aparecen en una tabla en el documento Word generado en la sección '5.1. CARACTERÍSTICAS DE LA CONSTRUCCIÓN'."),
    ...crearScreenshot(screenshotCounter++, "Sección de Características de la Construcción - Tabla Edificación Principal completa")
  );

      // Sección 9: Materiales (4.1)
  docContent.push(
    ...crearTitulo("9. MATERIALES (4.1)", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección aparece en el documento Word como '4.1. MATERIALES' (complemento de la sección 4. PROCESOS). Documente los materiales almacenados en el predio. Esta sección tiene tres subsecciones:"),
    crearParrafo("A. INSUMOS - Campos específicos:", true),
    ...crearListaItems([
      "Tipo de insumos (selector con opción 'Otro' y campo adicional)",
      "Nivel de riesgo (selector: Bajo, Medio, Alto, Extremo)",
      "Descripción de los contenidos (campo de texto)",
      "Contenedores (selector: Empaque combustible, Empaque no combustible, Contenedores metálicos, Contenedores plásticos, Sacos, Bidones, Otro - con campo adicional)",
      "Tipo de almacenamiento (selector: Almacenamiento en silos, tanques o contenedores, Almacenamiento en estanterías, Almacenamiento en pallets, Almacenamiento en bodega cerrada, Almacenamiento al aire libre, Otro - con campo adicional)",
      "Estado de almacenamiento (selector: Adecuado, Regular, Deficiente, Crítico)"
    ]),
    crearParrafo("B. MATERIAS PRIMAS - Campos específicos:", true),
    ...crearListaItems([
      "Tipo de materias primas (selector con opción 'Otro' y campo adicional)",
      "Nivel de riesgo (selector: Bajo, Medio, Alto, Extremo)",
      "Descripción de los contenidos (campo de texto)",
      "Contenedores (selector con opción 'Otro' y campo adicional)",
      "Tipo de almacenamiento (selector con opción 'Otro' y campo adicional)",
      "Estado de almacenamiento (selector: Adecuado, Regular, Deficiente, Crítico)"
    ]),
    crearParrafo("C. MERCANCÍAS - Campos específicos:", true),
    ...crearListaItems([
      "Tipo de mercancías (selector con opción 'Otro' y campo adicional)",
      "Nivel de riesgo (selector: Bajo, Medio, Alto, Extremo)",
      "Descripción de los contenidos (campo de texto)",
      "Contenedores (selector con opción 'Otro' y campo adicional)",
      "Tipo de almacenamiento (selector con opción 'Otro' y campo adicional)",
      "Estado de almacenamiento (selector: Adecuado, Regular, Deficiente, Crítico)"
    ]),
    crearParrafo("IMPORTANTE: Todas estas categorías aparecen como tablas separadas en el documento Word generado en la sección '4.1. MATERIALES'."),
    ...crearScreenshot(screenshotCounter++, "Sección de Materiales - Insumos")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Materiales - Materias Primas")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Materiales - Mercancías")
  );

  // Sección 10: Sustracción - Protecciones Físicas
  docContent.push(
    ...crearTitulo("10. SUSTRACCIÓN - PROTECCIONES FÍSICAS", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección extensa documenta todas las protecciones físicas contra sustracción:"),
    ...crearListaItems([
      "Ubicación del predio",
      "Vulnerabilidad de contenidos",
      "Acceso a instalaciones",
      "Circulación de personas externas",
      "Protecciones pasivas",
      "Sistema de Alarma (monitoreo, tipo de comunicación, cobertura, sensores)",
      "CCTV (número de cámaras, control, monitoreo, frecuencia de grabación, tiempo de respaldo)",
      "Vigilancia (empresa, número de vigilantes, jornada, armas, radios)"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Sustracción - Protecciones Físicas (parte 1)")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Sustracción - Sistema de Alarma")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Sustracción - CCTV")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Sustracción - Vigilancia")
  );

  // Sección 11: Características Operativas Ambientales
  docContent.push(
    ...crearTitulo("11. CARACTERÍSTICAS OPERATIVAS AMBIENTALES", HeadingLevel.HEADING_1, true),
    crearParrafo("Documente los aspectos ambientales del riesgo:"),
    ...crearListaItems([
      "Licencia ambiental",
      "Permiso de vertimientos",
      "Consumo de agua",
      "Uso de bombillas ahorradoras",
      "Mercado no regulado",
      "Vertimiento de aguas residuales",
      "Planta de tratamiento",
      "Plan de manejo de residuos",
      "Emisiones contaminantes",
      "Sistema de filtración o lavado de gases",
      "Niveles de ruido",
      "Programa de gestión ambiental certificado"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Características Operativas Ambientales")
  );

  // Sección 12: Protección y Prevención Contra Incendios
  docContent.push(
    ...crearTitulo("12. PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección es crítica y muy completa. Incluye:"),
    ...crearListaItems([
      "Sistema de detección (detectores de humo, cobertura, instalación, monitoreo)",
      "Extintores (cantidad, tipo, suficiencia, instalación, señalización, carga vigente)",
      "Alarma contra incendio (campo de texto libre)",
      "Red contraincendio (RCI) (campo de texto libre)",
      "Brigada de emergencia (campo de texto libre)",
      "Bomberos"
    ]),
    crearParrafo("IMPORTANTE: Todas las protecciones contra incendio deben estar documentadas detalladamente."),
    ...crearScreenshot(screenshotCounter++, "Sección de Protección Contra Incendios - Sistema de Detección")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Protección Contra Incendios - Extintores")
  );

  // Sección 13: Lucro Cesante
  docContent.push(
    ...crearTitulo("13. LUCRO CESANTE", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección analiza el impacto económico de posibles interrupciones:"),
    ...crearListaItems([
      "Valor de facturación del año anterior",
      "Valor proyectado de facturación",
      "PML (Pérdida Máxima Probable): porcentaje (%) y descripción",
      "Análisis y comentarios sobre el lucro cesante"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Lucro Cesante")
  );

  // Sección 14: Maquinaria, Equipos y Mantenimiento
  docContent.push(
    ...crearTitulo("14. MAQUINARIA, EQUIPOS Y MANTENIMIENTO", HeadingLevel.HEADING_1, true),
    crearParrafo("Documente el equipamiento del predio:"),
    ...crearListaItems([
      "Descripción del equipamiento (campo de texto libre)",
      "Inventario de Equipos Eléctricos y Electrónicos por áreas",
      "Para cada área puede agregar múltiples equipos con nombre, cantidad, precio y subtotal"
    ]),
    crearParrafo("El sistema permite agregar múltiples áreas y equipos dentro de cada área."),
    ...crearScreenshot(screenshotCounter++, "Sección de Maquinaria - Descripción del Equipamiento")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Maquinaria - Inventario de Equipos por Áreas")
  );

  // Sección 15: Servicios Industriales
  docContent.push(
    ...crearTitulo("15. SERVICIOS INDUSTRIALES", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección documenta los servicios de infraestructura:"),
    ...crearListaItems([
      "Energía (proveedor, tensión, transformadores, plantas eléctricas, pararrayos)",
      "Agua (proveedor, tipo de abastecimiento, capacidad)",
      "Gas (proveedor, tipo, uso)",
      "Comunicaciones y datos",
      "Alcantarillado"
    ]),
    crearParrafo("Para transformadores y plantas eléctricas puede agregar múltiples registros con detalles técnicos completos."),
    ...crearScreenshot(screenshotCounter++, "Sección de Servicios Industriales - Energía")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Sección de Servicios Industriales - Agua, Gas y Otros")
  );

  // Sección 17: Procesos Críticos y Riesgos Medioambientales
  docContent.push(
    ...crearTitulo("17. PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES", HeadingLevel.HEADING_1, true),
    crearParrafo("Documente los procesos críticos y riesgos medioambientales en campos de texto libre:"),
    ...crearListaItems([
      "Procesos Críticos: Descripción detallada de los procesos que podrían generar mayores riesgos",
      "Riesgos Medioambientales: Identificación y descripción de riesgos ambientales potenciales"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Procesos Críticos y Riesgos Medioambientales")
  );

  // Sección 18: Lucro por Rotura de Maquinaria
  docContent.push(
    ...crearTitulo("18. LUCRO POR ROTURA DE MAQUINARIA", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección analiza el riesgo de rotura de maquinaria y su impacto:"),
    ...crearListaItems([
      "Capacidad instalada de la planta de producción",
      "Índice promedio de capacidad utilizada",
      "Número de líneas de producción",
      "Maquinaria crítica",
      "Incidencia sobre la producción (%)",
      "Origen de la maquinaria crítica",
      "Hay representación nacional de la maquinaria",
      "Hay maquinaria en Stand-by",
      "Existen empresas satélite para la producción",
      "Hay convenios con otras empresas"
    ]),
    ...crearScreenshot(screenshotCounter++, "Sección de Lucro por Rotura de Maquinaria")
  );

  // Sección 19: Siniestralidad
  docContent.push(
    ...crearTitulo("19. SINIESTRALIDAD", HeadingLevel.HEADING_1, true),
    crearParrafo("En este campo de texto libre debe incluir el detalle de los siniestros reportados, fechas, causas y acciones correctivas tomadas."),
    ...crearScreenshot(screenshotCounter++, "Sección de Siniestralidad")
  );

  // Sección 20: Análisis de Riesgos
  docContent.push(
    ...crearTitulo("20. ANÁLISIS DE RIESGOS", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección permite agregar múltiples riesgos y su análisis. Por defecto incluye:"),
    ...crearListaItems([
      "Incendio/Explosión",
      "AMIT",
      "Anegación",
      "Daños por agua",
      "Terremoto",
      "Sustracción",
      "Rotura de maquinaria",
      "Responsabilidad Civil"
    ]),
    crearParrafo("Puede agregar nuevos riesgos o eliminar los existentes. Para cada riesgo debe completar el análisis correspondiente."),
    ...crearScreenshot(screenshotCounter++, "Sección de Análisis de Riesgos")
  );

  // Sección 21: Clasificación de Riesgos
  docContent.push(
    ...crearTitulo("21. CLASIFICACIÓN DE RIESGOS", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección clasifica cada riesgo según su Probabilidad y Severidad:"),
    crearParrafo("Probabilidad:", true),
    ...crearListaItems([
      "Muy Baja (Improbable) = (1)",
      "Baja = (2)",
      "Moderada (Probable) = (3)",
      "Alta (Posible) = (4)",
      "Muy Alta (Frecuente) = (5)"
    ]),
    crearParrafo("Severidad:", true),
    ...crearListaItems([
      "Insignificante = (1)",
      "Menor = (2)",
      "Moderada = (3)",
      "Mayor = (4)",
      "Catastrófica = (5)"
    ]),
    crearParrafo("El Riesgo = Probabilidad × Severidad. Los riesgos se sincronizan automáticamente desde la sección de Análisis."),
    ...crearScreenshot(screenshotCounter++, "Sección de Clasificación de Riesgos")
  );

  // Sección 22: Calificación del Riesgo (R) e Índice de Vulnerabilidad
  docContent.push(
    ...crearTitulo("22. CALIFICACIÓN DEL RIESGO (R) E ÍNDICE DE VULNERABILIDAD", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección muestra la calificación numérica del riesgo basada en la clasificación anterior. El sistema calcula automáticamente el valor de R (Riesgo) y el Índice de Vulnerabilidad."),
    ...crearScreenshot(screenshotCounter++, "Sección de Calificación del Riesgo e Índice de Vulnerabilidad")
  );

  // Sección 23: Matriz de Calor de Riesgos
  docContent.push(
    ...crearTitulo("23. MATRIZ DE CALOR DE RIESGOS", HeadingLevel.HEADING_1, true),
    crearParrafo("La matriz de calor muestra visualmente la distribución de riesgos según su probabilidad y severidad. Los riesgos se muestran en diferentes colores según su nivel de riesgo calculado."),
    ...crearScreenshot(screenshotCounter++, "Sección de Matriz de Calor de Riesgos")
  );

  // Sección 24: Recomendaciones
  docContent.push(
    ...crearTitulo("24. RECOMENDACIONES", HeadingLevel.HEADING_1, true),
    crearParrafo("En esta sección puede agregar múltiples recomendaciones para mejorar el riesgo y prevenir emergencias. Puede agregar nuevas recomendaciones y eliminar las existentes."),
    ...crearScreenshot(screenshotCounter++, "Sección de Recomendaciones")
  );

  // Sección 25: Registro Fotográfico
  docContent.push(
    ...crearTitulo("25. REGISTRO FOTOGRÁFICO", HeadingLevel.HEADING_1, true),
    crearParrafo("Esta sección permite agregar múltiples fotografías de la inspección:"),
    ...crearListaItems([
      "Haga clic en 'Seleccionar Imágenes' para cargar fotos",
      "Puede agregar una descripción para cada imagen",
      "Las imágenes aparecerán en el documento Word generado al final del informe",
      "Puede eliminar imágenes haciendo clic en el botón de eliminar"
    ]),
    crearParrafo("IMPORTANTE: Las fotos deben ser claras y relevantes para la inspección. El sistema soporta imágenes PNG, JPEG y otros formatos comunes."),
    ...crearScreenshot(screenshotCounter++, "Sección de Registro Fotográfico")
  );

  // Sección 26: Guardar y Generar Documento Word
  docContent.push(
    ...crearTitulo("GUARDAR Y GENERAR DOCUMENTO WORD", HeadingLevel.HEADING_1, true),
    crearParrafo("Al final del formulario encontrará dos botones principales:"),
    ...crearListaItems([
      "Guardar en Historial: Guarda el progreso sin generar el documento Word. Útil para completar el formulario en varias sesiones.",
      "Exportar Inspección: Genera el documento Word completo y lo guarda en el historial. Este proceso puede tardar varios segundos dependiendo de la cantidad de imágenes."
    ]),
    crearParrafo("IMPORTANTE: Antes de generar el documento Word, asegúrese de haber completado todas las secciones relevantes y haber guardado todas las imágenes necesarias."),
    ...crearScreenshot(screenshotCounter++, "Botones de Guardar y Exportar al final del formulario")
  );

  // Sección 27: Estructura del Documento Word Generado
  docContent.push(
    ...crearTitulo("ESTRUCTURA DEL DOCUMENTO WORD GENERADO", HeadingLevel.HEADING_1, true),
    crearParrafo("El documento Word generado tiene una estructura completa que incluye las siguientes partes:"),
    crearParrafo("1. PORTADA:", true),
    ...crearListaItems([
      "Título: 'Reporte de Inspección de suscripción' (centrado, en negrita y cursiva)",
      "Nombre de la Empresa: Nombre del cliente/asegurado (centrado, en negrita y cursiva)",
      "Ubicación: Ciudad - Departamento (centrado, en cursiva)",
      "Foto de Portada: Imagen de la fachada del riesgo (centrada, 400x250 píxeles aproximadamente)",
      "Texto: 'Fachada del riesgo' debajo de la imagen"
    ]),
    crearParrafo("Todos estos datos se toman automáticamente de los campos que completó al inicio del formulario."),
    crearParrafo("2. CARTA DE PRESENTACIÓN:", true),
    ...crearListaItems([
      "Saludo: 'Señores'",
      "Nombre de la Aseguradora (en negrita)",
      "Ciudad",
      "Referencia: 'REF: INFORME DE INSPECCIÓN' (en negrita)",
      "Asegurado: Nombre del cliente",
      "Predio Inspeccionado: Dirección del riesgo",
      "Fecha de Inspección: Fecha formateada",
      "Texto de presentación estándar que explica el informe",
      "Firma: 'ARNALDO TAPIA GUTIERREZ' - 'Gerente'"
    ]),
    crearParrafo("3. TABLA DE CONTENIDO (ÍNDICE):", true),
    ...crearListaItems([
      "Lista todas las secciones del informe con sus números de página",
      "Incluye referencias como: 1. INFORMACIÓN GENERAL, 2. DESCRIPCIÓN GENERAL DE LA EMPRESA, etc.",
      "Incluye subsecciones como: 5.1. CARACTERÍSTICAS DE LA CONSTRUCCIÓN",
      "El índice se genera automáticamente con los números de página correctos"
    ]),
    crearParrafo("4. CONTENIDO DEL INFORME:", true),
    crearParrafo("Después del índice, viene todo el contenido detallado del informe, incluyendo todas las secciones que completó en el formulario."),
    crearParrafo("5. ENCABEZADO Y PIE DE PÁGINA:", true),
    crearParrafo("El documento incluye un encabezado con el logo de la empresa en cada página."),
    ...crearScreenshot(screenshotCounter++, "Vista de la portada del documento Word generado (mostrando título, nombre empresa, ubicación y foto)")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Vista de la carta de presentación del documento Word generado")
  );

  docContent.push(
    ...crearScreenshot(screenshotCounter++, "Vista de la tabla de contenido (índice) del documento Word generado")
  );

  // Sección 28: Ubicación de Fotos en el Documento Word Generado
  docContent.push(
    ...crearTitulo("UBICACIÓN DE FOTOS EN EL DOCUMENTO WORD GENERADO", HeadingLevel.HEADING_1, true),
    crearParrafo("Las fotografías aparecen en el documento Word generado en el siguiente orden:"),
    ...crearListaItems([
      "Foto de Portada: Aparece en la primera página (portada), después del título y nombre de la empresa, con el texto 'Fachada del riesgo' debajo",
      "Mapa de Ubicación: Aparece en la sección '5. LINDEROS' después de las coordenadas",
      "Registro Fotográfico: Aparece al final del documento en la sección '18. REGISTRO FOTOGRÁFICO'",
      "Cada foto del registro fotográfico incluye su descripción (si fue proporcionada) debajo de la imagen"
    ]),
    crearParrafo("Las imágenes se ajustan automáticamente al ancho de la página manteniendo sus proporciones. La foto de portada tiene un tamaño aproximado de 400x250 píxeles.")
  );

  // Sección 29: Consejos y Recomendaciones
  docContent.push(
    ...crearTitulo("CONSEJOS Y RECOMENDACIONES", HeadingLevel.HEADING_1, true),
    crearParrafo("Para obtener el mejor resultado:"),
    ...crearListaItems([
      "Complete todas las secciones relevantes antes de generar el documento",
      "Guarde su progreso frecuentemente usando el botón 'Guardar en Historial'",
      "Tome fotografías de alta calidad y con buena iluminación",
      "Sea específico y detallado en las descripciones",
      "Revise la información antes de exportar el documento Word",
      "El formulario se guarda automáticamente en el navegador mientras trabaja",
      "Puede acceder a formularios guardados desde el menú de Historial"
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
    const nombreArchivo = `Manual_Formulario_Inspeccion_Riesgos_${new Date().getTime()}.docx`;
    saveAs(blob, nombreArchivo);
return { success: true, nombreArchivo };
  } catch (error) {
    console.error('❌ Error al generar manual:', error);
    throw error;
  }
};
