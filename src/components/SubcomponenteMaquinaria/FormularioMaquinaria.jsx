import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, HeadingLevel, ImageRun, Header, WidthType, Media } from "docx";
import { saveAs } from "file-saver";
import EncabezadoMaquinaria from "./EncabezadoMaquinaria";
import CartaPresentacionMaquinaria from "./CartaPresentacionMaquinaria";
import TablaInspeccionMaquinaria from "./TablaInspeccionMaquinaria";
import DescripcionBienAsegurado from "./DescripcionBienAsegurado";
import EstadoGeneralMaquinaria from "./EstadoGeneralMaquinaria";
import TipoProteccionMaquinaria from "./TipoProteccionMaquinaria";
import RecomendacionesObservacionesMaquinaria from "./RecomendacionesObservacionesMaquinaria";
import RegistroFotograficoMaquinaria from "./RegistroFotograficoMaquinaria";
import FirmaMaquinaria from "./FirmaMaquinaria";
import Logo from '../../img/Logo.png'; // Ajusta la ruta según tu estructura
import BotonesHistorial from '../BotonesHistorial.jsx';
import { BASE_URL } from '../../config/apiConfig.js';
import { useHistorialFormulario } from '../../hooks/useHistorialFormulario.js';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';
import { aseguradorasConFuncionarios } from '../../data/aseguradorasFuncionarios.js';
import colombia from '../../data/colombia.json';
import { debug } from '../../utils/appLogger.js';

//import proserLogo from "../../img/logo.png";

// Datos maestros para llenado automático usando datos reales del proyecto
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
  asegurados: [
    {
      id: 'empresa1',
      nombre: 'Constructora ABC Ltda',
      tipo: 'Empresa',
      nit: '900.123.456-7',
      direccion: 'Calle 123 #45-67, Bogotá',
      telefono: '+57 1 2345678',
      email: 'contacto@abc.com',
      sector: 'Construcción',
      representante: 'Juan Pérez',
      cargo: 'Gerente General'
    },
    {
      id: 'empresa2',
      nombre: 'Minería XYZ S.A.',
      tipo: 'Empresa',
      nit: '800.987.654-3',
      direccion: 'Carrera 78 #90-12, Medellín',
      telefono: '+57 4 5678901',
      email: 'info@xyz.com',
      sector: 'Minería',
      representante: 'María García',
      cargo: 'Directora Ejecutiva'
    },
    {
      id: 'empresa3',
      nombre: 'Transportes 123 SAS',
      tipo: 'Empresa',
      nit: '700.456.789-0',
      direccion: 'Avenida 34 #56-78, Cali',
      telefono: '+57 2 3456789',
      email: 'admin@123.com',
      sector: 'Transporte',
      representante: 'Carlos López',
      cargo: 'Presidente'
    },
    {
      id: 'persona1',
      nombre: 'Ana Rodríguez',
      tipo: 'Persona Natural',
      cedula: '52.345.678-9',
      direccion: 'Calle 67 #89-01, Barranquilla',
      telefono: '+57 5 9900112',
      email: 'ana.rodriguez@email.com',
      sector: 'Comercio',
      representante: 'Ana Rodríguez',
      cargo: 'Propietaria'
    }
  ]
};

// Debug: Verificar que los datos maestros se carguen correctamente
debug('🔍 DATOS_MAESTROS cargados:', {
  aseguradoras: DATOS_MAESTROS.aseguradoras.length,
  ciudades: DATOS_MAESTROS.ciudades.length,
  asegurados: DATOS_MAESTROS.asegurados.length
});
debug('🔍 Primera aseguradora:', DATOS_MAESTROS.aseguradoras[0]);

const toArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      return reject(new Error("El archivo no es un Blob válido."));
    }

    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};


export const convertirHtmlADocx = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements = Array.from(doc.body.childNodes);

  const docxParagraphs = elements.flatMap((node) => {
    if (node.nodeName === "UL") {
      return Array.from(node.children).map((li) =>
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: li.textContent, font: "Arial", size: 24 })],
        })
      );
    }

    if (node.nodeName === "OL") {
      return Array.from(node.children).map((li) =>
        new Paragraph({
          numbering: { reference: "lista-numerada", level: 0 },
          children: [new TextRun({ text: li.textContent, font: "Arial", size: 24 })],
        })
      );
    }

    return new Paragraph({
      children: [new TextRun({ text: node.textContent, font: "Arial", size: 24 })],
    });
  });

  return docxParagraphs;
};

export default function FormularioMaquinaria() {
  // Estados principales
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [nombreAsegurado, setNombreAsegurado] = useState("");
  const [nombreMaquinaria, setNombreMaquinaria] = useState("");
  const [ciudadFecha, setCiudadFecha] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [referencia, setReferencia] = useState("");
  const [saludo, setSaludo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [fotos, setFotos] = useState([{ src: "", descripcion: "" }]);
  const [aseguradora, setAseguradora] = useState("");
  const [equipo, setEquipo] = useState("");
  const [marca, setMarca] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marcaBien, setMarcaBien] = useState("");
  const [electrico, setElectrico] = useState("");
  const [tipoProteccion, setTipoProteccion] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [inspectorSeleccionado, setInspectorSeleccionado] = useState("");
  const [cargoSeleccionado, setCargoSeleccionado] = useState("");
  const [imagenesRegistro, setImagenesRegistro] = useState([]); // Para varias fotos
  const [fotoPrincipal, setFotoPrincipal] = useState(null); // archivo File
  const [fotoPrincipalPreview, setFotoPrincipalPreview] = useState(""); // base64 para mostrar
  const [descripcionFotoPrincipal, setDescripcionFotoPrincipal] = useState("");
  const [tomador, setTomador] = useState("");
  const [lugar, setLugar] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [modelo, setModelo] = useState("");
  const [linea, setLinea] = useState("");
  const [motorDiesel, setMotorDiesel] = useState("");
  const [sistemaLocomocion, setSistemaLocomocion] = useState("");
  const [color, setColor] = useState("");
  const [estadoOperativo, setEstadoOperativo] = useState("");
  const [cabina, setCabina] = useState("");
  const [funcion, setFuncion] = useState("");
  const [equipoContraincendio, setEquipoContraincendio] = useState("");
  const [equipoRadio, setEquipoRadio] = useState("");
  const [radiodeOperacion, setRadiodeOperacion] = useState("");
  const [mecanico, setMecanico] = useState("");
  const [hidraulico, setHidraulico] = useState("");
  const [pintura, setPintura] = useState("");
  const [chasis, setChasis] = useState("");
  const [locomocion, setLocomocion] = useState("");
  const [mantenimiento, setMantenimiento] = useState("");
  const [funcionamiento, setFuncionamiento] = useState("");
  const [registroFotografico, setRegistroFotografico] = useState([]);
  const [firmanteInspector, setFirmanteInspector] = useState("");
  const [codigoInspector, setCodigoInspector] = useState("");

  // Estados para modo edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [camposLlenadosAuto, setCamposLlenadosAuto] = useState({
    aseguradora: false,
    ciudad: false,
    asegurado: false
  });

  // Hook para manejar el historial
  const { guardando, exportando, guardarEnHistorial, exportarYGuardar } = useHistorialFormulario(TIPOS_FORMULARIOS.MAQUINARIA);

  // Hooks de React Router
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Cargar datos desde localStorage al iniciar (solo si no hay ID)
  useEffect(() => {
    if (!id || id === 'nuevo') {
      const datosGuardados = localStorage.getItem('formularioMaquinaria');
      if (datosGuardados) {
        try {
          const datosParseados = JSON.parse(datosGuardados);
          if (datosParseados && typeof datosParseados === 'object') {
            // Restaurar todos los estados desde localStorage
            if (datosParseados.nombre !== undefined) setNombre(datosParseados.nombre);
            if (datosParseados.fecha !== undefined) setFecha(datosParseados.fecha);
            if (datosParseados.nombreAsegurado !== undefined) setNombreAsegurado(datosParseados.nombreAsegurado);
            if (datosParseados.nombreMaquinaria !== undefined) setNombreMaquinaria(datosParseados.nombreMaquinaria);
            if (datosParseados.ciudadFecha !== undefined) setCiudadFecha(datosParseados.ciudadFecha);
            if (datosParseados.destinatario !== undefined) setDestinatario(datosParseados.destinatario);
            if (datosParseados.referencia !== undefined) setReferencia(datosParseados.referencia);
            if (datosParseados.saludo !== undefined) setSaludo(datosParseados.saludo);
            if (datosParseados.cuerpo !== undefined) setCuerpo(datosParseados.cuerpo);
            if (datosParseados.fotos !== undefined) setFotos(datosParseados.fotos);
            if (datosParseados.aseguradora !== undefined) setAseguradora(datosParseados.aseguradora);
            if (datosParseados.equipo !== undefined) setEquipo(datosParseados.equipo);
            if (datosParseados.marca !== undefined) setMarca(datosParseados.marca);
            if (datosParseados.descripcion !== undefined) setDescripcion(datosParseados.descripcion);
            if (datosParseados.recomendaciones !== undefined) setRecomendaciones(datosParseados.recomendaciones);
            if (datosParseados.imagenesRegistro !== undefined) setImagenesRegistro(datosParseados.imagenesRegistro);
            if (datosParseados.registroFotografico !== undefined) setRegistroFotografico(datosParseados.registroFotografico);
            // Agregar más estados según sea necesario
            debug('✅ Datos de formulario de maquinaria cargados desde localStorage');
          }
        } catch (error) {
          console.error('Error al cargar datos guardados:', error);
          localStorage.removeItem('formularioMaquinaria');
        }
      }
    }
  }, [id]);

  // Guardar datos automáticamente cuando cambien (con debounce para evitar guardados excesivos)
  // Solo se guarda si estamos en la ruta del formulario de maquinaria
  useEffect(() => {
    const esRutaMaquinaria = location.pathname.includes('/maquinaria') || location.pathname.includes('/formulario-maquinaria');
    if (!esRutaMaquinaria) return;

    const timeoutId = setTimeout(() => {
      try {
        const datosParaGuardar = JSON.stringify({
          nombre,
          fecha,
          nombreAsegurado,
          nombreMaquinaria,
          ciudadFecha,
          destinatario,
          referencia,
          saludo,
          cuerpo,
          fotos,
          aseguradora,
          equipo,
          marca,
          descripcion,
          recomendaciones,
          imagenesRegistro,
          registroFotografico,
          // Agregar más estados según sea necesario
        });
        localStorage.setItem('formularioMaquinaria', datosParaGuardar);
        debug('💾 Datos de formulario de maquinaria guardados en localStorage');
      } catch (error) {
        console.error('Error al guardar datos:', error);
        try {
          localStorage.removeItem('formularioMaquinaria');
          localStorage.setItem('formularioMaquinaria', JSON.stringify({
            nombre,
            fecha,
            nombreAsegurado,
            nombreMaquinaria,
            ciudadFecha,
            destinatario,
            referencia,
            saludo,
            cuerpo,
            fotos,
            aseguradora,
            equipo,
            marca,
            descripcion,
            recomendaciones,
            imagenesRegistro,
            registroFotografico,
          }));
        } catch (e) {
          console.error('Error crítico al guardar:', e);
        }
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [nombre, fecha, nombreAsegurado, nombreMaquinaria, ciudadFecha, destinatario, referencia, saludo, cuerpo, fotos, aseguradora, equipo, marca, descripcion, recomendaciones, imagenesRegistro, registroFotografico, location.pathname]);

  // Guardar datos antes de refrescar la página (solo si estamos en el formulario)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const esRutaMaquinaria = window.location.pathname.includes('/maquinaria') || window.location.pathname.includes('/formulario-maquinaria');
      if (esRutaMaquinaria) {
        try {
          localStorage.setItem('formularioMaquinaria', JSON.stringify({
            nombre,
            fecha,
            nombreAsegurado,
            nombreMaquinaria,
            ciudadFecha,
            destinatario,
            referencia,
            saludo,
            cuerpo,
            fotos,
            aseguradora,
            equipo,
            marca,
            descripcion,
            recomendaciones,
            imagenesRegistro,
            registroFotografico,
          }));
        } catch (error) {
          console.error('Error al guardar antes de salir:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [nombre, fecha, nombreAsegurado, nombreMaquinaria, ciudadFecha, destinatario, referencia, saludo, cuerpo, fotos, aseguradora, equipo, marca, descripcion, recomendaciones, imagenesRegistro, registroFotografico]);

  // Limpiar localStorage cuando salgamos de la ruta del formulario
  useEffect(() => {
    const esRutaMaquinaria = location.pathname.includes('/maquinaria') || location.pathname.includes('/formulario-maquinaria');
    if (!esRutaMaquinaria) {
      debug('🧹 Limpiando datos de localStorage al salir del formulario de maquinaria');
      localStorage.removeItem('formularioMaquinaria');
    }

    return () => {
      setTimeout(() => {
        const sigueEnRutaMaquinaria = window.location.pathname.includes('/maquinaria') || window.location.pathname.includes('/formulario-maquinaria');
        if (!sigueEnRutaMaquinaria) {
          debug('🧹 Limpiando datos de localStorage (componente desmontado)');
          localStorage.removeItem('formularioMaquinaria');
        }
      }, 100);
    };
  }, [location.pathname]);

  // Funciones para llenado automático de campos
  const llenarCamposAseguradora = (aseguradoraId) => {
    const aseguradoraSeleccionada = DATOS_MAESTROS.aseguradoras.find(a => a.id === aseguradoraId);
    if (aseguradoraSeleccionada) {
      setAseguradora(aseguradoraSeleccionada.nombre);
      setDestinatario(aseguradoraSeleccionada.nombre);
      setCamposLlenadosAuto(prev => ({ ...prev, aseguradora: true }));
      debug('✅ Campos de aseguradora llenados automáticamente:', aseguradoraSeleccionada.nombre);
    }
  };

  const llenarCamposCiudad = (ciudadId) => {
    const ciudadSeleccionada = DATOS_MAESTROS.ciudades.find(c => c.id === ciudadId);
    if (ciudadSeleccionada) {
      setCiudadFecha(ciudadSeleccionada.nombre);
      setDepartamento(ciudadSeleccionada.departamento);
      setUbicacion(ciudadSeleccionada.zona);
      setLugar(`${ciudadSeleccionada.nombre}, ${ciudadSeleccionada.departamento}`);
      setCamposLlenadosAuto(prev => ({ ...prev, ciudad: true }));
      debug('✅ Campos de ciudad llenados automáticamente:', ciudadSeleccionada.nombre);
      debug('📍 Departamento:', ciudadSeleccionada.departamento);
      debug('🌍 Zona:', ciudadSeleccionada.zona);
    }
  };

  const llenarCamposAsegurado = (aseguradoId) => {
    const aseguradoSeleccionado = DATOS_MAESTROS.asegurados.find(a => a.id === aseguradoId);
    if (aseguradoSeleccionado) {
      setNombreAsegurado(aseguradoSeleccionado.nombre);
      setTomador(aseguradoSeleccionado.representante);
      setDestinatario(aseguradoSeleccionado.nombre);
      setReferencia(aseguradoSeleccionado.nit || aseguradoSeleccionado.cedula);
      setLugar(aseguradoSeleccionado.direccion);
      setCamposLlenadosAuto(prev => ({ ...prev, asegurado: true }));
      debug('✅ Campos de asegurado llenados automáticamente:', aseguradoSeleccionado.nombre);
    }
  };

  // Función para obtener opciones de los datos maestros
  const obtenerOpcionesAseguradoras = () => {
    const opciones = DATOS_MAESTROS.aseguradoras.map(a => ({ value: a.id, label: a.nombre }));
    debug('🔍 Opciones de aseguradoras generadas:', opciones);
    return opciones;
  };
  const obtenerOpcionesCiudades = () => DATOS_MAESTROS.ciudades.map(c => ({ value: c.id, label: c.nombre }));
  const obtenerOpcionesAsegurados = () => DATOS_MAESTROS.asegurados.map(a => ({ value: a.id, label: a.nombre }));

  // Función para cargar datos del formulario existente
  const cargarDatosFormulario = async (formularioId) => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No hay token disponible');
        return;
      }

      debug('🔍 Iniciando carga de formulario de maquinaria con ID:', formularioId);

      const baseURL = BASE_URL;

      debug('🌐 URL base para edición:', baseURL);

      const response = await fetch(`${baseURL}/api/historial-formularios/${formularioId}`, {
        method: 'GET',
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
        
        debug('📥 Datos del formulario cargados:', formulario);
        debug('🔍 Estructura de datos:', formulario.datos);
        debug('🔍 Tipo de formulario:', formulario.tipo);
        debug('🔍 Claves disponibles en datos:', Object.keys(formulario.datos || {}));
        
        // Poblar todos los campos del formulario desde formulario.datos
        setNombre(formulario.datos?.numeroActa || "");
        setFecha(formulario.datos?.fechaInspeccion || "");
        setNombreAsegurado(formulario.datos?.asegurado || "");
        setNombreMaquinaria(formulario.datos?.tipoMaquinaria || "");
        setCiudadFecha(formulario.datos?.ciudad || "");
        setDestinatario(formulario.datos?.destinatario || "");
        setReferencia(formulario.datos?.referencia || "");
        setSaludo(formulario.datos?.saludo || "");
        setCuerpo(formulario.datos?.cuerpo || "");
        setFotos(formulario.datos?.fotos || [{ src: "", descripcion: "" }]);
        setAseguradora(formulario.datos?.aseguradora || "");
        setEquipo(formulario.datos?.equipo || "");
        setMarca(formulario.datos?.marca || "");
        setDescripcion(formulario.datos?.descripcion || "");
        setMarcaBien(formulario.datos?.marcaBien || "");
        setElectrico(formulario.datos?.electrico || "");
        setTipoProteccion(formulario.datos?.tipoProteccion || "");
        setRecomendaciones(formulario.datos?.recomendaciones || "");
        setInspectorSeleccionado(formulario.datos?.inspectorSeleccionado || "");
        setCargoSeleccionado(formulario.datos?.cargoSeleccionado || "");
        setImagenesRegistro(formulario.datos?.imagenesRegistro || []);
        setFotoPrincipal(formulario.datos?.fotoPrincipal || null);
        setFotoPrincipalPreview(formulario.datos?.fotoPrincipalPreview || "");
        setDescripcionFotoPrincipal(formulario.datos?.descripcionFotoPrincipal || "");
        setTomador(formulario.datos?.tomador || "");
        setLugar(formulario.datos?.lugar || "");
        setUbicacion(formulario.datos?.ubicacion || "");
        setDepartamento(formulario.datos?.departamento || "");
        setModelo(formulario.datos?.modelo || "");
        setLinea(formulario.datos?.linea || "");
        setMotorDiesel(formulario.datos?.motorDiesel || "");
        setSistemaLocomocion(formulario.datos?.sistemaLocomocion || "");
        setColor(formulario.datos?.color || "");
        setEstadoOperativo(formulario.datos?.estadoOperativo || "");
        setCabina(formulario.datos?.cabina || "");
        setFuncion(formulario.datos?.funcion || "");
        setEquipoContraincendio(formulario.datos?.equipoContraincendio || "");
        setEquipoRadio(formulario.datos?.equipoRadio || "");
        setRadiodeOperacion(formulario.datos?.radiodeOperacion || "");
        setMecanico(formulario.datos?.mecanico || "");
        setHidraulico(formulario.datos?.hidraulico || "");
        setPintura(formulario.datos?.pintura || "");
        setChasis(formulario.datos?.chasis || "");
        setLocomocion(formulario.datos?.locomocion || "");
        setMantenimiento(formulario.datos?.mantenimiento || "");
        setFuncionamiento(formulario.datos?.funcionamiento || "");
        setRegistroFotografico(formulario.datos?.registroFotografico || []);
        setFirmanteInspector(formulario.datos?.firmanteInspector || "");
        setCodigoInspector(formulario.datos?.codigoInspector || "");
        
        debug('✅ Formulario de maquinaria cargado exitosamente en modo edición');
        debug('🔍 Todos los estados han sido actualizados');
      }
    } catch (error) {
      console.error('❌ Error cargando datos del formulario:', error);
      alert('Error al cargar los datos del formulario. Por favor, inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  // useEffect para detectar modo edición
  useEffect(() => {
    if (id) {
      setModoEdicion(true);
      setCargando(true);
      cargarDatosFormulario(id);
    }
  }, [id]);

  // Efecto para monitorear cambios en los estados principales cuando se cargan datos
  useEffect(() => {
    if (modoEdicion && !cargando) {
      debug('🔍 Estados actualizados después de la carga:');
      debug('  - nombre:', nombre);
      debug('  - fecha:', fecha);
      debug('  - nombreAsegurado:', nombreAsegurado);
      debug('  - nombreMaquinaria:', nombreMaquinaria);
      debug('  - ciudadFecha:', ciudadFecha);
      debug('  - aseguradora:', aseguradora);
      debug('  - marca:', marca);
      debug('  - modelo:', modelo);
      debug('  - tipoProteccion:', tipoProteccion);
      debug('  - recomendaciones:', recomendaciones);
      debug('  - firmanteInspector:', firmanteInspector);
      debug('  - codigoInspector:', codigoInspector);
    }
  }, [modoEdicion, cargando, nombre, fecha, nombreAsegurado, nombreMaquinaria, ciudadFecha, aseguradora, marca, modelo, tipoProteccion, recomendaciones, firmanteInspector, codigoInspector]);

  const handleGuardarEnHistorial = async () => {
    const datos = {
      titulo: `Inspección de Maquinaria - ${nombreAsegurado || 'Asegurado'} - ${nombreMaquinaria || 'Maquinaria'}`,
      datos: {
        numeroActa: nombre || "N/A",
        fechaInspeccion: fecha,
        horaInspeccion: new Date().toLocaleTimeString(),
        ciudad: ciudadFecha,
        aseguradora: aseguradora,
        sucursal: "N/A",
        asegurado: nombreAsegurado,
        tipoMaquinaria: nombreMaquinaria,
        marca: marca,
        modelo: modelo,
        serie: "N/A",
        ano: "N/A",
        estadoGeneral: "N/A",
        tipoProteccion: tipoProteccion,
        observaciones: recomendaciones,
        recomendaciones: recomendaciones,
        firmanteInspector: firmanteInspector,
        codigoInspector: codigoInspector,
        // Incluir imágenes para procesamiento
        imagenesRegistro: imagenesRegistro || [],
        fotoPrincipal: fotoPrincipal || null,
        fotoPrincipalPreview: fotoPrincipalPreview || "",
        descripcionFotoPrincipal: descripcionFotoPrincipal || "",
        // Agregar otros campos según sea necesario
      }
    };

    const resultado = await guardarEnHistorial(datos, 'en_proceso');
    alert(resultado.message);
  };

  const handleExportar = async () => {
    try {
      const datos = {
        titulo: `Inspección de Maquinaria - ${nombreAsegurado || 'Asegurado'} - ${nombreMaquinaria || 'Maquinaria'}`,
        datos: {
          numeroActa: nombre || "N/A",
          fechaInspeccion: fecha,
          horaInspeccion: new Date().toLocaleTimeString(),
          ciudad: ciudadFecha,
          aseguradora: aseguradora,
          sucursal: "N/A",
          asegurado: nombreAsegurado,
          tipoMaquinaria: nombreMaquinaria,
          marca: marca,
          modelo: modelo,
          serie: "N/A",
          ano: "N/A",
          estadoGeneral: "N/A",
          tipoProteccion: tipoProteccion,
          observaciones: recomendaciones,
          recomendaciones: recomendaciones,
          firmanteInspector: firmanteInspector,
          codigoInspector: codigoInspector,
          // Incluir imágenes para procesamiento
          imagenesRegistro: imagenesRegistro || [],
          fotoPrincipal: fotoPrincipal || null,
          fotoPrincipalPreview: fotoPrincipalPreview || "",
          descripcionFotoPrincipal: descripcionFotoPrincipal || "",
        }
      };

      // Primero exportar el documento
      const firmaCanvas = await getFirmaArrayBuffer();
      await generarWord({
        inspectorSeleccionado: firmanteInspector,
        cargoSeleccionado: codigoInspector,
        firmaCanvas,
        fecha,
      });

      // Luego guardar en el historial como completado
      const resultado = await guardarEnHistorial(datos, 'completado');
      alert(resultado.message);
      
    } catch (error) {
      console.error('Error en exportación:', error);
      alert(`❌ Error en la exportación: ${error.message}`);
    }
  };


  // Convierte el canvas de firma en un ArrayBuffer
const getFirmaArrayBuffer = () => {
  return new Promise((resolve) => {
    const canvas = document.querySelector("canvas");
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsArrayBuffer(blob);
    });
  });
};

  
const generarWord = async ({ inspectorSeleccionado, cargoSeleccionado, firmaCanvas, fecha }) => {
    let isMounted = true;
    // Usa la primera imagen del registro fotográfico como portada

    let imagenPresentacion = null;
    if (fotoPrincipal) {
      const arrayBuffer = await toArrayBuffer(fotoPrincipal);
      imagenPresentacion = new ImageRun({
        data: arrayBuffer,
        transformation: { width: 350, height: 250 },
      });
    }
    
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Fila 1: Logo | Título (celda combinada) | vacío
        new TableRow({
          children: [
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: await fetch(Logo).then(r => r.arrayBuffer()),
                      transformation: { width: 150, height: 60 },
                    }),
                  ],
                }),
              ],
              verticalAlign: "center",
              shading: { fill: "FFFFFF" },
            }),
            new TableCell({
              columnSpan: 2,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${nombreAsegurado.toUpperCase()} - ${nombreMaquinaria.toUpperCase()}`,
                      bold: true,
                      size: 22,
                      font: "Arial",
                      color: "2B2B2B",
                    }),
                  ],
                }),
              ],
              //shading: { fill: "2B2B2B" },
            }),
          ],
        }),
        // Fila 2: INSP. RIESGOS | RIESGOS | DATE
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "INSP. RIESGOS",
                      bold: true,
                      size: 20,
                      font: "Arial",
                      color: "2B2B2B",
                    }),
                  ],
                }),
              ],
             // shading: { fill: "2B2B2B" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "RIESGOS",
                      bold: true,
                      size: 20,
                      font: "Arial",
                      color: "2B2B2B",
                    }),
                  ],
                }),
              ],
             // shading: { fill: "2B2B2B" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `DATE: ${fecha.replace(/-/g, ".")}`,
                      bold: true,
                      size: 20,
                      font: "Arial",
                     color: "2B2B2B",
                    }),
                  ],
                }),
              ],
              //shading: { fill: "2B2B2B" },
            }),
          ],
        }),
      ],

});
    const doc = new Document({
      sections: [
        {
          headers: {
            default: new Header({
              children: [headerTable],
            }),
          },
          children: [
            new Paragraph({ text: "" }),
            new Paragraph({
              text: "INFORME DE INSPECCIÓN DE MAQUINARIA",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            // Agrega este bloque para la ciudad
            new Paragraph({
              text: ciudadFecha ? `Ciudad: ${ciudadFecha}` : "",
              font: "Arial",
              size: 24,
              alignment: AlignmentType.LEFT,
            }),
            new Paragraph({
              text: fecha ? `Fecha: ${fecha}` : "",
              font: "Arial",
              size: 24,
              alignment: AlignmentType.LEFT,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Destinatario: ", bold: true, font: "Arial", size: 24 }),
                new TextRun({ text: destinatario, font: "Arial", size: 24 }),
              ],
              alignment: AlignmentType.LEFT,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Referencia: ", bold: true, font: "Arial", size: 24 }),
                new TextRun({ text: referencia, font: "Arial", size: 24 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Asegurado: ", bold: true, font: "Arial", size: 24 }),
                new TextRun({ text: nombreAsegurado, font: "Arial", size: 24 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Maquinaria: ", bold: true, font: "Arial", size: 24 }),
                new TextRun({ text: nombreMaquinaria, font: "Arial", size: 24 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Saludo: ", bold: true, font: "Arial", size: 24 }),
                new TextRun({ text: saludo, font: "Arial", size: 24 }),
              ],
              alignment: AlignmentType.JUSTIFIED,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "", bold: true, font: "Arial", size: 24 }),
                new TextRun({ text: cuerpo, font: "Arial", size: 24 }),
              ],
              alignment: AlignmentType.JUSTIFIED,
            }),

            // Aquí va la foto principal y su descripción, justo después del cuerpo
            ...(imagenPresentacion
              ? [
                  new Paragraph({ text: "" }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                    children: [imagenPresentacion],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                      new TextRun({
                        text: descripcionFotoPrincipal || "Vista de la máquina",
                        italics: true,
                        font: "Arial",
                        size: 20,
                        color: "2B2B2B",
                      }),
                    ],
                  }),
                ]
              : []),

            // REGISTRO FOTOGRÁFICO (todas las imágenes)
           

              new Paragraph({ children: [], pageBreakBefore: true }),
              new Paragraph({
                text: "1. INFORME DE INSPECCIÓN MAQUINARIA",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.LEFT,
                spacing: { after: 300 },
              }),
              new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                ...[
                  ["ASEGURADORA", aseguradora],
                  ["EQUIPO INSPECCIONADO", equipo],
                  ["MARCA", marca],
                  ["REFERENCIA", referencia],
                  ["TOMADOR", tomador],
                  ["LUGAR INSPECCION", lugar],
                  ["UBICACION", ubicacion],
                  ["DEPARTAMENTO", departamento],
                  ["INSPECTOR", inspectorSeleccionado],
                  ["FECHA DE INSPECCIÓN", fecha],
                  ["ATENDIDO", cargoSeleccionado]
                ].map(([label, value]) =>
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: label, bold: true, font: "Arial", size: 22 }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: value || " ", font: "Arial", size: 22 }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
                ),
              ],
            }),


           // Descripción del Bien Asegurado

              new Paragraph({ text: "", spacing: { after: 300 } }),
              new Paragraph({
                text: "2. DESCRIPCIÓN DEL BIEN ASEGURADO",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.LEFT,
                spacing: { after: 300 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  ...[
                    ["DESCRIPCIÓN", descripcion],
                    ["MARCA", marca],
                    ["MODELO", modelo],
                    ["LÍNEA", linea],
                    ["MOTOR DIESEL", motorDiesel],
                    ["SISTEMA DE LOCOMOCIÓN", sistemaLocomocion],
                    ["COLOR", color],
                    ["ESTADO OPERATIVO", estadoOperativo],
                    ["CABINA", cabina],
                    ["FUNCIÓN", funcion],
                    ["EQUIPO CONTRAINCENDIO", equipoContraincendio],
                    ["EQUIPO DE RADIO COMUNICACIÓN", equipoRadio],
                    ["RADIO DE OPERACIÓN", radiodeOperacion]
                  ].map(([label, value]) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 30, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({ text: label, bold: true, font: "Arial", size: 22 }),
                              ],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 70, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({ text: value || " ", font: "Arial", size: 22 }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    })
                  ),
                ],
              }),


                // Estado General de la Maquinaria
              new Paragraph({ children: [], pageBreakBefore: true }),
              new Paragraph({
                text: "2.1. ESTADO GENERAL",
                heading: HeadingLevel.HEADING_3,
                spacing: { after: 100 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  ...[
                    ["ELÉCTRICO E INSTRUMENTOS", electrico],
                    ["SISTEMA MECÁNICO", mecanico],
                    ["SISTEMA HIDRÁULICO", hidraulico],
                    ["PINTURA", pintura],
                    ["CHASIS", chasis],
                    ["SISTEMA DE LOCOMOCIÓN", locomocion],
                    ["MANTENIMIENTO", mantenimiento],
                    ["FUNCIONAMIENTO", funcionamiento],
                  ].map(([label, value]) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 30, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: label, bold: true, font: "Arial", size: 22 })],
                            }),
                          ],
                        }),
                        new TableCell({
                          width: { size: 70, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: value || " ", font: "Arial", size: 22 })],
                            }),
                          ],
                        }),
                      ],
                    })
                  ),
                ],
              }),

              // 3. TIPO DE PROTECCIÓN
              new Paragraph({ text: "", spacing: { after: 300 } }),
              new Paragraph({
                text: "3. TIPO DE PROTECCIÓN",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.LEFT,
                spacing: { after: 200 },
              }),
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 300 },
                children: [
                  new TextRun({
                    text: tipoProteccion || "",
                    font: "Arial",
                    size: 24, // 12 pt
                  }),
                ],
              }),

         // 4. RECOMENDACIONES Y OBSERVACIONES
              new Paragraph({ text: "", spacing: { after: 300 } }),
              new Paragraph({
                text: "4. RECOMENDACIONES Y OBSERVACIONES",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.LEFT,
                spacing: { after: 200 },
              }),
              ...convertirHtmlADocx(recomendaciones),

              // 5. REGISTRO FOTOGRÁFICO
            /*  new Paragraph({ children: [], pageBreakBefore: true }),
              new Paragraph({
                text: "5. REGISTRO FOTOGRÁFICO",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
              }),*/

            ...(imagenesRegistro.length > 0
              ? [
                  new Paragraph({
                    text: "REGISTRO FOTOGRÁFICO",
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                  }),
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: await Promise.all(
                      Array.from({ length: Math.ceil(imagenesRegistro.length / 2) }, async (_, i) => {
                        const rowCells = [];

                        for (let j = 0; j < 2; j++) {
                          const index = i * 2 + j;
                          if (index < imagenesRegistro.length) {
                            const img = imagenesRegistro[index];
                            const buffer = await toArrayBuffer(img.file);

                            rowCells.push(
                              new TableCell({
                                children: [
                                  new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [
                                      new ImageRun({
                                        data: buffer,
                                        transformation: { width: 350, height: 250 },
                                      }),
                                    ],
                                  }),
                                  new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [
                                      new TextRun({
                                        text: img.descripcion || "",
                                        italics: true,
                                        font: "Arial",
                                        size: 20,
                                        color: "2B2B2B",
                                      }),
                                    ],
                                  }),
                                ],
                              })
                            );
                          } else {
                            // Celda vacía si no hay segunda imagen
                            rowCells.push(new TableCell({ children: [new Paragraph({ text: "" })] }));
                          }
                        }

                        return new TableRow({ children: rowCells });
                      })
                    ),
                  }),
                ]
              : []),

// 6. FIRMA
new Paragraph({ text: "", pageBreakBefore: true }),
new Paragraph({
  text: "6. FIRMA",
  heading: HeadingLevel.HEADING_2,
  alignment: AlignmentType.CENTER,
  spacing: { after: 300 },
}),
new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { after: 300 },
  children: [
    new TextRun({
      text: "En espera de haber realizado satisfactoriamente la asignación de la Inspección y análisis del riesgo y agradeciendo la confianza depositada en nuestros servicios profesionales, suscribimos",
      font: "Arial",
      size: 24,
    }),
  ],
}),
new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { after: 300 },
  children: [
    new TextRun({ text: "Atentamente,", font: "Arial", size: 24 }),
  ],
}),
new Paragraph({
  alignment: AlignmentType.LEFT,
  children: [
    new ImageRun({
      data: await fetch(Logo).then((r) => r.arrayBuffer()),
      transformation: { width: 150, height: 60 },
    }),
  ],
}),
...(firmaCanvas
  ? [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new ImageRun({
            data: firmaCanvas,
            transformation: { width: 200, height: 100 },
          }),
        ],
      }),
    ]
  : []),
// Agrega nombre completo
new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { after: 100 },
  children: [
    new TextRun({
      text: inspectorSeleccionado,
      bold: true,
      font: "Arial",
      size: 24,
    }),
  ],
}),
// Agrega cargo
new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { after: 100 },
  children: [
    new TextRun({
      text: cargoSeleccionado,
      bold: true,
      font: "Arial",
      size: 22,
    }),
  ],
}),
// Agrega fecha
new Paragraph({
  alignment: AlignmentType.LEFT,
  spacing: { after: 100 },
  children: [
    new TextRun({
      text: `Fecha: ${fecha}`,
      font: "Arial",
      size: 20,
    }),
  ],
}),



              
            new Paragraph({ text: "" }),
          ],
        },
      ],
    });



    

// 1. Generar el Blob
const blob = await Packer.toBlob(doc);

  // 2. Descargar localmente
  saveAs(blob, `Inspeccion_Maquinaria_${nombre || "maquinaria"}.docx`);

  return () => { isMounted = false; };
};

  return (
    <div className="bg-gray-900 min-h-screen p-2 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto bg-gray-800 rounded-lg shadow-lg p-3 sm:p-6 lg:p-8 text-white">
        {/* Encabezado con indicadores de modo edición y carga */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-3 sm:mb-4">
            📋 Formulario de Inspección de Maquinaria
            {modoEdicion && (
              <span className="ml-2 sm:ml-3 text-yellow-400 text-sm sm:text-lg lg:text-xl">
                ✏️ Modo Edición
              </span>
            )}
          </h1>
          
          {/* Información del sistema de datos maestros */}
          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-900 rounded-lg border border-blue-600">
            <h3 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2">
              📊 Sistema de Datos Maestros Disponibles:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-blue-300">
              <div className="flex items-center">
                <span className="mr-2">🏢</span>
                Aseguradoras: {DATOS_MAESTROS.aseguradoras.length}
              </div>
              <div className="flex items-center">
                <span className="mr-2">🌆</span>
                Ciudades: {DATOS_MAESTROS.ciudades.length}
              </div>
              <div className="flex items-center">
                <span className="mr-2">👥</span>
                Asegurados: {DATOS_MAESTROS.asegurados.length}
              </div>
            </div>
            <p className="text-xs text-blue-400 mt-2">
              💡 Selecciona del dropdown para llenado automático, o escribe manualmente
            </p>
          </div>
          
          {cargando && (
            <div className="text-center py-3 sm:py-4">
              <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-b-2 border-blue-400 mx-auto"></div>
              <p className="mt-2 text-blue-400 text-sm sm:text-base">🔄 Cargando datos del formulario...</p>
            </div>
          )}

          {/* Indicador de campos llenados automáticamente */}
          {(camposLlenadosAuto.aseguradora || camposLlenadosAuto.ciudad || camposLlenadosAuto.asegurado) && (
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-green-900 rounded-lg border border-green-600">
              <h3 className="text-xs sm:text-sm font-semibold text-green-200 mb-2">
                🤖 Campos Llenados Automáticamente:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-green-300">
                {camposLlenadosAuto.aseguradora && (
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    Aseguradora: {aseguradora}
                  </div>
                )}
                {camposLlenadosAuto.ciudad && (
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    Ciudad: {ciudadFecha}
                  </div>
                )}
                {camposLlenadosAuto.asegurado && (
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    Asegurado: {nombreAsegurado}
                  </div>
                )}
              </div>
              
              {/* Mostrar funcionarios disponibles si se seleccionó una aseguradora */}
              {camposLlenadosAuto.aseguradora && aseguradora && (
                <div className="mt-2 sm:mt-3 p-2 bg-blue-900 rounded border border-blue-600">
                  <h4 className="text-xs font-semibold text-blue-200 mb-1">
                    🏢 Aseguradora Seleccionada:
                  </h4>
                  <div className="text-xs text-blue-300">
                    <div className="flex items-center">
                      <span className="mr-2">✅</span>
                      {aseguradora}
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-green-400 mt-2">
                💡 Los campos se pueden editar manualmente después del llenado automático
              </p>
            </div>
          )}
        </div>

        {/* Encabezado */}
        <EncabezadoMaquinaria
          nombreAsegurado={nombreAsegurado}
          setNombreAsegurado={setNombreAsegurado}
          nombreMaquinaria={nombreMaquinaria}
          setNombreMaquinaria={setNombreMaquinaria}
          fecha={fecha}
          setFecha={setFecha}
          opcionesAsegurados={obtenerOpcionesAsegurados()}
          opcionesAseguradoras={obtenerOpcionesAseguradoras()}
          opcionesCiudades={obtenerOpcionesCiudades()}
          onAseguradoChange={llenarCamposAsegurado}
          onAseguradoraChange={llenarCamposAseguradora}
          onCiudadChange={llenarCamposCiudad}
          aseguradora={aseguradora}
          setAseguradora={setAseguradora}
          ciudadFecha={ciudadFecha}
          setCiudadFecha={setCiudadFecha}
        />

        {/* DATOS GENERALES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
          <div className="lg:col-span-1">
            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">Datos generales</h2>
              <CartaPresentacionMaquinaria
                ciudadFecha={ciudadFecha}
                setCiudadFecha={setCiudadFecha}
                destinatario={destinatario}
                setDestinatario={setDestinatario}
                referencia={referencia}
                setReferencia={setReferencia}
                saludo={saludo}
                setSaludo={setSaludo}
                cuerpo={cuerpo}
                setCuerpo={setCuerpo}
                opcionesCiudades={obtenerOpcionesCiudades()}
                opcionesAseguradoras={obtenerOpcionesAseguradoras()}
                onCiudadChange={llenarCamposCiudad}
                onAseguradoraChange={llenarCamposAseguradora}
              />
            </div>
            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">Foto principal</h2>
              {/* Foto principal */}
              <label className="block mb-1 font-semibold text-sm">Foto principal de la máquina</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files[0];
                  setFotoPrincipal(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => setFotoPrincipalPreview(ev.target.result);
                    reader.readAsDataURL(file);
                  } else {
                    setFotoPrincipalPreview("");
                  }
                }}
                className="mb-2 text-xs sm:text-sm"
                disabled={cargando}
              />
              {fotoPrincipalPreview && (
                <img
                  src={fotoPrincipalPreview}
                  alt="Vista de la máquina"
                  className="w-full sm:w-72 h-48 sm:h-72 object-cover border border-gray-400 mb-2"
                />
              )}
              <input
                type="text"
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-sm"
                value={descripcionFotoPrincipal}
                onChange={e => setDescripcionFotoPrincipal(e.target.value)}
                placeholder="Descripción de la foto principal"
                disabled={cargando}
              />
            </div>
          </div>

          {/* INSPECCIÓN Y DESCRIPCIÓN */}
          <div className="lg:col-span-1">
            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">1. Inspección Maquinaria</h2>
                <TablaInspeccionMaquinaria
                  aseguradora={aseguradora} setAseguradora={setAseguradora}
                  equipo={equipo} setEquipo={setEquipo}
                  marca={marca} setMarca={setMarca}
                  referencia={referencia} setReferencia={setReferencia}
                  tomador={tomador} setTomador={setTomador}
                  lugar={lugar} setLugar={setLugar}
                  ubicacion={ubicacion} setUbicacion={setUbicacion}
                  departamento={departamento} setDepartamento={setDepartamento}
                  inspector={inspectorSeleccionado} setInspector={setInspectorSeleccionado}
                  fechaInspeccion={fecha} setFechaInspeccion={setFecha}
                  atendido={cargoSeleccionado} setAtendido={setCargoSeleccionado}
                />
               </div>
            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">2. Descripción del Bien Asegurado</h2>
              <DescripcionBienAsegurado
                descripcion={descripcion} setDescripcion={setDescripcion}
                marca={marca} setMarca={setMarca}
                modelo={modelo} setModelo={setModelo}
                linea={linea} setLinea={setLinea}
                motorDiesel={motorDiesel} setMotorDiesel={setMotorDiesel}
                sistemaLocomocion={sistemaLocomocion} setSistemaLocomocion={setSistemaLocomocion}
                color={color} setColor={setColor}
                estadoOperativo={estadoOperativo} setEstadoOperativo={setEstadoOperativo}
                cabina={cabina} setCabina={setCabina}
                funcion={funcion} setFuncion={setFuncion}
                equipoContraincendio={equipoContraincendio} setEquipoContraincendio={setEquipoContraincendio}
                equipoRadio={equipoRadio} setEquipoRadio={setEquipoRadio}
                radiodeOperacion={radiodeOperacion} setRadiodeOperacion={setRadiodeOperacion}
              />
            </div>
          </div>

          {/* ESTADO Y PROTECCIÓN */}
          <div className="lg:col-span-1">
            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">2.1 Estado General</h2>
              <EstadoGeneralMaquinaria
                electrico={electrico} setElectrico={setElectrico}
                mecanico={mecanico} setMecanico={setMecanico}
                hidraulico={hidraulico} setHidraulico={setHidraulico}
                pintura={pintura} setPintura={setPintura}
                chasis={chasis} setChasis={setChasis}
                locomocion={locomocion} setLocomocion={setLocomocion}
                mantenimiento={mantenimiento} setMantenimiento={setMantenimiento}
                funcionamiento={funcionamiento} setFuncionamiento={setFuncionamiento}
              />
            </div>
            <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">3. Tipo de Protección</h2>
              <TipoProteccionMaquinaria
                tipoProteccion={tipoProteccion}
                setTipoProteccion={setTipoProteccion}
              />
            </div>
          </div>
        </div>

        {/* REGISTRO FOTOGRÁFICO, RECOMENDACIONES Y FIRMAS */}
        <div className="mt-6 sm:mt-8">
          <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">Recomendaciones y Observaciones</h2>
              <RecomendacionesObservacionesMaquinaria
                recomendaciones={recomendaciones}
                setRecomendaciones={setRecomendaciones}
              />
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">Registro Fotográfico</h2>
            <RegistroFotograficoMaquinaria onChange={setImagenesRegistro} imagenesIniciales={imagenesRegistro} />
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold mb-2 border-b border-gray-600 pb-1">Firma</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Nombre del Inspector</label>
                <input
                  type="text"
                  value={firmanteInspector}
                  onChange={e => setFirmanteInspector(e.target.value)}
                  placeholder="Nombre del inspector"
                  className="w-full bg-gray-800 border border-gray-600 px-2 sm:px-3 py-2 text-white rounded focus:border-blue-500 focus:outline-none text-sm"
                  disabled={cargando}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Cargo del Inspector</label>
                <input
                  type="text"
                  value={codigoInspector}
                  onChange={e => setCodigoInspector(e.target.value)}
                  placeholder="Cargo del inspector"
                  className="w-full bg-gray-800 border border-gray-600 px-2 sm:px-3 py-2 text-white rounded focus:border-blue-500 focus:outline-none text-sm"
                  disabled={cargando}
                />
              </div>
            </div>
            <FirmaMaquinaria
              firmanteInspector={firmanteInspector}
              setFirmanteInspector={setFirmanteInspector}
              codigoInspector={codigoInspector}
              setCodigoInspector={setCodigoInspector}
            />
          </div>
        </div>

        {/* BOTONES DE ACCIÓN PRINCIPALES */}
        <div className="mt-6 sm:mt-8 bg-gray-700 rounded-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-center border-b border-gray-600 pb-2">
            Acciones del Formulario
          </h2>
          
          {/* Botones de historial */}
          <div className="mb-4 sm:mb-6">
            {/* Información sobre campos obligatorios */}
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-900 rounded-lg border border-blue-600">
              <h3 className="text-xs sm:text-sm font-semibold text-blue-200 mb-2">
                📋 Campos Obligatorios para Guardar:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-blue-300">
                <div className={`flex items-center ${nombreAsegurado ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="mr-2">{nombreAsegurado ? '✅' : '❌'}</span>
                  Asegurado: {nombreAsegurado || 'Faltante'}
                </div>
                <div className={`flex items-center ${nombreMaquinaria ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="mr-2">{nombreMaquinaria ? '✅' : '❌'}</span>
                  Tipo Maquinaria: {nombreMaquinaria || 'Faltante'}
                </div>
                <div className={`flex items-center ${aseguradora ? 'text-green-400' : 'text-red-400'}`}>
                  <span className="mr-2">{aseguradora ? '✅' : '❌'}</span>
                  Aseguradora: {aseguradora || 'Faltante'}
                </div>
              </div>
            </div>
            
            <BotonesHistorial
              onGuardarEnHistorial={handleGuardarEnHistorial}
              onExportar={handleExportar}
              tipoFormulario={TIPOS_FORMULARIOS.MAQUINARIA}
              tituloFormulario="Maquinaria"
              deshabilitado={!nombreAsegurado || !nombreMaquinaria || !aseguradora}
              guardando={guardando}
              exportando={exportando}
            />
          </div>

          {/* Campos adicionales para exportación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">Fecha de Inspección</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 px-2 sm:px-3 py-2 text-white rounded focus:border-blue-500 focus:outline-none text-sm"
                disabled={cargando}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}