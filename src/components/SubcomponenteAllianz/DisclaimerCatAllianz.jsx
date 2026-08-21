import React from 'react';
import { useTranslation } from 'react-i18next';
import { DISCLAIMER_CAT_ALLIANZ } from './allianzHelpers.js';

/**
 * Disclaimer Manual CAT Allianz (no cobertura / no vocero / severidad preliminar).
 */
export default function DisclaimerCatAllianz({ className = '' }) {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 font-body text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
      role="note"
    >
      <p className="font-semibold">{t('allianz.cat.disclaimerTitle')}</p>
      <p className="mt-1 leading-relaxed">
        {t('allianz.cat.disclaimerBody', { defaultValue: DISCLAIMER_CAT_ALLIANZ })}
      </p>
    </div>
  );
}
