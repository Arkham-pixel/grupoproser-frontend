import React from "react";

export default function Observaciones({
  observaciones, setObservaciones
}) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-yellow-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-yellow-500 text-white p-2 rounded-lg mr-3">📝</span>
        OBSERVACIONES / REMARKS
      </h2>
      
      {/* Instrucción del documento original */}
      <div className="mb-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
        <p className="text-sm text-yellow-800 italic">
          <strong>Instrucción:</strong> (En caso de novedad relacionar valor de la factura y valor de la pérdida / In any case novelties, statement the invoice value and the damage value)
        </p>
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Observaciones Detalladas
        </label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Describa aquí las observaciones de la inspección, incluyendo cualquier novedad, valor de factura, valor de pérdida, o detalles relevantes..."
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-vertical"
        />
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>💡 Nota:</strong> Las observaciones son importantes para documentar el estado de la mercancía y cualquier incidente durante la inspección.
        </p>
      </div>
    </div>
  );
} 