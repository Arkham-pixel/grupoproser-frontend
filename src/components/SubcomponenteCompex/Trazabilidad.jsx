import { useTranslation } from 'react-i18next';
import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import { FaFileAlt, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
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
import AlertasCasoPanel from './AlertasCasoPanel.jsx';
import PlantillaCorreoContactoInicial from './PlantillaCorreoContactoInicial.jsx';
import { InputFechaHoraProtocolo } from './ComplexUiBlocks.jsx';
import SeguimientoDocumentosPendientes from './SeguimientoDocumentosPendientes.jsx';
import SeguimientoAutorizacionCompania from './SeguimientoAutorizacionCompania.jsx';
import SeguimientoDocumentosPago from './SeguimientoDocumentosPago.jsx';
import { calcularDiasInfoSeguimientoTrazabilidad } from '../../utils/seguimientoProtocoloUtils.js';
import { parsearFechaHoraComplex } from '../../utils/complexFechaHoraUtils.js';
import { diasHabilesColombiaEntre } from '../../utils/festivosColombia.js';
import {
  ETAPAS_TRAZABILIDAD,
  EstadoGeneralTrazabilidad,
  TrazabilidadChevron,
  TrazabilidadIconoEtapa,
  TrazabilidadIndicadorIcono,
  tituloEtapaTrazabilidad,
  trazabilidadColorClase,
  trazabilidadInputClass,
  trazabilidadLabelClass,
} from './trazabilidadFenixUi';
import { useProtocoloSiniestros } from '../../hooks/useProtocoloSiniestros.js';
import {
  etiquetaLimiteTipoTrazabilidad,
  MAPEO_TRAZABILIDAD_PROTOCOLO,
  PROTOCOLO_DOCUMENTO,
  PROTOCOLO_VERSION,
  resolverEtapaProtocoloPorTipo,
  tituloEtapaConFase,
} from '../../config/protocoloSiniestrosDefaults.js';

const AVISO_PROTOCOLO_VISIBLE_MS = 15000;
const claveAvisoProtocoloTrazabilidad = () =>
  `complex_aviso_trazabilidad_${PROTOCOLO_VERSION}`;

function avisoProtocoloYaOculto() {
  try {
    return localStorage.getItem(claveAvisoProtocoloTrazabilidad()) === '1';
  } catch {
    return false;
  }
}

function marcarAvisoProtocoloOculto() {
  try {
    localStorage.setItem(claveAvisoProtocoloTrazabilidad(), '1');
  } catch {
    /* ignore */
  }
}

const TrazabilidadBandejaCtx = React.createContext(null);

const ArchivoDropZone = ({
  tipo,
  campo,
  onSelectFiles,
  estadoAdjunto,
  children
}) => {
  const { t } = useTranslation();
  const ctx = React.useContext(TrazabilidadBandejaCtx);
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = useCallback((files) => {
    const lista = Array.from(files || []);
    if (!lista.length) return;
    onSelectFiles?.(tipo, campo, lista);
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

  if (ctx?.soloFechas) return null;

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
        <p className={complexHint}>{t("complex.ui.trazabilidad.subiendo_documentos")}</p>
      )}
      {estadoAdjunto?.error && (
        <p className={complexAlertError}>{t("complex.ui.trazabilidad.error")}{estadoAdjunto.error}</p>
      )}
    </div>
  );
};

/**
 * Debe vivir fuera de Trazabilidad: si se redefine en cada render, React lo
 * remonta al cambiar una fecha/hora, el <select> pierde el foco y la página salta arriba.
 */
const BandejaDesplegable = memo(function BandejaDesplegable({
  titulo,
  children,
  Icon,
  tipoDocumento,
  isOpen,
  onToggle,
  ocultarDocumentosSubidos = false,
}) {
  const { t } = useTranslation();
  const ctx = React.useContext(TrazabilidadBandejaCtx);
  const ocultarDocs = ocultarDocumentosSubidos || Boolean(ctx?.soloFechas);
  const diasInfo = ctx?.calcularDiasTranscurridos?.(tipoDocumento);
  const etiquetaLimite = ctx?.protocolo
    ? etiquetaLimiteTipoTrazabilidad(tipoDocumento, ctx.protocolo, t)
    : null;
  const tiempoTranscurrido = diasInfo && ctx?.formatearTiempoTranscurrido
    ? ctx.formatearTiempoTranscurrido(diasInfo)
    : '';

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
              {tituloEtapaConFase(tipoDocumento, titulo, t)}
            </h3>
            {etiquetaLimite && (
              <p className={`${complexHint} mt-0.5`}>
                {t('complex.ui.trazabilidad.plazo_protocolo')}
                {etiquetaLimite}
              </p>
            )}
            {diasInfo && (
              <div className="mt-1 flex items-center gap-2">
                <TrazabilidadIndicadorIcono diasInfo={diasInfo} />
                <span className={`font-body text-xs ${trazabilidadColorClase(diasInfo)}`}>
                  {tiempoTranscurrido}
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
          {!ocultarDocs && ctx?.renderDocumentos?.(tipoDocumento, titulo)}
        </div>
      )}
    </div>
  );
});

BandejaDesplegable.displayName = 'BandejaDesplegable';

const Trazabilidad = memo(function Trazabilidad({ 
  formData, 
  handleChange,
  onPlantillaContactoChange,
  onSelectFiles,
  historialDocs,
  updateHistorialDocs,
  construirUrlArchivo,
  cargandoAdjuntos = {},
  errorAdjuntos = {},
  soloFechas = false,
}) {
  const { t, i18n } = useTranslation();
  // Refs para los textareas
  const textareaRefs = useRef({});

  // Handler que actualiza el padre solo cuando pierde el foco
  const handleBlur = useCallback((e) => {
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
    recepcionAsignacion: false,
    carguePlataforma: false,
    contactoInicial: false,
    coordinacionInspeccion: false,
    inspeccion: false,
    solicitudDocs: false,
    seguimientoDocsPendientes: false,
    informePreliminar: false,
    informeFinal: false,
    ultimoDocumento: false,
    seguimientoAutorizacionCompania: false,
    presentacionCifras: false,
    seguimientoDocumentosPago: false,
    envioFiniquito: false
  });

  const [mostrarAvisoProtocolo, setMostrarAvisoProtocolo] = useState(
    () => !avisoProtocoloYaOculto()
  );
  const [avisoProtocoloSaliendo, setAvisoProtocoloSaliendo] = useState(false);

  const ocultarAvisoProtocolo = useCallback(() => {
    setAvisoProtocoloSaliendo(true);
    window.setTimeout(() => {
      setMostrarAvisoProtocolo(false);
      marcarAvisoProtocoloOculto();
    }, 320);
  }, []);

  useEffect(() => {
    if (!mostrarAvisoProtocolo) return undefined;

    const temporizador = window.setTimeout(() => {
      ocultarAvisoProtocolo();
    }, AVISO_PROTOCOLO_VISIBLE_MS);

    return () => window.clearTimeout(temporizador);
  }, [mostrarAvisoProtocolo, ocultarAvisoProtocolo]);

  const toggleBandeja = useCallback((bandeja) => {
    setBandejasAbiertas(prev => ({
      ...prev,
      [bandeja]: !prev[bandeja]
    }));
  }, []);

  const { tiemposLimite, protocolo } = useProtocoloSiniestros();

  const esTipoEsperaExterna = (tipo) => {
    const cfg = MAPEO_TRAZABILIDAD_PROTOCOLO[tipo];
    if (!cfg) return false;
    if (cfg.esperaExternaId) return true;
    const item = resolverEtapaProtocoloPorTipo(tipo, protocolo);
    return Boolean(item?.dependenciaExterna);
  };

  // Mapeo de tipos a campos de fecha en formData
  // NOTA: Cada fecha puede colocarse independientemente, sin requerir fechas o documentos anteriores
  const tipoAFecha = {
    recepcionAsignacion: 'fchaAsgncion',
    carguePlataforma: 'fchaAsgncion',
    contactoInicial: 'fchaContIni',
    coordinacionInspeccion: 'fchaCoordInspeccion', // Fecha de llamada
    inspeccion: 'fchaInspccion',
    solicitudDocs: 'fchaSoliDocu',
    seguimientoDocsPendientes: 'fchaUltSegui',
    informePreliminar: 'fchaInfoPrelm',
    informeFinal: 'fchaInfoFnal',
    seguimientoAutorizacionCompania: 'fchaUltSegui',
    ultimoDocumento: 'fchaRepoActi',
    presentacionCifras: 'fchaPresentacionCifras',
    seguimientoDocumentosPago: 'fchaUltSegui',
    envioFiniquito: 'fchaEnvioFiniquito'
  };

  // Función auxiliar para parsear fechas con hora (hitos de protocolo)
  const parsearFecha = (fechaStr) => parsearFechaHoraComplex(fechaStr);

  // Función para obtener la fecha de referencia según el tipo de documento
  const obtenerFechaReferencia = (tipo) => {
    switch (tipo) {
      case 'recepcionAsignacion':
      case 'carguePlataforma':
        return parsearFecha(formData.fchaAsgncion);

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
        return (
          parsearFecha(formData.fchaInspccion) ||
          parsearFecha(formData.fchaCoordInspeccion) ||
          parsearFecha(formData.fchaAsgncion)
        );

      case 'seguimientoDocsPendientes': {
        const docsSeg = (historialDocs || []).filter(
          (d) => d.tipo === 'seguimientoDocsPendientes' || d.categoria === 'seguimientoDocsPendientes'
        );
        if (docsSeg.length >= 2) {
          const fechas = docsSeg
            .map((d) => parsearFecha(d.fecha || d.fechaSubida))
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime());
          if (fechas[1]) return fechas[1];
        }
        return (
          parsearFecha(formData.fchaUltSegui) ||
          parsearFecha(formData.fchaSoliDocu) ||
          parsearFecha(formData.fchaInspccion) ||
          parsearFecha(formData.fchaAsgncion)
        );
      }

      case 'informePreliminar':
        // Protocolo: desde solicitud de documentos; si no hay, desde inspección.
        return (
          parsearFecha(formData.fchaSoliDocu) ||
          parsearFecha(formData.fchaInspccion) ||
          parsearFecha(formData.fchaContIni) ||
          parsearFecha(formData.fchaAsgncion)
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
        return (
          parsearFecha(formData.fchaRepoActi) ||
          parsearFecha(formData.fchaInfoPrelm) ||
          parsearFecha(formData.fchaInspccion) ||
          parsearFecha(formData.fchaAsgncion)
        );

      case 'seguimientoAutorizacionCompania': {
        const docsAut = (historialDocs || []).filter(
          (d) =>
            d.tipo === 'seguimientoAutorizacionCompania' ||
            d.categoria === 'seguimientoAutorizacionCompania'
        );
        if (docsAut.length >= 2) {
          const fechas = docsAut
            .map((d) => parsearFecha(d.fecha || d.fechaSubida))
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime());
          if (fechas[1]) return fechas[1];
        }
        return (
          parsearFecha(formData.fchaUltSegui) ||
          parsearFecha(formData.fchaInfoFnal) ||
          parsearFecha(formData.fchaRepoActi)
        );
      }

      case 'presentacionCifras':
      case 'envioFiniquito':
        return (
          parsearFecha(formData.fchaAceptacionCifrasAseguradora) ||
          parsearFecha(formData.fchaRepoActi)
        );

      case 'seguimientoDocumentosPago': {
        const docsPago = (historialDocs || []).filter(
          (d) =>
            d.tipo === 'seguimientoDocumentosPago' || d.categoria === 'seguimientoDocumentosPago'
        );
        if (docsPago.length >= 2) {
          const fechas = docsPago
            .map((d) => parsearFecha(d.fecha || d.fechaSubida))
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime());
          if (fechas[1]) return fechas[1];
        }
        return (
          parsearFecha(formData.fchaUltSegui) ||
          parsearFecha(formData.fchaAceptacionCifrasAseguradora) ||
          parsearFecha(formData.fchaPresentacionCifras)
        );
      }
      
      default:
        return null;
    }
  };

  // Función para calcular días transcurridos basándose en fechas de referencia específicas
  const calcularDiasTranscurridos = (tipo) => {
    if (tipo === 'recepcionAsignacion') {
      const fechaAsignacion = parsearFecha(formData.fchaAsgncion);
      if (!fechaAsignacion) return null;
      return {
        dias: 0,
        horas: 0,
        diasRetraso: 0,
        tiempoLimite: null,
        fecha: fechaAsignacion,
        fechaReferencia: fechaAsignacion,
        documentoAnterior: false,
        esReciente: true,
        esUrgente: false,
        tieneDocumentos: false,
        etiquetaEstado: t('complex.ui.trazabilidad.recibido_fecha', { fecha: fechaAsignacion.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-CO') }),
      };
    }

    if (tipo === 'carguePlataforma') {
      const fechaAsignacion = parsearFecha(formData.fchaAsgncion);
      if (!fechaAsignacion) return null;

      const codigoResponsable =
        formData.codiRespnsble ?? formData.codi_responble ?? formData.responsable;
      const tieneAjustador =
        codigoResponsable &&
        String(codigoResponsable).trim() !== '' &&
        String(codigoResponsable).toLowerCase() !== t('complex.ui.trazabilidad.sin_asignar') && String(codigoResponsable).toLowerCase() !== 'sin asignar' && String(codigoResponsable).toLowerCase() !== 'unassigned';

      if (tieneAjustador) {
        return {
          dias: 0,
          horas: 0,
          diasRetraso: 0,
          tiempoLimite: 0.5,
          fecha: fechaAsignacion,
          fechaReferencia: fechaAsignacion,
          documentoAnterior: false,
          esReciente: true,
          esUrgente: false,
          tieneDocumentos: false,
          etiquetaEstado: t('complex.ui.trazabilidad.ajustador_asignado_estado'),
        };
      }

      const ahora = new Date();
      const diferenciaHoras = (ahora.getTime() - fechaAsignacion.getTime()) / (1000 * 3600);
      const tiempoLimite = 0.5;
      const diasRetraso = diferenciaHoras > tiempoLimite * 24 ? (diferenciaHoras / 24) - tiempoLimite : 0;

      return {
        dias: diferenciaHoras / 24,
        horas: diferenciaHoras,
        diasRetraso,
        tiempoLimite,
        fecha: null,
        fechaReferencia: fechaAsignacion,
        documentoAnterior: false,
        esReciente: diasRetraso === 0,
        esUrgente: diasRetraso > 0,
        tieneDocumentos: false,
        mostrarHoras: true,
        etiquetaEstado: t('complex.ui.trazabilidad.sin_ajustador_asignado'),
      };
    }

    if (
      tipo === 'seguimientoDocsPendientes' ||
      tipo === 'seguimientoAutorizacionCompania' ||
      tipo === 'seguimientoDocumentosPago'
    ) {
      return calcularDiasInfoSeguimientoTrazabilidad({
        tipoHistorial: tipo,
        formData,
        historialDocs,
        protocolo,
      });
    }

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
      const diasCalendario = diferenciaHoras / 24;
      // Si el tramo cruza más de un día calendario, medir en días hábiles
      // (excluye sábados, domingos y festivos de Colombia: 1 ene, Reyes, etc.).
      const diferenciaDias =
        diasCalendario >= 1
          ? diasHabilesColombiaEntre(fechaReferencia, fechaDocumentoLocal)
          : diasCalendario;
      
      // Obtener tiempo límite para este tipo de documento
      let tiempoLimite = tiemposLimite[tipo];
      if (tipo === 'seguimientoDocsPendientes') {
        const seg = protocolo.seguimientosRecurrentes?.find((s) => s.id === 'seguimientoDocumentos');
        tiempoLimite = seg?.intervaloDias ?? 15;
      }
      
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
          mostrarHoras: diferenciaDias < 1,
          esperaExterna: esTipoEsperaExterna(tipo),
        };
      }

      // Esperas de terceros: el tiempo se muestra, pero la prórroga NO imputa retraso al ajustador.
      if (esTipoEsperaExterna(tipo)) {
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
          mostrarHoras: diferenciaDias < 1,
          esperaExterna: true,
        };
      }
      
      // Calcular retraso (si la fecha del documento excede el tiempo límite)
      const diasRetraso = diferenciaDias > tiempoLimite ? diferenciaDias - tiempoLimite : 0;
      
      // Para plazos en horas, mostrar horas si el transcurrido es menor a 1 día.
      const mostrarHoras =
        (tipo === 'contactoInicial' ||
          tipo === 'inspeccion' ||
          tipo === 'coordinacionInspeccion' ||
          tipo === 'solicitudDocs' ||
          tipo === 'informePreliminar') &&
        diasCalendario < 1;
      
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
        mostrarHoras: mostrarHoras,
        usaDiasHabiles: diasCalendario >= 1,
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
    const diasCalendarioDoc = diferenciaHoras / 24;
    // Tramos de más de un día: días hábiles Colombia (sin fines de semana ni festivos).
    const diferenciaDias =
      diasCalendarioDoc >= 1
        ? diasHabilesColombiaEntre(fechaReferencia, fechaMasRecienteLocal)
        : diasCalendarioDoc;

    if (esTipoEsperaExterna(tipo)) {
      return {
        dias: diferenciaDias >= 0 ? diferenciaDias : 0,
        horas: diferenciaHoras >= 0 ? diferenciaHoras : 0,
        diasRetraso: 0,
        tiempoLimite: null,
        fecha: fechaMasRecienteLocal,
        fechaReferencia: fechaReferencia,
        documentoAnterior: diferenciaDias < 0,
        esReciente: true,
        esUrgente: false,
        tieneDocumentos: true,
        mostrarHoras: diferenciaDias < 1,
        esperaExterna: true,
      };
    }
    
    const tiempoLimite =
      tipo === 'seguimientoDocsPendientes'
        ? (protocolo.seguimientosRecurrentes?.find((s) => s.id === 'seguimientoDocumentos')?.intervaloDias ?? 15)
        : tipo === 'seguimientoAutorizacionCompania'
          ? (protocolo.seguimientosRecurrentes?.find((s) => s.id === 'seguimientoAutorizacion')?.intervaloDias ?? 5)
          : tipo === 'seguimientoDocumentosPago'
            ? (protocolo.seguimientosRecurrentes?.find((s) => s.id === 'seguimientoPago')?.intervaloDias ?? 15)
            : tiemposLimite[tipo] || 1;
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
      mostrarHoras: mostrarHoras,
      usaDiasHabiles: diasCalendarioDoc >= 1,
    };
  };
  // Función para formatear el tiempo transcurrido (horas o días)
  const formatearTiempoTranscurrido = (diasInfo) => {
    if (!diasInfo) return t('complex.ui.trazabilidad.sin_tiempo');
    
    if (diasInfo.mostrarHoras && diasInfo.horas !== undefined) {
      const horas = Math.round(diasInfo.horas);
      if (horas === 0) return t('complex.ui.trazabilidad.cero_horas');
      if (horas === 1) return t('complex.ui.trazabilidad.una_hora');
      return t('complex.ui.trazabilidad.n_horas', { n: horas });
    }
    
    if (diasInfo.dias === 0) return t('complex.ui.trazabilidad.cero_dias');
    if (diasInfo.dias === 1) return t('complex.ui.trazabilidad.un_dia');
    if (diasInfo.dias < 1) {
      const horas = Math.round((diasInfo.dias * 24));
      if (horas === 1) return t('complex.ui.trazabilidad.una_hora');
      return t('complex.ui.trazabilidad.n_horas', { n: horas });
    }
    return t('complex.ui.trazabilidad.n_dias', { n: Math.round(diasInfo.dias) });
  };

  // Función para formatear el tiempo límite
  const formatearTiempoLimite = (diasInfo) => {
    if (!diasInfo || diasInfo.tiempoLimite === null || diasInfo.tiempoLimite === undefined) return t('complex.ui.trazabilidad.sin_limite');
    
    if (diasInfo.tiempoLimite < 1) {
      const horas = Math.round(diasInfo.tiempoLimite * 24);
      if (horas === 12) return t('complex.ui.trazabilidad.doce_horas');
      return t('complex.ui.trazabilidad.n_horas', { n: horas });
    }
    
    if (diasInfo.tiempoLimite === 1) return t('complex.ui.trazabilidad.un_dia');
    return t('complex.ui.trazabilidad.n_dias', { n: diasInfo.tiempoLimite });
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
      alert(t('complex.ui.trazabilidad.no_editar_sin_formulario'));
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
  }, [navigate, t]);

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
        alert(error?.message || t('complex.ui.trazabilidad.no_descargar_documento'));
      });
      return false;
    }

    const enlace = construirUrlDescarga(
      rutaDirecta ||
      (documento?.formularioId ? `/api/historial-formularios/${documento.formularioId}/descargar` : '') ||
      ''
    );
    
    if (!enlace) {
      alert(t('complex.ui.trazabilidad.no_descargar_url'));
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
  }, [construirUrlDescarga, t]);

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
      } else if (tipo === 'seguimientoDocsPendientes') {
        return doc.tipo === 'seguimientoDocsPendientes' || doc.categoria === 'seguimientoDocsPendientes';
      } else if (tipo === 'seguimientoAutorizacionCompania') {
        return doc.tipo === 'seguimientoAutorizacionCompania' || doc.categoria === 'seguimientoAutorizacionCompania';
      } else if (tipo === 'informePreliminar') {
        return doc.tipo === 'informePreliminar' || doc.categoria === 'informePreliminar';
      } else if (tipo === 'informeFinal') {
        return doc.tipo === 'informeFinal' || doc.categoria === 'informeFinal';
      } else if (tipo === 'ultimoDocumento') {
        return doc.tipo === 'ultimoDocumento' || doc.categoria === 'ultimoDocumento';
      } else if (tipo === 'presentacionCifras') {
        return doc.tipo === 'presentacionCifras' || doc.categoria === 'presentacionCifras';
      } else if (tipo === 'seguimientoDocumentosPago') {
        return doc.tipo === 'seguimientoDocumentosPago' || doc.categoria === 'seguimientoDocumentosPago';
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
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.trazabilidad.no_hay_documentos_subidos_para")}{titulo}
          </p>
          <p className={`${complexHint} mt-1`}>{t("complex.ui.trazabilidad.sin_documentos")}</p>
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
                <span className="font-body text-sm font-medium text-gray-700 dark:text-gray-300">{t("complex.ui.trazabilidad.ultimo_documento_subido")}</span>
                <span className="font-body text-sm text-gray-600 dark:text-gray-400">
                  {diasInfo.fechaReferencia && (() => {
                    const year = diasInfo.fechaReferencia.getFullYear();
                    const month = String(diasInfo.fechaReferencia.getMonth() + 1).padStart(2, '0');
                    const day = String(diasInfo.fechaReferencia.getDate()).padStart(2, '0');
                    return t('complex.ui.trazabilidad.referencia', { fecha: `${day}/${month}/${year}` });
                  })()}
                  {diasInfo.fecha && (() => {
                    const year = diasInfo.fecha.getFullYear();
                    const month = String(diasInfo.fecha.getMonth() + 1).padStart(2, '0');
                    const day = String(diasInfo.fecha.getDate()).padStart(2, '0');
                    return t('complex.ui.trazabilidad.agregado', { fecha: `${day}/${month}/${year}` });
                  })()}
                </span>
              </div>
              <div className={`text-right ${trazabilidadColorClase(diasInfo)}`}>
                <div className="font-heading text-lg font-bold">
                  {formatearTiempoTranscurrido(diasInfo)}
                </div>
                <div className="font-body text-xs">
                  {diasInfo.dias === 0 && !diasInfo.horas ? t('complex.ui.trazabilidad.sin_tiempo') : 
                   diasInfo.mostrarHoras ? t('complex.ui.trazabilidad.desde_referencia') :
                   diasInfo.dias === 0 ? t('complex.ui.trazabilidad.mismo_dia') : 
                   diasInfo.dias === 1
                     ? (diasInfo.usaDiasHabiles ? t('complex.ui.trazabilidad.un_dia_habil_desde_referencia') : t('complex.ui.trazabilidad.un_dia_desde_referencia'))
                     : (diasInfo.usaDiasHabiles
                        ? t('complex.ui.trazabilidad.n_dias_habiles_desde_referencia', { n: Math.round(diasInfo.dias) })
                        : t('complex.ui.trazabilidad.n_dias_desde_referencia', { n: Math.round(diasInfo.dias) }))}
                </div>
              </div>
            </div>
          </div>
        )}

        <h4 className="mb-3 font-body text-sm font-semibold text-gray-700 dark:text-gray-300">{t("complex.ui.trazabilidad.documentos_subidos")}{documentos.length}{t("complex.ui.trazabilidad.texto")}</h4>
        <div className="space-y-2">
          {documentos.map((doc, index) => {
            const tieneUrl = doc.url || doc.ruta || doc.data || doc.formularioId;
            const nombreArchivo = doc.nombre || doc.filename || t('complex.ui.trazabilidad.documento_n', { n: index + 1 });
            
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
                        title={t("complex.ui.trazabilidad.haz_clic_para_descargar")}
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
                        // fechaCreacion / fecha: hito o documento original (estable).
                        // fechaSubida / fechaModificacion: cuándo se agregó o actualizó la copia.
                        let textoFechas = '';

                        if (doc.fechaCreacion) {
                          const fechaCreacionStr = doc.fechaCreacion.includes('T')
                            ? doc.fechaCreacion.split('T')[0]
                            : doc.fechaCreacion;
                          if (/^\d{4}-\d{2}-\d{2}/.test(fechaCreacionStr)) {
                            const [year, month, day] = fechaCreacionStr.split('-');
                            textoFechas = `Doc original: ${day}/${month}/${year}`;
                          }
                        }

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
                          const fechaStr = doc.fecha.includes('T')
                            ? doc.fecha.split('T')[0]
                            : doc.fecha;
                          if (/^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
                            const [year, month, day] = fechaStr.split('-');
                            const textoFecha = `Agregado: ${day}/${month}/${year}`;
                            textoFechas = textoFechas ? `${textoFechas} • ${textoFecha}` : textoFecha;
                          }
                        }

                        const fechaModRaw = doc.fechaModificacion || null;
                        if (fechaModRaw && doc.fechaCreacion) {
                          const diaCreacion = String(doc.fechaCreacion).includes('T')
                            ? String(doc.fechaCreacion).split('T')[0]
                            : String(doc.fechaCreacion).slice(0, 10);
                          const diaMod = String(fechaModRaw).includes('T')
                            ? String(fechaModRaw).split('T')[0]
                            : String(fechaModRaw).slice(0, 10);
                          if (diaMod && diaCreacion && diaMod !== diaCreacion) {
                            const [yM, mM, dM] = diaMod.split('-');
                            if (yM && mM && dM) {
                              textoFechas = textoFechas
                                ? `${textoFechas} • Modificado: ${dM}/${mM}/${yM}`
                                : `Modificado: ${dM}/${mM}/${yM}`;
                            }
                          }
                        }

                        if (!textoFechas) return t('complex.ui.trazabilidad.sin_fecha');
                        return textoFechas;
                      })()}
                      {doc.usuario && ` • Subido por: ${doc.usuario}`}
                    </p>
                    {doc.error && (
                      <p className="text-xs text-red-500 mt-1">{t("complex.ui.trazabilidad.texto_2")}{doc.error}
                      </p>
                    )}
                    {doc.tamano && (
                      <p className="text-xs text-gray-400 mt-1">{t("complex.ui.trazabilidad.tamano")}{(doc.tamano / 1024).toFixed(2)}{t("complex.ui.trazabilidad.kb")}</p>
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
                      title={t("complex.ui.trazabilidad.editar_este_documento_en_el_formulario_de_ajuste")}
                    >{t("complex.ui.trazabilidad.editar")}</button>
                  ) : (
                    <span
                      className="rounded-lg bg-gray-100 px-3 py-1.5 font-body text-xs text-gray-500 dark:bg-gray-800"
                      title={t("complex.ui.trazabilidad.documento_sin_formulario_asociado")}
                    >{t("complex.ui.trazabilidad.sin_form")}</span>
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
                      title={t("complex.ui.trazabilidad.descargar_documento")}
                    >{t("complex.ui.trazabilidad.descargar")}</button>
                  ) : (
                    <span
                      className="rounded-lg bg-gray-100 px-3 py-1.5 font-body text-xs text-gray-500 dark:bg-gray-800"
                      title={t("complex.ui.trazabilidad.documento_sin_url")}
                    >{t("complex.ui.trazabilidad.sin_url")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const bandejaCtxValue = {
    calcularDiasTranscurridos,
    formatearTiempoTranscurrido,
    protocolo,
    soloFechas,
    renderDocumentos: (tipo, tituloDoc) => (
      <DocumentosSubidos tipo={tipo} titulo={tituloDoc} />
    ),
  };

  return (
    <TrazabilidadBandejaCtx.Provider value={bandejaCtxValue}>
    <div className={complexPageWrap}>
      <h2 className={complexSectionTitle}>
        {soloFechas
          ? 'Trazabilidad del caso (solo fechas)'
          : t("complex.ui.trazabilidad.trazabilidad_del_caso")}
      </h2>
      {soloFechas ? (
        <p className={`${complexHint} mb-4`}>
          En SURA se registran las fechas de cada hito. Los documentos van en el archivero del
          caso, no en esta pestaña.
        </p>
      ) : null}

      {mostrarAvisoProtocolo && (
        <div
          className={`relative mb-4 overflow-hidden rounded-xl border border-fenix-primario/20 bg-gray-50 p-4 transition-all duration-300 dark:bg-gray-900/30 ${
            avisoProtocoloSaliendo
              ? 'pointer-events-none max-h-0 opacity-0 py-0'
              : 'max-h-96 opacity-100'
          }`}
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={ocultarAvisoProtocolo}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label={t("complex.ui.trazabilidad.cerrar_aviso_del_protocolo")}
            title={t("complex.ui.trazabilidad.cerrar")}
          >
            <FaTimes aria-hidden />
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario pr-8">{t("complex.ui.trazabilidad.protocolo_de_atencion")}</p>
          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">
            {PROTOCOLO_DOCUMENTO}
          </p>
          <p className={`${complexHint} mt-2`}>
            {t('complex.ui.indicadores_protocolo_complex.protocolo_objetivo')}
          </p>
          <p className={`${complexHint} mt-1`}>{t("complex.ui.trazabilidad.cada_etapa_muestra_su_fase_del_protocolo_y_el_plazo_obje")}</p>
        </div>
      )}

      {!soloFechas && (
        <AlertasCasoPanel numeroAjuste={formData.nmroAjste} casoId={formData._id} />
      )}
      
      {/* Resumen General de Trazabilidad */}
      <div className={`${complexCard} space-y-4`}>
        <h3 className={complexSubsectionTitle}>{t("complex.ui.trazabilidad.resumen_de_trazabilidad")}</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ETAPAS_TRAZABILIDAD.filter((e) =>
            soloFechas
              ? ![
                  'seguimientoDocsPendientes',
                  'seguimientoAutorizacionCompania',
                  'seguimientoDocumentosPago',
                ].includes(e.tipo)
              : true
          ).map(({ tipo, Icon }) => {
            const diasInfo = calcularDiasTranscurridos(tipo);
            const documentos = obtenerDocumentosPorTipo(tipo);
            const titulo = tituloEtapaTrazabilidad(t, tipo);

            return (
              <div key={tipo} className={`${complexMetricCard} p-3 sm:p-4`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <TrazabilidadIconoEtapa Icon={Icon} />
                  <span className={complexBadge}>
                    {soloFechas
                      ? formData[tipoAFecha[tipo]]
                        ? 'Con fecha'
                        : 'Sin fecha'
                      : `${documentos.length}${t("complex.ui.trazabilidad.docs")}`}
                  </span>
                </div>
                <h4 className="mb-2 font-body text-xs font-semibold text-gray-800 dark:text-gray-200 sm:text-sm">
                  {tituloEtapaConFase(tipo, titulo, t)}
                </h4>

                {diasInfo ? (
                  <div className={`text-center ${trazabilidadColorClase(diasInfo)}`}>
                    <div className="font-heading text-sm font-bold sm:text-base">
                      {diasInfo.etiquetaEstado
                        ? diasInfo.etiquetaEstado
                        : diasInfo.diasRetraso > 0
                        ? diasInfo.diasRetraso < 1
                          ? t('complex.ui.trazabilidad.h_retraso', { n: Math.round(diasInfo.diasRetraso * 24) })
                          : diasInfo.diasRetraso === 1
                            ? (diasInfo.usaDiasHabiles ? t('complex.ui.trazabilidad.un_dia_habil_retraso') : t('complex.ui.trazabilidad.un_dia_retraso'))
                            : (diasInfo.usaDiasHabiles
                              ? t('complex.ui.trazabilidad.n_dias_habiles_retraso', { n: Math.round(diasInfo.diasRetraso) })
                              : t('complex.ui.trazabilidad.n_dias_retraso', { n: Math.round(diasInfo.diasRetraso) }))
                        : formatearTiempoTranscurrido(diasInfo)}
                    </div>
                    <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
                      {diasInfo.documentoAnterior
                        ? t('complex.ui.trazabilidad.doc_anterior_pendiente')
                        : diasInfo.enGraciaExterna
                          ? t('complex.ui.trazabilidad.en_prorroga_espera_externa')
                          : diasInfo.esperaExterna
                            ? t('complex.ui.trazabilidad.espera_externa_no_imputa')
                            : diasInfo.diasRetraso > 0
                              ? t('complex.ui.trazabilidad.retraso')
                              : diasInfo.dias === 0 && !diasInfo.horas
                                ? t('complex.ui.trazabilidad.a_tiempo')
                                : diasInfo.tiempoLimite != null && diasInfo.dias <= diasInfo.tiempoLimite
                                  ? t('complex.ui.trazabilidad.a_tiempo')
                                  : t('complex.ui.trazabilidad.en_proceso')}
                    </p>
                    {diasInfo.tiempoLimite != null && (
                      <p className={`${complexHint} mt-1`}>{t("complex.ui.trazabilidad.limite")}{formatearTiempoLimite(diasInfo)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-heading text-sm font-bold text-gray-500 dark:text-gray-400 sm:text-base">
                      {soloFechas ? 'Sin fecha' : t("complex.ui.trazabilidad.sin_docs")}
                    </p>
                    <p className={complexHint}>
                      {soloFechas ? 'Registre la fecha del hito' : t("complex.ui.trazabilidad.no_hay_documentos")}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-body text-sm font-semibold text-gray-700 dark:text-gray-300">{t("complex.ui.trazabilidad.estado_general")}</span>
          <EstadoGeneralTrazabilidad
            tipos={(soloFechas
              ? ETAPAS_TRAZABILIDAD.filter(
                  (e) =>
                    ![
                      'seguimientoDocsPendientes',
                      'seguimientoAutorizacionCompania',
                      'seguimientoDocumentosPago',
                    ].includes(e.tipo)
                )
              : ETAPAS_TRAZABILIDAD
            ).map((e) => e.tipo)}
            calcularDias={calcularDiasTranscurridos}
          />
        </div>
      </div>

      <BandejaDesplegable
        titulo={t('complex.ui.etapas_trazabilidad.recepcion_asignacion')}
        bandeja="recepcionAsignacion"
        Icon={iconoPorTipo.recepcionAsignacion}
        tipoDocumento="recepcionAsignacion"
        isOpen={bandejasAbiertas.recepcionAsignacion}
        onToggle={() => toggleBandeja('recepcionAsignacion')}
        ocultarDocumentosSubidos
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={trazabilidadLabelClass}>{t("complex.ui.trazabilidad.fecha_y_hora_de_asignacion")}</label>
            <InputFechaHoraProtocolo
              name="fchaAsgncion"
              value={formData.fchaAsgncion || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={trazabilidadLabelClass}>{t("complex.ui.trazabilidad.n_de_ajuste")}</label>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {formData.nmroAjste || '—'}
            </p>
          </div>
        </div>
        <p className={`${complexHint} mt-3`}>{t("complex.ui.trazabilidad.registre_fecha_y_hora_en_cada_hito_para_medir_plazos_del")}</p>
      </BandejaDesplegable>

      <BandejaDesplegable
        titulo={t('complex.ui.etapas_trazabilidad.cargue_asignacion_interna')}
        bandeja="carguePlataforma"
        Icon={iconoPorTipo.carguePlataforma}
        tipoDocumento="carguePlataforma"
        isOpen={bandejasAbiertas.carguePlataforma}
        onToggle={() => toggleBandeja('carguePlataforma')}
        ocultarDocumentosSubidos
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={trazabilidadLabelClass}>{t("complex.ui.trazabilidad.ajustador_asignado")}</label>
            <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">
              {formData.nombreResponsable ||
                formData.codiRespnsble ||
                formData.codi_responble ||
                t('complex.ui.trazabilidad.sin_asignar')}
            </p>
          </div>
          <div>
            <label className={trazabilidadLabelClass}>{t("complex.ui.trazabilidad.plazo_soporte")}</label>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("complex.ui.trazabilidad.12_horas_desde_la_asignacion_para_cargue_en_arnald")}</p>
          </div>
        </div>
        <p className={`${complexHint} mt-3`}>{t("complex.ui.trazabilidad.fase_2_del_protocolo_gestion_de_soporte_coordinacion_el_")}</p>
      </BandejaDesplegable>
      
      {/* Contacto Inicial */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.contacto_inicial')} 
        bandeja="contactoInicial" 
        Icon={iconoPorTipo.contactoInicial}
        tipoDocumento="contactoInicial"
        isOpen={bandejasAbiertas.contactoInicial}
        onToggle={() => toggleBandeja('contactoInicial')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>{t("complex.ui.trazabilidad.fecha_de_contacto_inicial")}</label>
            <InputFechaHoraProtocolo
              name="fchaContIni"
              value={formData.fchaContIni || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>{t("complex.ui.trazabilidad.observaciones_del_contacto_inicial")}</label>
            <textarea
              key="textarea-obseContIni"
              name="obseContIni"
              ref={el => textareaRefs.current.obseContIni = el}
              defaultValue={formData.obseContIni || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder={t("complex.ui.trazabilidad.observaciones_del_contacto_inicial_2")}
            />
          </div>
        </div>

        {!soloFechas && (
          <PlantillaCorreoContactoInicial
            formData={formData}
            onPlantillaChange={onPlantillaContactoChange}
          />
        )}
        
        {!soloFechas && (
        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">{t("complex.ui.trazabilidad.adjuntos_del_contacto_inicial")}</label>
          <ArchivoDropZone
            tipo="contactoInicial"
            campo="adjuntos_contacto_inicial"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('contactoInicial')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-xs font-medium text-fenix-primario sm:text-sm">{t("complex.ui.trazabilidad.suelta_los_archivos_aqui")}</p>
              ) : (
                <p className="font-body text-xs text-gray-600 dark:text-gray-300 sm:text-sm">{t("complex.ui.trazabilidad.arrastra_archivos_aqui_o_haz_clic_para_seleccionar")}</p>
              )
            }
          </ArchivoDropZone>
        </div>
        )}
      </BandejaDesplegable>

      {/* Coordinación de Inspección */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.coordinacion_inspeccion')} 
        bandeja="coordinacionInspeccion" 
        Icon={iconoPorTipo.coordinacionInspeccion}
        tipoDocumento="coordinacionInspeccion"
        isOpen={bandejasAbiertas.coordinacionInspeccion}
        onToggle={() => toggleBandeja('coordinacionInspeccion')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>{t("complex.ui.trazabilidad.fecha_de_la_llamada")}</label>
            <InputFechaHoraProtocolo
              name="fchaCoordInspeccion"
              value={formData.fchaCoordInspeccion || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>{t("complex.ui.trazabilidad.fecha_programada_de_inspeccion")}</label>
            <InputFechaHoraProtocolo
              name="fchaProgInspeccion"
              value={formData.fchaProgInspeccion || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
        </div>
        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">{t("complex.ui.trazabilidad.observaciones_de_la_coordinacion")}</label>
          <textarea
            key="textarea-obseCoordInspeccion"
            name="obseCoordInspeccion"
            ref={el => textareaRefs.current.obseCoordInspeccion = el}
            defaultValue={formData.obseCoordInspeccion || ''}
            onBlur={handleBlur}
            rows="3"
            className={trazabilidadInputClass}
            placeholder={t("complex.ui.trazabilidad.observaciones_de_la_coordinacion_de_inspeccion")}
          />
        </div>
      </BandejaDesplegable>

      {/* Inspección */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.inspeccion')} 
        bandeja="inspeccion" 
        Icon={iconoPorTipo.inspeccion}
        tipoDocumento="inspeccion"
        isOpen={bandejasAbiertas.inspeccion}
        onToggle={() => toggleBandeja('inspeccion')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>{t("complex.ui.trazabilidad.fecha_de_inspeccion")}</label>
            <InputFechaHoraProtocolo
              name="fchaInspccion"
              value={formData.fchaInspccion || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
              disabled={Boolean(formData.inspeccionNoAplica)}
            />
            <label className="mt-2 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={Boolean(formData.inspeccionNoAplica)}
                onChange={(e) =>
                  handleChange({
                    target: { name: 'inspeccionNoAplica', value: e.target.checked },
                  })
                }
              />
              <span>{t("complex.ui.trazabilidad.inspeccion_no_aplica_no_generar_alertas_de_inspeccion_ni")}</span>
            </label>
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-1 sm:mb-2`}>{t("complex.ui.trazabilidad.observaciones_de_la_inspeccion")}</label>
            <textarea
              key="textarea-obseInspccion"
              name="obseInspccion"
              ref={el => textareaRefs.current.obseInspccion = el}
              defaultValue={formData.obseInspccion || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder={t("complex.ui.trazabilidad.observaciones_de_la_inspeccion_2")}
            />
          </div>
        </div>
        
        {!soloFechas && (
        <div className="mt-3 sm:mt-4">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">{t("complex.ui.trazabilidad.acta_de_inspeccion")}</label>
          <label className="mb-2 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={Boolean(formData.actaInspeccionNoAplica)}
              disabled={Boolean(formData.inspeccionNoAplica)}
              onChange={(e) =>
                handleChange({
                  target: { name: 'actaInspeccionNoAplica', value: e.target.checked },
                })
              }
            />
            <span>{t("complex.ui.trazabilidad.acta_no_aplica_hubo_inspeccion_pero_no_se_elabora_acta")}</span>
          </label>
          {!formData.inspeccionNoAplica && !formData.actaInspeccionNoAplica && (
            <ArchivoDropZone
              tipo="inspeccion"
              campo="adjunto_acta_inspeccion"
              onSelectFiles={onSelectFiles}
              estadoAdjunto={obtenerEstadoAdjunto('inspeccion')}
            >
              {(isDragActive) =>
                isDragActive ? (
                  <p className="font-body text-xs font-medium text-fenix-primario sm:text-sm">{t("complex.ui.trazabilidad.suelta_los_archivos_aqui")}</p>
                ) : (
                  <p className="font-body text-xs text-gray-600 dark:text-gray-300 sm:text-sm">{t("complex.ui.trazabilidad.arrastra_archivos_aqui_o_haz_clic_para_seleccionar")}</p>
                )
              }
            </ArchivoDropZone>
          )}
        </div>
        )}
      </BandejaDesplegable>

      {/* Solicitud de Documentos */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.solicitud_docs')} 
        bandeja="solicitudDocs" 
        Icon={iconoPorTipo.solicitudDocs}
        tipoDocumento="solicitudDocs"
        isOpen={bandejasAbiertas.solicitudDocs}
        onToggle={() => toggleBandeja('solicitudDocs')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.fecha_de_solicitud_de_documentos")}</label>
            <InputFechaHoraProtocolo
              name="fchaSoliDocu"
              value={formData.fchaSoliDocu || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.observaciones_de_la_solicitud")}</label>
            <textarea
              key="textarea-obseSoliDocu"
              name="obseSoliDocu"
              ref={el => textareaRefs.current.obseSoliDocu = el}
              defaultValue={formData.obseSoliDocu || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder={t("complex.ui.trazabilidad.observaciones_de_la_solicitud_2")}
            />
          </div>
        </div>
        
        {!soloFechas && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("complex.ui.trazabilidad.adjuntos_de_la_solicitud")}</label>
          <ArchivoDropZone
            tipo="solicitudDocs"
            campo="adjunto_solicitud_documento"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('solicitudDocs')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">{t("complex.ui.trazabilidad.suelta_los_archivos_aqui")}</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.trazabilidad.arrastra_archivos_aqui_o_haz_clic_para_seleccionar")}</p>
              )
            }
          </ArchivoDropZone>
        </div>
        )}
      </BandejaDesplegable>

      {/* Seguimiento de documentos pendientes — protocolo fase 8 */}
      {!soloFechas && (
      <BandejaDesplegable
        titulo={t('complex.ui.etapas_trazabilidad.seguimiento_documentos_pendientes')}
        bandeja="seguimientoDocsPendientes"
        Icon={iconoPorTipo.seguimientoDocsPendientes}
        tipoDocumento="seguimientoDocsPendientes"
        isOpen={bandejasAbiertas.seguimientoDocsPendientes}
        onToggle={() => toggleBandeja('seguimientoDocsPendientes')}
        ocultarDocumentosSubidos
      >
        <SeguimientoDocumentosPendientes
          historialDocs={historialDocs}
          updateHistorialDocs={updateHistorialDocs}
          handleChange={handleChange}
          formData={formData}
          construirUrlArchivo={construirUrlArchivo}
        />
      </BandejaDesplegable>
      )}

      {/* Informe Preliminar */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.informe_preliminar')} 
        bandeja="informePreliminar" 
        Icon={iconoPorTipo.informePreliminar}
        tipoDocumento="informePreliminar"
        isOpen={bandejasAbiertas.informePreliminar}
        onToggle={() => toggleBandeja('informePreliminar')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.fecha_del_informe_preliminar")}</label>
            <InputFechaHoraProtocolo
              name="fchaInfoPrelm"
              value={formData.fchaInfoPrelm || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.observaciones_del_informe_preliminar")}</label>
            <textarea
              key="textarea-obseInfoPrelm"
              name="obseInfoPrelm"
              ref={el => textareaRefs.current.obseInfoPrelm = el}
              defaultValue={formData.obseInfoPrelm || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder={t("complex.ui.trazabilidad.observaciones_del_informe_preliminar_2")}
            />
          </div>
        </div>
        
        {!soloFechas && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("complex.ui.trazabilidad.adjunto_del_informe_preliminar")}</label>
          <ArchivoDropZone
            tipo="informePreliminar"
            campo="adjunto_informe_preliminar"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('informePreliminar')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">{t("complex.ui.trazabilidad.suelta_los_archivos_aqui")}</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.trazabilidad.arrastra_archivos_aqui_o_haz_clic_para_seleccionar")}</p>
              )
            }
          </ArchivoDropZone>
        </div>
        )}
      </BandejaDesplegable>

      {/* Último Documento */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.ultimo_documento')} 
        bandeja="ultimoDocumento" 
        Icon={iconoPorTipo.ultimoDocumento}
        tipoDocumento="ultimoDocumento"
        isOpen={bandejasAbiertas.ultimoDocumento}
        onToggle={() => toggleBandeja('ultimoDocumento')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.fecha_del_ultimo_documento")}</label>
            <InputFechaHoraProtocolo
              name="fchaRepoActi"
              value={formData.fchaRepoActi || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.observaciones_del_ultimo_documento")}</label>
            <textarea
              key="textarea-obseRepoActi"
              name="obseRepoActi"
              ref={el => textareaRefs.current.obseRepoActi = el}
              defaultValue={formData.obseRepoActi || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder={t("complex.ui.trazabilidad.observaciones_del_ultimo_documento_2")}
            />
          </div>
        </div>
        
        {!soloFechas && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("complex.ui.trazabilidad.adjunto_del_ultimo_documento")}</label>
          <ArchivoDropZone
            tipo="ultimoDocumento"
            campo="adjunto_entrega_ultimo_documento"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('ultimoDocumento')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">{t("complex.ui.trazabilidad.suelta_los_archivos_aqui")}</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.trazabilidad.arrastra_archivos_aqui_o_haz_clic_para_seleccionar")}</p>
              )
            }
          </ArchivoDropZone>
        </div>
        )}
      </BandejaDesplegable>

      {/* Informe Final */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.informe_final')} 
        bandeja="informeFinal" 
        Icon={iconoPorTipo.informeFinal}
        tipoDocumento="informeFinal"
        isOpen={bandejasAbiertas.informeFinal}
        onToggle={() => toggleBandeja('informeFinal')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.fecha_del_informe_final")}</label>
            <InputFechaHoraProtocolo
              name="fchaInfoFnal"
              value={formData.fchaInfoFnal || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.observaciones_del_informe_final")}</label>
            <textarea
              key="textarea-obseInfoFnal"
              name="obseInfoFnal"
              ref={el => textareaRefs.current.obseInfoFnal = el}
              defaultValue={formData.obseInfoFnal || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder={t("complex.ui.trazabilidad.observaciones_del_informe_final_2")}
            />
          </div>
        </div>
        
        {!soloFechas && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("complex.ui.trazabilidad.adjunto_del_informe_final")}</label>
          <ArchivoDropZone
            tipo="informeFinal"
            campo="adjunto_informe_final"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('informeFinal')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">{t("complex.ui.trazabilidad.suelta_los_archivos_aqui")}</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.trazabilidad.arrastra_archivos_aqui_o_haz_clic_para_seleccionar")}</p>
              )
            }
          </ArchivoDropZone>
        </div>
        )}
      </BandejaDesplegable>

      {/* Seguimiento de autorización por parte de la compañía — protocolo fase 11 */}
      {!soloFechas && (
      <BandejaDesplegable
        titulo={t('complex.ui.etapas_trazabilidad.seguimiento_autorizacion_compania_largo')}
        bandeja="seguimientoAutorizacionCompania"
        Icon={iconoPorTipo.seguimientoAutorizacionCompania}
        tipoDocumento="seguimientoAutorizacionCompania"
        isOpen={bandejasAbiertas.seguimientoAutorizacionCompania}
        onToggle={() => toggleBandeja('seguimientoAutorizacionCompania')}
        ocultarDocumentosSubidos
      >
        <SeguimientoAutorizacionCompania
          historialDocs={historialDocs}
          updateHistorialDocs={updateHistorialDocs}
          handleChange={handleChange}
          formData={formData}
          construirUrlArchivo={construirUrlArchivo}
        />
      </BandejaDesplegable>
      )}

      {/* Presentación de Cifras */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.presentacion_de_cifras')} 
        bandeja="presentacionCifras" 
        Icon={iconoPorTipo.presentacionCifras}
        tipoDocumento="presentacionCifras"
        isOpen={bandejasAbiertas.presentacionCifras}
        onToggle={() => toggleBandeja('presentacionCifras')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.fecha_de_presentacion_de_cifras")}</label>
            <InputFechaHoraProtocolo
              name="fchaPresentacionCifras"
              value={formData.fchaPresentacionCifras || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.fecha_en_que_la_aseguradora_acepta_la_cifra")}</label>
            <InputFechaHoraProtocolo
              name="fchaAceptacionCifrasAseguradora"
              value={formData.fchaAceptacionCifrasAseguradora || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div className="md:col-span-2">
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.observaciones_de_presentacion_de_cifras")}</label>
            <textarea
              key="textarea-obsePresentacionCifras"
              name="obsePresentacionCifras"
              ref={el => textareaRefs.current.obsePresentacionCifras = el}
              defaultValue={formData.obsePresentacionCifras || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder={t("complex.ui.trazabilidad.observaciones_de_presentacion_de_cifras_2")}
            />
          </div>
        </div>
        {diasRespuestaAseguradoraCifra != null && (
          <p className={`${complexHint} mt-3 px-1`}>{t("complex.ui.trazabilidad.tiempo_de_respuesta_de_la_aseguradora_presentacion_acept")}{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {diasRespuestaAseguradoraCifra}{t("complex.ui.trazabilidad.dia")}{diasRespuestaAseguradoraCifra !== 1 ? 's' : ''}
            </span>
          </p>
        )}
        
        {!soloFechas && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("complex.ui.trazabilidad.adjunto_de_presentacion_de_cifras")}</label>
          <ArchivoDropZone
            tipo="presentacionCifras"
            campo="adjunto_presentacion_cifras"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('presentacionCifras')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">{t("complex.ui.trazabilidad.suelta_los_archivos_aqui")}</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.trazabilidad.arrastra_archivos_aqui_o_haz_clic_para_seleccionar")}</p>
              )
            }
          </ArchivoDropZone>
        </div>
        )}
      </BandejaDesplegable>

      {/* Seguimiento de documentos de pago — protocolo fase 13 */}
      {!soloFechas && (
      <BandejaDesplegable
        titulo={t('complex.ui.etapas_trazabilidad.seguimiento_documentos_pago_largo')}
        bandeja="seguimientoDocumentosPago"
        Icon={iconoPorTipo.seguimientoDocumentosPago}
        tipoDocumento="seguimientoDocumentosPago"
        isOpen={bandejasAbiertas.seguimientoDocumentosPago}
        onToggle={() => toggleBandeja('seguimientoDocumentosPago')}
        ocultarDocumentosSubidos
      >
        <SeguimientoDocumentosPago
          historialDocs={historialDocs}
          updateHistorialDocs={updateHistorialDocs}
          handleChange={handleChange}
          formData={formData}
          construirUrlArchivo={construirUrlArchivo}
        />
      </BandejaDesplegable>
      )}

      {/* Envío de Finiquito */}
      <BandejaDesplegable 
        titulo={t('complex.ui.etapas_trazabilidad.envio_de_finiquito')} 
        bandeja="envioFiniquito" 
        Icon={iconoPorTipo.envioFiniquito}
        tipoDocumento="envioFiniquito"
        isOpen={bandejasAbiertas.envioFiniquito}
        onToggle={() => toggleBandeja('envioFiniquito')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.fecha_de_envio_de_finiquito")}</label>
            <InputFechaHoraProtocolo
              name="fchaEnvioFiniquito"
              value={formData.fchaEnvioFiniquito || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.trazabilidad.observaciones_de_envio_de_finiquito")}</label>
            <textarea
              key="textarea-obseEnvioFiniquito"
              name="obseEnvioFiniquito"
              ref={el => textareaRefs.current.obseEnvioFiniquito = el}
              defaultValue={formData.obseEnvioFiniquito || ''}
              onBlur={handleBlur}
              rows="3"
              className={trazabilidadInputClass}
              placeholder={t("complex.ui.trazabilidad.observaciones_de_envio_de_finiquito_2")}
            />
          </div>
        </div>
        
        {!soloFechas && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("complex.ui.trazabilidad.adjunto_de_envio_de_finiquito")}</label>
          <ArchivoDropZone
            tipo="envioFiniquito"
            campo="adjunto_envio_finiquito"
            onSelectFiles={onSelectFiles}
            estadoAdjunto={obtenerEstadoAdjunto('envioFiniquito')}
          >
            {(isDragActive) =>
              isDragActive ? (
                <p className="font-body text-sm font-medium text-fenix-primario">{t("complex.ui.trazabilidad.suelta_los_archivos_aqui")}</p>
              ) : (
                <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.trazabilidad.arrastra_archivos_aqui_o_haz_clic_para_seleccionar")}</p>
              )
            }
          </ArchivoDropZone>
        </div>
        )}
      </BandejaDesplegable>
    </div>
    </TrazabilidadBandejaCtx.Provider>
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
    'fchaUltSegui',
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
         prevProps.onSelectFiles !== nextProps.onSelectFiles ||
         prevProps.updateHistorialDocs !== nextProps.updateHistorialDocs ||
         prevProps.construirUrlArchivo !== nextProps.construirUrlArchivo ||
         prevProps.soloFechas !== nextProps.soloFechas;
  
  // Si hay cambios en fechas, forzar re-render
return !debeReRenderizar;
});

Trazabilidad.displayName = 'Trazabilidad';

export default Trazabilidad;
