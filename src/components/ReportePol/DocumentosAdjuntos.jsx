import React from "react";
import { useTranslation } from "react-i18next";

export default function DocumentosAdjuntos({
  facturaComercial, setFacturaComercial,
  listaEmpaque, setListaEmpaque,
  docTransporteAdjunto, setDocTransporteAdjunto
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-teal-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-teal-500 text-white p-2 rounded-lg mr-3">📎</span>
        {t('pol.ui.documentosAdjuntos.title')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.documentosAdjuntos.facturaComercial')}
          </label>
          <select
            value={facturaComercial}
            onChange={(e) => setFacturaComercial(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="NO">{t('pol.ui.common.no')}</option>
            <option value="SI">{t('pol.ui.common.yes')}</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.documentosAdjuntos.listaEmpaque')}
          </label>
          <select
            value={listaEmpaque}
            onChange={(e) => setListaEmpaque(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="NO">{t('pol.ui.common.no')}</option>
            <option value="SI">{t('pol.ui.common.yes')}</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.documentosAdjuntos.docTransporte')}
          </label>
          <select
            value={docTransporteAdjunto}
            onChange={(e) => setDocTransporteAdjunto(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="NO">{t('pol.ui.common.no')}</option>
            <option value="SI">{t('pol.ui.common.yes')}</option>
          </select>
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-teal-50 rounded-md border border-teal-200">
        <p className="text-sm text-teal-800">
          <strong>💡 {t('pol.ui.common.noteLabel')}</strong> {t('pol.ui.documentosAdjuntos.note')}
        </p>
      </div>
    </div>
  );
}
