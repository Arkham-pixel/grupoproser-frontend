import React, { useState } from 'react';
import { FaDownload, FaSpinner } from 'react-icons/fa';
import { abrirODescargarArchivo } from '../../services/storageSignedUrl.js';

/**
 * Descarga de archivos de plataforma vía URL firmada S3.
 * Reemplaza <a href={proxy}> que saturaba el API.
 */
export default function BotonDescargaStorage({
  ruta,
  nombre,
  className = '',
  children,
  title,
  onError,
}) {
  const [busy, setBusy] = useState(false);
  if (!ruta) return null;

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await abrirODescargarArchivo(ruta, { nombre: nombre || undefined });
    } catch (err) {
      console.error(err);
      onError?.(err);
      window.alert(err?.message || 'No se pudo descargar el archivo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      title={title}
      disabled={busy}
      onClick={handleClick}
      className={
        className ||
        'inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60 dark:border-gray-700 dark:text-sky-300'
      }
    >
      {busy ? <FaSpinner className="animate-spin" /> : <FaDownload />}
      {children}
    </button>
  );
}
