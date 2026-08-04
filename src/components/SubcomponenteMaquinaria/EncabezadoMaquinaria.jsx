import React from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const mq = useMaquinariaTheme();
  const selectStyles = getSelectStyles(mq);

  return (
    <div
      className="rounded-lg border p-4 sm:p-5 mb-6"
      style={{ borderColor: mq.borderColor, backgroundColor: mq.cardBg }}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <div className="flex-shrink-0 flex justify-center sm:justify-start w-full sm:w-auto">
          <img src={Logo} alt={t('machinery.ui.common.logoAlt')} className="h-14 sm:h-16 object-contain" />
        </div>

        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FieldLabel hint={t('machinery.ui.header.insurerHint')}>{t('machinery.ui.header.insurer')}</FieldLabel>
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
              placeholder={t('machinery.ui.header.insurerPlaceholder')}
              isClearable
              isSearchable
              styles={selectStyles}
            />
            <div className="mt-2">
              <ThemedInput
                value={aseguradora}
                onChange={(e) => setAseguradora(e.target.value)}
                placeholder={t('machinery.ui.header.insurerManual')}
              />
            </div>
          </div>

          <div>
            <FieldLabel>{t('machinery.ui.header.insured')}</FieldLabel>
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
              placeholder={t('machinery.ui.header.insuredPlaceholder')}
              isClearable
              isSearchable
              styles={selectStyles}
            />
            <div className="mt-2">
              <ThemedInput
                value={nombreAsegurado}
                onChange={(e) => setNombreAsegurado(e.target.value)}
                placeholder={t('machinery.ui.header.insuredManual')}
              />
            </div>
          </div>

          <div>
            <FieldLabel>{t('machinery.ui.header.equipment')}</FieldLabel>
            <ThemedInput
              value={nombreMaquinaria}
              onChange={(e) => setNombreMaquinaria(e.target.value)}
              placeholder={t('machinery.ui.header.equipmentPlaceholder')}
            />
          </div>

          <div>
            <FieldLabel hint={t('machinery.ui.header.brandHint')}>{t('machinery.ui.header.brand')}</FieldLabel>
            <ThemedInput
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder={t('machinery.ui.header.brandPlaceholder')}
            />
          </div>
        </div>
      </div>

      <div
        className="mt-4 pt-3 grid grid-cols-3 text-center text-xs sm:text-sm font-medium border-t"
        style={{ borderColor: mq.borderColor, color: mq.textSecondary }}
      >
        <span>{t('machinery.ui.header.tagInsp')}</span>
        <span>{t('machinery.ui.header.tagRisks')}</span>
        <span style={{ color: mq.textPrimary }}>{t('machinery.ui.header.tagReport')}</span>
      </div>
    </div>
  );
}
