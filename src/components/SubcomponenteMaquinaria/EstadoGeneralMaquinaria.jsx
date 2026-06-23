import React from "react";
import { FormTable, FormTableRow, TableFieldInput, TableFieldTextarea, SyncedValue } from "./maquinariaUi";

export default function EstadoGeneralMaquinaria({
  electrico, setElectrico,
  mecanico, setMecanico,
  hidraulico, setHidraulico,
  pintura, setPintura,
  chasis, setChasis,
  sistemaLocomocion,
  funcionamiento,
  mantenimiento, setMantenimiento,
}) {
  const areas = [
    { label: "ELÉCTRICO E INSTRUMENTOS", value: electrico, onChange: setElectrico, rows: 2 },
    { label: "SISTEMA MECÁNICO", value: mecanico, onChange: setMecanico, rows: 2 },
    { label: "SISTEMA HIDRÁULICO", value: hidraulico, onChange: setHidraulico, rows: 2 },
    { label: "PINTURA", value: pintura, onChange: setPintura, rows: 2 },
    { label: "CHASIS", value: chasis, onChange: setChasis, rows: 2 },
  ];

  return (
    <FormTable>
      <tbody>
        {areas.map(({ label, value, onChange, rows }) => (
          <FormTableRow key={label} label={label}>
            <TableFieldTextarea
              rows={rows}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Escriba aquí"
            />
          </FormTableRow>
        ))}
        <FormTableRow label="SISTEMA DE LOCOMOCIÓN">
          <SyncedValue value={sistemaLocomocion} source="§2 — Sistema de locomoción" />
        </FormTableRow>
        <FormTableRow label="FUNCIONAMIENTO">
          <SyncedValue value={funcionamiento} source="§2 — Función y estado operativo" />
        </FormTableRow>
        <FormTableRow label="MANTENIMIENTO">
          <TableFieldInput
            value={mantenimiento}
            onChange={(e) => setMantenimiento(e.target.value)}
            placeholder="Escriba aquí"
          />
        </FormTableRow>
      </tbody>
    </FormTable>
  );
}
