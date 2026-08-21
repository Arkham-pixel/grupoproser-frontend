import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorAllianz from './LiquidadorAllianz.jsx';
import InformeUnicoAllianz from './InformeUnicoAllianz.jsx';
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
  fetchAllCasosAllianz,
  getCasoAllianzById,
  guardarInformeUnicoEnCasoAllianz,
  guardarLiquidadorEnCasoAllianz,
} from '../../services/allianzService.js';
import {
  fetchAllCasosAllianzListado,
  getCasoAllianzListadoById,
  guardarInformeUnicoEnCasoAllianzListado,
  guardarLiquidadorEnCasoAllianzListado,
} from '../../services/allianzListadoService.js';
import { calcularLiquidacionAllianz } from './liquidadorAllianzHelpers.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import useAllianzCasoAutosave from '../../hooks/useAllianzCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_ALLIANZ = {
  LIQUIDADOR: 'liquidador',
  INFORME: 'informe',
};

const STORAGE_CASO_CAT = 'allianzWorkspaceCasoId';
const STORAGE_CASO_LISTADO = 'allianzListadoCasoId';

function tabDesdePathname(pathname) {
  const p = String(pathname || '');
  if (p.includes('/informe-unico')) return TABS_ALLIANZ.INFORME;
  if (p.includes('/liquidador') || p.includes('/caso')) return TABS_ALLIANZ.LIQUIDADOR;
  return null;
}

function leerCasoIdSesion(esListado) {
  try {
    const keys = esListado
      ? ['allianzListadoCasoId', 'alliasListadoCasoId']
      : ['allianzWorkspaceCasoId', 'alliasWorkspaceCasoId'];
    for (const key of keys) {
      const valor = sessionStorage.getItem(key);
      if (valor) return valor;
    }
    return '';
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

function rutaPublicaTabAllianz(tab, esListado) {
  if (esListado) return '/allianz/listado/caso';
  if (tab === TABS_ALLIANZ.INFORME) return '/allianz/informe-unico';
  return '/allianz/liquidador';
}

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace Allianz: Liquidador | Informe único
 * Mismo expediente (datos compartidos) con pestañas y menú separados.
 */
export default function CasoAllianzWorkspace({ tabInicial = null, origen = 'cat' } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');
  const esModuloListado = origen === 'listado';
  const rutaReporte = esModuloListado ? '/allianz/listado/reporte' : '/allianz/reporte';

  const tabDesdeRuta = useMemo(
    () => tabDesdePathname(location.pathname) || tabInicial,
    [location.pathname, tabInicial]
  );

  const tabActivo = useMemo(() => {
    const raw = tabFromQuery || tabDesdeRuta || TABS_ALLIANZ.LIQUIDADOR;
    if (raw === TABS_ALLIANZ.INFORME || raw === 'informe-unico') {
      return TABS_ALLIANZ.INFORME;
    }
    return TABS_ALLIANZ.LIQUIDADOR;
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

  const [casoAllianz, setCasoAllianz] = useState(location.state?.casoAllianz ?? null);
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

  const casoId = casoAllianz?._id || casoIdFromQuery || null;

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
      if (!casoIdFromQuery && location.state?.casoAllianz) {
        const caso = location.state.casoAllianz;
        setCasoAllianz(caso);
        setLiquidadorState((prev) => prev || caso?.liquidador || null);
        setInformeState((prev) => prev || caso?.informeUnico || null);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = esModuloListado
          ? await getCasoAllianzListadoById(casoIdFromQuery)
          : await getCasoAllianzById(casoIdFromQuery);
        if (!cancelado) {
          setCasoAllianz(caso);
          setLiquidadorState((prev) => prev || caso?.liquidador || null);
          setInformeState((prev) => prev || caso?.informeUnico || null);
        }
      } catch (err) {
        if (!cancelado) setError(err.message || t('allianz.workspace.loadError'));
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
    const cargarLista = esModuloListado ? fetchAllCasosAllianzListado : fetchAllCasosAllianz;
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
      const destino = rutaPublicaTabAllianz(tab, esModuloListado);
      navigate(`${destino}?${qs}`, { replace: true });
      setMensaje('');
      setError('');
    },
    [casoId, searchParams, esModuloListado, navigate]
  );

  const subtitulo = useMemo(() => {
    if (casoAllianz?.tomador || casoAllianz?.siniestro || casoAllianz?.asegurado || casoAllianz?.zc) {
      return [
        casoAllianz.tomador || casoAllianz.asegurado || null,
        casoAllianz.consecutivo,
        casoAllianz.siniestro,
        casoAllianz.zc ? `ZC ${casoAllianz.zc}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    return t(esModuloListado ? 'allianz.workspace.subtitleListado' : 'allianz.workspace.subtitle');
  }, [casoAllianz, t, esModuloListado]);

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
      setError(t('allianz.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionAllianz(liquidador || {});
    if (!liquidador) {
      setError(t('allianz.settlement.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarLiquidadorEnCasoAllianzListado({
            casoId,
            liquidador,
            casoBase: {
              ...(casoAllianz || {}),
              informeUnico: informeState || casoAllianz?.informeUnico,
            },
          })
        : await guardarLiquidadorEnCasoAllianz({
            casoId,
            liquidador,
            totales,
            casoBase: {
              ...(casoAllianz || {}),
              informeUnico: informeState || casoAllianz?.informeUnico,
            },
          });
      setCasoAllianz(actualizado);
      setMensaje(t('allianz.settlement.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('allianz.settlement.saveError'));
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
      setError(t('allianz.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('allianz.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarInformeUnicoEnCasoAllianzListado({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoAllianz || {}),
              liquidador: liquidadorState || casoAllianz?.liquidador,
            },
          })
        : await guardarInformeUnicoEnCasoAllianz({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoAllianz || {}),
              liquidador: liquidadorState || casoAllianz?.liquidador,
            },
          });
      setCasoAllianz(actualizado);
      setMensaje(t('allianz.reportUnique.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('allianz.reportUnique.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarActual = () => {
    if (tabActivo === TABS_ALLIANZ.INFORME) return handleGuardarInforme();
    return handleGuardarLiquidador();
  };

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoAllianz(actualizado);
  }, []);

  useAllianzCasoAutosave({
    casoId,
    casoAllianz,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    onCasoActualizado: onCasoDesdeAutosave,
    enabled: Boolean(casoId) && !cargandoCaso,
    guardarLiquidador: esModuloListado
      ? guardarLiquidadorEnCasoAllianzListado
      : guardarLiquidadorEnCasoAllianz,
    guardarInforme: esModuloListado
      ? guardarInformeUnicoEnCasoAllianzListado
      : guardarInformeUnicoEnCasoAllianz,
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
    formKey: casoId ? `${esModuloListado ? 'allianz-listado-ws' : 'allianz-ws'}:${casoId}` : '',
    modulo: esModuloListado ? 'allianz-listado' : 'allianz',
    recursoId: casoId || '',
    titulo: 'Workspace Allianz',
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
              {esModuloListado ? 'Allianz · Listado' : 'Allianz'}
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('allianz.workspace.title')}
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
                  (tabActivo === TABS_ALLIANZ.INFORME ? !informeState : !liquidadorState)
                }
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('allianz.workspace.saving')
                  : t('allianz.workspace.saveCurrent')}
              </button>
            )}
            <Link to={rutaReporte} className={expressBtnGhost}>
              <FaArrowLeft /> {t('allianz.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p>
              {t(esModuloListado ? 'allianz.workspace.pickCaseListado' : 'allianz.workspace.pickCase')}{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => navigate(rutaReporte)}
              >
                {t('allianz.workspace.goReport')}
              </button>
            </p>
            <label className="block font-semibold text-amber-950 dark:text-amber-50">
              {t('common.search')}
              <input
                type="search"
                value={busquedaCaso}
                onChange={(e) => setBusquedaCaso(e.target.value)}
                placeholder={t('allianz.report.searchPlaceholder')}
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
                        next.set('tab', tabActivo || TABS_ALLIANZ.LIQUIDADOR);
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
            className={pillClass(tabActivo === TABS_ALLIANZ.LIQUIDADOR)}
            onClick={() => setTab(TABS_ALLIANZ.LIQUIDADOR)}
          >
            1. {t('allianz.workspace.tabSettlement')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ALLIANZ.INFORME)}
            onClick={() => setTab(TABS_ALLIANZ.INFORME)}
          >
            2. {t('allianz.workspace.tabUniqueReport')}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('allianz.workspace.loading')}</p>
            ) : tabActivo === TABS_ALLIANZ.INFORME ? (
              <InformeUnicoAllianz
                key={`inf-${casoId}-${restoreNonce}`}
                casoAllianz={casoAllianz}
                liquidadorInicial={liquidadorState}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  setLiquidadorState((prev) => fusionarLiquidadorSinPerderPresupuestoNsr(liq, prev));
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoAllianz}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorAllianz
                key={`liq-${casoId}-${restoreNonce}`}
                casoAllianz={casoAllianz}
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
          setCasoAllianz((prev) => ({
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

export function RedirectAllianzLiquidador() {
  return <CasoAllianzWorkspace tabInicial={TABS_ALLIANZ.LIQUIDADOR} />;
}

export function RedirectAllianzInforme() {
  return <CasoAllianzWorkspace tabInicial={TABS_ALLIANZ.INFORME} />;
}

export function RedirectAllianzListadoWorkspace() {
  return <CasoAllianzWorkspace origen="listado" tabInicial={TABS_ALLIANZ.LIQUIDADOR} />;
}
