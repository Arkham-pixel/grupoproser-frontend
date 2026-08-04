import React from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import {
  FieldLabel,
  ThemedInput,
  ThemedTextarea,
  SyncedValue,
  getSelectStyles,
  useMaquinariaTheme,
} from "./maquinariaUi";

/** Persisted Spanish greeting values — display labels come from i18n */
const SALUDOS = [
  { value: "Estimados señores:", key: "estimados" },
  { value: "Cordial saludo.", key: "cordial" },
  { value: "Apreciados señores:", key: "apreciados" },
];

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
  const { t } = useTranslation();
  const mq = useMaquinariaTheme();
  const selectStyles = getSelectStyles(mq);
  const srcHeader = t('machinery.ui.sources.formHeader');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <FieldLabel hint={t('machinery.ui.letter.cityHint')}>
          {t('machinery.ui.letter.city')}
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
          placeholder={t('machinery.ui.letter.cityPlaceholder')}
          isClearable
          styles={selectStyles}
          isDisabled={cargando}
        />
        <div className="mt-2">
          <ThemedInput
            value={ciudadFecha}
            onChange={(e) => setCiudadFecha(e.target.value)}
            placeholder={t('machinery.ui.letter.cityManual')}
            disabled={cargando}
          />
        </div>
      </div>

      <div>
        <FieldLabel>{t('machinery.ui.letter.date')}</FieldLabel>
        <SyncedValue value={fecha} source={srcHeader} />
      </div>

      <div>
        <FieldLabel>{t('machinery.ui.letter.insurer')}</FieldLabel>
        <SyncedValue value={aseguradora} source={srcHeader} />
      </div>

      <div>
        <FieldLabel>{t('machinery.ui.letter.insured')}</FieldLabel>
        <SyncedValue value={nombreAsegurado} source={srcHeader} />
      </div>

      <div>
        <FieldLabel>{t('machinery.ui.letter.machinery')}</FieldLabel>
        <SyncedValue value={nombreMaquinaria} source={srcHeader} />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>{t('machinery.ui.letter.reference')}</FieldLabel>
        <SyncedValue value={referencia} source={t('machinery.ui.sources.section1')} />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>{t('machinery.ui.letter.greeting')}</FieldLabel>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={saludo}
            onChange={(e) => setSaludo(e.target.value)}
            className="px-3 py-2 text-sm rounded-md sm:max-w-xs"
            style={{
              backgroundColor: mq.inputBg,
              color: mq.textPrimary,
              border: `1px solid ${mq.borderColor}`,
            }}
            disabled={cargando}
          >
            <option value="">{t('machinery.ui.letter.greetingPlaceholder')}</option>
            {SALUDOS.map((s) => (
              <option key={s.value} value={s.value}>
                {t(`machinery.ui.letter.greetings.${s.key}`)}
              </option>
            ))}
          </select>
          <ThemedInput
            value={saludo}
            onChange={(e) => setSaludo(e.target.value)}
            placeholder={t('machinery.ui.letter.greetingManual')}
            disabled={cargando}
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>{t('machinery.ui.letter.body')}</FieldLabel>
        <ThemedTextarea
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          placeholder={t('machinery.ui.letter.bodyPlaceholder')}
          rows={4}
          disabled={cargando}
        />
      </div>
    </div>
  );
}
