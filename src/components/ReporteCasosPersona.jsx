import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex, deleteCasoComplex } from '../services/complexService';
import historialService, { TIPOS_FORMULARIOS } from '../services/historialService.js';
import { FaTrash } from 'react-icons/fa';
import { obtenerResponsables, obtenerAseguradoras } from '../services/riesgoService';
import { getEstados } from '../services/estadosService';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { convertirFechaParaExcelDate, formatearFechaUI } from '../utils/fechaUtils';
import { cargarMapeoFuncionarios, obtenerNombreFuncionarioDesdeCaso } from '../utils/funcionarioMapper';
import { buildPrefillAjusteDesdeCasoComplex } from '../utils/prefillAjusteDesdeCasoComplex';
import {
  complexTableBtnAjuste,
  complexTableBtnEliminar,
  complexTableBtnGestionar,
  complexTableGrid,
  complexTableTdDivider,
  complexTableThDivider,
} from './SubcomponenteCompex/complexFenixUi.js';
import { useTheme } from '../context/ThemeContext';

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

  if (!resultado.origen && resultado.nmroAjste) {
    resultado.origen = 'complex';
  }

  return resultado;
};

export default function ReporteCasosPersona() {
  const navigate = useNavigate();
  const location = useLocation();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [estados, setEstados] = useState([]);
  const [camposVisibles, setCamposVisibles] = useState(
    todosLosCampos.filter(c => columnasIniciales.includes(c.clave))
  );
  const [modalColumnasOpen, setModalColumnasOpen] = useState(false);
  const [seleccionTemporal, setSeleccionTemporal] = useState(camposVisibles.map(c => c.clave));
  const [columnasOrdenadas, setColumnasOrdenadas] = useState(camposVisibles);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [orden, setOrden] = useState({ campo: 'fchaAsgncion', asc: false });
  
  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [campoFechaFiltro, setCampoFechaFiltro] = useState('fchaAsgncion');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [aseguradoraFiltro, setAseguradoraFiltro] = useState('');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [casosFiltrados, setCasosFiltrados] = useState([]);
  const [casosPorUsuario, setCasosPorUsuario] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const casosPorPagina = 10;
  const filtrosAplicadosRef = useRef(false);

  // Obtener información del usuario actual
  const usuarioActual = {
    login: localStorage.getItem('login'),
    nombre: localStorage.getItem('nombre'),
    rol: localStorage.getItem('rol'),
    tipoUsuario: localStorage.getItem('tipoUsuario')
  };

  const rolUsuario = localStorage.getItem('rol') || '';
  const esAdminOSoporte = rolUsuario === 'admin' || rolUsuario === 'soporte';

  // Restaurar filtros al volver desde el formulario (mismo criterio que reporte completo)
  useEffect(() => {
    const filtrosDesdeNavegacion = location.state?.filtros;
    if (filtrosDesdeNavegacion && !filtrosAplicadosRef.current) {
      setFechaDesde(filtrosDesdeNavegacion.fechaDesde || '');
      setFechaHasta(filtrosDesdeNavegacion.fechaHasta || '');
      setCampoFechaFiltro(filtrosDesdeNavegacion.campoFechaFiltro || 'fchaAsgncion');
      setEstadoFiltro(filtrosDesdeNavegacion.estadoFiltro || '');
      setAseguradoraFiltro(filtrosDesdeNavegacion.aseguradoraFiltro || '');
      setTerminoBusqueda(filtrosDesdeNavegacion.terminoBusqueda || '');
      filtrosAplicadosRef.current = true;
      setTimeout(() => {
        navigate(location.pathname, { replace: true, state: {} });
        filtrosAplicadosRef.current = false;
      }, 100);
    } else if (!location.state?.filtros) {
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
  }, []);

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

      let casosFinales = Array.from(casosUnicos.values());
      
      // Enriquecer casos con nombres de funcionarios usando el mapeo
      // Esto asegura que siempre tengamos el nombre del funcionario, no solo el código
      casosFinales = casosFinales.map(caso => {
        const casoEnriquecido = { ...caso };
        
        // Obtener el nombre del funcionario usando el mapeo
        const nombreFuncionario = obtenerNombreFuncionarioDesdeCaso(caso);
        
        // Si encontramos un nombre válido, actualizar los campos del caso
        if (nombreFuncionario && 
            nombreFuncionario !== 'Sin asignar' && 
            nombreFuncionario.toLowerCase() !== 'sin asignar' &&
            !/^\d+$/.test(String(nombreFuncionario).trim())) {
          casoEnriquecido.funcAsgrdraNombre = nombreFuncionario;
          casoEnriquecido.funcionarioAseguradora = nombreFuncionario;
          
          // Si el código es numérico pero ahora tenemos nombre, mantener ambos
          if (casoEnriquecido.funcAsgrdra && /^\d+$/.test(String(casoEnriquecido.funcAsgrdra).trim())) {
            // Mantener el código pero asegurar que el nombre esté presente
            if (!casoEnriquecido.funcAsgrdraNombre) {
              casoEnriquecido.funcAsgrdraNombre = nombreFuncionario;
            }
          }
        }
        
        return casoEnriquecido;
      });
      
      // Ordenar por fecha de asignación (más recientes primero)
      casosFinales.sort((a, b) => {
        const fechaA = new Date(a.fchaAsgncion || a.fecha_asignacion_form || 0);
        const fechaB = new Date(b.fchaAsgncion || b.fecha_asignacion_form || 0);
        return fechaB - fechaA;
      });
      
      console.log(`📊 Casos cargados (ReporteCasosPersona): ${casosFinales.length} casos totales`);
      console.log(`📊 Siniestros: ${siniestros.length}, Complex: ${complex.length}`);
      
      // Contar casos por estado para debugging
      const casosPorEstado = {};
      casosFinales.forEach(caso => {
        const estado = String(caso.codiEstdo || caso.codi_estado || caso.estado || 'Sin estado').trim();
        casosPorEstado[estado] = (casosPorEstado[estado] || 0) + 1;
      });
      console.log('📊 Casos por estado (ReporteCasosPersona):', casosPorEstado);
      
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

  // Filtrar casos por usuario actual - SIMPLE: el login (cédula/ID) del usuario = codiRespnsble del caso
  useEffect(() => {
    if (casos.length === 0) {
      setCasosPorUsuario([]);
      setCasosFiltrados([]);
      return;
    }

    const loginActual = String(usuarioActual.login || '').trim();
    const nombreActual = String(usuarioActual.nombre || '').trim();
    
    console.log('🔍 [ReporteCasosPersona] Filtrando casos por CÉDULA/NOMBRE:', {
      login: loginActual,
      nombre: nombreActual,
      totalCasos: casos.length
    });
    
    if (!loginActual && !nombreActual) {
      console.warn('⚠️ [ReporteCasosPersona] No hay login (cédula) ni nombre del usuario');
      setCasosPorUsuario([]);
      setCasosFiltrados([]);
      return;
    }
    
    // FILTRAR: el codiRespnsble del caso debe coincidir con el login (cédula) O el nombre del usuario
    const casosFiltradosPorUsuario = casos.filter(caso => {
      // Asegurar que los campos estén sincronizados
      const casoSincronizado = sincronizarCamelSnake(caso);
      
      // Buscar el código del responsable en todos los campos posibles
      const codigo1 = String(casoSincronizado.codiRespnsble || '').trim();
      const codigo2 = String(casoSincronizado.codi_responble || '').trim();
      const codigo3 = String(casoSincronizado.responsable || '').trim();
      const nombreResp = String(casoSincronizado.nombreResponsable || '').trim();
      
      // Comparar con el login (cédula) del usuario
      const coincidePorCedula = loginActual && (
        codigo1 === loginActual || 
        codigo2 === loginActual || 
        codigo3 === loginActual ||
        nombreResp === loginActual
      );
      
      // Comparar con el nombre del usuario (case-insensitive)
      const coincidePorNombre = nombreActual && (
        codigo1.toLowerCase() === nombreActual.toLowerCase() ||
        codigo2.toLowerCase() === nombreActual.toLowerCase() ||
        codigo3.toLowerCase() === nombreActual.toLowerCase() ||
        nombreResp.toLowerCase() === nombreActual.toLowerCase()
      );
      
      const coincide = coincidePorCedula || coincidePorNombre;
      
      if (coincide) {
        console.log('✅ Caso encontrado:', {
          nmroAjste: caso.nmroAjste,
          codiRespnsble: codigo1,
          codi_responble: codigo2,
          responsable: codigo3,
          nombreResponsable: nombreResp,
          loginUsuario: loginActual,
          nombreUsuario: nombreActual,
          coincidePorCedula,
          coincidePorNombre
        });
      }
      
      return coincide;
    });
    
    console.log(`📊 [ReporteCasosPersona] Total casos encontrados: ${casosFiltradosPorUsuario.length} de ${casos.length}`);
    
    if (casosFiltradosPorUsuario.length === 0 && casos.length > 0) {
      // Debug: mostrar los primeros casos para ver qué códigos tienen
      console.log('🔍 [ReporteCasosPersona] Primeros 10 casos para debug (buscando cédula:', loginActual, '):', casos.slice(0, 10).map(c => {
        const cSync = sincronizarCamelSnake(c);
        return {
          nmroAjste: c.nmroAjste,
          codiRespnsble: cSync.codiRespnsble,
          codi_responble: cSync.codi_responble,
          responsable: cSync.responsable,
          nombreResponsable: cSync.nombreResponsable,
          tipoCodiRespnsble: typeof cSync.codiRespnsble,
          tipoCodi_responble: typeof cSync.codi_responble
        };
      }));
    }
    
    const casosOrdenados = casosFiltradosPorUsuario.sort((a, b) => {
      const fechaA = new Date(a.fchaAsgncion || a.fecha_asignacion_form || 0);
      const fechaB = new Date(b.fchaAsgncion || b.fecha_asignacion_form || 0);
      return fechaB - fechaA;
    });
    
    setCasosPorUsuario(casosOrdenados);
  }, [casos, usuarioActual.login]);

  // Aplicar filtros adicionales automáticamente cuando cambian los filtros o casosPorUsuario
  useEffect(() => {
    if (casosPorUsuario.length === 0) {
      setCasosFiltrados([]);
      return;
    }
    
    const resultados = casosPorUsuario.filter(caso => {
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
      
      // Filtro por fechas
      if (fechaDesde) {
        const f = caso[campoFechaFiltro] ? new Date(caso[campoFechaFiltro]) : null;
        if (!f || f < new Date(fechaDesde)) ok = false;
      }
      if (fechaHasta) {
        const f = caso[campoFechaFiltro] ? new Date(caso[campoFechaFiltro]) : null;
        if (!f || f > new Date(fechaHasta)) ok = false;
      }
      
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
        }
      }
      
      // Filtro por aseguradora
      if (aseguradoraFiltro && aseguradoraFiltro.trim() !== '') {
        const aseguradoraCaso = String(caso.codiAsgrdra || caso.cod1Asgrdra || '').trim();
        const aseguradoraFiltroStr = String(aseguradoraFiltro).trim();
        if (aseguradoraCaso !== aseguradoraFiltroStr) {
          ok = false;
        }
      }
      
      return ok;
    });
    
    console.log(`✅ Filtros aplicados (ReporteCasosPersona): ${resultados.length} casos de ${casosPorUsuario.length} totales del usuario`);
    
    // Debug: contar casos por estado después del filtro
    if (estadoFiltro && estadoFiltro.trim() !== '') {
      const casosPorEstadoFiltrado = {};
      resultados.forEach(caso => {
        const estado = String(caso.codiEstdo || caso.codi_estado || caso.estado || 'Sin estado').trim();
        casosPorEstadoFiltrado[estado] = (casosPorEstadoFiltrado[estado] || 0) + 1;
      });
      console.log('📊 Casos por estado después del filtro (ReporteCasosPersona):', casosPorEstadoFiltrado);
      console.log('🔍 Estado filtrado (código):', estadoFiltro);
      
      // Buscar el nombre del estado correspondiente al código
      const estadoEncontrado = estados.find(e => 
        String(e.codiEstdo || e.codiEstado || e.codigo || '').trim() === String(estadoFiltro).trim()
      );
      if (estadoEncontrado) {
        const nombreEstado = String(estadoEncontrado.descEstdo || estadoEncontrado.descEstado || estadoEncontrado.descripcion || '').trim();
        console.log('🔍 Nombre del estado filtrado:', nombreEstado);
        
        // Contar casos que tienen el nombre del estado
        const casosConNombreEstado = casosPorUsuario.filter(caso => {
          const estadoCaso = String(caso.codiEstdo || caso.codi_estado || caso.estado || '').trim().toUpperCase();
          return estadoCaso === nombreEstado.toUpperCase() || estadoCaso.includes(nombreEstado.toUpperCase());
        });
        console.log(`📊 Casos del usuario con nombre de estado "${nombreEstado}":`, casosConNombreEstado.length);
      }
    }
    
    setCasosFiltrados(resultados);
  }, [terminoBusqueda, fechaDesde, fechaHasta, campoFechaFiltro, estadoFiltro, aseguradoraFiltro, casosPorUsuario, camposVisibles]);

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
  }, [terminoBusqueda, fechaDesde, fechaHasta, campoFechaFiltro, estadoFiltro, aseguradoraFiltro]);

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

  const aseguradorasUnicas = aseguradoras.map(a => ({
    value: String(a.codiAsgrdra || a.cod1Asgrdra),
    label: a.rzonSocial || String(a.codiAsgrdra || a.cod1Asgrdra)
  }));

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
      return usuarioActual.nombre || 'Sin asignar';
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
  // Esta función intenta múltiples estrategias para obtener el nombre del funcionario
  const getNombreFuncionario = (caso) => {
    try {
      // Primero intentar con la función del mapeo
      const nombreDelMapeo = obtenerNombreFuncionarioDesdeCaso(caso);
      
      // Si el mapeo devolvió un código numérico, significa que no encontró el nombre
      // En ese caso, intentar usar los campos del caso directamente
      if (nombreDelMapeo && /^\d+$/.test(String(nombreDelMapeo).trim())) {
        // Buscar en los campos del caso
        const nombreDirecto = caso.funcAsgrdraNombre || 
                             caso.funcionarioAseguradora || 
                             caso.nombreFuncionario ||
                             '';
        
        if (nombreDirecto && 
            nombreDirecto !== 'Sin asignar' && 
            nombreDirecto.toLowerCase() !== 'sin asignar' &&
            !/^\d+$/.test(String(nombreDirecto).trim())) {
          return nombreDirecto;
        }
      }
      
      return nombreDelMapeo || 'Sin asignar';
    } catch (error) {
      console.error('❌ Error obteniendo nombre de funcionario:', error);
      // Fallback: intentar obtener desde los campos del caso
      return caso.funcAsgrdraNombre || 
             caso.funcionarioAseguradora || 
             caso.funcAsgrdra || 
             'Sin asignar';
    }
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
      returnPath: '/complex/mis-casos',
      prefillDesdeCaso: buildPrefillAjusteDesdeCasoComplex(caso)
    };

    try {
      if (numeroCasoNormalizado) {
        const secuenciaResp = await historialService.obtenerSecuenciaPorNumeroAjuste(numeroCasoNormalizado);
        const idDesdeSecuencia = secuenciaResp?.formularioId || secuenciaResp?.secuencia?.formularioId;
        if (idDesdeSecuencia) {
          navigate(`/ajuste/editar/${idDesdeSecuencia}`, { state: stateRetorno });
          return;
        }
      }

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
          aseguradoraFiltro,
          terminoBusqueda
        }
      }
    });
  };

  const handleDelete = async (caso) => {
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
      if (caso._id) {
        await deleteCasoComplex(caso._id);
        alert('Caso eliminado exitosamente');
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

  // Función helper para crear fechas EXACTAS a medianoche (sin hora)
  const crearFechaSoloFecha = (fechaInput) => {
    if (!fechaInput || fechaInput === null || fechaInput === undefined || fechaInput === '') {
      return null;
    }
    
    let año, mes, dia;
    
    if (fechaInput instanceof Date) {
      año = fechaInput.getFullYear();
      mes = fechaInput.getMonth();
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
        mes = mes - 1; // JavaScript meses son 0-11
      }
      // Formato DD/MM/YYYY
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(soloFecha)) {
        [dia, mes, año] = soloFecha.split('/').map((n) => parseInt(n, 10));
        mes = mes - 1; // JavaScript meses son 0-11
      }
      // Fallback: parsear y extraer
      else {
        const fechaTemp = new Date(s);
        if (isNaN(fechaTemp.getTime())) {
          return null;
        }
        año = fechaTemp.getFullYear();
        mes = fechaTemp.getMonth();
        dia = fechaTemp.getDate();
      }
    } else {
      return null;
    }
    
    // Crear fecha a medianoche (new Date con solo año, mes, dia ya crea a medianoche)
    const fecha = new Date(año, mes, dia);
    
    // Verificar que la fecha sea válida
    if (isNaN(fecha.getTime()) || fecha.getFullYear() !== año || fecha.getMonth() !== mes || fecha.getDate() !== dia) {
      return null;
    }
    
    return fecha;
  };

  // Exportar a Excel
  const exportarExcel = async () => {
    console.log('🔄 Iniciando exportación Excel...');
    console.log('📊 Total casos a exportar:', casosFiltrados.length);
    
    // ANÁLISIS DE COLUMNAS: Clasificar cada columna según su tipo
    const clasificacionColumnas = {};
    camposVisibles.forEach(({ clave, label }) => {
      // Identificar columnas de FECHA
      if (clave.includes('fcha') || clave === 'createdAt' || clave === 'updatedAt') {
        clasificacionColumnas[label] = 'fecha';
      }
      // Identificar columnas NUMÉRICAS (valores monetarios, porcentajes, días)
      else if ([
        'vlor_resrva', 'vlor_reclmo', 'monto_indmzar', 'vlorServcios', 'vlorGastos',
        'total', 'totalGeneral', 'totalPagado', 'iva', 'reteiva', 'retefuente', 'reteica',
        'porcIva', 'porcReteiva', 'porcRetefuente', 'porcReteica', 'dias_transcrrdo',
        'honorarios', 'honorariosDefinitivos'
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
    const worksheet = workbook.addWorksheet('MisCasos');
    
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
    casosFiltrados.forEach((caso) => {
      const row = [];
      camposVisibles.forEach(({ clave, label }) => {
        const tipoColumna = clasificacionColumnas[label];
        let valor = '';
        
        // Obtener el valor según el tipo de campo
        if (clave === 'codiAsgrdra') {
          valor = getNombreAseguradora(caso.codiAsgrdra);
        } else if (clave === 'ciudadSiniestro') {
          valor = caso.descripcionCiudad || caso.nombreCiudad || convertirValorParaRenderizado(caso[clave]);
        } else if (clave === 'codiEstdo') {
          valor = getNombreEstado(caso.codiEstdo) || '';
        } else if (clave === 'codiRespnsble') {
          valor = getNombreResponsable(caso);
        } else if (clave === 'nombIntermediario') {
          valor = getNombreIntermediario(caso);
        } else if (clave === 'funcAsgrdra') {
          valor = getNombreFuncionario(caso);
        } else if (tipoColumna === 'fecha') {
          // Para fechas, usar función helper que SIEMPRE crea fecha a medianoche exacta
          valor = crearFechaSoloFecha(caso[clave]);
        } else if (tipoColumna === 'numero') {
          // Para números, convertir a número
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
          // Usar función helper para normalizar fecha a medianoche
          const fechaNormalizada = crearFechaSoloFecha(cell.value);
          
          if (fechaNormalizada) {
            cell.value = fechaNormalizada;
            // Usar formato predefinido de Excel para fecha corta (código 14)
            // Esto hará que Excel lo reconozca como "Fecha" y no "Personalizada"
            cell.numFmt = 14; // Código de formato predefinido para fecha corta (dd/mm/yyyy)
          } else {
            cell.value = null;
            cell.numFmt = 14; // Aplicar formato incluso si está vacío
          }
        } else if (tipoColumna === 'numero') {
          // Formato numérico (General)
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
    const nombreArchivo = `mis_casos_${timestamp}.xlsx`;
    
    console.log('💾 Guardando archivo:', nombreArchivo);
    
    // Escribir el archivo usando ExcelJS
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Exportación completada');
  };

  if (loading) {
    return (
      <div className="min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">Cargando casos…</p>
        </div>
      </div>
    );
  }

  const pageWrap = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-2 sm:p-4';
  const container = 'w-full min-w-0 space-y-4 sm:space-y-6';
  const card =
    'bg-white dark:bg-[#1A1A1A] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6';
  const title =
    'font-heading font-bold text-gray-800 dark:text-white border-l-4 border-fenix-primario pl-3';
  const label = 'font-body text-sm font-semibold text-gray-700 dark:text-gray-200';
  const hint = 'font-body text-sm text-gray-500 dark:text-gray-400';
  const input =
    'w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-[#1A1A1A] text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none font-body text-sm';
  const btnPrimary =
    'inline-flex items-center justify-center gap-2 bg-fenix-primario text-white rounded-lg px-4 py-2 hover:bg-red-700 transition-colors font-body font-semibold disabled:opacity-60 disabled:cursor-not-allowed';
  const btnSecondary =
    'inline-flex items-center justify-center gap-2 border-2 border-fenix-primario text-fenix-primario rounded-lg px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-body font-semibold disabled:opacity-60 disabled:cursor-not-allowed';
  const btnNeutral =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-body font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const badge =
    'inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200';

  return (
    <div className={pageWrap}>
      <div className={container}>
        <header className={card}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className={`${title} text-xl sm:text-2xl`}>Mis Casos Asignados</h1>
              <p className={hint}>
                Casos asignados a <span className="font-semibold">{usuarioActual.nombre || usuarioActual.login}</span>.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className={badge}>
                  {casosFiltrados.length} caso(s)
                </span>
                <span className={badge}>
                  {camposVisibles.length} columnas visibles
                </span>
                <span className={badge}>
                  {todosLosCampos.length} columnas disponibles
                </span>
              </div>
            </div>
          </div>
        </header>

      {/* Filtros Avanzados */}
        <section className={card}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={`${title} text-lg`}>Filtros</h2>
              <p className={hint}>Filtra por fechas, estado, aseguradora y texto.</p>
            </div>
            <button
              type="button"
              className={btnNeutral}
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
                setCampoFechaFiltro('fchaAsgncion');
                setEstadoFiltro('');
                setAseguradoraFiltro('');
                setTerminoBusqueda('');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={label}>Campo de fecha</label>
              <select value={campoFechaFiltro} onChange={(e) => setCampoFechaFiltro(e.target.value)} className={input}>
                {camposFechaDisponibles.map((campo) => (
                  <option key={campo.clave} value={campo.clave}>
                    {campo.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Fecha desde</label>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Fecha hasta</label>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className={input} />
            </div>
        
            <div>
              <label className={label}>Estado</label>
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className={input}>
                <option value="">Todos</option>
                {estadosUnicos.map((e, index) => (
                  <option key={`estado-${e.value}-${index}`} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Aseguradora</label>
              <select value={aseguradoraFiltro} onChange={(e) => setAseguradoraFiltro(e.target.value)} className={input}>
                <option value="">Todas</option>
                {aseguradorasUnicas.map((a, index) => (
                  <option key={`aseguradora-${a.value}-${index}`} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
        
            <div className="lg:col-span-3">
              <label className={label}>Buscar</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  placeholder="Número de ajuste, siniestro, asegurado, ciudad…"
                  className={`${input} min-w-0 flex-1`}
                />
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <button type="button" className={btnNeutral} onClick={exportarExcel}>
                    Exportar Excel
                  </button>
                  <button type="button" className={btnNeutral} onClick={abrirPersonalizarColumnas}>
                    Columnas
                  </button>
                  <button
                    type="button"
                    className={btnNeutral}
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
        
          {(fechaDesde || fechaHasta || estadoFiltro || aseguradoraFiltro || terminoBusqueda) && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/30">
              <p className="font-body text-xs font-semibold text-gray-700 dark:text-gray-200">
                Filtros activos
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(fechaDesde || fechaHasta) && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">
                    {camposFechaDisponibles.find((c) => c.clave === campoFechaFiltro)?.label || campoFechaFiltro}
                  </span>
                )}
                {fechaDesde && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">Desde: {fechaDesde}</span>}
                {fechaHasta && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">Hasta: {fechaHasta}</span>}
                {estadoFiltro && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">Estado: {getNombreEstado(estadoFiltro)}</span>}
                {aseguradoraFiltro && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">Aseguradora: {getNombreAseguradora(aseguradoraFiltro)}</span>}
                {terminoBusqueda && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">Búsqueda: “{terminoBusqueda}”</span>}
              </div>
              <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
                Mostrando {casosFiltrados.length} caso(s)
              </p>
            </div>
          )}
        </section>

        <p className={`${hint} text-right`}>
          {casosOrdenados.length === 0
            ? '0 registros'
            : `Mostrando ${indiceInicio + 1}–${Math.min(indiceFin, casosOrdenados.length)} de ${casosOrdenados.length}`}
        </p>

      {modalColumnasOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-[#1A1A1A]">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">Personalizar columnas</h2>
                <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">
              Arrastra las columnas para cambiar su orden. Marca/desmarca para mostrar/ocultar.
            </p>
            </div>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
                <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
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
                      <label className="flex flex-1 cursor-pointer items-center gap-2 font-body text-sm text-gray-800 dark:text-gray-200">
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
                <div className="mt-4 flex flex-col justify-end gap-2 sm:flex-row">
                  <button type="button" className={btnNeutral} onClick={() => setModalColumnasOpen(false)}>
                    Cancelar
                  </button>
                  <button type="button" className={btnPrimary} onClick={guardarColumnasPersonalizadas}>
                    Guardar
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}

        <section className={`${card} w-full min-w-0 p-0 overflow-hidden`}>
          <div className="w-full min-w-0 overflow-x-auto">
            <table className={`${complexTableGrid} divide-y divide-gray-200 dark:divide-gray-800`}>
              <thead className="bg-gray-50 font-heading text-xs font-semibold uppercase tracking-wide text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <tr>
                  <th scope="col" className={complexTableThDivider}>
                    Acciones
                  </th>
                  {camposVisibles.map(({ clave, label: colLabel }) => (
                    <th
                      key={clave}
                      scope="col"
                      className={`${complexTableThDivider} cursor-pointer select-none whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700/60`}
                      onClick={() => cambiarOrden(clave)}
                      title="Ordenar"
                    >
                      <span className="inline-flex items-center gap-2">
                        {colLabel}
                        {orden.campo === clave && (
                          <span className="text-[11px] text-gray-500 dark:text-gray-300">
                            {orden.asc ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
            </tr>
          </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
            {casosOrdenados.length === 0 ? (
              <tr>
                    <td colSpan={camposVisibles.length + 1} className="px-4 py-10 text-center font-body text-sm text-gray-500 dark:text-gray-400">
                      No hay registros para mostrar.
                </td>
              </tr>
            ) : (
              casosPaginados.map((caso, index) => (
                <tr 
                  key={caso._id || index} 
                      className="transition even:bg-gray-50/50 dark:even:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                      <td className={`${complexTableTdDivider} align-top`}>
                        <div className="flex flex-wrap items-center gap-2">
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
                        title="Editar caso (Complex)"
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
                          <FaTrash className="text-xs" aria-hidden /> Eliminar
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
                        if (clave === 'ciudadSiniestro') {
                          return caso.descripcionCiudad || caso.nombreCiudad || convertirValorParaRenderizado(caso[clave]);
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
                          return caso.descripcionCiudad || caso.nombreCiudad || convertirValorParaRenderizado(caso[clave]);
                        } else if (clave === 'codiEstdo') {
                          return getNombreEstado(caso.codiEstdo);
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

      {/* Controles de paginación */}
      {casosOrdenados.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row">
          {/* Información de paginación */}
                <div className="font-body text-sm text-gray-500 dark:text-gray-400">
            Mostrando <strong>{indiceInicio + 1}</strong> a <strong>{Math.min(indiceFin, casosOrdenados.length)}</strong> de <strong>{casosOrdenados.length}</strong> casos
            {totalPaginas > 1 && (
              <span> (Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>)</span>
            )}
          </div>

          {/* Controles de navegación */}
          {totalPaginas > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => irAPagina(1)}
                disabled={paginaActual === 1}
                        className={btnNeutral}
                title="Primera página"
              >
                ««
              </button>
              <button
                onClick={() => irAPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                        className={btnNeutral}
                title="Página anterior"
              >
                « Anterior
              </button>

              {/* Números de página */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let paginaNum;
                  if (totalPaginas <= 5) {
                    paginaNum = i + 1;
                  } else if (paginaActual <= 3) {
                    paginaNum = i + 1;
                  } else if (paginaActual >= totalPaginas - 2) {
                    paginaNum = totalPaginas - 4 + i;
                  } else {
                    paginaNum = paginaActual - 2 + i;
                  }

                  return (
                    <button
                      key={paginaNum}
                      onClick={() => irAPagina(paginaNum)}
                              className={paginaActual === paginaNum ? btnPrimary : btnNeutral}
                    >
                      {paginaNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => irAPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                        className={btnNeutral}
                title="Página siguiente"
              >
                Siguiente »
              </button>
              <button
                onClick={() => irAPagina(totalPaginas)}
                disabled={paginaActual === totalPaginas}
                        className={btnNeutral}
                title="Última página"
              >
                »»
              </button>
            </div>
          )}
        </div>
      )}
        </section>
      </div>
    </div>
  );
}

