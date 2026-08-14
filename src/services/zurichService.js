import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';

const ZURICH_API_URL = `${BASE_URL}/api/zurich`;

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

export const normalizeZurichItem = (item = {}) => ({
  ...item,
  siniestro: item.siniestro ?? '',
  identificacion: item.identificacion ?? '',
  tomador: item.tomador ?? '',
  numeroPoliza: item.numeroPoliza ?? '',
  estado: item.estado ?? '',
  archivos: Array.isArray(item.archivos) ? item.archivos : [],
});

const normalizeResponseArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeZurichItem(item ?? {})) : [];

export const getCasosZurichPaginado = async ({
  page = 1,
  limit = 100,
  soloChecklistLleno = false,
} = {}) => {
  const queryString = buildQueryString({
    page,
    limit,
    _t: Date.now(),
    ...(soloChecklistLleno ? { soloChecklistLleno: '1' } : {}),
  });
  const response = await fetch(`${ZURICH_API_URL}${queryString}`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Error al obtener los casos Zurich');
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

export const fetchAllCasosZurich = async (batchSize = 2000, opciones = {}) => {
  const acumulado = [];
  let page = 1;
  let total = null;
  const soloChecklistLleno = opciones.soloChecklistLleno === true;

  while (true) {
    const respuesta = await getCasosZurichPaginado({
      page,
      limit: batchSize,
      soloChecklistLleno,
    });
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

export const getCasoZurichById = async (id) => {
  if (!id) throw new Error('Identificador de caso Zurich no válido');
  const response = await fetch(`${ZURICH_API_URL}/${id}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeZurichItem(payload?.data ?? payload);
};

export const crearCasoZurich = async (datos) => {
  const response = await fetch(ZURICH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.detalle || `Error al guardar el caso Zurich (${response.status})`
    );
  }
  return normalizeZurichItem(payload?.data ?? payload);
};

export const actualizarCasoZurich = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso Zurich no válido');
  const response = await fetch(`${ZURICH_API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al actualizar el caso Zurich (${response.status})`
    );
  }
  return normalizeZurichItem(payload?.data ?? payload);
};

export const deleteCasoZurich = async (id) => {
  if (!id) throw new Error('Identificador de caso Zurich no válido');
  const response = await fetch(`${ZURICH_API_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar el caso (${response.status})`);
  }
  return payload;
};

/** Importación masiva: crea o actualiza sin duplicar. */
export const importarCasosZurich = async (casos = [], opciones = {}) => {
  const response = await fetch(`${ZURICH_API_URL}/importar`, {
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
        `Error al importar casos Zurich (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

/** Sincroniza casos desde Express (Zurich Colombia) hacia el módulo Zurich. */
export const syncZurichDesdeExpress = async (ids = null) => {
  const response = await fetch(`${ZURICH_API_URL}/sync-express`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(ids?.length ? { ids } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al sincronizar Express → Zurich (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

export const subirArchivoZurich = async (casoId, file, etiqueta = 'GENERAL', extras = {}) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (extras?.descripcion != null) {
    formData.append('descripcion', String(extras.descripcion));
  }
  const response = await fetch(`${ZURICH_API_URL}/${casoId}/archivos`, {
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

export const actualizarArchivoZurich = async (casoId, archivoId, data = {}) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${ZURICH_API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al actualizar archivo (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const reordenarArchivosZurich = async (casoId, ids = []) => {
  if (!casoId) throw new Error('Caso requerido');
  const response = await fetch(`${ZURICH_API_URL}/${casoId}/archivos/orden`, {
    method: 'PUT',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al reordenar archivos (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const eliminarArchivoZurich = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${ZURICH_API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoZurich = (ruta) => resolveUploadsUrl(ruta);

/** Alertas de inactividad Zurich (agrupadas por ajustador). */
export const getAlertasZurich = async () => {
  const response = await fetch(`${ZURICH_API_URL}/alertas`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener alertas Zurich (${response.status})`);
  }
  return payload;
};

/** Guarda el liquidador en el caso y sincroniza valores reclamado/liquidado. */
export const guardarLiquidadorEnCasoZurich = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Zurich debe estar guardado antes de adjuntar el liquidador.');

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

  return actualizarCasoZurich(casoId, payload);
};

/** Guarda el borrador del informe único en el caso. */
export const guardarInformeUnicoEnCasoZurich = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Zurich debe estar guardado antes de adjuntar el informe.');

  const payload = {
    ...casoBase,
    informeUnico: informeUnico || {},
  };

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoZurich(casoId, payload);
};
