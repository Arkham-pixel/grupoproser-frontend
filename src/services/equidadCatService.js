import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';

const API_URL = `${BASE_URL}/api/equidad-cat`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function esErrorDeRed(err) {
  const msg = String(err?.message || '');
  return (
    err?.name === 'TypeError' ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(msg)
  );
}

function mensajeErrorDeRed() {
  return `No se pudo conectar con Equidad CAT (${API_URL}). Confirme que el backend esté en ${BASE_URL} y recargue la página.`;
}

async function fetchEquidadCat(url, options = {}) {
  const opts = { cache: 'no-store', ...options };
  try {
    return await fetch(url, opts);
  } catch (err) {
    if (!esErrorDeRed(err)) throw err;
    await new Promise((r) => setTimeout(r, 400));
    try {
      return await fetch(url, opts);
    } catch {
      throw new Error(mensajeErrorDeRed());
    }
  }
}

export const normalizeEquidadCatItem = (item = {}) => ({
  ...item,
  zc: item.zc ?? '',
  siniestro: item.siniestro ?? '',
  numeroCasoCliente: item.numeroCasoCliente ?? '',
  identificacion: item.identificacion ?? '',
  tipoIdentificacion: item.tipoIdentificacion ?? '',
  numeroPoliza: item.numeroPoliza ?? '',
  tipoPoliza: item.tipoPoliza ?? '',
  tipoPolizaOtro: item.tipoPolizaOtro ?? '',
  producto: item.producto ?? '',
  causa: item.causa ?? '',
  asegurado: item.asegurado ?? '',
  tomador: item.tomador ?? '',
  analista: item.analista ?? '',
  intermediario: item.intermediario ?? '',
  correoIntermediario: item.correoIntermediario ?? '',
  telefonoIntermediario: item.telefonoIntermediario ?? '',
  contactoIntermediario: item.contactoIntermediario ?? '',
  telefonoAsegurado: item.telefonoAsegurado ?? item.celular ?? '',
  celular: item.celular ?? item.telefonoAsegurado ?? '',
  correoAsegurado: item.correoAsegurado ?? '',
  contactoAsegurado: item.contactoAsegurado ?? '',
  observaciones: item.observaciones ?? '',
  comentariosAnalista: item.comentariosAnalista ?? '',
  ciudad: item.ciudad ?? '',
  departamento: item.departamento ?? '',
  asignacion: item.asignacion ?? '',
  asignadoAAjustador: item.asignadoAAjustador ?? '',
  visita: item.visita ?? '',
  tipoDeducible: item.tipoDeducible ?? '',
  ajustadorLider: item.ajustadorLider ?? '',
  ajustador: item.ajustador ?? '',
  inspector: item.inspector ?? '',
  estado: item.estado ?? '',
  liquidador: item.liquidador && typeof item.liquidador === 'object' ? item.liquidador : null,
  informeUnico: item.informeUnico && typeof item.informeUnico === 'object' ? item.informeUnico : null,
  archivos: Array.isArray(item.archivos) ? item.archivos : [],
});

const normalizeArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeEquidadCatItem(item ?? {})) : [];

export const getCasosEquidadCatPaginado = async ({ page = 1, limit = 100 } = {}) => {
  const qs = new URLSearchParams({ page, limit, _t: Date.now() });
  const response = await fetchEquidadCat(`${API_URL}?${qs}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener los casos del Equidad CAT (${response.status})`);
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return { ...payload, data: normalizeArray(payload.data) };
  }
  if (Array.isArray(payload)) {
    return { data: normalizeArray(payload), total: payload.length };
  }
  return payload;
};

export const fetchAllCasosEquidadCat = async (batchSize = 2000) => {
  const acumulado = [];
  let page = 1;
  let total = null;
  while (true) {
    const respuesta = await getCasosEquidadCatPaginado({ page, limit: batchSize });
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

export const crearCasoEquidadCat = async (datos) => {
  const response = await fetchEquidadCat(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al guardar (${response.status})`);
  }
  return normalizeEquidadCatItem(payload?.data ?? payload);
};

export const actualizarCasoEquidadCat = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const response = await fetchEquidadCat(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al actualizar (${response.status})`);
  }
  return normalizeEquidadCatItem(payload?.data ?? payload);
};

export const getCasoEquidadCatById = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const qs = new URLSearchParams({ _t: Date.now() });
  const response = await fetchEquidadCat(`${API_URL}/${id}?${qs}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeEquidadCatItem(payload?.data ?? payload);
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

export const guardarLiquidadorEnCasoEquidadCat = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso debe estar guardado antes de adjuntar el liquidador.');
  const { calcularLiquidacionFdm } = await import(
    '../components/SubcomponenteEquidadFdm/liquidadorEquidadFdmHelpers.js'
  );
  const t = calcularLiquidacionFdm(liquidador || {});
  return actualizarCasoEquidadCat(casoId, {
    ...omitirMeta(casoBase),
    liquidador: liquidador && typeof liquidador === 'object' ? liquidador : {},
    valorLiquidado: t.totalIndemnizar ?? totales.totalIndemnizar ?? casoBase.valorLiquidado,
    valorReclamado: t.totalPerdida ?? casoBase.valorReclamado,
  });
};

export const guardarInformeUnicoEnCasoEquidadCat = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso del listado debe estar guardado antes de adjuntar el informe.');
  const { sanitizarInformeUnicoEquidadCat } = await import(
    '../components/SubcomponenteEquidadCat/liquidadorEquidadCatHelpers.js'
  );
  return actualizarCasoEquidadCat(casoId, {
    ...omitirMeta(casoBase),
    informeUnico: sanitizarInformeUnicoEquidadCat(informeUnico || {}),
  });
};

export const guardarInformeAgilEnCasoEquidadCat = async ({
  casoId,
  informeAgil,
  casoBase = {},
}) => {
  if (!casoId) {
    throw new Error('El caso del listado debe estar guardado antes de adjuntar el informe ágil.');
  }
  return actualizarCasoEquidadCat(casoId, {
    ...omitirMeta(casoBase),
    informeAgil: informeAgil && typeof informeAgil === 'object' ? informeAgil : {},
  });
};

export const deleteCasoEquidadCat = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const response = await fetchEquidadCat(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar (${response.status})`);
  }
  return payload;
};

export const importarCasosEquidadCat = async (casos = []) => {
  const response = await fetchEquidadCat(`${API_URL}/importar`, {
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

export const subirArchivoEquidadCat = async (casoId, file, etiqueta = 'GENERAL', extras = {}) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (extras?.descripcion != null) {
    formData.append('descripcion', String(extras.descripcion));
  }
  const response = await fetchEquidadCat(`${API_URL}/${casoId}/archivos`, {
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

export const eliminarArchivoEquidadCat = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetchEquidadCat(`${API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoEquidadCat = (ruta) => resolveUploadsUrl(ruta);

