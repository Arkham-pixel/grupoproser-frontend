import { BASE_URL } from '../config/apiConfig.js';

const API_URL = `${BASE_URL}/api/allianz-listado`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const normalizeAllianzListadoItem = (item = {}) => ({
  ...item,
  zc: item.zc ?? '',
  siniestro: item.siniestro ?? '',
  identificacion: item.identificacion ?? '',
  tipoIdentificacion: item.tipoIdentificacion ?? '',
  numeroPoliza: item.numeroPoliza ?? '',
  tipoPoliza: item.tipoPoliza ?? '',
  tipoPolizaOtro: item.tipoPolizaOtro ?? '',
  causa: item.causa ?? '',
  asegurado: item.asegurado ?? '',
  intermediario: item.intermediario ?? '',
  correoIntermediario: item.correoIntermediario ?? '',
  telefonoIntermediario: item.telefonoIntermediario ?? '',
  contactoIntermediario: item.contactoIntermediario ?? '',
  telefonoAsegurado: item.telefonoAsegurado ?? '',
  correoAsegurado: item.correoAsegurado ?? '',
  contactoAsegurado: item.contactoAsegurado ?? '',
  observaciones: item.observaciones ?? '',
  ciudad: item.ciudad ?? '',
  departamento: item.departamento ?? '',
  ajustadorLider: item.ajustadorLider ?? '',
  ajustador: item.ajustador ?? '',
  inspector: item.inspector ?? '',
  estado: item.estado ?? '',
  liquidador: item.liquidador && typeof item.liquidador === 'object' ? item.liquidador : null,
  informeUnico: item.informeUnico && typeof item.informeUnico === 'object' ? item.informeUnico : null,
});

const normalizeArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeAllianzListadoItem(item ?? {})) : [];

export const getCasosAllianzListadoPaginado = async ({ page = 1, limit = 100 } = {}) => {
  const qs = new URLSearchParams({ page, limit, _t: Date.now() });
  const response = await fetch(`${API_URL}?${qs}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener los casos del listado Allianz (${response.status})`);
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return { ...payload, data: normalizeArray(payload.data) };
  }
  if (Array.isArray(payload)) {
    return { data: normalizeArray(payload), total: payload.length };
  }
  return payload;
};

export const fetchAllCasosAllianzListado = async (batchSize = 2000) => {
  const acumulado = [];
  let page = 1;
  let total = null;
  while (true) {
    const respuesta = await getCasosAllianzListadoPaginado({ page, limit: batchSize });
    const lote = Array.isArray(respuesta?.data) ? respuesta.data : [];
    if (total == null && typeof respuesta?.total === 'number') total = respuesta.total;
    if (!lote.length) break;
    acumulado.push(...lote);
    if (total != null && acumulado.length >= total) break;
    if (lote.length < batchSize) break;
    page += 1;
  }
  return acumulado;
};

export const crearCasoAllianzListado = async (datos) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al guardar (${response.status})`);
  }
  return normalizeAllianzListadoItem(payload?.data ?? payload);
};

export const actualizarCasoAllianzListado = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al actualizar (${response.status})`);
  }
  return normalizeAllianzListadoItem(payload?.data ?? payload);
};

export const getCasoAllianzListadoById = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const qs = new URLSearchParams({ _t: Date.now() });
  const response = await fetch(`${API_URL}/${id}?${qs}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeAllianzListadoItem(payload?.data ?? payload);
};

const omitirMeta = (casoBase = {}) => {
  const payload = { ...casoBase };
  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  return payload;
};

export const guardarLiquidadorEnCasoAllianzListado = async ({
  casoId,
  liquidador,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso del listado debe estar guardado antes de adjuntar el liquidador.');
  return actualizarCasoAllianzListado(casoId, {
    ...omitirMeta(casoBase),
    liquidador: liquidador || {},
  });
};

export const guardarInformeUnicoEnCasoAllianzListado = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso del listado debe estar guardado antes de adjuntar el informe.');
  return actualizarCasoAllianzListado(casoId, {
    ...omitirMeta(casoBase),
    informeUnico: informeUnico || {},
  });
};

export const deleteCasoAllianzListado = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar (${response.status})`);
  }
  return payload;
};

export const importarCasosAllianzListado = async (casos = []) => {
  const response = await fetch(`${API_URL}/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ casos }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al importar (${response.status})`);
  }
  return payload?.data ?? payload;
};
