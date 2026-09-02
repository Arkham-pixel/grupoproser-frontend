import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { casoTieneArchivosBbvaCat } from './bbvaCatHelpers.js';

export default function BbvaCatCasoPicker({
  casos = [],
  busqueda = '',
  onBusqueda,
  onSelect,
  hint,
  casoIdActivo = '',
  soloConArchivosInicial = false,
}) {
  const { t } = useTranslation();
  const [soloConArchivos, setSoloConArchivos] = useState(soloConArchivosInicial);

  const { conArchivo, total } = useMemo(() => {
    let con = 0;
    casos.forEach((c) => {
      if (casoTieneArchivosBbvaCat(c)) con += 1;
    });
    return { conArchivo: con, total: casos.length };
  }, [casos]);

  const filtrados = useMemo(() => {
    const q = String(busqueda || '')
      .trim()
      .toLowerCase();
    const lista = [...casos]
      .filter((c) => {
        if (soloConArchivos && !casoTieneArchivosBbvaCat(c)) return false;
        if (!q) return true;
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
      })
      .sort((a, b) => {
        const da = Number(a.nArchivos) || a.archivos?.length || 0;
        const db = Number(b.nArchivos) || b.archivos?.length || 0;
        if (db !== da) return db - da;
        return String(a.zc || a.siniestro || '').localeCompare(
          String(b.zc || b.siniestro || ''),
          'es',
          { numeric: true }
        );
      });
    return lista;
  }, [casos, busqueda, soloConArchivos]);

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      {hint ? <p>{hint}</p> : null}
      <p className="text-xs font-semibold">
        {total} casos · {conArchivo} con documentos
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-xs font-semibold ${
            soloConArchivos
              ? 'bg-[#004481] text-white'
              : 'border border-amber-300 bg-white text-gray-700 dark:border-amber-800 dark:bg-gray-950 dark:text-gray-200'
          }`}
          onClick={() => setSoloConArchivos(true)}
        >
          Con documentos ({conArchivo})
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-xs font-semibold ${
            !soloConArchivos
              ? 'bg-[#004481] text-white'
              : 'border border-amber-300 bg-white text-gray-700 dark:border-amber-800 dark:bg-gray-950 dark:text-gray-200'
          }`}
          onClick={() => setSoloConArchivos(false)}
        >
          Todos ({total})
        </button>
      </div>
      <label className="block font-semibold text-amber-950 dark:text-amber-50">
        {t('common.search')}
        <input
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda?.(e.target.value)}
          placeholder="ZC, STRO, asegurado, ciudad…"
          className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-body text-sm text-gray-800 dark:border-amber-800 dark:bg-gray-950 dark:text-gray-100"
        />
      </label>
      {filtrados.length > 0 ? (
        <ul className="max-h-72 overflow-auto rounded-lg border border-amber-200 bg-white dark:border-amber-800 dark:bg-gray-950">
          {filtrados.map((c) => {
            const n = Number(c.nArchivos) || (Array.isArray(c.archivos) ? c.archivos.length : 0);
            const activo = String(c._id) === String(casoIdActivo);
            return (
              <li key={c._id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-amber-100 dark:hover:bg-amber-950 ${
                    activo
                      ? 'bg-amber-100 font-semibold text-[#004481] dark:bg-amber-950 dark:text-amber-50'
                      : 'text-gray-800 dark:text-gray-100'
                  }`}
                  onClick={() => onSelect?.(c)}
                >
                  <span>
                    {[c.consecutivo, c.zc || c.siniestro, c.asegurado, c.ciudad]
                      .filter(Boolean)
                      .join(' · ') || c._id}
                  </span>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-50">
                    {n} doc{n === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs opacity-80">
          {soloConArchivos
            ? 'No hay casos con documentos en esta búsqueda. Pruebe “Todos” o busque por ZC/STRO.'
            : t('bbvaCat.report.noCases')}
        </p>
      )}
    </div>
  );
}
