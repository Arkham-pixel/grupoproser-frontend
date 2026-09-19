import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaCheckSquare,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
  FaFileAlt,
  FaHandPaper,
  FaHome,
  FaPhoneAlt,
  FaPhoneSlash,
  FaPrint,
  FaBan,
  FaSearch,
  FaWallet,
  FaArrowUp,
  FaThumbtack,
  FaHourglassHalf,
  FaChartBar,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaPen,
} from 'react-icons/fa';
import Loader from '../Loader.jsx';
import { fetchAllCasosAlfa } from '../../services/segurosAlfaService.js';
import { filtrarCasosPorAsignacionUsuario } from '../../utils/permisosCasoPorRol.js';
import { calcularBoletinDiarioAlfa, diaBogotaDesdeOffset } from './boletinDiarioAlfaHelpers.js';
import { isoDateBogota } from './boletinSemanalAlfaHelpers.js';
import { imprimirBoletinDiarioAlfa } from './imprimirBoletinDiarioAlfa.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';

const COLOR_HOY = '#DC2626';
const COLOR_AYER = '#9CA3AF';
const PALETA_FENIX = ['#DC2626', '#F59E0B', '#EF4444', '#B91C1C', '#F87171', '#78716C', '#A8A29E', '#57534E'];
const COLOR_PARCIAL = '#F59E0B';
const COLOR_TOTAL = '#DC2626';
const COLOR_INHABITABLE = '#7C3AED';

const tooltipEstilo = {
  borderRadius: 10,
  border: '1px solid #E6E6E6',
  fontSize: 12,
};

const ICONS_TERREMOTO = {
  enGestion: FaPhoneAlt,
  sinRespuesta: FaPhoneAlt,
  verificacion: FaPhoneAlt,
  enInspeccion: FaSearch,
  enLiquidacion: FaFileAlt,
  liquidados: FaCheckCircle,
  pendientesPagoAlfa: FaWallet,
  objetados: FaBan,
  perdidasTotales: FaHome,
  desistimientos: FaHandPaper,
};

const ICONS_GESTION_ACTUAL = {
  enGestion: FaThumbtack,
  contactadoProgramado: FaPhoneAlt,
  inspeccionado: FaSearch,
  liquidado: FaCalendarAlt,
  sinRespuesta: FaPhoneSlash,
};

const ICONS_SINIESTRO_ACTUAL = {
  pendientes: FaHourglassHalf,
  pendienteAceptacion: FaChartBar,
  procesoPago: FaMoneyBillWave,
  cerrados: FaCheckCircle,
  objetados: FaExclamationTriangle,
  desistidos: FaBan,
};

const ICONS_CIERRES_DIA = {
  cerradosTotales: FaCheckSquare,
  enviadosPago: FaPen,
  objetados: FaExclamationTriangle,
  desistidos: FaBan,
  perdidasTotales: FaCircle,
};

const ICONS_CLASIFICACION_PERDIDAS = {
  parcial: FaCircle,
  total: FaCircle,
  inhabitable: FaCircle,
};

function VariacionCell({ valor, maloSiSube = false }) {
  if (valor === 0) {
    return <span className="font-semibold text-gray-500">0</span>;
  }
  const positivo = valor > 0;
  // Verificación: subir es malo. Resto: subir es avance (acento plataforma).
  const color = maloSiSube
    ? positivo
      ? 'text-fenix-error'
      : 'text-fenix-primario'
    : positivo
      ? 'text-fenix-primario'
      : 'text-fenix-error';
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${color}`}>
      {positivo ? <FaArrowUp className="text-[10px]" /> : null}
      {positivo ? `+${valor}` : valor}
    </span>
  );
}

function MetricCardTerremoto({ icon: Icon, cantidad, descripcion, desglose = [] }) {
  return (
    <article className="flex flex-col rounded-xl border border-fenix-borde bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-fenix-primario dark:bg-red-950/40 dark:text-red-300">
        <Icon className="text-sm" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {cantidad}
      </div>
      <div className="mt-2 border-t border-dashed border-fenix-borde pt-2 text-sm leading-snug text-gray-600 dark:border-gray-700 dark:text-gray-300">
        {descripcion}
      </div>
      {Array.isArray(desglose) && desglose.length > 1 ? (
        <ul className="mt-2 space-y-0.5 border-t border-dashed border-gray-200 pt-2 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {desglose.map((d) => (
            <li key={d.label} className="flex justify-between gap-2 tabular-nums">
              <span className="truncate">{d.label}</span>
              <span className="font-semibold text-fenix-primario dark:text-red-300">{d.cantidad}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function GraficaBarrasComparativo({ filas = [], labelAyer = 'Últ. act.', labelHoy = 'Hoy' }) {
  const data = useMemo(
    () =>
      (filas || []).map((f) => ({
        name: f.labelCorto || f.label,
        ayer: Number(f.ayer) || 0,
        hoy: Number(f.hoy) || 0,
      })),
    [filas]
  );

  if (!data.length) return null;

  return (
    <div className="mt-4 h-56 w-full min-w-0 print:hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={56}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <Tooltip contentStyle={tooltipEstilo} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="ayer" name={labelAyer} fill={COLOR_AYER} radius={[4, 4, 0, 0]} />
          <Bar dataKey="hoy" name={labelHoy} fill={COLOR_HOY} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GraficaBarrasSimple({ filas = [], valorKey = 'cantidad', colors = PALETA_FENIX }) {
  const data = useMemo(
    () =>
      (filas || []).map((f) => ({
        name: f.labelCorto || f.label,
        valor: Number(f[valorKey]) || 0,
      })),
    [filas, valorKey]
  );

  if (!data.length) return null;

  return (
    <div className="mt-4 h-52 w-full min-w-0 print:hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={tooltipEstilo} />
          <Bar dataKey="valor" name="Cantidad" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={data[i].name} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GraficaDonutPerdidas({ filas = [] }) {
  const data = useMemo(
    () =>
      (filas || [])
        .map((f) => ({
          name: f.label,
          value: Number(f.cantidad) || 0,
          fill:
            f.id === 'total'
              ? COLOR_TOTAL
              : f.id === 'inhabitable'
                ? COLOR_INHABITABLE
                : COLOR_PARCIAL,
        }))
        .filter((d) => d.value > 0),
    [filas]
  );

  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div className="mt-4 flex h-52 w-full min-w-0 flex-col items-center justify-center print:hidden">
      {total === 0 ? (
        <p className="text-sm text-gray-400">Sin pérdidas clasificadas</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipEstilo} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function TablaComparativoEstados({
  titulo,
  colEstado,
  colAyer,
  colHoy,
  colVariacion,
  etiquetaAyer,
  etiquetaHoy,
  filas = [],
  icons = {},
  maloSiSubeIds = [],
}) {
  const totalAyer = filas.reduce((a, f) => a + (Number(f.ayer) || 0), 0);
  const totalHoy = filas.reduce((a, f) => a + (Number(f.hoy) || 0), 0);
  const variacionTotal = totalHoy - totalAyer;

  return (
    <section className="rounded-2xl border border-fenix-borde bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950 print:break-inside-avoid">
      <h2 className="font-heading text-xl font-bold tracking-wide text-gray-900 dark:text-white">
        {titulo}
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="overflow-x-auto lg:col-span-3">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {colEstado}
                </th>
                <th className="border border-gray-200 bg-gray-100 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800">
                  {colAyer}
                  {etiquetaAyer ? (
                    <div className="text-[11px] font-normal text-gray-500">{etiquetaAyer}</div>
                  ) : null}
                </th>
                <th className="border border-red-100 bg-red-50 px-3 py-2 text-center font-semibold text-fenix-primario dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                  {colVariacion}
                </th>
                <th className="border border-fenix-primario bg-fenix-primario px-3 py-2 text-center font-semibold text-white dark:border-red-700 dark:bg-red-700">
                  {colHoy}
                  {etiquetaHoy ? (
                    <div className="text-[11px] font-normal text-red-100">{etiquetaHoy}</div>
                  ) : null}
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const Icon = icons[fila.id] || FaFileAlt;
                const pctAyer = totalAyer
                  ? Math.round(((Number(fila.ayer) || 0) / totalAyer) * 1000) / 10
                  : 0;
                const pctHoy = totalHoy
                  ? Math.round(((Number(fila.hoy) || 0) / totalHoy) * 1000) / 10
                  : 0;
                return (
                  <tr key={fila.id}>
                    <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800 dark:border-gray-700 dark:text-gray-100">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="text-fenix-primario" />
                        {fila.label}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-center tabular-nums dark:border-gray-700">
                      {fila.ayer}{' '}
                      <span className="text-[11px] text-gray-400">({pctAyer}%)</span>
                    </td>
                    <td className="border border-red-50 bg-red-50/40 px-3 py-2 text-center dark:border-red-950 dark:bg-red-950/20">
                      <VariacionCell
                        valor={fila.avance}
                        maloSiSube={maloSiSubeIds.includes(fila.id)}
                      />
                    </td>
                    <td className="border border-red-100 bg-red-50/70 px-3 py-2 text-center tabular-nums font-semibold text-gray-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                      {fila.hoy}{' '}
                      <span className="text-[11px] font-normal text-fenix-primario">({pctHoy}%)</span>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 font-bold dark:bg-gray-900">
                <td className="border border-gray-200 px-3 py-2 dark:border-gray-700">TOTAL</td>
                <td className="border border-gray-200 px-3 py-2 text-center tabular-nums dark:border-gray-700">
                  {totalAyer}
                </td>
                <td className="border border-red-50 px-3 py-2 text-center dark:border-red-950">
                  <VariacionCell valor={variacionTotal} />
                </td>
                <td className="border border-fenix-primario bg-fenix-primario px-3 py-2 text-center tabular-nums text-white dark:border-red-700 dark:bg-red-700">
                  {totalHoy}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-red-50 bg-red-50/30 p-3 dark:border-red-950 dark:bg-red-950/20 lg:col-span-2">
          <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-fenix-primario">
            Comparativo visual
          </p>
          <GraficaBarrasComparativo filas={filas} labelAyer={colAyer} labelHoy={colHoy} />
        </div>
      </div>
    </section>
  );
}

function TablaResultadoCantidad({
  titulo,
  subtitulo,
  colResultado,
  colCantidad,
  filas = [],
  icons = {},
  iconClassById = {},
  chart = 'bars',
}) {
  return (
    <section className="rounded-2xl border border-fenix-borde bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950 print:break-inside-avoid">
      <h2 className="font-heading text-xl font-bold tracking-wide text-gray-900 dark:text-white">
        {titulo}
      </h2>
      {subtitulo ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitulo}</p>
      ) : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="overflow-x-auto lg:col-span-3">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800">
                  {colResultado}
                </th>
                <th className="border border-fenix-primario bg-fenix-primario px-3 py-2 text-center font-semibold text-white">
                  {colCantidad}
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const Icon = icons[fila.id] || FaFileAlt;
                const iconClass = iconClassById[fila.id] || 'text-fenix-primario';
                return (
                  <tr key={fila.id}>
                    <td className="border border-gray-200 px-3 py-2.5 font-medium text-gray-800 dark:border-gray-700 dark:text-gray-100">
                      <span className="inline-flex items-center gap-2">
                        <Icon className={iconClass} />
                        {fila.label}
                      </span>
                    </td>
                    <td className="border border-red-100 bg-red-50/50 px-3 py-2.5 text-center tabular-nums text-lg font-bold text-gray-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                      {fila.cantidad}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-red-50 bg-red-50/30 p-3 dark:border-red-950 dark:bg-red-950/20 lg:col-span-2">
          <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-fenix-primario">
            Vista gráfica
          </p>
          {chart === 'donut' ? (
            <GraficaDonutPerdidas filas={filas} />
          ) : (
            <GraficaBarrasSimple filas={filas} />
          )}
        </div>
      </div>
    </section>
  );
}

export default function BoletinDiarioSegurosAlfa() {
  const { t } = useTranslation();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offsetDias, setOffsetDias] = useState(0);

  const fechaCorte = useMemo(() => diaBogotaDesdeOffset(offsetDias), [offsetDias]);
  const isoCorte = useMemo(() => isoDateBogota(fechaCorte), [fechaCorte]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const lista = await fetchAllCasosAlfa();
        if (!cancelado) {
          setCasos(filtrarCasosPorAsignacionUsuario(lista, { modulo: 'alfa' }));
        }
      } catch (err) {
        console.error('Error cargando boletín diario Alfa:', err);
        if (!cancelado) {
          setError(err.message || t('segurosAlfa.boletinDiario.loadError'));
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

  const boletin = useMemo(
    () =>
      calcularBoletinDiarioAlfa(casos, {
        fechaCorte,
        // Solo persistir el corte cuando se consulta el día de hoy (o pasado reciente)
        persistirCorte: offsetDias <= 0,
      }),
    [casos, fechaCorte, offsetDias]
  );

  const {
    gestionTerremoto,
    estadoGestionActual,
    estadoSiniestroActual,
    cierresDelDia,
    clasificacionPerdidas,
  } = boletin;

  const handleImprimirPdf = () => {
    imprimirBoletinDiarioAlfa(boletin, {
      docTitle: `${t('segurosAlfa.boletinDiario.title')} · ${boletin.etiquetaHoyCorta}`,
      title: t('segurosAlfa.boletinDiario.title'),
      subtitle: t('segurosAlfa.boletinDiario.subtitle', { fecha: boletin.etiquetaHoy }),
      terremotoTitle: t('segurosAlfa.boletinDiario.terremoto.title'),
      terremotoSubtitle: t('segurosAlfa.boletinDiario.terremoto.subtitle'),
      totalGeneral: t('segurosAlfa.boletinDiario.terremoto.total'),
      cutOff: t('segurosAlfa.boletinDiario.cutOff'),
      gestionActualTitle: '2. Estado de gestión actual',
      gestionActualEstado: 'Estado de gestión',
      gestionActualAvance: 'Avance',
      siniestroActualTitle: '3. Estado del siniestro',
      siniestroActualEstado: 'Estado del siniestro',
      siniestroActualMovimiento: 'Movimiento',
      diaAnterior: 'Última actualización',
      hoyLista: 'Hoy',
      cierresTitle: t('segurosAlfa.boletinDiario.unificado.s4'),
      cierresSub: t('segurosAlfa.boletinDiario.unificado.s4Sub'),
      cierresResultado: t('segurosAlfa.boletinDiario.unificado.resultado'),
      cierresCantidad: t('segurosAlfa.boletinDiario.unificado.cantidad'),
      perdidasTitle: t('segurosAlfa.boletinDiario.unificado.s5'),
      perdidasTipo: t('segurosAlfa.boletinDiario.unificado.tipoPerdida'),
      perdidasCantidad: t('segurosAlfa.boletinDiario.unificado.cantidad'),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
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
              Seguros Alfa
            </p>
            <h1 className={expressPageTitle}>{t('segurosAlfa.boletinDiario.title')}</h1>
            <p className={expressPageSubtitle}>
              {t('segurosAlfa.boletinDiario.subtitle', { fecha: boletin.etiquetaHoy })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              className={expressBtnGhost}
              onClick={() => setOffsetDias((n) => n - 1)}
            >
              <FaChevronLeft /> {t('segurosAlfa.boletinDiario.prevDay')}
            </button>
            <button
              type="button"
              className={expressBtnGhost}
              disabled={offsetDias === 0}
              onClick={() => setOffsetDias(0)}
            >
              {t('segurosAlfa.boletinDiario.today')}
            </button>
            <button
              type="button"
              className={expressBtnGhost}
              disabled={offsetDias >= 0}
              onClick={() => setOffsetDias((n) => Math.min(0, n + 1))}
            >
              {t('segurosAlfa.boletinDiario.nextDay')} <FaChevronRight />
            </button>
            <button type="button" className={expressBtnPrimary} onClick={handleImprimirPdf}>
              <FaPrint /> {t('segurosAlfa.boletinDiario.print')}
            </button>
            <Link to="/seguros-alfa/boletin" className={expressBtnGhost}>
              <FaChartLine /> {t('segurosAlfa.boletinDiario.openWeekly')}
            </Link>
            <Link to="/seguros-alfa/dashboard" className={expressBtnGhost}>
              {t('nav.alfaDashboard')}
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {/* —— GESTIÓN TERREMOTO (8 gráficas lineamiento) —— */}
        <section className="rounded-2xl border border-fenix-borde bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950 print:break-inside-avoid">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold tracking-wide text-gray-900 dark:text-white">
                {t('segurosAlfa.boletinDiario.terremoto.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('segurosAlfa.boletinDiario.terremoto.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-fenix-primario px-4 py-1.5 text-sm font-bold text-fenix-primario dark:border-red-400 dark:text-red-300">
                {t('segurosAlfa.boletinDiario.terremoto.total')}: {gestionTerremoto.total}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-fenix-primario dark:bg-red-950/50 dark:text-red-200">
                <FaCalendarAlt />
                {t('segurosAlfa.boletinDiario.cutOff')}: {boletin.etiquetaHoy}
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {gestionTerremoto.filas.map((fila) => {
              const Icon = ICONS_TERREMOTO[fila.id] || FaFileAlt;
              return (
                <MetricCardTerremoto
                  key={fila.id}
                  icon={Icon}
                  cantidad={fila.cantidad}
                  descripcion={fila.descripcion}
                  desglose={fila.desglose}
                />
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-red-50 bg-red-50/30 p-3 dark:border-red-950 dark:bg-red-950/20 print:hidden">
            <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-fenix-primario">
              Distribución visual · clasificación actual
            </p>
            <GraficaBarrasSimple
              filas={(gestionTerremoto.filas || []).map((f) => ({
                ...f,
                label: f.labelCorto || f.label,
                cantidad: f.cantidad,
              }))}
            />
          </div>
        </section>

        {/* —— Mismo formato del comparativo, ejes exactos AI / AJ —— */}
        <TablaComparativoEstados
          titulo="2. Estado de gestión actual"
          colEstado="Estado de gestión"
          colAyer="Última actualización"
          colHoy="Hoy"
          colVariacion="Avance"
          etiquetaAyer={boletin.referenciaExactaDisponible ? boletin.etiquetaAyer : null}
          etiquetaHoy={boletin.etiquetaHoy}
          filas={estadoGestionActual?.filas || []}
          icons={ICONS_GESTION_ACTUAL}
          maloSiSubeIds={['enGestion', 'sinRespuesta']}
        />

        <TablaComparativoEstados
          titulo="3. Estado del siniestro"
          colEstado="Estado del siniestro"
          colAyer="Última actualización"
          colHoy="Hoy"
          colVariacion="Movimiento"
          etiquetaAyer={boletin.referenciaExactaDisponible ? boletin.etiquetaAyer : null}
          etiquetaHoy={boletin.etiquetaHoy}
          filas={estadoSiniestroActual?.filas || []}
          icons={ICONS_SINIESTRO_ACTUAL}
        />

        <TablaResultadoCantidad
          titulo={t('segurosAlfa.boletinDiario.unificado.s4')}
          subtitulo={`${t('segurosAlfa.boletinDiario.unificado.s4Sub')} · ${boletin.etiquetaHoy}`}
          colResultado={t('segurosAlfa.boletinDiario.unificado.resultado')}
          colCantidad={t('segurosAlfa.boletinDiario.unificado.cantidad')}
          filas={cierresDelDia?.filas || []}
          icons={ICONS_CIERRES_DIA}
          iconClassById={{
            cerradosTotales: 'text-emerald-600',
            enviadosPago: 'text-fenix-primario',
            objetados: 'text-amber-500',
            desistidos: 'text-fenix-error',
            perdidasTotales: 'text-fenix-error',
          }}
        />

        <TablaResultadoCantidad
          titulo={t('segurosAlfa.boletinDiario.unificado.s5')}
          colResultado={t('segurosAlfa.boletinDiario.unificado.tipoPerdida')}
          colCantidad={t('segurosAlfa.boletinDiario.unificado.cantidad')}
          filas={clasificacionPerdidas?.filas || []}
          icons={ICONS_CLASIFICACION_PERDIDAS}
          iconClassById={{
            parcial: 'text-amber-400',
            total: 'text-fenix-error',
            inhabitable: 'text-violet-500',
          }}
          chart="donut"
        />

        <p className="print:hidden text-center text-xs text-gray-400">
          Corte {isoCorte} · {isoDateBogota(new Date()) === isoCorte ? 'hoy' : 'histórico'} ·
          America/Bogota
        </p>
      </div>
    </div>
  );
}
