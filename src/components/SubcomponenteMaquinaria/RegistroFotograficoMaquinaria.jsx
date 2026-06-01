import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaSearchPlus } from 'react-icons/fa';
import { BASE_URL, getUploadsUrlCandidates } from '../../config/apiConfig';
import { getImageUrl, createImageErrorHandler } from '../../utils/imageUtils';

function RegistroFotografico({ onChange, imagenesIniciales = [] }) {
  const [fotos, setFotos] = useState([]);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const isMounted = useRef(false);
  const imagenesInicialesRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Función para procesar imágenes desde servidor
  const procesarImagenes = async (imagenesParaProcesar) => {
    if (!imagenesParaProcesar || imagenesParaProcesar.length === 0) {
      return [];
    }

    const imagenesConvertidas = await Promise.all(
      imagenesParaProcesar.map(async (imagen, index) => {
        if (typeof imagen === 'object' && imagen !== null) {
          // Si tiene ruta pero no src/base64, NO forzar fetch (puede fallar por CORS en DEV).
          // Dejamos la visualización por URL con fallback.
          if (imagen.ruta && !imagen.src && !imagen.base64) {
            const srcUrl = getUploadsUrlCandidates(imagen.ruta)[0] || null;
            return {
              ...imagen,
              ruta: imagen.ruta,
              src: srcUrl || imagen.src,
              descripcion: imagen.descripcion || ''
            };
          }
          
          // Si tiene base64 pero no src, usar base64 como src
          if (imagen.base64 && !imagen.src) {
            return {
              ...imagen,
              src: imagen.base64
            };
          }
          
          // Si ya tiene src, mantenerlo
          return imagen;
        }
        return imagen;
      })
    );

    return imagenesConvertidas;
  };

  // Efecto para sincronizar con imágenes iniciales
  useEffect(() => {
    const imagenesInicialesString = JSON.stringify(imagenesIniciales);
    const imagenesInicialesAnteriorString = JSON.stringify(imagenesInicialesRef.current);
    
    if (imagenesInicialesString !== imagenesInicialesAnteriorString) {
      imagenesInicialesRef.current = imagenesIniciales;
      
      if (imagenesIniciales && imagenesIniciales.length > 0) {
        const cargarImagenes = async () => {
          const imagenesProcesadas = await procesarImagenes(imagenesIniciales);
          setFotos(imagenesProcesadas);
        };
        cargarImagenes();
      } else if (imagenesIniciales && imagenesIniciales.length === 0) {
        setFotos([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenesIniciales]);

  const handleFotoChange = (index, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!isMounted.current) return;
        const nuevasFotos = [...fotos];
        nuevasFotos[index] = {
          ...nuevasFotos[index],
          src: ev.target.result,
          file: file,
          ruta: null // Nueva imagen, no tiene ruta aún
        };
        setFotos(nuevasFotos);
        onChange(nuevasFotos);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDescripcionChange = (index, value) => {
    if (!isMounted.current) return;
    const nuevasFotos = [...fotos];
    nuevasFotos[index] = { ...nuevasFotos[index], descripcion: value };
    setFotos(nuevasFotos);
    onChange(nuevasFotos);
  };

  const handleAddFoto = () => {
    if (!isMounted.current) return;
    setFotos([...fotos, { src: "", descripcion: "", file: null, ruta: null }]);
  };

  const handleRemoveFoto = (index) => {
    if (!isMounted.current) return;
    const nuevasFotos = fotos.filter((_, i) => i !== index);
    setFotos(nuevasFotos);
    onChange(nuevasFotos);
  };

  // Usar utilidades centralizadas de imageUtils

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
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors text-white"
          >
            <FaTimes size={24} />
          </button>
          
          <div 
            className="max-w-7xl max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imagenAmpliada.url}
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

      <div className="mb-6">
        <h2 className="font-bold mb-4 text-base text-center">REGISTRO FOTOGRÁFICO</h2>
        <div className="grid grid-cols-2 gap-6 justify-items-center">
          {fotos.map((foto, i) => {
            const imageUrl = getImageUrl(foto);
            return (
              <div key={i} className="flex flex-col items-center border border-gray-700 p-3 rounded">
                {imageUrl ? (
                  <div className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Foto ${i + 1}`}
                      className="w-72 h-56 object-cover border border-gray-400 mb-2 cursor-pointer transition-transform hover:scale-105"
                      onClick={() => setImagenAmpliada({ url: imageUrl, descripcion: foto.descripcion })}
                      onError={createImageErrorHandler(foto, (img, imagenData) => {
                        // Callback cuando todas las URLs fallan
                        const container = img.closest('.relative') || img.parentElement;
                        if (container && !container.querySelector('.image-error-message')) {
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'image-error-message w-72 h-56 rounded flex items-center justify-center';
                          errorDiv.style.backgroundColor = '#E5E7EB';
                          errorDiv.innerHTML = `
                            <span class="text-xs text-center px-2 text-gray-600">
                              Imagen no disponible<br/>
                              en el servidor
                            </span>
                          `;
                          container.appendChild(errorDiv);
                        }
                      })}
                    />
                    {/* Overlay al hacer hover */}
                    <div 
                      className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center cursor-pointer mb-2"
                      onClick={() => setImagenAmpliada({ url: imageUrl, descripcion: foto.descripcion })}
                    >
                      <FaSearchPlus 
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ fontSize: '2rem' }}
                      />
                    </div>
                  </div>
                ) : (
                <div className="w-72 h-56 bg-gray-200 rounded flex items-center justify-center text-gray-500 mb-2">
                  Sin imagen
                </div>
              )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFotoChange(i, e.target.files[0])}
              className="mb-2 text-xs"
            />
            <input
              type="text"
              value={foto.descripcion}
              onChange={(e) => handleDescripcionChange(i, e.target.value)}
              className="w-72 bg-gray-800 border-b border-gray-600 px-2 py-1 text-xs text-white mb-1 text-center"
              placeholder={`Descripción foto ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => handleRemoveFoto(i)}
              className="text-xs text-red-400 hover:text-red-600 mt-1"
            >
              Eliminar
            </button>
          </div>
          );
        })}
      </div>
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={handleAddFoto}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded"
        >
          Añadir Foto
        </button>
      </div>
      </div>
    </>
  );
}

export default function RegistroFotograficoMaquinaria({ onChange, imagenesIniciales = [] }) {
  return <RegistroFotografico onChange={onChange} imagenesIniciales={imagenesIniciales} />;
}
