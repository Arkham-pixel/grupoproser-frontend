import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Logo from '../../img/Logo.png';
import { generarWordPuertos } from './generarWordPuertos';
import { generarWordRiicp004, META_FORMATO_RIICP004 } from './generarWordRiicp004';
import { generarPdfRiicp004 } from './generarPdfRiicp004';
import { generarManualPuertos } from './generarManualPuertos';
import { useHistorialFormulario } from '../../hooks/useHistorialFormulario';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  crearPuertosCaso,
  actualizarPuertosCaso,
  getPuertosCaso,
} from '../../services/puertosService.js';
import { procesarInspeccionPuertosImagenes, hayImagenesPendientesInspeccion } from '../../services/puertosCasoImagenService.js';
import {
  formDataToCasoInspeccionAsegurado,
  casoToFormDataInspeccionAsegurado,
  casoToFormDataInspeccionAseguradoConMeta,
  sanitizarFormDataParaGuardado,
} from '../PuertosActas/puertosInspeccionAseguradoMapper.js';
import { esCasoInspeccionAsegurado } from '../PuertosActas/puertosTipoRegistro.js';
import DocumentLanguageSelector from '../DocumentLanguageSelector.jsx';

// Importar subcomponentes
import SeccionInicialPuertos from './SeccionInicialPuertos';
import SeccionRiicp004Puertos from './SeccionRiicp004Puertos';
import ObservacionesRiicp004 from './ObservacionesRiicp004';
import InformeFotograficoRiicp004 from './InformeFotograficoRiicp004';
import ConclusionesRiicp004 from './ConclusionesRiicp004';
import DocumentosTransportePuertos from './DocumentosTransportePuertos';
import AnalisisRiesgosPuertos from './AnalisisRiesgosPuertos';
import InformeFotograficoPuertos from './InformeFotograficoPuertos';
import RecomendacionesPuertos from './RecomendacionesPuertos';
import FirmaPuertos from './FirmaPuertos';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';
import FormAutoSaveControls from '../AutoSave/FormAutoSaveControls';

const esIdPersistido = (valor) => Boolean(valor && !['nuevo', 'nueva'].includes(valor));

export default function PuertosInspeccionMain({ tipoInicial, modoActas } = {}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const esModoActas =
    modoActas || location.pathname.includes('/actas/inspeccion-asegurado');

  const resolverTipoInforme = () => {
    if (tipoInicial === 'riicp004') return 'riicp004';
    if (location.pathname.includes('/inspeccion-asegurado')) return 'riicp004';
    return 'diario';
  };
  
  // Colores según el tema
  const bgMain = theme === 'dark' ? '#1A1A1A' : '#F5F5F7';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const [cargando, setCargando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [generandoWord, setGenerandoWord] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [generandoManual, setGenerandoManual] = useState(false);
  const [tipoInforme, setTipoInforme] = useState(resolverTipoInforme);
  const esFlujoActas = esModoActas || tipoInforme === 'riicp004';
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0); // Contador para forzar captura
  
  // 🔑 Estado para mantener el ID del formulario después del primer guardado
  const [formularioId, setFormularioId] = useState(esIdPersistido(id) ? id : null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState(null);
  const [guardandoActas, setGuardandoActas] = useState(false);
  const [progresoSubida, setProgresoSubida] = useState(null);
  const [documentLocale, setDocumentLocale] = useState('es');
  
  // Hook para historial - Tipo específico para PUERTOS
  const { guardando, exportando } = useHistorialFormulario(TIPOS_FORMULARIOS.INSPECCION_PUERTOS);

  // Estado central del formulario - TODO EL ESTADO EN UN SOLO LUGAR
  const [formData, setFormData] = useState({
    // Sección Inicial - Carta de Presentación
    clienteSeleccionado: '',
    contactoBolivarId: '',
    nombreCliente: '',
    codigoReferencia: '',
    nombreContacto: '',
    cargoContacto: '',
    gerenciaContacto: '',
    empresaCliente: '',
    emailContacto: '',
    ciudadContacto: '',
    fechasInspeccion: '',
    nombreMotonave: '',
    fechaArriboMotonave: '',
    numeroVehiculos: '',
    puertoDescargue: '',
    aseguradora: '',
    imagen: null,
    preview: null,
    
    // Mapa y Geolocalización
    coordenadasRiesgo: '',
    imagenMapa: null,
    direccionRiesgo: '',
    
    // Información General
    nombreEmpresa: '',
    direccion: '',
    municipio: '',
    personaEntrevistada: '',
    barrio: '',
    departamento: '',
    cargo: '',
    horarioLaboral: '',
    colaboladores: '',
    
    // Fecha - Formato correcto sin desfase de zona horaria
    // Usar fecha local explícitamente para evitar problemas de zona horaria
    fecha: (() => {
      // Obtener fecha local actual usando métodos locales explícitamente
      const ahora = new Date();
      const year = ahora.getFullYear();
      const month = ahora.getMonth() + 1; // getMonth() devuelve 0-11, sumamos 1
      const day = ahora.getDate(); // getDate() devuelve el día del mes (1-31)
      // Formatear con padding para asegurar formato YYYY-MM-DD
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const fechaFormateada = `${year}-${monthStr}-${dayStr}`;
return fechaFormateada;
    })(),
    
    // Infraestructura
    antiguedad: '',
    areaLote: '',
    areaConstruida: '',
    numeroEdificios: '',
    numeroPisos: '',
    sotanos: '',
    tenencia: '',
    descripcionInfraestructura: '',
    
    // Procesos
    procesos: '',
    descripcionEmpresa: '',
    
    // Linderos
    linderoNorte: '',
    linderoSur: '',
    linderoOriente: '',
    linderoOccidente: '',
    
    // Maquinaria
    maquinariaDescripcion: '',
    areas: [],
    datosEquipos: [],
    
    // Servicios Industriales
    energiaProveedor: '',
    energiaTension: '',
    energiaPararrayos: '',
    transformadores: [],
    plantasElectricas: {},
    energiaComentarios: '',
    
    // Agua
    aguaFuente: '',
    aguaUso: '',
    aguaAlmacenamiento: '',
    aguaBombeo: '',
    aguaComentarios: '',
    
    // Protección contra incendios
    extintor: '',
    rci: '',
    rociadores: '',
    deteccion: '',
    alarmas: '',
    brigadas: '',
    bomberos: '',
    
    // Seguridad
    alarmaMonitoreada: '',
    cctv: '',
    mantenimientoSeguridad: '',
    comentariosSeguridadElectronica: '',
    tipoVigilancia: '',
    horariosVigilancia: '',
    accesos: '',
    personalCierre: '',
    cerramientoPredio: '',
    otrosCerramiento: '',
    comentariosSeguridadFisica: '',
    seguridadDescripcion: '',
    
    // Siniestralidad
    siniestralidad: '',
    
    // Documentos de Transporte (Página 2)
    billOfLading: '',
    cantidadVehiculos: '',
    tipoMercancia: '',
    tipoEmbarque: '',
    origenImportacion: '',
    puertoEmbarque: '',
    // puertoDescargue ya está definido arriba (línea 61)
    motonaveTransporte: '',
    fechaLlegada: '',
    tablaOrigen: [],
    imagenesInspeccionBordo: [],
    comentariosInspeccionBordo: '',
    imagenesInspeccionDescargue: [],
    comentariosInspeccionDescargue: '',
    comentarioPatioAlmacenamiento: '',
    tablaAverias: [],
    
    // Análisis de Riesgos (Tablas libres estilo Excel)
    tablaAnalisisLibre: [],  // Tabla libre para RIESGO y ANÁLISIS
    tablaRiesgos: [],         // Tabla con fórmula automática para clasificación
    
    // Informe Fotográfico por VIN
    registrosPorVin: [],      // Registros fotográficos agrupados por VIN
    
    // Recomendaciones
    recomendaciones: [],      // Array de recomendaciones del informe
    
    // Firma
    nombreFirmante: '',
    cargoFirmante: '',
    emailFirmante: '',
    celularFirmante: '',
    imagenFirma: null,
    archivoFirma: null,

    // Inspección de asegurado
    plantillaInforme: 'riicp004',
    codigoInforme: 'CP-006',
    versionInforme: '2',
    asegurado: '',
    patioOperacion: '',
    numeroPoliza: '',
    fechaPoliza: '',
    fechasDescargue: '',
    listaBLs: '',
    inspectores: '',
    modelosVehiculos: '',
    textoObservacionesGeneral: '',
    conclusiones: '',
    imagenesAspectoAlmacenamiento: [],
    imagenesAspectoModelo: [],
    
    // Registro fotográfico general
    imagenesRegistro: []
    // imagenMapa y coordenadasRiesgo ya están definidos arriba (líneas 67-68)
  });

  useEffect(() => {
    const tipo = resolverTipoInforme();
    setTipoInforme(tipo);
    if (tipo === 'riicp004') {
      setFormData((prev) => ({ ...prev, plantillaInforme: 'riicp004' }));
    }
  // resolverTipoInforme is derived exclusively from these dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, tipoInicial]);

  // Función para actualizar cualquier campo del formulario
  const handleInputChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Función para actualizar múltiples campos
  const handleMultipleInputChange = (campos) => {
    setFormData(prev => ({
      ...prev,
      ...campos
    }));
  };

  // Verificar si el usuario es administrador
  const esAdmin = localStorage.getItem('rol') === 'admin';
  
  // Función para generar manual
  const handleGenerarManual = async () => {
    try {
      setGenerandoManual(true);
await generarManualPuertos();
      alert(t('ports.ui.inspeccion.alerts.manualOk'));
    } catch (error) {
      console.error('❌ Error al generar manual:', error);
      alert(t('ports.ui.inspeccion.alerts.manualError'));
    } finally {
      setGenerandoManual(false);
    }
  };

  // Función auxiliar para obtener la fecha actual en formato YYYY-MM-DD sin problemas de zona horaria
  const obtenerFechaActual = () => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth() + 1; // getMonth() devuelve 0-11
    const day = hoy.getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Función para generar código CPD automáticamente
  const generarCodigoCPD = () => {
    const año = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos del timestamp
    return `CPD-${año}-${timestamp}`;
  };

  const buildHistorialPayloadPuertos = useCallback((data) => {
    const nombreUsuario = localStorage.getItem('nombre') || 'Usuario';
    const userId = localStorage.getItem('login') || 'ID';
    const codigoCPD = data.codigoReferencia || generarCodigoCPD();
    return {
      tipo: 'inspeccion-puertos',
      titulo:
        data.plantillaInforme === 'riicp004'
          ? `📋 ${data.codigoInforme?.trim() || 'Inspección asegurado'} — ${data.asegurado || data.nombreCliente || 'Asegurado'} — ${data.nombreMotonave || 'Motonave'}`
          : `🚢 Inspección Puertos - ${data.nombreMotonave || data.nombreCliente || 'Puerto'} - ${data.municipio || 'Ciudad'}`,
      usuario: nombreUsuario,
      userId,
      estado: 'en_proceso',
      datos: {
        ...data,
        codigoReferencia: codigoCPD,
        tipoFormulario: 'PUERTOS',
        icono: '🚢',
      },
    };
  }, []);

  const rutaEdicionActas = (casoId) =>
    `/puertos/actas/inspeccion-asegurado/editar/${casoId}`;

  const persistirEnActas = useCallback(
    async (data, { marcarCompletado = false, silencioso = false } = {}) => {
      const idActual = esIdPersistido(formularioId) ? formularioId : null;
      const casoId = idActual || data._id || 'borrador';

      let formProcesado;
      try {
        if (hayImagenesPendientesInspeccion(data)) {
          setProgresoSubida({ lote: 0, totalLotes: 1, subidas: 0, total: 0 });
          formProcesado = await procesarInspeccionPuertosImagenes(data, casoId, setProgresoSubida);
        } else {
          formProcesado = sanitizarFormDataParaGuardado(data);
        }
      } catch (uploadError) {
        console.error('❌ Error subiendo fotos:', uploadError);
        throw uploadError;
      } finally {
        setProgresoSubida(null);
      }

      const payload = formDataToCasoInspeccionAsegurado({
        ...formProcesado,
        codiEstdo: marcarCompletado ? 'terminado' : data.codiEstdo || 'en_curso',
        descripcionEstado: marcarCompletado ? 'Terminado' : data.descripcionEstado || 'En curso',
      });

      const resultado = idActual
        ? await actualizarPuertosCaso(idActual, payload)
        : await crearPuertosCaso(payload);

      const nuevoId = resultado._id;
      setFormularioId(nuevoId);
      setModoEdicion(true);
      setFormData(casoToFormDataInspeccionAsegurado(resultado));

      if (!idActual) {
        window.setTimeout(() => navigate(rutaEdicionActas(nuevoId), { replace: true }), 0);
      }

      if (!silencioso) {
        alert(
          t('ports.ui.inspeccion.alerts.guardadoActas', {
            consecutivo: resultado.consecutivo ? `: ${resultado.consecutivo}` : '',
          })
        );
      }

      return resultado;
    },
    [formularioId, navigate, t]
  );

  const onAutoSaveServidor = useCallback(
    async (data) => {
      if (esFlujoActas) {
        if (!esIdPersistido(formularioId)) return;
        if (hayImagenesPendientesInspeccion(data)) return;
        await persistirEnActas(data, { silencioso: true });
        return;
      }
      if (!esIdPersistido(formularioId)) return;
      const payload = buildHistorialPayloadPuertos(data);
      await historialService.actualizarFormulario(formularioId, {
        ...payload,
        fechaModificacion: new Date().toISOString(),
      });
    },
    [esFlujoActas, formularioId, persistirEnActas, buildHistorialPayloadPuertos]
  );

  const {
    isAutoSaveEnabled,
    lastSaveTime,
    saveStatus,
    enableAutoSave,
    disableAutoSave,
    saveNow,
    syncNow,
    pendingServerSync,
    isOnline,
    isExistingRecord,
    clearSavedData,
  } = useFormAutoSave({
    formKeyBase: esFlujoActas
      ? 'formulario-puertos-inspeccion-asegurado'
      : 'formulario-puertos-modular',
    recordId: esIdPersistido(formularioId) ? formularioId : null,
    formData,
    onServerUpdate: onAutoSaveServidor,
    serverReady:
      esIdPersistido(formularioId) &&
      !cargando &&
      !guardandoActas &&
      !generandoWord &&
      !exportando &&
      !hayImagenesPendientesInspeccion(formData),
    canSaveServer: () =>
      !cargando &&
      !guardandoActas &&
      !generandoWord &&
      !exportando &&
      !hayImagenesPendientesInspeccion(formData),
    onRestore: (savedInfo) => {
      setSavedDataToRestore(savedInfo);
      setShowRestoreDialog(true);
    },
  });

  const handleRestoreData = useCallback(() => {
    if (!savedDataToRestore?.data) return;
    setFormData((prev) => ({ ...prev, ...savedDataToRestore.data }));
    setShowRestoreDialog(false);
    enableAutoSave();
  }, [savedDataToRestore, enableAutoSave]);

  const handleDiscardSavedData = useCallback(() => {
    clearSavedData();
    setShowRestoreDialog(false);
    setSavedDataToRestore(null);
  }, [clearSavedData]);

  const handleCancelRestore = useCallback(() => {
    setShowRestoreDialog(false);
  }, []);

  const cargarDesdeActas = async (casoId) => {
    try {
      setCargando(true);
      const caso = await getPuertosCaso(casoId);
      if (!esCasoInspeccionAsegurado(caso)) {
        alert(t('ports.ui.inspeccion.alerts.noEsAsegurado'));
        navigate('/puertos/actas');
        return;
      }
      const { datos } = casoToFormDataInspeccionAseguradoConMeta(caso);
      setFormData((prev) => ({ ...prev, ...datos }));
      setFormularioId(casoId);
      setModoEdicion(true);
      setTipoInforme('riicp004');
    } catch (error) {
      console.error('❌ Error al cargar caso actas:', error);
      alert(t('ports.ui.inspeccion.alerts.cargarInformeError', { error: error.message }));
    } finally {
      setCargando(false);
    }
  };

  const guardarEnActas = async (options = {}) => {
    setGuardandoActas(true);
    setCargando(true);
    try {
      return await persistirEnActas(formData, options);
    } catch (error) {
      console.error('❌ Error al guardar en actas:', error);
      alert(t('ports.ui.inspeccion.alerts.guardarError', { error: error.message }));
      throw error;
    } finally {
      setProgresoSubida(null);
      setGuardandoActas(false);
      setCargando(false);
    }
  };

  const obtenerDataInformeRiicp = async () => {
    if (esFlujoActas) {
      const resultado = await persistirEnActas(formData, { silencioso: true });
      return {
        ...formData,
        ...casoToFormDataInspeccionAsegurado(resultado),
      };
    }
    return formData;
  };

  const handleGenerarWord = async (incluirMapaCalor = true) => {
    try {
      setGenerandoWord(true);
      const esRiicp004 = tipoInforme === 'riicp004';

      if (!esRiicp004) {
        setForzarCapturaMapa((prev) => prev + 1);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await generarWordPuertos(formData, incluirMapaCalor, { locale: documentLocale });
        alert(t('ports.ui.inspeccion.alerts.documentoGenerado', {
          tipo: incluirMapaCalor
            ? t('ports.ui.inspeccion.reportFull')
            : t('ports.ui.inspeccion.reportDaily'),
        }));
      } else {
        const dataInforme = await obtenerDataInformeRiicp();
        await generarWordRiicp004(dataInforme, { locale: documentLocale });
        alert(t('ports.ui.inspeccion.alerts.informeRiicpGenerado', {
          codigo: META_FORMATO_RIICP004.codigo,
        }));
      }
    } catch (error) {
      console.error('❌ Error al generar Word:', error);
      alert(t('ports.ui.inspeccion.alerts.generarDocumentoError', {
        error: error.message || t('ports.ui.inspeccion.alerts.intenteNuevamente'),
      }));
    } finally {
      setGenerandoWord(false);
    }
  };

  const handleGenerarPdf = async () => {
    if (tipoInforme !== 'riicp004') return;
    try {
      setGenerandoPdf(true);
      const dataInforme = await obtenerDataInformeRiicp();
      await generarPdfRiicp004(dataInforme, { locale: documentLocale });
      alert(t('ports.ui.inspeccion.alerts.informeRiicpPdfGenerado', {
        codigo: META_FORMATO_RIICP004.codigo,
      }));
    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      alert(t('ports.ui.inspeccion.alerts.generarDocumentoError', {
        error: error.message || t('ports.ui.inspeccion.alerts.intenteNuevamente'),
      }));
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Función para guardar en historial o en Actas y Descargues
  const handleGuardarHistorial = async () => {
    if (esModoActas || tipoInforme === 'riicp004') {
      return guardarEnActas();
    }
    try {
      setCargando(true);
      
      // Obtener información del usuario
      const nombreUsuario = localStorage.getItem('nombre') || 'Usuario';
      const userId = localStorage.getItem('login') || 'ID';
      
      // Generar código CPD si no existe
      const codigoCPD = formData.codigoReferencia || generarCodigoCPD();
      const casoIdHistorial = esIdPersistido(formularioId) ? formularioId : null;
      const formProcesado = await procesarInspeccionPuertosImagenes(
        formData,
        casoIdHistorial || 'historial-puertos'
      );
      
      const datosFormulario = {
        tipo: 'inspeccion-puertos',
        titulo: `🚢 Inspección Puertos - ${formProcesado.nombreMotonave || formProcesado.nombreCliente || 'Puerto'} - ${formProcesado.municipio || 'Ciudad'}`,
        usuario: nombreUsuario,
        userId: userId,
        estado: 'en_proceso',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        datos: {
          ...formProcesado,
          codigoReferencia: codigoCPD, // Asignar el código generado
          tipoFormulario: 'PUERTOS',
          icono: '🚢'
        }
      };
      
      // Actualizar el estado local con el código generado
      setFormData(prev => ({
        ...prev,
        codigoReferencia: codigoCPD
      }));
      
let formularioGuardado;
      
      // 🔑 Si ya tenemos un formularioId, ACTUALIZAR; si no, CREAR
      if (esIdPersistido(formularioId)) {
formularioGuardado = await historialService.actualizarFormulario(formularioId, datosFormulario);
alert(t('ports.ui.inspeccion.alerts.historialActualizado'));
      } else {
formularioGuardado = await historialService.guardarFormulario(datosFormulario);
// 🔑 Guardar el ID del formulario creado y navegar a la URL con el ID
        const nuevoId = formularioGuardado._id;
        setFormularioId(nuevoId);
navigate(`/puertos/formulario/${nuevoId}`, { replace: true });
        setModoEdicion(true);
        
        alert(t('ports.ui.inspeccion.alerts.historialGuardado'));
      }
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      alert(t('ports.ui.inspeccion.alerts.historialError', { error: error.message }));
    } finally {
      setCargando(false);
    }
  };

  // Función para exportar y guardar
  const handleExportarYGuardar = async () => {
    try {
      setGenerandoWord(true);
      setCargando(true);

      if (esModoActas || tipoInforme === 'riicp004') {
        const resultado = await guardarEnActas({ marcarCompletado: true });
        if (tipoInforme === 'riicp004') {
          const dataWord = {
            ...formData,
            ...casoToFormDataInspeccionAsegurado(resultado),
          };
          await generarWordRiicp004(dataWord, { locale: documentLocale });
          await generarPdfRiicp004(dataWord, { locale: documentLocale });
        }
        return;
      }

      if (tipoInforme !== 'riicp004') {
        setForzarCapturaMapa((prev) => prev + 1);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Generar código CPD si no existe
      const codigoCPD = formData.codigoReferencia || generarCodigoCPD();
      const formDataActualizado = {
        ...formData,
        codigoReferencia: codigoCPD,
      };
      
      if (tipoInforme === 'riicp004') {
        await generarWordRiicp004(formDataActualizado, { locale: documentLocale });
        await generarPdfRiicp004(formDataActualizado, { locale: documentLocale });
      } else {
        await generarWordPuertos(formDataActualizado, true, { locale: documentLocale });
      }

      const casoIdHistorial = esIdPersistido(formularioId) ? formularioId : null;
      const formProcesado = await procesarInspeccionPuertosImagenes(
        formDataActualizado,
        casoIdHistorial || 'historial-puertos'
      );
      setFormData(formProcesado);
      
      // Obtener información del usuario
      const nombreUsuario = localStorage.getItem('nombre') || 'Usuario';
      const userId = localStorage.getItem('login') || 'ID';
      
      // Luego guardar en historial
      const datosFormulario = {
        tipo: 'inspeccion-puertos',
        titulo: `🚢 Inspección Puertos - ${formProcesado.nombreMotonave || formProcesado.nombreCliente || 'Puerto'} - ${formProcesado.municipio || 'Ciudad'}`,
        usuario: nombreUsuario,
        userId: userId,
        estado: 'completado',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        datos: {
          ...formProcesado,
          tipoFormulario: 'PUERTOS',
          icono: '🚢'
        }
      };
      
let formularioGuardado;
      
      // 🔑 Si ya tenemos un formularioId, ACTUALIZAR; si no, CREAR
      if (esIdPersistido(formularioId)) {
formularioGuardado = await historialService.actualizarFormulario(formularioId, datosFormulario);
alert(t('ports.ui.inspeccion.alerts.docYHistorialActualizado'));
      } else {
formularioGuardado = await historialService.guardarFormulario(datosFormulario);
// 🔑 Guardar el ID del formulario creado y navegar a la URL con el ID
        const nuevoId = formularioGuardado._id;
        setFormularioId(nuevoId);
navigate(`/puertos/formulario/${nuevoId}`, { replace: true });
        setModoEdicion(true);
        
        alert(t('ports.ui.inspeccion.alerts.docYHistorialGuardado'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert(t('ports.ui.inspeccion.alerts.procesoError', { error: error.message }));
    } finally {
      setGenerandoWord(false);
      setCargando(false);
    }
  };

  // Función para cargar datos del formulario existente desde el servidor
  const cargarDatosFormulario = async (formularioId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No hay token disponible');
        setCargando(false);
        return;
      }
      
      const baseURL = BASE_URL;

const response = await fetch(`${baseURL}/api/historial-formularios/${formularioId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.formulario) {
        const formulario = data.formulario;
// Cargar TODOS los datos del formulario en formData
        if (formulario.datos) {
          // Procesar imágenes si existen - convertir rutas del servidor a URLs completas
          let imagenesRegistro = [];
          if (formulario.datos.imagenesRegistro && Array.isArray(formulario.datos.imagenesRegistro)) {
imagenesRegistro = formulario.datos.imagenesRegistro.map((img) => {
// Si la imagen tiene ruta del servidor, convertirla a URL completa
              if (img.ruta) {
                const imagenProcesada = {
                  ...img,
                  src: `${baseURL}${img.ruta}`,     // URL completa para mostrar
                  ruta: img.ruta,                    // Mantener ruta original
                  id: img.id || Date.now() + Math.random()
                };
return imagenProcesada;
              }
return img;
            });
            
}
          
          // Validar y corregir la fecha al cargar desde servidor
          let fechaCorregida = formulario.datos.fecha || formulario.datos.fechaInspeccion;
          if (fechaCorregida) {
            // Si la fecha viene en formato ISO o con hora, extraer solo la fecha
            if (fechaCorregida.includes('T')) {
              fechaCorregida = fechaCorregida.split('T')[0];
            }
            // Validar formato YYYY-MM-DD
            const fechaParts = fechaCorregida.split('-');
            if (fechaParts.length === 3) {
              const [year, month, day] = fechaParts.map(Number);
              // Verificar si la fecha es válida
              const fechaValidada = new Date(year, month - 1, day);
              if (fechaValidada.getFullYear() === year && 
                  fechaValidada.getMonth() === month - 1 && 
                  fechaValidada.getDate() === day) {
                // Fecha válida, mantenerla
                fechaCorregida = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              } else {
                // Fecha inválida, usar fecha actual
                const hoy = new Date();
                const yearNow = hoy.getFullYear();
                const monthNow = hoy.getMonth() + 1;
                const dayNow = hoy.getDate();
                fechaCorregida = `${yearNow}-${String(monthNow).padStart(2, '0')}-${String(dayNow).padStart(2, '0')}`;
}
            }
          }
          
          setFormData(prev => ({
            ...prev,
            ...formulario.datos,
            // Asegurar que campos críticos estén presentes
            fecha: fechaCorregida || prev.fecha,
            // Asegurar que las imágenes se carguen correctamente con URLs completas
            imagenesRegistro: imagenesRegistro
          }));
        }
        
} else {
        console.error('❌ No se pudo obtener el formulario');
        alert(t('ports.ui.inspeccion.alerts.cargarFormularioFallo'));
      }
    } catch (error) {
      console.error('❌ Error al cargar formulario:', error);
      alert(t('ports.ui.inspeccion.alerts.cargarFormularioError', { error: error.message }));
    } finally {
      setCargando(false);
    }
  };

  // Efecto para detectar modo edición y cargar datos
  useEffect(() => {
    if (!id || id === 'nuevo' || id === 'nueva') return;
    setModoEdicion(true);
    setFormularioId(id);
    if (esModoActas || location.pathname.includes('/inspeccion-asegurado')) {
      cargarDesdeActas(id);
    } else {
      setCargando(true);
      cargarDatosFormulario(id);
    }
  // Loading helpers intentionally remain stable for this route-driven effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, esModoActas, location.pathname]);

  // Cargar datos desde localStorage al iniciar (solo si NO hay ID)
  useEffect(() => {
    if (id && id !== 'nuevo' && id !== 'nueva') return;
    if (esModoActas) return;
      const datosGuardados = localStorage.getItem('formularioPuertosModular');
      if (datosGuardados) {
        try {
          const datosParseados = JSON.parse(datosGuardados);
          // Validar formato de fecha (solo corregir si está mal formateada, no cambiar la fecha en sí)
          if (datosParseados.fecha) {
            // Si la fecha viene en formato ISO con hora, extraer solo la fecha
            if (datosParseados.fecha.includes('T')) {
              datosParseados.fecha = datosParseados.fecha.split('T')[0];
            }
            // Validar que tenga formato YYYY-MM-DD
            const fechaParts = datosParseados.fecha.split('-');
            if (fechaParts.length !== 3 || fechaParts[0].length !== 4) {
              // Fecha mal formateada, usar fecha actual
              datosParseados.fecha = obtenerFechaActual();
}
          } else {
            // Si no hay fecha, usar fecha actual
            datosParseados.fecha = obtenerFechaActual();
          }
          setFormData(prev => ({ ...prev, ...datosParseados }));
        } catch (error) {
          console.error('Error al cargar datos:', error);
          localStorage.removeItem('formularioPuertosModular');
        }
      }
  }, [id, esModoActas]);

  return (
    <div 
      className="min-h-screen p-2 sm:p-4 lg:p-8"
      style={{ backgroundColor: bgMain }}
    >
      <div 
        className="max-w-4xl mx-auto shadow-lg rounded-lg p-3 sm:p-4 lg:p-6"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        {/* Encabezado */}
        <div 
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 gap-4"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <img src={Logo} alt="Logo PROSER" className="h-12 sm:h-16 object-contain" />
            <FormAutoSaveControls
              placement="inline"
              isExistingRecord={isExistingRecord}
              isAutoSaveEnabled={isAutoSaveEnabled}
              lastSaveTime={lastSaveTime}
              saveStatus={saveStatus}
              enableAutoSave={enableAutoSave}
              disableAutoSave={disableAutoSave}
              saveNow={saveNow}
              syncNow={syncNow}
              pendingServerSync={pendingServerSync}
              isOnline={isOnline}
              showRestoreDialog={showRestoreDialog}
              savedDataToRestore={savedDataToRestore}
              onRestore={handleRestoreData}
              onDiscard={handleDiscardSavedData}
              onCancelRestore={handleCancelRestore}
            />
            {modoEdicion && (
              <div 
                className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                  color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                }}
              >
                ✏️ {t('ports.ui.inspeccion.editMode')}
              </div>
            )}
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <p 
              className="text-xs sm:text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              {t('ports.ui.inspeccion.date')}
            </p>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => handleInputChange('fecha', e.target.value)}
              className="text-xs sm:text-sm rounded px-2 py-1 w-full sm:w-auto"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </div>
        </div>

        {/* Título Principal */}
        <div className="mb-8 text-center">
          <h1 
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.inspeccion.title')}
          </h1>
          <p 
            className="text-sm"
            style={{ color: textSecondary }}
          >
            {tipoInforme === 'riicp004'
              ? t('ports.ui.inspeccion.subtitleRiicp')
              : t('ports.ui.inspeccion.subtitleDiario')}
          </p>
        </div>

        {/* Selector de Tipo de Informe — solo en informe diario / completo */}
        {tipoInforme !== 'riicp004' && (
        <div 
          className="mb-6 flex flex-col sm:flex-row gap-3 justify-center items-center"
          style={{
            borderBottom: `1px solid ${borderColor}`,
            paddingBottom: '1rem'
          }}
        >
          <label 
            className="text-sm font-medium"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.inspeccion.reportType')}
          </label>
          <select
            value={tipoInforme}
            onChange={(e) => {
              setTipoInforme(e.target.value);
              handleInputChange('plantillaInforme', e.target.value);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`,
              minWidth: '200px'
            }}
            disabled={generandoWord || cargando}
          >
            <option value="diario">📅 {t('ports.ui.inspeccion.reportDaily')}</option>
            <option value="completo">📊 {t('ports.ui.inspeccion.reportFull')}</option>
          </select>
        </div>
        )}

        {/* SUBCOMPONENTES */}
        
        {/* 0. Sección Inicial (Campos básicos + Vista previa + Tabla de Contenido) */}
        <SeccionInicialPuertos 
          formData={formData}
          onInputChange={handleInputChange}
          onMultipleChange={handleMultipleInputChange}
          cargando={cargando}
          forzarCapturaMapa={forzarCapturaMapa}
          ocultarGeolocalizacion={tipoInforme === 'riicp004'}
        />

        {tipoInforme === 'riicp004' && (
          <>
            <SeccionRiicp004Puertos
              formData={formData}
              onInputChange={handleInputChange}
              cargando={cargando}
            />
            <ObservacionesRiicp004
              formData={formData}
              onInputChange={handleInputChange}
              cargando={cargando}
            />
            <InformeFotograficoRiicp004
              formData={formData}
              onInputChange={handleInputChange}
              cargando={cargando}
            />
            <RecomendacionesPuertos
              formData={formData}
              onInputChange={handleInputChange}
              cargando={cargando}
              tituloSeccion={t('ports.ui.formulario.recomendaciones.tituloRiicp')}
            />
            <ConclusionesRiicp004
              formData={formData}
              onInputChange={handleInputChange}
              cargando={cargando}
            />
          </>
        )}

        {tipoInforme !== 'riicp004' && (
          <>
            <DocumentosTransportePuertos
              formData={formData}
              onInputChange={handleInputChange}
              onMultipleChange={handleMultipleInputChange}
              cargando={cargando}
            />

            {tipoInforme === 'completo' && (
              <AnalisisRiesgosPuertos
                formData={formData}
                onInputChange={handleInputChange}
                cargando={cargando}
              />
            )}

            <InformeFotograficoPuertos
              formData={formData}
              onInputChange={handleInputChange}
              cargando={cargando}
            />

            <RecomendacionesPuertos
              formData={formData}
              onInputChange={handleInputChange}
              cargando={cargando}
            />
          </>
        )}

        {/* 5. Firma */}
        <FirmaPuertos 
          formData={formData}
          onInputChange={handleInputChange}
          onMultipleChange={handleMultipleInputChange}
          cargando={cargando}
        />

        {/* Botones de Acción - Al Final */}
        <div
          className="mt-8"
          style={{
            borderTop: `1px solid ${borderColor}`,
            paddingTop: '2rem'
          }}
        >
          {/* Botón para generar manual - Solo visible para administradores */}
          {esAdmin && (
            <div className="mb-6 flex justify-center">
              <button
                onClick={handleGenerarManual}
                className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{
                  backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444',
                  color: '#FFFFFF',
                  border: `2px solid ${theme === 'dark' ? '#FCA5A5' : '#DC2626'}`
                }}
                disabled={generandoManual || cargando}
                title={t('ports.ui.inspeccion.generateManualTitle')}
              >
                {generandoManual
                  ? `⏳ ${t('ports.ui.inspeccion.generatingManual')}`
                  : `📘 ${t('ports.ui.inspeccion.generateManual')}`}
              </button>
            </div>
          )}

          {/* Botones principales del formulario */}
          <div className="mb-4 flex justify-center">
            <DocumentLanguageSelector
              value={documentLocale}
              onChange={setDocumentLocale}
              id="puertos-document-language"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGuardarHistorial}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
                color: '#FFFFFF'
              }}
              disabled={(esFlujoActas ? guardandoActas : guardando) || cargando}
            >
              {(esFlujoActas ? guardandoActas : guardando) || cargando
                ? progresoSubida
                  ? progresoSubida.totalLotes > 1
                    ? `⏳ ${t('ports.ui.inspeccion.uploadingBatch', {
                        lote: progresoSubida.lote,
                        total: progresoSubida.totalLotes,
                      })}`
                    : `⏳ ${t('ports.ui.inspeccion.uploadingPhotos')}`
                  : hayImagenesPendientesInspeccion(formData)
                    ? `⏳ ${t('ports.ui.inspeccion.uploadingPhotos')}`
                    : `⏳ ${t('ports.ui.inspeccion.saving')}`
                : esModoActas || tipoInforme === 'riicp004'
                  ? `💾 ${t('ports.ui.inspeccion.saveActas')}`
                  : `💾 ${t('ports.ui.inspeccion.saveHistorial')}`}
            </button>

            <button
              onClick={() =>
                handleGenerarWord(tipoInforme === 'completo')
              }
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: theme === 'dark' ? '#059669' : '#10B981',
                color: '#FFFFFF'
              }}
              disabled={generandoWord || generandoPdf || cargando}
            >
              {generandoWord
                ? `⏳ ${t('ports.ui.inspeccion.exporting')}`
                : `📄 ${t('ports.ui.inspeccion.exportWord')}`}
            </button>

            {tipoInforme === 'riicp004' && (
              <button
                type="button"
                onClick={handleGenerarPdf}
                className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{
                  backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444',
                  color: '#FFFFFF',
                }}
                disabled={generandoWord || generandoPdf || cargando}
              >
                {generandoPdf
                  ? `⏳ ${t('ports.ui.inspeccion.exportingPdf')}`
                  : `📕 ${t('ports.ui.inspeccion.exportPdf')}`}
              </button>
            )}

            <button
              onClick={handleExportarYGuardar}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: theme === 'dark' ? '#7C3AED' : '#8B5CF6',
                color: '#FFFFFF'
              }}
              disabled={generandoWord || generandoPdf || cargando || exportando}
            >
              {(generandoWord || generandoPdf || exportando) ? t('ports.ui.inspeccion.processing') : t('ports.ui.inspeccion.exportAndSave')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

