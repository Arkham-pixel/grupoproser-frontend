import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
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
} from '../../services/segurosAlfaService.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function InformeUnicoSegurosAlfaPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoAlfa, setCasoAlfa] = useState(location.state?.casoAlfa ?? null);
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
        if (!cancelado) setError(err.message || t('segurosAlfa.reportUnique.loadError'));
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
    if (casoAlfa?.tomador || casoAlfa?.siniestro) {
      return `${casoAlfa.tomador || '—'}${casoAlfa.consecutivo ? ` · ${casoAlfa.consecutivo}` : ''}${
        casoAlfa.siniestro ? ` · ${casoAlfa.siniestro}` : ''
      }`;
    }
    return t('segurosAlfa.reportUnique.subtitle');
  }, [casoAlfa, t]);

  const handleGuardar = async (informeArg) => {
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
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.reportUnique.saveError'));
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
              Seguros Alfa
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('segurosAlfa.reportUnique.title')}
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
                  ? t('segurosAlfa.reportUnique.saving')
                  : t('segurosAlfa.reportUnique.saveDraft')}
              </button>
            )}
            <Link
              to={casoId ? `/seguros-alfa/liquidador?casoId=${casoId}` : '/seguros-alfa/liquidador'}
              className={expressBtnGhost}
            >
              {t('segurosAlfa.reportUnique.goSettlement')}
            </Link>
            <Link to="/seguros-alfa/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('segurosAlfa.reportUnique.backReport')}
            </Link>
          </div>
        </div>

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('segurosAlfa.reportUnique.loading')}</p>
            ) : (
              <InformeUnicoSegurosAlfa
                casoAlfa={casoAlfa}
                onEstadoChange={setInformeState}
                onGuardarEnCaso={casoId ? handleGuardar : undefined}
                onCasoChange={setCasoAlfa}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
