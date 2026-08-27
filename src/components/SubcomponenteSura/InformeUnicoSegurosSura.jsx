import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileAlt, FaFileSignature, FaFileWord, FaMapMarkerAlt, FaPlus, FaRedo, FaTrash } from 'react-icons/fa';
import {
  Campo,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  InputFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  INFO_EVENTO_DEFAULT_SURA,
  NIVELES_AFECTACION_SURA,
  calcularLiquidacionSura,
  etiquetaArchivoInformeSura,
  formDataNsrDesdeLiquidadorSura,
  formatearMonto,
  formatDateLarga,
  mapCasoSuraALiquidador,
  normalizarTipoInformeSura,
  reservaSugeridaSura,
  totalPresupuestoPreliminarSura,
} from './liquidadorSuraHelpers.js';
import { fusionarFotosAgilEnInforme, informeUnicoConFotosAgil } from './informeAgilSuraHelpers.js';
import { descargarWordInformeSura } from './generarWordInformeSura.js';
import { subirArchivoSura } from '../../services/segurosSuraService.js';
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

  const totales = useMemo(() => calcularLiquidacionSura(liquidador), [liquidador]);
  const criterio = totales.criterio || {};
  const tipoInforme = normalizarTipoInformeSura(informe.tipoInforme, 'preliminar');
  const esPreliminar = tipoInforme === 'preliminar';
  const totalPreliminar = useMemo(
    () => totalPresupuestoPreliminarSura(informe.filasPresupuestoPreliminar),
    [informe.filasPresupuestoPreliminar]
  );
  const reservaMostrada = useMemo(() => reservaSugeridaSura(informe), [informe]);
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
    setInforme((prev) => ({
      ...prev,
      [campo]: [...(Array.isArray(prev[campo]) ? prev[campo] : []), vacia],
    }));
  };

  const removeFila = (campo, idx) => {
    setInforme((prev) => ({
      ...prev,
      [campo]: (Array.isArray(prev[campo]) ? prev[campo] : []).filter((_, i) => i !== idx),
    }));
  };

  const handleNsrChange = (patch) => {
    setLiquidador((prev) => ({ ...prev, ...patch, modelo: 'nsr10' }));
  };

  const restaurarInfoEvento = () => {
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_SURA);
  };

  const handleWord = async () => {
    setDescargando(true);
    setError('');
    setMensaje('');
    try {
      const resultado = await descargarWordInformeSura({
        caso: casoSura || {},
        informe,
        liquidador,
      });
      const casoId = casoSura?._id;
      if (!casoId) {
        setMensaje(t('segurosSura.reportUnique.wordNeedsCase'));
        return;
      }
      const blob = resultado?.blob;
      const nombre =
        resultado?.nombre ||
        resultado?.filename ||
        `Informe_Sura_${casoSura.siniestro || casoSura.consecutivo || 'caso'}.docx`;
      if (!blob) {
        setMensaje(t('segurosSura.reportUnique.wordNeedsCase'));
        return;
      }
      try {
        const file = new File([blob], nombre, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const creado = await subirArchivoSura(
          casoId,
          file,
          etiquetaArchivoInformeSura(informe.tipoInforme)
        );
        appendArchivosAlCaso([creado]);
        setMensaje(t('segurosSura.reportUnique.wordSavedArchive'));
      } catch (errArchivo) {
        console.warn('No se pudo guardar el informe en el archivero:', errArchivo);
        setError(t('segurosSura.reportUnique.wordArchiveError'));
      }
    } catch (err) {
      console.error(err);
      setError(t('segurosSura.reportUnique.wordError'));
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

  const nFotos = esPreliminar ? 5 : 7;
  const nConclusiones = 4;
  const nFirmas = esPreliminar ? 6 : 8;

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
            <FaFileWord className="mb-2 text-fenix-primario" />
            <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
              {t('segurosSura.reportUnique.typeUnico')}
            </span>
            <span className="mt-1 font-body text-xs text-gray-500">
              {t('segurosSura.reportUnique.typeUnicoHint')}
            </span>
          </button>
        </div>
      </section>

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
            <InputFenix
              className="font-mono"
              value={informe.reservaSugerida || ''}
              onChange={(e) => setCampo('reservaSugerida', e.target.value)}
              placeholder={formatearMonto(totalPreliminar) || '0'}
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
          {t('segurosSura.reportUnique.sectionDamagesTableHint')}
        </p>
        <TablaFilasSura
          columnas={[
            { key: 'zona', label: t('segurosSura.reportUnique.colZona'), type: 'textarea', rows: 2 },
            {
              key: 'condicion',
              label: t('segurosSura.reportUnique.colCondicion'),
              type: 'textarea',
              rows: 3,
            },
            {
              key: 'nivel',
              label: t('segurosSura.reportUnique.colNivel'),
              type: 'select',
              options: NIVELES_AFECTACION_SURA,
            },
          ]}
          filas={informe.filasDanios}
          onChangeFila={(idx, key, valor) => setFila('filasDanios', idx, key, valor)}
          onAdd={() => addFila('filasDanios', { zona: '', condicion: '', nivel: '' })}
          onRemove={(idx) => removeFila('filasDanios', idx)}
          addLabel={t('segurosSura.reportUnique.addDamageRow')}
          emptyLabel={t('segurosSura.reportUnique.emptyDamageRows')}
        />
        <div className="mt-4">
          <Campo label={t('segurosSura.reportUnique.sectionDamagesNarrative')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={5}
              value={informe.descripcionDanios || ''}
              onChange={(e) => setCampo('descripcionDanios', e.target.value)}
              placeholder={t('segurosSura.reportUnique.sectionDamagesHint')}
            />
          </Campo>
        </div>

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
          {nConclusiones}. {t('segurosSura.reportUnique.sectionConclusions')}
        </h3>
        <p className="mb-3 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t('segurosSura.reportUnique.sectionPreliminaryBudget')}
        </p>
        <TablaFilasSura
          columnas={[
            {
              key: 'capitulo',
              label: t('segurosSura.reportUnique.colCapitulo'),
              type: 'textarea',
              rows: 2,
            },
            {
              key: 'descripcion',
              label: t('segurosSura.reportUnique.colDescripcionAlcance'),
              type: 'textarea',
              rows: 3,
            },
            {
              key: 'valor',
              label: t('segurosSura.reportUnique.colValorEstimado'),
              mono: true,
              placeholder: '0',
            },
          ]}
          filas={informe.filasPresupuestoPreliminar}
          onChangeFila={(idx, key, valor) =>
            setFila('filasPresupuestoPreliminar', idx, key, valor)
          }
          onAdd={() =>
            addFila('filasPresupuestoPreliminar', { capitulo: '', descripcion: '', valor: '' })
          }
          onRemove={(idx) => removeFila('filasPresupuestoPreliminar', idx)}
          addLabel={t('segurosSura.reportUnique.addBudgetRow')}
          emptyLabel={t('segurosSura.reportUnique.emptyBudgetRows')}
        />
        <div className="mt-3 flex max-w-xl justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold dark:border-gray-700">
          <span>{t('segurosSura.reportUnique.totalPreliminaryReserve')}</span>
          <span>$ {formatearMonto(totalPreliminar)}</span>
        </div>

        <div className="mt-5">
          <Campo label={t('segurosSura.reportUnique.conclusions')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={4}
              value={informe.conclusiones || ''}
              onChange={(e) => setCampo('conclusiones', e.target.value)}
            />
          </Campo>
        </div>
        <div className="mt-3">
          <Campo label={t('segurosSura.reportUnique.recommendation')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={4}
              value={informe.recomendacion || ''}
              onChange={(e) => setCampo('recomendacion', e.target.value)}
            />
          </Campo>
        </div>
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

            <div className="mb-4 grid max-w-xl grid-cols-1 gap-1 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>Total daños (NSR-10)</span>
                <span>$ {formatearMonto(totales.totalDanios)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>Hospedaje</span>
                <span>$ {formatearMonto(totales.diagrama?.gastosHospedaje)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>Deducible</span>
                <span>{totales.deducibleTexto || 'No aplica'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>Otros amparos (sin deducible)</span>
                <span>$ {formatearMonto(totales.totalOtrosAmparos)}</span>
              </div>
              <div className="flex justify-between px-4 py-2 text-sm font-bold">
                <span>{t('segurosSura.settlement.totalPay')}</span>
                <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
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
        <h3 className={expressSectionTitle}>
          {nFotos}. {t('segurosSura.reportUnique.sectionPhotos')}
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          Las fotos de la pestaña Fotos aparecen aquí. También puede arrastrar, tomar o seleccionar más
          imágenes. Deben listarse abajo en «Imágenes Cargadas» para poner descripción y generar el Word.
        </p>
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

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <button
          type="button"
          className={expressBtnSecondary}
          disabled={descargando}
          onClick={handleWord}
        >
          <FaFileWord /> {t('segurosSura.reportUnique.downloadWord')}
        </button>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={() => onGuardarEnCaso(informe)}
          >
            {guardandoCaso
              ? t('segurosSura.reportUnique.saving')
              : t('segurosSura.reportUnique.saveDraft')}
          </button>
        )}
      </div>
    </div>
  );
}
