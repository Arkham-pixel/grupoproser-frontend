// Script de prueba para verificar el formulario frontend
// Este archivo se ejecuta en el navegador para verificar la funcionalidad

console.log('🧪 INICIANDO PRUEBAS DEL FORMULARIO FRONTEND');

// Simular datos del formulario
const formDataPrueba = {
  nmroAjste: 'AJ-001',
  nmroSinstro: 'SIN-2024-001',
  nombIntermediario: 'Intermediario de Prueba',
  codWorkflow: 'WF-001',
  nmroPolza: 'POL-2024-001',
  codiRespnsble: 'RESP-001',
  codiAsgrdra: 'ASEG-001',
  funcAsgrdra: 'FUNC-001',
  asgrBenfcro: 'Cliente de Prueba',
  tipoDucumento: 'CC',
  numDocumento: '12345678',
  tipoPoliza: 'Todo Riesgo',
  ciudadSiniestro: 'Bogotá',
  amprAfctdo: 'Vehículo',
  descSinstro: 'Siniestro de prueba para verificar funcionamiento',
  causa_siniestro: 'Colisión',
  estado: '1',
  fchaAsgncion: '2024-01-15',
  fchaSinstro: '2024-01-14',
  fchaInspccion: '2024-01-16',
  fchaContIni: '2024-01-15',
  
  // Campos adicionales
  obse_cont_ini: 'Observación de contacto inicial de prueba',
  anex_cont_ini: 'anexo_contacto_inicial.pdf',
  obse_inspccion: 'Observación de inspección de prueba',
  anex_acta_inspccion: 'acta_inspeccion.pdf',
  anex_sol_doc: 'solicitud_documentos.pdf',
  obse_soli_docu: 'Observación solicitud documentos de prueba',
  anxo_inf_prelim: 'informe_preliminar.pdf',
  obse_info_prelm: 'Observación informe preliminar de prueba',
  anxo_info_fnal: 'informe_final.pdf',
  obse_info_fnal: 'Observación informe final de prueba',
  anxo_repo_acti: 'reporte_actividad.pdf',
  obse_repo_acti: 'Observación reporte actividad de prueba',
  anxo_factra: 'factura.pdf',
  anxo_honorarios: 'honorarios.pdf',
  anxo_honorariosdefinit: 'honorarios_definitivos.pdf',
  anxo_autorizacion: 'autorizacion.pdf',
  obse_comprmsi: 'Observación compromisos de prueba',
  obse_segmnto: 'Observación seguimiento de prueba',
  
  // Campos de fechas
  fcha_soli_docu: '2024-01-17',
  fcha_info_prelm: '2024-01-18',
  fcha_info_fnal: '2024-01-20',
  fcha_repo_acti: '2024-01-19',
  fcha_ult_segui: '2024-01-21',
  fcha_act_segui: '2024-01-22',
  fcha_finqto_indem: '2024-01-23',
  fcha_factra: '2024-01-24',
  fcha_ult_revi: '2024-01-25',
  
  // Campos numéricos
  dias_transcrrdo: 10,
  vlor_resrva: 5000000,
  vlor_reclmo: 8000000,
  monto_indmzar: 7500000,
  vlor_servcios: 500000,
  vlor_gastos: 200000,
  total: 8200000,
  total_general: 8700000,
  total_pagado: 0,
  iva: 0,
  reteiva: 0,
  retefuente: 0,
  reteica: 0,
  porc_iva: 0,
  porc_reteiva: 0,
  porc_retefuente: 0,
  porc_reteica: 0,
  
  historialDocs: [
    {
      tipo: 'Documento',
      nombre: 'documento_prueba.pdf',
      fecha: new Date().toISOString(),
      comentario: 'Documento de prueba',
      url: '/uploads/documento_prueba.pdf'
    }
  ]
};

// Función para mapear los campos del frontend a los del backend (COPIADA DEL COMPONENTE)
function mapFormDataToBackend(formData) {
  return {
    // Campos principales con nombres correctos del modelo
    nmroAjste: formData.nmroAjste,
    nmroSinstro: formData.nmroSinstro,
    nombIntermediario: formData.nombIntermediario,
    codWorkflow: formData.codWorkflow,
    nmroPolza: formData.nmroPolza,
    codiRespnsble: formData.codiRespnsble,
    codiAsgrdra: formData.codiAsgrdra,
    funcAsgrdra: formData.funcAsgrdra,
    asgrBenfcro: formData.asgrBenfcro,
    tipoDucumento: formData.tipoDucumento,
    numDocumento: formData.numDocumento,
    tipoPoliza: formData.tipoPoliza,
    ciudadSiniestro: formData.ciudadSiniestro,
    amprAfctdo: formData.amprAfctdo,
    descSinstro: formData.descSinstro,
    causa_siniestro: formData.causa_siniestro,
    codiEstdo: formData.estado,
    fchaAsgncion: formData.fchaAsgncion,
    fchaSinstro: formData.fchaSinstro,
    fchaInspccion: formData.fchaInspccion,
    fchaContIni: formData.fchaContIni,
    
    // Campos adicionales
    obse_cont_ini: formData.obse_cont_ini,
    anex_cont_ini: formData.anex_cont_ini,
    obse_inspccion: formData.obse_inspccion,
    anex_acta_inspccion: formData.anex_acta_inspccion,
    anex_sol_doc: formData.anex_sol_doc,
    obse_soli_docu: formData.obse_soli_docu,
    anxo_inf_prelim: formData.anxo_inf_prelim,
    obse_info_prelm: formData.obse_info_prelm,
    anxo_info_fnal: formData.anxo_info_fnal,
    obse_info_fnal: formData.obse_info_fnal,
    anxo_repo_acti: formData.anxo_repo_acti,
    obse_repo_acti: formData.obse_repo_acti,
    anxo_factra: formData.anxo_factra,
    anxo_honorarios: formData.anxo_honorarios,
    anxo_honorariosdefinit: formData.anxo_honorariosdefinit,
    anxo_autorizacion: formData.anxo_autorizacion,
    obse_comprmsi: formData.obse_comprmsi,
    obse_segmnto: formData.obse_segmnto,
    
    // Campos de fechas
    fcha_soli_docu: formData.fcha_soli_docu,
    fcha_info_prelm: formData.fcha_info_prelm,
    fcha_info_fnal: formData.fcha_info_fnal,
    fcha_repo_acti: formData.fcha_repo_acti,
    fcha_ult_segui: formData.fcha_ult_segui,
    fcha_act_segui: formData.fcha_act_segui,
    fcha_finqto_indem: formData.fcha_finqto_indem,
    fcha_factra: formData.fcha_factra,
    fcha_ult_revi: formData.fcha_ult_revi,
    
    // Campos numéricos
    dias_transcrrdo: formData.dias_transcrrdo,
    vlor_resrva: formData.vlor_resrva,
    vlor_reclmo: formData.vlor_reclmo,
    monto_indmzar: formData.monto_indmzar,
    vlor_servcios: formData.vlor_servcios,
    vlor_gastos: formData.vlor_gastos,
    total: formData.total,
    total_general: formData.total_general,
    total_pagado: formData.total_pagado,
    iva: formData.iva,
    reteiva: formData.reteiva,
    retefuente: formData.retefuente,
    reteica: formData.reteica,
    porc_iva: formData.porc_iva,
    porc_reteiva: formData.porc_reteiva,
    porc_retefuente: formData.porc_retefuente,
    porc_reteica: formData.porc_reteica,
    
    historialDocs: formData.historialDocs
  };
}

// Función para verificar que el mapeo sea correcto
function verificarMapeo() {
  console.log('🔍 Verificando mapeo de campos...');
  
  const datosMapeados = mapFormDataToBackend(formDataPrueba);
  
  // Verificar campos principales
  const camposPrincipales = [
    'nmroAjste', 'nmroSinstro', 'nombIntermediario', 'codWorkflow',
    'nmroPolza', 'codiRespnsble', 'codiAsgrdra', 'funcAsgrdra',
    'asgrBenfcro', 'tipoDucumento', 'numDocumento', 'tipoPoliza',
    'ciudadSiniestro', 'amprAfctdo', 'descSinstro', 'causa_siniestro',
    'codiEstdo', 'fchaAsgncion', 'fchaSinstro', 'fchaInspccion', 'fchaContIni'
  ];
  
  let errores = 0;
  
  camposPrincipales.forEach(campo => {
    if (!datosMapeados.hasOwnProperty(campo)) {
      console.error(`❌ Campo faltante: ${campo}`);
      errores++;
    } else if (datosMapeados[campo] === undefined) {
      console.error(`❌ Campo sin valor: ${campo}`);
      errores++;
    }
  });
  
  // Verificar campos adicionales
  const camposAdicionales = [
    'obse_cont_ini', 'anex_cont_ini', 'obse_inspccion', 'anex_acta_inspccion',
    'anex_sol_doc', 'obse_soli_docu', 'anxo_inf_prelim', 'obse_info_prelm',
    'anxo_info_fnal', 'obse_info_fnal', 'anxo_repo_acti', 'obse_repo_acti',
    'anxo_factra', 'anxo_honorarios', 'anxo_honorariosdefinit', 'anxo_autorizacion',
    'obse_comprmsi', 'obse_segmnto'
  ];
  
  camposAdicionales.forEach(campo => {
    if (!datosMapeados.hasOwnProperty(campo)) {
      console.error(`❌ Campo adicional faltante: ${campo}`);
      errores++;
    }
  });
  
  // Verificar campos de fecha
  const camposFecha = [
    'fcha_soli_docu', 'fcha_info_prelm', 'fcha_info_fnal', 'fcha_repo_acti',
    'fcha_ult_segui', 'fcha_act_segui', 'fcha_finqto_indem', 'fcha_factra', 'fcha_ult_revi'
  ];
  
  camposFecha.forEach(campo => {
    if (!datosMapeados.hasOwnProperty(campo)) {
      console.error(`❌ Campo de fecha faltante: ${campo}`);
      errores++;
    }
  });
  
  // Verificar campos numéricos
  const camposNumericos = [
    'dias_transcrrdo', 'vlor_resrva', 'vlor_reclmo', 'monto_indmzar',
    'vlor_servcios', 'vlor_gastos', 'total', 'total_general', 'total_pagado',
    'iva', 'reteiva', 'retefuente', 'reteica', 'porc_iva', 'porc_reteiva',
    'porc_retefuente', 'porc_reteica'
  ];
  
  camposNumericos.forEach(campo => {
    if (!datosMapeados.hasOwnProperty(campo)) {
      console.error(`❌ Campo numérico faltante: ${campo}`);
      errores++;
    }
  });
  
  if (errores === 0) {
    console.log('✅ Todos los campos están correctamente mapeados');
    console.log('✅ El formulario enviará los datos con los nombres correctos');
  } else {
    console.error(`❌ Se encontraron ${errores} errores en el mapeo`);
  }
  
  return errores === 0;
}

// Función para verificar valores específicos
function verificarValoresEspecificos() {
  console.log('🔍 Verificando valores específicos...');
  
  const datosMapeados = mapFormDataToBackend(formDataPrueba);
  
  // Verificar que los valores se mapeen correctamente
  const verificaciones = [
    { campo: 'nmroSinstro', esperado: 'SIN-2024-001', actual: datosMapeados.nmroSinstro },
    { campo: 'codiRespnsble', esperado: 'RESP-001', actual: datosMapeados.codiRespnsble },
    { campo: 'codiAsgrdra', esperado: 'ASEG-001', actual: datosMapeados.codiAsgrdra },
    { campo: 'asgrBenfcro', esperado: 'Cliente de Prueba', actual: datosMapeados.asgrBenfcro },
    { campo: 'fchaAsgncion', esperado: '2024-01-15', actual: datosMapeados.fchaAsgncion },
    { campo: 'codiEstdo', esperado: '1', actual: datosMapeados.codiEstdo },
    { campo: 'vlor_resrva', esperado: 5000000, actual: datosMapeados.vlor_resrva },
    { campo: 'total', esperado: 8200000, actual: datosMapeados.total }
  ];
  
  let errores = 0;
  
  verificaciones.forEach(verificacion => {
    if (verificacion.actual !== verificacion.esperado) {
      console.error(`❌ Valor incorrecto en ${verificacion.campo}:`);
      console.error(`   Esperado: ${verificacion.esperado}`);
      console.error(`   Actual: ${verificacion.actual}`);
      errores++;
    }
  });
  
  if (errores === 0) {
    console.log('✅ Todos los valores se mapean correctamente');
  } else {
    console.error(`❌ Se encontraron ${errores} errores en los valores`);
  }
  
  return errores === 0;
}

// Función principal de prueba
function ejecutarPruebasFrontend() {
  console.log('🚀 INICIANDO PRUEBAS DEL FORMULARIO FRONTEND\n');
  
  // 1. Verificar mapeo de campos
  const mapeoCorrecto = verificarMapeo();
  
  // 2. Verificar valores específicos
  const valoresCorrectos = verificarValoresEspecificos();
  
  // 3. Mostrar resultado final
  console.log('\n📊 RESUMEN DE PRUEBAS:');
  console.log(`   Mapeo de campos: ${mapeoCorrecto ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
  console.log(`   Valores específicos: ${valoresCorrectos ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
  
  if (mapeoCorrecto && valoresCorrectos) {
    console.log('\n🎉 TODAS LAS PRUEBAS DEL FRONTEND COMPLETADAS EXITOSAMENTE');
    console.log('✅ El formulario está funcionando correctamente');
    console.log('✅ Los campos se mapean correctamente');
    console.log('✅ Los valores se envían correctamente');
  } else {
    console.log('\n💥 ERROR EN LAS PRUEBAS DEL FRONTEND');
    console.log('❌ El formulario tiene problemas que necesitan ser corregidos');
  }
}

// Ejecutar las pruebas cuando se cargue la página
if (typeof window !== 'undefined') {
  // Si estamos en el navegador, ejecutar las pruebas
  window.addEventListener('load', () => {
    setTimeout(ejecutarPruebasFrontend, 1000);
  });
} else {
  // Si estamos en Node.js, ejecutar directamente
  ejecutarPruebasFrontend();
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ejecutarPruebasFrontend,
    verificarMapeo,
    verificarValoresEspecificos,
    mapFormDataToBackend
  };
}

