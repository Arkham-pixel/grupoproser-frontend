import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorSegurosAlfa from './LiquidadorSegurosAlfa.jsx';
import InformeUnicoSegurosAlfa from './InformeUnicoSegurosAlfa.jsx';
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
} from '../../services/segurosAlfaService.js';
import { calcularLiquidacionAlfa } from './liquidadorAlfaHelpers.js';
import useAlfaCasoAutosave from '../../hooks/useAlfaCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';

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
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const casoId = casoAlfa?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoAlfa) {
        setCasoAlfa(location.state.casoAlfa);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoAlfaById(casoIdFromQuery);
        if (!cancelado) setCasoAlfa(caso);
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
    if (casoAlfa?.tomador || casoAlfa?.siniestro) {
      return `${casoAlfa.tomador || '—'}${casoAlfa.consecutivo ? ` · ${casoAlfa.consecutivo}` : ''}${
        casoAlfa.siniestro ? ` · ${casoAlfa.siniestro}` : ''
      }`;
    }
    return t('segurosAlfa.workspace.subtitle');
  }, [casoAlfa, t]);

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
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarLiquidadorEnCasoAlfa({
        casoId,
        liquidador,
        totales,
        casoBase: casoAlfa || {},
      });
      setCasoAlfa(actualizado);
      setMensaje(t('segurosAlfa.settlement.savedMessage'));
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
      const actualizado = await guardarInformeUnicoEnCasoAlfa({
        casoId,
        informeUnico: informe,
        casoBase: casoAlfa || {},
      });
      setCasoAlfa(actualizado);
      setMensaje(t('segurosAlfa.reportUnique.savedMessage'));
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
    enabled: Boolean(casoId) && !cargandoCaso,
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
                casoAlfa={casoAlfa}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoAlfa}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorSegurosAlfa
                casoAlfa={casoAlfa}
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

/** Redirecciones desde rutas antiguas hacia el workspace unificado. */
export function RedirectAlfaLiquidador() {
  return <CasoSegurosAlfaWorkspace tabInicial={TABS_ALFA.LIQUIDADOR} />;
}

export function RedirectAlfaInforme() {
  return <CasoSegurosAlfaWorkspace tabInicial={TABS_ALFA.INFORME} />;
}
