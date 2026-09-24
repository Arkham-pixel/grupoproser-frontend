import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import EstadoFranjas, {
  ResumenGerencial,
} from '../SubcomponenteDashboardCatastrofico/EstadoFranjas.jsx';
import { fetchAllCasosAlfa } from '../../services/segurosAlfaService.js';
import { filtrarCasosPorAsignacionUsuario } from '../../utils/permisosCasoPorRol.js';
import {
  BLOQUES_SUMA_ALFA,
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

const KPI_GESTION_FRANJAS = [
  { key: 'pteContacto', label: 'PTE CONTACTO', filtro: 'PTE CONTACTO' },
  { key: 'solicitudDtos', label: 'SOLICITUD DTOS', filtro: 'SOLICITUD DTOS' },
  { key: 'contactadoProgramado', label: 'CONTACTADO Y PROGRAMADO', filtro: 'CONTACTADO Y PROGRAMADO' },
  { key: 'inspeccionado', label: 'INSPECCIONADO', filtro: 'INSPECCIONADO' },
  { key: 'liquidado', label: 'LIQUIDADO', filtro: 'LIQUIDADO' },
  { key: 'sinRespuesta', label: 'SIN RESPUESTA EFECTIVA', filtro: 'SIN RESPUESTA EFECTIVA' },
  { key: 'cerrado', label: 'SIN PÓLIZA', filtro: 'SIN PÓLIZA' },
];

function AlfaKpisGestionStrip({
  casos = [],
  onFiltroGestion,
  onFiltroSiniestro,
}) {
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
  const pctAbiertos = totalCartera > 0 ? Math.round((abiertosAj / totalCartera) * 100) : 0;

  const franjasAi = useMemo(
    () =>
      KPI_GESTION_FRANJAS.map(({ key, label, filtro }) => ({
        clave: filtro,
        label,
        cantidad: kpis[key] ?? 0,
      })),
    [kpis]
  );

  const franjasAj = useMemo(
    () =>
      ESTADOS_SINIESTRO_ALFA.map((estado) => ({
        clave: estado,
        label: estado,
        cantidad: porSiniestro[estado] || 0,
        accent: estado === 'PENDIENTE',
        hint:
          estado === 'PENDIENTE'
            ? 'Pendientes AJ · misma fila del boletín'
            : estado === 'INSPECCIONADO PENDIENTE'
              ? 'No suma como Pendiente AJ'
              : undefined,
      })),
    [porSiniestro]
  );

  const atascoAi = useMemo(() => {
    if (!franjasAi.length) return null;
    return franjasAi.reduce((best, row) => (row.cantidad > (best?.cantidad || 0) ? row : best), null);
  }, [franjasAi]);

  const atascoAj = useMemo(() => {
    if (!franjasAj.length) return null;
    return franjasAj.reduce((best, row) => (row.cantidad > (best?.cantidad || 0) ? row : best), null);
  }, [franjasAj]);

  const hallazgos = useMemo(() => {
    const list = [];
    if (atascoAi && atascoAi.cantidad > 0 && totalCartera > 0) {
      const pct = Math.round((atascoAi.cantidad / totalCartera) * 100);
      list.push(`${pct}% de la cartera en «${atascoAi.label}» (gestión AI)`);
    }
    if (atascoAj && atascoAj.cantidad > 0) {
      list.push(`Mayor atasco AJ: ${atascoAj.label} (${atascoAj.cantidad} casos)`);
    }
    if (kpis.siniestroDefinido > 0 && totalCartera > 0) {
      const pct = Math.round((kpis.siniestroDefinido / totalCartera) * 100);
      list.push(`Siniestro definido: ${kpis.siniestroDefinido} (${pct}% ya avanzó en AJ)`);
    }
    return list.slice(0, 3);
  }, [atascoAi, atascoAj, kpis.siniestroDefinido, totalCartera]);

  const alertas = useMemo(() => {
    const list = [];
    if (kpis.slaVencido > 0) {
      list.push({ id: 'sla', label: `SLA vencidos: ${kpis.slaVencido}`, filtro: null });
    }
    if (kpis.fueraDeZona > 0) {
      list.push({ id: 'zona', label: `Fuera de zona: ${kpis.fueraDeZona}`, filtro: null });
    }
    if (kpis.sinRespuesta > 0) {
      list.push({
        id: 'sinRespuesta',
        label: `Sin respuesta efectiva: ${kpis.sinRespuesta}`,
        filtro: 'SIN RESPUESTA EFECTIVA',
        tipo: 'gestion',
      });
    }
    const cifras = porSiniestro['PENDIENTE ACEPTACIÓN CIFRAS'] || 0;
    if (cifras > 0) {
      list.push({
        id: 'cifras',
        label: `Pendiente aceptación cifras: ${cifras}`,
        filtro: 'PENDIENTE ACEPTACIÓN CIFRAS',
        tipo: 'siniestro',
      });
    }
    return list;
  }, [kpis, porSiniestro]);

  const handleAlerta = (alerta) => {
    if (!alerta?.filtro) return;
    if (alerta.tipo === 'gestion') onFiltroGestion?.(alerta.filtro);
    else onFiltroSiniestro?.(alerta.filtro);
  };

  return (
    <div className="mb-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-semibold text-gray-800 dark:text-gray-100">
            Tablero Alfa · tipificación dual
          </h2>
          <p className="text-xs text-gray-500">
            Clic en una franja o alerta para filtrar el dashboard operativo.
          </p>
        </div>
        <Link
          to="/seguros-alfa/boletin-diario"
          className="text-xs font-medium text-fenix-primario hover:underline"
        >
          Ver boletín diario (mismos ejes AI / AJ)
        </Link>
      </div>

      <ResumenGerencial
        titulo="Vista gerencial"
        lineas={[
          `Cartera visible: ${totalCartera}`,
          `Abiertos AJ: ${abiertosAj} (${pctAbiertos}%)`,
          kpis.slaVencido > 0 ? `SLA vencidos: ${kpis.slaVencido}` : null,
        ]}
        hallazgos={hallazgos}
        alertas={alertas}
        onAlertaClick={handleAlerta}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <EstadoFranjas
          titulo="1 · Estado de gestión (AI)"
          subtitulo="Cómo va el caso en operación (contactos, inspección, liquidación)."
          items={franjasAi}
          total={totalCartera}
          onSelect={(clave) => onFiltroGestion?.(clave)}
        />
        <EstadoFranjas
          titulo="2 · Estado de siniestro (AJ)"
          subtitulo="Mismo criterio del boletín diario · fila «Estado del siniestro»."
          items={franjasAj}
          total={totalCartera}
          onSelect={(clave) => onFiltroSiniestro?.(clave)}
        />
      </div>
    </div>
  );
}

export default function DashboardSegurosAlfa() {
  const [casos, setCasos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEstadoGestion, setFiltroEstadoGestion] = useState('');

  const fetchCasos = useCallback(async () => {
    const lista = await fetchAllCasosAlfa();
    setCasos(lista);
    return lista;
  }, []);

  const casosVisibles = useMemo(
    () => filtrarCasosPorAsignacionUsuario(casos, { modulo: 'alfa' }),
    [casos]
  );

  const aplicarFiltroGestion = useCallback((estado) => {
    setFiltroEstadoGestion(estado || '');
    setFiltroEstado('');
  }, []);

  const aplicarFiltroSiniestro = useCallback((estado) => {
    setFiltroEstado(estado || '');
    setFiltroEstadoGestion('');
  }, []);

  return (
    <div className="min-h-full w-full">
      <div className="px-4 pt-4 sm:px-6">
        <AlfaKpisGestionStrip
          casos={casosVisibles}
          onFiltroGestion={aplicarFiltroGestion}
          onFiltroSiniestro={aplicarFiltroSiniestro}
        />
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
        filtroEstadoControlado={filtroEstado}
        onFiltroEstadoChange={setFiltroEstado}
        filtroEstadoGestionControlado={filtroEstadoGestion}
        onFiltroEstadoGestionChange={setFiltroEstadoGestion}
        mostrarVistaGerencial={false}
        mostrarFranjasEstado={false}
        bloquesSuma={[...BLOQUES_SUMA_ALFA]}
      />
    </div>
  );
}
