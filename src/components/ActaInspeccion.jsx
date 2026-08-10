import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { FaFileAlt, FaUser, FaMapMarkerAlt, FaCalendarAlt, FaIdCard, FaExclamationTriangle, FaFileSignature, FaPlus, FaTrash } from 'react-icons/fa';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  AlignmentType, 
  HeadingLevel,
  WidthType,
  BorderStyle,
  ImageRun,
  Media
} from "docx";
import { saveAs } from "file-saver";
import Logo from '../img/Logo.png';
import { useHistorialFormulario } from '../hooks/useHistorialFormulario.js';
import { TIPOS_FORMULARIOS } from '../services/historialService.js';
import BotonesHistorial from './BotonesHistorial.jsx';

export default function ActaInspeccion() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const location = useLocation();
  const datosPrevios = location.state || {};

  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
//un nuevo color para el border
  // Estados para datos personales
  const [fechaInspeccion, setFechaInspeccion] = useState(new Date().toISOString().split("T")[0]);
  const [ciudad, setCiudad] = useState(datosPrevios.ciudad || datosPrevios.municipio || "");
  const [direccion, setDireccion] = useState(datosPrevios.direccion || datosPrevios.direccionRiesgo || "");
  const [tipoRiesgo, setTipoRiesgo] = useState(datosPrevios.tipoRiesgo || "");
  const [asegurado, setAsegurado] = useState(datosPrevios.asegurado || datosPrevios.nombreCliente || datosPrevios.nombreEmpresa || "");
  const [identificacion, setIdentificacion] = useState(datosPrevios.identificacion || "");
  const [numeroSiniestro, setNumeroSiniestro] = useState(datosPrevios.numeroSiniestro || "");
  const [fechaSiniestro, setFechaSiniestro] = useState(datosPrevios.fechaSiniestro || "");

  // Estados para descripciones
  const [descripcionRiesgo, setDescripcionRiesgo] = useState("");
  const [descripcionSiniestro, setDescripcionSiniestro] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Estados para firmas
  const [firmas, setFirmas] = useState([
    { nombre: '', cargo: '', cc: '', firma: null }
  ]);

  const [cargando, setCargando] = useState(false);
  const { guardando, guardarEnHistorial } = useHistorialFormulario(TIPOS_FORMULARIOS.ACTA_INSPECCION);

  // Agregar nueva fila de firma
  const agregarFirma = () => {
    setFirmas([...firmas, { nombre: '', cargo: '', cc: '', firma: null }]);
  };

  // Eliminar firma
  const eliminarFirma = (index) => {
    setFirmas(firmas.filter((_, i) => i !== index));
  };

  // Actualizar firma
  const actualizarFirma = (index, campo, valor) => {
    const nuevasFirmas = [...firmas];
    nuevasFirmas[index][campo] = valor;
    setFirmas(nuevasFirmas);
  };

  // Manejar carga de imagen de firma
  const handleFirmaChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        actualizarFirma(index, 'firma', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para generar Word
  const generarWord = async () => {
    try {
      setCargando(true);
      
      // Convertir logo a buffer
      let logoBuffer = null;
      try {
        const logoResponse = await fetch(Logo);
        const logoBlob = await logoResponse.blob();
        logoBuffer = await logoBlob.arrayBuffer();
      } catch (error) {
        console.warn('No se pudo cargar el logo:', error);
      }

      const docContent = [];

      // Función helper para crear párrafos
      const linea = (texto, bold = false) => new Paragraph({
        children: [new TextRun({ text: texto || "", bold, font: "Arial", size: 24 })],
        spacing: { after: 200 }
      });

      const seccion = (titulo) => new Paragraph({
        children: [new TextRun({ text: titulo, bold: true, font: "Arial", size: 28 })],
        spacing: { before: 400, after: 300 }
      });

      const celdaTexto = (texto) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: texto || "" })] })]
      });

      const encabezadoTabla = (texto) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: texto, bold: true })] })],
        shading: { fill: "D9D9D9" }
      });

      // Portada con logo y título
      docContent.push(
        new Paragraph({ children: [], pageBreakBefore: false }),
        new Paragraph({
          children: logoBuffer ? [new ImageRun({ data: logoBuffer, transformation: { width: 150, height: 75 } })] : [],
          alignment: AlignmentType.LEFT,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "ACTA DE INSPECCIÓN", bold: true, font: "Arial", size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        })
      );

      // Tabla de datos personales (con bordes invisibles)
      docContent.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0 },
            bottom: { style: BorderStyle.NONE, size: 0 },
            left: { style: BorderStyle.NONE, size: 0 },
            right: { style: BorderStyle.NONE, size: 0 },
            insideHorizontal: { style: BorderStyle.NONE, size: 0 },
            insideVertical: { style: BorderStyle.NONE, size: 0 }
          },
          rows: [
            new TableRow({
              children: [
                encabezadoTabla("FECHA INSPECCIÓN"),
                celdaTexto(fechaInspeccion || ""),
                encabezadoTabla("CIUDAD"),
                celdaTexto(ciudad || "")
              ]
            }),
            new TableRow({
              children: [
                encabezadoTabla("DIRECCIÓN"),
                celdaTexto(direccion || ""),
                encabezadoTabla("TIPO DE RIESGO"),
                celdaTexto(tipoRiesgo || "")
              ]
            }),
            new TableRow({
              children: [
                encabezadoTabla("ASEGURADO"),
                celdaTexto(asegurado || ""),
                encabezadoTabla("IDENTIFICACIÓN"),
                celdaTexto(identificacion || "")
              ]
            }),
            new TableRow({
              children: [
                encabezadoTabla("No. SINIESTRO"),
                celdaTexto(numeroSiniestro || ""),
                encabezadoTabla("FECHA SINIESTRO"),
                celdaTexto(fechaSiniestro || "")
              ]
            })
          ]
        }),
        new Paragraph({ text: "", spacing: { after: 400 } })
      );

      // Descripción del Riesgo
      docContent.push(
        seccion("DESCRIPCIÓN DEL RIESGO"),
        linea(descripcionRiesgo || "No se ingresó información."),
        new Paragraph({ text: "", spacing: { after: 400 } })
      );

      // Descripción del Siniestro
      docContent.push(
        seccion("DESCRIPCIÓN DEL SINIESTRO"),
        linea(descripcionSiniestro || "No se ingresó información."),
        new Paragraph({ text: "", spacing: { after: 400 } })
      );

      // Observaciones
      docContent.push(
        seccion("OBSERVACIONES"),
        linea(observaciones || "No se ingresó información."),
        new Paragraph({ text: "", spacing: { after: 400 } })
      );

      // Tabla de Firmas
      if (firmas.length > 0) {
        docContent.push(
          seccion("FIRMAS"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 }
            },
            rows: [
              new TableRow({
                children: [
                  encabezadoTabla("NOMBRE"),
                  encabezadoTabla("CARGO"),
                  encabezadoTabla("CC"),
                  encabezadoTabla("FIRMA")
                ]
              }),
              ...firmas.map((firma) => {
                const children = [
                  celdaTexto(firma.nombre || ""),
                  celdaTexto(firma.cargo || ""),
                  celdaTexto(firma.cc || "")
                ];

                // Agregar imagen de firma si existe
                if (firma.firma) {
                  try {
                    const base64Data = firma.firma.split(',')[1] || firma.firma;
                    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
                    children.push(
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: imageBuffer,
                                transformation: { width: 100, height: 50 }
                              })
                            ],
                            alignment: AlignmentType.CENTER
                          })
                        ]
                      })
                    );
                  } catch (error) {
                    console.error('Error procesando firma:', error);
                    children.push(celdaTexto(""));
                  }
                } else {
                  children.push(celdaTexto(""));
                }

                return new TableRow({ children });
              })
            ]
          })
        );
      }

      // Crear documento
      const doc = new Document({
        sections: [{
          children: docContent
        }]
      });

      // Generar y descargar
      const blob = await Packer.toBlob(doc);
      const nombreArchivo = `ACTA_DE_INSPECCION_${fechaInspeccion || new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, nombreArchivo);
      
} catch (error) {
      console.error('❌ Error al generar acta:', error);
      alert(t('acta.ui.generateError'));
    } finally {
      setCargando(false);
    }
  };

  // Función para guardar en historial
  const handleGuardar = async () => {
    const datos = {
      titulo: `Acta de Inspección - ${asegurado || 'Cliente'} - ${fechaInspeccion || 'Fecha'}`,
      usuario: localStorage.getItem('nombre') || 'Usuario',
      userId: localStorage.getItem('login') || 'ID',
      estado: 'en_proceso',
      datos: {
        fechaInspeccion,
        ciudad,
        direccion,
        tipoRiesgo,
        asegurado,
        identificacion,
        numeroSiniestro,
        fechaSiniestro,
        descripcionRiesgo,
        descripcionSiniestro,
        observaciones,
        firmas
      }
    };

    const resultado = await guardarEnHistorial(datos, 'en_proceso');
    alert(resultado.message);
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{ backgroundColor: theme === 'dark' ? '#1A1A1A' : '#F5F5F7' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Encabezado con Logo */}
        <div 
          className="mb-8 p-6 rounded-xl shadow-lg"
          style={{
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)'
              : 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)',
            border: `2px solid ${theme === 'dark' ? '#DC2626' : '#DC2626'}`,
            borderLeftWidth: '6px'
          }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img 
                src={Logo} 
                alt={t('acta.ui.logoAlt')} 
                className="h-20 sm:h-24 object-contain"
              />
            </div>
            
            {/* Título */}
            <div className="flex-1 text-center md:text-right">
              <h1 
                className="text-3xl sm:text-4xl font-bold mb-2"
                style={{ 
                  color: theme === 'dark' ? '#FFFFFF' : '#DC2626',
                  textShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {t('acta.ui.title')}
              </h1>
              <p 
                className="text-sm sm:text-base"
                style={{ color: textSecondary }}
              >
                {t('acta.ui.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de Datos Personales */}
        <div 
          className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{
            backgroundColor: cardBg,
            border: `2px solid ${borderColor}`,
            borderLeftWidth: '5px',
            borderLeftColor: theme === 'dark' ? '#3B82F6' : '#2563EB'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)' }}
            >
              <FaUser className="text-xl" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
            </div>
            <h2 
              className="text-2xl font-bold"
              style={{ color: textPrimary }}
            >
              {t('acta.ui.personalData')}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                <FaCalendarAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
                {t('acta.ui.inspectionDate')}
              </label>
              <input
                type="date"
                value={fechaInspeccion}
                onChange={(e) => setFechaInspeccion(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  focusRingColor: theme === 'dark' ? '#3B82F6' : '#2563EB'
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                <FaMapMarkerAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
                {t('acta.ui.city')}
              </label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder={t('acta.ui.cityPlaceholder')}
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                <FaMapMarkerAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
                {t('acta.ui.address')}
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder={t('acta.ui.addressPlaceholder')}
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                <FaExclamationTriangle className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
                {t('acta.ui.riskType')}
              </label>
              <input
                type="text"
                value={tipoRiesgo}
                onChange={(e) => setTipoRiesgo(e.target.value)}
                placeholder={t('acta.ui.riskTypePlaceholder')}
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                <FaUser className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
                {t('acta.ui.insured')}
              </label>
              <input
                type="text"
                value={asegurado}
                onChange={(e) => setAsegurado(e.target.value)}
                placeholder={t('acta.ui.insuredPlaceholder')}
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                <FaIdCard className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
                {t('acta.ui.identification')}
              </label>
              <input
                type="text"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                placeholder={t('acta.ui.identificationPlaceholder')}
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                <FaFileAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
                {t('acta.ui.claimNumber')}
              </label>
              <input
                type="text"
                value={numeroSiniestro}
                onChange={(e) => setNumeroSiniestro(e.target.value)}
                placeholder={t('acta.ui.claimNumberPlaceholder')}
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                <FaCalendarAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
                {t('acta.ui.claimDate')}
              </label>
              <input
                type="date"
                value={fechaSiniestro}
                onChange={(e) => setFechaSiniestro(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor
                }}
              />
            </div>
          </div>
        </div>

        {/* Descripción del Riesgo */}
        <div 
          className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{
            backgroundColor: cardBg,
            border: `2px solid ${borderColor}`,
            borderLeftWidth: '5px',
            borderLeftColor: theme === 'dark' ? '#10B981' : '#059669'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.1)' }}
            >
              <FaExclamationTriangle className="text-xl" style={{ color: theme === 'dark' ? '#34D399' : '#059669' }} />
            </div>
            <h2 
              className="text-2xl font-bold"
              style={{ color: textPrimary }}
            >
              {t('acta.ui.riskDescription')}
            </h2>
          </div>
          <textarea
            value={descripcionRiesgo}
            onChange={(e) => setDescripcionRiesgo(e.target.value)}
            placeholder={t('acta.ui.riskDescriptionPlaceholder')}
            rows={8}
            className="w-full px-4 py-3 rounded-lg border-2 resize-vertical transition-all duration-200 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor
            }}
          />
        </div>

        {/* Descripción del Siniestro */}
        <div 
          className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{
            backgroundColor: cardBg,
            border: `2px solid ${borderColor}`,
            borderLeftWidth: '5px',
            borderLeftColor: theme === 'dark' ? '#F59E0B' : '#D97706'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.1)' }}
            >
              <FaExclamationTriangle className="text-xl" style={{ color: theme === 'dark' ? '#FBBF24' : '#D97706' }} />
            </div>
            <h2 
              className="text-2xl font-bold"
              style={{ color: textPrimary }}
            >
              {t('acta.ui.claimDescription')}
            </h2>
          </div>
          <textarea
            value={descripcionSiniestro}
            onChange={(e) => setDescripcionSiniestro(e.target.value)}
            placeholder={t('acta.ui.claimDescriptionPlaceholder')}
            rows={8}
            className="w-full px-4 py-3 rounded-lg border-2 resize-vertical transition-all duration-200 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor
            }}
          />
        </div>

        {/* Observaciones */}
        <div 
          className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{
            backgroundColor: cardBg,
            border: `2px solid ${borderColor}`,
            borderLeftWidth: '5px',
            borderLeftColor: theme === 'dark' ? '#8B5CF6' : '#7C3AED'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(124, 58, 237, 0.1)' }}
            >
              <FaFileAlt className="text-xl" style={{ color: theme === 'dark' ? '#A78BFA' : '#7C3AED' }} />
            </div>
            <h2 
              className="text-2xl font-bold"
              style={{ color: textPrimary }}
            >
              {t('acta.ui.observations')}
            </h2>
          </div>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder={t('acta.ui.observationsPlaceholder')}
            rows={8}
            className="w-full px-4 py-3 rounded-lg border-2 resize-vertical transition-all duration-200 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor
            }}
          />
        </div>

        {/* Firmas */}
        <div 
          className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
          style={{
            backgroundColor: cardBg,
            border: `2px solid ${borderColor}`,
            borderLeftWidth: '5px',
            borderLeftColor: theme === 'dark' ? '#EC4899' : '#DB2777'
          }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: theme === 'dark' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(219, 39, 119, 0.1)' }}
              >
                <FaFileSignature className="text-xl" style={{ color: theme === 'dark' ? '#F472B6' : '#DB2777' }} />
              </div>
              <h2 
                className="text-2xl font-bold"
                style={{ color: textPrimary }}
              >
                {t('acta.ui.signatures')}
              </h2>
            </div>
            <button
              onClick={agregarFirma}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md"
              style={{
                backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
                color: '#FFFFFF'
              }}
            >
              <FaPlus /> {t('acta.ui.addSignature')}
            </button>
          </div>

          {firmas.map((firma, index) => (
            <div 
              key={index} 
              className="mb-5 p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-md"
              style={{ 
                borderColor: borderColor,
                backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg" style={{ color: textPrimary }}>
                  {t('acta.ui.signatureN', { n: index + 1 })}
                </h3>
                {firmas.length > 1 && (
                  <button
                    onClick={() => eliminarFirma(index)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444',
                      color: '#FFFFFF'
                    }}
                  >
                    <FaTrash /> {t('acta.ui.remove')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                    {t('acta.ui.nameRequired')}
                  </label>
                  <input
                    type="text"
                    value={firma.nombre}
                    onChange={(e) => actualizarFirma(index, 'nombre', e.target.value)}
                    placeholder={t('acta.ui.namePlaceholder')}
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                    {t('acta.ui.positionRequired')}
                  </label>
                  <input
                    type="text"
                    value={firma.cargo}
                    onChange={(e) => actualizarFirma(index, 'cargo', e.target.value)}
                    placeholder={t('acta.ui.positionPlaceholder')}
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                    {t('acta.ui.ccRequired')}
                  </label>
                  <input
                    type="text"
                    value={firma.cc}
                    onChange={(e) => actualizarFirma(index, 'cc', e.target.value)}
                    placeholder={t('acta.ui.ccPlaceholder')}
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                    {t('acta.ui.signatureImage')}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFirmaChange(index, e)}
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: inputBg,
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                  />
                  {firma.firma && (
                    <div className="mt-3 p-3 rounded-lg border-2" style={{ borderColor: borderColor, backgroundColor: inputBg }}>
                      <img 
                        src={firma.firma} 
                        alt={t('acta.ui.signatureAlt')} 
                        className="max-w-xs h-24 object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 mt-8">
          <button
            onClick={handleGuardar}
            disabled={guardando || cargando}
            className="px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
              color: '#FFFFFF'
            }}
          >
            {guardando ? t('acta.ui.saving') : t('acta.ui.saveToHistory')}
          </button>

          <button
            onClick={generarWord}
            disabled={cargando || guardando}
            className="px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-lg hover:shadow-xl"
            style={{
              backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444',
              color: '#FFFFFF'
            }}
          >
            {cargando ? t('acta.ui.generating') : t('acta.ui.generateWord')}
          </button>
        </div>
      </div>
    </div>
  );
}

