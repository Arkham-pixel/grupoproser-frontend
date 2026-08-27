import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';

const SURA_API_URL = `${BASE_URL}/api/sura`;

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

export const normalizeSuraItem = (item = {}) => ({
  ...item,
  siniestro: item.siniestro ?? '',
  identificacion: item.identificacion ?? '',
  tomador: item.tomador ?? '',
  numeroPoliza: item.numeroPoliza ?? '',
  estado: item.estado ?? '',
  fechaLlamada: item.fechaLlamada ?? null,
  observacionLlamada: item.observacionLlamada ?? '',
  observacionReserva: item.observacionReserva ?? '',
  archivos: Array.isArray(item.archivos) ? item.archivos : [],
});

const normalizeResponseArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeSuraItem(item ?? {})) : [];

export const getCasosSuraPaginado = async ({ page = 1, limit = 100 } = {}) => {
  const queryString = buildQueryString({ page, limit, _t: Date.now() });
  const response = await fetch(`${SURA_API_URL}${queryString}`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Error al obtener los casos Seguros Sura');
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

export const fetchAllCasosSura = async (batchSize = 2000) => {
  const acumulado = [];
  let page = 1;
  let total = null;

  while (true) {
    const respuesta = await getCasosSuraPaginado({ page, limit: batchSize });
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

export const getCasoSuraById = async (id) => {
  if (!id) throw new Error('Identificador de caso Seguros Sura no válido');
  const response = await fetch(`${SURA_API_URL}/${id}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeSuraItem(payload?.data ?? payload);
};

export const crearCasoSura = async (datos) => {
  const response = await fetch(SURA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.detalle || `Error al guardar el caso Seguros Sura (${response.status})`
    );
  }
  return normalizeSuraItem(payload?.data ?? payload);
};

export const actualizarCasoSura = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso Seguros Sura no válido');
  const response = await fetch(`${SURA_API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al actualizar el caso Seguros Sura (${response.status})`
    );
  }
  return normalizeSuraItem(payload?.data ?? payload);
};

export const deleteCasoSura = async (id) => {
  if (!id) throw new Error('Identificador de caso Seguros Sura no válido');
  const response = await fetch(`${SURA_API_URL}/${id}`, {
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
export const importarCasosSura = async (casos = [], opciones = {}) => {
  const response = await fetch(`${SURA_API_URL}/importar`, {
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
        `Error al importar casos Seguros Sura (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

/** Preview Excel (admin/soporte) — no modifica casos. */
export const previewImportExcelSura = async (file) => {
  if (!file) throw new Error('Archivo Excel requerido');
  const formData = new FormData();
  formData.append('file', file, file.name || 'sura.xlsx');
  const response = await fetch(`${SURA_API_URL}/import/preview`, {
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
export const executeImportExcelSura = async (importSessionId, { force = false } = {}) => {
  if (!importSessionId) throw new Error('importSessionId requerido');
  const response = await fetch(`${SURA_API_URL}/import/execute`, {
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

export const urlReporteImportExcelSura = (importSessionId) =>
  `${SURA_API_URL}/import/${importSessionId}/report.xlsx`;

export const getImportExcelSuraStatus = async (importSessionId) => {
  if (!importSessionId) throw new Error('importSessionId requerido');
  const response = await fetch(`${SURA_API_URL}/import/${importSessionId}`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error status import (${response.status})`);
  }
  return payload;
};

/** Estado Control y Seguimiento (SharePoint → preview automático). */
export const getControlSeguimientoSuraStatus = async () => {
  const response = await fetch(`${SURA_API_URL}/control-seguimiento/status`, {
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
export const checkControlSeguimientoSura = async ({ force = false } = {}) => {
  const response = await fetch(`${SURA_API_URL}/control-seguimiento/check`, {
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

export const dismissControlSeguimientoSuraNotification = async () => {
  const response = await fetch(`${SURA_API_URL}/control-seguimiento/notification/dismiss`, {
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

export const subirArchivoSura = async (casoId, file, etiqueta = 'GENERAL') => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  const response = await fetch(`${SURA_API_URL}/${casoId}/archivos`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al subir archivo (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const eliminarArchivoSura = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${SURA_API_URL}/${casoId}/archivos/${archivoId}`, {
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
export const actualizarArchivoSura = async (casoId, archivoId, datos = {}) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${SURA_API_URL}/${casoId}/archivos/${archivoId}`, {
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
export const getDocumentosSharePointSura = async (casoId) => {
  if (!casoId) throw new Error('Caso requerido');
  const response = await fetch(`${SURA_API_URL}/${casoId}/documentos-sharepoint`, {
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
export const reintentarSharePointSura = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(
    `${SURA_API_URL}/${casoId}/archivos/${archivoId}/sharepoint/retry`,
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

/** GET /:id/polizas-importadas — pólizas SharePoint→S3 asociadas al caso. */
export const getPolizasImportadasSura = async (casoId) => {
  if (!casoId) throw new Error('Caso requerido');
  const response = await fetch(`${SURA_API_URL}/${casoId}/polizas-importadas`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al listar pólizas importadas (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoSura = (ruta) => resolveUploadsUrl(ruta);

/** Alertas de inactividad Seguros Sura (agrupadas por ajustador). */
export const getAlertasSura = async () => {
  const response = await fetch(`${SURA_API_URL}/alertas`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener alertas Sura (${response.status})`);
  }
  return payload;
};

/** Guarda el liquidador en el caso y sincroniza valores reclamado/liquidado. */
export const guardarLiquidadorEnCasoSura = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Sura debe estar guardado antes de adjuntar el liquidador.');

  const payload = {
    ...casoBase,
    liquidador: liquidador || {},
    valorReclamado:
      totales.totalReclamado != null ? totales.totalReclamado : casoBase.valorReclamado,
    valorLiquidado:
      totales.totalIndemnizar != null ? totales.totalIndemnizar : casoBase.valorLiquidado,
  };

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoSura(casoId, payload);
};

/** Guarda el borrador del informe único en el caso. */
export const guardarInformeUnicoEnCasoSura = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Sura debe estar guardado antes de adjuntar el informe.');

  const payload = {
    ...casoBase,
    informeUnico: informeUnico || {},
  };

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoSura(casoId, payload);
};

/** Guarda una sección extra del caso (informe ágil, salvamento, etc.) sin pisar archivos. */
export const guardarSeccionCasoSura = async ({ casoId, casoBase = {}, patch = {} }) => {
  if (!casoId) throw new Error('El caso Sura debe estar guardado antes de actualizar la sección.');
  const payload = { ...casoBase, ...patch };
  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;
  return actualizarCasoSura(casoId, payload);
};

/** GET /bloques-cercania — agrupa casos por cercanía (solo ARNALD). */
export const getBloquesCercaniaSura = async ({ radioKm = 2.5, ciudad = '', estado = '' } = {}) => {
  const queryString = buildQueryString({ radioKm, ciudad, estado, _t: Date.now() });
  const response = await fetch(`${SURA_API_URL}/bloques-cercania${queryString}`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener bloques (${response.status})`);
  }
  return payload?.data ?? payload;
};

/** POST /geocode-pendientes — geocodifica en backend (requiere GOOGLE_MAPS_API_KEY). */
export const postGeocodePendientesSura = async ({ limit = 40, force = false } = {}) => {
  const response = await fetch(`${SURA_API_URL}/geocode-pendientes`, {
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
export const postUbicacionesPredioSura = async (items = []) => {
  const response = await fetch(`${SURA_API_URL}/ubicaciones-predio`, {
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
