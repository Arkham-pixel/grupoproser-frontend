import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FaChevronLeft, FaChevronRight, FaPrint } from 'react-icons/fa';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import { fetchAllCasosSura, getAlertasSura } from '../../services/segurosSuraService.js';
import { formatCurrency } from './segurosSuraHelpers.js';
import {
  calcularBoletinSemanalSura,
  inicioSemanaBogota,
  shiftSemana,
  sumarDiasUtc,
} from './boletinSemanalSuraHelpers.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressCardHeader,
  expressChartCard,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
  getFenixChartColor,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { ExpressMetricCard } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

const NOTES_KEY = 'segurosSura.boletinNotas';

function loadNotas(semanaKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
    return raw[semanaKey] || { novedadesExtra: '', apoyo: '' };
  } catch {
    return { novedadesExtra: '', apoyo: '' };
  }
}

function saveNotas(semanaKey, notas) {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
    raw[semanaKey] = notas;
    localStorage.setItem(NOTES_KEY, JSON.stringify(raw));
  } catch {
    /* ignore */
  }
}

function fmtPct(v) {
  return v == null ? '—' : `${v}%`;
}

function fmtDias(v) {
  return v == null ? '—' : `${Math.round(v * 10) / 10} d`;
}

export default function BoletinSemanalSegurosSura() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [casos, setCasos] = useState([]);
  const [alertasPayload, setAlertasPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offsetSemanas, setOffsetSemanas] = useState(0);
  const [notas, setNotas] = useState({ novedadesExtra: '', apoyo: '' });

  const lunesActual = useMemo(() => inicioSemanaBogota(), []);
  const desde = useMemo(
    () => shiftSemana(lunesActual, offsetSemanas),
    [lunesActual, offsetSemanas]
  );
  const hasta = useMemo(() => sumarDiasUtc(desde, 6), [desde]);
  const semanaKey = useMemo(() => desde.toISOString().slice(0, 10), [desde]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [lista, alertas] = await Promise.all([
          fetchAllCasosSura(),
          getAlertasSura().catch(() => null),
        ]);
        if (!cancelado) {
          setCasos(lista);
          setAlertasPayload(alertas);
        }
      } catch (err) {
        console.error('Error cargando boletín Sura:', err);
        if (!cancelado) {
          setError(err.message || t('segurosSura.boletin.loadError'));
          setCasos([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [t]);

  useEffect(() => {
    setNotas(loadNotas(semanaKey));
  }, [semanaKey]);

  const boletin = useMemo(
    () => calcularBoletinSemanalSura(casos, alertasPayload, { desde, hasta }),
    [casos, alertasPayload, desde, hasta]
  );

  const onNotasChange = (campo, valor) => {
    const next = { ...notas, [campo]: valor };
    setNotas(next);
    saveNotas(semanaKey, next);
  };

  const chartColors = useMemo(
    () => boletin.embudo.map((_, i) => getFenixChartColor(i, isDark)),
    [boletin.embudo, isDark]
  );

  const observacionesLlamada = boletin.observacionesLlamada || {
    items: [],
    totalComentarios: 0,
    totalCasos: 0,
  };

  const filasDetalle = useMemo(
    () => [
      ...boletin.detalle.reportados.map((c) => ({ tipo: 'reportado', c })),
      ...boletin.detalle.inspeccionados.map((c) => ({ tipo: 'inspección', c })),
      ...boletin.detalle.liquidados.map((c) => ({ tipo: 'liquidado', c })),
    ],
    [boletin.detalle]
  );

  if (loading) {
    return (
      <div className={`${expressScope} flex min-h-[40vh] items-center justify-center`}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={`${expressScope} print:bg-white`}>
      <div className={expressPageWrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between print:block">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Seguros Sura
            </p>
            <h1 className={expressPageTitle}>{t('segurosSura.boletin.title')}</h1>
            <p className={expressPageSubtitle}>
              {t('segurosSura.boletin.subtitle', { rango: boletin.rango.etiqueta })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              className={expressBtnGhost}
              onClick={() => setOffsetSemanas((n) => n - 1)}
              aria-label={t('segurosSura.boletin.prevWeek')}
            >
              <FaChevronLeft /> {t('segurosSura.boletin.prevWeek')}
            </button>
            <button
              type="button"
              className={expressBtnGhost}
              disabled={offsetSemanas === 0}
              onClick={() => setOffsetSemanas(0)}
            >
              {t('segurosSura.boletin.thisWeek')}
            </button>
            <button
              type="button"
              className={expressBtnGhost}
              disabled={offsetSemanas >= 0}
              onClick={() => setOffsetSemanas((n) => Math.min(0, n + 1))}
              aria-label={t('segurosSura.boletin.nextWeek')}
            >
              {t('segurosSura.boletin.nextWeek')} <FaChevronRight />
            </button>
            <button type="button" className={expressBtnPrimary} onClick={() => window.print()}>
              <FaPrint /> {t('segurosSura.boletin.print')}
            </button>
            <Link to="/sura/reporte" className={expressBtnGhost}>
              {t('nav.suraReport')}
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {/* KPIs operativos */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExpressMetricCard
            label={t('segurosSura.boletin.kpis.reported')}
            value={String(boletin.kpis.casosReportados)}
            hint={t('segurosSura.boletin.kpis.reportedHint')}
          />
          <ExpressMetricCard
            label={t('segurosSura.boletin.kpis.inspected')}
            value={String(boletin.kpis.casosInspeccionados)}
            hint={t('segurosSura.boletin.kpis.inspectedHint')}
          />
          <ExpressMetricCard
            label={t('segurosSura.boletin.kpis.settled')}
            value={String(boletin.kpis.casosLiquidados)}
            hint={t('segurosSura.boletin.kpis.settledHint')}
          />
          <ExpressMetricCard
            label={t('segurosSura.boletin.kpis.active')}
            value={`${boletin.kpis.casosActivos} / ${boletin.kpis.totalCasos}`}
            hint={t('segurosSura.boletin.kpis.activeHint')}
          />
        </section>

        {/* Valores */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExpressMetricCard
            label={t('segurosSura.boletin.kpis.reserve')}
            value={formatCurrency(boletin.kpis.reservaEstimada)}
            hint={t('segurosSura.boletin.kpis.reserveHint')}
          />
          <ExpressMetricCard
            label={t('segurosSura.boletin.kpis.claimedActive')}
            value={formatCurrency(boletin.kpis.valorReclamadoActivos)}
            hint={t('segurosSura.boletin.kpis.claimedActiveHint')}
          />
          <ExpressMetricCard
            label={t('segurosSura.boletin.kpis.claimedWeek')}
            value={formatCurrency(boletin.kpis.valorReclamadoSemana)}
            hint={t('segurosSura.boletin.kpis.claimedWeekHint')}
          />
          <ExpressMetricCard
            label={t('segurosSura.boletin.kpis.adjustedWeek')}
            value={formatCurrency(boletin.kpis.valorAjustadoSemana)}
            hint={t('segurosSura.boletin.kpis.adjustedWeekHint')}
          />
        </section>

        {/* ANS + embudo */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className={expressCard}>
            <div className={expressCardHeader}>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                {t('segurosSura.boletin.ans.title')}
              </h2>
              <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
                {t('segurosSura.boletin.ans.subtitle')}
              </p>
            </div>
            <div className={`${expressCardBody} grid gap-4 sm:grid-cols-2`}>
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('segurosSura.boletin.ans.inspection')}
                </p>
                <p className="mt-2 font-accent text-2xl font-bold text-gray-900 dark:text-white">
                  {fmtPct(boletin.ans.inspeccion.pct)}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {boletin.ans.inspeccion.ok}/{boletin.ans.inspeccion.total} · ≤{' '}
                  {boletin.ans.inspeccion.limiteDias} d · mediana{' '}
                  {fmtDias(boletin.ans.inspeccion.medianaDias)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('segurosSura.boletin.ans.settlement')}
                </p>
                <p className="mt-2 font-accent text-2xl font-bold text-gray-900 dark:text-white">
                  {fmtPct(boletin.ans.liquidacion.pct)}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {boletin.ans.liquidacion.ok}/{boletin.ans.liquidacion.total} · ≤{' '}
                  {boletin.ans.liquidacion.limiteDias} d · mediana{' '}
                  {fmtDias(boletin.ans.liquidacion.medianaDias)}
                </p>
              </div>
            </div>
          </div>

          <div className={expressChartCard}>
            <h2 className="mb-4 font-heading text-lg font-bold text-gray-900 dark:text-white">
              {t('segurosSura.boletin.funnel')}
            </h2>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={boletin.embudo} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="estado"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                    {boletin.embudo.map((_, i) => (
                      <Cell key={boletin.embudo[i].estado} fill={chartColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Observaciones de llamada */}
        <section className="grid gap-4 lg:grid-cols-5">
          <div className={`${expressChartCard} lg:col-span-3`}>
            <h2 className="mb-1 font-heading text-lg font-bold text-gray-900 dark:text-white">
              {t('segurosSura.boletin.callComments.title')}
            </h2>
            <p className="mb-4 font-body text-xs text-gray-500 dark:text-gray-400">
              {t('segurosSura.boletin.callComments.subtitle', {
                comentarios: observacionesLlamada.totalComentarios,
                casos: observacionesLlamada.totalCasos,
              })}
            </p>
            {observacionesLlamada.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('segurosSura.boletin.callComments.empty')}
              </p>
            ) : (
              <div
                className="w-full min-w-0"
                style={{
                  height: Math.min(
                    480,
                    Math.max(220, observacionesLlamada.items.length * 36 + 48)
                  ),
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={observacionesLlamada.items}
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="etiqueta"
                      width={180}
                      tick={{ fontSize: 10 }}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value) => [
                        value,
                        t('segurosSura.boletin.callComments.cases'),
                      ]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.comentario || ''
                      }
                    />
                    <Bar dataKey="cantidad" name="casos" radius={[0, 6, 6, 0]}>
                      {observacionesLlamada.items.map((_, i) => (
                        <Cell
                          key={observacionesLlamada.items[i].comentario}
                          fill={getFenixChartColor(i, isDark)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className={`${expressCard} lg:col-span-2`}>
            <div className={expressCardHeader}>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                {t('segurosSura.boletin.callComments.listTitle')}
              </h2>
            </div>
            <div className={`${expressCardBody} max-h-[480px] space-y-2 overflow-y-auto`}>
              {observacionesLlamada.items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('segurosSura.boletin.callComments.empty')}
                </p>
              ) : (
                observacionesLlamada.items.map((item) => (
                  <article
                    key={item.comentario}
                    className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.comentario}
                      </p>
                      <span className="shrink-0 rounded-full bg-fenix-primario/10 px-2 py-0.5 text-xs font-bold text-fenix-primario">
                        {item.cantidad}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {t('segurosSura.boletin.callComments.siniestros')}:{' '}
                      {item.siniestros.join(', ')}
                      {item.cantidad > item.siniestros.length ? '…' : ''}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Novedades + alertas */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className={expressCard}>
            <div className={expressCardHeader}>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                {t('segurosSura.boletin.news.title')}
              </h2>
            </div>
            <div className={expressCardBody}>
              {boletin.novedades.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('segurosSura.boletin.news.empty')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {boletin.novedades.map((n, idx) => (
                    <li
                      key={`${n.tipo}-${idx}`}
                      className="rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <span className="mr-2 text-xs font-semibold uppercase text-fenix-primario">
                        {n.tipo}
                      </span>
                      {n.texto}
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-4 block print:hidden">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('segurosSura.boletin.news.extra')}
                </span>
                <textarea
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200"
                  rows={3}
                  value={notas.novedadesExtra}
                  onChange={(e) => onNotasChange('novedadesExtra', e.target.value)}
                  placeholder={t('segurosSura.boletin.news.extraPlaceholder')}
                />
              </label>
              {notas.novedadesExtra && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {notas.novedadesExtra}
                </p>
              )}
            </div>
          </div>

          <div className={expressCard}>
            <div className={expressCardHeader}>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                {t('segurosSura.boletin.risks.title')}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('segurosSura.boletin.risks.summary', {
                  total: boletin.alertas.total,
                  alta: boletin.alertas.alta,
                  media: boletin.alertas.media,
                })}
              </p>
            </div>
            <div className={expressCardBody}>
              {boletin.alertas.items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('segurosSura.boletin.risks.empty')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {boletin.alertas.items.map((a, idx) => (
                    <li
                      key={`${a.consecutivo}-${idx}`}
                      className="rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            a.prioridad === 'ALTA'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                          }`}
                        >
                          {a.prioridad || 'MEDIA'}
                        </span>
                        <span className="font-semibold">{a.consecutivo || '—'}</span>
                        <span className="text-gray-500">{a.asegurado || ''}</span>
                      </div>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                        {a.mensaje || a.accion || a.nombre}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-4 block print:hidden">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('segurosSura.boletin.risks.support')}
                </span>
                <textarea
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200"
                  rows={3}
                  value={notas.apoyo}
                  onChange={(e) => onNotasChange('apoyo', e.target.value)}
                  placeholder={t('segurosSura.boletin.risks.supportPlaceholder')}
                />
              </label>
              {notas.apoyo && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  <strong>{t('segurosSura.boletin.risks.support')}:</strong> {notas.apoyo}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Detalle semanal compacto */}
        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {t('segurosSura.boletin.detail.title')}
            </h2>
          </div>
          <div className={`${expressCardBody} overflow-x-auto`}>
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 dark:border-gray-800">
                  <th className="px-2 py-2">{t('segurosSura.boletin.detail.type')}</th>
                  <th className="px-2 py-2">{t('segurosSura.fields.siniestro')}</th>
                  <th className="px-2 py-2">{t('segurosSura.fields.asegurado')}</th>
                  <th className="px-2 py-2">{t('segurosSura.fields.estado')}</th>
                  <th className="px-2 py-2">{t('segurosSura.fields.ciudad')}</th>
                </tr>
              </thead>
              <tbody>
                {filasDetalle.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-gray-500">
                      {t('segurosSura.boletin.detail.empty')}
                    </td>
                  </tr>
                ) : (
                  filasDetalle.map(({ tipo, c }, i) => (
                    <tr
                      key={`${tipo}-${c._id || c.consecutivo || i}`}
                      className="border-b border-gray-50 dark:border-gray-900"
                    >
                      <td className="px-2 py-2 capitalize">{tipo}</td>
                      <td className="px-2 py-2">{c.siniestro || c.consecutivo || '—'}</td>
                      <td className="px-2 py-2">{c.asegurado || c.tomador || '—'}</td>
                      <td className="px-2 py-2">{c.estado || '—'}</td>
                      <td className="px-2 py-2">{c.ciudad || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
