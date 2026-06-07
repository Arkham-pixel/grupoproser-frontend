import React, { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { obtenerHoraActualColombia } from '../utils/fechaUtils';
import { useTheme } from '../context/ThemeContext';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Media,
  Header,
  Footer,
} from "docx";
import { SimpleField } from "docx";
import { saveAs } from "file-saver";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import MapaUbicacion from './MapaUbicacion'
import MapaGoogleEarth from './MapaGoogleEarth'
import MapaUbicacionAjuste from './SubcomponenteFormularioAjuste/MapaUbicacionAjuste'
import RegistroFotografico from './RegistroFotografico';
import { PageBreak } from "docx";
import { toPng } from 'html-to-image';
import Logo from '../img/Logo.png';
import { TableOfContents } from "docx";
import ciudadesData from '../data/colombia.json';
import Select from 'react-select';
import 'leaflet/dist/leaflet.css'
import MapaDeCalor from "./MapaDeCalor";
import FormularioAreas from "./SubcomponenteFRiesgo/FormularioAreas";
import BotonesHistorial from './BotonesHistorial.jsx';
import { useHistorialFormulario } from '../hooks/useHistorialFormulario.js';
import historialService, { TIPOS_FORMULARIOS } from '../services/historialService.js';
import { BASE_URL } from '../config/apiConfig.js';
import ChatbotIA from './SubcomponenteFormularioAjuste/ChatbotIA';


export default function FormularioPuertos() {
  const { theme } = useTheme();
  const location = useLocation();
  const { id } = useParams(); // Obtener ID de la URL si estamos en modo edición
  const navigate = useNavigate();
  const datosPrevios = location.state || {};
  
  // Colores según el tema
  const bgMain = theme === 'dark' ? '#1A1A1A' : '#F5F5F7';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  
  // Estado para modo edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  // Información general
  const municipios = ciudadesData.flatMap(dep =>
    dep.ciudades.map(ciudad => ({
      label: `${ciudad} - ${dep.departamento}`,
      value: ciudad
    }))
  );
  const [formData, setFormData] = useState({
    ciudad_siniestro: datosPrevios.ciudad_siniestro || datosPrevios.ciudad || datosPrevios.municipio || "",
    departamento_siniestro: datosPrevios.departamento_siniestro || datosPrevios.departamento || "",
      aseguradora: datosPrevios.aseguradora || "",
    direccion: datosPrevios.direccion || datosPrevios.direccionRiesgo || "",
    asegurado: datosPrevios.asegurado || datosPrevios.nombreCliente || datosPrevios.nombreEmpresa || "",
      fechaInspeccion: datosPrevios.fechaInspeccion || "",
      // Estados para el mapa avanzado
    direccionRiesgo: datosPrevios.direccionRiesgo || datosPrevios.direccion || "",
    ciudad: datosPrevios.ciudad || datosPrevios.ciudad_siniestro || datosPrevios.municipio || "",
    departamento: datosPrevios.departamento || datosPrevios.departamento_siniestro || "",
    coordenadasRiesgo: datosPrevios.coordenadasRiesgo || datosPrevios.coordenadas || "",
  });



  const [barrio, setBarrio] = useState("");
  const [departamento, setDepartamento] = useState(datosPrevios.departamento || datosPrevios.departamento_siniestro || "");
  const [horarioLaboral, setHorarioLaboral] = useState("");


  const [cargo, setCargo] = useState("");
  const [colaboladores, setColaboladores] = useState("");

  const [nombreEmpresa, setNombreEmpresa] = useState(datosPrevios.nombreEmpresa || datosPrevios.nombreCliente || datosPrevios.asegurado || "");
  const [direccion, setDireccion] = useState(datosPrevios.direccion || datosPrevios.direccionRiesgo || "");
  const [municipio, setMunicipio] = useState(datosPrevios.municipio || datosPrevios.ciudad_siniestro || datosPrevios.ciudad || "");
  const [personaEntrevistada, setPersonaEntrevistada] = useState("");


  // Datos de inspección
const [nombreCliente, setNombreCliente] = useState(datosPrevios.nombreCliente || datosPrevios.nombreEmpresa || datosPrevios.asegurado || "");
  //const [ciudad, setCiudad] = useState("");
  const [aseguradora, setAseguradora] = useState(datosPrevios.aseguradora || "");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imagenesRegistro, setImagenesRegistro] = useState([]);
  
  // Estados para el mapa avanzado
  const [imagenMapa, setImagenMapa] = useState(null);

  // Empresa y riesgo
  const [descripcionEmpresa, setDescripcionEmpresa] = useState("");
  const [infraestructura, setInfraestructura] = useState("");


  // Análisis de riesgos
  const [analisisRiesgos, setAnalisisRiesgos] = useState({
    "Incendio/Explosión": "",
    "Amit": "",
    "Anegación": "",
    "Daños por agua": "",
    "Terremoto": "",
    "Sustracción": "",
    "Rotura de maquinaria": "",
    "Responsabilidad civil": ""
  });

  // Infraestructura
  const [antiguedad, setAntiguedad] = useState("");
  const [areaLote, setAreaLote] = useState("");
  const [areaConstruida, setAreaConstruida] = useState("");
  const [numeroEdificios, setNumeroEdificios] = useState("");
  const [numeroPisos, setNumeroPisos] = useState("");
  const [sotanos, setSotanos] = useState("");
  const [tenencia, setTenencia] = useState(""); // Propio o arrendado
  const [descripcionInfraestructura, setDescripcionInfraestructura] = useState("");

  // Procesos
  const [procesos, setProcesos] = useState("");
  const [areas, setAreas] = useState([]);
  const [datosEquipos, setDatosEquipos] = useState([]);



  // Linderos
  const [linderoNorte, setLinderoNorte] = useState("");
  const [linderoSur, setLinderoSur] = useState("");
  const [linderoOriente, setLinderoOriente] = useState("");
  const [linderoOccidente, setLinderoOccidente] = useState("");
  // Mapa
  const mapaRef = useRef(null);
  const [mapaListo, setMapaListo] = useState(false);

  //Servicios Industriales
  const [energiaProveedor, setEnergiaProveedor] = useState("");
  const [energiaTension, setEnergiaTension] = useState("");
  const [energiaPararrayos, setEnergiaPararrayos] = useState("");

  // Seguridad Electrónica
  const [alarmaMonitoreada, setAlarmaMonitoreada] = useState("");
  const [cctv, setCctv] = useState("");
  const [mantenimientoSeguridad, setMantenimientoSeguridad] = useState("");
  const [comentariosSeguridadElectronica, setComentariosSeguridadElectronica] = useState("");

  // Seguridad Física
  const [tipoVigilancia, setTipoVigilancia] = useState("");
  const [horariosVigilancia, setHorariosVigilancia] = useState("");
  const [accesos, setAccesos] = useState("");
  const [personalCierre, setPersonalCierre] = useState("");
  const [cerramientoPredio, setCerramientoPredio] = useState("");
  const [otrosCerramiento, setOtrosCerramiento] = useState("");
  const [comentariosSeguridadFisica, setComentariosSeguridadFisica] = useState("");

  const [plantasElectricas, setPlantasElectricas] = useState({
    numero: "",
    marca: "",
    tipo: "",
    capacidad: "",
    edad: "",
    transferencia: "",
    voltajeCobertura: ""
  });
  const [energiaComentarios, setEnergiaComentarios ] =useState("");

  // Transformadores - ahora es un array para permitir múltiples
  const [transformadores, setTransformadores] = useState([
    {
      id: Date.now(),
      subestacion: "",
      marca: "",
      tipo: "",
      capacidad: "",
      edad: "",
      relacionVoltaje: ""
    }
  ]);

  const [plantaNumero1, setPlantaNumero1] = useState("");
  const [plantaMarca1, setPlantaMarca1] = useState("");
  const [plantaTipo1, setPlantaTipo1] = useState("");
  const [plantaCapacidad1, setPlantaCapacidad1] = useState("");
  const [plantaEdad1, setPlantaEdad1] = useState("");
  const [plantaTransferencia1, setPlantaTransferencia1] = useState("");
  const [plantaVoltaje1, setPlantaVoltaje1] = useState("");
  const [plantaCobertura1, setPlantaCobertura1] = useState("");

  const [plantaNumero2, setPlantaNumero2] = useState("");
  const [plantaMarca2, setPlantaMarca2] = useState("");
  const [plantaTipo2, setPlantaTipo2] = useState("");
  const [plantaCapacidad2, setPlantaCapacidad2] = useState("");
  const [plantaEdad2, setPlantaEdad2] = useState("");
  const [plantaTransferencia2, setPlantaTransferencia2] = useState("");
  const [plantaVoltaje2, setPlantaVoltaje2] = useState("");
  const [plantaCobertura2, setPlantaCobertura2] = useState("");





  //Agua
  const [aguaFuente, setAguaFuente] = useState("");
  const [aguaUso, setAguaUso] = useState("");
  const [aguaAlmacenamiento, setAguaAlmacenamiento] = useState("");
  const [aguaBombeo, setAguaBombeo] = useState("");
  const [aguaComentarios, setAguaComentarios] = useState("");

  // Proteccion contra Incendios
  const [extintor, setExtintor] = useState("");
  const [rci, setRci] = useState("");
  const [rociadores, setRociadores] = useState("");
  const [deteccion, setDeteccion] = useState("");
  const [alarmas, setAlarmas] = useState("");
  const [brigadas, setBrigadas] = useState("");
  const [bomberos, setBomberos] = useState("");


  //Seguridad
  const [seguridadDescripcion, setSeguridadDescripcion] = useState("");

  // Siniestralidad

  const [siniestralidad, setSiniestralidad] = useState("");

  // recomendaciones 

const [nuevaRecomendacion, setNuevaRecomendacion] = useState("");
const [recomendaciones, setRecomendaciones] = useState("");

  const [maquinariaDescripcion, setMaquinariaDescripcion] = useState("");





  // Tabla de riesgo
  const [tablaRiesgos, setTablaRiesgos] = useState([
    { riesgo: "Incendio/Explosión", probabilidad: "", severidad: "", clasificacion: "" },
    { riesgo: "AMIT", probabilidad: "", severidad: "", clasificacion: "" },
    { riesgo: "Anegación", probabilidad: "", severidad: "", clasificacion: "" },
    { riesgo: "Terremoto", probabilidad: "", severidad: "", clasificacion: "" },
    { riesgo: "Sustracción", probabilidad: "", severidad: "", clasificacion: "" },
    { riesgo: "Rotura de maquinaria", probabilidad: "", severidad: "", clasificacion: "" },
    { riesgo: "Responsabilidad Civil", probabilidad: "", severidad: "", clasificacion: "" },
  ]);


  // Mensajes predeterminados
  const mensajesRecomendados = [
    "Se recomienda actualizar el plan de emergencias.",
    "Instalar un sistema de alarma contra incendios.",
    "Realizar mantenimiento preventivo a los equipos.",
    "Capacitar al personal en evacuación y manejo de extintores.",
    "Actualizar señalización de rutas de evacuación.",
    "Implementar un programa de inspección mensual.",
  ];

  // Lista de recomendaciones (puedes ponerlas resumidas aquí o importarlas desde un JSON o txt si prefieres)
  const [bancoRecomendaciones, setBancoRecomendaciones] = useState(() =>{
     const stored = localStorage.getItem("bancoRecomendaciones");
    return stored ? JSON.parse(stored) : {
    "INCENDIO": [
      "DURANTE EL PERÍODO DE VIGENCIA DE LA PÓLIZA DEBE VERIFICARSE EL CORRECTO ACONDICIONAMIENTO DE LAS INSTALACIONES ELÉCTRICAS Y SU RESPECTIVO MANTENIMIENTO COMO MÍNIMO CADA 6 MESES, QUE INCLUYA ENTUBAR TODOS LOS CIRCUITOS DE DISTRIBUCIÓN DE ENERGÍA, ELIMINAR EL USO DE EXTENSIONES COMO MEDIO PERMANENTE DE CONEXIÓN Y CIERRE DE TODAS LAS CAJAS DE PASO, TABLEROS DE DISTRIBUCIÓN DE ENERGÍA, PUNTOS DE CABLEADO EXPUESTO, LUMINARIAS, INTERRUPTORES Y TOMAS ELÉCTRICAS.",
      "REALIZAR DURANTE LA VIGENCIA DE LA PÓLIZA LA SUSPENSIÓN DEL SUMINISTRO DE ENERGÍA ELÉCTRICA, DURANTE LAS HORAS Y DÍAS NO LABORABLES A LOS CIRCUITOS DE DISTRIBUCIÓN ELÉCTRICA, DE LOS EQUIPOS O ÁREAS NO INDISPENSABLES PARA EL DESARROLLO PROPIO DE LAS ACTIVIDADES DEL ASEGURADO;ENTENDIENDO COMO INDISPENSABLES LOS CIRCUITOS QUE SUMINISTRAN ENERGÍA A EQUIPOS O ÁREAS QUE POR EL FUNCIONAMIENTO DE LA EMPRESA, NO SE PUEDEN QUEDAR SIN ENERGÍA. ESTA SUSPENSIÓN DEBE EVIDENCIARSE POR MEDIO DE UN PROCEDIMIENTO CON RESPONSABLES DEFINIDOS Y REGISTROS SUFICIENTES.",
      "DURANTE LA VIGENCIA DE LA PÓLIZA, MANTENER INSTALADOS LOS EXTINTORES NECESARIOS Y ADECUADOS PARA PROTEGER TODAS LAS INSTALACIONES.  ESTOS DEBERÁN PERMANECER EN BUEN ESTADO, CON CARGA VIGENTE (MÁXIMO 1 AÑO), SEÑALIZADOS Y UBICADOS EN UN LUGAR VISIBLE Y DE FÁCIL ACCESO. A LOS EFECTOS DE LO ANTERIORMENTE EXPUESTO, SE ENTIENDE POR EXTINTORES SUFICIENTES, QUE POR CADA 200M2 DE ÁREA CONSTRUIDA DE LA EMPRESA, SE DEBE CONTAR POR LO MENOS CON UN EXTINTOR. DE IGUAL MANERA SE ENTIENDE POR EXTINTORES ADECUADOS, QUE LAS ÁREAS EN DONDE SE CONCENTRA MATERIAL SÓLIDO COMBUSTIBLE TALES COMO PAPEL, MADERA, TEXTILES, ETC., DEBEN ESTAR PROTEGIDAS CON EXTINTORES TIPO A DE MÍNIMO 2 1/2 GAL DE CAPACIDAD. LAS ÁREAS EN DONDE SE CONCENTRAN PRODUCTOS INFLAMABLES TALES COMO GASOLINA, DISOLVENTES, ETC.; LO MISMO QUE LAS ÁREAS EN DONDE SE CONCENTRA MAQUINARIA SIN COMPONENTES ELECTRÓNICOS, DEBEN ESTAR PROTEGIDAS CON EXTINTORES TIPO BC DE MÍNIMO 20 LB. DE CAPACIDAD. LAS ÁREAS EN DONDE SE ENCUENTRA TANTO MATERIAL SÓLIDO COMBUSTIBLE, COMO PRODUCTOS INFLAMABLES Y/O MAQUINARIA, DEBEN ESTAR PROTEGIDAS CON EXTINTORES TIPO ABC DE MÍNIMO 20 LB. DE CAPACIDAD. LAS ÁREAS EN DONDE SE ENCUENTRAN EQUIPOS ELECTRÓNICOS Y/O MAQUINARIA CON COMPONENTES ELECTRÓNICOS, DEBEN ESTAR PROTEGIDAS CON EXTINTORES TIPO SOLKAFLAM 123 DE MÍNIMO 10 LB. DE CAPACIDAD.",
      "MANTENER INSTALADO, DURANTE LA VIGENCIA DE LA PÓLIZA, UN SISTEMA DE DETECTORES AUTOMÁTICOS DE INCENDIO (TÉRMICOS, DE HUMO O DE LLAMA),  UBICADOS EN EL TECHO POR LO MENOS A 10 CM DE DISTANCIA DE LA PARED MÁS CERCANA O EN PAREDES LATERALES A 10 O 30 CM DEL TECHO, LA DISTANCIA VERTICAL DEL TECHO AL SENSOR DEBE SER MÍNIMO DE 50 CM, CON UNA DISPOSICIÓN UNIFORME DE MÁXIMO 9 M DE DISTANCIA ENTRE DETECTORES; ESTOS DISPOSITIVOS DEBEN ESTAR CONECTADOS A UN SISTEMA DE ALARMA SONORO O DE COMUNICACIÓN AUTOMÁTICA A LOS CUERPOS DE EMERGENCIA. EN CASO DE CONTAR CON OTRO TIPO DE DETECTORES APARTE DE LOS MENCIONADOS, SEGUIR LAS RECOMENDACIONES DEL FABRICANTE EN CUANTO A SU INSTALACIÓN..",
      "LOS SISTEMAS DE ROCIADORES AUTOMÁTICOS (SPRINKLERS) SON LOS MÁS CONFIABLES Y ECONÓMICOS; ES IMPORTANTE RESALTAR QUE ES MÁS FÁCIL REHABILITAR UN DOCUMENTO HÚMEDO QUE UNO INCINERADO. POR SU PARTE, LOS SISTEMAS DE EXTINCIÓN CON ELEMENTOS GASEOSOS TIENEN A SU FAVOR QUE OCASIONAN MENOR DAÑO A LOS ARTÍCULOS ALMACENADOS, SU OPERACIÓN REQUIERE AISLAR AUTOMÁTICAMENTE LAS ÁREAS PROTEGIDAS Y EXISTEN LIMITACIONES PARA LA EXTINCIÓN, POR CUANTO AL ACTUAR POR SOFOCAMIENTO NO ENFRÍAN LOS ELEMENTOS QUE ESTÁN EN COMBUSTIÓN, HACIENDO QUE ÉSTOS PUEDAN SEGUIR AFECTÁNDOSE POR COMBUSTIÓN LENTA O CON EL RIESGO DE REIGNICIÓN; POR LO ANTERIOR, SE REQUIERE DE UNA INTERVENCIÓN CON AGUA PARA EXTINCIÓN FINAL, CON LOS PROBLEMAS DE DAÑOS ASOCIADOS A LA APLICACIÓN DE AGUA CON MANGUERAS.EN LA NFPA 13 , NFPA 15 Y NFPA 16 SE ENCUENTRAN LOS ASPECTOS A TENER EN CUENTA PARA LOS SISTEMAS DE ROCIADORES AUTOMÁTICOS.",
      "ES CONVENIENTE QUE LOS DETECTORES DE HUMO SE UBIQUEN, COMO MÁXIMO, A 60 CM DEL TECHO, ESTO CON EL ÁNIMO DE REDUCIR UNA POSIBLE PROPAGACIÓN DE FUEGO, CON DETECCIÓN TARDÍA; ESPECIFICACIONES CONTENIDAS EN LA NFPA 72 E4.",
      "SE SUGIERE REALIZAR PRUEBAS DE PRESIÓN Y CAUDAL A LA RED CONTRA INCENDIOS, VERIFICANDO EL ADECUADO FUNCIONAMIENTO DE LA MISMA; ESTE SUMINISTRO DEBE SER CAPAZ DE PROVEER EL CAUDAL Y LA PRESIÓN RESIDUAL, REQUERIDOS EN UN TIEMPO MÍNIMO, DE ACUERDO A NFPA 14 , NFPA 20 Y NFPA 25.",
      "LOS EXTINTORES TIENEN UN ALCANCE VERTICAL ÓPTIMO DE 2,5 M, APLICADO POR UNA PERSONA CON EXPERIENCIA, LO QUE INDICA QUE PARA ESTANTERÍA DE 8,5 M LA COBERTURA DE EXTINTORES NO ES SUFICIENTE PARA LAS ALTURAS DE ALMACENAMIENTO MANEJADAS. SE SUGIERE ESTUDIAR LA POSIBILIDAD DE INSTALAR UN SISTEMA DE REACCIÓN MANUAL O AUTOMÁTICO CONTRA INCENDIOS (ÁREAS ADMINISTRATIVAS, DE ALMACENAMIENTO, PRODUCCIÓN, LABORATORIOS Y SERVICIO AL PÚBLICO); ÉSTE SISTEMA DEBERÁ ESTAR CONECTADO A UNA CENTRAL DE MONITOREO.",
      "LOS MEDIDORES DE NIVEL DE LOS TANQUES DE COMBUSTIBLE, TENDRÁN QUE SER PREFERIBLEMENTE EN UN MATERIAL RESISTENTE AL FUEGO, EVITANDO EL USO DE MANGUERAS DE PLÁSTICO, LAS CUALES SON CONSUMIDAS DE INMEDIATO EN UN INCENDIO, OCASIONANDO EL CORRESPONDIENTE DERRAME DE COMBUSTIBLE",
      "SE RECOMIENDA QUE EN LAS BODEGAS DONDE EXISTE ALMACENAMIENTO DE AEROSOLES EXISTA UNA JAULA METÁLICA ESPECIAL PARA EL ALMACENAMIENTO DE LOS MISMOS; DE IGUAL MANERA, ES CONVENIENTE QUE EL ESPACIO ENTRE LOS ESLABONES TENGA UNA SEPARACIÓN MÁXIMA DE 51 MM QUE IMPIDA, EN CASO DE INCENDIO, LA SALIDA DE UN AEROSOL DISPARADO POR EL FUEGO. ",
      "ES CONVENIENTE QUE LOS DUCTOS DE ESCAPE DE HUMOS (CHIMENEAS O CAMPANAS) DE LOS RESTAURANTES CUENTEN CON UN PROGRAMA DE MANTENIMIENTO SEMESTRAL, CON EL ÁNIMO DE EVITAR LA ACUMULACIÓN DE GRASA Y ELEMENTOS EN SU INTERIOR QUE PUEDAN LLEGAR A GENERAR EL INICIO DE UN INCENDIO EN SU INTERIOR."
    ],
    "ROTURA DE MAQUINARIA": [
      "DE ACUERDO A LAS CLÁUSULAS DE MANTENIMIENTO DE MAQUINARIA Y EQUIPO, SEGÚN LAS RECOMENDACIONES DE LOS FABRICANTES, ES NECESARIO ESTABLECER UN PLAN DE MANTENIMIENTO PREVENTIVO; ÉSTE MANTENIMIENTO DEBE SER REALIZADO POR PERSONAL ESPECIALIZADO PARA TODOS LOS EQUIPOS ELECTRÓNICOS, DONDE DEBE INCLUIRSE UNA REVISIÓN GENERAL COMO MÍNIMO CADA SEIS MESES. DE IGUAL MANERA, SE SUGIERE LLEVAR Y MANTENER LOS REGISTROS DE LAS ACTIVIDADES EJECUTADAS.",
      "EN UN AMBIENTE CON BASTANTE POLVO, EL MANTENIMIENTO QUE SE REALIZA A LOS EQUIPOS REQUIERE DE UNA FRECUENCIA MAYOR, YA QUE SE ENCUENTRAN EXPUESTOS A DAÑOS OCASIONADOS POR ÉSTA CAUSA."
    ],
    "ALMACENAMIENTO": [
      "MANTENER ALMACENADOS LOS PRODUCTOS INFLAMABLES (POR EJEMPLO: ACPM) EN LUGARES VENTILADOS Y SEPARADOS DE FUENTES DE IGNICIÓN (POR EJEMPLO: INSTALACIONES ELÉCTRICAS, LLAMA ABIERTA, ENTRE OTRAS).",
      "EN TODAS LAS ÁREAS DONDE SE ALMACENEN ELEMENTOS INFLAMABLES, LAS INSTALACIONES Y LOS EQUIPOS DEBEN SER A PRUEBA DE EXPLOSIÓN (EXPLOSION PROOF).",
      "LOS TANQUES DE ALMACENAMIENTO DE LÍQUIDOS INFLAMABLES Y CORROSIVOS DEBEN ESTAR Y MANTENERSE DEBIDAMENTE MARCADOS; DE IGUAL MANERA, LA CAPACIDAD DE CADA TANQUE DEBERÁ ESTAR INCLUIDA DENTRO DE LA ETIQUETA. PARA ELLO, ES CONVENIENTE ACOGERSE A LA NFPA 30. ",
      "LA ZONA DE ALMACENAMIENTO DE ELEMENTOS CORROSIVOS, LÍQUIDOS INFLAMABLES Y CUALQUIER MERCANCÍA PELIGROSA DEBE ESTAR DEBIDAMENTE UBICADA, CONSIDERANDO LA COMPATIBILIDAD QUÍMICA DE TODAS LAS MERCANCÍAS.",
      "LOS PRODUCTOS CORROSIVOS Y LÍQUIDOS INFLAMABLES, ALMACENADOS CON OTROS INSUMOS, AGRAVAN EL FACTOR DE RIESGOS Y POR LO TANTO NO DEBE OCURRIR BAJO NINGUNA CIRCUNSTANCIA; LAS MERCANCÍAS PELIGROSAS DEBERÁN ESTAR ALMACENADAS EN ÁREAS ESPECIALES, AISLADAS DE LOS DEMÁS ELEMENTOS Y, PREFERIBLEMENTE, SEPARADAS MEDIANTE JAULAS METÁLICAS, CON LOS DEBIDOS RÓTULOS DE MARCACIÓN.",
      "DEBEN ANCLARSE LOS CILINDROS DE GAS QUE NO ESTÁN SIENDO UTILIZADOS, ESTO CON EL ÁNIMO DE PREVENIR LA CAÍDA DE UNO DE ELLOS, CON SUS CORRESPONDIENTES CONSECUENCIAS. ",    
      "SE DEBEN CONSERVAR Y MANTENER ADECUADAS FORMAS DE ALMACENAMIENTO, DE ACUERDO A LA NFPA 23018: O EN LAS BODEGAS DE ALMACENAMIENTO, LA MERCANCÍA NO DEBE LLEGAR HASTA LA CUBIERTA, DEBIDO A LA DIFICULTAD QUE PRESENTA EL CONTROL DE UN INCENDIO; DEBERÁ EXISTIR, COMO MÍNIMO, UNA DISTANCIA DE 60 CM ENTRE EL MATERIAL ALMACENADO Y EL TECHO. O SE RECOMIENDA MANTENER TODA LA MERCANCÍA LIBRE DE CONTACTO DIRECTO CON EL PISO, MEDIANTE ESTANTERÍA O ESTIBAS, PLÁSTICAS O DE MADERA; EN AMBOS CASOS, A UNA ALTURA SUPERIOR DE 10 CM. O LA MERCANCÍA DEBE PERMANECER SEPARADA, POR LO MENOS, 50 CM DE PAREDES Y FUENTES TÉRMICAS (POR EJEMPLO: LÁMPARAS, INTERRUPTORES, TABLEROS ELÉCTRICOS, ENTRE OTROS). O EN LAS BODEGAS DE MATERIA PRIMA Y PRODUCTO TERMINADO, ES NECESARIO MANEJAR Y MANTENER FORMAS ADECUADAS DE ALMACENAMIENTO, YA QUE LA ALTURA INADECUADA ES UNO DE LOS FACTORES MÁS INFLUYENTES EN EL PROGRESO DE UN INCENDIO, DIFICULTANDO EL CONTROL DEL MISMO. LA INESTABILIDAD DE LOS APILAMIENTOS NO ES DESEABLE, YA QUE FACILITA QUE LOS MATERIALES CAIGAN A LOS PASILLOS; ASÍ MISMO, PROPORCIONAN UN PUENTE PARA QUE EL FUEGO LOS CRUCE Y DIFICULTA LAS OPERACIONES DE LUCHA CONTRA INCENDIOS. SE PUDO APRECIAR QUE EXISTEN PILAS DE PRODUCTOS ALMACENADOS MUY ALTAS HACIENDO QUE EXISTA INESTABILIDAD EN LAS MISMAS Y SE GENERE UNA SITUACIÓN PELIGROSA; POR LO ANTERIOR, SE SUGIERE DISMINUIR LA ALTURA DE ALMACENAMIENTO O INSTALAR ESTANTERÍA METÁLICA QUE PUEDA SERVIR DE SOPORTE PARA ESTOS ELEMENTOS. O EL ÚLTIMO NIVEL DE LOS RACKS, EN ALGUNAS ZONAS, PRESENTA MAYOR DENSIDAD DE ALMACENAMIENTO; EXISTIENDO UNA ALTURA MÁXIMA APROXIMADA DE 8,5 M, EL MEDIO DE TRANSPORTE Y MANEJO DE MERCANCÍA SON MONTACARGAS. SE DEBE CAMBIAR LA ESTRATEGIA DE ALMACENAMIENTO, UBICANDO LA MERCANCÍA DE MAYOR DENSIDAD DE ALMACENAMIENTO EN LOS NIVELES MÁS BAJOS DE LOS RACKS; CON ESTO SE BUSCA AMINORAR EL RIESGO DE RUPTURA DE LA MERCANCÍA EN UNA MANIOBRA, YA QUE EL MONTACARGAS DESPUÉS DE 2,5 M DE ALTURA DE MANIPULACIÓN PRESENTARÁ PUNTOS CIEGOS PARA EL OPERARIO.",
    ],
    "SUSTRACCIÓN Y MANEJO": [
    "SE SUGIERE INSTALAR UN SISTEMA DE DETECCIÓN AUTOMÁTICA CONTRA INTRUSOS EN LAS ZONAS MENCIONADAS Ó IMPLANTAR UN SISTEMA CON PLACAS AUTOADHESIVAS EN LOS EQUIPOS QUE ALERTEN AL PERSONAL DE SEGURIDAD AL CRUZAR POR ARCOS DE DETECCIÓN, DE MANERA SIMILAR AL SISTEMA EMPLEADO EN ALMACENES DE VENTA DE DISCOS, LIBROS O PRENDAS DE VESTIR.",
    "ES CONVENIENTE MANTENER INSTALADO UN SISTEMA DE ALARMA QUE CUENTE CON SENSORES DE MOVIMIENTO QUE PROTEJAN TODAS LAS INSTALACIONES, SENSORES MAGNÉTICOS DE APERTURA Y DEMÁS SENSORES NECESARIOS PARA PROTEGER LOS DIFERENTES ACCESOS AL PREDIO. EL SISTEMA DEBE ESTAR CONECTADO A UNA SIRENA; EN CASO DE FALLAS EN EL SUMINISTRO DE ENERGÍA, LA ALARMA DEBE CONTAR CON UNA BATERÍA DE RESERVA QUE SOPORTE EL SISTEMA, COMO MÍNIMO 4 HORAS; DE IGUAL MANERA, EL SISTEMA DEBE ESTAR MONITOREADO (CON SERVICIO DE REACCIÓN) VÍA TELEFÓNICA CON UNA FIRMA ESPECIALIZADA INSCRITA EN LA SUPERINTENDENCIA DE VIGILANCIA.",
    "EL SISTEMA DE ALARMA Y VIGILANCIA DEBE GARANTIZAR LA PROTECCIÓN DE EQUIPOS MÉDICOS ESPECIALIZADOS (LOS CUALES NORMALMENTE TIENEN COSTOS ELEVADOS) DE FÁCIL EXTRACCIÓN.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE INSTALAR O UBICAR UNA CAJA FUERTE EN UN LUGAR NO VISIBLE, EMPOTRADA AL PISO O LA PARED, PARA GUARDAR Y CUSTODIAR LOS DINEROS Y/O TÍTULOS VALORES DERIVADOS DE SU ACTIVIDAD COMERCIAL.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER INSTALADO UN CIRCUITO CERRADO DE TELEVISIÓN (CCTV), ACTIVO, LAS 24 HORAS LOS 365 DÍAS DEL AÑO. EL SISTEMA DEBE CONTAR CON CÁMARAS INTERNAS Y EXTERNAS QUE PROTEJAN LAS INSTALACIONES DEL PREDIO (PERÍMETROS Y ACCESOS). EN CASO DE FALLAS EN EL SUMINISTRO DE ENERGÍA EL CCTV DEBE ESTAR RESPALDADO POR: UNA UPS, BANCO DE BATERÍAS O PLANTA DE EMERGENCIA.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER UN SERVICIO DE VIGILANCIA POR PARTE DE PERSONAL DEDICADO A ESTA LABOR DURANTE LAS 24 HORAS DEL DÍA, TODOS LOS DÍAS DE LA SEMANA; EL PERSONAL DEDICADO A ESTA LABOR NO DEBE CONTAR CON LLAVES DE LAS PUERTAS DE ACCESO AL PREDIO, NI CLAVES DE APERTURA Y CIERRE DEL SISTEMA DE ALARMA.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER UN SERVICIO DE VIGILANCIA POR PARTE DE PERSONAL DE FIRMA ESPECIALIZADA, INSCRITA EN LA SUPERINTENDENCIA DE VIGILANCIA DURANTE LAS 24 HORAS DEL DÍA, TODOS LOS DÍAS DE LA SEMANA; EL PERSONAL DEDICADO A ESTA LABOR NO DEBE CONTAR CON LLAVES DE LAS PUERTAS DE ACCESO AL PREDIO, NI CLAVES DE APERTURA Y CIERRE DEL SISTEMA DE ALARMA.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER INSTALADO Y ACTIVO, UN SISTEMA DE ALARMA QUE PROTEJA LAS INSTALACIONES Y POSIBLES ACCESOS CON SENSORES DE MOVIMIENTO, SENSORES MAGNÉTICOS DE APERTURA, SENSORES DE PÁNICO INALÁMBRICOS Y/O FIJOS. EL SISTEMA DEBE ESTAR MONITOREADO VÍA RADIO, GPRS Y/O CELULAR CON EMPRESA ESPECIALIZADA INSCRITA EN LA SUPERINTENDENCIA DE VIGILANCIA; LA CUAL CUENTE CON SERVICIO DE REACCIÓN. LA ALARMA DEBE CONTAR CON UNA BATERÍA DE RESERVA QUE SOPORTE EL SISTEMA COMO MÍNIMO CUATRO (4) HORAS.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER INSTALADO POR ENCIMA DE LOS MUROS Y/O EN LAS REJAS PERIMETRALES COLINDANTES A LOS PREDIOS ALEDAÑOS, UN SISTEMA DE ALAMBRADO ELÉCTRICO. EL SISTEMA DEBE CONTAR CON UNA BATERÍA DE RESERVA QUE SOPORTE EL SISTEMA COMO MÍNIMO CUATRO (4) HORAS.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER INSTALADO POR ENCIMA DE LOS MUROS Y/O EN LAS REJAS PERIMETRALES COLINDANTES A LOS PREDIOS ALEDAÑOS, UN SISTEMA DE CONCERTINAS. ENTIÉNDASE POR CONCERTINA: ALAMBRE ENROLLADO CON FILAMENTOS CORTO PUNZANTES."
  ],
  "RESPONSABILIDAD CIVIL CONTRACTUAL Y EXTRACONTRACTUAL / MEDIO AMBIENTE": [
    "MUCHOS TIPOS DE EDIFICIOS TIENEN, EN SU INTERIOR, RECINTOS PARA LA RECOLECCIÓN DE BASURAS. ALGUNOS DE ESTOS CUENTAN CON UN SISTEMA DE CONDUCCIÓN DE BASURAS O \"CHUTES\" POR LOS CUALES, SE LANZAN LOS DESECHOS, PARA POSTERIORMENTE SER ALMACENADOS EN RECIPIENTES DE MAYOR TAMAÑO.",
    "DADO QUE ESTOS ESPACIOS RECIBEN TODO TIPO DE MATERIALES, PUEDEN ENCONTRARSE OBJETOS CON ALTA CARGA COMBUSTIBLE QUE, EN EL MOMENTO DE GENERARSE FUENTES DE IGNICIÓN, PODRÍA PRODUCIRSE UN EVENTO DE INCENDIO. POR ESTO SE RECOMIENDA QUE LOS DEPÓSITOS DE BASURA CUENTEN CON LAS SIGUIENTES CARACTERÍSTICAS ESTIPULADAS EN LA NORMA NFPA 82 – ESTÁNDAR EN INCINERADORES Y DESECHOS Y SISTEMAS DE MANEJO DE LINOS Y EQUIPAMIENTO:",
    "· EL RECINTO DEBE ESTAR PROVISTO DE UNA PUERTA CON CIERRE AUTOMÁTICO CON RESISTENCIA AL FUEGO NO MENOR A 1 ½ HORA.",
    "· SE DEBEN REALIZAR LABORES DE MANTENIMIENTO Y LIMPIEZA ADECUADOS ANUALMENTE O SEGÚN COMO LO RECOMIENDE EL CONSTRUCTOR.",
    "· SI EL RECINTO DE ALMACENAMIENTO ALBERGA MÁS DE 0,75 M3 DE BASURA SIN COMPACTAR EN SU INTERIOR, ÉSTE DEBE ESTAR AISLADO DE OTROS RECINTOS DEL EDIFICIO POR PAREDES Y CUBIERTAS CON RESISTENCIA AL FUEGO NO INFERIOR A 2 HORAS.",
    "· EL RECINTO DE BASURAS DEBE CONTAR CON UN SISTEMA DE REGADERAS AUTOMÁTICAS PARA LA EXTINCIÓN DE FUEGO, SIGUIENDO LOS LINEAMIENTOS DE LA NFPA 13 – STANDARD PARA INSTALACIÓN DE SISTEMAS DE REGADERAS.",
    "· POR SER UN ÁREA, EN SU MAYORÍA DEL TIEMPO, DESPOBLADA, SE RECOMIENDA INSTALAR UN SISTEMA DE DETECCIÓN DE INCENDIOS, QUE SE ENCUENTRA MONITOREADO CONSTANTEMENTE POR PERSONAL DE VIGILANCIA."
  ],
  "INSTALACIONES ELÉCTRICAS": [
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER TODOS LOS EQUIPOS ELECTRÓNICOS CON CONEXIÓN DE PUESTA A TIERRA Y SISTEMAS DE REGULACIÓN TALES COMO REGULADORES DE VOLTAJE (ESTABILIZADORES) O UPS \"ON LINE\" DE SUFICIENTE CAPACIDAD. ASÍ MISMO SE DEBE GARANTIZAR EL CORRECTO CUMPLIMIENTO DE LAS RECOMENDACIONES DEL FABRICANTE DEL SISTEMA. REALIZAR MANTENIMIENTO PREVENTIVO SEMESTRAL A LOS EQUIPOS DE PROTECCIÓN. EVIDENCIAR LAS ACTIVIDADES DE MANTENIMIENTO POR MEDIO DE UN REGISTRO DOCUMENTADO.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER TODOS LOS EQUIPOS ELECTRÓNICOS QUE TENGAN ENTRADA DE COMUNICACIÓN TELEFÓNICA (CENTRALES TELEFÓNICAS, FAXES, COMPUTADORES, EQUIPO DE CÓMPUTO, ENTRE OTROS), CON SUPRESORES DE PICOS INSTALADOS A LA SALIDA DE LAS TOMACORRIENTES O MULTITOMAS. REALIZAR VERIFICACIÓN COMO MÍNIMO CADA SEIS (6) MESES, SU CORRECTO FUNCIONAMIENTO. EVIDENCIAR LAS ACTIVIDADES DE MANTENIMIENTO POR MEDIO DE UN REGISTRO DOCUMENTADO O BITÁCORA.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER UN CONTRATO DE MANTENIMIENTO PREVENTIVO CON UN TERCERO ESPECIALIZADO PARA TODOS LOS EQUIPOS ELECTRÓNICOS, EL CUAL INCLUYA UNA REVISIÓN GENERAL COMO MÍNIMO CADA SEIS (6) MESES. EVIDENCIAR LAS ACTIVIDADES DE MANTENIMIENTO POR MEDIO DE UN REGISTRO DOCUMENTADO O BITÁCORA POR EQUIPO.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER UN CONTRATO DE MANTENIMIENTO PREVENTIVO CON UN TERCERO ESPECIALIZADO PARA TODOS LOS EQUIPOS ELECTRÓNICOS, EL CUAL INCLUYA UN PROCESO DE MANTENIMIENTO CADA TRES (3) MESES. EVIDENCIAR LAS ACTIVIDADES DE MANTENIMIENTO POR MEDIO DE UN REGISTRO DOCUMENTADO O BITÁCORA POR EQUIPO.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE GARANTIZAR QUE TODOS LOS TABLEROS ELÉCTRICOS DE DISTRIBUCIÓN DE LA SUBESTACIÓN O AQUELLAS LÍNEAS DE ALIMENTACIÓN A EQUIPOS ELECTRÓNICOS ESPECIALIZADOS, DISPONGAN DE DISPOSITIVOS DE PROTECCIÓN CONTRA SOBRETENSIONES TRANSITORIAS, CON UN SISTEMA APROPIADO DE PUESTA A TIERRA. PARA LA INSTALACIÓN DE UN SISTEMA APROPIADO DE PUESTA A TIERRA, TOMAR EN CONSIDERACIÓN EL REGLAMENTO TÉCNICO DE INSTALACIONES ELÉCTRICAS (RETIE).",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE MANTENER UN SISTEMA DE PUESTA A TIERRA DE CAPACIDAD SUFICIENTE PARA PROTEGER LOS EQUIPOS ELECTRÓNICOS EXISTENTES EN LAS INSTALACIONES Y REALIZAR MANTENIMIENTO PREVENTIVO ANUAL AL SISTEMA. EVIDENCIAR LAS ACTIVIDADES DE MANTENIMIENTO POR MEDIO DE UN REGISTRO DOCUMENTADO. PARA LA INSTALACIÓN DE UN SISTEMA APROPIADO DE PUESTA A TIERRA, TOMAR EN CONSIDERACIÓN EL REGLAMENTO TÉCNICO DE INSTALACIONES ELÉCTRICAS (RETIE)."
  ],
  "INSTALACIONES FÍSICAS, CONSTRUCCIÓN, ORDEN, ASEO": [
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE REALIZAR MANTENIMIENTO GENERAL A LAS CANALES Y BAJANTES CÓMO MÍNIMO CADA SEIS (6) MESES, QUE INCLUYA LIMPIEZA Y CAMBIO DE ELEMENTOS DEFECTUOSOS (TEJAS, GANCHOS, ENTRE OTROS). EVIDENCIAR LAS ACTIVIDADES DE MANTENIMIENTO POR MEDIO DE UN REGISTRO DOCUMENTADO O BITÁCORA.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE REALIZAR MANTENIMIENTO, POR LO MENOS CADA SEIS (6) MESES, A LA IMPERMEABILIZACIÓN, CANALES Y BAJANTES, EL CUAL INCLUYE SU LIMPIEZA Y LA REVISIÓN DEL MANTO QUE PROTEGE LA CUBIERTA. EVIDENCIAR LAS ACTIVIDADES DE MANTENIMIENTO POR MEDIO DE UN REGISTRO DOCUMENTADO O BITÁCORA.",
    "DURANTE LA VIGENCIA DE LA PÓLIZA, EL ASEGURADO DEBE REALIZAR MANTENIMIENTO POR LO MENOS CADA TRES (3) MESES, A LOS CANALES Y BAJANTES DE AGUAS LLUVIAS Y CAJAS DE INSPECCIÓN, ENTRE OTROS, EL CUAL INCLUYE SU LIMPIEZA Y LA REVISIÓN DE LOS DESAGÜES DE AGUAS LLUVIAS QUE PROTEGEN EL PREDIO DE INUNDACIONES. RESPALDAR EL DESAGÜE CON UN SISTEMA DE BOMBEO CON MOTOBOMBAS SUMERGIBLES, PARA EVACUAR CUALQUIER FLUIDO EN CASO DE INUNDACIÓN."
  ],
    };
  });

  // Guardar banco de recomendaciones en localStorage cuando cambie
  useEffect(() => {
    try {
      const bancoString = JSON.stringify(bancoRecomendaciones);
      localStorage.setItem("bancoRecomendaciones", bancoString);
} catch (error) {
      console.error('❌ Error al guardar banco de recomendaciones en localStorage:', error);
      // Intentar guardar solo las categorías principales si hay error de espacio
      try {
        const bancoReducido = Object.keys(bancoRecomendaciones).reduce((acc, key) => {
          acc[key] = bancoRecomendaciones[key].slice(0, 50); // Limitar a 50 recomendaciones por categoría
          return acc;
        }, {});
        localStorage.setItem("bancoRecomendaciones", JSON.stringify(bancoReducido));
        console.warn('⚠️ Banco de recomendaciones guardado en versión reducida debido a limitaciones de espacio');
      } catch (e) {
        console.error('❌ Error crítico al guardar banco de recomendaciones:', e);
      }
    }
}, [bancoRecomendaciones]);


  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

  // Hook para manejar el historial
  const { guardando, exportando, guardarEnHistorial, exportarYGuardar } = useHistorialFormulario(TIPOS_FORMULARIOS.INSPECCION);

  const handleAgregarRecomendacion = (recomendacion) => {
    if (recomendacion && !recomendaciones.includes(recomendacion)) {
      setRecomendaciones((prev) =>
        prev ? prev + "\n• " + recomendacion : "• " + recomendacion
      );
    }
  };


  useEffect(() => {
    const datosPrevios = location.state || {}; // ✅ Aquí se declara dentro del efecto
    setFormData((prev) => ({
      ...prev,
      ...datosPrevios,
    }));
  }, [location.state]);

    useEffect(() => {
    if (datosPrevios.nombreCliente) {
      setNombreCliente(datosPrevios.nombreCliente);
    }
  }, [datosPrevios.nombreCliente]);

  // Cargar datos desde localStorage al iniciar (solo si no hay ID)
  useEffect(() => {
    if (!id || id === 'nuevo') {
      const datosGuardados = localStorage.getItem('formularioInspeccion');
      if (datosGuardados) {
        try {
          const datosParseados = JSON.parse(datosGuardados);
          if (datosParseados && typeof datosParseados === 'object') {
            // Restaurar todos los estados desde localStorage
            if (datosParseados.formData) setFormData(datosParseados.formData);
            if (datosParseados.barrio !== undefined) setBarrio(datosParseados.barrio);
            if (datosParseados.departamento !== undefined) setDepartamento(datosParseados.departamento);
            if (datosParseados.horarioLaboral !== undefined) setHorarioLaboral(datosParseados.horarioLaboral);
            if (datosParseados.cargo !== undefined) setCargo(datosParseados.cargo);
            if (datosParseados.colaboladores !== undefined) setColaboladores(datosParseados.colaboladores);
            if (datosParseados.nombreEmpresa !== undefined) setNombreEmpresa(datosParseados.nombreEmpresa);
            if (datosParseados.direccion !== undefined) setDireccion(datosParseados.direccion);
            if (datosParseados.municipio !== undefined) setMunicipio(datosParseados.municipio);
            if (datosParseados.personaEntrevistada !== undefined) setPersonaEntrevistada(datosParseados.personaEntrevistada);
            if (datosParseados.nombreCliente !== undefined) setNombreCliente(datosParseados.nombreCliente);
            if (datosParseados.aseguradora !== undefined) setAseguradora(datosParseados.aseguradora);
            if (datosParseados.fecha !== undefined) setFecha(datosParseados.fecha);
            if (datosParseados.imagenesRegistro !== undefined) setImagenesRegistro(datosParseados.imagenesRegistro);
            if (datosParseados.descripcionEmpresa !== undefined) setDescripcionEmpresa(datosParseados.descripcionEmpresa);
            if (datosParseados.infraestructura !== undefined) setInfraestructura(datosParseados.infraestructura);
            if (datosParseados.analisisRiesgos !== undefined) setAnalisisRiesgos(datosParseados.analisisRiesgos);
            if (datosParseados.areas !== undefined) setAreas(datosParseados.areas);
            if (datosParseados.datosEquipos !== undefined) setDatosEquipos(datosParseados.datosEquipos);
            // Agregar más estados según sea necesario
}
        } catch (error) {
          console.error('Error al cargar datos guardados:', error);
          localStorage.removeItem('formularioInspeccion');
        }
      }
    }
  }, [id]);

  // Guardar datos automáticamente cuando cambien (con debounce para evitar guardados excesivos)
  // Solo se guarda si estamos en la ruta del formulario de inspección
  useEffect(() => {
    const esRutaInspeccion = location.pathname.includes('/inspeccion') || location.pathname.includes('/formulario-inspeccion');
    if (!esRutaInspeccion) return;

    const timeoutId = setTimeout(() => {
      try {
        const datosParaGuardar = JSON.stringify({
          formData,
          barrio,
          departamento,
          horarioLaboral,
          cargo,
          colaboladores,
          nombreEmpresa,
          direccion,
          municipio,
          personaEntrevistada,
          nombreCliente,
          aseguradora,
          fecha,
          imagenesRegistro,
          descripcionEmpresa,
          infraestructura,
          analisisRiesgos,
          areas,
          datosEquipos,
          // Agregar más estados según sea necesario
        });
        localStorage.setItem('formularioInspeccion', datosParaGuardar);
} catch (error) {
        console.error('Error al guardar datos:', error);
        try {
          localStorage.removeItem('formularioInspeccion');
          localStorage.setItem('formularioInspeccion', JSON.stringify({
            formData,
            barrio,
            departamento,
            horarioLaboral,
            cargo,
            colaboladores,
            nombreEmpresa,
            direccion,
            municipio,
            personaEntrevistada,
            nombreCliente,
            aseguradora,
            fecha,
            imagenesRegistro,
            descripcionEmpresa,
            infraestructura,
            analisisRiesgos,
            areas,
            datosEquipos,
          }));
        } catch (e) {
          console.error('Error crítico al guardar:', e);
        }
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, barrio, departamento, horarioLaboral, cargo, colaboladores, nombreEmpresa, direccion, municipio, personaEntrevistada, nombreCliente, aseguradora, fecha, imagenesRegistro, descripcionEmpresa, infraestructura, analisisRiesgos, areas, datosEquipos, location.pathname]);

  // Guardar datos antes de refrescar la página (solo si estamos en el formulario)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const esRutaInspeccion = window.location.pathname.includes('/inspeccion') || window.location.pathname.includes('/formulario-inspeccion');
      if (esRutaInspeccion) {
        try {
          localStorage.setItem('formularioInspeccion', JSON.stringify({
            formData,
            barrio,
            departamento,
            horarioLaboral,
            cargo,
            colaboladores,
            nombreEmpresa,
            direccion,
            municipio,
            personaEntrevistada,
            nombreCliente,
            aseguradora,
            fecha,
            imagenesRegistro,
            descripcionEmpresa,
            infraestructura,
            analisisRiesgos,
            areas,
            datosEquipos,
          }));
        } catch (error) {
          console.error('Error al guardar antes de salir:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, barrio, departamento, horarioLaboral, cargo, colaboladores, nombreEmpresa, direccion, municipio, personaEntrevistada, nombreCliente, aseguradora, fecha, imagenesRegistro, descripcionEmpresa, infraestructura, analisisRiesgos, areas, datosEquipos]);

  // Limpiar localStorage cuando salgamos de la ruta del formulario
  useEffect(() => {
    const esRutaInspeccion = location.pathname.includes('/inspeccion') || location.pathname.includes('/formulario-inspeccion');
    if (!esRutaInspeccion) {
localStorage.removeItem('formularioInspeccion');
    }

    return () => {
      setTimeout(() => {
        const sigueEnRutaInspeccion = window.location.pathname.includes('/inspeccion') || window.location.pathname.includes('/formulario-inspeccion');
        if (!sigueEnRutaInspeccion) {
localStorage.removeItem('formularioInspeccion');
        }
      }, 100);
    };
  }, [location.pathname]);

  const getCellColor = (r) => {
    if (r >= 13) {
      return "FF0000"; // rojo
    } else if (r >= 9) {
      return "00B0F0"; // azul
    } else if (r >= 5) {
      return "FFFF00"; // amarillo
    } else {
     return "92D050"; // verde  
     }
  };



  // Ajuste de rangos para que coincida con la guía proporcionada:
  // R: 1-4  => Bajo
  // R: 5-8  => Medio
  // R: 9-12 => Alto
  // R: 13+  => Extremo
  const calcularClasificacion = (r) => {
    if (r <= 4) return "Bajo";    // 1-4
    if (r <= 8) return "Medio";   // 5-8
    if (r <= 12) return "Alto";   // 9-12
    return "Extremo";            // 13+
  };
  
  const actualizarRiesgo = (index, campo, valor) => {
    const nuevaTabla = [...tablaRiesgos];
    nuevaTabla[index][campo] = parseInt(valor) || 0;
  
    const { probabilidad, severidad } = nuevaTabla[index];
    if (probabilidad && severidad) {
      const r = probabilidad * severidad;
      const indice = ((r / 25) * 100).toFixed(0); // Vulnerabilidad %
      nuevaTabla[index].r = r;
      nuevaTabla[index].indice = indice;
      nuevaTabla[index].clasificacion = calcularClasificacion(r);
    }
  
    setTablaRiesgos(nuevaTabla);
  };

  const celdaMatrizRiesgo = (R, porcentaje, textoRiesgo) =>
    new TableCell({
      shading: {
        fill: getCellColor(R),
      },
      borders: {
        top: { color: "000000", size: 2 },
        bottom: { color: "000000", size: 2 },
        left: { color: "000000", size: 2 },
        right: { color: "000000", size: 2 },
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `${R}`,
              bold: true,
              color: "FFFFFF", // texto blanco para contraste
            }),
            new TextRun({
              text: ` (${porcentaje}%)`,
              color: "FFFFFF",
              break: 1,
            }),
            new TextRun({
              text: textoRiesgo || "",
              color: "FFFFFF",
              break: 1,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: "center",
    });




    
  
// 🔁 Declaración previa de helpers
const celdaTexto = (text, bold = false, colspan = 1) =>
  new TableCell({
    columnSpan: colspan,
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || "", bold })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    width: { size: 100 / colspan, type: WidthType.PERCENTAGE },
  });

// Fila con etiqueta y dato extendido
const filaDoble = (label, value) => new TableRow({
  children: [
    celdaTexto(label, true),
    new TableCell({
      columnSpan: 7,
      children: [
        new Paragraph({
          children: [new TextRun({ text: value || "" })],
          alignment: AlignmentType.LEFT,
        }),
      ],
    }),
  ],
});



  const encabezadoTabla = (texto) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: texto, bold: true })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { fill: "D9D9D9" },
    verticalAlign: "center",
  });



<MapaDeCalor tablaRiesgos={tablaRiesgos} />,
<RegistroFotografico onChange={setImagenesRegistro} imagenesIniciales={imagenesRegistro} />


  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    setImagen(file);
    setPreview(URL.createObjectURL(file));
  };


  const handleCiudadChange = (selectedOption) => {
    if (!selectedOption) {
      setFormData({
        ...formData,
        ciudad_siniestro: "",
        departamento_siniestro: "",
      });
      return;
    }
    setFormData({
      ...formData,
      ciudad_siniestro: selectedOption,
      departamento_siniestro: selectedOption.label.split(" - ")[1] || "",
    });


};



  // Función para formatear fecha correctamente evitando problemas de zona horaria
  const formatearFechaInspeccion = (fechaString) => {
    if (!fechaString) return '';
    const [year, month, day] = fechaString.split('-');
    const fechaLocal = new Date(year, month - 1, day);
    return fechaLocal.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "numeric", 
      year: "numeric",
    });
  };

  const generarWord = async () => {
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
        console.error('Error convirtiendo imagen a base64:', error);
        return null;
      }
    };

    // Convertir el logo a base64 para el encabezado
    let logoBase64 = null;
    try {
      logoBase64 = await convertirImagenImportadaABase64(Logo);
} catch (error) {
      console.error('❌ Error convirtiendo logo:', error);
    }

    // Crear fecha en zona horaria local para evitar problemas de UTC
    const [year, month, day] = fecha.split('-');
    const fechaLocal = new Date(year, month - 1, day);
    
    const fechaFormateada = fechaLocal.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });


  
const seccion = (titulo) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 200 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text: titulo,
        bold: true,
        font: "Arial",
        size: 24,
      }),
    ],
  });

  
      const linea = (texto, bold = false) =>
        new Paragraph({
          children: [
            new TextRun({
              text: texto || "",
              bold,
              font: "Arial",
              size: 24, // 12 pt (en docx son la mitad)
            }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100 },
        });
        

      
    const docContent = [];
    const encabezadoTabla = (texto) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: texto, bold: true })],
          }),
        ],
      });
    
    const celdaTexto = (texto) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: texto || "" })],
          }),
        ],
      });


      const celdaTextoCentrada = (texto, bold = false) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: texto || "", bold })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    verticalAlign: "center",
  });

// Página de presentación
docContent.push(
  new Paragraph({ children: [], pageBreakBefore: true }),

  // Título "Reporte de Inspección de suscripción"
  new Paragraph({
    children: [
      new TextRun({
        text: "Reporte de Inspección de suscripción",
        bold: true,
        italics: true,
        size: 26, // 13 pt aprox.
        font: "Arial",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }),

  // Nombre de la empresa
  new Paragraph({
    children: [
      new TextRun({
        text: nombreCliente || "Nombre de la Empresa",
        bold: true,
        italics: true,
        size: 26,
        font: "Arial",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),

  // Ubicación (ciudad + departamento)
  new Paragraph({
    children: [
      new TextRun({
        text: `${formData.ciudad_siniestro} – ${formData.departamento_siniestro  || ""}`,
        italics: true,
        size: 24,
        font: "Arial",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  })
);

// Ahora sí el bloque de la imagen del riesgo (si existe)
let imagenBuffer = null;

try {
  if (imagen && imagen instanceof File) {
    // Si tenemos el archivo File directamente
    imagenBuffer = await imagen.arrayBuffer();
} else if (preview) {
    // Si tenemos preview (puede ser base64 o blob URL)
    if (typeof preview === 'string') {
      if (preview.startsWith('data:image')) {
        // Es base64, convertir a buffer
        const base64Data = preview.split(',')[1] || preview;
        imagenBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
} else if (preview.startsWith('blob:')) {
        // Es blob URL, necesitamos convertirlo
        try {
          const response = await fetch(preview);
          imagenBuffer = await response.arrayBuffer();
} catch (blobError) {
          console.error('❌ Error al obtener imagen desde blob URL:', blobError);
        }
      }
    }
  }
  
  // Si aún no tenemos buffer, intentar desde localStorage
  if (!imagenBuffer) {
    try {
      const datosGuardados = localStorage.getItem('formularioInspeccion');
      if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        if (datos.imagen && typeof datos.imagen === 'string') {
          if (datos.imagen.startsWith('data:image')) {
            const base64Data = datos.imagen.split(',')[1] || datos.imagen;
            imagenBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
}
        }
      }
    } catch (e) {
      console.error('❌ Error al obtener imagen desde localStorage:', e);
    }
  }
  
  // Si tenemos buffer, insertar la imagen
  if (imagenBuffer) {
    const imageRun = new ImageRun({
      data: imagenBuffer,
      transformation: {
        width: 400,
        height: 250,
      },
    });

    docContent.push(
      new Paragraph({
        children: [],
        pageBreakBefore: false, // Sin salto, sigue en la misma página
      }),

      new Paragraph({ children: [imageRun], alignment: AlignmentType.CENTER }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Fachada del riesgo",
            size: 20,
            font: "Arial",
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
} else {
    console.warn('⚠️ No se pudo obtener la imagen del riesgo para insertar en el Word');
  }
} catch (error) {
  console.error('❌ Error al procesar imagen del riesgo para Word:', error);
  // Continuar sin la imagen en lugar de fallar todo el documento
}

      
    

    docContent.push(
      new Paragraph({ children: [], pageBreakBefore: true }),
      linea("Señores"),
      linea(aseguradora, true),
      linea(`Ciudad: ${formData.ciudad_siniestro}`),
      linea(""),
      linea("REF: INFORME DE INSPECCIÓN", true),
      linea(`ASEGURADO: ${nombreCliente}`),
      linea(`PREDIO INSPECCIONADO: ${direccion}`),
      linea(`FECHA DE INSPECCIÓN: ${fechaFormateada}`),
      linea(""),
      linea("Apreciados Señores:"),
      linea("Tomando como base la asignación de inspección que nos fuera oficializada, estamos adjuntando el informe único y confidencial de las labores realizadas en el Riesgo en referencia."),
      linea("Luego de analizar los diferentes aspectos relacionados con el estado actual del predio, así como las protecciones existentes contra posibles eventos como incendio, hurto, entre otros; se afirma que el riesgo SE PUEDE SUSCRIBIR. No obstante, se deben cumplir las recomendaciones para el mejoramiento del riesgo y prevención de emergencias."),
      linea("Estamos a su disposición para aclarar cualquier inquietud que tengan al respecto y agradecemos la confianza depositada en nuestros servicios profesionales para este caso."),
      linea(""),
      linea("Cordialmente,"),
      linea(""),
      linea("ARNALDO TAPIA GUTIERREZ"),
      linea("Gerente")

    );
docContent.push(
  new Paragraph({ children: [], pageBreakBefore: true }),
  new Paragraph({
    text: "Tabla de Contenido",
    hyperlink: true,
    headingStyleRange: "1-3",
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 300 },
    alignment: AlignmentType.LEFT,
  }),
  new Paragraph({ text: "", spacing: { after: 300 } }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("REF")], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph(": INFORME DE INSPECCIÓN")], width: { size: 75, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "2", alignment: AlignmentType.RIGHT })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        ],
      }),
          ...[
            ["1.", "INFORMACIÓN GENERAL", "8"],
            ["2.", "DESCRIPCIÓN GENERAL DE LA EMPRESA", "8"],
            ["3.", "INFRAESTRUCTURA", "11"],
            ["4.", "PROCESOS", "12"],
            ["5.", "LINDEROS", "13"],
            ["6.", "MAQUINARIA, EQUIPOS Y MANTENIMIENTO", "13"],
            ["7.", "SERVICIOS INDUSTRIALES", "15"],
            ["8.", "PROTECCIONES CONTRA INCENDIOS", "16"], // 👉 Aquí está la corrección
            ["9.", "SEGURIDAD", "17"],
            ["10.", "SINIESTRALIDAD", "18"],
            ["11.", "RECOMENDACIONES", "19"],
            ["12.", "REGISTRO FOTOGRÁFICO", "21"]
          ].map(([ref, titulo, pagina]) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(ref)] }),
                new TableCell({ children: [new Paragraph(titulo)] }),
                new TableCell({ children: [new Paragraph({ text: pagina, alignment: AlignmentType.RIGHT })] }),
              ],
            })
          ),
        ],
      })
    );
    

    const riesgos = [
      "Incendio/Explosión",
      "Amit",
      "Anegación",
      "Daños por agua",
      "Terremoto",
      "Sustracción",
      "Rotura de maquinaria",
      "Responsabilidad civil"
    ];
    
    docContent.push(
      new Paragraph({ children: [], pageBreakBefore: true }),
      seccion("ANÁLISIS DE RIESGOS"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [encabezadoTabla("RIESGO"), encabezadoTabla("ANÁLISIS")],
          }),
          ...Object.entries(analisisRiesgos).map(([riesgo, valor]) =>
            new TableRow({
              children: [celdaTexto(riesgo), celdaTexto(valor || "")],
            })
          ),
        ],
      })
    );
    
    

// Tabla de Calificación del Riesgo e Índice de Vulnerabilidad
docContent.push(
  new Paragraph({ children: [], pageBreakBefore: true }),
  new Paragraph({
    text: "CLASIFICACIÓN DE RIESGOS",
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 300 },
  }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Riesgo"),
          encabezadoTabla("Probabilidad"),
          encabezadoTabla("Severidad"),
          encabezadoTabla("Clasificación"),
        ],
      }),
      ...tablaRiesgos.map((riesgo, i) =>
        new TableRow({
          children: [
            celdaTexto([
              "Incendio/Explosión",
              "AMIT",
              "Anegación",
              "Terremoto",
              "Sustracción",
              "Rotura de maquinaria",
              "Responsabilidad Civil",
            ][i]),
            celdaTexto(String(riesgo.probabilidad)),
            celdaTexto(String(riesgo.severidad)),
            celdaTexto(riesgo.clasificacion),
          ],
        })
      ),
    ],
  })
);

// Segunda tabla: tabla calculada R y % Vulnerabilidad
docContent.push(
 // new Paragraph({ children: [], pageBreakBefore: true }),
  new Paragraph({
    text: "CALIFICACIÓN DEL RIESGO (R) E ÍNDICE DE VULNERABILIDAD (%)",
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 300 },
  }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Riesgo"),
          encabezadoTabla("Probabilidad"),
          encabezadoTabla("Severidad"),
          encabezadoTabla("R = P × S"),
          encabezadoTabla("Índice de Vulnerabilidad %"),
          encabezadoTabla("Clasificación"),
        ],
      }),
      ...tablaRiesgos.map((riesgo, i) => {
        const p = parseInt(riesgo.probabilidad) || 0;
        const s = parseInt(riesgo.severidad) || 0;
        const r = p * s;
        const vulnerabilidad = Math.round((r / 25) * 100);
        const clasificacion =
          r <= 4 ? "Bajo" :
          r <= 8 ? "Medio" :
          r <= 12 ? "Alto" : "Extremo";

        return new TableRow({
          children: [
            celdaTexto([
              "Incendio/Explosión",
              "AMIT",
              "Anegación",
              "Terremoto",
              "Sustracción",
              "Rotura de maquinaria",
              "Responsabilidad Civil",
            ][i]),
            celdaTexto(String(p)),
            celdaTexto(String(s)),
            celdaTexto(String(r)),
            celdaTexto(`${vulnerabilidad}%`),
            celdaTexto(clasificacion),
          ],
        });
      }),
    ],
  })
);

docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }),
  new Paragraph({
    text: "MATRIZ DE CALOR DE RIESGOS",
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 300 },
  }),

  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Encabezado de Severidad
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("")] }), // Celda vacía para esquina
          ...["INSIGNIFICANTE (1)", "MENOR (2)", "MODERADO (3)", "MAYOR (4)", "CATASTRÓFICO (5)"].map((label) =>
            new TableCell({
              children: [new Paragraph({ text: label, bold: true })],
              shading: { fill: "D9D9D9" },
            })
          ),
        ],
      }),

      // Filas de Probabilidad (Frecuente a Improbable)
      ...[5, 4, 3, 2, 1].map((pValue, rowIndex) => {
        const probLabels = ["FRECUENTE (5)", "POSIBLE (4)", "PROBABLE (3)", "BAJA (2)", "IMPROBABLE (1)"];

        return new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: probLabels[rowIndex], bold: true })],
                shading: { fill: "D9D9D9" },
              }),
              ...[1, 2, 3, 4, 5].map((sValue) => {
                const riesgoEncontrado = tablaRiesgos.find(
                  (r) => parseInt(r.probabilidad) === pValue && parseInt(r.severidad) === sValue
                );

                const R = pValue * sValue;
                const porcentaje = Math.round((R / 25) * 100);
                const textoRiesgo = riesgoEncontrado ? riesgoEncontrado.riesgo || "" : "";

                return new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: `${R}`, bold: true }),
                        new TextRun({ text: ` (${porcentaje}%)` }),
                        textoRiesgo ? new TextRun({ text: `\n${textoRiesgo}` }) : undefined,
                      ].filter(Boolean), // Solo mete runs válidos
                      spacing: { after: 0 }, // IMPORTANTE: no deja espacio extra
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  shading: { fill: getCellColor(R) },
                });
              }),
            ],
          });

      }),
    ],
  })
);


docContent.push(
  new Paragraph({ children: [], spacing: { after: 100 } }), // pequeño espacio, no salto
  seccion("1. INFORMACIÓN GENERAL"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Nombre de la Empresa"),
          celdaTexto(nombreEmpresa),
          encabezadoTabla("Barrio"),
          celdaTexto(barrio),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Dirección"),
          celdaTexto(direccion),
          encabezadoTabla("Departamento"),
          celdaTexto(departamento),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Ciudad"),
          celdaTexto(municipios)
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Cargo"),
          celdaTexto(cargo),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph("")] }),
        ],
      }),
            new TableRow({
        children: [
          encabezadoTabla("Horario Laboral"),
          celdaTexto(horarioLaboral),
          encabezadoTabla("Persona Entrevistada"),
          celdaTexto(personaEntrevistada),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Numero de Colaboradores"),
          celdaTexto(colaboladores),
          new TableCell({ children: [new Paragraph("")] }),
          new TableCell({ children: [new Paragraph("")] }),
        ],
      }),
    ],
  })
);


    


   
docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }), 
  seccion("2. DESCRIPCIÓN GENERAL DE LA EMPRESA"),
  linea(descripcionEmpresa || "No se ingresó información.")
);


docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }), 
  seccion("3. INFRAESTRUCTURA"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Antigüedad"),
          celdaTexto(antiguedad),
          encabezadoTabla("Área Lote"),
          celdaTexto(areaLote),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Área Construida"),
          celdaTexto(areaConstruida),
          encabezadoTabla("Nº de Edificios"),
          celdaTexto(numeroEdificios),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Nº de Pisos"),
          celdaTexto(numeroPisos),
          encabezadoTabla("Sótanos"),
          celdaTexto(sotanos),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Propio o Arrendado"),
          celdaTexto(tenencia),
          new TableCell({ children: [] }),
          new TableCell({ children: [] }),
        ],
      }),
    ],
  }),
  new Paragraph({ spacing: { after: 200 } }),
  linea("Descripción:"),
  linea(descripcionInfraestructura || "No se ingresó información.")
 );


 docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }), 
  seccion("4. PROCESOS"),
  linea(procesos || "No se ingresó información.")
);


docContent.push(
  seccion("5. LINDEROS"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("NORTE"),
          celdaTexto(linderoNorte || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("SUR"),
          celdaTexto(linderoSur || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("ORIENTE"),
          celdaTexto(linderoOriente || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("OCCIDENTE"),
          celdaTexto(linderoOccidente || ""),
        ],
      }),
    ],
  })
);

    // ✅ Bloque para insertar MAPA - Generación automática desde coordenadas
  try {
    let mapaBuffer = null;
    let mapaInsertado = false;
    
    // Primero intentar usar imagen del mapa si existe (captura manual previa)
    if (imagenMapa) {
try {
        // Verificar si es base64
        if (typeof imagenMapa === 'string' && imagenMapa.startsWith('data:image')) {
          const base64Data = imagenMapa.split(',')[1] || imagenMapa;
          mapaBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
} else if (typeof imagenMapa === 'string' && imagenMapa.startsWith('blob:')) {
          const response = await fetch(imagenMapa);
          mapaBuffer = await response.arrayBuffer();
} else if (typeof imagenMapa === 'string' && imagenMapa.startsWith('http')) {
          const response = await fetch(imagenMapa);
          mapaBuffer = await response.arrayBuffer();
}
        
        if (mapaBuffer) {
          const mapaImage = new ImageRun({
            data: mapaBuffer,
            transformation: {
              width: 500,
              height: 300,
            },
          });

          docContent.push(
            new Paragraph({ text: "", spacing: { after: 300 } }), 
            seccion("MAPA DE UBICACIÓN"),
            new Paragraph({ children: [mapaImage], alignment: AlignmentType.CENTER }),
            linea("Coordenadas: " + (formData.coordenadasRiesgo || "No disponibles")),
            linea("Dirección: " + (formData.direccionRiesgo || "No especificada"))
          );
          
          mapaInsertado = true;
}
      } catch (error) {
        console.warn('⚠️ Error al procesar imagen del mapa capturada:', error);
      }
    }
    
    // Si no hay imagen capturada, generar mapa estático automáticamente desde coordenadas
    if (!mapaInsertado && formData.coordenadasRiesgo) {
try {
        // Parsear coordenadas (formato: "lat, lng" o "lat,lng")
        const coordsStr = formData.coordenadasRiesgo.trim();
        const coordsMatch = coordsStr.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        
        if (coordsMatch) {
          const lat = parseFloat(coordsMatch[1]);
          const lng = parseFloat(coordsMatch[2]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            // Usar OpenStreetMap Static API (gratuita, sin API key)
            // Alternativa sin API key usando OpenStreetMap (más simple)
            // Usar una API de mapas estáticos gratuita
            const osmStaticUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=500x300&markers=${lat},${lng},red-pushpin`;
            
            try {
const response = await fetch(osmStaticUrl);
              
              if (response.ok) {
                mapaBuffer = await response.arrayBuffer();
                
                const mapaImage = new ImageRun({
                  data: mapaBuffer,
                  transformation: {
                    width: 500,
                    height: 300,
                  },
                });

                docContent.push(
                  new Paragraph({ text: "", spacing: { after: 300 } }), 
                  seccion("MAPA DE UBICACIÓN"),
                  new Paragraph({ children: [mapaImage], alignment: AlignmentType.CENTER }),
                  linea("Coordenadas: " + formData.coordenadasRiesgo),
                  linea("Dirección: " + (formData.direccionRiesgo || "No especificada"))
                );
                
                mapaInsertado = true;
} else {
                throw new Error('No se pudo descargar el mapa estático');
              }
            } catch (fetchError) {
              console.warn('⚠️ Error al descargar mapa estático:', fetchError);
              // Continuar con el fallback
            }
          }
        }
      } catch (parseError) {
        console.warn('⚠️ Error al parsear coordenadas:', parseError);
      }
    }
    
    // Si aún no se insertó el mapa, mostrar mensaje informativo
    if (!mapaInsertado) {
      console.warn('⚠️ No se pudo generar el mapa automáticamente');
      docContent.push(
        new Paragraph({ text: "", spacing: { after: 300 } }), 
        seccion("MAPA DE UBICACIÓN"),
        linea("📍 Ubicación del Riesgo"),
        linea("Coordenadas: " + (formData.coordenadasRiesgo || "No disponibles")),
        linea("Dirección: " + (formData.direccionRiesgo || "No especificada")),
        linea(""),
        linea("Nota: Para ver el mapa visual, consulte la aplicación web")
      );
    }
  } catch (error) {
    console.error("❌ Error general en el bloque del mapa:", error);
    docContent.push(
      new Paragraph({ text: "", spacing: { after: 300 } }), 
      seccion("MAPA DE UBICACIÓN"),
      linea("📍 Ubicación del Riesgo"),
      linea("Coordenadas: " + (formData.coordenadasRiesgo || "No disponibles")),
      linea("Dirección: " + (formData.direccionRiesgo || "No especificada"))
    );
  }

  const rows = [
    filaDoble("PROVEEDOR", energiaProveedor),
    filaDoble("TENSIÓN", energiaTension),
    encabezadoTabla("TRANSFORMADORES"),
    new TableRow({
      children: [
        celdaTexto("N° Subestación"),
        celdaTexto("Marca"),
        celdaTexto("Tipo"),
        celdaTexto("Capacidad"),
        celdaTexto("Edad"),
        celdaTexto("Relación de voltaje"),
      ],
    }),
    ...transformadores.map(transformador => 
    new TableRow({
      children: [
          celdaTexto(transformador.subestacion || ""),
          celdaTexto(transformador.marca || ""),
          celdaTexto(transformador.tipo || ""),
          celdaTexto(transformador.capacidad || ""),
          celdaTexto(transformador.edad || ""),
          celdaTexto(transformador.relacionVoltaje || ""),
      ],
      })
    ),
    encabezadoTabla("PLANTAS ELÉCTRICAS"),
    new TableRow({
      children: [
        celdaTexto("Número"),
        celdaTexto("Marca"),
        celdaTexto("Tipo"),
        celdaTexto("Capacidad"),
        celdaTexto("Edad"),
        celdaTexto("Transferencia"),
        celdaTexto("Voltaje"),
        celdaTexto("Cobertura"),
      ],
    }),
    new TableRow({
      children: [
        celdaTexto(plantaNumero1),
        celdaTexto(plantaMarca1),
        celdaTexto(plantaTipo1),
        celdaTexto(plantaCapacidad1),
        celdaTexto(plantaEdad1),
        celdaTexto(plantaTransferencia1),
        celdaTexto(plantaVoltaje1),
        celdaTexto(plantaCobertura1),
      ],
    }),
    new TableRow({
      children: [
        celdaTexto(plantaNumero2),
        celdaTexto(plantaMarca2),
        celdaTexto(plantaTipo2),
        celdaTexto(plantaCapacidad2),
        celdaTexto(plantaEdad2),
        celdaTexto(plantaTransferencia2),
        celdaTexto(plantaVoltaje2),
        celdaTexto(plantaCobertura2),
      ],
    }),
    filaDoble("PARARRAYOS", energiaPararrayos),
    filaDoble("COMENTARIOS", energiaComentarios),
  ];

  docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }), 
  seccion("6. MAQUINARIA, EQUIPOS Y MANTENIMIENTO"),
  linea(maquinariaDescripcion || "No se ingresó información.")
);

docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }), // Espacio antes
  new Paragraph({
    text: "INVENTARIO DE EQUIPOS ELÉCTRICOS Y ELECTRÓNICOS",
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 300 },
  })
);

  const calcularValorEquipo = (eq = {}) => {
    const cantidad = parseFloat(eq.cantidad) || 0;
    const valorUnitario = parseFloat(eq.valorUnitario ?? eq.precio) || 0;
    return cantidad * valorUnitario;
  };

  datosEquipos.forEach((area) => {
  docContent.push(
    new Paragraph({
      
      text: `${area.nombre} (Subtotal: $${area.equipos.reduce((sum, eq) => sum + calcularValorEquipo(eq), 0).toLocaleString('es-CO')})`,
      heading: HeadingLevel.HEADING_3,
      spacing: { after: 200 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("CANT"),
            encabezadoTabla("EQUIPO"),
            encabezadoTabla("MARCA"),
            encabezadoTabla("VALOR UNITARIO"),
            encabezadoTabla("VALOR"),
            encabezadoTabla("CAPACIDAD"),
            encabezadoTabla("APARIENCIA"),
          ],
        }),
        ...area.equipos.map(eq =>
          new TableRow({
            children: [
              celdaTexto(String(eq.cantidad)),
              celdaTexto(eq.equipo),
              celdaTexto(eq.marca),
              celdaTexto(`$${Number(eq.valorUnitario ?? eq.precio ?? 0).toLocaleString('es-CO')}`),
              celdaTexto(`$${Number(calcularValorEquipo(eq)).toLocaleString('es-CO')}`),
              celdaTexto(eq.capacidad),
              celdaTexto(eq.apariencia),
            ],
          })
        )
      ],
    })
  );
});
docContent.push(
  new Paragraph({
    text: `TOTAL VALOR ESTIMADO: $${datosEquipos.reduce(
      (sum, area) => sum + area.equipos.reduce((s, eq) => s + calcularValorEquipo(eq), 0),
      0
    ).toLocaleString('es-CO')}`,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 300 },
  })
);

  


// SERVICIOS INDUSTRIALES
docContent.push(
  seccion("7. SERVICIOS INDUSTRIALES"),

  // Tabla con proveedor y tensión (título 25%, valor 75%)
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: "PROVEEDOR", bold: true })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: energiaProveedor || "" })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: "TENSIÓN", bold: true })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: energiaTension || "" })],
          }),
        ],
      }),
    ],
  }),

  // TRANSFORMADORES
  new Paragraph({
    text: "TRANSFORMADORES",
    bold: true,
    spacing: { before: 200, after: 100 },
  }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celdaTexto("N° Subestación", true),
          celdaTexto("Marca", true),
          celdaTexto("Tipo", true),
          celdaTexto("Capacidad", true),
          celdaTexto("Edad", true),
          celdaTexto("Relación de voltaje", true),
        ],
      }),
      ...transformadores.map(transformador => 
      new TableRow({
        children: [
            celdaTexto(transformador.subestacion || ""),
            celdaTexto(transformador.marca || ""),
            celdaTexto(transformador.tipo || ""),
            celdaTexto(transformador.capacidad || ""),
            celdaTexto(transformador.edad || ""),
            celdaTexto(transformador.relacionVoltaje || ""),
        ],
        })
      ),
    ],
  }),

  // PLANTAS ELÉCTRICAS
  new Paragraph({
    text: "PLANTAS ELÉCTRICAS",
    bold: true,
    spacing: { before: 200, after: 100 },
  }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celdaTexto("Número", true),
          celdaTexto("Marca", true),
          celdaTexto("Tipo", true),
          celdaTexto("Capacidad", true),
          celdaTexto("Edad", true),
          celdaTexto("Transferencia", true),
          celdaTexto("Voltaje", true),
          celdaTexto("Cobertura", true),
        ],
      }),
      new TableRow({
        children: [
          celdaTexto(plantaNumero1),
          celdaTexto(plantaMarca1),
          celdaTexto(plantaTipo1),
          celdaTexto(plantaCapacidad1),
          celdaTexto(plantaEdad1),
          celdaTexto(plantaTransferencia1),
          celdaTexto(plantaVoltaje1),
          celdaTexto(plantaCobertura1),
        ],
      }),
      new TableRow({
        children: [
          celdaTexto(plantaNumero2),
          celdaTexto(plantaMarca2),
          celdaTexto(plantaTipo2),
          celdaTexto(plantaCapacidad2),
          celdaTexto(plantaEdad2),
          celdaTexto(plantaTransferencia2),
          celdaTexto(plantaVoltaje2),
          celdaTexto(plantaCobertura2),
        ],
      }),
    ],
  }),

  // PARARRAYOS Y COMENTARIOS
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celdaTexto("Pararrayos", true),
          new TableCell({
            columnSpan: 7,
            children: [new Paragraph(energiaPararrayos || "")],
          }),
        ],
      }),
      new TableRow({
        children: [
          celdaTexto("Comentarios", true),
          new TableCell({
            columnSpan: 7,
            children: [new Paragraph(energiaComentarios || "")],
          }),
        ],
      }),
    ],
  })
);


  

  

docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }),
  seccion("SISTEMA DE AGUA"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Fuente"),
          encabezadoTabla("Uso"),
          encabezadoTabla("Almacenamiento"),
          encabezadoTabla("Equipo de Bombeo"),
        ],
      }),
      new TableRow({
        children: [
          celdaTexto(aguaFuente),
          celdaTexto(aguaUso),
          celdaTexto(aguaAlmacenamiento),
          celdaTexto(aguaBombeo),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Comentarios"),
          new TableCell({
            columnSpan: 3,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: aguaComentarios || "",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
);

docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }),
  seccion("8. PROTECCIONES CONTRA INCENDIOS"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      filaDoble("EXTINTOR", extintor),
      filaDoble("RED CONTRAINCENDIO", rci),
      filaDoble("SISTEMA DE ROCIADORES", rociadores),
      filaDoble("DETECCIÓN DE INCENDIOS", deteccion),
      filaDoble("ALARMAS DE INCENDIO", alarmas),
      filaDoble("BRIGADAS DE EMERGENCIA", brigadas),
      filaDoble("BOMBEROS", bomberos),
    ],
  })
);


//Seguridad

docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }),
  seccion("9. SEGURIDAD"),

  // SEGURIDAD ELECTRÓNICA
  new Paragraph({
    text: "Seguridad Electrónica",
    bold: true,
    spacing: { after: 100 },
  }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [encabezadoTabla("Alarma Monitoreada"), celdaTexto(alarmaMonitoreada)],
      }),
      new TableRow({
        children: [encabezadoTabla("CCTV (cámaras, monitoreo)"), celdaTexto(cctv)],
      }),
      new TableRow({
        children: [encabezadoTabla("Mantenimiento"), celdaTexto(mantenimientoSeguridad)],
      }),
      new TableRow({
        children: [encabezadoTabla("Comentarios"), celdaTexto(comentariosSeguridadElectronica)],
      }),
    ],
  }),

  // SEGURIDAD FÍSICA
  new Paragraph({
    text: "Seguridad Física",
    bold: true,
    spacing: { before: 300, after: 100 },
  }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [encabezadoTabla("Tipo de Vigilancia"), celdaTexto(tipoVigilancia)],
      }),
      new TableRow({
        children: [encabezadoTabla("Horarios, turnos, dotación"), celdaTexto(horariosVigilancia)],
      }),
      new TableRow({
        children: [encabezadoTabla("Accesos"), celdaTexto(accesos)],
      }),
      new TableRow({
        children: [encabezadoTabla("Personal de cierre y apertura"), celdaTexto(personalCierre)],
      }),
      new TableRow({
        children: [encabezadoTabla("Cerramiento del predio"), celdaTexto(cerramientoPredio)],
      }),
      new TableRow({
        children: [encabezadoTabla("Otros (rejas, concertina, etc)"), celdaTexto(otrosCerramiento)],
      }),
      new TableRow({
        children: [encabezadoTabla("Comentarios"), celdaTexto(comentariosSeguridadFisica)],
      }),
    ],
  })
);


docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }),
  seccion("10. SINIESTRALIDAD"),
  linea(siniestralidad || "No se reportaron siniestros.")
);

//Recomendaciones 

docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }),
  seccion("11. RECOMENDACIONES"),
  linea(recomendaciones || "No se reportaron recomendaciones.")
);

  
  
if (imagenesRegistro.length > 0) {
  // Título de la sección
  docContent.push(seccion("12. REGISTRO FOTOGRÁFICO"));

  // Aquí se guardarán las filas de la tabla
  const filas = [];

  // Recorre las imágenes de a 2 por fila
  for (let i = 0; i < imagenesRegistro.length; i += 2) {
    const celdasImagen = [];
    const celdasDescripcion = [];

    for (let j = i; j < i + 2 && j < imagenesRegistro.length; j++) {
      const img = imagenesRegistro[j];
      let imagenBuffer = null;
      
      try {
        // Intentar obtener la imagen desde diferentes fuentes
        if (img && img.file && typeof img.file.arrayBuffer === "function") {
          // Si es un File object
          imagenBuffer = await img.file.arrayBuffer();
} else if (img && img.base64) {
          // Si tiene base64
          const base64Data = img.base64.split(',')[1] || img.base64;
          imagenBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
} else if (img && img.preview && typeof img.preview === 'string' && img.preview.startsWith('data:image')) {
          // Si tiene preview como base64
          const base64Data = img.preview.split(',')[1] || img.preview;
          imagenBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
} else if (img && img.ruta) {
          // Si tiene ruta del servidor, intentar cargarla
          try {
            const imagenUrl = img.ruta.startsWith('http') 
              ? img.ruta 
              : `${window.location.origin}${img.ruta}`;
            const response = await fetch(imagenUrl);
            if (response.ok) {
              imagenBuffer = await response.arrayBuffer();
}
          } catch (fetchError) {
            console.error('❌ Error al cargar imagen desde servidor:', fetchError);
          }
        }
        
        if (imagenBuffer) {
          celdasImagen.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imagenBuffer,
                      transformation: { width: 250, height: 150 },
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
          );
          celdasDescripcion.push(
            new TableCell({
              children: [
                new Paragraph({
                  text: img.descripcion || "",
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
          );
        } else {
          console.warn('⚠️ No se pudo obtener imagen del registro:', img);
          celdasImagen.push(new TableCell({ children: [new Paragraph("")] }));
          celdasDescripcion.push(new TableCell({ children: [new Paragraph("")] }));
        }
      } catch (error) {
        console.error('❌ Error procesando imagen del registro:', error);
        celdasImagen.push(new TableCell({ children: [new Paragraph("")] }));
        celdasDescripcion.push(new TableCell({ children: [new Paragraph("")] }));
      }
    }

    // Agrega la fila de imágenes y la de descripciones
    filas.push(new TableRow({ children: celdasImagen }));
    filas.push(new TableRow({ children: celdasDescripcion }));
  }

  // Agrega la tabla al documento, con un salto de página antes de la sección
  docContent.push(
    new Paragraph({ text: "", spacing: { after: 300 }, pageBreakBefore: true }),
    new Table({ rows: filas }),
    new Paragraph({ text: "", spacing: { after: 300 } })
  );
}


  
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: "Arial",
          size: 24,
        },
        paragraph: {
          alignment: AlignmentType.JUSTIFIED,
        },
      },
    },
  },
  sections: [
    {
headers: {
  default: new Header({
    children: [
      // ENCABEZADO ORGANIZADO CON TABLA Y LOGO (copiado de FormularioAjuste)
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
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
                        text: "INFORME DE INSPECCIÓN DE RIESGOS",
                        font: 'Arial',
                        size: 24,
                        bold: true,
                        color: "000000"
                      })
                    ],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 100 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cargo || "INSPECTOR",
                        font: 'Arial',
                        size: 18,
                        color: "000000"
                      })
                    ],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 100 }
                  }),
                  // Tabla para riesgo, riesgo y fecha
                  new Table({
                    width: {
                      size: 100,
                      type: WidthType.PERCENTAGE,
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: `RIESGO: ${colaboladores || 'RIU-ISA-001'}`,
                                    font: 'Arial',
                                    size: 14,
                                    color: "000000"
                                  })
                                ],
                                alignment: AlignmentType.LEFT
                              })
                            ],
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: `RIESGO: 1`,
                                    font: 'Arial',
                                    size: 14,
                                    color: "000000"
                                  })
                                ],
                                alignment: AlignmentType.LEFT
                              })
                            ],
                            margins: { top: 100, bottom: 100, left: 100, right: 100 }
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: `FECHA: ${fechaFormateada}`,
                                    font: 'Arial',
                                    size: 14,
                                    color: "000000"
                                  })
                                ],
                                alignment: AlignmentType.LEFT
                              })
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

      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Página ",
                  font: "Arial",
                  size: 20,
                }),
                new SimpleField("PAGE"),
                new TextRun({
                  text: " de ",
                  font: "Arial",
                  size: 20,
                }),
                new SimpleField("NUMPAGES"),
              ],
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
saveAs(blob, `Inspeccion_${nombreCliente || "cliente"}.docx`);
  };
  


L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

// Función para convertir archivo a base64
const convertirImagenABase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const handleGuardarEnHistorial = async () => {
  // Obtener información del usuario del localStorage
  const nombre = localStorage.getItem('nombre') || 'Usuario';
  const login = localStorage.getItem('login') || 'ID';

  // Convertir imagen de portada a base64 si existe
  let imagenBase64 = null;
  if (imagen) {
    try {
      imagenBase64 = await convertirImagenABase64(imagen);
    } catch (error) {
      console.error('❌ Error convirtiendo imagen a base64:', error);
    }
  } else if (preview) {
    // Si no hay archivo pero hay preview, usar el preview (ya es base64)
    imagenBase64 = preview;
  }

  const datos = {
    tipo: 'inspeccion',
    titulo: `Inspección - ${nombreCliente || 'Cliente'} - ${formData.ciudad_siniestro || 'Ciudad'}`,
    usuario: nombre,
    userId: login,
    estado: 'en_proceso',
    datos: {
      numeroActa: nombreCliente || "N/A",
      fechaInspeccion: fecha,
      horaInspeccion: obtenerHoraActualColombia(),
      ciudad: formData.ciudad_siniestro,
      aseguradora: formData.aseguradora,
      sucursal: "N/A",
      asegurado: nombreCliente,
      tipoMaquinaria: "N/A",
      marca: "N/A",
      modelo: "N/A",
      serie: "N/A",
      ano: "N/A",
      estadoGeneral: "N/A",
      tipoProteccion: "N/A",
      observaciones: recomendaciones,
      recomendaciones: recomendaciones,
      firmanteInspector: cargo,
      codigoInspector: colaboladores,
      direccion: formData.direccion,
      departamento: formData.departamento_siniestro,
      descripcionEmpresa: descripcionEmpresa,
      infraestructura: infraestructura,
      analisisRiesgos: analisisRiesgos,
      antiguedad: antiguedad,
      areaLote: areaLote,
      areaConstruida: areaConstruida,
      numeroEdificios: numeroEdificios,
      numeroPisos: numeroEdificios,
      sotanos: sotanos,
      tenencia: tenencia,
      descripcionInfraestructura: descripcionInfraestructura,
      procesos: procesos,
      areas: areas,
      datosEquipos: datosEquipos,
      linderoNorte: linderoNorte,
      linderoSur: linderoSur,
      linderoOriente: linderoOriente,
      linderoOccidente: linderoOccidente,
      energiaProveedor: energiaProveedor,
      energiaTension: energiaTension,
      energiaPararrayos: energiaPararrayos,
      transformadores: transformadores,
      alarmaMonitoreada: alarmaMonitoreada,
      cctv: cctv,
      mantenimientoSeguridad: mantenimientoSeguridad,
      comentariosSeguridadElectronica: comentariosSeguridadElectronica,
      tipoVigilancia: tipoVigilancia,
      horariosVigilancia: horariosVigilancia,
      accesos: accesos,
      personalCierre: personalCierre,
      cerramientoPredio: cerramientoPredio,
      otrosCerramiento: otrosCerramiento,
      comentariosSeguridadFisica: comentariosSeguridadFisica,
      plantasElectricas: plantasElectricas,
      energiaComentarios: energiaComentarios,
      transformadores: transformadores,
      plantaNumero1: plantaNumero1,
      plantaMarca1: plantaMarca1,
      plantaTipo1: plantaTipo1,
      plantaCapacidad1: plantaCapacidad1,
      plantaEdad1: plantaEdad1,
      plantaTransferencia1: plantaTransferencia1,
      plantaVoltaje1: plantaVoltaje1,
      plantaCobertura1: plantaCobertura1,
      plantaNumero2: plantaNumero2,
      plantaMarca2: plantaMarca2,
      plantaTipo2: plantaNumero2,
      plantaCapacidad2: plantaCapacidad2,
      plantaEdad2: plantaEdad2,
      plantaTransferencia2: plantaTransferencia2,
      plantaVoltaje2: plantaVoltaje2,
      plantaCobertura2: plantaCobertura2,
      aguaFuente: aguaFuente,
      aguaUso: aguaUso,
      aguaAlmacenamiento: aguaAlmacenamiento,
      aguaBombeo: aguaBombeo,
      aguaComentarios: aguaComentarios,
      extintor: extintor,
      rci: rci,
      rociadores: rociadores,
      deteccion: deteccion,
      alarmas: alarmas,
      brigadas: brigadas,
      bomberos: bomberos,
      seguridadDescripcion: seguridadDescripcion,
      siniestralidad: siniestralidad,
      maquinariaDescripcion: maquinariaDescripcion,
      tablaRiesgos: tablaRiesgos,
      barrio: barrio,
      horarioLaboral: horarioLaboral,
      nombreEmpresa: nombreEmpresa,
      municipio: municipio,
      personaEntrevistada: personaEntrevistada,
      imagen: imagenBase64,
      imagenesRegistro: imagenesRegistro,
    }
  };

const resultado = await guardarEnHistorial(datos, 'en_proceso');
alert(resultado.message);
};

const handleExportar = async () => {
  try {
    // Obtener información del usuario del localStorage
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const login = localStorage.getItem('login') || 'ID';

    // Convertir imagen de portada a base64 si existe
    let imagenBase64 = null;
    if (imagen) {
      try {
        imagenBase64 = await convertirImagenABase64(imagen);
      } catch (error) {
        console.error('❌ Error convirtiendo imagen a base64 (exportar):', error);
      }
    } else if (preview) {
      // Si no hay archivo pero hay preview, usar el preview (ya es base64)
      imagenBase64 = preview;
    }

    const datos = {
      tipo: 'inspeccion',
      titulo: `Inspección - ${nombreCliente || 'Cliente'} - ${formData.ciudad_siniestro || 'Ciudad'}`,
      usuario: nombre,
      userId: login,
      estado: 'completado',
      datos: {
        numeroActa: nombreCliente || "N/A",
        fechaInspeccion: fecha,
        horaInspeccion: obtenerHoraActualColombia(),
        ciudad: formData.ciudad_siniestro,
        aseguradora: formData.aseguradora,
        sucursal: "N/A",
        asegurado: nombreCliente,
        tipoMaquinaria: "N/A",
        marca: "N/A",
        modelo: "N/A",
        serie: "N/A",
        ano: "N/A",
        estadoGeneral: "N/A",
        tipoProteccion: "N/A",
        observaciones: recomendaciones,
        recomendaciones: recomendaciones,
        firmanteInspector: cargo,
        codigoInspector: colaboladores,
        direccion: formData.direccion,
        departamento: formData.departamento_siniestro,
        descripcionEmpresa: descripcionEmpresa,
        infraestructura: infraestructura,
        analisisRiesgos: analisisRiesgos,
        antiguedad: antiguedad,
        areaLote: areaLote,
        areaConstruida: areaConstruida,
        numeroEdificios: numeroEdificios,
        numeroPisos: numeroEdificios,
        sotanos: sotanos,
        tenencia: tenencia,
        descripcionInfraestructura: descripcionInfraestructura,
        procesos: procesos,
        areas: areas,
        datosEquipos: datosEquipos,
        linderoNorte: linderoNorte,
        linderoSur: linderoSur,
        linderoOriente: linderoOriente,
        linderoOccidente: linderoOccidente,
        energiaProveedor: energiaProveedor,
        energiaTension: energiaTension,
        energiaPararrayos: energiaPararrayos,
        transformadores: transformadores,
        alarmaMonitoreada: alarmaMonitoreada,
        cctv: cctv,
        mantenimientoSeguridad: mantenimientoSeguridad,
        comentariosSeguridadElectronica: comentariosSeguridadElectronica,
        tipoVigilancia: tipoVigilancia,
        horariosVigilancia: horariosVigilancia,
        accesos: accesos,
        personalCierre: personalCierre,
        cerramientoPredio: cerramientoPredio,
        otrosCerramiento: otrosCerramiento,
        comentariosSeguridadFisica: comentariosSeguridadFisica,
        plantasElectricas: plantasElectricas,
        energiaComentarios: energiaComentarios,
        plantaNumero1: plantaNumero1,
        plantaMarca1: plantaMarca1,
        plantaTipo1: plantaTipo1,
        plantaCapacidad1: plantaCapacidad1,
        plantaEdad1: plantaEdad1,
        plantaTransferencia1: plantaTransferencia1,
        plantaVoltaje1: plantaVoltaje1,
        plantaCobertura1: plantaCobertura1,
        plantaNumero2: plantaNumero2,
        plantaMarca2: plantaMarca2,
        plantaTipo2: plantaNumero2,
        plantaCapacidad2: plantaCapacidad2,
        plantaEdad2: plantaEdad2,
        plantaTransferencia2: plantaTransferencia2,
        plantaVoltaje2: plantaVoltaje2,
        plantaCobertura2: plantaCobertura2,
        aguaFuente: aguaFuente,
        aguaUso: aguaUso,
        aguaAlmacenamiento: aguaAlmacenamiento,
        aguaBombeo: aguaBombeo,
        aguaComentarios: aguaComentarios,
        extintor: extintor,
        rci: rci,
        rociadores: rociadores,
        deteccion: deteccion,
        alarmas: alarmas,
        brigadas: brigadas,
        bomberos: bomberos,
        seguridadDescripcion: seguridadDescripcion,
        siniestralidad: siniestralidad,
        maquinariaDescripcion: maquinariaDescripcion,
        tablaRiesgos: tablaRiesgos,
        barrio: barrio,
        horarioLaboral: horarioLaboral,
        nombreEmpresa: nombreEmpresa,
        municipio: municipio,
        personaEntrevistada: personaEntrevistada,
        imagen: imagenBase64,
        imagenesRegistro: imagenesRegistro,
      }
    };

// Primero exportar el documento
    await generarWord();

    // Luego guardar en el historial como completado
    const resultado = await guardarEnHistorial(datos, 'completado');
alert(resultado.message);
    
  } catch (error) {
    console.error('Error en exportación:', error);
    alert(`❌ Error en la exportación: ${error.message}`);
  }
};

// Funciones para el mapa avanzado
const handleInputChange = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

const handleMapaChange = (mapaData) => {
setImagenMapa(mapaData.imagen);
  
  // Actualizar coordenadas en formData
  if (mapaData.coordenadas) {
    setFormData(prev => ({
      ...prev,
      coordenadasRiesgo: `${mapaData.coordenadas.lat}, ${mapaData.coordenadas.lng}`
    }));
  }
  
  // Actualizar dirección si está disponible
  if (mapaData.direccion) {
    setFormData(prev => ({
      ...prev,
      direccionRiesgo: mapaData.direccion
    }));
  }
};

// Efecto para detectar modo edición y cargar datos
useEffect(() => {
  if (id) {
    setModoEdicion(true);
    setCargando(true);
    cargarDatosFormulario(id);
  }
}, [id]);

// Efecto para monitorear cambios en los estados principales cuando se cargan datos
useEffect(() => {
  // Este efecto se mantiene para asegurar que los estados se actualicen correctamente
}, [modoEdicion, cargando, nombreCliente, formData, fecha, barrio, departamento, horarioLaboral, cargo, colaboladores, nombreEmpresa, direccion, municipio, personaEntrevistada, descripcionEmpresa, infraestructura]);

// Función para cargar datos del formulario existente
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
      
      // Cargar todos los campos del formulario
      const nombreClienteValue = formulario.datos?.asegurado || formulario.datos?.nombreCliente || '';
      setNombreCliente(nombreClienteValue);
      
      const formDataValue = {
        ciudad_siniestro: formulario.datos?.ciudad || '',
        departamento_siniestro: formulario.datos?.departamento || '',
        aseguradora: formulario.datos?.aseguradora || '',
        direccion: formulario.datos?.direccion || '',
        // ✅ CRÍTICO: Cargar coordenadas y dirección del riesgo para el mapa
        coordenadasRiesgo: formulario.datos?.coordenadasRiesgo || formulario.datos?.coordenadas || '',
        direccionRiesgo: formulario.datos?.direccionRiesgo || formulario.datos?.direccion || '',
        ciudad: formulario.datos?.ciudad || formulario.datos?.ciudad_siniestro || '',
        departamento: formulario.datos?.departamento || formulario.datos?.departamento_siniestro || ''
      };
      setFormData(prev => ({
        ...prev,
        ...formDataValue
      }));
      
      const fechaValue = formulario.datos?.fechaInspeccion || new Date().toISOString().split("T")[0];
      setFecha(fechaValue);
      
      const barrioValue = formulario.datos?.barrio || '';
      setBarrio(barrioValue);
      
      const departamentoValue = formulario.datos?.departamento || '';
      setDepartamento(departamentoValue);
      
      const horarioLaboralValue = formulario.datos?.horarioLaboral || '';
      setHorarioLaboral(horarioLaboralValue);
      
      const cargoValue = formulario.datos?.firmanteInspector || '';
      setCargo(cargoValue);
      
      const colaboladoresValue = formulario.datos?.codigoInspector || '';
      setColaboladores(colaboladoresValue);
      
      const nombreEmpresaValue = formulario.datos?.nombreEmpresa || '';
      setNombreEmpresa(nombreEmpresaValue);
      
      const direccionValue = formulario.datos?.direccion || '';
      setDireccion(direccionValue);
      
      const municipioValue = formulario.datos?.municipio || '';
      setMunicipio(municipioValue);
      
      const personaEntrevistadaValue = formulario.datos?.personaEntrevistada || '';
      setPersonaEntrevistada(personaEntrevistadaValue);
      
      const descripcionEmpresaValue = formulario.datos?.descripcionEmpresa || '';
      setDescripcionEmpresa(descripcionEmpresaValue);
      
      const infraestructuraValue = formulario.datos?.infraestructura || '';
      setInfraestructura(infraestructuraValue);
      
      // Análisis de riesgos
      if (formulario.datos?.analisisRiesgos) {
        setAnalisisRiesgos(formulario.datos.analisisRiesgos);
      }
      
      // Infraestructura
      setAntiguedad(formulario.datos?.antiguedad || '');
      setAreaLote(formulario.datos?.areaLote || '');
      setAreaConstruida(formulario.datos?.areaConstruida || '');
      setNumeroEdificios(formulario.datos?.numeroEdificios || '');
      setNumeroPisos(formulario.datos?.numeroPisos || '');
      setSotanos(formulario.datos?.sotanos || '');
      setTenencia(formulario.datos?.tenencia || '');
      setDescripcionInfraestructura(formulario.datos?.descripcionInfraestructura || '');
      
      // Procesos y áreas
      setProcesos(formulario.datos?.procesos || '');
      if (formulario.datos?.areas) {
        setAreas(formulario.datos.areas);
      }
      if (formulario.datos?.datosEquipos) {
        setDatosEquipos(formulario.datos.datosEquipos);
      }
      
      // Linderos
      setLinderoNorte(formulario.datos?.linderoNorte || '');
      setLinderoSur(formulario.datos?.linderoSur || '');
      setLinderoOriente(formulario.datos?.linderoOriente || '');
      setLinderoOccidente(formulario.datos?.linderoOccidente || '');
      
      // Servicios industriales
      setEnergiaProveedor(formulario.datos?.energiaProveedor || '');
      setEnergiaTension(formulario.datos?.energiaTension || '');
      setEnergiaPararrayos(formulario.datos?.energiaPararrayos || '');
      // Transformadores - manejar formato nuevo (array) y antiguo (campos individuales)
      if (formulario.datos?.transformadores && Array.isArray(formulario.datos.transformadores)) {
        // Formato nuevo: array de transformadores
        setTransformadores(formulario.datos.transformadores);
      } else if (formulario.datos?.transformadorSubestacion || formulario.datos?.transformadorMarca) {
        // Formato antiguo: campos individuales, convertir a array
        setTransformadores([{
          id: Date.now(),
          subestacion: formulario.datos?.transformadorSubestacion || '',
          marca: formulario.datos?.transformadorMarca || '',
          tipo: formulario.datos?.transformadorTipo || '',
          capacidad: formulario.datos?.transformadorCapacidad || '',
          edad: formulario.datos?.transformadorEdad || '',
          relacionVoltaje: formulario.datos?.transformadorRelacionVoltaje || ''
        }]);
      }
      
      // Seguridad electrónica
      setAlarmaMonitoreada(formulario.datos?.alarmaMonitoreada || '');
      setCctv(formulario.datos?.cctv || '');
      setMantenimientoSeguridad(formulario.datos?.mantenimientoSeguridad || '');
      setComentariosSeguridadElectronica(formulario.datos?.comentariosSeguridadElectronica || '');
      
      // Seguridad física
      setTipoVigilancia(formulario.datos?.tipoVigilancia || '');
      setHorariosVigilancia(formulario.datos?.horariosVigilancia || '');
      setAccesos(formulario.datos?.accesos || '');
      setPersonalCierre(formulario.datos?.personalCierre || '');
      setCerramientoPredio(formulario.datos?.cerramientoPredio || '');
      setOtrosCerramiento(formulario.datos?.otrosCerramiento || '');
      setComentariosSeguridadFisica(formulario.datos?.comentariosSeguridadFisica || '');
      
      // Plantas eléctricas
      if (formulario.datos?.plantasElectricas) {
        setPlantasElectricas(formulario.datos.plantasElectricas);
      }
      setEnergiaComentarios(formulario.datos?.energiaComentarios || '');
      
      // Plantas eléctricas individuales
      setPlantaNumero1(formulario.datos?.plantaNumero1 || '');
      setPlantaMarca1(formulario.datos?.plantaMarca1 || '');
      setPlantaTipo1(formulario.datos?.plantaTipo1 || '');
      setPlantaCapacidad1(formulario.datos?.plantaCapacidad1 || '');
      setPlantaEdad1(formulario.datos?.plantaEdad1 || '');
      setPlantaTransferencia1(formulario.datos?.plantaTransferencia1 || '');
      setPlantaVoltaje1(formulario.datos?.plantaVoltaje1 || '');
      setPlantaCobertura1(formulario.datos?.plantaCobertura1 || '');
      
      setPlantaNumero2(formulario.datos?.plantaNumero2 || '');
      setPlantaMarca2(formulario.datos?.plantaMarca2 || '');
      setPlantaTipo2(formulario.datos?.plantaTipo2 || '');
      setPlantaCapacidad2(formulario.datos?.plantaCapacidad2 || '');
      setPlantaEdad2(formulario.datos?.plantaEdad2 || '');
      setPlantaTransferencia2(formulario.datos?.plantaTransferencia2 || '');
      setPlantaVoltaje2(formulario.datos?.plantaVoltaje2 || '');
      setPlantaCobertura2(formulario.datos?.plantaCobertura2 || '');
      
      // Sistema de agua
      setAguaFuente(formulario.datos?.aguaFuente || '');
      setAguaUso(formulario.datos?.aguaUso || '');
      setAguaAlmacenamiento(formulario.datos?.aguaAlmacenamiento || '');
      setAguaBombeo(formulario.datos?.aguaBombeo || '');
      setAguaComentarios(formulario.datos?.aguaComentarios || '');
      
      // Protección contra incendios
      setExtintor(formulario.datos?.extintor || '');
      setRci(formulario.datos?.rci || '');
      setRociadores(formulario.datos?.rociadores || '');
      setDeteccion(formulario.datos?.deteccion || '');
      setAlarmas(formulario.datos?.alarmas || '');
      setBrigadas(formulario.datos?.brigadas || '');
      setBomberos(formulario.datos?.bomberos || '');
      
      // Seguridad y siniestralidad
      setSeguridadDescripcion(formulario.datos?.seguridadDescripcion || '');
      setSiniestralidad(formulario.datos?.siniestralidad || '');
      setMaquinariaDescripcion(formulario.datos?.maquinariaDescripcion || '');
      
      // Tabla de riesgos
      if (formulario.datos?.tablaRiesgos) {
        setTablaRiesgos(formulario.datos.tablaRiesgos);
      }
      
      // Recomendaciones
      setRecomendaciones(formulario.datos?.recomendaciones || '');
      
      // Imágenes (si existen)
      if (formulario.datos?.imagen) {
        // Si la imagen viene como base64, convertirla a preview
        if (typeof formulario.datos.imagen === 'string' && formulario.datos.imagen.startsWith('data:')) {
          setImagen(null); // No tenemos el archivo original
          setPreview(formulario.datos.imagen); // Usar el base64 como preview
        } else if (formulario.datos.imagen && typeof formulario.datos.imagen === 'object') {
          // Si viene como objeto con base64
          if (formulario.datos.imagen.base64) {
            setImagen(null);
            setPreview(formulario.datos.imagen.base64);
          } else if (formulario.datos.imagen.file) {
            setImagen(null);
            setPreview(formulario.datos.imagen.file);
          }
        }
      }
      
      // Procesar imágenes de registro si existen
      if (formulario.datos?.imagenesRegistro && Array.isArray(formulario.datos.imagenesRegistro)) {
const baseURL = BASE_URL;

        const imagenesProcesadas = await Promise.all(
          formulario.datos.imagenesRegistro.map(async (img, index) => {
            // Si tiene ruta (archivo en servidor), cargar desde servidor
            if (img && typeof img === 'object' && img.ruta) {
              try {
                // Convertir ruta a URL completa
                const imagenUrl = img.ruta.startsWith('http') 
                  ? img.ruta 
                  : `${baseURL}${img.ruta}`;
                
                // Cargar imagen como base64 para preview
                const response = await fetch(imagenUrl);
                if (response.ok) {
                  const blob = await response.blob();
                  const reader = new FileReader();
                  const base64 = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                  
                  return {
                    ...img,
                    ruta: img.ruta,
                    preview: base64,
                    base64: base64, // Para compatibilidad
                    descripcion: img.descripcion || ''
                  };
                } else {
                  console.warn(`⚠️ No se pudo cargar imagen desde ${imagenUrl} (status: ${response.status})`);
                  // Mantener la ruta para que se use como fallback en getImageUrl
                  return {
                    ...img,
                    ruta: img.ruta, // Mantener ruta para fallback
                    preview: null,
                    base64: null,
                    descripcion: img.descripcion || ''
                  };
                }
              } catch (error) {
                console.error(`❌ Error cargando imagen ${img.ruta}:`, error);
                // Mantener la ruta para que se use como fallback en getImageUrl
                return {
                  ...img,
                  ruta: img.ruta, // Mantener ruta para fallback
                  preview: null,
                  base64: null,
                  descripcion: img.descripcion || '',
                  errorCarga: error.message
                };
              }
            }
            // Compatibilidad con formato legacy (base64 directo)
            else if (img && typeof img === 'object') {
              return {
                ...img,
                preview: img.preview || img.base64 || (typeof img.file === 'string' ? img.file : null),
                base64: img.base64 || (typeof img.file === 'string' ? img.file : null) || img.preview,
                file: typeof img.file === 'string' && img.file.startsWith('data:') ? null : img.file || null,
                descripcion: img.descripcion || ''
              };
            }
            // Si es un string base64 directo (caso legacy)
            else if (typeof img === 'string' && img.startsWith('data:')) {
              return {
                preview: img,
                base64: img,
                file: null,
                descripcion: ''
              };
            }
            return img;
          })
        );
        
setImagenesRegistro(imagenesProcesadas);
      } else {
        setImagenesRegistro([]);
      }
      
}
  } catch (error) {
    console.error('❌ Error cargando formulario:', error);
    alert(`Error cargando formulario: ${error.message}`);
  } finally {
    setCargando(false);
  }
};

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
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
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

      {/* Indicador de carga */}
      {cargando && (
        <div 
          className="mb-6 p-4 rounded-lg"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
            border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}`
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="animate-spin rounded-full h-6 w-6 border-b-2"
              style={{ borderColor: theme === 'dark' ? '#60A5FA' : '#2563EB' }}
            ></div>
            <span 
              className="font-medium"
              style={{ color: theme === 'dark' ? '#93C5FD' : '#1E40AF' }}
            >
              Cargando formulario existente...
            </span>
          </div>
        </div>
      )}

      {/* Información Cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div>
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Nombre del Cliente / Empresa
          </label>
          <input
            type="text"
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            className="w-full rounded px-2 sm:px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Ej: LADRILLERA CASABLANCA S.A.S."
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Dirección
          </label>
          <input
            type="text"
            value={formData.direccion}
            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
            className="w-full rounded px-2 sm:px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Dirección"
            disabled={cargando}
          />
        </div>
      </div>

      
      
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div>
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Ciudad
          </label>
          <Select
            options={municipios}
            value={(() => {
              if (!formData.ciudad_siniestro) return null;
              
              // Si es un objeto, usarlo directamente
              if (typeof formData.ciudad_siniestro === 'object' && formData.ciudad_siniestro !== null) {
                return formData.ciudad_siniestro;
              }
              
              // Si es string, buscar en las opciones
              const ciudadStr = String(formData.ciudad_siniestro);
              
              // Buscar por value exacto
              let encontrada = municipios.find(opt => opt.value === ciudadStr);
              
              // Si no se encuentra, buscar por label
              if (!encontrada) {
                encontrada = municipios.find(opt => 
                  opt.label === ciudadStr || 
                  opt.label.includes(ciudadStr) ||
                  opt.value === ciudadStr
                );
              }
              
              // Si aún no se encuentra, buscar por coincidencia parcial en el label
              if (!encontrada) {
                encontrada = municipios.find(opt => 
                  opt.label.toLowerCase().includes(ciudadStr.toLowerCase()) ||
                  opt.value.toLowerCase() === ciudadStr.toLowerCase()
                );
              }
              
              return encontrada || null;
            })()}
            onChange={handleCiudadChange}
            placeholder="Selecciona una ciudad..."
            isSearchable
            className="w-full"
            isDisabled={cargando}
            styles={{
              control: (provided, state) => ({
                ...provided,
                fontSize: '14px',
                minHeight: '40px',
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                '&:hover': {
                  borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                }
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
              singleValue: (provided) => ({
                ...provided,
                color: textPrimary
              }),
              placeholder: (provided) => ({
                ...provided,
                color: textSecondary
              }),
              menu: (provided) => ({
                ...provided,
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`
              })
            }}
          />
        </div>

        <div>
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Aseguradora
          </label>
          <select
            name="aseguradora"
            value={formData.aseguradora}
            onChange={e =>
              setFormData({ ...formData, aseguradora: e.target.value })
            }
            className="w-full rounded px-2 sm:px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Selecciona una aseguradora</option>
    <option value="ALIANZ SEGURO S.A.">ALIANZ SEGURO S.A.</option>
    <option value="ASEGURADORA SOLIDARIA DE COLOMBIA">ASEGURADORA SOLIDARIA DE COLOMBIA</option>
    <option value="AXA COLPATRIA SEGUROS S.A.">AXA COLPATRIA SEGUROS S.A.</option>
    <option value="BBVA SEGUROS COLOMBIA S.A.">BBVA SEGUROS COLOMBIA S.A.</option>
    <option value="CD ASESORES DE SEGUROS">CD ASESORES DE SEGUROS</option>
    <option value="CORPORACION DE VOLQUETEROS CORPORAVOL">CORPORACION DE VOLQUETEROS CORPORAVOL</option>
    <option value="CRAWFORD COLOMBIA S.A.S.">CRAWFORD COLOMBIA S.A.S.</option>
    <option value="ECOEQUIPOS COLOMBIA S.A.S">ECOEQUIPOS COLOMBIA S.A.S</option>
    <option value="EGON SEGUROS LTDA">EGON SEGUROS LTDA</option>
    <option value="EUROSEGUROS SU AGENCIA LTDA">EUROSEGUROS SU AGENCIA LTDA</option>
    <option value="ITAÚ CORREDOR DE SEGUROS">ITAÚ CORREDOR DE SEGUROS</option>
    <option value="JANNA SEGUROS LTDA.">JANNA SEGUROS LTDA.</option>
    <option value="LA EQUIDAD SEGUROS">LA EQUIDAD SEGUROS</option>
    <option value="LA PREVISORA S.A.">LA PREVISORA S.A.</option>
    <option value="LIBERTY SEGUROS S.A.">LIBERTY SEGUROS S.A.</option>
    <option value="MAPFRE SEGUROS GENERALES DE COLOMBIA S.A.">MAPFRE SEGUROS GENERALES DE COLOMBIA S.A.</option>
    <option value="MCA SEGUROS INTEGRLES LTDA">MCA SEGUROS INTEGRLES LTDA</option>
    <option value="PROSER AJUSTES SAS">PROSER AJUSTES SAS</option>
    <option value="SBS SEGUROS COLOMBIA S.A.">SBS SEGUROS COLOMBIA S.A.</option>
    <option value="SEGUROS ALFA S.A.">SEGUROS ALFA S.A.</option>
    <option value="SEGUROS BOLÍVAR">SEGUROS BOLÍVAR</option>
    <option value="SEGUROS CONFIANZA S.A.">SEGUROS CONFIANZA S.A.</option>
    <option value="SEGUROS DEL ESTADO">SEGUROS DEL ESTADO</option>
    <option value="SEGUROS GENERALES SURAMERICANA S.A.">SEGUROS GENERALES SURAMERICANA S.A.</option>
    <option value="UNISEG RIESGOS Y SEGUROS">UNISEG RIESGOS Y SEGUROS</option>
    <option value="ZÚRICH COLOMBIA SEGUROS S.A.">ZÚRICH COLOMBIA SEGUROS S.A.</option>
          </select>
        </div>
      </div>

      {/* Fotografía del Riesgo */}
      <div className="mb-6">
        <label 
          className="block text-xs sm:text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          Subir Fotografía del Riesgo
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImagenChange}
          className="mb-2 w-full text-xs sm:text-sm"
          style={{
            color: textPrimary
          }}
          disabled={cargando}
        />
        {preview && (
          <div className="mt-2">
          <img
            src={preview}
            alt="Vista previa"
            className="max-w-[400px] max-h-[250px] mx-auto rounded object-contain"
            style={{
              border: `1px solid ${borderColor}`
            }}
          />
            <p 
              className="text-sm text-center mt-1"
              style={{ color: textSecondary }}
            >
              Fachada del riesgo
            </p>
          </div>
        )}
      </div>

      {/* Carta de presentación */}
      <div 
        className="p-4 rounded mb-6 text-sm leading-relaxed"
        style={{
          backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
          border: `1px solid ${borderColor}`,
          color: textPrimary
        }}
      >
        <p>
          Ciudad: {
            typeof formData.ciudad_siniestro === "object" && formData.ciudad_siniestro !== null
              ? formData.ciudad_siniestro.label
              : (typeof formData.ciudad_siniestro === "string"
                  ? formData.ciudad_siniestro
                  : "_________")
          }'
        </p>
                <br />
        <p>Señores</p>
        <p><strong>{aseguradora}</strong></p>
        <p>
          Ciudad: {
            typeof formData.ciudad_siniestro === "object" && formData.ciudad_siniestro !== null
              ? formData.ciudad_siniestro.label
              : (typeof formData.ciudad_siniestro === "string"
                  ? formData.ciudad_siniestro
                  : "_________")
          }
        </p>        <br />
        <p><strong>REF&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: INFORME DE INSPECCIÓN</strong></p>
        <p>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ASEGURADO: {nombreCliente}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;PREDIO INSPECCIONADO: {direccion}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FECHA DE INSPECCIÓN:{" "}
          {formatearFechaInspeccion(fecha)}
        </p>
        
        <br />
        <p>Apreciados Señores:</p>
        <p>
          Tomando como base la asignación de inspección que nos fuera oficializada, estamos adjuntando el informe único y confidencial de las labores realizadas en el Riesgo en referencia.
        </p>
        <p>
          Luego de analizar los diferentes aspectos relacionados con el estado actual del predio, así como las protecciones existentes contra posibles eventos como incendio, hurto, entre otros; se afirma que el riesgo <strong>SE PUEDE SUSCRIBIR</strong>. No obstante, se deben cumplir las recomendaciones para el mejoramiento del riesgo y prevención de emergencias.
        </p>
        <p>
          Estamos a su disposición para aclarar cualquier inquietud que tengan al respecto y agradecemos la confianza depositada en nuestros servicios profesionales para este caso.
        </p>
        <br />
        <p>Cordialmente,</p>
        <br />
        <p><strong>ARNALDO TAPIA GUTIERREZ</strong><br />Gerente</p>
      </div>




      <div 
        className="mt-10 pt-6"
        style={{ borderTop: `1px solid ${borderColor}` }}
      >
        <h2 
          className="text-xl font-bold mb-4"
          style={{ color: theme === 'dark' ? '#60A5FA' : '#1E40AF' }}
        >
          Tabla de Contenido
        </h2>
        <div className="overflow-x-auto mb-6">
          <table 
            className="w-full text-sm"
            style={{
              border: `1px solid ${borderColor}`
            }}
          >
            <thead>
              <tr 
                className="text-left"
                style={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB'
                }}
              >
                <th 
                  className="px-3 py-1 font-bold"
                  style={{
                    border: `1px solid ${borderColor}`,
                    color: textPrimary
                  }}
                >
                  REF
                </th>
                <th 
                  className="px-3 py-1 font-bold"
                  style={{
                    border: `1px solid ${borderColor}`,
                    color: textPrimary
                  }}
                >
                  : INFORME DE INSPECCIÓN
                </th>
                <th 
                  className="px-3 py-1 text-right"
                  style={{
                    border: `1px solid ${borderColor}`,
                    color: textPrimary
                  }}
                >
                  2
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1.", "INFORMACIÓN GENERAL", "8"],
                ["2.", "DESCRIPCIÓN GENERAL DE LA EMPRESA", "8"],
                ["3.", "INFRAESTRUCTURA", "11"],
                ["4.", "PROCESOS", "12"],
                ["5.", "LINDEROS", "13"],
                ["6.", "MAQUINARIA, EQUIPOS Y MANTENIMIENTO", "13"],
                ["7.", "SERVICIOS INDUSTRIALES", "15"],
                ["8.", "PROTECCIONES CONTRA INCENDIOS", "16"],
                ["9.", "SEGURIDAD", "17"],
                ["10.", "SINIESTRALIDAD", "18"],
                ["11.", "RECOMENDACIONES", "19"],
                ["12.", "REGISTRO FOTOGRÁFICO", "21"]
              ].map(([num, title, page], idx) => (
                <tr 
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 
                      ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                      : (theme === 'dark' ? '#1F1F1F' : '#F9FAFB')
                  }}
                >
                  <td 
                    className="px-3 py-1"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary
                    }}
                  >
                    {num}
                  </td>
                  <td 
                    className="px-3 py-1"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary
                    }}
                  >
                    {title}
                  </td>
                  <td 
                    className="px-3 py-1 text-right"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary
                    }}
                  >
                    {page}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>




    {/* Tabla de Análisis de Riesgos */}
<div className="overflow-x-auto mb-6">
<h2 
  className="text-lg font-semibold mb-2 italic"
  style={{ color: textPrimary }}
>
  ANÁLISIS DE RIESGOS
</h2>
<table 
  className="w-full text-sm"
  style={{
    border: `1px solid ${borderColor}`
  }}
>
<thead 
  style={{
    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#D1D5DB'
  }}
>
  <tr>
    <th 
      className="px-2 py-1 w-1/4 text-left"
      style={{
        border: `1px solid ${borderColor}`,
        color: textPrimary
      }}
    >
      RIESGO
    </th>
    <th 
      className="px-2 py-1 text-left"
      style={{
        border: `1px solid ${borderColor}`,
        color: textPrimary
      }}
    >
      ANÁLISIS
    </th>
  </tr>
</thead>
<tbody>
  {[
    "Incendio/Explosión",
    "Amit",
    "Anegación",
    "Daños por agua",
    "Terremoto",
    "Sustracción",
    "Rotura de maquinaria",
    "Responsabilidad civil"
  ].map((riesgo, index) => (
    <tr 
      key={index}
      style={{
        backgroundColor: index % 2 === 0 
          ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
          : (theme === 'dark' ? '#1F1F1F' : '#F9FAFB')
      }}
    >
      <td 
        className="px-2 py-1 font-semibold"
        style={{
          border: `1px solid ${borderColor}`,
          color: textPrimary
        }}
      >
        {riesgo}
      </td>
      <td 
        className="px-2 py-1"
        style={{
          border: `1px solid ${borderColor}`
        }}
      >
      <textarea
  rows={4}
  className="w-full p-1 rounded resize-y"
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  placeholder={`Escribe el análisis para ${riesgo.toLowerCase()}...`}
  value={analisisRiesgos[riesgo]}
  onChange={(e) =>
    setAnalisisRiesgos({ ...analisisRiesgos, [riesgo]: e.target.value })
  }
  disabled={cargando}
/>

      </td>
    </tr>
  ))}
</tbody>
</table>

</div>


<div 
  className="mt-10 text-sm text-justify leading-relaxed"
  style={{ color: textPrimary }}
>
<p className="mb-4">
  Para la calificación de los riesgos amparados en la póliza, se han ubicado para el informe las diferentes amenazas en una matriz formada por la Probabilidad que se presente en determinado evento, la Severidad o gravedad de los efectos que se producen por la realización de dicho evento, donde el Riesgo es igual a la Probabilidad X Severidad.
</p>

<h2 className="font-bold text-lg mb-2">Probabilidad:</h2>
<ul className="list-disc pl-6 mb-4">
  <li><strong>Muy Baja (Improbable):</strong> Virtualmente imposible, solo podrá producirse en condiciones excepcionales. = (1)</li>
  <li><strong>Baja:</strong> Imaginable pero poco posible, ya ha ocurrido en otra parte. Este evento podría producirse en algún momento. = (2)</li>
  <li><strong>Moderada (Probable):</strong> Poco habitual. Ha ocurrido o puede ocurrir aquí. Este evento debería ocurrir en algún momento. = (3) </li>
  <li><strong>Alta (Posible):</strong> Muy posible, con gran probabilidad de ocurrencia, este evento se producirá probablemente en la mayoría de las circunstancias. = (4)</li>
  <li><strong>Muy Alta (Frecuente):</strong> Muy probable, de alta probabilidad de ocurrencia, se espera que ocurra en la mayoría de las circunstancias. = (5)</li>
</ul>

<h2 className="font-bold text-lg mb-2">Severidad:</h2>
<ul className="list-disc pl-6 mb-4">
  <li><strong>Insignificante:</strong> Consecuencias pequeñas, no afecta el desarrollo normal de la empresa.= (1)</li>
  <li><strong>Menor:</strong> Consecuencias medianas, pueden exigir control leve. = (2)</li>
  <li><strong>Moderada:</strong> Consecuencias altas, deben tomarse medidas. = (3)</li>
  <li><strong>Mayor:</strong> Consecuencias importantes, se deben establecer medidas de emergencia. = (4)</li>
  <li><strong>Catastrófica:</strong> Pérdidas enormes, podría implicar el cierre de la empresa. = (5)</li>
</ul>

<h2 
  className="font-bold text-lg mb-3"
  style={{ color: textPrimary }}
>
  Clasificación de Riesgos
</h2>
<table 
  className="w-full text-sm text-left"
  style={{
    border: `1px solid ${borderColor}`
  }}
>
<thead 
  style={{
    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#D1D5DB'
  }}
>
  <tr>
    <th 
      className="px-2 py-1"
      style={{
        border: `1px solid ${borderColor}`,
        color: textPrimary
      }}
    >
      Riesgo
    </th>
    <th 
      className="px-2 py-1"
      style={{
        border: `1px solid ${borderColor}`,
        color: textPrimary
      }}
    >
      Probabilidad
    </th>
    <th 
      className="px-2 py-1"
      style={{
        border: `1px solid ${borderColor}`,
        color: textPrimary
      }}
    >
      Severidad
    </th>
    <th 
      className="px-2 py-1"
      style={{
        border: `1px solid ${borderColor}`,
        color: textPrimary
      }}
    >
      Clasificación
    </th>
  </tr>
</thead>
<tbody>
  {[
    "Incendio/Explosión",
    "AMIT",
    "Anegación",
    "Terremoto",
    "Sustracción",
    "Rotura de maquinaria",
    "Responsabilidad Civil"
  ].map((riesgo, idx) => (
    <tr 
      key={idx}
      style={{
        backgroundColor: idx % 2 === 0 
          ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
          : (theme === 'dark' ? '#1F1F1F' : '#F9FAFB')
      }}
    >
      <td 
        className="px-2 py-1 font-semibold"
        style={{
          border: `1px solid ${borderColor}`,
          color: textPrimary
        }}
      >
        {riesgo}
      </td>
      <td 
        className="px-2 py-1"
        style={{
          border: `1px solid ${borderColor}`
        }}
      >
        <input
          type="text"
          value={tablaRiesgos[idx]?.probabilidad || ""}
          onChange={(e) => actualizarRiesgo(idx, "probabilidad", e.target.value)}
          className="w-full px-1 py-0.5 text-sm"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          disabled={cargando}
        />
      </td>
      <td 
        className="px-2 py-1"
        style={{
          border: `1px solid ${borderColor}`
        }}
      >
        <input
          type="text"
          value={tablaRiesgos[idx]?.severidad || ""}
          onChange={(e) => actualizarRiesgo(idx, "severidad", e.target.value)}
          className="w-full px-1 py-0.5 text-sm"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          disabled={cargando}
        />
      </td>
      <td 
        className="px-2 py-1"
        style={{
          border: `1px solid ${borderColor}`
        }}
      >
        <input
          type="text"
          value={tablaRiesgos[idx]?.clasificacion || ""}
          onChange={(e) => actualizarRiesgo(idx, "clasificacion", e.target.value)}
          className="w-full px-1 py-0.5 text-sm"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          disabled={cargando}
        />
      </td>
    </tr>
  ))}
</tbody>
</table>

</div>


{/*AQUI VA LA MATRIZ*/}
<div className="overflow-x-auto mb-6">
  <table 
    className="w-full text-sm"
    style={{
      border: `1px solid ${borderColor}`
    }}
  >
    <thead 
      style={{
        backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB'
      }}
    >
      <tr>
        <th 
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
            padding: '8px'
          }}
        >
          Riesgo
        </th>
        <th 
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
            padding: '8px'
          }}
        >
          Probabilidad
        </th>
        <th 
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
            padding: '8px'
          }}
        >
          Severidad
        </th>
        <th 
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
            padding: '8px'
          }}
        >
          R
        </th>
        <th 
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
            padding: '8px'
          }}
        >
          % Vulnerabilidad
        </th>
        <th 
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
            padding: '8px'
          }}
        >
          Clasificación
        </th>
      </tr>
    </thead>
    <tbody>
      {tablaRiesgos.map((item, i) => (
        <tr 
          key={i}
          style={{
            backgroundColor: i % 2 === 0 
              ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
              : (theme === 'dark' ? '#1F1F1F' : '#F9FAFB')
          }}
        >
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              color: textPrimary,
              padding: '8px'
            }}
          >
            {item.riesgo}
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input 
              type="number" 
              value={item.probabilidad} 
              onChange={e => actualizarRiesgo(i, "probabilidad", e.target.value)} 
              disabled={cargando}
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`,
                width: '100%',
                padding: '4px'
              }}
            />
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input 
              type="number" 
              value={item.severidad} 
              onChange={e => actualizarRiesgo(i, "severidad", e.target.value)} 
              disabled={cargando}
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`,
                width: '100%',
                padding: '4px'
              }}
            />
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              color: textPrimary,
              padding: '8px'
            }}
          >
            {item.r}
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              color: textPrimary,
              padding: '8px'
            }}
          >
            {item.indice}%
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              color: textPrimary,
              padding: '8px'
            }}
          >
            {item.clasificacion}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  <h2 
    className="text-xl font-bold mb-4 mt-8"
    style={{ color: textPrimary }}
  >
    Matriz de Calor (Visual)
  </h2>
  <MapaDeCalor tablaRiesgos={tablaRiesgos} />

</div>


{/* INFORME DE INSPECCIÓN - INFORMACIÓN GENERAL */}
 <div 
  className="mt-10 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
 >
 <h2 
  className="text-xl font-bold mb-4"
  style={{ color: textPrimary }}
 >
   1. INFORMACIÓN GENERAL
 </h2>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        Nombre de la Empresa
      </label>
      <input
        type="text"
        placeholder="Ej: Ladrillera Casablanca S.A.S."
        value={nombreEmpresa}
        onChange={(e) => setNombreEmpresa(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>
    <div>
      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        Dirección
      </label>
      <input
        type="text"
        placeholder="Ej: Km 8 vía El Zulia"
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    <div className="md:col-span-2">
        <label 
          className="block text-sm font-medium"
          style={{ color: textPrimary }}
        >
          Ciudad del Siniestro
        </label>
       <Select
            options={municipios}
            value={(() => {
              if (!formData.ciudad_siniestro) return null;
              
              // Si es un objeto, usarlo directamente
              if (typeof formData.ciudad_siniestro === 'object' && formData.ciudad_siniestro !== null) {
                return formData.ciudad_siniestro;
              }
              
              // Si es string, buscar en las opciones
              const ciudadStr = String(formData.ciudad_siniestro);
              
              // Buscar por value exacto
              let encontrada = municipios.find(opt => opt.value === ciudadStr);
              
              // Si no se encuentra, buscar por label
              if (!encontrada) {
                encontrada = municipios.find(opt => 
                  opt.label === ciudadStr || 
                  opt.label.includes(ciudadStr) ||
                  opt.value === ciudadStr
                );
              }
              
              // Si aún no se encuentra, buscar por coincidencia parcial en el label
              if (!encontrada) {
                encontrada = municipios.find(opt => 
                  opt.label.toLowerCase().includes(ciudadStr.toLowerCase()) ||
                  opt.value.toLowerCase() === ciudadStr.toLowerCase()
                );
              }
              
              return encontrada || null;
            })()}
            onChange={handleCiudadChange}
            placeholder="Selecciona una ciudad..."
            isSearchable
            className="w-full"
            styles={{
              control: (provided, state) => ({
                ...provided,
                fontSize: '14px',
                minHeight: '40px',
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                '&:hover': {
                  borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                }
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
                  : textPrimary,
                '&:active': {
                  backgroundColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                  color: '#FFFFFF'
                }
              }),
              singleValue: (provided) => ({
                ...provided,
                color: textPrimary
              }),
              placeholder: (provided) => ({
                ...provided,
                color: textSecondary
              }),
              menu: (provided) => ({
                ...provided,
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`,
                boxShadow: theme === 'dark' ? '0 4px 6px rgba(0, 0, 0, 0.5)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
              }),
              menuList: (provided) => ({
                ...provided,
                padding: 0
              }),
              input: (provided) => ({
                ...provided,
                color: textPrimary
              })
            }}
          />
      </div>
    <div>
      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        Persona Entrevistada
      </label>
      <input
        type="text"
        placeholder="Ej: Nelson Gómez"
        value={personaEntrevistada}
        onChange={(e) => setPersonaEntrevistada(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>
    <div>
      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        Barrio
      </label>
      <input
        type="text"
        placeholder="Ej: Vía El Zulia"
        value={barrio}
        onChange={(e) => setBarrio(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>
    <div>
      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        Departamento
      </label>
      <input
        type="text"
        placeholder="Ej: Norte de Santander"
        value={formData.departamento_siniestro}
        onChange={e => setFormData({ ...formData, departamento_siniestro: e.target.value })}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>
    <div>
      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        Cargo
      </label>
      <input
        type="text"
        placeholder="Ej: Jefe de mantenimiento"
        value={cargo}
        onChange={(e) => setCargo(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>
        <div>
      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        HORARIO LABORAL
      </label>
      <input
        type="text"
        placeholder="6AM - 5PM"
        value={horarioLaboral}
        onChange={(e) => setHorarioLaboral(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>
    <div>
      <label 
        className="block text-sm font-semibold mb-1"
        style={{ color: textPrimary }}
      >
        NÚMERO DE COLABOLADORES
      </label>
      <input
        type="text"
        placeholder="16"
        value={colaboladores}
        onChange={(e) => setColaboladores(e.target.value)}
        className="w-full rounded px-3 py-2"
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
</div>





{/* Secciones extensas como texto libre */}
<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
<h2 
  className="text-xl font-bold mb-4"
  style={{ color: textPrimary }}
>
  2. DESCRIPCIÓN GENERAL DE LA EMPRESA
</h2>
<textarea
  rows={6}
  placeholder="Agrega aquí la descripción general de la empresa..."
  value={descripcionEmpresa}
  onChange={(e) => setDescripcionEmpresa(e.target.value)}
  className="w-full rounded px-3 py-2"
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando}
></textarea>
</div>


{/* SECCIÓN INFRAESTRUCTURA */}
<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
<h2 
  className="text-xl font-bold mb-4"
  style={{ color: textPrimary }}
>
  3. INFRAESTRUCTURA
</h2>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label 
      className="block text-sm font-semibold mb-1"
      style={{ color: textPrimary }}
    >
      Antigüedad
    </label>
          <input
        type="text"
        placeholder="Ej: 76 años aprox"
        value={antiguedad}
        onChange={(e) => setAntiguedad(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
  </div>

  <div>
    <label 
      className="block text-sm font-semibold mb-1"
      style={{ color: textPrimary }}
    >
      Área Lote
    </label>
          <input
        type="text"
        placeholder="Ej: 450.000 m²"
        value={areaLote}
        onChange={(e) => setAreaLote(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
  </div>

  <div>
    <label 
      className="block text-sm font-semibold mb-1"
      style={{ color: textPrimary }}
    >
      Área Construida
    </label>
          <input
        type="text"
        placeholder="Ej: 35.000 m²"
        value={areaConstruida}
        onChange={(e) => setAreaConstruida(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
  </div>

  <div>
    <label 
      className="block text-sm font-semibold mb-1"
      style={{ color: textPrimary }}
    >
      Nº de Edificios
    </label>
          <input
        type="text"
        placeholder="Ej: 2"
        value={numeroEdificios}
        onChange={(e) => setNumeroEdificios(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
  </div>

  <div>
    <label 
      className="block text-sm font-semibold mb-1"
      style={{ color: textPrimary }}
    >
      Nº de Pisos
    </label>
          <input
        type="text"
        placeholder="Ej: 3"
        value={numeroPisos}
        onChange={(e) => setNumeroPisos(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
  </div>

  <div>
    <label 
      className="block text-sm font-semibold mb-1"
      style={{ color: textPrimary }}
    >
      Sótanos
    </label>
          <input
        type="text"
        placeholder="Ej: No"
        value={sotanos}
        onChange={(e) => setSotanos(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
  </div>

  <div>
    <label 
      className="block text-sm font-semibold mb-1"
      style={{ color: textPrimary }}
    >
      Propio o Arrendado
    </label>
          <input
        type="text"
        placeholder="Ej: Propio"
        value={tenencia}
        onChange={(e) => setTenencia(e.target.value)}
        className="w-full rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
  </div>

  <div className="md:col-span-2">
    <label 
      className="block text-sm font-semibold mb-1"
      style={{ color: textPrimary }}
    >
      Descripción
    </label>
    <textarea
      placeholder="Ej: Techo y cubierta..."
      rows={5}
      value={descripcionInfraestructura}
      onChange={(e) => setDescripcionInfraestructura(e.target.value)}
      className="w-full rounded px-3 py-2"
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
</div>



{/* SECCIÓN PROCESOS */}
<div 
  className="mt-10 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
  <h2 
    className="text-lg font-bold mb-4"
    style={{ color: textPrimary }}
  >
    4. PROCESOS
  </h2>
  <label 
    className="block text-sm font-semibold mb-2"
    style={{ color: textPrimary }}
  >
    Descripción de Procesos
  </label>
  <textarea
    placeholder="Ej: El proceso de fabricación de un ladrillo (bloque)..."
    value={procesos}
    onChange={(e) => setProcesos(e.target.value)}
    rows={5}
    className="w-full rounded px-3 py-2"
    style={{
      backgroundColor: inputBg,
      color: textPrimary,
      borderColor: borderColor,
      border: `1px solid ${borderColor}`
    }}
    disabled={cargando}
  />
</div>


{/* SECCIÓN LINDEROS */}
<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
<h2 
  className="text-xl font-bold mb-4"
  style={{ color: textPrimary }}
>
  5. LINDEROS
</h2>

<div className="grid grid-cols-2 gap-4 text-sm mb-6">
    <label 
      className="font-semibold" 
      htmlFor="norte"
      style={{ color: textPrimary }}
    >
      NORTE:
    </label>
    <input
      type="text"
      id="norte"
      value={linderoNorte}
      onChange={(e) => setLinderoNorte(e.target.value)}
      placeholder="Ej. Vía pública"
      className="px-2 py-1 rounded w-full"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
      disabled={cargando}
    />

    <label 
      className="font-semibold" 
      htmlFor="sur"
      style={{ color: textPrimary }}
    >
      SUR:
    </label>
    <input
      type="text"
      id="sur"
      value={linderoSur}
      onChange={(e) => setLinderoSur(e.target.value)}
      placeholder="Ej. Vía pública"
      className="px-2 py-1 rounded w-full"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
      disabled={cargando}
    />

    <label 
      className="font-semibold" 
      htmlFor="oriente"
      style={{ color: textPrimary }}
    >
      ORIENTE:
    </label>
    <input
      type="text"
      id="oriente"
      value={linderoOriente}
      onChange={(e) => setLinderoOriente(e.target.value)}
      placeholder="Ej. Lote Baldío"
      className="px-2 py-1 rounded w-full"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
      disabled={cargando}
    />

    <label 
      className="font-semibold" 
      htmlFor="occidente"
      style={{ color: textPrimary }}
    >
      OCCIDENTE:
    </label>
    <input
      type="text"
      id="occidente"
      value={linderoOccidente}
      onChange={(e) => setLinderoOccidente(e.target.value)}
      placeholder="Ej. Edificación"
      className="px-2 py-1 rounded w-full"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
      disabled={cargando}
    />
  </div>

{/* Mapa Google Earth */}
<div className="mt-4">
  <MapaGoogleEarth 
    coordenadasIniciales={formData.coordenadasRiesgo}
    direccionInicial={formData.direccionRiesgo}
    onMapReady={(map) => {
}}
    apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}
    onMapaChange={(datos) => {
      // Actualizar coordenadas en el formulario si es necesario
      if (datos.coordenadas) {
        handleInputChange('coordenadasRiesgo', datos.coordenadas);
      }
      if (datos.direccion) {
        handleInputChange('direccion', datos.direccion);
      }
      if (datos.imagenMapa) {
        // Guardar imagen del mapa para usar en el documento
        setImagenMapa(datos.imagenMapa);
      }
    }}
  />
</div>
</div>


{/* SECCIÓN MAQUINARIA */}
<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
<h2 
  className="text-xl font-bold mb-4"
  style={{ color: textPrimary }}
>
  6. MAQUINARIA, EQUIPOS Y MANTENIMIENTO
</h2>

<label 
  className="block text-sm font-semibold mb-1"
  style={{ color: textPrimary }}
>
  Descripción del Equipamiento
</label>
<textarea
  rows={8}
  placeholder="Ej: El predio inspeccionado cuenta con los siguientes equipos y maquinaria: 22 hornos tipo colmena, 4 extrusoras, 2 plantas eléctricas..."
  value={maquinariaDescripcion}
  onChange={(e) => setMaquinariaDescripcion(e.target.value)}
  className="w-full rounded px-3 py-2"
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando}
/>
</div>

<FormularioAreas onChange={(areas) => setDatosEquipos(areas)} />




<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
  <h2 
    className="text-xl font-bold mb-4"
    style={{ color: textPrimary }}
  >
    7. SERVICIOS INDUSTRIALES
  </h2>

  {/* Energía */}
  <div 
    className="p-4 rounded mb-8"
    style={{
      backgroundColor: theme === 'dark' ? '#1F1F1F' : '#FFFFFF',
      border: `1px solid ${borderColor}`,
      boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
    }}
  >
    <h2 
      className="text-lg font-bold italic mb-4"
      style={{ color: textPrimary }}
    >
      Energía
    </h2>

    <div className="mb-4">
      <label 
        className="font-semibold block mb-1"
        style={{ color: textPrimary }}
      >
        PROVEEDOR
      </label>
      <input
        type="text"
        value={energiaProveedor}
        onChange={(e) => setEnergiaProveedor(e.target.value)}
        placeholder="Ej: Centrales Eléctricas de Norte de Santander (CENS)."
        className="w-full rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    <div className="mb-4">
      <label 
        className="font-semibold block mb-1"
        style={{ color: textPrimary }}
      >
        TENSIÓN
      </label>
      <input
        type="text"
        value={energiaTension}
        onChange={(e) => setEnergiaTension(e.target.value)}
        placeholder="Ej: Alta tensión de la red pública (34,5Kv) y la entrega a 440v"
        className="w-full rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    {/* Transformadores */}
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">TRANSFORMADORES</h3>
        <button
          type="button"
          onClick={() => {
            setTransformadores([...transformadores, {
              id: Date.now(),
              subestacion: "",
              marca: "",
              tipo: "",
              capacidad: "",
              edad: "",
              relacionVoltaje: ""
            }]);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium flex items-center gap-1"
          disabled={cargando}
        >
          <span>+</span> Agregar Transformador
        </button>
      </div>
      
      {transformadores.map((transformador, index) => (
        <div 
          key={transformador.id} 
          className="mb-4 p-3 rounded-lg"
          style={{
            border: `1px solid ${borderColor}`,
            backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span 
              className="text-sm font-semibold"
              style={{ color: textPrimary }}
            >
              Transformador {index + 1}
            </span>
            {transformadores.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setTransformadores(transformadores.filter(t => t.id !== transformador.id));
                }}
                className="px-2 py-1 rounded text-xs"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#EF4444',
                  color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(220, 38, 38, 0.3)' : '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#EF4444';
                }}
                disabled={cargando}
              >
                Eliminar
              </button>
            )}
          </div>
   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Subestación"
              value={transformador.subestacion}
              onChange={(e) => {
                const nuevosTransformadores = [...transformadores];
                nuevosTransformadores[index].subestacion = e.target.value;
                setTransformadores(nuevosTransformadores);
              }}
        disabled={cargando}
      />
              <input
          className="rounded px-2 py-1"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Marca"
              value={transformador.marca}
              onChange={(e) => {
                const nuevosTransformadores = [...transformadores];
                nuevosTransformadores[index].marca = e.target.value;
                setTransformadores(nuevosTransformadores);
              }}
          disabled={cargando}
        />
              <input
          className="rounded px-2 py-1"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Tipo"
              value={transformador.tipo}
              onChange={(e) => {
                const nuevosTransformadores = [...transformadores];
                nuevosTransformadores[index].tipo = e.target.value;
                setTransformadores(nuevosTransformadores);
              }}
          disabled={cargando}
        />
              <input
          className="rounded px-2 py-1"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Capacidad"
              value={transformador.capacidad}
              onChange={(e) => {
                const nuevosTransformadores = [...transformadores];
                nuevosTransformadores[index].capacidad = e.target.value;
                setTransformadores(nuevosTransformadores);
              }}
          disabled={cargando}
        />
              <input
          className="rounded px-2 py-1"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Edad"
              value={transformador.edad}
              onChange={(e) => {
                const nuevosTransformadores = [...transformadores];
                nuevosTransformadores[index].edad = e.target.value;
                setTransformadores(nuevosTransformadores);
              }}
          disabled={cargando}
        />
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Relación voltaje"
              value={transformador.relacionVoltaje}
              onChange={(e) => {
                const nuevosTransformadores = [...transformadores];
                nuevosTransformadores[index].relacionVoltaje = e.target.value;
                setTransformadores(nuevosTransformadores);
              }}
        disabled={cargando}
      />
          </div>
        </div>
      ))}
    </div>

    {/* Plantas Eléctricas */}
    <h3 
      className="font-bold text-sm mt-6 mb-2"
      style={{ color: textPrimary }}
    >
      PLANTAS ELÉCTRICAS
    </h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 text-sm">
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Número"
        value={plantaNumero1}
        onChange={(e) => setPlantaNumero1(e.target.value)}
        disabled={cargando}
      />
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Marca"
        value={plantaMarca1}
        onChange={(e) => setPlantaMarca1(e.target.value)}
        disabled={cargando}
      />
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Tipo"
        value={plantaTipo1}
        onChange={(e) => setPlantaTipo1(e.target.value)}
        disabled={cargando}
      />
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Capacidad"
        value={plantaCapacidad1}
        onChange={(e) => setPlantaCapacidad1(e.target.value)}
        disabled={cargando}
      />
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Edad"
        value={plantaEdad1}
        onChange={(e) => setPlantaEdad1(e.target.value)}
        disabled={cargando}
      />
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Transferencia"
        value={plantaTransferencia1}
        onChange={(e) => setPlantaTransferencia1(e.target.value)}
        disabled={cargando}
      />
      <input
        className="rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        placeholder="Voltaje/Cobertura"
        value={plantaCobertura1}
        onChange={(e) => setPlantaCobertura1(e.target.value)}
        disabled={cargando}
      />
    </div>

    {/* Pararrayos */}
    <div className="mt-6">
      <label 
        className="font-semibold block mb-1"
        style={{ color: textPrimary }}
      >
        PARARRAYOS
      </label>
      <input
        type="text"
        value={energiaPararrayos}
        onChange={(e) => setEnergiaPararrayos(e.target.value)}
        placeholder="Sí / No"
        className="w-full rounded px-2 py-1"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    {/* Comentarios energía */}
    <label 
      className="block text-sm font-medium mb-1"
      style={{ color: textPrimary }}
    >
      Comentarios
    </label>
    <textarea
      rows={6}
      value={energiaComentarios}
      onChange={(e) => setEnergiaComentarios(e.target.value)}
      className="w-full rounded px-3 py-2"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
      placeholder="Escribe observaciones del sistema eléctrico..."
      disabled={cargando}
    ></textarea>
  </div>






  {/* SISTEMA DE AGUA */}
  <div className="overflow-x-auto mb-6">
  <h2 
    className="text-xl font-bold mb-4"
    style={{ color: textPrimary }}
  >
    SISTEMA DE AGUA
  </h2>
  <table 
    className="min-w-full text-sm text-left"
    style={{
      border: `1px solid ${borderColor}`
    }}
  >
    <thead 
      style={{
        backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F3F4F6'
      }}
    >
      <tr>
        <th 
          className="px-4 py-2"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary
          }}
        >
          FUENTE
        </th>
        <th 
          className="px-4 py-2"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary
          }}
        >
          USO
        </th>
        <th 
          className="px-4 py-2"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary
          }}
        >
          ALMACENAMIENTO
        </th>
        <th 
          className="px-4 py-2"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary
          }}
        >
          EQUIPO DE BOMBEO
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        style={{
          backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF'
        }}
      >
        <td 
          className="px-4 py-2"
          style={{
            border: `1px solid ${borderColor}`
          }}
        >
          <input
            type="text"
            value={aguaFuente}
            onChange={(e) => setAguaFuente(e.target.value)}
            placeholder="Ej: Compra de carro tanque"
            className="w-full rounded px-2 py-1"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </td>
        <td 
          className="px-4 py-2"
          style={{
            border: `1px solid ${borderColor}`
          }}
        >
          <input
            type="text"
            value={aguaUso}
            onChange={(e) => setAguaUso(e.target.value)}
            placeholder="Ej: En toda la edificación"
            className="w-full rounded px-2 py-1"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </td>
        <td 
          className="px-4 py-2"
          style={{
            border: `1px solid ${borderColor}`
          }}
        >
          <input
            type="text"
            value={aguaAlmacenamiento}
            onChange={(e) => setAguaAlmacenamiento(e.target.value)}
            placeholder="Ej: Tanques"
            className="w-full rounded px-2 py-1"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </td>
        <td 
          className="px-4 py-2"
          style={{
            border: `1px solid ${borderColor}`
          }}
        >
          <input
            type="text"
            value={aguaBombeo}
            onChange={(e) => setAguaBombeo(e.target.value)}
            placeholder="Ej: A presión"
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </td>
      </tr>
    </tbody>
  </table>
</div>
</div>

<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
  <h2 
    className="text-xl font-bold mb-4"
    style={{ color: textPrimary }}
  >
    8. PROTECCIONES CONTRA INCENDIOS
  </h2>

  <div className="grid grid-cols-1 gap-4 text-sm mb-6">
    <div className="grid grid-cols-12 items-center gap-2">
      <label 
        className="font-semibold col-span-3"
        style={{ color: textPrimary }}
      >
        EXTINTOR
      </label>
      <input
        type="text"
        value={extintor}
        onChange={(e) => setExtintor(e.target.value)}
        placeholder="Ej: 27 extintores multipropósito, 10lbs y 2 tipo satélite de CO2"
        className="col-span-9 rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    <div className="grid grid-cols-12 items-center gap-2">
      <label 
        className="font-semibold col-span-3"
        style={{ color: textPrimary }}
      >
        RED CONTRAINCENDIO
      </label>
      <input
        type="text"
        value={rci}
        onChange={(e) => setRci(e.target.value)}
        placeholder="Ej: No cuentan con RCI"
        className="col-span-9 rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    <div className="grid grid-cols-12 items-center gap-2">
      <label 
        className="font-semibold col-span-3"
        style={{ color: textPrimary }}
      >
        SISTEMA DE ROCIADORES
      </label>
      <input
        type="text"
        value={rociadores}
        onChange={(e) => setRociadores(e.target.value)}
        placeholder="Ej: No cuentan con sistema de rociadores"
        className="col-span-9 rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    <div className="grid grid-cols-12 items-center gap-2">
      <label 
        className="font-semibold col-span-3"
        style={{ color: textPrimary }}
      >
        DETECCIÓN DE INCENDIOS
      </label>
      <input
        type="text"
        value={deteccion}
        onChange={(e) => setDeteccion(e.target.value)}
        placeholder="Ej: No cuentan con detección de humo"
        className="col-span-9 rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    <div className="grid grid-cols-12 items-center gap-2">
      <label 
        className="font-semibold col-span-3"
        style={{ color: textPrimary }}
      >
        ALARMAS DE INCENDIO
      </label>
      <input
        type="text"
        value={alarmas}
        onChange={(e) => setAlarmas(e.target.value)}
        placeholder="Ej: Cuentan con pulsadores de alarma"
        className="col-span-9 rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    <div className="grid grid-cols-12 items-center gap-2">
      <label 
        className="font-semibold col-span-3"
        style={{ color: textPrimary }}
      >
        BRIGADAS DE EMERGENCIA
      </label>
      <input
        type="text"
        value={brigadas}
        onChange={(e) => setBrigadas(e.target.value)}
        placeholder="Ej: 20 brigadistas, simulacros anuales, camillas y botiquines"
        className="col-span-9 rounded px-3 py-2"
        style={{
          backgroundColor: inputBg,
          color: textPrimary,
          borderColor: borderColor,
          border: `1px solid ${borderColor}`
        }}
        disabled={cargando}
      />
    </div>

    <div className="grid grid-cols-12 items-center gap-2">
      <label 
        className="font-semibold col-span-3"
        style={{ color: textPrimary }}
      >
        BOMBEROS
      </label>
      <input
        type="text"
        value={bomberos}
        onChange={(e) => setBomberos(e.target.value)}
        placeholder="Ej: Estación de Atalaya, tiempo de reacción aprox. 20 min"
        className="col-span-9 rounded px-3 py-2"
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
</div>


<h2 
  className="text-xl font-bold mb-4"
  style={{ color: textPrimary }}
>
  9. SEGURIDAD
</h2>

{/* Seguridad Electrónica */}
<h3 
  className="text-lg font-semibold mb-2"
  style={{ color: textPrimary }}
>
  Seguridad Electrónica
</h3>

<label 
  style={{ color: textPrimary }}
>
  Alarma Monitoreada
</label>
<input 
  type="text" 
  value={alarmaMonitoreada} 
  onChange={(e) => setAlarmaMonitoreada(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  CCTV (cámaras, monitoreo)
</label>
<input 
  type="text" 
  value={cctv} 
  onChange={(e) => setCctv(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  Mantenimiento
</label>
<input 
  type="text" 
  value={mantenimientoSeguridad} 
  onChange={(e) => setMantenimientoSeguridad(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  Comentarios
</label>
<textarea 
  value={comentariosSeguridadElectronica} 
  onChange={(e) => setComentariosSeguridadElectronica(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-4" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  rows={3} 
  disabled={cargando} 
/>

{/* Seguridad Física */}
<h3 
  className="text-lg font-semibold mb-2"
  style={{ color: textPrimary }}
>
  Seguridad Física
</h3>

<label 
  style={{ color: textPrimary }}
>
  Tipo de Vigilancia
</label>
<input 
  type="text" 
  value={tipoVigilancia} 
  onChange={(e) => setTipoVigilancia(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  Horarios, turnos, dotación
</label>
<input 
  type="text" 
  value={horariosVigilancia} 
  onChange={(e) => setHorariosVigilancia(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  Accesos
</label>
<input 
  type="text" 
  value={accesos} 
  onChange={(e) => setAccesos(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  Personal de cierre y apertura
</label>
<input 
  type="text" 
  value={personalCierre} 
  onChange={(e) => setPersonalCierre(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  Cerramiento del predio
</label>
<input 
  type="text" 
  value={cerramientoPredio} 
  onChange={(e) => setCerramientoPredio(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  Otros (rejas, concertina, etc)
</label>
<input 
  type="text" 
  value={otrosCerramiento} 
  onChange={(e) => setOtrosCerramiento(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-2" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  disabled={cargando} 
/>

<label 
  style={{ color: textPrimary }}
>
  Comentarios
</label>
<textarea 
  value={comentariosSeguridadFisica} 
  onChange={(e) => setComentariosSeguridadFisica(e.target.value)} 
  className="w-full rounded px-2 py-1 mb-4" 
  style={{
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor: borderColor,
    border: `1px solid ${borderColor}`
  }}
  rows={3} 
  disabled={cargando} 
/>



<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
  <h2 
    className="text-xl font-bold mb-4"
    style={{ color: textPrimary }}
  >
    10. SINIESTRALIDAD
  </h2>

  <label 
    className="block text-sm font-semibold mb-1"
    style={{ color: textPrimary }}
  >
    Descripción de siniestros ocurridos
  </label>
  <textarea
    rows={10}
    value={siniestralidad}
    onChange={(e) => setSiniestralidad(e.target.value)}
    className="w-full rounded px-3 py-2"
    style={{
      backgroundColor: inputBg,
      color: textPrimary,
      borderColor: borderColor,
      border: `1px solid ${borderColor}`
    }}
    placeholder="Incluye el detalle de los siniestros reportados, fechas, causas y acciones correctivas."
    disabled={cargando}
  />
</div>


<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`
  }}
>
  <h2 
    className="text-xl font-bold mb-4"
    style={{ color: textPrimary }}
  >
    11. RECOMENDACIONES
  </h2>

  {/* Sección para agregar recomendaciones desde el banco */}
  <div 
    className="mb-6 p-4 rounded-lg"
    style={{
      backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
      border: `1px solid ${borderColor}`
    }}
  >
    <h3 
      className="text-lg font-semibold mb-3"
      style={{ color: textPrimary }}
    >
      Banco de Recomendaciones
    </h3>

  {/* Combo 1 - seleccionar categoría */}
    <div className="mb-3">
  <label 
    className="block text-sm font-semibold mb-2"
    style={{ color: textPrimary }}
  >
    Categoría
  </label>
  <select
    value={categoriaSeleccionada}
    onChange={(e) => setCategoriaSeleccionada(e.target.value)}
        className="w-full rounded px-3 py-2"
    style={{
      backgroundColor: inputBg,
      color: textPrimary,
      borderColor: borderColor,
      border: `1px solid ${borderColor}`
    }}
    disabled={cargando}
  >
    <option value="">Seleccione una categoría...</option>
    {Object.keys(bancoRecomendaciones).map((categoria, index) => (
      <option key={index} value={categoria}>
        {categoria}
      </option>
    ))}
  </select>
    </div>

  {/* Combo 2 - seleccionar recomendación */}
  {categoriaSeleccionada && (
      <div className="mb-3">
        <label 
          className="block text-sm font-semibold mb-2"
          style={{ color: textPrimary }}
        >
          Recomendación Predefinida
        </label>
      <select
          onChange={(e) => {
            if (e.target.value) {
              handleAgregarRecomendacion(e.target.value);
              e.target.value = ""; // Resetear el select
            }
          }}
          className="w-full rounded px-3 py-2"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
        defaultValue=""
        disabled={cargando}
      >
        <option value="" disabled>
            Seleccione una recomendación para agregar...
        </option>
        {bancoRecomendaciones[categoriaSeleccionada].map((rec, index) => (
          <option key={index} value={rec}>
              {rec.slice(0, 100)}{rec.length > 100 ? '...' : ''}
          </option>
        ))}
      </select>
      </div>
    )}

    {/* Input para nueva recomendación al banco */}
    {categoriaSeleccionada && (
      <div className="mb-3">
      <label className="block text-sm font-semibold mb-2">
          Agregar Nueva Recomendación al Banco
      </label>
        <div className="flex gap-2">
      <input
        type="text"
        value={nuevaRecomendacion}
        onChange={(e) => setNuevaRecomendacion(e.target.value)}
            placeholder="Escribe una nueva recomendación para agregar al banco..."
            className="flex-1 border border-gray-300 rounded px-3 py-2"
        disabled={cargando}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && nuevaRecomendacion.trim() && categoriaSeleccionada) {
                // Actualizar el estado
                const nuevoBanco = {
                  ...bancoRecomendaciones,
                  [categoriaSeleccionada]: [
                    ...(bancoRecomendaciones[categoriaSeleccionada] || []),
                    nuevaRecomendacion.trim(),
                  ],
                };
                
                // Guardar inmediatamente en localStorage
                try {
                  localStorage.setItem("bancoRecomendaciones", JSON.stringify(nuevoBanco));
} catch (error) {
                  console.error('❌ Error al guardar en localStorage:', error);
                }
                
                // Actualizar el estado
                setBancoRecomendaciones(nuevoBanco);
                setNuevaRecomendacion("");
              }
            }}
      />
              <button
          onClick={() => {
              if (!nuevaRecomendacion.trim() || !categoriaSeleccionada) return;
              
              // Actualizar el estado
              const nuevoBanco = {
                ...bancoRecomendaciones,
              [categoriaSeleccionada]: [
                  ...(bancoRecomendaciones[categoriaSeleccionada] || []),
                nuevaRecomendacion.trim(),
              ],
              };
              
              // Guardar inmediatamente en localStorage
              try {
                localStorage.setItem("bancoRecomendaciones", JSON.stringify(nuevoBanco));
} catch (error) {
                console.error('❌ Error al guardar en localStorage:', error);
              }
              
              // Actualizar el estado
              setBancoRecomendaciones(nuevoBanco);
            setNuevaRecomendacion("");
          }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition whitespace-nowrap"
            disabled={cargando || !nuevaRecomendacion.trim() || !categoriaSeleccionada}
        >
            Agregar al Banco
        </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Esta recomendación se agregará al banco de la categoría seleccionada
        </p>
      </div>
  )}
  </div>

  {/* Textarea principal para recomendaciones */}
  <div className="mb-4">
    <label 
      className="block text-sm font-semibold mb-2"
      style={{ color: textPrimary }}
    >
      Recomendaciones Generales
  </label>
  <textarea
      rows={12}
    value={recomendaciones}
    onChange={(e) => setRecomendaciones(e.target.value)}
      placeholder="Escribe aquí las recomendaciones adicionales. Puedes seleccionar recomendaciones predefinidas desde el banco arriba, o escribir nuevas recomendaciones personalizadas. El asistente de IA puede ayudarte a mejorar y estructurar estas recomendaciones."
      className="w-full rounded px-3 py-2 focus:outline-none"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
    disabled={cargando}
  />
    <p 
      className="text-xs mt-1"
      style={{ color: textSecondary }}
    >
      Las recomendaciones seleccionadas del banco aparecerán aquí automáticamente. Puedes editarlas y agregar más según sea necesario.
    </p>
  </div>

  {/* Chatbot IA para mejorar recomendaciones */}
  <div 
    className="mt-4 p-4 rounded-lg"
    style={{
      backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
      border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}`
    }}
  >
    <h3 
      className="text-sm font-semibold mb-2 flex items-center gap-2"
      style={{ color: theme === 'dark' ? '#93C5FD' : '#1E40AF' }}
    >
      <span>🤖</span> Asistente de IA para Recomendaciones
    </h3>
    <p 
      className="text-xs mb-3"
      style={{ color: theme === 'dark' ? '#BFDBFE' : '#1E3A8A' }}
    >
      El asistente de IA puede ayudarte a mejorar, estructurar y generar recomendaciones basadas en toda la información del formulario de inspección.
    </p>
    <ChatbotIA 
      formData={{
        ...formData,
        recomendaciones: recomendaciones,
        bancoRecomendaciones: bancoRecomendaciones,
        categoriaSeleccionada: categoriaSeleccionada,
        // Incluir contexto relevante del formulario para el chatbot
        nombreCliente: nombreCliente,
        tipoInmueble: formData.tipo_inmueble,
        direccion: formData.direccion,
        ciudad: formData.ciudad_siniestro,
        analisisRiesgos: analisisRiesgos,
        tablaRiesgos: tablaRiesgos,
        energiaProveedor: energiaProveedor,
        energiaTension: energiaTension,
        transformadores: transformadores,
        plantasElectricas: plantasElectricas,
        proteccionesIncendio: {
          extintor,
          rci,
          rociadores,
          deteccion,
          alarmas,
          brigadas,
          bomberos
        },
        seguridad: {
          alarmaMonitoreada,
          cctv,
          tipoVigilancia,
          horariosVigilancia,
          accesos,
          cerramientoPredio
        }
      }}
      onInputChange={(field, value) => {
        if (field === 'recomendaciones') {
          setRecomendaciones(value);
        } else {
          // Manejar otros campos si es necesario
}
      }}
    />
  </div>
</div>





<RegistroFotografico 
  onChange={setImagenesRegistro} 
  imagenesIniciales={imagenesRegistro}
  tituloSeccion="12. REGISTRO FOTOGRÁFICO"
/>




      {/* Botón de acción */}
      <div 
        className="mt-8 p-6 rounded shadow-sm"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-xl font-bold mb-4 text-center pb-2"
          style={{
            color: textPrimary,
            borderBottom: `1px solid ${borderColor}`
          }}
        >
          Acciones del Formulario
        </h2>
        
        {/* Botones de historial */}
        <div className="mb-6">
          <BotonesHistorial
            onGuardarEnHistorial={handleGuardarEnHistorial}
            onExportar={handleExportar}
            tipoFormulario={TIPOS_FORMULARIOS.INSPECCION}
            tituloFormulario="Inspección"
            deshabilitado={!nombreCliente || !formData.ciudad_siniestro || !formData.aseguradora}
            guardando={guardando}
            exportando={exportando}
          />
        </div>

      </div>
    </div>
  </div>
);
}


