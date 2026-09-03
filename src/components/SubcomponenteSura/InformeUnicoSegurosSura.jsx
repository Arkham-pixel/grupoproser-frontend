import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileAlt, FaFileExcel, FaFileSignature, FaFileWord, FaImages, FaInfoCircle, FaMapMarkerAlt, FaPlus, FaRedo, FaSave, FaTrash } from 'react-icons/fa';
import {
  Campo,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  InputFenix,
  InputMonedaExpress,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  INFO_EVENTO_DEFAULT_SURA,
  calcularLiquidacionSura,
  camposFaltantesInformeUnicoSura,
  etiquetaArchivoInformeSura,
  formDataNsrDesdeLiquidadorSura,
  formatearMonto,
  formatDateLarga,
  mapCasoSuraALiquidador,
  normalizarTipoInformeSura,
  reservaSugeridaSura,
  resumenLiquidacionIndependienteSura,
} from './liquidadorSuraHelpers.js';
import { fusionarFotosAgilEnInforme, fotosArchiveroPendientesEnInformeSura, informeUnicoConFotosAgil } from './informeAgilSuraHelpers.js';
import { descargarWordInformeSura } from './generarWordInformeSura.js';
import { descargarInformeUnicoSuraExcel } from './generarFormatoAgilSuraExcel.js';
import { subirArchivoSura } from '../../services/segurosSuraService.js';
import { importarFotosArchiveroAlInformeCaso } from './syncFotosNsrAlInformeSura.js';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import { RECARGOS_PRESUPUESTO_NSR10_CAT } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';
import FotosInspeccionSura from './FotosInspeccionSura.jsx';

const cardBase =
  'flex h-full flex-col rounded-xl border p-4 text-left transition hover:border-fenix-primario/50';
const cardIdle =
  'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900';
const cardActive =
  'border-fenix-primario bg-fenix-primario/5 dark:border-fenix-primario dark:bg-fenix-primario/10';

function extraerLatLng(texto) {
  const parts = String(texto || '')
    .split(',')
    .map((c) => parseFloat(String(c).trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return {
      latitud: parts[0].toFixed(6),
      longitud: parts[1].toFixed(6),
    };
  }
  return { latitud: '', longitud: '' };
}

function TablaFilasSura({
  columnas,
  filas,
  onChangeFila,
  onAdd,
  onRemove,
  addLabel,
  emptyLabel,
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr className="text-left text-gray-500">
              {columnas.map((col) => (
                <th key={col.key} className="px-2 py-2 font-semibold">
                  {col.label}
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(filas || []).map((fila, idx) => (
              <tr key={`${idx}-${fila.zona || fila.concepto || fila.capitulo || 'fila'}`}>
                {columnas.map((col) => (
                  <td key={col.key} className="align-top px-2 py-2">
                    {col.type === 'select' ? (
                      <select
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
                        value={fila[col.key] || ''}
                        onChange={(e) => onChangeFila(idx, col.key, e.target.value)}
                      >
                        <option value="">—</option>
                        {(col.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : col.type === 'textarea' ? (
                      <textarea
                        className="min-h-[72px] w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
                        rows={col.rows || 3}
                        value={fila[col.key] || ''}
                        onChange={(e) => onChangeFila(idx, col.key, e.target.value)}
                        placeholder={col.placeholder || ''}
                      />
                    ) : col.type === 'money' ? (
                      <InputMonedaExpress
                        className="font-mono tabular-nums"
                        value={fila[col.key] || ''}
                        onChange={(e) => onChangeFila(idx, col.key, e.target.value)}
                        placeholder={col.placeholder || '$ 0'}
                      />
                    ) : (
                      <InputFenix
                        className={col.mono ? 'font-mono' : ''}
                        value={fila[col.key] || ''}
                        onChange={(e) => onChangeFila(idx, col.key, e.target.value)}
                        placeholder={col.placeholder || ''}
                      />
                    )}
                  </td>
                ))}
                <td className="align-top px-2 py-2">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    onClick={() => onRemove(idx)}
                    title="Quitar"
                  >
                    <FaTrash className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {!(filas || []).length && (
              <tr>
                <td
                  colSpan={columnas.length + 1}
                  className="px-2 py-4 text-center text-gray-500"
                >
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" className={expressBtnGhost} onClick={onAdd}>
        <FaPlus /> {addLabel}
      </button>
    </div>
  );
}

export default function InformeUnicoSegurosSura({
  casoSura = null,
  fotosAgil = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
  liquidadorInicial = null,
  forzarTipoUnico = false,
}) {
  const { t } = useTranslation();
  const [informe, setInforme] = useState(() =>
    informeUnicoConFotosAgil(casoSura || {}, fotosAgil)
  );
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapCasoSuraALiquidador(casoSura || {})
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);
  const [importandoFotosArchivero, setImportandoFotosArchivero] = useState(false);

  const totales = useMemo(() => calcularLiquidacionSura(liquidador), [liquidador]);
  const criterio = totales.criterio || {};
  const tipoInforme = normalizarTipoInformeSura(informe.tipoInforme, 'preliminar');
  const esPreliminar = tipoInforme === 'preliminar';
  const esUnico = tipoInforme === 'unico';

  const etiquetaCamposUnico = (faltantes) =>
    (faltantes || [])
      .map((campo) => t(`segurosSura.reportUnique.${campo.labelKey}`))
      .join(', ');
  const reservaMostrada = useMemo(() => reservaSugeridaSura(informe), [informe]);
  const resumenLiq = useMemo(
    () => resumenLiquidacionIndependienteSura(liquidador, totales),
    [liquidador, totales]
  );
  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorSura(liquidador, casoSura || {}),
    [liquidador, casoSura]
  );
  const coordsRiesgo = useMemo(
    () => extraerLatLng(informe.coordenadasRiesgo),
    [informe.coordenadasRiesgo]
  );
  const capturaMapaInicial = useMemo(() => {
    const im = informe.imagenMapa;
    if (!im) return '';
    if (typeof im === 'string') return im;
    return '';
  }, [informe.imagenMapa]);

  const handleMapaChange = (info) => {
    setInforme((prev) => {
      const next = { ...prev };
      if (info?.lat != null && info?.lng != null) {
        next.coordenadasRiesgo = `${info.lat}, ${info.lng}`;
      } else if (info?.coordenadas) {
        if (typeof info.coordenadas === 'string') {
          next.coordenadasRiesgo = info.coordenadas;
        } else if (info.coordenadas.lat != null && info.coordenadas.lng != null) {
          next.coordenadasRiesgo = `${info.coordenadas.lat}, ${info.coordenadas.lng}`;
        }
      }
      const img = info?.imagenMapa || info?.imagen;
      if (img) next.imagenMapa = img;
      if (info?.direccion && !String(prev.direccionRiesgo || '').trim()) {
        next.direccionRiesgo = info.direccion;
      }
      return next;
    });
  };

  const tipoInformeGuardado = casoSura?.informeUnico
    ? normalizarTipoInformeSura(casoSura.informeUnico.tipoInforme, 'unico')
    : '';

  useEffect(() => {
    setInforme(informeUnicoConFotosAgil(casoSura || {}, fotosAgil));
    setLiquidador(liquidadorInicial || mapCasoSuraALiquidador(casoSura || {}));
  }, [casoSura?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tipoInformeGuardado) return;
    setInforme((prev) => {
      const actual = normalizarTipoInformeSura(prev?.tipoInforme, 'preliminar');
      if (actual === tipoInformeGuardado) return prev;
      return informeUnicoConFotosAgil(casoSura || {}, fotosAgil);
    });
  }, [casoSura?._id, tipoInformeGuardado]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!forzarTipoUnico) return;
    setInforme((prev) => {
      if (normalizarTipoInformeSura(prev?.tipoInforme, 'preliminar') === 'unico') return prev;
      return { ...prev, tipoInforme: 'unico' };
    });
  }, [forzarTipoUnico]);

  useEffect(() => {
    if (!esUnico) return;
    const coords = String(informe.coordenadasRiesgo || '').trim();
    const tieneMapa = Boolean(String(informe.imagenMapa || '').trim());
    if (coords && !tieneMapa) {
      setForzarCapturaMapa((n) => (n === 0 ? 1 : n));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esUnico, casoSura?._id, informe.coordenadasRiesgo]);

  useEffect(() => {
    if (!Array.isArray(fotosAgil) || !fotosAgil.length) return;
    setInforme((prev) => {
      const mezcladas = fusionarFotosAgilEnInforme(prev.fotosInspeccion || [], fotosAgil);
      const idsPrev = (prev.fotosInspeccion || [])
        .map((f) => String(f?._id || f?.ruta || f?.id || f?.preview || ''))
        .join('|');
      const idsNext = mezcladas
        .map((f) => String(f?._id || f?.ruta || f?.id || f?.preview || ''))
        .join('|');
      if (idsPrev === idsNext) return prev;
      return { ...prev, fotosInspeccion: mezcladas };
    });
  }, [fotosAgil]);

  useEffect(() => {
    onEstadoChange?.(informe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [informe]);

  useEffect(() => {
    onLiquidadorChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

  const setCampo = (campo, valor) => {
    setInforme((prev) => {
      const next = { ...prev, [campo]: valor };
      if (campo === 'actaAjustadorNombre') next.ajustadorNombre = valor;
      if (campo === 'ajustadorNombre' && !prev.actaAjustadorNombre) {
        next.actaAjustadorNombre = valor;
      }
      return next;
    });
  };

  const elegirTipoInforme = (tipo) => {
    const nextTipo = normalizarTipoInformeSura(tipo, tipoInforme);
    if (nextTipo === tipoInforme) return;
    const next = { ...informe, tipoInforme: nextTipo };
    setInforme(next);
    onGuardarEnCaso?.(next);
  };

  const setFila = (campo, idx, key, valor) => {
    setInforme((prev) => {
      const list = Array.isArray(prev[campo]) ? [...prev[campo]] : [];
      list[idx] = { ...(list[idx] || {}), [key]: valor };
      return { ...prev, [campo]: list };
    });
  };

  const addFila = (campo, vacia) => {
    setInforme((prev) => {
      const list = [...(Array.isArray(prev[campo]) ? prev[campo] : []), vacia];
      return { ...prev, [campo]: list };
    });
  };

  const removeFila = (campo, idx) => {
    setInforme((prev) => {
      const list = (Array.isArray(prev[campo]) ? prev[campo] : []).filter((_, i) => i !== idx);
      return { ...prev, [campo]: list };
    });
  };

  const handleNsrChange = (patch) => {
    setLiquidador((prev) => ({ ...prev, ...patch, modelo: 'nsr10' }));
  };

  const restaurarInfoEvento = () => {
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_SURA);
  };

  const handleDescargar = async () => {
    if (esUnico) {
      const faltantes = camposFaltantesInformeUnicoSura(informe, casoSura || {});
      if (faltantes.length) {
        setMensaje('');
        setError(
          t('segurosSura.reportUnique.unicoMissingFields', {
            campos: etiquetaCamposUnico(faltantes),
          })
        );
        return;
      }
    }
    setDescargando(true);
    setError('');
    setMensaje('');
    const mimeExcel = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const mimeWord =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    try {
      const resultado = esUnico
        ? await descargarInformeUnicoSuraExcel({
            caso: casoSura || {},
            informe,
          })
        : await descargarWordInformeSura({
            caso: casoSura || {},
            informe,
            liquidador,
          });
      const casoId = casoSura?._id;
      if (!casoId) {
        setMensaje(
          esUnico
            ? t('segurosSura.reportUnique.excelNeedsCase')
            : t('segurosSura.reportUnique.wordNeedsCase')
        );
        return;
      }
      const blob = resultado?.blob;
      const nombre =
        resultado?.nombre ||
        resultado?.filename ||
        (esUnico
          ? `Informe_Unico_Sura_${casoSura.siniestro || casoSura.consecutivo || 'caso'}.xlsx`
          : `Informe_Sura_${casoSura.siniestro || casoSura.consecutivo || 'caso'}.docx`);
      if (!blob) {
        setMensaje(
          esUnico
            ? t('segurosSura.reportUnique.excelNeedsCase')
            : t('segurosSura.reportUnique.wordNeedsCase')
        );
        return;
      }
      try {
        const file = new File([blob], nombre, {
          type: esUnico ? mimeExcel : mimeWord,
        });
        const creado = await subirArchivoSura(
          casoId,
          file,
          etiquetaArchivoInformeSura(informe.tipoInforme)
        );
        appendArchivosAlCaso([creado]);
        setMensaje(
          esUnico
            ? t('segurosSura.reportUnique.excelSavedArchive')
            : t('segurosSura.reportUnique.wordSavedArchive')
        );
      } catch (errArchivo) {
        console.warn('No se pudo guardar el informe en el archivero:', errArchivo);
        setError(
          esUnico
            ? t('segurosSura.reportUnique.excelArchiveError')
            : t('segurosSura.reportUnique.wordArchiveError')
        );
      }
    } catch (err) {
      console.error(err);
      setError(
        esUnico
          ? t('segurosSura.reportUnique.excelError')
          : t('segurosSura.reportUnique.wordError')
      );
    } finally {
      setDescargando(false);
    }
  };

  const appendArchivosAlCaso = (nuevos = []) => {
    if (!nuevos.length || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.archivos) ? prev.archivos : [];
      const ids = new Set(list.map((a) => String(a._id)));
      const merged = [...list];
      nuevos.forEach((a) => {
        if (a?._id && !ids.has(String(a._id))) merged.push(a);
      });
      return { ...prev, archivos: merged };
    });
  };

  const quitarArchivoDelCaso = (archivoId) => {
    if (!archivoId || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      const list = (Array.isArray(prev.archivos) ? prev.archivos : []).filter(
        (a) => String(a._id) !== String(archivoId)
      );
      return { ...prev, archivos: list };
    });
  };

  const fotosPendientesArchivero = useMemo(
    () =>
      fotosArchiveroPendientesEnInformeSura(casoSura || {}, [
        ...(Array.isArray(fotosAgil) ? fotosAgil : []),
        ...(informe.fotosInspeccion || []),
      ]),
    [casoSura, fotosAgil, informe.fotosInspeccion]
  );

  const handleTraerFotosArchivero = async () => {
    if (!casoSura?._id) return;
    setImportandoFotosArchivero(true);
    setError('');
    try {
      const result = await importarFotosArchiveroAlInformeCaso({
        casoId: casoSura._id,
        casoBase: casoSura,
      });
      if (result?.caso) onCasoChange?.(result.caso);
      if (result?.imported > 0) {
        setInforme((prev) => ({
          ...prev,
          fotosInspeccion: fusionarFotosAgilEnInforme(
            prev.fotosInspeccion || [],
            result.fotosAgil || []
          ),
        }));
        setMensaje(t('segurosSura.archive.importToReportOk', { count: result.imported }));
      } else {
        setMensaje(t('segurosSura.archive.importToReportNone'));
      }
    } catch (err) {
      setError(err.message || t('segurosSura.archive.importToReportError'));
    } finally {
      setImportandoFotosArchivero(false);
    }
  };

  const nFotos = esPreliminar ? 5 : 7;
  const nConclusiones = 4;
  const nRecomendacion = esPreliminar ? 6 : 8;
  const nFirmas = esPreliminar ? 7 : 9;

  return (
    <div className="space-y-5">
      {mensaje && <p className={expressAlertSuccess}>{mensaje}</p>}
      {error && <p className={expressAlertError}>{error}</p>}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosSura.reportUnique.typeLabel')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.reportUnique.typeHint')}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            className={`${cardBase} ${tipoInforme === 'preliminar' ? cardActive : cardIdle}`}
            onClick={() => elegirTipoInforme('preliminar')}
          >
            <FaFileAlt className="mb-2 text-fenix-primario" />
            <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
              {t('segurosSura.reportUnique.typePreliminar')}
            </span>
            <span className="mt-1 font-body text-xs text-gray-500">
              {t('segurosSura.reportUnique.typePreliminarHint')}
            </span>
          </button>
          <button
            type="button"
            className={`${cardBase} ${tipoInforme === 'final' ? cardActive : cardIdle}`}
            onClick={() => elegirTipoInforme('final')}
          >
            <FaFileSignature className="mb-2 text-fenix-primario" />
            <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
              {t('segurosSura.reportUnique.typeFinal')}
            </span>
            <span className="mt-1 font-body text-xs text-gray-500">
              {t('segurosSura.reportUnique.typeFinalHint')}
            </span>
          </button>
          <button
            type="button"
            className={`${cardBase} ${tipoInforme === 'unico' ? cardActive : cardIdle}`}
            onClick={() => elegirTipoInforme('unico')}
          >
            <FaFileExcel className="mb-2 text-fenix-primario" />
            <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
              {t('segurosSura.reportUnique.typeUnico')}
            </span>
            <span className="mt-1 font-body text-xs text-gray-500">
              {t('segurosSura.reportUnique.typeUnicoHint')}
            </span>
          </button>
        </div>
      </section>

      {esUnico && (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
          role="status"
        >
          <div className="flex items-start gap-3">
            <FaInfoCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="font-body font-semibold">
                {t('segurosSura.reportUnique.unicoNoticeTitle')}
              </p>
              <p className="mt-1 font-body text-sky-900/90 dark:text-sky-100/90">
                {t('segurosSura.reportUnique.unicoNoticeBody')}
              </p>
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 font-body text-sky-900 dark:text-sky-50">
                <li>{t('segurosSura.reportUnique.unicoNoticeSheet1')}</li>
                <li>{t('segurosSura.reportUnique.unicoNoticeSheet2')}</li>
                <li>{t('segurosSura.reportUnique.unicoNoticeSheet3')}</li>
                <li>{t('segurosSura.reportUnique.unicoNoticeSheet4')}</li>
                <li>{t('segurosSura.reportUnique.unicoNoticeSheet5')}</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {esUnico ? (
      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            {t('segurosSura.reportUnique.unicoSectionTitle')}
          </h3>
          <button type="button" className={expressBtnGhost} onClick={restaurarInfoEvento}>
            <FaRedo /> {t('segurosSura.reportUnique.resetEvent')}
          </button>
        </div>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.reportUnique.unicoRequiredHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label={t('segurosSura.reportUnique.adjuster')} required>
            <InputFenix
              value={informe.ajustadorNombre || ''}
              onChange={(e) => setCampo('ajustadorNombre', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosSura.reportUnique.reportDate')} required>
            <InputFenix
              type="date"
              value={informe.fechaInforme || ''}
              onChange={(e) => setCampo('fechaInforme', e.target.value)}
            />
          </Campo>
        </div>
        <div className="mt-4">
          <Campo label={t('segurosSura.reportUnique.riskAddress')} required>
            <InputFenix
              value={informe.direccionRiesgo || casoSura?.direccionPredio || ''}
              onChange={(e) => setCampo('direccionRiesgo', e.target.value)}
              placeholder={casoSura?.direccionPredio || ''}
            />
          </Campo>
        </div>
        <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              <FaMapMarkerAlt className="text-blue-600" />
              {t('segurosSura.reportUnique.riskMap')}
              <span className="text-fenix-primario">*</span>
            </h4>
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setForzarCapturaMapa((n) => n + 1)}
            >
              {t('segurosSura.reportUnique.updateMapCapture')}
            </button>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Campo label={t('segurosSura.reportUnique.latitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.latitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
            <Campo label={t('segurosSura.reportUnique.longitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.longitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
          </div>
          <Campo label={t('segurosSura.reportUnique.coordinates')} required>
            <InputFenix
              className="font-mono"
              value={informe.coordenadasRiesgo || ''}
              onChange={(e) => setCampo('coordenadasRiesgo', e.target.value)}
              placeholder="4.531450, -75.673575"
            />
          </Campo>
          <div className="mt-3 min-h-[320px] overflow-hidden rounded-lg">
            <MapaGoogleEarth
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              coordenadasIniciales={informe.coordenadasRiesgo}
              direccionInicial={informe.direccionRiesgo || casoSura?.direccionPredio || ''}
              capturaInicial={capturaMapaInicial || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChange}
            />
          </div>
          <p className="mt-2 font-body text-xs text-gray-500">
            {capturaMapaInicial
              ? t('segurosSura.reportUnique.mapCaptureReady')
              : t('segurosSura.reportUnique.mapCaptureHint')}
          </p>
        </div>
        <div className="mt-4">
          <Campo label={t('segurosSura.reportUnique.eventInfo')} required>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={6}
              value={informe.infoEvento || ''}
              onChange={(e) => setCampo('infoEvento', e.target.value)}
              placeholder={t('segurosSura.reportUnique.eventInfoPlaceholder')}
            />
          </Campo>
        </div>
        <div className="mt-4">
          <Campo label={t('segurosSura.reportUnique.damageDescription')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={5}
              value={informe.descripcionDanios || ''}
              onChange={(e) => setCampo('descripcionDanios', e.target.value)}
              placeholder={t('segurosSura.reportUnique.damageDescriptionPlaceholder')}
            />
          </Campo>
        </div>
        <div className="mt-4">
          <Campo label={t('segurosSura.reportUnique.coverageAnalysis')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={5}
              value={informe.analisisCobertura || ''}
              onChange={(e) => setCampo('analisisCobertura', e.target.value)}
              placeholder={t('segurosSura.reportUnique.coverageAnalysisPlaceholder')}
            />
          </Campo>
        </div>
        <div className="mt-4">
          <Campo label={t('segurosSura.reportUnique.conclusions')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={4}
              value={informe.conclusiones || ''}
              onChange={(e) => setCampo('conclusiones', e.target.value)}
              placeholder={t('segurosSura.reportUnique.conclusionsPlaceholder')}
            />
          </Campo>
        </div>
        <div className="mt-4">
          <Campo label={t('segurosSura.reportUnique.recommendation')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={4}
              value={informe.recomendacion || ''}
              onChange={(e) => setCampo('recomendacion', e.target.value)}
              placeholder={t('segurosSura.reportUnique.recommendationPlaceholder')}
            />
          </Campo>
        </div>
      </section>
      ) : (
      <>
      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            1. {t('segurosSura.reportUnique.sectionEvent')}
          </h3>
          <button type="button" className={expressBtnGhost} onClick={restaurarInfoEvento}>
            <FaRedo /> {t('segurosSura.reportUnique.resetEvent')}
          </button>
        </div>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('segurosSura.reportUnique.eventHint')}
        </p>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={6}
          value={informe.infoEvento || ''}
          onChange={(e) => setCampo('infoEvento', e.target.value)}
        />
        <figure className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <img
            src={`${import.meta.env.BASE_URL || '/'}templates/mapa-evento-siniestro-sura.png`}
            alt={t('segurosSura.reportUnique.eventMapAlt')}
            className="mx-auto max-h-[420px] w-full object-contain bg-white p-2"
          />
          <figcaption className="border-t border-gray-100 px-3 py-2 text-center font-body text-xs text-gray-500 dark:border-gray-800">
            {t('segurosSura.reportUnique.eventMapCaption')}
          </figcaption>
        </figure>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label={t('segurosSura.reportUnique.adjuster')}>
            <InputFenix
              value={informe.ajustadorNombre || ''}
              onChange={(e) => setCampo('ajustadorNombre', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosSura.reportUnique.reportDate')}>
            <InputFenix
              type="date"
              value={informe.fechaInforme || ''}
              onChange={(e) => setCampo('fechaInforme', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosSura.reportUnique.suggestedReserve')}>
            <InputMonedaExpress
              className="font-mono tabular-nums"
              value={informe.reservaSugerida || ''}
              onChange={(e) => setCampo('reservaSugerida', e.target.value)}
              placeholder="$ 0"
            />
          </Campo>
        </div>
        <p className="mt-2 font-body text-xs text-gray-500">
          {t('segurosSura.reportUnique.suggestedReserveHint', {
            valor: formatearMonto(reservaMostrada),
          })}
        </p>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          2. {t('segurosSura.reportUnique.sectionDamages')}
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.reportUnique.sectionDamagesHint')}
        </p>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={12}
          value={informe.descripcionDanios || ''}
          onChange={(e) => setCampo('descripcionDanios', e.target.value)}
          placeholder={t('segurosSura.reportUnique.damageDescriptionPlaceholder')}
        />

        <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              <FaMapMarkerAlt className="text-blue-600" />
              {t('segurosSura.reportUnique.sectionRiskMap')}
            </h4>
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setForzarCapturaMapa((n) => n + 1)}
            >
              {t('segurosSura.reportUnique.updateMapCapture')}
            </button>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Campo label={t('segurosSura.reportUnique.latitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.latitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
            <Campo label={t('segurosSura.reportUnique.longitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.longitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
          </div>

          <Campo label={t('segurosSura.reportUnique.coordinatesText')}>
            <InputFenix
              className="font-mono"
              value={informe.coordenadasRiesgo || ''}
              onChange={(e) => setCampo('coordenadasRiesgo', e.target.value)}
              placeholder="8.760470, -75.902449"
            />
          </Campo>

          <div className="mt-3 min-h-[320px] overflow-hidden rounded-lg">
            <MapaGoogleEarth
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              coordenadasIniciales={informe.coordenadasRiesgo}
              direccionInicial={informe.direccionRiesgo || casoSura?.direccionPredio || ''}
              capturaInicial={capturaMapaInicial || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChange}
            />
          </div>
          <p className="mt-2 font-body text-xs text-gray-500">
            {capturaMapaInicial
              ? t('segurosSura.reportUnique.mapCaptureReady')
              : t('segurosSura.reportUnique.mapCaptureHint')}
          </p>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>3. {t('segurosSura.reportUnique.sectionPolicy')}</h3>
        <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{t('segurosSura.fields.tomador')}</dt>
            <dd className="font-medium">{casoSura?.tomador || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('segurosSura.fields.numeroPoliza')}</dt>
            <dd className="font-medium">{casoSura?.numeroPoliza || casoSura?.nmroPolza || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('segurosSura.fields.fechaInicioPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoSura?.fechaInicioPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('segurosSura.fields.fechaFinPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoSura?.fechaFinPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('segurosSura.fields.cobertura')}</dt>
            <dd className="font-medium">{casoSura?.cobertura || casoSura?.causa_siniestro || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('segurosSura.fields.estadoPagoPrimas')}</dt>
            <dd className="font-medium">{casoSura?.estadoPagoPrimas || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('segurosSura.fields.direccionPredio')}</dt>
            <dd className="font-medium">{casoSura?.direccionPredio || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">
              {t('segurosSura.fields.ciudad')} / {t('segurosSura.fields.departamento')}
            </dt>
            <dd className="font-medium">
              {casoSura?.ciudad || casoSura?.ciudadSiniestro || '—'} / {casoSura?.departamento || casoSura?.departamentoCiudad || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('segurosSura.fields.sede')}</dt>
            <dd className="font-medium">{casoSura?.sede || casoSura?.sedeRiesgo || '—'}</dd>
          </div>
        </dl>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.reportUnique.sectionPolicyTableHint')}
        </p>
        <TablaFilasSura
          columnas={[
            { key: 'concepto', label: t('segurosSura.reportUnique.colConcepto'), type: 'textarea', rows: 2 },
            {
              key: 'analisis',
              label: t('segurosSura.reportUnique.colAnalisis'),
              type: 'textarea',
              rows: 3,
            },
            {
              key: 'conclusion',
              label: t('segurosSura.reportUnique.colConclusion'),
              type: 'textarea',
              rows: 2,
            },
          ]}
          filas={informe.filasPolizaCobertura}
          onChangeFila={(idx, key, valor) => setFila('filasPolizaCobertura', idx, key, valor)}
          onAdd={() =>
            addFila('filasPolizaCobertura', { concepto: '', analisis: '', conclusion: '' })
          }
          onRemove={(idx) => removeFila('filasPolizaCobertura', idx)}
          addLabel={t('segurosSura.reportUnique.addPolicyRow')}
          emptyLabel={t('segurosSura.reportUnique.emptyPolicyRows')}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nConclusiones}. {t('segurosSura.reportUnique.conclusions')}
        </h3>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={6}
          value={informe.conclusiones || ''}
          onChange={(e) => setCampo('conclusiones', e.target.value)}
          placeholder={t('segurosSura.reportUnique.conclusionsPlaceholder')}
        />
      </section>

      {!esPreliminar && (
        <>
          <section className={expressFormSection}>
            <h3 className={expressSectionTitle}>
              {OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
                ? '5. Liquidador NSR-10'
                : '5. Dictamen y liquidador NSR-10'}
            </h3>
            <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
              {t('segurosSura.reportUnique.finalAddsSettlement')}
            </p>

            {!OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 ? (
              <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-700 sm:grid-cols-2">
                <div>
                  <span className="text-gray-500">Categoría</span>
                  <p className="font-medium">{criterio.categoria || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Habitabilidad</span>
                  <p className="font-medium">{criterio.habitabilidad || '—'}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Dictamen</span>
                  <p className="font-medium whitespace-pre-wrap">{criterio.dictamen || '—'}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Descripción de daños</span>
                  <p className="font-medium whitespace-pre-wrap">{criterio.descripcionDanios || '—'}</p>
                </div>
              </div>
            ) : null}

            <div className="mb-4 space-y-4">
              <div className="max-w-2xl overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60">
                  Deducible de edificio (presupuesto)
                </p>
                {resumenLiq.edificio.map((fila) => (
                  <div
                    key={fila.label}
                    className={`flex justify-between gap-3 border-b border-gray-200 px-4 py-2 text-sm last:border-b-0 dark:border-gray-700 ${
                      fila.destacado || fila.bold ? 'font-semibold' : ''
                    }`}
                  >
                    <span>{fila.label}</span>
                    <span className="font-mono tabular-nums">$ {formatearMonto(fila.value)}</span>
                  </div>
                ))}
              </div>
              <div className="max-w-2xl overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60">
                  Deducible de contenidos (por artículo de póliza)
                </p>
                {resumenLiq.contenidos.map((fila) => (
                  <div
                    key={fila.label}
                    className={`flex justify-between gap-3 border-b border-gray-200 px-4 py-2 text-sm last:border-b-0 dark:border-gray-700 ${
                      fila.destacado || fila.bold ? 'font-semibold' : ''
                    }`}
                  >
                    <span>{fila.label}</span>
                    <span className="font-mono tabular-nums">$ {formatearMonto(fila.value)}</span>
                  </div>
                ))}
                {resumenLiq.grupos.length > 0 && (
                  <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Grupo</th>
                          <th className="px-3 py-2 text-left font-semibold">Cobertura</th>
                          <th className="px-3 py-2 text-right font-semibold">Pérdida</th>
                          <th className="px-3 py-2 text-right font-semibold">Deducible</th>
                          <th className="px-3 py-2 text-right font-semibold">Neto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenLiq.grupos.map((g) => {
                          const perdida = Number(g.sumaPL) || 0;
                          const deducible = Number(g.deducible ?? g.aplicado) || 0;
                          const neto =
                            g.neto != null && g.neto !== ''
                              ? Number(g.neto) || 0
                              : Math.max(0, perdida - deducible);
                          return (
                            <tr key={g.clave} className="border-t border-gray-100 dark:border-gray-800">
                              <td className="px-3 py-1.5">{g.grupoLabel}</td>
                              <td className="px-3 py-1.5">{g.coberturaLabel}</td>
                              <td className="px-3 py-1.5 text-right font-mono">$ {formatearMonto(perdida)}</td>
                              <td className="px-3 py-1.5 text-right font-mono font-semibold">
                                $ {formatearMonto(deducible)}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-semibold">
                                $ {formatearMonto(neto)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="max-w-2xl overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60">
                  Gastos y amparos sin deducible
                </p>
                {(resumenLiq.gastosSinDeducible || []).map((fila, idx) => (
                  <div
                    key={`gastos-${idx}-${fila.label}`}
                    className={`flex justify-between gap-3 border-b border-gray-200 px-4 py-2 text-sm last:border-b-0 dark:border-gray-700 ${
                      fila.destacado || fila.bold ? 'font-semibold' : ''
                    }`}
                  >
                    <span>{fila.label}</span>
                    <span className="font-mono tabular-nums">$ {formatearMonto(fila.value)}</span>
                  </div>
                ))}
                <p className="px-4 py-2 text-xs text-gray-500">
                  {resumenLiq.notaGastos}
                </p>
              </div>
              <div className="max-w-2xl overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60">
                  Consolidado
                </p>
                {resumenLiq.consolidado.map((fila, idx) => (
                  <div
                    key={`cons-${idx}-${fila.label}`}
                    className={`flex justify-between gap-3 border-b border-gray-200 px-4 py-2 text-sm last:border-b-0 dark:border-gray-700 ${
                      fila.destacado || fila.bold ? 'font-semibold' : ''
                    }`}
                  >
                    <span>{fila.label}</span>
                    <span className="font-mono tabular-nums">$ {formatearMonto(fila.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <ChecklistEvaluacionSismicaNSR10
              formData={formDataNsr}
              onInputChange={handleNsrChange}
              modoLiquidador
              recargosPresupuesto={RECARGOS_PRESUPUESTO_NSR10_CAT}
            />
          </section>

          <section className={expressFormSection}>
            <h3 className={expressSectionTitle}>6. {t('segurosSura.reportUnique.sectionTable')}</h3>
            <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
              Resumen de ítems del presupuesto NSR-10.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Actividad</th>
                    <th className="px-2 py-2">Cant.</th>
                    <th className="px-2 py-2">V. unitario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(liquidador?.evaluacionSismicaNSR10?.presupuesto?.items || [])
                    .filter((it) => String(it?.actividad || '').trim())
                    .map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="px-2 py-2">{idx + 1}</td>
                        <td className="px-2 py-2">{it.actividad || '—'}</td>
                        <td className="px-2 py-2">{it.cantidad ?? '—'}</td>
                        <td className="px-2 py-2">$ {formatearMonto(it.valorUnitario)}</td>
                      </tr>
                    ))}
                  {!(liquidador?.evaluacionSismicaNSR10?.presupuesto?.items || []).some((it) =>
                    String(it?.actividad || '').trim()
                  ) && (
                    <tr>
                      <td colSpan={4} className="px-2 py-4 text-center text-gray-500">
                        {t('segurosSura.reportUnique.noSettlementItems')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            {nFotos}. {t('segurosSura.reportUnique.sectionPhotos')}
          </h3>
          {casoSura?._id && fotosPendientesArchivero.length > 0 && (
            <button
              type="button"
              className={expressBtnSecondary}
              disabled={importandoFotosArchivero || guardandoCaso}
              onClick={handleTraerFotosArchivero}
            >
              <FaImages />
              {importandoFotosArchivero
                ? t('segurosSura.archive.importToReportWorking')
                : t('segurosSura.archive.importToReport', {
                    count: fotosPendientesArchivero.length,
                  })}
            </button>
          )}
        </div>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          Las fotos de la pestaña Fotos aparecen aquí. También puede arrastrar, tomar o seleccionar más
          imágenes. Deben listarse abajo en «Imágenes Cargadas» para poner descripción y generar el Word.
        </p>
        {fotosPendientesArchivero.length > 0 && (
          <p className="mb-3 font-body text-xs text-amber-800 dark:text-amber-200">
            {t('segurosSura.archive.importToReportHint', {
              count: fotosPendientesArchivero.length,
            })}
          </p>
        )}
        <FotosInspeccionSura
          casoId={casoSura?._id}
          fotosInforme={informe.fotosInspeccion || []}
          onFotosInformeChange={(lista) => setCampo('fotosInspeccion', lista)}
          onArchivoCreado={(creado) => {
            if (creado) appendArchivosAlCaso([creado]);
            setMensaje(t('segurosSura.reportUnique.photosUploaded', { count: 1 }));
          }}
          onArchivoEliminado={(archivoId) => {
            quitarArchivoDelCaso(archivoId);
            setMensaje(t('segurosSura.archive.deleteOk'));
          }}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nRecomendacion}. {t('segurosSura.reportUnique.recommendation')}
        </h3>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={6}
          value={informe.recomendacion || ''}
          onChange={(e) => setCampo('recomendacion', e.target.value)}
          placeholder={t('segurosSura.reportUnique.recommendationPlaceholder')}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nFirmas}. {t('segurosSura.reportUnique.sectionSignatures')}
        </h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.reportUnique.signaturesHint')}
        </p>
        <SeccionFirmasActa
          formData={informe}
          onInputChange={setCampo}
          tituloAjustador={t('segurosSura.reportUnique.signatureAdjuster')}
          nombreRolProfesional="ajustador"
          permitirRegistrarAjustadores
          sinContenedor
          soloAjustador
        />
      </section>
      </>
      )}

      <div className="flex flex-wrap items-center justify-start gap-3 border-t border-gray-100 pb-16 pt-4 dark:border-gray-800">
        <button
          type="button"
          className={expressBtnPrimary}
          disabled={guardandoCaso}
          onClick={() => {
            if (!onGuardarEnCaso) {
              setError(t('segurosSura.reportUnique.savedCaseRequired'));
              return;
            }
            onGuardarEnCaso(informe);
          }}
        >
          <FaSave />{' '}
          {guardandoCaso
            ? t('segurosSura.reportUnique.saving')
            : t('common.save')}
        </button>
        <button
          type="button"
          className={expressBtnSecondary}
          disabled={descargando}
          onClick={handleDescargar}
        >
          {esUnico ? <FaFileExcel /> : <FaFileWord />}{' '}
          {esUnico
            ? t('segurosSura.reportUnique.downloadExcel')
            : t('segurosSura.reportUnique.downloadWord')}
        </button>
      </div>
    </div>
  );
}
