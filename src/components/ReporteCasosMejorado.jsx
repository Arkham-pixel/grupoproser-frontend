import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex, deleteCasoComplex } from '../services/complexService';
import { obtenerResponsables, obtenerAseguradoras, obtenerCiudades } from '../services/riesgoService';
import { getEstados } from '../services/estadosService';
import historialService, { TIPOS_FORMULARIOS } from '../services/historialService.js';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { formatearFechaUI } from '../utils/fechaUtils';
import { FaFileExcel, FaSlidersH, FaTable } from 'react-icons/fa';
import { cargarMapeoFuncionarios, obtenerNombreFuncionarioDesdeCaso } from '../utils/funcionarioMapper';
import {
  casoCoincideFiltroResponsable,
  esCasoSinResponsableAsignado,
  FILTRO_RESPONSABLE_SIN_ASIGNAR,
} from '../utils/responsableAgrupacionUtils.js';
import { buildPrefillAjusteDesdeCasoComplex } from '../utils/prefillAjusteDesdeCasoComplex';
import { combinarCasosComplex } from '../utils/complexTrazabilidadUtils.js';
import AccionesCasoMenu from './SubcomponenteCompex/AccionesCasoMenu.jsx';
import AsignarSubtareaModal from './SubcomponenteCompex/AsignarSubtareaModal.jsx';
import { puedeGestionarSubtareasFrontend } from './SubcomponenteCompex/subtareasComplexUtils.js';
import {
  complexBtnGhost,
  complexBtnPrimary,
  complexBtnSecondary,
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
import { FilterSheet, ResponsiveDataList } from './responsive';

const UI_RCM = 'complex.ui.reporte_casos_mejorado';

// Opciones de campos de fecha para el filtro (orden según flujo de trazabilidad)
const camposFechaDisponibles = [
  { clave: 'fchaAsgncion' },
  { clave: 'fchaSinstro' },
  { clave: 'fchaContIni' },
  { clave: 'fchaCoordInspeccion' },
  { clave: 'fchaProgInspeccion' },
  { clave: 'fchaInspccion' },
  { clave: 'fchaSoliDocu' },
  { clave: 'fchaInfoPrelm' },
  { clave: 'fchaRepoActi' },
  { clave: 'fchaInfoFnal' },
  { clave: 'fchaPresentacionCifras' },
  { clave: 'fchaAceptacionCifrasAseguradora' },
  { clave: 'fchaEnvioFiniquito' },
  { clave: 'fchaFactra' },
  { clave: 'fchaUltSegui' },
  { clave: 'fchaActSegui' },
  { clave: 'fchaFinqtoIndem' },
  { clave: 'fchaUltRevi' },
  { clave: 'createdAt' },
  { clave: 'updatedAt' }
];

// Campos disponibles: orden de columnas alineado con trazabilidad (fechas y anexos por etapa)
const todosLosCampos = [
  { clave: 'nmroAjste' },
  { clave: 'nmroSinstro' },
  { clave: 'nombIntermediario' },
  { clave: 'codWorkflow' },
  { clave: 'nmroPolza' },
  { clave: 'codiRespnsble' },
  { clave: 'codiAsgrdra' },
  { clave: 'asgrBenfcro' },

  { clave: 'fchaAsgncion' },
  { clave: 'fchaSinstro' },
  { clave: 'fchaContIni' },
  { clave: 'obseContIni' },
  { clave: 'anexContIni' },
  { clave: 'fchaCoordInspeccion' },
  { clave: 'fchaProgInspeccion' },
  { clave: 'obseCoordInspeccion' },
  { clave: 'fchaInspccion' },
  { clave: 'obseInspccion' },
  { clave: 'anexActaInspccion' },
  { clave: 'fchaSoliDocu' },
  { clave: 'obseSoliDocu' },
  { clave: 'anexSolDoc' },
  { clave: 'fchaInfoPrelm' },
  { clave: 'obseInfoPrelm' },
  { clave: 'anxoInfPrelim' },
  { clave: 'fchaRepoActi' },
  { clave: 'obseRepoActi' },
  { clave: 'anxoRepoActi' },
  { clave: 'fchaInfoFnal' },
  { clave: 'obseInfoFnal' },
  { clave: 'anxoInfoFnal' },
  { clave: 'fchaPresentacionCifras' },
  { clave: 'fchaAceptacionCifrasAseguradora' },
  { clave: 'obsePresentacionCifras' },
  { clave: 'anxoPresentacionCifras' },
  { clave: 'fchaEnvioFiniquito' },
  { clave: 'obseEnvioFiniquito' },
  { clave: 'anxoEnvioFiniquito' },

  { clave: 'descSinstro' },
  { clave: 'ciudadSiniestro' },
  { clave: 'codiEstdo' },
  { clave: 'funcAsgrdra' },
  { clave: 'tipoDucumento' },
  { clave: 'numDocumento' },
  { clave: 'tipoPoliza' },
  { clave: 'amprAfctdo' },
  { clave: 'causa_siniestro' },
  { clave: 'dias_transcrrdo' },

  { clave: 'vlor_resrva' },
  { clave: 'vlor_reclmo' },
  { clave: 'monto_indmzar' },
  { clave: 'observacionesValores' },

  { clave: 'nmroFactra' },
  { clave: 'fchaFactra' },
  { clave: 'vlorServcios' },
  { clave: 'vlorGastos' },
  { clave: 'total' },
  { clave: 'totalGeneral' },
  { clave: 'totalPagado' },
  { clave: 'iva' },
  { clave: 'reteiva' },
  { clave: 'retefuente' },
  { clave: 'reteica' },
  { clave: 'porcIva' },
  { clave: 'porcReteiva' },
  { clave: 'porcRetefuente' },
  { clave: 'porcReteica' },
  { clave: 'anxoFactra' },

  { clave: 'fchaUltSegui' },
  { clave: 'fchaActSegui' },
  { clave: 'fchaFinqtoIndem' },
  { clave: 'fchaUltRevi' },
  { clave: 'fcha_control_horas' },
  { clave: 'fcha_envio_control_horas' },
  { clave: 'fcha_seguimiento_envio_control_horas' },
  { clave: 'obseComprmsi' },
  { clave: 'obseSegmnto' },

  { clave: 'anxoHonorarios' },
  { clave: 'anxoHonorariosdefinit' },
  { clave: 'anxoAutorizacion' },
  { clave: 'honorarios' },
  { clave: 'honorariosDefinitivos' },
  { clave: 'autorizacionHonorarios' },

  { clave: 'liquidacionPerdida' },
  { clave: 'indemnizacion' },
  { clave: 'salvamentos' },
  { clave: 'panoramaRiesgos' },

  { clave: 'createdAt' },
  { clave: 'updatedAt' }
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [estados, setEstados] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [camposVisiblesClaves, setCamposVisiblesClaves] = useState(() =>
    columnasIniciales.filter((clave) => todosLosCampos.some((c) => c.clave === clave))
  );
  const camposVisibles = useMemo(
    () =>
      camposVisiblesClaves.map((clave) => ({
        clave,
        label: t(`${UI_RCM}.campos.${clave}`),
      })),
    [camposVisiblesClaves, t]
  );
  const camposFechaConLabel = useMemo(
    () =>
      camposFechaDisponibles.map(({ clave }) => ({
        clave,
        label: t(`${UI_RCM}.campos_fecha.${clave}`),
      })),
    [t]
  );
  const [modalColumnasOpen, setModalColumnasOpen] = useState(false);
  const [seleccionTemporal, setSeleccionTemporal] = useState(() => [...columnasIniciales]);
  const [columnasOrdenadas, setColumnasOrdenadas] = useState(() =>
    todosLosCampos.filter((c) => columnasIniciales.includes(c.clave))
  );
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
  const [casoSubtareaModal, setCasoSubtareaModal] = useState(null);
  const [filtrosSheetOpen, setFiltrosSheetOpen] = useState(false);
  const casosPorPagina = 15;
  const filtrosAplicadosRef = useRef(false);
  const aplicarFiltrosRef = useRef(null);

  // Restaurar filtros desde el estado de navegación cuando se reciben
  useEffect(() => {
    const filtrosDesdeNavegacion = location.state?.filtros;
    if (filtrosDesdeNavegacion && !filtrosAplicadosRef.current) {
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
  }, [location.pathname, location.state, navigate]);

  // Cargar casos y datos auxiliares al montar el componente
  const cargarCasos = useCallback(async () => {
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

      // Combinar fuentes y eliminar duplicados por _id o número de ajuste
      const casosFinales = combinarCasosComplex(siniestros, complex).map(sincronizarCamelSnake);

      // Ordenar por fecha de asignación (más recientes primero)
      casosFinales.sort((a, b) => {
        const fechaA = new Date(a.fchaAsgncion || a.fecha_asignacion_form || 0);
        const fechaB = new Date(b.fchaAsgncion || b.fecha_asignacion_form || 0);
        return fechaB - fechaA;
      });

      setCasos(casosFinales);
    } catch (error) {
      console.error('Error cargando casos:', error);
      setCasos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCasos();
    
    // Cargar mapeo de funcionarios (importante para mostrar nombres en lugar de códigos)
    cargarMapeoFuncionarios()
      .then(() => {
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
  }, [cargarCasos]);

  // Función para cambiar el orden de la tabla
  const cambiarOrden = (campo) => {
    setOrden(prev => ({
      campo,
      asc: prev.campo === campo ? !prev.asc : true
    }));
  };

  // Función para aplicar filtros
  aplicarFiltrosRef.current = () => {
    if (casos.length === 0) {
      setCasosFiltrados([]);
      return;
    }
    
    const resultados = casos.filter(caso => {
      let ok = true;
      const razonesExclusion = [];
      
      // Filtro por búsqueda de texto
      if (terminoBusqueda && terminoBusqueda.trim()) {
        const termino = terminoBusqueda.toLowerCase().trim();
        let encontrado = camposVisibles.some((campo) => {
          const valor = caso[campo.clave];
          if (valor && typeof valor === 'string') {
            return valor.toLowerCase().includes(termino);
          }
          return false;
        });
        if (
          !encontrado &&
          termino.includes('sin asignar') &&
          esCasoSinResponsableAsignado(caso)
        ) {
          encontrado = true;
        }
        if (
          !encontrado &&
          typeof getNombreResponsable === 'function'
        ) {
          const nombreResp = getNombreResponsable(caso);
          if (nombreResp && String(nombreResp).toLowerCase().includes(termino)) {
            encontrado = true;
          }
        }
        if (!encontrado) {
          ok = false;
          razonesExclusion.push('búsqueda texto');
        }
      }
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
          } catch {
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
              } catch {
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
      // Filtro por responsable
      if (responsableFiltro && responsableFiltro.trim() !== '') {
        if (
          !casoCoincideFiltroResponsable(caso, responsableFiltro, {
            responsables,
            getNombreResponsable,
          })
        ) {
          ok = false;
          razonesExclusion.push('responsable no coincide');
        }
      }
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
      return ok;
    });
    
    setCasosFiltrados(resultados);
  };

  // Aplicar filtros automáticamente
  useEffect(() => {
    aplicarFiltrosRef.current();
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

  const responsablesUnicos = [
    { value: FILTRO_RESPONSABLE_SIN_ASIGNAR, label: 'Sin asignar' },
    ...responsables
      .map((r) => ({
        value: String(r.codiRespnsble),
        label: r.nmbrRespnsble || r.nombre || String(r.codiRespnsble),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];

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

  const renderCampoCaso = (caso, clave) => {
    if (clave === 'codiAsgrdra') return getNombreAseguradora(caso.codiAsgrdra);
    if (clave === 'codiEstdo') return getNombreEstado(caso.codiEstdo);
    if (clave === 'codiRespnsble') return getNombreResponsable(caso);
    if (clave === 'nombIntermediario') return getNombreIntermediario(caso);
    if (clave === 'funcAsgrdra') return getNombreFuncionario(caso);
    if (clave.includes('fcha') || clave === 'createdAt' || clave === 'updatedAt') {
      return formatearFechaUI(caso[clave]) || '';
    }
    if (
      clave === 'liquidacionPerdida' ||
      clave === 'indemnizacion' ||
      clave === 'salvamentos' ||
      clave === 'panoramaRiesgos'
    ) {
      const valor = caso[clave];
      if (typeof valor === 'object' && valor !== null) {
        return Object.values(valor).filter((v) => v).join(', ') || '';
      }
      return valor || '';
    }
    if (clave === 'ciudadSiniestro') {
      const ciudadCompleta =
        caso.descripcionCiudad || caso.nombreCiudad || convertirValorParaRenderizado(caso[clave]);
      return extraerSoloCiudad(ciudadCompleta);
    }
    return convertirValorParaRenderizado(caso[clave]);
  };

  const filtrosActivosCount = [
    fechaDesde,
    fechaHasta,
    estadoFiltro,
    responsableFiltro,
    aseguradoraFiltro,
    terminoBusqueda,
  ].filter(Boolean).length;

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setCampoFechaFiltro('fchaAsgncion');
    setEstadoFiltro('');
    setResponsableFiltro('');
    setAseguradoraFiltro('');
    setTerminoBusqueda('');
  };

  const camposCardClaves = [
    'nmroAjste',
    'nmroSinstro',
    'codiEstdo',
    'codiAsgrdra',
    'codiRespnsble',
    'fchaAsgncion',
    'asgrBenfcro',
  ];
  const camposCard = camposCardClaves.map((clave) => ({
    clave,
    label: t(`${UI_RCM}.campos.${clave}`, { defaultValue: clave }),
  }));

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
      // Sin estadoInicial: al editar un ajuste existente se abre la última
      // versión guardada; un ajuste nuevo comienza en acta de inspección.
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
            f?.datos?.nmroAjste,
            f?.datos?.metadata?.numeroAjuste,
            f?.trazabilidadSecuencia?.numeroAjuste,
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

  const navegarCatastroficoDesdeReporte = async (caso) => {
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
      prefillDesdeCaso: buildPrefillAjusteDesdeCasoComplex(caso),
    };

    try {
      const historial = await historialService.obtenerHistorial({
        tipo: TIPOS_FORMULARIOS.CATASTROFICO,
        limite: 1000,
      });
      const mismoCaso = (Array.isArray(historial) ? historial : [])
        .filter((f) => {
          const posiblesClaves = [
            f?.numeroCaso,
            f?.datos?.numeroCaso,
            f?.datos?.numeroAjuste,
            f?.datos?.nmroAjste,
            f?.datos?.metadata?.numeroAjuste,
          ]
            .map(normalizarClaveCaso)
            .filter(Boolean);
          return posiblesClaves.includes(numeroCasoNormalizado);
        })
        .sort((a, b) => {
          const fa = new Date(a?.fechaModificacion || a?.updatedAt || a?.fechaCreacion || 0).getTime();
          const fb = new Date(b?.fechaModificacion || b?.updatedAt || b?.fechaCreacion || 0).getTime();
          return fb - fa;
        });
      const idExistente = mismoCaso[0]?._id || mismoCaso[0]?.id;
      if (idExistente) {
        navigate(`/catastrofico/editar/${idExistente}`, { state: stateRetorno });
        return;
      }
    } catch (error) {
      console.warn('⚠️ No se pudo validar continuidad de catastrófico:', error?.message || error);
    }

    navigate('/catastrofico', { state: stateRetorno });
  };

  const handleCrearCatastrofico = (caso) => navegarCatastroficoDesdeReporte(caso);


  /** Editar el caso en el formulario Complex (mismo comportamiento que el antiguo botón «Editar»). */
  const handleGestionar = (caso) => {
    const id = caso?._id;
    if (!id) {
      alert(t(`${UI_RCM}.no_se_encontro_identificador`));
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
      t(`${UI_RCM}.confirmar_eliminar`, { numero: numeroAjuste })
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
        alert(t(`${UI_RCM}.no_se_puede_eliminar`));
      }
    } catch (error) {
      console.error('Error al eliminar caso:', error);
      alert(`Error al eliminar el caso: ${error.message}`);
    }
  };

  // Funciones para personalizar columnas
  const abrirPersonalizarColumnas = () => {
    setSeleccionTemporal(camposVisiblesClaves);
    // Inicializar orden con las columnas visibles en su orden actual
    const ordenActual = [...camposVisiblesClaves];
    const columnasVisiblesOrdenadas = ordenActual.map((clave) => ({ clave }));
    const columnasNoVisibles = todosLosCampos.filter((c) => !ordenActual.includes(c.clave));
    setColumnasOrdenadas([...columnasVisiblesOrdenadas, ...columnasNoVisibles]);
    setModalColumnasOpen(true);
  };

  const guardarColumnasPersonalizadas = () => {
    // Ordenar las columnas seleccionadas según el orden en columnasOrdenadas
    const columnasSeleccionadasOrdenadas = columnasOrdenadas
      .filter((c) => seleccionTemporal.includes(c.clave))
      .map((c) => c.clave);
    setCamposVisiblesClaves(columnasSeleccionadasOrdenadas);
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
// Aplicar filtros nuevamente para asegurar que se exporten los mismos casos que se muestran
    const casosParaExportar = casos.filter(caso => {
      let ok = true;
      
      // Filtro por búsqueda de texto
      if (terminoBusqueda && terminoBusqueda.trim()) {
        const termino = terminoBusqueda.toLowerCase().trim();
        let encontrado = camposVisibles.some((campo) => {
          const valor = caso[campo.clave];
          if (valor && typeof valor === 'string') {
            return valor.toLowerCase().includes(termino);
          }
          return false;
        });
        if (
          !encontrado &&
          termino.includes('sin asignar') &&
          esCasoSinResponsableAsignado(caso)
        ) {
          encontrado = true;
        }
        if (!encontrado) {
          const nombreResp = getNombreResponsable(caso);
          if (nombreResp && String(nombreResp).toLowerCase().includes(termino)) {
            encontrado = true;
          }
        }
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
        if (
          !casoCoincideFiltroResponsable(caso, responsableFiltro, {
            responsables,
            getNombreResponsable,
          })
        ) {
          ok = false;
        }
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
            <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t(`${UI_RCM}.cargando_casos`)}</p>
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
              {t(`${UI_RCM}.reporte_completo`)}
            </h1>
          </div>
          <p className="font-body text-sm text-gray-600 dark:text-gray-400">
            {t(`${UI_RCM}.vista_general`)}
          </p>
          <p className="font-body text-xs text-gray-500 dark:text-gray-400">
            {t(`${UI_RCM}.casos_columnas`, {
              casos: casosFiltrados.length,
              columnas: camposVisibles.length,
            })}
          </p>
        </header>

      {/* Filtros Avanzados */}
        <section className={complexCard}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{t(`${UI_RCM}.filtros`)}</h2>
              <p className="font-body text-sm text-gray-500 dark:text-gray-400">
                {t(`${UI_RCM}.filtra_por`)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={complexBtnSecondary} onClick={abrirPersonalizarColumnas}>
                <FaSlidersH />
                {t(`${UI_RCM}.columnas`)}
              </button>
              <button type="button" className={complexBtnSecondary} onClick={exportarExcel}>
                <FaFileExcel />
                {t(`${UI_RCM}.exportar_excel`)}
              </button>
              <button
                type="button"
                className={complexBtnGhost}
                onClick={() => {
                  setCamposVisiblesClaves(todosLosCampos.map((c) => c.clave));
                  setModalColumnasOpen(false);
                }}
              >
                {t(`${UI_RCM}.mostrar_todas`)}
              </button>
            </div>
          </div>

          <FilterSheet
            open={filtrosSheetOpen}
            onOpenChange={setFiltrosSheetOpen}
            title={t(`${UI_RCM}.filtros`)}
            triggerLabel={t(`${UI_RCM}.filtros`)}
            activeCount={filtrosActivosCount}
            footer={
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`${complexBtnGhost} min-h-[44px] flex-1`} onClick={limpiarFiltros}>
                  {t(`${UI_RCM}.limpiar_filtros`)}
                </button>
                <button
                  type="button"
                  className={`${complexBtnPrimary} min-h-[44px] flex-1`}
                  onClick={() => setFiltrosSheetOpen(false)}
                >
                  {t(`${UI_RCM}.guardar`, { defaultValue: 'Aplicar' })}
                </button>
              </div>
            }
          >
            <div className="mb-3 hidden md:flex md:justify-end">
              <button type="button" className={complexBtnGhost} onClick={limpiarFiltros}>
                {t(`${UI_RCM}.limpiar_filtros`)}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={complexLabel}>{t(`${UI_RCM}.campo_de_fecha`)}</label>
                <select value={campoFechaFiltro} onChange={(e) => setCampoFechaFiltro(e.target.value)} className={complexSelect}>
                  {camposFechaConLabel.map((campo) => (
                    <option key={campo.clave} value={campo.clave}>
                      {campo.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={complexLabel}>{t(`${UI_RCM}.fecha_desde`)}</label>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className={complexInput} />
              </div>
              <div>
                <label className={complexLabel}>{t(`${UI_RCM}.fecha_hasta`)}</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className={complexInput} />
              </div>
              <div>
                <label className={complexLabel}>{t(`${UI_RCM}.estado`)}</label>
                <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className={complexSelect}>
                  <option value="">{t(`${UI_RCM}.todos`)}</option>
                  {estadosUnicos.map((e, index) => (
                    <option key={`estado-${e.value}-${index}`} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={complexLabel}>{t(`${UI_RCM}.aseguradora`)}</label>
                <select value={aseguradoraFiltro} onChange={(e) => setAseguradoraFiltro(e.target.value)} className={complexSelect}>
                  <option value="">{t(`${UI_RCM}.todas`)}</option>
                  {aseguradorasUnicas.map((a, index) => (
                    <option key={`aseguradora-${a.value}-${index}`} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={complexLabel}>{t(`${UI_RCM}.responsable`)}</label>
                <select value={responsableFiltro} onChange={(e) => setResponsableFiltro(e.target.value)} className={complexSelect}>
                  <option value="">{t(`${UI_RCM}.todos`)}</option>
                  {responsablesUnicos.map((r, index) => (
                    <option key={`responsable-${r.value}-${index}`} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className={complexLabel}>{t(`${UI_RCM}.buscar`)}</label>
                <input
                  type="text"
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  placeholder={t(`${UI_RCM}.placeholder_buscar`)}
                  className={complexInput}
                />
              </div>
            </div>
          </FilterSheet>

          {filtrosActivosCount > 0 && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/30">
              <p className="font-body text-xs font-semibold text-gray-700 dark:text-gray-200">{t(`${UI_RCM}.filtros_activos`)}</p>
              <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
                {t(`${UI_RCM}.mostrando_de`, {
                  filtrados: casosFiltrados.length,
                  total: casos.length,
                })}
              </p>
            </div>
          )}
        </section>

      {modalColumnasOpen && (
        <div className={complexModalOverlay} role="presentation" onClick={() => setModalColumnasOpen(false)}>
          <div className={complexModalShell} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{t(`${UI_RCM}.personalizar_columnas`)}</h2>
              <button type="button" className={complexBtnGhost} onClick={() => setModalColumnasOpen(false)}>
                {t(`${UI_RCM}.cerrar`)}
              </button>
            </div>
            <div className="p-5">
              <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
                {t(`${UI_RCM}.arrastra_para_ordenar`)}
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
                      {t(`${UI_RCM}.campos.${campo.clave}`)}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row">
                <button type="button" className={complexBtnSecondary} onClick={() => setModalColumnasOpen(false)}>
                  {t(`${UI_RCM}.cancelar`)}
                </button>
                <button type="button" className={complexBtnPrimary} onClick={guardarColumnasPersonalizadas}>
                  {t(`${UI_RCM}.guardar`)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        <ResponsiveDataList
          items={casosPaginados}
          emptyLabel={t(`${UI_RCM}.no_hay_registros`)}
          table={
            <div className={complexTableWrap}>
              <div className="overflow-x-auto">
                <table className={`${complexTableGrid} divide-y divide-gray-200 dark:divide-gray-800`}>
                  <thead className={complexTableHead}>
                    <tr>
                      <th
                        scope="col"
                        className={`${complexTableThDivider} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50`}
                      >
                        {t(`${UI_RCM}.acciones`)}
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
                          {t(`${UI_RCM}.no_hay_registros`)}
                        </td>
                      </tr>
                    ) : (
                      casosPaginados.map((caso, index) => (
                        <tr
                          key={`${caso._id || 'sin-id'}-${caso.nmroAjste || caso.numero_ajuste || index}`}
                          className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                        >
                          <td
                            className={`${complexTableTdDivider} sticky left-0 z-20 overflow-visible whitespace-nowrap bg-white dark:bg-[#1A1A1A]`}
                          >
                            <AccionesCasoMenu
                              onAjuste={() => handleCrearAjuste(caso)}
                              onCatastrofico={() => handleCrearCatastrofico(caso)}
                              onGestionar={() => handleGestionar(caso)}
                              onEliminar={() => handleDelete(caso)}
                              onAsignarSubtarea={() => setCasoSubtareaModal(caso)}
                              puedeEliminar={esAdminOSoporte}
                              puedeAsignarSubtarea={puedeGestionarSubtareasFrontend(caso.codiRespnsble)}
                            />
                          </td>
                          {camposVisibles.map(({ clave }) => (
                            <td
                              key={clave}
                              className={`${complexTableTdDivider} whitespace-nowrap font-body text-sm text-gray-800 dark:text-gray-200`}
                            >
                              {renderCampoCaso(caso, clave)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          }
          renderCard={(caso) => (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-base font-semibold text-gray-900 dark:text-white">
                    {renderCampoCaso(caso, 'nmroAjste') || '—'}
                  </p>
                  <p className="mt-0.5 font-body text-xs text-gray-500 dark:text-gray-400">
                    {renderCampoCaso(caso, 'nmroSinstro') || '—'}
                  </p>
                </div>
                <AccionesCasoMenu
                  onAjuste={() => handleCrearAjuste(caso)}
                  onCatastrofico={() => handleCrearCatastrofico(caso)}
                  onGestionar={() => handleGestionar(caso)}
                  onEliminar={() => handleDelete(caso)}
                  onAsignarSubtarea={() => setCasoSubtareaModal(caso)}
                  puedeEliminar={esAdminOSoporte}
                  puedeAsignarSubtarea={puedeGestionarSubtareasFrontend(caso.codiRespnsble)}
                />
              </div>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {camposCard
                  .filter((c) => c.clave !== 'nmroAjste' && c.clave !== 'nmroSinstro')
                  .map(({ clave, label }) => (
                    <div key={clave} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {label}
                      </dt>
                      <dd className="mt-0.5 truncate font-body text-sm text-gray-800 dark:text-gray-200">
                        {renderCampoCaso(caso, clave) || '—'}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
        />

      {/* Controles de paginación */}
      {casosOrdenados.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#1A1A1A] sm:flex-row">
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">
            {t(`${UI_RCM}.mostrando_pagina`, {
              inicio: indiceInicio + 1,
              fin: Math.min(indiceFin, casosOrdenados.length),
              total: casosOrdenados.length,
            })}
            {totalPaginas > 1 && (
              <span>
                {' '}
                {t(`${UI_RCM}.pagina_de`, {
                  actual: paginaActual,
                  paginas: totalPaginas,
                })}
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
                {t(`${UI_RCM}.anterior`)}
              </button>
              <button
                type="button"
                className={complexBtnSecondary}
                disabled={paginaActual >= totalPaginas}
                onClick={() => irAPagina(paginaActual + 1)}
              >
                {t(`${UI_RCM}.siguiente`)}
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      <AsignarSubtareaModal
        open={Boolean(casoSubtareaModal)}
        caso={casoSubtareaModal}
        responsables={responsables}
        onClose={() => setCasoSubtareaModal(null)}
      />
    </div>
  );
}
