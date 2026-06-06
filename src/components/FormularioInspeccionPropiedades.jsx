import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  VerticalAlign,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  Header,
  Footer,
  PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import { BASE_URL, PROD_URL, getUploadsUrlCandidates } from '../config/apiConfig';
import { getImageUrl, createImageErrorHandler } from '../utils/imageUtils';
import { FaCamera, FaUpload, FaTrash, FaPlus, FaEye } from 'react-icons/fa';
import ChatbotIA from './SubcomponenteFormularioAjuste/ChatbotIA';
import BotonesHistorial from './BotonesHistorial';
import historialService, { TIPOS_FORMULARIOS, ESTADOS_FORMULARIO } from '../services/historialService';
import { ImageCompression } from '../utils/imageCompression';
import { obtenerFechaHoraActualISO } from '../utils/fechaUtils';
import ModalConfirmacion from './ModalConfirmacion';
import Logo from '../img/Logo.png';

export default function FormularioInspeccionPropiedades() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // 🔑 Inicializar formularioId con id de URL (o null si no existe o es 'nuevo')
  const [formularioId, setFormularioId] = useState(id && id !== 'nuevo' ? id : null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para modal de confirmación
  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    titulo: '',
    mensaje: '',
    tipo: 'success',
    botonTexto: 'Aceptar',
    mostrarCancelar: false,
    onConfirmar: null
  });

  // Estado principal del formulario
  const [formData, setFormData] = useState({
    // Información General del Inmueble
    claseInmueble: '',
    tipoInmueble: '',
    direccion: '',
    nombreInmueble: '',
    localizacion: '',
    ciudad: '',
    departamento: '',
    destinacion: '',
    
    // Información Jurídica
    tipoDocumento: '',
    numeroDocumento: '',
    fechaDocumento: '',
    notaria: '',
    
    // Información Física
    acueducto: 'si',
    alcantarillado: 'si',
    energia: 'si',
    gas: 'si',
    otrosServicios: '',
    
    // Inspección Métrica
    inspeccionMetrica: '',
    
    // Conclusiones
    conclusiones: '',
    observacionesPrincipales: '',
    
    // Inspector
    inspector2: 'ladys',
    
    // Número de alcobas
    numAlcobas: 0,
  });

  // Estado para items dinámicos de cada área
  const [areasData, setAreasData] = useState({
    cocina: [],
    ropas: [],
    sala: [],
    banioSocial: [],
    banoPrincipal: [],
    alcobas: {}, // {1: [], 2: [], ...}
  });

  // Estado para fotos de cada área (similar a InspeccionFotograficaAjuste)
  const [fotosAreas, setFotosAreas] = useState({
    cocina: [],
    ropas: [],
    sala: [],
    banioSocial: [],
    banoPrincipal: [],
    alcobas: {}, // {1: [], 2: [], ...}
  });

  // Normalizar estructuras para evitar crashes cuando falten claves (ej. alcobas)
  const normalizarAreasData = (data) => ({
    cocina: Array.isArray(data?.cocina) ? data.cocina : [],
    ropas: Array.isArray(data?.ropas) ? data.ropas : [],
    sala: Array.isArray(data?.sala) ? data.sala : [],
    banioSocial: Array.isArray(data?.banioSocial) ? data.banioSocial : [],
    banoPrincipal: Array.isArray(data?.banoPrincipal) ? data.banoPrincipal : [],
    alcobas: (data?.alcobas && typeof data.alcobas === 'object' && !Array.isArray(data.alcobas)) ? data.alcobas : {},
  });

  const normalizarFotosAreas = (data) => ({
    cocina: Array.isArray(data?.cocina) ? data.cocina : [],
    ropas: Array.isArray(data?.ropas) ? data.ropas : [],
    sala: Array.isArray(data?.sala) ? data.sala : [],
    banioSocial: Array.isArray(data?.banioSocial) ? data.banioSocial : [],
    banoPrincipal: Array.isArray(data?.banoPrincipal) ? data.banoPrincipal : [],
    alcobas: (data?.alcobas && typeof data.alcobas === 'object' && !Array.isArray(data.alcobas)) ? data.alcobas : {},
  });

  // Ref para debounce de guardado automático
  const autoSaveTimeoutRef = useRef(null);
  const lastSavedDataRef = useRef(null);

  // Cargar datos desde localStorage al iniciar (solo si no hay ID)
  useEffect(() => {
    const cargarDatos = async () => {
      if (!id || id === 'nuevo') {
        const datosGuardados = localStorage.getItem('formularioPropiedades');
        if (datosGuardados) {
          try {
            const datosParseados = JSON.parse(datosGuardados);
            if (datosParseados && typeof datosParseados === 'object') {
              if (datosParseados.formData) {
                setFormData(prev => ({ ...prev, ...datosParseados.formData }));
              }
              if (datosParseados.areasData) {
                setAreasData(normalizarAreasData({ ...areasData, ...datosParseados.areasData }));
              }
              if (datosParseados.fotosAreas) {
                // Procesar fotos desde localStorage (convertir base64 a objetos utilizables)
                const fotosProcesadas = await procesarFotosDesdeLocalStorage(datosParseados.fotosAreas);
                setFotosAreas(normalizarFotosAreas(fotosProcesadas));
              }
              console.log('✅ Datos de formulario de propiedades cargados desde localStorage');
            }
          } catch (error) {
            console.error('Error al cargar datos guardados:', error);
            localStorage.removeItem('formularioPropiedades');
          }
        }
      }
    };
    
    cargarDatos();
  }, [id]);

  // Guardar datos automáticamente cuando cambien (con debounce para evitar guardados excesivos)
  // Solo se guarda si estamos en la ruta del formulario de propiedades
  useEffect(() => {
    const esRutaPropiedades = location.pathname.includes('/propiedades') || location.pathname.includes('/inspeccion-propiedades');
    if (!esRutaPropiedades) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Procesar fotos a base64 antes de guardar en localStorage
        const fotosParaGuardar = await procesarFotosParaLocalStorage();
        
        const datosParaGuardar = JSON.stringify({
          formData,
          areasData,
          fotosAreas: fotosParaGuardar
        });
        localStorage.setItem('formularioPropiedades', datosParaGuardar);
        console.log('💾 Datos de formulario de propiedades guardados en localStorage');
      } catch (error) {
        console.error('Error al guardar datos:', error);
        try {
          localStorage.removeItem('formularioPropiedades');
          // Intentar guardar sin fotos si hay error
          const datosSinFotos = JSON.stringify({
            formData,
            areasData,
            fotosAreas: {}
          });
          localStorage.setItem('formularioPropiedades', datosSinFotos);
        } catch (e) {
          console.error('Error crítico al guardar:', e);
        }
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, areasData, fotosAreas, location.pathname]);

  // Guardar datos antes de refrescar la página (solo si estamos en el formulario)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const esRutaPropiedades = window.location.pathname.includes('/propiedades') || window.location.pathname.includes('/inspeccion-propiedades');
      if (esRutaPropiedades) {
        try {
          // Procesar fotos a base64 antes de guardar
          const fotosParaGuardar = await procesarFotosParaLocalStorage();
          localStorage.setItem('formularioPropiedades', JSON.stringify({
            formData,
            areasData,
            fotosAreas: fotosParaGuardar
          }));
        } catch (error) {
          console.error('Error al guardar antes de salir:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, areasData, fotosAreas]);

  // Limpiar localStorage cuando salgamos de la ruta del formulario
  useEffect(() => {
    const esRutaPropiedades = location.pathname.includes('/propiedades') || location.pathname.includes('/inspeccion-propiedades');
    if (!esRutaPropiedades) {
      console.log('🧹 Limpiando datos de localStorage al salir del formulario de propiedades');
      localStorage.removeItem('formularioPropiedades');
    }

    return () => {
      setTimeout(() => {
        const sigueEnRutaPropiedades = window.location.pathname.includes('/propiedades') || window.location.pathname.includes('/inspeccion-propiedades');
        if (!sigueEnRutaPropiedades) {
          console.log('🧹 Limpiando datos de localStorage (componente desmontado)');
          localStorage.removeItem('formularioPropiedades');
        }
      }, 100);
    };
  }, [location.pathname]);

  // Campos base para cada área
  const camposBase = {
    cocina: [
      { name: 'Muros', key: 'muros' },
      { name: 'Pintura y/o estuco', key: 'pintura' },
      { name: 'Pisos', key: 'pisos' },
      { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
      { name: 'Mesones', key: 'mesones' },
      { name: 'Aparatos de cocina y zona de ropas', key: 'aparatos' },
      { name: 'Aparatos eléctricos', key: 'aparatosElectricos' },
      { name: 'Salidas hidráulicas y de gas', key: 'salidasHidraulicas' },
      { name: 'Salidas eléctricas', key: 'salidasElectricas' },
      { name: 'Aseo', key: 'aseo' },
      { name: 'Carpintería de madera', key: 'carpinteria' },
    ],
    ropas: [
      { name: 'Muros', key: 'muros' },
      { name: 'Pintura y/o estuco', key: 'pintura' },
      { name: 'Pisos', key: 'pisos' },
      { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
      { name: 'Aparatos eléctricos', key: 'aparatosElectricos' },
      { name: 'Salidas hidráulicas y de gas', key: 'salidasHidraulicas' },
      { name: 'Salidas eléctricas', key: 'salidasElectricas' },
      { name: 'Aseo', key: 'aseo' },
      { name: 'Carpintería de madera', key: 'carpinteria' },
    ],
    sala: [
      { name: 'Muros', key: 'muros' },
      { name: 'Pintura y/o estuco', key: 'pintura' },
      { name: 'Pisos', key: 'pisos' },
      { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
      { name: 'Kit de AA', key: 'kitAA' },
      { name: 'Carpintería metálica', key: 'carpinteriaMetalica' },
      { name: 'Salidas eléctricas', key: 'salidasElectricas' },
      { name: 'Aseo', key: 'aseo' },
    ],
    banioSocial: [
      { name: 'Muros', key: 'muros' },
      { name: 'Pintura y/o estuco', key: 'pintura' },
      { name: 'Pisos', key: 'pisos' },
      { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
      { name: 'Enchapes', key: 'enchapes' },
      { name: 'Salidas hidráulicas y de gas', key: 'salidasHidraulicas' },
      { name: 'Salidas eléctricas', key: 'salidasElectricas' },
      { name: 'Aseo', key: 'aseo' },
      { name: 'Incrustaciones', key: 'incrustaciones' },
      { name: 'Carpintería de madera', key: 'carpinteria' },
    ],
    banoPrincipal: [
      { name: 'Muros', key: 'muros' },
      { name: 'Pintura y/o estuco', key: 'pintura' },
      { name: 'Pisos', key: 'pisos' },
      { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
      { name: 'Salidas hidráulicas y de gas', key: 'salidasHidraulicas' },
      { name: 'Salidas eléctricas', key: 'salidasElectricas' },
      { name: 'Aseo', key: 'aseo' },
      { name: 'Incrustaciones', key: 'incrustaciones' },
      { name: 'Carpintería de madera', key: 'carpinteria' },
    ],
    alcoba: [
      { name: 'Muros', key: 'muros' },
      { name: 'Pintura y/o estuco', key: 'pintura' },
      { name: 'Pisos', key: 'pisos' },
      { name: 'Enchapes', key: 'enchapes' },
      { name: 'Salidas eléctricas', key: 'salidasElectricas' },
      { name: 'Aseo', key: 'aseo' },
      { name: 'Carpintería de madera', key: 'carpinteria' },
    ],
  };

  // Función auxiliar para capitalizar
  const capitalizeFirstLetter = (str) => {
    if (!str || typeof str !== "string") return str || "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Función para formatear Cumple
  const formatearCumple = (valor) => {
    if (valor && valor.toLowerCase() === "si") return "✔";
    if (valor && valor.toLowerCase() === "no") return "✘";
    return valor || "";
  };

  // Función para manejar cambios en el formulario
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Guardado automático con debounce
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      guardarAutomatico();
    }, 2000); // Guardar después de 2 segundos de inactividad
  };

  // Función para agregar item a un área
  const agregarItem = (area, alcobaNum = null) => {
    const nuevoItem = {
      id: Date.now() + Math.random(),
      parametro: '',
      cumple: '',
      sintoma: '',
      observacion: '',
    };
    
    if (alcobaNum) {
      setAreasData(prev => ({
        ...prev,
        alcobas: {
          ...(prev.alcobas || {}),
          [alcobaNum]: [...(prev.alcobas?.[alcobaNum] || []), nuevoItem]
        }
      }));
    } else {
      setAreasData(prev => ({
        ...prev,
        [area]: [...(prev[area] || []), nuevoItem]
      }));
    }
    
    // Guardar automáticamente
    guardarAutomatico();
  };

  // Función para eliminar item de un área
  const eliminarItem = (area, itemId, alcobaNum = null) => {
    if (alcobaNum) {
      setAreasData(prev => ({
        ...prev,
        alcobas: {
          ...(prev.alcobas || {}),
          [alcobaNum]: (prev.alcobas?.[alcobaNum] || []).filter(item => item.id !== itemId)
        }
      }));
    } else {
      setAreasData(prev => ({
        ...prev,
        [area]: (prev[area] || []).filter(item => item.id !== itemId)
      }));
    }
    
    guardarAutomatico();
  };

  // Función para actualizar item de un área
  const actualizarItem = (area, itemId, campo, valor, alcobaNum = null) => {
    if (alcobaNum) {
      setAreasData(prev => ({
        ...prev,
        alcobas: {
          ...(prev.alcobas || {}),
          [alcobaNum]: (prev.alcobas?.[alcobaNum] || []).map(item =>
            item.id === itemId ? { ...item, [campo]: valor } : item
          )
        }
      }));
    } else {
      setAreasData(prev => ({
        ...prev,
        [area]: (prev[area] || []).map(item =>
          item.id === itemId ? { ...item, [campo]: valor } : item
        )
      }));
    }
    
    guardarAutomatico();
  };

  // Función para manejar carga de fotos (similar a InspeccionFotograficaAjuste)
  const handleFileUpload = async (area, files, alcobaNum = null) => {
    if (!files || files.length === 0) return;
    
    setCargando(true);
    
    try {
      const filesArray = Array.from(files);
      const imagenesComprimidas = await ImageCompression.compressImages(filesArray, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        maxSizeKB: 500
      });
      
      const nuevasImagenes = imagenesComprimidas.map(file => ({
        id: Date.now() + Math.random(),
        nombre: file.name,
        archivo: file,
        url: URL.createObjectURL(file),
        descripcion: ''
      }));
      
      if (alcobaNum) {
        setFotosAreas(prev => ({
          ...prev,
          alcobas: {
            ...(prev.alcobas || {}),
            [alcobaNum]: [...(prev.alcobas?.[alcobaNum] || []), ...nuevasImagenes]
          }
        }));
      } else {
        setFotosAreas(prev => ({
          ...prev,
          [area]: [...(prev[area] || []), ...nuevasImagenes]
        }));
      }
      
      guardarAutomatico();
    } catch (error) {
      console.error('Error procesando imágenes:', error);
      alert('Error al procesar las imágenes');
    } finally {
      setCargando(false);
    }
  };

  // Función para eliminar foto
  const eliminarFoto = (area, fotoId, alcobaNum = null) => {
    if (alcobaNum) {
      setFotosAreas(prev => {
        const fotosPrevias = (prev.alcobas?.[alcobaNum] || []);
        const fotoAEliminar = fotosPrevias.find(foto => foto.id === fotoId);
        if (fotoAEliminar?.url && typeof fotoAEliminar.url === 'string' && fotoAEliminar.url.startsWith('blob:')) {
          URL.revokeObjectURL(fotoAEliminar.url);
        }

        return {
          ...prev,
          alcobas: {
            ...prev.alcobas,
            [alcobaNum]: fotosPrevias.filter(foto => foto.id !== fotoId)
          }
        };
      });
    } else {
      setFotosAreas(prev => {
        const fotosPrevias = (prev?.[area] || []);
        const fotoAEliminar = fotosPrevias.find(foto => foto.id === fotoId);
        if (fotoAEliminar?.url && typeof fotoAEliminar.url === 'string' && fotoAEliminar.url.startsWith('blob:')) {
          URL.revokeObjectURL(fotoAEliminar.url);
        }

        return {
          ...prev,
          [area]: fotosPrevias.filter(foto => foto.id !== fotoId)
        };
      });
    }
    
    guardarAutomatico();
  };

  // Función para actualizar descripción de foto
  const actualizarDescripcionFoto = (area, fotoId, descripcion, alcobaNum = null) => {
    if (alcobaNum) {
      setFotosAreas(prev => ({
        ...prev,
        alcobas: {
          ...(prev.alcobas || {}),
          [alcobaNum]: (prev.alcobas?.[alcobaNum] || []).map(foto =>
            foto.id === fotoId ? { ...foto, descripcion } : foto
          )
        }
      }));
    } else {
      setFotosAreas(prev => ({
        ...prev,
        [area]: (prev[area] || []).map(foto =>
          foto.id === fotoId ? { ...foto, descripcion } : foto
        )
      }));
    }
    
    guardarAutomatico();
  };

  // Función para generar alcobas
  const generateBedrooms = () => {
    const num = parseInt(formData.numAlcobas) || 0;
    for (let i = 1; i <= num; i++) {
      if (!areasData?.alcobas?.[i]) {
        setAreasData(prev => ({
          ...prev,
          alcobas: {
            ...(prev.alcobas || {}),
            [i]: []
          }
        }));
      }
      if (!fotosAreas?.alcobas?.[i]) {
        setFotosAreas(prev => ({
          ...prev,
          alcobas: {
            ...(prev.alcobas || {}),
            [i]: []
          }
        }));
      }
    }
    guardarAutomatico();
  };

  // Función para guardado automático
  const guardarAutomatico = async () => {
    if (!formularioId || formularioId === 'nuevo') return; // Solo guardar si ya existe un ID
    
    const datosActuales = {
      formData,
      areasData,
      fotosAreas,
    };
    
    const datosString = JSON.stringify(datosActuales);
    if (lastSavedDataRef.current === datosString) return; // No guardar si no hay cambios
    
    lastSavedDataRef.current = datosString;
    
    try {
      const nombreCliente = formData.nombreInmueble ? capitalizeFirstLetter(formData.nombreInmueble) : "Sin Nombre";
      
      // Procesar fotos antes de guardar (solo las nuevas, mantener las existentes)
      const fotosProcesadas = await procesarFotosParaGuardar();
      
      const datosFormulario = {
        tipo: TIPOS_FORMULARIOS.INSPECCION_PROPIEDADES,
        titulo: `Inspección de Propiedades - ${nombreCliente}`,
        datos: {
          formData: { ...formData }, // Estructura consistente
          areasData: { ...areasData },
          fotosAreas: fotosProcesadas,
        },
        fechaModificacion: obtenerFechaHoraActualISO(),
      };
      
      await historialService.actualizarFormulario(formularioId, datosFormulario);
      console.log('✅ Guardado automático exitoso');
    } catch (error) {
      console.error('Error en guardado automático:', error);
    }
  };

  // Función para mostrar modal de confirmación
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

  // Cargar formulario existente si hay ID y sincronizar formularioId con URL
  useEffect(() => {
    if (id && id !== 'nuevo') {
      // 🔑 Sincronizar formularioId con el id de la URL
      console.log('🔑 Sincronizando formularioId con URL. ID anterior:', formularioId, 'ID nuevo:', id);
      if (formularioId !== id) {
        setFormularioId(id);
      }
      cargarFormularioExistente();
    } else if (id === 'nuevo' && formularioId) {
      // Si la URL cambió a 'nuevo' pero tenemos un formularioId, limpiar estado
      console.log('🔄 URL cambió a "nuevo", limpiando formularioId');
      setFormularioId(null);
    }
  }, [id]);

  const cargarFormularioExistente = async () => {
    try {
      setCargando(true);
      const formulario = await historialService.obtenerFormulario(id);
      
      if (formulario && formulario.datos) {
        const datos = formulario.datos;
        
        // Manejar estructura nueva (con formData separado) y antigua (datos directos)
        if (datos.formData) {
          // Estructura nueva: datos.formData, datos.areasData, datos.fotosAreas
          setFormData(datos.formData);
          
          if (datos.areasData) {
            setAreasData(normalizarAreasData(datos.areasData));
          }
          
          if (datos.fotosAreas) {
            console.log('📸 Cargando fotos desde historial...');
            console.log('📸 Estructura de fotosAreas:', datos.fotosAreas);
            console.log('📸 Tipo de fotosAreas:', typeof datos.fotosAreas);
            console.log('📸 Es array?:', Array.isArray(datos.fotosAreas));
            
            // Procesar fotos desde servidor
            const fotosProcesadas = {};
            for (const [area, fotos] of Object.entries(datos.fotosAreas)) {
              if (!fotos) continue; // Saltar si no hay fotos
              
              console.log(`📸 Área: ${area}, Tipo: ${typeof fotos}, Es array?: ${Array.isArray(fotos)}`);
              if (Array.isArray(fotos) && fotos.length > 0) {
                console.log(`📸 Primer elemento del array de ${area}:`, fotos[0]);
                console.log(`📸 Tipo del primer elemento:`, typeof fotos[0]);
                console.log(`📸 Es array el primer elemento?:`, Array.isArray(fotos[0]));
                if (fotos[0]) {
                  console.log(`📸 Keys del primer elemento:`, Object.keys(fotos[0]));
                  console.log(`📸 Contenido completo del primer elemento:`, JSON.stringify(fotos[0], null, 2));
                }
              }
              
              if (area === 'alcobas') {
                fotosProcesadas.alcobas = {};
                for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
                  if (fotosAlcoba && Array.isArray(fotosAlcoba) && fotosAlcoba.length > 0) {
                    console.log(`📸 Procesando ${fotosAlcoba.length} fotos para alcoba ${alcobaNum}`);
                  fotosProcesadas.alcobas[alcobaNum] = await procesarFotosDesdeServidor(fotosAlcoba);
                    console.log(`📸 Fotos procesadas para alcoba ${alcobaNum}:`, fotosProcesadas.alcobas[alcobaNum].length);
                  }
                }
              } else {
                if (Array.isArray(fotos) && fotos.length > 0) {
                  console.log(`📸 Procesando ${fotos.length} fotos para área ${area}`);
                fotosProcesadas[area] = await procesarFotosDesdeServidor(fotos);
                  console.log(`📸 Fotos procesadas para área ${area}:`, fotosProcesadas[area].length);
              }
            }
            }
            console.log('📸 Total fotos procesadas:', fotosProcesadas);
            setFotosAreas(normalizarFotosAreas(fotosProcesadas));
          } else {
            console.log('⚠️ No se encontraron fotosAreas en los datos del historial');
          }
        } else {
          // Estructura antigua: datos directos (compatibilidad hacia atrás)
          // Extraer formData de los datos directos
          const { areasData: areasDataGuardado, fotosAreas: fotosAreasGuardado, ...formDataDirecto } = datos;
          
          setFormData(formDataDirecto);
          
          if (areasDataGuardado) {
            setAreasData(normalizarAreasData(areasDataGuardado));
          }
          
          if (fotosAreasGuardado) {
            console.log('📸 Cargando fotos desde historial (estructura antigua)...');
            console.log('📸 Estructura de fotosAreas:', fotosAreasGuardado);
            // Procesar fotos desde servidor
            const fotosProcesadas = {};
            for (const [area, fotos] of Object.entries(fotosAreasGuardado)) {
              if (!fotos) continue; // Saltar si no hay fotos
              
              if (area === 'alcobas') {
                fotosProcesadas.alcobas = {};
                for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
                  if (fotosAlcoba && Array.isArray(fotosAlcoba) && fotosAlcoba.length > 0) {
                    console.log(`📸 Procesando ${fotosAlcoba.length} fotos para alcoba ${alcobaNum}`);
                  fotosProcesadas.alcobas[alcobaNum] = await procesarFotosDesdeServidor(fotosAlcoba);
                    console.log(`📸 Fotos procesadas para alcoba ${alcobaNum}:`, fotosProcesadas.alcobas[alcobaNum].length);
                  }
                }
              } else {
                if (Array.isArray(fotos) && fotos.length > 0) {
                  console.log(`📸 Procesando ${fotos.length} fotos para área ${area}`);
                fotosProcesadas[area] = await procesarFotosDesdeServidor(fotos);
                  console.log(`📸 Fotos procesadas para área ${area}:`, fotosProcesadas[area].length);
              }
            }
            }
            console.log('📸 Total fotos procesadas (estructura antigua):', fotosProcesadas);
            setFotosAreas(normalizarFotosAreas(fotosProcesadas));
          } else {
            console.log('⚠️ No se encontraron fotosAreas en los datos del historial (estructura antigua)');
          }
        }
      }
    } catch (error) {
      console.error('Error cargando formulario:', error);
      setError('Error al cargar el formulario: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Función para procesar fotos desde servidor
  const procesarFotosDesdeServidor = async (fotos) => {
    if (!fotos || !Array.isArray(fotos)) {
      console.log('⚠️ procesarFotosDesdeServidor: No hay fotos o no es un array');
      return [];
    }
    
    console.log(`📸 procesarFotosDesdeServidor: Procesando ${fotos.length} fotos`);

    // Reusar helper global para /uploads (DEV -> PROD fallback)
    const getImageUrlCandidates = (rutaOrUrl) => getUploadsUrlCandidates(rutaOrUrl);
    
    return await Promise.all(
      fotos.map(async (foto, index) => {
        // Log detallado de la estructura de la foto
        console.log(`📸 Procesando foto ${index + 1}:`, {
          tieneBase64: !!foto.base64,
          tieneRuta: !!foto.ruta,
          tieneUrl: !!foto.url,
          tieneArchivo: !!(foto.archivo),
          estructura: Object.keys(foto),
          fotoCompleta: foto // Mostrar la foto completa para debug
        });
        
        // Si la foto es un string (base64 directo), convertirla a objeto
        if (typeof foto === 'string') {
          console.log(`📸 Foto ${index + 1} es un string, convirtiendo a objeto...`);
          return {
            id: Date.now() + Math.random(),
            nombre: 'Imagen',
            base64: foto.startsWith('data:') ? foto : `data:image/jpeg;base64,${foto}`,
            descripcion: '',
            url: foto.startsWith('data:') ? foto : `data:image/jpeg;base64,${foto}`,
          };
        }
        
        // Si la foto es un array (estructura incorrecta), intentar extraer datos
        if (Array.isArray(foto)) {
          console.log(`📸 Foto ${index + 1} es un array, intentando extraer datos...`, foto);
          // Si el array tiene elementos, usar el primero
          if (foto.length > 0 && typeof foto[0] === 'string') {
            const base64 = foto[0].startsWith('data:') ? foto[0] : `data:image/jpeg;base64,${foto[0]}`;
            return {
              id: Date.now() + Math.random(),
              nombre: 'Imagen',
              base64: base64,
              descripcion: foto[1] || '',
              url: base64,
            };
          }
          // Si no, retornar estructura mínima
          return {
            id: Date.now() + Math.random(),
            nombre: 'Imagen',
            descripcion: '',
          };
        }
        
        // Si tiene base64 (con o sin prefijo data:)
        if (foto.base64) {
          const base64 = foto.base64.startsWith('data:') 
            ? foto.base64 
            : `data:image/jpeg;base64,${foto.base64}`;
          
          console.log(`✅ Foto ${index + 1}: Usando base64`);
          return {
            id: foto.id || Date.now() + Math.random(),
            nombre: foto.nombre || 'Imagen',
            base64: base64,
            descripcion: foto.descripcion || '',
            url: base64, // Usar base64 como URL para preview
          };
        }
        
        // Si tiene ruta del servidor, cargar desde ahí
        if (foto.ruta && !foto.ruta.startsWith('data:')) {
          try {
            const candidatos = getImageUrlCandidates(foto.ruta);
            let ultimoStatus = null;

            for (const imagenUrl of candidatos) {
              // eslint-disable-next-line no-await-in-loop
              const response = await fetch(imagenUrl);
              ultimoStatus = response?.status;
              if (!response.ok) continue;

              const blob = await response.blob();
              if (!blob || blob.size === 0) continue;

              const url = URL.createObjectURL(blob);
              console.log(`✅ Foto ${index + 1}: Cargada desde servidor`, imagenUrl);
              return {
                id: foto.id || Date.now() + Math.random(),
                nombre: foto.nombre || 'Imagen',
                url,
                ruta: foto.ruta,
                descripcion: foto.descripcion || '',
              };
            }

            console.error(`❌ Foto ${index + 1}: Error al cargar desde servidor`, {
              ruta: foto.ruta,
              status: ultimoStatus,
              candidatos
            });
          } catch (error) {
            console.error(`❌ Foto ${index + 1}: Error cargando foto:`, error);
          }
        }
        
        // Si tiene url pero no ruta ni base64, mantenerla
        if (foto.url && !foto.url.startsWith('blob:')) {
          console.log(`✅ Foto ${index + 1}: Usando URL existente`);
          return {
            id: foto.id || Date.now() + Math.random(),
            nombre: foto.nombre || 'Imagen',
            url: foto.url,
            ruta: foto.ruta,
            descripcion: foto.descripcion || '',
          };
        }
        
        // Si tiene url blob, mantenerla
        if (foto.url && foto.url.startsWith('blob:')) {
          console.log(`✅ Foto ${index + 1}: Usando URL blob`);
          return {
            id: foto.id || Date.now() + Math.random(),
            nombre: foto.nombre || 'Imagen',
            url: foto.url,
            descripcion: foto.descripcion || '',
          };
        }
        
        // Retornar foto tal cual si no se puede procesar
        console.log(`⚠️ Foto ${index + 1}: No se pudo procesar, retornando tal cual`);
        return {
          id: foto.id || Date.now() + Math.random(),
          nombre: foto.nombre || 'Imagen',
          descripcion: foto.descripcion || '',
          ...foto
        };
      })
    );
  };

  // Función para guardar en historial
  const handleGuardarEnHistorial = async () => {
    try {
      setGuardando(true);
      setError(null);
      
      const nombreCliente = formData.nombreInmueble ? capitalizeFirstLetter(formData.nombreInmueble) : "Sin Nombre";
      
      // Procesar fotos antes de guardar
      console.log('📸 Procesando fotos para guardar en historial...');
      console.log('📸 Total fotosAreas antes de procesar:', Object.keys(fotosAreas).length);
      console.log('📸 Estructura de fotosAreas:', fotosAreas);
      
      const fotosProcesadas = await procesarFotosParaGuardar();
      console.log('📸 Fotos procesadas:', fotosProcesadas);
      console.log('📸 Total áreas con fotos procesadas:', Object.keys(fotosProcesadas).length);
      
      // Verificar que las fotos se procesaron correctamente y tienen base64
      let totalFotos = 0;
      let fotosConBase64 = 0;
      let fotosSinBase64 = 0;
      
      for (const [area, fotos] of Object.entries(fotosProcesadas)) {
        if (area === 'alcobas') {
          for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
            const fotosArray = fotosAlcoba || [];
            totalFotos += fotosArray.length;
            fotosArray.forEach(foto => {
              if (foto.base64) fotosConBase64++;
              else fotosSinBase64++;
            });
          }
        } else {
          const fotosArray = fotos || [];
          totalFotos += fotosArray.length;
          fotosArray.forEach(foto => {
            if (foto.base64) fotosConBase64++;
            else fotosSinBase64++;
          });
        }
      }
      
      console.log('📸 Total de fotos procesadas:', totalFotos);
      console.log('📸 Fotos con base64:', fotosConBase64);
      console.log('📸 Fotos sin base64 (solo ruta):', fotosSinBase64);
      
      if (fotosSinBase64 > 0) {
        console.warn('⚠️ Algunas fotos no tienen base64, solo tienen ruta. Esto puede causar problemas al cargar.');
      }
      
      // Estructura consistente para guardar
      const datosFormulario = {
        tipo: TIPOS_FORMULARIOS.INSPECCION_PROPIEDADES,
        titulo: `Inspección de Propiedades - ${nombreCliente}`,
        datos: {
          formData: { ...formData }, // Guardar formData como objeto separado
          areasData: { ...areasData }, // Guardar areasData como objeto separado
          fotosAreas: fotosProcesadas, // Fotos ya procesadas
        },
        fechaCreacion: formularioId && formularioId !== 'nuevo' ? undefined : obtenerFechaHoraActualISO(),
        fechaModificacion: obtenerFechaHoraActualISO(),
        estado: ESTADOS_FORMULARIO.EN_PROCESO,
      };
      
      console.log('💾 Guardando formulario en historial con fotos:', totalFotos, 'fotos');
      console.log('🔑 Estado actual de formularioId:', formularioId);
      console.log('🔑 ID de URL:', id);
      
      let nuevoId;
      if (formularioId && formularioId !== 'nuevo') {
        // 🔄 Actualizar formulario existente (evita duplicados)
        console.log('🔄 ACTUALIZANDO formulario existente con ID:', formularioId);
        await historialService.actualizarFormulario(formularioId, datosFormulario);
        nuevoId = formularioId;
        console.log('✅ Formulario actualizado exitosamente');
      } else {
        // 🆕 Crear nuevo formulario
        console.log('🆕 CREANDO nuevo formulario en historial');
        const resultado = await historialService.guardarFormulario(datosFormulario);
        nuevoId = resultado._id || resultado.id || resultado;
        console.log('✅ Formulario creado con ID:', nuevoId);
        
        // 🔑 Guardar ID y navegar a la URL con el ID para futuras actualizaciones
        setFormularioId(nuevoId);
        console.log('🔑 Navegando a URL con ID para evitar duplicados en futuros guardados');
        navigate(`/formulario-inspeccion-propiedades/editar/${nuevoId}`, { replace: true });
      }
      
      mostrarModalConfirmacion(
        'Formulario Guardado',
        'El formulario se ha guardado correctamente en el historial.',
        'success'
      );
      
      lastSavedDataRef.current = JSON.stringify(datosFormulario);
    } catch (error) {
      console.error('Error guardando:', error);
      setError('Error al guardar: ' + error.message);
      alert('Error al guardar: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  // Función para procesar fotos antes de guardar
  const procesarFotosParaGuardar = async () => {
    const fotosProcesadas = {};
    
    for (const [area, fotos] of Object.entries(fotosAreas)) {
      if (area === 'alcobas') {
        fotosProcesadas.alcobas = {};
        for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
          fotosProcesadas.alcobas[alcobaNum] = await Promise.all(
            (fotosAlcoba || []).map(async (foto) => {
              // Si tiene archivo nuevo (File), convertir a base64
              if (foto.archivo && foto.archivo instanceof File) {
                const base64 = await convertirArchivoABase64(foto.archivo);
                return {
                id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || foto.archivo.name,
                  descripcion: foto.descripcion || '',
                  base64: base64
                };
              }
            // Si ya tiene base64 (con o sin prefijo data:), mantenerlo
            if (foto.base64) {
              const base64 = foto.base64.startsWith('data:') 
                ? foto.base64 
                : `data:image/jpeg;base64,${foto.base64}`;
                return {
                id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                base64: base64
                };
              }
              // Si tiene ruta, mantener solo la ruta (no base64)
              if (foto.ruta) {
                return {
                id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  ruta: foto.ruta
                };
              }
            // Si tiene url blob, convertir a base64
            if (foto.url && foto.url.startsWith('blob:')) {
              try {
                const response = await fetch(foto.url);
                const blob = await response.blob();
                const base64 = await convertirArchivoABase64(blob);
              return {
                  id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  base64: base64
                };
              } catch (error) {
                console.error('Error convirtiendo blob a base64:', error);
                // Si falla, retornar con url para intentar cargar después
                return {
                  id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  url: foto.url
                };
              }
            }
            
            // Si tiene url pero no es blob ni base64, intentar convertir
            if (foto.url && !foto.url.startsWith('blob:') && !foto.url.startsWith('data:')) {
              try {
                const response = await fetch(foto.url);
                const blob = await response.blob();
                const base64 = await convertirArchivoABase64(blob);
                return {
                  id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  base64: base64
                };
              } catch (error) {
                console.error('Error convirtiendo URL a base64:', error);
              }
            }
            
            // Si no tiene nada procesable, retornar mínimo
            return {
              id: foto.id || Date.now() + Math.random(),
                nombre: foto.nombre || 'Imagen',
                descripcion: foto.descripcion || '',
              };
            })
          );
        }
      } else {
        fotosProcesadas[area] = await Promise.all(
          (fotos || []).map(async (foto) => {
            // Si tiene archivo nuevo (File), convertir a base64
            if (foto.archivo && foto.archivo instanceof File) {
              const base64 = await convertirArchivoABase64(foto.archivo);
              return {
                id: foto.id || Date.now() + Math.random(),
                nombre: foto.nombre || foto.archivo.name,
                descripcion: foto.descripcion || '',
                base64: base64
              };
            }
            // Si ya tiene base64 (con o sin prefijo data:), mantenerlo
            if (foto.base64) {
              const base64 = foto.base64.startsWith('data:') 
                ? foto.base64 
                : `data:image/jpeg;base64,${foto.base64}`;
              return {
                id: foto.id || Date.now() + Math.random(),
                nombre: foto.nombre || 'Imagen',
                descripcion: foto.descripcion || '',
                base64: base64
              };
            }
            // Si tiene ruta, mantener solo la ruta (no base64)
            if (foto.ruta) {
              return {
                id: foto.id || Date.now() + Math.random(),
                nombre: foto.nombre || 'Imagen',
                descripcion: foto.descripcion || '',
                ruta: foto.ruta
              };
            }
            // Si tiene url blob, convertir a base64
            if (foto.url && foto.url.startsWith('blob:')) {
              try {
                const response = await fetch(foto.url);
                const blob = await response.blob();
                const base64 = await convertirArchivoABase64(blob);
            return {
                  id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  base64: base64
                };
              } catch (error) {
                console.error('Error convirtiendo blob a base64:', error);
                // Si falla, retornar con url para intentar cargar después
                return {
                  id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  url: foto.url
                };
              }
            }
            
            // Si tiene url pero no es blob ni base64, intentar convertir
            if (foto.url && !foto.url.startsWith('blob:') && !foto.url.startsWith('data:')) {
              try {
                const response = await fetch(foto.url);
                const blob = await response.blob();
                const base64 = await convertirArchivoABase64(blob);
                return {
                  id: foto.id || Date.now() + Math.random(),
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  base64: base64
                };
              } catch (error) {
                console.error('Error convirtiendo URL a base64:', error);
              }
            }
            
            // Si no tiene nada procesable, retornar mínimo
            return {
              id: foto.id || Date.now() + Math.random(),
              nombre: foto.nombre || 'Imagen',
              descripcion: foto.descripcion || '',
            };
          })
        );
      }
    }
    
    return fotosProcesadas;
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

  // Función para procesar fotos para guardar en localStorage (convertir File a base64)
  const procesarFotosParaLocalStorage = async () => {
    const fotosProcesadas = {};
    
    for (const [area, fotos] of Object.entries(fotosAreas)) {
      if (area === 'alcobas') {
        fotosProcesadas.alcobas = {};
        for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
          fotosProcesadas.alcobas[alcobaNum] = await Promise.all(
            (fotosAlcoba || []).map(async (foto) => {
              // Si tiene archivo nuevo (File), convertir a base64
              if (foto.archivo && foto.archivo instanceof File) {
                const base64 = await convertirArchivoABase64(foto.archivo);
                return {
                  id: foto.id,
                  nombre: foto.nombre || foto.archivo.name,
                  descripcion: foto.descripcion || '',
                  base64: base64
                };
              }
              // Si ya tiene base64, mantenerlo
              if (foto.base64) {
                return {
                  id: foto.id,
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  base64: foto.base64
                };
              }
              // Si tiene url pero no base64, intentar convertir
              if (foto.url && foto.url.startsWith('blob:')) {
                try {
                  const response = await fetch(foto.url);
                  const blob = await response.blob();
                  const base64 = await convertirArchivoABase64(blob);
                  return {
                    id: foto.id,
                    nombre: foto.nombre || 'Imagen',
                    descripcion: foto.descripcion || '',
                    base64: base64
                  };
                } catch (error) {
                  console.error('Error convirtiendo blob a base64:', error);
                }
              }
              // Mantener otros datos
              return {
                id: foto.id,
                nombre: foto.nombre || 'Imagen',
                descripcion: foto.descripcion || '',
                url: foto.url,
                ruta: foto.ruta
              };
            })
          );
        }
      } else {
        fotosProcesadas[area] = await Promise.all(
          (fotos || []).map(async (foto) => {
            // Si tiene archivo nuevo (File), convertir a base64
            if (foto.archivo && foto.archivo instanceof File) {
              const base64 = await convertirArchivoABase64(foto.archivo);
              return {
                id: foto.id,
                nombre: foto.nombre || foto.archivo.name,
                descripcion: foto.descripcion || '',
                base64: base64
              };
            }
            // Si ya tiene base64, mantenerlo
            if (foto.base64) {
              return {
                id: foto.id,
                nombre: foto.nombre || 'Imagen',
                descripcion: foto.descripcion || '',
                base64: foto.base64
              };
            }
            // Si tiene url pero no base64, intentar convertir
            if (foto.url && foto.url.startsWith('blob:')) {
              try {
                const response = await fetch(foto.url);
                const blob = await response.blob();
                const base64 = await convertirArchivoABase64(blob);
                return {
                  id: foto.id,
                  nombre: foto.nombre || 'Imagen',
                  descripcion: foto.descripcion || '',
                  base64: base64
                };
              } catch (error) {
                console.error('Error convirtiendo blob a base64:', error);
              }
            }
            // Mantener otros datos
            return {
              id: foto.id,
              nombre: foto.nombre || 'Imagen',
              descripcion: foto.descripcion || '',
              url: foto.url,
              ruta: foto.ruta
            };
          })
        );
      }
    }
    
    return fotosProcesadas;
  };

  // Función para procesar fotos desde localStorage (convertir base64 a objetos utilizables)
  const procesarFotosDesdeLocalStorage = async (fotosGuardadas) => {
    const fotosProcesadas = {};
    
    for (const [area, fotos] of Object.entries(fotosGuardadas)) {
      if (area === 'alcobas') {
        fotosProcesadas.alcobas = {};
        for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
          fotosProcesadas.alcobas[alcobaNum] = (fotosAlcoba || []).map((foto) => {
            // Si tiene base64, crear URL para preview
            if (foto.base64) {
              return {
                id: foto.id || Date.now() + Math.random(),
                nombre: foto.nombre || 'Imagen',
                descripcion: foto.descripcion || '',
                base64: foto.base64,
                url: foto.base64 // Usar base64 como URL para preview
              };
            }
            // Mantener otros datos
            return {
              id: foto.id || Date.now() + Math.random(),
              nombre: foto.nombre || 'Imagen',
              descripcion: foto.descripcion || '',
              url: foto.url,
              ruta: foto.ruta
            };
          });
        }
      } else {
        fotosProcesadas[area] = (fotos || []).map((foto) => {
          // Si tiene base64, crear URL para preview
          if (foto.base64) {
            return {
              id: foto.id || Date.now() + Math.random(),
              nombre: foto.nombre || 'Imagen',
              descripcion: foto.descripcion || '',
              base64: foto.base64,
              url: foto.base64 // Usar base64 como URL para preview
            };
          }
          // Mantener otros datos
          return {
            id: foto.id || Date.now() + Math.random(),
            nombre: foto.nombre || 'Imagen',
            descripcion: foto.descripcion || '',
            url: foto.url,
            ruta: foto.ruta
          };
        });
      }
    }
    
    return fotosProcesadas;
  };

  // Función para convertir base64 a ArrayBuffer
  const base64ToArrayBuffer = (base64) => {
    // Acepta dataURL ("data:image/...;base64,AAAA") o base64 "puro"
    const base64Data = (typeof base64 === 'string' && base64.includes(','))
      ? base64.split(',')[1]
      : base64;
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Base64 inválido para conversión');
    }
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Función para generar documento Word completo
  const generarDocumentoWord = async () => {
    try {
      setCargando(true);
      
      const nombreCliente = formData.nombreInmueble ? capitalizeFirstLetter(formData.nombreInmueble) : "Sin Nombre";
      const nombreClienteMayusculas = nombreCliente.toUpperCase();
      const today = new Date();
      const formattedDate = today.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      const docContent = [];

      // Obtener nombre del inspector (para usar en la firma)
      const nombreInspector = formData.inspector2 === "ladys" ? "LADYS ESCALANTE BOSSIO" :
                              formData.inspector2 === "maria" ? "MARÍA GARCÍA MANJARRES" :
                              formData.inspector2 === "mario" ? "MARIO PINILLA DE LA TORRE" :
                              "INSPECTOR";

      // Cargar logo
      const logoResponse = await fetch(Logo);
      const logoBuffer = logoResponse.ok ? await logoResponse.arrayBuffer() : null;

      // Encabezado personalizado según diseño
      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              // Celda izquierda: Logo en fondo blanco
              new TableCell({
                rowSpan: 2,
                width: { size: 35, type: WidthType.PERCENTAGE },
                shading: { fill: "FFFFFF" }, // Fondo blanco
                children: [
                  new Paragraph({
                    children: logoBuffer ? [
                      new ImageRun({
                        data: logoBuffer,
                        transformation: {
                          width: 150,
                          height: 80,
                        },
                      }),
                    ] : [
                      new TextRun({ text: "PROSER RIESGOS SAS", bold: true, size: 18 }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                verticalAlign: VerticalAlign.CENTER,
              }),
              // Celda derecha superior: INSPECCIÓN + Nombre Inspector
              new TableCell({
                columnSpan: 3,
                width: { size: 65, type: WidthType.PERCENTAGE },
                shading: { fill: "404040" }, // Fondo gris oscuro
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "INSPECCIÓN",
                        bold: true,
                        size: 24,
                        color: "E0E0E0", // Texto gris claro
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 100 },
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: nombreClienteMayusculas,
                        size: 20,
                        color: "E0E0E0", // Texto gris claro
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
                verticalAlign: VerticalAlign.CENTER,
              }),
            ],
          }),
          new TableRow({
            children: [
              // Tres celdas inferiores: INSP. RIESGOS | RIESGOS | DATE
              new TableCell({
                shading: { fill: "404040" }, // Fondo gris oscuro
                width: { size: 21.67, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "INSP. RIESGOS",
                        size: 18,
                        color: "E0E0E0", // Texto gris claro
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                verticalAlign: VerticalAlign.CENTER,
              }),
              new TableCell({
                shading: { fill: "404040" }, // Fondo gris oscuro
                width: { size: 21.67, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "RIESGOS",
                        size: 18,
                        color: "E0E0E0", // Texto gris claro
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                verticalAlign: VerticalAlign.CENTER,
              }),
              new TableCell({
                shading: { fill: "404040" }, // Fondo gris oscuro
                width: { size: 21.67, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `DATE: ${formattedDate}`,
                        size: 18,
                        color: "E0E0E0", // Texto gris claro
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                verticalAlign: VerticalAlign.CENTER,
              }),
            ],
          }),
        ],
      });

      // El headerTable se usa solo en el Header del documento, no en el contenido
      // docContent.push(headerTable); // Removido - solo va en el Header
      docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));

      // Título
      docContent.push(
        new Paragraph({
          text: "Reporte de Inspección de Propiedad",
          heading: HeadingLevel.TITLE,
          spacing: { after: 200 },
        })
      );
      docContent.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      // Información General del Inmueble
      docContent.push(
        new Paragraph({
          text: "Información General del Inmueble",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );

      const infoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Clase de Inmueble")] }),
              new TableCell({ children: [new Paragraph(formData.claseInmueble || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Tipo de Inmueble")] }),
              new TableCell({ children: [new Paragraph(formData.tipoInmueble || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Dirección")] }),
              new TableCell({ children: [new Paragraph(formData.direccion || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Nombre del Cliente")] }),
              new TableCell({ children: [new Paragraph(formData.nombreInmueble || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Localización")] }),
              new TableCell({ children: [new Paragraph(formData.localizacion || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Ciudad")] }),
              new TableCell({ children: [new Paragraph(formData.ciudad || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Departamento")] }),
              new TableCell({ children: [new Paragraph(formData.departamento || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Quien recibe la Visita")] }),
              new TableCell({ children: [new Paragraph(formData.destinacion || "")] }),
            ],
          }),
        ],
      });
      docContent.push(infoTable);
      docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));

      // Información Jurídica
      docContent.push(
        new Paragraph({
          text: "Información Jurídica del Inmueble",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );

      const juridicaTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Tipo de Documento")] }),
              new TableCell({ children: [new Paragraph(formData.tipoDocumento || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Número de Documento")] }),
              new TableCell({ children: [new Paragraph(formData.numeroDocumento || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Fecha del Documento")] }),
              new TableCell({ children: [new Paragraph(formData.fechaDocumento || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Notaría y Lugar de Expedición")] }),
              new TableCell({ children: [new Paragraph(formData.notaria || "")] }),
            ],
          }),
        ],
      });
      docContent.push(juridicaTable);
      docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));

      // Información Física
      docContent.push(
        new Paragraph({
          text: "Información Física del Inmueble",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );

      const fisicaTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Acueducto")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(formData.acueducto))] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Alcantarillado")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(formData.alcantarillado))] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Energía Eléctrica")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(formData.energia))] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Gas Natural")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(formData.gas))] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Otros Servicios")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(formData.otrosServicios))] }),
            ],
          }),
        ],
      });
      docContent.push(fisicaTable);
      docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));

      // Alcance de la Inspección
      docContent.push(
        new Paragraph({
          text: "Alcance de la Inspección",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );
      docContent.push(
        new Paragraph({
          text: "Proser Riesgos SAS, realiza un examen visual e instrumental del inmueble de acuerdo con lo establecido en el Decreto Único 1077 de 2015, Reglamentario del Sector Vivienda, Ciudad y Territorio y las especificaciones técnicas entregadas durante el proceso de venta o inspección previa. Este informe cuenta con un listado de observaciones, las cuales deberá entregar al responsable de cumplir con las garantías de la propiedad. Es responsabilidad del propietario hacer valer estas garantías y exigir una respuesta.",
          spacing: { after: 400 },
        })
      );

      // Inspección Métrica
      if (formData.inspeccionMetrica) {
        docContent.push(
          new Paragraph({
            text: "Inspección Métrica",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          })
        );
        docContent.push(
          new Paragraph({
            text: formData.inspeccionMetrica,
            spacing: { after: 400 },
          })
        );
      }

      // Inspección por Áreas
      docContent.push(
        new Paragraph({
          text: "Inspección por Áreas",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );

      // Función auxiliar para crear tabla de inspección desde items dinámicos
      const crearTablaDesdeItems = (items, titulo) => {
        if (!items || items.length === 0) return null;
        
        const rows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PARÁMETRO", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CUMPLE", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SÍNTOMA", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "OBSERVACIÓN", bold: true })] })] }),
            ],
          }),
        ];

        items.forEach(item => {
          rows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(item.parametro || "")] }),
                new TableCell({ 
                  children: [new Paragraph(formatearCumple(item.cumple || ""))],
                  shading: {
                    fill: item.cumple?.toLowerCase() === "si" ? "C6EFCE" : 
                          item.cumple?.toLowerCase() === "no" ? "FFC7CE" : "FFFFFF"
                  }
                }),
                new TableCell({ children: [new Paragraph(item.sintoma || "")] }),
                new TableCell({ children: [new Paragraph(item.observacion || "")] }),
              ],
            })
          );
        });

        return new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows,
        });
      };

      // Función para insertar fotos por sección
      const insertarFotosSeccion = async (fotos, titulo) => {
        if (!fotos || fotos.length === 0) return;

        // Helper: obtener ArrayBuffer de imagen con fallback de baseURL (evita insertar bytes inválidos que corrompen el DOCX)
        const fetchImageArrayBuffer = async (url) => {
          try {
            const resp = await fetch(url);
            if (!resp.ok) return null;

            const contentType = resp.headers.get('content-type') || '';
            // Aceptar imágenes; si viene vacío, igualmente intentamos (algunos servidores no lo envían correctamente)
            if (contentType && !contentType.startsWith('image/')) return null;

            const blob = await resp.blob();
            if (!blob || blob.size === 0) return null;
            return await blob.arrayBuffer();
          } catch {
            return null;
          }
        };
        
        docContent.push(
          new Paragraph({
            text: titulo,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        
        // Insertar fotos en grupos de 4 (2x2)
        for (let i = 0; i < fotos.length; i += 4) {
          const fotoGroup = fotos.slice(i, i + 4);
          const rows = [];
          
          for (let r = 0; r < 2; r++) {
            const cells = [];
            for (let c = 0; c < 2; c++) {
              const idx = r * 2 + c;
              if (idx < fotoGroup.length) {
                try {
                  const foto = fotoGroup[idx];
                  let imageBuffer;
                  
                  // Prioridad 1: Si tiene base64, usarlo directamente
                  if (foto.base64) {
                    const base64Data = foto.base64.startsWith('data:') 
                      ? foto.base64 
                      : `data:image/jpeg;base64,${foto.base64}`;
                    imageBuffer = base64ToArrayBuffer(base64Data);
                  } 
                  // Prioridad 2: Si tiene ruta del servidor, cargar desde ahí
                  else if (foto.ruta && foto.ruta.startsWith('/uploads/')) {
                    try {
                      const candidatos = [];
                      if (foto.ruta.startsWith('http')) {
                        candidatos.push(foto.ruta);
                      } else {
                        // 1) URL base configurada (dev/prod)
                        candidatos.push(`${BASE_URL}${foto.ruta}`);
                        // 2) Fallback: si estás en dev (localhost) pero las imágenes viven en producción
                        if (String(BASE_URL).includes('localhost')) {
                          candidatos.push(`${PROD_URL}${foto.ruta}`);
                        }
                      }

                      for (const url of candidatos) {
                        // eslint-disable-next-line no-await-in-loop
                        const buf = await fetchImageArrayBuffer(url);
                        if (buf) {
                          imageBuffer = buf;
                          break;
                        }
                      }

                      if (!imageBuffer) {
                        console.error('Error cargando imagen desde servidor: 404/no-image', {
                          nombre: foto.nombre,
                          ruta: foto.ruta
                        });
                      }
                    } catch (error) {
                      console.error('Error cargando imagen desde ruta:', error);
                    }
                  }
                  // Prioridad 3: Si tiene archivo File, convertirlo
                  else if (foto.archivo && foto.archivo instanceof File) {
                    imageBuffer = await foto.archivo.arrayBuffer();
                  }
                  // Prioridad 4: Si tiene URL pero NO es blob (es HTTP/HTTPS válida)
                  else if (foto.url && !foto.url.startsWith('blob:')) {
                    try {
                    const response = await fetch(foto.url);
                      if (response.ok) {
                    const blob = await response.blob();
                    imageBuffer = await blob.arrayBuffer();
                      }
                    } catch (error) {
                      console.error('Error cargando imagen desde URL:', error);
                    }
                  }
                  
                  if (imageBuffer) {
                    cells.push(
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: imageBuffer,
                                transformation: { width: 200, height: 200 },
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                          new Paragraph({
                            text: foto.descripcion || "",
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 100 },
                          }),
                        ],
                      })
                    );
                  } else {
                    console.warn('No se pudo obtener imagen para:', foto.nombre || 'imagen desconocida');
                    cells.push(new TableCell({ children: [new Paragraph("Imagen no disponible")] }));
                  }
                } catch (error) {
                  console.error('Error procesando foto:', error);
                  cells.push(new TableCell({ children: [new Paragraph("Error en imagen")] }));
                }
              } else {
                cells.push(new TableCell({ children: [new Paragraph("")] }));
              }
            }
            rows.push(new TableRow({ children: cells }));
          }
          
          docContent.push(new Table({ rows: rows }));
          if (i + 4 < fotos.length) {
            // PageBreak debe ir dentro de un Paragraph para generar DOCX válido
            docContent.push(new Paragraph({ children: [new PageBreak()] }));
          }
        }
        docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));
      };

      // COCINA
      if (areasData.cocina && areasData.cocina.length > 0) {
        docContent.push(
          new Paragraph({
            text: "COCINA",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        const tablaCocina = crearTablaDesdeItems(areasData.cocina, "COCINA");
        if (tablaCocina) {
          docContent.push(tablaCocina);
        }
        docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        
        // Insertar fotos de cocina
        if (fotosAreas.cocina && fotosAreas.cocina.length > 0) {
          await insertarFotosSeccion(fotosAreas.cocina, "FOTOS DE COCINA");
        }
      }

      // ZONA DE ROPAS
      if (areasData.ropas && areasData.ropas.length > 0) {
        docContent.push(
          new Paragraph({
            text: "ZONA DE ROPAS",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        const tablaRopas = crearTablaDesdeItems(areasData.ropas, "ZONA DE ROPAS");
        if (tablaRopas) {
          docContent.push(tablaRopas);
        }
        docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        
        if (fotosAreas.ropas && fotosAreas.ropas.length > 0) {
          await insertarFotosSeccion(fotosAreas.ropas, "FOTOS DE ZONA DE ROPAS");
        }
      }

      // SALA DE ESTAR
      if (areasData.sala && areasData.sala.length > 0) {
        docContent.push(
          new Paragraph({
            text: "SALA DE ESTAR",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        const tablaSala = crearTablaDesdeItems(areasData.sala, "SALA DE ESTAR");
        if (tablaSala) {
          docContent.push(tablaSala);
        }
        docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        
        if (fotosAreas.sala && fotosAreas.sala.length > 0) {
          await insertarFotosSeccion(fotosAreas.sala, "FOTOS DE SALA DE ESTAR");
        }
      }

      // BAÑO SOCIAL
      if (areasData.banioSocial && areasData.banioSocial.length > 0) {
        docContent.push(
          new Paragraph({
            text: "BAÑO SOCIAL",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        const tablaBanoSocial = crearTablaDesdeItems(areasData.banioSocial, "BAÑO SOCIAL");
        if (tablaBanoSocial) {
          docContent.push(tablaBanoSocial);
        }
        docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        
        if (fotosAreas.banioSocial && fotosAreas.banioSocial.length > 0) {
          await insertarFotosSeccion(fotosAreas.banioSocial, "FOTOS DE BAÑO SOCIAL");
        }
      }

      // BAÑO PRINCIPAL
      if (areasData.banoPrincipal && areasData.banoPrincipal.length > 0) {
        docContent.push(
          new Paragraph({
            text: "BAÑO PRINCIPAL",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        const tablaBanoPrincipal = crearTablaDesdeItems(areasData.banoPrincipal, "BAÑO PRINCIPAL");
        if (tablaBanoPrincipal) {
          docContent.push(tablaBanoPrincipal);
        }
        docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        
        if (fotosAreas.banoPrincipal && fotosAreas.banoPrincipal.length > 0) {
          await insertarFotosSeccion(fotosAreas.banoPrincipal, "FOTOS DE BAÑO PRINCIPAL");
        }
      }

      // ALCOBAS
      const numAlcobas = parseInt(formData.numAlcobas) || 0;
      for (let i = 1; i <= numAlcobas; i++) {
        if (areasData.alcobas[i] && areasData.alcobas[i].length > 0) {
          docContent.push(
            new Paragraph({
              text: `ALCOBA ${i}`,
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 },
            })
          );
          const tablaAlcoba = crearTablaDesdeItems(areasData.alcobas[i], `ALCOBA ${i}`);
          if (tablaAlcoba) {
            docContent.push(tablaAlcoba);
          }
          docContent.push(new Paragraph({ text: "", spacing: { after: 400 } }));
          
          if (fotosAreas.alcobas[i] && fotosAreas.alcobas[i].length > 0) {
            await insertarFotosSeccion(fotosAreas.alcobas[i], `FOTOS DE ALCOBA ${i}`);
          }
        }
      }

      // Conclusiones
      if (formData.conclusiones) {
        docContent.push(
          new Paragraph({
            text: "6 - CONCLUSIONES",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          })
        );
        docContent.push(
          new Paragraph({
            text: formData.conclusiones,
            spacing: { after: 400 },
          })
        );
      }

      // Principales Observaciones
      if (formData.observacionesPrincipales) {
        docContent.push(
          new Paragraph({
            text: "6.1 - LAS PRINCIPALES OBSERVACIONES SON:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        docContent.push(
          new Paragraph({
            text: formData.observacionesPrincipales,
            spacing: { after: 400 },
          })
        );
        docContent.push(
          new Paragraph({
            text: "Por lo anterior el propietario tiene todo el derecho de solicitar garantía al vendedor, de todos los puntos mencionados en el ítem 6.1 del presente informe.",
            spacing: { after: 400 },
          })
        );
      }

      // Texto final
      docContent.push(
        new Paragraph({
          text: "En espera de haber realizado satisfactoriamente la asignación de la Inspección y análisis del riesgo y agradeciendo la confianza depositada en nuestros servicios profesionales, suscribimos.",
          spacing: { after: 400 },
        })
      );

      // Firmas
      docContent.push(new Paragraph({ text: "ATENTAMENTE,", spacing: { after: 400 } }));

      const signTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph("ARNALDO TAPIA GUTIÉRREZ"),
                  new Paragraph("PROSER RIESGOS SAS"),
                  new Paragraph("E-MAIL: atapia@proserpuertos.com.co"),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph(
                    formData.inspector2 === "ladys" ? "LADYS ESCALANTE BOSSIO" :
                    formData.inspector2 === "maria" ? "MARÍA GARCÍA MANJARRES" :
                    formData.inspector2 === "mario" ? "MARIO PINILLA DE LA TORRE" :
                    "INSPECTOR"
                  ),
                  new Paragraph("PROSER RIESGOS SAS"),
                  new Paragraph(
                    formData.inspector2 === "ladys" ? "E-MAIL: ladys.escalante@proserpuertos.com.co" :
                    formData.inspector2 === "maria" ? "E-MAIL: magarciamanjarres@proserpuertos.com.co" :
                    formData.inspector2 === "mario" ? "E-MAIL: mario.pinilla@proserpuertos.com.co" :
                    "E-MAIL: inspector@proserpuertos.com.co"
                  ),
                ],
              }),
            ],
          }),
        ],
      });
      docContent.push(signTable);

      // Crear el documento
      const doc = new Document({
        sections: [
          {
            headers: {
              default: new Header({
                children: [headerTable],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    text: "Reporte generado por Proser Riesgos SAS",
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
            },
            children: docContent,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const nombreArchivo = `Reporte de Inspección - ${nombreCliente}.docx`;
      saveAs(blob, nombreArchivo);
      
      // Guardar archivo en historial
      if (formularioId && formularioId !== 'nuevo') {
        // Subir archivo al servidor
        const formDataFile = new FormData();
        formDataFile.append('archivo', blob, nombreArchivo);
        
        try {
          const response = await fetch(`${BASE_URL}/api/historial-formularios/${formularioId}/archivo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formDataFile
          });
          
          if (response.ok) {
            console.log('✅ Archivo Word guardado en historial');
          }
        } catch (error) {
          console.error('Error guardando archivo:', error);
        }
      }
      
      return nombreArchivo;
    } catch (error) {
      console.error('Error generando documento:', error);
      throw error;
    } finally {
      setCargando(false);
    }
  };

  // Función para exportar (generar Word y guardar en historial)
  const handleExportar = async () => {
    try {
      setExportando(true);
      setError(null);
      
      console.log('🚀 Iniciando exportación...');
      console.log('🔑 formularioId antes de guardar:', formularioId);
      
      // Primero guardar el formulario (esto puede crear o actualizar)
      await handleGuardarEnHistorial();
      
      console.log('💾 Formulario guardado. Generando documento Word...');
      
      // Luego generar el Word (usa el formularioId actualizado)
      await generarDocumentoWord();
      
      console.log('✅ Exportación completada exitosamente');
      
      mostrarModalConfirmacion(
        'Documento Generado',
        'El documento Word se ha generado y descargado exitosamente.',
        'success'
      );
    } catch (error) {
      console.error('❌ Error exportando:', error);
      setError('Error al exportar: ' + error.message);
      alert('Error al exportar: ' + error.message);
    } finally {
      setExportando(false);
    }
  };

  // Renderizar componente de fotos para un área
  const renderFotosArea = (area, alcobaNum = null) => {
    const fotos = alcobaNum ? (fotosAreas?.alcobas?.[alcobaNum] || []) : (fotosAreas?.[area] || []);
    const areaKey = alcobaNum ? `alcoba${alcobaNum}` : area;
    const tituloArea = alcobaNum ? `ALCOBA ${alcobaNum}` : area.toUpperCase();
    
    // Usar utilidades centralizadas de imageUtils
    
    return (
      <div className="mt-6 mb-6 border border-white rounded-lg p-6 bg-transparent">
        <h4 className="text-xl font-bold mb-4 text-blue-600" style={{ fontFamily: 'serif' }}>
          FOTOS DE {tituloArea}
        </h4>
        
        <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 text-center mb-6 bg-gray-50">
          <FaUpload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(area, e.target.files, alcobaNum)}
            className="hidden"
            id={`file-upload-${areaKey}`}
          />
          <label
            htmlFor={`file-upload-${areaKey}`}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-block font-semibold"
          >
            Seleccionar Imágenes
          </label>
          <p className="text-xs text-gray-500 mt-2">Las imágenes se comprimirán automáticamente</p>
        </div>

        {fotos.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {fotos.map((foto) => {
              const imageUrl = getImageUrl(foto);
              return (
                <div key={foto.id} className="bg-stone-50 border border-gray-300 rounded-lg p-4 shadow-sm">
                  <div className="relative mb-3">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={foto.nombre || 'Imagen'}
                        className="w-full h-48 object-contain rounded-lg cursor-pointer bg-white border border-gray-200"
                        onClick={() => {
                          // Modal de vista previa
                          const modal = document.createElement('div');
                          modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                          modal.innerHTML = `
                            <div class="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
                              <div class="flex justify-between items-center mb-4">
                                <h3 class="text-xl font-semibold">${foto.nombre || 'Imagen'}</h3>
                                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center">×</button>
                              </div>
                              <img src="${imageUrl}" alt="${foto.nombre || 'Imagen'}" class="w-full rounded-lg" />
                              ${foto.descripcion ? `<p class="mt-4 text-gray-700">${foto.descripcion}</p>` : ''}
                            </div>
                          `;
                          document.body.appendChild(modal);
                          modal.addEventListener('click', (e) => {
                            if (e.target === modal) modal.remove();
                          });
                        }}
                        onError={createImageErrorHandler(foto, (img, imagenData) => {
                          // Callback cuando todas las URLs fallan
                          img.style.display = 'none';
                          const container = img.closest('.relative') || img.parentElement;
                          if (container && !container.querySelector('.image-error-message')) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'image-error-message w-full h-48 rounded-lg flex items-center justify-center bg-gray-200';
                            errorDiv.innerHTML = `
                              <span class="text-xs text-center px-2 text-gray-600">
                                Imagen no disponible<br/>
                                en el servidor
                              </span>
                            `;
                            container.appendChild(errorDiv);
                          }
                        })}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-sm">Sin imagen</span>
                      </div>
                    )}
                    <button
                      onClick={() => eliminarFoto(area, foto.id, alcobaNum)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg"
                      title="Eliminar foto"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    value={foto.descripcion || ''}
                    onChange={(e) => actualizarDescripcionFoto(area, foto.id, e.target.value, alcobaNum)}
                    placeholder="Descripción de la foto..."
                    className="w-full mt-2 p-2 border border-gray-300 rounded text-sm resize-none"
                    rows={2}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Renderizar tabla de inspección con items dinámicos
  const renderTablaInspeccion = (area, alcobaNum = null) => {
    const items = alcobaNum ? (areasData?.alcobas?.[alcobaNum] || []) : (areasData?.[area] || []);
    const campos = alcobaNum ? camposBase.alcoba : camposBase[area];
    
    return (
      <div className="bg-transparent p-4 rounded-lg border border-gray-200 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Items de Inspección {alcobaNum ? `- Alcoba ${alcobaNum}` : `- ${area.toUpperCase()}`}
          </h3>
          <button
            type="button"
            onClick={() => agregarItem(area, alcobaNum)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm"
          >
            <FaPlus className="h-4 w-4" />
            Agregar Item
          </button>
        </div>
        
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No hay items agregados. Haz clic en "Agregar Item" para comenzar.</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">PARÁMETRO</th>
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">CUMPLE (SI/NO/NA)</th>
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">SÍNTOMA</th>
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">OBSERVACIÓN</th>
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={item.parametro || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'parametro', e.target.value, alcobaNum)}
                      placeholder="Ej: Muros, Pisos, etc."
                      className="w-full p-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <select
                      value={item.cumple || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'cumple', e.target.value, alcobaNum)}
                      className={`w-full p-1 border border-gray-300 rounded text-sm ${
                        item.cumple?.toLowerCase() === 'si' ? 'bg-green-100' :
                        item.cumple?.toLowerCase() === 'no' ? 'bg-red-100' : ''
                      }`}
                    >
                      <option value="">--</option>
                      <option value="si">SI</option>
                      <option value="no">NO</option>
                      <option value="na">NA</option>
                    </select>
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={item.sintoma || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'sintoma', e.target.value, alcobaNum)}
                      placeholder="Síntoma observado"
                      className="w-full p-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={item.observacion || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'observacion', e.target.value, alcobaNum)}
                      placeholder="Observación"
                      className="w-full p-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <button
                      type="button"
                      onClick={() => eliminarItem(area, item.id, alcobaNum)}
                      className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                      title="Eliminar item"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {/* Botón para agregar items desde campos base */}
        {campos && campos.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">O agregar items predefinidos:</p>
            <div className="flex flex-wrap gap-2">
              {campos.map((campo) => (
                <button
                  key={campo.key}
                  type="button"
                  onClick={() => {
                    const nuevoItem = {
                      id: Date.now() + Math.random(),
                      parametro: campo.name,
                      cumple: '',
                      sintoma: '',
                      observacion: '',
                    };
                    
                    if (alcobaNum) {
                      setAreasData(prev => ({
                        ...prev,
                        alcobas: {
                          ...prev.alcobas,
                          [alcobaNum]: [...(prev.alcobas[alcobaNum] || []), nuevoItem]
                        }
                      }));
                    } else {
                      setAreasData(prev => ({
                        ...prev,
                        [area]: [...(prev[area] || []), nuevoItem]
                      }));
                    }
                    guardarAutomatico();
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
                >
                  + {campo.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-transparent rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Formulario de Inspección de Propiedad</h1>
          <p className="text-gray-600">Complete todos los campos y agregue items de inspección según sea necesario</p>
        </div>

        {/* Indicador de guardado automático */}
        {formularioId && formularioId !== 'nuevo' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-green-800">Guardado automático activo - Los cambios se guardan cada 2 segundos</span>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Overlay de carga */}
        {cargando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-transparent p-6 rounded-lg text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Procesando, por favor espera...</p>
            </div>
          </div>
        )}

        <form className="space-y-6">
          {/* 1. INFORMACIÓN GENERAL DEL INMUEBLE */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-3">1.</span>
              INFORMACIÓN GENERAL DEL INMUEBLE
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clase de Inmueble:</label>
                <input
                  type="text"
                  name="claseInmueble"
                  value={formData.claseInmueble}
                  onChange={(e) => handleInputChange('claseInmueble', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Inmueble:</label>
                <input
                  type="text"
                  name="tipoInmueble"
                  value={formData.tipoInmueble}
                  onChange={(e) => handleInputChange('tipoInmueble', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección del Inmueble:</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Cliente:</label>
                <input
                  type="text"
                  name="nombreInmueble"
                  value={formData.nombreInmueble}
                  onChange={(e) => handleInputChange('nombreInmueble', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Localización:</label>
                <input
                  type="text"
                  name="localizacion"
                  value={formData.localizacion}
                  onChange={(e) => handleInputChange('localizacion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad:</label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Departamento:</label>
                <input
                  type="text"
                  name="departamento"
                  value={formData.departamento}
                  onChange={(e) => handleInputChange('departamento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quien recibe la Visita:</label>
                <input
                  type="text"
                  name="destinacion"
                  value={formData.destinacion}
                  onChange={(e) => handleInputChange('destinacion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 1.2. INFORMACIÓN JURÍDICA DEL INMUEBLE */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Información Jurídica del Inmueble</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento de Propiedad:</label>
                <input
                  type="text"
                  name="tipoDocumento"
                  value={formData.tipoDocumento}
                  onChange={(e) => handleInputChange('tipoDocumento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de Documento de Propiedad:</label>
                <input
                  type="text"
                  name="numeroDocumento"
                  value={formData.numeroDocumento}
                  onChange={(e) => handleInputChange('numeroDocumento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha del Documento:</label>
                <input
                  type="date"
                  name="fechaDocumento"
                  value={formData.fechaDocumento}
                  onChange={(e) => handleInputChange('fechaDocumento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notaría y Lugar de Expedición:</label>
                <input
                  type="text"
                  name="notaria"
                  value={formData.notaria}
                  onChange={(e) => handleInputChange('notaria', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 1.3. INFORMACIÓN FÍSICA DEL INMUEBLE */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Información Física del Inmueble</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servicio de Acueducto:</label>
                <select
                  name="acueducto"
                  value={formData.acueducto}
                  onChange={(e) => handleInputChange('acueducto', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servicio de Alcantarillado:</label>
                <select
                  name="alcantarillado"
                  value={formData.alcantarillado}
                  onChange={(e) => handleInputChange('alcantarillado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servicio de Energía Eléctrica:</label>
                <select
                  name="energia"
                  value={formData.energia}
                  onChange={(e) => handleInputChange('energia', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servicio de Gas Natural:</label>
                <select
                  name="gas"
                  value={formData.gas}
                  onChange={(e) => handleInputChange('gas', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Otros Servicios:</label>
                <input
                  type="text"
                  name="otrosServicios"
                  value={formData.otrosServicios}
                  onChange={(e) => handleInputChange('otrosServicios', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 2. ALCANCE DE LA INSPECCIÓN */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2- ALCANCE DE LA INSPECCIÓN</h2>
            <p className="text-gray-700 mb-2">
              Proser Riesgos SAS, realiza un examen visual e instrumental del inmueble de acuerdo con lo establecido en el Decreto Único 1077 de 2015, reglamentario del Sector Vivienda, Ciudad y Territorio y las especificaciones técnicas entregadas durante el proceso de venta o inspección previa.
            </p>
            <p className="text-gray-700">
              El objetivo es identificar patologías y defectos en áreas específicas de la edificación para garantizar el cumplimiento de las garantías.
            </p>
          </div>

          {/* 3. INSPECCIÓN MÉTRICA */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3- INSPECCIÓN MÉTRICA</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones de Inspección Métrica:</label>
            <textarea
              name="inspeccionMetrica"
              value={formData.inspeccionMetrica}
              onChange={(e) => handleInputChange('inspeccionMetrica', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Chatbot IA */}
            <div className="mt-3">
              <ChatbotIA 
                formData={formData} 
                onInputChange={handleInputChange}
                seccion="inspeccionMetrica"
                tituloSeccion="Inspección Métrica"
                textoActual={formData.inspeccionMetrica || ''}
                onTextoCambiado={(texto) => handleInputChange('inspeccionMetrica', texto)}
                tipoSeccion="inspeccionMetrica"
              />
            </div>
          </div>

          {/* 4. INSPECCIÓN POR ÁREAS */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">4- INSPECCIÓN POR ÁREAS</h2>
            
            {/* 4.1 - Cocina */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">4.1 - Cocina</h3>
              {renderTablaInspeccion('cocina')}
              {renderFotosArea('cocina')}
            </div>

            {/* 4.2 - Zona de ropas */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">4.2 - Zona de ropas</h3>
              {renderTablaInspeccion('ropas')}
              {renderFotosArea('ropas')}
            </div>

            {/* 4.3 - Sala de estar */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">4.3 - Sala de estar</h3>
              {renderTablaInspeccion('sala')}
              {renderFotosArea('sala')}
            </div>

            {/* 4.4 - Baño social */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">4.4 - Baño social</h3>
              {renderTablaInspeccion('banioSocial')}
              {renderFotosArea('banioSocial')}
            </div>

            {/* 4.5 - Baño Principal */}
            <div className="mb-8 border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">4.5 - Baño Principal (Solo si aplica)</h3>
              {renderTablaInspeccion('banoPrincipal')}
              {renderFotosArea('banoPrincipal')}
            </div>

            {/* Alcobas */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Alcobas</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">¿Cuántas alcobas hay?</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="number"
                    name="numAlcobas"
                    value={formData.numAlcobas}
                    onChange={(e) => {
                      handleInputChange('numAlcobas', e.target.value);
                      setTimeout(() => generateBedrooms(), 100);
                    }}
                    min="0"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={generateBedrooms}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Generar Alcobas
                  </button>
                </div>
              </div>
              
              {Array.from({ length: parseInt(formData.numAlcobas) || 0 }, (_, i) => i + 1).map(alcobaNum => (
                <div key={alcobaNum} className="mb-6 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-bold mb-4">Alcoba {alcobaNum}</h4>
                  {renderTablaInspeccion('alcoba', alcobaNum)}
                  {renderFotosArea('alcoba', alcobaNum)}
                </div>
              ))}
            </div>
          </div>

          {/* 6 - CONCLUSIONES */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6 - CONCLUSIONES</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conclusiones:</label>
            <textarea
              name="conclusiones"
              value={formData.conclusiones}
              onChange={(e) => handleInputChange('conclusiones', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Chatbot IA */}
            <div className="mt-3">
              <ChatbotIA 
                formData={formData} 
                onInputChange={handleInputChange}
                seccion="conclusiones"
                tituloSeccion="Conclusiones"
                textoActual={formData.conclusiones || ''}
                onTextoCambiado={(texto) => handleInputChange('conclusiones', texto)}
                tipoSeccion="conclusiones"
              />
            </div>
          </div>

          {/* 6.1 - Principales Observaciones */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6.1 - Principales Observaciones</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">Principales Observaciones:</label>
            <textarea
              name="observacionesPrincipales"
              value={formData.observacionesPrincipales}
              onChange={(e) => handleInputChange('observacionesPrincipales', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Chatbot IA */}
            <div className="mt-3">
              <ChatbotIA 
                formData={formData} 
                onInputChange={handleInputChange}
                seccion="observacionesPrincipales"
                tituloSeccion="Principales Observaciones"
                textoActual={formData.observacionesPrincipales || ''}
                onTextoCambiado={(texto) => handleInputChange('observacionesPrincipales', texto)}
                tipoSeccion="observacionesPrincipales"
              />
            </div>
          </div>

          {/* Inspector 2 */}
          <div className="bg-transparent rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Seleccionar Inspector 2</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inspector 2:</label>
            <select
              name="inspector2"
              value={formData.inspector2}
              onChange={(e) => handleInputChange('inspector2', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ladys">Ladys Escalante Bossio</option>
              <option value="maria">María García Manjarres</option>
              <option value="mario">Mario Pinilla De la Torre</option>
              <option value="inspector4">Inspector 4</option>
              <option value="inspector5">Inspector 5</option>
            </select>
          </div>

          {/* Botones de acción */}
          <BotonesHistorial
            onGuardarEnHistorial={handleGuardarEnHistorial}
            onExportar={handleExportar}
            tipoFormulario={TIPOS_FORMULARIOS.INSPECCION_PROPIEDADES}
            tituloFormulario="Inspección de Propiedades"
            deshabilitado={false}
            guardando={guardando}
            exportando={exportando}
          />
        </form>
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
