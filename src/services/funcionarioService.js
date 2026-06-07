import { BASE_URL } from '../config/apiConfig.js';

const API_BASE_URL = `${BASE_URL}/api`;

class FuncionarioService {
  // Obtener token de autenticación
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Headers con autenticación
  getHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /** Acepta array plano o envoltorios típicos { data, funcionarios } */
  normalizarListaFuncionarios(body) {
    if (!body) return [];
    if (Array.isArray(body)) return body;
    if (Array.isArray(body.funcionarios)) return body.funcionarios;
    if (Array.isArray(body.data)) return body.data;
    return [];
  }

  /** Une listas por _id; prioriza firma y datos del documento que venga de la API */
  fusionarFuncionarios(apiList, localList) {
    const idDe = (f) =>
      f?._id != null ? String(f._id) : f?.id != null ? String(f.id) : '';
    const map = new Map();
    for (const f of localList || []) {
      const id = idDe(f);
      if (id) map.set(id, { ...f });
    }
    for (const f of apiList || []) {
      const id = idDe(f);
      if (!id) continue;
      const prev = map.get(id);
      if (prev) {
        map.set(id, {
          ...prev,
          ...f,
          firma: f.firma || prev.firma || null
        });
      } else {
        map.set(id, { ...f });
      }
    }
    return Array.from(map.values());
  }

  /** Un funcionario con firma (GET /funcionarios/:id) */
  async obtenerFuncionarioPorId(id) {
    if (!id) return null;
    try {
      const response = await fetch(`${API_BASE_URL}/funcionarios/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!response.ok) return null;
      const body = await response.json();
      if (body && body._id) return body;
      return null;
    } catch (e) {
      console.warn('obtenerFuncionarioPorId:', e?.message || e);
      return null;
    }
  }

  // Obtener todos los funcionarios (API + respaldo localStorage por si la API falla o devuelve vacío)
  async obtenerFuncionarios() {
    const localRaw = this.cargarDesdeLocalStorage();
    const desdeLocal = this.normalizarListaFuncionarios(localRaw);

    try {
      const response = await fetch(`${API_BASE_URL}/funcionarios`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const body = await response.json();
      const desdeApi = this.normalizarListaFuncionarios(body);
      const merged = this.fusionarFuncionarios(desdeApi, desdeLocal);
return merged;
    } catch (error) {
      console.error('❌ Error al obtener funcionarios:', error);
      if (desdeLocal.length > 0) {
return desdeLocal;
      }
      const funcionariosLocal = localStorage.getItem('proser_funcionarios');
      if (funcionariosLocal) {
        try {
          const parsed = JSON.parse(funcionariosLocal);
          return this.normalizarListaFuncionarios(parsed);
        } catch {
          return [];
        }
      }
      return [];
    }
  }

  // Crear nuevo funcionario
  async crearFuncionario(funcionario) {
    try {
      const response = await fetch(`${API_BASE_URL}/funcionarios`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(funcionario)
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const nuevoFuncionario = await response.json();
// También guardar en localStorage como backup
      this.sincronizarConLocalStorage();
      
      return nuevoFuncionario.funcionario;
    } catch (error) {
      console.error('❌ Error al crear funcionario:', error);
      throw error;
    }
  }

  // Actualizar funcionario
  async actualizarFuncionario(id, funcionario) {
    try {
      const response = await fetch(`${API_BASE_URL}/funcionarios/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(funcionario)
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const funcionarioActualizado = await response.json();
// También actualizar en localStorage
      this.sincronizarConLocalStorage();
      
      return funcionarioActualizado.funcionario;
    } catch (error) {
      console.error('❌ Error al actualizar funcionario:', error);
      throw error;
    }
  }

  // Eliminar funcionario
  async eliminarFuncionario(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/funcionarios/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

// También eliminar de localStorage
      this.sincronizarConLocalStorage();
      
      return true;
    } catch (error) {
      console.error('❌ Error al eliminar funcionario:', error);
      throw error;
    }
  }

  // Actualizar firma de funcionario
  async actualizarFirmaFuncionario(id, firma) {
    try {
      const response = await fetch(`${API_BASE_URL}/funcionarios/${id}/firma`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ firma })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const funcionarioActualizado = await response.json();
// También actualizar en localStorage
      this.sincronizarConLocalStorage();
      
      return funcionarioActualizado.funcionario;
    } catch (error) {
      console.error('❌ Error al actualizar firma:', error);
      throw error;
    }
  }

  // Sincronizar con localStorage (sin firmas para evitar quota exceeded)
  async sincronizarConLocalStorage() {
    try {
      const funcionarios = await this.obtenerFuncionarios();
      // Crear una versión sin firmas para localStorage (las firmas se guardan solo en BD)
      const funcionariosSinFirmas = funcionarios.map(f => ({
        _id: f._id,
        nombre: f.nombre,
        cargo: f.cargo,
        telefono: f.telefono,
        email: f.email,
        activo: f.activo,
        fechaCreacion: f.fechaCreacion,
        fechaActualizacion: f.fechaActualizacion
        // Excluir firma para ahorrar espacio
      }));
      
      localStorage.setItem('proser_funcionarios', JSON.stringify(funcionariosSinFirmas));
} catch (error) {
      console.error('❌ Error al sincronizar con localStorage:', error);
    }
  }

  // Cargar funcionarios desde localStorage (fallback)
  cargarDesdeLocalStorage() {
    try {
      const funcionariosLocal = localStorage.getItem('proser_funcionarios');
      if (funcionariosLocal) {
return JSON.parse(funcionariosLocal);
      }
      return [];
    } catch (error) {
      console.error('❌ Error al cargar desde localStorage:', error);
      return [];
    }
  }

  // Guardar en localStorage (backup sin firmas)
  guardarEnLocalStorage(funcionarios) {
    // Verificar espacio disponible antes de intentar guardar
    if (!this.verificarEspacioLocalStorage()) {
      console.warn('⚠️ localStorage lleno, limpiando firmas...');
      this.limpiarFirmasLocalStorage();
    }

    try {
      // Crear una versión sin firmas para localStorage
      const funcionariosSinFirmas = funcionarios.map(f => ({
        _id: f._id,
        nombre: f.nombre,
        cargo: f.cargo,
        telefono: f.telefono,
        email: f.email,
        activo: f.activo,
        fechaCreacion: f.fechaCreacion,
        fechaActualizacion: f.fechaActualizacion
        // Excluir firma para ahorrar espacio
      }));
      
      localStorage.setItem('proser_funcionarios', JSON.stringify(funcionariosSinFirmas));
} catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage aún lleno después de limpiar, guardando solo datos recientes...');
        // Intentar guardar solo los datos más recientes
        try {
          const datosRecientes = funcionariosSinFirmas.slice(-3); // Solo los últimos 3
          localStorage.setItem('proser_funcionarios', JSON.stringify(datosRecientes));
} catch (retryError) {
          console.error('❌ Error persistente en localStorage, saltando backup local');
          // No hacer nada más, los datos están seguros en la BD
        }
      } else {
        console.error('❌ Error al guardar en localStorage:', error);
      }
    }
  }

  // Limpiar localStorage para liberar espacio
  limpiarLocalStorage() {
    try {
      // Limpiar solo las claves relacionadas con funcionarios
      const claves = ['proser_funcionarios', 'proser_cargos', 'proser_firma_isharly'];
      claves.forEach(clave => {
        if (localStorage.getItem(clave)) {
          localStorage.removeItem(clave);
}
      });
    } catch (error) {
      console.error('❌ Error al limpiar localStorage:', error);
    }
  }

  // Limpiar firmas del localStorage (método específico para firmas)
  limpiarFirmasLocalStorage() {
    try {
      // Limpiar firmas específicamente
      const clavesFirmas = ['proser_firma_isharly'];
      clavesFirmas.forEach(clave => {
        if (localStorage.getItem(clave)) {
          localStorage.removeItem(clave);
}
      });
      
      // También limpiar funcionarios con firmas del localStorage
      const funcionariosLocal = localStorage.getItem('proser_funcionarios');
      if (funcionariosLocal) {
        const funcionarios = JSON.parse(funcionariosLocal);
        const funcionariosSinFirmas = funcionarios.map(f => ({
          ...f,
          firma: null // Remover firmas
        }));
        localStorage.setItem('proser_funcionarios', JSON.stringify(funcionariosSinFirmas));
}
    } catch (error) {
      console.error('❌ Error al limpiar firmas del localStorage:', error);
    }
  }

  // Verificar espacio disponible en localStorage
  verificarEspacioLocalStorage() {
    try {
      const testKey = 'test_quota';
      const testData = 'x'.repeat(1024); // 1KB de datos de prueba
      
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return true; // Hay espacio disponible
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage está lleno');
        return false;
      }
      return true;
    }
  }
}

export default new FuncionarioService();
