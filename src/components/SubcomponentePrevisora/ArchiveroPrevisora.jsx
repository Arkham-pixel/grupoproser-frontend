import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash, FaUpload } from 'react-icons/fa';
import {
  eliminarArchivoPrevisora,
  getCasoPrevisoraById,
  subirArchivoPrevisora,
} from '../../services/previsoraService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import BotonDescargaStorage from '../shared/BotonDescargaStorage.jsx';
import { ETIQUETAS_ARCHIVO_PREVISORA, formatDate } from './previsoraHelpers.js';

const formatBytes = (n) => {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ArchiveroPrevisora({ caso, onClose, onChanged }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [archivos, setArchivos] = useState(() => caso?.archivos || []);
  const [etiqueta, setEtiqueta] = useState('GENERAL');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const refrescar = async () => {
    const actualizado = await getCasoPrevisoraById(caso._id);
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
      await subirArchivoPrevisora(caso._id, file, etiqueta);
      await refrescar();
      setExito(t('previsora.archive.uploadOk'));
    } catch (err) {
      setError(err.message || t('previsora.archive.uploadError'));
    } finally {
      setSubiendo(false);
    }
  };

  const handleDelete = async (archivoId) => {
    if (!window.confirm(t('previsora.archive.confirmDelete'))) return;
    setError(null);
    setExito(null);
    try {
      await eliminarArchivoPrevisora(caso._id, archivoId);
      await refrescar();
      setExito(t('previsora.archive.deleteOk'));
    } catch (err) {
      setError(err.message || t('previsora.archive.deleteError'));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
          {t('previsora.archive.title')}
        </h3>
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {t('previsora.archive.subtitle', {
            caseNumber: caso?.consecutivo || caso?.identificacion || '',
          })}
        </p>
        <p className="mt-1 font-body text-xs text-amber-800 dark:text-amber-200">
          {t('previsora.cat.evidenciaHint')}
        </p>
      </div>

      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Campo label={t('previsora.archive.label')}>
          <SelectFenix value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
            {ETIQUETAS_ARCHIVO_PREVISORA.map((op) => (
              <option key={op} value={op}>
                {t(`previsora.archive.labels.${op}`, { defaultValue: op })}
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
          {subiendo ? t('previsora.archive.uploading') : t('previsora.archive.upload')}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('previsora.archive.file')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('previsora.archive.label')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('previsora.archive.size')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('previsora.archive.date')}
              </th>
              <th className="px-3 py-2 text-right font-body text-xs font-semibold uppercase text-gray-500">
                {t('previsora.report.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
            {archivos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center font-body text-sm text-gray-500">
                  {t('previsora.archive.empty')}
                </td>
              </tr>
            ) : (
              archivos.map((arch) => (
                  <tr key={arch._id}>
                    <td className="px-3 py-2 font-body text-sm text-gray-800 dark:text-gray-200">
                      {arch.nombreOriginal}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {t(`previsora.archive.labels.${arch.etiqueta || 'GENERAL'}`, {
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
                        {arch.ruta && (
                          <BotonDescargaStorage
                            ruta={arch.ruta}
                            nombre={arch.nombreOriginal}
                            onError={(err) => setError(err.message)}
                          >
                            {t('previsora.archive.download')}
                          </BotonDescargaStorage>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40"
                          onClick={() => handleDelete(arch._id)}
                        >
                          <FaTrash />
                          {t('previsora.report.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
              ))
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
