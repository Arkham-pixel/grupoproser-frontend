import { BASE_URL } from '../config/apiConfig.js';

const EXPRESS_API_URL = `${BASE_URL}/api/siniestros-express`;

const buildQueryString = (params = {}) => {
  const filteredEntries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (filteredEntries.length === 0) {
    return '';
  }
  return `?${new URLSearchParams(filteredEntries).toString()}`;
};

const toISODate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  let s = String(value).trim().replace(/\s/g, '');
  if (!s) return 0;

  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }

  const parsed = Number(s);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeLiquidador = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const normalizeExpressItem = (item = {}) => {
  const consecutivo = item.consecutivo ?? item.nmroAjste ?? item.numeroAjuste ?? item.nmro_ajste ?? '';
  const numeroSiniestro = item.numeroSiniestro ?? item.nmroSinstro ?? item.numero_siniestro ?? '';
  const responsable =
    item.responsable ??
    item.nombreResponsable ??
    item.responsableNombre ??
    item.responsable_form ??
    item.codiRespnsble ??
    '';
  const codigoWorkflow = item.codigoWorkflow ?? item.codWorkflow ?? '';
  const aseguradora =
    item.aseguradora ??
    item.nombreAseguradora ??
    item.aseguradoraNombre ??
    item.codiAsgrdra ??
    item.codAseg ??
    '';
  const aseguradoBeneficiario =
    item.aseguradoBeneficiario ?? item.asgrBenfcro ?? item.asegurado ?? item.aseguradoBeneficiario_form ?? '';
  const intermediario =
    item.intermediario ??
    item.nombreIntermediario ??
    item.intermediarioNombre ??
    item.codiIntermediario ??
    item.codIntermediario ??
    '';
  const estadoProceso =
    item.estadoProceso ??
    item.etapaProceso ??
    item.estado ?? (item.codiEstdo !== undefined ? String(item.codiEstdo) : '');
  const observacionesSeguimiento = item.observacionesSeguimiento ?? item.obseSegmnto ?? '';
  const amparo = item.amparo ?? item.amprAfecto ?? '';

  const fechaSiniestro = toISODate(item.fechaSiniestro ?? item.fchaSinstro);
  const avisoSiniestro = toISODate(item.avisoSiniestro ?? item.fechaAviso);
  const avisoSiniestroCompania = toISODate(item.avisoSiniestroCompania);
  const fechaReciboDocumentos = toISODate(item.fechaReciboDocumentos ?? item.fchaReciboDocu ?? item.fchaReciboDocumentos);
  const fechaCargueFiniquito = toISODate(item.fechaCargueFiniquito ?? item.fchaCargueFiniquito);
  const fechaSolicitudDocumentos = toISODate(item.fechaSolicitudDocumentos ?? item.fchaSoliDocu);
  const fechaAcuseReciboDocumentos = toISODate(item.fechaAcuseReciboDocumentos);
  const fechaUltimoDocumento = toISODate(item.fechaUltimoDocumento);
  const fechaDefinicionCaso = toISODate(item.fechaDefinicionCaso);
  const fechaSolicitudDocumentosAdicionales = toISODate(item.fechaSolicitudDocumentosAdicionales);
  const fechaSolicitudDocumentosPendientes = toISODate(item.fechaSolicitudDocumentosPendientes);
  const fechaSolicitudCorrecciones = toISODate(item.fechaSolicitudCorrecciones);
  const fechaCorreccionesPresentadas = toISODate(item.fechaCorreccionesPresentadas);
  const fechaPresentacionCifras = toISODate(item.fechaPresentacionCifras ?? item.fchaPresntCifras ?? item.fchaPresentacionCifras);
  const fechaReconsideracion = toISODate(item.fechaReconsideracion);
  const fechaDocumentosPago = toISODate(item.fechaDocumentosPago);
  const fechaFiniquitosFirmado = toISODate(item.fechaFiniquitosFirmado ?? item.fchaFiniquitoIndem ?? item.fchaFiniquitosFirmado);
  const fechaRecordatorio = toISODate(item.fechaRecordatorio);
  const fechaEnvioAutorizacion = toISODate(item.fechaEnvioAutorizacion);
  const fechaRespuestaAnalista = toISODate(item.fechaRespuestaAnalista);
  const fechaCierre = toISODate(item.fechaCierre);
  const createdAt = toISODate(item.createdAt ?? item.creadoEn ?? item.fechaCreacion);
  const updatedAt = toISODate(item.updatedAt ?? item.actualizadoEn ?? item.fechaActualizacion);

  const valorIndemnizacion = item.valorIndemnizacion ?? item.vlorIndemnizacion ?? item.valor_indemnizacion ?? 0;
  const valorIndemnizacionNumero = toNumber(valorIndemnizacion);
  const reserva = item.reserva ?? item.vlorResrva ?? item.valorReserva ?? 0;
  const reservaNumero = toNumber(reserva);
  const valorSalvamento = item.valorSalvamento ?? item.vlorSalvamento ?? 0;
  const valorSalvamentoNumero = toNumber(valorSalvamento);
  const salvamentoAplica = item.salvamentoAplica ?? item.salvamento_aplica ?? '';

  return {
    ...item,
    consecutivo,
    numeroSiniestro,
    responsable,
    codigoWorkflow,
    aseguradora,
    aseguradoBeneficiario,
    intermediario,
    estadoProceso,
    observacionesSeguimiento,
    amparo,
    nit: item.nit ?? '',
    analista: item.analista ?? '',
    correoNotificacion: item.correoNotificacion ?? '',
    fechaSiniestro,
    avisoSiniestro,
    avisoSiniestroCompania,
    fechaReciboDocumentos,
    fechaEnvioAutorizacion,
    fechaRespuestaAnalista,
    fechaCierre,
    fechaCargueFiniquito,
    fechaSolicitudDocumentos,
    fechaAcuseReciboDocumentos,
    fechaUltimoDocumento,
    fechaDefinicionCaso,
    fechaSolicitudDocumentosAdicionales,
    fechaSolicitudDocumentosPendientes,
    fechaSolicitudCorrecciones,
    fechaCorreccionesPresentadas,
    fechaPresentacionCifras,
    fechaReconsideracion,
    fechaDocumentosPago,
    fechaFiniquitosFirmado,
    fechaRecordatorio,
    createdAt,
    updatedAt,
    valorIndemnizacion,
    valorIndemnizacionNumero,
    reserva,
    reservaNumero,
    salvamentoAplica: salvamentoAplica ? String(salvamentoAplica) : '',
    valorSalvamento,
    valorSalvamentoNumero,
    anexos: Array.isArray(item.anexos) ? item.anexos : [],
    anexosSalvamento: Array.isArray(item.anexosSalvamento) ? item.anexosSalvamento : [],
    liquidador: normalizeLiquidador(item.liquidador),
  };
};

const normalizeResponseArray = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeExpressItem(item ?? {}));
};

export const getSiniestrosExpress = async (params = {}) => {
  const queryString = buildQueryString(params);
  const response = await fetch(`${EXPRESS_API_URL}${queryString}`);
  if (!response.ok) {
    throw new Error('Error al obtener siniestros express');
  }
  const data = await response.json();
  if (Array.isArray(data)) {
    return normalizeResponseArray(data);
  }
  if (data?.success && Array.isArray(data.data)) {
    return normalizeResponseArray(data.data);
  }
  return [];
};

export const getSiniestrosExpressPaginado = async ({ page = 1, limit = 100 } = {}) => {
  const queryString = buildQueryString({ page, limit, _t: Date.now() });
  const response = await fetch(`${EXPRESS_API_URL}${queryString}`);
  if (!response.ok) {
    throw new Error('Error al obtener siniestros express paginados');
  }
  const payload = await response.json();
  if (payload?.data && Array.isArray(payload.data)) {
    return {
      ...payload,
      data: normalizeResponseArray(payload.data),
    };
  }
  if (Array.isArray(payload)) {
    return normalizeResponseArray(payload);
  }
  return payload;
};

/** Descarga todos los casos Express paginando en lotes (para reporte, dashboard, tablero). */
export const fetchAllSiniestrosExpress = async (batchSize = 2000) => {
  const acumulado = [];
  let page = 1;
  let total = Infinity;

  while (acumulado.length < total) {
    const res = await getSiniestrosExpressPaginado({ page, limit: batchSize });
    const lote = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    if (lote.length === 0) break;
    acumulado.push(...lote);
    total = Number(res?.total);
    if (!Number.isFinite(total)) {
      // Sin total: seguir hasta lote incompleto
      if (lote.length < batchSize) break;
      total = acumulado.length + 1;
    }
    page += 1;
    if (page > 500) break;
  }

  return acumulado;
};

export const deleteSiniestroExpress = async (id) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${EXPRESS_API_URL}/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar el caso Express (${response.status})`);
  }
  return payload;
};

export const getSiniestroExpressById = async (id) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${EXPRESS_API_URL}/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso Express (${response.status})`);
  }
  return normalizeExpressItem(payload?.data ?? payload);
};

/** Prefijos de anexos generados por el liquidador (para reemplazar al actualizar). */
export const PREFIJOS_ANEXO_LIQUIDADOR = [
  'Liquidador_Express_PDF_',
  'Liquidador_Express_',
  'Recibo_Indemnizacion_',
  'Contrato_Reembolso_',
  'Contrato_Transaccion_',
  'Checklist_Express_PDF_',
  'Checklist_Express_',
  'Salvamento_Express_PDF_',
  'Salvamento_Express_',
];

/** Etiqueta corta + nombre legible para la lista de anexos del caso. */
export const ETIQUETAS_ANEXO_LIQUIDADOR = [
  {
    prefijo: 'Liquidador_Express_PDF_',
    badge: 'PDF',
    titulo: 'Liquidador Express (PDF)',
  },
  {
    prefijo: 'Liquidador_Express_',
    badge: 'Excel',
    titulo: 'Liquidador Express (Excel)',
  },
  {
    prefijo: 'Recibo_Indemnizacion_',
    badge: 'Recibo',
    titulo: 'Recibo de indemnización',
  },
  {
    prefijo: 'Contrato_Reembolso_',
    badge: 'Reembolso',
    titulo: 'Contrato de reembolso',
  },
  {
    prefijo: 'Contrato_Transaccion_',
    badge: 'Transacción',
    titulo: 'Contrato de transacción',
  },
  {
    prefijo: 'Checklist_Express_PDF_',
    badge: 'PDF',
    titulo: 'Check-list documental (PDF)',
  },
  {
    prefijo: 'Checklist_Express_',
    badge: 'Check-list',
    titulo: 'Check-list documental',
  },
  {
    prefijo: 'Salvamento_Express_PDF_',
    badge: 'PDF',
    titulo: 'Formato de salvamento (PDF)',
  },
  {
    prefijo: 'Salvamento_Express_',
    badge: 'Salvamento',
    titulo: 'Formato de salvamento',
  },
];

export const esAnexoLiquidador = (anexo = {}) => {
  const nombre = String(anexo.nombre || '');
  return PREFIJOS_ANEXO_LIQUIDADOR.some((p) => nombre.startsWith(p));
};

/** Nombre legible para UI (diferencia recibo, contratos, Excel, etc.). */
export function etiquetaLegibleAnexoExpress(anexoONombre) {
  const nombre =
    typeof anexoONombre === 'string'
      ? anexoONombre
      : String(anexoONombre?.nombre || anexoONombre?.filename || '');
  if (!nombre) {
    return { esLiquidador: false, badge: null, titulo: 'Documento', archivo: '' };
  }
  const match = ETIQUETAS_ANEXO_LIQUIDADOR.find((e) => nombre.startsWith(e.prefijo));
  if (match) {
    return {
      esLiquidador: true,
      badge: match.badge,
      titulo: match.titulo,
      archivo: nombre,
    };
  }
  return {
    esLiquidador: false,
    badge: null,
    titulo: nombre,
    archivo: nombre,
  };
}

const toFormDate = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return str;
};

/** Campos del caso necesarios para que el PUT del liquidador no falle validaciones. */
const buildCamposBaseCaso = (casoBase = {}, valorIndemnizacion) => ({
  responsable: casoBase.responsable ?? '',
  codigoWorkflow: casoBase.codigoWorkflow ?? '',
  numeroSiniestro: casoBase.numeroSiniestro ?? '',
  fechaSiniestro: toFormDate(casoBase.fechaSiniestro),
  avisoSiniestro: toFormDate(casoBase.avisoSiniestro),
  avisoSiniestroCompania: toFormDate(casoBase.avisoSiniestroCompania),
  fechaReciboDocumentos: toFormDate(casoBase.fechaReciboDocumentos),
  fechaCargueFiniquito: toFormDate(casoBase.fechaCargueFiniquito),
  amparo: casoBase.amparo ?? '',
  valorIndemnizacion:
    valorIndemnizacion === undefined || valorIndemnizacion === null ? '' : String(valorIndemnizacion),
  observacionesSeguimiento: casoBase.observacionesSeguimiento ?? '',
  aseguradora: casoBase.aseguradora ?? '',
  intermediario: casoBase.intermediario ?? '',
  ciudadSiniestro: casoBase.ciudadSiniestro ?? '',
  aseguradoBeneficiario: casoBase.aseguradoBeneficiario ?? '',
  nit: casoBase.nit ?? '',
  analista: casoBase.analista ?? '',
  fechaEnvioAutorizacion: toFormDate(casoBase.fechaEnvioAutorizacion),
  fechaRespuestaAnalista: toFormDate(casoBase.fechaRespuestaAnalista),
  correoNotificacion: casoBase.correoNotificacion ?? '',
  fechaCierre: toFormDate(casoBase.fechaCierre),
  fechaSolicitudDocumentos: toFormDate(casoBase.fechaSolicitudDocumentos),
  fechaAcuseReciboDocumentos: toFormDate(casoBase.fechaAcuseReciboDocumentos),
  fechaUltimoDocumento: toFormDate(casoBase.fechaUltimoDocumento),
  fechaDefinicionCaso: toFormDate(casoBase.fechaDefinicionCaso),
  fechaSolicitudDocumentosAdicionales: toFormDate(casoBase.fechaSolicitudDocumentosAdicionales),
  fechaSolicitudDocumentosPendientes: toFormDate(casoBase.fechaSolicitudDocumentosPendientes),
  fechaSolicitudCorrecciones: toFormDate(casoBase.fechaSolicitudCorrecciones),
  fechaCorreccionesPresentadas: toFormDate(casoBase.fechaCorreccionesPresentadas),
  fechaPresentacionCifras: toFormDate(casoBase.fechaPresentacionCifras),
  fechaReconsideracion: toFormDate(casoBase.fechaReconsideracion),
  fechaDocumentosPago: toFormDate(casoBase.fechaDocumentosPago),
  fechaFiniquitosFirmado: toFormDate(casoBase.fechaFiniquitosFirmado),
  fechaRecordatorio: toFormDate(casoBase.fechaRecordatorio),
  reserva: casoBase.reserva ?? '',
  estadoProceso: casoBase.estadoProceso ?? '',
  salvamentoAplica: casoBase.salvamentoAplica || 'no_aplica',
  valorSalvamento: casoBase.valorSalvamento ?? '',
});

const appendCamposBase = (formData, camposBase) => {
  Object.entries(camposBase).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    // Enviar también '' en campos críticos no aplica; el backend preserva con fallback
    if (value === '' && key !== 'valorIndemnizacion' && key !== 'observacionesSeguimiento') return;
    formData.append(key, String(value));
  });
};

const putCasoExpressFormData = async (casoId, formData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${EXPRESS_API_URL}/${casoId}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.detalle || `Error al guardar liquidador en el caso (${response.status})`
    );
  }
  return normalizeExpressItem(payload?.data ?? payload);
};

/**
 * Guarda liquidador JSON + valor indemnización.
 * Fase 1 (obligatoria): JSON sin archivos — así no depende de S3.
 * Fase 2 (opcional): adjunta Excel/Word generados.
 */
export const guardarLiquidadorEnCasoExpress = async ({
  casoId,
  liquidador,
  valorIndemnizacion,
  archivos = [],
  anexosActuales = [],
  anexosSalvamentoActuales = [],
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Express debe estar guardado antes de adjuntar el liquidador.');
  if (!liquidador || typeof liquidador !== 'object') {
    throw new Error('No hay datos del liquidador para guardar.');
  }

  const camposBase = buildCamposBaseCaso(casoBase, valorIndemnizacion);
  const anexosSinLiquidador = (Array.isArray(anexosActuales) ? anexosActuales : []).filter(
    (a) => !esAnexoLiquidador(a)
  );
  const salvamentoExistentes = Array.isArray(anexosSalvamentoActuales)
    ? anexosSalvamentoActuales
    : [];

  // Fase 1: persistir liquidador sí o sí (sin archivos)
  const formDatos = new FormData();
  appendCamposBase(formDatos, camposBase);
  formDatos.append('liquidador', JSON.stringify(liquidador));
  formDatos.append('anexosExistentes', JSON.stringify(anexosSinLiquidador));
  formDatos.append('salvamentoAnexosExistentes', JSON.stringify(salvamentoExistentes));

  let actualizado = await putCasoExpressFormData(casoId, formDatos);

  const archivosValidos = (archivos || []).filter((a) => a?.blob && a?.nombre);
  if (archivosValidos.length === 0) {
    return { caso: actualizado, archivosOk: true, archivosError: null };
  }

  // Fase 2: anexos generados (si falla S3, el liquidador ya quedó guardado)
  try {
    const formArchivos = new FormData();
    appendCamposBase(formArchivos, {
      ...camposBase,
      valorIndemnizacion:
        valorIndemnizacion === undefined || valorIndemnizacion === null
          ? String(actualizado.valorIndemnizacion ?? '')
          : String(valorIndemnizacion),
    });
    formArchivos.append('liquidador', JSON.stringify(liquidador));
    formArchivos.append(
      'anexosExistentes',
      JSON.stringify((actualizado.anexos || []).filter((a) => !esAnexoLiquidador(a)))
    );
    formArchivos.append(
      'salvamentoAnexosExistentes',
      JSON.stringify(actualizado.anexosSalvamento || salvamentoExistentes)
    );

    archivosValidos.forEach(({ blob, nombre, mime }) => {
      const file = new File([blob], nombre, {
        type: mime || blob.type || 'application/octet-stream',
      });
      formArchivos.append('anexos', file, nombre);
    });

    actualizado = await putCasoExpressFormData(casoId, formArchivos);
    return { caso: actualizado, archivosOk: true, archivosError: null };
  } catch (err) {
    console.error('Liquidador guardado, pero falló adjuntar Word/Excel:', err);
    return {
      caso: actualizado,
      archivosOk: false,
      archivosError: err?.message || 'No se pudieron adjuntar los archivos generados',
    };
  }
};
