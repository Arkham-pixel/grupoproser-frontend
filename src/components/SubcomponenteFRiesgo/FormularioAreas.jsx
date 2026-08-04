import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AreaEquipos from './AreaEquipos';

export default function FormularioAreas({ onChange, areasIniciales = [] }) {
  const { t, i18n } = useTranslation();
  const [areas, setAreas] = useState([]);
  const [nuevaArea, setNuevaArea] = useState("");
  const locale = String(i18n.language || 'es').toLowerCase().startsWith('en') ? 'en-US' : 'es-CO';
  const formatearMoneda = (valor) => `$ ${Number(valor || 0).toLocaleString(locale)}`;

  useEffect(() => {
    if (Array.isArray(areasIniciales)) {
      setAreas(areasIniciales);
    }
  }, [areasIniciales]);

  const handleAgregarArea = () => {
    if (!nuevaArea.trim()) return;
    const nuevasAreas = [...areas, { nombre: nuevaArea.trim(), equipos: [] }];
    setAreas(nuevasAreas);
    setNuevaArea("");
    if (onChange) onChange(nuevasAreas);
  };

  const handleActualizarArea = (index, updatedArea) => {
    const nuevasAreas = [...areas];
    nuevasAreas[index] = updatedArea;
    setAreas(nuevasAreas);
    if (onChange) onChange(nuevasAreas);
  };

  const handleEliminarArea = (index) => {
    const nuevasAreas = areas.filter((_, idx) => idx !== index);
    setAreas(nuevasAreas);
    if (onChange) onChange(nuevasAreas);
  };

  const calcularSubtotal = (equipos) =>
    equipos.reduce((sum, eq) => {
      const cantidad = parseFloat(eq.cantidad) || 0;
      const valorUnitario = parseFloat(eq.valorUnitario ?? eq.precio) || 0;
      return sum + (cantidad * valorUnitario);
    }, 0);

  const totalGeneral = areas.reduce(
    (sum, area) => sum + calcularSubtotal(area.equipos),
    0
  );

  return (
    <div className="p-4 w-full">
      <h2 className="text-2xl font-bold mb-4">
        🛠️ {t('inspection.ui.formularioAreas.equipmentInventory')}
      </h2>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          className="border rounded p-2 flex-1"
          value={nuevaArea}
          onChange={(e) => setNuevaArea(e.target.value)}
          placeholder={t('inspection.ui.formularioAreas.areaNamePlaceholder')}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleAgregarArea}
        >
          ➕ {t('inspection.ui.formularioAreas.addArea')}
        </button>
      </div>

      {areas.map((area, idx) => (
        <AreaEquipos
          key={`${area.nombre}-${idx}`}
          area={area}
          onUpdate={(updated) => handleActualizarArea(idx, updated)}
          onDeleteArea={() => handleEliminarArea(idx)}
        />
      ))}

      {areas.length > 0 && (
        <div className="mt-8 p-4 bg-green-100 rounded border border-green-400">
          <h3 className="text-xl font-bold">
            ✅ {t('inspection.ui.formularioAreas.totalEstimatedValue')}
          </h3>
          <p className="text-green-800 font-bold text-lg">
            {formatearMoneda(totalGeneral)}
          </p>
        </div>
      )}
    </div>
  );
}
