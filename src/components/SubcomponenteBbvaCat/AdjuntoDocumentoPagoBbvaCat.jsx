import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash, FaUpload } from 'react-icons/fa';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import BotonDescargaStorage from '../shared/BotonDescargaStorage.jsx';
import {
  ETIQUETA_DOCUMENTO_PAGO_BBVA_CAT,
  formatDate,
} from './bbvaCatHelpers.js';
import { bbvaCatArchivosApi } from './bbvaCatArchivosApi.js';

const formatBytes = (n) => {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

const esEtiquetaPago = (etiqueta) => {
  const e = String(etiqueta || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  return e === 'PAGO' || e === 'DOCUMENTO_PAGO' || e === 'COMPROBANTE_PAGO';
};

export default function AdjuntoDocumentoPagoBbvaCat({
  casoId,
  origen = 'cat',
  archivosIniciales = [],
  disabled = false,
  onChanged,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const api = useMemo(() => bbvaCatArchivosApi(origen), [origen]);
  const [archivos, setArchivos] = useState(() => archivosIniciales || []);
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    setArchivos(archivosIniciales || []);
  }, [casoId, archivosIniciales]);

  const docsPago = (archivos || []).filter((a) => esEtiquetaPago(a.etiqueta));

  const refrescar = async () => {
    const actualizado = await api.getById(casoId);
    setArchivos(actualizado.archivos || []);
    if (onChanged) onChanged(actualizado);
    return actualizado;
  };

  const subirArchivos = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length || !casoId || disabled) return;
    setError(null);
    setExito(null);
    setSubiendo(true);
    try {
      for (const file of files) {
        await api.subir(casoId, file, ETIQUETA_DOCUMENTO_PAGO_BBVA_CAT);
      }
      await refrescar();
      setExito(t('bbvaCat.archive.uploadOk'));
    } catch (err) {
      setError(err.message || t('bbvaCat.archive.uploadError'));
    } finally {
      setSubiendo(false);
    }
  };

  const handleInput = async (e) => {
    const files = e.target.files;
    e.target.value = '';
    await subirArchivos(files);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
    await subirArchivos(e.dataTransfer?.files);
  };

  const handleDelete = async (archivoId) => {
    if (!window.confirm(t('bbvaCat.archive.confirmDelete'))) return;
    setError(null);
    setExito(null);
    try {
      await api.eliminar(casoId, archivoId);
      await refrescar();
      setExito(t('bbvaCat.archive.deleteOk'));
    } catch (err) {
      setError(err.message || t('bbvaCat.archive.deleteError'));
    }
  };

  if (!casoId) {
    return (
      <p className="font-body text-sm text-amber-800 dark:text-amber-200">
        {t('bbvaCat.sections.documentoPagoSaveFirst')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        disabled={disabled || subiendo}
        onChange={handleInput}
      />

      <div
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          arrastrando
            ? 'border-fenix-primario bg-red-50 dark:bg-red-950/30'
            : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/40'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setArrastrando(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={handleDrop}
      >
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-300">
          {t('bbvaCat.sections.documentoPagoHint')}
        </p>
        <button
          type="button"
          className={expressBtnPrimary}
          disabled={disabled || subiendo}
          onClick={() => inputRef.current?.click()}
        >
          <FaUpload />
          {subiendo ? t('bbvaCat.archive.uploading') : t('bbvaCat.archive.uploadPago')}
        </button>
      </div>

      {docsPago.length === 0 ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {t('bbvaCat.sections.documentoPagoEmpty')}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-[#1A1A1A]">
          {docsPago.map((arch) => (
              <li
                key={arch._id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm text-gray-800 dark:text-gray-200">
                    {arch.nombreOriginal}
                  </p>
                  <p className="font-body text-xs text-gray-500">
                    {formatBytes(arch.tamaño)} · {formatDate(arch.fechaSubida) || '—'}
                  </p>
                </div>
                <div className="inline-flex gap-2">
                  {arch.ruta && (
                    <BotonDescargaStorage
                      ruta={arch.ruta}
                      nombre={arch.nombreOriginal}
                      className={expressBtnGhost}
                      onError={(err) => setError(err.message)}
                    >
                      {t('bbvaCat.archive.download')}
                    </BotonDescargaStorage>
                  )}
                  <button
                    type="button"
                    className={expressBtnGhost}
                    disabled={disabled}
                    onClick={() => handleDelete(arch._id)}
                  >
                    <FaTrash />
                    {t('common.delete', { defaultValue: 'Eliminar' })}
                  </button>
                </div>
              </li>
          ))}
        </ul>
      )}
    </div>
  );
}
