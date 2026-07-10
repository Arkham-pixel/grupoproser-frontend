import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex } from '../services/complexService';
import { obtenerResponsables, obtenerAseguradoras } from '../services/riesgoService';
import Loader from './Loader';
import { useTheme } from '../context/ThemeContext';
import {
  agruparIndicadoresProtocolo,
  calcularIndicadoresProtocoloGlobales,
  combinarCasosComplex,
  filtrarCasosProtocolo,
  formatearTiempoPromedio,
  FECHA_INICIO_PROTOCOLO_COMPLEX_LABEL,
  resolverGrupoAjustador,
  resolverGrupoCompania,
  resolverGrupoRamo,
} from '../utils/complexTrazabilidadUtils.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
  complexSectionTitle,
  complexTableHead,
  complexTableSimple,
  complexTableWrap,
  complexBtnGhost,
  complexCard,
  getFenixChartColor,
} from './SubcomponenteCompex/complexFenixUi.js';
import {
  Campo,
  ComplexChartCard,
  ComplexChartPlot,
  ComplexFilterSection,
  ComplexMetricCard,
  ComplexPageHeader,
  InputFenix,
  SelectFenix,
} from './SubcomponenteCompex/ComplexUiBlocks.jsx';
import { useProtocoloSiniestros } from '../hooks/useProtocoloSiniestros.js';
import {
  INDICADORES_PROTOCOLO_DEF,
  NOTAS_IMPLEMENTACION_PROTOCOLO,
  PROTOCOLO_DOCUMENTO,
  PROTOCOLO_OBJETIVO,
  RESUMEN_PLAZOS_PROTOCOLO,
  TIEMPOS_OBJETIVO_SERVICIO,
  plazoObjetivoIndicador,
} from '../config/protocoloSiniestrosDefaults.js';
import {
  agruparCumplimientoProtocolo,
  calcularCumplimientoProtocoloGlobales,
  claseColorCumplimiento,
  colorBarraCumplimiento,
  datosChartCumplimientoProtocolo,
  formatearPorcentajeCumplimiento,
} from '../utils/complexProtocoloCumplimientoUtils.js';

const ETAPAS_DESGLOSE = INDICADORES_PROTOCOLO_DEF.filter((item) => item.etapaId).map((def, index) => ({
  clave: def.clave,
  muestra: def.muestra,
  label: def.label,
  desdeLegible: def.desdeLegible || def.label.split('→')[0]?.trim() || '',
  hastaLegible: def.hastaLegible || def.label.split('→')[1]?.trim() || '',
  plazoLegible: def.plazoLegible || def.plazoObjetivo || '',
  plazoObjetivo: def.plazoObjetivo || '',
  orden: index + 1,
}));

const MODOS_TABLA_DESGLOSE = [
  { value: 'resumen', label: 'Vista resumen' },
  { value: 'detalle', label: 'Vista detallada' },
];

const VISTAS = [
  { value: 'ajustador', label: 'Por ajustador' },
  { value: 'compania', label: 'Por compañía' },
  { value: 'ramo', label: 'Por ramo' },
];

function formatearEtiquetaPeriodo(fechaDesde, fechaHasta) {
  const formatear = (valor) => {
    if (!valor) return null;
    const [year, month, day] = valor.split('-').map(Number);
    if (!year || !month || !day) return valor;
    return new Date(year, month - 1, day).toLocaleDateString('es-CO');
  };

  const desde = formatear(fechaDesde) || FECHA_INICIO_PROTOCOLO_COMPLEX_LABEL;
  const hasta = formatear(fechaHasta);
  return hasta ? `${desde} – ${hasta}` : `desde ${desde}`;
}

function CeldaPromedio({ valor, muestra }) {
  return (
    <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
      {formatearTiempoPromedio(valor)}
      {muestra > 0 && <span className="ml-1 text-xs text-gray-400">({muestra})</span>}
    </td>
  );
}

function CeldaCumplimiento({ datos, className = '' }) {
  if (!datos || datos.evaluables === 0) {
    return <td className={`px-3 py-3 text-right tabular-nums text-gray-400 ${className}`}>—</td>;
  }

  return (
    <td
      className={`px-3 py-3 text-right tabular-nums whitespace-nowrap ${claseColorCumplimiento(datos.porcentaje)} ${className}`}
      title={`${datos.cumplidos} de ${datos.evaluables} etapas en plazo`}
    >
      {formatearPorcentajeCumplimiento(datos.porcentaje)}
      <span className="ml-1 text-xs font-normal text-gray-400">
        ({datos.cumplidos}/{datos.evaluables})
      </span>
    </td>
  );
}

function EncabezadoEtapaTabla({ etapa }) {
  return (
    <th
      className="align-top border-l border-gray-200 px-2 py-2 text-left dark:border-gray-700 min-w-[132px] max-w-[152px]"
      title={etapa.label}
    >
      <span className="inline-block rounded-md bg-fenix-primario/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fenix-primario">
        Paso {etapa.orden}
      </span>
      <p className="mt-1.5 text-[11px] font-semibold leading-snug text-gray-800 dark:text-gray-100">
        De {etapa.desdeLegible}
      </p>
      <p className="text-[11px] leading-snug text-gray-600 dark:text-gray-300">
        a {etapa.hastaLegible}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
        Plazo protocolo: {etapa.plazoLegible}
      </p>
    </th>
  );
}

function CeldaEtapaResumen({ valor, muestra, cumplimiento, plazoObjetivo }) {
  return (
    <td
      className="px-2 py-2.5 text-right align-top min-w-[96px] border-l border-gray-100 dark:border-gray-800"
      title={plazoObjetivo || undefined}
    >
      <p className="font-medium tabular-nums text-sm text-gray-900 dark:text-gray-100">
        {formatearTiempoPromedio(valor)}
      </p>
      {cumplimiento?.evaluables > 0 ? (
        <p
          className={`mt-0.5 text-xs tabular-nums font-semibold ${claseColorCumplimiento(cumplimiento.porcentaje)}`}
          title={`${cumplimiento.cumplidos} de ${cumplimiento.evaluables} en plazo`}
        >
          {formatearPorcentajeCumplimiento(cumplimiento.porcentaje)}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-gray-400">Sin %</p>
      )}
      {muestra > 0 && (
        <p className="mt-0.5 text-[10px] text-gray-400 tabular-nums">{muestra} caso(s)</p>
      )}
    </td>
  );
}

function TarjetaEtapaConsolidado({ etapa, valor, muestra, cumplimiento, protocolo }) {
  const pct = cumplimiento?.evaluables > 0 ? cumplimiento.porcentaje : null;

  return (
    <div
      className="flex min-w-[176px] max-w-[196px] shrink-0 flex-col rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#1A1A1A]"
      title={`Objetivo: ${plazoObjetivoIndicador(etapa.clave, protocolo)}`}
    >
      <span className="inline-block w-fit rounded-md bg-fenix-primario/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fenix-primario">
        Paso {etapa.orden}
      </span>
      <p className="mt-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
        De {etapa.desdeLegible}
      </p>
      <p className="text-sm leading-snug text-gray-600 dark:text-gray-300">
        a {etapa.hastaLegible}
      </p>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        Plazo: {etapa.plazoLegible}
      </p>
      <p className="mt-2 font-accent text-lg font-bold tabular-nums text-gray-900 dark:text-white">
        {formatearTiempoPromedio(valor)}
      </p>
      {pct != null ? (
        <p className={`mt-1 text-sm font-semibold tabular-nums ${claseColorCumplimiento(pct)}`}>
          {formatearPorcentajeCumplimiento(pct)}
          <span className="ml-1 text-xs font-normal text-gray-400">
            ({cumplimiento.cumplidos}/{cumplimiento.evaluables})
          </span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-400">Sin datos de cumplimiento</p>
      )}
      {muestra > 0 && (
        <p className="mt-1 text-[10px] text-gray-400">{muestra} caso(s) medidos</p>
      )}
    </div>
  );
}

function FilaDesgloseTabla({
  fila,
  modoTabla,
  esConsolidado = false,
}) {
  const filaClass = esConsolidado
    ? 'border-b-2 border-fenix-primario/30 bg-fenix-primario/5 dark:bg-red-950/20 font-semibold'
    : 'border-b border-gray-100 dark:border-gray-800';

  const celdaGrupoClass = esConsolidado
    ? 'px-3 py-3 font-bold sticky left-0 bg-red-50 dark:bg-[#221010] z-10 text-fenix-primario'
    : 'px-3 py-3 font-medium sticky left-0 bg-white dark:bg-[#1A1A1A] z-10';

  return (
    <tr className={filaClass}>
      <td className={celdaGrupoClass}>{fila.nombre}</td>
      <td className="px-3 py-3 text-right tabular-nums">{fila.totalCasos}</td>
      <CeldaCumplimiento datos={fila.cumplimiento?.general} className={esConsolidado ? 'font-semibold' : ''} />
      {modoTabla === 'resumen' ? (
        ETAPAS_DESGLOSE.map((etapa) => (
          <CeldaEtapaResumen
            key={etapa.muestra}
            valor={fila[etapa.clave]}
            muestra={fila.muestras?.[etapa.muestra]}
            cumplimiento={fila.cumplimiento?.[etapa.muestra]}
            plazoObjetivo={etapa.plazoObjetivo}
          />
        ))
      ) : (
        <>
          {ETAPAS_DESGLOSE.map((col) => (
            <CeldaPromedio
              key={col.clave}
              valor={fila[col.clave]}
              muestra={fila.muestras?.[col.muestra]}
            />
          ))}
          {ETAPAS_DESGLOSE.map((col) => (
            <CeldaCumplimiento
              key={`pct-${col.muestra}`}
              datos={fila.cumplimiento?.[col.muestra]}
            />
          ))}
        </>
      )}
      <td className="px-3 py-3 text-right tabular-nums">{fila.cerradosPeriodo}</td>
      <td
        className={`px-3 py-3 text-right tabular-nums ${
          fila.pendientesDocs30Dias > 0
            ? 'font-semibold text-amber-600 dark:text-amber-400'
            : ''
        }`}
      >
        {fila.pendientesDocs30Dias}
      </td>
    </tr>
  );
}

const IndicadoresProtocoloComplex = ({ embedded = false }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { protocolo } = useProtocoloSiniestros();

  const [casos, setCasos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('2025-10-01');
  const [fechaHasta, setFechaHasta] = useState('');
  const [vista, setVista] = useState('ajustador');
  const [modoTablaDesglose, setModoTablaDesglose] = useState('resumen');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [siniestrosData, complexData, responsablesData, aseguradorasData] =
          await Promise.allSettled([
            getSiniestrosEnriquecidos(),
            obtenerCasosComplex(),
            obtenerResponsables(),
            obtenerAseguradoras(),
          ]);

        const siniestros =
          siniestrosData.status === 'fulfilled' && Array.isArray(siniestrosData.value)
            ? siniestrosData.value
            : [];
        const complex =
          complexData.status === 'fulfilled' && Array.isArray(complexData.value)
            ? complexData.value
            : [];

        setCasos(combinarCasosComplex(siniestros, complex));

        const resp =
          responsablesData.status === 'fulfilled'
            ? responsablesData.value?.success && responsablesData.value?.data
              ? responsablesData.value.data
              : Array.isArray(responsablesData.value)
                ? responsablesData.value
                : []
            : [];
        setResponsables(resp);

        const aseg =
          aseguradorasData.status === 'fulfilled'
            ? aseguradorasData.value?.success && aseguradorasData.value?.data
              ? aseguradorasData.value.data
              : Array.isArray(aseguradorasData.value)
                ? aseguradorasData.value
                : []
            : [];
        setAseguradoras(aseg);
      } catch (error) {
        console.error('Error cargando indicadores de protocolo:', error);
        setCasos([]);
        setResponsables([]);
        setAseguradoras([]);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const getNombreResponsable = (caso) => {
    if (
      caso.nombreResponsable &&
      caso.nombreResponsable !== 'Sin asignar' &&
      caso.nombreResponsable.toLowerCase() !== 'sin asignar'
    ) {
      return caso.nombreResponsable;
    }

    const codigo = caso.codiRespnsble ?? caso.codi_responble ?? caso.responsable;
    if (!codigo || codigo === 'Sin asignar') return 'Sin asignar';

    const responsable = responsables.find(
      (r) =>
        String(r.codiRespnsble) === String(codigo) ||
        String(r.codigo) === String(codigo) ||
        r.nmbrRespnsble === String(codigo) ||
        r.nombre === String(codigo)
    );

    return responsable?.nmbrRespnsble || responsable?.nombre || String(codigo);
  };

  const getNombreCompania = (codigo) => {
    if (!codigo) return 'Sin compañía';
    const aseg = aseguradoras.find((a) => {
      const cod1 = a.cod1Asgrdra ? String(a.cod1Asgrdra).trim() : '';
      const codi = a.codiAsgrdra ? String(a.codiAsgrdra).trim() : '';
      const buscado = String(codigo).trim();
      return cod1 === buscado || codi === buscado;
    });
    return aseg?.rzonSocial || String(codigo);
  };

  const periodoFiltro = useMemo(
    () => ({ fechaDesde, fechaHasta }),
    [fechaDesde, fechaHasta]
  );

  const casosFiltrados = useMemo(
    () => filtrarCasosProtocolo(casos, fechaDesde, fechaHasta),
    [casos, fechaDesde, fechaHasta]
  );

  const indicadoresGlobales = useMemo(
    () => calcularIndicadoresProtocoloGlobales(casosFiltrados, periodoFiltro),
    [casosFiltrados, periodoFiltro]
  );

  const resolverGrupo = useMemo(() => {
    if (vista === 'compania') {
      return (caso) => resolverGrupoCompania(caso, getNombreCompania);
    }
    if (vista === 'ramo') {
      return (caso) => resolverGrupoRamo(caso);
    }
    return (caso, catalogo) =>
      resolverGrupoAjustador(caso, catalogo, getNombreResponsable);
  }, [vista, responsables, aseguradoras]);

  const filasDesglose = useMemo(
    () =>
      agruparIndicadoresProtocolo(casosFiltrados, resolverGrupo, {
        periodo: periodoFiltro,
        catalogoResponsables: responsables,
      }),
    [casosFiltrados, resolverGrupo, periodoFiltro, responsables]
  );

  const cumplimientoGlobales = useMemo(
    () => calcularCumplimientoProtocoloGlobales(casosFiltrados, protocolo),
    [casosFiltrados, protocolo]
  );

  const cumplimientoPorGrupo = useMemo(() => {
    const filas = agruparCumplimientoProtocolo(
      casosFiltrados,
      resolverGrupo,
      protocolo,
      { catalogoResponsables: responsables }
    );
    return Object.fromEntries(filas.map((fila) => [fila.clave, fila]));
  }, [casosFiltrados, resolverGrupo, protocolo, responsables]);

  const filasDesgloseConCumplimiento = useMemo(
    () =>
      filasDesglose.map((fila) => {
        const cumplimiento =
          cumplimientoPorGrupo[fila.clave] || cumplimientoPorGrupo[fila.nombre];
        return cumplimiento ? { ...fila, cumplimiento } : fila;
      }),
    [filasDesglose, cumplimientoPorGrupo]
  );

  const etiquetaVista =
    VISTAS.find((v) => v.value === vista)?.label || 'Desglose';
  const etiquetaPeriodo = formatearEtiquetaPeriodo(fechaDesde, fechaHasta);

  const filaConsolidado = useMemo(
    () => ({
      nombre: 'TOTAL GENERAL',
      totalCasos: indicadoresGlobales.totalCasos,
      cerradosPeriodo: indicadoresGlobales.cerradosPeriodo,
      pendientesDocs30Dias: indicadoresGlobales.pendientesDocs30Dias,
      muestras: indicadoresGlobales.muestras,
      cumplimiento: cumplimientoGlobales,
      ...ETAPAS_DESGLOSE.reduce((acc, col) => {
        acc[col.clave] = indicadoresGlobales[col.clave];
        return acc;
      }, {}),
    }),
    [indicadoresGlobales, cumplimientoGlobales]
  );

  const etiquetaGrupo =
    vista === 'ajustador' ? 'Ajustador' : vista === 'compania' ? 'Compañía' : 'Ramo';

  const columnasTablaResumen = ETAPAS_DESGLOSE.length + 5;
  const columnasTablaDetalle = ETAPAS_DESGLOSE.length * 2 + 5;

  const chartDocs30 = useMemo(
    () =>
      filasDesglose
        .filter((f) => f.pendientesDocs30Dias > 0)
        .slice(0, 12)
        .map((f) => ({
          nombre: f.nombre.length > 22 ? `${f.nombre.slice(0, 20)}…` : f.nombre,
          nombreCompleto: f.nombre,
          cantidad: f.pendientesDocs30Dias,
        })),
    [filasDesglose]
  );

  const chartCumplimiento = useMemo(
    () => datosChartCumplimientoProtocolo(cumplimientoGlobales, INDICADORES_PROTOCOLO_DEF),
    [cumplimientoGlobales]
  );

  const limpiarFiltros = () => {
    setFechaDesde('2025-10-01');
    setFechaHasta('');
  };

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };
  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';

  if (loading) {
    return embedded ? <Loader /> : (
      <div className={complexDashboardRoot}>
        <Loader />
      </div>
    );
  }

  const contenido = (
    <>
        {!embedded && (
          <ComplexPageHeader
            badge="Complex · Nuevo protocolo"
            title="Indicadores de gestión — Nuevo protocolo"
            subtitle={`${PROTOCOLO_DOCUMENTO}. Casos desde ${FECHA_INICIO_PROTOCOLO_COMPLEX_LABEL}.`}
            activePath="/complex/indicadores-alertas"
          />
        )}

        <ComplexFilterSection
          title="Filtros"
          showClear={Boolean(
            fechaHasta || fechaDesde !== '2025-10-01'
          )}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label="Desde">
              <InputFenix
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </Campo>
            <Campo label="Hasta">
              <InputFenix
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </Campo>
            <Campo label="Desglose">
              <SelectFenix value={vista} onChange={(e) => setVista(e.target.value)}>
                {VISTAS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          </div>
        </ComplexFilterSection>

        <section className="mb-6 rounded-xl border border-fenix-primario/20 bg-gray-50 p-4 dark:bg-gray-900/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">
            Protocolo oficial
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{PROTOCOLO_OBJETIVO}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RESUMEN_PLAZOS_PROTOCOLO.map((item) => (
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
            {NOTAS_IMPLEMENTACION_PROTOCOLO.map((nota) => (
              <li key={nota}>{nota}</li>
            ))}
          </ul>
        </section>

        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          Periodo {etiquetaPeriodo}: {indicadoresGlobales.totalCasos} caso(s) recibidos,{' '}
          {indicadoresGlobales.cerradosPeriodo} cerrados.
        </p>

        <section aria-label="Cumplimiento general">
          <h2 className={complexSectionTitle}>Cumplimiento vs protocolo</h2>
          <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
            Porcentaje de etapas completadas dentro del plazo oficial del protocolo. Cada indicador
            mide desde el hito anterior (solo el primer contacto parte de la asignación). Plazos en
            horas o días calendario según cada etapa. Solo casos con ambas fechas registradas.
          </p>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ComplexMetricCard
              label="Cumplimiento general"
              value={formatearPorcentajeCumplimiento(cumplimientoGlobales.general.porcentaje)}
              hint={`${cumplimientoGlobales.general.cumplidos} de ${cumplimientoGlobales.general.evaluables} etapas evaluadas en plazo`}
            />
            {INDICADORES_PROTOCOLO_DEF.filter((ind) => ind.etapaId).map((ind) => {
              const datos = cumplimientoGlobales[ind.muestra];
              return (
                <ComplexMetricCard
                  key={`cumpl-${ind.clave}`}
                  label={`% ${ind.label}`}
                  value={formatearPorcentajeCumplimiento(datos?.porcentaje)}
                  hint={`Objetivo protocolo: ${plazoObjetivoIndicador(ind.clave, protocolo)} · ${datos?.cumplidos ?? 0}/${datos?.evaluables ?? 0} en plazo`}
                />
              );
            })}
          </div>

          {chartCumplimiento.length > 0 && (
            <ComplexChartCard title="Cumplimiento por indicador (vs protocolo)">
              <ComplexChartPlot height={Math.max(280, chartCumplimiento.length * 44)}>
                <BarChart
                  data={chartCumplimiento}
                  layout="vertical"
                  margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
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
                    width={168}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, props) => [
                      formatearPorcentajeCumplimiento(value),
                      'Cumplimiento',
                    ]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      if (!item) return '';
                      return `${item.nombre} · Objetivo: ${plazoObjetivoIndicador(item.clave, protocolo)} · ${item.cumplidos}/${item.evaluables} en plazo`;
                    }}
                  />
                  <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartCumplimiento.map((item) => (
                      <Cell key={item.muestra} fill={colorBarraCumplimiento(item.porcentaje)} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}
        </section>

        <section aria-label="Promedios generales">
          <h2 className={complexSectionTitle}>Promedio general (vs. protocolo)</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {INDICADORES_PROTOCOLO_DEF.map((ind) => (
              <ComplexMetricCard
                key={ind.clave}
                label={ind.label}
                value={formatearTiempoPromedio(indicadoresGlobales[ind.clave])}
                hint={`Objetivo: ${plazoObjetivoIndicador(ind.clave, protocolo)} · ${indicadoresGlobales.muestras[ind.muestra]} caso(s) con ambas fechas`}
              />
            ))}
          </div>
        </section>

        <section aria-label="Indicadores operativos" className="mt-6">
          <h2 className={complexSectionTitle}>Indicadores operativos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ComplexMetricCard
              label="Cerrados (facturado)"
              value={String(indicadoresGlobales.cerradosPeriodo)}
              hint="Estado FACTURADO entre los casos del periodo"
            />
            <ComplexMetricCard
              label="Pendientes de documentos"
              value={String(indicadoresGlobales.casosEsperaDocumentos)}
              hint="Sin último documento ni informe final, con inspección o solicitud de docs."
            />
            <ComplexMetricCard
              label="Docs. pendientes > 30 días"
              value={String(indicadoresGlobales.pendientesDocs30Dias)}
              hint="En espera de documentos con más de 30 días desde solicitud o inspección."
            />
          </div>
        </section>

        <section aria-label="Consolidado general" className="mt-8">
          <h2 className={complexSectionTitle}>Consolidado general</h2>
          <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
            Resumen del periodo {etiquetaPeriodo}. Cada etapa muestra el tiempo promedio y el %
            de cumplimiento vs. protocolo, en la secuencia de hitos del caso.
          </p>

          <div className={`${complexCard} mb-6`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ComplexMetricCard
                label="Casos en el periodo"
                value={String(indicadoresGlobales.totalCasos)}
                hint="Asignados en el rango de fechas filtrado."
              />
              <ComplexMetricCard
                label="Cumplimiento general"
                value={formatearPorcentajeCumplimiento(cumplimientoGlobales.general.porcentaje)}
                hint={`${cumplimientoGlobales.general.cumplidos} de ${cumplimientoGlobales.general.evaluables} etapas en plazo`}
              />
              <ComplexMetricCard
                label="Cerrados (facturado)"
                value={String(indicadoresGlobales.cerradosPeriodo)}
                hint="Estado FACTURADO"
                hint="Con finiquito dentro del rango de fechas."
              />
              <ComplexMetricCard
                label="Docs. pendientes > 30 días"
                value={String(indicadoresGlobales.pendientesDocs30Dias)}
                hint="Casos en espera de documentación con más de 30 días."
              />
            </div>

            <div className="mt-6">
              <p className="mb-3 font-body text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Secuencia de etapas — tiempo promedio y cumplimiento
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {ETAPAS_DESGLOSE.map((etapa) => (
                  <TarjetaEtapaConsolidado
                    key={etapa.muestra}
                    etapa={etapa}
                    valor={indicadoresGlobales[etapa.clave]}
                    muestra={indicadoresGlobales.muestras[etapa.muestra]}
                    cumplimiento={cumplimientoGlobales[etapa.muestra]}
                    protocolo={protocolo}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Desglose gerencial" className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={`${complexSectionTitle} mb-0`}>{etiquetaVista}</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Modo de tabla">
              {MODOS_TABLA_DESGLOSE.map((modo) => (
                <button
                  key={modo.value}
                  type="button"
                  onClick={() => setModoTablaDesglose(modo.value)}
                  className={`${complexBtnGhost} ${
                    modoTablaDesglose === modo.value
                      ? 'border-fenix-primario bg-fenix-primario/10 text-fenix-primario dark:border-red-500 dark:bg-red-950/30 dark:text-red-400'
                      : ''
                  }`}
                >
                  {modo.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {modoTablaDesglose === 'resumen'
              ? 'Vista resumen: cada columna de etapa combina tiempo promedio (arriba) y % de cumplimiento (abajo). La primera fila es el consolidado general.'
              : 'Vista detallada: columnas separadas de tiempos y porcentajes por etapa. La primera fila es el consolidado general.'}
          </p>

          <div className={complexTableWrap}>
            <table
              className={`${complexTableSimple} ${
                modoTablaDesglose === 'detalle' ? 'min-w-[2200px]' : 'min-w-[1400px]'
              }`}
            >
              <thead>
                {modoTablaDesglose === 'resumen' ? (
                  <tr className={complexTableHead}>
                    <th className="text-left sticky left-0 bg-inherit z-10">{etiquetaGrupo}</th>
                    <th className="text-right">Casos</th>
                    <th className="text-right align-top">Cumplimiento</th>
                    {ETAPAS_DESGLOSE.map((etapa) => (
                      <EncabezadoEtapaTabla key={etapa.muestra} etapa={etapa} />
                    ))}
                    <th className="text-right align-top">Casos cerrados</th>
                    <th className="text-right align-top">Documentos pendientes (+30 días)</th>
                  </tr>
                ) : (
                  <>
                    <tr className={complexTableHead}>
                      <th rowSpan={2} className="text-left sticky left-0 bg-inherit z-10 align-bottom">
                        {etiquetaGrupo}
                      </th>
                      <th rowSpan={2} className="text-right align-bottom">
                        Casos
                      </th>
                      <th rowSpan={2} className="text-right align-bottom">
                        Cumplimiento
                      </th>
                      <th
                        colSpan={ETAPAS_DESGLOSE.length}
                        className="text-center border-b border-gray-200 dark:border-gray-700"
                      >
                        Tiempos promedio
                      </th>
                      <th
                        colSpan={ETAPAS_DESGLOSE.length}
                        className="text-center border-b border-gray-200 dark:border-gray-700"
                      >
                        % Cumplimiento vs protocolo
                      </th>
                      <th rowSpan={2} className="text-right align-bottom">
                        Casos cerrados
                      </th>
                      <th rowSpan={2} className="text-right align-bottom">
                        Docs. pendientes (+30 días)
                      </th>
                    </tr>
                    <tr className={complexTableHead}>
                      {ETAPAS_DESGLOSE.map((col) => (
                        <th key={col.clave} className="text-right align-top text-xs min-w-[120px]">
                          <span className="block font-semibold">{col.label}</span>
                          <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
                            Tiempo promedio
                          </span>
                        </th>
                      ))}
                      {ETAPAS_DESGLOSE.map((col) => (
                        <th key={`pct-${col.muestra}`} className="text-right align-top text-xs min-w-[120px]">
                          <span className="block font-semibold">{col.label}</span>
                          <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
                            % en plazo
                          </span>
                        </th>
                      ))}
                    </tr>
                  </>
                )}
              </thead>
              <tbody>
                {filasDesgloseConCumplimiento.length === 0 ? (
                  <tr>
                    <td
                      colSpan={modoTablaDesglose === 'resumen' ? columnasTablaResumen : columnasTablaDetalle}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      No hay casos del nuevo protocolo para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  <>
                    <FilaDesgloseTabla
                      fila={filaConsolidado}
                      modoTabla={modoTablaDesglose}
                      esConsolidado
                    />
                    {filasDesgloseConCumplimiento.map((fila) => (
                      <FilaDesgloseTabla
                        key={fila.nombre}
                        fila={fila}
                        modoTabla={modoTablaDesglose}
                      />
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
            Promedios redondeados a días u horas aproximadas (~). Porcentajes medidos
            contra el plazo del protocolo. Entre paréntesis en vista detallada: etapas evaluables.
            Objetivos:{' '}
            {TIEMPOS_OBJETIVO_SERVICIO.map((t) => `${t.escenario} (${t.tiempo})`).join(' · ')}.
          </p>
        </section>

        {chartDocs30.length > 0 && (
          <section className="mt-8" aria-label="Documentos pendientes más de 30 días">
            <ComplexChartCard
              title={`Pendientes de documentos > 30 días — ${etiquetaVista.toLowerCase()}`}
            >
              <ComplexChartPlot height={Math.max(280, chartDocs30.length * 36)}>
                <BarChart
                  data={chartDocs30}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={140}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [value, 'Casos']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartDocs30.map((_, index) => (
                      <Cell key={index} fill={getFenixChartColor(index, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          </section>
        )}
    </>
  );

  if (embedded) return contenido;

  return (
    <div className={complexDashboardRoot}>
      <div className={`${complexScope} ${complexDashboardWrap}`}>
        {contenido}
      </div>
    </div>
  );
};

export default IndicadoresProtocoloComplex;
