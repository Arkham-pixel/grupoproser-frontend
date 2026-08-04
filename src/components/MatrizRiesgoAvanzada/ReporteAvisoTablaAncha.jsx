import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowsAltH } from 'react-icons/fa';

export default function ReporteAvisoTablaAncha({ titulo }) {
  const { t } = useTranslation();
  const title = titulo || t('riskMatrix.reportView.wideTableTitle');

  return (
    <div className="reporte-aviso-tabla no-print" role="note">
      <FaArrowsAltH className="shrink-0 text-fenix-primario" aria-hidden />
      <div>
        <p className="font-heading text-sm font-semibold text-gray-800">{title}</p>
        <p className="mt-0.5 font-body text-xs text-gray-600">
          {t('riskMatrix.reportView.wideTableHint')}
        </p>
      </div>
    </div>
  );
}
