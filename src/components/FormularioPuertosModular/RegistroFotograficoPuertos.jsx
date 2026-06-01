import React, { useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaCamera, FaTrash, FaUpload, FaTimes, FaSearchPlus } from 'react-icons/fa';
import { getUploadsUrlCandidates } from '../../config/apiConfig';
import { getImageUrl, createImageErrorHandler } from '../../utils/imageUtils';

export default function RegistroFotograficoPuertos({ formData, onInputChange, cargando }) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const fileInputRef = useRef(null);
  const imagenesRegistro = formData.imagenesRegistro || [];
  
  // Estado para el modal de vista previa
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  const handleAgregarImagen = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const nuevaImagen = {
          id: Date.now() + Math.random(),
          file: file,                    // ✅ CRÍTICO: Guardar el archivo original para subirlo al servidor
          preview: reader.result,         // ✅ Preview para mostrar en UI
          src: reader.result,             // ✅ Compatibilidad con código existente
          descripcion: '',
          nombre: file.name,
          tamaño: file.size,
          tipoMime: file.type
        };
        
        onInputChange('imagenesRegistro', [...imagenesRegistro, nuevaImagen]);
      };
      reader.readAsDataURL(file);
    });
    
    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEliminarImagen = (id) => {
    onInputChange('imagenesRegistro', imagenesRegistro.filter(img => img.id !== id));
  };

  const handleActualizarDescripcion = (id, nuevaDescripcion) => {
    onInputChange('imagenesRegistro', 
      imagenesRegistro.map(img => 
        img.id === id ? { ...img, descripcion: nuevaDescripcion } : img
      )
    );
  };

  return (
    <>
      {/* Modal de Vista Previa */}
      {imagenAmpliada && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)'
          }}
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
              onError={createImageErrorHandler(imagenAmpliada, (img, imagenData) => {
                // Callback cuando todas las URLs fallan en el modal
                const container = img.parentElement;
                if (container && !container.querySelector('.image-error-message')) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'image-error-message max-w-full max-h-[90vh] rounded flex items-center justify-center';
                  errorDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                  errorDiv.innerHTML = `
                    <span class="text-sm text-center px-4 py-8 text-white">
                      Imagen no disponible en el servidor
                    </span>
                  `;
                  container.appendChild(errorDiv);
                }
              })}
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
        className="mt-8 p-6 rounded shadow-sm"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <div className="flex items-center justify-between mb-4">
        <h2 
          className="text-xl font-bold"
          style={{ color: textPrimary }}
        >
          11. REGISTRO FOTOGRÁFICO
        </h2>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded font-medium"
          style={{
            backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
            color: '#FFFFFF'
          }}
          disabled={cargando}
        >
          <FaUpload />
          Cargar Imágenes
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleAgregarImagen}
          className="hidden"
          disabled={cargando}
        />
      </div>

      {imagenesRegistro.length === 0 ? (
        <div 
          className="text-center py-12 rounded"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
            border: `2px dashed ${borderColor}`
          }}
        >
          <FaCamera 
            className="mx-auto mb-4"
            style={{ 
              fontSize: '3rem',
              color: theme === 'dark' ? '#4B5563' : '#9CA3AF'
            }}
          />
          <p 
            className="text-sm"
            style={{ color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
          >
            No hay imágenes cargadas. Haz clic en "Cargar Imágenes" para agregar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {imagenesRegistro.map((imagen) => {
            // Normalizar imagen para usar con imageUtils
            const imagenNormalizada = {
              ...imagen,
              url: imagen.src || imagen.preview || null,
              base64: imagen.base64 || (imagen.preview?.startsWith('data:') ? imagen.preview : null),
              ruta: imagen.ruta || null
            };
            const imageUrl = getImageUrl(imagenNormalizada);
            const imagenConSrc = { ...imagen, src: imageUrl || imagen.src || imagen.preview };
            return (
            <div 
              key={imagen.id}
              className="rounded overflow-hidden"
              style={{
                backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                border: `1px solid ${borderColor}`
              }}
            >
              <div className="relative group">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={imagen.descripcion || 'Imagen del registro'}
                    className="w-full h-48 object-cover cursor-pointer transition-transform hover:scale-105"
                    onClick={() => setImagenAmpliada(imagenConSrc)}
                    onError={createImageErrorHandler(imagenNormalizada, (img, imagenData) => {
                      // Callback cuando todas las URLs fallan
                      const container = img.closest('.relative') || img.parentElement;
                      if (container && !container.querySelector('.image-error-message')) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'image-error-message w-full h-48 rounded flex items-center justify-center';
                        errorDiv.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
                        errorDiv.innerHTML = `
                          <span class="text-xs text-center px-2" style="color: ${theme === 'dark' ? '#9CA3AF' : '#6B7280'}">
                            Imagen no disponible<br/>
                            en el servidor
                          </span>
                        `;
                        container.appendChild(errorDiv);
                      }
                    })}
                  />
                ) : (
                  <div 
                    className="w-full h-48 flex items-center justify-center"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB'
                    }}
                  >
                    <span 
                      className="text-xs text-center px-2"
                      style={{ color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
                    >
                      Sin imagen
                    </span>
                  </div>
                )}
                {/* Overlay al hacer hover */}
                <div 
                  className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center cursor-pointer"
                  onClick={() => setImagenAmpliada(imagenConSrc)}
                >
                  <FaSearchPlus 
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ fontSize: '2rem' }}
                  />
                </div>
                {/* Botón eliminar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEliminarImagen(imagen.id);
                  }}
                  className="absolute top-2 right-2 p-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                  disabled={cargando}
                >
                  <FaTrash />
                </button>
              </div>
              
              <div className="p-3">
                <p 
                  className="text-xs mb-2"
                  style={{ color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
                >
                  {imagen.nombre}
                </p>
                <textarea
                  value={imagen.descripcion}
                  onChange={(e) => handleActualizarDescripcion(imagen.id, e.target.value)}
                  placeholder="Descripción de la imagen..."
                  rows={3}
                  className="w-full rounded px-2 py-1 text-sm"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                  disabled={cargando}
                />
              </div>
            </div>
            );
          })}
        </div>
      )}

      {imagenesRegistro.length > 0 && (
        <p 
          className="text-sm text-right mt-4"
          style={{ color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }}
        >
          Total: {imagenesRegistro.length} imagen(es)
        </p>
      )}
      </div>
    </>
  );
}

