import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash } from 'react-icons/fa';

/** Sección 2 — OBSERVACIONES: tabla VIN y observaciones del vehículo */
export default function ObservacionesRiicp004({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';

  const tablaAverias = formData.tablaAverias || [];

  const agregarFila = () => {
    onInputChange('tablaAverias', [
      ...tablaAverias,
      { id: Date.now(), vin: '', averias: '', codigo: '', dano: '' },
    ]);
  };

  const eliminarFila = (id) => {
    onInputChange('tablaAverias', tablaAverias.filter((f) => f.id !== id));
  };

  const actualizarCelda = (id, campo, valor) => {
    onInputChange(
      'tablaAverias',
      tablaAverias.map((f) => (f.id === id ? { ...f, [campo]: valor } : f))
    );
  };

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${theme === 'dark' ? '#DC2626' : '#DC2626'}`,
      }}
    >
      <h3 className="text-lg font-bold mb-1" style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}>
        {t('ports.ui.formulario.riicp004.observaciones.titulo')}
      </h3>
      <p className="text-xs mb-4" style={{ color: textSecondary }}>
        {t('ports.ui.formulario.riicp004.observaciones.ayuda')}
      </p>

      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium" style={{ color: textPrimary }}>
          {t('ports.ui.formulario.riicp004.observaciones.vinObservaciones')}
        </span>
        <button
          type="button"
          onClick={agregarFila}
          className="px-3 py-2 rounded flex items-center gap-2 text-sm font-medium text-white"
          style={{ backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E' }}
          disabled={cargando}
        >
          <FaPlus /> {t('ports.ui.formulario.riicp004.observaciones.agregarVehiculo')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ border: `1px solid ${borderColor}`, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: theme === 'dark' ? '#7F1D1D' : '#DC2626' }}>
              <th className="px-3 py-2 text-left font-bold text-white" style={{ border: `1px solid ${borderColor}`, minWidth: 200 }}>
                VIN
              </th>
              <th className="px-3 py-2 text-left font-bold text-white" style={{ border: `1px solid ${borderColor}` }}>
                {t('ports.ui.formulario.riicp004.observaciones.headerObservaciones')}
              </th>
              <th style={{ border: `1px solid ${borderColor}`, width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {tablaAverias.map((fila, index) => (
              <tr
                key={fila.id}
                style={{
                  backgroundColor:
                    index % 2 === 0
                      ? theme === 'dark' ? '#1A1A1A' : '#FFFFFF'
                      : theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                }}
              >
                <td style={{ border: `1px solid ${borderColor}`, padding: 4 }}>
                  <input
                    type="text"
                    value={fila.vin}
                    onChange={(e) => actualizarCelda(fila.id, 'vin', e.target.value)}
                    className="w-full px-2 py-1 text-sm"
                    style={{ backgroundColor: 'transparent', color: textPrimary, border: 'none' }}
                    placeholder="KNAPU81DBV7513314"
                    disabled={cargando}
                  />
                </td>
                <td style={{ border: `1px solid ${borderColor}`, padding: 4 }}>
                  <input
                    type="text"
                    value={fila.averias}
                    onChange={(e) => actualizarCelda(fila.id, 'averias', e.target.value)}
                    className="w-full px-2 py-1 text-sm"
                    style={{ backgroundColor: 'transparent', color: textPrimary, border: 'none' }}
                    placeholder={t('ports.ui.formulario.riicp004.observaciones.averiasPlaceholder')}
                    disabled={cargando}
                  />
                </td>
                <td style={{ border: `1px solid ${borderColor}`, padding: 4, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => eliminarFila(fila.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    disabled={cargando}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tablaAverias.length === 0 && (
        <p className="text-sm text-center py-6 mt-2 rounded border border-dashed" style={{ color: textSecondary, borderColor }}>
          {t('ports.ui.formulario.riicp004.observaciones.empty')}
        </p>
      )}
    </div>
  );
}
