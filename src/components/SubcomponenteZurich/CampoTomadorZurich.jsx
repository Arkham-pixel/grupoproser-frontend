import React from 'react';
import { useTranslation } from 'react-i18next';
import { Campo, InputFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

/** Tomador con escritura libre (sin catálogo cerrado). */
const CampoTomadorZurich = ({ value = '', onChange, className = '', disabled = false }) => {
  const { t } = useTranslation();

  return (
    <Campo label={t('zurich.fields.tomador')} className={className}>
      <InputFenix
        value={value || ''}
        disabled={disabled}
        onChange={(e) => {
          const valor = e?.target ? e.target.value : e;
          onChange?.(valor);
        }}
        placeholder={t('zurich.placeholders.tomador')}
      />
    </Campo>
  );
};

export default CampoTomadorZurich;
