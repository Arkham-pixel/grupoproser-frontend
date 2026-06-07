// src/services/complexService.js
import { BASE_URL } from '../config/apiConfig.js';

export const obtenerCasosComplex = async () => {
  try {
const response = await fetch(`${BASE_URL}/api/complex`);
if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      console.error('❌ Status:', response.status, response.statusText);
      // Retornar array vacío en lugar de lanzar error para que el dashboard no se rompa
      return [];
    }
    
    const data = await response.json();
// Asegurar que siempre retornemos un array
    if (Array.isArray(data)) {
return data;
    } else if (data && typeof data === 'object') {
      // Si la respuesta es un objeto con una propiedad que contiene el array
      console.warn('⚠️ La respuesta es un objeto, buscando array dentro...');
// Buscar si hay alguna propiedad que sea un array
      for (const key in data) {
        if (Array.isArray(data[key])) {
return data[key];
        }
      }
      
      // Si no hay array, convertir el objeto en array
      console.warn('⚠️ No se encontró array, convirtiendo objeto único a array');
      return [data];
    } else {
      console.warn('⚠️ La respuesta no es un array ni un objeto, retornando array vacío');
      return [];
    }
  } catch (error) {
    console.error('❌ Error en obtenerCasosComplex:', error);
    console.error('❌ Mensaje de error:', error.message);
    console.error('❌ Stack:', error.stack);
    // Retornar array vacío en lugar de lanzar error para que el dashboard no se rompa
    return [];
  }
};

export const obtenerBandejaFacturacion = async (params = {}) => {
  const qs = new URLSearchParams();
  const login = params.login ?? localStorage.getItem('login') ?? '';
  const rol = params.rol ?? localStorage.getItem('rol') ?? '';
  if (login) qs.set('login', login);
  if (rol) qs.set('rol', rol);
  if (params.gerente) qs.set('gerente', params.gerente);
  if (params.tipo) qs.set('tipo', params.tipo);
  if (params.desde) qs.set('desde', params.desde);
  if (params.hasta) qs.set('hasta', params.hasta);
  if (params.q) qs.set('q', params.q);

  const response = await fetch(`${BASE_URL}/api/complex/bandeja-facturacion?${qs.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error al cargar la bandeja de facturación');
  }
  return data;
};

const bandejaAdminBody = (payload) => {
  const login = localStorage.getItem('login') || '';
  return JSON.stringify({ ...payload, login });
};

async function leerRespuestaBandejaAdmin(response, accionPorDefecto) {
  const texto = await response.text();
  let data = {};
  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      if (response.status === 404) {
        throw new Error(
          'El servidor no tiene la ruta de administración de la bandeja. Reinicie el backend (npm start en /backend) o despliegue la última versión.'
        );
      }
      throw new Error(
        `Respuesta inválida del servidor (${response.status}). ${accionPorDefecto}`
      );
    }
  }
  if (!response.ok) {
    throw new Error(data.error || accionPorDefecto);
  }
  return data;
}

export const corregirEnvioBandejaFacturacion = async (payload) => {
  const body = bandejaAdminBody(payload);
  const headers = { 'Content-Type': 'application/json' };
  let response = await fetch(`${BASE_URL}/api/complex/bandeja-facturacion/envio`, {
    method: 'PATCH',
    headers,
    body,
  });
  if (response.status === 404) {
    response = await fetch(`${BASE_URL}/api/complex/bandeja-facturacion/envio/corregir`, {
      method: 'POST',
      headers,
      body,
    });
  }
  return leerRespuestaBandejaAdmin(response, 'No se pudo corregir el destinatario');
};

export const eliminarEnvioBandejaFacturacion = async (payload) => {
  const body = bandejaAdminBody(payload);
  const headers = { 'Content-Type': 'application/json' };
  let response = await fetch(`${BASE_URL}/api/complex/bandeja-facturacion/envio`, {
    method: 'DELETE',
    headers,
    body,
  });
  if (response.status === 404) {
    response = await fetch(`${BASE_URL}/api/complex/bandeja-facturacion/envio/eliminar`, {
      method: 'POST',
      headers,
      body,
    });
  }
  return leerRespuestaBandejaAdmin(response, 'No se pudo eliminar el registro de envío');
};

export const crearCasoComplex = async (datos) => {
  try {
    const response = await fetch(`${BASE_URL}/api/complex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    
    if (!response.ok) {
      throw new Error(`Error al crear caso: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error creando caso:', error);
    throw error;
  }
};

export const deleteCasoComplex = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/api/complex/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Error al eliminar caso: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error eliminando caso:', error);
    throw error;
  }
};

export const updateCasoComplex = async (id, data) => {
  try {
    const response = await fetch(`${BASE_URL}/api/complex/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Error al actualizar caso: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error actualizando caso:', error);
    throw error;
  }
};

export const getCasoComplex = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/api/complex/${id}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener caso: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Error obteniendo caso:', error);
    throw error;
  }
};

export const getAutofillAjusteDesdeComplex = async (idCaso) => {
  try {
    const identificador = String(idCaso || '').trim();
    if (!identificador) {
      throw new Error('Identificador de caso requerido para autollenado');
    }

    const response = await fetch(`${BASE_URL}/api/complex/autofill/${encodeURIComponent(identificador)}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error || `Error al autocompletar desde complex: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error obteniendo autofill de ajuste desde complex:', error);
    throw error;
  }
};
