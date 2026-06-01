import { useState, useEffect, useCallback } from 'react';
import historialService from '../services/historialService';

const obtenerIdFormulario = (formulario) => {
  const posiblesIds = [
    formulario?.id,
    formulario?._id,
    formulario?.formularioId,
    formulario?.formId,
    formulario?.datos?.id
  ];

  for (const posibleId of posiblesIds) {
    if (!posibleId) continue;

    if (typeof posibleId === 'object' && posibleId !== null) {
      if (typeof posibleId.toString === 'function') {
        const idComoString = posibleId.toString();
        if (idComoString && idComoString !== '[object Object]') {
          return idComoString;
        }
      }
      continue;
    }

    return posibleId;
  }

  return undefined;
};

const normalizarFormulario = (formulario) => {
  if (!formulario || typeof formulario !== 'object') return formulario;

  const id = obtenerIdFormulario(formulario);

  return {
    ...formulario,
    id,
    _id: formulario._id ?? id,
    nombreUsuario: formulario.nombreUsuario || formulario.usuario || 'Usuario',
    estado: formulario.estado || 'completado',
    archivo: formulario.archivo || formulario?.datos?.archivo || null
  };
};

export default function useHistorial() {
  const [formularios, setFormularios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    usuario: '',
    fechaDesde: '',
    fechaHasta: '',
    estado: ''
  });

  // Cargar historial
  const cargarHistorial = useCallback(async (filtrosAplicados = filtros) => {
    try {
      setCargando(true);
      setError(null);
      
      // Verificar si hay token
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No hay token de autenticación');
        setError('No hay token de autenticación. Por favor, inicia sesión.');
        setFormularios([]);
        return;
      }
      
      console.log('🔑 Token encontrado, cargando historial...');
      const datos = await historialService.obtenerHistorial(filtrosAplicados);
      setFormularios(Array.isArray(datos) ? datos.map(normalizarFormulario) : []);
      console.log('✅ Historial cargado:', datos);
    } catch (err) {
      console.error('❌ Error cargando historial:', err);
      setError(err.message);
      setFormularios([]);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  // Cargar historial al montar el componente
  useEffect(() => {
    cargarHistorial();
  }, []);

  // Aplicar filtros
  const aplicarFiltros = useCallback((nuevosFiltros) => {
    setFiltros(prev => ({ ...prev, ...nuevosFiltros }));
  }, []);

  // Buscar formularios
  const buscarFormularios = useCallback(async (texto) => {
    try {
      setCargando(true);
      setError(null);
      
      const resultados = await historialService.buscarFormularios(texto);
      setFormularios(Array.isArray(resultados) ? resultados.map(normalizarFormulario) : []);
    } catch (err) {
      setError(err.message);
      console.error('Error buscando formularios:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  // Guardar formulario
  const guardarFormulario = useCallback(async (formulario) => {
    try {
      setError(null);
      
      const nuevoFormulario = await historialService.guardarFormulario(formulario);
      const formularioNormalizado = normalizarFormulario(nuevoFormulario);

      setFormularios(prev => {
        const prevNormalizados = Array.isArray(prev) ? prev : [];
        const filtrados = prevNormalizados.filter(
          f => f.id !== formularioNormalizado.id && f._id !== formularioNormalizado.id
        );
        return [formularioNormalizado, ...filtrados];
      });
      
      return formularioNormalizado;
    } catch (err) {
      setError(err.message);
      console.error('Error guardando formulario:', err);
      throw err;
    }
  }, []);

  // Actualizar formulario
  const actualizarFormulario = useCallback(async (id, datos) => {
    try {
      setError(null);
      
      const formularioActualizado = await historialService.actualizarFormulario(id, datos);
      const formularioNormalizado = normalizarFormulario(formularioActualizado);

      setFormularios(prev => {
        const prevNormalizados = Array.isArray(prev) ? prev : [];
        return prevNormalizados.map((f) => (
          (f.id === formularioNormalizado.id || f._id === formularioNormalizado.id)
            ? formularioNormalizado
            : f
        ));
      });
      
      return formularioNormalizado;
    } catch (err) {
      setError(err.message);
      console.error('Error actualizando formulario:', err);
      throw err;
    }
  }, []);

  // Eliminar formulario
  const eliminarFormulario = useCallback(async (id) => {
    try {
      setError(null);
      
      await historialService.eliminarFormulario(id);
      setFormularios(prev => {
        const prevNormalizados = Array.isArray(prev) ? prev : [];
        return prevNormalizados.filter((f) => f.id !== id && f._id !== id);
      });
      
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error eliminando formulario:', err);
      throw err;
    }
  }, []);

  // Descargar formulario
  const descargarFormulario = useCallback(async (id) => {
    try {
      setError(null);
      
      await historialService.descargarFormulario(id);
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error descargando formulario:', err);
      throw err;
    }
  }, []);

  // Obtener formulario por ID
  const obtenerFormulario = useCallback(async (id) => {
    try {
      setError(null);
      
      const formulario = await historialService.obtenerFormulario(id);
      return normalizarFormulario(formulario);
    } catch (err) {
      setError(err.message);
      console.error('Error obteniendo formulario:', err);
      throw err;
    }
  }, []);

  // Limpiar error
  const limpiarError = useCallback(() => {
    setError(null);
  }, []);

  // Refrescar historial
  const refrescarHistorial = useCallback(() => {
    cargarHistorial();
  }, [cargando]);

  // Obtener estadísticas
  const [estadisticas, setEstadisticas] = useState({});
  
  const cargarEstadisticas = useCallback(async () => {
    try {
      const stats = await historialService.obtenerEstadisticas();
      setEstadisticas(stats);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }, []);

  useEffect(() => {
    cargarEstadisticas();
  }, [cargando]);

  return {
    // Estado
    formularios,
    cargando,
    error,
    filtros,
    estadisticas,
    
    // Acciones
    cargarHistorial,
    aplicarFiltros,
    buscarFormularios,
    guardarFormulario,
    actualizarFormulario,
    eliminarFormulario,
    descargarFormulario,
    obtenerFormulario,
    limpiarError,
    refrescarHistorial,
    cargarEstadisticas
  };
}
