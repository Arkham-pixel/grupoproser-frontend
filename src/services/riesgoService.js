import axios from "axios";
import { BASE_URL } from "../config/apiConfig.js";

// Configurar axios con timeouts más largos para Firebase -> AWS
const api = axios.create({
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  }
});

export const obtenerCasos = async () => {
  // Mantener compatibilidad: retornar TODOS los casos (paginado)
  return obtenerCasosRiesgo();
};

export const obtenerCasosRiesgo = async (opts = {}) => {
  // El backend por defecto limita (y además capea a 2000).
  // Para exportaciones/listados completos, hacemos paginación hasta traer todo.
  const pageLimit = Number(opts.pageLimit ?? 2000);
  const maxTotal = Number(opts.maxTotal ?? 20000);

  let skip = 0;
  let acumulado = [];

  while (acumulado.length < maxTotal) {
    const res = await api.get(`${BASE_URL}/api/riesgos?limit=${pageLimit}&skip=${skip}`, {
      timeout: opts.timeout ?? 90000
    });
    const pagina = Array.isArray(res.data) ? res.data : [];
    acumulado = acumulado.concat(pagina);
    if (pagina.length < pageLimit) break;
    skip += pageLimit;
  }

  return acumulado;
};

export const eliminarCaso = async (id) => {
  return api.delete(`${BASE_URL}/api/riesgos/${id}`);
};

export const deleteCasoRiesgo = async (id) => {
  return api.delete(`${BASE_URL}/api/riesgos/${id}`);
};

export const obtenerResponsables = async () => {
  const res = await api.get(`${BASE_URL}/api/responsables`);
  // El backend devuelve { success: true, data: [...] }
  return res.data?.data || res.data || [];
};

export const obtenerEstados = async () => {
  const res = await api.get(`${BASE_URL}/api/estados/estados-riesgos`);
  return res.data;
};

export const obtenerAseguradoras = async () => {
  const res = await api.get(`${BASE_URL}/api/clientes`);
  return res.data;
};

export const obtenerCiudades = async () => {
  const res = await api.get(`${BASE_URL}/api/ciudades/ciudades`);
  return res.data;
};

