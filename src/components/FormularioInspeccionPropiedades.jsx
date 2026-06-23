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
} from 'docx';
import { saveAs } from 'file-saver';
import { BASE_URL, PROD_URL, getUploadsUrlCandidates } from '../config/apiConfig';
import { getImageUrl, createImageErrorHandler } from '../utils/imageUtils';
import { appendUploadFile } from '../utils/sanitizeUploadFileName.js';
import { obtenerFechaHoraActualISO } from '../utils/fechaUtils';
import { FaCamera, FaUpload, FaTrash, FaPlus, FaEye } from 'react-icons/fa';
import ChatbotIA from './SubcomponenteFormularioAjuste/ChatbotIA';
import BotonesHistorial from './BotonesHistorial';
import historialService, { TIPOS_FORMULARIOS, ESTADOS_FORMULARIO } from '../services/historialService';
import { ImageCompression } from '../utils/imageCompression';
import {
  MAX_FOTOS_POR_SECCION,
  MAX_FOTOS_TOTAL,
  MAX_FOTO_TAMANO_MB,
  FOTO_COMPRESION_OPCIONES,
  esAreaFotosAnidada,
  contarFotosEnSeccion,
  contarFotosTotales,
  prepararFotosAreasParaGuardar,
} from '../utils/propiedadesFotoUtils';
import ModalConfirmacion from './ModalConfirmacion';
import SeccionFirmasActa from './SeccionFirmasActa';
import { construirElementosFirmasActaWord } from '../utils/firmasActaWord';
import {
  estilosDocumentoPropiedades,
  pBody,
  pHeading,
  pTitulo,
  pSpacer,
  tr,
  crearTablaDatos,
  crearTablaInspeccionItems,
  insertarFotosSeccionWord,
} from '../utils/propiedadesWordUtils';
import Logo from '../img/Logo.png';
import {
  usePropiedadesTheme,
  SectionCard,
  FieldLabel,
  ThemedInput,
  ThemedTextarea,
  ThemedSelect,
  SubsectionTitle,
  AreaDivider,
  InfoBanner,
  LlenadoGuiaPropiedades,
  FormTable,
  FormTableHead,
  FormTableTh,
  FormTableTd,
  TableFieldInput,
  TableFieldSelect,
  complexBtnPrimary,
  complexBtnSecondary,
  complexBtnDanger,
  complexBtnGhost,
} from './propiedadesUi';

const CLASES_TIPOS_INMUEBLE = {
  Residencial: [
    'Casa',
    'Apartamento',
    'Apartaestudio',
    'Casa en conjunto cerrado',
    'Casa campestre',
    'Local mixto (vivienda)',
  ],
  Comercial: [
    'Local comercial',
    'Oficina',
    'Consultorio',
    'Bodega comercial',
    'Local en centro comercial',
  ],
  Industrial: [
    'Bodega industrial',
    'Nave industrial',
    'Planta industrial',
    'Taller',
  ],
  Mixto: [
    'Edificio mixto',
    'Casa con local comercial',
    'Apartamento con oficina',
  ],
  Institucional: [
    'Edificio educativo',
    'Edificio de salud',
    'Edificio religioso',
    'Edificio gubernamental',
    'Otro institucional',
  ],
};

const CLASES_INMUEBLE = Object.keys(CLASES_TIPOS_INMUEBLE);

const INSPECTORES_LEGACY = {
  ladys: { nombre: 'LADYS ESCALANTE BOSSIO', email: 'ladys.escalante@proserpuertos.com.co' },
  maria: { nombre: 'MARÍA GARCÍA MANJARRES', email: 'magarciamanjarres@proserpuertos.com.co' },
  mario: { nombre: 'MARIO PINILLA DE LA TORRE', email: 'mario.pinilla@proserpuertos.com.co' },
};

const migrarFirmasActa = (form) => {
  if (!form) return form;
  const f = { ...form };

  if (f.actaClienteNombre || f.actaClienteFirma || f.actaAjustadorNombre || f.actaAjustadorFuncionarioId) {
    return f;
  }

  if (Array.isArray(f.firmasActa) && f.firmasActa.length > 0) {
    const primero = f.firmasActa[0];
    f.actaClienteNombre = primero?.cliente?.nombre || f.destinacion || '';
    f.actaClienteCargo = primero?.cliente?.cargo || '';
    f.actaClienteEmail = primero?.cliente?.email || '';
    f.actaClienteFirma = primero?.cliente?.firma || '';
    const aj = primero?.ajustador;
    if (aj) {
      f.actaAjustadorFuncionarioId = aj.funcionarioId || '';
      f.actaAjustadorNombre = aj.nombre || '';
      f.actaAjustadorCargo = aj.cargo || '';
      f.actaAjustadorEmail = aj.email || '';
      f.actaAjustadorFirmaImagen = aj.firmaImagen || '';
    }
    return f;
  }

  if (Array.isArray(f.actaAjustadores) && f.actaAjustadores.length > 0) {
    const aj = f.actaAjustadores[0];
    f.actaAjustadorFuncionarioId = aj.funcionarioId || '';
    f.actaAjustadorNombre = aj.nombre || '';
    f.actaAjustadorCargo = aj.cargo || '';
    f.actaAjustadorEmail = aj.email || '';
    f.actaAjustadorFirmaImagen = aj.firmaImagen || '';
  }

  if (Array.isArray(f.firmas) && f.firmas.length > 0) {
    const [visita, ajustador] = f.firmas;
    if (visita) {
      f.actaClienteNombre = visita.nombre || f.destinacion || '';
      f.actaClienteCargo = visita.cargo || '';
      f.actaClienteEmail = visita.email || '';
      f.actaClienteFirma = visita.firma || '';
    }
    if (ajustador) {
      f.actaAjustadorNombre = ajustador.nombre || '';
      f.actaAjustadorCargo = ajustador.cargo || '';
      f.actaAjustadorEmail = ajustador.email || '';
      f.actaAjustadorFirmaImagen = ajustador.firma || '';
    }
  } else if (f.inspector2 && INSPECTORES_LEGACY[f.inspector2]) {
    const inspector = INSPECTORES_LEGACY[f.inspector2];
    f.actaAjustadorNombre = inspector.nombre;
    f.actaAjustadorCargo = 'PROSER RIESGOS SAS';
    f.actaAjustadorEmail = inspector.email;
  }

  if (!f.actaClienteNombre && f.destinacion) {
    f.actaClienteNombre = f.destinacion;
  }

  return f;
};

export default function FormularioInspeccionPropiedades() {
  const t = usePropiedadesTheme();
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
    
    // Inspección Métrica
    inspeccionMetrica: '',
    
    // Conclusiones
    conclusiones: '',
    observacionesPrincipales: '',
    
    // Firmas estilo acta (independiente del formulario de ajustes)
    actaClienteNombre: '',
    actaClienteCargo: '',
    actaClienteEmail: '',
    actaClienteFirma: '',
    actaAjustadorFuncionarioId: '',
    actaAjustadorNombre: '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    inspector2: 'ladys', // legacy

    // Número de alcobas
    numAlcobas: 0,
    // Alcobas con baño habilitado: { 1: true, 2: false, ... }
    alcobasConBano: {},
    // Alcobas con closet habilitado: { 1: true, 2: false, ... }
    alcobasConCloset: {},
  });

  // Estado para items dinámicos de cada área
  const [areasData, setAreasData] = useState({
    cocina: [],
    ropas: [],
    sala: [],
    banioSocial: [],
    banoPrincipal: [],
    alcobas: {}, // {1: [], 2: [], ...}
    banosAlcobas: {}, // {1: [], 2: [], ...} baño por alcoba
    closetsAlcobas: {}, // {1: [], 2: [], ...} closet por alcoba
  });

  // Estado para fotos de cada área (similar a InspeccionFotograficaAjuste)
  const [fotosAreas, setFotosAreas] = useState({
    cocina: [],
    ropas: [],
    sala: [],
    banioSocial: [],
    banoPrincipal: [],
    alcobas: {}, // {1: [], 2: [], ...}
    banosAlcobas: {},
    closetsAlcobas: {},
  });

  const getClaveAlmacenamientoArea = (area) => {
    if (area === 'banoAlcoba') return 'banosAlcobas';
    if (area === 'closetAlcoba') return 'closetsAlcobas';
    if (area === 'alcoba') return 'alcobas';
    return null;
  };

  const esAreaAnidada = (area) => area === 'alcoba' || area === 'banoAlcoba' || area === 'closetAlcoba';

  const esFotosAnidadas = (area) => esAreaFotosAnidada(area);

  const migrarDatosBanoAlcoba = (areas, form) => {
    const areasMigradas = { ...areas };
    let formMigrado = { ...form };

    if (
      (!areasMigradas.banosAlcobas || Object.keys(areasMigradas.banosAlcobas).length === 0) &&
      areasMigradas.banoPrincipal?.length > 0
    ) {
      areasMigradas.banosAlcobas = { 1: areasMigradas.banoPrincipal };
      formMigrado.alcobasConBano = { ...(formMigrado.alcobasConBano || {}), 1: true };
    }

    if (areasMigradas.banosAlcobas) {
      const conBano = { ...(formMigrado.alcobasConBano || {}) };
      Object.entries(areasMigradas.banosAlcobas).forEach(([num, items]) => {
        if ((items && items.length > 0) || conBano[num]) {
          conBano[num] = true;
        }
      });
      formMigrado.alcobasConBano = conBano;
    }

    if (areasMigradas.closetsAlcobas) {
      const conCloset = { ...(formMigrado.alcobasConCloset || {}) };
      Object.entries(areasMigradas.closetsAlcobas).forEach(([num, items]) => {
        if ((items && items.length > 0) || conCloset[num]) {
          conCloset[num] = true;
        }
      });
      formMigrado.alcobasConCloset = conCloset;
    }

    return { areas: areasMigradas, form: formMigrado };
  };

  // Normalizar estructuras para evitar crashes cuando falten claves (ej. alcobas)
  const normalizarAreasData = (data) => ({
    cocina: Array.isArray(data?.cocina) ? data.cocina : [],
    ropas: Array.isArray(data?.ropas) ? data.ropas : [],
    sala: Array.isArray(data?.sala) ? data.sala : [],
    banioSocial: Array.isArray(data?.banioSocial) ? data.banioSocial : [],
    banoPrincipal: Array.isArray(data?.banoPrincipal) ? data.banoPrincipal : [],
    alcobas: (data?.alcobas && typeof data.alcobas === 'object' && !Array.isArray(data.alcobas)) ? data.alcobas : {},
    banosAlcobas: (data?.banosAlcobas && typeof data.banosAlcobas === 'object' && !Array.isArray(data.banosAlcobas)) ? data.banosAlcobas : {},
    closetsAlcobas: (data?.closetsAlcobas && typeof data.closetsAlcobas === 'object' && !Array.isArray(data.closetsAlcobas)) ? data.closetsAlcobas : {},
  });

  const normalizarFotosAreas = (data) => ({
    cocina: Array.isArray(data?.cocina) ? data.cocina : [],
    ropas: Array.isArray(data?.ropas) ? data.ropas : [],
    sala: Array.isArray(data?.sala) ? data.sala : [],
    banioSocial: Array.isArray(data?.banioSocial) ? data.banioSocial : [],
    banoPrincipal: Array.isArray(data?.banoPrincipal) ? data.banoPrincipal : [],
    alcobas: (data?.alcobas && typeof data.alcobas === 'object' && !Array.isArray(data.alcobas)) ? data.alcobas : {},
    banosAlcobas: (data?.banosAlcobas && typeof data.banosAlcobas === 'object' && !Array.isArray(data.banosAlcobas)) ? data.banosAlcobas : {},
    closetsAlcobas: (data?.closetsAlcobas && typeof data.closetsAlcobas === 'object' && !Array.isArray(data.closetsAlcobas)) ? data.closetsAlcobas : {},
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
                const formMigrado = migrarFirmasActa({ ...datosParseados.formData });
                setFormData(prev => ({ ...prev, ...formMigrado }));
              }
              if (datosParseados.areasData) {
                const areasNorm = normalizarAreasData({ ...areasData, ...datosParseados.areasData });
                const { areas, form } = migrarDatosBanoAlcoba(areasNorm, datosParseados.formData || {});
                setAreasData(areas);
                if (form.alcobasConBano && Object.keys(form.alcobasConBano).length > 0) {
                  setFormData(prev => ({ ...prev, alcobasConBano: form.alcobasConBano }));
                }
                if (form.alcobasConCloset && Object.keys(form.alcobasConCloset).length > 0) {
                  setFormData(prev => ({ ...prev, alcobasConCloset: form.alcobasConCloset }));
                }
              }
              if (datosParseados.fotosAreas) {
                // Procesar fotos desde localStorage (convertir base64 a objetos utilizables)
                const fotosProcesadas = await procesarFotosDesdeLocalStorage(datosParseados.fotosAreas);
                setFotosAreas(normalizarFotosAreas(fotosProcesadas));
              }
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

    const timeoutId = setTimeout(() => {
      try {
        const datosParaGuardar = JSON.stringify({
          formData,
          areasData,
          fotosAreas: {},
        });
        localStorage.setItem('formularioPropiedades', datosParaGuardar);
      } catch (error) {
        console.error('Error al guardar datos:', error);
        try {
          localStorage.removeItem('formularioPropiedades');
          const datosSinFotos = JSON.stringify({
            formData,
            areasData,
            fotosAreas: {},
          });
          localStorage.setItem('formularioPropiedades', datosSinFotos);
        } catch (e) {
          console.error('Error crítico al guardar:', e);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData, areasData, fotosAreas, location.pathname]);

  // Guardar datos antes de refrescar la página (solo si estamos en el formulario)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const esRutaPropiedades = window.location.pathname.includes('/propiedades') || window.location.pathname.includes('/inspeccion-propiedades');
      if (esRutaPropiedades) {
        try {
          localStorage.setItem('formularioPropiedades', JSON.stringify({
            formData,
            areasData,
            fotosAreas: {},
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
localStorage.removeItem('formularioPropiedades');
    }

    return () => {
      setTimeout(() => {
        const sigueEnRutaPropiedades = window.location.pathname.includes('/propiedades') || window.location.pathname.includes('/inspeccion-propiedades');
        if (!sigueEnRutaPropiedades) {
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
    closet: [
      { name: 'Puertas del closet', key: 'puertasCloset' },
      { name: 'Interior del closet', key: 'interiorCloset' },
      { name: 'Estanterías', key: 'estanterias' },
      { name: 'Barras colgadoras', key: 'barrasColgadoras' },
      { name: 'Cajones', key: 'cajones' },
      { name: 'Pisos', key: 'pisos' },
      { name: 'Pintura y/o estuco', key: 'pintura' },
      { name: 'Iluminación interna', key: 'iluminacionInterna' },
      { name: 'Ventilación', key: 'ventilacion' },
      { name: 'Herrajes y accesorios', key: 'herrajesAccesorios' },
      { name: 'Carpintería de madera', key: 'carpinteria' },
    ],
  };

  // Función auxiliar para capitalizar
  const capitalizeFirstLetter = (str) => {
    if (!str || typeof str !== "string") return str || "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

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

  const programarGuardadoAutomatico = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      guardarAutomatico();
    }, 2000);
  };

  const handleClaseInmuebleChange = (clase) => {
    setFormData(prev => ({
      ...prev,
      claseInmueble: clase,
      tipoInmueble: '',
    }));
    programarGuardadoAutomatico();
  };

  const tiposInmuebleDisponibles = formData.claseInmueble
    ? (CLASES_TIPOS_INMUEBLE[formData.claseInmueble] || [])
    : [];

  // Función para agregar item a un área
  const agregarItem = (area, alcobaNum = null) => {
    const nuevoItem = {
      id: Date.now() + Math.random(),
      parametro: '',
      cumple: '',
      sintoma: '',
      observacion: '',
    };
    
    const clave = getClaveAlmacenamientoArea(area);
    if (clave && alcobaNum) {
      setAreasData(prev => ({
        ...prev,
        [clave]: {
          ...(prev[clave] || {}),
          [alcobaNum]: [...(prev[clave]?.[alcobaNum] || []), nuevoItem]
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
    const clave = getClaveAlmacenamientoArea(area);
    if (clave && alcobaNum) {
      setAreasData(prev => ({
        ...prev,
        [clave]: {
          ...(prev[clave] || {}),
          [alcobaNum]: (prev[clave]?.[alcobaNum] || []).filter(item => item.id !== itemId)
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
    const clave = getClaveAlmacenamientoArea(area);
    if (clave && alcobaNum) {
      setAreasData(prev => ({
        ...prev,
        [clave]: {
          ...(prev[clave] || {}),
          [alcobaNum]: (prev[clave]?.[alcobaNum] || []).map(item =>
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

    const claveStorage = getClaveAlmacenamientoArea(area);
    const enSeccion = contarFotosEnSeccion(fotosAreas, claveStorage || area, alcobaNum);
    const totalActual = contarFotosTotales(fotosAreas);
    const disponiblesSeccion = MAX_FOTOS_POR_SECCION - enSeccion;
    const disponiblesTotal = MAX_FOTOS_TOTAL - totalActual;
    const cupo = Math.min(disponiblesSeccion, disponiblesTotal, files.length);

    if (cupo <= 0) {
      alert(
        disponiblesTotal <= 0
          ? `Has alcanzado el límite de ${MAX_FOTOS_TOTAL} fotos en todo el informe.`
          : `Esta sección ya tiene el máximo de ${MAX_FOTOS_POR_SECCION} fotos.`
      );
      return;
    }

    if (cupo < files.length) {
      alert(`Solo se agregarán ${cupo} foto(s) por el límite del informe.`);
    }

    setCargando(true);

    try {
      const filesArray = Array.from(files).slice(0, cupo);
      const maxBytes = MAX_FOTO_TAMANO_MB * 1024 * 1024;
      const validos = [];
      for (const file of filesArray) {
        if (!file.type?.startsWith('image/')) continue;
        if (file.size > maxBytes) {
          alert(`"${file.name}" supera ${MAX_FOTO_TAMANO_MB} MB y no se agregó.`);
          continue;
        }
        validos.push(file);
      }

      if (validos.length === 0) return;

      const imagenesComprimidas = await ImageCompression.compressImages(validos, FOTO_COMPRESION_OPCIONES);

      const nuevasImagenes = imagenesComprimidas.map((file) => ({
        id: Date.now() + Math.random(),
        nombre: file.name,
        archivo: file,
        url: URL.createObjectURL(file),
        descripcion: '',
      }));
      
      const clave = getClaveAlmacenamientoArea(area);
      if (clave && alcobaNum) {
        setFotosAreas(prev => ({
          ...prev,
          [clave]: {
            ...(prev[clave] || {}),
            [alcobaNum]: [...(prev[clave]?.[alcobaNum] || []), ...nuevasImagenes]
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
    const clave = getClaveAlmacenamientoArea(area);
    if (clave && alcobaNum) {
      setFotosAreas(prev => {
        const fotosPrevias = (prev[clave]?.[alcobaNum] || []);
        const fotoAEliminar = fotosPrevias.find(foto => foto.id === fotoId);
        if (fotoAEliminar?.url && typeof fotoAEliminar.url === 'string' && fotoAEliminar.url.startsWith('blob:')) {
          URL.revokeObjectURL(fotoAEliminar.url);
        }

        return {
          ...prev,
          [clave]: {
            ...prev[clave],
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
    const clave = getClaveAlmacenamientoArea(area);
    if (clave && alcobaNum) {
      setFotosAreas(prev => ({
        ...prev,
        [clave]: {
          ...(prev[clave] || {}),
          [alcobaNum]: (prev[clave]?.[alcobaNum] || []).map(foto =>
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

  const toggleBanoAlcoba = (alcobaNum) => {
    const activo = !formData.alcobasConBano?.[alcobaNum];
    setFormData(prev => ({
      ...prev,
      alcobasConBano: {
        ...(prev.alcobasConBano || {}),
        [alcobaNum]: activo
      }
    }));

    if (activo) {
      setAreasData(prev => ({
        ...prev,
        banosAlcobas: {
          ...(prev.banosAlcobas || {}),
          [alcobaNum]: prev.banosAlcobas?.[alcobaNum] || []
        }
      }));
      setFotosAreas(prev => ({
        ...prev,
        banosAlcobas: {
          ...(prev.banosAlcobas || {}),
          [alcobaNum]: prev.banosAlcobas?.[alcobaNum] || []
        }
      }));
    }

    guardarAutomatico();
  };

  const toggleClosetAlcoba = (alcobaNum) => {
    const activo = !formData.alcobasConCloset?.[alcobaNum];
    setFormData(prev => ({
      ...prev,
      alcobasConCloset: {
        ...(prev.alcobasConCloset || {}),
        [alcobaNum]: activo
      }
    }));

    if (activo) {
      setAreasData(prev => ({
        ...prev,
        closetsAlcobas: {
          ...(prev.closetsAlcobas || {}),
          [alcobaNum]: prev.closetsAlcobas?.[alcobaNum] || []
        }
      }));
      setFotosAreas(prev => ({
        ...prev,
        closetsAlcobas: {
          ...(prev.closetsAlcobas || {}),
          [alcobaNum]: prev.closetsAlcobas?.[alcobaNum] || []
        }
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
      const actualizado = await historialService.obtenerFormulario(formularioId);
      await sincronizarFotosDesdeDatosGuardados(actualizado?.datos);
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
if (formularioId !== id) {
        setFormularioId(id);
      }
      cargarFormularioExistente();
    } else if (id === 'nuevo' && formularioId) {
      // Si la URL cambió a 'nuevo' pero tenemos un formularioId, limpiar estado
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
          const formMigrado = migrarFirmasActa(datos.formData || {});
          
          if (datos.areasData) {
            const areasNorm = normalizarAreasData(datos.areasData);
            const { areas, form } = migrarDatosBanoAlcoba(areasNorm, formMigrado);
            setAreasData(areas);
            setFormData(form);
          } else {
            setFormData(formMigrado);
          }
          
          if (datos.fotosAreas) {
// Procesar fotos desde servidor
            const fotosProcesadas = {};
            for (const [area, fotos] of Object.entries(datos.fotosAreas)) {
              if (!fotos) continue; // Saltar si no hay fotos
              
if (Array.isArray(fotos) && fotos.length > 0) {
}
              
              if (esFotosAnidadas(area)) {
                fotosProcesadas[area] = fotosProcesadas[area] || {};
                for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
                  if (fotosAlcoba && Array.isArray(fotosAlcoba) && fotosAlcoba.length > 0) {
fotosProcesadas[area][alcobaNum] = await procesarFotosDesdeServidor(fotosAlcoba);
}
                }
              } else {
                if (Array.isArray(fotos) && fotos.length > 0) {
fotosProcesadas[area] = await procesarFotosDesdeServidor(fotos);
}
            }
            }
setFotosAreas(normalizarFotosAreas(fotosProcesadas));
          } else {
}
        } else {
          // Estructura antigua: datos directos (compatibilidad hacia atrás)
          // Extraer formData de los datos directos
          const { areasData: areasDataGuardado, fotosAreas: fotosAreasGuardado, ...formDataDirecto } = datos;
          const formMigrado = migrarFirmasActa(formDataDirecto);
          
          if (areasDataGuardado) {
            const areasNorm = normalizarAreasData(areasDataGuardado);
            const { areas, form } = migrarDatosBanoAlcoba(areasNorm, formMigrado);
            setAreasData(areas);
            setFormData(form);
          } else {
            setFormData(formMigrado);
          }
          
          if (fotosAreasGuardado) {
// Procesar fotos desde servidor
            const fotosProcesadas = {};
            for (const [area, fotos] of Object.entries(fotosAreasGuardado)) {
              if (!fotos) continue; // Saltar si no hay fotos
              
              if (esFotosAnidadas(area)) {
                fotosProcesadas[area] = fotosProcesadas[area] || {};
                for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
                  if (fotosAlcoba && Array.isArray(fotosAlcoba) && fotosAlcoba.length > 0) {
fotosProcesadas[area][alcobaNum] = await procesarFotosDesdeServidor(fotosAlcoba);
}
                }
              } else {
                if (Array.isArray(fotos) && fotos.length > 0) {
fotosProcesadas[area] = await procesarFotosDesdeServidor(fotos);
}
            }
            }
setFotosAreas(normalizarFotosAreas(fotosProcesadas));
          } else {
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
return [];
    }
    
// Reusar helper global para /uploads (DEV -> PROD fallback)
    const getImageUrlCandidates = (rutaOrUrl) => getUploadsUrlCandidates(rutaOrUrl);
    
    return await Promise.all(
      fotos.map(async (foto, index) => {
        // Log detallado de la estructura de la foto
// Si la foto es un string (base64 directo), convertirla a objeto
        if (typeof foto === 'string') {
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
return {
            id: foto.id || Date.now() + Math.random(),
            nombre: foto.nombre || 'Imagen',
            url: foto.url,
            descripcion: foto.descripcion || '',
          };
        }
        
        // Retornar foto tal cual si no se puede procesar
return {
          id: foto.id || Date.now() + Math.random(),
          nombre: foto.nombre || 'Imagen',
          descripcion: foto.descripcion || '',
          ...foto
        };
      })
    );
  };

  const sincronizarFotosDesdeDatosGuardados = async (datos) => {
    if (!datos?.fotosAreas) return;
    const fotosProcesadas = {};
    for (const [area, fotos] of Object.entries(datos.fotosAreas)) {
      if (!fotos) continue;
      if (esFotosAnidadas(area) && typeof fotos === 'object' && !Array.isArray(fotos)) {
        fotosProcesadas[area] = {};
        for (const [clave, lista] of Object.entries(fotos)) {
          fotosProcesadas[area][clave] = await procesarFotosDesdeServidor(lista || []);
        }
      } else if (Array.isArray(fotos)) {
        fotosProcesadas[area] = await procesarFotosDesdeServidor(fotos);
      }
    }
    setFotosAreas(normalizarFotosAreas(fotosProcesadas));
  };

  // Función para guardar en historial
  const handleGuardarEnHistorial = async () => {
    try {
      setGuardando(true);
      setError(null);
      
      const nombreCliente = formData.nombreInmueble ? capitalizeFirstLetter(formData.nombreInmueble) : "Sin Nombre";
      
      // Procesar fotos antes de guardar
      const fotosProcesadas = await prepararFotosAreasParaGuardar(fotosAreas);

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
      
let nuevoId;
      if (formularioId && formularioId !== 'nuevo') {
        // 🔄 Actualizar formulario existente (evita duplicados)
      await historialService.actualizarFormulario(formularioId, datosFormulario);
      const actualizado = await historialService.obtenerFormulario(formularioId);
      await sincronizarFotosDesdeDatosGuardados(actualizado?.datos);
        nuevoId = formularioId;
} else {
        // 🆕 Crear nuevo formulario
const resultado = await historialService.guardarFormulario(datosFormulario);
        nuevoId = resultado._id || resultado.id || resultado;
        await sincronizarFotosDesdeDatosGuardados(resultado?.datos);
// 🔑 Guardar ID y navegar a la URL con el ID para futuras actualizaciones
        setFormularioId(nuevoId);
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

  const procesarFotosParaGuardar = () => prepararFotosAreasParaGuardar(fotosAreas);

  // Función para procesar fotos desde localStorage (compatibilidad borradores antiguos con base64)
  const procesarFotosDesdeLocalStorage = async (fotosGuardadas) => {
    const fotosProcesadas = {};
    
    for (const [area, fotos] of Object.entries(fotosGuardadas)) {
      if (esFotosAnidadas(area)) {
        fotosProcesadas[area] = {};
        for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
          fotosProcesadas[area][alcobaNum] = (fotosAlcoba || []).map((foto) => {
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
                      new TextRun({ text: "PROSER RIESGOS SAS", bold: true, font: "Arial", size: 18 }),
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
                        font: "Arial",
                        size: 24,
                        color: "E0E0E0",
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 100 },
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: nombreClienteMayusculas,
                        font: "Arial",
                        size: 20,
                        color: "E0E0E0",
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
                        font: "Arial",
                        size: 18,
                        color: "E0E0E0",
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
                        font: "Arial",
                        size: 18,
                        color: "E0E0E0",
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
                        font: "Arial",
                        size: 18,
                        color: "E0E0E0",
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
      docContent.push(pSpacer(400));

      docContent.push(pTitulo('Reporte de Inspección de Propiedad'));
      docContent.push(pSpacer(200));

      docContent.push(pHeading('Información General del Inmueble'));
      docContent.push(
        crearTablaDatos([
          ['Clase de Inmueble', formData.claseInmueble],
          ['Tipo de Inmueble', formData.tipoInmueble],
          ['Dirección', formData.direccion],
          ['Nombre del Cliente', formData.nombreInmueble],
          ['Localización', formData.localizacion],
          ['Ciudad', formData.ciudad],
          ['Departamento', formData.departamento],
          ['Quien recibe la Visita', formData.destinacion],
        ])
      );
      docContent.push(pSpacer(400));

      docContent.push(pHeading('Información Jurídica del Inmueble'));
      docContent.push(
        crearTablaDatos([
          ['Tipo de Documento', formData.tipoDocumento],
          ['Número de Documento', formData.numeroDocumento],
          ['Fecha del Documento', formData.fechaDocumento],
          ['Notaría y Lugar de Expedición', formData.notaria],
        ])
      );
      docContent.push(pSpacer(400));

      if (formData.inspeccionMetrica) {
        docContent.push(pHeading('2 - INSPECCIÓN MÉTRICA'));
        docContent.push(pBody(formData.inspeccionMetrica, { after: 400 }));
      }

      docContent.push(pHeading('3 - INSPECCIÓN POR ÁREAS'));

      // COCINA
      if (areasData.cocina && areasData.cocina.length > 0) {
        docContent.push(pHeading('COCINA', HeadingLevel.HEADING_2));
        const tablaCocina = crearTablaInspeccionItems(areasData.cocina);
        if (tablaCocina) {
          docContent.push(tablaCocina);
        }
        docContent.push(pSpacer(400));
        
        // Insertar fotos de cocina
        if (fotosAreas.cocina && fotosAreas.cocina.length > 0) {
          await insertarFotosSeccionWord(docContent, fotosAreas.cocina, "FOTOS DE COCINA");
        }
      }

      // ZONA DE ROPAS
      if (areasData.ropas && areasData.ropas.length > 0) {
        docContent.push(pHeading('ZONA DE ROPAS', HeadingLevel.HEADING_2));
        const tablaRopas = crearTablaInspeccionItems(areasData.ropas);
        if (tablaRopas) {
          docContent.push(tablaRopas);
        }
        docContent.push(pSpacer(400));
        
        if (fotosAreas.ropas && fotosAreas.ropas.length > 0) {
          await insertarFotosSeccionWord(docContent, fotosAreas.ropas, "FOTOS DE ZONA DE ROPAS");
        }
      }

      // SALA DE ESTAR
      if (areasData.sala && areasData.sala.length > 0) {
        docContent.push(pHeading('SALA DE ESTAR', HeadingLevel.HEADING_2));
        const tablaSala = crearTablaInspeccionItems(areasData.sala);
        if (tablaSala) {
          docContent.push(tablaSala);
        }
        docContent.push(pSpacer(400));
        
        if (fotosAreas.sala && fotosAreas.sala.length > 0) {
          await insertarFotosSeccionWord(docContent, fotosAreas.sala, "FOTOS DE SALA DE ESTAR");
        }
      }

      // BAÑO SOCIAL
      if (areasData.banioSocial && areasData.banioSocial.length > 0) {
        docContent.push(pHeading('BAÑO SOCIAL', HeadingLevel.HEADING_2));
        const tablaBanoSocial = crearTablaInspeccionItems(areasData.banioSocial);
        if (tablaBanoSocial) {
          docContent.push(tablaBanoSocial);
        }
        docContent.push(pSpacer(400));
        
        if (fotosAreas.banioSocial && fotosAreas.banioSocial.length > 0) {
          await insertarFotosSeccionWord(docContent, fotosAreas.banioSocial, "FOTOS DE BAÑO SOCIAL");
        }
      }

      // BAÑO PRINCIPAL (compatibilidad formularios antiguos)
      if (areasData.banoPrincipal && areasData.banoPrincipal.length > 0) {
        docContent.push(pHeading('BAÑO PRINCIPAL', HeadingLevel.HEADING_2));
        const tablaBanoPrincipal = crearTablaInspeccionItems(areasData.banoPrincipal);
        if (tablaBanoPrincipal) {
          docContent.push(tablaBanoPrincipal);
        }
        docContent.push(pSpacer(400));
        
        if (fotosAreas.banoPrincipal && fotosAreas.banoPrincipal.length > 0) {
          await insertarFotosSeccionWord(docContent, fotosAreas.banoPrincipal, "FOTOS DE BAÑO PRINCIPAL");
        }
      }

      // ALCOBAS
      const numAlcobas = parseInt(formData.numAlcobas) || 0;
      for (let i = 1; i <= numAlcobas; i++) {
        const tieneAlcoba = areasData.alcobas[i] && areasData.alcobas[i].length > 0;
        const tieneBano = areasData.banosAlcobas?.[i]?.length > 0;
        const tieneCloset = areasData.closetsAlcobas?.[i]?.length > 0;
        const tieneFotosAlcoba = fotosAreas.alcobas[i] && fotosAreas.alcobas[i].length > 0;
        const tieneFotosBano = fotosAreas.banosAlcobas?.[i]?.length > 0;
        const tieneFotosCloset = fotosAreas.closetsAlcobas?.[i]?.length > 0;

        if (tieneAlcoba || tieneFotosAlcoba) {
          docContent.push(pHeading(`ALCOBA ${i}`, HeadingLevel.HEADING_2));
          if (tieneAlcoba) {
            const tablaAlcoba = crearTablaInspeccionItems(areasData.alcobas[i]);
            if (tablaAlcoba) {
              docContent.push(tablaAlcoba);
            }
            docContent.push(pSpacer(400));
          }
          
          if (tieneFotosAlcoba) {
            await insertarFotosSeccionWord(docContent, fotosAreas.alcobas[i], `FOTOS DE ALCOBA ${i}`);
          }
        }

        if (tieneBano || tieneFotosBano) {
          docContent.push(pHeading(`BAÑO - ALCOBA ${i}`, HeadingLevel.HEADING_2));
          if (tieneBano) {
            const tablaBano = crearTablaInspeccionItems(areasData.banosAlcobas[i]);
            if (tablaBano) {
              docContent.push(tablaBano);
            }
            docContent.push(pSpacer(400));
          }

          if (tieneFotosBano) {
            await insertarFotosSeccionWord(docContent, fotosAreas.banosAlcobas[i], `FOTOS DE BAÑO ALCOBA ${i}`);
          }
        }

        if (tieneCloset || tieneFotosCloset) {
          docContent.push(pHeading(`CLOSET - ALCOBA ${i}`, HeadingLevel.HEADING_2));
          if (tieneCloset) {
            const tablaCloset = crearTablaInspeccionItems(areasData.closetsAlcobas[i]);
            if (tablaCloset) {
              docContent.push(tablaCloset);
            }
            docContent.push(pSpacer(400));
          }

          if (tieneFotosCloset) {
            await insertarFotosSeccionWord(docContent, fotosAreas.closetsAlcobas[i], `FOTOS DE CLOSET ALCOBA ${i}`);
          }
        }
      }

      // Conclusiones
      if (formData.conclusiones) {
        docContent.push(pHeading('4 - CONCLUSIONES'));
        docContent.push(pBody(formData.conclusiones, { after: 400 }));
      }

      if (formData.observacionesPrincipales) {
        docContent.push(pHeading('4.1 - LAS PRINCIPALES OBSERVACIONES SON:', HeadingLevel.HEADING_2));
        docContent.push(pBody(formData.observacionesPrincipales, { after: 400 }));
        docContent.push(
          pBody(
            'Por lo anterior el propietario tiene todo el derecho de solicitar garantía al vendedor, de todos los puntos mencionados en el ítem 4.1 del presente informe.',
            { after: 400 }
          )
        );
      }

      docContent.push(
        pBody(
          'En espera de haber realizado satisfactoriamente la asignación de la Inspección y análisis del riesgo y agradeciendo la confianza depositada en nuestros servicios profesionales, suscribimos.',
          { after: 400 }
        )
      );

      docContent.push(pBody('ATENTAMENTE,', { after: 400 }));
      docContent.push(
        ...construirElementosFirmasActaWord(formData, {
          nombreEmpresa: 'Proser Riesgos SAS',
          tituloCliente: 'FIRMA DE QUIEN RECIBE LA VISITA',
        })
      );

      // Crear el documento
      const doc = new Document({
        styles: estilosDocumentoPropiedades,
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
                    alignment: AlignmentType.CENTER,
                    children: [tr('Reporte generado por Proser Riesgos SAS')],
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
        appendUploadFile(formDataFile, 'archivo', blob, nombreArchivo);
        
        try {
          const response = await fetch(`${BASE_URL}/api/historial-formularios/${formularioId}/archivo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formDataFile
          });
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
      
// Primero guardar el formulario (esto puede crear o actualizar)
      await handleGuardarEnHistorial();
      
// Luego generar el Word (usa el formularioId actualizado)
      await generarDocumentoWord();
      
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
    const clave = getClaveAlmacenamientoArea(area);
    const fotos = clave && alcobaNum ? (fotosAreas?.[clave]?.[alcobaNum] || []) : (fotosAreas?.[area] || []);
    const areaKey = clave && alcobaNum ? `${area}${alcobaNum}` : area;
    const enSeccion = contarFotosEnSeccion(fotosAreas, clave || area, alcobaNum);
    const totalFotos = contarFotosTotales(fotosAreas);
    const seccionLlena = enSeccion >= MAX_FOTOS_POR_SECCION;
    const informeLleno = totalFotos >= MAX_FOTOS_TOTAL;
    const tituloArea = area === 'banoAlcoba' && alcobaNum
      ? `BAÑO ALCOBA ${alcobaNum}`
      : area === 'closetAlcoba' && alcobaNum
        ? `CLOSET ALCOBA ${alcobaNum}`
        : alcobaNum
          ? `ALCOBA ${alcobaNum}`
          : area.toUpperCase();
    
    // Usar utilidades centralizadas de imageUtils
    
    return (
      <div
        className="mb-6 mt-6 rounded-lg border p-4 sm:p-5"
        style={{ borderColor: t.borderColor, backgroundColor: t.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
      >
        <h4 className="mb-1 font-heading text-base font-bold sm:text-lg" style={{ color: t.textPrimary }}>
          Fotos de {tituloArea}
        </h4>
        <p className="mb-4 text-xs" style={{ color: t.textSecondary }}>
          {enSeccion} / {MAX_FOTOS_POR_SECCION} en esta sección · {totalFotos} / {MAX_FOTOS_TOTAL} en el informe ·
          se suben a S3 al guardar (máx. {MAX_FOTO_TAMANO_MB} MB por archivo, comprimidas a ~{FOTO_COMPRESION_OPCIONES.maxSizeKB} KB)
        </p>
        
        <div
          className={`mb-6 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
            seccionLlena || informeLleno ? '' : ''
          }`}
          style={{
            borderColor: seccionLlena || informeLleno ? '#F59E0B' : t.borderColor,
            backgroundColor: seccionLlena || informeLleno
              ? (t.theme === 'dark' ? 'rgba(245,158,11,0.1)' : '#FFFBEB')
              : (t.theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#F9FAFB'),
          }}
        >
          <FaUpload className="mx-auto mb-2 h-8 w-8" style={{ color: t.textSecondary }} />
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(area, e.target.files, alcobaNum)}
            className="hidden"
            id={`file-upload-${areaKey}`}
            disabled={seccionLlena || informeLleno}
          />
          <label
            htmlFor={`file-upload-${areaKey}`}
            className={`inline-block rounded-lg px-6 py-2 font-semibold ${
              seccionLlena || informeLleno
                ? 'cursor-not-allowed opacity-60'
                : `cursor-pointer ${complexBtnPrimary}`
            }`}
          >
            {seccionLlena || informeLleno ? 'Límite de fotos alcanzado' : 'Seleccionar imágenes'}
          </label>
          {!seccionLlena && !informeLleno && (
            <p className="mt-2 text-xs" style={{ color: t.textSecondary }}>
              Las imágenes se comprimen y se guardan en S3 al guardar el informe
            </p>
          )}
        </div>

        {fotos.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fotos.map((foto) => {
              const imageUrl = getImageUrl(foto);
              return (
                <div
                  key={foto.id}
                  className="rounded-lg border p-4 shadow-sm"
                  style={{ borderColor: t.borderColor, backgroundColor: t.cardBg }}
                >
                  <div className="relative mb-3">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={foto.nombre || 'Imagen'}
                        className="h-48 w-full cursor-pointer rounded-lg border object-contain"
                        style={{ backgroundColor: t.inputBg, borderColor: t.borderColor }}
                        onClick={() => {
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
                        onError={createImageErrorHandler(foto, (img) => {
                          img.style.display = 'none';
                          const container = img.closest('.relative') || img.parentElement;
                          if (container && !container.querySelector('.image-error-message')) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'image-error-message flex h-48 w-full items-center justify-center rounded-lg';
                            errorDiv.style.backgroundColor = t.theme === 'dark' ? '#252525' : '#E5E7EB';
                            errorDiv.innerHTML = `
                              <span class="px-2 text-center text-xs text-gray-600">
                                Imagen no disponible<br/>
                                en el servidor
                              </span>
                            `;
                            container.appendChild(errorDiv);
                          }
                        })}
                      />
                    ) : (
                      <div
                        className="flex h-48 w-full items-center justify-center rounded-lg"
                        style={{ backgroundColor: t.theme === 'dark' ? '#252525' : '#E5E7EB' }}
                      >
                        <span className="text-sm" style={{ color: t.textSecondary }}>Sin imagen</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => eliminarFoto(area, foto.id, alcobaNum)}
                      className={`absolute right-2 top-2 rounded-full p-2 shadow-lg ${complexBtnDanger}`}
                      title="Eliminar foto"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                  <ThemedTextarea
                    value={foto.descripcion || ''}
                    onChange={(e) => actualizarDescripcionFoto(area, foto.id, e.target.value, alcobaNum)}
                    placeholder="Descripción de la foto..."
                    rows={2}
                    className="!resize-none"
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
    const clave = getClaveAlmacenamientoArea(area);
    const items = clave && alcobaNum ? (areasData?.[clave]?.[alcobaNum] || []) : (areasData?.[area] || []);
    const campos = area === 'banoAlcoba'
      ? camposBase.banoPrincipal
      : area === 'closetAlcoba'
        ? camposBase.closet
        : area === 'alcoba'
          ? camposBase.alcoba
          : camposBase[area];
    const tituloItems = area === 'banoAlcoba' && alcobaNum
      ? `- Baño Alcoba ${alcobaNum}`
      : area === 'closetAlcoba' && alcobaNum
        ? `- Closet Alcoba ${alcobaNum}`
        : alcobaNum
          ? `- Alcoba ${alcobaNum}`
          : `- ${area.toUpperCase()}`;
    
    return (
      <div
        className="mb-4 rounded-lg border p-4"
        style={{ borderColor: t.borderColor, backgroundColor: t.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-heading text-sm font-semibold sm:text-base" style={{ color: t.textPrimary }}>
            Items de inspección {tituloItems}
          </h4>
          <button
            type="button"
            onClick={() => agregarItem(area, alcobaNum)}
            className={complexBtnPrimary}
          >
            <FaPlus className="h-4 w-4" />
            Agregar item
          </button>
        </div>
        
        {items.length === 0 ? (
          <p className="text-sm italic" style={{ color: t.textSecondary }}>
            No hay items agregados. Use «Agregar item» o los botones de parámetros predefinidos.
          </p>
        ) : (
          <FormTable>
            <FormTableHead>
              <FormTableTh className="!w-auto">Parámetro</FormTableTh>
              <FormTableTh className="!w-auto">Cumple</FormTableTh>
              <FormTableTh className="!w-auto">Síntoma</FormTableTh>
              <FormTableTh className="!w-auto">Observación</FormTableTh>
              <FormTableTh className="!w-auto">Acción</FormTableTh>
            </FormTableHead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <FormTableTd>
                    <TableFieldInput
                      type="text"
                      value={item.parametro || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'parametro', e.target.value, alcobaNum)}
                      placeholder="Ej: Muros, Pisos, etc."
                    />
                  </FormTableTd>
                  <FormTableTd>
                    <TableFieldSelect
                      value={item.cumple || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'cumple', e.target.value, alcobaNum)}
                      className={
                        item.cumple?.toLowerCase() === 'si' ? '!bg-green-100' :
                        item.cumple?.toLowerCase() === 'no' ? '!bg-red-100' :
                        item.cumple?.toLowerCase() === 'parcialmente' ? '!bg-yellow-100' : ''
                      }
                    >
                      <option value="">--</option>
                      <option value="si">SI</option>
                      <option value="no">NO</option>
                      <option value="parcialmente">Parcialmente</option>
                      <option value="na">NA</option>
                    </TableFieldSelect>
                  </FormTableTd>
                  <FormTableTd>
                    <TableFieldInput
                      type="text"
                      value={item.sintoma || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'sintoma', e.target.value, alcobaNum)}
                      placeholder="Síntoma observado"
                    />
                  </FormTableTd>
                  <FormTableTd>
                    <TableFieldInput
                      type="text"
                      value={item.observacion || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'observacion', e.target.value, alcobaNum)}
                      placeholder="Observación"
                    />
                  </FormTableTd>
                  <FormTableTd>
                    <button
                      type="button"
                      onClick={() => eliminarItem(area, item.id, alcobaNum)}
                      className={complexBtnDanger}
                      title="Eliminar item"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </FormTableTd>
                </tr>
              ))}
            </tbody>
          </FormTable>
        )}
        
        {campos && campos.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm" style={{ color: t.textSecondary }}>Agregar parámetros predefinidos:</p>
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
                    
                    if (clave && alcobaNum) {
                      setAreasData(prev => ({
                        ...prev,
                        [clave]: {
                          ...prev[clave],
                          [alcobaNum]: [...(prev[clave]?.[alcobaNum] || []), nuevoItem]
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
                  className={complexBtnGhost}
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
    <div className="min-h-screen p-2 sm:p-4 lg:p-8" style={{ backgroundColor: t.bgMain }}>
      <div
        className="mx-auto max-w-5xl rounded-lg p-3 shadow-lg sm:p-4 lg:p-6"
        style={{ backgroundColor: t.cardBg, border: `1px solid ${t.borderColor}` }}
      >
        <div
          className="mb-6 flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center"
          style={{ borderColor: t.borderColor }}
        >
          <img src={Logo} alt="Logo PROSER" className="h-12 object-contain sm:h-16" />
          {formularioId && formularioId !== 'nuevo' && (
            <span
              className="rounded-full px-3 py-1 text-xs font-medium sm:text-sm"
              style={{
                backgroundColor: t.theme === 'dark' ? 'rgba(34,197,94,0.15)' : '#DCFCE7',
                color: t.theme === 'dark' ? '#86EFAC' : '#166534',
              }}
            >
              Guardado automático activo
            </span>
          )}
        </div>

        <div className="mb-8 text-center">
          <h1 className="mb-2 font-heading text-2xl font-bold sm:text-3xl" style={{ color: t.textPrimary }}>
            FORMULARIO DE INSPECCIÓN DE PROPIEDAD
          </h1>
          <p className="text-sm" style={{ color: t.textSecondary }}>
            Complete los campos, agregue ítems por área y adjunte el registro fotográfico
          </p>
        </div>

        {formularioId && formularioId !== 'nuevo' && (
          <InfoBanner variant="success">
            <span>✓</span>
            <span>Los cambios se guardan automáticamente cada 2 segundos</span>
          </InfoBanner>
        )}

        {error && (
          <InfoBanner variant="error">
            <span>{error}</span>
          </InfoBanner>
        )}

        {cargando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className="rounded-lg p-6 text-center shadow-xl"
              style={{ backgroundColor: t.cardBg, border: `1px solid ${t.borderColor}` }}
            >
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: '#DC2626' }} />
              <p style={{ color: t.textPrimary }}>Procesando, por favor espera...</p>
            </div>
          </div>
        )}

        <LlenadoGuiaPropiedades />

        <form className="space-y-6">
          <SectionCard
            title="1. Información general del inmueble"
            subtitle="Clase, tipo, ubicación y contacto de quien recibe la visita"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Clase de inmueble</FieldLabel>
                <ThemedSelect
                  name="claseInmueble"
                  value={formData.claseInmueble}
                  onChange={(e) => handleClaseInmuebleChange(e.target.value)}
                >
                  <option value="">Seleccione una clase...</option>
                  {formData.claseInmueble && !CLASES_INMUEBLE.includes(formData.claseInmueble) && (
                    <option value={formData.claseInmueble}>{formData.claseInmueble}</option>
                  )}
                  {CLASES_INMUEBLE.map((clase) => (
                    <option key={clase} value={clase}>{clase}</option>
                  ))}
                </ThemedSelect>
              </div>
              <div>
                <FieldLabel>Tipo de inmueble</FieldLabel>
                <ThemedSelect
                  name="tipoInmueble"
                  value={formData.tipoInmueble}
                  onChange={(e) => handleInputChange('tipoInmueble', e.target.value)}
                  disabled={!formData.claseInmueble}
                >
                  <option value="">
                    {formData.claseInmueble ? 'Seleccione un tipo...' : 'Seleccione primero una clase'}
                  </option>
                  {formData.tipoInmueble && !tiposInmuebleDisponibles.includes(formData.tipoInmueble) && (
                    <option value={formData.tipoInmueble}>{formData.tipoInmueble}</option>
                  )}
                  {tiposInmuebleDisponibles.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </ThemedSelect>
              </div>
              <div>
                <FieldLabel>Dirección del inmueble</FieldLabel>
                <ThemedInput
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Nombre del cliente</FieldLabel>
                <ThemedInput
                  type="text"
                  name="nombreInmueble"
                  value={formData.nombreInmueble}
                  onChange={(e) => handleInputChange('nombreInmueble', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Localización</FieldLabel>
                <ThemedInput
                  type="text"
                  name="localizacion"
                  value={formData.localizacion}
                  onChange={(e) => handleInputChange('localizacion', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Ciudad</FieldLabel>
                <ThemedInput
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Departamento</FieldLabel>
                <ThemedInput
                  type="text"
                  name="departamento"
                  value={formData.departamento}
                  onChange={(e) => handleInputChange('departamento', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Quien recibe la visita</FieldLabel>
                <ThemedInput
                  type="text"
                  name="destinacion"
                  value={formData.destinacion}
                  onChange={(e) => handleInputChange('destinacion', e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="1.2 Información jurídica del inmueble" subtitle="Documento de propiedad y notaría">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Tipo de documento de propiedad</FieldLabel>
                <ThemedInput
                  type="text"
                  name="tipoDocumento"
                  value={formData.tipoDocumento}
                  onChange={(e) => handleInputChange('tipoDocumento', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Número de documento de propiedad</FieldLabel>
                <ThemedInput
                  type="text"
                  name="numeroDocumento"
                  value={formData.numeroDocumento}
                  onChange={(e) => handleInputChange('numeroDocumento', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Fecha del documento</FieldLabel>
                <ThemedInput
                  type="date"
                  name="fechaDocumento"
                  value={formData.fechaDocumento}
                  onChange={(e) => handleInputChange('fechaDocumento', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Notaría y lugar de expedición</FieldLabel>
                <ThemedInput
                  type="text"
                  name="notaria"
                  value={formData.notaria}
                  onChange={(e) => handleInputChange('notaria', e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="2. Inspección métrica" subtitle="Observaciones generales de medición y dimensiones">
            <FieldLabel>Observaciones de inspección métrica</FieldLabel>
            <ThemedTextarea
              name="inspeccionMetrica"
              value={formData.inspeccionMetrica}
              onChange={(e) => handleInputChange('inspeccionMetrica', e.target.value)}
              rows={4}
            />
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
          </SectionCard>

          <SectionCard title="3. Inspección por áreas" subtitle="Tablas de cumplimiento y registro fotográfico por zona">
            <SubsectionTitle>3.1 — Cocina</SubsectionTitle>
            {renderTablaInspeccion('cocina')}
            {renderFotosArea('cocina')}
            <AreaDivider />

            <SubsectionTitle>3.2 — Zona de ropas</SubsectionTitle>
            {renderTablaInspeccion('ropas')}
            {renderFotosArea('ropas')}
            <AreaDivider />

            <SubsectionTitle>3.3 — Sala de estar</SubsectionTitle>
            {renderTablaInspeccion('sala')}
            {renderFotosArea('sala')}
            <AreaDivider />

            <SubsectionTitle>3.4 — Baño social</SubsectionTitle>
            {renderTablaInspeccion('banioSocial')}
            {renderFotosArea('banioSocial')}
            <AreaDivider />

            <SubsectionTitle>Alcobas</SubsectionTitle>
            <div className="mb-4">
              <FieldLabel>¿Cuántas alcobas hay?</FieldLabel>
              <div className="flex flex-wrap items-center gap-3">
                <ThemedInput
                  type="number"
                  name="numAlcobas"
                  value={formData.numAlcobas}
                  onChange={(e) => {
                    handleInputChange('numAlcobas', e.target.value);
                    setTimeout(() => generateBedrooms(), 100);
                  }}
                  min="0"
                  className="!w-32"
                />
                <button
                  type="button"
                  onClick={generateBedrooms}
                  className={complexBtnSecondary}
                >
                  Generar alcobas
                </button>
              </div>
            </div>
              
            {Array.from({ length: parseInt(formData.numAlcobas) || 0 }, (_, i) => i + 1).map(alcobaNum => (
              <div
                key={alcobaNum}
                className="mb-6 rounded-lg border p-4"
                style={{ borderColor: t.borderColor, backgroundColor: t.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h4 className="font-heading text-base font-bold" style={{ color: t.textPrimary }}>
                    Alcoba {alcobaNum}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleBanoAlcoba(alcobaNum)}
                      className={formData.alcobasConBano?.[alcobaNum] ? complexBtnPrimary : complexBtnGhost}
                    >
                      {formData.alcobasConBano?.[alcobaNum] ? 'Ocultar baño' : '+ Agregar baño'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleClosetAlcoba(alcobaNum)}
                      className={formData.alcobasConCloset?.[alcobaNum] ? complexBtnPrimary : complexBtnGhost}
                    >
                      {formData.alcobasConCloset?.[alcobaNum] ? 'Ocultar closet' : '+ Agregar closet'}
                    </button>
                  </div>
                </div>
                {renderTablaInspeccion('alcoba', alcobaNum)}
                {renderFotosArea('alcoba', alcobaNum)}

                {formData.alcobasConBano?.[alcobaNum] && (
                  <div
                    className="mt-6 rounded-lg border p-4 pt-6"
                    style={{
                      borderColor: t.borderColor,
                      backgroundColor: t.theme === 'dark' ? 'rgba(220,38,38,0.06)' : t.accentSoft,
                    }}
                  >
                    <h4 className="mb-4 font-heading text-base font-bold" style={{ color: t.textPrimary }}>
                      Baño — Alcoba {alcobaNum}
                    </h4>
                    {renderTablaInspeccion('banoAlcoba', alcobaNum)}
                    {renderFotosArea('banoAlcoba', alcobaNum)}
                  </div>
                )}

                {formData.alcobasConCloset?.[alcobaNum] && (
                  <div
                    className="mt-6 rounded-lg border p-4 pt-6"
                    style={{
                      borderColor: t.borderColor,
                      backgroundColor: t.theme === 'dark' ? 'rgba(220,38,38,0.06)' : t.accentSoft,
                    }}
                  >
                    <h4 className="mb-4 font-heading text-base font-bold" style={{ color: t.textPrimary }}>
                      Closet — Alcoba {alcobaNum}
                    </h4>
                    {renderTablaInspeccion('closetAlcoba', alcobaNum)}
                    {renderFotosArea('closetAlcoba', alcobaNum)}
                  </div>
                )}
              </div>
            ))}
          </SectionCard>

          <SectionCard title="4. Conclusiones" subtitle="Resumen general de la inspección">
            <FieldLabel>Conclusiones</FieldLabel>
            <ThemedTextarea
              name="conclusiones"
              value={formData.conclusiones}
              onChange={(e) => handleInputChange('conclusiones', e.target.value)}
              rows={4}
            />
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
          </SectionCard>

          <SectionCard title="4.1 Principales observaciones" subtitle="Hallazgos más relevantes del informe">
            <FieldLabel>Principales observaciones</FieldLabel>
            <ThemedTextarea
              name="observacionesPrincipales"
              value={formData.observacionesPrincipales}
              onChange={(e) => handleInputChange('observacionesPrincipales', e.target.value)}
              rows={4}
            />
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
          </SectionCard>

          <SectionCard
            title="Firmas"
            subtitle="Quien recibe la visita y ajustador registrado en el sistema"
          >
            <SeccionFirmasActa
              formData={formData}
              onInputChange={handleInputChange}
              tituloCliente="FIRMA DE QUIEN RECIBE LA VISITA"
              permitirRegistrarAjustadores
              sinContenedor
            />
          </SectionCard>

          <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${t.borderColor}` }}>
            <BotonesHistorial
              onGuardarEnHistorial={handleGuardarEnHistorial}
              onExportar={handleExportar}
              tipoFormulario={TIPOS_FORMULARIOS.INSPECCION_PROPIEDADES}
              tituloFormulario="Inspección de Propiedades"
              deshabilitado={false}
              guardando={guardando}
              exportando={exportando}
            />
          </div>
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
