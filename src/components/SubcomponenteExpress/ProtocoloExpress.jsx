import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import { FaTable } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { fetchAllSiniestrosExpress } from '../../services/expressService.js';
import { obtenerProtocoloExpress } from '../../services/alertasExpressService.js';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import {
  FECHA_DESDE_DEFAULT_PROTOCOLO_EXPRESS,
  FECHA_DESDE_DEFAULT_PROTOCOLO_EXPRESS_LABEL,
  FECHA_INICIO_PROTOCOLO_EXPRESS_LABEL,
  INDICADORES_PROTOCOLO_EXPRESS_DEF,
  NOTAS_PROTOCOLO_EXPRESS,
  PROTOCOLO_EXPRESS_DOCUMENTO,
  PROTOCOLO_EXPRESS_OBJETIVO,
  RESUMEN_PLAZOS_PROTOCOLO_EXPRESS,
  obtenerProtocoloExpressPorDefecto,
  plazoObjetivoIndicadorExpress,
} from '../../config/protocoloExpressDefaults.js';
import {
  agruparCumplimientoExpress,
  calcularCumplimientoExpressGlobales,
  claseColorCumplimiento,
  colorBarraCumplimiento,
  datosChartCumplimientoExpress,
  formatearPorcentajeCumplimiento,
} from '../../utils/expressProtocoloCumplimientoUtils.js';
import {
  agruparIndicadoresExpress,
  calcularIndicadoresExpressGlobales,
  datosChartEstadosCerradosExpress,
  filtrarCasosPorAvisoExpress,
  filtrarCasosProtocoloExpress,
  formatearDiasHabilesPromedio,
  resolverGrupoAseguradoraExpress,
  resolverGrupoResponsableExpress,
} from '../../utils/expressProtocoloIndicadoresUtils.js';
import {
  expressBtnSecondary,
  expressCard,
  expressPageWrap,
  expressScope,
  expressSectionTitle,
  getFenixChartColor,
} from './expressFenixUi.js';
import {
  Campo,
  ExpressChartPlot,
  ExpressFilterSection,
  ExpressMetricCard,
  ExpressPageHeader,
  InputFenix,
  SelectFenix,
} from './ExpressUiBlocks.jsx';
import { useExpressCatalogos } from './expressHelpers.js';

const expressRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]';

const ETAPAS_DESGLOSE = INDICADORES_PROTOCOLO_EXPRESS_DEF.filter((item) => item.etapaId).map(
  (def, index) => ({
    clave: def.clave,
    muestra: def.muestra,
    label: def.label,
    desdeLegible: def.desdeLegible || '',
    hastaLegible: def.hastaLegible || '',
    plazoLegible: def.plazoLegible || '',
    orden: index + 1,
  })
);

const VISTAS = [
  { value: 'responsable', label: 'Por responsable' },
  { value: 'aseguradora', label: 'Por aseguradora' },
];

function ChartCard({ title, children }) {
  return (
    <div className={`${expressCard} min-w-0 p-4`}>
      <h3 className="mb-4 font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

function TarjetaEtapa({ etapa, valor, muestra, cumplimiento, protocolo }) {
  return (
    <div className="min-w-[11.5rem] shrink-0 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#1A1A1A]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-fenix-primario">
        Paso {etapa.orden}
      </p>
      <p className="mt-1 text-xs font-semibold text-gray-900 dark:text-white">
        De {etapa.desdeLegible} a {etapa.hastaLegible}
      </p>
      <p className="mt-1 text-[11px] text-gray-500">
        Plazo: {plazoObjetivoIndicadorExpress(etapa.clave, protocolo) || etapa.plazoLegible}
      </p>
      <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
        {formatearDiasHabilesPromedio(valor)}
      </p>
      <p className={`mt-1 text-sm ${claseColorCumplimiento(cumplimiento?.porcentaje)}`}>
        {formatearPorcentajeCumplimiento(cumplimiento?.porcentaje)}
      </p>
      <p className="mt-1 text-[11px] text-gray-500">
        {(cumplimiento?.cumplidos ?? 0)}/{(cumplimiento?.evaluables ?? 0)} · {muestra || 0} medido(s)
      </p>
    </div>
  );
}

export default function ProtocoloExpress() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [siniestros, setSiniestros] = useState([]);
  const [protocolo, setProtocolo] = useState(() => obtenerProtocoloExpressPorDefecto());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaDesde, setFechaDesde] = useState(FECHA_DESDE_DEFAULT_PROTOCOLO_EXPRESS);
  const [fechaHasta, setFechaHasta] = useState('');
  const [vista, setVista] = useState('responsable');

  const {
    loadingCatalogos,
    obtenerNombreResponsable,
    obtenerNombreAseguradora,
    obtenerNombreEstado,
  } = useExpressCatalogos();

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const [casos, protoRes] = await Promise.all([
          fetchAllSiniestrosExpress(),
          obtenerProtocoloExpress().catch(() => null),
        ]);
        if (cancelado) return;
        setSiniestros(Array.isArray(casos) ? casos : []);
        if (protoRes?.data?.etapas?.length) {
          setProtocolo(protoRes.data);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || t('express.protocol.loadError'));
          setSiniestros([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [t]);

  /** Universo tipo reporte: aviso en rango (incluye Desistido / Liquidar / Objetado…). */
  const casosPorAviso = useMemo(
    () => filtrarCasosPorAvisoExpress(siniestros, fechaDesde, fechaHasta),
    [siniestros, fechaDesde, fechaHasta]
  );

  /** Universo ANS: desde julio + sin Desistido/Complex. */
  const casosPeriodo = useMemo(
    () => filtrarCasosProtocoloExpress(siniestros, fechaDesde, fechaHasta),
    [siniestros, fechaDesde, fechaHasta]
  );

  const indicadoresCerrados = useMemo(
    () => calcularIndicadoresExpressGlobales(casosPorAviso, obtenerNombreEstado),
    [casosPorAviso, obtenerNombreEstado]
  );

  const chartEstadosCerrados = useMemo(
    () => datosChartEstadosCerradosExpress(casosPorAviso, obtenerNombreEstado),
    [casosPorAviso, obtenerNombreEstado]
  );

  const porcentajeCierre = useMemo(() => {
    const total = indicadoresCerrados.totalCasos || 0;
    const cerrados = indicadoresCerrados.cerradosPeriodo || 0;
    if (total <= 0) return null;
    return (cerrados / total) * 100;
  }, [indicadoresCerrados.totalCasos, indicadoresCerrados.cerradosPeriodo]);

  const chartEstadosCerradosConPct = useMemo(() => {
    const total = indicadoresCerrados.totalCasos || 0;
    return chartEstadosCerrados.map((item) => ({
      ...item,
      porcentajeCierre: total > 0 ? (item.cantidad / total) * 100 : 0,
    }));
  }, [chartEstadosCerrados, indicadoresCerrados.totalCasos]);

  const indicadoresGlobales = useMemo(
    () => calcularIndicadoresExpressGlobales(casosPeriodo, obtenerNombreEstado),
    [casosPeriodo, obtenerNombreEstado]
  );

  const cumplimientoGlobales = useMemo(
    () => calcularCumplimientoExpressGlobales(casosPeriodo, protocolo),
    [casosPeriodo, protocolo]
  );

  const chartCumplimiento = useMemo(
    () => datosChartCumplimientoExpress(cumplimientoGlobales, INDICADORES_PROTOCOLO_EXPRESS_DEF),
    [cumplimientoGlobales]
  );

  const filasDesglose = useMemo(() => {
    const resolver =
      vista === 'aseguradora'
        ? (caso) => resolverGrupoAseguradoraExpress(caso, obtenerNombreAseguradora)
        : (caso) => resolverGrupoResponsableExpress(caso, obtenerNombreResponsable);

    const indicadores = agruparIndicadoresExpress(
      casosPeriodo,
      resolver,
      obtenerNombreEstado
    );
    const cumplimientos = agruparCumplimientoExpress(casosPeriodo, resolver, protocolo);
    const mapaCumpl = new Map(cumplimientos.map((c) => [c.clave, c]));

    return indicadores.map((fila) => ({
      ...fila,
      cumplimiento: mapaCumpl.get(fila.clave) || null,
    }));
  }, [
    casosPeriodo,
    vista,
    protocolo,
    obtenerNombreResponsable,
    obtenerNombreAseguradora,
    obtenerNombreEstado,
  ]);

  const chartDesgloseCumplimiento = useMemo(
    () =>
      filasDesglose
        .filter((f) => (f.cumplimiento?.general?.evaluables || 0) > 0)
        .slice(0, 12)
        .map((f) => ({
          nombre:
            String(f.nombre || '').length > 22
              ? `${String(f.nombre).slice(0, 20)}…`
              : f.nombre,
          nombreCompleto: f.nombre,
          porcentaje: f.cumplimiento?.general?.porcentaje ?? 0,
          cumplidos: f.cumplimiento?.general?.cumplidos ?? 0,
          evaluables: f.cumplimiento?.general?.evaluables ?? 0,
        })),
    [filasDesglose]
  );

  const filtrosAplicados = Boolean(
    fechaDesde !== FECHA_DESDE_DEFAULT_PROTOCOLO_EXPRESS || fechaHasta || vista !== 'responsable'
  );
  const limpiarFiltros = () => {
    setFechaDesde(FECHA_DESDE_DEFAULT_PROTOCOLO_EXPRESS);
    setFechaHasta('');
    setVista('responsable');
  };

  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };

  const etiquetaPeriodo = fechaHasta
    ? `${fechaDesde || FECHA_DESDE_DEFAULT_PROTOCOLO_EXPRESS_LABEL} → ${fechaHasta}`
    : `desde ${fechaDesde || FECHA_DESDE_DEFAULT_PROTOCOLO_EXPRESS_LABEL}`;

  if (loading || loadingCatalogos) {
    return (
      <div className={`${expressRoot} p-4 sm:p-6`}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${expressRoot} ${expressScope} p-4 sm:p-6`}>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`${expressRoot} ${expressScope} p-4 sm:p-6`}>
      <div className={`${expressPageWrap} min-w-0 space-y-6`}>
        <ExpressPageHeader
          title={t('express.protocol.title')}
          subtitle={t('express.protocol.subtitle')}
          activePath="/express/protocolo"
          actions={
            <Link to="/express/tablero" className={expressBtnSecondary}>
              <FaTable />
              {t('express.protocol.operationalBoard')}
            </Link>
          }
        />

        <ExpressFilterSection title={t('express.protocol.filters')} showClear={filtrosAplicados} onClear={limpiarFiltros}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label={t('express.protocol.from')}>
              <InputFenix
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </Campo>
            <Campo label={t('express.protocol.to')}>
              <InputFenix
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </Campo>
            <Campo label={t('express.protocol.breakdown')}>
              <SelectFenix value={vista} onChange={(e) => setVista(e.target.value)}>
                {VISTAS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          </div>
        </ExpressFilterSection>

        <section className={expressCard}>
          <div className="p-4">
            <h2 className={expressSectionTitle}>{t('express.protocol.officialProtocol')}</h2>
            <p className="mt-2 font-body text-sm text-gray-600 dark:text-gray-300">
              {PROTOCOLO_EXPRESS_OBJETIVO}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {t('express.protocol.documentCurrentSince', { document: PROTOCOLO_EXPRESS_DOCUMENTO, date: FECHA_INICIO_PROTOCOLO_EXPRESS_LABEL })}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {RESUMEN_PLAZOS_PROTOCOLO_EXPRESS.map((item) => (
                <div
                  key={item.etapaId}
                  className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-[#1A1A1A]"
                >
                  <p className="text-lg font-bold text-fenix-primario">{item.valor}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{item.titulo}</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-400">
              {NOTAS_PROTOCOLO_EXPRESS.map((nota) => (
                <li key={nota}>{nota}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {t('express.protocol.periodSummary', { period: etiquetaPeriodo, count: indicadoresCerrados.totalCasos })}{' '}
          <strong className="text-gray-700 dark:text-gray-200">
            {t('express.protocol.closedFinalized', { count: indicadoresCerrados.cerradosPeriodo })}
          </strong>
          {porcentajeCierre != null && (
            <>
              {' '}
              (
              <strong className="text-gray-700 dark:text-gray-200">
                {formatearPorcentajeCumplimiento(porcentajeCierre)}
              </strong>{' '}
              {t('express.protocol.closureRate')})
            </>
          )}
          {t('express.protocol.complianceSince', { count: indicadoresGlobales.totalCasos, date: FECHA_INICIO_PROTOCOLO_EXPRESS_LABEL })}
        </p>

        <section>
          <h2 className={expressSectionTitle}>{t('express.protocol.closedCases')}</h2>
          <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {t('express.protocol.closedCasesHelp')}
          </p>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ExpressMetricCard
              label={t('express.protocol.closurePercentage')}
              value={formatearPorcentajeCumplimiento(porcentajeCierre)}
              hint={t('express.protocol.closedWithNotice', { closed: indicadoresCerrados.cerradosPeriodo, total: indicadoresCerrados.totalCasos })}
            />
            <ExpressMetricCard
              label={t('express.protocol.closedFinalizedLabel')}
              value={String(indicadoresCerrados.cerradosPeriodo)}
              hint={t('express.protocol.totalWithNotice', { total: indicadoresCerrados.totalCasos })}
            />
            {chartEstadosCerrados.slice(0, 2).map((item) => (
              <ExpressMetricCard
                key={item.nombre}
                label={item.nombre}
                value={String(item.cantidad)}
                hint={
                  indicadoresCerrados.totalCasos > 0
                    ? `${formatearPorcentajeCumplimiento(
                        (item.cantidad / indicadoresCerrados.totalCasos) * 100
                      )} del periodo`
                    : t('express.protocol.finalizedStatus')
                }
              />
            ))}
          </div>
          {chartEstadosCerradosConPct.length > 0 ? (
            <ChartCard title={t('express.protocol.closedCasesByStatus')}>
              <ExpressChartPlot height={Math.max(280, chartEstadosCerradosConPct.length * 44)}>
                <BarChart
                  data={chartEstadosCerradosConPct}
                  layout="vertical"
                  margin={{ top: 8, right: 72, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: tickColor, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={200}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _n, props) => [
                      `${value} (${formatearPorcentajeCumplimiento(props?.payload?.porcentajeCierre)})`,
                      t('express.protocol.cases'),
                    ]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombre || ''}
                  />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartEstadosCerradosConPct.map((item, index) => (
                      <Cell key={item.nombre} fill={getFenixChartColor(index, isDark)} />
                    ))}
                    <LabelList
                      dataKey="cantidad"
                      position="right"
                      content={({ x, y, width, height, index }) => {
                        const item = chartEstadosCerradosConPct[index];
                        if (!item || x == null || y == null) return null;
                        return (
                          <text
                            x={Number(x) + Number(width || 0) + 6}
                            y={Number(y) + Number(height || 0) / 2}
                            fill={tickColor}
                            fontSize={11}
                            dominantBaseline="middle"
                          >
                            {item.cantidad} ({formatearPorcentajeCumplimiento(item.porcentajeCierre)})
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ExpressChartPlot>
            </ChartCard>
          ) : (
            <p className="text-sm text-gray-500">
              {t('express.protocol.noClosedCases')}
            </p>
          )}
        </section>

        <section>
          <h2 className={expressSectionTitle}>{t('express.protocol.complianceVsSla')}</h2>
          <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {t('express.protocol.complianceHelp')}
          </p>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ExpressMetricCard
              label={t('express.protocol.generalCompliance')}
              value={formatearPorcentajeCumplimiento(cumplimientoGlobales.general.porcentaje)}
              hint={t('express.protocol.stagesOnTime', { completed: cumplimientoGlobales.general.cumplidos, total: cumplimientoGlobales.general.evaluables })}
            />
            {INDICADORES_PROTOCOLO_EXPRESS_DEF.map((ind) => {
              const datos = cumplimientoGlobales[ind.muestra];
              return (
                <ExpressMetricCard
                  key={`cumpl-${ind.clave}`}
                  label={`% ${ind.label}`}
                  value={formatearPorcentajeCumplimiento(datos?.porcentaje)}
                  hint={`Objetivo: ${plazoObjetivoIndicadorExpress(ind.clave, protocolo)} · ${datos?.cumplidos ?? 0}/${datos?.evaluables ?? 0}`}
                />
              );
            })}
          </div>

          {chartCumplimiento.length > 0 ? (
            <ChartCard title={t('express.protocol.complianceByIndicator')}>
              {cumplimientoGlobales.general.evaluables === 0 && (
                <p className="mb-3 text-sm text-gray-500">
                  {t('express.protocol.noComparableStages')}
                </p>
              )}
              <ExpressChartPlot height={Math.max(280, chartCumplimiento.length * 44)}>
                <BarChart
                  data={chartCumplimiento}
                  layout="vertical"
                  margin={{ top: 8, right: 56, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fill: tickColor, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={180}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _n, props) => [
                      props?.payload?.sinDatos
                        ? t('express.protocol.noData')
                        : formatearPorcentajeCumplimiento(value),
                      t('express.protocol.compliance'),
                    ]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      if (!item) return '';
                      return `${item.nombre} · ${item.cumplidos}/${item.evaluables} en plazo`;
                    }}
                  />
                  <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartCumplimiento.map((item) => (
                      <Cell
                        key={item.muestra}
                        fill={
                          item.sinDatos
                            ? isDark
                              ? '#3F3F46'
                              : '#D1D5DB'
                            : colorBarraCumplimiento(item.porcentaje)
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="porcentaje"
                      position="right"
                      content={({ x, y, width, height, index }) => {
                        const item = chartCumplimiento[index];
                        if (!item || x == null || y == null) return null;
                        const texto = item.sinDatos
                          ? '—'
                          : formatearPorcentajeCumplimiento(item.porcentaje);
                        return (
                          <text
                            x={Number(x) + Number(width || 0) + 6}
                            y={Number(y) + Number(height || 0) / 2}
                            fill={tickColor}
                            fontSize={11}
                            dominantBaseline="middle"
                          >
                            {texto}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ExpressChartPlot>
            </ChartCard>
          ) : (
            <p className="text-sm text-gray-500">
              {t('express.protocol.noIndicators')}
            </p>
          )}
        </section>

        <section>
          <h2 className={expressSectionTitle}>{t('express.protocol.generalAverage')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {INDICADORES_PROTOCOLO_EXPRESS_DEF.map((ind) => (
              <ExpressMetricCard
                key={ind.clave}
                label={ind.label}
                value={formatearDiasHabilesPromedio(indicadoresGlobales[ind.clave])}
                hint={`Objetivo: ${plazoObjetivoIndicadorExpress(ind.clave, protocolo)} · ${indicadoresGlobales.muestras[ind.muestra] || 0} caso(s)`}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className={expressSectionTitle}>{t('express.protocol.slaSequence')}</h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ExpressMetricCard
              label={t('express.protocol.casesInPeriod')}
              value={String(indicadoresGlobales.totalCasos)}
              hint={t('express.protocol.noticeInRange')}
            />
            <ExpressMetricCard
              label={t('express.protocol.closed')}
              value={String(indicadoresGlobales.cerradosPeriodo)}
              hint={t('express.protocol.closedStatuses')}
            />
            <ExpressMetricCard
              label={t('express.protocol.generalCompliance')}
              value={formatearPorcentajeCumplimiento(cumplimientoGlobales.general.porcentaje)}
              hint={`${cumplimientoGlobales.general.cumplidos}/${cumplimientoGlobales.general.evaluables} etapas`}
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {ETAPAS_DESGLOSE.map((etapa) => (
              <TarjetaEtapa
                key={etapa.muestra}
                etapa={etapa}
                valor={indicadoresGlobales[etapa.clave]}
                muestra={indicadoresGlobales.muestras[etapa.muestra]}
                cumplimiento={cumplimientoGlobales[etapa.muestra]}
                protocolo={protocolo}
              />
            ))}
          </div>
        </section>

        {chartDesgloseCumplimiento.length > 0 ? (
          <ChartCard
            title={t('express.protocol.generalComplianceBy', { dimension: vista === 'aseguradora' ? t('express.protocol.byInsurer') : t('express.protocol.byResponsible') })}
          >
            <ExpressChartPlot height={Math.max(280, chartDesgloseCumplimiento.length * 40)}>
              <BarChart
                data={chartDesgloseCumplimiento}
                layout="vertical"
                margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: tickColor, fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={140}
                  tick={{ fill: tickColor, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, _n, props) => [
                    formatearPorcentajeCumplimiento(value),
                    `${props?.payload?.cumplidos || 0}/${props?.payload?.evaluables || 0}`,
                  ]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.nombreCompleto || ''}
                />
                <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={26}>
                  {chartDesgloseCumplimiento.map((item, index) => (
                    <Cell
                      key={item.nombreCompleto}
                      fill={colorBarraCumplimiento(item.porcentaje) || getFenixChartColor(index, isDark)}
                    />
                  ))}
                  <LabelList
                    dataKey="porcentaje"
                    position="right"
                    formatter={(v) => formatearPorcentajeCumplimiento(v)}
                    style={{ fill: tickColor, fontSize: 11 }}
                  />
                </Bar>
              </BarChart>
            </ExpressChartPlot>
          </ChartCard>
        ) : null}

        <section>
          <h2 className={expressSectionTitle}>
            {t('express.protocol.breakdownBy', { dimension: vista === 'aseguradora' ? t('express.protocol.byInsurer') : t('express.protocol.byResponsible') })}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
                    {t('express.protocol.group')}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">
                    {t('express.protocol.cases')}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">
                    {t('express.protocol.compliance')}
                  </th>
                  {ETAPAS_DESGLOSE.map((e) => (
                    <th
                      key={e.muestra}
                      className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300"
                    >
                      {e.label.split('→')[0]?.trim() || e.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">
                    {t('express.protocol.closed')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                <tr className="bg-red-50/50 font-semibold dark:bg-red-950/20">
                  <td className="px-3 py-2 text-gray-900 dark:text-white">{t('express.protocol.grandTotal')}</td>
                  <td className="px-3 py-2 text-right">{indicadoresGlobales.totalCasos}</td>
                  <td
                    className={`px-3 py-2 text-right ${claseColorCumplimiento(cumplimientoGlobales.general.porcentaje)}`}
                  >
                    {formatearPorcentajeCumplimiento(cumplimientoGlobales.general.porcentaje)}
                  </td>
                  {ETAPAS_DESGLOSE.map((e) => (
                    <td key={`tot-${e.muestra}`} className="px-3 py-2 text-right text-xs">
                      <div>{formatearDiasHabilesPromedio(indicadoresGlobales[e.clave])}</div>
                      <div className={claseColorCumplimiento(cumplimientoGlobales[e.muestra]?.porcentaje)}>
                        {formatearPorcentajeCumplimiento(cumplimientoGlobales[e.muestra]?.porcentaje)}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">{indicadoresGlobales.cerradosPeriodo}</td>
                </tr>
                {filasDesglose.map((fila) => (
                  <tr key={fila.clave}>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{fila.nombre}</td>
                    <td className="px-3 py-2 text-right">{fila.totalCasos}</td>
                    <td
                      className={`px-3 py-2 text-right ${claseColorCumplimiento(fila.cumplimiento?.general?.porcentaje)}`}
                    >
                      {formatearPorcentajeCumplimiento(fila.cumplimiento?.general?.porcentaje)}
                    </td>
                    {ETAPAS_DESGLOSE.map((e) => (
                      <td key={`${fila.clave}-${e.muestra}`} className="px-3 py-2 text-right text-xs">
                        <div>{formatearDiasHabilesPromedio(fila[e.clave])}</div>
                        <div
                          className={claseColorCumplimiento(fila.cumplimiento?.[e.muestra]?.porcentaje)}
                        >
                          {formatearPorcentajeCumplimiento(fila.cumplimiento?.[e.muestra]?.porcentaje)}
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">{fila.cerradosPeriodo}</td>
                  </tr>
                ))}
                {filasDesglose.length === 0 ? (
                  <tr>
                    <td colSpan={4 + ETAPAS_DESGLOSE.length} className="px-3 py-6 text-center text-gray-500">
                      {t('express.protocol.noCasesToBreakdown')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
