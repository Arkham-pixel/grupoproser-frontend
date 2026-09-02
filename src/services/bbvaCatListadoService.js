import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';
import {
  diasEnEstadoBbvaCat,
  homologarCiudadBbvaCat,
  homologarEstadoBbvaCat,
  ultimaGestionBbvaCat,
} from '../components/SubcomponenteBbvaCat/bbvaCatHelpers.js';
import {
  camposValoresDesdeLiquidadorBbvaCat,
  sanitizarInformeUnicoBbvaCat,
} from '../components/SubcomponenteBbvaCat/liquidadorBbvaCatHelpers.js';

const API_URL = `${BASE_URL}/api/bbva-cat-listado`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const normalizeBbvaCatListadoItem = (item = {}) => {
  const estado = homologarEstadoBbvaCat(item.estado);
  const caso = { ...item, estado };
  const nArchivos = Number(item.nArchivos);
  return {
    ...caso,
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
    ciudad: homologarCiudadBbvaCat(item.ciudad) || item.ciudad || '',
    departamento: item.departamento ?? '',
    ajustadorLider: item.ajustadorLider ?? '',
    ajustador: item.ajustador ?? '',
    inspector: item.inspector ?? '',
    estado,
    diasEnEstado: diasEnEstadoBbvaCat(caso),
    ultimaGestion: ultimaGestionBbvaCat(caso),
    liquidador:
      item.liquidador && typeof item.liquidador === 'object'
        ? item.liquidador
        : item.tieneLiquidador
          ? { _presente: true }
          : null,
    informeUnico:
      item.informeUnico && typeof item.informeUnico === 'object'
        ? item.informeUnico
        : item.tieneInforme
          ? { _presente: true }
          : null,
    archivos: Array.isArray(item.archivos)
      ? item.archivos
      : Number.isFinite(nArchivos) && nArchivos > 0
        ? Array.from({ length: nArchivos }, () => ({}))
        : [],
  };
};

const normalizeArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeBbvaCatListadoItem(item ?? {})) : [];

export const getCasosBbvaCatListadoPaginado = async ({ page = 1, limit = 100, completo = false } = {}) => {
  const qs = new URLSearchParams({ page, limit, _t: Date.now() });
  if (completo) qs.set('completo', '1');
  const response = await fetch(`${API_URL}?${qs}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener los casos del listado BBVA CAT (${response.status})`);
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return { ...payload, data: normalizeArray(payload.data) };
  }
  if (Array.isArray(payload)) {
    return { data: normalizeArray(payload), total: payload.length };
  }
  return payload;
};

export const fetchAllCasosBbvaCatListado = async (batchSize = 2000, { completo = false } = {}) => {
  const acumulado = [];
  let page = 1;
  let total = null;
  while (true) {
    const respuesta = await getCasosBbvaCatListadoPaginado({ page, limit: batchSize, completo });
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

export const crearCasoBbvaCatListado = async (datos) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al guardar (${response.status})`);
  }
  return normalizeBbvaCatListadoItem(payload?.data ?? payload);
};

export const actualizarCasoBbvaCatListado = async (id, datos) => {
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
  return normalizeBbvaCatListadoItem(payload?.data ?? payload);
};

export const getCasoBbvaCatListadoById = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const qs = new URLSearchParams({ _t: Date.now() });
  const response = await fetch(`${API_URL}/${id}?${qs}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  return normalizeBbvaCatListadoItem(payload?.data ?? payload);
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

export const guardarLiquidadorEnCasoBbvaCatListado = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso del listado debe estar guardado antes de adjuntar el liquidador.');
  return actualizarCasoBbvaCatListado(casoId, {
    ...omitirMeta(casoBase),
    ...camposValoresDesdeLiquidadorBbvaCat(liquidador || {}, totales, casoBase),
    liquidador: liquidador || {},
  });
};

export const guardarInformeUnicoEnCasoBbvaCatListado = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso del listado debe estar guardado antes de adjuntar el informe.');
  return actualizarCasoBbvaCatListado(casoId, {
    ...omitirMeta(casoBase),
    informeUnico: sanitizarInformeUnicoBbvaCat(informeUnico || {}),
  });
};

export const deleteCasoBbvaCatListado = async (id) => {
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

export const importarCasosBbvaCatListado = async (casos = []) => {
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

export const subirArchivoBbvaCatListado = async (casoId, file, etiqueta = 'GENERAL', extras = {}) => {
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

export const eliminarArchivoBbvaCatListado = async (casoId, archivoId) => {
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

export const urlDescargaArchivoBbvaCatListado = (ruta) => resolveUploadsUrl(ruta);

