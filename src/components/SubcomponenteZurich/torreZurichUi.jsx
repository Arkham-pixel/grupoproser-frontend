import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  expressChartCard,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { ExpressChartPlot } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { formatCurrency } from './zurichHelpers.js';

export const INK_LIGHT = '#1E1E1E';
export const INK_DARK = '#C4C4C4';

export const truncar = (valor, max = 28) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return '—';
  return texto.length > max ? `${texto.slice(0, max - 3)}…` : texto;
};

export function tintaBarras(isDark) {
  return isDark ? INK_DARK : INK_LIGHT;
}

export function formatEjeCop(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} mil M`;
  if (v >= 1e6) return `${Math.round(v / 1e6)} MM`;
  if (v >= 1e3) return `${Math.round(v / 1e3)} mil`;
  return String(v);
}

export function colorCubeta(color, isDark) {
  const mapa = {
    ok: isDark ? '#64748B' : '#94A3B8',
    watch: isDark ? '#FBBF24' : '#D97706',
    warn: isDark ? '#FB923C' : '#EA580C',
    alert: isDark ? '#F87171' : '#DC2626',
  };
  return mapa[color] || (isDark ? INK_DARK : INK_LIGHT);
}

export function colorAgingId(id, isDark) {
  const mapa = {
    '0-7': isDark ? '#64748B' : '#94A3B8',
    '8-15': isDark ? '#7B8FA6' : '#64748B',
    '16-30': isDark ? '#FBBF24' : '#D97706',
    '31-45': isDark ? '#FB923C' : '#EA580C',
    '46+': isDark ? '#F87171' : '#DC2626',
  };
  return mapa[id] || tintaBarras(isDark);
}

export function claseNivelAlerta(nivel) {
  if (nivel === 'critico') return 'text-fenix-primario';
  if (nivel === 'alto') return 'text-amber-700 dark:text-amber-400';
  return 'text-gray-700 dark:text-gray-300';
}

export function tooltipChartStyle(isDark) {
  return {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };
}

export function alternarValor(actual, siguiente) {
  return actual === siguiente ? '' : siguiente;
}

export function HeroKpi({ label, value, hint, tone, title }) {
  const valorClase =
    tone === 'danger'
      ? 'text-fenix-primario'
      : tone === 'warn'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-gray-900 dark:text-white';
  return (
    <div className="min-w-0 overflow-hidden px-4 py-4 sm:px-5">
      <p className="truncate font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p
        className={`mt-2 font-accent text-xl font-semibold tabular-nums leading-tight tracking-tight whitespace-normal break-words sm:text-2xl lg:text-3xl ${valorClase}`}
        title={title || (typeof value === 'string' ? value : undefined)}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 line-clamp-2 font-body text-xs leading-snug text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function ChartCard({ title, hint, empty, children, action }) {
  const { t } = useTranslation();
  return (
    <div className={`${expressChartCard} min-w-0`}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        {action}
      </div>
      {hint ? <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">{hint}</p> : null}
      {empty ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">{t('zurich.listadoDashboard.noData')}</p>
      ) : (
        children
      )}
    </div>
  );
}

export function HorizontalBars({
  title,
  hint,
  data = [],
  dataKey = 'cantidad',
  nameKey = 'nombre',
  tickColor,
  gridStroke,
  tooltipStyle,
  seriesName,
  fill,
  formatTick,
  formatValue,
  mostrarValor = false,
  onBarClick,
}) {
  const vacio = !data.some((d) => Number(d?.[dataKey]) > 0);
  return (
    <ChartCard title={title} hint={hint} empty={vacio}>
      <ExpressChartPlot height={Math.max(280, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: mostrarValor ? 36 : 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: tickColor, fontSize: 11 }}
            tickFormatter={formatTick}
          />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={140}
            interval={0}
            tick={{ fill: tickColor, fontSize: 10 }}
            tickFormatter={(v) => truncar(v, 22)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => (formatValue ? formatValue(value) : value)}
          />
          <Bar
            dataKey={dataKey}
            name={seriesName}
            fill={fill}
            radius={[0, 4, 4, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(entry) => onBarClick?.(entry?.[nameKey] ?? entry?.payload?.[nameKey])}
          >
            {mostrarValor ? (
              <LabelList dataKey={dataKey} position="right" style={{ fontSize: 11, fill: tickColor }} />
            ) : null}
          </Bar>
        </BarChart>
      </ExpressChartPlot>
    </ChartCard>
  );
}

export function DualAxisChart({
  title,
  hint,
  data = [],
  tickColor,
  gridStroke,
  tooltipStyle,
  isDark,
  casosLabel,
  reservaLabel,
  onBarClick,
}) {
  const vacio = !data.some((d) => d.cantidad > 0 || d.reserva > 0);
  return (
    <ChartCard title={title} hint={hint} empty={vacio}>
      <ExpressChartPlot height={Math.max(300, data.length * 40)}>
        <ComposedChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis type="number" xAxisId="casos" allowDecimals={false} tick={{ fill: tickColor, fontSize: 10 }} />
          <XAxis
            type="number"
            xAxisId="reserva"
            orientation="top"
            tick={{ fill: tickColor, fontSize: 10 }}
            tickFormatter={formatEjeCop}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            width={140}
            interval={0}
            tick={{ fill: tickColor, fontSize: 10 }}
            tickFormatter={(v) => truncar(v, 22)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) =>
              name === reservaLabel ? formatCurrency(value) : value
            }
          />
          <Legend />
          <Bar
            xAxisId="casos"
            dataKey="cantidad"
            name={casosLabel}
            fill={tintaBarras(isDark)}
            radius={[0, 4, 4, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(entry) => {
              const nombre = entry?.nombre ?? entry?.payload?.nombre;
              if (!nombre || nombre === 'Otros') return;
              onBarClick?.(nombre);
            }}
          />
          <Line
            xAxisId="reserva"
            dataKey="reserva"
            name={reservaLabel}
            stroke="#DC2626"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ExpressChartPlot>
    </ChartCard>
  );
}

export function HeatmapAns({ estados, cubetas, celdas, isDark, etiquetaEstado, onCelda, activo }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-semibold text-gray-500 dark:bg-[#1A1A1A] dark:text-gray-400">
              {' '}
            </th>
            {cubetas.map((c) => (
              <th key={c.id} className="px-1 py-2 text-center font-semibold text-gray-500 dark:text-gray-400">
                {c.id} d
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {estados.map((estado) => (
            <tr key={estado}>
              <td className="sticky left-0 z-10 max-w-[140px] truncate bg-white px-2 py-1 font-medium text-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200">
                {etiquetaEstado(estado)}
              </td>
              {cubetas.map((cubeta) => {
                const celda = celdas[`${estado}|${cubeta.id}`];
                const n = celda?.cantidad || 0;
                const seleccionado = activo?.estado === estado && activo?.cubetaId === cubeta.id;
                const bg = n === 0 ? 'transparent' : colorCubeta(cubeta.color, isDark);
                return (
                  <td key={cubeta.id} className="p-0.5">
                    <button
                      type="button"
                      disabled={n === 0}
                      onClick={() => onCelda?.(estado, cubeta.id)}
                      title={n ? `${n} · ${formatCurrency(celda.reserva || 0)}` : ''}
                      className={`flex h-9 w-full min-w-[2.5rem] items-center justify-center rounded text-[11px] font-semibold tabular-nums ${
                        n === 0
                          ? 'cursor-default text-gray-300 dark:text-gray-700'
                          : 'text-white'
                      } ${seleccionado ? 'ring-2 ring-fenix-primario ring-offset-1' : ''}`}
                      style={{ backgroundColor: n === 0 ? undefined : bg }}
                    >
                      {n || ''}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnsBloques({ titulo, hint, data, limite, onSelect, activo, td }) {
  const items = [
    { id: 'dentro', tone: '' },
    { id: 'proximo', tone: 'warn' },
    { id: 'vencido', tone: 'danger' },
    { id: 'sinDato', tone: '' },
  ];
  const total = data?.total || 0;
  return (
    <ChartCard title={titulo} hint={hint} empty={!total}>
      <p className="mb-3 font-body text-xs text-gray-500 dark:text-gray-400">
        {td('ans.limitHint', { days: limite, proximo: Math.ceil((limite || 0) * 0.8) })}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const n = data?.[item.id] || 0;
          const seleccionado = activo === item.id;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              className={`rounded-xl border px-3 py-3 text-left dark:border-gray-800 ${
                seleccionado ? 'ring-2 ring-fenix-primario' : 'border-gray-100 bg-gray-50 dark:bg-gray-900/40'
              }`}
            >
              <p
                className={`font-accent text-xl font-semibold tabular-nums ${
                  item.tone === 'danger'
                    ? 'text-fenix-primario'
                    : item.tone === 'warn'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-gray-900 dark:text-white'
                }`}
              >
                {n}
              </p>
              <p className="mt-1 font-body text-xs font-semibold leading-snug text-gray-800 dark:text-gray-200">
                {td(`ans.${item.id}`)}
              </p>
              <p className="mt-0.5 font-body text-[11px] text-gray-500 dark:text-gray-400">
                {td('ans.pctOf', { pct })}
              </p>
            </button>
          );
        })}
      </div>
    </ChartCard>
  );
}
