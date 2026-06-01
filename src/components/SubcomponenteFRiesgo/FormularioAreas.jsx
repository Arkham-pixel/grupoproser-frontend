import React, { useEffect, useState } from 'react';
import AreaEquipos from './AreaEquipos';

export default function FormularioAreas({ onChange, areasIniciales = [] }) {
  const [areas, setAreas] = useState([]);
  const [nuevaArea, setNuevaArea] = useState("");
  const formatearMoneda = (valor) => `$ ${Number(valor || 0).toLocaleString('es-CO')}`;

  // Sincroniza el inventario cuando se carga desde historial
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

  // Calcula subtotales
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
      <h2 className="text-2xl font-bold mb-4">🛠️ Inventario de Equipos Eléctricos y Electrónicos</h2>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          className="border rounded p-2 flex-1"
          placeholder="Nombre del área (ej: COCINA)"
          value={nuevaArea}
          onChange={(e) => setNuevaArea(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleAgregarArea}
        >
          ➕ Agregar Área
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
          <h3 className="text-xl font-bold">✅ TOTAL VALOR ESTIMADO:</h3>
          <p className="text-green-800 font-bold text-lg">
            {formatearMoneda(totalGeneral)}
          </p>
        </div>
      )}
    </div>
  );
}
