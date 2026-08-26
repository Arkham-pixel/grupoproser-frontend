import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorSegurosSura from './LiquidadorSegurosSura.jsx';
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
  guardarLiquidadorEnCasoSura,
} from '../../services/segurosSuraService.js';
import { calcularLiquidacionSura } from './liquidadorSuraHelpers.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function LiquidadorSegurosSuraPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoSura, setCasoSura] = useState(location.state?.casoSura ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
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
        if (!cancelado) setError(err.message || t('segurosSura.settlement.loadError'));
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
    if (casoSura?.tomador || casoSura?.siniestro) {
      return `${casoSura.tomador || '—'}${casoSura.siniestro ? ` · ${casoSura.siniestro}` : ''}${
        casoSura.consecutivo ? ` · ${casoSura.consecutivo}` : ''
      }`;
    }
    return t('segurosSura.settlement.subtitle');
  }, [casoSura, t]);

  const handleEstadoChange = (liq, tot) => {
    setLiquidadorState(liq);
    setTotalesState(tot);
  };

  const handleGuardarEnCaso = async (liqArg, totArg) => {
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
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.settlement.saveError'));
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
              Seguros Sura
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('segurosSura.settlement.title')}
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
                  ? t('segurosSura.settlement.saving')
                  : t('segurosSura.settlement.saveToCase')}
              </button>
            )}
            <Link to="/sura/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('segurosSura.settlement.backReport')}
            </Link>
          </div>
        </div>

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('segurosSura.settlement.loading')}</p>
            ) : (
              <LiquidadorSegurosSura
                casoSura={casoSura}
                onEstadoChange={handleEstadoChange}
                onGuardarEnCaso={casoId ? handleGuardarEnCaso : undefined}
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
