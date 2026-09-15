import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import { expressChartCard } from '../SubcomponenteExpress/expressFenixUi.js';
import { ExpressChartPlot } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { ESTADO_ALLIANZ_PAGO, TIPOS_POLIZA_ALLIANZ, formatCurrency } from './allianzHelpers.js';
import {
  colorEjeAllianz,
  colorGrillaAllianz,
  tooltipAllianzStyle,
  truncarAllianz,
} from './tableroAllianzHelpers.js';

export function KpiTarjeta({ label, value, hint, title, share = 0, split }) {
  const pct = Math.max(0, Math.min(100, Number(share) || 0));
  return (
    <article className="min-w-0 rounded-2xl border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-[#1A1A1A] sm:px-5">
      <p className="truncate font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p
        className="mt-2 font-accent text-2xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white lg:text-3xl"
        title={title || (typeof value === 'string' ? value : undefined)}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 font-body text-xs leading-snug text-gray-500 dark:text-gray-400">{hint}</p> : null}
      {split ? (
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" title={split.title}>
          <span className="h-full bg-gray-900 dark:bg-gray-200" style={{ width: `${split.openPct}%` }} />
          <span className="h-full bg-gray-300 dark:bg-gray-600" style={{ width: `${split.closedPct}%` }} />
        </div>
      ) : (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-gray-900 dark:bg-gray-200" style={{ width: `${pct}%` }} />
        </div>
      )}
    </article>
  );
}

function ChartShellAllianz({ title, hint, empty, emptyLabel, children }) {
  return (
    <section className={`${expressChartCard} min-w-0`}>
      <h3 className="font-heading text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {hint ? <p className="mt-1 mb-4 font-body text-sm text-gray-500 dark:text-gray-400">{hint}</p> : <div className="mb-4" />}
      {empty ? <p className="font-body text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p> : children}
    </section>
  );
}

export function BarrasCasosAllianz({
  title,
  hint,
  emptyLabel,
  data = [],
  isDark,
  seriesName,
  onBarClick,
  colorFor,
  yWidth = 118,
}) {
  const vacio = !data.some((d) => Number(d.cantidad) > 0);
  const tickColor = colorEjeAllianz(isDark);
  return (
    <ChartShellAllianz title={title} hint={hint} empty={vacio} emptyLabel={emptyLabel}>
      <ExpressChartPlot height={Math.max(280, data.length * 38)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colorGrillaAllianz(isDark)} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={yWidth}
            interval={0}
            tick={{ fill: tickColor, fontSize: 11 }}
            tickFormatter={(v) => truncarAllianz(v, 18)}
          />
          <Tooltip
            contentStyle={tooltipAllianzStyle(isDark)}
            formatter={(value, _name, item) => {
              const reserva = Number(item?.payload?.reserva) || 0;
              if (!reserva) return [value, seriesName];
              return [`${value} · ${formatCurrency(reserva)}`, seriesName];
            }}
            cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
          />
          <Bar
            dataKey="cantidad"
            name={seriesName}
            radius={[0, 6, 6, 0]}
            maxBarSize={22}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(entry) => {
              const payload = entry?.payload ?? entry;
              const nombre = payload?.clave ?? payload?.nombre;
              if (nombre) onBarClick(nombre);
            }}
          >
            {data.map((fila) => (
              <Cell
                key={fila.clave || fila.nombre}
                fill={colorFor(fila.clave || fila.nombre, isDark)}
                opacity={fila.activo === false ? 0.35 : 1}
              />
            ))}
            <LabelList dataKey="cantidad" position="right" style={{ fontSize: 11, fill: tickColor, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ExpressChartPlot>
    </ChartShellAllianz>
  );
}

export function PillEstadoAllianz({ estado, etiqueta, cerrado }) {
  const pago = estado === ESTADO_ALLIANZ_PAGO;
  const clase = cerrado
    ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    : pago
      ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
  return (
    <span className={`inline-flex max-w-full truncate rounded-full px-2 py-0.5 font-body text-[11px] font-semibold ${clase}`}>
      {etiqueta || estado || '—'}
    </span>
  );
}

export function PillPolizaAllianz({ nombre, vacioLabel }) {
  if (!nombre) {
    return <span className="font-body text-xs text-gray-400">{vacioLabel}</span>;
  }
  const canon = TIPOS_POLIZA_ALLIANZ.includes(nombre);
  return (
    <span
      className={`inline-flex max-w-full truncate rounded-full px-2 py-0.5 font-body text-[11px] font-semibold ${
        canon
          ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
          : 'bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400'
      }`}
    >
      {nombre}
    </span>
  );
}
