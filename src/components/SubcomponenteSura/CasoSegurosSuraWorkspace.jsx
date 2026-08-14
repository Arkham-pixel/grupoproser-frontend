import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorSegurosSura from './LiquidadorSegurosSura.jsx';
import InformeUnicoSegurosSura from './InformeUnicoSegurosSura.jsx';
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
  getCasoSuraById,
  guardarInformeUnicoEnCasoSura,
  guardarLiquidadorEnCasoSura,
} from '../../services/segurosSuraService.js';
import { calcularLiquidacionSura } from './liquidadorSuraHelpers.js';
import useSuraCasoAutosave from '../../hooks/useSuraCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_SURA = {
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
 * Workspace Sura: un solo caso con menú de pills
 * — Liquidador | Informe único —
 */
export default function CasoSegurosSuraWorkspace({ tabInicial = null } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');

  const tabActivo = useMemo(() => {
    const raw = tabFromQuery || tabInicial || TABS_SURA.LIQUIDADOR;
    return raw === TABS_SURA.INFORME || raw === 'informe-unico'
      ? TABS_SURA.INFORME
      : TABS_SURA.LIQUIDADOR;
  }, [tabInicial, tabFromQuery]);

  // Sincroniza ?tab= al entrar por rutas legacy (/liquidador, /informe-unico)
  useEffect(() => {
    if (tabFromQuery || !tabInicial) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabInicial === TABS_SURA.INFORME ? TABS_SURA.INFORME : TABS_SURA.LIQUIDADOR);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [casoSura, setCasoSura] = useState(location.state?.casoSura ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [informeState, setInformeState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const casoId = casoSura?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoSura) {
        setCasoSura(location.state.casoSura);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoSuraById(casoIdFromQuery);
        if (!cancelado) setCasoSura(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || t('segurosSura.workspace.loadError'));
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
    if (casoSura?.tomador || casoSura?.siniestro) {
      return `${casoSura.tomador || '—'}${casoSura.consecutivo ? ` · ${casoSura.consecutivo}` : ''}${
        casoSura.siniestro ? ` · ${casoSura.siniestro}` : ''
      }`;
    }
    return t('segurosSura.workspace.subtitle');
  }, [casoSura, t]);

  const handleGuardarLiquidador = async (liqArg, totArg) => {
    if (!casoId) {
      setError(t('segurosSura.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionSura(liquidador || {});
    if (!liquidador) {
      setError(t('segurosSura.settlement.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarLiquidadorEnCasoSura({
        casoId,
        liquidador,
        totales,
        casoBase: casoSura || {},
      });
      setCasoSura(actualizado);
      setMensaje(t('segurosSura.settlement.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.settlement.saveError'));
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
      setError(t('segurosSura.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('segurosSura.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarInformeUnicoEnCasoSura({
        casoId,
        informeUnico: informe,
        casoBase: casoSura || {},
      });
      setCasoSura(actualizado);
      setMensaje(t('segurosSura.reportUnique.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.reportUnique.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarActual = () => {
    if (tabActivo === TABS_SURA.INFORME) return handleGuardarInforme();
    return handleGuardarLiquidador();
  };

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoSura(actualizado);
  }, []);

  useSuraCasoAutosave({
    casoId,
    casoSura,
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
              Seguros Sura
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('segurosSura.workspace.title')}
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
                  (tabActivo === TABS_SURA.INFORME ? !informeState : !liquidadorState)
                }
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('segurosSura.workspace.saving')
                  : t('segurosSura.workspace.saveCurrent')}
              </button>
            )}
            <Link to="/sura/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('segurosSura.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {t('segurosSura.workspace.pickCase')}{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => navigate('/sura/reporte')}
            >
              {t('segurosSura.workspace.goReport')}
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
            className={pillClass(tabActivo === TABS_SURA.LIQUIDADOR)}
            onClick={() => setTab(TABS_SURA.LIQUIDADOR)}
          >
            1. {t('segurosSura.workspace.tabSettlement')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_SURA.INFORME)}
            onClick={() => setTab(TABS_SURA.INFORME)}
          >
            2. {t('segurosSura.workspace.tabUniqueReport')}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('segurosSura.workspace.loading')}</p>
            ) : tabActivo === TABS_SURA.INFORME ? (
              <InformeUnicoSegurosSura
                casoSura={casoSura}
                onEstadoChange={setInformeState}
                onLiquidadorChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoSura}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorSegurosSura
                casoSura={casoSura}
                onEstadoChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarLiquidador : undefined}
                onCasoChange={setCasoSura}
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
export function RedirectSuraLiquidador() {
  return <CasoSegurosSuraWorkspace tabInicial={TABS_SURA.LIQUIDADOR} />;
}

export function RedirectSuraInforme() {
  return <CasoSegurosSuraWorkspace tabInicial={TABS_SURA.INFORME} />;
}
