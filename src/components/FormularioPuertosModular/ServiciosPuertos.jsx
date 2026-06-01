import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function ServiciosPuertos({ formData, onInputChange, cargando }) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const transformadores = formData.transformadores || [];

  const agregarTransformador = () => {
    const nuevosTransformadores = [...transformadores, {
      id: Date.now(),
      subestacion: '',
      marca: '',
      tipo: '',
      capacidad: '',
      edad: '',
      relacionVoltaje: ''
    }];
    onInputChange('transformadores', nuevosTransformadores);
  };

  const eliminarTransformador = (id) => {
    onInputChange('transformadores', transformadores.filter(t => t.id !== id));
  };

  const actualizarTransformador = (id, campo, valor) => {
    onInputChange('transformadores', transformadores.map(t =>
      t.id === id ? { ...t, [campo]: valor } : t
    ));
  };

  return (
    <div 
      className="mt-8 p-6 rounded shadow-sm"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <h2 
        className="text-xl font-bold mb-4"
        style={{ color: textPrimary }}
      >
        6. SERVICIOS INDUSTRIALES
      </h2>

      {/* Energía */}
      <div 
        className="p-4 rounded mb-8"
        style={{
          backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-bold italic mb-4"
          style={{ color: textPrimary }}
        >
          Energía
        </h3>

        <div className="mb-4">
          <label 
            className="font-semibold block mb-1"
            style={{ color: textPrimary }}
          >
            PROVEEDOR
          </label>
          <input
            type="text"
            value={formData.energiaProveedor || ''}
            onChange={(e) => onInputChange('energiaProveedor', e.target.value)}
            placeholder="Ej: Empresa de Energía Local"
            className="w-full rounded px-2 py-1"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div className="mb-4">
          <label 
            className="font-semibold block mb-1"
            style={{ color: textPrimary }}
          >
            TENSIÓN
          </label>
          <input
            type="text"
            value={formData.energiaTension || ''}
            onChange={(e) => onInputChange('energiaTension', e.target.value)}
            placeholder="Ej: Alta tensión 220kV"
            className="w-full rounded px-2 py-1"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        {/* Transformadores */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm" style={{ color: textPrimary }}>
              TRANSFORMADORES
            </h4>
            <button
              type="button"
              onClick={agregarTransformador}
              className="px-3 py-1 rounded text-sm font-medium"
              style={{
                backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
                color: '#FFFFFF'
              }}
              disabled={cargando}
            >
              + Agregar
            </button>
          </div>
          
          {transformadores.map((transformador, index) => (
            <div 
              key={transformador.id} 
              className="mb-4 p-3 rounded-lg"
              style={{
                border: `1px solid ${borderColor}`,
                backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span 
                  className="text-sm font-semibold"
                  style={{ color: textPrimary }}
                >
                  Transformador {index + 1}
                </span>
                {transformadores.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarTransformador(transformador.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={cargando}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <input
                  placeholder="Subestación"
                  value={transformador.subestacion}
                  onChange={(e) => actualizarTransformador(transformador.id, 'subestacion', e.target.value)}
                  className="px-2 py-1 rounded"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                  disabled={cargando}
                />
                <input
                  placeholder="Marca"
                  value={transformador.marca}
                  onChange={(e) => actualizarTransformador(transformador.id, 'marca', e.target.value)}
                  className="px-2 py-1 rounded"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                  disabled={cargando}
                />
                <input
                  placeholder="Tipo"
                  value={transformador.tipo}
                  onChange={(e) => actualizarTransformador(transformador.id, 'tipo', e.target.value)}
                  className="px-2 py-1 rounded"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                  disabled={cargando}
                />
                <input
                  placeholder="Capacidad"
                  value={transformador.capacidad}
                  onChange={(e) => actualizarTransformador(transformador.id, 'capacidad', e.target.value)}
                  className="px-2 py-1 rounded"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                  disabled={cargando}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label 
            className="font-semibold block mb-1"
            style={{ color: textPrimary }}
          >
            Comentarios sobre Energía
          </label>
          <textarea
            value={formData.energiaComentarios || ''}
            onChange={(e) => onInputChange('energiaComentarios', e.target.value)}
            rows={3}
            className="w-full rounded px-2 py-1"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>
      </div>

      {/* Agua */}
      <div 
        className="p-4 rounded"
        style={{
          backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-bold italic mb-4"
          style={{ color: textPrimary }}
        >
          Agua
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold block mb-1" style={{ color: textPrimary }}>
              Fuente
            </label>
            <input
              type="text"
              value={formData.aguaFuente || ''}
              onChange={(e) => onInputChange('aguaFuente', e.target.value)}
              className="w-full rounded px-2 py-1"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1" style={{ color: textPrimary }}>
              Uso
            </label>
            <input
              type="text"
              value={formData.aguaUso || ''}
              onChange={(e) => onInputChange('aguaUso', e.target.value)}
              className="w-full rounded px-2 py-1"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1" style={{ color: textPrimary }}>
              Almacenamiento
            </label>
            <input
              type="text"
              value={formData.aguaAlmacenamiento || ''}
              onChange={(e) => onInputChange('aguaAlmacenamiento', e.target.value)}
              className="w-full rounded px-2 py-1"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1" style={{ color: textPrimary }}>
              Bombeo
            </label>
            <input
              type="text"
              value={formData.aguaBombeo || ''}
              onChange={(e) => onInputChange('aguaBombeo', e.target.value)}
              className="w-full rounded px-2 py-1"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-semibold block mb-1" style={{ color: textPrimary }}>
              Comentarios
            </label>
            <textarea
              value={formData.aguaComentarios || ''}
              onChange={(e) => onInputChange('aguaComentarios', e.target.value)}
              rows={3}
              className="w-full rounded px-2 py-1"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

