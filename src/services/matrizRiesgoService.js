import { BASE_URL } from '../config/apiConfig.js';

// Servicio para manejar las operaciones de matrices de riesgo
export class MatrizRiesgoService {
  static getBaseURL() {
    return BASE_URL;
  }
  
  // Obtener URL completa para las APIs
  static getApiURL(endpoint) {
    return `${this.getBaseURL()}/api/matrices-riesgo${endpoint}`;
  }
  
  // Crear nueva matriz de riesgo
  static async crearMatrizRiesgo(datosMatriz, nombreEmpresa, titulo) {
    try {
      const response = await fetch(this.getApiURL(''), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          datosMatriz,
          nombreEmpresa,
          titulo
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error creando matriz de riesgo');
      }
      
      return data;
    } catch (error) {
      console.error('Error creando matriz de riesgo:', error);
      throw error;
    }
  }
  
  // Obtener todas las matrices de riesgo del usuario
  static async obtenerMatricesRiesgo(filtros = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filtros.estado) queryParams.append('estado', filtros.estado);
      if (filtros.tipo) queryParams.append('tipo', filtros.tipo);
      if (filtros.empresa) queryParams.append('empresa', filtros.empresa);
      if (filtros.page) queryParams.append('page', filtros.page);
      if (filtros.limit) queryParams.append('limit', filtros.limit);
      
      const response = await fetch(`${this.getApiURL('')}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo matrices de riesgo');
      }
      
      return data;
    } catch (error) {
      console.error('Error obteniendo matrices de riesgo:', error);
      throw error;
    }
  }
  
  // Obtener una matriz de riesgo específica
  static async obtenerMatrizRiesgo(id) {
    try {
      const response = await fetch(this.getApiURL(`/${id}`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo matriz de riesgo');
      }
      
      return data;
    } catch (error) {
      console.error('Error obteniendo matriz de riesgo:', error);
      throw error;
    }
  }
  
  // Actualizar matriz de riesgo
  static async actualizarMatrizRiesgo(id, datosMatriz, titulo, estado) {
    try {
      const response = await fetch(this.getApiURL(`/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          datosMatriz,
          titulo,
          estado
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando matriz de riesgo');
      }
      
      return data;
    } catch (error) {
      console.error('Error actualizando matriz de riesgo:', error);
      throw error;
    }
  }
  
  // Convertir matriz inicial a final
  static async convertirAFinal(id, datosMatriz) {
    try {
      const response = await fetch(this.getApiURL(`/${id}/convertir-final`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          datosMatriz
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error convirtiendo matriz a final');
      }
      
      return data;
    } catch (error) {
      console.error('Error convirtiendo matriz a final:', error);
      throw error;
    }
  }
  
  // Eliminar matriz de riesgo
  static async eliminarMatrizRiesgo(id) {
    try {
      const response = await fetch(this.getApiURL(`/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error eliminando matriz de riesgo');
      }
      
      return data;
    } catch (error) {
      console.error('Error eliminando matriz de riesgo:', error);
      throw error;
    }
  }
  
  // Obtener historial de una matriz
  static async obtenerHistorialMatriz(id) {
    try {
      const response = await fetch(this.getApiURL(`/${id}/historial`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo historial');
      }
      
      return data;
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      throw error;
    }
  }
  
  // Guardar matriz de riesgo automáticamente
  static async guardarMatrizAutomatica(datosMatriz, nombreEmpresa, titulo) {
    try {
      console.log('💾 Guardando matriz de riesgo automáticamente...');
      
      const resultado = await this.crearMatrizRiesgo(datosMatriz, nombreEmpresa, titulo);
      
      console.log('✅ Matriz guardada exitosamente:', resultado.data.id);
      
      return resultado;
    } catch (error) {
      console.error('❌ Error guardando matriz automáticamente:', error);
      throw error;
    }
  }
  
  // Cargar matriz existente
  static async cargarMatrizExistente(id) {
    try {
      console.log('📂 Cargando matriz de riesgo existente...');
      
      const resultado = await this.obtenerMatrizRiesgo(id);
      
      console.log('✅ Matriz cargada exitosamente:', resultado.data.titulo);
      
      return resultado.data;
    } catch (error) {
      console.error('❌ Error cargando matriz existente:', error);
      throw error;
    }
  }
}
