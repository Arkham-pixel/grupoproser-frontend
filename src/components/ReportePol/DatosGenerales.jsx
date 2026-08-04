import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import colombia from "../../data/colombia.json";
import SelectBuscable from "../SelectBuscable";

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function DatosGenerales({
  ciudad, setCiudad,
  fecha, setFecha,
  hora, setHora,
  tipoInspeccion, setTipoInspeccion,
  fechaLlegada, setFechaLlegada,
  regional, setRegional
}) {
  const { t } = useTranslation();

  const ciudadesColombia = useMemo(() => {
    const set = new Set();
    colombia.forEach(dep => dep.ciudades.forEach(c => set.add(c)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, []);

  const opcionesCiudad = useMemo(
    () => ciudadesColombia.map((c) => ({ value: c, label: c })),
    [ciudadesColombia]
  );

  const opcionesTipoInspeccion = useMemo(
    () => [
      { value: "INSP. ANTINARCOTICOS", label: t("pol.ui.datosGenerales.tipos.antinarcoticos") },
      { value: "INSP. ADUANERA", label: t("pol.ui.datosGenerales.tipos.aduanera") },
      { value: "INSP. SANITARIA", label: t("pol.ui.datosGenerales.tipos.sanitaria") },
      { value: "INSP. FITOSANITARIA", label: t("pol.ui.datosGenerales.tipos.fitosanitaria") },
      { value: "INSP. GENERAL", label: t("pol.ui.datosGenerales.tipos.general") },
      { value: "OTRO", label: t("pol.ui.datosGenerales.tipos.otro") },
    ],
    [t]
  );

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-blue-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-blue-500 text-white p-2 rounded-lg mr-3">📋</span>
        {t('pol.ui.datosGenerales.title')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.datosGenerales.ciudad')}
          </label>
          <SelectBuscable
            options={opcionesCiudad}
            value={ciudad}
            onChange={setCiudad}
            placeholder={t('pol.ui.datosGenerales.selectCity')}
            searchPlaceholder={t('pol.ui.common.searchList')}
            noResultsText={t('pol.ui.common.noResults')}
            buttonClassName={selectCls}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.datosGenerales.fecha')}
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={selectCls}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.datosGenerales.hora')}
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className={selectCls}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.datosGenerales.regional')}
          </label>
          <input
            type="text"
            value={regional}
            onChange={(e) => setRegional(e.target.value)}
            placeholder={t('pol.ui.datosGenerales.regionalPlaceholder')}
            className={selectCls}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.datosGenerales.tipoInspeccion')}
          </label>
          <SelectBuscable
            options={opcionesTipoInspeccion}
            value={tipoInspeccion}
            onChange={setTipoInspeccion}
            placeholder={t('pol.ui.common.selectType')}
            searchPlaceholder={t('pol.ui.common.searchList')}
            noResultsText={t('pol.ui.common.noResults')}
            buttonClassName={selectCls}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('pol.ui.datosGenerales.fechaLlegada')}
          </label>
          <input
            type="date"
            value={fechaLlegada}
            onChange={(e) => setFechaLlegada(e.target.value)}
            className={selectCls}
          />
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>💡 {t('pol.ui.common.noteLabel')}</strong> {t('pol.ui.datosGenerales.note')}
        </p>
      </div>
    </div>
  );
}
