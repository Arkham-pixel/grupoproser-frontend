import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaFolderOpen, FaSave } from 'react-icons/fa';
import LiquidadorBbvaCat from './LiquidadorBbvaCat.jsx';
import InspeccionCatBbvaCat from './InspeccionCatBbvaCat.jsx';
import InformeUnicoBbvaCat from './InformeUnicoBbvaCat.jsx';
import ArchiveroBbvaCat from './ArchiveroBbvaCat.jsx';
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
  fetchAllCasosBbvaCat,
  getCasoBbvaCatById,
  guardarInformeUnicoEnCasoBbvaCat,
  guardarLiquidadorEnCasoBbvaCat,
} from '../../services/bbvaCatService.js';
import {
  fetchAllCasosBbvaCatListado,
  getCasoBbvaCatListadoById,
  guardarInformeUnicoEnCasoBbvaCatListado,
  guardarLiquidadorEnCasoBbvaCatListado,
} from '../../services/bbvaCatListadoService.js';
import { calcularLiquidacionBbvaCat } from './liquidadorBbvaCatHelpers.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import useBbvaCatCasoAutosave from '../../hooks/useBbvaCatCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';
import { ExpressModal } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { STORAGE_ORIGEN_LISTADO_BBVA_CAT } from './bbvaCatHelpers.js';
import { esRolSoloBbva } from '../../config/roles.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_BBVA_CAT = {
  LIQUIDADOR: 'liquidador',
  CAT: 'cat',
  INFORME: 'informe',
};

const STORAGE_CASO_CAT = 'bbvaCatWorkspaceCasoId';
const STORAGE_CASO_LISTADO = 'bbvaCatListadoCasoId';

function tabDesdePathname(pathname) {
  const p = String(pathname || '');
  if (p.includes('/informe-unico')) return TABS_BBVA_CAT.INFORME;
  if (p.includes('/liquidador')) return TABS_BBVA_CAT.LIQUIDADOR;
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

function rutaPublicaTabBbvaCat(tab, esListado) {
  if (esListado) return '/bbva-cat/listado/caso';
  if (tab === TABS_BBVA_CAT.INFORME) return '/bbva-cat/informe-unico';
  if (tab === TABS_BBVA_CAT.LIQUIDADOR) return '/bbva-cat/liquidador';
  return '/bbva-cat/caso';
}

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace BBVA CAT: Inspección CAT | Liquidador | Informe único
 * Mismo expediente (datos compartidos) con pestañas y menú separados, como Zurich.
 */
export default function CasoBbvaCatWorkspace({ tabInicial = null, origen = 'cat' } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');
  const esModuloListado = origen === 'listado';
  const rutaReporte = (() => {
    if (!esModuloListado) return '/bbva-cat/reporte';
    if (esRolSoloBbva()) return '/bbva-cat/listado/analista';
    try {
      if (sessionStorage.getItem(STORAGE_ORIGEN_LISTADO_BBVA_CAT) === 'analista') {
        return '/bbva-cat/listado/analista';
      }
    } catch {
      /* ignore */
    }
    return '/bbva-cat/listado/reporte';
  })();

  const tabDesdeRuta = useMemo(
    () => tabDesdePathname(location.pathname) || tabInicial,
    [location.pathname, tabInicial]
  );

  const tabActivo = useMemo(() => {
    const raw =
      tabFromQuery ||
      tabDesdeRuta ||
      (esModuloListado ? TABS_BBVA_CAT.LIQUIDADOR : TABS_BBVA_CAT.CAT);
    if (raw === TABS_BBVA_CAT.INFORME || raw === 'informe-unico') {
      return TABS_BBVA_CAT.INFORME;
    }
    if (raw === TABS_BBVA_CAT.LIQUIDADOR || raw === 'settlement') {
      return TABS_BBVA_CAT.LIQUIDADOR;
    }
    if (esModuloListado) return TABS_BBVA_CAT.LIQUIDADOR;
    if (raw === TABS_BBVA_CAT.CAT || raw === 'inspeccion-cat' || raw === 'catastrofico') {
      return TABS_BBVA_CAT.CAT;
    }
    return TABS_BBVA_CAT.CAT;
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

  const [casoBbvaCat, setCasoBbvaCat] = useState(location.state?.casoBbvaCat ?? null);
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
  const [archiveroAbierto, setArchiveroAbierto] = useState(false);
  const [busquedaCaso, setBusquedaCaso] = useState('');
  const [listaCasos, setListaCasos] = useState([]);

  const casoId = casoBbvaCat?._id || casoIdFromQuery || null;

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
      if (!casoIdFromQuery && location.state?.casoBbvaCat) {
        const caso = location.state.casoBbvaCat;
        setCasoBbvaCat(caso);
        setLiquidadorState((prev) => prev || caso?.liquidador || null);
        setInformeState((prev) => prev || caso?.informeUnico || null);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = esModuloListado
          ? await getCasoBbvaCatListadoById(casoIdFromQuery)
          : await getCasoBbvaCatById(casoIdFromQuery);
        if (!cancelado) {
          setCasoBbvaCat(caso);
          setLiquidadorState((prev) => prev || caso?.liquidador || null);
          setInformeState((prev) => prev || caso?.informeUnico || null);
        }
      } catch (err) {
        if (!cancelado) setError(err.message || t('bbvaCat.workspace.loadError'));
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
    const cargarLista = esModuloListado ? fetchAllCasosBbvaCatListado : fetchAllCasosBbvaCat;
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
      const destino = rutaPublicaTabBbvaCat(tab, esModuloListado);
      navigate(`${destino}?${qs}`, { replace: true });
      setMensaje('');
      setError('');
    },
    [casoId, searchParams, esModuloListado, navigate]
  );

  const subtitulo = useMemo(() => {
    if (casoBbvaCat?.tomador || casoBbvaCat?.siniestro || casoBbvaCat?.asegurado || casoBbvaCat?.zc) {
      return [
        casoBbvaCat.tomador || casoBbvaCat.asegurado || null,
        casoBbvaCat.consecutivo,
        casoBbvaCat.siniestro,
        casoBbvaCat.zc ? `ZC ${casoBbvaCat.zc}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    return t(esModuloListado ? 'bbvaCat.workspace.subtitleListado' : 'bbvaCat.workspace.subtitle');
  }, [casoBbvaCat, t, esModuloListado]);

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
      setError(t('bbvaCat.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionBbvaCat(liquidador || {});
    if (!liquidador) {
      setError(t('bbvaCat.settlement.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarLiquidadorEnCasoBbvaCatListado({
            casoId,
            liquidador,
            casoBase: {
              ...(casoBbvaCat || {}),
              informeUnico: informeState || casoBbvaCat?.informeUnico,
            },
          })
        : await guardarLiquidadorEnCasoBbvaCat({
            casoId,
            liquidador,
            totales,
            casoBase: {
              ...(casoBbvaCat || {}),
              informeUnico: informeState || casoBbvaCat?.informeUnico,
            },
          });
      setCasoBbvaCat(actualizado);
      setMensaje(t('bbvaCat.settlement.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.settlement.saveError'));
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
      setError(t('bbvaCat.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('bbvaCat.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = esModuloListado
        ? await guardarInformeUnicoEnCasoBbvaCatListado({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoBbvaCat || {}),
              liquidador: liquidadorState || casoBbvaCat?.liquidador,
            },
          })
        : await guardarInformeUnicoEnCasoBbvaCat({
            casoId,
            informeUnico: informe,
            casoBase: {
              ...(casoBbvaCat || {}),
              liquidador: liquidadorState || casoBbvaCat?.liquidador,
            },
          });
      setCasoBbvaCat(actualizado);
      setMensaje(t('bbvaCat.reportUnique.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.reportUnique.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarActual = () => {
    if (tabActivo === TABS_BBVA_CAT.INFORME) return handleGuardarInforme();
    if (tabActivo === TABS_BBVA_CAT.CAT) return undefined; // CAT guarda en su propio botón
    return handleGuardarLiquidador();
  };

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoBbvaCat(actualizado);
  }, []);

  useBbvaCatCasoAutosave({
    casoId,
    casoBbvaCat,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    onCasoActualizado: onCasoDesdeAutosave,
    enabled: Boolean(casoId) && !cargandoCaso && tabActivo !== TABS_BBVA_CAT.CAT,
    guardarLiquidador: esModuloListado
      ? guardarLiquidadorEnCasoBbvaCatListado
      : guardarLiquidadorEnCasoBbvaCat,
    guardarInforme: esModuloListado
      ? guardarInformeUnicoEnCasoBbvaCatListado
      : guardarInformeUnicoEnCasoBbvaCat,
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
    formKey: casoId ? `${esModuloListado ? 'bbva-cat-listado-ws' : 'bbva-cat-ws'}:${casoId}` : '',
    modulo: esModuloListado ? 'bbva-cat-listado' : 'bbvaCat',
    recursoId: casoId || '',
    titulo: 'Workspace BBVA CAT',
    formData: draftPayload,
    enabled: Boolean(casoId) && !cargandoCaso,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  const mostrarBotonGuardarSuperior =
    casoId && tabActivo !== TABS_BBVA_CAT.CAT;

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              {esModuloListado ? 'BBVA CAT · Listado' : 'BBVA CAT'}
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('bbvaCat.workspace.title')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {casoId && (
              <button
                type="button"
                className={expressBtnGhost}
                onClick={() => setArchiveroAbierto(true)}
              >
                <FaFolderOpen /> {t('bbvaCat.report.archive')}
                {casoBbvaCat?.archivos?.length ? ` (${casoBbvaCat.archivos.length})` : ''}
              </button>
            )}
            {mostrarBotonGuardarSuperior && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={
                  guardando ||
                  (tabActivo === TABS_BBVA_CAT.INFORME ? !informeState : !liquidadorState)
                }
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('bbvaCat.workspace.saving')
                  : t('bbvaCat.workspace.saveCurrent')}
              </button>
            )}
            <Link to={rutaReporte} className={expressBtnGhost}>
              <FaArrowLeft /> {t('bbvaCat.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p>
              {t(esModuloListado ? 'bbvaCat.workspace.pickCaseListado' : 'bbvaCat.workspace.pickCase')}{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => navigate(rutaReporte)}
              >
                {t('bbvaCat.workspace.goReport')}
              </button>
            </p>
            <label className="block font-semibold text-amber-950 dark:text-amber-50">
              {t('common.search')}
              <input
                type="search"
                value={busquedaCaso}
                onChange={(e) => setBusquedaCaso(e.target.value)}
                placeholder={t('bbvaCat.report.searchPlaceholder')}
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
                        next.set('tab', tabActivo || (esModuloListado ? TABS_BBVA_CAT.LIQUIDADOR : TABS_BBVA_CAT.CAT));
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
            className={pillClass(tabActivo === TABS_BBVA_CAT.CAT)}
            onClick={() => setTab(TABS_BBVA_CAT.CAT)}
          >
            1. {t('bbvaCat.workspace.tabCat')}
          </button>
          )}
          <button
            type="button"
            className={pillClass(tabActivo === TABS_BBVA_CAT.LIQUIDADOR)}
            onClick={() => setTab(TABS_BBVA_CAT.LIQUIDADOR)}
          >
            {esModuloListado ? '1' : '2'}. {t('bbvaCat.workspace.tabSettlement')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_BBVA_CAT.INFORME)}
            onClick={() => setTab(TABS_BBVA_CAT.INFORME)}
          >
            {esModuloListado ? '2' : '3'}. {t('bbvaCat.workspace.tabUniqueReport')}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('bbvaCat.workspace.loading')}</p>
            ) : !esModuloListado && tabActivo === TABS_BBVA_CAT.CAT ? (
              <InspeccionCatBbvaCat
                key={`cat-${casoId}-${restoreNonce}`}
                casoBbvaCat={casoBbvaCat}
                onCasoChange={setCasoBbvaCat}
              />
            ) : tabActivo === TABS_BBVA_CAT.INFORME ? (
              <InformeUnicoBbvaCat
                key={`inf-${casoId}-${restoreNonce}`}
                origen={esModuloListado ? 'listado' : 'cat'}
                casoBbvaCat={casoBbvaCat}
                liquidadorInicial={liquidadorState}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  setLiquidadorState((prev) => fusionarLiquidadorSinPerderPresupuestoNsr(liq, prev));
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoBbvaCat}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorBbvaCat
                key={`liq-${casoId}-${restoreNonce}`}
                casoBbvaCat={casoBbvaCat}
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
      {archiveroAbierto && casoBbvaCat && (
        <ExpressModal
          open
          onClose={() => setArchiveroAbierto(false)}
          title={t('bbvaCat.archive.title')}
          wide
        >
          <ArchiveroBbvaCat
            origen={esModuloListado ? 'listado' : 'cat'}
            caso={casoBbvaCat}
            etiquetaInicial={
              tabActivo === TABS_BBVA_CAT.INFORME
                ? 'INFORME'
                : tabActivo === TABS_BBVA_CAT.LIQUIDADOR
                  ? 'LIQUIDACION'
                  : 'GENERAL'
            }
            onClose={() => setArchiveroAbierto(false)}
            onChanged={(actualizado) => setCasoBbvaCat(actualizado)}
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
          setCasoBbvaCat((prev) => ({
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

export function RedirectBbvaCatLiquidador() {
  return <CasoBbvaCatWorkspace tabInicial={TABS_BBVA_CAT.LIQUIDADOR} />;
}

export function RedirectBbvaCatInforme() {
  return <CasoBbvaCatWorkspace tabInicial={TABS_BBVA_CAT.INFORME} />;
}

export function RedirectBbvaCatListadoWorkspace() {
  return <CasoBbvaCatWorkspace origen="listado" tabInicial={TABS_BBVA_CAT.LIQUIDADOR} />;
}
