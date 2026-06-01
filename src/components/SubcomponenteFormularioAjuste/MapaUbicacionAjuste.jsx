import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaSearch, FaCrosshairs, FaInfoCircle, FaGlobe, FaMap, FaHandPointer } from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import html2canvas from 'html2canvas';

// Corrige el icono por defecto que no carga en algunos entornos
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Componente para manejar eventos del mapa
function MapEvents({ onMapClick, onMarkerDragEnd }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function MapaUbicacionAjuste({ formData, onInputChange, onMapaChange }) {
  const [posicion, setPosicion] = useState([4.5709, -74.2973]); // Centro de Colombia por defecto
  const [cargando, setCargando] = useState(true);
  const [mapaListo, setMapaListo] = useState(false);
  const [direccionCompleta, setDireccionCompleta] = useState('');
  const [coordenadas, setCoordenadas] = useState(null);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(15);
  const [busquedaLibre, setBusquedaLibre] = useState(''); // Nueva variable para búsqueda libre
  const [buscando, setBuscando] = useState(false); // Estado para indicar cuando está buscando
  const [modoEdicion, setModoEdicion] = useState(false); // Nuevo estado para modo de edición manual
  const [imagenMapa, setImagenMapa] = useState(null); // Nueva variable para la imagen del mapa
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const coordenadasFormateadas = coordenadas
    ? {
        latitud: coordenadas.lat.toFixed(6),
        longitud: coordenadas.lng.toFixed(6)
      }
    : null;

  // Construir dirección completa para geocodificación
  useEffect(() => {
    const construirDireccion = () => {
      const partes = [];
      
      if (formData.direccionRiesgo) partes.push(formData.direccionRiesgo);
      if (formData.ciudad) partes.push(formData.ciudad);
      if (formData.departamento) partes.push(formData.departamento);
      
      const direccion = partes.filter(Boolean).join(', ');
      setDireccionCompleta(direccion);
    };

    construirDireccion();
  }, [formData.direccionRiesgo, formData.ciudad, formData.departamento]);

  // Obtener ubicación actual del usuario
  useEffect(() => {
    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosicion(coords);
        setCoordenadas({ lat: coords[0], lng: coords[1] });
        setCargando(false);
        
        // Actualizar coordenadas en el formulario
        onInputChange('coordenadasRiesgo', `${coords[0]}, ${coords[1]}`);
      },
      (err) => {
        console.error("Error al obtener ubicación:", err);
        // Mantener ubicación por defecto: Centro de Colombia
        setCargando(false);
        setError('No se pudo obtener tu ubicación. Usando ubicación por defecto.');
      },
      {
        timeout: 10000, // 10 segundos de timeout
        enableHighAccuracy: false,
        maximumAge: 60000 // 1 minuto de cache
      }
    );
  }, []);

  // Notificar cuando el mapa esté listo
  useEffect(() => {
    if (!cargando && posicion && !mapaListo) {
      // Pequeño delay para asegurar que el mapa esté completamente renderizado
      const timer = setTimeout(() => {
        setMapaListo(true);
        console.log('✅ Mapa Leaflet listo para usar');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [cargando, posicion, mapaListo]);

  // Generar imagen del mapa cuando cambie la ubicación
  useEffect(() => {
    if (mapaListo && coordenadas && posicion) {
      // Pequeño delay para asegurar que el mapa esté completamente renderizado
      const timer = setTimeout(() => {
        generarImagenMapa();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [mapaListo, coordenadas, posicion]);

  // Buscar ubicación por dirección (geocodificación básica)
  const buscarUbicacion = async () => {
    if (!direccionCompleta) {
      setError('No hay dirección configurada para buscar.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      // Intentar primero con Nominatim directamente
      let response;
      try {
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccionCompleta + ', Colombia')}&limit=1`
        );
      } catch (cspError) {
        console.log('⚠️ Error de CSP, intentando con proxy local...');
        // Si falla por CSP, usar proxy local
        response = await fetch(
          `http://localhost:3000/api/geocode?q=${encodeURIComponent(direccionCompleta + ', Colombia')}`
        );
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        
        setPosicion([lat, lng]);
        setCoordenadas({ lat, lng });
        setZoom(16);
        
        // Actualizar coordenadas en el formulario
        onInputChange('coordenadasRiesgo', `${lat}, ${lng}`);
        
        console.log('✅ Ubicación encontrada:', { lat, lng });
        setError(null);
      } else {
        setError('No se pudo encontrar la ubicación exacta. Verifica la dirección.');
      }
    } catch (error) {
      console.error('Error en geocodificación:', error);
      
      // Mensaje de error más específico
      if (error.message.includes('CSP') || error.message.includes('Content Security Policy')) {
        setError('Error de seguridad del navegador. Contacta al administrador para configurar los permisos necesarios.');
      } else if (error.message.includes('Failed to fetch')) {
        setError('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
      } else {
        setError('Error al buscar la ubicación. Intenta nuevamente.');
      }
    } finally {
      setCargando(false);
    }
  };

  // Nueva función para búsqueda libre de direcciones
  const buscarDireccionLibre = async () => {
    if (!busquedaLibre.trim()) {
      setError('Por favor ingresa una dirección para buscar.');
      return;
    }

    setBuscando(true);
    setError(null);

    try {
      // Intentar primero con Nominatim directamente
      let response;
      try {
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busquedaLibre + ', Colombia')}&limit=1`
        );
      } catch (cspError) {
        console.log('⚠️ Error de CSP, intentando con proxy local...');
        // Si falla por CSP, usar proxy local
        response = await fetch(
          `http://localhost:3000/api/geocode?q=${encodeURIComponent(busquedaLibre + ', Colombia')}`
        );
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        
        setPosicion([lat, lng]);
        setCoordenadas({ lat, lng });
        setZoom(16);
        
        // Actualizar coordenadas en el formulario
        onInputChange('coordenadasRiesgo', `${lat}, ${lng}`);
        
        // Actualizar la dirección completa con la búsqueda exitosa
        setDireccionCompleta(busquedaLibre);
        
        console.log('✅ Dirección encontrada:', { lat, lng, direccion: busquedaLibre });
        setError(null);
        
        // Limpiar el campo de búsqueda después de encontrar
        setBusquedaLibre('');
        
      } else {
        setError('No se pudo encontrar la dirección ingresada. Verifica la ortografía o intenta con una dirección más específica.');
      }
    } catch (error) {
      console.error('Error en búsqueda libre:', error);
      
      // Mensaje de error más específico
      if (error.message.includes('CSP') || error.message.includes('Content Security Policy')) {
        setError('Error de seguridad del navegador. Contacta al administrador para configurar los permisos necesarios.');
      } else if (error.message.includes('Failed to fetch')) {
        setError('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
      } else {
        setError('Error al buscar la dirección. Intenta nuevamente.');
      }
    } finally {
      setBuscando(false);
    }
  };

  // Función para manejar la tecla Enter en el campo de búsqueda
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      buscarDireccionLibre();
    }
  };

  // Función para manejar clics en el mapa
  const handleMapClick = (latlng) => {
    if (modoEdicion) {
      setPosicion([latlng.lat, latlng.lng]);
      setCoordenadas({ lat: latlng.lat, lng: latlng.lng });
      
      // Actualizar coordenadas en el formulario
      onInputChange('coordenadasRiesgo', `${latlng.lat}, ${latlng.lng}`);
      
      console.log('✅ Ubicación actualizada manualmente:', { lat: latlng.lat, lng: latlng.lng });
      setError(null);
    }
  };

  // Función para manejar cuando se arrastra el marcador
  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const position = marker.getLatLng();
    
    setPosicion([position.lat, position.lng]);
    setCoordenadas({ lat: position.lat, lng: position.lng });
    
    // Actualizar coordenadas en el formulario
    onInputChange('coordenadasRiesgo', `${position.lat}, ${position.lng}`);
    
    console.log('✅ Marcador movido a:', { lat: position.lat, lng: position.lng });
    setError(null);
  };

  // Función para alternar el modo de edición
  const toggleModoEdicion = () => {
    setModoEdicion(!modoEdicion);
    if (!modoEdicion) {
      setError('Modo edición activado: Haz clic en el mapa o arrastra el marcador para ajustar la ubicación');
    } else {
      setError(null);
    }
  };

  // Función para obtener dirección desde coordenadas (geocodificación inversa)
  const obtenerDireccionDesdeCoordenadas = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      const data = await response.json();
      
      if (data && data.display_name) {
        setDireccionCompleta(data.display_name);
        console.log('✅ Dirección obtenida desde coordenadas:', data.display_name);
      }
    } catch (error) {
      console.log('⚠️ No se pudo obtener la dirección desde las coordenadas');
    }
  };

  // Función para capturar el mapa como imagen
  const capturarMapaComoImagen = async () => {
    if (!mapaListo || !mapContainerRef.current) {
      console.log('⚠️ Mapa no está listo para capturar');
      return null;
    }

    try {
      console.log('📸 Iniciando captura del mapa...');
      console.log('🔍 Estado del mapa:', { mapaListo, containerRef: !!mapContainerRef.current });
      
      // Usar html2canvas para capturar el mapa
      
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 1, // Reducir escala para evitar problemas
        logging: true, // Habilitar logs para debug
        width: mapContainerRef.current.offsetWidth,
        height: mapContainerRef.current.offsetHeight
      });

      console.log('✅ Canvas generado:', { width: canvas.width, height: canvas.height });

      // Convertir canvas a blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 0.8); // Reducir calidad para evitar problemas
      });

      console.log('✅ Blob generado:', { size: blob.size, type: blob.type });

      // Convertir blob a base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        console.log('✅ Base64 generado, longitud:', base64data.length);
        console.log('🔍 Primeros 100 caracteres:', base64data.substring(0, 100));
        
        setImagenMapa(base64data);
        
        // Notificar al componente padre sobre el cambio del mapa
        if (onMapaChange) {
          const mapaData = {
            imagen: base64data,
            coordenadas: coordenadas,
            direccion: direccionCompleta,
            posicion: posicion,
            zoom: zoom
          };
          
          console.log('📤 Enviando datos del mapa al padre:', mapaData);
          onMapaChange(mapaData);
        }
        
        console.log('✅ Mapa capturado como imagen exitosamente');
      };
      
      reader.onerror = (error) => {
        console.error('❌ Error al leer el blob:', error);
      };
      
      reader.readAsDataURL(blob);

      return blob;
    } catch (error) {
      console.error('❌ Error al capturar el mapa:', error);
      console.error('❌ Stack trace:', error.stack);
      return null;
    }
  };

  // Función para generar imagen del mapa automáticamente
  const generarImagenMapa = async () => {
    if (mapaListo && coordenadas) {
      await capturarMapaComoImagen();
    }
  };

  // Obtener ubicación actual del usuario
  const obtenerUbicacionActual = () => {
    if (navigator.geolocation) {
      setCargando(true);
      setError(null);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setPosicion([lat, lng]);
          setCoordenadas({ lat, lng });
          setZoom(16);
          
          // Actualizar coordenadas en el formulario
          onInputChange('coordenadasRiesgo', `${lat}, ${lng}`);
          
          console.log('✅ Ubicación actual obtenida:', { lat, lng });
          setCargando(false);
        },
        (error) => {
          setCargando(false);
          setError('No se pudo obtener tu ubicación actual. Verifica los permisos del navegador.');
          console.error('Error de geolocalización:', error);
        }
      );
    } else {
      setError('Tu navegador no soporta geolocalización.');
    }
  };

  // Cambiar zoom del mapa
  const cambiarZoom = (nuevoZoom) => {
    setZoom(nuevoZoom);
    console.log('✅ Zoom cambiado a:', nuevoZoom);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FaMap className="mr-3 text-red-600" />
          🗺️ MAPA DE UBICACIÓN DEL SINIESTRO
        </h2>
        <p className="text-gray-600 mt-2">Visualización geográfica de la ubicación del incidente usando OpenStreetMap</p>
      </div>

      {/* Panel de información y controles */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información de ubicación */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FaMapMarkerAlt className="mr-2 text-red-500" />
              Información de Ubicación
            </h3>
            
            <div className="space-y-3">
              {/* Campo de búsqueda libre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔍 Buscar Dirección Libre:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={busquedaLibre}
                    onChange={(e) => setBusquedaLibre(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ej: Calle 123 #45-67, Bogotá"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={buscando}
                  />
                  <button
                    onClick={buscarDireccionLibre}
                    disabled={!busquedaLibre.trim() || buscando}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                  >
                    {buscando ? '🔍' : 'Buscar'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Escribe cualquier dirección y presiona Enter o haz clic en Buscar
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección Actual:
                </label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-gray-800 font-medium">
                    {direccionCompleta || 'No hay dirección configurada'}
                  </p>
                </div>
              </div>

              {coordenadas && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coordenadas GPS:
                  </label>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-blue-800 font-mono text-sm">
                      Lat: {coordenadas.lat.toFixed(6)} | Lng: {coordenadas.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-red-700 text-sm flex items-center">
                    <FaInfoCircle className="mr-2" />
                    {error}
                  </p>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Estado del mapa: {mapaListo ? '✅ Listo' : '⏳ Cargando...'}
              </div>
            </div>
          </div>

          {/* Controles del mapa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FaGlobe className="mr-2 text-blue-500" />
              Controles del Mapa
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={buscarUbicacion}
                disabled={!direccionCompleta || cargando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed"
              >
                <FaSearch className="mr-2" />
                {cargando ? 'Buscando...' : 'Buscar Dirección Actual'}
              </button>

              <button
                onClick={obtenerUbicacionActual}
                disabled={cargando}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed"
              >
                <FaCrosshairs className="mr-2" />
                Mi Ubicación Actual
              </button>

              {/* Botón de modo edición */}
              <button
                onClick={toggleModoEdicion}
                className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
                  modoEdicion 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <FaHandPointer className="mr-2" />
                {modoEdicion ? 'Desactivar Edición' : 'Activar Edición Manual'}
              </button>

              {/* Botón para capturar mapa */}
              <button
                onClick={capturarMapaComoImagen}
                disabled={!mapaListo || cargando}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed"
              >
                📸 Capturar Mapa
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => cambiarZoom(10)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors"
                >
                  Ciudad
                </button>
                <button
                  onClick={() => cambiarZoom(15)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors"
                >
                  Barrio
                </button>
                <button
                  onClick={() => cambiarZoom(20)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors"
                >
                  Calle
                </button>
              </div>

              {/* Información adicional sobre búsqueda */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Consejos de Búsqueda:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Escribe direcciones completas: "Calle 123 #45-67, Bogotá"</li>
                  <li>• Incluye la ciudad: "Centro Comercial Andino, Bogotá"</li>
                  <li>• Usa puntos de referencia: "Plaza de Bolívar, Bogotá"</li>
                  <li>• Presiona Enter o haz clic en Buscar</li>
                </ul>
              </div>

              {/* Información sobre edición manual */}
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-800 mb-2">✋ Edición Manual:</h4>
                <ul className="text-xs text-purple-700 space-y-1">
                  <li>• <strong>Activa "Edición Manual"</strong> para ajustar la ubicación</li>
                  <li>• <strong>Arrastra el marcador</strong> a la ubicación exacta</li>
                  <li>• <strong>Haz clic en el mapa</strong> para mover el marcador</li>
                  <li>• Las coordenadas se actualizan automáticamente</li>
                </ul>
              </div>

              {/* Información sobre captura del mapa */}
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <h4 className="text-sm font-semibold text-orange-800 mb-2">📸 Captura del Mapa:</h4>
                <ul className="text-xs text-orange-700 space-y-1">
                  <li>• <strong>Captura automática:</strong> Se genera al cambiar la ubicación</li>
                  <li>• <strong>Captura manual:</strong> Usa el botón "Capturar Mapa"</li>
                  <li>• <strong>Documento Word:</strong> Se incluye automáticamente</li>
                  <li>• <strong>Alta resolución:</strong> Imagen PNG de calidad</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor del mapa */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative">
          {/* Indicador de carga */}
          {cargando && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-blue-600 font-medium">Buscando ubicación...</p>
              </div>
            </div>
          )}

          {/* Mapa de Leaflet */}
          <div 
            ref={mapContainerRef}
            className="w-full h-96 rounded-lg border border-gray-300"
            style={{ minHeight: '400px' }}
          >
            {!mapaListo && (
              <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FaMap className="text-4xl mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Cargando mapa...</p>
                  <p className="text-sm mb-4">Por favor espera mientras se carga OpenStreetMap</p>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              </div>
            )}
            
            {mapaListo && (
              <MapContainer 
                center={posicion} 
                zoom={zoom} 
                scrollWheelZoom={true} 
                style={{ height: '100%', width: '100%' }}
                key={posicion.join(',')} // Forzar re-render cuando cambie la posición
              >
                <MapEvents onMapClick={handleMapClick} onMarkerDragEnd={handleMarkerDragEnd} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={posicion} draggable={modoEdicion} onDragEnd={handleMarkerDragEnd}>
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg text-red-600 mb-2">📍 Ubicación del Siniestro</h3>
                      <p className="text-sm text-gray-700 mb-2"><strong>Dirección:</strong></p>
                      <p className="text-sm text-gray-600 mb-3">{direccionCompleta || 'Ubicación actual'}</p>
                      <p className="text-sm text-gray-700 mb-2"><strong>Coordenadas:</strong></p>
                      <p className="text-sm text-gray-600 font-mono">{posicion[0].toFixed(6)}, {posicion[1].toFixed(6)}</p>
                      {modoEdicion && (
                        <div className="mt-2 p-2 bg-blue-50 rounded">
                          <p className="text-xs text-blue-700">
                            ✋ <strong>Modo Edición:</strong> Arrastra el marcador o haz clic en el mapa
                          </p>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
                
                {/* Elemento oculto para almacenar coordenadas */}
                <div 
                  className="leaflet-marker-icon" 
                  data-coords={`${posicion[0]}, ${posicion[1]}`}
                  style={{ display: 'none' }}
                />
              </MapContainer>
            )}
          </div>

          {/* Overlay de información del mapa */}
          {mapaListo && (
            <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg border border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <FaMapMarkerAlt className="text-red-500" />
                <span className="font-medium">Zoom: {zoom}x</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      {imagenMapa && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            📸 Captura del Mapa
          </h3>

          <img
            src={imagenMapa}
            alt="Captura del mapa de ubicación"
            className="w-full rounded-lg border border-gray-300 mb-3"
          />

          {coordenadasFormateadas && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-800 mb-2">Coordenadas de la captura</p>
              <p className="text-sm text-gray-700 font-mono">Latitud: {coordenadasFormateadas.latitud}</p>
              <p className="text-sm text-gray-700 font-mono">Longitud: {coordenadasFormateadas.longitud}</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
          <FaInfoCircle className="mr-2" />
          Información del Mapa
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• <strong>🔍 Búsqueda Libre:</strong> Escribe cualquier dirección y búscala en el mapa</p>
          <p>• <strong>📍 Marcador Rojo:</strong> Ubicación exacta del siniestro</p>
          <p>• <strong>✋ Edición Manual:</strong> Arrastra el marcador o haz clic para ajustar la ubicación exacta</p>
          <p>• <strong>📸 Captura Automática:</strong> Se genera imagen del mapa para el documento Word</p>
          <p>• <strong>Haz clic en el marcador</strong> para ver información detallada</p>
          <p>• <strong>Usa los controles</strong> para cambiar zoom y navegar</p>
          <p>• <strong>Coordenadas GPS</strong> se guardan automáticamente en el formulario</p>
          <p>• <strong>Estado:</strong> {mapaListo ? 'Mapa listo para usar' : 'Inicializando mapa...'}</p>
          <p>• <strong>Tecnología:</strong> OpenStreetMap con Leaflet (sin dependencias externas)</p>
          <p>• <strong>💡 Tip:</strong> Puedes buscar por dirección exacta, puntos de referencia o nombres de lugares</p>
          <p>• <strong>🎯 Precisión:</strong> Usa la edición manual para ajustar la ubicación al metro exacto</p>
          <p>• <strong>📄 Documento:</strong> El mapa se incluye automáticamente en el Word generado</p>
        </div>
      </div>
    </div>
  );
}
