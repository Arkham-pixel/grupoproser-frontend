import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaTrash, FaShip } from 'react-icons/fa';
import { crearImagenPendiente, getPuertosImagenDisplayUrl } from './puertosCasoImagenUtils';
import {
  puertosBtnSm,
  puertosCard,
  puertosDropzone,
  puertosDropzoneActive,
  puertosSectionSubtitle,
  puertosSectionTitle,
} from './puertosFenixUi';

export default function PuertosCasoImagenUnica({ titulo, descripcion, imagen, onChange, soloLectura = false }) {
  const { t } = useTranslation();

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      onChange(crearImagenPendiente(file));
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
    disabled: soloLectura,
  });

  const displayUrl = getPuertosImagenDisplayUrl(imagen);

  return (
    <div className={`${puertosCard} p-5`}>
      <div className="mb-3">
        <h4 className={puertosSectionTitle}>{titulo}</h4>
        {descripcion && <p className={puertosSectionSubtitle}>{descripcion}</p>}
      </div>
      {displayUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <img src={displayUrl} alt={imagen.nombre || t('ports.ui.casoExportacion.photos.shipPhotoAlt')} className="max-h-72 w-full object-contain" />
          {!soloLectura && (
          <button type="button" onClick={() => onChange(null)} className={`${puertosBtnSm} absolute right-2 top-2`}>
            <FaTrash /> {t('ports.ui.casoExportacion.photos.remove')}
          </button>
          )}
          {imagen.nombre && (
            <p className="truncate border-t border-gray-200 px-3 py-2 font-body text-xs text-gray-500 dark:border-gray-700">
              {imagen.nombre}
            </p>
          )}
        </div>
      ) : !soloLectura ? (
        <div
          {...getRootProps()}
          className={`${puertosDropzone} min-h-[180px] ${isDragActive ? puertosDropzoneActive : ''}`}
        >
          <input {...getInputProps()} />
          <FaShip className="mb-2 text-3xl text-gray-400" />
          <FaCloudUploadAlt className="mb-2 text-xl text-gray-400" />
          <span className="font-body text-sm text-gray-700 dark:text-gray-300">{t('ports.ui.casoExportacion.photos.shipPhoto')}</span>
          <span className="mt-1 font-body text-xs text-gray-500">{t('ports.ui.casoExportacion.photos.shipDragHint')}</span>
        </div>
      ) : (
        <div className={`${puertosDropzone} min-h-[120px] flex items-center justify-center font-body text-sm text-gray-500`}>
          {t('ports.ui.casoExportacion.photos.noShipPhoto')}
        </div>
      )}
    </div>
  );
}
