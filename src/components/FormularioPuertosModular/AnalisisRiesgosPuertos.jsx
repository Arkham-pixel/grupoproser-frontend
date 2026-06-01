import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash } from 'react-icons/fa';
import MapaDeCalor from '../MapaDeCalor';

export default function AnalisisRiesgosPuertos({ formData, onInputChange, cargando }) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  // Tabla libre de Análisis de Riesgos
  const tablaAnalisisLibre = formData.tablaAnalisisLibre || [];
  
  // Tabla de Clasificación de Riesgos (Mapa de Calor)
  const tablaRiesgos = formData.tablaRiesgos || [];

  // Funciones para tabla libre de análisis
  const handleAgregarFilaAnalisis = () => {
    const idNuevo = Date.now();
    const nuevaFilaAnalisis = {
      id: idNuevo,
      riesgo: '',
      analisis: ''
    };
    const nuevaFilaRiesgo = {
      id: idNuevo, // Mismo ID para sincronizar
      riesgo: '',
      probabilidad: 0,
      severidad: 0,
      r: 0,
      indice: 0,
      clasificacion: 'Bajo'
    };
    
    // Agregar a ambas tablas
    onInputChange('tablaAnalisisLibre', [...tablaAnalisisLibre, nuevaFilaAnalisis]);
    onInputChange('tablaRiesgos', [...tablaRiesgos, nuevaFilaRiesgo]);
  };

  const handleEliminarFilaAnalisis = (id) => {
    // Eliminar de ambas tablas usando el mismo ID
    onInputChange('tablaAnalisisLibre', tablaAnalisisLibre.filter(fila => fila.id !== id));
    onInputChange('tablaRiesgos', tablaRiesgos.filter(fila => fila.id !== id));
  };

  const handleActualizarCeldaAnalisis = (id, campo, valor) => {
    onInputChange('tablaAnalisisLibre', 
      tablaAnalisisLibre.map(fila => 
        fila.id === id ? { ...fila, [campo]: valor } : fila
      )
    );
    
    // Si se actualiza el nombre del riesgo, sincronizar con la tabla de clasificación
    if (campo === 'riesgo') {
      onInputChange('tablaRiesgos', 
        tablaRiesgos.map(fila => 
          fila.id === id ? { ...fila, riesgo: valor } : fila
        )
      );
    }
  };

  // Funciones para tabla de clasificación con fórmula
  const calcularClasificacion = (r) => {
    if (r <= 4) return "Bajo";
    if (r <= 8) return "Medio";
    if (r <= 12) return "Alto";
    return "Extremo";
  };

  const actualizarRiesgo = (id, campo, valor) => {
    const nuevaTabla = tablaRiesgos.map(fila => {
      if (fila.id === id) {
        const filaActualizada = { ...fila, [campo]: valor };
        
        // Si es un campo numérico, calcular automáticamente
        if (campo === 'probabilidad' || campo === 'severidad') {
          filaActualizada[campo] = parseInt(valor) || 0;
          
          const { probabilidad, severidad } = filaActualizada;
          if (probabilidad && severidad) {
            const r = probabilidad * severidad;
            const indice = ((r / 25) * 100).toFixed(0);
            filaActualizada.r = r;
            filaActualizada.indice = indice;
            filaActualizada.clasificacion = calcularClasificacion(r);
          }
        }
        
        return filaActualizada;
      }
      return fila;
    });
  
    onInputChange('tablaRiesgos', nuevaTabla);
  };

  return (
    <>
      <div 
        className="p-4 rounded mb-6"
        style={{
          backgroundColor: cardBg,
          border: `2px solid ${borderColor}`
        }}
      >
        {/* SECCIÓN 1: ANÁLISIS DE RIESGOS (Tabla Libre) */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 
              className="text-lg font-bold"
              style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
            >
              📋 ANÁLISIS DE RIESGOS
            </h2>
            <button
              onClick={handleAgregarFilaAnalisis}
              className="px-3 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
                color: '#FFFFFF'
              }}
              disabled={cargando}
            >
              <FaPlus />
              Agregar Riesgo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table 
              className="w-full text-sm"
              style={{
                border: `1px solid ${borderColor}`,
                borderCollapse: 'collapse'
              }}
            >
              <thead>
                <tr 
                  style={{
                    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB'
                  }}
                >
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '30%'
                    }}
                  >
                    RIESGO
                  </th>
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary
                    }}
                  >
                    ANÁLISIS
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '60px'
                    }}
                  >
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {tablaAnalisisLibre.map((fila, index) => (
                  <tr 
                    key={fila.id}
                    style={{
                      backgroundColor: index % 2 === 0 
                        ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                        : (theme === 'dark' ? '#0F0F0F' : '#F9FAFB')
                    }}
                  >
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="text"
                        value={fila.riesgo}
                        onChange={(e) => handleActualizarCeldaAnalisis(fila.id, 'riesgo', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="Ej: Incendio/Explosión"
                      />
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <textarea
                        value={fila.analisis}
                        onChange={(e) => handleActualizarCeldaAnalisis(fila.id, 'analisis', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        rows="2"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none',
                          resize: 'vertical'
                        }}
                        placeholder="Escribe el análisis del riesgo..."
                      />
                    </td>
                    <td 
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '4px',
                        textAlign: 'center'
                      }}
                    >
                      <button
                        onClick={() => handleEliminarFilaAnalisis(fila.id)}
                        className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                        style={{ color: '#EF4444' }}
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tablaAnalisisLibre.length === 0 && (
            <div 
              className="p-6 text-center rounded mt-2"
              style={{
                backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                border: `2px dashed ${borderColor}`,
                color: textSecondary
              }}
            >
              <p className="text-sm">Haz clic en "Agregar Riesgo" para comenzar el análisis</p>
            </div>
          )}
        </div>

        {/* SECCIÓN 2: CLASIFICACIÓN DEL RIESGO (Con fórmula automática) */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 
              className="text-lg font-bold"
              style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
            >
              🔥 CLASIFICACIÓN DEL RIESGO
            </h2>
            <p 
              className="text-xs"
              style={{ color: textSecondary }}
            >
              Los riesgos se sincronizan automáticamente desde la sección de Análisis
            </p>
          </div>

          <div className="overflow-x-auto">
            <table 
              className="w-full text-sm"
              style={{
                border: `1px solid ${borderColor}`,
                borderCollapse: 'collapse'
              }}
            >
              <thead>
                <tr 
                  style={{
                    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB'
                  }}
                >
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '180px'
                    }}
                  >
                    RIESGO (Sincronizado)
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '100px'
                    }}
                  >
                    PROBABILIDAD
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '100px'
                    }}
                  >
                    SEVERIDAD
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '80px'
                    }}
                  >
                    R
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '80px'
                    }}
                  >
                    ÍNDICE
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '120px'
                    }}
                  >
                    CLASIFICACIÓN
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '60px'
                    }}
                  >
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {tablaRiesgos.map((fila, index) => (
                  <tr 
                    key={fila.id}
                    style={{
                      backgroundColor: index % 2 === 0 
                        ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                        : (theme === 'dark' ? '#0F0F0F' : '#F9FAFB')
                    }}
                  >
                    <td 
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '8px',
                        backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F3F4F6'
                      }}
                    >
                      <span 
                        className="text-sm italic"
                        style={{ color: textSecondary }}
                      >
                        {fila.riesgo || 'Escribe el riesgo en Análisis de Riesgos'}
                      </span>
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={fila.probabilidad}
                        onChange={(e) => actualizarRiesgo(fila.id, 'probabilidad', e.target.value)}
                        className="w-full px-2 py-1 text-sm text-center"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="1-5"
                      />
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={fila.severidad}
                        onChange={(e) => actualizarRiesgo(fila.id, 'severidad', e.target.value)}
                        className="w-full px-2 py-1 text-sm text-center"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="1-5"
                      />
                    </td>
                    <td 
                      className="text-center font-bold"
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '8px',
                        color: textPrimary
                      }}
                    >
                      {fila.r || 0}
                    </td>
                    <td 
                      className="text-center font-bold"
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '8px',
                        color: textPrimary
                      }}
                    >
                      {fila.indice || 0}%
                    </td>
                    <td 
                      className="text-center font-bold"
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '8px',
                        color: fila.clasificacion === 'Extremo' ? '#DC2626' :
                               fila.clasificacion === 'Alto' ? '#F59E0B' :
                               fila.clasificacion === 'Medio' ? '#FBBF24' :
                               '#10B981'
                      }}
                    >
                      {fila.clasificacion || 'Bajo'}
                    </td>
                    <td 
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '4px',
                        textAlign: 'center'
                      }}
                    >
                      <button
                        onClick={() => handleEliminarFilaAnalisis(fila.id)}
                        className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                        style={{ color: '#EF4444' }}
                        title="Eliminar de ambas tablas"
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tablaRiesgos.length === 0 && (
            <div 
              className="p-6 text-center rounded mt-2"
              style={{
                backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                border: `2px dashed ${borderColor}`,
                color: textSecondary
              }}
            >
              <p className="text-sm">Haz clic en "Agregar Riesgo" para comenzar la clasificación</p>
            </div>
          )}

          {/* Leyenda de valores y clasificación */}
          <div 
            className="mt-4 p-4 rounded text-xs"
            style={{
              backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
              border: `1px solid ${borderColor}`
            }}
          >
            <p className="font-bold mb-3 text-sm" style={{ color: textPrimary }}>
              📊 Fórmula: R = Probabilidad × Severidad
            </p>
            
            {/* Explicación de Probabilidad */}
            <div className="mb-3">
              <p className="font-bold mb-1" style={{ color: textPrimary }}>
                PROBABILIDAD (Frecuencia de ocurrencia):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 ml-2">
                <span style={{ color: textSecondary }}>1 = Muy improbable (casi nunca)</span>
                <span style={{ color: textSecondary }}>2 = Improbable (rara vez)</span>
                <span style={{ color: textSecondary }}>3 = Posible (ocasionalmente)</span>
                <span style={{ color: textSecondary }}>4 = Probable (frecuentemente)</span>
                <span style={{ color: textSecondary }}>5 = Muy probable (casi siempre)</span>
              </div>
            </div>

            {/* Explicación de Severidad */}
            <div className="mb-3">
              <p className="font-bold mb-1" style={{ color: textPrimary }}>
                SEVERIDAD (Impacto del daño):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 ml-2">
                <span style={{ color: textSecondary }}>1 = Insignificante (sin impacto)</span>
                <span style={{ color: textSecondary }}>2 = Menor (impacto leve)</span>
                <span style={{ color: textSecondary }}>3 = Moderada (impacto medio)</span>
                <span style={{ color: textSecondary }}>4 = Mayor (impacto grave)</span>
                <span style={{ color: textSecondary }}>5 = Catastrófica (impacto crítico)</span>
              </div>
            </div>

            {/* Clasificación del Riesgo */}
            <div>
              <p className="font-bold mb-1" style={{ color: textPrimary }}>
                CLASIFICACIÓN DEL RIESGO:
              </p>
              <div className="flex flex-wrap gap-4 ml-2">
                <span style={{ color: '#10B981' }}>● Bajo (R ≤ 4)</span>
                <span style={{ color: '#FBBF24' }}>● Medio (5 ≤ R ≤ 8)</span>
                <span style={{ color: '#F59E0B' }}>● Alto (9 ≤ R ≤ 12)</span>
                <span style={{ color: '#DC2626' }}>● Extremo (R {'>'} 12)</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAPA DE CALOR */}
        <div className="mt-8">
          <h2 
            className="text-lg font-bold mb-4"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            🗺️ MAPA DE CALOR
          </h2>
          <MapaDeCalor tablaRiesgos={tablaRiesgos} />
        </div>
      </div>
    </>
  );
}
