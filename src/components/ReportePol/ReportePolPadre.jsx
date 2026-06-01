import React, { useState, useEffect } from "react";
import DatosGenerales from "./DatosGenerales";
import DatosAsegurado from "./DatosAsegurado";
import TransporteExterior from "./TransporteExterior";
import TransporteInterior from "./TransporteInterior";
import DetalleInspeccion from "./DetalleInspeccion";
import Observaciones from "./Observaciones";
import Recomendaciones from "./Recomendaciones";
import DocumentosAdjuntos from "./DocumentosAdjuntos";
import Firmas from "./Firmas";
import FotosActa from "./FotosActa";
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
  ImageRun, 
  WidthType,
  BorderStyle,
  TableLayoutType,
  VerticalAlign
} from "docx";
import { saveAs } from "file-saver";
import historialService, { TIPOS_FORMULARIOS, ESTADOS_FORMULARIO } from "../../services/historialService";
import BotonesHistorial from '../BotonesHistorial.jsx';
import { useHistorialFormulario } from '../../hooks/useHistorialFormulario.js';

export default function ReportePolPadre() {
  // Estados para el formulario
  const [actaNumero, setActaNumero] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [tipoInspeccion, setTipoInspeccion] = useState("");
  const [fechaLlegada, setFechaLlegada] = useState("");
  const [regional, setRegional] = useState("");
  const [aseguradora, setAseguradora] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [asegurado, setAsegurado] = useState("");
  const [numPiezas, setNumPiezas] = useState("");
  const [tipoEmpaque, setTipoEmpaque] = useState("");
  const [claseMercancia, setClaseMercancia] = useState("");
  const [pedidoNo, setPedidoNo] = useState("");
  const [fechaConstruccion, setFechaConstruccion] = useState("");
  const [origen, setOrigen] = useState("");
  const [tipoTransporte, setTipoTransporte] = useState("");
  const [motonave, setMotonave] = useState("");
  const [registro, setRegistro] = useState("");
  const [docTransporte, setDocTransporte] = useState("");
  const [puertoOrigen, setPuertoOrigen] = useState("");
  const [puertoArribo, setPuertoArribo] = useState("");
  const [destinoFinal, setDestinoFinal] = useState("");
  const [empresaTransportadora, setEmpresaTransportadora] = useState("");
  const [remesaNo, setRemesaNo] = useState("");
  const [conductor, setConductor] = useState("");
  const [cedula, setCedula] = useState("");
  const [placas, setPlacas] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [origenInterior, setOrigenInterior] = useState("");
  const [destino, setDestino] = useState("");
  const [celular, setCelular] = useState("");
  const [cartaPorte, setCartaPorte] = useState("");
  const [lugarReconocimiento, setLugarReconocimiento] = useState("");
  const [pesoTara, setPesoTara] = useState("");
  const [pesoNeto, setPesoNeto] = useState("");
  const [pesoBruto, setPesoBruto] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [facturaComercial, setFacturaComercial] = useState("");
  const [listaEmpaque, setListaEmpaque] = useState("");
  const [docTransporteAdjunto, setDocTransporteAdjunto] = useState("");
  const [firmanteAsegurado, setFirmanteAsegurado] = useState("");
  const [firmanteConductor, setFirmanteConductor] = useState("");
  const [firmanteInspector, setFirmanteInspector] = useState("");
  const [codigoInspector, setCodigoInspector] = useState("");
  const [fotosActa, setFotosActa] = useState([]);

  // Hook para manejar el historial
  const { guardando, exportando, guardarEnHistorial, exportarYGuardar } = useHistorialFormulario(TIPOS_FORMULARIOS.POL);

  useEffect(() => {
    // Solo inicializar si está vacío
    if (!hora) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setHora(`${hh}:${mm}`);
    }
    
    // Generar número de acta automático
    if (!actaNumero) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setActaNumero(`BV${year}${month}${day}${random}`);
    }
  }, []);

  // Función para convertir base64 a ArrayBuffer
  function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64.split(",")[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const handleGuardarEnHistorial = async () => {
    const datos = {
      numeroActa: actaNumero,
      ciudad,
      fechaInspeccion: fecha,
      horaInspeccion: hora,
      tipoInspeccion,
      fechaLlegada,
      regional,
      aseguradora,
      sucursal,
      asegurado,
      numPiezas,
      tipoEmpaque,
      claseMercancia,
      pedidoNo,
      fechaConstruccion,
      origen,
      tipoTransporte,
      motonave,
      registro,
      docTransporte,
      puertoOrigen,
      puertoArribo,
      destinoFinal,
      empresaTransportadora,
      remesaNo,
      conductor,
      cedula,
      placas,
      modelo,
      marca,
      origenInterior,
      destino,
      celular,
      cartaPorte,
      lugarReconocimiento,
      pesoTara,
      pesoNeto,
      pesoBruto,
      observaciones,
      recomendaciones,
      facturaComercial,
      listaEmpaque,
      docTransporteAdjunto,
      firmanteAsegurado,
      firmanteConductor,
      firmanteInspector,
      codigoInspector,
      fotosActa: fotosActa.map(f => ({ src: f.src, descripcion: f.descripcion }))
    };

    const resultado = await guardarEnHistorial(datos, 'en_proceso');
    alert(resultado.message);
  };

  const generarWord = async () => {
    const datos = {
      numeroActa: actaNumero,
      ciudad,
      fechaInspeccion: fecha,
      horaInspeccion: hora,
      tipoInspeccion,
      fechaLlegada,
      regional,
      aseguradora,
      sucursal,
      asegurado,
      numPiezas,
      tipoEmpaque,
      claseMercancia,
      pedidoNo,
      fechaConstruccion,
      origen,
      tipoTransporte,
      motonave,
      registro,
      docTransporte,
      puertoOrigen,
      puertoArribo,
      destinoFinal,
      empresaTransportadora,
      remesaNo,
      conductor,
      cedula,
      placas,
      modelo,
      marca,
      origenInterior,
      destino,
      celular,
      cartaPorte,
      lugarReconocimiento,
      pesoTara,
      pesoNeto,
      pesoBruto,
      observaciones,
      recomendaciones,
      facturaComercial,
      listaEmpaque,
      docTransporteAdjunto,
      firmanteAsegurado,
      firmanteConductor,
      firmanteInspector,
      codigoInspector,
      fotosActa: fotosActa.map(f => ({ src: f.src, descripcion: f.descripcion }))
    };

    const resultado = await exportarYGuardar(datos, async () => {
      // Función de exportación
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,    // 1 pulgada
                  right: 1440,  // 1 pulgada
                  bottom: 1440, // 1 pulgada
                  left: 1440,   // 1 pulgada
                },
              },
            },
            children: [
              // HEADER CON LOGO Y VERSIÓN
              new Paragraph({
                children: [
                  new TextRun({ text: "POL Versión 2.0", size: 20, bold: true }),
                  new TextRun({ text: "    ", size: 20 }),
                  new TextRun({ text: "https://www.proserpuertos.com.co/pol/index.php?", size: 16, color: "0000FF" }),
                ],
                alignment: AlignmentType.LEFT,
              }),
              
              new Paragraph({ text: "", spacing: { after: 200 } }),
              
              // TÍTULO PRINCIPAL
              new Paragraph({
                text: "CONTROL PORTUARIO, RISK MANAGEMENT Y AJUSTES DE SINIESTROS",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
              
              // LOGO Y NÚMERO DE ACTA
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            text: "PROSER PUERTOS AJUSTADORES DE SEGUROS",
                            alignment: AlignmentType.LEFT,
                            spacing: { after: 200 },
                          }),
                        ],
                        width: { size: 70, type: WidthType.PERCENTAGE },
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            text: "ACTA/REPORT",
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 100 },
                          }),
                          new Paragraph({
                            text: `No. ${actaNumero}`,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 },
                          }),
                        ],
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "", spacing: { after: 400 } }),
              
              // DATOS GENERALES - Estructura de tabla exacta
              new Paragraph({
                text: "DATOS GENERALES",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Ciudad / City: ${ciudad}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Fecha / Date: ${fecha}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Hora / Hour: ${hora}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Regional: ${regional}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Tipo Inspección / Type Survey: ${tipoInspeccion}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Fecha de Llegada (Arrival Date): ${fechaLlegada}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "", spacing: { after: 300 } }),
              
              // DATOS DEL ASEGURADO - Estructura exacta
              new Paragraph({
                text: "DATOS DEL ASEGURADO",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Aseguradora / Insurer: ${aseguradora}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Sucursal / Branch: ${sucursal}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Asegurado / Insured: ${asegurado}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `N. de Piezas / No. of Packages: ${numPiezas}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Tipo de Empaque / Type of Package: ${tipoEmpaque}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Clase de Mercancía / Type of commodities: ${claseMercancia}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Pedido No. / Order No.: ${pedidoNo}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Fecha de Construcción / Construction Date: ${fechaConstruccion}` })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "", spacing: { after: 300 } }),
              
              // TRANSPORTE EXTERIOR - Estructura exacta
              new Paragraph({
                text: "TRANSPORTE EXTERIOR",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Origen / Origin: ${origen}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Tipo de Transporte / Type of Transport: ${tipoTransporte}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Motonave / Vessel: ${motonave}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Registro / Register: ${registro}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Doc. de Transporte / Doc. of Transport: ${docTransporte}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Puerto Origen / Port of Loading: ${puertoOrigen}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Puerto Arribo / Port of Discharge: ${puertoArribo}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Destino Final / Final Place: ${destinoFinal}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "", spacing: { after: 300 } }),
              
              // TRANSPORTE INTERIOR - Estructura exacta
              new Paragraph({
                text: "TRANSPORTE INTERIOR",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Empresa Transportadora / Carrier: ${empresaTransportadora}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Remesa No. / Remission No.: ${remesaNo}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Conductor / Driver: ${conductor}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Cédula / Identify: ${cedula}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Placas / Plates: ${placas}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Modelo / Model: ${modelo}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Marca / Marks: ${marca}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Origen / Origin: ${origenInterior}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Destino / Arrival Place: ${destino}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Celular / Movil Phone: ${celular}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Carta de Porte / Carry Letter: ${cartaPorte}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: "" })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "", spacing: { after: 300 } }),
              
              // DETALLE DE INSPECCIÓN - Estructura exacta
              new Paragraph({
                text: "DETALLE DE INSPECCIÓN",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Lugar de Reconocimiento / Place of Survey: ${lugarReconocimiento}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Peso Tara / Tare Weight: ${pesoTara}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Peso Neto / Net Weight: ${pesoNeto}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Peso Bruto / Gross Weight: ${pesoBruto}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "", spacing: { after: 300 } }),
              
              // OBSERVACIONES - Estructura exacta
              new Paragraph({
                text: "OBSERVACIONES / REMARKS",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              new Paragraph({
                text: "(En caso de novedad relacionar valor de la factura y valor de la pérdida / In any case novelties, statement the invoice value and the damage value)",
                italic: true,
                spacing: { after: 200 },
              }),
              
              new Paragraph({
                text: observaciones || "",
                spacing: { after: 300 },
              }),
              
              // RECOMENDACIONES - Estructura exacta
              new Paragraph({
                text: "RECOMENDACIONES / RECOMMENDATIONS",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              new Paragraph({
                text: recomendaciones || "",
                spacing: { after: 300 },
              }),
              
              // DOCUMENTOS ADJUNTOS - Estructura exacta
              new Paragraph({
                text: "DOCUMENTOS ADJUNTOS / ATTACHED DOCUMENTS",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Factura Comercial / Commercial Invoice: ${facturaComercial}` })],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Lista de Empaque / Packing List: ${listaEmpaque}` })],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Doc de Transporte / Remission: ${docTransporteAdjunto}` })],
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                ],
              }),
              
              new Paragraph({ text: "", spacing: { after: 300 } }),
              
              // FIRMAS - Estructura exacta
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: `Asegurado / Insured: ${firmanteAsegurado}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Conductor / Driver: ${firmanteConductor}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Inspector / Surveyor: ${firmanteInspector}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: `Código / Code: ${codigoInspector}` })],
                        width: { size: 25, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                      }),
                    ],
                  }),
                ],
              }),
              
              // FOTOS DEL ACTA - Estructura exacta
              new Paragraph({ text: "", spacing: { after: 300 } }),
              
              new Paragraph({
                text: "FOTOS DEL ACTA",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: { after: 200 },
              }),
              
              ...(
                fotosActa.length > 0
                  ? [
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: Array.from({ length: Math.ceil(fotosActa.length / 2) }, (_, rowIdx) =>
                          new TableRow({
                            children: [0, 1].map(colIdx => {
                              const idx = rowIdx * 2 + colIdx;
                              const foto = fotosActa[idx];
                              
                              if (foto) {
                                try {
                                  const imageBuffer = base64ToArrayBuffer(foto.src);
                                  return new TableCell({
                                    children: [
                                      new Paragraph({
                                        children: [
                                          new ImageRun({
                                            data: imageBuffer,
                                            transformation: {
                                              width: 200,
                                              height: 150,
                                            },
                                          }),
                                        ],
                                        alignment: AlignmentType.CENTER,
                                      }),
                                      new Paragraph({
                                        text: foto.descripcion || "Sin descripción",
                                        alignment: AlignmentType.CENTER,
                                        spacing: { after: 200 },
                                      }),
                                    ],
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                                  });
                                } catch (error) {
                                  console.error("Error procesando imagen:", error);
                                  return new TableCell({
                                    children: [new Paragraph({ text: "Error en imagen" })],
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                                  });
                                }
                              } else {
                                return new TableCell({
                                  children: [new Paragraph({ text: "" })],
                                  width: { size: 50, type: WidthType.PERCENTAGE },
                                  borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                                });
                              }
                            }),
                          })
                        ),
                      })
                    ]
                  : [new Paragraph({ text: "No hay fotos adjuntas.", spacing: { after: 200 } })]
              ),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Reporte_POL_${actaNumero || fecha || ""}.docx`);
    });

    alert(resultado.message);
  };

  return (
    <div className="bg-white p-6 max-w-6xl mx-auto rounded shadow">
      {/* Header del documento */}
      <div className="text-center mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="text-left">
            <h2 className="text-xl font-bold text-blue-600">POL Versión 2.0</h2>
          </div>
          <div className="text-right">
            <a 
              href="https://www.proserpuertos.com.co/pol/index.php?" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              https://www.proserpuertos.com.co/pol/index.php?
            </a>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          CONTROL PORTUARIO, RISK MANAGEMENT Y AJUSTES DE SINIESTROS
        </h1>
        
        <div className="flex justify-between items-start">
          <div className="text-left">
            <h3 className="text-xl font-semibold text-gray-700">
              PROSER PUERTOS AJUSTADORES DE SEGUROS
            </h3>
          </div>
          <div className="border-2 border-gray-400 p-4 rounded">
            <h3 className="text-lg font-bold text-center mb-2">ACTA/REPORT</h3>
            <p className="text-center font-semibold">No. {actaNumero}</p>
          </div>
        </div>
      </div>

      {/* Formularios */}
      <DatosGenerales
        ciudad={ciudad} setCiudad={setCiudad}
        fecha={fecha} setFecha={setFecha}
        hora={hora} setHora={setHora}
        tipoInspeccion={tipoInspeccion} setTipoInspeccion={setTipoInspeccion}
        fechaLlegada={fechaLlegada} setFechaLlegada={setFechaLlegada}
        regional={regional} setRegional={setRegional}
      />
      
      <DatosAsegurado
        aseguradora={aseguradora} setAseguradora={setAseguradora}
        sucursal={sucursal} setSucursal={setSucursal}
        asegurado={asegurado} setAsegurado={setAsegurado}
        numPiezas={numPiezas} setNumPiezas={setNumPiezas}
        tipoEmpaque={tipoEmpaque} setTipoEmpaque={setTipoEmpaque}
        claseMercancia={claseMercancia} setClaseMercancia={setClaseMercancia}
        pedidoNo={pedidoNo} setPedidoNo={setPedidoNo}
        fechaConstruccion={fechaConstruccion} setFechaConstruccion={setFechaConstruccion}
      />
      
      <TransporteExterior
        origen={origen} setOrigen={setOrigen}
        tipoTransporte={tipoTransporte} setTipoTransporte={setTipoTransporte}
        motonave={motonave} setMotonave={setMotonave}
        registro={registro} setRegistro={setRegistro}
        docTransporte={docTransporte} setDocTransporte={setDocTransporte}
        puertoOrigen={puertoOrigen} setPuertoOrigen={setPuertoOrigen}
        puertoArribo={puertoArribo} setPuertoArribo={setPuertoArribo}
        destinoFinal={destinoFinal} setDestinoFinal={setDestinoFinal}
      />
      
      <TransporteInterior
        empresaTransportadora={empresaTransportadora} setEmpresaTransportadora={setEmpresaTransportadora}
        remesaNo={remesaNo} setRemesaNo={setRemesaNo}
        conductor={conductor} setConductor={setConductor}
        cedula={cedula} setCedula={setCedula}
        placas={placas} setPlacas={setPlacas}
        modelo={modelo} setModelo={setModelo}
        marca={marca} setMarca={setMarca}
        origenInterior={origenInterior} setOrigenInterior={setOrigenInterior}
        destino={destino} setDestino={setDestino}
        celular={celular} setCelular={setCelular}
        cartaPorte={cartaPorte} setCartaPorte={setCartaPorte}
      />
      
      <DetalleInspeccion
        lugarReconocimiento={lugarReconocimiento} setLugarReconocimiento={setLugarReconocimiento}
        pesoTara={pesoTara} setPesoTara={setPesoTara}
        pesoNeto={pesoNeto} setPesoNeto={setPesoNeto}
        pesoBruto={pesoBruto} setPesoBruto={setPesoBruto}
      />
      
      <Observaciones
        observaciones={observaciones}
        setObservaciones={setObservaciones}
      />
      
      <Recomendaciones
        recomendaciones={recomendaciones}
        setRecomendaciones={setRecomendaciones}
      />
      
      <DocumentosAdjuntos
        facturaComercial={facturaComercial} setFacturaComercial={setFacturaComercial}
        listaEmpaque={listaEmpaque} setListaEmpaque={setListaEmpaque}
        docTransporteAdjunto={docTransporteAdjunto} setDocTransporteAdjunto={setDocTransporteAdjunto}
      />
      
      <Firmas
        firmanteAsegurado={firmanteAsegurado} setFirmanteAsegurado={setFirmanteAsegurado}
        firmanteConductor={firmanteConductor} setFirmanteConductor={setFirmanteConductor}
        firmanteInspector={firmanteInspector} setFirmanteInspector={setFirmanteInspector}
        codigoInspector={codigoInspector} setCodigoInspector={setCodigoInspector}
      />
      
      <FotosActa
        fotosActa={fotosActa}
        setFotosActa={setFotosActa}
      />
      
      {/* Botones de acción */}
      <BotonesHistorial
        onGuardarEnHistorial={handleGuardarEnHistorial}
        onExportar={generarWord}
        tipoFormulario={TIPOS_FORMULARIOS.POL}
        tituloFormulario="POL"
        deshabilitado={!actaNumero || !ciudad || !fecha} // Deshabilitar si faltan campos básicos
        guardando={guardando}
        exportando={exportando}
      />
    </div>
  );
} 