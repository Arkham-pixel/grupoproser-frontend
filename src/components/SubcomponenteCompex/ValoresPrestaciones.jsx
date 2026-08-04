import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
import React from 'react';
import { complexCard, complexPageWrap, complexSectionTitle, complexSubsectionTitle } from './complexFenixUi';
import { Campo, InputFenix, TextareaFenix } from './FacturacionHelpers';

export default function ValoresPrestaciones({ formData, handleChange }) {
  return (
    <div className={complexPageWrap}>
      <h2 className={complexSectionTitle}>{t("complex.ui.valores_prestaciones.valores_y_prestaciones")}</h2>

      <div className={complexCard}>
        <h3 className={complexSubsectionTitle}>{t("complex.ui.valores_prestaciones.valores_del_siniestro")}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Campo label={t("complex.ui.valores_prestaciones.valor_de_reserva")}>
            <InputFenix
              type="number"
              name="vlorResrva"
              value={formData.vlorResrva ?? ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder={t("complex.ui.valores_prestaciones.0_00")}
            />
          </Campo>
          <Campo label={t("complex.ui.valores_prestaciones.valor_del_reclamo")}>
            <InputFenix
              type="number"
              name="vlorReclmo"
              value={formData.vlorReclmo ?? ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder={t("complex.ui.valores_prestaciones.0_00")}
            />
          </Campo>
          <Campo label={t("complex.ui.valores_prestaciones.monto_a_indemnizar")}>
            <InputFenix
              type="number"
              name="montoIndmzar"
              value={formData.montoIndmzar ?? ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder={t("complex.ui.valores_prestaciones.0_00")}
            />
          </Campo>
        </div>

        <div className="mt-6">
          <Campo label={t("complex.ui.valores_prestaciones.observaciones")}>
            <TextareaFenix
              name="observacionesValores"
              value={formData.observacionesValores ?? ''}
              onChange={handleChange}
              rows={4}
              placeholder={t("complex.ui.valores_prestaciones.observaciones_sobre_los_valores_y_prestaciones")}
            />
          </Campo>
        </div>
      </div>
    </div>
  );
}
