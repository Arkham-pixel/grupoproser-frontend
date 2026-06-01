import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config/apiConfig.js';

export default function AlertasComplex() {
  const [alertas, setAlertas] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState('TODAS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [ajustadorSeleccionado, setAjustadorSeleccionado] = useState(null);

  // Cargar resumen de alertas
  const cargarResumen = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/alertas/resumen`);
      const data = await response.json();
      
      if (data.success) {
        setResumen(data.data);
      } else {
        setError('Error cargando resumen de alertas');
      }
    } catch (error) {
      console.error('Error cargando resumen:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Cargar todas las alertas
  const cargarAlertas = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/alertas/todos`);
      const data = await response.json();
      
      if (data.success) {
        setAlertas(data.data);
      } else {
        setError('Error cargando alertas');
      }
    } catch (error) {
      console.error('Error cargando alertas:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Enviar alertas por email a un ajustador
  const enviarAlertasEmail = async (codigoResponsable) => {
    try {
      const response = await fetch(`${BASE_URL}/api/alertas/enviar/ajustador/${codigoResponsable}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Alertas enviadas exitosamente a ${codigoResponsable}`);
      } else {
        alert(`❌ Error enviando alertas: ${data.message}`);
      }
    } catch (error) {
      console.error('Error enviando alertas:', error);
      alert('Error de conexión al enviar alertas');
    }
  };

  // Enviar alertas a todos los ajustadores
  const enviarAlertasTodos = async () => {
    if (!confirm('¿Estás seguro de enviar alertas a TODOS los ajustadores?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/alertas/enviar/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Alertas enviadas exitosamente a ${data.data.totalEnviados} ajustadores`);
        cargarResumen(); // Recargar datos
      } else {
        alert(`❌ Error enviando alertas: ${data.message}`);
      }
    } catch (error) {
      console.error('Error enviando alertas:', error);
      alert('Error de conexión al enviar alertas');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar alertas por prioridad y tipo
  const alertasFiltradas = () => {
    if (!alertas) return [];
    
    let filtradas = alertas.ajustadores.flatMap(ajustador => 
      ajustador.casos.map(caso => ({
        ...caso,
        ajustador: ajustador.ajustador
      }))
    );

    // Filtrar por prioridad
    if (filtroPrioridad !== 'TODAS') {
      filtradas = filtradas.filter(caso => 
        caso.alertas.some(alerta => alerta.prioridad === filtroPrioridad)
      );
    }

    // Filtrar por tipo
    if (filtroTipo !== 'TODOS') {
      filtradas = filtradas.filter(caso => 
        caso.alertas.some(alerta => alerta.tipo === filtroTipo)
      );
    }

    return filtradas;
  };

  // Obtener tipos únicos de alertas
  const obtenerTiposUnicos = () => {
    if (!alertas) return [];
    
    const tipos = new Set();
    alertas.ajustadores.forEach(ajustador => {
      ajustador.casos.forEach(caso => {
        caso.alertas.forEach(alerta => {
          tipos.add(alerta.tipo);
        });
      });
    });
    
    return Array.from(tipos).sort();
  };

  // Obtener prioridades únicas
  const obtenerPrioridadesUnicas = () => {
    if (!alertas) return [];
    
    const prioridades = new Set();
    alertas.ajustadores.forEach(ajustador => {
      ajustador.casos.forEach(caso => {
        caso.alertas.forEach(alerta => {
          prioridades.add(alerta.prioridad);
        });
      });
    });
    
    return Array.from(prioridades).sort();
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarResumen();
    cargarAlertas();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-gray-600 text-xs sm:text-sm">Cargando alertas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl sm:text-6xl mb-3 sm:mb-4">❌</div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              cargarResumen();
              cargarAlertas();
            }}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-blue-700 text-xs sm:text-sm font-medium transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const alertasFiltradasData = alertasFiltradas();
  const tiposUnicos = obtenerTiposUnicos();
  const prioridadesUnicas = obtenerPrioridadesUnicas();

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">🚨 Sistema de Alertas Complex</h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">Monitoreo y notificaciones para ajustadores</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={enviarAlertasTodos}
                disabled={loading}
                className="bg-green-600 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2 text-xs sm:text-sm font-medium"
              >
                <span>📧</span>
                <span>Enviar a Todos</span>
              </button>
              <button
                onClick={() => {
                  cargarResumen();
                  cargarAlertas();
                }}
                disabled={loading}
                className="bg-blue-600 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2 text-xs sm:text-sm font-medium"
              >
                <span>🔄</span>
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard de Resumen */}
        {resumen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-lg sm:text-xl lg:text-2xl">👥</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Ajustadores</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{resumen.totalAjustadores}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full bg-orange-100 text-orange-600">
                  <span className="text-lg sm:text-xl lg:text-2xl">⚠️</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Con Alertas</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{resumen.ajustadoresConAlertas}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full bg-red-100 text-red-600">
                  <span className="text-lg sm:text-xl lg:text-2xl">🚨</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Casos Críticos</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{resumen.casosCriticos}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full bg-purple-100 text-purple-600">
                  <span className="text-lg sm:text-xl lg:text-2xl">📊</span>
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Alertas</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{resumen.totalAlertas}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">🔍 Filtros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Prioridad
              </label>
              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              >
                <option value="TODAS">Todas las Prioridades</option>
                {prioridadesUnicas.map(prioridad => (
                  <option key={prioridad} value={prioridad}>
                    {prioridad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Tipo de Alerta
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              >
                <option value="TODOS">Todos los Tipos</option>
                {tiposUnicos.map(tipo => (
                  <option key={tipo} value={tipo}>
                    {tipo.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFiltroPrioridad('TODAS');
                  setFiltroTipo('TODOS');
                }}
                className="w-full bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-gray-600 text-xs sm:text-sm font-medium transition-colors"
              >
                🗑️ Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Alertas */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              🚨 Alertas ({alertasFiltradasData.length})
            </h2>
            <div className="text-xs sm:text-sm text-gray-500">
              Mostrando alertas filtradas
            </div>
          </div>

          {alertasFiltradasData.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">✅</div>
              <h3 className="text-lg sm:text-xl font-medium text-gray-800 mb-2">No hay alertas</h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                {filtroPrioridad !== 'TODAS' || filtroTipo !== 'TODOS' 
                  ? 'No hay alertas con los filtros aplicados'
                  : 'Todos los casos están al día'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {alertasFiltradasData.map((caso, index) => (
                <div key={`${caso.casoId}-${index}`} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                          Caso {caso.numeroAjuste}
                        </h3>
                        <span className="text-xs sm:text-sm text-gray-500">
                          Siniestro: {caso.numeroSiniestro || 'N/A'}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {caso.ajustador}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-3 text-xs sm:text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Aseguradora:</span>
                          <span className="ml-2 text-gray-800">{caso.aseguradora || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Asegurado:</span>
                          <span className="ml-2 text-gray-800">{caso.asegurado || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Estado:</span>
                          <span className="ml-2 text-gray-800">{caso.estado || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Alertas del caso */}
                      <div className="space-y-2">
                        {caso.alertas.map((alerta, alertaIndex) => (
                          <div
                            key={alertaIndex}
                            className={`p-2 sm:p-3 rounded-lg border-l-4 ${
                              alerta.prioridad === 'ALTA' 
                                ? 'border-red-500 bg-red-50' 
                                : alerta.prioridad === 'MEDIA'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-yellow-500 bg-yellow-50'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex-1">
                                <p className={`font-medium text-xs sm:text-sm ${
                                  alerta.prioridad === 'ALTA' ? 'text-red-800' :
                                  alerta.prioridad === 'MEDIA' ? 'text-orange-800' :
                                  'text-yellow-800'
                                }`}>
                                  {alerta.mensaje}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                  Acción requerida: {alerta.accion}
                                </p>
                                {alerta.intensidadReducida && (
                                  <p className="text-xs sm:text-sm text-green-600 mt-1 flex items-center gap-1">
                                    <span>⬇️</span>
                                    <span>Intensidad reducida por documentos subidos</span>
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  alerta.prioridad === 'ALTA' 
                                    ? 'bg-red-100 text-red-800' 
                                    : alerta.prioridad === 'MEDIA'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {alerta.prioridad}
                                </span>
                                {alerta.intensidadReducida && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    ⬇️ Reducida
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Información de intensidad adicional - Documentos subidos */}
                      {caso.intensidadAdicional && caso.intensidadAdicional.totalDocumentosSubidos > 0 && (
                        <div className="mt-3 p-2 sm:p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="text-green-600">✅</span>
                            <div className="flex-1">
                              <p className="text-xs sm:text-sm font-medium text-green-800 mb-1">
                                Intensidad Adicional - Documentos Subidos:
                              </p>
                              <p className="text-xs sm:text-sm text-green-700">
                                {caso.intensidadAdicional.mensaje}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  {caso.intensidadAdicional.totalDocumentosSubidos} de {caso.documentosInfo?.totalRequeridos || 0} documentos
                                </span>
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-200 text-green-900">
                                  {caso.intensidadAdicional.porcentajeObligatoriosSubidos}% obligatorios subidos
                                </span>
                                {caso.intensidadAdicional.reduceIntensidad && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    ⬇️ Intensidad reducida
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Información de inactividad */}
                      {caso.inactividad && (
                        <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-gray-500">⏰</span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              Última actividad: {caso.inactividad.actividad}
                              {caso.inactividad.dias !== null && (
                                <span className="ml-2 font-medium">
                                  (hace {caso.inactividad.dias} días)
                                </span>
                              )}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              caso.inactividad.estado === 'CRÍTICO' ? 'bg-red-100 text-red-800' :
                              caso.inactividad.estado === 'ALTO' ? 'bg-orange-100 text-orange-800' :
                              caso.inactividad.estado === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {caso.inactividad.estado}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 lg:space-y-2">
                      <button
                        onClick={() => enviarAlertasEmail(caso.ajustador)}
                        className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm hover:bg-blue-700 font-medium transition-colors"
                      >
                        📧 Enviar
                      </button>
                      <button
                        onClick={() => setAjustadorSeleccionado(caso.ajustador)}
                        className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm hover:bg-gray-700 font-medium transition-colors"
                      >
                        👁️ Ver Caso
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Ajustadores */}
        {resumen && resumen.topAjustadores && resumen.topAjustadores.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 mt-4 sm:mt-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">🏆 Top Ajustadores con Alertas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {resumen.topAjustadores.map((ajustador, index) => (
                <div key={ajustador.codigo} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-base sm:text-lg font-bold ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        index === 2 ? 'text-orange-600' :
                        'text-gray-500'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-medium text-gray-800 text-xs sm:text-sm">{ajustador.codigo}</span>
                    </div>
                    <button
                      onClick={() => enviarAlertasEmail(ajustador.codigo)}
                      className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      📧
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Casos:</span>
                      <span className="font-medium">{ajustador.totalCasos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Con Alertas:</span>
                      <span className="font-medium text-orange-600">{ajustador.casosConAlertas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Docs Obligatorios:</span>
                      <span className="font-medium text-red-600">{ajustador.documentosObligatorios}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Casos Críticos:</span>
                      <span className="font-medium text-red-600">{ajustador.casosCriticos}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

