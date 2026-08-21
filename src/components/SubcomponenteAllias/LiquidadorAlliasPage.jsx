import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { FaSave } from 'react-icons/fa';
import LiquidadorAllias from './LiquidadorAllias.jsx';
import AlliasCasoPicker from './AlliasCasoPicker.jsx';
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
  fetchAllCasosAllias,
  getCasoAlliasById,
  guardarLiquidadorEnCasoAllias,
} from '../../services/alliasService.js';
import { calcularLiquidacionAllias } from './liquidadorAlliasHelpers.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function LiquidadorAlliasPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoAllias, setcasoAllias] = useState(location.state?.casoAllias ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [listaCasos, setListaCasos] = useState([]);
  const [busquedaCaso, setBusquedaCaso] = useState('');

  const casoId = casoAllias?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoAllias) {
        setcasoAllias(location.state.casoAllias);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoAlliasById(casoIdFromQuery);
        if (!cancelado) setcasoAllias(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || t('allias.settlement.loadError'));
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
    fetchAllCasosAllias()
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
    if (casoAllias?.tomador || casoAllias?.siniestro) {
      return `${casoAllias.tomador || '—'}${casoAllias.consecutivo ? ` · ${casoAllias.consecutivo}` : ''}${
        casoAllias.siniestro ? ` · ${casoAllias.siniestro}` : ''
      }`;
    }
    return t('allias.settlement.subtitle');
  }, [casoAllias, t]);

  const handleEstadoChange = (liq, tot) => {
    setLiquidadorState(liq);
    setTotalesState(tot);
  };

  const handleGuardarEnCaso = async (liqArg, totArg) => {
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
      const actualizado = await guardarLiquidadorEnCasoAllias({
        casoId,
        liquidador,
        totales,
        casoBase: casoAllias || {},
      });
      setcasoAllias(actualizado);
      setMensaje(t('allias.settlement.savedMessage'));
    } catch (err) {
      console.error(err);
      setError(err.message || t('allias.settlement.saveError'));
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
              Allias
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('allias.settlement.title')}
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
                  ? t('allias.settlement.saving')
                  : t('allias.settlement.saveToCase')}
              </button>
            )}
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <AlliasCasoPicker
            casos={listaCasos}
            busqueda={busquedaCaso}
            onBusqueda={setBusquedaCaso}
            onSelect={(item) => {
              const next = new URLSearchParams(searchParams);
              next.set('casoId', item._id);
              setSearchParams(next);
              setcasoAllias(item);
            }}
            hint={t('allias.settlement.pickCase')}
          />
        )}

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('allias.settlement.loading')}</p>
            ) : (
              <LiquidadorAllias
                casoAllias={casoAllias}
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
