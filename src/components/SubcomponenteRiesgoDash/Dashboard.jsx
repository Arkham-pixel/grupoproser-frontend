import React, { useEffect, useState } from 'react';
import { obtenerCasosRiesgo, obtenerResponsables, obtenerEstados, obtenerAseguradoras, obtenerCiudades } from '../../services/riesgoService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend, CartesianGrid, AreaChart, Area } from 'recharts';
import Loader from "../Loader"; // Ajusta la ruta si es necesario
import { useTheme } from '../../context/ThemeContext';

const Dashboard = () => {
  const { theme } = useTheme();
  
  // Colores según el tema
  const bgMain = theme === 'dark' ? '#1A1A1A' : '#F5F5F7';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const filterBg = theme === 'dark' ? '#1F1F1F' : '#F0F9FF';
  const filterText = theme === 'dark' ? '#E0E7FF' : '#1E40AF';
  const filterBorder = theme === 'dark' ? '#3D3D3D' : '#BFDBFE';
  
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
    return <Loader />;
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
  
  // Debug para verificar
  console.log('🔍 Debug aseguradoras - Casos procesados:', casosFiltrados.length);
  console.log('🔍 Debug aseguradoras - Aseguradoras encontradas:', topAseguradoras.length);
  if (topAseguradoras.length > 0) {
    console.log('🔍 Debug aseguradoras - Top 3:', topAseguradoras.slice(0, 3));
  }

  // Gráfico de barras → Número de casos por responsable
  // Agrupar por nombre de responsable (normalizado) en lugar de por código
  const casosPorResponsable = {};
  casosFiltrados.forEach(caso => {
    if (caso.responsable) {
      const responsableId = String(caso.responsable).trim();
      if (responsableId && responsableId !== 'null' && responsableId !== 'undefined') {
        const nombreResponsable = getResponsableNombre(responsableId);
        if (nombreResponsable && nombreResponsable !== 'Sin asignar') {
          casosPorResponsable[nombreResponsable] = (casosPorResponsable[nombreResponsable] || 0) + 1;
        }
      }
    }
  });
  const casosPorResponsableData = Object.entries(casosPorResponsable)
    .map(([nombreResponsable, cantidad]) => {
      return { 
        responsable: nombreResponsable, 
        cantidad: cantidad 
      };
    })
    .filter(item => item.responsable && item.responsable !== 'Sin asignar')
    .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente

  // Gráfico de barras → Días promedio (fecha cierre - fecha creación) por responsable
  // Agrupar por nombre de responsable (normalizado)
  const diasPorResponsable = {};
  casosFiltrados.forEach(caso => {
    const fechaCierre = caso.fecha_cierre ? new Date(caso.fecha_cierre) : null;
    const fechaCreacion = caso.fecha_creacion ? new Date(caso.fecha_creacion) : null;
    if (fechaCierre && fechaCreacion && caso.responsable) {
      const diffDias = Math.abs((fechaCierre - fechaCreacion) / (1000 * 60 * 60 * 24));
      const responsableId = String(caso.responsable).trim();
      if (responsableId && responsableId !== 'null' && responsableId !== 'undefined') {
        const nombreResponsable = getResponsableNombre(responsableId);
        if (nombreResponsable && nombreResponsable !== 'Sin asignar') {
          if (!diasPorResponsable[nombreResponsable]) {
            diasPorResponsable[nombreResponsable] = [];
          }
          diasPorResponsable[nombreResponsable].push(diffDias);
        }
      }
    }
  });
  const promedioDiasPorResponsable = Object.entries(diasPorResponsable)
    .map(([nombreResponsable, dias]) => {
      const promedio = dias.reduce((sum, d) => sum + d, 0) / dias.length;
      return { 
        responsable: nombreResponsable, 
        promedioDias: Math.round(promedio) 
      };
    })
    .filter(item => item.responsable && item.responsable !== 'Sin asignar') // Filtrar casos sin responsable válido
    .sort((a, b) => b.promedioDias - a.promedioDias); // Ordenar por promedio descendente

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

  // Trazabilidad - Calcular retrasos por etapa
  const tiemposLimite = {
    contactoInicial: 0.5, // 12 horas en días
    inspeccion: 1, // 24 horas en días
    informeFinal: 2 // 2 días
  };

  const calcularRetrasoEtapaRiesgo = (caso, etapa) => {
    const ahora = new Date();
    let fechaReferencia = null;
    let fechaCompletado = null;
    let limite = 0;

    switch (etapa) {
      case 'contactoInicial':
        fechaReferencia = caso.fchaAsgncion ? new Date(caso.fchaAsgncion) : null;
        fechaCompletado = caso.fchaContIni ? new Date(caso.fchaContIni) : null;
        limite = tiemposLimite.contactoInicial;
        break;
      case 'inspeccion':
        fechaReferencia = caso.fchaContIni ? new Date(caso.fchaContIni) : (caso.fchaAsgncion ? new Date(caso.fchaAsgncion) : null);
        fechaCompletado = caso.fchaInspccion ? new Date(caso.fchaInspccion) : null;
        limite = tiemposLimite.inspeccion;
        break;
      case 'informeFinal':
        fechaReferencia = caso.fchaInspccion ? new Date(caso.fchaInspccion) : (caso.fchaContIni ? new Date(caso.fchaContIni) : null);
        fechaCompletado = caso.fchaInforme ? new Date(caso.fchaInforme) : null;
        limite = tiemposLimite.informeFinal;
        break;
      default:
        return null;
    }

    if (!fechaReferencia) return null;

    const fechaLimite = new Date(fechaReferencia.getTime() + limite * 24 * 60 * 60 * 1000);
    const fechaFinal = fechaCompletado || ahora;
    const diferenciaDias = (fechaFinal - fechaLimite) / (24 * 60 * 60 * 1000);

    return {
      etapa,
      diasRetraso: diferenciaDias > 0 ? diferenciaDias : 0,
      enTiempo: diferenciaDias <= 0,
      completado: !!fechaCompletado
    };
  };

  // Contar casos retrasados por etapa
  const casosRetrasadosPorEtapa = {
    contactoInicial: 0,
    inspeccion: 0,
    informeFinal: 0
  };

  casosFiltrados.forEach(caso => {
    ['contactoInicial', 'inspeccion', 'informeFinal'].forEach(etapa => {
      const retraso = calcularRetrasoEtapaRiesgo(caso, etapa);
      if (retraso && retraso.diasRetraso > 0) {
        casosRetrasadosPorEtapa[etapa]++;
      }
    });
  });

  // Cumplimiento por responsable
  const cumplimientoPorResponsable = {};
  
  casosFiltrados.forEach(caso => {
    const responsableId = caso.responsable;
    if (!responsableId) return;
    
    const nombreResp = getResponsableNombre(responsableId);
    if (!cumplimientoPorResponsable[nombreResp]) {
      cumplimientoPorResponsable[nombreResp] = {
        totalCasos: 0,
        casosCumplidos: 0,
        casosRetrasados: 0,
        totalDiasRetraso: 0
      };
    }

    const responsable = cumplimientoPorResponsable[nombreResp];
    responsable.totalCasos++;

    const etapas = ['contactoInicial', 'inspeccion', 'informeFinal'];
    let tieneAlMenosUnaEtapa = false;
    let todasCumplidas = true;

    etapas.forEach(etapa => {
      const retraso = calcularRetrasoEtapaRiesgo(caso, etapa);
      if (retraso) {
        tieneAlMenosUnaEtapa = true;
        if (retraso.diasRetraso > 0) {
          todasCumplidas = false;
          responsable.casosRetrasados++;
          responsable.totalDiasRetraso += retraso.diasRetraso;
        }
      }
    });

    if (tieneAlMenosUnaEtapa && todasCumplidas) {
      responsable.casosCumplidos++;
    }
  });

  const cumplimientoPorResponsableArray = Object.entries(cumplimientoPorResponsable)
    .map(([nombre, datos]) => ({
      nombre,
      totalCasos: datos.totalCasos,
      casosCumplidos: datos.casosCumplidos,
      casosRetrasados: datos.casosRetrasados,
      porcentajeCumplimiento: datos.totalCasos > 0 
        ? ((datos.casosCumplidos / datos.totalCasos) * 100).toFixed(1)
        : 0,
      promedioDiasRetraso: datos.casosRetrasados > 0 
        ? (datos.totalDiasRetraso / datos.casosRetrasados).toFixed(1)
        : 0
    }))
    .sort((a, b) => b.totalCasos - a.totalCasos)
    .slice(0, 15);

  const retrasosPorEtapaData = [
    { etapa: 'Contacto Inicial', retrasados: casosRetrasadosPorEtapa.contactoInicial, limite: '12 horas' },
    { etapa: 'Inspección', retrasados: casosRetrasadosPorEtapa.inspeccion, limite: '24 horas' },
    { etapa: 'Informe Final', retrasados: casosRetrasadosPorEtapa.informeFinal, limite: '2 días' }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28EFF', '#FF6699', '#33CC33', '#FF6633'];

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
    <div 
      className="p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto"
      style={{ backgroundColor: bgMain }}
    >
      <h2 
        className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 text-center"
        style={{ color: textPrimary }}
      >
        📊 Dashboard de Casos de Riesgo
      </h2>

      {/* Filtros Mejorados */}
      <div 
        className="shadow rounded-lg p-3 sm:p-4 mb-4 sm:mb-6"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-sm sm:text-lg font-semibold mb-3 text-center"
          style={{ color: textPrimary }}
        >
          🔍 Filtros de Búsqueda
        </h3>
        
        {/* Primera fila - Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              📅 Fecha desde
            </label>
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={e => setFechaDesde(e.target.value)} 
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" 
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
            />
        </div>
        <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              📅 Fecha hasta
            </label>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={e => setFechaHasta(e.target.value)} 
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none" 
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
            />
          </div>
        </div>
        
        {/* Segunda fila - Selectores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              📊 Estado
            </label>
            <select 
              value={estadoFiltro} 
              onChange={e => setEstadoFiltro(e.target.value)} 
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
            >
              <option value="">Todos los estados</option>
              {estadosUnicos.map((e, index) => (
                <option key={`estado-${e.value}-${index}`} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              👨‍💼 Responsable
            </label>
            <select 
              value={responsableFiltro} 
              onChange={e => setResponsableFiltro(e.target.value)} 
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
            >
              <option value="">Todos los responsables</option>
              {responsablesUnicos.map((r, index) => (
                <option key={`responsable-${r.value}-${index}`} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          
        <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              🏢 Aseguradora
            </label>
            <select 
              value={aseguradoraFiltro} 
              onChange={e => setAseguradoraFiltro(e.target.value)} 
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
            >
              <option value="">Todas las aseguradoras</option>
              {aseguradorasUnicas.map((a, index) => (
                <option key={`aseguradora-${a.value}-${index}`} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

        {/* Botón para limpiar filtros */}
        <div className="mt-3 text-center">
          <button 
            onClick={() => {
              setFechaDesde("");
              setFechaHasta("");
              setEstadoFiltro("");
              setResponsableFiltro("");
              setAseguradoraFiltro("");
            }}
            className="px-4 py-2 rounded-md text-sm transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? '#4B5563' : '#6B7280',
              color: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#5B6673' : '#4B5563';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#4B5563' : '#6B7280';
            }}
          >
            🗑️ Limpiar Filtros
          </button>
        </div>

        {/* Información de filtros activos */}
        {(fechaDesde || fechaHasta || estadoFiltro || responsableFiltro || aseguradoraFiltro) && (
          <div 
            className="mt-3 p-2 rounded-md"
            style={{
              backgroundColor: filterBg,
              border: `1px solid ${filterBorder}`
            }}
          >
            <p 
              className="text-xs font-medium mb-1"
              style={{ color: filterText }}
            >
              🔍 Filtros activos:
            </p>
            <div className="flex flex-wrap gap-1">
              {fechaDesde && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                    color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                  }}
                >
                  Desde: {fechaDesde}
                </span>
              )}
              {fechaHasta && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                    color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                  }}
                >
                  Hasta: {fechaHasta}
                </span>
              )}
              {estadoFiltro && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                    color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                  }}
                >
                  Estado: {getEstadoNombre(estadoFiltro)}
                </span>
              )}
              {responsableFiltro && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                    color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                  }}
                >
                  Responsable: {getResponsableNombre(responsableFiltro)}
                </span>
              )}
              {aseguradoraFiltro && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                    color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                  }}
                >
                  Aseguradora: {getAseguradoraNombre(aseguradoraFiltro)}
                </span>
              )}
            </div>
            <p 
              className="text-xs mt-1"
              style={{ color: filterText }}
            >
              Mostrando {totalCasos} de {casos.length} casos
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div 
          className="shadow rounded-lg p-3 sm:p-4 text-center"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3 
            className="text-sm sm:text-lg font-semibold mb-2"
            style={{ color: textPrimary }}
          >
            Total de Casos
          </h3>
          <p 
            className="text-2xl sm:text-3xl lg:text-4xl font-bold"
            style={{ color: '#3B82F6' }}
          >
            {totalCasos}
          </p>
        </div>

        <div 
          className="shadow rounded-lg p-3 sm:p-4 text-center"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3 
            className="text-sm sm:text-lg font-semibold mb-2"
            style={{ color: textPrimary }}
          >
            Casos Pendientes
          </h3>
          <p 
            className="text-2xl sm:text-3xl lg:text-4xl font-bold"
            style={{ color: '#EF4444' }}
          >
            {casosPendientes}
          </p>
        </div>

        <div 
          className="shadow rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3 
            className="text-sm sm:text-lg font-semibold mb-2 text-center"
            style={{ color: textPrimary }}
          >
            Últimos Casos Registrados
          </h3>
          <ul className="text-xs sm:text-sm space-y-1">
            {ultimosCasos.map((caso, idx) => (
              <li 
                key={caso._id || caso.nmroRiesgo || idx} 
                className="flex justify-between"
              >
                <span 
                  className="truncate mr-2"
                  style={{ color: textPrimary }}
                >
                  {caso.numero_siniestro || caso.nmroRiesgo || caso.codigo}
                </span>
                <span 
                  className="text-xs"
                  style={{ color: textSecondary }}
                >
                  {caso.fecha_creacion?.substring(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Gráfico de Pastel - Estados */}
        <div 
          className="shadow rounded-lg p-4 sm:p-6"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3 
            className="text-base sm:text-lg font-semibold mb-4 text-center"
            style={{ color: textPrimary }}
          >
            🥧 Distribución por Estado
          </h3>
          <ResponsiveContainer width="100%" height={450}>
            <PieChart>
              <Pie
                data={casosPorEstado}
                cx="50%"
                cy="45%"
                labelLine={false}
                label={false}
                outerRadius={100}
                innerRadius={50}
                fill="#8884d8"
                dataKey="cantidad"
                paddingAngle={3}
                nameKey="estado"
              >
                {casosPorEstado.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => {
                  const estado = props.payload?.estado || 'Sin nombre';
                  const cantidad = props.payload?.cantidad || value || 0;
                  const porcentaje = totalCasos > 0 ? ((cantidad / totalCasos) * 100).toFixed(1) : 0;
                  return [`${cantidad} casos (${porcentaje}%)`, estado];
                }}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  borderRadius: '4px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={80}
                iconType="circle"
                formatter={(value, entry) => {
                  const payload = entry.payload || entry;
                  const estado = payload?.estado || payload?.name || value || 'Sin nombre';
                  const cantidad = payload?.cantidad || payload?.value || 0;
                  const porcentaje = totalCasos > 0 ? ((cantidad / totalCasos) * 100).toFixed(1) : 0;
                  return `${estado}: ${cantidad} (${porcentaje}%)`;
                }}
                wrapperStyle={{ 
                  paddingTop: '15px', 
                  fontSize: '12px',
                  color: textPrimary
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Barras - Estados */}
        <div 
          className="shadow rounded-lg p-4 sm:p-6"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3 
            className="text-base sm:text-lg font-semibold mb-4 text-center"
            style={{ color: textPrimary }}
          >
            📊 Casos por Estado
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={casosPorEstado} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                type="number" 
                tick={{ fontSize: 12, fill: textPrimary }}
                stroke={borderColor}
              />
              <YAxis 
                dataKey="estado" 
                type="category" 
                width={120} 
                tick={{ fontSize: 12, fill: textPrimary }}
                interval={0}
                stroke={borderColor}
              />
              <Tooltip 
                formatter={(value) => [`${value} casos`, 'Cantidad']}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              />
              <Bar dataKey="cantidad" fill="#8884d8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Aseguradoras */}
        <div 
          className="shadow rounded-lg p-4 sm:p-6 lg:col-span-2"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3 
            className="text-base sm:text-lg font-semibold mb-4 text-center"
            style={{ color: textPrimary }}
          >
            🏢 Top 10 Aseguradoras
          </h3>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={topAseguradoras} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
              <XAxis 
                type="number" 
                tick={{ fontSize: 12, fill: textPrimary }}
                stroke={borderColor}
              />
              <YAxis 
                dataKey="aseguradora" 
                type="category" 
                width={180} 
                tick={{ fontSize: 11, fill: textPrimary }}
                interval={0}
                stroke={borderColor}
              />
              <Tooltip 
                formatter={(value) => [`${value} casos`, 'Cantidad']}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              />
              <Bar dataKey="cantidad" fill="#FF8042" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos de responsables - Una arriba de la otra para mejor visualización */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Gráfico: Número de casos por responsable */}
        <div 
          className="shadow rounded-lg p-4 sm:p-6"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
        <h3 
          className="text-base sm:text-lg font-semibold mb-4 text-center"
          style={{ color: textPrimary }}
        >
          👥 Número de Casos por Responsable
        </h3>
        <div style={{ width: '100%', height: Math.max(550, casosPorResponsableData.length * 35) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={casosPorResponsableData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
            >
              <XAxis 
                type="number"
                tick={{ fontSize: 12, fill: textPrimary }}
                stroke={borderColor}
              />
              <YAxis 
                dataKey="responsable" 
                type="category"
                width={170}
                tick={{ fontSize: 10, fill: textPrimary }}
                interval={0}
                stroke={borderColor}
                tickFormatter={(value) => {
                  if (value && value.length > 30) {
                    return value.substring(0, 27) + '...';
                  }
                  return value || 'Sin responsable';
                }}
              />
              <Tooltip 
                formatter={(value) => [`${value} casos`, 'Cantidad']}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              />
              <Bar dataKey="cantidad" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>

        {/* Gráfico: Días promedio por responsable */}
        <div 
          className="shadow rounded-lg p-4 sm:p-6"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
        <h3 
          className="text-base sm:text-lg font-semibold mb-4 text-center"
          style={{ color: textPrimary }}
        >
          📅 Días promedio (Cierre → Creación) por Responsable
        </h3>
        <div style={{ width: '100%', height: Math.max(550, promedioDiasPorResponsable.length * 35) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={promedioDiasPorResponsable}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
            >
              <XAxis 
                type="number"
                label={{ value: 'Días', angle: 0, position: 'insideBottom', offset: -5, fill: textPrimary }}
                tick={{ fontSize: 12, fill: textPrimary }}
                stroke={borderColor}
              />
              <YAxis 
                dataKey="responsable" 
                type="category"
                width={170}
                tick={{ fontSize: 10, fill: textPrimary }}
                interval={0}
                stroke={borderColor}
                tickFormatter={(value) => {
                  if (value && value.length > 30) {
                    return value.substring(0, 27) + '...';
                  }
                  return value || 'Sin responsable';
                }}
              />
              <Tooltip 
                formatter={(value, name) => [`${value} días`, 'Promedio']}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              />
              <Bar dataKey="promedioDias" fill="#82ca9d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
      </div>

      {/* ========== NUEVAS SECCIONES ========== */}

      {/* Distribución por Ciudad */}
      <div 
        className="shadow rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-base sm:text-lg font-semibold mb-4 text-center"
          style={{ color: textPrimary }}
        >
          🌍 Distribución por Ciudad (Top 10)
        </h3>
        <div style={{ width: '100%', height: Math.max(400, casosPorCiudad.length * 50) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={casosPorCiudad} layout="vertical" margin={{ top: 5, right: 30, left: 180, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2D2D2D' : '#E5E7EB'} />
              <XAxis 
                type="number"
                tick={{ fontSize: 12, fill: textPrimary }}
                stroke={borderColor}
              />
              <YAxis 
                dataKey="ciudad"
                type="category"
                width={190}
                tick={{ fontSize: 10, fill: textPrimary }}
                interval={0}
                stroke={borderColor}
                tickFormatter={(value) => {
                  if (!value) return 'Sin ciudad';
                  // Limpiar nombres: eliminar ", COLOMBIA" y duplicados como "BOGOTA, D.C., BOGOTA, D.C."
                  let nombre = value.includes(', COLOMBIA') ? value.replace(', COLOMBIA', '') : value;
                  // Eliminar duplicados (ej: "BOGOTA, D.C., BOGOTA, D.C." -> "BOGOTA, D.C.")
                  const partes = nombre.split(', ');
                  const partesUnicas = [...new Set(partes)];
                  nombre = partesUnicas.join(', ');
                  // Truncar si es muy largo
                  if (nombre.length > 35) {
                    return nombre.substring(0, 32) + '...';
                  }
                  return nombre;
                }}
              />
              <Tooltip 
                formatter={(value) => [`${value} casos`, 'Cantidad']}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              />
              <Bar dataKey="cantidad" fill="#43e97b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolución Temporal */}
      <div 
        className="shadow rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-base sm:text-lg font-semibold mb-4 text-center"
          style={{ color: textPrimary }}
        >
          📈 Evolución Temporal de Casos
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={casosPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2D2D2D' : '#E5E7EB'} />
            <XAxis 
              dataKey="mes"
              tick={{ fontSize: 11, fill: textPrimary }}
              stroke={borderColor}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: textPrimary }}
              stroke={borderColor}
            />
            <Tooltip 
              formatter={(value) => [`${value} casos`, 'Cantidad']}
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                border: `1px solid ${borderColor}`,
                color: textPrimary
              }}
            />
            <Bar dataKey="cantidad" fill="#667eea" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trazabilidad */}
      <div className="mb-6 sm:mb-8">
        <h2 
          className="text-xl sm:text-2xl font-bold mb-4"
          style={{ color: textPrimary }}
        >
          📋 Métricas de Trazabilidad
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {retrasosPorEtapaData.map((item, index) => (
            <div 
              key={index}
              className="shadow-md rounded-lg p-4 text-center border-l-4"
              style={{
                backgroundColor: cardBg,
                borderLeftColor: item.retrasados > 0 ? '#EF4444' : '#22C55E'
              }}
            >
              <div 
                className="text-xs font-semibold mb-1"
                style={{ color: textSecondary }}
              >
                {item.etapa}
              </div>
              <div 
                className="text-2xl font-bold mb-1"
                style={{ color: item.retrasados > 0 ? '#EF4444' : '#22C55E' }}
              >
                {item.retrasados}
              </div>
              <div 
                className="text-xs"
                style={{ color: textSecondary }}
              >
                {item.retrasados === 1 ? 'retrasado' : 'retrasados'}
              </div>
              <div 
                className="text-xs mt-1"
                style={{ color: textSecondary }}
              >
                Límite: {item.limite}
              </div>
            </div>
          ))}
        </div>

        {/* Gráfica de retrasos por etapa */}
        <div 
          className="shadow rounded-lg p-4 sm:p-6 mb-6"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3 
            className="text-base sm:text-lg font-semibold mb-4 text-center"
            style={{ color: textPrimary }}
          >
            ⚠️ Casos Retrasados por Etapa de Trazabilidad
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={retrasosPorEtapaData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2D2D2D' : '#E5E7EB'} />
              <XAxis 
                dataKey="etapa"
                tick={{ fontSize: 11, fill: textPrimary }}
                stroke={borderColor}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: textPrimary }}
                stroke={borderColor}
              />
              <Tooltip 
                formatter={(value) => [`${value} retrasados`, 'Cantidad']}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary
                }}
              />
              <Bar dataKey="retrasados" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cumplimiento por Responsable */}
        <div 
          className="shadow rounded-lg p-4 sm:p-6"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3 
            className="text-base sm:text-lg font-semibold mb-4 text-center"
            style={{ color: textPrimary }}
          >
            👥 Cumplimiento de Trazabilidad por Responsable
          </h3>
          {cumplimientoPorResponsableArray.length > 0 ? (
            <>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs sm:text-sm" style={{ color: textPrimary }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <th className="text-left py-2 px-2" style={{ color: textSecondary }}>Responsable</th>
                      <th className="text-center py-2 px-2" style={{ color: textSecondary }}>Total Casos</th>
                      <th className="text-center py-2 px-2" style={{ color: textSecondary }}>Cumplidos</th>
                      <th className="text-center py-2 px-2" style={{ color: textSecondary }}>Retrasados</th>
                      <th className="text-center py-2 px-2" style={{ color: textSecondary }}>% Cumplimiento</th>
                      <th className="text-center py-2 px-2" style={{ color: textSecondary }}>Prom. Días Retraso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cumplimientoPorResponsableArray.map((resp, index) => (
                      <tr 
                        key={index} 
                        style={{ 
                          borderBottom: `1px solid ${borderColor}`,
                          backgroundColor: index % 2 === 0 
                            ? (theme === 'dark' ? '#1F1F1F' : '#F9FAFB') 
                            : 'transparent'
                        }}
                      >
                        <td className="py-2 px-2 font-medium">{resp.nombre}</td>
                        <td className="py-2 px-2 text-center">{resp.totalCasos}</td>
                        <td className="py-2 px-2 text-center" style={{ color: '#22C55E' }}>
                          {resp.casosCumplidos}
                        </td>
                        <td className="py-2 px-2 text-center" style={{ color: '#EF4444' }}>
                          {resp.casosRetrasados}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span 
                            style={{ 
                              color: parseFloat(resp.porcentajeCumplimiento) >= 80 
                                ? '#22C55E' 
                                : parseFloat(resp.porcentajeCumplimiento) >= 50 
                                  ? '#EAB308' 
                                  : '#EF4444' 
                            }}
                            className="font-bold"
                          >
                            {resp.porcentajeCumplimiento}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center" style={{ color: textSecondary }}>
                          {resp.promedioDiasRetraso === '0' ? '-' : `${resp.promedioDiasRetraso} días`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Gráfica de cumplimiento */}
              <div style={{ width: '100%', height: Math.max(400, cumplimientoPorResponsableArray.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cumplimientoPorResponsableArray} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2D2D2D' : '#E5E7EB'} />
                    <XAxis 
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: textPrimary }}
                      stroke={borderColor}
                    />
                    <YAxis 
                      dataKey="nombre"
                      type="category"
                      width={140}
                      tick={{ fontSize: 10, fill: textPrimary }}
                      stroke={borderColor}
                      tickFormatter={(value) => {
                        if (value && value.length > 25) {
                          return value.substring(0, 22) + '...';
                        }
                        return value;
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Cumplimiento']}
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
                        border: `1px solid ${borderColor}`,
                        color: textPrimary
                      }}
                    />
                    <Bar dataKey="porcentajeCumplimiento" fill="#667eea" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p style={{ color: textSecondary }} className="text-center py-4">
              No hay suficientes datos para mostrar el cumplimiento por responsable
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;