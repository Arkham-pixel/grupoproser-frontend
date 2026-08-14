import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
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
} from '../../services/segurosSuraService.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function InformeUnicoSegurosSuraPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoSura, setCasoSura] = useState(location.state?.casoSura ?? null);
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
        if (!cancelado) setError(err.message || t('segurosSura.reportUnique.loadError'));
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
      return `${casoSura.tomador || '—'}${casoSura.consecutivo ? ` · ${casoSura.consecutivo}` : ''}${
        casoSura.siniestro ? ` · ${casoSura.siniestro}` : ''
      }`;
    }
    return t('segurosSura.reportUnique.subtitle');
  }, [casoSura, t]);

  const handleGuardar = async (informeArg) => {
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
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.reportUnique.saveError'));
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
              {t('segurosSura.reportUnique.title')}
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
                  ? t('segurosSura.reportUnique.saving')
                  : t('segurosSura.reportUnique.saveDraft')}
              </button>
            )}
            <Link
              to={casoId ? `/sura/liquidador?casoId=${casoId}` : '/sura/liquidador'}
              className={expressBtnGhost}
            >
              {t('segurosSura.reportUnique.goSettlement')}
            </Link>
            <Link to="/sura/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('segurosSura.reportUnique.backReport')}
            </Link>
          </div>
        </div>

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('segurosSura.reportUnique.loading')}</p>
            ) : (
              <InformeUnicoSegurosSura
                casoSura={casoSura}
                onEstadoChange={setInformeState}
                onGuardarEnCaso={casoId ? handleGuardar : undefined}
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
