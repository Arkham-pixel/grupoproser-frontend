import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaTrash, FaUpload } from 'react-icons/fa';
import {
  eliminarArchivoAllias,
  getCasoAlliasById,
  subirArchivoAllias,
  urlDescargaArchivoAllias,
} from '../../services/alliasService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { ETIQUETAS_ARCHIVO_ALLIAS, formatDate } from './alliasHelpers.js';

const formatBytes = (n) => {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ArchiveroAllias({ caso, onClose, onChanged }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [archivos, setArchivos] = useState(() => caso?.archivos || []);
  const [etiqueta, setEtiqueta] = useState('GENERAL');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const refrescar = async () => {
    const actualizado = await getCasoAlliasById(caso._id);
    setArchivos(actualizado.archivos || []);
    if (onChanged) onChanged(actualizado);
    return actualizado;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setExito(null);
    setSubiendo(true);
    try {
      await subirArchivoAllias(caso._id, file, etiqueta);
      await refrescar();
      setExito(t('allias.archive.uploadOk'));
    } catch (err) {
      setError(err.message || t('allias.archive.uploadError'));
    } finally {
      setSubiendo(false);
    }
  };

  const handleDelete = async (archivoId) => {
    if (!window.confirm(t('allias.archive.confirmDelete'))) return;
    setError(null);
    setExito(null);
    try {
      await eliminarArchivoAllias(caso._id, archivoId);
      await refrescar();
      setExito(t('allias.archive.deleteOk'));
    } catch (err) {
      setError(err.message || t('allias.archive.deleteError'));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
          {t('allias.archive.title')}
        </h3>
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {t('allias.archive.subtitle', {
            caseNumber: caso?.consecutivo || caso?.identificacion || '',
          })}
        </p>
        <p className="mt-1 font-body text-xs text-amber-800 dark:text-amber-200">
          {t('allias.cat.evidenciaHint')}
        </p>
      </div>

      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Campo label={t('allias.archive.label')}>
          <SelectFenix value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
            {ETIQUETAS_ARCHIVO_ALLIAS.map((op) => (
              <option key={op} value={op}>
                {t(`allias.archive.labels.${op}`, { defaultValue: op })}
              </option>
            ))}
          </SelectFenix>
        </Campo>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          type="button"
          className={expressBtnPrimary}
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          <FaUpload />
          {subiendo ? t('allias.archive.uploading') : t('allias.archive.upload')}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('allias.archive.file')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('allias.archive.label')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('allias.archive.size')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('allias.archive.date')}
              </th>
              <th className="px-3 py-2 text-right font-body text-xs font-semibold uppercase text-gray-500">
                {t('allias.report.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
            {archivos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center font-body text-sm text-gray-500">
                  {t('allias.archive.empty')}
                </td>
              </tr>
            ) : (
              archivos.map((arch) => {
                const url = urlDescargaArchivoAllias(arch.ruta);
                return (
                  <tr key={arch._id}>
                    <td className="px-3 py-2 font-body text-sm text-gray-800 dark:text-gray-200">
                      {arch.nombreOriginal}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {t(`allias.archive.labels.${arch.etiqueta || 'GENERAL'}`, {
                        defaultValue: arch.etiqueta || 'GENERAL',
                      })}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {formatBytes(arch.tamaño)}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(arch.fechaSubida) || '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={arch.nombreOriginal}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-gray-700 dark:text-sky-300"
                          >
                            <FaDownload />
                            {t('allias.archive.download')}
                          </a>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40"
                          onClick={() => handleDelete(arch._id)}
                        >
                          <FaTrash />
                          {t('allias.report.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {onClose && (
        <div className="flex justify-end">
          <button type="button" className={expressBtnGhost} onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      )}
    </div>
  );
}
