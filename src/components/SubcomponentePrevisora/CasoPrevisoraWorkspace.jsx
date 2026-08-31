import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorPrevisora from './LiquidadorPrevisora.jsx';
import InspeccionCatPrevisora from './InspeccionCatPrevisora.jsx';
import InformeUnicoPrevisora from './InformeUnicoPrevisora.jsx';
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
  fetchAllCasosPrevisora,
  getCasoPrevisoraById,
  guardarInformeUnicoEnCasoPrevisora,
  guardarLiquidadorEnCasoPrevisora,
} from '../../services/previsoraService.js';
import {
  fetchAllCasosPrevisoraListado,
  getCasoPrevisoraListadoById,
  guardarInformeUnicoEnCasoPrevisoraListado,
  guardarLiquidadorEnCasoPrevisoraListado,
} from '../../services/previsoraListadoService.js';
import { calcularLiquidacionPrevisora } from './liquidadorPrevisoraHelpers.js';
import { serializarPaginasCotizacion } from '../liquidacion/cotizacionPdfLiquidacion.js';
import { eliminarBorradorArnald } from '../../services/arnaldPlataformaService.js';
import { borrarBorradorLocal } from '../../services/arnaldDraftLocalStore.js';
import usePrevisoraCasoAutosave from '../../hooks/usePrevisoraCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_PREVISORA = {
  LIQUIDADOR: 'liquidador',
  CAT: 'cat',
  INFORME: 'informe',
};

const STORAGE_CASO_CAT = 'previsoraWorkspaceCasoId';
const STORAGE_CASO_LISTADO = 'previsoraListadoCasoId';

function tabDesdePathname(pathname) {
  const p = String(pathname || '');
  if (p.includes('/informe-unico')) return TABS_PREVISORA.INFORME;
  if (p.includes('/liquidador')) return TABS_PREVISORA.LIQUIDADOR;
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

function rutaPublicaTabPrevisora(tab, esListado) {
  if (esListado) return '/previsora/listado/caso';
  if (tab === TABS_PREVISORA.INFORME) return '/previsora/informe-unico';
  if (tab === TABS_PREVISORA.LIQUIDADOR) return '/previsora/liquidador';
  return '/previsora/caso';
}

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace Previsora: Inspección CAT | Liquidador | Informe (preliminar, final o único)
 * Mismo expediente (datos compartidos) con pestañas y menú separados, como Zurich.
 */
export default function CasoPrevisoraWorkspace({ tabInicial = null, origen = 'cat' } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');
  const esModuloListado = origen === 'listado';
  const rutaReporte = esModuloListado ? '/previsora/listado/reporte' : '/previsora/reporte';

  const tabDesdeRuta = useMemo(
    () => tabDesdePathname(location.pathname) || tabInicial,
    [location.pathname, tabInicial]
  );

  const tabActivo = useMemo(() => {
    const raw =
      tabFromQuery ||
      tabDesdeRuta ||
      (esModuloListado ? TABS_PREVISORA.LIQUIDADOR : TABS_PREVISORA.CAT);
    if (raw === TABS_PREVISORA.INFORME || raw === 'informe-unico') {
      return TABS_PREVISORA.INFORME;
    }
    if (raw === TABS_PREVISORA.LIQUIDADOR || raw === 'settlement') {
      return TABS_PREVISORA.LIQUIDADOR;
    }
    if (esModuloListado) return TABS_PREVISORA.LIQUIDADOR;
    if (raw === TABS_PREVISORA.CAT || raw === 'inspeccion-cat' || raw === 'catastrofico') {
      return TABS_PREVISORA.CAT;
    }
    return TABS_PREVISORA.CAT;
  }, [tabFromQuery, tabDesdeRuta, esModuloListado]);

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

  const [casoPrevisora, setCasoPrevisora] = useState(location.state?.casoPrevisora ?? null);
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

  const casoId = casoPrevisora?._id || casoIdFromQuery || null;

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
      if (!casoIdFromQuery && location.state?.casoPrevisora) {
        const caso = location.state.casoPrevisora;
        setCasoPrevisora(caso);
        setLiquidadorState((prev) => prev || caso?.liquidador || null);
        setInformeState((prev) => prev || caso?.informeUnico || null);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = esModuloListado
          ? await getCasoPrevisoraListadoById(casoIdFromQuery)
          : await getCasoPrevisoraById(casoIdFromQuery);
        if (!cancelado) {
          setCasoPrevisora(caso);
          setLiquidadorState((prev) => prev || caso?.liquidador || null);
          setInformeState((prev) => prev || caso?.informeUnico || null);
        }
      } catch (err) {
        if (!cancelado) setError(err.message || t('previsora.workspace.loadError'));
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
    const cargarLista = esModuloListado ? fetchAllCasosPrevisoraListado : fetchAllCasosPrevisora;
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
      const destino = rutaPublicaTabPrevisora(tab, esModuloListado);
      navigate(`${destino}?${qs}`, { replace: true });
      setMensaje('');
      setError('');
    },
    [casoId, searchParams, esModuloListado, navigate]
  );

  const subtitulo = useMemo(() => {
    if (casoPrevisora?.tomador || casoPrevisora?.siniestro || casoPrevisora?.asegurado) {
      return [
        casoPrevisora.tomador || casoPrevisora.asegurado || null,
        casoPrevisora.consecutivo,
        casoPrevisora.siniestro,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    return t(esModuloListado ? 'previsora.workspace.subtitleListado' : 'previsora.workspace.subtitle');
  }, [casoPrevisora, t, esModuloListado]);

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
      setError(t('previsora.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionPrevisora(liquidador || {});
    if (!liquidador) {
      setError(t('previsora.settlement.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarLiquidadorEnCasoPrevisoraListado({
            casoId,
            liquidador,
            casoBase: {
              ...(casoPrevisora || {}),
              informeUnico: informeState || casoPrevisora?.informeUnico,
            },
          })
        : await guardarLiquidadorEnCasoPrevisora({
            casoId,
            liquidador,
            totales,
            casoBase: {
              ...(casoPrevisora || {}),
              informeUnico: informeState || casoPrevisora?.informeUnico,
            },
          });
      setCasoPrevisora(actualizado);
      setLiquidadorState(liquidador);
      try {
        const draftKey = `${esModuloListado ? 'previsora-listado-ws' : 'previsora-ws'}:${casoId}`;
        borrarBorradorLocal(draftKey);
        await eliminarBorradorArnald(draftKey);
      } catch {
        /* el caso ya quedó en Mongo */
      }
      setMensaje(t('previsora.settlement.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('previsora.settlement.saveError'));
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
      setError(t('previsora.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('previsora.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarInformeUnicoEnCasoPrevisoraListado({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoPrevisora || {}),
              liquidador: liquidadorState || casoPrevisora?.liquidador,
            },
          })
        : await guardarInformeUnicoEnCasoPrevisora({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoPrevisora || {}),
              liquidador: liquidadorState || casoPrevisora?.liquidador,
            },
          });
      setCasoPrevisora(actualizado);
      setMensaje(t('previsora.reportUnique.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('previsora.reportUnique.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarActual = () => {
    if (tabActivo === TABS_PREVISORA.INFORME) return handleGuardarInforme();
    if (tabActivo === TABS_PREVISORA.CAT) return undefined; // CAT guarda en su propio botón
    return handleGuardarLiquidador();
  };

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoPrevisora(actualizado);
  }, []);

  usePrevisoraCasoAutosave({
    casoId,
    casoPrevisora,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    onCasoActualizado: onCasoDesdeAutosave,
    enabled: Boolean(casoId) && !cargandoCaso && tabActivo !== TABS_PREVISORA.CAT,
    guardarLiquidador: esModuloListado
      ? guardarLiquidadorEnCasoPrevisoraListado
      : guardarLiquidadorEnCasoPrevisora,
    guardarInforme: esModuloListado
      ? guardarInformeUnicoEnCasoPrevisoraListado
      : guardarInformeUnicoEnCasoPrevisora,
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
    formKey: casoId ? `${esModuloListado ? 'previsora-listado-ws' : 'previsora-ws'}:${casoId}` : '',
    modulo: esModuloListado ? 'previsora-listado' : 'previsora',
    recursoId: casoId || '',
    titulo: 'Workspace Previsora',
    formData: draftPayload,
    enabled: Boolean(casoId) && !cargandoCaso,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  const mostrarBotonGuardarSuperior =
    casoId && tabActivo !== TABS_PREVISORA.CAT;

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              {esModuloListado ? 'Previsora · Listado' : 'Previsora'}
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('previsora.workspace.title')}
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
                  (tabActivo === TABS_PREVISORA.INFORME ? !informeState : !liquidadorState)
                }
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('previsora.workspace.saving')
                  : t('previsora.workspace.saveCurrent')}
              </button>
            )}
            <Link to={rutaReporte} className={expressBtnGhost}>
              <FaArrowLeft /> {t('previsora.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p>
              {t(esModuloListado ? 'previsora.workspace.pickCaseListado' : 'previsora.workspace.pickCase')}{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => navigate(rutaReporte)}
              >
                {t('previsora.workspace.goReport')}
              </button>
            </p>
            <label className="block font-semibold text-amber-950 dark:text-amber-50">
              {t('common.search')}
              <input
                type="search"
                value={busquedaCaso}
                onChange={(e) => setBusquedaCaso(e.target.value)}
                placeholder={t('previsora.report.searchPlaceholder')}
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
                        next.set('tab', tabActivo || (esModuloListado ? TABS_PREVISORA.LIQUIDADOR : TABS_PREVISORA.CAT));
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
          {!esModuloListado && (
          <button
            type="button"
            className={pillClass(tabActivo === TABS_PREVISORA.CAT)}
            onClick={() => setTab(TABS_PREVISORA.CAT)}
          >
            1. {t('previsora.workspace.tabCat')}
          </button>
          )}
          <button
            type="button"
            className={pillClass(tabActivo === TABS_PREVISORA.LIQUIDADOR)}
            onClick={() => setTab(TABS_PREVISORA.LIQUIDADOR)}
          >
            {esModuloListado ? '1' : '2'}. {t('previsora.workspace.tabSettlement')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_PREVISORA.INFORME)}
            onClick={() => setTab(TABS_PREVISORA.INFORME)}
          >
            {esModuloListado ? '2' : '3'}. {t('previsora.workspace.tabUniqueReport')}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('previsora.workspace.loading')}</p>
            ) : !esModuloListado && tabActivo === TABS_PREVISORA.CAT ? (
              <InspeccionCatPrevisora
                key={`cat-${casoId}-${restoreNonce}`}
                casoPrevisora={casoPrevisora}
                onCasoChange={setCasoPrevisora}
              />
            ) : tabActivo === TABS_PREVISORA.INFORME ? (
              <InformeUnicoPrevisora
                key={`inf-${casoId}-${restoreNonce}`}
                origen={esModuloListado ? 'listado' : 'cat'}
                casoPrevisora={casoPrevisora}
                liquidadorInicial={liquidadorState}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoPrevisora}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorPrevisora
                key={`liq-${casoId}-${restoreNonce}`}
                origen={esModuloListado ? 'listado' : 'cat'}
                casoPrevisora={casoPrevisora}
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
                onCasoChange={setCasoPrevisora}
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
          setCasoPrevisora((prev) => ({
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

export function RedirectPrevisoraLiquidador() {
  return <CasoPrevisoraWorkspace tabInicial={TABS_PREVISORA.LIQUIDADOR} />;
}

export function RedirectPrevisoraInforme() {
  return <CasoPrevisoraWorkspace tabInicial={TABS_PREVISORA.INFORME} />;
}

export function RedirectPrevisoraListadoWorkspace() {
  return <CasoPrevisoraWorkspace origen="listado" tabInicial={TABS_PREVISORA.LIQUIDADOR} />;
}
