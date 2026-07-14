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
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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
  const fechaPresentacionCifras = toISODate(item.fechaPresentacionCifras ?? item.fchaPresntCifras ?? item.fchaPresentacionCifras);
  const fechaFiniquitosFirmado = toISODate(item.fechaFiniquitosFirmado ?? item.fchaFiniquitoIndem ?? item.fchaFiniquitosFirmado);
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
    fechaPresentacionCifras,
    fechaFiniquitosFirmado,
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
    liquidador: item.liquidador && typeof item.liquidador === 'object' ? item.liquidador : null,
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
  let total = null;

  while (true) {
    const respuesta = await getSiniestrosExpressPaginado({ page, limit: batchSize });
    const lote = Array.isArray(respuesta?.data) ? respuesta.data : [];
    if (total == null && typeof respuesta?.total === 'number') {
      total = respuesta.total;
    }
    if (!lote.length) break;
    acumulado.push(...lote);
    if (total != null && acumulado.length >= total) break;
    if (lote.length < batchSize) break;
    page += 1;
  }

  return acumulado;
};

export const deleteSiniestroExpress = async (id) => {
  if (!id) {
    throw new Error('Identificador de siniestro express no válido');
  }
  const token = localStorage.getItem('token');
  const response = await fetch(`${EXPRESS_API_URL}/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const rawText = await response.text();
  let payload = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = {};
  }
  if (!response.ok || payload?.success === false) {
    if (response.status === 404 && rawText.includes('Cannot DELETE')) {
      throw new Error(
        'El servidor no tiene activa la ruta de eliminación. Reinicie el backend (npm start en la carpeta backend).'
      );
    }
    throw new Error(
      payload?.error || payload?.detalle || `Error al eliminar el siniestro express (${response.status})`
    );
  }
  return payload;
};

export const getSiniestroExpressById = async (id) => {
  if (!id) throw new Error('Identificador de siniestro express no válido');
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
  'Liquidador_Express_',
  'Recibo_Indemnizacion_',
  'Checklist_Express_',
  'Salvamento_Express_',
];

export const esAnexoLiquidador = (anexo = {}) => {
  const nombre = String(anexo.nombre || '');
  return PREFIJOS_ANEXO_LIQUIDADOR.some((p) => nombre.startsWith(p));
};

/**
 * Guarda liquidador JSON + valor indemnización + archivos generados en anexos del caso.
 * Reemplaza anexos previos del liquidador por nombre.
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

  const formData = new FormData();
  const camposBase = {
    responsable: casoBase.responsable ?? '',
    codigoWorkflow: casoBase.codigoWorkflow ?? '',
    numeroSiniestro: casoBase.numeroSiniestro ?? '',
    fechaSiniestro: casoBase.fechaSiniestro ?? '',
    avisoSiniestro: casoBase.avisoSiniestro ?? '',
    avisoSiniestroCompania: casoBase.avisoSiniestroCompania ?? '',
    fechaReciboDocumentos: casoBase.fechaReciboDocumentos ?? '',
    fechaCargueFiniquito: casoBase.fechaCargueFiniquito ?? '',
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
    fechaEnvioAutorizacion: casoBase.fechaEnvioAutorizacion ?? '',
    fechaRespuestaAnalista: casoBase.fechaRespuestaAnalista ?? '',
    correoNotificacion: casoBase.correoNotificacion ?? '',
    fechaCierre: casoBase.fechaCierre ?? '',
    fechaSolicitudDocumentos: casoBase.fechaSolicitudDocumentos ?? '',
    fechaPresentacionCifras: casoBase.fechaPresentacionCifras ?? '',
    fechaFiniquitosFirmado: casoBase.fechaFiniquitosFirmado ?? '',
    reserva: casoBase.reserva ?? '',
    estadoProceso: casoBase.estadoProceso ?? '',
    salvamentoAplica: casoBase.salvamentoAplica || 'no_aplica',
    valorSalvamento: casoBase.valorSalvamento ?? '',
  };

  Object.entries(camposBase).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      const str = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)
        ? value.slice(0, 10)
        : String(value);
      formData.append(key, str);
    }
  });

  formData.append('liquidador', JSON.stringify(liquidador || {}));
  formData.append('salvamentoAplica', casoBase.salvamentoAplica || 'no_aplica');

  const anexosSinLiquidador = (Array.isArray(anexosActuales) ? anexosActuales : []).filter(
    (a) => !esAnexoLiquidador(a)
  );
  formData.append('anexosExistentes', JSON.stringify(anexosSinLiquidador));
  formData.append(
    'salvamentoAnexosExistentes',
    JSON.stringify(Array.isArray(anexosSalvamentoActuales) ? anexosSalvamentoActuales : [])
  );

  (archivos || []).forEach(({ blob, nombre, mime }) => {
    if (!blob || !nombre) return;
    const file = new File([blob], nombre, {
      type: mime || blob.type || 'application/octet-stream',
    });
    formData.append('anexos', file, nombre);
  });

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

