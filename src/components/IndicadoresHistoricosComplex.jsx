import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex } from '../services/complexService';
import { obtenerResponsables } from '../services/riesgoService';
import Loader from './Loader';
import { useTheme } from '../context/ThemeContext';
import {
  combinarCasosComplex,
  calcularIndicadoresGlobales,
  calcularIndicadoresPorResponsable,
  filtrarCasosPorPeriodo,
  formatearTiempoPromedio,
  FECHA_INICIO_INDICADORES_COMPLEX_LABEL,
} from '../utils/complexTrazabilidadUtils.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
  complexSectionTitle,
  complexTableHead,
  complexTableSimple,
  complexTableWrap,
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

const INDICADORES_KPI = [
  {
    clave: 'promedioAsignacionContacto',
    muestra: 'asignacionContacto',
    titulo: 'Asignación → Primer contacto',
    descripcion: 'Tiempo desde que se recibe la asignación hasta el primer contacto con el asegurado.',
  },
  {
    clave: 'promedioContactoInspeccion',
    muestra: 'contactoInspeccion',
    titulo: 'Primer contacto → Inspección de campo',
    descripcion: 'Tiempo desde el contacto inicial hasta la inspección en sitio.',
  },
  {
    clave: 'promedioEtapaPreliminar',
    muestra: 'etapaPreliminar',
    titulo: 'Inspección o solicitud → Informe preliminar',
    descripcion:
      'Días hábiles desde la inspección o solicitud de documentos hasta el informe preliminar (excluye fines de semana y festivos).',
  },
  {
    clave: 'promedioUltimoDocInformeFinal',
    muestra: 'ultimoDocInformeFinal',
    titulo: 'Último documento acreditado → Informe final',
    descripcion:
      'Días hábiles desde la acreditación del último documento hasta el informe final (excluye fines de semana y festivos).',
  },
];

const IndicadoresHistoricosComplex = ({ embedded = false }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [casos, setCasos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('2025-01-01');
  const [fechaHasta, setFechaHasta] = useState('');
  const [responsableFiltro, setResponsableFiltro] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [siniestrosData, complexData, responsablesData] = await Promise.allSettled([
          getSiniestrosEnriquecidos(),
          obtenerCasosComplex(),
          obtenerResponsables(),
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
      } catch (error) {
        console.error('Error cargando indicadores históricos:', error);
        setCasos([]);
        setResponsables([]);
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
    if (caso.responsable_form && caso.responsable_form !== 'Sin asignar') {
      return caso.responsable_form;
    }
    if (caso.responsable && caso.responsable !== 'Sin asignar') {
      return caso.responsable;
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

  const casosFiltrados = useMemo(() => {
    let filtrados = filtrarCasosPorPeriodo(casos, fechaDesde, fechaHasta);

    if (responsableFiltro) {
      filtrados = filtrados.filter(
        (caso) => getNombreResponsable(caso) === responsableFiltro
      );
    }

    return filtrados;
  }, [casos, fechaDesde, fechaHasta, responsableFiltro, responsables]);

  const indicadoresGlobales = useMemo(
    () => calcularIndicadoresGlobales(casosFiltrados),
    [casosFiltrados]
  );

  const indicadoresPorResponsable = useMemo(
    () =>
      calcularIndicadoresPorResponsable(casosFiltrados, getNombreResponsable, {
        catalogoResponsables: responsables,
      }),
    [casosFiltrados, responsables]
  );

  const responsablesUnicos = useMemo(() => {
    const nombres = new Set(['Sin asignar']);
    casos.forEach((caso) => {
      const nombre = getNombreResponsable(caso);
      if (nombre) nombres.add(nombre);
    });
    return Array.from(nombres)
      .sort((a, b) => {
        if (a === 'Sin asignar') return -1;
        if (b === 'Sin asignar') return 1;
        return a.localeCompare(b);
      })
      .map((nombre) => ({ value: nombre, label: nombre }));
  }, [casos, responsables]);

  const chartEsperaDocumentos = useMemo(
    () =>
      indicadoresPorResponsable
        .filter((r) => r.casosEsperaDocumentos > 0)
        .slice(0, 12)
        .map((r) => ({
          nombre: r.nombre.length > 22 ? `${r.nombre.slice(0, 20)}…` : r.nombre,
          nombreCompleto: r.nombre,
          cantidad: r.casosEsperaDocumentos,
        })),
    [indicadoresPorResponsable]
  );

  const limpiarFiltros = () => {
    setFechaDesde('2025-01-01');
    setFechaHasta('');
    setResponsableFiltro('');
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
            badge="Complex"
            title="Indicadores históricos de gestión"
            subtitle={`Tiempos de trazabilidad desde ${FECHA_INICIO_INDICADORES_COMPLEX_LABEL} a la fecha. Los promedios se calculan por responsable (ajustador asignado al caso).`}
            activePath="/complex/indicadores-alertas"
          />
        )}

        <ComplexFilterSection
          title="Filtros de búsqueda"
          showClear={Boolean(fechaHasta || responsableFiltro || fechaDesde !== '2025-01-01')}
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
            <Campo label="Responsable">
              <SelectFenix value={responsableFiltro} onChange={(e) => setResponsableFiltro(e.target.value)}>
                <option value="">Todos</option>
                {responsablesUnicos.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          </div>
        </ComplexFilterSection>

        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {indicadoresGlobales.totalCasos} siniestro(s) en el periodo seleccionado
          {responsableFiltro ? ` · filtrado por ${responsableFiltro}` : ''}.
        </p>

        <section aria-label="Indicadores globales">
          <h2 className={complexSectionTitle}>Resumen del periodo</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {INDICADORES_KPI.map((ind) => (
              <ComplexMetricCard
                key={ind.clave}
                label={ind.titulo}
                value={formatearTiempoPromedio(indicadoresGlobales[ind.clave])}
                hint={`${indicadoresGlobales.muestras[ind.muestra]} caso(s) con ambas fechas · ${ind.descripcion}`}
              />
            ))}
            <ComplexMetricCard
              label="Cerrados (facturado)"
              value={String(indicadoresGlobales.cerradosPeriodo ?? 0)}
              hint="Casos con estado FACTURADO en el periodo (cierre operativo del área)."
            />
            <ComplexMetricCard
              label="En espera de documentos"
              value={String(indicadoresGlobales.casosEsperaDocumentos)}
              hint="Siniestros con inspección o solicitud de documentos realizada, sin último documento ni informe final (estado actual)."
            />
          </div>
        </section>

        <section aria-label="Indicadores por responsable" className="mt-8">
          <h2 className={complexSectionTitle}>Desglose por responsable</h2>
          <div className={complexTableWrap}>
            <table className={complexTableSimple}>
              <thead>
                <tr className={complexTableHead}>
                  <th className="text-left">Responsable</th>
                  <th className="text-right">Casos</th>
                  <th className="text-right">Asignación → Primer contacto</th>
                  <th className="text-right">Primer contacto → Inspección</th>
                  <th className="text-right">Inspección o solicitud → Preliminar</th>
                  <th className="text-right">Último documento → Informe final</th>
                  <th className="text-right">Espera docs.</th>
                </tr>
              </thead>
              <tbody>
                {indicadoresPorResponsable.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      No hay casos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  indicadoresPorResponsable.map((fila) => (
                    <tr
                      key={fila.nombre}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 font-medium">{fila.nombre}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fila.totalCasos}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatearTiempoPromedio(fila.promedioAsignacionContacto)}
                        {fila.muestras.asignacionContacto > 0 && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({fila.muestras.asignacionContacto})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatearTiempoPromedio(fila.promedioContactoInspeccion)}
                        {fila.muestras.contactoInspeccion > 0 && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({fila.muestras.contactoInspeccion})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatearTiempoPromedio(fila.promedioEtapaPreliminar)}
                        {fila.muestras.etapaPreliminar > 0 && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({fila.muestras.etapaPreliminar})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatearTiempoPromedio(fila.promedioUltimoDocInformeFinal)}
                        {fila.muestras.ultimoDocInformeFinal > 0 && (
                          <span className="ml-1 text-xs text-gray-400">
                            ({fila.muestras.ultimoDocInformeFinal})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                        {fila.casosEsperaDocumentos}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
            Entre paréntesis: cantidad de casos con ambas fechas registradas para calcular el promedio.
          </p>
        </section>

        {chartEsperaDocumentos.length > 0 && (
          <section className="mt-8" aria-label="Gráfica espera de documentos">
            <ComplexChartCard title="Siniestros en espera de documentos por responsable">
              <ComplexChartPlot height={Math.max(280, chartEsperaDocumentos.length * 36)}>
                <BarChart
                  data={chartEsperaDocumentos}
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
                    formatter={(value) => [value, 'En espera']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartEsperaDocumentos.map((_, index) => (
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

export default IndicadoresHistoricosComplex;
