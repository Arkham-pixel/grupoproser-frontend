import React from "react";
import { useTranslation } from "react-i18next";

export default function Firmas({
  firmanteAsegurado, setFirmanteAsegurado,
  firmanteConductor, setFirmanteConductor,
  firmanteInspector, setFirmanteInspector,
  codigoInspector, setCodigoInspector
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-pink-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-pink-500 text-white p-2 rounded-lg mr-3">✍️</span>
        {t('pol.ui.firmas.title')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.firmas.asegurado')}
          </label>
          <input
            type="text"
            value={firmanteAsegurado}
            onChange={(e) => setFirmanteAsegurado(e.target.value)}
            placeholder={t('pol.ui.firmas.aseguradoPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.firmas.conductor')}
          </label>
          <input
            type="text"
            value={firmanteConductor}
            onChange={(e) => setFirmanteConductor(e.target.value)}
            placeholder={t('pol.ui.firmas.conductorPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.firmas.inspector')}
          </label>
          <input
            type="text"
            value={firmanteInspector}
            onChange={(e) => setFirmanteInspector(e.target.value)}
            placeholder={t('pol.ui.firmas.inspectorPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.firmas.codigo')}
          </label>
          <input
            type="text"
            value={codigoInspector}
            onChange={(e) => setCodigoInspector(e.target.value)}
            placeholder={t('pol.ui.firmas.codigoPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-pink-50 rounded-md border border-pink-200">
        <p className="text-sm text-pink-800">
          <strong>💡 {t('pol.ui.common.noteLabel')}</strong> {t('pol.ui.firmas.note')}
        </p>
      </div>
    </div>
  );
}
