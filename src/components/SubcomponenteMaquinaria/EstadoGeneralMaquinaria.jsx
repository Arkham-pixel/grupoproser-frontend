import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const areas = [
    { label: t('machinery.ui.estado.electrico'), value: electrico, onChange: setElectrico, rows: 2 },
    { label: t('machinery.ui.estado.mecanico'), value: mecanico, onChange: setMecanico, rows: 2 },
    { label: t('machinery.ui.estado.hidraulico'), value: hidraulico, onChange: setHidraulico, rows: 2 },
    { label: t('machinery.ui.estado.pintura'), value: pintura, onChange: setPintura, rows: 2 },
    { label: t('machinery.ui.estado.chasis'), value: chasis, onChange: setChasis, rows: 2 },
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
              placeholder={t('machinery.ui.common.writeHere')}
            />
          </FormTableRow>
        ))}
        <FormTableRow label={t('machinery.ui.estado.locomocion')}>
          <SyncedValue value={sistemaLocomocion} source={t('machinery.ui.sources.locomo2')} />
        </FormTableRow>
        <FormTableRow label={t('machinery.ui.estado.funcionamiento')}>
          <SyncedValue value={funcionamiento} source={t('machinery.ui.sources.funcion2')} />
        </FormTableRow>
        <FormTableRow label={t('machinery.ui.estado.mantenimiento')}>
          <TableFieldInput
            value={mantenimiento}
            onChange={(e) => setMantenimiento(e.target.value)}
            placeholder={t('machinery.ui.common.writeHere')}
          />
        </FormTableRow>
      </tbody>
    </FormTable>
  );
}
