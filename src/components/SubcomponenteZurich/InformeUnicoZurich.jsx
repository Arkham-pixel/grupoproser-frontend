import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileWord, FaMapMarkerAlt, FaRedo } from 'react-icons/fa';
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
  calcularLiquidacionZurich,
  defaultInformeUnicoZurich,
  formDataNsrDesdeLiquidadorZurich,
  formatearMonto,
  formatDateLarga,
  mapcasoZurichALiquidador,
} from './liquidadorZurichHelpers.js';
import { descargarWordInformeZurich } from './generarWordInformeZurich.js';
import { zurichArchivosApi } from './zurichArchivosApi.js';
import FotosInspeccionZurich from './FotosInspeccionZurich.jsx';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';

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

export default function InformeUnicoZurich({
  casoZurich = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
  origen = 'cat',
  liquidadorInicial = null,
}) {
  const { t } = useTranslation();
  const api = useMemo(() => zurichArchivosApi(origen), [origen]);
  const [informe, setInforme] = useState(() => defaultInformeUnicoZurich(casoZurich || {}));
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapcasoZurichALiquidador(casoZurich || {})
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

  const totales = useMemo(() => calcularLiquidacionZurich(liquidador), [liquidador]);
  const criterio = totales.criterio || {};
  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorZurich(liquidador, casoZurich || {}),
    [liquidador, casoZurich]
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
    setInforme(defaultInformeUnicoZurich(casoZurich || {}));
    setLiquidador(liquidadorInicial || mapcasoZurichALiquidador(casoZurich || {}));
  }, [casoZurich?._id]);

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
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_ZURICH);
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
          const creado = await api.subir(casoZurich._id, file, 'INFORME');
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
            alt={t('zurich.reportUnique.eventMapAlt')}
            className="mx-auto max-h-[420px] w-full object-contain bg-white p-2"
          />
          <figcaption className="border-t border-gray-100 px-3 py-2 text-center font-body text-xs text-gray-500 dark:border-gray-800">
            {t('zurich.reportUnique.eventMapCaption')}
          </figcaption>
        </figure>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          2. {t('zurich.reportUnique.sectionDamages')}
        </h3>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={5}
          value={informe.descripcionDanios || ''}
          onChange={(e) => setCampo('descripcionDanios', e.target.value)}
          placeholder={t('zurich.reportUnique.sectionDamagesHint')}
        />

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
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{t('zurich.fields.tomador')}</dt>
            <dd className="font-medium">{casoZurich?.tomador || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.numeroPoliza')}</dt>
            <dd className="font-medium">{casoZurich?.numeroPoliza || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.fechaInicioPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoZurich?.fechaInicioPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.fechaFinPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoZurich?.fechaFinPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.cobertura')}</dt>
            <dd className="font-medium">{casoZurich?.cobertura || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.estadoPagoPrimas')}</dt>
            <dd className="font-medium">{casoZurich?.estadoPagoPrimas || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('zurich.fields.direccionPredio')}</dt>
            <dd className="font-medium">{casoZurich?.direccionPredio || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">
              {t('zurich.fields.ciudad')} / {t('zurich.fields.departamento')}
            </dt>
            <dd className="font-medium">
              {casoZurich?.ciudad || '—'} / {casoZurich?.departamento || '—'}
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
            <span>{t('zurich.settlement.totalPay')}</span>
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
        <h3 className={expressSectionTitle}>5. {t('zurich.reportUnique.sectionTable')}</h3>
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
                    {t('zurich.reportUnique.noSettlementItems')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>6. {t('zurich.reportUnique.sectionPhotos')}</h3>
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
        <h3 className={expressSectionTitle}>7. {t('zurich.reportUnique.sectionConclusions')}</h3>
        <Campo label={t('zurich.reportUnique.conclusions')}>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
            rows={4}
            value={informe.conclusiones || ''}
            onChange={(e) => setCampo('conclusiones', e.target.value)}
          />
        </Campo>
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

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>8. {t('zurich.reportUnique.sectionSignatures')}</h3>
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
          <FaFileWord /> {t('zurich.reportUnique.downloadWord')}
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
