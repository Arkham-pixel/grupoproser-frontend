import React from "react";
import { FormTable, FormTableRow, TableFieldInput, TableFieldTextarea, TableFieldSelect, SyncedValue } from "./maquinariaUi";

const CAMPOS_SINCRONIZADOS = [
  ["ASEGURADORA", "aseguradora", "Encabezado"],
  ["EQUIPO INSPECCIONADO", "equipo", "Encabezado — maquinaria"],
  ["MARCA", "marca", "Encabezado del formulario"],
  ["TOMADOR", "tomador", "Encabezado — asegurado"],
  ["LUGAR INSPECCIÓN", "lugar", "Ciudad en datos generales"],
  ["UBICACIÓN", "ubicacion", "Autocompletado por ciudad"],
  ["DEPARTAMENTO", "departamento", "Autocompletado por ciudad"],
  ["FECHA DE INSPECCIÓN", "fechaInspeccion", "Encabezado del formulario"],
];

export default function TablaInspeccionMaquinaria({
  aseguradora,
  equipo,
  marca,
  referencia,
  setReferencia,
  tomador,
  lugar,
  ubicacion,
  departamento,
  codiInspector,
  onInspectorChange,
  opcionesInspectores = [],
  fechaInspeccion,
  atendido,
  setAtendido,
}) {
  const valores = {
    aseguradora,
    equipo,
    marca,
    tomador,
    lugar,
    ubicacion,
    departamento,
    fechaInspeccion,
  };

  return (
    <FormTable>
      <tbody>
        {CAMPOS_SINCRONIZADOS.map(([label, key, source]) => (
          <FormTableRow key={key} label={label}>
            <SyncedValue value={valores[key]} source={source} />
          </FormTableRow>
        ))}
        <FormTableRow label="REFERENCIA">
          <TableFieldTextarea
            rows={2}
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Escriba la referencia (NIT, póliza, etc.)"
          />
        </FormTableRow>
        <FormTableRow label="INSPECTOR">
          <TableFieldSelect
            value={codiInspector}
            onChange={(e) => onInspectorChange(e.target.value)}
          >
            <option value="">Seleccione inspector</option>
            {opcionesInspectores.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </TableFieldSelect>
        </FormTableRow>
        <FormTableRow label="ATENDIDO / CARGO">
          <TableFieldInput
            value={atendido}
            onChange={(e) => setAtendido(e.target.value)}
            placeholder="Cargo o persona atendida"
          />
        </FormTableRow>
      </tbody>
    </FormTable>
  );
}
