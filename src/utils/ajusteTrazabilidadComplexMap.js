/**
 * Alineación Ajuste ↔ Complex (historialDocs + campos de protocolo).
 * Mantener en sync con grupoproser-backend/config/ajusteTrazabilidadComplexMap.js
 */

/**
 * Fechas de hito de trazabilidad: una vez guardadas solo pueden cambiarse
 * con edición manual explícita en el caso Complex.
 */
export const CAMPOS_FECHA_HITOS_TRAZABILIDAD = [
  'fchaAsgncion',
  'fchaContIni',
  'fchaCoordInspeccion',
  'fchaProgInspeccion',
  'fchaInspccion',
  'fchaSoliDocu',
  'fchaInfoPrelm',
  'fchaRepoActi',
  'fchaInfoFnal',
  'fchaPresentacionCifras',
  'fchaAceptacionCifrasAseguradora',
  'fchaEnvioFiniquito',
];

export const MAPEO_TIPO_HISTORIAL_A_COMPLEX = {
  contactoInicial: {
    campoAnexo: 'anexContIni',
    campoFecha: 'fchaContIni',
  },
  inspeccion: {
    campoAnexo: 'anexActaInspccion',
    campoFecha: 'fchaInspccion',
  },
  solicitudDocs: {
    campoAnexo: 'anexSolDoc',
    campoFecha: 'fchaSoliDocu',
  },
  informePreliminar: {
    campoAnexo: 'anxoInfPrelim',
    campoFecha: 'fchaInfoPrelm',
  },
  ultimoDocumento: {
    campoAnexo: 'anxoRepoActi',
    campoFecha: 'fchaRepoActi',
  },
  informeFinal: {
    campoAnexo: 'anxoInfoFnal',
    campoFecha: 'fchaInfoFnal',
  },
  presentacionCifras: {
    campoAnexo: 'anxoPresentacionCifras',
    campoFecha: 'fchaPresentacionCifras',
  },
  envioFiniquito: {
    campoAnexo: 'anxoEnvioFiniquito',
    campoFecha: 'fchaEnvioFiniquito',
  },
};

export const MAPEO_ESTADO_AJUSTE_A_TIPO_HISTORIAL = {
  actaInspeccion: 'inspeccion',
  inicial: 'informePreliminar',
  preeliminar: 'informePreliminar',
  actualizacion: 'ultimoDocumento',
  informeFinal: 'informeFinal',
};

export const CAMPOS_FECHA_FORMULARIO_AJUSTE_POR_TIPO = {
  inspeccion: 'fechaInspeccion',
  informePreliminar: 'fechaReporte',
  ultimoDocumento: 'fechaActualizacion',
  informeFinal: 'fechaInformeFinal',
};

export function tipoHistorialDesdeEstadoAjuste(estado) {
  return MAPEO_ESTADO_AJUSTE_A_TIPO_HISTORIAL[estado] || 'informePreliminar';
}

/**
 * Construye campos de protocolo para un guardado desde Ajuste (un tipo/versión).
 * Por defecto NO sobrescribe la fecha del hito si el caso ya la tiene
 * (editar el formato/acta no debe mover fchaInspccion, fchaInfoPrelm, etc.).
 */
export function buildCamposProtocoloDesdeAjuste({
  tipoHistorial,
  nombreArchivo,
}) {
  const cfg = MAPEO_TIPO_HISTORIAL_A_COMPLEX[tipoHistorial];
  if (!cfg || !nombreArchivo) return {};

  // Ajuste/acta: NUNCA escribe fechas de hito. Solo actualiza el anexo (archivo).
  // La fecha la pone o corrige únicamente quien edita el caso Complex a mano.
  const out = {};
  if (cfg.campoAnexo) out[cfg.campoAnexo] = String(nombreArchivo).trim();
  return out;
}

export function resolverFechaFormularioAjuste(datosFormulario, tipoHistorial, fechaFallback) {
  const campo = CAMPOS_FECHA_FORMULARIO_AJUSTE_POR_TIPO[tipoHistorial];
  if (!campo || !datosFormulario) return fechaFallback || '';
  const valor = String(datosFormulario[campo] || '').trim();
  return valor || fechaFallback || '';
}

/** Extrae la fecha de protocolo ya guardada en el caso para un tipo de historial. */
export function obtenerFechaProtocoloCaso(caso, tipoHistorial) {
  const cfg = MAPEO_TIPO_HISTORIAL_A_COMPLEX[tipoHistorial];
  if (!cfg?.campoFecha || !caso) return '';
  return String(caso[cfg.campoFecha] || '').trim();
}
