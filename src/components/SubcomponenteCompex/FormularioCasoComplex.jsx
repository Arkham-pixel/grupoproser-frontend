import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import DatosGenerales from './DatosGenerales';
import Trazabilidad from './Trazabilidad';
import FechasTrazabilidadSura from '../SubcomponenteSura/FechasTrazabilidadSura.jsx';
import ValoresPrestaciones from './ValoresPrestaciones';
import Seguimiento from './Seguimiento';
import Facturacion from './Facturacion';
import Honorarios from './Honorarios';
import ObservacionesCliente from './ObservacionesCliente';
import ObservacionesPendientes from './ObservacionesPendientes';
import { BASE_URL, resolveUploadsUrl } from '../../config/apiConfig.js';
import { resolverUrlArchivo } from '../../services/storageSignedUrl.js';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
  complexFormRoot,
  complexFormShell,
  complexScope,
} from './complexFenixUi';
import { ComplexFormActions, ComplexFormTabs } from './FacturacionHelpers';
import AutoSaveNotification from '../AutoSave/AutoSaveNotification';
import AutoSaveRestoreDialog from '../AutoSave/AutoSaveRestoreDialog';
import { getCasoComplex, updateCasoComplex, moverCasoComplexASura } from '../../services/complexService.js';
import { getCasoSuraById, actualizarCasoSura } from '../../services/segurosSuraService.js';
import { calcularTotalesControlHoras, controlHorasTieneDatos, resolverControlHorasDesdeEnvios } from './controlHoras/controlHorasUtils';
import { appendUploadFile } from '../../utils/sanitizeUploadFileName.js';
import { enriquecerPlantillaContactoInicial } from '../../utils/contactoInicialPlantillaCorreo.js';
import { autoSaveService } from '../../services/autoSaveService.js';
import {
  registerOfflineSyncHandler,
  unregisterOfflineSyncHandler,
  isBrowserOnline,
  flushOfflineSyncHandler,
} from '../../services/offlineSyncRegistry.js';
import useOnlineStatus from '../../hooks/useOnlineStatus.js';
import {
  notifyFormServerSaved,
  subscribeFormServerSaved,
} from '../../services/formSyncChannel.js';
import { AUTO_SAVE_ENABLED } from '../../config/autoSaveConfig.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import {
  asegurarOpcionActual,
  mapCatalogoCatastroficoAOpciones,
  resolverLiderPorModulo,
} from '../../utils/catalogosAsignacionCatastrofico.js';
import {
  CAMPOS_FECHA_HORA_PROTOCOLO,
  formatearFechaHoraParaInput,
} from '../../utils/complexFechaHoraUtils.js';
import { CAMPOS_FECHA_HITOS_TRAZABILIDAD } from '../../utils/ajusteTrazabilidadComplexMap.js';
import { ESTADOS_SURA, normalizarEstadoSura } from '../SubcomponenteSura/segurosSuraHelpers.js';

const SURA_ALIASES = ['SEGUROS GENERALES SURAMERICANA', 'SURAMERICANA', 'SEGUROS SURA', 'SURA'];

function esClienteSura(cliente = {}) {
  const blob = `${cliente.codiAsgrdra || ''} ${cliente.rzonSocial || ''} ${cliente.nombre || ''}`.toUpperCase();
  return SURA_ALIASES.some((alias) => blob.includes(alias));
}

/** Normaliza opciones del catálogo de funcionarios de aseguradora (incluye email). */
function mapearOpcionFuncionarioAseguradora(f) {
  const rawValue =
    f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? f.nmbrContcto ?? f.nombre ?? '';
  const label = f.nmbrContcto || f.nombre || f.label || '';
  const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
  if (!value || !label) return null;
  return {
    value,
    label,
    email: String(f.email || '').trim(),
  };
}

export default function FormularioCasoComplex({ initialData, onSave, onAutoSave, onCancel, camposFijos = false, autoGuardadoActivo = false, variant = 'complex' }) {
  const { t } = useTranslation();
  const esSura = variant === 'sura';
  const storageKey = esSura ? 'formularioSura' : 'formularioComplex';
  const apiModulo = esSura ? 'sura' : 'complex';
  const cargarCasoPorServicio = esSura ? getCasoSuraById : getCasoComplex;
  const actualizarCasoPorServicio = esSura ? actualizarCasoSura : updateCasoComplex;
  const autoguardadoEfectivo = AUTO_SAVE_ENABLED && autoGuardadoActivo;
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [tabActiva, setTabActiva] = useState('datosGenerales');
  const [moviendoASura, setMoviendoASura] = useState(false);

  const FORM_TABS = useMemo(
    () => {
      const tabs = [
        { id: 'datosGenerales', label: t('complex.ui.formulario_caso_complex.tab_datos_generales') },
        { id: 'valores', label: t('complex.ui.formulario_caso_complex.tab_valores') },
        { id: 'trazabilidad', label: esSura ? 'Fechas' : t('complex.ui.formulario_caso_complex.tab_trazabilidad') },
        { id: 'facturacion', label: t('complex.ui.formulario_caso_complex.tab_facturacion') },
        { id: 'honorarios', label: t('complex.ui.formulario_caso_complex.tab_honorarios') },
        { id: 'seguimiento', label: t('complex.ui.formulario_caso_complex.tab_seguimiento') },
        { id: 'observacionesPendientes', label: t('complex.ui.formulario_caso_complex.tab_observaciones_pendientes') },
        { id: 'observaciones', label: t('complex.ui.formulario_caso_complex.tab_observaciones') },
      ];
      const tabsOcultasSura = new Set([
        'honorarios',
        'seguimiento',
        'observacionesPendientes',
        'observaciones',
      ]);
      return esSura ? tabs.filter((tab) => !tabsOcultasSura.has(tab.id)) : tabs;
    },
    [t, esSura]
  );

  useEffect(() => {
    const tabsOcultasSura = new Set([
      'honorarios',
      'seguimiento',
      'observacionesPendientes',
      'observaciones',
    ]);
    if (esSura && tabsOcultasSura.has(tabActiva)) {
      setTabActiva('datosGenerales');
    }
  }, [esSura, tabActiva]);
  const [formData, setFormData] = useState({
    nmroAjste: '',
    nmroSinstro: '',
    nombIntermediario: '',
    codWorkflow: '',
    nmroPolza: '',
    codiRespnsble: '',
    codiAsgrdra: '',
    funcAsgrdra: '',
    funcAsgrdraNombre: '',
    emailFuncionarioAseguradora: '',
    nombreResponsable: '',
    ajustadorLider: '',
    ajustador: '',
    inspector: '',
    correo: '',
    celular: '',
    sede: '',
    direccionPredio: '',
    tomador: '',
    numeroCredito: '',
    fechaInicioPoliza: '',
    fechaFinPoliza: '',
    estadoPagoPrimas: '',
    departamento: '',
    departamentoCiudad: '',
    asgrBenfcro: '',
    tipoDucumento: '',
    numDocumento: '',
    tipoPoliza: '',
    ciudadSiniestro: '',
    amprAfctdo: '',
    descSinstro: '',
    causa_siniestro: '',
    estado: '',
    descripcionEstado: '',
    observacionesPendientes: '',
    fchaAsgncion: '',
    fchaSinstro: '',
    fchaInspccion: '',
    fchaContIni: '',
    fechaInspeccion: '',
    horaInicioCoordinacion: '',
    horaFinCoordinacion: '',
    nombreCliente: esSura ? 'SEGUROS GENERALES SURAMERICANA S.A.' : '',
    nombreAseguradora: esSura ? 'SEGUROS GENERALES SURAMERICANA S.A.' : '',

    // ...otros campos existentes...
    historialDocs: [],
    plantillaContactoInicial: null,
    control_horas: null,
  });

  const [estados, setEstados] = useState([]);
  const [forceReloadCaso, setForceReloadCaso] = useState(0);

  const ordenarPorLabel = useCallback((lista = []) => {
    return [...lista].sort((a, b) => {
      const etiquetaA = (a?.label ?? '').toString();
      const etiquetaB = (b?.label ?? '').toString();
      return etiquetaA.localeCompare(etiquetaB, 'es', { sensitivity: 'base' });
    });
  }, []);

  // El select usa formData.estado (código), pero el backend/reporte guardan codiEstdo.
  const resolverEstadoParaSelect = useCallback((fuente = {}, listaEstados = []) => {
    const seleccionUsuario = String(fuente.estado ?? '').trim();
    if (seleccionUsuario) {
      if (listaEstados.length === 0 || listaEstados.some((e) => String(e.value) === seleccionUsuario)) {
        return seleccionUsuario;
      }
    }

    const raw = fuente.codiEstdo ?? fuente.codi_estado ?? fuente.codi_estdo ?? fuente.estado;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return '';
    }
    const valorStr = String(raw).trim();

    if (listaEstados.length > 0) {
      const porCodigo = listaEstados.find((e) => String(e.value) === valorStr);
      if (porCodigo) return String(porCodigo.value);

      const porLabel = listaEstados.find(
        (e) => String(e.label || '').trim().toUpperCase() === valorStr.toUpperCase()
      );
      if (porLabel) return String(porLabel.value);
    }

    return valorStr;
  }, []);

  const extraerCodiEstdoParaGuardar = useCallback((fuente = {}) => {
    const raw = fuente.estado ?? fuente.codiEstdo ?? fuente.codi_estado ?? fuente.codi_estdo;
    if (raw === undefined || raw === null) return '';
    return String(raw).trim();
  }, []);

  // Función helper para convertir fechas ISO a formato yyyy-MM-dd para inputs de tipo date
  const formatearFechaParaInput = useCallback((fecha) => {
    if (!fecha) {
return '';
    }
    
if (typeof fecha === 'string' && fecha.includes('T')) {
      // Si es formato ISO, extraer solo la parte de la fecha
      const fechaFormateada = fecha.split('T')[0];
return fechaFormateada;
    }
    if (fecha instanceof Date) {
      // Si es un objeto Date, convertir a yyyy-MM-dd
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const fechaFormateada = `${year}-${month}-${day}`;
return fechaFormateada;
    }
    // Si ya está en formato yyyy-MM-dd, devolverlo tal cual
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
return fecha;
    }
    // Si viene en formato dd/MM/yyyy (común en listados/reportes), convertir a yyyy-MM-dd
    if (typeof fecha === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
      const [day, month, year] = fecha.split('/');
      const fechaFormateada = `${year}-${month}-${day}`;
return fechaFormateada;
    }
return '';
  }, []);

  const formatearCampoParaInput = useCallback(
    (campo, fecha) => {
      if (CAMPOS_FECHA_HORA_PROTOCOLO.has(campo)) {
        return formatearFechaHoraParaInput(fecha);
      }
      return formatearFechaParaInput(fecha);
    },
    [formatearFechaParaInput]
  );

  const ordenarStrings = useCallback((lista = []) => {
    return [...lista].sort((a, b) =>
      a.toString().localeCompare(b.toString(), 'es', { sensitivity: 'base' })
    );
  }, []);

  /** Sync para normalizar historial (proxy). Para abrir/ver preferir resolverUrlArchivo async. */
  const construirUrlArchivo = useCallback((valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('data:')) return valor;
    return resolveUploadsUrl(valor) || '';
  }, []);

  /** Abre/resuelve URL firmada S3 (usar en click/vista). */
  const resolverUrlArchivoAsync = useCallback(async (valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('data:')) return valor;
    return (await resolverUrlArchivo(valor)) || '';
  }, []);

  const normalizarHistorialDocs = useCallback((docs = []) => {
    if (!Array.isArray(docs)) return [];
    return docs.map((doc) => {
      if (!doc || typeof doc !== 'object') return doc;
      const urlOriginal = doc.ruta || doc.url || doc.path || doc.data || '';
      const urlAbsoluta = construirUrlArchivo(urlOriginal);
      const rutaRelativa = doc.ruta
        || (typeof doc.url === 'string' ? doc.url.replace(/^https?:\/\/[^/]+/i, '') : '')
        || (urlAbsoluta ? urlAbsoluta.replace(/^https?:\/\/[^/]+/i, '') : '');
      
      // Preservar TODOS los campos del documento, especialmente las fechas
      // Prioridad: fechaCreacion (fecha original del documento) > fecha (fecha principal) > fechaSubida (fecha de subida)
      return {
        ...doc, // Preservar todos los campos originales primero
        url: urlAbsoluta || doc.data || doc.url || '',
        ruta: rutaRelativa || doc.ruta || undefined,
        // Asegurar que las fechas se preserven con prioridad a fechaCreacion
        fechaCreacion: doc.fechaCreacion || doc.fecha || doc.fechaSubida || undefined, // Fecha de creación del documento (prioridad)
        fecha: doc.fecha || doc.fechaCreacion || doc.fechaSubida || undefined, // Fecha principal (usa fechaCreacion si está disponible)
        fechaSubida: doc.fechaSubida || undefined, // Fecha en que se subió al sistema
        // Preservar otros campos importantes
        tipo: doc.tipo || doc.categoria || undefined,
        nombre: doc.nombre || doc.filename || undefined,
        comentario: doc.comentario || doc.observacion || undefined,
        tamano: doc.tamano || doc.size || undefined,
        tipoMime: doc.tipoMime || doc.mimeType || undefined,
        usuario: doc.usuario || doc.user || undefined,
      };
    });
  }, [construirUrlArchivo]);

  // Sincronizar historialDocs con initialData si existe (modo edición)
  // Solo usar initialData si tiene _id (es edición), de lo contrario ignorarlo
  useEffect(() => {
if (initialData && initialData._id) {
      const normalizados = { ...initialData };
      const equivalencias = {
        ciudadSiniestro: ['ciudadSiniestro', 'ciudad_siniestro'],
        sede: ['sede', 'sedeRiesgo'],
        direccionPredio: ['direccionPredio', 'direccion', 'codDireccion'],
        causa_siniestro: ['causa_siniestro', 'causa'],
        fchaUltSegui: ['fchaUltSegui', 'fcha_ult_segui'],
        fchaActSegui: ['fchaActSegui', 'fcha_act_segui'],
        obseSegmnto: ['obseSegmnto', 'obse_segmnto'],
        obseComprmsi: ['obseComprmsi', 'obse_comprmsi'],
        diasTranscrrdo: ['diasTranscrrdo', 'dias_transcrrdo'],
        nombreResponsable: ['nombreResponsable', 'responsable', 'respnsble'],
        funcAsgrdra: ['funcAsgrdra', 'funcionarioAseguradoraId', 'funcionarioAseguradora'],
        funcAsgrdraNombre: ['funcAsgrdraNombre', 'funcionarioAseguradora', 'funcionario', 'nombreFuncionario'],
        // Mapear fechas de trazabilidad desde backend (fcha_info_prelm) a frontend (fchaInfoPrelm)
        fchaSoliDocu: ['fchaSoliDocu', 'fcha_soli_docu'],
        fchaInfoPrelm: ['fchaInfoPrelm', 'fcha_info_prelm'],
        fchaInfoFnal: ['fchaInfoFnal', 'fcha_info_fnal'],
        fchaRepoActi: ['fchaRepoActi', 'fcha_repo_acti'],
        fchaPresentacionCifras: ['fchaPresentacionCifras', 'fcha_presentacion_cifras'],
        fchaAceptacionCifrasAseguradora: ['fchaAceptacionCifrasAseguradora', 'fcha_aceptacion_cifras_aseguradora'],
        fchaReconsideracion: ['fchaReconsideracion', 'fcha_reconsideracion'],
        fchaEnvioFiniquito: ['fchaEnvioFiniquito', 'fcha_envio_finiquito'],
        // Mapear campos de coordinación de inspección
        fchaCoordInspeccion: ['fchaCoordInspeccion', 'fcha_coord_inspeccion'],
        fchaProgInspeccion: ['fchaProgInspeccion', 'fcha_prog_inspeccion'],
        obseCoordInspeccion: ['obseCoordInspeccion', 'obse_coord_inspeccion'],
        // Mapear fecha de control de horas
        fchaControlHoras: ['fchaControlHoras', 'fcha_control_horas', 'fecha_control_horas'],
        // Mapear fecha de envío control de horas (Gerencia)
        fchaEnvioControlHoras: ['fchaEnvioControlHoras', 'fcha_envio_control_horas', 'fecha_envio_control_horas'],
        fchaRecibidoControlHoras: ['fchaRecibidoControlHoras', 'fcha_recibido_control_horas', 'fecha_recibido_control_horas'],
        // Mapear fecha de seguimiento de envío control de horas
        fchaSeguimientoEnvioControlHoras: ['fchaSeguimientoEnvioControlHoras', 'fcha_seguimiento_envio_control_horas', 'fecha_seguimiento_envio_control_horas']
      };

      Object.entries(equivalencias).forEach(([destino, claves]) => {
        for (const clave of claves) {
          if (initialData[clave] !== undefined && initialData[clave] !== null && initialData[clave] !== '') {
            normalizados[destino] = initialData[clave];
            break;
          }
        }
      });

      if (!normalizados.origen && initialData._id) {
        normalizados.origen = 'complex';
      }

      // Log para depurar fechas de trazabilidad
setFormData(prev => {
        // Obtener fechas directamente de initialData (prioridad: camelCase > snake_case)
        // Esto asegura que siempre obtengamos la fecha correcta, incluso si viene en formato ISO
        const fchaInfoPrelmRaw = initialData.fchaInfoPrelm || initialData.fcha_info_prelm || normalizados.fchaInfoPrelm;
        const fchaInfoFnalRaw = initialData.fchaInfoFnal || initialData.fcha_info_fnal || normalizados.fchaInfoFnal;
        const fchaSoliDocuRaw = initialData.fchaSoliDocu || initialData.fcha_soli_docu || normalizados.fchaSoliDocu;
        const fchaRepoActiRaw = initialData.fchaRepoActi || initialData.fcha_repo_acti || normalizados.fchaRepoActi;
        const fchaPresentacionCifrasRaw = initialData.fchaPresentacionCifras || initialData.fcha_presentacion_cifras || normalizados.fchaPresentacionCifras;
        const fchaAceptacionCifrasAseguradoraRaw = initialData.fchaAceptacionCifrasAseguradora || initialData.fcha_aceptacion_cifras_aseguradora || normalizados.fchaAceptacionCifrasAseguradora;
        const fchaReconsideracionRaw = initialData.fchaReconsideracion || initialData.fcha_reconsideracion || normalizados.fchaReconsideracion;
        const fchaEnvioFiniquitoRaw = initialData.fchaEnvioFiniquito || initialData.fcha_envio_finiquito || normalizados.fchaEnvioFiniquito;
        const fchaCoordInspeccionRaw = initialData.fchaCoordInspeccion || initialData.fcha_coord_inspeccion || normalizados.fchaCoordInspeccion;
        const fchaProgInspeccionRaw = initialData.fchaProgInspeccion || initialData.fcha_prog_inspeccion || normalizados.fchaProgInspeccion;
        const fchaControlHorasRaw = initialData.fchaControlHoras || initialData.fcha_control_horas || initialData.fecha_control_horas || normalizados.fchaControlHoras;
        const fchaEnvioControlHorasRaw = initialData.fchaEnvioControlHoras || initialData.fcha_envio_control_horas || initialData.fecha_envio_control_horas || normalizados.fchaEnvioControlHoras;
        const fchaRecibidoControlHorasRaw = initialData.fchaRecibidoControlHoras || initialData.fcha_recibido_control_horas || initialData.fecha_recibido_control_horas || normalizados.fchaRecibidoControlHoras;
        const fchaSeguimientoEnvioControlHorasRaw = initialData.fchaSeguimientoEnvioControlHoras || initialData.fcha_seguimiento_envio_control_horas || initialData.fecha_seguimiento_envio_control_horas || normalizados.fchaSeguimientoEnvioControlHoras;
        
// Formatear las fechas ANTES de crear nuevoFormData
        const fchaInfoPrelmFormateada = formatearCampoParaInput('fchaInfoPrelm', fchaInfoPrelmRaw);
        const fchaInfoFnalFormateada = formatearCampoParaInput('fchaInfoFnal', fchaInfoFnalRaw);
        const fchaSoliDocuFormateada = formatearCampoParaInput('fchaSoliDocu', fchaSoliDocuRaw);
        const fchaRepoActiFormateada = formatearCampoParaInput('fchaRepoActi', fchaRepoActiRaw);
        const fchaPresentacionCifrasFormateada = formatearCampoParaInput(
          'fchaPresentacionCifras',
          fchaPresentacionCifrasRaw
        );
        const fchaAceptacionCifrasAseguradoraFormateada = formatearCampoParaInput(
          'fchaAceptacionCifrasAseguradora',
          fchaAceptacionCifrasAseguradoraRaw
        );
        const fchaReconsideracionFormateada = formatearCampoParaInput(
          'fchaReconsideracion',
          fchaReconsideracionRaw
        );
        const fchaEnvioFiniquitoFormateada = formatearCampoParaInput(
          'fchaEnvioFiniquito',
          fchaEnvioFiniquitoRaw
        );
        const fchaCoordInspeccionFormateada = formatearCampoParaInput(
          'fchaCoordInspeccion',
          fchaCoordInspeccionRaw
        );
        const fchaProgInspeccionFormateada = formatearCampoParaInput(
          'fchaProgInspeccion',
          fchaProgInspeccionRaw
        );
        const fchaControlHorasFormateada = formatearFechaParaInput(fchaControlHorasRaw);
        const fchaEnvioControlHorasFormateada = formatearFechaParaInput(fchaEnvioControlHorasRaw);
        const fchaRecibidoControlHorasFormateada = formatearFechaParaInput(fchaRecibidoControlHorasRaw);
        const fchaSeguimientoEnvioControlHorasFormateada = formatearFechaParaInput(fchaSeguimientoEnvioControlHorasRaw);
        
const nuevoFormData = {
          ...prev,
          ...normalizados,
          _id: initialData._id || initialData.id || prev._id, // Asegurar que _id se incluya
          historialDocs: normalizarHistorialDocs(initialData.historialDocs),
          // IMPORTANTE: Las fechas formateadas deben ir DESPUÉS del spread para sobrescribir las fechas ISO
          // Convertir fechas ISO a formato yyyy-MM-dd para inputs de tipo date
          fchaAsgncion: formatearCampoParaInput(
            'fchaAsgncion',
            normalizados.fchaAsgncion || initialData.fchaAsgncion
          ),
          fchaSinstro: formatearFechaParaInput(normalizados.fchaSinstro || initialData.fchaSinstro),
          fchaInspccion: formatearCampoParaInput(
            'fchaInspccion',
            normalizados.fchaInspccion || initialData.fchaInspccion
          ),
          fchaContIni: formatearCampoParaInput(
            'fchaContIni',
            normalizados.fchaContIni || initialData.fchaContIni
          ),
          // Fechas de trazabilidad con hora para medición precisa del protocolo
          fchaSoliDocu: fchaSoliDocuFormateada,
          fchaInfoPrelm: fchaInfoPrelmFormateada,
          fchaInfoFnal: fchaInfoFnalFormateada,
          fchaRepoActi: fchaRepoActiFormateada,
          fchaPresentacionCifras: fchaPresentacionCifrasFormateada,
          fchaAceptacionCifrasAseguradora: fchaAceptacionCifrasAseguradoraFormateada,
          fchaReconsideracion: fchaReconsideracionFormateada,
          fchaEnvioFiniquito: fchaEnvioFiniquitoFormateada,
          fchaCoordInspeccion: fchaCoordInspeccionFormateada,
          fchaProgInspeccion: fchaProgInspeccionFormateada,
          fchaControlHoras: fchaControlHorasFormateada,
          fechaControlHoras: fchaControlHorasFormateada,
          fecha_control_horas: fchaControlHorasFormateada, // Para el formulario
          fchaEnvioControlHoras: fchaEnvioControlHorasFormateada,
          fechaEnvioControlHoras: fchaEnvioControlHorasFormateada,
          fecha_envio_control_horas: fchaEnvioControlHorasFormateada, // Fecha de envío control de horas (Gerencia)
          fchaRecibidoControlHoras: fchaRecibidoControlHorasFormateada,
          fechaRecibidoControlHoras: fchaRecibidoControlHorasFormateada,
          fecha_recibido_control_horas: fchaRecibidoControlHorasFormateada, // Fecha de recibido control de horas (Gerencia)
          fchaSeguimientoEnvioControlHoras: fchaSeguimientoEnvioControlHorasFormateada,
          fechaSeguimientoEnvioControlHoras: fchaSeguimientoEnvioControlHorasFormateada,
          fecha_seguimiento_envio_control_horas: fchaSeguimientoEnvioControlHorasFormateada,
          observacion_seguimiento_envio_control_horas: initialData.observacion_seguimiento_envio_control_horas || initialData.obse_seguimiento_envio_control_horas || '',
          adjunto_seguimiento_envio_control_horas: (() => {
            const docs = (initialData.historialDocs || []).filter(d => d.tipo === 'seguimientoEvidencia' || d.categoria === 'seguimientoEvidencia');
            return docs.length > 0 ? docs.map(d => d.nombre || d.filename).filter(Boolean).join(', ') : (initialData.adjunto_seguimiento_envio_control_horas || initialData.anxo_seguimiento_envio_control_horas || '');
          })(),
          obseCoordInspeccion: normalizados.obseCoordInspeccion || initialData.obseCoordInspeccion || initialData.obse_coord_inspeccion || '',
          // Cargar descripcionEstado y observacionesPendientes desde initialData
          descripcionEstado: initialData.descripcionEstado || normalizados.descripcionEstado || '',
          observacionesPendientes: initialData.observacionesPendientes || normalizados.observacionesPendientes || '',
          plantillaContactoInicial: initialData.plantillaContactoInicial || normalizados.plantillaContactoInicial || null,
          // Campos de facturación - asegurar que se carguen desde initialData
          numero_factura: initialData.numero_factura || initialData.nmroFactra || normalizados.nmroFactra || '',
          valor_servicio: initialData.valor_servicio || initialData.vlorServcios || normalizados.vlorServcios || '',
          valor_gastos: initialData.valor_gastos || initialData.vlorGastos || normalizados.vlorGastos || '',
          fecha_factura: initialData.fecha_factura || (initialData.fchaFactra || normalizados.fchaFactra ? formatearFechaParaInput(initialData.fchaFactra || normalizados.fchaFactra) : ''),
          fecha_ultima_revision: initialData.fecha_ultima_revision || (initialData.fchaUltRevi || normalizados.fchaUltRevi ? formatearFechaParaInput(initialData.fchaUltRevi || normalizados.fchaUltRevi) : ''),
          observacion_compromisos: initialData.observacion_compromisos || initialData.obseComprmsi || normalizados.obseComprmsi || '',
          adjunto_factura: initialData.adjunto_factura || initialData.anxoFactra || normalizados.anxoFactra || '',
          // Campos de Gerencia - fecha_envio_control_horas ya se estableció arriba en nuevoFormData
          adjunto_evidencia: (() => {
            const docsEvidencia = (initialData.historialDocs || []).filter(doc => 
              doc.tipo === 'evidencia' || doc.categoria === 'evidencia'
            );
            if (docsEvidencia.length > 0) {
              return docsEvidencia.map(doc => doc.nombre || doc.filename).filter(Boolean).join(', ');
            }
            return initialData.adjunto_evidencia || initialData.anxoEvidencia || normalizados.anxoEvidencia || '';
          })(),
          // Sincronizar adjunto_control_horas desde historialDocs
          adjunto_control_horas: (() => {
            const docsControlHoras = (initialData.historialDocs || []).filter(doc => 
              doc.tipo === 'controlHoras' || doc.categoria === 'controlHoras'
            );
            if (docsControlHoras.length > 0) {
              return docsControlHoras.map(doc => doc.nombre || doc.filename).filter(Boolean).join(', ');
            }
            return initialData.adjunto_control_horas || '';
          })(),
          control_horas: (() => {
            const ch = resolverControlHorasDesdeEnvios(initialData) || normalizados.control_horas;
            return controlHorasTieneDatos(ch) ? ch : null;
          })(),
          estado: resolverEstadoParaSelect({ ...initialData, ...normalizados }, estados),
        };

        if (esSura) {
          nuevoFormData.nmroAjste = nuevoFormData.nmroAjste || initialData.consecutivo || '';
          nuevoFormData.nmroSinstro = nuevoFormData.nmroSinstro || initialData.siniestro || '';
          nuevoFormData.numDocumento = nuevoFormData.numDocumento || initialData.identificacion || '';
          nuevoFormData.asgrBenfcro = nuevoFormData.asgrBenfcro || initialData.asegurado || '';
          nuevoFormData.nmroPolza = nuevoFormData.nmroPolza || initialData.numeroPoliza || '';
          nuevoFormData.codiRespnsble = nuevoFormData.codiRespnsble || initialData.ajustador || '';
          nuevoFormData.ajustador =
            nuevoFormData.ajustador || initialData.ajustador || nuevoFormData.codiRespnsble || '';
          nuevoFormData.ajustadorLider =
            nuevoFormData.ajustadorLider || initialData.ajustadorLider || '';
          nuevoFormData.inspector = nuevoFormData.inspector || initialData.inspector || '';
          nuevoFormData.correo = nuevoFormData.correo || initialData.correo || '';
          nuevoFormData.celular = nuevoFormData.celular || initialData.celular || '';
          nuevoFormData.sede =
            nuevoFormData.sede || initialData.sede || initialData.sedeRiesgo || '';
          nuevoFormData.direccionPredio =
            nuevoFormData.direccionPredio ||
            initialData.direccionPredio ||
            initialData.direccion ||
            '';
          nuevoFormData.tomador = nuevoFormData.tomador || initialData.tomador || '';
          nuevoFormData.numeroCredito =
            nuevoFormData.numeroCredito || initialData.numeroCredito || '';
          nuevoFormData.fechaInicioPoliza =
            nuevoFormData.fechaInicioPoliza ||
            formatearFechaParaInput(initialData.fechaInicioPoliza) ||
            '';
          nuevoFormData.fechaFinPoliza =
            nuevoFormData.fechaFinPoliza ||
            formatearFechaParaInput(initialData.fechaFinPoliza) ||
            '';
          nuevoFormData.estadoPagoPrimas =
            nuevoFormData.estadoPagoPrimas || initialData.estadoPagoPrimas || '';
          nuevoFormData.nombIntermediario =
            nuevoFormData.nombIntermediario || initialData.nombIntermediario || '';
          nuevoFormData.ciudadSiniestro = nuevoFormData.ciudadSiniestro || initialData.ciudad || '';
          nuevoFormData.departamento =
            nuevoFormData.departamento ||
            initialData.departamento ||
            initialData.departamentoCiudad ||
            '';
          nuevoFormData.departamentoCiudad =
            nuevoFormData.departamentoCiudad ||
            initialData.departamento ||
            initialData.departamentoCiudad ||
            '';
          nuevoFormData.nombreCliente =
            nuevoFormData.nombreCliente || initialData.nombreCliente || 'SEGUROS GENERALES SURAMERICANA S.A.';
          nuevoFormData.nombreAseguradora =
            nuevoFormData.nombreAseguradora ||
            initialData.nombreAseguradora ||
            'SEGUROS GENERALES SURAMERICANA S.A.';
          nuevoFormData.fechaInspeccion =
            formatearFechaParaInput(
              initialData.fechaInspeccion ||
                initialData.fchaProgInspeccion ||
                initialData.fchaInspccion
            ) ||
            nuevoFormData.fchaProgInspeccion ||
            nuevoFormData.fchaInspccion ||
            '';
          nuevoFormData.horaInicioCoordinacion =
            initialData.horaInicioCoordinacion || nuevoFormData.horaInicioCoordinacion || '';
          nuevoFormData.horaFinCoordinacion =
            initialData.horaFinCoordinacion || nuevoFormData.horaFinCoordinacion || '';
        }
        
// Verificación final: asegurar que las fechas formateadas no estén vacías si había una fecha raw
        if (fchaInfoPrelmRaw && !nuevoFormData.fchaInfoPrelm) {
          console.warn('⚠️ [Cargar datos] fchaInfoPrelmRaw existe pero formateada está vacía:', {
            raw: fchaInfoPrelmRaw,
            formateada: nuevoFormData.fchaInfoPrelm
          });
          // Intentar formatear manualmente como último recurso
          if (typeof fchaInfoPrelmRaw === 'string' && fchaInfoPrelmRaw.includes('T')) {
            nuevoFormData.fchaInfoPrelm = fchaInfoPrelmRaw.split('T')[0];
}
        }
        
        // PRESERVAR el funcionario desde initialData - NO normalizar si ya existe
        // Priorizar los valores de initialData directamente si existen
        if (initialData.funcAsgrdra !== undefined && initialData.funcAsgrdra !== null && initialData.funcAsgrdra !== '' && String(initialData.funcAsgrdra).toLowerCase() !== 'sin asignar') {
          nuevoFormData.funcAsgrdra = String(initialData.funcAsgrdra);
        } else if (normalizados.funcAsgrdra && normalizados.funcAsgrdra !== '' && String(normalizados.funcAsgrdra).toLowerCase() !== 'sin asignar' && !nuevoFormData.funcAsgrdra) {
          nuevoFormData.funcAsgrdra = String(normalizados.funcAsgrdra);
        }
        
        if (initialData.funcAsgrdraNombre !== undefined && initialData.funcAsgrdraNombre !== null && initialData.funcAsgrdraNombre !== '' && String(initialData.funcAsgrdraNombre).toLowerCase() !== 'sin asignar') {
          nuevoFormData.funcAsgrdraNombre = String(initialData.funcAsgrdraNombre);
        } else if (normalizados.funcAsgrdraNombre && normalizados.funcAsgrdraNombre !== '' && String(normalizados.funcAsgrdraNombre).toLowerCase() !== 'sin asignar' && !nuevoFormData.funcAsgrdraNombre) {
          nuevoFormData.funcAsgrdraNombre = String(normalizados.funcAsgrdraNombre);
        }
        
        if (initialData.funcionarioAseguradora !== undefined && initialData.funcionarioAseguradora !== null && initialData.funcionarioAseguradora !== '' && String(initialData.funcionarioAseguradora).toLowerCase() !== 'sin asignar') {
          nuevoFormData.funcionarioAseguradora = String(initialData.funcionarioAseguradora);
        } else if (normalizados.funcionarioAseguradora && normalizados.funcionarioAseguradora !== '' && String(normalizados.funcionarioAseguradora).toLowerCase() !== 'sin asignar' && !nuevoFormData.funcionarioAseguradora) {
          nuevoFormData.funcionarioAseguradora = String(normalizados.funcionarioAseguradora);
        }
        
        // Si tenemos nombre pero no código, intentar usar el nombre como código temporal
        if (nuevoFormData.funcAsgrdraNombre && !nuevoFormData.funcAsgrdra && nuevoFormData.funcAsgrdraNombre !== 'Sin asignar' && nuevoFormData.funcAsgrdraNombre.toLowerCase() !== 'sin asignar') {
          nuevoFormData.funcAsgrdra = nuevoFormData.funcAsgrdraNombre;
        }
        
        // Si tenemos código pero no nombre, usar el código como nombre temporal
        if (nuevoFormData.funcAsgrdra && !nuevoFormData.funcAsgrdraNombre && nuevoFormData.funcAsgrdra !== 'Sin asignar' && nuevoFormData.funcAsgrdra.toLowerCase() !== 'sin asignar') {
          nuevoFormData.funcAsgrdraNombre = nuevoFormData.funcAsgrdra;
        }
        
return nuevoFormData;
      });
      
      // Cargar funcionarios de la aseguradora cuando se carga initialData (modo edición)
      if (normalizados.codiAsgrdra || initialData.codiAsgrdra) {
        const codigoCliente = normalizados.codiAsgrdra || initialData.codiAsgrdra;
fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoCliente}`)
          .then(res => res.json())
          .then(data => {
            const funcionariosData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
            const opciones = funcionariosData
              .map(mapearOpcionFuncionarioAseguradora)
              .filter(Boolean);
            
            // Asegurar que el funcionario actual esté en la lista
            const funcionarioActual = initialData.funcAsgrdra || initialData.funcionarioAseguradora || initialData.funcAsgrdraNombre;
            const nombreFuncionarioActual = initialData.funcAsgrdraNombre || initialData.funcionarioAseguradora || initialData.funcAsgrdra;
            
            if (funcionarioActual && String(funcionarioActual).toLowerCase() !== 'sin asignar') {
              const valorActual = String(funcionarioActual);
              const existeEnLista = opciones.some(opt => 
                opt.value === valorActual || 
                opt.label === nombreFuncionarioActual ||
                opt.value === nombreFuncionarioActual
              );
              
              if (!existeEnLista && nombreFuncionarioActual) {
                opciones.push({ 
                  value: valorActual, 
                  label: String(nombreFuncionarioActual) 
                });
              }
            }
            
            setFuncionarios(ordenarPorLabel(opciones));
})
          .catch(error => {
            console.error('❌ [Modo Edición] Error cargando funcionarios:', error);
          });
      }
    }
  }, [initialData, normalizarHistorialDocs, formatearFechaParaInput, formatearCampoParaInput, ordenarPorLabel, estados, resolverEstadoParaSelect, esSura]);

  // Cargar datos frescos del caso desde la API.
  // - Si hay ID en URL (enlace directo), usar ese.
  // - Si estamos en /complex/editar con initialData, recargar por _id para evitar datos truncados del reporte.
  useEffect(() => {
    const cargarCasoPorId = async () => {
      const casoId = id || initialData?._id;
      if (casoId) {
        try {
          aplicandoDesdeServidorRef.current = true;
const token = localStorage.getItem('token');
          
          const casoData = await cargarCasoPorServicio(casoId);
if (casoData && casoData._id) {
            // Establecer los datos como initialData para que se procesen correctamente
            const normalizados = { ...casoData, origen: esSura ? 'sura' : 'complex' };
            if (esSura) {
              normalizados.nmroAjste = casoData.nmroAjste || casoData.consecutivo || '';
              normalizados.nmroSinstro = casoData.nmroSinstro || casoData.siniestro || '';
              normalizados.numDocumento = casoData.numDocumento || casoData.identificacion || '';
              normalizados.asgrBenfcro = casoData.asgrBenfcro || casoData.asegurado || '';
              normalizados.nmroPolza = casoData.nmroPolza || casoData.numeroPoliza || '';
              normalizados.codiRespnsble = casoData.codiRespnsble || casoData.ajustador || '';
              normalizados.correo = casoData.correo || '';
              normalizados.celular = casoData.celular || '';
              normalizados.sede = casoData.sede || casoData.sedeRiesgo || '';
              normalizados.direccionPredio =
                casoData.direccionPredio || casoData.direccion || '';
              normalizados.tomador = casoData.tomador || '';
              normalizados.numeroCredito = casoData.numeroCredito || '';
              normalizados.fechaInicioPoliza = casoData.fechaInicioPoliza || '';
              normalizados.fechaFinPoliza = casoData.fechaFinPoliza || '';
              normalizados.estadoPagoPrimas = casoData.estadoPagoPrimas || '';
              normalizados.nombIntermediario = casoData.nombIntermediario || '';
              normalizados.ciudadSiniestro = casoData.ciudadSiniestro || casoData.ciudad || '';
              normalizados.departamento =
                casoData.departamento || casoData.departamentoCiudad || '';
              normalizados.departamentoCiudad =
                casoData.departamentoCiudad || casoData.departamento || '';
              normalizados.fchaSinstro = casoData.fchaSinstro || casoData.fechaSiniestro || '';
              normalizados.fchaInspccion = casoData.fchaInspccion || casoData.fechaInspeccion || '';
              normalizados.fechaInspeccion =
                casoData.fechaInspeccion ||
                casoData.fchaProgInspeccion ||
                casoData.fchaInspccion ||
                '';
              normalizados.horaInicioCoordinacion = casoData.horaInicioCoordinacion || '';
              normalizados.horaFinCoordinacion = casoData.horaFinCoordinacion || '';
              normalizados.ajustador = casoData.ajustador || casoData.codiRespnsble || '';
              normalizados.inspector = casoData.inspector || '';
              normalizados.vlorResrva = casoData.vlorResrva ?? casoData.reserva;
              normalizados.vlorReclmo = casoData.vlorReclmo ?? casoData.valorReclamado;
            }
            
            // Aplicar las mismas normalizaciones que se hacen con initialData
            const equivalencias = {
              ciudadSiniestro: ['ciudadSiniestro', 'ciudad_siniestro'],
              sede: ['sede', 'sedeRiesgo'],
              direccionPredio: ['direccionPredio', 'direccion', 'codDireccion'],
              causa_siniestro: ['causa_siniestro', 'causa'],
              fchaUltSegui: ['fchaUltSegui', 'fcha_ult_segui'],
              fchaActSegui: ['fchaActSegui', 'fcha_act_segui'],
              obseSegmnto: ['obseSegmnto', 'obse_segmnto'],
              obseComprmsi: ['obseComprmsi', 'obse_comprmsi'],
              diasTranscrrdo: ['diasTranscrrdo', 'dias_transcrrdo'],
              nombreResponsable: ['nombreResponsable', 'responsable', 'respnsble'],
              funcAsgrdra: ['funcAsgrdra', 'funcionarioAseguradoraId', 'funcionarioAseguradora'],
              funcAsgrdraNombre: ['funcAsgrdraNombre', 'funcionarioAseguradora', 'funcionario', 'nombreFuncionario'],
              fchaSoliDocu: ['fchaSoliDocu', 'fcha_soli_docu'],
              fchaInfoPrelm: ['fchaInfoPrelm', 'fcha_info_prelm'],
              fchaInfoFnal: ['fchaInfoFnal', 'fcha_info_fnal'],
              fchaRepoActi: ['fchaRepoActi', 'fcha_repo_acti'],
              fchaPresentacionCifras: ['fchaPresentacionCifras', 'fcha_presentacion_cifras'],
              fchaAceptacionCifrasAseguradora: ['fchaAceptacionCifrasAseguradora', 'fcha_aceptacion_cifras_aseguradora'],
              fchaReconsideracion: ['fchaReconsideracion', 'fcha_reconsideracion'],
              fchaEnvioFiniquito: ['fchaEnvioFiniquito', 'fcha_envio_finiquito'],
              fchaCoordInspeccion: ['fchaCoordInspeccion', 'fcha_coord_inspeccion'],
              fchaProgInspeccion: ['fchaProgInspeccion', 'fcha_prog_inspeccion'],
              obseCoordInspeccion: ['obseCoordInspeccion', 'obse_coord_inspeccion'],
              fchaControlHoras: ['fchaControlHoras', 'fcha_control_horas', 'fecha_control_horas'],
              // Mapear fecha de envío control de horas (Gerencia)
              fchaEnvioControlHoras: ['fchaEnvioControlHoras', 'fcha_envio_control_horas', 'fecha_envio_control_horas'],
              fchaRecibidoControlHoras: ['fchaRecibidoControlHoras', 'fcha_recibido_control_horas', 'fecha_recibido_control_horas'],
              // Mapear fecha de seguimiento de envío control de horas
              fchaSeguimientoEnvioControlHoras: ['fchaSeguimientoEnvioControlHoras', 'fcha_seguimiento_envio_control_horas', 'fecha_seguimiento_envio_control_horas']
            };

            Object.entries(equivalencias).forEach(([destino, claves]) => {
              for (const clave of claves) {
                if (casoData[clave] !== undefined && casoData[clave] !== null && casoData[clave] !== '') {
                  normalizados[destino] = casoData[clave];
                  break;
                }
              }
            });

            // Formatear fechas
            const fchaInfoPrelmFormateada = formatearCampoParaInput('fchaInfoPrelm', normalizados.fchaInfoPrelm || casoData.fcha_info_prelm);
            const fchaInfoFnalFormateada = formatearCampoParaInput('fchaInfoFnal', normalizados.fchaInfoFnal || casoData.fcha_info_fnal);
            const fchaSoliDocuFormateada = formatearCampoParaInput('fchaSoliDocu', normalizados.fchaSoliDocu || casoData.fcha_soli_docu);
            const fchaRepoActiFormateada = formatearCampoParaInput('fchaRepoActi', normalizados.fchaRepoActi || casoData.fcha_repo_acti);
            const fchaPresentacionCifrasFormateada = formatearCampoParaInput(
              'fchaPresentacionCifras',
              normalizados.fchaPresentacionCifras || casoData.fcha_presentacion_cifras
            );
            const fchaAceptacionCifrasAseguradoraFormateada = formatearCampoParaInput(
              'fchaAceptacionCifrasAseguradora',
              normalizados.fchaAceptacionCifrasAseguradora || casoData.fcha_aceptacion_cifras_aseguradora
            );
            const fchaReconsideracionFormateada = formatearCampoParaInput(
              'fchaReconsideracion',
              normalizados.fchaReconsideracion || casoData.fcha_reconsideracion
            );
            const fchaEnvioFiniquitoFormateada = formatearCampoParaInput(
              'fchaEnvioFiniquito',
              normalizados.fchaEnvioFiniquito || casoData.fcha_envio_finiquito
            );
            const fchaCoordInspeccionFormateada = formatearCampoParaInput(
              'fchaCoordInspeccion',
              normalizados.fchaCoordInspeccion || casoData.fcha_coord_inspeccion
            );
            const fchaProgInspeccionFormateada = formatearCampoParaInput(
              'fchaProgInspeccion',
              normalizados.fchaProgInspeccion || casoData.fcha_prog_inspeccion
            );
            const fchaControlHorasFormateada = formatearFechaParaInput(normalizados.fchaControlHoras || casoData.fcha_control_horas || casoData.fecha_control_horas);
            const fchaEnvioControlHorasFormateada = formatearFechaParaInput(normalizados.fchaEnvioControlHoras || casoData.fcha_envio_control_horas || casoData.fecha_envio_control_horas);
            const fchaRecibidoControlHorasFormateada = formatearFechaParaInput(normalizados.fchaRecibidoControlHoras || casoData.fcha_recibido_control_horas || casoData.fecha_recibido_control_horas);
            const fchaSeguimientoEnvioControlHorasFormateada = formatearFechaParaInput(normalizados.fchaSeguimientoEnvioControlHoras || casoData.fcha_seguimiento_envio_control_horas || casoData.fecha_seguimiento_envio_control_horas);

            setFormData(prev => ({
              ...prev,
              ...normalizados,
              _id: casoData._id || casoData.id || prev._id, // Asegurar que _id se incluya
              historialDocs: normalizarHistorialDocs(casoData.historialDocs),
              fchaAsgncion: formatearCampoParaInput('fchaAsgncion', casoData.fchaAsgncion),
              fchaSinstro: formatearFechaParaInput(casoData.fchaSinstro || casoData.fechaSiniestro),
              fechaInicioPoliza: formatearFechaParaInput(
                casoData.fechaInicioPoliza || normalizados.fechaInicioPoliza
              ),
              fechaFinPoliza: formatearFechaParaInput(
                casoData.fechaFinPoliza || normalizados.fechaFinPoliza
              ),
              fchaInspccion: formatearCampoParaInput('fchaInspccion', casoData.fchaInspccion),
              fchaContIni: formatearCampoParaInput('fchaContIni', casoData.fchaContIni),
              fchaSoliDocu: fchaSoliDocuFormateada,
              fchaInfoPrelm: fchaInfoPrelmFormateada,
              fchaInfoFnal: fchaInfoFnalFormateada,
              fchaRepoActi: fchaRepoActiFormateada,
              fchaPresentacionCifras: fchaPresentacionCifrasFormateada,
              fchaAceptacionCifrasAseguradora: fchaAceptacionCifrasAseguradoraFormateada,
              fchaReconsideracion: fchaReconsideracionFormateada,
              fchaEnvioFiniquito: fchaEnvioFiniquitoFormateada,
              fchaCoordInspeccion: fchaCoordInspeccionFormateada,
              fchaProgInspeccion: fchaProgInspeccionFormateada,
              fechaInspeccion: formatearFechaParaInput(
                normalizados.fechaInspeccion ||
                  casoData.fechaInspeccion ||
                  fchaProgInspeccionFormateada ||
                  casoData.fchaInspccion
              ),
              horaInicioCoordinacion:
                normalizados.horaInicioCoordinacion || casoData.horaInicioCoordinacion || '',
              horaFinCoordinacion:
                normalizados.horaFinCoordinacion || casoData.horaFinCoordinacion || '',
              fchaControlHoras: fchaControlHorasFormateada,
              fechaControlHoras: fchaControlHorasFormateada,
              fecha_control_horas: fchaControlHorasFormateada, // Para el formulario
              fchaEnvioControlHoras: fchaEnvioControlHorasFormateada,
              fechaEnvioControlHoras: fchaEnvioControlHorasFormateada,
              fecha_envio_control_horas: fchaEnvioControlHorasFormateada, // Fecha de envío control de horas (Gerencia)
              fchaRecibidoControlHoras: fchaRecibidoControlHorasFormateada,
              fechaRecibidoControlHoras: fchaRecibidoControlHorasFormateada,
              fecha_recibido_control_horas: fchaRecibidoControlHorasFormateada, // Fecha de recibido control de horas (Gerencia)
              fchaSeguimientoEnvioControlHoras: fchaSeguimientoEnvioControlHorasFormateada,
              fechaSeguimientoEnvioControlHoras: fchaSeguimientoEnvioControlHorasFormateada,
              fecha_seguimiento_envio_control_horas: fchaSeguimientoEnvioControlHorasFormateada, // Fecha de seguimiento de envío control de horas
              observacion_seguimiento_envio_control_horas: casoData.observacion_seguimiento_envio_control_horas || casoData.obse_seguimiento_envio_control_horas || normalizados.obseSeguimientoEnvioControlHoras || '',
              adjunto_seguimiento_envio_control_horas: (() => {
                const docsSeguimientoEvidencia = (casoData.historialDocs || []).filter(doc => 
                  doc.tipo === 'seguimientoEvidencia' || doc.categoria === 'seguimientoEvidencia'
                );
                if (docsSeguimientoEvidencia.length > 0) {
                  return docsSeguimientoEvidencia.map(doc => doc.nombre || doc.filename).filter(Boolean).join(', ');
                }
                return casoData.adjunto_seguimiento_envio_control_horas || casoData.anxo_seguimiento_envio_control_horas || normalizados.anxoSeguimientoEnvioControlHoras || '';
              })(),
              obseCoordInspeccion: normalizados.obseCoordInspeccion || casoData.obse_coord_inspeccion || '',
              descripcionEstado: casoData.descripcionEstado || normalizados.descripcionEstado || '',
              observacionesPendientes: casoData.observacionesPendientes || normalizados.observacionesPendientes || '',
              // Campos de facturación - asegurar que se carguen desde casoData
              numero_factura: casoData.numero_factura || casoData.nmroFactra || normalizados.nmroFactra || '',
              valor_servicio: casoData.valor_servicio || casoData.vlorServcios || normalizados.vlorServcios || '',
              valor_gastos: casoData.valor_gastos || casoData.vlorGastos || normalizados.vlorGastos || '',
              fecha_factura: casoData.fecha_factura || (casoData.fchaFactra || normalizados.fchaFactra ? formatearFechaParaInput(casoData.fchaFactra || normalizados.fchaFactra) : ''),
              fecha_ultima_revision: casoData.fecha_ultima_revision || (casoData.fchaUltRevi || normalizados.fchaUltRevi ? formatearFechaParaInput(casoData.fchaUltRevi || normalizados.fchaUltRevi) : ''),
              observacion_compromisos: casoData.observacion_compromisos || casoData.obseComprmsi || normalizados.obseComprmsi || '',
              adjunto_factura: casoData.adjunto_factura || casoData.anxoFactra || normalizados.anxoFactra || '',
              // Campos de Gerencia
              adjunto_evidencia: (() => {
                const docsEvidencia = (casoData.historialDocs || []).filter(doc => 
                  doc.tipo === 'evidencia' || doc.categoria === 'evidencia'
                );
                if (docsEvidencia.length > 0) {
                  return docsEvidencia.map(doc => doc.nombre || doc.filename).filter(Boolean).join(', ');
                }
                return casoData.adjunto_evidencia || casoData.anxoEvidencia || normalizados.anxoEvidencia || '';
              })(),
              // Sincronizar adjunto_control_horas desde historialDocs
              adjunto_control_horas: (() => {
                const docsControlHoras = (casoData.historialDocs || []).filter(doc => 
                  doc.tipo === 'controlHoras' || doc.categoria === 'controlHoras'
                );
                if (docsControlHoras.length > 0) {
                  return docsControlHoras.map(doc => doc.nombre || doc.filename).filter(Boolean).join(', ');
                }
                return casoData.adjunto_control_horas || '';
              })(),
              control_horas: (() => {
                const ch = resolverControlHorasDesdeEnvios(casoData) || normalizados.control_horas;
                return controlHorasTieneDatos(ch) ? ch : null;
              })(),
              estado: resolverEstadoParaSelect(casoData, estados),
            }));

            setCasoListoParaAutoGuardar(true);
            datosInicialesAutoSaveRef.current = casoData;
            requestAnimationFrame(() => {
              aplicandoDesdeServidorRef.current = false;
            });

            // Cargar funcionarios si hay aseguradora
            if (normalizados.codiAsgrdra || casoData.codiAsgrdra) {
              const codigoCliente = normalizados.codiAsgrdra || casoData.codiAsgrdra;
fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoCliente}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
              })
                .then(res => res.json())
                .then(data => {
                  const funcionariosData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
                  const opciones = funcionariosData
                    .map(mapearOpcionFuncionarioAseguradora)
                    .filter(Boolean);
                  
                  setFuncionarios(ordenarPorLabel(opciones));
})
                .catch(error => {
                  console.error('❌ [Cargar Caso por ID] Error cargando funcionarios:', error);
                });
            }

} else {
            console.error('❌ [Cargar Caso por ID] El caso no tiene _id válido');
          }
        } catch (error) {
          aplicandoDesdeServidorRef.current = false;
          console.error('❌ [Cargar Caso por ID] Error cargando caso:', error);
          alert(t('complex.ui.formulario_caso_complex.error_cargar_caso'));
        }
      }
    };

    cargarCasoPorId();
  }, [id, initialData, normalizarHistorialDocs, formatearFechaParaInput, formatearCampoParaInput, ordenarPorLabel, forceReloadCaso, estados, resolverEstadoParaSelect, t, esSura]);

  // Cargar datos desde localStorage al iniciar (solo si no hay ID ni initialData)
  // IMPORTANTE: No cargar si tiene nmroAjste (es un caso ya guardado)
  useEffect(() => {
    if (!AUTO_SAVE_ENABLED) return;
    if (!id && !initialData) {
      const datosGuardados = localStorage.getItem(storageKey);
      if (datosGuardados) {
        try {
          const datosParseados = JSON.parse(datosGuardados);
          // Si tiene nmroAjste, no cargar (es un caso ya guardado, no un borrador)
          if (datosParseados && typeof datosParseados === 'object' && !datosParseados.nmroAjste) {
            setFormData(prev => ({ ...prev, ...datosParseados }));
} else if (datosParseados?.nmroAjste) {
            // Si tiene nmroAjste, limpiar el localStorage para evitar usar datos de casos guardados
localStorage.removeItem(storageKey);
          }
        } catch (error) {
          console.error('Error al cargar datos guardados:', error);
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [id, initialData]);

  // Guardar datos automáticamente cuando cambien (con debounce para evitar guardados excesivos)
  // Solo se guarda si estamos en la ruta del formulario Complex
  // IMPORTANTE: No guardar si tiene nmroAjste (es un caso ya guardado, no un borrador)
  useEffect(() => {
    if (!AUTO_SAVE_ENABLED) return;
    const esRutaComplex = location.pathname.includes('/complex') || location.pathname.includes('/agregar-caso') || location.pathname.includes('/editar-caso');
    if (!esRutaComplex) return;

    // No guardar en localStorage si tiene nmroAjste (es un caso ya guardado)
    if (formData.nmroAjste && formData.nmroAjste.trim() !== '') {
      return;
    }

    const timeoutId = setTimeout(() => {
      try {
        const datosParaGuardar = JSON.stringify(formData);
        localStorage.setItem(storageKey, datosParaGuardar);
} catch (error) {
        console.error('Error al guardar datos:', error);
        try {
          localStorage.removeItem(storageKey);
          localStorage.setItem(storageKey, JSON.stringify(formData));
        } catch (e) {
          console.error('Error crítico al guardar:', e);
        }
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, location.pathname]);

  // Guardar datos antes de refrescar la página (solo si estamos en el formulario)
  useEffect(() => {
    if (!AUTO_SAVE_ENABLED) return;
    const handleBeforeUnload = () => {
      const esRutaComplex = window.location.pathname.includes('/complex') || window.location.pathname.includes('/agregar-caso') || window.location.pathname.includes('/editar-caso');
      if (esRutaComplex) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(formData));
        } catch (error) {
          console.error('Error al guardar antes de salir:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData]);

  // Limpiar localStorage cuando salgamos de la ruta del formulario
  useEffect(() => {
    const esRutaComplex = location.pathname.includes('/complex') || location.pathname.includes('/agregar-caso') || location.pathname.includes('/editar-caso');
    if (!esRutaComplex) {
localStorage.removeItem(storageKey);
    }

    return () => {
      setTimeout(() => {
        const sigueEnRutaComplex = window.location.pathname.includes('/complex') || window.location.pathname.includes('/agregar-caso') || window.location.pathname.includes('/editar-caso');
        if (!sigueEnRutaComplex) {
localStorage.removeItem(storageKey);
        }
      }, 100);
    };
  }, [location.pathname]);

  // Función para actualizar historialDocs dentro de formData
  const updateHistorialDocs = useCallback((updater) => {
    setFormData(prev => ({
      ...prev,
      historialDocs: typeof updater === 'function'
        ? normalizarHistorialDocs(updater(prev.historialDocs))
        : normalizarHistorialDocs(updater)
    }));
  }, [normalizarHistorialDocs]);

  const fechasHitoEditadasRef = useRef(new Set());

  // Handler de cambios
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    if (CAMPOS_FECHA_HITOS_TRAZABILIDAD.includes(name)) {
      fechasHitoEditadasRef.current.add(name);
    }
    setFormData(prev => {
      const nuevoValor = name === 'estado' ? String(value) : value;
      if (name === 'estado') {
        const opcion = estados.find((est) => String(est.value) === String(nuevoValor));
        return {
          ...prev,
          estado: nuevoValor,
          codiEstdo: nuevoValor,
          descripcionEstado: opcion?.label || prev.descripcionEstado,
        };
      }
      if (name === 'departamento') {
        return {
          ...prev,
          departamento: nuevoValor,
          departamentoCiudad: nuevoValor,
        };
      }
      return {
        ...prev,
        [name]: nuevoValor
      };
    });
  }, [estados]);

  const handlePlantillaContactoChange = useCallback((plantilla) => {
    setFormData((prev) => ({
      ...prev,
      plantillaContactoInicial: {
        ...(prev.plantillaContactoInicial || {}),
        ...plantilla,
      },
    }));
  }, []);

  // Handler para selects especiales (ejemplo: ciudad)
  const handleCiudadChange = (selectedOption) => {
    const ciudad = selectedOption?.value || '';
    const depto = selectedOption?.departamento || '';
    setFormData((prev) => ({
      ...prev,
      ciudadSiniestro: ciudad,
      ciudad,
      nombreCiudad: selectedOption?.label || ciudad,
      departamento: depto || prev.departamento || '',
      departamentoCiudad: depto || prev.departamentoCiudad || '',
    }));
  };

  // Handler para aseguradora
  const handleAseguradoraChange = (e) => {
    setFormData(prev => ({
      ...prev,
      codiAsgrdra: e.target.value,
      funcAsgrdra: '',
      funcAsgrdraNombre: '',
      emailFuncionarioAseguradora: '',
    }));
  };

  // Handler para funcionario - actualizar tanto el código como el nombre
  const handleFuncionarioChange = (e) => {
    const valorSeleccionado = e.target.value;
    // Buscar el funcionario en la lista para obtener su nombre
    const funcionarioSeleccionado = funcionarios.find(f => String(f.value) === String(valorSeleccionado));
    
    setFormData(prev => ({
      ...prev,
      funcAsgrdra: valorSeleccionado,
      funcAsgrdraNombre: funcionarioSeleccionado ? funcionarioSeleccionado.label : (prev.funcAsgrdraNombre || valorSeleccionado),
      funcionarioAseguradora: funcionarioSeleccionado ? funcionarioSeleccionado.label : (prev.funcionarioAseguradora || valorSeleccionado),
      emailFuncionarioAseguradora: funcionarioSeleccionado?.email || '',
    }));
  };

  // Estado para intermediarios (ahora desde la API)
  const [intermediariosOptions, setIntermediariosOptions] = useState([]); // Array de nombres para el dropdown

  const [cargandoAdjuntos, setCargandoAdjuntos] = useState({});
  const [errorAdjuntos, setErrorAdjuntos] = useState({});

  const handleDocumentDrop = useCallback(async (tipoDocumento, campoFormData, acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) {
      return;
    }

    let archivos = Array.from(acceptedFiles);

    // Si el caso ya tiene un control de horas montado, confirmar antes de subir otro
    if (tipoDocumento === 'controlHoras') {
      const docsActuales = Array.isArray(formData.historialDocs) ? formData.historialDocs : [];
      const docsControlHoras = docsActuales.filter(
        (doc) => doc?.tipo === 'controlHoras' || doc?.categoria === 'controlHoras'
      );
      const adjuntoTexto = String(formData.adjunto_control_horas || '').trim();
      const tieneAdjuntoTexto =
        adjuntoTexto !== '' && adjuntoTexto.toLowerCase() !== 'ninguno';
      const yaTieneControlHorasMontado =
        docsControlHoras.length > 0 ||
        tieneAdjuntoTexto ||
        controlHorasTieneDatos(formData.control_horas);

      if (yaTieneControlHorasMontado) {
        const cantidadDocs = docsControlHoras.length;
        const detalleDocs =
          cantidadDocs > 0
            ? `\n\nArchivos actuales (${cantidadDocs}):\n• ${docsControlHoras
                .map((d) => d.nombre || 'sin nombre')
                .join('\n• ')}`
            : controlHorasTieneDatos(formData.control_horas)
              ? '\n\nYa existe un control de horas registrado en el sistema para este caso.'
              : '';

        const confirmar = window.confirm(
          'Este caso ya tiene un control de horas montado.' +
            detalleDocs +
            t('complex.ui.formulario_caso_complex.confirmar_otro_archivo')
        );

        if (!confirmar) {
          return;
        }
      }
    }

    const token = localStorage.getItem('token');
    setErrorAdjuntos(prev => ({ ...prev, [tipoDocumento]: null }));
    setCargandoAdjuntos(prev => ({ ...prev, [tipoDocumento]: true }));

    const resultados = [];
    const errores = [];

    for (const file of archivos) {
      try {
        const formDataUpload = new FormData();
        appendUploadFile(formDataUpload, 'file', file, 'documento');

        const response = await fetch(`${BASE_URL}/api/${apiModulo}/upload`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
          body: formDataUpload
        });

        if (!response.ok) {
          const errorResp = await response.json().catch(() => ({}));
          throw new Error(errorResp.error || `Error subiendo archivo (${response.status})`);
        }

        const data = await response.json();
        const urlRelativa = data.url || data.ruta || '';
        const urlAbsoluta = construirUrlArchivo(urlRelativa);
        
        // Obtener fecha de subida (hoy)
        const ahora = new Date();
        const fechaSubidaISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;
        
        // Obtener fecha de creación del documento desde los metadatos del archivo
        // file.lastModified contiene la fecha de última modificación del archivo
        // que generalmente es la fecha de creación si no ha sido modificado
        const fechaCreacionArchivo = file.lastModified ? new Date(file.lastModified) : null;
        let fechaCreacionISO = null;
        
        if (fechaCreacionArchivo && !isNaN(fechaCreacionArchivo.getTime())) {
          fechaCreacionISO = `${fechaCreacionArchivo.getFullYear()}-${String(fechaCreacionArchivo.getMonth() + 1).padStart(2, '0')}-${String(fechaCreacionArchivo.getDate()).padStart(2, '0')}T${String(fechaCreacionArchivo.getHours()).padStart(2, '0')}:${String(fechaCreacionArchivo.getMinutes()).padStart(2, '0')}:${String(fechaCreacionArchivo.getSeconds()).padStart(2, '0')}`;
        }
        
        resultados.push({
          tipo: tipoDocumento,
          nombre: data.filename || file.name,
          url: urlAbsoluta || data.data || '',
          ruta: urlRelativa || '',
          fechaSubida: fechaSubidaISO, // Fecha en que se subió al sistema
          fechaCreacion: fechaCreacionISO || fechaSubidaISO, // Fecha de creación del documento (del archivo original)
          fecha: fechaCreacionISO || fechaSubidaISO, // Fecha principal (prioridad a fecha de creación)
          tamano: file.size,
          tipoMime: file.type,
          usuario: localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown'
        });
      } catch (error) {
        console.error(`❌ Error subiendo archivo ${file.name}:`, error);
        errores.push(`${file.name}: ${error.message}`);
        // Obtener fecha local en formato ISO sin problemas de zona horaria
        const ahora = new Date();
        const fechaLocalISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;
        
        // Obtener fecha de creación del documento desde los metadatos del archivo
        const fechaCreacionArchivo = file.lastModified ? new Date(file.lastModified) : null;
        let fechaCreacionISO = null;
        
        if (fechaCreacionArchivo && !isNaN(fechaCreacionArchivo.getTime())) {
          fechaCreacionISO = `${fechaCreacionArchivo.getFullYear()}-${String(fechaCreacionArchivo.getMonth() + 1).padStart(2, '0')}-${String(fechaCreacionArchivo.getDate()).padStart(2, '0')}T${String(fechaCreacionArchivo.getHours()).padStart(2, '0')}:${String(fechaCreacionArchivo.getMinutes()).padStart(2, '0')}:${String(fechaCreacionArchivo.getSeconds()).padStart(2, '0')}`;
        }
        
        resultados.push({
          tipo: tipoDocumento,
          nombre: file.name,
          url: null,
          ruta: null,
          fechaSubida: fechaLocalISO, // Fecha en que se intentó subir
          fechaCreacion: fechaCreacionISO || fechaLocalISO, // Fecha de creación del documento
          fecha: fechaCreacionISO || fechaLocalISO, // Fecha principal
          tamano: file.size,
          tipoMime: file.type,
          usuario: localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown',
          error: error.message
        });
      }
    }

    if (campoFormData) {
      setFormData(prev => {
        const nombresArchivos = resultados.map(r => r.nombre).join(', ');
        const valorAnterior = prev[campoFormData] || '';
        const nuevoValor = valorAnterior 
          ? `${valorAnterior}, ${nombresArchivos}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',')
          : nombresArchivos;
        
        return {
          ...prev,
          [campoFormData]: nuevoValor
        };
      });
    }

    updateHistorialDocs(prev => {
      const actual = Array.isArray(prev) ? prev : [];
      return [...actual, ...resultados];
    });

    if (errores.length > 0) {
      setErrorAdjuntos(prev => ({
        ...prev,
        [tipoDocumento]: `No se pudieron subir algunos archivos: ${errores.join(' | ')}`
      }));
    } else {
      setErrorAdjuntos(prev => ({ ...prev, [tipoDocumento]: null }));
    }

    setCargandoAdjuntos(prev => ({ ...prev, [tipoDocumento]: false }));

    // Enviar notificaciones cuando se suben documentos específicos
    if (errores.length === 0) {
      const exitosos = resultados.filter(r => !r.error && r.url);
      
      if (exitosos.length > 0) {
        const numeroCaso = formData.nmroAjste || initialData?.nmroAjste || formData.numeroCaso;
        
        if (numeroCaso) {
          // Notificación para honorarios
          if (tipoDocumento === 'honorarios') {
            try {
              await fetch(`${BASE_URL}/api/${apiModulo}/notificaciones/honorarios`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                  numeroCaso,
                  numeroSiniestro: formData.nmroSinstro || initialData?.nmroSinstro,
                  responsable: formData.codiRespnsble || initialData?.codiRespnsble,
                  archivos: exitosos.map(r => r.nombre),
                  usuario: localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown'
                })
              });
            } catch (error) {
              console.error('⚠️ Error enviando notificación de honorarios:', error);
            }
          }
          
          // Notificación para control de horas - REMOVIDO: ahora se envía manualmente desde el botón
          // El envío automático fue removido para permitir al usuario elegir el gerente
        }
      }
    }
  }, [updateHistorialDocs, formData, initialData, construirUrlArchivo, t]);

  // Función para enviar notificación de gerencia al gerente seleccionado
  const handleEnviarGerencia = useCallback(async (gerenteSeleccionado) => {
    try {
      const token = localStorage.getItem('token');
      
      // Obtener archivos de evidencia del historialDocs con sus rutas
      let archivosEvidencia = (formData.historialDocs || [])
        .filter(doc => doc.tipo === 'evidencia' || doc.categoria === 'evidencia')
        .map(doc => {
          // Obtener la ruta relativa (sin dominio)
          let rutaRelativa = doc.ruta || '';
          // Si doc.url es una URL completa, extraer la ruta relativa
          if (!rutaRelativa && doc.url) {
            if (doc.url.startsWith('http')) {
              const urlObj = new URL(doc.url);
              rutaRelativa = urlObj.pathname;
            } else {
              rutaRelativa = doc.url;
            }
          }
          // Asegurar que la ruta empiece con /uploads
          if (rutaRelativa && !rutaRelativa.startsWith('/uploads') && !rutaRelativa.startsWith('uploads') && !rutaRelativa.startsWith('/')) {
            rutaRelativa = `/uploads/${rutaRelativa}`;
          }
          
          return {
            nombre: doc.nombre || doc.filename || 'Archivo sin nombre',
            ruta: rutaRelativa,
            url: doc.url || construirUrlArchivo(rutaRelativa)
          };
        });

      // Si no hay archivos en historialDocs, intentar obtener del campo adjunto_evidencia
      if (archivosEvidencia.length === 0 && formData.adjunto_evidencia) {
        const adjuntos = formData.adjunto_evidencia.split(',').map(a => a.trim()).filter(Boolean);
        archivosEvidencia = adjuntos.length > 0 
          ? adjuntos.map(nombre => ({ nombre, ruta: '', url: '' }))
          : [{ nombre: 'Archivo de evidencia', ruta: '', url: '' }];
      }

      if (archivosEvidencia.length === 0) {
        alert(t('complex.ui.formulario_caso_complex.no_archivos_evidencia'));
        return;
      }

      const sinNumero = t('complex.ui.formulario_caso_complex.sin_numero');
      const numeroCaso = formData.nmroAjste || initialData?.nmroAjste || sinNumero;
      const numeroSiniestro = formData.nmroSinstro || initialData?.nmroSinstro;
      const responsable = formData.codiRespnsble || initialData?.codiRespnsble;
      const usuario = localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown';
      let casoId = formData._id || initialData?._id || null;

      // Si no hay casoId pero hay número de caso, intentar buscar el caso
      if (!casoId && numeroCaso && numeroCaso !== sinNumero) {
        try {
const buscarResponse = await fetch(`${BASE_URL}/api/${apiModulo}?nmroAjste=${encodeURIComponent(numeroCaso)}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (buscarResponse.ok) {
            const casosData = await buscarResponse.json();
            const casos = Array.isArray(casosData) ? casosData : (casosData.data || []);
            if (casos.length > 0 && casos[0]._id) {
              casoId = casos[0]._id;
}
          }
        } catch (error) {
          console.error('⚠️ [Gerencia] Error buscando caso por número de ajuste:', error);
        }
      }

const response = await fetch(`${BASE_URL}/api/${apiModulo}/notificaciones/gerencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          numeroCaso,
          numeroSiniestro,
          responsable,
          archivos: archivosEvidencia.map(a => a.nombre),
          archivosConRuta: archivosEvidencia,
          usuario,
          gerente: gerenteSeleccionado,
          casoId
        })
      });

      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Gerencia] Error en respuesta del servidor:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200) // Primeros 200 caracteres
        });
        throw new Error(`Error del servidor (${response.status}): ${response.statusText}`);
      }

      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error('❌ [Gerencia] Respuesta no es JSON:', {
          contentType,
          body: errorText.substring(0, 200)
        });
        throw new Error(t('complex.ui.formulario_caso_complex.respuesta_no_valida'));
      }

      const resultado = await response.json();

      if (resultado.success) {
        const nombreGerente = gerenteSeleccionado === 'elkin'
          ? 'Elkin Tapia Gutiérrez'
          : gerenteSeleccionado === 'iskharly'
          ? 'Iskharly José Tapia Gutierrez'
          : gerenteSeleccionado === 'adriana'
          ? 'Adriana Angulo Funes (facturación)'
          : gerenteSeleccionado === 'test'
          ? 'danalyst@proserpuertos.com.co (Prueba)'
          : 'Gerente';
        const emailEnviado =
          resultado.emailEnviado ||
          resultado.resultado?.destinatarios?.[0] ||
          '';
        let mensaje = emailEnviado
          ? t('complex.ui.formulario_caso_complex.notificacion_enviada_email', {
              nombre: nombreGerente,
              email: emailEnviado,
            })
          : t('complex.ui.formulario_caso_complex.notificacion_enviada_ok', {
              nombre: nombreGerente,
            });
        if (resultado.envioRegistrado) {
          mensaje += t('complex.ui.formulario_caso_complex.registrado_bandeja');
        } else if (resultado.motivoNoRegistro === 'caso_no_encontrado') {
          mensaje += t('complex.ui.formulario_caso_complex.guarde_caso_bandeja');
        }
        alert(mensaje);
      } else {
        throw new Error(resultado.error || t('complex.ui.formulario_caso_complex.error_enviar_notificacion'));
      }
    } catch (error) {
      console.error('❌ Error enviando notificación de gerencia:', error);
      alert(t('complex.ui.formulario_caso_complex.error_enviar_notificacion_msg', { mensaje: error.message }));
      throw error;
    }
  }, [formData, initialData, construirUrlArchivo, t]);

  const persistirControlHorasEnServidor = useCallback(
    async (controlHoras, totales) => {
      const casoId = formData._id || initialData?._id || id;
      if (!casoId || !controlHorasTieneDatos(controlHoras)) return false;

      try {
        const payload = {
          control_horas: controlHoras,
          fecha_control_horas:
            formData.fecha_control_horas ||
            formData.fcha_control_horas ||
            new Date().toISOString().slice(0, 10),
        };

        if (totales?.subtotal_honorarios != null) {
          payload.valor_servicio = Math.round(totales.subtotal_honorarios);
        }
        if (totales?.gastos != null) {
          payload.valor_gastos = Math.round(totales.gastos);
        }

        const respuesta = await actualizarCasoPorServicio(casoId, payload);
        datosInicialesAutoSaveRef.current = {
          ...(datosInicialesAutoSaveRef.current || {}),
          control_horas: respuesta?.control_horas || controlHoras,
        };
        return true;
      } catch (error) {
        console.error('❌ Error persistiendo control de horas:', error);
        return false;
      }
    },
    [
      formData._id,
      formData.fecha_control_horas,
      formData.fcha_control_horas,
      initialData?._id,
      id,
      actualizarCasoPorServicio,
    ]
  );

  // Función para enviar notificación de control de horas al gerente seleccionado
  const handleEnviarControlHoras = useCallback(async (gerenteSeleccionado) => {
    try {
      const token = localStorage.getItem('token');
      
      // Obtener archivos de control de horas del historialDocs con sus rutas
      let archivosControlHoras = (formData.historialDocs || [])
        .filter(doc => doc.tipo === 'controlHoras' || doc.categoria === 'controlHoras')
        .map(doc => {
          // Obtener la ruta relativa (sin dominio)
          let rutaRelativa = doc.ruta || '';
          // Si doc.url es una URL completa, extraer la ruta relativa
          if (!rutaRelativa && doc.url) {
            if (doc.url.startsWith('http')) {
              // Extraer la ruta relativa de la URL completa
              const urlObj = new URL(doc.url);
              rutaRelativa = urlObj.pathname;
            } else {
              rutaRelativa = doc.url;
            }
          }
          // Asegurar que la ruta empiece con /uploads
          if (rutaRelativa && !rutaRelativa.startsWith('/uploads') && !rutaRelativa.startsWith('uploads') && !rutaRelativa.startsWith('/')) {
            rutaRelativa = `/uploads/${rutaRelativa}`;
          }
          
          return {
            nombre: doc.nombre || doc.filename || 'Archivo sin nombre',
            ruta: rutaRelativa,
            url: doc.url || construirUrlArchivo(rutaRelativa)
          };
        });

      // Si no hay archivos en historialDocs, intentar obtener del campo adjunto_control_horas
      if (archivosControlHoras.length === 0 && formData.adjunto_control_horas) {
        const adjuntos = formData.adjunto_control_horas.split(',').map(a => a.trim()).filter(Boolean);
        archivosControlHoras = adjuntos.length > 0 
          ? adjuntos.map(nombre => ({ nombre, ruta: '', url: '' }))
          : [{ nombre: 'Archivo de control de horas', ruta: '', url: '' }];
      }

      const tieneControlHorasEnSistema = Boolean(formData.control_horas?.filas?.length);

      if (archivosControlHoras.length === 0 && !tieneControlHorasEnSistema) {
        alert(t('complex.ui.formulario_caso_complex.registre_control_horas'));
        return;
      }

      const resumenControlHoras = tieneControlHorasEnSistema
        ? calcularTotalesControlHoras(formData.control_horas)
        : null;

      const sinNumero = t('complex.ui.formulario_caso_complex.sin_numero');
      const numeroCaso = formData.nmroAjste || initialData?.nmroAjste || sinNumero;
      const numeroSiniestro = formData.nmroSinstro || initialData?.nmroSinstro;
      const responsable = formData.codiRespnsble || initialData?.codiRespnsble;
      const usuario = localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown';
      let casoId = formData._id || initialData?._id || null; // ID del caso para el enlace directo

      // Si no hay casoId pero hay número de caso, intentar buscar el caso
      if (!casoId && numeroCaso && numeroCaso !== sinNumero) {
        try {
const buscarResponse = await fetch(`${BASE_URL}/api/${apiModulo}?nmroAjste=${encodeURIComponent(numeroCaso)}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (buscarResponse.ok) {
            const casosData = await buscarResponse.json();
            const casos = Array.isArray(casosData) ? casosData : (casosData.data || []);
            if (casos.length > 0 && casos[0]._id) {
              casoId = casos[0]._id;
}
          }
        } catch (error) {
          console.error('⚠️ Error buscando caso por número de ajuste:', error);
        }
      }

const response = await fetch(`${BASE_URL}/api/${apiModulo}/notificaciones/control-horas`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                  numeroCaso,
          numeroSiniestro,
          responsable,
          archivos: archivosControlHoras.map(a => a.nombre),
          archivosConRuta: archivosControlHoras,
          controlHoras: tieneControlHorasEnSistema ? formData.control_horas : null,
          resumenControlHoras,
          usuario,
          gerente: gerenteSeleccionado,
          casoId
                })
              });

      const resultado = await response.json();

      if (resultado.success) {
        const nombreGerente = gerenteSeleccionado === 'elkin'
          ? 'Elkin Tapia Gutiérrez'
          : gerenteSeleccionado === 'iskharly'
          ? 'Iskharly José Tapia Gutierrez'
          : 'danalyst@proserpuertos.com.co (Prueba)';
        const emailEnviado = resultado.resultado?.destinatarioPrincipal || '';
        let mensaje = emailEnviado
          ? t('complex.ui.formulario_caso_complex.notificacion_enviada_email', {
              nombre: nombreGerente,
              email: emailEnviado,
            })
          : t('complex.ui.formulario_caso_complex.notificacion_enviada_ok', {
              nombre: nombreGerente,
            });
        if (resultado.envioRegistrado) {
          mensaje += t('complex.ui.formulario_caso_complex.registrado_bandeja');
          if (tieneControlHorasEnSistema) {
            datosInicialesAutoSaveRef.current = {
              ...(datosInicialesAutoSaveRef.current || {}),
              control_horas: formData.control_horas,
            };
          }
        } else if (resultado.motivoNoRegistro === 'caso_no_encontrado') {
          mensaje += t('complex.ui.formulario_caso_complex.guarde_caso_bandeja');
        } else if (tieneControlHorasEnSistema && casoId) {
          const persistido = await persistirControlHorasEnServidor(
            formData.control_horas,
            resumenControlHoras
          );
          if (!persistido) {
            mensaje += t('complex.ui.formulario_caso_complex.correo_ok_no_guardo_horas');
          }
        }
        alert(mensaje);
      } else {
        throw new Error(resultado.error || t('complex.ui.formulario_caso_complex.error_enviar_notificacion'));
      }
            } catch (error) {
      console.error('❌ Error enviando notificación de control de horas:', error);
      alert(t('complex.ui.formulario_caso_complex.error_enviar_notificacion_msg', { mensaje: error.message }));
      throw error;
    }
  }, [formData, initialData, persistirControlHorasEnServidor, t, construirUrlArchivo]);

  const useDropzoneForDocument = (tipoDocumento, campoFormData) =>
    useDropzone({
      multiple: true,
      onDrop: (files) => handleDocumentDrop(tipoDocumento, campoFormData, files)
    });

  // Dropzone para Adjunto Factura
  const dropzonePropsFactura = useDropzoneForDocument('factura', 'adjunto_factura');

  // Dropzone para Adjunto Honorarios
  const dropzonePropsHonorarios = useDropzoneForDocument('honorarios', 'adjunto_honorarios');

  // Dropzone para Control de Horas
  const dropzonePropsControlHoras = useDropzoneForDocument('controlHoras', 'adjunto_control_horas');

  // Dropzone para Adjunto Evidencia (Gerencia)
  const dropzonePropsEvidencia = useDropzoneForDocument('evidencia', 'adjunto_evidencia');
  const dropzonePropsSeguimientoEvidencia = useDropzoneForDocument('seguimientoEvidencia', 'adjunto_seguimiento_envio_control_horas');

  // Dropzone para Adjunto Observaciones del Cliente
  const dropzonePropsObservaciones = useDropzoneForDocument('observacionesCliente', 'adjunto_observaciones_cliente');

  // Ejemplo de props para selects
  const [ciudades, setCiudades] = useState([]);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);
  const [aseguradoraOptions, setAseguradoraOptions] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargandoFuncionarios, setCargandoFuncionarios] = useState(false);
  const [aseguradoraOptionsRaw, setAseguradoraOptionsRaw] = useState([]);

  const nombreAseguradoraFacturacion = useMemo(() => {
    if (!formData.codiAsgrdra) {
      return formData.nombreCliente || '';
    }
    const cliente = aseguradoraOptionsRaw.find(
      (c) => c.codiAsgrdra === formData.codiAsgrdra || c.rzonSocial === formData.codiAsgrdra
    );
    return cliente?.rzonSocial || formData.nombreCliente || formData.codiAsgrdra || '';
  }, [formData.codiAsgrdra, formData.nombreCliente, aseguradoraOptionsRaw]);

  const [responsables, setResponsables] = useState([]);
  const [ajustadoresCatastrofico, setAjustadoresCatastrofico] = useState([]);
  const [inspectoresCatastrofico, setInspectoresCatastrofico] = useState([]);

  // Estados para autoguardado
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState(null);
  const [casoListoParaAutoGuardar, setCasoListoParaAutoGuardar] = useState(false);
  const [hayActualizacionRemota, setHayActualizacionRemota] = useState(false);
  const datosInicialesAutoSaveRef = useRef(initialData || null);
  const autoGuardandoServidorRef = useRef(false);
  const formDataAutoSaveRef = useRef(formData);
  const ultimaEdicionUsuarioRef = useRef(Date.now());
  const aplicandoDesdeServidorRef = useRef(false);
  const casoConId = Boolean(initialData?._id || id);

  useEffect(() => {
    formDataAutoSaveRef.current = formData;
    if (aplicandoDesdeServidorRef.current) return;
    ultimaEdicionUsuarioRef.current = Date.now();
    setHayActualizacionRemota(false);
  }, [formData]);

  // Generar key única para autoguardado (usa ID si existe, sino un key genérico)
  const autoSaveKey = (initialData?._id || id)
    ? `${esSura ? 'formulario-sura' : 'formulario-complex'}-${initialData?._id || id}`
    : esSura
      ? 'formulario-sura-nuevo'
      : 'formulario-complex-nuevo';
  const isOnline = useOnlineStatus();
  const [pendingServerSync, setPendingServerSync] = useState(() =>
    autoSaveService.hasPendingServerSync(autoSaveKey)
  );

  const consumeDraftRef = useRef(null);
  const onDraftRestoreAvailable = useCallback((savedInfo) => {
    if (savedInfo?.metadata?.autoApply && savedInfo.data) {
      setFormData((prev) => ({ ...prev, ...savedInfo.data }));
      consumeDraftRef.current?.(savedInfo.data);
      return;
    }
    setSavedDataToRestore(savedInfo);
    setShowRestoreDialog(true);
  }, []);

  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey: autoSaveKey,
    modulo: esSura ? 'sura' : 'complex',
    recursoId: initialData?._id || id || '',
    titulo: esSura ? 'Caso Sura' : 'Caso Complex',
    formData,
    enabled: true,
    shouldSkipSaveRef: aplicandoDesdeServidorRef,
    onRestoreAvailable: onDraftRestoreAvailable,
  });
  consumeDraftRef.current = consumeDraft;

  // Refs para rastrear cambios específicos y evitar actualizaciones innecesarias
  const prevControlHorasDocsRef = useRef('');
  const prevFacturaDocsRef = useRef('');

  // Sincronizar adjunto_control_horas desde historialDocs cuando cambie
  // SOLO actualizar si realmente cambió el contenido de historialDocs relacionado con controlHoras
  useEffect(() => {
    const docsControlHoras = (formData.historialDocs || []).filter(doc => 
      doc.tipo === 'controlHoras' || doc.categoria === 'controlHoras'
    );
    
    // Crear una "firma" única de los documentos de control de horas (nombres ordenados)
    const firmaControlHoras = docsControlHoras
      .map(doc => doc.nombre || doc.filename || '')
      .filter(Boolean)
      .sort()
      .join('|');
    
    // Solo procesar si realmente cambió el contenido de controlHoras
    if (firmaControlHoras === prevControlHorasDocsRef.current) {
      return; // No hacer nada si no cambió
    }
    
    prevControlHorasDocsRef.current = firmaControlHoras;
    
    const nombresArchivos = firmaControlHoras || '';
    
    // Solo actualizar si el valor en formData es diferente
    if (formData.adjunto_control_horas !== nombresArchivos) {
      // Usar setFormData con spread para preservar TODOS los demás campos
      setFormData(prev => {
        // Verificar nuevamente antes de actualizar para evitar actualizaciones redundantes
        if (prev.adjunto_control_horas === nombresArchivos) {
          return prev; // No cambiar nada si ya es el mismo valor
        }
        return {
          ...prev, // Preservar TODOS los demás campos
          adjunto_control_horas: nombresArchivos
        };
      });
      
}
  }, [formData.historialDocs, formData.adjunto_control_horas]);

  // Sincronizar adjunto_evidencia desde historialDocs cuando cambie
  const prevEvidenciaDocsRef = useRef('');
  useEffect(() => {
    const docsEvidencia = (formData.historialDocs || []).filter(doc => 
      doc.tipo === 'evidencia' || doc.categoria === 'evidencia'
    );
    
    const firmaEvidencia = docsEvidencia
      .map(doc => doc.nombre || doc.filename || '')
      .filter(Boolean)
      .sort()
      .join('|');
    
    if (firmaEvidencia === prevEvidenciaDocsRef.current) {
      return;
    }
    
    prevEvidenciaDocsRef.current = firmaEvidencia;
    
    const nombresArchivos = firmaEvidencia || '';
    
    if (formData.adjunto_evidencia !== nombresArchivos) {
      setFormData(prev => {
        if (prev.adjunto_evidencia === nombresArchivos) {
          return prev;
        }
        return {
          ...prev,
          adjunto_evidencia: nombresArchivos
        };
      });
}
  }, [formData.historialDocs, formData.adjunto_evidencia]);

  // Sincronizar adjunto_factura desde historialDocs cuando cambie
  // SOLO actualizar si realmente cambió el contenido de historialDocs relacionado con factura
  useEffect(() => {
    const docsFactura = (formData.historialDocs || []).filter(doc => 
      doc.tipo === 'factura' || doc.categoria === 'factura'
    );
    
    // Crear una "firma" única de los documentos de factura (nombres ordenados)
    const firmaFactura = docsFactura
      .map(doc => doc.nombre || doc.filename || '')
      .filter(Boolean)
      .sort()
      .join('|');
    
    // Solo procesar si realmente cambió el contenido de factura
    if (firmaFactura === prevFacturaDocsRef.current) {
      return; // No hacer nada si no cambió
    }
    
    prevFacturaDocsRef.current = firmaFactura;
    
    const nombresArchivos = firmaFactura || '';
    
    // Solo actualizar si el valor en formData es diferente
    if (formData.adjunto_factura !== nombresArchivos) {
      // Usar setFormData con spread para preservar TODOS los demás campos
      setFormData(prev => {
        // Verificar nuevamente antes de actualizar para evitar actualizaciones redundantes
        if (prev.adjunto_factura === nombresArchivos) {
          return prev; // No cambiar nada si ya es el mismo valor
        }
        return {
          ...prev, // Preservar TODOS los demás campos
          adjunto_factura: nombresArchivos
        };
      });
      
}
  }, [formData.historialDocs, formData.adjunto_factura]);

  // Sincronizar adjunto_seguimiento_envio_control_horas desde historialDocs
  useEffect(() => {
    const docs = (formData.historialDocs || []).filter(d => d.tipo === 'seguimientoEvidencia' || d.categoria === 'seguimientoEvidencia');
    const nombres = docs.length > 0 ? docs.map(d => d.nombre || d.filename).filter(Boolean).join(', ') : '';
    if (formData.adjunto_seguimiento_envio_control_horas !== nombres) {
      setFormData(prev => prev.adjunto_seguimiento_envio_control_horas === nombres ? prev : { ...prev, adjunto_seguimiento_envio_control_horas: nombres });
}
  }, [formData.historialDocs, formData.adjunto_seguimiento_envio_control_horas]);

  // Hook de autoguardado
  const {
    isAutoSaveEnabled,
    lastSaveTime,
    saveStatus,
    enableAutoSave,
    disableAutoSave,
    clearSavedData,
    saveNow,
    markSyncing,
    markSynced,
    markSyncError,
  } = useAutoSave({
    formKey: autoSaveKey,
    formData: formData,
    enabled: autoguardadoEfectivo,
    interval: 300000,
    debounceMs: 400,
    saveOnChange: true,
    excludeFields: ['historialDocs'],
    skipRestoreOnMount: Boolean(autoguardadoEfectivo && (initialData?._id || id)),
    preferServerWhenOnline: casoConId,
    shouldSkipSaveRef: aplicandoDesdeServidorRef,
    onRestore: (savedInfo) => {
      setSavedDataToRestore(savedInfo);
      setShowRestoreDialog(true);
    },
  });

  // Autoguardado solo cuando la ventana lo habilita explícitamente (p. ej. edición desde reporte)
  useEffect(() => {
    if (!autoguardadoEfectivo) return;
    if (!isAutoSaveEnabled) {
      enableAutoSave();
    }
  }, [autoguardadoEfectivo, isAutoSaveEnabled, enableAutoSave]);

  // Handler para responsable - actualizar tanto el código como el nombre
  const handleResponsableChange = useCallback((codigoResponsable) => {
    // Buscar el responsable en la lista para obtener su nombre
    const responsableSeleccionado = responsables.find(r => String(r.value) === String(codigoResponsable));
    
    setFormData(prev => ({
      ...prev,
      codiRespnsble: codigoResponsable || '',
      nombreResponsable: responsableSeleccionado?.label || ''
    }));
  }, [responsables]);

  // Fetch funcionarios cuando cambia la aseguradora (con debounce y optimización)
  // NOTA: Si hay initialData (modo edición), este useEffect no debe ejecutarse para evitar interferencias
  // La carga de funcionarios en modo edición se maneja en el useEffect específico de modo edición
  useEffect(() => {
    // Si estamos en modo edición (hay initialData), no ejecutar este useEffect
    // El useEffect de modo edición se encarga de cargar los funcionarios
    if (initialData && initialData.codiAsgrdra) {
return;
    }

    // Limpiar funcionarios si no hay cliente seleccionado
    if (!formData.codiAsgrdra) {
      setFuncionarios([]);
      setCargandoFuncionarios(false);
      return;
    }

    // Esperar a que los clientes estén cargados
    if (aseguradoraOptionsRaw.length === 0) {
      return;
    }

    // Buscar el cliente seleccionado para obtener su código
    const cliente = aseguradoraOptionsRaw.find(
      c => c.codiAsgrdra === formData.codiAsgrdra || c.rzonSocial === formData.codiAsgrdra
    );

    const codigoCliente = cliente?.codiAsgrdra || formData.codiAsgrdra;

    if (!codigoCliente) {
      setFuncionarios([]);
      setCargandoFuncionarios(false);
      return;
    }

    // AbortController para cancelar peticiones anteriores si el usuario cambia rápido
    const abortController = new AbortController();
    setCargandoFuncionarios(true);
    // No limpiar inmediatamente para evitar que el select pierda la selección actual mientras carga

fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoCliente}`, {
      signal: abortController.signal
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // La API devuelve { success: true, data: [...] }
        const funcionariosData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
        const opciones = funcionariosData
          .map(mapearOpcionFuncionarioAseguradora)
          .filter(Boolean);

        const valorActual = formData.funcAsgrdra ? String(formData.funcAsgrdra) : '';
        const etiquetaActual = formData.funcAsgrdraNombre || formData.funcAsgrdra || valorActual;
        if (valorActual && !opciones.some(opt => opt.value === valorActual || opt.label === etiquetaActual)) {
          opciones.push({ value: valorActual, label: etiquetaActual || valorActual });
        }

        setFuncionarios(ordenarPorLabel(opciones));
        setCargandoFuncionarios(false);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('❌ Error cargando funcionarios:', error);
        setFuncionarios(prev => {
          if (prev && prev.length > 0) {
            return prev;
          }
          const valorActual = formData.funcAsgrdra ? String(formData.funcAsgrdra) : '';
          if (!valorActual) {
            return [];
          }
          return [{
            value: valorActual,
            label: formData.funcAsgrdraNombre || formData.funcAsgrdra || valorActual
          }];
        });
        setCargandoFuncionarios(false);
      });

    // Cleanup: cancelar la petición si el componente se desmonta o cambia el cliente
    return () => {
      abortController.abort();
    };
  }, [formData.codiAsgrdra, formData.funcAsgrdra, formData.funcAsgrdraNombre, aseguradoraOptionsRaw, initialData, ordenarPorLabel]);

  // Cuando camposFijos es true, complementar información del funcionario si falta
  // NOTA: Este useEffect solo se ejecuta como complemento, la carga principal se hace en el useEffect de modo edición
  useEffect(() => {
    if (!camposFijos) {
      return;
    }
    
    // Solo buscar si tenemos aseguradora y funcionario, pero NO si ya tenemos funcionarios cargados
    if (!formData.codiAsgrdra || !formData.funcAsgrdra || (funcionarios.length > 0 && formData.funcAsgrdraNombre)) {
      return;
    }

    const codigoFuncionario = String(formData.funcAsgrdra).trim();
    
    // No buscar si el código del funcionario es "Sin asignar" o está vacío
    if (!codigoFuncionario || 
        codigoFuncionario === 'Sin asignar' || 
        codigoFuncionario.toLowerCase() === 'sin asignar' ||
        codigoFuncionario === '' ||
        codigoFuncionario === 'null' ||
        codigoFuncionario === 'undefined') {
return;
    }

    // Si ya tenemos el nombre y no es "Sin asignar", no buscar
    if (formData.funcAsgrdraNombre && 
        formData.funcAsgrdraNombre !== 'Sin asignar' && 
        formData.funcAsgrdraNombre.toLowerCase() !== 'sin asignar') {
      return;
    }

    // Si la lista de funcionarios ya está cargada, buscar en ella primero
    if (funcionarios.length > 0) {
      const funcionarioEncontrado = funcionarios.find(f => 
        String(f.value) === codigoFuncionario ||
        f.label === codigoFuncionario
      );
      
      if (funcionarioEncontrado) {
setFormData(prev => ({
          ...prev,
          funcAsgrdraNombre: funcionarioEncontrado.label,
          funcionarioAseguradora: funcionarioEncontrado.label
        }));
        return;
      }
    }

    const codigoCliente = formData.codiAsgrdra;
    
const abortController = new AbortController();
    
    fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoCliente}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: abortController.signal
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        const funcionariosData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
        
        // Buscar el funcionario específico por su código
        const funcionarioEncontrado = funcionariosData.find(f => {
          const rawValue = f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? '';
          const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
          return value === codigoFuncionario || 
                 String(f.id) === codigoFuncionario ||
                 String(f.codiContacto) === codigoFuncionario ||
                 String(f.codigo) === codigoFuncionario ||
                 String(f._id) === codigoFuncionario ||
                 String(f.codiFuncionario) === codigoFuncionario;
        });
        
        if (funcionarioEncontrado) {
          const nombreFuncionario = funcionarioEncontrado.nmbrContcto || 
                                    funcionarioEncontrado.nombre || 
                                    funcionarioEncontrado.label || 
                                    '';
          
          if (nombreFuncionario) {
setFormData(prev => ({
              ...prev,
              funcAsgrdraNombre: nombreFuncionario,
              funcionarioAseguradora: nombreFuncionario
            }));
            
            // También actualizar la lista de funcionarios solo si está vacía
            if (funcionarios.length === 0) {
              const opciones = funcionariosData
                .map(mapearOpcionFuncionarioAseguradora)
                .filter(Boolean);
              
              setFuncionarios(ordenarPorLabel(opciones));
            }
          }
        } else {
          console.warn('⚠️ [Campos Fijos - Complemento] Funcionario no encontrado en BD para código:', codigoFuncionario);
        }
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('❌ [Campos Fijos - Complemento] Error buscando funcionario:', error);
      });

    return () => {
      abortController.abort();
    };
  }, [camposFijos, formData.codiAsgrdra, formData.funcAsgrdra, formData.funcAsgrdraNombre, funcionarios, ordenarPorLabel]);

  // Sincronizar correo del analista de compañía desde el catálogo de contactos
  useEffect(() => {
    if (!formData.funcAsgrdra || !funcionarios.length) return;
    const match = funcionarios.find(
      (f) =>
        String(f.value) === String(formData.funcAsgrdra) ||
        String(f.label) === String(formData.funcAsgrdraNombre || '')
    );
    const email = String(match?.email || '').trim();
    if (!email) return;
    setFormData((prev) => {
      if (prev.emailFuncionarioAseguradora === email) return prev;
      return { ...prev, emailFuncionarioAseguradora: email };
    });
  }, [formData.funcAsgrdra, formData.funcAsgrdraNombre, funcionarios]);

  useEffect(() => {
    if (!funcionarios.length) {
      return;
    }
    
    // Si estamos en modo edición y tenemos initialData, asegurarnos de sincronizar correctamente
    const valorInicial = initialData?.funcAsgrdra || initialData?.funcionarioAseguradora || initialData?.funcAsgrdraNombre;
    const nombreInicial = initialData?.funcAsgrdraNombre || initialData?.funcionarioAseguradora || initialData?.funcAsgrdra;
    
    setFormData(prev => {
      // Si no hay funcionario asignado, no hacer nada
      if (!prev.funcAsgrdra && !prev.funcAsgrdraNombre && !prev.funcionarioAseguradora && !valorInicial && !nombreInicial) {
        return prev;
      }
      
      // Priorizar valores de initialData si estamos en modo edición
      const currentValue = valorInicial 
        ? String(valorInicial) 
        : String(prev.funcAsgrdra || '');
      const currentNombre = nombreInicial 
        ? String(nombreInicial) 
        : String(prev.funcAsgrdraNombre || prev.funcionarioAseguradora || '');
      
      // Buscar por valor (código) - comparación exacta
      const matchByValue = funcionarios.find(f => 
        String(f.value) === currentValue ||
        f.value === currentValue ||
        String(f.value) === String(currentNombre) ||
        f.value === currentNombre
      );
      if (matchByValue) {
return { 
          ...prev, 
          funcAsgrdra: String(matchByValue.value), 
          funcAsgrdraNombre: matchByValue.label,
          funcionarioAseguradora: matchByValue.label,
          emailFuncionarioAseguradora: matchByValue.email || prev.emailFuncionarioAseguradora || '',
        };
      }
      
      // Buscar por label (nombre) - comparación exacta
      const matchByLabel = funcionarios.find(f => 
        f.label === currentNombre || 
        f.label === currentValue ||
        String(f.label) === String(currentNombre) ||
        String(f.label) === String(currentValue) ||
        (currentNombre && f.label && f.label.trim() === currentNombre.trim())
      );
      if (matchByLabel) {
return { 
          ...prev, 
          funcAsgrdra: String(matchByLabel.value), 
          funcAsgrdraNombre: matchByLabel.label,
          funcionarioAseguradora: matchByLabel.label,
          emailFuncionarioAseguradora: matchByLabel.email || prev.emailFuncionarioAseguradora || '',
        };
      }
      
      // Buscar por nombre con comparación case-insensitive
      if (currentNombre && currentNombre !== 'Sin asignar' && currentNombre.toLowerCase() !== 'sin asignar') {
        const matchByNombre = funcionarios.find(f => 
          f.label.toLowerCase() === currentNombre.toLowerCase() ||
          f.label.toLowerCase() === currentValue.toLowerCase() ||
          String(f.value).toLowerCase() === currentNombre.toLowerCase() ||
          String(f.value).toLowerCase() === currentValue.toLowerCase() ||
          (f.label && currentNombre && f.label.toLowerCase().trim() === currentNombre.toLowerCase().trim())
        );
        if (matchByNombre) {
return { 
            ...prev, 
            funcAsgrdra: String(matchByNombre.value), 
            funcAsgrdraNombre: matchByNombre.label,
            funcionarioAseguradora: matchByNombre.label,
            emailFuncionarioAseguradora: matchByNombre.email || prev.emailFuncionarioAseguradora || '',
          };
        }
      }
      
      // Si no se encuentra pero hay un nombre válido, mantener el valor actual
      // Esto permite que el funcionario se mantenga aunque no esté en la lista
      if (currentNombre && currentNombre !== 'Sin asignar' && currentNombre.toLowerCase() !== 'sin asignar') {
return prev;
      }
      
      return prev;
    });
  }, [funcionarios, initialData]);

  // Guardar los datos crudos de clientes para obtener el código
  useEffect(() => {
    fetch(`${BASE_URL}/api/clientes`)
      .then(res => res.json())
      .then(data => {
        const clientes = Array.isArray(data) ? data : [];
        setAseguradoraOptionsRaw(clientes);
        const opciones = clientes
          .map(c => ({
            value: c.codiAsgrdra,
            label: c.rzonSocial
          }))
          .filter(opcion => opcion.value && opcion.label);
        setAseguradoraOptions(ordenarPorLabel(opciones));

        if (esSura) {
          const clienteSura = clientes.find(esClienteSura);
          if (clienteSura) {
            setFormData((prev) => {
              if (prev.codiAsgrdra && String(prev.codiAsgrdra) === String(clienteSura.codiAsgrdra)) {
                return prev;
              }
              if (prev.codiAsgrdra && initialData?._id) {
                return {
                  ...prev,
                  nombreCliente: prev.nombreCliente || clienteSura.rzonSocial,
                  nombreAseguradora: prev.nombreAseguradora || clienteSura.rzonSocial,
                };
              }
              return {
                ...prev,
                codiAsgrdra: clienteSura.codiAsgrdra,
                nombreCliente: clienteSura.rzonSocial,
                nombreAseguradora: clienteSura.rzonSocial,
              };
            });
          }
        }
      })
      .catch(err => {
        console.error('Error cargando clientes:', err);
        setAseguradoraOptionsRaw([]);
        setAseguradoraOptions([]);
      });
  }, [
    ordenarPorLabel,
    formData.codiRespnsble,
    formData.nombreResponsable,
    initialData?.codiRespnsble,
    initialData?.nombreResponsable,
    initialData?.responsable,
  ]);

  // Normalizar codiAsgrdra a código cuando haya datos de clientes
  useEffect(() => {
    if (aseguradoraOptionsRaw.length === 0) {
      return;
    }

    setFormData(prev => {
      if (!prev.codiAsgrdra) {
        return prev;
      }

      const cliente = aseguradoraOptionsRaw.find(
        c => c.codiAsgrdra === prev.codiAsgrdra || c.rzonSocial === prev.codiAsgrdra
      );

      if (cliente && prev.codiAsgrdra !== cliente.codiAsgrdra) {
        return {
          ...prev,
          codiAsgrdra: cliente.codiAsgrdra,
          nombreCliente: cliente.rzonSocial
        };
      }

      return prev;
    });
  }, [aseguradoraOptionsRaw]);

  // Cargar funcionarios cuando se inicializa el formulario con datos (modo edición)
  // IMPORTANTE: Este useEffect debe ejecutarse SIEMPRE que haya initialData y codiAsgrdra,
  // independientemente de si camposFijos es true o false
  useEffect(() => {
    // Verificar que tengamos initialData y codiAsgrdra, y que las opciones de aseguradora estén cargadas
    if (!initialData || !initialData.codiAsgrdra || aseguradoraOptionsRaw.length === 0) {
      return;
    }

    // Buscar el cliente seleccionado para obtener su código
    const cliente = aseguradoraOptionsRaw.find(
      c => c.codiAsgrdra === initialData.codiAsgrdra || c.rzonSocial === initialData.codiAsgrdra
    );
    const codigoCliente = cliente?.codiAsgrdra || initialData.codiAsgrdra;
    
    if (!codigoCliente) {
return;
    }

// AbortController para cancelar peticiones anteriores
    const abortController = new AbortController();
    setCargandoFuncionarios(true);
    
    // Obtener el funcionario actual ANTES de cargar la lista
    // Priorizar initialData sobre formData
    // IMPORTANTE: Si el valor es "Sin asignar", debemos buscar el funcionario real en la BD
    let valorActual = (initialData?.funcAsgrdra !== undefined && initialData?.funcAsgrdra !== null && initialData?.funcAsgrdra !== '')
      ? String(initialData.funcAsgrdra)
      : (formData.funcAsgrdra ? String(formData.funcAsgrdra) : '');
    let etiquetaActual = (initialData?.funcAsgrdraNombre !== undefined && initialData?.funcAsgrdraNombre !== null && initialData?.funcAsgrdraNombre !== '')
      ? String(initialData.funcAsgrdraNombre)
      : (initialData?.funcionarioAseguradora || 
         formData.funcAsgrdraNombre || 
         formData.funcionarioAseguradora || 
         initialData?.funcAsgrdra || 
         valorActual || '');
    
    // Si el valor es "Sin asignar", limpiarlo para buscar el funcionario real
    const esSinAsignar = valorActual === 'Sin asignar' || 
                        valorActual.toLowerCase() === 'sin asignar' ||
                        etiquetaActual === 'Sin asignar' ||
                        etiquetaActual.toLowerCase() === 'sin asignar';
    
    if (esSinAsignar) {
valorActual = '';
      etiquetaActual = '';
    }
    
fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoCliente}`, {
      signal: abortController.signal
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        // La API devuelve { success: true, data: [...] }
        const funcionariosData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
        const opciones = funcionariosData
          .map(mapearOpcionFuncionarioAseguradora)
          .filter(Boolean);

// Si hay un funcionario asignado pero no está en la lista, agregarlo
        if (valorActual || etiquetaActual) {
          const yaExiste = opciones.some(opt => 
            String(opt.value) === String(valorActual) || 
            opt.label === etiquetaActual ||
            opt.label === valorActual ||
            String(opt.value) === String(etiquetaActual) ||
            (etiquetaActual && opt.label.toLowerCase() === etiquetaActual.toLowerCase())
          );
          
          if (!yaExiste && etiquetaActual && etiquetaActual !== 'Sin asignar' && etiquetaActual.toLowerCase() !== 'sin asignar') {
            // Usar el nombre como valor si no hay código numérico
            const valorParaAgregar = /^\d+$/.test(valorActual) ? valorActual : (etiquetaActual || valorActual);
            opciones.push({ value: String(valorParaAgregar), label: etiquetaActual || valorActual });
}
        }

        setFuncionarios(ordenarPorLabel(opciones));
        setCargandoFuncionarios(false);
        
        // Sincronizar el funcionario DESPUÉS de establecer la lista
        // Usar setTimeout para asegurar que el estado se actualice
        setTimeout(() => {
          // Si la lista está vacía, no hacer nada
          if (opciones.length === 0) {
return;
          }
          
          // Si había un valor "Sin asignar", intentar buscar el funcionario real desde initialData
          // Buscar en todos los campos posibles de initialData
          let valorOriginal = initialData?.funcAsgrdra || 
                               initialData?.funcionarioAseguradoraId || 
                               initialData?.funcionarioAseguradora || '';
          let nombreOriginal = initialData?.funcAsgrdraNombre || 
                                initialData?.funcionarioAseguradora || 
                                initialData?.nombreFuncionario || '';
          
          // Si no tenemos código pero sí tenemos nombre, buscar el código en la lista cargada
          if (nombreOriginal && 
              nombreOriginal !== 'Sin asignar' && 
              nombreOriginal.toLowerCase() !== 'sin asignar' &&
              (!valorOriginal || !/^\d+$/.test(String(valorOriginal).trim()))) {
            // Buscar por nombre en la lista de funcionarios cargada
            const funcionarioPorNombre = opciones.find(f => 
              f.label === nombreOriginal ||
              f.label.toLowerCase() === nombreOriginal.toLowerCase() ||
              (f.label && nombreOriginal && f.label.toLowerCase().trim() === nombreOriginal.toLowerCase().trim())
            );
            
            if (funcionarioPorNombre) {
              valorOriginal = funcionarioPorNombre.value;
} else {
              console.warn(`⚠️ [Cargar Funcionarios - Modo Edición] No se encontró código para funcionario ${nombreOriginal} en la lista cargada`);
              // Usar el nombre como código temporal si no se encuentra
              valorOriginal = nombreOriginal;
            }
          }
          
          // Si tenemos un valor original que no es "Sin asignar", usarlo
          if (valorOriginal && valorOriginal !== 'Sin asignar' && valorOriginal.toLowerCase() !== 'sin asignar') {
            const funcionarioEncontrado = opciones.find(f => 
              String(f.value) === String(valorOriginal) || 
              f.label === String(nombreOriginal) ||
              f.label === String(valorOriginal) ||
              (nombreOriginal && f.label.toLowerCase() === String(nombreOriginal).toLowerCase()) ||
              (valorOriginal && String(f.value).toLowerCase() === String(valorOriginal).toLowerCase())
            );
            
            if (funcionarioEncontrado) {
              setFormData(prev => ({
                ...prev,
                funcAsgrdra: String(funcionarioEncontrado.value),
                funcAsgrdraNombre: funcionarioEncontrado.label,
                funcionarioAseguradora: funcionarioEncontrado.label
              }));
              
return;
            }
          }
          
          // Si tenemos valorActual o etiquetaActual válidos, buscar en la lista
          // Usar valorOriginal/nombreOriginal si están disponibles, sino usar valorActual/etiquetaActual
          const valorParaBuscar = valorOriginal || valorActual;
          const nombreParaBuscar = nombreOriginal || etiquetaActual;
          
          if (valorParaBuscar || nombreParaBuscar) {
            // Buscar el funcionario en la lista con múltiples comparaciones
            // Priorizar búsqueda por código numérico si está disponible
            let funcionarioEncontrado = null;
            
            if (valorParaBuscar && /^\d+$/.test(String(valorParaBuscar).trim())) {
              // Buscar por código numérico primero
              funcionarioEncontrado = opciones.find(f => 
                String(f.value) === String(valorParaBuscar) ||
                String(f.value).trim() === String(valorParaBuscar).trim()
              );
            }
            
            // Si no se encuentra por código, buscar por nombre
            if (!funcionarioEncontrado && nombreParaBuscar) {
              funcionarioEncontrado = opciones.find(f => 
                f.label === nombreParaBuscar ||
                f.label === valorParaBuscar ||
                String(f.value) === String(nombreParaBuscar) ||
                String(f.value) === String(valorParaBuscar) ||
                (nombreParaBuscar && f.label && f.label.toLowerCase().trim() === nombreParaBuscar.toLowerCase().trim()) ||
                (valorParaBuscar && f.label && f.label.toLowerCase().trim() === String(valorParaBuscar).toLowerCase().trim())
              );
            }
            
            // Búsqueda adicional con valores originales (valorActual/etiquetaActual) si aún no se encontró
            if (!funcionarioEncontrado && (valorActual || etiquetaActual)) {
              funcionarioEncontrado = opciones.find(f => 
                String(f.value) === String(valorActual) || 
                f.label === etiquetaActual ||
                String(f.value) === String(etiquetaActual) ||
                f.label === valorActual ||
                (etiquetaActual && f.label && f.label.toLowerCase() === etiquetaActual.toLowerCase()) ||
                (valorActual && String(f.value).toLowerCase() === String(valorActual).toLowerCase())
              );
            }
            
            if (funcionarioEncontrado) {
              // Actualizar formData con el funcionario encontrado - usar String para que coincida con el select
              setFormData(prev => ({
                ...prev,
                funcAsgrdra: String(funcionarioEncontrado.value),
                funcAsgrdraNombre: funcionarioEncontrado.label,
                funcionarioAseguradora: funcionarioEncontrado.label
              }));
              
              // Forzar un re-render del select asegurando que el valor coincida
} else {
              // Si no se encuentra, intentar usar el nombre original si existe
              if (nombreOriginal && nombreOriginal !== 'Sin asignar' && nombreOriginal.toLowerCase() !== 'sin asignar') {
                const funcionarioPorNombre = opciones.find(f => 
                  f.label.toLowerCase() === nombreOriginal.toLowerCase() ||
                  f.label === nombreOriginal
                );
                
                if (funcionarioPorNombre) {
                  setFormData(prev => ({
                    ...prev,
                    funcAsgrdra: String(funcionarioPorNombre.value),
                    funcAsgrdraNombre: funcionarioPorNombre.label,
                    funcionarioAseguradora: funcionarioPorNombre.label
                  }));
                  
} else {
// Dejar el campo vacío para que el usuario pueda seleccionar manualmente
                  setFormData(prev => ({
                    ...prev,
                    funcAsgrdra: '',
                    funcAsgrdraNombre: '',
                    funcionarioAseguradora: ''
                  }));
                }
              } else {
// Dejar el campo vacío para que el usuario pueda seleccionar manualmente
                setFormData(prev => ({
                  ...prev,
                  funcAsgrdra: '',
                  funcAsgrdraNombre: '',
                  funcionarioAseguradora: ''
                }));
              }
            }
          } else {
// Dejar el campo vacío para que el usuario pueda seleccionar manualmente
            setFormData(prev => ({
              ...prev,
              funcAsgrdra: '',
              funcAsgrdraNombre: '',
              funcionarioAseguradora: ''
            }));
          }
        }, 150);
        
        if (cliente && formData.codiAsgrdra !== cliente.codiAsgrdra) {
          setFormData(prev => ({
            ...prev,
            codiAsgrdra: cliente.codiAsgrdra,
            nombreCliente: cliente.rzonSocial || prev.nombreCliente
          }));
        }
      })
      .catch(error => {
        if (error.name === 'AbortError') {
return;
        }
        console.error('❌ [Cargar Funcionarios - Modo Edición] Error cargando funcionarios:', error);
        setFuncionarios([]);
        setCargandoFuncionarios(false);
        
        // Si hay un funcionario en initialData, agregarlo a la lista aunque falle la carga
        if (valorActual || etiquetaActual) {
          const funcionarioFallback = {
            value: valorActual || etiquetaActual,
            label: etiquetaActual || valorActual
          };
          setFuncionarios([funcionarioFallback]);
}
      });

    // Cleanup: cancelar la petición si el componente se desmonta o cambian las dependencias
    return () => {
      abortController.abort();
    };
  }, [initialData, aseguradoraOptionsRaw, formData.codiAsgrdra, formData.funcAsgrdra, formData.funcAsgrdraNombre, formData.funcionarioAseguradora, ordenarPorLabel]);

  useEffect(() => {
    let cancelado = false;
    const cached = sessionStorage.getItem('ciudades-options-v2');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (!cancelado) {
          const opciones = Array.isArray(parsed) ? parsed : [];
          setCiudades(ordenarPorLabel(opciones));
        }
      } catch {
        console.warn('⚠️ Cache de ciudades inválido, se ignorará.');
      }
    } else {
      setCargandoCiudades(true);
    }

    if (!cached) {
      fetch(`${BASE_URL}/api/ciudades`)
        .then(res => res.json())
        .then(data => {
          if (cancelado) return;
          const lista = data?.success && Array.isArray(data.data)
            ? data.data
            : Array.isArray(data) ? data : [];
          const opciones = lista
            .map((c) => {
              const municipio = String(
                c.descMunicipio || c.label || c.nombre || c.value || ''
              ).trim();
              const depto = String(c.descDepto || c.departamento || '').trim();
              if (!municipio) return null;
              return {
                value: municipio,
                label: municipio,
                departamento: depto,
              };
            })
            .filter(Boolean);
          const ordenadas = ordenarPorLabel(opciones);
          setCiudades(ordenadas);
          sessionStorage.setItem('ciudades-options-v2', JSON.stringify(ordenadas));
        })
        .catch(err => {
          if (!cancelado) {
            console.error('Error cargando ciudades:', err);
            setCiudades([]);
          }
        })
        .finally(() => {
          if (!cancelado) {
            setCargandoCiudades(false);
          }
        });
    }

    return () => {
      cancelado = true;
    };
  }, [
    ordenarPorLabel,
    formData.codiRespnsble,
    formData.nombreResponsable,
    initialData?.codiRespnsble,
    initialData?.nombreResponsable,
    initialData?.responsable,
  ]);

  // Sincronizar ciudad cuando las ciudades estén cargadas (modo edición)
  useEffect(() => {
    if (!initialData || !ciudades.length || !formData.ciudadSiniestro) {
      return;
    }

    const ciudadGuardada = formData.ciudadSiniestro;
    
    // Buscar la ciudad en la lista cargada
    const ciudadEncontrada = ciudades.find(ciudad => {
      // Comparar por value exacto
      if (String(ciudad.value) === String(ciudadGuardada)) {
        return true;
      }
      // Comparar por label (puede que el value sea el nombre de la ciudad)
      if (String(ciudad.label) === String(ciudadGuardada)) {
        return true;
      }
      // Comparar si el label contiene el valor guardado
      if (ciudad.label && String(ciudad.label).includes(String(ciudadGuardada))) {
        return true;
      }
      return false;
    });

    if (ciudadEncontrada && formData.ciudadSiniestro !== ciudadEncontrada.value) {
setFormData(prev => ({
        ...prev,
        ciudadSiniestro: ciudadEncontrada.value,
        departamento: prev.departamento || ciudadEncontrada.departamento || '',
        departamentoCiudad: prev.departamentoCiudad || ciudadEncontrada.departamento || '',
      }));
    } else if (ciudadEncontrada?.departamento && esSura && !formData.departamento) {
      setFormData((prev) => ({
        ...prev,
        departamento: ciudadEncontrada.departamento,
        departamentoCiudad: prev.departamentoCiudad || ciudadEncontrada.departamento,
      }));
    } else if (!ciudadEncontrada && ciudadGuardada) {
      // Si no se encuentra pero hay un valor, mantenerlo (puede ser un valor válido que no está en la lista)
}
  }, [ciudades, initialData, formData.ciudadSiniestro, formData.departamento, esSura]);

  useEffect(() => {
    fetch(`${BASE_URL}/api/responsables`)
      .then(res => res.json())
      .then(data => {
        const lista = data?.success && Array.isArray(data.data)
          ? data.data
          : Array.isArray(data) ? data : [];
        const opciones = lista
          .map(r => {
            const rawValue = r.codiRespnsble ?? r.codigo ?? r.value ?? r._id ?? '';
            const label = r.nmbrRespnsble ?? r.nombre ?? r.label ?? '';
            const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
            if (!value || !label) {
              return null;
            }
            return { value, label };
          })
          .filter(Boolean);

        const valorActual = initialData?.codiRespnsble
          ? String(initialData.codiRespnsble)
          : (formData.codiRespnsble ? String(formData.codiRespnsble) : '');
        if (valorActual && !opciones.some(opt => opt.value === valorActual || opt.label === valorActual)) {
        const etiqueta = initialData?.responsable || initialData?.nombreResponsable || formData.nombreResponsable || valorActual;
          opciones.push({ value: valorActual, label: etiqueta });
        }

        setResponsables(ordenarPorLabel(opciones));
      })
      .catch(err => {
        console.error('Error cargando responsables:', err);
        setResponsables([]);
      });
  }, [
    ordenarPorLabel,
    formData.codiRespnsble,
    formData.nombreResponsable,
    initialData?.codiRespnsble,
    initialData?.nombreResponsable,
    initialData?.responsable,
  ]);

  useEffect(() => {
    if (!esSura) {
      setAjustadoresCatastrofico([]);
      setInspectoresCatastrofico([]);
      return undefined;
    }
    let cancelado = false;
    (async () => {
      try {
        const [resAj, resIns] = await Promise.all([
          fetch(`${BASE_URL}/api/ajustadores-catastrofico`),
          fetch(`${BASE_URL}/api/inspectores-catastrofico`),
        ]);
        const dataAj = await resAj.json().catch(() => ({}));
        const dataIns = await resIns.json().catch(() => ({}));
        if (cancelado) return;
        const listaAj = Array.isArray(dataAj?.data) ? dataAj.data : Array.isArray(dataAj) ? dataAj : [];
        const listaIns = Array.isArray(dataIns?.data)
          ? dataIns.data
          : Array.isArray(dataIns)
            ? dataIns
            : [];
        setAjustadoresCatastrofico(mapCatalogoCatastroficoAOpciones(listaAj, 'sura'));
        setInspectoresCatastrofico(mapCatalogoCatastroficoAOpciones(listaIns, 'sura'));
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando catálogos catastróficos SURA:', err);
          setAjustadoresCatastrofico([]);
          setInspectoresCatastrofico([]);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [esSura]);

  const lideresAsignacion = useMemo(() => {
    const todos = (responsables || []).map((r) => ({
      value: r.label || r.value,
      label: r.label || r.value,
      codigo: r.value,
    }));
    return todos;
  }, [responsables]);

  useEffect(() => {
    if (!esSura || initialData?._id || !lideresAsignacion.length) return;
    const liderDefault = resolverLiderPorModulo(lideresAsignacion, 'sura');
    if (!liderDefault) return;
    setFormData((prev) =>
      prev.ajustadorLider ? prev : { ...prev, ajustadorLider: liderDefault }
    );
  }, [esSura, lideresAsignacion, initialData?._id]);

  const ajustadoresCatFiltrados = useMemo(() => {
    if (!esSura) return [];
    return asegurarOpcionActual(ajustadoresCatastrofico, formData.ajustador);
  }, [esSura, ajustadoresCatastrofico, formData.ajustador]);
  const inspectoresCatFiltrados = useMemo(() => {
    if (!esSura) return [];
    return asegurarOpcionActual(inspectoresCatastrofico, formData.inspector);
  }, [esSura, inspectoresCatastrofico, formData.inspector]);

  useEffect(() => {
    if (!responsables.length) {
      return;
    }
    setFormData(prev => {
      if (!prev.codiRespnsble) {
        return prev;
      }
      const current = String(prev.codiRespnsble);
      const matchByValue = responsables.find(r => r.value === current);
      if (matchByValue) {
        if (matchByValue.label !== prev.nombreResponsable) {
          return { ...prev, nombreResponsable: matchByValue.label };
        }
        return prev;
      }
      const matchByLabel = responsables.find(r => r.label === prev.codiRespnsble);
      if (matchByLabel) {
        return { ...prev, codiRespnsble: matchByLabel.value, nombreResponsable: matchByLabel.label };
      }
      return prev;
    });
  }, [responsables]);

  // Cargar estado inicial desde codiEstdo solo si el usuario aún no eligió uno.
  useEffect(() => {
    if (!estados.length) return;
    setFormData((prev) => {
      if (esSura) {
        const norm = normalizarEstadoSura(prev.estado || prev.descripcionEstado);
        if (norm === prev.estado) return prev;
        return { ...prev, estado: norm, descripcionEstado: prev.descripcionEstado || norm };
      }
      const estadoActual = String(prev.estado || '').trim();
      if (estadoActual && estados.some((e) => e.value === estadoActual)) {
        return prev;
      }
      const resolved = resolverEstadoParaSelect(prev, estados);
      if (!resolved || resolved === prev.estado) return prev;
      return { ...prev, estado: resolved, codiEstdo: resolved };
    });
  }, [estados, resolverEstadoParaSelect, esSura]);

  useEffect(() => {
    if (esSura) {
      setEstados(ESTADOS_SURA.map((e) => ({ value: e, label: e })));
      return undefined;
    }
    fetch(`${BASE_URL}/api/estados`)
      .then(res => res.json())
      .then(data => {
        const lista = data?.success && Array.isArray(data.data)
          ? data.data
          : Array.isArray(data) ? data : [];
        const mapped = lista
          .filter((e) => {
            const codigo = e?.codiEstdo ?? e?.codiEstado;
            const desc = e?.descEstdo ?? e?.descEstado;
            return e && codigo !== undefined && codigo !== null && desc;
          })
          .map((e) => ({
            value: String(e.codiEstdo ?? e.codiEstado),
            label: e.descEstdo ?? e.descEstado,
          }));
        setEstados(ordenarPorLabel(mapped));
      })
      .catch(err => {
        console.error('Error cargando estados:', err);
        setEstados([]);
      });
  }, [esSura, ordenarPorLabel]);

  // Cargar intermediarios desde la nueva API
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${BASE_URL}/api/intermediarios`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
// Manejar ambos formatos: {success: true, data: [...]} o [...]
        let intermediariosList = [];
        if (data.success && Array.isArray(data.data)) {
          intermediariosList = data.data;
        } else if (Array.isArray(data)) {
          intermediariosList = data;
        }
        
        // Filtrar solo los activos
        const intermediariosActivos = intermediariosList.filter(i => i.estado === 1);
        
        // Crear array de nombres para el dropdown
        const nombresIntermediarios = intermediariosActivos
          .map(i => i.nombre)
          .filter(Boolean);
        setIntermediariosOptions(ordenarStrings(nombresIntermediarios));
      })
      .catch(error => {
        console.error("Error al cargar intermediarios:", error);
        setIntermediariosOptions([]);
      });
  }, [ordenarStrings]);

  // Función para mapear los campos del frontend a los del backend
  const mapFormDataToBackend = useCallback((formData) => {
    const pick = (...keys) => {
      for (const key of keys) {
        const value = formData[key];
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
      return undefined;
    };

    const payload = {
      // IMPORTANTE: Incluir _id si existe para que el backend sepa que es una actualización
      ...(formData._id ? { _id: formData._id } : {}),
      _origenGuardado: 'casoComplex',
      fechasHitoEditadasManualmente: Array.from(fechasHitoEditadasRef.current),
      // Campos principales
      nmroAjste: formData.nmroAjste,
      nmroSinstro: formData.nmroSinstro,
      nombIntermediario: formData.nombIntermediario,
      codWorkflow: formData.codWorkflow,
      nmroPolza: formData.nmroPolza,
      codiRespnsble: formData.codiRespnsble,
      nombreResponsable: formData.nombreResponsable || '',
      responsable: formData.nombreResponsable || '',
      ajustadorLider: formData.ajustadorLider || '',
      ajustador: formData.ajustador || formData.nombreResponsable || formData.codiRespnsble || '',
      inspector: formData.inspector || '',
      correo: formData.correo || '',
      celular: formData.celular || '',
      ...(esSura
        ? {
            sede: formData.sede || '',
            sedeRiesgo: formData.sede || '',
            direccionPredio: formData.direccionPredio || '',
            direccion: formData.direccionPredio || '',
            tomador: formData.tomador || '',
            numeroCredito: formData.numeroCredito || '',
            fechaInicioPoliza: formData.fechaInicioPoliza || '',
            fechaFinPoliza: formData.fechaFinPoliza || '',
            estadoPagoPrimas: formData.estadoPagoPrimas || '',
            ciudad: formData.ciudadSiniestro || formData.ciudad || '',
            departamento: formData.departamento || formData.departamentoCiudad || '',
            departamentoCiudad: formData.departamento || formData.departamentoCiudad || '',
            cobertura: formData.cobertura || formData.causa_siniestro || '',
          }
        : {}),
      codiAsgrdra: formData.codiAsgrdra,
      funcAsgrdra: formData.funcAsgrdra,
      funcAsgrdraNombre: formData.funcAsgrdraNombre || '',
      funcionarioAseguradora: formData.funcAsgrdraNombre || '',
      asgrBenfcro: formData.asgrBenfcro,
      tipoDucumento: formData.tipoDucumento,
      numDocumento: formData.numDocumento,
      tipoPoliza: formData.tipoPoliza,
      ciudadSiniestro: pick('ciudadSiniestro', 'ciudad_siniestro'),
      amprAfctdo: formData.amprAfctdo,
      descSinstro: pick('descSinstro', 'desc_sinstro', 'descripcion_siniestro'),
      causa_siniestro: formData.causa_siniestro,
      codiEstdo: extraerCodiEstdoParaGuardar(formData),
      descripcionEstado: formData.descripcionEstado || '',
      observacionesPendientes: formData.observacionesPendientes || '',
      fchaAsgncion: formData.fchaAsgncion,
      fchaSinstro: formData.fchaSinstro,
      fchaInspccion: formData.fchaInspccion,
      fchaContIni: formData.fchaContIni,
      fchaCoordInspeccion: formData.fchaCoordInspeccion !== undefined && formData.fchaCoordInspeccion !== null && formData.fchaCoordInspeccion !== '' ? formData.fchaCoordInspeccion : undefined,
      fchaProgInspeccion: formData.fchaProgInspeccion !== undefined && formData.fchaProgInspeccion !== null && formData.fchaProgInspeccion !== '' ? formData.fchaProgInspeccion : undefined,
      ...(esSura
        ? {
            fechaInspeccion:
              formData.fechaInspeccion ||
              formData.fchaProgInspeccion ||
              formData.fchaInspccion ||
              '',
            horaInicioCoordinacion: formData.horaInicioCoordinacion || '',
            horaFinCoordinacion: formData.horaFinCoordinacion || '',
          }
        : {}),

      // Campos adicionales (observaciones y anexos)
      obseContIni: pick('obseContIni', 'obse_cont_ini'),
      obseCoordInspeccion: pick('obseCoordInspeccion', 'obse_coord_inspeccion'),
      anexContIni: pick('anexContIni', 'adjuntos_contacto_inicial'),
      obseInspccion: pick('obseInspccion', 'obse_inspccion'),
      anexActaInspccion: pick('anexActaInspccion', 'adjunto_acta_inspeccion'),
      // IMPORTANTE: Usar directamente formData para fechas (no pick) para asegurar que se guarden
      // Incluir la fecha incluso si está vacía para que se pueda limpiar en el backend
      fchaSoliDocu: formData.fchaSoliDocu !== undefined && formData.fchaSoliDocu !== null && formData.fchaSoliDocu !== '' ? formData.fchaSoliDocu : undefined,
      anexSolDoc: pick('anexSolDoc', 'adjunto_solicitud_documento'),
      obseSoliDocu: pick('obseSoliDocu', 'obse_soli_docu'),
      fchaInfoPrelm: formData.fchaInfoPrelm !== undefined && formData.fchaInfoPrelm !== null && formData.fchaInfoPrelm !== '' ? formData.fchaInfoPrelm : undefined,
      obseInfoPrelm: pick('obseInfoPrelm', 'obse_info_prelm'),
      anxoInfPrelim: pick('anxoInfPrelim', 'adjunto_informe_preliminar'),
      fchaInfoFnal: formData.fchaInfoFnal !== undefined && formData.fchaInfoFnal !== null && formData.fchaInfoFnal !== '' ? formData.fchaInfoFnal : undefined,
      obseInfoFnal: pick('obseInfoFnal', 'obse_info_fnal'),
      anxoInfoFnal: pick('anxoInfoFnal', 'adjunto_informe_final'),
      fchaRepoActi: formData.fchaRepoActi !== undefined && formData.fchaRepoActi !== null && formData.fchaRepoActi !== '' ? formData.fchaRepoActi : undefined,
      obseRepoActi: pick('obseRepoActi', 'obse_repo_acti'),
      anxoRepoActi: pick('anxoRepoActi', 'adjunto_entrega_ultimo_documento'),
      fchaPresentacionCifras: formData.fchaPresentacionCifras !== undefined && formData.fchaPresentacionCifras !== null && formData.fchaPresentacionCifras !== '' ? formData.fchaPresentacionCifras : undefined,
      fchaAceptacionCifrasAseguradora: formData.fchaAceptacionCifrasAseguradora !== undefined && formData.fchaAceptacionCifrasAseguradora !== null && formData.fchaAceptacionCifrasAseguradora !== '' ? formData.fchaAceptacionCifrasAseguradora : undefined,
      fchaReconsideracion: formData.fchaReconsideracion !== undefined && formData.fchaReconsideracion !== null && formData.fchaReconsideracion !== '' ? formData.fchaReconsideracion : undefined,
      obsePresentacionCifras: pick('obsePresentacionCifras', 'obse_presentacion_cifras'),
      anxoPresentacionCifras: pick('anxoPresentacionCifras', 'adjunto_presentacion_cifras'),
      fchaEnvioFiniquito: formData.fchaEnvioFiniquito !== undefined && formData.fchaEnvioFiniquito !== null && formData.fchaEnvioFiniquito !== '' ? formData.fchaEnvioFiniquito : undefined,
      obseEnvioFiniquito: pick('obseEnvioFiniquito', 'obse_envio_finiquito'),
      anxoEnvioFiniquito: pick('anxoEnvioFiniquito', 'adjunto_envio_finiquito'),
      obseSegmnto: pick('obseSegmnto', 'obse_segmnto'),
      obseComprmsi: pick('obseComprmsi', 'obse_comprmsi', 'observacion_compromisos'),
      anxoFactra: pick('anxoFactra', 'adjunto_factura'),
      anxoHonorarios: pick('anxoHonorarios', 'adjunto_honorarios'),
      anxoHonorariosdefinit: pick('anxoHonorariosdefinit', 'adjunto_honorarios_definitivo'),
      anxoAutorizacion: pick('anxoAutorizacion', 'anxo_autorizacion'),

      // Fechas adicionales - USAR NOMBRES EXACTOS DEL SCHEMA (snake_case)
      fchaUltSegui: pick('fchaUltSegui', 'fcha_ult_segui'),
      fcha_ult_segui: pick('fchaUltSegui', 'fcha_ult_segui'),
      fcha_act_segui: pick('fcha_act_segui', 'fchaActSegui'),
      fcha_finqto_indem: pick('fcha_finqto_indem', 'fchaFinqtoIndem'),
      fcha_factra: pick('fcha_factra', 'fchaFactra', 'fecha_factura'),
      fcha_ult_revi: pick('fcha_ult_revi', 'fchaUltRevi', 'fecha_ultima_revision'),
      fcha_control_horas: pick('fcha_control_horas', 'fecha_control_horas', 'fchaControlHoras'), // Nombre exacto del schema en BD
      fcha_envio_control_horas: pick('fcha_envio_control_horas', 'fecha_envio_control_horas'), // Fecha de envío control de horas (Gerencia)
      fcha_recibido_control_horas: pick('fcha_recibido_control_horas', 'fecha_recibido_control_horas'), // Fecha de recibido control de horas (Gerencia)
      fcha_seguimiento_envio_control_horas: pick('fcha_seguimiento_envio_control_horas', 'fecha_seguimiento_envio_control_horas'), // Fecha de seguimiento de envío control de horas
      obse_seguimiento_envio_control_horas: pick('obse_seguimiento_envio_control_horas', 'observacion_seguimiento_envio_control_horas'), // Observaciones de seguimiento de envío control de horas
      anxo_seguimiento_envio_control_horas: pick('anxo_seguimiento_envio_control_horas', 'adjunto_seguimiento_envio_control_horas'), // Adjunto de seguimiento de envío control de horas
      control_horas: controlHorasTieneDatos(formData.control_horas) ? formData.control_horas : undefined,

      // Valores numéricos - USAR NOMBRES EXACTOS DEL SCHEMA (snake_case)
      dias_transcrrdo: pick('dias_transcrrdo', 'diasTranscrrdo'),
      vlor_resrva: pick('vlor_resrva', 'vlorResrva'),
      vlor_reclmo: pick('vlor_reclmo', 'vlorReclmo'),
      monto_indmzar: pick('monto_indmzar', 'montoIndmzar'),
      vlor_servcios: pick('vlor_servcios', 'vlorServcios', 'valor_servicio'),
      vlor_gastos: pick('vlor_gastos', 'vlorGastos', 'valor_gastos'),
      total: formData.total,
      total_general: pick('total_general', 'totalGeneral'),
      total_pagado: pick('total_pagado', 'totalPagado'),
      iva: formData.iva,
      reteiva: formData.reteiva,
      retefuente: formData.retefuente,
      reteica: formData.reteica,
      porc_iva: pick('porc_iva', 'porcIva'),
      porc_reteiva: pick('porc_reteiva', 'porcReteiva'),
      porc_retefuente: pick('porc_retefuente', 'porcRetefuente'),
      porc_reteica: pick('porc_reteica', 'porcReteica'),

      // Facturación y honorarios adicionales - mantener compatibilidad pero priorizar snake_case
      nmroFactra: pick('nmroFactra', 'numero_factura'), // Este campo no está en el schema, mantenerlo por compatibilidad
      numeroFactura: pick('numeroFactura', 'numero_factura', 'nmroFactra'),
      valorServicio: pick('valorServicio', 'valor_servicio', 'vlorServcios'),
      valorGastos: pick('valorGastos', 'valor_gastos', 'vlorGastos'),
      fechaFactura: pick('fechaFactura', 'fecha_factura', 'fchaFactra'),
      fechaUltimaRevision: pick('fechaUltimaRevision', 'fecha_ultima_revision', 'fchaUltRevi'),
      fechaControlHoras: pick('fechaControlHoras', 'fecha_control_horas', 'fchaControlHoras'),
      observacionCompromisos: pick('observacion_compromisos', 'obseComprmsi', 'obse_comprmsi'),
      observacion_compromisos: pick('observacion_compromisos', 'obseComprmsi', 'obse_comprmsi'),
      observacionesValores: formData.observacionesValores,

      // Observaciones del cliente
      observacionesCliente: formData.observaciones_cliente,
      comentariosServicio: formData.comentarios_servicio,
      sugerenciasMejora: formData.sugerencias_mejora,
      nivelSatisfaccion: formData.nivel_satisfaccion,
      adjuntoObservacionesCliente: formData.adjunto_observaciones_cliente,
      fechaObservacionesCliente: formData.fecha_observaciones_cliente,

      historialDocs:
        Array.isArray(formData.historialDocs) && formData.historialDocs.length > 0
          ? formData.historialDocs
          : undefined,
      plantillaContactoInicial: formData.plantillaContactoInicial
        ? enriquecerPlantillaContactoInicial(
            formData.plantillaContactoInicial,
            formData,
            localStorage.getItem('nombre') || localStorage.getItem('login') || ''
          )
        : undefined,
    };

    // Eliminar claves sin valor definido para evitar sobreescribir con undefined
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    // No persistir fechas de hito con año corrupto (p. ej. 1902 / 0008).
    CAMPOS_FECHA_HORA_PROTOCOLO.forEach((campo) => {
      if (!(campo in payload)) return;
      const limpio = formatearFechaHoraParaInput(payload[campo]);
      if (!limpio) {
        if (payload[campo]) payload[campo] = '';
        return;
      }
      payload[campo] = limpio;
    });

    return payload;
  }, [extraerCodiEstdoParaGuardar]);

  // Handlers para autoguardado
  const handleRestoreData = useCallback(() => {
    if (savedDataToRestore && savedDataToRestore.data) {
      setFormData({
        ...formData,
        ...savedDataToRestore.data,
      });
      consumeDraft(savedDataToRestore.data);
      setShowRestoreDialog(false);
      enableAutoSave();
    }
  }, [savedDataToRestore, enableAutoSave, formData, consumeDraft]);

  const handleDiscardSavedData = useCallback(() => {
    clearSavedData();
    discardDraft();
    setShowRestoreDialog(false);
    setSavedDataToRestore(null);
  }, [clearSavedData, discardDraft]);

  const handleCancelRestore = useCallback(() => {
setShowRestoreDialog(false);
  }, []);

  const handleSubmit = (e, extra = {}) => {
     if (e && e.preventDefault) {
       e.preventDefault();
     }
     const submitter = e?.nativeEvent?.submitter;
     const forceSubmit = extra?.forceSubmit;
     const esSubmitValido = forceSubmit || submitter || e?.type === 'submit';
     if (!esSubmitValido) {
       console.warn('🚫 Evento de submit ignorado (sin contexto válido)', {
         extra,
         evento: e?.type,
         tieneSubmitter: !!submitter
       });
       return;
     }

    // Evitar guardar mientras haya cargas de adjuntos en progreso para no perder documentos.
    const hayAdjuntosSubiendo = Object.values(cargandoAdjuntos || {}).some(Boolean);
    if (hayAdjuntosSubiendo) {
      alert(t('complex.ui.formulario_caso_complex.docs_en_carga'));
      return;
    }
     
    // Capturar valores actuales de los textareas antes de guardar
    // Esto asegura que los comentarios se guarden incluso si el usuario no hizo clic fuera del campo
    const camposTextareas = [
      'descSinstro', // Descripción del Siniestro (Datos Generales)
      'descripcionEstado', // Descripción del Estado
      'observacionesPendientes', // Observaciones Pendientes
      'obseContIni',
      'obseInspccion',
      'obseSoliDocu',
      'obseInfoPrelm',
      'obseInfoFnal',
      'obseRepoActi',
      'obsePresentacionCifras',
      'obseEnvioFiniquito',
      'observacion_compromisos', // Observaciones y Compromisos (Facturación)
      'observacion_seguimiento_envio_control_horas' // Observaciones de Seguimiento de Envío Control de Horas
    ];
     
    const formDataConTextareas = { ...formData };
    const codigoEstado = resolverEstadoParaSelect(formDataConTextareas, estados);
    if (!codigoEstado) {
      alert(t('complex.ui.formulario_caso_complex.estado_obligatorio'));
      setTabActiva('datosGenerales');
      return;
    }
    formDataConTextareas.estado = codigoEstado;
    formDataConTextareas.codiEstdo = codigoEstado;

    camposTextareas.forEach(campo => {
      const textarea = document.querySelector(`textarea[name="${campo}"]`);
      if (textarea && textarea.value !== undefined) {
        formDataConTextareas[campo] = textarea.value;
      }
    });
    
if (!onSave) {
       alert(t('complex.ui.formulario_caso_complex.guardar_sin_accion'));
       return;
     }
    const payload = { ...mapFormDataToBackend(formDataConTextareas), ...extra };
// Ejecutar onSave y limpiar autoguardado después de éxito
    try {
      const result = onSave(payload);
      
      // Si onSave devuelve una promesa, esperar a que se resuelva
      if (result && typeof result.then === 'function') {
        result.then(() => {
          fechasHitoEditadasRef.current.clear();
          clearSavedData();
          discardDraft();
        }).catch((error) => {
          console.error('❌ Error al guardar, manteniendo autoguardado:', error);
        });
      } else {
        // Si no es una promesa, limpiar inmediatamente
        fechasHitoEditadasRef.current.clear();
        clearSavedData();
        discardDraft();
      }
    } catch (error) {
      console.error('❌ Error en handleSubmit:', error);
      // Mantener el autoguardado en caso de error
    }
   };

  const formatDateForRiesgo = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && value.length >= 10) {
      return value.slice(0, 10);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  };

  const handleEnviarARiesgos = () => {
    const riesgoPayload = {
      nmroRiesgo: formData.nmroSinstro || formData.nmroAjste || '',
      aseguradora: formData.codiAsgrdra || '',
      asegurado: formData.asgrBenfcro || '',
      direccion: formData.codDireccion || formData.direccion || '',
      fechaAsignacion: formatDateForRiesgo(formData.fchaAsgncion),
      fechaInspeccion: formatDateForRiesgo(formData.fchaInspccion),
      observaciones: formData.descSinstro || formData.obseSegmnto || '',
      codiEstdo: formData.codiEstdo ? String(formData.codiEstdo) : '',
      responsable: formData.codiRespnsble ? String(formData.codiRespnsble) : '',
      funcionarioAseguradora: formData.funcAsgrdra ? String(formData.funcAsgrdra) : '',
      ciudad: formData.ciudadSiniestro
        ? { value: formData.ciudadSiniestro, label: formData.ciudadSiniestro }
        : null,
    };

    navigate('/riesgos/agregar', {
      state: {
        desdeComplex: true,
        caso: riesgoPayload,
      },
    });
  };

  const prepararPayloadParaComplex = (payload, datosIniciales) => {
     const resultado = { ...payload };
     // Asegurar que el funcionario se mantenga correctamente
     const funcAsgrdraNombre = resultado.funcAsgrdraNombre || datosIniciales?.funcAsgrdraNombre || '';
     const funcionarioAseguradora = resultado.funcionarioAseguradora || datosIniciales?.funcionarioAseguradora || '';
     const funcAsgrdra = resultado.funcAsgrdra || datosIniciales?.funcAsgrdra || '';

     // Si hay un funcionario, asegurarse de que se mantenga
     if (funcAsgrdra && funcAsgrdra !== 'Sin asignar' && funcAsgrdra.toLowerCase() !== 'sin asignar' && funcAsgrdra !== '') {
       resultado.funcAsgrdra = funcAsgrdra;
       
       // Si hay nombre, mantenerlo
       if (funcAsgrdraNombre && funcAsgrdraNombre !== 'Sin asignar' && funcAsgrdraNombre.toLowerCase() !== 'sin asignar') {
         resultado.funcAsgrdraNombre = funcAsgrdraNombre;
         resultado.funcionarioAseguradora = funcAsgrdraNombre;
       } else if (funcionarioAseguradora && funcionarioAseguradora !== 'Sin asignar' && funcionarioAseguradora.toLowerCase() !== 'sin asignar') {
         resultado.funcAsgrdraNombre = funcionarioAseguradora;
         resultado.funcionarioAseguradora = funcionarioAseguradora;
       } else if (!funcAsgrdraNombre && !funcionarioAseguradora) {
         // Si solo hay código pero no nombre, usar el código como nombre
         resultado.funcAsgrdraNombre = funcAsgrdra;
         resultado.funcionarioAseguradora = funcAsgrdra;
       }
     } else if (!funcAsgrdra || funcAsgrdra === '' || funcAsgrdra === 'Sin asignar') {
       // Si no hay funcionario válido, mantener el valor original si existe
       if (datosIniciales?.funcAsgrdra && datosIniciales.funcAsgrdra !== 'Sin asignar') {
         resultado.funcAsgrdra = datosIniciales.funcAsgrdra;
         resultado.funcAsgrdraNombre = datosIniciales.funcAsgrdraNombre || datosIniciales.funcAsgrdra;
         resultado.funcionarioAseguradora = datosIniciales.funcionarioAseguradora || datosIniciales.funcAsgrdraNombre || datosIniciales.funcAsgrdra;
       }
     }

     resultado.vlorResrva = resultado.vlorResrva ?? resultado.vlor_resrva ?? '';
     resultado.vlorReclmo = resultado.vlorReclmo ?? resultado.vlor_reclmo ?? '';
     resultado.montoIndmzar = resultado.montoIndmzar ?? resultado.monto_indmzar ?? '';
     resultado.total = resultado.total ?? '';
     resultado.totalGeneral = resultado.totalGeneral ?? resultado.total_general ?? '';
     resultado.totalPagado = resultado.totalPagado ?? resultado.total_pagado ?? '';
     resultado.porcIva = resultado.porcIva ?? resultado.porc_iva ?? '';
     resultado.porcReteiva = resultado.porcReteiva ?? resultado.porc_reteiva ?? '';
     resultado.porcRetefuente = resultado.porcRetefuente ?? resultado.porc_retefuente ?? '';
     resultado.porcReteica = resultado.porcReteica ?? resultado.porc_reteica ?? '';
     resultado.observacionesValores = resultado.observacionesValores ?? '';

     const numerificar = (valor) => {
       if (valor === '' || valor === null || valor === undefined) return undefined;
       const numero = Number(valor);
       return Number.isNaN(numero) ? undefined : numero;
     };

     const valoresNumericos = {
       vlorResrva: numerificar(resultado.vlorResrva),
       vlorReclmo: numerificar(resultado.vlorReclmo),
       montoIndmzar: numerificar(resultado.montoIndmzar),
       total: numerificar(resultado.total),
       totalGeneral: numerificar(resultado.totalGeneral),
       totalPagado: numerificar(resultado.totalPagado),
       porcIva: numerificar(resultado.porcIva),
       porcReteiva: numerificar(resultado.porcReteiva),
       porcRetefuente: numerificar(resultado.porcRetefuente),
       porcReteica: numerificar(resultado.porcReteica),
     };

     Object.entries(valoresNumericos).forEach(([clave, valor]) => {
       const snakeKey = clave.replace(/([A-Z])/g, '_$1').toLowerCase();
       if (valor === undefined) {
         delete resultado[clave];
         delete resultado[snakeKey];
       } else {
         resultado[clave] = valor;
         resultado[snakeKey] = valor;
       }
     });

     const sincronizarCamelSnakeCampos = (obj, campos) => {
       campos.forEach((campo) => {
         const snakeKey = campo.replace(/([A-Z])/g, '_$1').toLowerCase();
         const tieneCamel = Object.prototype.hasOwnProperty.call(obj, campo);
         const tieneSnake = Object.prototype.hasOwnProperty.call(obj, snakeKey);
         if (tieneCamel && !tieneSnake) {
           obj[snakeKey] = obj[campo];
         } else if (!tieneCamel && tieneSnake) {
           obj[campo] = obj[snakeKey];
         }
       });
     };

    const camposTrazabilidad = [
       'fchaContIni',
       'obseContIni',
       'anexContIni',
       'fchaInspccion',
       'obseInspccion',
       'anexActaInspccion',
       'fchaSoliDocu',
       'obseSoliDocu',
       'anexSolDoc',
       'fchaInfoPrelm',
       'obseInfoPrelm',
       'anxoInfPrelim',
       'fchaInfoFnal',
       'obseInfoFnal',
       'anxoInfoFnal',
      'fchaRepoActi',
      'obseRepoActi',
      'anxoRepoActi',
      'fchaPresentacionCifras',
      'fchaAceptacionCifrasAseguradora',
      'fchaReconsideracion',
      'obsePresentacionCifras',
      'anxoPresentacionCifras',
      'fchaEnvioFiniquito',
      'obseEnvioFiniquito',
      'anxoEnvioFiniquito',
      'fchaUltSegui',
       'fchaActSegui',
       'obseSegmnto',
       'obseComprmsi',
       'anxoFactra',
       'anxoHonorarios',
       'anxoHonorariosdefinit',
       'anxoAutorizacion',
     ];

     const camposFacturacionHonorarios = [
       'numeroFactura',
       'valorServicio',
       'valorGastos',
       'fechaFactura',
       'fechaUltimaRevision',
       'fechaControlHoras',
       'fechaEnvioControlHoras',
       'fechaRecibidoControlHoras',
       'observacionCompromisos',
       'obseComprmsi',
       'observacionesValores',
     ];

     const camposObservacionesCliente = [
       'observacionesCliente',
       'comentariosServicio',
       'sugerenciasMejora',
       'nivelSatisfaccion',
       'adjuntoObservacionesCliente',
       'fechaObservacionesCliente',
     ];

     sincronizarCamelSnakeCampos(resultado, [
       ...Object.keys(valoresNumericos),
       ...camposTrazabilidad,
       ...camposFacturacionHonorarios,
       ...camposObservacionesCliente,
     ]);
 
     delete resultado.nombreResponsable;
     delete resultado.funcAsgrdraNombre;
     delete resultado.funcionarioAseguradora;

     if (!controlHorasTieneDatos(resultado.control_horas) && controlHorasTieneDatos(datosIniciales?.control_horas)) {
       resultado.control_horas = datosIniciales.control_horas;
     } else if (!controlHorasTieneDatos(resultado.control_horas)) {
       delete resultado.control_horas;
     }

     if (Array.isArray(resultado.historialDocs) && resultado.historialDocs.length === 0) {
       delete resultado.historialDocs;
     }
 
     return resultado;
  };

  const SERVER_AUTOSAVE_DEBOUNCE_MS = 1200;

  const guardarEnServidor = useCallback(async () => {
    const casoId = formDataAutoSaveRef.current._id || initialData?._id || id;
    if (!autoguardadoEfectivo || !casoId || !casoListoParaAutoGuardar) return;
    if (autoGuardandoServidorRef.current) return;
    if (aplicandoDesdeServidorRef.current) return;
    if (Object.values(cargandoAdjuntos || {}).some(Boolean)) return;

    if (!isBrowserOnline()) {
      saveNow({ force: true });
      autoSaveService.setPendingServerSync(autoSaveKey, true);
      setPendingServerSync(true);
      return;
    }

    autoGuardandoServidorRef.current = true;
    markSyncing();
    try {
      const payload = mapFormDataToBackend(formDataAutoSaveRef.current);
      const datosBase = datosInicialesAutoSaveRef.current || initialData || {};
      let respuestaServidor = null;

      if (onAutoSave) {
        respuestaServidor = await onAutoSave(payload, { datosBase });
      } else {
        const normalizado = prepararPayloadParaComplex(payload, datosBase);
        respuestaServidor = await actualizarCasoPorServicio(casoId, normalizado);
      }

      if (respuestaServidor === false || respuestaServidor?.error) {
        throw new Error(t('complex.ui.formulario_caso_complex.autoguardado_rechazado'));
      }

      fechasHitoEditadasRef.current.clear();

      if (respuestaServidor && typeof respuestaServidor === 'object') {
        datosInicialesAutoSaveRef.current = {
          ...(datosInicialesAutoSaveRef.current || {}),
          ...respuestaServidor,
          control_horas:
            respuestaServidor.control_horas ??
            datosInicialesAutoSaveRef.current?.control_horas,
        };
      }

      notifyFormServerSaved(autoSaveKey, casoId);
      autoSaveService.clearPendingServerSync(autoSaveKey);
      setPendingServerSync(false);
      markSynced();
    } catch (error) {
      console.warn('[auto-guardado servidor]', error);
      if (!isBrowserOnline()) {
        saveNow({ force: true });
        autoSaveService.setPendingServerSync(autoSaveKey, true);
        setPendingServerSync(true);
      } else {
        markSyncError();
      }
    } finally {
      autoGuardandoServidorRef.current = false;
    }
  }, [
    autoguardadoEfectivo,
    autoSaveKey,
    initialData,
    id,
    onAutoSave,
    casoListoParaAutoGuardar,
    cargandoAdjuntos,
    saveNow,
    markSyncing,
    markSynced,
    markSyncError,
    mapFormDataToBackend,
    t,
  ]);

  const omitirServidorTrasCargaRef = useRef(true);

  useEffect(() => {
    if (casoListoParaAutoGuardar) {
      omitirServidorTrasCargaRef.current = true;
    }
  }, [casoListoParaAutoGuardar]);

  // Registro offline / reconexión + respaldo cada 5 min
  useEffect(() => {
    const casoId = formData._id || initialData?._id || id;
    if (!autoguardadoEfectivo || !casoId || !casoListoParaAutoGuardar) return undefined;

    registerOfflineSyncHandler(autoSaveKey, guardarEnServidor);
    window.addEventListener('online', guardarEnServidor);

    const timer = setInterval(guardarEnServidor, 300000);

    return () => {
      unregisterOfflineSyncHandler(autoSaveKey);
      window.removeEventListener('online', guardarEnServidor);
      clearInterval(timer);
    };
  }, [
    autoguardadoEfectivo,
    autoSaveKey,
    formData._id,
    initialData,
    id,
    casoListoParaAutoGuardar,
    guardarEnServidor,
  ]);

  // Servidor: cada cambio del formulario (debounce ~1.2 s), estilo Word/OneDrive
  useEffect(() => {
    const casoId = formData._id || initialData?._id || id;
    if (!autoguardadoEfectivo || !casoId || !casoListoParaAutoGuardar) return undefined;

    if (omitirServidorTrasCargaRef.current) {
      omitirServidorTrasCargaRef.current = false;
      return undefined;
    }

    if (aplicandoDesdeServidorRef.current) return undefined;

    const timer = setTimeout(() => {
      guardarEnServidor();
    }, SERVER_AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    formData,
    autoguardadoEfectivo,
    initialData,
    id,
    casoListoParaAutoGuardar,
    guardarEnServidor,
  ]);

  useEffect(() => {
    setPendingServerSync(autoSaveService.hasPendingServerSync(autoSaveKey));
  }, [autoSaveKey, isOnline]);

  // Otra ventana guardó el mismo caso → recargar desde servidor si no hay edición activa
  useEffect(() => {
    const casoId = formData._id || initialData?._id || id;
    if (!casoId || !autoguardadoEfectivo) return undefined;

    const recargarSiCorresponde = () => {
      if (autoGuardandoServidorRef.current) return;
      const idleMs = Date.now() - ultimaEdicionUsuarioRef.current;
      if (idleMs >= 5000) {
        setForceReloadCaso((n) => n + 1);
        setHayActualizacionRemota(false);
      } else {
        setHayActualizacionRemota(true);
      }
    };

    const unsubscribe = subscribeFormServerSaved(autoSaveKey, recargarSiCorresponde);

    const onFocus = () => {
      if (hayActualizacionRemota) {
        recargarSiCorresponde();
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [autoSaveKey, autoguardadoEfectivo, formData._id, initialData?._id, id, hayActualizacionRemota]);

  const handleMoverASura = async () => {
    if (moviendoASura || esSura) return;
    const casoId = formData._id || initialData?._id || id;
    if (!casoId) {
      alert(t('complex.ui.formulario_caso_complex.mover_sura_sin_id'));
      return;
    }
    if (Object.values(cargandoAdjuntos || {}).some(Boolean)) {
      alert(t('complex.ui.formulario_caso_complex.docs_en_carga'));
      return;
    }

    setMoviendoASura(true);
    try {
      const payload = mapFormDataToBackend(formData);
      const datosBase = initialData || {};
      const normalizado = prepararPayloadParaComplex(payload, datosBase);

      try {
        await actualizarCasoPorServicio(casoId, normalizado);
      } catch (errorGuardar) {
        console.warn('No se pudo guardar el caso Complex antes de enviarlo a SURA:', errorGuardar);
      }

      const resultado = await moverCasoComplexASura(casoId, normalizado);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      const consecutivo = resultado?.consecutivo || resultado?.data?.consecutivo || '';
      const mensaje = t('complex.ui.formulario_caso_complex.mover_sura_ok', {
        consecutivo: consecutivo || 'SURA',
      });
      alert(resultado?.advertencia ? `${mensaje}\n\n${resultado.advertencia}` : mensaje);
      navigate('/sura/reporte', { replace: true });
    } catch (error) {
      console.error('Error enviando caso Complex a SURA:', error);
      alert(error?.message || t('complex.ui.formulario_caso_complex.mover_sura_error'));
    } finally {
      setMoviendoASura(false);
    }
  };

  return (
    <>
    <div className={complexFormRoot}>
      <form onSubmit={handleSubmit} className={`${complexScope} ${complexFormShell}`} noValidate>
        <ComplexFormTabs tabs={FORM_TABS} activeId={tabActiva} onChange={setTabActiva} />
        <ComplexFormActions
          onCancel={onCancel || (() => {})}
          onEnviarRiesgos={esSura ? undefined : handleEnviarARiesgos}
          onMoverASura={
            !esSura && (formData._id || initialData?._id || id)
              ? handleMoverASura
              : undefined
          }
          moviendoASura={moviendoASura}
        />
        <div className="min-w-0">
        {tabActiva === 'datosGenerales' && (
      <DatosGenerales
        formData={formData}
        handleChange={handleChange}
            handleAseguradoraChange={handleAseguradoraChange}
            handleCiudadChange={handleCiudadChange}
            municipios={ciudades}
        cargandoMunicipios={cargandoCiudades}
        aseguradoraOptions={aseguradoraOptions}
        funcionarios={funcionarios}
        cargandoFuncionarios={cargandoFuncionarios}
            responsables={responsables}
            estados={estados}
            hayResponsables={responsables && responsables.length > 0}
        intermediarios={intermediariosOptions}
        onFuncionarioChange={handleFuncionarioChange}
        onResponsableChange={handleResponsableChange}
        camposFijos={camposFijos}
        aseguradoraFija={esSura}
        mostrarAsignacionCatastrofico={esSura}
        lideresAsignacion={lideresAsignacion}
        ajustadoresCatastrofico={ajustadoresCatFiltrados}
        inspectoresCatastrofico={inspectoresCatFiltrados}
      />
        )}
        {tabActiva === 'valores' && (
          <ValoresPrestaciones
            formData={formData}
            handleChange={handleChange}
            // ...pasa aquí las props necesarias
          />
        )}
        {tabActiva === 'trazabilidad' && esSura && (
          <FechasTrazabilidadSura formData={formData} handleChange={handleChange} />
        )}
        {tabActiva === 'trazabilidad' && !esSura && (
          <Trazabilidad
            formData={formData}
            handleChange={handleChange}
            onPlantillaContactoChange={handlePlantillaContactoChange}
            onSelectFiles={handleDocumentDrop}
            historialDocs={formData.historialDocs}
            updateHistorialDocs={updateHistorialDocs}
            construirUrlArchivo={construirUrlArchivo}
            resolverUrlArchivoAsync={resolverUrlArchivoAsync}
            cargandoAdjuntos={cargandoAdjuntos}
            errorAdjuntos={errorAdjuntos}
          />
        )}
        {tabActiva === 'seguimiento' && !esSura && (
          <Seguimiento
            formData={formData}
            handleChange={handleChange}
            onSelectFiles={handleDocumentDrop}
            historialDocs={formData.historialDocs}
            updateHistorialDocs={updateHistorialDocs}
            cargandoAdjuntos={cargandoAdjuntos}
            errorAdjuntos={errorAdjuntos}
          />
        )}
        {tabActiva === 'observacionesPendientes' && !esSura && (
          <ObservacionesPendientes
            formData={formData}
            handleChange={handleChange}
            onSelectFiles={handleDocumentDrop}
            historialDocs={formData.historialDocs}
            updateHistorialDocs={updateHistorialDocs}
            cargandoAdjuntos={cargandoAdjuntos}
            errorAdjuntos={errorAdjuntos}
          />
        )}
        {tabActiva === 'facturacion' && (
          <Facturacion
            formData={formData}
            setFormData={setFormData}
            nombreAseguradora={nombreAseguradoraFacturacion}
            handleChange={handleChange}
            getRootPropsFactura={dropzonePropsFactura.getRootProps}
            getInputPropsFactura={dropzonePropsFactura.getInputProps}
            isDragActiveFactura={dropzonePropsFactura.isDragActive}
            getRootPropsControlHoras={dropzonePropsControlHoras.getRootProps}
            getInputPropsControlHoras={dropzonePropsControlHoras.getInputProps}
            isDragActiveControlHoras={dropzonePropsControlHoras.isDragActive}
            onEnviarControlHoras={handleEnviarControlHoras}
            onPersistirControlHoras={persistirControlHorasEnServidor}
            getRootPropsEvidencia={dropzonePropsEvidencia.getRootProps}
            getInputPropsEvidencia={dropzonePropsEvidencia.getInputProps}
            isDragActiveEvidencia={dropzonePropsEvidencia.isDragActive}
            getRootPropsSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.getRootProps}
            getInputPropsSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.getInputProps}
            isDragActiveSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.isDragActive}
            onEnviarGerencia={handleEnviarGerencia}
            historialDocs={formData.historialDocs}
            updateHistorialDocs={updateHistorialDocs}
            tarifaBloqueada={esSura}
          />
        )}
        {tabActiva === 'honorarios' && !esSura && (
          <Honorarios
            formData={formData}
            handleChange={handleChange}
            getRootPropsHonorarios={dropzonePropsHonorarios.getRootProps}
            getInputPropsHonorarios={dropzonePropsHonorarios.getInputProps}
            isDragActiveHonorarios={dropzonePropsHonorarios.isDragActive}
          />
        )}
        {tabActiva === 'observaciones' && !esSura && (
          <ObservacionesCliente
            formData={formData}
            handleChange={handleChange}
            getRootPropsObservaciones={dropzonePropsObservaciones.getRootProps}
            getInputPropsObservaciones={dropzonePropsObservaciones.getInputProps}
            isDragActiveObservaciones={dropzonePropsObservaciones.isDragActive}
          />
        )}
        </div>
      </form>
    </div>

      {draftStatus !== 'idle' && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 9998,
            maxWidth: '280px',
            padding: '8px 12px',
            borderRadius: '10px',
            backgroundColor: draftStatus === 'error' ? '#7f1d1d' : '#111827',
            color: '#e5e7eb',
            fontSize: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {draftStatus === 'saving' && t('plataforma.draft.saving')}
          {draftStatus === 'saved' && t('plataforma.draft.saved', {
            time: lastDraftAt
              ? lastDraftAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              : '',
          })}
          {draftStatus === 'error' && t('plataforma.draft.error')}
        </div>
      )}

      <AutoSaveRestoreDialog
        isOpen={showRestoreDialog}
        savedData={savedDataToRestore?.data}
        metadata={savedDataToRestore?.metadata}
        onRestore={handleRestoreData}
        onDiscard={handleDiscardSavedData}
        onCancel={handleCancelRestore}
      />

      {autoguardadoEfectivo && (
        <>
          {hayActualizacionRemota && (
            <div
              role="status"
              style={{
                position: 'fixed',
                bottom: '72px',
                right: '16px',
                zIndex: 9999,
                maxWidth: '320px',
                padding: '10px 14px',
                backgroundColor: '#1e3a5f',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >{t("complex.ui.formulario_caso_complex.otra_ventana_guardo_este_caso")}{' '}
              <button
                type="button"
                onClick={() => setForceReloadCaso((n) => n + 1)}
                style={{
                  marginLeft: '6px',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  color: '#93c5fd',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >{t("complex.ui.formulario_caso_complex.recargar_ahora")}</button>
            </div>
          )}

          <AutoSaveNotification
            isEnabled={isAutoSaveEnabled}
            lastSaveTime={lastSaveTime}
            saveStatus={saveStatus}
            onEnable={enableAutoSave}
            onDisable={disableAutoSave}
            onSaveNow={async () => {
              saveNow();
              await flushOfflineSyncHandler(autoSaveKey);
            }}
            hasUnsavedChanges={false}
            showEnablePrompt={false}
            onDismissPrompt={() => {}}
            pendingServerSync={pendingServerSync}
            isOnline={isOnline}
          />
        </>
      )}
    </>
  );
}
