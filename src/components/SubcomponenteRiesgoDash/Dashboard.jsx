import React, { useEffect, useState } from 'react';
import { obtenerCasosRiesgo, obtenerResponsables, obtenerEstados, obtenerAseguradoras, obtenerCiudades } from '../../services/riesgoService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import Loader from '../Loader';
import { useTheme } from '../../context/ThemeContext';
import {
  buildPieLegendPayload,
  FENIX_PALETTE,
  getFenixChartColor,
  getFenixLineChartColors,
  riesgoFilterActiveBox,
  riesgoFilterChip,
  riesgoKpiCardAlert,
  riesgoKpiCardOk,
  riesgoMetricCard,
  riesgoPageWrapWide,
  riesgoReportRoot,
  riesgoScope,
  riesgoSectionTitle,
  riesgoTableRowEven,
  riesgoTableRowOdd,
  riesgoTableTd,
  riesgoTableTh,
} from '../SubcomponentesRiesgo/riesgoFenixUi.js';
import {
  Campo,
  InputFenix,
  RiesgoChartCard,
  RiesgoFilterSection,
  RiesgoMetricCard,
  RiesgoNavPanel,
  RiesgoPageHeader,
  SelectFenix,
} from '../SubcomponentesRiesgo/RiesgoUiBlocks.jsx';
import {
  calcularCumplimientoPorResponsable,
  calcularHistoricosPendientesCorreccion,
  calcularRetrasosPorEtapa,
  FECHA_INICIO_ARNALD_RIESGO_LABEL,
  resumirSegmentacionTrazabilidad,
} from '../../utils/riesgoTrazabilidadUtils.js';
import {
  elegirNombreMostrarResponsable,
  resolverAgrupacionCaso,
} from '../../utils/responsableAgrupacionUtils.js';

const Dashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [responsableFiltro, setResponsableFiltro] = useState("");
  const [aseguradoraFiltro, setAseguradoraFiltro] = useState("");
  const [estados, setEstados] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [ciudades, setCiudades] = useState([]);

  // Helper para mostrar nombre de estado
  const getEstadoNombre = codigo => {
    if (!codigo || codigo === 'null' || codigo === 'undefined' || codigo === '') return 'Sin estado';
    if (!estados || estados.length === 0) return String(codigo);
    
    // Buscar por codiEstdo
    let est = estados.find(e => {
      if (!e) return false;
      const codigoEstado = e.codiEstdo || e.codiEstado || e.codigo;
      return String(codigoEstado) === String(codigo);
    });
    
    // Si no se encuentra, retornar el código
    if (!est) return String(codigo);
    
    // Retornar la descripción del estado
    return est.descEstdo || est.descEstado || est.descripcion || est.nombre || String(codigo);
  };
  // Helper para mostrar nombre de responsable
  const getResponsableNombre = codigo => {
    if (!codigo || codigo === 'null' || codigo === 'undefined' || codigo === '') return 'Sin asignar';
    if (!responsables || responsables.length === 0) return codigo;
    
    // Convertir a string y limpiar
    const codigoLimpio = String(codigo).trim();
    
    // Buscar por codiRespnsble (comparación exacta)
    let resp = responsables.find(r => {
      if (!r || !r.codiRespnsble) return false;
      const codigoResp = String(r.codiRespnsble).trim();
      return codigoResp === codigoLimpio;
    });
    
    // Si no se encuentra, intentar búsqueda más flexible (sin espacios, case insensitive)
    if (!resp) {
      resp = responsables.find(r => {
        if (!r || !r.codiRespnsble) return false;
        const codigoResp = String(r.codiRespnsble).trim().replace(/\s+/g, '');
        const codigoBuscado = codigoLimpio.replace(/\s+/g, '');
        return codigoResp === codigoBuscado;
      });
    }
    
    // Retornar el nombre si se encontró, de lo contrario el código original
    if (resp && resp.nmbrRespnsble) {
      return resp.nmbrRespnsble;
    }
    
    return codigo;
  };
  
  // Helper para mostrar nombre de aseguradora
  const getAseguradoraNombre = codigo => {
    if (!codigo || codigo === 'null' || codigo === 'undefined' || codigo === '') return null;
    if (!aseguradoras || aseguradoras.length === 0) return null;
    
    // Buscar en la lista de aseguradoras
    const aseg = aseguradoras.find(a => {
      const cod1 = a.cod1Asgrdra ? String(a.cod1Asgrdra).trim() : '';
      const codi = a.codiAsgrdra ? String(a.codiAsgrdra).trim() : '';
      const codigoBuscado = String(codigo).trim();
      
      return cod1 === codigoBuscado || codi === codigoBuscado;
    });
    
    // Si se encontró, retornar el nombre (razón social)
    if (aseg && aseg.rzonSocial) {
      return aseg.rzonSocial;
    }
    
    // Si no se encontró, retornar null (no retornar el código)
    return null;
  };

  // Helper para mostrar nombre de ciudad
  const getCiudadNombre = codigo => {
    if (!codigo || codigo === 'null' || codigo === 'undefined' || codigo === '') return 'Sin ciudad';
    if (!ciudades || ciudades.length === 0) return String(codigo);
    
    // Convertir a string y limpiar
    const codigoLimpio = String(codigo).trim();
    
    // Buscar por codiPoblado, codiCpoblado, o codiMunicipio
    let ciudad = ciudades.find(c => {
      if (!c) return false;
      const codiPobl = c.codiPoblado ? String(c.codiPoblado).trim() : '';
      const codiCpobl = c.codiCpoblado ? String(c.codiCpoblado).trim() : '';
      const codiMuni = c.codiMunicipio ? String(c.codiMunicipio).trim() : '';
      
      return codiPobl === codigoLimpio || codiCpobl === codigoLimpio || codiMuni === codigoLimpio;
    });
    
    // Si se encontró, retornar el nombre (descripción)
    if (ciudad) {
      return ciudad.descCpoblado || ciudad.descPoblado || ciudad.descMunicipio || String(codigo);
    }
    
    // Si no se encontró, retornar el código original
    return String(codigo);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [data, estadosData, responsablesData, aseguradorasData, ciudadesData] = await Promise.all([
          obtenerCasosRiesgo(),
          obtenerEstados(),
          obtenerResponsables(),
          obtenerAseguradoras(),
          obtenerCiudades()
        ]);
        setEstados(Array.isArray(estadosData) ? estadosData : []);
        setResponsables(Array.isArray(responsablesData) ? responsablesData : []);
        setAseguradoras(Array.isArray(aseguradorasData) ? aseguradorasData : []);
        setCiudades(Array.isArray(ciudadesData) ? ciudadesData : []);
        const mapeados = Array.isArray(data) ? data.map(caso => ({
          ...caso,
          estado: caso.codiEstdo || caso.estado,
          aseguradora: caso.codiAsgrdra || caso.aseguradora, // CORRECCIÓN: usar codiAsgrdra en lugar de asgrBenfcro
          asegurado: caso.asgrBenfcro || caso.asegurado, // asgrBenfcro es el asegurado/beneficiario
          fecha_creacion: caso.fchaAsgncion || caso.fecha_creacion,
          fecha_cierre: caso.fchaInforme || caso.fecha_cierre,
          numero_siniestro: caso.nmroRiesgo || caso.numero_siniestro,
          responsable: caso.codiIspector || caso.responsable,
        })) : [];
        setCasos(mapeados);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className={riesgoReportRoot}>
        <div className={`${riesgoScope} ${riesgoPageWrapWide} flex min-h-[40vh] items-center justify-center`}>
          <Loader />
        </div>
      </div>
    );
  }

  // Filtros mejorados
  const casosFiltrados = casos.filter(caso => {
    let ok = true;
    
    // Filtro por fecha
    if (fechaDesde) {
      const f = caso.fecha_creacion ? new Date(caso.fecha_creacion) : null;
      if (!f || f < new Date(fechaDesde)) ok = false;
    }
    if (fechaHasta) {
      const f = caso.fecha_creacion ? new Date(caso.fecha_creacion) : null;
      if (!f || f > new Date(fechaHasta)) ok = false;
    }
    
    // Filtro por estado
    if (estadoFiltro) {
      ok = ok && String(caso.estado) === String(estadoFiltro);
    }
    
    // Filtro por responsable
    if (responsableFiltro) {
      ok = ok && String(caso.responsable) === String(responsableFiltro);
    }
    
    // Filtro por aseguradora - comparar con codiAsgrdra o cod1Asgrdra
    if (aseguradoraFiltro && aseguradoraFiltro !== '') {
      const codigoFiltro = String(aseguradoraFiltro).trim();
      const codigoCaso1 = caso.codiAsgrdra ? String(caso.codiAsgrdra).trim() : '';
      const codigoCaso2 = caso.aseguradora ? String(caso.aseguradora).trim() : '';
      
      // Comparar con ambos códigos posibles del caso
      ok = ok && (codigoCaso1 === codigoFiltro || codigoCaso2 === codigoFiltro);
    }
    return ok;
  });

  // Métricas
  const totalCasos = casosFiltrados.length;
  const estadosPendientes = ['PENDIENTE', 'EN PROCESO', 'SIN ASIGNAR', 1, 2, 3];
  const casosPendientes = casosFiltrados.filter(c => estadosPendientes.includes(c.estado)).length;
  const ultimosCasos = [...casosFiltrados]
    .sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
    .slice(0, 5);

  // Gráfico de barras → Casos por estado
  const casosPorEstado = Object.entries(
    casosFiltrados.reduce((acc, caso) => {
      const nombre = getEstadoNombre(caso.estado);
      // Filtrar estados undefined o inválidos
      if (nombre && nombre !== 'undefined' && nombre !== 'null' && nombre !== '') {
        acc[nombre] = (acc[nombre] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .map(([estado, cantidad]) => ({ 
      estado: estado || 'Sin nombre', 
      cantidad: cantidad,
      name: estado || 'Sin nombre' // Agregar name para compatibilidad con Recharts
    }))
    .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente

  // Gráfico de barras horizontal → Top 10 aseguradoras
  // CRÍTICO: Usar SOLO codiAsgrdra (código de aseguradora), NUNCA asgrBenfcro (asegurado/beneficiario)
  const aseguradoraCount = {};
  casosFiltrados.forEach(caso => {
    // CRÍTICO: Usar SOLO caso.codiAsgrdra del objeto original
    // caso.aseguradora puede estar mal mapeado, por eso lo ignoramos
    const codigoAseguradora = caso.codiAsgrdra;
    const asegurado = caso.asgrBenfcro || caso.asegurado || '';
    
    // Validaciones estrictas:
    // 1. Debe existir codiAsgrdra
    // 2. NO debe ser igual al asegurado (asgrBenfcro)
    // 3. Debe ser un código válido (no vacío, no null, etc.)
    if (codigoAseguradora && 
        codigoAseguradora !== '' && 
        codigoAseguradora !== 'null' && 
        codigoAseguradora !== 'undefined' &&
        String(codigoAseguradora).trim() !== '' &&
        String(codigoAseguradora).trim() !== String(asegurado).trim()) {
      
      // Obtener el nombre de la aseguradora desde la lista de aseguradoras
      const nombreAseguradora = getAseguradoraNombre(codigoAseguradora);
      
      // Validaciones estrictas del nombre:
      // 1. Debe existir y ser válido (no null, no undefined, no vacío)
      // 2. NO debe ser igual al código (significa que no se encontró en la lista)
      // 3. NO debe ser igual al nombre del asegurado
      // 4. Debe ser diferente de null/undefined
      if (nombreAseguradora && 
          nombreAseguradora !== null &&
          nombreAseguradora !== 'undefined' && 
          nombreAseguradora !== 'null' &&
          nombreAseguradora !== '' &&
          nombreAseguradora !== codigoAseguradora && // Si es igual al código, no se encontró en la lista
          nombreAseguradora !== String(codigoAseguradora) && // Si es igual al código como string, no se encontró
          nombreAseguradora !== asegurado && // NO debe ser el nombre del asegurado
          nombreAseguradora !== String(asegurado).trim()) { // NO debe ser el nombre del asegurado (string)
        aseguradoraCount[nombreAseguradora] = (aseguradoraCount[nombreAseguradora] || 0) + 1;
      }
    }
  });
  
  const topAseguradoras = Object.entries(aseguradoraCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([aseguradora, cantidad]) => ({ aseguradora, cantidad }));
  
  // Gráfico de barras → Número de casos por responsable (agrupado por persona)
  const casosPorResponsableMapa = {};
  casosFiltrados.forEach((caso) => {
    const { clave, nombre } = resolverAgrupacionCaso(caso, responsables, getResponsableNombre);
    if (clave === 'sin_asignar') return;
    if (!casosPorResponsableMapa[clave]) {
      casosPorResponsableMapa[clave] = { responsable: nombre, cantidad: 0 };
    } else {
      casosPorResponsableMapa[clave].responsable = elegirNombreMostrarResponsable(
        casosPorResponsableMapa[clave].responsable,
        nombre
      );
    }
    casosPorResponsableMapa[clave].cantidad++;
  });
  const casosPorResponsableData = Object.values(casosPorResponsableMapa)
    .filter((item) => item.responsable && item.responsable !== 'Sin asignar')
    .sort((a, b) => b.cantidad - a.cantidad);

  // Gráfico de barras → Días promedio por responsable (agrupado por persona)
  const diasPorResponsableMapa = {};
  casosFiltrados.forEach((caso) => {
    const fechaCierre = caso.fecha_cierre ? new Date(caso.fecha_cierre) : null;
    const fechaCreacion = caso.fecha_creacion ? new Date(caso.fecha_creacion) : null;
    if (!fechaCierre || !fechaCreacion || !caso.responsable) return;

    const diffDias = Math.abs((fechaCierre - fechaCreacion) / (1000 * 60 * 60 * 24));
    const { clave, nombre } = resolverAgrupacionCaso(caso, responsables, getResponsableNombre);
    if (clave === 'sin_asignar') return;

    if (!diasPorResponsableMapa[clave]) {
      diasPorResponsableMapa[clave] = { responsable: nombre, dias: [] };
    } else {
      diasPorResponsableMapa[clave].responsable = elegirNombreMostrarResponsable(
        diasPorResponsableMapa[clave].responsable,
        nombre
      );
    }
    diasPorResponsableMapa[clave].dias.push(diffDias);
  });
  const promedioDiasPorResponsable = Object.values(diasPorResponsableMapa)
    .map(({ responsable, dias }) => ({
      responsable,
      promedioDias: Math.round(dias.reduce((sum, d) => sum + d, 0) / dias.length),
    }))
    .filter((item) => item.responsable && item.responsable !== 'Sin asignar')
    .sort((a, b) => b.promedioDias - a.promedioDias);

  // ========== NUEVAS GRÁFICAS ==========

  // Distribución geográfica (ciudades) - Top 10
  // Los datos ya vienen enriquecidos del backend con nombreCiudad
  const casosPorCiudad = Object.entries(
    casosFiltrados.reduce((acc, caso) => {
      // Usar nombreCiudad que viene del backend (ya enriquecido)
      const nombreCiudad = caso.nombreCiudad || getCiudadNombre(caso.codigoPoblado || caso.ciudadSucursal) || 'Sin ciudad';
      
      if (nombreCiudad && nombreCiudad !== 'Sin ciudad') {
        acc[nombreCiudad] = (acc[nombreCiudad] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .map(([ciudad, cantidad]) => ({ ciudad, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  // Evolución temporal - Casos por mes
  const casosPorMes = Object.entries(
    casosFiltrados.reduce((acc, caso) => {
      const fecha = caso.fecha_creacion ? new Date(caso.fecha_creacion) : null;
      if (fecha && !isNaN(fecha.getTime())) {
        const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        acc[mes] = (acc[mes] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .map(([mes, cantidad]) => ({
      mes: mes.split('-')[1] + '/' + mes.split('-')[0],
      cantidad
    }))
    .sort((a, b) => {
      const [mesA, añoA] = a.mes.split('/');
      const [mesB, añoB] = b.mes.split('/');
      return new Date(añoA, mesA - 1) - new Date(añoB, mesB - 1);
    });

  // Trazabilidad — segmentación Arnald vs plataforma anterior
  const resumenTrazabilidad = resumirSegmentacionTrazabilidad(casosFiltrados);

  const retrasosPorEtapaData = calcularRetrasosPorEtapa(casosFiltrados, {
    soloArnald: true,
    usarFechaActualSiPendiente: true,
  });

  const cumplimientoArnaldArray = calcularCumplimientoPorResponsable(
    casosFiltrados,
    getResponsableNombre,
    { soloArnald: true, usarFechaActualSiPendiente: false, catalogoResponsables: responsables }
  );

  const historicosPendientesArray = calcularHistoricosPendientesCorreccion(
    casosFiltrados,
    getResponsableNombre,
    { catalogoResponsables: responsables }
  );

  const filtrosAplicados = Boolean(
    fechaDesde || fechaHasta || estadoFiltro || responsableFiltro || aseguradoraFiltro
  );

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setEstadoFiltro('');
    setResponsableFiltro('');
    setAseguradoraFiltro('');
  };

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };

  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';
  const pieStroke = isDark ? '#1A1A1A' : '#FFFFFF';
  const lineColors = getFenixLineChartColors(isDark);

  const leyendaCasosPorEstado = buildPieLegendPayload(casosPorEstado, 'estado', isDark);

  const formatoLeyendaPie = (total, labelKey) => (value, entry) => {
    const item = entry?.payload ?? {};
    const etiqueta = item[labelKey] || value || 'Sin nombre';
    const cantidad = item.cantidad ?? 0;
    const pct = total > 0 ? ((cantidad / total) * 100).toFixed(1) : 0;
    return `${etiqueta}: ${cantidad} (${pct}%)`;
  };

  const renderTablaCumplimiento = (filas) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr>
            <th className={riesgoTableTh}>Responsable</th>
            <th className={`${riesgoTableTh} text-center`}>Total</th>
            <th className={`${riesgoTableTh} text-center`}>Cumplidos</th>
            <th className={`${riesgoTableTh} text-center`}>Retrasados</th>
            <th className={`${riesgoTableTh} text-center`}>% Cumpl.</th>
            <th className={`${riesgoTableTh} text-center`}>Prom. retraso</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((resp, index) => (
            <tr key={resp.nombre} className={index % 2 === 0 ? riesgoTableRowEven : riesgoTableRowOdd}>
              <td className={`${riesgoTableTd} font-medium`}>{resp.nombre}</td>
              <td className={`${riesgoTableTd} text-center`}>{resp.totalCasos}</td>
              <td className={`${riesgoTableTd} text-center text-fenix-exito`}>{resp.casosCumplidos}</td>
              <td className={`${riesgoTableTd} text-center text-fenix-primario`}>{resp.casosRetrasados}</td>
              <td className={`${riesgoTableTd} text-center font-bold`}>
                <span
                  className={
                    parseFloat(resp.porcentajeCumplimiento) >= 80
                      ? 'text-fenix-exito'
                      : parseFloat(resp.porcentajeCumplimiento) >= 50
                        ? 'text-fenix-editar'
                        : 'text-fenix-primario'
                  }
                >
                  {resp.porcentajeCumplimiento}%
                </span>
              </td>
              <td className={`${riesgoTableTd} text-center text-gray-500`}>
                {resp.promedioDiasRetraso === '0' ? '-' : `${resp.promedioDiasRetraso} días`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGraficaCumplimiento = (filas) =>
    filas.length > 0 ? (
      <div style={{ height: Math.max(360, filas.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: tickColor }} />
            <YAxis
              dataKey="nombre"
              type="category"
              width={140}
              tick={{ fill: tickColor, fontSize: 10 }}
              tickFormatter={(v) => (v && v.length > 25 ? `${v.substring(0, 22)}...` : v)}
            />
            <Tooltip formatter={(v) => [`${v}%`, 'Cumplimiento']} contentStyle={tooltipStyle} />
            <Bar dataKey="porcentajeCumplimiento" radius={[0, 4, 4, 0]}>
              {filas.map((entry, index) => (
                <Cell key={entry.nombre} fill={getFenixChartColor(index, isDark)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : null;

  // Listas únicas para los filtros
  const estadosUnicos = Array.from(new Set(casos.map(c => c.estado)))
    .filter(e => e && e !== 'null' && e !== 'undefined')
    .map(e => ({ value: e, label: getEstadoNombre(e) }));
  
  const responsablesUnicos = Array.from(new Set(casos.map(c => c.responsable)))
    .filter(r => r && r !== 'null' && r !== 'undefined')
    .map(r => ({ value: r, label: getResponsableNombre(r) }));
  
  // Para aseguradoras, usar directamente la lista de aseguradoras cargada de la API
  const aseguradorasUnicas = aseguradoras
    .filter(a => a && a.rzonSocial && a.rzonSocial.trim() !== '')
    .map(a => ({
      value: a.codiAsgrdra || a.cod1Asgrdra,
      label: a.rzonSocial
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className={riesgoReportRoot}>
      <div className={`${riesgoScope} ${riesgoPageWrapWide}`}>
        <RiesgoPageHeader
          title="Dashboard de Riesgos"
          subtitle="Métricas, distribución geográfica, evolución temporal y cumplimiento de trazabilidad."
          showNav={false}
        />

        <RiesgoFilterSection
          title="Filtros del dashboard"
          subtitle="Navegación del módulo y criterios de análisis en un solo panel."
          showClear={filtrosAplicados}
          onClear={limpiarFiltros}
        >
          <RiesgoNavPanel activePath="/riesgos/dashboard" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label="Fecha desde">
              <InputFenix type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </Campo>
            <Campo label="Fecha hasta">
              <InputFenix type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </Campo>
            <Campo label="Estado">
              <SelectFenix value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                <option value="">Todos los estados</option>
                {estadosUnicos.map((e, index) => (
                  <option key={`estado-${e.value}-${index}`} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Responsable">
              <SelectFenix value={responsableFiltro} onChange={(e) => setResponsableFiltro(e.target.value)}>
                <option value="">Todos los responsables</option>
                {responsablesUnicos.map((r, index) => (
                  <option key={`responsable-${r.value}-${index}`} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Aseguradora">
              <SelectFenix value={aseguradoraFiltro} onChange={(e) => setAseguradoraFiltro(e.target.value)}>
                <option value="">Todas las aseguradoras</option>
                {aseguradorasUnicas.map((a, index) => (
                  <option key={`aseguradora-${a.value}-${index}`} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          </div>
          {filtrosAplicados && (
            <div className={riesgoFilterActiveBox}>
              <p className="mb-2 font-body text-xs font-semibold text-gray-700 dark:text-gray-300">
                Filtros activos
              </p>
              <div className="flex flex-wrap gap-1">
                {fechaDesde && <span className={riesgoFilterChip}>Desde: {fechaDesde}</span>}
                {fechaHasta && <span className={riesgoFilterChip}>Hasta: {fechaHasta}</span>}
                {estadoFiltro && (
                  <span className={riesgoFilterChip}>Estado: {getEstadoNombre(estadoFiltro)}</span>
                )}
                {responsableFiltro && (
                  <span className={riesgoFilterChip}>
                    Responsable: {getResponsableNombre(responsableFiltro)}
                  </span>
                )}
                {aseguradoraFiltro && (
                  <span className={riesgoFilterChip}>
                    Aseguradora: {getAseguradoraNombre(aseguradoraFiltro) || aseguradoraFiltro}
                  </span>
                )}
              </div>
              <p className="mt-2 font-body text-xs text-gray-600 dark:text-gray-400">
                Mostrando {totalCasos} de {casos.length} casos
              </p>
            </div>
          )}
        </RiesgoFilterSection>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RiesgoMetricCard label="Total de casos" value={totalCasos} hint="Con filtros aplicados" />
          <RiesgoMetricCard
            label="Casos pendientes"
            value={casosPendientes}
            hint="Estados en proceso o sin asignar"
            accent="primario"
          />
          <div className={`${riesgoMetricCard} sm:col-span-2 lg:col-span-1 xl:col-span-1`}>
            <p className="font-body text-sm font-medium text-gray-500 dark:text-gray-400">
              Últimos casos registrados
            </p>
            <ul className="mt-3 space-y-1">
              {ultimosCasos.map((caso, idx) => (
                <li
                  key={caso._id || caso.nmroRiesgo || idx}
                  className="flex justify-between gap-2 font-body text-xs sm:text-sm"
                >
                  <span className="truncate text-gray-800 dark:text-gray-200">
                    {caso.numero_siniestro || caso.nmroRiesgo || caso.codigo}
                  </span>
                  <span className="shrink-0 text-gray-500 dark:text-gray-400">
                    {caso.fecha_creacion?.substring(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4">
          <RiesgoChartCard title="Evolución temporal de casos" empty={casosPorMes.length === 0}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={casosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="mes" tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis tick={{ fill: tickColor }} allowDecimals={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="cantidad"
                  name="Casos"
                  stroke={lineColors.casos}
                  strokeWidth={2.5}
                  dot={{ fill: lineColors.casos, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </RiesgoChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <RiesgoChartCard title="Distribución por estado" empty={casosPorEstado.length === 0}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={casosPorEstado}
                  dataKey="cantidad"
                  nameKey="estado"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={55}
                  stroke={pieStroke}
                  strokeWidth={2}
                >
                  {casosPorEstado.map((entry, index) => (
                    <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => {
                    const estado = props.payload?.estado || 'Sin nombre';
                    const cantidad = props.payload?.cantidad || value || 0;
                    const pct = totalCasos > 0 ? ((cantidad / totalCasos) * 100).toFixed(1) : 0;
                    return [`${cantidad} casos (${pct}%)`, estado];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  payload={leyendaCasosPorEstado}
                  formatter={formatoLeyendaPie(totalCasos, 'estado')}
                  wrapperStyle={{ fontSize: '11px', color: tickColor, paddingLeft: '8px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </RiesgoChartCard>

          <RiesgoChartCard title="Casos por estado" empty={casosPorEstado.length === 0}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={casosPorEstado} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis type="category" dataKey="estado" width={130} tick={{ fill: tickColor, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                  {casosPorEstado.map((entry, index) => (
                    <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </RiesgoChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4">
          <RiesgoChartCard title="Top 10 aseguradoras" empty={topAseguradoras.length === 0}>
            <ResponsiveContainer width="100%" height={Math.max(320, topAseguradoras.length * 36)}>
              <BarChart data={topAseguradoras} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  dataKey="aseguradora"
                  type="category"
                  width={160}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => (v && v.length > 28 ? `${v.substring(0, 25)}...` : v || 'Sin aseguradora')}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                  {topAseguradoras.map((entry, index) => (
                    <Cell key={entry.aseguradora} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </RiesgoChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <RiesgoChartCard
            title="Casos por responsable"
            empty={casosPorResponsableData.length === 0}
          >
            <div style={{ height: Math.max(320, casosPorResponsableData.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={casosPorResponsableData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                  <YAxis
                    dataKey="responsable"
                    type="category"
                    width={150}
                    tick={{ fill: tickColor, fontSize: 10 }}
                    tickFormatter={(v) => (v && v.length > 28 ? `${v.substring(0, 25)}...` : v || 'Sin responsable')}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                    {casosPorResponsableData.map((entry, index) => (
                      <Cell key={entry.responsable} fill={getFenixChartColor(index, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </RiesgoChartCard>

          <RiesgoChartCard
            title="Días promedio (cierre → creación) por responsable"
            empty={promedioDiasPorResponsable.length === 0}
          >
            <div style={{ height: Math.max(320, promedioDiasPorResponsable.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={promedioDiasPorResponsable} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                  <YAxis
                    dataKey="responsable"
                    type="category"
                    width={150}
                    tick={{ fill: tickColor, fontSize: 10 }}
                    tickFormatter={(v) => (v && v.length > 28 ? `${v.substring(0, 25)}...` : v || 'Sin responsable')}
                  />
                  <Tooltip formatter={(v) => [`${v} días`, 'Promedio']} contentStyle={tooltipStyle} />
                  <Bar dataKey="promedioDias" radius={[0, 4, 4, 0]}>
                    {promedioDiasPorResponsable.map((entry, index) => (
                      <Cell key={entry.responsable} fill={getFenixChartColor(index + 1, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </RiesgoChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4">
          <RiesgoChartCard title="Distribución por ciudad (Top 10)" empty={casosPorCiudad.length === 0}>
            <div style={{ height: Math.max(320, casosPorCiudad.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={casosPorCiudad} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                  <YAxis
                    dataKey="ciudad"
                    type="category"
                    width={160}
                    tick={{ fill: tickColor, fontSize: 10 }}
                    tickFormatter={(value) => {
                      if (!value) return 'Sin ciudad';
                      let nombre = value.includes(', COLOMBIA') ? value.replace(', COLOMBIA', '') : value;
                      const partesUnicas = [...new Set(nombre.split(', '))];
                      nombre = partesUnicas.join(', ');
                      return nombre.length > 28 ? `${nombre.substring(0, 25)}...` : nombre;
                    }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                    {casosPorCiudad.map((entry, index) => (
                      <Cell key={entry.ciudad} fill={getFenixChartColor(index, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </RiesgoChartCard>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className={riesgoSectionTitle}>Métricas de trazabilidad</h2>
            <p className="mt-2 font-body text-sm text-gray-600 dark:text-gray-400">
              El cumplimiento usa casos con fecha de asignación desde {FECHA_INICIO_ARNALD_RIESGO_LABEL}.
              Los casos anteriores a esa fecha (plataforma previa) se listan abajo para corrección de fechas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <RiesgoMetricCard
              label="Casos Arnald"
              value={resumenTrazabilidad.casosArnald}
              hint="Con trazabilidad medible"
              accent="exito"
            />
            <RiesgoMetricCard
              label="Casos históricos"
              value={resumenTrazabilidad.casosHistoricos}
              hint="Plataforma anterior"
            />
            <RiesgoMetricCard
              label="Pendientes de corrección"
              value={resumenTrazabilidad.historicosPendientes}
              hint="Sin fechas de trazabilidad"
              accent="primario"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {retrasosPorEtapaData.map((item, index) => (
              <div
                key={index}
                className={item.retrasados > 0 ? riesgoKpiCardAlert : riesgoKpiCardOk}
              >
                <p className="font-body text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {item.etapa}
                </p>
                <p
                  className={`mt-2 font-accent text-2xl font-bold ${
                    item.retrasados > 0 ? 'text-fenix-primario' : 'text-fenix-exito'
                  }`}
                >
                  {item.retrasados}
                </p>
                <p className="font-body text-xs text-gray-500 dark:text-gray-400">
                  {item.retrasados === 1 ? 'retrasado' : 'retrasados'} · Límite: {item.limite}
                </p>
                <p className="mt-1 font-body text-[11px] text-gray-400 dark:text-gray-500">Solo casos Arnald</p>
              </div>
            ))}
          </div>

          <RiesgoChartCard title="Casos retrasados por etapa (Arnald)" empty={false}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={retrasosPorEtapaData} margin={{ top: 8, right: 16, left: 0, bottom: 72 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="etapa"
                  angle={-32}
                  textAnchor="end"
                  height={72}
                  interval={0}
                  tick={{ fill: tickColor, fontSize: 10 }}
                />
                <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="retrasados" fill={FENIX_PALETTE.primario} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </RiesgoChartCard>

          <RiesgoChartCard
            title="Cumplimiento Arnald por responsable"
            empty={cumplimientoArnaldArray.length === 0}
          >
            <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
              Solo etapas con fecha registrada. No penaliza casos sin fechas de cierre.
            </p>
            {cumplimientoArnaldArray.length > 0 && (
              <>
                {renderTablaCumplimiento(cumplimientoArnaldArray)}
                {renderGraficaCumplimiento(cumplimientoArnaldArray)}
              </>
            )}
          </RiesgoChartCard>

          <RiesgoChartCard
            title="Casos históricos pendientes de corrección"
            empty={historicosPendientesArray.length === 0}
          >
            <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
              Casos importados de la plataforma anterior con fechas de trazabilidad incompletas.
              Úselos para identificar qué registros deben actualizarse.
            </p>
            {historicosPendientesArray.length > 0 && (
              <>
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr>
                        <th className={riesgoTableTh}>Responsable</th>
                        <th className={`${riesgoTableTh} text-center`}>Pendientes</th>
                        <th className={`${riesgoTableTh} text-center`}>Sin contacto</th>
                        <th className={`${riesgoTableTh} text-center`}>Sin inspección</th>
                        <th className={`${riesgoTableTh} text-center`}>Sin informe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicosPendientesArray.map((resp, index) => (
                        <tr
                          key={resp.nombre}
                          className={index % 2 === 0 ? riesgoTableRowEven : riesgoTableRowOdd}
                        >
                          <td className={`${riesgoTableTd} font-medium`}>{resp.nombre}</td>
                          <td className={`${riesgoTableTd} text-center font-bold text-fenix-primario`}>
                            {resp.pendientesCorreccion}
                          </td>
                          <td className={`${riesgoTableTd} text-center`}>{resp.sinContacto}</td>
                          <td className={`${riesgoTableTd} text-center`}>{resp.sinInspeccion}</td>
                          <td className={`${riesgoTableTd} text-center`}>{resp.sinInforme}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ height: Math.max(320, historicosPendientesArray.length * 36) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={historicosPendientesArray}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                      <YAxis
                        dataKey="nombre"
                        type="category"
                        width={140}
                        tick={{ fill: tickColor, fontSize: 10 }}
                        tickFormatter={(v) => (v && v.length > 25 ? `${v.substring(0, 22)}...` : v)}
                      />
                      <Tooltip
                        formatter={(v) => [`${v} casos`, 'Pendientes de corrección']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="pendientesCorreccion" radius={[0, 4, 4, 0]}>
                        {historicosPendientesArray.map((entry, index) => (
                          <Cell key={entry.nombre} fill={getFenixChartColor(index + 2, isDark)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </RiesgoChartCard>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;