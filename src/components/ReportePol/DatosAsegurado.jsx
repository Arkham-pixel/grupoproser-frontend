import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { aseguradorasConFuncionarios } from "../../data/aseguradorasFuncionarios";
import { generarSucursalesParaAseguradora, buscarSucursales } from "../../data/sucursales";
import SelectBuscable from "../SelectBuscable";

const selectCls =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent";

export default function DatosAsegurado({
  aseguradora, setAseguradora,
  sucursal, setSucursal,
  asegurado, setAsegurado,
  numPiezas, setNumPiezas,
  tipoEmpaque, setTipoEmpaque,
  claseMercancia, setClaseMercancia,
  pedidoNo, setPedidoNo,
  fechaConstruccion, setFechaConstruccion
}) {
  const { t } = useTranslation();

  const aseguradoras = useMemo(
    () => Object.keys(aseguradorasConFuncionarios).sort((a, b) => a.localeCompare(b, "es")),
    []
  );

  const [sucursalesFiltradas, setSucursalesFiltradas] = useState([]);

  useEffect(() => {
    if (aseguradora) {
      setSucursalesFiltradas(generarSucursalesParaAseguradora(aseguradora));
    } else {
      setSucursalesFiltradas([]);
    }
  }, [aseguradora]);

  useEffect(() => {
    setSucursal("");
  }, [aseguradora, setSucursal]);

  const opcionesAseguradora = useMemo(
    () => aseguradoras.map((a) => ({ value: a, label: a })),
    [aseguradoras]
  );

  const opcionesSucursal = useMemo(
    () => sucursalesFiltradas.map((s) => ({ value: s, label: s })),
    [sucursalesFiltradas]
  );

  const opcionesEmpaque = useMemo(
    () => [
      { value: "CONTENEDOR DE 40 PIES", label: t("pol.ui.datosAsegurado.tiposEmpaque.contenedor40") },
      { value: "CONTENEDOR DE 20 PIES", label: t("pol.ui.datosAsegurado.tiposEmpaque.contenedor20") },
      { value: "CONTENEDOR DE 45 PIES", label: t("pol.ui.datosAsegurado.tiposEmpaque.contenedor45") },
      { value: "CARGA SUELTA", label: t("pol.ui.datosAsegurado.tiposEmpaque.cargaSuelta") },
      { value: "PALETIZADO", label: t("pol.ui.datosAsegurado.tiposEmpaque.paletizado") },
      { value: "OTRO", label: t("pol.ui.datosAsegurado.tiposEmpaque.otro") },
    ],
    [t]
  );

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-green-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-green-500 text-white p-2 rounded-lg mr-3">🏢</span>
        {t("pol.ui.datosAsegurado.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("pol.ui.datosAsegurado.aseguradora")}
          </label>
          <SelectBuscable
            options={opcionesAseguradora}
            value={aseguradora}
            onChange={setAseguradora}
            placeholder={t("pol.ui.datosAsegurado.selectAseguradora")}
            searchPlaceholder={t("pol.ui.datosAsegurado.searchAseguradora")}
            noResultsText={t("pol.ui.common.noResults")}
            buttonClassName={selectCls}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("pol.ui.datosAsegurado.sucursal")}
          </label>
          {aseguradora ? (
            <div className="space-y-2">
              <SelectBuscable
                options={opcionesSucursal}
                value={
                  sucursal && sucursalesFiltradas.includes(sucursal) ? sucursal : ""
                }
                onChange={setSucursal}
                placeholder={t("pol.ui.datosAsegurado.selectSucursal")}
                searchPlaceholder={t("pol.ui.datosAsegurado.searchSucursal")}
                noResultsText={t("pol.ui.common.noResults")}
                buttonClassName={selectCls}
              />
              <div className="text-xs text-gray-500">
                {t("pol.ui.datosAsegurado.sucursalesDisponibles", {
                  count: buscarSucursales(sucursalesFiltradas, "").length,
                })}
              </div>

              <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-800 mb-2">
                  <strong>💡 {t("pol.ui.datosAsegurado.opcionPersonalizada")}</strong>{" "}
                  {t("pol.ui.datosAsegurado.opcionPersonalizadaHint")}
                </p>
                <input
                  type="text"
                  value={
                    sucursal && sucursal.startsWith(aseguradora)
                      ? sucursal.replace(`${aseguradora} `, "")
                      : sucursal && !sucursalesFiltradas.includes(sucursal)
                        ? sucursal
                        : ""
                  }
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor) {
                      setSucursal(
                        valor.startsWith(aseguradora) ? valor : `${aseguradora} ${valor}`
                      );
                    } else {
                      setSucursal("");
                    }
                  }}
                  placeholder={t("pol.ui.datosAsegurado.sucursalPersonalizadaPlaceholder")}
                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500">
              {t("pol.ui.datosAsegurado.selectAseguradoraFirst")}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("pol.ui.datosAsegurado.asegurado")}
          </label>
          <input
            type="text"
            value={asegurado}
            onChange={(e) => setAsegurado(e.target.value)}
            placeholder={t("pol.ui.datosAsegurado.aseguradoPlaceholder")}
            className={selectCls}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("pol.ui.datosAsegurado.numPiezas")}
          </label>
          <input
            type="number"
            value={numPiezas}
            onChange={(e) => setNumPiezas(e.target.value)}
            placeholder={t("pol.ui.datosAsegurado.numPiezasPlaceholder")}
            min="1"
            className={selectCls}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("pol.ui.datosAsegurado.tipoEmpaque")}
          </label>
          <SelectBuscable
            options={opcionesEmpaque}
            value={tipoEmpaque}
            onChange={setTipoEmpaque}
            placeholder={t("pol.ui.common.selectType")}
            searchPlaceholder={t("pol.ui.common.searchList")}
            noResultsText={t("pol.ui.common.noResults")}
            buttonClassName={selectCls}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("pol.ui.datosAsegurado.claseMercancia")}
          </label>
          <input
            type="text"
            value={claseMercancia}
            onChange={(e) => setClaseMercancia(e.target.value)}
            placeholder={t("pol.ui.datosAsegurado.claseMercanciaPlaceholder")}
            className={selectCls}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("pol.ui.datosAsegurado.pedidoNo")}
          </label>
          <input
            type="text"
            value={pedidoNo}
            onChange={(e) => setPedidoNo(e.target.value)}
            placeholder={t("pol.ui.datosAsegurado.pedidoNoPlaceholder")}
            className={selectCls}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t("pol.ui.datosAsegurado.fechaConstruccion")}
          </label>
          <input
            type="datetime-local"
            value={fechaConstruccion}
            onChange={(e) => setFechaConstruccion(e.target.value)}
            className={selectCls}
          />
        </div>
      </div>

      <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
        <p className="text-sm text-green-800">
          <strong>💡 {t("pol.ui.common.noteLabel")}</strong> {t("pol.ui.datosAsegurado.note")}
        </p>
      </div>
    </div>
  );
}
