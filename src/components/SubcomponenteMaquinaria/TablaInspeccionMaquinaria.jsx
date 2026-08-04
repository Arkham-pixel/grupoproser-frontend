import React from "react";
import { useTranslation } from "react-i18next";
import { FormTable, FormTableRow, TableFieldInput, TableFieldTextarea, TableFieldSelect, SyncedValue } from "./maquinariaUi";

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
  const { t } = useTranslation();

  const campos = [
    { label: t('machinery.ui.table.aseguradora'), key: 'aseguradora', source: t('machinery.ui.sources.header') },
    { label: t('machinery.ui.table.equipo'), key: 'equipo', source: t('machinery.ui.sources.headerMachinery') },
    { label: t('machinery.ui.table.marca'), key: 'marca', source: t('machinery.ui.sources.formHeader') },
    { label: t('machinery.ui.table.tomador'), key: 'tomador', source: t('machinery.ui.sources.headerInsured') },
    { label: t('machinery.ui.table.lugar'), key: 'lugar', source: t('machinery.ui.sources.cityGeneral') },
    { label: t('machinery.ui.table.ubicacion'), key: 'ubicacion', source: t('machinery.ui.sources.cityAuto') },
    { label: t('machinery.ui.table.departamento'), key: 'departamento', source: t('machinery.ui.sources.cityAuto') },
    { label: t('machinery.ui.table.fecha'), key: 'fechaInspeccion', source: t('machinery.ui.sources.formHeader') },
  ];

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
        {campos.map(({ label, key, source }) => (
          <FormTableRow key={key} label={label}>
            <SyncedValue value={valores[key]} source={source} />
          </FormTableRow>
        ))}
        <FormTableRow label={t('machinery.ui.table.referencia')}>
          <TableFieldTextarea
            rows={2}
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder={t('machinery.ui.table.referenciaPlaceholder')}
          />
        </FormTableRow>
        <FormTableRow label={t('machinery.ui.table.inspector')}>
          <TableFieldSelect
            value={codiInspector}
            onChange={(e) => onInspectorChange(e.target.value)}
          >
            <option value="">{t('machinery.ui.table.inspectorPlaceholder')}</option>
            {opcionesInspectores.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </TableFieldSelect>
        </FormTableRow>
        <FormTableRow label={t('machinery.ui.table.atendido')}>
          <TableFieldInput
            value={atendido}
            onChange={(e) => setAtendido(e.target.value)}
            placeholder={t('machinery.ui.table.atendidoPlaceholder')}
          />
        </FormTableRow>
      </tbody>
    </FormTable>
  );
}
