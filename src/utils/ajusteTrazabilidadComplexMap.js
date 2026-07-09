/**
 * Alineación Ajuste ↔ Complex (historialDocs + campos de protocolo).
 * Mantener en sync con grupoproser-backend/config/ajusteTrazabilidadComplexMap.js
 */

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

export function buildCamposProtocoloDesdeAjuste({
  tipoHistorial,
  nombreArchivo,
  fechaPreferida,
  fechaFallback,
}) {
  const cfg = MAPEO_TIPO_HISTORIAL_A_COMPLEX[tipoHistorial];
  if (!cfg || !nombreArchivo) return {};

  const fecha = String(fechaPreferida || fechaFallback || '').trim();
  const out = {};
  if (cfg.campoAnexo) out[cfg.campoAnexo] = String(nombreArchivo).trim();
  if (cfg.campoFecha && fecha) out[cfg.campoFecha] = fecha;
  return out;
}

export function resolverFechaFormularioAjuste(datosFormulario, tipoHistorial, fechaFallback) {
  const campo = CAMPOS_FECHA_FORMULARIO_AJUSTE_POR_TIPO[tipoHistorial];
  if (!campo || !datosFormulario) return fechaFallback || '';
  const valor = String(datosFormulario[campo] || '').trim();
  return valor || fechaFallback || '';
}
