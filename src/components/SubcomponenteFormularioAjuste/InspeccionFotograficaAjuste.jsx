import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCamera,
  FaUpload,
  FaTrash,
  FaCompress,
  FaArrowUp,
  FaArrowDown,
  FaGripVertical,
} from 'react-icons/fa';
import IAInteligente from './IAInteligente';
import { ImageCompression } from '../../utils/imageCompression';
import { useTheme } from '../../context/ThemeContext';
import { getImageUrl, createImageErrorHandler } from '../../utils/imageUtils';
import { isStoredFileReference } from '../../utils/storedFilePath';

const idImagen = (img, index = 0) =>
  String(img?.id ?? img?.ruta ?? img?.nombre ?? `idx-${index}`);

export default function InspeccionFotograficaAjuste({ formData, onInputChange, numeroSeccion = 4 }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const [imagenes, setImagenes] = useState(formData.imagenesInspeccion || []);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [arrastrandoId, setArrastrandoId] = useState(null);
  const [destinoArrastreId, setDestinoArrastreId] = useState(null);
  const descripcionTimeoutRef = useRef(null);

  // Usar utilidades centralizadas de imageUtils

  // ✅ OPTIMIZACIÓN: Procesamiento lazy de imágenes (NO bloquea la carga)
  // Las imágenes se cargarán cuando el navegador las necesite, no todas de golpe
  const procesarImagenesDesdeServidor = async (imagenesParaProcesar) => {
    if (!imagenesParaProcesar || imagenesParaProcesar.length === 0) {
      return [];
    }

// ✅ NO hacer fetch ahora - solo preparar las imágenes
    // getImageUrlCandidates se encargará de construir las URLs correctas
    const imagenesProcesadas = imagenesParaProcesar.map((imagen) => {
      if (typeof imagen === 'object' && imagen !== null) {
        // Si ya tiene preview, file o base64, mantenerlo (imágenes recién cargadas)
        if (imagen.preview || imagen.file || imagen.base64) {
          return imagen;
        }
        
        // Si tiene ruta, mantenerla tal cual
        // getImageUrlCandidates() construirá la URL completa cuando se necesite
        if (isStoredFileReference(imagen.ruta)) {
          return {
            ...imagen,
            // NO crear preview ahora - se creará cuando se necesite mostrar
            // Esto evita bloquear la carga con múltiples fetches
          };
        }
        
        // Si ya tiene url (compatibilidad con código antiguo), mantenerlo
        return imagen;
      }
      return imagen;
    });

return imagenesProcesadas;
  };

  // Ref para rastrear la última estructura de imágenes procesada (sin descripciones)
  const ultimaEstructuraRef = useRef(null);
  const isInternalUpdateRef = useRef(false);
  const lastFormDataRef = useRef(null);

  // Función para crear una clave única basada solo en estructura (sin descripciones)
  const getEstructuraKey = (imagenesArray) => {
    if (!imagenesArray || imagenesArray.length === 0) return '';
    return imagenesArray
      .map(img => {
        const id = img.id || img.ruta || img.nombre || '';
        return id;
      })
      .filter(Boolean)
      .sort()
      .join('|');
  };

  // Sincronizar estado local con formData.imagenesInspeccion y cargar desde servidor si es necesario
  useEffect(() => {
    // Si estamos actualizando desde el estado local, ignorar este cambio completamente
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    // Si no hay formData, limpiar
    if (!formData.imagenesInspeccion) {
      if (imagenes && imagenes.length > 0) {
        setImagenes([]);
        ultimaEstructuraRef.current = '';
        lastFormDataRef.current = null;
      }
      return;
    }

    // Crear clave de estructura actual (sin descripciones)
    const estructuraActual = getEstructuraKey(formData.imagenesInspeccion);

    // Solo procesar si la estructura cambió (nuevas imágenes o eliminadas)
    // Ignorar cambios que solo afecten descripciones
    if (ultimaEstructuraRef.current !== estructuraActual) {
      ultimaEstructuraRef.current = estructuraActual;
      lastFormDataRef.current = formData.imagenesInspeccion;

      if (formData.imagenesInspeccion.length === 0) {
        if (imagenes && imagenes.length > 0) {
          setImagenes([]);
        }
        return;
      }

      // Procesar imágenes desde servidor si tienen rutas
      const cargarImagenes = async () => {
        try {
          const imagenesProcesadas = await procesarImagenesDesdeServidor(formData.imagenesInspeccion);
          // Solo actualizar si no es una actualización interna
          if (!isInternalUpdateRef.current) {
            setImagenes(imagenesProcesadas);
          }
        } catch (error) {
          console.error('Error procesando imágenes:', error);
        }
      };
      cargarImagenes();
    }
    // Si la estructura es la misma, NO hacer nada - las descripciones se manejan en el estado local
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.imagenesInspeccion]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    setComprimiendo(true);
    
    try {
// Comprimir imágenes si es necesario
      const imagenesComprimidas = await ImageCompression.compressImages(files, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        maxSizeKB: 500
      });
      
      const nuevasImagenes = imagenesComprimidas.map(file => ({
        id: Date.now() + Math.random(),
        file: file,                    // ✅ Cambiado de 'archivo' a 'file' para compatibilidad con historialService
        preview: URL.createObjectURL(file),  // ✅ Cambiado de 'url' a 'preview' para compatibilidad
        nombre: file.name,
        descripcion: '',
        tamaño: file.size,
        tipoMime: file.type
      }));
      
      const todasLasImagenes = [...imagenes, ...nuevasImagenes];
      isInternalUpdateRef.current = true;
      setImagenes(todasLasImagenes);
      onInputChange('imagenesInspeccion', todasLasImagenes);
      
} catch (error) {
      console.error('❌ Error procesando imágenes:', error);
      alert(t('adjustment.ui.fotos.processError'));
    } finally {
      setComprimiendo(false);
    }
  };

  // Función para agregar imagen base64
  const agregarImagenBase64 = (base64String, nombre = 'Imagen') => {
    const nuevaImagen = {
      id: Date.now() + Math.random(),
      nombre: nombre,
      base64: base64String,
      descripcion: ''
    };
    
    const todasLasImagenes = [...imagenes, nuevaImagen];
    isInternalUpdateRef.current = true;
    setImagenes(todasLasImagenes);
    onInputChange('imagenesInspeccion', todasLasImagenes);
  };

  const persistirOrden = (nuevas) => {
    isInternalUpdateRef.current = true;
    setImagenes(nuevas);
    onInputChange('imagenesInspeccion', nuevas);
  };

  const eliminarImagen = (id) => {
    const clave = String(id);
    const imagenesFiltradas = imagenes.filter((img, idx) => idImagen(img, idx) !== clave);
    persistirOrden(imagenesFiltradas);
  };

  /** Mover foto una posición (como en Puertos Actas). */
  const moverImagen = (id, delta) => {
    const clave = String(id);
    const idx = imagenes.findIndex((img, i) => idImagen(img, i) === clave);
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= imagenes.length) return;
    const copia = [...imagenes];
    [copia[idx], copia[next]] = [copia[next], copia[idx]];
    persistirOrden(copia);
  };

  /** Reordenar por arrastre soltando sobre otra tarjeta. */
  const reordenarImagenes = (origenId, destinoId) => {
    if (!origenId || !destinoId || origenId === destinoId) return;
    const origenIdx = imagenes.findIndex((img, i) => idImagen(img, i) === String(origenId));
    const destinoIdx = imagenes.findIndex((img, i) => idImagen(img, i) === String(destinoId));
    if (origenIdx < 0 || destinoIdx < 0) return;
    const copia = [...imagenes];
    const [item] = copia.splice(origenIdx, 1);
    copia.splice(destinoIdx, 0, item);
    persistirOrden(copia);
  };

  const actualizarDescripcion = (id, descripcion) => {
    const clave = String(id);
    // Usar una función de actualización para evitar problemas de estado asíncrono
    setImagenes(prevImagenes => {
      const imagenesActualizadas = prevImagenes.map((img, idx) =>
        idImagen(img, idx) === clave ? { ...img, descripcion } : img
      );
      
      // Usar setTimeout para evitar múltiples actualizaciones rápidas
      // Esto previene el bug cuando se escribe rápido en el textarea
      if (descripcionTimeoutRef.current) {
        clearTimeout(descripcionTimeoutRef.current);
      }
      descripcionTimeoutRef.current = setTimeout(() => {
        // Marcar que esta es una actualización interna para evitar que el useEffect se ejecute
        isInternalUpdateRef.current = true;
        onInputChange('imagenesInspeccion', imagenesActualizadas);
      }, 300); // Debounce de 300ms
      
      return imagenesActualizadas;
    });
  };

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (descripcionTimeoutRef.current) {
        clearTimeout(descripcionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div 
        className="pb-4"
        style={{
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-2xl font-bold flex items-center"
          style={{ color: textPrimary }}
        >
          <FaCamera 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
          />
          {numeroSeccion}. {t('adjustment.ui.fotos.sectionTitle')}
        </h2>
        <p 
          className="mt-2"
          style={{ color: textSecondary }}
        >
          {t('adjustment.ui.fotos.sectionSubtitle')}
        </p>
      </div>

      {/* Campo de texto principal */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          {t('adjustment.ui.fotos.descriptionTitle')}
        </label>
        <textarea
          value={formData.descripcionInspeccion || ''}
          onChange={(e) => onInputChange('descripcionInspeccion', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-md focus:outline-none resize-vertical"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder={t('adjustment.ui.fotos.descriptionPlaceholder')}
        />
        <div 
          className="mt-2 text-sm"
          style={{ color: textSecondary }}
        >
          Mínimo recomendado: 60 palabras para describir la inspección realizada
        </div>
      </div>

      {/* IA Inteligente */}
      <IAInteligente
        textoActual={formData.descripcionInspeccion || ''}
        onTextoCambiado={(texto) => onInputChange('descripcionInspeccion', texto)}
        contextoFormulario={formData}
        tipoSeccion="descripcionInspeccion"
        tituloSeccion={t('adjustment.ui.fotos.descriptionTitle')}
      />

      {/* Carga de imágenes */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: textPrimary }}
        >
          Carga de Imágenes
        </h3>
        
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center"
          style={{
            borderColor: borderColor,
            backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB'
          }}
        >
          {comprimiendo ? (
            <div className="space-y-4">
              <FaCompress 
                className="mx-auto h-12 w-12 mb-4 animate-pulse" 
                style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
              />
              <div style={{ color: textPrimary }}>
                <p className="font-medium">{t('adjustment.ui.fotos.compressing')}</p>
                <p className="text-sm">{t('adjustment.ui.fotos.optimizing')}</p>
              </div>
              <div 
                className="w-full rounded-full h-2"
                style={{ backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB' }}
              >
                <div 
                  className="h-2 rounded-full animate-pulse" 
                  style={{
                    width: '60%',
                    backgroundColor: theme === 'dark' ? '#C084FC' : '#9333EA'
                  }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <FaUpload 
                className="mx-auto h-12 w-12 mb-4" 
                style={{ color: textSecondary }}
              />
              <div 
                className="mb-4"
                style={{ color: textPrimary }}
              >
                <p className="font-medium">{t('adjustment.ui.fotos.dragDrop')}</p>
                <p className="text-sm">{t('adjustment.ui.fotos.orClick')}</p>
                <p 
                  className="text-xs mt-1"
                  style={{ color: textSecondary }}
                >
                  Las imágenes se comprimirán automáticamente
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={comprimiendo}
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 rounded-lg cursor-pointer transition-colors"
                style={{
                  backgroundColor: comprimiendo 
                    ? (theme === 'dark' ? '#3A3A3A' : '#9CA3AF')
                    : (theme === 'dark' ? 'rgba(168, 85, 247, 0.2)' : '#9333EA'),
                  color: comprimiendo 
                    ? (theme === 'dark' ? '#B0B0B0' : '#FFFFFF')
                    : (theme === 'dark' ? '#C084FC' : '#FFFFFF'),
                  cursor: comprimiendo ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!comprimiendo) {
                    e.target.style.backgroundColor = theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : '#7C3AED';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!comprimiendo) {
                    e.target.style.backgroundColor = theme === 'dark' ? 'rgba(168, 85, 247, 0.2)' : '#9333EA';
                  }
                }}
              >
                {comprimiendo ? t('adjustment.ui.fotos.processing') : t('adjustment.ui.fotos.selectImages')}
              </label>
            </>
          )}
        </div>

        {/* Botón para agregar imagen base64 */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              const base64String = prompt('Pega aquí la imagen en formato base64 (data:image/...):');
              if (base64String && base64String.startsWith('data:image')) {
                agregarImagenBase64(base64String, 'Imagen del Formulario');
} else if (base64String) {
                alert('Por favor, pega una imagen válida en formato base64 (debe comenzar con "data:image/...")');
              }
            }}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A',
              color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#15803D';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A';
            }}
          >
            📸 Agregar Imagen Base64
          </button>
          <p 
            className="text-xs mt-2"
            style={{ color: textSecondary }}
          >
            Usa este botón si tienes una imagen en formato base64 que quieres agregar
          </p>
        </div>

        {/* Lista de imágenes */}
        {imagenes.length > 0 && (
          <div className="mt-6">
            <h4 
              className="font-medium mb-3"
              style={{ color: textPrimary }}
            >
              Imágenes Cargadas ({imagenes.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imagenes.map((imagen, index) => {
                const imageUrl = getImageUrl(imagen);
                const clave = idImagen(imagen, index);
                const esOrigen = arrastrandoId === clave;
                const esDestino = destinoArrastreId === clave && arrastrandoId && arrastrandoId !== clave;
                return (
                  <div 
                    key={clave} 
                    className="rounded-lg p-3 relative transition-shadow"
                    draggable
                    onDragStart={(e) => {
                      setArrastrandoId(clave);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', clave);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (arrastrandoId && arrastrandoId !== clave) {
                        setDestinoArrastreId(clave);
                      }
                    }}
                    onDragLeave={() => {
                      if (destinoArrastreId === clave) setDestinoArrastreId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const origenId = e.dataTransfer.getData('text/plain') || arrastrandoId;
                      reordenarImagenes(origenId, clave);
                      setArrastrandoId(null);
                      setDestinoArrastreId(null);
                    }}
                    onDragEnd={() => {
                      setArrastrandoId(null);
                      setDestinoArrastreId(null);
                    }}
                    style={{
                      border: `2px solid ${esDestino ? (theme === 'dark' ? '#C084FC' : '#9333EA') : borderColor}`,
                      backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                      opacity: esOrigen ? 0.55 : 1,
                      cursor: 'grab',
                      boxShadow: esDestino
                        ? (theme === 'dark' ? '0 0 0 2px rgba(192,132,252,0.35)' : '0 0 0 2px rgba(147,51,234,0.25)')
                        : undefined,
                    }}
                  >
                    <div
                      className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs pointer-events-none"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.9)',
                        color: textSecondary,
                      }}
                      title={t('adjustment.ui.fotos.dragToReorder')}
                    >
                      <FaGripVertical className="h-3 w-3" />
                      <span>{index + 1}</span>
                    </div>
                    <div className="relative">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={imagen.nombre}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer"
                          draggable={false}
                          onClick={() => setImagenSeleccionada(imagen)}
                          onError={createImageErrorHandler(imagen, (img) => {
                            // Callback personalizado cuando todas las URLs fallan
                            const container = img.closest('.relative');
                            if (container && !container.querySelector('.image-error-message')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'image-error-message w-full h-32 rounded-lg flex items-center justify-center';
                              errorDiv.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
                              errorDiv.innerHTML = `<span class="text-xs text-center px-2" style="color: ${textSecondary}">${t('adjustment.ui.fotos.imageUnavailable')}</span>`;
                              container.appendChild(errorDiv);
                            }
                          })}
                        />
                      ) : (
                        <div 
                          className="w-full h-32 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB'
                          }}
                        >
                          <span 
                            className="text-sm"
                            style={{ color: textSecondary }}
                          >
                            Error al cargar imagen
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moverImagen(clave, -1);
                          }}
                          disabled={index === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(30,30,30,0.85)',
                            color: '#FFFFFF',
                          }}
                          title={t('adjustment.ui.fotos.moveUp')}
                        >
                          <FaArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moverImagen(clave, 1);
                          }}
                          disabled={index === imagenes.length - 1}
                          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(30,30,30,0.85)',
                            color: '#FFFFFF',
                          }}
                          title={t('adjustment.ui.fotos.moveDown')}
                        >
                          <FaArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarImagen(clave);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                          style={{
                            backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.85)' : '#EF4444',
                            color: '#FFFFFF',
                          }}
                          title={t('adjustment.ui.fotos.deletePhoto')}
                        >
                          <FaTrash className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p 
                        className="text-sm font-medium truncate"
                        style={{ color: textPrimary }}
                      >
                        {imagen.nombre}
                      </p>
                      <textarea
                        value={imagen.descripcion || ''}
                        onChange={(e) => {
                          e.stopPropagation(); // Prevenir propagación de eventos
                          actualizarDescripcion(clave, e.target.value);
                        }}
                        onBlur={(e) => {
                          // Forzar actualización al perder el foco
                          if (descripcionTimeoutRef.current) {
                            clearTimeout(descripcionTimeoutRef.current);
                          }
                          const nuevaDescripcion = e.target.value;
                          setImagenes(prevImagenes => {
                            const imagenesActualizadas = prevImagenes.map((img, idx) =>
                              idImagen(img, idx) === clave ? { ...img, descripcion: nuevaDescripcion } : img
                            );
                            // Marcar que esta es una actualización interna para evitar que el useEffect se ejecute
                            isInternalUpdateRef.current = true;
                            onInputChange('imagenesInspeccion', imagenesActualizadas);
                            return imagenesActualizadas;
                          });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder={t('adjustment.ui.fotos.imageDescriptionPlaceholder')}
                        className="w-full mt-1 px-2 py-1 text-xs rounded resize-none focus:outline-none"
                        style={{
                          backgroundColor: inputBg,
                          color: textPrimary,
                          borderColor: borderColor,
                          border: `1px solid ${borderColor}`
                        }}
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {imagenes.length > 1 && (
              <p
                className="text-center text-xs mt-3"
                style={{ color: textSecondary }}
              >
                El orden que definas aquí es el mismo que aparecerá en el documento Word.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de vista previa */}
      {imagenSeleccionada && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div 
            className="rounded-lg p-4 max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 
                className="text-lg font-semibold"
                style={{ color: textPrimary }}
              >
                {imagenSeleccionada.nombre}
              </h3>
              <button
                onClick={() => setImagenSeleccionada(null)}
                style={{ color: textSecondary }}
                onMouseEnter={(e) => {
                  e.target.style.color = textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = textSecondary;
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={getImageUrl(imagenSeleccionada)}
              alt={imagenSeleccionada.nombre}
              className="w-full rounded-lg"
              onError={createImageErrorHandler(imagenSeleccionada, (img) => {
                // Callback personalizado cuando todas las URLs fallan
                const container = img.parentElement;
                if (container && !container.querySelector('.image-error-message')) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'image-error-message w-full py-8 rounded-lg flex items-center justify-center';
                  errorDiv.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
                  errorDiv.innerHTML = `<span style="color: ${textSecondary}">${t('adjustment.ui.fotos.imageUnavailable')}</span>`;
                  container.appendChild(errorDiv);
                }
              })}
            />
            <div className="mt-4">
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: textPrimary }}
              >
                Descripción de la imagen
              </label>
              <textarea
                value={imagenSeleccionada.descripcion || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  actualizarDescripcion(imagenSeleccionada.id, e.target.value);
                }}
                onBlur={(e) => {
                  // Forzar actualización al perder el foco
                  if (descripcionTimeoutRef.current) {
                    clearTimeout(descripcionTimeoutRef.current);
                  }
                  const nuevaDescripcion = e.target.value;
                  setImagenes(prevImagenes => {
                    const imagenesActualizadas = prevImagenes.map(img => 
                      img.id === imagenSeleccionada.id ? { ...img, descripcion: nuevaDescripcion } : img
                    );
                    // Marcar que esta es una actualización interna para evitar que el useEffect se ejecute
                    isInternalUpdateRef.current = true;
                    onInputChange('imagenesInspeccion', imagenesActualizadas);
                    return imagenesActualizadas;
                  });
                }}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                rows={3}
                placeholder={t('adjustment.ui.fotos.observePlaceholder')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Validación de calidad */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: theme === 'dark' ? 'rgba(234, 179, 8, 0.15)' : '#FEF9C3',
          border: `1px solid ${theme === 'dark' ? 'rgba(234, 179, 8, 0.3)' : '#FDE047'}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: theme === 'dark' ? '#FDE047' : '#854D0E' }}
        >
          📊 Validación de Calidad
        </h3>
        <div 
          className="text-sm"
          style={{ color: theme === 'dark' ? '#FDE047' : '#854D0E' }}
        >
          <p className="mb-2">
            <strong>{t('adjustment.ui.fotos.recommendationsTitle')}:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>{t('adjustment.ui.fotos.tip1')}</li>
            <li>{t('adjustment.ui.fotos.tip2')}</li>
            <li>{t('adjustment.ui.fotos.tip3')}</li>
            <li>{t('adjustment.ui.fotos.tip4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
