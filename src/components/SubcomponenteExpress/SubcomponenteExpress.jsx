import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FaCalculator, FaPlus } from 'react-icons/fa';
import { BASE_URL } from '../../config/apiConfig.js';
import { sanitizeUploadFileName } from '../../utils/sanitizeUploadFileName.js';
import { normalizeStoredFileReference } from '../../utils/storedFilePath.js';
import {
  fetchExpressCatalogo,
  opcionesCatalogo,
  resolverNombreCatalogo,
} from '../../services/expressCatalogoService.js';
import { ordenarLista, resolverCodigoResponsable, resolverCodigoAseguradora, resolverCodigoEstado, formatDate } from './expressHelpers.js';
import { esResponsableExpressPermitido } from '../../config/expressCatalogosPermitidos.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressCard,
  expressCardBody,
  expressCardHeader,
  expressFormSection,
  expressHint,
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
  fechaSolicitudCorrecciones: '',
  fechaCorreccionesPresentadas: '',
  fechaPresentacionCifras: '',
  fechaDocumentosPago: '',
  fechaFiniquitosFirmado: '',
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
    titulo: 'Atención',
    mensaje: '',
    tipo: 'warning',
  });
  const [modalIntermediarioOpen, setModalIntermediarioOpen] = useState(false);
  const [nuevoIntermediario, setNuevoIntermediario] = useState('');
  const [guardandoIntermediario, setGuardandoIntermediario] = useState(false);

  const toDateInputValue = useCallback((value) => formatDate(value), []);
  const toDateTimeInputValue = useCallback((value) => formatearFechaHoraParaInput(value), []);

  const toInputTextValue = useCallback((value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  }, []);

  const toInputNumberValue = useCallback((value) => {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
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
        fechaSolicitudCorrecciones: toDateTimeInputValue(data.fechaSolicitudCorrecciones),
        fechaCorreccionesPresentadas: toDateTimeInputValue(data.fechaCorreccionesPresentadas),
        fechaPresentacionCifras: toDateTimeInputValue(data.fechaPresentacionCifras),
        fechaDocumentosPago: toDateTimeInputValue(data.fechaDocumentosPago),
        fechaFiniquitosFirmado: toDateInputValue(data.fechaFiniquitosFirmado),
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
  const formSubmitLabel = loading ? 'Guardando…' : isEditing ? 'Actualizar' : 'Guardar';
  const headerTitle = isEditing ? 'Editar proceso Express' : 'Carga de procesos Express';
  const headerSubtitle = isEditing
    ? 'Actualiza la información del siniestro y sus documentos soporte.'
    : 'Centralice la información del siniestro y cargue documentos en un solo paso.';

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

    const { anexos, salvamentoAnexos, _id, consecutivo, ...payload } = data;
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

  const mostrarAviso = useCallback((mensaje, titulo = 'Atención', tipo = 'warning') => {
    setAvisoModal({ open: true, titulo, mensaje, tipo });
  }, []);

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
      mostrarAviso('Escriba el nombre del intermediario.', 'Intermediario', 'warning');
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
        throw new Error(data.error || data.message || 'No se pudo agregar el intermediario');
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
        `Intermediario «${nombreCreado}» agregado al banco de intermediarios.`,
        'Listo',
        'success'
      );
    } catch (err) {
      mostrarAviso(err?.message || 'No se pudo agregar el intermediario.', 'Error', 'error');
    } finally {
      setGuardandoIntermediario(false);
    }
  }, [nuevoIntermediario, mostrarAviso]);

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
        'Debe indicar si el salvamento Aplica o No aplica antes de guardar.',
        'Salvamento incompleto',
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
          ? 'Información actualizada correctamente.'
          : documento?.consecutivo
            ? `Información guardada. Consecutivo asignado: ${documento.consecutivo}`
            : 'Información guardada correctamente.'
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
      setError(err.message || 'Error inesperado al guardar.');
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
                  Cancelar
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
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">Ficha del siniestro</h2>
            <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">
              Los campos con asterisco son obligatorios.
            </p>
          </div>

          <form id="formulario-express" className={expressCardBody} onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              <div className="contents">
                {bloque(
                  'Datos administrativos',
                  <div className={grid2}>
                {isEditing && formData.consecutivo && (
                  <Campo label="Consecutivo" className="sm:col-span-2">
                    <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-body text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                      {formData.consecutivo}
                      <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                        (asignado por la plataforma)
                      </span>
                    </p>
                  </Campo>
                )}
                <Campo label="Responsable" required>
                  <SelectFenix
                    id="responsable"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {mappedResponsables.map((resp, index) => (
                      <option key={resp.key ?? `${resp.value}-${index}`} value={resp.value}>
                        {resp.label}
                      </option>
                    ))}
                  </SelectFenix>
                </Campo>
                <Campo label="Código Workflow">
                  <InputFenix
                    id="codigoWorkflow"
                    name="codigoWorkflow"
                    value={formData.codigoWorkflow}
                    onChange={handleChange}
                    placeholder="Ej: WF-12345"
                  />
                </Campo>
                <Campo label="Número de siniestro" required>
                  <InputFenix
                    id="numeroSiniestro"
                    name="numeroSiniestro"
                    value={formData.numeroSiniestro}
                    onChange={handleChange}
                    required
                  />
                </Campo>
                <Campo label="Amparo" required>
                  <SelectFenix
                    id="amparo"
                    name="amparo"
                    value={formData.amparo}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {opcionesAmparo.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </SelectFenix>
                </Campo>
                <Campo label="Valor indemnización">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <InputFenix
                      id="valorIndemnizacion"
                      name="valorIndemnizacion"
                      type="text"
                      inputMode="decimal"
                      value={formData.valorIndemnizacion}
                      onChange={handleChange}
                      placeholder="Ej: 1.250.000,50"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      className={expressBtnGhost}
                      onClick={() => {
                        if (!formData._id) {
                          mostrarAviso(
                            'Guarde el caso primero para poder almacenar el liquidador en documentos.',
                            'Caso sin guardar',
                            'warning'
                          );
                          return;
                        }
                        navigate(`/express/liquidador?casoId=${formData._id}`);
                      }}
                      title="Abrir liquidador y guardar documentos en el caso"
                    >
                      <FaCalculator />
                      Liquidador
                    </button>
                  </div>
                </Campo>
                <Campo label="Reserva">
                  <InputFenix
                    id="reserva"
                    name="reserva"
                    type="text"
                    inputMode="decimal"
                    value={formData.reserva}
                    onChange={handleChange}
                    placeholder="Ej: 3.999.999 o 3999999,50"
                  />
                </Campo>
                  </div>,
                  'order-1 lg:col-span-6'
                )}

                {bloque(
                  'Observaciones y anexos',
                  <>
                    <Campo label="Observaciones y seguimiento">
                      <TextareaFenix
                        id="observacionesSeguimiento"
                        name="observacionesSeguimiento"
                        value={formData.observacionesSeguimiento}
                        onChange={handleChange}
                        rows={5}
                        placeholder="Describa las gestiones realizadas o pendientes…"
                      />
                    </Campo>
                    <Campo label="Anexo informe">
                      <DropzoneFenix
                        getRootProps={getRootProps}
                        getInputProps={getInputProps}
                        isDragActive={isDragActive}
                      />
                      <ExpressListaAnexos
                        listaExistentes={existingAnexos}
                        listaNuevos={formData.anexos}
                        onRemoveExistente={removeExistingAnexo}
                        onRemoveNuevo={removeAnexo}
                        onAviso={mostrarAviso}
                      />
                    </Campo>
                  </>,
                  'order-4 lg:col-span-6 xl:col-span-4'
                )}

                <div className="contents">
                {bloque(
                  'Salvamento',
                  <>
                    <Campo label="¿Salvamento aplica en este caso?" required>
                      <fieldset className="space-y-2 border-0 p-0">
                        <legend className="sr-only">Salvamento aplica o no aplica</legend>
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
                              Aplica
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
                              No aplica
                            </span>
                          </label>
                        </div>
                      </fieldset>
                      {!formData.salvamentoAplica && (
                        <p className="mt-2 font-body text-xs text-amber-700 dark:text-amber-400">
                          Debe seleccionar Aplica o No aplica antes de guardar.
                        </p>
                      )}
                    </Campo>

                    {salvamentoAplicaSeleccionado && (
                      <>
                        <Campo label="Valor del salvamento">
                          <InputFenix
                            id="valorSalvamento"
                            name="valorSalvamento"
                            type="text"
                            inputMode="decimal"
                            value={formData.valorSalvamento}
                            onChange={handleChange}
                            placeholder="Ej: 1.250.000 o 1250000,50"
                          />
                        </Campo>
                        <Campo label="Documentos de salvamento">
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
                        Registrado como <strong>No aplica</strong>. No se requiere valor ni documentos de
                        salvamento.
                      </p>
                    )}
                  </>,
                  'order-6 lg:col-span-6 xl:col-span-4'
                )}
                </div>
              </div>

              <div className="contents">
                {bloque(
                  'Información del siniestro',
                  <div className={grid2}>
                <Campo label="Aseguradora" required>
                  <SelectFenix
                    id="aseguradora"
                    name="aseguradora"
                    value={formData.aseguradora}
                    onChange={handleChange}
                    required
                  >
                    {mappedAseguradoras.length === 0 ? (
                      <option value="">Cargando Zürich…</option>
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
                    Agregar intermediario
                  </button>
                  <Campo label="Intermediario">
                    <SelectFenix
                      id="intermediario"
                      name="intermediario"
                      value={formData.intermediario}
                      onChange={handleChange}
                    >
                      <option value="">Seleccionar…</option>
                      {opcionesIntermediario.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </SelectFenix>
                  </Campo>
                </div>
                <Campo label="Ciudad siniestro" required>
                  <SelectFenix
                    id="ciudadSiniestro"
                    name="ciudadSiniestro"
                    value={formData.ciudadSiniestro}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {mappedCiudades.map((ciudad, index) => (
                      <option key={ciudad.key ?? `${ciudad.value}-${index}`} value={ciudad.value}>
                        {ciudad.label}
                      </option>
                    ))}
                  </SelectFenix>
                </Campo>
                <Campo label="Asegurado o beneficiario" required>
                  <InputFenix
                    id="aseguradoBeneficiario"
                    name="aseguradoBeneficiario"
                    value={formData.aseguradoBeneficiario}
                    onChange={handleChange}
                    required
                  />
                </Campo>
                <Campo label="Cédula / NIT">
                  <InputFenix
                    id="nit"
                    name="nit"
                    value={formData.nit}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Analista">
                  <SelectFenix
                    id="analista"
                    name="analista"
                    value={formData.analista}
                    onChange={handleChange}
                  >
                    <option value="">Seleccionar…</option>
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
                  'Hitos y fechas del proceso',
                  <>
                    <div className={gridHitos}>
                <Campo label="Fecha del siniestro">
                  <InputFenix
                    id="fechaSiniestro"
                    name="fechaSiniestro"
                    type="date"
                    value={formData.fechaSiniestro}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Aviso de siniestro (ajustador)" required>
                  <InputFechaHoraExpress
                    id="avisoSiniestro"
                    name="avisoSiniestro"
                    value={formData.avisoSiniestro}
                    onChange={handleChange}
                    required
                  />
                </Campo>
                <Campo label="Aviso de siniestro (compañía)">
                  <InputFechaHoraExpress
                    id="avisoSiniestroCompania"
                    name="avisoSiniestroCompania"
                    value={formData.avisoSiniestroCompania}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Fecha solicitud de documentos">
                  <InputFechaHoraExpress
                    id="fechaSolicitudDocumentos"
                    name="fechaSolicitudDocumentos"
                    value={formData.fechaSolicitudDocumentos}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Fecha recibo de documentos">
                  <InputFechaHoraExpress
                    id="fechaReciboDocumentos"
                    name="fechaReciboDocumentos"
                    value={formData.fechaReciboDocumentos}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Acuse de recibo de documentación (ANS)">
                  <InputFechaHoraExpress
                    id="fechaAcuseReciboDocumentos"
                    name="fechaAcuseReciboDocumentos"
                    value={formData.fechaAcuseReciboDocumentos}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Recepción último documento (ANS)">
                  <InputFechaHoraExpress
                    id="fechaUltimoDocumento"
                    name="fechaUltimoDocumento"
                    value={formData.fechaUltimoDocumento}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Definición del caso (ANS)">
                  <InputFechaHoraExpress
                    id="fechaDefinicionCaso"
                    name="fechaDefinicionCaso"
                    value={formData.fechaDefinicionCaso}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Solicitud docs. adicionales (ANS)">
                  <InputFechaHoraExpress
                    id="fechaSolicitudDocumentosAdicionales"
                    name="fechaSolicitudDocumentosAdicionales"
                    value={formData.fechaSolicitudDocumentosAdicionales}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Solicitud de correcciones (ANS)">
                  <InputFechaHoraExpress
                    id="fechaSolicitudCorrecciones"
                    name="fechaSolicitudCorrecciones"
                    value={formData.fechaSolicitudCorrecciones}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Correcciones presentadas (ANS)">
                  <InputFechaHoraExpress
                    id="fechaCorreccionesPresentadas"
                    name="fechaCorreccionesPresentadas"
                    value={formData.fechaCorreccionesPresentadas}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Envío autorización analista">
                  <InputFechaHoraExpress
                    id="fechaEnvioAutorizacion"
                    name="fechaEnvioAutorizacion"
                    value={formData.fechaEnvioAutorizacion}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Respuesta analista">
                  <InputFechaHoraExpress
                    id="fechaRespuestaAnalista"
                    name="fechaRespuestaAnalista"
                    value={formData.fechaRespuestaAnalista}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Fecha presentación de cifras">
                  <InputFechaHoraExpress
                    id="fechaPresentacionCifras"
                    name="fechaPresentacionCifras"
                    value={formData.fechaPresentacionCifras}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Documentos para pago montados (ANS)">
                  <InputFechaHoraExpress
                    id="fechaDocumentosPago"
                    name="fechaDocumentosPago"
                    value={formData.fechaDocumentosPago}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Fecha finiquitos firmado">
                  <InputFenix
                    id="fechaFiniquitosFirmado"
                    name="fechaFiniquitosFirmado"
                    type="date"
                    value={formData.fechaFiniquitosFirmado}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Fecha cargue finiquito">
                  <InputFechaHoraExpress
                    id="fechaCargueFiniquito"
                    name="fechaCargueFiniquito"
                    value={formData.fechaCargueFiniquito}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Fecha de cierre">
                  <InputFenix
                    id="fechaCierre"
                    name="fechaCierre"
                    type="date"
                    value={formData.fechaCierre}
                    onChange={handleChange}
                  />
                </Campo>
                <Campo label="Correo de notificación" className="sm:col-span-2">
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
                  'Estado del proceso',
                  <>
                    <fieldset className="space-y-2 border-0 p-0">
                      <legend className="sr-only">Etapa actual</legend>
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
                          No hay estados configurados para Express.
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
                <span className="text-fenix-primario">*</span> Campos obligatorios (incluye Aplica / No
                aplica en salvamento)
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
                  {initialData ? 'Restablecer' : 'Limpiar'}
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
        title="Agregar intermediario"
      >
        <div className="space-y-4 p-4 sm:p-6">
          <Campo label="Nombre del intermediario" required>
            <InputFenix
              value={nuevoIntermediario}
              onChange={(e) => setNuevoIntermediario(e.target.value)}
              placeholder="Ej. Corredor XYZ…"
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
              Cancelar
            </button>
            <button
              type="button"
              className={expressBtnPrimary}
              onClick={guardarNuevoIntermediario}
              disabled={guardandoIntermediario || !nuevoIntermediario.trim()}
            >
              {guardandoIntermediario ? 'Guardando…' : 'Agregar'}
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
