import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudUploadAlt, FaFileWord, FaMapMarkerAlt, FaRedo, FaTrash } from 'react-icons/fa';
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
  INFO_EVENTO_DEFAULT_PREVISORA,
  calcularLiquidacionPrevisora,
  defaultInformeUnicoPrevisora,
  formDataNsrDesdeLiquidadorPrevisora,
  formatearMonto,
  formatDateLarga,
  mapcasoPrevisoraALiquidador,
} from './liquidadorPrevisoraHelpers.js';
import { descargarWordInformePrevisora } from './generarWordInformePrevisora.js';
import {
  eliminarArchivoPrevisora,
  getCasoPrevisoraById,
  subirArchivoPrevisora,
  urlDescargaArchivoPrevisora,
} from '../../services/previsoraService.js';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';

const esImagen = (fileOrName) => {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName?.name || '';
  const type = typeof fileOrName === 'object' ? fileOrName?.type || '' : '';
  return type.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(name);
};

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

export default function InformeUnicoPrevisora({
  casoPrevisora = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
  liquidadorInicial = null,
}) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [informe, setInforme] = useState(() => defaultInformeUnicoPrevisora(casoPrevisora || {}));
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapcasoPrevisoraALiquidador(casoPrevisora || {})
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

  const totales = useMemo(() => calcularLiquidacionPrevisora(liquidador), [liquidador]);
  const criterio = totales.criterio || {};
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
    setInforme(defaultInformeUnicoPrevisora(casoPrevisora || {}));
    setLiquidador(liquidadorInicial || mapcasoPrevisoraALiquidador(casoPrevisora || {}));
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

  const handleNsrChange = (patch) => {
    setLiquidador((prev) => ({ ...prev, ...patch, modelo: 'nsr10' }));
  };

  const restaurarInfoEvento = () => {
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_PREVISORA);
  };

  const handleWord = async () => {
    setDescargando(true);
    setError('');
    try {
      await descargarWordInformePrevisora({
        caso: casoPrevisora || {},
        informe,
        liquidador,
      });
    } catch (err) {
      console.error(err);
      setError(t('previsora.reportUnique.wordError'));
    } finally {
      setDescargando(false);
    }
  };

  const refrescarCaso = async () => {
    if (!casoPrevisora?._id) return null;
    const actualizado = await getCasoPrevisoraById(casoPrevisora._id);
    onCasoChange?.(actualizado);
    return actualizado;
  };

  const subirFotos = async (fileList) => {
    if (!casoPrevisora?._id) {
      setError(t('previsora.reportUnique.savedCaseRequired'));
      return;
    }
    const files = Array.from(fileList || []).filter(esImagen);
    if (!files.length) {
      setError(t('previsora.reportUnique.photosOnlyImages'));
      return;
    }

    setSubiendoFotos(true);
    setError('');
    setMensaje('');
    try {
      for (const file of files) {
        await subirArchivoPrevisora(casoPrevisora._id, file, 'FOTOS');
      }
      await refrescarCaso();
      setMensaje(t('previsora.reportUnique.photosUploaded', { count: files.length }));
    } catch (err) {
      console.error(err);
      setError(err.message || t('previsora.reportUnique.photosUploadError'));
    } finally {
      setSubiendoFotos(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    subirFotos(e.dataTransfer?.files);
  };

  const handleEliminarFoto = async (archivoId) => {
    if (!casoPrevisora?._id || !archivoId) return;
    if (!window.confirm(t('previsora.archive.confirmDelete'))) return;
    setError('');
    setMensaje('');
    try {
      await eliminarArchivoPrevisora(casoPrevisora._id, archivoId);
      await refrescarCaso();
      setMensaje(t('previsora.archive.deleteOk'));
    } catch (err) {
      setError(err.message || t('previsora.archive.deleteError'));
    }
  };

  const fotos = (Array.isArray(casoPrevisora?.archivos) ? casoPrevisora.archivos : []).filter((a) => {
    const et = String(a.etiqueta || '').toUpperCase();
    const nombre = String(a.nombreOriginal || a.nombre || '').toLowerCase();
    return et === 'FOTOS' || et === 'INSPECCION' || /\.(jpe?g|png|gif|webp)$/i.test(nombre);
  });

  return (
    <div className="space-y-5">
      {mensaje && <p className={expressAlertSuccess}>{mensaje}</p>}
      {error && <p className={expressAlertError}>{error}</p>}

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
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
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
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
            ? '4. Liquidador NSR-10'
            : '4. Dictamen y liquidador NSR-10'}
        </h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
            ? 'Cuadro de precios / diagrama de liquidación (mismo modelo Catastrófico Complex).'
            : 'Dictamen de la evaluación sísmica y cuadro de precios / diagrama de liquidación (mismo modelo Catastrófico Complex).'}
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
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span>{t('previsora.settlement.totalPay')}</span>
            <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
          </div>
        </div>

        <ChecklistEvaluacionSismicaNSR10
          formData={formDataNsr}
          onInputChange={handleNsrChange}
          modoLiquidador
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
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>6. {t('previsora.reportUnique.sectionPhotos')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.reportUnique.photosUploadHint')}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = '';
            if (files?.length) subirFotos(files);
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
          }}
          onClick={() => !subiendoFotos && fileRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={handleDrop}
          className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
            dragOver
              ? 'border-fenix-primario bg-fenix-primario/5'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900/40'
          } ${subiendoFotos ? 'pointer-events-none opacity-60' : ''}`}
        >
          <FaCloudUploadAlt className="mb-2 text-3xl text-fenix-primario" />
          <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
            {subiendoFotos
              ? t('previsora.reportUnique.photosUploading')
              : t('previsora.reportUnique.photosDropTitle')}
          </p>
          <p className="mt-1 font-body text-xs text-gray-500">
            {t('previsora.reportUnique.photosDropSubtitle')}
          </p>
        </div>

        {fotos.length === 0 ? (
          <p className="text-sm text-gray-500">{t('previsora.reportUnique.noPhotos')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {fotos.slice(0, 24).map((f) => {
              const url = urlDescargaArchivoPrevisora(f.ruta);
              const isImg = esImagen(f.nombreOriginal || f.nombre || '');
              return (
                <div
                  key={f._id || f.ruta}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {isImg && url ? (
                    <img
                      src={url}
                      alt={f.nombreOriginal || 'Foto'}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-gray-50 px-2 text-center text-xs dark:bg-gray-900">
                      {f.nombreOriginal || f.nombre}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 px-2 py-1">
                    <p className="truncate text-xs text-gray-500">{f.etiqueta || 'FOTOS'}</p>
                    {f._id && (
                      <button
                        type="button"
                        className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title={t('previsora.report.delete')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminarFoto(f._id);
                        }}
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>7. {t('previsora.reportUnique.sectionConclusions')}</h3>
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
        <h3 className={expressSectionTitle}>8. {t('previsora.reportUnique.sectionSignatures')}</h3>
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
          <FaFileWord /> {t('previsora.reportUnique.downloadWord')}
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
