import React from "react";

export default function TransporteInterior({
  empresaTransportadora, setEmpresaTransportadora,
  remesaNo, setRemesaNo,
  conductor, setConductor,
  cedula, setCedula,
  placas, setPlacas,
  modelo, setModelo,
  marca, setMarca,
  origenInterior, setOrigenInterior,
  destino, setDestino,
  celular, setCelular,
  cartaPorte, setCartaPorte
}) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-orange-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-orange-500 text-white p-2 rounded-lg mr-3">🚛</span>
        TRANSPORTE INTERIOR
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Primera fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Empresa Transportadora / Carrier
          </label>
          <input
            type="text"
            value={empresaTransportadora}
            onChange={(e) => setEmpresaTransportadora(e.target.value)}
            placeholder="Ej: TRANSPORTES ABC S.A."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Remesa No. / Remission No.
          </label>
          <input
            type="text"
            value={remesaNo}
            onChange={(e) => setRemesaNo(e.target.value)}
            placeholder="Ej: REM-001-2025"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Conductor / Driver
          </label>
          <input
            type="text"
            value={conductor}
            onChange={(e) => setConductor(e.target.value)}
            placeholder="Ej: JUAN PÉREZ"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Cédula / Identify
          </label>
          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Ej: 12345678"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* Segunda fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Placas / Plates
          </label>
          <input
            type="text"
            value={placas}
            onChange={(e) => setPlacas(e.target.value)}
            placeholder="Ej: XXX111"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Modelo / Model
          </label>
          <input
            type="text"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Ej: 2020"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Marca / Marks
          </label>
          <input
            type="text"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Ej: VOLVO"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Origen / Origin
          </label>
          <input
            type="text"
            value={origenInterior}
            onChange={(e) => setOrigenInterior(e.target.value)}
            placeholder="Ej: BUENAVENTURA"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* Tercera fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Destino / Arrival Place
          </label>
          <input
            type="text"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Ej: CALI"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Celular / Movil Phone
          </label>
          <input
            type="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            placeholder="Ej: 3001234567"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Carta de Porte / Carry Letter
          </label>
          <input
            type="text"
            value={cartaPorte}
            onChange={(e) => setCartaPorte(e.target.value)}
            placeholder="Ej: CP-001-2025"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            &nbsp;
          </label>
          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500">
            Campo reservado
          </div>
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-orange-50 rounded-md border border-orange-200">
        <p className="text-sm text-orange-800">
          <strong>💡 Nota:</strong> Los campos de transporte interior son opcionales y se pueden dejar vacíos si no aplican.
        </p>
      </div>
    </div>
  );
} 