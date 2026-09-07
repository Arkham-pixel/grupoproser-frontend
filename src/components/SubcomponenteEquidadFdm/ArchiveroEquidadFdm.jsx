import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFilePdf, FaTrash, FaUpload } from 'react-icons/fa';
import {
  eliminarArchivoFdm,
  getCasoFdmById,
  subirArchivoFdm,
} from '../../services/equidadFdmService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import BotonDescargaStorage from '../shared/BotonDescargaStorage.jsx';
import { unirArchivosLocalesFdm } from './unirPdfsArchiveroFdm.js';

export const ETIQUETAS_ARCHIVO_FDM = [
  'GENERAL',
  'POLIZA',
  'INSPECCION',
  'CONSTANCIA',
  'CARTA_COBERTURA',
  'INFORME',
  'OTRO',
  'MODELO_LIQUIDACION',
  'LIQUIDACION',
];

const formatBytes = (n) => {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO');
};

const ACCEPT_UNIR =
  '.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.png,.jpg,.jpeg,.webp,.gif,.bmp,application/pdf,image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ACCEPT_ADICIONAL =
  '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.zip,.msg,application/pdf,image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function ArchiveroEquidadFdm({ caso, onClose, onChanged }) {
  const { t } = useTranslation();
  const inputUnirRef = useRef(null);
  const inputAdicionalRef = useRef(null);
  const [archivos, setArchivos] = useState(() => caso?.archivos || []);
  const [etiqueta, setEtiqueta] = useState('GENERAL');
  const [procesando, setProcesando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const ocupado = procesando || subiendo;

  const refrescar = async () => {
    const actualizado = await getCasoFdmById(caso._id);
    setArchivos(actualizado.archivos || []);
    if (onChanged) onChanged(actualizado);
    return actualizado;
  };

  const etiquetaSubida =
    etiqueta === 'LIQUIDACION' || etiqueta === 'MODELO_LIQUIDACION' ? 'GENERAL' : etiqueta;

  /** Sube documentos tal cual, sin convertir ni unir. */
  const handleSubirAdicionales = async (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    if (!list.length) return;

    setError(null);
    setExito(null);
    setSubiendo(true);
    try {
      for (const file of list) {
        await subirArchivoFdm(caso._id, file, etiquetaSubida, {
          reemplazarMismaEtiqueta: false,
        });
      }
      await refrescar();
      setExito(
        list.length === 1
          ? t('equidadFdm.archive.uploadOk')
          : t('equidadFdm.archive.uploadOkMultiple', { count: list.length })
      );
    } catch (err) {
      setError(err.message || t('equidadFdm.archive.uploadError'));
      try {
        await refrescar();
      } catch {
        /* ignore */
      }
    } finally {
      setSubiendo(false);
    }
  };

  const procesarUnirArchivos = async (list) => {
    if (!list?.length) return;
    setError(null);
    setExito(null);
    setProcesando(true);
    try {
      const nombreBase = `Expediente_FDM_${caso?.consecutivo || caso?.cedula || caso?._id || ''}`;
      const { blob, nombre, count } = await unirArchivosLocalesFdm(list, {
        nombreBase,
        descargar: false,
      });

      const fileUnido = new File([blob], nombre, { type: 'application/pdf' });
      await subirArchivoFdm(caso._id, fileUnido, etiquetaSubida, {
        descripcion: `Expediente unido (${count} documento(s) de origen)`,
        reemplazarMismaEtiqueta: false,
      });

      await refrescar();
      setExito(t('equidadFdm.archive.mergeAndArchiveOk', { merged: count }));
    } catch (err) {
      setError(err.message || t('equidadFdm.archive.mergeError'));
      try {
        await refrescar();
      } catch {
        /* ignore */
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleUnirYArchivar = async (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    await procesarUnirArchivos(list);
  };

  const handleDropUnir = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
    if (ocupado) return;
    const list = Array.from(e.dataTransfer?.files || []);
    await procesarUnirArchivos(list);
  };

  const handleDelete = async (archivoId) => {
    if (!window.confirm(t('equidadFdm.archive.confirmDelete'))) return;
    setError(null);
    setExito(null);
    try {
      await eliminarArchivoFdm(caso._id, archivoId);
      await refrescar();
      setExito(t('equidadFdm.archive.deleteOk'));
    } catch (err) {
      setError(err.message || t('equidadFdm.archive.deleteError'));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
          {t('equidadFdm.archive.title')}
        </h3>
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {t('equidadFdm.archive.subtitle', {
            caseNumber: caso?.consecutivo || caso?.nombre || '',
          })}
        </p>
        <p className="mt-1 font-body text-xs text-amber-800 dark:text-amber-200">
          {t('equidadFdm.archive.mergeHint')}
        </p>
      </div>

      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <div
        className={`flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:flex-wrap sm:items-end ${
          arrastrando
            ? 'border-fenix-primario bg-fenix-primario/15'
            : 'border-fenix-primario/40 bg-fenix-primario/5'
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!ocupado) setArrastrando(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setArrastrando(false);
        }}
        onDrop={handleDropUnir}
      >
        <Campo label={t('equidadFdm.archive.label')}>
          <SelectFenix value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
            {ETIQUETAS_ARCHIVO_FDM.filter(
              (op) => op !== 'LIQUIDACION' && op !== 'MODELO_LIQUIDACION'
            ).map((op) => (
              <option key={op} value={op}>
                {t(`equidadFdm.archive.labels.${op}`, { defaultValue: op })}
              </option>
            ))}
          </SelectFenix>
        </Campo>
        <input
          ref={inputAdicionalRef}
          type="file"
          className="hidden"
          multiple
          accept={ACCEPT_ADICIONAL}
          onChange={handleSubirAdicionales}
        />
        <input
          ref={inputUnirRef}
          type="file"
          className="hidden"
          multiple
          accept={ACCEPT_UNIR}
          onChange={handleUnirYArchivar}
        />
        <button
          type="button"
          className={expressBtnSecondary}
          disabled={ocupado}
          onClick={() => inputAdicionalRef.current?.click()}
          title={t('equidadFdm.archive.uploadHelp')}
        >
          <FaUpload />
          {subiendo ? t('equidadFdm.archive.uploading') : t('equidadFdm.archive.upload')}
        </button>
        <button
          type="button"
          className={expressBtnPrimary}
          disabled={ocupado}
          onClick={() => inputUnirRef.current?.click()}
          title={t('equidadFdm.archive.mergeHint')}
        >
          <FaFilePdf />
          {procesando ? t('equidadFdm.archive.merging') : t('equidadFdm.archive.mergeUpload')}
        </button>
        <p className="w-full font-body text-xs text-gray-500 dark:text-gray-400">
          {t('equidadFdm.archive.uploadHelp')}
        </p>
        <p className="w-full font-body text-xs text-gray-500 dark:text-gray-400">
          {t('equidadFdm.archive.mergeUploadHelp')}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('equidadFdm.archive.file')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('equidadFdm.archive.label')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('equidadFdm.archive.size')}
              </th>
              <th className="px-3 py-2 text-left font-body text-xs font-semibold uppercase text-gray-500">
                {t('equidadFdm.archive.date')}
              </th>
              <th className="px-3 py-2 text-right font-body text-xs font-semibold uppercase text-gray-500">
                {t('equidadFdm.menu.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
            {archivos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center font-body text-sm text-gray-500">
                  {t('equidadFdm.archive.empty')}
                </td>
              </tr>
            ) : (
              archivos.map((arch) => (
                  <tr key={arch._id}>
                    <td className="px-3 py-2 font-body text-sm text-gray-800 dark:text-gray-200">
                      {arch.nombreOriginal}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {t(`equidadFdm.archive.labels.${arch.etiqueta || 'GENERAL'}`, {
                        defaultValue: arch.etiqueta || 'GENERAL',
                      })}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {formatBytes(arch.tamaño)}
                    </td>
                    <td className="px-3 py-2 font-body text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(arch.fechaSubida)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        {arch.ruta && (
                          <BotonDescargaStorage
                            ruta={arch.ruta}
                            nombre={arch.nombreOriginal}
                            onError={(err) => setError(err.message)}
                          >
                            {t('equidadFdm.archive.download')}
                          </BotonDescargaStorage>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40"
                          onClick={() => handleDelete(arch._id)}
                        >
                          <FaTrash />
                          {t('equidadFdm.menu.delete')}
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
          <button type="button" className={expressBtnGhost} onClick={onClose} disabled={ocupado}>
            {t('equidadFdm.settlement.close')}
          </button>
        </div>
      )}
    </div>
  );
}
