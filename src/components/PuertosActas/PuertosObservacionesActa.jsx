import React, { forwardRef, memo, useCallback, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PuertosRichTextEditor from './PuertosRichTextEditor';

const PuertosObservacionesActa = forwardRef(function PuertosObservacionesActa(
  {
    observaciones = '',
    recomendaciones = '',
    onChange,
    soloLectura = false,
    syncKey = 'default',
  },
  ref
) {
  const { t } = useTranslation();
  const obsRef = useRef(null);
  const recRef = useRef(null);

  const onObservaciones = useCallback(
    (html) => onChange?.('observaciones', html),
    [onChange]
  );
  const onRecomendaciones = useCallback(
    (html) => onChange?.('recomendaciones', html),
    [onChange]
  );

  useImperativeHandle(
    ref,
    () => ({
      flush: () => {
        const observacionesHtml = obsRef.current?.flush?.() ?? observaciones;
        const recomendacionesHtml = recRef.current?.flush?.() ?? recomendaciones;
        return { observaciones: observacionesHtml, recomendaciones: recomendacionesHtml };
      },
    }),
    [observaciones, recomendaciones]
  );

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm">
      <header className="px-5 py-3 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600 rounded-t-xl">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {t('ports.ui.actas.observations.title')}
        </h3>
      </header>
      <div className="p-5 space-y-6">
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
          <p className="text-sm text-amber-900 dark:text-amber-100 italic">
            <strong className="not-italic">
              {t('ports.ui.actas.observations.instructionLabel')}
            </strong>{' '}
            {t('ports.ui.actas.observations.instruction')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('ports.ui.actas.observations.observations')}
            </p>
            <PuertosRichTextEditor
              ref={obsRef}
              value={observaciones}
              onChange={onObservaciones}
              readOnly={soloLectura}
              placeholder={t('ports.ui.actas.observations.observationsPlaceholder')}
              minHeight={160}
              syncKey={`${syncKey}-obs`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('ports.ui.actas.observations.recommendations')}
            </p>
            <PuertosRichTextEditor
              ref={recRef}
              value={recomendaciones}
              onChange={onRecomendaciones}
              readOnly={soloLectura}
              placeholder={t('ports.ui.actas.observations.recommendationsPlaceholder')}
              minHeight={160}
              syncKey={`${syncKey}-rec`}
            />
          </div>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <strong>{t('ports.ui.actas.observations.noteLabel')}</strong>{' '}
            {t('ports.ui.actas.observations.note')}
          </p>
        </div>
      </div>
    </section>
  );
});

export default memo(PuertosObservacionesActa);
