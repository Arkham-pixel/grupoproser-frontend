import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { FaChevronDown, FaChevronRight, FaMapMarkerAlt, FaSync } from 'react-icons/fa';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressCardHeader,
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
  necesitaGeocodeCliente,
} from './alfaGeocodeHelpers.js';

const RADIOS = [
  { value: '2', label: '2 km' },
  { value: '2.5', label: '2.5 km' },
  { value: '3', label: '3 km' },
  { value: '5', label: '5 km' },
];

const BLOCK_COLORS = [
  '#C8102E',
  '#2563EB',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#DB2777',
  '#0D9488',
  '#EA580C',
];

function colorBloque(index) {
  return BLOCK_COLORS[index % BLOCK_COLORS.length];
}

function markerIcon(color) {
  if (!window.google?.maps) return undefined;
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 10,
  };
}

function geocodeConGoogle(address) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.Geocoder) {
      resolve({ status: 'failed', error: 'Google Maps no cargado' });
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address, region: 'CO' }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        resolve({ status: 'ok', lat: loc.lat(), lng: loc.lng(), geocodeQuery: address });
      } else {
        resolve({ status: 'failed', error: status || 'ZERO_RESULTS', geocodeQuery: address });
      }
    });
  });
}

/**
 * Mapa + bloques de cercanía para Seguros Alfa.
 * @param {{ ciudad?: string, estado?: string, bloqueSeleccionadoId?: string|null, onBloqueChange?: (bloqueId: string|null, casoIds: string[]) => void, compact?: boolean }} props
 */
export default function MapaBloquesAlfaPanel({
  ciudad = '',
  estado = '',
  bloqueSeleccionadoId = null,
  onBloqueChange,
  compact = false,
}) {
  const { t } = useTranslation();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader(googleMapsLoaderOptions(apiKey));

  const [radioKm, setRadioKm] = useState('2.5');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [abiertos, setAbiertos] = useState({});
  const [infoCaso, setInfoCaso] = useState(null);
  const [map, setMap] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getBloquesCercaniaAlfa({
        radioKm: Number(radioKm),
        ciudad: ciudad || '',
        estado: estado || '',
      });
      setData(res);
      const open = {};
      (res.bloques || []).forEach((b, i) => {
        open[b.id] = i < 2;
      });
      setAbiertos(open);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.bloques.loadError'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [radioKm, ciudad, estado, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const bloques = data?.bloques || [];
  const sinUbicar = data?.sinUbicar || [];

  const markers = useMemo(() => {
    const list = [];
    bloques.forEach((b, bi) => {
      const color = colorBloque(bi);
      (b.casos || []).forEach((c) => {
        if (!Number.isFinite(Number(c.lat)) || !Number.isFinite(Number(c.lng))) return;
        list.push({
          ...c,
          bloqueId: b.id,
          bloqueNombre: b.nombre,
          color,
        });
      });
    });
    return list;
  }, [bloques]);

  const mapCenter = useMemo(() => {
    if (bloqueSeleccionadoId) {
      const b = bloques.find((x) => x.id === bloqueSeleccionadoId);
      if (b?.centro) return { lat: Number(b.centro.lat), lng: Number(b.centro.lng) };
    }
    if (markers.length) {
      return {
        lat: markers.reduce((s, m) => s + Number(m.lat), 0) / markers.length,
        lng: markers.reduce((s, m) => s + Number(m.lng), 0) / markers.length,
      };
    }
    return { lat: 3.4516, lng: -76.532 };
  }, [bloqueSeleccionadoId, bloques, markers]);

  useEffect(() => {
    if (!map || !window.google?.maps || !markers.length) return;
    const visibles = bloqueSeleccionadoId
      ? markers.filter((m) => m.bloqueId === bloqueSeleccionadoId)
      : markers;
    if (!visibles.length) {
      map.setCenter(mapCenter);
      map.setZoom(12);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    visibles.forEach((m) => bounds.extend({ lat: Number(m.lat), lng: Number(m.lng) }));
    map.fitBounds(bounds, 48);
  }, [map, markers, bloqueSeleccionadoId, mapCenter]);

  const seleccionarBloque = (bloque) => {
    if (!onBloqueChange) return;
    if (!bloque || bloqueSeleccionadoId === bloque.id) {
      onBloqueChange(null, []);
      return;
    }
    const ids = (bloque.casos || []).map((c) => String(c._id));
    onBloqueChange(bloque.id, ids);
  };

  const geocodeClienteYGuardar = async () => {
    if (!isLoaded || !apiKey) {
      throw new Error(t('segurosAlfa.bloques.mapsKeyMissing'));
    }
    const casos = await fetchAllCasosAlfa();
    const filtrados = casos.filter((c) => {
      if (ciudad && String(c.ciudad || '').toUpperCase() !== String(ciudad).toUpperCase()) {
        return false;
      }
      if (estado && String(c.estado || '').toUpperCase() !== String(estado).toUpperCase()) {
        return false;
      }
      return necesitaGeocodeCliente(c);
    }).slice(0, 40);

    const items = [];
    for (const caso of filtrados) {
      const query = construirQueryGeocodeAlfa(caso);
      if (!esDireccionPredioGeocodableAlfa(caso.direccionPredio)) {
        items.push({ casoId: caso._id, geocodeStatus: 'sin_direccion', geocodeQuery: query });
        continue;
      }
      const geo = await geocodeConGoogle(query);
      items.push({
        casoId: caso._id,
        lat: geo.lat,
        lng: geo.lng,
        geocodeStatus: geo.status,
        geocodeQuery: query,
      });
      await new Promise((r) => setTimeout(r, 150));
    }
    if (items.length) await postUbicacionesPredioAlfa(items);
    return {
      ok: items.filter((i) => i.geocodeStatus === 'ok').length,
      failed: items.filter((i) => i.geocodeStatus === 'failed').length,
    };
  };

  const actualizarUbicaciones = async () => {
    setGeocoding(true);
    setError('');
    setMensaje('');
    try {
      try {
        const resumen = await postGeocodePendientesAlfa({ limit: 40, force: false });
        if (resumen?.resultados?.some((r) => String(r.error || '').includes('GOOGLE_MAPS_API_KEY'))) {
          throw new Error('GOOGLE_MAPS_API_KEY no configurada en el backend');
        }
        setMensaje(
          t('segurosAlfa.bloques.geocodeDone', {
            ok: resumen.ok || 0,
            failed: resumen.failed || 0,
            sin: resumen.sinDireccion || 0,
          })
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

  const toggleLista = (id) => setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className={expressCard}>
      <div className={`${expressCardHeader} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-gray-900 dark:text-white">
            <FaMapMarkerAlt className="text-fenix-primario" />
            {t('segurosAlfa.bloques.mapTitle')}
          </h2>
          <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
            {t('segurosAlfa.bloques.mapHint')}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Campo label={t('segurosAlfa.bloques.radius')}>
            <SelectFenix value={radioKm} onChange={(e) => setRadioKm(e.target.value)}>
              {RADIOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={geocoding || loading}
            onClick={actualizarUbicaciones}
          >
            <FaSync className={geocoding ? 'animate-spin' : ''} />{' '}
            {geocoding ? t('segurosAlfa.bloques.geocoding') : t('segurosAlfa.bloques.updateLocations')}
          </button>
          {bloqueSeleccionadoId && onBloqueChange && (
            <button type="button" className={expressBtnGhost} onClick={() => onBloqueChange(null, [])}>
              {t('segurosAlfa.bloques.clearBlockFilter')}
            </button>
          )}
        </div>
      </div>

      <div className={expressCardBody}>
        {mensaje && <p className={`${expressAlertSuccess} mb-3`}>{mensaje}</p>}
        {error && <p className={`${expressAlertError} mb-3`}>{error}</p>}

        {data && (
          <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
            {t('segurosAlfa.bloques.summary', {
              total: data.totalCasos,
              ubicados: data.ubicados,
              sin: data.sinUbicarCount,
              bloques: bloques.length,
              radio: data.radioKm,
            })}
          </p>
        )}

        {/* Chips de bloques */}
        <div className="mb-3 flex flex-wrap gap-2">
          {bloques.map((b, i) => {
            const active = bloqueSeleccionadoId === b.id;
            const color = colorBloque(i);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => seleccionarBloque(b)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-body text-sm font-semibold transition ${
                  active
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                }`}
                style={active ? { backgroundColor: color } : undefined}
                title={t('segurosAlfa.bloques.clickToFilter')}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: active ? '#fff' : color }}
                />
                {b.nombre} ({b.cantidad})
              </button>
            );
          })}
          {sinUbicar.length > 0 && (
            <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 font-body text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              {t('segurosAlfa.bloques.unlocated')}: {sinUbicar.length}
            </span>
          )}
        </div>

        {/* Mapa */}
        <div
          className={`mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 ${
            compact ? 'h-[280px]' : 'h-[360px]'
          }`}
        >
          {!apiKey ? (
            <div className="flex h-full items-center justify-center bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-900">
              {t('segurosAlfa.bloques.mapsKeyMissing')}
            </div>
          ) : !isLoaded || loading ? (
            <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-gray-900">
              {t('common.loading')}…
            </div>
          ) : markers.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-900">
              <p>{t('segurosAlfa.bloques.noMarkers')}</p>
              <p className="text-xs">{t('segurosAlfa.bloques.noMarkersHint')}</p>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={12}
              onLoad={setMap}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
            >
              {markers
                .filter((m) => !bloqueSeleccionadoId || m.bloqueId === bloqueSeleccionadoId)
                .map((m) => (
                  <Marker
                    key={m._id}
                    position={{ lat: Number(m.lat), lng: Number(m.lng) }}
                    icon={markerIcon(m.color)}
                    onClick={() => setInfoCaso(m)}
                    title={`${m.bloqueNombre}: ${m.direccionPredio || m.siniestro || ''}`}
                  />
                ))}
              {infoCaso && (
                <InfoWindow
                  position={{ lat: Number(infoCaso.lat), lng: Number(infoCaso.lng) }}
                  onCloseClick={() => setInfoCaso(null)}
                >
                  <div className="max-w-[220px] space-y-1 p-1 font-body text-xs text-gray-800">
                    <p className="font-semibold">{infoCaso.bloqueNombre}</p>
                    <p>{infoCaso.asegurado || infoCaso.tomador || '—'}</p>
                    <p>{infoCaso.direccionPredio || '—'}</p>
                    <p>
                      {infoCaso.distanciaKmCentro != null
                        ? `${infoCaso.distanciaKmCentro} km ${t('segurosAlfa.bloques.fromCenter')}`
                        : ''}
                    </p>
                    <Link
                      to={`/seguros-alfa/caso?casoId=${infoCaso._id}`}
                      className="inline-block text-fenix-primario underline"
                    >
                      {t('segurosAlfa.bloques.openCase')}
                    </Link>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* Lista compacta de bloques */}
        <div className="space-y-2">
          {bloques.map((bloque, bi) => {
            const abierto = Boolean(abiertos[bloque.id]);
            const active = bloqueSeleccionadoId === bloque.id;
            const color = colorBloque(bi);
            return (
              <div
                key={bloque.id}
                className={`overflow-hidden rounded-xl border ${
                  active
                    ? 'border-fenix-primario ring-1 ring-fenix-primario/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-stretch">
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left"
                    onClick={() => toggleLista(bloque.id)}
                  >
                    {abierto ? <FaChevronDown /> : <FaChevronRight />}
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-heading text-sm font-semibold text-gray-900 dark:text-white">
                      {bloque.nombre}
                    </span>
                    <span className="font-body text-xs text-gray-500">
                      ({bloque.cantidad} {t('segurosAlfa.bloques.cases')})
                    </span>
                  </button>
                  {onBloqueChange && (
                    <button
                      type="button"
                      className="border-l border-gray-200 px-3 text-xs font-semibold text-fenix-primario hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/20"
                      onClick={() => seleccionarBloque(bloque)}
                    >
                      {active
                        ? t('segurosAlfa.bloques.filtering')
                        : t('segurosAlfa.bloques.filterTable')}
                    </button>
                  )}
                </div>
                {abierto && (
                  <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
                    {(bloque.casos || []).map((c) => (
                      <li key={c._id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {c.distanciaKmCentro != null ? `${c.distanciaKmCentro} km · ` : ''}
                          {c.direccionPredio || c.siniestro || c.consecutivo}
                        </span>
                        <Link
                          to={`/seguros-alfa/caso?casoId=${c._id}`}
                          className="shrink-0 text-fenix-primario hover:underline"
                        >
                          {t('segurosAlfa.bloques.openCase')}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
