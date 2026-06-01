import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, HeadingLevel, ImageRun, Header, WidthType, Media, VerticalAlign, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { formatearFechaParaWord, obtenerFechaActualISO, obtenerFechaHoraActualISO } from '../../utils/fechaUtils';
import { useTheme } from '../../context/ThemeContext';

import DatosGeneralesAjuste from "./DatosGeneralesAjuste";
import AntecedentesAjuste from "./AntecedentesAjuste";
import DescripcionRiesgoAjuste from "./DescripcionRiesgoAjuste";
import CircunstanciaSiniestroAjuste from "./CircunstanciaSiniestroAjuste";
import InspeccionFotograficaAjuste from "./InspeccionFotograficaAjuste";
import CausaAjuste from "./CausaAjuste";
import ReservaSugeridaAjuste from "./ReservaSugeridaAjuste";
import FirmaAjuste from "./FirmaAjuste";
import ObservacionesPreeliminar from "./ObservacionesPreeliminar";
import AnalisisCoberturaAjuste from "./AnalisisCoberturaAjuste";
import SalvamentosAjuste from "./SalvamentosAjuste";
import RecobroAjuste from "./RecobroAjuste";
import { obtenerNumeracionSecciones } from "./numeracionSeccionesAjuste";
import LiquidadorAjuste from "./LiquidadorAjuste";
import ActaInspeccionAjuste from "./ActaInspeccionAjuste";
import ChatbotIA from "./ChatbotIA";
import MapaGoogleEarth from '../MapaGoogleEarth';
import ModalConfirmacion from '../ModalConfirmacion';

import Logo from '../../img/Logo.png';
import firmaIskharlyImg from '../../img/FIRMAISKHARLY.png';

import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';
import { aseguradorasConFuncionarios } from '../../data/aseguradorasFuncionarios.js';
import colombia from '../../data/colombia.json';
import API_CONFIG, { getUploadsUrlCandidates, resolveUploadsUrl } from '../../config/apiConfig.js';
import { getAutofillAjusteDesdeComplex, getCasoComplex, updateCasoComplex } from '../../services/complexService.js';
import { resolverFechaReporteDesdeAsignacion } from '../../utils/prefillAjusteDesdeCasoComplex.js';
import { tituloAjuste, subtituloAjuste } from './formatoTitulosAjuste';
import {
  calcularTotalReservaSugeridaItems,
  formatearMontoReserva,
  resumenTextoParaTablaWord
} from '../../utils/reservaSugeridaUtils';

// Datos maestros para llenado automático
const DATOS_MAESTROS = {
  aseguradoras: Object.keys(aseguradorasConFuncionarios).map(nombre => ({
    id: nombre.toLowerCase().replace(/\s+/g, '_'),
    nombre: nombre,
    funcionarios: aseguradorasConFuncionarios[nombre],
    sucursales: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena'],
    direcciones: ['Calle Principal #123', 'Carrera Central #456', 'Avenida Comercial #789'],
    telefonos: ['+57 1 2345678', '+57 4 5678901', '+57 2 3456789'],
    emails: ['contacto@empresa.com', 'sucursal@empresa.com', 'atención@empresa.com']
  })),
  ciudades: colombia.flatMap(dep => 
    dep.ciudades.map(ciudad => ({
      id: ciudad.toLowerCase().replace(/\s+/g, '_'),
      nombre: ciudad,
      departamento: dep.departamento,
      codigoPostal: '000000',
      zona: 'Centro',
      clima: 'Templado',
      altitud: '1000 msnm'
    }))
  ),
  tiposEvento: [
    'Incendio', 'Inundación', 'Robo', 'Accidente', 'Daño por agua',
    'Vandalismo', 'Falla eléctrica', 'Desastre natural', 'Otro'
  ],
  intermediarios: [
    'Seguros del Estado', 'Aseguradora de Colombia', 'Corredores Unidos',
    'Intermediarios Profesionales', 'Otro'
  ]
};

export default function FormularioAjuste() {
  const { theme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Colores según el tema
  const bgMain = theme === 'dark' ? '#1A1A1A' : '#F5F5F7';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  
  // Estado para mantener el ID del formulario
  const [formularioId, setFormularioId] = useState(id);
  
  // Log para verificar el ID al cargar el componente
  console.log('🔍 === CARGA DEL COMPONENTE ===');
  console.log('🔍 ID obtenido de useParams:', id);
  console.log('🔍 Tipo de ID:', typeof id);
  console.log('🔍 URL actual:', window.location.href);
  console.log('🔍 Pathname:', window.location.pathname);
  console.log('🔍 === FIN CARGA ===');
  
  // Actualizar formularioId cuando id cambie
  useEffect(() => {
    if (id && id !== 'nuevo') {
      setFormularioId(id);
      console.log('✅ ID actualizado en estado:', id);
    }
  }, [id]);

  // Evitar duplicados: si entran a /ajuste y ya existe un formulario del mismo numeroAjuste, redirigir a editar.
  useEffect(() => {
    if (id && id !== 'nuevo') return;

    const desdeState = location.state || {};
    const numeroAjusteCrudo = String(
      desdeState?.numeroCaso ||
      desdeState?.nmroAjste ||
      desdeState?.numeroAjuste ||
      ''
    ).trim();
    const numeroAjuste = numeroAjusteCrudo.toUpperCase().replace(/\s+/g, '');
    if (!numeroAjuste) return;

    let cancelado = false;
    const buscarYRedirigir = async () => {
      try {
        const secuenciaResp = await historialService.obtenerSecuenciaPorNumeroAjuste(numeroAjuste);
        const idExistente = secuenciaResp?.formularioId || secuenciaResp?.secuencia?.formularioId;
        if (!cancelado && idExistente) {
          navigate(`/ajuste/editar/${idExistente}`, { state: desdeState });
        }
      } catch (error) {
        // Si no existe secuencia o falla temporalmente, continuar en modo nuevo sin interrumpir al usuario.
        console.warn('⚠️ No se encontró secuencia previa para redirección automática:', error?.message || error);
      }
    };

    buscarYRedirigir();
    return () => { cancelado = true; };
  }, [id, location.state, navigate]);
  
  // Verificar que TIPOS_FORMULARIOS esté disponible
  console.log('🔍 TIPOS_FORMULARIOS disponibles:', TIPOS_FORMULARIOS);
  console.log('🔍 TIPOS_FORMULARIOS.AJUSTE:', TIPOS_FORMULARIOS?.AJUSTE);
  
  const [formData, setFormData] = useState({
    destinatario: '',
    cargo: '',
    empresa: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    telefono: '',
    email: '',
    fechaSiniestro: '',
    fechaOcurrencia: '',
    horaSiniestro: '',
    horaOcurrencia: '',
    numeroSiniestro: '',
    numeroPoliza: '',
    aseguradora: '',
    ramo: '',
    vigenciaDesde: '',
    vigenciaHasta: '',
    asegurado: '',
    tomador: '',
    beneficiario: '',
    tipoSiniestro: '',
    tipoEvento: '',
    funcionarioAsigna: '',
    descripcionSiniestro: '',
    antecedentes: '',
    actividad: '',
    ciudadDestino: '',
    paisDestino: '',
    numeroReporte: '',
    versionReporte: '',
    codigoReporte: '',
    valorAsegurado: '',
    valorSiniestro: '',
    direccionRiesgo: '',
    coordenadasRiesgo: '',
    codigoPostal: '',
    fechaReporte: '',
    descripcionRiesgo: '',
    circunstanciasSiniestro: '',
    causa: '',
    reservaSugerida: '',
    reservaSugeridaItems: [],
    fechaInspeccion: '',
    horaInspeccion: '',
    inspector: '',
    descripcionInspeccion: '',
    conclusiones: '',
    recomendaciones: '',
    anexos: [],
    imagenesInspeccion: [],
    /** Captura del mapa: string data URL en sesión, o { ruta, nombre, tipoMime } tras guardar en historial */
    imagenMapa: null,
    // Campos de metadatos
    titulo: '',
    tipo: '',
    _id: '',
    id: '',
    usuario: '',
    fechaCreacion: '',
    fechaModificacion: '',
    estado: '',
    metadata: {},
    auditoria: {},
    comentarios: [],
    archivo: null,
    versiones: {},
    estadoActual: id && id !== 'nuevo' ? 'inicial' : 'actaInspeccion',
    casoId: '',
    numeroCaso: '',
    carpetaCaso: '',
    // Campos de firma
    funcionarioFirma: '',
    cargoFuncionario: '',
    telefonoFuncionario: '',
    emailFuncionario: '',
    // Firma de Iskharly
    firmaIskharly: '',
    // Firma del funcionario (si tiene firma)
    firmaFuncionario: '',
    // Campos para versión preeliminar
    observacionesPreeliminar: '',
    analisisCobertura: '',
    observacionesGenerales: '',
    // Campos del análisis de cobertura
    coberturasAplicables: '',
    exclusiones: '',
    garantias: '',
    // Campos de observaciones generales
    solicitudDocumentos: '',
    declinacion: '',
    proximosPasos: '',
    // Campos para versión de actualización
    fechaActualizacion: '',
    cambiosDesdePreeliminar: '',
    nuevaInformacion: '',
    observacionesActualizacion: '',
    // Campos para informe final
    fechaInformeFinal: '',
    conclusionesFinales: '',
    recomendacionesFinales: '',
    observacionesInformeFinal: '',
    // Campos para la parte final del formulario
    liquidacionPerdida: {
      infraseguro: '',
      demerito: '',
      avanceTecnologico: ''
    },
    indemnizacion: {
      deducible: '',
      subrogacion: ''
    },
    salvamentos: '',
    recobro: '',
    // Resumen corto para la tabla «INFORMACIÓN DETALLADA» del Word (no se autocompleta desde las secciones largas)
    tablaRecobro: '',
    tablaSalvamento: '',
    tablaInfraseguro: '',
    panoramaRiesgos: '',
    // Acta de inspección (paso 1 del flujo de ajuste; se incluye en el Word del informe)
    tipoRiesgoActa: '',
    identificacionActa: '',
    actaObservaciones: '',
    actaClienteNombre: '',
    actaClienteCargo: '',
    actaClienteEmail: '',
    actaClienteFirma: '',
    // Firma del ajustador en el acta (independiente del paso «Firmas» del informe)
    actaAjustadorFuncionarioId: '',
    actaAjustadorNombre: '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    actaFirmas: [{ nombre: '', cargo: '', cc: '', firma: null }],
    // Campos personalizados para información detallada
    camposPersonalizados: [],
    // Liquidador (solo para versión final)
    liquidador: {
      items: [],
      limiteAsegurado: '',
      deduciblePorcentaje: 15,
      deducibleSMMLV: false,
      valorSMMLV: 0,
      cantidadSMMLV: 4,
      // Valores de la tabla de resumen (editables independientes)
      resumenTotalAjustado: '',
      resumenDeducible15: '',
      resumenDeducibleSMMLV: '',
      resumenTotalIndemnizar: ''
    }
  });

  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Nuevo estado para la información del mapa
  const [mapaInfo, setMapaInfo] = useState({
    imagen: null,
    coordenadas: null,
    direccion: '',
    posicion: null,
    zoom: 15
  });

  const mapaInfoRef = useRef(mapaInfo);
  useEffect(() => {
    mapaInfoRef.current = mapaInfo;
  }, [mapaInfo]);

  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

  const forzarCapturaMapaAntesDePersistir = async () => {
    setForzarCapturaMapa((p) => p + 1);
    await new Promise((r) => setTimeout(r, 1600));
  };

  const capturaMapaUrlParaMapa = useMemo(() => {
    const im = formData.imagenMapa;
    if (!im) return '';
    if (typeof im === 'string') return im;
    if (im.ruta) return resolveUploadsUrl(im.ruta) || '';
    return '';
  }, [formData.imagenMapa]);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [archivoGenerado, setArchivoGenerado] = useState(null);
  const [archivoGeneradoBlob, setArchivoGeneradoBlob] = useState(null);
  const [autofillState, setAutofillState] = useState({
    loading: false,
    partial: false,
    error: ''
  });
  
  // Estado para manejar versiones
  const [estadoActual, setEstadoActual] = useState(() =>
    id && id !== 'nuevo' ? 'inicial' : 'actaInspeccion'
  );
  // Evita autoguardado en localStorage con el borrador vacío mientras llega el caso desde el historial
  const permitirAutoguardadoLocalRef = useRef(!id || id === 'nuevo');
  const [versiones, setVersiones] = useState({
    inicial: null,
    preeliminar: null,
    actualizacion: null,
    informeFinal: null
  });

  const numsSeccion = useMemo(
    () => obtenerNumeracionSecciones(estadoActual),
    [estadoActual]
  );

  // Cargar firmas desde localStorage al inicializar el formulario
  useEffect(() => {
    console.log('🔄 Cargando firmas desde localStorage...');
    
    // Cargar firma de Iskharly (localStorage o imagen por defecto del proyecto)
    const cargarFirmaIskharly = async () => {
      const firmaIskharlyGuardada = localStorage.getItem('proser_firma_isharly');
      if (firmaIskharlyGuardada) {
        console.log('✅ Firma de Iskharly encontrada en localStorage');
        setFormData((prev) => ({
          ...prev,
          firmaIskharly: firmaIskharlyGuardada
        }));
        return;
      }
      try {
        const response = await fetch(firmaIskharlyImg);
        const blob = await response.blob();
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (base64) {
          console.log('✅ Firma de Iskharly cargada desde imagen por defecto');
          setFormData((prev) => ({
            ...prev,
            firmaIskharly: base64
          }));
        }
      } catch (error) {
        console.error('❌ No se pudo cargar la firma por defecto de Iskharly:', error);
      }
    };
    cargarFirmaIskharly();
    
    // Cargar funcionarios y sus firmas
    const funcionariosGuardados = localStorage.getItem('proser_funcionarios');
    if (funcionariosGuardados) {
      const funcionarios = JSON.parse(funcionariosGuardados);
      console.log('✅ Funcionarios encontrados en localStorage:', funcionarios.length);
      
      // Buscar si hay algún funcionario con firma
      const funcionarioConFirma = funcionarios.find(f => f.firma);
      if (funcionarioConFirma) {
        console.log('✅ Funcionario con firma encontrado:', funcionarioConFirma.nombre);
        setFormData(prev => ({
          ...prev,
          firmaFuncionario: funcionarioConFirma.firma,
          funcionarioFirma: funcionarioConFirma.nombre,
          cargoFuncionario: funcionarioConFirma.cargo,
          telefonoFuncionario: funcionarioConFirma.telefono,
          emailFuncionario: funcionarioConFirma.email
        }));
      }
    }
  }, []); // Solo ejecutar una vez al montar el componente

  useEffect(() => {
    permitirAutoguardadoLocalRef.current = !id || id === 'nuevo';
  }, [id]);

  // Cargar datos desde localStorage al iniciar (solo si no hay ID)
  useEffect(() => {
    if (!id || id === 'nuevo') {
      const datosGuardados = localStorage.getItem('formularioAjuste');
      if (datosGuardados) {
        try {
          const datosParseados = JSON.parse(datosGuardados);
          if (datosParseados && typeof datosParseados === 'object') {
            setFormData(prev => ({ ...prev, ...datosParseados }));
            console.log('✅ Datos de formulario cargados desde localStorage');
          }
        } catch (error) {
          console.error('Error al cargar datos guardados:', error);
          localStorage.removeItem('formularioAjuste');
        }
      }
    }
  }, [id]);

  // Guardar datos automáticamente cuando cambien (con debounce para evitar guardados excesivos)
  // Solo se guarda si estamos en la ruta del formulario de ajuste
  useEffect(() => {
    const esRutaAjuste = location.pathname.includes('/formulario-ajuste') || location.pathname.includes('/ajuste');
    if (!esRutaAjuste) return;
    if (!permitirAutoguardadoLocalRef.current) return;

    const timeoutId = setTimeout(() => {
      try {
        const datosParaGuardar = JSON.stringify(formData);
        localStorage.setItem('formularioAjuste', datosParaGuardar);
        console.log('💾 Datos de formulario guardados en localStorage');
      } catch (error) {
        console.error('Error al guardar datos:', error);
        try {
          localStorage.removeItem('formularioAjuste');
          localStorage.setItem('formularioAjuste', JSON.stringify(formData));
        } catch (e) {
          console.error('Error crítico al guardar:', e);
        }
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, location.pathname]);

  // Guardar datos antes de refrescar la página (solo si estamos en el formulario)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const esRutaAjuste = window.location.pathname.includes('/formulario-ajuste') || window.location.pathname.includes('/ajuste');
      if (esRutaAjuste && permitirAutoguardadoLocalRef.current) {
        try {
          localStorage.setItem('formularioAjuste', JSON.stringify(formData));
        } catch (error) {
          console.error('Error al guardar antes de salir:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData]);

  // Limpiar localStorage cuando salgamos de la ruta del formulario
  useEffect(() => {
    const esRutaAjuste = location.pathname.includes('/formulario-ajuste') || location.pathname.includes('/ajuste');
    if (!esRutaAjuste) {
      console.log('🧹 Limpiando datos de localStorage al salir del formulario de ajuste');
      localStorage.removeItem('formularioAjuste');
    }

    return () => {
      setTimeout(() => {
        const sigueEnRutaAjuste = window.location.pathname.includes('/formulario-ajuste') || window.location.pathname.includes('/ajuste');
        if (!sigueEnRutaAjuste) {
          console.log('🧹 Limpiando datos de localStorage (componente desmontado)');
          localStorage.removeItem('formularioAjuste');
        }
      }, 100);
    };
  }, [location.pathname]);

  // Estado para el modal de selección de versión
  const [mostrarMenuVersiones, setMostrarMenuVersiones] = useState(false);
  
  // Estado para el menú de siguiente formulario
  const [mostrarMenuSiguienteFormulario, setMostrarMenuSiguienteFormulario] = useState(false);

  // Estado para el modal de confirmación
  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    titulo: '',
    mensaje: '',
    tipo: 'success',
    botonTexto: 'Aceptar',
    mostrarCancelar: false,
    onConfirmar: null
  });

  // Función para mostrar el menú de versiones
  const abrirMenuVersiones = () => {
    setMostrarMenuVersiones(true);
  };

  // Función para cerrar el menú de versiones
  const cerrarMenuVersiones = () => {
    setMostrarMenuVersiones(false);
  };

  // Función para mostrar el menú de siguiente formulario
  const abrirMenuSiguienteFormulario = () => {
    setMostrarMenuSiguienteFormulario(true);
  };

  // Función para cerrar el menú de siguiente formulario
  const cerrarMenuSiguienteFormulario = () => {
    setMostrarMenuSiguienteFormulario(false);
  };

  // Funciones para manejar el modal de confirmación
  const mostrarModalConfirmacion = (titulo, mensaje, tipo = 'success', botonTexto = 'Aceptar', mostrarCancelar = false, onConfirmar = null) => {
    setModalConfirmacion({
      isOpen: true,
      titulo,
      mensaje,
      tipo,
      botonTexto,
      mostrarCancelar,
      onConfirmar
    });
  };

  const cerrarModalConfirmacion = () => {
    setModalConfirmacion(prev => ({ ...prev, isOpen: false }));
  };

  // Funciones para historial
  const guardarFormulario = async (datos) => {
    try {
      return await historialService.guardarFormulario(datos);
    } catch (error) {
      console.error('Error guardando formulario:', error);
      throw error;
    }
  };

  const obtenerFormulario = async (id) => {
    try {
      console.log('🔍 obtenerFormulario llamado con ID:', id);
      console.log('🔍 Tipo de ID:', typeof id);
      console.log('🔍 ID es string?', typeof id === 'string');
      console.log('🔍 ID es objeto?', typeof id === 'object');
      
      if (typeof id === 'object') {
        console.log('⚠️ ID es un objeto, extrayendo ID:', id.id || id._id || 'ID no encontrado');
        id = id.id || id._id || id;
      }
      
      console.log('🔍 ID final a enviar:', id);
      return await historialService.obtenerFormulario(id);
    } catch (error) {
      console.error('❌ Error obteniendo formulario:', error);
      throw error;
    }
  };

  // Cargar formulario existente si hay ID
  useEffect(() => {
    console.log('🔄 useEffect ejecutado');
    console.log('🔍 ID actual:', id);
    console.log('🔍 ID !== "nuevo"?', id !== 'nuevo');
    console.log('🔍 URL actual:', window.location.href);
    console.log('🔍 Pathname en useEffect:', window.location.pathname);
    
    // Usar formularioId en lugar de id para mayor confiabilidad
    const idParaCargar = formularioId || id;
    console.log('🔍 ID para cargar:', idParaCargar);
    
    if (idParaCargar && idParaCargar !== 'nuevo') {
      console.log('✅ Condiciones cumplidas, llamando a cargarFormularioExistente');
      cargarFormularioExistente();
    } else {
      console.log('⏭️ No se cargará formulario existente');
      console.log('🔍 Razón: idParaCargar =', idParaCargar, ', idParaCargar !== "nuevo" =', idParaCargar !== 'nuevo');
    }
  }, [id, formularioId]);

  // Cerrar menú de versiones cuando se haga clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mostrarMenuVersiones && !event.target.closest('.menu-versiones')) {
        cerrarMenuVersiones();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarMenuVersiones]);

  const cargarFormularioExistente = async () => {
    try {
      console.log('🔄 cargarFormularioExistente iniciado');
      
      // Usar formularioId en lugar de id para mayor confiabilidad
      const idParaCargar = formularioId || id;
      console.log('🔍 ID para cargar:', idParaCargar);
      console.log('🔍 Tipo de ID:', typeof idParaCargar);
      
      setCargando(true);
      const formulario = await obtenerFormulario(idParaCargar);
      console.log('✅ Formulario obtenido:', formulario);
      
      if (formulario) {
        // Procesar imágenes antes de establecer el estado
        let datosProcesados = formulario.datos || {};
        
        // ✅ CORREGIDO: Mantener las imágenes con sus rutas tal como vienen del servidor
        // InspeccionFotograficaAjuste se encargará de cargarlas desde el servidor automáticamente
        if (datosProcesados.imagenesInspeccion && datosProcesados.imagenesInspeccion.length > 0) {
          console.log('📸 Imágenes de inspección cargadas desde historial:', datosProcesados.imagenesInspeccion.length);
          
          // Solo asegurar que cada imagen tenga un ID único
          datosProcesados.imagenesInspeccion = datosProcesados.imagenesInspeccion.map((imagen, index) => {
            // Si la imagen tiene ruta (guardada en servidor), mantenerla tal cual
            if (imagen && imagen.ruta && imagen.ruta.startsWith('/uploads/')) {
              console.log(`✅ Imagen ${index + 1} cargada desde servidor:`, imagen.ruta);
              return {
                ...imagen,
                id: imagen.id || Date.now() + index
              };
            }
            
            // Si es un string base64 legacy, convertirlo
            if (typeof imagen === 'string' && imagen.startsWith('data:')) {
              return {
                id: Date.now() + index,
                nombre: `Imagen ${index + 1}`,
                base64: imagen,
                descripcion: ''
              };
            }
            
            // Si es un objeto sin ruta pero con base64/file/url, mantenerlo
            if (imagen && typeof imagen === 'object') {
              return {
                ...imagen,
                id: imagen.id || Date.now() + index
              };
            }
            
            return imagen;
          });
          
          console.log('✅ Imágenes de inspección listas para cargar:', datosProcesados.imagenesInspeccion.length);
        }
        
        // ✅ CRÍTICO: Asegurar que coordenadasRiesgo y direccionRiesgo estén disponibles para el mapa
        const formDataValue = {
          ...datosProcesados,
          // Cargar coordenadas y dirección del riesgo para el mapa
          coordenadasRiesgo: datosProcesados?.coordenadasRiesgo || datosProcesados?.coordenadas || '',
          direccionRiesgo: datosProcesados?.direccionRiesgo || datosProcesados?.direccion || ''
        };

        // Versión del informe (inicial / actualización / final): debe coincidir con la pestaña activa al reabrir desde historial
        const ESTADOS_AJUSTE_VALIDOS = ['actaInspeccion', 'inicial', 'preeliminar', 'actualizacion', 'informeFinal'];
        const normalizarEstadoAjuste = (e) => {
          const v = String(e || '').trim();
          return ESTADOS_AJUSTE_VALIDOS.includes(v) ? v : null;
        };
        const estadoSugeridoTraz = String(location?.state?.estadoInicial || '').trim();
        let estadoCargado = null;
        if (estadoSugeridoTraz && location?.state?.origen === 'trazabilidad') {
          const mapaTipoDocAEstado = {
            inspeccion: 'actaInspeccion',
            informePreliminar: 'inicial',
            ultimoDocumento: 'actualizacion',
            informeFinal: 'informeFinal'
          };
          estadoCargado = normalizarEstadoAjuste(mapaTipoDocAEstado[estadoSugeridoTraz] || estadoSugeridoTraz);
        }
        if (!estadoCargado) {
          estadoCargado =
            normalizarEstadoAjuste(formulario.estadoActual) ||
            normalizarEstadoAjuste(datosProcesados.estadoActual);
        }
        // Registros antiguos: el título sí reflejaba la versión aunque datos.estadoActual quedara en "inicial"
        if (!estadoCargado && formulario.titulo) {
          const t = String(formulario.titulo)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
          if (t.includes('informe final')) estadoCargado = 'informeFinal';
          else if (t.includes('actualizacion')) estadoCargado = 'actualizacion';
        }
        if (!estadoCargado) estadoCargado = 'inicial';

        // Si la pestaña guardada quedó en "inicial" pero hay datos de actualización o informe final, abrir esa versión
        const ordenVersion = { actaInspeccion: 0, inicial: 1, preeliminar: 2, actualizacion: 3, informeFinal: 4 };
        const tx = (s) => String(s || '').trim();
        const inferirEstadoDesdeContenido = (d) => {
          if (!d || typeof d !== 'object') return null;
          const liq = d.liquidacionPerdida || {};
          const ind = d.indemnizacion || {};
          const nItems = Array.isArray(d.liquidador?.items) ? d.liquidador.items.length : 0;
          const hayFinal =
            nItems > 0 ||
            tx(d.conclusionesFinales) ||
            tx(d.recomendacionesFinales) ||
            tx(d.observacionesInformeFinal) ||
            tx(liq.infraseguro) || tx(liq.demerito) || tx(liq.avanceTecnologico) ||
            tx(ind.deducible) || tx(ind.subrogacion) ||
            tx(d.salvamentos) || tx(d.panoramaRiesgos);
          if (hayFinal) return 'informeFinal';
          if (tx(d.fechaInformeFinal)) return 'informeFinal';
          const hayAct =
            tx(d.observacionesActualizacion) ||
            tx(d.cambiosDesdePreeliminar) ||
            tx(d.nuevaInformacion);
          if (hayAct || tx(d.fechaActualizacion)) return 'actualizacion';
          return null;
        };
        const inferido = inferirEstadoDesdeContenido(formDataValue);
        if (inferido && ordenVersion[inferido] > (ordenVersion[estadoCargado] ?? 0)) {
          estadoCargado = inferido;
        }

        formDataValue.estadoActual = estadoCargado;

        if (!String(formDataValue.actaObservaciones || '').trim() && String(formDataValue.observacionesPreeliminar || '').trim()) {
          formDataValue.actaObservaciones = formDataValue.observacionesPreeliminar;
        }

        const legFirma = Array.isArray(formDataValue.actaFirmas) ? formDataValue.actaFirmas[0] : null;
        if (legFirma) {
          if (!String(formDataValue.actaClienteNombre || '').trim() && legFirma.nombre) {
            formDataValue.actaClienteNombre = legFirma.nombre;
          }
          if (!String(formDataValue.actaClienteFirma || '').trim() && legFirma.firma) {
            formDataValue.actaClienteFirma =
              typeof legFirma.firma === 'string' ? legFirma.firma : '';
          }
        }

        setFormData(formDataValue);
        setEstadoActual(estadoCargado);

        // Sincronizar vista previa del mapa con lo guardado en historial (data URL o ruta subida)
        const imMapa = formDataValue.imagenMapa;
        let urlCaptura = '';
        if (imMapa) {
          if (typeof imMapa === 'string') urlCaptura = imMapa;
          else if (typeof imMapa === 'object' && imMapa.ruta) {
            urlCaptura = resolveUploadsUrl(imMapa.ruta) || `${API_CONFIG.BASE_URL}${imMapa.ruta}`;
          }
        }
        const crs = String(formDataValue.coordenadasRiesgo || '').trim();
        let coordObj;
        if (crs) {
          const p = crs.split(',').map((c) => parseFloat(c.trim()));
          if (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])) {
            coordObj = { lat: p[0], lng: p[1] };
          }
        }
        setMapaInfo((prev) => ({
          ...prev,
          coordenadas: coordObj !== undefined ? coordObj : prev.coordenadas,
          imagen: urlCaptura || prev.imagen,
          direccion: formDataValue.direccionRiesgo || prev.direccion || ''
        }));

        setArchivoGenerado(formulario.archivo);
        
        // Log especial para verificar firmas al cargar
        console.log('🔍 Verificando firmas al cargar formulario:');
        console.log('🔍 firmaFuncionario en datos:', !!datosProcesados?.firmaFuncionario);
        console.log('🔍 firmaIskharly en datos:', !!datosProcesados?.firmaIskharly);
        console.log('🔍 funcionarioFirma en datos:', datosProcesados?.funcionarioFirma);
        console.log('🔍 cargoFuncionario en datos:', datosProcesados?.cargoFuncionario);
        
        // Log especial para verificar que las coordenadas se cargaron correctamente
        console.log('🗺️ Verificando coordenadas del mapa:');
        console.log('🔍 coordenadasRiesgo:', formDataValue?.coordenadasRiesgo || 'No disponible');
        console.log('🔍 direccionRiesgo:', formDataValue?.direccionRiesgo || 'No disponible');
        console.log('🔍 TODOS los campos disponibles en formulario.datos:', Object.keys(datosProcesados || {}));
        console.log('🔍 Campos relacionados con coordenadas/mapa:', {
          coordenadasRiesgo: datosProcesados?.coordenadasRiesgo,
          coordenadas: datosProcesados?.coordenadas,
          direccionRiesgo: datosProcesados?.direccionRiesgo,
          direccion: datosProcesados?.direccion,
          ubicacion: datosProcesados?.ubicacion,
          mapa: datosProcesados?.mapa,
          lat: datosProcesados?.lat,
          lng: datosProcesados?.lng
        });
        
        // Cargar información de la carpeta
        if (formulario.casoId) {
          setFormData(prev => ({
            ...prev,
            casoId: formulario.casoId,
            numeroCaso: formulario.numeroCaso,
            carpetaCaso: formulario.carpetaCaso
          }));
        }
        
        // Cargar estado de versiones
        if (formulario.versiones) {
          setVersiones(formulario.versiones);
        }

        const prefillGestionEditar = location?.state?.prefillDesdeGestion;
        if (
          prefillGestionEditar &&
          typeof prefillGestionEditar === 'object' &&
          Object.keys(prefillGestionEditar).length > 0
        ) {
          queueMicrotask(() => aplicarAutofillComplex(prefillGestionEditar, { overwrite: false }));
        }

        console.log('✅ Formulario cargado exitosamente');
        // Debug logs comentados para reducir ruido en consola
      }
    } catch (error) {
      console.error('❌ Error cargando formulario:', error);
      setError('Error al cargar el formulario existente: ' + error.message);
    } finally {
      setCargando(false);
      permitirAutoguardadoLocalRef.current = true;
    }
  };

  // Función para manejar cambios en los campos del formulario
  const handleInputChange = (field, value) => {
    // Log especial para firmas
    if (field === 'firmaFuncionario' || field === 'firmaIskharly') {
      console.log(`🔍 handleInputChange - Campo: ${field}`);
      console.log(`🔍 Valor recibido:`, value ? 'Firma presente' : 'Sin firma');
      console.log(`🔍 Longitud del valor:`, value ? value.length : 0);
    }
    
    setFormData(prev => {
      if (field === 'metadataTipoDocumento') {
        return {
          ...prev,
          metadata: { ...(prev.metadata || {}), tipoDocumento: value }
        };
      }
      if (field === 'metadataIntermediario') {
        return {
          ...prev,
          metadata: { ...(prev.metadata || {}), intermediario: value }
        };
      }
      const next = { ...prev, [field]: value };
      if (field === 'identificacionActa') {
        next.metadata = { ...(prev.metadata || {}), numeroDocumento: value };
      }
      return next;
    });
    
    // Log después de actualizar el estado
    if (field === 'firmaFuncionario' || field === 'firmaIskharly') {
      console.log(`✅ Estado actualizado para ${field}:`, value ? 'Firma guardada' : 'Sin firma');
    }
  };

  const normalizarTexto = (valor) =>
    String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

  const obtenerDepartamentoPorCiudad = async (nombreCiudad) => {
    const ciudadBuscada = normalizarTexto(nombreCiudad);
    if (!ciudadBuscada) return '';

    // 1) Intentar contra la tabla de ciudades en backend (fuente principal)
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/ciudades/ciudades`);
      if (res.ok) {
        const ciudades = await res.json();
        const lista = Array.isArray(ciudades) ? ciudades : [];
        const match = lista.find((c) =>
          normalizarTexto(c?.descMunicipio) === ciudadBuscada
        );
        if (match?.descDepto) return String(match.descDepto).trim();
      }
    } catch (error) {
      console.warn('⚠️ No se pudo consultar tabla de ciudades para inferir departamento:', error);
    }

    // 2) Fallback local
    const ciudadMatch = (DATOS_MAESTROS.ciudades || []).find((c) =>
      normalizarTexto(c?.nombre) === ciudadBuscada
    );
    return ciudadMatch?.departamento || '';
  };

  const enriquecerDatosDestinatario = async (data = {}) => {
    const departamentoInferido = await obtenerDepartamentoPorCiudad(data?.ciudad);
    const tomadorInferido = String(data?.tomador || data?.asegurado || '').trim();

    const codigoAseguradora = String(data?.metadata?.codiAsgrdra || '').trim();
    const referenciaFuncionario = String(
      data?.funcionarioAsigna || data?.metadata?.funcAsgrdraRef || ''
    ).trim();
    const funcionarioId = String(data?.metadata?.funcionarioId || '').trim();
    const empresaInicial = String(data?.empresa || data?.aseguradora || '').trim();

    // Detecta si el "nombre" actual de la empresa parece un código (numérico o muy corto)
    const empresaParecCodigo =
      !empresaInicial ||
      /^\d+$/.test(empresaInicial) ||
      empresaInicial.toUpperCase() === codigoAseguradora.toUpperCase();

    let nombreAseguradora = empresaInicial;

    // 1) Resolver nombre comercial de la aseguradora si tenemos código,
    //    sin importar si hay funcionario o no.
    if (codigoAseguradora && (empresaParecCodigo || !nombreAseguradora)) {
      try {
        const clientesRes = await fetch(`${API_CONFIG.BASE_URL}/api/clientes`);
        if (clientesRes.ok) {
          const clientes = await clientesRes.json();
          const listaClientes = Array.isArray(clientes)
            ? clientes
            : (Array.isArray(clientes?.data) ? clientes.data : []);
          const clienteMatch = listaClientes.find((c) =>
            String(c?.codiAsgrdra || '').trim() === codigoAseguradora ||
            String(c?.cod1Asgrdra || '').trim() === codigoAseguradora
          );
          if (clienteMatch) {
            const nombreResuelto = String(
              clienteMatch?.rzonSocial || clienteMatch?.nombre || ''
            ).trim();
            if (nombreResuelto) {
              nombreAseguradora = nombreResuelto;
            }
          }
        }
      } catch (errorClientes) {
        console.error('❌ Error resolviendo nombre comercial de aseguradora:', errorClientes);
      }
    }

    // 2) Buscar datos de contacto del funcionario si hay aseguradora + alguna referencia.
    let funcionarioInfo = null;
    if (codigoAseguradora && (referenciaFuncionario || funcionarioId)) {
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${encodeURIComponent(codigoAseguradora)}`
        );
        if (response.ok) {
          const payload = await response.json();
          const funcionarios = payload?.data && Array.isArray(payload.data)
            ? payload.data
            : (Array.isArray(payload) ? payload : []);

          const normalizar = (v) => String(v || '').trim().toUpperCase();
          const referenciaNumerica = Number(referenciaFuncionario);
          const idDesdeReferenciaNumerica =
            !Number.isNaN(referenciaNumerica) && referenciaFuncionario !== ''
              ? referenciaNumerica
              : null;

          funcionarioInfo = funcionarios.find((f) => {
            const fId = String(f?.id ?? '').trim();
            const fNombre = normalizar(f?.nmbrContcto);
            if (funcionarioId && fId === funcionarioId) return true;
            if (idDesdeReferenciaNumerica !== null && Number(f?.id) === idDesdeReferenciaNumerica) {
              return true;
            }
            if (referenciaFuncionario && fNombre === normalizar(referenciaFuncionario)) {
              return true;
            }
            return false;
          }) || null;
        }
      } catch (errorFuncionario) {
        console.error('❌ Error buscando funcionario asignado:', errorFuncionario);
      }
    }

    // Si "referenciaFuncionario" es numérico (era el ID) lo descartamos como nombre visible.
    const referenciaEsNumerica = referenciaFuncionario && /^\d+$/.test(referenciaFuncionario);
    const nombreFuncionarioVisible =
      funcionarioInfo?.nmbrContcto ||
      (referenciaEsNumerica ? '' : referenciaFuncionario);

    return {
      ...data,
      destinatario: data?.destinatario || nombreFuncionarioVisible,
      funcionarioAsigna: nombreFuncionarioVisible || data?.funcionarioAsigna,
      cargo: data?.cargo || funcionarioInfo?.cargo || '',
      empresa: nombreAseguradora || empresaInicial || codigoAseguradora,
      aseguradora: nombreAseguradora || data?.aseguradora,
      direccion: data?.direccion || funcionarioInfo?.direccion || '',
      ciudadDestino:
        data?.ciudadDestino || funcionarioInfo?.ciudadDestino || data?.ciudad || '',
      paisDestino: data?.paisDestino || funcionarioInfo?.paisDestino || 'Colombia',
      email: data?.email || funcionarioInfo?.email || '',
      telefono: data?.telefono || funcionarioInfo?.teleCellar || '',
      tomador: data?.tomador || tomadorInferido,
      departamento: data?.departamento || departamentoInferido
    };
  };

  /** Campos que sí se toman del autofill de Complex (parte cliente + vínculo del expediente). El resto de datos generales el usuario los completa. */
  const CAMPOS_FORM_AUTOFILL_SOLO_COMPLEX = new Set([
    'numeroSiniestro',
    'numeroCaso',
    'asegurado',
    'tomador',
    'beneficiario',
    'identificacionActa'
  ]);
  const CAMPOS_METADATA_AUTOFILL_SOLO_COMPLEX = new Set(['tipoDocumento', 'numeroDocumento']);

  const aplicarAutofillComplex = (data = {}, { overwrite = false, soloInfoClienteDesdeComplex = false } = {}) => {
    setFormData(prev => {
      const siguiente = { ...prev };
      const metadataActual = (prev.metadata && typeof prev.metadata === 'object') ? prev.metadata : {};
      const metadataNuevo = { ...metadataActual };

      const asignarSiCorresponde = (campo, valor) => {
        const texto = String(valor ?? '').trim();
        if (!texto) return;
        const valorActual = String(prev[campo] ?? '').trim();
        if (overwrite || !valorActual) {
          siguiente[campo] = valor;
        }
      };

      const asignarMetadataSiCorresponde = (campo, valor) => {
        const texto = String(valor ?? '').trim();
        if (!texto) return;
        const valorActual = String(metadataActual[campo] ?? '').trim();
        if (overwrite || !valorActual) {
          metadataNuevo[campo] = valor;
        }
      };

      const asignarFormAutofill = (campo, valor) => {
        if (soloInfoClienteDesdeComplex && !CAMPOS_FORM_AUTOFILL_SOLO_COMPLEX.has(campo)) return;
        asignarSiCorresponde(campo, valor);
      };

      const asignarMetadataAutofill = (campo, valor) => {
        if (soloInfoClienteDesdeComplex && !CAMPOS_METADATA_AUTOFILL_SOLO_COMPLEX.has(campo)) return;
        asignarMetadataSiCorresponde(campo, valor);
      };

      asignarFormAutofill('numeroSiniestro', data.numeroSiniestro);
      asignarFormAutofill('numeroCaso', data.numeroCaso);
      asignarFormAutofill('numeroPoliza', data.numeroPoliza);
      asignarFormAutofill('aseguradora', data.aseguradora);
      asignarFormAutofill('funcionarioAsigna', data.funcionarioAsigna);
      asignarFormAutofill('destinatario', data.destinatario);
      asignarFormAutofill('cargo', data.cargo);
      asignarFormAutofill('empresa', data.empresa);
      asignarFormAutofill('direccion', data.direccion);
      asignarFormAutofill('ciudadDestino', data.ciudadDestino);
      asignarFormAutofill('paisDestino', data.paisDestino);
      asignarFormAutofill('email', data.email);
      asignarFormAutofill('telefono', data.telefono);
      asignarFormAutofill('asegurado', data.asegurado);
      asignarFormAutofill('tomador', data.tomador || data.asegurado);
      asignarFormAutofill('beneficiario', data.beneficiario);
      asignarFormAutofill('fechaOcurrencia', data.fechaOcurrencia);
      asignarFormAutofill('fechaSiniestro', data.fechaSiniestro || data.fechaOcurrencia);
      const fechaReporteDesdeAsignacion = resolverFechaReporteDesdeAsignacion(data);
      asignarFormAutofill('fechaReporte', fechaReporteDesdeAsignacion);
      asignarMetadataAutofill(
        'fechaAsignacion',
        fechaReporteDesdeAsignacion || data?.metadata?.fechaAsignacion
      );
      asignarFormAutofill('fechaInspeccion', data.fechaInspeccion);
      asignarFormAutofill('ciudad', data.ciudad);
      asignarFormAutofill('departamento', data.departamento);
      asignarFormAutofill('ramo', data.ramo);
      asignarFormAutofill('tipoEvento', data.tipoEvento || data.tipoSiniestro || data.ramo);
      asignarFormAutofill('tipoSiniestro', data.tipoSiniestro || data.tipoEvento || data.ramo);
      asignarFormAutofill('actividad', data.actividad);
      asignarFormAutofill('paisDestino', data.paisDestino || 'Colombia');
      // Descripción del siniestro y descripción de riesgo no se autollenan desde Complex (van del acta).
      asignarFormAutofill('direccionRiesgo', data.direccionRiesgo);
      asignarFormAutofill('coordenadasRiesgo', data.coordenadasRiesgo);
      asignarFormAutofill('codigoReporte', data.codigoReporte);
      asignarFormAutofill('tipoRiesgoActa', data.tipoRiesgoActa);
      asignarFormAutofill(
        'identificacionActa',
        data.identificacionActa || data?.metadata?.numeroDocumento
      );
      asignarFormAutofill('antecedentes', data.antecedentes);

      asignarMetadataAutofill('intermediario', data?.metadata?.intermediario || data?.nombIntermediario);
      asignarMetadataAutofill('tipoDocumento', data?.metadata?.tipoDocumento);
      asignarMetadataAutofill('numeroDocumento', data?.metadata?.numeroDocumento || data?.identificacionActa);
      asignarMetadataAutofill('codiAsgrdra', data?.metadata?.codiAsgrdra);
      asignarMetadataAutofill('numeroAjuste', data?.metadata?.numeroAjuste);

      siguiente.metadata = metadataNuevo;
      return siguiente;
    });
  };

  const txCampo = (valor) => String(valor ?? '').trim();

  /** Al pasar de acta → informe preliminar: conservar narrativas del acta y alinear campos del informe. */
  const propagarActaAInformePreliminar = (prev) => {
    if (!prev || typeof prev !== 'object') return prev;
    const descSin = txCampo(prev.descripcionSiniestro);
    const circ = txCampo(prev.circunstanciasSiniestro);
    const ciudad = txCampo(prev.ciudad);
    const aseg = txCampo(prev.asegurado);
    const tipoRiesgo = txCampo(prev.tipoRiesgoActa);

    return {
      ...prev,
      circunstanciasSiniestro: circ || descSin,
      fechaOcurrencia: txCampo(prev.fechaOcurrencia) || txCampo(prev.fechaSiniestro),
      fechaSiniestro: txCampo(prev.fechaSiniestro) || txCampo(prev.fechaOcurrencia),
      tomador: txCampo(prev.tomador) || aseg,
      beneficiario: txCampo(prev.beneficiario) || aseg,
      ciudadDestino: txCampo(prev.ciudadDestino) || ciudad,
      departamento: txCampo(prev.departamento),
      direccionRiesgo: txCampo(prev.direccionRiesgo),
      fechaInspeccion: txCampo(prev.fechaInspeccion),
      fechaReporte:
        txCampo(prev.fechaReporte) ||
        resolverFechaReporteDesdeAsignacion(prev),
      tipoEvento: txCampo(prev.tipoEvento) || tipoRiesgo || txCampo(prev.tipoSiniestro),
      tipoSiniestro: txCampo(prev.tipoSiniestro) || tipoRiesgo,
      ramo: txCampo(prev.ramo) || tipoRiesgo,
      paisDestino: txCampo(prev.paisDestino) || 'Colombia'
    };
  };

  const resolverIdentificadorComplexDesdeFormulario = (snap = formDataRef.current) => {
    const desdeState = location.state || {};
    return String(
      snap?.metadata?.complexId ||
        desdeState?.complexId ||
        desdeState?._id ||
        snap?.numeroSiniestro ||
        desdeState?.numeroSiniestro ||
        desdeState?.nmroSinstro ||
        snap?.numeroCaso ||
        desdeState?.numeroCaso ||
        desdeState?.nmroAjste ||
        new URLSearchParams(location.search).get('casoId') ||
        ''
    ).trim();
  };

  const ejecutarAutofillDesdeComplex = async (
    idCaso,
    overwrite = false,
    prefillPost = null,
    opciones = {}
  ) => {
    const { rellenarDatosGenerales = false } = opciones;
    const identificador = String(idCaso || '').trim();
    if (!identificador) {
      setAutofillState({ loading: false, partial: false, error: 'Ingresa número de siniestro o caso para autocompletar.' });
      return;
    }

    try {
      setAutofillState({ loading: true, partial: false, error: '' });
      const respuesta = await getAutofillAjusteDesdeComplex(identificador);
      const dataEnriquecida = await enriquecerDatosDestinatario(respuesta?.data || {});
      const complexIdResuelto = String(respuesta?.meta?.idCaso || '').trim();
      if (complexIdResuelto) {
        setFormData((prev) => ({
          ...prev,
          metadata: {
            ...(prev.metadata || {}),
            complexId: complexIdResuelto
          }
        }));
      }
      aplicarAutofillComplex(dataEnriquecida, {
        overwrite,
        soloInfoClienteDesdeComplex: !rellenarDatosGenerales
      });
      if (prefillPost && typeof prefillPost === 'object' && Object.keys(prefillPost).length > 0) {
        aplicarAutofillComplex(prefillPost, { overwrite: false });
      }
      setAutofillState({
        loading: false,
        partial: Boolean(respuesta?.partial),
        error: ''
      });
    } catch (err) {
      if (prefillPost && typeof prefillPost === 'object' && Object.keys(prefillPost).length > 0) {
        aplicarAutofillComplex(prefillPost, { overwrite: false });
      }
      setAutofillState({
        loading: false,
        partial: false,
        error: err?.message || 'No se pudo autocompletar desde Complex.'
      });
    }
  };

  useEffect(() => {
    if (id && id !== 'nuevo') return;
    const desdeState = location.state || {};
    const desdeQuery = new URLSearchParams(location.search).get('casoId');
    const identificador = String(
      desdeState?.complexId ||
      desdeState?._id ||
      desdeState?.numeroSiniestro ||
      desdeState?.nmroSinstro ||
      desdeState?.numeroCaso ||
      desdeState?.nmroAjste ||
      desdeQuery ||
      ''
    ).trim();
    const prefillDesdeCaso =
      desdeState.prefillDesdeCaso && typeof desdeState.prefillDesdeCaso === 'object'
        ? desdeState.prefillDesdeCaso
        : null;
    const prefillGestion =
      desdeState.prefillDesdeGestion && typeof desdeState.prefillDesdeGestion === 'object'
        ? desdeState.prefillDesdeGestion
        : null;
    const prefillCombinado = { ...(prefillDesdeCaso || {}), ...(prefillGestion || {}) };

    // Persistir complexId desde el state para que la sincronización con
    // historialDocs no se omita al guardar versiones posteriores.
    const complexIdFromState = String(desdeState?.complexId || desdeState?._id || '').trim();
    if (complexIdFromState) {
      setFormData((prev) => ({
        ...prev,
        metadata: {
          ...(prev.metadata || {}),
          complexId: complexIdFromState
        }
      }));
    }

    if (identificador) {
      ejecutarAutofillDesdeComplex(
        identificador,
        false,
        Object.keys(prefillCombinado).length > 0 ? prefillCombinado : null,
        { rellenarDatosGenerales: true }
      );
    } else if (Object.keys(prefillCombinado).length > 0) {
      aplicarAutofillComplex(prefillCombinado, { overwrite: false, soloInfoClienteDesdeComplex: false });
    }
  }, [id, location.state, location.search]);

  // Función para manejar cambios en el mapa
  const handleMapaChange = (nuevaInfoMapa) => {
    const nuevaImagenRaw = nuevaInfoMapa.imagenMapa || nuevaInfoMapa.imagen;
    const tieneNuevaImagen =
      nuevaImagenRaw !== undefined &&
      nuevaImagenRaw !== null &&
      String(nuevaImagenRaw).trim() !== '';

    const infoMapaAdaptada = {
      coordenadas:
        nuevaInfoMapa.lat && nuevaInfoMapa.lng
          ? { lat: nuevaInfoMapa.lat, lng: nuevaInfoMapa.lng }
          : nuevaInfoMapa.coordenadas,
      imagen: tieneNuevaImagen ? nuevaImagenRaw : undefined,
      direccion: nuevaInfoMapa.direccion
    };

    setMapaInfo((prev) => ({
      ...prev,
      coordenadas:
        infoMapaAdaptada.coordenadas !== undefined && infoMapaAdaptada.coordenadas !== null
          ? infoMapaAdaptada.coordenadas
          : prev.coordenadas,
      imagen: tieneNuevaImagen ? nuevaImagenRaw : prev.imagen,
      direccion:
        infoMapaAdaptada.direccion !== undefined && infoMapaAdaptada.direccion !== null
          ? infoMapaAdaptada.direccion
          : prev.direccion
    }));

    setFormData((prev) => {
      const next = { ...prev };
      if (nuevaInfoMapa.lat && nuevaInfoMapa.lng) {
        next.coordenadasRiesgo = `${nuevaInfoMapa.lat}, ${nuevaInfoMapa.lng}`;
      } else if (nuevaInfoMapa.coordenadas) {
        const coords = String(nuevaInfoMapa.coordenadas)
          .split(',')
          .map((c) => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          next.coordenadasRiesgo = nuevaInfoMapa.coordenadas;
        }
      }
      if (tieneNuevaImagen) {
        next.imagenMapa = nuevaImagenRaw;
      }
      return next;
    });

    if (tieneNuevaImagen) {
      console.log('📸 Captura del mapa lista para persistir en historial');
    }
    console.log('✅ Información del mapa actualizada');
  };

  // Función para convertir archivo a base64
  const convertirArchivoABase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Función para convertir imagen importada a base64
  const convertirImagenImportadaABase64 = async (imagePath) => {
    try {
      const response = await fetch(imagePath);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al convertir imagen importada:', error);
      return null;
    }
  };

  // Función helper para extraer base64 limpio de cualquier formato
  const extraerBase64Limpio = (imagen) => {
    if (!imagen) return null;
    
    // Si ya tiene base64 directo (sin prefijo data:)
    if (imagen.base64 && !imagen.base64.includes('data:')) {
      return imagen.base64;
    }
    
    // Si tiene base64 con prefijo data:image/...
    if (imagen.base64 && imagen.base64.includes('base64,')) {
      return imagen.base64.split('base64,')[1];
    }
    
    // Si tiene url con prefijo data:image/...
    if (imagen.url && imagen.url.includes('base64,')) {
      return imagen.url.split('base64,')[1];
    }
    
    // Si tiene preview con prefijo data:image/...
    if (imagen.preview && imagen.preview.includes('base64,')) {
      return imagen.preview.split('base64,')[1];
    }
    
    // Si tiene url sin prefijo y no es HTTP (probablemente base64)
    if (imagen.url && !imagen.url.includes('data:') && !imagen.url.includes('http') && !imagen.url.includes('/')) {
      return imagen.url;
    }
    
    // Si tiene base64 sin prefijo
    if (imagen.base64) {
      return imagen.base64;
    }
    
    return null;
  };

  // Función para generar el documento Word
  const generarDocumento = async () => {
    try {
      setCargando(true);
      setError(null);

      await forzarCapturaMapaAntesDePersistir();
      await new Promise((r) => setTimeout(r, 400));

      console.log('🔍 Iniciando generación de PÁGINA 1 - Solo lo solicitado...');

      // FORMATO DEL DOCUMENTO:
      // - Fuente: Arial en todo el documento
      // - Tamaño: 24 = 12pt (formato estándar de Word)
      // - Alineación: Justificado para texto normal, Centrado para títulos
      // - Color: Negro (000000) por defecto, excepto donde se especifique otro
      // - Espaciado: Consistente entre párrafos para mejor legibilidad
      //
      // COMPORTAMIENTO DEL CONTENIDO:
      // - SOLO se genera texto cuando hay información real en formData
      // - Si no hay información, se muestra mensaje en gris e itálica: "[Campo - No se ha proporcionado información]"
      // - NO se incluye texto hardcodeado o de ejemplo
      // - El documento se genera dinámicamente basado en lo que se haya llenado en la plataforma
      //
      // SECCIONES POR VERSIÓN (cuerpo del .docx):
      // - actaInspección: solo encabezado (logo + «INFORME DE INSPECCIÓN») y bloque «ACTA DE INSPECCIÓN»; sin fecha/destinatario ni «INFORMACIÓN DETALLADA».
      // - Resto: salto de página, tabla «INFORMACIÓN DETALLADA», salto, cuerpo del informe.
      // - INICIAL / PREELIMINAR: observaciones (acta), análisis de cobertura si hay datos.
      // - ACTUALIZACIÓN: misma secuencia hasta el final + observaciones de actualización.
      // - INFORME FINAL: conclusiones, liquidación, etc.

      // Firma Iskharly por defecto (respaldo obligatorio para Word)
      let firmaIskharlyDefaultBase64 = null;
      try {
        firmaIskharlyDefaultBase64 = await convertirImagenImportadaABase64(firmaIskharlyImg);
        console.log('✅ Firma de Iskharly por defecto lista para Word');
      } catch (e) {
        console.warn('⚠️ No se pudo cargar FIRMAISKHARLY.png:', e);
      }

      // Convertir el logo a base64 para el encabezado
      let logoBase64 = null;
      console.log('🖼️ Convirtiendo logo a base64...');
      logoBase64 = await convertirImagenImportadaABase64(Logo);
      console.log('✅ Logo convertido a base64');

      const stripMapaBase64ParaDocx = (dataUrl) => {
        if (!dataUrl || typeof dataUrl !== 'string') return '';
        const idx = dataUrl.indexOf('base64,');
        if (idx !== -1) return dataUrl.slice(idx + 7);
        return dataUrl.replace(/^data:image\/\w+;base64,/, '');
      };

      const cargarMapaComoDataUrl = async () => {
        const snap = formDataRef.current;
        const mapSnap = mapaInfoRef.current;

        const fromUi = mapSnap?.imagen;
        if (fromUi && typeof fromUi === 'string' && fromUi.startsWith('data:')) return fromUi;
        if (fromUi && typeof fromUi === 'string' && fromUi.startsWith('http')) {
          try {
            const resp = await fetch(fromUi);
            if (resp.ok) {
              const blob = await resp.blob();
              return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }
          } catch {
            /* ignorar */
          }
        }

        const im = snap?.imagenMapa;
        if (im && typeof im === 'string' && im.startsWith('data:')) return im;
        if (im && typeof im === 'object' && im.ruta) {
          const urls = getUploadsUrlCandidates(im.ruta);
          for (const urlImg of urls) {
            try {
              const resp = await fetch(urlImg);
              if (!resp.ok) continue;
              const blob = await resp.blob();
              return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch {
              /* siguiente candidato */
            }
          }
        }
        return null;
      };

      const mapaDataUrlParaWord = await cargarMapaComoDataUrl();

      // Función helper para crear párrafos con formato consistente
      const crearParrafo = (texto, opciones = {}) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: texto,
              font: 'Arial',
              size: opciones.size || 24, // 24 = 12pt en docx
              bold: opciones.bold || false,
              color: opciones.color || '000000', // Negro por defecto
              italics: opciones.italics || false
            })
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: opciones.spacingAfter || 200 }
        });
      };

      // Función helper para crear títulos con formato consistente
      const crearTitulo = (texto, nivel = 1) => {
        const tamanos = { 1: 28, 2: 24, 3: 20, 4: 18, 5: 16 }; // 24 = 12pt, 28 = 14pt
        return new Paragraph({
          children: [
            new TextRun({
              text: texto,
              font: 'Arial',
              size: tamanos[nivel] || 16,
              bold: true,
              color: '000000' // Negro
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        });
      };

      // Función helper para crear texto normal con formato consistente (Arial 12pt = size 24; títulos con heading en negrita)
      const crearTextoNormal = (texto, opciones = {}) => {
        const spacingAfter =
          opciones.spacingAfter !== undefined
            ? opciones.spacingAfter
            : opciones.spacing?.after !== undefined
              ? opciones.spacing.after
              : 200;
        const spacingBefore =
          opciones.spacingBefore !== undefined
            ? opciones.spacingBefore
            : opciones.spacing?.before !== undefined
              ? opciones.spacing.before
              : 0;
        const tieneHeading = !!opciones.heading;
        const bold =
          opciones.bold !== undefined ? opciones.bold : tieneHeading ? true : false;

        return new Paragraph({
          ...(tieneHeading ? { heading: opciones.heading } : {}),
          children: [
            new TextRun({
              text: texto,
              font: 'Arial',
              size: opciones.size || 24, // 24 = 12pt en docx
              bold,
              color: opciones.color || '000000',
              italics: opciones.italics || false
            })
          ],
          alignment: opciones.alignment || AlignmentType.JUSTIFIED,
          spacing: {
            after: spacingAfter,
            before: spacingBefore
          }
        });
      };

      // Función helper para crear múltiples párrafos desde texto con saltos de línea
      const crearParrafosDesdeTexto = (texto, opciones = {}) => {
        if (!texto || typeof texto !== 'string') {
          return [crearTextoNormal(texto || '', opciones)];
        }
        
        // Dividir el texto por saltos de línea y crear un párrafo para cada línea
        const lineas = texto.split('\n').filter(linea => linea.trim() !== '');
        
        if (lineas.length === 0) {
          return [crearTextoNormal(texto || '', opciones)];
        }
        
        return lineas.map(linea => crearTextoNormal(linea.trim(), opciones));
      };

      // Función helper para crear mensajes de "sin información" de manera consistente
      const crearMensajeSinInformacion = (campo) => {
        return crearTextoNormal(`[${campo} - No se ha proporcionado información]`, { 
          spacingAfter: 200, 
          italics: true,
          color: '666666' // Gris para distinguir del texto normal
        });
      };

      // Función helper para valores de tabla sin información
      const valorTabla = (valor, campo) => {
        return valor || `[${campo} - No especificado]`;
      };

      // ============ PROCESAR IMÁGENES PARA REGISTRO FOTOGRÁFICO ============
      // COPIADO EXACTO DE FORMULARIOPUERTOS QUE FUNCIONA PERFECTAMENTE
      let contenidoRegistroFotografico = [];
      
      if (formData.imagenesInspeccion && formData.imagenesInspeccion.length > 0) {
        console.log(`📸 Procesando ${formData.imagenesInspeccion.length} imágenes de registro para el informe...`);

        // Aquí se guardarán las filas de la tabla
        const filas = [];

        // Recorre las imágenes de a 2 por fila (EXACTO A FORMULARIOPUERTOS)
        for (let i = 0; i < formData.imagenesInspeccion.length; i += 2) {
          const celdasImagen = [];
          const celdasDescripcion = [];

          for (let j = i; j < i + 2 && j < formData.imagenesInspeccion.length; j++) {
            const img = formData.imagenesInspeccion[j];
            let imagenBuffer = null;
            
            try {
              // Intentar obtener la imagen desde diferentes fuentes (EXACTO A FORMULARIOPUERTOS)
              if (img && img.file && typeof img.file.arrayBuffer === "function") {
                // Si es un File object
                imagenBuffer = await img.file.arrayBuffer();
                console.log('✅ Imagen del registro obtenida desde File');
              } else if (img && img.base64) {
                // Si tiene base64 (EXACTO A FORMULARIOPUERTOS)
                const base64Data = img.base64.split(',')[1] || img.base64;
                imagenBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
                console.log('✅ Imagen del registro obtenida desde base64');
              } else if (img && img.preview && typeof img.preview === 'string' && img.preview.startsWith('data:image')) {
                // Si tiene preview como base64 (EXACTO A FORMULARIOPUERTOS)
                const base64Data = img.preview.split(',')[1] || img.preview;
                imagenBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
                console.log('✅ Imagen del registro obtenida desde preview base64');
              } else if (img && img.ruta) {
                // Si tiene ruta del servidor, intentar cargarla (EXACTO A FORMULARIOPUERTOS)
                try {
                  const imagenUrl = img.ruta.startsWith('http') 
                    ? img.ruta 
                    : `${window.location.origin}${img.ruta}`;
                  const response = await fetch(imagenUrl);
                  if (response.ok) {
                    imagenBuffer = await response.arrayBuffer();
                    console.log('✅ Imagen del registro obtenida desde servidor');
                  }
                } catch (fetchError) {
                  console.error('❌ Error al cargar imagen desde servidor:', fetchError);
                }
              }
              
              if (imagenBuffer) {
                // Dimensiones máximas para que 2 imágenes quepan bien en una página
                // Valores similares a FormularioPuertos (250x150) pero ligeramente más grandes
                const MAX_WIDTH = 300;  // Ancho máximo
                const MAX_HEIGHT = 225; // Alto máximo
                
                let anchoImagen = MAX_WIDTH;
                let altoImagen = MAX_HEIGHT;
                
                try {
                  // Crear un objeto Image para obtener dimensiones reales y calcular aspecto
                  const blob = new Blob([imagenBuffer]);
                  const imageUrl = URL.createObjectURL(blob);
                  
                  // Usar una promesa para cargar la imagen y obtener sus dimensiones
                  const imgElement = new Image();
                  await new Promise((resolve, reject) => {
                    imgElement.onload = () => {
                      const aspectRatio = imgElement.width / imgElement.height;
                      
                      // Calcular dimensiones manteniendo relación de aspecto
                      // Asegurar que la imagen quepa dentro de los límites máximos
                      if (aspectRatio > 1) {
                        // Imagen horizontal (ancho > alto)
                        anchoImagen = MAX_WIDTH;
                        altoImagen = Math.round(MAX_WIDTH / aspectRatio);
                        // Si el alto calculado excede el máximo, ajustar
                        if (altoImagen > MAX_HEIGHT) {
                          altoImagen = MAX_HEIGHT;
                          anchoImagen = Math.round(MAX_HEIGHT * aspectRatio);
                        }
                      } else {
                        // Imagen vertical o cuadrada (alto >= ancho)
                        altoImagen = MAX_HEIGHT;
                        anchoImagen = Math.round(MAX_HEIGHT * aspectRatio);
                        // Si el ancho calculado excede el máximo, ajustar
                        if (anchoImagen > MAX_WIDTH) {
                          anchoImagen = MAX_WIDTH;
                          altoImagen = Math.round(MAX_WIDTH / aspectRatio);
                        }
                      }
                      
                      URL.revokeObjectURL(imageUrl);
                      resolve();
                    };
                    imgElement.onerror = reject;
                    imgElement.src = imageUrl;
                  });
                } catch (error) {
                  console.warn('⚠️ No se pudieron calcular dimensiones de la imagen, usando valores por defecto:', error);
                  // Si falla, usar valores por defecto que mantienen una relación de aspecto razonable (4:3)
                  anchoImagen = MAX_WIDTH;
                  altoImagen = 225;
                }
                
                celdasImagen.push(
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: imagenBuffer,
                            transformation: { 
                              width: anchoImagen,
                              height: altoImagen,
                            },
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 50, after: 50 },
                      }),
                    ],
                  })
                );
                celdasDescripcion.push(
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: { top: 100, bottom: 100, left: 200, right: 200 },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      crearTextoNormal(String(img.descripcion || '').trim(), {
                        alignment: AlignmentType.CENTER,
                        spacingAfter: 50,
                        spacingBefore: 50,
                        size: 24
                      })
                    ]
                  })
                );
              } else {
                console.warn('⚠️ No se pudo obtener imagen del registro:', img);
                celdasImagen.push(
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: '', font: 'Arial', size: 24 })
                        ]
                      })
                    ]
                  })
                );
                celdasDescripcion.push(
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: '', font: 'Arial', size: 24 })
                        ]
                      })
                    ]
                  })
                );
              }
            } catch (error) {
              console.error('❌ Error procesando imagen del registro:', error);
              celdasImagen.push(new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: '', font: 'Arial', size: 24 })]
                  })
                ]
              }));
              celdasDescripcion.push(new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: '', font: 'Arial', size: 24 })]
                  })
                ]
              }));
            }
          }

          // Agrega la fila de imágenes y la de descripciones
          filas.push(new TableRow({ children: celdasImagen }));
          filas.push(new TableRow({ children: celdasDescripcion }));
        }

        contenidoRegistroFotografico = [
          crearTextoNormal("REGISTRO FOTOGRÁFICO", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: filas,
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new Paragraph({ text: "", spacing: { after: 200 } })
        ];
      }

      // ============ SISTEMA DE NUMERACIÓN DINÁMICA ============
      
      // Función para verificar si una sección tiene contenido
      const tieneContenido = (contenido) => {
        if (!contenido) return false;
        if (typeof contenido === 'string') return contenido.trim().length > 0;
        if (Array.isArray(contenido)) return contenido.length > 0;
        return true;
      };

      // Función para generar secciones dinámicamente (solo si tienen contenido)
      const generarSeccionesDinamicas = () => {
        const secciones = [];
        let numeroSeccion = 1;

        // Función helper para agregar sección
        const agregarSeccion = (titulo, contenido, esSubseccion = false) => {
          if (!tieneContenido(contenido)) return; // No agregar si está vacío

          if (!esSubseccion) {
            // Sección principal
            secciones.push(
              crearTextoNormal(`${numeroSeccion}. ${tituloAjuste(titulo)}`, { 
                heading: HeadingLevel.HEADING_2, 
                spacing: { before: 200, after: 200 } 
              }),
              ...(typeof contenido === 'string' 
                ? crearParrafosDesdeTexto(contenido, { spacingAfter: 200 })
                : Array.isArray(contenido) 
                  ? contenido 
                  : [contenido]
              )
            );
            numeroSeccion++;
          } else {
            // Subsección (no aumenta el número principal)
            secciones.push(...contenido);
          }
        };

        // 1. ANTECEDENTES
        agregarSeccion('ANTECEDENTES', formData.antecedentes);

        // 2. DESCRIPCIÓN DE RIESGO (texto del acta + mapa; el mapa no va en la portada)
        {
          const hayDesc = tieneContenido(formData.descripcionRiesgo);
          const hayMapa = Boolean(mapaDataUrlParaWord);
          if (hayDesc || hayMapa) {
            secciones.push(
              crearTextoNormal(`${numeroSeccion}. DESCRIPCIÓN DE RIESGO`, {
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
              })
            );
            if (hayDesc) {
              secciones.push(...crearParrafosDesdeTexto(formData.descripcionRiesgo, { spacingAfter: 200 }));
            }
            secciones.push(
              crearTextoNormal('UBICACIÓN GEOGRÁFICA DEL SINIESTRO', {
                heading: HeadingLevel.HEADING_3,
                alignment: AlignmentType.CENTER,
                spacing: { before: hayDesc ? 200 : 0, after: 200 }
              })
            );
            if (hayMapa) {
              secciones.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: stripMapaBase64ParaDocx(mapaDataUrlParaWord),
                      transformation: {
                        width: 400,
                        height: 300
                      }
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 }
                })
              );
            } else {
              secciones.push(
                crearTextoNormal('[IMAGEN DEL MAPA - Ubicación del siniestro]', {
                  spacingAfter: 200,
                  italics: true,
                  alignment: AlignmentType.CENTER
                })
              );
            }
            numeroSeccion++;
          }
        }

        // 3. CIRCUNSTANCIAS: en acta se escribe como «Descripción del siniestro»; aquí va ese texto (y ampliaciones del informe).
        {
          const d = String(formData.descripcionSiniestro || '').trim();
          const c = String(formData.circunstanciasSiniestro || '').trim();
          const textoCircunstancias =
            c && d && c !== d ? `${d}\n\n${c}` : c || d;
          agregarSeccion('CIRCUNSTANCIAS DEL SINIESTRO', textoCircunstancias);
        }

        const observacionesAlFinalInforme =
          estadoActual === 'inicial' ||
          estadoActual === 'preeliminar' ||
          estadoActual === 'actualizacion';

        if (!observacionesAlFinalInforme) {
          agregarSeccion('OBSERVACIONES', formData.actaObservaciones);
        }

        // 5. INSPECCIÓN Y REGISTRO FOTOGRÁFICO
        if (tieneContenido(formData.descripcionInspeccion)) {
          agregarSeccion('INSPECCIÓN Y REGISTRO FOTOGRÁFICO', formData.descripcionInspeccion);
        }
        
        // REGISTRO FOTOGRÁFICO (si hay imágenes) - se agrega después de INSPECCIÓN
        if (contenidoRegistroFotografico && contenidoRegistroFotografico.length > 0) {
          // Agregar el título con numeración dinámica
          secciones.push(
            crearTextoNormal(`${numeroSeccion}. REGISTRO FOTOGRÁFICO`, { 
              heading: HeadingLevel.HEADING_2, 
              spacing: { before: 200, after: 200 } 
            })
          );
          // Agregar el contenido (tabla de imágenes) sin el título duplicado
          secciones.push(...contenidoRegistroFotografico.slice(1)); // slice(1) para omitir el título que ya agregamos
          numeroSeccion++;
        }

        // 6. CAUSA (SIEMPRE debe aparecer, solo se corrige la numeración)
        agregarSeccion('CAUSA', formData.causa);

        // Orden: análisis de cobertura → reserva → salvamentos → recobro → observaciones
        const tieneAnalisisCobertura =
          tieneContenido(formData.coberturasAplicables) ||
          tieneContenido(formData.exclusiones) ||
          tieneContenido(formData.garantias);

        if (tieneAnalisisCobertura) {
          const numSeccionAnalisis = numeroSeccion;
          secciones.push(
            crearTextoNormal(`${numeroSeccion}. ANÁLISIS DE COBERTURA`, { 
              heading: HeadingLevel.HEADING_2, 
              spacing: { before: 200, after: 200 } 
            })
          );
          
          let numSubseccion = 1;
          if (tieneContenido(formData.coberturasAplicables)) {
            secciones.push(
              crearTextoNormal(`${numSeccionAnalisis}.${numSubseccion}. COBERTURAS APLICABLES`, { 
                heading: HeadingLevel.HEADING_3, 
                spacing: { before: 150, after: 150 } 
              }),
              ...crearParrafosDesdeTexto(formData.coberturasAplicables, { spacingAfter: 200 })
            );
            numSubseccion++;
          }
          if (tieneContenido(formData.exclusiones)) {
            secciones.push(
              crearTextoNormal(`${numSeccionAnalisis}.${numSubseccion}. EXCLUSIONES`, { 
                heading: HeadingLevel.HEADING_3, 
                spacing: { before: 150, after: 150 } 
              }),
              ...crearParrafosDesdeTexto(formData.exclusiones, { spacingAfter: 200 })
            );
            numSubseccion++;
          }
          if (tieneContenido(formData.garantias)) {
            secciones.push(
              crearTextoNormal(`${numSeccionAnalisis}.${numSubseccion}. GARANTÍAS`, { 
                heading: HeadingLevel.HEADING_3, 
                spacing: { before: 150, after: 150 } 
              }),
              ...crearParrafosDesdeTexto(formData.garantias, { spacingAfter: 200 })
            );
            numSubseccion++;
          }
          numeroSeccion++;
        }

        if (estadoActual !== 'informeFinal') {
          const itemsReserva = Array.isArray(formData.reservaSugeridaItems)
            ? formData.reservaSugeridaItems
            : [];
          const hayTextoReserva = tieneContenido(formData.reservaSugerida);
          const hayTablaReserva = itemsReserva.some(
            (item) => tieneContenido(item?.descripcion) || tieneContenido(item?.reserva)
          );

          if (hayTextoReserva || hayTablaReserva) {
            secciones.push(
              crearTextoNormal(`${numeroSeccion}. RESERVA SUGERIDA`, {
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
              })
            );

            if (hayTextoReserva) {
              secciones.push(...crearParrafosDesdeTexto(formData.reservaSugerida, { spacingAfter: 200 }));
            }

            if (hayTablaReserva) {
              const parsearMontoReserva = (valor) => {
                if (valor === undefined || valor === null || valor === '') return 0;
                const limpio = String(valor).replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
                const num = parseFloat(limpio);
                return Number.isNaN(num) ? 0 : num;
              };
              const formatearMontoReserva = (valor) =>
                new Intl.NumberFormat('es-CO', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                }).format(parsearMontoReserva(valor));

              const celdaTabla = (
                texto,
                { bold = false, align = AlignmentType.LEFT, header = false } = {}
              ) =>
                new TableCell({
                  children: [
                    crearTextoNormal(String(texto ?? ''), {
                      bold,
                      size: header ? 20 : 18,
                      alignment: align
                    })
                  ],
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                  ...(header ? { shading: { fill: 'D3D3D3' } } : {})
                });

              const filasTablaReserva = [
                new TableRow({
                  children: [
                    celdaTabla('ITEM', { bold: true, align: AlignmentType.CENTER, header: true }),
                    celdaTabla('DESCRIPCIÓN', { bold: true, header: true }),
                    celdaTabla('RESERVA SUGERIDA', { bold: true, align: AlignmentType.RIGHT, header: true })
                  ]
                })
              ];

              let totalReservaWord = 0;
              itemsReserva.forEach((item, index) => {
                if (!tieneContenido(item?.descripcion) && !tieneContenido(item?.reserva)) return;
                totalReservaWord += parsearMontoReserva(item?.reserva);
                filasTablaReserva.push(
                  new TableRow({
                    children: [
                      celdaTabla(String(index + 1), { align: AlignmentType.CENTER }),
                      celdaTabla(item?.descripcion || ''),
                      celdaTabla(formatearMontoReserva(item?.reserva), { align: AlignmentType.RIGHT })
                    ]
                  })
                );
              });

              filasTablaReserva.push(
                new TableRow({
                  children: [
                    new TableCell({
                      columnSpan: 2,
                      children: [
                        crearTextoNormal('TOTAL RESERVA', {
                          bold: true,
                          size: 20,
                          alignment: AlignmentType.RIGHT
                        })
                      ],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                      shading: { fill: 'D1FAE5' }
                    }),
                    new TableCell({
                      children: [
                        crearTextoNormal(formatearMontoReserva(totalReservaWord), {
                          bold: true,
                          size: 20,
                          alignment: AlignmentType.RIGHT
                        })
                      ],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                      shading: { fill: 'D1FAE5' }
                    })
                  ]
                })
              );

              secciones.push(
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: filasTablaReserva
                }),
                crearTextoNormal('', { spacingAfter: 200 })
              );
            }

            numeroSeccion++;
          }
        }

        if (estadoActual !== 'actaInspeccion') {
          agregarSeccion('SALVAMENTOS', formData.salvamentos);
          agregarSeccion('RECOBRO', formData.recobro);
        }

        if (observacionesAlFinalInforme) {
          agregarSeccion('OBSERVACIONES', formData.actaObservaciones);
        }

        // SECCIONES ESPECÍFICAS DE ACTUALIZACIÓN
        if (estadoActual === 'actualizacion') {
          agregarSeccion('OBSERVACIONES DE ACTUALIZACIÓN', formData.observacionesActualizacion);
        }

        // SECCIONES ESPECÍFICAS DE INFORME FINAL
        if (estadoActual === 'informeFinal') {
          agregarSeccion('CONCLUSIONES FINALES', formData.conclusionesFinales);
          agregarSeccion('RECOMENDACIONES FINALES', formData.recomendacionesFinales);
          agregarSeccion('OBSERVACIONES DEL INFORME FINAL', formData.observacionesInformeFinal);

          // LIQUIDACIÓN DE LA PÉRDIDA
          const tieneLiquidacion =
            tieneContenido(formData.liquidacionPerdida?.infraseguro) ||
            tieneContenido(formData.liquidacionPerdida?.demerito) ||
            tieneContenido(formData.liquidacionPerdida?.avanceTecnologico);

          if (tieneLiquidacion) {
            const numSeccionLiq = numeroSeccion;
            secciones.push(
              crearTextoNormal(`${numeroSeccion}. LIQUIDACIÓN DE LA PÉRDIDA`, { 
                heading: HeadingLevel.HEADING_2, 
                spacing: { before: 200, after: 200 } 
              })
            );
            
            if (tieneContenido(formData.liquidacionPerdida?.infraseguro)) {
              secciones.push(
                crearTextoNormal('Infraseguro:', { bold: true, spacingAfter: 100 }),
                ...crearParrafosDesdeTexto(formData.liquidacionPerdida.infraseguro, { spacingAfter: 200 })
              );
            }
            if (tieneContenido(formData.liquidacionPerdida?.demerito)) {
              secciones.push(
                crearTextoNormal('Demérito:', { bold: true, spacingAfter: 100 }),
                ...crearParrafosDesdeTexto(formData.liquidacionPerdida.demerito, { spacingAfter: 200 })
              );
            }
            if (tieneContenido(formData.liquidacionPerdida?.avanceTecnologico)) {
              secciones.push(
                crearTextoNormal('Avance Tecnológico:', { bold: true, spacingAfter: 100 }),
                ...crearParrafosDesdeTexto(formData.liquidacionPerdida.avanceTecnologico, { spacingAfter: 200 })
              );
            }
            numeroSeccion++;
          }

          // LIQUIDADOR - Tabla de liquidación
          if (formData.liquidador && formData.liquidador.items && formData.liquidador.items.length > 0) {
            // Función para parsear números (convertir formato colombiano a número)
            const parsearNumero = (valor) => {
              if (!valor || valor === '') return 0;
              if (typeof valor === 'number') return valor;
              // Remover caracteres no numéricos excepto punto y coma
              let numero = String(valor).replace(/[^\d.,]/g, '');
              // Si tiene punto y coma, el punto es separador de miles y la coma es decimal
              // Si solo tiene puntos, son separadores de miles
              if (numero.includes(',') && numero.includes('.')) {
                // Tiene ambos: punto es miles, coma es decimal
                numero = numero.replace(/\./g, '').replace(',', '.');
              } else if (numero.includes('.') && !numero.includes(',')) {
                // Solo tiene puntos: son separadores de miles
                numero = numero.replace(/\./g, '');
              } else if (numero.includes(',')) {
                // Solo tiene coma: es decimal
                numero = numero.replace(',', '.');
              }
              const num = parseFloat(numero);
              return isNaN(num) ? 0 : num;
            };

            // Función para formatear números para mostrar
            const formatearNumeroMostrar = (valor) => {
              const num = parsearNumero(valor);
              if (num === 0 && (valor === '' || valor === null || valor === undefined)) return '0';
              // Formatear el número manteniendo el signo negativo si existe
              const esNegativo = num < 0;
              const numeroAbsoluto = Math.abs(num);
              const formateado = new Intl.NumberFormat('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              }).format(numeroAbsoluto);
              // Agregar el signo negativo si el número es negativo
              return esNegativo ? `-${formateado}` : formateado;
            };

            // Calcular totales
            const totalReclamado = formData.liquidador.items.reduce((sum, item) => {
              return sum + parsearNumero(item.valorReclamado || 0);
            }, 0);

            const totalAjustado = formData.liquidador.items.reduce((sum, item) => {
              return sum + parsearNumero(item.valorAjustado || 0);
            }, 0);

            const deduciblePorcentaje = parseFloat(formData.liquidador.deduciblePorcentaje) || 15;
            // Deducible por porcentaje
            const deduciblePorcentajeValor = totalAjustado * (deduciblePorcentaje / 100);
            // Deducible SMMLV
            const valorSMMLVTotal = parsearNumero(formData.liquidador.valorSMMLV || 0);
            const cantidadSMMLVTotal = formData.liquidador.cantidadSMMLV || 4;
            const deducibleSMMLVValor = valorSMMLVTotal * cantidadSMMLVTotal;
            // Deducible aplicable (el mayor valor)
            const deducible = Math.max(deduciblePorcentajeValor, deducibleSMMLVValor);
            
            // Total a indemnizar: Total valor ajustado - deducible aplicable
            const totalIndemnizar = totalAjustado - deducible;

            secciones.push(
              crearTextoNormal(`${numeroSeccion}. LIQUIDADOR`, { 
                heading: HeadingLevel.HEADING_2, 
                spacing: { before: 200, after: 200 } 
              })
            );

            // Crear tabla del liquidador
            const filasTabla = [
              // Encabezados
              new TableRow({
                children: [
                  new TableCell({
                    children: [crearTextoNormal('BIEN AFECTADO', { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: 'D3D3D3' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal('LÍMITE ASEGURADO', { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: 'D3D3D3' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal('VALOR RECLAMADO', { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: 'D3D3D3' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal('VALOR AJUSTADO', { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: 'D3D3D3' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal('OBSERVACIÓN', { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: 'D3D3D3' }
                  })
                ]
              })
            ];

            // Agregar filas de items
            formData.liquidador.items.forEach(item => {
              filasTabla.push(
                new TableRow({
                  children: [
                    new TableCell({
                      children: [crearTextoNormal(item.bienAfectado || '', { size: 18 })],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    }),
                    new TableCell({
                      children: [crearTextoNormal(item.limiteAsegurado || '', { size: 18 })],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    }),
                    new TableCell({
                      children: [crearTextoNormal(`$ ${formatearNumeroMostrar(item.valorReclamado)}`, { size: 18 })],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    }),
                    new TableCell({
                      children: [crearTextoNormal(`$ ${formatearNumeroMostrar(item.valorAjustado)}`, { size: 18 })],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    }),
                    new TableCell({
                      children: [crearTextoNormal(item.observacion || '', { size: 18 })],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    })
                  ]
                })
              );
            });

            // Agregar fila de totales
            filasTabla.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [crearTextoNormal('TOTAL', { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' },
                    columnSpan: 2
                  }),
                  new TableCell({
                    children: [crearTextoNormal(`$ ${formatearNumeroMostrar(totalReclamado)}`, { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal(`$ ${formatearNumeroMostrar(totalAjustado)}`, { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal('', { size: 18 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [crearTextoNormal(`DEDUCIBLE ${deduciblePorcentaje}%`, { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' },
                    columnSpan: 3
                  }),
                  new TableCell({
                    children: [crearTextoNormal(`$ ${formatearNumeroMostrar(deduciblePorcentajeValor)}`, { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal('', { size: 18 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [crearTextoNormal(`DEDUCIBLE ${cantidadSMMLVTotal} SMMLV`, { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' },
                    columnSpan: 3
                  }),
                  new TableCell({
                    children: [crearTextoNormal(`$ ${formatearNumeroMostrar(deducibleSMMLVValor)}`, { bold: true, size: 20 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal('', { size: 18 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [crearTextoNormal('TOTAL A INDEMNIZAR', { bold: true, size: 22 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' },
                    columnSpan: 3
                  }),
                  new TableCell({
                    children: [crearTextoNormal(`$ ${formatearNumeroMostrar(totalIndemnizar)}`, { bold: true, size: 22 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  }),
                  new TableCell({
                    children: [crearTextoNormal('', { size: 18 })],
                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    shading: { fill: '90EE90' }
                  })
                ]
              })
            );

            // Calcular valores del resumen (cuadro pequeño)
            const resumenTotalAjustado = formData.liquidador.resumenTotalAjustado || formatearNumeroMostrar(totalAjustado);
            // Calcular deducible del resumen: Total ajustado × porcentaje
            const resumenTotalAjustadoNum = parsearNumero(resumenTotalAjustado);
            const resumenDeducible15 = formData.liquidador.resumenDeducible15 || formatearNumeroMostrar(resumenTotalAjustadoNum * (deduciblePorcentaje / 100));
            // Calcular deducible SMMLV del resumen
            const valorSMMLV = parsearNumero(formData.liquidador.valorSMMLV || 0);
            const cantidadSMMLV = formData.liquidador.cantidadSMMLV || 4;
            const deducibleSMMLVResumen = valorSMMLV * cantidadSMMLV;
            const resumenDeducibleSMMLV = formData.liquidador.resumenDeducibleSMMLV || formatearNumeroMostrar(deducibleSMMLVResumen);
            const resumenDeducible15Num = parsearNumero(resumenDeducible15);
            const resumenDeducibleSMMLVNum = parsearNumero(resumenDeducibleSMMLV);
            const usaSMMLVResumen = resumenDeducibleSMMLVNum > resumenDeducible15Num;
            const deducibleSeleccionadoResumen = usaSMMLVResumen ? resumenDeducibleSMMLV : resumenDeducible15;
            const etiquetaDeducibleResumen = usaSMMLVResumen
              ? `deducible ${cantidadSMMLV} SMMLV`
              : `deducible ${deduciblePorcentaje}%`;
            // Total a indemnizar: Total ajustado - deducible de mayor valor
            const totalIndemnizarResumen = resumenTotalAjustadoNum - Math.max(resumenDeducible15Num, resumenDeducibleSMMLVNum);
            const resumenTotalIndemnizar = formData.liquidador.resumenTotalIndemnizar || formatearNumeroMostrar(totalIndemnizarResumen);

            // Primero agregar la tabla principal del liquidador
            secciones.push(
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: filasTabla
              })
            );

            // Luego agregar la tabla de resumen (cuadro pequeño)
            secciones.push(
              crearTextoNormal('', { spacingAfter: 200 }),
              new Table({
                width: {
                  size: 50,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [crearTextoNormal('Total del valor ajustado', { bold: true, size: 18 })],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        shading: { fill: '90EE90' }
                      }),
                      new TableCell({
                        children: [crearTextoNormal(`$ ${resumenTotalAjustado}`, { bold: true, size: 20 })],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        shading: { fill: '90EE90' }
                      })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [crearTextoNormal(etiquetaDeducibleResumen, { size: 18 })],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        shading: { fill: '90EE90' }
                      }),
                      new TableCell({
                        children: [crearTextoNormal(`$ ${deducibleSeleccionadoResumen}`, { size: 18 })],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        shading: { fill: '90EE90' }
                      })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [crearTextoNormal('Total a indemnizar', { bold: true, size: 20 })],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        shading: { fill: '90EE90' }
                      }),
                      new TableCell({
                        children: [crearTextoNormal(`$ ${resumenTotalIndemnizar}`, { bold: true, size: 20 })],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        shading: { fill: '90EE90' }
                      })
                    ]
                  })
                ]
              })
            );

            numeroSeccion++;
          }

          // INDEMNIZACIÓN
          const tieneIndemnizacion =
            tieneContenido(formData.indemnizacion?.deducible) ||
            tieneContenido(formData.indemnizacion?.subrogacion);

          if (tieneIndemnizacion) {
            secciones.push(
              crearTextoNormal(`${numeroSeccion}. INDEMNIZACIÓN`, { 
                heading: HeadingLevel.HEADING_2, 
                spacing: { before: 200, after: 200 } 
              })
            );
            
            if (tieneContenido(formData.indemnizacion?.deducible)) {
              secciones.push(
                crearTextoNormal('Deducible:', { bold: true, spacingAfter: 100 }),
                ...crearParrafosDesdeTexto(formData.indemnizacion.deducible, { spacingAfter: 200 })
              );
            }
            if (tieneContenido(formData.indemnizacion?.subrogacion)) {
              secciones.push(
                crearTextoNormal('Subrogación:', { bold: true, spacingAfter: 100 }),
                ...crearParrafosDesdeTexto(formData.indemnizacion.subrogacion, { spacingAfter: 200 })
              );
            }
            numeroSeccion++;
          }

          // RECOMENDACIONES (PANORAMA DE RIESGOS)
          agregarSeccion('RECOMENDACIONES', formData.panoramaRiesgos);
        }

        return secciones;
      };

      const bordesTablaSinLineas = {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical: { style: BorderStyle.NONE, size: 0 }
      };

      /**
       * Firmas en Word:
       * - acta: cliente (izq) + ajustador (der)
       * - informe (preliminar / actualización / final): ajustador (izq) + Iskharly por defecto (der)
       */
      const resolverFirmaAjustadorDesdeGuardadas = (fd) => {
        if (fd.actaAjustadorFirmaImagen) return fd.actaAjustadorFirmaImagen;
        if (fd.firmaFuncionario) return fd.firmaFuncionario;
        try {
          const raw =
            typeof localStorage !== 'undefined'
              ? localStorage.getItem('proser_funcionarios')
              : null;
          if (!raw) return '';
          const funcionarios = JSON.parse(raw);
          if (!Array.isArray(funcionarios)) return '';
          if (fd.actaAjustadorFuncionarioId) {
            const porId = funcionarios.find(
              (f) => String(f._id) === String(fd.actaAjustadorFuncionarioId)
            );
            if (porId?.firma) return porId.firma;
          }
          const nombre = String(fd.actaAjustadorNombre || fd.funcionarioFirma || '').trim();
          if (nombre) {
            const porNombre = funcionarios.find(
              (f) => String(f.nombre || '').trim() === nombre
            );
            if (porNombre?.firma) return porNombre.firma;
          }
          const conFirma = funcionarios.find((f) => f.firma);
          return conFirma?.firma || '';
        } catch {
          return '';
        }
      };

      const resolverFirmaIskharlyParaWord = (fd) =>
        fd.firmaIskharly ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('proser_firma_isharly')
          : '') ||
        firmaIskharlyDefaultBase64 ||
        '';

      const construirElementosFirmasActaWord = (fd, opciones = {}) => {
        const modo = opciones.modo === 'informe' ? 'informe' : 'acta';

        const primeraLegacy =
          Array.isArray(fd.actaFirmas) && fd.actaFirmas.length > 0 ? fd.actaFirmas[0] : null;
        const nombreClienteDoc = String(fd.actaClienteNombre || primeraLegacy?.nombre || '').trim();
        const cargoClienteDoc = String(fd.actaClienteCargo || '').trim();
        const emailClienteDoc = String(fd.actaClienteEmail || '').trim();
        const imgClienteSrc = fd.actaClienteFirma || primeraLegacy?.firma;
        const imgAjustadorSrc = resolverFirmaAjustadorDesdeGuardadas(fd);
        const nombreAjustadorDoc = String(
          fd.actaAjustadorNombre || fd.funcionarioFirma || ''
        ).trim();
        const cargoAjustDoc = String(fd.actaAjustadorCargo || fd.cargoFuncionario || '').trim();
        const emailAjustDoc = String(fd.actaAjustadorEmail || fd.emailFuncionario || '').trim();

        const nombreIskharlyDoc = 'Iskharly José Tapia Gutiérrez';
        const cargoIskharlyDoc = 'Gerente Técnico';
        const emailIskharlyDoc = 'itapia@proserpuertos.com.co';
        const imgIskharlySrc = resolverFirmaIskharlyParaWord(fd);

        const bufferDesdeDataUrl = (dataUrl) => {
          if (!dataUrl || typeof dataUrl !== 'string') return null;
          const idx = dataUrl.indexOf('base64,');
          const raw = idx !== -1 ? dataUrl.slice(idx + 7) : dataUrl;
          if (!raw) return null;
          try {
            return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)).buffer;
          } catch {
            return null;
          }
        };

        const bufCliente = bufferDesdeDataUrl(imgClienteSrc);
        const bufAjustador = bufferDesdeDataUrl(imgAjustadorSrc);
        const bufIskharly = bufferDesdeDataUrl(imgIskharlySrc);

        const parrafoFirmaOGuion = (buf) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 100 },
            children: buf
              ? [
                  new ImageRun({
                    data: buf,
                    transformation: { width: 160, height: 80 }
                  })
                ]
              : [
                  new TextRun({
                    text: '________________________',
                    font: 'Arial',
                    size: 24,
                    color: '000000'
                  })
                ]
          });

        const margFirma = { top: 100, bottom: 100, left: 140, right: 140 };
        const celdaFirmaActa = (children) =>
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: margFirma,
            verticalAlign: VerticalAlign.CENTER,
            children
          });

        if (modo === 'informe') {
          const filasFirmaInforme = [
            new TableRow({
              children: [
                celdaFirmaActa([
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                      new TextRun({
                        text: 'FIRMA DEL AJUSTADOR',
                        font: 'Arial',
                        size: 22,
                        bold: true
                      })
                    ]
                  })
                ]),
                celdaFirmaActa([
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                      new TextRun({
                        text: 'FIRMA GERENTE TÉCNICO',
                        font: 'Arial',
                        size: 22,
                        bold: true
                      })
                    ]
                  })
                ])
              ]
            }),
            new TableRow({
              children: [
                celdaFirmaActa([parrafoFirmaOGuion(bufAjustador)]),
                celdaFirmaActa([parrafoFirmaOGuion(bufIskharly)])
              ]
            }),
            new TableRow({
              children: [
                celdaFirmaActa([
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                    children: [
                      new TextRun({
                        text: nombreAjustadorDoc || 'NOMBRE DEL AJUSTADOR',
                        font: 'Arial',
                        size: 24,
                        bold: true,
                        underline: {}
                      })
                    ]
                  })
                ]),
                celdaFirmaActa([
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80 },
                    children: [
                      new TextRun({
                        text: nombreIskharlyDoc,
                        font: 'Arial',
                        size: 24,
                        bold: true,
                        underline: {}
                      })
                    ]
                  })
                ])
              ]
            }),
            new TableRow({
              children: [
                celdaFirmaActa([
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                      new TextRun({
                        text: cargoAjustDoc || '—',
                        font: 'Arial',
                        size: 20,
                        color: '000000'
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: 'E-Mail: ', font: 'Arial', size: 20, bold: true }),
                      new TextRun({
                        text: emailAjustDoc || '—',
                        font: 'Arial',
                        size: 20,
                        color: '0066CC'
                      })
                    ]
                  })
                ]),
                celdaFirmaActa([
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                      new TextRun({
                        text: cargoIskharlyDoc,
                        font: 'Arial',
                        size: 20,
                        color: '000000'
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: 'E-Mail: ', font: 'Arial', size: 20, bold: true }),
                      new TextRun({
                        text: emailIskharlyDoc,
                        font: 'Arial',
                        size: 20,
                        color: '0066CC'
                      })
                    ]
                  })
                ])
              ]
            }),
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 2,
                  margins: margFirma,
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 40, after: 80 },
                      children: [
                        new TextRun({
                          text: 'Proser Ajustes SAS',
                          font: 'Arial',
                          size: 24,
                          bold: true,
                          color: 'FF0000'
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ];

          return [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: bordesTablaSinLineas,
              rows: filasFirmaInforme
            }),
            new Paragraph({ text: '', spacing: { after: 300 } })
          ];
        }

        const filasFirmasActaDosCols = [
          new TableRow({
            children: [
              celdaFirmaActa([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 120 },
                  children: [
                    new TextRun({
                      text: 'FIRMA DE CLIENTE',
                      font: 'Arial',
                      size: 22,
                      bold: true
                    })
                  ]
                })
              ]),
              celdaFirmaActa([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 120 },
                  children: [
                    new TextRun({
                      text: 'FIRMA DEL AJUSTADOR',
                      font: 'Arial',
                      size: 22,
                      bold: true
                    })
                  ]
                })
              ])
            ]
          }),
          new TableRow({
            children: [
              celdaFirmaActa([parrafoFirmaOGuion(bufCliente)]),
              celdaFirmaActa([parrafoFirmaOGuion(bufAjustador)])
            ]
          }),
          new TableRow({
            children: [
              celdaFirmaActa([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: nombreClienteDoc || 'NOMBRE DEL CLIENTE / TITULAR',
                      font: 'Arial',
                      size: 24,
                      bold: true,
                      underline: {}
                    })
                  ]
                })
              ]),
              celdaFirmaActa([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: nombreAjustadorDoc || 'NOMBRE DEL AJUSTADOR',
                      font: 'Arial',
                      size: 24,
                      bold: true,
                      underline: {}
                    })
                  ]
                })
              ])
            ]
          }),
          new TableRow({
            children: [
              celdaFirmaActa([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                    new TextRun({
                      text: cargoClienteDoc || '—',
                      font: 'Arial',
                      size: 20,
                      color: '000000'
                    })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: 'Correo: ', font: 'Arial', size: 20, bold: true }),
                    new TextRun({
                      text: emailClienteDoc || '—',
                      font: 'Arial',
                      size: 20,
                      color: '0066CC'
                    })
                  ]
                })
              ]),
              celdaFirmaActa([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                    new TextRun({
                      text: cargoAjustDoc || '—',
                      font: 'Arial',
                      size: 20,
                      color: '000000'
                    })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [
                    new TextRun({ text: 'E-Mail: ', font: 'Arial', size: 20, bold: true }),
                    new TextRun({
                      text: emailAjustDoc || '—',
                      font: 'Arial',
                      size: 20,
                      color: '0066CC'
                    })
                  ]
                })
              ])
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                margins: margFirma,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 80 },
                    children: [
                      new TextRun({
                        text: 'Proser Ajustes SAS',
                        font: 'Arial',
                        size: 24,
                        bold: true,
                        color: 'FF0000'
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ];

        return [
          crearTextoNormal('FIRMAS', { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 150 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: bordesTablaSinLineas,
            rows: filasFirmasActaDosCols
          }),
          new Paragraph({ text: '', spacing: { after: 300 } })
        ];
      };

      const textoCierreAntesFirmasInforme = () => [
        crearTextoNormal(
          'De esta manera nos permitimos entregar el presente informe, agradeciendo la confianza depositada en nuestra firma.',
          { alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 } }
        ),
        crearTextoNormal('Cordialmente.', {
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      ];

      const construirBloqueActaInspeccionWord = async () => {
        const fd = formData;
        const encabezadoCelda = (texto) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: texto, bold: true, font: 'Arial', size: 22 })]
              })
            ],
            shading: { fill: 'D9D9D9' }
          });
        const celdaValor = (texto) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: texto || '', font: 'Arial', size: 22 })]
              })
            ]
          });

        return [
          crearTitulo('ACTA DE INSPECCIÓN', 1),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
              insideHorizontal: { style: BorderStyle.NONE, size: 0 },
              insideVertical: { style: BorderStyle.NONE, size: 0 }
            },
            rows: [
              new TableRow({
                children: [
                  encabezadoCelda('FECHA INSPECCIÓN'),
                  celdaValor(fd.fechaInspeccion || ''),
                  encabezadoCelda('CIUDAD'),
                  celdaValor(fd.ciudad || '')
                ]
              }),
              new TableRow({
                children: [
                  encabezadoCelda('DIRECCIÓN'),
                  celdaValor(fd.direccionRiesgo || ''),
                  encabezadoCelda('TIPO DE RIESGO'),
                  celdaValor(fd.tipoRiesgoActa || '')
                ]
              }),
              new TableRow({
                children: [
                  encabezadoCelda('ASEGURADO'),
                  celdaValor(fd.asegurado || ''),
                  encabezadoCelda('IDENTIFICACIÓN'),
                  celdaValor(fd.identificacionActa || fd.metadata?.numeroDocumento || '')
                ]
              }),
              new TableRow({
                children: [
                  encabezadoCelda('No. SINIESTRO'),
                  celdaValor(fd.numeroSiniestro || ''),
                  encabezadoCelda('FECHA SINIESTRO'),
                  celdaValor(fd.fechaSiniestro || '')
                ]
              })
            ]
          }),
          new Paragraph({ children: [], spacing: { after: 200 } }),
          crearTextoNormal('DESCRIPCIÓN DE RIESGO', { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 150 } }),
          ...(String(fd.descripcionRiesgo || '').trim()
            ? crearParrafosDesdeTexto(fd.descripcionRiesgo, { spacingAfter: 200 })
            : [crearMensajeSinInformacion('Descripción del riesgo')]),
          crearTextoNormal('DESCRIPCIÓN DEL SINIESTRO', { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 150 } }),
          ...(String(fd.descripcionSiniestro || '').trim()
            ? crearParrafosDesdeTexto(fd.descripcionSiniestro, { spacingAfter: 200 })
            : [crearMensajeSinInformacion('Descripción del siniestro')]),
          crearTextoNormal('OBSERVACIONES (ACTA)', { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 150 } }),
          ...(String(fd.actaObservaciones || '').trim()
            ? crearParrafosDesdeTexto(fd.actaObservaciones, { spacingAfter: 200 })
            : [crearMensajeSinInformacion('Observaciones del acta')]),
          ...construirElementosFirmasActaWord(fd, { modo: 'acta' })
        ];
      };

      const bloqueActaInspeccionWord =
        estadoActual === 'actaInspeccion' ? await construirBloqueActaInspeccionWord() : [];

      // ========================================================

      const doc = new Document({
        sections: [{
          properties: {},
          headers: {
            default: new Header({
              children: [
                // ENCABEZADO ORGANIZADO CON TABLA Y LOGO
                new Table({
                  width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                  },
                  ...(estadoActual === 'actaInspeccion' ? { borders: bordesTablaSinLineas } : {}),
                  rows: [
                    // Fila 1: Logo y título principal
                    new TableRow({
                      children: [
                        // Columna izquierda: Solo logo en recuadro blanco
                        new TableCell({
                          width: {
                            size: 50,
                            type: WidthType.PERCENTAGE,
                          },
                          children: logoBase64 ? [
                            new Paragraph({
                              children: [
                                new ImageRun({
                                  data: logoBase64.replace('data:image/png;base64,', ''),
                                  transformation: {
                                    width: 220,  // 5.81 cm ≈ 220 píxeles
                                    height: 83   // 2.2 cm ≈ 83 píxeles
                                  }
                                })
                              ],
                              alignment: AlignmentType.CENTER,
                              spacing: { after: 0 }
                            })
                          ] : [],
                          margins: { top: 200, bottom: 200, left: 200, right: 200 },
                          verticalAlign: "center",
                          shading: {
                            fill: "FFFFFF" // Fondo blanco para el recuadro
                          }
                        }),
                        
                        // Columna derecha: Información del reporte
                        new TableCell({
                          width: {
                            size: 50,
                            type: WidthType.PERCENTAGE,
                          },
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: "INFORME DE INSPECCION",
                                  font: 'Arial',
                                  size: 24,
                                  bold: true,
                                  color: estadoActual === 'actaInspeccion' ? '000000' : '0066CC'
                                })
                              ],
                              alignment: AlignmentType.LEFT,
                              spacing: { after: 100 }
                            }),
                            new Paragraph({
                              children: [
                                new TextRun({
                                  text: formData.inspector || "INSPECTOR",
                                  font: 'Arial',
                                  size: 18
                                })
                              ],
                              alignment: AlignmentType.LEFT,
                              spacing: { after: 100 }
                            }),
                            // Tabla para código, versión y fecha
                            new Table({
                              width: {
                                size: 100,
                                type: WidthType.PERCENTAGE,
                              },
                              ...(estadoActual === 'actaInspeccion' ? { borders: bordesTablaSinLineas } : {}),
                              rows: [
                                new TableRow({
                                  children: [
                                    new TableCell({
                                      children: [
                                        crearTextoNormal(`CÓDIGO: ${formData.codigoReporte || 'RIU-ISA-001'}`, { size: 14, alignment: AlignmentType.LEFT })
                                      ],
                                      margins: { top: 100, bottom: 100, left: 100, right: 100 }
                                    }),
                                    new TableCell({
                                      children: [
                                        crearTextoNormal(`VERSIÓN: ${formData.versionReporte || '1'}`, { size: 14, alignment: AlignmentType.LEFT })
                                      ],
                                      margins: { top: 100, bottom: 100, left: 100, right: 100 }
                                    }),
                                    new TableCell({
                                      children: [
                                        crearTextoNormal(`FECHA: ${formatearFechaParaWord(new Date())}`, { size: 14, alignment: AlignmentType.LEFT })
                                      ],
                                      margins: { top: 100, bottom: 100, left: 100, right: 100 }
                                    })
                                  ]
                                })
                              ]
                            })
                          ],
                          margins: { top: 200, bottom: 200, left: 200, right: 200 },
                          shading: {
                            fill: "FFFFFF" // Fondo blanco para el recuadro
                          }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          },
          children: [
            // Acta: sin carta de presentación (fecha, versión, señores, destinatario). Resto de informes: sí.
            ...(estadoActual !== 'actaInspeccion'
              ? [
                  crearTextoNormal(`${(() => {
                    const c = String(formData.ciudad ?? '').trim();
                    const d = String(formData.departamento ?? '').trim();
                    return d ? `${valorTabla(c, 'Ciudad')}, ${d}` : valorTabla(formData.ciudad, 'Ciudad');
                  })()}, ${formatearFechaParaWord(new Date(), 'es-ES', {
                    month: 'long',
                    year: 'numeric'
                  })}`, { size: 24, spacingBefore: 600, spacingAfter: 200 }),

                  crearTextoNormal(`VERSIÓN DEL INFORME: ${
                    estadoActual === 'inicial' ? 'INFORME PRELIMINAR (INICIAL)' :
                    estadoActual === 'preeliminar' ? 'INFORME PRELIMINAR' :
                    estadoActual === 'actualizacion' ? 'ACTUALIZACIÓN' :
                    estadoActual === 'informeFinal' ? 'INFORME FINAL' : estadoActual.toUpperCase()}`,
                    { bold: true, size: 20, spacingAfter: 200 }),

                  crearTextoNormal('Señores', { spacingAfter: 100 }),
                  crearTextoNormal(valorTabla(formData.aseguradora, 'Aseguradora'), { heading: HeadingLevel.HEADING_2, spacingAfter: 100 }),
                  crearTextoNormal(`Atn: ${valorTabla(formData.destinatario, 'Destinatario')}`, { spacingAfter: 50 }),
                  crearTextoNormal(valorTabla(formData.cargo, 'Cargo'), { spacingAfter: 100 }),
                  crearTextoNormal(`${valorTabla(formData.ciudadDestino, 'Ciudad Destino')}, ${valorTabla(formData.paisDestino, 'País Destino')}`, { spacingAfter: 120 })
                ]
              : [
                  new Paragraph({
                    text: '',
                    spacing: { before: 200, after: 200 }
                  })
                ]),

            ...(estadoActual !== 'actaInspeccion'
              ? [
                  crearTextoNormal('INFORMACIÓN DETALLADA DEL SINIESTRO', {
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 200 }
                  }),
                  (() => {
                    const esVistaActaSolo = false;
              const tNorm = (v) => String(v ?? '').trim();
              const marg = { top: 100, bottom: 100, left: 100, right: 100 };
              const filaDosCols = (etiquetaIzq, textoDer) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [crearTextoNormal(etiquetaIzq, { bold: true, size: 24 })],
                      margins: marg
                    }),
                    new TableCell({
                      children: [crearTextoNormal(textoDer, { size: 24 })],
                      margins: marg
                    })
                  ]
                });

              const mostrarFila = (valor) => !esVistaActaSolo || tNorm(valor);

              const fechaOcurrenciaEfectiva = tNorm(formData.fechaOcurrencia)
                ? formData.fechaOcurrencia
                : formData.fechaSiniestro || '';
              const reclamoPorEfectivo = tNorm(formData.tipoSiniestro)
                ? formData.tipoSiniestro
                : tNorm(formData.tipoEvento)
                  ? formData.tipoEvento
                  : formData.tipoRiesgoActa || '';

              const ciudadDetalleTexto =
                tNorm(formData.ciudad) && tNorm(formData.departamento)
                  ? `${formData.ciudad} (${formData.departamento})`
                  : tNorm(formData.ciudad)
                    ? formData.ciudad
                    : valorTabla('', 'Ciudad');

              const fechaAsignacionEfectiva =
                tNorm(formData.fechaReporte) ||
                resolverFechaReporteDesdeAsignacion(formData) ||
                '';

              const identificacionAseguradoTexto = (() => {
                const tipo = tNorm(formData.metadata?.tipoDocumento);
                const num = tNorm(
                  formData.identificacionActa || formData.metadata?.numeroDocumento
                );
                if (tipo && num) return `${tipo} ${num}`;
                return num || tipo || '';
              })();

              const intermediarioTexto = tNorm(formData.metadata?.intermediario);
              const totalReservaTabla = calcularTotalReservaSugeridaItems(
                formData.reservaSugeridaItems
              );
              const textoReservaSugeridaTabla =
                totalReservaTabla > 0
                  ? formatearMontoReserva(totalReservaTabla)
                  : resumenTextoParaTablaWord(formData.reservaSugerida, 80);

              const filas = [
                filaDosCols('REPORTE', formData.numeroReporte || '1'),
                filaDosCols('POLIZA', formData.numeroPoliza || 'No especificada'),
                filaDosCols('RAMO', formData.ramo || 'HOGAR'),
                filaDosCols('REFERENCIA', formData.numeroSiniestro || 'SINIESTRO No especificado'),
                filaDosCols('FUNCIONARIO QUE ASIGNO', formData.funcionarioAsigna || 'No especificado')
              ];

              if (mostrarFila(intermediarioTexto)) {
                filas.push(
                  filaDosCols(
                    'INTERMEDIARIO',
                    valorTabla(intermediarioTexto, 'Intermediario')
                  )
                );
              }

              filas.push(
                filaDosCols('TOMADOR/ASEGURADO', valorTabla(formData.asegurado, 'Asegurado'))
              );

              if (mostrarFila(identificacionAseguradoTexto)) {
                filas.push(
                  filaDosCols(
                    'IDENTIFICACION DEL ASEGURADO',
                    valorTabla(identificacionAseguradoTexto, 'Identificación del asegurado')
                  )
                );
              }

              filas.push(
                filaDosCols(
                  'BENEFICIARIO',
                  valorTabla(formData.beneficiario || formData.asegurado, 'Beneficiario')
                ),
                filaDosCols('DIRECCION', valorTabla(formData.direccionRiesgo, 'Dirección'))
              );

              if (mostrarFila(formData.actividad)) {
                filas.push(filaDosCols('ACTIVIDAD', valorTabla(formData.actividad, 'Actividad')));
              }

              filas.push(filaDosCols('CIUDAD', ciudadDetalleTexto));

              if (mostrarFila(reclamoPorEfectivo)) {
                filas.push(filaDosCols('RECLAMO POR', valorTabla(reclamoPorEfectivo, 'Tipo de Siniestro')));
              }
              if (mostrarFila(formData.tipoEvento)) {
                filas.push(filaDosCols('EVENTO', valorTabla(formData.tipoEvento, 'Evento')));
              }
              if (mostrarFila(fechaAsignacionEfectiva)) {
                filas.push(
                  filaDosCols(
                    'FECHA DE ASIGNACION',
                    valorTabla(fechaAsignacionEfectiva, 'Fecha de asignación')
                  )
                );
              }
              if (mostrarFila(fechaOcurrenciaEfectiva)) {
                filas.push(
                  filaDosCols('FECHA DE OCURRENCIA', valorTabla(fechaOcurrenciaEfectiva, 'Fecha de Ocurrencia'))
                );
              }
              if (mostrarFila(formData.fechaInspeccion)) {
                filas.push(
                  filaDosCols('FECHA DE INSPECCION', valorTabla(formData.fechaInspeccion, 'Fecha de Inspección'))
                );
              }

              if (estadoActual !== 'informeFinal' && mostrarFila(textoReservaSugeridaTabla)) {
                filas.push(
                  filaDosCols(
                    'RESERVA SUGERIDA',
                    valorTabla(textoReservaSugeridaTabla, 'Reserva sugerida')
                  )
                );
              }

              // Solo los campos cortos de «Datos generales» (tablaRecobro, etc.), no las secciones largas del informe
              filas.push(
                filaDosCols(
                  'RECOBRO',
                  valorTabla(
                    resumenTextoParaTablaWord(formData.tablaRecobro, 120),
                    'Recobro'
                  )
                )
              );
              filas.push(
                filaDosCols(
                  'SALVAMENTO',
                  valorTabla(
                    resumenTextoParaTablaWord(formData.tablaSalvamento, 120),
                    'Salvamento'
                  )
                )
              );
              filas.push(
                filaDosCols(
                  'INFRASEGURO',
                  valorTabla(
                    resumenTextoParaTablaWord(formData.tablaInfraseguro, 120),
                    'Infraseguro'
                  )
                )
              );

              if (formData.camposPersonalizados && formData.camposPersonalizados.length > 0) {
                formData.camposPersonalizados
                  .filter((campo) => campo.nombre && campo.nombre.trim().length > 0)
                  .filter((campo) => mostrarFila(campo.valor))
                  .forEach((campo) => {
                    filas.push(
                      filaDosCols(campo.nombre.toUpperCase(), campo.valor || 'No especificado')
                    );
                  });
              }

              return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: filas
              });
                  })(),
                ]
              : []),

            // Acta: cuerpo continúa en la misma página tras el encabezado. Otros informes: salto de página.
            ...(estadoActual !== 'actaInspeccion'
              ? [
                  new Paragraph({
                    pageBreakBefore: true,
                    spacing: { after: 200 }
                  })
                ]
              : []),

            // ============ CUERPO: acta sola vs informe (sin duplicar el acta en preliminar/actualización/final) ============
            ...(estadoActual === 'actaInspeccion'
              ? bloqueActaInspeccionWord
              : generarSeccionesDinamicas()),

            // CÓDIGO ANTIGUO DESHABILITADO (se usa generación dinámica arriba)
            ...(estadoActual === '__DISABLED_OBSOLETO__inicial' ? [
              // 5. OBSERVACIONES PREELIMINARES
              crearTextoNormal("5. OBSERVACIONES PREELIMINARES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // SOLO generar texto si hay información real
              ...(formData.observacionesPreeliminar ? [
                crearTextoNormal(formData.observacionesPreeliminar, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones Preeliminares")
              ]),

              // 6. ANÁLISIS DE COBERTURA
              crearTextoNormal("6. ANÁLISIS DE COBERTURA", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // 6.1. COBERTURAS APLICABLES
              crearTextoNormal("6.1. COBERTURAS APLICABLES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.coberturasAplicables ? [
                crearTextoNormal(formData.coberturasAplicables, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Coberturas Aplicables")
              ]),

              // 6.2. EXCLUSIONES
              crearTextoNormal("6.2. EXCLUSIONES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.exclusiones ? [
                crearTextoNormal(formData.exclusiones, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Exclusiones")
              ]),

              // 6.3. GARANTÍAS
              crearTextoNormal("6.3. GARANTÍAS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.garantias ? [
                crearTextoNormal(formData.garantias, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Garantías")
              ]),

              // 7. OBSERVACIONES GENERALES
              crearTextoNormal("7. OBSERVACIONES GENERALES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // 7.1. SOLICITUD DE DOCUMENTOS
              crearTextoNormal("7.1. SOLICITUD DE DOCUMENTOS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.solicitudDocumentos ? [
                crearTextoNormal(formData.solicitudDocumentos, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Solicitud de Documentos")
              ]),

              // 7.2. DECLINACIÓN
              crearTextoNormal("7.2. DECLINACIÓN", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.declinacion ? [
                crearTextoNormal(formData.declinacion, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Declinación")
              ]),

              // 7.3. OBSERVACIONES GENERALES
              crearTextoNormal("7.3. OBSERVACIONES GENERALES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.observacionesGenerales ? [
                crearTextoNormal(formData.observacionesGenerales, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones Generales")
              ]),

              // 7.4. PRÓXIMOS PASOS
              crearTextoNormal("7.4. PRÓXIMOS PASOS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.proximosPasos ? [
                crearTextoNormal(formData.proximosPasos, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Próximos Pasos")
              ])

            ] : []),

            // SECCIONES ESPECÍFICAS DE LA VERSIÓN DE ACTUALIZACIÓN (DESACTIVADO - SE USA GENERACIÓN DINÁMICA)
            ...(estadoActual === '__DISABLED_OBSOLETO__actualizacion' ? [
              // 5. OBSERVACIONES PREELIMINARES (mantener del preeliminar)
              crearTextoNormal("5. OBSERVACIONES PREELIMINARES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              ...(formData.observacionesPreeliminar ? [
                crearTextoNormal(formData.observacionesPreeliminar, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones Preeliminares")
              ]),

              // 6. ANÁLISIS DE COBERTURA (mantener del preeliminar)
              crearTextoNormal("6. ANÁLISIS DE COBERTURA", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // 6.1. COBERTURAS APLICABLES
              crearTextoNormal("6.1. COBERTURAS APLICABLES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.coberturasAplicables ? [
                crearTextoNormal(formData.coberturasAplicables, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Coberturas Aplicables")
              ]),

              // 6.2. EXCLUSIONES
              crearTextoNormal("6.2. EXCLUSIONES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.exclusiones ? [
                crearTextoNormal(formData.exclusiones, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Exclusiones")
              ]),

              // 6.3. GARANTÍAS
              crearTextoNormal("6.3. GARANTÍAS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.garantias ? [
                crearTextoNormal(formData.garantias, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Garantías")
              ]),

              // 7. OBSERVACIONES GENERALES (mantener del preeliminar)
              crearTextoNormal("7. OBSERVACIONES GENERALES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // 7.1. SOLICITUD DE DOCUMENTOS
              crearTextoNormal("7.1. SOLICITUD DE DOCUMENTOS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.solicitudDocumentos ? [
                crearTextoNormal(formData.solicitudDocumentos, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Solicitud de Documentos")
              ]),

              // 7.2. DECLINACIÓN
              crearTextoNormal("7.2. DECLINACIÓN", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.declinacion ? [
                crearTextoNormal(formData.declinacion, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Declinación")
              ]),

              // 7.3. OBSERVACIONES GENERALES
              crearTextoNormal("7.3. OBSERVACIONES GENERALES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.observacionesGenerales ? [
                crearTextoNormal(formData.observacionesGenerales, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones Generales")
              ]),

              // 7.4. PRÓXIMOS PASOS
              crearTextoNormal("7.4. PRÓXIMOS PASOS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.proximosPasos ? [
                crearTextoNormal(formData.proximosPasos, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Próximos Pasos")
              ]),

              // 8. ACTUALIZACIÓN DEL CASO
              crearTextoNormal("8. ACTUALIZACIÓN DEL CASO", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // Fecha de actualización
              crearTextoNormal(`Fecha de Actualización: ${formData.fechaActualizacion || obtenerFechaActualISO()}`, { spacingAfter: 100 }),
              
              // Cambios desde la versión preeliminar
              crearTextoNormal("Cambios desde la Versión Preeliminar:", { bold: true, spacingAfter: 100 }),
              ...(formData.cambiosDesdePreeliminar ? [
                crearTextoNormal(formData.cambiosDesdePreeliminar, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Cambios desde la Versión Preeliminar")
              ]),

              // Nueva información recopilada
              crearTextoNormal("Nueva Información Recopilada:", { bold: true, spacingAfter: 100 }),
              ...(formData.nuevaInformacion ? [
                crearTextoNormal(formData.nuevaInformacion, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Nueva Información Recopilada")
              ]),


              // 8. OBSERVACIONES DE ACTUALIZACIÓN
              crearTextoNormal("8. OBSERVACIONES DE ACTUALIZACIÓN", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),

              // SOLO generar texto si hay información real
              ...(formData.observacionesActualizacion ? [
                crearTextoNormal(formData.observacionesActualizacion, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones de Actualización")
              ])
            ] : []),

            // SECCIONES ESPECÍFICAS DEL INFORME FINAL (DESACTIVADO - SE USA GENERACIÓN DINÁMICA)
            ...(estadoActual === '__DISABLED_OBSOLETO__informeFinal' ? [
              // 5. OBSERVACIONES PREELIMINARES (mantener del preeliminar)
              crearTextoNormal("5. OBSERVACIONES PREELIMINARES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              ...(formData.observacionesPreeliminar ? [
                crearTextoNormal(formData.observacionesPreeliminar, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones Preeliminares")
              ]),

              // 6. ANÁLISIS DE COBERTURA (mantener del preeliminar)
              crearTextoNormal("6. ANÁLISIS DE COBERTURA", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // 6.1. COBERTURAS APLICABLES
              crearTextoNormal("6.1. COBERTURAS APLICABLES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.coberturasAplicables ? [
                crearTextoNormal(formData.coberturasAplicables, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Coberturas Aplicables")
              ]),

              // 6.2. EXCLUSIONES
              crearTextoNormal("6.2. EXCLUSIONES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.exclusiones ? [
                crearTextoNormal(formData.exclusiones, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Exclusiones")
              ]),

              // 6.3. GARANTÍAS
              crearTextoNormal("6.3. GARANTÍAS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.garantias ? [
                crearTextoNormal(formData.garantias, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Garantías")
              ]),

              // 7. OBSERVACIONES GENERALES (mantener del preeliminar)
              crearTextoNormal("7. OBSERVACIONES GENERALES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // 7.1. SOLICITUD DE DOCUMENTOS
              crearTextoNormal("7.1. SOLICITUD DE DOCUMENTOS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.solicitudDocumentos ? [
                crearTextoNormal(formData.solicitudDocumentos, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Solicitud de Documentos")
              ]),

              // 7.2. DECLINACIÓN
              crearTextoNormal("7.2. DECLINACIÓN", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.declinacion ? [
                crearTextoNormal(formData.declinacion, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Declinación")
              ]),

              // 7.3. OBSERVACIONES GENERALES
              crearTextoNormal("7.3. OBSERVACIONES GENERALES", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.observacionesGenerales ? [
                crearTextoNormal(formData.observacionesGenerales, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones Generales")
              ]),

              // 7.4. PRÓXIMOS PASOS
              crearTextoNormal("7.4. PRÓXIMOS PASOS", { heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 150 } }),
              ...(formData.proximosPasos ? [
                crearTextoNormal(formData.proximosPasos, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Próximos Pasos")
              ]),

              // 8. ACTUALIZACIÓN DEL CASO (mantener de actualización)
              crearTextoNormal("8. ACTUALIZACIÓN DEL CASO", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // Fecha de actualización
              crearTextoNormal(`Fecha de Actualización: ${formData.fechaActualizacion || obtenerFechaActualISO()}`, { spacingAfter: 100 }),
              
              // Cambios desde la versión preeliminar
              crearTextoNormal("Cambios desde la Versión Preeliminar:", { bold: true, spacingAfter: 100 }),
              ...(formData.cambiosDesdePreeliminar ? [
                crearTextoNormal(formData.cambiosDesdePreeliminar, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Cambios desde la Versión Preeliminar")
              ]),

              // Nueva información recopilada
              crearTextoNormal("Nueva Información Recopilada:", { bold: true, spacingAfter: 100 }),
              ...(formData.nuevaInformacion ? [
                crearTextoNormal(formData.nuevaInformacion, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Nueva Información Recopilada")
              ]),

              // Observaciones de actualización
              crearTextoNormal("Observaciones de Actualización:", { bold: true, spacingAfter: 100 }),
              ...(formData.observacionesActualizacion ? [
                crearTextoNormal(formData.observacionesActualizacion, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones de Actualización")
              ]),

              // 9. INFORME FINAL
              crearTextoNormal("9. INFORME FINAL", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // Fecha del informe final
              crearTextoNormal(`Fecha del Informe Final: ${formData.fechaInformeFinal || obtenerFechaActualISO()}`, { spacingAfter: 100 }),

              // 10. CONCLUSIONES FINALES
              crearTextoNormal("10. CONCLUSIONES FINALES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // SOLO generar texto si hay información real
              ...(formData.conclusionesFinales ? [
                crearTextoNormal(formData.conclusionesFinales, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Conclusiones Finales")
              ]),

              // 11. RECOMENDACIONES FINALES
              crearTextoNormal("11. RECOMENDACIONES FINALES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // SOLO generar texto si hay información real
              ...(formData.recomendacionesFinales ? [
                crearTextoNormal(formData.recomendacionesFinales, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Recomendaciones Finales")
              ]),

              // 12. OBSERVACIONES DEL INFORME FINAL
              crearTextoNormal("12. OBSERVACIONES DEL INFORME FINAL", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
              
              // SOLO generar texto si hay información real
              ...(formData.observacionesInformeFinal ? [
                crearTextoNormal(formData.observacionesInformeFinal, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones del Informe Final")
              ]),


              // 10. OBSERVACIONES DEL INFORME FINAL
              crearTextoNormal("10. OBSERVACIONES DEL INFORME FINAL", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),

              // SOLO generar texto si hay información real
              ...(formData.observacionesInformeFinal ? [
                crearTextoNormal(formData.observacionesInformeFinal, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Observaciones del Informe Final")
              ]),

              // 11. LIQUIDACIÓN DE LA PÉRDIDA
              crearTextoNormal("11. LIQUIDACIÓN DE LA PÉRDIDA", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),

              // Infraseguro
              crearTextoNormal("Infraseguro:", { bold: true, spacingAfter: 100 }),
              ...(formData.liquidacionPerdida?.infraseguro ? [
                crearTextoNormal(formData.liquidacionPerdida.infraseguro, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Infraseguro")
              ]),

              // Demérito
              crearTextoNormal("Demérito:", { bold: true, spacingAfter: 100 }),
              ...(formData.liquidacionPerdida?.demerito ? [
                crearTextoNormal(formData.liquidacionPerdida.demerito, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Demérito")
              ]),

              // Avance Tecnológico
              crearTextoNormal("Avance Tecnológico:", { bold: true, spacingAfter: 100 }),
              ...(formData.liquidacionPerdida?.avanceTecnologico ? [
                crearTextoNormal(formData.liquidacionPerdida.avanceTecnologico, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Avance Tecnológico")
              ]),

              // 12. INDEMNIZACIÓN
              crearTextoNormal("12. INDEMNIZACIÓN", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),

              // Deducible
              crearTextoNormal("Deducible:", { bold: true, spacingAfter: 100 }),
              ...(formData.indemnizacion?.deducible ? [
                crearTextoNormal(formData.indemnizacion.deducible, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Deducible")
              ]),

              // Subrogación
              crearTextoNormal("Subrogación:", { bold: true, spacingAfter: 100 }),
              ...(formData.indemnizacion?.subrogacion ? [
                crearTextoNormal(formData.indemnizacion.subrogacion, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Subrogación")
              ]),

              // 13. SALVAMENTOS
              crearTextoNormal("13. SALVAMENTOS", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),

              // SOLO generar texto si hay información real
              ...(formData.salvamentos ? [
                crearTextoNormal(formData.salvamentos, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Salvamentos")
              ]),

              // 14. RECOMENDACIONES (PANORAMA DE RIESGOS)
              crearTextoNormal("14. RECOMENDACIONES", { heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),

              // Panorama de Riesgos
              crearTextoNormal("Panorama de Riesgos:", { bold: true, spacingAfter: 100 }),
              ...(formData.panoramaRiesgos ? [
                crearTextoNormal(formData.panoramaRiesgos, { spacingAfter: 200 })
              ] : [
                crearMensajeSinInformacion("Panorama de Riesgos")
              ])
            ] : []),

            // Pie: acta → firmas en bloque del acta (cliente + ajustador). Informes → cierre + ajustador + Iskharly.
            ...(estadoActual === 'actaInspeccion'
              ? [
                  new Paragraph({
                    text: '',
                    spacing: { before: 400, after: 200 }
                  })
                ]
              : [
                  new Paragraph({
                    text: '',
                    spacing: { before: 600, after: 200 }
                  }),
                  ...textoCierreAntesFirmasInforme(),
                  ...construirElementosFirmasActaWord(formData, { modo: 'informe' }),
                  new Paragraph({
                    text: '',
                    spacing: { before: 200, after: 600 }
                  })
                ]
            )
          ]
        }]
      });

      console.log('✅ PÁGINA 1 - Solo lo solicitado creada, generando archivo...');

      // Generar y descargar el documento
      Packer.toBlob(doc).then(blob => {
        console.log('✅ Blob generado:', { size: blob.size, type: blob.type });
        const nombreDocx = `PAGINA_1_${formData.numeroPoliza || 'Sin_Poliza'}_${obtenerFechaActualISO()}.docx`;
        setArchivoGeneradoBlob(blob);
        setArchivoGenerado({
          nombre: nombreDocx,
          ruta: '',
          tamaño: blob.size,
          tipoMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreDocx;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setCargando(false);
        console.log('✅ PÁGINA 1 - Solo lo solicitado descargada exitosamente');
      }).catch(error => {
        console.error('❌ Error al generar blob:', error);
        setError('Error al generar el archivo: ' + error.message);
        setCargando(false);
      });

    } catch (error) {
      console.error('❌ Error al generar documento:', error);
      setError('Error al generar el documento: ' + error.message);
      setCargando(false);
    }
  };

  // Función para guardar el formulario
  const handleGuardarFormulario = async () => {
    try {
      setCargando(true);
      setError(null);

      await forzarCapturaMapaAntesDePersistir();
      await new Promise((r) => setTimeout(r, 400));

      // Validar que TIPOS_FORMULARIOS.AJUSTE esté disponible
      if (!TIPOS_FORMULARIOS?.AJUSTE) {
        throw new Error('TIPOS_FORMULARIOS.AJUSTE no está definido');
      }

      // Log de depuración para imágenes
      console.log('🖼️ Estado actual de las imágenes (ajuste):');
      console.log('📸 imagenesInspeccion:', formData.imagenesInspeccion ? formData.imagenesInspeccion.length : 0, 'imágenes');
      if (formData.imagenesInspeccion && formData.imagenesInspeccion.length > 0) {
        formData.imagenesInspeccion.forEach((img, index) => {
          console.log(`  📸 Imagen ${index + 1}:`, img.archivo ? `File: ${img.archivo.name} (${img.archivo.size} bytes)` : 'Sin archivo');
        });
      }
      console.log('📸 anexos:', formData.anexos ? formData.anexos.length : 0, 'anexos');
      if (formData.anexos && formData.anexos.length > 0) {
        formData.anexos.forEach((anexo, index) => {
          console.log(`  📎 Anexo ${index + 1}:`, anexo.file ? `File: ${anexo.file.name} (${anexo.file.size} bytes)` : 'Sin archivo');
        });
      }

      // Procesar imágenes antes de guardar
      let datosParaGuardar = { ...formDataRef.current };
      // Siempre persistir la versión de pestaña activa (React); formData puede quedar desincronizado tras «Siguiente»
      datosParaGuardar.estadoActual = estadoActual;
      
      // Procesar imágenes de inspección
      if (datosParaGuardar.imagenesInspeccion && datosParaGuardar.imagenesInspeccion.length > 0) {
        console.log('📸 Procesando imágenes de inspección para guardar...');
        console.log('📸 Cantidad de imágenes:', datosParaGuardar.imagenesInspeccion.length);
        
        // ✅ IMPORTANTE: historialService.guardarFormulario ya procesa las imágenes automáticamente
        // Solo necesitamos asegurarnos de que las imágenes tengan la propiedad 'file' correcta
        datosParaGuardar.imagenesInspeccion = datosParaGuardar.imagenesInspeccion.map(imagen => {
          console.log('🔍 Procesando imagen:', {
            nombre: imagen.nombre,
            tieneFile: !!imagen.file,
            tienePreview: !!imagen.preview,
            tieneRuta: !!imagen.ruta
          });
          
          // Si ya tiene ruta (imagen guardada), mantenerla
          if (imagen.ruta && imagen.ruta.startsWith('/uploads/')) {
            return {
              ruta: imagen.ruta,
              nombre: imagen.nombre || 'imagen',
              descripcion: imagen.descripcion || '',
              tamaño: imagen.tamaño,
              tipoMime: imagen.tipoMime
            };
          }
          
          // Si tiene file (imagen nueva), mantenerlo para que historialService lo suba
          if (imagen.file instanceof File) {
            return {
              file: imagen.file,  // ✅ historialService lo subirá al servidor
              nombre: imagen.nombre || imagen.file.name,
              descripcion: imagen.descripcion || '',
              tamaño: imagen.tamaño || imagen.file.size,
              tipoMime: imagen.tipoMime || imagen.file.type
            };
          }
          
          // Si solo tiene preview (sin file ni ruta), advertir
          console.warn('⚠️ Imagen sin file ni ruta:', imagen.nombre);
          return imagen;
        });
        
        console.log('✅ Imágenes de inspección procesadas para guardar');
      }

      // Generar título del formulario basado en el estado actual
      const tituloFormulario = `Informe de Ajuste - ${estadoActual === 'actaInspeccion' ? 'Acta de Inspección' :
                               estadoActual === 'inicial' ? 'Versión Inicial (Informe preliminar)' :
                               estadoActual === 'preeliminar' ? 'Versión Preeliminar' :
                               estadoActual === 'actualizacion' ? 'Versión de Actualización' :
                               estadoActual === 'informeFinal' ? 'Informe Final' : estadoActual}`;

      const normalizarClaveAjuste = (valor) => String(valor || '').trim().toUpperCase().replace(/\s+/g, '');
      const esClaveReporte = (valor) => normalizarClaveAjuste(valor).startsWith('RPT-');
      const esClaveValida = (valor) => {
        const v = normalizarClaveAjuste(valor);
        return !!v && v !== 'N/A';
      };
      const resolverNumeroAjusteCanonico = (...candidatos) => {
        const validos = candidatos.filter(esClaveValida);
        const noReporte = validos.find((v) => !esClaveReporte(v));
        return String(noReporte || validos[0] || '').trim();
      };

      const numeroAjustePersistente = resolverNumeroAjusteCanonico(
        location?.state?.nmroAjste,
        location?.state?.numeroAjuste,
        datosParaGuardar?.metadata?.numeroAjuste,
        formData?.metadata?.numeroAjuste,
        datosParaGuardar?.numeroCaso,
        formData?.numeroCaso,
        location?.state?.numeroCaso
      );
      if (numeroAjustePersistente) {
        datosParaGuardar.numeroCaso = numeroAjustePersistente;
        datosParaGuardar.metadata = {
          ...(datosParaGuardar.metadata || {}),
          numeroAjuste: numeroAjustePersistente
        };
      }

      const sanitizarSegmentoCarpeta = (v) =>
        String(v || '')
          .trim()
          .replace(/[/\\?*:|"<>]/g, '-')
          .replace(/\s+/g, '_');

      const resolverCarpetaCasoParaGuardado = () => {
        const existente = sanitizarSegmentoCarpeta(datosParaGuardar.carpetaCaso || formData.carpetaCaso);
        if (existente && existente.toUpperCase() !== 'N/A') return existente;

        const codigo = sanitizarSegmentoCarpeta(
          datosParaGuardar.codigoReporte ||
            formData.codigoReporte ||
            datosParaGuardar.numeroReporte ||
            formData.numeroReporte ||
            location?.state?.codigoReporte
        );
        if (codigo) return `Caso_${codigo}_${obtenerFechaActualISO()}`;

        const aj = sanitizarSegmentoCarpeta(
          numeroAjustePersistente || datosParaGuardar.numeroCaso || formData.numeroCaso
        );
        if (aj) return `Caso_${aj}_${obtenerFechaActualISO()}`;

        return `general_${obtenerFechaActualISO()}`;
      };

      const carpetaCasoResuelta = resolverCarpetaCasoParaGuardado();
      datosParaGuardar.carpetaCaso = carpetaCasoResuelta;

      const datosFormulario = {
        tipo: TIPOS_FORMULARIOS.AJUSTE,
        titulo: tituloFormulario,
        datos: datosParaGuardar,
        archivo: archivoGenerado,
        fechaCreacion: obtenerFechaHoraActualISO(),
        fechaModificacion: obtenerFechaHoraActualISO(), // Agregar fecha de modificación
        estadoActual: estadoActual,
        versiones: versiones,
        // Campos adicionales para el historial
        numeroCaso: datosParaGuardar.numeroCaso || numeroAjustePersistente || 'N/A',
        carpetaCaso: carpetaCasoResuelta,
        inspector: datosParaGuardar.inspector || 'N/A',
        aseguradora: datosParaGuardar.aseguradora || 'N/A',
        asegurado: datosParaGuardar.asegurado || 'N/A'
      };

      // Validar que los campos requeridos estén presentes
      if (!datosFormulario.tipo) {
        throw new Error('Campo "tipo" es requerido');
      }
      if (!datosFormulario.titulo) {
        throw new Error('Campo "titulo" es requerido');
      }
      if (!datosFormulario.datos) {
        throw new Error('Campo "datos" es requerido');
      }

      console.log('💾 Datos del formulario a guardar:', datosFormulario);
      console.log('✅ Validación de campos requeridos exitosa');
      
      // Log especial para verificar firmas
      console.log('🔍 Verificando firmas en formData:');
      console.log('🔍 firmaFuncionario presente:', !!datosParaGuardar.firmaFuncionario);
      console.log('🔍 firmaIskharly presente:', !!datosParaGuardar.firmaIskharly);
      console.log('🔍 funcionarioFirma:', datosParaGuardar.funcionarioFirma);
      console.log('🔍 cargoFuncionario:', datosParaGuardar.cargoFuncionario);

      // DIAGNÓSTICO DEL PROBLEMA: Verificar el ID antes de decidir si actualizar o crear
      console.log('🔍 === DIAGNÓSTICO DEL PROBLEMA ===');
      console.log('🔍 ID actual:', id);
      console.log('🔍 Tipo de ID:', typeof id);
      console.log('🔍 ID es truthy?', !!id);
      console.log('🔍 ID !== "nuevo"?', id !== 'nuevo');
      console.log('🔍 Condición completa (id && id !== "nuevo"):', id && id !== 'nuevo');
      console.log('🔍 URL actual:', window.location.href);
      console.log('🔍 Parámetros de la URL:', window.location.pathname);
      console.log('🔍 === FIN DIAGNÓSTICO ===');

      const numeroAjusteContinuidad = resolverNumeroAjusteCanonico(
        location?.state?.nmroAjste,
        location?.state?.numeroAjuste,
        datosParaGuardar?.metadata?.numeroAjuste,
        formData?.metadata?.numeroAjuste,
        datosParaGuardar?.numeroCaso,
        formData?.numeroCaso,
        location?.state?.numeroCaso
      );

      // Usar formularioId en lugar de id para mayor confiabilidad.
      // Si no viene ID en la URL, buscar continuidad por número de ajuste para evitar crear duplicados.
      let idParaActualizar = formularioId || id;
      if ((!idParaActualizar || idParaActualizar === 'nuevo') && numeroAjusteContinuidad) {
        try {
          // 1) Priorizar secuencia por número de ajuste (fuente de verdad de continuidad)
          const secuencia = await historialService.obtenerSecuenciaPorNumeroAjuste(numeroAjusteContinuidad);
          const idDesdeSecuencia = secuencia?.formularioId || secuencia?.secuencia?.formularioId;
          if (idDesdeSecuencia) {
            idParaActualizar = String(idDesdeSecuencia);
          }

          // 2) Fallback: buscar en historial el último ajuste del mismo caso
          if (!idParaActualizar || idParaActualizar === 'nuevo') {
          const ajustes = await historialService.obtenerHistorial({
            tipo: TIPOS_FORMULARIOS.AJUSTE,
            limite: 1000
          });
          const clave = numeroAjusteContinuidad.toUpperCase().replace(/\s+/g, '');
          const candidatos = (Array.isArray(ajustes) ? ajustes : [])
            .filter((f) => {
              const posibles = [
                f?.numeroCaso,
                f?.datos?.numeroCaso,
                f?.datos?.numeroAjuste,
                f?.datos?.nmroAjste
              ].map(v => String(v || '').toUpperCase().replace(/\s+/g, '')).filter(Boolean);
              return posibles.includes(clave);
            })
            .sort((a, b) => {
              const fa = new Date(a?.fechaModificacion || a?.updatedAt || a?.fechaCreacion || 0).getTime();
              const fb = new Date(b?.fechaModificacion || b?.updatedAt || b?.fechaCreacion || 0).getTime();
              return fb - fa;
            });

          const idExistente = candidatos[0]?._id || candidatos[0]?.id;
          if (idExistente) {
            idParaActualizar = String(idExistente);
          }
          }
        } catch (errorContinuidad) {
          console.warn('⚠️ No se pudo resolver continuidad previa por número de ajuste:', errorContinuidad?.message || errorContinuidad);
        }
      }
      console.log('🔍 ID para actualizar:', idParaActualizar);
      console.log('🔍 Tipo de ID para actualizar:', typeof idParaActualizar);

      /** Trazabilidad Complex (historialDocs) + secuencia por número de ajuste */
      const mapearEstadoATipoDocTrazabilidad = (estado) => {
        if (estado === 'actaInspeccion') return 'inspeccion';
        if (estado === 'actualizacion') return 'ultimoDocumento';
        if (estado === 'informeFinal') return 'informeFinal';
        return 'informePreliminar';
      };

      const mapearEstadoATipoVersion = (estado) => {
        if (estado === 'actaInspeccion') return 'inspeccion';
        if (estado === 'actualizacion') return 'actualizacion';
        if (estado === 'informeFinal') return 'final';
        return 'preliminar';
      };

      const extraerFormularioId = (valor) => {
        if (!valor) return '';
        if (typeof valor === 'string') return valor;
        if (typeof valor === 'object') return valor.id || valor._id || '';
        return '';
      };

      const sincronizarSecuenciaPorNumeroAjuste = async (formularioIdFinal) => {
        const numeroAjuste = resolverNumeroAjusteCanonico(
          location?.state?.nmroAjste,
          location?.state?.numeroAjuste,
          datosParaGuardar?.metadata?.numeroAjuste,
          formData?.metadata?.numeroAjuste,
          datosParaGuardar?.numeroCaso,
          formData?.numeroCaso,
          location?.state?.numeroCaso
        );

        if (!numeroAjuste || numeroAjuste === 'N/A') {
          console.log('ℹ️ Sin número de ajuste válido, se omite sincronización de secuencia.');
          return;
        }

        const tipoVersion = mapearEstadoATipoVersion(estadoActual);
        const archivo = datosFormulario.archivo || {};

        await historialService.actualizarSecuenciaPorNumeroAjuste(numeroAjuste, {
          tipoVersion,
          paso: {
            formularioId: formularioIdFinal || '',
            documentoNombre: archivo?.nombre || '',
            documentoRuta: archivo?.ruta || '',
            pdfNombre: archivo?.nombre && archivo.nombre.toLowerCase().endsWith('.pdf') ? archivo.nombre : '',
            pdfRuta: archivo?.tipoMime === 'application/pdf' ? (archivo?.ruta || '') : '',
            fecha: obtenerFechaHoraActualISO(),
            usuario: localStorage.getItem('nombre') || localStorage.getItem('login') || 'usuario'
          }
        });
      };

      const sincronizarDocumentoEnTrazabilidadComplex = async (formularioIdFinal, archivoSubidoEnGuardado = null) => {
        let complexId = String(
          location?.state?.complexId ||
          location?.state?._id ||
          formData?.metadata?.complexId ||
          datosParaGuardar?.metadata?.complexId ||
          ''
        ).trim();

        // Fallback: resolver complexId vía autofill por numeroSiniestro o numeroAjuste
        // para casos que abrieron el formulario por URL directa sin location.state.
        if (!complexId) {
          const claveBusqueda = String(
            location?.state?.numeroSiniestro ||
            location?.state?.nmroSinstro ||
            formData?.numeroSiniestro ||
            datosParaGuardar?.numeroSiniestro ||
            location?.state?.numeroCaso ||
            location?.state?.nmroAjste ||
            datosParaGuardar?.numeroCaso ||
            formData?.numeroCaso ||
            ''
          ).trim();
          if (claveBusqueda) {
            try {
              const respAutofill = await getAutofillAjusteDesdeComplex(claveBusqueda);
              const idCasoResuelto = String(respAutofill?.meta?.idCaso || '').trim();
              if (idCasoResuelto) {
                complexId = idCasoResuelto;
                setFormData((prev) => ({
                  ...prev,
                  metadata: {
                    ...(prev.metadata || {}),
                    complexId: idCasoResuelto
                  }
                }));
                console.log('🔗 complexId resuelto por autofill:', idCasoResuelto);
              }
            } catch (errAutofill) {
              console.warn('⚠️ No se pudo resolver complexId por autofill:', errAutofill?.message || errAutofill);
            }
          }
        }

        if (!complexId) {
          console.log('ℹ️ Sin complexId, se omite sincronización de historialDocs en Complex.');
          return;
        }

        const tipoDoc = mapearEstadoATipoDocTrazabilidad(estadoActual);

        const archivo = datosFormulario.archivo || {};
        const ahora = new Date();
        const fechaISO = ahora.toISOString();
        const fechaLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

        // Intentar resolver archivo real guardado en historial para evitar enlaces rotos.
        let formularioHistorial = null;
        try {
          formularioHistorial = formularioIdFinal ? await historialService.obtenerFormulario(formularioIdFinal) : null;
        } catch (errorFormulario) {
          console.warn('⚠️ No se pudo obtener formulario para resolver URL de descarga:', errorFormulario?.message || errorFormulario);
        }

        const idDescargable = formularioHistorial?._id || formularioIdFinal || '';
        const descargaFallback = idDescargable ? `/api/historial-formularios/${idDescargable}/descargar` : '';
        const archivoResuelto = archivoSubidoEnGuardado || formularioHistorial?.archivo || null;
        const rutaArchivoReal = archivoResuelto?.ruta || '';
        const nombreArchivoReal = archivoResuelto?.nombre || '';

        // Evitar documentos fantasma sin archivo real.
        if (!rutaArchivoReal || !nombreArchivoReal) {
          console.log('ℹ️ Se omite trazabilidad de documento: no hay archivo Word subido en este guardado.');
          return;
        }

        const docNuevo = {
          tipo: tipoDoc,
          categoria: tipoDoc,
          nombre: nombreArchivoReal,
          url: rutaArchivoReal || descargaFallback,
          ruta: rutaArchivoReal || descargaFallback,
          tamano: archivo?.tamaño || archivo?.tamano || 0,
          tipoMime: archivo?.tipoMime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fecha: fechaLocal,
          fechaSubida: fechaISO,
          comentario: `Ajuste ${estadoActual} guardado`,
          usuario: localStorage.getItem('login') || localStorage.getItem('nombre') || 'usuario',
          formularioId: idDescargable
        };

        const caso = await getCasoComplex(complexId);
        const historialActual = Array.isArray(caso?.historialDocs) ? caso.historialDocs : [];

        // Cada versión (preliminar / último documento / informe final) debe tener
        // UNA sola entrada por formulario en trazabilidad. Reemplazamos la entrada
        // previa que coincida en (tipo + formularioId) para que la descarga apunte
        // siempre al .docx más reciente generado para esa versión.
        const claveFormulario = String(idDescargable || '');
        const historialFiltrado = historialActual.filter((doc) => {
          if (!doc) return false;
          const docTipo = String(doc.tipo || doc.categoria || '');
          const docFormularioId = String(doc.formularioId || '');
          const mismaVersion = docTipo === tipoDoc;
          const mismoFormulario = docFormularioId && claveFormulario && docFormularioId === claveFormulario;
          // Conservamos documentos antiguos sin formularioId (carga manual histórica).
          if (!docFormularioId) return true;
          return !(mismaVersion && mismoFormulario);
        });

        // Mapear tipoDoc → campo de fecha en el caso de Complex/Siniestro.
        // Solo se actualiza la fecha de la versión actualmente guardada para
        // no afectar fechas históricas que el usuario ya pudo haber puesto.
        const tipoDocAFecha = {
          inspeccion: 'fchaInspccion',
          informePreliminar: 'fchaInfoPrelm',
          ultimoDocumento: 'fchaRepoActi',
          informeFinal: 'fchaInfoFnal'
        };
        const campoFecha = tipoDocAFecha[tipoDoc];
        const payloadUpdate = { historialDocs: [docNuevo, ...historialFiltrado] };
        if (campoFecha) {
          payloadUpdate[campoFecha] = fechaLocal;
        }

        await updateCasoComplex(complexId, payloadUpdate);
      };

      const crearDocxResumenParaServidor = async () => {
        const estadoLabel =
          estadoActual === 'actaInspeccion'
            ? 'Acta de inspección'
            : estadoActual === 'inicial' || estadoActual === 'preeliminar'
            ? 'Preliminar'
            : estadoActual === 'actualizacion'
              ? 'Actualización'
              : estadoActual === 'informeFinal'
                ? 'Informe final'
                : String(estadoActual || '');
        const casoTxt =
          datosParaGuardar?.numeroCaso ||
          datosParaGuardar?.metadata?.numeroAjuste ||
          formData?.numeroCaso ||
          '—';
        const doc = new Document({
          sections: [
            {
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: tituloFormulario || 'Informe de ajuste',
                      bold: true,
                      font: 'Arial',
                      size: 28
                    })
                  ],
                  spacing: { after: 200 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Caso / ajuste: ${casoTxt}`,
                      font: 'Arial',
                      size: 24
                    })
                  ]
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Versión: ${estadoLabel}`,
                      font: 'Arial',
                      size: 24
                    })
                  ]
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Resumen generado al guardar: ${obtenerFechaHoraActualISO()}`,
                      font: 'Arial',
                      size: 24
                    })
                  ]
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text:
                        'Para el informe completo con todo el detalle del formulario, use el botón «Generar documento» y guarde de nuevo.',
                      font: 'Arial',
                      size: 24,
                      italics: true
                    })
                  ],
                  spacing: { before: 400 }
                })
              ]
            }
          ]
        });
        return Packer.toBlob(doc);
      };

      const subirArchivoWordSiExiste = async (formularioIdFinal) => {
        if (!formularioIdFinal) return null;

        // Nombre estable por (formulario + versión): así cada nuevo Guardar de
        // la misma versión sobrescribe la copia previa en disco y solo queda
        // la más reciente. Las otras versiones tienen su propio archivo.
        const slugVersion =
          estadoActual === 'actaInspeccion'
            ? 'acta-inspeccion'
            : estadoActual === 'actualizacion'
            ? 'actualizacion'
            : estadoActual === 'informeFinal'
              ? 'informe-final'
              : 'preliminar';
        const nombreArchivo = `ajuste_${slugVersion}_${formularioIdFinal}.docx`;
        let blobParaSubir = archivoGeneradoBlob;

        if (!blobParaSubir) {
          console.log(
            '📄 Sin Word generado: se crea un .docx resumen para esta versión y se sube al servidor.'
          );
          blobParaSubir = await crearDocxResumenParaServidor();
        }

        const fileWord = new File([blobParaSubir], nombreArchivo, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const respUpload = await historialService.subirArchivoFormulario(formularioIdFinal, fileWord);
        if (respUpload?.archivo) {
          setArchivoGenerado(respUpload.archivo);
          if (archivoGeneradoBlob) {
            setArchivoGeneradoBlob(null);
          }
          return respUpload.archivo;
        }
        return null;
      };

      if (idParaActualizar && idParaActualizar !== 'nuevo') {
        // Actualizar formulario existente
        console.log('🔄 Actualizando formulario existente con ID:', idParaActualizar);
        console.log('🔍 ID antes de actualizar:', idParaActualizar);
        console.log('🔍 Tipo de ID antes de actualizar:', typeof idParaActualizar);
        
        // Agregar fecha de modificación al actualizar
        const datosFormularioActualizado = {
          ...datosFormulario,
          fechaModificacion: obtenerFechaHoraActualISO()
        };

        // Nunca enviar `archivo` en el PUT: el metadato real lo actualiza solo POST /archivo
        // tras generar el Word; evita rutas inventadas o incoherentes con el fichero en disco.
        delete datosFormularioActualizado.archivo;
        
        console.log('📅 Fecha de modificación agregada:', datosFormularioActualizado.fechaModificacion);
        console.log('📡 Llamando a historialService.actualizarFormulario...');
        await historialService.actualizarFormulario(idParaActualizar, datosFormularioActualizado);
        let archivoSubidoActualizacion = null;
        try {
          archivoSubidoActualizacion = await subirArchivoWordSiExiste(String(idParaActualizar));
        } catch (errorArchivo) {
          console.warn('⚠️ No se pudo subir archivo Word al historial (no bloqueante):', errorArchivo?.message || errorArchivo);
        }
        try {
          await sincronizarSecuenciaPorNumeroAjuste(String(idParaActualizar));
        } catch (errorSecuencia) {
          // No bloquear guardado principal por falla de secuencia (compatibilidad con flujo antiguo)
          console.warn('⚠️ No se pudo actualizar trazabilidadSecuencia (no bloqueante):', errorSecuencia?.message || errorSecuencia);
        }
        try {
          await sincronizarDocumentoEnTrazabilidadComplex(String(idParaActualizar), archivoSubidoActualizacion);
        } catch (errorTrazabilidad) {
          console.warn('⚠️ No se pudo sincronizar documento en historialDocs de Complex (no bloqueante):', errorTrazabilidad?.message || errorTrazabilidad);
        }
        console.log('✅ Formulario actualizado exitosamente');
        console.log('🔍 ID después de actualizar:', idParaActualizar);
        mostrarModalConfirmacion(
          'Formulario Actualizado',
          'El formulario se ha actualizado correctamente en el historial.',
          'success'
        );
        
        // No navegar, quedarse en la misma página
        console.log('📍 Manteniendo en la misma página con ID:', idParaActualizar);
        console.log('📍 URL actual después de actualizar:', window.location.href);
        
        // Verificar que el ID se mantenga
        setTimeout(() => {
          console.log('🔍 Verificación post-actualización:');
          console.log('🔍 ID en useParams:', id);
          // Debug logs comentados para reducir ruido en consola
        }, 1000);
      } else {
        // Crear nuevo formulario
        console.log('🆕 Creando nuevo formulario');

        // Guard rail: si por cualquier motivo no llegó ID en ruta, intentar continuidad justo antes de crear.
        if (numeroAjusteContinuidad) {
          try {
            const secuenciaPreCreate = await historialService.obtenerSecuenciaPorNumeroAjuste(numeroAjusteContinuidad);
            const idExistente = secuenciaPreCreate?.formularioId || secuenciaPreCreate?.secuencia?.formularioId;
            if (idExistente) {
              const datosFormularioActualizado = {
                ...datosFormulario,
                fechaModificacion: obtenerFechaHoraActualISO()
              };
              delete datosFormularioActualizado.archivo;
              await historialService.actualizarFormulario(idExistente, datosFormularioActualizado);
              let archivoSubidoContinuidad = null;
              try {
                archivoSubidoContinuidad = await subirArchivoWordSiExiste(String(idExistente));
              } catch (errorArchivo) {
                console.warn('⚠️ No se pudo subir archivo Word al historial (no bloqueante):', errorArchivo?.message || errorArchivo);
              }
              try { await sincronizarSecuenciaPorNumeroAjuste(String(idExistente)); } catch (_) {}
              try { await sincronizarDocumentoEnTrazabilidadComplex(String(idExistente), archivoSubidoContinuidad); } catch (_) {}
              mostrarModalConfirmacion(
                'Formulario Actualizado',
                'Se detectó continuidad del ajuste y se actualizó el formulario existente.',
                'success'
              );
              return;
            }
          } catch (errorPreCreate) {
            console.warn('⚠️ No se pudo validar continuidad antes de crear:', errorPreCreate?.message || errorPreCreate);
          }
        }
        
        // Agregar fechas de creación y modificación para formularios nuevos
        const datosFormularioNuevo = {
          ...datosFormulario,
          fechaCreacion: obtenerFechaHoraActualISO(),
          fechaModificacion: obtenerFechaHoraActualISO()
        };
        
        // Debug logs comentados
        const nuevoFormularioGuardado = await guardarFormulario(datosFormularioNuevo);
        const nuevoId = extraerFormularioId(nuevoFormularioGuardado);
        let archivoSubidoNuevo = null;
        try {
          archivoSubidoNuevo = await subirArchivoWordSiExiste(nuevoId);
        } catch (errorArchivo) {
          console.warn('⚠️ No se pudo subir archivo Word al historial (no bloqueante):', errorArchivo?.message || errorArchivo);
        }
        try {
          await sincronizarSecuenciaPorNumeroAjuste(nuevoId);
        } catch (errorSecuencia) {
          // No bloquear guardado principal por falla de secuencia (compatibilidad con flujo antiguo)
          console.warn('⚠️ No se pudo actualizar trazabilidadSecuencia (no bloqueante):', errorSecuencia?.message || errorSecuencia);
        }
        try {
          await sincronizarDocumentoEnTrazabilidadComplex(nuevoId, archivoSubidoNuevo);
        } catch (errorTrazabilidad) {
          console.warn('⚠️ No se pudo sincronizar documento en historialDocs de Complex (no bloqueante):', errorTrazabilidad?.message || errorTrazabilidad);
        }
        console.log('✅ Nuevo formulario creado con ID:', nuevoId);
        
        // Validar que nuevoId sea un string válido
        if (nuevoId && typeof nuevoId === 'string' && nuevoId.trim() !== '') {
          console.log('✅ ID válido, navegando a:', `/ajuste/editar/${nuevoId}`);
          mostrarModalConfirmacion(
            'Formulario Guardado',
            'El formulario se ha guardado correctamente en el historial.',
            'success',
            'Aceptar',
            false,
            () => navigate(`/ajuste/editar/${nuevoId}`)
          );
        } else if (nuevoId && typeof nuevoId === 'object' && nuevoId.id) {
          // Si es un objeto con propiedad id
          console.log('✅ ID encontrado en objeto, navegando a:', `/ajuste/editar/${nuevoId.id}`);
          mostrarModalConfirmacion(
            'Formulario Guardado',
            'El formulario se ha guardado correctamente en el historial.',
            'success',
            'Aceptar',
            false,
            () => navigate(`/ajuste/editar/${nuevoId.id}`)
          );
        } else {
          console.error('❌ ID inválido recibido:', nuevoId);
          mostrarModalConfirmacion(
            'Advertencia',
            'El formulario se ha guardado pero el ID recibido no es válido. Serás redirigido a la lista de formularios.',
            'warning',
            'Aceptar',
            false,
            () => navigate('/ajuste')
          );
        }
      }

      // Si es una versión de actualización o informe final, guardar también en versiones
      if (estadoActual === 'actualizacion' || estadoActual === 'informeFinal') {
        console.log(`💾 Guardando versión ${estadoActual} en el historial de versiones`);
        setVersiones(prev => ({
          ...prev,
          [estadoActual]: {
            ...datosFormulario,
            fechaVersion: obtenerFechaHoraActualISO(),
            versionId: `${estadoActual}_${Date.now()}`
          }
        }));
        
        // Guardar en localStorage para persistencia
        localStorage.setItem(`versiones_${id || 'nuevo'}`, JSON.stringify({
          ...versiones,
          [estadoActual]: {
            ...datosFormulario,
            fechaVersion: obtenerFechaHoraActualISO(),
            versionId: `${estadoActual}_${Date.now()}`
          }
        }));
        
        console.log(`✅ Versión ${estadoActual} guardada independientemente`);
      }

      setCargando(false);
    } catch (error) {
      console.error('❌ Error guardando formulario:', error);
      setError('Error al guardar el formulario: ' + error.message);
      setCargando(false);
    }
  };

  // Función para cambiar versión
  const cambiarVersion = (nuevaVersion) => {
    // Cambiar el estado directamente - esto mostrará/ocultará las secciones correspondientes
    // Todos los datos se mantienen, solo cambia qué secciones se muestran
    console.log(`🔄 Cambiando de versión: ${estadoActual} → ${nuevaVersion}`);
    
    // Actualizar el estado inmediatamente para que React re-renderice las secciones
    setEstadoActual(nuevaVersion);
    
    // Actualizar también en formData para mantener consistencia (esto se guardará automáticamente)
    setFormData(prev => ({
      ...prev,
      estadoActual: nuevaVersion
    }));
    
    // Cerrar el menú después de actualizar el estado
    cerrarMenuVersiones();
    
    console.log(`✅ Versión cambiada a: ${nuevaVersion}, secciones deberían estar visibles ahora`);
  };

  // Función para generar el siguiente formulario en la secuencia
  // FLUJO: Inicial → Actualización → Informe Final → Nuevo Inicial
  const generarSiguienteFormulario = async () => {
    try {
      setCargando(true);
      setError(null);

      let siguienteEstado = '';
      let mensaje = '';

      // Determinar el siguiente estado en la secuencia
      switch (estadoActual) {
        case 'actaInspeccion':
          siguienteEstado = 'inicial';
          mensaje = 'Pasando a INFORME PRELIMINAR...';
          break;
        case 'inicial':
          siguienteEstado = 'actualizacion';
          mensaje = 'Generando formulario de ACTUALIZACIÓN...';
          break;
        case 'actualizacion':
          siguienteEstado = 'informeFinal';
          mensaje = 'Generando INFORME FINAL...';
          break;
        case 'informeFinal':
          siguienteEstado = 'actaInspeccion';
          mensaje = 'Creando nuevo caso (Acta de inspección)...';
          break;
        default:
          siguienteEstado = 'preeliminar';
          mensaje = 'Generando formulario PRELIMINAR...';
      }

      console.log(`🔄 ${mensaje}`);

      // Guardar el formulario actual antes de cambiar
      if (Object.keys(formData).some(key => formData[key])) {
        await handleGuardarFormulario();
      }

      // Cambiar al siguiente estado
      setEstadoActual(siguienteEstado);

      // Limpiar campos específicos según el nuevo estado
      if (siguienteEstado === 'actualizacion') {
        // Para actualización, mantener TODO (incluyendo campos preeliminares) y agregar campos de actualización
        setFormData(prev => ({
          ...prev,
          estadoActual: siguienteEstado,
          fechaActualizacion: obtenerFechaActualISO(),
          cambiosDesdePreeliminar: '',
          nuevaInformacion: '',
          observacionesActualizacion: ''
        }));
      } else if (siguienteEstado === 'informeFinal') {
        // Para informe final, mantener TODO (incluyendo campos preeliminares y actualización) y agregar campos finales
        setFormData(prev => ({
          ...prev,
          estadoActual: siguienteEstado,
          fechaInformeFinal: obtenerFechaActualISO(),
          conclusionesFinales: '',
          recomendacionesFinales: '',
          observacionesInformeFinal: '',
          // Agregar campos de la parte final
          liquidacionPerdida: {
            infraseguro: '',
            demerito: '',
            avanceTecnologico: ''
          },
          indemnizacion: {
            deducible: '',
            subrogacion: ''
          },
          salvamentos: '',
          recobro: '',
          tablaRecobro: '',
          tablaSalvamento: '',
          tablaInfraseguro: '',
          panoramaRiesgos: ''
        }));
      } else if (siguienteEstado === 'actaInspeccion') {
        setFormData({
          estadoActual: 'actaInspeccion',
          destinatario: '',
          cargo: '',
          empresa: '',
          direccion: '',
          ciudad: '',
          departamento: '',
          telefono: '',
          email: '',
          fechaSiniestro: '',
          fechaOcurrencia: '',
          fechaReporte: '',
          horaSiniestro: '',
          numeroPoliza: '',
          aseguradora: '',
          asegurado: '',
          tipoSiniestro: '',
          descripcionSiniestro: '',
          valorAsegurado: '',
          valorSiniestro: '',
          direccionRiesgo: '',
          coordenadasRiesgo: '',
          descripcionRiesgo: '',
          fechaInspeccion: '',
          horaInspeccion: '',
          inspector: '',
          conclusiones: '',
          recomendaciones: '',
          anexos: [],
          funcionarioFirma: '',
          cargoFuncionario: '',
          telefonoFuncionario: '',
          emailFuncionario: '',
          firmaIskharly: '',
          firmaFuncionario: '',
          observacionesPreeliminar: '',
          analisisCobertura: '',
          observacionesGenerales: '',
          fechaActualizacion: '',
          cambiosDesdePreeliminar: '',
          nuevaInformacion: '',
          observacionesActualizacion: '',
          fechaInformeFinal: '',
          conclusionesFinales: '',
          recomendacionesFinales: '',
          observacionesInformeFinal: '',
          liquidacionPerdida: {
            infraseguro: '',
            demerito: '',
            avanceTecnologico: ''
          },
          indemnizacion: {
            deducible: '',
            subrogacion: ''
          },
          salvamentos: '',
          recobro: '',
          tablaRecobro: '',
          tablaSalvamento: '',
          tablaInfraseguro: '',
          panoramaRiesgos: '',
          imagenMapa: null,
          tipoRiesgoActa: '',
          identificacionActa: '',
          actaObservaciones: '',
          actaClienteNombre: '',
          actaClienteCargo: '',
          actaClienteEmail: '',
          actaClienteFirma: '',
          actaAjustadorFuncionarioId: '',
          actaAjustadorNombre: '',
          actaAjustadorCargo: '',
          actaAjustadorEmail: '',
          actaAjustadorFirmaImagen: '',
          actaFirmas: [{ nombre: '', cargo: '', cc: '', firma: null }]
        });
        setMapaInfo({ imagen: null, coordenadas: null, direccion: '', posicion: null, zoom: 15 });
      } else if (siguienteEstado === 'inicial') {
        const propagado = propagarActaAInformePreliminar(formDataRef.current);
        setFormData({ ...propagado, estadoActual: 'inicial' });
        formDataRef.current = { ...propagado, estadoActual: 'inicial' };

        const idComplex = resolverIdentificadorComplexDesdeFormulario(propagado);
        const prefillFila = location?.state?.prefillDesdeCaso;
        if (idComplex) {
          await ejecutarAutofillDesdeComplex(
            idComplex,
            false,
            prefillFila && typeof prefillFila === 'object' ? prefillFila : null,
            { rellenarDatosGenerales: true }
          );
          setFormData((prev) => ({
            ...propagarActaAInformePreliminar(prev),
            estadoActual: 'inicial'
          }));
        }
      } else {
        setFormData((prev) => ({ ...prev, estadoActual: siguienteEstado }));
      }

      // Mostrar mensaje de éxito
      mostrarModalConfirmacion(
        'Formulario Generado',
        `${mensaje}\n\nFormulario ${siguienteEstado.toUpperCase()} generado correctamente.`,
        'success'
      );

      setCargando(false);
    } catch (error) {
      console.error('Error generando siguiente formulario:', error);
      setError('Error al generar el siguiente formulario');
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: bgMain }}
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4"
            style={{ borderColor: theme === 'dark' ? '#DC2626' : '#2563EB' }}
          ></div>
          <p 
            className="text-xl"
            style={{ color: textPrimary }}
          >
            Cargando formulario...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: bgMain }}
      >
        <div className="text-center">
          <div 
            className="text-6xl mb-4"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            ⚠️
          </div>
          <h1 
            className="text-2xl font-bold mb-4"
            style={{ color: textPrimary }}
          >
            Error
          </h1>
          <p 
            className="mb-6"
            style={{ color: textSecondary }}
          >
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB',
              color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
            }}
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: bgMain }}
    >
      {/* Header con logo y navegación */}
      <div 
        className="shadow-sm"
        style={{
          backgroundColor: cardBg,
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-4 gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img src={Logo} alt="Logo Grupo Proser" className="h-10 sm:h-12 w-auto" />
              <div>
                <h1 
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: textPrimary }}
                >
                  Grupo Proser
                </h1>
                <p 
                  className="text-xs sm:text-sm"
                  style={{ color: textSecondary }}
                >
                  Sistema de Formularios de Seguros
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-4 w-full lg:w-auto">
              {(() => {
                const origen = String(location?.state?.origen || '').trim();
                const mostrarVolver = origen === 'reporte-complex' || origen === 'trazabilidad';
                if (!mostrarVolver) return null;

                const handleVolverAlCaso = () => {
                  const returnPath = location?.state?.returnPath;
                  if (returnPath) {
                    navigate(returnPath);
                  } else {
                    navigate(-1);
                  }
                };

                return (
                  <button
                    onClick={handleVolverAlCaso}
                    className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex items-center text-xs sm:text-sm w-full sm:w-auto justify-center"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#F59E0B',
                      color: theme === 'dark' ? '#FCD34D' : '#FFFFFF'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#D97706';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#F59E0B';
                    }}
                    title="Volver al caso desde el que se abrió este formulario"
                  >
                    <span className="mr-1 sm:mr-2">↩️</span>
                    <span className="hidden sm:inline">Volver al caso</span>
                    <span className="sm:hidden">Volver</span>
                  </button>
                );
              })()}

              <button
                onClick={abrirMenuVersiones}
                className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex items-center text-xs sm:text-sm w-full sm:w-auto justify-center"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB',
                  color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#1D4ED8';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
                }}
              >
                <span className="mr-1 sm:mr-2">📋</span>
                <span className="hidden sm:inline">Versión: </span>
                {estadoActual === 'actaInspeccion' ? 'Acta de inspección' :
                 estadoActual === 'inicial' ? 'Informe preliminar' :
                 estadoActual === 'preeliminar' ? 'Preeliminar' :
                 estadoActual === 'actualizacion' ? 'Actualización' : 
                 estadoActual === 'informeFinal' ? 'Informe Final' : estadoActual}
              </button>
              
              <button
                onClick={abrirMenuSiguienteFormulario}
                className="px-2 sm:px-4 py-2 rounded-lg transition-colors flex items-center text-xs sm:text-sm w-full sm:w-auto justify-center"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A',
                  color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#15803D';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A';
                }}
              >
                <span className="mr-1 sm:mr-2">➡️</span>
                <span className="hidden sm:inline">Siguiente Paso</span>
                <span className="sm:hidden">Siguiente</span>
              </button>
              
              <button
                onClick={() => navigate('/historial')}
                className="px-2 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm w-full sm:w-auto"
                style={{
                  backgroundColor: theme === 'dark' ? '#2A2A2A' : '#4B5563',
                  color: theme === 'dark' ? '#E5E5E5' : '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#4B5563';
                }}
              >
                📚 Historial
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de selección de versión */}
      {mostrarMenuVersiones && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div 
            className="rounded-lg p-4 sm:p-6 max-w-md w-full mx-4 menu-versiones"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <h3 
              className="text-base sm:text-lg font-semibold mb-4"
              style={{ color: textPrimary }}
            >
              Seleccionar Versión
            </h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => cambiarVersion('actaInspeccion')}
                className="w-full text-left p-3 rounded-lg border transition-colors"
                style={{
                  borderColor: estadoActual === 'actaInspeccion'
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : borderColor,
                  backgroundColor: estadoActual === 'actaInspeccion'
                    ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#DBEAFE')
                    : 'transparent',
                  color: estadoActual === 'actaInspeccion'
                    ? (theme === 'dark' ? '#FCA5A5' : '#1E40AF')
                    : textPrimary
                }}
                onMouseEnter={(e) => {
                  if (estadoActual !== 'actaInspeccion') {
                    e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (estadoActual !== 'actaInspeccion') {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="font-medium">1 · Acta de Inspección</div>
                <div className="text-sm" style={{ color: textSecondary }}>
                  Primer paso del flujo (datos del acta)
                </div>
              </button>

              <button
                type="button"
                onClick={() => cambiarVersion('inicial')}
                className="w-full text-left p-3 rounded-lg border transition-colors"
                style={{
                  borderColor: estadoActual === 'inicial' 
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : borderColor,
                  backgroundColor: estadoActual === 'inicial' 
                    ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#DBEAFE')
                    : 'transparent',
                  color: estadoActual === 'inicial' 
                    ? (theme === 'dark' ? '#FCA5A5' : '#1E40AF')
                    : textPrimary
                }}
                onMouseEnter={(e) => {
                  if (estadoActual !== 'inicial') {
                    e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (estadoActual !== 'inicial') {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="font-medium">2 · Informe preliminar</div>
                <div 
                  className="text-sm"
                  style={{ color: textSecondary }}
                >
                  Datos generales y cuerpo del informe preliminar
                </div>
              </button>
              
              <button
                onClick={() => cambiarVersion('actualizacion')}
                className="w-full text-left p-3 rounded-lg border transition-colors"
                style={{
                  borderColor: estadoActual === 'actualizacion' 
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : borderColor,
                  backgroundColor: estadoActual === 'actualizacion' 
                    ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#DBEAFE')
                    : 'transparent',
                  color: estadoActual === 'actualizacion' 
                    ? (theme === 'dark' ? '#FCA5A5' : '#1E40AF')
                    : textPrimary
                }}
                onMouseEnter={(e) => {
                  if (estadoActual !== 'actualizacion') {
                    e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (estadoActual !== 'actualizacion') {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="font-medium">3 · Actualización</div>
                <div 
                  className="text-sm"
                  style={{ color: textSecondary }}
                >
                  Información actualizada del caso
                </div>
              </button>
              
              <button
                onClick={() => cambiarVersion('informeFinal')}
                className="w-full text-left p-3 rounded-lg border transition-colors"
                style={{
                  borderColor: estadoActual === 'informeFinal' 
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : borderColor,
                  backgroundColor: estadoActual === 'informeFinal' 
                    ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#DBEAFE')
                    : 'transparent',
                  color: estadoActual === 'informeFinal' 
                    ? (theme === 'dark' ? '#FCA5A5' : '#1E40AF')
                    : textPrimary
                }}
                onMouseEnter={(e) => {
                  if (estadoActual !== 'informeFinal') {
                    e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F9FAFB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (estadoActual !== 'informeFinal') {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="font-medium">4 · Informe final</div>
                <div 
                  className="text-sm"
                  style={{ color: textSecondary }}
                >
                  Versión definitiva del informe
                </div>
              </button>
            </div>
            
            <button
              onClick={cerrarMenuVersiones}
              className="w-full mt-6 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? '#2A2A2A' : '#4B5563',
                color: theme === 'dark' ? '#E5E5E5' : '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#374151';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#4B5563';
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de siguiente formulario */}
      {mostrarMenuSiguienteFormulario && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div 
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: textPrimary }}
            >
              Siguiente Formulario
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: textSecondary }}
            >
              Selecciona el siguiente paso en la secuencia del caso:
            </p>
            
            <div className="space-y-3">
              {estadoActual === 'actaInspeccion' && (
                <button
                  type="button"
                  onClick={async () => {
                    cerrarMenuSiguienteFormulario();
                    await generarSiguienteFormulario();
                  }}
                  className="w-full text-left p-3 rounded-lg border transition-colors"
                  style={{
                    borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.35)' : '#93C5FD',
                    backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
                    color: theme === 'dark' ? '#93C5FD' : '#1E3A8A'
                  }}
                >
                  <div className="font-medium">2 · Informe preliminar</div>
                  <div className="text-sm" style={{ color: textSecondary }}>
                    Datos generales del siniestro y cuerpo del informe preliminar
                  </div>
                </button>
              )}

              {estadoActual === 'inicial' && (
                <button
                  type="button"
                  onClick={async () => {
                    cerrarMenuSiguienteFormulario();
                    await generarSiguienteFormulario();
                  }}
                  className="w-full text-left p-3 rounded-lg border transition-colors"
                  style={{
                    borderColor: theme === 'dark' ? 'rgba(234, 179, 8, 0.3)' : '#FDE047',
                    backgroundColor: theme === 'dark' ? 'rgba(234, 179, 8, 0.15)' : '#FEFCE8',
                    color: theme === 'dark' ? '#FDE047' : '#854D0E'
                  }}
                >
                  <div className="font-medium">3 · Actualización</div>
                  <div className="text-sm" style={{ color: theme === 'dark' ? '#FCD34D' : '#A16207' }}>
                    Cambios y nueva información del caso
                  </div>
                </button>
              )}
              
              {estadoActual === 'actualizacion' && (
                <button
                  type="button"
                  onClick={async () => {
                    cerrarMenuSiguienteFormulario();
                    await generarSiguienteFormulario();
                  }}
                  className="w-full text-left p-3 rounded-lg border transition-colors"
                  style={{
                    borderColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : '#C084FC',
                    backgroundColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
                    color: theme === 'dark' ? '#C084FC' : '#6B21A8'
                  }}
                >
                  <div className="font-medium">4 · Informe final</div>
                  <div className="text-sm" style={{ color: theme === 'dark' ? '#D8B4FE' : '#7C3AED' }}>
                    Conclusiones, liquidación y cierre del caso
                  </div>
                </button>
              )}
              
              {estadoActual === 'informeFinal' && (
                <button
                  type="button"
                  onClick={async () => {
                    cerrarMenuSiguienteFormulario();
                    await generarSiguienteFormulario();
                  }}
                  className="w-full text-left p-3 rounded-lg border transition-colors"
                  style={{
                    borderColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#93C5FD',
                    backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#DBEAFE',
                    color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                  }}
                >
                  <div className="font-medium">🆕 Nuevo caso (desde acta)</div>
                  <div className="text-sm" style={{ color: theme === 'dark' ? '#60A5FA' : '#1E3A8A' }}>
                    Guarda, limpia el formulario y vuelve al paso 1 · Acta de inspección
                  </div>
                </button>
              )}

              {/* Botón para generar versión final completa (disponible desde cualquier estado) */}
              <button
                onClick={() => {
                  cambiarVersion('informeFinal');
                  cerrarMenuSiguienteFormulario();
                }}
                className="w-full text-left p-3 rounded-lg border transition-colors"
                style={{
                  borderColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : '#C084FC',
                  backgroundColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
                  color: theme === 'dark' ? '#C084FC' : '#6B21A8'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(168, 85, 247, 0.25)' : '#F3E8FF';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF';
                }}
              >
                <div className="font-medium">🎯 Generar Versión Final Completa</div>
                <div 
                  className="text-sm"
                  style={{ color: theme === 'dark' ? '#D8B4FE' : '#7C3AED' }}
                >
                  Crear informe final con liquidación, indemnización, salvamentos y recomendaciones
                </div>
              </button>
              
              {/* Opción para ver historial de versiones */}
              <button
                onClick={() => {
                  cerrarMenuSiguienteFormulario();
                  abrirMenuVersiones();
                }}
                className="w-full text-left p-3 rounded-lg border transition-colors"
                style={{
                  borderColor: borderColor,
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                  color: textPrimary
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? '#1F1F1F' : '#F9FAFB';
                }}
              >
                <div className="font-medium">📋 Ver Todas las Versiones</div>
                <div 
                  className="text-sm"
                  style={{ color: textSecondary }}
                >
                  Cambiar a cualquier versión disponible
                </div>
              </button>
            </div>
            
            <button
              onClick={cerrarMenuSiguienteFormulario}
              className="w-full mt-6 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? '#2A2A2A' : '#4B5563',
                color: theme === 'dark' ? '#E5E5E5' : '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#374151';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#4B5563';
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div
        className={
          estadoActual === 'actaInspeccion'
            ? 'w-full max-w-none mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8'
            : 'max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8'
        }
      >
        {estadoActual !== 'actaInspeccion' && (
        <div className="mb-6 sm:mb-8">
          <ChatbotIA 
            formData={formData} 
            onInputChange={handleInputChange}
          />
        </div>
        )}

        {/* Formulario */}
        {estadoActual === 'actaInspeccion' ? (
          <ActaInspeccionAjuste formData={formData} onInputChange={handleInputChange} />
        ) : (
        <div 
          className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 mb-6 sm:mb-8"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          {/* Datos Generales del Siniestro */}
          <DatosGeneralesAjuste 
            formData={formData} 
            onInputChange={handleInputChange}
            datosMaestros={DATOS_MAESTROS}
            autofillState={autofillState}
            mostrarResumenTablaInforme={estadoActual !== 'actaInspeccion'}
          />

          {/* Valor de Reserva (campos personalizados en tabla del Word) */}
          <div 
            className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 mb-6"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-xl font-bold"
                style={{ color: textPrimary }}
              >
                💰 {tituloAjuste('Valor de reserva')}
              </h2>
              <button
                onClick={() => {
                  const nuevoCampo = {
                    id: Date.now(),
                    nombre: '',
                    valor: ''
                  };
                  setFormData(prev => ({
                    ...prev,
                    camposPersonalizados: [...(prev.camposPersonalizados || []), nuevoCampo]
                  }));
                }}
                className="px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A',
                  color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#15803D';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A';
                }}
              >
                <span className="mr-2">➕</span>
                Agregar concepto
              </button>
            </div>

            <p 
              className="text-sm mb-4"
              style={{ color: textSecondary }}
            >
              {subtituloAjuste(
                'Registra el valor de reserva y conceptos relacionados (montos, porcentajes, etc.); en el Word aparecen en la tabla «INFORMACIÓN DETALLADA DEL SINIESTRO» en preliminar, actualización o informe final (no en el acta de inspección).'
              )}
            </p>

            {/* Lista de campos personalizados */}
            {formData.camposPersonalizados && formData.camposPersonalizados.length > 0 ? (
              <div className="space-y-3">
                {formData.camposPersonalizados.map((campo, index) => (
                  <div
                    key={campo.id || index}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                      borderColor: borderColor
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label 
                          className="block text-sm font-medium mb-2"
                          style={{ color: textPrimary }}
                        >
                          Concepto / Descripción
                        </label>
                        <input
                          type="text"
                          value={campo.nombre || ''}
                          onChange={(e) => {
                            const nuevosCampos = [...formData.camposPersonalizados];
                            nuevosCampos[index] = { ...campo, nombre: e.target.value };
                            setFormData(prev => ({
                              ...prev,
                              camposPersonalizados: nuevosCampos
                            }));
                          }}
                          placeholder="Ej: Valor de Reposición, Deducible, etc."
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            backgroundColor: inputBg,
                            borderColor: borderColor,
                            color: textPrimary
                          }}
                        />
                      </div>
                      <div>
                        <label 
                          className="block text-sm font-medium mb-2"
                          style={{ color: textPrimary }}
                        >
                          Valor
                        </label>
                        <input
                          type="text"
                          value={campo.valor || ''}
                          onChange={(e) => {
                            const nuevosCampos = [...formData.camposPersonalizados];
                            nuevosCampos[index] = { ...campo, valor: e.target.value };
                            setFormData(prev => ({
                              ...prev,
                              camposPersonalizados: nuevosCampos
                            }));
                          }}
                          placeholder="Ej: $50.000.000, 15%, 1.5%, etc."
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            backgroundColor: inputBg,
                            borderColor: borderColor,
                            color: textPrimary
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const nuevosCampos = formData.camposPersonalizados.filter((_, i) => i !== index);
                        setFormData(prev => ({
                          ...prev,
                          camposPersonalizados: nuevosCampos
                        }));
                      }}
                      className="px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#EF4444',
                        color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#EF4444';
                      }}
                    >
                      <span className="mr-2">🗑️</span>
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="p-6 rounded-lg border-2 border-dashed text-center"
                style={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                  borderColor: borderColor,
                  color: textSecondary
                }}
              >
                <p className="text-sm">Aún no hay conceptos de valor de reserva agregados.</p>
                <p className="text-xs mt-2">Haz clic en «Agregar concepto» para incluir montos, porcentajes u otros datos que quieras reflejar en el informe.</p>
              </div>
            )}
          </div>

          {/* Antecedentes del Siniestro */}
          <AntecedentesAjuste 
            formData={formData} 
            onInputChange={handleInputChange}
            numeroSeccion={numsSeccion.antecedentes}
          />

          <DescripcionRiesgoAjuste 
            formData={formData} 
            onInputChange={handleInputChange}
            numeroSeccion={numsSeccion.descripcionRiesgo}
          />

          {/* Mapa: mismo orden que el Word (dentro de descripción del riesgo, no en portada) */}
          <div 
            className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 mb-6"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <h2 
              className="text-xl font-bold mb-4"
              style={{ color: textPrimary }}
            >
              Ubicación Geográfica del Siniestro
            </h2>
            <MapaGoogleEarth 
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              coordenadasIniciales={formData.coordenadasRiesgo}
              direccionInicial={formData.direccionRiesgo}
              capturaInicial={capturaMapaUrlParaMapa || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChange}
              onMapReady={(map) => {
                console.log('✅ Mapa Google Earth listo en formulario de ajustes');
                // Si hay coordenadas existentes, el mapa ya se inicializó con ellas
                // Solo necesitamos centrar si el mapa cambió después de cargar
                if (formData.coordenadasRiesgo && map && typeof map.panTo === 'function' && typeof map.setZoom === 'function') {
                  try {
                    const coordsString = formData.coordenadasRiesgo.trim();
                    if (!coordsString) {
                      return; // No hay coordenadas, salir silenciosamente
                    }
                    
                    const coords = coordsString.split(',').map(c => parseFloat(c.trim()));
                    
                    // Validar que tenemos exactamente 2 coordenadas y que ambas son números finitos válidos
                    if (coords.length === 2 && 
                        !isNaN(coords[0]) && 
                        !isNaN(coords[1]) && 
                        isFinite(coords[0]) && 
                        isFinite(coords[1]) &&
                        coords[0] >= -90 && coords[0] <= 90 && // Latitud válida
                        coords[1] >= -180 && coords[1] <= 180) { // Longitud válida
                      
                      if (window.google && window.google.maps && window.google.maps.LatLng) {
                        const pos = new window.google.maps.LatLng(coords[0], coords[1]);
                        map.panTo(pos);
                        map.setZoom(18);
                      }
                    } else {
                      console.warn('⚠️ Coordenadas inválidas:', formData.coordenadasRiesgo);
                    }
                  } catch (error) {
                    console.warn('⚠️ Error al centrar el mapa:', error);
                  }
                }
              }}
            />
          </div>

          <CircunstanciaSiniestroAjuste 
            formData={formData} 
            onInputChange={handleInputChange}
            numeroSeccion={numsSeccion.circunstancias}
          />

          <InspeccionFotograficaAjuste 
            formData={formData} 
            onInputChange={handleInputChange}
            numeroSeccion={numsSeccion.inspeccion}
            onAgregarImagenBase64={(base64String, nombre) => {
              const imagenBase64 = {
                id: Date.now() + Math.random(),
                nombre: nombre || 'Imagen Base64',
                base64: base64String,
                descripcion: ''
              };
              
              setFormData(prev => ({
                ...prev,
                imagenesInspeccion: prev.imagenesInspeccion ? [...prev.imagenesInspeccion, imagenBase64] : [imagenBase64]
              }));
              
              console.log('📸 Imagen base64 agregada desde el formulario principal');
            }}
          />

          <CausaAjuste 
            formData={formData} 
            onInputChange={handleInputChange}
            numeroSeccion={numsSeccion.causa}
          />

          {/* Análisis, reserva, salvamentos, recobro y observaciones (orden fijo) */}
          {estadoActual !== 'actaInspeccion' && (
            <>
              <div
                className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6"
                style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
              >
                <AnalisisCoberturaAjuste
                  formData={formData}
                  onInputChange={handleInputChange}
                  numeroSeccion={numsSeccion.analisisCobertura}
                />
              </div>

              {numsSeccion.reserva != null && (
                <div
                  className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6"
                  style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
                >
                  <ReservaSugeridaAjuste
                    formData={formData}
                    onInputChange={handleInputChange}
                    numeroSeccion={numsSeccion.reserva}
                  />
                </div>
              )}

              <div
                className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6"
                style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
              >
                <SalvamentosAjuste
                  formData={formData}
                  onInputChange={handleInputChange}
                  numeroSeccion={numsSeccion.salvamentos}
                />
              </div>

              <div
                className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6"
                style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
              >
                <RecobroAjuste
                  formData={formData}
                  onInputChange={handleInputChange}
                  numeroSeccion={numsSeccion.recobro}
                />
              </div>

              {numsSeccion.observacionesActa != null && (
                <div
                  className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 mb-6"
                  style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
                >
                  <ObservacionesPreeliminar
                    formData={formData}
                    onInputChange={handleInputChange}
                    numeroSeccion={numsSeccion.observacionesActa}
                  />
                </div>
              )}
            </>
          )}

          {/* Campos de Actualización - visible en versión actualización e informe final */}
          {(estadoActual === 'actualizacion' || estadoActual === 'informeFinal') && (
            <div 
              className="rounded-lg shadow-lg p-3 sm:p-4 lg:p-6"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`
              }}
            >
              <div 
                className="pb-4 mb-6"
                style={{
                  borderBottom: `1px solid ${borderColor}`
                }}
              >
                <h3 
                  className="text-xl sm:text-2xl font-bold flex items-center"
                  style={{ color: textPrimary }}
                >
                  <span className="mr-2 sm:mr-3">📊</span>
                  {numsSeccion.actualizacion}. ACTUALIZACIÓN DEL CASO
                </h3>
                <p 
                  className="text-sm sm:text-base mt-2"
                  style={{ color: textSecondary }}
                >
                  {subtituloAjuste(
                    'Información actualizada y cambios desde la versión preeliminar'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label 
                    className="block text-xs sm:text-sm font-medium mb-2"
                    style={{ color: textPrimary }}
                  >
                    {subtituloAjuste('Fecha de actualización')}
                  </label>
                  <input
                    type="date"
                    value={formData.fechaActualizacion || obtenerFechaActualISO()}
                    onChange={(e) => handleInputChange('fechaActualizacion', e.target.value)}
                    className="w-full px-2 sm:px-3 py-2 rounded-md focus:outline-none text-sm"
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
                    className="block text-xs sm:text-sm font-medium mb-2"
                    style={{ color: textPrimary }}
                  >
                    {subtituloAjuste('Inspector responsable')}
                  </label>
                  <input
                    type="text"
                    value={formData.inspector || ''}
                    onChange={(e) => handleInputChange('inspector', e.target.value)}
                    placeholder="Nombre del inspector"
                    className="w-full px-2 sm:px-3 py-2 rounded-md focus:outline-none text-sm"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor,
                      border: `1px solid ${borderColor}`
                    }}
                  />
                </div>
              </div>

              <div className="mt-6">
                <label 
                  className="block text-xs sm:text-sm font-medium mb-2"
                  style={{ color: textPrimary }}
                >
                  {subtituloAjuste('Cambios desde la versión preeliminar')}
                </label>
                <textarea
                  value={formData.cambiosDesdePreeliminar || ''}
                  onChange={(e) => handleInputChange('cambiosDesdePreeliminar', e.target.value)}
                  placeholder="Describe los cambios principales desde la versión preeliminar..."
                  rows={4}
                  className="w-full px-2 sm:px-3 py-2 rounded-md focus:outline-none text-sm"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
                
                {/* Chatbot IA para Cambios desde Preeliminar */}
                <div className="mt-3">
                  <ChatbotIA 
                    formData={formData} 
                    onInputChange={handleInputChange}
                    seccion="cambiosDesdePreeliminar"
                    tituloSeccion="Cambios desde la Versión Preeliminar"
                    textoActual={formData.cambiosDesdePreeliminar || ''}
                    onTextoCambiado={(texto) => handleInputChange('cambiosDesdePreeliminar', texto)}
                    tipoSeccion="cambiosDesdePreeliminar"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: textPrimary }}
                >
                  {subtituloAjuste('Nueva información recopilada')}
                </label>
                <textarea
                  value={formData.nuevaInformacion || ''}
                  onChange={(e) => handleInputChange('nuevaInformacion', e.target.value)}
                  placeholder="Describe la nueva información obtenida..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
                
                {/* Chatbot IA para Nueva Información */}
                <div className="mt-3">
                  <ChatbotIA 
                    formData={formData} 
                    onInputChange={handleInputChange}
                    seccion="nuevaInformacion"
                    tituloSeccion="Nueva Información Recopilada"
                    textoActual={formData.nuevaInformacion || ''}
                    onTextoCambiado={(texto) => handleInputChange('nuevaInformacion', texto)}
                    tipoSeccion="nuevaInformacion"
                  />
                </div>
              </div>

              <div className="mt-6">
                {numsSeccion.observacionesActualizacion != null && (
                  <h4 className="text-lg font-semibold mb-3" style={{ color: textPrimary }}>
                    {numsSeccion.observacionesActualizacion}. OBSERVACIONES DE ACTUALIZACIÓN
                  </h4>
                )}
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: textPrimary }}
                >
                  Observaciones de Actualización
                </label>
                <textarea
                  value={formData.observacionesActualizacion || ''}
                  onChange={(e) => handleInputChange('observacionesActualizacion', e.target.value)}
                  placeholder="Observaciones específicas de la actualización del caso..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
                
                {/* Chatbot IA para Observaciones de Actualización */}
                <div className="mt-3">
                  <ChatbotIA 
                    formData={formData} 
                    onInputChange={handleInputChange}
                    seccion="observacionesActualizacion"
                    tituloSeccion="Observaciones de Actualización"
                    textoActual={formData.observacionesActualizacion || ''}
                    onTextoCambiado={(texto) => handleInputChange('observacionesActualizacion', texto)}
                    tipoSeccion="observacionesActualizacion"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos de Informe Final - solo visible en versión informe final */}
          {estadoActual === 'informeFinal' && (
            <div 
              className="rounded-lg shadow-lg p-6"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`
              }}
            >
              <div 
                className="pb-4 mb-6"
                style={{
                  borderBottom: `1px solid ${borderColor}`
                }}
              >
                <h3 
                  className="text-2xl font-bold flex items-center"
                  style={{ color: textPrimary }}
                >
                  <span className="mr-3">✅</span>
                  Informe Final
                </h3>
                <p 
                  className="mt-2"
                  style={{ color: textSecondary }}
                >
                  Conclusiones definitivas y recomendaciones finales del caso
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: textPrimary }}
                  >
                    Fecha del Informe Final
                  </label>
                  <input
                    type="date"
                    value={formData.fechaInformeFinal || obtenerFechaActualISO()}
                    onChange={(e) => handleInputChange('fechaInformeFinal', e.target.value)}
                    className="w-full px-3 py-2 rounded-md focus:outline-none"
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
                    className="block text-sm font-medium mb-2"
                    style={{ color: textPrimary }}
                  >
                    {subtituloAjuste('Inspector responsable')}
                  </label>
                  <input
                    type="text"
                    value={formData.inspector || ''}
                    onChange={(e) => handleInputChange('inspector', e.target.value)}
                    placeholder="Nombre del inspector"
                    className="w-full px-3 py-2 rounded-md focus:outline-none"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor,
                      border: `1px solid ${borderColor}`
                    }}
                  />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3" style={{ color: textPrimary }}>
                  {numsSeccion.conclusionesFinales}. CONCLUSIONES FINALES
                </h4>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: textPrimary }}
                >
                  Conclusiones Finales
                </label>
                <textarea
                  value={formData.conclusionesFinales || ''}
                  onChange={(e) => handleInputChange('conclusionesFinales', e.target.value)}
                  placeholder="Conclusiones definitivas del caso..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
                
                {/* Chatbot IA para Conclusiones Finales */}
                <div className="mt-3">
                  <ChatbotIA 
                    formData={formData} 
                    onInputChange={handleInputChange}
                    seccion="conclusionesFinales"
                    tituloSeccion="Conclusiones Finales"
                    textoActual={formData.conclusionesFinales || ''}
                    onTextoCambiado={(texto) => handleInputChange('conclusionesFinales', texto)}
                    tipoSeccion="conclusionesFinales"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3" style={{ color: textPrimary }}>
                  {numsSeccion.recomendacionesFinales}. RECOMENDACIONES FINALES
                </h4>
                <label 
                  className="text-sm font-medium mb-2"
                  style={{ color: textPrimary }}
                >
                  Recomendaciones Finales
                </label>
                <textarea
                  value={formData.recomendacionesFinales || ''}
                  onChange={(e) => handleInputChange('recomendacionesFinales', e.target.value)}
                  placeholder="Recomendaciones definitivas para el caso..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
                
                {/* Chatbot IA para Recomendaciones Finales */}
                <div className="mt-3">
                  <ChatbotIA 
                    formData={formData} 
                    onInputChange={handleInputChange}
                    seccion="recomendacionesFinales"
                    tituloSeccion="Recomendaciones Finales"
                    textoActual={formData.recomendacionesFinales || ''}
                    onTextoCambiado={(texto) => handleInputChange('recomendacionesFinales', texto)}
                    tipoSeccion="recomendacionesFinales"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3" style={{ color: textPrimary }}>
                  {numsSeccion.observacionesInformeFinal}. OBSERVACIONES DEL INFORME FINAL
                </h4>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{ color: textPrimary }}
                >
                  Observaciones del Informe Final
                </label>
                <textarea
                  value={formData.observacionesInformeFinal || ''}
                  onChange={(e) => handleInputChange('observacionesInformeFinal', e.target.value)}
                  placeholder="Observaciones específicas del informe final..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
                
                {/* Chatbot IA para Observaciones del Informe Final */}
                <div className="mt-3">
                  <ChatbotIA 
                    formData={formData} 
                    onInputChange={handleInputChange}
                    seccion="observacionesInformeFinal"
                    tituloSeccion="Observaciones del Informe Final"
                    textoActual={formData.observacionesInformeFinal || ''}
                    onTextoCambiado={(texto) => handleInputChange('observacionesInformeFinal', texto)}
                    tipoSeccion="observacionesInformeFinal"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos de la Parte Final - solo visible en versión informe final */}
          {estadoActual === 'informeFinal' && (
            <div 
              className="rounded-lg shadow-lg p-6"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`
              }}
            >
              <div 
                className="pb-4 mb-6"
                style={{
                  borderBottom: `1px solid ${borderColor}`
                }}
              >
                <h3 
                  className="text-2xl font-bold flex items-center"
                  style={{ color: textPrimary }}
                >
                  <span className="mr-3">🎯</span>
                  Parte Final del Formulario
                </h3>
                <p 
                  className="mt-2"
                  style={{ color: textSecondary }}
                >
                  Liquidación de pérdida, indemnización, salvamentos y recomendaciones finales
                </p>
              </div>

              {/* LIQUIDACIÓN DE LA PÉRDIDA */}
              <div className="mb-8">
                <h4 
                  className="text-lg font-semibold mb-4"
                  style={{ color: textPrimary }}
                >
                  {numsSeccion.liquidacion}. LIQUIDACIÓN DE LA PÉRDIDA
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: textPrimary }}
                    >
                      Infraseguro
                    </label>
                    <textarea
                      value={formData.liquidacionPerdida?.infraseguro || ''}
                      onChange={(e) => handleInputChange('liquidacionPerdida', {
                        ...formData.liquidacionPerdida,
                        infraseguro: e.target.value
                      })}
                      placeholder="Describe el infraseguro..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        borderColor: borderColor,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                    
                    {/* Chatbot IA para Infraseguro */}
                    <div className="mt-3">
                      <ChatbotIA 
                        formData={formData} 
                        onInputChange={handleInputChange}
                        seccion="infraseguro"
                        tituloSeccion="Infraseguro"
                        textoActual={formData.liquidacionPerdida?.infraseguro || ''}
                        onTextoCambiado={(texto) => handleInputChange('liquidacionPerdida', {
                          ...formData.liquidacionPerdida,
                          infraseguro: texto
                        })}
                        tipoSeccion="infraseguro"
                      />
                    </div>
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: textPrimary }}
                    >
                      Demérito
                    </label>
                    <textarea
                      value={formData.liquidacionPerdida?.demerito || ''}
                      onChange={(e) => handleInputChange('liquidacionPerdida', {
                        ...formData.liquidacionPerdida,
                        demerito: e.target.value
                      })}
                      placeholder="Describe el demérito..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        borderColor: borderColor,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                    
                    {/* Chatbot IA para Demérito */}
                    <div className="mt-3">
                      <ChatbotIA 
                        formData={formData} 
                        onInputChange={handleInputChange}
                        seccion="demerito"
                        tituloSeccion="Demérito"
                        textoActual={formData.liquidacionPerdida?.demerito || ''}
                        onTextoCambiado={(texto) => handleInputChange('liquidacionPerdida', {
                          ...formData.liquidacionPerdida,
                          demerito: texto
                        })}
                        tipoSeccion="demerito"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: textPrimary }}
                  >
                    Avance Tecnológico
                  </label>
                  <textarea
                    value={formData.liquidacionPerdida?.avanceTecnologico || ''}
                    onChange={(e) => handleInputChange('liquidacionPerdida', {
                      ...formData.liquidacionPerdida,
                      avanceTecnologico: e.target.value
                    })}
                    placeholder="Describe el avance tecnológico..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-md focus:outline-none"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor,
                      border: `1px solid ${borderColor}`
                    }}
                  />
                  
                  {/* Chatbot IA para Avance Tecnológico */}
                  <div className="mt-3">
                    <ChatbotIA 
                      formData={formData} 
                      onInputChange={handleInputChange}
                      seccion="avanceTecnologico"
                      tituloSeccion="Avance Tecnológico"
                      textoActual={formData.liquidacionPerdida?.avanceTecnologico || ''}
                      onTextoCambiado={(texto) => handleInputChange('liquidacionPerdida', {
                        ...formData.liquidacionPerdida,
                        avanceTecnologico: texto
                      })}
                      tipoSeccion="avanceTecnologico"
                    />
                  </div>
                </div>
              </div>

              {/* LIQUIDADOR - Tabla de liquidación */}
              <div className="mb-8">
                <h4 
                  className="text-lg font-semibold mb-4"
                  style={{ color: textPrimary }}
                >
                  {numsSeccion.liquidador}. LIQUIDADOR
                </h4>
                <LiquidadorAjuste 
                  formData={formData} 
                  onInputChange={handleInputChange}
                />
              </div>

              {/* INDEMNIZACIÓN */}
              <div className="mb-8">
                <h4 
                  className="text-lg font-semibold mb-4"
                  style={{ color: textPrimary }}
                >
                  {numsSeccion.indemnizacion}. INDEMNIZACIÓN
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: textPrimary }}
                    >
                      Deducible
                    </label>
                    <textarea
                      value={formData.indemnizacion?.deducible || ''}
                      onChange={(e) => handleInputChange('indemnizacion', {
                        ...formData.indemnizacion,
                        deducible: e.target.value
                      })}
                      placeholder="Describe el deducible..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        borderColor: borderColor,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                    
                    {/* Chatbot IA para Deducible */}
                    <div className="mt-3">
                      <ChatbotIA 
                        formData={formData} 
                        onInputChange={handleInputChange}
                        seccion="deducible"
                        tituloSeccion="Deducible"
                        textoActual={formData.indemnizacion?.deducible || ''}
                        onTextoCambiado={(texto) => handleInputChange('indemnizacion', {
                          ...formData.indemnizacion,
                          deducible: texto
                        })}
                        tipoSeccion="deducible"
                      />
                    </div>
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: textPrimary }}
                    >
                      Subrogación
                    </label>
                    <textarea
                      value={formData.indemnizacion?.subrogacion || ''}
                      onChange={(e) => handleInputChange('indemnizacion', {
                        ...formData.indemnizacion,
                        subrogacion: e.target.value
                      })}
                      placeholder="Describe la subrogación..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        borderColor: borderColor,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                    
                    {/* Chatbot IA para Subrogación */}
                    <div className="mt-3">
                      <ChatbotIA 
                        formData={formData} 
                        onInputChange={handleInputChange}
                        seccion="subrogacion"
                        tituloSeccion="Subrogación"
                        textoActual={formData.indemnizacion?.subrogacion || ''}
                        onTextoCambiado={(texto) => handleInputChange('indemnizacion', {
                          ...formData.indemnizacion,
                          subrogacion: texto
                        })}
                        tipoSeccion="subrogacion"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RECOMENDACIONES - PANORAMA DE RIESGOS */}
              <div className="mb-8">
                <h4 
                  className="text-lg font-semibold mb-4"
                  style={{ color: textPrimary }}
                >
                  {numsSeccion.panorama}. RECOMENDACIONES - PANORAMA DE RIESGOS
                </h4>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: textPrimary }}
                  >
                    Panorama de Riesgos
                  </label>
                  <textarea
                    value={formData.panoramaRiesgos || ''}
                    onChange={(e) => handleInputChange('panoramaRiesgos', e.target.value)}
                    placeholder="Describe el panorama de riesgos y recomendaciones..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-md focus:outline-none"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor,
                      border: `1px solid ${borderColor}`
                    }}
                  />
                  
                  {/* Chatbot IA para Panorama de Riesgos */}
                  <div className="mt-3">
                    <ChatbotIA 
                      formData={formData} 
                      onInputChange={handleInputChange}
                      seccion="panoramaRiesgos"
                      tituloSeccion="Panorama de Riesgos"
                      textoActual={formData.panoramaRiesgos || ''}
                      onTextoCambiado={(texto) => handleInputChange('panoramaRiesgos', texto)}
                      tipoSeccion="panoramaRiesgos"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Componente de Firma */}
          <FirmaAjuste 
            formData={formData} 
            onInputChange={handleInputChange} 
          />
          
          {/* Log para verificar firmas antes de renderizar */}
          {console.log('🔍 Renderizando FirmaAjuste con firmas:', {
            firmaFuncionario: !!formData.firmaFuncionario,
            firmaIskharly: !!formData.firmaIskharly,
            funcionarioFirma: formData.funcionarioFirma,
            cargoFuncionario: formData.cargoFuncionario
          })}
        </div>
        )}

        {/* Botones de acción simplificados - 4 botones principales */}
        <div 
          className="rounded-lg shadow-lg p-6 mb-8"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <div className="text-center mb-4">
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: textPrimary }}
            >
              Gestión del Formulario
            </h3>
            <p 
              className="text-sm"
              style={{ color: textSecondary }}
            >
              Estado actual: <span className="font-bold">
                {estadoActual === 'actaInspeccion' ? 'Acta de inspección' :
                 estadoActual === 'inicial' ? 'Informe preliminar' :
                 estadoActual === 'preeliminar' ? 'Preeliminar' :
                 estadoActual === 'actualizacion' ? 'Actualización' : 
                 estadoActual === 'informeFinal' ? 'Informe Final' : estadoActual}
              </span>
            </p>
            <p 
              className="text-xs mt-1"
              style={{ color: textSecondary }}
            >
              El menú «Siguiente paso» guarda el progreso y avanza: 1 Acta → 2 Preliminar → 3 Actualización → 4 Final
            </p>
            
            {/* Indicador de progreso en la secuencia */}
            <div className="mt-3 flex justify-center">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: estadoActual === 'actaInspeccion' ? '#DC2626' : (theme === 'dark' ? '#404040' : '#D1D5DB') }}
                  title="1 · Acta de inspección"
                ></div>
                <div style={{ color: textSecondary }}>→</div>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: estadoActual === 'inicial' || estadoActual === 'preeliminar' ? '#3B82F6' : (theme === 'dark' ? '#404040' : '#D1D5DB') }}
                  title="2 · Informe preliminar"
                ></div>
                <div style={{ color: textSecondary }}>→</div>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: estadoActual === 'actualizacion' ? '#EAB308' : (theme === 'dark' ? '#404040' : '#D1D5DB') }}
                  title="3 · Actualización"
                ></div>
                <div style={{ color: textSecondary }}>→</div>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: estadoActual === 'informeFinal' ? '#8B5CF6' : (theme === 'dark' ? '#404040' : '#D1D5DB') }}
                  title="4 · Informe final"
                ></div>
              </div>
            </div>
            
            {/* Información sobre el estado actual */}
            <div 
              className="mt-3 p-2 rounded-lg"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.4)' : '#BFDBFE'}`,
                color: theme === 'dark' ? '#93C5FD' : '#1E3A8A'
              }}
            >
              <p className="text-xs text-center">
                {estadoActual === 'actaInspeccion' && '📋 Acta de inspección — Complete el acta; el Word del informe incluirá esta sección al inicio del cuerpo del documento.'}
                {estadoActual === 'inicial' && '📝 Informe preliminar — Tras causa: análisis de cobertura, reserva, salvamentos, recobro y observaciones (en ese orden).'}
                {estadoActual === 'preeliminar' && '📝 Preeliminar — Incluye análisis de cobertura y bloques del informe preliminar.'}
                {estadoActual === 'actualizacion' && '📊 Actualización — Cambios y nueva información del caso.'}
                {estadoActual === 'informeFinal' && '✅ Informe final — Conclusiones, liquidación, indemnización y cierre.'}
              </p>
            </div>
            
            {/* Información sobre el Word generado */}
            <div 
              className="mt-3 p-2 rounded-lg"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4',
                border: `1px solid ${theme === 'dark' ? 'rgba(34, 197, 94, 0.4)' : '#BBF7D0'}`,
                color: theme === 'dark' ? '#86EFAC' : '#14532D'
              }}
            >
              <p className="text-xs text-center">
                {estadoActual === 'actaInspeccion' && '📄 Word (acta): encabezado con logo e «INFORME DE INSPECCIÓN» (negro), luego «ACTA DE INSPECCIÓN» (tabla, narrativas, observaciones y firmas); sin carta de destinatario ni tabla «Información detallada».'}
                {estadoActual === 'inicial' && '📄 Word (informe): … circunstancias, inspección, causa; luego análisis de cobertura, reserva, salvamentos, recobro y observaciones (acta).'}
                {estadoActual === 'actualizacion' && '📄 Word incluirá: acta + informe con bloque de actualización del caso.'}
                {estadoActual === 'informeFinal' && '📄 Word incluirá: acta + informe completo con conclusiones, liquidación, indemnización, salvamentos y panorama de riesgos.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={generarDocumento}
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed"
            >
              <span className="mr-2">📄</span>
              {cargando ? 'Generando...' : 'Generar Word'}
            </button>

            <button
              onClick={handleGuardarFormulario}
              disabled={cargando}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed"
            >
              <span className="mr-2">💾</span>
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>

            <button
              onClick={() => {
                console.log('🧪 Probando guardado...');
                console.log('🔍 TIPOS_FORMULARIOS:', TIPOS_FORMULARIOS);
                console.log('🔍 formData:', formData);
                console.log('🔍 estadoActual:', estadoActual);
                console.log('🔍 historialService:', historialService);
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <span className="mr-2">🧪</span>
              Probar Guardado
            </button>

            <button
              onClick={() => navigate('/historial')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <span className="mr-2">📚</span>
              Historial
            </button>

            <button
              onClick={abrirMenuSiguienteFormulario}
              disabled={cargando}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed"
            >
              <span className="mr-2">➡️</span>
              Siguiente Paso
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      <ModalConfirmacion
        isOpen={modalConfirmacion.isOpen}
        onClose={cerrarModalConfirmacion}
        titulo={modalConfirmacion.titulo}
        mensaje={modalConfirmacion.mensaje}
        tipo={modalConfirmacion.tipo}
        botonTexto={modalConfirmacion.botonTexto}
        mostrarCancelar={modalConfirmacion.mostrarCancelar}
        onConfirmar={modalConfirmacion.onConfirmar}
      />
    </div>
  );
}