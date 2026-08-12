import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
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
} from '../../services/zurichService.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function InformeUnicoZurichPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoZurich, setcasoZurich] = useState(location.state?.casoZurich ?? null);
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
        if (!cancelado) setError(err.message || t('zurich.reportUnique.loadError'));
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
    return t('zurich.reportUnique.subtitle');
  }, [casoZurich, t]);

  const handleGuardar = async (informeArg) => {
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
      setcasoZurich(actualizado);
      setMensaje(t('zurich.reportUnique.savedMessage'));
    } catch (err) {
      console.error(err);
      setError(err.message || t('zurich.reportUnique.saveError'));
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
              {t('zurich.reportUnique.title')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {casoId && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardando || !informeState}
                onClick={() => handleGuardar()}
              >
                <FaSave />{' '}
                {guardando
                  ? t('zurich.reportUnique.saving')
                  : t('zurich.reportUnique.saveDraft')}
              </button>
            )}
            <Link
              to={casoId ? `/zurich/liquidador?casoId=${casoId}` : '/zurich/liquidador'}
              className={expressBtnGhost}
            >
              {t('zurich.reportUnique.goSettlement')}
            </Link>
            <Link to="/zurich/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('zurich.reportUnique.backReport')}
            </Link>
          </div>
        </div>

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('zurich.reportUnique.loading')}</p>
            ) : (
              <InformeUnicoZurich
                casoZurich={casoZurich}
                onEstadoChange={setInformeState}
                onGuardarEnCaso={casoId ? handleGuardar : undefined}
                onCasoChange={setcasoZurich}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
