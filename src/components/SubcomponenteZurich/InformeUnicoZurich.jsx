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
  INFO_EVENTO_DEFAULT_ZURICH,
  NIVELES_AFECTACION_ZURICH,
  calcularLiquidacionZurich,
  casoZurichConInforme,
  defaultInformeUnicoZurich,
  desgloseDeducibleTerremotoZurich,
  etiquetaArchivoInformeZurich,
  formDataNsrDesdeLiquidadorZurich,
  formatearMonto,
  formatDateLarga,
  mapcasoZurichALiquidador,
  migrarLiquidadorDeducibleTerremotoZurich,
  normalizarTipoInformeZurich,
  reservaSugeridaZurich,
  totalPresupuestoPreliminarZurich,
} from './liquidadorZurichHelpers.js';
import { descargarWordInformeZurich } from './generarWordInformeZurich.js';
import { resolverDepartamentoZurich } from './zurichHelpers.js';
import { zurichArchivosApi } from './zurichArchivosApi.js';
import FotosInspeccionZurich from './FotosInspeccionZurich.jsx';
import SelectorTipoInformeZurich from './SelectorTipoInformeZurich.jsx';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import { RECARGOS_PRESUPUESTO_NSR10_CAT } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import CotizacionPdfLiquidacion from '../liquidacion/CotizacionPdfLiquidacion.jsx';
import { serializarPaginasCotizacion, montoCotizacionPdf, usaCotizacionComoBasePresupuesto } from '../liquidacion/cotizacionPdfLiquidacion.js';

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

function TablaFilasZurich({
  columnas,
  filas,
  onChangeFila,
  onAdd,
  onRemove,
  addLabel,
  emptyLabel,
}) {
  const nCols = Math.min(Math.max(columnas.length, 1), 3);
  const gridClass =
    nCols === 1
      ? 'grid grid-cols-1 gap-3'
      : nCols === 2
        ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
        : 'grid grid-cols-1 gap-3 lg:grid-cols-3';

  return (
    <div className="space-y-3">
      {(filas || []).map((fila, idx) => (
        <div
          key={fila.id || `zurich-fila-${idx}`}
          className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
        >
          <div className={gridClass}>
            {columnas.map((col) => (
              <Campo
                key={col.key}
                label={col.label}
                className={col.span === 2 ? 'lg:col-span-2' : col.span === 3 ? 'lg:col-span-3' : ''}
              >
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
                    className="min-h-[88px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
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
              </Campo>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
              onClick={() => onRemove(idx)}
              title="Quitar"
            >
              <FaTrash className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      {!(filas || []).length && (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500 dark:border-gray-700">
          {emptyLabel}
        </p>
      )}
      <button type="button" className={expressBtnGhost} onClick={onAdd}>
        <FaPlus /> {addLabel}
      </button>
    </div>
  );
}

export default function InformeUnicoZurich({
  casoZurich = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onGuardarLiquidador,
  onAbrirPresupuesto,
  onCasoChange,
  guardandoCaso = false,
  origen = 'cat',
  liquidadorInicial = null,
  informeInicial = null,
  tipoInformeExterno = null,
  ocultarSelector = false,
}) {
  const { t } = useTranslation();
  const api = useMemo(() => zurichArchivosApi(origen), [origen]);
  const [informe, setInforme] = useState(() =>
    defaultInformeUnicoZurich(casoZurichConInforme(casoZurich || {}, informeInicial))
  );
  const [liquidador, setLiquidador] = useState(() =>
    migrarLiquidadorDeducibleTerremotoZurich(
      liquidadorInicial || mapcasoZurichALiquidador(casoZurich || {}),
      casoZurich || {}
    )
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);
  const totales = useMemo(() => calcularLiquidacionZurich(liquidador), [liquidador]);
  const desgloseDed = useMemo(
    () => desgloseDeducibleTerremotoZurich(liquidador, totales.diagrama),
    [liquidador, totales.diagrama]
  );
  const tieneCotizacionPdf = Boolean(
    (Array.isArray(liquidador.cotizacionPdf?.paginas) && liquidador.cotizacionPdf.paginas.length) ||
      liquidador.cotizacionPdf?.archivoPdf
  );
  const encPoliza = liquidador?.encabezado || {};
  const datoPoliza = (claveCaso, claveEnc) => {
    const a = casoZurich?.[claveCaso];
    if (a != null && String(a).trim() && String(a) !== '—') return a;
    const b = encPoliza[claveEnc || claveCaso];
    if (b != null && String(b).trim()) return b;
    return '';
  };

  const tipoInforme = normalizarTipoInformeZurich(informe.tipoInforme, 'preliminar');
  const esPreliminar = tipoInforme === 'preliminar';
  const nFotos = esPreliminar ? 5 : 6;
  const nFirmas = esPreliminar ? 6 : 7;
  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorZurich(liquidador, casoZurich || {}),
    [liquidador, casoZurich]
  );
  const pctPresupuesto = Number(
    liquidador?.liquidacionCatastrofico?.deducibleConfigPresupuesto?.porcentaje
  );
  const smmlvPresupuesto = Number(
    liquidador?.liquidacionCatastrofico?.deducibleConfigPresupuesto?.cantidadSMMLV
  );
  useEffect(() => {
    if (pctPresupuesto === 3 && smmlvPresupuesto === 3) return;
    if (pctPresupuesto !== 10 && smmlvPresupuesto !== 4) return;
    setLiquidador((prev) =>
      migrarLiquidadorDeducibleTerremotoZurich(prev, casoZurich || {}, { forzar: true })
    );
  }, [pctPresupuesto, smmlvPresupuesto, casoZurich?._id]);
  const totalPreliminar = useMemo(
    () => totalPresupuestoPreliminarZurich(informe.filasPresupuestoPreliminar),
    [informe.filasPresupuestoPreliminar]
  );
  const reservaMostrada = useMemo(() => reservaSugeridaZurich(informe), [informe]);
  useEffect(() => {
    if (!esPreliminar || totalPreliminar <= 0) return;
    if (String(informe.reservaSugerida || '') === String(totalPreliminar)) return;
    setInforme((prev) => ({ ...prev, reservaSugerida: String(totalPreliminar) }));
  }, [esPreliminar, totalPreliminar, informe.reservaSugerida]);
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
      defaultInformeUnicoZurich(casoZurichConInforme(casoZurich || {}, informeInicial))
    );
    setLiquidador(
      migrarLiquidadorDeducibleTerremotoZurich(
        liquidadorInicial || mapcasoZurichALiquidador(casoZurich || {}),
        casoZurich || {}
      )
    );
  }, [casoZurich?._id]);

  useEffect(() => {
    if (!tipoInformeExterno) return;
    setInforme((prev) => {
      const actual = normalizarTipoInformeZurich(prev?.tipoInforme, 'preliminar');
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
    const nextTipo = normalizarTipoInformeZurich(tipo, tipoInforme);
    if (nextTipo === tipoInforme) return;
    const next = { ...informe, tipoInforme: nextTipo };
    setInforme(next);
    onGuardarEnCaso?.(next);
  };

  const conReservaDesdePresupuesto = (prev, filasPpto) => {
    const next = { ...prev, filasPresupuestoPreliminar: filasPpto };
    const suma = totalPresupuestoPreliminarZurich(filasPpto);
    if (suma > 0) next.reservaSugerida = String(suma);
    return next;
  };

  const setFila = (campo, idx, key, valor) => {
    setInforme((prev) => {
      const list = Array.isArray(prev[campo]) ? [...prev[campo]] : [];
      list[idx] = { ...(list[idx] || {}), [key]: valor };
      if (campo === 'filasPresupuestoPreliminar') return conReservaDesdePresupuesto(prev, list);
      return { ...prev, [campo]: list };
    });
  };

  const addFila = (campo, vacia) => {
    setInforme((prev) => {
      const list = [...(Array.isArray(prev[campo]) ? prev[campo] : []), vacia];
      if (campo === 'filasPresupuestoPreliminar') return conReservaDesdePresupuesto(prev, list);
      return { ...prev, [campo]: list };
    });
  };

  const removeFila = (campo, idx) => {
    setInforme((prev) => {
      const list = (Array.isArray(prev[campo]) ? prev[campo] : []).filter((_, i) => i !== idx);
      if (campo === 'filasPresupuestoPreliminar') return conReservaDesdePresupuesto(prev, list);
      return { ...prev, [campo]: list };
    });
  };

  const restaurarInfoEvento = () => {
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_ZURICH);
  };

  const handleNsrChange = (patch) => {
    setLiquidador((prev) => {
      const next = { ...prev, ...patch, modelo: 'nsr10' };
      if (patch.indemnizacionSugerida != null) {
        next.indemnizacionSugerida = patch.indemnizacionSugerida;
      }
      return next;
    });
  };

  const handleCotizacionChange = (cotizacionPdf) => {
    setLiquidador((prev) =>
      migrarLiquidadorDeducibleTerremotoZurich({ ...prev, cotizacionPdf }, casoZurich || {})
    );
    setInforme((prev) => ({
      ...prev,
      fotosCotizacion: serializarPaginasCotizacion(cotizacionPdf?.paginas),
    }));
  };

  const handleWord = async () => {
    setDescargando(true);
    setError('');
    setMensaje('');
    try {
      const resultado = await descargarWordInformeZurich({
        caso: casoZurich || {},
        informe,
        liquidador,
      });
      const blob = resultado?.blob;
      const nombre = resultado?.filename || resultado?.nombre;
      if (blob && nombre && casoZurich?._id) {
        try {
          const file = new File(
            [blob],
            nombre,
            { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
          );
          const creado = await api.subir(
            casoZurich._id,
            file,
            etiquetaArchivoInformeZurich(informe.tipoInforme)
          );
          onCasoChange?.((prev) => {
            if (!prev) return prev;
            const list = Array.isArray(prev.archivos) ? prev.archivos : [];
            return { ...prev, archivos: [...list, creado] };
          });
          setMensaje(t('zurich.reportUnique.wordSavedArchive'));
        } catch (errArchivo) {
          console.warn('No se pudo guardar el informe en el archivero Zurich:', errArchivo);
          setError(t('zurich.reportUnique.wordArchiveError'));
        }
      }
    } catch (err) {
      console.error(err);
      setError(t('zurich.reportUnique.wordError'));
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

      {!ocultarSelector && (
        <SelectorTipoInformeZurich
          tipo={tipoInforme}
          onElegir={elegirTipoInforme}
          disabled={guardandoCaso}
        />
      )}

      <p className="font-body text-sm text-gray-600 dark:text-gray-400">
        {tipoInforme === 'preliminar'
          ? t('zurich.reportUnique.complementPreliminar')
          : tipoInforme === 'final'
            ? t('zurich.reportUnique.complementFinal')
            : t('zurich.reportUnique.complementUnico')}
      </p>

      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            1. {t('zurich.reportUnique.sectionEvent')}
          </h3>
          <button type="button" className={expressBtnGhost} onClick={restaurarInfoEvento}>
            <FaRedo /> {t('zurich.reportUnique.resetEvent')}
          </button>
        </div>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('zurich.reportUnique.eventHint')}
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
            alt={t('zurich.reportUnique.seismicEventMapAlt')}
            className="mx-auto max-h-[420px] w-full object-contain bg-white p-2"
          />
          <figcaption className="border-t border-gray-100 px-3 py-2 text-center font-body text-xs text-gray-500 dark:border-gray-800">
            {t('zurich.reportUnique.seismicEventMapCaption')}
          </figcaption>
        </figure>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label={t('zurich.reportUnique.adjuster')}>
            <InputFenix
              value={informe.ajustadorNombre || ''}
              onChange={(e) => setCampo('ajustadorNombre', e.target.value)}
            />
          </Campo>
          <Campo label={t('zurich.reportUnique.reportDate')}>
            <InputFenix
              type="date"
              value={informe.fechaInforme || ''}
              onChange={(e) => setCampo('fechaInforme', e.target.value)}
            />
          </Campo>
          <Campo label={t('zurich.reportUnique.suggestedReserve')}>
            <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm font-semibold tabular-nums text-gray-900 dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-100">
              $ {formatearMonto(reservaMostrada)}
            </div>
          </Campo>
        </div>
        <p className="mt-2 font-body text-xs text-gray-500">
          {t('zurich.reportUnique.suggestedReserveHint', {
            valor: formatearMonto(reservaMostrada),
          })}
        </p>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          2. {t('zurich.reportUnique.sectionDamages')}
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('zurich.reportUnique.sectionDamagesTableHint')}
        </p>
        <TablaFilasZurich
          columnas={[
            { key: 'zona', label: t('zurich.reportUnique.colZona'), type: 'textarea', rows: 3 },
            {
              key: 'condicion',
              label: t('zurich.reportUnique.colCondicion'),
              type: 'textarea',
              rows: 4,
              span: 2,
            },
            {
              key: 'nivel',
              label: t('zurich.reportUnique.colNivel'),
              type: 'select',
              options: NIVELES_AFECTACION_ZURICH,
            },
          ]}
          filas={informe.filasDanios}
          onChangeFila={(idx, key, valor) => setFila('filasDanios', idx, key, valor)}
          onAdd={() =>
            addFila('filasDanios', {
              id: `danio-${Date.now()}`,
              zona: '',
              condicion: '',
              nivel: '',
            })
          }
          onRemove={(idx) => removeFila('filasDanios', idx)}
          addLabel={t('zurich.reportUnique.addDamageRow')}
          emptyLabel={t('zurich.reportUnique.emptyDamageRows')}
        />
        <div className="mt-4">
          <Campo label={t('zurich.reportUnique.sectionDamagesNarrative')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={5}
              value={informe.descripcionDanios || ''}
              onChange={(e) => setCampo('descripcionDanios', e.target.value)}
              placeholder={t('zurich.reportUnique.sectionDamagesHint')}
            />
          </Campo>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              <FaMapMarkerAlt className="text-blue-600" />
              {t('zurich.reportUnique.sectionRiskMap')}
            </h4>
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setForzarCapturaMapa((n) => n + 1)}
            >
              {t('zurich.reportUnique.updateMapCapture')}
            </button>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Campo label={t('zurich.reportUnique.latitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.latitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
            <Campo label={t('zurich.reportUnique.longitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.longitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
          </div>

          <Campo label={t('zurich.reportUnique.coordinatesText')}>
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
              direccionInicial={informe.direccionRiesgo || casoZurich?.direccionPredio || ''}
              capturaInicial={capturaMapaInicial || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChange}
            />
          </div>
          <p className="mt-2 font-body text-xs text-gray-500">
            {capturaMapaInicial
              ? t('zurich.reportUnique.mapCaptureReady')
              : t('zurich.reportUnique.mapCaptureHint')}
          </p>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>3. {t('zurich.reportUnique.sectionPolicy')}</h3>
        <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{t('zurich.fields.tomador')}</dt>
            <dd className="font-medium">{datoPoliza('tomador') || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.numeroPoliza')}</dt>
            <dd className="font-medium">
              {datoPoliza('numeroPoliza', 'poliza') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.fechaInicioPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(datoPoliza('fechaInicioPoliza') || null)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.fechaFinPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(datoPoliza('fechaFinPoliza') || null)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.cobertura')}</dt>
            <dd className="font-medium">
              {datoPoliza('cobertura') || encPoliza.evento || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.direccionPredio')}</dt>
            <dd className="font-medium">
              {datoPoliza('direccionPredio', 'direccion') ||
                informe.direccionRiesgo ||
                '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">
              {t('zurich.fields.ciudad')} / {t('zurich.fields.departamento')}
            </dt>
            <dd className="font-medium">
              {datoPoliza('ciudad') || '—'} /{' '}
              {datoPoliza('departamento') ||
                resolverDepartamentoZurich({
                  ciudad: casoZurich?.ciudad || encPoliza.ciudad,
                  departamento: casoZurich?.departamento || encPoliza.departamento,
                  direccionPredio:
                    casoZurich?.direccionPredio || encPoliza.direccion || informe.direccionRiesgo,
                }) ||
                '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          4. {t('zurich.reportUnique.sectionConclusions')}
        </h3>
        {tieneCotizacionPdf ? (
          <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
            {t('zurich.reportUnique.preliminaryBudgetHiddenQuote')}
          </p>
        ) : (
          <>
        <p className="mb-3 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t('zurich.reportUnique.sectionPreliminaryBudget')}
        </p>
        <TablaFilasZurich
          columnas={[
            {
              key: 'capitulo',
              label: t('zurich.reportUnique.colCapitulo'),
              type: 'textarea',
              rows: 2,
            },
            {
              key: 'descripcion',
              label: t('zurich.reportUnique.colDescripcionAlcance'),
              type: 'textarea',
              rows: 3,
              span: 2,
            },
            {
              key: 'valor',
              label: t('zurich.reportUnique.colValorEstimado'),
              mono: true,
              placeholder: '0',
            },
          ]}
          filas={informe.filasPresupuestoPreliminar}
          onChangeFila={(idx, key, valor) =>
            setFila('filasPresupuestoPreliminar', idx, key, valor)
          }
          onAdd={() =>
            addFila('filasPresupuestoPreliminar', {
              id: `cap-${Date.now()}`,
              capitulo: '',
              descripcion: '',
              valor: '',
            })
          }
          onRemove={(idx) => removeFila('filasPresupuestoPreliminar', idx)}
          addLabel={t('zurich.reportUnique.addBudgetRow')}
          emptyLabel={t('zurich.reportUnique.emptyBudgetRows')}
        />
        <div className="mt-3 flex max-w-xl justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold dark:border-gray-700">
          <span>{t('zurich.reportUnique.totalPreliminaryReserve')}</span>
          <span>$ {formatearMonto(totalPreliminar)}</span>
        </div>
          </>
        )}

        <div className="mt-5">
          <Campo label={t('zurich.reportUnique.conclusions')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={4}
              value={informe.conclusiones || ''}
              onChange={(e) => setCampo('conclusiones', e.target.value)}
            />
          </Campo>
        </div>
        <div className="mt-3">
          <Campo label={t('zurich.reportUnique.recommendation')}>
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
      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            5. {t('zurich.reportUnique.sectionSettlement')}
          </h3>
          {onAbrirPresupuesto && (
            <button type="button" className={expressBtnGhost} onClick={onAbrirPresupuesto}>
              {t('zurich.reportUnique.openBudgetTab')}
            </button>
          )}
        </div>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('zurich.reportUnique.finalAddsSettlement')}
        </p>
        <div className="mb-4">
          <CotizacionPdfLiquidacion
            value={liquidador.cotizacionPdf}
            onChange={handleCotizacionChange}
            casoId={casoZurich?._id}
            api={api}
            archivosCaso={casoZurich?.archivos || []}
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
        <div className="mb-4 grid max-w-xl grid-cols-1 gap-1 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>
              {totales.origenPresupuesto === 'cotizacion'
                ? t('zurich.settlement.totalDamagesQuote')
                : t('zurich.reportUnique.totalDamages')}
            </span>
            <span>$ {formatearMonto(totales.totalDanios)}</span>
          </div>
          {totales.origenPresupuesto === 'cotizacion' && (
            <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
              <span>{t('zurich.settlement.totalQuote')}</span>
              <span>$ {formatearMonto(totales.cotizacionMonto)}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{t('zurich.reportUnique.lodging')}</span>
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
            <span>{t('zurich.reportUnique.otherCovers')}</span>
            <span>$ {formatearMonto(totales.totalOtrosAmparos)}</span>
          </div>
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span>{t('zurich.settlement.totalPay')}</span>
            <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
          </div>
        </div>
        <p className="mb-4 mt-2 text-xs text-gray-500">{desgloseDed.texto}</p>
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
        {onGuardarLiquidador && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className={expressBtnSecondary}
              disabled={guardandoCaso}
              onClick={() => onGuardarLiquidador(liquidador, totales)}
            >
              {guardandoCaso
                ? t('zurich.settlement.saving')
                : t('zurich.settlement.saveToCase')}
            </button>
          </div>
        )}
      </section>
      )}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nFotos}. {t('zurich.reportUnique.sectionPhotos')}
        </h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('zurich.reportUnique.photosUploadHint')}
        </p>

        <FotosInspeccionZurich
          casoId={casoZurich?._id}
          origen={origen}
          fotosInforme={informe.fotosInspeccion || []}
          onFotosInformeChange={(lista) => setCampo('fotosInspeccion', lista)}
          onArchivoCreado={(creado) => {
            if (creado) appendArchivosAlCaso([creado]);
            setMensaje(t('zurich.reportUnique.photosUploaded', { count: 1 }));
          }}
          onArchivoEliminado={(archivoId) => {
            quitarArchivoDelCaso(archivoId);
            setMensaje(t('zurich.archive.deleteOk'));
          }}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {nFirmas}. {t('zurich.reportUnique.sectionSignatures')}
        </h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('zurich.reportUnique.signaturesHint')}
        </p>
        <SeccionFirmasActa
          formData={informe}
          onInputChange={setCampo}
          tituloAjustador={t('zurich.reportUnique.signatureAdjuster')}
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
          {tipoInforme === 'preliminar'
            ? t('zurich.reportUnique.downloadPreliminar')
            : tipoInforme === 'final'
              ? t('zurich.reportUnique.downloadFinal')
              : t('zurich.reportUnique.downloadUnico')}
        </button>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={() => onGuardarEnCaso(informe)}
          >
            {guardandoCaso
              ? t('zurich.reportUnique.saving')
              : t('zurich.reportUnique.saveDraft')}
          </button>
        )}
      </div>
    </div>
  );
}
