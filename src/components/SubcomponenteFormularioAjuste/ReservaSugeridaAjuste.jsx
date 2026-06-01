import React from 'react';
import { FaCalculator, FaPlus, FaTrash } from 'react-icons/fa';
import IAInteligente from './IAInteligente';
import { useTheme } from '../../context/ThemeContext';
import { tituloAjuste, subtituloAjuste } from './formatoTitulosAjuste';
import {
  parsearMontoReserva as parsearMonto,
  formatearMontoReserva as formatearMonto,
  calcularTotalReservaSugeridaItems
} from '../../utils/reservaSugeridaUtils';

export default function ReservaSugeridaAjuste({ formData, onInputChange, numeroSeccion = 7 }) {
  const { theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const sectionYellowBg = theme === 'dark' ? 'rgba(234, 179, 8, 0.15)' : '#FEF9C3';
  const sectionYellowText = theme === 'dark' ? '#FDE047' : '#854D0E';
  const sectionYellowBorder = theme === 'dark' ? 'rgba(234, 179, 8, 0.3)' : '#FDE047';
  const tableHeaderBg = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE';
  const tableHeaderText = theme === 'dark' ? '#93C5FD' : '#1E3A8A';
  const totalRowBg = theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#D1FAE5';
  const totalRowText = theme === 'dark' ? '#86EFAC' : '#065F46';

  const items = Array.isArray(formData.reservaSugeridaItems) ? formData.reservaSugeridaItems : [];

  const actualizarItems = (nuevosItems) => {
    onInputChange('reservaSugeridaItems', nuevosItems);
  };

  const agregarFila = () => {
    actualizarItems([
      ...items,
      { id: Date.now(), descripcion: '', reserva: '' }
    ]);
  };

  const eliminarFila = (id) => {
    actualizarItems(items.filter((item) => item.id !== id));
  };

  const actualizarFila = (id, campo, valor) => {
    actualizarItems(
      items.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
  };

  const totalReserva = calcularTotalReservaSugeridaItems(items);

  return (
    <div className="space-y-6">
      <div className="pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <h2 className="text-2xl font-bold flex items-center" style={{ color: textPrimary }}>
          <FaCalculator
            className="mr-3"
            style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
          />
          {numeroSeccion}. {tituloAjuste('Reserva sugerida')}
        </h2>
        <p className="mt-2" style={{ color: textSecondary }}>
          {subtituloAjuste('Determine la reserva sugerida')}
        </p>
      </div>

      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
      >
        <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
          {subtituloAjuste('Reserva sugerida')}
        </label>
        <textarea
          value={formData.reservaSugerida || ''}
          onChange={(e) => onInputChange('reservaSugerida', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-md focus:outline-none resize-vertical"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Escribe la reserva sugerida aquí. Por ejemplo: 'Se sugiere una reserva de 50 millones de pesos para cubrir los daños estructurales y equipos afectados'"
        />
        <div className="mt-2 text-sm" style={{ color: textSecondary }}>
          Mínimo recomendado: 80 palabras para la reserva sugerida
        </div>
      </div>

      <div
        className="p-4 rounded-lg space-y-3"
        style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold" style={{ color: textPrimary }}>
            {tituloAjuste('Detalle de reserva sugerida')}
          </h3>
          <button
            type="button"
            onClick={agregarFila}
            className="px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A',
              color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
            }}
          >
            <FaPlus /> Agregar fila
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[520px]" style={{ border: `1px solid ${borderColor}` }}>
            <thead>
              <tr style={{ backgroundColor: tableHeaderBg }}>
                <th
                  className="p-3 text-center text-sm font-semibold w-16"
                  style={{ color: tableHeaderText, border: `1px solid ${borderColor}` }}
                >
                  ITEM
                </th>
                <th
                  className="p-3 text-left text-sm font-semibold"
                  style={{ color: tableHeaderText, border: `1px solid ${borderColor}` }}
                >
                  DESCRIPCIÓN
                </th>
                <th
                  className="p-3 text-right text-sm font-semibold"
                  style={{ color: tableHeaderText, border: `1px solid ${borderColor}` }}
                >
                  RESERVA SUGERIDA
                </th>
                <th
                  className="p-3 text-center text-sm font-semibold w-20"
                  style={{ color: tableHeaderText, border: `1px solid ${borderColor}` }}
                />
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor:
                        index % 2 === 0
                          ? theme === 'dark'
                            ? '#1F1F1F'
                            : '#F9FAFB'
                          : theme === 'dark'
                            ? '#1A1A1A'
                            : '#FFFFFF'
                    }}
                  >
                    <td
                      className="p-2 text-center text-sm font-medium"
                      style={{ color: textPrimary, border: `1px solid ${borderColor}` }}
                    >
                      {index + 1}
                    </td>
                    <td className="p-2" style={{ border: `1px solid ${borderColor}` }}>
                      <input
                        type="text"
                        value={item.descripcion || ''}
                        onChange={(e) => actualizarFila(item.id, 'descripcion', e.target.value)}
                        placeholder="Descripción del ítem"
                        className="w-full px-2 py-1.5 text-sm rounded focus:outline-none"
                        style={{
                          backgroundColor: inputBg,
                          color: textPrimary,
                          border: `1px solid ${borderColor}`
                        }}
                      />
                    </td>
                    <td className="p-2" style={{ border: `1px solid ${borderColor}` }}>
                      <input
                        type="text"
                        value={item.reserva || ''}
                        onChange={(e) => actualizarFila(item.id, 'reserva', e.target.value)}
                        onBlur={(e) =>
                          actualizarFila(item.id, 'reserva', formatearMonto(e.target.value))
                        }
                        placeholder="1.000.000"
                        className="w-full px-2 py-1.5 text-sm rounded focus:outline-none text-right"
                        style={{
                          backgroundColor: inputBg,
                          color: textPrimary,
                          border: `1px solid ${borderColor}`
                        }}
                      />
                    </td>
                    <td className="p-2 text-center" style={{ border: `1px solid ${borderColor}` }}>
                      <button
                        type="button"
                        onClick={() => eliminarFila(item.id)}
                        className="px-2 py-1 rounded"
                        style={{
                          backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#EF4444',
                          color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
                        }}
                        title="Eliminar fila"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="p-4 text-center text-sm"
                    style={{ color: textSecondary, border: `1px solid ${borderColor}` }}
                  >
                    No hay filas. Haz clic en &quot;Agregar fila&quot; para comenzar.
                  </td>
                </tr>
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: totalRowBg }}>
                  <td
                    colSpan={2}
                    className="p-3 text-sm font-bold text-right"
                    style={{ color: totalRowText, border: `1px solid ${borderColor}` }}
                  >
                    TOTAL RESERVA
                  </td>
                  <td
                    className="p-3 text-sm font-bold text-right"
                    style={{ color: totalRowText, border: `1px solid ${borderColor}` }}
                  >
                    {formatearMonto(totalReserva)}
                  </td>
                  <td style={{ border: `1px solid ${borderColor}` }} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <IAInteligente
        textoActual={formData.reservaSugerida || ''}
        onTextoCambiado={(texto) => onInputChange('reservaSugerida', texto)}
        contextoFormulario={formData}
        tipoSeccion="reservaSugerida"
        tituloSeccion="Reserva Sugerida"
      />

      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: sectionYellowBg,
          border: `1px solid ${sectionYellowBorder}`
        }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center" style={{ color: sectionYellowText }}>
          📊 Validación de Calidad
        </h3>
        <div className="text-sm" style={{ color: sectionYellowText }}>
          <p className="mb-2">
            <strong>Recomendaciones para reserva sugerida de calidad:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Incluya el monto de la reserva sugerida</li>
            <li>Justifique el monto basándose en los daños evaluados</li>
            <li>Mencione los elementos cubiertos por la reserva</li>
            <li>Describa los criterios de la evaluación</li>
            <li>Mencione factores que pueden afectar el monto final</li>
            <li>Sea específico sobre las bases de cálculo utilizadas</li>
            <li>Detalle cada ítem en la tabla con su valor correspondiente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
