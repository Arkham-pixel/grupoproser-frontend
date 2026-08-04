/**
 * Protocolo COMPLEX — defaults (espejo del backend).
 * Fuente: PROTOCOLO ATENCIÓN DE SINIESTROS - ÚLTIMA VERSIÓN (26 jun 2026).
 * @see grupoproser-backend/config/protocoloSiniestrosDefaults.js
 */

export const PROTOCOLO_VERSION = '2026-06-26-ultima';
export const PROTOCOLO_FECHA_ACTIVACION = '2025-10-01';
export const PROTOCOLO_DOCUMENTO =
  'PROTOCOLO ATENCIÓN DE SINIESTROS - ÚLTIMA VERSIÓN (26 jun 2026)';

export const PROTOCOLO_OBJETIVO =
  'Estandarizar la atención desde la recepción de la asignación hasta presentación de cifras, finiquitos y seguimiento de documentos para pago, con trazabilidad en ARNALD y cumplimiento de tiempos internos.';

/** Resumen de plazos del documento oficial (portada). */
export const RESUMEN_PLAZOS_PROTOCOLO = [
  { valor: '12 horas', titulo: 'Primer contacto y cargue', etapaId: 'contactoInicial' },
  { valor: '3 días hábiles', titulo: 'Informe preliminar', etapaId: 'informePreliminar' },
  { valor: '1–3 días hábiles', titulo: 'Inspección de campo', etapaId: 'inspeccion' },
  { valor: '3 días hábiles', titulo: 'Informe final tras acreditación', etapaId: 'informeFinal' },
];

export const NOTAS_IMPLEMENTACION_PROTOCOLO = [
  'Los tiempos se cuentan desde la fecha y hora real registrada en cada hito de ARNALD.',
  'Inspección y cargue de acta usan días hábiles de Colombia (no sábado, domingo ni festivos).',
  'Si la visita/programación es un viernes, el plazo de 1 día hábil llega hasta el lunes siguiente.',
  'Si no es posible inspeccionar en el plazo ideal, dejar trazabilidad de la causa y la nueva fecha coordinada.',
  'El seguimiento documental continúa hasta acreditación y, después, hasta completar documentos de pago.',
  'En esperas de terceros (asegurado, compañía, intermediario) la primera alerta se envía tras 10 días hábiles.',
  'Esa prórroga de 10 días hábiles no imputa tiempos ni retraso al ajustador: solo aplaza alertas y seguimientos de espera externa.',
];

export const GRACIA_ESPERA_EXTERNA_DIAS_HABILES = 10;

export const ALERTAS_ESPERA_EXTERNA_DEFAULT = [
  {
    id: 'coordinacionInspeccion',
    fase: 4,
    nombre: 'Coordinación de inspección',
    referencia: 'fchaContIni',
    requiereCampo: 'fchaContIni',
    camposCompletitud: ['fchaProgInspeccion', 'fchaInspccion'],
    mensaje:
      'Sin fecha programada de inspección: han pasado 10 días hábiles desde el contacto inicial',
    accion: 'Coordinar con el asegurado/intermediario y registrar la fecha programada de inspección',
  },
];

/** Relación entre bandejas de trazabilidad y fases del protocolo. */
export const MAPEO_TRAZABILIDAD_PROTOCOLO = {
  recepcionAsignacion: { fase: 1, etapaId: 'activacionRecepcion' },
  carguePlataforma: { fase: 2, etapaId: 'carguePlataforma' },
  contactoInicial: { fase: 3, etapaId: 'contactoInicial' },
  coordinacionInspeccion: { fase: 4, esperaExternaId: 'coordinacionInspeccion' },
  inspeccion: { fase: 5, etapaId: 'inspeccion' },
  solicitudDocs: { fase: 6, etapaId: 'solicitudDocs' },
  informePreliminar: { fase: 7, etapaId: 'informePreliminar' },
  seguimientoDocsPendientes: { fase: 8, seguimientoId: 'seguimientoDocumentos' },
  ultimoDocumento: { fase: 9, etapaId: 'acreditacion' },
  informeFinal: { fase: 10, etapaId: 'informeFinal' },
  seguimientoAutorizacionCompania: { fase: 11, seguimientoId: 'seguimientoAutorizacion', etapaId: 'autorizacionCifras' },
  presentacionCifras: { fase: 12, etapaId: 'presentacionCifras' },
  seguimientoDocumentosPago: { fase: 13, seguimientoId: 'seguimientoPago' },
  envioFiniquito: { fase: 14, etapaId: 'envioFiniquito' },
};

export const TIEMPOS_OBJETIVO_SERVICIO = [
  { escenario: 'Asignación → informe preliminar', tiempo: '3 días hábiles' },
  { escenario: 'Acreditación → informe final', tiempo: '3 días hábiles' },
  { escenario: 'Aprobación de cifras → envío de finiquitos', tiempo: '12 horas' },
  {
    escenario: 'Gestión directa del ajustador (sin esperas externas)',
    tiempo: 'Aprox. 6 días hábiles + 12 horas',
  },
];

/**
 * Secuencia de mediciones: cada indicador mide desde el hito anterior registrado,
 * no desde asignación (salvo el primer contacto).
 */
export const SECUENCIA_INDICADORES_TIEMPO = [
  { muestra: 'asignacionContacto', desde: 'fchaAsgncion', hasta: 'fchaContIni' },
  { muestra: 'contactoInspeccion', desde: 'fchaContIni', hasta: 'fchaInspccion' },
  { muestra: 'inspeccionSolicitudDocs', desde: 'fchaInspccion', hasta: 'fchaSoliDocu' },
  {
    muestra: 'etapaPreliminar',
    desde: 'fchaSoliDocu',
    hasta: 'fchaInfoPrelm',
    fallbackDesde: 'fchaInspccion',
    // Plazo del protocolo en días hábiles: se mide excluyendo fines de semana y festivos.
    unidad: 'dias_habiles',
  },
  {
    muestra: 'ultimoDocInformeFinal',
    desde: 'fchaRepoActi',
    hasta: 'fchaInfoFnal',
    unidad: 'dias_habiles',
  },
  {
    muestra: 'informeFinalAutorizacion',
    desde: 'fchaInfoFnal',
    hasta: 'fchaAceptacionCifrasAseguradora',
    // Espera de la compañía: no imputa tiempos del ajustador.
    imputableAjustador: false,
  },
  {
    muestra: 'aprobacionPresentacion',
    desde: 'fchaAceptacionCifrasAseguradora',
    hasta: 'fchaPresentacionCifras',
  },
];

/** Indicadores de gestión alineados al protocolo (pestaña Indicadores protocolo). */
export const INDICADORES_PROTOCOLO_DEF = [
  {
    clave: 'promedioAsignacionContacto',
    muestra: 'asignacionContacto',
    label: 'Asignación → Primer contacto',
    desdeLegible: 'asignación recibida',
    hastaLegible: 'primer contacto con el asegurado',
    plazoLegible: '12 horas',
    etapaId: 'contactoInicial',
    plazoObjetivo: '12 horas desde asignación',
  },
  {
    clave: 'promedioContactoInspeccion',
    muestra: 'contactoInspeccion',
    label: 'Contacto → Inspección',
    desdeLegible: 'primer contacto',
    hastaLegible: 'inspección de campo',
    plazoLegible: '1 a 3 días hábiles',
    etapaId: 'inspeccion',
    plazoObjetivo: 'Ideal 24 h · máximo 72 h desde contacto',
  },
  {
    clave: 'promedioInspeccionSolicitudDocs',
    muestra: 'inspeccionSolicitudDocs',
    label: 'Inspección → Solicitud de documentos',
    desdeLegible: 'inspección realizada',
    hastaLegible: 'solicitud de documentos adicionales',
    plazoLegible: '12 horas',
    etapaId: 'solicitudDocs',
    plazoObjetivo: '12 horas desde inspección',
  },
  {
    clave: 'promedioEtapaPreliminar',
    muestra: 'etapaPreliminar',
    label: 'Inspección o solicitud → Informe preliminar',
    desdeLegible: 'inspección o solicitud de documentos',
    hastaLegible: 'informe preliminar',
    plazoLegible: '3 días hábiles',
    etapaId: 'informePreliminar',
    plazoObjetivo: '3 días hábiles desde solicitud de docs (o inspección)',
  },
  {
    clave: 'promedioUltimoDocInformeFinal',
    muestra: 'ultimoDocInformeFinal',
    label: 'Acreditación → Informe final',
    desdeLegible: 'último documento acreditado',
    hastaLegible: 'informe final',
    plazoLegible: '3 días hábiles',
    etapaId: 'informeFinal',
    plazoObjetivo: '3 días hábiles desde último documento',
  },
  {
    clave: 'promedioInformeFinalAutorizacion',
    muestra: 'informeFinalAutorizacion',
    label: 'Informe final → Autorización de cifras',
    desdeLegible: 'informe final enviado',
    hastaLegible: 'autorización de cifras por la compañía',
    plazoLegible: 'espera externa (compañía)',
    etapaId: 'autorizacionCifras',
    plazoObjetivo: 'Espera externa — no imputa al ajustador (gracia 10 días hábiles en alertas)',
    imputableAjustador: false,
  },
  {
    clave: 'promedioAprobacionPresentacion',
    muestra: 'aprobacionPresentacion',
    label: 'Aprobación → Presentación de cifras',
    desdeLegible: 'cifras aprobadas',
    hastaLegible: 'presentación formal a la compañía',
    plazoLegible: '12 horas',
    etapaId: 'presentacionCifras',
    plazoObjetivo: '12 horas desde aprobación',
  },
  {
    clave: 'promedioAsignacionCierre',
    muestra: 'asignacionCierre',
    label: 'Asignación → Cierre del caso',
    plazoObjetivo: 'Hasta envío de finiquito o indemnización',
  },
];

export const ETAPAS_PROTOCOLO_DEFAULT = [
  {
    id: 'activacionRecepcion',
    fase: 1,
    nombre: 'Recepción de asignación',
    referencia: 'fchaAsgncion',
    limite: { valor: 0, unidad: 'dias' },
    alertaVencimiento: false,
    alcance: 'todos',
  },
  {
    id: 'carguePlataforma',
    fase: 2,
    nombre: 'Cargue a plataforma y asignación interna',
    referencia: 'fchaAsgncion',
    limite: { valor: 12, unidad: 'horas' },
    alertaVencimiento: true,
    alcance: 'soporte',
    criterioCompletitud: 'codiRespnsble',
  },
  {
    id: 'contactoInicial',
    fase: 3,
    nombre: 'Contacto inicial',
    campoFecha: 'fchaContIni',
    campoDoc: 'anexContIni',
    referencia: 'fchaAsgncion',
    limite: { valor: 12, unidad: 'horas' },
    alertaVencimiento: true,
    alcance: 'ajustador',
  },
  {
    id: 'inspeccion',
    fase: 4,
    nombre: 'Inspección de campo',
    campoFecha: 'fchaInspccion',
    campoDoc: null,
    referencia: 'fchaProgInspeccion',
    referenciaAlternativa: 'fchaContIni',
    limite: { valor: 1, unidad: 'dias_habiles' },
    limiteMaximo: { valor: 3, unidad: 'dias_habiles' },
    alertaVencimiento: true,
    alcance: 'ajustador',
  },
  {
    id: 'actaInspeccion',
    fase: 5,
    nombre: 'Cargue del acta de inspección',
    campoFecha: 'fchaInspccion',
    campoDoc: 'anexActaInspccion',
    referencia: 'fchaInspccion',
    limite: { valor: 1, unidad: 'dias_habiles' },
    alertaVencimiento: true,
    alcance: 'ajustador',
  },
  {
    id: 'solicitudDocs',
    fase: 6,
    nombre: 'Solicitud de documentos adicionales',
    campoFecha: 'fchaSoliDocu',
    campoDoc: 'anexSolDoc',
    referencia: 'fchaInspccion',
    limite: { valor: 12, unidad: 'horas' },
    alertaVencimiento: true,
    alcance: 'ajustador',
  },
  {
    id: 'informePreliminar',
    fase: 7,
    nombre: 'Informe preliminar',
    campoFecha: 'fchaInfoPrelm',
    campoDoc: 'anxoInfPrelim',
    referencia: 'fchaSoliDocu',
    referenciaAlternativa: 'fchaInspccion',
    limite: { valor: 3, unidad: 'dias_habiles' },
    alertaVencimiento: true,
    alcance: 'ajustador',
  },
  {
    id: 'acreditacion',
    fase: 9,
    nombre: 'Acreditación del siniestro',
    campoFecha: 'fchaRepoActi',
    campoDoc: null,
    referencia: 'fchaSoliDocu',
    limite: null,
    alertaVencimiento: false,
    alcance: 'ajustador',
  },
  {
    id: 'informeFinal',
    fase: 10,
    nombre: 'Informe final y liquidación',
    campoFecha: 'fchaInfoFnal',
    campoDoc: 'anxoInfoFnal',
    referencia: 'fchaRepoActi',
    limite: { valor: 3, unidad: 'dias_habiles' },
    alertaVencimiento: true,
    alcance: 'ajustador',
  },
  {
    id: 'autorizacionCifras',
    fase: 11,
    nombre: 'Autorización de cifras por la compañía',
    campoFecha: 'fchaAceptacionCifrasAseguradora',
    campoDoc: 'anxoAutorizacion',
    referencia: 'fchaInfoFnal',
    limite: { valor: 3, unidad: 'dias_habiles' },
    alertaVencimiento: false,
    dependenciaExterna: true,
    alcance: 'ajustador',
  },
  {
    id: 'presentacionCifras',
    fase: 12,
    nombre: 'Presentación de cifras y finiquitos',
    campoFecha: 'fchaPresentacionCifras',
    campoDoc: 'anxoPresentacionCifras',
    referencia: 'fchaAceptacionCifrasAseguradora',
    limite: { valor: 12, unidad: 'horas' },
    alertaVencimiento: true,
    alcance: 'ajustador',
    criterioCompletitud: 'presentacionYFiniquito',
  },
  {
    id: 'envioFiniquito',
    fase: 14,
    nombre: 'Envío de finiquito (detalle)',
    campoFecha: 'fchaEnvioFiniquito',
    campoDoc: 'anxoEnvioFiniquito',
    referencia: 'fchaPresentacionCifras',
    referenciaAlternativa: 'fchaAceptacionCifrasAseguradora',
    limite: { valor: 10, unidad: 'dias_habiles' },
    alertaVencimiento: true,
    dependenciaExterna: true,
    graciaDiasHabiles: GRACIA_ESPERA_EXTERNA_DIAS_HABILES,
    alcance: 'ajustador',
  },
];

export const SEGUIMIENTOS_RECURRENTES_DEFAULT = [
  {
    id: 'seguimientoDocumentos',
    fase: 8,
    nombre: 'Seguimiento de documentos pendientes',
    historialTipo: 'seguimientoDocsPendientes',
    intervaloDias: 15,
    graciaDiasHabiles: GRACIA_ESPERA_EXTERNA_DIAS_HABILES,
    dependenciaExterna: true,
    referencia: 'fchaSoliDocu',
    campoFechaHasta: 'fchaRepoActi',
    actividad: 'Seguimiento de documentos pendientes',
    entregable: 'Correos de seguimiento y actualización del estado documental',
    responsable: 'Ajustador asignado / analista documental',
    descripcion:
      'Primer recordatorio a los 10 días hábiles; luego cada 15 días calendario hasta acreditación.',
  },
  {
    id: 'seguimientoAutorizacion',
    fase: 11,
    nombre: 'Seguimiento autorización de cifras',
    historialTipo: 'seguimientoAutorizacionCompania',
    intervaloDias: 5,
    graciaDiasHabiles: GRACIA_ESPERA_EXTERNA_DIAS_HABILES,
    dependenciaExterna: true,
    referencia: 'fchaInfoFnal',
    campoFechaHasta: 'fchaAceptacionCifrasAseguradora',
    actividad: 'Seguimiento de autorización de cifras por la compañía',
    entregable:
      'Evidencia del correo a la compañía solicitando o reiterando autorización de cifras',
    responsable: 'Ajustador asignado (seguimiento) / Compañía (aprobación)',
    descripcion:
      'Primer recordatorio a los 10 días hábiles; luego cada 5 días calendario hasta aprobación de cifras.',
  },
  {
    id: 'seguimientoPago',
    fase: 13,
    nombre: 'Seguimiento documentos para pago',
    historialTipo: 'seguimientoDocumentosPago',
    intervaloDias: 15,
    graciaDiasHabiles: GRACIA_ESPERA_EXTERNA_DIAS_HABILES,
    dependenciaExterna: true,
    referencia: 'fchaAceptacionCifrasAseguradora',
    campoFechaHasta: 'fchaEnvioFiniquito',
    actividad: 'Seguimiento de documentos para pago',
    entregable:
      'Seguimiento a finiquitos, certificación bancaria, RUT, SARLAFT y demás documentos requeridos',
    responsable: 'Ajustador asignado / analista documental',
    descripcion:
      'Primer recordatorio a los 10 días hábiles; luego cada 15 días calendario hasta completar documentos de pago.',
  },
];

export function obtenerProtocoloPorDefecto() {
  return {
    clave: 'complex',
    version: PROTOCOLO_VERSION,
    documento: PROTOCOLO_DOCUMENTO,
    fechaActivacion: PROTOCOLO_FECHA_ACTIVACION,
    etapas: ETAPAS_PROTOCOLO_DEFAULT.map((e) => ({
      ...e,
      limite: { ...e.limite },
      limiteMaximo: e.limiteMaximo ? { ...e.limiteMaximo } : null,
    })),
    seguimientosRecurrentes: SEGUIMIENTOS_RECURRENTES_DEFAULT.map((s) => ({ ...s })),
    esperasExternas: ALERTAS_ESPERA_EXTERNA_DEFAULT.map((e) => ({ ...e })),
    graciaEsperaExternaDiasHabiles: GRACIA_ESPERA_EXTERNA_DIAS_HABILES,
  };
}

export function limiteALimiteDias(limite) {
  if (!limite) return null;
  if (limite.unidad === 'horas') return limite.valor / 24;
  if (limite.unidad === 'mismo_dia') return 0;
  return limite.valor;
}

export function resolverEtapaProtocoloPorTipo(tipo, protocolo) {
  const cfg = MAPEO_TRAZABILIDAD_PROTOCOLO[tipo];
  if (!cfg || !protocolo) return null;
  if (cfg.esperaExternaId) {
    return (
      protocolo.esperasExternas?.find((e) => e.id === cfg.esperaExternaId) ||
      ALERTAS_ESPERA_EXTERNA_DEFAULT.find((e) => e.id === cfg.esperaExternaId) ||
      null
    );
  }
  if (cfg.etapaId) {
    return protocolo.etapas?.find((e) => e.id === cfg.etapaId) || null;
  }
  if (cfg.seguimientoId) {
    return protocolo.seguimientosRecurrentes?.find((s) => s.id === cfg.seguimientoId) || null;
  }
  return null;
}

export function etiquetaLimiteTipoTrazabilidad(tipo, protocolo, t) {
  const cfg = MAPEO_TRAZABILIDAD_PROTOCOLO[tipo];
  if (!cfg || !protocolo) return null;
  const tr = typeof t === 'function' ? t : null;
  const baseKey = 'complex.ui.trazabilidad';

  if (cfg.esperaExternaId) {
    const gracia =
      protocolo.graciaEsperaExternaDiasHabiles ?? GRACIA_ESPERA_EXTERNA_DIAS_HABILES;
    return tr
      ? tr(`${baseKey}.plazo_gracia_espera_externa`, { n: gracia })
      : `${gracia} días hábiles (espera externa)`;
  }

  if (cfg.seguimientoId) {
    const seg = protocolo.seguimientosRecurrentes?.find((s) => s.id === cfg.seguimientoId);
    if (!seg) return null;
    const gracia = seg.graciaDiasHabiles ?? GRACIA_ESPERA_EXTERNA_DIAS_HABILES;
    if (seg.dependenciaExterna) {
      return tr
        ? tr(`${baseKey}.plazo_gracia_mas_intervalo`, {
            gracia,
            intervalo: seg.intervaloDias,
          })
        : `${gracia} días hábiles + cada ${seg.intervaloDias} días calendario`;
    }
    return tr
      ? tr(`${baseKey}.plazo_cada_dias_calendario`, { n: seg.intervaloDias })
      : `cada ${seg.intervaloDias} días calendario`;
  }

  const etapa = protocolo.etapas?.find((e) => e.id === cfg.etapaId);
  if (!etapa?.limite) return null;

  if (etapa.dependenciaExterna) {
    const gracia = etapa.graciaDiasHabiles ?? GRACIA_ESPERA_EXTERNA_DIAS_HABILES;
    return tr
      ? tr(`${baseKey}.plazo_gracia_espera_externa`, { n: gracia })
      : `${gracia} días hábiles (espera externa)`;
  }

  const ideal = etiquetaLimite(etapa.limite, tr);
  if (etapa.limiteMaximo) {
    const max = etiquetaLimite(etapa.limiteMaximo, tr);
    return tr
      ? tr(`${baseKey}.plazo_ideal_max`, { ideal, max })
      : `ideal ${ideal} · máx. ${max}`;
  }
  return ideal;
}

export function tituloEtapaConFase(tipo, tituloBase, t) {
  const fase = MAPEO_TRAZABILIDAD_PROTOCOLO[tipo]?.fase;
  if (!fase) return tituloBase;
  if (typeof t === 'function') {
    return t('complex.ui.trazabilidad.fase_n', { n: fase, titulo: tituloBase });
  }
  return `Fase ${fase} · ${tituloBase}`;
}

/** Límites en días (aprox.) por bandeja de trazabilidad, según protocolo activo. */
export function mapaTiemposLimiteDias(protocolo) {
  const etapas = Array.isArray(protocolo) ? protocolo : protocolo?.etapas;
  const seguimientos = Array.isArray(protocolo) ? [] : protocolo?.seguimientosRecurrentes;
  const mapa = {};

  Object.entries(MAPEO_TRAZABILIDAD_PROTOCOLO).forEach(([tipo, cfg]) => {
    if (cfg.seguimientoId) {
      const seg = seguimientos?.find((s) => s.id === cfg.seguimientoId);
      mapa[tipo] = seg?.intervaloDias ?? null;
      return;
    }
    const etapa = etapas?.find((e) => e.id === cfg.etapaId);
    mapa[tipo] = limiteALimiteDias(etapa?.limite);
  });

  return mapa;
}

export function plazoObjetivoIndicador(clave, protocolo, t, plazoFallback) {
  const def = INDICADORES_PROTOCOLO_DEF.find((i) => i.clave === clave);
  if (!def) return '';
  const fallback = plazoFallback || def.plazoObjetivo || '';
  const etapa = def.etapaId && protocolo?.etapas?.find((e) => e.id === def.etapaId);
  if (!etapa?.limite) return fallback;
  const base = etiquetaLimite(etapa.limite, t);
  if (etapa.limiteMaximo) {
    const max = etiquetaLimite(etapa.limiteMaximo, t);
    if (typeof t === 'function') {
      return t('complex.ui.indicadores_protocolo_complex.plazo_base_max', {
        base,
        max,
      });
    }
    return `${base} (máx. ${max})`;
  }
  return base;
}

export function etiquetaLimite(limite, t) {
  if (!limite) return '';
  const { valor, unidad } = limite;
  const tr = typeof t === 'function' ? t : null;
  if (unidad === 'mismo_dia') {
    return tr ? tr('complex.ui.indicadores_protocolo_complex.limite_mismo_dia') : 'mismo día';
  }
  if (unidad === 'horas') return `${valor} h`;
  if (unidad === 'dias_habiles') {
    if (tr) {
      return valor === 1
        ? tr('complex.ui.indicadores_protocolo_complex.limite_1_dia_habil')
        : tr('complex.ui.indicadores_protocolo_complex.limite_n_dias_habiles', { n: valor });
    }
    return `${valor} día${valor !== 1 ? 's' : ''} hábil${valor !== 1 ? 'es' : ''}`;
  }
  if (tr) {
    return valor === 1
      ? tr('complex.ui.indicadores_protocolo_complex.limite_1_dia')
      : tr('complex.ui.indicadores_protocolo_complex.limite_n_dias', { n: valor });
  }
  return `${valor} día${valor !== 1 ? 's' : ''}`;
}

/** Nombre de etapa del protocolo (UI admin / tablas) vía i18n. */
export function nombreEtapaProtocoloUi(etapaOId, t) {
  const id = typeof etapaOId === 'string' ? etapaOId : etapaOId?.id;
  const fallback =
    (typeof etapaOId === 'object' && etapaOId?.nombre) ||
    ETAPAS_PROTOCOLO_DEFAULT.find((e) => e.id === id)?.nombre ||
    id ||
    '';
  if (!id || typeof t !== 'function') return fallback;
  return t(`complex.ui.protocolo_tiempos_complex.etapa_${id}`, { defaultValue: fallback });
}

/** Nombre de seguimiento recurrente vía i18n. */
export function nombreSeguimientoProtocoloUi(segOId, t) {
  const id = typeof segOId === 'string' ? segOId : segOId?.id;
  const fallback =
    (typeof segOId === 'object' && segOId?.nombre) ||
    SEGUIMIENTOS_RECURRENTES_DEFAULT.find((s) => s.id === id)?.nombre ||
    id ||
    '';
  if (!id || typeof t !== 'function') return fallback;
  return t(`complex.ui.protocolo_tiempos_complex.seg_${id}`, { defaultValue: fallback });
}

/** Descripción de seguimiento recurrente vía i18n. */
export function descripcionSeguimientoProtocoloUi(segOId, t) {
  const id = typeof segOId === 'string' ? segOId : segOId?.id;
  const fallback =
    (typeof segOId === 'object' && (segOId?.descripcion || segOId?.referencia)) ||
    SEGUIMIENTOS_RECURRENTES_DEFAULT.find((s) => s.id === id)?.descripcion ||
    '';
  if (!id || typeof t !== 'function') return fallback;
  return t(`complex.ui.protocolo_tiempos_complex.seg_${id}_desc`, { defaultValue: fallback });
}

/** Nombre de alerta de espera externa vía i18n. */
export function nombreAlertaEsperaExternaUi(alertaOId, t) {
  const id = typeof alertaOId === 'string' ? alertaOId : alertaOId?.id;
  const fallback =
    (typeof alertaOId === 'object' && alertaOId?.nombre) ||
    ALERTAS_ESPERA_EXTERNA_DEFAULT.find((a) => a.id === id)?.nombre ||
    id ||
    '';
  if (!id || typeof t !== 'function') return fallback;
  return t(`complex.ui.protocolo_tiempos_complex.alerta_${id}`, { defaultValue: fallback });
}
