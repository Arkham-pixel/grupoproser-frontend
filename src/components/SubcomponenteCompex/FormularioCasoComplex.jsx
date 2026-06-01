import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import DatosGenerales from './DatosGenerales';
import Trazabilidad from './Trazabilidad';
import ValoresPrestaciones from './ValoresPrestaciones';
import Seguimiento from './Seguimiento';
import Facturacion from './Facturacion';
import Honorarios from './Honorarios';
import ObservacionesCliente from './ObservacionesCliente';
import ObservacionesPendientes from './ObservacionesPendientes';
import { BASE_URL } from '../../config/apiConfig.js';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
  complexFormRoot,
  complexFormShell,
  complexScope,
} from './complexFenixUi';
import { ComplexFormActions, ComplexFormTabs } from './FacturacionHelpers';
import AutoSaveNotification from '../AutoSave/AutoSaveNotification';
import AutoSaveRestoreDialog from '../AutoSave/AutoSaveRestoreDialog';
import { getCasoComplex } from '../../services/complexService.js';
import { calcularTotalesControlHoras } from './controlHoras/controlHorasUtils';

export default function FormularioCasoComplex({ initialData, onSave, onCancel, camposFijos = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [tabActiva, setTabActiva] = useState('datosGenerales');

  const FORM_TABS = [
    { id: 'datosGenerales', label: 'Datos Generales' },
    { id: 'valores', label: 'Valores y Prestaciones' },
    { id: 'trazabilidad', label: 'Trazabilidad' },
    { id: 'facturacion', label: 'Facturación' },
    { id: 'honorarios', label: 'Honorarios' },
    { id: 'seguimiento', label: 'Seguimiento' },
    { id: 'observacionesPendientes', label: 'Observaciones Pendientes' },
    { id: 'observaciones', label: 'Observaciones Clientes' },
  ];
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
    nombreResponsable: '',
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

    // ...otros campos existentes...
    historialDocs: [],
    control_horas: null,
  });

  const [estados, setEstados] = useState([]);

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
      console.log('🔧 [formatearFechaParaInput] Fecha vacía o null');
      return '';
    }
    
    console.log('🔧 [formatearFechaParaInput] Procesando fecha:', { fecha, tipo: typeof fecha, esDate: fecha instanceof Date });
    
    if (typeof fecha === 'string' && fecha.includes('T')) {
      // Si es formato ISO, extraer solo la parte de la fecha
      const fechaFormateada = fecha.split('T')[0];
      console.log('🔧 [formatearFechaParaInput] Fecha ISO formateada:', fecha, '->', fechaFormateada);
      return fechaFormateada;
    }
    if (fecha instanceof Date) {
      // Si es un objeto Date, convertir a yyyy-MM-dd
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const fechaFormateada = `${year}-${month}-${day}`;
      console.log('🔧 [formatearFechaParaInput] Fecha Date formateada:', fechaFormateada);
      return fechaFormateada;
    }
    // Si ya está en formato yyyy-MM-dd, devolverlo tal cual
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      console.log('🔧 [formatearFechaParaInput] Fecha ya en formato correcto:', fecha);
      return fecha;
    }
    // Si viene en formato dd/MM/yyyy (común en listados/reportes), convertir a yyyy-MM-dd
    if (typeof fecha === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
      const [day, month, year] = fecha.split('/');
      const fechaFormateada = `${year}-${month}-${day}`;
      console.log('🔧 [formatearFechaParaInput] Fecha dd/MM/yyyy convertida:', fecha, '->', fechaFormateada);
      return fechaFormateada;
    }
    console.log('⚠️ [formatearFechaParaInput] Fecha no reconocida, retornando vacío:', fecha);
    return '';
  }, []);

  const ordenarStrings = useCallback((lista = []) => {
    return [...lista].sort((a, b) =>
      a.toString().localeCompare(b.toString(), 'es', { sensitivity: 'base' })
    );
  }, []);

  const construirUrlArchivo = useCallback((valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('http') || valor.startsWith('data:')) {
      return valor;
    }
    const base = (BASE_URL || '').replace(/\/$/, '');
    const path = valor.startsWith('/') ? valor : `/${valor}`;
    return `${base}${path}`;
  }, []);

  const normalizarHistorialDocs = useCallback((docs = []) => {
    if (!Array.isArray(docs)) return [];
    return docs.map((doc) => {
      if (!doc || typeof doc !== 'object') return doc;
      const urlOriginal = doc.url || doc.ruta || doc.path || doc.data || '';
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
    console.log('🔄 [useEffect] Ejecutando carga de datos desde initialData:', {
      tieneInitialData: !!initialData,
      tieneId: !!(initialData?._id),
      fchaInfoPrelm: initialData?.fchaInfoPrelm,
      fcha_info_prelm: initialData?.fcha_info_prelm,
      'initialData completo': initialData
    });
    
    if (initialData && initialData._id) {
      const normalizados = { ...initialData };
      const equivalencias = {
        ciudadSiniestro: ['ciudadSiniestro', 'ciudad_siniestro'],
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
      console.log('📅 [Cargar datos] Fechas en initialData:', {
        fchaInfoPrelm: initialData.fchaInfoPrelm,
        fcha_info_prelm: initialData.fcha_info_prelm,
        fchaInfoFnal: initialData.fchaInfoFnal,
        fcha_info_fnal: initialData.fcha_info_fnal,
        fchaSoliDocu: initialData.fchaSoliDocu,
        fcha_soli_docu: initialData.fcha_soli_docu,
        fchaRepoActi: initialData.fchaRepoActi,
        fcha_repo_acti: initialData.fcha_repo_acti
      });
      console.log('📅 [Cargar datos] Fechas en normalizados:', {
        fchaInfoPrelm: normalizados.fchaInfoPrelm,
        fchaInfoFnal: normalizados.fchaInfoFnal,
        fchaSoliDocu: normalizados.fchaSoliDocu,
        fchaRepoActi: normalizados.fchaRepoActi
      });

      setFormData(prev => {
        // Obtener fechas directamente de initialData (prioridad: camelCase > snake_case)
        // Esto asegura que siempre obtengamos la fecha correcta, incluso si viene en formato ISO
        const fchaInfoPrelmRaw = initialData.fchaInfoPrelm || initialData.fcha_info_prelm || normalizados.fchaInfoPrelm;
        const fchaInfoFnalRaw = initialData.fchaInfoFnal || initialData.fcha_info_fnal || normalizados.fchaInfoFnal;
        const fchaSoliDocuRaw = initialData.fchaSoliDocu || initialData.fcha_soli_docu || normalizados.fchaSoliDocu;
        const fchaRepoActiRaw = initialData.fchaRepoActi || initialData.fcha_repo_acti || normalizados.fchaRepoActi;
        const fchaPresentacionCifrasRaw = initialData.fchaPresentacionCifras || initialData.fcha_presentacion_cifras || normalizados.fchaPresentacionCifras;
        const fchaAceptacionCifrasAseguradoraRaw = initialData.fchaAceptacionCifrasAseguradora || initialData.fcha_aceptacion_cifras_aseguradora || normalizados.fchaAceptacionCifrasAseguradora;
        const fchaEnvioFiniquitoRaw = initialData.fchaEnvioFiniquito || initialData.fcha_envio_finiquito || normalizados.fchaEnvioFiniquito;
        const fchaCoordInspeccionRaw = initialData.fchaCoordInspeccion || initialData.fcha_coord_inspeccion || normalizados.fchaCoordInspeccion;
        const fchaProgInspeccionRaw = initialData.fchaProgInspeccion || initialData.fcha_prog_inspeccion || normalizados.fchaProgInspeccion;
        const fchaControlHorasRaw = initialData.fchaControlHoras || initialData.fcha_control_horas || initialData.fecha_control_horas || normalizados.fchaControlHoras;
        const fchaEnvioControlHorasRaw = initialData.fchaEnvioControlHoras || initialData.fcha_envio_control_horas || initialData.fecha_envio_control_horas || normalizados.fchaEnvioControlHoras;
        const fchaRecibidoControlHorasRaw = initialData.fchaRecibidoControlHoras || initialData.fcha_recibido_control_horas || initialData.fecha_recibido_control_horas || normalizados.fchaRecibidoControlHoras;
        const fchaSeguimientoEnvioControlHorasRaw = initialData.fchaSeguimientoEnvioControlHoras || initialData.fcha_seguimiento_envio_control_horas || initialData.fecha_seguimiento_envio_control_horas || normalizados.fchaSeguimientoEnvioControlHoras;
        
        console.log('📅 [Cargar datos] Fechas raw antes de formatear:', {
          fchaInfoPrelm: fchaInfoPrelmRaw,
          fchaInfoFnal: fchaInfoFnalRaw,
          fchaSoliDocu: fchaSoliDocuRaw,
          fchaRepoActi: fchaRepoActiRaw,
          fchaPresentacionCifras: fchaPresentacionCifrasRaw,
          fchaAceptacionCifrasAseguradora: fchaAceptacionCifrasAseguradoraRaw,
          fchaEnvioFiniquito: fchaEnvioFiniquitoRaw,
          fchaControlHoras: fchaControlHorasRaw,
          fchaEnvioControlHoras: fchaEnvioControlHorasRaw,
          'initialData.fcha_envio_control_horas': initialData.fcha_envio_control_horas,
          'normalizados.fchaEnvioControlHoras': normalizados.fchaEnvioControlHoras
        });
        
        // Formatear las fechas ANTES de crear nuevoFormData
        const fchaInfoPrelmFormateada = formatearFechaParaInput(fchaInfoPrelmRaw);
        const fchaInfoFnalFormateada = formatearFechaParaInput(fchaInfoFnalRaw);
        const fchaSoliDocuFormateada = formatearFechaParaInput(fchaSoliDocuRaw);
        const fchaRepoActiFormateada = formatearFechaParaInput(fchaRepoActiRaw);
        const fchaPresentacionCifrasFormateada = formatearFechaParaInput(fchaPresentacionCifrasRaw);
        const fchaAceptacionCifrasAseguradoraFormateada = formatearFechaParaInput(fchaAceptacionCifrasAseguradoraRaw);
        const fchaEnvioFiniquitoFormateada = formatearFechaParaInput(fchaEnvioFiniquitoRaw);
        const fchaCoordInspeccionFormateada = formatearFechaParaInput(fchaCoordInspeccionRaw);
        const fchaProgInspeccionFormateada = formatearFechaParaInput(fchaProgInspeccionRaw);
        const fchaControlHorasFormateada = formatearFechaParaInput(fchaControlHorasRaw);
        const fchaEnvioControlHorasFormateada = formatearFechaParaInput(fchaEnvioControlHorasRaw);
        const fchaRecibidoControlHorasFormateada = formatearFechaParaInput(fchaRecibidoControlHorasRaw);
        const fchaSeguimientoEnvioControlHorasFormateada = formatearFechaParaInput(fchaSeguimientoEnvioControlHorasRaw);
        
        console.log('📅 [Cargar datos] Fechas formateadas:', {
          fchaInfoPrelm: fchaInfoPrelmFormateada,
          fchaInfoFnal: fchaInfoFnalFormateada,
          fchaSoliDocu: fchaSoliDocuFormateada,
          fchaRepoActi: fchaRepoActiFormateada,
          fchaPresentacionCifras: fchaPresentacionCifrasFormateada,
          fchaAceptacionCifrasAseguradora: fchaAceptacionCifrasAseguradoraFormateada,
          fchaEnvioFiniquito: fchaEnvioFiniquitoFormateada
        });
        
        const nuevoFormData = {
          ...prev,
          ...normalizados,
          _id: initialData._id || initialData.id || prev._id, // Asegurar que _id se incluya
          historialDocs: normalizarHistorialDocs(initialData.historialDocs),
          // IMPORTANTE: Las fechas formateadas deben ir DESPUÉS del spread para sobrescribir las fechas ISO
          // Convertir fechas ISO a formato yyyy-MM-dd para inputs de tipo date
          fchaAsgncion: formatearFechaParaInput(normalizados.fchaAsgncion || initialData.fchaAsgncion),
          fchaSinstro: formatearFechaParaInput(normalizados.fchaSinstro || initialData.fchaSinstro),
          fchaInspccion: formatearFechaParaInput(normalizados.fchaInspccion || initialData.fchaInspccion),
          fchaContIni: formatearFechaParaInput(normalizados.fchaContIni || initialData.fchaContIni),
          // Convertir fechas de trazabilidad a formato yyyy-MM-dd para inputs de tipo date
          // Estas fechas DEBEN sobrescribir las que vienen en normalizados (que están en formato ISO)
          fchaSoliDocu: fchaSoliDocuFormateada,
          fchaInfoPrelm: fchaInfoPrelmFormateada,
          fchaInfoFnal: fchaInfoFnalFormateada,
          fchaRepoActi: fchaRepoActiFormateada,
          fchaPresentacionCifras: fchaPresentacionCifrasFormateada,
          fchaAceptacionCifrasAseguradora: fchaAceptacionCifrasAseguradoraFormateada,
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
          control_horas: initialData.control_horas || normalizados.control_horas || null,
          estado: resolverEstadoParaSelect({ ...initialData, ...normalizados }, estados),
        };
        
        console.log('📅 [Cargar datos] Fechas formateadas después de formatear:', {
          fchaInfoPrelm: nuevoFormData.fchaInfoPrelm,
          fchaInfoFnal: nuevoFormData.fchaInfoFnal,
          fchaSoliDocu: nuevoFormData.fchaSoliDocu,
          fchaRepoActi: nuevoFormData.fchaRepoActi,
          fchaPresentacionCifras: nuevoFormData.fchaPresentacionCifras,
          fchaAceptacionCifrasAseguradora: nuevoFormData.fchaAceptacionCifrasAseguradora,
          fchaEnvioFiniquito: nuevoFormData.fchaEnvioFiniquito
        });
        
        // Verificación final: asegurar que las fechas formateadas no estén vacías si había una fecha raw
        if (fchaInfoPrelmRaw && !nuevoFormData.fchaInfoPrelm) {
          console.warn('⚠️ [Cargar datos] fchaInfoPrelmRaw existe pero formateada está vacía:', {
            raw: fchaInfoPrelmRaw,
            formateada: nuevoFormData.fchaInfoPrelm
          });
          // Intentar formatear manualmente como último recurso
          if (typeof fchaInfoPrelmRaw === 'string' && fchaInfoPrelmRaw.includes('T')) {
            nuevoFormData.fchaInfoPrelm = fchaInfoPrelmRaw.split('T')[0];
            console.log('✅ [Cargar datos] Fecha formateada manualmente:', nuevoFormData.fchaInfoPrelm);
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
        
        console.log('📋 [FormularioCasoComplex] Datos del funcionario cargados:', {
          funcAsgrdra: nuevoFormData.funcAsgrdra,
          funcAsgrdraNombre: nuevoFormData.funcAsgrdraNombre,
          funcionarioAseguradora: nuevoFormData.funcionarioAseguradora,
          initialDataFuncAsgrdra: initialData.funcAsgrdra,
          initialDataFuncAsgrdraNombre: initialData.funcAsgrdraNombre,
          initialDataFuncionarioAseguradora: initialData.funcionarioAseguradora
        });
        
        return nuevoFormData;
      });
      
      // Cargar funcionarios de la aseguradora cuando se carga initialData (modo edición)
      if (normalizados.codiAsgrdra || initialData.codiAsgrdra) {
        const codigoCliente = normalizados.codiAsgrdra || initialData.codiAsgrdra;
        console.log('🔄 [Modo Edición] Cargando funcionarios para aseguradora:', codigoCliente);
        
        fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoCliente}`)
          .then(res => res.json())
          .then(data => {
            const funcionariosData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
            const opciones = funcionariosData
              .map(f => {
                const rawValue = f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? f.nmbrContcto ?? f.nombre ?? '';
                const label = f.nmbrContcto || f.nombre || f.label || '';
                const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
                if (!value || !label) {
                  return null;
                }
                return { value, label };
              })
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
            console.log('✅ [Modo Edición] Funcionarios cargados:', opciones.length);
          })
          .catch(error => {
            console.error('❌ [Modo Edición] Error cargando funcionarios:', error);
          });
      }
    }
  }, [initialData, normalizarHistorialDocs, formatearFechaParaInput, ordenarPorLabel]);

  // Cargar datos frescos del caso desde la API.
  // - Si hay ID en URL (enlace directo), usar ese.
  // - Si estamos en /complex/editar con initialData, recargar por _id para evitar datos truncados del reporte.
  useEffect(() => {
    const cargarCasoPorId = async () => {
      const casoId = id || initialData?._id;
      if (casoId) {
        try {
          console.log('🔍 [Cargar Caso por ID] Cargando caso con ID:', casoId);
          const token = localStorage.getItem('token');
          
          const casoData = await getCasoComplex(casoId);
          console.log('✅ [Cargar Caso por ID] Caso cargado:', casoData);
          
          if (casoData && casoData._id) {
            // Establecer los datos como initialData para que se procesen correctamente
            const normalizados = { ...casoData, origen: 'complex' };
            
            // Aplicar las mismas normalizaciones que se hacen con initialData
            const equivalencias = {
              ciudadSiniestro: ['ciudadSiniestro', 'ciudad_siniestro'],
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
            const fchaInfoPrelmFormateada = formatearFechaParaInput(normalizados.fchaInfoPrelm || casoData.fcha_info_prelm);
            const fchaInfoFnalFormateada = formatearFechaParaInput(normalizados.fchaInfoFnal || casoData.fcha_info_fnal);
            const fchaSoliDocuFormateada = formatearFechaParaInput(normalizados.fchaSoliDocu || casoData.fcha_soli_docu);
            const fchaRepoActiFormateada = formatearFechaParaInput(normalizados.fchaRepoActi || casoData.fcha_repo_acti);
            const fchaPresentacionCifrasFormateada = formatearFechaParaInput(normalizados.fchaPresentacionCifras || casoData.fcha_presentacion_cifras);
            const fchaAceptacionCifrasAseguradoraFormateada = formatearFechaParaInput(normalizados.fchaAceptacionCifrasAseguradora || casoData.fcha_aceptacion_cifras_aseguradora);
            const fchaEnvioFiniquitoFormateada = formatearFechaParaInput(normalizados.fchaEnvioFiniquito || casoData.fcha_envio_finiquito);
            const fchaCoordInspeccionFormateada = formatearFechaParaInput(normalizados.fchaCoordInspeccion || casoData.fcha_coord_inspeccion);
            const fchaProgInspeccionFormateada = formatearFechaParaInput(normalizados.fchaProgInspeccion || casoData.fcha_prog_inspeccion);
            const fchaControlHorasFormateada = formatearFechaParaInput(normalizados.fchaControlHoras || casoData.fcha_control_horas || casoData.fecha_control_horas);
            const fchaEnvioControlHorasFormateada = formatearFechaParaInput(normalizados.fchaEnvioControlHoras || casoData.fcha_envio_control_horas || casoData.fecha_envio_control_horas);
            const fchaRecibidoControlHorasFormateada = formatearFechaParaInput(normalizados.fchaRecibidoControlHoras || casoData.fcha_recibido_control_horas || casoData.fecha_recibido_control_horas);
            const fchaSeguimientoEnvioControlHorasFormateada = formatearFechaParaInput(normalizados.fchaSeguimientoEnvioControlHoras || casoData.fcha_seguimiento_envio_control_horas || casoData.fecha_seguimiento_envio_control_horas);

            setFormData(prev => ({
              ...prev,
              ...normalizados,
              _id: casoData._id || casoData.id || prev._id, // Asegurar que _id se incluya
              historialDocs: normalizarHistorialDocs(casoData.historialDocs),
              fchaAsgncion: formatearFechaParaInput(casoData.fchaAsgncion),
              fchaSinstro: formatearFechaParaInput(casoData.fchaSinstro),
              fchaInspccion: formatearFechaParaInput(casoData.fchaInspccion),
              fchaContIni: formatearFechaParaInput(casoData.fchaContIni),
              fchaSoliDocu: fchaSoliDocuFormateada,
              fchaInfoPrelm: fchaInfoPrelmFormateada,
              fchaInfoFnal: fchaInfoFnalFormateada,
              fchaRepoActi: fchaRepoActiFormateada,
              fchaPresentacionCifras: fchaPresentacionCifrasFormateada,
              fchaAceptacionCifrasAseguradora: fchaAceptacionCifrasAseguradoraFormateada,
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
              control_horas: casoData.control_horas || normalizados.control_horas || null,
              estado: resolverEstadoParaSelect(casoData, estados),
            }));

            // Cargar funcionarios si hay aseguradora
            if (normalizados.codiAsgrdra || casoData.codiAsgrdra) {
              const codigoCliente = normalizados.codiAsgrdra || casoData.codiAsgrdra;
              console.log('🔄 [Cargar Caso por ID] Cargando funcionarios para aseguradora:', codigoCliente);
              
              fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoCliente}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
              })
                .then(res => res.json())
                .then(data => {
                  const funcionariosData = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
                  const opciones = funcionariosData
                    .map(f => {
                      const rawValue = f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? f.nmbrContcto ?? f.nombre ?? '';
                      const label = f.nmbrContcto || f.nombre || f.label || '';
                      const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
                      if (!value || !label) {
                        return null;
                      }
                      return { value, label };
                    })
                    .filter(Boolean);
                  
                  setFuncionarios(ordenarPorLabel(opciones));
                  console.log('✅ [Cargar Caso por ID] Funcionarios cargados:', opciones.length);
                })
                .catch(error => {
                  console.error('❌ [Cargar Caso por ID] Error cargando funcionarios:', error);
                });
            }

            console.log('✅ [Cargar Caso por ID] Caso cargado y formData actualizado');
          } else {
            console.error('❌ [Cargar Caso por ID] El caso no tiene _id válido');
          }
        } catch (error) {
          console.error('❌ [Cargar Caso por ID] Error cargando caso:', error);
          alert('Error al cargar el caso. Por favor, verifica que el caso exista.');
        }
      }
    };

    cargarCasoPorId();
  }, [id, initialData, normalizarHistorialDocs, formatearFechaParaInput, ordenarPorLabel]);

  // Cargar datos desde localStorage al iniciar (solo si no hay ID ni initialData)
  // IMPORTANTE: No cargar si tiene nmroAjste (es un caso ya guardado)
  useEffect(() => {
    if (!id && !initialData) {
      const datosGuardados = localStorage.getItem('formularioComplex');
      if (datosGuardados) {
        try {
          const datosParseados = JSON.parse(datosGuardados);
          // Si tiene nmroAjste, no cargar (es un caso ya guardado, no un borrador)
          if (datosParseados && typeof datosParseados === 'object' && !datosParseados.nmroAjste) {
            setFormData(prev => ({ ...prev, ...datosParseados }));
            console.log('✅ Datos de formulario Complex cargados desde localStorage (sin nmroAjste)');
          } else if (datosParseados?.nmroAjste) {
            // Si tiene nmroAjste, limpiar el localStorage para evitar usar datos de casos guardados
            console.log('🧹 Limpiando localStorage: contiene nmroAjste de caso guardado');
            localStorage.removeItem('formularioComplex');
          }
        } catch (error) {
          console.error('Error al cargar datos guardados:', error);
          localStorage.removeItem('formularioComplex');
        }
      }
    } else if (!id && !initialData) {
      // Si es un caso nuevo, limpiar cualquier dato residual del localStorage
      console.log('🧹 Limpiando localStorage para caso nuevo');
      localStorage.removeItem('formularioComplex');
    }
  }, [id, initialData]);

  // Guardar datos automáticamente cuando cambien (con debounce para evitar guardados excesivos)
  // Solo se guarda si estamos en la ruta del formulario Complex
  // IMPORTANTE: No guardar si tiene nmroAjste (es un caso ya guardado, no un borrador)
  useEffect(() => {
    const esRutaComplex = location.pathname.includes('/complex') || location.pathname.includes('/agregar-caso') || location.pathname.includes('/editar-caso');
    if (!esRutaComplex) return;

    // No guardar en localStorage si tiene nmroAjste (es un caso ya guardado)
    if (formData.nmroAjste && formData.nmroAjste.trim() !== '') {
      return;
    }

    const timeoutId = setTimeout(() => {
      try {
        const datosParaGuardar = JSON.stringify(formData);
        localStorage.setItem('formularioComplex', datosParaGuardar);
        console.log('💾 Datos de formulario Complex guardados en localStorage (sin nmroAjste)');
      } catch (error) {
        console.error('Error al guardar datos:', error);
        try {
          localStorage.removeItem('formularioComplex');
          localStorage.setItem('formularioComplex', JSON.stringify(formData));
        } catch (e) {
          console.error('Error crítico al guardar:', e);
        }
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, location.pathname]);

  // Guardar datos antes de refrescar la página (solo si estamos en el formulario)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const esRutaComplex = window.location.pathname.includes('/complex') || window.location.pathname.includes('/agregar-caso') || window.location.pathname.includes('/editar-caso');
      if (esRutaComplex) {
        try {
          localStorage.setItem('formularioComplex', JSON.stringify(formData));
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
      console.log('🧹 Limpiando datos de localStorage al salir del formulario Complex');
      localStorage.removeItem('formularioComplex');
    }

    return () => {
      setTimeout(() => {
        const sigueEnRutaComplex = window.location.pathname.includes('/complex') || window.location.pathname.includes('/agregar-caso') || window.location.pathname.includes('/editar-caso');
        if (!sigueEnRutaComplex) {
          console.log('🧹 Limpiando datos de localStorage (componente desmontado)');
          localStorage.removeItem('formularioComplex');
        }
      }, 100);
    };
  }, [location.pathname]);

  // Función para actualizar historialDocs dentro de formData
  const updateHistorialDocs = (updater) => {
    setFormData(prev => ({
      ...prev,
      historialDocs: typeof updater === 'function'
        ? normalizarHistorialDocs(updater(prev.historialDocs))
        : normalizarHistorialDocs(updater)
    }));
  };

  // Handler de cambios
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    console.log('📝 [handleChange] Cambio detectado:', { name, value, tipo: typeof value });
    setFormData(prev => {
      const nuevoValor = name === 'estado' ? String(value) : value;
      console.log('📝 [handleChange] Actualizando formData:', { name, valorAnterior: prev[name], valorNuevo: nuevoValor });
      if (name === 'estado') {
        const opcion = estados.find((est) => String(est.value) === String(nuevoValor));
        return {
          ...prev,
          estado: nuevoValor,
          codiEstdo: nuevoValor,
          descripcionEstado: opcion?.label || prev.descripcionEstado,
        };
      }
      return {
        ...prev,
        [name]: nuevoValor
      };
    });
  }, [estados]);

  // Handler para selects especiales (ejemplo: ciudad)
  const handleCiudadChange = (selectedOption) => {
    setFormData(prev => ({ ...prev, ciudadSiniestro: selectedOption?.value || '' }));
  };

  // Handler para aseguradora
  const handleAseguradoraChange = (e) => {
    setFormData(prev => ({
      ...prev,
      codiAsgrdra: e.target.value,
      funcAsgrdra: '',
      funcAsgrdraNombre: ''
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
      funcionarioAseguradora: funcionarioSeleccionado ? funcionarioSeleccionado.label : (prev.funcionarioAseguradora || valorSeleccionado)
    }));
  };

  // Estado para intermediarios (ahora desde la API)
  const [intermediarios, setIntermediarios] = useState([]);
  const [intermediariosOptions, setIntermediariosOptions] = useState([]); // Array de nombres para el dropdown

  const [cargandoAdjuntos, setCargandoAdjuntos] = useState({});
  const [errorAdjuntos, setErrorAdjuntos] = useState({});

  const handleDocumentDrop = useCallback(async (tipoDocumento, campoFormData, acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) {
      return;
    }

    const archivos = Array.from(acceptedFiles);

    console.log('📂 Archivos recibidos para carga:', tipoDocumento, archivos);

    const token = localStorage.getItem('token');
    setErrorAdjuntos(prev => ({ ...prev, [tipoDocumento]: null }));
    setCargandoAdjuntos(prev => ({ ...prev, [tipoDocumento]: true }));

    const resultados = [];
    const errores = [];

    for (const file of archivos) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await fetch(`${BASE_URL}/api/complex/upload`, {
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
        
        console.log(`📝 [handleDocumentDrop] Actualizando ${campoFormData}:`, {
          tipoDocumento,
          valorAnterior,
          nombresArchivos,
          nuevoValor,
          totalArchivos: resultados.length
        });
        
        return {
          ...prev,
          [campoFormData]: nuevoValor
        };
      });
    }

    updateHistorialDocs(prev => {
      const actual = Array.isArray(prev) ? prev : [];
      const nuevosDocs = [...actual, ...resultados];
      console.log(`📚 [handleDocumentDrop] Actualizando historialDocs para ${tipoDocumento}:`, {
        documentosAnteriores: actual.length,
        documentosNuevos: resultados.length,
        totalDocumentos: nuevosDocs.length,
        tiposDocumentos: resultados.map(r => ({ tipo: r.tipo, nombre: r.nombre }))
      });
      return nuevosDocs;
    });

    if (errores.length > 0) {
      setErrorAdjuntos(prev => ({
        ...prev,
        [tipoDocumento]: `No se pudieron subir algunos archivos: ${errores.join(' | ')}`
      }));
    } else {
      console.log(`✅ ${resultados.length} archivo(s) subido(s) para ${tipoDocumento}`, resultados);
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
              await fetch(`${BASE_URL}/api/complex/notificaciones/honorarios`, {
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
  }, [updateHistorialDocs, formData, initialData, construirUrlArchivo]);

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
          if (rutaRelativa && !rutaRelativa.startsWith('/uploads') && !rutaRelativa.startsWith('uploads')) {
            if (rutaRelativa.startsWith('/')) {
              rutaRelativa = rutaRelativa;
            } else {
              rutaRelativa = `/uploads/${rutaRelativa}`;
            }
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
        alert('No se encontraron archivos de evidencia. Por favor, suba los documentos primero.');
        return;
      }

      const numeroCaso = formData.nmroAjste || initialData?.nmroAjste || 'Sin número';
      const numeroSiniestro = formData.nmroSinstro || initialData?.nmroSinstro;
      const responsable = formData.codiRespnsble || initialData?.codiRespnsble;
      const usuario = localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown';
      let casoId = formData._id || initialData?._id || null;

      // Si no hay casoId pero hay número de caso, intentar buscar el caso
      if (!casoId && numeroCaso && numeroCaso !== 'Sin número') {
        try {
          console.log('🔍 [Gerencia] Buscando caso por número de ajuste:', numeroCaso);
          const buscarResponse = await fetch(`${BASE_URL}/api/complex?nmroAjste=${encodeURIComponent(numeroCaso)}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (buscarResponse.ok) {
            const casosData = await buscarResponse.json();
            const casos = Array.isArray(casosData) ? casosData : (casosData.data || []);
            if (casos.length > 0 && casos[0]._id) {
              casoId = casos[0]._id;
              console.log('✅ [Gerencia] Caso encontrado por número de ajuste, ID:', casoId);
            }
          }
        } catch (error) {
          console.error('⚠️ [Gerencia] Error buscando caso por número de ajuste:', error);
        }
      }

      console.log('📧 [Gerencia] Enviando notificación con casoId:', casoId, 'númeroCaso:', numeroCaso);

      const response = await fetch(`${BASE_URL}/api/complex/notificaciones/gerencia`, {
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
        throw new Error('El servidor devolvió una respuesta no válida (no es JSON)');
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
          ? `✅ Notificación enviada a ${nombreGerente}\n📧 ${emailEnviado}`
          : `✅ Notificación enviada exitosamente a ${nombreGerente}`;
        if (resultado.envioRegistrado) {
          mensaje += '\n\n📋 Quedó registrado en la bandeja de facturación del jefe.';
        } else if (resultado.motivoNoRegistro === 'caso_no_encontrado') {
          mensaje +=
            '\n\n⚠️ Guarde el caso en el sistema (con número de ajuste) para que el jefe lo vea en su bandeja.';
        }
        alert(mensaje);
      } else {
        throw new Error(resultado.error || 'Error al enviar la notificación');
      }
    } catch (error) {
      console.error('❌ Error enviando notificación de gerencia:', error);
      alert(`❌ Error al enviar la notificación: ${error.message}`);
      throw error;
    }
  }, [formData, initialData, construirUrlArchivo]);

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
          if (rutaRelativa && !rutaRelativa.startsWith('/uploads') && !rutaRelativa.startsWith('uploads')) {
            if (rutaRelativa.startsWith('/')) {
              rutaRelativa = rutaRelativa;
            } else {
              rutaRelativa = `/uploads/${rutaRelativa}`;
            }
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
        alert(
          'Registre el control de horas en el sistema o suba los documentos antes de enviar la notificación.'
        );
        return;
      }

      const resumenControlHoras = tieneControlHorasEnSistema
        ? calcularTotalesControlHoras(formData.control_horas)
        : null;

      const numeroCaso = formData.nmroAjste || initialData?.nmroAjste || 'Sin número';
      const numeroSiniestro = formData.nmroSinstro || initialData?.nmroSinstro;
      const responsable = formData.codiRespnsble || initialData?.codiRespnsble;
      const usuario = localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown';
      let casoId = formData._id || initialData?._id || null; // ID del caso para el enlace directo

      // Si no hay casoId pero hay número de caso, intentar buscar el caso
      if (!casoId && numeroCaso && numeroCaso !== 'Sin número') {
        try {
          console.log('🔍 Buscando caso por número de ajuste:', numeroCaso);
          const buscarResponse = await fetch(`${BASE_URL}/api/complex?nmroAjste=${encodeURIComponent(numeroCaso)}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (buscarResponse.ok) {
            const casosData = await buscarResponse.json();
            const casos = Array.isArray(casosData) ? casosData : (casosData.data || []);
            if (casos.length > 0 && casos[0]._id) {
              casoId = casos[0]._id;
              console.log('✅ Caso encontrado por número de ajuste, ID:', casoId);
            }
          }
        } catch (error) {
          console.error('⚠️ Error buscando caso por número de ajuste:', error);
        }
      }

      console.log('📧 Enviando notificación con casoId:', casoId, 'númeroCaso:', numeroCaso);

      const response = await fetch(`${BASE_URL}/api/complex/notificaciones/control-horas`, {
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
          ? `✅ Notificación enviada a ${nombreGerente}\n📧 ${emailEnviado}`
          : `✅ Notificación enviada exitosamente a ${nombreGerente}`;
        if (resultado.envioRegistrado) {
          mensaje += '\n\n📋 Quedó registrado en la bandeja de facturación del jefe.';
          if (resultado.resultado?.copia) {
            mensaje += '\n(Copia a facturación también registrada para Adriana.)';
          }
        } else if (resultado.motivoNoRegistro === 'caso_no_encontrado') {
          mensaje +=
            '\n\n⚠️ Guarde el caso en el sistema (con número de ajuste) para que el jefe lo vea en su bandeja.';
        }
        alert(mensaje);
      } else {
        throw new Error(resultado.error || 'Error al enviar la notificación');
      }
            } catch (error) {
      console.error('❌ Error enviando notificación de control de horas:', error);
      alert(`❌ Error al enviar la notificación: ${error.message}`);
      throw error;
    }
  }, [formData, initialData]);

  const createDropzone = (tipoDocumento, campoFormData) =>
    useDropzone({
      multiple: true,
      onDrop: (files) => handleDocumentDrop(tipoDocumento, campoFormData, files)
    });

  // Dropzone para Adjunto Factura
  const dropzonePropsFactura = createDropzone('factura', 'adjunto_factura');

  // Dropzone para Adjunto Honorarios
  const dropzonePropsHonorarios = createDropzone('honorarios', 'adjunto_honorarios');

  // Dropzone para Control de Horas
  const dropzonePropsControlHoras = createDropzone('controlHoras', 'adjunto_control_horas');

  // Dropzone para Adjunto Evidencia (Gerencia)
  const dropzonePropsEvidencia = createDropzone('evidencia', 'adjunto_evidencia');
  const dropzonePropsSeguimientoEvidencia = createDropzone('seguimientoEvidencia', 'adjunto_seguimiento_envio_control_horas');

  // Dropzone para Adjunto Observaciones del Cliente
  const dropzonePropsObservaciones = createDropzone('observacionesCliente', 'adjunto_observaciones_cliente');

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

  // Estados para autoguardado
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState(null);

  // Generar key única para autoguardado (usa ID si existe, sino un key genérico)
  const autoSaveKey = initialData?._id 
    ? `formulario-complex-${initialData._id}` 
    : 'formulario-complex-nuevo';

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
      
      console.log('🔄 [Sincronización] Actualizando adjunto_control_horas desde historialDocs:', nombresArchivos);
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
      console.log('🔄 [Sincronización] Actualizando adjunto_evidencia desde historialDocs:', nombresArchivos);
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
      
      console.log('🔄 [Sincronización] Actualizando adjunto_factura desde historialDocs:', nombresArchivos);
    }
  }, [formData.historialDocs, formData.adjunto_factura]);

  // Sincronizar adjunto_seguimiento_envio_control_horas desde historialDocs
  useEffect(() => {
    const docs = (formData.historialDocs || []).filter(d => d.tipo === 'seguimientoEvidencia' || d.categoria === 'seguimientoEvidencia');
    const nombres = docs.length > 0 ? docs.map(d => d.nombre || d.filename).filter(Boolean).join(', ') : '';
    if (formData.adjunto_seguimiento_envio_control_horas !== nombres) {
      setFormData(prev => prev.adjunto_seguimiento_envio_control_horas === nombres ? prev : { ...prev, adjunto_seguimiento_envio_control_horas: nombres });
      console.log('🔄 [Sincronización] Actualizando adjunto_seguimiento_envio_control_horas:', nombres);
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
    restoreFromStorage,
    hasSavedData,
  } = useAutoSave({
    formKey: autoSaveKey,
    formData: formData,
    enabled: true,
    interval: 30000, // Guardar cada 30 segundos
    excludeFields: ['historialDocs'], // Excluir campos pesados
    onRestore: (savedInfo) => {
      // Cuando hay datos guardados, mostrar el diálogo
      console.log('📦 Datos guardados encontrados, mostrando diálogo de restauración');
      setSavedDataToRestore(savedInfo);
      setShowRestoreDialog(true);
    },
  });

  // Activar autoguardado automáticamente en formularios nuevos
  useEffect(() => {
    if (!initialData?._id && !isAutoSaveEnabled) {
      console.log('🟢 Activando autoguardado automáticamente');
      enableAutoSave();
    }
  }, [initialData, isAutoSaveEnabled, enableAutoSave]);

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
      console.log('⏭️ [Cargar Funcionarios - Cambio Aseguradora] Modo edición detectado, saltando carga automática');
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

    console.log('🔍 [Cargar Funcionarios - Cambio Aseguradora] Cargando funcionarios para cliente:', codigoCliente);

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
          .map(f => {
            const rawValue = f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? f.nmbrContcto ?? f.nombre ?? '';
            const label = f.nmbrContcto || f.nombre || f.label || '';
            const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
            if (!value || !label) {
              return null;
            }
            return { value, label };
          })
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
  }, [formData.codiAsgrdra, aseguradoraOptionsRaw, initialData]);

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
      console.log('⏭️ [Campos Fijos - Complemento] Saltando búsqueda de funcionario - código inválido:', codigoFuncionario);
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
        console.log('✅ [Campos Fijos - Complemento] Funcionario encontrado en lista existente:', funcionarioEncontrado.label);
        setFormData(prev => ({
          ...prev,
          funcAsgrdraNombre: funcionarioEncontrado.label,
          funcionarioAseguradora: funcionarioEncontrado.label
        }));
        return;
      }
    }

    const codigoCliente = formData.codiAsgrdra;
    
    console.log('🔍 [Campos Fijos - Complemento] Buscando funcionario en BD (complemento):', { codigoCliente, codigoFuncionario });
    
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
            console.log('✅ [Campos Fijos - Complemento] Funcionario encontrado en BD:', nombreFuncionario);
            setFormData(prev => ({
              ...prev,
              funcAsgrdraNombre: nombreFuncionario,
              funcionarioAseguradora: nombreFuncionario
            }));
            
            // También actualizar la lista de funcionarios solo si está vacía
            if (funcionarios.length === 0) {
              const opciones = funcionariosData
                .map(f => {
                  const rawValue = f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? f.nmbrContcto ?? f.nombre ?? '';
                  const label = f.nmbrContcto || f.nombre || f.label || '';
                  const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
                  if (!value || !label) {
                    return null;
                  }
                  return { value, label };
                })
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
  }, [camposFijos, formData.codiAsgrdra, formData.funcAsgrdra, formData.funcAsgrdraNombre, funcionarios.length, ordenarPorLabel]);

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
        console.log('✅ [Sincronización Funcionario] Encontrado por valor:', {
          currentValue,
          currentNombre,
          encontrado: matchByValue.label
        });
        return { 
          ...prev, 
          funcAsgrdra: String(matchByValue.value), 
          funcAsgrdraNombre: matchByValue.label,
          funcionarioAseguradora: matchByValue.label
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
        console.log('✅ [Sincronización Funcionario] Encontrado por label:', {
          currentValue,
          currentNombre,
          encontrado: matchByLabel.label
        });
        return { 
          ...prev, 
          funcAsgrdra: String(matchByLabel.value), 
          funcAsgrdraNombre: matchByLabel.label,
          funcionarioAseguradora: matchByLabel.label
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
          console.log('✅ [Sincronización Funcionario] Encontrado por nombre (case-insensitive):', {
            currentValue,
            currentNombre,
            encontrado: matchByNombre.label
          });
          return { 
            ...prev, 
            funcAsgrdra: String(matchByNombre.value), 
            funcAsgrdraNombre: matchByNombre.label,
            funcionarioAseguradora: matchByNombre.label
          };
        }
      }
      
      // Si no se encuentra pero hay un nombre válido, mantener el valor actual
      // Esto permite que el funcionario se mantenga aunque no esté en la lista
      if (currentNombre && currentNombre !== 'Sin asignar' && currentNombre.toLowerCase() !== 'sin asignar') {
        console.log('⚠️ [Sincronización Funcionario] No encontrado en lista, manteniendo valor:', {
          currentValue,
          currentNombre
        });
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
      })
      .catch(err => {
        console.error('Error cargando clientes:', err);
        setAseguradoraOptionsRaw([]);
        setAseguradoraOptions([]);
      });
  }, []);

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
      console.log('⚠️ [Cargar Funcionarios] No se encontró código de cliente válido');
      return;
    }

    console.log('🔍 [Cargar Funcionarios - Modo Edición] Iniciando carga de funcionarios:', {
      codigoCliente,
      tieneInitialData: !!initialData,
      camposFijos,
      codiAsgrdra: initialData.codiAsgrdra
    });

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
      console.log('⚠️ [Cargar Funcionarios - Modo Edición] Valor es "Sin asignar", limpiando para buscar funcionario real');
      valorActual = '';
      etiquetaActual = '';
    }
    
    console.log('🔍 [Cargar Funcionarios - Modo Edición] Valores del funcionario:', {
      valorActual,
      etiquetaActual,
      esSinAsignar,
      initialDataFuncAsgrdra: initialData?.funcAsgrdra,
      initialDataFuncAsgrdraNombre: initialData?.funcAsgrdraNombre,
      initialDataFuncionarioAseguradora: initialData?.funcionarioAseguradora,
      formDataFuncAsgrdra: formData.funcAsgrdra,
      formDataFuncAsgrdraNombre: formData.funcAsgrdraNombre
    });
    
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
          .map(f => {
            const rawValue = f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? f.nmbrContcto ?? f.nombre ?? '';
            const label = f.nmbrContcto || f.nombre || f.label || '';
            const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
            if (!value || !label) {
              return null;
            }
            return { value, label };
          })
          .filter(Boolean);

        console.log('✅ [Cargar Funcionarios - Modo Edición] Funcionarios cargados desde API:', opciones.length);

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
            console.log('➕ [Cargar Funcionarios - Modo Edición] Funcionario agregado a la lista:', {
              value: String(valorParaAgregar),
              label: etiquetaActual || valorActual
            });
          }
        }

        setFuncionarios(ordenarPorLabel(opciones));
        setCargandoFuncionarios(false);
        
        // Sincronizar el funcionario DESPUÉS de establecer la lista
        // Usar setTimeout para asegurar que el estado se actualice
        setTimeout(() => {
          // Si la lista está vacía, no hacer nada
          if (opciones.length === 0) {
            console.log('⚠️ [Cargar Funcionarios - Modo Edición] Lista de funcionarios vacía');
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
              console.log(`✅ [Cargar Funcionarios - Modo Edición] Encontrado código ${valorOriginal} para funcionario ${nombreOriginal}`);
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
              
              console.log('✅ [Cargar Funcionarios - Modo Edición] Funcionario encontrado desde initialData:', {
                value: String(funcionarioEncontrado.value),
                label: funcionarioEncontrado.label
              });
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
              console.log('✅ [Cargar Funcionarios - Modo Edición] Funcionario sincronizado:', {
                value: String(funcionarioEncontrado.value),
                label: funcionarioEncontrado.label,
                opciones: opciones.length,
                valorParaBuscar,
                nombreParaBuscar
              });
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
                  
                  console.log('✅ [Cargar Funcionarios - Modo Edición] Funcionario encontrado por nombre:', {
                    value: String(funcionarioPorNombre.value),
                    label: funcionarioPorNombre.label
                  });
                } else {
                  console.log('⚠️ [Cargar Funcionarios - Modo Edición] Funcionario no encontrado en lista, dejando campo vacío para selección manual');
                  // Dejar el campo vacío para que el usuario pueda seleccionar manualmente
                  setFormData(prev => ({
                    ...prev,
                    funcAsgrdra: '',
                    funcAsgrdraNombre: '',
                    funcionarioAseguradora: ''
                  }));
                }
              } else {
                console.log('⚠️ [Cargar Funcionarios - Modo Edición] No hay funcionario válido, dejando campo vacío para selección manual');
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
            console.log('⚠️ [Cargar Funcionarios - Modo Edición] No hay funcionario asignado, dejando campo vacío para selección manual');
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
          console.log('⚠️ [Cargar Funcionarios - Modo Edición] Petición cancelada');
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
          console.log('⚠️ [Cargar Funcionarios - Modo Edición] Usando funcionario de fallback:', funcionarioFallback);
        }
      });

    // Cleanup: cancelar la petición si el componente se desmonta o cambian las dependencias
    return () => {
      abortController.abort();
    };
  }, [initialData, aseguradoraOptionsRaw, ordenarPorLabel]);

  useEffect(() => {
    let cancelado = false;
    const cached = sessionStorage.getItem('ciudades-options');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (!cancelado) {
          const opciones = Array.isArray(parsed) ? parsed : [];
          setCiudades(ordenarPorLabel(opciones));
        }
      } catch (error) {
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
          const opciones = lista.map(c => ({
            value: c.descMunicipio || c.label || c.value || c,
            label: c.descMunicipio || c.label || c.value || c
          }));
          const ordenadas = ordenarPorLabel(opciones);
          setCiudades(ordenadas);
          sessionStorage.setItem('ciudades-options', JSON.stringify(ordenadas));
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
  }, []);

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
      console.log('🔄 [FormularioCasoComplex] Sincronizando ciudad:', {
        ciudadGuardada,
        ciudadEncontrada: ciudadEncontrada.value,
        label: ciudadEncontrada.label
      });
      setFormData(prev => ({
        ...prev,
        ciudadSiniestro: ciudadEncontrada.value
      }));
    } else if (!ciudadEncontrada && ciudadGuardada) {
      // Si no se encuentra pero hay un valor, mantenerlo (puede ser un valor válido que no está en la lista)
      console.log('⚠️ [FormularioCasoComplex] Ciudad no encontrada en lista, manteniendo valor guardado:', ciudadGuardada);
    }
  }, [ciudades, initialData, formData.ciudadSiniestro]);

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
  }, []);

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
      const estadoActual = String(prev.estado || '').trim();
      if (estadoActual && estados.some((e) => e.value === estadoActual)) {
        return prev;
      }
      const resolved = resolverEstadoParaSelect(prev, estados);
      if (!resolved || resolved === prev.estado) return prev;
      return { ...prev, estado: resolved, codiEstdo: resolved };
    });
  }, [estados, resolverEstadoParaSelect]);

  useEffect(() => {
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
  }, []);

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
        console.log("Intermediarios obtenidos desde API:", data);
        // Manejar ambos formatos: {success: true, data: [...]} o [...]
        let intermediariosList = [];
        if (data.success && Array.isArray(data.data)) {
          intermediariosList = data.data;
        } else if (Array.isArray(data)) {
          intermediariosList = data;
        }
        
        // Filtrar solo los activos
        const intermediariosActivos = intermediariosList.filter(i => i.estado === 1);
        
        // Guardar los objetos completos para referencia
        setIntermediarios(intermediariosActivos);
        
        // Crear array de nombres para el dropdown
        const nombresIntermediarios = intermediariosActivos
          .map(i => i.nombre)
          .filter(Boolean);
        setIntermediariosOptions(ordenarStrings(nombresIntermediarios));
      })
      .catch(error => {
        console.error("Error al cargar intermediarios:", error);
        setIntermediarios([]);
        setIntermediariosOptions([]);
      });
  }, []);

  // Función para mapear los campos del frontend a los del backend
  function mapFormDataToBackend(formData) {
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
      // Campos principales
      nmroAjste: formData.nmroAjste,
      nmroSinstro: formData.nmroSinstro,
      nombIntermediario: formData.nombIntermediario,
      codWorkflow: formData.codWorkflow,
      nmroPolza: formData.nmroPolza,
      codiRespnsble: formData.codiRespnsble,
      nombreResponsable: formData.nombreResponsable || '',
      responsable: formData.nombreResponsable || '',
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
      fcha_ult_segui: pick('fcha_ult_segui', 'fchaUltSegui'),
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
      control_horas: formData.control_horas || undefined,

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

      historialDocs: formData.historialDocs
    };

    // Eliminar claves sin valor definido para evitar sobreescribir con undefined
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return payload;
  }

  // Handlers para autoguardado
  const handleRestoreData = useCallback(() => {
    if (savedDataToRestore && savedDataToRestore.data) {
      console.log('✅ Restaurando datos guardados');
      console.log('📦 Datos a restaurar:', savedDataToRestore.data);
      
      // Restaurar completamente el formData (no merge, reemplazo total)
      setFormData({
        ...formData, // Mantener estructura base
        ...savedDataToRestore.data, // Sobrescribir con datos guardados
      });
      
      setShowRestoreDialog(false);
      enableAutoSave();
      
      console.log('✅ Restauración completa');
      alert('✅ Datos restaurados exitosamente');
    }
  }, [savedDataToRestore, enableAutoSave, formData]);

  const handleDiscardSavedData = useCallback(() => {
    console.log('🗑️ Descartando datos guardados');
    clearSavedData();
    setShowRestoreDialog(false);
    setSavedDataToRestore(null);
  }, [clearSavedData]);

  const handleCancelRestore = useCallback(() => {
    console.log('⏸️ Decisión de restauración pospuesta');
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
      alert('Hay documentos en proceso de carga. Espera a que terminen para guardar el caso.');
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
      alert('El estado del siniestro es obligatorio. Selecciona un estado en la pestaña Datos Generales.');
      setTabActiva('datosGenerales');
      return;
    }
    formDataConTextareas.estado = codigoEstado;
    formDataConTextareas.codiEstdo = codigoEstado;

    camposTextareas.forEach(campo => {
      const textarea = document.querySelector(`textarea[name="${campo}"]`);
      if (textarea && textarea.value !== undefined) {
        formDataConTextareas[campo] = textarea.value;
        console.log(`📝 [handleSubmit] Capturado textarea ${campo}:`, textarea.value);
      } else {
        console.log(`⚠️ [handleSubmit] No se encontró textarea para ${campo}`);
      }
    });
    
    console.log('🟦 Iniciando submit de caso complex', {
       origen: formDataConTextareas.origen || 'nuevo',
       resumen: {
         id: formDataConTextareas._id,
         numeroAjuste: formDataConTextareas.nmroAjste,
         valorReserva: formDataConTextareas.vlorResrva,
         valorReclamo: formDataConTextareas.vlorReclmo,
         montoIndemnizar: formDataConTextareas.montoIndmzar,
         descripcionSiniestro: formDataConTextareas.descSinstro
       }
     });
     console.log('🟦 handleSubmit disparado', {
       tieneOnSave: !!onSave,
       extra,
       resumen: {
         id: formDataConTextareas._id,
         numeroAjuste: formDataConTextareas.nmroAjste,
         aseguradora: formDataConTextareas.codiAsgrdra,
         funcionario: formDataConTextareas.funcAsgrdra,
         descripcionSiniestro: formDataConTextareas.descSinstro
       }
     });
     if (!onSave) {
       alert('Guardar (sin acción definida)');
       return;
     }
    const payload = { ...mapFormDataToBackend(formDataConTextareas), ...extra };
    console.log('🟦 Payload listo para guardar', payload);
    console.log('🔍 [handleSubmit] Verificando fecha_control_horas en payload:', {
      fecha_control_horas: payload.fecha_control_horas,
      fcha_control_horas: payload.fcha_control_horas,
      fchaControlHoras: payload.fchaControlHoras,
      fechaControlHoras: payload.fechaControlHoras,
      formData_fecha_control_horas: formDataConTextareas.fecha_control_horas
    });
    console.log('🔍 [handleSubmit] Verificando fecha_envio_control_horas en payload:', {
      fecha_envio_control_horas: payload.fecha_envio_control_horas,
      fcha_envio_control_horas: payload.fcha_envio_control_horas,
      fchaEnvioControlHoras: payload.fchaEnvioControlHoras,
      fechaEnvioControlHoras: payload.fechaEnvioControlHoras,
      formData_fecha_envio_control_horas: formDataConTextareas.fecha_envio_control_horas
    });
    console.log('🔍 [handleSubmit] Verificando campos en payload:', {
      descripcionEstado: payload.descripcionEstado,
      observacionesPendientes: payload.observacionesPendientes,
      historialDocs: payload.historialDocs ? `Array con ${payload.historialDocs.length} elementos` : 'vacío o undefined',
      fchaInfoPrelm: payload.fchaInfoPrelm,
      fchaInfoFnal: payload.fchaInfoFnal,
      fchaSoliDocu: payload.fchaSoliDocu,
      fchaRepoActi: payload.fchaRepoActi,
      fchaPresentacionCifras: payload.fchaPresentacionCifras,
      fchaAceptacionCifrasAseguradora: payload.fchaAceptacionCifrasAseguradora,
      fchaEnvioFiniquito: payload.fchaEnvioFiniquito,
      fchaContIni: payload.fchaContIni,
      fchaInspccion: payload.fchaInspccion
    });
    console.log('📅 [handleSubmit] Fechas en formData original:', {
      fchaInfoPrelm: formDataConTextareas.fchaInfoPrelm,
      fchaInfoFnal: formDataConTextareas.fchaInfoFnal,
      fchaSoliDocu: formDataConTextareas.fchaSoliDocu,
      fchaRepoActi: formDataConTextareas.fchaRepoActi,
      fchaPresentacionCifras: formDataConTextareas.fchaPresentacionCifras,
      fchaAceptacionCifrasAseguradora: formDataConTextareas.fchaAceptacionCifrasAseguradora,
      fchaEnvioFiniquito: formDataConTextareas.fchaEnvioFiniquito,
      fchaContIni: formDataConTextareas.fchaContIni,
      fchaInspccion: formDataConTextareas.fchaInspccion
    });
    
    // Ejecutar onSave y limpiar autoguardado después de éxito
    try {
      const result = onSave(payload);
      
      // Si onSave devuelve una promesa, esperar a que se resuelva
      if (result && typeof result.then === 'function') {
        result.then(() => {
          console.log('✅ Guardado exitoso, limpiando autoguardado');
          clearSavedData();
        }).catch((error) => {
          console.error('❌ Error al guardar, manteniendo autoguardado:', error);
        });
      } else {
        // Si no es una promesa, limpiar inmediatamente
        console.log('✅ Guardado completado, limpiando autoguardado');
        clearSavedData();
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
     const nombreResponsable = resultado.nombreResponsable || datosIniciales?.nombreResponsable || '';
     
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
 
     return resultado;
  };

  return (
    <>
    <div className={complexFormRoot}>
      <form onSubmit={handleSubmit} className={`${complexScope} ${complexFormShell}`} noValidate>
        <ComplexFormTabs tabs={FORM_TABS} activeId={tabActiva} onChange={setTabActiva} />
        <ComplexFormActions
          onCancel={onCancel || (() => {})}
          onEnviarRiesgos={handleEnviarARiesgos}
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
      />
        )}
        {tabActiva === 'valores' && (
          <ValoresPrestaciones
            formData={formData}
            handleChange={handleChange}
            // ...pasa aquí las props necesarias
          />
        )}
        {tabActiva === 'trazabilidad' && (
          <Trazabilidad
            formData={formData}
            handleChange={handleChange}
            onSelectFiles={handleDocumentDrop}
            historialDocs={formData.historialDocs}
            cargandoAdjuntos={cargandoAdjuntos}
            errorAdjuntos={errorAdjuntos}
          />
        )}
        {tabActiva === 'seguimiento' && (
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
        {tabActiva === 'observacionesPendientes' && (
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
            getRootPropsEvidencia={dropzonePropsEvidencia.getRootProps}
            getInputPropsEvidencia={dropzonePropsEvidencia.getInputProps}
            isDragActiveEvidencia={dropzonePropsEvidencia.isDragActive}
            getRootPropsSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.getRootProps}
            getInputPropsSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.getInputProps}
            isDragActiveSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.isDragActive}
            onEnviarGerencia={handleEnviarGerencia}
            historialDocs={formData.historialDocs}
            updateHistorialDocs={updateHistorialDocs}
          />
        )}
        {tabActiva === 'honorarios' && (
          <Honorarios
            formData={formData}
            handleChange={handleChange}
            getRootPropsHonorarios={dropzonePropsHonorarios.getRootProps}
            getInputPropsHonorarios={dropzonePropsHonorarios.getInputProps}
            isDragActiveHonorarios={dropzonePropsHonorarios.isDragActive}
          />
        )}
        {tabActiva === 'observaciones' && (
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

      {/* Componentes de autoguardado */}
      <AutoSaveNotification
        isEnabled={isAutoSaveEnabled}
        lastSaveTime={lastSaveTime}
        saveStatus={saveStatus}
        onEnable={enableAutoSave}
        onDisable={disableAutoSave}
        onSaveNow={saveNow}
        hasUnsavedChanges={false}
        showEnablePrompt={false}
        onDismissPrompt={() => {}}
      />

      <AutoSaveRestoreDialog
        isOpen={showRestoreDialog}
        savedData={savedDataToRestore?.data}
        metadata={savedDataToRestore?.metadata}
        onRestore={handleRestoreData}
        onDiscard={handleDiscardSavedData}
        onCancel={handleCancelRestore}
      />
    </>
  );
}
