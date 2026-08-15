import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';

const FDM_API_URL = `${BASE_URL}/api/equidad-fdm`;

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

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const normalizeFdmItem = (item = {}) => ({
  ...item,
  nombre: item.nombre ?? '',
  cedula: item.cedula ?? '',
  municipio: item.municipio ?? '',
  departamento: item.departamento ?? '',
  oficinaRadicadora: item.oficinaRadicadora ?? '',
  ajustador: item.ajustador ?? '',
  evento: item.evento ?? '',
  estado: item.estado ?? '',
  esNuevo: item.esNuevo === true,
  liquidador: item.liquidador && typeof item.liquidador === 'object' ? item.liquidador : null,
  archivos: Array.isArray(item.archivos) ? item.archivos : [],
  totalPerdidaNumero: toNumber(item.totalPerdida),
  totalLiquidadoNumero: toNumber(item.totalLiquidado),
  valorIndemnizadoNumero: toNumber(item.valorIndemnizado),
  deducibleNumero: toNumber(item.deducible),
});

const normalizeResponseArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeFdmItem(item ?? {})) : [];

export const getCasosFdmPaginado = async ({ page = 1, limit = 100 } = {}) => {
  const queryString = buildQueryString({ page, limit, _t: Date.now() });
  const response = await fetch(`${FDM_API_URL}${queryString}`);
  if (!response.ok) {
    throw new Error('Error al obtener los casos Equidad FDM');
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

/** Descarga todos los casos FDM paginando en lotes (para reporte y dashboard). */
export const fetchAllCasosFdm = async (batchSize = 2000) => {
  const acumulado = [];
  let page = 1;
  let total = null;

  while (true) {
    const respuesta = await getCasosFdmPaginado({ page, limit: batchSize });
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

export const getCasoFdmById = async (id) => {
  if (!id) throw new Error('Identificador de caso FDM no válido');
  const response = await fetch(`${FDM_API_URL}/${id}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso FDM (${response.status})`);
  }
  return normalizeFdmItem(payload?.data ?? payload);
};

export const crearCasoFdm = async (datos) => {
  const response = await fetch(FDM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al guardar el caso FDM (${response.status})`);
  }
  return normalizeFdmItem(payload?.data ?? payload);
};

export const actualizarCasoFdm = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso FDM no válido');
  const response = await fetch(`${FDM_API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al actualizar el caso FDM (${response.status})`);
  }
  return normalizeFdmItem(payload?.data ?? payload);
};

/** Importación masiva: crea o actualiza sin duplicar ni borrar. */
export const importarCasosFdm = async (casos = []) => {
  const response = await fetch(`${FDM_API_URL}/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ casos }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || payload?.detalle || `Error al importar casos Equidad FDM (${response.status})`
    );
  }
  return payload?.data ?? payload;
};

/** Estado sync Excel SharePoint SEGUROS EQUIDAD. */
export const getBaseTerremotoFdmStatus = async () => {
  const response = await fetch(`${FDM_API_URL}/base-terremoto/status`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error status base terremoto (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const checkBaseTerremotoFdm = async ({ force = false } = {}) => {
  const response = await fetch(`${FDM_API_URL}/base-terremoto/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ force }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error check base terremoto (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const dismissBaseTerremotoFdmNotification = async () => {
  const response = await fetch(`${FDM_API_URL}/base-terremoto/notification/dismiss`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'No se pudo descartar la notificación');
  }
  return payload?.data ?? payload;
};

export const getBaseTerremotoFdmImportSession = async (sessionId) => {
  const response = await fetch(`${FDM_API_URL}/base-terremoto/import/${sessionId}`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'No se pudo cargar la sesión de importación');
  }
  return payload?.data ?? payload;
};

export const executeBaseTerremotoFdmImport = async (sessionId) => {
  const response = await fetch(`${FDM_API_URL}/base-terremoto/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ sessionId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'No se pudo aplicar la actualización desde Excel');
  }
  return payload?.data ?? payload;
};

export const deleteCasoFdm = async (id) => {
  if (!id) throw new Error('Identificador de caso FDM no válido');
  const response = await fetch(`${FDM_API_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar el caso FDM (${response.status})`);
  }
  return payload;
};

/**
 * Guarda el liquidador JSON en el caso y sincroniza totales de liquidación.
 */
export const guardarLiquidadorEnCasoFdm = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso FDM debe estar guardado antes de adjuntar el liquidador.');

  const payload = {
    ...casoBase,
    liquidador: liquidador || {},
    totalPerdida: totales.totalPerdida ?? casoBase.totalPerdida,
    deducible: totales.deducibleAplicado ?? casoBase.deducible,
    totalLiquidado: totales.totalIndemnizar ?? casoBase.totalLiquidado,
    valorIndemnizado: totales.totalIndemnizar ?? casoBase.valorIndemnizado,
    valorIndemnizadoAjustador: totales.totalIndemnizar ?? casoBase.valorIndemnizadoAjustador,
    subsidio: totales.subsidio ?? casoBase.subsidio,
    perdidaContenidos: totales.subtotalContenidos ?? casoBase.perdidaContenidos,
    perdidaEdificio: totales.subtotalEdificios ?? casoBase.perdidaEdificio,
    // Fecha de liquidación al guardar (si aún no tenía)
    fechaLiquidacion:
      casoBase.fechaLiquidacion || new Date().toISOString().slice(0, 10),
  };

  // No reenviar _id / timestamps
  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.totalPerdidaNumero;
  delete payload.totalLiquidadoNumero;
  delete payload.valorIndemnizadoNumero;
  delete payload.deducibleNumero;
  delete payload.archivos;

  return actualizarCasoFdm(casoId, payload);
};

export const subirArchivoFdm = async (
  casoId,
  file,
  etiqueta = 'GENERAL',
  extras = {}
) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (extras?.descripcion != null) {
    formData.append('descripcion', String(extras.descripcion));
  }
  if (extras?.reemplazarMismaEtiqueta) {
    formData.append('reemplazarMismaEtiqueta', 'true');
  }
  const response = await fetch(`${FDM_API_URL}/${casoId}/archivos`, {
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

export const eliminarArchivoFdm = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${FDM_API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoFdm = (ruta) => resolveUploadsUrl(ruta);
