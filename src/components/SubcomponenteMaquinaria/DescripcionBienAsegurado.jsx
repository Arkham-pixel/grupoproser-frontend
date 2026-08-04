import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const filas = [
    { label: t('machinery.ui.description.modelo'), value: modelo, onChange: setModelo },
    { label: t('machinery.ui.description.linea'), value: linea, onChange: setLinea },
    { label: t('machinery.ui.description.motorDiesel'), value: motorDiesel, onChange: setMotorDiesel },
    { label: t('machinery.ui.description.color'), value: color, onChange: setColor },
    { label: t('machinery.ui.description.estadoOperativo'), value: estadoOperativo, onChange: setEstadoOperativo },
    { label: t('machinery.ui.description.cabina'), value: cabina, onChange: setCabina },
    { label: t('machinery.ui.description.equipoContraincendio'), value: equipoContraincendio, onChange: setEquipoContraincendio },
    { label: t('machinery.ui.description.equipoRadio'), value: equipoRadio, onChange: setEquipoRadio },
    { label: t('machinery.ui.description.radioOperacion'), value: radiodeOperacion, onChange: setRadiodeOperacion },
  ];

  return (
    <FormTable>
      <tbody>
        <FormTableRow label={t('machinery.ui.description.descripcion')}>
          <TableFieldTextarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={t('machinery.ui.description.descripcionPlaceholder')}
          />
        </FormTableRow>

        <FormTableRow label={t('machinery.ui.description.marca')}>
          <SyncedValue value={marca} source={t('machinery.ui.sources.formHeader')} />
        </FormTableRow>

        {filas.map(({ label, value, onChange }) => (
          <FormTableRow key={label} label={label}>
            <TableFieldInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={t('machinery.ui.common.writeHere')} />
          </FormTableRow>
        ))}

        <FormTableRow label={t('machinery.ui.description.locomocion')}>
          <TableFieldTextarea
            rows={2}
            value={sistemaLocomocion}
            onChange={(e) => setSistemaLocomocion(e.target.value)}
            placeholder={t('machinery.ui.description.locomocionPlaceholder')}
          />
        </FormTableRow>

        <FormTableRow label={t('machinery.ui.description.funcion')}>
          <TableFieldTextarea
            rows={2}
            value={funcion}
            onChange={(e) => setFuncion(e.target.value)}
            placeholder={t('machinery.ui.description.funcionPlaceholder')}
          />
        </FormTableRow>
      </tbody>
    </FormTable>
  );
}
