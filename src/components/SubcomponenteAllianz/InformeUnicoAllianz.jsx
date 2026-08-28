import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileWord, FaMapMarkerAlt, FaPlus, FaRedo, FaTrash } from 'react-icons/fa';
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
  INFO_EVENTO_DEFAULT_ALLIANZ,
  NIVELES_AFECTACION_ALLIANZ,
  calcularLiquidacionAllianz,
  casoAllianzConInforme,
  defaultInformeUnicoAllianz,
  desgloseDeducibleTerremotoAllianz,
  etiquetaArchivoInformeAllianz,
  formDataNsrDesdeLiquidadorAllianz,
  formatearMonto,
  formatDateLarga,
  itemsPlanosAllianz,
  mapcasoAllianzALiquidador,
  normalizarTipoInformeAllianz,
  patchDeduciblePresupuestoAllianz,
  reservaSugeridaAllianz,
  totalPresupuestoPreliminarAllianz,
} from './liquidadorAllianzHelpers.js';
import { descargarWordInformeAllianz } from './generarWordInformeAllianz.js';
import { allianzArchivosApi } from './allianzArchivosApi.js';
import FotosInspeccionZurich from '../SubcomponenteZurich/FotosInspeccionZurich.jsx';
import SelectorTipoInformeAllianz from './SelectorTipoInformeAllianz.jsx';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import { RECARGOS_PRESUPUESTO_NSR10_CAT } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';
import CotizacionPdfLiquidacion from '../liquidacion/CotizacionPdfLiquidacion.jsx';
import {
  serializarPaginasCotizacion,
  montoCotizacionPdf,
  usaCotizacionComoBasePresupuesto,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import EditorDeducibleLibreAllianz from './EditorDeducibleLibreAllianz.jsx';

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

function TablaFilasAllianz({
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

export default function InformeUnicoAllianz({
  casoAllianz = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
  origen = 'cat',
  liquidadorInicial = null,
  informeInicial = null,
  tipoInformeExterno = null,
  ocultarSelector = false,
}) {
  const { t } = useTranslation();
  const api = useMemo(() => allianzArchivosApi(origen), [origen]);
  const [informe, setInforme] = useState(() =>
    defaultInformeUnicoAllianz(casoAllianzConInforme(casoAllianz || {}, informeInicial))
  );
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapcasoAllianzALiquidador(casoAllianz || {})
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

  const totales = useMemo(() => calcularLiquidacionAllianz(liquidador), [liquidador]);
  const desgloseDed = useMemo(
    () => desgloseDeducibleTerremotoAllianz(liquidador, totales.diagrama),
    [liquidador, totales.diagrama]
  );
  const tieneCotizacionPdf = Boolean(
    (Array.isArray(liquidador.cotizacionPdf?.paginas) && liquidador.cotizacionPdf.paginas.length) ||
      liquidador.cotizacionPdf?.archivoPdf
  );
  const itemsResumen = useMemo(() => itemsPlanosAllianz(liquidador), [liquidador]);
  const criterio = totales.criterio || {};
  const tipoInforme = normalizarTipoInformeAllianz(informe.tipoInforme, 'preliminar');
  const esPreliminar = tipoInforme === 'preliminar';
  const totalPreliminar = useMemo(
    () => totalPresupuestoPreliminarAllianz(informe.filasPresupuestoPreliminar),
    [informe.filasPresupuestoPreliminar]
  );
  const reservaMostrada = useMemo(() => reservaSugeridaAllianz(informe), [informe]);
  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorAllianz(liquidador, casoAllianz || {}),
    [liquidador, casoAllianz]
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
    setInforme(
      defaultInformeUnicoAllianz(casoAllianzConInforme(casoAllianz || {}, informeInicial))
    );
    setLiquidador(liquidadorInicial || mapcasoAllianzALiquidador(casoAllianz || {}));
  }, [casoAllianz?._id]);

  useEffect(() => {
    if (!tipoInformeExterno) return;
    setInforme((prev) => {
      const actual = normalizarTipoInformeAllianz(prev?.tipoInforme, 'preliminar');
      if (actual === tipoInformeExterno) return prev;
      return { ...prev, tipoInforme: tipoInformeExterno };
    });
  }, [tipoInformeExterno]);

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
    const nextTipo = normalizarTipoInformeAllianz(tipo, tipoInforme);
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

  const handleCotizacionChange = (cotizacionPdf) => {
    setLiquidador((prev) => ({ ...prev, cotizacionPdf }));
    setInforme((prev) => ({
      ...prev,
      fotosCotizacion: serializarPaginasCotizacion(cotizacionPdf?.paginas),
    }));
  };

  const actualizarDeduciblePresupuesto = (patch) => {
    setLiquidador((prev) => patchDeduciblePresupuestoAllianz(prev, patch));
  };

  const restaurarInfoEvento = () => {
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_ALLIANZ);
  };

  const handleWord = async () => {
    setDescargando(true);
    setError('');
    setMensaje('');
    try {
      const resultado = await descargarWordInformeAllianz({
        caso: casoAllianz || {},
        informe,
        liquidador,
      });
      const blob = resultado?.blob;
      const nombre = resultado?.filename || resultado?.nombre;
      if (blob && nombre && casoAllianz?._id) {
        try {
          const file = new File(
            [blob],
            nombre,
            { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
          );
          const creado = await api.subir(
            casoAllianz._id,
            file,
            etiquetaArchivoInformeAllianz(informe.tipoInforme)
          );
          onCasoChange?.((prev) => {
            if (!prev) return prev;
            const list = Array.isArray(prev.archivos) ? prev.archivos : [];
            return { ...prev, archivos: [...list, creado] };
          });
          setMensaje(t('allianz.reportUnique.wordSavedArchive'));
        } catch (errArchivo) {
          console.warn('No se pudo guardar el informe en el archivero Allianz:', errArchivo);
          setError(t('allianz.reportUnique.wordArchiveError'));
        }
      }
    } catch (err) {
      console.error(err);
      setError(t('allianz.reportUnique.wordError'));
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

  const nFotos = esPreliminar ? 5 : 7;
  const nConclusiones = esPreliminar ? 4 : 4;
  const nFirmas = esPreliminar ? 6 : 8;

  return (
    <div className="space-y-5">
      {mensaje && <p className={expressAlertSuccess}>{mensaje}</p>}
      {error && <p className={expressAlertError}>{error}</p>}

      {!ocultarSelector && (
        <SelectorTipoInformeAllianz
          tipo={tipoInforme}
          onElegir={elegirTipoInforme}
          disabled={guardandoCaso}
        />
      )}

      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            1. {t('allianz.reportUnique.sectionEvent')}
          </h3>
          <button type="button" className={expressBtnGhost} onClick={restaurarInfoEvento}>
            <FaRedo /> {t('allianz.reportUnique.resetEvent')}
          </button>
        </div>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('allianz.reportUnique.eventHint')}
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
            alt={t('allianz.reportUnique.eventMapAlt')}
            className="mx-auto max-h-[420px] w-full object-contain bg-white p-2"
          />
          <figcaption className="border-t border-gray-100 px-3 py-2 text-center font-body text-xs text-gray-500 dark:border-gray-800">
            {t('allianz.reportUnique.eventMapCaption')}
          </figcaption>
        </figure>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label={t('allianz.reportUnique.adjuster')}>
            <InputFenix
              value={informe.ajustadorNombre || ''}
              onChange={(e) => setCampo('ajustadorNombre', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.reportUnique.reportDate')}>
            <InputFenix
              type="date"
              value={informe.fechaInforme || ''}
              onChange={(e) => setCampo('fechaInforme', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.reportUnique.suggestedReserve')}>
            <InputFenix
              className="font-mono"
              value={informe.reservaSugerida || ''}
              onChange={(e) => setCampo('reservaSugerida', e.target.value)}
              placeholder={formatearMonto(totalPreliminar) || '1.000.000.000'}
            />
          </Campo>
        </div>
        <p className="mt-2 font-body text-xs text-gray-500">
          {t('allianz.reportUnique.suggestedReserveHint', {
            valor: formatearMonto(reservaMostrada),
          })}
        </p>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          2. {t('allianz.reportUnique.sectionDamages')}
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('allianz.reportUnique.sectionDamagesTableHint')}
        </p>
        <TablaFilasAllianz
          columnas={[
            { key: 'zona', label: t('allianz.reportUnique.colZona'), type: 'textarea', rows: 2 },
            {
              key: 'condicion',
              label: t('allianz.reportUnique.colCondicion'),
              type: 'textarea',
              rows: 3,
            },
            {
              key: 'nivel',
              label: t('allianz.reportUnique.colNivel'),
              type: 'select',
              options: NIVELES_AFECTACION_ALLIANZ,
            },
          ]}
          filas={informe.filasDanios}
          onChangeFila={(idx, key, valor) => setFila('filasDanios', idx, key, valor)}
          onAdd={() => addFila('filasDanios', { zona: '', condicion: '', nivel: '' })}
          onRemove={(idx) => removeFila('filasDanios', idx)}
          addLabel={t('allianz.reportUnique.addDamageRow')}
          emptyLabel={t('allianz.reportUnique.emptyDamageRows')}
        />
        <div className="mt-4">
          <Campo label={t('allianz.reportUnique.sectionDamagesNarrative')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={5}
              value={informe.descripcionDanios || ''}
              onChange={(e) => setCampo('descripcionDanios', e.target.value)}
              placeholder={t('allianz.reportUnique.sectionDamagesHint')}
            />
          </Campo>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              <FaMapMarkerAlt className="text-blue-600" />
              {t('allianz.reportUnique.sectionRiskMap')}
            </h4>
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setForzarCapturaMapa((n) => n + 1)}
            >
              {t('allianz.reportUnique.updateMapCapture')}
            </button>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Campo label={t('allianz.reportUnique.latitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.latitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
            <Campo label={t('allianz.reportUnique.longitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.longitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
          </div>

          <Campo label={t('allianz.reportUnique.coordinatesText')}>
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
              direccionInicial={informe.direccionRiesgo || casoAllianz?.direccionPredio || ''}
              capturaInicial={capturaMapaInicial || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChange}
            />
          </div>
          <p className="mt-2 font-body text-xs text-gray-500">
            {capturaMapaInicial
              ? t('allianz.reportUnique.mapCaptureReady')
              : t('allianz.reportUnique.mapCaptureHint')}
          </p>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>3. {t('allianz.reportUnique.sectionPolicy')}</h3>
        <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{t('allianz.fields.tomador')}</dt>
            <dd className="font-medium">{casoAllianz?.tomador || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('allianz.fields.numeroPoliza')}</dt>
            <dd className="font-medium">{casoAllianz?.numeroPoliza || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('allianz.fields.fechaInicioPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoAllianz?.fechaInicioPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('allianz.fields.fechaFinPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoAllianz?.fechaFinPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('allianz.fields.cobertura')}</dt>
            <dd className="font-medium">{casoAllianz?.cobertura || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('allianz.fields.estadoPagoPrimas')}</dt>
            <dd className="font-medium">{casoAllianz?.estadoPagoPrimas || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('allianz.fields.direccionPredio')}</dt>
            <dd className="font-medium">{casoAllianz?.direccionPredio || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">
              {t('allianz.fields.ciudad')} / {t('allianz.fields.departamento')}
            </dt>
            <dd className="font-medium">
              {casoAllianz?.ciudad || '—'} / {casoAllianz?.departamento || '—'}
            </dd>
          </div>
        </dl>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('allianz.reportUnique.sectionPolicyTableHint')}
        </p>
        <TablaFilasAllianz
          columnas={[
            { key: 'concepto', label: t('allianz.reportUnique.colConcepto'), type: 'textarea', rows: 2 },
            {
              key: 'analisis',
              label: t('allianz.reportUnique.colAnalisis'),
              type: 'textarea',
              rows: 3,
            },
            {
              key: 'conclusion',
              label: t('allianz.reportUnique.colConclusion'),
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
          addLabel={t('allianz.reportUnique.addPolicyRow')}
          emptyLabel={t('allianz.reportUnique.emptyPolicyRows')}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nConclusiones}. {t('allianz.reportUnique.sectionConclusions')}
        </h3>
        {tieneCotizacionPdf ? (
          <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
            {t('allianz.reportUnique.preliminaryBudgetHiddenQuote')}
          </p>
        ) : (
          <>
        <p className="mb-3 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t('allianz.reportUnique.sectionPreliminaryBudget')}
        </p>
        <TablaFilasAllianz
          columnas={[
            {
              key: 'capitulo',
              label: t('allianz.reportUnique.colCapitulo'),
              type: 'textarea',
              rows: 2,
            },
            {
              key: 'descripcion',
              label: t('allianz.reportUnique.colDescripcionAlcance'),
              type: 'textarea',
              rows: 3,
            },
            {
              key: 'valor',
              label: t('allianz.reportUnique.colValorEstimado'),
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
          addLabel={t('allianz.reportUnique.addBudgetRow')}
          emptyLabel={t('allianz.reportUnique.emptyBudgetRows')}
        />
        <div className="mt-3 flex max-w-xl justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold dark:border-gray-700">
          <span>{t('allianz.reportUnique.totalPreliminaryReserve')}</span>
          <span>$ {formatearMonto(totalPreliminar)}</span>
        </div>
          </>
        )}

        <div className="mt-5">
          <Campo label={t('allianz.reportUnique.conclusions')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={4}
              value={informe.conclusiones || ''}
              onChange={(e) => setCampo('conclusiones', e.target.value)}
            />
          </Campo>
        </div>
        <div className="mt-3">
          <Campo label={t('allianz.reportUnique.recommendation')}>
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
              {t('allianz.reportUnique.finalAddsSettlement')}
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
                  <p className="font-medium whitespace-pre-wrap">
                    {criterio.descripcionDanios || '—'}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mb-4">
              <CotizacionPdfLiquidacion
                i18nPrefix="allianz.settlement"
                value={liquidador.cotizacionPdf}
                onChange={handleCotizacionChange}
                casoId={casoAllianz?._id}
                api={api}
                archivosCaso={casoAllianz?.archivos || []}
                onArchivosCreados={appendArchivosAlCaso}
                onArchivosEliminados={(ids) => {
                  const setIds = new Set((ids || []).map((id) => String(id || '')).filter(Boolean));
                  if (!setIds.size) return;
                  onCasoChange?.((prev) => {
                    if (!prev) return prev;
                    const actuales = Array.isArray(prev.archivos) ? prev.archivos : [];
                    return {
                      ...prev,
                      archivos: actuales.filter((a) => !setIds.has(String(a?._id))),
                    };
                  });
                }}
                disabled={guardandoCaso}
              />
            </div>

            <div className="mb-4 max-w-xl">
              <EditorDeducibleLibreAllianz
                cfg={liquidador.liquidacionCatastrofico?.deducibleConfigPresupuesto || {}}
                onChange={actualizarDeduciblePresupuesto}
                disabled={guardandoCaso}
              />
            </div>

            <div className="mb-4 grid max-w-xl grid-cols-1 gap-1 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>
                  {totales.origenPresupuesto === 'cotizacion'
                    ? t('allianz.settlement.totalDamagesQuote')
                    : t('allianz.settlement.totalDamagesNsr')}
                </span>
                <span>$ {formatearMonto(totales.totalDanios)}</span>
              </div>
              {totales.origenPresupuesto === 'cotizacion' && (
                <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                  <span>{t('allianz.settlement.totalQuote')}</span>
                  <span>$ {formatearMonto(totales.cotizacionMonto)}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>Hospedaje</span>
                <span>$ {formatearMonto(totales.diagrama?.gastosHospedaje)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>{desgloseDed.etiquetaPct}</span>
                <span>$ {formatearMonto(desgloseDed.montoPct)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>{desgloseDed.etiquetaSmmlv}</span>
                <span>$ {formatearMonto(desgloseDed.montoSmmlv)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>{desgloseDed.etiquetaAplicado}</span>
                <span>$ {formatearMonto(desgloseDed.aplicado)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
                <span>Otros amparos (sin deducible)</span>
                <span>$ {formatearMonto(totales.totalOtrosAmparos)}</span>
              </div>
              <div className="flex justify-between px-4 py-2 text-sm font-bold">
                <span>{t('allianz.settlement.totalPay')}</span>
                <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
              </div>
            </div>
            <p className="mb-4 mt-2 text-xs text-gray-500">
              {totales.deducibleTexto || desgloseDed.texto}
            </p>

            <ChecklistEvaluacionSismicaNSR10
              formData={formDataNsr}
              onInputChange={handleNsrChange}
              modoLiquidador
              recargosPresupuesto={RECARGOS_PRESUPUESTO_NSR10_CAT}
              ocultarPresupuestoEscrito={tieneCotizacionPdf}
              totalPresupuestoOverride={
                usaCotizacionComoBasePresupuesto(liquidador.cotizacionPdf)
                  ? montoCotizacionPdf(liquidador.cotizacionPdf)
                  : null
              }
            />
          </section>

          <section className={expressFormSection}>
            <h3 className={expressSectionTitle}>6. {t('allianz.reportUnique.sectionTable')}</h3>
            <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
              {tieneCotizacionPdf
                ? 'Resumen de la cotización de reparación usada como base de liquidación.'
                : 'Resumen de ítems del presupuesto NSR-10.'}
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Concepto</th>
                    <th className="px-2 py-2">Reclamado</th>
                    <th className="px-2 py-2">Indemnizable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {itemsResumen.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="px-2 py-2">{idx + 1}</td>
                      <td className="px-2 py-2">{it.concepto || '—'}</td>
                      <td className="px-2 py-2">$ {formatearMonto(it.valorReclamado)}</td>
                      <td className="px-2 py-2">$ {formatearMonto(it.valorIndemnizable)}</td>
                    </tr>
                  ))}
                  {!itemsResumen.length && (
                    <tr>
                      <td colSpan={4} className="px-2 py-4 text-center text-gray-500">
                        {t('allianz.reportUnique.noSettlementItems')}
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
          {nFotos}. {t('allianz.reportUnique.sectionPhotos')}
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('allianz.reportUnique.photosUploadHint')}
        </p>
        <FotosInspeccionZurich
          casoId={casoAllianz?._id}
          origen={origen}
          api={api}
          inputIdPrefix="allianz-foto"
          fotosInforme={informe.fotosInspeccion || []}
          onFotosInformeChange={(lista) => setCampo('fotosInspeccion', lista)}
          onArchivoCreado={(creado) => {
            if (creado) appendArchivosAlCaso([creado]);
            setMensaje(t('allianz.reportUnique.photosUploaded', { count: 1 }));
          }}
          onArchivoEliminado={(archivoId) => {
            quitarArchivoDelCaso(archivoId);
            setMensaje(t('allianz.archive.deleteOk'));
          }}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nFirmas}. {t('allianz.reportUnique.sectionSignatures')}
        </h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('allianz.reportUnique.signaturesHint')}
        </p>
        <SeccionFirmasActa
          formData={informe}
          onInputChange={setCampo}
          tituloAjustador={t('allianz.reportUnique.signatureAdjuster')}
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
          <FaFileWord /> {t('allianz.reportUnique.downloadWord')}
        </button>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={() => onGuardarEnCaso(informe)}
          >
            {guardandoCaso
              ? t('allianz.reportUnique.saving')
              : t('allianz.reportUnique.saveDraft')}
          </button>
        )}
      </div>
    </div>
  );
}
