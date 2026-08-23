import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { FaMapMarkerAlt, FaSync } from 'react-icons/fa';
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
  geocodeConGooglePreciso,
  necesitaGeocodeCliente,
  urlGoogleMaps,
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

const SIN_UBICAR_ID = 'sinUbicar';

function colorBloque(index) {
  return BLOCK_COLORS[index % BLOCK_COLORS.length];
}

function markerIcon(color, { scale = 10, labelOrigin } = {}) {
  if (!window.google?.maps) return undefined;
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale,
    labelOrigin: labelOrigin || new window.google.maps.Point(0, 0),
  };
}

/** Agrupa coordenadas casi idénticas (~1 m) para separar pines solapados. */
function coordKey(lat, lng) {
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

/**
 * Si varios casos caen en el mismo punto (misma geocodificación), los abre
 * en círculo pequeño para que todos se vean en el mapa.
 */
function spreadOverlappingMarkers(markers) {
  const groups = new Map();
  markers.forEach((m, idx) => {
    const key = coordKey(m.lat, m.lng);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(idx);
  });

  const OFFSET_DEG = 0.00014; // ~15 m
  return markers.map((m, idx) => {
    const peersIdx = groups.get(coordKey(m.lat, m.lng)) || [idx];
    const stackSize = peersIdx.length;
    const stackIndex = peersIdx.indexOf(idx);
    if (stackSize < 2) {
      return {
        ...m,
        displayLat: Number(m.lat),
        displayLng: Number(m.lng),
        stackSize: 1,
        stackIndex: 0,
        stackPeers: [m],
      };
    }
    const angle = (2 * Math.PI * stackIndex) / stackSize - Math.PI / 2;
    return {
      ...m,
      displayLat: Number(m.lat) + OFFSET_DEG * Math.cos(angle),
      displayLng: Number(m.lng) + OFFSET_DEG * Math.sin(angle),
      stackSize,
      stackIndex,
      stackPeers: peersIdx.map((i) => markers[i]),
    };
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

  const [radioKm, setRadioKm] = useState('0.5');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
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
  const sinDireccionCount = data?.sinDireccionCount ?? sinUbicar.filter((c) => c.motivoSinUbicar === 'sin_direccion').length;
  const geocodeFallidoCount =
    data?.geocodeFallidoCount ?? sinUbicar.filter((c) => c.motivoSinUbicar === 'geocode_fallido').length;

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
    return spreadOverlappingMarkers(list);
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
    visibles.forEach((m) =>
      bounds.extend({
        lat: Number(m.displayLat ?? m.lat),
        lng: Number(m.displayLng ?? m.lng),
      })
    );
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
    }).slice(0, 80);

    const items = [];
    for (const caso of filtrados) {
      const query = construirQueryGeocodeAlfa(caso);
      if (!esDireccionPredioGeocodableAlfa(caso.direccionPredio)) {
        items.push({ casoId: caso._id, geocodeStatus: 'sin_direccion', geocodeQuery: query });
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

  const seleccionarSinUbicar = () => {
    if (!onBloqueChange) return;
    if (bloqueSeleccionadoId === SIN_UBICAR_ID) {
      onBloqueChange(null, []);
      return;
    }
    const ids = sinUbicar.map((c) => String(c._id));
    onBloqueChange(SIN_UBICAR_ID, ids);
  };

  const sinUbicarActivo = bloqueSeleccionadoId === SIN_UBICAR_ID;

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
            <p className="max-w-[14rem] text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              Numeración fija por ubicación (N→S). Al cerrar casos el Bloque 1 no cambia de zona.
            </p>
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
              total: data.planificar ?? data.totalCasos,
              ubicados: data.ubicados,
              sin: data.sinUbicarCount,
              bloques: bloques.length,
              radio: data.radioKm,
            })}
            {data.omitidosInspeccionados > 0
              ? ` · ${t('segurosAlfa.bloques.omittedInspected', {
                  count: data.omitidosInspeccionados,
                })}`
              : ''}
          </p>
        )}
        <p className="mb-3 font-body text-xs text-amber-800 dark:text-amber-200">
          {t('segurosAlfa.bloques.precisionHint')}
        </p>

        {/* Chips de bloques (compactos, con scroll si hay muchos) */}
        <div className="mb-3 max-h-28 overflow-y-auto rounded-lg border border-gray-100 p-2 dark:border-gray-800">
          <div className="flex flex-wrap gap-2">
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
            <button
              type="button"
              onClick={seleccionarSinUbicar}
              className={`inline-flex flex-col items-start rounded-lg border px-3 py-1.5 font-body text-sm font-semibold transition ${
                sinUbicarActivo
                  ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                  : 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100'
              }`}
              title={t('segurosAlfa.bloques.clickUnlocated')}
            >
              <span>
                {t('segurosAlfa.bloques.unlocated')}: {sinUbicar.length}
              </span>
              <span className={`text-[11px] font-normal ${sinUbicarActivo ? 'text-amber-50' : 'text-amber-800/90 dark:text-amber-200/90'}`}>
                {t('segurosAlfa.bloques.unlocatedBreakdown', {
                  sinDir: sinDireccionCount,
                  fallidos: geocodeFallidoCount,
                })}
              </span>
            </button>
          )}
          </div>
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
          ) : markers.length === 0 || sinUbicarActivo ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-900">
              {sinUbicarActivo ? (
                <>
                  <p>{t('segurosAlfa.bloques.unlocatedMapHint', { count: sinUbicar.length })}</p>
                  <p className="text-xs">{t('segurosAlfa.bloques.unlocatedListHint')}</p>
                </>
              ) : (
                <>
                  <p>{t('segurosAlfa.bloques.noMarkers')}</p>
                  <p className="text-xs">{t('segurosAlfa.bloques.noMarkersHint')}</p>
                </>
              )}
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={12}
              onLoad={setMap}
              options={{
                mapTypeId: 'hybrid',
                mapTypeControl: true,
                mapTypeControlOptions: window.google?.maps
                  ? {
                      style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                      mapTypeIds: ['hybrid', 'satellite', 'roadmap'],
                    }
                  : undefined,
                streetViewControl: false,
                fullscreenControl: true,
                tilt: 0,
              }}
            >
              {markers
                .filter((m) => {
                  if (!bloqueSeleccionadoId) return true;
                  if (String(bloqueSeleccionadoId).startsWith('caso-')) {
                    return String(m._id) === String(bloqueSeleccionadoId).replace(/^caso-/, '');
                  }
                  if (bloqueSeleccionadoId === SIN_UBICAR_ID) return false;
                  return m.bloqueId === bloqueSeleccionadoId;
                })
                .map((m) => (
                  <Marker
                    key={m._id}
                    position={{
                      lat: Number(m.displayLat ?? m.lat),
                      lng: Number(m.displayLng ?? m.lng),
                    }}
                    icon={markerIcon(m.color, { scale: m.stackSize > 1 ? 12 : 10 })}
                    label={
                      m.stackSize > 1
                        ? {
                            text: String(m.stackIndex + 1),
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: '700',
                          }
                        : undefined
                    }
                    zIndex={m.stackSize > 1 ? 100 + m.stackIndex : 1}
                    onClick={() => {
                      setInfoCaso(m);
                      if (onBloqueChange) {
                        onBloqueChange(`caso-${m._id}`, [String(m._id)]);
                      }
                    }}
                    title={
                      m.stackSize > 1
                        ? `${m.bloqueNombre}: ${m.stackIndex + 1}/${m.stackSize} · ${m.direccionPredio || m.siniestro || ''}`
                        : `${m.bloqueNombre}: ${m.direccionPredio || m.siniestro || ''}`
                    }
                  />
                ))}
              {infoCaso && (
                <InfoWindow
                  position={{
                    lat: Number(infoCaso.displayLat ?? infoCaso.lat),
                    lng: Number(infoCaso.displayLng ?? infoCaso.lng),
                  }}
                  onCloseClick={() => setInfoCaso(null)}
                >
                  <div className="max-w-[280px] space-y-1 p-1 font-body text-xs text-gray-800">
                    <p className="font-semibold">{infoCaso.bloqueNombre}</p>
                    {infoCaso.stackSize > 1 && (
                      <p className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        Mismo punto: {infoCaso.stackIndex + 1} de {infoCaso.stackSize} casos
                        (dirección geocodificada igual o muy cercana)
                      </p>
                    )}
                    <p>{infoCaso.asegurado || infoCaso.tomador || '—'}</p>
                    <p>{infoCaso.direccionPredio || '—'}</p>
                    <p>
                      {infoCaso.distanciaKmCentro != null
                        ? `${infoCaso.distanciaKmCentro} km ${t('segurosAlfa.bloques.fromCenter')}`
                        : ''}
                    </p>
                    <p className="text-[11px] text-gray-500">{t('segurosAlfa.bloques.filteredToCase')}</p>
                    {infoCaso.stackSize > 1 && Array.isArray(infoCaso.stackPeers) && (
                      <div className="mt-1 space-y-0.5 border-t border-gray-200 pt-1">
                        <p className="text-[11px] font-semibold text-gray-600">Otros en este punto:</p>
                        {infoCaso.stackPeers
                          .filter((p) => String(p._id) !== String(infoCaso._id))
                          .map((p) => (
                            <Link
                              key={p._id}
                              to={`/seguros-alfa/caso?casoId=${p._id}`}
                              className="block truncate text-fenix-primario underline"
                            >
                              {p.consecutivo || p.asegurado || p._id}
                            </Link>
                          ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        to={`/seguros-alfa/caso?casoId=${infoCaso._id}`}
                        className="inline-block text-fenix-primario underline"
                      >
                        {t('segurosAlfa.bloques.openCase')}
                      </Link>
                      {urlGoogleMaps(infoCaso.lat, infoCaso.lng) && (
                        <a
                          href={urlGoogleMaps(infoCaso.lat, infoCaso.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-fenix-primario underline"
                        >
                          {t('segurosAlfa.bloques.openMaps')}
                        </a>
                      )}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* Lista de casos: solo del bloque seleccionado (no listar todos los bloques) */}
        {(() => {
          const bloqueActivo = bloques.find((b) => b.id === bloqueSeleccionadoId);
          const bi = bloqueActivo
            ? bloques.findIndex((b) => b.id === bloqueActivo.id)
            : -1;
          if (bloqueActivo) {
            const color = colorBloque(Math.max(0, bi));
            return (
              <div className="overflow-hidden rounded-xl border border-fenix-primario ring-1 ring-fenix-primario/30">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-heading text-sm font-semibold text-gray-900 dark:text-white">
                    {bloqueActivo.nombre}
                  </span>
                  <span className="font-body text-xs text-gray-500">
                    ({bloqueActivo.cantidad} {t('segurosAlfa.bloques.cases')})
                  </span>
                  <span className="ml-auto font-body text-xs text-gray-500">
                    {t('segurosAlfa.bloques.filtering')}
                  </span>
                </div>
                <ul className="max-h-52 space-y-1 overflow-y-auto border-t border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
                  {(bloqueActivo.casos || []).map((c) => (
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
              </div>
            );
          }
          if (sinUbicarActivo && sinUbicar.length > 0) {
            return (
              <div className="overflow-hidden rounded-xl border border-amber-500 ring-1 ring-amber-400/40">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-heading text-sm font-semibold text-gray-900 dark:text-white">
                    {t('segurosAlfa.bloques.unlocated')}
                  </span>
                  <span className="font-body text-xs text-gray-500">
                    ({sinUbicar.length} {t('segurosAlfa.bloques.cases')})
                  </span>
                </div>
                <ul className="max-h-52 space-y-1 overflow-y-auto border-t border-amber-100 px-3 py-2 text-xs dark:border-amber-900/40">
                  {sinUbicar.map((c) => (
                    <li key={c._id} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          {c.consecutivo || c.siniestro || '—'}
                        </span>
                        {' · '}
                        <span className="text-amber-700 dark:text-amber-300">
                          {c.motivoSinUbicar === 'sin_direccion'
                            ? t('segurosAlfa.bloques.reasonNoAddress')
                            : t('segurosAlfa.bloques.reasonGeocodeFailed')}
                        </span>
                        {' · '}
                        {c.direccionPredio || t('segurosAlfa.bloques.noAddress')}
                        {c.ciudad ? ` · ${c.ciudad}` : ''}
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
              </div>
            );
          }
          return (
            <p className="font-body text-xs text-gray-500 dark:text-gray-400">
              Selecciona un bloque arriba (chip o mapa) para ver sus casos y filtrar la tabla.
            </p>
          );
        })()}
      </div>
    </section>
  );
}
