import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash, FaCheck } from 'react-icons/fa';

export default function RecomendacionesPuertos({ formData, onInputChange, cargando }) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const [nuevaRecomendacion, setNuevaRecomendacion] = useState('');
  const [bancoRecomendaciones, setBancoRecomendaciones] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  // Cargar banco de recomendaciones del localStorage
  useEffect(() => {
    const bancoGuardado = localStorage.getItem('bancoRecomendacionesPuertos');
    if (bancoGuardado) {
      try {
        setBancoRecomendaciones(JSON.parse(bancoGuardado));
      } catch (error) {
        console.error('Error al cargar banco de recomendaciones:', error);
      }
    }
  }, []);

  // Guardar en localStorage cuando cambie el banco
  const guardarEnBanco = (nuevoBanco) => {
    setBancoRecomendaciones(nuevoBanco);
    localStorage.setItem('bancoRecomendacionesPuertos', JSON.stringify(nuevoBanco));
  };

  const recomendacionesActuales = formData.recomendaciones || [];

  // Categorías de recomendaciones
  const categorias = [
    'Almacenamiento',
    'Seguridad',
    'Operaciones',
    'Mantenimiento',
    'Documentación',
    'General'
  ];

  // Agregar recomendación al formulario
  const handleAgregarRecomendacion = () => {
    if (nuevaRecomendacion.trim()) {
      const nuevaRec = {
        id: Date.now(),
        texto: nuevaRecomendacion.trim(),
        categoria: categoriaSeleccionada || 'General'
      };
      
      onInputChange('recomendaciones', [...recomendacionesActuales, nuevaRec]);
      setNuevaRecomendacion('');
    }
  };

  // Eliminar recomendación del formulario
  const handleEliminarRecomendacion = (id) => {
    onInputChange('recomendaciones', recomendacionesActuales.filter(rec => rec.id !== id));
  };

  // Agregar recomendación al banco
  const handleGuardarEnBanco = () => {
    if (nuevaRecomendacion.trim()) {
      const nuevaRec = {
        id: Date.now(),
        texto: nuevaRecomendacion.trim(),
        categoria: categoriaSeleccionada || 'General'
      };
      
      guardarEnBanco([...bancoRecomendaciones, nuevaRec]);
      setNuevaRecomendacion('');
    }
  };

  // Agregar recomendación del banco al formulario
  const handleAgregarDesdeBanco = (recomendacion) => {
    const nuevaRec = {
      id: Date.now(),
      texto: recomendacion.texto,
      categoria: recomendacion.categoria
    };
    
    onInputChange('recomendaciones', [...recomendacionesActuales, nuevaRec]);
  };

  // Eliminar del banco
  const handleEliminarDelBanco = (id) => {
    guardarEnBanco(bancoRecomendaciones.filter(rec => rec.id !== id));
  };

  // Filtrar banco por categoría
  const bancoFiltrado = categoriaSeleccionada 
    ? bancoRecomendaciones.filter(rec => rec.categoria === categoriaSeleccionada)
    : bancoRecomendaciones;

  return (
    <div 
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${borderColor}`
      }}
    >
      <h3 
        className="text-xl font-bold mb-4"
        style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
      >
        📋 RECOMENDACIONES
      </h3>

      {/* Selector de categoría */}
      <div className="mb-4">
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          Categoría
        </label>
        <select
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          className="w-full rounded px-3 py-2 text-sm"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Campo para nueva recomendación */}
      <div className="mb-4">
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          Nueva Recomendación
        </label>
        <textarea
          value={nuevaRecomendacion}
          onChange={(e) => setNuevaRecomendacion(e.target.value)}
          rows="3"
          className="w-full rounded px-3 py-2 text-sm"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`,
            resize: 'vertical'
          }}
          placeholder="Escribe una nueva recomendación..."
          disabled={cargando}
        />
        
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleAgregarRecomendacion}
            className="px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
              color: '#FFFFFF'
            }}
            disabled={cargando || !nuevaRecomendacion.trim()}
          >
            <FaPlus />
            Agregar al Informe
          </button>
          
          <button
            onClick={handleGuardarEnBanco}
            className="px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
              color: '#FFFFFF'
            }}
            disabled={cargando || !nuevaRecomendacion.trim()}
          >
            <FaPlus />
            Guardar en Banco
          </button>
        </div>
      </div>

      {/* Banco de Recomendaciones */}
      {bancoFiltrado.length > 0 && (
        <div 
          className="mb-6 p-4 rounded"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
            border: `1px solid ${borderColor}`
          }}
        >
          <h4 
            className="text-sm font-bold mb-3"
            style={{ color: textPrimary }}
          >
            💾 Banco de Recomendaciones
            {categoriaSeleccionada && ` - ${categoriaSeleccionada}`}
          </h4>
          
          <div className="space-y-2">
            {bancoFiltrado.map(rec => (
              <div 
                key={rec.id}
                className="p-3 rounded flex items-start gap-3"
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`
                }}
              >
                <div className="flex-1">
                  <span 
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2563EB' : '#DBEAFE',
                      color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                    }}
                  >
                    {rec.categoria}
                  </span>
                  <p 
                    className="text-sm mt-2"
                    style={{ color: textPrimary }}
                  >
                    {rec.texto}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAgregarDesdeBanco(rec)}
                    className="p-2 rounded hover:bg-blue-500 hover:text-white transition-colors"
                    style={{ color: '#3B82F6' }}
                    title="Agregar al informe"
                  >
                    <FaCheck size={14} />
                  </button>
                  
                  <button
                    onClick={() => handleEliminarDelBanco(rec.id)}
                    className="p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
                    style={{ color: '#EF4444' }}
                    title="Eliminar del banco"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendaciones del informe actual */}
      <div>
        <h4 
          className="text-sm font-bold mb-3"
          style={{ color: textPrimary }}
        >
          📝 Recomendaciones del Informe ({recomendacionesActuales.length})
        </h4>
        
        {recomendacionesActuales.length > 0 ? (
          <div className="space-y-3">
            {recomendacionesActuales.map((rec, index) => (
              <div 
                key={rec.id}
                className="p-3 rounded flex items-start gap-3"
                style={{
                  backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                  border: `1px solid ${borderColor}`
                }}
              >
                <div 
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1"
                  style={{
                    backgroundColor: theme === 'dark' ? '#DC2626' : '#FCA5A5',
                    color: '#FFFFFF'
                  }}
                >
                  <FaCheck size={12} />
                </div>
                
                <div className="flex-1">
                  <span 
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: theme === 'dark' ? '#16A34A' : '#D1FAE5',
                      color: theme === 'dark' ? '#86EFAC' : '#065F46'
                    }}
                  >
                    {rec.categoria}
                  </span>
                  <p 
                    className="text-sm mt-2"
                    style={{ color: textPrimary }}
                  >
                    {rec.texto}
                  </p>
                </div>
                
                <button
                  onClick={() => handleEliminarRecomendacion(rec.id)}
                  className="flex-shrink-0 p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
                  style={{ color: '#EF4444' }}
                  title="Eliminar"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div 
            className="p-6 text-center rounded"
            style={{
              backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
              border: `2px dashed ${borderColor}`,
              color: textSecondary
            }}
          >
            <p className="text-sm">No hay recomendaciones agregadas</p>
            <p className="text-xs mt-1">Escribe una recomendación y haz clic en "Agregar al Informe"</p>
          </div>
        )}
      </div>
    </div>
  );
}
