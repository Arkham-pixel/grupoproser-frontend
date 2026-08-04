const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function patch(rel, fn) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, 'utf8');
  const out = fn(s);
  if (out === s) console.warn('no change', rel);
  else {
    fs.writeFileSync(p, out);
    console.log('ok', rel);
  }
}

function ensureT(s, importPath) {
  if (/const \{ t \} = useTranslation/.test(s) || /i18n\.t\.bind/.test(s)) return s;
  if (/useTranslation\(\);/.test(s)) return s.replace(/useTranslation\(\);/, 'const { t } = useTranslation();');
  if (/const \{[^}]*t[^}]*\} = useTranslation/.test(s)) return s;
  return `import i18n from '${importPath}';\nconst t = i18n.t.bind(i18n);\n` + s;
}

// locales extras
{
  const es = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/es.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));
  es.complex.ui.facturacion.entendido = 'Entendido';
  es.complex.ui.facturacion.importante_guardar_caso =
    'Control de horas listo en el formulario.\n\nIMPORTANTE: Debe hacer clic en el botón «Guardar» que está arriba del caso para guardar los cambios.\n\nSi no lo hace, el control de horas no quedará guardado.';
  en.complex.ui.facturacion.entendido = 'Got it';
  en.complex.ui.facturacion.importante_guardar_caso =
    'Hours control is ready in the form.\n\nIMPORTANT: Click the "Save" button at the top of the case to save your changes.\n\nOtherwise, the hours control will not be saved.';
  fs.writeFileSync(path.join(root, 'src/locales/es.json'), JSON.stringify(es, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'src/locales/en.json'), JSON.stringify(en, null, 2) + '\n');
}

patch('src/components/SubcomponenteCompex/Trazabilidad.jsx', (s) =>
  s.replace(
    /alert\(error\?\.message \|\| ['"]No se pudo descargar el documento\.['"]\)/,
    "alert(error?.message || t('complex.ui.trazabilidad.no_descargar_documento'))"
  )
);

patch('src/components/SubcomponenteCompex/Facturacion.jsx', (s) => {
  s = s.replace(
    /mensaje=\{\s*'Control de horas listo en el formulario\.\\n\\n' \+\s*'IMPORTANTE:[\s\S]*?no quedará guardado\.'\s*\}/,
    "mensaje={t('complex.ui.facturacion.importante_guardar_caso')}"
  );
  s = s.replace(/botonTexto="Entendido"/, "botonTexto={t('complex.ui.facturacion.entendido')}");
  return s;
});

// Generic replace helper with list of [regex|string, replacement]
function apply(rel, importPath, items) {
  patch(rel, (s) => {
    s = ensureT(s, importPath);
    for (const [a, b] of items) {
      if (typeof a === 'string') {
        if (!s.includes(a)) console.warn(' miss', a.slice(0, 70));
        else s = s.split(a).join(b);
      } else {
        const before = s;
        s = s.replace(a, b);
        if (s === before) console.warn(' missre', String(a).slice(0, 70));
      }
    }
    return s;
  });
}

const NS = {
  asm: 'complex.ui.asignar_subtarea_modal',
  scp: 'complex.ui.subtareas_complex_panel',
  fvc: 'complex.ui.flujo_visita_coordinacion_panel',
  op: 'complex.ui.observaciones_pendientes',
  pci: 'complex.ui.plantilla_correo_contacto_inicial',
  pse: 'complex.ui.portal_subtarea_externa',
  ptc: 'complex.ui.protocolo_tiempos_complex',
  gec: 'complex.ui.gestion_estados_complex',
  ac: 'complex.ui.alertas_complex',
  ii: 'complex.ui.informe_indicadores2025complex',
};

apply('src/components/SubcomponenteCompex/AsignarSubtareaModal.jsx', '../../i18n', [
  ["'No se pudo cargar el seguimiento'", `t('${NS.asm}.no_cargar_seguimiento')`],
  ["'El caso no tiene identificador válido.'", `t('${NS.asm}.caso_sin_id')`],
  ["'Indique el motivo de la reasignación o del cambio de entrega.'", `t('${NS.asm}.indique_motivo_reasignacion')`],
  ["'Cambios guardados y notificación reenviada.'", `t('${NS.asm}.cambios_guardados_notif')`],
  [
    '`Subtarea creada. Correo: ${result.notificacion?.message || result.notificacion?.error || \'no enviado\'}`',
    `t('${NS.asm}.subtarea_creada_correo', { detalle: result.notificacion?.message || result.notificacion?.error || t('${NS.asm}.no_enviado') })`,
  ],
  ["'Subtarea asignada y notificación enviada'", `t('${NS.asm}.subtarea_asignada_ok')`],
  ["'Formato cargado y guardado en el caso'", `t('${NS.asm}.formato_cargado')`],
  ["'Documento cargado y guardado en el caso'", `t('${NS.asm}.documento_cargado')`],
  ["'Error al subir archivo'", `t('${NS.asm}.error_subir_archivo')`],
  ["'Escriba el motivo de la reapertura: el asignado recibirá ese mensaje.'", `t('${NS.asm}.escriba_motivo_reapertura')`],
  [
    '`Subtarea reabierta, pero el correo al asignado falló: ${notif.message || notif.error || \'sin detalle\'}`',
    `t('${NS.asm}.reabierta_correo_fallo', { detalle: notif.message || notif.error || t('${NS.asm}.sin_detalle') })`,
  ],
  [
    "'Subtarea reabierta. El asignado fue notificado con su motivo y la verá en Mis Subtareas.'",
    `t('${NS.asm}.reabierta_ok')`,
  ],
  ["'Completada en caso'", `t('${NS.asm}.completada_en_caso')`],
  ["'Etapa caso pendiente'", `t('${NS.asm}.etapa_caso_pendiente')`],
  ["'sin fecha base'", `t('${NS.asm}.sin_fecha_base')`],
  ["'Notificación reenviada.'", `t('${NS.asm}.notificacion_reenviada')`],
  ["'No se pudo reenviar la notificación'", `t('${NS.asm}.no_reenviar_notif')`],
  ["' (ya completada en el caso)'", `t('${NS.asm}.ya_completada_en_caso')`],
  [
    "'La etapa no se puede cambiar después de asignar para conservar la trazabilidad.'",
    `t('${NS.asm}.etapa_no_cambiar')`,
  ],
  [
    "'La fecha límite se calcula con el protocolo de tiempos vigente.'",
    `t('${NS.asm}.fecha_limite_protocolo')`,
  ],
  ["'Puede ajustar la fecha límite.'", `t('${NS.asm}.puede_ajustar_fecha')`],
  ["'Calculada automáticamente según el protocolo'", `t('${NS.asm}.calculada_automaticamente')`],
  ["'según protocolo'", `t('${NS.asm}.segun_protocolo')`],
  [
    "' — falta fecha de referencia en el caso (p. ej. asignación).'",
    `t('${NS.asm}.falta_fecha_referencia')`,
  ],
  [/>Guardar cambios</, `>{t('${NS.asm}.guardar_cambios')}<`],
]);

// flujo completo long string - flexible
patch('src/components/SubcomponenteCompex/AsignarSubtareaModal.jsx', (s) => {
  s = s.replace(
    / Esta asignación incluye el flujo completo:[^'"]+/,
    `' + t('${NS.asm}.asignacion_flujo_completo') + '`
  );
  // if it was a full string
  s = s.replace(
    /['"] Esta asignación incluye el flujo completo:[\s\S]*?ajustador\.['"]/,
    `t('${NS.asm}.asignacion_flujo_completo')`
  );
  return s;
});

apply('src/components/SubcomponenteCompex/SubtareasComplexPanel.jsx', '../../i18n', [
  [
    '`Subtarea creada. Aviso: ${result.notificacion?.message || result.notificacion?.error || \'no se pudo enviar el correo\'}`',
    `t('${NS.scp}.subtarea_creada_aviso', { detalle: result.notificacion?.message || result.notificacion?.error || t('${NS.scp}.no_enviar_correo') })`,
  ],
  ["'Subtarea creada y notificación enviada'", `t('${NS.scp}.subtarea_creada_ok')`],
  ["'Error al crear subtarea'", `t('${NS.scp}.error_crear')`],
  [
    '`Reenviado con advertencia: ${result.notificacion?.error || result.notificacion?.message || \'\'}`',
    `t('${NS.scp}.reenviado_advertencia', { detalle: result.notificacion?.error || result.notificacion?.message || '' })`,
  ],
  ["'Notificación reenviada'", `t('${NS.scp}.notificacion_reenviada')`],
  ["`Caso ${nmroAjste}`", `t('${NS.scp}.caso_n', { n: nmroAjste })`],
  ["'Coordinación con ajustadores internos o externos'", `t('${NS.scp}.coordinacion_ajustadores')`],
  [
    "`${s.nombreExterno || 'Externo'} (${s.emailExterno || 'sin email'})`",
    "`${s.nombreExterno || t('complex.ui.subtareas_complex_utils.externo')} (${s.emailExterno || t('complex.ui.subtareas_complex_utils.sin_email')})`",
  ],
  ["' · Sin fecha de protocolo'", `t('complex.ui.subtareas_complex_utils.sin_fecha_protocolo')`],
]);

apply('src/components/SubcomponenteCompex/FlujoVisitaCoordinacionPanel.jsx', '../../i18n', [
  [
    "'Suba el acta (físico) o genérela con el formato, y las fotos/datos de la visita'",
    `t('${NS.fvc}.suba_acta_fotos')`,
  ],
  ["'Debe adjuntar acta y/o fotos de la visita antes de cerrar'", `t('${NS.fvc}.debe_adjuntar_acta')`],
  [
    "'Esta subtarea exige el informe preliminar antes de cerrar. Genérelo o súbalo como formato.'",
    `t('${NS.fvc}.exige_preliminar')`,
  ],
  ["'debe completar el informe preliminar antes de cerrar.'", `t('${NS.fvc}.debe_completar_preliminar')`],
  ["'se entrega el acta y los soportes al ajustador.'", `t('${NS.fvc}.entrega_acta_soportes')`],
  [
    "'puede continuar con informe preliminar o cerrar para que el ajustador continúe.'",
    `t('${NS.fvc}.puede_continuar_o_cerrar')`,
  ],
  ["'Observaciones de la coordinación'", `t('${NS.fvc}.observaciones_coordinacion')`],
  ["'Notas de la llamada / coordinación…'", `t('${NS.fvc}.notas_llamada')`],
  [
    "'Ya hay acta/documentos de visita cargados. Quedarán en la trazabilidad del caso (Inspección).'",
    `t('${NS.fvc}.ya_hay_acta')`,
  ],
  [
    "'Debe elaborar el acta (subir físico o generar con el formato) y cargar fotos / datos de la visita.'",
    `t('${NS.fvc}.debe_elaborar_acta')`,
  ],
  [
    "'Informe preliminar obligatorio. Genérelo en el formulario de ajuste o súbalo como formato antes de cerrar la tarea.'",
    `t('${NS.fvc}.preliminar_obligatorio')`,
  ],
  [
    "'Informe preliminar opcional. Genérelo en el formulario de ajuste o súbalo como formato; luego cierre la tarea.'",
    `t('${NS.fvc}.preliminar_opcional')`,
  ],
  ["|| 'Coordinación'", `|| t('${NS.fvc}.coordinacion')`],
]);

apply('src/components/SubcomponenteCompex/ObservacionesPendientes.jsx', '../../i18n', [
  [
    "alert('No se puede descargar la evidencia. URL no disponible.');",
    `alert(t('${NS.op}.no_descargar_evidencia'));`,
  ],
  [
    "alert('Por favor complete la fecha y la observación.');",
    `alert(t('${NS.op}.complete_fecha_observacion'));`,
  ],
  [
    /errorResp\.error \|\| `Error subiendo archivo \(\$\{response\.status\}\)`/,
    `errorResp.error || t('${NS.op}.error_subiendo_archivo', { status: response.status })`,
  ],
  [
    /alert\(`Error al subir la evidencia: \$\{error\.message\}`\);/,
    `alert(t('${NS.op}.error_subir_evidencia', { mensaje: error.message }));`,
  ],
  [
    "window.confirm('¿Está seguro de que desea eliminar esta observación?')",
    `window.confirm(t('${NS.op}.confirmar_eliminar'))`,
  ],
  ['vacio="Sin evidencia"', `vacio={t('${NS.op}.sin_evidencia')}`],
  [
    /No hay observaciones registradas\. Agregue una nueva usando el botón "\+ Nuevo"\./,
    `\${t('${NS.op}.no_hay_observaciones')}`,
  ],
]);

apply('src/components/SubcomponenteCompex/PlantillaCorreoContactoInicial.jsx', '../../i18n', [
  [
    /Plantilla en el caso \(última versión guardada en servidor: \$\{[^}]+\}/,
    `\$\{t('${NS.pci}.plantilla_en_caso', { fecha: new Date(formData.plantillaContactoInicial.actualizadoEn).toLocaleString() })`,
  ],
  [
    "'Plantilla asociada al caso — pulse Guardar caso para persistir en el servidor'",
    `t('${NS.pci}.plantilla_asociada')`,
  ],
]);

apply('src/components/SubcomponenteCompex/PortalSubtareaExterna.jsx', '../../i18n', [
  ["'No se pudo abrir el enlace'", `t('${NS.pse}.no_abrir_enlace')`],
  [
    /Debe diligenciar y guardar el formulario de ajuste \(informe\) antes de marcar la tarea completada\.[^'"]*/,
    `t('${NS.pse}.debe_diligenciar_informe')`,
  ],
  [
    "`Indique las fechas: ${faltantes.join(', ')}.`",
    `t('${NS.pse}.indique_fechas', { faltantes: faltantes.join(', ') })`,
  ],
  [
    "'Antes de cerrar suba el acta y/o las fotos y datos de la visita.'",
    `t('${NS.pse}.antes_cerrar_suba_acta')`,
  ],
  [
    "`Indique las fechas de la etapa (como en trazabilidad): ${faltantes.join(', ')}.`",
    `t('${NS.pse}.indique_fechas_etapa', { faltantes: faltantes.join(', ') })`,
  ],
  [
    "'Subtarea marcada como completada. Las fechas quedaron en la trazabilidad del caso. Gracias.'",
    `t('${NS.pse}.marcada_completada')`,
  ],
  [
    "'Avance guardado. Las fechas se sincronizaron con la trazabilidad del caso.'",
    `t('${NS.pse}.avance_guardado')`,
  ],
  [
    "'Informe cargado correctamente y guardado en el caso.'",
    `t('${NS.pse}.informe_cargado')`,
  ],
  ["' · solo fechas (sin documento)'", `t('${NS.pse}.solo_fechas')`],
  [
    "'Observaciones (igual que en trazabilidad)…'",
    `t('${NS.pse}.observaciones_placeholder')`,
  ],
]);

apply('src/components/SubcomponenteCompex/ProtocoloTiemposComplex.jsx', '../../i18n', [
  ["'Días calendario'", `t('${NS.ptc}.dias_calendario')`],
  ["'Días hábiles'", `t('${NS.ptc}.dias_habiles')`],
  ["'Mismo día calendario'", `t('${NS.ptc}.mismo_dia_calendario')`],
  [
    "'Protocolo guardado. Las alertas automáticas usarán estos valores.'",
    `t('${NS.ptc}.protocolo_guardado')`,
  ],
  ["'Error al guardar'", `t('${NS.ptc}.error_al_guardar')`],
  [
    "'¿Restaurar el protocolo a los valores del documento oficial?'",
    `t('${NS.ptc}.confirmar_restaurar')`,
  ],
  ["'Protocolo restaurado a valores por defecto.'", `t('${NS.ptc}.protocolo_restaurado')`],
  ["'Error al restaurar'", `t('${NS.ptc}.error_al_restaurar')`],
  ["'Complex · Protocolo'", `t('${NS.ptc}.complex_protocolo')`],
  [/>Guardar cambios</, `>{t('${NS.ptc}.guardar_cambios')}<`],
]);

apply('src/components/SubcomponenteCompex/GestionEstadosComplex.jsx', '../../i18n', [
  ["'Error al cargar los estados'", `t('${NS.gec}.error_cargar')`],
  ["'Por favor complete todos los campos requeridos.'", `t('${NS.gec}.complete_campos')`],
  ["'El código de estado debe ser un número positivo.'", `t('${NS.gec}.codigo_positivo')`],
  [
    '`Ya existe un estado con el código ${codigoNum}. Por favor use otro código.`',
    `t('${NS.gec}.codigo_existe', { codigo: codigoNum })`,
  ],
  ["'✅ Estado creado exitosamente'", `t('${NS.gec}.estado_creado')`],
  [
    "`❌ Error al crear estado: ${err.message || 'Error desconocido'}`",
    `t('${NS.gec}.error_crear', { mensaje: err.message || t('${NS.gec}.error_desconocido') })`,
  ],
  [
    '`¿Está seguro de que desea eliminar el estado "${descEstdo}" (Código: ${codiEstdo})?`',
    `t('${NS.gec}.confirmar_eliminar', { desc: descEstdo, codigo: codiEstdo })`,
  ],
  ["'✅ Estado eliminado exitosamente'", `t('${NS.gec}.estado_eliminado')`],
  [
    "`❌ Error al eliminar estado: ${err.message || 'Error desconocido'}`",
    `t('${NS.gec}.error_eliminar', { mensaje: err.message || t('${NS.gec}.error_desconocido') })`,
  ],
  ["'✕ Cancelar'", `t('${NS.gec}.cancelar')`],
  ["'+ Agregar Estado'", `t('${NS.gec}.agregar_estado')`],
  [/>Guardar Estado</, `>{t('${NS.gec}.guardar_estado')}<`],
  ["'🗑️ Eliminar'", `t('${NS.gec}.eliminar')`],
]);

apply('src/components/AlertasComplex.jsx', '../i18n', [
  ["'Error de conexión'", `t('${NS.ac}.error_conexion')`],
  ["'Correo enviado'", `t('${NS.ac}.correo_enviado')`],
  ["'No se pudo enviar el correo'", `t('${NS.ac}.no_enviar_correo')`],
  ["'Error de conexión al enviar alertas'", `t('${NS.ac}.error_conexion_enviar')`],
  ["'Enviar alertas a todos'", `t('${NS.ac}.enviar_alertas_todos')`],
  [
    "'¿Enviar correos de alerta a todos los ajustadores con casos pendientes?'",
    `t('${NS.ac}.confirmar_enviar_todos')`,
  ],
  ["'Envío completado'", `t('${NS.ac}.envio_completado')`],
  [
    '`Alertas enviadas a ${data.data?.totalEnviados ?? 0} ajustador(es)`',
    `t('${NS.ac}.alertas_enviadas', { n: data.data?.totalEnviados ?? 0 })`,
  ],
  ["'Casos críticos'", `t('${NS.ac}.casos_criticos')`],
  ["'Sin asegurado'", `t('${NS.ac}.sin_asegurado')`],
]);

apply('src/components/InformeIndicadores2025Complex.jsx', '../i18n', [
  ["'Sin asignar'", `t('${NS.ii}.sin_asignar')`],
  ["'sin asignar'", `t('${NS.ii}.sin_asignar').toLowerCase()`],
  [/>Descargar informe Excel</, `>{t('${NS.ii}.descargar_informe_excel')}<`],
  ["'Prom. Asignación → Primer contacto'", `t('${NS.ii}.prom_asignacion_contacto')`],
  ["'Prom. Primer contacto → Inspección'", `t('${NS.ii}.prom_contacto_inspeccion')`],
  ["'% cumpl. Asignación → Primer contacto'", `t('${NS.ii}.pct_cumpl_asignacion_contacto')`],
  ["'Éxito — facturado / pagado'", `t('${NS.ii}.exito_facturado_pagado')`],
  ["'Participación'", `t('${NS.ii}.participacion')`],
  ["|| 'histórico'", `|| t('${NS.ii}.historico_default')`],
]);

console.log('batch B done');
