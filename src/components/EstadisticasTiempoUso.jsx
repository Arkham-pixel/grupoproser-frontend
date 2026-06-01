import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';
import { FaClock, FaUser, FaChartLine, FaSync, FaDownload } from 'react-icons/fa';

const EstadisticasTiempoUso = () => {
  const [estadisticas, setEstadisticas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detalleUsuario, setDetalleUsuario] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [tiemposReales, setTiemposReales] = useState({});

  useEffect(() => {
    cargarEstadisticas();
  }, []);
  
  // Efecto separado para actualización en tiempo real
  useEffect(() => {
    if (estadisticas.length === 0) return;
    
    // Actualizar tiempos en tiempo real cada 30 segundos
    const interval = setInterval(() => {
      actualizarTiemposReales();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [estadisticas]);


  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/secur-auth/estadisticas-tiempo-uso`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const nuevasEstadisticas = response.data.estadisticas || [];
      setEstadisticas(nuevasEstadisticas);
      
      // Inicializar tiempos reales para sesiones activas
      const tiemposIniciales = {};
      nuevasEstadisticas.forEach(stat => {
        if (stat.tieneSesionActiva && stat.tiempoSesionActiva) {
          tiemposIniciales[stat.usuarioId] = stat.tiempoSesionActiva;
        }
      });
      setTiemposReales(tiemposIniciales);
      
      // Iniciar actualización en tiempo real
      if (Object.keys(tiemposIniciales).length > 0) {
        const interval = setInterval(() => {
          actualizarTiemposReales();
        }, 30000);
        
        // Limpiar intervalo anterior si existe
        return () => clearInterval(interval);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setError(error.response?.data?.message || 'Error al cargar estadísticas de tiempo de uso');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para actualizar tiempos reales de sesiones activas
  const actualizarTiemposReales = () => {
    setEstadisticas(prevStats => {
      const nuevosTiempos = {};
      
      const statsActualizados = prevStats.map(stat => {
        if (stat.tieneSesionActiva && stat.tiempoSesionActiva) {
          // Calcular tiempo actualizado (agregar 0.5 minutos = 30 segundos)
          const minutosBase = stat.tiempoSesionActiva.totalMinutos || 0;
          const minutosActualizados = minutosBase + 0.5;
          const horas = Math.floor(minutosActualizados / 60);
          const minutos = Math.floor(minutosActualizados % 60);
          const segundos = Math.floor((minutosActualizados % 1) * 60);
          
          const tiempoActualizado = {
            ...stat.tiempoSesionActiva,
            horas,
            minutos,
            segundos,
            totalMinutos: minutosActualizados,
            formato: `${horas}h ${minutos}m ${segundos}s`
          };
          
          // Actualizar tiempo total incluyendo sesión activa
          const tiempoTotalConActiva = stat.tiempoTotalCerradas.totalMinutos + minutosActualizados;
          const horasTotal = Math.floor(tiempoTotalConActiva / 60);
          const minutosTotal = tiempoTotalConActiva % 60;
          const segundosTotal = Math.floor((tiempoTotalConActiva % 1) * 60);
          
          // Guardar en tiemposReales para la visualización
          nuevosTiempos[stat.usuarioId] = tiempoActualizado;
          
          return {
            ...stat,
            tiempoSesionActiva: tiempoActualizado,
            tiempoTotal: {
              ...stat.tiempoTotal,
              horas: horasTotal,
              minutos: minutosTotal,
              segundos: segundosTotal,
              totalMinutos: tiempoTotalConActiva,
              formato: `${horasTotal}h ${minutosTotal}m ${segundosTotal}s`
            }
          };
        }
        return stat;
      });
      
      // Actualizar tiemposReales con los nuevos valores
      setTiemposReales(prevTiempos => {
        return { ...prevTiempos, ...nuevosTiempos };
      });
      
      return statsActualizados;
    });
  };

  const cargarDetalleUsuario = async (usuarioId) => {
    try {
      setLoadingDetalle(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/secur-auth/tiempo-uso/${usuarioId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setDetalleUsuario(response.data);
      setSelectedUser(usuarioId);
    } catch (error) {
      console.error('Error cargando detalle:', error);
      alert('Error al cargar el detalle del usuario');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportarCSV = () => {
    const headers = ['Usuario', 'Login', 'Email', 'Rol', 'Total Sesiones', 'Tiempo Total', 'Última Sesión', 'Primera Sesión'];
    const rows = estadisticas.map(stat => [
      stat.nombre,
      stat.login,
      stat.email,
      stat.rol,
      stat.totalSesiones,
      stat.tiempoTotal.formato,
      formatFecha(stat.ultimaSesion),
      formatFecha(stat.primeraSesion)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `estadisticas_tiempo_uso_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={cargarEstadisticas}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
            <FaClock className="inline-block mr-2 text-blue-600" />
            Estadísticas de Tiempo de Uso
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Total de usuarios: {estadisticas.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargarEstadisticas}
            className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs sm:text-sm flex items-center gap-2"
          >
            <FaSync /> Actualizar
          </button>
          <button
            onClick={exportarCSV}
            className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs sm:text-sm flex items-center gap-2"
          >
            <FaDownload /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla de estadísticas responsive */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sesiones
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiempo Total
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Sesión
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {estadisticas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No hay estadísticas disponibles aún. Las estadísticas se generan cuando los usuarios cierran sesión.
                  </td>
                </tr>
              ) : (
                estadisticas.map((stat) => (
                  <tr key={stat.usuarioId} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">{stat.nombre}</div>
                      <div className="text-xs sm:text-sm text-gray-500">Login: {stat.login}</div>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {stat.email}
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        stat.rol === 'admin' ? 'bg-red-100 text-red-800' :
                        stat.rol === 'soporte' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {stat.rol}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {stat.totalSesiones}
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-semibold text-blue-600">
                        {stat.tieneSesionActiva && tiemposReales[stat.usuarioId] 
                          ? tiemposReales[stat.usuarioId].formato
                          : stat.tiempoTotal.formato}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({stat.tieneSesionActiva && tiemposReales[stat.usuarioId]
                          ? Math.floor(tiemposReales[stat.usuarioId].totalMinutos)
                          : stat.tiempoTotal.totalMinutos} min)
                      </div>
                      {stat.tieneSesionActiva && (
                        <div className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          En línea
                        </div>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {formatFecha(stat.ultimaSesion)}
                    </td>
                    <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                      <button
                        onClick={() => cargarDetalleUsuario(stat.usuarioId)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto flex items-center gap-1"
                      >
                        <FaChartLine /> Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalle de usuario */}
      {selectedUser && detalleUsuario && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 sm:top-20 mx-auto p-3 sm:p-5 border w-11/12 sm:w-11/12 lg:w-4/5 xl:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl sm:text-2xl font-bold z-10"
              onClick={() => {
                setSelectedUser(null);
                setDetalleUsuario(null);
              }}
              title="Cerrar"
            >
              ×
            </button>
            
            <div className="mt-3">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
                <FaUser className="inline-block mr-2" />
                Detalle de Tiempo de Uso
              </h3>
              
              {loadingDetalle ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Resumen */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600">Total Sesiones</div>
                      <div className="text-2xl font-bold text-blue-600">{detalleUsuario.totalSesiones}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600">Sesiones Cerradas</div>
                      <div className="text-2xl font-bold text-green-600">{detalleUsuario.sesionesCerradas}</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600">Tiempo Total</div>
                      <div className="text-xl font-bold text-purple-600">{detalleUsuario.tiempoTotal.formato}</div>
                    </div>
                    {detalleUsuario.sesionActiva && (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="text-xs text-gray-600">Sesión Activa</div>
                        <div className="text-xl font-bold text-yellow-600">{detalleUsuario.sesionActiva.tiempoTranscurrido.formato}</div>
                      </div>
                    )}
                  </div>

                  {/* Lista de sesiones */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Historial de Sesiones</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {detalleUsuario.sesiones.map((sesion) => (
                            <tr key={sesion.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-xs text-gray-900">{formatFecha(sesion.inicio)}</td>
                              <td className="px-4 py-2 text-xs text-gray-900">{sesion.fin ? formatFecha(sesion.fin) : '-'}</td>
                              <td className="px-4 py-2 text-xs text-gray-900">{sesion.duracion || '-'}</td>
                              <td className="px-4 py-2 text-xs">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  sesion.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {sesion.activa ? 'Activa' : 'Cerrada'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadisticasTiempoUso;

