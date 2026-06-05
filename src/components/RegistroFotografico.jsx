import React, { useState, useEffect, useRef, useId } from "react";
import { useTheme } from '../context/ThemeContext';
import { FaTimes, FaSearchPlus, FaUpload, FaCompress } from 'react-icons/fa';
import { getUploadsUrlCandidates } from '../config/apiConfig';
import { getImageUrl, createImageErrorHandler } from '../utils/imageUtils';
import { ImageCompression } from '../utils/imageCompression';
import { debug } from '../utils/appLogger.js';

export default function RegistroFotografico({
  onChange,
  imagenesIniciales = [],
  tituloSeccion = "17. REGISTRO FOTOGRÁFICO",
}) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const placeholderBg = theme === 'dark' ? '#1F1F1F' : '#E5E7EB';
  const [imagenes, setImagenes] = useState([]);
  const [inicializado, setInicializado] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const imagenesInicialesRef = useRef(null);
  const isProcessingRef = useRef(false);
  const isInternalUpdateRef = useRef(false);
  const isMountedRef = useRef(false);
  const inputId = useId();
  const dragDepthRef = useRef(0);

  const [comprimiendo, setComprimiendo] = useState(false);
  const [zonaArrastreActiva, setZonaArrastreActiva] = useState(false);

  const obtenerIdentificadorImagen = (img, index) => {
    if (!img || typeof img !== 'object') return `idx-${index}`;
    return (
      img.id ||
      img.ruta ||
      img.nombre ||
      img.file?.name ||
      (typeof img.preview === 'string' ? `preview-${img.preview.slice(0, 80)}` : null) ||
      (typeof img.base64 === 'string' ? `base64-${img.base64.slice(0, 80)}` : null) ||
      `idx-${index}`
    );
  };

  const normalizarImagenLegacy = (imagen, index) => {
    if (!imagen || typeof imagen !== 'object') return imagen;

    const fileComoBase64 = typeof imagen.file === 'string' && imagen.file.startsWith('data:')
      ? imagen.file
      : null;

    const previewNormalizado = imagen.preview ||
      imagen.base64 ||
      fileComoBase64 ||
      (imagen.ruta ? (getUploadsUrlCandidates(imagen.ruta)[0] || null) : null);

    const base64Normalizado = imagen.base64 ||
      fileComoBase64 ||
      (typeof previewNormalizado === 'string' && previewNormalizado.startsWith('data:')
        ? previewNormalizado
        : null);

    return {
      ...imagen,
      id: imagen.id || obtenerIdentificadorImagen(imagen, index),
      descripcion: imagen.descripcion || '',
      preview: previewNormalizado || null,
      base64: base64Normalizado || null,
    };
  };

  // Función para procesar imágenes (reutilizable)
  const procesarImagenes = async (imagenesParaProcesar) => {
    if (!imagenesParaProcesar || imagenesParaProcesar.length === 0) {
      return [];
    }
    
    const imagenesConvertidas = await Promise.all(
      imagenesParaProcesar.map(async (imagen, index) => normalizarImagenLegacy(imagen, index))
    );
    
    return imagenesConvertidas;
  };

  // Efecto para inicializar al montar el componente
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      debug('🔄 RegistroFotografico: Componente montado, imágenes iniciales:', imagenesIniciales?.length || 0);
      
      // Si hay imágenes iniciales al montar, procesarlas inmediatamente
      if (imagenesIniciales && imagenesIniciales.length > 0 && !inicializado) {
        isProcessingRef.current = true;
        const cargarImagenes = async () => {
          try {
            debug('🔄 RegistroFotografico: Procesando imágenes en montaje inicial...');
            const imagenesProcesadas = await procesarImagenes(imagenesIniciales);
            debug('✅ RegistroFotografico: Imágenes procesadas en montaje:', imagenesProcesadas.length);
            setImagenes(imagenesProcesadas);
            setInicializado(true);
            imagenesInicialesRef.current = imagenesIniciales;
          } catch (error) {
            console.error('❌ Error procesando imágenes en montaje:', error);
          } finally {
            isProcessingRef.current = false;
          }
        };
        cargarImagenes();
      } else if (imagenesIniciales && imagenesIniciales.length === 0) {
        setImagenes([]);
        setInicializado(true);
        imagenesInicialesRef.current = [];
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función para crear una clave única basada solo en estructura (sin preview/base64)
  const getEstructuraKey = (imagenesArray) => {
    if (!imagenesArray || imagenesArray.length === 0) return '';
    return imagenesArray
      .map((img, index) => obtenerIdentificadorImagen(img, index))
      .filter(Boolean)
      .sort()
      .join('|');
  };

  // Efecto para sincronizar con imágenes iniciales (se ejecuta cuando cambian)
  useEffect(() => {
    // Si estamos actualizando desde el estado local, ignorar este cambio
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    // Si estamos procesando, no hacer nada
    if (isProcessingRef.current) {
      return;
    }

    // Comparar estructura (sin preview/base64) en lugar de JSON completo
    const estructuraActual = getEstructuraKey(imagenesIniciales);
    const estructuraAnterior = getEstructuraKey(imagenesInicialesRef.current);
    
    // Verificar si las imágenes tienen datos nuevos (preview/base64) que no están en el estado actual
    const tieneDatosNuevos = imagenesIniciales && imagenesIniciales.length > 0 && 
      imagenesIniciales.some((img, idx) => {
        const imgActual = imagenes[idx];
        // Si la imagen tiene preview/base64 pero el estado actual no, necesita procesarse
        return (img.preview || img.base64) && (!imgActual || (!imgActual.preview && !imgActual.base64));
      });
    
    // Procesar si la estructura cambió O si hay datos nuevos que no están procesados
    if (estructuraActual !== estructuraAnterior || (tieneDatosNuevos && !inicializado)) {
      imagenesInicialesRef.current = imagenesIniciales;
      
      if (imagenesIniciales && imagenesIniciales.length > 0) {
        isProcessingRef.current = true;
        debug('🔄 RegistroFotografico: Procesando imágenes iniciales...', {
          cantidad: imagenesIniciales.length,
          estructuraCambio: estructuraActual !== estructuraAnterior,
          datosNuevos: tieneDatosNuevos
        });
        
        const cargarImagenes = async () => {
          try {
            const imagenesProcesadas = await procesarImagenes(imagenesIniciales);
            debug('✅ RegistroFotografico: Imágenes procesadas:', imagenesProcesadas.length);
            setImagenes(imagenesProcesadas);
            setInicializado(true);
          } catch (error) {
            console.error('❌ Error procesando imágenes:', error);
          } finally {
            isProcessingRef.current = false;
          }
        };
        cargarImagenes();
      } else if (imagenesIniciales && imagenesIniciales.length === 0) {
        // Si las imágenes iniciales están vacías, limpiar el estado
        setImagenes([]);
        setInicializado(true);
        imagenesInicialesRef.current = [];
      }
    } else if (!inicializado && imagenesIniciales && imagenesIniciales.length > 0) {
      // Si no está inicializado pero hay imágenes, procesarlas de todas formas
      isProcessingRef.current = true;
      debug('🔄 RegistroFotografico: Inicializando con imágenes existentes...');
      
      const cargarImagenes = async () => {
        try {
          const imagenesProcesadas = await procesarImagenes(imagenesIniciales);
          debug('✅ RegistroFotografico: Imágenes inicializadas:', imagenesProcesadas.length);
          setImagenes(imagenesProcesadas);
          setInicializado(true);
        } catch (error) {
          console.error('❌ Error inicializando imágenes:', error);
        } finally {
          isProcessingRef.current = false;
        }
      };
      cargarImagenes();
    } else if (!inicializado) {
      setInicializado(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenesIniciales]);

  // Efecto separado para notificar cambios (solo cuando el usuario modifica las imágenes, no cuando vienen del padre)
  useEffect(() => {
    // No notificar si estamos procesando o si es una actualización interna
    if (isProcessingRef.current || isInternalUpdateRef.current) {
      return;
    }

    // Solo notificar si ya está inicializado y las imágenes no son las mismas que las iniciales
    // Esto evita loops infinitos
    if (inicializado && typeof onChange === 'function') {
      // Comparar estructura en lugar de JSON completo para evitar falsos positivos
      const estructuraActual = getEstructuraKey(imagenes);
      const estructuraInicial = getEstructuraKey(imagenesIniciales);
      
      // Solo notificar si la estructura cambió (usuario agregó/eliminó/modificó imágenes)
      if (estructuraActual !== estructuraInicial) {
        // Marcar como actualización interna ANTES de llamar onChange
        // Esto previene que el primer useEffect se ejecute cuando el padre actualice imagenesIniciales
        isInternalUpdateRef.current = true;
        
        // Llamar onChange de forma asíncrona para evitar problemas de timing
        Promise.resolve().then(() => {
          onChange(imagenes);
          // Resetear el flag después de que React procese la actualización
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 100);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenes, inicializado]);

  // Función para convertir archivo a base64
  const convertirArchivoABase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      alert('Por favor selecciona archivos de imagen válidos.');
      return;
    }

    setComprimiendo(true);
    try {
      const comprimidos = await ImageCompression.compressImages(files, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        maxSizeKB: 500,
      });

      const nuevas = await Promise.all(
        comprimidos.map(async (file) => {
          const base64 = await convertirArchivoABase64(file);
          return {
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            base64,
            descripcion: '',
            nombre: file.name,
          };
        })
      );

      setImagenes((prev) => [...prev, ...nuevas]);
    } catch (error) {
      console.error('❌ Error al procesar imágenes:', error);
      alert('Error al procesar las imágenes. Inténtalo de nuevo.');
    } finally {
      setComprimiendo(false);
    }
  };

  const onFileInputChange = (e) => {
    const { files } = e.target;
    if (files?.length) {
      void handleFilesSelected(files);
    }
    e.target.value = '';
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setZonaArrastreActiva(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setZonaArrastreActiva(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setZonaArrastreActiva(false);
    if (comprimiendo) return;
    const dropped = e.dataTransfer?.files;
    if (dropped?.length) {
      void handleFilesSelected(dropped);
    }
  };

  const handleDescripcionChange = (index, value) => {
    setImagenes(prev => prev.map((img, i) => 
      i === index ? { ...img, descripcion: value } : img
    ));
  };

  const eliminarImagen = (index) => {
    setImagenes(prev => prev.filter((_, i) => i !== index));
  };

  // Usar utilidades centralizadas de imageUtils (getImageUrl ya está importado)

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
              src={imagenAmpliada.url}
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
        <h2 
          className="text-xl font-bold mb-4"
          style={{ color: textPrimary }}
        >
          {tituloSeccion}
        </h2>

        <div
          className="border-2 border-dashed rounded-lg p-6 text-center mb-6 transition-colors"
          style={{
            borderColor: zonaArrastreActiva
              ? (theme === 'dark' ? '#A855F7' : '#7C3AED')
              : borderColor,
            backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
          }}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {comprimiendo ? (
            <div className="space-y-3">
              <FaCompress
                className="mx-auto h-10 w-10 animate-pulse"
                style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
              />
              <p className="font-medium text-sm" style={{ color: textPrimary }}>
                Comprimiendo imágenes…
              </p>
            </div>
          ) : (
            <>
              <FaUpload className="mx-auto h-10 w-10 mb-3" style={{ color: textSecondary }} />
              <div className="mb-4" style={{ color: textPrimary }}>
                <p className="font-medium">Arrastra y suelta las imágenes aquí</p>
                <p className="text-sm" style={{ color: textSecondary }}>
                  o haz clic para seleccionar varias a la vez
                </p>
                <p className="text-xs mt-1" style={{ color: textSecondary }}>
                  Se comprimen automáticamente para un guardado más liviano
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                id={inputId}
                className="hidden"
                disabled={comprimiendo}
                onChange={onFileInputChange}
              />
              <label
                htmlFor={inputId}
                className="inline-block px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.25)' : '#2563EB',
                  color: theme === 'dark' ? '#93C5FD' : '#FFFFFF',
                }}
              >
                Seleccionar imágenes
              </label>
            </>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {imagenes.length === 0 && inicializado ? (
            <p style={{ color: textSecondary, fontStyle: 'italic' }}>
              No hay imágenes aún. Usa el cuadro de arriba para agregar fotos.
            </p>
          ) : null}
          {imagenes.map((img, index) => {
              const imageUrl = getImageUrl(img);
              
              if (!imageUrl) {
                console.warn(`⚠️ RegistroFotografico: Imagen ${index} no tiene URL válida:`, {
                  tienePreview: !!img.preview,
                  tieneBase64: !!img.base64,
                  tieneRuta: !!img.ruta,
                  img: img
                });
              }
              
              return (
                <div 
                  key={img.id || img.ruta || `reg-${index}`} 
                  className="rounded p-2 shadow-sm"
                  style={{
                    border: `1px solid ${borderColor}`
                  }}
                >
                  {imageUrl ? (
                    <div className="relative group">
                      <img
                        src={imageUrl}
                        alt={`foto-${index}`}
                        className="w-full h-40 object-cover rounded cursor-pointer transition-transform hover:scale-105"
                        style={{
                          border: `1px solid ${borderColor}`
                        }}
                        onClick={() => setImagenAmpliada({ url: imageUrl, descripcion: img.descripcion })}
                        onError={createImageErrorHandler(img, (imgElement, imagenData) => {
                          // Callback cuando todas las URLs fallan
                          const container = imgElement.closest('.relative') || imgElement.parentElement;
                          if (container && !container.querySelector('.image-error-message')) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'image-error-message w-full h-40 rounded flex items-center justify-center';
                            errorDiv.style.backgroundColor = placeholderBg;
                            errorDiv.innerHTML = `
                              <span class="text-xs text-center px-2" style="color: ${textSecondary}">
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
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center cursor-pointer rounded"
                        onClick={() => setImagenAmpliada({ url: imageUrl, descripcion: img.descripcion })}
                      >
                        <FaSearchPlus 
                          className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ fontSize: '2rem' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="w-full h-40 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: placeholderBg,
                        color: textSecondary
                      }}
                    >
                      Sin imagen
                    </div>
                  )}
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => eliminarImagen(index)}
                    className="px-3 py-1 rounded text-sm"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#EF4444',
                      color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = theme === 'dark' ? 'rgba(220, 38, 38, 0.3)' : '#DC2626';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#EF4444';
                    }}
                  >
                    Eliminar
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Descripción de la imagen"
                  value={img.descripcion}
                  onChange={(e) => handleDescripcionChange(index, e.target.value)}
                  className="mt-2 w-full rounded px-2 py-1 text-sm"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
