import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  fetchAllCasosBbvaCat,
  getBloquesCercaniaBbvaCat,
  postGeocodePendientesBbvaCat,
  postUbicacionesPredioBbvaCat,
} from '../../services/bbvaCatService.js';
import { googleMapsLoaderOptions } from '../../config/googleMapsLoader.js';
import {
  etiquetaDireccionBloqueBbvaCat,
  indiceColorBloqueBbvaCat,
  ordenarBloquesPorVolumenBbvaCat,
  zcCasoBbvaCat,
} from './bbvaCatHelpers.js';
import {
  construirQueryGeocodeBbvaCat,
  esDireccionPredioGeocodableBbvaCat,
  geocodeConGooglePrecisoBbvaCat,
  necesitaGeocodeCliente,
  urlGoogleMaps,
} from './bbvaCatGeocodeHelpers.js';

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
 * Mapa + bloques de cercanía para BBVA CAT.
 * @param {{ ciudad?: string, estado?: string, bloqueSeleccionadoId?: string|null, onBloqueChange?: Function, compact?: boolean, radioKmInicial?: string, depurarArchivos?: boolean, incluirConArchivos?: boolean, reloadToken?: number, getCasoHref?: Function }} props
 */
export default function MapaBloquesBbvaCatPanel({
  ciudad = '',
  estado = '',
  bloqueSeleccionadoId = null,
  onBloqueChange,
  compact = false,
  radioKmInicial = '0.5',
  depurarArchivos = false,
  incluirConArchivos = false,
  soloConArchivos = false,
  reloadToken = 0,
  getCasoHref,
}) {
  const { t } = useTranslation();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useJsApiLoader(googleMapsLoaderOptions(apiKey));

  const [radioKm, setRadioKm] = useState(String(radioKmInicial || '0.5'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [infoCaso, setInfoCaso] = useState(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    setRadioKm(String(radioKmInicial || '0.5'));
  }, [radioKmInicial]);

  const hrefCaso = (c) =>
    typeof getCasoHref === 'function' ? getCasoHref(c) : `/bbva-cat/caso?casoId=${c._id}`;

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getBloquesCercaniaBbvaCat({
        radioKm: Number(radioKm),
        ciudad: ciudad || '',
        estado: estado || '',
        depurarArchivos,
        incluirConArchivos,
        soloConArchivos,
      });
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.bloques.loadError'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [radioKm, ciudad, estado, depurarArchivos, incluirConArchivos, soloConArchivos, reloadToken, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const bloques = useMemo(
    () => ordenarBloquesPorVolumenBbvaCat(data?.bloques || []),
    [data]
  );
  const sinUbicar = data?.sinUbicar || [];
  const sinDireccionCount = data?.sinDireccionCount ?? sinUbicar.filter((c) => c.motivoSinUbicar === 'sin_direccion').length;
  const geocodeFallidoCount =
    data?.geocodeFallidoCount ?? sinUbicar.filter((c) => c.motivoSinUbicar === 'geocode_fallido').length;

  const markers = useMemo(() => {
    const list = [];
    bloques.forEach((b, bi) => {
      const color = colorBloque(indiceColorBloqueBbvaCat(b, bi));
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
    return { lat: 4.5709, lng: -74.2973 };
  }, [bloqueSeleccionadoId, bloques, markers]);

  useEffect(() => {
    if (!map || !window.google?.maps || !markers.length) return;
    const visibles = bloqueSeleccionadoId
      ? markers.filter((m) => m.bloqueId === bloqueSeleccionadoId)
      : markers;
    if (!visibles.length) {
      map.setCenter(mapCenter);
      map.setZoom(6);
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
    const siniestros = (bloque.casos || []).map((c) => String(c.siniestro || '')).filter(Boolean);
    onBloqueChange(bloque.id, ids, { siniestros });
  };

  const geocodeClienteYGuardar = async () => {
    if (!isLoaded || !apiKey) {
      throw new Error(t('bbvaCat.bloques.mapsKeyMissing'));
    }
    const casos = await fetchAllCasosBbvaCat();
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
      const query = construirQueryGeocodeBbvaCat(caso);
      if (!esDireccionPredioGeocodableBbvaCat(caso.direccionPredio)) {
        items.push({ casoId: caso._id, geocodeStatus: 'sin_direccion', geocodeQuery: query });
        continue;
      }
      const geo = await geocodeConGooglePrecisoBbvaCat(query, caso);
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
    if (items.length) await postUbicacionesPredioBbvaCat(items);
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
          const resumen = await postGeocodePendientesBbvaCat({ limit: 40, force: false });
          if (resumen?.resultados?.some((r) => String(r.error || '').includes('GOOGLE_MAPS_API_KEY'))) {
            throw new Error('GOOGLE_MAPS_API_KEY no configurada en el backend');
          }
          ok += resumen.ok || 0;
          failed += resumen.failed || 0;
          sin += resumen.sinDireccion || 0;
          quedan = Number(resumen.quedanPendientes || 0);
          if ((resumen.ok || 0) + (resumen.failed || 0) + (resumen.sinDireccion || 0) === 0) break;
          setMensaje(
            t('bbvaCat.bloques.geocodeProgress', {
              ok,
              failed,
              sin,
              quedan,
              round: rondas,
            })
          );
        }
        setMensaje(
          t('bbvaCat.bloques.geocodeDone', {
            ok,
            failed,
            sin,
          }) +
            (quedan > 0
              ? ` · ${t('bbvaCat.bloques.geocodeRemaining', { count: quedan })}`
              : '')
        );
      } catch (backendErr) {
        console.warn('Geocode backend falló, intento cliente:', backendErr);
        const client = await geocodeClienteYGuardar();
        setMensaje(
          t('bbvaCat.bloques.geocodeDoneClient', {
            ok: client.ok || 0,
            failed: client.failed || 0,
          })
        );
      }
      await cargar();
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.bloques.geocodeError'));
    } finally {
      setGeocoding(false);
    }
  };

  const actualizarUbicacionesRef = useRef(actualizarUbicaciones);
  actualizarUbicacionesRef.current = actualizarUbicaciones;
  const autoGeocodeHecho = useRef(false);
  useEffect(() => {
    if (autoGeocodeHecho.current || loading || geocoding || !data) return;
    if (Number(data.ubicados || 0) > 0) return;
    if (Number(data.sinUbicarCount || 0) === 0) return;
    autoGeocodeHecho.current = true;
    actualizarUbicacionesRef.current();
  }, [loading, geocoding, data]);

  const seleccionarSinUbicar = () => {
    if (!onBloqueChange) return;
    if (bloqueSeleccionadoId === SIN_UBICAR_ID) {
      onBloqueChange(null, []);
      return;
    }
    const ids = sinUbicar.map((c) => String(c._id));
    const siniestros = sinUbicar.map((c) => String(c.siniestro || '')).filter(Boolean);
    onBloqueChange(SIN_UBICAR_ID, ids, { siniestros });
  };

  const sinUbicarActivo = bloqueSeleccionadoId === SIN_UBICAR_ID;

  return (
    <section className={expressCard}>
      <div className={`${expressCardHeader} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-gray-900 dark:text-white">
            <FaMapMarkerAlt className="text-fenix-primario" />
            {t('bbvaCat.bloques.mapTitle')}
          </h2>
          <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
            {t('bbvaCat.bloques.mapHint')}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
            <Campo label={t('bbvaCat.bloques.radius')}>
              <SelectFenix value={radioKm} onChange={(e) => setRadioKm(e.target.value)}>
                {RADIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <p className="max-w-[16rem] text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              {soloConArchivos
                ? t('bbvaCat.bloques.fixedHintListado')
                : depurarArchivos
                  ? t('bbvaCat.bloques.fixedHintAnalista')
                  : t('bbvaCat.bloques.fixedHint')}
            </p>
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={geocoding || loading}
            onClick={actualizarUbicaciones}
          >
            <FaSync className={geocoding ? 'animate-spin' : ''} />{' '}
            {geocoding ? t('bbvaCat.bloques.geocoding') : t('bbvaCat.bloques.updateLocations')}
          </button>
          {bloqueSeleccionadoId && onBloqueChange && (
            <button type="button" className={expressBtnGhost} onClick={() => onBloqueChange(null, [])}>
              {t('bbvaCat.bloques.clearBlockFilter')}
            </button>
          )}
        </div>
      </div>

      <div className={expressCardBody}>
        {mensaje && <p className={`${expressAlertSuccess} mb-3`}>{mensaje}</p>}
        {error && <p className={`${expressAlertError} mb-3`}>{error}</p>}

        {data && (
          <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
            {t('bbvaCat.bloques.summary', {
              total: data.planificar ?? data.totalCasos,
              ubicados: data.ubicados,
              sin: data.sinUbicarCount,
              bloques: bloques.length,
              radio: data.radioKm,
            })}
            {data.omitidosInspeccionados > 0
              ? ` · ${t('bbvaCat.bloques.omittedInspected', {
                  count: data.omitidosInspeccionados,
                })}`
              : ''}
            {depurarArchivos && !soloConArchivos
              ? ` · ${t('bbvaCat.bloques.depuracionSummary', {
                  pendientes: data.pendientes ?? data.planificar,
                  conArchivo: data.conArchivoTotal ?? 0,
                })}`
              : ''}
          </p>
        )}
        <p className="mb-3 font-body text-xs text-amber-800 dark:text-amber-200">
          {t('bbvaCat.bloques.precisionHint')}
        </p>

        {/* Chips de bloques (compactos, con scroll si hay muchos) */}
        <div className="mb-3 max-h-28 overflow-y-auto rounded-lg border border-gray-100 p-2 dark:border-gray-800">
          <div className="flex flex-wrap gap-2">
            {bloques.map((b, i) => {
              const active = bloqueSeleccionadoId === b.id;
              const color = colorBloque(indiceColorBloqueBbvaCat(b, i));
              const vacio = Number(b.cantidad) === 0;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => seleccionarBloque(b)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-body text-sm font-semibold transition ${
                    vacio ? 'opacity-60' : ''
                  } ${
                    active
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                  }`}
                  style={active ? { backgroundColor: color } : undefined}
                  title={t('bbvaCat.bloques.clickToFilter')}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: active ? '#fff' : color }}
                  />
                  {b.nombre} ({b.cantidad})
                  {depurarArchivos &&
                  !soloConArchivos &&
                  Number(b.cantidadConArchivo) > 0 &&
                  !incluirConArchivos ? (
                    <span className={`text-[10px] font-normal ${active ? 'text-white/80' : 'text-gray-500'}`}>
                      {t('bbvaCat.bloques.cleanedCount', { count: b.cantidadConArchivo })}
                    </span>
                  ) : null}
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
                title={t('bbvaCat.bloques.clickUnlocated')}
              >
                <span>
                  {t('bbvaCat.bloques.unlocated')}: {sinUbicar.length}
                </span>
                <span className={`text-[11px] font-normal ${sinUbicarActivo ? 'text-amber-50' : 'text-amber-800/90 dark:text-amber-200/90'}`}>
                  {t('bbvaCat.bloques.unlocatedBreakdown', {
                    sinDir: sinDireccionCount,
                    fallidos: geocodeFallidoCount,
                  })}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mapa: siempre se pinta (no se oculta al filtrar «sin ubicar») */}
        <div
          className={`relative mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 ${
            compact ? 'h-[280px]' : 'h-[360px]'
          }`}
        >
          {!apiKey ? (
            <div className="flex h-full items-center justify-center bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-900">
              {t('bbvaCat.bloques.mapsKeyMissing')}
            </div>
          ) : !isLoaded || loading ? (
            <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-gray-900">
              {geocoding ? t('bbvaCat.bloques.geocoding') : `${t('common.loading')}…`}
            </div>
          ) : (
            <>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={markers.length ? 12 : 6}
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
                    if (bloqueSeleccionadoId === SIN_UBICAR_ID) return true;
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
                          onBloqueChange(`caso-${m._id}`, [String(m._id)], {
                            siniestros: m.siniestro ? [String(m.siniestro)] : [],
                          });
                        }
                      }}
                      title={
                        m.stackSize > 1
                          ? `${m.bloqueNombre}: ${m.stackIndex + 1}/${m.stackSize} · ${etiquetaDireccionBloqueBbvaCat(m)}`
                          : `${m.bloqueNombre}: ${etiquetaDireccionBloqueBbvaCat(m)}`
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
                    {zcCasoBbvaCat(infoCaso) ? (
                      <p className="font-semibold text-fenix-primario">
                        {t('bbvaCat.fields.zc')}: {zcCasoBbvaCat(infoCaso)}
                      </p>
                    ) : null}
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
                        ? `${infoCaso.distanciaKmCentro} km ${t('bbvaCat.bloques.fromCenter')}`
                        : ''}
                    </p>
                    <p className="text-[11px] text-gray-500">{t('bbvaCat.bloques.filteredToCase')}</p>
                    {infoCaso.stackSize > 1 && Array.isArray(infoCaso.stackPeers) && (
                      <div className="mt-1 space-y-0.5 border-t border-gray-200 pt-1">
                        <p className="text-[11px] font-semibold text-gray-600">Otros en este punto:</p>
                        {infoCaso.stackPeers
                          .filter((p) => String(p._id) !== String(infoCaso._id))
                          .map((p) => (
                            <Link
                              key={p._id}
                              to={hrefCaso(p)}
                              className="block truncate text-fenix-primario underline"
                            >
                              {etiquetaDireccionBloqueBbvaCat(p)}
                            </Link>
                          ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        to={hrefCaso(infoCaso)}
                        className="inline-block text-fenix-primario underline"
                      >
                        {t('bbvaCat.bloques.openCase')}
                      </Link>
                      {urlGoogleMaps(infoCaso.lat, infoCaso.lng) && (
                        <a
                          href={urlGoogleMaps(infoCaso.lat, infoCaso.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-fenix-primario underline"
                        >
                          {t('bbvaCat.bloques.openMaps')}
                        </a>
                      )}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
              {markers.length === 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-white/90 p-3 text-center text-xs text-gray-700 dark:bg-black/70 dark:text-gray-200">
                  {geocoding
                    ? t('bbvaCat.bloques.geocoding')
                    : t('bbvaCat.bloques.noMarkersHint')}
                </div>
              )}
            </>
          )}
        </div>

        {/* Lista de casos: solo del bloque seleccionado (no listar todos los bloques) */}
        {(() => {
          const bloqueActivo = bloques.find((b) => b.id === bloqueSeleccionadoId);
          const bi = bloqueActivo
            ? bloques.findIndex((b) => b.id === bloqueActivo.id)
            : -1;
          if (bloqueActivo) {
            const color = colorBloque(indiceColorBloqueBbvaCat(bloqueActivo, Math.max(0, bi)));
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
                    ({bloqueActivo.cantidad} {t('bbvaCat.bloques.cases')})
                  </span>
                  <span className="ml-auto font-body text-xs text-gray-500">
                    {t('bbvaCat.bloques.filtering')}
                  </span>
                </div>
                <ul className="max-h-52 space-y-1 overflow-y-auto border-t border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
                  {(bloqueActivo.casos || []).map((c) => (
                    <li key={c._id} className="flex justify-between gap-2">
                      <span className="truncate" title={etiquetaDireccionBloqueBbvaCat(c)}>
                        {c.distanciaKmCentro != null ? `${c.distanciaKmCentro} km · ` : ''}
                        {etiquetaDireccionBloqueBbvaCat(c)}
                      </span>
                      <Link
                        to={hrefCaso(c)}
                        className="shrink-0 text-fenix-primario hover:underline"
                      >
                        {t('bbvaCat.bloques.openCase')}
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
                    {t('bbvaCat.bloques.unlocated')}
                  </span>
                  <span className="font-body text-xs text-gray-500">
                    ({sinUbicar.length} {t('bbvaCat.bloques.cases')} ·{' '}
                    {t('bbvaCat.bloques.unlocatedBreakdown', {
                      sinDir: sinDireccionCount,
                      fallidos: geocodeFallidoCount,
                    })}
                    )
                  </span>
                </div>
                <ul className="max-h-52 space-y-1 overflow-y-auto border-t border-amber-100 px-3 py-2 text-xs dark:border-amber-900/40">
                  {sinUbicar.map((c) => (
                    <li key={c._id} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          {zcCasoBbvaCat(c)
                            ? `${t('bbvaCat.fields.zc')} ${zcCasoBbvaCat(c)}`
                            : c.consecutivo || '—'}
                        </span>
                        {' · '}
                        <span className="text-amber-700 dark:text-amber-300">
                          {c.motivoSinUbicar === 'sin_direccion'
                            ? t('bbvaCat.bloques.reasonNoAddress')
                            : t('bbvaCat.bloques.reasonGeocodeFailed')}
                        </span>
                        {' · '}
                        {c.direccionPredio || t('bbvaCat.bloques.noAddress')}
                        {c.ciudad ? ` · ${c.ciudad}` : ''}
                      </span>
                      <Link
                        to={hrefCaso(c)}
                        className="shrink-0 text-fenix-primario hover:underline"
                      >
                        {t('bbvaCat.bloques.openCase')}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <p className="font-body text-xs text-gray-500 dark:text-gray-400">
              {t('bbvaCat.bloques.selectBlockHint')}
            </p>
          );
        })()}
      </div>
    </section>
  );
}
