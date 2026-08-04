import React from 'react';
import { useTranslation } from 'react-i18next';

const AgregarFilaValoracion = ({ onAgregar, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className="acciones-valoracion">
      <button
        className="btn-agregar"
        onClick={onAgregar}
        disabled={disabled}
        title={t('riskMatrix.valoracionUi.addAssessmentRowTitle')}
      >
        {t('riskMatrix.valoracionUi.addAssessmentRow')}
      </button>
    </div>
  );
};

export default AgregarFilaValoracion;
