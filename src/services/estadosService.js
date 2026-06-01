// src/services/estadosService.js
import { BASE_URL } from '../config/apiConfig.js';

export async function getEstados() {
  const res = await fetch(`${BASE_URL}/api/estados`);
  if (!res.ok) throw new Error('Error al obtener estados');
  return res.json();
}

// Crear un nuevo estado
export async function crearEstado(codiEstdo, descEstdo) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}/api/estados`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ codiEstdo, descEstdo })
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error al crear estado' }));
    throw new Error(error.detalle || error.error || 'Error al crear estado');
  }
  
  return res.json();
}

// Eliminar un estado
export async function eliminarEstado(id) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}/api/estados/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error al eliminar estado' }));
    throw new Error(error.detalle || error.error || 'Error al eliminar estado');
  }
  
  return res.json();
} 