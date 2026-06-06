import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaFileAlt, 
  FaDownload, 
  FaEdit, 
  FaTrash,
  FaEye,
  FaCalendarAlt,
  FaUser,
  FaFolder,
  FaSync,
  FaExclamationCircle,
  FaInfoCircle,
  FaDatabase,
  FaRedo
} from 'react-icons/fa';
import { formatearFechaUI, formatearFechaHoraUI } from '../utils/fechaUtils';
import useHistorial from '../hooks/useHistorial';
import { TIPOS_FORMULARIOS, ESTADOS_FORMULARIO } from '../services/historialService';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Header,
  Footer,
  ImageRun,
  PageBreak
} from 'docx';
import { saveAs } from 'file-saver';

export default function HistorialFormularios() {
  const {
    formularios,
    cargando,
    error,
    filtros,
    estadisticas,
    aplicarFiltros,
    cargarHistorial,
    buscarFormularios,
    guardarFormulario,
    eliminarFormulario,
    descargarFormulario,
    obtenerFormulario,
    limpiarError,
    refrescarHistorial
  } = useHistorial();

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroUsuario, setFiltroUsuario] = useState(''); // Nuevo filtro por usuario para admin/soporte
  const [listaUsuarios, setListaUsuarios] = useState([]); // Lista de usuarios para el dropdown
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [exportando, setExportando] = useState({});
  const [regenerando, setRegenerando] = useState({});
  const [paginaActual, setPaginaActual] = useState(1);
  const [formulariosPorPagina, setFormulariosPorPagina] = useState(20);
  const navigate = useNavigate();
  
  // Obtener rol del usuario para mostrar filtro de usuario solo a admin/soporte
  const rolUsuario = localStorage.getItem('rol') || '';
  const esAdminOSoporte = rolUsuario === 'admin' || rolUsuario === 'soporte';

  // Tipos de formularios disponibles
  const tiposFormularios = [
    { id: 'todos', nombre: 'Todos los Formularios', icono: '📋', color: 'bg-gray-500' },
    { id: TIPOS_FORMULARIOS.COMPLEX, nombre: 'Complex', icono: '🏢', color: 'bg-blue-500' },
    { id: TIPOS_FORMULARIOS.RIESGOS, nombre: 'Riesgos', icono: '⚠️', color: 'bg-red-500' },
    { id: TIPOS_FORMULARIOS.POL, nombre: 'POL', icono: '📄', color: 'bg-green-500' },
    { id: TIPOS_FORMULARIOS.INSPECCION, nombre: 'Inspección', icono: '🔍', color: 'bg-yellow-500' },
    { id: TIPOS_FORMULARIOS.ACTA_INSPECCION, nombre: 'Acta de Inspección', icono: '📋', color: 'bg-red-600' },
    { id: TIPOS_FORMULARIOS.INSPECCION_PROPIEDADES, nombre: 'Inspección de Propiedades', icono: '🏠', color: 'bg-teal-500' },
    { id: TIPOS_FORMULARIOS.MAQUINARIA, nombre: 'Maquinaria', icono: '⚙️', color: 'bg-purple-500' },
    { id: TIPOS_FORMULARIOS.SINIESTROS, nombre: 'Siniestros', icono: '🚨', color: 'bg-orange-500' },
    { id: TIPOS_FORMULARIOS.AJUSTE, nombre: 'Ajuste', icono: '📊', color: 'bg-indigo-500' },
    { id: TIPOS_FORMULARIOS.MATRIZ_RIESGO_INICIAL, nombre: 'Matriz de Riesgo (Inicial)', icono: '🔥', color: 'bg-pink-500' },
    { id: TIPOS_FORMULARIOS.MATRIZ_RIESGO_FINAL, nombre: 'Matriz de Riesgo (Final)', icono: '🎯', color: 'bg-rose-500' }
  ];

  // Cargar lista de usuarios cuando el componente se monta (solo para admin/soporte)
  useEffect(() => {
    if (esAdminOSoporte) {
      const cargarUsuarios = async () => {
        try {
          setCargandoUsuarios(true);
          const { BASE_URL } = await import('../config/apiConfig');
          const token = localStorage.getItem('token');
          
          const response = await fetch(`${BASE_URL}/api/secur-auth/usuarios`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
          }

          const data = await response.json();
          setListaUsuarios(data.usuarios || []);
          console.log('✅ Usuarios cargados:', data.usuarios?.length || 0);
        } catch (error) {
          console.error('❌ Error cargando usuarios:', error);
          setListaUsuarios([]);
        } finally {
          setCargandoUsuarios(false);
        }
      };
      
      cargarUsuarios();
    }
  }, [esAdminOSoporte]);

  // Aplicar filtros cuando cambien y recargar historial
  useEffect(() => {
    const filtrosAplicar = { tipo: filtroTipo };
    // Solo incluir usuario en filtros si tiene valor
    if (esAdminOSoporte && filtroUsuario && filtroUsuario.trim()) {
      filtrosAplicar.usuario = filtroUsuario.trim();
    }
    aplicarFiltros(filtrosAplicar);
    // Recargar historial con los nuevos filtros
    cargarHistorial(filtrosAplicar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo, filtroUsuario, esAdminOSoporte]);



  // Filtrar formularios por búsqueda
  // IMPORTANTE: Si hay texto en busqueda, NO aplicar filtro local porque ya se buscó en el servidor
  // Solo aplicar filtro local cuando NO hay búsqueda activa
  const formulariosFiltrados = busqueda.trim() 
    ? formularios // Si hay búsqueda, usar directamente los resultados del servidor
    : formularios.filter(formulario => {
        // Si no hay búsqueda, aplicar filtro local solo si es necesario
        // (por ahora, mostrar todos cuando no hay búsqueda)
        return true;
      });

  // Calcular paginación
  const totalPaginas = Math.ceil(formulariosFiltrados.length / formulariosPorPagina) || 1;
  const indiceInicio = (paginaActual - 1) * formulariosPorPagina;
  const indiceFin = indiceInicio + formulariosPorPagina;
  const formulariosPaginados = formulariosFiltrados.slice(indiceInicio, indiceFin);
  const desde = formulariosFiltrados.length === 0 ? 0 : indiceInicio + 1;
  const hasta = Math.min(indiceFin, formulariosFiltrados.length);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroTipo, busqueda, filtroUsuario]);

  // Función para exportar formulario (descargar directamente si ya existe)
  const handleExportarFormulario = async (formulario) => {
    try {
      // Verificar si el formulario tiene archivo
      if (!formulario.archivo || !formulario.archivo.nombre) {
        alert('❌ Este formulario no tiene archivo adjunto para exportar');
        return;
      }
      
      // Obtener el ID del formulario (puede ser id o _id)
      const formularioId = formulario.id || formulario._id;
      
      if (!formularioId) {
        alert('❌ Error: No se pudo identificar el formulario para exportar');
        return;
      }
      
      console.log('📤 Iniciando exportación de:', formulario.archivo.nombre);
      console.log('🔍 ID del formulario:', formularioId);
      console.log('🔍 Información del archivo:', formulario.archivo);
      
      // Mostrar indicador de carga
      setExportando(prev => ({ ...prev, [formularioId]: true }));
      
      // Si el formulario ya existe en la base de datos (tiene ID), solo descargarlo
      // No necesitamos guardarlo de nuevo, ya está en la BD
      console.log('⬇️ Descargando archivo del formulario existente...');
      
      // Descargar el archivo directamente
      await descargarFormulario(formularioId);
      
      // Mostrar mensaje de éxito
      alert(`✅ Exportación completada: ${formulario.archivo.nombre}\n\nEl archivo ha sido descargado exitosamente.`);
      
    } catch (error) {
      console.error('Error en exportación:', error);
      
      // Mensaje de error más específico y útil
      let mensajeError = 'Error al exportar el formulario';
      
      if (error.message.includes('500')) {
        mensajeError = '❌ Error del servidor: No se pudo procesar la exportación.\n\nPosibles causas:\n• Problema con el archivo\n• Error en la base de datos';
      } else if (error.necesitaRegeneracion || (error.message.includes('404') && error.message.includes('no encontrado'))) {
        // Si el archivo no existe y necesita regeneración, ofrecer abrir el editor
        const respuesta = confirm(
          '❌ Archivo no encontrado en el servidor.\n\n' +
          'El formulario existe en la base de datos, pero el archivo físico no se encuentra.\n\n' +
          '¿Deseas abrir el formulario para regenerar el documento?\n\n' +
          'Esto abrirá el editor del formulario donde podrás regenerar y guardar el archivo.'
        );
        
        if (respuesta) {
          // Abrir el formulario en modo edición para regenerar el documento
          handleEditarFormulario(formulario);
        }
        return; // No mostrar alert adicional
      } else if (error.message.includes('404')) {
        mensajeError = '❌ Formulario no encontrado en el servidor.';
      } else if (error.message.includes('401')) {
        mensajeError = '❌ Sesión expirada. Por favor, inicia sesión nuevamente.';
      } else if (error.message.includes('403')) {
        mensajeError = '❌ No tienes permisos para exportar este formulario.';
      } else if (error.message.includes('NetworkError')) {
        mensajeError = '❌ Error de conexión. Verifica tu conexión a internet.';
      } else {
        mensajeError = `❌ Error al exportar: ${error.message}`;
      }
      
      alert(mensajeError);
      
    } finally {
      // Ocultar indicador de carga
      const formularioId = formulario.id || formulario._id;
      if (formularioId) {
        setExportando(prev => ({ ...prev, [formularioId]: false }));
      }
    }
  };

  // Función para editar formulario
  const handleEditarFormulario = async (formulario) => {
    try {
      console.log('🔍 Obteniendo formulario para editar:', formulario.id);
      
      const formularioCompleto = await obtenerFormulario(formulario.id);
      console.log('✅ Formulario obtenido para editar:', formularioCompleto);
      
      // Redirección según el tipo de formulario
      let rutaEdicion = '';
      let mensajeInfo = '';
      
      switch (formulario.tipo) {
        case 'complex':
          rutaEdicion = `/editar-caso/${formulario.id}`;
          mensajeInfo = '🏢 Redirigiendo al editor de Complex...';
          break;
        case 'riesgos':
          rutaEdicion = `/riesgos/editar/${formulario.id}`;
          mensajeInfo = '⚠️ Redirigiendo al editor de Riesgos...';
          break;
        case 'pol':
          rutaEdicion = `/reporte-pol`;
          mensajeInfo = '📄 Redirigiendo al formulario POL (modo creación)...';
          break;
        case 'inspeccion':
          rutaEdicion = `/formularioinspeccion/editar/${formulario.id}`;
          mensajeInfo = '🔍 Redirigiendo al formulario de Inspección (modo edición)...';
          break;
        case 'inspeccion-propiedades':
          rutaEdicion = `/formulario-inspeccion-propiedades/editar/${formulario.id}`;
          mensajeInfo = '🏠 Redirigiendo al formulario de Inspección de Propiedades (modo edición)...';
          break;
        case 'acta_inspeccion':
          rutaEdicion = `/acta-inspeccion/editar/${formulario.id}`;
          mensajeInfo = '📋 Redirigiendo al Acta de Inspección (modo edición)...';
          break;
        case 'inspeccion-puertos':
          rutaEdicion = `/puertos/formulario/editar/${formulario.id}`;
          mensajeInfo = '🚢 Redirigiendo al formulario de Inspección de Puertos (modo edición)...';
          break;
        case 'maquinaria':
          rutaEdicion = `/formulario-maquinaria/editar/${formulario.id}`;
          mensajeInfo = '⚙️ Redirigiendo al formulario de Maquinaria (modo edición)...';
          break;
        case 'siniestros':
          rutaEdicion = `/siniestros`;
          mensajeInfo = '🚨 Redirigiendo a la lista de Siniestros...';
          break;
        case 'ajuste':
          rutaEdicion = `/ajuste/editar/${formulario.id}`;
          mensajeInfo = '📊 Redirigiendo al formulario de Ajuste (modo edición)...';
          break;
        default:
          rutaEdicion = `/inicio`;
          mensajeInfo = '🏠 Redirigiendo al inicio...';
      }
      
      // Mostrar mensaje informativo antes de redirigir
      alert(`${mensajeInfo}\n\nFormulario: ${formulario.titulo}\nTipo: ${formulario.tipo.toUpperCase()}`);
      
      // Redirección real usando React Router
      navigate(rutaEdicion);
    } catch (error) {
      console.error('❌ Error al obtener formulario para editar:', error);
      
      let mensajeError = 'Error al obtener formulario para editar';
      
      if (error.message.includes('401')) {
        mensajeError = '❌ Sesión expirada. Por favor, inicia sesión nuevamente.';
      } else if (error.message.includes('404')) {
        mensajeError = '❌ Formulario no encontrado en el servidor.';
      } else if (error.message.includes('500')) {
        mensajeError = '❌ Error del servidor. Intenta nuevamente más tarde.';
      } else if (error.message.includes('NetworkError')) {
        mensajeError = '❌ Error de conexión. Verifica tu conexión a internet.';
      } else {
        mensajeError = `❌ Error: ${error.message}`;
      }
      
      alert(mensajeError);
    }
  };

  // Función para regenerar y descargar documento directamente desde la base de datos
  const handleRegenerarDesdeBD = async (formulario) => {
    try {
      const formularioId = formulario.id || formulario._id;
      
      if (!formularioId) {
        alert('❌ Error: No se pudo identificar el formulario');
        return;
      }

      // Solo para formularios de inspeccion-propiedades por ahora
      if (formulario.tipo !== 'inspeccion-propiedades') {
        alert('❌ Esta función solo está disponible para formularios de Inspección de Propiedades por ahora.');
        return;
      }

      // Mostrar indicador de carga
      setRegenerando(prev => ({ ...prev, [formularioId]: true }));

      console.log('🔄 Regenerando documento desde la base de datos...', formularioId);

      // Obtener formulario completo con todos los datos
      const formularioCompleto = await obtenerFormulario(formularioId);
      console.log('✅ Formulario completo obtenido:', formularioCompleto);

      if (!formularioCompleto || !formularioCompleto.datos) {
        throw new Error('No se pudieron obtener los datos del formulario');
      }

      // Extraer datos del formulario
      const datos = formularioCompleto.datos;
      const { BASE_URL } = await import('../config/apiConfig');
      
      // Función auxiliar para convertir base64 a ArrayBuffer
      const base64ToArrayBuffer = (base64) => {
        const binaryString = window.atob(base64.split(',')[1] || base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      };

      // Función para capitalizar primera letra
      const capitalizeFirstLetter = (str) => {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };

      // Función para formatear cumple
      const formatearCumple = (cumple) => {
        if (!cumple) return "";
        const lower = cumple.toLowerCase();
        if (lower === "si" || lower === "sí") return "SÍ";
        if (lower === "no") return "NO";
        return cumple.toUpperCase();
      };
      
      // Extraer áreas y fotos de los datos
      const areasData = datos.areasData || {};
      const fotosAreas = datos.fotosAreas || {};
      
      // Crear documento completo
      const nombreCliente = datos.nombreInmueble || formularioCompleto.titulo || "Sin Nombre";
      const today = new Date();
      const formattedDate = today.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      const docContent = [];

      // Encabezado completo
      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "PROSER RIESGOS SAS",
                        bold: true,
                        size: 20,
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '"La mejor opción para su negocio"',
                        color: "FF0000",
                        size: 16,
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "INFORME DE INSPECCIÓN PROPIEDADES",
                        bold: true,
                        size: 24,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 40, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "CÓDIGO: RU-ISA-004",
                        bold: true,
                        size: 20,
                      }),
                    ],
                    alignment: AlignmentType.RIGHT,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "VERSIÓN: 1",
                        bold: true,
                        size: 20,
                      }),
                    ],
                    alignment: AlignmentType.RIGHT,
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `DATE: ${formattedDate}`,
                        bold: true,
                        size: 20,
                      }),
                    ],
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
      });

      docContent.push(headerTable);
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
              new TableCell({ children: [new Paragraph(datos.claseInmueble || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Tipo de Inmueble")] }),
              new TableCell({ children: [new Paragraph(datos.tipoInmueble || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Dirección")] }),
              new TableCell({ children: [new Paragraph(datos.direccion || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Nombre del Cliente")] }),
              new TableCell({ children: [new Paragraph(datos.nombreInmueble || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Localización")] }),
              new TableCell({ children: [new Paragraph(datos.localizacion || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Ciudad")] }),
              new TableCell({ children: [new Paragraph(datos.ciudad || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Departamento")] }),
              new TableCell({ children: [new Paragraph(datos.departamento || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Quien recibe la Visita")] }),
              new TableCell({ children: [new Paragraph(datos.destinacion || "")] }),
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
              new TableCell({ children: [new Paragraph(datos.tipoDocumento || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Número de Documento")] }),
              new TableCell({ children: [new Paragraph(datos.numeroDocumento || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Fecha del Documento")] }),
              new TableCell({ children: [new Paragraph(datos.fechaDocumento || "")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Notaría y Lugar de Expedición")] }),
              new TableCell({ children: [new Paragraph(datos.notaria || "")] }),
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
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(datos.acueducto || ""))] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Alcantarillado")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(datos.alcantarillado || ""))] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Energía Eléctrica")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(datos.energia || ""))] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Gas Natural")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(datos.gas || ""))] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Otros Servicios")] }),
              new TableCell({ children: [new Paragraph(capitalizeFirstLetter(datos.otrosServicios || ""))] }),
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
      if (datos.inspeccionMetrica) {
        docContent.push(
          new Paragraph({
            text: "Inspección Métrica",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          })
        );
        docContent.push(
          new Paragraph({
            text: datos.inspeccionMetrica,
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
              new TableCell({ children: [new Paragraph({ text: "PARÁMETRO", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "CUMPLE", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "SÍNTOMA", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "OBSERVACIÓN", bold: true })] }),
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
                    fill: item.cumple?.toLowerCase() === "si" || item.cumple?.toLowerCase() === "sí" ? "C6EFCE" : 
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
                  
                  // Intentar obtener imagen desde diferentes fuentes
                  if (foto.base64) {
                    imageBuffer = base64ToArrayBuffer(foto.base64);
                  } else if (foto.ruta) {
                    // Si tiene ruta, intentar cargarla desde el servidor
                    try {
                      const fullUrl = foto.ruta.startsWith('http') ? foto.ruta : `${BASE_URL}${foto.ruta}`;
                      const response = await fetch(fullUrl);
                      const blob = await response.blob();
                      imageBuffer = await blob.arrayBuffer();
                    } catch (fetchError) {
                      console.warn('No se pudo cargar imagen desde ruta:', foto.ruta);
                      imageBuffer = null;
                    }
                  } else if (foto.url) {
                    const response = await fetch(foto.url);
                    const blob = await response.blob();
                    imageBuffer = await blob.arrayBuffer();
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
            docContent.push(new PageBreak());
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
      const numAlcobas = parseInt(datos.numAlcobas) || 0;
      for (let i = 1; i <= numAlcobas; i++) {
        if (areasData.alcobas && areasData.alcobas[i] && areasData.alcobas[i].length > 0) {
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
          
          if (fotosAreas.alcobas && fotosAreas.alcobas[i] && fotosAreas.alcobas[i].length > 0) {
            await insertarFotosSeccion(fotosAreas.alcobas[i], `FOTOS DE ALCOBA ${i}`);
          }
        }
      }

      // Conclusiones
      if (datos.conclusiones) {
        docContent.push(
          new Paragraph({
            text: "6 - CONCLUSIONES",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          })
        );
        docContent.push(
          new Paragraph({
            text: datos.conclusiones,
            spacing: { after: 400 },
          })
        );
      }

      // Principales Observaciones
      if (datos.observacionesPrincipales) {
        docContent.push(
          new Paragraph({
            text: "6.1 - LAS PRINCIPALES OBSERVACIONES SON:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          })
        );
        docContent.push(
          new Paragraph({
            text: datos.observacionesPrincipales,
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

      const inspector2 = datos.inspector2 || "ladys";
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
                    inspector2 === "ladys" ? "LADYS ESCALANTE BOSSIO" :
                    inspector2 === "maria" ? "MARÍA GARCÍA MANJARRES" :
                    inspector2 === "mario" ? "MARIO PINILLA DE LA TORRE" :
                    "INSPECTOR"
                  ),
                  new Paragraph("PROSER RIESGOS SAS"),
                  new Paragraph(
                    inspector2 === "ladys" ? "E-MAIL: ladys.escalante@proserpuertos.com.co" :
                    inspector2 === "maria" ? "E-MAIL: magarciamanjarres@proserpuertos.com.co" :
                    inspector2 === "mario" ? "E-MAIL: mario.pinilla@proserpuertos.com.co" :
                    "E-MAIL: inspector@proserpuertos.com.co"
                  ),
                ],
              }),
            ],
          }),
        ],
      });
      docContent.push(signTable);

      // Crear el documento completo
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
                    text: "Reporte generado desde la base de datos - Proser Riesgos SAS",
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
            },
            children: docContent,
          },
        ],
      });

      // Generar y descargar
      const blob = await Packer.toBlob(doc);
      const nombreArchivo = `Reporte de Inspección - ${nombreCliente} - ${Date.now()}.docx`;
      saveAs(blob, nombreArchivo);

      // Intentar guardar el archivo en el servidor
      try {
        const formDataFile = new FormData();
        formDataFile.append('archivo', blob, nombreArchivo);
        
        const response = await fetch(`${BASE_URL}/api/historial-formularios/${formularioId}/archivo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formDataFile
        });
        
        if (response.ok) {
          console.log('✅ Archivo regenerado y guardado en el servidor');
          alert(`✅ Documento regenerado y descargado exitosamente.\n\nEl archivo ha sido guardado en el servidor.`);
        } else {
          console.warn('⚠️ El documento se descargó pero no se pudo guardar en el servidor');
          alert(`✅ Documento regenerado y descargado.\n\n⚠️ Nota: El archivo se descargó pero no se pudo guardar automáticamente en el servidor.`);
        }
      } catch (saveError) {
        console.error('Error guardando archivo regenerado:', saveError);
        alert(`✅ Documento regenerado y descargado.\n\n⚠️ Nota: El archivo se descargó pero no se pudo guardar automáticamente en el servidor.`);
      }

    } catch (error) {
      console.error('Error regenerando documento:', error);
      alert(`❌ Error al regenerar el documento: ${error.message}\n\nPor favor, intenta editar el formulario para regenerarlo correctamente.`);
    } finally {
      const formularioId = formulario.id || formulario._id;
      if (formularioId) {
        setRegenerando(prev => ({ ...prev, [formularioId]: false }));
      }
    }
  };

  // Función para eliminar formulario
  const handleEliminarFormulario = async (formulario) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${formulario.titulo}"?\n\nEsta acción no se puede deshacer.`)) {
      try {
        await eliminarFormulario(formulario.id);
        alert(`🗑️ Formulario eliminado: ${formulario.titulo}`);
      } catch (error) {
        alert(`❌ Error al eliminar: ${error.message}`);
      }
    }
  };

  // Estado para el modal de detalles
  const [modalDetalles, setModalDetalles] = useState({ visible: false, formulario: null });

  // Función para ver detalles del formulario
  const handleVerDetalles = async (formulario) => {
    try {
      console.log('🔍 Obteniendo detalles del formulario:', formulario.id);
      
      // Mostrar indicador de carga
      setModalDetalles({ visible: true, formulario: null });
      
      // Obtener formulario completo
      const formularioCompleto = await obtenerFormulario(formulario.id);
      
      console.log('✅ Formulario completo obtenido:', formularioCompleto);
      
      // Validar que el formulario tenga la estructura esperada
      if (!formularioCompleto || typeof formularioCompleto !== 'object') {
        throw new Error('Formulario no válido recibido del servidor');
      }
      
      // Actualizar modal con el formulario completo
      setModalDetalles({ visible: true, formulario: formularioCompleto });
      
    } catch (error) {
      console.error('❌ Error obteniendo detalles:', error);
      
      // Cerrar modal en caso de error
      setModalDetalles({ visible: false, formulario: null });
      
      // Mostrar mensaje de error más específico
      let mensajeError = 'Error al obtener detalles del formulario';
      
      if (error.message.includes('401')) {
        mensajeError = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      } else if (error.message.includes('404')) {
        mensajeError = 'Formulario no encontrado en el servidor.';
      } else if (error.message.includes('500')) {
        mensajeError = 'Error del servidor. Intenta nuevamente más tarde.';
      } else if (error.message.includes('NetworkError')) {
        mensajeError = 'Error de conexión. Verifica tu conexión a internet.';
      } else {
        mensajeError = `Error: ${error.message}`;
      }
      
      alert(`❌ ${mensajeError}`);
    }
  };

  // Función para cerrar modal
  const cerrarModal = () => {
    setModalDetalles({ visible: false, formulario: null });
  };

  // Función para ver formularios de la misma carpeta
  const handleVerCarpeta = async (casoId) => {
    try {
      console.log('📁 Obteniendo formularios de la carpeta:', casoId);
      
      // Navegar a la ruta de ajuste con el casoId
      navigate(`/ajuste?casoId=${casoId}`);
      
    } catch (error) {
      console.error('❌ Error navegando a la carpeta:', error);
      alert('❌ Error al abrir la carpeta del formulario');
    }
  };

  // Función para obtener el color del estado
  const getColorEstado = (estado) => {
    switch (estado) {
      case ESTADOS_FORMULARIO.COMPLETADO: return 'bg-green-100 text-green-800 border-green-200';
      case ESTADOS_FORMULARIO.EN_PROCESO: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ESTADOS_FORMULARIO.PENDIENTE: return 'bg-red-100 text-red-800 border-red-200';
      case ESTADOS_FORMULARIO.BORRADOR: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para obtener el nombre del estado
  const getNombreEstado = (estado) => {
    switch (estado) {
      case ESTADOS_FORMULARIO.COMPLETADO: return 'Completado';
      case ESTADOS_FORMULARIO.EN_PROCESO: return 'En Proceso';
      case ESTADOS_FORMULARIO.PENDIENTE: return 'Pendiente';
      case ESTADOS_FORMULARIO.BORRADOR: return 'Borrador';
      default: return 'Desconocido';
    }
  };

  // Función para manejar búsqueda
  const handleBusqueda = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    
    if (valor.trim()) {
      buscarFormularios(valor);
    } else {
      refrescarHistorial();
    }
  };

  if (cargando && formularios.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historial de formularios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                📚 Historial de Formularios
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Gestiona y accede a todos los formularios generados en el sistema
              </p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={refrescarHistorial}
                disabled={cargando}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 w-full sm:w-auto"
              >
                <FaSync className={`h-4 w-4 mr-2 ${cargando ? 'animate-spin' : ''}`} />
                Refrescar
              </button>
              <Link
                to="/inicio"
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                ← Volver al Inicio
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3 sm:p-4">
            <div className="flex">
              <FaExclamationCircle className="h-4 sm:h-5 w-4 sm:w-5 text-red-400 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-medium text-red-800">
                  Error al cargar el historial
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-red-700">
                  {error}
                </p>
              </div>
              <button
                onClick={limpiarError}
                className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-6 mb-6 sm:mb-8">
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${esAdminOSoporte ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 sm:gap-6`}>
            {/* Filtro por tipo */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Filtrar por Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {tiposFormularios.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.icono} {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por usuario (solo para admin/soporte) */}
            {esAdminOSoporte && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  <FaUser className="inline mr-1" />
                  Filtrar por Usuario
                </label>
                <select
                  value={filtroUsuario}
                  onChange={(e) => {
                    setFiltroUsuario(e.target.value);
                    setPaginaActual(1); // Resetear a página 1 cuando cambia el filtro
                  }}
                  disabled={cargandoUsuarios}
                  className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Todos los usuarios</option>
                  {cargandoUsuarios ? (
                    <option value="" disabled>Cargando usuarios...</option>
                  ) : (
                    listaUsuarios.map((usuario) => {
                      const nombre = usuario.name || usuario.email || usuario.login || 'Usuario sin nombre';
                      const login = usuario.login || '';
                      const displayText = login ? `${nombre} (${login})` : nombre;
                      return (
                        <option key={usuario._id || usuario.id} value={login || usuario.name || ''}>
                          {displayText}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            )}

            {/* Búsqueda */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Buscar Formularios
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={handleBusqueda}
                placeholder="Buscar por título o usuario..."
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Estadísticas y Configuración de Paginación */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Total de Formularios
              </label>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {formulariosFiltrados.length}
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                de {formularios.length} total
              </p>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Por página:
                </label>
                <select
                  value={formulariosPorPagina}
                  onChange={(e) => {
                    setFormulariosPorPagina(Number(e.target.value));
                    setPaginaActual(1);
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Formularios */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              Formularios Encontrados
              {cargando && (
                <span className="ml-2 text-xs sm:text-sm text-gray-500">
                  (Actualizando...)
                </span>
              )}
            </h3>
          </div>

          {formulariosFiltrados.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FaFolder className="mx-auto h-8 sm:h-12 w-8 sm:w-12 text-gray-400" />
              <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">
                No se encontraron formularios
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                {filtroTipo !== 'todos' 
                  ? `No hay formularios del tipo "${tiposFormularios.find(t => t.id === filtroTipo)?.nombre}"`
                  : busqueda 
                    ? `No hay formularios que coincidan con "${busqueda}"`
                    : 'No hay formularios en el sistema'
                }
              </p>
            </div>
          ) : (
            <>
            <div className="divide-y divide-gray-200">
              {formulariosPaginados.map((formulario) => (
                <div key={formulario.id} className="p-3 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className={`p-2 rounded-lg ${tiposFormularios.find(t => t.id === formulario.tipo)?.color} text-white flex-shrink-0`}>
                          {tiposFormularios.find(t => t.id === formulario.tipo)?.icono}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-medium text-gray-900 break-words">
                            {formulario.titulo}
                          </h4>
                          <div className="mt-2 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-6 text-xs sm:text-sm text-gray-500">
                            <div className="flex items-center">
                              <FaUser className="h-3 sm:h-4 w-3 sm:w-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{formulario.nombreUsuario || formulario.usuario}</span>
                            </div>
                            <div className="flex items-center">
                              <FaCalendarAlt className="h-3 sm:h-4 w-3 sm:w-4 mr-1 flex-shrink-0 text-green-500" />
                              <span className="text-xs sm:text-sm text-gray-600">
                                Creado: <span className="font-medium text-gray-800">{formatearFechaUI(formulario.fechaCreacion)}</span>
                                {formulario.fechaCreacion && (() => {
                                  const fechaHora = formatearFechaHoraUI(formulario.fechaCreacion);
                                  const partes = fechaHora.split(', ');
                                  const hora = partes.length > 1 ? partes[1] : (fechaHora.includes(' ') ? fechaHora.split(' ')[1] : '');
                                  return hora ? (
                                    <span className="text-green-600 font-medium ml-1">
                                      {hora}
                                    </span>
                                  ) : null;
                                })()}
                              </span>
                            </div>
                            {formulario.fechaModificacion && (
                              <div className="flex items-center">
                                <FaEdit className="h-3 sm:h-4 w-3 sm:w-4 mr-1 flex-shrink-0 text-blue-500" />
                                <span className="text-xs sm:text-sm text-gray-600">
                                  Modificado: <span className="font-medium text-gray-800">{formatearFechaUI(formulario.fechaModificacion)}</span>
                                  {(() => {
                                    const fechaHora = formatearFechaHoraUI(formulario.fechaModificacion);
                                    const partes = fechaHora.split(', ');
                                    const hora = partes.length > 1 ? partes[1] : (fechaHora.includes(' ') ? fechaHora.split(' ')[1] : '');
                                    return hora ? (
                                      <span className="text-blue-600 font-medium ml-1">
                                        {hora}
                                      </span>
                                    ) : null;
                                  })()}
                                  {(() => {
                                    const fechaMod = new Date(formulario.fechaModificacion);
                                    const ahora = new Date();
                                    const diferenciaHoras = (ahora - fechaMod) / (1000 * 60 * 60);
                                    return diferenciaHoras < 24 ? (
                                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Reciente
                                      </span>
                                    ) : null;
                                  })()}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <FaFileAlt className="h-3 sm:h-4 w-3 sm:w-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{formulario.archivo?.nombre || 'Sin archivo'}</span>
                            </div>
                            {formulario.carpetaCaso && (
                              <div className="flex items-center">
                                <FaFolder className="h-3 sm:h-4 w-3 sm:w-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{formulario.carpetaCaso}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-2">
                      {/* Estado */}
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getColorEstado(formulario.estado)}`}>
                          {getNombreEstado(formulario.estado)}
                        </span>
                        {formulario.estado === 'completado' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Listo
                          </span>
                        )}
                        {formulario.estado === 'en_proceso' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ En Proceso
                          </span>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <button
                          onClick={() => handleVerDetalles(formulario)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
                          title="Ver detalles"
                        >
                          <FaEye className="h-4 sm:h-5 w-4 sm:w-5" />
                        </button>

                        <button
                          onClick={() => handleExportarFormulario(formulario)}
                          disabled={exportando[formulario.id]}
                          className={`p-1.5 sm:p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-all duration-200 ${
                            exportando[formulario.id] ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title={exportando[formulario.id] ? 'Exportando...' : 'Exportar y Descargar'}
                        >
                          {exportando[formulario.id] ? (
                            <div className="animate-spin h-4 sm:h-5 w-4 sm:w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
                          ) : (
                            <FaDownload className="h-4 sm:h-5 w-4 sm:w-5" />
                          )}
                        </button>

                        {/* Botón para regenerar desde BD - Solo para inspeccion-propiedades */}
                        {formulario.tipo === 'inspeccion-propiedades' && (
                          <button
                            onClick={() => handleRegenerarDesdeBD(formulario)}
                            disabled={regenerando[formulario.id] || exportando[formulario.id]}
                            className={`p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-all duration-200 ${
                              (regenerando[formulario.id] || exportando[formulario.id]) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={regenerando[formulario.id] ? 'Regenerando...' : 'Regenerar desde Base de Datos'}
                          >
                            {regenerando[formulario.id] ? (
                              <div className="animate-spin h-4 sm:h-5 w-4 sm:w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <FaRedo className="h-4 sm:h-5 w-4 sm:w-5" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleEditarFormulario(formulario)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
                          title={`Editar formulario ${formulario.tipo}`}
                        >
                          <FaEdit className="h-4 sm:h-5 w-4 sm:w-5" />
                        </button>

                        {formulario.casoId && (
                          <button
                            onClick={() => handleVerCarpeta(formulario.casoId)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-all duration-200"
                            title="Ver formularios de la misma carpeta"
                          >
                            <FaFolder className="h-4 sm:h-5 w-4 sm:w-5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleEliminarFormulario(formulario)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
                          title="Eliminar"
                        >
                          <FaTrash className="h-4 sm:h-5 w-4 sm:w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-gray-700">
                    Mostrando {desde}-{hasta} de {formulariosFiltrados.length} formularios
                  </div>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 justify-center">
                    <button
                      onClick={() => setPaginaActual(1)}
                      disabled={paginaActual === 1}
                      className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Primera página"
                    >
                      {'<<'}
                    </button>
                    <button
                      onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                      disabled={paginaActual === 1}
                      className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Página anterior"
                    >
                      {'<'}
                    </button>
                    
                    {/* Números de página */}
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter(num => {
                        // Mostrar primera, última, actual y páginas cercanas
                        return num === 1 || 
                               num === totalPaginas || 
                               (num >= paginaActual - 2 && num <= paginaActual + 2);
                      })
                      .map((num, index, array) => {
                        // Agregar puntos suspensivos si hay gap
                        const showEllipsis = index > 0 && array[index - 1] !== num - 1;
                        return (
                          <React.Fragment key={num}>
                            {showEllipsis && (
                              <span className="px-2 text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => setPaginaActual(num)}
                              className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                                paginaActual === num
                                  ? 'bg-blue-600 text-white border border-blue-600'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {num}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    
                    <button
                      onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
                      disabled={paginaActual === totalPaginas}
                      className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Página siguiente"
                    >
                      {'>'}
                    </button>
                    <button
                      onClick={() => setPaginaActual(totalPaginas)}
                      disabled={paginaActual === totalPaginas}
                      className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Última página"
                    >
                      {'>>'}
                    </button>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    Página {paginaActual} de {totalPaginas}
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Detalles */}
      {modalDetalles.visible && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 sm:top-20 mx-auto p-3 sm:p-5 border w-11/12 sm:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  📋 Detalles del Formulario
                </h3>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {/* Indicador de carga o contenido del formulario */}
              {!modalDetalles.formulario ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-3 sm:mt-4 text-sm text-gray-600">Cargando detalles del formulario...</p>
                  </div>
                </div>
              ) : (
              <div className="space-y-3 sm:space-y-4">
                {/* Información básica */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Título</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">
                      {modalDetalles.formulario.titulo || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Tipo</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900 uppercase">
                      {modalDetalles.formulario.tipo || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Usuario</label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">
                      {modalDetalles.formulario.usuario || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Estado</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getColorEstado(modalDetalles.formulario.estado)}`}>
                      {getNombreEstado(modalDetalles.formulario.estado)}
                    </span>
                  </div>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                      <FaCalendarAlt className="h-3 w-3 mr-1 text-green-500" />
                      Fecha de Creación
                    </label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">
                      {modalDetalles.formulario.fechaCreacion 
                        ? (() => {
                            const fechaHora = formatearFechaHoraUI(modalDetalles.formulario.fechaCreacion);
                            const partes = fechaHora.split(', ');
                            const hora = partes.length > 1 ? partes[1] : (fechaHora.includes(' ') ? fechaHora.split(' ')[1] : '');
                            return (
                              <span>
                                <span className="font-medium text-gray-800">
                                  {formatearFechaUI(modalDetalles.formulario.fechaCreacion)}
                                </span>
                                {hora && (
                                  <span className="text-green-600 font-medium ml-2">
                                    {hora}
                                  </span>
                                )}
                              </span>
                            );
                          })()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                      <FaEdit className="h-3 w-3 mr-1 text-blue-500" />
                      Última Modificación
                    </label>
                    <p className="mt-1 text-xs sm:text-sm text-gray-900">
                      {modalDetalles.formulario.fechaModificacion 
                        ? (() => {
                            const fechaHora = formatearFechaHoraUI(modalDetalles.formulario.fechaModificacion);
                            const partes = fechaHora.split(', ');
                            const hora = partes.length > 1 ? partes[1] : (fechaHora.includes(' ') ? fechaHora.split(' ')[1] : '');
                            return (
                              <span>
                                <span className="font-medium text-gray-800">
                                  {formatearFechaUI(modalDetalles.formulario.fechaModificacion)}
                                </span>
                                {hora && (
                                  <span className="text-blue-600 font-medium ml-2">
                                    {hora}
                                  </span>
                                )}
                                {(() => {
                                  const fechaMod = new Date(modalDetalles.formulario.fechaModificacion);
                                  const ahora = new Date();
                                  const diferenciaHoras = (ahora - fechaMod) / (1000 * 60 * 60);
                                  return diferenciaHoras < 24 ? (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Reciente
                                    </span>
                                  ) : null;
                                })()}
                              </span>
                            );
                          })()
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>

                {/* Archivo - Con validación robusta */}
                {modalDetalles.formulario.archivo && typeof modalDetalles.formulario.archivo === 'object' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                      <FaFileAlt className="h-3 w-3 mr-1 text-purple-500" />
                      Archivo
                    </label>
                    <div className="mt-1 p-2 sm:p-3 bg-gray-50 rounded-md">
                      <p className="text-xs sm:text-sm text-gray-900 break-words">
                        <strong>Nombre:</strong> {modalDetalles.formulario.archivo.nombre || 'N/A'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        <strong>Tipo:</strong> {modalDetalles.formulario.archivo.tipoMime || 'N/A'}
                      </p>
                      {modalDetalles.formulario.archivo.tamaño && (
                        <p className="text-xs sm:text-sm text-gray-600">
                          <strong>Tamaño:</strong> {(modalDetalles.formulario.archivo.tamaño / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata - Con validación robusta */}
                {modalDetalles.formulario.metadata && typeof modalDetalles.formulario.metadata === 'object' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                      <FaInfoCircle className="h-3 w-3 mr-1 text-indigo-500" />
                      Metadata
                    </label>
                    <div className="mt-1 p-2 sm:p-3 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                        <p><strong>Versión:</strong> {modalDetalles.formulario.metadata.version || 'N/A'}</p>
                        <p><strong>Creado por:</strong> {modalDetalles.formulario.metadata.creadoPor || 'N/A'}</p>
                        <p><strong>Modificado por:</strong> {modalDetalles.formulario.metadata.modificadoPor || 'N/A'}</p>
                        <p><strong>Prioridad:</strong> {modalDetalles.formulario.metadata.prioridad || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Datos del formulario - Con validación robusta */}
                {modalDetalles.formulario.datos && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                      <FaDatabase className="h-3 w-3 mr-1 text-orange-500" />
                      Datos del Formulario
                    </label>
                    <div className="mt-1 p-2 sm:p-3 bg-gray-50 rounded-md max-h-32 sm:max-h-40 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                        {typeof modalDetalles.formulario.datos === 'object' 
                          ? JSON.stringify(modalDetalles.formulario.datos, null, 2)
                          : String(modalDetalles.formulario.datos)
                        }
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              )}
              
              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t">
                <button
                  onClick={cerrarModal}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full sm:w-auto"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    cerrarModal();
                    handleExportarFormulario(modalDetalles.formulario);
                  }}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full sm:w-auto"
                >
                  📤 Exportar
                </button>
                <button
                  onClick={() => {
                    cerrarModal();
                    handleEditarFormulario(modalDetalles.formulario);
                  }}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
