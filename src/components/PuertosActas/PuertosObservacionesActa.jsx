import React from 'react';
import { useTranslation } from 'react-i18next';

const inputCls =
  'w-full rounded-b-lg border border-slate-300 dark:border-slate-600 border-t-0 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[140px] text-slate-800 dark:text-slate-100';

export default function PuertosObservacionesActa({
  observaciones = '',
  recomendaciones = '',
  onChange,
  soloLectura = false,
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <header className="px-5 py-3 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {t('ports.ui.actas.observations.title')}
        </h3>
      </header>
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('ports.ui.actas.observations.observations')}
          </p>
          <textarea
            className={`${inputCls} rounded-lg border-t`}
            placeholder={t('ports.ui.actas.observations.observationsPlaceholder')}
            value={observaciones}
            onChange={(e) => onChange?.('observaciones', e.target.value)}
            readOnly={soloLectura}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('ports.ui.actas.observations.recommendations')}
          </p>
          <textarea
            className={`${inputCls} rounded-lg border-t`}
            placeholder={t('ports.ui.actas.observations.recommendationsPlaceholder')}
            value={recomendaciones}
            onChange={(e) => onChange?.('recomendaciones', e.target.value)}
            readOnly={soloLectura}
          />
        </div>
      </div>
    </section>
  );
}
