import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Logo from '../../img/Logo.png';
import { generarWordPuertos } from './generarWordPuertos';
import { generarManualPuertos } from './generarManualPuertos';
import { useHistorialFormulario } from '../../hooks/useHistorialFormulario';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService';
import { BASE_URL } from '../../config/apiConfig.js';
import { getImageUrl } from '../../utils/imageUtils.js';

// Importar subcomponentes
import SeccionInicialPuertos from './SeccionInicialPuertos';
import DocumentosTransportePuertos from './DocumentosTransportePuertos';
import AnalisisRiesgosPuertos from './AnalisisRiesgosPuertos';
import InformeFotograficoPuertos from './InformeFotograficoPuertos';
import RecomendacionesPuertos from './RecomendacionesPuertos';
import FirmaPuertos from './FirmaPuertos';

export default function PuertosInspeccionMain() {
  const { theme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const componenteMontadoRef = React.useRef(true);
  
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
  const [generandoManual, setGenerandoManual] = useState(false);
  const [tipoInforme, setTipoInforme] = useState('diario'); // 'diario' o 'completo'
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0); // Contador para forzar captura
  
  // 🔑 Estado para mantener el ID del formulario después del primer guardado
  const [formularioId, setFormularioId] = useState(id && id !== 'nuevo' ? id : null);
  
  // Hook para historial - Tipo específico para PUERTOS
  const { guardando, exportando, guardarEnHistorial, exportarYGuardar } = useHistorialFormulario(TIPOS_FORMULARIOS.INSPECCION_PUERTOS);

  // Estado central del formulario - TODO EL ESTADO EN UN SOLO LUGAR
  const [formData, setFormData] = useState({
    // Sección Inicial - Carta de Presentación
    clienteSeleccionado: '',
    nombreCliente: '',
    codigoReferencia: '',
    nombreContacto: '',
    cargoContacto: '',
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
      console.log('📅 Fecha inicializada:', fechaFormateada, '| Fecha objeto:', ahora, '| Día:', day, '| Mes:', month, '| Año:', year);
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
    
    // Registro fotográfico general
    imagenesRegistro: []
    // imagenMapa y coordenadasRiesgo ya están definidos arriba (líneas 67-68)
  });

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

  // Función para generar documento Word
  const handleGenerarWord = async (incluirMapaCalor = true) => {
    try {
      setGenerandoWord(true);
      const tipoInforme = incluirMapaCalor ? 'Completo' : 'Diario';
      console.log(`🚀 Generando documento Word (${tipoInforme})...`);
      
      // Forzar captura del mapa antes de generar
      console.log('📸 Forzando captura del mapa antes de generar Word...');
      setForzarCapturaMapa(prev => prev + 1);
      
      // Esperar un momento para que se complete la captura
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await generarWordPuertos(formData, incluirMapaCalor);
      alert(`✅ Documento ${tipoInforme} generado exitosamente`);
    } catch (error) {
      console.error('❌ Error al generar Word:', error);
      alert('Error al generar el documento. Por favor, intente nuevamente.');
    } finally {
      setGenerandoWord(false);
    }
  };

  // Verificar si el usuario es administrador
  const esAdmin = localStorage.getItem('rol') === 'admin';
  
  // Función para generar manual
  const handleGenerarManual = async () => {
    try {
      setGenerandoManual(true);
      console.log('📘 Generando manual de uso...');
      await generarManualPuertos();
      alert('✅ Manual generado exitosamente. Revisa la carpeta de descargas.');
    } catch (error) {
      console.error('❌ Error al generar manual:', error);
      alert('Error al generar el manual. Por favor, intente nuevamente.');
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

  // Función para guardar en historial
  const handleGuardarHistorial = async () => {
    try {
      setCargando(true);
      
      // Obtener información del usuario
      const nombreUsuario = localStorage.getItem('nombre') || 'Usuario';
      const userId = localStorage.getItem('login') || 'ID';
      
      // Generar código CPD si no existe
      const codigoCPD = formData.codigoReferencia || generarCodigoCPD();
      
      // 🔍 VERIFICAR IMÁGENES ANTES DE GUARDAR
      console.log('🔍 Verificando imágenes antes de guardar...');
      console.log('📸 Número de imágenes:', formData.imagenesRegistro?.length || 0);
      if (formData.imagenesRegistro && formData.imagenesRegistro.length > 0) {
        formData.imagenesRegistro.forEach((img, index) => {
          console.log(`📷 Imagen ${index + 1}:`, {
            nombre: img.nombre,
            tieneFile: !!img.file,
            tieneSrc: !!img.src,
            tieneRuta: !!img.ruta,
            descripcion: img.descripcion
          });
        });
      }
      
      const datosFormulario = {
        tipo: 'inspeccion-puertos',
        titulo: `🚢 Inspección Puertos - ${formData.nombreMotonave || formData.nombreCliente || 'Puerto'} - ${formData.municipio || 'Ciudad'}`,
        usuario: nombreUsuario,
        userId: userId,
        estado: 'en_proceso',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        datos: {
          ...formData,
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
      
      console.log('💾 Enviando datos al historial...');
      console.log('🔑 Usando formularioId:', formularioId);
      
      let formularioGuardado;
      
      // 🔑 Si ya tenemos un formularioId, ACTUALIZAR; si no, CREAR
      if (formularioId && formularioId !== 'nuevo') {
        console.log('🔄 Actualizando formulario existente con ID:', formularioId);
        formularioGuardado = await historialService.actualizarFormulario(formularioId, datosFormulario);
        console.log('✅ Formulario actualizado exitosamente');
        alert('✅ Formulario actualizado en historial exitosamente');
      } else {
        console.log('🆕 Creando nuevo formulario en historial');
        formularioGuardado = await historialService.guardarFormulario(datosFormulario);
        console.log('✅ Formulario creado exitosamente con ID:', formularioGuardado._id);
        
        // 🔑 Guardar el ID del formulario creado y navegar a la URL con el ID
        const nuevoId = formularioGuardado._id;
        setFormularioId(nuevoId);
        console.log('🔑 Navegando a URL con ID:', nuevoId);
        navigate(`/puertos/formulario/${nuevoId}`, { replace: true });
        setModoEdicion(true);
        
        alert('✅ Formulario guardado en historial exitosamente');
      }
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      alert('Error al guardar en historial: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Función para exportar y guardar
  const handleExportarYGuardar = async () => {
    try {
      setGenerandoWord(true);
      setCargando(true);
      
      // Forzar captura del mapa antes de generar
      console.log('📸 Forzando captura del mapa antes de exportar y guardar...');
      setForzarCapturaMapa(prev => prev + 1);
      
      // Esperar un momento para que se complete la captura
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generar código CPD si no existe
      const codigoCPD = formData.codigoReferencia || generarCodigoCPD();
      
      // Actualizar formData con el código generado
      const formDataActualizado = {
        ...formData,
        codigoReferencia: codigoCPD
      };
      
      // Actualizar el estado local con el código generado
      setFormData(formDataActualizado);
      
      // Primero generar el Word con el código actualizado (informe completo por defecto)
      await generarWordPuertos(formDataActualizado, true);
      
      // Obtener información del usuario
      const nombreUsuario = localStorage.getItem('nombre') || 'Usuario';
      const userId = localStorage.getItem('login') || 'ID';
      
      // Luego guardar en historial
      const datosFormulario = {
        tipo: 'inspeccion-puertos',
        titulo: `🚢 Inspección Puertos - ${formData.nombreMotonave || formData.nombreCliente || 'Puerto'} - ${formData.municipio || 'Ciudad'}`,
        usuario: nombreUsuario,
        userId: userId,
        estado: 'completado',
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        datos: {
          ...formDataActualizado,
          tipoFormulario: 'PUERTOS',
          icono: '🚢'
        }
      };
      
      console.log('💾 Enviando datos al historial (exportar y guardar)...');
      console.log('🔑 Usando formularioId:', formularioId);
      
      let formularioGuardado;
      
      // 🔑 Si ya tenemos un formularioId, ACTUALIZAR; si no, CREAR
      if (formularioId && formularioId !== 'nuevo') {
        console.log('🔄 Actualizando formulario existente con ID:', formularioId);
        formularioGuardado = await historialService.actualizarFormulario(formularioId, datosFormulario);
        console.log('✅ Formulario actualizado exitosamente');
        alert('✅ Documento generado y formulario actualizado exitosamente');
      } else {
        console.log('🆕 Creando nuevo formulario en historial');
        formularioGuardado = await historialService.guardarFormulario(datosFormulario);
        console.log('✅ Formulario creado exitosamente con ID:', formularioGuardado._id);
        
        // 🔑 Guardar el ID del formulario creado y navegar a la URL con el ID
        const nuevoId = formularioGuardado._id;
        setFormularioId(nuevoId);
        console.log('🔑 Navegando a URL con ID:', nuevoId);
        navigate(`/puertos/formulario/${nuevoId}`, { replace: true });
        setModoEdicion(true);
        
        alert('✅ Documento generado y guardado en historial exitosamente');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error en el proceso: ' + error.message);
    } finally {
      setGenerandoWord(false);
      setCargando(false);
    }
  };

  // Autoguardado en localStorage (solo mientras está en el formulario)
  useEffect(() => {
    const esRutaPuertos = location.pathname.includes('/puertos/formulario');
    if (!esRutaPuertos) return;

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('formularioPuertosModular', JSON.stringify(formData));
        console.log('💾 Datos autoguardados en localStorage');
      } catch (error) {
        console.error('Error al guardar datos:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData, location.pathname]);

  // Limpiar localStorage cuando el componente se desmonta (navegación intencional)
  useEffect(() => {
    componenteMontadoRef.current = true;
    
    return () => {
      // Cleanup: se ejecuta cuando el componente se desmonta
      componenteMontadoRef.current = false;
      
      // Limpiar localStorage para formularios nuevos cuando el usuario navega fuera
      // Usar un pequeño delay para permitir que la navegación se complete
      setTimeout(() => {
        const estaEnFormulario = window.location.pathname.includes('/puertos/formulario');
        
        // Si NO estamos en el formulario, es navegación intencional - limpiar
        if (!estaEnFormulario) {
          const datosGuardados = localStorage.getItem('formularioPuertosModular');
          if (datosGuardados) {
            try {
              const datosParseados = JSON.parse(datosGuardados);
              // Solo limpiar formularios nuevos (sin formularioId o formularioId === 'nuevo')
              // Los formularios guardados en historial NO se limpian
              if (!datosParseados.formularioId || datosParseados.formularioId === 'nuevo') {
                console.log('🧹 Limpiando localStorage: usuario salió del formulario por navegación');
                localStorage.removeItem('formularioPuertosModular');
              }
            } catch (error) {
              console.error('Error al verificar localStorage:', error);
            }
          }
        }
        // Si estamos en el formulario, es un refresh - los datos ya están guardados por beforeunload
      }, 200);
    };
  }, []);

  // Detectar refresco de página o pérdida de conexión para conservar datos
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Al refrescar o cerrar pestaña, conservar los datos en localStorage
      const esRutaPuertos = location.pathname.includes('/puertos/formulario');
      if (esRutaPuertos && formData) {
        try {
          localStorage.setItem('formularioPuertosModular', JSON.stringify(formData));
          console.log('💾 Datos guardados antes de refrescar/cerrar');
        } catch (error) {
          console.error('Error al guardar antes de unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData, location.pathname]);

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

      console.log('🔍 Cargando formulario desde servidor:', formularioId);
      
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
        console.log('✅ Formulario cargado:', formulario);
        
        // Cargar TODOS los datos del formulario en formData
        if (formulario.datos) {
          // Procesar imágenes si existen - convertir rutas del servidor a URLs completas
          let imagenesRegistro = [];
          if (formulario.datos.imagenesRegistro && Array.isArray(formulario.datos.imagenesRegistro)) {
            console.log('📸 Imágenes recibidas del servidor:', formulario.datos.imagenesRegistro.length);
            console.log('📸 Datos de imágenes:', formulario.datos.imagenesRegistro);
            
            imagenesRegistro = formulario.datos.imagenesRegistro.map((img, index) => {
              console.log(`🖼️ Procesando imagen ${index + 1}:`, img);
              
              // Si la imagen tiene ruta del servidor, convertirla a URL completa
              if (img.ruta) {
                const imagenProcesada = {
                  ...img,
                  src: getImageUrl(img),
                  ruta: img.ruta,
                  id: img.id || Date.now() + Math.random()
                };
                console.log(`✅ Imagen ${index + 1} procesada:`, imagenProcesada);
                return imagenProcesada;
              }
              console.log(`⚠️ Imagen ${index + 1} sin ruta válida`);
              return img;
            });
            
            console.log('✅ Total de imágenes procesadas:', imagenesRegistro.length);
          } else {
            console.log('⚠️ No hay imágenes en el formulario o no es un array');
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
                console.log('📅 Fecha corregida a fecha actual:', fechaCorregida);
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
        
        console.log('✅ Datos del formulario cargados exitosamente');
      } else {
        console.error('❌ No se pudo obtener el formulario');
        alert('No se pudo cargar el formulario');
      }
    } catch (error) {
      console.error('❌ Error al cargar formulario:', error);
      alert(`Error al cargar el formulario: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // Efecto para detectar modo edición y cargar datos
  useEffect(() => {
    if (id && id !== 'nuevo') {
      setModoEdicion(true);
      setCargando(true);
      setFormularioId(id); // 🔑 Actualizar formularioId cuando se carga uno existente
      cargarDatosFormulario(id);
    }
  }, [id]);

  // Cargar datos desde localStorage al iniciar (solo si NO hay ID)
  useEffect(() => {
    if (!id || id === 'nuevo') {
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
              console.log('📅 Fecha mal formateada, corregida a:', datosParseados.fecha);
            }
          } else {
            // Si no hay fecha, usar fecha actual
            datosParseados.fecha = obtenerFechaActual();
          }
          setFormData(prev => ({ ...prev, ...datosParseados }));
          console.log('✅ Datos cargados desde localStorage');
        } catch (error) {
          console.error('Error al cargar datos:', error);
          localStorage.removeItem('formularioPuertosModular');
        }
      }
    }
  }, [id]);

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
            {modoEdicion && (
              <div 
                className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                  color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                }}
              >
                ✏️ Modo Edición
              </div>
            )}
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <p 
              className="text-xs sm:text-sm font-semibold mb-1"
              style={{ color: textPrimary }}
            >
              FECHA:
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
            FORMULARIO DE INSPECCIÓN DE PUERTOS
          </h1>
          <p 
            className="text-sm"
            style={{ color: textSecondary }}
          >
            Sistema modular para inspección de riesgos en puertos
          </p>
        </div>

        {/* Selector de Tipo de Informe - Arriba */}
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
            Tipo de Informe:
          </label>
          <select
            value={tipoInforme}
            onChange={(e) => setTipoInforme(e.target.value)}
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
            <option value="diario">📅 Informe Diario</option>
            <option value="completo">📊 Informe Completo</option>
          </select>
        </div>

        {/* SUBCOMPONENTES */}
        
        {/* 0. Sección Inicial (Campos básicos + Vista previa + Tabla de Contenido) */}
        <SeccionInicialPuertos 
          formData={formData}
          onInputChange={handleInputChange}
          onMultipleChange={handleMultipleInputChange}
          cargando={cargando}
          forzarCapturaMapa={forzarCapturaMapa}
        />

        {/* 1. Documentos del Transporte (Página 2) */}
        <DocumentosTransportePuertos 
          formData={formData}
          onInputChange={handleInputChange}
          onMultipleChange={handleMultipleInputChange}
          cargando={cargando}
        />

        {/* 2. ANÁLISIS DE RIESGOS Y MAPA DE CALOR - Solo visible en Informe Completo */}
        {tipoInforme === 'completo' && (
          <AnalisisRiesgosPuertos 
            formData={formData}
            onInputChange={handleInputChange}
            cargando={cargando}
          />
        )}

        {/* 3. Informe Fotográfico por VIN (Después del Mapa de Calor) */}
        <InformeFotograficoPuertos 
          formData={formData}
          onInputChange={handleInputChange}
          cargando={cargando}
        />

        {/* 4. Recomendaciones */}
        <RecomendacionesPuertos 
          formData={formData}
          onInputChange={handleInputChange}
          cargando={cargando}
        />

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
                title="Genera un documento Word con las instrucciones completas de uso del formulario"
              >
                {generandoManual ? '⏳ Generando Manual...' : '📘 Generar Manual de Uso'}
              </button>
            </div>
          )}

          {/* Botones principales del formulario */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGuardarHistorial}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
                color: '#FFFFFF'
              }}
              disabled={cargando || guardando}
            >
              {guardando ? '⏳ Guardando...' : '💾 Guardar en Historial'}
            </button>

            <button
              onClick={() => handleGenerarWord(tipoInforme === 'completo')}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: theme === 'dark' ? '#059669' : '#10B981',
                color: '#FFFFFF'
              }}
              disabled={generandoWord || cargando}
            >
              {generandoWord ? '⏳ Generando...' : '📄 Generar Word'}
            </button>

            <button
              onClick={handleExportarYGuardar}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: theme === 'dark' ? '#7C3AED' : '#8B5CF6',
                color: '#FFFFFF'
              }}
              disabled={generandoWord || cargando || exportando}
            >
              {(generandoWord || exportando) ? '⏳ Procesando...' : '🚀 Exportar y Guardar'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

