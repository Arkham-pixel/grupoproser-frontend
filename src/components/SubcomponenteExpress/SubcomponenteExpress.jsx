import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FaCalculator, FaPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import { sanitizeUploadFileName } from '../../utils/sanitizeUploadFileName.js';
import { normalizeStoredFileReference } from '../../utils/storedFilePath.js';
import {
  fetchExpressCatalogo,
  opcionesCatalogo,
  resolverNombreCatalogo,
} from '../../services/expressCatalogoService.js';
import { ordenarLista, resolverCodigoResponsable, resolverCodigoAseguradora, resolverCodigoEstado, formatDate } from './expressHelpers.js';
import { calcularLiquidacion, liquidadorConNombreAjustador, aplicaFormatoSalvamento, formatearMontoConPeso, mapCasoExpressALiquidador } from './liquidadorExpressHelpers.js';
import { descargarLiquidadorExpressPdf } from './generarLiquidadorExpressPdf.js';
import DocumentLanguageSelector from '../DocumentLanguageSelector.jsx';
import {
  descargarChecklistExpressPdf,
  descargarSalvamentoExpressPdf,
} from './generarFormatosExpressPdf.js';
import { esResponsableExpressPermitido } from '../../config/expressCatalogosPermitidos.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressCard,
  expressCardBody,
  expressCardHeader,
  expressFormSection,
  expressPageWrap,
  expressRadioOption,
  expressScope,
  expressSectionTitle,
} from './expressFenixUi.js';
import {
  Campo,
  DropzoneFenix,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  ExpressAvisoModal,
  ExpressListaAnexos,
  ExpressModal,
  ExpressPageHeader,
  InputFechaHoraExpress,
  InputFenix,
  InputMonedaExpress,
  SelectFenix,
  TextareaFenix,
} from './ExpressUiBlocks.jsx';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';
import FormAutoSaveControls from '../AutoSave/FormAutoSaveControls';
import AlertasCasoExpressPanel from './AlertasCasoExpressPanel.jsx';
import { formatearFechaHoraParaInput } from '../../utils/complexFechaHoraUtils.js';

const DEFAULT_FORM = {
  _id: '',
  consecutivo: '',
  responsable: '',
  codigoWorkflow: '',
  numeroSiniestro: '',
  fechaSiniestro: '',
  avisoSiniestro: '',
  avisoSiniestroCompania: '',
  fechaReciboDocumentos: '',
  fechaCargueFiniquito: '',
  amparo: '',
  valorIndemnizacion: '',
  observacionesSeguimiento: '',
  anexos: [],
  aseguradora: '',
  intermediario: '',
  ciudadSiniestro: '',
  aseguradoBeneficiario: '',
  nit: '',
  analista: '',
  fechaEnvioAutorizacion: '',
  fechaRespuestaAnalista: '',
  correoNotificacion: '',
  fechaCierre: '',
  fechaSolicitudDocumentos: '',
  fechaAcuseReciboDocumentos: '',
  fechaUltimoDocumento: '',
  fechaDefinicionCaso: '',
  fechaSolicitudDocumentosAdicionales: '',
  fechaSolicitudDocumentosPendientes: '',
  fechaSolicitudCorrecciones: '',
  fechaCorreccionesPresentadas: '',
  fechaPresentacionCifras: '',
  fechaReconsideracion: '',
  reconsideracionAplica: '',
  fechaDocumentosPago: '',
  fechaFiniquitosFirmado: '',
  fechaRecordatorio: '',
  reserva: '',
  estadoProceso: '',
  salvamentoAplica: '',
  valorSalvamento: '',
  salvamentoAnexos: [],
};

/** Solo Zürich Colombia Seguros (excluye BBVA-ZURICH y similares). */
const normalizarNombreAseguradora = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

const esZurichColombia = (label) => {
  const nombre = normalizarNombreAseguradora(label);
  if (!nombre.includes('ZURICH')) return false;
  if (nombre.includes('BBVA')) return false;
  return nombre.includes('COLOMBIA') || nombre.includes('SEGUROS');
};

const SubcomponenteExpress = ({ initialData = null, onClose, onSaved, embed = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => ({ ...DEFAULT_FORM }));
  const [existingAnexos, setExistingAnexos] = useState([]);
  const [existingSalvamentoAnexos, setExistingSalvamentoAnexos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [intermediariosExpress, setIntermediariosExpress] = useState([]);
  const [amparosExpress, setAmparosExpress] = useState([]);
  const [analistasExpress, setAnalistasExpress] = useState([]);
  const [estadosExpress, setEstadosExpress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [avisoModal, setAvisoModal] = useState({
    open: false,
    titulo: t('express.notice.title'),
    mensaje: '',
    tipo: 'warning',
  });
  const tUi = useCallback((key, options) => t(`express.ui.claimForm.${key}`, options), [t]);
  const [modalIntermediarioOpen, setModalIntermediarioOpen] = useState(false);
  const [nuevoIntermediario, setNuevoIntermediario] = useState('');
  const [guardandoIntermediario, setGuardandoIntermediario] = useState(false);
  const [documentLocale, setDocumentLocale] = useState('es');

  const toDateInputValue = useCallback((value) => formatDate(value), []);
  const toDateTimeInputValue = useCallback((value) => formatearFechaHoraParaInput(value), []);

  const toInputTextValue = useCallback((value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  }, []);

  const toInputNumberValue = useCallback((value) => {
    if (value === null || value === undefined || value === '') return '';
    return formatearMontoConPeso(value);
  }, []);

  const normalizeExistingAnexo = useCallback((anexo = {}, index = 0) => {
    const nombre =
      anexo.nombre ||
      anexo.fileName ||
      anexo.originalname ||
      (typeof anexo.url === 'string' ? anexo.url.split('/').pop() : '') ||
      `Anexo-${index + 1}`;

    const url = normalizeStoredFileReference(anexo.url || anexo.ruta || anexo.path || '');

    return {
      nombre,
      url,
      tamano: anexo.tamano ?? anexo.size ?? null,
      tipo: anexo.tipo ?? anexo.mime ?? anexo.mimetype ?? '',
    };
  }, []);

  const hydrateFromInitial = useCallback(
    (data) => {
      setError(null);
      setSuccess(null);

      if (!data) {
        setFormData({ ...DEFAULT_FORM });
        setExistingAnexos([]);
        setExistingSalvamentoAnexos([]);
        return;
      }

      const hydrated = {
        ...DEFAULT_FORM,
        _id: data._id || data.id || '',
        consecutivo: toInputTextValue(data.consecutivo),
        responsable:
          resolverCodigoResponsable(data.responsable, responsables) ||
          toInputTextValue(data.responsable),
        codigoWorkflow: toInputTextValue(data.codigoWorkflow),
        numeroSiniestro: toInputTextValue(data.numeroSiniestro),
        fechaSiniestro: toDateInputValue(data.fechaSiniestro),
        avisoSiniestro: toDateTimeInputValue(data.avisoSiniestro),
        avisoSiniestroCompania: toDateTimeInputValue(data.avisoSiniestroCompania),
        fechaReciboDocumentos: toDateTimeInputValue(data.fechaReciboDocumentos),
        fechaCargueFiniquito: toDateTimeInputValue(data.fechaCargueFiniquito),
        amparo: resolverNombreCatalogo(amparosExpress, data.amparo) || toInputTextValue(data.amparo),
        valorIndemnizacion: toInputNumberValue(
          data.valorIndemnizacion ?? data.valorIndemnizacionNumero ?? ''
        ),
        observacionesSeguimiento: toInputTextValue(data.observacionesSeguimiento),
        aseguradora:
          resolverCodigoAseguradora(data.aseguradora, aseguradoras) ||
          toInputTextValue(data.aseguradora),
        intermediario:
          resolverNombreCatalogo(intermediariosExpress, data.intermediario) ||
          toInputTextValue(data.intermediario),
        ciudadSiniestro: toInputTextValue(data.ciudadSiniestro),
        aseguradoBeneficiario: toInputTextValue(data.aseguradoBeneficiario),
        nit: toInputTextValue(data.nit),
        analista: resolverNombreCatalogo(analistasExpress, data.analista) || toInputTextValue(data.analista),
        fechaEnvioAutorizacion: toDateTimeInputValue(data.fechaEnvioAutorizacion),
        fechaRespuestaAnalista: toDateTimeInputValue(data.fechaRespuestaAnalista),
        correoNotificacion: toInputTextValue(data.correoNotificacion),
        fechaCierre: toDateInputValue(data.fechaCierre),
        fechaSolicitudDocumentos: toDateTimeInputValue(data.fechaSolicitudDocumentos),
        fechaAcuseReciboDocumentos: toDateTimeInputValue(data.fechaAcuseReciboDocumentos),
        fechaUltimoDocumento: toDateTimeInputValue(data.fechaUltimoDocumento),
        fechaDefinicionCaso: toDateTimeInputValue(data.fechaDefinicionCaso),
        fechaSolicitudDocumentosAdicionales: toDateTimeInputValue(
          data.fechaSolicitudDocumentosAdicionales
        ),
        fechaSolicitudDocumentosPendientes: toDateTimeInputValue(
          data.fechaSolicitudDocumentosPendientes
        ),
        fechaSolicitudCorrecciones: toDateTimeInputValue(data.fechaSolicitudCorrecciones),
        fechaCorreccionesPresentadas: toDateTimeInputValue(data.fechaCorreccionesPresentadas),
        fechaPresentacionCifras: toDateTimeInputValue(data.fechaPresentacionCifras),
        fechaReconsideracion: toDateTimeInputValue(data.fechaReconsideracion),
        reconsideracionAplica: data.reconsideracionAplica ? String(data.reconsideracionAplica) : '',
        fechaDocumentosPago: toDateTimeInputValue(data.fechaDocumentosPago),
        fechaFiniquitosFirmado: toDateInputValue(data.fechaFiniquitosFirmado),
        fechaRecordatorio: toDateTimeInputValue(data.fechaRecordatorio),
        reserva: toInputNumberValue(data.reserva ?? data.reservaNumero ?? ''),
        estadoProceso:
          data.estadoProceso !== undefined && data.estadoProceso !== null
            ? resolverCodigoEstado(String(data.estadoProceso), estadosExpress)
            : '',
        salvamentoAplica: data.salvamentoAplica ? String(data.salvamentoAplica) : '',
        valorSalvamento: toInputNumberValue(data.valorSalvamento ?? data.valorSalvamentoNumero ?? ''),
        salvamentoAnexos: [],
        anexos: [],
      };

      setFormData(hydrated);

      const anexosIniciales = Array.isArray(data.anexos)
        ? data.anexos
            .map((anexo, index) => normalizeExistingAnexo(anexo, index))
            .filter(Boolean)
        : [];

      setExistingAnexos(anexosIniciales);

      const salvamentoIniciales = Array.isArray(data.anexosSalvamento)
        ? data.anexosSalvamento
            .map((anexo, index) => normalizeExistingAnexo(anexo, index))
            .filter(Boolean)
        : [];

      setExistingSalvamentoAnexos(salvamentoIniciales);
    },
    [normalizeExistingAnexo, toDateInputValue, toDateTimeInputValue, toInputNumberValue, toInputTextValue, amparosExpress, analistasExpress, intermediariosExpress, responsables, aseguradoras, estadosExpress]
  );

  useEffect(() => {
    hydrateFromInitial(initialData || null);
  }, [initialData, hydrateFromInitial]);

  const resetFormulario = useCallback(() => {
    if (initialData) {
      hydrateFromInitial(initialData);
    } else {
      setFormData({ ...DEFAULT_FORM });
      setExistingAnexos([]);
      setExistingSalvamentoAnexos([]);
    }
    setError(null);
  }, [hydrateFromInitial, initialData]);

  const isEditing = Boolean(formData._id);
  const formSubmitLabel = loading ? t('express.form.saving') : isEditing ? t('express.form.update') : t('common.save');
  const headerTitle = isEditing ? t('express.form.editTitle') : t('express.form.loadTitle');
  const headerSubtitle = isEditing ? tUi('subtitleEdit') : tUi('subtitleNew');

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState(null);
  const existingAnexosRef = React.useRef(existingAnexos);
  const existingSalvamentoAnexosRef = React.useRef(existingSalvamentoAnexos);

  useEffect(() => {
    existingAnexosRef.current = existingAnexos;
  }, [existingAnexos]);

  useEffect(() => {
    existingSalvamentoAnexosRef.current = existingSalvamentoAnexos;
  }, [existingSalvamentoAnexos]);

  const onAutoSaveExpress = useCallback(async (data) => {
    const casoId = data._id;
    if (!casoId) return;

    const {
      anexos: IGNORED_ANEXOS,
      salvamentoAnexos: IGNORED_SALVAMENTO_ANEXOS,
      _id,
      consecutivo: IGNORED_CONSECUTIVO,
      ...payload
    } = data;
    const formDataToSend = new FormData();
    formDataToSend.append('salvamentoAplica', data.salvamentoAplica || '');

    // Incluir '' para poder limpiar observaciones/montos en el servidor
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'salvamentoAplica') return;
      if (value === null || value === undefined) return;
      formDataToSend.append(key, value);
    });

    formDataToSend.append('_id', casoId);
    formDataToSend.append('anexosExistentes', JSON.stringify(existingAnexosRef.current));
    formDataToSend.append(
      'salvamentoAnexosExistentes',
      JSON.stringify(existingSalvamentoAnexosRef.current)
    );

    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/api/siniestros-express/${casoId}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formDataToSend,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error || `Error autoguardado Express (${response.status})`);
    }
  }, []);

  const {
    isAutoSaveEnabled,
    lastSaveTime,
    saveStatus,
    enableAutoSave,
    disableAutoSave,
    saveNow,
    syncNow,
    pendingServerSync,
    isOnline,
    isExistingRecord,
    clearSavedData,
  } = useFormAutoSave({
    formKeyBase: 'express-siniestro',
    recordId: formData._id || null,
    formData,
    excludeFields: ['anexos', 'salvamentoAnexos'],
    onServerUpdate: onAutoSaveExpress,
    serverReady: Boolean(formData._id),
    canSaveServer: () => !loading,
    onRestore: (savedInfo) => {
      setSavedDataToRestore(savedInfo);
      setShowRestoreDialog(true);
    },
  });

  const handleRestoreData = useCallback(() => {
    if (!savedDataToRestore?.data) return;
    setFormData((prev) => ({ ...prev, ...savedDataToRestore.data }));
    setShowRestoreDialog(false);
    enableAutoSave();
  }, [savedDataToRestore, enableAutoSave]);

  const handleDiscardSavedData = useCallback(() => {
    clearSavedData();
    setShowRestoreDialog(false);
    setSavedDataToRestore(null);
  }, [clearSavedData]);

  const handleCancelRestore = useCallback(() => {
    setShowRestoreDialog(false);
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function cargarResponsables() {
      try {
        const res = await fetch(`${BASE_URL}/api/responsables`);
        const data = await res.json();
        if (cancelado) return;
        const lista = data?.success && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        setResponsables(ordenarLista(lista, (resp) => resp?.nmbrRespnsble ?? resp?.label ?? resp?.nombre ?? ''));
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando responsables (Express):', err);
          setResponsables([]);
        }
      }
    }

    async function cargarAseguradoras() {
      try {
        const res = await fetch(`${BASE_URL}/api/clientes`);
        const data = await res.json();
        if (cancelado) return;
        const lista = Array.isArray(data) ? data : data?.data ?? [];
        setAseguradoras(ordenarLista(lista, (aseg) => aseg?.rzonSocial ?? aseg?.label ?? aseg?.nombre ?? ''));
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando aseguradoras (Express):', err);
          setAseguradoras([]);
        }
      }
    }

    async function cargarCiudades() {
      try {
        const res = await fetch(`${BASE_URL}/api/ciudades`);
        const data = await res.json();
        if (cancelado) return;
        const lista = data?.success && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        setCiudades(ordenarLista(lista, (ciudad) => ciudad?.descMunicipio ?? ciudad?.label ?? ciudad?.nombre ?? ''));
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando ciudades (Express):', err);
          setCiudades([]);
        }
      }
    }

    async function cargarCatalogosExpressForm() {
      try {
        const [amparos, analistas] = await Promise.all([
          fetchExpressCatalogo('amparo'),
          fetchExpressCatalogo('analista'),
        ]);
        if (cancelado) return;
        setAmparosExpress(Array.isArray(amparos) ? amparos : []);
        setAnalistasExpress(Array.isArray(analistas) ? analistas : []);
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando catálogos Express:', err);
          setAmparosExpress([]);
          setAnalistasExpress([]);
        }
      }
    }

    async function cargarIntermediarios() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BASE_URL}/api/intermediarios`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelado) return;
        const lista = data?.success && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        const activos = lista.filter((i) => i?.estado == null || Number(i.estado) === 1);
        setIntermediariosExpress(
          ordenarLista(
            activos.map((i) => ({ _id: i._id, nombre: i.nombre, codigo: i.codigo })),
            (i) => i.nombre
          )
        );
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando intermediarios (banco):', err);
          setIntermediariosExpress([]);
        }
      }
    }

    async function cargarEstadosExpress() {
      try {
        const res = await fetch(`${BASE_URL}/api/estados/express`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelado) return;
        const lista = data?.success && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        const normalizados = lista
          .filter((estado) => estado?.codiEstdo != null || estado?.codiEstado != null)
          .map((estado) => ({
            value: String(estado.codiEstdo ?? estado.codiEstado),
            label: estado.descEstdo ?? estado.descEstado ?? estado.descripcion ?? '',
          }))
          .filter((estado) => estado.label);
        setEstadosExpress(
          [...normalizados].sort(
            (a, b) => Number(a.value) - Number(b.value) || a.label.localeCompare(b.label, 'es')
          )
        );
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando estados express:', err);
          setEstadosExpress([]);
        }
      }
    }

    cargarResponsables();
    cargarAseguradoras();
    cargarCiudades();
    cargarCatalogosExpressForm();
    cargarIntermediarios();
    cargarEstadosExpress();

    return () => {
      cancelado = true;
    };
  }, []);

  const mappedResponsables = useMemo(() => {
    const opciones = responsables
      .map((resp, index) => ({
        value: String(resp.codiRespnsble ?? resp.value ?? resp._id ?? ''),
        label: resp.nmbrRespnsble ?? resp.label ?? resp.nombre ?? '',
        key: resp._id ?? `${resp.codiRespnsble ?? resp.value ?? 'responsable'}-${index}`,
      }))
      .filter((resp) => resp.value && resp.label);

    const permitidos = opciones.filter((resp) => esResponsableExpressPermitido(resp.label));
    const actual = String(formData.responsable ?? '').trim();
    if (actual && !permitidos.some((r) => r.value === actual)) {
      const actualEnLista = opciones.find((r) => r.value === actual);
      if (actualEnLista) permitidos.push(actualEnLista);
    }
    return ordenarLista(permitidos, (resp) => resp.label);
  }, [responsables, formData.responsable]);

  const mappedAseguradoras = useMemo(() => {
    const opciones = aseguradoras
      .map((aseg, index) => ({
        value: String(aseg.codiAsgrdra ?? aseg.value ?? aseg._id ?? '').trim(),
        label: aseg.rzonSocial ?? aseg.label ?? aseg.nombre ?? '',
        key: aseg._id ?? `${aseg.codiAsgrdra ?? aseg.value ?? 'aseguradora'}-${index}`,
      }))
      .filter((aseg) => aseg.value && aseg.label)
      .filter((aseg) => esZurichColombia(aseg.label));
    // Preferir el nombre comercial exacto si hay varias coincidencias
    const preferida = opciones.find((aseg) =>
      normalizarNombreAseguradora(aseg.label).includes('ZURICH COLOMBIA SEGUROS')
    );
    return preferida ? [preferida] : ordenarLista(opciones, (aseg) => aseg.label).slice(0, 1);
  }, [aseguradoras]);

  // Express solo opera con Zürich Colombia: fijar valor válido (corrige BBVA-ZURICH / valor huérfano)
  useEffect(() => {
    const zurich = mappedAseguradoras[0];
    if (!zurich?.value) return;
    setFormData((prev) => {
      const actual = String(prev.aseguradora ?? '').trim();
      const esValida = mappedAseguradoras.some((a) => String(a.value) === actual);
      if (esValida) return prev;
      return { ...prev, aseguradora: zurich.value };
    });
  }, [mappedAseguradoras, formData.aseguradora]);

  const opcionesAmparo = useMemo(
    () => opcionesCatalogo(amparosExpress, formData.amparo),
    [amparosExpress, formData.amparo]
  );

  const opcionesAnalista = useMemo(
    () => opcionesCatalogo(analistasExpress, formData.analista),
    [analistasExpress, formData.analista]
  );

  const opcionesIntermediario = useMemo(
    () => opcionesCatalogo(intermediariosExpress, formData.intermediario),
    [intermediariosExpress, formData.intermediario]
  );

  const mappedCiudades = useMemo(() => {
    const opciones = ciudades
      .map((ciudad, index) => ({
        value: ciudad.codiMunicipio ?? ciudad.value ?? ciudad._id ?? ciudad.descMunicipio ?? '',
        label: ciudad.descMunicipio ?? ciudad.label ?? ciudad.nombre ?? '',
        key: ciudad._id ?? `${ciudad.codiMunicipio ?? ciudad.value ?? 'ciudad'}-${index}`,
      }))
      .filter((ciudad) => ciudad.value && ciudad.label);
    return ordenarLista(opciones, (ciudad) => ciudad.label);
  }, [ciudades]);

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    setFormData((prev) => ({
      ...prev,
      anexos: [
        ...prev.anexos,
        ...acceptedFiles.map((file) => ({
          file,
          nombre: file.name,
          tamano: file.size,
          tipo: file.type,
        })),
      ],
    }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ multiple: true, onDrop });

  const onDropSalvamento = useCallback((acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    setFormData((prev) => ({
      ...prev,
      salvamentoAnexos: [
        ...prev.salvamentoAnexos,
        ...acceptedFiles.map((file) => ({
          file,
          nombre: file.name,
          tamano: file.size,
          tipo: file.type,
        })),
      ],
    }));
  }, []);

  const {
    getRootProps: getSalvamentoRootProps,
    getInputProps: getSalvamentoInputProps,
    isDragActive: isSalvamentoDragActive,
  } = useDropzone({ multiple: true, onDrop: onDropSalvamento });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (event) => {
    setFormData((prev) => ({ ...prev, estadoProceso: event.target.value }));
  };

  const handleSalvamentoAplicaChange = (event) => {
    const valor = event.target.value;
    setFormData((prev) => ({
      ...prev,
      salvamentoAplica: valor,
      ...(valor === 'no_aplica' ? { valorSalvamento: '', salvamentoAnexos: [] } : {}),
    }));
    if (valor === 'no_aplica') {
      setExistingSalvamentoAnexos([]);
    }
  };

  const salvamentoAplicaSeleccionado = formData.salvamentoAplica === 'aplica';
  const salvamentoNoAplica = formData.salvamentoAplica === 'no_aplica';

  const handleReconsideracionAplicaChange = (event) => {
    const valor = event.target.value;
    setFormData((prev) => ({
      ...prev,
      reconsideracionAplica: valor,
      ...(valor === 'no_aplica' ? { fechaReconsideracion: '' } : {}),
    }));
  };

  const reconsideracionAplicaSeleccionado = formData.reconsideracionAplica === 'aplica';
  const reconsideracionNoAplica = formData.reconsideracionAplica === 'no_aplica';

  const mostrarAviso = useCallback((mensaje, titulo = t('express.notice.title'), tipo = 'warning') => {
    setAvisoModal({ open: true, titulo, mensaje, tipo });
  }, [t]);

  const prepararLiquidadorExport = useCallback(() => {
    const caso = initialData && typeof initialData === 'object' ? initialData : formData;
    const liquidadorRaw = caso?.liquidador;
    if (!liquidadorRaw || typeof liquidadorRaw !== 'object') {
      return null;
    }
    const obtenerNombre = (codigo) => {
      const valor = String(codigo ?? '').trim();
      if (!valor) return '';
      const hit = mappedResponsables.find((r) => r.value === valor || r.label === valor);
      return hit?.label || valor;
    };
    const liquidador = liquidadorConNombreAjustador(
      mapCasoExpressALiquidador(caso, { obtenerNombreResponsable: obtenerNombre }),
      obtenerNombre,
      formData.responsable || caso?.responsable
    );
    return {
      liquidador,
      totales: calcularLiquidacion(liquidador),
    };
  }, [initialData, formData, mappedResponsables]);

  const handleDescargarPdfLiquidador = useCallback(async () => {
    const prep = prepararLiquidadorExport();
    if (!prep) {
      mostrarAviso(
        tUi('alerts.settlementMissingMessage'),
        tUi('alerts.settlementMissingTitle'),
        'warning'
      );
      return;
    }
    try {
      await descargarLiquidadorExpressPdf(prep.liquidador, prep.totales, { locale: documentLocale });
    } catch (err) {
      console.error('Error al generar PDF del liquidador:', err);
      mostrarAviso(tUi('alerts.settlementPdfError'), tUi('alerts.settlementMissingTitle'), 'error');
    }
  }, [prepararLiquidadorExport, mostrarAviso, documentLocale, tUi]);

  const handleDescargarPdfChecklist = useCallback(async () => {
    const prep = prepararLiquidadorExport();
    if (!prep) {
      mostrarAviso(
        tUi('alerts.settlementMissingMessage'),
        tUi('alerts.checklistMissingTitle'),
        'warning'
      );
      return;
    }
    try {
      await descargarChecklistExpressPdf(prep.liquidador, prep.totales, { locale: documentLocale });
    } catch (err) {
      console.error('Error al generar PDF del check-list:', err);
      mostrarAviso(tUi('alerts.checklistPdfError'), tUi('alerts.checklistMissingTitle'), 'error');
    }
  }, [prepararLiquidadorExport, mostrarAviso, documentLocale, tUi]);

  const handleDescargarPdfSalvamento = useCallback(async () => {
    const prep = prepararLiquidadorExport();
    if (!prep) {
      mostrarAviso(
        tUi('alerts.settlementMissingMessage'),
        tUi('alerts.salvageMissingTitle'),
        'warning'
      );
      return;
    }
    if (!aplicaFormatoSalvamento(prep.liquidador, initialData || formData)) {
      mostrarAviso(
        tUi('alerts.salvageNotApplicable'),
        tUi('alerts.salvageMissingTitle'),
        'warning'
      );
      return;
    }
    try {
      await descargarSalvamentoExpressPdf(prep.liquidador, { locale: documentLocale });
    } catch (err) {
      console.error('Error al generar PDF de salvamento:', err);
      mostrarAviso(tUi('alerts.salvagePdfError'), tUi('alerts.salvageMissingTitle'), 'error');
    }
  }, [prepararLiquidadorExport, initialData, formData, mostrarAviso, documentLocale, tUi]);

  const cerrarAviso = useCallback(() => {
    setAvisoModal((prev) => ({ ...prev, open: false }));
  }, []);

  const abrirModalIntermediario = useCallback(() => {
    setNuevoIntermediario('');
    setModalIntermediarioOpen(true);
  }, []);

  const cerrarModalIntermediario = useCallback(() => {
    if (guardandoIntermediario) return;
    setModalIntermediarioOpen(false);
    setNuevoIntermediario('');
  }, [guardandoIntermediario]);

  const guardarNuevoIntermediario = useCallback(async () => {
    const nombre = nuevoIntermediario.trim();
    if (!nombre) {
      mostrarAviso(tUi('alerts.brokerNameRequired'), tUi('alerts.brokerTitle'), 'warning');
      return;
    }
    setGuardandoIntermediario(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/intermediarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ nombre }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || tUi('messages.brokerAddErrorFallback'));
      }

      const creado = data?.data || {};
      const nombreCreado = creado.nombre || nombre;

      // Recargar banco de intermediarios
      const listaRes = await fetch(`${BASE_URL}/api/intermediarios`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const listaData = await listaRes.json().catch(() => ({}));
      const lista =
        listaData?.success && Array.isArray(listaData.data)
          ? listaData.data
          : Array.isArray(listaData)
            ? listaData
            : [];
      const activos = lista.filter((i) => i?.estado == null || Number(i.estado) === 1);
      setIntermediariosExpress(
        ordenarLista(
          activos.map((i) => ({ _id: i._id, nombre: i.nombre, codigo: i.codigo })),
          (i) => i.nombre
        )
      );

      setFormData((prev) => ({ ...prev, intermediario: nombreCreado }));
      setModalIntermediarioOpen(false);
      setNuevoIntermediario('');
      mostrarAviso(
        tUi('alerts.brokerAdded', { name: nombreCreado }),
        tUi('alerts.ready'),
        'success'
      );
    } catch (err) {
      mostrarAviso(err?.message || tUi('alerts.brokerAddError'), tUi('alerts.errorTitle'), 'error');
    } finally {
      setGuardandoIntermediario(false);
    }
  }, [nuevoIntermediario, mostrarAviso, tUi]);

  const removeAnexo = (nombre) => {
    setFormData((prev) => ({
      ...prev,
      anexos: prev.anexos.filter((anexo) => anexo.nombre !== nombre),
    }));
  };

  const removeExistingAnexo = (indice) => {
    setExistingAnexos((prev) => prev.filter((_, idx) => idx !== indice));
  };

  const removeSalvamentoAnexo = (nombre) => {
    setFormData((prev) => ({
      ...prev,
      salvamentoAnexos: prev.salvamentoAnexos.filter((anexo) => anexo.nombre !== nombre),
    }));
  };

  const removeExistingSalvamentoAnexo = (indice) => {
    setExistingSalvamentoAnexos((prev) => prev.filter((_, idx) => idx !== indice));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (
      !formData.salvamentoAplica ||
      (formData.salvamentoAplica !== 'aplica' && formData.salvamentoAplica !== 'no_aplica')
    ) {
      mostrarAviso(
        tUi('alerts.salvageIncompleteMessage'),
        tUi('alerts.salvageIncompleteTitle'),
        'warning'
      );
      return;
    }

    setLoading(true);

    try {
      const {
        anexos,
        salvamentoAnexos,
        _id,
        consecutivo: _consecutivoIgnorado,
        ...payload
      } = formData;
      const editing = Boolean(_id);

      const formDataToSend = new FormData();
      formDataToSend.append('salvamentoAplica', formData.salvamentoAplica);

      // Incluir '' para poder limpiar observaciones/montos en el servidor
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'salvamentoAplica') return;
        if (value === null || value === undefined) return;
        formDataToSend.append(key, value);
      });

      if (editing) {
        formDataToSend.append('_id', _id);
        formDataToSend.append('anexosExistentes', JSON.stringify(existingAnexos));
        formDataToSend.append(
          'salvamentoAnexosExistentes',
          JSON.stringify(existingSalvamentoAnexos)
        );
      }

      anexos.forEach((anexo) => {
        if (anexo?.file) {
          formDataToSend.append(
            'anexos',
            anexo.file,
            sanitizeUploadFileName(anexo.nombre || anexo.file?.name, 'anexo')
          );
        }
      });

      if (formData.salvamentoAplica === 'aplica') {
        salvamentoAnexos.forEach((anexo) => {
          if (anexo?.file) {
            formDataToSend.append(
              'salvamentoAnexos',
              anexo.file,
              sanitizeUploadFileName(anexo.nombre || anexo.file?.name, 'anexo')
            );
          }
        });
      }

      const token = localStorage.getItem('token');
      const endpoint = editing
        ? `${BASE_URL}/api/siniestros-express/${_id}`
        : `${BASE_URL}/api/siniestros-express`;
      const method = editing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formDataToSend,
      });

      const payloadRespuesta = await response.json().catch(() => ({}));

      if (!response.ok || payloadRespuesta?.success === false) {
        throw new Error(
          payloadRespuesta?.error ||
            payloadRespuesta?.detalle ||
            `Error guardando Express (${response.status})`
        );
      }

      const documento = payloadRespuesta?.data ?? null;

      setSuccess(
        editing
          ? tUi('messages.updated')
          : documento?.consecutivo
            ? tUi('messages.createdWithConsecutive', { consecutivo: documento.consecutivo })
            : tUi('messages.created')
      );

      if (editing) {
        if (documento) hydrateFromInitial(documento);
        if (typeof onSaved === 'function') onSaved(documento ?? null);
        if (typeof onClose === 'function') onClose();
      } else {
        resetFormulario();
      }
    } catch (err) {
      console.error('Error al guardar Express:', err);
      setError(err.message || tUi('messages.saveErrorFallback'));
    } finally {
      setLoading(false);
    }
  };

  const grid2 = 'grid grid-cols-1 gap-4 sm:grid-cols-2';
  const gridHitos = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3';

  const bloque = (titulo, children, className = '') => (
    <section className={`${expressFormSection} ${className}`}>
      <h3 className={expressSectionTitle}>{titulo}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );

  return (
    <div className={`${expressScope} ${embed ? '' : 'p-4 sm:p-6'}`}>
      <div className={embed ? '' : expressPageWrap}>
        <ExpressPageHeader
          badge={embed ? null : 'Express'}
          title={headerTitle}
          subtitle={headerSubtitle}
          actions={
            <>
              <FormAutoSaveControls
                placement="inline"
                isExistingRecord={isExistingRecord}
                isAutoSaveEnabled={isAutoSaveEnabled}
                lastSaveTime={lastSaveTime}
                saveStatus={saveStatus}
                enableAutoSave={enableAutoSave}
                disableAutoSave={disableAutoSave}
                saveNow={saveNow}
                syncNow={syncNow}
                pendingServerSync={pendingServerSync}
                isOnline={isOnline}
                showRestoreDialog={showRestoreDialog}
                savedDataToRestore={savedDataToRestore}
                onRestore={handleRestoreData}
                onDiscard={handleDiscardSavedData}
                onCancelRestore={handleCancelRestore}
              />
              {embed && typeof onClose === 'function' && (
                <button type="button" className={expressBtnGhost} onClick={onClose} disabled={loading}>
                  {t('common.cancel')}
                </button>
              )}
              <button
                type="submit"
                form="formulario-express"
                className={expressBtnPrimary}
                disabled={loading}
              >
                {formSubmitLabel}
              </button>
            </>
          }
        />

        {(formData._id || formData.consecutivo) && (
          <AlertasCasoExpressPanel casoId={formData._id} consecutivo={formData.consecutivo} />
        )}

        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{tUi('cardTitle')}</h2>
            <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">
              {tUi('cardHint')}
            </p>
          </div>

          <form id="formulario-express" className={expressCardBody} onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="contents">
                {bloque(
                  tUi('sections.admin'),
                  <div className={grid2}>
                {isEditing && formData.consecutivo && (
                  <Campo label={tUi('consecutive')} className="sm:col-span-2">
                    <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-body text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                      {formData.consecutivo}
                      <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                        {tUi('assignedByPlatform')}
                      </span>
                    </p>
                  </Campo>
                )}
                <Campo label={tUi('responsible')} required>
                  <SelectFenix
                    id="responsable"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleChange}
                    required
                  >
                    <option value="">{t('common.select')}</option>
                    {mappedResponsables.map((resp, index) => (
                      <option key={resp.key ?? `${resp.value}-${index}`} value={resp.value}>
                        {resp.label}
                      </option>
                    ))}
                  </SelectFenix>
                </Campo>
                <Campo label={tUi('workflowCode')}>
                  <InputFenix
                    id="codigoWorkflow"
                    name="codigoWorkflow"
                    value={formData.codigoWorkflow}
                    onChange={handleChange}
                    placeholder={tUi('workflowCodePlaceholder')}
                  />
                </Campo>
                <Campo label={tUi('claimNumber')} required>
                  <InputFenix
                    id="numeroSiniestro"
                    name="numeroSiniestro"
                    value={formData.numeroSiniestro}
                    onChange={handleChange}
                    required
                  />
                </Campo>
                <Campo label={tUi('coverage')} required>
                  <SelectFenix
                    id="amparo"
                    name="amparo"
                    value={formData.amparo}
                    onChange={handleChange}
                    required
                  >
                    <option value="">{t('common.select')}</option>
                    {opcionesAmparo.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </SelectFenix>
                </Campo>
                <Campo label={tUi('indemnityValue')}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <InputMonedaExpress
                      id="valorIndemnizacion"
                      name="valorIndemnizacion"
                      value={formData.valorIndemnizacion}
                      onChange={handleChange}
                      placeholder={tUi('indemnityValuePlaceholder')}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      className={expressBtnGhost}
                      onClick={() => {
                        if (!formData._id) {
                          mostrarAviso(
                            tUi('alerts.caseNotSavedMessage'),
                            tUi('alerts.caseNotSavedTitle'),
                            'warning'
                          );
                          return;
                        }
                        navigate(`/express/liquidador?casoId=${formData._id}`);
                      }}
                      title={tUi('openSettlementTitle')}
                    >
                      <FaCalculator />
                      {tUi('settlementButton')}
                    </button>
                  </div>
                </Campo>
                <Campo label={tUi('reserve')}>
                  <InputMonedaExpress
                    id="reserva"
                    name="reserva"
                    value={formData.reserva}
                    onChange={handleChange}
                    placeholder={tUi('reservePlaceholder')}
                  />
                </Campo>
                  </div>,
                  'order-1 lg:col-span-6'
                )}

                {bloque(
                  tUi('sections.observations'),
                  <>
                    <Campo label={tUi('observations')}>
                      <TextareaFenix
                        id="observacionesSeguimiento"
                        name="observacionesSeguimiento"
                        value={formData.observacionesSeguimiento}
                        onChange={handleChange}
                        rows={5}
                        placeholder={tUi('observationsPlaceholder')}
                      />
                    </Campo>
                    <Campo label={tUi('attachment')}>
                      <DropzoneFenix
                        getRootProps={getRootProps}
                        getInputProps={getInputProps}
                        isDragActive={isDragActive}
                      />
                      <div className="mb-3">
                        <DocumentLanguageSelector
                          value={documentLocale}
                          onChange={setDocumentLocale}
                          id="express-document-language"
                        />
                      </div>
                      <ExpressListaAnexos
                        listaExistentes={existingAnexos}
                        listaNuevos={formData.anexos}
                        onRemoveExistente={removeExistingAnexo}
                        onRemoveNuevo={removeAnexo}
                        onAviso={mostrarAviso}
                        onDescargarPdfLiquidador={handleDescargarPdfLiquidador}
                        onDescargarPdfChecklist={handleDescargarPdfChecklist}
                        onDescargarPdfSalvamento={handleDescargarPdfSalvamento}
                      />
                    </Campo>
                  </>,
                  'order-4 lg:col-span-6 xl:col-span-4'
                )}

                <div className="contents">
                {bloque(
                  tUi('sections.salvage'),
                  <>
                    <Campo label={tUi('salvageApplies')} required>
                      <fieldset className="space-y-2 border-0 p-0">
                        <legend className="sr-only">{tUi('salvageLegend')}</legend>
                        <div className="flex flex-wrap gap-4">
                          <label className={expressRadioOption}>
                            <input
                              type="radio"
                              name="salvamentoAplicaRadio"
                              value="aplica"
                              checked={salvamentoAplicaSeleccionado}
                              onChange={handleSalvamentoAplicaChange}
                              className="accent-fenix-primario"
                            />
                            <span className="font-body text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {tUi('applies')}
                            </span>
                          </label>
                          <label className={expressRadioOption}>
                            <input
                              type="radio"
                              name="salvamentoAplicaRadio"
                              value="no_aplica"
                              checked={salvamentoNoAplica}
                              onChange={handleSalvamentoAplicaChange}
                              className="accent-fenix-primario"
                            />
                            <span className="font-body text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {tUi('doesNotApply')}
                            </span>
                          </label>
                        </div>
                      </fieldset>
                      {!formData.salvamentoAplica && (
                        <p className="mt-2 font-body text-xs text-amber-700 dark:text-amber-400">
                          {tUi('salvageRequiredHint')}
                        </p>
                      )}
                    </Campo>

                    {salvamentoAplicaSeleccionado && (
                      <>
                        <Campo label={tUi('salvageValue')}>
                          <InputMonedaExpress
                            id="valorSalvamento"
                            name="valorSalvamento"
                            value={formData.valorSalvamento}
                            onChange={handleChange}
                            placeholder={tUi('salvageValuePlaceholder')}
                          />
                        </Campo>
                        <Campo label={tUi('salvageDocs')}>
                          <DropzoneFenix
                            getRootProps={getSalvamentoRootProps}
                            getInputProps={getSalvamentoInputProps}
                            isDragActive={isSalvamentoDragActive}
                          />
                          <ExpressListaAnexos
                            listaExistentes={existingSalvamentoAnexos}
                            listaNuevos={formData.salvamentoAnexos}
                            onRemoveExistente={removeExistingSalvamentoAnexo}
                            onRemoveNuevo={removeSalvamentoAnexo}
                            onAviso={mostrarAviso}
                          />
                        </Campo>
                      </>
                    )}

                    {salvamentoNoAplica && (
                      <p className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 font-body text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                        {tUi('salvageNotAppliedPrefix')} <strong>{tUi('doesNotApply')}</strong>
                        {tUi('salvageNotAppliedSuffix')}
                      </p>
                    )}
                  </>,
                  'order-6 lg:col-span-6 xl:col-span-4'
                )}
                </div>
              </div>

              <div className="contents">
                {bloque(
                  tUi('sections.claimInfo'),
                  <div className={grid2}>
                <Campo label={tUi('insurer')} required>
                  <SelectFenix
                    id="aseguradora"
                    name="aseguradora"
                    value={formData.aseguradora}
                    onChange={handleChange}
                    required
                  >
                    {mappedAseguradoras.length === 0 ? (
                      <option value="">{tUi('loadingInsurer')}</option>
                    ) : (
                      mappedAseguradoras.map((aseg, index) => (
                        <option key={aseg.key ?? `${aseg.value}-${index}`} value={aseg.value}>
                          {aseg.label}
                        </option>
                      ))
                    )}
                  </SelectFenix>
                </Campo>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className={`${expressBtnGhost} !justify-start !px-0 !py-0 text-sm`}
                    onClick={abrirModalIntermediario}
                  >
                    <FaPlus className="mr-1.5 inline" />
                    {tUi('addBroker')}
                  </button>
                  <Campo label={tUi('broker')}>
                    <SelectFenix
                      id="intermediario"
                      name="intermediario"
                      value={formData.intermediario}
                      onChange={handleChange}
                    >
                      <option value="">{t('common.select')}</option>
                      {opcionesIntermediario.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </SelectFenix>
                  </Campo>
                </div>
                <Campo label={tUi('city')} required>
                  <SelectFenix
                    id="ciudadSiniestro"
                    name="ciudadSiniestro"
                    value={formData.ciudadSiniestro}
                    onChange={handleChange}
                    required
                  >
                    <option value="">{t('common.select')}</option>
                    {mappedCiudades.map((ciudad, index) => (
                      <option key={ciudad.key ?? `${ciudad.value}-${index}`} value={ciudad.value}>
                        {ciudad.label}
                      </option>
                    ))}
                  </SelectFenix>
                </Campo>
                <Campo label={tUi('insuredBeneficiary')} required>
                  <InputFenix
                    id="aseguradoBeneficiario"
                    name="aseguradoBeneficiario"
                    value={formData.aseguradoBeneficiario}
                    onChange={handleChange}
                    required
                  />
                </Campo>
                <Campo label={tUi('idNumber')}>
                  <InputFenix
                    id="nit"
                    name="nit"
                    value={formData.nit}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('analyst')}>
                  <SelectFenix
                    id="analista"
                    name="analista"
                    value={formData.analista}
                    onChange={handleChange}
                  >
                    <option value="">{t('common.select')}</option>
                    {opcionesAnalista.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </SelectFenix>
                </Campo>
                  </div>,
                  'order-2 lg:col-span-6'
                )}

                {bloque(
                  tUi('sections.milestones'),
                  <>
                    <p className="mb-3 font-body text-xs text-gray-500 dark:text-gray-400 sm:col-span-2">
                      {tUi('milestonesHint')}
                    </p>
                    <div className={gridHitos}>
                <Campo label={tUi('dates.claimDate')}>
                  <InputFenix
                    id="fechaSiniestro"
                    name="fechaSiniestro"
                    type="date"
                    value={formData.fechaSiniestro}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.noticeToCompany')}>
                  <InputFechaHoraExpress
                    id="avisoSiniestroCompania"
                    name="avisoSiniestroCompania"
                    value={formData.avisoSiniestroCompania}
                    onChange={handleChange}
                  />
                  <p className="mt-1.5 font-body text-xs text-gray-500 dark:text-gray-400">
                    {tUi('noticeToCompanyOptionalHint')}
                  </p>
                </Campo>
                <Campo label={tUi('dates.noticeToAdjuster')} required>
                  <InputFechaHoraExpress
                    id="avisoSiniestro"
                    name="avisoSiniestro"
                    value={formData.avisoSiniestro}
                    onChange={handleChange}
                    required
                  />
                </Campo>
                <Campo label={tUi('dates.initialDocRequest')}>
                  <InputFechaHoraExpress
                    id="fechaSolicitudDocumentos"
                    name="fechaSolicitudDocumentos"
                    value={formData.fechaSolicitudDocumentos}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.lastDocument')}>
                  <InputFechaHoraExpress
                    id="fechaUltimoDocumento"
                    name="fechaUltimoDocumento"
                    value={formData.fechaUltimoDocumento}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.acknowledgment')}>
                  <InputFechaHoraExpress
                    id="fechaAcuseReciboDocumentos"
                    name="fechaAcuseReciboDocumentos"
                    value={formData.fechaAcuseReciboDocumentos}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.caseDefinition')}>
                  <InputFechaHoraExpress
                    id="fechaDefinicionCaso"
                    name="fechaDefinicionCaso"
                    value={formData.fechaDefinicionCaso}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.additionalDocsRequest')}>
                  <InputFechaHoraExpress
                    id="fechaSolicitudDocumentosAdicionales"
                    name="fechaSolicitudDocumentosAdicionales"
                    value={formData.fechaSolicitudDocumentosAdicionales}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.pendingDocsRequest')}>
                  <InputFechaHoraExpress
                    id="fechaSolicitudDocumentosPendientes"
                    name="fechaSolicitudDocumentosPendientes"
                    value={formData.fechaSolicitudDocumentosPendientes}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.analystResponse')}>
                  <InputFechaHoraExpress
                    id="fechaRespuestaAnalista"
                    name="fechaRespuestaAnalista"
                    value={formData.fechaRespuestaAnalista}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.figuresPresentation')}>
                  <InputFechaHoraExpress
                    id="fechaPresentacionCifras"
                    name="fechaPresentacionCifras"
                    value={formData.fechaPresentacionCifras}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('reconsiderationApplies')}>
                  <fieldset className="space-y-2 border-0 p-0">
                    <legend className="sr-only">{tUi('reconsiderationLegend')}</legend>
                    <div className="flex flex-wrap gap-4">
                      <label className={expressRadioOption}>
                        <input
                          type="radio"
                          name="reconsideracionAplicaRadio"
                          value="aplica"
                          checked={reconsideracionAplicaSeleccionado}
                          onChange={handleReconsideracionAplicaChange}
                          className="accent-fenix-primario"
                        />
                        <span className="font-body text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {tUi('applies')}
                        </span>
                      </label>
                      <label className={expressRadioOption}>
                        <input
                          type="radio"
                          name="reconsideracionAplicaRadio"
                          value="no_aplica"
                          checked={reconsideracionNoAplica}
                          onChange={handleReconsideracionAplicaChange}
                          className="accent-fenix-primario"
                        />
                        <span className="font-body text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {tUi('doesNotApply')}
                        </span>
                      </label>
                    </div>
                  </fieldset>
                  {reconsideracionNoAplica && (
                    <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
                      {tUi('reconsiderationNotAppliedHint')}
                    </p>
                  )}
                </Campo>
                {!reconsideracionNoAplica && (
                  <Campo label={tUi('dates.reconsideration')}>
                    <InputFechaHoraExpress
                      id="fechaReconsideracion"
                      name="fechaReconsideracion"
                      value={formData.fechaReconsideracion}
                      onChange={handleChange}
                    />
                  </Campo>
                )}
                <Campo label={tUi('dates.signedSettlements')}>
                  <InputFenix
                    id="fechaFiniquitosFirmado"
                    name="fechaFiniquitosFirmado"
                    type="date"
                    value={formData.fechaFiniquitosFirmado}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.paymentDocs')}>
                  <InputFechaHoraExpress
                    id="fechaDocumentosPago"
                    name="fechaDocumentosPago"
                    value={formData.fechaDocumentosPago}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.reminder')}>
                  <InputFechaHoraExpress
                    id="fechaRecordatorio"
                    name="fechaRecordatorio"
                    value={formData.fechaRecordatorio}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label={tUi('dates.notificationEmail')} className="sm:col-span-2">
                  <InputFenix
                    id="correoNotificacion"
                    name="correoNotificacion"
                    type="email"
                    value={formData.correoNotificacion}
                    onChange={handleChange}
                  />
                </Campo>
                    </div>
                  </>,
                  'order-3 lg:col-span-12'
                )}

                <div className="contents">
                {bloque(
                  tUi('sections.status'),
                  <>
                    <fieldset className="space-y-2 border-0 p-0">
                      <legend className="sr-only">{tUi('statusLegend')}</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {estadosExpress.map((estado, index) => (
                          <label key={`${estado.value}-${index}`} className={expressRadioOption}>
                            <input
                              type="radio"
                              name="estadoProcesoRadio"
                              value={estado.value}
                              checked={formData.estadoProceso === estado.value}
                              onChange={handleRadioChange}
                              required
                              className="accent-fenix-primario"
                            />
                            <span className="font-body text-sm text-gray-800 dark:text-gray-200">
                              {estado.label}
                            </span>
                          </label>
                        ))}
                      </div>
                      {estadosExpress.length === 0 && (
                        <p className="font-body text-sm italic text-gray-500">
                          {tUi('noStatusesConfigured')}
                        </p>
                      )}
                    </fieldset>
                  </>,
                  'order-5 lg:col-span-6 xl:col-span-4'
                )}
                </div>
              </div>
            </div>

            <footer className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-body text-sm text-gray-500">
                <span className="text-fenix-primario">*</span> {tUi('requiredFieldsFooter')}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={expressBtnGhost}
                  onClick={() => {
                    resetFormulario();
                    setSuccess(null);
                  }}
                  disabled={loading}
                >
                  {initialData ? tUi('reset') : tUi('clear')}
                </button>
                <button type="submit" className={expressBtnPrimary} disabled={loading}>
                  {formSubmitLabel}
                </button>
              </div>
            </footer>
          </form>

          {error && <div className={`mx-5 mb-5 sm:mx-6 ${expressAlertError}`}>{error}</div>}
          {success && <div className={`mx-5 mb-5 sm:mx-6 ${expressAlertSuccess}`}>{success}</div>}
        </section>
      </div>

      <ExpressModal
        open={modalIntermediarioOpen}
        onClose={cerrarModalIntermediario}
        title={tUi('addBrokerModalTitle')}
      >
        <div className="space-y-4 p-4 sm:p-6">
          <Campo label={tUi('brokerName')} required>
            <InputFenix
              value={nuevoIntermediario}
              onChange={(e) => setNuevoIntermediario(e.target.value)}
              placeholder={tUi('brokerNamePlaceholder')}
              disabled={guardandoIntermediario}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  guardarNuevoIntermediario();
                }
              }}
            />
          </Campo>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={cerrarModalIntermediario}
              disabled={guardandoIntermediario}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={expressBtnPrimary}
              onClick={guardarNuevoIntermediario}
              disabled={guardandoIntermediario || !nuevoIntermediario.trim()}
            >
              {guardandoIntermediario ? t('express.form.saving') : tUi('add')}
            </button>
          </div>
        </div>
      </ExpressModal>

      <ExpressAvisoModal
        open={avisoModal.open}
        onClose={cerrarAviso}
        titulo={avisoModal.titulo}
        mensaje={avisoModal.mensaje}
        tipo={avisoModal.tipo}
      />
    </div>
  );
};

export default SubcomponenteExpress;
