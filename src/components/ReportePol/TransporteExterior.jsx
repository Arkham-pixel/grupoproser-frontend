import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import SelectBuscable from "../SelectBuscable";

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent";

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
  const { t } = useTranslation();

  const opcionesOrigen = useMemo(
    () => [
      { value: "COLOMBIA", label: t("pol.ui.transporteExterior.origenes.colombia") },
      { value: "MEXICO", label: t("pol.ui.transporteExterior.origenes.mexico") },
      { value: "ESTADOS UNIDOS", label: t("pol.ui.transporteExterior.origenes.estadosUnidos") },
      { value: "CHINA", label: t("pol.ui.transporteExterior.origenes.china") },
      { value: "ALEMANIA", label: t("pol.ui.transporteExterior.origenes.alemania") },
      { value: "JAPON", label: t("pol.ui.transporteExterior.origenes.japon") },
      { value: "OTRO", label: t("pol.ui.transporteExterior.origenes.otro") },
    ],
    [t]
  );

  const opcionesTipo = useMemo(
    () => [
      { value: "MARITIMO", label: t("pol.ui.transporteExterior.tipos.maritimo") },
      { value: "AEREO", label: t("pol.ui.transporteExterior.tipos.aereo") },
      { value: "TERRESTRE", label: t("pol.ui.transporteExterior.tipos.terrestre") },
      { value: "FERROVIARIO", label: t("pol.ui.transporteExterior.tipos.ferroviario") },
      { value: "MULTIMODAL", label: t("pol.ui.transporteExterior.tipos.multimodal") },
    ],
    [t]
  );

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-purple-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-purple-500 text-white p-2 rounded-lg mr-3">🚢</span>
        {t('pol.ui.transporteExterior.title')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteExterior.origen')}
          </label>
          <SelectBuscable
            options={opcionesOrigen}
            value={origen}
            onChange={setOrigen}
            placeholder={t('pol.ui.transporteExterior.selectOrigen')}
            searchPlaceholder={t('pol.ui.common.searchList')}
            noResultsText={t('pol.ui.common.noResults')}
            buttonClassName={selectCls}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteExterior.tipoTransporte')}
          </label>
          <SelectBuscable
            options={opcionesTipo}
            value={tipoTransporte}
            onChange={setTipoTransporte}
            placeholder={t('pol.ui.common.selectType')}
            searchPlaceholder={t('pol.ui.common.searchList')}
            noResultsText={t('pol.ui.common.noResults')}
            buttonClassName={selectCls}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteExterior.motonave')}
          </label>
          <input
            type="text"
            value={motonave}
            onChange={(e) => setMotonave(e.target.value)}
            placeholder={t('pol.ui.transporteExterior.motonavePlaceholder')}
            className={selectCls}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteExterior.registro')}
          </label>
          <input
            type="text"
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
            placeholder={t('pol.ui.transporteExterior.registroPlaceholder')}
            className={selectCls}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* Segunda fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteExterior.docTransporte')}
          </label>
          <input
            type="text"
            value={docTransporte}
            onChange={(e) => setDocTransporte(e.target.value)}
            placeholder={t('pol.ui.transporteExterior.docTransportePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteExterior.puertoOrigen')}
          </label>
          <input
            type="text"
            value={puertoOrigen}
            onChange={(e) => setPuertoOrigen(e.target.value)}
            placeholder={t('pol.ui.transporteExterior.puertoOrigenPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteExterior.puertoArribo')}
          </label>
          <input
            type="text"
            value={puertoArribo}
            onChange={(e) => setPuertoArribo(e.target.value)}
            placeholder={t('pol.ui.transporteExterior.puertoArriboPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.transporteExterior.destinoFinal')}
          </label>
          <input
            type="text"
            value={destinoFinal}
            onChange={(e) => setDestinoFinal(e.target.value)}
            placeholder={t('pol.ui.transporteExterior.destinoFinalPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-purple-50 rounded-md border border-purple-200">
        <p className="text-sm text-purple-800">
          <strong>💡 {t('pol.ui.common.noteLabel')}</strong> {t('pol.ui.transporteExterior.note')}
        </p>
      </div>
    </div>
  );
}
