/**
 * Manual de utilización — módulo COMPLEX (Arnald DataFlow).
 * Contenido mostrado en la pestaña Manual dentro de Indicadores y alertas.
 *
 * Bloques soportados:
 * - texto: párrafo
 * - lista: viñetas
 * - subtitulo: encabezado dentro de la sección
 * - imagen: zona para captura (archivo en /public/manual-complex/)
 * - nota: recuadro informativo
 */

export const MANUAL_COMPLEX_VERSION = '2026-07';
export const MANUAL_COMPLEX_TITULO = 'Manual de utilización — COMPLEX';
export const MANUAL_COMPLEX_RUTA_IMAGENES = '/manual-complex';

export const SECCIONES_MANUAL_COMPLEX = [
  {
    id: 'intro',
    titulo: '1. ¿Qué es el área COMPLEX?',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'COMPLEX es el módulo de Arnald DataFlow para la gestión integral de siniestros de ajuste. Desde aquí se registran los casos, se documenta la trazabilidad hito a hito, se miden los tiempos de gestión y se generan alertas según el protocolo oficial de atención de siniestros.',
      },
      {
        tipo: 'lista',
        items: [
          'Mis casos / Reporte: crear, editar y consultar siniestros.',
          'Formulario del caso: datos generales, trazabilidad, documentos y formularios de ajuste.',
          'Indicadores y alertas: mediciones de gestión, cumplimiento del protocolo y avisos de vencimiento.',
        ],
      },
      {
        tipo: 'nota',
        contenido:
          'Todo el módulo está alineado al protocolo vigente desde el 01/10/2025. Los indicadores históricos incluyen casos desde el 01/01/2025.',
      },
      {
        tipo: 'imagen',
        id: 'menu-complex',
        archivo: '01-menu-complex.png',
        leyenda: 'Fig. 1 — Navegación del módulo COMPLEX',
        instruccion:
          'Coloque aquí una captura del menú o pantalla principal de COMPLEX (Mis casos, Indicadores y alertas, etc.).',
      },
    ],
  },
  {
    id: 'casos',
    titulo: '2. Crear y editar un caso',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'Cada caso tiene un número de ajuste, aseguradora, responsable (ajustador) y un conjunto de fechas que alimentan los indicadores y las alertas. La calidad de esos datos determina la utilidad de los reportes.',
      },
      {
        tipo: 'subtitulo',
        contenido: 'Datos generales',
      },
      {
        tipo: 'lista',
        items: [
          'Registre asegurado, póliza, estado del caso y **fecha y hora de asignación**.',
          'La hora de asignación es crítica: el primer contacto debe ocurrir dentro de las **12 horas** del protocolo.',
          'Asigne el ajustador responsable; sin responsable, la etapa de cargue interno puede generar alerta.',
          'Guarde el caso después de cada avance. Use el botón Guardar o el autoguardado si está activo.',
        ],
      },
      {
        tipo: 'imagen',
        id: 'datos-generales',
        archivo: '02-datos-generales.png',
        leyenda: 'Fig. 2 — Datos generales del caso',
        instruccion:
          'Captura de la pestaña Datos generales mostrando fecha/hora de asignación y responsable.',
      },
    ],
  },
  {
    id: 'trazabilidad',
    titulo: '3. Trazabilidad del caso',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'La pestaña **Trazabilidad** es el corazón operativo del caso. Cada bandeja corresponde a una fase del protocolo: recepción, contacto, coordinación, inspección, solicitud de documentos, informes, seguimientos, cifras y finiquito.',
      },
      {
        tipo: 'subtitulo',
        contenido: 'Resumen superior',
      },
      {
        tipo: 'lista',
        items: [
          'Tarjetas por etapa con cantidad de documentos y tiempo transcurrido.',
          'Indicador de estado: «A tiempo», «En proceso» o «Retraso» según el plazo de cada fase.',
          'Estado general del caso en la parte inferior del resumen.',
        ],
      },
      {
        tipo: 'imagen',
        id: 'trazabilidad-resumen',
        archivo: '03-trazabilidad-resumen.png',
        leyenda: 'Fig. 3 — Resumen de trazabilidad por etapas',
        instruccion:
          'Captura del bloque «Resumen de Trazabilidad» con las tarjetas de cada fase.',
      },
      {
        tipo: 'subtitulo',
        contenido: 'Bandejas desplegables (fases)',
      },
      {
        tipo: 'lista',
        items: [
          'Cada fase muestra el **plazo del protocolo** (ej. 12 h, 3 días hábiles, 10 días hábiles de espera externa).',
          'Registre **fecha y hora** en cada hito; los plazos en horas (12 h, 24 h) solo son precisos con hora incluida.',
          'Adjunte documentos cuando corresponda (acta, informe preliminar, etc.).',
          'El reloj junto al título indica el tiempo transcurrido desde la fecha de referencia de esa etapa.',
          'Icono de advertencia (▲) y texto en rojo = retraso respecto al plazo oficial.',
        ],
      },
      {
        tipo: 'imagen',
        id: 'trazabilidad-fase',
        archivo: '04-trazabilidad-fase.png',
        leyenda: 'Fig. 4 — Detalle de una fase (fecha, plazo y documentos)',
        instruccion:
          'Captura de una fase desplegada (ej. Informe preliminar) con plazo protocolo, fecha y documento adjunto.',
      },
      {
        tipo: 'nota',
        contenido:
          'El tiempo de cada fase se mide desde el hito anterior registrado. Ejemplo: el informe preliminar cuenta desde la solicitud de documentos (o desde la inspección si no hubo solicitud), no desde la asignación.',
      },
    ],
  },
  {
    id: 'indicadores-trazabilidad',
    titulo: '4. Indicadores en la trazabilidad (cómo se calculan)',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'Los indicadores que ve en cada bandeja de trazabilidad son **operativos**: ayudan al ajustador a saber si va a tiempo en esa fase concreta. No son lo mismo que los indicadores de la pestaña «Indicadores protocolo» (que miden cumplimiento global), pero usan las mismas fechas.',
      },
      {
        tipo: 'subtitulo',
        contenido: 'Fecha de referencia',
      },
      {
        tipo: 'texto',
        contenido:
          'Para cada etapa, el sistema toma una fecha de inicio (referencia) y la compara con la fecha del hito o del último documento. La referencia depende de la fase:',
      },
      {
        tipo: 'lista',
        items: [
          'Contacto inicial → desde **asignación**.',
          'Inspección → desde **contacto inicial** (o fecha programada si aplica).',
          'Solicitud de documentos → desde **inspección**.',
          'Informe preliminar → desde **solicitud de documentos** (o inspección).',
          'Informe final → desde **último documento acreditado**.',
          'Coordinación de inspección → espera externa: alerta a los 10 días hábiles sin fecha programada.',
        ],
      },
      {
        tipo: 'subtitulo',
        contenido: 'Colores y mensajes',
      },
      {
        tipo: 'lista',
        items: [
          '**Gris / reloj**: tiempo transcurrido dentro del plazo o sin retraso calculado.',
          '**Rojo / advertencia**: se superó el plazo (muestra horas o días de retraso).',
          '«0 horas» o «0 días»: el hito se registró el mismo día o dentro del margen.',
          'En documentos adjuntos se muestra «Referencia» y «Agregado» para auditar el cálculo.',
        ],
      },
      {
        tipo: 'subtitulo',
        contenido: 'Plazos frecuentes del protocolo',
      },
      {
        tipo: 'lista',
        items: [
          'Primer contacto: **12 horas** desde asignación.',
          'Inspección de campo: ideal **24 h**, máximo **72 h** desde contacto.',
          'Solicitud de documentos: **12 horas** desde inspección.',
          'Informe preliminar: **3 días hábiles** desde solicitud (o inspección).',
          'Informe final: **3 días hábiles** desde acreditación (excluye fines de semana y festivos de Colombia).',
          'Seguimiento documental: primer recordatorio a **10 días hábiles**, luego cada **15 días calendario**.',
        ],
      },
      {
        tipo: 'nota',
        contenido:
          'Si una fase aparece en rojo pero usted cree que va en regla, verifique que la fecha de referencia anterior esté bien registrada (con hora) y que la fecha del hito actual sea la real del evento, no la de carga del archivo.',
      },
    ],
  },
  {
    id: 'contacto',
    titulo: '5. Contacto inicial y plantilla de correo',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'En la bandeja **Contacto inicial** puede generar el correo al asegurado según el ramo del siniestro, usando la plantilla acordada con gerencia.',
      },
      {
        tipo: 'lista',
        items: [
          'La plantilla lista solo documentos del PDF «Solicitud básica de datos — COMPLEX».',
          'Seleccione tipo de siniestro, fechas de inspección y documentos a solicitar.',
          'Al copiar, se conservan las negrillas para pegar en Outlook.',
          'Revise destinatario, asunto y cuerpo antes de enviar.',
        ],
      },
      {
        tipo: 'imagen',
        id: 'contacto-inicial',
        archivo: '09-contacto-inicial.png',
        leyenda: 'Fig. 5 — Plantilla de correo de contacto inicial',
        instruccion:
          'Captura de la bandeja Contacto inicial con la plantilla de correo desplegada.',
      },
    ],
  },
  {
    id: 'indicadores-historicos',
    titulo: '6. Indicadores históricos (pestaña)',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'Menú **Indicadores y alertas → Indicadores históricos**. Muestra cómo ha sido la gestión del área en un periodo, sin exigir cumplimiento estricto del protocolo nuevo.',
      },
      {
        tipo: 'lista',
        items: [
          'Filtros: **Desde / Hasta** y opcionalmente responsable.',
          'Tiempos promedio entre etapas (asignación→contacto, contacto→inspección, etc.).',
          'Casos en espera de documentos y desglose por responsable.',
          'Los tiempos se muestran aproximados (~2 días, ~12 horas).',
          'Incluye casos asignados desde el 01/01/2025.',
        ],
      },
      {
        tipo: 'imagen',
        id: 'indicadores-historicos',
        archivo: '05-indicadores-historicos.png',
        leyenda: 'Fig. 6 — Pantalla de indicadores históricos',
        instruccion:
          'Captura de la pestaña Indicadores históricos con filtros, tarjetas y gráficas.',
      },
    ],
  },
  {
    id: 'indicadores-protocolo',
    titulo: '7. Indicadores del protocolo (pestaña)',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'Menú **Indicadores y alertas → Indicadores protocolo**. Mide el **% de cumplimiento** frente a los plazos oficiales para casos asignados desde el **01/10/2025**.',
      },
      {
        tipo: 'subtitulo',
        contenido: 'Cómo se mide cada indicador',
      },
      {
        tipo: 'lista',
        items: [
          'Cada indicador mide desde el **hito anterior** (secuencia hito a hito).',
          'Solo el primer contacto parte de la **fecha de asignación**.',
          'Ejemplo: «Inspección → Solicitud docs» mide desde inspección hasta solicitud, no desde asignación.',
          'El % indica cuántos casos completaron esa etapa **dentro del plazo** del protocolo.',
        ],
      },
      {
        tipo: 'subtitulo',
        contenido: 'Vistas disponibles',
      },
      {
        tipo: 'lista',
        items: [
          '**Consolidado general**: cumplimiento global y por cada paso del protocolo.',
          '**Tabla por ajustador**: tiempos y % por responsable.',
          'Vista **resumen** (tiempo + % en la misma celda) o **detallada** (columnas separadas).',
          'Filtros: Desde / Hasta (fecha de asignación), ajustador, compañía o ramo.',
        ],
      },
      {
        tipo: 'imagen',
        id: 'indicadores-protocolo',
        archivo: '06-indicadores-protocolo.png',
        leyenda: 'Fig. 7 — Indicadores del protocolo y tabla por ajustador',
        instruccion:
          'Captura del consolidado, gráficas de cumplimiento y tabla por ajustador.',
      },
    ],
  },
  {
    id: 'alertas',
    titulo: '8. Alertas (cómo funcionan y qué hacer)',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'Las alertas avisan cuando un caso **supera o está por superar** un plazo del protocolo. Se generan automáticamente a partir de las fechas y horas registradas en trazabilidad.',
      },
      {
        tipo: 'subtitulo',
        contenido: 'Dónde verlas',
      },
      {
        tipo: 'lista',
        items: [
          '**Indicadores y alertas → Mis alertas**: listado de sus casos asignados con avisos activos.',
          '**Dentro del caso → Trazabilidad**: panel de alertas del caso y relojes por fase.',
          'Solo aplican a casos del protocolo nuevo (asignación desde 01/10/2025), salvo indicadores históricos.',
        ],
      },
      {
        tipo: 'subtitulo',
        contenido: 'Tipos de alerta',
      },
      {
        tipo: 'lista',
        items: [
          '**Por tiempo**: etapa sin completar y plazo vencido (contacto, inspección, informe, etc.).',
          '**Espera externa**: sin avance del asegurado o compañía tras 10 días hábiles (coordinación, autorización, finiquito).',
          '**Seguimiento recurrente**: recordatorios cada 15 días calendario en fase de documentos pendientes.',
          '**Prioridad ALTA** (rojo): retraso confirmado. **MEDIA** (ámbar): próximo vencimiento o seguimiento.',
        ],
      },
      {
        tipo: 'subtitulo',
        contenido: 'Qué hacer ante una alerta',
      },
      {
        tipo: 'lista',
        items: [
          'Abra el caso desde la alerta (botón o enlace en Mis alertas).',
          'Registre la **fecha y hora real** del hito si ya ocurrió.',
          'Adjunte el documento o evidencia correspondiente.',
          'Si la demora es del asegurado o la compañía, deje **observación** y use seguimientos (fase 8 u otras).',
          'Guarde el caso; la alerta desaparece cuando la etapa queda completa y en plazo.',
        ],
      },
      {
        tipo: 'imagen',
        id: 'mis-alertas',
        archivo: '07-mis-alertas.png',
        leyenda: 'Fig. 8 — Pestaña Mis alertas',
        instruccion:
          'Captura de Mis alertas mostrando casos con prioridad alta/media y mensaje de acción.',
      },
      {
        tipo: 'nota',
        contenido:
          'Una alerta en trazabilidad y un indicador en rojo en la bandeja usan la misma lógica de fechas. Corregir la fecha de referencia o del hito actual actualiza ambos.',
      },
    ],
  },
  {
    id: 'informe',
    titulo: '9. Informe anual (Excel)',
    bloques: [
      {
        tipo: 'texto',
        contenido:
          'Pestaña **Informe 2025**: genera un archivo Excel con resumen histórico, desglose por responsable, resumen del protocolo, cumplimiento por ajustador y notas metodológicas.',
      },
      {
        tipo: 'lista',
        items: [
          'Configure periodos para histórico y protocolo (Desde / Hasta).',
          'Revise la vista previa y las gráficas antes de descargar.',
          'Pulse «Descargar informe Excel» para obtener el archivo con varias hojas.',
          'Entregue el informe a gerencia o archivo según solicitud del área.',
        ],
      },
      {
        tipo: 'imagen',
        id: 'informe-2025',
        archivo: '08-informe-2025.png',
        leyenda: 'Fig. 9 — Informe 2025 y vista previa',
        instruccion:
          'Captura de la pestaña Informe 2025 con filtros, tarjetas comparativas y gráficas.',
      },
    ],
  },
  {
    id: 'buenas-practicas',
    titulo: '10. Buenas prácticas',
    bloques: [
      {
        tipo: 'lista',
        items: [
          'Registrar la **hora real** de asignación, contacto e inspección el mismo día del evento.',
          'No dejar etapas sin fecha si ya ocurrieron; indicadores y alertas dependen de esos datos.',
          'En esperas del asegurado o la compañía, documentar en observaciones y seguimientos.',
          'Ante dudas sobre plazos, consulte la bandeja de la fase (texto «Plazo protocolo») o Indicadores protocolo.',
          'Revise Mis alertas al inicio de la jornada para priorizar casos con vencimiento.',
        ],
      },
    ],
  },
];
