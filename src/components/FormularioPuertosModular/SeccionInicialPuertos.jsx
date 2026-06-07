import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Select from 'react-select';
import { FaEye, FaTimes } from 'react-icons/fa';
import ciudadesData from '../../data/colombia.json';
import MapaGoogleEarth from '../MapaGoogleEarth';

export default function SeccionInicialPuertos({ formData, onInputChange, onMultipleChange, cargando, forzarCapturaMapa }) {
  const { theme } = useTheme();
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  // Preparar opciones de municipios
  const municipios = ciudadesData.flatMap(dep =>
    dep.ciudades.map(ciudad => ({
      label: `${ciudad} - ${dep.departamento}`,
      value: ciudad,
      departamento: dep.departamento
    }))
  );

  const handleCiudadChange = (selectedOption) => {
    if (selectedOption) {
      onMultipleChange({
        municipio: selectedOption.value,
        departamento: selectedOption.departamento
      });
    }
  };

  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onMultipleChange({
          imagen: file,
          preview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const formatearFechaInspeccion = (fechaStr) => {
    if (!fechaStr) {
      // Generar fecha actual sin problemas de zona horaria
      const hoy = new Date();
      const year = hoy.getFullYear();
      const month = String(hoy.getMonth() + 1).padStart(2, '0');
      const day = String(hoy.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    
    // Si la fecha viene en formato YYYY-MM-DD (input type="date")
    if (fechaStr.includes('-')) {
      const [year, month, day] = fechaStr.split('-').map(Number);
      // Formatear manualmente en formato DD/MM/YYYY
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month).padStart(2, '0');
      return `${dayStr}/${monthStr}/${year}`;
    }
    
    // Si ya viene en formato DD/MM/YYYY, devolverlo tal cual
    return fechaStr;
  };

  // Función para formatear fecha en formato "día de mes" (ej: "28 de octubre")
  const formatearFechaArribo = (fechaStr) => {
    if (!fechaStr) return '';
    
    try {
      if (fechaStr.includes('-')) {
        const fecha = new Date(fechaStr + 'T00:00:00');
        const dia = fecha.getDate();
        const mes = fecha.toLocaleDateString("es-CO", { month: "long" });
        return `${dia} de ${mes}`;
      }
      return fechaStr;
    } catch (error) {
      return fechaStr;
    }
  };

  // Base de datos de clientes predefinidos con toda su información
  const clientesPredefinidos = {
    'TOYOTA': {
      nombreContacto: 'Sr. Jhorgin Arce',
      cargoContacto: 'Analística Logística',
      empresaCliente: 'AUTOMOTORES TOYOTA COLOMBIA S.A.S',
      emailContacto: 'jhorgin.arce@toyota.com.co',
      ciudadContacto: 'Bogotá D.C, Colombia'
    },
    // Aquí se pueden agregar más clientes en el futuro
  };

  const opcionesClientes = [
    { value: 'TOYOTA', label: 'AUTOMOTORES TOYOTA COLOMBIA S.A.S' },
    // Agregar más opciones aquí según se vayan definiendo
  ];

  // Función para manejar el cambio de cliente
  const handleClienteChange = (selectedOption) => {
    if (selectedOption && clientesPredefinidos[selectedOption.value]) {
      const datosCliente = clientesPredefinidos[selectedOption.value];
      onMultipleChange({
        clienteSeleccionado: selectedOption.value,
        nombreContacto: datosCliente.nombreContacto,
        cargoContacto: datosCliente.cargoContacto,
        empresaCliente: datosCliente.empresaCliente,
        emailContacto: datosCliente.emailContacto,
        ciudadContacto: datosCliente.ciudadContacto,
        nombreCliente: datosCliente.empresaCliente
      });
    }
  };

  return (
    <>
      <div 
        className="p-4 rounded mb-6"
        style={{
          backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F3F4F6',
          border: `2px solid ${theme === 'dark' ? '#DC2626' : '#2563EB'}`
        }}
      >
        <h3 
          className="text-lg font-bold mb-4"
          style={{ color: theme === 'dark' ? '#DC2626' : '#2563EB' }}
        >
          📋 INFORMACIÓN DE LA CARTA DE PRESENTACIÓN
        </h3>

        {/* Ciudad y Fecha del Reporte */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              Ciudad del Reporte
            </label>
            <Select
              options={municipios}
              value={(() => {
                if (!formData.municipio) return null;
                return municipios.find(opt => opt.value === formData.municipio) || null;
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
              Fecha del Reporte
            </label>
            <input
              type="date"
              value={formData.fecha || ''}
              onChange={(e) => onInputChange('fecha', e.target.value)}
              className="w-full rounded px-2 sm:px-3 py-2 text-sm"
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

        {/* Código de Referencia - GENERADO AUTOMÁTICAMENTE */}
        <div className="mb-4">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Código de Referencia (Generado Automáticamente)
          </label>
          <input
            type="text"
            value={formData.codigoReferencia || 'CPD-2025-XXX (Se generará al guardar)'}
            className="w-full rounded px-2 sm:px-3 py-2 text-sm"
            style={{
              backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F3F4F6',
              color: textSecondary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`,
              cursor: 'not-allowed'
            }}
            disabled={true}
            readOnly
          />
          <p 
            className="text-xs mt-1"
            style={{ color: textSecondary }}
          >
            El código se generará automáticamente al guardar el formulario
          </p>
        </div>

        {/* SELECCIÓN DE CLIENTE */}
        <div 
          className="p-3 rounded mb-4"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#FFFFFF',
            border: `1px solid ${borderColor}`
          }}
        >
          <h4 
            className="text-sm font-bold mb-3"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            📧 Selección de Cliente
          </h4>

          <div className="mb-3">
            <label 
              className="block text-xs font-medium mb-1"
              style={{ color: textPrimary }}
            >
              Cliente / Empresa
            </label>
            <Select
              options={opcionesClientes}
              value={opcionesClientes.find(opt => opt.value === formData.clienteSeleccionado) || null}
              onChange={handleClienteChange}
              placeholder="Selecciona un cliente..."
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
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected 
                    ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                    : state.isFocused
                    ? (theme === 'dark' ? '#2A2A2A' : '#F3F4F6')
                    : inputBg,
                  color: state.isSelected ? '#FFFFFF' : textPrimary
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: textPrimary
                }),
                menu: (provided) => ({
                  ...provided,
                  backgroundColor: inputBg,
                })
              }}
            />
          </div>

          {/* Vista previa de los datos del cliente seleccionado */}
          {formData.clienteSeleccionado && (
            <div 
              className="p-3 rounded mt-3 text-sm"
              style={{
                backgroundColor: theme === 'dark' ? '#1A1A1A' : '#F9FAFB',
                border: `1px solid ${borderColor}`
              }}
            >
              <p className="font-bold mb-2" style={{ color: theme === 'dark' ? '#60A5FA' : '#1E40AF' }}>
                Datos del Contacto:
              </p>
              <p style={{ color: textPrimary }}>{formData.nombreContacto}</p>
              <p style={{ color: textPrimary }}>{formData.cargoContacto}</p>
              <p style={{ color: textPrimary }} className="font-bold">{formData.empresaCliente}</p>
              <p style={{ color: textPrimary }}>Email: {formData.emailContacto}</p>
              <p style={{ color: textPrimary }}>{formData.ciudadContacto}</p>
            </div>
          )}
        </div>

        {/* DATOS DE LA INSPECCIÓN - SOLO CAMPOS EDITABLES */}
        <div 
          className="p-3 rounded mb-4"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#FFFFFF',
            border: `1px solid ${borderColor}`
          }}
        >
          <h4 
            className="text-sm font-bold mb-3"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            🚢 Datos de la Inspección
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label 
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Fechas de Inspección (texto libre)
              </label>
              <input
                type="text"
                value={formData.fechasInspeccion || ''}
                onChange={(e) => onInputChange('fechasInspeccion', e.target.value)}
                className="w-full rounded px-2 py-1.5 text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                placeholder="Ej: 30 y 31 de Octubre"
                disabled={cargando}
              />
              <p 
                className="text-xs mt-1"
                style={{ color: textSecondary }}
              >
                Puede ser uno o varios días
              </p>
            </div>

            <div>
              <label 
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Nombre de la Motonave (Aparecerá en encabezado)
              </label>
              <input
                type="text"
                value={formData.nombreMotonave || ''}
                onChange={(e) => onInputChange('nombreMotonave', e.target.value)}
                className="w-full rounded px-2 py-1.5 text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                placeholder="Nombre de la motonave"
                disabled={cargando}
              />
              <p 
                className="text-xs mt-1"
                style={{ color: textSecondary }}
              >
                Este nombre aparecerá en el encabezado del documento
              </p>
            </div>
          </div>

          {/* Nuevos campos: Fecha de Arribo, Número de Vehículos y Puerto */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
            <div>
              <label 
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Fecha de Arribo de la Motonave
              </label>
              <input
                type="date"
                value={formData.fechaArriboMotonave || ''}
                onChange={(e) => onInputChange('fechaArriboMotonave', e.target.value)}
                className="w-full rounded px-2 py-1.5 text-sm"
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
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Número de Vehículos
              </label>
              <input
                type="number"
                value={formData.numeroVehiculos || ''}
                onChange={(e) => onInputChange('numeroVehiculos', e.target.value)}
                className="w-full rounded px-2 py-1.5 text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                placeholder="Ej: 350"
                min="0"
                disabled={cargando}
              />
            </div>

            <div>
              <label 
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Puerto de Descargue
              </label>
              <input
                type="text"
                value={formData.puertoDescargue || ''}
                onChange={(e) => onInputChange('puertoDescargue', e.target.value)}
                className="w-full rounded px-2 py-1.5 text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                placeholder="Ej: Puerto Bahía"
                disabled={cargando}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botón flotante para Vista Previa */}
      {formData.clienteSeleccionado && (
        <button
          onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2"
          style={{
            backgroundColor: theme === 'dark' ? '#2563EB' : '#1E40AF',
            color: '#FFFFFF'
          }}
        >
          <FaEye />
          <span className="font-medium">{mostrarVistaPrevia ? 'Ocultar' : 'Vista Previa'}</span>
        </button>
      )}

      {/* Panel lateral de Vista Previa */}
      {mostrarVistaPrevia && formData.clienteSeleccionado && (
        <div 
          className="fixed top-0 right-0 h-full w-80 lg:w-96 z-50 shadow-2xl overflow-y-auto"
          style={{
            backgroundColor: cardBg,
            borderLeft: `2px solid ${borderColor}`
          }}
        >
          {/* Header del panel */}
          <div 
            className="sticky top-0 z-10 p-4 flex justify-between items-center"
            style={{
              backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB',
              borderBottom: `1px solid ${borderColor}`
            }}
          >
            <h3 
              className="font-bold text-sm"
              style={{ color: textPrimary }}
            >
              📄 Vista Previa del Documento
            </h3>
            <button
              onClick={() => setMostrarVistaPrevia(false)}
              className="p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
              style={{ color: textPrimary }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Contenido de la vista previa */}
          <div className="p-4 text-xs leading-relaxed">
            {/* Ciudad, Fecha y Código */}
            <p className="mb-3" style={{ color: textPrimary }}>
              <strong>{formData.municipio || 'Ciudad'}, {formatearFechaInspeccion(formData.fecha)}</strong>
              <br />
              <span className="font-bold">{formData.codigoReferencia || 'CPD-2025-XXX'}</span>
            </p>

            {/* Datos del Contacto */}
            <div className="mb-3" style={{ color: textPrimary }}>
              <p>{formData.nombreContacto}</p>
              <p>{formData.cargoContacto}</p>
              <p className="font-bold">{formData.empresaCliente}</p>
              <p>Email: {formData.emailContacto}</p>
              <p>{formData.ciudadContacto}</p>
            </div>

            {/* Título del Informe */}
            <p className="mt-4 mb-3 text-sm font-bold" style={{ color: '#DC2626' }}>
              INFORME INSPECCIÓN ASEGURADO: {formData.empresaCliente}
            </p>

            {/* Párrafo de la inspección */}
            <p className="mb-3" style={{ color: textPrimary }}>
              De acuerdo con la asignación recibida, me permito remitir el informe de inspección correspondiente a las revisiones efectuadas 
              {formData.fechasInspeccion ? ` los días ${formData.fechasInspeccion}` : ' los días (Fechas de inspección)'} a 
              {formData.nombreMotonave ? ` la motonave ${formData.nombreMotonave}` : ' la motonave (Nombre de la motonave)'}
              {formData.fechaArriboMotonave ? `, arribada el ${formatearFechaArribo(formData.fechaArriboMotonave)}` : ''}
              {formData.numeroVehiculos ? ` con un total de ${formData.numeroVehiculos} vehículos` : ''}
              {formData.puertoDescargue ? `, actualmente almacenados en los patios de ${formData.puertoDescargue}.` : ', actualmente almacenados en los patios de Puerto Bahía.'}
            </p>

            {/* Sección de Geolocalización */}
            <p className="mt-4 mb-2 font-bold text-sm" style={{ color: '#DC2626' }}>
              GEOLOCALIZACIÓN
            </p>
            <div 
              className="p-2 rounded text-center mb-3"
              style={{
                backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F3F4F6',
                border: `1px dashed ${borderColor}`,
                color: textSecondary
              }}
            >
              {formData.imagenMapa ? (
                <>
                  <img src={formData.imagenMapa} alt="Mapa capturado" className="w-full rounded mb-1" />
                  <p className="text-xs text-green-600">✓ Mapa capturado</p>
                </>
              ) : (
                <p className="text-xs">📍 El mapa aparecerá aquí una vez capturado</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mapa de Google Earth */}
      <div 
        className="mt-6 mb-6"
        style={{
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <div 
          className="px-4 py-3 font-bold"
          style={{
            backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB',
            color: textPrimary
          }}
        >
          🗺️ GEOLOCALIZACIÓN DEL PUERTO
        </div>
        <div className="p-4" style={{ minHeight: '300px' }}>
          <MapaGoogleEarth 
            coordenadasIniciales={formData.coordenadasRiesgo}
            direccionInicial={formData.direccionRiesgo}
            forzarCaptura={forzarCapturaMapa}
            onMapReady={(mapInstance) => {
}}
            onMapaChange={(datosMapaObj) => {
// Actualizar todos los datos del mapa
              onMultipleChange({
                imagenMapa: datosMapaObj.imagenMapa,
                coordenadasRiesgo: datosMapaObj.coordenadas,
                direccionRiesgo: datosMapaObj.direccion
              });
              
}}
          />
        </div>
      </div>

    </>
  );
}

