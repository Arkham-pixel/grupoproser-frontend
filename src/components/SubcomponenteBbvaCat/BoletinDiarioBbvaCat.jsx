import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaFileAlt,
  FaFolderOpen,
  FaHandPaper,
  FaHome,
  FaPhoneAlt,
  FaPrint,
  FaBan,
  FaSearch,
  FaSearchPlus,
  FaWallet,
  FaBuilding,
  FaArrowUp,
} from 'react-icons/fa';
import Loader from '../Loader.jsx';
import { fetchAllCasosBbvaCatListado } from '../../services/bbvaCatListadoService.js';
import { filtrarCasosPorAsignacionUsuario } from '../../utils/permisosCasoPorRol.js';
import { calcularBoletinDiarioBbvaCat, diaBogotaDesdeOffset } from './boletinDiarioBbvaCatHelpers.js';
import { isoDateBogota } from './boletinSemanalBbvaCatHelpers.js';
import { imprimirBoletinDiarioBbvaCat } from './imprimirBoletinDiarioBbvaCat.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';

const ICONS_TERREMOTO = {
  verificacion: FaPhoneAlt,
  enInspeccion: FaSearch,
  enLiquidacion: FaFileAlt,
  liquidados: FaCheckCircle,
  pendientesPagoAlfa: FaWallet,
  objetados: FaBan,
  perdidasTotales: FaHome,
  desistimientos: FaHandPaper,
};

const ICONS_DISCRIMINADA = {
  contactadosSinExito: FaPhoneAlt,
  pendienteInformacion: FaFolderOpen,
  enLiquidacion: FaFileAlt,
  solicitanInspeccion: FaSearchPlus,
  accesoRestringido: FaBuilding,
  pendienteInforme: FaFileAlt,
  desistimientoTramite: FaFileAlt,
  perdidaTotal: FaHome,
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

function MetricCardTerremoto({ icon: Icon, cantidad, descripcion }) {
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
    </article>
  );
}

function MetricCardDiscriminada({ icon: Icon, cantidad, label, descripcion }) {
  return (
    <article className="rounded-xl border border-fenix-borde bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-red-100 text-fenix-primario dark:border-red-900/40 dark:text-red-300">
        <Icon className="text-sm" />
      </div>
      <div className="text-3xl font-bold text-fenix-primario dark:text-red-300">{cantidad}</div>
      <h3 className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">{label}</h3>
      <div className="my-2 border-t border-dashed border-gray-200 dark:border-gray-700" />
      <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">{descripcion}</p>
    </article>
  );
}

export default function BoletinDiarioBbvaCat() {
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
        const lista = await fetchAllCasosBbvaCatListado();
        if (!cancelado) {
          setCasos(filtrarCasosPorAsignacionUsuario(lista, { modulo: 'bbvaCat' }));
        }
      } catch (err) {
        console.error('Error cargando boletín diario BBVA CAT:', err);
        if (!cancelado) {
          setError(err.message || t('bbvaCat.boletinDiario.loadError'));
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
      calcularBoletinDiarioBbvaCat(casos, {
        fechaCorte,
        // Solo persistir el corte cuando se consulta el día de hoy (o pasado reciente)
        persistirCorte: offsetDias <= 0,
      }),
    [casos, fechaCorte, offsetDias]
  );

  const { comparativo, gestionTerremoto, discriminada } = boletin;

  const handleImprimirPdf = () => {
    imprimirBoletinDiarioBbvaCat(boletin, {
      docTitle: `${t('bbvaCat.boletinDiario.title')} · ${boletin.etiquetaHoyCorta}`,
      title: t('bbvaCat.boletinDiario.title'),
      subtitle: t('bbvaCat.boletinDiario.subtitle', { fecha: boletin.etiquetaHoy }),
      terremotoTitle: t('bbvaCat.boletinDiario.terremoto.title'),
      terremotoSubtitle: t('bbvaCat.boletinDiario.terremoto.subtitle'),
      totalGeneral: t('bbvaCat.boletinDiario.terremoto.total'),
      cutOff: t('bbvaCat.boletinDiario.cutOff'),
      comparativoTitle: t('bbvaCat.boletinDiario.comparativo.title'),
      comparativoSubtitle: t('bbvaCat.boletinDiario.comparativo.subtitle'),
      cutLabel: t('bbvaCat.boletinDiario.comparativo.cutLabel', {
        ayer: boletin.etiquetaAyer,
        hoy: boletin.etiquetaHoy,
      }),
      estado: t('bbvaCat.boletinDiario.comparativo.estado'),
      yesterday: t('bbvaCat.boletinDiario.comparativo.yesterday'),
      today: t('bbvaCat.boletinDiario.comparativo.today'),
      variation: t('bbvaCat.boletinDiario.comparativo.variation'),
      effectiveYesterday: t('bbvaCat.boletinDiario.comparativo.effectiveYesterday'),
      effectiveToday: t('bbvaCat.boletinDiario.comparativo.effectiveToday'),
      newAssignments: t('bbvaCat.boletinDiario.comparativo.newAssignments'),
      baseGrowth: t('bbvaCat.boletinDiario.comparativo.baseGrowth', {
        pct: comparativo.pctIncrementoBase ?? 0,
      }),
      netManaged: t('bbvaCat.boletinDiario.comparativo.netManaged'),
      regressions: t('bbvaCat.boletinDiario.comparativo.regressions'),
      noRegressions: t('bbvaCat.boletinDiario.comparativo.noRegressions'),
      hasRegressions: t('bbvaCat.boletinDiario.comparativo.hasRegressions'),
      summaryBanner: t('bbvaCat.boletinDiario.comparativo.summaryBanner', {
        desde: comparativo.gestionAyer,
        hasta: comparativo.gestionHoy,
        nuevas: comparativo.nuevasAsignaciones,
      }),
      summaryText: t('bbvaCat.boletinDiario.comparativo.summaryText', {
        pctAyer: comparativo.pctGestionAyer,
        pctHoy: comparativo.pctGestionHoy,
        neto: comparativo.incrementoGestion,
      }),
      discEyebrow: t('bbvaCat.boletinDiario.discriminada.eyebrow'),
      discTitle: t('bbvaCat.boletinDiario.discriminada.title'),
      discSubtitle: t('bbvaCat.boletinDiario.discriminada.subtitle'),
      discSource: t('bbvaCat.boletinDiario.discriminada.source', {
        hoy: boletin.etiquetaHoyCorta,
        ayer: boletin.etiquetaAyerCorta,
      }),
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
              BBVA CAT
            </p>
            <h1 className={expressPageTitle}>{t('bbvaCat.boletinDiario.title')}</h1>
            <p className={expressPageSubtitle}>
              {t('bbvaCat.boletinDiario.subtitle', { fecha: boletin.etiquetaHoy })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              className={expressBtnGhost}
              onClick={() => setOffsetDias((n) => n - 1)}
            >
              <FaChevronLeft /> {t('bbvaCat.boletinDiario.prevDay')}
            </button>
            <button
              type="button"
              className={expressBtnGhost}
              disabled={offsetDias === 0}
              onClick={() => setOffsetDias(0)}
            >
              {t('bbvaCat.boletinDiario.today')}
            </button>
            <button
              type="button"
              className={expressBtnGhost}
              disabled={offsetDias >= 0}
              onClick={() => setOffsetDias((n) => Math.min(0, n + 1))}
            >
              {t('bbvaCat.boletinDiario.nextDay')} <FaChevronRight />
            </button>
            <button type="button" className={expressBtnPrimary} onClick={handleImprimirPdf}>
              <FaPrint /> {t('bbvaCat.boletinDiario.print')}
            </button>
            <Link to="/bbva-cat/dashboard" className={expressBtnGhost}>
              {t('nav.bbvaCatDashboard')}
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {/* —— GESTIÓN TERREMOTO —— */}
        <section className="rounded-2xl border border-fenix-borde bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950 print:break-inside-avoid">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold tracking-wide text-gray-900 dark:text-white">
                {t('bbvaCat.boletinDiario.terremoto.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('bbvaCat.boletinDiario.terremoto.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-fenix-primario px-4 py-1.5 text-sm font-bold text-fenix-primario dark:border-red-400 dark:text-red-300">
                {t('bbvaCat.boletinDiario.terremoto.total')}: {gestionTerremoto.total}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-fenix-primario dark:bg-red-950/50 dark:text-red-200">
                <FaCalendarAlt />
                {t('bbvaCat.boletinDiario.cutOff')}: {boletin.etiquetaHoy}
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
                />
              );
            })}
          </div>
        </section>

        {/* —— COMPARATIVO DIARIO —— */}
        <section className="rounded-2xl border border-fenix-borde bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950 print:break-before-page">
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold tracking-wide text-gray-900 dark:text-white">
              {t('bbvaCat.boletinDiario.comparativo.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('bbvaCat.boletinDiario.comparativo.subtitle')}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {t('bbvaCat.boletinDiario.comparativo.cutLabel', {
                ayer: boletin.etiquetaAyer,
                hoy: boletin.etiquetaHoy,
              })}
            </p>
          </div>

          {!comparativo.tieneAyer && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              {t('bbvaCat.boletinDiario.comparativo.noYesterday', {
                fecha: boletin.etiquetaAyerCorta,
              })}
            </div>
          )}
          {comparativo.tieneAyer && comparativo.fuenteAyer === 'reconstruido' && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
              {t('bbvaCat.boletinDiario.comparativo.reconstructedNote', {
                fecha: boletin.etiquetaAyerCorta,
              })}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-200 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {t('bbvaCat.boletinDiario.comparativo.estado')}
                  </th>
                  <th className="border border-gray-200 bg-gray-100 px-3 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800">
                    {t('bbvaCat.boletinDiario.comparativo.yesterday')}
                    <div className="text-[11px] font-normal text-gray-500">{boletin.etiquetaAyer}</div>
                  </th>
                  <th className="border border-red-100 bg-red-50 px-3 py-2 text-center font-semibold text-fenix-primario dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                    {t('bbvaCat.boletinDiario.comparativo.variation')}
                  </th>
                  <th className="border border-fenix-primario bg-fenix-primario px-3 py-2 text-center font-semibold text-white dark:border-red-700 dark:bg-red-700">
                    {t('bbvaCat.boletinDiario.comparativo.today')}
                    <div className="text-[11px] font-normal text-red-100">{boletin.etiquetaHoy}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparativo.filas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800 dark:border-gray-700 dark:text-gray-100">
                      {fila.label}
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-center tabular-nums dark:border-gray-700">
                      {fila.ayer}
                      <span className="ml-1 text-xs text-gray-400">({fila.pctAyer}%)</span>
                    </td>
                    <td className="border border-red-50 bg-red-50/40 px-3 py-2 text-center dark:border-red-950 dark:bg-red-950/20">
                      <VariacionCell valor={fila.variacion} maloSiSube={fila.id === 'verificacion'} />
                    </td>
                    <td className="border border-red-100 bg-red-50/70 px-3 py-2 text-center tabular-nums font-semibold text-gray-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                      {fila.hoy}
                      <span className="ml-1 text-xs font-normal text-fenix-primario/80 dark:text-red-300/80">
                        ({fila.pctHoy}%)
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
                    TOTAL
                  </td>
                  <td className="border border-gray-300 bg-gray-50 px-3 py-2 text-center dark:border-gray-600 dark:bg-gray-800">
                    {comparativo.totalAyer}
                  </td>
                  <td className="border border-red-200 bg-red-50 px-3 py-2 text-center text-fenix-primario dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                    {comparativo.variacionTotal >= 0
                      ? `+${comparativo.variacionTotal}`
                      : comparativo.variacionTotal}
                  </td>
                  <td className="border border-fenix-primario bg-fenix-primario px-3 py-2 text-center text-white dark:border-red-600 dark:bg-red-700">
                    {comparativo.totalHoy}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {t('bbvaCat.boletinDiario.comparativo.effectiveYesterday')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {comparativo.gestionAyer} / {comparativo.totalAyer}
              </p>
              <p className="text-sm text-gray-500">({comparativo.pctGestionAyer}%)</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/40">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-fenix-primario dark:text-red-300">
                {t('bbvaCat.boletinDiario.comparativo.effectiveToday')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {comparativo.gestionHoy} / {comparativo.totalHoy}
              </p>
              <p className="text-sm text-fenix-primario/80 dark:text-red-300/80">
                ({comparativo.pctGestionHoy}%)
              </p>
            </div>
            <div className="rounded-xl border border-fenix-borde p-4 dark:border-gray-700">
              <p className="text-2xl font-bold text-fenix-primario dark:text-red-300">
                +{comparativo.nuevasAsignaciones}
              </p>
              <p className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                {t('bbvaCat.boletinDiario.comparativo.newAssignments')}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {comparativo.pctIncrementoBase != null
                  ? t('bbvaCat.boletinDiario.comparativo.baseGrowth', {
                      pct: comparativo.pctIncrementoBase,
                    })
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-fenix-borde p-4 dark:border-gray-700">
              <p className="text-2xl font-bold text-fenix-primario dark:text-red-300">
                {comparativo.incrementoGestion >= 0 ? '+' : ''}
                {comparativo.incrementoGestion}
              </p>
              <p className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                {t('bbvaCat.boletinDiario.comparativo.netManaged')}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {comparativo.gestionAyer} → {comparativo.gestionHoy}
              </p>
            </div>
            <div className="rounded-xl border border-fenix-borde p-4 dark:border-gray-700">
              <p className="text-2xl font-bold text-fenix-primario dark:text-red-300">
                {comparativo.retrocesos}
              </p>
              <p className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                {t('bbvaCat.boletinDiario.comparativo.regressions')}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {comparativo.retrocesos === 0
                  ? t('bbvaCat.boletinDiario.comparativo.noRegressions')
                  : t('bbvaCat.boletinDiario.comparativo.hasRegressions')}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-fenix-primario px-4 py-3 text-sm font-semibold text-white dark:bg-red-800">
            {t('bbvaCat.boletinDiario.comparativo.summaryBanner', {
              desde: comparativo.gestionAyer,
              hasta: comparativo.gestionHoy,
              nuevas: comparativo.nuevasAsignaciones,
            })}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {t('bbvaCat.boletinDiario.comparativo.summaryText', {
              pctAyer: comparativo.pctGestionAyer,
              pctHoy: comparativo.pctGestionHoy,
              neto: comparativo.incrementoGestion,
            })}
          </p>
        </section>

        {/* —— GESTIÓN DISCRIMINADA —— */}
        <section className="rounded-2xl border border-fenix-borde bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950 print:break-before-page">
          <div className="mb-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {t('bbvaCat.boletinDiario.discriminada.eyebrow')}
            </p>
            <div className="mx-auto mt-2 inline-block rounded-xl bg-fenix-primario px-6 py-3 text-lg font-bold text-white dark:bg-red-700">
              {t('bbvaCat.boletinDiario.discriminada.title')}: {discriminada.total}
            </div>
            <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">
              {t('bbvaCat.boletinDiario.discriminada.subtitle')}
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discriminada.cards.map((card) => {
              const Icon = ICONS_DISCRIMINADA[card.id] || FaFileAlt;
              return (
                <MetricCardDiscriminada
                  key={card.id}
                  icon={Icon}
                  cantidad={card.cantidad}
                  label={card.label}
                  descripcion={card.descripcion}
                />
              );
            })}
          </div>
          <p className="mt-5 text-center text-xs text-gray-400">
            {t('bbvaCat.boletinDiario.discriminada.source', {
              hoy: boletin.etiquetaHoyCorta,
              ayer: boletin.etiquetaAyerCorta,
            })}
          </p>
        </section>

        <p className="print:hidden text-center text-xs text-gray-400">
          Corte {isoCorte} · {isoDateBogota(new Date()) === isoCorte ? 'hoy' : 'histórico'} ·
          America/Bogota
        </p>
      </div>
    </div>
  );
}
