import React, { useEffect, useState } from 'react';
import LazyGatedImage from './LazyGatedImage.jsx';
import { resolverUrlImagen } from '../../services/storageSignedUrl.js';

/**
 * Imagen de plataforma: resuelve URL firmada S3 y carga con cola/lazy.
 * No cambia archivos en BD; solo cómo se muestran.
 */
export default function StorageLazyImage({
  imagen,
  src: srcProp,
  alt = '',
  className = '',
  style,
  onClick,
  onError,
  draggable = false,
}) {
  const [src, setSrc] = useState(() => {
    if (srcProp && (srcProp.startsWith('blob:') || srcProp.startsWith('data:'))) return srcProp;
    if (imagen?.preview) return imagen.preview;
    return null;
  });

  useEffect(() => {
    let cancelado = false;
    const entrada = srcProp || imagen;
    if (
      typeof entrada === 'string' &&
      (entrada.startsWith('blob:') || entrada.startsWith('data:'))
    ) {
      setSrc(entrada);
      return undefined;
    }
    if (imagen?.preview) {
      setSrc(imagen.preview);
      return undefined;
    }
    (async () => {
      const url = await resolverUrlImagen(entrada);
      if (!cancelado) setSrc(url);
    })();
    return () => {
      cancelado = true;
    };
  }, [imagen, srcProp, imagen?.preview, imagen?.ruta, imagen?._id]);

  if (!src) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(156,163,175,0.25)',
        }}
      >
        <span className="text-[10px] uppercase tracking-wide text-gray-500">…</span>
      </div>
    );
  }

  return (
    <LazyGatedImage
      src={src}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onError={onError}
      draggable={draggable}
    />
  );
}
