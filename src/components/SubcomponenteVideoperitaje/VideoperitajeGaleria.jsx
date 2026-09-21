import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaPlay,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import { abrirODescargarArchivo, resolverUrlArchivo } from '../../services/storageSignedUrl.js';
import { descargarBloqueVideoperitaje } from '../../utils/videoperitajeDescargaBloque.js';
import { vpBtnGhost } from './videoperitajeUi.js';

function esVideo(m) {
  return m?.tipo === 'video' || String(m?.tipoMime || '').startsWith('video/');
}

function tituloMedia(m, i) {
  if (esVideo(m)) return m.descripcion || `Grabación ${i + 1}`;
  return m.descripcion || `Foto ${i + 1}`;
}

function Miniatura({ url, video, alt }) {
  if (video) {
    return (
      <div className="relative h-full w-full bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <FaPlay className="ml-0.5 text-sm" />
          </span>
          <span className="text-[11px] font-medium tracking-wide text-white/80">Video</span>
        </span>
      </div>
    );
  }
  if (!url) {
    return <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-xs text-zinc-400">…</div>;
  }
  return <img src={url} alt={alt} className="h-full w-full object-cover" />;
}

export default function VideoperitajeGaleria({ medias, tituloBloque = 'Videoperitaje' }) {
  const { t } = useTranslation();
  const lista = useMemo(() => medias || [], [medias]);
  const [urls, setUrls] = useState({});
  const [abierta, setAbierta] = useState(-1);
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const next = {};
      for (const m of lista) {
        next[m._id] = m.url || (await resolverUrlArchivo(m.ruta)) || '';
      }
      if (alive) setUrls(next);
    })();
    return () => {
      alive = false;
    };
  }, [lista]);

  useEffect(() => {
    if (abierta < 0) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setAbierta(-1);
      if (e.key === 'ArrowLeft') setAbierta((i) => (i <= 0 ? lista.length - 1 : i - 1));
      if (e.key === 'ArrowRight') setAbierta((i) => (i >= lista.length - 1 ? 0 : i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [abierta, lista.length]);

  if (!lista.length) return null;

  const actual = abierta >= 0 ? lista[abierta] : null;
  const urlActual = actual ? urls[actual._id] : '';
  const ir = (dir) => {
    setAbierta((i) => {
      const n = lista.length;
      return (i + dir + n) % n;
    });
  };

  const descargarUno = async (m) => {
    await abrirODescargarArchivo(m.ruta || m.url, {
      nombre: m.nombreOriginal || (esVideo(m) ? 'grabacion.webm' : 'foto.jpg'),
    });
  };

  const descargarBloque = async () => {
    setZipBusy(true);
    try {
      await descargarBloqueVideoperitaje(lista, { nombre: tituloBloque });
    } catch (err) {
      window.alert(err.message || t('videoperitaje.downloadBlockFail'));
    } finally {
      setZipBusy(false);
    }
  };

  const visor =
    actual &&
    createPortal(
      <div className="fixed inset-0 z-[200] flex flex-col bg-black" role="dialog" aria-modal="true">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
          <p className="min-w-0 truncate text-sm font-medium text-white/90">
            {tituloMedia(actual, abierta)}
            <span className="ml-2 text-white/50">
              {abierta + 1} / {lista.length}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => descargarUno(actual)}
              aria-label={t('common.download')}
            >
              <FaDownload />
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setAbierta(-1)}
              aria-label={t('common.close')}
            >
              <FaTimes />
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-14">
          {lista.length > 1 && (
            <button
              type="button"
              className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
              onClick={() => ir(-1)}
              aria-label={t('common.previous')}
            >
              <FaChevronLeft />
            </button>
          )}

          {urlActual ? (
            esVideo(actual) ? (
              <video
                key={actual._id}
                src={urlActual}
                controls
                playsInline
                preload="metadata"
                className="max-h-full max-w-full rounded-md"
              />
            ) : (
              <img
                src={urlActual}
                alt={tituloMedia(actual, abierta)}
                className="max-h-full max-w-full object-contain select-none"
              />
            )
          ) : (
            <p className="text-white/60">{t('common.loading')}</p>
          )}

          {lista.length > 1 && (
            <button
              type="button"
              className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
              onClick={() => ir(1)}
              aria-label={t('common.next')}
            >
              <FaChevronRight />
            </button>
          )}
        </div>

        {lista.length > 1 && (
          <nav className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-3">
            {lista.map((m, i) => (
              <button
                key={m._id || i}
                type="button"
                onClick={() => setAbierta(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-md ring-2 transition ${
                  i === abierta ? 'ring-white' : 'ring-transparent opacity-60 hover:opacity-100'
                }`}
                aria-label={tituloMedia(m, i)}
              >
                <Miniatura url={urls[m._id]} video={esVideo(m)} alt="" />
              </button>
            ))}
          </nav>
        )}
      </div>,
      document.body
    );

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t('videoperitaje.gallery')}
          <span className="ml-1 font-normal text-gray-400">({lista.length})</span>
        </p>
        <button type="button" className={vpBtnGhost} onClick={descargarBloque} disabled={zipBusy}>
          {zipBusy ? <FaSpinner className="animate-spin" /> : <FaDownload />}
          {t('videoperitaje.downloadBlock')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
        {lista.map((m, i) => (
          <button
            key={m._id || i}
            type="button"
            onClick={() => setAbierta(i)}
            className="relative aspect-square overflow-hidden rounded-md bg-zinc-100 outline-none ring-offset-2 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#c8102e]"
            aria-label={tituloMedia(m, i)}
          >
            <Miniatura url={urls[m._id]} video={esVideo(m)} alt={tituloMedia(m, i)} />
          </button>
        ))}
      </div>
      {visor}
    </div>
  );
}
