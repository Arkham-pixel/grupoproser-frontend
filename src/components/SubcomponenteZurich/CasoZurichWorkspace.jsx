import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaFolderOpen, FaSave } from 'react-icons/fa';
import InspeccionCatZurich from './InspeccionCatZurich.jsx';
import InformeUnicoZurich from './InformeUnicoZurich.jsx';
import LiquidadorZurich from './LiquidadorZurich.jsx';
import ArchiveroZurich from './ArchiveroZurich.jsx';
import FormularioZurich from './FormularioZurich.jsx';
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
  fetchAllCasosZurich,
  getCasoZurichById,
  guardarInformeUnicoEnCasoZurich,
  guardarLiquidadorEnCasoZurich,
} from '../../services/zurichService.js';
import {
  fetchAllCasosZurichListado,
  getCasoZurichListadoById,
  guardarInformeUnicoEnCasoZurichListado,
  guardarLiquidadorEnCasoZurichListado,
} from '../../services/zurichListadoService.js';
import { calcularLiquidacionZurich, defaultInformeUnicoZurich, etiquetaArchivoInformeZurich, mapcasoZurichALiquidador, normalizarTipoInformeZurich, tipoInformeActualZurich } from './liquidadorZurichHelpers.js';
import { serializarPaginasCotizacion } from '../liquidacion/cotizacionPdfLiquidacion.js';
import SelectorTipoInformeZurich from './SelectorTipoInformeZurich.jsx';
import { eliminarBorradorArnald } from '../../services/arnaldPlataformaService.js';
import { borrarBorradorLocal } from '../../services/arnaldDraftLocalStore.js';
import useZurichCasoAutosave from '../../hooks/useZurichCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';
import { ExpressModal } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_ZURICH = {
  CAT: 'cat',
  PRESUPUESTO: 'presupuesto',
  INFORME: 'informe',
  LIQUIDADOR: 'presupuesto',
};

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace Zurich: Encuesta ágil | Presupuesto | Informe
 * El presupuesto alimenta el liquidador del informe final y del único.
 */
export default function CasoZurichWorkspace({ tabInicial = null, origen = 'cat' } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');
  const esModuloListado = origen === 'listado';
  const rutaReporte = esModuloListado ? '/zurich/listado/reporte' : '/zurich/reporte';

  const tabActivo = useMemo(() => {
    const raw = tabFromQuery || tabInicial || (esModuloListado ? TABS_ZURICH.INFORME : TABS_ZURICH.CAT);
    if (raw === TABS_ZURICH.INFORME || raw === 'informe-unico') {
      return TABS_ZURICH.INFORME;
    }
    if (
      raw === TABS_ZURICH.PRESUPUESTO ||
      raw === 'liquidador' ||
      raw === 'settlement' ||
      raw === 'presupuesto'
    ) {
      return TABS_ZURICH.PRESUPUESTO;
    }
    if (
      !esModuloListado &&
      (raw === TABS_ZURICH.CAT ||
        raw === 'inspeccion-cat' ||
        raw === 'catastrofico' ||
        raw === 'encuesta' ||
        raw === 'encuesta-agil')
    ) {
      return TABS_ZURICH.CAT;
    }
    return esModuloListado ? TABS_ZURICH.INFORME : TABS_ZURICH.CAT;
  }, [tabInicial, tabFromQuery, esModuloListado]);

  useEffect(() => {
    if (tabFromQuery || !tabInicial) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabInicial);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [casoZurich, setCasoZurich] = useState(null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [informeState, setInformeState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(
    () => Boolean(casoIdFromQuery || location.state?.casoZurich?._id)
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const [restoreNonce, setRestoreNonce] = useState(0);
  const [busquedaCaso, setBusquedaCaso] = useState('');
  const [listaCasos, setListaCasos] = useState([]);
  const [archiveroAbierto, setArchiveroAbierto] = useState(false);
  const [gestionarAbierto, setGestionarAbierto] = useState(false);

  const casoId = casoZurich?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const id = casoIdFromQuery || location.state?.casoZurich?._id;
      if (!id) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = esModuloListado
          ? await getCasoZurichListadoById(id)
          : await getCasoZurichById(id);
        if (!cancelado) setCasoZurich(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || t('zurich.workspace.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, t, esModuloListado, location.state?.casoZurich?._id]);

  useEffect(() => {
    if (!casoZurich?._id) {
      setInformeState(null);
      setLiquidadorState(null);
      setTotalesState(null);
      return;
    }
    setInformeState(defaultInformeUnicoZurich(casoZurich));
    const liq = mapcasoZurichALiquidador(casoZurich);
    setLiquidadorState(liq);
    setTotalesState(calcularLiquidacionZurich(liq));
  }, [casoZurich?._id]);

  useEffect(() => {
    if (casoIdFromQuery) return undefined;
    let cancelado = false;
    const cargarLista = esModuloListado ? fetchAllCasosZurichListado : fetchAllCasosZurich;
    cargarLista()
      .then((data) => {
        if (!cancelado) setListaCasos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelado) setListaCasos([]);
      });
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, esModuloListado]);

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
    if (casoZurich?.tomador || casoZurich?.siniestro || casoZurich?.asegurado || casoZurich?.zc) {
      return [
        casoZurich.tomador || casoZurich.asegurado || null,
        casoZurich.consecutivo,
        casoZurich.siniestro,
        casoZurich.zc ? `ZC ${casoZurich.zc}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    return t(esModuloListado ? 'zurich.workspace.subtitleListado' : 'zurich.workspace.subtitle');
  }, [casoZurich, t, esModuloListado]);

  const casosFiltradosPicker = useMemo(() => {
    const q = String(busquedaCaso || '')
      .trim()
      .toLowerCase();
    if (!q) return listaCasos;
    return listaCasos.filter((c) => {
      const blob = [
        c.consecutivo,
        c.asegurado,
        c.tomador,
        c.siniestro,
        c.identificacion,
        c.tipoIdentificacion,
        c.ciudad,
        c.numeroPoliza,
        c.tipoPoliza,
        c.causa,
      ]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return blob.includes(q);
    });
  }, [listaCasos, busquedaCaso]);

  const handleGuardarLiquidador = async (liqArg, totArg) => {
    if (!casoId) {
      setError(t('zurich.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionZurich(liquidador || {});
    if (!liquidador) {
      setError(t('zurich.settlement.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarLiquidadorEnCasoZurichListado({
            casoId,
            liquidador,
            casoBase: {
              ...(casoZurich || {}),
              informeUnico: informeState || casoZurich?.informeUnico,
            },
          })
        : await guardarLiquidadorEnCasoZurich({
            casoId,
            liquidador,
            totales,
            casoBase: {
              ...(casoZurich || {}),
              informeUnico: informeState || casoZurich?.informeUnico,
            },
          });
      setCasoZurich(actualizado);
      setLiquidadorState(liquidador);
      try {
        const draftKey = `${esModuloListado ? 'zurich-listado-ws' : 'zurich-ws'}:${casoId}`;
        borrarBorradorLocal(draftKey);
        await eliminarBorradorArnald(draftKey);
      } catch {
        /* el caso ya quedó en Mongo */
      }
      setMensaje(t('zurich.settlement.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('zurich.settlement.saveError'));
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
      setError(t('zurich.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('zurich.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarInformeUnicoEnCasoZurichListado({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoZurich || {}),
              liquidador: liquidadorState || casoZurich?.liquidador,
            },
          })
        : await guardarInformeUnicoEnCasoZurich({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoZurich || {}),
              liquidador: liquidadorState || casoZurich?.liquidador,
            },
          });
      setCasoZurich(actualizado);
      setMensaje(t('zurich.reportUnique.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('zurich.reportUnique.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const tipoInformeActual = tipoInformeActualZurich(informeState, casoZurich);

  const elegirTipoInformeWorkspace = (tipo) => {
    const nextTipo = normalizarTipoInformeZurich(tipo, tipoInformeActual);
    if (nextTipo === tipoInformeActual) return;
    const base = informeState || defaultInformeUnicoZurich(casoZurich || {});
    const next = { ...base, tipoInforme: nextTipo };
    setInformeState(next);
    if (casoId) handleGuardarInforme(next);
  };

  const etiquetaTabInforme =
    tipoInformeActual === 'preliminar'
      ? t('zurich.reportUnique.typePreliminar')
      : tipoInformeActual === 'final'
        ? t('zurich.reportUnique.typeFinal')
        : t('zurich.reportUnique.typeUnico');

  const handleGuardarActual = () => {
    if (tabActivo === TABS_ZURICH.INFORME) return handleGuardarInforme();
    if (tabActivo === TABS_ZURICH.PRESUPUESTO) return handleGuardarLiquidador();
    return undefined;
  };

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoZurich(actualizado);
  }, []);

  useZurichCasoAutosave({
    casoId,
    casoZurich,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    onCasoActualizado: onCasoDesdeAutosave,
    enabled:
      Boolean(casoId) &&
      !cargandoCaso &&
      Boolean(informeState) &&
      tabActivo !== TABS_ZURICH.CAT,
    guardarLiquidador: esModuloListado
      ? guardarLiquidadorEnCasoZurichListado
      : guardarLiquidadorEnCasoZurich,
    guardarInforme: esModuloListado
      ? guardarInformeUnicoEnCasoZurichListado
      : guardarInformeUnicoEnCasoZurich,
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
    formKey: casoId ? `${esModuloListado ? 'zurich-listado-ws' : 'zurich-ws'}:${casoId}` : '',
    modulo: esModuloListado ? 'zurich-listado' : 'zurich',
    recursoId: casoId || '',
    titulo: 'Workspace Zurich',
    formData: draftPayload,
    enabled: Boolean(casoId) && !cargandoCaso,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  const mostrarBotonGuardarSuperior =
    casoId && tabActivo !== TABS_ZURICH.CAT;

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              {esModuloListado ? 'Zurich · Listado' : 'Zurich'}
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('zurich.workspace.title')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {casoId && (
              <button
                type="button"
                className={expressBtnGhost}
                onClick={() => setGestionarAbierto(true)}
              >
                <FaEdit /> {t('zurich.report.manage')}
              </button>
            )}
            {casoId && (
              <button
                type="button"
                className={expressBtnGhost}
                onClick={() => setArchiveroAbierto(true)}
              >
                <FaFolderOpen /> {t('zurich.report.archive')}
                {casoZurich?.archivos?.length ? ` (${casoZurich.archivos.length})` : ''}
              </button>
            )}
            {mostrarBotonGuardarSuperior && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardando || !informeState}
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('zurich.workspace.saving')
                  : t('zurich.workspace.saveCurrent')}
              </button>
            )}
            <Link to={rutaReporte} className={expressBtnGhost}>
              <FaArrowLeft /> {t('zurich.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p>
              {t(esModuloListado ? 'zurich.workspace.pickCaseListado' : 'zurich.workspace.pickCase')}{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => navigate(rutaReporte)}
              >
                {t('zurich.workspace.goReport')}
              </button>
            </p>
            <label className="block font-semibold text-amber-950 dark:text-amber-50">
              {t('common.search')}
              <input
                type="search"
                value={busquedaCaso}
                onChange={(e) => setBusquedaCaso(e.target.value)}
                placeholder={t('zurich.report.searchPlaceholder')}
                className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-body text-sm text-gray-800 dark:border-amber-800 dark:bg-gray-950 dark:text-gray-100"
              />
            </label>
            {casosFiltradosPicker.length > 0 && (
              <ul className="max-h-48 overflow-auto rounded-lg border border-amber-200 bg-white dark:border-amber-800 dark:bg-gray-950">
                {casosFiltradosPicker.slice(0, 12).map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-amber-100 dark:text-gray-100 dark:hover:bg-amber-950"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set('casoId', c._id);
                        next.set('tab', tabActivo || (esModuloListado ? TABS_ZURICH.INFORME : TABS_ZURICH.CAT));
                        setSearchParams(next);
                      }}
                    >
                      {[c.consecutivo, c.asegurado, c.siniestro, c.ciudad]
                        .filter(Boolean)
                        .join(' · ') || c._id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        {casoId && !cargandoCaso && (
          <SelectorTipoInformeZurich
            tipo={tipoInformeActual}
            onElegir={elegirTipoInformeWorkspace}
            disabled={guardando}
            compacto
          />
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {!esModuloListado && (
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ZURICH.CAT)}
            onClick={() => setTab(TABS_ZURICH.CAT)}
          >
            1. {t('zurich.workspace.tabCat')}
          </button>
          )}
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ZURICH.PRESUPUESTO)}
            onClick={() => setTab(TABS_ZURICH.PRESUPUESTO)}
          >
            {esModuloListado ? '1.' : '2.'} {t('zurich.workspace.tabPresupuesto')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ZURICH.INFORME)}
            onClick={() => setTab(TABS_ZURICH.INFORME)}
          >
            {esModuloListado ? '2.' : '3.'} {etiquetaTabInforme}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('zurich.workspace.loading')}</p>
            ) : !esModuloListado && tabActivo === TABS_ZURICH.CAT ? (
              <InspeccionCatZurich
                key={`cat-${casoId}-${restoreNonce}`}
                casoZurich={casoZurich}
                onCasoChange={setCasoZurich}
              />
            ) : tabActivo === TABS_ZURICH.PRESUPUESTO ? (
              <LiquidadorZurich
                key={`pre-${casoId}-${restoreNonce}`}
                casoZurich={casoZurich}
                origen={esModuloListado ? 'listado' : 'cat'}
                liquidadorInicial={liquidadorState}
                onEstadoChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                  if (liq && Object.prototype.hasOwnProperty.call(liq, 'cotizacionPdf')) {
                    setInformeState((prev) => {
                      if (!prev) return prev;
                      const nextFotos = serializarPaginasCotizacion(liq.cotizacionPdf?.paginas);
                      const prevKey = JSON.stringify(prev.fotosCotizacion || []);
                      const nextKey = JSON.stringify(nextFotos);
                      if (prevKey === nextKey) return prev;
                      return { ...prev, fotosCotizacion: nextFotos };
                    });
                  }
                }}
                onGuardarEnCaso={casoId ? handleGuardarLiquidador : undefined}
                onCasoChange={setCasoZurich}
                guardandoCaso={guardando}
              />
            ) : (
              <InformeUnicoZurich
                key={`inf-${casoId}-${restoreNonce}`}
                origen={esModuloListado ? 'listado' : 'cat'}
                casoZurich={casoZurich}
                informeInicial={informeState}
                tipoInformeExterno={tipoInformeActual}
                ocultarSelector
                liquidadorInicial={liquidadorState}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onGuardarLiquidador={casoId ? handleGuardarLiquidador : undefined}
                onAbrirPresupuesto={() => setTab(TABS_ZURICH.PRESUPUESTO)}
                onCasoChange={setCasoZurich}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
      {gestionarAbierto && casoZurich && (
        <ExpressModal
          open
          onClose={() => setGestionarAbierto(false)}
          title={t('zurich.page.editCase', { caseNumber: casoZurich.consecutivo || '' })}
          wide
        >
          <div className="p-4 sm:p-6">
            <FormularioZurich
              embed
              origen={esModuloListado ? 'listado' : 'cat'}
              initialData={casoZurich}
              mostrarVolverInforme
              onClose={() => setGestionarAbierto(false)}
              onVolverInforme={() => {
                setGestionarAbierto(false);
                setTab(TABS_ZURICH.INFORME);
              }}
              onSaved={(guardado) => {
                setCasoZurich((prev) => ({
                  ...(prev || {}),
                  ...(guardado || {}),
                  liquidador: guardado?.liquidador || prev?.liquidador,
                  informeUnico: guardado?.informeUnico || prev?.informeUnico,
                  archivos: Array.isArray(guardado?.archivos)
                    ? guardado.archivos
                    : prev?.archivos,
                }));
              }}
            />
          </div>
        </ExpressModal>
      )}
      {archiveroAbierto && casoZurich && (
        <ExpressModal
          open
          onClose={() => setArchiveroAbierto(false)}
          title={t('zurich.archive.title')}
          wide
        >
          <ArchiveroZurich
            origen={esModuloListado ? 'listado' : 'cat'}
            caso={casoZurich}
            etiquetaInicial={
              tabActivo === TABS_ZURICH.INFORME
                ? etiquetaArchivoInformeZurich(
                    informeState?.tipoInforme || casoZurich?.informeUnico?.tipoInforme
                  )
                : tabActivo === TABS_ZURICH.PRESUPUESTO
                  ? 'LIQUIDACION'
                  : 'INSPECCION'
            }
            onClose={() => setArchiveroAbierto(false)}
            onChanged={(actualizado) => setCasoZurich(actualizado)}
          />
        </ExpressModal>
      )}
      <ArnaldDraftChrome
        draftStatus={draftStatus}
        lastDraftAt={lastDraftAt}
        consumeDraft={consumeDraft}
        showRestore={showDraftRestore}
        savedDataToRestore={draftToRestore}
        onRestore={() => {
          const data = draftToRestore?.data || {};
          setCasoZurich((prev) => ({
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

export function RedirectZurichLiquidador() {
  return <CasoZurichWorkspace tabInicial={TABS_ZURICH.PRESUPUESTO} />;
}

export function RedirectZurichInforme() {
  return <CasoZurichWorkspace tabInicial={TABS_ZURICH.INFORME} />;
}

export function RedirectZurichListadoWorkspace() {
  return <CasoZurichWorkspace origen="listado" tabInicial={TABS_ZURICH.INFORME} />;
}
