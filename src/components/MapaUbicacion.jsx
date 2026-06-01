// MapaUbicacion.jsx
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Corrige el icono por defecto que no carga en algunos entornos
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export default function MapaUbicacion({ onMapReady }) {
  const [posicion, setPosicion] = useState([7.921417, -72.566972]) // Ubicación por defecto
  const [cargando, setCargando] = useState(true)
  const [mapaListo, setMapaListo] = useState(false)

  useEffect(() => {
    setCargando(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude]
        setPosicion(coords)
        setCargando(false)
      },
      (err) => {
        console.error("Error al obtener ubicación:", err)
        // Mantener ubicación por defecto: Ladrillera Casablanca
        setCargando(false)
      },
      {
        timeout: 10000, // 10 segundos de timeout
        enableHighAccuracy: false,
        maximumAge: 60000 // 1 minuto de cache
      }
    )
  }, [])

  // Notificar cuando el mapa esté listo
  useEffect(() => {
    if (!cargando && posicion && onMapReady) {
      // Pequeño delay para asegurar que el mapa esté completamente renderizado
      const timer = setTimeout(() => {
        setMapaListo(true)
        onMapReady(true)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [cargando, posicion, onMapReady])

  return (
    <div className="w-full h-[200px] sm:h-[250px] lg:h-[300px] relative">
      {cargando && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-xs sm:text-sm text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}
      
      {!cargando && !mapaListo && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-50 z-10">
          <div className="text-center">
            <div className="animate-pulse">
              <p className="text-xs sm:text-sm text-green-600">🔄 Preparando mapa para captura...</p>
            </div>
          </div>
        </div>
      )}
      
      <MapContainer 
        center={posicion} 
        zoom={14} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
        key={posicion.join(',')} // Forzar re-render cuando cambie la posición
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
                       <Marker position={posicion}>
                 <Popup>
                   <div className="text-xs sm:text-sm">
                     Ubicación actual detectada.
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
    </div>
  )
}
