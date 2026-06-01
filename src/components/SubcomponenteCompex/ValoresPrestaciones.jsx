import React from 'react';
import { complexCard, complexPageWrap, complexSectionTitle, complexSubsectionTitle } from './complexFenixUi';
import { Campo, InputFenix, TextareaFenix } from './FacturacionHelpers';

export default function ValoresPrestaciones({ formData, handleChange }) {
  return (
    <div className={complexPageWrap}>
      <h2 className={complexSectionTitle}>Valores y Prestaciones</h2>

      <div className={complexCard}>
        <h3 className={complexSubsectionTitle}>Valores del Siniestro</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Campo label="Valor de Reserva">
            <InputFenix
              type="number"
              name="vlorResrva"
              value={formData.vlorResrva ?? ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </Campo>
          <Campo label="Valor del Reclamo">
            <InputFenix
              type="number"
              name="vlorReclmo"
              value={formData.vlorReclmo ?? ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </Campo>
          <Campo label="Monto a Indemnizar">
            <InputFenix
              type="number"
              name="montoIndmzar"
              value={formData.montoIndmzar ?? ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </Campo>
        </div>

        <div className="mt-6">
          <Campo label="Observaciones">
            <TextareaFenix
              name="observacionesValores"
              value={formData.observacionesValores ?? ''}
              onChange={handleChange}
              rows={4}
              placeholder="Observaciones sobre los valores y prestaciones..."
            />
          </Campo>
        </div>
      </div>
    </div>
  );
}
