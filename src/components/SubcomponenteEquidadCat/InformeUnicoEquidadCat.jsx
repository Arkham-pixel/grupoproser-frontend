import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  INFO_EVENTO_DEFAULT_EQUIDAD_CAT,
  casoEquidadCatConInforme,
  defaultInformeUnicoEquidadCat,
  etiquetaArchivoInformeEquidadCat,
  formatearMonto,
  formatDateLarga,
} from './liquidadorEquidadCatHelpers.js';
import {
  capturarPaginasLiquidadorFdm,
  itemsPlanosLiquidadorFdm,
  normalizarLiquidadorFdm,
} from './capturarLiquidadorFdmInforme.js';
import { mapCasoEquidadCatALiquidadorFdm } from './equidadCatLiquidadorAdapter.js';
import { calcularLiquidacionFdm } from '../SubcomponenteEquidadFdm/liquidadorEquidadFdmHelpers.js';
import { descargarWordInformeEquidadCat } from './generarWordInformeEquidadCat.js';
import { equidadCatArchivosApi } from './equidadCatArchivosApi.js';
import FotosInspeccionZurich from '../SubcomponenteZurich/FotosInspeccionZurich.jsx';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
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

function conTipoUnico(informe) {
  return { ...(informe || {}), tipoInforme: 'unico' };
}

export default function InformeUnicoEquidadCat({
  casoEquidadCat = null,
  onEstadoChange,
  onGuardarEnCaso,
  onCasoChange,
  onIrLiquidador,
  guardandoCaso = false,
  origen = 'cat',
  liquidadorFdm: liquidadorFdmProp = null,
  liquidadorInicial = null,
  informeInicial = null,
}) {
  const { t } = useTranslation();
  const api = useMemo(() => equidadCatArchivosApi(origen), [origen]);
  const [informe, setInforme] = useState(() =>
    conTipoUnico(
      defaultInformeUnicoEquidadCat(casoEquidadCatConInforme(casoEquidadCat || {}, informeInicial))
    )
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);
  const [paginasFdm, setPaginasFdm] = useState([]);
  const [capturandoFdm, setCapturandoFdm] = useState(false);
  const [errorCapturaFdm, setErrorCapturaFdm] = useState('');

  const liquidadorFdm = useMemo(
    () =>
      normalizarLiquidadorFdm(
        mapCasoEquidadCatALiquidadorFdm({
          ...(casoEquidadCat || {}),
          liquidador: liquidadorFdmProp || liquidadorInicial || casoEquidadCat?.liquidador,
        })
      ),
    [casoEquidadCat, liquidadorFdmProp, liquidadorInicial]
  );
  const totales = useMemo(() => calcularLiquidacionFdm(liquidadorFdm || {}), [liquidadorFdm]);
  const itemsFdm = useMemo(() => itemsPlanosLiquidadorFdm(liquidadorFdm || {}), [liquidadorFdm]);
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
      const next = { ...prev, tipoInforme: 'unico' };
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
    const nextInforme = conTipoUnico(
      defaultInformeUnicoEquidadCat(
        casoEquidadCatConInforme(casoEquidadCat || {}, informeInicial)
      )
    );
    setInforme(nextInforme);
  }, [casoEquidadCat?._id]);

  useEffect(() => {
    onEstadoChange?.(conTipoUnico(informe));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [informe]);

  const generarCapturaFdm = useCallback(async () => {
    if (!liquidadorFdm) {
      setPaginasFdm([]);
      return;
    }
    setCapturandoFdm(true);
    setErrorCapturaFdm('');
    try {
      const pags = await capturarPaginasLiquidadorFdm(liquidadorFdm, totales);
      setPaginasFdm(pags);
    } catch (err) {
      console.error(err);
      setErrorCapturaFdm(t('equidadCat.reportUnique.fdmCaptureError'));
      setPaginasFdm([]);
    } finally {
      setCapturandoFdm(false);
    }
  }, [liquidadorFdm, totales, t]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!liquidadorFdm) {
        setPaginasFdm([]);
        return;
      }
      setCapturandoFdm(true);
      setErrorCapturaFdm('');
      try {
        const pags = await capturarPaginasLiquidadorFdm(liquidadorFdm, totales);
        if (!cancelado) setPaginasFdm(pags);
      } catch (err) {
        console.error(err);
        if (!cancelado) {
          setErrorCapturaFdm(t('equidadCat.reportUnique.fdmCaptureError'));
          setPaginasFdm([]);
        }
      } finally {
        if (!cancelado) setCapturandoFdm(false);
      }
    })();
    return () => {
      cancelado = true;
    };
    // Recaptura al abrir el informe o si cambia el FDM del caso; el botón actualiza a demanda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoEquidadCat?._id, liquidadorFdmProp, liquidadorInicial]);

  const setCampo = (campo, valor) => {
    setInforme((prev) => {
      const next = { ...prev, [campo]: valor, tipoInforme: 'unico' };
      if (campo === 'actaAjustadorNombre') next.ajustadorNombre = valor;
      if (campo === 'ajustadorNombre' && !prev.actaAjustadorNombre) {
        next.actaAjustadorNombre = valor;
      }
      return next;
    });
  };

  const restaurarInfoEvento = () => {
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_EQUIDAD_CAT);
  };

  const handleWord = async () => {
    setDescargando(true);
    setError('');
    setMensaje('');
    const informeUnico = conTipoUnico(informe);
    try {
      const resultado = await descargarWordInformeEquidadCat({
        caso: casoEquidadCat || {},
        informe: informeUnico,
        liquidador: liquidadorFdm,
        paginasLiquidador: paginasFdm,
      });
      const blob = resultado?.blob;
      const nombre = resultado?.filename || resultado?.nombre;
      if (blob && nombre && casoEquidadCat?._id) {
        try {
          const file = new File([blob], nombre, {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });
          const creado = await api.subir(
            casoEquidadCat._id,
            file,
            etiquetaArchivoInformeEquidadCat('unico')
          );
          onCasoChange?.((prev) => {
            if (!prev) return prev;
            const list = Array.isArray(prev.archivos) ? prev.archivos : [];
            return { ...prev, archivos: [...list, creado] };
          });
          setMensaje(t('equidadCat.reportUnique.wordSavedArchive'));
        } catch (errArchivo) {
          console.warn('No se pudo guardar el informe en el archivero EquidadCat:', errArchivo);
          setError(t('equidadCat.reportUnique.wordArchiveError'));
        }
      }
    } catch (err) {
      console.error(err);
      setError(t('equidadCat.reportUnique.wordError'));
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

      <div className="flex items-center justify-between gap-6 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <img
          src={`${import.meta.env.BASE_URL || '/'}templates/logo-proserpuertos.jpg`}
          alt="Proser Puertos"
          className="h-12 w-auto max-w-[46%] object-contain object-left"
        />
        <img
          src={`${import.meta.env.BASE_URL || '/'}templates/logo-equidad.png`}
          alt="Equidad Seguros"
          className="h-12 w-auto max-w-[46%] object-contain object-right"
        />
      </div>

      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            1. {t('equidadCat.reportUnique.sectionEvent')}
          </h3>
          <button type="button" className={expressBtnGhost} onClick={restaurarInfoEvento}>
            <FaRedo /> {t('equidadCat.reportUnique.resetEvent')}
          </button>
        </div>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('equidadCat.reportUnique.eventHint')}
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
            alt={t('equidadCat.reportUnique.eventMapAlt')}
            className="mx-auto max-h-[420px] w-full object-contain bg-white p-2"
          />
          <figcaption className="border-t border-gray-100 px-3 py-2 text-center font-body text-xs text-gray-500 dark:border-gray-800">
            {t('equidadCat.reportUnique.eventMapCaption')}
          </figcaption>
        </figure>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label={t('equidadCat.reportUnique.adjuster')}>
            <InputFenix
              value={informe.ajustadorNombre || ''}
              onChange={(e) => setCampo('ajustadorNombre', e.target.value)}
            />
          </Campo>
          <Campo label={t('equidadCat.reportUnique.reportDate')}>
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
          2. {t('equidadCat.reportUnique.sectionDamages')}
        </h3>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={5}
          value={informe.descripcionDanios || ''}
          onChange={(e) => setCampo('descripcionDanios', e.target.value)}
          placeholder={t('equidadCat.reportUnique.sectionDamagesHint')}
        />

        <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              <FaMapMarkerAlt className="text-blue-600" />
              {t('equidadCat.reportUnique.sectionRiskMap')}
            </h4>
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setForzarCapturaMapa((n) => n + 1)}
            >
              {t('equidadCat.reportUnique.updateMapCapture')}
            </button>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Campo label={t('equidadCat.reportUnique.latitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.latitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
            <Campo label={t('equidadCat.reportUnique.longitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.longitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
          </div>

          <Campo label={t('equidadCat.reportUnique.coordinatesText')}>
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
              direccionInicial={informe.direccionRiesgo || casoEquidadCat?.direccionPredio || ''}
              capturaInicial={capturaMapaInicial || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChange}
            />
          </div>
          <p className="mt-2 font-body text-xs text-gray-500">
            {capturaMapaInicial
              ? t('equidadCat.reportUnique.mapCaptureReady')
              : t('equidadCat.reportUnique.mapCaptureHint')}
          </p>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>3. {t('equidadCat.reportUnique.sectionPolicy')}</h3>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{t('equidadCat.fields.tomador')}</dt>
            <dd className="font-medium">{casoEquidadCat?.tomador || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('equidadCat.fields.numeroPoliza')}</dt>
            <dd className="font-medium">{casoEquidadCat?.numeroPoliza || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('equidadCat.fields.fechaInicioPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoEquidadCat?.fechaInicioPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('equidadCat.fields.fechaFinPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoEquidadCat?.fechaFinPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('equidadCat.fields.cobertura')}</dt>
            <dd className="font-medium">{casoEquidadCat?.cobertura || casoEquidadCat?.producto || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('equidadCat.fields.estadoPagoPrimas')}</dt>
            <dd className="font-medium">{casoEquidadCat?.estadoPagoPrimas || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('equidadCat.fields.direccionPredio')}</dt>
            <dd className="font-medium">{casoEquidadCat?.direccionPredio || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">
              {t('equidadCat.fields.ciudad')} / {t('equidadCat.fields.departamento')}
            </dt>
            <dd className="font-medium">
              {casoEquidadCat?.ciudad || '—'} / {casoEquidadCat?.departamento || '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            4. {t('equidadCat.reportUnique.sectionSettlement')}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {onIrLiquidador ? (
              <button type="button" className={expressBtnGhost} onClick={onIrLiquidador}>
                {t('equidadCat.reportUnique.goSettlement')}
              </button>
            ) : null}
            <button
              type="button"
              className={expressBtnGhost}
              disabled={capturandoFdm}
              onClick={generarCapturaFdm}
            >
              <FaRedo /> {t('equidadCat.reportUnique.updateFdmCapture')}
            </button>
          </div>
        </div>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('equidadCat.reportUnique.settlementFdmHint')}
        </p>

        <div className="mb-4 grid max-w-xl grid-cols-1 gap-1 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{t('equidadCat.settlement.subtotalContents')}</span>
            <span>$ {formatearMonto(totales.subtotalContenidos)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{t('equidadCat.settlement.subtotalBuildings')}</span>
            <span>$ {formatearMonto(totales.subtotalEdificios)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{t('equidadCat.settlement.lossEstablished')}</span>
            <span>$ {formatearMonto(totales.totalPerdida)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{t('equidadCat.settlement.deductibleApplied')}</span>
            <span>$ {formatearMonto(totales.deducibleAplicado)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{t('equidadCat.reportUnique.fdmSubsidyRow')}</span>
            <span>$ {formatearMonto(totales.subsidio)}</span>
          </div>
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span>{t('equidadCat.settlement.totalPay')}</span>
            <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
          </div>
        </div>

        {capturandoFdm ? (
          <p className="font-body text-sm text-gray-500">{t('equidadCat.reportUnique.fdmCapturing')}</p>
        ) : null}
        {errorCapturaFdm ? <p className={expressAlertError}>{errorCapturaFdm}</p> : null}
        {!capturandoFdm && paginasFdm.length ? (
          <div className="space-y-3">
            {paginasFdm.map((pag, idx) => (
              <figure
                key={`${pag.nombre || 'fdm'}-${idx}`}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
              >
                <img
                  src={pag.dataUrl}
                  alt={pag.nombre || `Liquidador FDM · página ${idx + 1}`}
                  className="mx-auto w-full bg-white object-contain"
                />
                <figcaption className="border-t border-gray-100 px-3 py-2 text-center font-body text-xs text-gray-500 dark:border-gray-800">
                  {pag.nombre || t('equidadCat.reportUnique.fdmCaptureReady')}
                </figcaption>
              </figure>
            ))}
            <p className="font-body text-xs text-gray-500">
              {t('equidadCat.reportUnique.fdmCaptureReady')}
            </p>
          </div>
        ) : null}
        {!capturandoFdm && !paginasFdm.length && !errorCapturaFdm ? (
          <p className="font-body text-sm text-gray-500">
            {t('equidadCat.reportUnique.goFillSettlement')}
          </p>
        ) : null}
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>5. {t('equidadCat.reportUnique.sectionTable')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('equidadCat.reportUnique.settlementHint')}
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">{t('equidadCat.reportUnique.colGroup')}</th>
                <th className="px-2 py-2">{t('equidadCat.settlement.colItem')}</th>
                <th className="px-2 py-2 text-right">{t('equidadCat.settlement.colClaimed')}</th>
                <th className="px-2 py-2 text-right">{t('equidadCat.settlement.colIndem')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itemsFdm.map((it, idx) => (
                <tr key={`${it.grupo}-${it.concepto}-${idx}`}>
                  <td className="px-2 py-2">{idx + 1}</td>
                  <td className="px-2 py-2">{it.grupo || '—'}</td>
                  <td className="px-2 py-2">{it.concepto || '—'}</td>
                  <td className="px-2 py-2 text-right">$ {formatearMonto(it.valorReclamado)}</td>
                  <td className="px-2 py-2 text-right">$ {formatearMonto(it.valorIndemnizable)}</td>
                </tr>
              ))}
              {!itemsFdm.length ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-gray-500">
                    {t('equidadCat.reportUnique.noSettlementItems')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>6. {t('equidadCat.reportUnique.sectionPhotos')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('equidadCat.reportUnique.photosUploadHint')}
        </p>
        <FotosInspeccionZurich
          casoId={casoEquidadCat?._id}
          origen={origen}
          api={api}
          inputIdPrefix="equidadCat-foto"
          fotosInforme={informe.fotosInspeccion || []}
          onFotosInformeChange={(lista) => setCampo('fotosInspeccion', lista)}
          onArchivoCreado={(creado) => {
            if (creado) appendArchivosAlCaso([creado]);
            setMensaje(t('equidadCat.reportUnique.photosUploaded', { count: 1 }));
          }}
          onArchivoEliminado={(archivoId) => {
            quitarArchivoDelCaso(archivoId);
            setMensaje(t('equidadCat.archive.deleteOk'));
          }}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>7. {t('equidadCat.reportUnique.sectionConclusions')}</h3>
        <Campo label={t('equidadCat.reportUnique.conclusions')}>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
            rows={4}
            value={informe.conclusiones || ''}
            onChange={(e) => setCampo('conclusiones', e.target.value)}
          />
        </Campo>
        <div className="mt-3">
          <Campo label={t('equidadCat.reportUnique.recommendation')}>
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
        <h3 className={expressSectionTitle}>8. {t('equidadCat.reportUnique.sectionSignatures')}</h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('equidadCat.reportUnique.signaturesHint')}
        </p>
        <SeccionFirmasActa
          formData={informe}
          onInputChange={setCampo}
          tituloAjustador={t('equidadCat.reportUnique.signatureAdjuster')}
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
          <FaFileWord /> {t('equidadCat.reportUnique.downloadWord')}
        </button>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={() => onGuardarEnCaso(conTipoUnico(informe))}
          >
            {guardandoCaso
              ? t('equidadCat.reportUnique.saving')
              : t('equidadCat.reportUnique.saveDraft')}
          </button>
        )}
      </div>
    </div>
  );
}
