import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaTrash, FaImage } from 'react-icons/fa';

const MAX_DEFAULT = 12;

export default function PuertosCasoImagenesSeccion({
  titulo,
  descripcion,
  imagenes = [],
  onChange,
  max = MAX_DEFAULT,
}) {
  const { t } = useTranslation();

  const setImagenes = (updater) => {
    if (typeof updater === 'function') {
      onChange(updater(imagenes));
    } else {
      onChange(updater);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      const disponibles = max - imagenes.length;
      acceptedFiles.slice(0, disponibles).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagenes((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              src: e.target.result,
              nombre: file.name,
              descripcion: '',
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
    },
    [imagenes.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: true,
    disabled: imagenes.length >= max,
  });

  return (
    <div className="space-y-3">
      {titulo && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{titulo}</h4>
          {descripcion && <p className="text-xs text-slate-500 dark:text-slate-400">{descripcion}</p>}
        </div>
      )}
      {!titulo && descripcion && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{descripcion}</p>
      )}
      {imagenes.length < max && (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer ${
            isDragActive
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
              : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          <input {...getInputProps()} />
          <FaCloudUploadAlt className="text-2xl text-slate-400 mb-2" />
          <span className="text-xs text-slate-500">{t('ports.ui.casoExportacion.photos.dragImages')}</span>
        </div>
      )}
      {imagenes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {imagenes.map((img) => (
            <div key={img.id} className="relative rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              {img.src ? (
                <img src={img.src} alt={img.nombre} className="h-28 w-full object-cover" />
              ) : (
                <div className="h-28 flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                  <FaImage className="text-slate-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setImagenes(imagenes.filter((i) => i.id !== img.id))}
                className="absolute top-1 right-1 rounded bg-red-600 p-1 text-white text-xs"
              >
                <FaTrash />
              </button>
              <input
                className="w-full text-xs px-2 py-1 border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                placeholder={t('ports.ui.casoExportacion.photos.description')}
                value={img.descripcion || ''}
                onChange={(e) =>
                  setImagenes(
                    imagenes.map((i) => (i.id === img.id ? { ...i, descripcion: e.target.value } : i))
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
