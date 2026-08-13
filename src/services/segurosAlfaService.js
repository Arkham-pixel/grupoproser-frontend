import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';

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

export const normalizeAlfaItem = (item = {}) => ({
  ...item,
  siniestro: item.siniestro ?? '',
  identificacion: item.identificacion ?? '',
  tomador: item.tomador ?? '',
  numeroPoliza: item.numeroPoliza ?? '',
  estado: item.estado ?? '',
  archivos: Array.isArray(item.archivos) ? item.archivos : [],
});

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
  const response = await fetch(`${ALFA_API_URL}/${id}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeAlfaItem(payload?.data ?? payload);
};

export const crearCasoAlfa = async (datos) => {
  const response = await fetch(ALFA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
  const response = await fetch(`${ALFA_API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al actualizar el caso Seguros Alfa (${response.status})`
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

/** Importación masiva: crea o actualiza sin duplicar. */
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

export const subirArchivoAlfa = async (casoId, file, etiqueta = 'GENERAL') => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  const response = await fetch(`${ALFA_API_URL}/${casoId}/archivos`, {
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
