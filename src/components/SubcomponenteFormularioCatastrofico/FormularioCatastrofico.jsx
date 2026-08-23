import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import { fusionarEvaluacionSismicaNSR10Guardada } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import InformeUnicoCatastrofico from './InformeUnicoCatastrofico.jsx';
import {
  crearItemsPresupuestoDesdeCatalogo,
  AIU_PORCENTAJE_DEFAULT,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from './catalogoPresupuestoCatastrofico.js';
import { defaultOtrosAmparos } from '../liquidacion/otrosAmparosLiquidacion.js';
import { descargarBlob, generarWordCatastrofico } from './generarWordCatastrofico.js';
import { sincronizarPresupuestoNsr10AlInforme, formDataConPresupuestoNsr10 } from './syncPresupuestoNsr10AlInforme.js';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';
import ActaInspeccionAjuste from '../SubcomponenteFormularioAjuste/ActaInspeccionAjuste.jsx';
import FotosPreliminarFlotante from '../SubcomponenteFormularioAjuste/FotosPreliminarFlotante.jsx';
import InspeccionFotograficaAjuste from '../SubcomponenteFormularioAjuste/InspeccionFotograficaAjuste.jsx';
import FirmaAjuste from '../SubcomponenteFormularioAjuste/FirmaAjuste.jsx';
import { useTheme } from '../../context/ThemeContext';
import {
  FaArrowLeft,
  FaFileWord,
  FaSave,
  FaStepForward,
} from 'react-icons/fa';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useOfflineAutosave from '../../hooks/useOfflineAutosave.js';
import ConflictDialog from '../offline/ConflictDialog.jsx';
import PrepareOfflineButton from '../offline/PrepareOfflineButton.jsx';
import { OFFLINE_FIRST_ENABLED } from '../../config/autoSaveConfig.js';
import {
  saveFormLocally,
  discardPendingForForm,
  findLocalFormByHistorialId,
  queueSync,
  newClientId,
} from '../../services/offlineDatabase.js';
import { checkConnectivity } from '../../services/connectivityService.js';
import { offlineLog } from '../../offline/offlineLog.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

const ESTADOS = {
  EVALUACION: 'evaluacionSismica',
  ACTA: 'actaInspeccion',
  INFORME: 'informeUnico',
};

function crearFormDataInicial(prefill = {}) {
  return {
    estadoActual: ESTADOS.EVALUACION,
    ciudad: '',
    destinatario: '',
    cargo: '',
    aseguradora: '',
    ciudadDestino: '',
    funcionarioAsigna: '',
    tomador: '',
    vigenciaPoliza: '',
    asegurado: '',
    identificacionActa: '',
    direccionRiesgo: '',
    ubicacionRiesgo: '',
    coordenadasRiesgo: '',
    imagenMapa: null,
    tipoEvento: '',
    tipoRiesgoActa: '',
    tipoSiniestro: '',
    numeroSiniestro: '',
    numeroCaso: '',
    fechaOcurrencia: '',
    fechaSiniestro: '',
    fechaAsignacion: '',
    fechaReporte: '',
    fechaInspeccion: '',
    horaInspeccion: '',
    descripcionRiesgo: '',
    descripcionSiniestro: '',
    actaObservaciones: '',
    antecedentes: '',
    circunstanciasSiniestro: '',
    diagramaCronologiaNota: '',
    cronologiaCatastroficoId: '',
    cronologiaNombre: '',
    cronologiaLeyenda: 'Diagrama cronología de la emergencia',
    imagenCronologia: '',
    departamento: '',
    descripcionDanios: '',
    areaLote: '',
    nivelesInmueble: '',
    claseInmueble: '',
    tipoInmueble: '',
    distribucionInmueble: [],
    espaciosAfectados: [],
    imagenesInspeccion: [],
    observacionesInforme: '',
    nombreFirmante: '',
    cargoFirmante: 'Ajustador de Siniestros',
    indemnizacionSugerida: '',
    actaClienteNombre: '',
    actaClienteCargo: '',
    actaClienteEmail: '',
    actaClienteFirma: '',
    actaAjustadorNombre: '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    presupuestoCatastrofico: {
      items: crearItemsPresupuestoDesdeCatalogo(),
      aiuPorcentaje: AIU_PORCENTAJE_DEFAULT,
      intro:
        'Con base en la inspección técnica realizada en el inmueble afectado, y en atención a las condiciones observadas durante la visita de campo, se elaboró el presente presupuesto de obra, el cual contempla las actividades necesarias para la atención, corrección y restitución de los daños identificados.',
    },
    liquidacionCatastrofico: {
      valorAsegurado: '',
      hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
      hospedajeManual: '',
      deducible: 'No aplica',
    },
    otrosAmparos: defaultOtrosAmparos(),
    metadata: {},
    ...prefill,
    evaluacionSismicaNSR10: (() => {
      const merged = { ...prefill };
      return fusionarEvaluacionSismicaNSR10Guardada(
        prefill.evaluacionSismicaNSR10 || {},
        merged
      );
    })(),
  };
}

export default function FormularioCatastrofico() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [formData, setFormData] = useState(() =>
    crearFormDataInicial(location.state?.prefillDesdeCaso || {})
  );
  const [estadoActual, setEstadoActual] = useState(ESTADOS.EVALUACION);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [historialId, setHistorialId] = useState(id && id !== 'nuevo' ? id : null);
  const [recoveryDraft, setRecoveryDraft] = useState(null);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const [serverLoadedAt, setServerLoadedAt] = useState(null);
  const [offlineReady, setOfflineReady] = useState(!id || id === 'nuevo');
  const serverSnapshotRef = useRef(null);
  const historialIdRef = useRef(historialId);
  const caseIdRef = useRef('');

  useEffect(() => {
    historialIdRef.current = historialId;
  }, [historialId]);

  useEffect(() => {
    caseIdRef.current = String(
      formData?.metadata?.complexId ||
        formData?.casoId ||
        formData?.numeroCaso ||
        location.state?.complexId ||
        ''
    );
  }, [formData, location.state]);

  const getCaseId = useCallback(() => caseIdRef.current, []);
  const getHistorialId = useCallback(() => historialIdRef.current, []);

  const catFormKey = `catastrofico:${id && id !== 'nuevo' ? id : 'nuevo'}`;
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey: catFormKey,
    modulo: 'catastrofico',
    recursoId: historialId || '',
    titulo: 'Formulario catastrófico',
    formData,
    enabled: true,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  const onRecoverDraft = useCallback((draft) => {
    if (!draft?.data) return;
    const pending = draft.syncStatus === 'pending' || draft.syncStatus === 'error';
    if (pending) {
      setRecoveryDraft(draft);
      return;
    }
    // Si hay copia local más reciente que la última carga de servidor
    if (serverLoadedAt && draft.updatedAt && new Date(draft.updatedAt) > new Date(serverLoadedAt)) {
      setRecoveryDraft(draft);
    }
  }, [serverLoadedAt]);

  const { flush: flushOffline } = useOfflineAutosave({
    formType: 'catastrofico',
    formData,
    enabled: OFFLINE_FIRST_ENABLED && offlineReady,
    getCaseId,
    getHistorialId,
    onRecoverDraft,
  });

  const pageBg = theme === 'dark' ? '#0f172a' : '#f8fafc';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';

  useEffect(() => {
    if (estadoActual !== ESTADOS.INFORME) return;
    const sync = sincronizarPresupuestoNsr10AlInforme(formData, { forzar: true });
    if (!sync?.presupuestoCatastrofico) return;
    setFormData((prev) => ({
      ...prev,
      presupuestoCatastrofico: sync.presupuestoCatastrofico,
      indemnizacionSugerida: sync.indemnizacionSugerida,
    }));
    // Solo al entrar al informe / cambiar de pestaña
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoActual]);

  useEffect(() => {
    const prefill = location.state?.prefillDesdeCaso;
    if (prefill && typeof prefill === 'object' && !historialId) {
      setFormData((prev) => ({
        ...prev,
        ...prefill,
        metadata: {
          ...(prev.metadata || {}),
          ...(prefill.metadata || {}),
          complexId: location.state?.complexId || prefill.metadata?.complexId,
          zurichCasoId:
            location.state?.zurichCasoId ||
            prefill.zurichCasoId ||
            prefill.metadata?.zurichCasoId,
          bbvaCatCasoId:
            location.state?.bbvaCatCasoId ||
            prefill.bbvaCatCasoId ||
            prefill.metadata?.bbvaCatCasoId,
          allianzCasoId:
            location.state?.allianzCasoId ||
            location.state?.alliasCasoId ||
            prefill.allianzCasoId ||
            prefill.alliasCasoId ||
            prefill.metadata?.allianzCasoId ||
            prefill.metadata?.alliasCasoId,
          previsoraCasoId:
            location.state?.previsoraCasoId ||
            prefill.previsoraCasoId ||
            prefill.metadata?.previsoraCasoId,
          origen: location.state?.origen || prefill.origen || prev.metadata?.origen,
        },
        presupuestoCatastrofico:
          prev.presupuestoCatastrofico?.items?.length
            ? prev.presupuestoCatastrofico
            : {
                items: crearItemsPresupuestoDesdeCatalogo(),
                aiuPorcentaje: AIU_PORCENTAJE_DEFAULT,
                intro: prev.presupuestoCatastrofico?.intro,
              },
      }));
    }
  }, [location.state, historialId]);

  useEffect(() => {
    let cancelled = false;

    const aplicarDatosCargados = (datos, meta = {}) => {
      setFormData((prev) => ({
        ...crearFormDataInicial(),
        ...prev,
        ...datos,
        evaluacionSismicaNSR10: (() => {
          const merged = { ...prev, ...datos };
          const protegido = fusionarLiquidadorSinPerderPresupuestoNsr(
            { evaluacionSismicaNSR10: datos.evaluacionSismicaNSR10 },
            { evaluacionSismicaNSR10: prev.evaluacionSismicaNSR10 }
          );
          return fusionarEvaluacionSismicaNSR10Guardada(
            protegido.evaluacionSismicaNSR10 || {},
            merged
          );
        })(),
        presupuestoCatastrofico: {
          aiuPorcentaje: AIU_PORCENTAJE_DEFAULT,
          intro:
            'Con base en la inspección técnica realizada en el inmueble afectado, y en atención a las condiciones observadas durante la visita de campo, se elaboró el presente presupuesto de obra, el cual contempla las actividades necesarias para la atención, corrección y restitución de los daños identificados.',
          ...(datos.presupuestoCatastrofico || {}),
          items:
            datos.presupuestoCatastrofico?.items?.length
              ? datos.presupuestoCatastrofico.items
              : prev.presupuestoCatastrofico?.items?.length
                ? prev.presupuestoCatastrofico.items
                : crearItemsPresupuestoDesdeCatalogo(),
        },
      }));
      const estadoRaw = datos.estadoActual || meta.estadoActual;
      const estado =
        estadoRaw === ESTADOS.INFORME
          ? ESTADOS.INFORME
          : estadoRaw === ESTADOS.ACTA
            ? ESTADOS.ACTA
            : ESTADOS.EVALUACION;
      setEstadoActual(estado);
      setHistorialId(meta._id || meta.id || id);
      serverSnapshotRef.current = datos;
      setServerLoadedAt(meta.fechaModificacion || meta.updatedAt || new Date().toISOString());
    };

    const cargar = async () => {
      if (!id || id === 'nuevo') {
        return;
      }
      try {
        const formulario = await historialService.obtenerFormulario(id);
        if (cancelled || !formulario) return;
        const datos = formulario.datos || formulario;
        aplicarDatosCargados(datos, formulario);
        setOfflineReady(true);
      } catch (error) {
        console.error('Error cargando catastrófico:', error);
        if (OFFLINE_FIRST_ENABLED) {
          try {
            const local = await findLocalFormByHistorialId(String(id));
            if (!cancelled && local?.data) {
              offlineLog('SESSION_RECOVERY', { source: 'indexeddb', historialId: id });
              aplicarDatosCargados(local.data, {
                _id: local.historialId || id,
                fechaModificacion: local.updatedAt,
                estadoActual: local.data.estadoActual,
              });
              setMensaje(
                'Sin conexión: mostrando la copia guardada en este dispositivo. Se sincronizará al recuperar red.'
              );
              setOfflineReady(true);
              return;
            }
          } catch {
            // ignore
          }
        }
        if (!cancelled) {
          setMensaje('No se pudo cargar el formulario guardado.');
          setOfflineReady(true);
        }
      }
    };
    cargar();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /** Compatible con Acta/Fotos (campo, valor) y con inputs sintéticos { target }. */
  const handleInputChange = (fieldOrEvent, value) => {
    if (fieldOrEvent && typeof fieldOrEvent === 'object' && fieldOrEvent.target) {
      const { name, value: v } = fieldOrEvent.target;
      if (!name) return;
      setFormData((prev) => ({ ...prev, [name]: v }));
      return;
    }
    if (
      fieldOrEvent &&
      typeof fieldOrEvent === 'object' &&
      !Array.isArray(fieldOrEvent) &&
      value === undefined
    ) {
      setFormData((prev) => ({ ...prev, ...fieldOrEvent }));
      return;
    }
    setFormData((prev) => ({ ...prev, [fieldOrEvent]: value }));
  };

  const handleMapaChange = (nuevaInfoMapa) => {
    const nuevaImagenRaw = nuevaInfoMapa.imagenMapa || nuevaInfoMapa.imagen;
    const tieneNuevaImagen =
      nuevaImagenRaw !== undefined &&
      nuevaImagenRaw !== null &&
      String(nuevaImagenRaw).trim() !== '';

    setFormData((prev) => {
      const next = { ...prev };
      if (nuevaInfoMapa.lat != null && nuevaInfoMapa.lng != null) {
        next.coordenadasRiesgo = `${nuevaInfoMapa.lat}, ${nuevaInfoMapa.lng}`;
      } else if (nuevaInfoMapa.coordenadas) {
        if (typeof nuevaInfoMapa.coordenadas === 'string') {
          next.coordenadasRiesgo = nuevaInfoMapa.coordenadas;
        } else if (
          nuevaInfoMapa.coordenadas.lat != null &&
          nuevaInfoMapa.coordenadas.lng != null
        ) {
          next.coordenadasRiesgo = `${nuevaInfoMapa.coordenadas.lat}, ${nuevaInfoMapa.coordenadas.lng}`;
        }
      }
      if (tieneNuevaImagen) {
        next.imagenMapa = nuevaImagenRaw;
      }
      if (
        nuevaInfoMapa.direccion &&
        !String(prev.direccionRiesgo || '').trim()
      ) {
        next.direccionRiesgo = nuevaInfoMapa.direccion;
      }
      return next;
    });
  };

  const tituloVista = useMemo(() => {
    if (estadoActual === ESTADOS.EVALUACION) return 'Catastrófico · Evaluación sísmica NSR-10';
    if (estadoActual === ESTADOS.ACTA) return 'Catastrófico · Acta de inspección';
    return 'Catastrófico · Informe único';
  }, [estadoActual]);

  const siguientePaso = (desde) => {
    if (desde === ESTADOS.EVALUACION) return ESTADOS.ACTA;
    if (desde === ESTADOS.ACTA) return ESTADOS.INFORME;
    return ESTADOS.INFORME;
  };

  const guardar = async ({ avanzar = false } = {}) => {
    setGuardando(true);
    setMensaje('');
    try {
      const siguienteEstado = avanzar ? siguientePaso(estadoActual) : estadoActual;
      const syncNsr = sincronizarPresupuestoNsr10AlInforme(formData, { forzar: true });
      const datosBase = syncNsr
        ? {
            ...formData,
            presupuestoCatastrofico: syncNsr.presupuestoCatastrofico,
            indemnizacionSugerida: syncNsr.indemnizacionSugerida,
          }
        : formData;
      const datos = {
        ...datosBase,
        estadoActual: siguienteEstado,
        metadata: {
          ...(datosBase.metadata || {}),
          complexId: location.state?.complexId || datosBase.metadata?.complexId,
          numeroAjuste:
            datosBase.metadata?.numeroAjuste ||
            datosBase.numeroCaso ||
            location.state?.nmroAjste ||
            location.state?.numeroCaso,
        },
      };

      const numeroCaso =
        datos.numeroCaso ||
        location.state?.nmroAjste ||
        location.state?.numeroCaso ||
        datos.numeroSiniestro ||
        'SIN-CASO';
      const complexId =
        location.state?.complexId || datos.metadata?.complexId || '';

      const finalizarLocalOk = async () => {
        if (OFFLINE_FIRST_ENABLED) {
          const saved = await flushOffline(datos, { force: true });
          if (!saved) {
            const id = newClientId();
            await saveFormLocally({
              id,
              caseId: String(complexId || numeroCaso),
              formType: 'catastrofico',
              data: datos,
              historialId,
              syncStatus: 'pending',
            });
            await queueSync({
              entityType: 'form',
              entityId: id,
              operation: historialId ? 'UPDATE' : 'CREATE',
              payload: {
                localFormId: id,
                historialId,
                formType: 'catastrofico',
                caseId: String(complexId || numeroCaso),
                data: datos,
                expectedVersion: 1,
                clientId: id,
              },
            });
          }
        }
        if (avanzar) setEstadoActual(siguienteEstado);
        setFormData((prev) => ({ ...prev, ...datosBase, estadoActual: siguienteEstado }));
        const msgAvance =
          siguienteEstado === ESTADOS.ACTA
            ? 'Evaluación guardada en este dispositivo. Continuando al acta (se subirá al recuperar red).'
            : siguienteEstado === ESTADOS.INFORME
              ? 'Acta guardada en este dispositivo. Continuando al informe (se subirá al recuperar red).'
              : 'Guardado en este dispositivo. Se sincronizará al recuperar la conexión.';
        setMensaje(avanzar ? msgAvance : 'Guardado en este dispositivo. Se sincronizará al recuperar la conexión.');
        return { offline: true, local: true };
      };

      const esFalloRedOServidor = (error) => {
        const msg = String(error?.message || error || '');
        return (
          error?.name === 'TypeError' ||
          error?.status >= 500 ||
          /failed to fetch|network|MongoServerSelection|interno del servidor|ECONNREFUSED|timeout|offline/i.test(
            msg
          )
        );
      };

      // Sin red real: no intentar API; IndexedDB + cola
      if (OFFLINE_FIRST_ENABLED) {
        const online = await checkConnectivity({ force: true });
        if (!online) {
          return finalizarLocalOk();
        }
      }

      const payload = {
        tipo: TIPOS_FORMULARIOS.CATASTROFICO,
        titulo: `Informe catastrófico - ${datos.asegurado || numeroCaso}`,
        asegurado: datos.asegurado || '',
        casoId: String(complexId || numeroCaso),
        numeroCaso: String(numeroCaso),
        estado: 'en_proceso',
        estadoActual: siguienteEstado,
        datos: {
          ...datos,
          casoId: String(complexId || numeroCaso),
          numeroCaso: String(numeroCaso),
        },
      };

      let resultado;
      try {
        if (historialId) {
          resultado = await historialService.actualizarFormulario(historialId, payload);
        } else {
          resultado = await historialService.guardarFormulario(payload);
          const nuevoId = resultado?._id || resultado?.id || resultado?.data?._id;
          if (nuevoId) {
            setHistorialId(String(nuevoId));
            navigate(`/catastrofico/editar/${nuevoId}`, {
              replace: true,
              state: location.state,
            });
          }
        }
      } catch (apiError) {
        if (OFFLINE_FIRST_ENABLED && esFalloRedOServidor(apiError)) {
          return finalizarLocalOk();
        }
        throw apiError;
      }

      if (avanzar) setEstadoActual(siguienteEstado);
      setFormData((prev) => ({ ...prev, ...datosBase, estadoActual: siguienteEstado }));
      const msgAvance =
        siguienteEstado === ESTADOS.ACTA
          ? 'Evaluación y presupuesto NSR-10 guardados. Continuando al acta.'
          : siguienteEstado === ESTADOS.INFORME
            ? 'Acta guardada. Continuando al informe único (con el conteo de plata NSR-10).'
            : 'Guardado correctamente.';
      setMensaje(avanzar ? msgAvance : 'Guardado correctamente.');
      return resultado;
    } catch (error) {
      console.error(error);
      setMensaje(error?.message || 'Error al guardar');
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const generarWord = async () => {
    setGenerando(true);
    setMensaje('');
    try {
      // Re-sincroniza NSR-10 → presupuesto antes de armar el Word
      const datosWord = formDataConPresupuestoNsr10(formData);
      setFormData((prev) => ({
        ...prev,
        ...datosWord,
        presupuestoCatastrofico:
          datosWord.presupuestoCatastrofico || prev.presupuestoCatastrofico,
      }));
      await guardar();
      // Usa el snapshot sincronizado (no el estado React aún no flusheado)
      const { blob, fileName } = await generarWordCatastrofico(datosWord, {
        modo: estadoActual === ESTADOS.ACTA ? ESTADOS.ACTA : ESTADOS.INFORME,
      });
      descargarBlob(blob, fileName);
      setMensaje(`Documento generado: ${fileName}`);
    } catch (error) {
      console.error(error);
      setMensaje(error?.message || 'Error al generar Word');
    } finally {
      setGenerando(false);
    }
  };

  const volver = () => {
    const path = location.state?.returnPath || '/complex/mis-casos';
    navigate(path);
  };

  const botonesAccion = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={guardando}
        onClick={() => guardar()}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
      >
        <FaSave /> {guardando ? 'Guardando…' : 'Guardar'}
      </button>
      {estadoActual !== ESTADOS.EVALUACION && (
        <button
          type="button"
          disabled={generando}
          onClick={generarWord}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <FaFileWord /> {generando ? 'Generando…' : 'Generar Word'}
        </button>
      )}
      {estadoActual === ESTADOS.EVALUACION && (
        <button
          type="button"
          disabled={guardando}
          onClick={() => guardar({ avanzar: true })}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <FaStepForward /> Ir al acta
        </button>
      )}
      {estadoActual === ESTADOS.ACTA && (
        <button
          type="button"
          disabled={guardando}
          onClick={() => guardar({ avanzar: true })}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <FaStepForward /> Ir a informe único
        </button>
      )}
      {estadoActual === ESTADOS.ACTA && (
        <button
          type="button"
          onClick={() => setEstadoActual(ESTADOS.EVALUACION)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          style={{ borderColor, color: textPrimary }}
        >
          Volver a evaluación
        </button>
      )}
      {estadoActual === ESTADOS.INFORME && (
        <button
          type="button"
          onClick={() => setEstadoActual(ESTADOS.ACTA)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          style={{ borderColor, color: textPrimary }}
        >
          Volver al acta
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: pageBg }}>
      <div className="mx-auto max-w-6xl space-y-4">
        <header
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          style={{ backgroundColor: cardBg, borderColor }}
        >
          <div>
            <button
              type="button"
              onClick={volver}
              className="mb-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FaArrowLeft /> Volver a Complex
            </button>
            <h1 className="text-xl font-bold" style={{ color: textPrimary }}>
              {tituloVista}
            </h1>
            <p className="text-sm text-slate-500">
              Flujo: evaluación NSR-10 → acta de inspección → informe único.
            </p>
            <div className="mt-2">
              <PrepareOfflineButton
                caseId={caseIdRef.current}
                caseNumber={formData.numeroCaso}
                formType="catastrofico"
                historialId={historialId}
                caseMeta={{ asegurado: formData.asegurado }}
              />
            </div>
          </div>
          {botonesAccion}
        </header>

        {recoveryDraft ? (
          <ConflictDialog
            mode="recovery"
            title="Cambios en este dispositivo"
            message="Encontramos cambios guardados en este dispositivo. ¿Continuar con la versión local o usar la del servidor?"
            localUpdatedAt={recoveryDraft.updatedAt}
            serverUpdatedAt={serverLoadedAt}
            onKeepLocal={() => {
              setFormData((prev) => ({
                ...prev,
                ...(recoveryDraft.data || {}),
              }));
              setRecoveryDraft(null);
            }}
            onUseServer={() => {
              if (serverSnapshotRef.current) {
                setFormData((prev) => ({
                  ...prev,
                  ...serverSnapshotRef.current,
                }));
              }
              if (recoveryDraft.id) {
                discardPendingForForm(recoveryDraft.id).catch(() => {});
                saveFormLocally({
                  id: recoveryDraft.id,
                  caseId: recoveryDraft.caseId,
                  formType: 'catastrofico',
                  data: serverSnapshotRef.current || recoveryDraft.data,
                  historialId: recoveryDraft.historialId || historialId,
                  syncStatus: 'synced',
                  version: recoveryDraft.dataVersion || 1,
                }).catch(() => {});
              }
              setRecoveryDraft(null);
            }}
            onClose={() => setRecoveryDraft(null)}
          />
        ) : null}

        {mensaje ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            {mensaje}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              estadoActual === ESTADOS.EVALUACION
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
            }`}
            onClick={() => setEstadoActual(ESTADOS.EVALUACION)}
          >
            1. Evaluación NSR-10
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              estadoActual === ESTADOS.ACTA
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
            }`}
            onClick={() => setEstadoActual(ESTADOS.ACTA)}
          >
            2. Acta
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              estadoActual === ESTADOS.INFORME
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
            }`}
            onClick={() => setEstadoActual(ESTADOS.INFORME)}
          >
            3. Informe único
          </button>
        </div>

        <div className="rounded-xl border p-4 md:p-6" style={{ backgroundColor: cardBg, borderColor }}>
          {estadoActual === ESTADOS.EVALUACION ? (
            <ChecklistEvaluacionSismicaNSR10
              formData={formData}
              onInputChange={handleInputChange}
            />
          ) : estadoActual === ESTADOS.ACTA ? (
            <>
              <ActaInspeccionAjuste formData={formData} onInputChange={handleInputChange} />
              <FotosPreliminarFlotante formData={formData} onInputChange={handleInputChange} />
            </>
          ) : (
            <div className="space-y-8">
              <InformeUnicoCatastrofico
                formData={formData}
                onInputChange={handleInputChange}
                onMapaChange={handleMapaChange}
              />
              <InspeccionFotograficaAjuste
                formData={formData}
                onInputChange={handleInputChange}
                numeroSeccion={4}
              />
              <ChecklistEvaluacionSismicaNSR10
                formData={formData}
                onInputChange={handleInputChange}
                modoLiquidador
              />
              <FirmaAjuste formData={formData} onInputChange={handleInputChange} />
            </div>
          )}
        </div>

        <footer
          className="flex flex-wrap items-center justify-end gap-3 rounded-xl border p-4"
          style={{ backgroundColor: cardBg, borderColor }}
        >
          {botonesAccion}
        </footer>
      </div>
      <ArnaldDraftChrome
        draftStatus={draftStatus}
        lastDraftAt={lastDraftAt}
        consumeDraft={consumeDraft}
        showRestore={showDraftRestore}
        savedDataToRestore={draftToRestore}
        onRestore={() => {
          if (draftToRestore?.data) {
            setFormData((prev) => ({ ...prev, ...draftToRestore.data }));
          }
          setShowDraftRestore(false);
        }}
        onDiscard={() => {
          discardDraft();
          setShowDraftRestore(false);
          setDraftToRestore(null);
        }}
        onCancel={() => setShowDraftRestore(false)}
      />
    </div>
  );
}
