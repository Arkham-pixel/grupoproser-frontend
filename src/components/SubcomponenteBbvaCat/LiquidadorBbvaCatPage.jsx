import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { FaSave } from 'react-icons/fa';
import LiquidadorBbvaCat from './LiquidadorBbvaCat.jsx';
import BbvaCatCasoPicker from './BbvaCatCasoPicker.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  fetchAllCasosBbvaCat,
  getCasoBbvaCatById,
  guardarLiquidadorEnCasoBbvaCat,
} from '../../services/bbvaCatService.js';
import { calcularLiquidacionBbvaCat } from './liquidadorBbvaCatHelpers.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function LiquidadorBbvaCatPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoBbvaCat, setcasoBbvaCat] = useState(location.state?.casoBbvaCat ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [listaCasos, setListaCasos] = useState([]);
  const [busquedaCaso, setBusquedaCaso] = useState('');

  const casoId = casoBbvaCat?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoBbvaCat) {
        setcasoBbvaCat(location.state.casoBbvaCat);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoBbvaCatById(casoIdFromQuery);
        if (!cancelado) setcasoBbvaCat(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || t('bbvaCat.settlement.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, location.state, t]);

  useEffect(() => {
    if (casoIdFromQuery) return undefined;
    let cancelado = false;
    fetchAllCasosBbvaCat()
      .then((data) => {
        if (!cancelado) setListaCasos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelado) setListaCasos([]);
      });
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery]);

  const subtitulo = useMemo(() => {
    if (casoBbvaCat?.tomador || casoBbvaCat?.siniestro) {
      return `${casoBbvaCat.tomador || '—'}${casoBbvaCat.consecutivo ? ` · ${casoBbvaCat.consecutivo}` : ''}${
        casoBbvaCat.siniestro ? ` · ${casoBbvaCat.siniestro}` : ''
      }`;
    }
    return t('bbvaCat.settlement.subtitle');
  }, [casoBbvaCat, t]);

  const handleEstadoChange = (liq, tot) => {
    setLiquidadorState(liq);
    setTotalesState(tot);
  };

  const handleGuardarEnCaso = async (liqArg, totArg) => {
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
      const actualizado = await guardarLiquidadorEnCasoBbvaCat({
        casoId,
        liquidador,
        totales,
        casoBase: casoBbvaCat || {},
      });
      setcasoBbvaCat(actualizado);
      setMensaje(t('bbvaCat.settlement.savedMessage'));
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.settlement.saveError'));
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
              BBVA CAT
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('bbvaCat.settlement.title')}
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
                  ? t('bbvaCat.settlement.saving')
                  : t('bbvaCat.settlement.saveToCase')}
              </button>
            )}
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <BbvaCatCasoPicker
            casos={listaCasos}
            busqueda={busquedaCaso}
            onBusqueda={setBusquedaCaso}
            onSelect={(item) => {
              const next = new URLSearchParams(searchParams);
              next.set('casoId', item._id);
              setSearchParams(next);
              setcasoBbvaCat(item);
            }}
            hint={t('bbvaCat.settlement.pickCase')}
          />
        )}

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('bbvaCat.settlement.loading')}</p>
            ) : (
              <LiquidadorBbvaCat
                casoBbvaCat={casoBbvaCat}
                onEstadoChange={handleEstadoChange}
                onGuardarEnCaso={casoId ? handleGuardarEnCaso : undefined}
                onCasoChange={setcasoBbvaCat}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
