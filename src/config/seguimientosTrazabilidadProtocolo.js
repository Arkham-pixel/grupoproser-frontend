/**
 * Seguimientos recurrentes en trazabilidad — alineados al protocolo 26 jun 2026.
 * @see PROTOCOLO ATENCIÓN DE SINIESTROS - ÚLTIMA VERSIÓN (PDF)
 */

export const SEGUIMIENTOS_TRAZABILIDAD = [
  {
    tipoHistorial: 'seguimientoDocsPendientes',
    protocoloId: 'seguimientoDocumentos',
    fase: 8,
    tituloBandeja: 'Seguimiento de documentos pendientes',
    actividad: 'Seguimiento de documentos pendientes',
    plazo: 'Primer recordatorio a los 10 días hábiles; luego cada 15 días calendario',
    entregable: 'Correos de seguimiento y actualización del estado documental',
    control: 'Alerta ARNALD recurrente hasta completar soportes',
    responsable: 'Ajustador asignado / analista documental',
    referenciaCampo: 'fchaSoliDocu',
    hastaCampo: 'fchaRepoActi',
    campoSyncFecha: 'fchaUltSegui',
    intervaloDias: 15,
    destinatarios: [
      { value: 'intermediario', label: 'Intermediario' },
      { value: 'asegurado', label: 'Asegurado / beneficiario' },
      { value: 'reclamante', label: 'Reclamante' },
    ],
    tiposCorreo: null,
    notaProtocolo:
      'Mantener seguimiento documental hasta la acreditación del siniestro (fecha del último documento requerido).',
  },
  {
    tipoHistorial: 'seguimientoAutorizacionCompania',
    protocoloId: 'seguimientoAutorizacion',
    fase: 11,
    tituloBandeja: 'Seguimiento de autorización por parte de la compañía',
    actividad: 'Seguimiento de autorización de cifras por la compañía',
    plazo: 'Primer recordatorio a los 10 días hábiles; luego cada 5 días calendario',
    entregable:
      'Evidencia del correo a la compañía de seguros solicitando o reiterando la autorización de cifras',
    control: 'Alerta ARNALD cada 5 días calendario desde el informe final hasta la aprobación',
    responsable: 'Ajustador asignado (seguimiento) / Compañía (aprobación)',
    referenciaCampo: 'fchaInfoFnal',
    hastaCampo: 'fchaAceptacionCifrasAseguradora',
    campoSyncFecha: null,
    intervaloDias: 5,
    destinatarios: null,
    tiposCorreo: [
      { value: 'solicitud', label: 'Solicitud de autorización' },
      { value: 'reiteracion', label: 'Reiteración de autorización' },
    ],
    notaProtocolo:
      'Correo exclusivamente a la compañía de seguros. Plazo estimado de respuesta: 2–3 días hábiles desde el informe final.',
  },
  {
    tipoHistorial: 'seguimientoDocumentosPago',
    protocoloId: 'seguimientoPago',
    fase: 13,
    tituloBandeja: 'Seguimiento de documentos de pago',
    actividad: 'Seguimiento de documentos para pago',
    plazo: 'Primer recordatorio a los 10 días hábiles; luego cada 15 días calendario',
    entregable:
      'Seguimiento a finiquitos, certificación bancaria, RUT, SARLAFT y demás documentos requeridos',
    control: 'Alerta ARNALD recurrente hasta completar documentos de pago',
    responsable: 'Ajustador asignado / analista documental',
    referenciaCampo: 'fchaAceptacionCifrasAseguradora',
    hastaCampo: 'fchaEnvioFiniquito',
    campoSyncFecha: null,
    intervaloDias: 15,
    destinatarios: [
      { value: 'intermediario', label: 'Intermediario' },
      { value: 'asegurado', label: 'Asegurado / beneficiario' },
      { value: 'reclamante', label: 'Reclamante' },
    ],
    tiposCorreo: [
      { value: 'solicitud', label: 'Solicitud de documentos' },
      { value: 'reiteracion', label: 'Reiteración de documentos' },
      { value: 'seguimiento', label: 'Seguimiento de documentos' },
    ],
    notaProtocolo:
      'Activo tras la aprobación de cifras por la compañía. Mantener hasta completar los documentos de pago.',
  },
];

export function obtenerSeguimientoTrazabilidad(tipoHistorial) {
  return SEGUIMIENTOS_TRAZABILIDAD.find((s) => s.tipoHistorial === tipoHistorial) || null;
}

export function obtenerSeguimientoPorProtocoloId(protocoloId) {
  return SEGUIMIENTOS_TRAZABILIDAD.find((s) => s.protocoloId === protocoloId) || null;
}
