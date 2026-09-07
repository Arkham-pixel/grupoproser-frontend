import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';
import { abrirODescargarArchivo, resolverUrlArchivo } from '../../services/storageSignedUrl.js';
import { useTheme } from '../../context/ThemeContext';
import { diasHabilesColombiaEntre } from '../../utils/festivosColombia.js';

const NS = 'risks.ui.trazabilidad_riesgo';

// Componente ArchivoDropZone reutilizable (igual que en Trazabilidad)
const ArchivoDropZone = ({
  tipo,
  campo,
  onSelectFiles,
  estadoAdjunto,
  children
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = useCallback((files) => {
    const lista = Array.from(files || []);
    if (!lista.length) return;
    const selectFiles = onSelectFiles || (() => {});
    selectFiles(tipo, campo, lista);
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
          {t(`${NS}.subiendo_docs`)}
        </p>
      )}
      {estadoAdjunto?.error && (
        <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
          {t('common.errorShort')}: {estadoAdjunto.error}
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
  const { t } = useTranslation();
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

  // Nombre legible del adjunto: File recién seleccionado o ruta/s3 ya guardada
  const nombreArchivoAdjunto = (valor) => {
    if (!valor) return '';
    if (typeof valor === 'object' && valor.name) return valor.name;
    if (typeof valor === 'string') {
      const base = valor.split('?')[0].split('/').pop() || valor;
      try {
        return decodeURIComponent(base);
      } catch {
        return base;
      }
    }
    return '';
  };

  // Fila con el adjunto actual: descargable si ya está guardado en el servidor
  const renderAdjuntoActual = (valor) => {
    const nombre = nombreArchivoAdjunto(valor);
    if (!nombre) return null;
    const estaGuardado = typeof valor === 'string';
    return (
      <div
        className="flex items-center justify-between gap-2 mt-2 px-3 py-2 rounded-md"
        style={{
          backgroundColor: theme === 'dark' ? '#111827' : '#F3F4F6',
          border: `1px solid ${borderColor}`
        }}
      >
        <span className="text-xs sm:text-sm truncate" style={{ color: textPrimary }} title={nombre}>
          📎 {nombre}
        </span>
        {estaGuardado ? (
          <button
            type="button"
            onClick={(e) => descargarDocumento({ url: valor, nombre }, e)}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
          >
            <span>📥</span>
            {t(`${NS}.descargar`)}
          </button>
        ) : (
          <span className="shrink-0 text-xs" style={{ color: theme === 'dark' ? '#FBBF24' : '#B45309' }}>
            {t(`${NS}.subira_al_guardar`)}
          </span>
        )}
      </div>
    );
  };

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
    informeFinal: 2        // 2 días hábiles
  };

  // Etapas cuyo plazo es en días hábiles (excluye fines de semana y festivos de Colombia)
  const etapasEnDiasHabiles = new Set(['informeFinal']);

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
      const diasCalendario = diferenciaHoras / 24;
      // Plazos en días hábiles: descontar sábados, domingos y festivos de Colombia.
      const diferenciaDias =
        etapasEnDiasHabiles.has(tipo) && diasCalendario >= 0
          ? diasHabilesColombiaEntre(fechaReferencia, fechaDocumentoLocal)
          : diasCalendario;

      const tiempoLimite = tiemposLimite[tipo] || 1;
      const diasRetraso = diferenciaDias > tiempoLimite ? diferenciaDias - tiempoLimite : 0;
      const mostrarHoras = (tipo === 'contactoInicial' || tipo === 'inspeccion') && diasCalendario < 1;
      
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
    if (!diasInfo) return t(`${NS}.sin_tiempo`);
    
    if (diasInfo.mostrarHoras && diasInfo.horas !== undefined) {
      const horas = Math.round(diasInfo.horas);
      return t(`${NS}.hours`, { count: horas });
    }
    
    if (diasInfo.dias < 1) {
      const horas = Math.round(diasInfo.dias * 24);
      return t(`${NS}.hours`, { count: horas });
    }
    return t(`${NS}.days`, { count: Math.round(diasInfo.dias) });
  };

  const formatearTiempoLimite = (diasInfo) => {
    if (!diasInfo || !diasInfo.tiempoLimite) return '';
    
    if (diasInfo.tiempoLimite < 1) {
      const horas = Math.round(diasInfo.tiempoLimite * 24);
      if (horas === 12) return t(`${NS}.limit_12h`);
      return t(`${NS}.hours`, { count: horas });
    }
    
    if (diasInfo.tiempoLimite === 1) return t(`${NS}.limit_1d`);
    if (diasInfo.tiempoLimite === 2) return t(`${NS}.limit_2_business`);
    return t(`${NS}.limit_days`, { count: diasInfo.tiempoLimite });
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

  const construirUrlDescarga = useCallback(async (valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('data:')) return valor;
    return (await resolverUrlArchivo(valor)) || '';
  }, []);

  const descargarDocumento = useCallback(async (documento, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const ref = documento?.ruta || documento?.url || documento?.path || documento?.data || '';
    if (!ref) {
      alert(t(`${NS}.error_descarga_url`));
      return false;
    }

    try {
      if (typeof ref === 'string' && ref.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = ref;
        link.download = documento?.nombre || documento?.filename || t(`${NS}.documento_default`);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return false;
      }
      await abrirODescargarArchivo(ref, {
        nombre: documento?.nombre || documento?.filename || t(`${NS}.documento_default`),
      });
    } catch {
      const enlace = await construirUrlDescarga(ref);
      if (!enlace) {
        alert(t(`${NS}.error_descarga_url`));
        return false;
      }
      const link = document.createElement('a');
      link.href = enlace;
      link.download = documento?.nombre || documento?.filename || t(`${NS}.documento_default`);
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return false;
  }, [construirUrlDescarga, t]);

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

  const DocumentosSubidos = ({ tipo }) => {
    const { t: tDocs } = useTranslation();
    const documentos = obtenerDocumentosPorTipo(tipo);
    if (documentos.length === 0) return null;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2" style={{ color: textPrimary }}>
          {tDocs(`${NS}.docs_subidos`, { count: documentos.length })}
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
                    📎 {doc.nombre || doc.filename || tDocs('common.document')}
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
                    <span>{tDocs(`${NS}.descargar`)}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const BandejaDesplegable = memo(({ titulo, children, icono, tipoDocumento, isOpen, onToggle }) => {
    const diasInfo = useMemo(() => calcularDiasTranscurridos(tipoDocumento), [tipoDocumento]);
    
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
            <DocumentosSubidos tipo={tipoDocumento} />
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
        {t(`${NS}.titulo`)}
      </h2>
      
      {/* Campos adicionales: Ciudad Sucursal y Consecutivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
        <div>
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            {t(`${NS}.ciudad_sucursal`)}
          </label>
          <Select
            options={ciudades}
            value={ciudades.find(c => c.value === (formData.ciudadSucursal || formData.ciudad?.value)) || null}
            onChange={selected => setFormData(prev => ({ ...prev, ciudadSucursal: selected ? selected.value : '' }))}
            placeholder={t('common.select')}
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
            {t(`${NS}.consecutivo`)}
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
          {t(`${NS}.resumen_titulo`)}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[
            { tipo: 'contactoInicial', titulo: t(`${NS}.etapa_contacto`), icono: '📞' },
            { tipo: 'inspeccion', titulo: t(`${NS}.etapa_inspeccion`), icono: '🔍' },
            { tipo: 'informeFinal', titulo: t(`${NS}.etapa_informe`), icono: '📋' }
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
                    {t(`${NS}.docs_count`, { count: documentos.length })}
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
                          {diasInfo.diasRetraso < 1
                            ? t(`${NS}.retraso_hours`, { count: Math.round(diasInfo.diasRetraso * 24) })
                            : diasInfo.diasRetraso === 1
                              ? t(`${NS}.retraso_day_one`)
                              : t(`${NS}.retraso_days`, { count: Math.round(diasInfo.diasRetraso) })}
                        </span>
                      ) : (
                        formatearTiempoTranscurrido(diasInfo)
                      )}
                    </div>
                    <div className="text-xs">
                      {diasInfo.documentoAnterior ? (
                        <span style={{ color: '#F59E0B' }}>{t(`${NS}.doc_anterior`)}</span>
                      ) : diasInfo.diasRetraso > 0 ? (
                        <span style={{ color: '#DC2626', fontWeight: 'bold' }}>
                          {t(`${NS}.retraso_label`)}
                        </span>
                      ) : (
                        diasInfo.dias === 0 && !diasInfo.horas ? t(`${NS}.a_tiempo`) :
                        diasInfo.dias <= diasInfo.tiempoLimite ? t(`${NS}.a_tiempo`) :
                        t(`${NS}.en_proceso`)
                      )}
                    </div>
                    {diasInfo.tiempoLimite && (
                      <div className="text-xs mt-1" style={{ color: textSecondary }}>
                        {t(`${NS}.limite_label`)} {formatearTiempoLimite(diasInfo)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center" style={{ color: textSecondary }}>
                    <div className="text-sm sm:text-lg font-bold">{t(`${NS}.sin_docs`)}</div>
                    <div className="text-xs">{t(`${NS}.sin_documentos`)}</div>
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
              {t(`${NS}.estado_general`)}
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
                      {t(`${NS}.docs_urgentes`, { count: documentosUrgentes })}
                    </span>
                  );
                } else if (documentosRecientes >= 2) {
                  return (
                    <span className="text-green-600 text-xs sm:text-sm font-medium flex items-center">
                      {t(`${NS}.caso_actualizado`)}
                    </span>
                  );
                } else {
                  return (
                    <span className="text-yellow-600 text-xs sm:text-sm font-medium flex items-center">
                      {t(`${NS}.necesita_atencion`)}
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
        titulo={t(`${NS}.etapa_contacto`)} 
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
              {t(`${NS}.fecha_contacto`)}
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
              {t(`${NS}.obs_contacto`)}
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
              placeholder={t(`${NS}.placeholder_obs_contacto`)}
            />
          </div>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            {t(`${NS}.adj_contacto`)}
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
                  {t(`${NS}.drop_active`)}
                </p>
              ) : (
                <p className="text-xs sm:text-sm" style={{ color: textSecondary }}>
                  {t(`${NS}.drop_idle`)}
                </p>
              )
            }
          </ArchivoDropZone>
          {renderAdjuntoActual(formData.adjuntoContIni)}
        </div>
      </BandejaDesplegable>

      {/* Inspección */}
      <BandejaDesplegable 
        titulo={t(`${NS}.etapa_inspeccion`)} 
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
              {t(`${NS}.fecha_inspeccion`)}
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
              {t(`${NS}.obs_inspeccion`)}
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
              placeholder={t(`${NS}.placeholder_obs_inspeccion`)}
            />
          </div>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            {t(`${NS}.adj_inspeccion`)}
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
                  {t(`${NS}.drop_active`)}
                </p>
              ) : (
                <p className="text-xs sm:text-sm" style={{ color: textSecondary }}>
                  {t(`${NS}.drop_idle`)}
                </p>
              )
            }
          </ArchivoDropZone>
          {renderAdjuntoActual(formData.adjuntoInspeccion)}
        </div>
      </BandejaDesplegable>

      {/* Informe Final */}
      <BandejaDesplegable 
        titulo={t(`${NS}.etapa_informe`)} 
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
              {t(`${NS}.fecha_informe`)}
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
              {t(`${NS}.obs_informe`)}
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
              placeholder={t(`${NS}.placeholder_obs_informe`)}
            />
          </div>
        </div>
        
        <div className="mb-6 sm:mb-8">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            {t(`${NS}.adj_informe`)}
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
                  {t(`${NS}.drop_active`)}
                </p>
              ) : (
                <p className="text-xs sm:text-sm" style={{ color: textSecondary }}>
                  {t(`${NS}.drop_idle`)}
                </p>
              )
            }
          </ArchivoDropZone>
          {renderAdjuntoActual(formData.anxoInfoFnal)}
        </div>
      </BandejaDesplegable>
    </div>
  );
});

export default TrazabilidadRiesgo;

