import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { getCasoBbvaCatById } from '../../services/bbvaCatService.js';
import {
  fetchAllCasosBbvaCatListado,
  getCasoBbvaCatListadoById,
} from '../../services/bbvaCatListadoService.js';
import ArchiveroBbvaCat from './ArchiveroBbvaCat.jsx';
import BbvaCatCasoPicker from './BbvaCatCasoPicker.jsx';
import { casoTieneArchivosBbvaCat } from './bbvaCatHelpers.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

function claveCaso(caso) {
  return String(caso?.zc || caso?.siniestro || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function encontrarListadoPorCat(lista, casoCat) {
  const k = claveCaso(casoCat);
  if (!k) return null;
  return (
    lista.find((c) => claveCaso(c) === k) ||
    lista.find((c) => String(c.siniestro || '').trim() === String(casoCat.siniestro || '').trim()) ||
    null
  );
}

export default function ArchiveroBbvaCatPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [caso, setCaso] = useState(null);
  const [listaCasos, setListaCasos] = useState([]);
  const [busquedaCaso, setBusquedaCaso] = useState('');
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setCargandoLista(true);
    fetchAllCasosBbvaCatListado(2000)
      .then((data) => {
        if (!cancelado) setListaCasos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelado) {
          setListaCasos([]);
          setError(err.message || t('bbvaCat.report.loadError'));
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoLista(false);
      });
    return () => {
      cancelado = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery) {
        setCaso(null);
        return;
      }
      const enLista = listaCasos.find((c) => String(c._id) === String(casoIdFromQuery));
      if (enLista) {
        setCaso(enLista);
        return;
      }
      if (cargandoLista) return;
      setCargandoCaso(true);
      setError('');
      try {
        try {
          const actual = await getCasoBbvaCatListadoById(casoIdFromQuery);
          if (!cancelado) setCaso(actual);
          return;
        } catch {
          /* id de inspección CAT */
        }
        const casoCat = await getCasoBbvaCatById(casoIdFromQuery);
        const listado = encontrarListadoPorCat(listaCasos, casoCat);
        if (!listado) {
          throw new Error(t('bbvaCat.archive.noListadoMatch'));
        }
        if (!cancelado) {
          const next = new URLSearchParams(searchParams);
          next.set('casoId', listado._id);
          setSearchParams(next, { replace: true });
          setCaso(listado);
        }
      } catch (err) {
        if (!cancelado) {
          setCaso(null);
          setError(err.message || t('bbvaCat.workspace.loadError'));
        }
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, listaCasos, cargandoLista, t]);

  const subtitulo = useMemo(() => {
    if (caso?.tomador || caso?.siniestro || caso?.asegurado || caso?.zc) {
      return [caso.tomador || caso.asegurado, caso.consecutivo, caso.zc || caso.siniestro]
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

  const primerConDocs = listaCasos.find((c) => casoTieneArchivosBbvaCat(c));

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

        {cargandoLista ? (
          <p className="mb-4 font-body text-sm text-gray-500">{t('bbvaCat.workspace.loading')}</p>
        ) : (
          <BbvaCatCasoPicker
            casos={listaCasos}
            busqueda={busquedaCaso}
            onBusqueda={setBusquedaCaso}
            onSelect={elegirCaso}
            casoIdActivo={caso?._id || casoIdFromQuery}
            hint={t('bbvaCat.archive.pickCase')}
            soloConArchivosInicial
          />
        )}

        {error ? (
          <p className="mb-4 font-body text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('bbvaCat.workspace.loading')}</p>
            ) : caso?._id ? (
              <ArchiveroBbvaCat origen="listado" caso={caso} onChanged={setCaso} />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t('bbvaCat.archive.pickCase')}</p>
                {primerConDocs ? (
                  <button
                    type="button"
                    className="font-body text-sm font-semibold text-[#004481] hover:underline"
                    onClick={() => elegirCaso(primerConDocs)}
                  >
                    Abrir el primer caso con documentos ({primerConDocs.zc || primerConDocs.siniestro})
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
