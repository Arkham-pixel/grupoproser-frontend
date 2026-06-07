import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, startTransition, useDeferredValue } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { obtenerHoraActualColombia } from '../utils/fechaUtils';
import { useTheme } from '../context/ThemeContext';
import { FaPlus, FaTrash } from 'react-icons/fa';
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
  BorderStyle,
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
// Lazy load componentes pesados para mejorar rendimiento
const MapaGoogleEarth = lazy(() => import('./MapaGoogleEarth'));
const MapaUbicacionAjuste = lazy(() => import('./SubcomponenteFormularioAjuste/MapaUbicacionAjuste'));
const RegistroFotografico = lazy(() => import('./RegistroFotografico'));
import { PageBreak } from "docx";
import { toPng } from 'html-to-image';
import Logo from '../img/Logo.png';
import { TableOfContents } from "docx";
import ciudadesData from '../data/colombia.json';
import Select from 'react-select';
import 'leaflet/dist/leaflet.css'
const MapaDeCalor = lazy(() => import("./MapaDeCalor"));
const FormularioAreas = lazy(() => import("./SubcomponenteFRiesgo/FormularioAreas"));
import BotonesHistorial from './BotonesHistorial.jsx';
import { useHistorialFormulario } from '../hooks/useHistorialFormulario.js';
import historialService, { TIPOS_FORMULARIOS } from '../services/historialService.js';
import { BASE_URL } from '../config/apiConfig.js';
import { generarManualInspeccion } from './generarManualInspeccion.js';
const ChatbotIA = lazy(() => import('./SubcomponenteFormularioAjuste/ChatbotIA'));

/** Prefijo MM/YYYY para códigos de recomendación */
function prefijoMesAnioRecomendacion(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${m}/${y}`;
}

function fechaLocalIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Siguiente código MM/YYYY--R{n} según ítems ya existentes (mismo mes/año de referencia). */
function crearCodigoRecomendacion(items, fechaRef = new Date()) {
  const pref = prefijoMesAnioRecomendacion(fechaRef);
  let max = 0;
  for (const it of items) {
    if (!it?.codigo) continue;
    const m = String(it.codigo).match(/^(\d{2}\/\d{4})--R(\d+)$/);
    if (m && m[1] === pref) max = Math.max(max, parseInt(m[2], 10));
  }
  return `${pref}--R${max + 1}`;
}

/** MM/YYYY del primer ítem con código válido; si no hay, mes actual. */
function obtenerPrefijoMesAnioListaRecomendaciones(items) {
  for (const it of items) {
    const m = String(it?.codigo || "").match(/^(\d{2}\/\d{4})--R\d+$/);
    if (m) return m[1];
  }
  return prefijoMesAnioRecomendacion(new Date());
}

/** Renumera a R1…Rn según el orden actual (sin huecos tras borrar). */
function renumerarCodigosRecomendaciones(items) {
  if (!items?.length) return [];
  const pref = obtenerPrefijoMesAnioListaRecomendaciones(items);
  return items.map((it, idx) => ({
    ...it,
    codigo: `${pref}--R${idx + 1}`,
  }));
}

function formatearFechaSeguimientoIsoParaMostrar(iso) {
  if (!iso || typeof iso !== "string") return "";
  const [yy, mm, dd] = iso.split("-");
  if (!yy || !mm || !dd) return iso;
  return `${dd}/${mm}/${yy}`;
}

function textoPlanoRecomendacionesDesdeItems(items) {
  if (!items?.length) return "";
  return items
    .map(
      (i) =>
        `${i.codigo}: ${i.texto}\nFecha de seguimiento: ${formatearFechaSeguimientoIsoParaMostrar(i.fechaSeguimiento)}`
    )
    .join("\n\n");
}

function migrarTextoPlanoAItems(str) {
  const s = String(str || "").trim();
  if (!s) return [];
  let bloques = s
    .split(/\n{2,}(?=\d{2}\/\d{4}--R)/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (bloques.length <= 1) {
    bloques = s.split(/\n•\s+/).map((x) => x.trim()).filter(Boolean);
  }
  if (bloques.length <= 1 && !/\d{2}\/\d{4}--R\d+/.test(s)) {
    bloques = s
      .split(/\n+/)
      .map((x) => x.replace(/^•\s*/, "").trim())
      .filter(Boolean);
  }
  const items = [];
  const fechaRef = new Date();
  for (let i = 0; i < bloques.length; i++) {
    let block = bloques[i];
    let fechaSeg = fechaLocalIso(fechaRef);
    const fechaLine = block.match(/Fecha de seguimiento:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (fechaLine) {
      const [, dmy] = fechaLine;
      const parts = dmy.split("/");
      if (parts.length === 3) {
        fechaSeg = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
      block = block.replace(/\n?Fecha de seguimiento:.*$/i, "").trim();
    }
    const codHead = block.match(/^(\d{2}\/\d{4}--R\d+):\s*/);
    const codigo = codHead ? codHead[1] : crearCodigoRecomendacion(items, fechaRef);
    let texto = codHead ? block.slice(codHead[0].length) : block;
    texto = texto.replace(/^\d{2}\/\d{4}--R\d+:\s*/, "").trim();
    items.push({
      id: `m-${Date.now()}-${i}`,
      codigo,
      texto,
      fechaSeguimiento: fechaSeg,
    });
  }
  return items;
}

/** Valor del select del banco cuando no hay ítem elegido (placeholder no deshabilitado: permite volver a elegir la misma recomendación). */
const SIN_SELECCION_BANCO_RECOMENDACION = "__sin_seleccion_banco__";

function normalizarRecomendacionesItemsDesdeDatos(datos) {
  const raw = datos?.recomendacionesItems;
  if (Array.isArray(raw) && raw.length > 0) {
    const acc = [];
    for (let idx = 0; idx < raw.length; idx++) {
      const it = raw[idx] || {};
      const codigoOk = it.codigo && /^\d{2}\/\d{4}--R\d+$/.test(String(it.codigo));
      const codigo = codigoOk ? String(it.codigo) : crearCodigoRecomendacion(acc, new Date());
      const fs = it.fechaSeguimiento;
      const fechaSeguimiento =
        fs && /^\d{4}-\d{2}-\d{2}$/.test(String(fs)) ? String(fs) : fechaLocalIso();
      acc.push({
        id: it.id != null ? String(it.id) : `loaded-${idx}-${Date.now()}`,
        codigo,
        texto: it.texto != null ? String(it.texto) : "",
        fechaSeguimiento,
      });
    }
    return acc;
  }
  const text = datos?.recomendaciones;
  if (text && String(text).trim()) return migrarTextoPlanoAItems(String(text));
  return [];
}

function extraerLatLngDesdeTexto(coordenadasTexto) {
  const texto = String(coordenadasTexto || '').trim();
  if (!texto) return { latitud: '', longitud: '' };

  const partes = texto.split(',').map((v) => v.trim());
  if (partes.length < 2) return { latitud: texto, longitud: '' };

  return {
    latitud: partes[0] || '',
    longitud: partes[1] || ''
  };
}

function limpiarPrefijoNumerico(texto) {
  return String(texto || "")
    .replace(/^\s*\d+\s*=\s*/i, "")
    .trim();
}

function valorTablaWord(texto) {
  const valor = String(texto ?? "").trim();
  return valor || "N/A";
}

export default function FormularioInspeccion() {
  const { theme } = useTheme();
  const location = useLocation();
  const { id } = useParams(); // Obtener ID de la URL si estamos en modo edición
  const navigate = useNavigate();
  const datosPrevios = location.state || {};
  
  // Generar lista de años dinámicamente (desde 1900 hasta el año actual) - Memoizado
  const añoActual = new Date().getFullYear();
  const opcionesAños = useMemo(() => {
    const añosConstruccion = [];
    for (let año = 1900; año <= añoActual; año++) {
      añosConstruccion.push(año);
    }
    añosConstruccion.reverse(); // Ordenar de más reciente a más antiguo
    
    // Convertir a formato para react-select
    return [
      { value: `Después de ${añoActual}`, label: `Después de ${añoActual}` },
      ...añosConstruccion.map(año => ({ value: año.toString(), label: año.toString() })),
      { value: "Antes de 1900", label: "Antes de 1900" }
    ];
  }, [añoActual]);
  
  // Colores según el tema - Memoizado para evitar recálculos
  const colores = useMemo(() => ({
    bgMain: theme === 'dark' ? '#1A1A1A' : '#F5F5F7',
    cardBg: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
    textPrimary: theme === 'dark' ? '#F5F5F5' : '#1E1E1E',
    textSecondary: theme === 'dark' ? '#B0B0B0' : '#6B6B6B',
    borderColor: theme === 'dark' ? '#2D2D2D' : '#E6E6E6',
    inputBg: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
  }), [theme]);
  
  const { bgMain, cardBg, textPrimary, textSecondary, borderColor, inputBg } = colores;
  
  // Estado para modo edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  // Información general - Memoizado para evitar recálculos
  const municipios = useMemo(() => 
    ciudadesData.flatMap(dep =>
      dep.ciudades.map(ciudad => ({
        label: `${ciudad} - ${dep.departamento}`,
        value: ciudad
      }))
    ), []
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
  const [puedeSuscribir, setPuedeSuscribir] = useState("SI");
  const [colaboladores, setColaboladores] = useState("");

  // Texto que se inserta en la carta (Word y previsualización)
  const textoSuscripcion =
    puedeSuscribir === "NO" ? "NO SE PUEDE SUSCRIBIR" : "SE PUEDE SUSCRIBIR";

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
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

  // Empresa y riesgo
  const [descripcionEmpresa, setDescripcionEmpresa] = useState("");
  const [infraestructura, setInfraestructura] = useState("");


  // Análisis de riesgos - ahora es un array para permitir agregar/eliminar
  const riesgosPorDefecto = [
    { id: 1, riesgo: "Incendio/Explosión", analisis: "" },
    { id: 2, riesgo: "AMIT", analisis: "" },
    { id: 3, riesgo: "Anegación", analisis: "" },
    { id: 4, riesgo: "Daños por agua", analisis: "" },
    { id: 5, riesgo: "Terremoto", analisis: "" },
    { id: 6, riesgo: "Sustracción", analisis: "" },
    { id: 7, riesgo: "Rotura de maquinaria", analisis: "" },
    { id: 8, riesgo: "Responsabilidad Civil", analisis: "" }
  ];
  
  const [analisisRiesgos, setAnalisisRiesgos] = useState(riesgosPorDefecto);

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
  const coordenadasMapa = useMemo(
    () => extraerLatLngDesdeTexto(formData?.coordenadasRiesgo),
    [formData?.coordenadasRiesgo]
  );
  // Características de la construcción
  const [caracteristicasConstruccion, setCaracteristicasConstruccion] = useState("");
  // Tabla de características de construcción - Primera sección
  const [anoConstruccion, setAnoConstruccion] = useState("");
  const [tipoEdificio, setTipoEdificio] = useState("");
  const [areaLoteConstruccion, setAreaLoteConstruccion] = useState("");
  const [areaConstruidaConstruccion, setAreaConstruidaConstruccion] = useState("");
  const [numeroPisosConstruccion, setNumeroPisosConstruccion] = useState("");
  // Tabla de características de construcción - Segunda sección
  const [cimentacion, setCimentacion] = useState("");
  const [materialesEstructura, setMaterialesEstructura] = useState("");
  const [regularidadPlanta, setRegularidadPlanta] = useState("");
  const [danosPrevios, setDanosPrevios] = useState("");
  const [reforzamientosEstructurales, setReforzamientosEstructurales] = useState("");
  const [sistemaEstructural, setSistemaEstructural] = useState("");
  const [estructuraCubierta, setEstructuraCubierta] = useState("");
  const [regularAltura, setRegularAltura] = useState("");
  const [danosReparados, setDanosReparados] = useState("");
  // Campos "Otro" para especificar
  const [tipoEdificioOtro, setTipoEdificioOtro] = useState("");
  // Tablas de materiales: Insumos, Materias Primas, Producto terminado
  const [tipoInsumo, setTipoInsumo] = useState("");
  const [nivelRiesgoInsumo, setNivelRiesgoInsumo] = useState("");
  const [descripcionContenidosInsumo, setDescripcionContenidosInsumo] = useState("");
  const [contenedoresInsumo, setContenedoresInsumo] = useState("");
  const [tipoAlmacenamientoInsumo, setTipoAlmacenamientoInsumo] = useState("");
  const [estadoAlmacenamientoInsumo, setEstadoAlmacenamientoInsumo] = useState("");
  const [tipoMateriasPrimas, setTipoMateriasPrimas] = useState("");
  const [nivelRiesgoMateriasPrimas, setNivelRiesgoMateriasPrimas] = useState("");
  const [descripcionContenidosMateriasPrimas, setDescripcionContenidosMateriasPrimas] = useState("");
  const [contenedoresMateriasPrimas, setContenedoresMateriasPrimas] = useState("");
  const [tipoAlmacenamientoMateriasPrimas, setTipoAlmacenamientoMateriasPrimas] = useState("");
  const [estadoAlmacenamientoMateriasPrimas, setEstadoAlmacenamientoMateriasPrimas] = useState("");
  const [tipoMercancias, setTipoMercancias] = useState("");
  const [nivelRiesgoMercancias, setNivelRiesgoMercancias] = useState("");
  const [descripcionContenidosMercancias, setDescripcionContenidosMercancias] = useState("");
  const [contenedoresMercancias, setContenedoresMercancias] = useState("");
  const [tipoAlmacenamientoMercancias, setTipoAlmacenamientoMercancias] = useState("");
  const [estadoAlmacenamientoMercancias, setEstadoAlmacenamientoMercancias] = useState("");
  // Campos "Otro" para materiales
  const [tipoInsumoOtro, setTipoInsumoOtro] = useState("");
  const [contenedoresInsumoOtro, setContenedoresInsumoOtro] = useState("");
  const [tipoAlmacenamientoInsumoOtro, setTipoAlmacenamientoInsumoOtro] = useState("");
  const [tipoMateriasPrimasOtro, setTipoMateriasPrimasOtro] = useState("");
  const [contenedoresMateriasPrimasOtro, setContenedoresMateriasPrimasOtro] = useState("");
  const [tipoAlmacenamientoMateriasPrimasOtro, setTipoAlmacenamientoMateriasPrimasOtro] = useState("");
  const [tipoMercanciasOtro, setTipoMercanciasOtro] = useState("");
  const [contenedoresMercanciasOtro, setContenedoresMercanciasOtro] = useState("");
  const [tipoAlmacenamientoMercanciasOtro, setTipoAlmacenamientoMercanciasOtro] = useState("");
  const [cimentacionOtro, setCimentacionOtro] = useState("");
  const [materialesEstructuraOtro, setMaterialesEstructuraOtro] = useState("");
  const [sistemaEstructuralOtro, setSistemaEstructuralOtro] = useState("");
  const [estructuraCubiertaOtro, setEstructuraCubiertaOtro] = useState("");
  // Sustracción - Protecciones Físicas - Agrupado para reducir re-renders
  const [sustraccion, setSustraccion] = useState({
    // Protecciones Físicas
    ubicacionPredio: "",
    vulnerabilidadContenidos: "",
    accesoInstalaciones: "",
    circulacionPersonasExternas: "",
    proteccionesPasivas: "",
    // Sistema de Alarma
    tieneAlarma: "",
    alarmaMonitoreadaSustraccion: "",
    empresaMonitorea: "",
    tipoComunicacionAlarma: "",
    coberturaAlarma: "",
    sensoresAlarma: "",
    // CCTV
    cuentaConCCTV: "",
    numeroCamaras: "",
    controladoPor: "",
    tipoMonitoreoCCTV: "",
    frecuenciaGrabacion: "",
    tiempoRespaldo: "",
    dispositivoGrabacion: "",
    ubicacionGrabador: "",
    visualizacionInternet: "",
    // Vigilancia
    cuentaConVigilancia: "",
    contratadaCon: "",
    numeroVigilantes: "",
    jornadaVigilancia: "",
    tienenArmas: "",
    tienenRadio: "",
    // Manejo de dinero
    personalRecaudo: "",
    horariosRecaudo: "",
    lugarRecaudo: "",
    transporteDinero: "",
    // Campos "Otro"
    ubicacionPredioOtro: "",
    vulnerabilidadContenidosOtro: "",
    accesoInstalacionesOtro: "",
    circulacionPersonasExternasOtro: "",
    proteccionesPasivasOtro: "",
    tipoComunicacionAlarmaOtro: "",
    sensoresAlarmaOtro: "",
    controladoPorOtro: "",
    tipoMonitoreoCCTVOtro: "",
    frecuenciaGrabacionOtro: "",
    dispositivoGrabacionOtro: "",
    ubicacionGrabadorOtro: "",
    jornadaVigilanciaOtro: ""
  });
  
  // Variables de estado separadas para campos de sustracción que se usan directamente
  const [ubicacionPredio, setUbicacionPredio] = useState(datosPrevios.ubicacionPredio || datosPrevios.sustraccion?.ubicacionPredio || "");
  const [vulnerabilidadContenidos, setVulnerabilidadContenidos] = useState(datosPrevios.vulnerabilidadContenidos || datosPrevios.sustraccion?.vulnerabilidadContenidos || "");
  const [accesoInstalaciones, setAccesoInstalaciones] = useState(datosPrevios.accesoInstalaciones || datosPrevios.sustraccion?.accesoInstalaciones || "");
  const [circulacionPersonasExternas, setCirculacionPersonasExternas] = useState(datosPrevios.circulacionPersonasExternas || datosPrevios.sustraccion?.circulacionPersonasExternas || "");
  const [proteccionesPasivas, setProteccionesPasivas] = useState(datosPrevios.proteccionesPasivas || datosPrevios.sustraccion?.proteccionesPasivas || "");
  const [ubicacionPredioOtro, setUbicacionPredioOtro] = useState(datosPrevios.ubicacionPredioOtro || datosPrevios.sustraccion?.ubicacionPredioOtro || "");
  const [vulnerabilidadContenidosOtro, setVulnerabilidadContenidosOtro] = useState(datosPrevios.vulnerabilidadContenidosOtro || datosPrevios.sustraccion?.vulnerabilidadContenidosOtro || "");
  const [accesoInstalacionesOtro, setAccesoInstalacionesOtro] = useState(datosPrevios.accesoInstalacionesOtro || datosPrevios.sustraccion?.accesoInstalacionesOtro || "");
  const [circulacionPersonasExternasOtro, setCirculacionPersonasExternasOtro] = useState(datosPrevios.circulacionPersonasExternasOtro || datosPrevios.sustraccion?.circulacionPersonasExternasOtro || "");
  const [proteccionesPasivasOtro, setProteccionesPasivasOtro] = useState(datosPrevios.proteccionesPasivasOtro || datosPrevios.sustraccion?.proteccionesPasivasOtro || "");
  // Sistema de Alarma
  const [tieneAlarma, setTieneAlarma] = useState(datosPrevios.tieneAlarma || datosPrevios.sustraccion?.tieneAlarma || "");
  const [alarmaMonitoreadaSustraccion, setAlarmaMonitoreadaSustraccion] = useState(datosPrevios.alarmaMonitoreadaSustraccion || datosPrevios.sustraccion?.alarmaMonitoreadaSustraccion || "");
  const [empresaMonitorea, setEmpresaMonitorea] = useState(datosPrevios.empresaMonitorea || datosPrevios.sustraccion?.empresaMonitorea || "");
  const [tipoComunicacionAlarma, setTipoComunicacionAlarma] = useState(datosPrevios.tipoComunicacionAlarma || datosPrevios.sustraccion?.tipoComunicacionAlarma || "");
  const [coberturaAlarma, setCoberturaAlarma] = useState(datosPrevios.coberturaAlarma || datosPrevios.sustraccion?.coberturaAlarma || "");
  const [sensoresAlarma, setSensoresAlarma] = useState(datosPrevios.sensoresAlarma || datosPrevios.sustraccion?.sensoresAlarma || "");
  const [tipoComunicacionAlarmaOtro, setTipoComunicacionAlarmaOtro] = useState(datosPrevios.tipoComunicacionAlarmaOtro || datosPrevios.sustraccion?.tipoComunicacionAlarmaOtro || "");
  const [sensoresAlarmaOtro, setSensoresAlarmaOtro] = useState(datosPrevios.sensoresAlarmaOtro || datosPrevios.sustraccion?.sensoresAlarmaOtro || "");
  // CCTV
  const [cuentaConCCTV, setCuentaConCCTV] = useState(datosPrevios.cuentaConCCTV || datosPrevios.sustraccion?.cuentaConCCTV || "");
  const [numeroCamaras, setNumeroCamaras] = useState(datosPrevios.numeroCamaras || datosPrevios.sustraccion?.numeroCamaras || "");
  const [controladoPor, setControladoPor] = useState(datosPrevios.controladoPor || datosPrevios.sustraccion?.controladoPor || "");
  const [tipoMonitoreoCCTV, setTipoMonitoreoCCTV] = useState(datosPrevios.tipoMonitoreoCCTV || datosPrevios.sustraccion?.tipoMonitoreoCCTV || "");
  const [frecuenciaGrabacion, setFrecuenciaGrabacion] = useState(datosPrevios.frecuenciaGrabacion || datosPrevios.sustraccion?.frecuenciaGrabacion || "");
  const [tiempoRespaldo, setTiempoRespaldo] = useState(datosPrevios.tiempoRespaldo || datosPrevios.sustraccion?.tiempoRespaldo || "");
  const [dispositivoGrabacion, setDispositivoGrabacion] = useState(datosPrevios.dispositivoGrabacion || datosPrevios.sustraccion?.dispositivoGrabacion || "");
  const [ubicacionGrabador, setUbicacionGrabador] = useState(datosPrevios.ubicacionGrabador || datosPrevios.sustraccion?.ubicacionGrabador || "");
  const [visualizacionInternet, setVisualizacionInternet] = useState(datosPrevios.visualizacionInternet || datosPrevios.sustraccion?.visualizacionInternet || "");
  const [controladoPorOtro, setControladoPorOtro] = useState(datosPrevios.controladoPorOtro || datosPrevios.sustraccion?.controladoPorOtro || "");
  const [tipoMonitoreoCCTVOtro, setTipoMonitoreoCCTVOtro] = useState(datosPrevios.tipoMonitoreoCCTVOtro || datosPrevios.sustraccion?.tipoMonitoreoCCTVOtro || "");
  const [frecuenciaGrabacionOtro, setFrecuenciaGrabacionOtro] = useState(datosPrevios.frecuenciaGrabacionOtro || datosPrevios.sustraccion?.frecuenciaGrabacionOtro || "");
  const [dispositivoGrabacionOtro, setDispositivoGrabacionOtro] = useState(datosPrevios.dispositivoGrabacionOtro || datosPrevios.sustraccion?.dispositivoGrabacionOtro || "");
  const [ubicacionGrabadorOtro, setUbicacionGrabadorOtro] = useState(datosPrevios.ubicacionGrabadorOtro || datosPrevios.sustraccion?.ubicacionGrabadorOtro || "");
  // Vigilancia
  const [cuentaConVigilancia, setCuentaConVigilancia] = useState(datosPrevios.cuentaConVigilancia || datosPrevios.sustraccion?.cuentaConVigilancia || "");
  const [contratadaCon, setContratadaCon] = useState(datosPrevios.contratadaCon || datosPrevios.sustraccion?.contratadaCon || "");
  const [numeroVigilantes, setNumeroVigilantes] = useState(datosPrevios.numeroVigilantes || datosPrevios.sustraccion?.numeroVigilantes || "");
  const [jornadaVigilancia, setJornadaVigilancia] = useState(datosPrevios.jornadaVigilancia || datosPrevios.sustraccion?.jornadaVigilancia || "");
  const [tienenArmas, setTienenArmas] = useState(datosPrevios.tienenArmas || datosPrevios.sustraccion?.tienenArmas || "");
  const [tienenRadio, setTienenRadio] = useState(datosPrevios.tienenRadio || datosPrevios.sustraccion?.tienenRadio || "");
  const [jornadaVigilanciaOtro, setJornadaVigilanciaOtro] = useState(datosPrevios.jornadaVigilanciaOtro || datosPrevios.sustraccion?.jornadaVigilanciaOtro || "");
  // Manejo de dinero (Sustracción)
  const [personalRecaudo, setPersonalRecaudo] = useState(datosPrevios.personalRecaudo || datosPrevios.sustraccion?.personalRecaudo || "");
  const [horariosRecaudo, setHorariosRecaudo] = useState(datosPrevios.horariosRecaudo || datosPrevios.sustraccion?.horariosRecaudo || "");
  const [lugarRecaudo, setLugarRecaudo] = useState(datosPrevios.lugarRecaudo || datosPrevios.sustraccion?.lugarRecaudo || "");
  const [transporteDinero, setTransporteDinero] = useState(datosPrevios.transporteDinero || datosPrevios.sustraccion?.transporteDinero || "");

  // Sincroniza TODOS los campos visibles de sustracción al objeto que se persiste en historial.
  useEffect(() => {
    setSustraccion((prev) => ({
      ...prev,
      // Protecciones físicas
      ubicacionPredio,
      vulnerabilidadContenidos,
      accesoInstalaciones,
      circulacionPersonasExternas,
      proteccionesPasivas,
      // Sistema de alarma
      tieneAlarma,
      alarmaMonitoreadaSustraccion,
      empresaMonitorea,
      tipoComunicacionAlarma,
      coberturaAlarma,
      sensoresAlarma,
      // CCTV
      cuentaConCCTV,
      numeroCamaras,
      controladoPor,
      tipoMonitoreoCCTV,
      frecuenciaGrabacion,
      tiempoRespaldo,
      dispositivoGrabacion,
      ubicacionGrabador,
      visualizacionInternet,
      // Vigilancia
      cuentaConVigilancia,
      contratadaCon,
      numeroVigilantes,
      jornadaVigilancia,
      tienenArmas,
      tienenRadio,
      // Campos "Otro"
      ubicacionPredioOtro,
      vulnerabilidadContenidosOtro,
      accesoInstalacionesOtro,
      circulacionPersonasExternasOtro,
      proteccionesPasivasOtro,
      tipoComunicacionAlarmaOtro,
      sensoresAlarmaOtro,
      controladoPorOtro,
      tipoMonitoreoCCTVOtro,
      frecuenciaGrabacionOtro,
      dispositivoGrabacionOtro,
      ubicacionGrabadorOtro,
      jornadaVigilanciaOtro,
      // Manejo de dinero
      personalRecaudo,
      horariosRecaudo,
      lugarRecaudo,
      transporteDinero,
    }));
  }, [
    ubicacionPredio,
    vulnerabilidadContenidos,
    accesoInstalaciones,
    circulacionPersonasExternas,
    proteccionesPasivas,
    tieneAlarma,
    alarmaMonitoreadaSustraccion,
    empresaMonitorea,
    tipoComunicacionAlarma,
    coberturaAlarma,
    sensoresAlarma,
    cuentaConCCTV,
    numeroCamaras,
    controladoPor,
    tipoMonitoreoCCTV,
    frecuenciaGrabacion,
    tiempoRespaldo,
    dispositivoGrabacion,
    ubicacionGrabador,
    visualizacionInternet,
    cuentaConVigilancia,
    contratadaCon,
    numeroVigilantes,
    jornadaVigilancia,
    tienenArmas,
    tienenRadio,
    ubicacionPredioOtro,
    vulnerabilidadContenidosOtro,
    accesoInstalacionesOtro,
    circulacionPersonasExternasOtro,
    proteccionesPasivasOtro,
    tipoComunicacionAlarmaOtro,
    sensoresAlarmaOtro,
    controladoPorOtro,
    tipoMonitoreoCCTVOtro,
    frecuenciaGrabacionOtro,
    dispositivoGrabacionOtro,
    ubicacionGrabadorOtro,
    jornadaVigilanciaOtro,
    personalRecaudo,
    horariosRecaudo,
    lugarRecaudo,
    transporteDinero,
  ]);

  // Helper para actualizar sustracción
  const updateSustraccion = useCallback((field, value) => {
    setSustraccion(prev => ({ ...prev, [field]: value }));
  }, []);
  // Lucro Cesante - Agrupado para reducir re-renders
  const [lucroCesante, setLucroCesante] = useState({
    areaRequeridaLucroCesante: "",
    complejidadActividadLucroCesante: "",
    planContinuidadNegocio: "",
    valorNominaMensual: "",
    valorFacturacionAnoAnterior: "",
    valorProyectadoFacturacion: "",
    comentariosLucroCesante: "",
    // Campos "Otro"
    areaRequeridaLucroCesanteOtro: "",
    complejidadActividadLucroCesanteOtro: ""
  });
  
  // Variables de estado separadas para campos de lucro cesante que se usan directamente
  const [areaRequeridaLucroCesante, setAreaRequeridaLucroCesante] = useState(datosPrevios.areaRequeridaLucroCesante || datosPrevios.lucroCesante?.areaRequeridaLucroCesante || "");
  const [complejidadActividadLucroCesante, setComplejidadActividadLucroCesante] = useState(datosPrevios.complejidadActividadLucroCesante || datosPrevios.lucroCesante?.complejidadActividadLucroCesante || "");
  const [areaRequeridaLucroCesanteOtro, setAreaRequeridaLucroCesanteOtro] = useState(datosPrevios.areaRequeridaLucroCesanteOtro || datosPrevios.lucroCesante?.areaRequeridaLucroCesanteOtro || "");
  const [complejidadActividadLucroCesanteOtro, setComplejidadActividadLucroCesanteOtro] = useState(datosPrevios.complejidadActividadLucroCesanteOtro || datosPrevios.lucroCesante?.complejidadActividadLucroCesanteOtro || "");
  const [planContinuidadNegocio, setPlanContinuidadNegocio] = useState(datosPrevios.planContinuidadNegocio || datosPrevios.lucroCesante?.planContinuidadNegocio || "");
  const [valorNominaMensual, setValorNominaMensual] = useState(datosPrevios.valorNominaMensual || datosPrevios.lucroCesante?.valorNominaMensual || "");
  const [valorFacturacionAnoAnterior, setValorFacturacionAnoAnterior] = useState(datosPrevios.valorFacturacionAnoAnterior || datosPrevios.lucroCesante?.valorFacturacionAnoAnterior || "");
  const [valorProyectadoFacturacion, setValorProyectadoFacturacion] = useState(datosPrevios.valorProyectadoFacturacion || datosPrevios.lucroCesante?.valorProyectadoFacturacion || "");
  const [comentariosLucroCesante, setComentariosLucroCesante] = useState(datosPrevios.comentariosLucroCesante || datosPrevios.lucroCesante?.comentariosLucroCesante || "");

  // Sincroniza TODOS los campos visibles de lucro cesante
  // al objeto agrupado que se persiste en historial.
  useEffect(() => {
    setLucroCesante((prev) => ({
      ...prev,
      areaRequeridaLucroCesante,
      complejidadActividadLucroCesante,
      planContinuidadNegocio,
      valorNominaMensual,
      valorFacturacionAnoAnterior,
      valorProyectadoFacturacion,
      comentariosLucroCesante,
      areaRequeridaLucroCesanteOtro,
      complejidadActividadLucroCesanteOtro,
    }));
  }, [
    areaRequeridaLucroCesante,
    complejidadActividadLucroCesante,
    planContinuidadNegocio,
    valorNominaMensual,
    valorFacturacionAnoAnterior,
    valorProyectadoFacturacion,
    comentariosLucroCesante,
    areaRequeridaLucroCesanteOtro,
    complejidadActividadLucroCesanteOtro,
  ]);
  
  // Helper para actualizar lucro cesante
  const updateLucroCesante = useCallback((field, value) => {
    setLucroCesante(prev => ({ ...prev, [field]: value }));
  }, []);
  
  // Variables de estado separadas para campos de roturaMaquinaria que se usan directamente
  const [capacidadInstaladaPlanta, setCapacidadInstaladaPlanta] = useState(datosPrevios.capacidadInstaladaPlanta || datosPrevios.roturaMaquinaria?.capacidadInstaladaPlanta || "");
  const [indicePromedioCapacidad, setIndicePromedioCapacidad] = useState(datosPrevios.indicePromedioCapacidad || datosPrevios.roturaMaquinaria?.indicePromedioCapacidad || "");
  const [numeroLineasProduccion, setNumeroLineasProduccion] = useState(datosPrevios.numeroLineasProduccion || datosPrevios.roturaMaquinaria?.numeroLineasProduccion || "");
  const [maquinariaCritica, setMaquinariaCritica] = useState(datosPrevios.maquinariaCritica || datosPrevios.roturaMaquinaria?.maquinariaCritica || "");
  const [incidenciaProduccion, setIncidenciaProduccion] = useState(datosPrevios.incidenciaProduccion || datosPrevios.roturaMaquinaria?.incidenciaProduccion || "");
  const [origenMaquinariaCritica, setOrigenMaquinariaCritica] = useState(datosPrevios.origenMaquinariaCritica || datosPrevios.roturaMaquinaria?.origenMaquinariaCritica || "");
  const [representacionNacionalMaquinaria, setRepresentacionNacionalMaquinaria] = useState(datosPrevios.representacionNacionalMaquinaria || datosPrevios.roturaMaquinaria?.representacionNacionalMaquinaria || "");
  const [maquinariaStandBy, setMaquinariaStandBy] = useState(datosPrevios.maquinariaStandBy || datosPrevios.roturaMaquinaria?.maquinariaStandBy || "");
  const [empresasSateliteProduccion, setEmpresasSateliteProduccion] = useState(datosPrevios.empresasSateliteProduccion || datosPrevios.roturaMaquinaria?.empresasSateliteProduccion || "");
  const [conveniosOtrasEmpresas, setConveniosOtrasEmpresas] = useState(datosPrevios.conveniosOtrasEmpresas || datosPrevios.roturaMaquinaria?.conveniosOtrasEmpresas || "");

  // Sincroniza TODOS los campos visibles de rotura de maquinaria
  // al objeto agrupado que se persiste en historial.
  useEffect(() => {
    setRoturaMaquinaria((prev) => ({
      ...prev,
      capacidadInstaladaPlanta,
      indicePromedioCapacidad,
      numeroLineasProduccion,
      maquinariaCritica,
      incidenciaProduccion,
      origenMaquinariaCritica,
      representacionNacionalMaquinaria,
      maquinariaStandBy,
      empresasSateliteProduccion,
      conveniosOtrasEmpresas,
    }));
  }, [
    capacidadInstaladaPlanta,
    indicePromedioCapacidad,
    numeroLineasProduccion,
    maquinariaCritica,
    incidenciaProduccion,
    origenMaquinariaCritica,
    representacionNacionalMaquinaria,
    maquinariaStandBy,
    empresasSateliteProduccion,
    conveniosOtrasEmpresas,
  ]);
  
  // Procesos Críticos y Riesgos Medioambientales
  const [procesosCriticos, setProcesosCriticos] = useState("");
  const [riesgosMedioambientales, setRiesgosMedioambientales] = useState("");
  // Por rotura de maquinaria - Agrupado para reducir re-renders
  const [roturaMaquinaria, setRoturaMaquinaria] = useState({
    capacidadInstaladaPlanta: "",
    indicePromedioCapacidad: "",
    numeroLineasProduccion: "",
    maquinariaCritica: "",
    incidenciaProduccion: "",
    origenMaquinariaCritica: "",
    representacionNacionalMaquinaria: "",
    maquinariaStandBy: "",
    empresasSateliteProduccion: "",
    conveniosOtrasEmpresas: ""
  });
  
  // Helper para actualizar rotura de maquinaria
  const updateRoturaMaquinaria = useCallback((field, value) => {
    setRoturaMaquinaria(prev => ({ ...prev, [field]: value }));
  }, []);
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

  // Características operativas ambientales - Agrupado para reducir re-renders
  const [caracteristicasAmbientales, setCaracteristicasAmbientales] = useState({
    licenciaAmbiental: "",
    permisoVertimientos: "",
    consumoAgua: "",
    bombillasAhorradoras: "",
    mercadoNoRegulado: "",
    vertimientoAguasResiduales: "",
    plantaTratamiento: "",
    planManejoResiduos: "",
    emisionesContaminantes: "",
    sistemaFiltracionGases: "",
    nivelesRuido: "",
    programaGestionAmbiental: ""
  });
  
  // Helper para actualizar características ambientales - Optimizado para reducir re-renders
  // Actualiza el objeto agrupado de forma diferida para evitar re-renders en cada cambio
  const caracteristicasAmbientalesTimeoutRef = useRef(null);
  
  const updateCaracteristicasAmbientales = useCallback((field, value) => {
    // Limpiar timeout anterior
    if (caracteristicasAmbientalesTimeoutRef.current) {
      clearTimeout(caracteristicasAmbientalesTimeoutRef.current);
    }
    
    // Actualizar el objeto agrupado después de un pequeño delay (debounce)
    // Esto evita que cada cambio dispare un re-render inmediato
    caracteristicasAmbientalesTimeoutRef.current = setTimeout(() => {
      setCaracteristicasAmbientales(prev => ({ ...prev, [field]: value }));
    }, 300);
  }, []);
  
  // Variables de estado separadas para campos de caracteristicasAmbientales que se usan directamente
  const [licenciaAmbiental, setLicenciaAmbiental] = useState(datosPrevios.licenciaAmbiental || datosPrevios.caracteristicasAmbientales?.licenciaAmbiental || "");
  const [permisoVertimientos, setPermisoVertimientos] = useState(datosPrevios.permisoVertimientos || datosPrevios.caracteristicasAmbientales?.permisoVertimientos || "");
  const [consumoAgua, setConsumoAgua] = useState(datosPrevios.consumoAgua || datosPrevios.caracteristicasAmbientales?.consumoAgua || "");
  const [bombillasAhorradoras, setBombillasAhorradoras] = useState(datosPrevios.bombillasAhorradoras || datosPrevios.caracteristicasAmbientales?.bombillasAhorradoras || "");
  const [mercadoNoRegulado, setMercadoNoRegulado] = useState(datosPrevios.mercadoNoRegulado || datosPrevios.caracteristicasAmbientales?.mercadoNoRegulado || "");
  const [vertimientoAguasResiduales, setVertimientoAguasResiduales] = useState(datosPrevios.vertimientoAguasResiduales || datosPrevios.caracteristicasAmbientales?.vertimientoAguasResiduales || "");
  const [plantaTratamiento, setPlantaTratamiento] = useState(datosPrevios.plantaTratamiento || datosPrevios.caracteristicasAmbientales?.plantaTratamiento || "");
  const [planManejoResiduos, setPlanManejoResiduos] = useState(datosPrevios.planManejoResiduos || datosPrevios.caracteristicasAmbientales?.planManejoResiduos || "");
  const [emisionesContaminantes, setEmisionesContaminantes] = useState(datosPrevios.emisionesContaminantes || datosPrevios.caracteristicasAmbientales?.emisionesContaminantes || "");
  const [sistemaFiltracionGases, setSistemaFiltracionGases] = useState(datosPrevios.sistemaFiltracionGases || datosPrevios.caracteristicasAmbientales?.sistemaFiltracionGases || "");
  const [nivelesRuido, setNivelesRuido] = useState(datosPrevios.nivelesRuido || datosPrevios.caracteristicasAmbientales?.nivelesRuido || "");
  const [programaGestionAmbiental, setProgramaGestionAmbiental] = useState(datosPrevios.programaGestionAmbiental || datosPrevios.caracteristicasAmbientales?.programaGestionAmbiental || "");

  // Sincroniza TODOS los campos visibles de características ambientales
  // al objeto agrupado que se persiste en historial.
  useEffect(() => {
    setCaracteristicasAmbientales((prev) => ({
      ...prev,
      licenciaAmbiental,
      permisoVertimientos,
      consumoAgua,
      bombillasAhorradoras,
      mercadoNoRegulado,
      vertimientoAguasResiduales,
      plantaTratamiento,
      planManejoResiduos,
      emisionesContaminantes,
      sistemaFiltracionGases,
      nivelesRuido,
      programaGestionAmbiental,
    }));
  }, [
    licenciaAmbiental,
    permisoVertimientos,
    consumoAgua,
    bombillasAhorradoras,
    mercadoNoRegulado,
    vertimientoAguasResiduales,
    plantaTratamiento,
    planManejoResiduos,
    emisionesContaminantes,
    sistemaFiltracionGases,
    nivelesRuido,
    programaGestionAmbiental,
  ]);
  
  // Proteccion contra Incendios - Detallado
  const [extintor, setExtintor] = useState("");
  const [rci, setRci] = useState("");
  const [rociadores, setRociadores] = useState("");
  const [deteccion, setDeteccion] = useState("");
  const [alarmas, setAlarmas] = useState("");
  const [brigadas, setBrigadas] = useState("");
  const [bomberos, setBomberos] = useState("");
  // Sistema de detección
  const [detectoresHumo, setDetectoresHumo] = useState("");
  const [coberturaDeteccion, setCoberturaDeteccion] = useState("");
  const [instalacionDeteccion, setInstalacionDeteccion] = useState("");
  const [monitoreadoDeteccion, setMonitoreadoDeteccion] = useState("");
  // Extintores detallado
  const [cantidadExtintores, setCantidadExtintores] = useState("");
  const [tipoExtintores, setTipoExtintores] = useState("");
  const [suficientesExtintores, setSuficientesExtintores] = useState("");
  const [instalacionExtintores, setInstalacionExtintores] = useState("");
  const [senalizacionExtintores, setSenalizacionExtintores] = useState("");
  const [cargaVigenteExtintores, setCargaVigenteExtintores] = useState("");
  const [comentariosProteccionIncendios, setComentariosProteccionIncendios] = useState("");
  // Protección incendios — bombeo, estación de bomberos, cortafuegos, RCI y pruebas
  const [bombaPrincipal, setBombaPrincipal] = useState("");
  const [bombaJockey, setBombaJockey] = useState("");
  const [presionContraincendios, setPresionContraincendios] = useState("");
  const [estacionBomberosNombre, setEstacionBomberosNombre] = useState("");
  const [estacionBomberosTiempoMin, setEstacionBomberosTiempoMin] = useState("");
  const [estacionBomberosDistanciaMetros, setEstacionBomberosDistanciaMetros] = useState("");
  const [murosCortafuegos, setMurosCortafuegos] = useState("");
  const [puertasCortafuego, setPuertasCortafuego] = useState("");
  const [almacenamientoAguaRci, setAlmacenamientoAguaRci] = useState("");
  const [pruebasProteccionIncendios, setPruebasProteccionIncendios] = useState("");

  //Seguridad
  const [seguridadDescripcion, setSeguridadDescripcion] = useState("");

  // Siniestralidad

  const [siniestralidad, setSiniestralidad] = useState("");
  const [siniestralidadAno, setSiniestralidadAno] = useState("");
  const [siniestralidadValor, setSiniestralidadValor] = useState("");
  const [siniestralidadDescripcion, setSiniestralidadDescripcion] = useState("");
  const [siniestralidadMejoras, setSiniestralidadMejoras] = useState("");
  useEffect(() => {
    setSiniestralidad(siniestralidadDescripcion);
  }, [siniestralidadDescripcion]);
  // 15. Almacenamiento (después de siniestralidad)
  const [almacenAlturaMaxima, setAlmacenAlturaMaxima] = useState("");
  const [almacenMatrizCompatibilidad, setAlmacenMatrizCompatibilidad] = useState("");
  const [almacenAlturaMaximaEstanteria, setAlmacenAlturaMaximaEstanteria] = useState("");
  const [mercPeligrosaTipo, setMercPeligrosaTipo] = useState("");
  const [mercPeligrosaTipoAlmacenamiento, setMercPeligrosaTipoAlmacenamiento] = useState("");
  const [mercPeligrosaProtecciones, setMercPeligrosaProtecciones] = useState("");

  // recomendaciones (lista estructurada; texto plano derivado para compatibilidad API/observaciones)
  const [nuevaRecomendacion, setNuevaRecomendacion] = useState("");
  const [recomendacionesItems, setRecomendacionesItems] = useState([]);
  const recomendaciones = useMemo(
    () => textoPlanoRecomendacionesDesdeItems(recomendacionesItems),
    [recomendacionesItems]
  );

  const [maquinariaDescripcion, setMaquinariaDescripcion] = useState("");
  const [promedioEdadEquipos, setPromedioEdadEquipos] = useState("");
  const [tipoMantenimientoEquipos, setTipoMantenimientoEquipos] = useState("");
  const [bitacorasMantenimiento, setBitacorasMantenimiento] = useState("");
  const [personalMantenimiento, setPersonalMantenimiento] = useState("");
  const [periodicidadMantenimientos, setPeriodicidadMantenimientos] = useState("");





  // Tabla de riesgo - sincronizada con analisisRiesgos
  const [tablaRiesgos, setTablaRiesgos] = useState(
    riesgosPorDefecto.map(riesgo => ({
      id: riesgo.id,
      riesgo: riesgo.riesgo,
      probabilidad: 0,
      severidad: 0,
      r: 0,
      indice: 0,
      clasificacion: "Bajo"
    }))
  );


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

  // Guardar banco de recomendaciones en localStorage cuando cambie (con debounce optimizado)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
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
    }, 5000); // Debounce de 5000ms (5 segundos) para evitar guardados excesivos y mejorar rendimiento

    return () => clearTimeout(timeoutId);
  }, [bancoRecomendaciones]);


  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [valorSelectBancoRecomendacion, setValorSelectBancoRecomendacion] = useState(
    SIN_SELECCION_BANCO_RECOMENDACION
  );

  useEffect(() => {
    setValorSelectBancoRecomendacion(SIN_SELECCION_BANCO_RECOMENDACION);
  }, [categoriaSeleccionada]);

  // Hook para manejar el historial
  const { guardando, exportando, guardarEnHistorial, exportarYGuardar } = useHistorialFormulario(TIPOS_FORMULARIOS.INSPECCION);
  
  // Estado para generar manual
  const [generandoManual, setGenerandoManual] = useState(false);
  
  // Función para generar manual
  const handleGenerarManual = async () => {
    try {
      setGenerandoManual(true);
await generarManualInspeccion();
      alert('✅ Manual generado exitosamente. Revisa la carpeta de descargas.');
    } catch (error) {
      console.error('❌ Error al generar manual:', error);
      alert('Error al generar el manual. Por favor, intente nuevamente.');
    } finally {
      setGenerandoManual(false);
    }
  };

  const handleAgregarRecomendacion = (recomendacion) => {
    if (!recomendacion || !String(recomendacion).trim()) return;
    const texto = String(recomendacion).trim();
    setRecomendacionesItems((prev) => {
      const codigo = crearCodigoRecomendacion(prev, new Date());
      return [
        ...prev,
        {
          id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          codigo,
          texto,
          fechaSeguimiento: fechaLocalIso(),
        },
      ];
    });
  };

  const handleAgregarRecomendacionVacia = () => {
    setRecomendacionesItems((prev) => {
      const codigo = crearCodigoRecomendacion(prev, new Date());
      return [
        ...prev,
        {
          id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          codigo,
          texto: "",
          fechaSeguimiento: fechaLocalIso(),
        },
      ];
    });
  };

  const handleActualizarRecomendacionItem = (id, parcial) => {
    setRecomendacionesItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...parcial } : it))
    );
  };

  const handleEliminarRecomendacionItem = (id) => {
    setRecomendacionesItems((prev) => {
      const filtrado = prev.filter((it) => it.id !== id);
      return renumerarCodigosRecomendaciones(filtrado);
    });
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
            if (datosParseados.puedeSuscribir !== undefined) setPuedeSuscribir(datosParseados.puedeSuscribir);
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
            if (datosParseados.tablaRiesgos !== undefined) setTablaRiesgos(datosParseados.tablaRiesgos);
            if (datosParseados.areas !== undefined) setAreas(datosParseados.areas);
            if (datosParseados.datosEquipos !== undefined) setDatosEquipos(datosParseados.datosEquipos);
            // Características de la construcción
            if (datosParseados.caracteristicasConstruccion !== undefined) setCaracteristicasConstruccion(datosParseados.caracteristicasConstruccion);
            if (datosParseados.anoConstruccion !== undefined) setAnoConstruccion(datosParseados.anoConstruccion);
            if (datosParseados.tipoEdificio !== undefined) setTipoEdificio(datosParseados.tipoEdificio);
            if (datosParseados.tipoEdificioOtro !== undefined) setTipoEdificioOtro(datosParseados.tipoEdificioOtro);
            if (datosParseados.areaLoteConstruccion !== undefined) setAreaLoteConstruccion(datosParseados.areaLoteConstruccion);
            if (datosParseados.areaConstruidaConstruccion !== undefined) setAreaConstruidaConstruccion(datosParseados.areaConstruidaConstruccion);
            if (datosParseados.numeroPisosConstruccion !== undefined) setNumeroPisosConstruccion(datosParseados.numeroPisosConstruccion);
            if (datosParseados.cimentacion !== undefined) setCimentacion(datosParseados.cimentacion);
            if (datosParseados.cimentacionOtro !== undefined) setCimentacionOtro(datosParseados.cimentacionOtro);
            if (datosParseados.materialesEstructura !== undefined) setMaterialesEstructura(datosParseados.materialesEstructura);
            if (datosParseados.materialesEstructuraOtro !== undefined) setMaterialesEstructuraOtro(datosParseados.materialesEstructuraOtro);
            if (datosParseados.regularidadPlanta !== undefined) setRegularidadPlanta(datosParseados.regularidadPlanta);
            if (datosParseados.danosPrevios !== undefined) setDanosPrevios(datosParseados.danosPrevios);
            if (datosParseados.reforzamientosEstructurales !== undefined) setReforzamientosEstructurales(datosParseados.reforzamientosEstructurales);
            if (datosParseados.sistemaEstructural !== undefined) setSistemaEstructural(datosParseados.sistemaEstructural);
            if (datosParseados.sistemaEstructuralOtro !== undefined) setSistemaEstructuralOtro(datosParseados.sistemaEstructuralOtro);
            if (datosParseados.estructuraCubierta !== undefined) setEstructuraCubierta(datosParseados.estructuraCubierta);
            if (datosParseados.estructuraCubiertaOtro !== undefined) setEstructuraCubiertaOtro(datosParseados.estructuraCubiertaOtro);
            if (datosParseados.regularAltura !== undefined) setRegularAltura(datosParseados.regularAltura);
            if (datosParseados.danosReparados !== undefined) setDanosReparados(datosParseados.danosReparados);
            // Materiales
            if (datosParseados.tipoInsumo !== undefined) setTipoInsumo(datosParseados.tipoInsumo);
            if (datosParseados.nivelRiesgoInsumo !== undefined) setNivelRiesgoInsumo(datosParseados.nivelRiesgoInsumo);
            if (datosParseados.descripcionContenidosInsumo !== undefined) setDescripcionContenidosInsumo(datosParseados.descripcionContenidosInsumo);
            if (datosParseados.contenedoresInsumo !== undefined) setContenedoresInsumo(datosParseados.contenedoresInsumo);
            if (datosParseados.tipoAlmacenamientoInsumo !== undefined) setTipoAlmacenamientoInsumo(datosParseados.tipoAlmacenamientoInsumo);
            if (datosParseados.estadoAlmacenamientoInsumo !== undefined) setEstadoAlmacenamientoInsumo(datosParseados.estadoAlmacenamientoInsumo);
            if (datosParseados.tipoMateriasPrimas !== undefined) setTipoMateriasPrimas(datosParseados.tipoMateriasPrimas);
            if (datosParseados.nivelRiesgoMateriasPrimas !== undefined) setNivelRiesgoMateriasPrimas(datosParseados.nivelRiesgoMateriasPrimas);
            if (datosParseados.descripcionContenidosMateriasPrimas !== undefined) setDescripcionContenidosMateriasPrimas(datosParseados.descripcionContenidosMateriasPrimas);
            if (datosParseados.contenedoresMateriasPrimas !== undefined) setContenedoresMateriasPrimas(datosParseados.contenedoresMateriasPrimas);
            if (datosParseados.tipoAlmacenamientoMateriasPrimas !== undefined) setTipoAlmacenamientoMateriasPrimas(datosParseados.tipoAlmacenamientoMateriasPrimas);
            if (datosParseados.estadoAlmacenamientoMateriasPrimas !== undefined) setEstadoAlmacenamientoMateriasPrimas(datosParseados.estadoAlmacenamientoMateriasPrimas);
            if (datosParseados.tipoMercancias !== undefined) setTipoMercancias(datosParseados.tipoMercancias);
            if (datosParseados.nivelRiesgoMercancias !== undefined) setNivelRiesgoMercancias(datosParseados.nivelRiesgoMercancias);
            if (datosParseados.descripcionContenidosMercancias !== undefined) setDescripcionContenidosMercancias(datosParseados.descripcionContenidosMercancias);
            if (datosParseados.contenedoresMercancias !== undefined) setContenedoresMercancias(datosParseados.contenedoresMercancias);
            if (datosParseados.tipoAlmacenamientoMercancias !== undefined) setTipoAlmacenamientoMercancias(datosParseados.tipoAlmacenamientoMercancias);
            if (datosParseados.estadoAlmacenamientoMercancias !== undefined) setEstadoAlmacenamientoMercancias(datosParseados.estadoAlmacenamientoMercancias);
            if (datosParseados.tipoInsumoOtro !== undefined) setTipoInsumoOtro(datosParseados.tipoInsumoOtro);
            if (datosParseados.contenedoresInsumoOtro !== undefined) setContenedoresInsumoOtro(datosParseados.contenedoresInsumoOtro);
            if (datosParseados.tipoAlmacenamientoInsumoOtro !== undefined) setTipoAlmacenamientoInsumoOtro(datosParseados.tipoAlmacenamientoInsumoOtro);
            if (datosParseados.tipoMateriasPrimasOtro !== undefined) setTipoMateriasPrimasOtro(datosParseados.tipoMateriasPrimasOtro);
            if (datosParseados.contenedoresMateriasPrimasOtro !== undefined) setContenedoresMateriasPrimasOtro(datosParseados.contenedoresMateriasPrimasOtro);
            if (datosParseados.tipoAlmacenamientoMateriasPrimasOtro !== undefined) setTipoAlmacenamientoMateriasPrimasOtro(datosParseados.tipoAlmacenamientoMateriasPrimasOtro);
            if (datosParseados.tipoMercanciasOtro !== undefined) setTipoMercanciasOtro(datosParseados.tipoMercanciasOtro);
            if (datosParseados.contenedoresMercanciasOtro !== undefined) setContenedoresMercanciasOtro(datosParseados.contenedoresMercanciasOtro);
            if (datosParseados.tipoAlmacenamientoMercanciasOtro !== undefined) setTipoAlmacenamientoMercanciasOtro(datosParseados.tipoAlmacenamientoMercanciasOtro);
            // Características operativas ambientales - usar estado agrupado
            if (datosParseados.caracteristicasAmbientales) {
              setCaracteristicasAmbientales(datosParseados.caracteristicasAmbientales);
              // También inicializar variables separadas desde caracteristicasAmbientales
              if (datosParseados.caracteristicasAmbientales.licenciaAmbiental !== undefined) setLicenciaAmbiental(datosParseados.caracteristicasAmbientales.licenciaAmbiental);
              if (datosParseados.caracteristicasAmbientales.permisoVertimientos !== undefined) setPermisoVertimientos(datosParseados.caracteristicasAmbientales.permisoVertimientos);
              if (datosParseados.caracteristicasAmbientales.consumoAgua !== undefined) setConsumoAgua(datosParseados.caracteristicasAmbientales.consumoAgua);
              if (datosParseados.caracteristicasAmbientales.bombillasAhorradoras !== undefined) setBombillasAhorradoras(datosParseados.caracteristicasAmbientales.bombillasAhorradoras);
              if (datosParseados.caracteristicasAmbientales.mercadoNoRegulado !== undefined) setMercadoNoRegulado(datosParseados.caracteristicasAmbientales.mercadoNoRegulado);
              if (datosParseados.caracteristicasAmbientales.vertimientoAguasResiduales !== undefined) setVertimientoAguasResiduales(datosParseados.caracteristicasAmbientales.vertimientoAguasResiduales);
              if (datosParseados.caracteristicasAmbientales.plantaTratamiento !== undefined) setPlantaTratamiento(datosParseados.caracteristicasAmbientales.plantaTratamiento);
              if (datosParseados.caracteristicasAmbientales.planManejoResiduos !== undefined) setPlanManejoResiduos(datosParseados.caracteristicasAmbientales.planManejoResiduos);
              if (datosParseados.caracteristicasAmbientales.emisionesContaminantes !== undefined) setEmisionesContaminantes(datosParseados.caracteristicasAmbientales.emisionesContaminantes);
              if (datosParseados.caracteristicasAmbientales.sistemaFiltracionGases !== undefined) setSistemaFiltracionGases(datosParseados.caracteristicasAmbientales.sistemaFiltracionGases);
              if (datosParseados.caracteristicasAmbientales.nivelesRuido !== undefined) setNivelesRuido(datosParseados.caracteristicasAmbientales.nivelesRuido);
              if (datosParseados.caracteristicasAmbientales.programaGestionAmbiental !== undefined) setProgramaGestionAmbiental(datosParseados.caracteristicasAmbientales.programaGestionAmbiental);
            } else {
              // Compatibilidad con formato antiguo
              setCaracteristicasAmbientales({
                licenciaAmbiental: datosParseados.licenciaAmbiental || "",
                permisoVertimientos: datosParseados.permisoVertimientos || "",
                consumoAgua: datosParseados.consumoAgua || "",
                bombillasAhorradoras: datosParseados.bombillasAhorradoras || "",
                mercadoNoRegulado: datosParseados.mercadoNoRegulado || "",
                vertimientoAguasResiduales: datosParseados.vertimientoAguasResiduales || "",
                plantaTratamiento: datosParseados.plantaTratamiento || "",
                planManejoResiduos: datosParseados.planManejoResiduos || "",
                emisionesContaminantes: datosParseados.emisionesContaminantes || "",
                sistemaFiltracionGases: datosParseados.sistemaFiltracionGases || "",
                nivelesRuido: datosParseados.nivelesRuido || "",
                programaGestionAmbiental: datosParseados.programaGestionAmbiental || ""
              });
              // Inicializar variables separadas desde formato antiguo
              if (datosParseados.licenciaAmbiental !== undefined) setLicenciaAmbiental(datosParseados.licenciaAmbiental);
              if (datosParseados.permisoVertimientos !== undefined) setPermisoVertimientos(datosParseados.permisoVertimientos);
              if (datosParseados.consumoAgua !== undefined) setConsumoAgua(datosParseados.consumoAgua);
              if (datosParseados.bombillasAhorradoras !== undefined) setBombillasAhorradoras(datosParseados.bombillasAhorradoras);
              if (datosParseados.mercadoNoRegulado !== undefined) setMercadoNoRegulado(datosParseados.mercadoNoRegulado);
              if (datosParseados.vertimientoAguasResiduales !== undefined) setVertimientoAguasResiduales(datosParseados.vertimientoAguasResiduales);
              if (datosParseados.plantaTratamiento !== undefined) setPlantaTratamiento(datosParseados.plantaTratamiento);
              if (datosParseados.planManejoResiduos !== undefined) setPlanManejoResiduos(datosParseados.planManejoResiduos);
              if (datosParseados.emisionesContaminantes !== undefined) setEmisionesContaminantes(datosParseados.emisionesContaminantes);
              if (datosParseados.sistemaFiltracionGases !== undefined) setSistemaFiltracionGases(datosParseados.sistemaFiltracionGases);
              if (datosParseados.nivelesRuido !== undefined) setNivelesRuido(datosParseados.nivelesRuido);
              if (datosParseados.programaGestionAmbiental !== undefined) setProgramaGestionAmbiental(datosParseados.programaGestionAmbiental);
            }
            // Protección contra incendios
            if (datosParseados.detectoresHumo !== undefined) setDetectoresHumo(datosParseados.detectoresHumo);
            if (datosParseados.coberturaDeteccion !== undefined) setCoberturaDeteccion(datosParseados.coberturaDeteccion);
            if (datosParseados.instalacionDeteccion !== undefined) setInstalacionDeteccion(datosParseados.instalacionDeteccion);
            if (datosParseados.monitoreadoDeteccion !== undefined) setMonitoreadoDeteccion(datosParseados.monitoreadoDeteccion);
            if (datosParseados.cantidadExtintores !== undefined) setCantidadExtintores(datosParseados.cantidadExtintores);
            if (datosParseados.tipoExtintores !== undefined) setTipoExtintores(datosParseados.tipoExtintores);
            if (datosParseados.suficientesExtintores !== undefined) setSuficientesExtintores(datosParseados.suficientesExtintores);
            if (datosParseados.instalacionExtintores !== undefined) setInstalacionExtintores(datosParseados.instalacionExtintores);
            if (datosParseados.senalizacionExtintores !== undefined) setSenalizacionExtintores(datosParseados.senalizacionExtintores);
            if (datosParseados.cargaVigenteExtintores !== undefined) setCargaVigenteExtintores(datosParseados.cargaVigenteExtintores);
            if (datosParseados.comentariosProteccionIncendios !== undefined) setComentariosProteccionIncendios(datosParseados.comentariosProteccionIncendios);
            if (datosParseados.bombaPrincipal !== undefined) setBombaPrincipal(datosParseados.bombaPrincipal);
            if (datosParseados.bombaJockey !== undefined) setBombaJockey(datosParseados.bombaJockey);
            if (datosParseados.presionContraincendios !== undefined) setPresionContraincendios(datosParseados.presionContraincendios);
            if (datosParseados.estacionBomberosNombre !== undefined) setEstacionBomberosNombre(datosParseados.estacionBomberosNombre);
            if (datosParseados.estacionBomberosTiempoMin !== undefined) setEstacionBomberosTiempoMin(datosParseados.estacionBomberosTiempoMin);
            if (datosParseados.estacionBomberosDistanciaMetros !== undefined) setEstacionBomberosDistanciaMetros(datosParseados.estacionBomberosDistanciaMetros);
            if (datosParseados.murosCortafuegos !== undefined) setMurosCortafuegos(datosParseados.murosCortafuegos);
            if (datosParseados.puertasCortafuego !== undefined) setPuertasCortafuego(datosParseados.puertasCortafuego);
            if (datosParseados.almacenamientoAguaRci !== undefined) setAlmacenamientoAguaRci(datosParseados.almacenamientoAguaRci);
            if (datosParseados.pruebasProteccionIncendios !== undefined) setPruebasProteccionIncendios(datosParseados.pruebasProteccionIncendios);
            if (datosParseados.extintor !== undefined) setExtintor(datosParseados.extintor);
            if (datosParseados.rci !== undefined) setRci(datosParseados.rci);
            if (datosParseados.rociadores !== undefined) setRociadores(datosParseados.rociadores);
            if (datosParseados.deteccion !== undefined) setDeteccion(datosParseados.deteccion);
            if (datosParseados.alarmas !== undefined) setAlarmas(datosParseados.alarmas);
            if (datosParseados.brigadas !== undefined) setBrigadas(datosParseados.brigadas);
            if (datosParseados.bomberos !== undefined) setBomberos(datosParseados.bomberos);
            // Sustracción - Protecciones Físicas - usar estado agrupado
            if (datosParseados.sustraccion) {
              setSustraccion(datosParseados.sustraccion);
              // También inicializar variables separadas desde sustraccion
              if (datosParseados.sustraccion.ubicacionPredio !== undefined) setUbicacionPredio(datosParseados.sustraccion.ubicacionPredio);
              if (datosParseados.sustraccion.vulnerabilidadContenidos !== undefined) setVulnerabilidadContenidos(datosParseados.sustraccion.vulnerabilidadContenidos);
              if (datosParseados.sustraccion.accesoInstalaciones !== undefined) setAccesoInstalaciones(datosParseados.sustraccion.accesoInstalaciones);
              if (datosParseados.sustraccion.circulacionPersonasExternas !== undefined) setCirculacionPersonasExternas(datosParseados.sustraccion.circulacionPersonasExternas);
              if (datosParseados.sustraccion.proteccionesPasivas !== undefined) setProteccionesPasivas(datosParseados.sustraccion.proteccionesPasivas);
              if (datosParseados.sustraccion.ubicacionPredioOtro !== undefined) setUbicacionPredioOtro(datosParseados.sustraccion.ubicacionPredioOtro);
              if (datosParseados.sustraccion.vulnerabilidadContenidosOtro !== undefined) setVulnerabilidadContenidosOtro(datosParseados.sustraccion.vulnerabilidadContenidosOtro);
              if (datosParseados.sustraccion.accesoInstalacionesOtro !== undefined) setAccesoInstalacionesOtro(datosParseados.sustraccion.accesoInstalacionesOtro);
              if (datosParseados.sustraccion.circulacionPersonasExternasOtro !== undefined) setCirculacionPersonasExternasOtro(datosParseados.sustraccion.circulacionPersonasExternasOtro);
              if (datosParseados.sustraccion.proteccionesPasivasOtro !== undefined) setProteccionesPasivasOtro(datosParseados.sustraccion.proteccionesPasivasOtro);
              // Sistema de Alarma
              if (datosParseados.sustraccion.tieneAlarma !== undefined) setTieneAlarma(datosParseados.sustraccion.tieneAlarma);
              if (datosParseados.sustraccion.alarmaMonitoreadaSustraccion !== undefined) setAlarmaMonitoreadaSustraccion(datosParseados.sustraccion.alarmaMonitoreadaSustraccion);
              if (datosParseados.sustraccion.empresaMonitorea !== undefined) setEmpresaMonitorea(datosParseados.sustraccion.empresaMonitorea);
              if (datosParseados.sustraccion.tipoComunicacionAlarma !== undefined) setTipoComunicacionAlarma(datosParseados.sustraccion.tipoComunicacionAlarma);
              if (datosParseados.sustraccion.coberturaAlarma !== undefined) setCoberturaAlarma(datosParseados.sustraccion.coberturaAlarma);
              if (datosParseados.sustraccion.sensoresAlarma !== undefined) setSensoresAlarma(datosParseados.sustraccion.sensoresAlarma);
              if (datosParseados.sustraccion.tipoComunicacionAlarmaOtro !== undefined) setTipoComunicacionAlarmaOtro(datosParseados.sustraccion.tipoComunicacionAlarmaOtro);
              if (datosParseados.sustraccion.sensoresAlarmaOtro !== undefined) setSensoresAlarmaOtro(datosParseados.sustraccion.sensoresAlarmaOtro);
              // CCTV
              if (datosParseados.sustraccion.cuentaConCCTV !== undefined) setCuentaConCCTV(datosParseados.sustraccion.cuentaConCCTV);
              if (datosParseados.sustraccion.numeroCamaras !== undefined) setNumeroCamaras(datosParseados.sustraccion.numeroCamaras);
              if (datosParseados.sustraccion.controladoPor !== undefined) setControladoPor(datosParseados.sustraccion.controladoPor);
              if (datosParseados.sustraccion.tipoMonitoreoCCTV !== undefined) setTipoMonitoreoCCTV(datosParseados.sustraccion.tipoMonitoreoCCTV);
              if (datosParseados.sustraccion.frecuenciaGrabacion !== undefined) setFrecuenciaGrabacion(datosParseados.sustraccion.frecuenciaGrabacion);
              if (datosParseados.sustraccion.tiempoRespaldo !== undefined) setTiempoRespaldo(datosParseados.sustraccion.tiempoRespaldo);
              if (datosParseados.sustraccion.dispositivoGrabacion !== undefined) setDispositivoGrabacion(datosParseados.sustraccion.dispositivoGrabacion);
              if (datosParseados.sustraccion.ubicacionGrabador !== undefined) setUbicacionGrabador(datosParseados.sustraccion.ubicacionGrabador);
              if (datosParseados.sustraccion.visualizacionInternet !== undefined) setVisualizacionInternet(datosParseados.sustraccion.visualizacionInternet);
              if (datosParseados.sustraccion.controladoPorOtro !== undefined) setControladoPorOtro(datosParseados.sustraccion.controladoPorOtro);
              if (datosParseados.sustraccion.tipoMonitoreoCCTVOtro !== undefined) setTipoMonitoreoCCTVOtro(datosParseados.sustraccion.tipoMonitoreoCCTVOtro);
              if (datosParseados.sustraccion.frecuenciaGrabacionOtro !== undefined) setFrecuenciaGrabacionOtro(datosParseados.sustraccion.frecuenciaGrabacionOtro);
              if (datosParseados.sustraccion.dispositivoGrabacionOtro !== undefined) setDispositivoGrabacionOtro(datosParseados.sustraccion.dispositivoGrabacionOtro);
              if (datosParseados.sustraccion.ubicacionGrabadorOtro !== undefined) setUbicacionGrabadorOtro(datosParseados.sustraccion.ubicacionGrabadorOtro);
              // Vigilancia
              if (datosParseados.sustraccion.cuentaConVigilancia !== undefined) setCuentaConVigilancia(datosParseados.sustraccion.cuentaConVigilancia);
              if (datosParseados.sustraccion.contratadaCon !== undefined) setContratadaCon(datosParseados.sustraccion.contratadaCon);
              if (datosParseados.sustraccion.numeroVigilantes !== undefined) setNumeroVigilantes(datosParseados.sustraccion.numeroVigilantes);
              if (datosParseados.sustraccion.jornadaVigilancia !== undefined) setJornadaVigilancia(datosParseados.sustraccion.jornadaVigilancia);
              if (datosParseados.sustraccion.tienenArmas !== undefined) setTienenArmas(datosParseados.sustraccion.tienenArmas);
              if (datosParseados.sustraccion.tienenRadio !== undefined) setTienenRadio(datosParseados.sustraccion.tienenRadio);
              if (datosParseados.sustraccion.jornadaVigilanciaOtro !== undefined) setJornadaVigilanciaOtro(datosParseados.sustraccion.jornadaVigilanciaOtro);
              if (datosParseados.sustraccion.personalRecaudo !== undefined) setPersonalRecaudo(datosParseados.sustraccion.personalRecaudo);
              if (datosParseados.sustraccion.horariosRecaudo !== undefined) setHorariosRecaudo(datosParseados.sustraccion.horariosRecaudo);
              if (datosParseados.sustraccion.lugarRecaudo !== undefined) setLugarRecaudo(datosParseados.sustraccion.lugarRecaudo);
              if (datosParseados.sustraccion.transporteDinero !== undefined) setTransporteDinero(datosParseados.sustraccion.transporteDinero);
            } else {
              // Compatibilidad con formato antiguo
              setSustraccion({
                ubicacionPredio: datosParseados.ubicacionPredio || "",
                vulnerabilidadContenidos: datosParseados.vulnerabilidadContenidos || "",
                accesoInstalaciones: datosParseados.accesoInstalaciones || "",
                circulacionPersonasExternas: datosParseados.circulacionPersonasExternas || "",
                proteccionesPasivas: datosParseados.proteccionesPasivas || "",
                tieneAlarma: datosParseados.tieneAlarma || "",
                alarmaMonitoreadaSustraccion: datosParseados.alarmaMonitoreadaSustraccion || "",
                empresaMonitorea: datosParseados.empresaMonitorea || "",
                tipoComunicacionAlarma: datosParseados.tipoComunicacionAlarma || "",
                coberturaAlarma: datosParseados.coberturaAlarma || "",
                sensoresAlarma: datosParseados.sensoresAlarma || "",
                cuentaConCCTV: datosParseados.cuentaConCCTV || "",
                numeroCamaras: datosParseados.numeroCamaras || "",
                controladoPor: datosParseados.controladoPor || "",
                tipoMonitoreoCCTV: datosParseados.tipoMonitoreoCCTV || "",
                frecuenciaGrabacion: datosParseados.frecuenciaGrabacion || "",
                tiempoRespaldo: datosParseados.tiempoRespaldo || "",
                dispositivoGrabacion: datosParseados.dispositivoGrabacion || "",
                ubicacionGrabador: datosParseados.ubicacionGrabador || "",
                visualizacionInternet: datosParseados.visualizacionInternet || "",
                cuentaConVigilancia: datosParseados.cuentaConVigilancia || "",
                contratadaCon: datosParseados.contratadaCon || "",
                numeroVigilantes: datosParseados.numeroVigilantes || "",
                jornadaVigilancia: datosParseados.jornadaVigilancia || "",
                tienenArmas: datosParseados.tienenArmas || "",
                tienenRadio: datosParseados.tienenRadio || "",
                personalRecaudo: datosParseados.personalRecaudo || "",
                horariosRecaudo: datosParseados.horariosRecaudo || "",
                lugarRecaudo: datosParseados.lugarRecaudo || "",
                transporteDinero: datosParseados.transporteDinero || "",
                ubicacionPredioOtro: datosParseados.ubicacionPredioOtro || "",
                vulnerabilidadContenidosOtro: datosParseados.vulnerabilidadContenidosOtro || "",
                accesoInstalacionesOtro: datosParseados.accesoInstalacionesOtro || "",
                circulacionPersonasExternasOtro: datosParseados.circulacionPersonasExternasOtro || "",
                proteccionesPasivasOtro: datosParseados.proteccionesPasivasOtro || "",
                tipoComunicacionAlarmaOtro: datosParseados.tipoComunicacionAlarmaOtro || "",
                sensoresAlarmaOtro: datosParseados.sensoresAlarmaOtro || "",
                controladoPorOtro: datosParseados.controladoPorOtro || "",
                tipoMonitoreoCCTVOtro: datosParseados.tipoMonitoreoCCTVOtro || "",
                frecuenciaGrabacionOtro: datosParseados.frecuenciaGrabacionOtro || "",
                dispositivoGrabacionOtro: datosParseados.dispositivoGrabacionOtro || "",
                ubicacionGrabadorOtro: datosParseados.ubicacionGrabadorOtro || "",
                jornadaVigilanciaOtro: datosParseados.jornadaVigilanciaOtro || ""
              });
              // Inicializar variables separadas desde formato antiguo
              if (datosParseados.ubicacionPredio !== undefined) setUbicacionPredio(datosParseados.ubicacionPredio);
              if (datosParseados.vulnerabilidadContenidos !== undefined) setVulnerabilidadContenidos(datosParseados.vulnerabilidadContenidos);
              if (datosParseados.accesoInstalaciones !== undefined) setAccesoInstalaciones(datosParseados.accesoInstalaciones);
              if (datosParseados.circulacionPersonasExternas !== undefined) setCirculacionPersonasExternas(datosParseados.circulacionPersonasExternas);
              if (datosParseados.proteccionesPasivas !== undefined) setProteccionesPasivas(datosParseados.proteccionesPasivas);
              if (datosParseados.ubicacionPredioOtro !== undefined) setUbicacionPredioOtro(datosParseados.ubicacionPredioOtro);
              if (datosParseados.vulnerabilidadContenidosOtro !== undefined) setVulnerabilidadContenidosOtro(datosParseados.vulnerabilidadContenidosOtro);
              if (datosParseados.accesoInstalacionesOtro !== undefined) setAccesoInstalacionesOtro(datosParseados.accesoInstalacionesOtro);
              if (datosParseados.circulacionPersonasExternasOtro !== undefined) setCirculacionPersonasExternasOtro(datosParseados.circulacionPersonasExternasOtro);
              if (datosParseados.proteccionesPasivasOtro !== undefined) setProteccionesPasivasOtro(datosParseados.proteccionesPasivasOtro);
              // Sistema de Alarma
              if (datosParseados.tieneAlarma !== undefined) setTieneAlarma(datosParseados.tieneAlarma);
              if (datosParseados.alarmaMonitoreadaSustraccion !== undefined) setAlarmaMonitoreadaSustraccion(datosParseados.alarmaMonitoreadaSustraccion);
              if (datosParseados.empresaMonitorea !== undefined) setEmpresaMonitorea(datosParseados.empresaMonitorea);
              if (datosParseados.tipoComunicacionAlarma !== undefined) setTipoComunicacionAlarma(datosParseados.tipoComunicacionAlarma);
              if (datosParseados.coberturaAlarma !== undefined) setCoberturaAlarma(datosParseados.coberturaAlarma);
              if (datosParseados.sensoresAlarma !== undefined) setSensoresAlarma(datosParseados.sensoresAlarma);
              if (datosParseados.tipoComunicacionAlarmaOtro !== undefined) setTipoComunicacionAlarmaOtro(datosParseados.tipoComunicacionAlarmaOtro);
              if (datosParseados.sensoresAlarmaOtro !== undefined) setSensoresAlarmaOtro(datosParseados.sensoresAlarmaOtro);
              // CCTV
              if (datosParseados.cuentaConCCTV !== undefined) setCuentaConCCTV(datosParseados.cuentaConCCTV);
              if (datosParseados.numeroCamaras !== undefined) setNumeroCamaras(datosParseados.numeroCamaras);
              if (datosParseados.controladoPor !== undefined) setControladoPor(datosParseados.controladoPor);
              if (datosParseados.tipoMonitoreoCCTV !== undefined) setTipoMonitoreoCCTV(datosParseados.tipoMonitoreoCCTV);
              if (datosParseados.frecuenciaGrabacion !== undefined) setFrecuenciaGrabacion(datosParseados.frecuenciaGrabacion);
              if (datosParseados.tiempoRespaldo !== undefined) setTiempoRespaldo(datosParseados.tiempoRespaldo);
              if (datosParseados.dispositivoGrabacion !== undefined) setDispositivoGrabacion(datosParseados.dispositivoGrabacion);
              if (datosParseados.ubicacionGrabador !== undefined) setUbicacionGrabador(datosParseados.ubicacionGrabador);
              if (datosParseados.visualizacionInternet !== undefined) setVisualizacionInternet(datosParseados.visualizacionInternet);
              if (datosParseados.controladoPorOtro !== undefined) setControladoPorOtro(datosParseados.controladoPorOtro);
              if (datosParseados.tipoMonitoreoCCTVOtro !== undefined) setTipoMonitoreoCCTVOtro(datosParseados.tipoMonitoreoCCTVOtro);
              if (datosParseados.frecuenciaGrabacionOtro !== undefined) setFrecuenciaGrabacionOtro(datosParseados.frecuenciaGrabacionOtro);
              if (datosParseados.dispositivoGrabacionOtro !== undefined) setDispositivoGrabacionOtro(datosParseados.dispositivoGrabacionOtro);
              if (datosParseados.ubicacionGrabadorOtro !== undefined) setUbicacionGrabadorOtro(datosParseados.ubicacionGrabadorOtro);
              // Vigilancia
              if (datosParseados.cuentaConVigilancia !== undefined) setCuentaConVigilancia(datosParseados.cuentaConVigilancia);
              if (datosParseados.contratadaCon !== undefined) setContratadaCon(datosParseados.contratadaCon);
              if (datosParseados.numeroVigilantes !== undefined) setNumeroVigilantes(datosParseados.numeroVigilantes);
              if (datosParseados.jornadaVigilancia !== undefined) setJornadaVigilancia(datosParseados.jornadaVigilancia);
              if (datosParseados.tienenArmas !== undefined) setTienenArmas(datosParseados.tienenArmas);
              if (datosParseados.tienenRadio !== undefined) setTienenRadio(datosParseados.tienenRadio);
              if (datosParseados.jornadaVigilanciaOtro !== undefined) setJornadaVigilanciaOtro(datosParseados.jornadaVigilanciaOtro);
              if (datosParseados.personalRecaudo !== undefined) setPersonalRecaudo(datosParseados.personalRecaudo);
              if (datosParseados.horariosRecaudo !== undefined) setHorariosRecaudo(datosParseados.horariosRecaudo);
              if (datosParseados.lugarRecaudo !== undefined) setLugarRecaudo(datosParseados.lugarRecaudo);
              if (datosParseados.transporteDinero !== undefined) setTransporteDinero(datosParseados.transporteDinero);
            }
            // Lucro Cesante - usar estado agrupado
            if (datosParseados.lucroCesante) {
              setLucroCesante(datosParseados.lucroCesante);
              // También inicializar variables separadas desde lucroCesante
              if (datosParseados.lucroCesante.areaRequeridaLucroCesante !== undefined) setAreaRequeridaLucroCesante(datosParseados.lucroCesante.areaRequeridaLucroCesante);
              if (datosParseados.lucroCesante.complejidadActividadLucroCesante !== undefined) setComplejidadActividadLucroCesante(datosParseados.lucroCesante.complejidadActividadLucroCesante);
              if (datosParseados.lucroCesante.areaRequeridaLucroCesanteOtro !== undefined) setAreaRequeridaLucroCesanteOtro(datosParseados.lucroCesante.areaRequeridaLucroCesanteOtro);
              if (datosParseados.lucroCesante.complejidadActividadLucroCesanteOtro !== undefined) setComplejidadActividadLucroCesanteOtro(datosParseados.lucroCesante.complejidadActividadLucroCesanteOtro);
              if (datosParseados.lucroCesante.planContinuidadNegocio !== undefined) setPlanContinuidadNegocio(datosParseados.lucroCesante.planContinuidadNegocio);
              if (datosParseados.lucroCesante.valorNominaMensual !== undefined) setValorNominaMensual(datosParseados.lucroCesante.valorNominaMensual);
              if (datosParseados.lucroCesante.valorFacturacionAnoAnterior !== undefined) setValorFacturacionAnoAnterior(datosParseados.lucroCesante.valorFacturacionAnoAnterior);
              if (datosParseados.lucroCesante.valorProyectadoFacturacion !== undefined) setValorProyectadoFacturacion(datosParseados.lucroCesante.valorProyectadoFacturacion);
              if (datosParseados.lucroCesante.comentariosLucroCesante !== undefined) setComentariosLucroCesante(datosParseados.lucroCesante.comentariosLucroCesante);
            } else {
              // Compatibilidad con formato antiguo
              setLucroCesante({
                areaRequeridaLucroCesante: datosParseados.areaRequeridaLucroCesante || "",
                complejidadActividadLucroCesante: datosParseados.complejidadActividadLucroCesante || "",
                planContinuidadNegocio: datosParseados.planContinuidadNegocio || "",
                valorNominaMensual: datosParseados.valorNominaMensual || "",
                valorFacturacionAnoAnterior: datosParseados.valorFacturacionAnoAnterior || "",
                valorProyectadoFacturacion: datosParseados.valorProyectadoFacturacion || "",
                comentariosLucroCesante: datosParseados.comentariosLucroCesante || "",
                areaRequeridaLucroCesanteOtro: datosParseados.areaRequeridaLucroCesanteOtro || "",
                complejidadActividadLucroCesanteOtro: datosParseados.complejidadActividadLucroCesanteOtro || ""
              });
              // Inicializar variables separadas desde formato antiguo
              if (datosParseados.areaRequeridaLucroCesante !== undefined) setAreaRequeridaLucroCesante(datosParseados.areaRequeridaLucroCesante);
              if (datosParseados.complejidadActividadLucroCesante !== undefined) setComplejidadActividadLucroCesante(datosParseados.complejidadActividadLucroCesante);
              if (datosParseados.areaRequeridaLucroCesanteOtro !== undefined) setAreaRequeridaLucroCesanteOtro(datosParseados.areaRequeridaLucroCesanteOtro);
              if (datosParseados.complejidadActividadLucroCesanteOtro !== undefined) setComplejidadActividadLucroCesanteOtro(datosParseados.complejidadActividadLucroCesanteOtro);
              if (datosParseados.planContinuidadNegocio !== undefined) setPlanContinuidadNegocio(datosParseados.planContinuidadNegocio);
              if (datosParseados.valorNominaMensual !== undefined) setValorNominaMensual(datosParseados.valorNominaMensual);
              if (datosParseados.valorFacturacionAnoAnterior !== undefined) setValorFacturacionAnoAnterior(datosParseados.valorFacturacionAnoAnterior);
              if (datosParseados.valorProyectadoFacturacion !== undefined) setValorProyectadoFacturacion(datosParseados.valorProyectadoFacturacion);
              if (datosParseados.comentariosLucroCesante !== undefined) setComentariosLucroCesante(datosParseados.comentariosLucroCesante);
            }
            // Procesos Críticos y Riesgos Medioambientales
            if (datosParseados.procesosCriticos !== undefined) setProcesosCriticos(datosParseados.procesosCriticos);
            if (datosParseados.riesgosMedioambientales !== undefined) setRiesgosMedioambientales(datosParseados.riesgosMedioambientales);
            // Por rotura de maquinaria - usar estado agrupado
            if (datosParseados.roturaMaquinaria) {
              setRoturaMaquinaria(datosParseados.roturaMaquinaria);
              // También inicializar variables separadas desde roturaMaquinaria
              if (datosParseados.roturaMaquinaria.capacidadInstaladaPlanta !== undefined) setCapacidadInstaladaPlanta(datosParseados.roturaMaquinaria.capacidadInstaladaPlanta);
              if (datosParseados.roturaMaquinaria.indicePromedioCapacidad !== undefined) setIndicePromedioCapacidad(datosParseados.roturaMaquinaria.indicePromedioCapacidad);
              if (datosParseados.roturaMaquinaria.numeroLineasProduccion !== undefined) setNumeroLineasProduccion(datosParseados.roturaMaquinaria.numeroLineasProduccion);
              if (datosParseados.roturaMaquinaria.maquinariaCritica !== undefined) setMaquinariaCritica(datosParseados.roturaMaquinaria.maquinariaCritica);
              if (datosParseados.roturaMaquinaria.incidenciaProduccion !== undefined) setIncidenciaProduccion(datosParseados.roturaMaquinaria.incidenciaProduccion);
              if (datosParseados.roturaMaquinaria.origenMaquinariaCritica !== undefined) setOrigenMaquinariaCritica(datosParseados.roturaMaquinaria.origenMaquinariaCritica);
              if (datosParseados.roturaMaquinaria.representacionNacionalMaquinaria !== undefined) setRepresentacionNacionalMaquinaria(datosParseados.roturaMaquinaria.representacionNacionalMaquinaria);
              if (datosParseados.roturaMaquinaria.maquinariaStandBy !== undefined) setMaquinariaStandBy(datosParseados.roturaMaquinaria.maquinariaStandBy);
              if (datosParseados.roturaMaquinaria.empresasSateliteProduccion !== undefined) setEmpresasSateliteProduccion(datosParseados.roturaMaquinaria.empresasSateliteProduccion);
              if (datosParseados.roturaMaquinaria.conveniosOtrasEmpresas !== undefined) setConveniosOtrasEmpresas(datosParseados.roturaMaquinaria.conveniosOtrasEmpresas);
            } else {
              // Compatibilidad con formato antiguo
              setRoturaMaquinaria({
                capacidadInstaladaPlanta: datosParseados.capacidadInstaladaPlanta || "",
                indicePromedioCapacidad: datosParseados.indicePromedioCapacidad || "",
                numeroLineasProduccion: datosParseados.numeroLineasProduccion || "",
                maquinariaCritica: datosParseados.maquinariaCritica || "",
                incidenciaProduccion: datosParseados.incidenciaProduccion || "",
                origenMaquinariaCritica: datosParseados.origenMaquinariaCritica || "",
                representacionNacionalMaquinaria: datosParseados.representacionNacionalMaquinaria || "",
                maquinariaStandBy: datosParseados.maquinariaStandBy || "",
                empresasSateliteProduccion: datosParseados.empresasSateliteProduccion || "",
                conveniosOtrasEmpresas: datosParseados.conveniosOtrasEmpresas || ""
              });
              // Inicializar variables separadas desde formato antiguo
              if (datosParseados.capacidadInstaladaPlanta !== undefined) setCapacidadInstaladaPlanta(datosParseados.capacidadInstaladaPlanta);
              if (datosParseados.indicePromedioCapacidad !== undefined) setIndicePromedioCapacidad(datosParseados.indicePromedioCapacidad);
              if (datosParseados.numeroLineasProduccion !== undefined) setNumeroLineasProduccion(datosParseados.numeroLineasProduccion);
              if (datosParseados.maquinariaCritica !== undefined) setMaquinariaCritica(datosParseados.maquinariaCritica);
              if (datosParseados.incidenciaProduccion !== undefined) setIncidenciaProduccion(datosParseados.incidenciaProduccion);
              if (datosParseados.origenMaquinariaCritica !== undefined) setOrigenMaquinariaCritica(datosParseados.origenMaquinariaCritica);
              if (datosParseados.representacionNacionalMaquinaria !== undefined) setRepresentacionNacionalMaquinaria(datosParseados.representacionNacionalMaquinaria);
              if (datosParseados.maquinariaStandBy !== undefined) setMaquinariaStandBy(datosParseados.maquinariaStandBy);
              if (datosParseados.empresasSateliteProduccion !== undefined) setEmpresasSateliteProduccion(datosParseados.empresasSateliteProduccion);
              if (datosParseados.conveniosOtrasEmpresas !== undefined) setConveniosOtrasEmpresas(datosParseados.conveniosOtrasEmpresas);
            }
            if (
              datosParseados.recomendacionesItems !== undefined ||
              datosParseados.recomendaciones !== undefined
            ) {
              setRecomendacionesItems(
                normalizarRecomendacionesItemsDesdeDatos(datosParseados)
              );
            }
            if (datosParseados.siniestralidad !== undefined) setSiniestralidad(datosParseados.siniestralidad);
            if (datosParseados.siniestralidadAno !== undefined) setSiniestralidadAno(datosParseados.siniestralidadAno);
            if (datosParseados.siniestralidadValor !== undefined) setSiniestralidadValor(datosParseados.siniestralidadValor);
            if (datosParseados.siniestralidadDescripcion !== undefined || datosParseados.siniestralidad !== undefined) {
              setSiniestralidadDescripcion(datosParseados.siniestralidadDescripcion || datosParseados.siniestralidad || "");
            }
            if (datosParseados.siniestralidadMejoras !== undefined) setSiniestralidadMejoras(datosParseados.siniestralidadMejoras);
            if (datosParseados.almacenAlturaMaxima !== undefined) setAlmacenAlturaMaxima(datosParseados.almacenAlturaMaxima);
            if (datosParseados.almacenMatrizCompatibilidad !== undefined) setAlmacenMatrizCompatibilidad(datosParseados.almacenMatrizCompatibilidad);
            if (datosParseados.almacenAlturaMaximaEstanteria !== undefined) setAlmacenAlturaMaximaEstanteria(datosParseados.almacenAlturaMaximaEstanteria);
            if (datosParseados.mercPeligrosaTipo !== undefined) setMercPeligrosaTipo(datosParseados.mercPeligrosaTipo);
            if (datosParseados.mercPeligrosaTipoAlmacenamiento !== undefined) setMercPeligrosaTipoAlmacenamiento(datosParseados.mercPeligrosaTipoAlmacenamiento);
            if (datosParseados.mercPeligrosaProtecciones !== undefined) setMercPeligrosaProtecciones(datosParseados.mercPeligrosaProtecciones);
            if (datosParseados.maquinariaDescripcion !== undefined) setMaquinariaDescripcion(datosParseados.maquinariaDescripcion);
            if (datosParseados.promedioEdadEquipos !== undefined) setPromedioEdadEquipos(datosParseados.promedioEdadEquipos);
            if (datosParseados.tipoMantenimientoEquipos !== undefined) setTipoMantenimientoEquipos(datosParseados.tipoMantenimientoEquipos);
            if (datosParseados.bitacorasMantenimiento !== undefined) setBitacorasMantenimiento(datosParseados.bitacorasMantenimiento);
            if (datosParseados.personalMantenimiento !== undefined) setPersonalMantenimiento(datosParseados.personalMantenimiento);
            if (datosParseados.periodicidadMantenimientos !== undefined) setPeriodicidadMantenimientos(datosParseados.periodicidadMantenimientos);
}
        } catch (error) {
          console.error('Error al cargar datos guardados:', error);
          localStorage.removeItem('formularioInspeccion');
        }
      }
    }
  }, [id]);

  // Memoizar todos los datos del formulario para evitar re-renders innecesarios
  const datosFormularioCompletos = useMemo(() => {
    const startTime = performance.now();
    
    const datos = {
    formData,
    barrio,
    departamento,
    horarioLaboral,
    cargo,
    puedeSuscribir,
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
    tablaRiesgos,
    areas,
    datosEquipos,
    // Características de la construcción
    caracteristicasConstruccion,
    anoConstruccion,
    tipoEdificio,
    tipoEdificioOtro,
    areaLoteConstruccion,
    areaConstruidaConstruccion,
    numeroPisosConstruccion,
    cimentacion,
    cimentacionOtro,
    materialesEstructura,
    materialesEstructuraOtro,
    regularidadPlanta,
    danosPrevios,
    reforzamientosEstructurales,
    sistemaEstructural,
    sistemaEstructuralOtro,
    estructuraCubierta,
    estructuraCubiertaOtro,
    regularAltura,
    danosReparados,
    // Materiales
    tipoInsumo,
    nivelRiesgoInsumo,
    descripcionContenidosInsumo,
    contenedoresInsumo,
    tipoAlmacenamientoInsumo,
    estadoAlmacenamientoInsumo,
    tipoMateriasPrimas,
    nivelRiesgoMateriasPrimas,
    descripcionContenidosMateriasPrimas,
    contenedoresMateriasPrimas,
    tipoAlmacenamientoMateriasPrimas,
    estadoAlmacenamientoMateriasPrimas,
    tipoMercancias,
    nivelRiesgoMercancias,
    descripcionContenidosMercancias,
    contenedoresMercancias,
    tipoAlmacenamientoMercancias,
    estadoAlmacenamientoMercancias,
    tipoInsumoOtro,
    contenedoresInsumoOtro,
    tipoAlmacenamientoInsumoOtro,
    tipoMateriasPrimasOtro,
    contenedoresMateriasPrimasOtro,
    tipoAlmacenamientoMateriasPrimasOtro,
    tipoMercanciasOtro,
    contenedoresMercanciasOtro,
    tipoAlmacenamientoMercanciasOtro,
    // Características operativas ambientales - estado agrupado
    caracteristicasAmbientales,
    // Protección contra incendios
    detectoresHumo,
    coberturaDeteccion,
    instalacionDeteccion,
    monitoreadoDeteccion,
    cantidadExtintores,
    tipoExtintores,
    suficientesExtintores,
    instalacionExtintores,
    senalizacionExtintores,
    cargaVigenteExtintores,
    comentariosProteccionIncendios,
    bombaPrincipal,
    bombaJockey,
    presionContraincendios,
    estacionBomberosNombre,
    estacionBomberosTiempoMin,
    estacionBomberosDistanciaMetros,
    murosCortafuegos,
    puertasCortafuego,
    almacenamientoAguaRci,
    pruebasProteccionIncendios,
    extintor,
    rci,
    rociadores,
    deteccion,
    alarmas,
    brigadas,
    bomberos,
    // Sustracción - Protecciones Físicas - estado agrupado
    sustraccion,
    // Lucro Cesante - estado agrupado
    lucroCesante,
    // Procesos Críticos y Riesgos Medioambientales
    procesosCriticos,
    riesgosMedioambientales,
    // Por rotura de maquinaria - estado agrupado
    roturaMaquinaria,
    almacenAlturaMaxima,
    almacenMatrizCompatibilidad,
    almacenAlturaMaximaEstanteria,
    mercPeligrosaTipo,
    mercPeligrosaTipoAlmacenamiento,
    mercPeligrosaProtecciones,
    maquinariaDescripcion,
    promedioEdadEquipos,
    tipoMantenimientoEquipos,
    bitacorasMantenimiento,
    personalMantenimiento,
    periodicidadMantenimientos,
    siniestralidad,
    siniestralidadAno,
    siniestralidadValor,
    siniestralidadDescripcion,
    siniestralidadMejoras,
    recomendacionesItems,
    recomendaciones,
    };
    
    // Cálculo completado
    
    return datos;
  }, [formData, barrio, departamento, horarioLaboral, cargo, puedeSuscribir, colaboladores, nombreEmpresa, direccion, municipio, personaEntrevistada, nombreCliente, aseguradora, fecha, imagenesRegistro, descripcionEmpresa, infraestructura, analisisRiesgos, tablaRiesgos, areas, datosEquipos, caracteristicasConstruccion, anoConstruccion, tipoEdificio, tipoEdificioOtro, areaLoteConstruccion, areaConstruidaConstruccion, numeroPisosConstruccion, cimentacion, cimentacionOtro, materialesEstructura, materialesEstructuraOtro, regularidadPlanta, danosPrevios, reforzamientosEstructurales, sistemaEstructural, sistemaEstructuralOtro, estructuraCubierta, estructuraCubiertaOtro, regularAltura, danosReparados, tipoInsumo, nivelRiesgoInsumo, descripcionContenidosInsumo, contenedoresInsumo, tipoAlmacenamientoInsumo, estadoAlmacenamientoInsumo, tipoMateriasPrimas, nivelRiesgoMateriasPrimas, descripcionContenidosMateriasPrimas, contenedoresMateriasPrimas, tipoAlmacenamientoMateriasPrimas, estadoAlmacenamientoMateriasPrimas, tipoMercancias, nivelRiesgoMercancias, descripcionContenidosMercancias, contenedoresMercancias, tipoAlmacenamientoMercancias, estadoAlmacenamientoMercancias, tipoInsumoOtro, contenedoresInsumoOtro, tipoAlmacenamientoInsumoOtro, tipoMateriasPrimasOtro, contenedoresMateriasPrimasOtro, tipoAlmacenamientoMateriasPrimasOtro, tipoMercanciasOtro, contenedoresMercanciasOtro, tipoAlmacenamientoMercanciasOtro, caracteristicasAmbientales, detectoresHumo, coberturaDeteccion, instalacionDeteccion, monitoreadoDeteccion, cantidadExtintores, tipoExtintores, suficientesExtintores, instalacionExtintores, senalizacionExtintores, cargaVigenteExtintores, comentariosProteccionIncendios, bombaPrincipal, bombaJockey, presionContraincendios, estacionBomberosNombre, estacionBomberosTiempoMin, estacionBomberosDistanciaMetros, murosCortafuegos, puertasCortafuego, almacenamientoAguaRci, pruebasProteccionIncendios, extintor, rci, rociadores, deteccion, alarmas, brigadas, bomberos, sustraccion, lucroCesante, procesosCriticos, riesgosMedioambientales, roturaMaquinaria, almacenAlturaMaxima, almacenMatrizCompatibilidad, almacenAlturaMaximaEstanteria, mercPeligrosaTipo, mercPeligrosaTipoAlmacenamiento, mercPeligrosaProtecciones, maquinariaDescripcion, promedioEdadEquipos, tipoMantenimientoEquipos, bitacorasMantenimiento, personalMantenimiento, periodicidadMantenimientos, siniestralidad, siniestralidadAno, siniestralidadValor, siniestralidadDescripcion, siniestralidadMejoras, recomendacionesItems]);

  // ⚠️ OPTIMIZACIÓN CRÍTICA: Usar useDeferredValue para diferir el cálculo pesado
  // Esto permite que la UI responda inmediatamente mientras el cálculo se hace en segundo plano
  const datosFormularioCompletosDeferred = useDeferredValue(datosFormularioCompletos);

  // Guardar datos automáticamente cuando cambien (versión optimizada)
  // Solo se guarda si estamos en la ruta del formulario de inspección
  const timeoutGuardadoRef = useRef(null);
  const ultimoGuardadoRef = useRef(null);
  const datosFormularioCompletosCountRef = useRef(0);
  
  // ⚠️ OPTIMIZACIÓN CRÍTICA: Este useEffect se ejecuta en CADA cambio de cualquier estado
  // porque datosFormularioCompletos tiene 80+ dependencias. Esto causa lag.
  // SOLUCIÓN: Usar useDeferredValue para diferir el cálculo y NO ejecutar nada inmediatamente
  useEffect(() => {
    const esRutaInspeccion = location.pathname.includes('/inspeccion') || location.pathname.includes('/formulario-inspeccion');
    if (!esRutaInspeccion) return;

    // ⚠️ PROBLEMA IDENTIFICADO: JSON.stringify se ejecuta inmediatamente aunque sea en requestIdleCallback
    // Esto puede bloquear el hilo principal si el objeto es grande
    // SOLUCIÓN: Usar datosFormularioCompletosDeferred que se actualiza de forma diferida
    
    // Limpiar timeout anterior si existe
    if (timeoutGuardadoRef.current) {
      clearTimeout(timeoutGuardadoRef.current);
    }

    // ⚠️ OPTIMIZACIÓN: Debounce aumentado a 3000ms (3 segundos) para reducir guardados
    // Esto evita que cada cambio de estado dispare la serialización inmediatamente
    // Solo se serializa cuando el usuario deja de escribir por 3 segundos
    timeoutGuardadoRef.current = setTimeout(() => {
      const serializarYGuardar = () => {
        try {
          // Evitar serializar/escribir en localStorage mientras el usuario edita en un input/textarea.
          // Esto reduce casos donde el navegador reubica el caret al bloquearse el hilo principal.
          const elActivo = document.activeElement;
          const estaEditando =
            !!elActivo &&
            (elActivo.tagName === "TEXTAREA" ||
              elActivo.tagName === "INPUT" ||
              elActivo.isContentEditable);
          if (estaEditando) {
            timeoutGuardadoRef.current = setTimeout(serializarYGuardar, 1500);
            return;
          }

          const datosSerializados = JSON.stringify(datosFormularioCompletosDeferred);
          
          // Si los datos no han cambiado, no guardar
          if (ultimoGuardadoRef.current === datosSerializados) {
            return;
          }
          
          const guardarEnIdle = () => {
            try {
              localStorage.setItem('formularioInspeccion', datosSerializados);
              ultimoGuardadoRef.current = datosSerializados;
            } catch (error) {
              console.error('Error al guardar datos:', error);
            }
          };
          
          // Usar requestIdleCallback si está disponible
          if (window.requestIdleCallback) {
            window.requestIdleCallback(guardarEnIdle, { timeout: 1000 });
          } else {
            setTimeout(guardarEnIdle, 0);
          }
        } catch (error) {
          console.error('Error al serializar datos:', error);
        }
      };
      
      // Ejecutar serialización de forma asíncrona SOLO cuando realmente se vaya a guardar
      if (window.requestIdleCallback) {
        window.requestIdleCallback(serializarYGuardar, { timeout: 2000 });
      } else {
        setTimeout(serializarYGuardar, 100);
      }
    }, 3000); // 3 segundos de debounce para reducir escrituras

    return () => {
      if (timeoutGuardadoRef.current) {
        clearTimeout(timeoutGuardadoRef.current);
      }
    };
  }, [datosFormularioCompletosDeferred, location.pathname]);

  // Guardar datos antes de refrescar la página (solo si estamos en el formulario)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const esRutaInspeccion = window.location.pathname.includes('/inspeccion') || window.location.pathname.includes('/formulario-inspeccion');
      if (esRutaInspeccion) {
        try {
          // Usar el valor actual (no diferido) para guardar antes de salir
          const datosSerializados = JSON.stringify(datosFormularioCompletos);
          localStorage.setItem('formularioInspeccion', datosSerializados);
        } catch (error) {
          console.error('Error al guardar antes de salir:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [datosFormularioCompletos]);

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
  
  // Funciones para manejar análisis de riesgos (similar a puertos)
  const handleAgregarRiesgo = () => {
    const nuevoId = Date.now();
    const nuevoRiesgoAnalisis = {
      id: nuevoId,
      riesgo: '',
      analisis: ''
    };
    const nuevoRiesgoTabla = {
      id: nuevoId,
      riesgo: '',
      probabilidad: 0,
      severidad: 0,
      r: 0,
      indice: 0,
      clasificacion: 'Bajo'
    };
    
    setAnalisisRiesgos([...analisisRiesgos, nuevoRiesgoAnalisis]);
    setTablaRiesgos([...tablaRiesgos, nuevoRiesgoTabla]);
  };

  const handleEliminarRiesgo = (id) => {
    setAnalisisRiesgos(analisisRiesgos.filter(fila => fila.id !== id));
    setTablaRiesgos(tablaRiesgos.filter(fila => fila.id !== id));
  };

  const handleActualizarAnalisis = (id, campo, valor) => {
    const nuevaTabla = analisisRiesgos.map(fila => 
      fila.id === id ? { ...fila, [campo]: valor } : fila
    );
    setAnalisisRiesgos(nuevaTabla);
    
    // Si se actualiza el nombre del riesgo, sincronizar con la tabla de clasificación
    if (campo === 'riesgo') {
      setTablaRiesgos(tablaRiesgos.map(fila => 
        fila.id === id ? { ...fila, riesgo: valor } : fila
      ));
    }
  };

  const actualizarRiesgo = (id, campo, valor) => {
    const nuevaTabla = tablaRiesgos.map(fila => {
      if (fila.id === id) {
        const filaActualizada = { ...fila, [campo]: valor };
        
        // Si es un campo numérico, calcular automáticamente
        if (campo === 'probabilidad' || campo === 'severidad') {
          filaActualizada[campo] = parseInt(valor) || 0;
          
          const { probabilidad, severidad } = filaActualizada;
    if (probabilidad && severidad) {
      const r = probabilidad * severidad;
            const indice = ((r / 25) * 100).toFixed(0);
            filaActualizada.r = r;
            filaActualizada.indice = indice;
            filaActualizada.clasificacion = calcularClasificacion(r);
          }
        }
        
        return filaActualizada;
      }
      return fila;
    });
  
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
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
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
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });

  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    setImagen(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleNombreClienteChange = (e) => {
    setNombreCliente(e.target.value);
  };

  const handleNombreEmpresaChange = (e) => {
    setNombreEmpresa(e.target.value);
  };

  const handleDireccionChange = (e) => {
    setDireccion(e.target.value);
  };

  const handlePersonaEntrevistadaChange = (e) => {
    setPersonaEntrevistada(e.target.value);
  };

  const handleBarrioChange = (e) => {
    setBarrio(e.target.value);
  };

  const handleCargoChange = (e) => {
    setCargo(e.target.value);
  };

  const handleHorarioLaboralChange = (e) => {
    setHorarioLaboral(e.target.value);
  };

  const handleColaboladoresChange = (e) => {
    setColaboladores(e.target.value);
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
    const { latitud: latitudRiesgoWord, longitud: longitudRiesgoWord } =
      extraerLatLngDesdeTexto(formData?.coordenadasRiesgo);


  
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
    const ciudadSiniestroTexto = (() => {
      const ciudadRaw = formData?.ciudad_siniestro;
      if (ciudadRaw && typeof ciudadRaw === "object") {
        if (typeof ciudadRaw.label === "string" && ciudadRaw.label.trim()) {
          return ciudadRaw.label.split(" - ")[0].trim();
        }
        if (typeof ciudadRaw.value === "string" && ciudadRaw.value.trim()) {
          return ciudadRaw.value.trim();
        }
      }
      if (typeof ciudadRaw === "string" && ciudadRaw.trim()) {
        return ciudadRaw.split(" - ")[0].trim();
      }
      return "";
    })();
    const departamentoSiniestroTexto = (() => {
      const depRaw = formData?.departamento_siniestro;
      if (typeof depRaw === "string" && depRaw.trim()) {
        return depRaw.trim();
      }
      const ciudadRaw = formData?.ciudad_siniestro;
      if (ciudadRaw && typeof ciudadRaw === "object" && typeof ciudadRaw.label === "string") {
        return ciudadRaw.label.split(" - ")[1]?.trim() || "";
      }
      if (typeof ciudadRaw === "string" && ciudadRaw.includes(" - ")) {
        return ciudadRaw.split(" - ")[1]?.trim() || "";
      }
      return "";
    })();
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
            children: [new TextRun({ text: valorTablaWord(texto) })],
          }),
        ],
      });


      const celdaTextoCentrada = (texto, bold = false) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: valorTablaWord(texto), bold })],
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
        // La segunda línea de la portada debe mostrar el nombre del cliente.
        text: nombreCliente || cargo || "CLIENTE",
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
        text: `${ciudadSiniestroTexto} – ${departamentoSiniestroTexto}`,
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
      linea(`Ciudad: ${ciudadSiniestroTexto}`),
      linea(""),
      linea("REF: INFORME DE INSPECCIÓN", true),
      linea(`ASEGURADO: ${nombreCliente}`),
      linea(`PREDIO INSPECCIONADO: ${direccion}`),
      linea(`FECHA DE INSPECCIÓN: ${fechaFormateada}`),
      linea(""),
      linea("Apreciados Señores:"),
      linea("Tomando como base la asignación de inspección que nos fuera oficializada, estamos adjuntando el informe único y confidencial de las labores realizadas en el Riesgo en referencia."),
      linea(`Luego de analizar los diferentes aspectos relacionados con el estado actual del predio, así como las protecciones existentes contra posibles eventos como incendio, hurto, entre otros; se afirma que el riesgo ${textoSuscripcion}. No obstante, se deben cumplir las recomendaciones para el mejoramiento del riesgo y prevención de emergencias.`),
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
    children: [
      new TextRun({
        text: "Tabla de Contenido",
        bold: true,
        font: "Arial",
        size: 28,
      }),
    ],
    spacing: { after: 80 },
    alignment: AlignmentType.LEFT,
  }),
  new Paragraph({
    text: "",
    spacing: { after: 40 },
  }),
  new TableOfContents(" ", {
    hyperlink: false,
    headingStyleRange: "2-2",
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Nota: Si la tabla de contenido no refleja páginas actualizadas, en Word use 'Actualizar tabla' (Actualizar toda la tabla).",
        italics: true,
        size: 18,
        color: "666666",
      }),
    ],
    spacing: { before: 120, after: 80 },
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
    



const celdaEncabezadoInfo = (texto, width = 20) =>
  new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: texto, bold: true, font: "Arial", size: 24 })],
      }),
    ],
  });

const celdaValorInfo = (texto, width = 30) =>
  new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: valorTablaWord(texto), font: "Arial", size: 24 })],
      }),
    ],
  });

const celdaVaciaInfo = (width = 20) =>
  new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ text: "N/A" })],
  });

docContent.push(
  new Paragraph({ children: [], pageBreakBefore: true }),
  seccion("1. INFORMACIÓN GENERAL"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celdaEncabezadoInfo("Nombre de la Empresa", 20),
          celdaValorInfo(nombreEmpresa, 36),
          celdaEncabezadoInfo("Barrio", 20),
          celdaValorInfo(barrio, 24),
        ],
      }),
      new TableRow({
        children: [
          celdaEncabezadoInfo("Dirección", 20),
          celdaValorInfo(direccion, 36),
          celdaEncabezadoInfo("Departamento", 20),
          celdaValorInfo(departamento, 24),
        ],
      }),
      new TableRow({
        children: [
          celdaEncabezadoInfo("Ciudad", 20),
          celdaValorInfo(ciudadSiniestroTexto || municipio || formData?.ciudad || formData?.ciudad_siniestro || "", 36),
          celdaVaciaInfo(20),
          celdaVaciaInfo(24),
        ],
      }),
      new TableRow({
        children: [
          celdaEncabezadoInfo("Cargo", 20),
          celdaValorInfo(cargo, 36),
          celdaVaciaInfo(20),
          celdaVaciaInfo(24),
        ],
      }),
      new TableRow({
        children: [
          celdaEncabezadoInfo("Horario Laboral", 20),
          celdaValorInfo(horarioLaboral, 36),
          celdaEncabezadoInfo("Persona Entrevistada", 20),
          celdaValorInfo(personaEntrevistada, 24),
        ],
      }),
      new TableRow({
        children: [
          celdaEncabezadoInfo("Numero de Colaboradores", 20),
          celdaValorInfo(colaboladores, 36),
          celdaVaciaInfo(20),
          celdaVaciaInfo(24),
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
  new Paragraph({ text: "Comentarios adicionales", bold: true, spacing: { after: 100 } }),
  linea(caracteristicasConstruccion || "No se ingresaron comentarios adicionales."),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  new Paragraph({ text: "Edificación Principal", bold: true, spacing: { after: 200 } }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Año de construcción"),
          celdaTexto(anoConstruccion || ""),
          encabezadoTabla("Tipo"),
          celdaTexto(tipoEdificio === "Otro" && tipoEdificioOtro ? `${tipoEdificio}: ${tipoEdificioOtro}` : (tipoEdificio || "")),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Área de lote"),
          celdaTexto(areaLoteConstruccion || ""),
          encabezadoTabla("Área construida"),
          celdaTexto(areaConstruidaConstruccion || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Número de pisos"),
          celdaTexto(numeroPisosConstruccion || ""),
          new TableCell({ children: [new Paragraph("")], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph("")], width: { size: 25, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ],
  }),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Cimentación"),
          celdaTexto(cimentacion === "Otro" && cimentacionOtro ? `${cimentacion}: ${cimentacionOtro}` : (cimentacion || "")),
          encabezadoTabla("Materiales estructura"),
          celdaTexto(materialesEstructura === "Otro" && materialesEstructuraOtro ? `${materialesEstructura}: ${materialesEstructuraOtro}` : (materialesEstructura || "")),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Regularidad de planta"),
          celdaTexto(limpiarPrefijoNumerico(regularidadPlanta)),
          encabezadoTabla("Daños previos"),
          celdaTexto(limpiarPrefijoNumerico(danosPrevios)),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Reforzamientos estructurales"),
          celdaTexto(reforzamientosEstructurales || ""),
          encabezadoTabla("Sistema estructural"),
          celdaTexto(sistemaEstructural === "Otro" && sistemaEstructuralOtro ? `${sistemaEstructural}: ${sistemaEstructuralOtro}` : (sistemaEstructural || "")),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Estructura cubierta"),
          celdaTexto(estructuraCubierta === "Otro" && estructuraCubiertaOtro ? `${estructuraCubierta}: ${estructuraCubiertaOtro}` : (estructuraCubierta || "")),
          encabezadoTabla("Regular de altura"),
          celdaTexto(limpiarPrefijoNumerico(regularAltura)),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Daños reparados"),
          celdaTexto(limpiarPrefijoNumerico(danosReparados)),
          new TableCell({ children: [new Paragraph("")], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph("")], width: { size: 25, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ],
  })
);


 docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }), 
  seccion("4. PROCESOS"),
  linea(procesos || "No se ingresó información.")
);

  const tieneDatosInsumos = tipoInsumo || nivelRiesgoInsumo || descripcionContenidosInsumo || contenedoresInsumo || tipoAlmacenamientoInsumo || estadoAlmacenamientoInsumo;
  const tieneDatosMateriasPrimas = tipoMateriasPrimas || nivelRiesgoMateriasPrimas || descripcionContenidosMateriasPrimas || contenedoresMateriasPrimas || tipoAlmacenamientoMateriasPrimas || estadoAlmacenamientoMateriasPrimas;
  const tieneDatosMercancias = tipoMercancias || nivelRiesgoMercancias || descripcionContenidosMercancias || contenedoresMercancias || tipoAlmacenamientoMercancias || estadoAlmacenamientoMercancias;

  if (tieneDatosInsumos || tieneDatosMateriasPrimas || tieneDatosMercancias) {
    docContent.push(
      new Paragraph({ text: "", spacing: { after: 300 } }),
      new Paragraph({ text: "Materiales", bold: true, spacing: { after: 200 } })
    );

    if (tieneDatosInsumos) {
      docContent.push(
        new Paragraph({ text: "Insumos", bold: true, spacing: { after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                encabezadoTabla("Tipo de insumo"),
                celdaTexto(tipoInsumo === "Otro" && tipoInsumoOtro ? `${tipoInsumo}: ${tipoInsumoOtro}` : (tipoInsumo || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Nivel de riesgo"),
                celdaTexto(nivelRiesgoInsumo || ""),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Descripción de los contenidos"),
                celdaTexto(descripcionContenidosInsumo || ""),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Contenedores"),
                celdaTexto(contenedoresInsumo === "Otro" && contenedoresInsumoOtro ? `${contenedoresInsumo}: ${contenedoresInsumoOtro}` : (contenedoresInsumo || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Tipo de almacenamiento"),
                celdaTexto(tipoAlmacenamientoInsumo === "Otro" && tipoAlmacenamientoInsumoOtro ? `${tipoAlmacenamientoInsumo}: ${tipoAlmacenamientoInsumoOtro}` : (tipoAlmacenamientoInsumo || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Estado de almacenamiento"),
                celdaTexto(estadoAlmacenamientoInsumo || ""),
              ],
            }),
          ],
        }),
        new Paragraph({ text: "", spacing: { after: 200 } })
      );
    }

    if (tieneDatosMateriasPrimas) {
      docContent.push(
        new Paragraph({ text: "Materias Primas", bold: true, spacing: { after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                encabezadoTabla("Tipo de materias primas"),
                celdaTexto(tipoMateriasPrimas === "Otro" && tipoMateriasPrimasOtro ? `${tipoMateriasPrimas}: ${tipoMateriasPrimasOtro}` : (tipoMateriasPrimas || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Nivel de riesgo"),
                celdaTexto(nivelRiesgoMateriasPrimas || ""),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Descripción de los contenidos"),
                celdaTexto(descripcionContenidosMateriasPrimas || ""),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Contenedores"),
                celdaTexto(contenedoresMateriasPrimas === "Otro" && contenedoresMateriasPrimasOtro ? `${contenedoresMateriasPrimas}: ${contenedoresMateriasPrimasOtro}` : (contenedoresMateriasPrimas || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Tipo de almacenamiento"),
                celdaTexto(tipoAlmacenamientoMateriasPrimas === "Otro" && tipoAlmacenamientoMateriasPrimasOtro ? `${tipoAlmacenamientoMateriasPrimas}: ${tipoAlmacenamientoMateriasPrimasOtro}` : (tipoAlmacenamientoMateriasPrimas || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Estado de almacenamiento"),
                celdaTexto(estadoAlmacenamientoMateriasPrimas || ""),
              ],
            }),
          ],
        }),
        new Paragraph({ text: "", spacing: { after: 200 } })
      );
    }

    if (tieneDatosMercancias) {
      docContent.push(
        new Paragraph({ text: "Producto terminado y/o Mercancías", bold: true, spacing: { after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                encabezadoTabla("Tipo de mercancías"),
                celdaTexto(tipoMercancias === "Otro" && tipoMercanciasOtro ? `${tipoMercancias}: ${tipoMercanciasOtro}` : (tipoMercancias || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Nivel de riesgo"),
                celdaTexto(nivelRiesgoMercancias || ""),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Descripción de los contenidos"),
                celdaTexto(descripcionContenidosMercancias || ""),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Contenedores"),
                celdaTexto(contenedoresMercancias === "Otro" && contenedoresMercanciasOtro ? `${contenedoresMercancias}: ${contenedoresMercanciasOtro}` : (contenedoresMercancias || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Tipo de almacenamiento"),
                celdaTexto(tipoAlmacenamientoMercancias === "Otro" && tipoAlmacenamientoMercanciasOtro ? `${tipoAlmacenamientoMercancias}: ${tipoAlmacenamientoMercanciasOtro}` : (tipoAlmacenamientoMercancias || "")),
              ],
            }),
            new TableRow({
              children: [
                encabezadoTabla("Estado de almacenamiento"),
                celdaTexto(estadoAlmacenamientoMercancias || ""),
              ],
            }),
          ],
        })
      );
    }
  }

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
  }),
  new Paragraph({ text: "", spacing: { after: 150 } }),
  new Paragraph({
    children: [
      new TextRun({
        text: "COORDENADAS DE UBICACIÓN",
        bold: true,
        font: "Arial",
        size: 24,
      }),
    ],
    spacing: { after: 120 },
  }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("LATITUD"),
          celdaTexto(latitudRiesgoWord || "No disponible"),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("LONGITUD"),
          celdaTexto(longitudRiesgoWord || "No disponible"),
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

  // Sección: Sustracción - Protecciones Físicas
  docContent.push(
    new Paragraph({ text: "", spacing: { after: 300 } }),
    seccion("6. SUSTRACCIÓN - PROTECCIONES FÍSICAS"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Ubicación del predio"),
            celdaTexto(ubicacionPredio === "Otro" && ubicacionPredioOtro ? `${ubicacionPredio}: ${ubicacionPredioOtro}` : (ubicacionPredio || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Vulnerabilidad de los contenidos"),
            celdaTexto(vulnerabilidadContenidos === "Otro" && vulnerabilidadContenidosOtro ? `${vulnerabilidadContenidos}: ${vulnerabilidadContenidosOtro}` : (vulnerabilidadContenidos || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Acceso a las instalaciones"),
            celdaTexto(accesoInstalaciones === "Otro" && accesoInstalacionesOtro ? `${accesoInstalaciones}: ${accesoInstalacionesOtro}` : (accesoInstalaciones || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Circulación de personas externas"),
            celdaTexto(circulacionPersonasExternas === "Otro" && circulacionPersonasExternasOtro ? `${circulacionPersonasExternas}: ${circulacionPersonasExternasOtro}` : (circulacionPersonasExternas || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Protecciones pasivas"),
            celdaTexto(proteccionesPasivas === "Otro" && proteccionesPasivasOtro ? `${proteccionesPasivas}: ${proteccionesPasivasOtro}` : (proteccionesPasivas || "")),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Manejo de dinero", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Personal de recaudo"),
            celdaTexto(personalRecaudo || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Horarios de recaudo"),
            celdaTexto(horariosRecaudo || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Lugar de recaudo"),
            celdaTexto(lugarRecaudo || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Transporte de dinero"),
            celdaTexto(transporteDinero || ""),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Sistema de Alarma", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Tiene alarma"),
            celdaTexto(tieneAlarma || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Monitoreada"),
            celdaTexto(alarmaMonitoreadaSustraccion || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Empresa que monitorea"),
            celdaTexto(empresaMonitorea || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Tipo de comunicación"),
            celdaTexto(tipoComunicacionAlarma === "Otro" && tipoComunicacionAlarmaOtro ? `${tipoComunicacionAlarma}: ${tipoComunicacionAlarmaOtro}` : (tipoComunicacionAlarma || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Cobertura"),
            celdaTexto(coberturaAlarma || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Sensores que posee"),
            celdaTexto(sensoresAlarma === "Otro" && sensoresAlarmaOtro ? `${sensoresAlarma}: ${sensoresAlarmaOtro}` : (sensoresAlarma || "")),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Circuito Cerrado de Televisión - CCTV", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Cuenta con CCTV"),
            celdaTexto(cuentaConCCTV || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Número de cámaras que posee"),
            celdaTexto(numeroCamaras || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Controlado por"),
            celdaTexto(controladoPor === "Otro" && controladoPorOtro ? `${controladoPor}: ${controladoPorOtro}` : (controladoPor || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Tipo de monitoreo"),
            celdaTexto(tipoMonitoreoCCTV === "Otro" && tipoMonitoreoCCTVOtro ? `${tipoMonitoreoCCTV}: ${tipoMonitoreoCCTVOtro}` : (tipoMonitoreoCCTV || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Frecuencia de grabación"),
            celdaTexto(frecuenciaGrabacion === "Otro" && frecuenciaGrabacionOtro ? `${frecuenciaGrabacion}: ${frecuenciaGrabacionOtro}` : (frecuenciaGrabacion || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Tiempo de respaldo"),
            celdaTexto(tiempoRespaldo || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Dispositivo de grabación"),
            celdaTexto(dispositivoGrabacion === "Otro" && dispositivoGrabacionOtro ? `${dispositivoGrabacion}: ${dispositivoGrabacionOtro}` : (dispositivoGrabacion || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Ubicación del grabador"),
            celdaTexto(ubicacionGrabador === "Otro" && ubicacionGrabadorOtro ? `${ubicacionGrabador}: ${ubicacionGrabadorOtro}` : (ubicacionGrabador || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Visualización por internet"),
            celdaTexto(visualizacionInternet || ""),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Vigilancia", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Cuenta con vigilancia"),
            celdaTexto(cuentaConVigilancia || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Contratada con"),
            celdaTexto(contratadaCon || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Número de vigilantes"),
            celdaTexto(numeroVigilantes || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Jornada"),
            celdaTexto(jornadaVigilancia === "Otro" && jornadaVigilanciaOtro ? `${jornadaVigilancia}: ${jornadaVigilanciaOtro}` : (jornadaVigilancia || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Tienen armas"),
            celdaTexto(tienenArmas || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Tienen radio"),
            celdaTexto(tienenRadio || ""),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    seccion("9. LUCRO CESANTE"),
    new Paragraph({ text: "Por incendio", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Área requerida para el desarrollo de las actividades"),
            celdaTexto(areaRequeridaLucroCesante === "Otro" && areaRequeridaLucroCesanteOtro ? `${areaRequeridaLucroCesante}: ${areaRequeridaLucroCesanteOtro}` : (areaRequeridaLucroCesante || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Complejidad de la actividad o proceso"),
            celdaTexto(complejidadActividadLucroCesante === "Otro" && complejidadActividadLucroCesanteOtro ? `${complejidadActividadLucroCesante}: ${complejidadActividadLucroCesanteOtro}` : (complejidadActividadLucroCesante || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Plan de continuidad del negocio documentado"),
            celdaTexto(planContinuidadNegocio || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor nómina mensual"),
            celdaTexto(valorNominaMensual || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor facturación del año anterior"),
            celdaTexto(valorFacturacionAnoAnterior || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor proyectado facturación para el presente año"),
            celdaTexto(valorProyectadoFacturacion || ""),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Análisis y comentarios", bold: true, spacing: { after: 100 } }),
    linea(comentariosLucroCesante || "No se ingresaron comentarios."),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    seccion("10. PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES"),
    new Paragraph({ text: "Procesos Críticos", bold: true, spacing: { after: 100 } }),
    linea(procesosCriticos || "No se ingresaron comentarios."),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Riesgos Medioambientales", bold: true, spacing: { after: 100 } }),
    linea(riesgosMedioambientales || "No se ingresaron comentarios."),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    seccion("11. POR ROTURA DE MAQUINARIA"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Capacidad instalada de la planta de producción"),
            celdaTexto(capacidadInstaladaPlanta || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Índice promedio de capacidad utilizada"),
            celdaTexto(indicePromedioCapacidad || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Número de líneas de producción"),
            celdaTexto(numeroLineasProduccion || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Maquinaria crítica"),
            celdaTexto(maquinariaCritica || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Incidencia sobre la producción (%)"),
            celdaTexto(incidenciaProduccion || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Origen de la maquinaria crítica"),
            celdaTexto(origenMaquinariaCritica || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Hay representación nacional de la maquinaria"),
            celdaTexto(representacionNacionalMaquinaria || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Hay maquinaria en Stand-by"),
            celdaTexto(maquinariaStandBy || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Existen empresas satélite para la producción"),
            celdaTexto(empresasSateliteProduccion || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Hay convenios con otras empresas"),
            celdaTexto(conveniosOtrasEmpresas || ""),
          ],
        }),
      ],
    })
  );  // Sección: Características operativas ambientales
  docContent.push(
    new Paragraph({ text: "", spacing: { after: 300 } }),
    seccion("7. CARACTERÍSTICAS OPERATIVAS AMBIENTALES"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Requiere licencia ambiental para su funcionamiento"),
            celdaTexto(caracteristicasAmbientales.licenciaAmbiental || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Requiere permiso de vertimientos o emisiones contaminantes"),
            celdaTexto(caracteristicasAmbientales.permisoVertimientos || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Consume más de 1.000 m3 de agua al mes"),
            celdaTexto(caracteristicasAmbientales.consumoAgua || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Cuenta con bombillas ahorradoras de energía"),
            celdaTexto(caracteristicasAmbientales.bombillasAhorradoras || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Hace parte del mercado no regulado de energía"),
            celdaTexto(caracteristicasAmbientales.mercadoNoRegulado || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Genera vertimiento de aguas residuales contaminantes"),
            celdaTexto(caracteristicasAmbientales.vertimientoAguasResiduales || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Cuenta con planta de tratamiento de aguas residuales"),
            celdaTexto(caracteristicasAmbientales.plantaTratamiento || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Cuenta con plan de manejo integral de residuos peligrosos"),
            celdaTexto(caracteristicasAmbientales.planManejoResiduos || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Se generan emisiones contaminantes"),
            celdaTexto(caracteristicasAmbientales.emisionesContaminantes || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Cuenta con sistema de filtración o lavado de gases"),
            celdaTexto(caracteristicasAmbientales.sistemaFiltracionGases || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Generan niveles de ruido que afecten a los vecinos"),
            celdaTexto(caracteristicasAmbientales.nivelesRuido || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Cuenta con programa de gestión ambiental certificado"),
            celdaTexto(caracteristicasAmbientales.programaGestionAmbiental || ""),
          ],
        }),
      ],
    })
  );

  // Sección: Protección y prevención contra incendios
  docContent.push(
    new Paragraph({ text: "", spacing: { after: 300 } }),
    seccion("8. PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS"),
    new Paragraph({ text: "Sistema de detección", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Cuenta con detectores de humo"),
            celdaTexto(detectoresHumo || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Cobertura"),
            celdaTexto(coberturaDeteccion || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Instalación"),
            celdaTexto(instalacionDeteccion || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Monitoreado"),
            celdaTexto(monitoreadoDeteccion || ""),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Extintores", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Cantidad"),
            celdaTexto(cantidadExtintores || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Tipo"),
            celdaTexto(tipoExtintores || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Suficientes"),
            celdaTexto(suficientesExtintores || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Instalación"),
            celdaTexto(instalacionExtintores || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Señalización"),
            celdaTexto(senalizacionExtintores || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Carga vigente"),
            celdaTexto(cargaVigenteExtintores || ""),
          ],
        }),
      ],
    })
  );

  docContent.push(
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({
      text: "Bombeo, estación de bomberos y cortafuegos",
      bold: true,
      spacing: { after: 100 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Bomba principal"),
            celdaTexto(bombaPrincipal || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Bomba jockey"),
            celdaTexto(bombaJockey || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Presión"),
            celdaTexto(presionContraincendios || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Estación de bomberos — nombre"),
            celdaTexto(estacionBomberosNombre || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Estación de bomberos — tiempo de respuesta (min)"),
            celdaTexto(estacionBomberosTiempoMin || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Estación de bomberos — distancia (m)"),
            celdaTexto(estacionBomberosDistanciaMetros || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Muros cortafuegos"),
            celdaTexto(murosCortafuegos || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Puertas cortafuego"),
            celdaTexto(puertasCortafuego || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Almacenamiento de agua para RCI"),
            celdaTexto(almacenamientoAguaRci || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Pruebas"),
            celdaTexto(pruebasProteccionIncendios || ""),
          ],
        }),
      ],
    })
  );

  if (comentariosProteccionIncendios) {
    docContent.push(
      new Paragraph({ text: "", spacing: { after: 200 } }),
      linea(comentariosProteccionIncendios)
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
    seccion("12. MAQUINARIA, EQUIPOS Y MANTENIMIENTO"),
  linea(maquinariaDescripcion || "No se ingresó información."),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [encabezadoTabla("Promedio de edad de los equipos"), celdaTexto(promedioEdadEquipos || "")],
      }),
      new TableRow({
        children: [encabezadoTabla("Tipo de mantenimiento"), celdaTexto(tipoMantenimientoEquipos || "")],
      }),
      new TableRow({
        children: [encabezadoTabla("Bitácoras de mantenimiento"), celdaTexto(bitacorasMantenimiento || "")],
      }),
      new TableRow({
        children: [encabezadoTabla("Personal que realiza mantenimiento"), celdaTexto(personalMantenimiento || "")],
      }),
      new TableRow({
        children: [encabezadoTabla("Periodicidad de los mantenimientos"), celdaTexto(periodicidadMantenimientos || "")],
      }),
    ],
  })
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
  seccion("13. SERVICIOS INDUSTRIALES"),

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
  seccion("14. SINIESTRALIDAD"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Año"),
          celdaTexto(siniestralidadAno || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Valor del siniestro"),
          celdaTexto(siniestralidadValor || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Descripción"),
          celdaTexto(siniestralidadDescripcion || siniestralidad || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Mejoras después del siniestro"),
          celdaTexto(siniestralidadMejoras || ""),
        ],
      }),
    ],
  })
);

docContent.push(
  new Paragraph({ children: [], pageBreakBefore: true }),
  seccion("15. ALMACENAMIENTO"),
  new Paragraph({ text: "Almacén", bold: true, spacing: { after: 100 } }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Altura máxima del almacén"),
          celdaTexto(almacenAlturaMaxima || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Matriz de compatibilidad"),
          celdaTexto(almacenMatrizCompatibilidad || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Altura máxima de la estantería"),
          celdaTexto(almacenAlturaMaximaEstanteria || ""),
        ],
      }),
    ],
  }),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  new Paragraph({ text: "Mercancías peligrosas", bold: true, spacing: { after: 100 } }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          encabezadoTabla("Tipo de mercancía"),
          celdaTexto(mercPeligrosaTipo || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Tipo de almacenamiento"),
          celdaTexto(mercPeligrosaTipoAlmacenamiento || ""),
        ],
      }),
      new TableRow({
        children: [
          encabezadoTabla("Protecciones existentes"),
          celdaTexto(mercPeligrosaProtecciones || ""),
        ],
      }),
    ],
  })
);

    docContent.push(
      new Paragraph({ children: [], pageBreakBefore: true }),
      seccion("16. ANÁLISIS Y CLASIFICACIÓN DE RIESGOS"),
      new Paragraph({ text: "ANÁLISIS DE RIESGOS", bold: true, spacing: { after: 100 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [encabezadoTabla("RIESGO"), encabezadoTabla("ANÁLISIS")],
          }),
          ...analisisRiesgos.map((fila) =>
            new TableRow({
              children: [celdaTexto(fila.riesgo || ""), celdaTexto(fila.analisis || "")],
            })
          ),
        ],
      })
    );
    
    

// Tabla de Calificación del Riesgo e Índice de Vulnerabilidad
docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }),
  new Paragraph({
    text: "CLASIFICACIÓN DE RIESGOS",
    bold: true,
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
      ...tablaRiesgos.map((riesgo) =>
        new TableRow({
          children: [
            celdaTexto(riesgo.riesgo || ""),
            celdaTexto(String(riesgo.probabilidad || 0)),
            celdaTexto(String(riesgo.severidad || 0)),
            celdaTexto(riesgo.clasificacion || "Bajo"),
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
      ...tablaRiesgos.map((riesgo) => {
        const p = parseInt(riesgo.probabilidad) || 0;
        const s = parseInt(riesgo.severidad) || 0;
        const r = riesgo.r || (p * s);
        const vulnerabilidad = Math.round((r / 25) * 100);
        const clasificacion =
          r <= 4 ? "Bajo" :
          r <= 8 ? "Medio" :
          r <= 12 ? "Alto" : "Extremo";

        return new TableRow({
          children: [
            celdaTexto(riesgo.riesgo || ""),
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
//Recomendaciones 

docContent.push(
  new Paragraph({ text: "", spacing: { after: 300 } }),
  seccion("17. RECOMENDACIONES"),
);
if (recomendacionesItems.length > 0) {
  for (const rec of recomendacionesItems) {
    docContent.push(
      new Paragraph({
        children: [new TextRun({ text: rec.codigo || "", bold: true })],
        spacing: { after: 120 },
      }),
      linea(rec.texto || ""),
      new Paragraph({
        children: [
          new TextRun({ text: "Fecha de seguimiento o control: ", italics: true }),
          new TextRun({
            text: formatearFechaSeguimientoIsoParaMostrar(rec.fechaSeguimiento) || "—",
          }),
        ],
        spacing: { after: 280 },
      }),
    );
  }
} else {
  docContent.push(linea(recomendaciones || "No se reportaron recomendaciones."));
}

  
  
if (imagenesRegistro.length > 0) {
  // Título de la sección
  docContent.push(seccion("18. REGISTRO FOTOGRÁFICO"));

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
    // Para que el título y el cuadro de fotos queden cercanos,
    // evitamos insertar un salto de página y reducimos el espacio extra.
    new Table({ rows: filas }),
    new Paragraph({ text: "", spacing: { after: 100 } })
  );
}


  
const doc = new Document({
  features: {
    updateFields: true,
  },
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
                        text: nombreCliente || "CLIENTE",
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

// Convertir una URL local (blob:) a base64 dataURL para poder persistirla
const convertirBlobUrlABase64 = async (blobUrl) => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const convertirBlobABase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Si viene como dataURL PNG grande, reducirlo a JPEG para evitar problemas por tamaño.
const convertirDataUrlAPngAJpeg = async (dataUrl, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('No se pudo obtener context canvas'));
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('No se pudo cargar imagen para convertir a JPEG'));
      img.src = dataUrl;
    } catch (e) {
      reject(e);
    }
  });
};

// Fallback: si la captura del mapa no está (imagenMapa null), generar una imagen estática
// desde coordenadas para que SI quede persistida en el historial.
const generarMapaBase64DesdeCoordenadas = async () => {
  const coordsStr = formData?.coordenadasRiesgo || '';
  if (!coordsStr || typeof coordsStr !== 'string') return null;

  const coordsMatch = coordsStr.trim().match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (!coordsMatch) return null;

  const lat = parseFloat(coordsMatch[1]);
  const lng = parseFloat(coordsMatch[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const osmStaticUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=500x300&markers=${lat},${lng},red-pushpin`;
  const response = await fetch(osmStaticUrl, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`No se pudo generar mapa estático. status=${response.status}`);
  }
  const blob = await response.blob();
  return convertirBlobABase64(blob);
};

const forzarCapturaMapaAntesDeGuardar = async () => {
  // Solicita una captura fresca del mapa antes de persistir para no perderla en ediciones futuras.
  setForzarCapturaMapa(prev => prev + 1);
  await new Promise(resolve => setTimeout(resolve, 1600));
};

const handleGuardarEnHistorial = async () => {
  await forzarCapturaMapaAntesDeGuardar();

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
    // `preview` normalmente es un blob: (URL.createObjectURL) o puede ser data:
    if (typeof preview === 'string' && preview.startsWith('data:')) {
      imagenBase64 = preview;
    } else if (typeof preview === 'string' && preview.startsWith('blob:')) {
      try {
        imagenBase64 = await convertirBlobUrlABase64(preview);
      } catch (error) {
        console.error('❌ Error convirtiendo preview blob a base64:', error);
      }
    } else {
      // Fallback: guardar la URL tal cual (para compatibilidad)
      imagenBase64 = preview;
    }
  }

  // `imagenMapa` suele ser un dataURL, pero si llegara como blob: lo convertimos
  let imagenMapaBase64 = imagenMapa;
  if (typeof imagenMapa === 'string' && imagenMapa.startsWith('blob:')) {
    try {
      imagenMapaBase64 = await convertirBlobUrlABase64(imagenMapa);
    } catch (error) {
      console.error('❌ Error convirtiendo imagenMapa blob a base64:', error);
    }
  }

  // Si no hay captura del mapa, generamos un mapa estático a partir de coordenadas
  // para evitar perderlo en el historial.
  if (!imagenMapaBase64 && formData?.coordenadasRiesgo) {
    try {
      imagenMapaBase64 = await generarMapaBase64DesdeCoordenadas();
} catch (e) {
      console.warn('⚠️ No se pudo generar mapa estático fallback:', e?.message || e);
    }
  }

  // Reducir tamaño si el mapa viene en PNG grande.
  if (
    typeof imagenMapaBase64 === 'string' &&
    imagenMapaBase64.startsWith('data:image/png') &&
    imagenMapaBase64.length > 2000000
  ) {
    try {
      imagenMapaBase64 = await convertirDataUrlAPngAJpeg(imagenMapaBase64, 0.7);
} catch (e) {
      console.warn('⚠️ No se pudo reducir mapa a JPEG:', e?.message || e);
    }
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
      recomendacionesItems: recomendacionesItems,
      firmanteInspector: cargo,
          puedeSuscribir: puedeSuscribir,
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
      caracteristicasConstruccion: caracteristicasConstruccion,
      anoConstruccion: anoConstruccion,
      tipoEdificio: tipoEdificio,
      tipoEdificioOtro: tipoEdificioOtro,
      areaLoteConstruccion: areaLoteConstruccion,
      areaConstruidaConstruccion: areaConstruidaConstruccion,
      numeroPisosConstruccion: numeroPisosConstruccion,
      cimentacion: cimentacion,
      cimentacionOtro: cimentacionOtro,
      materialesEstructura: materialesEstructura,
      materialesEstructuraOtro: materialesEstructuraOtro,
      regularidadPlanta: regularidadPlanta,
      danosPrevios: danosPrevios,
      reforzamientosEstructurales: reforzamientosEstructurales,
      sistemaEstructural: sistemaEstructural,
      sistemaEstructuralOtro: sistemaEstructuralOtro,
      estructuraCubierta: estructuraCubierta,
      estructuraCubiertaOtro: estructuraCubiertaOtro,
      regularAltura: regularAltura,
      danosReparados: danosReparados,
      // Materiales
      tipoInsumo: tipoInsumo,
      nivelRiesgoInsumo: nivelRiesgoInsumo,
      descripcionContenidosInsumo: descripcionContenidosInsumo,
      contenedoresInsumo: contenedoresInsumo,
      tipoAlmacenamientoInsumo: tipoAlmacenamientoInsumo,
      estadoAlmacenamientoInsumo: estadoAlmacenamientoInsumo,
      tipoMateriasPrimas: tipoMateriasPrimas,
      nivelRiesgoMateriasPrimas: nivelRiesgoMateriasPrimas,
      descripcionContenidosMateriasPrimas: descripcionContenidosMateriasPrimas,
      contenedoresMateriasPrimas: contenedoresMateriasPrimas,
      tipoAlmacenamientoMateriasPrimas: tipoAlmacenamientoMateriasPrimas,
      estadoAlmacenamientoMateriasPrimas: estadoAlmacenamientoMateriasPrimas,
      tipoMercancias: tipoMercancias,
      nivelRiesgoMercancias: nivelRiesgoMercancias,
      descripcionContenidosMercancias: descripcionContenidosMercancias,
      contenedoresMercancias: contenedoresMercancias,
      tipoAlmacenamientoMercancias: tipoAlmacenamientoMercancias,
      estadoAlmacenamientoMercancias: estadoAlmacenamientoMercancias,
      // Campos "Otro" de materiales
      tipoInsumoOtro: tipoInsumoOtro,
      contenedoresInsumoOtro: contenedoresInsumoOtro,
      tipoAlmacenamientoInsumoOtro: tipoAlmacenamientoInsumoOtro,
      tipoMateriasPrimasOtro: tipoMateriasPrimasOtro,
      contenedoresMateriasPrimasOtro: contenedoresMateriasPrimasOtro,
      tipoAlmacenamientoMateriasPrimasOtro: tipoAlmacenamientoMateriasPrimasOtro,
      tipoMercanciasOtro: tipoMercanciasOtro,
      contenedoresMercanciasOtro: contenedoresMercanciasOtro,
      tipoAlmacenamientoMercanciasOtro: tipoAlmacenamientoMercanciasOtro,
      // Características operativas ambientales - estado agrupado
      caracteristicasAmbientales: caracteristicasAmbientales,
      // Protección contra incendios detallado
      detectoresHumo: detectoresHumo,
      coberturaDeteccion: coberturaDeteccion,
      instalacionDeteccion: instalacionDeteccion,
      monitoreadoDeteccion: monitoreadoDeteccion,
      cantidadExtintores: cantidadExtintores,
      tipoExtintores: tipoExtintores,
      suficientesExtintores: suficientesExtintores,
      instalacionExtintores: instalacionExtintores,
      senalizacionExtintores: senalizacionExtintores,
      cargaVigenteExtintores: cargaVigenteExtintores,
      comentariosProteccionIncendios: comentariosProteccionIncendios,
      bombaPrincipal: bombaPrincipal,
      bombaJockey: bombaJockey,
      presionContraincendios: presionContraincendios,
      estacionBomberosNombre: estacionBomberosNombre,
      estacionBomberosTiempoMin: estacionBomberosTiempoMin,
      estacionBomberosDistanciaMetros: estacionBomberosDistanciaMetros,
      murosCortafuegos: murosCortafuegos,
      puertasCortafuego: puertasCortafuego,
      almacenamientoAguaRci: almacenamientoAguaRci,
      pruebasProteccionIncendios: pruebasProteccionIncendios,
      // Sustracción - Protecciones Físicas - estado agrupado
      sustraccion: sustraccion,
      // Lucro Cesante - estado agrupado
      lucroCesante: lucroCesante,
      // Procesos Críticos y Riesgos Medioambientales
      procesosCriticos: procesosCriticos,
      riesgosMedioambientales: riesgosMedioambientales,
      // Por rotura de maquinaria - estado agrupado
      roturaMaquinaria: roturaMaquinaria,
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
      siniestralidadAno: siniestralidadAno,
      siniestralidadValor: siniestralidadValor,
      siniestralidadDescripcion: siniestralidadDescripcion,
      siniestralidadMejoras: siniestralidadMejoras,
      almacenAlturaMaxima: almacenAlturaMaxima,
      almacenMatrizCompatibilidad: almacenMatrizCompatibilidad,
      almacenAlturaMaximaEstanteria: almacenAlturaMaximaEstanteria,
      mercPeligrosaTipo: mercPeligrosaTipo,
      mercPeligrosaTipoAlmacenamiento: mercPeligrosaTipoAlmacenamiento,
      mercPeligrosaProtecciones: mercPeligrosaProtecciones,
      maquinariaDescripcion: maquinariaDescripcion,
      promedioEdadEquipos: promedioEdadEquipos,
      tipoMantenimientoEquipos: tipoMantenimientoEquipos,
      bitacorasMantenimiento: bitacorasMantenimiento,
      personalMantenimiento: personalMantenimiento,
      periodicidadMantenimientos: periodicidadMantenimientos,
      tablaRiesgos: tablaRiesgos,
      barrio: barrio,
      horarioLaboral: horarioLaboral,
      nombreEmpresa: nombreEmpresa,
      municipio: municipio,
      personaEntrevistada: personaEntrevistada,
      imagen: imagenBase64,
      imagenesRegistro: imagenesRegistro,
      imagenMapa: imagenMapaBase64,
    }
  };

  const resultado = await guardarEnHistorial(datos, 'en_proceso');
  if (!resultado?.success) {
    console.warn('❌ No se pudo guardar correctamente:', resultado?.message);
  }
  alert(resultado?.message || 'Error al guardar el formulario');
};

const handleExportar = async () => {
  try {
    await forzarCapturaMapaAntesDeGuardar();

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
      // `preview` normalmente es un blob: (URL.createObjectURL) o puede ser data:
      if (typeof preview === 'string' && preview.startsWith('data:')) {
        imagenBase64 = preview;
      } else if (typeof preview === 'string' && preview.startsWith('blob:')) {
        try {
          imagenBase64 = await convertirBlobUrlABase64(preview);
        } catch (error) {
          console.error('❌ Error convirtiendo preview blob a base64 (exportar):', error);
        }
      } else {
        // Fallback: guardar la URL tal cual (para compatibilidad)
        imagenBase64 = preview;
      }
    }

    // `imagenMapa` suele ser un dataURL, pero si llegara como blob: lo convertimos
    let imagenMapaBase64 = imagenMapa;
    if (typeof imagenMapa === 'string' && imagenMapa.startsWith('blob:')) {
      try {
        imagenMapaBase64 = await convertirBlobUrlABase64(imagenMapa);
      } catch (error) {
        console.error('❌ Error convirtiendo imagenMapa blob a base64 (exportar):', error);
      }
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
        recomendacionesItems: recomendacionesItems,
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
        caracteristicasConstruccion: caracteristicasConstruccion,
      anoConstruccion: anoConstruccion,
      tipoEdificio: tipoEdificio,
      tipoEdificioOtro: tipoEdificioOtro,
      areaLoteConstruccion: areaLoteConstruccion,
      areaConstruidaConstruccion: areaConstruidaConstruccion,
      numeroPisosConstruccion: numeroPisosConstruccion,
      cimentacion: cimentacion,
      cimentacionOtro: cimentacionOtro,
      materialesEstructura: materialesEstructura,
      materialesEstructuraOtro: materialesEstructuraOtro,
      regularidadPlanta: regularidadPlanta,
      danosPrevios: danosPrevios,
      reforzamientosEstructurales: reforzamientosEstructurales,
      sistemaEstructural: sistemaEstructural,
      sistemaEstructuralOtro: sistemaEstructuralOtro,
      estructuraCubierta: estructuraCubierta,
      estructuraCubiertaOtro: estructuraCubiertaOtro,
      regularAltura: regularAltura,
      danosReparados: danosReparados,
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
        bombaPrincipal: bombaPrincipal,
        bombaJockey: bombaJockey,
        presionContraincendios: presionContraincendios,
        estacionBomberosNombre: estacionBomberosNombre,
        estacionBomberosTiempoMin: estacionBomberosTiempoMin,
        estacionBomberosDistanciaMetros: estacionBomberosDistanciaMetros,
        murosCortafuegos: murosCortafuegos,
        puertasCortafuego: puertasCortafuego,
        almacenamientoAguaRci: almacenamientoAguaRci,
        pruebasProteccionIncendios: pruebasProteccionIncendios,
        seguridadDescripcion: seguridadDescripcion,
        siniestralidad: siniestralidad,
        siniestralidadAno: siniestralidadAno,
        siniestralidadValor: siniestralidadValor,
        siniestralidadDescripcion: siniestralidadDescripcion,
        siniestralidadMejoras: siniestralidadMejoras,
        almacenAlturaMaxima: almacenAlturaMaxima,
        almacenMatrizCompatibilidad: almacenMatrizCompatibilidad,
        almacenAlturaMaximaEstanteria: almacenAlturaMaximaEstanteria,
        mercPeligrosaTipo: mercPeligrosaTipo,
        mercPeligrosaTipoAlmacenamiento: mercPeligrosaTipoAlmacenamiento,
        mercPeligrosaProtecciones: mercPeligrosaProtecciones,
        maquinariaDescripcion: maquinariaDescripcion,
        promedioEdadEquipos: promedioEdadEquipos,
        tipoMantenimientoEquipos: tipoMantenimientoEquipos,
        bitacorasMantenimiento: bitacorasMantenimiento,
        personalMantenimiento: personalMantenimiento,
        periodicidadMantenimientos: periodicidadMantenimientos,
        tablaRiesgos: tablaRiesgos,
        barrio: barrio,
        horarioLaboral: horarioLaboral,
        nombreEmpresa: nombreEmpresa,
        municipio: municipio,
        personaEntrevistada: personaEntrevistada,
        imagen: imagenBase64,
        imagenesRegistro: imagenesRegistro,
        imagenMapa: imagenMapaBase64,
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
// Handler memoizado para cambios en formData con startTransition para evitar bloqueos
const handleInputChange = useCallback((field, value) => {
  startTransition(() => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  });
}, []);

// Helper para crear handlers de onChange optimizados con startTransition
const createOptimizedHandler = useCallback((setter) => {
  return (e) => {
    const value = e?.target?.value ?? e;
    startTransition(() => {
      setter(value);
    });
  };
}, []);

// Hook personalizado para debounce de inputs
const useDebouncedState = (initialValue, delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return [value, debouncedValue, setValue];
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
        direccion: formulario.datos?.direccion || ''
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

      // Restaurar la imagen del mapa (ubicación satelital) para que al generar el Word
      // se inserte el mapa sin volver a capturarlo.
      const imagenMapaValue = formulario.datos?.imagenMapa || null;
      if (imagenMapaValue) {
        setImagenMapa(imagenMapaValue);
}
      
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
        // Análisis de riesgos - manejar formato nuevo (array) y antiguo (objeto)
        if (formulario.datos?.analisisRiesgos) {
          if (Array.isArray(formulario.datos.analisisRiesgos)) {
            // Formato nuevo: array
        setAnalisisRiesgos(formulario.datos.analisisRiesgos);
          } else {
            // Formato antiguo: objeto, convertir a array
            const riesgosArray = Object.entries(formulario.datos.analisisRiesgos).map(([riesgo, analisis], index) => ({
              id: index + 1,
              riesgo: riesgo,
              analisis: analisis || ""
            }));
            setAnalisisRiesgos(riesgosArray);
          }
        }
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
      
      // Características de la construcción
      setCaracteristicasConstruccion(formulario.datos?.caracteristicasConstruccion || '');
      setAnoConstruccion(formulario.datos?.anoConstruccion || '');
      setTipoEdificio(formulario.datos?.tipoEdificio || '');
      setTipoEdificioOtro(formulario.datos?.tipoEdificioOtro || '');
      setAreaLoteConstruccion(formulario.datos?.areaLoteConstruccion || '');
      setAreaConstruidaConstruccion(formulario.datos?.areaConstruidaConstruccion || '');
      setNumeroPisosConstruccion(formulario.datos?.numeroPisosConstruccion || '');
      setCimentacion(formulario.datos?.cimentacion || '');
      setCimentacionOtro(formulario.datos?.cimentacionOtro || '');
      setMaterialesEstructura(formulario.datos?.materialesEstructura || '');
      setMaterialesEstructuraOtro(formulario.datos?.materialesEstructuraOtro || '');
      setRegularidadPlanta(formulario.datos?.regularidadPlanta || '');
      setDanosPrevios(formulario.datos?.danosPrevios || '');
      setReforzamientosEstructurales(formulario.datos?.reforzamientosEstructurales || '');
      setSistemaEstructural(formulario.datos?.sistemaEstructural || '');
      setSistemaEstructuralOtro(formulario.datos?.sistemaEstructuralOtro || '');
      setEstructuraCubierta(formulario.datos?.estructuraCubierta || '');
      setEstructuraCubiertaOtro(formulario.datos?.estructuraCubiertaOtro || '');
      setRegularAltura(formulario.datos?.regularAltura || '');
      setDanosReparados(formulario.datos?.danosReparados || '');
      
      // Materiales
      setTipoInsumo(formulario.datos?.tipoInsumo || '');
      setNivelRiesgoInsumo(formulario.datos?.nivelRiesgoInsumo || '');
      setDescripcionContenidosInsumo(formulario.datos?.descripcionContenidosInsumo || '');
      setContenedoresInsumo(formulario.datos?.contenedoresInsumo || '');
      setTipoAlmacenamientoInsumo(formulario.datos?.tipoAlmacenamientoInsumo || '');
      setEstadoAlmacenamientoInsumo(formulario.datos?.estadoAlmacenamientoInsumo || '');
      setTipoMateriasPrimas(formulario.datos?.tipoMateriasPrimas || '');
      setNivelRiesgoMateriasPrimas(formulario.datos?.nivelRiesgoMateriasPrimas || '');
      setDescripcionContenidosMateriasPrimas(formulario.datos?.descripcionContenidosMateriasPrimas || '');
      setContenedoresMateriasPrimas(formulario.datos?.contenedoresMateriasPrimas || '');
      setTipoAlmacenamientoMateriasPrimas(formulario.datos?.tipoAlmacenamientoMateriasPrimas || '');
      setEstadoAlmacenamientoMateriasPrimas(formulario.datos?.estadoAlmacenamientoMateriasPrimas || '');
      setTipoMercancias(formulario.datos?.tipoMercancias || '');
      setNivelRiesgoMercancias(formulario.datos?.nivelRiesgoMercancias || '');
      setDescripcionContenidosMercancias(formulario.datos?.descripcionContenidosMercancias || '');
      setContenedoresMercancias(formulario.datos?.contenedoresMercancias || '');
      setTipoAlmacenamientoMercancias(formulario.datos?.tipoAlmacenamientoMercancias || '');
      setEstadoAlmacenamientoMercancias(formulario.datos?.estadoAlmacenamientoMercancias || '');
      // Campos "Otro" de materiales
      setTipoInsumoOtro(formulario.datos?.tipoInsumoOtro || '');
      setContenedoresInsumoOtro(formulario.datos?.contenedoresInsumoOtro || '');
      setTipoAlmacenamientoInsumoOtro(formulario.datos?.tipoAlmacenamientoInsumoOtro || '');
      setTipoMateriasPrimasOtro(formulario.datos?.tipoMateriasPrimasOtro || '');
      setContenedoresMateriasPrimasOtro(formulario.datos?.contenedoresMateriasPrimasOtro || '');
      setTipoAlmacenamientoMateriasPrimasOtro(formulario.datos?.tipoAlmacenamientoMateriasPrimasOtro || '');
      setTipoMercanciasOtro(formulario.datos?.tipoMercanciasOtro || '');
      setContenedoresMercanciasOtro(formulario.datos?.contenedoresMercanciasOtro || '');
      setTipoAlmacenamientoMercanciasOtro(formulario.datos?.tipoAlmacenamientoMercanciasOtro || '');
      // Características operativas ambientales - usar estado agrupado
      if (formulario.datos?.caracteristicasAmbientales) {
        setCaracteristicasAmbientales(formulario.datos.caracteristicasAmbientales);
      } else {
        // Compatibilidad con formato antiguo
        setCaracteristicasAmbientales({
          licenciaAmbiental: formulario.datos?.licenciaAmbiental || '',
          permisoVertimientos: formulario.datos?.permisoVertimientos || '',
          consumoAgua: formulario.datos?.consumoAgua || '',
          bombillasAhorradoras: formulario.datos?.bombillasAhorradoras || '',
          mercadoNoRegulado: formulario.datos?.mercadoNoRegulado || '',
          vertimientoAguasResiduales: formulario.datos?.vertimientoAguasResiduales || '',
          plantaTratamiento: formulario.datos?.plantaTratamiento || '',
          planManejoResiduos: formulario.datos?.planManejoResiduos || '',
          emisionesContaminantes: formulario.datos?.emisionesContaminantes || '',
          sistemaFiltracionGases: formulario.datos?.sistemaFiltracionGases || '',
          nivelesRuido: formulario.datos?.nivelesRuido || '',
          programaGestionAmbiental: formulario.datos?.programaGestionAmbiental || ''
        });
      }
      const ambientalesDatos = formulario.datos?.caracteristicasAmbientales || {};
      setLicenciaAmbiental(ambientalesDatos.licenciaAmbiental ?? formulario.datos?.licenciaAmbiental ?? '');
      setPermisoVertimientos(ambientalesDatos.permisoVertimientos ?? formulario.datos?.permisoVertimientos ?? '');
      setConsumoAgua(ambientalesDatos.consumoAgua ?? formulario.datos?.consumoAgua ?? '');
      setBombillasAhorradoras(ambientalesDatos.bombillasAhorradoras ?? formulario.datos?.bombillasAhorradoras ?? '');
      setMercadoNoRegulado(ambientalesDatos.mercadoNoRegulado ?? formulario.datos?.mercadoNoRegulado ?? '');
      setVertimientoAguasResiduales(ambientalesDatos.vertimientoAguasResiduales ?? formulario.datos?.vertimientoAguasResiduales ?? '');
      setPlantaTratamiento(ambientalesDatos.plantaTratamiento ?? formulario.datos?.plantaTratamiento ?? '');
      setPlanManejoResiduos(ambientalesDatos.planManejoResiduos ?? formulario.datos?.planManejoResiduos ?? '');
      setEmisionesContaminantes(ambientalesDatos.emisionesContaminantes ?? formulario.datos?.emisionesContaminantes ?? '');
      setSistemaFiltracionGases(ambientalesDatos.sistemaFiltracionGases ?? formulario.datos?.sistemaFiltracionGases ?? '');
      setNivelesRuido(ambientalesDatos.nivelesRuido ?? formulario.datos?.nivelesRuido ?? '');
      setProgramaGestionAmbiental(ambientalesDatos.programaGestionAmbiental ?? formulario.datos?.programaGestionAmbiental ?? '');
      // Protección contra incendios detallado
      setDetectoresHumo(formulario.datos?.detectoresHumo || '');
      setCoberturaDeteccion(formulario.datos?.coberturaDeteccion || '');
      setInstalacionDeteccion(formulario.datos?.instalacionDeteccion || '');
      setMonitoreadoDeteccion(formulario.datos?.monitoreadoDeteccion || '');
      setCantidadExtintores(formulario.datos?.cantidadExtintores || '');
      setTipoExtintores(formulario.datos?.tipoExtintores || '');
      setSuficientesExtintores(formulario.datos?.suficientesExtintores || '');
      setInstalacionExtintores(formulario.datos?.instalacionExtintores || '');
      setSenalizacionExtintores(formulario.datos?.senalizacionExtintores || '');
      setCargaVigenteExtintores(formulario.datos?.cargaVigenteExtintores || '');
      setComentariosProteccionIncendios(formulario.datos?.comentariosProteccionIncendios || '');
      setBombaPrincipal(formulario.datos?.bombaPrincipal || '');
      setBombaJockey(formulario.datos?.bombaJockey || '');
      setPresionContraincendios(formulario.datos?.presionContraincendios || '');
      setEstacionBomberosNombre(formulario.datos?.estacionBomberosNombre || '');
      setEstacionBomberosTiempoMin(formulario.datos?.estacionBomberosTiempoMin || '');
      setEstacionBomberosDistanciaMetros(formulario.datos?.estacionBomberosDistanciaMetros || '');
      setMurosCortafuegos(formulario.datos?.murosCortafuegos || '');
      setPuertasCortafuego(formulario.datos?.puertasCortafuego || '');
      setAlmacenamientoAguaRci(formulario.datos?.almacenamientoAguaRci || '');
      setPruebasProteccionIncendios(formulario.datos?.pruebasProteccionIncendios || '');
      // Sustracción - Protecciones Físicas
      const sustraccionDatos = formulario.datos?.sustraccion || {};
      setUbicacionPredio(sustraccionDatos.ubicacionPredio ?? formulario.datos?.ubicacionPredio ?? '');
      setVulnerabilidadContenidos(sustraccionDatos.vulnerabilidadContenidos ?? formulario.datos?.vulnerabilidadContenidos ?? '');
      setAccesoInstalaciones(sustraccionDatos.accesoInstalaciones ?? formulario.datos?.accesoInstalaciones ?? '');
      setCirculacionPersonasExternas(sustraccionDatos.circulacionPersonasExternas ?? formulario.datos?.circulacionPersonasExternas ?? '');
      setProteccionesPasivas(sustraccionDatos.proteccionesPasivas ?? formulario.datos?.proteccionesPasivas ?? '');
      setTieneAlarma(sustraccionDatos.tieneAlarma ?? formulario.datos?.tieneAlarma ?? '');
      setAlarmaMonitoreadaSustraccion(sustraccionDatos.alarmaMonitoreadaSustraccion ?? formulario.datos?.alarmaMonitoreadaSustraccion ?? '');
      setEmpresaMonitorea(sustraccionDatos.empresaMonitorea ?? formulario.datos?.empresaMonitorea ?? '');
      setTipoComunicacionAlarma(sustraccionDatos.tipoComunicacionAlarma ?? formulario.datos?.tipoComunicacionAlarma ?? '');
      setCoberturaAlarma(sustraccionDatos.coberturaAlarma ?? formulario.datos?.coberturaAlarma ?? '');
      setSensoresAlarma(sustraccionDatos.sensoresAlarma ?? formulario.datos?.sensoresAlarma ?? '');
      setCuentaConCCTV(sustraccionDatos.cuentaConCCTV ?? formulario.datos?.cuentaConCCTV ?? '');
      setNumeroCamaras(sustraccionDatos.numeroCamaras ?? formulario.datos?.numeroCamaras ?? '');
      setControladoPor(sustraccionDatos.controladoPor ?? formulario.datos?.controladoPor ?? '');
      setTipoMonitoreoCCTV(sustraccionDatos.tipoMonitoreoCCTV ?? formulario.datos?.tipoMonitoreoCCTV ?? '');
      setFrecuenciaGrabacion(sustraccionDatos.frecuenciaGrabacion ?? formulario.datos?.frecuenciaGrabacion ?? '');
      setTiempoRespaldo(sustraccionDatos.tiempoRespaldo ?? formulario.datos?.tiempoRespaldo ?? '');
      setDispositivoGrabacion(sustraccionDatos.dispositivoGrabacion ?? formulario.datos?.dispositivoGrabacion ?? '');
      setUbicacionGrabador(sustraccionDatos.ubicacionGrabador ?? formulario.datos?.ubicacionGrabador ?? '');
      setVisualizacionInternet(sustraccionDatos.visualizacionInternet ?? formulario.datos?.visualizacionInternet ?? '');
      setCuentaConVigilancia(sustraccionDatos.cuentaConVigilancia ?? formulario.datos?.cuentaConVigilancia ?? '');
      setContratadaCon(sustraccionDatos.contratadaCon ?? formulario.datos?.contratadaCon ?? '');
      setNumeroVigilantes(sustraccionDatos.numeroVigilantes ?? formulario.datos?.numeroVigilantes ?? '');
      setJornadaVigilancia(sustraccionDatos.jornadaVigilancia ?? formulario.datos?.jornadaVigilancia ?? '');
      setTienenArmas(sustraccionDatos.tienenArmas ?? formulario.datos?.tienenArmas ?? '');
      setTienenRadio(sustraccionDatos.tienenRadio ?? formulario.datos?.tienenRadio ?? '');
      // Campos "Otro" de Sustracción
      setUbicacionPredioOtro(sustraccionDatos.ubicacionPredioOtro ?? formulario.datos?.ubicacionPredioOtro ?? '');
      setVulnerabilidadContenidosOtro(sustraccionDatos.vulnerabilidadContenidosOtro ?? formulario.datos?.vulnerabilidadContenidosOtro ?? '');
      setAccesoInstalacionesOtro(sustraccionDatos.accesoInstalacionesOtro ?? formulario.datos?.accesoInstalacionesOtro ?? '');
      setCirculacionPersonasExternasOtro(sustraccionDatos.circulacionPersonasExternasOtro ?? formulario.datos?.circulacionPersonasExternasOtro ?? '');
      setProteccionesPasivasOtro(sustraccionDatos.proteccionesPasivasOtro ?? formulario.datos?.proteccionesPasivasOtro ?? '');
      setTipoComunicacionAlarmaOtro(sustraccionDatos.tipoComunicacionAlarmaOtro ?? formulario.datos?.tipoComunicacionAlarmaOtro ?? '');
      setSensoresAlarmaOtro(sustraccionDatos.sensoresAlarmaOtro ?? formulario.datos?.sensoresAlarmaOtro ?? '');
      setControladoPorOtro(sustraccionDatos.controladoPorOtro ?? formulario.datos?.controladoPorOtro ?? '');
      setTipoMonitoreoCCTVOtro(sustraccionDatos.tipoMonitoreoCCTVOtro ?? formulario.datos?.tipoMonitoreoCCTVOtro ?? '');
      setFrecuenciaGrabacionOtro(sustraccionDatos.frecuenciaGrabacionOtro ?? formulario.datos?.frecuenciaGrabacionOtro ?? '');
      setDispositivoGrabacionOtro(sustraccionDatos.dispositivoGrabacionOtro ?? formulario.datos?.dispositivoGrabacionOtro ?? '');
      setUbicacionGrabadorOtro(sustraccionDatos.ubicacionGrabadorOtro ?? formulario.datos?.ubicacionGrabadorOtro ?? '');
      setJornadaVigilanciaOtro(sustraccionDatos.jornadaVigilanciaOtro ?? formulario.datos?.jornadaVigilanciaOtro ?? '');
      setPersonalRecaudo(sustraccionDatos.personalRecaudo ?? formulario.datos?.personalRecaudo ?? '');
      setHorariosRecaudo(sustraccionDatos.horariosRecaudo ?? formulario.datos?.horariosRecaudo ?? '');
      setLugarRecaudo(sustraccionDatos.lugarRecaudo ?? formulario.datos?.lugarRecaudo ?? '');
      setTransporteDinero(sustraccionDatos.transporteDinero ?? formulario.datos?.transporteDinero ?? '');
      // Lucro Cesante
      const lucroDatos = formulario.datos?.lucroCesante || {};
      setAreaRequeridaLucroCesante(lucroDatos.areaRequeridaLucroCesante ?? formulario.datos?.areaRequeridaLucroCesante ?? '');
      setComplejidadActividadLucroCesante(lucroDatos.complejidadActividadLucroCesante ?? formulario.datos?.complejidadActividadLucroCesante ?? '');
      setPlanContinuidadNegocio(lucroDatos.planContinuidadNegocio ?? formulario.datos?.planContinuidadNegocio ?? '');
      setValorNominaMensual(lucroDatos.valorNominaMensual ?? formulario.datos?.valorNominaMensual ?? '');
      setValorFacturacionAnoAnterior(lucroDatos.valorFacturacionAnoAnterior ?? formulario.datos?.valorFacturacionAnoAnterior ?? '');
      setValorProyectadoFacturacion(lucroDatos.valorProyectadoFacturacion ?? formulario.datos?.valorProyectadoFacturacion ?? '');
      setComentariosLucroCesante(lucroDatos.comentariosLucroCesante ?? formulario.datos?.comentariosLucroCesante ?? '');
      // Campos "Otro" para Lucro Cesante
      setAreaRequeridaLucroCesanteOtro(lucroDatos.areaRequeridaLucroCesanteOtro ?? formulario.datos?.areaRequeridaLucroCesanteOtro ?? '');
      setComplejidadActividadLucroCesanteOtro(lucroDatos.complejidadActividadLucroCesanteOtro ?? formulario.datos?.complejidadActividadLucroCesanteOtro ?? '');
      // Procesos Críticos y Riesgos Medioambientales
      setProcesosCriticos(formulario.datos?.procesosCriticos || '');
      setRiesgosMedioambientales(formulario.datos?.riesgosMedioambientales || '');
      // Por rotura de maquinaria
      const roturaDatos = formulario.datos?.roturaMaquinaria || {};
      setCapacidadInstaladaPlanta(roturaDatos.capacidadInstaladaPlanta ?? formulario.datos?.capacidadInstaladaPlanta ?? '');
      setIndicePromedioCapacidad(roturaDatos.indicePromedioCapacidad ?? formulario.datos?.indicePromedioCapacidad ?? '');
      setNumeroLineasProduccion(roturaDatos.numeroLineasProduccion ?? formulario.datos?.numeroLineasProduccion ?? '');
      setMaquinariaCritica(roturaDatos.maquinariaCritica ?? formulario.datos?.maquinariaCritica ?? '');
      setIncidenciaProduccion(roturaDatos.incidenciaProduccion ?? formulario.datos?.incidenciaProduccion ?? '');
      setOrigenMaquinariaCritica(roturaDatos.origenMaquinariaCritica ?? formulario.datos?.origenMaquinariaCritica ?? '');
      setRepresentacionNacionalMaquinaria(roturaDatos.representacionNacionalMaquinaria ?? formulario.datos?.representacionNacionalMaquinaria ?? '');
      setMaquinariaStandBy(roturaDatos.maquinariaStandBy ?? formulario.datos?.maquinariaStandBy ?? '');
      setEmpresasSateliteProduccion(roturaDatos.empresasSateliteProduccion ?? formulario.datos?.empresasSateliteProduccion ?? '');
      setConveniosOtrasEmpresas(roturaDatos.conveniosOtrasEmpresas ?? formulario.datos?.conveniosOtrasEmpresas ?? '');
      
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
      setSiniestralidadAno(formulario.datos?.siniestralidadAno || '');
      setSiniestralidadValor(formulario.datos?.siniestralidadValor || '');
      setSiniestralidadDescripcion(formulario.datos?.siniestralidadDescripcion || formulario.datos?.siniestralidad || '');
      setSiniestralidadMejoras(formulario.datos?.siniestralidadMejoras || '');
      setAlmacenAlturaMaxima(formulario.datos?.almacenAlturaMaxima || '');
      setAlmacenMatrizCompatibilidad(formulario.datos?.almacenMatrizCompatibilidad || '');
      setAlmacenAlturaMaximaEstanteria(formulario.datos?.almacenAlturaMaximaEstanteria || '');
      setMercPeligrosaTipo(formulario.datos?.mercPeligrosaTipo || '');
      setMercPeligrosaTipoAlmacenamiento(formulario.datos?.mercPeligrosaTipoAlmacenamiento || '');
      setMercPeligrosaProtecciones(formulario.datos?.mercPeligrosaProtecciones || '');
      setMaquinariaDescripcion(formulario.datos?.maquinariaDescripcion || '');
      setPromedioEdadEquipos(formulario.datos?.promedioEdadEquipos || '');
      setTipoMantenimientoEquipos(formulario.datos?.tipoMantenimientoEquipos || '');
      setBitacorasMantenimiento(formulario.datos?.bitacorasMantenimiento || '');
      setPersonalMantenimiento(formulario.datos?.personalMantenimiento || '');
      setPeriodicidadMantenimientos(formulario.datos?.periodicidadMantenimientos || '');
      
      // Tabla de riesgos - sincronizar con analisisRiesgos
      if (formulario.datos?.tablaRiesgos) {
        if (Array.isArray(formulario.datos.tablaRiesgos)) {
          // Formato nuevo: array con id
        setTablaRiesgos(formulario.datos.tablaRiesgos);
        } else {
          // Formato antiguo: array sin id, sincronizar con analisisRiesgos
          const riesgosAnalisis = Array.isArray(formulario.datos.analisisRiesgos) 
            ? formulario.datos.analisisRiesgos 
            : Object.entries(formulario.datos.analisisRiesgos || {}).map(([riesgo, analisis], index) => ({
                id: index + 1,
                riesgo: riesgo,
                analisis: analisis || ""
              }));
          
          const tablaActualizada = riesgosAnalisis.map((riesgoAnalisis, index) => {
            const riesgoTabla = formulario.datos.tablaRiesgos[index] || {};
            return {
              id: riesgoAnalisis.id,
              riesgo: riesgoAnalisis.riesgo,
              probabilidad: riesgoTabla.probabilidad || 0,
              severidad: riesgoTabla.severidad || 0,
              r: riesgoTabla.r || 0,
              indice: riesgoTabla.indice || 0,
              clasificacion: riesgoTabla.clasificacion || "Bajo"
            };
          });
          setTablaRiesgos(tablaActualizada);
        }
      } else if (formulario.datos?.analisisRiesgos) {
        // Si hay analisisRiesgos pero no tablaRiesgos, crear tablaRiesgos desde analisisRiesgos
        const riesgosAnalisis = Array.isArray(formulario.datos.analisisRiesgos) 
          ? formulario.datos.analisisRiesgos 
          : Object.entries(formulario.datos.analisisRiesgos).map(([riesgo, analisis], index) => ({
              id: index + 1,
              riesgo: riesgo,
              analisis: analisis || ""
            }));
        
        const nuevaTabla = riesgosAnalisis.map(riesgo => ({
          id: riesgo.id,
          riesgo: riesgo.riesgo,
          probabilidad: 0,
          severidad: 0,
          r: 0,
          indice: 0,
          clasificacion: "Bajo"
        }));
        setTablaRiesgos(nuevaTabla);
      }
      
      // Recomendaciones (lista + migración desde texto plano antiguo)
      setRecomendacionesItems(
        normalizarRecomendacionesItemsDesdeDatos(formulario.datos || {})
      );
      
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
      
      // Procesar imágenes de registro si existen (compatibilidad con formatos legacy)
      const extraerImagenesRegistroDesdeHistorial = (formularioData) => {
        const candidatos = [
          formularioData?.datos?.imagenesRegistro,
          formularioData?.imagenesRegistro,
          formularioData?.datos?.registroFotografico,
          formularioData?.datos?.imagenes,
          formularioData?.datos?.fotos
        ];

        for (const candidato of candidatos) {
          if (Array.isArray(candidato)) return candidato;

          if (typeof candidato === 'string') {
            try {
              const parseado = JSON.parse(candidato);
              if (Array.isArray(parseado)) return parseado;
            } catch {
              // Ignorar strings que no sean JSON válido
            }
          }

          if (candidato && typeof candidato === 'object' && !Array.isArray(candidato)) {
            // Algunos documentos antiguos pueden tener una sola imagen como objeto
            return [candidato];
          }
        }

        return [];
      };

      const imagenesRegistroHistorial = extraerImagenesRegistroDesdeHistorial(formulario);

      if (Array.isArray(imagenesRegistroHistorial) && imagenesRegistroHistorial.length > 0) {
const baseURL = BASE_URL;

        const imagenesProcesadas = await Promise.all(
          imagenesRegistroHistorial.map(async (img, index) => {
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
            onChange={handleNombreClienteChange}
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
            (() => {
              const ciudad = formData.ciudad_siniestro;
              if (!ciudad) return "_________";
              if (typeof ciudad === "object") {
                if (typeof ciudad.label === "string" && ciudad.label.trim()) {
                  return ciudad.label.split(" - ")[0].trim();
                }
                if (typeof ciudad.value === "string" && ciudad.value.trim()) {
                  return ciudad.value.trim();
                }
                return "_________";
              }
              if (typeof ciudad === "string" && ciudad.trim()) {
                return ciudad.split(" - ")[0].trim();
              }
              return "_________";
            })()
          }
        </p>
                <br />
        <p>Señores</p>
        <p><strong>{aseguradora}</strong></p>
        <p>
          Ciudad: {
            (() => {
              const ciudad = formData.ciudad_siniestro;
              if (!ciudad) return "_________";
              if (typeof ciudad === "object") {
                if (typeof ciudad.label === "string" && ciudad.label.trim()) {
                  return ciudad.label.split(" - ")[0].trim();
                }
                if (typeof ciudad.value === "string" && ciudad.value.trim()) {
                  return ciudad.value.trim();
                }
                return "_________";
              }
              if (typeof ciudad === "string" && ciudad.trim()) {
                return ciudad.split(" - ")[0].trim();
              }
              return "_________";
            })()
          }
        </p>        <br />
        <p><strong>REF&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: INFORME DE INSPECCIÓN</strong></p>
        <p>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ASEGURADO: {nombreCliente}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;PREDIO INSPECCIONADO: {direccion}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;FECHA DE INSPECCIÓN:{" "}
          {formatearFechaInspeccion(fecha)}
        </p>
        
        <p className="mt-3">¿El riesgo se puede suscribir?</p>
        <select
          value={puedeSuscribir}
          onChange={(e) => setPuedeSuscribir(e.target.value)}
          className="mt-1 w-full p-2 rounded"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            border: `1px solid ${borderColor}`,
          }}
          disabled={cargando}
        >
          <option value="SI">Se puede suscribir</option>
          <option value="NO">No se puede suscribir</option>
        </select>

        <br />
        <p>Apreciados Señores:</p>
        <p>
          Tomando como base la asignación de inspección que nos fuera oficializada, estamos adjuntando el informe único y confidencial de las labores realizadas en el Riesgo en referencia.
        </p>
        <p>
          Luego de analizar los diferentes aspectos relacionados con el estado actual del predio, así como las protecciones existentes contra posibles eventos como incendio, hurto, entre otros; se afirma que el riesgo <strong>{textoSuscripcion}</strong>. No obstante, se deben cumplir las recomendaciones para el mejoramiento del riesgo y prevención de emergencias.
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
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["0.", "INFORME DE INSPECCIÓN", "2"],
                ["1.", "INFORMACIÓN GENERAL", "8"],
                ["2.", "DESCRIPCIÓN GENERAL DE LA EMPRESA", "9"],
                ["3.", "INFRAESTRUCTURA", "10"],
                ["4.", "PROCESOS", "11"],
                ["5.", "LINDEROS", "12"],
                ["5.1", "MAPA DE UBICACIÓN", "13"],
                ["6.", "SUSTRACCIÓN - PROTECCIONES FÍSICAS", "14"],
                ["7.", "CARACTERÍSTICAS OPERATIVAS AMBIENTALES", "15"],
                ["8.", "PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS", "16"],
                ["9.", "LUCRO CESANTE", "17"],
                ["10.", "PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES", "18"],
                ["11.", "POR ROTURA DE MAQUINARIA", "19"],
                ["12.", "MAQUINARIA, EQUIPOS Y MANTENIMIENTO", "20"],
                ["13.", "SERVICIOS INDUSTRIALES", "21"],
                ["14.", "SINIESTRALIDAD", "22"],
                ["15.", "ALMACENAMIENTO", "23"],
                ["16.", "ANÁLISIS Y CLASIFICACIÓN DE RIESGOS", "24"],
                ["16.1", "ANÁLISIS DE RIESGOS", "24"],
                ["16.2", "CLASIFICACIÓN DE RIESGOS", "25"],
                ["16.3", "CALIFICACIÓN DEL RIESGO (R) E ÍNDICE DE VULNERABILIDAD", "26"],
                ["16.4", "MATRIZ DE CALOR DE RIESGOS", "27"],
                ["17.", "RECOMENDACIONES", "28"],
                ["18.", "REGISTRO FOTOGRÁFICO", "29"]
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
        onChange={handleNombreEmpresaChange}
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
        onChange={handleDireccionChange}
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
        onChange={handlePersonaEntrevistadaChange}
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
        onChange={handleBarrioChange}
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
        onChange={handleCargoChange}
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
        onChange={handleHorarioLaboralChange}
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
        onChange={handleColaboladoresChange}
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

{/* Campo de comentarios adicionales */}
<div className="mb-6">
  <label 
    className="block text-sm font-semibold mb-2"
    style={{ color: textPrimary }}
  >
    Comentarios adicionales sobre las características de la construcción
  </label>
  <textarea
    rows={8}
    placeholder="Describe aquí cualquier información adicional sobre las características de la construcción (estructura, materiales, techos, pisos, estado general, etc.)..."
    value={caracteristicasConstruccion}
    onChange={(e) => setCaracteristicasConstruccion(e.target.value)}
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

{/* Tabla: Edificación Principal - Primera Sección */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Edificación Principal
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '30%'
            }}
          >
            Año de construcción
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <Select
              options={opcionesAños}
              value={opcionesAños.find(opcion => opcion.value === anoConstruccion) || null}
              onChange={(selected) => setAnoConstruccion(selected ? selected.value : "")}
              placeholder="Buscar año..."
              isSearchable
              isClearable
              className="w-full"
              isDisabled={cargando}
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  fontSize: '14px',
                  minHeight: '38px',
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
                    ? (theme === 'dark' ? '#2D2D2D' : '#F3F4F6')
                    : inputBg,
                  color: state.isSelected 
                    ? '#FFFFFF'
                    : textPrimary,
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? '#2D2D2D' : '#F3F4F6',
                  }
                }),
                input: (provided) => ({
                  ...provided,
                  color: textPrimary,
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: textPrimary,
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: textSecondary,
                }),
                menu: (provided) => ({
                  ...provided,
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                }),
              }}
            />
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '30%'
            }}
          >
            Tipo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoEdificio}
              onChange={(e) => setTipoEdificio(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Edificio">Edificio</option>
              <option value="Bodega">Bodega</option>
              <option value="Nave Industrial">Nave Industrial</option>
              <option value="Casa">Casa</option>
              <option value="Local Comercial">Local Comercial</option>
              <option value="Oficina">Oficina</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoEdificio === "Otro" && (
              <input
                type="text"
                value={tipoEdificioOtro}
                onChange={(e) => setTipoEdificioOtro(e.target.value)}
                placeholder="Especifique el tipo de edificio..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Área de lote
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={areaLoteConstruccion}
              onChange={(e) => setAreaLoteConstruccion(e.target.value)}
              placeholder="Ej: 1.600 m²"
              className="w-full px-2 py-1 rounded"
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
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Área construida
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={areaConstruidaConstruccion}
              onChange={(e) => setAreaConstruidaConstruccion(e.target.value)}
              placeholder="Ej: 1.200 m²"
              className="w-full px-2 py-1 rounded"
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
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Número de pisos
          </td>
          <td 
            colSpan="3"
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={numeroPisosConstruccion}
              onChange={(e) => setNumeroPisosConstruccion(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="Más de 10">Más de 10</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Tabla: Edificación Principal - Segunda Sección */}
<div className="mb-6">
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '30%'
            }}
          >
            Cimentación
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={cimentacion}
              onChange={(e) => setCimentacion(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Pilotes aislados">Pilotes aislados</option>
              <option value="Zapatas aisladas">Zapatas aisladas</option>
              <option value="Zapatas corridas">Zapatas corridas</option>
              <option value="Losas de cimentación">Losas de cimentación</option>
              <option value="Muros de contención">Muros de contención</option>
              <option value="Otro">Otro</option>
            </select>
            {cimentacion === "Otro" && (
              <input
                type="text"
                value={cimentacionOtro}
                onChange={(e) => setCimentacionOtro(e.target.value)}
                placeholder="Especifique el tipo de cimentación..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Materiales estructura
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={materialesEstructura}
              onChange={(e) => setMaterialesEstructura(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Mampostería - Reforzada">Mampostería - Reforzada</option>
              <option value="Mampostería - No reforzada">Mampostería - No reforzada</option>
              <option value="Concreto reforzado">Concreto reforzado</option>
              <option value="Acero estructural">Acero estructural</option>
              <option value="Madera">Madera</option>
              <option value="Mixto">Mixto</option>
              <option value="Otro">Otro</option>
            </select>
            {materialesEstructura === "Otro" && (
              <input
                type="text"
                value={materialesEstructuraOtro}
                onChange={(e) => setMaterialesEstructuraOtro(e.target.value)}
                placeholder="Especifique los materiales de estructura..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Regularidad de planta
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={regularidadPlanta}
              onChange={(e) => setRegularidadPlanta(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="1 = con irregularidad">1 = con irregularidad</option>
              <option value="2 = sin irregularidad">2 = sin irregularidad</option>
            </select>
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Daños previos
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={danosPrevios}
              onChange={(e) => setDanosPrevios(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="1 = inmueble con daños previos">1 = inmueble con daños previos</option>
              <option value="2 = inmueble sin daños previos">2 = inmueble sin daños previos</option>
            </select>
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Reforzamientos estructurales
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={reforzamientosEstructurales}
              onChange={(e) => setReforzamientosEstructurales(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="1 = trabes coladas en sitio">1 = trabes coladas en sitio</option>
              <option value="2 = trabes prefabricadas">2 = trabes prefabricadas</option>
              <option value="3 = losas macizas">3 = losas macizas</option>
              <option value="4 = losas aligeradas">4 = losas aligeradas</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Sistema estructural
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={sistemaEstructural}
              onChange={(e) => setSistemaEstructural(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Estructura portante">Estructura portante</option>
              <option value="Estructura de acero">Estructura de acero</option>
              <option value="Estructura de concreto">Estructura de concreto</option>
              <option value="Estructura mixta">Estructura mixta</option>
              <option value="Muros de carga">Muros de carga</option>
              <option value="Otro">Otro</option>
            </select>
            {sistemaEstructural === "Otro" && (
              <input
                type="text"
                value={sistemaEstructuralOtro}
                onChange={(e) => setSistemaEstructuralOtro(e.target.value)}
                placeholder="Especifique el sistema estructural..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Estructura cubierta
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={estructuraCubierta}
              onChange={(e) => setEstructuraCubierta(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Metálica">Metálica</option>
              <option value="Concreto">Concreto</option>
              <option value="Madera">Madera</option>
              <option value="Mixta">Mixta</option>
              <option value="Otro">Otro</option>
            </select>
            {estructuraCubierta === "Otro" && (
              <input
                type="text"
                value={estructuraCubiertaOtro}
                onChange={(e) => setEstructuraCubiertaOtro(e.target.value)}
                placeholder="Especifique el tipo de estructura cubierta..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Regular de altura
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={regularAltura}
              onChange={(e) => setRegularAltura(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="1 = con irregularidad">1 = con irregularidad</option>
              <option value="2 = sin irregularidad">2 = sin irregularidad</option>
            </select>
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Daños reparados
          </td>
          <td 
            colSpan="3"
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={danosReparados}
              onChange={(e) => setDanosReparados(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
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

  {/* Materiales (parte de 4. PROCESOS) */}
  <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
{/* Tabla: Insumos */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Insumos
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '30%'
            }}
          >
            Tipo de insumo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoInsumo}
              onChange={(e) => setTipoInsumo(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="No combustibles">No combustibles</option>
              <option value="Combustibles">Combustibles</option>
              <option value="Inflamables">Inflamables</option>
              <option value="Explosivos">Explosivos</option>
              <option value="Tóxicos">Tóxicos</option>
              <option value="Corrosivos">Corrosivos</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoInsumo === "Otro" && (
              <input
                type="text"
                value={tipoInsumoOtro}
                onChange={(e) => setTipoInsumoOtro(e.target.value)}
                placeholder="Especifique el tipo de insumo..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Nivel de riesgo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={nivelRiesgoInsumo}
              onChange={(e) => setNivelRiesgoInsumo(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Bajo">Bajo</option>
              <option value="Medio">Medio</option>
              <option value="Alto">Alto</option>
              <option value="Extremo">Extremo</option>
            </select>
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Descripción de los contenidos
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={descripcionContenidosInsumo}
              onChange={(e) => setDescripcionContenidosInsumo(e.target.value)}
              placeholder="Ej: Sal"
              className="w-full px-2 py-1 rounded"
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
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Contenedores
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={contenedoresInsumo}
              onChange={(e) => setContenedoresInsumo(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Empaque combustible">Empaque combustible</option>
              <option value="Empaque no combustible">Empaque no combustible</option>
              <option value="Contenedores metálicos">Contenedores metálicos</option>
              <option value="Contenedores plásticos">Contenedores plásticos</option>
              <option value="Sacos">Sacos</option>
              <option value="Bidones">Bidones</option>
              <option value="Otro">Otro</option>
            </select>
            {contenedoresInsumo === "Otro" && (
              <input
                type="text"
                value={contenedoresInsumoOtro}
                onChange={(e) => setContenedoresInsumoOtro(e.target.value)}
                placeholder="Especifique el tipo de contenedor..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tipo de almacenamiento
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoAlmacenamientoInsumo}
              onChange={(e) => setTipoAlmacenamientoInsumo(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Almacenamiento en silos, tanques o contenedores">Almacenamiento en silos, tanques o contenedores</option>
              <option value="Almacenamiento en estanterías">Almacenamiento en estanterías</option>
              <option value="Almacenamiento en pallets">Almacenamiento en pallets</option>
              <option value="Almacenamiento en bodega cerrada">Almacenamiento en bodega cerrada</option>
              <option value="Almacenamiento al aire libre">Almacenamiento al aire libre</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoAlmacenamientoInsumo === "Otro" && (
              <input
                type="text"
                value={tipoAlmacenamientoInsumoOtro}
                onChange={(e) => setTipoAlmacenamientoInsumoOtro(e.target.value)}
                placeholder="Especifique el tipo de almacenamiento..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Estado de almacenamiento
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={estadoAlmacenamientoInsumo}
              onChange={(e) => setEstadoAlmacenamientoInsumo(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Adecuado">Adecuado</option>
              <option value="Regular">Regular</option>
              <option value="Deficiente">Deficiente</option>
              <option value="Crítico">Crítico</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Tabla: Materias Primas */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Materias Primas
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '30%'
            }}
          >
            Tipo de materias primas
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoMateriasPrimas}
              onChange={(e) => setTipoMateriasPrimas(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="No combustibles">No combustibles</option>
              <option value="Combustibles">Combustibles</option>
              <option value="Inflamables">Inflamables</option>
              <option value="Explosivos">Explosivos</option>
              <option value="Tóxicos">Tóxicos</option>
              <option value="Corrosivos">Corrosivos</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoMateriasPrimas === "Otro" && (
              <input
                type="text"
                value={tipoMateriasPrimasOtro}
                onChange={(e) => setTipoMateriasPrimasOtro(e.target.value)}
                placeholder="Especifique el tipo de materias primas..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Nivel de riesgo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={nivelRiesgoMateriasPrimas}
              onChange={(e) => setNivelRiesgoMateriasPrimas(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Bajo">Bajo</option>
              <option value="Medio">Medio</option>
              <option value="Alto">Alto</option>
              <option value="Extremo">Extremo</option>
            </select>
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Descripción de los contenidos
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={descripcionContenidosMateriasPrimas}
              onChange={(e) => setDescripcionContenidosMateriasPrimas(e.target.value)}
              placeholder="Ej: Viseras de cerdo"
              className="w-full px-2 py-1 rounded"
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
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Contenedores
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={contenedoresMateriasPrimas}
              onChange={(e) => setContenedoresMateriasPrimas(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Empaque combustible">Empaque combustible</option>
              <option value="Empaque no combustible">Empaque no combustible</option>
              <option value="Contenedores metálicos">Contenedores metálicos</option>
              <option value="Contenedores plásticos">Contenedores plásticos</option>
              <option value="Sacos">Sacos</option>
              <option value="Bidones">Bidones</option>
              <option value="Otro">Otro</option>
            </select>
            {contenedoresMateriasPrimas === "Otro" && (
              <input
                type="text"
                value={contenedoresMateriasPrimasOtro}
                onChange={(e) => setContenedoresMateriasPrimasOtro(e.target.value)}
                placeholder="Especifique el tipo de contenedor..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tipo de almacenamiento
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoAlmacenamientoMateriasPrimas}
              onChange={(e) => setTipoAlmacenamientoMateriasPrimas(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Almacenamiento en silos, tanques o contenedores">Almacenamiento en silos, tanques o contenedores</option>
              <option value="Almacenamiento en estanterías">Almacenamiento en estanterías</option>
              <option value="Almacenamiento en pallets">Almacenamiento en pallets</option>
              <option value="Almacenamiento en bodega cerrada">Almacenamiento en bodega cerrada</option>
              <option value="Almacenamiento al aire libre">Almacenamiento al aire libre</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoAlmacenamientoMateriasPrimas === "Otro" && (
              <input
                type="text"
                value={tipoAlmacenamientoMateriasPrimasOtro}
                onChange={(e) => setTipoAlmacenamientoMateriasPrimasOtro(e.target.value)}
                placeholder="Especifique el tipo de almacenamiento..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Estado de almacenamiento
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={estadoAlmacenamientoMateriasPrimas}
              onChange={(e) => setEstadoAlmacenamientoMateriasPrimas(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Adecuado">Adecuado</option>
              <option value="Regular">Regular</option>
              <option value="Deficiente">Deficiente</option>
              <option value="Crítico">Crítico</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Tabla: Producto terminado y/o Mercancías */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Producto terminado y/o Mercancías
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '30%'
            }}
          >
            Tipo de mercancías
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoMercancias}
              onChange={(e) => setTipoMercancias(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="No combustibles">No combustibles</option>
              <option value="Combustibles">Combustibles</option>
              <option value="Inflamables">Inflamables</option>
              <option value="Explosivos">Explosivos</option>
              <option value="Tóxicos">Tóxicos</option>
              <option value="Corrosivos">Corrosivos</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoMercancias === "Otro" && (
              <input
                type="text"
                value={tipoMercanciasOtro}
                onChange={(e) => setTipoMercanciasOtro(e.target.value)}
                placeholder="Especifique el tipo de mercancías..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Nivel de riesgo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={nivelRiesgoMercancias}
              onChange={(e) => setNivelRiesgoMercancias(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Bajo">Bajo</option>
              <option value="Medio">Medio</option>
              <option value="Alto">Alto</option>
              <option value="Extremo">Extremo</option>
            </select>
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Descripción de los contenidos
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={descripcionContenidosMercancias}
              onChange={(e) => setDescripcionContenidosMercancias(e.target.value)}
              placeholder="Ej: Viseras de cerdo para elaboración de embutidos"
              className="w-full px-2 py-1 rounded"
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
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Contenedores
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={contenedoresMercancias}
              onChange={(e) => setContenedoresMercancias(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Empaque combustible">Empaque combustible</option>
              <option value="Empaque no combustible">Empaque no combustible</option>
              <option value="Contenedores metálicos">Contenedores metálicos</option>
              <option value="Contenedores plásticos">Contenedores plásticos</option>
              <option value="Sacos">Sacos</option>
              <option value="Bidones">Bidones</option>
              <option value="Otro">Otro</option>
            </select>
            {contenedoresMercancias === "Otro" && (
              <input
                type="text"
                value={contenedoresMercanciasOtro}
                onChange={(e) => setContenedoresMercanciasOtro(e.target.value)}
                placeholder="Especifique el tipo de contenedor..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tipo de almacenamiento
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoAlmacenamientoMercancias}
              onChange={(e) => setTipoAlmacenamientoMercancias(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Almacenamiento en silos, tanques o contenedores">Almacenamiento en silos, tanques o contenedores</option>
              <option value="Almacenamiento en estanterías">Almacenamiento en estanterías</option>
              <option value="Almacenamiento en pallets">Almacenamiento en pallets</option>
              <option value="Almacenamiento en bodega cerrada">Almacenamiento en bodega cerrada</option>
              <option value="Almacenamiento al aire libre">Almacenamiento al aire libre</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoAlmacenamientoMercancias === "Otro" && (
              <input
                type="text"
                value={tipoAlmacenamientoMercanciasOtro}
                onChange={(e) => setTipoAlmacenamientoMercanciasOtro(e.target.value)}
                placeholder="Especifique el tipo de almacenamiento..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Estado de almacenamiento
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={estadoAlmacenamientoMercancias}
              onChange={(e) => setEstadoAlmacenamientoMercancias(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Adecuado">Adecuado</option>
              <option value="Regular">Regular</option>
              <option value="Deficiente">Deficiente</option>
              <option value="Crítico">Crítico</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  </div>
  </div>
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

  <div
    className="mt-2 mb-4 p-4 rounded"
    style={{
      border: `1px solid ${borderColor}`,
      backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB'
    }}
  >
    <h3
      className="text-sm font-bold mb-3"
      style={{ color: textPrimary }}
    >
      COORDENADAS DE UBICACIÓN
    </h3>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <label
          className="font-semibold block mb-1"
          htmlFor="latitud-coordenada"
          style={{ color: textPrimary }}
        >
          LATITUD:
        </label>
        <input
          type="text"
          id="latitud-coordenada"
          value={coordenadasMapa.latitud}
          placeholder="Se llena desde el mapa"
          readOnly
          className="px-2 py-1 rounded w-full"
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
          className="font-semibold block mb-1"
          htmlFor="longitud-coordenada"
          style={{ color: textPrimary }}
        >
          LONGITUD:
        </label>
        <input
          type="text"
          id="longitud-coordenada"
          value={coordenadasMapa.longitud}
          placeholder="Se llena desde el mapa"
          readOnly
          className="px-2 py-1 rounded w-full"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
        />
      </div>
    </div>
  </div>

{/* Mapa Google Earth */}
<div className="mt-4">
  <Suspense fallback={<div style={{ color: textPrimary }}>Cargando mapa...</div>}>
    <MapaGoogleEarth 
      onMapReady={useCallback((map) => {
}, [])}
      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}
      coordenadasIniciales={formData?.coordenadasRiesgo || ''}
      direccionInicial={formData?.direccionRiesgo || formData?.direccion || ''}
      forzarCaptura={forzarCapturaMapa}
      onMapaChange={useCallback((datos) => {
        // Regla de negocio:
        // - Sin captura previa: el mapa puede actualizar coordenadas.
        // - Con captura previa: solo una NUEVA captura puede cambiar coordenadas.
        const imagenCaptura = datos.imagenMapa || datos.imagen || null;
        const esNuevaCaptura = Boolean(imagenCaptura);
        const yaHayCapturaGuardada = Boolean(imagenMapa);

        if (datos.coordenadas && (esNuevaCaptura || !yaHayCapturaGuardada)) {
          handleInputChange('coordenadasRiesgo', datos.coordenadas);
        }
        if (datos.direccion) {
          handleInputChange('direccion', datos.direccion);
          handleInputChange('direccionRiesgo', datos.direccion);
        }
        if (esNuevaCaptura) {
          // Guardar imagen del mapa para usar en el documento e historial
          setImagenMapa(imagenCaptura);
        }
      }, [imagenMapa, handleInputChange])}
    />
  </Suspense>

  {/* Vista previa de la captura guardada/cargada en historial */}
  {imagenMapa && (
    <div className="mt-3 p-2 rounded" style={{ border: `1px solid ${borderColor}` }}>
      <p className="text-xs mb-2" style={{ color: textSecondary }}>
        Captura del mapa guardada en historial
      </p>
      <img
        src={imagenMapa}
        alt="Mapa guardado"
        className="w-full max-h-64 object-contain rounded"
        style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}
      />
    </div>
  )}
</div>
</div>

{/* SECCIÓN SUSTRACCIÓN - PROTECCIONES FÍSICAS */}
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
  6. SUSTRACCIÓN - PROTECCIONES FÍSICAS
</h2>

{/* Tabla: Protecciones Físicas (campos bajo 6. SUSTRACCIÓN - PROTECCIONES FÍSICAS) */}
<div className="mb-6">
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '40%'
            }}
          >
            Ubicación del predio
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={ubicacionPredio}
              onChange={(e) => setUbicacionPredio(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Comercial cerrado">Comercial cerrado</option>
              <option value="Comercial abierto">Comercial abierto</option>
              <option value="Industrial">Industrial</option>
              <option value="Residencial">Residencial</option>
              <option value="Mixto">Mixto</option>
              <option value="Otro">Otro</option>
            </select>
            {ubicacionPredio === "Otro" && (
              <input
                type="text"
                value={ubicacionPredioOtro}
                onChange={(e) => setUbicacionPredioOtro(e.target.value)}
                placeholder="Especifique la ubicación del predio..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Vulnerabilidad de los contenidos
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={vulnerabilidadContenidos}
              onChange={(e) => setVulnerabilidadContenidos(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="De uso exclusivo - No comercializable">De uso exclusivo - No comercializable</option>
              <option value="Comercializable">Comercializable</option>
              <option value="Alto valor">Alto valor</option>
              <option value="Valor medio">Valor medio</option>
              <option value="Bajo valor">Bajo valor</option>
              <option value="Otro">Otro</option>
            </select>
            {vulnerabilidadContenidos === "Otro" && (
              <input
                type="text"
                value={vulnerabilidadContenidosOtro}
                onChange={(e) => setVulnerabilidadContenidosOtro(e.target.value)}
                placeholder="Especifique la vulnerabilidad de los contenidos..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Acceso a las instalaciones
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={accesoInstalaciones}
              onChange={(e) => setAccesoInstalaciones(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Con cerramiento perimetral y acceso controlado">Con cerramiento perimetral y acceso controlado</option>
              <option value="Con cerramiento perimetral sin acceso controlado">Con cerramiento perimetral sin acceso controlado</option>
              <option value="Sin cerramiento perimetral">Sin cerramiento perimetral</option>
              <option value="Acceso libre">Acceso libre</option>
              <option value="Otro">Otro</option>
            </select>
            {accesoInstalaciones === "Otro" && (
              <input
                type="text"
                value={accesoInstalacionesOtro}
                onChange={(e) => setAccesoInstalacionesOtro(e.target.value)}
                placeholder="Especifique el acceso a las instalaciones..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Circulación de personas externas
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={circulacionPersonasExternas}
              onChange={(e) => setCirculacionPersonasExternas(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="No se realiza atención al público - no hay afluencia de público">No se realiza atención al público - no hay afluencia de público</option>
              <option value="Se realiza atención al público controlada">Se realiza atención al público controlada</option>
              <option value="Alta afluencia de público">Alta afluencia de público</option>
              <option value="Afluencia moderada de público">Afluencia moderada de público</option>
              <option value="Otro">Otro</option>
            </select>
            {circulacionPersonasExternas === "Otro" && (
              <input
                type="text"
                value={circulacionPersonasExternasOtro}
                onChange={(e) => setCirculacionPersonasExternasOtro(e.target.value)}
                placeholder="Especifique la circulación de personas externas..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Protecciones pasivas
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={proteccionesPasivas}
              onChange={(e) => setProteccionesPasivas(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Todas las puertas, ventanas y/o patios poseen rejas o persianas metálicas">Todas las puertas, ventanas y/o patios poseen rejas o persianas metálicas</option>
              <option value="No todas las puertas, ventanas y/o patios poseen rejas o persianas metálicas">No todas las puertas, ventanas y/o patios poseen rejas o persianas metálicas</option>
              <option value="Sin protecciones pasivas">Sin protecciones pasivas</option>
              <option value="Protecciones parciales">Protecciones parciales</option>
              <option value="Otro">Otro</option>
            </select>
            {proteccionesPasivas === "Otro" && (
              <input
                type="text"
                value={proteccionesPasivasOtro}
                onChange={(e) => setProteccionesPasivasOtro(e.target.value)}
                placeholder="Especifique las protecciones pasivas..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Manejo de dinero */}
<div className="mb-6">
  <h3
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Manejo de dinero
  </h3>
  <div className="overflow-x-auto">
    <table
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '40%'
            }}
          >
            Personal de recaudo
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
            <input
              type="text"
              value={personalRecaudo}
              onChange={(e) => setPersonalRecaudo(e.target.value)}
              placeholder="Ej: número de personas, perfil, empresa de recaudo"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Horarios de recaudo
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
            <input
              type="text"
              value={horariosRecaudo}
              onChange={(e) => setHorariosRecaudo(e.target.value)}
              placeholder="Ej: días y franjas horarias"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Lugar de recaudo
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
            <input
              type="text"
              value={lugarRecaudo}
              onChange={(e) => setLugarRecaudo(e.target.value)}
              placeholder="Ej: caja principal, oficina, punto de venta"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Transporte de dinero
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
            <input
              type="text"
              value={transporteDinero}
              onChange={(e) => setTransporteDinero(e.target.value)}
              placeholder="Ej: empresa de valores, vehículo blindado, frecuencia"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
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

{/* Tabla: Sistema de Alarma */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Sistema de Alarma
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '40%'
            }}
          >
            Tiene alarma
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tieneAlarma}
              onChange={(e) => setTieneAlarma(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Monitoreada
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={alarmaMonitoreadaSustraccion}
              onChange={(e) => setAlarmaMonitoreadaSustraccion(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Empresa que monitorea
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={empresaMonitorea}
              onChange={(e) => setEmpresaMonitorea(e.target.value)}
              placeholder="Ej: Telesentinel"
              className="w-full px-2 py-1 rounded"
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
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tipo de comunicación
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoComunicacionAlarma}
              onChange={(e) => setTipoComunicacionAlarma(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Teléfono">Teléfono</option>
              <option value="Radio">Radio</option>
              <option value="Teléfono y radio">Teléfono y radio</option>
              <option value="Internet">Internet</option>
              <option value="Cable">Cable</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoComunicacionAlarma === "Otro" && (
              <input
                type="text"
                value={tipoComunicacionAlarmaOtro}
                onChange={(e) => setTipoComunicacionAlarmaOtro(e.target.value)}
                placeholder="Especifique el tipo de comunicación..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Cobertura
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={coberturaAlarma}
              onChange={(e) => setCoberturaAlarma(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="0% - 25%">0% - 25%</option>
              <option value="25% - 50%">25% - 50%</option>
              <option value="50% - 75%">50% - 75%</option>
              <option value="75% - 100%">75% - 100%</option>
              <option value="100%">100%</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Sensores que posee
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={sensoresAlarma}
              onChange={(e) => setSensoresAlarma(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Movimiento">Movimiento</option>
              <option value="Magnéticos">Magnéticos</option>
              <option value="Movimiento y magnéticos">Movimiento y magnéticos</option>
              <option value="Infrarrojos">Infrarrojos</option>
              <option value="Vibración">Vibración</option>
              <option value="Térmicos">Térmicos</option>
              <option value="Otro">Otro</option>
            </select>
            {sensoresAlarma === "Otro" && (
              <input
                type="text"
                value={sensoresAlarmaOtro}
                onChange={(e) => setSensoresAlarmaOtro(e.target.value)}
                placeholder="Especifique los sensores..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Tabla: Circuito Cerrado de Televisión - CCTV */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Circuito Cerrado de Televisión - CCTV
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '40%'
            }}
          >
            Cuenta con CCTV
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={cuentaConCCTV}
              onChange={(e) => setCuentaConCCTV(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Número de cámaras que posee
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={numeroCamaras}
              onChange={(e) => setNumeroCamaras(e.target.value)}
              placeholder="Ej: 21"
              className="w-full px-2 py-1 rounded"
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
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Controlado por
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={controladoPor}
              onChange={(e) => setControladoPor(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Personal administrativo u operativo de la empresa">Personal administrativo u operativo de la empresa</option>
              <option value="Empresa de seguridad contratada">Empresa de seguridad contratada</option>
              <option value="Central de monitoreo externa">Central de monitoreo externa</option>
              <option value="No monitoreado">No monitoreado</option>
              <option value="Otro">Otro</option>
            </select>
            {controladoPor === "Otro" && (
              <input
                type="text"
                value={controladoPorOtro}
                onChange={(e) => setControladoPorOtro(e.target.value)}
                placeholder="Especifique quién controla el CCTV..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tipo de monitoreo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tipoMonitoreoCCTV}
              onChange={(e) => setTipoMonitoreoCCTV(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Continuo">Continuo</option>
              <option value="Ocasional">Ocasional</option>
              <option value="Remoto">Remoto</option>
              <option value="Solo horario laboral">Solo horario laboral</option>
              <option value="24 horas">24 horas</option>
              <option value="Otro">Otro</option>
            </select>
            {tipoMonitoreoCCTV === "Otro" && (
              <input
                type="text"
                value={tipoMonitoreoCCTVOtro}
                onChange={(e) => setTipoMonitoreoCCTVOtro(e.target.value)}
                placeholder="Especifique el tipo de monitoreo..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Frecuencia de grabación
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={frecuenciaGrabacion}
              onChange={(e) => setFrecuenciaGrabacion(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="24 horas">24 horas</option>
              <option value="Solo horario laboral">Solo horario laboral</option>
              <option value="Solo horario nocturno">Solo horario nocturno</option>
              <option value="Por eventos">Por eventos</option>
              <option value="No graba">No graba</option>
              <option value="Otro">Otro</option>
            </select>
            {frecuenciaGrabacion === "Otro" && (
              <input
                type="text"
                value={frecuenciaGrabacionOtro}
                onChange={(e) => setFrecuenciaGrabacionOtro(e.target.value)}
                placeholder="Especifique la frecuencia de grabación..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tiempo de respaldo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={tiempoRespaldo}
              onChange={(e) => setTiempoRespaldo(e.target.value)}
              placeholder="Ej: No informaron"
              className="w-full px-2 py-1 rounded"
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
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Dispositivo de grabación
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={dispositivoGrabacion}
              onChange={(e) => setDispositivoGrabacion(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="DVR">DVR</option>
              <option value="NVR">NVR</option>
              <option value="Cloud">Cloud</option>
              <option value="Servidor local">Servidor local</option>
              <option value="Otro">Otro</option>
            </select>
            {dispositivoGrabacion === "Otro" && (
              <input
                type="text"
                value={dispositivoGrabacionOtro}
                onChange={(e) => setDispositivoGrabacionOtro(e.target.value)}
                placeholder="Especifique el dispositivo de grabación..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Ubicación del grabador
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={ubicacionGrabador}
              onChange={(e) => setUbicacionGrabador(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Oculto">Oculto</option>
              <option value="Visible">Visible</option>
              <option value="Sala de control">Sala de control</option>
              <option value="Oficina administrativa">Oficina administrativa</option>
              <option value="Otro">Otro</option>
            </select>
            {ubicacionGrabador === "Otro" && (
              <input
                type="text"
                value={ubicacionGrabadorOtro}
                onChange={(e) => setUbicacionGrabadorOtro(e.target.value)}
                placeholder="Especifique la ubicación del grabador..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Visualización por internet
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={visualizacionInternet}
              onChange={(e) => setVisualizacionInternet(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Tabla: Vigilancia */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Vigilancia
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '40%'
            }}
          >
            Cuenta con vigilancia
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={cuentaConVigilancia}
              onChange={(e) => setCuentaConVigilancia(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Contratada con
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={contratadaCon}
              onChange={(e) => setContratadaCon(e.target.value)}
              placeholder="Ej: No aplica"
              className="w-full px-2 py-1 rounded"
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
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Número de vigilantes
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={numeroVigilantes}
              onChange={(e) => setNumeroVigilantes(e.target.value)}
              placeholder="Ej: 0"
              className="w-full px-2 py-1 rounded"
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
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Jornada
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={jornadaVigilancia}
              onChange={(e) => setJornadaVigilancia(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="24 horas">24 horas</option>
              <option value="Diurna">Diurna</option>
              <option value="Nocturna">Nocturna</option>
              <option value="Solo horario laboral">Solo horario laboral</option>
              <option value="No aplica">No aplica</option>
              <option value="Otro">Otro</option>
            </select>
            {jornadaVigilancia === "Otro" && (
              <input
                type="text"
                value={jornadaVigilanciaOtro}
                onChange={(e) => setJornadaVigilanciaOtro(e.target.value)}
                placeholder="Especifique la jornada..."
                className="w-full px-2 py-1 rounded mt-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              />
            )}
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tienen armas
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tienenArmas}
              onChange={(e) => setTienenArmas(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tienen radio
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={tienenRadio}
              onChange={(e) => setTienenRadio(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</div>

{/* SECCIÓN CARACTERÍSTICAS OPERATIVAS AMBIENTALES */}
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
  7. CARACTERÍSTICAS OPERATIVAS AMBIENTALES
</h2>
<div className="overflow-x-auto">
  <table 
    className="w-full text-sm"
    style={{
      border: `1px solid ${borderColor}`,
      borderCollapse: 'collapse'
    }}
  >
    <tbody>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary,
            width: '70%'
          }}
        >
          Requiere licencia ambiental para su funcionamiento
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={licenciaAmbiental}
            onChange={(e) => {
              const value = e.target.value;
              startTransition(() => {
                setLicenciaAmbiental(value);
                updateCaracteristicasAmbientales('licenciaAmbiental', value);
              });
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Requiere permiso de vertimientos o emisiones contaminantes
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={permisoVertimientos}
            onChange={(e) => {
              const value = e.target.value;
              setPermisoVertimientos(value);
              updateCaracteristicasAmbientales('permisoVertimientos', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Consume más de 1.000 m3 de agua al mes
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={consumoAgua}
            onChange={(e) => {
              const value = e.target.value;
              setConsumoAgua(value);
              updateCaracteristicasAmbientales('consumoAgua', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Cuenta con bombillas ahorradoras de energía
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={bombillasAhorradoras}
            onChange={(e) => {
              const value = e.target.value;
              setBombillasAhorradoras(value);
              updateCaracteristicasAmbientales('bombillasAhorradoras', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Hace parte del mercado no regulado de energía
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={mercadoNoRegulado}
            onChange={(e) => {
              const value = e.target.value;
              setMercadoNoRegulado(value);
              updateCaracteristicasAmbientales('mercadoNoRegulado', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Genera vertimiento de aguas residuales contaminantes
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={vertimientoAguasResiduales}
            onChange={(e) => {
              const value = e.target.value;
              setVertimientoAguasResiduales(value);
              updateCaracteristicasAmbientales('vertimientoAguasResiduales', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Cuenta con planta de tratamiento de aguas residuales
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={plantaTratamiento}
            onChange={(e) => {
              const value = e.target.value;
              setPlantaTratamiento(value);
              updateCaracteristicasAmbientales('plantaTratamiento', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Cuenta con plan de manejo integral de residuos peligrosos
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={planManejoResiduos}
            onChange={(e) => {
              const value = e.target.value;
              setPlanManejoResiduos(value);
              updateCaracteristicasAmbientales('planManejoResiduos', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Se generan emisiones contaminantes
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={emisionesContaminantes}
            onChange={(e) => {
              const value = e.target.value;
              setEmisionesContaminantes(value);
              updateCaracteristicasAmbientales('emisionesContaminantes', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Cuenta con sistema de filtración o lavado de gases
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={sistemaFiltracionGases}
            onChange={(e) => {
              const value = e.target.value;
              setSistemaFiltracionGases(value);
              updateCaracteristicasAmbientales('sistemaFiltracionGases', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Generan niveles de ruido que afecten a los vecinos
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={nivelesRuido}
            onChange={(e) => {
              const value = e.target.value;
              setNivelesRuido(value);
              updateCaracteristicasAmbientales('nivelesRuido', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
      <tr>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px',
            fontWeight: 'bold',
            color: textPrimary
          }}
        >
          Cuenta con programa de gestión ambiental certificado
        </td>
        <td 
          style={{
            border: `1px solid ${borderColor}`,
            padding: '8px'
          }}
        >
          <select
            value={programaGestionAmbiental}
            onChange={(e) => {
              const value = e.target.value;
              setProgramaGestionAmbiental(value);
              updateCaracteristicasAmbientales('programaGestionAmbiental', value);
            }}
            className="w-full px-2 py-1 rounded"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          >
            <option value="">Seleccione...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
            <option value="No aplica">No aplica</option>
          </select>
        </td>
      </tr>
    </tbody>
  </table>
</div>
</div>

{/* SECCIÓN PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS */}
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
  8. PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS
</h2>

{/* Subsección: Sistema de detección */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Sistema de detección
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '50%'
            }}
          >
            Cuenta con detectores de humo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={detectoresHumo}
              onChange={(e) => setDetectoresHumo(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Cobertura
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={coberturaDeteccion}
              onChange={(e) => setCoberturaDeteccion(e.target.value)}
              placeholder="Ej: 100% del área"
              className="w-full px-2 py-1 rounded"
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
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Instalación
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={instalacionDeteccion}
              onChange={(e) => setInstalacionDeteccion(e.target.value)}
              placeholder="Ej: Adecuada"
              className="w-full px-2 py-1 rounded"
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
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Monitoreado
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={monitoreadoDeteccion}
              onChange={(e) => setMonitoreadoDeteccion(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Subsección: Extintores */}
<div className="mb-6">
  <h3 
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Extintores
  </h3>
  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '50%'
            }}
          >
            Cantidad
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={cantidadExtintores}
              onChange={(e) => setCantidadExtintores(e.target.value)}
              placeholder="Ej: 8"
              className="w-full px-2 py-1 rounded"
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
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Tipo
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={tipoExtintores}
              onChange={(e) => setTipoExtintores(e.target.value)}
              placeholder="Ej: ABC Multipropósito"
              className="w-full px-2 py-1 rounded"
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
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Suficientes
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={suficientesExtintores}
              onChange={(e) => setSuficientesExtintores(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Instalación
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={instalacionExtintores}
              onChange={(e) => setInstalacionExtintores(e.target.value)}
              placeholder="Ej: Adecuado"
              className="w-full px-2 py-1 rounded"
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
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Señalización
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={senalizacionExtintores}
              onChange={(e) => setSenalizacionExtintores(e.target.value)}
              placeholder="Ej: Adecuado"
              className="w-full px-2 py-1 rounded"
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
        <tr>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Carga vigente
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
              padding: '8px'
            }}
          >
            <select
              value={cargaVigenteExtintores}
              onChange={(e) => setCargaVigenteExtintores(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Subsección: Bombeo, estación de bomberos y cortafuegos */}
<div className="mb-6">
  <h3
    className="text-lg font-semibold mb-3"
    style={{ color: textPrimary }}
  >
    Bombeo, estación de bomberos y cortafuegos
  </h3>
  <div className="overflow-x-auto">
    <table
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: "collapse",
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
              width: "50%",
            }}
          >
            Bomba principal
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={bombaPrincipal}
              onChange={(e) => setBombaPrincipal(e.target.value)}
              placeholder="Ej: Marca, modelo, estado"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Bomba jockey
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={bombaJockey}
              onChange={(e) => setBombaJockey(e.target.value)}
              placeholder="Ej: Sí / No / Capacidad"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Presión
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={presionContraincendios}
              onChange={(e) => setPresionContraincendios(e.target.value)}
              placeholder="Ej: Presión de la red o de bombeo"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Estación de bomberos — nombre
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={estacionBomberosNombre}
              onChange={(e) => setEstacionBomberosNombre(e.target.value)}
              placeholder="Nombre de la estación"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Tiempo de respuesta (minutos)
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              inputMode="numeric"
              value={estacionBomberosTiempoMin}
              onChange={(e) => setEstacionBomberosTiempoMin(e.target.value)}
              placeholder="Ej: 15"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Distancia (metros)
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              inputMode="numeric"
              value={estacionBomberosDistanciaMetros}
              onChange={(e) => setEstacionBomberosDistanciaMetros(e.target.value)}
              placeholder="Ej: 800"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Muros cortafuegos
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <select
              value={murosCortafuegos}
              onChange={(e) => setMurosCortafuegos(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Puertas cortafuego
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <select
              value={puertasCortafuego}
              onChange={(e) => setPuertasCortafuego(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            colSpan={2}
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Almacenamiento de agua para RCI
          </td>
        </tr>
        <tr>
          <td colSpan={2} style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <textarea
              rows={3}
              value={almacenamientoAguaRci}
              onChange={(e) => setAlmacenamientoAguaRci(e.target.value)}
              placeholder="Describe tanques, cisternas, volumen, ubicación, etc."
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            colSpan={2}
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Pruebas
          </td>
        </tr>
        <tr>
          <td colSpan={2} style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <select
              value={pruebasProteccionIncendios}
              onChange={(e) => setPruebasProteccionIncendios(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            >
              <option value="">Seleccione periodicidad...</option>
              <option value="Semanal">Semanal</option>
              <option value="Quincenal">Quincenal</option>
              <option value="Mensual">Mensual</option>
              <option value="Bimestral">Bimestral</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* Comentarios sobre protección contra incendios */}
<div className="mt-6">
  <label 
    className="block text-sm font-semibold mb-2"
    style={{ color: textPrimary }}
  >
    Comentarios adicionales sobre protección contra incendios
  </label>
  <textarea
    rows={6}
    placeholder="Describe aquí información adicional sobre los sistemas de protección contra incendios, características del proceso que reducen el riesgo, protocolos de seguridad, etc..."
    value={comentariosProteccionIncendios}
    onChange={(e) => setComentariosProteccionIncendios(e.target.value)}
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
</div>

{/* SECCIÓN LUCRO CESANTE */}
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
    9. LUCRO CESANTE
  </h2>

  {/* Tabla: Lucro Cesante */}
  <div className="mb-6">
    <h3 
      className="text-lg font-semibold mb-3"
      style={{ color: textPrimary }}
    >
      Por incendio
    </h3>
    <div className="overflow-x-auto">
      <table 
        className="w-full text-sm"
        style={{
          border: `1px solid ${borderColor}`,
          borderCollapse: 'collapse'
        }}
      >
        <tbody>
          <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary,
                width: '40%'
              }}
            >
              Área requerida para el desarrollo de las actividades
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <select
                value={areaRequeridaLucroCesante}
                onChange={(e) => setAreaRequeridaLucroCesante(e.target.value)}
                className="w-full px-2 py-1 rounded"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                <option value="Menos de 500 m2">Menos de 500 m2</option>
                <option value="De 500 a 1000 m2">De 500 a 1000 m2</option>
                <option value="De 1000 a 2000 m2">De 1000 a 2000 m2</option>
                <option value="De 2000 a 5000 m2">De 2000 a 5000 m2</option>
                <option value="Más de 5000 m2">Más de 5000 m2</option>
                <option value="Otro">Otro</option>
              </select>
              {areaRequeridaLucroCesante === "Otro" && (
                <input
                  type="text"
                  value={areaRequeridaLucroCesanteOtro}
                  onChange={(e) => setAreaRequeridaLucroCesanteOtro(e.target.value)}
                  placeholder="Especifique el área requerida..."
                  className="w-full px-2 py-1 rounded mt-2"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                  disabled={cargando}
                />
              )}
            </td>
          </tr>
          <tr>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Complejidad de la actividad o proceso
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <select
                value={complejidadActividadLucroCesante}
                onChange={(e) => setComplejidadActividadLucroCesante(e.target.value)}
                className="w-full px-2 py-1 rounded"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                <option value="Complejidad baja (confecciones, reciclaje de plástico, estampación, entre otros)">Complejidad baja (confecciones, reciclaje de plástico, estampación, entre otros)</option>
                <option value="Complejidad media (ensamblaje, manufactura básica, entre otros)">Complejidad media (ensamblaje, manufactura básica, entre otros)</option>
                <option value="Complejidad alta (procesos químicos, farmacéuticos, tecnología avanzada, entre otros)">Complejidad alta (procesos químicos, farmacéuticos, tecnología avanzada, entre otros)</option>
                <option value="Otro">Otro</option>
              </select>
              {complejidadActividadLucroCesante === "Otro" && (
                <input
                  type="text"
                  value={complejidadActividadLucroCesanteOtro}
                  onChange={(e) => setComplejidadActividadLucroCesanteOtro(e.target.value)}
                  placeholder="Especifique la complejidad..."
                  className="w-full px-2 py-1 rounded mt-2"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                  disabled={cargando}
                />
              )}
            </td>
          </tr>
          <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Plan de continuidad del negocio documentado
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <select
                value={planContinuidadNegocio}
                onChange={(e) => setPlanContinuidadNegocio(e.target.value)}
                className="w-full px-2 py-1 rounded"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="No aplica">No aplica</option>
              </select>
            </td>
          </tr>
          <tr>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Valor nómina mensual
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={valorNominaMensual}
                onChange={(e) => setValorNominaMensual(e.target.value)}
                placeholder="Ej: $ 98.000.000"
                className="w-full px-2 py-1 rounded"
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
          <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Valor facturación del año anterior
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={valorFacturacionAnoAnterior}
                onChange={(e) => setValorFacturacionAnoAnterior(e.target.value)}
                placeholder="Ej: $ 11.760.000.000"
                className="w-full px-2 py-1 rounded"
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
          <tr>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Valor proyectado facturación para el presente año
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={valorProyectadoFacturacion}
                onChange={(e) => setValorProyectadoFacturacion(e.target.value)}
                placeholder="Ej: No informaron"
                className="w-full px-2 py-1 rounded"
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

  {/* Campo de texto libre */}
  <div className="mb-4">
    <label 
      className="block text-sm font-medium mb-2"
      style={{ color: textPrimary }}
    >
      Análisis y comentarios
    </label>
    <textarea
      value={comentariosLucroCesante}
      onChange={(e) => setComentariosLucroCesante(e.target.value)}
      rows={8}
      className="w-full px-3 py-2 rounded"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
      placeholder="Ingrese el análisis y comentarios sobre el lucro cesante..."
      disabled={cargando}
    />
  </div>
</div>

{/* SECCIÓN PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES */}
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
    10. PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES
  </h2>

  {/* Procesos Críticos */}
  <div className="mb-6">
    <label 
      className="block text-sm font-medium mb-2"
      style={{ color: textPrimary }}
    >
      Procesos Críticos
    </label>
    <textarea
      value={procesosCriticos}
      onChange={(e) => setProcesosCriticos(e.target.value)}
      rows={3}
      className="w-full px-3 py-2 rounded"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
      placeholder="Ej: No hay criticidad."
      disabled={cargando}
    />
  </div>

  {/* Riesgos Medioambientales */}
  <div className="mb-4">
    <label 
      className="block text-sm font-medium mb-2"
      style={{ color: textPrimary }}
    >
      Riesgos Medioambientales
    </label>
    <textarea
      value={riesgosMedioambientales}
      onChange={(e) => setRiesgosMedioambientales(e.target.value)}
      rows={3}
      className="w-full px-3 py-2 rounded"
      style={{
        backgroundColor: inputBg,
        color: textPrimary,
        borderColor: borderColor,
        border: `1px solid ${borderColor}`
      }}
      placeholder="Ej: Moderados (vientos, terremoto y deslizamientos)."
      disabled={cargando}
    />
  </div>
</div>

{/* SECCIÓN POR ROTURA DE MAQUINARIA */}
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
    11. POR ROTURA DE MAQUINARIA
  </h2>

  {/* Tabla: Por rotura de maquinaria */}
  <div className="mb-6">
    <div className="overflow-x-auto">
      <table 
        className="w-full text-sm"
        style={{
          border: `1px solid ${borderColor}`,
          borderCollapse: 'collapse'
        }}
      >
        <tbody>
          <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary,
                width: '40%'
              }}
            >
              Capacidad instalada de la planta de producción
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={capacidadInstaladaPlanta}
                onChange={(e) => setCapacidadInstaladaPlanta(e.target.value)}
                placeholder="Ej: 305 toneladas"
                className="w-full px-2 py-1 rounded"
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
          <tr>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Índice promedio de capacidad utilizada
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={indicePromedioCapacidad}
                onChange={(e) => setIndicePromedioCapacidad(e.target.value)}
                placeholder="Ej: 60%"
                className="w-full px-2 py-1 rounded"
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
          <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Número de líneas de producción
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={numeroLineasProduccion}
                onChange={(e) => setNumeroLineasProduccion(e.target.value)}
                placeholder="Ej: Una"
                className="w-full px-2 py-1 rounded"
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
          <tr>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Maquinaria crítica
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={maquinariaCritica}
                onChange={(e) => setMaquinariaCritica(e.target.value)}
                placeholder="Ej: Ninguna"
                className="w-full px-2 py-1 rounded"
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
          <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Incidencia sobre la producción (%)
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={incidenciaProduccion}
                onChange={(e) => setIncidenciaProduccion(e.target.value)}
                placeholder="Ej: 0"
                className="w-full px-2 py-1 rounded"
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
          <tr>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Origen de la maquinaria crítica
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <input
                type="text"
                value={origenMaquinariaCritica}
                onChange={(e) => setOrigenMaquinariaCritica(e.target.value)}
                placeholder="Ej: No aplica"
                className="w-full px-2 py-1 rounded"
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
          <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Hay representación nacional de la maquinaria
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <select
                value={representacionNacionalMaquinaria}
                onChange={(e) => setRepresentacionNacionalMaquinaria(e.target.value)}
                className="w-full px-2 py-1 rounded"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="No aplica">No aplica</option>
              </select>
            </td>
          </tr>
          <tr>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Hay maquinaria en Stand-by
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <select
                value={maquinariaStandBy}
                onChange={(e) => setMaquinariaStandBy(e.target.value)}
                className="w-full px-2 py-1 rounded"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="No aplica">No aplica</option>
              </select>
            </td>
          </tr>
          <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Existen empresas satélite para la producción
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <select
                value={empresasSateliteProduccion}
                onChange={(e) => setEmpresasSateliteProduccion(e.target.value)}
                className="w-full px-2 py-1 rounded"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="No aplica">No aplica</option>
              </select>
            </td>
          </tr>
          <tr>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px',
                fontWeight: 'bold',
                color: textPrimary
              }}
            >
              Hay convenios con otras empresas
            </td>
            <td 
              style={{
                border: `1px solid ${borderColor}`,
                padding: '8px'
              }}
            >
              <select
                value={conveniosOtrasEmpresas}
                onChange={(e) => setConveniosOtrasEmpresas(e.target.value)}
                className="w-full px-2 py-1 rounded"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="No aplica">No aplica</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
  12. MAQUINARIA, EQUIPOS Y MANTENIMIENTO
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
<div className="overflow-x-auto mt-6">
  <table
    className="w-full text-sm"
    style={{
      border: `1px solid ${borderColor}`,
      borderCollapse: "collapse",
    }}
  >
    <tbody>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px', fontWeight: 'bold', color: textPrimary, width: '40%' }}>
          Promedio de edad de los equipos
        </td>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
          <input
            type="text"
            value={promedioEdadEquipos}
            onChange={(e) => setPromedioEdadEquipos(e.target.value)}
            placeholder="Ej: 8 años"
            className="w-full rounded px-3 py-2"
            style={{ backgroundColor: inputBg, color: textPrimary, borderColor: borderColor, border: `1px solid ${borderColor}` }}
            disabled={cargando}
          />
        </td>
      </tr>
      <tr>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px', fontWeight: 'bold', color: textPrimary }}>
          Tipo de mantenimiento
        </td>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
          <input
            type="text"
            value={tipoMantenimientoEquipos}
            onChange={(e) => setTipoMantenimientoEquipos(e.target.value)}
            placeholder="Ej: Preventivo y correctivo"
            className="w-full rounded px-3 py-2"
            style={{ backgroundColor: inputBg, color: textPrimary, borderColor: borderColor, border: `1px solid ${borderColor}` }}
            disabled={cargando}
          />
        </td>
      </tr>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px', fontWeight: 'bold', color: textPrimary }}>
          Bitácoras de mantenimiento
        </td>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
          <input
            type="text"
            value={bitacorasMantenimiento}
            onChange={(e) => setBitacorasMantenimiento(e.target.value)}
            placeholder="Ej: Sí, registro físico y digital"
            className="w-full rounded px-3 py-2"
            style={{ backgroundColor: inputBg, color: textPrimary, borderColor: borderColor, border: `1px solid ${borderColor}` }}
            disabled={cargando}
          />
        </td>
      </tr>
      <tr>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px', fontWeight: 'bold', color: textPrimary }}>
          Personal que realiza mantenimiento
        </td>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
          <input
            type="text"
            value={personalMantenimiento}
            onChange={(e) => setPersonalMantenimiento(e.target.value)}
            placeholder="Ej: Técnico interno + proveedor externo"
            className="w-full rounded px-3 py-2"
            style={{ backgroundColor: inputBg, color: textPrimary, borderColor: borderColor, border: `1px solid ${borderColor}` }}
            disabled={cargando}
          />
        </td>
      </tr>
      <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px', fontWeight: 'bold', color: textPrimary }}>
          Periodicidad de los mantenimientos
        </td>
        <td style={{ border: `1px solid ${borderColor}`, padding: '8px' }}>
          <input
            type="text"
            value={periodicidadMantenimientos}
            onChange={(e) => setPeriodicidadMantenimientos(e.target.value)}
            placeholder="Ej: Mensual / trimestral / anual"
            className="w-full rounded px-3 py-2"
            style={{ backgroundColor: inputBg, color: textPrimary, borderColor: borderColor, border: `1px solid ${borderColor}` }}
            disabled={cargando}
          />
        </td>
      </tr>
    </tbody>
  </table>
</div>
</div>

<FormularioAreas areasIniciales={datosEquipos} onChange={useCallback((areas) => {
  setDatosEquipos(areas);
}, [])} />




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
    13. SERVICIOS INDUSTRIALES
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
    14. SINIESTRALIDAD
  </h2>

  <div className="overflow-x-auto">
    <table
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: "collapse",
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
              width: "40%",
            }}
          >
            Año
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={siniestralidadAno}
              onChange={(e) => setSiniestralidadAno(e.target.value)}
              className="w-full rounded px-3 py-2"
              placeholder="Ej: 2024"
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
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Valor del siniestro
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={siniestralidadValor}
              onChange={(e) => setSiniestralidadValor(e.target.value)}
              className="w-full rounded px-3 py-2"
              placeholder="Ej: $150.000.000"
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
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Descripción
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <textarea
              rows={4}
              value={siniestralidadDescripcion}
              onChange={(e) => {
                const value = e.target.value;
                setSiniestralidadDescripcion(value);
                setSiniestralidad(value); // compatibilidad con historial existente
              }}
              className="w-full rounded px-3 py-2"
              placeholder="Detalle del siniestro, causas y afectación."
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
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Mejoras después del siniestro
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <textarea
              rows={4}
              value={siniestralidadMejoras}
              onChange={(e) => setSiniestralidadMejoras(e.target.value)}
              className="w-full rounded px-3 py-2"
              placeholder="Medidas implementadas para evitar recurrencia."
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

{/* 15. ALMACENAMIENTO */}
<div
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`,
  }}
>
  <h2 className="text-xl font-bold mb-4" style={{ color: textPrimary }}>
    15. ALMACENAMIENTO
  </h2>

  <h3 className="text-lg font-semibold mb-3" style={{ color: textPrimary }}>
    Almacén
  </h3>
  <div className="overflow-x-auto mb-6">
    <table
      className="w-full text-sm"
      style={{ border: `1px solid ${borderColor}`, borderCollapse: "collapse" }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
              width: "50%",
            }}
          >
            Altura máxima del almacén
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={almacenAlturaMaxima}
              onChange={(e) => setAlmacenAlturaMaxima(e.target.value)}
              placeholder="Ej: metros"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Matriz de compatibilidad
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <select
              value={almacenMatrizCompatibilidad}
              onChange={(e) => setAlmacenMatrizCompatibilidad(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            >
              <option value="">Seleccione...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
              <option value="No aplica">No aplica</option>
            </select>
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Altura máxima de la estantería
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={almacenAlturaMaximaEstanteria}
              onChange={(e) => setAlmacenAlturaMaximaEstanteria(e.target.value)}
              placeholder="Ej: metros"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3 className="text-lg font-semibold mb-3" style={{ color: textPrimary }}>
    Mercancías peligrosas
  </h3>
  <div className="overflow-x-auto">
    <table
      className="w-full text-sm"
      style={{ border: `1px solid ${borderColor}`, borderCollapse: "collapse" }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
              width: "50%",
            }}
          >
            Tipo de mercancía
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={mercPeligrosaTipo}
              onChange={(e) => setMercPeligrosaTipo(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Tipo de almacenamiento
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <input
              type="text"
              value={mercPeligrosaTipoAlmacenamiento}
              onChange={(e) => setMercPeligrosaTipoAlmacenamiento(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr style={{ backgroundColor: theme === "dark" ? "#1F1F1F" : "#E5E7EB" }}>
          <td
            style={{
              border: `1px solid ${borderColor}`,
              padding: "8px",
              fontWeight: "bold",
              color: textPrimary,
            }}
          >
            Protecciones existentes
          </td>
          <td style={{ border: `1px solid ${borderColor}`, padding: "8px" }}>
            <textarea
              rows={3}
              value={mercPeligrosaProtecciones}
              onChange={(e) => setMercPeligrosaProtecciones(e.target.value)}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

{/* SECCIÓN DE ANÁLISIS DE RIESGOS - MOVIDA AQUÍ PARA UBICACIÓN IDEAL ANTES DE RECOMENDACIONES */}
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
    16. ANÁLISIS Y CLASIFICACIÓN DE RIESGOS
  </h2>

    {/* Tabla de Análisis de Riesgos */}
<div 
  className="p-4 rounded mb-6"
  style={{
    backgroundColor: cardBg,
    border: `2px solid ${borderColor}`
  }}
>
  <div className="flex justify-between items-center mb-4">
    <h2 
      className="text-lg font-bold"
      style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
    >
      📋 ANÁLISIS DE RIESGOS
</h2>
    <button
      onClick={handleAgregarRiesgo}
      className="px-3 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
      style={{
        backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
        color: '#FFFFFF'
      }}
      disabled={cargando}
    >
      <FaPlus />
      Agregar Riesgo
    </button>
  </div>

  <div className="overflow-x-auto">
<table 
  className="w-full text-sm"
  style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
  }}
>
      <thead>
        <tr 
  style={{
            backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB'
  }}
>
    <th 
            className="px-3 py-2 text-left font-bold"
      style={{
        border: `1px solid ${borderColor}`,
              color: textPrimary,
              width: '30%'
      }}
    >
      RIESGO
    </th>
    <th 
            className="px-3 py-2 text-left font-bold"
      style={{
        border: `1px solid ${borderColor}`,
        color: textPrimary
      }}
    >
      ANÁLISIS
    </th>
          <th 
            className="px-3 py-2 text-center font-bold"
            style={{
              border: `1px solid ${borderColor}`,
              color: textPrimary,
              width: '60px'
            }}
          >
            
    </th>
  </tr>
</thead>
<tbody>
        {analisisRiesgos.map((fila, index) => (
          <tr 
            key={fila.id}
      style={{
        backgroundColor: index % 2 === 0 
          ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                : (theme === 'dark' ? '#0F0F0F' : '#F9FAFB')
            }}
          >
            <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
              <input
                type="text"
                value={fila.riesgo}
                onChange={(e) => handleActualizarAnalisis(fila.id, 'riesgo', e.target.value)}
                className="w-full px-2 py-1 text-sm"
        style={{
                  backgroundColor: 'transparent',
                  color: textPrimary,
                  border: 'none',
                  outline: 'none'
                }}
                placeholder="Ej: Incendio/Explosión"
                disabled={cargando}
              />
      </td>
            <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
      <textarea
                value={fila.analisis}
                onChange={(e) => handleActualizarAnalisis(fila.id, 'analisis', e.target.value)}
                className="w-full px-2 py-1 text-sm"
                rows="2"
  style={{
                  backgroundColor: 'transparent',
    color: textPrimary,
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical'
                }}
                placeholder="Escribe el análisis del riesgo..."
  disabled={cargando}
/>
            </td>
            <td 
              style={{ 
                border: `1px solid ${borderColor}`, 
                padding: '4px',
                textAlign: 'center'
              }}
            >
              <button
                onClick={() => handleEliminarRiesgo(fila.id)}
                className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                style={{ color: '#EF4444' }}
                disabled={cargando}
              >
                <FaTrash size={14} />
              </button>
      </td>
    </tr>
  ))}
</tbody>
</table>
  </div>

  {analisisRiesgos.length === 0 && (
    <div 
      className="p-6 text-center rounded mt-2"
      style={{
        backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
        border: `2px dashed ${borderColor}`,
        color: textSecondary
      }}
    >
      <p className="text-sm">Haz clic en "Agregar Riesgo" para comenzar el análisis</p>
    </div>
  )}
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

<div className="mt-8">
  <div className="flex justify-between items-center mb-4">
<h2 
      className="text-lg font-bold"
      style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
>
      🔥 CLASIFICACIÓN DEL RIESGO
</h2>
    <p 
      className="text-xs"
      style={{ color: textSecondary }}
    >
      Los riesgos se sincronizan automáticamente desde la sección de Análisis
    </p>
  </div>

  <div className="overflow-x-auto">
<table 
      className="w-full text-sm"
      style={{
        border: `1px solid ${borderColor}`,
        borderCollapse: 'collapse'
      }}
    >
      <thead>
        <tr 
      style={{
            backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB'
      }}
    >
    <th 
            className="px-3 py-2 text-left font-bold"
      style={{
        border: `1px solid ${borderColor}`,
              color: textPrimary,
              minWidth: '180px'
      }}
    >
            RIESGO (Sincronizado)
    </th>
    <th 
            className="px-3 py-2 text-center font-bold"
      style={{
        border: `1px solid ${borderColor}`,
            color: textPrimary,
              width: '100px'
            }}
          >
            PROBABILIDAD
        </th>
        <th 
            className="px-3 py-2 text-center font-bold"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
              width: '100px'
          }}
        >
            SEVERIDAD
        </th>
        <th 
            className="px-3 py-2 text-center font-bold"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
              width: '80px'
          }}
        >
            R
        </th>
        <th 
            className="px-3 py-2 text-center font-bold"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
              width: '80px'
          }}
        >
            ÍNDICE
        </th>
        <th 
            className="px-3 py-2 text-center font-bold"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
              width: '120px'
          }}
        >
            CLASIFICACIÓN
        </th>
        <th 
            className="px-3 py-2 text-center font-bold"
          style={{
            border: `1px solid ${borderColor}`,
            color: textPrimary,
              width: '60px'
          }}
        >
            
        </th>
      </tr>
    </thead>
    <tbody>
        {tablaRiesgos.map((fila, index) => (
        <tr 
            key={fila.id}
          style={{
              backgroundColor: index % 2 === 0 
              ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                : (theme === 'dark' ? '#0F0F0F' : '#F9FAFB')
          }}
        >
          <td 
            style={{
              border: `1px solid ${borderColor}`,
                padding: '8px',
                backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F3F4F6'
              }}
            >
              <span 
                className="text-sm italic"
                style={{ color: textSecondary }}
              >
                {fila.riesgo || 'Escribe el riesgo en Análisis de Riesgos'}
              </span>
          </td>
            <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
              <input
                type="number"
                min="0"
                max="5"
                value={fila.probabilidad}
                onChange={(e) => actualizarRiesgo(fila.id, 'probabilidad', e.target.value)}
                className="w-full px-2 py-1 text-sm text-center"
            style={{
                  backgroundColor: 'transparent',
                  color: textPrimary,
                  border: 'none',
                  outline: 'none'
                }}
                placeholder="1-5"
                disabled={cargando}
              />
            </td>
            <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
            <input 
              type="number" 
                min="0"
                max="5"
                value={fila.severidad}
                onChange={(e) => actualizarRiesgo(fila.id, 'severidad', e.target.value)}
                className="w-full px-2 py-1 text-sm text-center"
              style={{
                  backgroundColor: 'transparent',
                color: textPrimary,
                  border: 'none',
                  outline: 'none'
                }}
                placeholder="1-5"
                disabled={cargando}
            />
          </td>
          <td 
              className="text-center font-bold"
            style={{
              border: `1px solid ${borderColor}`,
                padding: '8px',
                color: textPrimary
              }}
            >
              {fila.r || 0}
          </td>
          <td 
              className="text-center font-bold"
            style={{
              border: `1px solid ${borderColor}`,
                padding: '8px',
                color: textPrimary
            }}
          >
              {fila.indice || 0}%
          </td>
          <td 
              className="text-center font-bold"
            style={{
              border: `1px solid ${borderColor}`,
                padding: '8px',
                color: fila.clasificacion === 'Extremo' ? '#DC2626' :
                       fila.clasificacion === 'Alto' ? '#F59E0B' :
                       fila.clasificacion === 'Medio' ? '#FBBF24' :
                       '#10B981'
              }}
            >
              {fila.clasificacion || 'Bajo'}
          </td>
          <td 
            style={{
              border: `1px solid ${borderColor}`,
                padding: '4px',
                textAlign: 'center'
              }}
            >
              <button
                onClick={() => handleEliminarRiesgo(fila.id)}
                className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                style={{ color: '#EF4444' }}
                title="Eliminar de ambas tablas"
                disabled={cargando}
              >
                <FaTrash size={14} />
              </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  </div>

  {tablaRiesgos.length === 0 && (
    <div 
      className="p-6 text-center rounded mt-2"
      style={{
        backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
        border: `2px dashed ${borderColor}`,
        color: textSecondary
      }}
    >
      <p className="text-sm">Haz clic en "Agregar Riesgo" para comenzar la clasificación</p>
    </div>
  )}

  {/* Leyenda de valores y clasificación */}
  <div 
    className="mt-4 p-4 rounded text-xs"
    style={{
      backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
      border: `1px solid ${borderColor}`
    }}
  >
    <p className="font-bold mb-3 text-sm" style={{ color: textPrimary }}>
      📊 Fórmula: R = Probabilidad × Severidad
    </p>
    
    {/* Explicación de Probabilidad */}
    <div className="mb-3">
      <p className="font-bold mb-1" style={{ color: textPrimary }}>
        PROBABILIDAD (Frecuencia de ocurrencia):
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 ml-2">
        <span style={{ color: textSecondary }}>1 = Muy improbable (casi nunca)</span>
        <span style={{ color: textSecondary }}>2 = Improbable (rara vez)</span>
        <span style={{ color: textSecondary }}>3 = Posible (ocasionalmente)</span>
        <span style={{ color: textSecondary }}>4 = Probable (frecuentemente)</span>
        <span style={{ color: textSecondary }}>5 = Muy probable (casi siempre)</span>
      </div>
    </div>

    {/* Explicación de Severidad */}
    <div className="mb-3">
      <p className="font-bold mb-1" style={{ color: textPrimary }}>
        SEVERIDAD (Impacto del daño):
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 ml-2">
        <span style={{ color: textSecondary }}>1 = Insignificante (sin impacto)</span>
        <span style={{ color: textSecondary }}>2 = Menor (impacto leve)</span>
        <span style={{ color: textSecondary }}>3 = Moderada (impacto medio)</span>
        <span style={{ color: textSecondary }}>4 = Mayor (impacto grave)</span>
        <span style={{ color: textSecondary }}>5 = Catastrófica (impacto crítico)</span>
      </div>
    </div>

    {/* Clasificación del Riesgo */}
    <div>
      <p className="font-bold mb-1" style={{ color: textPrimary }}>
        CLASIFICACIÓN DEL RIESGO:
      </p>
      <div className="flex flex-wrap gap-4 ml-2">
        <span style={{ color: '#10B981' }}>● Bajo (R ≤ 4)</span>
        <span style={{ color: '#FBBF24' }}>● Medio (5 ≤ R ≤ 8)</span>
        <span style={{ color: '#F59E0B' }}>● Alto (9 ≤ R ≤ 12)</span>
        <span style={{ color: '#DC2626' }}>● Extremo (R {'>'} 12)</span>
      </div>
    </div>
  </div>

  {/* MAPA DE CALOR */}
  <div className="mt-8">
    <h2 
      className="text-lg font-bold mb-4"
      style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
    >
      🗺️ MAPA DE CALOR
  </h2>
  <Suspense fallback={<div style={{ color: textPrimary }}>Cargando mapa...</div>}>
    <MapaDeCalor tablaRiesgos={tablaRiesgos} />
  </Suspense>
  </div>
</div>

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
    17. RECOMENDACIONES
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
          value={valorSelectBancoRecomendacion}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== SIN_SELECCION_BANCO_RECOMENDACION) {
              handleAgregarRecomendacion(v);
              setValorSelectBancoRecomendacion(SIN_SELECCION_BANCO_RECOMENDACION);
            }
          }}
          className="w-full rounded px-3 py-2"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
        disabled={cargando}
      >
        <option value={SIN_SELECCION_BANCO_RECOMENDACION}>
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

  {/* Lista de recomendaciones del informe (cada ítem con código MM/AAAA--Rn y fecha editable) */}
  <div className="mb-4">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <label
        className="block text-sm font-semibold"
        style={{ color: textPrimary }}
      >
        Recomendaciones del informe
      </label>
      <button
        type="button"
        onClick={handleAgregarRecomendacionVacia}
        className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition"
        style={{
          backgroundColor: theme === "dark" ? "#2563EB" : "#2563EB",
          color: "#FFFFFF",
        }}
        disabled={cargando}
      >
        <FaPlus className="text-xs" aria-hidden />
        Agregar recomendación
      </button>
    </div>
    {recomendacionesItems.length === 0 ? (
      <p className="text-sm" style={{ color: textSecondary }}>
        Usa el banco arriba o &quot;Agregar recomendación&quot; para incluir una o varias recomendaciones. Cada una tendrá un código (por ejemplo 04/2026--R1) y una fecha de seguimiento que puedes cambiar.
      </p>
    ) : (
      <ul className="space-y-4 list-none p-0 m-0">
        {recomendacionesItems.map((item) => (
          <li
            key={item.id}
            className="p-4 rounded-lg"
            style={{
              backgroundColor: theme === "dark" ? "#1F1F1F" : "#F9FAFB",
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <span
                className="text-sm font-bold tracking-tight"
                style={{ color: textPrimary }}
              >
                {item.codigo}
              </span>
              <button
                type="button"
                onClick={() => handleEliminarRecomendacionItem(item.id)}
                className="p-2 rounded transition hover:opacity-90"
                style={{
                  color: theme === "dark" ? "#F87171" : "#B91C1C",
                  border: `1px solid ${borderColor}`,
                }}
                disabled={cargando}
                title="Quitar esta recomendación"
              >
                <FaTrash className="text-sm" aria-hidden />
              </button>
            </div>
            <textarea
              rows={5}
              value={item.texto}
              onChange={(e) =>
                handleActualizarRecomendacionItem(item.id, {
                  texto: e.target.value,
                })
              }
              placeholder="Texto de la recomendación..."
              className="w-full rounded px-3 py-2 focus:outline-none text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
            <label
              className="block text-xs font-semibold mt-3 mb-1"
              style={{ color: textPrimary }}
            >
              Fecha de seguimiento o control
            </label>
            <input
              type="date"
              value={item.fechaSeguimiento || ""}
              onChange={(e) =>
                handleActualizarRecomendacionItem(item.id, {
                  fechaSeguimiento: e.target.value,
                })
              }
              className="rounded px-3 py-2 text-sm max-w-full"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </li>
        ))}
      </ul>
    )}
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
    <Suspense fallback={<div style={{ color: textPrimary }}>Cargando asistente...</div>}>
      <ChatbotIA 
        formData={useMemo(() => ({
        ...formData,
        recomendaciones: recomendaciones,
        recomendacionesItems: recomendacionesItems,
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
          bomberos,
          bombaPrincipal,
          bombaJockey,
          presionContraincendios,
          estacionBomberosNombre,
          estacionBomberosTiempoMin,
          estacionBomberosDistanciaMetros,
          murosCortafuegos,
          puertasCortafuego,
          almacenamientoAguaRci,
          pruebasProteccionIncendios,
        },
        seguridad: {
          alarmaMonitoreada,
          cctv,
          tipoVigilancia,
          horariosVigilancia,
          accesos,
          cerramientoPredio
        }
      }), [formData, recomendaciones, recomendacionesItems, bancoRecomendaciones, categoriaSeleccionada, nombreCliente, analisisRiesgos, tablaRiesgos, energiaProveedor, energiaTension, transformadores, plantasElectricas, extintor, rci, rociadores, deteccion, alarmas, brigadas, bomberos, bombaPrincipal, bombaJockey, presionContraincendios, estacionBomberosNombre, estacionBomberosTiempoMin, estacionBomberosDistanciaMetros, murosCortafuegos, puertasCortafuego, almacenamientoAguaRci, pruebasProteccionIncendios, alarmaMonitoreada, cctv, tipoVigilancia, horariosVigilancia, accesos, cerramientoPredio])}
      onInputChange={useCallback((field, value) => {
        if (field === "recomendaciones") {
          setRecomendacionesItems(migrarTextoPlanoAItems(value));
        } else if (field === "recomendacionesItems" && Array.isArray(value)) {
          setRecomendacionesItems(
            normalizarRecomendacionesItemsDesdeDatos({
              recomendacionesItems: value,
            })
          );
        } else {
}
      }, [])}
      />
    </Suspense>
  </div>

    <Suspense fallback={<div style={{ color: textPrimary }}>Cargando registro fotográfico...</div>}>
      <RegistroFotografico 
        onChange={useCallback((imagenes) => {
          setImagenesRegistro(imagenes);
        }, [])} 
        imagenesIniciales={imagenesRegistro}
        tituloSeccion="18. REGISTRO FOTOGRÁFICO"
      />
    </Suspense>

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
      
      {/* Botón para generar manual - Separado y destacado */}
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
  </div>
);
}


