import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorSegurosAlfa from './LiquidadorSegurosAlfa.jsx';
import InformeUnicoSegurosAlfa from './InformeUnicoSegurosAlfa.jsx';
import AlfaSharePointSyncBanner from './AlfaSharePointSyncBanner.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  getCasoAlfaById,
  guardarInformeUnicoEnCasoAlfa,
  guardarLiquidadorEnCasoAlfa,
  setSharePointEnabledAlfa,
} from '../../services/segurosAlfaService.js';
import { calcularLiquidacionAlfa, mapCasoAlfaALiquidador } from './liquidadorAlfaHelpers.js';
import {
  fusionarLiquidadorSinPerderPresupuestoNsr,
  preferirLiquidadorMasRico,
  scoreContenidoLiquidadorNsr,
} from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import { eliminarBorradorArnald } from '../../services/arnaldPlataformaService.js';
import { borrarBorradorLocal } from '../../services/arnaldDraftLocalStore.js';
import {
  generarInformeCatAlfaExcelBlob,
} from './generarInformeCatAlfaExcel.js';
import {
  archivarBlobEnCasoAlfa,
  MIME_ARCHIVO_ALFA,
} from './archivarDocumentoAlfa.js';
import useAlfaCasoAutosave from '../../hooks/useAlfaCasoAutosave.js';
import useAlfaSharePointSyncStatus from '../../hooks/useAlfaSharePointSyncStatus.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_ALFA = {
  LIQUIDADOR: 'liquidador',
  INFORME: 'informe',
};

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace Alfa (estilo catastrófico): un solo caso con menú de pills
 * — Liquidador | Informe único —
 */
export default function CasoSegurosAlfaWorkspace({ tabInicial = null } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');

  const tabActivo = useMemo(() => {
    const raw = tabFromQuery || tabInicial || TABS_ALFA.LIQUIDADOR;
    return raw === TABS_ALFA.INFORME || raw === 'informe-unico'
      ? TABS_ALFA.INFORME
      : TABS_ALFA.LIQUIDADOR;
  }, [tabInicial, tabFromQuery]);

  // Sincroniza ?tab= al entrar por rutas legacy (/liquidador, /informe-unico)
  useEffect(() => {
    if (tabFromQuery || !tabInicial) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabInicial === TABS_ALFA.INFORME ? TABS_ALFA.INFORME : TABS_ALFA.LIQUIDADOR);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [casoAlfa, setCasoAlfa] = useState(location.state?.casoAlfa ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [informeState, setInformeState] = useState(null);
  /** Evita montar el liquidador vacío antes de traer el caso del API (autoguardado lo podía pisar). */
  const [cargandoCaso, setCargandoCaso] = useState(() => Boolean(casoIdFromQuery));
  const [casoHidratado, setCasoHidratado] = useState(() => !casoIdFromQuery);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const [restoreNonce, setRestoreNonce] = useState(0);

  const casoId = casoAlfa?._id || casoIdFromQuery || null;
  const archivosCountPrev = useRef(null);

  const aplicarCasoCargado = useCallback((caso) => {
    setCasoAlfa(caso || null);
    // Siempre tomar liquidador/informe del servidor al abrir (no cascarón local)
    if (caso?.liquidador) {
      const liqServidor = mapCasoAlfaALiquidador(caso);
      setLiquidadorState(liqServidor);
      setTotalesState(calcularLiquidacionAlfa(liqServidor));
    } else {
      setLiquidadorState(null);
      setTotalesState(null);
    }
    setInformeState(caso?.informeUnico && typeof caso.informeUnico === 'object' ? caso.informeUnico : null);
    setCasoHidratado(true);
    setRestoreNonce((n) => n + 1);
  }, []);

  const {
    summary: spSummary,
    loading: spLoading,
    refresh: refreshSharePoint,
    boostPolling,
    justSynced,
    dismissJustSynced,
    hasActivity: spHasActivity,
    pendingTotal: spPendingTotal,
    documents: spDocuments,
  } = useAlfaSharePointSyncStatus(casoId, { enabled: Boolean(casoId) });

  const handleSharePointEnabled = useCallback(
    async (archivoId, enabled) => {
      await setSharePointEnabledAlfa(casoId, archivoId, enabled);
      await refreshSharePoint();
      if (enabled) boostPolling();
    },
    [boostPolling, casoId, refreshSharePoint]
  );

  useEffect(() => {
    const n = Array.isArray(casoAlfa?.archivos) ? casoAlfa.archivos.length : 0;
    if (archivosCountPrev.current != null && n > archivosCountPrev.current) {
      boostPolling();
    }
    archivosCountPrev.current = n;
  }, [casoAlfa?.archivos, boostPolling]);

  useEffect(() => {
    setLiquidadorState(null);
    setTotalesState(null);
    setInformeState(null);
    setCasoHidratado(false);
  }, [casoIdFromQuery]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      // Siempre priorizar API por id (el state del listado puede venir sin liquidador completo)
      if (!casoIdFromQuery) {
        if (location.state?.casoAlfa && !cancelado) {
          aplicarCasoCargado(location.state.casoAlfa);
        } else if (!cancelado) {
          setCasoHidratado(true);
        }
        return;
      }
      setCargandoCaso(true);
      setCasoHidratado(false);
      setError('');
      try {
        const caso = await getCasoAlfaById(casoIdFromQuery);
        if (!cancelado) aplicarCasoCargado(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || t('segurosAlfa.workspace.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
    // Solo al cambiar de caso — no rehidratar por cambios de location.state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoIdFromQuery, t, aplicarCasoCargado]);

  const setTab = useCallback(
    (tab) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      if (casoId) next.set('casoId', casoId);
      setSearchParams(next, { replace: true });
      setMensaje('');
      setError('');
    },
    [casoId, searchParams, setSearchParams]
  );

  const subtitulo = useMemo(() => {
    if (casoAlfa?.tomador || casoAlfa?.siniestro) {
      return `${casoAlfa.tomador || '—'}${casoAlfa.consecutivo ? ` · ${casoAlfa.consecutivo}` : ''}${
        casoAlfa.siniestro ? ` · ${casoAlfa.siniestro}` : ''
      }`;
    }
    return t('segurosAlfa.workspace.subtitle');
  }, [casoAlfa, t]);

  const appendArchivoAlCaso = useCallback((creado) => {
    if (!creado) return;
    setCasoAlfa((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.archivos) ? prev.archivos : [];
      const id = creado?._id ? String(creado._id) : null;
      if (id) {
        const idx = list.findIndex((a) => String(a._id) === id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = { ...list[idx], ...creado };
          return { ...prev, archivos: next };
        }
      }
      const et = String(creado.etiqueta || '').toUpperCase();
      const ext = String(creado.nombreOriginal || '')
        .toLowerCase()
        .match(/\.([a-z0-9]+)$/)?.[1];
      let filtered = list;
      if (creado.replaced && et && ext) {
        filtered = list.filter((a) => {
          if (String(a._id) === id) return true;
          if (String(a.etiqueta || '').toUpperCase() !== et) return true;
          const aExt = String(a.nombreOriginal || a.nombreArchivo || '')
            .toLowerCase()
            .match(/\.([a-z0-9]+)$/)?.[1];
          return aExt !== ext;
        });
      }
      return { ...prev, archivos: [...filtered, creado] };
    });
    boostPolling();
  }, [boostPolling]);

  /** Excel CAT → archivero ARNALD → cola SharePoint. */
  const archivarExcelCatTrasGuardar = useCallback(
    async ({ caso, liquidador, totales, informe, etiqueta }) => {
      if (!casoId) return null;
      const resultado = await generarInformeCatAlfaExcelBlob({
        caso: caso || casoAlfa || {},
        liquidador: liquidador || liquidadorState || {},
        totales: totales || totalesState || {},
        informe: informe || informeState || casoAlfa?.informeUnico || null,
      });
      const creado = await archivarBlobEnCasoAlfa({
        casoId,
        blob: resultado.blob,
        nombre: resultado.filename || resultado.nombre,
        mime: MIME_ARCHIVO_ALFA.xlsx,
        etiqueta,
      });
      appendArchivoAlCaso(creado);
      return creado;
    },
    [
      appendArchivoAlCaso,
      casoAlfa,
      casoId,
      informeState,
      liquidadorState,
      totalesState,
    ]
  );

  const handleGuardarLiquidador = async (liqArg, totArg) => {
    if (!casoId) {
      setError(t('segurosAlfa.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionAlfa(liquidador || {});
    if (!liquidador) {
      setError(t('segurosAlfa.settlement.noData'));
      return;
    }
    // No permitir guardar un cascarón vacío encima de uno con ítems en el caso
    if (
      scoreContenidoLiquidadorNsr(liquidador) === 0 &&
      scoreContenidoLiquidadorNsr(casoAlfa?.liquidador) > 0
    ) {
      setError(
        'El liquidador en pantalla está vacío y el caso ya tiene ítems guardados. Recargue el caso antes de guardar.'
      );
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      // Guardado explícito: priorizar lo de pantalla; solo proteger contra cascarón vacío
      const liquidadorSeguro = fusionarLiquidadorSinPerderPresupuestoNsr(
        liquidador,
        casoAlfa?.liquidador
      );
      const actualizado = await guardarLiquidadorEnCasoAlfa({
        casoId,
        liquidador: liquidadorSeguro,
        totales,
        casoBase: {
          ...(casoAlfa || {}),
          informeUnico: informeState || casoAlfa?.informeUnico,
        },
      });
      setCasoAlfa(actualizado);
      setLiquidadorState(liquidadorSeguro);
      // Evitar que un borrador local viejo pise el caso al refrescar
      try {
        const draftKey = `alfa-ws:${casoId}`;
        borrarBorradorLocal(draftKey);
        await eliminarBorradorArnald(draftKey);
      } catch {
        /* el caso ya quedó en Mongo */
      }
      try {
        await archivarExcelCatTrasGuardar({
          caso: actualizado,
          liquidador: liquidadorSeguro,
          totales,
          informe: informeState || actualizado?.informeUnico,
          etiqueta: 'LIQUIDACION',
        });
        setMensaje(
          t('segurosAlfa.settlement.savedAndArchived', {
            defaultValue:
              'Liquidador guardado. Excel CAT en archivero: revise y pulse Subir en el banner para SharePoint.',
          })
        );
      } catch (errArchivo) {
        console.error('Archivero tras liquidador:', errArchivo);
        setError(
          `Liquidador guardado, pero NO se archivó el Excel: ${
            errArchivo?.message || 'error'
          }`
        );
      }
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.settlement.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarInforme = async (informeArg) => {
    if (!casoId) {
      setError(t('segurosAlfa.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('segurosAlfa.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      // Solo actualiza informe — el service no envía liquidador
      const actualizado = await guardarInformeUnicoEnCasoAlfa({
        casoId,
        informeUnico: informe,
        casoBase: casoAlfa || {},
      });
      setCasoAlfa(actualizado);
      setInformeState(actualizado?.informeUnico || informe);
      // Si el servidor devolvió liquidador, mantener el más rico en memoria
      if (actualizado?.liquidador) {
        setLiquidadorState((prev) => preferirLiquidadorMasRico(prev, actualizado.liquidador));
      }
      try {
        await archivarExcelCatTrasGuardar({
          caso: actualizado,
          liquidador: preferirLiquidadorMasRico(
            liquidadorState,
            actualizado?.liquidador
          ),
          totales: totalesState,
          informe: actualizado?.informeUnico || informe,
          etiqueta: 'INFORME',
        });
        setMensaje(
          t('segurosAlfa.reportUnique.savedAndArchived', {
            defaultValue:
              'Informe guardado. Excel CAT en archivero: revise y pulse Subir en el banner para SharePoint.',
          })
        );
      } catch (errArchivo) {
        console.error('Archivero tras informe:', errArchivo);
        setError(
          `Informe guardado, pero NO se archivó el Excel: ${
            errArchivo?.message || 'error'
          }`
        );
      }
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.reportUnique.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarActual = () => {
    if (tabActivo === TABS_ALFA.INFORME) return handleGuardarInforme();
    return handleGuardarLiquidador();
  };

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoAlfa(actualizado);
  }, []);

  useAlfaCasoAutosave({
    casoId,
    casoAlfa,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    onCasoActualizado: onCasoDesdeAutosave,
    enabled: Boolean(casoId) && !cargandoCaso && casoHidratado,
  });

  const draftPayload = useMemo(
    () => ({ liquidador: liquidadorState, totales: totalesState, informe: informeState }),
    [liquidadorState, totalesState, informeState]
  );
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey: casoId ? `alfa-ws:${casoId}` : '',
    modulo: 'alfa',
    recursoId: casoId || '',
    titulo: 'Workspace Alfa',
    formData: draftPayload,
    enabled: Boolean(casoId) && !cargandoCaso && casoHidratado,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Seguros Alfa
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('segurosAlfa.workspace.title')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {casoId && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={
                  guardando ||
                  (tabActivo === TABS_ALFA.INFORME ? !informeState : !liquidadorState)
                }
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('segurosAlfa.workspace.saving')
                  : t('segurosAlfa.workspace.saveCurrent')}
              </button>
            )}
            <Link to="/seguros-alfa/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('segurosAlfa.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {t('segurosAlfa.workspace.pickCase')}{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => navigate('/seguros-alfa/reporte')}
            >
              {t('segurosAlfa.workspace.goReport')}
            </button>
          </p>
        )}

        {mensaje && (
          <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>
        )}
        {error && (
          <p className={`mb-4 ${expressAlertError}`}>{error}</p>
        )}

        {casoId && (
          <AlfaSharePointSyncBanner
            summary={spSummary}
            loading={spLoading}
            hasActivity={spHasActivity}
            pendingTotal={spPendingTotal}
            justSynced={justSynced}
            documents={spDocuments}
            onRefresh={refreshSharePoint}
            onDismissSynced={dismissJustSynced}
            onSetEnabled={handleSharePointEnabled}
            onOpenArchivero={() =>
              navigate(`/seguros-alfa/reporte?archivero=${encodeURIComponent(casoId)}`)
            }
          />
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ALFA.LIQUIDADOR)}
            onClick={() => setTab(TABS_ALFA.LIQUIDADOR)}
          >
            1. {t('segurosAlfa.workspace.tabSettlement')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ALFA.INFORME)}
            onClick={() => setTab(TABS_ALFA.INFORME)}
          >
            2. {t('segurosAlfa.workspace.tabUniqueReport')}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('segurosAlfa.workspace.loading')}</p>
            ) : tabActivo === TABS_ALFA.INFORME ? (
              <InformeUnicoSegurosAlfa
                key={`inf-${casoId}-${restoreNonce}`}
                casoAlfa={casoAlfa}
                liquidadorInicial={liquidadorState}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  // Confiar en lo digitado ahora; solo rellenar huecos desde prev
                  setLiquidadorState((prev) =>
                    fusionarLiquidadorSinPerderPresupuestoNsr(liq, prev)
                  );
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoAlfa}
                onArchivoArchivado={boostPolling}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorSegurosAlfa
                key={`liq-${casoId}-${restoreNonce}`}
                casoAlfa={casoAlfa}
                liquidadorInicial={liquidadorState}
                onEstadoChange={(liq, tot) => {
                  setLiquidadorState((prev) =>
                    fusionarLiquidadorSinPerderPresupuestoNsr(liq, prev)
                  );
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarLiquidador : undefined}
                onCasoChange={setCasoAlfa}
                onArchivoArchivado={boostPolling}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
      <ArnaldDraftChrome
        draftStatus={draftStatus}
        lastDraftAt={lastDraftAt}
        consumeDraft={consumeDraft}
        showRestore={showDraftRestore}
        savedDataToRestore={draftToRestore}
        onRestore={() => {
          const data = draftToRestore?.data || {};
          setCasoAlfa((prev) => ({
            ...(prev || {}),
            liquidador: data.liquidador || prev?.liquidador,
            informeUnico: data.informe || prev?.informeUnico,
          }));
          if (data.liquidador) setLiquidadorState(data.liquidador);
          if (data.totales) setTotalesState(data.totales);
          if (data.informe) setInformeState(data.informe);
          setRestoreNonce((n) => n + 1);
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

/** Redirecciones desde rutas antiguas hacia el workspace unificado. */
export function RedirectAlfaLiquidador() {
  return <CasoSegurosAlfaWorkspace tabInicial={TABS_ALFA.LIQUIDADOR} />;
}

export function RedirectAlfaInforme() {
  return <CasoSegurosAlfaWorkspace tabInicial={TABS_ALFA.INFORME} />;
}
