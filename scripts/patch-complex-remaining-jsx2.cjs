/**
 * Parte 2: Facturacion, ControlHoras, Seguimientos, Subtareas, Observaciones, etc.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function patchFile(rel, fn) {
  const full = path.join(root, rel);
  let s = fs.readFileSync(full, 'utf8');
  const before = s;
  s = fn(s);
  if (s === before) console.warn('NO CHANGE', rel);
  else {
    fs.writeFileSync(full, s);
    console.log('OK', rel);
  }
}

function r(s, from, to) {
  if (!s.includes(from)) {
    console.warn('  miss:', JSON.stringify(from).slice(0, 90));
    return s;
  }
  return s.split(from).join(to);
}

function ensureBind(s, importPath) {
  if (s.includes('i18n.t.bind') || /const \{ t \} = useTranslation/.test(s)) return s;
  if (s.includes("useTranslation()")) {
    return s.replace(/useTranslation\(\);/, 'const { t } = useTranslation();');
  }
  return `import i18n from '${importPath}';\nconst t = i18n.t.bind(i18n);\n` + s;
}

// ---- Facturacion ----
patchFile('src/components/SubcomponenteCompex/Facturacion.jsx', (s) => {
  s = ensureBind(s, '../../i18n');
  const pairs = [
    [`alert('No se puede descargar el documento. URL no disponible.');`, `alert(t('complex.ui.facturacion.no_descargar_url'));`],
    [`¿Está seguro de que desea eliminar "\${documento.nombre || documento.filename || 'este documento'}"?`,
     `\${t('complex.ui.facturacion.confirmar_eliminar_documento', { nombre: documento.nombre || documento.filename || t('complex.ui.facturacion.este_documento') })}`],
    [`'El control se guardó en el formulario, pero no se pudo actualizar el correo en el catálogo de analistas.'`,
     `t('complex.ui.facturacion.control_guardado_correo_fallo')`],
    [`¿Desea reemplazar el control de horas actual con los datos del archivo Excel?`,
     `\${t('complex.ui.facturacion.reemplazar_control_excel')}`],
    [`'Fase 1: liquidación y envío a Elkin o Iskharly'`, `t('complex.ui.facturacion.fase1_liquidacion')`],
    [`>Descargar Excel<`, `>{t('complex.ui.facturacion.descargar_excel')}<`],
    [`'Registre el control de horas en el sistema o suba los documentos antes de enviar la notificación.'`,
     `t('complex.ui.facturacion.registre_control_antes_notificar')`],
    [`'Indique la fecha de control de horas antes de enviar la notificación.'`,
     `t('complex.ui.facturacion.indique_fecha_control')`],
    [`'El control de horas tiene actividades sin fecha. Edítelo y complete las fechas antes de enviar.'`,
     `t('complex.ui.facturacion.actividades_sin_fecha')`],
    [`'Error al enviar la notificación. Por favor, intente nuevamente.'`,
     `t('complex.ui.facturacion.error_enviar_notificacion')`],
    [`'Enviar Control de Horas a Gerente'`, `t('complex.ui.facturacion.enviar_control_horas_gerente')`],
    [`'Envío de Control de Horas'`, `t('complex.ui.facturacion.envio_control_horas')`],
    [`'Fase 2: evidencia y notificación a facturación (Adriana)'`, `t('complex.ui.facturacion.fase2_evidencia')`],
    [`'Enviar a Gerencia'`, `t('complex.ui.facturacion.enviar_a_gerencia')`],
    [`'Autorización'`, `t('complex.ui.facturacion.autorizacion')`],
    [`'Fechas, comentarios y documentos de autorización'`, `t('complex.ui.facturacion.fechas_comentarios_docs_autorizacion')`],
    [`'Documentos y fechas de facturación'`, `t('complex.ui.facturacion.documentos_y_fechas_facturacion')`],
    [`'Guarde el caso'`, `t('complex.ui.facturacion.guarde_el_caso')`],
    [`'Correo del analista'`, `t('complex.ui.facturacion.correo_del_analista')`],
  ];
  for (const [a, b] of pairs) s = r(s, a, b);
  // importante_guardar multiline
  s = s.replace(
    /IMPORTANTE: Debe hacer clic en el botón «Guardar» que está arriba del caso para guardar los cambios\.\\n\\nSi no lo hace, el control de horas no quedará guardado\./,
    `\${t('complex.ui.facturacion.importante_guardar_caso')}`
  );
  // Facturación title if still hardcoded as string prop
  s = s.replace(/(title|titulo)=\{?'Facturación'\}?/, (m) => m.replace("'Facturación'", "t('complex.ui.facturacion.facturacion')"));
  s = s.replace(/>Facturación</g, `>{t('complex.ui.facturacion.facturacion')}<`);
  return s;
});

// ---- ControlHorasEditor ----
patchFile('src/components/SubcomponenteCompex/ControlHorasEditor.jsx', (s) => {
  s = ensureBind(s, '../../i18n');
  const pairs = [
    [`titulo: 'Atención'`, `titulo: t('complex.ui.control_horas_editor.atencion')`],
    [`'Ajustador'`, `t('complex.ui.control_horas_editor.ajustador')`],
    [`mensaje: 'Debe conservar al menos una fila de actividad.',\n      titulo: 'No se puede eliminar'`,
     `mensaje: t('complex.ui.control_horas_editor.debe_conservar_fila'),\n      titulo: t('complex.ui.control_horas_editor.no_se_puede_eliminar')`],
    [`'Debe conservar al menos una fila de actividad.'`, `t('complex.ui.control_horas_editor.debe_conservar_fila')`],
    [`'No se puede eliminar'`, `t('complex.ui.control_horas_editor.no_se_puede_eliminar')`],
    [`'Agregue al menos una actividad.'`, `t('complex.ui.control_horas_editor.agregue_actividad')`],
    [`'Complete la fecha en todas las actividades con horas o descripción. Las fechas son obligatorias.'`,
     `t('complex.ui.control_horas_editor.complete_fechas')`],
    [`'Complete la descripción en todas las actividades que tienen horas registradas.'`,
     `t('complex.ui.control_horas_editor.complete_descripcion')`],
    [`titulo: 'Descripción pendiente'`, `titulo: t('complex.ui.control_horas_editor.descripcion_pendiente')`],
    [`'Asigne el analista de la compañía en Datos Generales antes de guardar el control de horas.'`,
     `t('complex.ui.control_horas_editor.asigne_analista')`],
    [`titulo: 'Analista pendiente'`, `titulo: t('complex.ui.control_horas_editor.analista_pendiente')`],
    [`'El correo del analista de la compañía es obligatorio. Escríbalo en el campo correspondiente.'`,
     `t('complex.ui.control_horas_editor.correo_analista_obligatorio')`],
    [`titulo: 'Correo del analista'`, `titulo: t('complex.ui.control_horas_editor.correo_del_analista')`],
    [`'Compañía'`, `t('complex.ui.control_horas_editor.compania')`],
    [`'Siniestro'`, `t('complex.ui.control_horas_editor.siniestro')`],
    [`'Analista compañía'`, `t('complex.ui.control_horas_editor.analista_compania')`],
    [`'Ajustador Proser'`, `t('complex.ui.control_horas_editor.ajustador_proser')`],
    [`'F. siniestro'`, `t('complex.ui.control_horas_editor.f_siniestro')`],
    [`'F. asignación'`, `t('complex.ui.control_horas_editor.f_asignacion')`],
    [`'F. inspección'`, `t('complex.ui.control_horas_editor.f_inspeccion')`],
    [`'Sin tarifa en catálogo'`, `t('complex.ui.control_horas_editor.sin_tarifa_catalogo')`],
  ];
  for (const [a, b] of pairs) s = r(s, a, b);
  return s;
});

// ---- Seguimiento ----
patchFile('src/components/SubcomponenteCompex/Seguimiento.jsx', (s) => {
  s = ensureBind(s, '../../i18n');
  const pairs = [
    [`alert('No se puede descargar el documento. URL no disponible.');`, `alert(t('complex.ui.seguimiento.no_descargar_url'));`],
    [`alert('Por favor complete la fecha y la observación del seguimiento.');`, `alert(t('complex.ui.seguimiento.complete_fecha_observacion'));`],
    [`throw new Error(\`Error subiendo archivo (\${response.status})\`);`, `throw new Error(t('complex.ui.seguimiento.error_subiendo_archivo', { status: response.status }));`],
    [`alert(\`Error al subir el documento: \${error.message}\`);`, `alert(t('complex.ui.seguimiento.error_subir_documento', { mensaje: error.message }));`],
    [`window.confirm('¿Está seguro de que desea eliminar este seguimiento?')`, `window.confirm(t('complex.ui.seguimiento.confirmar_eliminar'))`],
    [`'Sin documento'`, `t('complex.ui.seguimiento.sin_documento')`],
    [`No hay seguimientos registrados. Agregue uno nuevo usando el botón "+ Nuevo".`, `\${t('complex.ui.seguimiento.no_hay_seguimientos')}`],
    [`'Resumen de seguimiento'`, `t('complex.ui.seguimiento.resumen_de_seguimiento')`],
  ];
  for (const [a, b] of pairs) s = r(s, a, b);
  return s;
});

// helper for similar seguimiento* files
function patchSeguimientoLike(rel, ns, extras = []) {
  patchFile(rel, (s) => {
    s = ensureBind(s, '../../i18n');
    const pairs = [
      [`alert('No se puede descargar el archivo. URL no disponible.');`, `alert(t('complex.ui.${ns}.no_descargar_url'));`],
      [`alert('Indique la fecha del correo enviado a la compañía.');`, `alert(t('complex.ui.${ns}.indique_fecha_correo'));`],
      [`alert('Indique la fecha del correo de seguimiento.');`, `alert(t('complex.ui.${ns}.indique_fecha_correo'));`],
      [`alert('Adjunte la evidencia del correo (captura, PDF o .eml).');`, `alert(t('complex.ui.${ns}.adjunte_evidencia'));`],
      [`alert('Adjunte la evidencia del correo enviado (captura, PDF o .eml).');`, `alert(t('complex.ui.${ns}.adjunte_evidencia'));`],
      [`throw new Error(\`Error subiendo archivo (\${response.status})\`);`, `throw new Error(t('complex.ui.${ns}.error_subiendo_archivo', { status: response.status }));`],
      [`throw new Error('El servidor no devolvió la ruta del archivo (S3/local).');`, `throw new Error(t('complex.ui.${ns}.servidor_sin_ruta'));`],
      [`alert(\`Error al subir la evidencia: \${error.message}\`);`, `alert(t('complex.ui.${ns}.error_subir_evidencia', { mensaje: error.message }));`],
      [`>Agregar seguimiento<`, `>{t('complex.ui.${ns}.agregar_seguimiento')}<`],
      [`\${estadoProtocolo?.intervaloDias ?? 5} días calendario`, `\${t('complex.ui.${ns}.dias_calendario', { n: estadoProtocolo?.intervaloDias ?? 5 })}`],
      [`\${estadoProtocolo?.intervaloDias ?? 15} días calendario`, `\${t('complex.ui.${ns}.dias_calendario', { n: estadoProtocolo?.intervaloDias ?? 15 })}`],
      [`'Pendiente'`, `t('complex.ui.${ns}.pendiente')`],
      ...extras,
    ];
    for (const [a, b] of pairs) s = r(s, a, b);
    return s;
  });
}

patchSeguimientoLike(
  'src/components/SubcomponenteCompex/SeguimientoAutorizacionCompania.jsx',
  'seguimiento_autorizacion_compania',
  [
    ['${etiquetaTipoCorreo(nuevo.tipoCorreo)} a la compañía de seguros', "${t('complex.ui.seguimiento_autorizacion_compania.a_compania_seguros', { tipo: etiquetaTipoCorreo(nuevo.tipoCorreo) })}"],
    ["window.confirm('¿Eliminar este registro de seguimiento a la compañía?')", "window.confirm(t('complex.ui.seguimiento_autorizacion_compania.confirmar_eliminar'))"],
    ["'Resumen — autorización compañía'", "t('complex.ui.seguimiento_autorizacion_compania.resumen_autorizacion')"],
  ]
);

patchSeguimientoLike(
  'src/components/SubcomponenteCompex/SeguimientoDocumentosPago.jsx',
  'seguimiento_documentos_pago',
  [
    ['${etiquetaTipoCorreo(nuevo.tipoCorreo)} — ${etiquetaDestinatario(nuevo.destinatario)}',
     "${t('complex.ui.seguimiento_documentos_pago.tipo_destinatario', { tipo: etiquetaTipoCorreo(nuevo.tipoCorreo), destinatario: etiquetaDestinatario(nuevo.destinatario) })}"],
    ["window.confirm('¿Eliminar este registro de seguimiento de documentos de pago?')", "window.confirm(t('complex.ui.seguimiento_documentos_pago.confirmar_eliminar'))"],
  ]
);

patchSeguimientoLike(
  'src/components/SubcomponenteCompex/SeguimientoDocumentosPendientes.jsx',
  'seguimiento_documentos_pendientes',
  [
    ["'Seguimiento a documentación pendiente'", "t('complex.ui.seguimiento_documentos_pendientes.titulo_seguimiento_doc')"],
    ["window.confirm('¿Eliminar este registro de seguimiento documental?')", "window.confirm(t('complex.ui.seguimiento_documentos_pendientes.confirmar_eliminar'))"],
    ["'Resumen — seguimiento documental'", "t('complex.ui.seguimiento_documentos_pendientes.resumen_documental')"],
  ]
);

console.log('Part 2a done');
