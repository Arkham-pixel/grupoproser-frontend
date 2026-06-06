import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { BASE_URL } from "../config/apiConfig.js";

// Configurar axios con timeouts más largos para Firebase -> AWS
const api = axios.create({
  timeout: 60000, // 60 segundos (aumentado para evitar timeouts con muchos registros)
  headers: {
    'Content-Type': 'application/json',
  }
});

const CasosRiesgoContext = createContext();

export const useCasosRiesgo = () => useContext(CasosRiesgoContext); 

export const CasosRiesgoProvider = ({ children }) => {
  const [casos, setCasos] = useState([]);

  // Cargar casos desde el backend al iniciar
  useEffect(() => {
    cargarCasos();
  }, []);

  const cargarCasos = async () => {
    try {
      // Paginación para no "perder" registros por el límite (por defecto el backend limita a 1000-2000)
      const pageLimit = 1000;
      const maxTotal = 5000; // safety cap
      let skip = 0;
      let acumulado = [];

      while (acumulado.length < maxTotal) {
        const res = await api.get(`${BASE_URL}/api/riesgos?limit=${pageLimit}&skip=${skip}`, {
          timeout: 90000 // 90 segundos de timeout
        });

        const pagina = Array.isArray(res.data) ? res.data : [];
        acumulado = acumulado.concat(pagina);

        if (pagina.length < pageLimit) break;
        skip += pageLimit;
      }

      setCasos(acumulado);
      console.log(`✅ Casos de riesgo cargados: ${acumulado.length}`);
    } catch (err) {
      console.error("Error al cargar casos de riesgo:", err);
      // Si hay error, intentar con menos registros
      if (err.code === 'ECONNABORTED') {
        console.log('⚠️ Timeout detectado, intentando con menos registros...');
        try {
          const pageLimit = 500;
          const maxTotal = 5000;
          let skip = 0;
          let acumulado = [];

          while (acumulado.length < maxTotal) {
            const res = await api.get(`${BASE_URL}/api/riesgos?limit=${pageLimit}&skip=${skip}`, {
              timeout: 60000
            });
            const pagina = Array.isArray(res.data) ? res.data : [];
            acumulado = acumulado.concat(pagina);
            if (pagina.length < pageLimit) break;
            skip += pageLimit;
          }

          setCasos(acumulado);
          console.log(`✅ Casos de riesgo cargados (reducido): ${acumulado.length}`);
        } catch (err2) {
          console.error("Error al cargar casos de riesgo (intento reducido):", err2);
          setCasos([]);
        }
      } else {
        setCasos([]);
      }
    }
  };

  const agregarCaso = async (nuevoCaso) => {
    try {
      console.log('📝 DATOS A ENVIAR DESDE FRONTEND:', JSON.stringify(nuevoCaso, null, 2));
      
      let dataToSend = nuevoCaso;
      // Si hay archivos adjuntos, usar FormData
      const formData = new FormData();
      let hasFile = false;
      Object.entries(nuevoCaso).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value, value.name);
          hasFile = true;
        } else if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      if (hasFile) {
        dataToSend = formData;
      }
      
      console.log('📤 ENVIANDO AL BACKEND:', dataToSend);
      
      const response = await api.post(`${BASE_URL}/api/riesgos`, dataToSend);
      
      console.log('✅ RESPUESTA DEL BACKEND:', response.data);
      
      // Mostrar notificación de éxito
      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
      }
      
      await cargarCasos();
    } catch (err) {
      console.error('❌ Error al agregar caso de riesgo:', err);
      console.error('❌ Detalles del error:', err.response?.data);
      
      // Mostrar error al usuario
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
          formData.append(key, value, value.name);
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