import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from "react-router-dom";
import ActivacionRiesgo from "./ActivacionRiesgo.jsx";
import SeguimientoRiesgo from "./SeguimientoRiesgo.jsx";
import FacturacionRiesgo from "./FacturacionRiesgo.jsx";
import TrazabilidadRiesgo from "./TrazabilidadRiesgo.jsx";
import ListaCasosRiesgo from "./ListaCasosRiesgo";
import { useCasosRiesgo } from "../../context/CasosRiesgoContext";
import axios from 'axios';
import { BASE_URL } from '../../config/apiConfig';
import { sanitizeUploadFileName } from '../../utils/sanitizeUploadFileName.js';
import historialService, { TIPOS_FORMULARIOS, ESTADOS_FORMULARIO } from '../../services/historialService';
import {
  riesgoBtnInfo,
  riesgoBtnSecondary,
  riesgoBtnSuccess,
  riesgoFormRoot,
  riesgoFormShell,
  riesgoPageWrapWide,
  riesgoScope,
} from './riesgoFenixUi.js';
import { InputFenix, RiesgoFormTabs, RiesgoNavPanel, RiesgoPageHeader } from './RiesgoUiBlocks.jsx';
import { useAutoSave } from '../../hooks/useAutoSave';
import AutoSaveNotification from '../AutoSave/AutoSaveNotification';
import AutoSaveRestoreDialog from '../AutoSave/AutoSaveRestoreDialog';

// Configurar axios para usar la URL base correcta
axios.defaults.baseURL = BASE_URL;

const initialFormData = {
  _id: '',
  aseguradora: '',
  direccion: '',
  ciudad: null,
  asegurado: '',
  fechaAsignacion: '',
  fechaInspeccion: '',
  observaciones: '',
  estado: '',
  responsable: '',
  clasificacion: null,
  quienSolicita: null,
};

const ordenarLista = (lista = [], obtenerEtiqueta = (item) => item) => {
  return [...lista].sort((a, b) => {
    const etiquetaA = obtenerEtiqueta(a);
    const etiquetaB = obtenerEtiqueta(b);
    const textoA = etiquetaA == null ? '' : etiquetaA.toString();
    const textoB = etiquetaB == null ? '' : etiquetaB.toString();
    return textoA.localeCompare(textoB, 'es', { sensitivity: 'base' });
  });
};

const limpiarNumero = (valor) => {
  if (valor === undefined || valor === null || valor === '') {
    return '';
  }
  if (typeof valor === 'number') {
    return valor;
  }
  const texto = String(valor).replace(/[^\d-]/g, '');
  if (!texto) {
    return '';
  }
  const numero = Number(texto);
  return Number.isNaN(numero) ? '' : numero;
};

const normalizarArchivo = (valor) => {
  if (valor instanceof File) {
    return valor;
  }
  if (typeof valor === 'string') {
    return valor;
  }
  if (valor && typeof valor === 'object') {
    if (valor.ruta || valor.path || valor.url) {
      return valor.ruta || valor.path || valor.url;
    }
    return '';
  }
  return '';
};

const camposAdjuntosRiesgo = [
  'adjuntoAsignacion',
  'adjuntoInspeccion',
  'adjuntoContIni',
  'anxoInfoFnal',
  'anxoFactra',
];

const construirPayloadRiesgo = (datos) => {
  const ciudadSeleccionada = datos.ciudad && typeof datos.ciudad === 'object'
    ? datos.ciudad
    : datos.ciudad
      ? { value: datos.ciudad, label: datos.ciudad }
      : null;

  const solicitanteSeleccionado = datos.quienSolicita && typeof datos.quienSolicita === 'object'
    ? datos.quienSolicita
    : datos.quienSolicita
      ? { value: datos.quienSolicita, label: datos.quienSolicita }
      : null;

  const clasificacionSeleccionada = datos.clasificacion && typeof datos.clasificacion === 'object'
    ? datos.clasificacion
    : datos.clasificacion
      ? { value: datos.clasificacion, label: datos.clasificacion }
      : null;

  const ciudadCodigo = ciudadSeleccionada?.value || '';
  const clasificacionValor = clasificacionSeleccionada ? String(clasificacionSeleccionada.value || clasificacionSeleccionada.label || '') : '';
  const solicitanteValor = solicitanteSeleccionado ? (solicitanteSeleccionado.value || solicitanteSeleccionado.label || '') : '';
  const solicitanteLabel = solicitanteSeleccionado ? (solicitanteSeleccionado.label || solicitanteSeleccionado.value || '') : '';

  const payload = {
    _id: datos._id || '',
    nmroRiesgo: datos.nmroRiesgo || '',
    aseguradora: datos.aseguradora || '',
    responsable: datos.responsable || '',
    estado: datos.codiEstdo || datos.estado || '',
    ciudad: ciudadCodigo,
    ciudadSucursal: datos.ciudadSucursal || ciudadCodigo,
    codigoPoblado: datos.codigoPoblado || ciudadCodigo,
    direccion: datos.direccion || datos.codDireccion || '',
    asegurado: datos.asegurado || datos.asgrBenfcro || '',
    nmroConsecutivo: datos.nmroConsecutivo || '',
    fechaAsignacion: datos.fechaAsignacion || '',
    fchaContIni: datos.fchaContIni || datos.fechaContactoInicial || '',
    observContIni: datos.observContIni || datos.observContactoInicial || '',
    adjuntoContIni: normalizarArchivo(datos.adjuntoContIni || datos.adjuntoContactoInicial),
    fechaInspeccion: datos.fechaInspeccion || '',
    fechaInforme: datos.fchaInforme || datos.fechaInforme || '',
    fechaFactra: datos.fchaFactra || datos.fechaFactra || '',
    observAsignacion: datos.observAsignacion || datos.observaciones || '',
    observInspeccion: datos.observInspeccion || datos.observaciones || '',
    observInforme: datos.observInforme || '',
    codiClasificacion: datos.codiClasificacion || clasificacionValor,
    clasificacion: clasificacionSeleccionada ? (clasificacionSeleccionada.label || clasificacionSeleccionada.value || '') : datos.clasificacion || '',
    quienSolicita: solicitanteLabel,
    funcSolicita: solicitanteValor,
    vlorTarifaAseguradora: limpiarNumero(datos.vlorTarifaAseguradora),
    vlorHonorarios: limpiarNumero(datos.vlorHonorarios),
    vlorGastos: limpiarNumero(datos.vlorGastos),
    totalPagado: limpiarNumero(datos.totalPagado),
    nmroFactra: limpiarNumero(datos.nmroFactra),
    adjuntoAsignacion: normalizarArchivo(datos.adjuntoAsignacion),
    adjuntoInspeccion: normalizarArchivo(datos.adjuntoInspeccion),
    anxoInfoFnal: normalizarArchivo(datos.anxoInfoFnal),
    anxoFactra: normalizarArchivo(datos.anxoFactra),
  };

  camposAdjuntosRiesgo.forEach((campo) => {
    const valor = payload[campo];
    if (valor === '' || valor === undefined || valor === null) {
      delete payload[campo];
    }
  });

  return payload;
};

const obtenerIdCaso = (casoInicial, casos, casoEditadoIndex, formData) => {
  if (casoInicial?._id) {
    return casoInicial._id;
  }
  if (casoEditadoIndex !== null && Array.isArray(casos) && casos[casoEditadoIndex]) {
    const caso = casos[casoEditadoIndex];
    return caso?._id || caso?.id || caso?.id_riesgo || null;
  }
  return formData?._id || null;
};

const crearFormDataDesdePayload = (payload) => {
  const formDataSend = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value instanceof File) {
      formDataSend.append(key, value, sanitizeUploadFileName(value.name, 'archivo'));
      return;
    }
    if (value === undefined || value === null) {
      return;
    }
    formDataSend.append(key, value);
  });
  return formDataSend;
};

const AgregarCasoRiesgo = ({ casoInicial, onClose }) => {
  const [pestanaActiva, setPestanaActiva] = useState('activacion');
  const [formData, setFormData] = useState(initialFormData);
  const [editando, setEditando] = useState(false);
  const [casoEditadoIndex, setCasoEditadoIndex] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const { agregarCaso, casos, cargarCasos } = useCasosRiesgo();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  
  const PESTANAS_RIESGO = [
    { id: 'activacion', label: 'Activación' },
    { id: 'trazabilidad', label: 'Trazabilidad' },
    { id: 'seguimiento', label: 'Seguimiento' },
    { id: 'facturacion', label: 'Facturación' },
  ];
  const [estados, setEstados] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargandoFuncionarios, setCargandoFuncionarios] = useState(false);
  const casoDesdeComplex = location.state?.caso;

  // Estados para autoguardado
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState(null);

  // Generar key única para autoguardado
  const autoSaveKey = casoInicial?._id 
    ? `formulario-riesgo-${casoInicial._id}` 
    : id 
    ? `formulario-riesgo-${id}`
    : 'formulario-riesgo-nuevo';

  // Hook de autoguardado
  const {
    isAutoSaveEnabled,
    lastSaveTime,
    saveStatus,
    enableAutoSave,
    disableAutoSave,
    clearSavedData,
    saveNow,
    restoreFromStorage,
    hasSavedData,
  } = useAutoSave({
    formKey: autoSaveKey,
    formData: formData,
    enabled: true,
    interval: 30000, // Guardar cada 30 segundos
    excludeFields: [], // No excluir campos en este formulario
    onRestore: (savedInfo) => {
setSavedDataToRestore(savedInfo);
      setShowRestoreDialog(true);
    },
  });

  // Activar autoguardado automáticamente en formularios nuevos
  useEffect(() => {
    if (!casoInicial?._id && !editando && !isAutoSaveEnabled) {
enableAutoSave();
    }
  }, [casoInicial, editando, isAutoSaveEnabled, enableAutoSave]);

  // Handlers para autoguardado
  const handleRestoreData = useCallback(() => {
    if (savedDataToRestore && savedDataToRestore.data) {
// Restaurar completamente el formData
      setFormData({
        ...formData, // Mantener estructura base
        ...savedDataToRestore.data, // Sobrescribir con datos guardados
      });
      
      setShowRestoreDialog(false);
      enableAutoSave();
      
alert('✅ Datos restaurados exitosamente');
    }
  }, [savedDataToRestore, enableAutoSave, formData]);

  const handleDiscardSavedData = useCallback(() => {
clearSavedData();
    setShowRestoreDialog(false);
    setSavedDataToRestore(null);
  }, [clearSavedData]);

  const handleCancelRestore = useCallback(() => {
setShowRestoreDialog(false);
  }, []);

  useEffect(() => {
axios.get('/api/estados/estados-riesgos')
      .then(res => {
const lista = Array.isArray(res.data) ? res.data : [];
        const ordenada = ordenarLista(lista, estado =>
          estado?.descEstdo ?? estado?.descEstado ?? estado?.descripcion ?? ''
        );
        setEstados(ordenada);
      })
      .catch((error) => {
        console.error('❌ Error cargando estados:', error);
        setEstados([]);
      });
  }, []);

  useEffect(() => {
axios.get('/api/clientes')
      .then(res => {
// Extraer aseguradoras únicas por codiAsgrdra
        const mapa = new Map();
        res.data.forEach(c => {
          if (c.codiAsgrdra && c.rzonSocial) {
            mapa.set(c.codiAsgrdra, c.rzonSocial);
          }
        });
        const aseguradorasUnicas = Array.from(mapa, ([codiAsgrdra, rzonSocial]) => ({ codiAsgrdra, rzonSocial }));
const ordenadas = ordenarLista(aseguradorasUnicas, (aseg) => aseg?.rzonSocial ?? '');
        setAseguradoras(ordenadas);
      })
      .catch((error) => {
        console.error('❌ Error cargando clientes:', error);
        setAseguradoras([]);
      });
  }, []);

  useEffect(() => {
axios.get('/api/responsables')
      .then(res => {
        const data = res.data?.data && Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
const opciones = data
          .map(r => ({
            codiRespnsble: r.codiRespnsble,
            nmbrRespnsble: r.nmbrRespnsble
          }))
          .filter(r => r.codiRespnsble && r.nmbrRespnsble);
        setResponsables(ordenarLista(opciones, (resp) => resp.nmbrRespnsble));
      })
      .catch((error) => {
        console.error('❌ Error cargando responsables:', error);
        setResponsables([]);
      });
  }, []);

  useEffect(() => {
    if (casoDesdeComplex) {
      setFormData(prev => ({
        ...prev,
        nmroRiesgo: casoDesdeComplex.nmroRiesgo || prev.nmroRiesgo || '',
        aseguradora: casoDesdeComplex.aseguradora || prev.aseguradora || '',
        asegurado: casoDesdeComplex.asegurado || prev.asegurado || '',
        direccion: casoDesdeComplex.direccion || prev.direccion || '',
        fechaAsignacion: casoDesdeComplex.fechaAsignacion || prev.fechaAsignacion || '',
        fechaInspeccion: casoDesdeComplex.fechaInspeccion || prev.fechaInspeccion || '',
        observaciones: casoDesdeComplex.observaciones || prev.observaciones || '',
        codiEstdo: casoDesdeComplex.codiEstdo || prev.codiEstdo || '',
        responsable: casoDesdeComplex.responsable || prev.responsable || '',
        ciudad: casoDesdeComplex.ciudad
          ? {
              value: casoDesdeComplex.ciudad.value || casoDesdeComplex.ciudad,
              label: casoDesdeComplex.ciudad.label || casoDesdeComplex.ciudad.value || casoDesdeComplex.ciudad,
            }
          : prev.ciudad,
      }));
    }
  }, [casoDesdeComplex]);

  useEffect(() => {
axios.get('/api/estados/clasificaciones-riesgo')
      .then(res => {
const opciones = res.data
          .map(c => ({ codiIdentificador: c.codiIdentificador, rzonDescripcion: c.rzonDescripcion }))
          .filter(c => c.codiIdentificador && c.rzonDescripcion);
        setClasificaciones(ordenarLista(opciones, (clasificacion) => clasificacion.rzonDescripcion));
      })
      .catch((error) => {
        console.error('❌ Error cargando clasificaciones:', error);
        setClasificaciones([]);
      });
  }, []);

  useEffect(() => {
axios.get('/api/ciudades/ciudades')
      .then(res => {
// Mapeo para react-select: value = codiMunicipio, label = descMunicipio - descDepto
        const opciones = res.data.map(c => ({
          value: c.codiMunicipio,
          label: `${c.descMunicipio} - ${c.descDepto}`,
          departamento: c.descDepto,
          ...c
        })).filter(ciudad => ciudad.value && ciudad.label);
        setCiudades(ordenarLista(opciones, (ciudad) => ciudad.label));
      })
      .catch((error) => {
        console.error('❌ Error cargando ciudades:', error);
        setCiudades([]);
      });
  }, []);

  // Función para cargar funcionarios de una aseguradora
  const cargarFuncionariosAseguradora = (codigoAseguradora, mantenerValorActual = true) => {
    if (!codigoAseguradora) {
      setFuncionarios([]);
      setCargandoFuncionarios(false);
      return;
    }

    const abortController = new AbortController();
    setCargandoFuncionarios(true);

    fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoAseguradora}`, {
      signal: abortController.signal
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // La API devuelve { success: true, data: [...] }
        const funcionariosData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
        const opciones = funcionariosData
          .map(f => {
            const rawValue = f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? f.nmbrContcto ?? f.nombre ?? '';
            const label = f.nmbrContcto || f.nombre || f.label || '';
            const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
            if (!value || !label) {
              return null;
            }
            return { value, label };
          })
          .filter(Boolean);

        // Agregar el valor actual si existe y no está en las opciones
        if (mantenerValorActual) {
          const valorActual = formData.quienSolicita && typeof formData.quienSolicita === 'object'
            ? formData.quienSolicita.value
            : formData.quienSolicita || '';
          const etiquetaActual = formData.quienSolicita && typeof formData.quienSolicita === 'object'
            ? formData.quienSolicita.label
            : formData.quienSolicita || '';
          
          if (valorActual && !opciones.some(opt => opt.value === valorActual || opt.label === etiquetaActual)) {
            opciones.push({ value: valorActual, label: etiquetaActual || valorActual });
          }
        }

        setFuncionarios(ordenarLista(opciones, (opt) => opt.label));
        setCargandoFuncionarios(false);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('❌ Error cargando funcionarios:', error);
        setFuncionarios(prev => {
          if (prev && prev.length > 0) {
            return prev;
          }
          if (mantenerValorActual) {
            const valorActual = formData.quienSolicita && typeof formData.quienSolicita === 'object'
              ? formData.quienSolicita.value
              : formData.quienSolicita || '';
            if (!valorActual) {
              return [];
            }
            return [{
              value: valorActual,
              label: (formData.quienSolicita && typeof formData.quienSolicita === 'object'
                ? formData.quienSolicita.label
                : formData.quienSolicita) || valorActual
            }];
          }
          return [];
        });
        setCargandoFuncionarios(false);
      });

    return () => {
      abortController.abort();
    };
  };

  // Fetch funcionarios cuando cambia la aseguradora
  useEffect(() => {
    // Limpiar funcionarios si no hay aseguradora seleccionada
    if (!formData.aseguradora) {
      setFuncionarios([]);
      setCargandoFuncionarios(false);
      return;
    }

    cargarFuncionariosAseguradora(formData.aseguradora, true);
  }, [formData.aseguradora]);

  // Log para mostrar el estado final de los datos cargados
  useEffect(() => {
}, [estados, aseguradoras, responsables, clasificaciones, ciudades, funcionarios]);


  const onEditarCaso = (caso, idx) => {
    // Mapeo robusto para todos los campos relacionales
    // Aseguradora
    let aseguradoraValue = '';
    if (caso.codiAsgrdra) {
      aseguradoraValue = String(caso.codiAsgrdra);
    } else if (caso.aseguradora) {
      const found = aseguradoras.find(a => a.rzonSocial === caso.aseguradora);
      aseguradoraValue = found ? String(found.codiAsgrdra) : '';
    }
    // Responsable (inspector) - prioriza codiIspector
    let responsableValue = '';
    if (caso.codiIspector) {
      responsableValue = String(caso.codiIspector);
    } else if (caso.codiRespnsble) {
      responsableValue = String(caso.codiRespnsble);
    } else if (caso.responsable) {
      const found = responsables.find(r => r.nmbrRespnsble === caso.responsable);
      responsableValue = found ? String(found.codiRespnsble) : '';
    } else if (caso.funcSolicita) {
      const found = responsables.find(r => r.nmbrRespnsble === caso.funcSolicita);
      responsableValue = found ? String(found.codiRespnsble) : '';
    }
    // Estado
    let estadoValue = '';
    if (caso.codiEstdo) {
      estadoValue = String(caso.codiEstdo);
    } else if (caso.estado) {
      const found = estados.find(e => e.descEstdo === caso.estado);
      estadoValue = found ? String(found.codiEstdo) : '';
    }
    // Ciudad (Ciudad de Inspección - usar codigoPoblado primero)
    let ciudadValue = null;
    const codigoCiudad = caso.codigoPoblado || caso.ciudadSucursal || caso.ciudad;
    if (codigoCiudad) {
      ciudadValue = ciudades.find(c => 
        c.value === codigoCiudad || 
        String(c.value) === String(codigoCiudad) ||
        c.label.startsWith(String(codigoCiudad))
      );
    }
    // Clasificación
    let clasificacionValue = '';
    if (caso.codiClasificacion) {
      clasificacionValue = String(caso.codiClasificacion);
    } else if (caso.clasificacion) {
      const found = clasificaciones.find(c => c.rzonDescripcion === caso.clasificacion);
      clasificacionValue = found ? String(found.codiIdentificador) : '';
    }
    // Quien Solicita
    let quienSolicitaValue = null;
    if (caso.funcSolicita) {
      // Buscar el funcionario en la lista de funcionarios cargados
      const funcionarioEncontrado = funcionarios.find(f => 
        String(f.value) === String(caso.funcSolicita) || 
        String(f.label) === String(caso.funcSolicita)
      );
      if (funcionarioEncontrado) {
        quienSolicitaValue = funcionarioEncontrado;
      } else {
        // Si no se encuentra, usar el código como fallback temporal
        quienSolicitaValue = { label: caso.funcSolicita, value: caso.funcSolicita };
      }
    } else if (caso.quienSolicita) {
      // Si quienSolicita es un objeto, usarlo directamente
      if (typeof caso.quienSolicita === 'object') {
        quienSolicitaValue = caso.quienSolicita;
      } else {
        // Buscar el funcionario por nombre
        const funcionarioEncontrado = funcionarios.find(f => 
          String(f.label) === String(caso.quienSolicita)
        );
        if (funcionarioEncontrado) {
          quienSolicitaValue = funcionarioEncontrado;
        } else {
          quienSolicitaValue = { label: caso.quienSolicita, value: caso.quienSolicita };
        }
      }
    }
    setFormData({
      _id: caso._id || caso.id || caso.id_riesgo || '',
      nmroRiesgo: caso.nmroRiesgo || '',
      aseguradora: aseguradoraValue,
      responsable: responsableValue,
      codiEstdo: estadoValue,
      ciudad: ciudadValue,
      codiClasificacion: clasificacionValue,
      quienSolicita: quienSolicitaValue,
      // ...otros campos normales...
      codiIspector: caso.codiIspector || '',
      codiAsgrdra: caso.codiAsgrdra || '',
      asgrBenfcro: caso.asgrBenfcro || '',
      nmroConsecutivo: caso.nmroConsecutivo || '',
      fchaAsgncion: caso.fchaAsgncion ? new Date(caso.fchaAsgncion).toISOString().slice(0,10) : '',
      observAsignacion: caso.observAsignacion || '',
      adjuntoAsignacion: caso.adjuntoAsignacion || null,
      fchaContIni: caso.fchaContIni ? new Date(caso.fchaContIni).toISOString().slice(0,10) : '',
      observContIni: caso.observContIni || '',
      adjuntoContIni: caso.adjuntoContIni || null,
      fchaInspccion: caso.fchaInspccion ? new Date(caso.fchaInspccion).toISOString().slice(0,10) : '',
      observInspeccion: caso.observInspeccion || '',
      adjuntoInspeccion: caso.adjuntoInspeccion || null,
      fchaInforme: caso.fchaInforme ? new Date(caso.fchaInforme).toISOString().slice(0,10) : '',
      anxoInfoFnal: caso.anxoInfoFnal || null,
      observInforme: caso.observInforme || '',
      codDireccion: caso.codDireccion || '',
      funcSolicita: caso.funcSolicita || '',
      codigoPoblado: caso.codigoPoblado || '',
      ciudadSucursal: caso.ciudadSucursal || '',
      vlorTarifaAseguradora: caso.vlorTarifaAseguradora || '',
      vlorHonorarios: caso.vlorHonorarios || '',
      vlorGastos: caso.vlorGastos || '',
      nmroFactra: caso.nmroFactra || '',
      fchaFactra: caso.fchaFactra ? new Date(caso.fchaFactra).toISOString().slice(0,10) : '',
      totalPagado: caso.totalPagado || '',
      anxoFactra: caso.anxoFactra || null,
      asegurado: caso.asgrBenfcro || caso.asegurado || '',
      direccion: caso.codDireccion || caso.direccion || '',
      fechaAsignacion: caso.fchaAsgncion ? new Date(caso.fchaAsgncion).toISOString().slice(0,10) : '',
      fechaInspeccion: caso.fchaInspccion ? new Date(caso.fchaInspccion).toISOString().slice(0,10) : '',
      observaciones: caso.observInspeccion || '',
    });
    setEditando(true);
    setCasoEditadoIndex(idx);
    setPestanaActiva('activacion');
    
    // Cargar funcionarios de la aseguradora si hay una seleccionada
    if (aseguradoraValue) {
      cargarFuncionariosAseguradora(aseguradoraValue, true);
    }
  };

  // Cargar funcionarios cuando se inicializa el formulario con datos (modo edición)
  useEffect(() => {
    if (formData.aseguradora && aseguradoras.length > 0) {
      // Si hay una aseguradora seleccionada, cargar sus funcionarios
      cargarFuncionariosAseguradora(formData.aseguradora, true);
    }
  }, [formData.aseguradora, aseguradoras.length]);

  // Actualizar quienSolicita cuando se carguen los funcionarios y haya un funcSolicita
  useEffect(() => {
    if (funcionarios.length > 0 && formData.funcSolicita && (casoInicial || editando)) {
      // Buscar el funcionario por código
      const funcionarioEncontrado = funcionarios.find(f => 
        String(f.value) === String(formData.funcSolicita) ||
        String(f.label) === String(formData.funcSolicita)
      );
      
      if (funcionarioEncontrado) {
        // Solo actualizar si el valor actual es diferente (evitar loops infinitos)
        const valorActual = formData.quienSolicita && typeof formData.quienSolicita === 'object' 
          ? formData.quienSolicita.value 
          : formData.quienSolicita;
        
        if (String(funcionarioEncontrado.value) !== String(valorActual)) {
          setFormData(prev => ({
            ...prev,
            quienSolicita: funcionarioEncontrado
          }));
        }
      }
    }
  }, [funcionarios, formData.funcSolicita, casoInicial, editando]);

  // Si recibimos casoInicial, llenamos el formulario automáticamente
  useEffect(() => {
    if (casoInicial) {
      // Copia la lógica de onEditarCaso pero usando casoInicial
      // (puedes extraer la lógica a una función para evitar duplicidad)
      let aseguradoraValue = '';
      if (casoInicial.codiAsgrdra) {
        aseguradoraValue = String(casoInicial.codiAsgrdra);
      } else if (casoInicial.aseguradora) {
        const found = aseguradoras.find(a => a.rzonSocial === casoInicial.aseguradora);
        aseguradoraValue = found ? String(found.codiAsgrdra) : '';
      }
      let responsableValue = '';
      if (casoInicial.codiIspector) {
        responsableValue = String(casoInicial.codiIspector);
      } else if (casoInicial.codiRespnsble) {
        responsableValue = String(casoInicial.codiRespnsble);
      } else if (casoInicial.responsable) {
        const found = responsables.find(r => r.nmbrRespnsble === casoInicial.responsable);
        responsableValue = found ? String(found.codiRespnsble) : '';
      } else if (casoInicial.funcSolicita) {
        const found = responsables.find(r => r.nmbrRespnsble === casoInicial.funcSolicita);
        responsableValue = found ? String(found.codiRespnsble) : '';
      }
      let estadoValue = '';
      if (casoInicial.codiEstdo) {
        estadoValue = String(casoInicial.codiEstdo);
      } else if (casoInicial.estado) {
        const found = estados.find(e => e.descEstdo === casoInicial.estado);
        estadoValue = found ? String(found.codiEstdo) : '';
      }
      let ciudadValue = null;
      const codigoCiudad = casoInicial.codigoPoblado || casoInicial.ciudadSucursal || casoInicial.ciudad;
      if (codigoCiudad) {
        ciudadValue = ciudades.find(c => 
          c.value === codigoCiudad || 
          String(c.value) === String(codigoCiudad) ||
          c.label.startsWith(String(codigoCiudad))
        );
      }
      let clasificacionValue = '';
      if (casoInicial.codiClasificacion) {
        clasificacionValue = String(casoInicial.codiClasificacion);
      } else if (casoInicial.clasificacion) {
        const found = clasificaciones.find(c => c.rzonDescripcion === casoInicial.clasificacion);
        clasificacionValue = found ? String(found.codiIdentificador) : '';
      }
      let quienSolicitaValue = null;
      if (casoInicial.funcSolicita) {
        // Buscar el funcionario en la lista de funcionarios cargados
        const funcionarioEncontrado = funcionarios.find(f => 
          String(f.value) === String(casoInicial.funcSolicita) || 
          String(f.label) === String(casoInicial.funcSolicita)
        );
        if (funcionarioEncontrado) {
          quienSolicitaValue = funcionarioEncontrado;
        } else {
          // Si no se encuentra, usar el código como fallback temporal
          quienSolicitaValue = { label: casoInicial.funcSolicita, value: casoInicial.funcSolicita };
        }
      } else if (casoInicial.quienSolicita) {
        // Si quienSolicita es un objeto, usarlo directamente
        if (typeof casoInicial.quienSolicita === 'object') {
          quienSolicitaValue = casoInicial.quienSolicita;
        } else {
          // Buscar el funcionario por nombre
          const funcionarioEncontrado = funcionarios.find(f => 
            String(f.label) === String(casoInicial.quienSolicita)
          );
          if (funcionarioEncontrado) {
            quienSolicitaValue = funcionarioEncontrado;
          } else {
            quienSolicitaValue = { label: casoInicial.quienSolicita, value: casoInicial.quienSolicita };
          }
        }
      }
      setFormData({
        _id: casoInicial._id || casoInicial.id || casoInicial.id_riesgo || '',
        nmroRiesgo: casoInicial.nmroRiesgo || '',
        aseguradora: aseguradoraValue,
        responsable: responsableValue,
        codiEstdo: estadoValue,
        ciudad: ciudadValue,
        codiClasificacion: clasificacionValue,
        quienSolicita: quienSolicitaValue,
        codiIspector: casoInicial.codiIspector || '',
        codiAsgrdra: casoInicial.codiAsgrdra || '',
        asgrBenfcro: casoInicial.asgrBenfcro || '',
        nmroConsecutivo: casoInicial.nmroConsecutivo || '',
        fchaAsgncion: casoInicial.fchaAsgncion ? new Date(casoInicial.fchaAsgncion).toISOString().slice(0,10) : '',
        observAsignacion: casoInicial.observAsignacion || '',
        adjuntoAsignacion: casoInicial.adjuntoAsignacion || null,
        fchaContIni: casoInicial.fchaContIni ? new Date(casoInicial.fchaContIni).toISOString().slice(0,10) : '',
        observContIni: casoInicial.observContIni || '',
        adjuntoContIni: casoInicial.adjuntoContIni || null,
        fchaInspccion: casoInicial.fchaInspccion ? new Date(casoInicial.fchaInspccion).toISOString().slice(0,10) : '',
        observInspeccion: casoInicial.observInspeccion || '',
        adjuntoInspeccion: casoInicial.adjuntoInspeccion || null,
        fchaInforme: casoInicial.fchaInforme ? new Date(casoInicial.fchaInforme).toISOString().slice(0,10) : '',
        anxoInfoFnal: casoInicial.anxoInfoFnal || null,
        observInforme: casoInicial.observInforme || '',
        codDireccion: casoInicial.codDireccion || '',
        funcSolicita: casoInicial.funcSolicita || '',
        codigoPoblado: casoInicial.codigoPoblado || '',
        ciudadSucursal: casoInicial.ciudadSucursal || '',
        vlorTarifaAseguradora: casoInicial.vlorTarifaAseguradora || '',
        vlorHonorarios: casoInicial.vlorHonorarios || '',
        vlorGastos: casoInicial.vlorGastos || '',
        nmroFactra: casoInicial.nmroFactra || '',
        fchaFactra: casoInicial.fchaFactra ? new Date(casoInicial.fchaFactra).toISOString().slice(0,10) : '',
        totalPagado: casoInicial.totalPagado || '',
        anxoFactra: casoInicial.anxoFactra || null,
        asegurado: casoInicial.asgrBenfcro || casoInicial.asegurado || '',
        direccion: casoInicial.codDireccion || casoInicial.direccion || '',
        fechaAsignacion: casoInicial.fchaAsgncion ? new Date(casoInicial.fchaAsgncion).toISOString().slice(0,10) : '',
        fechaInspeccion: casoInicial.fchaInspccion ? new Date(casoInicial.fchaInspccion).toISOString().slice(0,10) : '',
        observaciones: casoInicial.observInspeccion || '',
      });
      setEditando(true);
      setCasoEditadoIndex(null);
      setPestanaActiva('activacion');
      
      // Cargar funcionarios de la aseguradora si hay una seleccionada
      if (aseguradoraValue) {
        cargarFuncionariosAseguradora(aseguradoraValue, true);
      }
    }
  }, [casoInicial, aseguradoras, responsables, estados, ciudades, clasificaciones]);

  const guardarCaso = async () => {
    const nuevoCaso = construirPayloadRiesgo(formData);
    if (editando) {
      const casoId = obtenerIdCaso(casoInicial, casos, casoEditadoIndex, formData);
      if (!casoId) {
        alert('⚠️ No fue posible identificar el caso a actualizar.');
        return;
      }
      try {
        const dataToSend = crearFormDataDesdePayload(nuevoCaso);
        await axios.put(`/api/riesgos/${casoId}`, dataToSend);
        await cargarCasos?.();
        alert('✅ Caso de riesgo actualizado correctamente.');
        // Limpiar autoguardado después de guardado exitoso
clearSavedData();
        if (onClose) onClose();
      } catch (err) {
        console.error('❌ Error actualizando caso de riesgo:', err);
        alert('❌ Error al guardar los cambios del caso de riesgo.');
        // Mantener autoguardado en caso de error
      }
    } else if (!editando) {
      try {
        await agregarCaso(nuevoCaso);
        // Limpiar autoguardado después de guardado exitoso
clearSavedData();
      } catch (err) {
        console.error('❌ Error agregando caso de riesgo:', err);
        // Mantener autoguardado en caso de error
      }
    }
    setFormData({ ...initialFormData });
    setEditando(false);
    setCasoEditadoIndex(null);
  };

  const nuevoCaso = () => {
    setFormData({ ...initialFormData });
  };

  const iniciarInspeccion = async () => {
    try {
      // 1. Primero guardar el caso si no está guardado
      let casoId = formData._id || formData.id_riesgo || formData.id;
      
      if (!casoId || casoId === '') {
        // Si no tiene ID, guardar el caso primero
const nuevoCaso = construirPayloadRiesgo(formData);
        const response = await axios.post(`${BASE_URL}/api/riesgos`, crearFormDataDesdePayload(nuevoCaso));
        
        if (response.data && response.data.riesgo) {
          casoId = response.data.riesgo._id || response.data.riesgo.id_riesgo;
// Actualizar formData con el ID del caso guardado
          setFormData(prev => ({
            ...prev,
            _id: casoId,
            id_riesgo: casoId
          }));
          
          // Recargar casos para tener el nuevo caso en la lista
          if (cargarCasos) {
            await cargarCasos();
          }
        } else {
          throw new Error('No se recibió ID del caso guardado');
        }
      } else {
}

      // 2. Verificar si ya existe un registro en el historial para este caso
let historialExistente = null;
      let datosParaInspeccion = { ...formData };

      try {
        const historialesDelCaso = await historialService.obtenerFormulariosPorCaso(casoId);
// Buscar si hay un historial de tipo RIESGOS para este caso
        if (historialesDelCaso && historialesDelCaso.formularios && Array.isArray(historialesDelCaso.formularios)) {
          historialExistente = historialesDelCaso.formularios.find(
            h => h.tipo === TIPOS_FORMULARIOS.RIESGOS
          );
        } else if (Array.isArray(historialesDelCaso)) {
          historialExistente = historialesDelCaso.find(
            h => h.tipo === TIPOS_FORMULARIOS.RIESGOS
          );
        }

        if (historialExistente) {
// Usar los datos del historial existente
          if (historialExistente.datos) {
            datosParaInspeccion = {
              ...datosParaInspeccion,
              ...historialExistente.datos
            };
          }
        } else {
          // 3. Si no existe, crear nuevo registro en el historial
// Generar numeroCaso y carpetaCaso basados en el número de riesgo
          const numeroRiesgo = formData.nmroRiesgo || `RIESGO-${Date.now()}`;
          const numeroCaso = numeroRiesgo;
          const carpetaCaso = `Caso_${numeroCaso}_${new Date().toISOString().split('T')[0]}`;
          
          const datosParaHistorial = {
            nmroRiesgo: formData.nmroRiesgo || '',
            aseguradora: formData.aseguradora || '',
            asegurado: formData.asegurado || formData.asgrBenfcro || '',
            direccion: formData.direccion || formData.codDireccion || '',
            ciudad: formData.ciudad ? (typeof formData.ciudad === 'object' ? formData.ciudad.label : formData.ciudad) : '',
            responsable: formData.responsable || '',
            fechaAsignacion: formData.fechaAsignacion || formData.fchaAsgncion || '',
            fechaInspeccion: formData.fechaInspeccion || formData.fchaInspccion || '',
            observaciones: formData.observaciones || formData.observAsignacion || '',
            estado: formData.estado || formData.codiEstdo || '',
            quienSolicita: formData.quienSolicita ? (typeof formData.quienSolicita === 'object' ? formData.quienSolicita.label : formData.quienSolicita) : '',
            clasificacion: formData.clasificacion ? (typeof formData.clasificacion === 'object' ? formData.clasificacion.label : formData.clasificacion) : '',
            casoId: casoId,
            numeroCaso: numeroCaso,
            carpetaCaso: carpetaCaso
          };

          const formularioHistorial = historialService.crearFormulario(
            TIPOS_FORMULARIOS.RIESGOS,
            `Caso de Riesgo - ${formData.nmroRiesgo || 'Nuevo'}`,
            datosParaHistorial,
            null, // archivo (se puede agregar después si es necesario)
            ESTADOS_FORMULARIO.EN_PROCESO
          );

          await historialService.guardarFormulario(formularioHistorial);
}
      } catch (historialError) {
        console.warn('⚠️ Error al verificar historial, continuando con creación nueva:', historialError);
        // Si hay error al verificar, crear uno nuevo por seguridad
        const numeroRiesgo = formData.nmroRiesgo || `RIESGO-${Date.now()}`;
        const numeroCaso = numeroRiesgo;
        const carpetaCaso = `Caso_${numeroCaso}_${new Date().toISOString().split('T')[0]}`;
        
        const datosParaHistorial = {
          nmroRiesgo: formData.nmroRiesgo || '',
          aseguradora: formData.aseguradora || '',
          asegurado: formData.asegurado || formData.asgrBenfcro || '',
          direccion: formData.direccion || formData.codDireccion || '',
          ciudad: formData.ciudad ? (typeof formData.ciudad === 'object' ? formData.ciudad.label : formData.ciudad) : '',
          responsable: formData.responsable || '',
          fechaAsignacion: formData.fechaAsignacion || formData.fchaAsgncion || '',
          fechaInspeccion: formData.fechaInspeccion || formData.fchaInspccion || '',
          observaciones: formData.observaciones || formData.observAsignacion || '',
          estado: formData.estado || formData.codiEstdo || '',
          quienSolicita: formData.quienSolicita ? (typeof formData.quienSolicita === 'object' ? formData.quienSolicita.label : formData.quienSolicita) : '',
          clasificacion: formData.clasificacion ? (typeof formData.clasificacion === 'object' ? formData.clasificacion.label : formData.clasificacion) : '',
          casoId: casoId,
          numeroCaso: numeroCaso,
          carpetaCaso: carpetaCaso
        };

        const formularioHistorial = historialService.crearFormulario(
          TIPOS_FORMULARIOS.RIESGOS,
          `Caso de Riesgo - ${formData.nmroRiesgo || 'Nuevo'}`,
          datosParaHistorial,
          null,
          ESTADOS_FORMULARIO.EN_PROCESO
        );

        await historialService.guardarFormulario(formularioHistorial);
      }

      // 4. Extraer y normalizar datos para el formulario de inspección
      // Extraer ciudad (puede ser objeto o string)
      let ciudadSiniestro = '';
      let departamentoSiniestro = '';
      let municipioNombre = '';
      let ciudadObjeto = null; // Para pasar al Select si es necesario
      
      if (datosParaInspeccion.ciudad) {
        if (typeof datosParaInspeccion.ciudad === 'object' && datosParaInspeccion.ciudad !== null) {
          // Si es objeto, extraer todos los valores posibles
          const ciudadLabel = datosParaInspeccion.ciudad.label || '';
          const ciudadValue = datosParaInspeccion.ciudad.value || datosParaInspeccion.ciudad.descMunicipio || '';
          const ciudadNombre = datosParaInspeccion.ciudad.descMunicipio || datosParaInspeccion.ciudad.nombre || '';
          
          // Extraer solo el nombre de la ciudad (sin el departamento) del label si tiene formato "Ciudad - Departamento"
          if (ciudadLabel.includes(' - ')) {
            ciudadSiniestro = ciudadLabel.split(' - ')[0].trim();
            departamentoSiniestro = ciudadLabel.split(' - ')[1]?.trim() || datosParaInspeccion.ciudad.departamento || datosParaInspeccion.ciudad.descDepto || '';
          } else {
            ciudadSiniestro = ciudadNombre || ciudadValue || ciudadLabel;
            departamentoSiniestro = datosParaInspeccion.ciudad.departamento || datosParaInspeccion.ciudad.descDepto || '';
          }
          
          municipioNombre = ciudadNombre || ciudadSiniestro;
          
          // Crear objeto para el Select si tiene la estructura correcta
          if (ciudadValue || ciudadNombre) {
            ciudadObjeto = {
              value: ciudadValue || ciudadNombre || ciudadSiniestro,
              label: ciudadLabel || `${ciudadSiniestro} - ${departamentoSiniestro}`,
              departamento: departamentoSiniestro
            };
          }
        } else if (typeof datosParaInspeccion.ciudad === 'string') {
          // Si es string, puede venir como "Ciudad - Departamento" o solo "Ciudad"
          if (datosParaInspeccion.ciudad.includes(' - ')) {
            ciudadSiniestro = datosParaInspeccion.ciudad.split(' - ')[0].trim();
            departamentoSiniestro = datosParaInspeccion.ciudad.split(' - ')[1]?.trim() || '';
          } else {
            ciudadSiniestro = datosParaInspeccion.ciudad;
          }
          municipioNombre = ciudadSiniestro;
        }
      }
      
      // Extraer aseguradora (puede ser código o nombre)
      let aseguradoraNombre = '';
      if (datosParaInspeccion.aseguradora) {
        if (typeof datosParaInspeccion.aseguradora === 'string') {
          // Buscar el nombre de la aseguradora en la lista
          const aseguradoraEncontrada = aseguradoras.find(a => 
            String(a.codiAsgrdra) === String(datosParaInspeccion.aseguradora) ||
            a.rzonSocial === datosParaInspeccion.aseguradora
          );
          aseguradoraNombre = aseguradoraEncontrada ? aseguradoraEncontrada.rzonSocial : datosParaInspeccion.aseguradora;
        } else {
          aseguradoraNombre = datosParaInspeccion.aseguradora.rzonSocial || datosParaInspeccion.aseguradora.label || '';
        }
      }
      
      // Extraer dirección
      const direccionCompleta = datosParaInspeccion.direccion || datosParaInspeccion.codDireccion || '';
      
      // Extraer nombre de empresa/asegurado
      const nombreEmpresa = datosParaInspeccion.asegurado || datosParaInspeccion.asgrBenfcro || '';
      
      // Extraer otros campos
      const quienSolicitaNombre = datosParaInspeccion.quienSolicita 
        ? (typeof datosParaInspeccion.quienSolicita === 'object' ? datosParaInspeccion.quienSolicita.label : datosParaInspeccion.quienSolicita)
        : '';
      
      const clasificacionNombre = datosParaInspeccion.clasificacion 
        ? (typeof datosParaInspeccion.clasificacion === 'object' ? datosParaInspeccion.clasificacion.label : datosParaInspeccion.clasificacion)
        : '';

// 5. Navegar al formulario de inspección con los datos relevantes
    navigate('/formularioinspeccion', {
      state: {
          ...datosParaInspeccion,
          // Información general
          nombreCliente: nombreEmpresa,
          nombreEmpresa: nombreEmpresa,
          direccion: direccionCompleta,
          municipio: municipioNombre,
          departamento: departamentoSiniestro,
          // Ciudad: pasar como string (nombre solo) para que el Select lo encuentre
          ciudad_siniestro: ciudadSiniestro,
          departamento_siniestro: departamentoSiniestro,
          ciudad: ciudadSiniestro,
          // Aseguradora
          aseguradora: aseguradoraNombre || datosParaInspeccion.aseguradora || '',
          aseguradora_codigo: typeof datosParaInspeccion.aseguradora === 'string' ? datosParaInspeccion.aseguradora : (datosParaInspeccion.aseguradora?.codiAsgrdra || ''),
          // Otros campos
          quienSolicita: quienSolicitaNombre,
          clasificacion: clasificacionNombre,
          // Para el mapa (si hay coordenadas disponibles)
          direccionRiesgo: direccionCompleta,
          coordenadasRiesgo: datosParaInspeccion.coordenadasRiesgo || datosParaInspeccion.coordenadas || '',
          // Metadata
          casoId: casoId,
          desdeRiesgo: true,
          historialExistente: !!historialExistente
        }
      });
    } catch (error) {
      console.error('❌ Error al iniciar inspección:', error);
      alert(`❌ Error al iniciar inspección: ${error.message || 'Error desconocido'}`);
    }
  };

  const renderizarContenido = () => {
    switch (pestanaActiva) {
      case 'activacion':
        return <ActivacionRiesgo formData={formData} setFormData={setFormData} estados={estados} aseguradoras={aseguradoras} responsables={responsables} clasificaciones={clasificaciones} ciudades={ciudades} funcionarios={funcionarios} cargandoFuncionarios={cargandoFuncionarios} />;
      case 'trazabilidad':
        return <TrazabilidadRiesgo 
          formData={formData} 
          setFormData={setFormData}
          handleChange={(e) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
          }} 
          onSelectFiles={(tipo, campo, archivos) => {
            // El archivo queda en formData y se envía como multipart al guardar el caso
            const archivo = archivos?.[0];
            if (!campo || !archivo) return;
            setFormData(prev => ({ ...prev, [campo]: archivo }));
          }} 
          historialDocs={[]}
          ciudades={ciudades}
        />;
      case 'seguimiento':
        return <SeguimientoRiesgo formData={formData} setFormData={setFormData} ciudades={ciudades} />;
      case 'facturacion':
        return <FacturacionRiesgo formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  // Función para saber si hay coincidencia en algún campo
  const hayCoincidencia = (valor) => {
    if (!busqueda.trim()) return false;
    if (!valor) return false;
    return valor.toString().toLowerCase().includes(busqueda.toLowerCase());
  };

  // Ejemplo usando fetch (puedes usar axios si prefieres)
  useEffect(() => {
    if (busqueda.trim() === "") return; // No buscar si está vacío

    fetch(`/api/casos?busqueda=${encodeURIComponent(busqueda)}`)
      .then(res => res.json())
      .then(data => {
        // Aquí actualizas tu lista de casos con los resultados del backend
        // setCasos(data);
      });
  }, [busqueda]);

  useEffect(() => {
    if (id && casos.length > 0) {
      const idx = casos.findIndex(
        c => c._id?.toString() === id || c.id_riesgo?.toString() === id || c.id?.toString() === id
      );
      if (idx !== -1) {
        onEditarCaso(casos[idx], idx);
      }
    }
    // eslint-disable-next-line
  }, [id, casos]);

  // Efecto para auto-seleccionar responsable cuando la lista esté lista y estés editando
  useEffect(() => {
    if (editando && responsables.length > 0 && casoEditadoIndex !== null) {
      const caso = casos[casoEditadoIndex];
      if (caso && (!formData.responsable || formData.responsable === '')) {
        setFormData(prev => ({
          ...prev,
          responsable: caso.codiRespnsble ? String(caso.codiRespnsble) : (caso.responsable || ''),
        }));
      }
    }
    // eslint-disable-next-line
  }, [responsables, editando, casoEditadoIndex]);

  return (
    <div className={riesgoFormRoot}>
      <div className={`${riesgoScope} ${riesgoPageWrapWide}`}>
        <RiesgoPageHeader
          title="Gestión de casos de riesgo"
          subtitle="Activación, trazabilidad, seguimiento y facturación."
          showNav={false}
        />

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A] sm:p-6">
          <RiesgoNavPanel activePath="/riesgos/agregar" />
        <RiesgoFormTabs
          tabs={PESTANAS_RIESGO}
          activeId={pestanaActiva}
          onChange={setPestanaActiva}
        />

        <div className="flex justify-center py-2">
          <InputFenix
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el formulario..."
            className="max-w-lg"
          />
        </div>

        {formData.nmroRiesgo && (
          <div className="text-center">
            <span className="font-heading text-xl font-bold text-fenix-primario sm:text-2xl">
              N° Riesgo: {formData.nmroRiesgo}
            </span>
          </div>
        )}

        {renderizarContenido()}

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={guardarCaso} className={`${riesgoBtnSuccess} w-full sm:w-auto`}>
            Guardar
          </button>
          <button type="button" onClick={nuevoCaso} className={`${riesgoBtnSecondary} w-full sm:w-auto`}>
            Nuevo caso
          </button>
          <button type="button" onClick={iniciarInspeccion} className={`${riesgoBtnInfo} w-full sm:w-auto`}>
            Iniciar inspección
          </button>
        </div>

      {/* Lista de casos */}
      {!casoInicial && (
        <div className="mt-4 sm:mt-6">
          <ListaCasosRiesgo onEditarCaso={onEditarCaso} ciudades={ciudades} estados={estados} />
        </div>
      )}

      <div className="mt-3 font-body text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
        <p className="mb-1">
          {formData.ciudad && formData.ciudad.label
            ? formData.ciudad.label.split('/')[0]
            : ''}
        </p>
        <p>{formData.ciudad_siniestro ? formData.ciudad_siniestro.split('/')[0] : '_________'}</p>
      </div>

      {/* Componentes de autoguardado */}
      <AutoSaveNotification
        isEnabled={isAutoSaveEnabled}
        lastSaveTime={lastSaveTime}
        saveStatus={saveStatus}
        onEnable={enableAutoSave}
        onDisable={disableAutoSave}
        onSaveNow={saveNow}
        hasUnsavedChanges={false}
        showEnablePrompt={false}
        onDismissPrompt={() => {}}
      />

      <AutoSaveRestoreDialog
        isOpen={showRestoreDialog}
        savedData={savedDataToRestore?.data}
        metadata={savedDataToRestore?.metadata}
        onRestore={handleRestoreData}
        onDiscard={handleDiscardSavedData}
        onCancel={handleCancelRestore}
      />
        </div>
      </div>
    </div>
  );
};

export default AgregarCasoRiesgo;
