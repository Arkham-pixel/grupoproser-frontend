import React, { useState, useEffect } from 'react';
import historialService from '../../services/historialService';
import { formatearFechaHoraUI } from '../../utils/fechaUtils';

const CasosOrganizados = () => {
  const [casos, setCasos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [formulariosCaso, setFormulariosCaso] = useState([]);

  useEffect(() => {
    cargarCasosOrganizados();
  }, []);

  const cargarCasosOrganizados = async () => {
    try {
      setCargando(true);
      const response = await historialService.obtenerCasosOrganizados();
      setCasos(response.casos || []);
    } catch (error) {
      console.error('Error cargando casos:', error);
      setError('Error al cargar los casos organizados');
    } finally {
      setCargando(false);
    }
  };

  const cargarFormulariosCaso = async (casoId) => {
    try {
      const response = await historialService.obtenerFormulariosPorCaso(casoId);
      setFormulariosCaso(response.formularios || []);
      setCasoSeleccionado(casoId);
    } catch (error) {
      console.error('Error cargando formularios del caso:', error);
      setError('Error al cargar los formularios del caso');
    }
  };


  const obtenerColorTipo = (tipo) => {
    const colores = {
      'ajuste_inicial': 'bg-blue-100 text-blue-800',
      'ajuste_preeliminar': 'bg-green-100 text-green-800',
      'ajuste_actualizacion': 'bg-yellow-100 text-yellow-800',
      'ajuste_informeFinal': 'bg-purple-100 text-purple-800'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center">
          <span className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold mr-4">
            📁
          </span>
          Casos Organizados por Carpeta
        </h2>
        <p className="text-gray-600 mt-2">
          Visualiza todos los casos organizados por carpeta con sus formularios correspondientes
        </p>
      </div>

      {/* Lista de casos */}
      <div className="grid gap-6">
        {casos.map((caso, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* Encabezado del caso */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    📁 {caso._id.carpetaCaso}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Caso ID: {caso._id.casoId} | Número: {caso._id.numeroCaso}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {caso.totalFormularios} formularios
                  </span>
                </div>
              </div>
            </div>

            {/* Información del caso */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Tipos de formularios:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {caso.tipos.map((tipo, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${obtenerColorTipo(tipo)}`}
                      >
                        {tipo.replace('ajuste_', '').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Usuarios:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {caso.usuarios.map((usuario, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        👤 {usuario}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Fechas:</span>
                  <div className="text-sm text-gray-900 mt-1">
                    <div>📅 Creado: {formatearFechaHoraUI(caso.fechaCreacion)}</div>
                    <div>🔄 Modificado: {formatearFechaHoraUI(caso.fechaModificacion)}</div>
                  </div>
                </div>
              </div>

              {/* Botón para ver formularios */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => cargarFormulariosCaso(caso._id.casoId)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span>👁️</span>
                  <span>Ver Formularios</span>
                </button>
                
                {casoSeleccionado === caso._id.casoId && (
                  <span className="text-sm text-blue-600 font-medium">
                    ✓ Formularios cargados
                  </span>
                )}
              </div>
            </div>

            {/* Formularios del caso (si están cargados) */}
            {casoSeleccionado === caso._id.casoId && formulariosCaso.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  📋 Formularios del Caso
                </h4>
                <div className="space-y-3">
                  {formulariosCaso.map((formulario, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${obtenerColorTipo(formulario.tipo)}`}>
                          {formulario.tipo.replace('ajuste_', '').toUpperCase()}
                        </span>
                                                       <div>
                                 <h5 className="font-medium text-gray-900">{formulario.titulo}</h5>
                                 <p className="text-sm text-gray-600">
                                   Por: {formulario.nombreUsuario || formulario.usuario || 'Usuario'} | {formatearFechaHoraUI(formulario.fechaCreacion)}
                                 </p>
                               </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          formulario.estado === 'completado' ? 'bg-green-100 text-green-800' :
                          formulario.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {formulario.estado.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mensaje si no hay casos */}
      {casos.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay casos registrados</h3>
          <p className="text-gray-500">
            Los casos aparecerán aquí una vez que se creen formularios de ajuste.
          </p>
        </div>
      )}
    </div>
  );
};

export default CasosOrganizados;
