import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex, deleteCasoComplex } from '../services/complexService';
import { obtenerResponsables, obtenerAseguradoras, obtenerCiudades } from '../services/riesgoService';
import { getEstados } from '../services/estadosService';
import historialService, { TIPOS_FORMULARIOS } from '../services/historialService.js';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { convertirFechaParaExcelDate, formatearFechaUI } from '../utils/fechaUtils';
import { FaFileExcel, FaSlidersH, FaTable, FaTrash } from 'react-icons/fa';
import { cargarMapeoFuncionarios, obtenerNombreFuncionarioDesdeCaso } from '../utils/funcionarioMapper';
import { buildPrefillAjusteDesdeCasoComplex } from '../utils/prefillAjusteDesdeCasoComplex';
import {
  complexBtnGhost,
  complexBtnPrimary,
  complexBtnSecondary,
  complexTableBtnAjuste,
  complexTableBtnEliminar,
  complexTableBtnGestionar,
  complexCard,
  complexInput,
  complexLabel,
  complexModalOverlay,
  complexModalShell,
  complexPageWrapWide,
  complexReportRoot,
  complexScope,
  complexSelect,
  complexTableGrid,
  complexTableHead,
  complexTableTdDivider,
  complexTableThDivider,
  complexTableWrap,
} from './SubcomponenteCompex/complexFenixUi.js';

// Opciones de campos de fecha para el filtro (orden según flujo de trazabilidad)
const camposFechaDisponibles = [
  { clave: 'fchaAsgncion', label: 'Fecha de Asignación' },
  { clave: 'fchaSinstro', label: 'Fecha Siniestro' },
  { clave: 'fchaContIni', label: 'Fecha Contacto Inicial' },
  { clave: 'fchaCoordInspeccion', label: 'Fecha Coordinación de Inspección' },
  { clave: 'fchaProgInspeccion', label: 'Fecha Programada de Inspección' },
  { clave: 'fchaInspccion', label: 'Fecha de Inspección' },
  { clave: 'fchaSoliDocu', label: 'Fecha Solicitud Documentos' },
  { clave: 'fchaInfoPrelm', label: 'Fecha Informe Preliminar' },
  { clave: 'fchaRepoActi', label: 'Fecha Último Documento / Reporte Actualizado' },
  { clave: 'fchaInfoFnal', label: 'Fecha Informe Final' },
  { clave: 'fchaPresentacionCifras', label: 'Fecha Presentación de Cifras' },
  { clave: 'fchaAceptacionCifrasAseguradora', label: 'Fecha Aceptación de Cifras (Aseguradora)' },
  { clave: 'fchaEnvioFiniquito', label: 'Fecha Envío de Finiquito' },
  { clave: 'fchaFactra', label: 'Fecha Factura' },
  { clave: 'fchaUltSegui', label: 'Fecha Último Seguimiento' },
  { clave: 'fchaActSegui', label: 'Fecha Actual Seguimiento' },
  { clave: 'fchaFinqtoIndem', label: 'Fecha Fin Quito Indemnización' },
  { clave: 'fchaUltRevi', label: 'Fecha Última Revisión' },
  { clave: 'createdAt', label: 'Fecha de Creación' },
  { clave: 'updatedAt', label: 'Fecha de Actualización' }
];

// Campos disponibles: orden de columnas alineado con trazabilidad (fechas y anexos por etapa)
const todosLosCampos = [
  { clave: 'nmroAjste', label: 'No. Ajuste' },
  { clave: 'nmroSinstro', label: 'No. de Siniestro' },
  { clave: 'nombIntermediario', label: 'Intermediario' },
  { clave: 'codWorkflow', label: 'Cod Workflow' },
  { clave: 'nmroPolza', label: 'No. de Poliza' },
  { clave: 'codiRespnsble', label: 'Responsable' },
  { clave: 'codiAsgrdra', label: 'Aseguradora' },
  { clave: 'asgrBenfcro', label: 'Asegurado o Beneficiario' },

  { clave: 'fchaAsgncion', label: 'Fecha Asignacion' },
  { clave: 'fchaSinstro', label: 'Fecha Siniestro' },
  { clave: 'fchaContIni', label: 'Fecha Contacto Inicial' },
  { clave: 'obseContIni', label: 'Observaciones Contacto Inicial' },
  { clave: 'anexContIni', label: 'Anexos Contacto Inicial' },
  { clave: 'fchaCoordInspeccion', label: 'Fecha Coordinación Inspección' },
  { clave: 'fchaProgInspeccion', label: 'Fecha Programada Inspección' },
  { clave: 'obseCoordInspeccion', label: 'Observaciones Coordinación Inspección' },
  { clave: 'fchaInspccion', label: 'Fecha de Inspeccion' },
  { clave: 'obseInspccion', label: 'Observaciones Inspección' },
  { clave: 'anexActaInspccion', label: 'Anexos Acta Inspección' },
  { clave: 'fchaSoliDocu', label: 'Fecha Solicitud Documentos' },
  { clave: 'obseSoliDocu', label: 'Observaciones Solicitud Docs' },
  { clave: 'anexSolDoc', label: 'Anexos Solicitud Docs' },
  { clave: 'fchaInfoPrelm', label: 'Fecha Informe Preliminar' },
  { clave: 'obseInfoPrelm', label: 'Observaciones Informe Preliminar' },
  { clave: 'anxoInfPrelim', label: 'Anexos Informe Preliminar' },
  { clave: 'fchaRepoActi', label: 'Fecha Último Documento / Reporte Actualizado' },
  { clave: 'obseRepoActi', label: 'Observaciones Último Documento' },
  { clave: 'anxoRepoActi', label: 'Anexos Último Documento' },
  { clave: 'fchaInfoFnal', label: 'Fecha Informe Final' },
  { clave: 'obseInfoFnal', label: 'Observaciones Informe Final' },
  { clave: 'anxoInfoFnal', label: 'Anexos Informe Final' },
  { clave: 'fchaPresentacionCifras', label: 'Fecha Presentación de Cifras' },
  { clave: 'fchaAceptacionCifrasAseguradora', label: 'Fecha Aceptación Cifras (Aseguradora)' },
  { clave: 'obsePresentacionCifras', label: 'Observaciones Presentación de Cifras' },
  { clave: 'anxoPresentacionCifras', label: 'Adjunto Presentación de Cifras' },
  { clave: 'fchaEnvioFiniquito', label: 'Fecha Envío de Finiquito' },
  { clave: 'obseEnvioFiniquito', label: 'Observaciones Envío de Finiquito' },
  { clave: 'anxoEnvioFiniquito', label: 'Adjunto Envío de Finiquito' },

  { clave: 'descSinstro', label: 'Descripción Siniestro' },
  { clave: 'ciudadSiniestro', label: 'Ciudad Siniestro' },
  { clave: 'codiEstdo', label: 'Estado del Siniestro' },
  { clave: 'funcAsgrdra', label: 'Funcionario Aseguradora' },
  { clave: 'tipoDucumento', label: 'Tipo Documento' },
  { clave: 'numDocumento', label: 'Número Documento' },
  { clave: 'tipoPoliza', label: 'Tipo Poliza' },
  { clave: 'amprAfctdo', label: 'Amparo Afectado' },
  { clave: 'causa_siniestro', label: 'Causa Siniestro' },
  { clave: 'dias_transcrrdo', label: 'Días Transcurridos' },

  { clave: 'vlor_resrva', label: 'Valor Reserva' },
  { clave: 'vlor_reclmo', label: 'Valor del Reclamo' },
  { clave: 'monto_indmzar', label: 'Monto a Indemnizar' },
  { clave: 'observacionesValores', label: 'Observaciones Valores' },

  { clave: 'nmroFactra', label: 'Número Factura' },
  { clave: 'fchaFactra', label: 'Fecha Factura' },
  { clave: 'vlorServcios', label: 'Valor Servicios' },
  { clave: 'vlorGastos', label: 'Valor Gastos' },
  { clave: 'total', label: 'Total Base' },
  { clave: 'totalGeneral', label: 'Total General' },
  { clave: 'totalPagado', label: 'Total Pagado' },
  { clave: 'iva', label: 'IVA' },
  { clave: 'reteiva', label: 'ReteIVA' },
  { clave: 'retefuente', label: 'ReteFuente' },
  { clave: 'reteica', label: 'ReteICA' },
  { clave: 'porcIva', label: '% IVA' },
  { clave: 'porcReteiva', label: '% ReteIVA' },
  { clave: 'porcRetefuente', label: '% ReteFuente' },
  { clave: 'porcReteica', label: '% ReteICA' },
  { clave: 'anxoFactra', label: 'Anexos Facturación' },

  { clave: 'fchaUltSegui', label: 'Fecha Último Seguimiento' },
  { clave: 'fchaActSegui', label: 'Fecha Actual Seguimiento' },
  { clave: 'fchaFinqtoIndem', label: 'Fecha Fin Quito Indemnización' },
  { clave: 'fchaUltRevi', label: 'Fecha Última Revisión' },
  { clave: 'fcha_control_horas', label: 'Fecha Control de Horas' },
  { clave: 'fcha_envio_control_horas', label: 'Fecha Envío Control de Horas' },
  { clave: 'fcha_seguimiento_envio_control_horas', label: 'Fecha Seguimiento Envío Control de Horas' },
  { clave: 'obseComprmsi', label: 'Observaciones Compromisos' },
  { clave: 'obseSegmnto', label: 'Observaciones Seguimiento' },

  { clave: 'anxoHonorarios', label: 'Anexos Honorarios' },
  { clave: 'anxoHonorariosdefinit', label: 'Anexos Honorarios Definitivos' },
  { clave: 'anxoAutorizacion', label: 'Anexos Autorización' },
  { clave: 'honorarios', label: 'Honorarios' },
  { clave: 'honorariosDefinitivos', label: 'Honorarios Definitivos' },
  { clave: 'autorizacionHonorarios', label: 'Autorización Honorarios' },

  { clave: 'liquidacionPerdida', label: 'Liquidación de la Pérdida' },
  { clave: 'indemnizacion', label: 'Indemnización' },
  { clave: 'salvamentos', label: 'Salvamentos' },
  { clave: 'panoramaRiesgos', label: 'Panorama de Riesgos' },

  { clave: 'createdAt', label: 'Fecha Creación' },
  { clave: 'updatedAt', label: 'Fecha Actualización' }
];

const columnasIniciales = [
  'nmroAjste',
  'nmroSinstro',
  'nombIntermediario',
  'codWorkflow',
  'nmroPolza',
  'codiRespnsble',
  'codiAsgrdra',
  'asgrBenfcro',
  'fchaAsgncion',
  'fchaSinstro',
  'fchaContIni',
  'fchaCoordInspeccion',
  'fchaProgInspeccion',
  'fchaInspccion',
  'fchaSoliDocu',
  'fchaInfoPrelm',
  'fchaRepoActi',
  'fchaInfoFnal',
  'fchaPresentacionCifras',
  'fchaAceptacionCifrasAseguradora',
  'fchaEnvioFiniquito',
  'descSinstro',
  'ciudadSiniestro',
  'codiEstdo',
  'funcAsgrdra',
  'tipoDucumento',
  'numDocumento',
  'tipoPoliza',
  'amprAfctdo',
  'causa_siniestro',
  'dias_transcrrdo',
  'vlor_resrva',
  'vlor_reclmo',
  'monto_indmzar',
  'nmroFactra',
  'fchaFactra',
  'vlorServcios',
  'vlorGastos',
  'total',
  'totalGeneral',
  'totalPagado'
];

// Función para sincronizar campos camelCase y snake_case
const sincronizarCamelSnake = (caso) => {
  if (!caso || typeof caso !== 'object') return caso;
  const resultado = { ...caso };
  
  const camposCamelSnake = [
    ['vlorResrva', 'vlor_resrva'],
    ['vlorReclmo', 'vlor_reclmo'],
    ['montoIndmzar', 'monto_indmzar'],
    ['codiRespnsble', 'codi_responble'],
    ['nombreResponsable', 'responsable'],
    ['funcAsgrdraNombre', 'funcionarioAseguradora'],
    ['fchaPresentacionCifras', 'fcha_presentacion_cifras'],
    ['fchaAceptacionCifrasAseguradora', 'fcha_aceptacion_cifras_aseguradora'],
    ['fchaEnvioFiniquito', 'fcha_envio_finiquito'],
    ['fchaCoordInspeccion', 'fcha_coord_inspeccion'],
    ['fchaProgInspeccion', 'fcha_prog_inspeccion'],
    ['obseCoordInspeccion', 'obse_coord_inspeccion'],
    ['obsePresentacionCifras', 'obse_presentacion_cifras'],
    ['obseEnvioFiniquito', 'obse_envio_finiquito'],
    ['anxoPresentacionCifras', 'anxo_presentacion_cifras'],
    ['anxoEnvioFiniquito', 'anxo_envio_finiquito'],
    ['nmroFactra', 'nmro_factra'],
    ['fchaFactra', 'fcha_factra'],
    ['vlorServcios', 'vlor_servcios'],
    ['vlorGastos', 'vlor_gastos']
  ];

  camposCamelSnake.forEach(([camel, snake]) => {
    const camelVal = resultado[camel];
    const snakeVal = resultado[snake];
    if (camelVal !== undefined && camelVal !== null && camelVal !== '') {
      resultado[snake] = camelVal;
    } else if (snakeVal !== undefined && snakeVal !== null && snakeVal !== '') {
      resultado[camel] = snakeVal;
    }
  });

  return resultado;
};

export default function ReporteCasosMejorado() {
  const navigate = useNavigate();
  const location = useLocation();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [estados, setEstados] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [camposVisibles, setCamposVisibles] = useState(
    todosLosCampos.filter(c => columnasIniciales.includes(c.clave))
  );
  const [modalColumnasOpen, setModalColumnasOpen] = useState(false);
  const [seleccionTemporal, setSeleccionTemporal] = useState(camposVisibles.map(c => c.clave));
  const [columnasOrdenadas, setColumnasOrdenadas] = useState(camposVisibles);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [orden, setOrden] = useState({ campo: 'fchaAsgncion', asc: false });
  
  // Obtener rol del usuario
  const rolUsuario = localStorage.getItem('rol') || '';
  const esAdminOSoporte = rolUsuario === 'admin' || rolUsuario === 'soporte';
  
  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [campoFechaFiltro, setCampoFechaFiltro] = useState('fchaAsgncion');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [responsableFiltro, setResponsableFiltro] = useState('');
  const [aseguradoraFiltro, setAseguradoraFiltro] = useState('');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [casosFiltrados, setCasosFiltrados] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const casosPorPagina = 15;
  const filtrosAplicadosRef = useRef(false);

  // Restaurar filtros desde el estado de navegación cuando se reciben
  useEffect(() => {
    const filtrosDesdeNavegacion = location.state?.filtros;
    if (filtrosDesdeNavegacion && !filtrosAplicadosRef.current) {
      console.log('🔄 Restaurando filtros desde navegación:', filtrosDesdeNavegacion);
      setFechaDesde(filtrosDesdeNavegacion.fechaDesde || '');
      setFechaHasta(filtrosDesdeNavegacion.fechaHasta || '');
      setCampoFechaFiltro(filtrosDesdeNavegacion.campoFechaFiltro || 'fchaAsgncion');
      setEstadoFiltro(filtrosDesdeNavegacion.estadoFiltro || '');
      setResponsableFiltro(filtrosDesdeNavegacion.responsableFiltro || '');
      setAseguradoraFiltro(filtrosDesdeNavegacion.aseguradoraFiltro || '');
      setTerminoBusqueda(filtrosDesdeNavegacion.terminoBusqueda || '');
      filtrosAplicadosRef.current = true;
      // Limpiar el estado de navegación después de aplicar los filtros
      setTimeout(() => {
        navigate(location.pathname, { replace: true, state: {} });
        filtrosAplicadosRef.current = false;
      }, 100);
    } else if (!location.state?.filtros) {
      // Resetear la referencia cuando no hay filtros en el estado
      filtrosAplicadosRef.current = false;
    }
  }, [location.state, navigate]);

  // Cargar casos y datos auxiliares al montar el componente
  useEffect(() => {
    cargarCasos();
    
    // Cargar mapeo de funcionarios (importante para mostrar nombres en lugar de códigos)
    cargarMapeoFuncionarios()
      .then(() => {
        console.log('✅ Mapeo de funcionarios cargado correctamente');
      })
      .catch(error => {
        console.error('Error cargando mapeo de funcionarios:', error);
      });
    
    // Cargar responsables
    obtenerResponsables()
      .then(data => {
        const responsablesData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
        setResponsables(responsablesData);
      })
      .catch(error => {
        console.error('Error cargando responsables:', error);
        setResponsables([]);
      });

    // Cargar aseguradoras
    obtenerAseguradoras()
      .then(data => {
        const aseguradorasData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
        setAseguradoras(aseguradorasData);
      })
      .catch(error => {
        console.error('Error cargando aseguradoras:', error);
        setAseguradoras([]);
      });

    // Cargar estados
    getEstados()
      .then(data => {
        setEstados(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error('Error cargando estados:', error);
        setEstados([]);
      });

    // Cargar ciudades
    obtenerCiudades()
      .then(data => {
        const ciudadesData = Array.isArray(data) ? data : (data?.data || []);
        setCiudades(ciudadesData);
      })
      .catch(error => {
        console.error('Error cargando ciudades:', error);
        setCiudades([]);
      });
  }, []);

  // Efecto para analizar casos de Zurich cuando se cargan casos y aseguradoras
  useEffect(() => {
    if (casos.length > 0 && aseguradoras.length > 0) {
      // Buscar el código de Zurich en la lista de aseguradoras
      const zurichAseguradora = aseguradoras.find(a => {
        const nombre = String(a.rzonSocial || '').toLowerCase();
        return nombre.includes('zurich');
      });
      
      if (zurichAseguradora) {
        const codigoZurich = String(zurichAseguradora.codiAsgrdra || zurichAseguradora.cod1Asgrdra || '').trim();
        console.log(`🏢 Código de Zurich encontrado: ${codigoZurich}`);
        
        // Contar casos de Zurich
        const casosZurich = casos.filter(caso => {
          const codigo = String(caso.codiAsgrdra || caso.cod1Asgrdra || '').trim();
          return codigo === codigoZurich;
        });
        console.log(`📊 Total casos de Zurich en BD: ${casosZurich.length}`);
        
        // Contar casos de Zurich por año
        const zurichPorAno = {};
        casosZurich.forEach(caso => {
          const fecha = caso.fchaAsgncion || caso.fecha_asignacion_form || caso.createdAt;
          if (fecha) {
            try {
              const fechaObj = new Date(fecha);
              if (!isNaN(fechaObj.getTime())) {
                const año = fechaObj.getFullYear();
                zurichPorAno[año] = (zurichPorAno[año] || 0) + 1;
              }
            } catch (e) {
              // Ignorar fechas inválidas
            }
          }
        });
        console.log('📊 Casos de Zurich por año:', zurichPorAno);
        
        // Contar casos de Zurich en 2025
        const zurich2025 = casosZurich.filter(caso => {
          const fecha = caso.fchaAsgncion || caso.fecha_asignacion_form || caso.createdAt;
          if (fecha) {
            try {
              const fechaObj = new Date(fecha);
              if (!isNaN(fechaObj.getTime())) {
                return fechaObj.getFullYear() === 2025;
              }
            } catch (e) {
              // Ignorar fechas inválidas
            }
          }
          return false;
        });
        console.log(`📊 Casos de Zurich en 2025: ${zurich2025.length}`);
      } else {
        console.log('⚠️ No se encontró Zurich en la lista de aseguradoras');
      }
    }
  }, [casos, aseguradoras]);

  const cargarCasos = async () => {
    setLoading(true);
    try {
      // Cargar casos de ambas fuentes
      const [siniestrosData, complexData] = await Promise.allSettled([
        getSiniestrosEnriquecidos(),
        obtenerCasosComplex()
      ]);

      const siniestros = siniestrosData.status === 'fulfilled' 
        ? (Array.isArray(siniestrosData.value) ? siniestrosData.value : [])
        : [];
      
      const complex = complexData.status === 'fulfilled'
        ? (Array.isArray(complexData.value) ? complexData.value : [])
        : [];

      // Combinar y sincronizar casos
      const todosLosCasos = [...siniestros, ...complex].map(sincronizarCamelSnake);
      
      // Eliminar duplicados basado en número de ajuste
      const casosUnicos = new Map();
      todosLosCasos.forEach(caso => {
        const numeroAjuste = caso.nmroAjste || caso.numero_ajuste;
        if (numeroAjuste && !casosUnicos.has(numeroAjuste)) {
          casosUnicos.set(numeroAjuste, caso);
        } else if (!numeroAjuste && caso._id) {
          casosUnicos.set(caso._id, caso);
        }
      });

      const casosFinales = Array.from(casosUnicos.values());
      
      // Ordenar por fecha de asignación (más recientes primero)
      casosFinales.sort((a, b) => {
        const fechaA = new Date(a.fchaAsgncion || a.fecha_asignacion_form || 0);
        const fechaB = new Date(b.fchaAsgncion || b.fecha_asignacion_form || 0);
        return fechaB - fechaA;
      });

      console.log(`📊 Casos cargados: ${casosFinales.length} casos totales`);
      console.log(`📊 Siniestros: ${siniestros.length}, Complex: ${complex.length}`);
      
      // Contar casos por estado para debugging
      const casosPorEstado = {};
      casosFinales.forEach(caso => {
        const estado = String(caso.codiEstdo || caso.codi_estado || caso.estado || 'Sin estado').trim();
        casosPorEstado[estado] = (casosPorEstado[estado] || 0) + 1;
      });
      console.log('📊 Casos por estado:', casosPorEstado);
      
      // Contar casos por aseguradora para debugging
      const casosPorAseguradora = {};
      casosFinales.forEach(caso => {
        const codigoAseguradora = String(caso.codiAsgrdra || caso.cod1Asgrdra || 'Sin código').trim();
        casosPorAseguradora[codigoAseguradora] = (casosPorAseguradora[codigoAseguradora] || 0) + 1;
      });
      console.log('📊 Casos por aseguradora (código):', casosPorAseguradora);
      
      // Contar casos por año para debugging
      const casosPorAno = {};
      casosFinales.forEach(caso => {
        const fecha = caso.fchaAsgncion || caso.fecha_asignacion_form || caso.createdAt;
        if (fecha) {
          const fechaObj = new Date(fecha);
          const año = fechaObj.getFullYear();
          casosPorAno[año] = (casosPorAno[año] || 0) + 1;
        }
      });
      console.log('📊 Casos por año:', casosPorAno);

      setCasos(casosFinales);
    } catch (error) {
      console.error('Error cargando casos:', error);
      setCasos([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar el orden de la tabla
  const cambiarOrden = (campo) => {
    setOrden(prev => ({
      campo,
      asc: prev.campo === campo ? !prev.asc : true
    }));
  };

  // Función para aplicar filtros
  const aplicarFiltros = () => {
    if (casos.length === 0) {
      setCasosFiltrados([]);
      return;
    }
    
    // Debug: mostrar filtros activos
    console.log('🔍 Aplicando filtros:', {
      estadoFiltro,
      responsableFiltro,
      aseguradoraFiltro,
      fechaDesde,
      fechaHasta,
      campoFechaFiltro,
      terminoBusqueda,
      totalCasos: casos.length
    });
    
    // Análisis previo de casos de Zurich si hay filtro de aseguradora
    if (aseguradoraFiltro && aseguradoras.length > 0) {
      const aseguradoraEncontrada = aseguradoras.find(a => {
        const cod1 = String(a.codiAsgrdra || '').trim();
        const cod2 = String(a.cod1Asgrdra || '').trim();
        return cod1 === String(aseguradoraFiltro).trim() || cod2 === String(aseguradoraFiltro).trim();
      });
      
      if (aseguradoraEncontrada) {
        const codigosZurich = [
          String(aseguradoraEncontrada.codiAsgrdra || '').trim(),
          String(aseguradoraEncontrada.cod1Asgrdra || '').trim()
        ].filter(c => c !== '');
        
        console.log('🏢 Códigos de aseguradora seleccionada:', codigosZurich);
        console.log('🏢 Nombre:', aseguradoraEncontrada.rzonSocial);
        
        // Analizar TODOS los códigos únicos de aseguradora en los casos
        const todosCodigosUnicos = new Set();
        casos.forEach(caso => {
          const cod1 = String(caso.codiAsgrdra || '').trim();
          const cod2 = String(caso.cod1Asgrdra || '').trim();
          if (cod1) todosCodigosUnicos.add(cod1);
          if (cod2) todosCodigosUnicos.add(cod2);
        });
        
        console.log('🔍 Todos los códigos únicos de aseguradora en casos (primeros 30):', Array.from(todosCodigosUnicos).slice(0, 30));
        console.log('🔍 ¿Están los códigos de Zurich en la lista?', {
          codigo1: codigosZurich[0],
          codigo2: codigosZurich[1],
          encontrado1: todosCodigosUnicos.has(codigosZurich[0]),
          encontrado2: codigosZurich[1] ? todosCodigosUnicos.has(codigosZurich[1]) : false
        });
        
        // Buscar casos que tengan el nombre de Zurich en cualquier campo
        const casosConNombreZurich = casos.filter(caso => {
          const nombreZurich = aseguradoraEncontrada.rzonSocial.toLowerCase();
          const camposTexto = Object.values(caso).filter(v => 
            v !== null && v !== undefined && typeof v === 'string'
          );
          
          return camposTexto.some(texto => {
            const textoLower = texto.toLowerCase();
            return textoLower.includes('zurich') || 
                   textoLower.includes('zúrich') ||
                   textoLower.includes(nombreZurich);
          });
        });
        
        console.log(`🔍 Casos que contienen "zurich" o "zúrich" en algún campo: ${casosConNombreZurich.length}`);
        
        // Contar casos de Zurich antes de filtrar - buscar por AMBOS códigos
        const casosZurich = casos.filter(caso => {
          const codigosCaso = [
            String(caso.codiAsgrdra || '').trim(),
            String(caso.cod1Asgrdra || '').trim()
          ].filter(c => c !== '');
          
          // Verificar si alguno de los códigos del caso coincide con alguno de los códigos de Zurich
          const coincide = codigosCaso.some(codCaso => codigosZurich.includes(codCaso));
          
          // También verificar comparación numérica si son números
          if (!coincide) {
            for (const codCaso of codigosCaso) {
              for (const codZurich of codigosZurich) {
                const numCaso = Number(codCaso);
                const numZurich = Number(codZurich);
                if (!isNaN(numCaso) && !isNaN(numZurich) && numCaso === numZurich) {
                  return true;
                }
              }
            }
          }
          
          return coincide;
        });
        
        console.log(`🏢 Total casos de ${aseguradoraEncontrada.rzonSocial} ANTES de filtros: ${casosZurich.length}`);
        
        // Analizar códigos únicos encontrados en los casos
        const codigosUnicosEncontrados = new Set();
        casosZurich.forEach(caso => {
          const cod1 = String(caso.codiAsgrdra || '').trim();
          const cod2 = String(caso.cod1Asgrdra || '').trim();
          if (cod1) codigosUnicosEncontrados.add(cod1);
          if (cod2) codigosUnicosEncontrados.add(cod2);
        });
        console.log('🏢 Códigos únicos encontrados en casos:', Array.from(codigosUnicosEncontrados));
        
        // Analizar fechas de casos de Zurich
        if (fechaDesde || fechaHasta) {
          const casosZurichConFecha = casosZurich.filter(c => c[campoFechaFiltro]);
          const casosZurichSinFecha = casosZurich.filter(c => !c[campoFechaFiltro]);
          
          console.log(`📅 Casos de ${aseguradoraEncontrada.rzonSocial} CON fecha en ${campoFechaFiltro}: ${casosZurichConFecha.length}`);
          console.log(`📅 Casos de ${aseguradoraEncontrada.rzonSocial} SIN fecha en ${campoFechaFiltro}: ${casosZurichSinFecha.length}`);
          
          // Contar casos en el rango de fechas
          const casosZurichEnRango = casosZurichConFecha.filter(caso => {
            try {
              const f = new Date(caso[campoFechaFiltro]);
              if (isNaN(f.getTime())) return false;
              
              const fechaCaso = new Date(f.getFullYear(), f.getMonth(), f.getDate());
              
              if (fechaDesde) {
                const fechaDesdeNormalizada = new Date(fechaDesde);
                fechaDesdeNormalizada.setHours(0, 0, 0, 0);
                if (fechaCaso < fechaDesdeNormalizada) return false;
              }
              
              if (fechaHasta) {
                const fechaHastaNormalizada = new Date(fechaHasta);
                fechaHastaNormalizada.setHours(23, 59, 59, 999);
                if (fechaCaso > fechaHastaNormalizada) return false;
              }
              
              return true;
            } catch (e) {
              return false;
            }
          });
          
          console.log(`📅 Casos de ${aseguradoraEncontrada.rzonSocial} en rango ${fechaDesde || 'sin inicio'} a ${fechaHasta || 'sin fin'}: ${casosZurichEnRango.length}`);
          
          // Mostrar algunos ejemplos de casos fuera del rango
          const casosFueraRango = casosZurichConFecha.filter(caso => {
            try {
              const f = new Date(caso[campoFechaFiltro]);
              if (isNaN(f.getTime())) return true;
              
              const fechaCaso = new Date(f.getFullYear(), f.getMonth(), f.getDate());
              
              if (fechaDesde) {
                const fechaDesdeNormalizada = new Date(fechaDesde);
                fechaDesdeNormalizada.setHours(0, 0, 0, 0);
                if (fechaCaso < fechaDesdeNormalizada) return true;
              }
              
              if (fechaHasta) {
                const fechaHastaNormalizada = new Date(fechaHasta);
                fechaHastaNormalizada.setHours(23, 59, 59, 999);
                if (fechaCaso > fechaHastaNormalizada) return true;
              }
              
              return false;
            } catch (e) {
              return true;
            }
          });
          
          if (casosFueraRango.length > 0) {
            console.log(`⚠️ Casos de ${aseguradoraEncontrada.rzonSocial} FUERA del rango: ${casosFueraRango.length}`);
            console.log('📋 Primeros 5 casos fuera del rango:', casosFueraRango.slice(0, 5).map(c => ({
              numeroAjuste: c.nmroAjste || c.numero_ajuste,
              fecha: c[campoFechaFiltro],
              aseguradora: c.codiAsgrdra || c.cod1Asgrdra
            })));
          }
        }
      }
    }
    
    // Contador para debugging
    let contadorInicial = 0;
    let contadorDespuesTexto = 0;
    let contadorDespuesFecha = 0;
    let contadorDespuesEstado = 0;
    let contadorDespuesResponsable = 0;
    let contadorDespuesAseguradora = 0;
    
    const resultados = casos.filter(caso => {
      contadorInicial++;
      let ok = true;
      const razonesExclusion = [];
      
      // Filtro por búsqueda de texto
      if (terminoBusqueda && terminoBusqueda.trim()) {
        const encontrado = camposVisibles.some(campo => {
          const valor = caso[campo.clave];
          if (valor && typeof valor === 'string') {
            return valor.toLowerCase().includes(terminoBusqueda.toLowerCase());
          }
          return false;
        });
        if (!encontrado) {
          ok = false;
          razonesExclusion.push('búsqueda texto');
        }
      }
      if (ok) contadorDespuesTexto++;
      
      // Filtro por fechas - buscar en el campo seleccionado y en campos alternativos
      if (fechaDesde || fechaHasta) {
        let fechaCaso = null;
        
        // Primero buscar en el campo seleccionado
        const valorFecha = caso[campoFechaFiltro];
        if (valorFecha) {
          try {
            const fechaTemp = new Date(valorFecha);
            if (!isNaN(fechaTemp.getTime())) {
              fechaCaso = new Date(fechaTemp.getFullYear(), fechaTemp.getMonth(), fechaTemp.getDate());
            }
          } catch (e) {
            // Ignorar errores
          }
        }
        
        // Si no hay fecha en el campo seleccionado, buscar en otros campos de fecha comunes
        if (!fechaCaso) {
          const camposFechaAlternativos = [
            'fchaAsgncion', 'fchaInspccion', 'fchaContIni', 'fchaSinstro',
            'fecha_asignacion_form', 'fecha_asignacion', 'createdAt'
          ];
          
          for (const campoAlt of camposFechaAlternativos) {
            if (campoAlt === campoFechaFiltro) continue; // Ya lo revisamos
            
            const valorAlt = caso[campoAlt];
            if (valorAlt) {
              try {
                const fechaTemp = new Date(valorAlt);
                if (!isNaN(fechaTemp.getTime())) {
                  fechaCaso = new Date(fechaTemp.getFullYear(), fechaTemp.getMonth(), fechaTemp.getDate());
                  break; // Usar la primera fecha válida encontrada
                }
              } catch (e) {
                // Continuar buscando
              }
            }
          }
        }
        
        // Aplicar filtro de fechas solo si hay una fecha válida
        if (fechaCaso) {
          if (fechaDesde) {
            const fechaDesdeNormalizada = new Date(fechaDesde);
            fechaDesdeNormalizada.setHours(0, 0, 0, 0);
            if (fechaCaso < fechaDesdeNormalizada) {
              ok = false;
              razonesExclusion.push(`fecha antes de ${fechaDesde}`);
            }
          }
          if (fechaHasta && ok) { // Solo verificar si aún pasa el filtro anterior
            const fechaHastaNormalizada = new Date(fechaHasta);
            fechaHastaNormalizada.setHours(23, 59, 59, 999);
            if (fechaCaso > fechaHastaNormalizada) {
              ok = false;
              razonesExclusion.push(`fecha después de ${fechaHasta}`);
            }
          }
        } else {
          // Si no hay fecha en ningún campo, NO excluir el caso
          // (permitir casos sin fecha para no perder datos)
          // Solo agregar a razones para debugging
          razonesExclusion.push(`sin fecha en ningún campo`);
        }
      }
      if (ok) contadorDespuesFecha++;
      
      // Filtro por estado - buscar en todos los campos posibles y por nombre
      if (estadoFiltro && estadoFiltro.trim() !== '') {
        const estadoFiltroStr = String(estadoFiltro).trim();
        
        // Buscar el estado en todos los campos posibles del caso
        const estadoCaso = String(
          caso.codiEstdo || 
          caso.codi_estado || 
          caso.codiEstado || 
          caso.codi_estdo || 
          caso.estado || 
          ''
        ).trim();
        
        // También verificar si el estado está en el objeto como número
        const estadoCasoNum = caso.codiEstdo != null ? String(caso.codiEstdo).trim() : '';
        const estadoCasoNum2 = caso.codi_estado != null ? String(caso.codi_estado).trim() : '';
        const estadoCasoNum3 = caso.estado != null ? String(caso.estado).trim() : '';
        
        // Comparación directa por código (exacta)
        let coincide = estadoCaso === estadoFiltroStr || 
                      estadoCasoNum === estadoFiltroStr ||
                      estadoCasoNum2 === estadoFiltroStr ||
                      estadoCasoNum3 === estadoFiltroStr;
        
        // Si no coincide por código exacto, buscar por nombre de estado
        if (!coincide && estados.length > 0) {
          // Buscar el estado en la lista de estados para obtener su descripción
          const estadoEncontrado = estados.find(e => 
            String(e.codiEstdo || e.codiEstado || e.codigo || '').trim() === estadoFiltroStr
          );
          
          if (estadoEncontrado) {
            const nombreEstadoFiltro = String(estadoEncontrado.descEstdo || estadoEncontrado.descEstado || estadoEncontrado.descripcion || '').trim().toUpperCase();
            const nombreEstadoCaso = estadoCaso.toUpperCase();
            
            // Comparar por nombre de estado (case-insensitive, exacto o parcial)
            coincide = nombreEstadoCaso === nombreEstadoFiltro ||
                      nombreEstadoCaso.includes(nombreEstadoFiltro) ||
                      nombreEstadoFiltro.includes(nombreEstadoCaso);
          }
          
          // Si aún no coincide, buscar casos que tengan el nombre del estado directamente
          // (para casos donde el estado está guardado como nombre en lugar de código)
          if (!coincide) {
            const nombreEstadoFiltro = estadoEncontrado 
              ? String(estadoEncontrado.descEstdo || estadoEncontrado.descEstado || estadoEncontrado.descripcion || '').trim().toUpperCase()
              : estadoFiltroStr.toUpperCase();
            
            const nombreEstadoCaso = estadoCaso.toUpperCase();
            
            // Comparar directamente el nombre del estado del caso con el nombre del estado del filtro
            coincide = nombreEstadoCaso === nombreEstadoFiltro ||
                      nombreEstadoCaso.includes(nombreEstadoFiltro) ||
                      nombreEstadoFiltro.includes(nombreEstadoCaso);
          }
        }
        
        if (!coincide) {
          ok = false;
          razonesExclusion.push('estado no coincide');
        }
      }
      if (ok) contadorDespuesEstado++;
      
      // Filtro por responsable
      if (responsableFiltro && responsableFiltro.trim() !== '') {
        const filtroStr = String(responsableFiltro).trim();
        let coincide = false;
        
        // Comparar por código del caso
        const codigoCaso = String(caso.codiRespnsble || caso.codi_responble || caso.responsable || '').trim();
        if (codigoCaso === filtroStr) {
          coincide = true;
        }
        
        // Comparar por nombre del responsable
        if (!coincide) {
          const nombreCaso = getNombreResponsable(caso);
          if (nombreCaso && nombreCaso.trim() !== '') {
            const nombreCasoStr = nombreCaso.trim();
            if (nombreCasoStr === filtroStr || 
                nombreCasoStr.toLowerCase() === filtroStr.toLowerCase()) {
              coincide = true;
            }
          }
        }
        
        // Comparar usando la lista de responsables
        if (!coincide && responsables.length > 0) {
          const responsableEncontrado = responsables.find(r => 
            String(r.codiRespnsble || r.codigo || '').trim() === filtroStr
          );
          if (responsableEncontrado) {
            const codigoCasoStr = codigoCaso;
            const codigoResponsableStr = String(responsableEncontrado.codiRespnsble || responsableEncontrado.codigo || '').trim();
            const nombreCaso = getNombreResponsable(caso);
            const nombreResponsableStr = String(responsableEncontrado.nmbrRespnsble || responsableEncontrado.nombre || '').trim();
            
            if (codigoCasoStr === codigoResponsableStr || 
                (nombreCaso && nombreCaso.trim() === nombreResponsableStr)) {
              coincide = true;
            }
          }
        }
        
        if (!coincide) {
          ok = false;
          razonesExclusion.push('responsable no coincide');
        }
      }
      if (ok) contadorDespuesResponsable++;
      
      // Filtro por aseguradora - buscar en todos los campos posibles (código Y nombre)
      if (aseguradoraFiltro && aseguradoraFiltro.trim() !== '') {
        const aseguradoraFiltroStr = String(aseguradoraFiltro).trim();
        let coincide = false;
        
        // Función helper para normalizar códigos
        const normalizarCodigo = (codigo) => {
          if (codigo === null || codigo === undefined || codigo === '') return '';
          return String(codigo).trim();
        };
        
        // Función helper para normalizar nombres (sin acentos, minúsculas)
        const normalizarNombre = (nombre) => {
          if (!nombre) return '';
          return String(nombre)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .trim();
        };
        
        // Buscar en todos los campos posibles de aseguradora (códigos y nombres)
        const codigosAseguradora = [
          caso.codiAsgrdra,
          caso.cod1Asgrdra,
          caso.aseguradora,
          caso.codi_asgrdra,
          caso.cod1_asgrdra,
          caso.codiAseguradora // Campo retornado por obtenerSiniestrosEnriquecidos
        ]
        .filter(c => c !== null && c !== undefined && c !== '')
        .map(normalizarCodigo)
        .filter(c => c !== '');
        
        // También buscar nombres de aseguradora en el caso
        const nombresAseguradora = [
          caso.nombreAseguradora,
          caso.aseguradora_form,
          caso.aseguradora_nombre
        ]
        .filter(n => n !== null && n !== undefined && n !== '')
        .map(normalizarNombre)
        .filter(n => n !== '');
        
        const aseguradoraFiltroNormalizada = normalizarCodigo(aseguradoraFiltroStr);
        
        // 1. Comparar códigos directamente
        for (const codigo of codigosAseguradora) {
          if (codigo === aseguradoraFiltroNormalizada) {
            coincide = true;
            break;
          }
        }
        
        // 2. Si no coincide por código, buscar en la lista de aseguradoras
        if (!coincide && aseguradoras.length > 0) {
          // Buscar la aseguradora seleccionada en la lista
          const aseguradoraEncontrada = aseguradoras.find(a => {
            const cod1 = normalizarCodigo(a.codiAsgrdra);
            const cod2 = normalizarCodigo(a.cod1Asgrdra);
            return cod1 === aseguradoraFiltroNormalizada || cod2 === aseguradoraFiltroNormalizada;
          });
          
          if (aseguradoraEncontrada) {
            // Obtener TODOS los códigos posibles de esta aseguradora
            const codigosAseguradoraEncontrada = [
              normalizarCodigo(aseguradoraEncontrada.codiAsgrdra),
              normalizarCodigo(aseguradoraEncontrada.cod1Asgrdra)
            ].filter(c => c !== '');
            
            const nombreAseguradoraEncontrada = normalizarNombre(aseguradoraEncontrada.rzonSocial);
            
            // 2a. Verificar si el caso tiene alguno de estos códigos (string)
            for (const codigoCaso of codigosAseguradora) {
              for (const codigoAseg of codigosAseguradoraEncontrada) {
                if (codigoCaso === codigoAseg) {
                  coincide = true;
                  break;
                }
              }
              if (coincide) break;
            }
            
            // 2b. Verificar si el caso tiene el código en formato numérico
            if (!coincide) {
              for (const codigoCaso of codigosAseguradora) {
                for (const codigoAseg of codigosAseguradoraEncontrada) {
                  const codigoCasoNum = Number(codigoCaso);
                  const codigoAsegNum = Number(codigoAseg);
                  if (!isNaN(codigoCasoNum) && !isNaN(codigoAsegNum) && codigoCasoNum === codigoAsegNum) {
                    coincide = true;
                    break;
                  }
                }
                if (coincide) break;
              }
            }
            
            // 2c. Verificar por nombre de aseguradora SOLO en campos específicos (si no coincide por código)
            // NO buscar en todos los campos de texto para evitar falsos positivos
            if (!coincide && nombreAseguradoraEncontrada) {
              for (const nombreCaso of nombresAseguradora) {
                if (nombreCaso === nombreAseguradoraEncontrada || 
                    nombreCaso.includes(nombreAseguradoraEncontrada) ||
                    nombreAseguradoraEncontrada.includes(nombreCaso)) {
                  coincide = true;
                  break;
                }
              }
            }
          }
        }
        
        if (!coincide) {
          ok = false;
          razonesExclusion.push(`aseguradora no coincide`);
        }
      }
      if (ok) contadorDespuesAseguradora++;
      
      // Log detallado para los primeros casos que se excluyen (solo si hay filtros activos)
      if (!ok && (aseguradoraFiltro || fechaDesde || fechaHasta) && contadorInicial <= 10) {
        console.log(`❌ Caso ${contadorInicial} excluido:`, {
          numeroAjuste: caso.nmroAjste || caso.numero_ajuste,
          aseguradora: caso.codiAsgrdra || caso.cod1Asgrdra,
          fecha: caso[campoFechaFiltro],
          razones: razonesExclusion
        });
      }
      
      return ok;
    });
    
    // Log de contadores
    console.log('📊 Contadores de filtrado:', {
      totalCasos: casos.length,
      despuésTexto: contadorDespuesTexto,
      despuésFecha: contadorDespuesFecha,
      despuésEstado: contadorDespuesEstado,
      despuésResponsable: contadorDespuesResponsable,
      despuésAseguradora: contadorDespuesAseguradora,
      final: resultados.length
    });
    
    console.log(`✅ Filtros aplicados: ${resultados.length} casos de ${casos.length} totales`);
    
    // Análisis directo: casos de Zurich con fechas en 2025
    if (aseguradoraFiltro && aseguradoras.length > 0) {
      const aseguradoraEncontrada = aseguradoras.find(a => {
        const cod1 = String(a.codiAsgrdra || '').trim();
        const cod2 = String(a.cod1Asgrdra || '').trim();
        const filtroStr = String(aseguradoraFiltro).trim();
        return cod1 === filtroStr || cod2 === filtroStr;
      });
      
      if (aseguradoraEncontrada) {
        const codigosAseg = [
          String(aseguradoraEncontrada.codiAsgrdra || '').trim(),
          String(aseguradoraEncontrada.cod1Asgrdra || '').trim()
        ].filter(c => c !== '');
        
        // Buscar TODOS los casos de esta aseguradora manualmente
        const todosCasosAseguradora = casos.filter(caso => {
          const codigosCaso = [
            String(caso.codiAsgrdra || '').trim(),
            String(caso.cod1Asgrdra || '').trim()
          ].filter(c => c !== '');
          
          // Comparar directamente
          const coincideDirecto = codigosCaso.some(codCaso => codigosAseg.includes(codCaso));
          
          // Comparar numéricamente
          if (!coincideDirecto) {
            for (const codCaso of codigosCaso) {
              for (const codAseg of codigosAseg) {
                const numCaso = Number(codCaso);
                const numAseg = Number(codAseg);
                if (!isNaN(numCaso) && !isNaN(numAseg) && numCaso === numAseg) {
                  return true;
                }
              }
            }
          }
          
          return coincideDirecto;
        });
        
        console.log(`🔍 ANÁLISIS DIRECTO: Total casos de ${aseguradoraEncontrada.rzonSocial}: ${todosCasosAseguradora.length}`);
        
        // Filtrar por fechas en 2025
        if (fechaDesde || fechaHasta) {
          const casosConFecha2025 = todosCasosAseguradora.filter(caso => {
            // Buscar fecha en cualquier campo
            const camposFecha = [campoFechaFiltro, 'fchaAsgncion', 'fecha_asignacion_form', 'createdAt'];
            
            for (const campo of camposFecha) {
              const valorFecha = caso[campo];
              if (valorFecha) {
                try {
                  const f = new Date(valorFecha);
                  if (!isNaN(f.getTime())) {
                    const fechaCaso = new Date(f.getFullYear(), f.getMonth(), f.getDate());
                    const año = fechaCaso.getFullYear();
                    
                    // Verificar rango
                    if (fechaDesde) {
                      const fechaDesdeNormalizada = new Date(fechaDesde);
                      fechaDesdeNormalizada.setHours(0, 0, 0, 0);
                      if (fechaCaso < fechaDesdeNormalizada) return false;
                    }
                    
                    if (fechaHasta) {
                      const fechaHastaNormalizada = new Date(fechaHasta);
                      fechaHastaNormalizada.setHours(23, 59, 59, 999);
                      if (fechaCaso > fechaHastaNormalizada) return false;
                    }
                    
                    return true; // Tiene fecha válida en el rango
                  }
                } catch (e) {
                  // Continuar buscando
                }
              }
            }
            
            return false; // No tiene fecha válida
          });
          
          console.log(`🔍 ANÁLISIS DIRECTO: Casos de ${aseguradoraEncontrada.rzonSocial} con fecha en rango: ${casosConFecha2025.length}`);
          console.log(`🔍 ANÁLISIS DIRECTO: Casos que pasaron el filtro completo: ${resultados.length}`);
          console.log(`🔍 DIFERENCIA: ${casosConFecha2025.length - resultados.length} casos no están pasando el filtro`);
        }
      }
    }
    
    // Debug: información adicional sobre filtros aplicados
    if (fechaDesde || fechaHasta) {
      console.log(`📅 Filtro de fechas: ${fechaDesde || 'sin límite'} a ${fechaHasta || 'sin límite'} (campo: ${campoFechaFiltro})`);
      const casosConFecha = resultados.filter(c => c[campoFechaFiltro]);
      console.log(`📅 Casos con fecha en campo ${campoFechaFiltro}: ${casosConFecha.length} de ${resultados.length}`);
    }
    
    if (aseguradoraFiltro && aseguradoraFiltro.trim() !== '') {
      const nombreAseg = getNombreAseguradora(aseguradoraFiltro);
      console.log(`🏢 Filtro de aseguradora: ${nombreAseg} (código: ${aseguradoraFiltro})`);
      
      // Contar casos de la aseguradora seleccionada ANTES de aplicar otros filtros
      const aseguradoraEncontrada = aseguradoras.find(a => {
        const cod1 = String(a.codiAsgrdra || '').trim();
        const cod2 = String(a.cod1Asgrdra || '').trim();
        const filtroStr = String(aseguradoraFiltro).trim();
        return cod1 === filtroStr || cod2 === filtroStr;
      });
      
      if (aseguradoraEncontrada) {
        console.log('🏢 Aseguradora encontrada en lista:', {
          nombre: aseguradoraEncontrada.rzonSocial,
          codiAsgrdra: aseguradoraEncontrada.codiAsgrdra,
          cod1Asgrdra: aseguradoraEncontrada.cod1Asgrdra
        });
      } else {
        console.warn('⚠️ Aseguradora NO encontrada en lista con código:', aseguradoraFiltro);
      }
      
      if (aseguradoraEncontrada) {
        const codigosAseg = [
          String(aseguradoraEncontrada.codiAsgrdra || '').trim(),
          String(aseguradoraEncontrada.cod1Asgrdra || '').trim()
        ].filter(c => c !== '');
        
        const casosAseguradoraSinFiltros = casos.filter(caso => {
          const codigosCaso = [
            String(caso.codiAsgrdra || '').trim(),
            String(caso.cod1Asgrdra || '').trim()
          ].filter(c => c !== '');
          
          return codigosCaso.some(codCaso => codigosAseg.includes(codCaso));
        });
        
        console.log(`🏢 Total casos de ${nombreAseg} SIN filtros: ${casosAseguradoraSinFiltros.length}`);
        
        // Contar casos de la aseguradora que pasan el filtro de fechas
        if (fechaDesde || fechaHasta) {
          const casosAseguradoraConFechas = casosAseguradoraSinFiltros.filter(caso => {
            const f = caso[campoFechaFiltro] ? new Date(caso[campoFechaFiltro]) : null;
            if (!f) return false;
            
            const fechaCaso = new Date(f.getFullYear(), f.getMonth(), f.getDate());
            
            if (fechaDesde) {
              const fechaDesdeNormalizada = new Date(fechaDesde);
              fechaDesdeNormalizada.setHours(0, 0, 0, 0);
              if (fechaCaso < fechaDesdeNormalizada) return false;
            }
            
            if (fechaHasta) {
              const fechaHastaNormalizada = new Date(fechaHasta);
              fechaHastaNormalizada.setHours(23, 59, 59, 999);
              if (fechaCaso > fechaHastaNormalizada) return false;
            }
            
            return true;
          });
          
          console.log(`🏢 Casos de ${nombreAseg} que pasan filtro de fechas: ${casosAseguradoraConFechas.length}`);
          
          // Contar casos sin fecha en el campo seleccionado
          const casosSinFecha = casosAseguradoraSinFiltros.filter(caso => !caso[campoFechaFiltro]);
          console.log(`🏢 Casos de ${nombreAseg} SIN fecha en campo ${campoFechaFiltro}: ${casosSinFecha.length}`);
        }
      }
      
      const casosPorAseguradora = {};
      resultados.forEach(caso => {
        const codigo = String(caso.codiAsgrdra || caso.cod1Asgrdra || 'Sin código').trim();
        casosPorAseguradora[codigo] = (casosPorAseguradora[codigo] || 0) + 1;
      });
      console.log('🏢 Casos por aseguradora después del filtro:', casosPorAseguradora);
    }
    
    // Debug: contar casos por estado después del filtro
    if (estadoFiltro && estadoFiltro.trim() !== '') {
      const casosPorEstadoFiltrado = {};
      resultados.forEach(caso => {
        const estado = String(caso.codiEstdo || caso.codi_estado || caso.estado || 'Sin estado').trim();
        casosPorEstadoFiltrado[estado] = (casosPorEstadoFiltrado[estado] || 0) + 1;
      });
      console.log('📊 Casos por estado después del filtro:', casosPorEstadoFiltrado);
      console.log('🔍 Estado filtrado (código):', estadoFiltro);
      
      // Buscar el nombre del estado correspondiente al código
      const estadoEncontrado = estados.find(e => 
        String(e.codiEstdo || e.codiEstado || e.codigo || '').trim() === String(estadoFiltro).trim()
      );
      if (estadoEncontrado) {
        const nombreEstado = String(estadoEncontrado.descEstdo || estadoEncontrado.descEstado || estadoEncontrado.descripcion || '').trim();
        console.log('🔍 Nombre del estado filtrado:', nombreEstado);
        
        // Contar casos que tienen el nombre del estado
        const casosConNombreEstado = casos.filter(caso => {
          const estadoCaso = String(caso.codiEstdo || caso.codi_estado || caso.estado || '').trim().toUpperCase();
          return estadoCaso === nombreEstado.toUpperCase() || estadoCaso.includes(nombreEstado.toUpperCase());
        });
        console.log(`📊 Casos con nombre de estado "${nombreEstado}":`, casosConNombreEstado.length);
      }
    }
    
    setCasosFiltrados(resultados);
  };

  // Aplicar filtros automáticamente
  useEffect(() => {
    aplicarFiltros();
  }, [terminoBusqueda, fechaDesde, fechaHasta, campoFechaFiltro, estadoFiltro, responsableFiltro, aseguradoraFiltro, casos, camposVisibles]);

  // Ordenar casos filtrados
  const casosOrdenados = [...casosFiltrados].sort((a, b) => {
    const valorA = a[orden.campo] || '';
    const valorB = b[orden.campo] || '';
    const comparacion = valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
    return orden.asc ? comparacion : -comparacion;
  });

  // Calcular paginación
  const totalPaginas = Math.ceil(casosOrdenados.length / casosPorPagina);
  const indiceInicio = (paginaActual - 1) * casosPorPagina;
  const indiceFin = indiceInicio + casosPorPagina;
  const casosPaginados = casosOrdenados.slice(indiceInicio, indiceFin);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [terminoBusqueda, fechaDesde, fechaHasta, campoFechaFiltro, estadoFiltro, responsableFiltro, aseguradoraFiltro]);

  // Funciones de paginación
  const irAPagina = (pagina) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaActual(pagina);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Listas únicas para los filtros
  const estadosUnicos = estados.map(e => ({
    value: String(e.codiEstdo),
    label: e.descEstdo || String(e.codiEstdo)
  }));

  const aseguradorasUnicas = aseguradoras.map(a => {
    // Usar el primer código disponible, pero guardar ambos para el filtro
    const codigo1 = a.codiAsgrdra ? String(a.codiAsgrdra).trim() : '';
    const codigo2 = a.cod1Asgrdra ? String(a.cod1Asgrdra).trim() : '';
    const codigoPrincipal = codigo1 || codigo2;
    
    return {
      value: codigoPrincipal,
      label: a.rzonSocial || codigoPrincipal,
      codigo1: codigo1,
      codigo2: codigo2
    };
  });

  const responsablesUnicos = responsables.map(r => ({
    value: String(r.codiRespnsble),
    label: r.nmbrRespnsble || r.nombre || String(r.codiRespnsble)
  })).sort((a, b) => a.label.localeCompare(b.label));

  // Funciones auxiliares
  const getNombreEstado = (codigoEstado) => {
    const valorStr = codigoEstado !== undefined && codigoEstado !== null ? String(codigoEstado) : '';
    const estado = estados.find(e => String(e.codiEstdo) === valorStr);
    return estado ? estado.descEstdo : valorStr;
  };

  const getNombreAseguradora = (codigoAseguradora) => {
    const valorStr = codigoAseguradora !== undefined && codigoAseguradora !== null ? String(codigoAseguradora) : '';
    const aseguradora = aseguradoras.find(a => 
      String(a.cod1Asgrdra) === valorStr || 
      String(a.codiAsgrdra) === valorStr
    );
    return aseguradora ? aseguradora.rzonSocial : valorStr;
  };

  const getNombreResponsable = (caso) => {
    if (caso.nombreResponsable && caso.nombreResponsable !== 'Sin asignar' && caso.nombreResponsable.toLowerCase() !== 'sin asignar') {
      return caso.nombreResponsable;
    }
    if (caso.responsable_form && caso.responsable_form !== 'Sin asignar') {
      return caso.responsable_form;
    }
    if (caso.responsable && caso.responsable !== 'Sin asignar') {
      return caso.responsable;
    }
    
    const codigo = caso.codiRespnsble ?? caso.codi_responble ?? caso.responsable;
    if (!codigo || codigo === 'Sin asignar') {
      return 'Sin asignar';
    }
    
    if (responsables.length > 0) {
      const responsable = responsables.find(r =>
        String(r.codiRespnsble) === String(codigo) ||
        String(r.codigo) === String(codigo) ||
        String(r.codiRespnsble) === String(caso.responsable) ||
        r.nmbrRespnsble === String(codigo) ||
        r.nombre === String(codigo) ||
        r.nmbrRespnsble === caso.nombreResponsable ||
        r.nombre === caso.nombreResponsable
      );
      if (responsable) {
        return responsable.nmbrRespnsble || responsable.nombre || String(codigo);
      }
    }
    
    return String(codigo);
  };

  // Usar el mapeo de funcionarios para obtener siempre el nombre
  const getNombreFuncionario = (caso) => {
    return obtenerNombreFuncionarioDesdeCaso(caso);
  };

  const getNombreIntermediario = (caso) => {
    return caso.nombIntermediario || caso.intermediario || '';
  };

  // Función para convertir valores de MongoDB a string seguro
  const convertirValorParaRenderizado = (valor) => {
    if (valor === null || valor === undefined) return '';
    
    if (typeof valor === 'object') {
      if (valor.$numberDecimal !== undefined) return String(valor.$numberDecimal);
      if (valor.$numberInt !== undefined) return String(valor.$numberInt);
      if (valor.$numberLong !== undefined) return String(valor.$numberLong);
      if (valor.$oid !== undefined) return String(valor.$oid);
      if (valor.$date !== undefined) return new Date(valor.$date).toLocaleDateString();
      if (valor !== null) return JSON.stringify(valor);
    }
    
    return String(valor);
  };


  const normalizarClaveCaso = (valor) => String(valor || '').trim().toUpperCase().replace(/\s+/g, '');

  const navegarAjusteDesdeReporte = async (caso) => {
    const numeroSiniestro = caso?.nmroSinstro || '';
    const numeroCaso = caso?.nmroAjste || caso?.numero_ajuste || '';
    const complexId = caso?._id || '';
    const numeroCasoNormalizado = normalizarClaveCaso(numeroCaso);

    const stateRetorno = {
      complexId,
      numeroSiniestro,
      numeroCaso,
      nmroSinstro: numeroSiniestro,
      nmroAjste: numeroCaso,
      origen: 'reporte-complex',
      returnPath: '/complex/excel',
      prefillDesdeCaso: buildPrefillAjusteDesdeCasoComplex(caso)
    };

    try {
      // 1) Priorizar secuencia por número de ajuste para continuidad exacta.
      if (numeroCasoNormalizado) {
        const secuenciaResp = await historialService.obtenerSecuenciaPorNumeroAjuste(numeroCasoNormalizado);
        const idDesdeSecuencia = secuenciaResp?.formularioId || secuenciaResp?.secuencia?.formularioId;
        if (idDesdeSecuencia) {
          navigate(`/ajuste/editar/${idDesdeSecuencia}`, { state: stateRetorno });
          return;
        }
      }

      // 2) Fallback: buscar en historial el último ajuste del mismo número de caso.
      const historialAjustes = await historialService.obtenerHistorial({
        tipo: TIPOS_FORMULARIOS.AJUSTE,
        limite: 1000
      });

      const ajustesMismoCaso = (Array.isArray(historialAjustes) ? historialAjustes : [])
        .filter((f) => {
          const posiblesClaves = [
            f?.numeroCaso,
            f?.datos?.numeroCaso,
            f?.datos?.numeroAjuste,
            f?.datos?.nmroAjste
          ].map(normalizarClaveCaso).filter(Boolean);
          return posiblesClaves.includes(numeroCasoNormalizado);
        })
        .sort((a, b) => {
          const fa = new Date(a?.fechaModificacion || a?.updatedAt || a?.fechaCreacion || 0).getTime();
          const fb = new Date(b?.fechaModificacion || b?.updatedAt || b?.fechaCreacion || 0).getTime();
          return fb - fa;
        });

      if (ajustesMismoCaso.length > 0) {
        const ultimo = ajustesMismoCaso[0];
        const idExistente = ultimo?._id || ultimo?.id;
        if (idExistente) {
          navigate(`/ajuste/editar/${idExistente}`, { state: stateRetorno });
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo validar continuidad de ajuste, se abrirá modo nuevo:', error?.message || error);
    }

    navigate('/ajuste', { state: stateRetorno });
  };

  const handleCrearAjuste = (caso) => navegarAjusteDesdeReporte(caso);

  /** Editar el caso en el formulario Complex (mismo comportamiento que el antiguo botón «Editar»). */
  const handleGestionar = (caso) => {
    const id = caso?._id;
    if (!id) {
      alert('No se encontró el identificador del caso para editarlo.');
      return;
    }
    navigate('/complex/editar', {
      state: {
        initialData: caso,
        returnPath: location.pathname,
        camposFijos: !esAdminOSoporte,
        filtros: {
          fechaDesde,
          fechaHasta,
          campoFechaFiltro,
          estadoFiltro,
          responsableFiltro,
          aseguradoraFiltro,
          terminoBusqueda
        }
      }
    });
  };

  const handleDelete = async (caso) => {
    // Solo permitir eliminar si es admin o soporte
    if (!esAdminOSoporte) {
      alert('No tienes permisos para eliminar casos');
      return;
    }

    const numeroAjuste = caso.nmroAjste || caso.numero_ajuste || caso._id;
    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar el caso ${numeroAjuste}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmacion) {
      return;
    }

    try {
      // Solo eliminar si el caso tiene _id (es un caso Complex)
      if (caso._id) {
        await deleteCasoComplex(caso._id);
        alert('Caso eliminado exitosamente');
        // Recargar los casos
        cargarCasos();
      } else {
        alert('Este caso no se puede eliminar desde aquí. Solo se pueden eliminar casos Complex.');
      }
    } catch (error) {
      console.error('Error al eliminar caso:', error);
      alert(`Error al eliminar el caso: ${error.message}`);
    }
  };

  // Funciones para personalizar columnas
  const abrirPersonalizarColumnas = () => {
    setSeleccionTemporal(camposVisibles.map(c => c.clave));
    // Inicializar orden con las columnas visibles en su orden actual
    const ordenActual = camposVisibles.map(c => c.clave);
    const columnasVisiblesOrdenadas = [...camposVisibles];
    const columnasNoVisibles = todosLosCampos.filter(c => !ordenActual.includes(c.clave));
    setColumnasOrdenadas([...columnasVisiblesOrdenadas, ...columnasNoVisibles]);
    setModalColumnasOpen(true);
  };

  const guardarColumnasPersonalizadas = () => {
    // Ordenar las columnas seleccionadas según el orden en columnasOrdenadas
    const columnasSeleccionadasOrdenadas = columnasOrdenadas.filter(c => seleccionTemporal.includes(c.clave));
    setCamposVisibles(columnasSeleccionadasOrdenadas);
    setModalColumnasOpen(false);
  };

  // Funciones para drag and drop
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumnas = [...columnasOrdenadas];
    const draggedItem = newColumnas[draggedIndex];
    newColumnas.splice(draggedIndex, 1);
    newColumnas.splice(index, 0, draggedItem);
    setColumnasOrdenadas(newColumnas);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleColumna = (clave) => {
    if (seleccionTemporal.includes(clave)) {
      setSeleccionTemporal(seleccionTemporal.filter(c => c !== clave));
    } else {
      setSeleccionTemporal([...seleccionTemporal, clave]);
    }
  };

  // Función helper para convertir código de ciudad a nombre
  const getCiudadNombre = (codigo) => {
    if (!codigo || !ciudades || ciudades.length === 0) return '';
    
    const codigoStr = String(codigo).trim();
    if (!codigoStr) return '';
    
    // Buscar por múltiples campos posibles
    const ciudad = ciudades.find(c => {
      if (!c) return false;
      const codiPobl = c.codiPoblado ? String(c.codiPoblado).trim() : '';
      const codiCpobl = c.codiCpoblado ? String(c.codiCpoblado).trim() : '';
      const codiMuni = c.codiMunicipio ? String(c.codiMunicipio).trim() : '';
      const value = c.value ? String(c.value).trim() : '';
      
      return codiPobl === codigoStr || 
             codiCpobl === codigoStr || 
             codiMuni === codigoStr ||
             value === codigoStr;
    });
    
    if (ciudad) {
      // Retornar el nombre de la ciudad (sin departamento)
      return ciudad.descCpoblado || ciudad.descPoblado || ciudad.descMunicipio || '';
    }
    
    // Si no se encuentra, retornar vacío (no el código)
    return '';
  };

  // Función helper para extraer solo el nombre de la ciudad (sin departamento ni país)
  // Maneja formatos como "CIUDAD, DEPARTAMENTO, PAIS" o "CIUDAD - DEPARTAMENTO"
  // También intenta convertir códigos a nombres si es necesario
  const extraerSoloCiudad = (textoCiudad) => {
    if (!textoCiudad) return '';
    
    // Si no es string, intentar convertir código a nombre
    if (typeof textoCiudad !== 'string') {
      const nombreCiudad = getCiudadNombre(textoCiudad);
      if (nombreCiudad) return nombreCiudad;
      return String(textoCiudad);
    }
    
    // Limpiar espacios
    const texto = textoCiudad.trim();
    if (!texto) return '';
    
    // Si parece ser un código (contiene números y letras en formato específico como "CONDENSAL 000001")
    // o es un código numérico, intentar buscar el nombre
    if (/^\d+$/.test(texto) || /^[A-Z]+\s*\d+$/.test(texto.toUpperCase())) {
      const nombreCiudad = getCiudadNombre(texto);
      if (nombreCiudad) return nombreCiudad;
    }
    
    // Si contiene comas, tomar solo la primera parte (ciudad)
    if (texto.includes(',')) {
      return texto.split(',')[0].trim();
    }
    
    // Si contiene guion, tomar solo la primera parte (ciudad)
    if (texto.includes(' - ')) {
      return texto.split(' - ')[0].trim();
    }
    
    // Si contiene solo un guion (sin espacios), también intentar separar
    if (texto.includes('-') && !texto.includes(' - ')) {
      const partes = texto.split('-');
      // Si la primera parte parece una ciudad (no es muy corta), usarla
      if (partes[0].trim().length > 2) {
        return partes[0].trim();
      }
    }
    
    // Si no tiene separadores, retornar el texto completo
    return texto;
  };

  // Función helper para calcular el número serial de Excel (entero = fecha sin hora)
  // Excel almacena fechas como números seriales donde:
  // - Parte entera = fecha (días desde 1900-01-01)
  // - Parte decimal = hora (fracción del día)
  // Usando solo la parte entera, Excel interpreta que es solo fecha sin hora
  const calcularSerialExcel = (año, mes, dia) => {
    // Excel cuenta desde 1900-01-01 como día 1
    // Pero tiene un bug: considera 1900 como año bisiesto (agrega 1 día desde 1900-03-01)
    
    // Calcular días desde 1900-01-01
    const fecha1900 = new Date(1900, 0, 1);
    const fechaObjetivo = new Date(año, mes - 1, dia);
    const diffMs = fechaObjetivo.getTime() - fecha1900.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Excel serial = días + 1 (porque 1900-01-01 es día 1, no día 0)
    let serial = diffDias + 1;
    
    // Ajuste para el bug del año bisiesto 1900 en Excel
    // Para fechas >= 1900-03-01, Excel agrega 1 día extra
    if (año > 1900 || (año === 1900 && mes >= 3)) {
      serial += 1;
    }
    
    // Retornar como número entero (sin decimales = sin hora)
    return Math.floor(serial);
  };

  // Función helper para extraer componentes de fecha y calcular serial de Excel
  const crearFechaSoloFecha = (fechaInput) => {
    if (!fechaInput || fechaInput === null || fechaInput === undefined || fechaInput === '') {
      return null;
    }
    
    let año, mes, dia;
    
    if (fechaInput instanceof Date) {
      // Si ya es un Date, extraer solo año, mes y día
      año = fechaInput.getFullYear();
      mes = fechaInput.getMonth() + 1; // Mes 1-12
      dia = fechaInput.getDate();
    } else if (typeof fechaInput === 'string') {
      const s = fechaInput.trim();
      if (s === 'null' || s === 'undefined' || s === '') {
        return null;
      }
      
      // Extraer SOLO la parte de fecha (sin hora)
      let soloFecha = s;
      if (s.includes('T')) {
        soloFecha = s.split('T')[0];
      } else if (s.includes(' ')) {
        soloFecha = s.split(' ')[0];
      }
      
      // Formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
        [año, mes, dia] = soloFecha.split('-').map((n) => parseInt(n, 10));
      }
      // Formato DD/MM/YYYY
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(soloFecha)) {
        [dia, mes, año] = soloFecha.split('/').map((n) => parseInt(n, 10));
      }
      // Fallback: parsear y extraer
      else {
        const fechaTemp = new Date(s);
        if (isNaN(fechaTemp.getTime())) {
          return null;
        }
        año = fechaTemp.getFullYear();
        mes = fechaTemp.getMonth() + 1; // Mes 1-12
        dia = fechaTemp.getDate();
      }
    } else {
      return null;
    }
    
    // Validar valores
    if (isNaN(año) || isNaN(mes) || isNaN(dia) || año < 1900 || año > 2100) {
      return null;
    }
    
    // Calcular y retornar el número serial de Excel como entero (sin hora)
    return calcularSerialExcel(año, mes, dia);
  };

  // Exportar a Excel
  const exportarExcel = async () => {
    console.log('🔄 Iniciando exportación Excel...');
    console.log('📊 Filtros activos al exportar:', {
      fechaDesde,
      fechaHasta,
      campoFechaFiltro,
      estadoFiltro,
      responsableFiltro,
      aseguradoraFiltro,
      terminoBusqueda
    });
    console.log('📊 Total casos filtrados en estado:', casosFiltrados.length);
    console.log('📊 Total casos sin filtrar:', casos.length);
    
    // Aplicar filtros nuevamente para asegurar que se exporten los mismos casos que se muestran
    const casosParaExportar = casos.filter(caso => {
      let ok = true;
      
      // Filtro por búsqueda de texto
      if (terminoBusqueda && terminoBusqueda.trim()) {
        const encontrado = camposVisibles.some(campo => {
          const valor = caso[campo.clave];
          if (valor && typeof valor === 'string') {
            return valor.toLowerCase().includes(terminoBusqueda.toLowerCase());
          }
          return false;
        });
        if (!encontrado) ok = false;
      }
      
      // Filtro por fechas - comparar solo fechas sin hora para incluir todos los casos del día
      if (fechaDesde) {
        const f = caso[campoFechaFiltro] ? new Date(caso[campoFechaFiltro]) : null;
        if (f) {
          const fechaCaso = new Date(f.getFullYear(), f.getMonth(), f.getDate());
          const fechaDesdeNormalizada = new Date(fechaDesde);
          fechaDesdeNormalizada.setHours(0, 0, 0, 0);
          if (fechaCaso < fechaDesdeNormalizada) ok = false;
        } else {
          ok = false;
        }
      }
      if (fechaHasta) {
        const f = caso[campoFechaFiltro] ? new Date(caso[campoFechaFiltro]) : null;
        if (f) {
          const fechaCaso = new Date(f.getFullYear(), f.getMonth(), f.getDate());
          const fechaHastaNormalizada = new Date(fechaHasta);
          fechaHastaNormalizada.setHours(23, 59, 59, 999);
          if (fechaCaso > fechaHastaNormalizada) ok = false;
        } else {
          ok = false;
        }
      }
      
      // Filtro por estado
      if (estadoFiltro && estadoFiltro.trim() !== '') {
        const estadoFiltroStr = String(estadoFiltro).trim();
        const estadoCaso = String(
          caso.codiEstdo || 
          caso.codi_estado || 
          caso.codiEstado || 
          caso.codi_estdo || 
          caso.estado || 
          ''
        ).trim();
        const estadoCasoNum = caso.codiEstdo != null ? String(caso.codiEstdo).trim() : '';
        const estadoCasoNum2 = caso.codi_estado != null ? String(caso.codi_estado).trim() : '';
        const estadoCasoNum3 = caso.estado != null ? String(caso.estado).trim() : '';
        
        let coincide = estadoCaso === estadoFiltroStr || 
                      estadoCasoNum === estadoFiltroStr ||
                      estadoCasoNum2 === estadoFiltroStr ||
                      estadoCasoNum3 === estadoFiltroStr;
        
        if (!coincide && estados.length > 0) {
          const estadoEncontrado = estados.find(e => 
            String(e.codiEstdo || e.codiEstado || e.codigo || '').trim() === estadoFiltroStr
          );
          if (estadoEncontrado) {
            const nombreEstadoFiltro = String(estadoEncontrado.descEstdo || estadoEncontrado.descEstado || estadoEncontrado.descripcion || '').trim().toUpperCase();
            const nombreEstadoCaso = estadoCaso.toUpperCase();
            coincide = nombreEstadoCaso === nombreEstadoFiltro ||
                      nombreEstadoCaso.includes(nombreEstadoFiltro) ||
                      nombreEstadoFiltro.includes(nombreEstadoCaso);
          }
        }
        if (!coincide) ok = false;
      }
      
      // Filtro por responsable
      if (responsableFiltro && responsableFiltro.trim() !== '') {
        const filtroStr = String(responsableFiltro).trim();
        let coincide = false;
        const codigoCaso = String(caso.codiRespnsble || caso.codi_responble || caso.responsable || '').trim();
        if (codigoCaso === filtroStr) coincide = true;
        if (!coincide) {
          const nombreCaso = getNombreResponsable(caso);
          if (nombreCaso && nombreCaso.trim() !== '') {
            const nombreCasoStr = nombreCaso.trim();
            if (nombreCasoStr === filtroStr || nombreCasoStr.toLowerCase() === filtroStr.toLowerCase()) {
              coincide = true;
            }
          }
        }
        if (!coincide && responsables.length > 0) {
          const responsableEncontrado = responsables.find(r => 
            String(r.codiRespnsble || r.codigo || '').trim() === filtroStr
          );
          if (responsableEncontrado) {
            const codigoCasoStr = codigoCaso;
            const codigoResponsableStr = String(responsableEncontrado.codiRespnsble || responsableEncontrado.codigo || '').trim();
            const nombreCaso = getNombreResponsable(caso);
            const nombreResponsableStr = String(responsableEncontrado.nmbrRespnsble || responsableEncontrado.nombre || '').trim();
            if (codigoCasoStr === codigoResponsableStr || 
                (nombreCaso && nombreCaso.trim() === nombreResponsableStr)) {
              coincide = true;
            }
          }
        }
        if (!coincide) ok = false;
      }
      
      // Filtro por aseguradora - buscar en todos los campos posibles
      if (aseguradoraFiltro && aseguradoraFiltro.trim() !== '') {
        const aseguradoraFiltroStr = String(aseguradoraFiltro).trim();
        let coincide = false;
        
        // Buscar en todos los campos posibles de aseguradora
        const codigosAseguradora = [
          caso.codiAsgrdra,
          caso.cod1Asgrdra,
          caso.aseguradora,
          caso.codi_asgrdra,
          caso.cod1_asgrdra
        ].filter(c => c !== null && c !== undefined && c !== '');
        
        // Comparar códigos directamente
        for (const codigo of codigosAseguradora) {
          if (String(codigo).trim() === aseguradoraFiltroStr) {
            coincide = true;
            break;
          }
        }
        
        // Si no coincide por código, buscar por nombre en la lista de aseguradoras
        if (!coincide && aseguradoras.length > 0) {
          const aseguradoraEncontrada = aseguradoras.find(a => 
            String(a.codiAsgrdra || a.cod1Asgrdra || '').trim() === aseguradoraFiltroStr
          );
          
          if (aseguradoraEncontrada) {
            const codigoAseguradoraEncontrada = String(aseguradoraEncontrada.codiAsgrdra || aseguradoraEncontrada.cod1Asgrdra || '').trim();
            for (const codigo of codigosAseguradora) {
              if (String(codigo).trim() === codigoAseguradoraEncontrada) {
                coincide = true;
                break;
              }
            }
          }
        }
        
        if (!coincide) ok = false;
      }
      
      return ok;
    });
    
    console.log('📊 Total casos después de aplicar filtros al exportar:', casosParaExportar.length);
    
    // ANÁLISIS DE COLUMNAS: Clasificar cada columna según su tipo
    const clasificacionColumnas = {};
    camposVisibles.forEach(({ clave, label }) => {
      // Identificar columnas de FECHA
      if (clave.includes('fcha') || clave === 'createdAt' || clave === 'updatedAt') {
        clasificacionColumnas[label] = 'fecha';
      }
      // Identificar columnas de MONEDA (valores monetarios)
      else if ([
        'vlor_resrva', 'vlor_reclmo', 'monto_indmzar', 'vlorServcios', 'vlorGastos',
        'total', 'totalGeneral', 'totalPagado', 'iva', 'reteiva', 'retefuente', 'reteica',
        'honorarios', 'honorariosDefinitivos'
      ].includes(clave) || clave.toLowerCase().includes('vlor') || clave.toLowerCase().includes('valor') || clave.toLowerCase().includes('rete')) {
        clasificacionColumnas[label] = 'moneda';
      }
      // Identificar columnas NUMÉRICAS (porcentajes, días - NO moneda)
      else if ([
        'porcIva', 'porcReteiva', 'porcRetefuente', 'porcReteica', 'dias_transcrrdo'
      ].includes(clave)) {
        clasificacionColumnas[label] = 'numero';
      }
      // Todas las demás son TEXTO
      else {
        clasificacionColumnas[label] = 'texto';
      }
    });
    
    console.log('📊 Clasificación de columnas:', clasificacionColumnas);
    
    // Usar ExcelJS para mejor soporte de formatos
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CasosComplex');
    
    // Crear encabezados
    const headers = camposVisibles.map(({ label }) => label);
    worksheet.addRow(headers);
    
    // Estilizar encabezados
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font = { ...headerRow.font, color: { argb: 'FFFFFFFF' } };
    
    // Agregar datos con formatos correctos
    casosParaExportar.forEach((caso) => {
      const row = [];
      camposVisibles.forEach(({ clave, label }) => {
        const tipoColumna = clasificacionColumnas[label];
        let valor = '';
        
        // Obtener el valor según el tipo de campo
        if (clave === 'codiAsgrdra') {
          valor = getNombreAseguradora(caso.codiAsgrdra);
        } else if (clave === 'ciudadSiniestro') {
          // Extraer solo la ciudad (sin departamento ni país)
          const ciudadCompleta = caso.descripcionCiudad || caso.nombreCiudad || convertirValorParaRenderizado(caso[clave]);
          valor = extraerSoloCiudad(ciudadCompleta);
        } else if (clave === 'codiEstdo') {
          valor = getNombreEstado(caso.codiEstdo) || '';
        } else if (clave === 'codiRespnsble') {
          valor = getNombreResponsable(caso);
        } else if (clave === 'nombIntermediario') {
          valor = getNombreIntermediario(caso);
        } else if (clave === 'funcAsgrdra') {
          valor = getNombreFuncionario(caso);
        } else if (tipoColumna === 'fecha') {
          // Para fechas, usar función helper que retorna número serial de Excel (entero = sin hora)
          valor = crearFechaSoloFecha(caso[clave]);
        } else if (tipoColumna === 'moneda') {
          // Para valores monetarios, convertir a número
          const valorOriginal = caso[clave];
          if (valorOriginal !== null && valorOriginal !== undefined && valorOriginal !== '') {
            // Convertir a número, manejando strings con formato de moneda
            let numero = 0;
            if (typeof valorOriginal === 'number') {
              numero = valorOriginal;
            } else if (typeof valorOriginal === 'string') {
              // Remover símbolos de moneda, espacios y separadores de miles
              const limpio = valorOriginal.replace(/[$,\s]/g, '').trim();
              numero = parseFloat(limpio) || 0;
            } else {
              numero = parseFloat(valorOriginal) || 0;
            }
            valor = isNaN(numero) ? '' : numero;
          } else {
            valor = '';
          }
        } else if (tipoColumna === 'numero') {
          // Para números (porcentajes, días), convertir a número
          const valorOriginal = caso[clave];
          if (valorOriginal !== null && valorOriginal !== undefined && valorOriginal !== '') {
            const numValue = parseFloat(valorOriginal);
            valor = !isNaN(numValue) ? numValue : '';
          } else {
            valor = '';
          }
        } else if (clave === 'liquidacionPerdida' || clave === 'indemnizacion' || clave === 'salvamentos' || clave === 'panoramaRiesgos') {
          const campoValor = caso[clave];
          if (typeof campoValor === 'object' && campoValor !== null) {
            valor = Object.values(campoValor).filter(v => v).join(', ') || '';
          } else {
            valor = campoValor || '';
          }
        } else {
          // Texto por defecto
          valor = convertirValorParaRenderizado(caso[clave]);
        }
        
        row.push(valor);
      });
      
      const excelRow = worksheet.addRow(row);
      
      // Aplicar formatos a cada celda según su tipo
      camposVisibles.forEach(({ label }, colIndex) => {
        const tipoColumna = clasificacionColumnas[label];
        const cell = excelRow.getCell(colIndex + 1);
        
        if (tipoColumna === 'fecha') {
          // Obtener el valor de la celda (debería ser un número serial de Excel ya calculado)
          let valorCelda = cell.value;
          
          // Si el valor es un número (serial de Excel), usarlo directamente
          // Si es un Date u otro tipo, calcular el serial
          let serialFecha = null;
          
          if (typeof valorCelda === 'number' && !isNaN(valorCelda) && valorCelda > 0) {
            // Ya es un número serial, usar solo la parte entera (sin decimales = sin hora)
            serialFecha = Math.floor(valorCelda);
          } else if (valorCelda instanceof Date && !isNaN(valorCelda.getTime())) {
            // Si es un Date, calcular el serial
            serialFecha = crearFechaSoloFecha(valorCelda);
          } else if (valorCelda !== null && valorCelda !== undefined && valorCelda !== '') {
            // Intentar calcular el serial desde el valor original
            serialFecha = crearFechaSoloFecha(valorCelda);
          }
          
          if (serialFecha !== null && !isNaN(serialFecha) && serialFecha > 0) {
            // Asignar el número serial como entero (sin decimales = sin hora en Excel)
            cell.value = serialFecha;
            
            // Aplicar formato de Excel que SOLO muestra fecha (dd/mm/yyyy)
            // sin componente de hora. El formato 'dd/mm/yyyy' asegura que Excel
            // solo muestre la fecha y no la hora
            cell.numFmt = 'dd/mm/yyyy';
          } else {
            // Si no hay fecha válida, dejar la celda vacía pero con formato de fecha
            cell.value = null;
            cell.numFmt = 'dd/mm/yyyy';
          }
        } else if (tipoColumna === 'moneda') {
          // Formato de moneda colombiana (COP)
          if (typeof cell.value === 'number' && !isNaN(cell.value)) {
            // Ya es número, aplicar formato de moneda
            cell.numFmt = '"$"#,##0'; // Formato: $ con separador de miles, sin decimales
          } else if (cell.value && typeof cell.value === 'string') {
            const numValue = parseFloat(cell.value);
            if (!isNaN(numValue)) {
              cell.value = numValue;
              cell.numFmt = '"$"#,##0';
            } else {
              // Si no es un número válido, dejar vacío pero con formato de moneda
              cell.value = null;
              cell.numFmt = '"$"#,##0';
            }
          } else {
            // Si está vacío, mantener formato de moneda
            cell.value = null;
            cell.numFmt = '"$"#,##0';
          }
        } else if (tipoColumna === 'numero') {
          // Formato numérico (General) para porcentajes y días
          if (typeof cell.value === 'number') {
            // Ya es número, mantenerlo
          } else if (cell.value && typeof cell.value === 'string') {
            const numValue = parseFloat(cell.value);
            if (!isNaN(numValue)) {
              cell.value = numValue;
            }
          }
        } else {
          // Formato de texto
          cell.numFmt = '@';
          if (cell.value !== null && cell.value !== undefined) {
            cell.value = String(cell.value);
          }
        }
      });
    });
    
    // Ajustar ancho de columnas
    camposVisibles.forEach((_, colIndex) => {
      worksheet.getColumn(colIndex + 1).width = 20;
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const nombreArchivo = `reporte_casos_mejorado_${timestamp}.xlsx`;
    
    console.log('💾 Guardando archivo:', nombreArchivo);
    console.log(`✅ Exportación completada: ${casosParaExportar.length} casos exportados`);
    
    // Escribir el archivo usando ExcelJS
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={complexReportRoot}>
        <div className={complexPageWrapWide}>
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
            <p className="font-body text-sm text-gray-600 dark:text-gray-300">Cargando casos…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={complexReportRoot}>
      <div className={`${complexScope} ${complexPageWrapWide}`}>
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <FaTable className="text-fenix-primario" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Reporte completo
            </h1>
          </div>
          <p className="font-body text-sm text-gray-600 dark:text-gray-400">
            Vista general de casos Complex en el sistema.
          </p>
          <p className="font-body text-xs text-gray-500 dark:text-gray-400">
            {casosFiltrados.length} caso(s) · {camposVisibles.length} columnas visibles
          </p>
        </header>

      {/* Filtros Avanzados */}
        <section className={complexCard}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">Filtros</h2>
              <p className="font-body text-sm text-gray-500 dark:text-gray-400">
                Filtra por fechas, estado, responsable, aseguradora y texto.
              </p>
            </div>
            <button
              type="button"
              className={complexBtnGhost}
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
                setCampoFechaFiltro('fchaAsgncion');
                setEstadoFiltro('');
                setResponsableFiltro('');
                setAseguradoraFiltro('');
                setTerminoBusqueda('');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        
        {/* Selector de campo de fecha */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={complexLabel}>Campo de fecha</label>
              <select value={campoFechaFiltro} onChange={(e) => setCampoFechaFiltro(e.target.value)} className={complexSelect}>
                {camposFechaDisponibles.map((campo) => (
                  <option key={campo.clave} value={campo.clave}>
                    {campo.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={complexLabel}>Fecha desde</label>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className={complexInput} />
            </div>
            <div>
              <label className={complexLabel}>Fecha hasta</label>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className={complexInput} />
            </div>
            <div>
              <label className={complexLabel}>Estado</label>
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className={complexSelect}>
                <option value="">Todos</option>
                {estadosUnicos.map((e, index) => (
                  <option key={`estado-${e.value}-${index}`} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={complexLabel}>Aseguradora</label>
              <select value={aseguradoraFiltro} onChange={(e) => setAseguradoraFiltro(e.target.value)} className={complexSelect}>
                <option value="">Todas</option>
                {aseguradorasUnicas.map((a, index) => (
                  <option key={`aseguradora-${a.value}-${index}`} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={complexLabel}>Responsable</label>
              <select value={responsableFiltro} onChange={(e) => setResponsableFiltro(e.target.value)} className={complexSelect}>
                <option value="">Todos</option>
                {responsablesUnicos.map((r, index) => (
                  <option key={`responsable-${r.value}-${index}`} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-3">
              <label className={complexLabel}>Buscar</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  placeholder="Número de ajuste, siniestro, asegurado, ciudad…"
                  className={`${complexInput} min-w-0 flex-1`}
                />
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <button type="button" className={complexBtnSecondary} onClick={abrirPersonalizarColumnas}>
                    <FaSlidersH />
                    Columnas
                  </button>
                  <button type="button" className={complexBtnSecondary} onClick={exportarExcel}>
                    <FaFileExcel />
                    Exportar Excel
                  </button>
                  <button
                    type="button"
                    className={complexBtnGhost}
                    onClick={() => {
                      setCamposVisibles(todosLosCampos);
                      setModalColumnasOpen(false);
                    }}
                  >
                    Mostrar todas
                  </button>
                </div>
              </div>
            </div>
          </div>

          {(fechaDesde || fechaHasta || estadoFiltro || responsableFiltro || aseguradoraFiltro || terminoBusqueda) && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/30">
              <p className="font-body text-xs font-semibold text-gray-700 dark:text-gray-200">Filtros activos</p>
              <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
                Mostrando {casosFiltrados.length} de {casos.length} casos.
              </p>
            </div>
          )}
        </section>

      {modalColumnasOpen && (
        <div className={complexModalOverlay} role="presentation" onClick={() => setModalColumnasOpen(false)}>
          <div className={complexModalShell} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">Personalizar columnas</h2>
              <button type="button" className={complexBtnGhost} onClick={() => setModalColumnasOpen(false)}>
                Cerrar
              </button>
            </div>
            <div className="p-5">
              <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
                Arrastra para ordenar. Marca o desmarca para mostrar u ocultar columnas.
              </p>
              <div className="mb-4 max-h-72 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                {columnasOrdenadas.map((campo, index) => (
                  <div
                    key={campo.clave}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`mb-1 flex cursor-move items-center gap-2 rounded-lg p-2 transition ${
                      draggedIndex === index
                        ? 'bg-red-50/80 opacity-60 dark:bg-red-950/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                    }`}
                  >
                    <span className="text-gray-400">☰</span>
                    <label className="flex flex-1 cursor-pointer items-center gap-2 font-body text-sm text-gray-700 dark:text-gray-200">
                      <input
                        type="checkbox"
                        className="accent-fenix-primario"
                        checked={seleccionTemporal.includes(campo.clave)}
                        onChange={() => toggleColumna(campo.clave)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {campo.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                <button type="button" className={complexBtnSecondary} onClick={() => setModalColumnasOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className={complexBtnPrimary} onClick={guardarColumnasPersonalizadas}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        <div className={complexTableWrap}>
          <div className="overflow-x-auto">
            <table className={`${complexTableGrid} divide-y divide-gray-200 dark:divide-gray-800`}>
              <thead className={complexTableHead}>
                <tr>
                  <th
                    scope="col"
                    className={`${complexTableThDivider} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50`}
                  >
                    Acciones
                  </th>
                  {camposVisibles.map(({ clave, label }) => (
                    <th
                      key={clave}
                      scope="col"
                      onClick={() => cambiarOrden(clave)}
                      className={`${complexTableThDivider} cursor-pointer whitespace-nowrap transition hover:text-fenix-primario`}
                    >
                      {label} {orden.campo === clave ? (orden.asc ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {casosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={camposVisibles.length + 1} className="px-4 py-8 text-center font-body text-sm text-gray-500">
                      No hay registros para mostrar.
                    </td>
                  </tr>
                ) : (
                  casosPaginados.map((caso, index) => (
                    <tr
                      key={caso._id || index}
                      className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                    >
                      <td
                        className={`${complexTableTdDivider} sticky left-0 z-10 whitespace-nowrap bg-white dark:bg-[#1A1A1A]`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            className={complexTableBtnAjuste}
                            onClick={() => handleCrearAjuste(caso)}
                            title="Crear ajuste con autollenado"
                          >
                            Ajuste
                          </button>
                          <button
                            type="button"
                            className={complexTableBtnGestionar}
                            onClick={() => handleGestionar(caso)}
                            title="Gestionar caso"
                          >
                            Gestionar
                          </button>
                          {esAdminOSoporte && (
                            <button
                              type="button"
                              className={complexTableBtnEliminar}
                              onClick={() => handleDelete(caso)}
                              title="Eliminar caso"
                            >
                              <FaTrash className="text-xs" />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                  {camposVisibles.map(({ clave }) => (
                        <td
                          key={clave}
                          className={`${complexTableTdDivider} whitespace-nowrap font-body text-sm text-gray-800 dark:text-gray-200`}
                        >
                      {(() => {
                        if (clave === 'codiAsgrdra') {
                          return getNombreAseguradora(caso.codiAsgrdra);
                        }
                        if (clave === 'codiEstdo') {
                          return getNombreEstado(caso.codiEstdo);
                        }
                        if (clave === 'codiRespnsble') {
                          return getNombreResponsable(caso);
                        }
                        if (clave === 'nombIntermediario') {
                          return getNombreIntermediario(caso);
                        }
                        if (clave === 'funcAsgrdra') {
                          return getNombreFuncionario(caso);
                        }
                        if (clave.includes('fcha') || clave === 'createdAt' || clave === 'updatedAt') {
                          return formatearFechaUI(caso[clave]) || '';
                        }
                        if (clave === 'liquidacionPerdida' || clave === 'indemnizacion' || clave === 'salvamentos' || clave === 'panoramaRiesgos') {
                          const valor = caso[clave];
                          if (typeof valor === 'object' && valor !== null) {
                            return Object.values(valor).filter(v => v).join(', ') || '';
                          }
                          return valor || '';
                        }
                        // Priorizar descripciones cuando estén disponibles
                        if (clave === 'ciudadSiniestro') {
                          // Extraer solo la ciudad (sin departamento ni país)
                          const ciudadCompleta = caso.descripcionCiudad || caso.nombreCiudad || convertirValorParaRenderizado(caso[clave]);
                          return extraerSoloCiudad(ciudadCompleta);
                        } else if (clave === 'codiEstdo') {
                          return getNombreEstado(caso[clave]);
                        } else if (clave === 'funcAsgrdra') {
                          return getNombreFuncionario(caso);
                        }
                        return convertirValorParaRenderizado(caso[clave]);
                      })()}
                    </td>
                  ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Controles de paginación */}
      {casosOrdenados.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#1A1A1A] sm:flex-row">
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">
            Mostrando <strong className="text-gray-800 dark:text-gray-100">{indiceInicio + 1}</strong> a{' '}
            <strong className="text-gray-800 dark:text-gray-100">{Math.min(indiceFin, casosOrdenados.length)}</strong>{' '}
            de <strong className="text-gray-800 dark:text-gray-100">{casosOrdenados.length}</strong>
            {totalPaginas > 1 && (
              <span>
                {' '}
                · Página <strong className="text-gray-800 dark:text-gray-100">{paginaActual}</strong> de{' '}
                <strong className="text-gray-800 dark:text-gray-100">{totalPaginas}</strong>
              </span>
            )}
          </p>
          {totalPaginas > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={complexBtnSecondary}
                disabled={paginaActual <= 1}
                onClick={() => irAPagina(paginaActual - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className={complexBtnSecondary}
                disabled={paginaActual >= totalPaginas}
                onClick={() => irAPagina(paginaActual + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
