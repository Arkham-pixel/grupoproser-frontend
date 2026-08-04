import React from 'react';
import { useTranslation } from 'react-i18next';
import FilaEquipo from './FilaEquipo';

export default function AreaEquipos({ area, onUpdate, onDeleteArea }) {
  const { t, i18n } = useTranslation();
  const locale = String(i18n.language || 'es').toLowerCase().startsWith('en') ? 'en-US' : 'es-CO';
  const formatearMoneda = (valor) => `$ ${Number(valor || 0).toLocaleString(locale)}`;

  const calcularValorFila = (eq = {}) => {
    const cantidad = parseFloat(eq.cantidad) || 0;
    const valorUnitario = parseFloat(eq.valorUnitario ?? eq.precio) || 0;
    return cantidad * valorUnitario;
  };

  const handleAgregarEquipo = () => {
    const nuevoEquipo = {
      cantidad: "",
      equipo: "",
      marca: "",
      valorUnitario: "",
      valor: "",
      capacidad: "",
      apariencia: ""
    };
    onUpdate({ ...area, equipos: [...area.equipos, nuevoEquipo] });
  };

  const handleEditarEquipo = (index, field, value) => {
    const nuevosEquipos = [...area.equipos];
    nuevosEquipos[index][field] = value;
    if (field === "cantidad" || field === "valorUnitario" || field === "precio") {
      const valorCalculado = calcularValorFila(nuevosEquipos[index]);
      nuevosEquipos[index].valor = valorCalculado ? String(valorCalculado) : "";
      if (field === "precio") {
        nuevosEquipos[index].valorUnitario = value;
      }
    }
    onUpdate({ ...area, equipos: nuevosEquipos });
  };

  const handleEliminarEquipo = (index) => {
    const nuevosEquipos = area.equipos.filter((_, idx) => idx !== index);
    onUpdate({ ...area, equipos: nuevosEquipos });
  };

  const subtotal = area.equipos.reduce((sum, eq) => sum + calcularValorFila(eq), 0);

  return (
    <div className="mb-10 p-4 border rounded shadow">
      <div className="flex items-center justify-between mb-4 bg-gray-100 p-2 rounded">
        <h3 className="text-xl font-bold">
          {t('inspection.ui.formularioAreas.areaSubtotal', {
            name: area.nombre,
            subtotal: formatearMoneda(subtotal),
          })}
        </h3>
        <button
          type="button"
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          onClick={onDeleteArea}
        >
          {t('inspection.ui.formularioAreas.deleteArea')}
        </button>
      </div>

      <table className="min-w-full text-sm border-collapse mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">{t('inspection.ui.formularioAreas.colQty')}</th>
            <th className="border p-2">{t('inspection.ui.formularioAreas.colEquipment')}</th>
            <th className="border p-2">{t('inspection.ui.formularioAreas.colBrand')}</th>
            <th className="border p-2">{t('inspection.ui.formularioAreas.colUnitValue')}</th>
            <th className="border p-2">{t('inspection.ui.formularioAreas.colValue')}</th>
            <th className="border p-2">{t('inspection.ui.formularioAreas.colCapacity')}</th>
            <th className="border p-2">{t('inspection.ui.formularioAreas.colAppearance')}</th>
            <th className="border p-2">{t('inspection.ui.formularioAreas.colAction')}</th>
          </tr>
        </thead>
        <tbody>
          {area.equipos.map((eq, idx) => (
            <FilaEquipo
              key={idx}
              equipo={eq}
              onChange={(field, value) => handleEditarEquipo(idx, field, value)}
              onDelete={() => handleEliminarEquipo(idx)}
            />
          ))}
        </tbody>
      </table>

      <button
        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
        onClick={handleAgregarEquipo}
      >
        ➕ {t('inspection.ui.formularioAreas.addEquipment')}
      </button>
    </div>
  );
}
