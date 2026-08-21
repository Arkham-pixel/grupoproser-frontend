import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorAllias from './LiquidadorAllias.jsx';
import InformeUnicoAllias from './InformeUnicoAllias.jsx';
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
  fetchAllCasosAllias,
  getCasoAlliasById,
  guardarInformeUnicoEnCasoAllias,
  guardarLiquidadorEnCasoAllias,
} from '../../services/alliasService.js';
import {
  fetchAllCasosAlliasListado,
  getCasoAlliasListadoById,
  guardarInformeUnicoEnCasoAlliasListado,
  guardarLiquidadorEnCasoAlliasListado,
} from '../../services/alliasListadoService.js';
import { calcularLiquidacionAllias } from './liquidadorAlliasHelpers.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import useAlliasCasoAutosave from '../../hooks/useAlliasCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_ALLIAS = {
  LIQUIDADOR: 'liquidador',
  INFORME: 'informe',
};

const STORAGE_CASO_CAT = 'alliasWorkspaceCasoId';
const STORAGE_CASO_LISTADO = 'alliasListadoCasoId';

function tabDesdePathname(pathname) {
  const p = String(pathname || '');
  if (p.includes('/informe-unico')) return TABS_ALLIAS.INFORME;
  if (p.includes('/liquidador') || p.includes('/caso')) return TABS_ALLIAS.LIQUIDADOR;
  return null;
}

function leerCasoIdSesion(esListado) {
  try {
    return sessionStorage.getItem(esListado ? STORAGE_CASO_LISTADO : STORAGE_CASO_CAT) || '';
  } catch {
    return '';
  }
}

function guardarCasoIdSesion(esListado, id) {
  try {
    const key = esListado ? STORAGE_CASO_LISTADO : STORAGE_CASO_CAT;
    if (id) sessionStorage.setItem(key, String(id));
  } catch {
    /* ignore */
  }
}

function rutaPublicaTabAllias(tab, esListado) {
  if (esListado) return '/allias/listado/caso';
  if (tab === TABS_ALLIAS.INFORME) return '/allias/informe-unico';
  return '/allias/liquidador';
}

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace Allias: Liquidador | Informe único
 * Mismo expediente (datos compartidos) con pestañas y menú separados.
 */
export default function CasoAlliasWorkspace({ tabInicial = null, origen = 'cat' } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');
  const esModuloListado = origen === 'listado';
  const rutaReporte = esModuloListado ? '/allias/listado/reporte' : '/allias/reporte';

  const tabDesdeRuta = useMemo(
    () => tabDesdePathname(location.pathname) || tabInicial,
    [location.pathname, tabInicial]
  );

  const tabActivo = useMemo(() => {
    const raw = tabFromQuery || tabDesdeRuta || TABS_ALLIAS.LIQUIDADOR;
    if (raw === TABS_ALLIAS.INFORME || raw === 'informe-unico') {
      return TABS_ALLIAS.INFORME;
    }
    return TABS_ALLIAS.LIQUIDADOR;
  }, [tabFromQuery, tabDesdeRuta]);

  useEffect(() => {
    if (tabFromQuery || !tabDesdeRuta) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabDesdeRuta);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (casoIdFromQuery) return;
    const stored = leerCasoIdSesion(esModuloListado);
    if (!stored) return;
    const next = new URLSearchParams(searchParams);
    next.set('casoId', stored);
    if (!next.get('tab') && tabDesdeRuta) next.set('tab', tabDesdeRuta);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [casoAllias, setCasoAllias] = useState(location.state?.casoAllias ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [informeState, setInformeState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const [restoreNonce, setRestoreNonce] = useState(0);
  const [busquedaCaso, setBusquedaCaso] = useState('');
  const [listaCasos, setListaCasos] = useState([]);

  const casoId = casoAllias?._id || casoIdFromQuery || null;

  useEffect(() => {
    if (casoId) guardarCasoIdSesion(esModuloListado, casoId);
  }, [casoId, esModuloListado]);

  useEffect(() => {
    setLiquidadorState(null);
    setInformeState(null);
    setTotalesState(null);
  }, [casoIdFromQuery]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoAllias) {
        const caso = location.state.casoAllias;
        setCasoAllias(caso);
        setLiquidadorState((prev) => prev || caso?.liquidador || null);
        setInformeState((prev) => prev || caso?.informeUnico || null);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = esModuloListado
          ? await getCasoAlliasListadoById(casoIdFromQuery)
          : await getCasoAlliasById(casoIdFromQuery);
        if (!cancelado) {
          setCasoAllias(caso);
          setLiquidadorState((prev) => prev || caso?.liquidador || null);
          setInformeState((prev) => prev || caso?.informeUnico || null);
        }
      } catch (err) {
        if (!cancelado) setError(err.message || t('allias.workspace.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, location.state, t, esModuloListado]);

  useEffect(() => {
    if (casoIdFromQuery) return undefined;
    let cancelado = false;
    const cargarLista = esModuloListado ? fetchAllCasosAlliasListado : fetchAllCasosAllias;
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
      const qs = next.toString();
      const destino = rutaPublicaTabAllias(tab, esModuloListado);
      navigate(`${destino}?${qs}`, { replace: true });
      setMensaje('');
      setError('');
    },
    [casoId, searchParams, esModuloListado, navigate]
  );

  const subtitulo = useMemo(() => {
    if (casoAllias?.tomador || casoAllias?.siniestro || casoAllias?.asegurado || casoAllias?.zc) {
      return [
        casoAllias.tomador || casoAllias.asegurado || null,
        casoAllias.consecutivo,
        casoAllias.siniestro,
        casoAllias.zc ? `ZC ${casoAllias.zc}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    return t(esModuloListado ? 'allias.workspace.subtitleListado' : 'allias.workspace.subtitle');
  }, [casoAllias, t, esModuloListado]);

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
      setError(t('allias.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionAllias(liquidador || {});
    if (!liquidador) {
      setError(t('allias.settlement.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarLiquidadorEnCasoAlliasListado({
            casoId,
            liquidador,
            casoBase: {
              ...(casoAllias || {}),
              informeUnico: informeState || casoAllias?.informeUnico,
            },
          })
        : await guardarLiquidadorEnCasoAllias({
            casoId,
            liquidador,
            totales,
            casoBase: {
              ...(casoAllias || {}),
              informeUnico: informeState || casoAllias?.informeUnico,
            },
          });
      setCasoAllias(actualizado);
      setMensaje(t('allias.settlement.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('allias.settlement.saveError'));
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
      setError(t('allias.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('allias.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarInformeUnicoEnCasoAlliasListado({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoAllias || {}),
              liquidador: liquidadorState || casoAllias?.liquidador,
            },
          })
        : await guardarInformeUnicoEnCasoAllias({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoAllias || {}),
              liquidador: liquidadorState || casoAllias?.liquidador,
            },
          });
      setCasoAllias(actualizado);
      setMensaje(t('allias.reportUnique.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('allias.reportUnique.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarActual = () => {
    if (tabActivo === TABS_ALLIAS.INFORME) return handleGuardarInforme();
    return handleGuardarLiquidador();
  };

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoAllias(actualizado);
  }, []);

  useAlliasCasoAutosave({
    casoId,
    casoAllias,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    onCasoActualizado: onCasoDesdeAutosave,
    enabled: Boolean(casoId) && !cargandoCaso,
    guardarLiquidador: esModuloListado
      ? guardarLiquidadorEnCasoAlliasListado
      : guardarLiquidadorEnCasoAllias,
    guardarInforme: esModuloListado
      ? guardarInformeUnicoEnCasoAlliasListado
      : guardarInformeUnicoEnCasoAllias,
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
    formKey: casoId ? `${esModuloListado ? 'allias-listado-ws' : 'allias-ws'}:${casoId}` : '',
    modulo: esModuloListado ? 'allias-listado' : 'allias',
    recursoId: casoId || '',
    titulo: 'Workspace Allias',
    formData: draftPayload,
    enabled: Boolean(casoId) && !cargandoCaso,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  const mostrarBotonGuardarSuperior = Boolean(casoId);

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              {esModuloListado ? 'Allias · Listado' : 'Allias'}
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('allias.workspace.title')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mostrarBotonGuardarSuperior && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={
                  guardando ||
                  (tabActivo === TABS_ALLIAS.INFORME ? !informeState : !liquidadorState)
                }
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('allias.workspace.saving')
                  : t('allias.workspace.saveCurrent')}
              </button>
            )}
            <Link to={rutaReporte} className={expressBtnGhost}>
              <FaArrowLeft /> {t('allias.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p>
              {t(esModuloListado ? 'allias.workspace.pickCaseListado' : 'allias.workspace.pickCase')}{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => navigate(rutaReporte)}
              >
                {t('allias.workspace.goReport')}
              </button>
            </p>
            <label className="block font-semibold text-amber-950 dark:text-amber-50">
              {t('common.search')}
              <input
                type="search"
                value={busquedaCaso}
                onChange={(e) => setBusquedaCaso(e.target.value)}
                placeholder={t('allias.report.searchPlaceholder')}
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
                        next.set('tab', tabActivo || TABS_ALLIAS.LIQUIDADOR);
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

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ALLIAS.LIQUIDADOR)}
            onClick={() => setTab(TABS_ALLIAS.LIQUIDADOR)}
          >
            1. {t('allias.workspace.tabSettlement')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ALLIAS.INFORME)}
            onClick={() => setTab(TABS_ALLIAS.INFORME)}
          >
            2. {t('allias.workspace.tabUniqueReport')}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('allias.workspace.loading')}</p>
            ) : tabActivo === TABS_ALLIAS.INFORME ? (
              <InformeUnicoAllias
                key={`inf-${casoId}-${restoreNonce}`}
                casoAllias={casoAllias}
                liquidadorInicial={liquidadorState}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  setLiquidadorState((prev) => fusionarLiquidadorSinPerderPresupuestoNsr(liq, prev));
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoAllias}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorAllias
                key={`liq-${casoId}-${restoreNonce}`}
                casoAllias={casoAllias}
                liquidadorInicial={liquidadorState}
                onEstadoChange={(liq, tot) => {
                  setLiquidadorState((prev) => fusionarLiquidadorSinPerderPresupuestoNsr(liq, prev));
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarLiquidador : undefined}
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
          setCasoAllias((prev) => ({
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
      <Outlet />
    </div>
  );
}

export function RedirectAlliasLiquidador() {
  return <CasoAlliasWorkspace tabInicial={TABS_ALLIAS.LIQUIDADOR} />;
}

export function RedirectAlliasInforme() {
  return <CasoAlliasWorkspace tabInicial={TABS_ALLIAS.INFORME} />;
}

export function RedirectAlliasListadoWorkspace() {
  return <CasoAlliasWorkspace origen="listado" tabInicial={TABS_ALLIAS.LIQUIDADOR} />;
}
