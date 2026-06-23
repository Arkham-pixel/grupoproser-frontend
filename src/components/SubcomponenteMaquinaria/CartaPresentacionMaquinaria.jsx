import React from "react";
import Select from "react-select";
import {
  FieldLabel,
  ThemedInput,
  ThemedTextarea,
  SyncedValue,
  getSelectStyles,
  useMaquinariaTheme,
} from "./maquinariaUi";

const SALUDOS = ["Estimados señores:", "Cordial saludo.", "Apreciados señores:"];

export default function CartaPresentacionMaquinaria({
  ciudadFecha,
  setCiudadFecha,
  fecha,
  aseguradora,
  nombreAsegurado,
  nombreMaquinaria,
  referencia,
  saludo,
  setSaludo,
  cuerpo,
  setCuerpo,
  opcionesCiudades = [],
  onCiudadChange,
  cargando = false,
}) {
  const t = useMaquinariaTheme();
  const selectStyles = getSelectStyles(t);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <FieldLabel hint="Al elegir ciudad se autocompleta lugar, ubicación y departamento en la tabla">
          Ciudad
        </FieldLabel>
        <Select
          options={opcionesCiudades}
          value={opcionesCiudades.find((opt) => opt.label === ciudadFecha) || null}
          onChange={(opt) => {
            if (opt) {
              setCiudadFecha(opt.label);
              onCiudadChange?.(opt.value);
            } else {
              setCiudadFecha("");
            }
          }}
          placeholder="Seleccione ciudad"
          isClearable
          styles={selectStyles}
          isDisabled={cargando}
        />
        <div className="mt-2">
          <ThemedInput
            value={ciudadFecha}
            onChange={(e) => setCiudadFecha(e.target.value)}
            placeholder="O escriba la ciudad"
            disabled={cargando}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Fecha</FieldLabel>
        <SyncedValue value={fecha} source="Encabezado del formulario" />
      </div>

      <div>
        <FieldLabel>Aseguradora</FieldLabel>
        <SyncedValue value={aseguradora} source="Encabezado del formulario" />
      </div>

      <div>
        <FieldLabel>Asegurado</FieldLabel>
        <SyncedValue value={nombreAsegurado} source="Encabezado del formulario" />
      </div>

      <div>
        <FieldLabel>Maquinaria</FieldLabel>
        <SyncedValue value={nombreMaquinaria} source="Encabezado del formulario" />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Referencia</FieldLabel>
        <SyncedValue value={referencia} source="§1 Informe de inspección" />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Saludo</FieldLabel>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={saludo}
            onChange={(e) => setSaludo(e.target.value)}
            className="px-3 py-2 text-sm rounded-md sm:max-w-xs"
            style={{
              backgroundColor: t.inputBg,
              color: t.textPrimary,
              border: `1px solid ${t.borderColor}`,
            }}
            disabled={cargando}
          >
            <option value="">Seleccione un saludo</option>
            {SALUDOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ThemedInput
            value={saludo}
            onChange={(e) => setSaludo(e.target.value)}
            placeholder="O escriba otro saludo"
            disabled={cargando}
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Texto de presentación</FieldLabel>
        <ThemedTextarea
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          placeholder="Cuerpo de la carta de presentación"
          rows={4}
          disabled={cargando}
        />
      </div>
    </div>
  );
}
