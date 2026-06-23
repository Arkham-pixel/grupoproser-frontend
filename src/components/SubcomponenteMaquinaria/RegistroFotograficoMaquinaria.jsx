import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaSearchPlus, FaTimes, FaTrash } from 'react-icons/fa';
import { createImageErrorHandler, getImageUrl } from '../../utils/imageUtils';
import { ThemedInput, useMaquinariaTheme } from './maquinariaUi';
import {
  crearImagenPendiente,
  getMaquinariaImagenDisplayUrl,
  MAX_FOTOS_REGISTRO_MAQUINARIA,
  normalizarImagenCargada,
} from './maquinariaImagenUtils';

export default function RegistroFotograficoMaquinaria({
  onChange,
  imagenesIniciales = [],
  max = MAX_FOTOS_REGISTRO_MAQUINARIA,
  disabled = false,
}) {
  const t = useMaquinariaTheme();
  const [fotos, setFotos] = useState([]);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const inicialRef = useRef(null);

  useEffect(() => {
    const serial = JSON.stringify(imagenesIniciales);
    if (serial === inicialRef.current) return;
    inicialRef.current = serial;
    if (Array.isArray(imagenesIniciales) && imagenesIniciales.length > 0) {
      setFotos(imagenesIniciales.map(normalizarImagenCargada));
    } else {
      setFotos([]);
    }
  }, [imagenesIniciales]);

  const actualizar = (nuevas) => {
    setFotos(nuevas);
    onChange(nuevas);
  };

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      const disponibles = max - fotos.length;
      const archivos = acceptedFiles.slice(0, disponibles);
      const nuevas = [
        ...fotos,
        ...archivos.map((file) => crearImagenPendiente(file)),
      ];
      actualizar(nuevas);
    },
    [fotos, max, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: true,
    disabled: disabled || fotos.length >= max,
  });

  const quitar = (index) => {
    actualizar(fotos.filter((_, i) => i !== index));
  };

  const cambiarDescripcion = (index, value) => {
    const nuevas = fotos.map((f, i) => (i === index ? { ...f, descripcion: value } : f));
    actualizar(nuevas);
  };

  return (
    <>
      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setImagenAmpliada(null)}
        >
          <button
            type="button"
            onClick={() => setImagenAmpliada(null)}
            className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/20"
          >
            <FaTimes size={24} />
          </button>
          <div className="max-h-full max-w-7xl overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={imagenAmpliada.url}
              alt={imagenAmpliada.descripcion || 'Vista ampliada'}
              className="max-h-[90vh] max-w-full rounded object-contain"
            />
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs" style={{ color: t.textSecondary }}>
          {fotos.length} / {max} fotos · arrastre varias a la vez
        </p>
        <p className="text-xs" style={{ color: t.textSecondary }}>
          S3 al guardar o exportar
        </p>
      </div>

      {fotos.length < max && (
        <div
          {...getRootProps()}
          className="mb-6 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors"
          style={{
            borderColor: isDragActive ? '#DC2626' : t.borderColor,
            backgroundColor: isDragActive ? t.accentSoft : t.tableHeaderBg,
            opacity: disabled ? 0.6 : 1,
            pointerEvents: disabled ? 'none' : 'auto',
          }}
        >
          <input {...getInputProps()} />
          <FaCloudUploadAlt className="mb-2 text-2xl" style={{ color: t.textSecondary }} />
          <span className="text-sm" style={{ color: t.textPrimary }}>
            Arrastra imágenes aquí o haz clic para seleccionar
          </span>
          <span className="mt-1 text-xs" style={{ color: t.textSecondary }}>
            Máximo {max} fotos en total
          </span>
        </div>
      )}

      {fotos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fotos.map((foto, i) => {
            const imageUrl = getMaquinariaImagenDisplayUrl(foto) || getImageUrl(foto);
            return (
              <div
                key={foto.id || `foto-${i}`}
                className="rounded-lg border p-3"
                style={{ borderColor: t.borderColor, backgroundColor: t.cardBg }}
              >
                {imageUrl ? (
                  <div className="relative mb-2 group">
                    <img
                      src={imageUrl}
                      alt={`Foto ${i + 1}`}
                      className="h-48 w-full cursor-pointer rounded object-cover"
                      onClick={() => setImagenAmpliada({ url: imageUrl, descripcion: foto.descripcion })}
                      onError={createImageErrorHandler(foto)}
                    />
                    <div
                      className="absolute inset-0 flex cursor-pointer items-center justify-center rounded bg-black/0 transition group-hover:bg-black/30"
                      onClick={() => setImagenAmpliada({ url: imageUrl, descripcion: foto.descripcion })}
                    >
                      <FaSearchPlus className="text-white opacity-0 transition group-hover:opacity-100" size={28} />
                    </div>
                  </div>
                ) : (
                  <div
                    className="mb-2 flex h-48 items-center justify-center rounded text-sm"
                    style={{ backgroundColor: t.tableHeaderBg, color: t.textSecondary }}
                  >
                    Sin vista previa
                  </div>
                )}
                <ThemedInput
                  value={foto.descripcion || ''}
                  onChange={(e) => cambiarDescripcion(i, e.target.value)}
                  className="mb-2 text-xs"
                  placeholder={`Descripción foto ${i + 1}`}
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                  disabled={disabled}
                >
                  <FaTrash /> Eliminar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
