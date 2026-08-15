import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useJsApiLoader } from '@react-google-maps/api';
import { FaChevronDown, FaChevronRight, FaMapMarkerAlt, FaSync } from 'react-icons/fa';
import Loader from '../Loader.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressCardHeader,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  fetchAllCasosAlfa,
  getBloquesCercaniaAlfa,
  postGeocodePendientesAlfa,
  postUbicacionesPredioAlfa,
} from '../../services/segurosAlfaService.js';
import { googleMapsLoaderOptions } from '../../config/googleMapsLoader.js';
import {
  construirQueryGeocodeAlfa,
  esDireccionPredioGeocodableAlfa,
  geocodeConGooglePreciso,
  necesitaGeocodeCliente,
} from './alfaGeocodeHelpers.js';

const RADIOS = [
  { value: '0.1', label: '100 m' },
  { value: '0.2', label: '200 m' },
  { value: '0.3', label: '300 m' },
  { value: '0.5', label: '500 m' },
  { value: '1', label: '1 km' },
  { value: '1.5', label: '1.5 km' },
  { value: '2', label: '2 km' },
  { value: '2.5', label: '2.5 km' },
  { value: '3', label: '3 km' },
  { value: '5', label: '5 km' },
];

export default function BloquesCercaniaSegurosAlfa() {
  const { t } = useTranslation();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader(googleMapsLoaderOptions(apiKey));

  const [radioKm, setRadioKm] = useState('0.5');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [abiertos, setAbiertos] = useState({});

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getBloquesCercaniaAlfa({ radioKm: Number(radioKm) });
      setData(res);
      const open = {};
      (res.bloques || []).forEach((b, i) => {
        open[b.id] = i < 3;
      });
      if ((res.sinUbicar || []).length) open.sinUbicar = true;
      setAbiertos(open);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.bloques.loadError'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [radioKm, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const geocodeClienteYGuardar = async () => {
    if (!isLoaded || !apiKey) {
      throw new Error(t('segurosAlfa.bloques.mapsKeyMissing'));
    }
    const casos = await fetchAllCasosAlfa();
    const pendientes = casos.filter(necesitaGeocodeCliente).slice(0, 80);
    const items = [];
    for (const caso of pendientes) {
      const query = construirQueryGeocodeAlfa(caso);
      if (!esDireccionPredioGeocodableAlfa(caso.direccionPredio)) {
        items.push({
          casoId: caso._id,
          geocodeStatus: 'sin_direccion',
          geocodeQuery: query,
        });
        continue;
      }
      const geo = await geocodeConGooglePreciso(query, caso);
      items.push({
        casoId: caso._id,
        lat: geo.lat,
        lng: geo.lng,
        geocodeStatus: geo.status,
        geocodeQuery: geo.geocodeQuery || query,
        locationType: geo.locationType || '',
        formattedAddress: geo.formattedAddress || '',
        placeTypes: geo.placeTypes || [],
      });
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!items.length) {
      return { ok: 0, failed: 0, message: t('segurosAlfa.bloques.nothingPending') };
    }
    await postUbicacionesPredioAlfa(items);
    const ok = items.filter((i) => i.geocodeStatus === 'ok').length;
    const failed = items.filter((i) => i.geocodeStatus === 'failed').length;
    return { ok, failed, total: items.length };
  };

  const actualizarUbicaciones = async () => {
    setGeocoding(true);
    setError('');
    setMensaje('');
    try {
      try {
        let ok = 0;
        let failed = 0;
        let sin = 0;
        let quedan = 1;
        let rondas = 0;
        while (quedan > 0 && rondas < 12) {
          rondas += 1;
          const resumen = await postGeocodePendientesAlfa({ limit: 120, force: false });
          if (resumen?.resultados?.some((r) => String(r.error || '').includes('GOOGLE_MAPS_API_KEY'))) {
            throw new Error('GOOGLE_MAPS_API_KEY no configurada en el backend');
          }
          ok += resumen.ok || 0;
          failed += resumen.failed || 0;
          sin += resumen.sinDireccion || 0;
          quedan = Number(resumen.quedanPendientes || 0);
          if ((resumen.ok || 0) + (resumen.failed || 0) + (resumen.sinDireccion || 0) === 0) break;
          setMensaje(
            t('segurosAlfa.bloques.geocodeProgress', {
              ok,
              failed,
              sin,
              quedan,
              round: rondas,
            })
          );
        }
        setMensaje(
          t('segurosAlfa.bloques.geocodeDone', {
            ok,
            failed,
            sin,
          }) +
            (quedan > 0
              ? ` · ${t('segurosAlfa.bloques.geocodeRemaining', { count: quedan })}`
              : '')
        );
      } catch (backendErr) {
        console.warn('Geocode backend falló, intento cliente:', backendErr);
        const client = await geocodeClienteYGuardar();
        setMensaje(
          t('segurosAlfa.bloques.geocodeDoneClient', {
            ok: client.ok || 0,
            failed: client.failed || 0,
          })
        );
      }
      await cargar();
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.bloques.geocodeError'));
    } finally {
      setGeocoding(false);
    }
  };

  const toggle = (id) => {
    setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const bloques = useMemo(() => {
    const list = [...(data?.bloques || [])];
    list.sort((a, b) => {
      const d = (Number(b.cantidad) || 0) - (Number(a.cantidad) || 0);
      if (d !== 0) return d;
      return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
    });
    return list;
  }, [data]);
  const sinUbicar = data?.sinUbicar || [];

  const resumenTxt = useMemo(() => {
    if (!data) return '';
    const base = t('segurosAlfa.bloques.summary', {
      total: data.planificar ?? data.totalCasos,
      ubicados: data.ubicados,
      sin: data.sinUbicarCount,
      bloques: bloques.length,
      radio: data.radioKm,
    });
    if (data.omitidosInspeccionados > 0) {
      return `${base} · ${t('segurosAlfa.bloques.omittedInspected', {
        count: data.omitidosInspeccionados,
      })}`;
    }
    return base;
  }, [data, bloques.length, t]);

  return (
    <div className={expressScope}>
      <div className={expressPageWrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Seguros Alfa
            </p>
            <h1 className={expressPageTitle}>{t('segurosAlfa.bloques.title')}</h1>
            <p className={expressPageSubtitle}>{t('segurosAlfa.bloques.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/seguros-alfa/reporte" className={expressBtnGhost}>
              {t('nav.alfaReport')}
            </Link>
            <button
              type="button"
              className={expressBtnPrimary}
              disabled={geocoding || loading}
              onClick={actualizarUbicaciones}
            >
              <FaSync className={geocoding ? 'animate-spin' : ''} />{' '}
              {geocoding
                ? t('segurosAlfa.bloques.geocoding')
                : t('segurosAlfa.bloques.updateLocations')}
            </button>
          </div>
        </header>

        <section className={expressCard}>
          <div className={`${expressCardHeader} flex flex-wrap items-end gap-4`}>
            <Campo label={t('segurosAlfa.bloques.radius')}>
              <SelectFenix value={radioKm} onChange={(e) => setRadioKm(e.target.value)}>
                {RADIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            {resumenTxt && (
              <p className="pb-2 font-body text-sm text-gray-600 dark:text-gray-400">{resumenTxt}</p>
            )}
          </div>
          <div className={expressCardBody}>
            <p className="mb-3 font-body text-xs text-amber-800 dark:text-amber-200">
              {t('segurosAlfa.bloques.precisionHint')}
            </p>
            {mensaje && <p className={`${expressAlertSuccess} mb-3`}>{mensaje}</p>}
            {error && <p className={`${expressAlertError} mb-3`}>{error}</p>}

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader />
              </div>
            ) : (
              <div className="space-y-3">
                {bloques.length === 0 && sinUbicar.length === 0 && (
                  <p className="text-sm text-gray-500">{t('segurosAlfa.bloques.empty')}</p>
                )}

                {bloques.map((bloque) => {
                  const abierto = Boolean(abiertos[bloque.id]);
                  return (
                    <div
                      key={bloque.id}
                      className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left dark:bg-gray-900/40"
                        onClick={() => toggle(bloque.id)}
                      >
                        <span className="flex items-center gap-2 font-heading font-semibold text-gray-900 dark:text-white">
                          {abierto ? <FaChevronDown /> : <FaChevronRight />}
                          <FaMapMarkerAlt className="text-fenix-primario" />
                          {bloque.nombre}
                          <span className="font-body text-sm font-normal text-gray-500">
                            ({bloque.cantidad}{' '}
                            {t('segurosAlfa.bloques.cases', { count: bloque.cantidad })})
                          </span>
                        </span>
                        <span className="font-body text-xs text-gray-500">
                          {bloque.centro
                            ? `${Number(bloque.centro.lat).toFixed(4)}, ${Number(bloque.centro.lng).toFixed(4)}`
                            : ''}
                        </span>
                      </button>
                      {abierto && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800">
                                <th className="px-3 py-2">{t('segurosAlfa.bloques.colDistance')}</th>
                                <th className="px-3 py-2">{t('segurosAlfa.fields.siniestro')}</th>
                                <th className="px-3 py-2">{t('segurosAlfa.fields.asegurado')}</th>
                                <th className="px-3 py-2">{t('segurosAlfa.fields.direccionPredio')}</th>
                                <th className="px-3 py-2">{t('segurosAlfa.fields.ciudad')}</th>
                                <th className="px-3 py-2">{t('segurosAlfa.fields.estado')}</th>
                                <th className="px-3 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {(bloque.casos || []).map((c) => (
                                <tr
                                  key={c._id}
                                  className="border-b border-gray-50 dark:border-gray-900"
                                >
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {c.distanciaKmCentro != null
                                      ? `${c.distanciaKmCentro} km`
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2">{c.siniestro || c.consecutivo || '—'}</td>
                                  <td className="px-3 py-2">{c.asegurado || c.tomador || '—'}</td>
                                  <td className="max-w-xs truncate px-3 py-2" title={c.direccionPredio}>
                                    {c.direccionPredio || '—'}
                                  </td>
                                  <td className="px-3 py-2">{c.ciudad || '—'}</td>
                                  <td className="px-3 py-2">{c.estado || '—'}</td>
                                  <td className="px-3 py-2">
                                    <Link
                                      to={`/seguros-alfa/caso?casoId=${c._id}`}
                                      className="text-fenix-primario hover:underline"
                                    >
                                      {t('segurosAlfa.bloques.openCase')}
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}

                {sinUbicar.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 bg-amber-50 px-4 py-3 text-left dark:bg-amber-950/30"
                      onClick={() => toggle('sinUbicar')}
                    >
                      <span className="flex items-center gap-2 font-heading font-semibold text-amber-900 dark:text-amber-100">
                        {abiertos.sinUbicar ? <FaChevronDown /> : <FaChevronRight />}
                        {t('segurosAlfa.bloques.unlocated')}
                        <span className="font-body text-sm font-normal text-amber-700 dark:text-amber-300">
                          ({sinUbicar.length})
                        </span>
                      </span>
                    </button>
                    {abiertos.sinUbicar && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-amber-100 text-xs uppercase text-gray-500 dark:border-amber-900/40">
                              <th className="px-3 py-2">{t('segurosAlfa.fields.siniestro')}</th>
                              <th className="px-3 py-2">{t('segurosAlfa.fields.asegurado')}</th>
                              <th className="px-3 py-2">{t('segurosAlfa.fields.direccionPredio')}</th>
                              <th className="px-3 py-2">{t('segurosAlfa.fields.ciudad')}</th>
                              <th className="px-3 py-2">{t('segurosAlfa.bloques.colStatus')}</th>
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {sinUbicar.map((c) => (
                              <tr
                                key={c._id}
                                className="border-b border-amber-50 dark:border-amber-950/20"
                              >
                                <td className="px-3 py-2">{c.siniestro || c.consecutivo || '—'}</td>
                                <td className="px-3 py-2">{c.asegurado || c.tomador || '—'}</td>
                                <td className="max-w-xs truncate px-3 py-2" title={c.direccionPredio}>
                                  {c.direccionPredio || '—'}
                                </td>
                                <td className="px-3 py-2">{c.ciudad || '—'}</td>
                                <td className="px-3 py-2">{c.geocodeStatus || '—'}</td>
                                <td className="px-3 py-2">
                                  <Link
                                    to={`/seguros-alfa/caso?casoId=${c._id}`}
                                    className="text-fenix-primario hover:underline"
                                  >
                                    {t('segurosAlfa.bloques.openCase')}
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
