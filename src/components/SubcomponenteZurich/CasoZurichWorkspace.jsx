import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorZurich from './LiquidadorZurich.jsx';
import InspeccionCatZurich from './InspeccionCatZurich.jsx';
import InformeUnicoZurich from './InformeUnicoZurich.jsx';
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
  getCasoZurichById,
  guardarInformeUnicoEnCasoZurich,
  guardarLiquidadorEnCasoZurich,
} from '../../services/zurichService.js';
import { calcularLiquidacionZurich } from './liquidadorZurichHelpers.js';
import useZurichCasoAutosave from '../../hooks/useZurichCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_ZURICH = {
  LIQUIDADOR: 'liquidador',
  CAT: 'cat',
  INFORME: 'informe',
};

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace Zurich: Inspección CAT | Liquidador | Informe único
 * (CAT e informe único son independientes)
 */
export default function CasoZurichWorkspace({ tabInicial = null } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');

  const tabActivo = useMemo(() => {
    const raw = tabFromQuery || tabInicial || TABS_ZURICH.CAT;
    if (raw === TABS_ZURICH.CAT || raw === 'inspeccion-cat' || raw === 'catastrofico') {
      return TABS_ZURICH.CAT;
    }
    if (raw === TABS_ZURICH.INFORME || raw === 'informe-unico') {
      return TABS_ZURICH.INFORME;
    }
    return TABS_ZURICH.LIQUIDADOR;
  }, [tabInicial, tabFromQuery]);

  useEffect(() => {
    if (tabFromQuery || !tabInicial) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabInicial);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [casoZurich, setCasoZurich] = useState(location.state?.casoZurich ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [informeState, setInformeState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const casoId = casoZurich?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoZurich) {
        setCasoZurich(location.state.casoZurich);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoZurichById(casoIdFromQuery);
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
  }, [casoIdFromQuery, location.state, t]);

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
    if (casoZurich?.tomador || casoZurich?.siniestro) {
      return `${casoZurich.tomador || '—'}${casoZurich.consecutivo ? ` · ${casoZurich.consecutivo}` : ''}${
        casoZurich.siniestro ? ` · ${casoZurich.siniestro}` : ''
      }`;
    }
    return t('zurich.workspace.subtitle');
  }, [casoZurich, t]);

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
      const actualizado = await guardarLiquidadorEnCasoZurich({
        casoId,
        liquidador,
        totales,
        casoBase: casoZurich || {},
      });
      setCasoZurich(actualizado);
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
      const actualizado = await guardarInformeUnicoEnCasoZurich({
        casoId,
        informeUnico: informe,
        casoBase: casoZurich || {},
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

  const handleGuardarActual = () => {
    if (tabActivo === TABS_ZURICH.INFORME) return handleGuardarInforme();
    if (tabActivo === TABS_ZURICH.CAT) return undefined; // CAT guarda en su propio botón
    return handleGuardarLiquidador();
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
    enabled: Boolean(casoId) && !cargandoCaso && tabActivo !== TABS_ZURICH.CAT,
  });

  const mostrarBotonGuardarSuperior =
    casoId && tabActivo !== TABS_ZURICH.CAT;

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Zurich
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('zurich.workspace.title')}
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
                  (tabActivo === TABS_ZURICH.INFORME ? !informeState : !liquidadorState)
                }
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('zurich.workspace.saving')
                  : t('zurich.workspace.saveCurrent')}
              </button>
            )}
            <Link to="/zurich/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('zurich.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {t('zurich.workspace.pickCase')}{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => navigate('/zurich/reporte')}
            >
              {t('zurich.workspace.goReport')}
            </button>
          </p>
        )}

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ZURICH.CAT)}
            onClick={() => setTab(TABS_ZURICH.CAT)}
          >
            1. {t('zurich.workspace.tabCat')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ZURICH.LIQUIDADOR)}
            onClick={() => setTab(TABS_ZURICH.LIQUIDADOR)}
          >
            2. {t('zurich.workspace.tabSettlement')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_ZURICH.INFORME)}
            onClick={() => setTab(TABS_ZURICH.INFORME)}
          >
            3. {t('zurich.workspace.tabUniqueReport')}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('zurich.workspace.loading')}</p>
            ) : tabActivo === TABS_ZURICH.CAT ? (
              <InspeccionCatZurich casoZurich={casoZurich} onCasoChange={setCasoZurich} />
            ) : tabActivo === TABS_ZURICH.INFORME ? (
              <InformeUnicoZurich
                casoZurich={casoZurich}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoZurich}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorZurich
                casoZurich={casoZurich}
                onEstadoChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarLiquidador : undefined}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RedirectZurichLiquidador() {
  return <CasoZurichWorkspace tabInicial={TABS_ZURICH.LIQUIDADOR} />;
}

export function RedirectZurichInforme() {
  return <CasoZurichWorkspace tabInicial={TABS_ZURICH.INFORME} />;
}

export function RedirectZurichCat() {
  return <CasoZurichWorkspace tabInicial={TABS_ZURICH.CAT} />;
}
