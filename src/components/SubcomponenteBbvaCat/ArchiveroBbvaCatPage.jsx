import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { fetchAllCasosBbvaCat, getCasoBbvaCatById } from '../../services/bbvaCatService.js';
import ArchiveroBbvaCat from './ArchiveroBbvaCat.jsx';
import BbvaCatCasoPicker from './BbvaCatCasoPicker.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function ArchiveroBbvaCatPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [caso, setCaso] = useState(null);
  const [listaCasos, setListaCasos] = useState([]);
  const [busquedaCaso, setBusquedaCaso] = useState('');
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [error, setError] = useState('');

  const casoId = caso?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery) {
        setCaso(null);
        return;
      }
      setCargandoCaso(true);
      setError('');
      try {
        const actual = await getCasoBbvaCatById(casoIdFromQuery);
        if (!cancelado) setCaso(actual);
      } catch (err) {
        if (!cancelado) setError(err.message || t('bbvaCat.workspace.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, t]);

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
    if (caso?.tomador || caso?.siniestro || caso?.asegurado) {
      return [caso.tomador || caso.asegurado, caso.consecutivo, caso.siniestro]
        .filter(Boolean)
        .join(' · ');
    }
    return t('bbvaCat.archive.pageSubtitle');
  }, [caso, t]);

  const elegirCaso = (item) => {
    const next = new URLSearchParams(searchParams);
    next.set('casoId', item._id);
    setSearchParams(next);
    setCaso(item);
  };

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6">
          <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
            BBVA CAT
          </p>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            {t('bbvaCat.archive.pageTitle')}
          </h1>
          <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
        </div>

        {!casoId && !cargandoCaso && (
          <BbvaCatCasoPicker
            casos={listaCasos}
            busqueda={busquedaCaso}
            onBusqueda={setBusquedaCaso}
            onSelect={elegirCaso}
            hint={t('bbvaCat.archive.pickCase')}
          />
        )}

        {error ? (
          <p className="mb-4 font-body text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('bbvaCat.workspace.loading')}</p>
            ) : casoId && caso ? (
              <ArchiveroBbvaCat caso={caso} onChanged={setCaso} />
            ) : (
              <p className="text-sm text-gray-500">{t('bbvaCat.archive.pickCase')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
