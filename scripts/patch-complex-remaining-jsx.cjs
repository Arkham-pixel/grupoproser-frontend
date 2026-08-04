/**
 * Parches de strings UI restantes en componentes Complex.
 * node scripts/patch-complex-remaining-jsx.cjs
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function patch(rel, replacements) {
  let s = fs.readFileSync(path.join(root, rel), 'utf8');
  let n = 0;
  for (const [from, to] of replacements) {
    if (!s.includes(from)) {
      console.warn('MISS', rel, JSON.stringify(from).slice(0, 80));
      continue;
    }
    const count = s.split(from).length - 1;
    s = s.split(from).join(to);
    n += count;
  }
  fs.writeFileSync(path.join(root, rel), s);
  console.log('patched', rel, 'replacements=', n);
}

function ensureI18n(rel, importPath) {
  let s = fs.readFileSync(path.join(root, rel), 'utf8');
  if (s.includes('i18n.t.bind') || s.includes('useTranslation')) return;
  s = `import i18n from '${importPath}';\nconst t = i18n.t.bind(i18n);\n` + s;
  fs.writeFileSync(path.join(root, rel), s);
}

const T = (ns, key, interp) =>
  interp
    ? `t('complex.ui.${ns}.${key}', ${interp})`
    : `t('complex.ui.${ns}.${key}')`;

// ===== Trazabilidad.jsx =====
ensureI18n('src/components/SubcomponenteCompex/Trazabilidad.jsx', '../../i18n');
patch('src/components/SubcomponenteCompex/Trazabilidad.jsx', [
  [`String(codigoResponsable).toLowerCase() !== 'sin asignar'`, `String(codigoResponsable).toLowerCase() !== t('complex.ui.trazabilidad.sin_asignar') && String(codigoResponsable).toLowerCase() !== 'sin asignar' && String(codigoResponsable).toLowerCase() !== 'unassigned'`],
  [`etiquetaEstado: 'Ajustador asignado'`, `etiquetaEstado: t('complex.ui.trazabilidad.ajustador_asignado_estado')`],
  [`etiquetaEstado: 'Sin ajustador asignado'`, `etiquetaEstado: t('complex.ui.trazabilidad.sin_ajustador_asignado')`],
  [`if (!diasInfo) return 'Sin tiempo';`, `if (!diasInfo) return t('complex.ui.trazabilidad.sin_tiempo');`],
  [`if (horas === 0) return '0 horas';`, `if (horas === 0) return t('complex.ui.trazabilidad.cero_horas');`],
  [`if (horas === 1) return '1 hora';`, `if (horas === 1) return t('complex.ui.trazabilidad.una_hora');`],
  [`return \`\${horas} horas\`;`, `return t('complex.ui.trazabilidad.n_horas', { n: horas });`],
  [`if (diasInfo.dias === 0) return '0 días';`, `if (diasInfo.dias === 0) return t('complex.ui.trazabilidad.cero_dias');`],
  [`if (diasInfo.dias === 1) return '1 día';`, `if (diasInfo.dias === 1) return t('complex.ui.trazabilidad.un_dia');`],
  [`if (horas === 1) return '1 hora';\n      return \`\${horas} horas\`;`, `if (horas === 1) return t('complex.ui.trazabilidad.una_hora');\n      return t('complex.ui.trazabilidad.n_horas', { n: horas });`],
  [`return \`\${Math.round(diasInfo.dias)} días\`;`, `return t('complex.ui.trazabilidad.n_dias', { n: Math.round(diasInfo.dias) });`],
  [`return 'Sin límite';`, `return t('complex.ui.trazabilidad.sin_limite');`],
  [`if (horas === 12) return '12 horas';`, `if (horas === 12) return t('complex.ui.trazabilidad.doce_horas');`],
  [`return \`\${horas} horas\`;\n    }\n    \n    if (diasInfo.tiempoLimite === 1) return '1 día';\n    return \`\${diasInfo.tiempoLimite} días\`;`, `return t('complex.ui.trazabilidad.n_horas', { n: horas });\n    }\n    \n    if (diasInfo.tiempoLimite === 1) return t('complex.ui.trazabilidad.un_dia');\n    return t('complex.ui.trazabilidad.n_dias', { n: diasInfo.tiempoLimite });`],
  [`alert('No se puede editar este documento: no tiene un identificador de formulario asociado.');`, `alert(t('complex.ui.trazabilidad.no_editar_sin_formulario'));`],
  [`alert('No se pudo descargar el documento.');`, `alert(t('complex.ui.trazabilidad.no_descargar_documento'));`],
  [`alert('No se puede descargar el documento. URL no disponible.');`, `alert(t('complex.ui.trazabilidad.no_descargar_url'));`],
  [`return \`Referencia: \${day}/\${month}/\${year}\`;`, `return t('complex.ui.trazabilidad.referencia', { fecha: \`\${day}/\${month}/\${year}\` });`],
  [`return \` • Agregado: \${day}/\${month}/\${year}\`;`, `return t('complex.ui.trazabilidad.agregado', { fecha: \`\${day}/\${month}/\${year}\` });`],
  [`diasInfo.dias === 0 && !diasInfo.horas ? 'Sin tiempo' : 
                   diasInfo.mostrarHoras ? \`Desde referencia\` :
                   diasInfo.dias === 0 ? 'Mismo día' : 
                   diasInfo.dias === 1
                     ? (diasInfo.usaDiasHabiles ? '1 día hábil desde referencia' : '1 día desde referencia')
                     : \`\${Math.round(diasInfo.dias)} \${diasInfo.usaDiasHabiles ? 'días hábiles' : 'días'} desde referencia\``,
   `diasInfo.dias === 0 && !diasInfo.horas ? t('complex.ui.trazabilidad.sin_tiempo') : 
                   diasInfo.mostrarHoras ? t('complex.ui.trazabilidad.desde_referencia') :
                   diasInfo.dias === 0 ? t('complex.ui.trazabilidad.mismo_dia') : 
                   diasInfo.dias === 1
                     ? (diasInfo.usaDiasHabiles ? t('complex.ui.trazabilidad.un_dia_habil_desde_referencia') : t('complex.ui.trazabilidad.un_dia_desde_referencia'))
                     : (diasInfo.usaDiasHabiles
                        ? t('complex.ui.trazabilidad.n_dias_habiles_desde_referencia', { n: Math.round(diasInfo.dias) })
                        : t('complex.ui.trazabilidad.n_dias_desde_referencia', { n: Math.round(diasInfo.dias) }))`],
  ['`Documento ${index + 1}`', `t('complex.ui.trazabilidad.documento_n', { n: index + 1 })`],
  [`titulo="Recepción de asignación"`, `titulo={t('complex.ui.etapas_trazabilidad.recepcion_asignacion')}`],
  [`titulo="Cargue y asignación interna"`, `titulo={t('complex.ui.etapas_trazabilidad.cargue_asignacion_interna')}`],
  [`titulo="Coordinación de Inspección"`, `titulo={t('complex.ui.etapas_trazabilidad.coordinacion_inspeccion')}`],
  [`titulo="Inspección"`, `titulo={t('complex.ui.etapas_trazabilidad.inspeccion')}`],
  [`titulo="Seguimiento de documentos pendientes"`, `titulo={t('complex.ui.etapas_trazabilidad.seguimiento_documentos_pendientes')}`],
  [`titulo="Último Documento"`, `titulo={t('complex.ui.etapas_trazabilidad.ultimo_documento')}`],
  [`titulo="Seguimiento de autorización por parte de la compañía"`, `titulo={t('complex.ui.etapas_trazabilidad.seguimiento_autorizacion_compania_largo')}`],
  [`titulo="Presentación de Cifras"`, `titulo={t('complex.ui.etapas_trazabilidad.presentacion_de_cifras')}`],
  [`titulo="Seguimiento de documentos de pago"`, `titulo={t('complex.ui.etapas_trazabilidad.seguimiento_documentos_pago_largo')}`],
  [`titulo="Envío de Finiquito"`, `titulo={t('complex.ui.etapas_trazabilidad.envio_de_finiquito')}`],
  [`? 'Doc. anterior pendiente'
                        : diasInfo.enGraciaExterna
                          ? 'En prórroga (espera externa)'
                          : diasInfo.esperaExterna
                            ? 'Espera externa (no imputa)'
                            : diasInfo.diasRetraso > 0
                              ? 'Retraso'
                              : diasInfo.dias === 0 && !diasInfo.horas
                                ? 'A tiempo'
                                : diasInfo.tiempoLimite != null && diasInfo.dias <= diasInfo.tiempoLimite
                                  ? 'A tiempo'
                                  : 'En proceso'`,
   `? t('complex.ui.trazabilidad.doc_anterior_pendiente')
                        : diasInfo.enGraciaExterna
                          ? t('complex.ui.trazabilidad.en_prorroga_espera_externa')
                          : diasInfo.esperaExterna
                            ? t('complex.ui.trazabilidad.espera_externa_no_imputa')
                            : diasInfo.diasRetraso > 0
                              ? t('complex.ui.trazabilidad.retraso')
                              : diasInfo.dias === 0 && !diasInfo.horas
                                ? t('complex.ui.trazabilidad.a_tiempo')
                                : diasInfo.tiempoLimite != null && diasInfo.dias <= diasInfo.tiempoLimite
                                  ? t('complex.ui.trazabilidad.a_tiempo')
                                  : t('complex.ui.trazabilidad.en_proceso')`],
  [`? \`\${Math.round(diasInfo.diasRetraso * 24)} h retraso\`
                          : diasInfo.diasRetraso === 1
                            ? (diasInfo.usaDiasHabiles ? '1 día hábil retraso' : '1 día retraso')
                            : \`\${Math.round(diasInfo.diasRetraso)} \${diasInfo.usaDiasHabiles ? 'días hábiles' : 'días'} retraso\``,
   `? t('complex.ui.trazabilidad.h_retraso', { n: Math.round(diasInfo.diasRetraso * 24) })
                          : diasInfo.diasRetraso === 1
                            ? (diasInfo.usaDiasHabiles ? t('complex.ui.trazabilidad.un_dia_habil_retraso') : t('complex.ui.trazabilidad.un_dia_retraso'))
                            : (diasInfo.usaDiasHabiles
                              ? t('complex.ui.trazabilidad.n_dias_habiles_retraso', { n: Math.round(diasInfo.diasRetraso) })
                              : t('complex.ui.trazabilidad.n_dias_retraso', { n: Math.round(diasInfo.diasRetraso) }))`],
]);

// Fix remaining simple patterns in Trazabilidad that may have failed partial matches
{
  let s = fs.readFileSync(path.join(root, 'src/components/SubcomponenteCompex/Trazabilidad.jsx'), 'utf8');
  s = s.replace(/return '0 horas';/g, `return t('complex.ui.trazabilidad.cero_horas');`);
  s = s.replace(/return '1 hora';/g, `return t('complex.ui.trazabilidad.una_hora');`);
  s = s.replace(/return `\$\{horas\} horas`;/g, `return t('complex.ui.trazabilidad.n_horas', { n: horas });`);
  s = s.replace(/return '1 día';/g, `return t('complex.ui.trazabilidad.un_dia');`);
  s = s.replace(/return `\$\{diasInfo\.tiempoLimite\} días`;/g, `return t('complex.ui.trazabilidad.n_dias', { n: diasInfo.tiempoLimite });`);
  s = s.replace(/'Sin asignar'/g, `t('complex.ui.trazabilidad.sin_asignar')`);
  // careful - sin_asignar key value is lowercase 'sin asignar'; for display of Unassigned use a display key - actually for UI "Sin asignar" we need capital
  // The msg key sin_asignar is 'sin asignar' lowercase. For display "Sin asignar" / "Unassigned" - add note: etiqueta uses sin_asignar from datos_generales often
  s = s.replace(/etiquetaEstado: `Recibido \$\{fechaAsignacion\.toLocaleDateString\('es-CO'\)\}`/, `etiquetaEstado: t('complex.ui.trazabilidad.recibido_fecha', { fecha: fechaAsignacion.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-CO') })`);
  s = s.replace(/'Sin fecha'/g, `t('complex.ui.trazabilidad.sin_fecha')`);
  fs.writeFileSync(path.join(root, 'src/components/SubcomponenteCompex/Trazabilidad.jsx'), s);
  console.log('Trazabilidad secondary pass');
}

console.log('Part 1 done');
