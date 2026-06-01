import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
import Select from 'react-select';
import { BASE_URL } from '../../config/apiConfig.js';
import { useTheme } from '../../context/ThemeContext';

// Componente ArchivoDropZone reutilizable (igual que en Trazabilidad)
const ArchivoDropZone = ({
  tipo,
  campo,
  onSelectFiles,
  estadoAdjunto,
  children
}) => {
  const { theme } = useTheme();
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const onFilesSelected = onSelectFiles || (() => {});

  const handleFiles = useCallback((files) => {
    const lista = Array.from(files || []);
    if (!lista.length) return;
    onFilesSelected(tipo, campo, lista);
  }, [onSelectFiles, tipo, campo]);

  const onChange = (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  const onDragOver = (event) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (event) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className="border-2 border-dashed rounded-lg p-3 sm:p-4 lg:p-6 text-center cursor-pointer transition-colors"
        style={{
          borderColor: isDragActive 
            ? (theme === 'dark' ? '#DC2626' : '#2563EB')
            : borderColor,
          backgroundColor: isDragActive 
            ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(37, 99, 235, 0.1)')
            : 'transparent'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onChange}
        />
        {children(isDragActive)}
      </div>
      {estadoAdjunto?.cargando && (
        <p className="text-xs mt-2" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }}>
          Subiendo documentos...
        </p>
      )}
      {estadoAdjunto?.error && (
        <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
          Error: {estadoAdjunto.error}
        </p>
      )}
    </div>
  );
};

const TrazabilidadRiesgo = memo(function TrazabilidadRiesgo({ 
  formData, 
  handleChange, 
  setFormData,
  onSelectFiles,
  historialDocs = [],
  cargandoAdjuntos = {},
  errorAdjuntos = {},
  ciudades = []
}) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  
  const textareaRefs = useRef({});

  const handleBlur = useCallback((e) => {
    handleChange(e);
  }, [handleChange]);

  const obtenerEstadoAdjunto = (tipo) => ({
    cargando: Boolean(cargandoAdjuntos?.[tipo]),
    error: errorAdjuntos?.[tipo]
  });

  const [bandejasAbiertas, setBandejasAbiertas] = useState({
    contactoInicial: false,
    inspeccion: false,
    informeFinal: false
  });

  const toggleBandeja = useCallback((bandeja) => {
    setBandejasAbiertas(prev => ({
      ...prev,
      [bandeja]: !prev[bandeja]
    }));
  }, []);

  // Tiempos límite para casos de riesgo
  const tiemposLimite = {
    contactoInicial: 0.5,  // 12 horas
    inspeccion: 1,         // 24 horas
    informeFinal: 2        // 2 días hábiles (simplificado a 2 días)
  };

  const tipoAFecha = {
    contactoInicial: 'fchaContIni',
    inspeccion: 'fchaInspccion',
    informeFinal: 'fchaInforme'
  };

  const parsearFecha = (fechaStr) => {
    if (!fechaStr) return null;
    
    if (typeof fechaStr === 'string' && fechaStr.includes('T')) {
      const [fechaPart] = fechaStr.split('T');
      const [year, month, day] = fechaPart.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
      const [year, month, day] = fechaStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return null;
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  };

  const obtenerFechaReferencia = (tipo) => {
    switch (tipo) {
      case 'contactoInicial':
      case 'inspeccion':
        return parsearFecha(formData.fchaAsgncion || formData.fechaAsignacion);
      case 'informeFinal':
        return parsearFecha(formData.fchaInspccion || formData.fechaInspeccion);
      default:
        return null;
    }
  };

  const calcularDiasTranscurridos = (tipo) => {
    const fechaReferencia = obtenerFechaReferencia(tipo);
    if (!fechaReferencia) return null;

    const campoFecha = tipoAFecha[tipo];
    const fechaDocumentoStr = formData[campoFecha];
    
    if (fechaDocumentoStr) {
      const fechaDocumentoLocal = parsearFecha(fechaDocumentoStr);
      if (!fechaDocumentoLocal) return null;

      const diferenciaTiempo = fechaDocumentoLocal.getTime() - fechaReferencia.getTime();
      const diferenciaHoras = diferenciaTiempo / (1000 * 3600);
      const diferenciaDias = diferenciaHoras / 24;
      
      const tiempoLimite = tiemposLimite[tipo] || 1;
      const diasRetraso = diferenciaDias > tiempoLimite ? diferenciaDias - tiempoLimite : 0;
      const mostrarHoras = (tipo === 'contactoInicial' || tipo === 'inspeccion') && diferenciaDias < 1;
      
      return {
        dias: diferenciaDias >= 0 ? diferenciaDias : 0,
        horas: diferenciaHoras >= 0 ? diferenciaHoras : 0,
        diasRetraso: diasRetraso,
        tiempoLimite: tiempoLimite,
        fecha: fechaDocumentoLocal,
        fechaReferencia: fechaReferencia,
        documentoAnterior: diferenciaDias < 0,
        esReciente: diferenciaDias <= tiempoLimite && diasRetraso === 0,
        esUrgente: diasRetraso > 0 || diferenciaDias > tiempoLimite,
        mostrarHoras: mostrarHoras,
        tieneDocumentos: false
      };
    }

    return null;
  };

  const formatearTiempoTranscurrido = (diasInfo) => {
    if (!diasInfo) return 'Sin tiempo';
    
    if (diasInfo.mostrarHoras && diasInfo.horas !== undefined) {
      const horas = Math.round(diasInfo.horas);
      if (horas === 0) return '0 horas';
      if (horas === 1) return '1 hora';
      return `${horas} horas`;
    }
    
    if (diasInfo.dias === 0) return '0 días';
    if (diasInfo.dias === 1) return '1 día';
    if (diasInfo.dias < 1) {
      const horas = Math.round((diasInfo.dias * 24));
      if (horas === 1) return '1 hora';
      return `${horas} horas`;
    }
    return `${Math.round(diasInfo.dias)} días`;
  };

  const formatearTiempoLimite = (diasInfo) => {
    if (!diasInfo || !diasInfo.tiempoLimite) return '';
    
    if (diasInfo.tiempoLimite < 1) {
      const horas = Math.round(diasInfo.tiempoLimite * 24);
      if (horas === 12) return '12 horas';
      return `${horas} horas`;
    }
    
    if (diasInfo.tiempoLimite === 1) return '1 día';
    if (diasInfo.tiempoLimite === 2) return '2 días hábiles';
    return `${diasInfo.tiempoLimite} días`;
  };

  const obtenerColorIndicador = (diasInfo) => {
    if (!diasInfo) return 'text-gray-400';
    if (diasInfo.diasRetraso > 0) return 'text-red-600';
    if (diasInfo.esReciente) return 'text-green-600';
    if (diasInfo.esUrgente) return 'text-yellow-600';
    return 'text-gray-400';
  };

  const obtenerIconoIndicador = (diasInfo) => {
    if (!diasInfo) return '⏰';
    if (diasInfo.diasRetraso > 0) return '🚨';
    if (diasInfo.esReciente) return '✅';
    if (diasInfo.esUrgente) return '⚠️';
    return '⏰';
  };

  const construirUrlDescarga = useCallback((valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('http') || valor.startsWith('data:')) return valor;
    const base = (BASE_URL || '').replace(/\/$/, '');
    const path = valor.startsWith('/') ? valor : `/${valor}`;
    return `${base}${path}`;
  }, []);

  const descargarDocumento = useCallback((documento, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const enlace = construirUrlDescarga(
      documento?.url || documento?.ruta || documento?.path || documento?.data || ''
    );
    
    if (!enlace) {
      alert('No se puede descargar el documento. URL no disponible.');
      return false;
    }

    const link = document.createElement('a');
    link.href = enlace;
    link.download = documento?.nombre || documento?.filename || 'documento';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return false;
  }, [construirUrlDescarga]);

  const obtenerDocumentosPorTipo = (tipo) => {
    if (!historialDocs || !Array.isArray(historialDocs)) return [];
    return historialDocs.filter(doc => {
      if (tipo === 'contactoInicial') {
        return doc.tipo === 'contactoInicial' || doc.categoria === 'contactoInicial';
      } else if (tipo === 'inspeccion') {
        return doc.tipo === 'inspeccion' || doc.categoria === 'inspeccion';
      } else if (tipo === 'informeFinal') {
        return doc.tipo === 'informeFinal' || doc.categoria === 'informeFinal';
      }
      return false;
    });
  };

  const DocumentosSubidos = ({ tipo, titulo }) => {
    const documentos = obtenerDocumentosPorTipo(tipo);
    if (documentos.length === 0) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2" style={{ color: textPrimary }}>
          Documentos subidos ({documentos.length}):
        </h4>
        <div className="space-y-2">
          {documentos.map((doc, idx) => {
            const tieneUrl = doc.url || doc.ruta || doc.path || doc.data;
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded border"
                style={{
                  backgroundColor: cardBg,
                  borderColor: borderColor
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: textPrimary }}>
                    📎 {doc.nombre || doc.filename || 'Documento'}
                  </p>
                  {doc.comentario && (
                    <p className="text-xs truncate" style={{ color: textSecondary }}>
                      {doc.comentario}
                    </p>
                  )}
                </div>
                {tieneUrl && (
                  <button
                    type="button"
                    onClick={(e) => descargarDocumento(doc, e)}
                    className="ml-3 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                  >
                    <span>📥</span>
                    <span>Descargar</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const BandejaDesplegable = memo(({ titulo, bandeja, children, icono, tipoDocumento, isOpen, onToggle }) => {
    const diasInfo = useMemo(() => calcularDiasTranscurridos(tipoDocumento), [tipoDocumento, formData]);
    
    return (
      <div 
        className="rounded mb-4 sm:mb-6"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left flex items-center justify-between transition-colors rounded"
          style={{
            backgroundColor: isOpen ? (theme === 'dark' ? '#2A2A2A' : '#F9FAFB') : 'transparent'
          }}
        >
          <div className="flex items-center">
            <span className="text-xl sm:text-2xl mr-2 sm:mr-3">{icono}</span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold" style={{ color: textPrimary }}>
                {titulo}
              </h3>
              {diasInfo && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-xs sm:text-sm ${obtenerColorIndicador(diasInfo)}`}>
                    {obtenerIconoIndicador(diasInfo)}
                  </span>
                  <span className={`text-xs ${obtenerColorIndicador(diasInfo)}`}>
                    {formatearTiempoTranscurrido(diasInfo)} / {formatearTiempoLimite(diasInfo)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <span 
            className="transition-transform text-sm sm:text-base" 
            style={{ 
              color: textSecondary, 
              transform: isOpen ? 'rotate(180deg)' : 'none' 
            }}
          >
            ▼
          </span>
        </button>
        
        {isOpen && (
          <div className="px-3 sm:px-4 lg:px-6 pb-4 sm:pb-6 border-t" style={{ borderColor: borderColor }}>
            {children}
            <DocumentosSubidos tipo={tipoDocumento} titulo={titulo} />
          </div>
        )}
      </div>
    );
  });

  return (
    <div 
      className="p-3 sm:p-4 lg:p-6 xl:p-8 rounded shadow max-w-5xl mx-auto"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <h2 
        className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6"
        style={{ color: textPrimary }}
      >
        📋 Trazabilidad del Caso
      </h2>
      
      {/* Campos adicionales: Ciudad Sucursal y Consecutivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
        <div>
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Ciudad Sucursal Aseguradora
          </label>
          <Select
            options={ciudades}
            value={ciudades.find(c => c.value === (formData.ciudadSucursal || formData.ciudad?.value)) || null}
            onChange={selected => setFormData(prev => ({ ...prev, ciudadSucursal: selected ? selected.value : '' }))}
            placeholder="Seleccione..."
            isClearable
            className="text-xs sm:text-sm"
            styles={{
              control: (provided, state) => ({
                ...provided,
                fontSize: '0.875rem',
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                '&:hover': {
                  borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                },
                '@media (min-width: 640px)': {
                  fontSize: '1rem'
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
              })
            }}
          />
        </div>
        <div>
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Consecutivo Aseguradora
          </label>
          <input
            type="text"
            name="nmroConsecutivo"
            value={formData.nmroConsecutivo || ''}
            onChange={handleChange}
            className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
      </div>
      
      {/* Resumen General de Trazabilidad */}
      <div 
        className="rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 border"
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)'
            : 'linear-gradient(90deg, #DBEAFE 0%, #E0E7FF 100%)',
          borderColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE'
        }}
      >
        <h3 
          className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center"
          style={{ color: textPrimary }}
        >
          📊 Resumen de Trazabilidad
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[
            { tipo: 'contactoInicial', titulo: 'Contacto Inicial', icono: '📞' },
            { tipo: 'inspeccion', titulo: 'Inspección', icono: '🔍' },
            { tipo: 'informeFinal', titulo: 'Informe Final', icono: '📋' }
          ].map(({ tipo, titulo, icono }) => {
            const diasInfo = calcularDiasTranscurridos(tipo);
            const documentos = obtenerDocumentosPorTipo(tipo);
            
            return (
              <div 
                key={tipo} 
                className="rounded-lg p-3 sm:p-4 border shadow-sm"
                style={{
                  backgroundColor: cardBg,
                  borderColor: borderColor
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg sm:text-xl">{icono}</span>
                  <span 
                    className="text-xs px-1 sm:px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F3F4F6',
                      color: textSecondary
                    }}
                  >
                    {documentos.length} docs
                  </span>
                </div>
                <h4 
                  className="text-xs sm:text-sm font-medium mb-2"
                  style={{ color: textPrimary }}
                >
                  {titulo}
                </h4>
                
                {diasInfo ? (
                  <div className={`text-center ${obtenerColorIndicador(diasInfo)}`}>
                    <div className="text-sm sm:text-lg font-bold">
                      {diasInfo.diasRetraso > 0 ? (
                        <span style={{ color: '#DC2626' }}>
                          {diasInfo.diasRetraso < 1 ? 
                            `${Math.round(diasInfo.diasRetraso * 24)} horas retraso` :
                            diasInfo.diasRetraso === 1 ? '1 día retraso' : 
                            `${Math.round(diasInfo.diasRetraso)} días retraso`}
                        </span>
                      ) : (
                        formatearTiempoTranscurrido(diasInfo)
                      )}
                    </div>
                    <div className="text-xs">
                      {diasInfo.documentoAnterior ? (
                        <span style={{ color: '#F59E0B' }}>⚠️ Doc. anterior</span>
                      ) : diasInfo.diasRetraso > 0 ? (
                        <span style={{ color: '#DC2626', fontWeight: 'bold' }}>
                          🚨 Retraso
                        </span>
                      ) : (
                        diasInfo.dias === 0 && !diasInfo.horas ? 'A tiempo' : 
                        diasInfo.dias <= diasInfo.tiempoLimite ? 'A tiempo' : 
                        'En proceso'
                      )}
                    </div>
                    {diasInfo.tiempoLimite && (
                      <div className="text-xs mt-1" style={{ color: textSecondary }}>
                        Límite: {formatearTiempoLimite(diasInfo)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center" style={{ color: textSecondary }}>
                    <div className="text-sm sm:text-lg font-bold">Sin docs</div>
                    <div className="text-xs">No hay documentos</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Indicador de estado general */}
        <div 
          className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t"
          style={{ borderColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE' }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span 
              className="text-xs sm:text-sm font-medium"
              style={{ color: textPrimary }}
            >
              Estado General:
            </span>
            <div className="flex items-center space-x-2">
              {(() => {
                const todosLosTipos = ['contactoInicial', 'inspeccion', 'informeFinal'];
                const documentosRecientes = todosLosTipos.filter(tipo => {
                  const diasInfo = calcularDiasTranscurridos(tipo);
                  return diasInfo && diasInfo.esReciente;
                }).length;
                const documentosUrgentes = todosLosTipos.filter(tipo => {
                  const diasInfo = calcularDiasTranscurridos(tipo);
                  return diasInfo && diasInfo.esUrgente;
                }).length;
                
                if (documentosUrgentes > 0) {
                  return (
                    <span className="text-red-600 text-xs sm:text-sm font-medium flex items-center">
                      🚨 {documentosUrgentes} documentos urgentes
                    </span>
                  );
                } else if (documentosRecientes >= 2) {
                  return (
                    <span className="text-green-600 text-xs sm:text-sm font-medium flex items-center">
                      ✅ Caso actualizado
                    </span>
                  );
                } else {
                  return (
                    <span className="text-yellow-600 text-xs sm:text-sm font-medium flex items-center">
                      ⚠️ Necesita atención
                    </span>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Contacto Inicial */}
      <BandejaDesplegable 
        titulo="Contacto Inicial" 
        bandeja="contactoInicial" 
        icono="📞" 
        tipoDocumento="contactoInicial"
        isOpen={bandejasAbiertas.contactoInicial}
        onToggle={() => toggleBandeja('contactoInicial')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              Fecha de Contacto Inicial
            </label>
            <input
              type="date"
              name="fchaContIni"
              value={formData.fchaContIni || formData.fechaContactoInicial || ''}
              onChange={handleChange}
              className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              Observaciones del Contacto Inicial
            </label>
            <textarea
              name="observContIni"
              ref={el => textareaRefs.current.observContIni = el}
              defaultValue={formData.observContIni || formData.observacionesContactoInicial || ''}
              onBlur={handleBlur}
              rows="3"
              className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 min-h-[80px] text-xs sm:text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Observaciones del contacto inicial..."
            />
          </div>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Adjuntos del Contacto Inicial
          </label>
          <ArchivoDropZone
            tipo="contactoInicial"
            campo="adjuntoContIni"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('contactoInicial')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="text-xs sm:text-sm" style={{ color: theme === 'dark' ? '#DC2626' : '#2563EB' }}>
                  Suelta los archivos aquí...
                </p>
              ) : (
                <p className="text-xs sm:text-sm" style={{ color: textSecondary }}>
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>

      {/* Inspección */}
      <BandejaDesplegable 
        titulo="Inspección" 
        bandeja="inspeccion" 
        icono="🔍" 
        tipoDocumento="inspeccion"
        isOpen={bandejasAbiertas.inspeccion}
        onToggle={() => toggleBandeja('inspeccion')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              Fecha de Inspección
            </label>
            <input
              type="date"
              name="fchaInspccion"
              value={formData.fchaInspccion || formData.fechaInspeccion || ''}
              onChange={handleChange}
              className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              Observaciones de la Inspección
            </label>
            <textarea
              name="observInspeccion"
              ref={el => textareaRefs.current.observInspeccion = el}
              defaultValue={formData.observInspeccion || formData.observacionesInspeccion || ''}
              onBlur={handleBlur}
              rows="3"
              className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 min-h-[80px] text-xs sm:text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Observaciones de la inspección..."
            />
          </div>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Acta de Inspección
          </label>
          <ArchivoDropZone
            tipo="inspeccion"
            campo="adjuntoInspeccion"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('inspeccion')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="text-xs sm:text-sm" style={{ color: theme === 'dark' ? '#DC2626' : '#2563EB' }}>
                  Suelta los archivos aquí...
                </p>
              ) : (
                <p className="text-xs sm:text-sm" style={{ color: textSecondary }}>
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>

      {/* Informe Final */}
      <BandejaDesplegable 
        titulo="Informe Final" 
        bandeja="informeFinal" 
        icono="📋" 
        tipoDocumento="informeFinal"
        isOpen={bandejasAbiertas.informeFinal}
        onToggle={() => toggleBandeja('informeFinal')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              Fecha del Informe Final
            </label>
            <input
              type="date"
              name="fchaInforme"
              value={formData.fchaInforme || formData.fechaInforme || ''}
              onChange={handleChange}
              className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
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
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              Observaciones del Informe Final
            </label>
            <textarea
              name="observInforme"
              ref={el => textareaRefs.current.observInforme = el}
              defaultValue={formData.observInforme || formData.observacionesInforme || ''}
              onBlur={handleBlur}
              rows="3"
              className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 min-h-[80px] text-xs sm:text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Observaciones del informe final..."
            />
          </div>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Adjunto del Informe Final
          </label>
          <ArchivoDropZone
            tipo="informeFinal"
            campo="anxoInfoFnal"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('informeFinal')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="text-xs sm:text-sm" style={{ color: theme === 'dark' ? '#DC2626' : '#2563EB' }}>
                  Suelta los archivos aquí...
                </p>
              ) : (
                <p className="text-xs sm:text-sm" style={{ color: textSecondary }}>
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>
    </div>
  );
});

export default TrazabilidadRiesgo;

