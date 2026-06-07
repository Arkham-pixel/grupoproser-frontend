// src/services/userService.js
import axios from "axios";
import { BASE_URL } from "../config/apiConfig.js";


// Asegúrate de usar el protocolo correcto:
//const API_URL = "https://grupoproser.com.co/api";

//const API_URL = "http://13.59.106.174/api"


export const registrarUsuario = async (datos) => {
  return axios.post(`/api/auth/registro`, datos);
};

export const loginUsuario = async (datos) => {
  return axios.post(`/api/auth/login`, datos);
};

export const obtenerPerfil = async (token, tipo = "normal", usuarioId = null) => {
  let url;
  if (usuarioId) {
    // Obtener perfil de otro usuario (solo para admin/soporte)
    url = tipo === "secur"
      ? `${BASE_URL}/api/secur-auth/usuarios/${usuarioId}/perfil`
      : `${BASE_URL}/api/usuarios/${usuarioId}/perfil`;
  } else {
    // Obtener perfil del usuario autenticado
    url = tipo === "secur"
      ? `${BASE_URL}/api/secur-auth/perfil`
      : `${BASE_URL}/api/usuarios/perfil`;
  }
  
return axios.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// Nueva función para subir y actualizar la foto de perfil
export const actualizarFoto = (formData, token) => {
// Usar la ruta secur-auth específica para fotos
  return axios.put(
    `${BASE_URL}/api/secur-auth/perfil/foto`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`
      }
    }
  );
};

export const actualizarPerfil = async (data, token, tipo = "normal", usuarioId = null) => {
  let url;
  if (usuarioId) {
    // Actualizar perfil de otro usuario (solo para admin/soporte)
    url = tipo === "secur"
      ? `${BASE_URL}/api/secur-auth/usuarios/${usuarioId}/perfil`
      : `${BASE_URL}/api/usuarios/${usuarioId}/perfil`;
  } else {
    // Actualizar perfil del usuario autenticado
    url = tipo === "secur"
      ? `${BASE_URL}/api/secur-auth/perfil`
      : `${BASE_URL}/api/usuarios/perfil`;
  }
  
  return axios.put(url, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
