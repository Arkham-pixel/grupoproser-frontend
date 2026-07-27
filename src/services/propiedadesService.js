import { BASE_URL } from '../config/apiConfig.js';

const PROPIEDADES_API_URL = `${BASE_URL}/api/propiedades`;

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

export const normalizePropiedadCaso = (item = {}) => ({
  ...item,
  nombreCliente: item.nombreCliente || '',
  ciudad: item.ciudad || '',
  departamento: item.departamento || '',
  claseInmueble: item.claseInmueble || '',
  tipoInmueble: item.tipoInmueble || '',
  direccion: item.direccion || '',
  destinacion: item.destinacion || '',
  responsable: item.responsable || '',
  aseguradora: item.aseguradora || '',
  tieneInspeccion: Boolean(item.inspeccionId),
});

/** Mapea el caso → datos básicos del formulario de inspección */
export const mapCasoADatosInspeccion = (caso = {}) => ({
  nombreInmueble: caso.nombreCliente || '',
  direccion: caso.direccion || '',
  localizacion: caso.localizacion || '',
  ciudad: caso.ciudad || '',
  departamento: caso.departamento || '',
  claseInmueble: caso.claseInmueble || '',
  tipoInmueble: caso.tipoInmueble || '',
  destinacion: caso.destinacion || '',
  numeroDocumento: caso.documento || '',
  actaClienteNombre: caso.destinacion || caso.nombreCliente || '',
});

const normalizeResponseArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizePropiedadCaso(item ?? {})) : [];

export const getCasosPropiedadesPaginado = async ({ page = 1, limit = 100 } = {}) => {
  const queryString = buildQueryString({ page, limit, _t: Date.now() });
  const response = await fetch(`${PROPIEDADES_API_URL}${queryString}`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    throw new Error('Error al obtener los casos de propiedades');
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

export const fetchAllCasosPropiedades = async (batchSize = 500) => {
  const acumulado = [];
  let page = 1;
  let total = null;

  while (true) {
    const respuesta = await getCasosPropiedadesPaginado({ page, limit: batchSize });
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

export const getCasoPropiedadesById = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const response = await fetch(`${PROPIEDADES_API_URL}/${id}`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    throw new Error('Error al obtener el caso de propiedades');
  }
  const payload = await response.json();
  return normalizePropiedadCaso(payload?.data ?? payload);
};

export const crearCasoPropiedades = async (payload) => {
  const response = await fetch(PROPIEDADES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al crear el caso');
  }
  const data = await response.json();
  return normalizePropiedadCaso(data?.data ?? data);
};

export const actualizarCasoPropiedades = async (id, payload) => {
  const response = await fetch(`${PROPIEDADES_API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar el caso');
  }
  const data = await response.json();
  return normalizePropiedadCaso(data?.data ?? data);
};

export const vincularInspeccionCasoPropiedades = async (casoId, payload) => {
  const response = await fetch(`${PROPIEDADES_API_URL}/${casoId}/inspeccion`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al vincular la inspección');
  }
  const data = await response.json();
  return normalizePropiedadCaso(data?.data ?? data);
};

export const eliminarCasoPropiedades = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const response = await fetch(`${PROPIEDADES_API_URL}/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al eliminar el caso');
  }
  return response.json();
};
