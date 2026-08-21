import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { FaSave } from 'react-icons/fa';
import InformeUnicoBbvaCat from './InformeUnicoBbvaCat.jsx';
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
  guardarInformeUnicoEnCasoBbvaCat,
} from '../../services/bbvaCatService.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function InformeUnicoBbvaCatPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoBbvaCat, setcasoBbvaCat] = useState(location.state?.casoBbvaCat ?? null);
  const [informeState, setInformeState] = useState(null);
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
        if (!cancelado) setError(err.message || t('bbvaCat.reportUnique.loadError'));
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
    return t('bbvaCat.reportUnique.subtitle');
  }, [casoBbvaCat, t]);

  const handleGuardar = async (informeArg) => {
    if (!casoId) {
      setError(t('bbvaCat.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('bbvaCat.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarInformeUnicoEnCasoBbvaCat({
        casoId,
        informeUnico: informe,
        casoBase: casoBbvaCat || {},
      });
      setcasoBbvaCat(actualizado);
      setMensaje(t('bbvaCat.reportUnique.savedMessage'));
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.reportUnique.saveError'));
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
              {t('bbvaCat.reportUnique.title')}
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
                  ? t('bbvaCat.reportUnique.saving')
                  : t('bbvaCat.reportUnique.saveDraft')}
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
            hint={t('bbvaCat.reportUnique.pickCase')}
          />
        )}

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('bbvaCat.reportUnique.loading')}</p>
            ) : (
              <InformeUnicoBbvaCat
                casoBbvaCat={casoBbvaCat}
                onEstadoChange={setInformeState}
                onGuardarEnCaso={casoId ? handleGuardar : undefined}
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
