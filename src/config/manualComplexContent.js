/**
 * Manual de utilización — módulo COMPLEX (Arnald DataFlow).
 * Contenido mostrado en la pestaña Manual dentro de Indicadores y alertas.
 */

export const MANUAL_COMPLEX_VERSION = '2026-07';
export const MANUAL_COMPLEX_TITULO = 'Manual de utilización — COMPLEX';

export const SECCIONES_MANUAL_COMPLEX = [
  {
    id: 'intro',
    titulo: '1. ¿Qué es COMPLEX en Arnald?',
    contenido: [
      'COMPLEX es el módulo para gestionar siniestros de ajuste: datos del caso, trazabilidad por etapas, documentos, indicadores de tiempo y alertas según el protocolo oficial.',
      'Cada caso tiene un número de ajuste, responsable (ajustador), aseguradora y fechas de cada hito del proceso.',
    ],
  },
  {
    id: 'casos',
    titulo: '2. Crear y editar un caso',
    contenido: [
      'Menú Complex → Mis casos o Reporte: abra el formulario del caso.',
      'En Datos generales registre asegurado, póliza, estado y **fecha y hora de asignación** (importante para medir el primer contacto en 12 horas).',
      'Guarde el caso después de cada avance importante. El autoguardado puede estar activo según configuración.',
    ],
  },
  {
    id: 'trazabilidad',
    titulo: '3. Trazabilidad del caso',
    contenido: [
      'Pestaña Trazabilidad: cada bandeja corresponde a una fase del protocolo (contacto, inspección, documentos, informes, cifras, finiquito).',
      'Registre **fecha y hora** en cada hito; así se calculan bien los plazos en horas (12 h, 24 h) y los indicadores.',
      'Adjunte documentos en cada etapa cuando corresponda. El resumen superior muestra días transcurridos y documentos cargados.',
      'El aviso del protocolo al entrar se oculta solo; puede cerrarlo con la X si no lo necesita.',
    ],
  },
  {
    id: 'contacto',
    titulo: '4. Contacto inicial y correo',
    contenido: [
      'En la bandeja Contacto inicial puede generar el correo al asegurado según el ramo.',
      'La plantilla lista solo los documentos del PDF «Solicitud básica de datos — COMPLEX»; no incluye textos adicionales fuera del protocolo.',
      'Revise destinatario, asunto y cuerpo antes de copiar o enviar. El asunto incluye siniestro, póliza, asegurado y aseguradora.',
    ],
  },
  {
    id: 'indicadores-historicos',
    titulo: '5. Indicadores históricos',
    contenido: [
      'Menú Indicadores y alertas → pestaña Indicadores históricos.',
      'Filtre por periodo (Desde / Hasta) y opcionalmente por responsable.',
      'Muestra tiempos promedio entre etapas y casos en espera de documentos. Los tiempos se muestran en días u horas **aproximadas** (~2 días).',
      'Incluye casos asignados desde el 01/01/2025.',
    ],
  },
  {
    id: 'indicadores-protocolo',
    titulo: '6. Indicadores del nuevo protocolo',
    contenido: [
      'Pestaña Indicadores protocolo: cumplimiento vs plazos oficiales (desde 01/10/2025).',
      'Cada indicador mide desde el **hito anterior** (solo el primer contacto parte de la asignación).',
      'Use el consolidado general y la tabla por ajustador. Vista resumen combina tiempo y %; vista detallada separa columnas.',
      'Filtros: solo Desde / Hasta (fecha de asignación) y desglose por ajustador, compañía o ramo.',
    ],
  },
  {
    id: 'alertas',
    titulo: '7. Mis alertas',
    contenido: [
      'Pestaña Mis alertas: avisos de sus casos asignados según vencimientos del protocolo.',
      'Las alertas usan las fechas y horas registradas en trazabilidad.',
      'Desde cada alerta puede abrir el caso para registrar el avance o la fecha faltante.',
    ],
  },
  {
    id: 'informe',
    titulo: '8. Informe de indicadores (Excel)',
    contenido: [
      'Pestaña Informe 2025: genera un archivo Excel con resumen histórico, desglose por ajustador, resumen de protocolo y cumplimiento.',
      'Ajuste los periodos si necesita otro rango y pulse «Descargar informe Excel».',
      'Entregue el archivo a gerencia o archivo del área según solicitud.',
    ],
  },
  {
    id: 'buenas-practicas',
    titulo: '9. Buenas prácticas',
    contenido: [
      'Registrar la hora real de asignación, contacto e inspección el mismo día del evento.',
      'No dejar etapas sin fecha si ya ocurrieron; los indicadores y alertas dependen de esos datos.',
      'En esperas del asegurado o la compañía, dejar observación en trazabilidad o seguimientos.',
      'Ante dudas sobre plazos, consulte la pestaña Indicadores protocolo (plazo indicado en cada paso).',
    ],
  },
];
