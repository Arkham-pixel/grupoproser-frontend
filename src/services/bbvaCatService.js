import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';
import {
  diasEnEstadoBbvaCat,
  homologarEstadoBbvaCat,
  ultimaGestionBbvaCat,
} from '../components/SubcomponenteBbvaCat/bbvaCatHelpers.js';
import { sanitizarInformeUnicoBbvaCat } from '../components/SubcomponenteBbvaCat/liquidadorBbvaCatHelpers.js';

const BBVA_CAT_API_URL = `${BASE_URL}/api/bbva-cat`;

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

export const normalizeBbvaCatItem = (item = {}) => {
  const estado = homologarEstadoBbvaCat(item.estado);
  const caso = { ...item, estado };
  return {
    ...caso,
    siniestro: item.siniestro ?? '',
    zc: item.zc ?? '',
    identificacion: item.identificacion ?? '',
    tipoIdentificacion: item.tipoIdentificacion ?? '',
    asegurado: item.asegurado ?? '',
    intermediario: item.intermediario ?? '',
    correoIntermediario: item.correoIntermediario ?? '',
    telefonoIntermediario: item.telefonoIntermediario ?? '',
    contactoIntermediario: item.contactoIntermediario ?? '',
    telefonoAsegurado: item.telefonoAsegurado ?? '',
    correoAsegurado: item.correoAsegurado ?? '',
    contactoAsegurado: item.contactoAsegurado ?? '',
    observaciones: item.observaciones ?? '',
    tomador: item.tomador ?? '',
    numeroPoliza: item.numeroPoliza ?? '',
    tipoPoliza: item.tipoPoliza ?? '',
    tipoPolizaOtro: item.tipoPolizaOtro ?? '',
    causa: item.causa ?? '',
    estado,
    diasEnEstado: diasEnEstadoBbvaCat(caso),
    ultimaGestion: ultimaGestionBbvaCat(caso),
    archivos: Array.isArray(item.archivos) ? item.archivos : [],
  };
};

const normalizeResponseArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeBbvaCatItem(item ?? {})) : [];

export const getCasosBbvaCatPaginado = async ({
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
  const response = await fetch(`${BBVA_CAT_API_URL}${queryString}`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Error al obtener los casos BBVA CAT');
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

export const fetchAllCasosBbvaCat = async (batchSize = 2000, opciones = {}) => {
  const acumulado = [];
  let page = 1;
  let total = null;
  const soloChecklistLleno = opciones.soloChecklistLleno === true;

  while (true) {
    const respuesta = await getCasosBbvaCatPaginado({
      page,
      limit: batchSize,
      soloChecklistLleno,
    });
    const lote = Array.isArray(respuesta?.data) ? respuesta.data : [];
    if (total == null && typeof respuesta?.total === 'number') {
      total = respuesta.total;
    }
    if (!lote.length) break;
    acumulado.push(...lote.map((item) => normalizeBbvaCatItem(item ?? {})));
    if (total != null && acumulado.length >= total) break;
    if (lote.length < batchSize) break;
    page += 1;
  }

  return acumulado;
};

export const getCasoBbvaCatById = async (id) => {
  if (!id) throw new Error('Identificador de caso BBVA CAT no válido');
  const response = await fetch(`${BBVA_CAT_API_URL}/${id}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeBbvaCatItem(payload?.data ?? payload);
};

export const crearCasoBbvaCat = async (datos) => {
  const response = await fetch(BBVA_CAT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.detalle || `Error al guardar el caso BBVA CAT (${response.status})`
    );
  }
  return normalizeBbvaCatItem(payload?.data ?? payload);
};

export const actualizarCasoBbvaCat = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso BBVA CAT no válido');
  const response = await fetch(`${BBVA_CAT_API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al actualizar el caso BBVA CAT (${response.status})`
    );
  }
  return normalizeBbvaCatItem(payload?.data ?? payload);
};

export const deleteCasoBbvaCat = async (id) => {
  if (!id) throw new Error('Identificador de caso BBVA CAT no válido');
  const response = await fetch(`${BBVA_CAT_API_URL}/${id}`, {
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
export const importarCasosBbvaCat = async (casos = [], opciones = {}) => {
  const response = await fetch(`${BBVA_CAT_API_URL}/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      casos,
      reemplazarTodo: opciones.reemplazarTodo === true,
      modo: opciones.modo || undefined,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al importar casos BBVA CAT (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

/** Sincroniza casos desde Express (BbvaCat Colombia) hacia el módulo BBVA CAT. */
export const syncBbvaCatDesdeExpress = async (ids = null) => {
  const response = await fetch(`${BBVA_CAT_API_URL}/sync-express`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(ids?.length ? { ids } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al sincronizar Express → BBVA CAT (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

export const subirArchivoBbvaCat = async (casoId, file, etiqueta = 'GENERAL', extras = {}) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (extras?.descripcion != null) {
    formData.append('descripcion', String(extras.descripcion));
  }
  const response = await fetch(`${BBVA_CAT_API_URL}/${casoId}/archivos`, {
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

export const actualizarArchivoBbvaCat = async (casoId, archivoId, data = {}) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${BBVA_CAT_API_URL}/${casoId}/archivos/${archivoId}`, {
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

export const reordenarArchivosBbvaCat = async (casoId, ids = []) => {
  if (!casoId) throw new Error('Caso requerido');
  const response = await fetch(`${BBVA_CAT_API_URL}/${casoId}/archivos/orden`, {
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

export const eliminarArchivoBbvaCat = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${BBVA_CAT_API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoBbvaCat = (ruta) => resolveUploadsUrl(ruta);

/** Alertas de inactividad BBVA CAT (agrupadas por ajustador). */
export const getAlertasBbvaCat = async () => {
  const response = await fetch(`${BBVA_CAT_API_URL}/alertas`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener alertas BBVA CAT (${response.status})`);
  }
  return payload;
};

const CAMPOS_CAT_NO_PISAR = [
  'severidadCat',
  'severidadCatNiveles',
  'evidenciaCat',
  'observacionesCat',
  'accesoPredio',
  'fechaInspeccion',
  'checklistCatCompleto',
];

const omitirCampos = (obj, claves) => {
  const out = { ...obj };
  claves.forEach((k) => {
    delete out[k];
  });
  return out;
};

/** Guarda solo inspección CAT (no envía el resto del caso, para no pisar el checklist). */
export const guardarCatEnCasoBbvaCat = async ({ casoId, cat = {}, casoBase = {} }) => {
  if (!casoId) throw new Error('El caso BBVA CAT debe estar guardado antes de registrar la inspección CAT.');
  const payload = {
    identificacion: casoBase.identificacion,
    estado: casoBase.estado || 'PENDIENTE',
    severidadCat: cat.severidadCat ?? null,
    severidadCatNiveles: cat.severidadCatNiveles || {},
    evidenciaCat: cat.evidenciaCat || {},
    observacionesCat: cat.observacionesCat ?? null,
    accesoPredio: cat.accesoPredio ?? null,
    fechaInspeccion: cat.fechaInspeccion ?? null,
  };
  return actualizarCasoBbvaCat(casoId, payload);
};

/** Guarda el liquidador en el caso y sincroniza valores reclamado/liquidado. */
export const guardarLiquidadorEnCasoBbvaCat = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso BBVA CAT debe estar guardado antes de adjuntar el liquidador.');

  const payload = {
    ...omitirCampos(casoBase, CAMPOS_CAT_NO_PISAR),
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

  return actualizarCasoBbvaCat(casoId, payload);
};

/** Guarda el borrador del informe único en el caso. */
export const guardarInformeUnicoEnCasoBbvaCat = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso BBVA CAT debe estar guardado antes de adjuntar el informe.');

  const payload = {
    ...omitirCampos(casoBase, CAMPOS_CAT_NO_PISAR),
    informeUnico: sanitizarInformeUnicoBbvaCat(informeUnico || {}),
  };

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoBbvaCat(casoId, payload);
};

/** GET /bloques-cercania — agrupa predios por cercanía. */
export const getBloquesCercaniaBbvaCat = async ({
  radioKm = 2.5,
  ciudad = '',
  estado = '',
  depurarArchivos = false,
  incluirConArchivos = false,
  soloConArchivos = false,
} = {}) => {
  const queryString = buildQueryString({
    radioKm,
    ciudad,
    estado,
    ...(depurarArchivos ? { depurarArchivos: '1' } : {}),
    ...(incluirConArchivos ? { incluirConArchivos: '1' } : {}),
    ...(soloConArchivos ? { soloConArchivos: '1' } : {}),
    _t: Date.now(),
  });
  const response = await fetch(`${BBVA_CAT_API_URL}/bloques-cercania${queryString}`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener bloques (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const postGeocodePendientesBbvaCat = async ({ limit = 40, force = false } = {}) => {
  const response = await fetch(`${BBVA_CAT_API_URL}/geocode-pendientes`, {
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

export const postUbicacionesPredioBbvaCat = async (items = []) => {
  const response = await fetch(`${BBVA_CAT_API_URL}/ubicaciones-predio`, {
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
