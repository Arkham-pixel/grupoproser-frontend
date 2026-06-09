import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { formatearFechaUI } from '../../utils/fechaUtils';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';
import { isStoredFileReference } from '../../utils/storedFilePath.js';
import historialService from '../../services/historialService.js';
import {
  complexAlertError,
  complexBadge,
  complexBtnSecondary,
  complexCard,
  complexDocRow,
  complexDropzoneActive,
  complexDropzoneBase,
  complexHint,
  complexMetricCard,
  complexPageWrap,
  complexSectionTitle,
  complexSubsectionTitle,
  complexTableBtnNeutral,
} from './complexFenixUi';
import {
  ETAPAS_TRAZABILIDAD,
  EstadoGeneralTrazabilidad,
  TrazabilidadChevron,
  TrazabilidadIconoEtapa,
  TrazabilidadIndicadorIcono,
  trazabilidadColorClase,
  trazabilidadInputClass,
  trazabilidadLabelClass,
} from './trazabilidadFenixUi';

const ArchivoDropZone = ({
  tipo,
  campo,
  onSelectFiles,
  estadoAdjunto,
  children
}) => {
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const onFilesSelected = onSelectFiles || (() => {});

  const handleFiles = useCallback((files) => {
    const lista = Array.from(files || []);
    if (!lista.length) return;
    onFilesSelected(tipo, campo, lista);
  }, [onFilesSelected, tipo, campo]);

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

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`${complexDropzoneBase} p-3 sm:p-4 lg:p-6 ${isDragActive ? complexDropzoneActive : ''}`}
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
        <p className={complexHint}>Subiendo documentos...</p>
      )}
      {estadoAdjunto?.error && (
        <p className={complexAlertError}>Error: {estadoAdjunto.error}</p>
      )}
    </div>
  );
};

const Trazabilidad = memo(function Trazabilidad({ 
  formData, 
  handleChange, 
  onSelectFiles,
  historialDocs,
  cargandoAdjuntos = {},
  errorAdjuntos = {}
}) {
  // Refs para los textareas
  const textareaRefs = useRef({});

  // Handler que actualiza el padre solo cuando pierde el foco
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    // Actualizar formData del padre solo cuando pierde el foco
    handleChange(e);
  }, [handleChange]);

  const obtenerEstadoAdjunto = (tipo) => ({
    cargando: Boolean(cargandoAdjuntos?.[tipo]),
    error: errorAdjuntos?.[tipo]
  });

  const iconoPorTipo = useMemo(
    () => Object.fromEntries(ETAPAS_TRAZABILIDAD.map((e) => [e.tipo, e.Icon])),
    []
  );
  const [bandejasAbiertas, setBandejasAbiertas] = useState({
    contactoInicial: false,
    coordinacionInspeccion: false,
    inspeccion: false,
    solicitudDocs: false,
    informePreliminar: false,
    informeFinal: false,
    ultimoDocumento: false,
    presentacionCifras: false,
    envioFiniquito: false
  });

  const toggleBandeja = useCallback((bandeja) => {
    setBandejasAbiertas(prev => ({
      ...prev,
      [bandeja]: !prev[bandeja]
    }));
  }, []);

  // Tiempos límite según las nuevas reglas:
  // C.INICIAL: 12 horas hábiles desde asignación
  // Coordinación de Inspección: Sin tiempo límite (solo informativo)
  // Inspección: 24 horas desde fecha programada de inspección (o asignación si no hay coordinación)
  // Solicitud de documentos: 24 horas después de inspección
  // Informe preliminar: 24 horas después de inspección
  // Último documento: 3 días después del informe preliminar
  // Informe final: 3 días después del último documento
  // Presentación de cifras: 24 horas después de último documento
  // Envío de finiquito: 24 horas después de último documento
  const tiemposLimite = {
    contactoInicial: 0.5,  // 12 horas hábiles (0.5 días aproximado)
    coordinacionInspeccion: null, // Sin tiempo límite
    inspeccion: 1,         // 24 horas (1 día)
    solicitudDocs: 1,      // 24 horas después de inspección
    informePreliminar: 1,  // 24 horas después de inspección
    ultimoDocumento: 3,    // 3 días después del informe preliminar
    informeFinal: 3,       // 3 días después del último documento
    presentacionCifras: 1, // 24 horas después de último documento
    envioFiniquito: 1      // 24 horas después de último documento
  };

  // Mapeo de tipos a campos de fecha en formData
  // NOTA: Cada fecha puede colocarse independientemente, sin requerir fechas o documentos anteriores
  const tipoAFecha = {
    contactoInicial: 'fchaContIni',
    coordinacionInspeccion: 'fchaCoordInspeccion', // Fecha de llamada
    inspeccion: 'fchaInspccion',
    solicitudDocs: 'fchaSoliDocu',
    informePreliminar: 'fchaInfoPrelm',
    informeFinal: 'fchaInfoFnal',
    ultimoDocumento: 'fchaRepoActi',
    presentacionCifras: 'fchaPresentacionCifras',
    envioFiniquito: 'fchaEnvioFiniquito'
  };

  // Función auxiliar para parsear fechas
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

  // Función para obtener la fecha de referencia según el tipo de documento
  const obtenerFechaReferencia = (tipo) => {
    switch (tipo) {
      case 'contactoInicial':
        // Se calcula desde fecha de asignación
        return parsearFecha(formData.fchaAsgncion);
      
      case 'coordinacionInspeccion':
        // Se calcula desde fecha de asignación (no tiene tiempo límite)
        return parsearFecha(formData.fchaAsgncion);
      
      case 'inspeccion':
        // Se calcula desde fecha programada de inspección si existe, sino desde asignación
        return parsearFecha(formData.fchaProgInspeccion) || parsearFecha(formData.fchaAsgncion);
      
      case 'solicitudDocs':
      case 'informePreliminar':
        // Preferimos fecha de inspección. Si no existe, usamos eslabones
        // anteriores de la cadena para que el conteo no quede "Sin docs".
        return (
          parsearFecha(formData.fchaInspccion) ||
          parsearFecha(formData.fchaCoordInspeccion) ||
          parsearFecha(formData.fchaAsgncion) ||
          parsearFecha(formData.fchaInfoPrelm)
        );

      case 'ultimoDocumento':
        // Cadena: preliminar → inspección → coordinación → asignación → propia.
        return (
          parsearFecha(formData.fchaInfoPrelm) ||
          parsearFecha(formData.fchaInspccion) ||
          parsearFecha(formData.fchaCoordInspeccion) ||
          parsearFecha(formData.fchaAsgncion) ||
          parsearFecha(formData.fchaRepoActi)
        );

      case 'informeFinal':
        // Cadena: último documento → preliminar → inspección → asignación → propia.
        return (
          parsearFecha(formData.fchaRepoActi) ||
          parsearFecha(formData.fchaInfoPrelm) ||
          parsearFecha(formData.fchaInspccion) ||
          parsearFecha(formData.fchaAsgncion) ||
          parsearFecha(formData.fchaInfoFnal)
        );
      
      case 'presentacionCifras':
      case 'envioFiniquito':
        // Ambos se calculan desde fecha del último documento
        return parsearFecha(formData.fchaRepoActi);
      
      default:
        return null;
    }
  };

  // Función para calcular días transcurridos basándose en fechas de referencia específicas
  const calcularDiasTranscurridos = (tipo) => {
    // Obtener la fecha de referencia según el tipo de documento
    const fechaReferencia = obtenerFechaReferencia(tipo);
    if (!fechaReferencia) {
      return null; // No hay fecha de referencia, no se puede calcular
    }

    // Obtener la fecha del documento que el usuario colocó en el formulario
    const campoFecha = tipoAFecha[tipo];
    const fechaDocumentoStr = formData[campoFecha];
    
    // Si hay fecha del documento en el formulario, usarla
    if (fechaDocumentoStr) {
      const fechaDocumentoLocal = parsearFecha(fechaDocumentoStr);
      if (!fechaDocumentoLocal) {
        return null; // Fecha del documento inválida
      }

      // Calcular diferencia en horas primero (para manejar horas hábiles)
      const diferenciaTiempo = fechaDocumentoLocal.getTime() - fechaReferencia.getTime();
      const diferenciaHoras = diferenciaTiempo / (1000 * 3600);
      const diferenciaDias = diferenciaHoras / 24;
      
      // Obtener tiempo límite para este tipo de documento
      const tiempoLimite = tiemposLimite[tipo];
      
      // Si no tiene tiempo límite (como coordinacionInspeccion), no calcular retraso
      if (tiempoLimite === null || tiempoLimite === undefined) {
        return {
          dias: diferenciaDias >= 0 ? diferenciaDias : 0,
          horas: diferenciaHoras >= 0 ? diferenciaHoras : 0,
          diasRetraso: 0,
          tiempoLimite: null,
          fecha: fechaDocumentoLocal,
          fechaReferencia: fechaReferencia,
          documentoAnterior: diferenciaDias < 0,
          esReciente: true,
          esUrgente: false,
          tieneDocumentos: false,
          mostrarHoras: diferenciaDias < 1
        };
      }
      
      // Calcular retraso (si la fecha del documento excede el tiempo límite)
      const diasRetraso = diferenciaDias > tiempoLimite ? diferenciaDias - tiempoLimite : 0;
      
      // Para contacto inicial e inspección, mostrar horas si es menos de 1 día
      const mostrarHoras = (tipo === 'contactoInicial' || tipo === 'inspeccion' || tipo === 'coordinacionInspeccion') && diferenciaDias < 1;
      
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
        tieneDocumentos: false,
        mostrarHoras: mostrarHoras
      };
    }

    // Si no hay fecha del documento, verificar si hay documentos subidos
    const documentos = obtenerDocumentosPorTipo(tipo);
    
    if (documentos.length === 0) {
      return null; // No hay fecha ni documentos
    }

    // Si hay documentos pero no fecha del formulario, usar la fecha de subida más reciente
    const fechas = documentos
      .map(doc => parsearFecha(doc.fechaSubida || doc.fecha || doc.fechaCreacion))
      .filter(fecha => fecha !== null);

    if (fechas.length === 0) {
      return null;
    }

    const fechaMasReciente = new Date(Math.max(...fechas.map(f => f.getTime())));
    const fechaMasRecienteLocal = new Date(fechaMasReciente.getFullYear(), fechaMasReciente.getMonth(), fechaMasReciente.getDate());
    
    const diferenciaTiempo = fechaMasRecienteLocal.getTime() - fechaReferencia.getTime();
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
      fecha: fechaMasRecienteLocal,
      fechaReferencia: fechaReferencia,
      documentoAnterior: diferenciaDias < 0,
      esReciente: diferenciaDias <= tiempoLimite && diasRetraso === 0,
      esUrgente: diasRetraso > 0 || diferenciaDias > tiempoLimite,
      tieneDocumentos: true,
      mostrarHoras: mostrarHoras
    };
  };

  // Función para formatear el tiempo transcurrido (horas o días)
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

  // Función para formatear el tiempo límite
  const formatearTiempoLimite = (diasInfo) => {
    if (!diasInfo || diasInfo.tiempoLimite === null || diasInfo.tiempoLimite === undefined) return 'Sin límite';
    
    if (diasInfo.tiempoLimite < 1) {
      const horas = Math.round(diasInfo.tiempoLimite * 24);
      if (horas === 12) return '12 horas';
      return `${horas} horas`;
    }
    
    if (diasInfo.tiempoLimite === 1) return '1 día';
    return `${diasInfo.tiempoLimite} días`;
  };

  const diasRespuestaAseguradoraCifra = useMemo(() => {
    const dPres = parsearFecha(formData.fchaPresentacionCifras);
    const dAcep = parsearFecha(formData.fchaAceptacionCifrasAseguradora);
    if (!dPres || !dAcep) return null;
    const ms = dAcep.getTime() - dPres.getTime();
    if (ms < 0) return null;
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }, [formData.fchaPresentacionCifras, formData.fchaAceptacionCifrasAseguradora]);

  // Función para construir URL de descarga
  const construirUrlDescarga = useCallback((valor) => {
    if (!valor || typeof valor !== 'string') return '';
    if (valor.startsWith('data:')) return valor;
    // getUploadsUrlCandidates repara URLs antiguas tipo "https://backend/s3:..." vía proxy
    const candidates = getUploadsUrlCandidates(valor);
    return candidates[0] || '';
  }, []);

  const navigate = useNavigate();

  // Navega al formulario de ajuste asociado al documento.
  // Pasa el "tipo" como hint para que FormularioAjuste abra la pestaña correcta
  // (inspeccion → acta, informePreliminar, ultimoDocumento, informeFinal).
  const editarFormulario = useCallback((documento, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    }

    const formularioId = documento?.formularioId || documento?.idHistorial || documento?.historialId;
    if (!formularioId) {
      alert('No se puede editar este documento: no tiene un identificador de formulario asociado.');
      return false;
    }

    navigate(`/ajuste/editar/${formularioId}`, {
      state: {
        estadoInicial: documento?.tipo || documento?.categoria || '',
        numeroAjuste: documento?.numeroAjuste || '',
        origen: 'trazabilidad'
      }
    });
    return false;
  }, [navigate]);

  // Función para descargar documentos (mejorada)
  const descargarDocumento = useCallback((documento, event) => {
    // Prevenir que el evento se propague y dispare el submit del formulario
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.(); // Si está disponible, detener inmediatamente
    }
    
    // Preferir la ruta concreta del documento (cada versión apunta a su propio .docx).
    // Solo si no hay ruta directa, usar el endpoint protegido por formularioId.
    const rutaDirecta = documento?.url || documento?.ruta || documento?.path || documento?.data || '';
    const esRutaAlmacenada = isStoredFileReference(rutaDirecta);
    const esRutaAbsoluta = typeof rutaDirecta === 'string' && /^https?:\/\//.test(rutaDirecta);

    if (!esRutaAlmacenada && !esRutaAbsoluta && documento?.formularioId) {
      historialService.descargarFormulario(documento.formularioId).catch((error) => {
        alert(error?.message || 'No se pudo descargar el documento.');
      });
      return false;
    }

    const enlace = construirUrlDescarga(
      rutaDirecta ||
      (documento?.formularioId ? `/api/historial-formularios/${documento.formularioId}/descargar` : '') ||
      ''
    );
    
    if (!enlace) {
      alert('No se puede descargar el documento. URL no disponible.');
      return false; // Retornar false para prevenir cualquier acción adicional
    }

    const descargarConLink = () => {
      const link = document.createElement('a');
      link.href = enlace;
      link.download = documento?.nombre || documento?.filename || 'documento';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Si es endpoint protegido de historial, descargar con token para evitar "Sin URL" o 401 silencioso.
    if (enlace.includes('/api/historial-formularios/') && enlace.includes('/descargar')) {
      const token = localStorage.getItem('token');
      fetch(enlace, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = documento?.nombre || documento?.filename || 'documento';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        })
        .catch(() => descargarConLink());
    } else {
      descargarConLink();
    }
    
    return false; // Retornar false para prevenir cualquier acción adicional
  }, [construirUrlDescarga]);

  // Función para obtener documentos por tipo
  const obtenerDocumentosPorTipo = (tipo) => {
    if (!historialDocs || !Array.isArray(historialDocs)) return [];
    
    return historialDocs.filter(doc => {
      // Filtrar por tipo de documento o por el campo que corresponda
      if (tipo === 'contactoInicial') {
        return doc.tipo === 'contactoInicial' || doc.categoria === 'contactoInicial';
      } else if (tipo === 'coordinacionInspeccion') {
        return doc.tipo === 'coordinacionInspeccion' || doc.categoria === 'coordinacionInspeccion';
      } else if (tipo === 'inspeccion') {
        return doc.tipo === 'inspeccion' || doc.categoria === 'inspeccion';
      } else if (tipo === 'solicitudDocs') {
        return doc.tipo === 'solicitudDocs' || doc.categoria === 'solicitudDocs';
      } else if (tipo === 'informePreliminar') {
        return doc.tipo === 'informePreliminar' || doc.categoria === 'informePreliminar';
      } else if (tipo === 'informeFinal') {
        return doc.tipo === 'informeFinal' || doc.categoria === 'informeFinal';
      } else if (tipo === 'ultimoDocumento') {
        return doc.tipo === 'ultimoDocumento' || doc.categoria === 'ultimoDocumento';
      } else if (tipo === 'presentacionCifras') {
        return doc.tipo === 'presentacionCifras' || doc.categoria === 'presentacionCifras';
      } else if (tipo === 'envioFiniquito') {
        return doc.tipo === 'envioFiniquito' || doc.categoria === 'envioFiniquito';
      }
      return false;
    });
  };

  // Componente para mostrar documentos subidos (mejorado)
  const DocumentosSubidos = ({ tipo, titulo }) => {
    const documentos = obtenerDocumentosPorTipo(tipo);
    const diasInfo = calcularDiasTranscurridos(tipo);
    
    if (documentos.length === 0) {
      return (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-center dark:border-gray-800 dark:bg-gray-900/40">
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">
            No hay documentos subidos para {titulo}
          </p>
          <p className={`${complexHint} mt-1`}>Sin documentos</p>
        </div>
      );
    }

    return (
      <div className="mt-4">
        {/* Indicador de días transcurridos */}
        {diasInfo && (
          <div className="mb-4 rounded-xl border border-gray-100 border-l-4 border-l-gray-400 bg-gray-50/80 p-3 dark:border-gray-800 dark:border-l-gray-500 dark:bg-gray-900/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <TrazabilidadIndicadorIcono diasInfo={diasInfo} />
                <span className="font-body text-sm font-medium text-gray-700 dark:text-gray-300">
                  Último documento subido:
                </span>
                <span className="font-body text-sm text-gray-600 dark:text-gray-400">
                  {diasInfo.fechaReferencia && (() => {
                    const year = diasInfo.fechaReferencia.getFullYear();
                    const month = String(diasInfo.fechaReferencia.getMonth() + 1).padStart(2, '0');
                    const day = String(diasInfo.fechaReferencia.getDate()).padStart(2, '0');
                    return `Referencia: ${day}/${month}/${year}`;
                  })()}
                  {diasInfo.fecha && (() => {
                    const year = diasInfo.fecha.getFullYear();
                    const month = String(diasInfo.fecha.getMonth() + 1).padStart(2, '0');
                    const day = String(diasInfo.fecha.getDate()).padStart(2, '0');
                    return ` • Agregado: ${day}/${month}/${year}`;
                  })()}
                </span>
              </div>
              <div className={`text-right ${trazabilidadColorClase(diasInfo)}`}>
                <div className="font-heading text-lg font-bold">
                  {formatearTiempoTranscurrido(diasInfo)}
                </div>
                <div className="font-body text-xs">
                  {diasInfo.dias === 0 && !diasInfo.horas ? 'Sin tiempo' : 
                   diasInfo.mostrarHoras ? `Desde referencia` :
                   diasInfo.dias === 0 ? 'Mismo día' : 
                   diasInfo.dias === 1 ? '1 día desde referencia' : 
                   `${Math.round(diasInfo.dias)} días desde referencia`}
                </div>
              </div>
            </div>
          </div>
        )}

        <h4 className="mb-3 font-body text-sm font-semibold text-gray-700 dark:text-gray-300">
          Documentos subidos ({documentos.length})
        </h4>
        <div className="space-y-2">
          {documentos.map((doc, index) => {
            const tieneUrl = doc.url || doc.ruta || doc.data || doc.formularioId;
            const nombreArchivo = doc.nombre || doc.filename || `Documento ${index + 1}`;
            
            return (
              <div 
                key={index} 
                className={complexDocRow}
                onClick={(e) => {
                  // Prevenir que clicks en el contenedor activen el submit
                  if (e.target.tagName !== 'BUTTON' && e.target.closest('button')) {
                    return;
                  }
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FaFileAlt className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    {tieneUrl ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          descargarDocumento(doc, e);
                        }}
                        className="flex w-full items-center gap-1 text-left font-body text-sm font-semibold text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 dark:text-gray-200"
                        title="Haz clic para descargar"
                      >
                        <span>{nombreArchivo}</span>
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-gray-800">
                        {nombreArchivo}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {(() => {
                        // Mostrar ambas fechas si están disponibles
                        // fechaCreacion: fecha original del documento (solo informativa, NO se usa para estadísticas)
                        // fechaSubida: fecha en que se agregó al sistema (ESTA se usa para calcular días desde asignación)
                        
                        let textoFechas = '';
                        
                        // Formatear fecha de creación del documento (si existe)
                        if (doc.fechaCreacion) {
                          const fechaCreacionStr = doc.fechaCreacion.includes('T') 
                            ? doc.fechaCreacion.split('T')[0] 
                            : doc.fechaCreacion;
                          if (/^\d{4}-\d{2}-\d{2}/.test(fechaCreacionStr)) {
                            const [year, month, day] = fechaCreacionStr.split('-');
                            textoFechas = `Doc original: ${day}/${month}/${year}`;
                          }
                        }
                        
                        // Formatear fecha de subida (la importante para estadísticas)
                        if (doc.fechaSubida) {
                            const fechaSubidaStr = doc.fechaSubida.includes('T') 
                              ? doc.fechaSubida.split('T')[0] 
                              : doc.fechaSubida;
                          if (/^\d{4}-\d{2}-\d{2}/.test(fechaSubidaStr)) {
                            const [yearSub, monthSub, daySub] = fechaSubidaStr.split('-');
                            const textoSubida = `Agregado: ${daySub}/${monthSub}/${yearSub}`;
                            textoFechas = textoFechas ? `${textoFechas} • ${textoSubida}` : textoSubida;
                          }
                        } else if (doc.fecha) {
                          // Fallback a fecha si no hay fechaSubida
                          const fechaStr = doc.fecha.includes('T') 
                            ? doc.fecha.split('T')[0] 
                            : doc.fecha;
                          if (/^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
                            const [year, month, day] = fechaStr.split('-');
                            const textoFecha = `Agregado: ${day}/${month}/${year}`;
                            textoFechas = textoFechas ? `${textoFechas} • ${textoFecha}` : textoFecha;
                        }
                        }
                        
                        if (!textoFechas) return 'Sin fecha';
                        return textoFechas;
                      })()}
                      {doc.usuario && ` • Subido por: ${doc.usuario}`}
                    </p>
                    {doc.error && (
                      <p className="text-xs text-red-500 mt-1">
                        ⚠️ {doc.error}
                      </p>
                    )}
                    {doc.tamano && (
                      <p className="text-xs text-gray-400 mt-1">
                        Tamaño: {(doc.tamano / 1024).toFixed(2)} KB
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                  {doc?.formularioId ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        editarFormulario(doc, e);
                      }}
                      className={complexBtnSecondary}
                      title="Editar este documento en el formulario de ajuste"
                    >
                      Editar
                    </button>
                  ) : (
                    <span
                      className="rounded-lg bg-gray-100 px-3 py-1.5 font-body text-xs text-gray-500 dark:bg-gray-800"
                      title="Documento sin formulario asociado"
                    >
                      Sin form.
                    </span>
                  )}
                  {tieneUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        descargarDocumento(doc, e);
                      }}
                      className={complexTableBtnNeutral}
                      title="Descargar documento"
                    >
                      Descargar
                    </button>
                  ) : (
                    <span
                      className="rounded-lg bg-gray-100 px-3 py-1.5 font-body text-xs text-gray-500 dark:bg-gray-800"
                      title="Documento sin URL"
                    >
                      Sin URL
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const BandejaDesplegable = memo(({ titulo, bandeja, children, Icon, tipoDocumento, isOpen, onToggle }) => {
    const diasInfo = useMemo(() => calcularDiasTranscurridos(tipoDocumento), [tipoDocumento, historialDocs]);
    
    return (
      <div className={`${complexCard} mb-3 overflow-hidden p-0`}>
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors sm:px-5 ${
            isOpen ? 'bg-gray-50/80 dark:bg-gray-900/30' : 'hover:bg-gray-50/50 dark:hover:bg-gray-900/20'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <TrazabilidadIconoEtapa Icon={Icon} />
            <div className="min-w-0">
              <h3 className="font-heading text-base font-bold text-gray-900 dark:text-white">
                {titulo}
              </h3>
              {diasInfo && (
                <div className="mt-1 flex items-center gap-2">
                  <TrazabilidadIndicadorIcono diasInfo={diasInfo} />
                  <span className={`font-body text-xs ${trazabilidadColorClase(diasInfo)}`}>
                    {formatearTiempoTranscurrido(diasInfo)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <TrazabilidadChevron abierto={isOpen} />
        </button>
        
        {isOpen && (
          <div className="border-t border-gray-100 px-6 pb-6 dark:border-gray-800">
            {children}
            
            {/* Mostrar documentos subidos */}
            <DocumentosSubidos tipo={tipoDocumento} titulo={titulo} />
          </div>
        )}
      </div>
    );
  }, (prevProps, nextProps) => {
    // Comparación personalizada para evitar re-renders innecesarios
    return (
      prevProps.titulo === nextProps.titulo &&
      prevProps.bandeja === nextProps.bandeja &&
      prevProps.Icon === nextProps.Icon &&
      prevProps.tipoDocumento === nextProps.tipoDocumento &&
      prevProps.isOpen === nextProps.isOpen &&
      prevProps.children === nextProps.children
    );
  });
  
  BandejaDesplegable.displayName = 'BandejaDesplegable';

  return (
    <div className={complexPageWrap}>
      <h2 className={complexSectionTitle}>Trazabilidad del Caso</h2>
      
      {/* Resumen General de Trazabilidad */}
      <div className={`${complexCard} space-y-4`}>
        <h3 className={complexSubsectionTitle}>Resumen de Trazabilidad</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ETAPAS_TRAZABILIDAD.map(({ tipo, titulo, Icon }) => {
            const diasInfo = calcularDiasTranscurridos(tipo);
            const documentos = obtenerDocumentosPorTipo(tipo);

            return (
              <div key={tipo} className={`${complexMetricCard} p-3 sm:p-4`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <TrazabilidadIconoEtapa Icon={Icon} />
                  <span className={complexBadge}>{documentos.length} docs</span>
                </div>
                <h4 className="mb-2 font-body text-xs font-semibold text-gray-800 dark:text-gray-200 sm:text-sm">
                  {titulo}
                </h4>

                {diasInfo ? (
                  <div className={`text-center ${trazabilidadColorClase(diasInfo)}`}>
                    <div className="font-heading text-sm font-bold sm:text-base">
                      {diasInfo.diasRetraso > 0
                        ? diasInfo.diasRetraso < 1
                          ? `${Math.round(diasInfo.diasRetraso * 24)} h retraso`
                          : diasInfo.diasRetraso === 1
                            ? '1 día retraso'
                            : `${Math.round(diasInfo.diasRetraso)} días retraso`
                        : formatearTiempoTranscurrido(diasInfo)}
                    </div>
                    <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
                      {diasInfo.documentoAnterior
                        ? 'Doc. anterior pendiente'
                        : diasInfo.diasRetraso > 0
                          ? 'Retraso'
                          : diasInfo.dias === 0 && !diasInfo.horas
                            ? 'A tiempo'
                            : diasInfo.dias <= diasInfo.tiempoLimite
                              ? 'A tiempo'
                              : 'En proceso'}
                    </p>
                    {diasInfo.tiempoLimite != null && (
                      <p className={`${complexHint} mt-1`}>
                        Límite: {formatearTiempoLimite(diasInfo)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-heading text-sm font-bold text-gray-500 dark:text-gray-400 sm:text-base">
                      Sin docs
                    </p>
                    <p className={complexHint}>No hay documentos</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-body text-sm font-semibold text-gray-700 dark:text-gray-300">
            Estado general
          </span>
          <EstadoGeneralTrazabilidad
            tipos={ETAPAS_TRAZABILIDAD.map((e) => e.tipo)}
            calcularDias={calcularDiasTranscurridos}
          />
        </div>
      </div>
      
      {/* Contacto Inicial */}
      <BandejaDesplegable 
        titulo="Contacto Inicial" 
        bandeja="contactoInicial" 
        Icon={iconoPorTipo.contactoInicial}
        tipoDocumento="contactoInicial"
        isOpen={bandejasAbiertas.contactoInicial}
        onToggle={() => toggleBandeja('contactoInicial')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>
              Fecha de Contacto Inicial
            </label>
            <input
              type="date"
              name="fchaContIni"
              value={formData.fchaContIni || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>
              Observaciones del Contacto Inicial
            </label>
            <textarea
              key="textarea-obseContIni"
              name="obseContIni"
              ref={el => textareaRefs.current.obseContIni = el}
              defaultValue={formData.obseContIni || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder="Observaciones del contacto inicial..."
            />
          </div>
        </div>
        
        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Adjuntos del Contacto Inicial
          </label>
          <ArchivoDropZone
            tipo="contactoInicial"
            campo="adjuntos_contacto_inicial"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('contactoInicial')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-xs font-medium text-fenix-primario sm:text-sm">Suelta los archivos aquí...</p>
              ) : (
                <p className="font-body text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>

      {/* Coordinación de Inspección */}
      <BandejaDesplegable 
        titulo="Coordinación de Inspección" 
        bandeja="coordinacionInspeccion" 
        Icon={iconoPorTipo.coordinacionInspeccion}
        tipoDocumento="coordinacionInspeccion"
        isOpen={bandejasAbiertas.coordinacionInspeccion}
        onToggle={() => toggleBandeja('coordinacionInspeccion')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>
              Fecha de la Llamada
            </label>
            <input
              type="date"
              name="fchaCoordInspeccion"
              value={formData.fchaCoordInspeccion || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>
              Fecha Programada de Inspección
            </label>
            <input
              type="date"
              name="fchaProgInspeccion"
              value={formData.fchaProgInspeccion || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
        </div>
        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Observaciones de la Coordinación
          </label>
          <textarea
            key="textarea-obseCoordInspeccion"
            name="obseCoordInspeccion"
            ref={el => textareaRefs.current.obseCoordInspeccion = el}
            defaultValue={formData.obseCoordInspeccion || ''}
            onBlur={handleBlur}
            rows="3"
            className={trazabilidadInputClass}
            placeholder="Observaciones de la coordinación de inspección..."
          />
        </div>
      </BandejaDesplegable>

      {/* Inspección */}
      <BandejaDesplegable 
        titulo="Inspección" 
        bandeja="inspeccion" 
        Icon={iconoPorTipo.inspeccion}
        tipoDocumento="inspeccion"
        isOpen={bandejasAbiertas.inspeccion}
        onToggle={() => toggleBandeja('inspeccion')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>
              Fecha de Inspección
            </label>
            <input
              type="date"
              name="fchaInspccion"
              value={formData.fchaInspccion || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>
              Observaciones de la Inspección
            </label>
            <textarea
              key="textarea-obseInspccion"
              name="obseInspccion"
              ref={el => textareaRefs.current.obseInspccion = el}
              defaultValue={formData.obseInspccion || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder="Observaciones de la inspección..."
            />
          </div>
        </div>
        
        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Acta de Inspección
          </label>
          <ArchivoDropZone
            tipo="inspeccion"
            campo="adjunto_acta_inspeccion"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('inspeccion')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-xs font-medium text-fenix-primario sm:text-sm">Suelta los archivos aquí...</p>
              ) : (
                <p className="font-body text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>

      {/* Solicitud de Documentos */}
      <BandejaDesplegable 
        titulo="Solicitud de Documentos" 
        bandeja="solicitudDocs" 
        Icon={iconoPorTipo.solicitudDocs}
        tipoDocumento="solicitudDocs"
        isOpen={bandejasAbiertas.solicitudDocs}
        onToggle={() => toggleBandeja('solicitudDocs')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Fecha de Solicitud de Documentos
            </label>
            <input
              type="date"
              name="fchaSoliDocu"
              value={formData.fchaSoliDocu || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Observaciones de la Solicitud
            </label>
            <textarea
              key="textarea-obseSoliDocu"
              name="obseSoliDocu"
              ref={el => textareaRefs.current.obseSoliDocu = el}
              defaultValue={formData.obseSoliDocu || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder="Observaciones de la solicitud..."
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjuntos de la Solicitud
          </label>
          <ArchivoDropZone
            tipo="solicitudDocs"
            campo="adjunto_solicitud_documento"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('solicitudDocs')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">Suelta los archivos aquí...</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>

      {/* Informe Preliminar */}
      <BandejaDesplegable 
        titulo="Informe Preliminar" 
        bandeja="informePreliminar" 
        Icon={iconoPorTipo.informePreliminar}
        tipoDocumento="informePreliminar"
        isOpen={bandejasAbiertas.informePreliminar}
        onToggle={() => toggleBandeja('informePreliminar')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Fecha del Informe Preliminar
            </label>
            <input
              type="date"
              name="fchaInfoPrelm"
              value={formData.fchaInfoPrelm || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Observaciones del Informe Preliminar
            </label>
            <textarea
              key="textarea-obseInfoPrelm"
              name="obseInfoPrelm"
              ref={el => textareaRefs.current.obseInfoPrelm = el}
              defaultValue={formData.obseInfoPrelm || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder="Observaciones del informe preliminar..."
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjunto del Informe Preliminar
          </label>
          <ArchivoDropZone
            tipo="informePreliminar"
            campo="adjunto_informe_preliminar"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('informePreliminar')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">Suelta los archivos aquí...</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>

      {/* Último Documento */}
      <BandejaDesplegable 
        titulo="Último Documento" 
        bandeja="ultimoDocumento" 
        Icon={iconoPorTipo.ultimoDocumento}
        tipoDocumento="ultimoDocumento"
        isOpen={bandejasAbiertas.ultimoDocumento}
        onToggle={() => toggleBandeja('ultimoDocumento')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Fecha del Último Documento
            </label>
            <input
              type="date"
              name="fchaRepoActi"
              value={formData.fchaRepoActi || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Observaciones del Último Documento
            </label>
            <textarea
              key="textarea-obseRepoActi"
              name="obseRepoActi"
              ref={el => textareaRefs.current.obseRepoActi = el}
              defaultValue={formData.obseRepoActi || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder="Observaciones del último documento..."
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjunto del Último Documento
          </label>
          <ArchivoDropZone
            tipo="ultimoDocumento"
            campo="adjunto_entrega_ultimo_documento"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('ultimoDocumento')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">Suelta los archivos aquí...</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">
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
        Icon={iconoPorTipo.informeFinal}
        tipoDocumento="informeFinal"
        isOpen={bandejasAbiertas.informeFinal}
        onToggle={() => toggleBandeja('informeFinal')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Fecha del Informe Final
            </label>
            <input
              type="date"
              name="fchaInfoFnal"
              value={formData.fchaInfoFnal || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Observaciones del Informe Final
            </label>
            <textarea
              key="textarea-obseInfoFnal"
              name="obseInfoFnal"
              ref={el => textareaRefs.current.obseInfoFnal = el}
              defaultValue={formData.obseInfoFnal || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder="Observaciones del informe final..."
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjunto del Informe Final
          </label>
          <ArchivoDropZone
            tipo="informeFinal"
            campo="adjunto_informe_final"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('informeFinal')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">Suelta los archivos aquí...</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>

      {/* Presentación de Cifras */}
      <BandejaDesplegable 
        titulo="Presentación de Cifras" 
        bandeja="presentacionCifras" 
        Icon={iconoPorTipo.presentacionCifras}
        tipoDocumento="presentacionCifras"
        isOpen={bandejasAbiertas.presentacionCifras}
        onToggle={() => toggleBandeja('presentacionCifras')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Fecha de Presentación de Cifras
            </label>
            <input
              type="date"
              name="fchaPresentacionCifras"
              value={formData.fchaPresentacionCifras || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Fecha en que la aseguradora acepta la cifra
            </label>
            <input
              type="date"
              name="fchaAceptacionCifrasAseguradora"
              value={formData.fchaAceptacionCifrasAseguradora || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Observaciones de Presentación de Cifras
            </label>
            <textarea
              key="textarea-obsePresentacionCifras"
              name="obsePresentacionCifras"
              ref={el => textareaRefs.current.obsePresentacionCifras = el}
              defaultValue={formData.obsePresentacionCifras || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder="Observaciones de presentación de cifras..."
            />
          </div>
        </div>
        {diasRespuestaAseguradoraCifra != null && (
          <p className={`${complexHint} mt-3 px-1`}>
            Tiempo de respuesta de la aseguradora (presentación → aceptación):{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {diasRespuestaAseguradoraCifra} día{diasRespuestaAseguradoraCifra !== 1 ? 's' : ''}
            </span>
          </p>
        )}
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjunto de Presentación de Cifras
          </label>
          <ArchivoDropZone
            tipo="presentacionCifras"
            campo="adjunto_presentacion_cifras"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('presentacionCifras')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">Suelta los archivos aquí...</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>

      {/* Envío de Finiquito */}
      <BandejaDesplegable 
        titulo="Envío de Finiquito" 
        bandeja="envioFiniquito" 
        Icon={iconoPorTipo.envioFiniquito}
        tipoDocumento="envioFiniquito"
        isOpen={bandejasAbiertas.envioFiniquito}
        onToggle={() => toggleBandeja('envioFiniquito')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Fecha de Envío de Finiquito
            </label>
            <input
              type="date"
              name="fchaEnvioFiniquito"
              value={formData.fchaEnvioFiniquito || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Observaciones de Envío de Finiquito
            </label>
            <textarea
              key="textarea-obseEnvioFiniquito"
              name="obseEnvioFiniquito"
              ref={el => textareaRefs.current.obseEnvioFiniquito = el}
              defaultValue={formData.obseEnvioFiniquito || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder="Observaciones de envío de finiquito..."
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Adjunto de Envío de Finiquito
          </label>
          <ArchivoDropZone
            tipo="envioFiniquito"
            campo="adjunto_envio_finiquito"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('envioFiniquito')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">Suelta los archivos aquí...</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
              )
            }
          </ArchivoDropZone>
        </div>
      </BandejaDesplegable>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders innecesarios
  // Solo re-renderizar si cambian las props relevantes
  const camposObservaciones = [
    'obseContIni',
    'obseCoordInspeccion',
    'obseInspccion', 
    'obseSoliDocu',
    'obseInfoPrelm',
    'obseInfoFnal',
    'obseRepoActi',
    'obsePresentacionCifras',
    'obseEnvioFiniquito'
  ];
  
  // Campos de fechas de trazabilidad
  const camposFechas = [
    'fchaContIni',
    'fchaCoordInspeccion',
    'fchaProgInspeccion',
    'fchaInspccion',
    'fchaSoliDocu',
    'fchaInfoPrelm',
    'fchaInfoFnal',
    'fchaRepoActi',
    'fchaPresentacionCifras',
    'fchaAceptacionCifrasAseguradora',
    'fchaEnvioFiniquito'
  ];
  
  // Verificar si cambió algún campo de observaciones
  const observacionesCambiaron = camposObservaciones.some(campo => 
    prevProps.formData?.[campo] !== nextProps.formData?.[campo]
  );
  
  // Verificar si cambió algún campo de fechas (comparación más robusta)
  const fechasCambiaron = camposFechas.some(campo => {
    const prevFecha = prevProps.formData?.[campo] || '';
    const nextFecha = nextProps.formData?.[campo] || '';
    // Comparar como strings para evitar problemas con tipos
    return String(prevFecha) !== String(nextFecha);
  });
  
  // Verificar otras props importantes
  const historialDocsCambio = JSON.stringify(prevProps.historialDocs) !== JSON.stringify(nextProps.historialDocs);
  const cargandoCambio = JSON.stringify(prevProps.cargandoAdjuntos) !== JSON.stringify(nextProps.cargandoAdjuntos);
  const errorCambio = JSON.stringify(prevProps.errorAdjuntos) !== JSON.stringify(nextProps.errorAdjuntos);
  
  // Solo re-renderizar si cambió algo relevante
  // IMPORTANTE: Si cambió alguna fecha, SIEMPRE re-renderizar para asegurar que los inputs se actualicen
  const debeReRenderizar = observacionesCambiaron || fechasCambiaron || historialDocsCambio || cargandoCambio || errorCambio ||
         prevProps.handleChange !== nextProps.handleChange ||
         prevProps.onSelectFiles !== nextProps.onSelectFiles;
  
  // Si hay cambios en fechas, forzar re-render
return !debeReRenderizar;
});

Trazabilidad.displayName = 'Trazabilidad';

export default Trazabilidad;
