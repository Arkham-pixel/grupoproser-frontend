/**
 * Wire Complex priority screens to complex.ui i18n keys.
 * Run: node scripts/wire-complex-priority.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const esPath = path.join(root, 'src/locales/es.json');
const enPath = path.join(root, 'src/locales/en.json');
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function mergeNs(lang, ns, vals) {
  lang.complex.ui[ns] = { ...(lang.complex.ui[ns] || {}), ...vals };
}

// --- reporte_casos_mejorado ---
const reporteEs = {
  reporte_completo: 'Reporte completo',
  vista_general: 'Vista general de casos Complex en el sistema.',
  casos_columnas: '{{casos}} caso(s) · {{columnas}} columnas visibles',
  filtros: 'Filtros',
  filtra_por: 'Filtra por fechas, estado, responsable, aseguradora y texto.',
  limpiar_filtros: 'Limpiar filtros',
  campo_de_fecha: 'Campo de fecha',
  fecha_desde: 'Fecha desde',
  fecha_hasta: 'Fecha hasta',
  estado: 'Estado',
  todos: 'Todos',
  aseguradora: 'Aseguradora',
  todas: 'Todas',
  responsable: 'Responsable',
  buscar: 'Buscar',
  placeholder_buscar: 'Número de ajuste, siniestro, asegurado, ciudad…',
  columnas: 'Columnas',
  exportar_excel: 'Exportar Excel',
  mostrar_todas: 'Mostrar todas',
  filtros_activos: 'Filtros activos',
  mostrando_de: 'Mostrando {{filtrados}} de {{total}} casos.',
  personalizar_columnas: 'Personalizar columnas',
  cerrar: 'Cerrar',
  arrastra_para_ordenar: 'Arrastra para ordenar. Marca o desmarca para mostrar u ocultar columnas.',
  cancelar: 'Cancelar',
  guardar: 'Guardar',
  acciones: 'Acciones',
  no_hay_registros: 'No hay registros para mostrar.',
  cargando_casos: 'Cargando casos…',
  mostrando_pagina: 'Mostrando {{inicio}} a {{fin}} de {{total}}',
  pagina_de: '· Página {{actual}} de {{paginas}}',
  anterior: 'Anterior',
  siguiente: 'Siguiente',
  placeholder_fecha: 'dd/mm/aaaa',
  no_se_encontro_identificador: 'No se encontró el identificador del caso para editarlo.',
  confirmar_eliminar:
    '¿Estás seguro de que deseas eliminar el caso {{numero}}?\n\nEsta acción no se puede deshacer.',
  no_se_puede_eliminar:
    'Este caso no se puede eliminar desde aquí. Solo se pueden eliminar casos Complex.',
  sin_codigo: 'Sin código',
};

const reporteEn = {
  reporte_completo: 'Full report',
  vista_general: 'Overview of Complex cases in the system.',
  casos_columnas: '{{casos}} case(s) · {{columnas}} visible columns',
  filtros: 'Filters',
  filtra_por: 'Filter by dates, status, person in charge, insurer, and text.',
  limpiar_filtros: 'Clear filters',
  campo_de_fecha: 'Date field',
  fecha_desde: 'Start date',
  fecha_hasta: 'End date',
  estado: 'Status',
  todos: 'All',
  aseguradora: 'Insurance company',
  todas: 'All',
  responsable: 'Person in charge',
  buscar: 'Search',
  placeholder_buscar: 'Adjustment no., claim, insured, city…',
  columnas: 'Columns',
  exportar_excel: 'Export Excel',
  mostrar_todas: 'Show all',
  filtros_activos: 'Active filters',
  mostrando_de: 'Showing {{filtrados}} of {{total}} cases.',
  personalizar_columnas: 'Customize columns',
  cerrar: 'Close',
  arrastra_para_ordenar: 'Drag to reorder. Check or uncheck to show or hide columns.',
  cancelar: 'Cancel',
  guardar: 'Save',
  acciones: 'Actions',
  no_hay_registros: 'No records to display.',
  cargando_casos: 'Loading cases…',
  mostrando_pagina: 'Showing {{inicio}} to {{fin}} of {{total}}',
  pagina_de: '· Page {{actual}} of {{paginas}}',
  anterior: 'Previous',
  siguiente: 'Next',
  placeholder_fecha: 'mm/dd/yyyy',
  no_se_encontro_identificador: 'Case identifier not found for editing.',
  confirmar_eliminar:
    'Are you sure you want to delete case {{numero}}?\n\nThis action cannot be undone.',
  no_se_puede_eliminar:
    'This case cannot be deleted from here. Only Complex cases can be deleted.',
  sin_codigo: 'No code',
};

const camposFechaEs = {
  fchaAsgncion: 'Fecha de Asignación',
  fchaSinstro: 'Fecha Siniestro',
  fchaContIni: 'Fecha Contacto Inicial',
  fchaCoordInspeccion: 'Fecha Coordinación de Inspección',
  fchaProgInspeccion: 'Fecha Programada de Inspección',
  fchaInspccion: 'Fecha de Inspección',
  fchaSoliDocu: 'Fecha Solicitud Documentos',
  fchaInfoPrelm: 'Fecha Informe Preliminar',
  fchaRepoActi: 'Fecha Último Documento / Reporte Actualizado',
  fchaInfoFnal: 'Fecha Informe Final',
  fchaPresentacionCifras: 'Fecha Presentación de Cifras',
  fchaAceptacionCifrasAseguradora: 'Fecha Aceptación de Cifras (Aseguradora)',
  fchaEnvioFiniquito: 'Fecha Envío de Finiquito',
  fchaFactra: 'Fecha Factura',
  fchaUltSegui: 'Fecha Último Seguimiento',
  fchaActSegui: 'Fecha Actual Seguimiento',
  fchaFinqtoIndem: 'Fecha Fin Quito Indemnización',
  fchaUltRevi: 'Fecha Última Revisión',
  createdAt: 'Fecha de Creación',
  updatedAt: 'Fecha de Actualización',
};

const camposFechaEn = {
  fchaAsgncion: 'Assignment date',
  fchaSinstro: 'Claim date',
  fchaContIni: 'Initial contact date',
  fchaCoordInspeccion: 'Inspection coordination date',
  fchaProgInspeccion: 'Scheduled inspection date',
  fchaInspccion: 'Inspection date',
  fchaSoliDocu: 'Document request date',
  fchaInfoPrelm: 'Preliminary report date',
  fchaRepoActi: 'Last document / updated report date',
  fchaInfoFnal: 'Final report date',
  fchaPresentacionCifras: 'Figures presentation date',
  fchaAceptacionCifrasAseguradora: 'Figures acceptance date (insurer)',
  fchaEnvioFiniquito: 'Settlement send date',
  fchaFactra: 'Invoice date',
  fchaUltSegui: 'Last follow-up date',
  fchaActSegui: 'Current follow-up date',
  fchaFinqtoIndem: 'Indemnity settlement date',
  fchaUltRevi: 'Last review date',
  createdAt: 'Created date',
  updatedAt: 'Updated date',
};

const camposEs = {
  nmroAjste: 'No. Ajuste',
  nmroSinstro: 'No. de Siniestro',
  nombIntermediario: 'Intermediario',
  codWorkflow: 'Cod Workflow',
  nmroPolza: 'No. de Poliza',
  codiRespnsble: 'Responsable',
  codiAsgrdra: 'Aseguradora',
  asgrBenfcro: 'Asegurado o Beneficiario',
  fchaAsgncion: 'Fecha Asignacion',
  fchaSinstro: 'Fecha Siniestro',
  fchaContIni: 'Fecha Contacto Inicial',
  obseContIni: 'Observaciones Contacto Inicial',
  anexContIni: 'Anexos Contacto Inicial',
  fchaCoordInspeccion: 'Fecha Coordinación Inspección',
  fchaProgInspeccion: 'Fecha Programada Inspección',
  obseCoordInspeccion: 'Observaciones Coordinación Inspección',
  fchaInspccion: 'Fecha de Inspeccion',
  obseInspccion: 'Observaciones Inspección',
  anexActaInspccion: 'Anexos Acta Inspección',
  fchaSoliDocu: 'Fecha Solicitud Documentos',
  obseSoliDocu: 'Observaciones Solicitud Docs',
  anexSolDoc: 'Anexos Solicitud Docs',
  fchaInfoPrelm: 'Fecha Informe Preliminar',
  obseInfoPrelm: 'Observaciones Informe Preliminar',
  anxoInfPrelim: 'Anexos Informe Preliminar',
  fchaRepoActi: 'Fecha Último Documento / Reporte Actualizado',
  obseRepoActi: 'Observaciones Último Documento',
  anxoRepoActi: 'Anexos Último Documento',
  fchaInfoFnal: 'Fecha Informe Final',
  obseInfoFnal: 'Observaciones Informe Final',
  anxoInfoFnal: 'Anexos Informe Final',
  fchaPresentacionCifras: 'Fecha Presentación de Cifras',
  fchaAceptacionCifrasAseguradora: 'Fecha Aceptación Cifras (Aseguradora)',
  obsePresentacionCifras: 'Observaciones Presentación de Cifras',
  anxoPresentacionCifras: 'Adjunto Presentación de Cifras',
  fchaEnvioFiniquito: 'Fecha Envío de Finiquito',
  obseEnvioFiniquito: 'Observaciones Envío de Finiquito',
  anxoEnvioFiniquito: 'Adjunto Envío de Finiquito',
  descSinstro: 'Descripción Siniestro',
  ciudadSiniestro: 'Ciudad Siniestro',
  codiEstdo: 'Estado del Siniestro',
  funcAsgrdra: 'Funcionario Aseguradora',
  tipoDucumento: 'Tipo Documento',
  numDocumento: 'Número Documento',
  tipoPoliza: 'Tipo Poliza',
  amprAfctdo: 'Amparo Afectado',
  causa_siniestro: 'Causa Siniestro',
  dias_transcrrdo: 'Días Transcurridos',
  vlor_resrva: 'Valor Reserva',
  vlor_reclmo: 'Valor del Reclamo',
  monto_indmzar: 'Monto a Indemnizar',
  observacionesValores: 'Observaciones Valores',
  nmroFactra: 'Número Factura',
  fchaFactra: 'Fecha Factura',
  vlorServcios: 'Valor Servicios',
  vlorGastos: 'Valor Gastos',
  total: 'Total Base',
  totalGeneral: 'Total General',
  totalPagado: 'Total Pagado',
  iva: 'IVA',
  reteiva: 'ReteIVA',
  retefuente: 'ReteFuente',
  reteica: 'ReteICA',
  porcIva: '% IVA',
  porcReteiva: '% ReteIVA',
  porcRetefuente: '% ReteFuente',
  porcReteica: '% ReteICA',
  anxoFactra: 'Anexos Facturación',
  fchaUltSegui: 'Fecha Último Seguimiento',
  fchaActSegui: 'Fecha Actual Seguimiento',
  fchaFinqtoIndem: 'Fecha Fin Quito Indemnización',
  fchaUltRevi: 'Fecha Última Revisión',
  fcha_control_horas: 'Fecha Control de Horas',
  fcha_envio_control_horas: 'Fecha Envío Control de Horas',
  fcha_seguimiento_envio_control_horas: 'Fecha Seguimiento Envío Control de Horas',
  obseComprmsi: 'Observaciones Compromisos',
  obseSegmnto: 'Observaciones Seguimiento',
  anxoHonorarios: 'Anexos Honorarios',
  anxoHonorariosdefinit: 'Anexos Honorarios Definitivos',
  anxoAutorizacion: 'Anexos Autorización',
  honorarios: 'Honorarios',
  honorariosDefinitivos: 'Honorarios Definitivos',
  autorizacionHonorarios: 'Autorización Honorarios',
  liquidacionPerdida: 'Liquidación de la Pérdida',
  indemnizacion: 'Indemnización',
  salvamentos: 'Salvamentos',
  panoramaRiesgos: 'Panorama de Riesgos',
  createdAt: 'Fecha Creación',
  updatedAt: 'Fecha Actualización',
};

const camposEn = {
  nmroAjste: 'Adj. No.',
  nmroSinstro: 'Claim No.',
  nombIntermediario: 'Broker',
  codWorkflow: 'Workflow code',
  nmroPolza: 'Policy No.',
  codiRespnsble: 'Person in charge',
  codiAsgrdra: 'Insurance company',
  asgrBenfcro: 'Insured or beneficiary',
  fchaAsgncion: 'Assignment date',
  fchaSinstro: 'Claim date',
  fchaContIni: 'Initial contact date',
  obseContIni: 'Initial contact notes',
  anexContIni: 'Initial contact attachments',
  fchaCoordInspeccion: 'Inspection coordination date',
  fchaProgInspeccion: 'Scheduled inspection date',
  obseCoordInspeccion: 'Inspection coordination notes',
  fchaInspccion: 'Inspection date',
  obseInspccion: 'Inspection notes',
  anexActaInspccion: 'Inspection minutes attachments',
  fchaSoliDocu: 'Document request date',
  obseSoliDocu: 'Document request notes',
  anexSolDoc: 'Document request attachments',
  fchaInfoPrelm: 'Preliminary report date',
  obseInfoPrelm: 'Preliminary report notes',
  anxoInfPrelim: 'Preliminary report attachments',
  fchaRepoActi: 'Last document / updated report date',
  obseRepoActi: 'Last document notes',
  anxoRepoActi: 'Last document attachments',
  fchaInfoFnal: 'Final report date',
  obseInfoFnal: 'Final report notes',
  anxoInfoFnal: 'Final report attachments',
  fchaPresentacionCifras: 'Figures presentation date',
  fchaAceptacionCifrasAseguradora: 'Figures acceptance date (insurer)',
  obsePresentacionCifras: 'Figures presentation notes',
  anxoPresentacionCifras: 'Figures presentation attachment',
  fchaEnvioFiniquito: 'Settlement send date',
  obseEnvioFiniquito: 'Settlement send notes',
  anxoEnvioFiniquito: 'Settlement send attachment',
  descSinstro: 'Claim description',
  ciudadSiniestro: 'Claim city',
  codiEstdo: 'Claim status',
  funcAsgrdra: 'Insurance company officer',
  tipoDucumento: 'Document type',
  numDocumento: 'Document number',
  tipoPoliza: 'Policy type',
  amprAfctdo: 'Affected coverage',
  causa_siniestro: 'Claim cause',
  dias_transcrrdo: 'Days elapsed',
  vlor_resrva: 'Reserve amount',
  vlor_reclmo: 'Claim amount',
  monto_indmzar: 'Amount to indemnify',
  observacionesValores: 'Values notes',
  nmroFactra: 'Invoice number',
  fchaFactra: 'Invoice date',
  vlorServcios: 'Services amount',
  vlorGastos: 'Expenses amount',
  total: 'Base total',
  totalGeneral: 'Grand total',
  totalPagado: 'Total paid',
  iva: 'VAT',
  reteiva: 'VAT withholding',
  retefuente: 'Income tax withholding',
  reteica: 'ICA withholding',
  porcIva: '% VAT',
  porcReteiva: '% VAT withholding',
  porcRetefuente: '% Income tax withholding',
  porcReteica: '% ICA withholding',
  anxoFactra: 'Billing attachments',
  fchaUltSegui: 'Last follow-up date',
  fchaActSegui: 'Current follow-up date',
  fchaFinqtoIndem: 'Indemnity settlement date',
  fchaUltRevi: 'Last review date',
  fcha_control_horas: 'Time tracking date',
  fcha_envio_control_horas: 'Time tracking send date',
  fcha_seguimiento_envio_control_horas: 'Time tracking send follow-up date',
  obseComprmsi: 'Commitment notes',
  obseSegmnto: 'Follow-up notes',
  anxoHonorarios: 'Fee attachments',
  anxoHonorariosdefinit: 'Final fee attachments',
  anxoAutorizacion: 'Authorization attachments',
  honorarios: 'Fees',
  honorariosDefinitivos: 'Final fees',
  autorizacionHonorarios: 'Fee authorization',
  liquidacionPerdida: 'Loss settlement',
  indemnizacion: 'Indemnity',
  salvamentos: 'Salvage',
  panoramaRiesgos: 'Risk overview',
  createdAt: 'Created date',
  updatedAt: 'Updated date',
};

es.complex.ui.reporte_casos_mejorado = {
  ...reporteEs,
  campos: camposEs,
  campos_fecha: camposFechaEs,
};
en.complex.ui.reporte_casos_mejorado = {
  ...reporteEn,
  campos: camposEn,
  campos_fecha: camposFechaEn,
};

// --- complex_ui_blocks ---
mergeNs(es, 'complex_ui_blocks', {
  atencion: 'Atención',
  entendido: 'Entendido',
  si: 'Sí',
  no: 'No',
  filtros: 'Filtros',
  hint_fecha_hora: 'Al elegir la fecha se completa la hora actual; puede ajustarla después.',
  placeholder_fecha: 'dd/mm/aaaa',
});
mergeNs(en, 'complex_ui_blocks', {
  atencion: 'Attention',
  entendido: 'Got it',
  si: 'Yes',
  no: 'No',
  filtros: 'Filters',
  hint_fecha_hora: 'When you pick the date, the current time is filled in; you can adjust it afterward.',
  placeholder_fecha: 'mm/dd/yyyy',
});

// --- facturacion_helpers ---
mergeNs(es, 'facturacion_helpers', {
  cancelar: 'Cancelar',
  cancelar_proceso: 'Cancelar proceso',
  desea_cancelar_proceso_modal:
    '¿Desea cancelar el proceso? Si sale ahora, puede perder los cambios que no haya guardado.',
  si_cancelar: 'Sí, cancelar',
  no_continuar: 'No, continuar',
});
mergeNs(en, 'facturacion_helpers', {
  cancelar: 'Cancel',
  cancelar_proceso: 'Cancel process',
  desea_cancelar_proceso_modal:
    'Do you want to cancel the process? If you leave now, you may lose unsaved changes.',
  si_cancelar: 'Yes, cancel',
  no_continuar: 'No, continue',
});

// --- formulario_caso_complex ---
mergeNs(es, 'formulario_caso_complex', {
  tab_datos_generales: 'Datos Generales',
  tab_valores: 'Valores y Prestaciones',
  tab_trazabilidad: 'Trazabilidad',
  tab_facturacion: 'Facturación',
  tab_honorarios: 'Honorarios',
  tab_seguimiento: 'Seguimiento',
  tab_observaciones_pendientes: 'Observaciones Pendientes',
  tab_observaciones: 'Observaciones Clientes',
  estado_obligatorio:
    'El estado del siniestro es obligatorio. Selecciona un estado en la pestaña Datos Generales.',
  confirmar_otro_archivo:
    '\n\n¿Está seguro de que necesita subir otro?\n\nAceptar = subir de todas formas\nCancelar = no subir nada',
  sin_numero: 'Sin número',
  guardar_sin_accion: 'Guardar (sin acción definida)',
});
mergeNs(en, 'formulario_caso_complex', {
  tab_datos_generales: 'General data',
  tab_valores: 'Values and benefits',
  tab_trazabilidad: 'Traceability',
  tab_facturacion: 'Billing',
  tab_honorarios: 'Fees',
  tab_seguimiento: 'Follow-up',
  tab_observaciones_pendientes: 'Pending notes',
  tab_observaciones: 'Client notes',
  estado_obligatorio:
    'Claim status is required. Select a status on the General data tab.',
  confirmar_otro_archivo:
    '\n\nAre you sure you need to upload another?\n\nOK = upload anyway\nCancel = do not upload',
  sin_numero: 'No number',
  guardar_sin_accion: 'Save (no action defined)',
});

// --- datos_generales ---
mergeNs(es, 'datos_generales', {
  cargando_funcionarios: 'Cargando funcionarios...',
  seleccione_un_funcionario: 'Seleccione un funcionario',
  sin_asignar: 'Sin asignar',
});
mergeNs(en, 'datos_generales', {
  cargando_funcionarios: 'Loading officers...',
  seleccione_un_funcionario: 'Select an officer',
  sin_asignar: 'Unassigned',
});

// --- dashboard_complex ---
mergeNs(es, 'dashboard_complex', {
  no_especificada: 'No especificada',
  sin_especificar: 'Sin especificar',
  estado_n: 'Estado {{codigo}}',
  dias: 'días',
  limite: 'Límite: {{limite}}',
  etapa_contacto_inicial: 'Contacto Inicial',
  etapa_inspeccion: 'Inspección',
  etapa_solicitud_docs: 'Solicitud Docs',
  etapa_informe_preliminar: 'Informe Preliminar',
  etapa_informe_final: 'Informe Final',
  limite_12_horas: '12 horas',
  limite_1_dia_habil: '1 día hábil',
  limite_24_horas: '24 horas',
  limite_3_dias: '3 días',
});
mergeNs(en, 'dashboard_complex', {
  no_especificada: 'Not specified',
  sin_especificar: 'Unspecified',
  estado_n: 'Status {{codigo}}',
  dias: 'days',
  limite: 'Limit: {{limite}}',
  etapa_contacto_inicial: 'Initial contact',
  etapa_inspeccion: 'Inspection',
  etapa_solicitud_docs: 'Doc request',
  etapa_informe_preliminar: 'Preliminary report',
  etapa_informe_final: 'Final report',
  limite_12_horas: '12 hours',
  limite_1_dia_habil: '1 business day',
  limite_24_horas: '24 hours',
  limite_3_dias: '3 days',
});

// --- indicadores_protocolo_complex ---
mergeNs(es, 'indicadores_protocolo_complex', {
  vista_resumen: 'Vista resumen',
  vista_detallada: 'Vista detallada',
  por_ajustador: 'Por ajustador',
  por_compania: 'Por compañía',
  por_ramo: 'Por ramo',
  ajustador: 'Ajustador',
  compania: 'Compañía',
  ramo: 'Ramo',
  sin_compania: 'Sin compañía',
  pendientes_docs_titulo: 'Pendientes de documentos > 30 días — {{vista}}',
  placeholder_fecha: 'dd/mm/aaaa',
});
mergeNs(en, 'indicadores_protocolo_complex', {
  vista_resumen: 'Summary view',
  vista_detallada: 'Detailed view',
  por_ajustador: 'By adjuster',
  por_compania: 'By company',
  por_ramo: 'By line of business',
  ajustador: 'Adjuster',
  compania: 'Company',
  ramo: 'Line of business',
  sin_compania: 'No company',
  pendientes_docs_titulo: 'Pending documents > 30 days — {{vista}}',
  placeholder_fecha: 'mm/dd/yyyy',
});

// --- indicadores_historicos_complex ---
mergeNs(es, 'indicadores_historicos_complex', {
  kpi_asignacion_contacto: 'Asignación → Primer contacto',
  kpi_asignacion_contacto_desc:
    'Tiempo desde que se recibe la asignación hasta el primer contacto con el asegurado.',
  kpi_contacto_inspeccion: 'Primer contacto → Inspección de campo',
  kpi_contacto_inspeccion_desc: 'Tiempo desde el contacto inicial hasta la inspección en sitio.',
  kpi_inspeccion_preliminar: 'Inspección o solicitud → Informe preliminar',
  kpi_inspeccion_preliminar_desc:
    'Días hábiles desde la inspección o solicitud de documentos hasta el informe preliminar (excluye fines de semana y festivos).',
  kpi_ultimo_doc_final: 'Último documento acreditado → Informe final',
  kpi_ultimo_doc_final_desc:
    'Días hábiles desde la acreditación del último documento hasta el informe final (excluye fines de semana y festivos).',
  filtrado_por: ' · filtrado por {{nombre}}',
  sin_asignar: 'Sin asignar',
  placeholder_fecha: 'dd/mm/aaaa',
});
mergeNs(en, 'indicadores_historicos_complex', {
  kpi_asignacion_contacto: 'Assignment → First contact',
  kpi_asignacion_contacto_desc:
    'Time from receiving the assignment to the first contact with the insured.',
  kpi_contacto_inspeccion: 'First contact → Field inspection',
  kpi_contacto_inspeccion_desc: 'Time from initial contact to on-site inspection.',
  kpi_inspeccion_preliminar: 'Inspection or request → Preliminary report',
  kpi_inspeccion_preliminar_desc:
    'Business days from inspection or document request to the preliminary report (excludes weekends and holidays).',
  kpi_ultimo_doc_final: 'Last accredited document → Final report',
  kpi_ultimo_doc_final_desc:
    'Business days from accreditation of the last document to the final report (excludes weekends and holidays).',
  filtrado_por: ' · filtered by {{nombre}}',
  sin_asignar: 'Unassigned',
  placeholder_fecha: 'mm/dd/yyyy',
});

// --- indicadores_alertas_complex ---
mergeNs(es, 'indicadores_alertas_complex', {
  tab_historicos: 'Indicadores históricos',
  tab_protocolo: 'Indicadores protocolo',
  tab_informe: 'Informe general',
  tab_manual: 'Manual de uso',
  tab_alertas: 'Mis alertas',
  subtitle_full:
    'Históricos de gestión, cumplimiento del protocolo, informe general, manual de uso y alertas.',
  subtitle_base: 'Históricos de gestión, cumplimiento del protocolo e informe general.',
});
mergeNs(en, 'indicadores_alertas_complex', {
  tab_historicos: 'Historical indicators',
  tab_protocolo: 'Protocol indicators',
  tab_informe: 'General report',
  tab_manual: 'User manual',
  tab_alertas: 'My alerts',
  subtitle_full:
    'Management history, protocol compliance, general report, user manual, and alerts.',
  subtitle_base: 'Management history, protocol compliance, and general report.',
});

// --- mis_subtareas_complex ---
mergeNs(es, 'mis_subtareas_complex', {
  al_dia: 'Al día',
  en_curso_proximo_a_vencer: 'En curso / próximo a vencer',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
  estado_pendiente: 'Pendiente',
  estado_en_progreso: 'En progreso',
  estado_completada: 'Completada',
  estado_cancelada: 'Cancelada',
  tiempo_empleado_label: 'Tiempo empleado',
  tiempo_en_curso: 'Tiempo en curso',
  ir_a_subtarea: 'Ir a subtarea',
  ver_registro: 'Ver registro',
  exigencia_formato:
    'Esta etapa exige adjuntar el formato (informe) antes de completarla. Genérelo desde "Ir a formulario de ajuste" o súbalo como tipo "Formato".',
  adjunte_documento:
    'Adjunte el documento de la etapa ({{etapa}}) antes de completar. Se enviará a la trazabilidad del caso.',
  indique_fechas: 'Indique las fechas de la etapa (como en trazabilidad): {{fechas}}.',
  suba_acta_fotos: 'Antes de cerrar suba el acta y/o las fotos y datos de la visita.',
  subtarea_completada_msg:
    'Subtarea completada. Las fechas quedaron en la trazabilidad del caso y el tiempo de ejecución quedó registrado.',
  coord_guardada: 'Coordinación guardada. Continúe con la inspección y el acta.',
  exigencia_formato_largo:
    'Esta etapa exige el formato (informe) como entregable obligatorio: genérelo en el formulario de ajuste y adjúntelo como tipo "Formato" antes de completar.',
  cargado_trazabilidad: '{{nombre}} cargado. Quedará en la trazabilidad del caso.',
  exige_adjuntar:
    'Esta etapa exige adjuntar: {{nombre}} (igual que en trazabilidad). Al guardarlo se envía a la bandeja del caso.',
  obs_etapa: 'Observaciones de la etapa',
  obs_placeholder: 'Observaciones (igual que en trazabilidad)…',
  desde_asignacion: ' · Desde asignación: {{tiempo}}',
  sin_completadas: 'Aún no hay subtareas completadas registradas.',
  sin_pendientes:
    'No tiene subtareas pendientes. Las que cierre pasan a Completadas (con tiempo de ejecución).',
  tiempo_prefix: ' · Tiempo: {{tiempo}}',
  en_curso_prefix: ' · En curso: {{tiempo}}',
});
mergeNs(en, 'mis_subtareas_complex', {
  al_dia: 'On track',
  en_curso_proximo_a_vencer: 'In progress / nearing due',
  vencida: 'Overdue',
  cancelada: 'Cancelled',
  estado_pendiente: 'Pending',
  estado_en_progreso: 'In progress',
  estado_completada: 'Completed',
  estado_cancelada: 'Cancelled',
  tiempo_empleado_label: 'Time spent',
  tiempo_en_curso: 'Time in progress',
  ir_a_subtarea: 'Go to subtask',
  ver_registro: 'View record',
  exigencia_formato:
    'This stage requires attaching the form (report) before completing it. Generate it from "Go to adjustment form" or upload it as type "Form".',
  adjunte_documento:
    'Attach the stage document ({{etapa}}) before completing. It will be sent to case traceability.',
  indique_fechas: 'Enter the stage dates (as in traceability): {{fechas}}.',
  suba_acta_fotos: 'Before closing, upload the minutes and/or visit photos and data.',
  subtarea_completada_msg:
    'Subtask completed. Dates were saved in case traceability and execution time was recorded.',
  coord_guardada: 'Coordination saved. Continue with the inspection and minutes.',
  exigencia_formato_largo:
    'This stage requires the form (report) as a mandatory deliverable: generate it in the adjustment form and attach it as type "Form" before completing.',
  cargado_trazabilidad: '{{nombre}} uploaded. It will appear in case traceability.',
  exige_adjuntar:
    'This stage requires attaching: {{nombre}} (same as in traceability). When saved it is sent to the case inbox.',
  obs_etapa: 'Stage notes',
  obs_placeholder: 'Notes (same as in traceability)…',
  desde_asignacion: ' · From assignment: {{tiempo}}',
  sin_completadas: 'No completed subtasks recorded yet.',
  sin_pendientes:
    'You have no pending subtasks. Closed ones move to Completed (with execution time).',
  tiempo_prefix: ' · Time: {{tiempo}}',
  en_curso_prefix: ' · In progress: {{tiempo}}',
});

// --- bandeja_facturacion ---
mergeNs(es, 'bandeja_facturacion', {
  seleccione_jefe: 'Seleccione el jefe para ver su bandeja',
  error_control_horas:
    'Se detectó un error en el control de horas. Por favor corríjalo en ARNALD (Facturación → Control de horas) o reemplace el archivo adjunto y vuelva a notificar.',
  escriba_observacion_ajustador: 'Escriba la observación para el ajustador.',
  destinatario_actualizado:
    'Destinatario actualizado a {{nombre}}. El caso no se duplicó; solo se corrigió el registro del envío.',
  confirmar_quitar:
    '¿Quitar este registro de envío a {{nombre}}?\n\nCaso {{caso}} — no se elimina el caso Complex, solo la línea en la bandeja.',
  cargando: 'Cargando…',
  envios_registrados:
    '{{count}} envío{{plural}} registrado{{plural}} con el jefe destino del correo. Cada vez que se envía control de horas o gerencia, queda guardado a quién se notificó.',
  guardando: 'Guardando…',
  guardar_correccion: 'Guardar corrección',
  enviando: 'Enviando…',
  enviar_aviso_ajustador: 'Enviar aviso al ajustador',
});
mergeNs(en, 'bandeja_facturacion', {
  seleccione_jefe: 'Select the manager to view their inbox',
  error_control_horas:
    'A time-tracking error was detected. Please correct it in ARNALD (Billing → Time tracking) or replace the attached file and notify again.',
  escriba_observacion_ajustador: 'Enter the note for the adjuster.',
  destinatario_actualizado:
    'Recipient updated to {{nombre}}. The case was not duplicated; only the submission record was corrected.',
  confirmar_quitar:
    'Remove this submission record to {{nombre}}?\n\nCase {{caso}} — the Complex case is not deleted, only the inbox line.',
  cargando: 'Loading…',
  envios_registrados:
    '{{count}} submission{{plural}} recorded with the email destination manager. Each time time tracking or management is sent, who was notified is saved.',
  guardando: 'Saving…',
  guardar_correccion: 'Save correction',
  enviando: 'Sending…',
  enviar_aviso_ajustador: 'Send notice to adjuster',
});

fs.writeFileSync(esPath, JSON.stringify(es, null, 2) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
console.log('Locales updated.');
console.log('reporte keys EN:', Object.keys(en.complex.ui.reporte_casos_mejorado).length);
console.log('campos EN:', Object.keys(en.complex.ui.reporte_casos_mejorado.campos).length);
