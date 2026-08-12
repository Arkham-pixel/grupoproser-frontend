import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorZurich from './LiquidadorZurich.jsx';
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
  guardarLiquidadorEnCasoZurich,
} from '../../services/zurichService.js';
import { calcularLiquidacionZurich } from './liquidadorZurichHelpers.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function LiquidadorZurichPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoZurich, setcasoZurich] = useState(location.state?.casoZurich ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const casoId = casoZurich?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoZurich) {
        setcasoZurich(location.state.casoZurich);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoZurichById(casoIdFromQuery);
        if (!cancelado) setcasoZurich(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || t('zurich.settlement.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, location.state, t]);

  const subtitulo = useMemo(() => {
    if (casoZurich?.tomador || casoZurich?.siniestro) {
      return `${casoZurich.tomador || '—'}${casoZurich.consecutivo ? ` · ${casoZurich.consecutivo}` : ''}${
        casoZurich.siniestro ? ` · ${casoZurich.siniestro}` : ''
      }`;
    }
    return t('zurich.settlement.subtitle');
  }, [casoZurich, t]);

  const handleEstadoChange = (liq, tot) => {
    setLiquidadorState(liq);
    setTotalesState(tot);
  };

  const handleGuardarEnCaso = async (liqArg, totArg) => {
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
      setcasoZurich(actualizado);
      setMensaje(t('zurich.settlement.savedMessage'));
    } catch (err) {
      console.error(err);
      setError(err.message || t('zurich.settlement.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Zurich
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('zurich.settlement.title')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {casoId && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardando || !liquidadorState}
                onClick={() => handleGuardarEnCaso()}
              >
                <FaSave />{' '}
                {guardando
                  ? t('zurich.settlement.saving')
                  : t('zurich.settlement.saveToCase')}
              </button>
            )}
            <Link to="/zurich/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('zurich.settlement.backReport')}
            </Link>
          </div>
        </div>

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('zurich.settlement.loading')}</p>
            ) : (
              <LiquidadorZurich
                casoZurich={casoZurich}
                onEstadoChange={handleEstadoChange}
                onGuardarEnCaso={casoId ? handleGuardarEnCaso : undefined}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
