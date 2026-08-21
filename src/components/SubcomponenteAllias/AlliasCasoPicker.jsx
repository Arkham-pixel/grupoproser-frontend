import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export default function AlliasCasoPicker({
  casos = [],
  busqueda = '',
  onBusqueda,
  onSelect,
  hint,
}) {
  const { t } = useTranslation();
  const filtrados = useMemo(() => {
    const q = String(busqueda || '')
      .trim()
      .toLowerCase();
    if (!q) return casos;
    return casos.filter((c) => {
      const blob = [
        c.consecutivo,
        c.asegurado,
        c.tomador,
        c.siniestro,
        c.identificacion,
        c.ciudad,
        c.numeroPoliza,
        c.zc,
      ]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return blob.includes(q);
    });
  }, [casos, busqueda]);

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      {hint ? <p>{hint}</p> : null}
      <label className="block font-semibold text-amber-950 dark:text-amber-50">
        {t('common.search')}
        <input
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda?.(e.target.value)}
          placeholder={t('allias.report.searchPlaceholder')}
          className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-body text-sm text-gray-800 dark:border-amber-800 dark:bg-gray-950 dark:text-gray-100"
        />
      </label>
      {filtrados.length > 0 ? (
        <ul className="max-h-48 overflow-auto rounded-lg border border-amber-200 bg-white dark:border-amber-800 dark:bg-gray-950">
          {filtrados.slice(0, 12).map((c) => (
            <li key={c._id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-amber-100 dark:text-gray-100 dark:hover:bg-amber-950"
                onClick={() => onSelect?.(c)}
              >
                {[c.consecutivo, c.asegurado, c.siniestro, c.ciudad].filter(Boolean).join(' · ') ||
                  c._id}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs opacity-80">{t('allias.report.noCases')}</p>
      )}
    </div>
  );
}
