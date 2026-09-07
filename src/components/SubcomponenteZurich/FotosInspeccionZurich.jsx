import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowDown,
  FaArrowUp,
  FaCamera,
  FaCloudUploadAlt,
  FaCompress,
  FaGripVertical,
  FaTrash,
} from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { getImageUrl, createImageErrorHandler } from '../../utils/imageUtils';
import { ImageCompression } from '../../utils/imageCompression.js';
import { ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA } from '../../utils/heicToJpeg.js';
import LazyGatedImage from '../shared/LazyGatedImage.jsx';
import StorageLazyImage from '../shared/StorageLazyImage.jsx';
import { resolverUrlImagen } from '../../services/storageSignedUrl.js';
import { zurichArchivosApi } from './zurichArchivosApi.js';

/** Subidas en paralelo sin saturar el proxy (no afecta el Word). */
const SUBIDA_PARALELO = 3;

const idImagen = (img, index = 0) =>
  String(img?.id ?? img?._id ?? img?.localId ?? img?.ruta ?? `idx-${index}`);

const esImagenFile = (file) => {
  if (!file) return false;
  if (file.type?.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name || '');
};

/**
 * Galería del informe único Zurich: preview local inmediata y subida en segundo plano.
 */
export default function FotosInspeccionZurich({
  casoId,
  origen = 'cat',
  api: apiProp = null,
  fotosInforme = [],
  onFotosInformeChange,
  onArchivoCreado,
  onArchivoEliminado,
  inputIdPrefix = 'zurich-foto',
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const api = useMemo(() => apiProp || zurichArchivosApi(origen), [apiProp, origen]);
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const [imagenes, setImagenes] = useState(() =>
    Array.isArray(fotosInforme) ? fotosInforme : []
  );
  const [comprimiendo, setComprimiendo] = useState(false);
  const [arrastrandoId, setArrastrandoId] = useState(null);
  const [destinoArrastreId, setDestinoArrastreId] = useState(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const isInternalUpdateRef = useRef(false);
  const ultimaEstructuraRef = useRef('');
  const descripcionTimeoutRef = useRef(null);

  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const incoming = Array.isArray(fotosInforme) ? fotosInforme : [];
    const clave = incoming.map((img, idx) => idImagen(img, idx)).join('|');
    if (clave === ultimaEstructuraRef.current) return;
    const localesConPreview = imagenes.filter((i) => i.preview || i.file || i.base64);
    if (localesConPreview.length > incoming.length) return;
    ultimaEstructuraRef.current = clave;
    setImagenes(incoming);
  }, [fotosInforme]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistir = (nuevas) => {
    isInternalUpdateRef.current = true;
    ultimaEstructuraRef.current = nuevas.map((img, idx) => idImagen(img, idx)).join('|');
    setImagenes(nuevas);
    queueMicrotask(() => {
      onFotosInformeChange?.(nuevas);
    });
  };

  const subirAlServidor = async (item) => {
    if (!casoId || !item?.file) return item;
    try {
      let file = item.file;
      try {
        const [compressed] = await ImageCompression.compressImages([file], {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.82,
          maxSizeKB: 800,
        });
        if (compressed) file = compressed;
      } catch {
        /* keep original */
      }
      const creado = await api.subir(casoId, file, 'FOTOS', {
        descripcion: item.descripcion || '',
      });
      onArchivoCreado?.(creado);
      return {
        ...item,
        _id: creado?._id || item._id,
        ruta: creado?.ruta || item.ruta,
        nombre: creado?.nombreOriginal || item.nombre,
        nombreOriginal: creado?.nombreOriginal || item.nombreOriginal || item.nombre,
        tipoMime: creado?.tipoMime || item.tipoMime,
        etiqueta: creado?.etiqueta || 'FOTOS',
        subiendo: false,
        error: '',
      };
    } catch (err) {
      console.error(err);
      return {
        ...item,
        subiendo: false,
        error: err.message || 'Error al subir',
      };
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter(esImagenFile);
    event.target.value = '';
    if (!files.length) return;
    if (!casoId) {
      alert(t('zurich.reportUnique.savedCaseRequired'));
      return;
    }

    setComprimiendo(true);
    try {
      let listos = files;
      try {
        listos = await ImageCompression.compressImages(files, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
          maxSizeKB: 500,
        });
      } catch {
        listos = files;
      }

      const nuevasImagenes = listos.map((file, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
        nombre: file.name || `foto-${idx + 1}.jpg`,
        nombreOriginal: file.name || `foto-${idx + 1}.jpg`,
        descripcion: '',
        tamaño: file.size,
        tipoMime: file.type || 'image/jpeg',
        etiqueta: 'FOTOS',
        subiendo: true,
        error: '',
      }));

      persistir([...imagenes, ...nuevasImagenes]);

      const aplicarSubida = (nueva, actualizada) => {
        setImagenes((prev) => {
          const next = prev.map((img) =>
            img.id === nueva.id ? { ...img, ...actualizada, preview: img.preview } : img
          );
          isInternalUpdateRef.current = true;
          ultimaEstructuraRef.current = next.map((img, idx) => idImagen(img, idx)).join('|');
          queueMicrotask(() => onFotosInformeChange?.(next));
          return next;
        });
      };

      for (let i = 0; i < nuevasImagenes.length; i += SUBIDA_PARALELO) {
        const lote = nuevasImagenes.slice(i, i + SUBIDA_PARALELO);
        await Promise.all(
          lote.map(async (nueva) => {
            const actualizada = await subirAlServidor(nueva);
            aplicarSubida(nueva, actualizada);
          })
        );
      }
    } catch (error) {
      console.error('❌ Error procesando imágenes Zurich:', error);
      alert(t('adjustment.ui.fotos.processError'));
    } finally {
      setComprimiendo(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (!dt?.files?.length) return;
    await handleImageUpload({ target: { files: dt.files, value: '' } });
  };

  const eliminarImagen = async (id) => {
    const clave = String(id);
    const img = imagenes.find((x, idx) => idImagen(x, idx) === clave);
    if (img?._id && casoId) {
      try {
        await api.eliminar(casoId, img._id);
        onArchivoEliminado?.(img._id);
      } catch (err) {
        console.error(err);
      }
    }
    if (img?.preview?.startsWith?.('blob:')) {
      try {
        URL.revokeObjectURL(img.preview);
      } catch {
        /* ignore */
      }
    }
    persistir(imagenes.filter((x, idx) => idImagen(x, idx) !== clave));
  };

  const moverImagen = (id, delta) => {
    const clave = String(id);
    const idx = imagenes.findIndex((img, i) => idImagen(img, i) === clave);
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= imagenes.length) return;
    const copia = [...imagenes];
    [copia[idx], copia[next]] = [copia[next], copia[idx]];
    persistir(copia);
  };

  const reordenarImagenes = (origenId, destinoId) => {
    if (!origenId || !destinoId || origenId === destinoId) return;
    const origenIdx = imagenes.findIndex((img, i) => idImagen(img, i) === String(origenId));
    const destinoIdx = imagenes.findIndex((img, i) => idImagen(img, i) === String(destinoId));
    if (origenIdx < 0 || destinoIdx < 0) return;
    const copia = [...imagenes];
    const [item] = copia.splice(origenIdx, 1);
    copia.splice(destinoIdx, 0, item);
    persistir(copia);
  };

  const actualizarDescripcion = (id, descripcion) => {
    const clave = String(id);
    setImagenes((prev) => {
      const next = prev.map((img, idx) =>
        idImagen(img, idx) === clave ? { ...img, descripcion } : img
      );
      if (descripcionTimeoutRef.current) clearTimeout(descripcionTimeoutRef.current);
      descripcionTimeoutRef.current = setTimeout(() => {
        isInternalUpdateRef.current = true;
        onFotosInformeChange?.(next);
        const foto = next.find((img, idx) => idImagen(img, idx) === clave);
        if (foto?._id && casoId) {
          Promise.resolve(api.actualizar?.(casoId, foto._id, { descripcion })).catch(() => {});
        }
      }, 300);
      return next;
    });
  };

  useEffect(
    () => () => {
      if (descripcionTimeoutRef.current) clearTimeout(descripcionTimeoutRef.current);
    },
    []
  );

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
    >
      <div
        className="rounded-lg border-2 border-dashed p-6 text-center"
        style={{
          borderColor,
          backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {comprimiendo ? (
          <div className="space-y-4">
            <FaCompress
              className="mx-auto mb-4 h-12 w-12 animate-pulse"
              style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
            />
            <div style={{ color: textPrimary }}>
              <p className="font-medium">{t('adjustment.ui.fotos.compressing')}</p>
              <p className="text-sm">{t('adjustment.ui.fotos.optimizing')}</p>
            </div>
          </div>
        ) : (
          <>
            <FaCloudUploadAlt
              className="mx-auto mb-4 h-12 w-12"
              style={{ color: textSecondary }}
            />
            <div className="mb-4" style={{ color: textPrimary }}>
              <p className="font-medium">
                {t('zurich.reportUnique.photosDropTitle', {
                  defaultValue: 'Arrastra y suelta imágenes aquí o haz clic para seleccionar',
                })}
              </p>
              <p className="text-sm" style={{ color: textSecondary }}>
                {t('zurich.reportUnique.photosDropSubtitle', {
                  defaultValue: 'La vista previa aparece al instante; se guardan en el caso.',
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <input
                id={`${inputIdPrefix}-camara`}
                type="file"
                accept={ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA}
                capture="environment"
                className="hidden"
                disabled={comprimiendo}
                onChange={handleImageUpload}
              />
              <input
                id={`${inputIdPrefix}-galeria`}
                type="file"
                accept={ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA}
                multiple
                className="hidden"
                disabled={comprimiendo}
                onChange={handleImageUpload}
              />
              <label
                htmlFor={`${inputIdPrefix}-camara`}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-white"
                style={{ backgroundColor: '#2563EB' }}
              >
                <FaCamera />
                Tomar foto
              </label>
              <label
                htmlFor={`${inputIdPrefix}-galeria`}
                className="inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-white"
                style={{ backgroundColor: '#9333EA' }}
              >
                {t('adjustment.ui.fotos.selectImages')}
              </label>
            </div>
          </>
        )}
      </div>

      {imagenes.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 font-medium" style={{ color: textPrimary }}>
            Imágenes cargadas ({imagenes.length})
          </h4>
          <p className="mb-3 text-xs" style={{ color: textSecondary }}>
            Las miniaturas se cargan por tandas al hacer scroll; el informe Word usa las fotos
            completas igual que antes.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {imagenes.map((imagen, index) => {
              const imageUrl = getImageUrl(imagen) || api.url(imagen.ruta);
              const clave = idImagen(imagen, index);
              const esOrigen = arrastrandoId === clave;
              const esDestino =
                destinoArrastreId === clave && arrastrandoId && arrastrandoId !== clave;
              const esPreviewLocal = Boolean(
                imagen.preview ||
                  (typeof imageUrl === 'string' &&
                    (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')))
              );
              return (
                <div
                  key={clave}
                  className="relative rounded-lg p-3 transition-shadow"
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
                    border: `2px solid ${
                      esDestino ? (theme === 'dark' ? '#C084FC' : '#9333EA') : borderColor
                    }`,
                    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                    opacity: esOrigen ? 0.55 : 1,
                    cursor: 'grab',
                  }}
                >
                  <div
                    className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs"
                    style={{
                      backgroundColor:
                        theme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.9)',
                      color: textSecondary,
                    }}
                  >
                    <FaGripVertical className="h-3 w-3" />
                    <span>#{index + 1}</span>
                  </div>
                  <div className="relative">
                    {imageUrl || imagen.ruta ? (
                      esPreviewLocal ? (
                        <LazyGatedImage
                          src={imageUrl}
                          alt={imagen.nombre}
                          className="h-32 w-full cursor-pointer overflow-hidden rounded-lg"
                          draggable={false}
                          onClick={() => setImagenSeleccionada(imagen)}
                          onError={createImageErrorHandler(imagen, () => {})}
                        />
                      ) : (
                        <StorageLazyImage
                          imagen={imagen}
                          alt={imagen.nombre}
                          className="h-32 w-full cursor-pointer overflow-hidden rounded-lg"
                          draggable={false}
                          onClick={() => setImagenSeleccionada(imagen)}
                          onError={createImageErrorHandler(imagen, () => {})}
                        />
                      )
                    ) : (
                      <div
                        className="flex h-32 w-full items-center justify-center rounded-lg"
                        style={{ backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB' }}
                      >
                        <span className="text-sm" style={{ color: textSecondary }}>
                          Sin vista previa
                        </span>
                      </div>
                    )}
                    <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moverImagen(clave, -1);
                        }}
                        disabled={index === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-white disabled:opacity-40"
                        style={{ backgroundColor: 'rgba(30,30,30,0.85)' }}
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
                        className="flex h-7 w-7 items-center justify-center rounded-full text-white disabled:opacity-40"
                        style={{ backgroundColor: 'rgba(30,30,30,0.85)' }}
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
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white"
                        title={t('adjustment.ui.fotos.deletePhoto')}
                      >
                        <FaTrash className="h-3 w-3" />
                      </button>
                    </div>
                    {imagen.subiendo && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-xs font-semibold text-white">
                        Subiendo…
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="truncate text-sm font-medium" style={{ color: textPrimary }}>
                      {imagen.nombre}
                    </p>
                    {imagen.error && (
                      <p className="mt-1 text-xs text-red-500">{imagen.error}</p>
                    )}
                    <textarea
                      value={imagen.descripcion || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        actualizarDescripcion(clave, e.target.value);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Descripción de la imagen..."
                      className="mt-1 w-full resize-none rounded px-2 py-1 text-xs focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        border: `1px solid ${borderColor}`,
                      }}
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs" style={{ color: textSecondary }}>
            El orden que definas aquí es el mismo que aparecerá en el documento Word.
          </p>
        </div>
      )}

      {imagenSeleccionada && (
        <FotoZurichAmpliada
          imagen={imagenSeleccionada}
          api={api}
          onClose={() => setImagenSeleccionada(null)}
        />
      )}
    </div>
  );
}

function FotoZurichAmpliada({ imagen, api, onClose }) {
  const [src, setSrc] = useState(
    () => getImageUrl(imagen) || (imagen?.preview ? imagen.preview : null)
  );
  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (imagen?.preview?.startsWith?.('blob:') || imagen?.preview?.startsWith?.('data:')) {
        setSrc(imagen.preview);
        return;
      }
      const url = await resolverUrlImagen(imagen);
      if (!cancelado) setSrc(url || getImageUrl(imagen) || api.url(imagen?.ruta));
    })();
    return () => {
      cancelado = true;
    };
  }, [imagen, api]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      {src ? (
        <img
          src={src}
          alt={imagen?.nombre}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="rounded-lg bg-white px-6 py-4 text-sm text-gray-600">Cargando…</div>
      )}
    </div>
  );
}
