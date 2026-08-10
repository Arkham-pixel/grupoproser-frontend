import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Select from 'react-select';
import { FaEye, FaTimes } from 'react-icons/fa';
import ciudadesData from '../../data/colombia.json';
import MapaGoogleEarth from '../MapaGoogleEarth';
import { CONTACTOS_BOLIVAR, EMPRESA_BOLIVAR, ASEGURADOS } from './plantillasPuertos';

export default function SeccionInicialPuertos({
  formData,
  onInputChange,
  onMultipleChange,
  cargando,
  forzarCapturaMapa,
  ocultarGeolocalizacion = false,
  /** Si se pasa, solo muestra esos clientes en el selector (ej. Motorysa). */
  clientesPermitidos = null,
  /** Autocompleta este cliente al montar si aún no hay selección. */
  clientePorDefecto = null,
  /** Código de referencia / número de acta editable (ellos llevan el control). */
  codigoReferenciaLibre = false,
}) {
  const { t, i18n } = useTranslation();
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
        const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-CO';
        const mes = fecha.toLocaleDateString(locale, { month: 'long' });
        return t('ports.ui.formulario.seccionInicial.vistaPrevia.fechaArriboFormato', { dia, mes });
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  };

  // Base de datos de clientes predefinidos con toda su información
  const clientesPredefinidos = {
    METROKIA_BOLIVAR: {
      ...ASEGURADOS.METROKIA,
      empresaCliente: EMPRESA_BOLIVAR,
      clienteSeleccionado: 'METROKIA_BOLIVAR',
    },
    MOTORYSA_BOLIVAR: {
      ...ASEGURADOS.MOTORYSA,
      empresaCliente: EMPRESA_BOLIVAR,
      clienteSeleccionado: 'MOTORYSA_BOLIVAR',
    },
    AUTOCOM_BOLIVAR: {
      ...ASEGURADOS.AUTOCOM,
      empresaCliente: EMPRESA_BOLIVAR,
      clienteSeleccionado: 'AUTOCOM_BOLIVAR',
    },
    TOYOTA: {
      nombreContacto: 'Sr. Jhorgin Arce',
      cargoContacto: 'Analística Logística',
      gerenciaContacto: '',
      empresaCliente: 'AUTOMOTORES TOYOTA COLOMBIA S.A.S',
      emailContacto: 'jhorgin.arce@toyota.com.co',
      ciudadContacto: 'Bogotá D.C, Colombia',
      asegurado: 'AUTOMOTORES TOYOTA COLOMBIA S.A.S',
      nombreCliente: 'AUTOMOTORES TOYOTA COLOMBIA S.A.S',
      clienteSeleccionado: 'TOYOTA',
    },
    BOLIVAR: {
      empresaCliente: EMPRESA_BOLIVAR,
      clienteSeleccionado: 'BOLIVAR',
    },
  };

  const opcionesContactosBolivar = [
    ...CONTACTOS_BOLIVAR.map((c) => ({
      value: c.id,
      label: c.nombreContacto,
    })),
    { value: 'personalizado', label: t('ports.ui.formulario.seccionInicial.otroContactoManual') },
  ];

  const esClienteBolivar =
    formData.clienteSeleccionado === 'METROKIA_BOLIVAR' ||
    formData.clienteSeleccionado === 'MOTORYSA_BOLIVAR' ||
    formData.clienteSeleccionado === 'AUTOCOM_BOLIVAR' ||
    formData.clienteSeleccionado === 'BOLIVAR';

  const handleContactoBolivarChange = (selectedOption) => {
    if (!selectedOption || selectedOption.value === 'personalizado') {
      onInputChange('contactoBolivarId', 'personalizado');
      return;
    }
    const contacto = CONTACTOS_BOLIVAR.find((c) => c.id === selectedOption.value);
    if (contacto) {
      onMultipleChange({
        contactoBolivarId: contacto.id,
        nombreContacto: contacto.nombreContacto,
        cargoContacto: contacto.cargoContacto,
        gerenciaContacto: contacto.gerenciaContacto || '',
        empresaCliente: contacto.empresaCliente,
        emailContacto: contacto.emailContacto || '',
        ciudadContacto: contacto.ciudadContacto,
      });
    }
  };

  const opcionesClientesTodas = [
    { value: 'METROKIA_BOLIVAR', label: t('ports.ui.formulario.seccionInicial.opcionesCliente.metrokiaBolivar') },
    { value: 'MOTORYSA_BOLIVAR', label: t('ports.ui.formulario.seccionInicial.opcionesCliente.motorysaBolivar') },
    { value: 'AUTOCOM_BOLIVAR', label: t('ports.ui.formulario.seccionInicial.opcionesCliente.autocomBolivar') },
    { value: 'TOYOTA', label: 'AUTOMOTORES TOYOTA COLOMBIA S.A.S' },
    { value: 'BOLIVAR', label: t('ports.ui.formulario.seccionInicial.opcionesCliente.bolivarSoloContacto') },
  ];

  const opcionesClientes = Array.isArray(clientesPermitidos) && clientesPermitidos.length > 0
    ? opcionesClientesTodas.filter((opt) => clientesPermitidos.includes(opt.value))
    : opcionesClientesTodas;

  // Función para manejar el cambio de cliente
  const handleClienteChange = (selectedOption) => {
    if (selectedOption && clientesPredefinidos[selectedOption.value]) {
      const datosCliente = clientesPredefinidos[selectedOption.value];
      onMultipleChange({
        clienteSeleccionado: selectedOption.value,
        nombreContacto: datosCliente.nombreContacto || '',
        cargoContacto: datosCliente.cargoContacto || '',
        gerenciaContacto: datosCliente.gerenciaContacto || '',
        empresaCliente: datosCliente.empresaCliente || '',
        emailContacto: datosCliente.emailContacto || '',
        ciudadContacto: datosCliente.ciudadContacto || '',
        nombreCliente: datosCliente.nombreCliente || datosCliente.empresaCliente,
        asegurado: datosCliente.asegurado || formData.asegurado || '',
        contactoBolivarId:
          selectedOption.value === 'METROKIA_BOLIVAR' ||
          selectedOption.value === 'MOTORYSA_BOLIVAR' ||
          selectedOption.value === 'AUTOCOM_BOLIVAR' ||
          selectedOption.value === 'BOLIVAR'
            ? ''
            : '',
      });
    }
  };

  useEffect(() => {
    if (!clientePorDefecto || formData.clienteSeleccionado) return;
    if (!clientesPredefinidos[clientePorDefecto]) return;
    handleClienteChange({ value: clientePorDefecto });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientePorDefecto, formData.clienteSeleccionado]);

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
          {t('ports.ui.formulario.seccionInicial.tituloCarta')}
        </h3>

        {/* Ciudad y Fecha del Reporte */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              {t('ports.ui.formulario.seccionInicial.ciudadReporte')}
            </label>
            <Select
              options={municipios}
              value={(() => {
                if (!formData.municipio) return null;
                return municipios.find(opt => opt.value === formData.municipio) || null;
              })()}
              onChange={handleCiudadChange}
              placeholder={t('ports.ui.formulario.seccionInicial.seleccionarCiudad')}
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
              {t('ports.ui.formulario.seccionInicial.fechaReporte')}
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

        {/* Código de Referencia / Número de acta */}
        <div className="mb-4">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            {codigoReferenciaLibre
              ? t('ports.ui.formulario.seccionInicial.codigoReferenciaLibre')
              : t('ports.ui.formulario.seccionInicial.codigoReferencia')}
          </label>
          {codigoReferenciaLibre ? (
            <>
              <input
                type="text"
                value={formData.codigoReferencia || ''}
                onChange={(e) => onInputChange('codigoReferencia', e.target.value)}
                className="w-full rounded px-2 sm:px-3 py-2 text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor,
                  border: `1px solid ${borderColor}`,
                }}
                placeholder={t('ports.ui.formulario.seccionInicial.codigoReferenciaLibrePlaceholder')}
                disabled={cargando}
              />
              <p className="text-xs mt-1" style={{ color: textSecondary }}>
                {t('ports.ui.formulario.seccionInicial.codigoReferenciaLibreAyuda')}
              </p>
            </>
          ) : (
            <>
              <input
                type="text"
                value={formData.codigoReferencia || t('ports.ui.formulario.seccionInicial.codigoReferenciaPlaceholder')}
                className="w-full rounded px-2 sm:px-3 py-2 text-sm"
                style={{
                  backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F3F4F6',
                  color: textSecondary,
                  borderColor,
                  border: `1px solid ${borderColor}`,
                  cursor: 'not-allowed'
                }}
                disabled
                readOnly
              />
              <p className="text-xs mt-1" style={{ color: textSecondary }}>
                {t('ports.ui.formulario.seccionInicial.codigoReferenciaAyuda')}
              </p>
            </>
          )}
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
            {t('ports.ui.formulario.seccionInicial.seleccionCliente')}
          </h4>

          <div className="mb-3">
            <label 
              className="block text-xs font-medium mb-1"
              style={{ color: textPrimary }}
            >
              {t('ports.ui.formulario.seccionInicial.clienteEmpresa')}
            </label>
            <Select
              options={opcionesClientes}
              value={opcionesClientes.find(opt => opt.value === formData.clienteSeleccionado) || null}
              onChange={handleClienteChange}
              placeholder={t('ports.ui.formulario.seccionInicial.seleccionarCliente')}
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

          {/* Contacto del destinatario */}
          <div className="mt-3">
            <p className="font-bold mb-2 text-sm" style={{ color: theme === 'dark' ? '#60A5FA' : '#1E40AF' }}>
              {t('ports.ui.formulario.seccionInicial.datosContacto')}
            </p>

            {esClienteBolivar && (
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.seccionInicial.contactoBolivar')}
                </label>
                <Select
                  options={opcionesContactosBolivar}
                  value={
                    opcionesContactosBolivar.find((opt) => opt.value === formData.contactoBolivarId) || null
                  }
                  onChange={handleContactoBolivarChange}
                  placeholder={t('ports.ui.formulario.seccionInicial.seleccionarContactoBolivar')}
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
                        ? theme === 'dark' ? '#DC2626' : '#2563EB'
                        : state.isFocused
                        ? theme === 'dark' ? '#2A2A2A' : '#F3F4F6'
                        : inputBg,
                      color: state.isSelected ? '#FFFFFF' : textPrimary,
                    }),
                    singleValue: (provided) => ({ ...provided, color: textPrimary }),
                    menu: (provided) => ({ ...provided, backgroundColor: inputBg }),
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.seccionInicial.nombreContacto')}
                </label>
                <input
                  type="text"
                  value={formData.nombreContacto || ''}
                  onChange={(e) => onInputChange('nombreContacto', e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor, border: `1px solid ${borderColor}` }}
                  placeholder={t('ports.ui.formulario.seccionInicial.nombreContactoPlaceholder')}
                  disabled={cargando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.seccionInicial.cargo')}
                </label>
                <input
                  type="text"
                  value={formData.cargoContacto || ''}
                  onChange={(e) => onInputChange('cargoContacto', e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor, border: `1px solid ${borderColor}` }}
                  placeholder={t('ports.ui.formulario.seccionInicial.cargoPlaceholder')}
                  disabled={cargando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.seccionInicial.gerenciaArea')}
                </label>
                <input
                  type="text"
                  value={formData.gerenciaContacto || ''}
                  onChange={(e) => onInputChange('gerenciaContacto', e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor, border: `1px solid ${borderColor}` }}
                  placeholder={t('ports.ui.formulario.seccionInicial.gerenciaAreaPlaceholder')}
                  disabled={cargando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.seccionInicial.empresa')}
                </label>
                <input
                  type="text"
                  value={formData.empresaCliente || ''}
                  onChange={(e) => onInputChange('empresaCliente', e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor, border: `1px solid ${borderColor}` }}
                  placeholder={t('ports.ui.formulario.seccionInicial.empresaPlaceholder')}
                  disabled={cargando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.seccionInicial.email')}
                </label>
                <input
                  type="email"
                  value={formData.emailContacto || ''}
                  onChange={(e) => onInputChange('emailContacto', e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor, border: `1px solid ${borderColor}` }}
                  disabled={cargando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                  {t('ports.ui.formulario.seccionInicial.ciudad')}
                </label>
                <input
                  type="text"
                  value={formData.ciudadContacto || ''}
                  onChange={(e) => onInputChange('ciudadContacto', e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor, border: `1px solid ${borderColor}` }}
                  placeholder={t('ports.ui.formulario.seccionInicial.ciudadPlaceholder')}
                  disabled={cargando}
                />
              </div>
            </div>
          </div>
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
            {t('ports.ui.formulario.seccionInicial.datosInspeccion')}
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label 
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                {t('ports.ui.formulario.seccionInicial.fechasInspeccion')}
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
                placeholder={t('ports.ui.formulario.seccionInicial.fechasInspeccionPlaceholder')}
                disabled={cargando}
              />
              <p 
                className="text-xs mt-1"
                style={{ color: textSecondary }}
              >
                {t('ports.ui.formulario.seccionInicial.fechasInspeccionAyuda')}
              </p>
            </div>

            <div>
              <label 
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                {t('ports.ui.formulario.seccionInicial.nombreMotonave')}
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
                placeholder={t('ports.ui.formulario.seccionInicial.nombreMotonavePlaceholder')}
                disabled={cargando}
              />
              <p 
                className="text-xs mt-1"
                style={{ color: textSecondary }}
              >
                {t('ports.ui.formulario.seccionInicial.nombreMotonaveAyuda')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
            <div>
              <label 
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                {t('ports.ui.formulario.seccionInicial.fechaArribo')}
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
                {t('ports.ui.formulario.seccionInicial.numeroVehiculos')}
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
                placeholder={t('ports.ui.formulario.seccionInicial.numeroVehiculosPlaceholder')}
                min="0"
                disabled={cargando}
              />
            </div>

            <div>
              <label 
                className="block text-xs font-medium mb-1"
                style={{ color: textPrimary }}
              >
                {t('ports.ui.formulario.seccionInicial.puertoDescargue')}
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
                placeholder={t('ports.ui.formulario.seccionInicial.puertoDescarguePlaceholder')}
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
          <span className="font-medium">{mostrarVistaPrevia ? t('ports.ui.formulario.seccionInicial.ocultar') : t('ports.ui.formulario.seccionInicial.mostrarVistaPrevia')}</span>
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
              {t('ports.ui.formulario.seccionInicial.vistaPreviaDocumento')}
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
              <strong>{formData.municipio || t('ports.ui.formulario.seccionInicial.vistaPrevia.fallbackCiudad')}, {formatearFechaInspeccion(formData.fecha)}</strong>
              <br />
              <span className="font-bold">{formData.codigoReferencia || 'CPD-2025-XXX'}</span>
            </p>

            {/* Datos del Contacto */}
            <div className="mb-3" style={{ color: textPrimary }}>
              <p>{formData.nombreContacto}</p>
              <p>{formData.cargoContacto}</p>
              {formData.gerenciaContacto && <p>{formData.gerenciaContacto}</p>}
              <p className="font-bold">{formData.empresaCliente}</p>
              <p>{t('ports.ui.formulario.seccionInicial.vistaPrevia.emailLabel')} {formData.emailContacto}</p>
              <p>{formData.ciudadContacto}</p>
            </div>

            {/* Título del Informe */}
            <p className="mt-4 mb-3 text-sm font-bold" style={{ color: '#DC2626' }}>
              {t('ports.ui.formulario.seccionInicial.vistaPrevia.tituloInforme', { empresa: formData.empresaCliente })}
            </p>

            {/* Párrafo de la inspección */}
            <p className="mb-3" style={{ color: textPrimary }}>
              {t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoInicio')}
              {formData.fechasInspeccion
                ? t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoFechas', { fechas: formData.fechasInspeccion })
                : t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoFechasFallback')}
              {formData.nombreMotonave
                ? t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoMotonave', { nombre: formData.nombreMotonave })
                : t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoMotonaveFallback')}
              {formData.fechaArriboMotonave
                ? t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoArribo', { fecha: formatearFechaArribo(formData.fechaArriboMotonave) })
                : ''}
              {formData.numeroVehiculos
                ? t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoVehiculos', { n: formData.numeroVehiculos })
                : ''}
              {formData.puertoDescargue
                ? t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoPuerto', { puerto: formData.puertoDescargue })
                : t('ports.ui.formulario.seccionInicial.vistaPrevia.parrafoPuertoFallback')}
            </p>

            {/* Sección de Geolocalización */}
            <p className="mt-4 mb-2 font-bold text-sm" style={{ color: '#DC2626' }}>
              {t('ports.ui.formulario.seccionInicial.geolocalizacion')}
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
                  <img src={formData.imagenMapa} alt={t('ports.ui.formulario.seccionInicial.mapaCapturadoAlt')} className="w-full rounded mb-1" />
                  <p className="text-xs text-green-600">{t('ports.ui.formulario.seccionInicial.mapaCapturado')}</p>
                </>
              ) : (
                <p className="text-xs">{t('ports.ui.formulario.seccionInicial.mapaPlaceholder')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mapa de Google Earth */}
      {!ocultarGeolocalizacion && (
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
          {t('ports.ui.formulario.seccionInicial.geolocalizacionPuerto')}
        </div>
        <div className="p-4" style={{ minHeight: '300px' }}>
          <MapaGoogleEarth 
            coordenadasIniciales={formData.coordenadasRiesgo}
            direccionInicial={formData.direccionRiesgo}
            forzarCaptura={forzarCapturaMapa}
            onMapReady={() => {
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
      )}

    </>
  );
}

