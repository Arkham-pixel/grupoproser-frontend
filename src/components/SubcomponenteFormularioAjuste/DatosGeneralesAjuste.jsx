import React, { useState, useEffect } from 'react';
import { FaUser, FaBuilding, FaMapMarkerAlt, FaCalendarAlt, FaFileAlt, FaShieldAlt, FaChevronDown } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { tituloAjuste, subtituloAjuste } from './formatoTitulosAjuste';
import { resolverFechaAsignacionDesdeCaso } from '../../utils/prefillAjusteDesdeCasoComplex';
import { obtenerFechaActualISO } from '../../utils/fechaUtils';

export default function DatosGeneralesAjuste({
  formData,
  onInputChange,
  datosMaestros = {},
  autofillState = { loading: false, partial: false, error: '' },
  mostrarResumenTablaInforme = true,
  estadoActual = 'inicial'
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  // Colores según el tema
  const bgMain = theme === 'dark' ? '#1A1A1A' : '#F5F5F7';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  
  // Colores de secciones adaptados al tema
  const sectionBlueBg = theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#DBEAFE';
  const sectionBlueText = theme === 'dark' ? '#93C5FD' : '#1E3A8A';
  const sectionRedBg = theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2';
  const sectionRedText = theme === 'dark' ? '#FCA5A5' : '#991B1B';
  const sectionGreenBg = theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#D1FAE5';
  const sectionGreenText = theme === 'dark' ? '#86EFAC' : '#065F46';
  const sectionPurpleBg = theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF';
  const sectionPurpleText = theme === 'dark' ? '#C084FC' : '#6B21A8';
  const sectionYellowBg = theme === 'dark' ? 'rgba(234, 179, 8, 0.15)' : '#FEF9C3';
  const sectionYellowText = theme === 'dark' ? '#FDE047' : '#854D0E';
  const [sugerenciasIA, setSugerenciasIA] = useState({
    ciudad: [],
    aseguradora: [],
    intermediario: [],
    tipoEvento: []
  });
  const [dropdownsAbiertos, setDropdownsAbiertos] = useState({});
  const [filtros, setFiltros] = useState({
    ciudad: '',
    aseguradora: '',
    intermediario: ''
  });

  const fechaAsignacionValor = resolverFechaAsignacionDesdeCaso(formData);
  const fechaAsignacionDesdeComplex = Boolean(
    formData.metadata?.fechaAsignacion || formData.metadata?.complexId
  );

  const DEPARTAMENTOS_CO = [
    'Antioquia', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Cauca',
    'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira',
    'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
  ];

  const normalizarTexto = (valor) =>
    String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

  const valorDepartamentoSeleccionado = (() => {
    const actual = formData.departamento || '';
    if (!actual) return '';
    const match = DEPARTAMENTOS_CO.find((d) => normalizarTexto(d) === normalizarTexto(actual));
    return match || actual;
  })();

  // Función para generar sugerencias IA
  const generarSugerenciasIA = (campo, valor) => {
    if (!valor || valor.length < 2) {
      setSugerenciasIA(prev => ({ ...prev, [campo]: [] }));
      return;
    }

    // Simular sugerencias basadas en patrones
    const sugerencias = {
      tipoEvento: (datosMaestros.tiposEvento || []).filter(tipo => 
        tipo.toLowerCase().includes(valor.toLowerCase())
      ),
      intermediario: (datosMaestros.intermediarios || []).filter(inter => 
        inter.toLowerCase().includes(valor.toLowerCase())
      ),
      ciudad: (datosMaestros.ciudades || []).filter(ciudad => 
        ciudad.nombre && ciudad.nombre.toLowerCase().includes(valor.toLowerCase())
      ).slice(0, 8),
      aseguradora: (datosMaestros.aseguradoras || []).filter(aseg => 
        aseg.nombre && aseg.nombre.toLowerCase().includes(valor.toLowerCase())
      ).slice(0, 8)
    };

    setSugerenciasIA(prev => ({
      ...prev,
      [campo]: sugerencias[campo] || []
    }));
  };

  const aplicarSugerencia = (campo, valor) => {
    onInputChange(campo, valor);
    setSugerenciasIA(prev => ({ ...prev, [campo]: [] }));
    setDropdownsAbiertos(prev => ({ ...prev, [campo]: false }));
  };

  const toggleDropdown = (campo) => {
    setDropdownsAbiertos(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
  };

  const cerrarDropdowns = () => {
    setDropdownsAbiertos({});
    setSugerenciasIA({
      ciudad: [],
      aseguradora: [],
      intermediario: [],
      tipoEvento: []
    });
  };

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => cerrarDropdowns();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <div 
        className="pb-4"
        style={{
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-2xl font-bold flex items-center"
          style={{ color: textPrimary }}
        >
          <FaFileAlt 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
          />
          {tituloAjuste(t('adjustment.ui.datosGenerales.title'))}
        </h2>
        <p 
          className="mt-2"
          style={{ color: textSecondary }}
        >
          {subtituloAjuste(t('adjustment.ui.datosGenerales.subtitle'))}
        </p>
        {!!autofillState.error && (
          <p className="mt-2 text-sm" style={{ color: '#DC2626' }}>
            {autofillState.error}
          </p>
        )}
        {autofillState.partial && !autofillState.error && (
          <p className="mt-2 text-sm" style={{ color: theme === 'dark' ? '#FCD34D' : '#92400E' }}>
            {t('adjustment.ui.datosGenerales.partialAutofill')}
          </p>
        )}
      </div>

      {/* Información del destinatario */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: sectionBlueBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: sectionBlueText }}
        >
          <FaUser className="mr-2" />
          {tituloAjuste(t('adjustment.ui.datosGenerales.recipientInfo'))}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.recipient')}
            </label>
            <input
              type="text"
              value={formData.destinatario || ''}
              onChange={(e) => onInputChange('destinatario', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.recipientPlaceholder')}
            />
          </div>
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.position')}
            </label>
            <input
              type="text"
              value={formData.cargo || ''}
              onChange={(e) => onInputChange('cargo', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.positionPlaceholder')}
            />
          </div>
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.company')}
            </label>
            <input
              type="text"
              value={formData.empresa || ''}
              onChange={(e) => onInputChange('empresa', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.companyPlaceholder')}
            />
          </div>
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.address')}
            </label>
            <input
              type="text"
              value={formData.direccion || ''}
              onChange={(e) => onInputChange('direccion', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.addressPlaceholder')}
            />
          </div>
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.city')}
            </label>
            <input
              type="text"
              value={formData.ciudad || ''}
              onChange={(e) => onInputChange('ciudad', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.cityPlaceholder')}
            />
          </div>
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.phone')}
            </label>
            <input
              type="tel"
              value={formData.telefono || ''}
              onChange={(e) => onInputChange('telefono', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.phonePlaceholder')}
            />
          </div>
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.email')}
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => onInputChange('email', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.emailPlaceholder')}
            />
          </div>
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.destinationCity')}
            </label>
            <input
              type="text"
              value={formData.ciudadDestino || ''}
              onChange={(e) => onInputChange('ciudadDestino', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.destinationCity')}
            />
          </div>
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.destinationCountry')}
            </label>
            <input
              type="text"
              value={formData.paisDestino || ''}
              onChange={(e) => onInputChange('paisDestino', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.destinationCountry')}
            />
          </div>
        </div>
      </div>

      {/* Información del siniestro */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: sectionRedBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: sectionRedText }}
        >
          <FaShieldAlt className="mr-2" />
          {tituloAjuste(t('adjustment.ui.datosGenerales.claimInfo'))}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.claimNumber')}
            </label>
            <input
              type="text"
              value={formData.numeroSiniestro || ''}
              onChange={(e) => onInputChange('numeroSiniestro', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.claimNumberPlaceholder')}
              required
            />
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.occurrenceDate')}
            </label>
            <input
              type="date"
              value={formData.fechaOcurrencia || ''}
              onChange={(e) => onInputChange('fechaOcurrencia', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              required
            />
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.occurrenceTime')}
            </label>
            <input
              type="time"
              value={formData.horaOcurrencia || ''}
              onChange={(e) => onInputChange('horaOcurrencia', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
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
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.eventType')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.tipoEvento || ''}
                onChange={(e) => {
                  onInputChange('tipoEvento', e.target.value);
                  generarSugerenciasIA('tipoEvento', e.target.value);
                }}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
                placeholder={t('adjustment.ui.datosGenerales.eventTypePlaceholder')}
                required
              />
              {sugerenciasIA.tipoEvento && sugerenciasIA.tipoEvento.length > 0 && (
                <div 
                  className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  style={{
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  {sugerenciasIA.tipoEvento.map((tipo, index) => (
                    <button
                      key={index}
                      onClick={() => aplicarSugerencia('tipoEvento', tipo)}
                      className="w-full text-left px-3 py-2 focus:outline-none"
                      style={{
                        color: textPrimary,
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.assigningOfficer')}
            </label>
            <input
              type="text"
              value={formData.funcionarioAsigna || ''}
              onChange={(e) => onInputChange('funcionarioAsigna', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.assigningOfficerPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Información de la póliza */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: sectionGreenBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: sectionGreenText }}
        >
          <FaFileAlt className="mr-2" />
          {tituloAjuste(t('adjustment.ui.datosGenerales.policyInfo'))}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.policyNumber')}
            </label>
            <input
              type="text"
              value={formData.numeroPoliza || ''}
              onChange={(e) => onInputChange('numeroPoliza', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.policyNumberPlaceholder')}
              required
            />
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.insurer')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.aseguradora || ''}
                onChange={(e) => {
                  onInputChange('aseguradora', e.target.value);
                  generarSugerenciasIA('aseguradora', e.target.value);
                }}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
                placeholder={t('adjustment.ui.datosGenerales.insurerPlaceholder')}
                required
              />
              {sugerenciasIA.aseguradora && sugerenciasIA.aseguradora.length > 0 && (
                <div 
                  className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  style={{
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  {sugerenciasIA.aseguradora.map((aseg, index) => (
                    <button
                      key={index}
                      onClick={() => aplicarSugerencia('aseguradora', aseg.nombre)}
                      className="w-full text-left px-3 py-2 focus:outline-none"
                      style={{
                        color: textPrimary,
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="font-medium">{aseg.nombre}</div>
                      <div 
                        className="text-sm"
                        style={{ color: textSecondary }}
                      >
                        {t('adjustment.ui.datosGenerales.officialsCount', {
                          count: aseg.funcionarios ? aseg.funcionarios.length : 0
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.branch')}
            </label>
            <input
              type="text"
              value={formData.ramo || ''}
              onChange={(e) => onInputChange('ramo', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.branchPlaceholder')}
            />
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.activity')}
            </label>
            <input
              type="text"
              value={formData.actividad || ''}
              onChange={(e) => onInputChange('actividad', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.activityPlaceholder')}
            />
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.validityFrom')}
            </label>
            <input
              type="date"
              value={formData.vigenciaDesde || ''}
              onChange={(e) => onInputChange('vigenciaDesde', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
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
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.validityTo')}
            </label>
            <input
              type="date"
              value={formData.vigenciaHasta || ''}
              onChange={(e) => onInputChange('vigenciaHasta', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
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

      {/* Información de las partes */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: sectionPurpleBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: sectionPurpleText }}
        >
          <FaUser className="mr-2" />
          {tituloAjuste(t('adjustment.ui.datosGenerales.partiesInfo'))}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.insured')}
            </label>
            <input
              type="text"
              value={formData.asegurado || ''}
              onChange={(e) => onInputChange('asegurado', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.insuredPlaceholder')}
              required
            />
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.policyholder')}
            </label>
            <input
              type="text"
              value={formData.tomador || ''}
              onChange={(e) => onInputChange('tomador', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.policyholderPlaceholder')}
            />
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.beneficiary')}
            </label>
            <input
              type="text"
              value={formData.beneficiario || ''}
              onChange={(e) => onInputChange('beneficiario', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.beneficiaryPlaceholder')}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.documentType')}
            </label>
            <input
              type="text"
              value={formData.metadata?.tipoDocumento || ''}
              onChange={(e) => onInputChange('metadataTipoDocumento', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.documentTypePlaceholder')}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.documentNumber')}
            </label>
            <input
              type="text"
              value={formData.identificacionActa || formData.metadata?.numeroDocumento || ''}
              onChange={(e) => onInputChange('identificacionActa', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.documentNumberPlaceholder')}
            />
          </div>

          <div className="md:col-span-2">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {subtituloAjuste(t('adjustment.ui.datosGenerales.intermediary'))}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.metadata?.intermediario || ''}
                onChange={(e) => {
                  onInputChange('metadataIntermediario', e.target.value);
                  generarSugerenciasIA('intermediario', e.target.value);
                }}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                placeholder={t('adjustment.ui.datosGenerales.intermediaryPlaceholder')}
              />
              {sugerenciasIA.intermediario?.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-48 overflow-y-auto"
                  style={{
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  {sugerenciasIA.intermediario.map((nombre, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        onInputChange('metadataIntermediario', nombre);
                        cerrarDropdowns();
                      }}
                      className="w-full text-left px-3 py-2 focus:outline-none"
                      style={{ color: textPrimary, backgroundColor: 'transparent' }}
                    >
                      {nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ubicación del Riesgo */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: textPrimary }}
        >
          <FaMapMarkerAlt 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          />
          {t('adjustment.ui.datosGenerales.riskLocation')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.riskAddress')}
            </label>
            <input
              type="text"
              value={formData.direccionRiesgo || ''}
              onChange={(e) => onInputChange('direccionRiesgo', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.riskAddressPlaceholder')}
              required
            />
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.riskCity')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.ciudad || ''}
                onChange={(e) => {
                  onInputChange('ciudad', e.target.value);
                  generarSugerenciasIA('ciudad', e.target.value);
                }}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
                placeholder={t('adjustment.ui.datosGenerales.riskCityPlaceholder')}
                required
              />
              {sugerenciasIA.ciudad && sugerenciasIA.ciudad.length > 0 && (
                <div 
                  className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  style={{
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  {sugerenciasIA.ciudad.map((ciudad, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        onInputChange('ciudad', ciudad.nombre);
                        setSugerenciasIA(prev => ({ ...prev, ciudad: [] }));
                      }}
                      className="w-full text-left px-3 py-2 focus:outline-none"
                      style={{
                        color: textPrimary,
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      {ciudad.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.department')}
            </label>
            <select
              value={valorDepartamentoSeleccionado}
              onChange={(e) => onInputChange('departamento', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              required
            >
              <option value="">{t('adjustment.ui.datosGenerales.selectDepartment')}</option>
              {DEPARTAMENTOS_CO.map((dep) => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.postalCode')}
            </label>
            <input
              type="text"
              value={formData.codigoPostal || ''}
              onChange={(e) => onInputChange('codigoPostal', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder={t('adjustment.ui.datosGenerales.postalCodePlaceholder')}
            />
          </div>
        </div>
      </div>

      {mostrarResumenTablaInforme && (
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: sectionYellowBg,
            border: `1px solid ${borderColor}`
          }}
        >
          <h3
            className="text-lg font-semibold mb-1"
            style={{ color: sectionYellowText }}
          >
            {tituloAjuste(t('adjustment.ui.datosGenerales.tableSummary'))}
          </h3>
          <p className="text-sm mb-4" style={{ color: textSecondary }}>
            {subtituloAjuste(t('adjustment.ui.datosGenerales.tableSummaryHint'))}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
                {subtituloAjuste(t('adjustment.ui.datosGenerales.recovery'))}
              </label>
              <input
                type="text"
                value={formData.tablaRecobro || ''}
                onChange={(e) => onInputChange('tablaRecobro', e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  border: `1px solid ${borderColor}`
                }}
                placeholder={t('adjustment.ui.datosGenerales.recoveryPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
                {subtituloAjuste(t('adjustment.ui.datosGenerales.salvage'))}
              </label>
              <input
                type="text"
                value={formData.tablaSalvamento || ''}
                onChange={(e) => onInputChange('tablaSalvamento', e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  border: `1px solid ${borderColor}`
                }}
                placeholder={t('adjustment.ui.datosGenerales.salvagePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
                {subtituloAjuste(t('adjustment.ui.datosGenerales.underinsurance'))}
              </label>
              <input
                type="text"
                value={formData.tablaInfraseguro || ''}
                onChange={(e) => onInputChange('tablaInfraseguro', e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  border: `1px solid ${borderColor}`
                }}
                placeholder={t('adjustment.ui.datosGenerales.underinsurancePlaceholder')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fechas importantes */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: sectionYellowBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: sectionYellowText }}
        >
          <FaCalendarAlt className="mr-2" />
          {t('adjustment.ui.datosGenerales.importantDates')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.occurrenceDateLabel')}
            </label>
            <input
              type="date"
              value={formData.fechaOcurrencia || ''}
              onChange={(e) => onInputChange('fechaOcurrencia', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
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
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {tituloAjuste(t('adjustment.ui.datosGenerales.assignmentDate'))}
            </label>
            <input
              type="date"
              value={fechaAsignacionValor}
              onChange={(e) => onInputChange('fechaReporte', e.target.value)}
              readOnly={fechaAsignacionDesdeComplex}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
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
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              {t('adjustment.ui.datosGenerales.inspectionDateLabel')}
            </label>
            <input
              type="date"
              value={formData.fechaInspeccion || ''}
              onChange={(e) => onInputChange('fechaInspeccion', e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
            />
          </div>
          {(estadoActual === 'actualizacion' || estadoActual === 'informeFinal') && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: textPrimary }}
              >
                {tituloAjuste(t('adjustment.ui.datosGenerales.updateDate'))}
              </label>
              <input
                type="date"
                value={formData.fechaActualizacion || obtenerFechaActualISO()}
                onChange={(e) => onInputChange('fechaActualizacion', e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
              />
            </div>
          )}
          {estadoActual === 'informeFinal' && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: textPrimary }}
              >
                {tituloAjuste(t('adjustment.ui.datosGenerales.finalReportDate'))}
              </label>
              <input
                type="date"
                value={formData.fechaInformeFinal || obtenerFechaActualISO()}
                onChange={(e) => onInputChange('fechaInformeFinal', e.target.value)}
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
