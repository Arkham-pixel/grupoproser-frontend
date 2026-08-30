import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';
import { sanitizarInformeUnicoAllianz, sanitizarLiquidadorAllianz, parsearNumero } from '../components/SubcomponenteAllianz/liquidadorAllianzHelpers.js';
import { homologarCiudadAllianz, resolverUbicacionAllianz } from '../components/SubcomponenteAllianz/allianzHelpers.js';

const API_URL = `${BASE_URL}/api/allianz-listado`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const normalizeAllianzListadoItem = (item = {}) => {
  const ub = resolverUbicacionAllianz(item.ciudad, item.departamento);
  return {
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
  ciudad: ub.ciudad || homologarCiudadAllianz(item.ciudad) || item.ciudad || '',
  departamento: ub.departamento || item.departamento || '',
  ajustadorLider: item.ajustadorLider ?? '',
  ajustador: item.ajustador ?? '',
  inspector: item.inspector ?? '',
  estado: item.estado ?? '',
  liquidador: item.liquidador && typeof item.liquidador === 'object' ? item.liquidador : null,
  informeUnico: item.informeUnico && typeof item.informeUnico === 'object' ? item.informeUnico : null,
  archivos: Array.isArray(item.archivos) ? item.archivos : [],
  };
};

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
  delete payload.archivos;
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
    liquidador: sanitizarLiquidadorAllianz(liquidador || {}),
    valorAseguradoInmueble:
      parsearNumero(liquidador?.encabezado?.valorAseguradoInmueble) ||
      casoBase.valorAseguradoInmueble,
    valorAseguradoContenidos:
      parsearNumero(liquidador?.encabezado?.valorAseguradoContenidos) ||
      casoBase.valorAseguradoContenidos,
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
    informeUnico: sanitizarInformeUnicoAllianz(informeUnico || {}),
  });
};

export const guardarInformeAgilEnCasoAllianzListado = async ({
  casoId,
  informeAgil,
  casoBase = {},
}) => {
  if (!casoId) {
    throw new Error('El caso del listado debe estar guardado antes de adjuntar el informe ágil.');
  }
  return actualizarCasoAllianzListado(casoId, {
    ...omitirMeta(casoBase),
    informeAgil: informeAgil && typeof informeAgil === 'object' ? informeAgil : {},
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

export const subirArchivoAllianzListado = async (casoId, file, etiqueta = 'GENERAL', extras = {}) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (extras?.descripcion != null) {
    formData.append('descripcion', String(extras.descripcion));
  }
  const response = await fetch(`${API_URL}/${casoId}/archivos`, {
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

export const eliminarArchivoAllianzListado = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoAllianzListado = (ruta) => resolveUploadsUrl(ruta);

