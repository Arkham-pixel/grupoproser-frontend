import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { flushSync } from 'react-dom';
import PuertosRichTextEditor from './PuertosRichTextEditor';
import {
  elegirHtmlMasCompleto,
  leerHtmlEditoresActaPuertos,
} from './puertosActaEditoresHtml.js';

/**
 * Observaciones / Recomendaciones del acta.
 * Mantiene copia local del HTML para que Grabar/PDF nunca lean un estado vacío.
 */
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
  const obsHtmlRef = useRef(observaciones || '');
  const recHtmlRef = useRef(recomendaciones || '');
  const syncKeySeen = useRef(syncKey);

  useEffect(() => {
    if (syncKeySeen.current === syncKey) return;
    syncKeySeen.current = syncKey;
    obsHtmlRef.current = observaciones || '';
    recHtmlRef.current = recomendaciones || '';
  }, [syncKey, observaciones, recomendaciones]);

  const onObservaciones = useCallback(
    (html) => {
      obsHtmlRef.current = html ?? '';
      onChange?.('observaciones', obsHtmlRef.current);
    },
    [onChange]
  );

  const onRecomendaciones = useCallback(
    (html) => {
      recHtmlRef.current = html ?? '';
      onChange?.('recomendaciones', recHtmlRef.current);
    },
    [onChange]
  );

  useImperativeHandle(ref, () => ({
    flush: () => {
      const desdeDom = leerHtmlEditoresActaPuertos();
      let fromObs = '';
      let fromRec = '';
      try {
        fromObs = obsRef.current?.getHtml?.() ?? '';
      } catch {
        /* ignore */
      }
      try {
        fromRec = recRef.current?.getHtml?.() ?? '';
      } catch {
        /* ignore */
      }

      const obs = elegirHtmlMasCompleto(
        desdeDom.observaciones,
        fromObs,
        obsHtmlRef.current,
        observaciones
      );
      const rec = elegirHtmlMasCompleto(
        desdeDom.recomendaciones,
        fromRec,
        recHtmlRef.current,
        recomendaciones
      );

      obsHtmlRef.current = obs;
      recHtmlRef.current = rec;

      flushSync(() => {
        onChange?.('observaciones', obs);
        onChange?.('recomendaciones', rec);
      });

      return { observaciones: obs, recomendaciones: rec };
    },
  }));

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
              editorId="observaciones"
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
              editorId="recomendaciones"
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

export default PuertosObservacionesActa;
