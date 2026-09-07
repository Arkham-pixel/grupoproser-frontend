import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBullhorn, FaTimes, FaSyncAlt } from 'react-icons/fa';
import { NOVEDADES, NOVEDADES_STORAGE_KEY } from '../config/novedades.js';

function idiomaDe(i18nLang) {
  return String(i18nLang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
}

function fueDescartada(version) {
  try {
    return localStorage.getItem(NOVEDADES_STORAGE_KEY) === version;
  } catch {
    return false;
  }
}

/**
 * Banner de novedades por versión de release.
 * Se muestra una vez hasta que el usuario lo cierra; vuelve a aparecer si cambia NOVEDADES_VERSION.
 */
export default function NovedadesBanner() {
  const { t, i18n } = useTranslation();
  const lang = idiomaDe(i18n.language);
  const version = NOVEDADES.version;

  const [visible, setVisible] = useState(() => {
    if (!version || !Array.isArray(NOVEDADES.items) || NOVEDADES.items.length === 0) {
      return false;
    }
    return !fueDescartada(version);
  });

  const titulo = useMemo(() => {
    const custom = NOVEDADES.titulo?.[lang] || NOVEDADES.titulo?.es;
    return custom || t('novedades.title');
  }, [lang, t]);

  const items = useMemo(
    () =>
      (NOVEDADES.items || [])
        .map((item) => (typeof item === 'string' ? item : item?.[lang] || item?.es || ''))
        .filter(Boolean),
    [lang]
  );

  if (!visible || items.length === 0) return null;

  const cerrar = () => {
    try {
      localStorage.setItem(NOVEDADES_STORAGE_KEY, version);
    } catch {
      /* ignore quota / private mode */
    }
    setVisible(false);
  };

  return (
    <div
      className="border-b border-sky-200 bg-sky-50 px-4 py-3 sm:px-6 dark:border-sky-800 dark:bg-sky-950/40"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl gap-3">
        <FaBullhorn className="mt-1 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">{titulo}</p>
              <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80">
                {t('novedades.versionLabel', { version })}
              </p>
            </div>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-lg p-1.5 text-sky-700 transition hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/60"
              title={t('novedades.dismiss')}
              aria-label={t('novedades.dismiss')}
            >
              <FaTimes />
            </button>
          </div>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-sky-900/90 sm:text-sm dark:text-sky-100/90">
            {items.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-200/80 bg-white/70 px-3 py-2 text-xs text-sky-900 sm:text-sm dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100">
            <FaSyncAlt className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            <div className="min-w-0 space-y-1 leading-relaxed">
              <p className="font-medium">{t('novedades.refreshIntro')}</p>
              <p>
                <span className="font-semibold">Windows:</span>{' '}
                {t('novedades.refreshWindows')}
              </p>
              <p>
                <span className="font-semibold">Mac:</span> {t('novedades.refreshMac')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
