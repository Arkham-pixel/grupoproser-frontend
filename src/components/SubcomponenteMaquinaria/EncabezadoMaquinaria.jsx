import React from "react";
import Select from "react-select";
import Logo from "../../img/Logo.png";
import {
  useMaquinariaTheme,
  FieldLabel,
  ThemedInput,
  getSelectStyles,
} from "./maquinariaUi";

export default function EncabezadoMaquinaria({
  nombreAsegurado,
  setNombreAsegurado,
  nombreMaquinaria,
  setNombreMaquinaria,
  marca,
  setMarca,
  opcionesAsegurados = [],
  opcionesAseguradoras = [],
  onAseguradoChange,
  onAseguradoraChange,
  aseguradora,
  setAseguradora,
}) {
  const t = useMaquinariaTheme();
  const selectStyles = getSelectStyles(t);

  return (
    <div
      className="rounded-lg border p-4 sm:p-5 mb-6"
      style={{ borderColor: t.borderColor, backgroundColor: t.cardBg }}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <div className="flex-shrink-0 flex justify-center sm:justify-start w-full sm:w-auto">
          <img src={Logo} alt="Logo PROSER" className="h-14 sm:h-16 object-contain" />
        </div>

        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FieldLabel hint="Estos datos se replican en carta, tabla y Word">Aseguradora</FieldLabel>
            <Select
              options={opcionesAseguradoras}
              value={opcionesAseguradoras.find((o) => o.label === aseguradora) || null}
              onChange={(opt) => {
                if (opt) {
                  setAseguradora(opt.label);
                  onAseguradoraChange?.(opt.value);
                } else {
                  setAseguradora("");
                }
              }}
              placeholder="Seleccione aseguradora"
              isClearable
              isSearchable
              styles={selectStyles}
            />
            <div className="mt-2">
              <ThemedInput
                value={aseguradora}
                onChange={(e) => setAseguradora(e.target.value)}
                placeholder="O escriba el nombre de la aseguradora"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Asegurado</FieldLabel>
            <Select
              options={opcionesAsegurados}
              value={opcionesAsegurados.find((o) => o.label === nombreAsegurado) || null}
              onChange={(opt) => {
                if (opt) {
                  setNombreAsegurado(opt.label);
                  onAseguradoChange?.(opt.value);
                } else {
                  setNombreAsegurado("");
                }
              }}
              placeholder="Seleccione asegurado"
              isClearable
              isSearchable
              styles={selectStyles}
            />
            <div className="mt-2">
              <ThemedInput
                value={nombreAsegurado}
                onChange={(e) => setNombreAsegurado(e.target.value)}
                placeholder="O escriba el nombre del asegurado"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Equipo / Maquinaria</FieldLabel>
            <ThemedInput
              value={nombreMaquinaria}
              onChange={(e) => setNombreMaquinaria(e.target.value)}
              placeholder="Tipo o nombre del equipo"
            />
          </div>

          <div>
            <FieldLabel hint="Se replica en tabla §1 y descripción §2">Marca</FieldLabel>
            <ThemedInput
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Marca del equipo"
            />
          </div>
        </div>
      </div>

      <div
        className="mt-4 pt-3 grid grid-cols-3 text-center text-xs sm:text-sm font-medium border-t"
        style={{ borderColor: t.borderColor, color: t.textSecondary }}
      >
        <span>INSP. RIESGOS</span>
        <span>RIESGOS</span>
        <span style={{ color: t.textPrimary }}>INFORME DE MAQUINARIA</span>
      </div>
    </div>
  );
}
