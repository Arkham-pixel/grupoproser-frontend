import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaImage, FaTrash } from 'react-icons/fa';
import { ThemedInput, useMaquinariaTheme } from './maquinariaUi';
import {
  crearImagenPendiente,
  getMaquinariaImagenDisplayUrl,
} from './maquinariaImagenUtils';

export default function FotoPrincipalMaquinaria({
  imagen,
  onChange,
  descripcion = '',
  onDescripcionChange,
  disabled = false,
}) {
  const t = useMaquinariaTheme();

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const pendiente = crearImagenPendiente(file);
      onChange({
        ...pendiente,
        descripcion: descripcion || '',
      });
    },
    [onChange, descripcion]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
    disabled,
  });

  const displayUrl = getMaquinariaImagenDisplayUrl(imagen);

  const handleDescripcion = (value) => {
    onDescripcionChange?.(value);
    if (imagen) {
      onChange({ ...imagen, descripcion: value });
    }
  };

  return (
    <div className="space-y-4">
      {displayUrl ? (
        <div
          className="relative overflow-hidden rounded-lg border"
          style={{ borderColor: t.borderColor, backgroundColor: t.tableHeaderBg }}
        >
          <img
            src={displayUrl}
            alt={imagen?.nombre || 'Foto principal'}
            className="w-full max-h-72 object-contain"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white"
              style={{ backgroundColor: 'rgba(220, 38, 38, 0.9)' }}
            >
              <FaTrash /> Quitar
            </button>
          )}
          {imagen?.nombre && (
            <p className="truncate border-t px-3 py-2 text-xs" style={{ borderColor: t.borderColor, color: t.textSecondary }}>
              {imagen.nombre}
            </p>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors"
          style={{
            borderColor: isDragActive ? '#DC2626' : t.borderColor,
            backgroundColor: isDragActive ? t.accentSoft : t.tableHeaderBg,
            opacity: disabled ? 0.6 : 1,
            pointerEvents: disabled ? 'none' : 'auto',
          }}
        >
          <input {...getInputProps()} />
          <FaImage className="mb-2 text-2xl" style={{ color: t.textSecondary }} />
          <FaCloudUploadAlt className="mb-2 text-xl" style={{ color: t.textSecondary }} />
          <span className="text-sm font-medium" style={{ color: t.textPrimary }}>
            Arrastra una imagen o haz clic
          </span>
          <span className="mt-1 text-xs" style={{ color: t.textSecondary }}>
            Solo 1 foto · JPG, PNG, WEBP
          </span>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold" style={{ color: t.textPrimary }}>
          Descripción de la foto principal
        </label>
        <ThemedInput
          value={descripcion}
          onChange={(e) => handleDescripcion(e.target.value)}
          placeholder="Descripción de la foto principal"
          disabled={disabled}
        />
      </div>

      <p className="text-xs" style={{ color: t.textSecondary }}>
        Se almacena en S3 al guardar o exportar el informe.
      </p>
    </div>
  );
}
