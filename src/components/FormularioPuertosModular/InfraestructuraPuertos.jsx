import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import MapaGoogleEarth from '../MapaGoogleEarth';

export default function InfraestructuraPuertos({ formData, onInputChange, cargando }) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  return (
    <>
      {/* Infraestructura */}
      <div 
        className="mt-8 p-6 rounded shadow-sm"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-xl font-bold mb-4"
          style={{ color: textPrimary }}
        >
          2. INFRAESTRUCTURA
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              Antigüedad
            </label>
            <input
              type="text"
              placeholder="Ej: 30 años aprox"
              value={formData.antiguedad || ''}
              onChange={(e) => onInputChange('antiguedad', e.target.value)}
              className="w-full rounded px-3 py-2"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              Área del Lote
            </label>
            <input
              type="text"
              placeholder="Ej: 150.000 m²"
              value={formData.areaLote || ''}
              onChange={(e) => onInputChange('areaLote', e.target.value)}
              className="w-full rounded px-3 py-2"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              Área Construida
            </label>
            <input
              type="text"
              placeholder="Ej: 85.000 m²"
              value={formData.areaConstruida || ''}
              onChange={(e) => onInputChange('areaConstruida', e.target.value)}
              className="w-full rounded px-3 py-2"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              Nº de Edificios
            </label>
            <input
              type="text"
              placeholder="Ej: 5"
              value={formData.numeroEdificios || ''}
              onChange={(e) => onInputChange('numeroEdificios', e.target.value)}
              className="w-full rounded px-3 py-2"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>

          <div className="md:col-span-2">
            <label 
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              Descripción de la Infraestructura
            </label>
            <textarea
              placeholder="Ej: El puerto cuenta con muelles, bodegas, grúas portuarias..."
              rows={5}
              value={formData.descripcionInfraestructura || ''}
              onChange={(e) => onInputChange('descripcionInfraestructura', e.target.value)}
              className="w-full rounded px-3 py-2"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>
        </div>
      </div>

      {/* Procesos */}
      <div 
        className="mt-8 p-6 rounded shadow-sm"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-lg font-bold mb-4"
          style={{ color: textPrimary }}
        >
          3. PROCESOS OPERATIVOS
        </h2>
        <label 
          className="block text-sm font-semibold mb-2"
          style={{ color: textPrimary }}
        >
          Descripción de Procesos Portuarios
        </label>
        <textarea
          placeholder="Ej: El proceso de carga y descarga incluye..."
          value={formData.procesos || ''}
          onChange={(e) => onInputChange('procesos', e.target.value)}
          rows={5}
          className="w-full rounded px-3 py-2"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          disabled={cargando}
        />
      </div>

      {/* Linderos */}
      <div 
        className="mt-8 p-6 rounded shadow-sm"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-xl font-bold mb-4"
          style={{ color: textPrimary }}
        >
          4. LINDEROS
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <label 
            className="font-semibold" 
            htmlFor="norte"
            style={{ color: textPrimary }}
          >
            NORTE:
          </label>
          <input
            type="text"
            id="norte"
            value={formData.linderoNorte || ''}
            onChange={(e) => onInputChange('linderoNorte', e.target.value)}
            placeholder="Ej. Mar Caribe"
            className="px-2 py-1 rounded w-full"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />

          <label 
            className="font-semibold" 
            htmlFor="sur"
            style={{ color: textPrimary }}
          >
            SUR:
          </label>
          <input
            type="text"
            id="sur"
            value={formData.linderoSur || ''}
            onChange={(e) => onInputChange('linderoSur', e.target.value)}
            placeholder="Ej. Zona Industrial"
            className="px-2 py-1 rounded w-full"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />

          <label 
            className="font-semibold" 
            htmlFor="oriente"
            style={{ color: textPrimary }}
          >
            ORIENTE:
          </label>
          <input
            type="text"
            id="oriente"
            value={formData.linderoOriente || ''}
            onChange={(e) => onInputChange('linderoOriente', e.target.value)}
            placeholder="Ej. Terminal de Contenedores"
            className="px-2 py-1 rounded w-full"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />

          <label 
            className="font-semibold" 
            htmlFor="occidente"
            style={{ color: textPrimary }}
          >
            OCCIDENTE:
          </label>
          <input
            type="text"
            id="occidente"
            value={formData.linderoOccidente || ''}
            onChange={(e) => onInputChange('linderoOccidente', e.target.value)}
            placeholder="Ej. Avenida Principal"
            className="px-2 py-1 rounded w-full"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        {/* Mapa Google Earth */}
        <div className="mt-4">
          <MapaGoogleEarth 
            coordenadasIniciales={formData.coordenadasRiesgo}
            direccionInicial={formData.direccionRiesgo}
            onMapReady={(map) => {
              if (map) {
                console.log('✅ Mapa Google Earth listo');
              }
            }}
            onMapaChange={(datos) => {
              if (datos.coordenadas) {
                onInputChange('coordenadasRiesgo', datos.coordenadas);
              }
              if (datos.direccion) {
                onInputChange('direccionRiesgo', datos.direccion);
              }
              if (datos.imagenMapa) {
                onInputChange('imagenMapa', datos.imagenMapa);
              }
            }}
          />
        </div>
      </div>
    </>
  );
}

