// MapaGoogleEarth.jsx
// Componente para mostrar un mapa de Google Earth usando Google Maps API
import { useEffect, useState, useRef, useCallback } from 'react'
import { useJsApiLoader, GoogleMap, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api'
import { FaSearch, FaCrosshairs, FaCamera, FaMapMarkerAlt } from 'react-icons/fa'
import html2canvas from 'html2canvas'

// Librerías de Google Maps a cargar (debe ser un array constante para evitar re-renders)
const LIBRARIES = ['places']

// Estilo del contenedor del mapa
const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

/**
 * Imagen real del mapa vía Static Maps API (los mosaicos del mapa interactivo no se pueden
 * capturar con html2canvas por CORS → salía un recuadro en blanco).
 * Requiere la misma API key con "Maps Static API" habilitada en Google Cloud.
 */
async function obtenerCapturaMapaEstatica(lat, lng, key) {
  if (!key || typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '18',
    size: '640x480',
    maptype: 'satellite',
    scale: '2',
    markers: `color:red|${lat},${lng}`,
    key
  })
  const url = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.warn('⚠️ Static Maps:', res.status, errText.slice(0, 180))
      return null
    }
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('⚠️ Error al obtener Static Map:', e)
    return null
  }
}

// Centro por defecto (Colombia)
const defaultCenter = {
  lat: 4.5709,
  lng: -74.2973
}

// Opciones del mapa
const getMapOptions = () => {
  try {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      return {
        mapTypeId: window.google.maps.MapTypeId.SATELLITE,
        zoom: 18,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_CENTER,
          mapTypeIds: [
            window.google.maps.MapTypeId.SATELLITE,
            window.google.maps.MapTypeId.HYBRID,
            window.google.maps.MapTypeId.ROADMAP,
            window.google.maps.MapTypeId.TERRAIN
          ]
        },
        fullscreenControl: true,
        tilt: 0,
        heading: 0
      }
    }
  } catch (error) {
    console.warn('Error obteniendo opciones del mapa:', error)
  }
  
  // Opciones por defecto si Google Maps no está disponible
  return {
    mapTypeId: 'satellite',
    zoom: 18,
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: true,
    tilt: 0,
    heading: 0
  }
}

export default function MapaGoogleEarth({ 
  onMapReady, 
  apiKey: apiKeyProp, 
  onMapaChange, 
  coordenadasIniciales, 
  direccionInicial, 
  forzarCaptura,
  /** data URL o URL absoluta de captura ya guardada (historial) */
  capturaInicial
}) {
  // Obtener API key
  const apiKey = apiKeyProp || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  
  // Usar useJsApiLoader en lugar de LoadScript para evitar cargas múltiples
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  })
  
  // Estados
  const [posicion, setPosicion] = useState(() => {
    // Procesar coordenadas iniciales
    if (coordenadasIniciales) {
      if (typeof coordenadasIniciales === 'string') {
        const coords = coordenadasIniciales.split(',').map(c => parseFloat(c.trim()))
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          return { lat: coords[0], lng: coords[1] }
        }
      } else if (coordenadasIniciales.lat && coordenadasIniciales.lng) {
        return { lat: coordenadasIniciales.lat, lng: coordenadasIniciales.lng }
      }
    }
    return defaultCenter
  })
  
  const [cargando, setCargando] = useState(true)
  const [mapaListo, setMapaListo] = useState(false)
  const [map, setMap] = useState(null)
  const [infoWindowOpen, setInfoWindowOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [direccion, setDireccion] = useState(direccionInicial || '')
  const [autocomplete, setAutocomplete] = useState(null)
  const [imagenMapa, setImagenMapa] = useState(null)
  const [error, setError] = useState(loadError ? 'Error al cargar Google Maps' : null)

  // Restaurar vista previa de captura al cargar desde historial (ruta subida o data URL)
  useEffect(() => {
    if (!capturaInicial || typeof capturaInicial !== 'string') return
    setImagenMapa(capturaInicial)
  }, [capturaInicial])
  
  // Refs
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const searchInputRef = useRef(null)
  const ultimaCoordenadaNotificadaRef = useRef('')
  
  // Verificar si hay API key
  useEffect(() => {
    if (!apiKey) {
      setError('API Key de Google Maps no configurada')
      setCargando(false)
    } else if (isLoaded) {
      setCargando(false)
    }
  }, [apiKey, isLoaded])
  
  // Manejar errores de carga
  useEffect(() => {
    if (loadError) {
      setError('Error al cargar Google Maps. Verifica tu conexión a internet.')
      setCargando(false)
    }
  }, [loadError])
  
  // Obtener ubicación actual al montar (si no hay coordenadas iniciales)
  useEffect(() => {
    if (coordenadasIniciales) {
      setCargando(false)
      return
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosicion({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          })
          setCargando(false)
        },
        (err) => {
          console.warn('Error al obtener ubicación:', err)
          setCargando(false)
        },
        {
          timeout: 10000,
          enableHighAccuracy: false,
          maximumAge: 60000
        }
      )
    } else {
      setCargando(false)
    }
  }, [coordenadasIniciales])
  
  // Log cuando Google Maps se carga exitosamente
  useEffect(() => {
}, [isLoaded])
  
  // Callback cuando el mapa se carga
  const handleMapLoad = useCallback((mapInstance) => {
setMap(mapInstance)
    mapRef.current = mapInstance
    setMapaListo(true)
    setCargando(false)
    
    // Notificar al componente padre
    if (onMapReady) {
      try {
        onMapReady(mapInstance)
      } catch (e) {
        console.warn('Error en callback onMapReady:', e)
      }
    }
  }, [onMapReady])
  
  // Callback cuando el mapa se desmonta
  const handleMapUnmount = useCallback(() => {
    setMap(null)
    mapRef.current = null
  }, [])

  // Notificar automáticamente coordenadas cuando el mapa ya está listo.
  // Esto llena Latitud/Longitud sin requerir interacción del usuario.
  useEffect(() => {
    if (!mapaListo || !isLoaded || !onMapaChange || !posicion) return

    const coordenadasTexto = `${posicion.lat}, ${posicion.lng}`
    if (ultimaCoordenadaNotificadaRef.current === coordenadasTexto) return

    ultimaCoordenadaNotificadaRef.current = coordenadasTexto
    onMapaChange({
      coordenadas: coordenadasTexto,
      direccion,
      lat: posicion.lat,
      lng: posicion.lng
    })
  }, [mapaListo, isLoaded, onMapaChange, posicion, direccion])
  
  // Manejar clic en el mapa
  const handleMapClick = useCallback((event) => {
    if (event.latLng) {
      const newPos = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      }
      setPosicion(newPos)
      
      // Obtener dirección
      if (window.google && window.google.maps) {
        try {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: newPos }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setDireccion(results[0].formatted_address)
            }
          })
        } catch (e) {
          console.warn('Error en geocodificación:', e)
        }
      }
      
      // Notificar cambio
      if (onMapaChange) {
        onMapaChange({
          coordenadas: `${newPos.lat}, ${newPos.lng}`,
          direccion: direccion,
          lat: newPos.lat,
          lng: newPos.lng
        })
      }
    }
  }, [direccion, onMapaChange])
  
  // Buscar dirección
  const buscarDireccion = useCallback(async () => {
    if (!busqueda.trim() || !window.google || !window.google.maps) {
      alert('Google Maps aún no está cargado. Por favor espera un momento.')
      return
    }
    
    setBuscando(true)
    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: busqueda }, (results, status) => {
        setBuscando(false)
        if (status === 'OK' && results[0]) {
          const newPos = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          }
          setPosicion(newPos)
          setDireccion(results[0].formatted_address)
          
          if (map) {
            map.panTo(newPos)
            map.setZoom(18)
          }
          
          if (onMapaChange) {
            onMapaChange({
              coordenadas: `${newPos.lat}, ${newPos.lng}`,
              direccion: results[0].formatted_address,
              lat: newPos.lat,
              lng: newPos.lng
            })
          }
        } else {
          alert('No se encontró la dirección. Intenta con una búsqueda más específica.')
        }
      })
    } catch (error) {
      console.error('Error en búsqueda:', error)
      setBuscando(false)
    }
  }, [busqueda, map, onMapaChange])
  
  // Obtener ubicación actual
  const obtenerUbicacionActual = useCallback(() => {
    if (!window.google || !window.google.maps) {
      alert('Google Maps aún no está cargado. Por favor espera un momento.')
      return
    }
    
    setCargando(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
          setPosicion(coords)
          
          if (map) {
            map.panTo(coords)
            map.setZoom(18)
          }
          
          // Obtener dirección
          if (window.google && window.google.maps) {
            try {
              const geocoder = new window.google.maps.Geocoder()
              geocoder.geocode({ location: coords }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  setDireccion(results[0].formatted_address)
                }
              })
            } catch (e) {
              console.warn('Error en geocodificación:', e)
            }
          }
          
          setCargando(false)
        },
        (err) => {
          console.error('Error al obtener ubicación:', err)
          setCargando(false)
        }
      )
    }
  }, [map])
  
  // Capturar mapa (Static Maps = imagen real; html2canvas solo como respaldo)
  const capturarMapa = useCallback(async () => {
    if (!mapContainerRef.current && !posicion) return

    let dataUrl = null
    if (apiKey && posicion && Number.isFinite(posicion.lat) && Number.isFinite(posicion.lng)) {
      dataUrl = await obtenerCapturaMapaEstatica(posicion.lat, posicion.lng, apiKey)
    }

    if (!dataUrl && mapContainerRef.current) {
      try {
        const canvas = await html2canvas(mapContainerRef.current, {
          useCORS: true,
          logging: false,
          backgroundColor: '#e5e7eb',
          scale: 1
        })
        dataUrl = canvas.toDataURL('image/png')
      } catch (error) {
        console.error('Error al capturar mapa (html2canvas):', error)
      }
    }

    if (!dataUrl) {
      alert(
        'No se pudo generar la captura del mapa.\n\n' +
          'Active la API «Maps Static API» para esta clave en Google Cloud Console, o pulse «Capturar» de nuevo cuando el mapa se vea cargado.'
      )
      return
    }

    setImagenMapa(dataUrl)

    if (onMapaChange) {
      onMapaChange({
        imagenMapa: dataUrl,
        coordenadas: `${posicion.lat}, ${posicion.lng}`,
        direccion: direccion
      })
    }

}, [posicion, direccion, onMapaChange, apiKey])
  
  // Forzar captura: Static Maps solo necesita coordenadas + key; html2canvas necesita el DOM listo
  useEffect(() => {
    if (!forzarCaptura || forzarCaptura <= 0) return

    const coordsOk =
      posicion &&
      Number.isFinite(posicion.lat) &&
      Number.isFinite(posicion.lng)
    const puedeEstatico = Boolean(apiKey && coordsOk)
    const puedeDom = mapaListo && mapContainerRef.current

    if (!puedeEstatico && !puedeDom) return

    const delay = puedeEstatico ? 150 : 900
    const timer = setTimeout(() => {
      capturarMapa()
    }, delay)
    return () => clearTimeout(timer)
  }, [forzarCaptura, mapaListo, capturarMapa, apiKey, posicion.lat, posicion.lng])
  
  // Callback para Autocomplete
  const onAutocompleteLoad = useCallback((autocompleteInstance) => {
    setAutocomplete(autocompleteInstance)
  }, [])
  
  // Callback cuando cambia el lugar seleccionado en Autocomplete
  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
      try {
        const place = autocomplete.getPlace()
        if (place.geometry) {
          const newPos = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
          setPosicion(newPos)
          setDireccion(place.formatted_address || place.name || '')
          
          if (map) {
            map.panTo(newPos)
            map.setZoom(18)
          }
          
          if (onMapaChange) {
            onMapaChange({
              coordenadas: `${newPos.lat}, ${newPos.lng}`,
              direccion: place.formatted_address || place.name || '',
              lat: newPos.lat,
              lng: newPos.lng
            })
          }
        }
      } catch (error) {
        console.error('Error en onPlaceChanged:', error)
      }
    }
  }, [autocomplete, map, onMapaChange])
  
  // Manejar arrastre del marcador
  const handleMarkerDragEnd = useCallback((event) => {
    if (event.latLng) {
      try {
        const newPos = {
          lat: typeof event.latLng.lat === 'function' ? event.latLng.lat() : event.latLng.lat,
          lng: typeof event.latLng.lng === 'function' ? event.latLng.lng() : event.latLng.lng
        }
        setPosicion(newPos)
        
        // Obtener dirección
        if (window.google && window.google.maps) {
          try {
            const geocoder = new window.google.maps.Geocoder()
            geocoder.geocode({ location: newPos }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setDireccion(results[0].formatted_address)
              }
            })
          } catch (e) {
            console.warn('Error en geocodificación:', e)
          }
        }
        
        if (onMapaChange) {
          onMapaChange({
            coordenadas: `${newPos.lat}, ${newPos.lng}`,
            direccion: direccion,
            lat: newPos.lat,
            lng: newPos.lng
          })
        }
      } catch (error) {
        console.error('Error procesando posición del marcador:', error)
      }
    }
  }, [direccion, onMapaChange])
  
  // Si no hay API key, mostrar mensaje
  if (!apiKey) {
    return (
      <div className="w-full h-[200px] sm:h-[250px] lg:h-[300px] relative flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
        <div className="text-center p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            ⚠️ API Key de Google Maps requerida
          </p>
          <p className="text-xs text-gray-600 mb-2">
            Por favor, configure la variable de entorno VITE_GOOGLE_MAPS_API_KEY
          </p>
        </div>
      </div>
    )
  }
  
  // Si hay error, mostrar mensaje
  if (error) {
    return (
      <div className="w-full h-[200px] sm:h-[250px] lg:h-[300px] relative flex items-center justify-center bg-red-50 border-2 border-dashed border-red-300">
        <div className="text-center p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            ⚠️ Error
          </p>
          <p className="text-xs text-red-600">
            {error}
          </p>
        </div>
      </div>
    )
  }
  
  // Renderizar contenido del mapa
  const renderMapContent = () => {
    if (!isLoaded) {
      return (
        <div className="w-full h-[300px] flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Cargando Google Maps...</p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="w-full" style={{ minHeight: '300px' }}>
        {/* Barra de búsqueda y controles */}
        <div className="mb-2 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            {window.google?.maps?.places?.Autocomplete ? (
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar dirección o lugar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      buscarDireccion()
                    }
                  }}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Autocomplete>
            ) : (
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cargando búsqueda..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && isLoaded) {
                    buscarDireccion()
                  }
                }}
                disabled={!isLoaded}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            )}
            <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={obtenerUbicacionActual}
              disabled={!isLoaded}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Mi ubicación actual"
            >
              <FaCrosshairs />
              <span className="hidden sm:inline">Ubicación</span>
            </button>
            
            <button
              onClick={capturarMapa}
              disabled={!mapaListo}
              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Capturar mapa"
            >
              <FaCamera />
              <span className="hidden sm:inline">Capturar</span>
            </button>
          </div>
        </div>

        {/* Información de dirección */}
        {direccion && (
          <div className="mb-2 p-2 bg-blue-50 rounded-lg text-sm">
            <FaMapMarkerAlt className="inline mr-2 text-blue-600" />
            <span className="text-gray-700">{direccion}</span>
          </div>
        )}

        {/* Contenedor: aislar capas para evitar solapamientos con otras secciones; la captura NO incluye la insignia */}
        <div className="relative w-full isolate overflow-hidden rounded-lg border border-gray-300 bg-gray-100">
          {mapaListo && (
            <div className="pointer-events-none absolute top-2 right-2 z-30 rounded bg-green-500 px-2 py-1 text-xs text-white shadow">
              ✓ Mapa listo
            </div>
          )}

          {buscando && (
            <div className="pointer-events-none absolute top-2 left-2 z-30 rounded bg-white px-3 py-1 text-xs text-gray-600 shadow">
              Buscando...
            </div>
          )}

          <div
            ref={mapContainerRef}
            className="relative h-[200px] w-full min-h-[300px] overflow-hidden sm:h-[250px] lg:h-[300px]"
          >
            {cargando && !mapaListo && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600 sm:h-8 sm:w-8" />
                  <p className="text-xs text-gray-600 sm:text-sm">Cargando Google Maps...</p>
                </div>
              </div>
            )}

            {isLoaded &&
              typeof window !== 'undefined' &&
              window.google &&
              window.google.maps &&
              window.google.maps.MapTypeId && (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={posicion}
                  zoom={18}
                  options={getMapOptions()}
                  onLoad={handleMapLoad}
                  onUnmount={handleMapUnmount}
                  onClick={handleMapClick}
                >
                  <Marker
                    position={posicion}
                    onClick={() => setInfoWindowOpen(true)}
                    draggable={true}
                    onDragEnd={handleMarkerDragEnd}
                  >
                    {infoWindowOpen && (
                      <InfoWindow onCloseClick={() => setInfoWindowOpen(false)}>
                        <div className="text-xs sm:text-sm">
                          <p className="font-semibold">📍 Ubicación</p>
                          {direccion && <p className="mb-1">{direccion}</p>}
                          <p>Lat: {posicion.lat.toFixed(6)}</p>
                          <p>Lng: {posicion.lng.toFixed(6)}</p>
                        </div>
                      </InfoWindow>
                    )}
                  </Marker>
                </GoogleMap>
              )}
          </div>
        </div>

        {/* Vista previa de captura */}
        {imagenMapa && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">✅ Captura guardada</p>
            <img src={imagenMapa} alt="Captura del mapa" className="max-w-full h-auto rounded border" />
          </div>
        )}
      </div>
    )
  }
  
  // Renderizar el componente
  return renderMapContent()
}
