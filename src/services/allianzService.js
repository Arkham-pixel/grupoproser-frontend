import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';
import { sanitizarInformeUnicoAllianz, sanitizarLiquidadorAllianz, parsearNumero } from '../components/SubcomponenteAllianz/liquidadorAllianzHelpers.js';
import { homologarCiudadAllianz, resolverUbicacionAllianz } from '../components/SubcomponenteAllianz/allianzHelpers.js';

const ALLIANZ_API_URL = `${BASE_URL}/api/allianz`;

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

export const normalizeAllianzItem = (item = {}) => {
  const ub = resolverUbicacionAllianz(item.ciudad, item.departamento);
  return {
  ...item,
  ciudad: ub.ciudad || homologarCiudadAllianz(item.ciudad) || item.ciudad || '',
  departamento: ub.departamento || item.departamento || '',
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
  };
};

const normalizeResponseArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeAllianzItem(item ?? {})) : [];

export const getCasosAllianzPaginado = async ({
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
  const response = await fetch(`${ALLIANZ_API_URL}${queryString}`, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error('Error al obtener los casos Allianz');
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

export const fetchAllCasosAllianz = async (batchSize = 2000, opciones = {}) => {
  const acumulado = [];
  let page = 1;
  let total = null;
  const soloChecklistLleno = opciones.soloChecklistLleno === true;

  while (true) {
    const respuesta = await getCasosAllianzPaginado({
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

export const getCasoAllianzById = async (id) => {
  if (!id) throw new Error('Identificador de caso Allianz no válido');
  const response = await fetch(`${ALLIANZ_API_URL}/${id}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeAllianzItem(payload?.data ?? payload);
};

export const crearCasoAllianz = async (datos) => {
  const response = await fetch(ALLIANZ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.detalle || `Error al guardar el caso Allianz (${response.status})`
    );
  }
  return normalizeAllianzItem(payload?.data ?? payload);
};

export const actualizarCasoAllianz = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso Allianz no válido');
  const response = await fetch(`${ALLIANZ_API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al actualizar el caso Allianz (${response.status})`
    );
  }
  return normalizeAllianzItem(payload?.data ?? payload);
};

export const deleteCasoAllianz = async (id) => {
  if (!id) throw new Error('Identificador de caso Allianz no válido');
  const response = await fetch(`${ALLIANZ_API_URL}/${id}`, {
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
export const importarCasosAllianz = async (casos = [], opciones = {}) => {
  const response = await fetch(`${ALLIANZ_API_URL}/importar`, {
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
        `Error al importar casos Allianz (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

/** Sincroniza casos desde Express (Allianz Colombia) hacia el módulo Allianz. */
export const syncAllianzDesdeExpress = async (ids = null) => {
  const response = await fetch(`${ALLIANZ_API_URL}/sync-express`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(ids?.length ? { ids } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        payload?.detalle ||
        `Error al sincronizar Express → Allianz (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

export const subirArchivoAllianz = async (casoId, file, etiqueta = 'GENERAL', extras = {}) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (extras?.descripcion != null) {
    formData.append('descripcion', String(extras.descripcion));
  }
  const response = await fetch(`${ALLIANZ_API_URL}/${casoId}/archivos`, {
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

export const actualizarArchivoAllianz = async (casoId, archivoId, data = {}) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${ALLIANZ_API_URL}/${casoId}/archivos/${archivoId}`, {
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

export const reordenarArchivosAllianz = async (casoId, ids = []) => {
  if (!casoId) throw new Error('Caso requerido');
  const response = await fetch(`${ALLIANZ_API_URL}/${casoId}/archivos/orden`, {
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

export const eliminarArchivoAllianz = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${ALLIANZ_API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoAllianz = (ruta) => resolveUploadsUrl(ruta);

/** Alertas de inactividad Allianz (agrupadas por ajustador). */
export const getAlertasAllianz = async () => {
  const response = await fetch(`${ALLIANZ_API_URL}/alertas`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener alertas Allianz (${response.status})`);
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
export const guardarCatEnCasoAllianz = async ({ casoId, cat = {}, casoBase = {} }) => {
  if (!casoId) throw new Error('El caso Allianz debe estar guardado antes de registrar la inspección CAT.');
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
  return actualizarCasoAllianz(casoId, payload);
};

/** Guarda el liquidador en el caso y sincroniza valores reclamado/liquidado. */
export const guardarLiquidadorEnCasoAllianz = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Allianz debe estar guardado antes de adjuntar el liquidador.');

  const payload = {
    ...omitirCampos(casoBase, CAMPOS_CAT_NO_PISAR),
    liquidador: sanitizarLiquidadorAllianz(liquidador || {}),
    valorReclamado:
      totales.totalReclamado != null ? totales.totalReclamado : casoBase.valorReclamado,
    valorLiquidado:
      totales.totalIndemnizar != null ? totales.totalIndemnizar : casoBase.valorLiquidado,
    valorAseguradoInmueble:
      parsearNumero(liquidador?.encabezado?.valorAseguradoInmueble) ||
      casoBase.valorAseguradoInmueble,
    valorAseguradoContenidos:
      parsearNumero(liquidador?.encabezado?.valorAseguradoContenidos) ||
      casoBase.valorAseguradoContenidos,
  };

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoAllianz(casoId, payload);
};

/** Guarda el borrador del informe único en el caso. */
export const guardarInformeUnicoEnCasoAllianz = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Allianz debe estar guardado antes de adjuntar el informe.');

  const payload = {
    ...omitirCampos(casoBase, CAMPOS_CAT_NO_PISAR),
    informeUnico: sanitizarInformeUnicoAllianz(informeUnico || {}),
  };

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoAllianz(casoId, payload);
};

/** Guarda el informe ágil (valores, deducible e indemnización sugerida) en el caso. */
export const guardarInformeAgilEnCasoAllianz = async ({
  casoId,
  informeAgil,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso Allianz debe estar guardado antes de adjuntar el informe ágil.');

  const payload = {
    ...omitirCampos(casoBase, CAMPOS_CAT_NO_PISAR),
    informeAgil: informeAgil && typeof informeAgil === 'object' ? informeAgil : {},
  };

  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;

  return actualizarCasoAllianz(casoId, payload);
};
