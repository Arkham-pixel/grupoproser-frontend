import React from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-orange-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-orange-500 text-white p-2 rounded-lg mr-3">🚛</span>
        {t('pol.ui.transporteInterior.title')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Primera fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.empresaTransportadora')}
          </label>
          <input
            type="text"
            value={empresaTransportadora}
            onChange={(e) => setEmpresaTransportadora(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.empresaTransportadoraPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.remesaNo')}
          </label>
          <input
            type="text"
            value={remesaNo}
            onChange={(e) => setRemesaNo(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.remesaNoPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.conductor')}
          </label>
          <input
            type="text"
            value={conductor}
            onChange={(e) => setConductor(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.conductorPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.cedula')}
          </label>
          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.cedulaPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* Segunda fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.placas')}
          </label>
          <input
            type="text"
            value={placas}
            onChange={(e) => setPlacas(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.placasPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.modelo')}
          </label>
          <input
            type="text"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.modeloPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.marca')}
          </label>
          <input
            type="text"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.marcaPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.origen')}
          </label>
          <input
            type="text"
            value={origenInterior}
            onChange={(e) => setOrigenInterior(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.origenPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* Tercera fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.destino')}
          </label>
          <input
            type="text"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.destinoPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.celular')}
          </label>
          <input
            type="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.celularPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteInterior.cartaPorte')}
          </label>
          <input
            type="text"
            value={cartaPorte}
            onChange={(e) => setCartaPorte(e.target.value)}
            placeholder={t('pol.ui.transporteInterior.cartaPortePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            &nbsp;
          </label>
          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500">
            {t('pol.ui.transporteInterior.campoReservado')}
          </div>
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-orange-50 rounded-md border border-orange-200">
        <p className="text-sm text-orange-800">
          <strong>💡 {t('pol.ui.common.noteLabel')}</strong> {t('pol.ui.transporteInterior.note')}
        </p>
      </div>
    </div>
  );
}
