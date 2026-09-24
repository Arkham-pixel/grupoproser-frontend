import React, { useMemo } from 'react';

/**
 * Franjas independientes por estado: etiqueta, cantidad, % y barra proporcional.
 * El cuello de botella (máx. cantidad > 0) se marca con acento corporativo.
 */
export default function EstadoFranjas({
  titulo,
  subtitulo,
  items = [],
  total,
  onSelect,
  emptyLabel = 'Sin datos',
}) {
  const filas = useMemo(() => {
    const lista = Array.isArray(items) ? items : [];
    const base = Number(total);
    const denom =
      Number.isFinite(base) && base > 0
        ? base
        : lista.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
    const max = Math.max(0, ...lista.map((it) => Number(it.cantidad) || 0));
    return lista.map((it) => {
      const cantidad = Number(it.cantidad) || 0;
      const pct = denom > 0 ? Math.round((cantidad / denom) * 100) : 0;
      const ancho = denom > 0 ? Math.round((cantidad / denom) * 100) : 0;
      const esCuello = max > 0 && cantidad === max;
      return {
        clave: it.clave ?? it.label,
        label: it.label,
        cantidad,
        pct,
        ancho,
        hint: it.hint,
        accent: Boolean(it.accent) || esCuello,
      };
    });
  }, [items, total]);

  const clickable = typeof onSelect === 'function';

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-fenix-primario">
          {titulo}
        </h3>
        {subtitulo ? <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitulo}</p> : null}
      </div>

      {filas.length === 0 ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filas.map((fila) => {
            const content = (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`min-w-0 truncate text-[11px] font-medium uppercase tracking-wide ${
                      fila.accent ? 'text-fenix-primario' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {fila.label}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {fila.cantidad}
                    </span>
                    <span className="ml-1.5 text-xs text-gray-500">{fila.pct}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full rounded-full ${
                      fila.accent ? 'bg-fenix-primario' : 'bg-gray-400 dark:bg-gray-500'
                    }`}
                    style={{ width: `${Math.max(fila.ancho, fila.cantidad > 0 ? 2 : 0)}%` }}
                  />
                </div>
                {fila.hint ? (
                  <p className="mt-1 text-[10px] leading-snug text-gray-500">{fila.hint}</p>
                ) : null}
              </>
            );

            return (
              <li key={fila.clave}>
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onSelect(fila.clave, fila)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition hover:border-fenix-primario/50 hover:bg-red-50/40 dark:hover:bg-red-950/20 ${
                      fila.accent
                        ? 'border-fenix-borde bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
                        : 'border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-950/40'
                    }`}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    className={`rounded-lg border px-3 py-2.5 ${
                      fila.accent
                        ? 'border-fenix-borde bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
                        : 'border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-950/40'
                    }`}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Resumen gerencial: salud de cartera + hallazgos + alertas.
 */
export function ResumenGerencial({
  titulo = 'Vista gerencial',
  hallazgosTitulo = 'Hallazgos',
  lineas = [],
  hallazgos = [],
  alertas = [],
  onAlertaClick,
}) {
  return (
    <section className="rounded-xl border border-fenix-borde/70 bg-gradient-to-br from-white to-red-50/40 p-4 dark:border-red-900/40 dark:from-gray-900 dark:to-red-950/20">
      <h2 className="font-heading text-base font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>

      {lineas.length > 0 ? (
        <p className="mt-2 font-body text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {lineas.filter(Boolean).join(' · ')}
        </p>
      ) : null}

      {hallazgos.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{hallazgosTitulo}</p>
          <ul className="mt-1.5 space-y-1">
            {hallazgos.map((h) => (
              <li key={h} className="font-body text-sm text-gray-800 dark:text-gray-200">
                — {h}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {alertas.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {alertas.map((a) => {
            const clickable = typeof onAlertaClick === 'function' && a.filtro != null;
            const className =
              'inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100';
            if (clickable) {
              return (
                <button
                  key={a.id || a.label}
                  type="button"
                  onClick={() => onAlertaClick(a)}
                  className={`${className} transition hover:border-amber-400`}
                >
                  {a.label}
                </button>
              );
            }
            return (
              <span key={a.id || a.label} className={className}>
                {a.label}
              </span>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Tarjeta independiente: total de un bloque de estados + desglose «cuál es cuál».
 */
export function TarjetaSumaBloque({
  titulo,
  subtitulo,
  desglose = [],
  totalCartera = 0,
  onSelectTotal,
  onSelectItem,
}) {
  const filas = Array.isArray(desglose) ? desglose : [];
  const total = filas.reduce((acc, f) => acc + (Number(f.cantidad) || 0), 0);
  const pctCartera = totalCartera > 0 ? Math.round((total / totalCartera) * 100) : 0;

  return (
    <section className="rounded-xl border border-fenix-borde/70 bg-white p-4 dark:border-red-900/40 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-fenix-primario">
            {titulo}
          </h3>
          {subtitulo ? (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitulo}</p>
          ) : null}
        </div>
        {typeof onSelectTotal === 'function' ? (
          <button
            type="button"
            onClick={() => onSelectTotal(filas.map((f) => f.clave || f.label))}
            className="rounded-lg border border-fenix-borde bg-red-50/60 px-3 py-2 text-left transition hover:border-fenix-primario/50 dark:border-red-900/40 dark:bg-red-950/25"
          >
            <span className="block text-[10px] font-medium uppercase tracking-wide text-fenix-primario">
              Total bloque
            </span>
            <span className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {total}
            </span>
            <span className="ml-1.5 text-xs text-gray-500">{pctCartera}% cartera</span>
          </button>
        ) : (
          <div className="rounded-lg border border-fenix-borde bg-red-50/60 px-3 py-2 dark:border-red-900/40 dark:bg-red-950/25">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-fenix-primario">
              Total bloque
            </span>
            <span className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {total}
            </span>
            <span className="ml-1.5 text-xs text-gray-500">{pctCartera}% cartera</span>
          </div>
        )}
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filas.map((f) => {
          const cantidad = Number(f.cantidad) || 0;
          const pctBloque = total > 0 ? Math.round((cantidad / total) * 100) : 0;
          const clave = f.clave || f.label;
          const clickable = typeof onSelectItem === 'function';
          const inner = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  {f.label}
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {cantidad}
                  </span>
                  <span className="ml-1 text-[10px] text-gray-500">{pctBloque}% del bloque</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gray-400 dark:bg-gray-500"
                  style={{ width: `${Math.max(pctBloque, cantidad > 0 ? 2 : 0)}%` }}
                />
              </div>
            </>
          );
          return (
            <li key={clave}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelectItem(clave, f)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-left transition hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-950/40"
                >
                  {inner}
                </button>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-950/40">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
