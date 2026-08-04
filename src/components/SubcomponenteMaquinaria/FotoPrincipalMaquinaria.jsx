import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const mq = useMaquinariaTheme();

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
          style={{ borderColor: mq.borderColor, backgroundColor: mq.tableHeaderBg }}
        >
          <img
            src={displayUrl}
            alt={imagen?.nombre || t('machinery.ui.fotoPrincipal.alt')}
            className="w-full max-h-72 object-contain"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white"
              style={{ backgroundColor: 'rgba(220, 38, 38, 0.9)' }}
            >
              <FaTrash /> {t('machinery.ui.fotoPrincipal.remove')}
            </button>
          )}
          {imagen?.nombre && (
            <p className="truncate border-t px-3 py-2 text-xs" style={{ borderColor: mq.borderColor, color: mq.textSecondary }}>
              {imagen.nombre}
            </p>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors"
          style={{
            borderColor: isDragActive ? '#DC2626' : mq.borderColor,
            backgroundColor: isDragActive ? mq.accentSoft : mq.tableHeaderBg,
            opacity: disabled ? 0.6 : 1,
            pointerEvents: disabled ? 'none' : 'auto',
          }}
        >
          <input {...getInputProps()} />
          <FaImage className="mb-2 text-2xl" style={{ color: mq.textSecondary }} />
          <FaCloudUploadAlt className="mb-2 text-xl" style={{ color: mq.textSecondary }} />
          <span className="text-sm font-medium" style={{ color: mq.textPrimary }}>
            {t('machinery.ui.fotoPrincipal.drop')}
          </span>
          <span className="mt-1 text-xs" style={{ color: mq.textSecondary }}>
            {t('machinery.ui.fotoPrincipal.hint')}
          </span>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold" style={{ color: mq.textPrimary }}>
          {t('machinery.ui.fotoPrincipal.description')}
        </label>
        <ThemedInput
          value={descripcion}
          onChange={(e) => handleDescripcion(e.target.value)}
          placeholder={t('machinery.ui.fotoPrincipal.descriptionPlaceholder')}
          disabled={disabled}
        />
      </div>

      <p className="text-xs" style={{ color: mq.textSecondary }}>
        {t('machinery.ui.fotoPrincipal.s3Hint')}
      </p>
    </div>
  );
}
