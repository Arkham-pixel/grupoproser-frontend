import React, { useEffect, useState, useMemo } from 'react';
import { obtenerCasosRiesgo, deleteCasoRiesgo, obtenerResponsables, obtenerEstados, obtenerAseguradoras, obtenerCiudades } from '../../services/riesgoService'; // Ajusta la ruta si es necesario
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import AgregarCasoRiesgo from '../SubcomponentesRiesgo/AgregarCasoRiesgo';
// Nota: para exportar fechas como tipo fecha en Excel (no texto),
// convertimos a Date y usamos `cellDates: true` en `json_to_sheet`.
import { useTheme } from '../../context/ThemeContext';
import { convertirFechaParaExcelDate } from '../../utils/fechaUtils';
import { BASE_URL } from '../../config/apiConfig.js';
import Select from 'react-select';

const getCiudadNombre = (codigo, ciudades) => {
  if (!ciudades || !codigo) return codigo || '';
  
  // Convertir codigo a string para comparación
  const codigoStr = String(codigo).trim();
  if (!codigoStr) return '';
  
  // Buscar por múltiples campos posibles (comparación exacta por código)
  let ciudad = ciudades.find(c => {
    // Comparar como strings para evitar problemas de tipo
    const value = c.value ? String(c.value).trim() : '';
    const codiMunicipio = c.codiMunicipio ? String(c.codiMunicipio).trim() : '';
    const cod1Mun1c1p1o = c.cod1Mun1c1p1o ? String(c.cod1Mun1c1p1o).trim() : '';
    const cod1Cpoblado = c.cod1Cpoblado ? String(c.cod1Cpoblado).trim() : '';
    const codiPoblado = c.codiPoblado ? String(c.codiPoblado).trim() : '';
    
    return value === codigoStr || 
           codiMunicipio === codigoStr ||
           cod1Mun1c1p1o === codigoStr ||
           cod1Cpoblado === codigoStr ||
           codiPoblado === codigoStr;
  });
  
  // Si no se encuentra por código, intentar buscar por nombre SOLO si parece ser un nombre (no un código numérico)
  // Esto evita falsos positivos cuando hay códigos que no se encuentran
  if (!ciudad && codigoStr && !/^\d+$/.test(codigoStr)) {
    // Solo buscar por nombre si NO es un código numérico puro
    const codigoNormalizado = codigoStr.toUpperCase().trim();
    ciudad = ciudades.find(c => {
      const descMunicipio = c.descMunicipio ? String(c.descMunicipio).toUpperCase().trim() : '';
      const descPoblado = c.descPoblado ? String(c.descPoblado).toUpperCase().trim() : '';
      const label = c.label ? String(c.label).toUpperCase().trim() : '';
      const descDepto = c.descDepto ? String(c.descDepto).toUpperCase().trim() : '';
      
      // Construir el label completo para comparación
      const labelCompleto = descMunicipio && descDepto ? `${descMunicipio} - ${descDepto}` : descMunicipio;
      
      // Solo coincidencia exacta por nombre (evitar includes que puede dar falsos positivos)
      return descMunicipio === codigoNormalizado || 
             label === codigoNormalizado ||
             labelCompleto === codigoNormalizado;
    });
  }
  
  if (ciudad) {
    // Priorizar label, luego descMunicipio, luego otros campos
    return ciudad.label || 
           (ciudad.descMunicipio && ciudad.descDepto ? `${ciudad.descMunicipio} - ${ciudad.descDepto}` : null) ||
           ciudad.descMunicipio || 
           ciudad.descMun1c1p1o || 
           ciudad.descCpoblado || 
           ciudad.descPoblado ||
           codigo;
  }
  
  // Si no se encuentra, retornar el código como fallback (mejor que vacío)
  return codigoStr;
};

const getEstadoNombre = (codigo, estados) => {
  if (!codigo && codigo !== 0) return '';
  if (!estados || estados.length === 0) return String(codigo);
  
  // Buscar el estado por código
  const estado = estados.find(e => {
    const codigoEstado = e.codiEstdo !== undefined && e.codiEstdo !== null ? String(e.codiEstdo) : '';
    const codigoBuscado = String(codigo);
    return codigoEstado === codigoBuscado;
  });
  
  if (estado && estado.descEstdo) {
    return estado.descEstdo;
  }
  
  // Si no se encuentra, retornar el código como fallback
  return String(codigo);
};

const getResponsableNombre = (codigo, responsables) => {
  if (!responsables) return codigo;
  const responsable = responsables.find(r => String(r.codiRespnsble) === String(codigo));
  return responsable ? responsable.nmbrRespnsble : codigo;
};

const getAseguradoraNombre = (codigo, aseguradoras) => {
  if (!aseguradoras) return codigo;
  // Buscar por ambos campos posibles
  const aseguradora = aseguradoras.find(a => 
    String(a.cod1Asgrdra) === String(codigo) || 
    String(a.codiAsgrdra) === String(codigo)
  );
  return aseguradora ? aseguradora.rzonSocial : codigo;
};

// Función para obtener nombre de funcionario por ID
// funcSolicita puede ser un ID de funcionario o un nombre
const getFuncionarioNombre = (codigo, funcionarios) => {
  if (!funcionarios || !codigo) return codigo || '';
  // Buscar por ID (value) o por nombre (label)
  const funcionario = funcionarios.find(f => 
    String(f.value) === String(codigo) || 
    String(f.id) === String(codigo) ||
    String(f.label) === String(codigo) ||
    String(f.nmbrContcto) === String(codigo)
  );
  return funcionario ? (funcionario.label || funcionario.nmbrContcto || funcionario.nombre || codigo) : codigo;
};

// Función para obtener nombre de responsable por código (para codiRespnsble)
const getResponsableNombrePorCodigo = (codigo, responsables) => {
  if (!responsables || !codigo) return codigo || '';
  const responsable = responsables.find(r => 
    String(r.codiRespnsble) === String(codigo)
  );
  return responsable ? responsable.nmbrRespnsble : codigo;
};

// Función para obtener nombre de clasificación por código
// IMPORTANTE: Usar codiIdentificador (con 'i') como en AgregarCasoRiesgo
const getClasificacionNombre = (codigo, clasificaciones) => {
  if (!clasificaciones || clasificaciones.length === 0) {
    return codigo || '';
  }
  
  if (codigo === null || codigo === undefined || codigo === '') {
    return '';
  }
  
  // Normalizar el código
  const codigoStr = String(codigo).trim();
  const codigoNum = parseInt(codigoStr, 10);
  const esNumeroValido = !isNaN(codigoNum) && codigoNum.toString() === codigoStr;
  
  // Buscar en las clasificaciones
  let clasificacion = null;
  
  for (const c of clasificaciones) {
    // IMPORTANTE: Usar codiIdentificador (con 'i') como en AgregarCasoRiesgo
    if (c.codiIdentificador !== undefined && c.codiIdentificador !== null) {
      const idStr = String(c.codiIdentificador).trim();
      const idNum = parseInt(idStr, 10);
      
      // Comparación exacta de strings
      if (idStr === codigoStr) {
        clasificacion = c;
        break;
      }
      
      // Comparación numérica si ambos son números válidos
      if (esNumeroValido && !isNaN(idNum) && idNum === codigoNum) {
        clasificacion = c;
        break;
      }
    }
    
    // También intentar con codIdentificador (sin 'i') por compatibilidad
    if (c.codIdentificador !== undefined && c.codIdentificador !== null) {
      const idStr = String(c.codIdentificador).trim();
      const idNum = parseInt(idStr, 10);
      
      if (idStr === codigoStr) {
        clasificacion = c;
        break;
      }
      
      if (esNumeroValido && !isNaN(idNum) && idNum === codigoNum) {
        clasificacion = c;
        break;
      }
    }
    
    // Intentar comparar con value
    if (c.value !== undefined && c.value !== null) {
      const valueStr = String(c.value).trim();
      const valueNum = parseInt(valueStr, 10);
      
      if (valueStr === codigoStr) {
        clasificacion = c;
        break;
      }
      
      if (esNumeroValido && !isNaN(valueNum) && valueNum === codigoNum) {
        clasificacion = c;
        break;
      }
    }
  }
  
  if (clasificacion) {
    return clasificacion.rzonDescripcion || clasificacion.label || clasificacion.descripcion || codigoStr;
  }
  
  return codigoStr;
};

const getCiudadSucursalAseguradora = (codigoAseguradora, aseguradoras, ciudades) => {
  if (!aseguradoras || !codigoAseguradora) return '';
  
  // Buscar la aseguradora
  const aseguradora = aseguradoras.find(a => 
    String(a.cod1Asgrdra) === String(codigoAseguradora) || 
    String(a.codiAsgrdra) === String(codigoAseguradora)
  );
  
  if (!aseguradora) return '';
  
  // Obtener el código de ciudad de la aseguradora (puede ser codiMpio o codiPoblado)
  const codigoCiudad = aseguradora.codiMpio || aseguradora.codiPoblado || '';
  
  if (!codigoCiudad) return '';
  
  // Si no hay ciudades cargadas, retornar el código
  if (!ciudades || ciudades.length === 0) {
    return String(codigoCiudad);
  }
  
  // Buscar la ciudad usando la función getCiudadNombre
  const nombreCiudad = getCiudadNombre(codigoCiudad, ciudades);
  
  // Si no se encuentra, retornar el código como fallback (mejor que vacío)
  return nombreCiudad || String(codigoCiudad);
};

const normalizarTextoBusqueda = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const obtenerValorBusquedaCaso = (caso, campo) => {
  const aliasesPorCampo = {
    nmroRiesgo: ['nmroRiesgo', 'numero_siniestro', 'nmroSinstro', 'numeroSiniestro', 'id_riesgo'],
    asgrBenfcro: ['asgrBenfcro', 'asegurado'],
    codiAsgrdra: ['codiAsgrdra', 'aseguradora'],
    codiIspector: ['codiIspector', 'responsable', 'codiRespnsble'],
    codigoPoblado: ['codigoPoblado', 'ciudadSucursal', 'ciudadSiniestro', 'descripcionCiudad', 'nombreCiudad'],
    codiEstdo: ['codiEstdo', 'estado', 'descripcionEstado'],
  };

  const camposAProbar = aliasesPorCampo[campo] || [campo];
  const valorEncontrado = camposAProbar
    .map((key) => caso?.[key])
    .find((valor) => valor !== undefined && valor !== null && String(valor).trim() !== '');

  return valorEncontrado ?? '';
};

// Lista completa de columnas posibles (puedes agregar más si tu base tiene más campos)
const todasLasColumnas = [
  { clave: 'nmroRiesgo', label: 'N° Riesgo' },
  { clave: 'asgrBenfcro', label: 'Asegurado' },
  { clave: 'codiAsgrdra', label: 'Cód. Aseguradora' },
  { clave: 'codigoPoblado', label: 'Ciudad' },
  { clave: 'ciudadSucursalAseguradora', label: 'Ciudad Sucursal Aseguradora', esCalculada: true },
  { clave: 'nmroConsecutivo', label: 'Consecutivo de Aseguradora' },
  { clave: 'codiEstdo', label: 'Estado' },
  { clave: 'fchaAsgncion', label: 'Fecha Asignación' },
  { clave: 'fchaInspccion', label: 'Fecha Inspección' },
  { clave: 'fchaInforme', label: 'Fecha Informe Final' },
  { clave: 'codiIspector', label: 'Inspector' },
  { clave: 'observInspeccion', label: 'Observaciones Inspección' },
  { clave: 'observAsignacion', label: 'Observaciones Asignación' },
  { clave: 'vlorTarifaAseguradora', label: 'Tarifa Aseguradora' },
  { clave: 'vlorHonorarios', label: 'Honorarios' },
  { clave: 'vlorGastos', label: 'Gastos' },
  { clave: 'totalPagado', label: 'Total Pagado' },
  { clave: 'adjuntoAsignacion', label: 'Adjunto Asignación' },
  { clave: 'adjuntoInspeccion', label: 'Adjunto Inspección' },
  { clave: 'anxoInfoFnal', label: 'Adjunto Informe Final' },
  { clave: 'anxoFactra', label: 'Adjunto Factura' },
  { clave: 'fchaFactra', label: 'Fecha Factura' },
  { clave: 'nmroFactra', label: 'Número Factura' },
  { clave: 'funcSolicita', label: 'Quien Solicita' },
  { clave: 'codDireccion', label: 'Dirección' },
  { clave: 'codigoPoblado', label: 'Código Poblado' },
  { clave: 'codiClasificacion', label: 'Clasificación' },
  { clave: 'observInforme', label: 'Observaciones Informe' },
  { clave: 'codiRespnsble', label: 'Código Responsable' },
  { clave: 'codiPais', label: 'Código País' },
  { clave: 'codiDepto', label: 'Código Departamento' },
  { clave: 'codiMpio', label: 'Código Municipio' },
  { clave: 'codiCpoblado', label: 'Código Poblado' },
  { clave: 'descIva', label: 'Descripción IVA' },
  { clave: 'reteIva', label: 'Retención IVA' },
  { clave: 'reteFuente', label: 'Retención Fuente' },
  { clave: 'reteIca', label: 'Retención ICA' }
];

const ReporteRiesgo = ({ ciudades: ciudadesProp, estados: estadosProp }) => {
  const { theme } = useTheme();
  const [casos, setCasos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [estadosLocales, setEstadosLocales] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [campoBusqueda, setCampoBusqueda] = useState('');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [orden, setOrden] = useState({ campo: '', asc: true });
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const tableHeaderBg = theme === 'dark' ? '#1F1F1F' : '#F9FAFB';
  const tableRowBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const tableRowHover = theme === 'dark' ? '#2A2A2A' : '#F9FAFB';

  // Estados de filtros avanzados (ahora con selección múltiple)
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState([]); // Array de objetos {value, label}
  const [responsableFiltro, setResponsableFiltro] = useState([]);
  const [aseguradoraFiltro, setAseguradoraFiltro] = useState([]);
  const [ciudadFiltro, setCiudadFiltro] = useState([]);

  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 10;
  const [modalAbierto, setModalAbierto] = useState(false);
  const [casoParaEditar, setCasoParaEditar] = useState(null);
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState([
    'nmroRiesgo', 'asgrBenfcro', 'codiAsgrdra', 'codigoPoblado', 'ciudadSucursalAseguradora', 'nmroConsecutivo', 'codiEstdo',
    'fchaAsgncion', 'fchaInspccion', 'fchaInforme', 'codiIspector',
    'observInspeccion', 'observAsignacion', 'vlorTarifaAseguradora',
    'vlorHonorarios', 'vlorGastos', 'totalPagado'
  ]);
  const [modalColumnas, setModalColumnas] = useState(false);
  const [columnasOrdenadas, setColumnasOrdenadas] = useState([]);
  const [seleccionTemporal, setSeleccionTemporal] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    obtenerCasos();
  }, []);

  // Debug: verificar estado de clasificaciones
  useEffect(() => {
    console.log('🔍 [DEBUG] Estado de clasificaciones actualizado:', {
      length: clasificaciones.length,
      tieneDatos: clasificaciones.length > 0,
      primeras: clasificaciones.slice(0, 3).map(c => ({
        codIdentificador: c.codIdentificador,
        rzonDescripcion: c.rzonDescripcion
      }))
    });
  }, [clasificaciones]);

  const obtenerCasos = async () => {
    try {
      console.log('🔍 Iniciando carga de casos de riesgo...');
      
      // Cargar datos principales primero
      const data = await obtenerCasosRiesgo();
      console.log('📊 Datos recibidos de obtenerCasosRiesgo:', data);
      console.log('📊 Tipo de datos:', typeof data);
      console.log('📊 Es array:', Array.isArray(data));
      console.log('📊 Longitud:', Array.isArray(data) ? data.length : 'N/A');
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('📋 Primer caso:', data[0]);
        console.log('📋 Campos del primer caso:', Object.keys(data[0]));
      }
      
      // Ordenar del más nuevo al más viejo por fecha de asignación
      const casosOrdenados = Array.isArray(data) ? data.sort((a, b) => {
        const fechaA = new Date(a.fchaAsgncion || a.fecha_asignacion_form || 0);
        const fechaB = new Date(b.fchaAsgncion || b.fecha_asignacion_form || 0);
        return fechaB - fechaA; // Orden descendente (más nuevo primero)
      }) : [];
      
      console.log('📊 Casos ordenados:', casosOrdenados.length);
      setCasos(casosOrdenados);
      
      // Cargar datos adicionales en paralelo, con manejo de errores individual
      try {
        const responsablesData = await obtenerResponsables();
        console.log('👥 Responsables cargados:', responsablesData?.length || 0);
        setResponsables(Array.isArray(responsablesData) ? responsablesData : []);
      } catch (error) {
        console.error('❌ Error al cargar responsables:', error);
        setResponsables([]);
      }
      
      try {
        const estadosData = await obtenerEstados();
        console.log('📊 Estados cargados:', estadosData?.length || 0);
        setEstadosLocales(Array.isArray(estadosData) ? estadosData : []);
      } catch (error) {
        console.error('❌ Error al cargar estados:', error);
        setEstadosLocales([]);
      }
      
      try {
        const aseguradorasData = await obtenerAseguradoras();
        console.log('🏢 Aseguradoras cargadas:', aseguradorasData?.length || 0);
        setAseguradoras(Array.isArray(aseguradorasData) ? aseguradorasData : []);
      } catch (error) {
        console.error('❌ Error al cargar aseguradoras:', error);
        setAseguradoras([]);
      }
      
      try {
        const ciudadesData = await obtenerCiudades();
        console.log('🏙️ Ciudades cargadas:', ciudadesData?.length || 0);
        // Formatear ciudades igual que en AgregarCasoRiesgo para consistencia
        const ciudadesFormateadas = Array.isArray(ciudadesData) 
          ? ciudadesData.map(c => ({
              value: c.codiMunicipio,
              label: c.descMunicipio && c.descDepto ? `${c.descMunicipio} - ${c.descDepto}` : (c.descMunicipio || ''),
              departamento: c.descDepto,
              ...c // Mantener todos los campos originales
            })).filter(ciudad => ciudad.value && ciudad.label)
          : [];
        setCiudades(ciudadesFormateadas);
        console.log('🏙️ Ciudades formateadas:', ciudadesFormateadas.length);
      } catch (error) {
        console.error('❌ Error al cargar ciudades:', error);
        setCiudades([]);
      }
      
      // Cargar funcionarios para convertir funcSolicita
      try {
        const token = localStorage.getItem('token');
        const funcionariosResponse = await fetch(`${BASE_URL}/api/funcionarios-aseguradora`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (funcionariosResponse.ok) {
          const funcionariosData = await funcionariosResponse.json();
          const funcionariosList = Array.isArray(funcionariosData) 
            ? funcionariosData 
            : (funcionariosData?.data || []);
          // Formatear funcionarios para facilitar búsqueda
          const funcionariosFormateados = funcionariosList.map(f => ({
            id: f.id || f._id || f.codiFuncionario,
            value: f.id || f._id || f.codiFuncionario,
            label: f.nmbrContcto || f.nombre || f.label || '',
            nmbrContcto: f.nmbrContcto || f.nombre || '',
            codiAsgrdra: f.codiAsgrdra,
            ...f
          })).filter(f => f.id && f.label);
          setFuncionarios(funcionariosFormateados);
          console.log('👤 Funcionarios cargados:', funcionariosFormateados.length);
        }
      } catch (error) {
        console.error('❌ Error al cargar funcionarios:', error);
        setFuncionarios([]);
      }
      
      // Cargar clasificaciones para convertir codiClasificacion
      try {
        const token = localStorage.getItem('token');
        console.log('🔍 [CLASIFICACIONES] Intentando cargar desde:', `${BASE_URL}/api/estados/clasificaciones-riesgo`);
        const clasificacionesResponse = await fetch(`${BASE_URL}/api/estados/clasificaciones-riesgo`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        console.log('🔍 [CLASIFICACIONES] Response status:', clasificacionesResponse.status, clasificacionesResponse.statusText);
        
        if (!clasificacionesResponse.ok) {
          const errorText = await clasificacionesResponse.text();
          console.error(`❌ [CLASIFICACIONES] Error HTTP: ${clasificacionesResponse.status} ${clasificacionesResponse.statusText}`);
          console.error(`❌ [CLASIFICACIONES] Error body:`, errorText);
          setClasificaciones([]);
        } else {
          const clasificacionesData = await clasificacionesResponse.json();
          console.log('📦 [CLASIFICACIONES] Datos recibidos (tipo):', typeof clasificacionesData);
          console.log('📦 [CLASIFICACIONES] Datos recibidos (es array):', Array.isArray(clasificacionesData));
          console.log('📦 [CLASIFICACIONES] Datos recibidos (longitud):', Array.isArray(clasificacionesData) ? clasificacionesData.length : 'N/A');
          console.log('📦 [CLASIFICACIONES] Primeros datos:', clasificacionesData);
          
          const clasificacionesList = Array.isArray(clasificacionesData) 
            ? clasificacionesData 
            : (clasificacionesData?.data || []);
          
          console.log('📋 [CLASIFICACIONES] Lista procesada:', clasificacionesList.length, 'elementos');
          
          if (clasificacionesList.length === 0) {
            console.warn('⚠️ [CLASIFICACIONES] La lista está vacía después del procesamiento');
          }
          
          // Formatear clasificaciones igual que en AgregarCasoRiesgo
          // IMPORTANTE: Usar codiIdentificador (con 'i') como en AgregarCasoRiesgo
          const clasificacionesFormateadas = clasificacionesList
            .map(c => ({ 
              codiIdentificador: c.codiIdentificador || c.codIdentificador, // Priorizar codiIdentificador
              rzonDescripcion: c.rzonDescripcion || c.descripcion || c.label || '',
              // Mantener ambos por compatibilidad
              codIdentificador: c.codIdentificador || c.codiIdentificador,
              value: c.codiIdentificador || c.codIdentificador,
              label: c.rzonDescripcion || c.descripcion || c.label || '',
              ...c
            }))
            .filter(c => {
              // Filtrar solo las que tienen codiIdentificador válido
              const codId = c.codiIdentificador;
              return codId !== undefined && codId !== null && codId !== '';
            });
          
          console.log('✅ [CLASIFICACIONES] Formateadas y listas para guardar:', clasificacionesFormateadas.length);
          setClasificaciones(clasificacionesFormateadas);
          console.log('✅ [CLASIFICACIONES] Estado actualizado con', clasificacionesFormateadas.length, 'clasificaciones');
          
          if (clasificacionesFormateadas.length > 0) {
            console.log('📋 [CLASIFICACIONES] Primeras clasificaciones:', clasificacionesFormateadas.slice(0, 10).map(c => ({
              codIdentificador: c.codIdentificador,
              tipo: typeof c.codIdentificador,
              rzonDescripcion: c.rzonDescripcion,
              value: c.value
            })));
          } else {
            console.error('❌ [CLASIFICACIONES] No se cargaron clasificaciones válidas después del filtrado.');
            console.log('📦 [CLASIFICACIONES] Datos originales (primeros 5):', clasificacionesList.slice(0, 5));
          }
        }
      } catch (error) {
        console.error('❌ [CLASIFICACIONES] Error al cargar:', error);
        console.error('❌ [CLASIFICACIONES] Mensaje:', error.message);
        console.error('❌ [CLASIFICACIONES] Stack:', error.stack);
        setClasificaciones([]);
      }
      
      console.log('✅ Carga de datos completada');
    } catch (error) {
      console.error('❌ Error al cargar casos:', error);
      setCasos([]);
    }
  };

  const handleEdit = (id) => {
    const caso = casos.find(c => c._id?.toString() === id?.toString() || c.id_riesgo?.toString() === id?.toString() || c.id?.toString() === id?.toString());
    if (caso) {
      setCasoParaEditar(caso);
      setModalAbierto(true);
    }
  };

  const handleCloseModal = () => {
    setModalAbierto(false);
    setCasoParaEditar(null);
    obtenerCasos(); // Recarga la lista tras editar
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este caso?')) {
      try {
        await deleteCasoRiesgo(id);
        alert('Caso eliminado correctamente');
        obtenerCasos();
      } catch (error) {
        console.error('Error al eliminar el caso:', error);
        alert('Error al eliminar el caso');
      }
    }
  };

  // Ajusta los campos visibles según tu modelo de riesgos real
  // Mantener el orden de columnasSeleccionadas
  const camposVisibles = columnasSeleccionadas
    .map(clave => todasLasColumnas.find(col => col.clave === clave))
    .filter(Boolean);

  // Funciones para drag and drop en modal de columnas
  const abrirModalColumnas = () => {
    // Inicializar selección temporal
    setSeleccionTemporal([...columnasSeleccionadas]);
    // Inicializar orden con las columnas seleccionadas en su orden actual
    const columnasVisiblesOrdenadas = columnasSeleccionadas
      .map(clave => todasLasColumnas.find(col => col.clave === clave))
      .filter(Boolean);
    const columnasNoVisibles = todasLasColumnas.filter(col => !columnasSeleccionadas.includes(col.clave));
    setColumnasOrdenadas([...columnasVisiblesOrdenadas, ...columnasNoVisibles]);
    setModalColumnas(true);
  };

  const guardarColumnasPersonalizadas = () => {
    // Obtener el orden de las columnas seleccionadas según columnasOrdenadas
    const nuevasSeleccionadas = columnasOrdenadas
      .filter(col => seleccionTemporal.includes(col.clave))
      .map(col => col.clave);
    setColumnasSeleccionadas(nuevasSeleccionadas);
    setModalColumnas(false);
  };

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

  // Calcular responsables únicos y mapa de códigos ANTES de usarlos en el filtro
  const { responsablesUnicos, codigosPorNombreNormalizado } = useMemo(() => {
    const responsablesMap = new Map();
    const codigosMap = new Map();
    
    casos.forEach(c => {
      if (c.codiIspector) {
        const codigo = c.codiIspector;
        const nombre = getResponsableNombre(codigo, responsables);
        
        // Validar que nombre sea un string válido
        if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
          return; // Saltar este caso
        }
        
        // Normalizar nombre
        const nombreNormalizado = nombre
          .trim()
          .toLowerCase()
          .split(' ')
          .filter(palabra => palabra.length > 0)
          .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
          .join(' ');
        
        if (!nombreNormalizado || nombreNormalizado.trim() === '') {
          return;
        }
        
        // Agregar al mapa de responsables
        if (!responsablesMap.has(nombreNormalizado)) {
          responsablesMap.set(nombreNormalizado, {
            value: nombreNormalizado,
            label: nombreNormalizado,
            nombreNormalizado: nombreNormalizado
          });
        }
        
        // Guardar códigos por nombre normalizado
        if (!codigosMap.has(nombreNormalizado)) {
          codigosMap.set(nombreNormalizado, new Set());
        }
        codigosMap.get(nombreNormalizado).add(String(codigo));
      }
    });
    
    return {
      responsablesUnicos: Array.from(responsablesMap.values()).sort((a, b) => 
        a.label.localeCompare(b.label)
      ),
      codigosPorNombreNormalizado: codigosMap
    };
  }, [casos, responsables]);

  // Filtrado avanzado mejorado
  const casosFiltrados = casos.filter(caso => {
    let ok = true;
    
    // Filtro por búsqueda de texto
    if (terminoBusqueda && campoBusqueda) {
      const valorNormalizado = normalizarTextoBusqueda(obtenerValorBusquedaCaso(caso, campoBusqueda));
      const terminoNormalizado = normalizarTextoBusqueda(terminoBusqueda);
      ok = ok && valorNormalizado.includes(terminoNormalizado);
    }
    
    // Filtro por fechas (usando fchaAsgncion)
    if (fechaDesde) {
      const f = caso.fchaAsgncion ? new Date(caso.fchaAsgncion) : null;
      if (!f || f < new Date(fechaDesde)) ok = false;
    }
    if (fechaHasta) {
      const f = caso.fchaAsgncion ? new Date(caso.fchaAsgncion) : null;
      if (!f || f > new Date(fechaHasta)) ok = false;
    }
    
    // Filtro por estado (múltiple)
    if (estadoFiltro.length > 0) {
      const valoresEstado = estadoFiltro.map(f => String(f.value));
      ok = ok && valoresEstado.includes(String(caso.codiEstdo));
    }
    
    // Filtro por responsable (múltiple) - comparar por nombre normalizado
    if (responsableFiltro.length > 0) {
      const nombresSeleccionados = responsableFiltro.map(f => f.value); // value es el nombre normalizado
      // Obtener todos los códigos que corresponden a los nombres seleccionados
      const codigosValidos = new Set();
      nombresSeleccionados.forEach(nombreNormalizado => {
        if (codigosPorNombreNormalizado && codigosPorNombreNormalizado.has(nombreNormalizado)) {
          const codigos = codigosPorNombreNormalizado.get(nombreNormalizado);
          if (codigos && codigos.size > 0) {
            codigos.forEach(codigo => codigosValidos.add(codigo));
          }
        }
      });
      // Solo filtrar si encontramos códigos válidos
      if (codigosValidos.size > 0) {
        ok = ok && codigosValidos.has(String(caso.codiIspector));
      }
    }
    
    // Filtro por aseguradora (múltiple)
    if (aseguradoraFiltro.length > 0) {
      const valoresAseguradora = aseguradoraFiltro.map(f => String(f.value));
      ok = ok && valoresAseguradora.includes(String(caso.codiAsgrdra));
    }
    
    // Filtro por ciudad (múltiple, usar codigoPoblado primero, luego ciudadSucursal como fallback)
    if (ciudadFiltro.length > 0) {
      const valoresCiudad = ciudadFiltro.map(f => String(f.value));
      const ciudadCaso = caso.codigoPoblado || caso.ciudadSucursal;
      ok = ok && valoresCiudad.includes(String(ciudadCaso));
    }
    
    return ok;
  });

  const casosOrdenados = [...casosFiltrados].sort((a, b) => {
    const campo = orden.campo;
    if (!campo) return 0;
    const valorA = a[campo]?.toString().toLowerCase() || '';
    const valorB = b[campo]?.toString().toLowerCase() || '';
    return orden.asc ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
  });

  // Si hay un filtro de responsable activo, mostrar todos los casos sin paginación
  const hayFiltroResponsable = responsableFiltro.length > 0;
  const totalPaginas = hayFiltroResponsable ? 1 : Math.ceil(casosOrdenados.length / elementosPorPagina);
  const casosPaginados = hayFiltroResponsable 
    ? casosOrdenados // Mostrar todos los casos cuando hay filtro de responsable
    : casosOrdenados.slice(
        (paginaActual - 1) * elementosPorPagina,
        paginaActual * elementosPorPagina
      );

  const cambiarOrden = campo => {
    setOrden(prev => ({
      campo,
      asc: prev.campo === campo ? !prev.asc : true,
    }));
  };

  // Listas únicas para los filtros
  const estadosUnicos = Array.from(new Set(casos.map(c => c.codiEstdo).filter(Boolean))).map(e => ({ 
    value: e, 
    label: getEstadoNombre(e, estadosLocales) 
  }));
  
  const aseguradorasUnicas = Array.from(new Set(casos.map(c => c.codiAsgrdra).filter(Boolean))).map(a => ({ 
    value: a, 
    label: getAseguradoraNombre(a, aseguradoras) 
  }));
  
  const ciudadesUnicas = Array.from(new Set(casos.map(c => c.codigoPoblado || c.ciudadSucursal).filter(Boolean))).map(ciudad => ({ 
    value: ciudad, 
    label: getCiudadNombre(ciudad, ciudades) 
  }));

  // Función helper para extraer solo el nombre de la ciudad (sin departamento ni país)
  // Maneja formatos como "CIUDAD, DEPARTAMENTO, PAIS" o "CIUDAD - DEPARTAMENTO"
  // También intenta convertir códigos a nombres si es necesario
  const extraerSoloCiudad = (textoCiudad, ciudadesParaBuscar = null) => {
    if (!textoCiudad) return '';
    
    // Usar las ciudades proporcionadas o las del estado
    const ciudadesABuscar = ciudadesParaBuscar || ciudades || ciudadesProp;
    
    // Si no es string, intentar convertir código a nombre
    if (typeof textoCiudad !== 'string') {
      const nombreCiudad = getCiudadNombre(textoCiudad, ciudadesABuscar);
      if (nombreCiudad && nombreCiudad !== String(textoCiudad)) {
        // Si el nombre obtenido tiene formato "CIUDAD - DEPARTAMENTO", extraer solo ciudad
        if (nombreCiudad.includes(' - ')) {
          return nombreCiudad.split(' - ')[0].trim();
        }
        return nombreCiudad;
      }
      // Si no se encontró nombre o es el mismo código, retornar vacío para códigos numéricos
      // (mejor mostrar vacío que el código)
      if (/^\d+$/.test(String(textoCiudad))) {
        return '';
      }
      return String(textoCiudad);
    }
    
    // Limpiar espacios
    const texto = textoCiudad.trim();
    if (!texto) return '';
    
    // Si parece ser un código (contiene números y letras en formato específico como "CONDENSAL 000001")
    // o es un código numérico, intentar buscar el nombre
    if (/^\d+$/.test(texto) || /^[A-Z]+\s*\d+$/.test(texto.toUpperCase())) {
      const nombreCiudad = getCiudadNombre(texto, ciudadesABuscar);
      if (nombreCiudad && nombreCiudad !== texto) {
        // Si el nombre obtenido tiene formato "CIUDAD - DEPARTAMENTO", extraer solo ciudad
        if (nombreCiudad.includes(' - ')) {
          return nombreCiudad.split(' - ')[0].trim();
        }
        return nombreCiudad;
      }
      // Si no se encontró nombre o es el mismo código, retornar vacío para códigos numéricos
      if (/^\d+$/.test(texto)) {
        return '';
      }
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

  const exportarExcel = async () => {
    // Asegurar que las ciudades estén cargadas antes de exportar
    let ciudadesDisponibles = ciudades.length > 0 ? ciudades : ciudadesProp;
    
    // Si no hay ciudades disponibles, intentar cargarlas
    if (!ciudadesDisponibles || ciudadesDisponibles.length === 0) {
      console.log('⚠️ Ciudades no disponibles, cargando...');
      try {
        const ciudadesData = await obtenerCiudades();
        if (Array.isArray(ciudadesData) && ciudadesData.length > 0) {
          const ciudadesFormateadas = ciudadesData.map(c => ({
            value: c.codiMunicipio,
            label: c.descMunicipio && c.descDepto ? `${c.descMunicipio} - ${c.descDepto}` : (c.descMunicipio || ''),
            departamento: c.descDepto,
            ...c
          })).filter(ciudad => ciudad.value && ciudad.label);
          setCiudades(ciudadesFormateadas);
          ciudadesDisponibles = ciudadesFormateadas;
          console.log('✅ Ciudades cargadas para exportación:', ciudadesFormateadas.length);
        }
      } catch (error) {
        console.error('❌ Error al cargar ciudades para exportación:', error);
      }
    }
    
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

    // Usar la función que retorna número serial de Excel (entero = sin hora)
    const parseFechaParaCeldaExcel = (valor) => {
      return crearFechaSoloFecha(valor);
    };

    // Usar camposVisibles directamente (lo que se muestra en la tabla)
    // Asegurar que las columnas importantes estén incluidas si no están ya
    const columnasRequeridas = ['ciudadSucursalAseguradora', 'nmroConsecutivo'];
    const clavesVisibles = camposVisibles.map(col => col.clave);
    const columnasFinales = [...new Set([...clavesVisibles, ...columnasRequeridas])];
    
    // Obtener todas las columnas que están en columnasFinales
    const camposVisiblesFinales = todasLasColumnas.filter(col => columnasFinales.includes(col.clave));
    
    // Si no hay columnas, usar todas las disponibles
    const columnasAExportar = camposVisiblesFinales.length > 0 
      ? camposVisiblesFinales 
      : todasLasColumnas;
    
    console.log('📊 Exportando Excel:');
    console.log('  - Columnas visibles en tabla:', camposVisibles.length);
    console.log('  - Columnas a exportar:', columnasAExportar.length);
    console.log('  - Lista de columnas:', columnasAExportar.map(c => c.label));
    
    const worksheet = XLSX.utils.json_to_sheet(casosOrdenados.map(caso => {
      const fila = {};
      columnasAExportar.forEach(({ clave, label }) => {
        try {
          if (clave === 'codigoPoblado') {
            // Priorizar descripcionCiudad si está disponible (casos Complex)
            if (caso.descripcionCiudad) {
              // Extraer solo la ciudad (sin departamento ni país)
              fila[label] = extraerSoloCiudad(caso.descripcionCiudad);
            } else {
              // Usar codigoPoblado si tiene valor, sino usar ciudadSucursal
              const codigoCiudad = (caso.codigoPoblado && caso.codigoPoblado.toString().trim()) 
                ? caso.codigoPoblado 
                : (caso.ciudadSucursal && caso.ciudadSucursal.toString().trim()) 
                  ? caso.ciudadSucursal 
                  : '';
              const nombreCiudad = getCiudadNombre(codigoCiudad, ciudadesDisponibles);
              fila[label] = extraerSoloCiudad(nombreCiudad, ciudadesDisponibles);
            }
          } else if (clave === 'ciudadSucursal' || clave === 'ciudadSiniestro') {
            // Extraer solo la ciudad (sin departamento ni país)
            // Intentar múltiples fuentes para obtener la ciudad
            let ciudadCompleta = '';
            
            // Primero intentar descripcionCiudad o nombreCiudad (casos Complex)
            if (caso.descripcionCiudad) {
              ciudadCompleta = caso.descripcionCiudad;
            } else if (caso.nombreCiudad) {
              ciudadCompleta = caso.nombreCiudad;
            } else if (caso[clave]) {
              // Si hay un código, intentar buscar el nombre
              ciudadCompleta = getCiudadNombre(caso[clave], ciudadesDisponibles);
              // Si no se encuentra, usar el código como fallback
              if (!ciudadCompleta && caso[clave]) {
                ciudadCompleta = String(caso[clave]);
              }
            }
            
            fila[label] = extraerSoloCiudad(ciudadCompleta, ciudadesDisponibles);
          } else if (clave === 'ciudadSucursalAseguradora') {
            // Columna calculada: obtener ciudad de la aseguradora
            let ciudadSucursal = '';
            
            if (caso.codiAsgrdra) {
              ciudadSucursal = getCiudadSucursalAseguradora(
              caso.codiAsgrdra, 
              aseguradoras, 
              ciudadesDisponibles
            );
            }
            
            // Extraer solo la ciudad (sin departamento ni país)
            fila[label] = extraerSoloCiudad(ciudadSucursal, ciudadesDisponibles) || '';
          } else if (clave === 'nmroConsecutivo') {
            // Consecutivo de Aseguradora
            fila[label] = caso[clave] || '';
          } else if (clave === 'codiEstdo') {
            // Obtener nombre del estado (la función getEstadoNombre ya maneja el fallback al código)
            const codigoEstado = caso[clave];
            const nombreEstado = getEstadoNombre(codigoEstado, estadosProp || estadosLocales);
            fila[label] = nombreEstado || '';
          } else if (clave === 'codiIspector') {
            fila[label] = getResponsableNombre(caso[clave], responsables);
          } else if (clave === 'codiAsgrdra') {
            fila[label] = getAseguradoraNombre(caso[clave], aseguradoras);
          } else if (clave === 'funcSolicita') {
            // Convertir ID de funcionario a nombre
            fila[label] = getFuncionarioNombre(caso[clave], funcionarios);
          } else if (clave === 'codiRespnsble') {
            // Convertir código de responsable a nombre
            fila[label] = getResponsableNombrePorCodigo(caso[clave], responsables);
          } else if (clave === 'codiClasificacion') {
            // Convertir código de clasificación a nombre
            fila[label] = getClasificacionNombre(caso[clave], clasificaciones);
          } else if (
            // Exportar valores monetarios como números con formato de moneda
            clave === 'vlorTarifaAseguradora' ||
            clave === 'vlorHonorarios' ||
            clave === 'vlorGastos' ||
            clave === 'totalPagado' ||
            clave === 'reteIva' ||
            clave === 'reteFuente' ||
            clave === 'reteIca' ||
            clave.toLowerCase().includes('vlor') ||
            clave.toLowerCase().includes('valor') ||
            clave.toLowerCase().includes('rete')
          ) {
            // Convertir a número para formato de moneda
            const valorMonetario = caso[clave];
            if (valorMonetario === null || valorMonetario === undefined || valorMonetario === '') {
              fila[label] = '';
            } else {
              // Convertir a número, manejando strings con formato de moneda
              let numero = 0;
              if (typeof valorMonetario === 'number') {
                numero = valorMonetario;
              } else if (typeof valorMonetario === 'string') {
                // Remover símbolos de moneda, espacios y separadores de miles
                const limpio = valorMonetario.replace(/[$,\s]/g, '').trim();
                numero = parseFloat(limpio) || 0;
              } else {
                numero = parseFloat(valorMonetario) || 0;
              }
              fila[label] = isNaN(numero) ? '' : numero;
            }
          } else if (
            // Exportar fechas como número serial de Excel (tipo fecha)
            // Detectar automáticamente cualquier campo que contenga 'fcha' o 'fecha'
            clave.toLowerCase().includes('fcha') ||
            clave.toLowerCase().includes('fecha') ||
            clave === 'createdAt' ||
            clave === 'updatedAt'
          ) {
            const serialFecha = parseFechaParaCeldaExcel(caso[clave]);
            // Si hay un serial válido, usarlo (será tipo fecha en Excel)
            // Si no, dejar vacío
            fila[label] = serialFecha !== null && !isNaN(serialFecha) && serialFecha > 0 ? serialFecha : '';
          } else {
            // Para el resto de columnas, asegurar que sean texto
            const valor = caso[clave];
            if (valor === null || valor === undefined) {
              fila[label] = '';
            } else {
              // Convertir a string para asegurar que sea texto
              fila[label] = String(valor);
            }
          }
        } catch (error) {
          console.error(`❌ Error procesando columna ${clave}:`, error);
          fila[label] = '';
        }
      });
      return fila;
    }), { cellDates: false }); // No usar cellDates porque estamos usando números seriales

    // Identificar columnas de dinero (moneda)
    const indicesColumnasMoneda = columnasAExportar
      .map((col, idx) => ({ col, idx }))
      .filter(({ col }) => (
        col.clave === 'vlorTarifaAseguradora' ||
        col.clave === 'vlorHonorarios' ||
        col.clave === 'vlorGastos' ||
        col.clave === 'totalPagado' ||
        col.clave === 'reteIva' ||
        col.clave === 'reteFuente' ||
        col.clave === 'reteIca' ||
        col.clave.toLowerCase().includes('vlor') ||
        col.clave.toLowerCase().includes('valor') ||
        col.clave.toLowerCase().includes('rete')
      ))
      .map(({ idx }) => idx);

    // Aplicar formato dd/mm/yyyy a columnas de fecha
    // Las fechas ahora son números seriales (enteros), así que aplicamos formato directamente
    const indicesColumnasFecha = columnasAExportar
      .map((col, idx) => ({ col, idx }))
      .filter(({ col }) => (
        col.clave === 'fchaAsgncion' ||
        col.clave === 'fchaInspccion' ||
        col.clave === 'fchaInforme' ||
        col.clave === 'fchaFactra' ||
        col.clave.toLowerCase().includes('fcha') ||
        col.clave.toLowerCase().includes('fecha')
      ))
      .map(({ idx }) => idx);

    try {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      // Primero, marcar todas las columnas NO-fecha y NO-moneda como texto
      const indicesColumnasNoFecha = columnasAExportar
        .map((col, idx) => ({ col, idx }))
        .filter(({ col }) => {
          const esFecha = col.clave === 'fchaAsgncion' ||
            col.clave === 'fchaInspccion' ||
            col.clave === 'fchaInforme' ||
            col.clave === 'fchaFactra' ||
            col.clave.toLowerCase().includes('fcha') ||
            col.clave.toLowerCase().includes('fecha') ||
            col.clave === 'createdAt' ||
            col.clave === 'updatedAt';
          const esMoneda = col.clave === 'vlorTarifaAseguradora' ||
            col.clave === 'vlorHonorarios' ||
            col.clave === 'vlorGastos' ||
            col.clave === 'totalPagado' ||
            col.clave === 'reteIva' ||
            col.clave === 'reteFuente' ||
            col.clave === 'reteIca' ||
            col.clave.toLowerCase().includes('vlor') ||
            col.clave.toLowerCase().includes('valor') ||
            col.clave.toLowerCase().includes('rete');
          return !esFecha && !esMoneda;
        })
        .map(({ idx }) => idx);
      
      // Marcar columnas no-fecha como texto usando formato predefinido '@'
      // Aplicar formato a nivel de columna para mejor rendimiento
      for (const c of indicesColumnasNoFecha) {
        // Establecer formato de texto para toda la columna
        if (!worksheet['!cols']) worksheet['!cols'] = [];
        if (!worksheet['!cols'][c]) worksheet['!cols'][c] = {};
        worksheet['!cols'][c].wch = worksheet['!cols'][c].wch || 18; // Ancho por defecto
      }
      
      // Marcar cada celda como texto
      for (let r = 1; r <= range.e.r; r++) {
        for (const c of indicesColumnasNoFecha) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[addr];
          if (!cell) continue;
          // Asegurar que sea texto (tipo 's') con formato predefinido '@'
          if (cell.v !== null && cell.v !== undefined && cell.v !== '') {
            cell.t = 's'; // Tipo texto
            cell.z = '@'; // Formato predefinido de Excel para texto
            // Convertir a string si no lo es
            if (typeof cell.v !== 'string') {
              cell.v = String(cell.v);
            }
          } else {
            // Incluso si está vacío, aplicar formato de texto
            cell.t = 's';
            cell.z = '@';
            cell.v = '';
          }
        }
      }
      
      // Luego, aplicar formato de fecha predefinido (código 14 = dd/mm/yyyy) a las columnas de fecha
      // Código 14 es el formato predefinido de Excel para fecha corta (dd/mm/yyyy)
      // desde la fila 2 (r=1) porque r=0 es encabezado
      for (let r = 1; r <= range.e.r; r++) {
        for (const c of indicesColumnasFecha) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[addr];
          if (!cell) continue;
          // Si es un número (serial de Excel), aplicar formato de fecha
          // Excel reconocerá números seriales en el rango de fechas como tipo fecha
          if (typeof cell.v === 'number' && cell.v > 0 && cell.v < 1000000) {
            cell.t = 'n'; // Tipo numérico (Excel lo interpretará como fecha si está en rango válido)
            // Intentar usar código predefinido 14 primero, si no funciona usar formato completo
            // Código 14 = formato predefinido de Excel para fecha corta (dd/mm/yyyy)
            // Nota: XLSX puede no soportar códigos predefinidos directamente, usar formato completo
            cell.z = 'dd/mm/yyyy';
          } else if (cell.v instanceof Date && !Number.isNaN(cell.v.getTime())) {
            // Si es un objeto Date, convertir a serial de Excel
            const fecha = cell.v;
            const año = fecha.getFullYear();
            const mes = fecha.getMonth() + 1;
            const dia = fecha.getDate();
            const serial = calcularSerialExcel(año, mes, dia);
            if (serial) {
              cell.v = serial;
              cell.t = 'n';
            cell.z = 'dd/mm/yyyy';
            }
          } else if (cell.v === '' || cell.v === null || cell.v === undefined) {
            // Si está vacío, mantenerlo vacío pero con formato de fecha
            cell.v = '';
            cell.t = 'n';
            cell.z = 'dd/mm/yyyy';
          }
        }
      }
      
      // Aplicar formato de moneda colombiana (COP) a las columnas de dinero
      // Formato: "$"#,##0 (pesos colombianos con separador de miles)
      for (let r = 1; r <= range.e.r; r++) {
        for (const c of indicesColumnasMoneda) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[addr];
          if (!cell) continue;
          // Si es un número válido, aplicar formato de moneda
          if (typeof cell.v === 'number' && !isNaN(cell.v)) {
            cell.t = 'n'; // Tipo numérico
            // Formato de moneda colombiana: $ con separador de miles
            // "$"#,##0 = símbolo $, separador de miles, sin decimales
            cell.z = '"$"#,##0';
          } else if (cell.v === '' || cell.v === null || cell.v === undefined) {
            // Si está vacío, mantenerlo vacío pero con formato de moneda
            cell.v = '';
            cell.t = 'n';
            cell.z = '"$"#,##0';
          } else {
            // Si es string, intentar convertir a número
            const valorNum = parseFloat(cell.v);
            if (!isNaN(valorNum)) {
              cell.v = valorNum;
              cell.t = 'n';
              cell.z = '"$"#,##0';
            }
          }
        }
      }
    } catch (e) {
      // si algo falla aquí, igual se exporta (solo puede quedar formato por defecto)
      console.warn('⚠️ No se pudo aplicar formato de fecha/moneda en Excel:', e);
    }
    
    // Configurar ancho de columnas
    const columnWidths = columnasAExportar.map(col => {
      // Ajustar ancho según el tipo de contenido
      if (col.clave.includes('fecha') || col.clave.includes('fcha')) {
        return { wch: 12 }; // Fechas
      } else if (col.clave.includes('observ') || col.clave.includes('observ')) {
        return { wch: 30 }; // Observaciones
      } else if (col.clave.includes('direccion') || col.clave.includes('codDireccion')) {
        return { wch: 25 }; // Direcciones
      } else if (col.clave.includes('valor') || col.clave.includes('vlor')) {
        return { wch: 15 }; // Valores monetarios
      } else {
        return { wch: 18 }; // Ancho por defecto
      }
    });
    
    worksheet['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CasosRiesgo');
    XLSX.writeFile(workbook, 'reporte_riesgo.xlsx');
  };

  return (
    <div className="p-2 sm:p-4">
      <h2 
        className="text-xl sm:text-2xl font-bold mb-4"
        style={{ color: textPrimary }}
      >
        📊 Reporte de Casos de Riesgo
      </h2>

      {/* Filtros Avanzados */}
      <div 
        className="shadow rounded-lg p-3 sm:p-4 mb-4"
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
              onFocus={(e) => {
                e.target.style.borderColor = theme === 'dark' ? '#DC2626' : '#2563EB';
                e.target.style.boxShadow = `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = borderColor;
                e.target.style.boxShadow = 'none';
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
              onFocus={(e) => {
                e.target.style.borderColor = theme === 'dark' ? '#DC2626' : '#2563EB';
                e.target.style.boxShadow = `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = borderColor;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
        
        {/* Segunda fila - Selectores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              📊 Estado
            </label>
            <Select
              isMulti
              options={estadosUnicos}
              value={estadoFiltro}
              onChange={(selected) => setEstadoFiltro(selected || [])}
              placeholder="Todos los estados"
              isClearable
              className="text-xs sm:text-sm"
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  fontSize: '0.875rem',
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                  boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                  '&:hover': {
                    borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                  },
                }),
                menuPortal: (provided) => ({
                  ...provided,
                  zIndex: 9999
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                  backgroundColor: inputBg,
                  border: `1px solid ${borderColor}`,
                  boxShadow: theme === 'dark' 
                    ? '0 10px 25px rgba(0, 0, 0, 0.5)' 
                    : '0 10px 25px rgba(0, 0, 0, 0.15)'
                }),
                menuList: (provided) => ({
                  ...provided,
                  backgroundColor: inputBg,
                  padding: 0
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected 
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : state.isFocused
                    ? (theme === 'dark' ? '#2A2A2A' : '#F3F4F6')
                    : inputBg,
                  color: state.isSelected 
                    ? '#FFFFFF'
                    : textPrimary
                }),
                multiValue: (provided) => ({
                  ...provided,
                  backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
                }),
                multiValueLabel: (provided) => ({
                  ...provided,
                  color: textPrimary,
                }),
                multiValueRemove: (provided) => ({
                  ...provided,
                  color: textPrimary,
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444',
                    color: '#FFFFFF',
                  },
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: textPrimary
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: textSecondary
                })
              }}
            />
          </div>
          
          <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              👨‍💼 Responsable
            </label>
            <Select
              isMulti
              options={responsablesUnicos}
              value={responsableFiltro}
              onChange={(selected) => setResponsableFiltro(selected || [])}
              placeholder="Todos los responsables"
              isClearable
              className="text-xs sm:text-sm"
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  fontSize: '0.875rem',
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                  boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                  '&:hover': {
                    borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                  },
                }),
                menuPortal: (provided) => ({
                  ...provided,
                  zIndex: 9999
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                  backgroundColor: inputBg,
                  border: `1px solid ${borderColor}`,
                  boxShadow: theme === 'dark' 
                    ? '0 10px 25px rgba(0, 0, 0, 0.5)' 
                    : '0 10px 25px rgba(0, 0, 0, 0.15)'
                }),
                menuList: (provided) => ({
                  ...provided,
                  backgroundColor: inputBg,
                  padding: 0
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected 
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : state.isFocused
                    ? (theme === 'dark' ? '#2A2A2A' : '#F3F4F6')
                    : inputBg,
                  color: state.isSelected 
                    ? '#FFFFFF'
                    : textPrimary
                }),
                multiValue: (provided) => ({
                  ...provided,
                  backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
                }),
                multiValueLabel: (provided) => ({
                  ...provided,
                  color: textPrimary,
                }),
                multiValueRemove: (provided) => ({
                  ...provided,
                  color: textPrimary,
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444',
                    color: '#FFFFFF',
                  },
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: textPrimary
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: textSecondary
                })
              }}
            />
          </div>
          
          <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              🏢 Aseguradora
            </label>
            <Select
              isMulti
              options={aseguradorasUnicas}
              value={aseguradoraFiltro}
              onChange={(selected) => setAseguradoraFiltro(selected || [])}
              placeholder="Todas las aseguradoras"
              isClearable
              className="text-xs sm:text-sm"
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  fontSize: '0.875rem',
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                  boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                  '&:hover': {
                    borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                  },
                }),
                menuPortal: (provided) => ({
                  ...provided,
                  zIndex: 9999
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                  backgroundColor: inputBg,
                  border: `1px solid ${borderColor}`,
                  boxShadow: theme === 'dark' 
                    ? '0 10px 25px rgba(0, 0, 0, 0.5)' 
                    : '0 10px 25px rgba(0, 0, 0, 0.15)'
                }),
                menuList: (provided) => ({
                  ...provided,
                  backgroundColor: inputBg,
                  padding: 0
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected 
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : state.isFocused
                    ? (theme === 'dark' ? '#2A2A2A' : '#F3F4F6')
                    : inputBg,
                  color: state.isSelected 
                    ? '#FFFFFF'
                    : textPrimary
                }),
                multiValue: (provided) => ({
                  ...provided,
                  backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
                }),
                multiValueLabel: (provided) => ({
                  ...provided,
                  color: textPrimary,
                }),
                multiValueRemove: (provided) => ({
                  ...provided,
                  color: textPrimary,
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444',
                    color: '#FFFFFF',
                  },
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: textPrimary
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: textSecondary
                })
              }}
            />
          </div>
          
          <div>
            <label 
              className="block text-xs font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              🏙️ Ciudad
            </label>
            <Select
              isMulti
              options={ciudadesUnicas}
              value={ciudadFiltro}
              onChange={(selected) => setCiudadFiltro(selected || [])}
              placeholder="Todas las ciudades"
              isClearable
              className="text-xs sm:text-sm"
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  fontSize: '0.875rem',
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                  boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                  '&:hover': {
                    borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                  },
                }),
                menuPortal: (provided) => ({
                  ...provided,
                  zIndex: 9999
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                  backgroundColor: inputBg,
                  border: `1px solid ${borderColor}`,
                  boxShadow: theme === 'dark' 
                    ? '0 10px 25px rgba(0, 0, 0, 0.5)' 
                    : '0 10px 25px rgba(0, 0, 0, 0.15)'
                }),
                menuList: (provided) => ({
                  ...provided,
                  backgroundColor: inputBg,
                  padding: 0
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected 
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : state.isFocused
                    ? (theme === 'dark' ? '#2A2A2A' : '#F3F4F6')
                    : inputBg,
                  color: state.isSelected 
                    ? '#FFFFFF'
                    : textPrimary
                }),
                multiValue: (provided) => ({
                  ...provided,
                  backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
                }),
                multiValueLabel: (provided) => ({
                  ...provided,
                  color: textPrimary,
                }),
                multiValueRemove: (provided) => ({
                  ...provided,
                  color: textPrimary,
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444',
                    color: '#FFFFFF',
                  },
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: textPrimary
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: textSecondary
                })
              }}
            />
          </div>
        </div>
        
        {/* Botón para limpiar filtros */}
        <div className="mt-3 text-center">
          <button 
            onClick={() => {
              setFechaDesde("");
              setFechaHasta("");
              setEstadoFiltro([]);
              setResponsableFiltro([]);
              setAseguradoraFiltro([]);
              setCiudadFiltro([]);
            }}
            className="px-4 py-2 rounded-md text-sm text-white transition-colors"
            style={{ backgroundColor: theme === 'dark' ? '#4A4A4A' : '#6B7280' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#5A5A5A' : '#4B5563';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#4A4A4A' : '#6B7280';
            }}
          >
            🗑️ Limpiar Filtros
          </button>
        </div>
        
        {/* Información de filtros activos */}
        {(fechaDesde || fechaHasta || estadoFiltro.length > 0 || responsableFiltro.length > 0 || aseguradoraFiltro.length > 0 || ciudadFiltro.length > 0) && (
          <div 
            className="mt-3 p-2 rounded-md border"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.1)' : '#DBEAFE',
              borderColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE'
            }}
          >
            <p 
              className="text-xs font-medium mb-1"
              style={{ color: theme === 'dark' ? '#93C5FD' : '#1E40AF' }}
            >
              🔍 Filtros activos:
            </p>
            <div className="flex flex-wrap gap-1">
              {fechaDesde && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#BFDBFE',
                    color: theme === 'dark' ? '#DBEAFE' : '#1E3A8A'
                  }}
                >
                  Desde: {fechaDesde}
                </span>
              )}
              {fechaHasta && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#BFDBFE',
                    color: theme === 'dark' ? '#DBEAFE' : '#1E3A8A'
                  }}
                >
                  Hasta: {fechaHasta}
                </span>
              )}
              {estadoFiltro.length > 0 && estadoFiltro.map((filtro, index) => (
                <span 
                  key={`estado-${index}`}
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#BFDBFE',
                    color: theme === 'dark' ? '#DBEAFE' : '#1E3A8A'
                  }}
                >
                  Estado: {filtro.label || getEstadoNombre(filtro.value, estadosLocales)}
                </span>
              ))}
              {responsableFiltro.length > 0 && responsableFiltro.map((filtro, index) => (
                <span 
                  key={`responsable-${index}`}
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#BFDBFE',
                    color: theme === 'dark' ? '#DBEAFE' : '#1E3A8A'
                  }}
                >
                  Responsable: {filtro.label || getResponsableNombre(filtro.value, responsables)}
                </span>
              ))}
              {aseguradoraFiltro.length > 0 && aseguradoraFiltro.map((filtro, index) => (
                <span 
                  key={`aseguradora-${index}`}
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#BFDBFE',
                    color: theme === 'dark' ? '#DBEAFE' : '#1E3A8A'
                  }}
                >
                  Aseguradora: {filtro.label || getAseguradoraNombre(filtro.value, aseguradoras)}
                </span>
              ))}
              {ciudadFiltro.length > 0 && ciudadFiltro.map((filtro, index) => (
                <span 
                  key={`ciudad-${index}`}
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#BFDBFE',
                    color: theme === 'dark' ? '#DBEAFE' : '#1E3A8A'
                  }}
                >
                  Ciudad: {filtro.label || getCiudadNombre(filtro.value, ciudades)}
                </span>
              ))}
            </div>
            <p 
              className="text-xs mt-1"
              style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }}
            >
              Mostrando {casosFiltrados.length} de {casos.length} casos
            </p>
            {hayFiltroResponsable && (
              <p 
                className="text-xs mt-1 font-medium"
                style={{ color: '#10B981' }}
              >
                ✅ Mostrando todos los casos del responsable seleccionado (sin paginación)
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div>
          <label 
            className="text-sm font-medium block"
            style={{ color: textPrimary }}
          >
            Buscar por
          </label>
          <select
            className="px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            value={campoBusqueda}
            onChange={e => setCampoBusqueda(e.target.value)}
          >
            <option value="" disabled>Selecciona filtro</option>
            {camposVisibles.map(c => (
              <option key={c.clave} value={c.clave}>{c.label}</option>
            ))}
          </select>
          {!campoBusqueda && (
            <p className="text-xs mt-1" style={{ color: '#DC2626' }}>
              Selecciona un filtro para buscar.
            </p>
          )}
        </div>
        <div>
          <label 
            className="text-sm font-medium block"
            style={{ color: textPrimary }}
          >
            Término
          </label>
          <input
            type="text"
            className="px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            value={terminoBusqueda}
            onChange={e => setTerminoBusqueda(e.target.value)}
            disabled={!campoBusqueda}
          />
        </div>
        <button
          className="text-white px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: '#2563EB' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1D4ED8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
          onClick={obtenerCasos}
        >
          🔍 Buscar
        </button>
        <button
          className="text-white px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: '#3B82F6' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3B82F6';
          }}
              onClick={abrirModalColumnas}
        >
          🗂️ Columnas
        </button>
        <button
          className="text-white px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: '#059669' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#047857';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
          }}
          onClick={exportarExcel}
        >
          ⬇ Exportar Excel
        </button>
        <div 
          className="text-xs px-3 py-2 rounded"
          style={{
            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F3F4F6',
            color: textSecondary
          }}
        >
          📊 {camposVisibles.length} de {todasLasColumnas.length} campos visibles
        </div>
      </div>

      {/* Paginación - Movida arriba de la tabla */}
      {totalPaginas > 1 && (
        <div 
          className="shadow rounded-lg p-4 mb-4"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <div className="flex justify-between items-center">
            <span 
              className="text-sm"
              style={{ color: textPrimary }}
            >
              Página {paginaActual} de {totalPaginas}
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1 rounded disabled:opacity-50 transition-colors"
                style={{
                  backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
                  color: textPrimary
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#D1D5DB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
                  }
                }}
              >
                ⬅ Anterior
              </button>
              <button
                onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-1 rounded disabled:opacity-50 transition-colors"
                style={{
                  backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
                  color: textPrimary
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#D1D5DB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
                  }
                }}
              >
                Siguiente ➡
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className="overflow-auto rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <table className="w-full text-sm" style={{ borderColor: borderColor }}>
          <thead className="sticky top-0 z-10" style={{ backgroundColor: tableHeaderBg }}>
            <tr>
              <th 
                className="p-2 border-b text-left"
                style={{
                  color: textPrimary,
                  borderColor: borderColor
                }}
              >
                Acciones
              </th>
              {camposVisibles.map(({ clave, label }) => (
                <th
                  key={clave}
                  onClick={() => cambiarOrden(clave)}
                  className="p-2 border-b cursor-pointer whitespace-nowrap text-left"
                  style={{
                    color: textPrimary,
                    borderColor: borderColor
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = tableHeaderBg;
                  }}
                >
                  {label} {orden.campo === clave ? (orden.asc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {casosPaginados.length === 0 ? (
              <tr>
                <td 
                  colSpan={camposVisibles.length + 1} 
                  className="text-center py-6"
                  style={{ color: textSecondary }}
                >
                  No hay registros para mostrar
                </td>
              </tr>
              ) : 
              casosPaginados.map((caso, index) => (
                <tr 
                  key={index} 
                  className="border-b"
                  style={{
                    backgroundColor: index % 2 === 0 ? tableRowBg : (theme === 'dark' ? '#1F1F1F' : '#F9F9F9'),
                    borderColor: borderColor
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = tableRowHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? tableRowBg : (theme === 'dark' ? '#1F1F1F' : '#F9F9F9');
                  }}
                >
                  <td className="p-2 whitespace-nowrap space-x-2">
                    <button
                      className="text-white px-2 py-1 rounded text-xs transition-colors"
                      style={{ backgroundColor: '#3B82F6' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3B82F6';
                      }}
                      onClick={() => handleEdit(caso._id || caso.id_riesgo)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="text-white px-2 py-1 rounded text-xs transition-colors"
                      style={{ backgroundColor: '#EF4444' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#EF4444';
                      }}
                      onClick={() => handleDelete(caso._id || caso.id_riesgo)}
                    >
                      🗑️ Borrar
                    </button>
                  </td>
                  {camposVisibles.map(({ clave, label }) => (
                    <td 
                      key={clave} 
                      className="p-2 whitespace-nowrap"
                      style={{ color: textPrimary }}
                    >
                      {clave === 'codigoPoblado'
                         ? (() => {
                             // Priorizar descripcionCiudad si está disponible (casos Complex)
                             if (caso.descripcionCiudad) {
                               // Extraer solo la ciudad (sin departamento ni país)
                               return extraerSoloCiudad(caso.descripcionCiudad);
                             }
                             // Usar codigoPoblado si tiene valor, sino usar ciudadSucursal
                             const codigoCiudad = (caso.codigoPoblado && caso.codigoPoblado.toString().trim()) 
                               ? caso.codigoPoblado 
                               : (caso.ciudadSucursal && caso.ciudadSucursal.toString().trim()) 
                                 ? caso.ciudadSucursal 
                                 : '';
                             const nombreCiudad = getCiudadNombre(codigoCiudad, ciudades || ciudadesProp);
                             return extraerSoloCiudad(nombreCiudad);
                           })()
                        : clave === 'ciudadSucursal'
                         ? (() => {
                             // Extraer solo la ciudad (sin departamento ni país)
                             const ciudadCompleta = caso.descripcionCiudad || caso.nombreCiudad || getCiudadNombre(caso[clave], ciudades || ciudadesProp);
                             return extraerSoloCiudad(ciudadCompleta);
                           })()
                        : clave === 'ciudadSiniestro'
                         ? (() => {
                             // Extraer solo la ciudad (sin departamento ni país)
                             const ciudadCompleta = caso.descripcionCiudad || caso.nombreCiudad || getCiudadNombre(caso[clave], ciudades || ciudadesProp);
                             return extraerSoloCiudad(ciudadCompleta);
                           })()
                        : clave === 'ciudadSucursalAseguradora'
                          ? (() => {
                             // Extraer solo la ciudad (sin departamento ni país)
                             const ciudadSucursal = getCiudadSucursalAseguradora(caso.codiAsgrdra, aseguradoras, ciudades || ciudadesProp);
                             return extraerSoloCiudad(ciudadSucursal);
                           })()
                        : clave === 'codiEstdo'
                          ? getEstadoNombre(caso[clave], estadosProp || estadosLocales)
                          : clave === 'codiIspector'
                            ? getResponsableNombre(caso[clave], responsables)
                            : clave === 'codiAsgrdra'
                              ? getAseguradoraNombre(caso[clave], aseguradoras)
                          : clave === 'funcSolicita'
                            ? getFuncionarioNombre(caso[clave], funcionarios)
                          : clave === 'codiRespnsble'
                            ? getResponsableNombrePorCodigo(caso[clave], responsables)
                          : clave === 'codiClasificacion'
                            ? (() => {
                                const valor = caso[clave];
                                const resultado = getClasificacionNombre(valor, clasificaciones);
                                // Debug: verificar estado de clasificaciones al renderizar
                                if (valor && (!clasificaciones || clasificaciones.length === 0)) {
                                  console.warn(`⚠️ [RENDER] codiClasificacion: ${valor}, pero clasificaciones está vacío (length: ${clasificaciones?.length || 0})`);
                                }
                                return resultado;
                              })()
                          : (clave === 'fchaAsgncion' || clave === 'fchaInspccion' || clave === 'fchaInforme' || clave === 'fchaFactra')
                            ? (caso[clave] ? new Date(caso[clave]).toLocaleDateString() : '')
                            : caso[clave] || ''}
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>


      {/* Modal de edición */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2 py-4 sm:px-4">
          <div 
            className="relative flex h-full w-full max-h-[95vh] max-w-6xl flex-col overflow-hidden rounded-lg shadow-2xl"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <div 
              className="flex items-center justify-between border-b px-4 py-3 sm:px-6"
              style={{ borderColor: borderColor }}
            >
              <h2 
                className="text-base font-semibold sm:text-lg"
                style={{ color: textPrimary }}
              >
                Editar caso de riesgo
              </h2>
              <button
                className="rounded-full p-1 transition"
                style={{ color: textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';
                  e.currentTarget.style.color = '#EF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = textSecondary;
                }}
                onClick={handleCloseModal}
                title="Cerrar"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 sm:px-4">
              <AgregarCasoRiesgo casoInicial={casoParaEditar} onClose={handleCloseModal} />
            </div>
          </div>
        </div>
      )}
      {/* Modal de selección de columnas */}
      {modalColumnas && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div 
            className="rounded shadow-lg p-6 max-w-lg w-full relative"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <button
              className="absolute top-2 right-2 text-2xl font-bold transition-colors"
              style={{ color: textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = textSecondary;
              }}
              onClick={() => setModalColumnas(false)}
              title="Cerrar"
            >
              ×
            </button>
            <h3 
              className="text-lg font-bold mb-2"
              style={{ color: textPrimary }}
            >
              Personalizar columnas
            </h3>
            <p className="text-xs sm:text-sm mb-3" style={{ color: textSecondary }}>
              Arrastra las columnas para cambiar su orden. Marca/desmarca para mostrar/ocultar.
            </p>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto mb-4 border rounded p-2" style={{ borderColor: borderColor }}>
              {(columnasOrdenadas.length > 0 ? columnasOrdenadas : todasLasColumnas).map((col, index) => (
                <div
                  key={col.clave}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-2 rounded cursor-move transition-all ${
                    draggedIndex === index ? 'opacity-50' : 'hover:bg-opacity-10'
                  }`}
                  style={{ 
                    color: textPrimary,
                    backgroundColor: draggedIndex === index ? 'transparent' : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                  }}
                >
                  <span className="text-gray-400 text-xs">☰</span>
                  <label className="flex items-center gap-2 text-sm flex-1 cursor-pointer" style={{ color: textPrimary }}>
                    <input
                      type="checkbox"
                      checked={seleccionTemporal.includes(col.clave)}
                      onChange={() => toggleColumna(col.clave)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        accentColor: theme === 'dark' ? '#DC2626' : '#2563EB'
                      }}
                    />
                    <span>{col.label}</span>
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="text-white px-4 py-2 rounded transition-colors"
                style={{ 
                  backgroundColor: theme === 'dark' ? '#4A4A4A' : '#D1D5DB',
                  color: theme === 'dark' ? '#E5E5E5' : '#1E1E1E'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onClick={() => setModalColumnas(false)}
              >
                Cancelar
              </button>
              <button
                className="text-white px-4 py-2 rounded transition-colors"
                style={{ backgroundColor: '#2563EB' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onClick={guardarColumnasPersonalizadas}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteRiesgo;