import React, { useState, useEffect } from 'react';
import { getEstados, crearEstado, eliminarEstado } from '../../services/estadosService';
import { useTheme } from '../../context/ThemeContext';

export default function GestionEstadosComplex() {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const tableHeaderBg = theme === 'dark' ? '#1F1F1F' : '#F9FAFB';
  const tableRowBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const tableRowHover = theme === 'dark' ? '#2A2A2A' : '#F9FAFB';
  
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState({
    codiEstdo: '',
    descEstdo: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(null);

  // Cargar estados al montar el componente
  useEffect(() => {
    cargarEstados();
  }, []);

  const cargarEstados = async () => {
    try {
      setLoading(true);
      setError(null);
      const datos = await getEstados();
// Ordenar por código de estado
      const estadosOrdenados = datos.sort((a, b) => {
        const codA = Number(a.codiEstdo || a.codiEstado) || 0;
        const codB = Number(b.codiEstdo || b.codiEstado) || 0;
        return codA - codB;
      });
      setEstados(estadosOrdenados);
    } catch (err) {
      console.error('Error al cargar estados:', err);
      setError(err.message || 'Error al cargar los estados');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setNuevoEstado(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCrearEstado = async () => {
    // Validar campos
    if (!nuevoEstado.codiEstdo || !nuevoEstado.descEstdo.trim()) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    // Validar que el código sea un número
    const codigoNum = Number(nuevoEstado.codiEstdo);
    if (isNaN(codigoNum) || codigoNum <= 0) {
      alert('El código de estado debe ser un número positivo.');
      return;
    }

    // Verificar si ya existe un estado con ese código
    const existe = estados.some(e => {
      const cod = Number(e.codiEstdo || e.codiEstado) || 0;
      return cod === codigoNum;
    });
    if (existe) {
      alert(`Ya existe un estado con el código ${codigoNum}. Por favor use otro código.`);
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      await crearEstado(codigoNum, nuevoEstado.descEstdo.trim());
      
      // Recargar la lista de estados
      await cargarEstados();
      
      // Limpiar el formulario y cerrarlo
      setNuevoEstado({ codiEstdo: '', descEstdo: '' });
      setMostrarFormulario(false);
      
      alert('✅ Estado creado exitosamente');
    } catch (err) {
      console.error('Error al crear estado:', err);
      alert(`❌ Error al crear estado: ${err.message || 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarEstado = async (id, codiEstdo, descEstdo) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar el estado "${descEstdo}" (Código: ${codiEstdo})?`)) {
      return;
    }

    try {
      setEliminando(id);
      setError(null);
      await eliminarEstado(id);
      
      // Recargar la lista de estados
      await cargarEstados();
      
      alert('✅ Estado eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar estado:', err);
      alert(`❌ Error al eliminar estado: ${err.message || 'Error desconocido'}`);
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="p-6 space-y-6" style={{ minHeight: '100vh', backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h1 
          className="text-3xl font-bold"
          style={{ color: textPrimary }}
        >
          📋 Gestión de Estados COMPLEX
        </h1>
        <button
          type="button"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="px-6 py-3 rounded-lg shadow-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: mostrarFormulario ? '#EF4444' : '#10B981',
            color: '#FFFFFF'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = mostrarFormulario ? '#DC2626' : '#059669';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = mostrarFormulario ? '#EF4444' : '#10B981';
          }}
        >
          {mostrarFormulario ? '✕ Cancelar' : '+ Agregar Estado'}
        </button>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div 
          className="p-4 rounded-lg mb-4"
          style={{
            backgroundColor: theme === 'dark' ? '#7F1D1D' : '#FEE2E2',
            border: `1px solid ${theme === 'dark' ? '#991B1B' : '#FECACA'}`,
            color: theme === 'dark' ? '#FCA5A5' : '#991B1B'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Formulario para agregar nuevo estado */}
      {mostrarFormulario && (
        <div 
          className="p-6 rounded-lg shadow-md mb-6"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h2 
            className="text-xl font-semibold mb-4"
            style={{ color: textPrimary }}
          >
            ➕ Agregar Nuevo Estado
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: textPrimary }}
              >
                Código de Estado *
              </label>
              <input
                type="number"
                value={nuevoEstado.codiEstdo}
                onChange={(e) => handleInputChange('codiEstdo', e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  border: `1px solid ${borderColor}`
                }}
                placeholder="Ej: 1, 2, 3..."
                min="1"
                step="1"
              />
            </div>
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: textPrimary }}
              >
                Descripción del Estado *
              </label>
              <input
                type="text"
                value={nuevoEstado.descEstdo}
                onChange={(e) => handleInputChange('descEstdo', e.target.value)}
                className="w-full rounded-lg px-4 py-2 text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  border: `1px solid ${borderColor}`
                }}
                placeholder="Ej: En Proceso, Finalizado..."
                maxLength="200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setNuevoEstado({ codiEstdo: '', descEstdo: '' });
                setMostrarFormulario(false);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: textSecondary,
                border: `1px solid ${borderColor}`
              }}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCrearEstado}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: guardando ? '#6B7280' : '#10B981',
                color: '#FFFFFF'
              }}
              disabled={guardando}
              onMouseEnter={(e) => {
                if (!guardando) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (!guardando) {
                  e.currentTarget.style.backgroundColor = '#10B981';
                }
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar Estado'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de estados */}
      <div 
        className="rounded-lg shadow-md overflow-hidden"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        {loading ? (
          <div className="p-8 text-center" style={{ color: textSecondary }}>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: textSecondary }}></div>
            <p className="mt-4">Cargando estados...</p>
          </div>
        ) : estados.length === 0 ? (
          <div className="p-8 text-center" style={{ color: textSecondary }}>
            <p>No hay estados registrados. Agregue uno nuevo usando el botón "+ Agregar Estado".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: borderColor }}>
              <thead style={{ backgroundColor: tableHeaderBg }}>
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: textSecondary }}
                  >
                    Código
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: textSecondary }}
                  >
                    Descripción
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
                    style={{ color: textSecondary }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: borderColor }}>
                {estados.map((estado) => (
                  <tr 
                    key={estado._id}
                    style={{ backgroundColor: tableRowBg }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = tableRowHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = tableRowBg;
                    }}
                  >
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                      style={{ color: textPrimary }}
                    >
                      {estado.codiEstdo || estado.codiEstado || '—'}
                    </td>
                    <td 
                      className="px-6 py-4 text-sm"
                      style={{ color: textPrimary }}
                    >
                      {estado.descEstdo || estado.descEstado || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        type="button"
                        onClick={() => handleEliminarEstado(
                          estado._id, 
                          estado.codiEstdo || estado.codiEstado, 
                          estado.descEstdo || estado.descEstado
                        )}
                        disabled={eliminando === estado._id}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: eliminando === estado._id ? '#6B7280' : '#EF4444',
                          color: '#FFFFFF'
                        }}
                        onMouseEnter={(e) => {
                          if (eliminando !== estado._id) {
                            e.currentTarget.style.backgroundColor = '#DC2626';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (eliminando !== estado._id) {
                            e.currentTarget.style.backgroundColor = '#EF4444';
                          }
                        }}
                        title="Eliminar estado"
                      >
                        {eliminando === estado._id ? 'Eliminando...' : '🗑️ Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <p 
          className="text-sm"
          style={{ color: textSecondary }}
        >
          <strong style={{ color: textPrimary }}>Total de estados:</strong> {estados.length}
        </p>
        <p 
          className="text-xs mt-2"
          style={{ color: textSecondary }}
        >
          * Los estados se utilizan para clasificar los casos COMPLEX en diferentes etapas del proceso.
        </p>
      </div>
    </div>
  );
}

