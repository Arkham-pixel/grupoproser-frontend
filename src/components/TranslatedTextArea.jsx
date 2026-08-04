import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';

/**
 * Campo de texto con vista previa editable de la traducción.
 * El valor original no se modifica; el padre decide si persiste la traducción.
 */
export default function TranslatedTextArea({
  value = '',
  onChange,
  translation = '',
  onTranslationChange,
  label,
  rows = 4,
  debounceMs = 700,
  ...props
}) {
  const { t } = useTranslation();
  const [translated, setTranslated] = useState(translation);
  const [status, setStatus] = useState('idle');
  const controllerRef = useRef(null);

  useEffect(() => setTranslated(translation), [translation]);

  useEffect(() => {
    const source = String(value || '').trim();
    if (!source) {
      setTranslated('');
      onTranslationChange?.('');
      return undefined;
    }

    const timer = setTimeout(async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setStatus('loading');
      try {
        const { data } = await api.post('/api/chatgpt/translate',
          { text: source, source: 'es', target: 'en' },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setTranslated(data.translation);
          onTranslationChange?.(data.translation);
          setStatus('idle');
        }
      } catch (error) {
        if (error.code !== 'ERR_CANCELED' && error.name !== 'CanceledError') setStatus('error');
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controllerRef.current?.abort();
    };
  }, [value, debounceMs, onTranslationChange]);

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <textarea value={value} onChange={(event) => onChange?.(event.target.value)} rows={rows} {...props} />
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
          <span>{t('translation.preview')}</span>
          {status === 'loading' && <span className="text-xs text-gray-500">{t('translation.translating')}</span>}
        </div>
        <textarea
          value={translated}
          onChange={(event) => {
            setTranslated(event.target.value);
            onTranslationChange?.(event.target.value);
          }}
          rows={rows}
          className="w-full rounded border border-gray-300 bg-gray-50 p-2"
          aria-label={t('translation.preview')}
        />
        {status === 'error' && <p className="mt-1 text-xs text-red-600">{t('translation.failed')}</p>}
        <p className="mt-1 text-xs text-gray-500">{t('translation.editableHint')}</p>
      </div>
    </div>
  );
}
