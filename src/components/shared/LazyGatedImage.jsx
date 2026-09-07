import React, { useEffect, useRef, useState } from 'react';

/**
 * Limita cuántas imágenes de red se descargan a la vez (proxy S3).
 * No cambia URLs ni calidad: solo evita saturar con 40–50 requests juntos.
 */
const MAX_CONCURRENT = 6;
let active = 0;
const cola = [];

function pumpCola() {
  while (active < MAX_CONCURRENT && cola.length) {
    const next = cola.shift();
    active += 1;
    next();
  }
}

function adquirirSlot() {
  return new Promise((resolve) => {
    const liberar = () => {
      active = Math.max(0, active - 1);
      pumpCola();
    };
    cola.push(() => resolve(liberar));
    pumpCola();
  });
}

/**
 * Vista previa diferida: solo pide la URL cuando entra en viewport
 * y respeta la cola global de concurrencia.
 * Blob/data URLs se muestran al instante (fotos recién subidas).
 */
export default function LazyGatedImage({
  src,
  alt = '',
  className = '',
  style,
  onClick,
  onError,
  draggable = false,
  rootMargin = '240px',
}) {
  const wrapRef = useRef(null);
  const liberarRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [readySrc, setReadySrc] = useState(null);
  const esLocal = Boolean(src && (src.startsWith('blob:') || src.startsWith('data:')));

  const soltarSlot = () => {
    if (liberarRef.current) {
      liberarRef.current();
      liberarRef.current = null;
    }
  };

  useEffect(() => {
    if (!src || esLocal) {
      setVisible(true);
      setReadySrc(src || null);
      return undefined;
    }
    setVisible(false);
    setReadySrc(null);
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [src, esLocal, rootMargin]);

  useEffect(() => {
    if (!visible || !src || esLocal) return undefined;
    let cancelado = false;

    (async () => {
      const liberar = await adquirirSlot();
      if (cancelado) {
        liberar();
        return;
      }
      liberarRef.current = liberar;
      setReadySrc(src);
    })();

    return () => {
      cancelado = true;
      soltarSlot();
    };
  }, [visible, src, esLocal]);

  return (
    <div ref={wrapRef} className={className} style={style} onClick={onClick}>
      {readySrc ? (
        <img
          src={readySrc}
          alt={alt}
          className="h-full w-full object-cover"
          draggable={draggable}
          loading="lazy"
          decoding="async"
          onLoad={soltarSlot}
          onError={(e) => {
            soltarSlot();
            onError?.(e);
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-200/80 dark:bg-gray-700/60">
          <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            …
          </span>
        </div>
      )}
    </div>
  );
}
