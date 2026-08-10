import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import MapaGoogleEarth from '../MapaGoogleEarth';

export default function InfraestructuraPuertos({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  return (
    <>
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
          {t('ports.ui.formulario.infraestructura.tituloInfraestructura')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              {t('ports.ui.formulario.infraestructura.antiguedad')}
            </label>
            <input
              type="text"
              placeholder={t('ports.ui.formulario.infraestructura.antiguedadPlaceholder')}
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
              {t('ports.ui.formulario.infraestructura.areaLote')}
            </label>
            <input
              type="text"
              placeholder={t('ports.ui.formulario.infraestructura.areaLotePlaceholder')}
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
              {t('ports.ui.formulario.infraestructura.areaConstruida')}
            </label>
            <input
              type="text"
              placeholder={t('ports.ui.formulario.infraestructura.areaConstruidaPlaceholder')}
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
              {t('ports.ui.formulario.infraestructura.numeroEdificios')}
            </label>
            <input
              type="text"
              placeholder={t('ports.ui.formulario.infraestructura.numeroEdificiosPlaceholder')}
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
              {t('ports.ui.formulario.infraestructura.descripcionInfraestructura')}
            </label>
            <textarea
              placeholder={t('ports.ui.formulario.infraestructura.descripcionInfraestructuraPlaceholder')}
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
          {t('ports.ui.formulario.infraestructura.tituloProcesos')}
        </h2>
        <label
          className="block text-sm font-semibold mb-2"
          style={{ color: textPrimary }}
        >
          {t('ports.ui.formulario.infraestructura.descripcionProcesos')}
        </label>
        <textarea
          placeholder={t('ports.ui.formulario.infraestructura.descripcionProcesosPlaceholder')}
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
          {t('ports.ui.formulario.infraestructura.tituloLinderos')}
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <label
            className="font-semibold"
            htmlFor="norte"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.infraestructura.norte')}
          </label>
          <input
            type="text"
            id="norte"
            value={formData.linderoNorte || ''}
            onChange={(e) => onInputChange('linderoNorte', e.target.value)}
            placeholder={t('ports.ui.formulario.infraestructura.linderoNortePlaceholder')}
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
            {t('ports.ui.formulario.infraestructura.sur')}
          </label>
          <input
            type="text"
            id="sur"
            value={formData.linderoSur || ''}
            onChange={(e) => onInputChange('linderoSur', e.target.value)}
            placeholder={t('ports.ui.formulario.infraestructura.linderoSurPlaceholder')}
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
            {t('ports.ui.formulario.infraestructura.oriente')}
          </label>
          <input
            type="text"
            id="oriente"
            value={formData.linderoOriente || ''}
            onChange={(e) => onInputChange('linderoOriente', e.target.value)}
            placeholder={t('ports.ui.formulario.infraestructura.linderoOrientePlaceholder')}
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
            {t('ports.ui.formulario.infraestructura.occidente')}
          </label>
          <input
            type="text"
            id="occidente"
            value={formData.linderoOccidente || ''}
            onChange={(e) => onInputChange('linderoOccidente', e.target.value)}
            placeholder={t('ports.ui.formulario.infraestructura.linderoOccidentePlaceholder')}
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

        <div className="mt-4">
          <MapaGoogleEarth
            coordenadasIniciales={formData.coordenadasRiesgo}
            direccionInicial={formData.direccionRiesgo}
            onMapReady={() => {}}
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
