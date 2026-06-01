import React, { useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash, FaCamera, FaTimes, FaSearchPlus } from 'react-icons/fa';

export default function InformeFotograficoPuertos({ formData, onInputChange, cargando }) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const fileInputRefs = useRef({});
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  // Registros fotográficos por VIN
  const registrosPorVin = formData.registrosPorVin || [];

  // Agregar un nuevo registro de VIN
  const handleAgregarRegistroVin = () => {
    const nuevoRegistro = {
      id: Date.now(),
      vin: '',
      danos: '',
      fotos: []
    };
    onInputChange('registrosPorVin', [...registrosPorVin, nuevoRegistro]);
  };

  // Eliminar un registro de VIN completo
  const handleEliminarRegistroVin = (registroId) => {
    onInputChange('registrosPorVin', registrosPorVin.filter(r => r.id !== registroId));
  };

  // Actualizar datos del registro (VIN o daños)
  const handleActualizarRegistroVin = (registroId, campo, valor) => {
    onInputChange('registrosPorVin', 
      registrosPorVin.map(registro => 
        registro.id === registroId ? { ...registro, [campo]: valor } : registro
      )
    );
  };

  // Agregar fotos a un registro específico
  const handleAgregarFotos = (registroId, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const nuevasFotos = [];
    let procesados = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        nuevasFotos.push({
          id: Date.now() + Math.random(),
          file: file,
          preview: reader.result,
          src: reader.result,
          descripcion: '',
          nombre: file.name
        });
        
        procesados++;
        
        // Cuando todas las fotos estén procesadas, actualizar
        if (procesados === files.length) {
          onInputChange('registrosPorVin', 
            registrosPorVin.map(registro => {
              if (registro.id === registroId) {
                return {
                  ...registro,
                  fotos: [...registro.fotos, ...nuevasFotos]
                };
              }
              return registro;
            })
          );
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Limpiar el input
    if (fileInputRefs.current[registroId]) {
      fileInputRefs.current[registroId].value = '';
    }
  };

  // Eliminar una foto específica de un registro
  const handleEliminarFoto = (registroId, fotoId) => {
    onInputChange('registrosPorVin', 
      registrosPorVin.map(registro => {
        if (registro.id === registroId) {
          return {
            ...registro,
            fotos: registro.fotos.filter(foto => foto.id !== fotoId)
          };
        }
        return registro;
      })
    );
  };

  // Actualizar descripción de una foto
  const handleActualizarDescripcionFoto = (registroId, fotoId, descripcion) => {
    onInputChange('registrosPorVin', 
      registrosPorVin.map(registro => {
        if (registro.id === registroId) {
          return {
            ...registro,
            fotos: registro.fotos.map(foto => 
              foto.id === fotoId ? { ...foto, descripcion } : foto
            )
          };
        }
        return registro;
      })
    );
  };

  return (
    <>
      {/* Modal de Vista Previa */}
      {imagenAmpliada && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setImagenAmpliada(null)}
        >
          <button
            onClick={() => setImagenAmpliada(null)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
            style={{ color: '#FFFFFF' }}
          >
            <FaTimes size={24} />
          </button>
          
          <div 
            className="max-w-7xl max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imagenAmpliada.src}
              alt={imagenAmpliada.descripcion || 'Vista ampliada'}
              className="max-w-full max-h-[90vh] object-contain rounded"
            />
            {imagenAmpliada.descripcion && (
              <p 
                className="mt-4 text-center text-sm px-4 py-2 rounded"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: '#FFFFFF'
                }}
              >
                {imagenAmpliada.descripcion}
              </p>
            )}
          </div>
        </div>
      )}

      <div 
        className="p-4 rounded mb-6"
        style={{
          backgroundColor: cardBg,
          border: `2px solid ${borderColor}`
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 
            className="text-xl font-bold"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            📸 INFORME FOTOGRÁFICO
          </h3>
          <button
            onClick={handleAgregarRegistroVin}
            className="px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
              color: '#FFFFFF'
            }}
            disabled={cargando}
          >
            <FaPlus />
            Agregar VIN
          </button>
        </div>

        {/* Registros por VIN */}
        {registrosPorVin.map((registro, indexRegistro) => (
          <div 
            key={registro.id}
            className="mb-6 p-4 rounded"
            style={{
              backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
              border: `2px solid ${borderColor}`
            }}
          >
            {/* Header del registro */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label 
                    className="block text-xs font-medium mb-1"
                    style={{ color: textPrimary }}
                  >
                    VIN del Vehículo
                  </label>
                  <input
                    type="text"
                    value={registro.vin}
                    onChange={(e) => handleActualizarRegistroVin(registro.id, 'vin', e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor,
                      border: `1px solid ${borderColor}`
                    }}
                    placeholder="Ej: 8AJCA3GS1T0985771"
                    disabled={cargando}
                  />
                </div>
                
                <div>
                  <label 
                    className="block text-xs font-medium mb-1"
                    style={{ color: textPrimary }}
                  >
                    Daños Registrados
                  </label>
                  <input
                    type="text"
                    value={registro.danos}
                    onChange={(e) => handleActualizarRegistroVin(registro.id, 'danos', e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor,
                      border: `1px solid ${borderColor}`
                    }}
                    placeholder="Ej: parachoque D desconche"
                    disabled={cargando}
                  />
                </div>
              </div>

              <button
                onClick={() => handleEliminarRegistroVin(registro.id)}
                className="ml-3 p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
                style={{ color: '#EF4444' }}
                title="Eliminar registro completo"
              >
                <FaTrash />
              </button>
            </div>

            {/* Título del registro */}
            {(registro.vin || registro.danos) && (
              <div 
                className="mb-3 p-2 rounded text-sm font-medium"
                style={{
                  backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              >
                {registro.vin && <span>VIN Nro. {registro.vin}</span>}
                {registro.vin && registro.danos && <span> - </span>}
                {registro.danos && <span>{registro.danos}</span>}
              </div>
            )}

            {/* Botón para agregar fotos */}
            <div className="mb-3">
              <input
                ref={(el) => fileInputRefs.current[registro.id] = el}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleAgregarFotos(registro.id, e)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRefs.current[registro.id]?.click()}
                className="px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
                  color: '#FFFFFF'
                }}
                disabled={cargando}
              >
                <FaCamera />
                Agregar Fotos
              </button>
            </div>

            {/* Grid de fotos */}
            {registro.fotos && registro.fotos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {registro.fotos.map((foto) => (
                  <div 
                    key={foto.id}
                    className="rounded overflow-hidden"
                    style={{
                      border: `1px solid ${borderColor}`,
                      backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF'
                    }}
                  >
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => setImagenAmpliada(foto)}
                    >
                      <img
                        src={foto.src}
                        alt={foto.descripcion || `Foto del VIN ${registro.vin}`}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                        <FaSearchPlus 
                          className="text-white opacity-0 group-hover:opacity-100 transition-opacity" 
                          size={32}
                        />
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <input
                        type="text"
                        value={foto.descripcion}
                        onChange={(e) => handleActualizarDescripcionFoto(registro.id, foto.id, e.target.value)}
                        placeholder="Descripción de la foto..."
                        className="w-full px-2 py-1 text-sm rounded mb-2"
                        style={{
                          backgroundColor: inputBg,
                          color: textPrimary,
                          border: `1px solid ${borderColor}`
                        }}
                      />
                      
                      <button
                        onClick={() => handleEliminarFoto(registro.id, foto.id)}
                        className="w-full px-3 py-1 rounded text-sm flex items-center justify-center gap-2 transition-colors"
                        style={{
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF'
                        }}
                      >
                        <FaTrash size={12} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mensaje si no hay fotos */}
            {(!registro.fotos || registro.fotos.length === 0) && (
              <div 
                className="p-6 text-center rounded"
                style={{
                  backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                  border: `2px dashed ${borderColor}`,
                  color: textSecondary
                }}
              >
                <p className="text-sm">Haz clic en "Agregar Fotos" para este VIN</p>
              </div>
            )}
          </div>
        ))}

        {/* Mensaje inicial si no hay registros */}
        {registrosPorVin.length === 0 && (
          <div 
            className="p-8 text-center rounded"
            style={{
              backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
              border: `2px dashed ${borderColor}`,
              color: textSecondary
            }}
          >
            <p className="text-sm mb-2">No hay registros fotográficos aún</p>
            <p className="text-xs">Haz clic en "Agregar VIN" para comenzar</p>
          </div>
        )}
      </div>
    </>
  );
}

