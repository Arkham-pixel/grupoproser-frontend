import React from "react";

export default function TransporteExterior({
  origen, setOrigen,
  tipoTransporte, setTipoTransporte,
  motonave, setMotonave,
  registro, setRegistro,
  docTransporte, setDocTransporte,
  puertoOrigen, setPuertoOrigen,
  puertoArribo, setPuertoArribo,
  destinoFinal, setDestinoFinal
}) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-purple-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-purple-500 text-white p-2 rounded-lg mr-3">🚢</span>
        TRANSPORTE EXTERIOR
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Primera fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Origen / Origin *
          </label>
          <select
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Seleccionar origen...</option>
            <option value="COLOMBIA">COLOMBIA</option>
            <option value="MEXICO">MEXICO</option>
            <option value="ESTADOS UNIDOS">ESTADOS UNIDOS</option>
            <option value="CHINA">CHINA</option>
            <option value="ALEMANIA">ALEMANIA</option>
            <option value="JAPON">JAPON</option>
            <option value="OTRO">OTRO</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de Transporte / Type of Transport *
          </label>
          <select
            value={tipoTransporte}
            onChange={(e) => setTipoTransporte(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Seleccionar tipo...</option>
            <option value="MARITIMO">MARITIMO</option>
            <option value="AEREO">AEREO</option>
            <option value="TERRESTRE">TERRESTRE</option>
            <option value="FERROVIARIO">FERROVIARIO</option>
            <option value="MULTIMODAL">MULTIMODAL</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Motonave / Vessel *
          </label>
          <input
            type="text"
            value={motonave}
            onChange={(e) => setMotonave(e.target.value)}
            placeholder="Ej: VANTAGE V.2519W"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Registro / Register *
          </label>
          <input
            type="text"
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
            placeholder="Ej: 1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* Segunda fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Doc. de Transporte / Doc. of Transport *
          </label>
          <input
            type="text"
            value={docTransporte}
            onChange={(e) => setDocTransporte(e.target.value)}
            placeholder="Ej: BOGM31506700"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Puerto Origen / Port of Loading *
          </label>
          <input
            type="text"
            value={puertoOrigen}
            onChange={(e) => setPuertoOrigen(e.target.value)}
            placeholder="Ej: BUENAVENTURA"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Puerto Arribo / Port of Discharge *
          </label>
          <input
            type="text"
            value={puertoArribo}
            onChange={(e) => setPuertoArribo(e.target.value)}
            placeholder="Ej: LAZARO CARDENAS- ARGENTINA"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Destino Final / Final Place *
          </label>
          <input
            type="text"
            value={destinoFinal}
            onChange={(e) => setDestinoFinal(e.target.value)}
            placeholder="Ej: MEXICO"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-purple-50 rounded-md border border-purple-200">
        <p className="text-sm text-purple-800">
          <strong>💡 Nota:</strong> Los campos marcados con * son obligatorios para generar el documento POL.
        </p>
      </div>
    </div>
  );
} 