import React from 'react';

export default function FilaEquipo({ equipo, onChange, onDelete }) {
  const formatearMiles = (valor) => {
    const numero = parseFloat(valor);
    if (Number.isNaN(numero) || !Number.isFinite(numero)) return "";
    return numero.toLocaleString("es-CO");
  };

  const limpiarNumero = (valor) => String(valor || "").replace(/[^\d]/g, "");

  return (
    <tr>
      <td className="border p-1">
        <input
          type="number"
          value={equipo.cantidad}
          onChange={(e) => onChange("cantidad", e.target.value)}
          className="w-full border rounded p-1"
        />
      </td>
      <td className="border p-1">
        <input
          value={equipo.equipo}
          onChange={(e) => onChange("equipo", e.target.value)}
          className="w-full border rounded p-1"
        />
      </td>
      <td className="border p-1">
        <input
          value={equipo.marca}
          onChange={(e) => onChange("marca", e.target.value)}
          className="w-full border rounded p-1"
        />
      </td>
      <td className="border p-1">
        <input
          type="text"
          value={formatearMiles(equipo.valorUnitario ?? equipo.precio ?? "")}
          onChange={(e) => onChange("valorUnitario", limpiarNumero(e.target.value))}
          className="w-full border rounded p-1"
          inputMode="numeric"
        />
      </td>
      <td className="border p-1">
        <input
          type="text"
          value={formatearMiles(equipo.valor ?? (() => {
            const cantidad = parseFloat(equipo.cantidad) || 0;
            const valorUnitario = parseFloat(equipo.valorUnitario ?? equipo.precio) || 0;
            return cantidad * valorUnitario || "";
          })())}
          readOnly
          className="w-full border rounded p-1 bg-gray-100"
        />
      </td>
      <td className="border p-1">
        <input
          value={equipo.capacidad}
          onChange={(e) => onChange("capacidad", e.target.value)}
          className="w-full border rounded p-1"
        />
      </td>
      <td className="border p-1">
        <input
          value={equipo.apariencia}
          onChange={(e) => onChange("apariencia", e.target.value)}
          className="w-full border rounded p-1"
        />
      </td>
      <td className="border p-1 text-center">
        <button
          type="button"
          className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
          onClick={onDelete}
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}
