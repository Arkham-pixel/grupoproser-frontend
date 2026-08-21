import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { FaSave } from 'react-icons/fa';
import InformeUnicoAllias from './InformeUnicoAllias.jsx';
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
  guardarInformeUnicoEnCasoAllias,
} from '../../services/alliasService.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function InformeUnicoAlliasPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoAllias, setcasoAllias] = useState(location.state?.casoAllias ?? null);
  const [informeState, setInformeState] = useState(null);
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
        if (!cancelado) setError(err.message || t('allias.reportUnique.loadError'));
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
    return t('allias.reportUnique.subtitle');
  }, [casoAllias, t]);

  const handleGuardar = async (informeArg) => {
    if (!casoId) {
      setError(t('allias.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('allias.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarInformeUnicoEnCasoAllias({
        casoId,
        informeUnico: informe,
        casoBase: casoAllias || {},
      });
      setcasoAllias(actualizado);
      setMensaje(t('allias.reportUnique.savedMessage'));
    } catch (err) {
      console.error(err);
      setError(err.message || t('allias.reportUnique.saveError'));
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
              {t('allias.reportUnique.title')}
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
                  ? t('allias.reportUnique.saving')
                  : t('allias.reportUnique.saveDraft')}
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
            hint={t('allias.reportUnique.pickCase')}
          />
        )}

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('allias.reportUnique.loading')}</p>
            ) : (
              <InformeUnicoAllias
                casoAllias={casoAllias}
                onEstadoChange={setInformeState}
                onGuardarEnCaso={casoId ? handleGuardar : undefined}
                onCasoChange={setcasoAllias}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
