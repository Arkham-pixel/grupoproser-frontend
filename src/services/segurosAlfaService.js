import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';
import {
  fusionarLiquidadorSinPerderPresupuestoNsr,
  scoreContenidoLiquidadorNsr,
} from '../components/SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import { resolverMontoIndemnizarAlfa } from '../components/SubcomponenteSegurosAlfa/liquidadorAlfaHelpers.js';
import { authFetch } from './authFetch.js';

const ALFA_API_URL = `${BASE_URL}/api/seguros-alfa`;

const buildQueryString = (params = {}) => {
  const filteredEntries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (filteredEntries.length === 0) return '';
  return `?${new URLSearchParams(filteredEntries).toString()}`;
};

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...authHeaders(),
});

export const normalizeAlfaItem = (item = {}) => {
  const liquidadorObj = item.liquidador && typeof item.liquidador === 'object';
  const informeObj = item.informeUnico && typeof item.informeUnico === 'object';
  return {
    ...item,
    siniestro: item.siniestro ?? '',
    identificacion: item.identificacion ?? '',
    tomador: item.tomador ?? '',
    numeroPoliza: item.numeroPoliza ?? '',
    estado: item.estado ?? 'Sin contactar',
    estadoGestion: item.estadoGestion ?? '',
    observacionesGestion: item.observacionesGestion ?? '',
    zonaAsignada: item.zonaAsignada ?? '',
    fueraDeZona: Boolean(item.fueraDeZona),
    noAceptacionOferta: Boolean(item.noAceptacionOferta),
    grupoReclamacion: item.grupoReclamacion ?? '',
    fechaLlamada: item.fechaLlamada ?? null,
    observacionLlamada: item.observacionLlamada ?? '',
    fechaComunicacionBajoDeducible: item.fechaComunicacionBajoDeducible ?? null,
    archivos: Array.isArray(item.archivos) ? item.archivos : [],
    tieneLiquidador: Boolean(
      item.tieneLiquidador ?? liquidadorObj
    ),
    tieneInforme: Boolean(item.tieneInforme ?? informeObj),
    tieneLiquidadorConContenido: Boolean(
      item.tieneLiquidadorConContenido ?? liquidadorObj
    ),
  };
};

const normalizeResponseArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeAlfaItem(item ?? {})) : [];

export const getCasosAlfaPaginado = async ({ page = 1, limit = 100 } = {}) => {
  const queryString = buildQueryString({ page, limit, _t: Date.now() });
  const response = await fetch(`${ALFA_API_URL}${queryString}`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Error al obtener los casos Seguros Alfa');
  }
  const payload = await response.json();
  if (payload?.data && Array.isArray(payload.data)) {
    return { ...payload, data: normalizeResponseArray(payload.data) };
  }
  if (Array.isArray(payload)) {
    return { data: normalizeResponseArray(payload), total: payload.length };
  }
  return payload;
};

export const fetchAllCasosAlfa = async (batchSize = 2000) => {
  const acumulado = [];
  let page = 1;
  let total = null;

  while (true) {
    const respuesta = await getCasosAlfaPaginado({ page, limit: batchSize });
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

export const getCasoAlfaById = async (id) => {
  if (!id) throw new Error('Identificador de caso Seguros Alfa no válido');
  const response = await authFetch(`${ALFA_API_URL}/${id}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeAlfaItem(payload?.data ?? payload);
};

export const crearCasoAlfa = async (datos) => {
  const response = await authFetch(ALFA_API_URL, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.detalle || `Error al guardar el caso Seguros Alfa (${response.status})`
    );
  }
  return normalizeAlfaItem(payload?.data ?? payload);
};

export const actualizarCasoAlfa = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso Seguros Alfa no válido');
  const response = await authFetch(`${ALFA_API_URL}/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const statusHint =
      response.status === 401 || response.status === 403
        ? ' Sesión vencida: cierre sesión y vuelva a entrar, luego guarde de nuevo.'
        : '';
    throw new Error(
      (payload?.error ||
        payload?.detalle ||
        `Error al actualizar el caso Seguros Alfa (${response.status})`) + statusHint
    );
  }
  return normalizeAlfaItem(payload?.data ?? payload);
};

export const crearPredioVinculadoAlfa = async (casoId, datos = {}) => {
  if (!casoId) throw new Error('Identificador de caso Seguros Alfa no válido');
  const response = await fetch(`${ALFA_API_URL}/${casoId}/predio-vinculado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al crear predio vinculado (${response.status})`
    );
  }
  return normalizeAlfaItem(payload?.data ?? payload);
};

export const deleteCasoAlfa = async (id) => {
  if (!id) throw new Error('Identificador de caso Seguros Alfa no válido');
  const response = await fetch(`${ALFA_API_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar el caso (${response.status})`);
  }
  return payload;
};

/** Importación masiva legacy JSON (preferir preview/execute). */
export const importarCasosAlfa = async (casos = [], opciones = {}) => {
  const response = await fetch(`${ALFA_API_URL}/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      casos,
      reemplazarTodo: opciones.reemplazarTodo === true,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al importar casos Seguros Alfa (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

/** Preview Excel (admin/soporte) — no modifica casos. */
export const previewImportExcelAlfa = async (file) => {
  if (!file) throw new Error('Archivo Excel requerido');
  const formData = new FormData();
  formData.append('file', file, file.name || 'alfa.xlsx');
  const response = await fetch(`${ALFA_API_URL}/import/preview`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const err = new Error(payload?.error || `Error en preview (${response.status})`);
    err.code = payload?.code;
    err.status = response.status;
    throw err;
  }
  return payload;
};

/** Execute sesión de importación (admin/soporte). */
export const executeImportExcelAlfa = async (importSessionId, { force = false } = {}) => {
  if (!importSessionId) throw new Error('importSessionId requerido');
  const response = await fetch(`${ALFA_API_URL}/import/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ importSessionId, force }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const err = new Error(payload?.error || `Error en execute (${response.status})`);
    err.code = payload?.code;
    err.status = response.status;
    throw err;
  }
  return payload;
};

export const urlReporteImportExcelAlfa = (importSessionId) =>
  `${ALFA_API_URL}/import/${importSessionId}/report.xlsx`;

export const getImportExcelAlfaStatus = async (importSessionId) => {
  if (!importSessionId) throw new Error('importSessionId requerido');
  const response = await fetch(`${ALFA_API_URL}/import/${importSessionId}`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error status import (${response.status})`);
  }
  return payload;
};

/** Estado Control y Seguimiento (SharePoint → preview automático). */
export const getControlSeguimientoAlfaStatus = async () => {
  const response = await fetch(`${ALFA_API_URL}/control-seguimiento/status`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const err = new Error(
      payload?.error || `Error consultando Control y Seguimiento (${response.status})`
    );
    err.code = payload?.code;
    err.uiStatus = 'error';
    throw err;
  }
  return payload;
};

/** Fuerza un ciclo de detección+preview (admin/soporte). */
export const checkControlSeguimientoAlfa = async ({ force = false } = {}) => {
  const response = await fetch(`${ALFA_API_URL}/control-seguimiento/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ force }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error en check (${response.status})`);
  }
  return payload;
};

export const dismissControlSeguimientoAlfaNotification = async () => {
  const response = await fetch(`${ALFA_API_URL}/control-seguimiento/notification/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: '{}',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'Error al descartar notificación');
  }
  return payload;
};

export const subirArchivoAlfa = async (casoId, file, etiqueta = 'GENERAL', options = {}) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (options.replaceSameSlot) {
    formData.append('replaceSameSlot', 'true');
  }
  const response = await fetch(`${ALFA_API_URL}/${casoId}/archivos`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al subir archivo (${response.status})`);
  }
  const data = payload?.data ?? payload;
  if (data && typeof data === 'object') {
    data.replaced = Boolean(payload?.replaced);
  }
  return data;
};

export const eliminarArchivoAlfa = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${ALFA_API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

/** Actualiza metadatos del archivo (p. ej. descripción/leyenda de foto). */
export const actualizarArchivoAlfa = async (casoId, archivoId, datos = {}) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${ALFA_API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al actualizar archivo (${response.status})`);
  }
  return payload?.data ?? payload;
};

/** Estado SharePoint batch para archivos del caso (sin secretos). */
export const getDocumentosSharePointAlfa = async (casoId) => {
  if (!casoId) throw new Error('Caso requerido');
  const response = await fetch(`${ALFA_API_URL}/${casoId}/documentos-sharepoint`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener estado SharePoint (${response.status})`);
  }
  return {
    documents: Array.isArray(payload.documents) ? payload.documents : [],
    summary: payload.summary || {},
    total: payload.total ?? 0,
  };
};

/** Reintento SharePoint (solo admin/soporte). No sincroniza en el request. */
export const reintentarSharePointAlfa = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(
    `${ALFA_API_URL}/${casoId}/archivos/${archivoId}/sharepoint/retry`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const err = new Error(
      payload?.error || payload?.message || `Error al reintentar (${response.status})`
    );
    err.status = response.status;
    err.code = payload?.code;
    throw err;
  }
  return payload?.data ?? payload;
};

/**
 * Activa o pausa copia a SharePoint de un archivo del archivero.
 * @param {boolean} enabled true = subir; false = no subir (solo ARNALD)
 */
export const setSharePointEnabledAlfa = async (casoId, archivoId, enabled) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  if (typeof enabled !== 'boolean') throw new Error('enabled debe ser boolean');
  const response = await fetch(
    `${ALFA_API_URL}/${casoId}/archivos/${archivoId}/sharepoint/enabled`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ enabled }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const err = new Error(
      payload?.error || payload?.message || `Error al actualizar SharePoint (${response.status})`
    );
    err.status = response.status;
    err.code = payload?.code;
    throw err;
  }
  return payload?.data ?? payload;
};

/** GET /:id/polizas-importadas — pólizas SharePoint→S3 asociadas al caso. */
export const getPolizasImportadasAlfa = async (casoId) => {
  if (!casoId) throw new Error('Caso requerido');
  const response = await fetch(`${ALFA_API_URL}/${casoId}/polizas-importadas`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al listar pólizas importadas (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoAlfa = (ruta) => resolveUploadsUrl(ruta);

/** Alertas de inactividad Seguros Alfa (agrupadas por ajustador). */
export const getAlertasAlfa = async () => {
  const response = await fetch(`${ALFA_API_URL}/alertas`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener alertas Alfa (${response.status})`);
  }
  return payload;
};

/** Guarda el liquidador en el caso y sincroniza valores reclamado/liquidado. */
export const guardarLiquidadorEnCasoAlfa = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Alfa debe estar guardado antes de adjuntar el liquidador.');

  const entrante = liquidador && typeof liquidador === 'object' ? liquidador : {};
  // Solo bloquear cascarón vacío; no reinyectar el liquidador viejo al editar
  const liquidadorSeguro =
    scoreContenidoLiquidadorNsr(entrante) > 0
      ? entrante
      : fusionarLiquidadorSinPerderPresupuestoNsr(entrante, casoBase?.liquidador);

  if (scoreContenidoLiquidadorNsr(liquidadorSeguro) === 0) {
    throw new Error(
      'El liquidador está vacío: no se puede guardar. Agregue ítems antes de guardar.'
    );
  }

  // valorLiquidado siempre desde el liquidador (nunca un totalIndemnizar/stale del cliente)
  const { totales: totalesFrescos, totalIndemnizar } = resolverMontoIndemnizarAlfa(
    liquidadorSeguro,
    totales
  );

  const payload = {
    ...casoBase,
    liquidador: liquidadorSeguro,
    valorReclamado:
      totalesFrescos.totalReclamado != null
        ? totalesFrescos.totalReclamado
        : casoBase.valorReclamado,
    valorLiquidado: totalIndemnizar,
  };

  // Conservar informe: no mandar null/vacío que lo borre
  if (casoBase.informeUnico && typeof casoBase.informeUnico === 'object') {
    payload.informeUnico = casoBase.informeUnico;
  } else {
    delete payload.informeUnico;
  }

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoAlfa(casoId, payload);
};

/** Guarda el borrador del informe único en el caso. */
export const guardarInformeUnicoEnCasoAlfa = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Alfa debe estar guardado antes de adjuntar el informe.');

  const payload = {
    ...casoBase,
    informeUnico: informeUnico || {},
  };

  // Crítico: guardar informe NUNCA debe tocar el liquidador (el servidor conserva el de BD).
  delete payload.liquidador;

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoAlfa(casoId, payload);
};

/** GET /bloques-cercania — agrupa casos por cercanía (solo ARNALD). */
export const getBloquesCercaniaAlfa = async ({ radioKm = 2.5, ciudad = '', estado = '' } = {}) => {
  const queryString = buildQueryString({ radioKm, ciudad, estado, _t: Date.now() });
  const response = await fetch(`${ALFA_API_URL}/bloques-cercania${queryString}`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener bloques (${response.status})`);
  }
  return payload?.data ?? payload;
};

/** POST /geocode-pendientes — geocodifica en backend (requiere GOOGLE_MAPS_API_KEY). */
export const postGeocodePendientesAlfa = async ({ limit = 40, force = false } = {}) => {
  const response = await fetch(`${ALFA_API_URL}/geocode-pendientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ limit, force }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const err = new Error(payload?.error || `Error al geocodificar (${response.status})`);
    err.payload = payload;
    throw err;
  }
  return payload?.data ?? payload;
};

/** POST /ubicaciones-predio — guarda coords geocodificadas en el cliente. */
export const postUbicacionesPredioAlfa = async (items = []) => {
  const response = await fetch(`${ALFA_API_URL}/ubicaciones-predio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ items }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al guardar ubicaciones (${response.status})`);
  }
  return payload?.data ?? payload;
};

/** GET /condiciones — PDFs raíz SharePoint SEGUROS ALFA/PÓLIZAS */
export const getCondicionesAlfa = async () => {
  const response = await fetch(`${ALFA_API_URL}/condiciones`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al listar condiciones (${response.status})`);
  }
  return payload;
};

/** URL autenticada (abrir en nueva pestaña vía blob). */
export const fetchCondicionAlfaBlobUrl = async (itemId) => {
  const response = await fetch(
    `${ALFA_API_URL}/condiciones/${encodeURIComponent(itemId)}/download`,
    { headers: authHeaders() }
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Error al abrir documento (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
