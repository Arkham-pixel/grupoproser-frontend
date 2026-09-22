import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosAlfa } from '../../services/segurosAlfaService.js';
import { filtrarCasosPorAsignacionUsuario } from '../../utils/permisosCasoPorRol.js';
import {
  ESTADOS_ALFA,
  ESTADOS_GESTION_ALFA,
  ESTADOS_SINIESTRO_ALFA,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  contarKpisGestionAlfa,
  fechaEnRango,
  formatCurrency,
  homologarEstadoSiniestroAlfa,
  sincronizarGestionConCierreSiniestroAlfa,
} from './segurosAlfaHelpers.js';

/** Mismo criterio AJ del boletín diario §3 (solo PENDIENTE). */
function esPendienteAjAlfa(caso) {
  return homologarEstadoSiniestroAlfa(caso?.estado, caso) === 'PENDIENTE';
}

/** Cartera abierta operativa: PENDIENTE + INSPECCIONADO PENDIENTE (AJ). */
function esActivoAjAlfa(caso) {
  const s = homologarEstadoSiniestroAlfa(caso?.estado, caso);
  return s === 'PENDIENTE' || s === 'INSPECCIONADO PENDIENTE';
}

const KPI_GESTION_SOLO = [
  { key: 'enGestion', label: 'EN GESTIÓN' },
  { key: 'pteContacto', label: 'PTE CONTACTO' },
  { key: 'solicitudDtos', label: 'SOLICITUD DTOS' },
  { key: 'contactadoProgramado', label: 'CONTACTADO Y PROGRAMADO' },
  { key: 'inspeccionado', label: 'INSPECCIONADO' },
  { key: 'liquidado', label: 'LIQUIDADO' },
  { key: 'sinRespuesta', label: 'SIN RESPUESTA EFECTIVA' },
  { key: 'cerrado', label: 'SIN PÓLIZA' },
];

function KpiCard({ label, value, accent = false, hint }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        accent
          ? 'border-fenix-borde bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/25'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
      }`}
    >
      <div
        className={`text-[11px] font-medium uppercase tracking-wide ${
          accent ? 'text-fenix-primario' : 'text-gray-500'
        }`}
      >
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {hint ? <p className="mt-1 text-[10px] leading-snug text-gray-500">{hint}</p> : null}
    </div>
  );
}

function AlfaKpisGestionStrip({ casos = [] }) {
  const kpis = useMemo(() => contarKpisGestionAlfa(casos), [casos]);
  const porSiniestro = useMemo(() => {
    const counts = Object.fromEntries(ESTADOS_SINIESTRO_ALFA.map((e) => [e, 0]));
    for (const c of casos) {
      const s = homologarEstadoSiniestroAlfa(c.estado, c);
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [casos]);

  const totalCartera = casos.length;
  const abiertosAj = (porSiniestro.PENDIENTE || 0) + (porSiniestro['INSPECCIONADO PENDIENTE'] || 0);

  return (
    <div className="mb-5 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-semibold text-gray-800 dark:text-gray-100">
            Tablero Alfa · tipificación dual
          </h2>
          <p className="text-xs text-gray-500">
            Cartera visible: {totalCartera} · Abiertos AJ (pendiente + insp. pendiente): {abiertosAj}
          </p>
        </div>
        <Link
          to="/seguros-alfa/boletin-diario"
          className="text-xs font-medium text-fenix-primario hover:underline"
        >
          Ver boletín diario (mismos ejes AI / AJ)
        </Link>
      </div>

      {/* Bloque 1 — AI */}
      <section className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-950/40">
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fenix-primario">
            1 · Estado de gestión (AI)
          </p>
          <p className="text-xs text-gray-500">
            Cómo va el caso en operación (contactos, inspección, liquidación).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KPI_GESTION_SOLO.map(({ key, label }) => (
            <KpiCard key={key} label={label} value={kpis[key] ?? 0} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <KpiCard
            label="SINIESTRO DEFINIDO"
            value={kpis.siniestroDefinido ?? 0}
            hint="Todo excepto AJ = PENDIENTE (ya avanzó en siniestro)"
          />
          {(kpis.slaVencido > 0 || kpis.fueraDeZona > 0) && (
            <div className="flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              SLA vencidos: {kpis.slaVencido} · Fuera de zona: {kpis.fueraDeZona}
            </div>
          )}
        </div>
      </section>

      {/* Bloque 2 — AJ */}
      <section className="rounded-xl border border-fenix-borde/60 bg-red-50/30 p-4 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-fenix-primario">
            2 · Estado de siniestro (AJ)
          </p>
          <p className="text-xs text-gray-500">
            Mismo criterio del boletín diario · fila «Estado del siniestro».
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ESTADOS_SINIESTRO_ALFA.map((estado) => (
            <KpiCard
              key={estado}
              label={estado}
              value={porSiniestro[estado] || 0}
              accent={estado === 'PENDIENTE'}
              hint={
                estado === 'PENDIENTE'
                  ? 'Pendientes AJ · misma fila del boletín'
                  : estado === 'INSPECCIONADO PENDIENTE'
                    ? 'No suma como Pendiente AJ'
                    : undefined
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DashboardSegurosAlfa() {
  const [casos, setCasos] = useState([]);
  const fetchCasos = useCallback(async () => {
    const lista = await fetchAllCasosAlfa();
    setCasos(lista);
    return lista;
  }, []);

  const casosVisibles = useMemo(
    () => filtrarCasosPorAsignacionUsuario(casos, { modulo: 'alfa' }),
    [casos]
  );

  return (
    <div className="min-h-full w-full">
      <div className="px-4 pt-4 sm:px-6">
        <AlfaKpisGestionStrip casos={casosVisibles} />
      </div>
      <DashboardCatastrofico
        badge="Seguros Alfa"
        modulo="alfa"
        fetchCasos={fetchCasos}
        formatCurrency={formatCurrency}
        fechaEnRango={fechaEnRango}
        coincideFiltroTexto={coincideFiltroTexto}
        buildOpcionesFiltro={buildOpcionesFiltro}
        estados={ESTADOS_ALFA}
        estadosGestion={ESTADOS_GESTION_ALFA}
        normalizarEstadoFn={(estado, caso) => homologarEstadoSiniestroAlfa(estado, caso)}
        normalizarEstadoGestionFn={(_estadoGestion, caso = {}) =>
          sincronizarGestionConCierreSiniestroAlfa(
            homologarEstadoSiniestroAlfa(caso.estado, caso),
            caso.estadoGestion || caso.estado
          )
        }
        esCasoActivoFn={(caso) => esActivoAjAlfa(caso)}
        filtroPorAjustador={(caso) => esPendienteAjAlfa(caso)}
        chartTitleByAdjuster="Pendientes AJ por ajustador"
        chartSeriesByAdjuster="Pendientes AJ"
        chartTitleByInspector="Pendientes AJ por inspector"
        chartSeriesByInspector="Pendientes AJ"
        kpiActivosHint={(activos) =>
          `Activos AJ: ${activos} (PENDIENTE + INSPECCIONADO PENDIENTE · boletín)`
        }
        i18nNs="segurosAlfa"
        boletinPath="/seguros-alfa/boletin-diario"
      />
    </div>
  );
}
