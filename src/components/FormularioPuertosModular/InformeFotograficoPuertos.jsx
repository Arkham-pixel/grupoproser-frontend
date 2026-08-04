import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash } from 'react-icons/fa';
import PuertosDragDropFotos from './PuertosDragDropFotos';

export default function InformeFotograficoPuertos({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const registrosPorVin = formData.registrosPorVin || [];

  const handleAgregarRegistroVin = () => {
    const nuevoRegistro = {
      id: Date.now(),
      vin: '',
      danos: '',
      fotos: [],
    };
    onInputChange('registrosPorVin', [...registrosPorVin, nuevoRegistro]);
  };

  const handleEliminarRegistroVin = (registroId) => {
    onInputChange('registrosPorVin', registrosPorVin.filter((r) => r.id !== registroId));
  };

  const handleActualizarRegistroVin = (registroId, campo, valor) => {
    onInputChange(
      'registrosPorVin',
      registrosPorVin.map((registro) =>
        registro.id === registroId ? { ...registro, [campo]: valor } : registro
      )
    );
  };

  const actualizarFotosRegistro = (registroId, fotos) => {
    onInputChange(
      'registrosPorVin',
      registrosPorVin.map((registro) =>
        registro.id === registroId ? { ...registro, fotos } : registro
      )
    );
  };

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${borderColor}`,
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3
          className="text-xl font-bold"
          style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
        >
          {t('ports.ui.formulario.informeFotografico.titulo')}
        </h3>
        <button
          type="button"
          onClick={handleAgregarRegistroVin}
          className="px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors"
          style={{
            backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
            color: '#FFFFFF',
          }}
          disabled={cargando}
        >
          <FaPlus />
          {t('ports.ui.formulario.informeFotografico.agregarVin')}
        </button>
      </div>

      {registrosPorVin.map((registro) => (
        <div
          key={registro.id}
          className="mb-6 p-4 rounded"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
            border: `2px solid ${borderColor}`,
          }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.informeFotografico.vinVehiculo')}
                </label>
                <input
                  type="text"
                  value={registro.vin}
                  onChange={(e) => handleActualizarRegistroVin(registro.id, 'vin', e.target.value)}
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor,
                    border: `1px solid ${borderColor}`,
                  }}
                  placeholder={t('ports.ui.formulario.informeFotografico.vinPlaceholder')}
                  disabled={cargando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.informeFotografico.danosRegistrados')}
                </label>
                <input
                  type="text"
                  value={registro.danos}
                  onChange={(e) => handleActualizarRegistroVin(registro.id, 'danos', e.target.value)}
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor,
                    border: `1px solid ${borderColor}`,
                  }}
                  placeholder={t('ports.ui.formulario.informeFotografico.danosPlaceholder')}
                  disabled={cargando}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleEliminarRegistroVin(registro.id)}
              className="ml-3 p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
              style={{ color: '#EF4444' }}
              title={t('ports.ui.formulario.informeFotografico.eliminarRegistro')}
            >
              <FaTrash />
            </button>
          </div>

          {(registro.vin || registro.danos) && (
            <div
              className="mb-3 p-2 rounded text-sm font-medium"
              style={{
                backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                border: `1px solid ${borderColor}`,
                color: textPrimary,
              }}
            >
              {registro.vin && <span>{t('ports.ui.formulario.informeFotografico.vinNro', { vin: registro.vin })}</span>}
              {registro.vin && registro.danos && <span> - </span>}
              {registro.danos && <span>{registro.danos}</span>}
            </div>
          )}

          <PuertosDragDropFotos
            imagenes={registro.fotos || []}
            onChange={(fotos) => actualizarFotosRegistro(registro.id, fotos)}
            cargando={cargando}
            placeholder={t('ports.ui.formulario.informeFotografico.dragPlaceholder', {
              vin: registro.vin || t('ports.ui.formulario.informeFotografico.sinVin'),
            })}
          />
        </div>
      ))}

      {registrosPorVin.length === 0 && (
        <div
          className="p-8 text-center rounded"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
            border: `2px dashed ${borderColor}`,
            color: textSecondary,
          }}
        >
          <p className="text-sm mb-2">{t('ports.ui.formulario.informeFotografico.empty')}</p>
          <p className="text-xs">{t('ports.ui.formulario.informeFotografico.emptyAyuda')}</p>
        </div>
      )}
    </div>
  );
}
