// src/components/AgregarCaso.jsx
import React, { useState,useEffect, useMemo } from 'react';
import { crearCasoComplex } from '../services/complexService';




const AgregarCaso = () => {
const [formData, setFormData] = useState({
  aseguradora: '',
  numeroPoliza: '',
  descripcionSiniestro: '',
  estadoSiniestro: '',
  fechaAsignacion: '',
  fechaSiniestro: '',
  valorReserva: '',
  valorReclamo: '',
  montoIndemnizar: '',
  estado: '',
});


  const [numeroAjusteGenerado, setNumeroAjusteGenerado] = useState('');
  const [tabActiva, setTabActiva] = useState("valores");
  const [seguimientos, setSeguimientos] = useState([]);
  const [observacionesClientes, setObservacionesClientes] = useState([]);
  const [nuevaObservacion, setNuevaObservacion] = useState({
    fecha: '',
    mensaje: ''
  });

  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const observacionesPorPagina = 5;




const handleNuevaObservacionChange = (e) => {
  const { name, value } = e.target;
  setNuevaObservacion(prev => ({ ...prev, [name]: value }));
};

const agregarObservacionCliente = () => {
  if (!nuevaObservacion.fecha || !nuevaObservacion.mensaje.trim()) {
    alert("Por favor completa la fecha y el mensaje.");
    return;
  }

  setObservacionesClientes(prev => [...prev, nuevaObservacion]);
  setNuevaObservacion({ fecha: '', mensaje: '' });
};




  //Calculo automaticos

const calculosFactura = useMemo(() => {
  const valorServicios = parseFloat(formData.valorServicios) || 0;
  const valorGastos = parseFloat(formData.valorGastos) || 0;
  const base = valorServicios + valorGastos;
  const iva = base * 0.19;
  const reteiva = base * 0.15;
  const retefuente = base * 0.025;
  const reteica = base * 0.00966;
  const totalFactura = base + iva;

  return {
    iva,
    reteiva,
    retefuente,
    reteica,
    totalBase: base,
    totalFactura,
  };
}, [formData.valorServicios, formData.valorGastos]);



const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};





const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.aseguradora?.trim() || !formData.numeroPoliza?.trim()) {
    alert("Los campos 'aseguradora' y 'número de póliza' son obligatorios");
    return;
  }

  const payload = {
    aseguradora: formData.aseguradora?.trim(),
    numeroPoliza: formData.numeroPoliza?.trim(),
    descripcionSiniestro: formData.descripcionSiniestro?.trim() || undefined,
    estadoSiniestro: formData.estadoSiniestro?.trim() || undefined,
    fechaAsignacion: formData.fechaAsignacion || undefined,
    fechaSiniestro: formData.fechaSiniestro || undefined,
    valorReserva: formData.valorReserva ? parseFloat(formData.valorReserva) : undefined,
    valorReclamo: formData.valorReclamo ? parseFloat(formData.valorReclamo) : undefined,
    montoIndemnizar: formData.montoIndemnizar ? parseFloat(formData.montoIndemnizar) : undefined,
    ciudadSiniestro: formData.ciudadSiniestro?.trim() || undefined,
    responsable: formData.responsable?.trim() || undefined,
    asegurado: formData.asegurado?.trim() || undefined,
    tipoDocumento: formData.tipoDocumento?.trim() || undefined,
    numeroDocumento: formData.numeroDocumento?.trim() || undefined,
    numeroSiniestro: formData.numeroSiniestro?.trim() || undefined,
  };

  try {
    const response = await crearCasoComplex(payload);
    setNumeroAjusteGenerado(response.numero_ajuste || "Generado");
    alert("✅ Caso creado con éxito");
  } catch (error) {
    console.error("Error creando caso:", error);
    if (error.response?.data?.message) {
      alert(" Error: " + JSON.stringify(error.response.data.message));
    } else {
      alert(" Error desconocido al crear el caso.");
    }
  }
};






  
  const valorServicios = parseFloat(formData.valorServicios) || 0;
  const valorGastos = parseFloat(formData.valorGastos) || 0;
  const totalBase = valorServicios + valorGastos;
  const iva = totalBase * 0.19;
  const reteiva = totalBase * 0.15;
  const retefuente = totalBase * 0.025;
  const reteica = totalBase * 0.00966;
  const totalFactura = totalBase + iva;


  
  const datosCompletos = {
    aseguradora: formData.aseguradora,
    intermediario: formData.intermediario,
    codigoWorkflow: formData.codigoWorkflow,
    numeroPoliza: formData.numeroPoliza,
    responsable: formData.responsable,
    asegurado: formData.asegurado,
    tipoDocumento: formData.tipoDocumento,
    numeroDocumento: formData.numeroDocumento,
    numeroSiniestro: formData.numeroSiniestro,
    fechaAsignacion: formData.fechaAsignacion,
    fechaSiniestro: formData.fechaSiniestro,
    ciudadSiniestro: formData.ciudadSiniestro,
    descripcionSiniestro: formData.descripcionSiniestro,
    estadoSiniestro: formData.estadoSiniestro,
    valorReserva: formData.valorReserva || 0,
    valorReclamo: parseFloat(formData.valorReclamo),
    montoIndemnizar: parseFloat(formData.montoIndemnizar),
      
    ...formData,
    iva,
    reteiva,
    retefuente,
    reteica,
    totalBase,
    totalFactura,
  };



  const calcularDiasTranscurridos = () => {
  const fechaFinal = new Date(formData.fechaInformeFinal);
  const fechaUltima = new Date(formData.fechaUltimoDocumento);

  if (isNaN(fechaFinal) || isNaN(fechaUltima)) {
    return '';
  }

  const diferencia = Math.abs(fechaFinal - fechaUltima);
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  return dias;
};


  const aseguradoras = [
    "ALLIANZ SEGUROS S.A.",
    "ASEGURADORA SOLIDARIA DE COLOMBIA",
    "AXA COLPATRIA SEGUROS S.A.",
    "BBVA SEGUROS COLOMBIA S.A.",
    "CD ASESORES DE SEGUROS",
    "CORPORACION NACIONAL DE VOLQUETEROS CORPORAVOL",
    "CRAWFORD COLOMBIA S.A.S.",
    "ECOEQUIPOS COLOMBIA S.A.S.",
    "EGON SEGUROS LTDA",
    "EUROSEGUROS SU AGENCIA LTDA",
    "Italú Corredor de Seguros",
    "JANNA SEGUROS LTDA.",
    "LA EQUIDAD SEGUROS",
    "LA PREVISORA S.A.",
    "LIBERTY SEGUROS S.A.",
    "MAPFRE SEGUROS GENERALES DE COLOMBIA S.A.",
    "MCA SEGUROS INTEGRALES LTDA",
    "PORTO & COMPAÑIA LTDA",
    "PROSER AJUSTES SAS",
    "SBS SEGUROS COLOMBIA S.A.",
    "Seguros Alfa S.A.",
    "SEGUROS BOLÍVAR",
    "Seguros Confianza S.A.",
    "SEGUROS DEL ESTADO",
    "SEGUROS GENERALES SURAMERICANA S.A.",
    "SIN ASIGNAR",
    "UNISEG RIESGOS Y SEGUROS",
    "VIOLETTE MARGARITA CARDOZA. GALVAN",
    "Zúrich Colombia Seguros S.A."
    
  ];


  


const agregarSeguimiento = () => {
  setSeguimientos(prev => [
    ...prev,
    { fecha: '', observacion: '', adjunto: null }
  ]);
};

const actualizarSeguimiento = (index, campo, valor) => {
  const nuevos = [...seguimientos];
  nuevos[index][campo] = valor;
  setSeguimientos(nuevos);
};

const agregarObservacion = () => {
  if (nuevaObservacion.trim() === '') return;
  setObservacionesClientes(prev => [...prev, nuevaObservacion.trim()]);
  setNuevaObservacion('');
};

const observacionesFiltradas = observacionesClientes.filter(obs =>
  obs.toLowerCase().includes(busqueda.toLowerCase())
);

const indiceUltima = paginaActual * observacionesPorPagina;
const indicePrimera = indiceUltima - observacionesPorPagina;
const observacionesActuales = observacionesClientes.slice(indicePrimera, indiceUltima);

const cambiarPagina = (nuevaPagina) => {
  setPaginaActual(nuevaPagina);
};




  return (
    <div className="p-6">
      <form onSubmit={handleSubmit}>
        <div className="flex justify-between mb-4">
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">+ Agregar</button>
          <button type="button" className="bg-rose-500 text-white px-4 py-2 rounded">Cancelar</button>
        </div>

        <div className="bg-gray-50 p-4 border rounded shadow-sm">
          <h2 className="text-lg font-semibold mb-4">📋 Asignación de Ajuste</h2>
          <div className="grid grid-cols-2 gap-4">


            <div>
              <label className="block font-medium">Aseguradora *</label>
              <select
                name="aseguradora"
                value={formData.aseguradora}
                onChange={handleChange}
                className="border px-2 py-1 w-full rounded"
              >
                <option value="">Seleccionar...</option>
                {aseguradoras.sort((a, b) => a.localeCompare(b)).map((nombre, idx) => (
                  <option key={idx} value={nombre}>{nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium">Intermediario</label>
              <input
                name="intermediario"
                type="text"
                value={formData.intermediario}
                onChange={handleChange}
                className="border px-2 py-1 w-full rounded"
              />
            </div>

                  {/* Código Workflow */}
                <div>
                  <label className="block font-medium">Código Workflow</label>
                  <input
                    name="codigoWorkflow"
                    type="text"
                    value={formData.codigoWorkflow}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full rounded"
                  />
                </div>

                {/* Número de Póliza */}
                <div>
                  <label className="block font-medium">Número de Póliza *</label>
                  <input
                    name="numeroPoliza"
                    type="text"
                    value={formData.numeroPoliza}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full rounded"
                  />
                </div>

                {/* Responsable */}
                <div>
                  <label className="block font-medium">Responsable *</label>
                  <select
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full rounded"
                  >
                    <option value="">Seleccionar...</option>
                    {[
                      "Alexander Escalante",
                      "Alfonso Marquez",
                      "Andrés Mejía",
                      "Armando Fontalvo",
                      "Arnaldo Andrés Tapia Gutierrez",
                      "Bernardo Sojo Guzmán",
                      "Byron Leon",
                      "Dario Mayo",
                      "Elkin Gabriel Tapia Gutierrez",
                      "Gabriel Moreno",
                      "Guillermo Segundo Mangonez Arcia",
                      "Iskharly José Tapia Gutierrez",
                      "Ladys Andrea Escalante Bossio",
                      "Luis Enrique Truyol",
                      "María Fernanda Sanín",
                      "Maria Garcias",
                      "Mario Alberto Pinilla de la Torre",
                      "Milagro Navarro",
                      "Orlando Quijano"
                    ].map((responsable, idx) => (
                      <option key={idx} value={responsable}>{responsable}</option>
                    ))}
                  </select>
                </div>

                <div> 
                  <label className= "block font-medium">Asegurado o Beneficiario *</label>
                  <input
                    name="asegurado"
                    type="text"
                    value={formData.asegurado}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full rounded"
                  />  
                </div>
                    
            {/* TIPO DOCUMENTO */}
            <div>
              <label className="block font-medium">Tipo Documento *</label>
              <select name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} className="border px-2 py-1 w-full rounded">
                <option value="Cédula">Cédula</option>
                <option value="NIT">NIT</option>
                <option value="Cédula de extranjería">Cédula de extranjería</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>

            {/* NÚMERO DOCUMENTO */}
            <div>
              <label className="block font-medium">Número de Documento *</label>
              <input name="numeroDocumento" type="text" value={formData.numeroDocumento} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
            </div>

            {/* NÚMERO SINIESTRO */}
            <div>
              <label className="block font-medium">Número de Siniestro *</label>
              <input name="numeroSiniestro" type="text" value={formData.numeroSiniestro} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
            </div>

            {/* FECHAS Y CIUDAD */}
            <div>
              <label className="block font-medium">Fecha de Asignación *</label>
              <input name="fechaAsignacion" type="date" value={formData.fechaAsignacion} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
            </div>

            <div>
              <label className="block font-medium">Fecha del Siniestro</label>
              <input name="fechaSiniestro" type="date" value={formData.fechaSiniestro} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
            </div>

            <div>
              <label className="block font-medium">Ciudad Siniestro *</label>
              <input name="ciudadSiniestro" type="text" value={formData.ciudadSiniestro} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
            </div>

            <div className="col-span-2">
              <label className="block font-medium">Descripción del Siniestro *</label>
              <textarea name="descripcionSiniestro" value={formData.descripcionSiniestro} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
            </div>

            {/* ESTADO */}
            <div>
              <label className="block font-medium">Estado del Siniestro *</label>
              <select name="estadoSiniestro" value={formData.estadoSiniestro} onChange={handleChange} className="border px-2 py-1 w-full rounded">
                <option value="">Seleccionar...</option>
                <option value="COMPLEX">COMPLEX</option>
                <option value="DESISTIDO">DESISTIDO</option>
                <option value="LIQUIDAR SINIESTRO">LIQUIDAR SINIESTRO</option>
                <option value="PAGO SINIESTRO">PAGO SINIESTRO</option>
                <option value="PENDIENTE ACEPTACION CLIENTE">PENDIENTE ACEPTACION CLIENTE</option>
                <option value="COORDINANDO INSPECCION">COORDINANDO INSPECCION</option>
                <option value="FINALIZADO">FINALIZADO</option>
                <option value="PAGO GIRADO">PAGO GIRADO</option>
                <option value="PENDIENTE ACEPTACION CIFRAS">PENDIENTE ACEPTACION CIFRAS</option>
                <option value="PENDIENTE DOCUMENTOS">PENDIENTE DOCUMENTOS</option>
              </select>
            </div>
             


          </div>

           <div className="flex space-x-4 border-b mb-4">
              <div className="border-b border-gray-300 mb-6">
                <nav className="-mb-px flex space-x-6">
                  {[
                    { id: "valores", label: "Valores y Prestaciones" },
                    { id: "activacion", label: "Activación" },
                    { id: "facturacion", label: "Facturación" },
                    { id: "seguimiento", label: "Seguimiento" },
                    { id: "observaciones", label: "Observaciones Clientes" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTabActiva(tab.id)}
                      className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
                        tabActiva === tab.id
                          ? "border-blue-500 text-blue-600 font-semibold"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
                
              </div>

              </div>
              {tabActiva === "valores" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium">Valor Reserva</label>
                  <input
                    type="number"
                    name="valorReserva"
                    value={formData.valorReserva}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium">Valor Reclamo</label>
                  <input
                    type="number"
                    name="valorReclamo"
                    value={formData.valorReclamo}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium">Monto a Indemnizar</label>
                  <input
                    type="number"
                    name="montoIndemnizar"
                    value={formData.montoIndemnizar}
                    onChange={handleChange}
                    className="border px-2 py-1 w-full rounded"
                  />
                </div>
              </div>
            )}

            {tabActiva === "activacion" &&(
              <div>
                {/* Fecha Contacto Inicial */}
                  <div>
                    <label className="block font-medium">Fecha Contacto Inicial</label>
                    <input
                      type="date"
                      name="fechaContactoInicial"
                      value={formData.fechaContactoInicial}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Observaciones Contacto Inicial */}
                  <div>
                    <label className="block font-medium">Observaciones Contacto Inicial</label>
                    <textarea
                      name="observacionContactoInicial"
                      value={formData.observacionContactoInicial}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Adjuntos Contacto Inicial */}
                  <div>
                    <label className="block font-medium">Adjuntos Contacto Inicial</label>
                    <input
                      type="file"
                      name="adjuntoContactoInicial"
                      onChange={(e) => handleFileChange(e, "adjuntoContactoInicial")}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Fecha de Inspección */}
                  <div>
                    <label className="block font-medium">Fecha de Inspección</label>
                    <input
                      type="date"
                      name="fechaInspeccion"
                      value={formData.fechaInspeccion}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Observaciones de la Inspección */}
                  <div>
                    <label className="block font-medium">Observaciones de la Inspección</label>
                    <textarea
                      name="observacionInspeccion"
                      value={formData.observacionInspeccion}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Anexo Acta Inspección */}
                  <div>
                    <label className="block font-medium">Anexo Acta Inspección</label>
                    <input
                      type="file"
                      name="adjuntoActaInspeccion"
                      onChange={(e) => handleFileChange(e, "adjuntoActaInspeccion")}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Fecha Solicitud de Documentos */}
                  <div>
                    <label className="block font-medium">Fecha Solicitud de Documentos</label>
                    <input
                      type="date"
                      name="fechaSolicitudDocumentos"
                      value={formData.fechaSolicitudDocumentos}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Anexos Solicitud Documentos */}
                  <div>
                    <label className="block font-medium">Anexos de la Solicitud de Documentos</label>
                    <input
                      type="file"
                      name="adjuntoSolicitudDocumento"
                      onChange={(e) => handleFileChange(e, "adjuntoSolicitudDocumento")}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Observaciones Solicitud Documentos */}
                  <div>
                    <label className="block font-medium">Observaciones Solicitud Documentos</label>
                    <textarea
                      name="observacionSolicitudDocumento"
                      value={formData.observacionSolicitudDocumento}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Fecha Informe Preliminar */}
                  <div>
                    <label className="block font-medium">Fecha Informe Preliminar</label>
                    <input
                      type="date"
                      name="fechaInformePreliminar"
                      value={formData.fechaInformePreliminar}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Adjunto Informe Preliminar */}
                  <div>
                    <label className="block font-medium">Adjunto Informe Preliminar</label>
                    <input
                      type="file"
                      name="adjuntoInformePreliminar"
                      onChange={(e) => handleFileChange(e, "adjuntoInformePreliminar")}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Observaciones Informe Preliminar */}
                  <div>
                    <label className="block font-medium">Observaciones Informe Preliminar</label>
                    <textarea
                      name="observacionInformePreliminar"
                      value={formData.observacionInformePreliminar}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Fecha Informe Final */}
                  <div>
                    <label className="block font-medium">Fecha Informe Final</label>
                    <input
                      type="date"
                      name="fechaInformeFinal"
                      value={formData.fechaInformeFinal}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Observaciones Fecha Informe Final */}
                  <div>
                    <label className="block font-medium">Observaciones Fecha Informe Final</label>
                    <textarea
                      name="observacionInformeFinal"
                      value={formData.observacionInformeFinal}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Adjunto Informe Final */}
                  <div>
                    <label className="block font-medium">Adjunto Informe Final</label>
                    <input
                      type="file"
                      name="adjuntoInformeFinal"
                      onChange={(e) => handleFileChange(e, "adjuntoInformeFinal")}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Fecha Último Documento */}
                  <div>
                    <label className="block font-medium">Fecha Último Documento</label>
                    <input
                      type="date"
                      name="fechaUltimoDocumento"
                      value={formData.fechaUltimoDocumento}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Adjunto Último Documento */}
                  <div>
                    <label className="block font-medium">Adjunto Entrega Último Documento</label>
                    <input
                      type="file"
                      name="adjuntoEntregaUltimoDocumento"
                      onChange={(e) => handleFileChange(e, "adjuntoEntregaUltimoDocumento")}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

                  {/* Días Transcurridos */}
                  <div>
                    <label className="block font-medium">Días transcurridos desde último seguimiento</label>
                    <input
                      type="text"
                      value={calcularDiasTranscurridos()}
                      disabled
                      className="border px-2 py-1 w-full rounded bg-gray-100"
                    />
                  </div>


                  {/* Observación Seguimiento */}
                  <div>
                    <label className="block font-medium">Observación de Seguimiento y Pendientes</label>
                    <textarea
                      name="observacionSeguimientoPendientes"
                      value={formData.observacionSeguimientoPendientes}
                      onChange={handleChange}
                      className="border px-2 py-1 w-full rounded"
                    />
                  </div>

              </div>
              

            )}  
                                
                {tabActiva === "facturacion" && (
                <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-medium">Número de Factura</label>
                  <input name="numeroFactura" type="text" value={formData.numeroFactura} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
                </div>
                <div>
                  <label className="block font-medium">Valor Servicios</label>
                  <input name="valorServicios" type="number" value={formData.valorServicios} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
                </div>
                <div>
                  <label className="block font-medium">Valor Gastos</label>
                  <input name="valorGastos" type="number" value={formData.valorGastos} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
                </div>

                <div className="col-span-3 grid grid-cols-3 gap-4 mt-2">
                  <div><strong>Iva:</strong> ${calculosFactura.iva.toFixed(2)}</div>
                  <div><strong>Reteiva:</strong> ${formData.reteiva.toFixed(2)}</div>
                  <div><strong>Retefuente:</strong> ${formData.retefuente.toFixed(2)}</div>
                  <div><strong>Reteica:</strong> ${formData.reteica.toFixed(2)}</div>
                  <div><strong>Total Base:</strong> ${formData.totalBase.toFixed(2)}</div>
                  <div><strong>Total Factura:</strong> ${formData.totalFactura.toFixed(2)}</div>
                </div>

                <div className="col-span-1 mt-4">
                  <label className="block font-medium">Fecha de Factura</label>
                  <input name="fechaFactura" type="date" value={formData.fechaFactura} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
                </div>
                <div className="col-span-1 mt-4">
                  <label className="block font-medium">Fecha Última Revisión</label>
                  <input name="fechaUltimaRevision" type="date" value={formData.fechaUltimaRevision} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
                </div>

                <div className="col-span-2 mt-4">
                  <label className="block font-medium">Observaciones y Compromisos</label>
                  <textarea name="observacionesCompromisos" value={formData.observacionesCompromisos} onChange={handleChange} className="border px-2 py-1 w-full rounded" />
                </div>

                <div className="col-span-3 mt-4">
                  <label className="block font-medium">Adjunto Factura</label>
                  <input type="file" onChange={(e) => setFormData(prev => ({ ...prev, adjuntoFactura: e.target.files[0] }))} className="border px-2 py-1 w-full rounded" />
                </div>
                </div>
                )}

                 {tabActiva === "seguimiento" && (
                    <div className="mt-4">
                      <button type="button" onClick={agregarSeguimiento} className="bg-green-500 text-white px-4 py-2 rounded mb-4">+ Nuevo</button>

                      <table className="w-full text-left border">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 border">Fecha *</th>
                            <th className="p-2 border">Observación *</th>
                            <th className="p-2 border">Documento Adjunto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seguimientos.map((item, index) => (
                            <tr key={index}>
                              <td className="p-2 border">
                                <input
                                  type="date"
                                  value={item.fecha}
                                  onChange={e => actualizarSeguimiento(index, 'fecha', e.target.value)}
                                  className="border px-2 py-1 w-full rounded"
                                />
                              </td>
                              <td className="p-2 border">
                                <input
                                  type="text"
                                  value={item.observacion}
                                  onChange={e => actualizarSeguimiento(index, 'observacion', e.target.value)}
                                  className="border px-2 py-1 w-full rounded"
                                />
                              </td>
                              <td className="p-2 border">
                                <input
                                  type="file"
                                  onChange={e => actualizarSeguimiento(index, 'adjunto', e.target.files[0])}
                                  className="border px-2 py-1 w-full rounded"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {tabActiva === "observaciones" && (
                        <div className="mt-4">
                          <div className="flex gap-2 mb-4">
                            <input
                              type="text"
                              placeholder="Nueva observación"
                              value={nuevaObservacion}
                              onChange={e => setNuevaObservacion(e.target.value)}
                              className="border px-2 py-1 w-full rounded"
                            />
                            <button
                              type="button"
                              onClick={agregarObservacion}
                              className="bg-green-600 text-white px-4 py-1 rounded"
                            >
                              + Agregar
                            </button>
                          </div>

                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="🔍 Buscar observación..."
                              value={busqueda}
                              onChange={e => setBusqueda(e.target.value)}
                              className="border px-2 py-1 w-full rounded"
                            />
                          </div>

                          {observacionesFiltradas.length === 0 ? (
                            <p className="text-gray-500 text-center">No hay registros para mostrar</p>
                          ) : (
                            <ul className="list-disc pl-5">
                              {observacionesFiltradas.map((obs, idx) => (
                                <li key={idx} className="py-1">{obs}</li>
                              ))}
                            </ul>
                          )}

                          <div>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="py-2">Fecha</th>
                                      <th>Observación</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {observacionesActuales.length === 0 ? (
                                      <tr>
                                        <td colSpan="2" className="text-center py-4">No hay registros para mostrar</td>
                                      </tr>
                                    ) : (
                                      observacionesActuales.map((obs, idx) => (
                                        <tr key={idx} className="border-t">
                                          <td className="py-2">{obs.fecha}</td>
                                          <td>{obs.mensaje}</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>

                                {/* Navegación de páginas */}
                                <div className="flex justify-center items-center gap-2 mt-4">
                                  <button onClick={() => cambiarPagina(1)} disabled={paginaActual === 1}>{"<<"}</button>
                                  <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1}>{"<"}</button>
                                  <span>Página {paginaActual}</span>
                                  <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={indiceUltima >= observacionesClientes.length}>{">"}</button>
                                  <button onClick={() => cambiarPagina(Math.ceil(observacionesClientes.length / observacionesPorPagina))} disabled={indiceUltima >= observacionesClientes.length}>{">>"}</button>
                                </div>
                              </div>
                              <div className="space-y-4">

                              {/* Formulario para nueva observación */}
                              <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <input
                                  type="date"
                                  name="fecha"
                                  value={nuevaObservacion.fecha}
                                  onChange={handleNuevaObservacionChange}
                                  className="border px-2 py-1 rounded"
                                />
                                <input
                                  type="text"
                                  name="mensaje"
                                  placeholder="Observación"
                                  value={nuevaObservacion.mensaje}
                                  onChange={handleNuevaObservacionChange}
                                  className="border px-2 py-1 rounded w-full"
                                />
                                <button
                                  type="button"
                                  onClick={agregarObservacionCliente}
                                  className="bg-green-500 text-white px-4 py-1 rounded"
                                >
                                  + Nuevo
                                </button>
                              </div>

                              {/* Tabla de observaciones */}
                              <table className="w-full text-sm mt-4">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="py-2">Fecha</th>
                                    <th>Observación</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {observacionesActuales.length === 0 ? (
                                    <tr>
                                      <td colSpan="2" className="text-center py-4">No hay registros para mostrar</td>
                                    </tr>
                                  ) : (
                                    observacionesActuales.map((obs, idx) => (
                                      <tr key={idx} className="border-t">
                                        <td className="py-2">{obs.fecha}</td>
                                        <td>{obs.mensaje}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>

                              {/* Paginación */}
                              <div className="flex justify-center items-center gap-2 mt-4">
                                <button onClick={() => cambiarPagina(1)} disabled={paginaActual === 1}>{"<<"}</button>
                                <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1}>{"<"}</button>
                                <span>Página {paginaActual}</span>
                                <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={indiceUltima >= observacionesClientes.length}>{">"}</button>
                                <button onClick={() => cambiarPagina(Math.ceil(observacionesClientes.length / observacionesPorPagina))} disabled={indiceUltima >= observacionesClientes.length}>{">>"}</button>
                              </div>
                            </div>


                        </div>

                     )}





                        


        </div>
      </form>

      {numeroAjusteGenerado && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded">
          <p className="text-green-800 font-semibold">
            ✅ Caso creado. Número de Ajuste: <strong>{numeroAjusteGenerado}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default AgregarCaso;
