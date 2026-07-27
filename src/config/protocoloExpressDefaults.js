/**
 * ANS / protocolo Express — espejo frontend de backend/config/protocoloExpressDefaults.js
 */

export const PROTOCOLO_EXPRESS_VERSION = '2026-07-24-ans';
export const PROTOCOLO_EXPRESS_FECHA_ACTIVACION = '2026-07-24';
export const PROTOCOLO_EXPRESS_DOCUMENTO =
  'ANS Express — Acuerdos de Nivel de Servicio (julio 2026)';

export const PROTOCOLO_EXPRESS_OBJETIVO =
  'Medir el cumplimiento de los plazos ANS Express en días hábiles de Colombia (sin sábados, domingos ni festivos).';

export const FECHA_INICIO_PROTOCOLO_EXPRESS = '2026-07-01';
export const FECHA_INICIO_PROTOCOLO_EXPRESS_LABEL = '01/07/2026';

export const CODIGOS_ESTADO_EXPRESS_SIN_PROTOCOLO = ['2', '8'];

export const ETAPAS_PROTOCOLO_EXPRESS_DEFAULT = [
  {
    id: 'solicitudInicialDocs',
    fase: 1,
    nombre: 'Solicitud inicial de documentos',
    campoFecha: 'fechaSolicitudDocumentos',
    campoDoc: null,
    referencia: 'avisoSiniestro',
    referenciaAlternativa: 'avisoSiniestroCompania',
    limite: { valor: 3, unidad: 'dias_habiles' },
    alertaVencimiento: true,
  },
  {
    id: 'acuseReciboDocs',
    fase: 2,
    nombre: 'Acuse de recibo de documentación',
    campoFecha: 'fechaAcuseReciboDocumentos',
    campoDoc: null,
    referencia: 'fechaReciboDocumentos',
    limite: { valor: 3, unidad: 'dias_habiles' },
    alertaVencimiento: true,
  },
  {
    id: 'definicionCaso',
    fase: 3,
    nombre: 'Definición del caso o documentación adicional',
    campoFecha: 'fechaDefinicionCaso',
    campoDoc: null,
    referencia: 'fechaUltimoDocumento',
    referenciaAlternativa: 'fechaReciboDocumentos',
    limite: { valor: 5, unidad: 'dias_habiles' },
    alertaVencimiento: true,
    criterioCompletitud: 'definicionODocsAdicionalesExpress',
  },
  {
    id: 'correcciones',
    fase: 4,
    nombre: 'Correcciones requeridas',
    campoFecha: 'fechaCorreccionesPresentadas',
    campoDoc: null,
    referencia: 'fechaSolicitudCorrecciones',
    limite: { valor: 1, unidad: 'dias_habiles' },
    alertaVencimiento: true,
  },
  {
    id: 'presentacionCifras',
    fase: 5,
    nombre: 'Presentación de cifras',
    campoFecha: 'fechaPresentacionCifras',
    campoDoc: null,
    referencia: 'fechaDefinicionCaso',
    referenciaAlternativa: 'fechaRespuestaAnalista',
    limite: { valor: 1, unidad: 'dias_habiles' },
    alertaVencimiento: true,
  },
  {
    id: 'documentosPago',
    fase: 6,
    nombre: 'Documentos para pago',
    campoFecha: 'fechaDocumentosPago',
    campoDoc: null,
    referencia: 'fechaPresentacionCifras',
    limite: { valor: 1, unidad: 'dias_habiles' },
    alertaVencimiento: true,
    criterioCompletitud: 'documentosPagoExpress',
  },
];

export const RESUMEN_PLAZOS_PROTOCOLO_EXPRESS = [
  { valor: '3 días hábiles', titulo: 'Solicitud inicial de documentos', etapaId: 'solicitudInicialDocs' },
  { valor: '3 días hábiles', titulo: 'Acuse de recibo', etapaId: 'acuseReciboDocs' },
  { valor: '5 días hábiles', titulo: 'Definición / docs adicionales', etapaId: 'definicionCaso' },
  { valor: '1 día hábil', titulo: 'Correcciones, cifras y docs pago', etapaId: 'presentacionCifras' },
];

export const NOTAS_PROTOCOLO_EXPRESS = [
  'Los plazos se miden en días hábiles Colombia (excluye fines de semana y festivos).',
  'Solo se evalúan etapas con fecha de inicio y fecha de cierre registradas.',
  'La definición del caso también se cumple con solicitud de documentación adicional.',
  'Documentos para pago también se cumplen con fecha de cargue de finiquito.',
];

/** Pares muestra ↔ etapa para % de cumplimiento. */
export const INDICADORES_CUMPLIMIENTO_EXPRESS = [
  { muestra: 'solicitudInicialDocs', etapaId: 'solicitudInicialDocs' },
  { muestra: 'acuseReciboDocs', etapaId: 'acuseReciboDocs' },
  { muestra: 'definicionCaso', etapaId: 'definicionCaso' },
  { muestra: 'correcciones', etapaId: 'correcciones' },
  { muestra: 'presentacionCifras', etapaId: 'presentacionCifras' },
  { muestra: 'documentosPago', etapaId: 'documentosPago' },
];

export const SECUENCIA_INDICADORES_TIEMPO_EXPRESS = [
  {
    muestra: 'solicitudInicialDocs',
    desde: 'avisoSiniestro',
    hasta: 'fechaSolicitudDocumentos',
    fallbackDesde: 'avisoSiniestroCompania',
    unidad: 'dias_habiles',
  },
  {
    muestra: 'acuseReciboDocs',
    desde: 'fechaReciboDocumentos',
    hasta: 'fechaAcuseReciboDocumentos',
    unidad: 'dias_habiles',
  },
  {
    muestra: 'definicionCaso',
    desde: 'fechaUltimoDocumento',
    hasta: 'fechaDefinicionCaso',
    fallbackDesde: 'fechaReciboDocumentos',
    hastaAlternativo: 'fechaSolicitudDocumentosAdicionales',
    unidad: 'dias_habiles',
  },
  {
    muestra: 'correcciones',
    desde: 'fechaSolicitudCorrecciones',
    hasta: 'fechaCorreccionesPresentadas',
    unidad: 'dias_habiles',
  },
  {
    muestra: 'presentacionCifras',
    desde: 'fechaDefinicionCaso',
    hasta: 'fechaPresentacionCifras',
    fallbackDesde: 'fechaRespuestaAnalista',
    unidad: 'dias_habiles',
  },
  {
    muestra: 'documentosPago',
    desde: 'fechaPresentacionCifras',
    hasta: 'fechaDocumentosPago',
    hastaAlternativo: 'fechaCargueFiniquito',
    unidad: 'dias_habiles',
  },
];

export const INDICADORES_PROTOCOLO_EXPRESS_DEF = [
  {
    clave: 'promedioSolicitudInicialDocs',
    muestra: 'solicitudInicialDocs',
    label: 'Aviso → Solicitud de documentos',
    desdeLegible: 'aviso de siniestro',
    hastaLegible: 'solicitud inicial de documentos',
    plazoLegible: '3 días hábiles',
    etapaId: 'solicitudInicialDocs',
    plazoObjetivo: '3 días hábiles desde el aviso',
  },
  {
    clave: 'promedioAcuseReciboDocs',
    muestra: 'acuseReciboDocs',
    label: 'Recibo → Acuse de documentación',
    desdeLegible: 'recibo de documentos',
    hastaLegible: 'acuse de recibo',
    plazoLegible: '3 días hábiles',
    etapaId: 'acuseReciboDocs',
    plazoObjetivo: '3 días hábiles desde el recibo',
  },
  {
    clave: 'promedioDefinicionCaso',
    muestra: 'definicionCaso',
    label: 'Último documento → Definición',
    desdeLegible: 'último documento',
    hastaLegible: 'definición o docs adicionales',
    plazoLegible: '5 días hábiles',
    etapaId: 'definicionCaso',
    plazoObjetivo: '5 días hábiles desde el último documento',
  },
  {
    clave: 'promedioCorrecciones',
    muestra: 'correcciones',
    label: 'Solicitud → Correcciones',
    desdeLegible: 'solicitud de correcciones',
    hastaLegible: 'correcciones presentadas',
    plazoLegible: '1 día hábil',
    etapaId: 'correcciones',
    plazoObjetivo: '1 día hábil desde la solicitud de correcciones',
  },
  {
    clave: 'promedioPresentacionCifras',
    muestra: 'presentacionCifras',
    label: 'Definición → Presentación de cifras',
    desdeLegible: 'definición del caso',
    hastaLegible: 'presentación de cifras',
    plazoLegible: '1 día hábil',
    etapaId: 'presentacionCifras',
    plazoObjetivo: '1 día hábil desde la definición',
  },
  {
    clave: 'promedioDocumentosPago',
    muestra: 'documentosPago',
    label: 'Cifras → Documentos para pago',
    desdeLegible: 'presentación de cifras',
    hastaLegible: 'documentos para pago',
    plazoLegible: '1 día hábil',
    etapaId: 'documentosPago',
    plazoObjetivo: '1 día hábil desde la presentación de cifras',
  },
];

export function etiquetaLimiteExpress(limite) {
  if (!limite) return '';
  const { valor, unidad } = limite;
  if (unidad === 'dias_habiles') {
    return `${valor} día${valor !== 1 ? 's' : ''} hábil${valor !== 1 ? 'es' : ''}`;
  }
  if (unidad === 'horas') return `${valor} hora${valor !== 1 ? 's' : ''}`;
  return `${valor} día${valor !== 1 ? 's' : ''}`;
}

export function plazoObjetivoIndicadorExpress(clave, protocolo) {
  const def = INDICADORES_PROTOCOLO_EXPRESS_DEF.find((i) => i.clave === clave);
  if (!def) return '';
  const etapa = def.etapaId && protocolo?.etapas?.find((e) => e.id === def.etapaId);
  if (!etapa?.limite) return def.plazoObjetivo;
  return etiquetaLimiteExpress(etapa.limite);
}

export function obtenerProtocoloExpressPorDefecto() {
  return {
    clave: 'express',
    version: PROTOCOLO_EXPRESS_VERSION,
    documento: PROTOCOLO_EXPRESS_DOCUMENTO,
    fechaActivacion: PROTOCOLO_EXPRESS_FECHA_ACTIVACION,
    etapas: ETAPAS_PROTOCOLO_EXPRESS_DEFAULT.map((e) => ({
      ...e,
      limite: e.limite ? { ...e.limite } : null,
      limiteMaximo: e.limiteMaximo ? { ...e.limiteMaximo } : null,
    })),
  };
}
