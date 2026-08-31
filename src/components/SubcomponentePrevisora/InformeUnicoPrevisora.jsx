import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileWord, FaMapMarkerAlt, FaPlus, FaRedo, FaTrash } from 'react-icons/fa';
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
  INFO_EVENTO_DEFAULT_PREVISORA,
  calcularLiquidacionPrevisora,
  completarFilasPolizaCoberturaPrevisora,
  defaultInformeUnicoPrevisora,
  etiquetaArchivoInformePrevisora,
  formDataNsrDesdeLiquidadorPrevisora,
  formatearMonto,
  formatDateLarga,
  mapcasoPrevisoraALiquidador,
  normalizarTipoInformePrevisora,
  reservaSugeridaPrevisora,
} from './liquidadorPrevisoraHelpers.js';
import { descargarWordInformePrevisora } from './generarWordInformePrevisora.js';
import { previsoraArchivosApi } from './previsoraArchivosApi.js';
import FotosInspeccionZurich from '../SubcomponenteZurich/FotosInspeccionZurich.jsx';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import { RECARGOS_PRESUPUESTO_NSR10_CAT } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';
import SelectorTipoInformePrevisora from './SelectorTipoInformePrevisora.jsx';

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

function TablaFilasPrevisora({
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
              <tr key={`${idx}-${fila.concepto || 'fila'}`}>
                {columnas.map((col) => (
                  <td key={col.key} className="align-top px-2 py-2">
                    {col.type === 'textarea' ? (
                      <textarea
                        className="min-h-[72px] w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
                        rows={col.rows || 3}
                        value={fila[col.key] || ''}
                        onChange={(e) => onChangeFila(idx, col.key, e.target.value)}
                        placeholder={col.placeholder || ''}
                      />
                    ) : (
                      <InputFenix
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

export default function InformeUnicoPrevisora({
  casoPrevisora = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
  origen = 'cat',
  liquidadorInicial = null,
}) {
  const { t } = useTranslation();
  const api = useMemo(() => previsoraArchivosApi(origen), [origen]);
  const [informe, setInforme] = useState(() => defaultInformeUnicoPrevisora(casoPrevisora || {}));
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapcasoPrevisoraALiquidador(casoPrevisora || {})
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

  const totales = useMemo(() => calcularLiquidacionPrevisora(liquidador), [liquidador]);
  const criterio = totales.criterio || {};
  const tipoInforme = normalizarTipoInformePrevisora(informe.tipoInforme, 'unico');
  const esPreliminar = tipoInforme === 'preliminar';
  const esFinal = tipoInforme === 'final';
  const nFotos = esPreliminar ? 4 : 6;
  const nConclusiones = esPreliminar ? 5 : 7;
  const nFirmas = esPreliminar ? 6 : 8;
  const reservaMostrada = useMemo(() => reservaSugeridaPrevisora(informe), [informe]);
  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorPrevisora(liquidador, casoPrevisora || {}),
    [liquidador, casoPrevisora]
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

  useEffect(() => {
    const caso = casoPrevisora || {};
    const liq = liquidadorInicial || mapcasoPrevisoraALiquidador(caso);
    const base = defaultInformeUnicoPrevisora(caso);
    setInforme({
      ...base,
      filasPolizaCobertura: completarFilasPolizaCoberturaPrevisora(base.filasPolizaCobertura, {
        caso,
        encabezado: liq.encabezado,
        informe: base,
        liquidador: liq,
      }),
    });
    setLiquidador(liq);
  }, [casoPrevisora?._id]);

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
    const nextTipo = normalizarTipoInformePrevisora(tipo, tipoInforme);
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
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_PREVISORA);
  };

  const handleWord = async () => {
    setDescargando(true);
    setError('');
    setMensaje('');
    const mimeWord =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    try {
      const resultado = await descargarWordInformePrevisora({
        caso: casoPrevisora || {},
        informe,
        liquidador,
      });
      const casoId = casoPrevisora?._id;
      const blob = resultado?.blob;
      const nombre =
        resultado?.nombre ||
        resultado?.filename ||
        `Informe_Previsora_${casoPrevisora?.siniestro || casoPrevisora?.consecutivo || 'caso'}.docx`;
      if (!casoId || !blob) {
        setMensaje(t('previsora.reportUnique.wordNeedsCase'));
        return;
      }
      try {
        const file = new File([blob], nombre, { type: mimeWord });
        const creado = await api.subir(
          casoId,
          file,
          etiquetaArchivoInformePrevisora(informe.tipoInforme)
        );
        appendArchivosAlCaso([creado]);
        setMensaje(t('previsora.reportUnique.wordSavedArchive'));
      } catch (errArchivo) {
        console.warn('No se pudo guardar el informe en el archivero:', errArchivo);
        setError(t('previsora.reportUnique.wordArchiveError'));
      }
    } catch (err) {
      console.error(err);
      setError(t('previsora.reportUnique.wordError'));
    } finally {
      setDescargando(false);
    }
  };

  const appendArchivosAlCaso = (creados = []) => {
    const lista = (Array.isArray(creados) ? creados : [creados]).filter(Boolean);
    if (!lista.length) return;
    onCasoChange?.((prev) => {
      if (!prev) return prev;
      const actuales = Array.isArray(prev.archivos) ? prev.archivos : [];
      const ids = new Set(actuales.map((a) => String(a?._id || '')).filter(Boolean));
      const extra = lista.filter((a) => a?._id && !ids.has(String(a._id)));
      if (!extra.length) return prev;
      return { ...prev, archivos: [...actuales, ...extra] };
    });
  };

  const quitarArchivoDelCaso = (archivoId) => {
    if (!archivoId) return;
    onCasoChange?.((prev) => {
      if (!prev) return prev;
      const actuales = Array.isArray(prev.archivos) ? prev.archivos : [];
      return {
        ...prev,
        archivos: actuales.filter((a) => String(a?._id) !== String(archivoId)),
      };
    });
  };

  return (
    <div className="space-y-5">
      {mensaje && <p className={expressAlertSuccess}>{mensaje}</p>}
      {error && <p className={expressAlertError}>{error}</p>}

      <SelectorTipoInformePrevisora
        tipo={tipoInforme}
        onElegir={elegirTipoInforme}
        disabled={guardandoCaso}
      />

      <p className="font-body text-sm text-gray-600 dark:text-gray-400">
        {tipoInforme === 'preliminar'
          ? t('previsora.reportUnique.complementPreliminar')
          : tipoInforme === 'final'
            ? t('previsora.reportUnique.complementFinal')
            : t('previsora.reportUnique.complementUnico')}
      </p>

      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            1. {t('previsora.reportUnique.sectionEvent')}
          </h3>
          <button type="button" className={expressBtnGhost} onClick={restaurarInfoEvento}>
            <FaRedo /> {t('previsora.reportUnique.resetEvent')}
          </button>
        </div>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('previsora.reportUnique.eventHint')}
        </p>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={6}
          value={informe.infoEvento || ''}
          onChange={(e) => setCampo('infoEvento', e.target.value)}
        />
        <figure className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <img
            src={`${import.meta.env.BASE_URL || '/'}templates/mapa-evento-siniestro-Zurich.png`}
            alt={t('previsora.reportUnique.eventMapAlt')}
            className="mx-auto max-h-[420px] w-full object-contain bg-white p-2"
          />
          <figcaption className="border-t border-gray-100 px-3 py-2 text-center font-body text-xs text-gray-500 dark:border-gray-800">
            {t('previsora.reportUnique.eventMapCaption')}
          </figcaption>
        </figure>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label={t('previsora.reportUnique.adjuster')}>
            <InputFenix
              value={informe.ajustadorNombre || ''}
              onChange={(e) => setCampo('ajustadorNombre', e.target.value)}
            />
          </Campo>
          <Campo label={t('previsora.reportUnique.reportDate')}>
            <InputFenix
              type="date"
              value={informe.fechaInforme || ''}
              onChange={(e) => setCampo('fechaInforme', e.target.value)}
            />
          </Campo>
          <Campo label={t('previsora.reportUnique.suggestedReserve')}>
            <InputMonedaExpress
              className="font-mono tabular-nums"
              value={informe.reservaSugerida || ''}
              onChange={(e) => setCampo('reservaSugerida', e.target.value)}
              placeholder="$ 0"
            />
          </Campo>
        </div>
        <p className="mt-2 font-body text-xs text-gray-500">
          {t('previsora.reportUnique.suggestedReserveHint', {
            valor: formatearMonto(reservaMostrada),
          })}
        </p>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          2. {t('previsora.reportUnique.sectionDamages')}
        </h3>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={5}
          value={informe.descripcionDanios || ''}
          onChange={(e) => setCampo('descripcionDanios', e.target.value)}
          placeholder={t('previsora.reportUnique.sectionDamagesHint')}
        />

        <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              <FaMapMarkerAlt className="text-blue-600" />
              {t('previsora.reportUnique.sectionRiskMap')}
            </h4>
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setForzarCapturaMapa((n) => n + 1)}
            >
              {t('previsora.reportUnique.updateMapCapture')}
            </button>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Campo label={t('previsora.reportUnique.latitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.latitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
            <Campo label={t('previsora.reportUnique.longitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.longitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
          </div>

          <Campo label={t('previsora.reportUnique.coordinatesText')}>
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
              direccionInicial={informe.direccionRiesgo || casoPrevisora?.direccionPredio || ''}
              capturaInicial={capturaMapaInicial || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChange}
            />
          </div>
          <p className="mt-2 font-body text-xs text-gray-500">
            {capturaMapaInicial
              ? t('previsora.reportUnique.mapCaptureReady')
              : t('previsora.reportUnique.mapCaptureHint')}
          </p>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>3. {t('previsora.reportUnique.sectionPolicy')}</h3>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{t('previsora.fields.tomador')}</dt>
            <dd className="font-medium">{casoPrevisora?.tomador || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('previsora.fields.numeroPoliza')}</dt>
            <dd className="font-medium">{casoPrevisora?.numeroPoliza || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('previsora.fields.fechaInicioPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoPrevisora?.fechaInicioPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('previsora.fields.fechaFinPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoPrevisora?.fechaFinPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('previsora.fields.cobertura')}</dt>
            <dd className="font-medium">{casoPrevisora?.cobertura || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('previsora.fields.estadoPagoPrimas')}</dt>
            <dd className="font-medium">{casoPrevisora?.estadoPagoPrimas || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('previsora.fields.direccionPredio')}</dt>
            <dd className="font-medium">{casoPrevisora?.direccionPredio || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">
              {t('previsora.fields.ciudad')} / {t('previsora.fields.departamento')}
            </dt>
            <dd className="font-medium">
              {casoPrevisora?.ciudad || '—'} / {casoPrevisora?.departamento || '—'}
            </dd>
          </div>
        </dl>
        <p className="mb-3 mt-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.reportUnique.sectionPolicyTableHint')}
        </p>
        <TablaFilasPrevisora
          columnas={[
            { key: 'concepto', label: t('previsora.reportUnique.colConcepto'), type: 'textarea', rows: 2 },
            {
              key: 'analisis',
              label: t('previsora.reportUnique.colAnalisis'),
              type: 'textarea',
              rows: 3,
            },
            {
              key: 'conclusion',
              label: t('previsora.reportUnique.colConclusion'),
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
          addLabel={t('previsora.reportUnique.addPolicyRow')}
          emptyLabel={t('previsora.reportUnique.emptyPolicyRows')}
        />
      </section>

      {!esPreliminar && (
      <>
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
            ? '4. Liquidador NSR-10'
            : '4. Dictamen y liquidador NSR-10'}
        </h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.reportUnique.finalAddsSettlement')}
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
            <span>{t('previsora.settlement.totalPay')}</span>
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
        <h3 className={expressSectionTitle}>5. {t('previsora.reportUnique.sectionTable')}</h3>
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
                    {t('previsora.reportUnique.noSettlementItems')}
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
          {nFotos}. {t('previsora.reportUnique.sectionPhotos')}
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.reportUnique.photosUploadHint')}
        </p>
        <FotosInspeccionZurich
          casoId={casoPrevisora?._id}
          origen={origen}
          api={api}
          inputIdPrefix="previsora-foto"
          fotosInforme={informe.fotosInspeccion || []}
          onFotosInformeChange={(lista) => setCampo('fotosInspeccion', lista)}
          onArchivoCreado={(creado) => {
            if (creado) appendArchivosAlCaso([creado]);
            setMensaje(t('previsora.reportUnique.photosUploaded', { count: 1 }));
          }}
          onArchivoEliminado={(archivoId) => {
            quitarArchivoDelCaso(archivoId);
            setMensaje(t('previsora.archive.deleteOk'));
          }}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nConclusiones}. {t('previsora.reportUnique.sectionConclusions')}
        </h3>
        <Campo label={t('previsora.reportUnique.conclusions')}>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
            rows={4}
            value={informe.conclusiones || ''}
            onChange={(e) => setCampo('conclusiones', e.target.value)}
          />
        </Campo>
        <div className="mt-3">
          <Campo label={t('previsora.reportUnique.recommendation')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={4}
              value={informe.recomendacion || ''}
              onChange={(e) => setCampo('recomendacion', e.target.value)}
            />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nFirmas}. {t('previsora.reportUnique.sectionSignatures')}
        </h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.reportUnique.signaturesHint')}
        </p>
        <SeccionFirmasActa
          formData={informe}
          onInputChange={setCampo}
          tituloAjustador={t('previsora.reportUnique.signatureAdjuster')}
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
          <FaFileWord />{' '}
          {esPreliminar
            ? t('previsora.reportUnique.downloadPreliminar')
            : esFinal
              ? t('previsora.reportUnique.downloadFinal')
              : t('previsora.reportUnique.downloadUnico')}
        </button>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={() => onGuardarEnCaso(informe)}
          >
            {guardandoCaso
              ? t('previsora.reportUnique.saving')
              : t('previsora.reportUnique.saveDraft')}
          </button>
        )}
      </div>
    </div>
  );
}
