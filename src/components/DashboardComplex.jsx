import { useTranslation } from 'react-i18next';
// src/components/DashboardComplex.jsx
import React, { useEffect, useState } from 'react';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex } from '../services/complexService';
import { obtenerResponsables, obtenerAseguradoras } from '../services/riesgoService';
import { getEstados } from '../services/estadosService';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Loader from './Loader';
import { obtenerNombreAseguradora, mapeoEstados } from '../data/mapeos';
import { useTheme } from '../context/ThemeContext';
import { cargarMapeoFuncionarios } from '../utils/funcionarioMapper';
import { diasHabilesColombiaEntre } from '../utils/festivosColombia.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexFilterPanel,
  complexScope,
  complexSectionTitle,
  complexTableHead,
  complexTableSimple,
  complexTableWrap,
  dominioPorcentajeAcotado,
  getFenixChartColor,
  getFenixLineChartColors,
  getFenixNeutralBarColor,
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
import {
  alturaGraficoBarrasVerticales,
  CHART_HEIGHT_STANDARD,
  CHART_HEIGHT_TALL,
  CHART_TOP_ASEGURADORAS,
  CHART_HEIGHT_BAR_LIST_MAX,
  CHART_TOP_ESTADOS,
  CHART_TOP_RESPONSABLES,
  METRIC_TOP_ESTADOS,
} from './SubcomponenteCompex/dashboardComplexChartUtils.js';

/** Traduce nombres de estado del catálogo (API/mapeo) al idioma activo. */
const ESTADO_CATALOGO_I18N = {
  FACTURADO: 'estado_facturado',
  'PENDIENTE DOCUMENTOS': 'estado_pendiente_documentos',
  'PENDIENTE ACEPTACION CLIENTE': 'estado_pendiente_aceptacion_cliente',
  'PENDIENTE ACEPTACIÓN CLIENTE': 'estado_pendiente_aceptacion_cliente',
  'PENDIENTE ACEPTACION CIFRAS': 'estado_pendiente_aceptacion_cifras',
  'PENDIENTE ACEPTACIÓN CIFRAS': 'estado_pendiente_aceptacion_cifras',
  'EN PROCESO': 'estado_en_proceso',
  CERRADO: 'estado_cerrado',
  CANCELADO: 'estado_cancelado',
  SUSPENDIDO: 'estado_suspendido',
  REVISION: 'estado_revision',
  REVISIÓN: 'estado_revision',
  FINALIZADO: 'estado_finalizado',
};

function traducirNombreEstadoCatalogo(nombre, t) {
  if (!nombre) return nombre;
  const key = ESTADO_CATALOGO_I18N[String(nombre).trim().toUpperCase()];
  return key ? t(`complex.ui.dashboard_complex.${key}`) : nombre;
}

const DashboardComplex = () => {
  const { t, i18n } = useTranslation();
  const dateLang = String(i18n.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  const datePlaceholder = t('complex.ui.dashboard_complex.placeholder_fecha');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [siniestros, setSiniestros] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [aseguradoraFiltro, setAseguradoraFiltro] = useState("");
  const [responsableFiltro, setResponsableFiltro] = useState("");

  useEffect(() => {
    const cargarCasos = async () => {
      setLoading(true);
      try {
        // Cargar mapeo de funcionarios (importante para mostrar nombres en lugar de cÃ³digos)
        cargarMapeoFuncionarios()
          .then(() => {
})
          .catch(error => {
            console.error('Error cargando mapeo de funcionarios:', error);
          });
        
        // Cargar casos de ambas fuentes (igual que el reporte)
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

        // FunciÃ³n para sincronizar campos camelCase y snake_case (igual que el reporte)
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

        // Combinar y sincronizar casos
        const todosLosCasos = [...siniestros, ...complex].map(sincronizarCamelSnake);
        
        // Eliminar duplicados basado en nÃºmero de ajuste
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
        
        // Ordenar por fecha de asignaciÃ³n (mÃ¡s recientes primero) - igual que el reporte
        casosFinales.sort((a, b) => {
          const fechaA = new Date(a.fchaAsgncion || a.fecha_asignacion_form || 0);
          const fechaB = new Date(b.fchaAsgncion || b.fecha_asignacion_form || 0);
          return fechaB - fechaA;
        });

// Contar casos por estado para debugging
        const casosPorEstado = {};
        casosFinales.forEach(caso => {
          const estado = String(caso.codiEstdo || caso.codi_estado || caso.estado || 'Sin estado').trim();
          casosPorEstado[estado] = (casosPorEstado[estado] || 0) + 1;
        });
setSiniestros(casosFinales);
        
        // Cargar responsables, aseguradoras y estados (igual que el reporte)
        obtenerResponsables()
          .then(data => {
            const responsablesData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
            setResponsables(responsablesData);
          })
          .catch(error => {
            console.error('Error cargando responsables:', error);
            setResponsables([]);
          });

        obtenerAseguradoras()
          .then(data => {
            const aseguradorasData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
            setAseguradoras(aseguradorasData);
          })
          .catch(error => {
            console.error('Error cargando aseguradoras:', error);
            setAseguradoras([]);
          });

        getEstados()
          .then(data => {
            setEstados(Array.isArray(data) ? data : []);
          })
          .catch(error => {
            console.error('Error cargando estados:', error);
            setEstados([]);
          });
      } catch (error) {
        console.error('Error cargando casos:', error);
        setSiniestros([]);
        setResponsables([]);
        setAseguradoras([]);
        setEstados([]);
      } finally {
        setLoading(false);
      }
    };

    cargarCasos();
  }, []);

  if (loading) {
    return (
      <div className={complexDashboardRoot}>
        <Loader />
      </div>
    );
  }

  // Validar que hay datos
  if (!siniestros || siniestros.length === 0) {
    return (
      <div className={complexDashboardRoot}>
        <div className={`${complexScope} ${complexDashboardWrap}`}>
          <ComplexPageHeader
            title={t("complex.ui.dashboard_complex.dashboard_complex")}
            subtitle={t("complex.ui.dashboard_complex.no_hay_datos_de_siniestros_disponibles_para_mostrar")}
            activePath="/complex/dashboard"
          />
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
            <p className="font-body text-sm text-gray-600 dark:text-gray-400">{t("complex.ui.dashboard_complex.verifica_que_existan_casos_en_la_base_de_datos_o_revisa_")}</p>
          </div>
        </div>
      </div>
    );
  }

  // FunciÃ³n para obtener nombre del responsable (igual que el reporte)
  // Función helper para obtener nombre de estado desde la API (no usar mapeo estático)
  const obtenerNombreEstadoAPI = (codigoEstado) => {
    if (!codigoEstado || codigoEstado === 'null' || codigoEstado === 'undefined' || codigoEstado === '') {
      return t('complex.ui.dashboard_complex.sin_estado');
    }
    
    const codigoStr = String(codigoEstado).trim();
    
    // Buscar en la lista de estados de la API
    if (estados && estados.length > 0) {
      const estadoEncontrado = estados.find(e => String(e.codiEstdo).trim() === codigoStr);
      if (estadoEncontrado && estadoEncontrado.descEstdo) {
        return traducirNombreEstadoCatalogo(estadoEncontrado.descEstdo, t);
      }
    }
    
    // Fallback al mapeo estático si no se encuentra en la API
    const fallback = mapeoEstados[codigoStr];
    if (fallback) return traducirNombreEstadoCatalogo(fallback, t);
    return t('complex.ui.dashboard_complex.estado_n', { codigo: codigoStr });
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

  // Filtrado de siniestros
  const siniestrosFiltrados = siniestros.filter(siniestro => {
    let ok = true;
    
    // Filtro por fecha de asignaciÃ³n
    if (fechaDesde) {
      const f = siniestro.fchaAsgncion ? new Date(siniestro.fchaAsgncion) : null;
      if (!f || f < new Date(fechaDesde)) ok = false;
    }
    if (fechaHasta) {
      const f = siniestro.fchaAsgncion ? new Date(siniestro.fchaAsgncion) : null;
      if (!f || f > new Date(fechaHasta)) ok = false;
    }
    
    // Filtro por estado
    if (estadoFiltro) {
      ok = ok && String(siniestro.codiEstdo) === String(estadoFiltro);
    }
    
    // Filtro por aseguradora - buscar en todos los campos posibles (igual que el reporte)
    if (aseguradoraFiltro && aseguradoraFiltro.trim() !== '') {
      const aseguradoraFiltroStr = String(aseguradoraFiltro).trim();
      let coincide = false;
      
      // FunciÃ³n helper para normalizar cÃ³digos
      const normalizarCodigo = (codigo) => {
        if (codigo === null || codigo === undefined || codigo === '') return '';
        return String(codigo).trim();
      };
      
      // FunciÃ³n helper para normalizar nombres (sin acentos, minÃºsculas)
      const normalizarNombre = (nombre) => {
        if (!nombre) return '';
        return String(nombre)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
          .trim();
      };
      
      // Buscar en todos los campos posibles de aseguradora (cÃ³digos y nombres)
      const codigosAseguradora = [
        siniestro.codiAsgrdra,
        siniestro.cod1Asgrdra,
        siniestro.aseguradora,
        siniestro.codi_asgrdra,
        siniestro.cod1_asgrdra,
        siniestro.codiAseguradora // Campo retornado por obtenerSiniestrosEnriquecidos
      ]
      .filter(c => c !== null && c !== undefined && c !== '')
      .map(normalizarCodigo)
      .filter(c => c !== '');
      
      // TambiÃ©n buscar nombres de aseguradora en el caso
      const nombresAseguradora = [
        siniestro.nombreAseguradora,
        siniestro.aseguradora_form,
        siniestro.aseguradora_nombre
      ]
      .filter(n => n !== null && n !== undefined && n !== '')
      .map(normalizarNombre)
      .filter(n => n !== '');
      
      const aseguradoraFiltroNormalizada = normalizarCodigo(aseguradoraFiltroStr);
      
      // 1. Comparar cÃ³digos directamente
      for (const codigo of codigosAseguradora) {
        if (codigo === aseguradoraFiltroNormalizada) {
          coincide = true;
          break;
        }
      }
      
      // 2. Si no coincide por cÃ³digo, buscar en la lista de aseguradoras
      if (!coincide && aseguradoras.length > 0) {
        // Buscar la aseguradora seleccionada en la lista
        const aseguradoraEncontrada = aseguradoras.find(a => {
          const cod1 = normalizarCodigo(a.codiAsgrdra);
          const cod2 = normalizarCodigo(a.cod1Asgrdra);
          return cod1 === aseguradoraFiltroNormalizada || cod2 === aseguradoraFiltroNormalizada;
        });
        
        if (aseguradoraEncontrada) {
          // Obtener TODOS los cÃ³digos posibles de esta aseguradora
          const codigosAseguradoraEncontrada = [
            normalizarCodigo(aseguradoraEncontrada.codiAsgrdra),
            normalizarCodigo(aseguradoraEncontrada.cod1Asgrdra)
          ].filter(c => c !== '');
          
          const nombreAseguradoraEncontrada = normalizarNombre(aseguradoraEncontrada.rzonSocial);
          
          // 2a. Verificar si el caso tiene alguno de estos cÃ³digos (string)
          for (const codigoCaso of codigosAseguradora) {
            for (const codigoAseg of codigosAseguradoraEncontrada) {
              if (codigoCaso === codigoAseg) {
                coincide = true;
                break;
              }
            }
            if (coincide) break;
          }
          
          // 2b. Verificar si el caso tiene el cÃ³digo en formato numÃ©rico
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
          
          // 2c. Verificar por nombre de aseguradora SOLO en campos especÃ­ficos (si no coincide por cÃ³digo)
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
      
      ok = ok && coincide;
    }
    
    // Filtro por responsable - usar getNombreResponsable
    if (responsableFiltro) {
      const nombreRespCaso = getNombreResponsable(siniestro);
      const filtroStr = String(responsableFiltro).trim();
      
      if (filtroStr === 'Sin asignar') {
        ok = ok && (nombreRespCaso === 'Sin asignar' || !nombreRespCaso);
      } else {
        ok = ok && String(nombreRespCaso).trim() === filtroStr;
      }
    }
    
    return ok;
  });

  // MÃ©tricas bÃ¡sicas
  const totalSiniestros = siniestrosFiltrados.length;

  // Contar estados dinÃ¡micamente desde la API
  const casosPorEstadoCodigo = {};
  siniestrosFiltrados.forEach(s => {
    const codigo = String(s.codiEstdo || '').trim();
    if (codigo) {
      casosPorEstadoCodigo[codigo] = (casosPorEstadoCodigo[codigo] || 0) + 1;
    }
  });

  // Crear array de tarjetas de estados dinÃ¡micamente
  const tarjetasEstados = estados
    .map(estado => {
      const codigo = String(estado.codiEstdo).trim();
      const nombre = traducirNombreEstadoCatalogo(
        estado.descEstdo || t('complex.ui.dashboard_complex.estado_n', { codigo }),
        t
      );
      const cantidad = casosPorEstadoCodigo[codigo] || 0;

      return {
        codigo,
        nombre,
        cantidad,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre)); // Ordenar alfabÃ©ticamente

  // FunciÃ³n helper para obtener nombre de aseguradora desde la API (igual que el reporte)
  // DEBE estar definida ANTES de usarse en los cÃ¡lculos de abajo
  const getNombreAseguradora = (codigoAseguradora) => {
    if (!codigoAseguradora || codigoAseguradora === 'null' || codigoAseguradora === 'undefined' || codigoAseguradora === '') {
      return obtenerNombreAseguradora(codigoAseguradora); // Fallback al mapeo estÃ¡tico
    }
    
    const valorStr = String(codigoAseguradora).trim();
    if (aseguradoras.length > 0) {
      const aseguradora = aseguradoras.find(a => {
        const cod1 = String(a.codiAsgrdra || '').trim();
        const cod2 = String(a.cod1Asgrdra || '').trim();
        return cod1 === valorStr || cod2 === valorStr;
      });
      
      if (aseguradora && aseguradora.rzonSocial) {
        return aseguradora.rzonSocial;
      }
    }
    
    // Fallback al mapeo estÃ¡tico si no se encuentra
    return obtenerNombreAseguradora(codigoAseguradora);
  };

  // EvoluciÃ³n temporal de siniestros (por mes)
  const siniestrosPorMes = siniestrosFiltrados.reduce((acc, s) => {
    if (s.fchaAsgncion) {
      const fecha = new Date(s.fchaAsgncion);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      acc[mes] = (acc[mes] || 0) + 1;
    }
    return acc;
  }, {});

  const evolucionTemporal = Object.entries(siniestrosPorMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, cantidad]) => ({
      mes: mes.split('-')[1] + '/' + mes.split('-')[0],
      cantidad
    }));

  // DistribuciÃ³n geogrÃ¡fica (ciudades)
  const siniestrosPorCiudad = Object.entries(
    siniestrosFiltrados.reduce((acc, s) => {
      // Priorizar descripcionCiudad o nombreCiudad si estÃ¡n disponibles
      const ciudad = s.descripcionCiudad || s.nombreCiudad || s.ciudadSiniestro || t('complex.ui.dashboard_complex.no_especificada');
      acc[ciudad] = (acc[ciudad] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([ciudad, cantidad]) => ({ ciudad, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  // GrÃ¡fico de barras â†’ Siniestros por estado
  // Asegurar que todos los estados se muestren con sus nombres, no cÃ³digos
  const siniestrosPorEstado = Object.entries(
    siniestrosFiltrados.reduce((acc, s) => {
      let nombreEstado = obtenerNombreEstadoAPI(s.codiEstdo);
      // Si el resultado es un cÃ³digo (solo nÃºmeros), buscar en la lista de estados
      if (!nombreEstado || nombreEstado === String(s.codiEstdo) || /^\d+$/.test(nombreEstado)) {
        if (estados.length > 0) {
          const estadoEncontrado = estados.find(e => String(e.codiEstdo) === String(s.codiEstdo));
          if (estadoEncontrado && estadoEncontrado.descEstdo) {
            nombreEstado = traducirNombreEstadoCatalogo(estadoEncontrado.descEstdo, t);
          } else {
            nombreEstado = nombreEstado || t('complex.ui.dashboard_complex.estado_n', { codigo: s.codiEstdo });
          }
        }
      }
      acc[nombreEstado] = (acc[nombreEstado] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([estado, cantidad]) => ({ estado, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente

  // GrÃ¡fico de barras â†’ Siniestros por aseguradora
  const siniestrosPorAseguradora = Object.entries(
    siniestrosFiltrados.reduce((acc, s) => {
      const nombreAseguradora = getNombreAseguradora(s.codiAsgrdra) || t('complex.ui.dashboard_complex.sin_especificar');
      acc[nombreAseguradora] = (acc[nombreAseguradora] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([aseguradora, cantidad]) => ({ aseguradora, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Debug: verificar datos
// GrÃ¡fico de barras â†’ Siniestros por ajustador/responsable
  // MÃ‰TODO: Usar la funciÃ³n getNombreResponsable definida arriba (igual que el reporte)
  
  // PASO 1: Contar siniestros por responsable usando getNombreResponsable
  const conteoPorNombreResponsable = {};
  siniestrosFiltrados.forEach(s => {
    const nombreResp = getNombreResponsable(s);
    const nombreNormalizado = String(nombreResp).trim();
    conteoPorNombreResponsable[nombreNormalizado] = (conteoPorNombreResponsable[nombreNormalizado] || 0) + 1;
  });

// PASO 2: Crear lista de responsables con sus conteos (usando los nombres encontrados)
  const siniestrosPorResponsable = Object.entries(conteoPorNombreResponsable)
    .map(([nombre, cantidad]) => ({
      responsable:
        nombre === 'Sin asignar' ? t('complex.ui.dashboard_complex.sin_asignar') : nombre,
      cantidad,
      codigo: null // No necesitamos el código para el gráfico
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

// ========== MÃ‰TRICAS DE TRAZABILIDAD ==========
  
  // Tiempos lÃ­mite segÃºn las reglas de trazabilidad
  const tiemposLimiteTrazabilidad = {
    contactoInicial: 0.5,  // 12 horas
    inspeccion: 1,         // 24 horas
    solicitudDocs: 1,      // 24 horas despuÃ©s de inspecciÃ³n
    informePreliminar: 1,  // 24 horas despuÃ©s de inspecciÃ³n
    ultimoDocumento: 3,    // 3 dÃ­as
    informeFinal: 3,       // 3 dÃ­as
    presentacionCifras: 1, // 24 horas
    envioFiniquito: 1      // 24 horas
  };

  // Etapas cuyo plazo del protocolo es en dÃ­as hÃ¡biles (excluye fines de semana y festivos de Colombia)
  const etapasEnDiasHabiles = new Set(['informePreliminar', 'ultimoDocumento', 'informeFinal']);

  // FunciÃ³n auxiliar para parsear fechas
  const parsearFecha = (fechaStr) => {
    if (!fechaStr) return null;
    if (typeof fechaStr === 'string' && fechaStr.includes('T')) {
      const [fechaPart] = fechaStr.split('T');
      const [year, month, day] = fechaPart.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
      const [year, month, day] = fechaStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return null;
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  };

  // Fechas fuera de rango plausible (p. ej. 1902 por serial Excel) no deben
  // entrar a las mÃ©tricas: distorsionan promedios con miles de dÃ­as de "retraso".
  const esFechaPlausible = (fecha) => {
    if (!fecha) return false;
    const anio = fecha.getFullYear();
    const maxima = new Date();
    maxima.setFullYear(maxima.getFullYear() + 1);
    return anio >= 2015 && fecha <= maxima;
  };

  // FunciÃ³n para calcular si una etapa estÃ¡ retrasada
  const calcularRetrasoEtapa = (caso, tipoEtapa) => {
    const fechaReferencia = tipoEtapa === 'contactoInicial' || tipoEtapa === 'inspeccion'
      ? (tipoEtapa === 'inspeccion' && caso.fchaProgInspeccion 
          ? parsearFecha(caso.fchaProgInspeccion) 
          : parsearFecha(caso.fchaAsgncion))
      : tipoEtapa === 'solicitudDocs' || tipoEtapa === 'informePreliminar'
        ? parsearFecha(caso.fchaInspccion)
        : tipoEtapa === 'ultimoDocumento'
          ? parsearFecha(caso.fchaInfoPrelm)
          : tipoEtapa === 'informeFinal'
            ? parsearFecha(caso.fchaRepoActi)
            : parsearFecha(caso.fchaRepoActi);

    if (!fechaReferencia) return null;

    const fechaEtapa = tipoEtapa === 'contactoInicial' ? parsearFecha(caso.fchaContIni)
      : tipoEtapa === 'inspeccion' ? parsearFecha(caso.fchaInspccion)
      : tipoEtapa === 'solicitudDocs' ? parsearFecha(caso.fchaSoliDocu)
      : tipoEtapa === 'informePreliminar' ? parsearFecha(caso.fchaInfoPrelm)
      : tipoEtapa === 'ultimoDocumento' ? parsearFecha(caso.fchaRepoActi)
      : tipoEtapa === 'informeFinal' ? parsearFecha(caso.fchaInfoFnal)
      : tipoEtapa === 'presentacionCifras' ? parsearFecha(caso.fchaPresentacionCifras)
      : tipoEtapa === 'envioFiniquito' ? parsearFecha(caso.fchaEnvioFiniquito)
      : null;

    if (!fechaEtapa) return null;
    if (!esFechaPlausible(fechaReferencia) || !esFechaPlausible(fechaEtapa)) return null;

    const diferenciaTiempo = fechaEtapa.getTime() - fechaReferencia.getTime();
    const diferenciaHoras = diferenciaTiempo / (1000 * 3600);
    const diasCalendario = diferenciaHoras / 24;
    // Plazos en dÃ­as hÃ¡biles: descontar sÃ¡bados, domingos y festivos de Colombia.
    const diferenciaDias =
      etapasEnDiasHabiles.has(tipoEtapa) && diasCalendario >= 0
        ? diasHabilesColombiaEntre(fechaReferencia, fechaEtapa)
        : diasCalendario;

    const tiempoLimite = tiemposLimiteTrazabilidad[tipoEtapa] || 1;
    const diasRetraso = diferenciaDias > tiempoLimite ? diferenciaDias - tiempoLimite : 0;

    return {
      diasRetraso,
      cumplido: diasRetraso === 0,
      diasTranscurridos: diferenciaDias
    };
  };

  // Calcular casos retrasados por etapa
  const casosRetrasadosPorEtapa = {
    contactoInicial: siniestrosFiltrados.filter(c => {
      const retraso = calcularRetrasoEtapa(c, 'contactoInicial');
      return retraso && retraso.diasRetraso > 0 && c.fchaContIni;
    }).length,
    inspeccion: siniestrosFiltrados.filter(c => {
      const retraso = calcularRetrasoEtapa(c, 'inspeccion');
      return retraso && retraso.diasRetraso > 0 && c.fchaInspccion;
    }).length,
    solicitudDocs: siniestrosFiltrados.filter(c => {
      const retraso = calcularRetrasoEtapa(c, 'solicitudDocs');
      return retraso && retraso.diasRetraso > 0 && c.fchaSoliDocu;
    }).length,
    informePreliminar: siniestrosFiltrados.filter(c => {
      const retraso = calcularRetrasoEtapa(c, 'informePreliminar');
      return retraso && retraso.diasRetraso > 0 && c.fchaInfoPrelm;
    }).length,
    informeFinal: siniestrosFiltrados.filter(c => {
      const retraso = calcularRetrasoEtapa(c, 'informeFinal');
      return retraso && retraso.diasRetraso > 0 && c.fchaInfoFnal;
    }).length
  };

  // Calcular cumplimiento por responsable
  const cumplimientoPorResponsable = {};
  
  siniestrosFiltrados.forEach(caso => {
    const nombreResp = getNombreResponsable(caso);
    if (!cumplimientoPorResponsable[nombreResp]) {
      cumplimientoPorResponsable[nombreResp] = {
        totalCasos: 0,
        casosCumplidos: 0,
        casosRetrasados: 0,
        retrasosPorEtapa: {
          contactoInicial: 0,
          inspeccion: 0,
          solicitudDocs: 0,
          informePreliminar: 0,
          informeFinal: 0
        },
        promedioDiasRetraso: 0,
        totalDiasRetraso: 0
      };
    }

    const responsable = cumplimientoPorResponsable[nombreResp];
    responsable.totalCasos++;

    // Evaluar cada etapa
    const etapas = ['contactoInicial', 'inspeccion', 'solicitudDocs', 'informePreliminar', 'informeFinal'];
    let tieneAlMenosUnaEtapa = false;
    let todasCumplidas = true;
    let etapasEvaluadas = 0;

    etapas.forEach(etapa => {
      const retraso = calcularRetrasoEtapa(caso, etapa);
      if (retraso) {
        tieneAlMenosUnaEtapa = true;
        etapasEvaluadas++;
        if (retraso.diasRetraso > 0) {
          todasCumplidas = false;
          responsable.casosRetrasados++;
          responsable.retrasosPorEtapa[etapa]++;
          responsable.totalDiasRetraso += retraso.diasRetraso;
        } else {
          // Solo contar como cumplido si no tiene retraso
          // No incrementamos aquÃ­, se cuenta al final si todasCumplidas
        }
      }
    });

    if (tieneAlMenosUnaEtapa) {
      if (todasCumplidas && etapasEvaluadas > 0) {
        responsable.casosCumplidos++;
      }
      if (etapasEvaluadas > 0) {
        responsable.promedioDiasRetraso = responsable.totalDiasRetraso / responsable.casosRetrasados || 0;
      }
    }
  });

  // Convertir a array y calcular porcentajes
  const cumplimientoPorResponsableArray = Object.entries(cumplimientoPorResponsable)
    .map(([nombre, datos]) => ({
      nombre:
        nombre === 'Sin asignar' ? t('complex.ui.dashboard_complex.sin_asignar') : nombre,
      totalCasos: datos.totalCasos,
      casosCumplidos: datos.casosCumplidos,
      casosRetrasados: datos.casosRetrasados,
      porcentajeCumplimiento: datos.totalCasos > 0 
        ? ((datos.casosCumplidos / datos.totalCasos) * 100).toFixed(1)
        : 0,
      promedioDiasRetraso: datos.casosRetrasados > 0 
        ? (datos.totalDiasRetraso / datos.casosRetrasados).toFixed(1)
        : 0,
      retrasosPorEtapa: datos.retrasosPorEtapa
    }))
    .sort((a, b) => parseFloat(b.porcentajeCumplimiento) - parseFloat(a.porcentajeCumplimiento));

  // Datos para grÃ¡ficas de retrasos por etapa
  const retrasosPorEtapaData = [
    { etapa: t('complex.ui.dashboard_complex.etapa_contacto_inicial'), retrasados: casosRetrasadosPorEtapa.contactoInicial, limite: t('complex.ui.dashboard_complex.limite_12_horas') },
    { etapa: t('complex.ui.dashboard_complex.etapa_inspeccion'), retrasados: casosRetrasadosPorEtapa.inspeccion, limite: t('complex.ui.dashboard_complex.limite_1_dia_habil') },
    { etapa: t('complex.ui.dashboard_complex.etapa_solicitud_docs'), retrasados: casosRetrasadosPorEtapa.solicitudDocs, limite: t('complex.ui.dashboard_complex.limite_24_horas') },
    { etapa: t('complex.ui.dashboard_complex.etapa_informe_preliminar'), retrasados: casosRetrasadosPorEtapa.informePreliminar, limite: t('complex.ui.dashboard_complex.limite_24_horas') },
    { etapa: t('complex.ui.dashboard_complex.etapa_informe_final'), retrasados: casosRetrasadosPorEtapa.informeFinal, limite: t('complex.ui.dashboard_complex.limite_3_dias') }
  ];

  // Top responsables con mejor/menor cumplimiento
  // Mostrar TODOS los responsables, no solo los que tienen >= 3 casos
  // Ordenar por total de casos (descendente) para ver los mÃ¡s importantes primero
  const topResponsablesCumplimiento = cumplimientoPorResponsableArray
    .sort((a, b) => b.totalCasos - a.totalCasos) // Ordenar por total de casos
    .slice(0, 20); // Mostrar hasta 20 responsables

  // Listas Ãºnicas para los filtros (igual que el reporte)
  // Ordenar alfabÃ©ticamente por nombre de estado
  const estadosUnicos = estados
    .map(e => ({
      value: String(e.codiEstdo),
      label: traducirNombreEstadoCatalogo(e.descEstdo || String(e.codiEstdo), t)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Ordenar alfabÃ©ticamente por razÃ³n social
  const aseguradorasUnicas = aseguradoras
    .map(a => ({
      value: String(a.codiAsgrdra || a.cod1Asgrdra),
      label: a.rzonSocial || String(a.codiAsgrdra || a.cod1Asgrdra)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  
  // Crear lista de responsables Ãºnicos para el filtro (igual que el reporte)
  // Usar los nombres que realmente aparecen en los casos
  const responsablesUnicosSet = new Set();
  siniestros.forEach(s => {
    const nombreResp = getNombreResponsable(s);
    if (nombreResp && nombreResp.trim() !== '') {
      responsablesUnicosSet.add(nombreResp.trim());
    }
  });

  const responsablesUnicos = Array.from(responsablesUnicosSet)
    .map(nombre => ({ 
      value: nombre, 
      label: nombre === 'Sin asignar' ? t('complex.ui.dashboard_complex.sin_asignar') : nombre 
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const filtrosAplicados = Boolean(
    fechaDesde || fechaHasta || estadoFiltro || aseguradoraFiltro || responsableFiltro
  );

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setEstadoFiltro('');
    setAseguradoraFiltro('');
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
  const lineColors = getFenixLineChartColors(isDark);

  const tarjetasEstadosVisibles = [...tarjetasEstados]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, METRIC_TOP_ESTADOS);

  const estadoChartData = siniestrosPorEstado.slice(0, CHART_TOP_ESTADOS);
  const aseguradoraChartData = siniestrosPorAseguradora.slice(0, CHART_TOP_ASEGURADORAS);
  const responsableChartData = siniestrosPorResponsable.slice(0, CHART_TOP_RESPONSABLES);
  /** Misma base que la tabla: todos los responsables listados con % > 0 (no solo los de más volumen) */
  const cumplimientoChartData = topResponsablesCumplimiento
    .map((r) => ({
      ...r,
      porcentajeNum: parseFloat(String(r.porcentajeCumplimiento)) || 0,
    }))
    .filter((r) => r.totalCasos > 0 && r.porcentajeNum > 0)
    .sort((a, b) => b.porcentajeNum - a.porcentajeNum);

  const dominioCumplimiento = dominioPorcentajeAcotado(
    cumplimientoChartData.map((r) => r.porcentajeNum)
  );

  const truncarEtiqueta = (texto, max = 32) => {
    if (!texto) return '';
    const s = String(texto);
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
  };

  return (
    <div className={complexDashboardRoot}>
      <div className={`${complexScope} ${complexDashboardWrap}`}>
        <ComplexPageHeader
          title={t("complex.ui.dashboard_complex.dashboard_complex")}
          subtitle={t("complex.ui.dashboard_complex.analisis_de_siniestros_distribucion_y_cumplimiento_de_tr")}
          activePath="/complex/dashboard"
        />

        <ComplexFilterSection
          title={t("complex.ui.dashboard_complex.filtros_de_busqueda")}
          showClear={filtrosAplicados}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t("complex.ui.dashboard_complex.fecha_desde")}>
              <InputFenix
                type="date"
                lang={dateLang}
                title={datePlaceholder}
                placeholder={datePlaceholder}
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </Campo>
            <Campo label={t("complex.ui.dashboard_complex.fecha_hasta")}>
              <InputFenix
                type="date"
                lang={dateLang}
                title={datePlaceholder}
                placeholder={datePlaceholder}
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </Campo>
            <Campo label={t("complex.ui.dashboard_complex.estado")}>
              <SelectFenix value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                <option value="">{t("complex.ui.dashboard_complex.todos")}</option>
                {estadosUnicos.map((e, index) => (
                  <option key={`estado-${e.value}-${index}`} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t("complex.ui.dashboard_complex.aseguradora")}>
              <SelectFenix value={aseguradoraFiltro} onChange={(e) => setAseguradoraFiltro(e.target.value)}>
                <option value="">{t("complex.ui.dashboard_complex.todas")}</option>
                {aseguradorasUnicas.map((a, index) => (
                  <option key={`aseguradora-${a.value}-${index}`} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t("complex.ui.dashboard_complex.responsable")}>
              <SelectFenix value={responsableFiltro} onChange={(e) => setResponsableFiltro(e.target.value)}>
                <option value="">{t("complex.ui.dashboard_complex.todos")}</option>
                {responsablesUnicos.map((r, index) => (
                  <option key={`responsable-${r.value}-${index}`} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          </div>
          {filtrosAplicados && (
            <div className={complexFilterPanel}>
              <p className="font-body text-xs font-semibold text-gray-700 dark:text-gray-200">{t("complex.ui.dashboard_complex.filtros_activos")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {fechaDesde && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">{t("complex.ui.dashboard_complex.desde")}{fechaDesde}
                  </span>
                )}
                {fechaHasta && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">{t("complex.ui.dashboard_complex.hasta")}{fechaHasta}
                  </span>
                )}
                {estadoFiltro && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">{t("complex.ui.dashboard_complex.estado_2")}{estadosUnicos.find((e) => e.value === estadoFiltro)?.label || estadoFiltro}
                  </span>
                )}
                {aseguradoraFiltro && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">{t("complex.ui.dashboard_complex.aseguradora_2")}{aseguradorasUnicas.find((a) => a.value === aseguradoraFiltro)?.label || aseguradoraFiltro}
                  </span>
                )}
                {responsableFiltro && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:ring-gray-700">{t("complex.ui.dashboard_complex.responsable_2")}{responsableFiltro}
                  </span>
                )}
              </div>
              <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">{t("complex.ui.dashboard_complex.mostrando")}{totalSiniestros}{t("complex.ui.dashboard_complex.de")}{siniestros.length}{t("complex.ui.dashboard_complex.siniestros")}</p>
            </div>
          )}
        </ComplexFilterSection>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <ComplexMetricCard
            label={t("complex.ui.dashboard_complex.total_siniestros")}
            value={totalSiniestros}
            hint={t("complex.ui.dashboard_complex.con_filtros_aplicados")}
          />
          {tarjetasEstadosVisibles.map((estado) => (
            <ComplexMetricCard key={estado.codigo} label={estado.nombre} value={estado.cantidad} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4">
          <ComplexChartCard title={t("complex.ui.dashboard_complex.evolucion_temporal_de_siniestros")} empty={evolucionTemporal.length === 0}>
            <ComplexChartPlot height={CHART_HEIGHT_TALL}>
              <AreaChart data={evolucionTemporal} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="mes" tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} allowDecimals={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="cantidad"
                  name={t('complex.ui.dashboard_complex.casos')}
                  stroke={lineColors.casos}
                  fill={lineColors.casos}
                  fillOpacity={0.2}
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ComplexChartPlot>
          </ComplexChartCard>
        </section>

        <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <ComplexChartCard
            title={t("complex.ui.dashboard_complex.siniestros_por_estado")}
            empty={estadoChartData.length === 0}
            subtitle={
              siniestrosPorEstado.length > CHART_TOP_ESTADOS
                ? t('complex.ui.dashboard_complex.top_n_de_m', {
                    n: CHART_TOP_ESTADOS,
                    m: siniestrosPorEstado.length,
                  })
                : undefined
            }
          >
            <ComplexChartPlot height={alturaGraficoBarrasVerticales(estadoChartData.length)}>
              <BarChart data={estadoChartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="estado"
                  width={150}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncarEtiqueta(v, 28)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name={t('complex.ui.dashboard_complex.casos')} radius={[0, 4, 4, 0]}>
                  {estadoChartData.map((entry, index) => (
                    <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ComplexChartPlot>
          </ComplexChartCard>

          <ComplexChartCard title={t("complex.ui.dashboard_complex.distribucion_por_ciudad")} empty={siniestrosPorCiudad.length === 0} subtitle={t("complex.ui.dashboard_complex.top_10")}>
            <ComplexChartPlot height={alturaGraficoBarrasVerticales(siniestrosPorCiudad.length)}>
              <BarChart data={siniestrosPorCiudad} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="ciudad"
                  width={150}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(value) => {
                    if (!value) return t('complex.ui.dashboard_complex.sin_ciudad');
                    let nombre = value.includes(', COLOMBIA') ? value.replace(', COLOMBIA', '') : value;
                    const partesUnicas = [...new Set(nombre.split(', '))];
                    nombre = partesUnicas.join(', ');
                    return truncarEtiqueta(nombre, 28);
                  }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name={t('complex.ui.dashboard_complex.casos')} radius={[0, 4, 4, 0]}>
                  {siniestrosPorCiudad.map((entry, index) => (
                    <Cell key={entry.ciudad} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ComplexChartPlot>
          </ComplexChartCard>
        </section>

        <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <ComplexChartCard
            title={t("complex.ui.dashboard_complex.siniestros_por_aseguradora")}
            empty={aseguradoraChartData.length === 0}
            subtitle={
              siniestrosPorAseguradora.length > CHART_TOP_ASEGURADORAS
                ? t('complex.ui.dashboard_complex.top_n_de_total', {
                    n: CHART_TOP_ASEGURADORAS,
                    m: siniestrosPorAseguradora.length,
                  })
                : undefined
            }
          >
            <ComplexChartPlot height={alturaGraficoBarrasVerticales(aseguradoraChartData.length)}>
              <BarChart data={aseguradoraChartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="aseguradora"
                  width={150}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncarEtiqueta(v, 30)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name={t('complex.ui.dashboard_complex.casos')} radius={[0, 4, 4, 0]}>
                  {aseguradoraChartData.map((entry, index) => (
                    <Cell key={entry.aseguradora} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ComplexChartPlot>
          </ComplexChartCard>

          <ComplexChartCard
            title={t("complex.ui.dashboard_complex.siniestros_por_responsable")}
            empty={responsableChartData.length === 0}
            subtitle={
              siniestrosPorResponsable.length > CHART_TOP_RESPONSABLES
                ? t('complex.ui.dashboard_complex.top_n_de_total', {
                    n: CHART_TOP_RESPONSABLES,
                    m: siniestrosPorResponsable.length,
                  })
                : undefined
            }
          >
            <ComplexChartPlot height={alturaGraficoBarrasVerticales(responsableChartData.length)}>
              <BarChart data={responsableChartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="responsable"
                  width={150}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncarEtiqueta(v, 28)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name={t('complex.ui.dashboard_complex.casos')} radius={[0, 4, 4, 0]}>
                  {responsableChartData.map((entry, index) => (
                    <Cell key={entry.responsable} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ComplexChartPlot>
          </ComplexChartCard>
        </section>

        <h2 className={complexSectionTitle}>{t("complex.ui.dashboard_complex.metricas_de_trazabilidad")}</h2>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {retrasosPorEtapaData.map((item) => (
            <ComplexMetricCard
              key={item.etapa}
              label={item.etapa}
              value={item.retrasados}
              hint={t('complex.ui.dashboard_complex.limite', { limite: item.limite })}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4">
          <ComplexChartCard
            title={t("complex.ui.dashboard_complex.casos_retrasados_por_etapa")}
            empty={retrasosPorEtapaData.every((d) => !d.retrasados)}
          >
            <ComplexChartPlot height={CHART_HEIGHT_STANDARD}>
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
                <Bar dataKey="retrasados" name={t('complex.ui.dashboard_complex.retrasados')} radius={[4, 4, 0, 0]}>
                  {retrasosPorEtapaData.map((entry, index) => (
                    <Cell key={entry.etapa} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ComplexChartPlot>
          </ComplexChartCard>
        </section>

        <ComplexChartCard
          title={t("complex.ui.dashboard_complex.cumplimiento_de_trazabilidad_por_responsable")}
          empty={topResponsablesCumplimiento.length === 0}
        >
          <div className={complexTableWrap}>
            <div className="overflow-x-auto">
              <table className={complexTableSimple}>
                <thead className={complexTableHead}>
                  <tr>
                    <th className="px-4 py-3 text-left">{t("complex.ui.dashboard_complex.responsable")}</th>
                    <th className="px-4 py-3 text-center">{t("complex.ui.dashboard_complex.total")}</th>
                    <th className="px-4 py-3 text-center">{t("complex.ui.dashboard_complex.cumplidos")}</th>
                    <th className="px-4 py-3 text-center">{t("complex.ui.dashboard_complex.retrasados")}</th>
                    <th className="px-4 py-3 text-center">{t("complex.ui.dashboard_complex.cumpl")}</th>
                    <th className="px-4 py-3 text-center">{t("complex.ui.dashboard_complex.prom_dias_retraso")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {topResponsablesCumplimiento.map((resp) => (
                    <tr key={resp.nombre} className="even:bg-gray-50/50 dark:even:bg-gray-900/30">
                      <td className="px-4 py-2 font-medium">{resp.nombre}</td>
                      <td className="px-4 py-2 text-center">{resp.totalCasos}</td>
                      <td className="px-4 py-2 text-center">{resp.casosCumplidos}</td>
                      <td className="px-4 py-2 text-center">{resp.casosRetrasados}</td>
                      <td className="px-4 py-2 text-center font-semibold">{resp.porcentajeCumplimiento}{t("complex.ui.dashboard_complex.texto")}</td>
                      <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                        {resp.promedioDiasRetraso === '0' ? '—' : `${resp.promedioDiasRetraso} ${t('complex.ui.dashboard_complex.dias')}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {cumplimientoChartData.length > 0 ? (
            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
              <p className="mb-1 font-body text-sm font-semibold text-gray-700 dark:text-gray-200">{t("complex.ui.dashboard_complex.cumplimiento_por_responsable")}</p>
              <p className="mb-4 font-body text-xs text-gray-500 dark:text-gray-400">{t("complex.ui.dashboard_complex.mismos_responsables_que_la_tabla_con_cumplimiento_mayor_")}{cumplimientoChartData.length}{' '}{t("complex.ui.dashboard_complex.filas_escala_hasta")}{dominioCumplimiento[1]}{t("complex.ui.dashboard_complex.texto_2")}</p>
              <ComplexChartPlot
                height={alturaGraficoBarrasVerticales(
                  cumplimientoChartData.length,
                  CHART_HEIGHT_BAR_LIST_MAX
                )}
              >
                <BarChart
                  data={cumplimientoChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={dominioCumplimiento}
                    tick={{ fill: tickColor, fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={168}
                    tick={{ fill: tickColor, fontSize: 11 }}
                    tickFormatter={(v) => truncarEtiqueta(v, 32)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}%`,
                      t('complex.ui.dashboard_complex.cumplimiento'),
                    ]}
                  />
                  <Bar
                    dataKey="porcentajeNum"
                    name={t('complex.ui.dashboard_complex.cumplimiento')}
                    radius={[0, 4, 4, 0]}
                    barSize={22}
                    fill={getFenixNeutralBarColor(0, isDark)}
                  >
                    <LabelList
                      dataKey="porcentajeNum"
                      position="right"
                      formatter={(v) => `${Number(v).toFixed(1)}%`}
                      className="font-body text-xs"
                      fill={tickColor}
                    />
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </div>
          ) : (
            <p className="mt-6 border-t border-gray-100 pt-6 font-body text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">{t("complex.ui.dashboard_complex.no_hay_porcentajes_de_cumplimiento_mayores_a_0_para_graf")}</p>
          )}
        </ComplexChartCard>
      </div>
    </div>
  );
};

export default DashboardComplex;
