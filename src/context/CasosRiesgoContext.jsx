import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../config/apiConfig.js";
import { sanitizeUploadFileName } from "../utils/sanitizeUploadFileName.js";

const api = axios.create({
  timeout: 60000,
});

const CasosRiesgoContext = createContext();

function esAbortado(err) {
  return (
    err?.code === 'ERR_CANCELED' ||
    err?.name === 'CanceledError' ||
    err?.name === 'AbortError' ||
    axios.isCancel?.(err)
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- El hook debe compartirse con consumidores del proveedor.
export const useCasosRiesgo = () => useContext(CasosRiesgoContext);

export const CasosRiesgoProvider = ({ children }) => {
  const [casos, setCasos] = useState([]);
  const abortRef = useRef(null);

  const cargarCasos = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const pedir = async (pageLimit, timeout) => {
      const maxTotal = 5000;
      let skip = 0;
      let acumulado = [];
      while (acumulado.length < maxTotal) {
        const res = await api.get(`${BASE_URL}/api/riesgos?limit=${pageLimit}&skip=${skip}`, {
          timeout,
          signal: controller.signal,
        });
        const pagina = Array.isArray(res.data) ? res.data : [];
        acumulado = acumulado.concat(pagina);
        if (pagina.length < pageLimit) break;
        skip += pageLimit;
      }
      return acumulado;
    };

    try {
      setCasos(await pedir(1000, 90000));
    } catch (err) {
      if (esAbortado(err)) return;
      if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        try {
          setCasos(await pedir(500, 60000));
          return;
        } catch (err2) {
          if (esAbortado(err2)) return;
          console.error("Error al cargar casos de riesgo (intento reducido):", err2);
          setCasos([]);
          return;
        }
      }
      console.error("Error al cargar casos de riesgo:", err);
      setCasos([]);
    }
  }, []);

  const agregarCaso = async (nuevoCaso) => {
    try {
      let dataToSend = nuevoCaso;
      const formData = new FormData();
      let hasFile = false;
      Object.entries(nuevoCaso).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value, sanitizeUploadFileName(value.name, 'archivo'));
          hasFile = true;
        } else if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      if (hasFile) {
        dataToSend = formData;
      }

      const response = await api.post(`${BASE_URL}/api/riesgos`, dataToSend);

      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
      }

      await cargarCasos();
    } catch (err) {
      console.error('❌ Error al agregar caso de riesgo:', err);
      console.error('❌ Detalles del error:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Error al crear el caso de riesgo';
      alert(`❌ ${errorMessage}`);
    }
  };

  const editarCaso = async (index, nuevoCaso) => {
    try {
      const caso = casos[index];
      if (!caso || !caso._id) throw new Error('No se encontró el caso a editar');
      let dataToSend = nuevoCaso;
      const formData = new FormData();
      let hasFile = false;
      Object.entries(nuevoCaso).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value, sanitizeUploadFileName(value.name, 'archivo'));
          hasFile = true;
        } else if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      if (hasFile) {
        dataToSend = formData;
      }
      await api.put(`${BASE_URL}/api/riesgos/${caso._id}`, dataToSend);
      await cargarCasos();
    } catch (err) {
      console.error('Error al editar caso de riesgo:', err);
    }
  };

  return (
    <CasosRiesgoContext.Provider value={{ casos, agregarCaso, editarCaso, cargarCasos }}>
      {children}
    </CasosRiesgoContext.Provider>
  );
};
