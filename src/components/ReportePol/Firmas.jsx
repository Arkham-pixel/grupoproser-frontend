import React from "react";

export default function Firmas({
  firmanteAsegurado, setFirmanteAsegurado,
  firmanteConductor, setFirmanteConductor,
  firmanteInspector, setFirmanteInspector,
  codigoInspector, setCodigoInspector
}) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-pink-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-pink-500 text-white p-2 rounded-lg mr-3">✍️</span>
        FIRMAS
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Asegurado / Insured
          </label>
          <input
            type="text"
            value={firmanteAsegurado}
            onChange={(e) => setFirmanteAsegurado(e.target.value)}
            placeholder="Nombre del asegurado"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Conductor / Driver
          </label>
          <input
            type="text"
            value={firmanteConductor}
            onChange={(e) => setFirmanteConductor(e.target.value)}
            placeholder="Nombre del conductor"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Inspector / Surveyor *
          </label>
          <input
            type="text"
            value={firmanteInspector}
            onChange={(e) => setFirmanteInspector(e.target.value)}
            placeholder="Ej: JIMMY GRUESO"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Código / Code *
          </label>
          <input
            type="text"
            value={codigoInspector}
            onChange={(e) => setCodigoInspector(e.target.value)}
            placeholder="Ej: 16482259"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-pink-50 rounded-md border border-pink-200">
        <p className="text-sm text-pink-800">
          <strong>💡 Nota:</strong> Los campos marcados con * son obligatorios. El inspector y su código son necesarios para la validez del documento.
        </p>
      </div>
    </div>
  );
} 