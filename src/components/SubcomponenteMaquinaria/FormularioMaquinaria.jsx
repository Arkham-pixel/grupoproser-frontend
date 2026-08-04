import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, HeadingLevel, ImageRun, Header, WidthType, Media, VerticalAlign, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import EncabezadoMaquinaria from "./EncabezadoMaquinaria";
import CartaPresentacionMaquinaria from "./CartaPresentacionMaquinaria";
import TablaInspeccionMaquinaria from "./TablaInspeccionMaquinaria";
import DescripcionBienAsegurado from "./DescripcionBienAsegurado";
import EstadoGeneralMaquinaria from "./EstadoGeneralMaquinaria";
import TipoProteccionMaquinaria from "./TipoProteccionMaquinaria";
import RecomendacionesObservacionesMaquinaria from "./RecomendacionesObservacionesMaquinaria";
import RegistroFotograficoMaquinaria from "./RegistroFotograficoMaquinaria";
import FotoPrincipalMaquinaria from "./FotoPrincipalMaquinaria";
import FirmaMaquinaria from "./FirmaMaquinaria";
import Logo from '../../img/Logo.png';
import { fetchImageAsArrayBuffer } from '../../utils/imageUtils';
import { normalizarImagenCargada } from './maquinariaImagenUtils.js'; // Ajusta la ruta según tu estructura
import BotonesHistorial from '../BotonesHistorial.jsx';
import { BASE_URL } from '../../config/apiConfig.js';
import { useHistorialFormulario } from '../../hooks/useHistorialFormulario.js';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';
import { useServerAutoSaveUpdate } from '../../hooks/useFormAutoSave';
import { aseguradorasConFuncionarios } from '../../data/aseguradorasFuncionarios.js';
import colombia from '../../data/colombia.json';
import { useMaquinariaTheme, SectionCard, ThemedInput, LlenadoGuia } from './maquinariaUi.jsx';
import {
  construirSnapshotMaquinaria,
  snapshotALocalStorage,
  aplicarDatosMaquinaria,
  aplicarBorradorLocal,
  buscarDepartamentoPorCiudad,
  borradorTieneContenido,
  limpiarBorradorMaquinaria,
  BORRADOR_MAQUINARIA_KEY,
  BORRADOR_MAQUINARIA_LEGACY_KEY,
} from './maquinariaFormSnapshot.js';

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
  if (!html?.trim()) return [];
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

    if (!node.textContent?.trim()) return [];

    return new Paragraph({
      children: [new TextRun({ text: node.textContent, font: "Arial", size: 24 })],
    });
  });

  return docxParagraphs;
};

export const textoPlanoAHtml = (text) => {
  if (!text?.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
};

export default function FormularioMaquinaria() {
  const { t } = useTranslation();
  const mq = useMaquinariaTheme();
  // Estados principales
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [nombreAsegurado, setNombreAsegurado] = useState("");
  const [nombreMaquinaria, setNombreMaquinaria] = useState("");
  const [ciudadFecha, setCiudadFecha] = useState("");
  const [referencia, setReferencia] = useState("");
  const [saludo, setSaludo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [aseguradora, setAseguradora] = useState("");
  const [marca, setMarca] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [electrico, setElectrico] = useState("");
  const [tipoProteccion, setTipoProteccion] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [inspectorSeleccionado, setInspectorSeleccionado] = useState("");
  const [codiInspector, setCodiInspector] = useState("");
  const [cargoSeleccionado, setCargoSeleccionado] = useState("");
  const [opcionesInspectores, setOpcionesInspectores] = useState([]);
  const [imagenesRegistro, setImagenesRegistro] = useState([]);
  const [fotoPrincipalImagen, setFotoPrincipalImagen] = useState(null);
  const [descripcionFotoPrincipal, setDescripcionFotoPrincipal] = useState("");
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
  const [mantenimiento, setMantenimiento] = useState("");
  const [funcionamiento, setFuncionamiento] = useState("");
  const [firmaClienteNombre, setFirmaClienteNombre] = useState("");
  const [firmaClienteCargo, setFirmaClienteCargo] = useState("");
  const [firmaClienteEmail, setFirmaClienteEmail] = useState("");
  const [firmaCliente, setFirmaCliente] = useState("");
  const [inspectorFuncionarioId, setInspectorFuncionarioId] = useState("");
  const [inspectorFirmaImagen, setInspectorFirmaImagen] = useState("");

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
  const borradorInicializadoRef = useRef(false);
  const esRutaFormularioMaquinaria = (pathname) =>
    pathname === '/formulario-maquinaria'
    || pathname.startsWith('/formulario-maquinaria/')
    || pathname.endsWith('/formulario-maquinaria');

  const limpiarFormulario = () => {
    limpiarBorradorMaquinaria();
    setNombre('');
    setFecha('');
    setNombreAsegurado('');
    setNombreMaquinaria('');
    setCiudadFecha('');
    setReferencia('');
    setSaludo('');
    setCuerpo('');
    setAseguradora('');
    setMarca('');
    setDescripcion('');
    setElectrico('');
    setTipoProteccion('');
    setRecomendaciones('');
    setInspectorSeleccionado('');
    setCodiInspector('');
    setCargoSeleccionado('');
    setImagenesRegistro([]);
    setFotoPrincipalImagen(null);
    setDescripcionFotoPrincipal('');
    setLugar('');
    setUbicacion('');
    setDepartamento('');
    setModelo('');
    setLinea('');
    setMotorDiesel('');
    setSistemaLocomocion('');
    setColor('');
    setEstadoOperativo('');
    setCabina('');
    setFuncion('');
    setEquipoContraincendio('');
    setEquipoRadio('');
    setRadiodeOperacion('');
    setMecanico('');
    setHidraulico('');
    setPintura('');
    setChasis('');
    setMantenimiento('');
    setFuncionamiento('');
    setFirmaClienteNombre('');
    setFirmaClienteCargo('');
    setFirmaClienteEmail('');
    setFirmaCliente('');
    setInspectorFuncionarioId('');
    setInspectorFirmaImagen('');
    setCamposLlenadosAuto({ aseguradora: false, ciudad: false, asegurado: false });
  };

  const guardarBorradorSesion = (estado) => {
    const borrador = snapshotALocalStorage(estado);
    if (borradorTieneContenido(borrador)) {
      sessionStorage.setItem(BORRADOR_MAQUINARIA_KEY, JSON.stringify(borrador));
    } else {
      limpiarBorradorMaquinaria();
    }
  };

  const getEstadoActual = () => ({
    nombre,
    fecha,
    nombreAsegurado,
    nombreMaquinaria,
    ciudadFecha,
    referencia,
    saludo,
    cuerpo,
    aseguradora,
    marca,
    descripcion,
    electrico,
    tipoProteccion,
    recomendaciones,
    inspectorSeleccionado,
    codiInspector,
    cargoSeleccionado,
    imagenesRegistro,
    fotoPrincipalImagen,
    descripcionFotoPrincipal,
    lugar,
    ubicacion,
    departamento,
    modelo,
    linea,
    motorDiesel,
    sistemaLocomocion,
    color,
    estadoOperativo,
    cabina,
    funcion,
    equipoContraincendio,
    equipoRadio,
    radiodeOperacion,
    mecanico,
    hidraulico,
    pintura,
    chasis,
    mantenimiento,
    funcionamiento,
    firmaClienteNombre,
    firmaClienteCargo,
    firmaClienteEmail,
    firmaCliente,
    inspectorFuncionarioId,
    inspectorFirmaImagen,
  });

  const getSettersMaquinaria = () => ({
    setNombre,
    setFecha,
    setNombreAsegurado,
    setNombreMaquinaria,
    setCiudadFecha,
    setReferencia,
    setSaludo,
    setCuerpo,
    setAseguradora,
    setMarca,
    setModelo,
    setLinea,
    setLugar,
    setUbicacion,
    setDepartamento,
    setInspectorSeleccionado,
    setCodiInspector,
    setCargoSeleccionado,
    setDescripcion,
    setMotorDiesel,
    setSistemaLocomocion,
    setColor,
    setEstadoOperativo,
    setCabina,
    setFuncion,
    setEquipoContraincendio,
    setEquipoRadio,
    setRadiodeOperacion,
    setElectrico,
    setMecanico,
    setHidraulico,
    setPintura,
    setChasis,
    setMantenimiento,
    setFuncionamiento,
    setFirmaClienteNombre,
    setFirmaClienteCargo,
    setFirmaClienteEmail,
    setFirmaCliente,
    setInspectorFuncionarioId,
    setInspectorFirmaImagen,
    setTipoProteccion,
    setRecomendaciones,
    setImagenesRegistro,
    setFotoPrincipalImagen,
    setDescripcionFotoPrincipal,
  });

  // Autocompletar ubicación al escribir o elegir ciudad
  useEffect(() => {
    const ciudad = buscarDepartamentoPorCiudad(DATOS_MAESTROS.ciudades, ciudadFecha);
    if (ciudad) {
      setDepartamento(ciudad.departamento);
      setUbicacion(ciudad.zona);
      setLugar(`${ciudad.nombre}, ${ciudad.departamento}`);
    }
  }, [ciudadFecha]);

  // Estado general §2.1: funcionamiento desde función y estado operativo de §2
  useEffect(() => {
    const texto = [funcion, estadoOperativo]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join('\n\n');
    setFuncionamiento(texto);
  }, [funcion, estadoOperativo]);

  // Cargar lista de inspectores (responsables)
  useEffect(() => {
    fetch(`${BASE_URL}/api/responsables`)
      .then((r) => r.json())
      .then((data) => {
        const lista =
          data?.success && Array.isArray(data.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
        setOpcionesInspectores(
          lista
            .map((r) => {
              const value = String(r.codiRespnsble ?? r.codigo ?? r._id ?? '');
              const label = r.nmbrRespnsble ?? r.nombre ?? '';
              return value && label ? { value, label } : null;
            })
            .filter(Boolean)
        );
      })
      .catch(() => setOpcionesInspectores([]));
  }, []);

  // Vincular código de inspector al cargar historial por nombre
  useEffect(() => {
    if (codiInspector || !inspectorSeleccionado || !opcionesInspectores.length) return;
    const match = opcionesInspectores.find((o) => o.label === inspectorSeleccionado);
    if (match) setCodiInspector(match.value);
  }, [opcionesInspectores, inspectorSeleccionado, codiInspector]);

  const handleInspectorChange = (codi) => {
    setCodiInspector(codi);
    const match = opcionesInspectores.find((o) => o.value === codi);
    setInspectorSeleccionado(match?.label || '');
    setInspectorFuncionarioId('');
    setInspectorFirmaImagen('');
  };

  useEffect(() => {
    if (nombreAsegurado && !firmaClienteNombre) {
      setFirmaClienteNombre(nombreAsegurado);
    }
  }, [nombreAsegurado, firmaClienteNombre]);

  // Cargar borrador de la sesión actual (solo formulario nuevo)
  useEffect(() => {
    if (id && id !== 'nuevo') {
      borradorInicializadoRef.current = true;
      return;
    }

    try {
      localStorage.removeItem(BORRADOR_MAQUINARIA_LEGACY_KEY);
      const datosGuardados = sessionStorage.getItem(BORRADOR_MAQUINARIA_KEY);
      if (datosGuardados) {
        const datosParseados = JSON.parse(datosGuardados);
        if (borradorTieneContenido(datosParseados)) {
          aplicarBorradorLocal(datosParseados, getSettersMaquinaria());
        } else {
          limpiarBorradorMaquinaria();
        }
      }
    } catch (error) {
      console.error('Error al cargar borrador:', error);
      limpiarBorradorMaquinaria();
    } finally {
      borradorInicializadoRef.current = true;
    }
  }, [id]);

  // Guardar borrador solo en sessionStorage y solo si hay contenido
  useEffect(() => {
    if (!borradorInicializadoRef.current) return;
    if (!esRutaFormularioMaquinaria(location.pathname)) return;

    const timeoutId = setTimeout(() => {
      try {
        guardarBorradorSesion(getEstadoActual());
      } catch (error) {
        console.error('Error al guardar borrador:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    location.pathname,
    nombre, fecha, nombreAsegurado, nombreMaquinaria, ciudadFecha, referencia, saludo, cuerpo,
    aseguradora, marca, descripcion, electrico, tipoProteccion, recomendaciones,
    inspectorSeleccionado, cargoSeleccionado, imagenesRegistro, fotoPrincipalImagen,
    descripcionFotoPrincipal, lugar, ubicacion, departamento, modelo, linea, motorDiesel,
    sistemaLocomocion, color, estadoOperativo, cabina, funcion, equipoContraincendio,
    equipoRadio, radiodeOperacion, mecanico, hidraulico, pintura, chasis, mantenimiento, funcionamiento,
  ]);

  // Guardar borrador antes de refrescar la página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (esRutaFormularioMaquinaria(window.location.pathname)) {
        try {
          guardarBorradorSesion(getEstadoActual());
        } catch (error) {
          console.error('Error al guardar antes de salir:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [nombre, fecha, nombreAsegurado, nombreMaquinaria, ciudadFecha, referencia, saludo, cuerpo, aseguradora, marca, descripcion, recomendaciones, imagenesRegistro, inspectorSeleccionado, cargoSeleccionado]);

  // Limpiar borrador al salir del formulario
  useEffect(() => {
    if (!esRutaFormularioMaquinaria(location.pathname)) {
      limpiarBorradorMaquinaria();
    }

    return () => {
      setTimeout(() => {
        if (!esRutaFormularioMaquinaria(window.location.pathname)) {
          limpiarBorradorMaquinaria();
        }
      }, 100);
    };
  }, [location.pathname]);

  // Funciones para llenado automático de campos
  const llenarCamposAseguradora = (aseguradoraId) => {
    const aseguradoraSeleccionada = DATOS_MAESTROS.aseguradoras.find(a => a.id === aseguradoraId);
    if (aseguradoraSeleccionada) {
      setAseguradora(aseguradoraSeleccionada.nombre);
      setCamposLlenadosAuto(prev => ({ ...prev, aseguradora: true }));
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
}
  };

  const llenarCamposAsegurado = (aseguradoId) => {
    const aseguradoSeleccionado = DATOS_MAESTROS.asegurados.find(a => a.id === aseguradoId);
    if (aseguradoSeleccionado) {
      setNombreAsegurado(aseguradoSeleccionado.nombre);
      setLugar(aseguradoSeleccionado.direccion);
      setCamposLlenadosAuto(prev => ({ ...prev, asegurado: true }));
    }
  };

  // Función para obtener opciones de los datos maestros
  const obtenerOpcionesAseguradoras = () => {
    const opciones = DATOS_MAESTROS.aseguradoras.map(a => ({ value: a.id, label: a.nombre }));
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

const baseURL = BASE_URL;

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
        aplicarDatosMaquinaria(data.formulario.datos || {}, getSettersMaquinaria());
      }
    } catch (error) {
      console.error('❌ Error cargando datos del formulario:', error);
      alert(t('machinery.ui.alerts.loadError'));
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

  const handleGuardarEnHistorial = async () => {
    const snapshot = construirSnapshotMaquinaria(getEstadoActual());
    const datos = {
      titulo: `Inspección de Maquinaria - ${nombreAsegurado || 'Asegurado'} - ${nombreMaquinaria || 'Maquinaria'}`,
      datos: {
        ...snapshot,
        horaInspeccion: new Date().toLocaleTimeString(),
        sucursal: 'N/A',
        serie: 'N/A',
        ano: 'N/A',
        estadoGeneral: 'N/A',
        observaciones: recomendaciones,
      },
    };

    const resultado = await guardarEnHistorial(datos, 'en_proceso');
    alert(resultado.message);
    if (resultado.success) limpiarBorradorMaquinaria();
  };

  const estadoMaquinariaRef = useRef({});
  useEffect(() => {
    estadoMaquinariaRef.current = getEstadoActual();
  }, [
    nombre, fecha, nombreAsegurado, nombreMaquinaria, ciudadFecha, aseguradora, marca, modelo,
    tipoProteccion, recomendaciones, inspectorSeleccionado, cargoSeleccionado, imagenesRegistro,
    fotoPrincipalImagen, descripcionFotoPrincipal, referencia, saludo, cuerpo,
    descripcion, lugar, ubicacion, departamento, linea, motorDiesel, sistemaLocomocion, color,
    estadoOperativo, cabina, funcion, equipoContraincendio, equipoRadio, radiodeOperacion,
    electrico, mecanico, hidraulico, pintura, chasis, mantenimiento, funcionamiento,
  ]);

  useServerAutoSaveUpdate({
    recordId: id && id !== 'nuevo' ? id : null,
    ready: modoEdicion && Boolean(id && id !== 'nuevo'),
    isBlocked: () => guardando || exportando || cargando,
    onUpdate: async (formularioId) => {
      const s = estadoMaquinariaRef.current;
      const snapshot = construirSnapshotMaquinaria(s);
      await historialService.actualizarFormulario(formularioId, {
        titulo: `Inspección de Maquinaria - ${s.nombreAsegurado || 'Asegurado'} - ${s.nombreMaquinaria || 'Maquinaria'}`,
        tipo: TIPOS_FORMULARIOS.MAQUINARIA,
        estado: 'en_proceso',
        fechaModificacion: new Date().toISOString(),
        datos: {
          ...snapshot,
          horaInspeccion: new Date().toLocaleTimeString(),
          observaciones: s.recomendaciones,
        },
      });
    },
  });

  const handleExportar = async () => {
    try {
      const snapshot = construirSnapshotMaquinaria(getEstadoActual());
      const datos = {
        titulo: `Inspección de Maquinaria - ${nombreAsegurado || 'Asegurado'} - ${nombreMaquinaria || 'Maquinaria'}`,
        datos: {
          ...snapshot,
          horaInspeccion: new Date().toLocaleTimeString(),
          sucursal: 'N/A',
          serie: 'N/A',
          ano: 'N/A',
          estadoGeneral: 'N/A',
          observaciones: recomendaciones,
        },
      };

      await generarWord({
        inspectorSeleccionado,
        cargoSeleccionado,
        firmaCliente,
        firmaClienteNombre,
        firmaClienteCargo,
        firmaClienteEmail,
        inspectorFirmaImagen,
        fecha,
      });

      const resultado = await guardarEnHistorial(datos, 'completado');
      alert(resultado.message);
      if (resultado.success) limpiarBorradorMaquinaria();
    } catch (error) {
      console.error('Error en exportación:', error);
      alert(t('machinery.ui.alerts.exportError', { message: error.message }));
    }
  };


  // Convierte data URL de firma en ArrayBuffer para Word
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

const parrafoFirmaImg = (buf) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: buf
      ? [new ImageRun({ data: buf, transformation: { width: 160, height: 80 } })]
      : [new TextRun({ text: '________________________', font: 'Arial', size: 24 })],
  });

  
const generarWord = async ({
  inspectorSeleccionado,
  cargoSeleccionado,
  firmaCliente,
  firmaClienteNombre,
  firmaClienteCargo,
  firmaClienteEmail,
  inspectorFirmaImagen,
  fecha,
}) => {
    let isMounted = true;

    const bordesTablaSinLineas = {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    };

    const bufCliente = bufferDesdeDataUrl(firmaCliente);
    const bufInspector = bufferDesdeDataUrl(inspectorFirmaImagen);
    const margFirma = { top: 100, bottom: 100, left: 140, right: 140 };
    const celdaFirma = (children) =>
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        margins: margFirma,
        verticalAlign: VerticalAlign.CENTER,
        children,
      });

    let imagenPresentacion = null;
    let descripcionPortada = descripcionFotoPrincipal || fotoPrincipalImagen?.descripcion || 'Vista de la máquina';
    try {
      if (fotoPrincipalImagen) {
        const arrayBuffer = await fetchImageAsArrayBuffer(fotoPrincipalImagen);
        if (arrayBuffer) {
          imagenPresentacion = new ImageRun({
            data: arrayBuffer,
            transformation: { width: 350, height: 250 },
          });
        }
      } else if (imagenesRegistro?.[0]) {
        const arrayBuffer = await fetchImageAsArrayBuffer(imagenesRegistro[0]);
        if (arrayBuffer) {
          imagenPresentacion = new ImageRun({
            data: arrayBuffer,
            transformation: { width: 350, height: 250 },
          });
          if (imagenesRegistro[0].descripcion) descripcionPortada = imagenesRegistro[0].descripcion;
        }
      }
    } catch (err) {
      console.warn('No se pudo incluir foto de portada en Word:', err);
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
                new TextRun({ text: aseguradora, font: "Arial", size: 24 }),
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
                        text: descripcionPortada,
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
                  ["EQUIPO INSPECCIONADO", nombreMaquinaria],
                  ["MARCA", marca],
                  ["REFERENCIA", referencia],
                  ["TOMADOR", nombreAsegurado],
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
                    ["SISTEMA DE LOCOMOCIÓN", sistemaLocomocion],
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
              ...convertirHtmlADocx(textoPlanoAHtml(recomendaciones)),

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
                            const buffer = await fetchImageAsArrayBuffer(img);
                            if (!buffer) {
                              rowCells.push(new TableCell({ children: [new Paragraph({ text: "" })] }));
                              continue;
                            }

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
new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: bordesTablaSinLineas,
  rows: [
    new TableRow({
      children: [
        celdaFirma([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'FIRMA DE CLIENTE', font: 'Arial', size: 22, bold: true }),
            ],
          }),
        ]),
        celdaFirma([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'FIRMA DEL INSPECTOR', font: 'Arial', size: 22, bold: true }),
            ],
          }),
        ]),
      ],
    }),
    new TableRow({
      children: [
        celdaFirma([parrafoFirmaImg(bufCliente)]),
        celdaFirma([parrafoFirmaImg(bufInspector)]),
      ],
    }),
    new TableRow({
      children: [
        celdaFirma([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: firmaClienteNombre?.trim() || 'NOMBRE DEL CLIENTE / TITULAR',
                font: 'Arial',
                size: 24,
                bold: true,
                underline: {},
              }),
            ],
          }),
        ]),
        celdaFirma([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: inspectorSeleccionado?.trim() || 'NOMBRE DEL INSPECTOR',
                font: 'Arial',
                size: 24,
                bold: true,
                underline: {},
              }),
            ],
          }),
        ]),
      ],
    }),
    new TableRow({
      children: [
        celdaFirma([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
              new TextRun({
                text: firmaClienteCargo?.trim() || '—',
                font: 'Arial',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Correo: ', font: 'Arial', size: 20, bold: true }),
              new TextRun({
                text: firmaClienteEmail?.trim() || '—',
                font: 'Arial',
                size: 20,
                color: '0066CC',
              }),
            ],
          }),
        ]),
        celdaFirma([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
              new TextRun({
                text: cargoSeleccionado?.trim() || '—',
                font: 'Arial',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Fecha: ', font: 'Arial', size: 20, bold: true }),
              new TextRun({
                text: fecha || '—',
                font: 'Arial',
                size: 20,
              }),
            ],
          }),
        ]),
      ],
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
    <div className="min-h-screen p-2 sm:p-4 lg:p-8" style={{ backgroundColor: mq.bgMain }}>
      <div
        className="max-w-4xl mx-auto shadow-lg rounded-lg p-3 sm:p-4 lg:p-6"
        style={{ backgroundColor: mq.cardBg, border: `1px solid ${mq.borderColor}` }}
      >
        {/* Encabezado corporativo */}
        <div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 gap-4"
          style={{ borderBottom: `1px solid ${mq.borderColor}` }}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <img src={Logo} alt={t('machinery.ui.common.logoAlt')} className="h-12 sm:h-16 object-contain" />
            {modoEdicion && (
              <span
                className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
                style={{
                  backgroundColor: mq.theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                  color: mq.theme === 'dark' ? '#93C5FD' : '#1E40AF',
                }}
              >
                {t('machinery.ui.form.editMode')}
              </span>
            )}
          </div>
          <div className="w-full sm:w-auto">
            <p className="text-xs sm:text-sm font-semibold mb-1" style={{ color: mq.textPrimary }}>
              {t('machinery.ui.form.inspectionDate')}
            </p>
            <ThemedInput
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="sm:w-auto"
              disabled={cargando}
            />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: mq.textPrimary }}>
            {t('machinery.ui.form.title')}
          </h1>
          <p className="text-sm" style={{ color: mq.textSecondary }}>
            {t('machinery.ui.form.subtitle')}
          </p>
        </div>

        {cargando && (
          <div className="text-center py-6 mb-6">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
              style={{ borderColor: '#DC2626' }}
            />
            <p className="mt-2 text-sm" style={{ color: mq.textSecondary }}>
              {t('machinery.ui.form.loadingForm')}
            </p>
          </div>
        )}

        <LlenadoGuia />

        <SectionCard title={t('machinery.ui.sections.fotoPrincipal.title')} subtitle={t('machinery.ui.sections.fotoPrincipal.subtitle')}>
          <FotoPrincipalMaquinaria
            imagen={fotoPrincipalImagen}
            onChange={(img) => {
              setFotoPrincipalImagen(img);
              if (img?.descripcion !== undefined) setDescripcionFotoPrincipal(img.descripcion);
            }}
            descripcion={descripcionFotoPrincipal}
            onDescripcionChange={setDescripcionFotoPrincipal}
            disabled={cargando}
          />
        </SectionCard>

        <EncabezadoMaquinaria
          nombreAsegurado={nombreAsegurado}
          setNombreAsegurado={setNombreAsegurado}
          nombreMaquinaria={nombreMaquinaria}
          setNombreMaquinaria={setNombreMaquinaria}
          marca={marca}
          setMarca={setMarca}
          opcionesAsegurados={obtenerOpcionesAsegurados()}
          opcionesAseguradoras={obtenerOpcionesAseguradoras()}
          onAseguradoChange={llenarCamposAsegurado}
          onAseguradoraChange={llenarCamposAseguradora}
          aseguradora={aseguradora}
          setAseguradora={setAseguradora}
        />

        <SectionCard title={t('machinery.ui.sections.datosGenerales.title')} subtitle={t('machinery.ui.sections.datosGenerales.subtitle')}>
          <CartaPresentacionMaquinaria
            ciudadFecha={ciudadFecha}
            setCiudadFecha={setCiudadFecha}
            fecha={fecha}
            aseguradora={aseguradora}
            nombreAsegurado={nombreAsegurado}
            nombreMaquinaria={nombreMaquinaria}
            referencia={referencia}
            saludo={saludo}
            setSaludo={setSaludo}
            cuerpo={cuerpo}
            setCuerpo={setCuerpo}
            opcionesCiudades={obtenerOpcionesCiudades()}
            onCiudadChange={llenarCamposCiudad}
            cargando={cargando}
          />
        </SectionCard>

        <SectionCard title={t('machinery.ui.sections.informe.title')} subtitle={t('machinery.ui.sections.informe.subtitle')}>
          <TablaInspeccionMaquinaria
            aseguradora={aseguradora}
            equipo={nombreMaquinaria}
            marca={marca}
            referencia={referencia}
            setReferencia={setReferencia}
            tomador={nombreAsegurado}
            lugar={lugar}
            ubicacion={ubicacion}
            departamento={departamento}
            codiInspector={codiInspector}
            onInspectorChange={handleInspectorChange}
            opcionesInspectores={opcionesInspectores}
            fechaInspeccion={fecha}
            atendido={cargoSeleccionado}
            setAtendido={setCargoSeleccionado}
          />
        </SectionCard>

        <SectionCard title={t('machinery.ui.sections.descripcion.title')} subtitle={t('machinery.ui.sections.descripcion.subtitle')}>
          <DescripcionBienAsegurado
            descripcion={descripcion} setDescripcion={setDescripcion}
            marca={marca}
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
        </SectionCard>

        <SectionCard title={t('machinery.ui.sections.estado.title')} subtitle={t('machinery.ui.sections.estado.subtitle')}>
          <EstadoGeneralMaquinaria
            electrico={electrico} setElectrico={setElectrico}
            mecanico={mecanico} setMecanico={setMecanico}
            hidraulico={hidraulico} setHidraulico={setHidraulico}
            pintura={pintura} setPintura={setPintura}
            chasis={chasis} setChasis={setChasis}
            sistemaLocomocion={sistemaLocomocion}
            funcionamiento={funcionamiento}
            mantenimiento={mantenimiento} setMantenimiento={setMantenimiento}
          />
        </SectionCard>

        <SectionCard title={t('machinery.ui.sections.proteccion.title')}>
          <TipoProteccionMaquinaria
            tipoProteccion={tipoProteccion}
            setTipoProteccion={setTipoProteccion}
            cargando={cargando}
          />
        </SectionCard>

        <SectionCard title={t('machinery.ui.sections.recomendaciones.title')}>
          <RecomendacionesObservacionesMaquinaria
            recomendaciones={recomendaciones}
            setRecomendaciones={setRecomendaciones}
            cargando={cargando}
          />
        </SectionCard>

        <SectionCard title={t('machinery.ui.sections.registro.title')} subtitle={t('machinery.ui.sections.registro.subtitle')}>
          <RegistroFotograficoMaquinaria
            onChange={setImagenesRegistro}
            imagenesIniciales={imagenesRegistro}
            disabled={cargando}
          />
        </SectionCard>

        <SectionCard title={t('machinery.ui.sections.firmas.title')}>
          <FirmaMaquinaria
            clienteNombre={firmaClienteNombre}
            setClienteNombre={setFirmaClienteNombre}
            clienteCargo={firmaClienteCargo}
            setClienteCargo={setFirmaClienteCargo}
            clienteEmail={firmaClienteEmail}
            setClienteEmail={setFirmaClienteEmail}
            firmaCliente={firmaCliente}
            setFirmaCliente={setFirmaCliente}
            inspectorNombre={inspectorSeleccionado}
            inspectorCargo={cargoSeleccionado}
            inspectorFuncionarioId={inspectorFuncionarioId}
            setInspectorFuncionarioId={setInspectorFuncionarioId}
            inspectorFirmaImagen={inspectorFirmaImagen}
            setInspectorFirmaImagen={setInspectorFirmaImagen}
            fecha={fecha}
            disabled={cargando}
          />
        </SectionCard>

        {/* Acciones */}
        <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${mq.borderColor}` }}>
          <div
            className="mb-4 p-3 rounded-lg text-xs sm:text-sm"
            style={{ backgroundColor: mq.accentSoft, color: mq.textPrimary }}
          >
            <p className="font-semibold mb-2">{t('machinery.ui.form.requiredFields')}</p>
            <ul className="space-y-1" style={{ color: mq.textSecondary }}>
              <li>{nombreAsegurado ? '✓' : '○'} {t('machinery.ui.form.requiredInsured')}</li>
              <li>{nombreMaquinaria ? '✓' : '○'} {t('machinery.ui.form.requiredMachinery')}</li>
              <li>{aseguradora ? '✓' : '○'} {t('machinery.ui.form.requiredInsurer')}</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('machinery.ui.form.startOverConfirm'))) {
                  limpiarFormulario();
                }
              }}
              className="btn-fenix-secondary text-sm py-2 px-4"
              disabled={cargando || guardando || exportando}
            >
              {t('machinery.ui.form.startOver')}
            </button>
          </div>

          <BotonesHistorial
            onGuardarEnHistorial={handleGuardarEnHistorial}
            onExportar={handleExportar}
            tipoFormulario={TIPOS_FORMULARIOS.MAQUINARIA}
            tituloFormulario={t('machinery.ui.form.historyTitle')}
            deshabilitado={!nombreAsegurado || !nombreMaquinaria || !aseguradora}
            guardando={guardando}
            exportando={exportando}
          />
        </div>
      </div>
    </div>
  );
}