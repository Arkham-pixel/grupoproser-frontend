import React from "react";
import { FormTable, FormTableRow, TableFieldInput, TableFieldTextarea, SyncedValue } from "./maquinariaUi";

export default function DescripcionBienAsegurado({
  descripcion, setDescripcion,
  marca,
  modelo, setModelo,
  linea, setLinea,
  motorDiesel, setMotorDiesel,
  sistemaLocomocion, setSistemaLocomocion,
  color, setColor,
  estadoOperativo, setEstadoOperativo,
  cabina, setCabina,
  funcion, setFuncion,
  equipoContraincendio, setEquipoContraincendio,
  equipoRadio, setEquipoRadio,
  radiodeOperacion, setRadiodeOperacion,
}) {
  const filas = [
    { label: "MODELO", value: modelo, onChange: setModelo },
    { label: "LÍNEA", value: linea, onChange: setLinea },
    { label: "MOTOR DIESEL", value: motorDiesel, onChange: setMotorDiesel },
    { label: "COLOR", value: color, onChange: setColor },
    { label: "ESTADO OPERATIVO", value: estadoOperativo, onChange: setEstadoOperativo },
    { label: "CABINA", value: cabina, onChange: setCabina },
    { label: "EQUIPO CONTRAINCENDIO", value: equipoContraincendio, onChange: setEquipoContraincendio },
    { label: "EQUIPO DE RADIO COMUNICACIÓN", value: equipoRadio, onChange: setEquipoRadio },
    { label: "RADIO DE OPERACIÓN", value: radiodeOperacion, onChange: setRadiodeOperacion },
  ];

  return (
    <FormTable>
      <tbody>
        <FormTableRow label="DESCRIPCIÓN">
          <TableFieldTextarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción general del bien"
          />
        </FormTableRow>

        <FormTableRow label="MARCA">
          <SyncedValue value={marca} source="Encabezado del formulario" />
        </FormTableRow>

        {filas.map(({ label, value, onChange }) => (
          <FormTableRow key={label} label={label}>
            <TableFieldInput value={value} onChange={(e) => onChange(e.target.value)} placeholder="Escriba aquí" />
          </FormTableRow>
        ))}

        <FormTableRow label="SISTEMA DE LOCOMOCIÓN">
          <TableFieldTextarea
            rows={2}
            value={sistemaLocomocion}
            onChange={(e) => setSistemaLocomocion(e.target.value)}
            placeholder="Describa el sistema de locomoción"
          />
        </FormTableRow>

        <FormTableRow label="FUNCIÓN">
          <TableFieldTextarea
            rows={2}
            value={funcion}
            onChange={(e) => setFuncion(e.target.value)}
            placeholder="Función del equipo"
          />
        </FormTableRow>
      </tbody>
    </FormTable>
  );
}
