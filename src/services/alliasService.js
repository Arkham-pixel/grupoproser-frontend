import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';

const ALLIAS_API_URL = `${BASE_URL}/api/allias`;

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

export const normalizeAlliasItem = (item = {}) => ({
  ...item,
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
  estado: item.estado ?? '',
  archivos: Array.isArray(item.archivos) ? item.archivos : [],
});

const normalizeResponseArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeAlliasItem(item ?? {})) : [];

export const getCasosAlliasPaginado = async ({
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
  const response = await fetch(`${ALLIAS_API_URL}${queryString}`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Error al obtener los casos Allias');
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

export const fetchAllCasosAllias = async (batchSize = 2000, opciones = {}) => {
  const acumulado = [];
  let page = 1;
  let total = null;
  const soloChecklistLleno = opciones.soloChecklistLleno === true;

  while (true) {
    const respuesta = await getCasosAlliasPaginado({
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

export const getCasoAlliasById = async (id) => {
  if (!id) throw new Error('Identificador de caso Allias no válido');
  const response = await fetch(`${ALLIAS_API_URL}/${id}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeAlliasItem(payload?.data ?? payload);
};

export const crearCasoAllias = async (datos) => {
  const response = await fetch(ALLIAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.detalle || `Error al guardar el caso Allias (${response.status})`
    );
  }
  return normalizeAlliasItem(payload?.data ?? payload);
};

export const actualizarCasoAllias = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso Allias no válido');
  const response = await fetch(`${ALLIAS_API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al actualizar el caso Allias (${response.status})`
    );
  }
  return normalizeAlliasItem(payload?.data ?? payload);
};

export const deleteCasoAllias = async (id) => {
  if (!id) throw new Error('Identificador de caso Allias no válido');
  const response = await fetch(`${ALLIAS_API_URL}/${id}`, {
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
export const importarCasosAllias = async (casos = [], opciones = {}) => {
  const response = await fetch(`${ALLIAS_API_URL}/importar`, {
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
        `Error al importar casos Allias (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

/** Sincroniza casos desde Express (Allias Colombia) hacia el módulo Allias. */
export const syncAlliasDesdeExpress = async (ids = null) => {
  const response = await fetch(`${ALLIAS_API_URL}/sync-express`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(ids?.length ? { ids } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al sincronizar Express → Allias (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

export const subirArchivoAllias = async (casoId, file, etiqueta = 'GENERAL', extras = {}) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (extras?.descripcion != null) {
    formData.append('descripcion', String(extras.descripcion));
  }
  const response = await fetch(`${ALLIAS_API_URL}/${casoId}/archivos`, {
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

export const actualizarArchivoAllias = async (casoId, archivoId, data = {}) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${ALLIAS_API_URL}/${casoId}/archivos/${archivoId}`, {
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

export const reordenarArchivosAllias = async (casoId, ids = []) => {
  if (!casoId) throw new Error('Caso requerido');
  const response = await fetch(`${ALLIAS_API_URL}/${casoId}/archivos/orden`, {
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

export const eliminarArchivoAllias = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${ALLIAS_API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoAllias = (ruta) => resolveUploadsUrl(ruta);

/** Alertas de inactividad Allias (agrupadas por ajustador). */
export const getAlertasAllias = async () => {
  const response = await fetch(`${ALLIAS_API_URL}/alertas`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener alertas Allias (${response.status})`);
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
export const guardarCatEnCasoAllias = async ({ casoId, cat = {}, casoBase = {} }) => {
  if (!casoId) throw new Error('El caso Allias debe estar guardado antes de registrar la inspección CAT.');
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
  return actualizarCasoAllias(casoId, payload);
};

/** Guarda el liquidador en el caso y sincroniza valores reclamado/liquidado. */
export const guardarLiquidadorEnCasoAllias = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Allias debe estar guardado antes de adjuntar el liquidador.');

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

  return actualizarCasoAllias(casoId, payload);
};

/** Guarda el borrador del informe único en el caso. */
export const guardarInformeUnicoEnCasoAllias = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Allias debe estar guardado antes de adjuntar el informe.');

  const payload = {
    ...omitirCampos(casoBase, CAMPOS_CAT_NO_PISAR),
    informeUnico: informeUnico || {},
  };

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoAllias(casoId, payload);
};
