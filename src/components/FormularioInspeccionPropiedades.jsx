import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  vincularInspeccionCasoPropiedades,
} from '../services/propiedadesService';
import { AUTO_SAVE_ENABLED } from '../config/autoSaveConfig';
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
import { generarResumenInspeccion } from '../utils/propiedadesObservacionesUtils';
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
import {
  SECCIONES_INFORME_PROPIEDADES,
  normalizarSeccionesActivas,
  estaSeccionPropiedadesActiva,
  construirNumeracionActiva,
  obtenerFilasIndicePropiedades,
} from './inspeccion/seccionesInformePropiedades.js';
import {
  resolverPlantillaAreas,
  idsAreasDesdePlantilla,
  obtenerCamposArea,
  tituloArea,
} from './inspeccion/propiedadesAreasConfig.js';
import {
  combinarAreasInspeccion,
  cargarHistorialAreasGlobal,
  registrarAreaEnHistorialGlobal,
  aprenderParametrosAreasPersonalizadas,
  areaPersonalizadaYaExiste,
  crearEntradaAreaPersonalizada,
  normalizarAreasPersonalizadas,
  extraerParametrosDeItems,
} from './inspeccion/propiedadesAreasPersonalizadas.js';

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

export default function FormularioInspeccionPropiedades({
  casoPropiedadesId = null,
  casoPrefill = null,
  inspeccionHistorialId = null,
} = {}) {
  const ui = usePropiedadesTheme();
  const { t } = useTranslation();
  const tp = (key, opts) => t(`inspection.ui.formulario_propiedades.${key}`, opts);
  const labelClase = (clase) => {
    const key = `inspection.ui.formulario_propiedades.clases.${clase}`;
    const translated = t(key);
    return translated !== key ? translated : clase;
  };
  const labelTipo = (tipo) => {
    const key = `inspection.ui.formulario_propiedades.tipos.${tipo}`;
    const translated = t(key);
    return translated !== key ? translated : tipo;
  };
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const idFromRoute = inspeccionHistorialId || (idParam && idParam !== 'nuevo' ? idParam : null);
  // 🔑 Inicializar formularioId con id de URL / prop del módulo Propiedades
  const [formularioId, setFormularioId] = useState(idFromRoute || null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);
  const guardarAutomaticoRef = useRef(null);
  const cargarFormularioExistenteRef = useRef(null);
  
  // Estado para modal de confirmación
  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    titulo: '',
    mensaje: '',
    tipo: 'success',
    botonTexto: tp('accept'),
    mostrarCancelar: false,
    onConfirmar: null
  });

  const [seccionesActivas, setSeccionesActivas] = useState(() => normalizarSeccionesActivas());

  // Estado principal del formulario
  const [formData, setFormData] = useState(() => ({
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
    /** Áreas creadas por el inspector en este informe */
    areasPersonalizadas: [],
    ...(casoPrefill && typeof casoPrefill === 'object' ? casoPrefill : {}),
  }));

  const [historialAreasGlobal, setHistorialAreasGlobal] = useState(() => cargarHistorialAreasGlobal());
  const [nuevaAreaTitulo, setNuevaAreaTitulo] = useState('');

  const plantillaAreas = useMemo(
    () => resolverPlantillaAreas(formData.claseInmueble, formData.tipoInmueble),
    [formData.claseInmueble, formData.tipoInmueble]
  );

  const areasEfectivas = useMemo(
    () => combinarAreasInspeccion(plantillaAreas, formData.areasPersonalizadas),
    [plantillaAreas, formData.areasPersonalizadas]
  );

  const incluirSeccion = useCallback(
    (id) => estaSeccionPropiedadesActiva(seccionesActivas, id, areasEfectivas),
    [seccionesActivas, areasEfectivas]
  );

  const toggleSeccionInforme = useCallback((id) => {
    const cfg = SECCIONES_INFORME_PROPIEDADES.find((s) => s.id === id);
    const subArea = areasEfectivas.some(
      (a) => (a.tipo === 'alcobas' ? 'alcobas' : a.id) === id
    );
    if (!cfg && !subArea) return;
    if (cfg?.obligatoria || cfg?.seleccionable === false) return;
    setSeccionesActivas((prev) => {
      const siguiente = { ...prev, [id]: !estaSeccionPropiedadesActiva(prev, id, areasEfectivas) };
      return normalizarSeccionesActivas(siguiente, areasEfectivas);
    });
  }, [areasEfectivas]);

  const filasIndiceInforme = useMemo(
    () => obtenerFilasIndicePropiedades(seccionesActivas, areasEfectivas, t),
    [seccionesActivas, areasEfectivas, t]
  );

  useEffect(() => {
    setSeccionesActivas((prev) => normalizarSeccionesActivas(prev, areasEfectivas));
  }, [areasEfectivas]);

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

  const AREAS_RESIDENCIALES_BASE = ['cocina', 'ropas', 'sala', 'banioSocial', 'banoPrincipal'];

  const normalizarAreasData = (data) => {
    const result = {
      alcobas: (data?.alcobas && typeof data.alcobas === 'object' && !Array.isArray(data.alcobas)) ? data.alcobas : {},
      banosAlcobas: (data?.banosAlcobas && typeof data.banosAlcobas === 'object' && !Array.isArray(data.banosAlcobas)) ? data.banosAlcobas : {},
      closetsAlcobas: (data?.closetsAlcobas && typeof data.closetsAlcobas === 'object' && !Array.isArray(data.closetsAlcobas)) ? data.closetsAlcobas : {},
    };
    if (!data || typeof data !== 'object') {
      for (const key of AREAS_RESIDENCIALES_BASE) result[key] = [];
      return result;
    }
    for (const [key, val] of Object.entries(data)) {
      if (key === 'alcobas' || key === 'banosAlcobas' || key === 'closetsAlcobas') continue;
      result[key] = Array.isArray(val) ? val : [];
    }
    for (const key of AREAS_RESIDENCIALES_BASE) {
      if (!result[key]) result[key] = [];
    }
    return result;
  };

  const normalizarFotosAreas = (data) => {
    const result = {
      alcobas: (data?.alcobas && typeof data.alcobas === 'object' && !Array.isArray(data.alcobas)) ? data.alcobas : {},
      banosAlcobas: (data?.banosAlcobas && typeof data.banosAlcobas === 'object' && !Array.isArray(data.banosAlcobas)) ? data.banosAlcobas : {},
      closetsAlcobas: (data?.closetsAlcobas && typeof data.closetsAlcobas === 'object' && !Array.isArray(data.closetsAlcobas)) ? data.closetsAlcobas : {},
    };
    if (!data || typeof data !== 'object') {
      for (const key of AREAS_RESIDENCIALES_BASE) result[key] = [];
      return result;
    }
    for (const [key, val] of Object.entries(data)) {
      if (key === 'alcobas' || key === 'banosAlcobas' || key === 'closetsAlcobas') continue;
      result[key] = Array.isArray(val) ? val : [];
    }
    for (const key of AREAS_RESIDENCIALES_BASE) {
      if (!result[key]) result[key] = [];
    }
    return result;
  };
  const normalizarAreasDataRef = useRef(normalizarAreasData);
  const normalizarFotosAreasRef = useRef(normalizarFotosAreas);
  const procesarFotosDesdeLocalStorageRef = useRef(null);
  normalizarAreasDataRef.current = normalizarAreasData;
  normalizarFotosAreasRef.current = normalizarFotosAreas;

  // Ref para debounce de guardado automático
  const autoSaveTimeoutRef = useRef(null);
  const lastSavedDataRef = useRef(null);
  const resumenEditadoManualRef = useRef(false);

  // Cargar datos desde localStorage al iniciar (solo si no hay ID de historial ni caso del módulo)
  useEffect(() => {
    const cargarDatos = async () => {
      if (!AUTO_SAVE_ENABLED) return;
      if (idFromRoute || casoPropiedadesId) return;
      if (!idParam || idParam === 'nuevo') {
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
                const areasNorm = normalizarAreasDataRef.current(datosParseados.areasData);
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
                const fotosProcesadas = await procesarFotosDesdeLocalStorageRef.current(datosParseados.fotosAreas);
                setFotosAreas(normalizarFotosAreasRef.current(fotosProcesadas));
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
  }, [idFromRoute, casoPropiedadesId, idParam]);

  // Guardar datos automáticamente cuando cambien (con debounce para evitar guardados excesivos)
  // Solo se guarda si estamos en la ruta del formulario de propiedades
  useEffect(() => {
    if (!AUTO_SAVE_ENABLED) return;
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
    if (!AUTO_SAVE_ENABLED) return;
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
          ? tp('photoLimitTotal', { max: MAX_FOTOS_TOTAL })
          : tp('photoLimitSection', { max: MAX_FOTOS_POR_SECCION })
      );
      return;
    }

    if (cupo < files.length) {
      alert(tp('photosAddedPartial', { count: cupo }));
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
      alert(tp('errorProcessingImages'));
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

  const sincronizarAprendizajeAreas = useCallback(() => {
    const personalizadas = formData.areasPersonalizadas || [];
    if (!personalizadas.length) return;
    const aprendidas = aprenderParametrosAreasPersonalizadas(personalizadas, areasData);
    const cambio = JSON.stringify(aprendidas) !== JSON.stringify(personalizadas);
    if (cambio) {
      setFormData((prev) => ({ ...prev, areasPersonalizadas: aprendidas }));
    }
    setHistorialAreasGlobal(cargarHistorialAreasGlobal());
  }, [formData.areasPersonalizadas, areasData]);

  const aplicarResumenInspeccion = useCallback((forzar = false) => {
    if (!forzar && resumenEditadoManualRef.current) return;
    const resumen = generarResumenInspeccion(areasData, areasEfectivas, {
      numAlcobas: formData.numAlcobas,
      incluirArea: incluirSeccion,
    });
    setFormData((prev) => ({
      ...prev,
      observacionesPrincipales: resumen.observacionesPrincipales,
      conclusiones: resumen.conclusiones,
    }));
    if (forzar) resumenEditadoManualRef.current = false;
  }, [areasData, areasEfectivas, formData.numAlcobas, incluirSeccion]);

  const marcarResumenEditadoManual = useCallback(() => {
    resumenEditadoManualRef.current = true;
  }, []);

  const resumenInspeccion = useMemo(
    () =>
      generarResumenInspeccion(areasData, areasEfectivas, {
        numAlcobas: formData.numAlcobas,
        incluirArea: incluirSeccion,
      }),
    [areasData, areasEfectivas, formData.numAlcobas, incluirSeccion]
  );

  // Función para guardado automático
  const guardarAutomatico = async () => {
    if (!AUTO_SAVE_ENABLED) return;
    if (!formularioId || formularioId === 'nuevo') return; // Solo guardar si ya existe un ID
    
    const datosActuales = {
      formData,
      areasData,
      fotosAreas,
      seccionesActivas,
    };
    
    const datosString = JSON.stringify(datosActuales);
    if (lastSavedDataRef.current === datosString) return; // No guardar si no hay cambios
    
    lastSavedDataRef.current = datosString;
    
    try {
      const nombreCliente = formData.nombreInmueble ? capitalizeFirstLetter(formData.nombreInmueble) : tp('untitledClient');
      
      // Procesar fotos antes de guardar (solo las nuevas, mantener las existentes)
      const fotosProcesadas = await procesarFotosParaGuardar();
      
      const datosFormulario = {
        tipo: TIPOS_FORMULARIOS.INSPECCION_PROPIEDADES,
        titulo: tp('historyTitle', { client: nombreCliente }),
        datos: {
          formData: { ...formData },
          areasData: { ...areasData },
          fotosAreas: fotosProcesadas,
          seccionesActivas,
        },
        fechaModificacion: obtenerFechaHoraActualISO(),
      };
      
      await historialService.actualizarFormulario(formularioId, datosFormulario);
      const actualizado = await historialService.obtenerFormulario(formularioId);
      await sincronizarFotosDesdeDatosGuardados(actualizado?.datos);
      sincronizarAprendizajeAreas();
} catch (error) {
      console.error('Error en guardado automático:', error);
    }
  };

  guardarAutomaticoRef.current = guardarAutomatico;

  useEffect(() => {
    if (!formData.areasPersonalizadas?.length) return undefined;
    const timer = setTimeout(() => sincronizarAprendizajeAreas(), 2000);
    return () => clearTimeout(timer);
  }, [areasData, sincronizarAprendizajeAreas, formData.areasPersonalizadas?.length]);

  useEffect(() => {
    const timer = setTimeout(() => aplicarResumenInspeccion(false), 1000);
    return () => clearTimeout(timer);
  }, [areasData, areasEfectivas, formData.numAlcobas, seccionesActivas, aplicarResumenInspeccion]);

  useEffect(() => {
    if (!formularioId || formularioId === 'nuevo') return;
    guardarAutomaticoRef.current?.();
  }, [seccionesActivas, formularioId]);

  // Función para mostrar modal de confirmación
  const mostrarModalConfirmacion = (titulo, mensaje, tipo = 'success', botonTexto = tp('accept'), mostrarCancelar = false, onConfirmar = null) => {
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

  const agregarAreaPersonalizada = (titulo, parametrosFrecuentes = []) => {
    const tituloNorm = String(titulo || nuevaAreaTitulo).trim();
    if (!tituloNorm) return;

    if (areaPersonalizadaYaExiste(areasEfectivas, tituloNorm)) {
      mostrarModalConfirmacion(
        tp('areaExistsTitle'),
        tp('areaExistsMessage', { title: tituloNorm }),
        'error'
      );
      return;
    }

    const hist = historialAreasGlobal.find((h) => h.titulo.toLowerCase() === tituloNorm.toLowerCase());
    const params = parametrosFrecuentes.length
      ? parametrosFrecuentes
      : (hist?.parametrosFrecuentes || []);

    const entrada = crearEntradaAreaPersonalizada(tituloNorm, params);

    setFormData((prev) => ({
      ...prev,
      areasPersonalizadas: [...normalizarAreasPersonalizadas(prev.areasPersonalizadas), entrada],
    }));
    setAreasData((prev) => ({ ...prev, [entrada.id]: prev[entrada.id] || [] }));
    setFotosAreas((prev) => ({ ...prev, [entrada.id]: prev[entrada.id] || [] }));
    setSeccionesActivas((prev) => ({ ...prev, [entrada.id]: true }));
    setNuevaAreaTitulo('');
    setHistorialAreasGlobal(registrarAreaEnHistorialGlobal(tituloNorm, params));
    programarGuardadoAutomatico();
  };

  const eliminarAreaPersonalizada = (areaId) => {
    setFormData((prev) => ({
      ...prev,
      areasPersonalizadas: (prev.areasPersonalizadas || []).filter((a) => a.id !== areaId),
    }));
    setSeccionesActivas((prev) => ({ ...prev, [areaId]: false }));
    programarGuardadoAutomatico();
  };

  // Cargar formulario existente si hay ID y sincronizar formularioId con URL / módulo Propiedades
  useEffect(() => {
    if (idFromRoute) {
      setFormularioId((actual) => (actual === idFromRoute ? actual : idFromRoute));
      cargarFormularioExistenteRef.current?.(idFromRoute);
    } else if (casoPrefill && typeof casoPrefill === 'object') {
      // Nueva inspección desde caso: precargar solo datos básicos (sin pisar si ya hay historial)
      setFormData((prev) => ({
        ...prev,
        ...casoPrefill,
      }));
    }
  }, [idFromRoute, casoPrefill]);

  const cargarFormularioExistente = async (historialId) => {
    try {
      setCargando(true);
      const formulario = await historialService.obtenerFormulario(historialId);
      
      if (formulario && formulario.datos) {
        const datos = formulario.datos;
        
        // Manejar estructura nueva (con formData separado) y antigua (datos directos)
        if (datos.formData) {
          const formMigrado = migrarFirmasActa(datos.formData || {});
          formMigrado.areasPersonalizadas = normalizarAreasPersonalizadas(formMigrado.areasPersonalizadas);
          
          if (datos.areasData) {
            const areasNorm = normalizarAreasData(datos.areasData);
            const { areas, form } = migrarDatosBanoAlcoba(areasNorm, formMigrado);
            setAreasData(areas);
            setFormData(form);
          } else {
            setFormData(formMigrado);
          }

          if (datos.seccionesActivas) {
            setSeccionesActivas(
              normalizarSeccionesActivas(
                datos.seccionesActivas,
                combinarAreasInspeccion(
                  resolverPlantillaAreas(formMigrado.claseInmueble, formMigrado.tipoInmueble),
                  formMigrado.areasPersonalizadas
                )
              )
            );
          }
          
          if (datos.fotosAreas) {
// Procesar fotos desde servidor
            const fotosProcesadas = {};
            for (const [area, fotos] of Object.entries(datos.fotosAreas)) {
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
          }
        } else {
          // Estructura antigua: datos directos (compatibilidad hacia atrás)
          // Extraer formData de los datos directos
          const { areasData: areasDataGuardado, fotosAreas: fotosAreasGuardado, ...formDataDirecto } = datos;
          const formMigrado = migrarFirmasActa(formDataDirecto);
          formMigrado.areasPersonalizadas = normalizarAreasPersonalizadas(formMigrado.areasPersonalizadas);
          
          if (areasDataGuardado) {
            const areasNorm = normalizarAreasData(areasDataGuardado);
            const { areas, form } = migrarDatosBanoAlcoba(areasNorm, formMigrado);
            setAreasData(areas);
            setFormData(form);
          } else {
            setFormData(formMigrado);
          }

          if (datos.seccionesActivas) {
            setSeccionesActivas(
              normalizarSeccionesActivas(
                datos.seccionesActivas,
                combinarAreasInspeccion(
                  resolverPlantillaAreas(formMigrado.claseInmueble, formMigrado.tipoInmueble),
                  formMigrado.areasPersonalizadas
                )
              )
            );
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
        }
      }
    }
    } catch (error) {
      console.error('Error cargando formulario:', error);
      setError(tp('errorLoadingForm', { message: error.message }));
    } finally {
      setCargando(false);
    }
  };

  cargarFormularioExistenteRef.current = cargarFormularioExistente;

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
            nombre: tp('image'),
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
              nombre: tp('image'),
              base64: base64,
              descripcion: foto[1] || '',
              url: base64,
            };
          }
          // Si no, retornar estructura mínima
          return {
            id: Date.now() + Math.random(),
            nombre: tp('image'),
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
            nombre: foto.nombre || tp('image'),
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
              const response = await fetch(imagenUrl);
              ultimoStatus = response?.status;
              if (!response.ok) continue;

              const blob = await response.blob();
              if (!blob || blob.size === 0) continue;

              const url = URL.createObjectURL(blob);
return {
                id: foto.id || Date.now() + Math.random(),
                nombre: foto.nombre || tp('image'),
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
            nombre: foto.nombre || tp('image'),
            url: foto.url,
            ruta: foto.ruta,
            descripcion: foto.descripcion || '',
          };
        }
        
        // Si tiene url blob, mantenerla
        if (foto.url && foto.url.startsWith('blob:')) {
return {
            id: foto.id || Date.now() + Math.random(),
            nombre: foto.nombre || tp('image'),
            url: foto.url,
            descripcion: foto.descripcion || '',
          };
        }
        
        // Retornar foto tal cual si no se puede procesar
return {
          id: foto.id || Date.now() + Math.random(),
          nombre: foto.nombre || tp('image'),
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
      
      const nombreCliente = formData.nombreInmueble ? capitalizeFirstLetter(formData.nombreInmueble) : tp('untitledClient');
      
      // Procesar fotos antes de guardar
      const fotosProcesadas = await prepararFotosAreasParaGuardar(fotosAreas);

      const datosFormulario = {
        tipo: TIPOS_FORMULARIOS.INSPECCION_PROPIEDADES,
        titulo: tp('historyTitle', { client: nombreCliente }),
        datos: {
          formData: { ...formData },
          areasData: { ...areasData },
          fotosAreas: fotosProcesadas,
          seccionesActivas,
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
        if (casoPropiedadesId) {
          try {
            await vincularInspeccionCasoPropiedades(casoPropiedadesId, {
              inspeccionId: nuevoId,
              inspeccionTitulo: datosFormulario?.titulo || formData.nombreInmueble || '',
              inspeccionFecha: new Date().toISOString(),
              nombreCliente: formData.nombreInmueble,
              direccion: formData.direccion,
              localizacion: formData.localizacion,
              ciudad: formData.ciudad,
              departamento: formData.departamento,
              claseInmueble: formData.claseInmueble,
              tipoInmueble: formData.tipoInmueble,
              destinacion: formData.destinacion,
              documento: formData.numeroDocumento,
            });
          } catch (vincErr) {
            console.warn('No se pudo vincular la inspección al caso:', vincErr);
          }
        }
} else {
        // 🆕 Crear nuevo formulario
const resultado = await historialService.guardarFormulario(datosFormulario);
        nuevoId = resultado._id || resultado.id || resultado;
        await sincronizarFotosDesdeDatosGuardados(resultado?.datos);
// 🔑 Guardar ID y navegar a la URL con el ID para futuras actualizaciones
        setFormularioId(nuevoId);
        if (casoPropiedadesId) {
          try {
            await vincularInspeccionCasoPropiedades(casoPropiedadesId, {
              inspeccionId: nuevoId,
              inspeccionTitulo: datosFormulario?.titulo || formData.nombreInmueble || '',
              inspeccionFecha: new Date().toISOString(),
              nombreCliente: formData.nombreInmueble,
              direccion: formData.direccion,
              localizacion: formData.localizacion,
              ciudad: formData.ciudad,
              departamento: formData.departamento,
              claseInmueble: formData.claseInmueble,
              tipoInmueble: formData.tipoInmueble,
              destinacion: formData.destinacion,
              documento: formData.numeroDocumento,
            });
          } catch (vincErr) {
            console.warn('No se pudo vincular la inspección al caso:', vincErr);
          }
          navigate(`/propiedades/inspeccion/${casoPropiedadesId}?inspeccionId=${nuevoId}`, {
            replace: true,
          });
        } else {
          const basePath = location.pathname.startsWith('/propiedades')
            ? '/propiedades/carga'
            : '/formulario-inspeccion-propiedades';
          navigate(`${basePath}/editar/${nuevoId}`, { replace: true });
        }
      }
      
      mostrarModalConfirmacion(
        tp('formSavedTitle'),
        tp('formSavedMessage'),
        'success'
      );
      
      lastSavedDataRef.current = JSON.stringify(datosFormulario);
    } catch (error) {
      console.error('Error guardando:', error);
      setError(tp('errorSaving', { message: error.message }));
      alert(tp('errorSaving', { message: error.message }));
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
                nombre: foto.nombre || tp('image'),
                descripcion: foto.descripcion || '',
                base64: foto.base64,
                url: foto.base64 // Usar base64 como URL para preview
              };
            }
            // Mantener otros datos
            return {
              id: foto.id || Date.now() + Math.random(),
              nombre: foto.nombre || tp('image'),
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
              nombre: foto.nombre || tp('image'),
              descripcion: foto.descripcion || '',
              base64: foto.base64,
              url: foto.base64 // Usar base64 como URL para preview
            };
          }
          // Mantener otros datos
          return {
            id: foto.id || Date.now() + Math.random(),
            nombre: foto.nombre || tp('image'),
            descripcion: foto.descripcion || '',
            url: foto.url,
            ruta: foto.ruta
          };
        });
      }
    }
    
    return fotosProcesadas;
  };

  procesarFotosDesdeLocalStorageRef.current = procesarFotosDesdeLocalStorage;

  // Función para generar documento Word completo
  const generarDocumentoWord = async () => {
    try {
      setCargando(true);
      
      const nombreCliente = formData.nombreInmueble ? capitalizeFirstLetter(formData.nombreInmueble) : tp('untitledClient');
      const nombreClienteMayusculas = nombreCliente.toUpperCase();
      const today = new Date();
      const formattedDate = today.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      const docContent = [];
      const incluirSeccionWord = (id) => estaSeccionPropiedadesActiva(seccionesActivas, id, areasEfectivas);
      const numeracionWord = construirNumeracionActiva(seccionesActivas, areasEfectivas, t);
      const encabezado = (id, fallback) => numeracionWord.get(id)?.encabezado || fallback;
      const resumenDocumento = resumenEditadoManualRef.current
        ? {
            conclusiones: formData.conclusiones,
            observacionesPrincipales: formData.observacionesPrincipales,
          }
        : generarResumenInspeccion(areasData, areasEfectivas, {
            numAlcobas: formData.numAlcobas,
            incluirArea: incluirSeccionWord,
          });

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
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "INSPECCIÓN",
                        bold: true,
                        font: "Arial",
                        size: 24,
                        color: "000000",
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
                        color: "000000",
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
                width: { size: 21.67, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "INSP. RIESGOS",
                        font: "Arial",
                        size: 18,
                        color: "000000",
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                verticalAlign: VerticalAlign.CENTER,
              }),
              new TableCell({
                width: { size: 21.67, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "RIESGOS",
                        font: "Arial",
                        size: 18,
                        color: "000000",
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                verticalAlign: VerticalAlign.CENTER,
              }),
              new TableCell({
                width: { size: 21.67, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `DATE: ${formattedDate}`,
                        font: "Arial",
                        size: 18,
                        color: "000000",
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

      docContent.push(pHeading(encabezado('informacionGeneral', 'Información General del Inmueble')));
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

      if (incluirSeccionWord('informacionJuridica')) {
        docContent.push(pHeading(encabezado('informacionJuridica', 'Información Jurídica del Inmueble')));
        docContent.push(
          crearTablaDatos([
            ['Tipo de Documento', formData.tipoDocumento],
            ['Número de Documento', formData.numeroDocumento],
            ['Fecha del Documento', formData.fechaDocumento],
            ['Notaría y Lugar de Expedición', formData.notaria],
          ])
        );
        docContent.push(pSpacer(400));
      }

      if (incluirSeccionWord('inspeccionMetrica') && formData.inspeccionMetrica) {
        docContent.push(pHeading(encabezado('inspeccionMetrica', '2 - INSPECCIÓN MÉTRICA')));
        docContent.push(pBody(formData.inspeccionMetrica, { after: 400 }));
      }

      const algunaAreaWord = idsAreasDesdePlantilla(areasEfectivas).some(incluirSeccionWord);
      if (algunaAreaWord) {
        docContent.push(pHeading(encabezado('inspeccionPorAreas', '3 - INSPECCIÓN POR ÁREAS')));
      }

      for (const areaCfg of areasEfectivas) {
        if (areaCfg.tipo === 'alcobas') {
          if (!incluirSeccionWord('alcobas')) continue;
          const numAlcobas = parseInt(formData.numAlcobas) || 0;
          for (let i = 1; i <= numAlcobas; i++) {
            const tieneAlcoba = areasData.alcobas[i] && areasData.alcobas[i].length > 0;
            const tieneBano = areasData.banosAlcobas?.[i]?.length > 0;
            const tieneCloset = areasData.closetsAlcobas?.[i]?.length > 0;
            const tieneFotosAlcoba = fotosAreas.alcobas[i] && fotosAreas.alcobas[i].length > 0;
            const tieneFotosBano = fotosAreas.banosAlcobas?.[i]?.length > 0;
            const tieneFotosCloset = fotosAreas.closetsAlcobas?.[i]?.length > 0;

            if (tieneAlcoba || tieneFotosAlcoba) {
              docContent.push(pHeading(encabezado('alcobas', `ALCOBA ${i}`), HeadingLevel.HEADING_2));
              if (tieneAlcoba) {
                const tablaAlcoba = crearTablaInspeccionItems(areasData.alcobas[i]);
                if (tablaAlcoba) docContent.push(tablaAlcoba);
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
                if (tablaBano) docContent.push(tablaBano);
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
                if (tablaCloset) docContent.push(tablaCloset);
                docContent.push(pSpacer(400));
              }
              if (tieneFotosCloset) {
                await insertarFotosSeccionWord(docContent, fotosAreas.closetsAlcobas[i], `FOTOS DE CLOSET ALCOBA ${i}`);
              }
            }
          }
          continue;
        }

        const areaId = areaCfg.id;
        if (!incluirSeccionWord(areaId)) continue;
        const tieneItems = areasData[areaId]?.length > 0;
        const tieneFotos = fotosAreas[areaId]?.length > 0;
        if (!tieneItems && !tieneFotos) continue;

        docContent.push(
          pHeading(
            encabezado(areaId, areaCfg.titulo.toUpperCase()),
            HeadingLevel.HEADING_2
          )
        );
        if (tieneItems) {
          const tabla = crearTablaInspeccionItems(areasData[areaId]);
          if (tabla) docContent.push(tabla);
          docContent.push(pSpacer(400));
        }
        if (tieneFotos) {
          await insertarFotosSeccionWord(
            docContent,
            fotosAreas[areaId],
            `FOTOS DE ${areaCfg.titulo.toUpperCase()}`
          );
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

      // Conclusiones
      if (incluirSeccionWord('conclusiones') && resumenDocumento.conclusiones) {
        docContent.push(pHeading(encabezado('conclusiones', '4 - CONCLUSIONES')));
        docContent.push(pBody(resumenDocumento.conclusiones, { after: 400 }));
      }

      if (incluirSeccionWord('observacionesPrincipales') && resumenDocumento.observacionesPrincipales) {
        docContent.push(
          pHeading(
            encabezado('observacionesPrincipales', '4.1 - LAS PRINCIPALES OBSERVACIONES SON:'),
            HeadingLevel.HEADING_2
          )
        );
        docContent.push(pBody(resumenDocumento.observacionesPrincipales, { after: 400 }));
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
          tituloAjustador: 'FIRMA DEL INSPECTOR',
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
          await fetch(`${BASE_URL}/api/historial-formularios/${formularioId}/archivo`, {
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
        tp('documentGeneratedTitle'),
        tp('documentGeneratedMessage'),
        'success'
      );
    } catch (error) {
      console.error('❌ Error exportando:', error);
      setError(tp('errorExporting', { message: error.message }));
      alert(tp('errorExporting', { message: error.message }));
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
    const tituloFotos = tituloArea(area, areasEfectivas, alcobaNum, t);
    
    // Usar utilidades centralizadas de imageUtils
    
    return (
      <div
        className="mb-6 mt-6 rounded-lg border p-4 sm:p-5"
        style={{ borderColor: ui.borderColor, backgroundColor: ui.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
      >
        <h4
          className="mb-1 font-heading text-base font-bold sm:text-lg"
          style={{ color: ui.textPrimary, textTransform: 'none' }}
        >
          {tp('photosOf', { area: tituloFotos })}
        </h4>
        <p className="mb-4 text-xs" style={{ color: ui.textSecondary }}>
          {tp('photosQuota', {
            section: enSeccion,
            maxSection: MAX_FOTOS_POR_SECCION,
            total: totalFotos,
            maxTotal: MAX_FOTOS_TOTAL,
            maxMb: MAX_FOTO_TAMANO_MB,
            kb: FOTO_COMPRESION_OPCIONES.maxSizeKB,
          })}
        </p>
        
        <div
          className={`mb-6 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
            seccionLlena || informeLleno ? '' : ''
          }`}
          style={{
            borderColor: seccionLlena || informeLleno ? '#F59E0B' : ui.borderColor,
            backgroundColor: seccionLlena || informeLleno
              ? (ui.theme === 'dark' ? 'rgba(245,158,11,0.1)' : '#FFFBEB')
              : (ui.theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#F9FAFB'),
          }}
        >
          <FaUpload className="mx-auto mb-2 h-8 w-8" style={{ color: ui.textSecondary }} />
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
            {seccionLlena || informeLleno ? tp('photoLimitReached') : tp('selectImages')}
          </label>
          {!seccionLlena && !informeLleno && (
            <p className="mt-2 text-xs" style={{ color: ui.textSecondary }}>
              {tp('photosCompressHint')}
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
                  style={{ borderColor: ui.borderColor, backgroundColor: ui.cardBg }}
                >
                  <div className="relative mb-3">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={foto.nombre || tp('image')}
                        className="h-48 w-full cursor-pointer rounded-lg border object-contain"
                        style={{ backgroundColor: ui.inputBg, borderColor: ui.borderColor }}
                        onClick={() => {
                          const modal = document.createElement('div');
                          modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                          modal.innerHTML = `
                            <div class="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
                              <div class="flex justify-between items-center mb-4">
                                <h3 class="text-xl font-semibold">${foto.nombre || tp('image')}</h3>
                                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center">×</button>
                              </div>
                              <img src="${imageUrl}" alt="${foto.nombre || tp('image')}" class="w-full rounded-lg" />
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
                            errorDiv.style.backgroundColor = ui.theme === 'dark' ? '#252525' : '#E5E7EB';
                            errorDiv.innerHTML = `
                              <span class="px-2 text-center text-xs text-gray-600">
                                ${tp('imageUnavailable')}
                              </span>
                            `;
                            container.appendChild(errorDiv);
                          }
                        })}
                      />
                    ) : (
                      <div
                        className="flex h-48 w-full items-center justify-center rounded-lg"
                        style={{ backgroundColor: ui.theme === 'dark' ? '#252525' : '#E5E7EB' }}
                      >
                        <span className="text-sm" style={{ color: ui.textSecondary }}>{tp('noImage')}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => eliminarFoto(area, foto.id, alcobaNum)}
                      className={`absolute right-2 top-2 rounded-full p-2 shadow-lg ${complexBtnDanger}`}
                      title={tp('deletePhoto')}
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                  <ThemedTextarea
                    value={foto.descripcion || ''}
                    onChange={(e) => actualizarDescripcionFoto(area, foto.id, e.target.value, alcobaNum)}
                    placeholder={tp('photoDescriptionPlaceholder')}
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
    const campos = obtenerCamposArea(area, areasEfectivas);
    const nombreArea = tituloArea(area, areasEfectivas, alcobaNum, t);
    const tituloItems = nombreArea;
    
    return (
      <div
        className="mb-4 rounded-lg border p-4"
        style={{ borderColor: ui.borderColor, backgroundColor: ui.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4
            className="font-heading text-sm font-semibold sm:text-base"
            style={{ color: ui.textPrimary, textTransform: 'none' }}
          >
            {tp('inspectionItems', { area: tituloItems })}
          </h4>
          <button
            type="button"
            onClick={() => agregarItem(area, alcobaNum)}
            className={complexBtnPrimary}
          >
            <FaPlus className="h-4 w-4" />
            {tp('addItem')}
          </button>
        </div>
        
        {items.length === 0 ? (
          <p className="text-sm italic" style={{ color: ui.textSecondary }}>
            {tp('noItemsHint')}
          </p>
        ) : (
          <FormTable>
            <FormTableHead>
              <FormTableTh className="!w-auto">{tp('parameter')}</FormTableTh>
              <FormTableTh className="!w-auto">{tp('complies')}</FormTableTh>
              <FormTableTh className="!w-auto">{tp('symptom')}</FormTableTh>
              <FormTableTh className="!w-auto">{tp('observation')}</FormTableTh>
              <FormTableTh className="!w-auto">{tp('action')}</FormTableTh>
            </FormTableHead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <FormTableTd>
                    <TableFieldInput
                      type="text"
                      value={item.parametro || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'parametro', e.target.value, alcobaNum)}
                      placeholder={tp('parameterExample')}
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
                      <option value="parcialmente">{tp('partially')}</option>
                      <option value="na">NA</option>
                    </TableFieldSelect>
                  </FormTableTd>
                  <FormTableTd>
                    <TableFieldInput
                      type="text"
                      value={item.sintoma || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'sintoma', e.target.value, alcobaNum)}
                      placeholder={tp('symptomPlaceholder')}
                    />
                  </FormTableTd>
                  <FormTableTd>
                    <TableFieldInput
                      type="text"
                      value={item.observacion || ''}
                      onChange={(e) => actualizarItem(area, item.id, 'observacion', e.target.value, alcobaNum)}
                      placeholder={tp('observationPlaceholder')}
                    />
                  </FormTableTd>
                  <FormTableTd>
                    <button
                      type="button"
                      onClick={() => eliminarItem(area, item.id, alcobaNum)}
                      className={complexBtnDanger}
                      title={tp('deleteItem')}
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
            <p className="mb-2 text-sm" style={{ color: ui.textSecondary }}>{tp('addPredefinedParams')}</p>
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

  const renderBloqueAlcobas = (numeroSubseccion) => (
    <>
      <SubsectionTitle>{numeroSubseccion ? tp('subsectionAlcobas', { n: numeroSubseccion }) : tp('alcobasLabel')}</SubsectionTitle>
      <div className="mb-4">
        <FieldLabel>{tp('howManyBedrooms')}</FieldLabel>
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
            {tp('generateBedrooms')}
          </button>
        </div>
      </div>

      {Array.from({ length: parseInt(formData.numAlcobas) || 0 }, (_, i) => i + 1).map((alcobaNum) => (
        <div
          key={alcobaNum}
          className="mb-6 rounded-lg border p-4"
          style={{ borderColor: ui.borderColor, backgroundColor: ui.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-heading text-base font-bold" style={{ color: ui.textPrimary }}>
              {tp('areas.alcobaNum', { n: alcobaNum })}
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleBanoAlcoba(alcobaNum)}
                className={formData.alcobasConBano?.[alcobaNum] ? complexBtnPrimary : complexBtnGhost}
              >
                {formData.alcobasConBano?.[alcobaNum] ? tp('hideBathroom') : tp('addBathroom')}
              </button>
              <button
                type="button"
                onClick={() => toggleClosetAlcoba(alcobaNum)}
                className={formData.alcobasConCloset?.[alcobaNum] ? complexBtnPrimary : complexBtnGhost}
              >
                {formData.alcobasConCloset?.[alcobaNum] ? tp('hideCloset') : tp('addCloset')}
              </button>
            </div>
          </div>
          {renderTablaInspeccion('alcoba', alcobaNum)}
          {renderFotosArea('alcoba', alcobaNum)}

          {formData.alcobasConBano?.[alcobaNum] && (
            <div
              className="mt-6 rounded-lg border p-4 pt-6"
              style={{
                borderColor: ui.borderColor,
                backgroundColor: ui.theme === 'dark' ? 'rgba(220,38,38,0.06)' : ui.accentSoft,
              }}
            >
              <h4 className="mb-4 font-heading text-base font-bold" style={{ color: ui.textPrimary }}>
                {tp('areas.banoAlcobaNum', { n: alcobaNum })}
              </h4>
              {renderTablaInspeccion('banoAlcoba', alcobaNum)}
              {renderFotosArea('banoAlcoba', alcobaNum)}
            </div>
          )}

          {formData.alcobasConCloset?.[alcobaNum] && (
            <div
              className="mt-6 rounded-lg border p-4 pt-6"
              style={{
                borderColor: ui.borderColor,
                backgroundColor: ui.theme === 'dark' ? 'rgba(220,38,38,0.06)' : ui.accentSoft,
              }}
            >
              <h4 className="mb-4 font-heading text-base font-bold" style={{ color: ui.textPrimary }}>
                {tp('areas.closetAlcobaNum', { n: alcobaNum })}
              </h4>
              {renderTablaInspeccion('closetAlcoba', alcobaNum)}
              {renderFotosArea('closetAlcoba', alcobaNum)}
            </div>
          )}
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-8" style={{ backgroundColor: ui.bgMain }}>
      <div
        className="mx-auto max-w-5xl rounded-lg p-3 shadow-lg sm:p-4 lg:p-6"
        style={{ backgroundColor: ui.cardBg, border: `1px solid ${ui.borderColor}` }}
      >
        <div
          className="mb-6 flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center"
          style={{ borderColor: ui.borderColor }}
        >
          <img src={Logo} alt="Logo PROSER" className="h-12 object-contain sm:h-16" />
          {formularioId && formularioId !== 'nuevo' && (
            <span
              className="rounded-full px-3 py-1 text-xs font-medium sm:text-sm"
              style={{
                backgroundColor: ui.theme === 'dark' ? 'rgba(34,197,94,0.15)' : '#DCFCE7',
                color: ui.theme === 'dark' ? '#86EFAC' : '#166534',
              }}
            >
              {tp('autoSaveActive')}
            </span>
          )}
        </div>

        <div className="mb-8 text-center">
          <h1 className="mb-2 font-heading text-2xl font-bold sm:text-3xl" style={{ color: ui.textPrimary }}>
            {tp('pageTitle')}
          </h1>
          <p className="text-sm" style={{ color: ui.textSecondary }}>
            {tp('pageSubtitle')}
          </p>
        </div>

        {formularioId && formularioId !== 'nuevo' && (
          <InfoBanner variant="success">
            <span>✓</span>
            <span>{tp('autoSaveHint')}</span>
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
              style={{ backgroundColor: ui.cardBg, border: `1px solid ${ui.borderColor}` }}
            >
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: '#DC2626' }} />
              <p style={{ color: ui.textPrimary }}>{tp('processing')}</p>
            </div>
          </div>
        )}

        <LlenadoGuiaPropiedades />

        <div
          className="mb-8 rounded-lg border p-4"
          style={{ borderColor: ui.borderColor, backgroundColor: ui.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
        >
          <h2 className="mb-2 font-heading text-lg font-bold" style={{ color: ui.textPrimary }}>
            {t('inspection.ui.formulario_inspeccion.tableOfContents')}
          </h2>
          <p className="mb-3 text-sm" style={{ color: ui.textSecondary }}>
            {t('inspection.ui.formulario_inspeccion.contentsInstructions')}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ border: `1px solid ${ui.borderColor}` }}>
              <thead>
                <tr style={{ backgroundColor: ui.theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
                  <th className="px-3 py-2 text-center font-bold" style={{ border: `1px solid ${ui.borderColor}`, width: '48px', color: ui.textPrimary }}>✓</th>
                  <th className="px-3 py-2 text-left font-bold" style={{ border: `1px solid ${ui.borderColor}`, color: ui.textPrimary }}>{tp('ref')}</th>
                  <th className="px-3 py-2 text-left font-bold" style={{ border: `1px solid ${ui.borderColor}`, color: ui.textPrimary }}>{tp('sectionCol')}</th>
                </tr>
              </thead>
              <tbody>
                {filasIndiceInforme.map((fila, idx) => (
                  <tr
                    key={`${fila.id || fila.ref}-${fila.titulo}-${idx}`}
                    style={{
                      backgroundColor: idx % 2 === 0
                        ? (ui.theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                        : (ui.theme === 'dark' ? '#1F1F1F' : '#F9FAFB'),
                      opacity: fila.activa ? 1 : 0.55,
                    }}
                  >
                    <td className="px-3 py-2 text-center" style={{ border: `1px solid ${ui.borderColor}` }}>
                      {fila.seleccionable ? (
                        <input
                          type="checkbox"
                          checked={fila.activa}
                          onChange={() => toggleSeccionInforme(fila.id)}
                          disabled={cargando}
                          className="h-4 w-4"
                        />
                      ) : fila.tipo === 'principal' ? (
                        <span title={tp('requiredOrGroupSection')} style={{ color: ui.textSecondary }}>●</span>
                      ) : null}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{
                        border: `1px solid ${ui.borderColor}`,
                        color: ui.textPrimary,
                        paddingLeft: fila.tipo === 'sub' ? '1.5rem' : undefined,
                      }}
                    >
                      {fila.ref}
                    </td>
                    <td
                      className="px-3 py-2"
                      style={{
                        border: `1px solid ${ui.borderColor}`,
                        color: ui.textPrimary,
                        paddingLeft: fila.tipo === 'sub' ? '1.5rem' : undefined,
                        fontStyle: fila.tipo === 'sub' ? 'italic' : 'normal',
                      }}
                    >
                      {fila.titulo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form className="space-y-6">
          <SectionCard
            title={tp('section1Title')}
            subtitle={tp('section1Subtitle')}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>{tp('propertyClass')}</FieldLabel>
                <ThemedSelect
                  name="claseInmueble"
                  value={formData.claseInmueble}
                  onChange={(e) => handleClaseInmuebleChange(e.target.value)}
                >
                  <option value="">{tp('selectClass')}</option>
                  {formData.claseInmueble && !CLASES_INMUEBLE.includes(formData.claseInmueble) && (
                    <option value={formData.claseInmueble}>{labelClase(formData.claseInmueble)}</option>
                  )}
                  {CLASES_INMUEBLE.map((clase) => (
                    <option key={clase} value={clase}>{labelClase(clase)}</option>
                  ))}
                </ThemedSelect>
              </div>
              <div>
                <FieldLabel>{tp('propertyType')}</FieldLabel>
                <ThemedSelect
                  name="tipoInmueble"
                  value={formData.tipoInmueble}
                  onChange={(e) => handleInputChange('tipoInmueble', e.target.value)}
                  disabled={!formData.claseInmueble}
                >
                  <option value="">
                    {formData.claseInmueble ? tp('selectType') : tp('selectClassFirst')}
                  </option>
                  {formData.tipoInmueble && !tiposInmuebleDisponibles.includes(formData.tipoInmueble) && (
                    <option value={formData.tipoInmueble}>{labelTipo(formData.tipoInmueble)}</option>
                  )}
                  {tiposInmuebleDisponibles.map((tipo) => (
                    <option key={tipo} value={tipo}>{labelTipo(tipo)}</option>
                  ))}
                </ThemedSelect>
              </div>
              <div>
                <FieldLabel>{tp('propertyAddress')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{tp('clientName')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="nombreInmueble"
                  value={formData.nombreInmueble}
                  onChange={(e) => handleInputChange('nombreInmueble', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{tp('localization')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="localizacion"
                  value={formData.localizacion}
                  onChange={(e) => handleInputChange('localizacion', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{tp('city')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{tp('department')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="departamento"
                  value={formData.departamento}
                  onChange={(e) => handleInputChange('departamento', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{tp('visitReceiver')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="destinacion"
                  value={formData.destinacion}
                  onChange={(e) => handleInputChange('destinacion', e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          {incluirSeccion('informacionJuridica') && (
          <SectionCard title={tp('section12Title')} subtitle={tp('section12Subtitle')}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>{tp('propertyDocType')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="tipoDocumento"
                  value={formData.tipoDocumento}
                  onChange={(e) => handleInputChange('tipoDocumento', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{tp('propertyDocNumber')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="numeroDocumento"
                  value={formData.numeroDocumento}
                  onChange={(e) => handleInputChange('numeroDocumento', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{tp('documentDate')}</FieldLabel>
                <ThemedInput
                  type="date"
                  name="fechaDocumento"
                  value={formData.fechaDocumento}
                  onChange={(e) => handleInputChange('fechaDocumento', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>{tp('notaryPlace')}</FieldLabel>
                <ThemedInput
                  type="text"
                  name="notaria"
                  value={formData.notaria}
                  onChange={(e) => handleInputChange('notaria', e.target.value)}
                />
              </div>
            </div>
          </SectionCard>
          )}

          {incluirSeccion('inspeccionMetrica') && (
          <SectionCard title={tp('section2Title')} subtitle={tp('section2Subtitle')}>
            <FieldLabel>{tp('metricObservations')}</FieldLabel>
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
                tituloSeccion={tp('metricSectionChatTitle')}
                textoActual={formData.inspeccionMetrica || ''}
                onTextoCambiado={(texto) => handleInputChange('inspeccionMetrica', texto)}
                tipoSeccion="inspeccionMetrica"
              />
            </div>
          </SectionCard>
          )}

          {formData.claseInmueble && (
          <SectionCard title={tp('section3Title')} subtitle={tp('section3Subtitle')}>
            {formData.claseInmueble && formData.tipoInmueble && (
              <p
                className="mb-4 text-sm"
                style={{ color: ui.textSecondary }}
                dangerouslySetInnerHTML={{
                  __html: tp('suggestedAreas', {
                    clase: labelClase(formData.claseInmueble),
                    tipo: labelTipo(formData.tipoInmueble),
                  }),
                }}
              />
            )}
            {formData.claseInmueble && !formData.tipoInmueble && (
              <p className="mb-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: ui.borderColor, color: ui.textSecondary, backgroundColor: ui.theme === 'dark' ? 'rgba(245,158,11,0.08)' : '#FFFBEB' }}>
                {tp('selectTypeForAreas')}
              </p>
            )}

            <div
              className="mb-6 rounded-lg border p-4"
              style={{
                borderColor: ui.borderColor,
                backgroundColor: ui.theme === 'dark' ? 'rgba(59,130,246,0.06)' : '#EFF6FF',
              }}
            >
              <h4 className="mb-1 font-heading text-sm font-bold" style={{ color: ui.textPrimary, textTransform: 'none' }}>
                {tp('addUnlistedArea')}
              </h4>
              <p className="mb-3 text-xs" style={{ color: ui.textSecondary }}>
                {tp('addUnlistedAreaHint')}
              </p>
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <FieldLabel>{tp('areaName')}</FieldLabel>
                  <ThemedInput
                    type="text"
                    value={nuevaAreaTitulo}
                    onChange={(e) => setNuevaAreaTitulo(e.target.value)}
                    placeholder={tp('areaNamePlaceholder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        agregarAreaPersonalizada();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className={complexBtnPrimary}
                  onClick={() => agregarAreaPersonalizada()}
                >
                  <FaPlus className="h-4 w-4" />
                  {tp('addArea')}
                </button>
              </div>

              {historialAreasGlobal.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold" style={{ color: ui.textSecondary }}>
                    {tp('areaHistoryHint')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {historialAreasGlobal.slice(0, 20).map((h) => {
                      const yaEnInforme = areaPersonalizadaYaExiste(areasEfectivas, h.titulo);
                      return (
                        <button
                          key={`${h.titulo}-${h.ultimaVez}`}
                          type="button"
                          disabled={yaEnInforme}
                          className={yaEnInforme ? `${complexBtnGhost} opacity-50` : complexBtnGhost}
                          onClick={() => agregarAreaPersonalizada(h.titulo, h.parametrosFrecuentes || [])}
                          title={
                            h.parametrosFrecuentes?.length
                              ? tp('frequentItems', { items: h.parametrosFrecuentes.join(', ') })
                              : undefined
                          }
                        >
                          + {h.titulo}
                          {h.parametrosFrecuentes?.length > 0 && (
                            <span className="ml-1 opacity-70">{tp('itemsCountShort', { count: h.parametrosFrecuentes.length })}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(formData.areasPersonalizadas?.length > 0) && (
                <div className="border-t pt-3" style={{ borderColor: ui.borderColor }}>
                  <p className="mb-2 text-xs font-semibold" style={{ color: ui.textSecondary }}>
                    {tp('customAreasInReport')}
                  </p>
                  <ul className="space-y-2 text-sm">
                    {formData.areasPersonalizadas.map((a) => {
                      const numItems = areasData[a.id]?.length || 0;
                      const params = extraerParametrosDeItems(areasData[a.id]);
                      return (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
                          style={{ borderColor: ui.borderColor, backgroundColor: ui.cardBg }}
                        >
                          <div>
                            <span className="font-medium" style={{ color: ui.textPrimary }}>{a.titulo}</span>
                            <span className="ml-2 text-xs" style={{ color: ui.textSecondary }}>
                              {tp(numItems === 1 ? 'itemCount' : 'itemCount_plural', { count: numItems })}
                            </span>
                            {params.length > 0 && (
                              <p className="mt-0.5 text-xs" style={{ color: ui.textSecondary }}>
                                {tp('itemsLabel', { items: params.slice(0, 5).join(', ') + (params.length > 5 ? '…' : '') })}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            className={complexBtnDanger}
                            onClick={() => eliminarAreaPersonalizada(a.id)}
                            title={tp('removeFromReport')}
                          >
                            <FaTrash className="h-3 w-3" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {(() => {
              let subNum = 0;
              return areasEfectivas.map((areaCfg) => {
                const areaId = areaCfg.tipo === 'alcobas' ? 'alcobas' : areaCfg.id;
                if (!incluirSeccion(areaId)) return null;
                subNum += 1;
                if (areaCfg.tipo === 'alcobas') {
                  return <React.Fragment key="alcobas">{renderBloqueAlcobas(subNum)}</React.Fragment>;
                }
                return (
                  <React.Fragment key={areaCfg.id}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <SubsectionTitle>3.{subNum} — {tituloArea(areaCfg.id, areasEfectivas, null, t) || areaCfg.titulo}</SubsectionTitle>
                      {areaCfg.personalizada && (
                        <span
                          className="mb-4 rounded px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: ui.theme === 'dark' ? 'rgba(59,130,246,0.2)' : '#DBEAFE',
                            color: ui.theme === 'dark' ? '#93C5FD' : '#1D4ED8',
                          }}
                        >
                          {tp('customAreaBadge')}
                        </span>
                      )}
                    </div>
                    {renderTablaInspeccion(areaCfg.id)}
                    {renderFotosArea(areaCfg.id)}
                    <AreaDivider />
                  </React.Fragment>
                );
              });
            })()}
          </SectionCard>
          )}

          <SectionCard
            title={tp('section4Title')}
            subtitle={
              resumenInspeccion.hallazgos.length
                ? tp('section4SubtitleFindings', { count: resumenInspeccion.hallazgos.length })
                : tp('section4SubtitleEmpty')
            }
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p
                className="text-sm"
                style={{ color: ui.textSecondary }}
                dangerouslySetInnerHTML={{ __html: tp('conclusionsAutoHint') }}
              />
              <button
                type="button"
                onClick={() => aplicarResumenInspeccion(true)}
                className={complexBtnSecondary}
              >
                {tp('updateFromInspection')}
              </button>
            </div>
            <FieldLabel>{tp('conclusions')}</FieldLabel>
            <ThemedTextarea
              name="conclusiones"
              value={formData.conclusiones}
              onChange={(e) => {
                marcarResumenEditadoManual();
                handleInputChange('conclusiones', e.target.value);
              }}
              rows={4}
            />
            <div className="mt-3">
              <ChatbotIA 
                formData={formData} 
                onInputChange={handleInputChange}
                seccion="conclusiones"
                tituloSeccion={tp('conclusions')}
                textoActual={formData.conclusiones || ''}
                onTextoCambiado={(texto) => {
                  marcarResumenEditadoManual();
                  handleInputChange('conclusiones', texto);
                }}
                tipoSeccion="conclusiones"
              />
            </div>
          </SectionCard>

          {incluirSeccion('observacionesPrincipales') && (
          <SectionCard
            title={tp('section41Title')}
            subtitle={
              resumenInspeccion.hallazgos.length
                ? tp('section41SubtitleFindings', { count: resumenInspeccion.hallazgos.length })
                : tp('section41SubtitleEmpty')
            }
          >
            <FieldLabel>{tp('mainObservations')}</FieldLabel>
            <ThemedTextarea
              name="observacionesPrincipales"
              value={formData.observacionesPrincipales}
              onChange={(e) => {
                marcarResumenEditadoManual();
                handleInputChange('observacionesPrincipales', e.target.value);
              }}
              rows={6}
            />
            <div className="mt-3">
              <ChatbotIA 
                formData={formData} 
                onInputChange={handleInputChange}
                seccion="observacionesPrincipales"
                tituloSeccion={tp('mainObservationsChatTitle')}
                textoActual={formData.observacionesPrincipales || ''}
                onTextoCambiado={(texto) => {
                  marcarResumenEditadoManual();
                  handleInputChange('observacionesPrincipales', texto);
                }}
                tipoSeccion="observacionesPrincipales"
              />
            </div>
          </SectionCard>
          )}

          <SectionCard
            title={tp('signatures')}
            subtitle={tp('signaturesSubtitle')}
          >
            <SeccionFirmasActa
              formData={formData}
              onInputChange={handleInputChange}
              tituloCliente={tp('signatureClientTitle')}
              tituloAjustador={tp('signatureInspectorTitle')}
              nombreRolProfesional="inspector"
              permitirRegistrarAjustadores
              sinContenedor
            />
          </SectionCard>

          <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${ui.borderColor}` }}>
            <BotonesHistorial
              onGuardarEnHistorial={handleGuardarEnHistorial}
              onExportar={handleExportar}
              tipoFormulario={TIPOS_FORMULARIOS.INSPECCION_PROPIEDADES}
              tituloFormulario={tp('formHistoryTitle')}
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
