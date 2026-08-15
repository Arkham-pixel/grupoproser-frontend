import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown, FaFilePdf, FaBookOpen } from 'react-icons/fa';
import {
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  fetchCondicionAlfaBlobUrl,
  getCondicionesAlfa,
} from '../../services/segurosAlfaService.js';

function labelFromFileName(name = '') {
  return String(name)
    .replace(/\.pdf$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Botón Condiciones del reporte Alfa: menú con PDFs de la raíz SharePoint PÓLIZAS.
 */
export default function AlfaCondicionesMenu() {
  const [abierto, setAbierto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState('');
  const [error, setError] = useState('');
  const [docs, setDocs] = useState([]);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const loadedRef = useRef(false);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCondicionesAlfa();
      setDocs(Array.isArray(data?.documents) ? data.documents : []);
      loadedRef.current = true;
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las condiciones');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    if (!abierto || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuAltoApprox = 280;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const abrirArriba = espacioAbajo < menuAltoApprox && rect.top > menuAltoApprox;
    setCoords({
      top: abrirArriba ? null : rect.bottom + 4,
      bottom: abrirArriba ? window.innerHeight - rect.top + 4 : null,
      left: Math.min(Math.max(8, rect.right - 320), window.innerWidth - 328),
    });
  }, [abierto, docs.length]);

  useEffect(() => {
    if (!abierto) return undefined;
    if (!loadedRef.current) cargar();
    const cerrar = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setAbierto(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    const onScroll = () => setAbierto(false);
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [abierto]);

  const abrirDocumento = async (doc) => {
    if (!doc?.id) return;
    setOpeningId(doc.id);
    setError('');
    try {
      const url = await fetchCondicionAlfaBlobUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setAbierto(false);
    } catch (err) {
      setError(err.message || 'No se pudo abrir el documento');
    } finally {
      setOpeningId('');
    }
  };

  const menu = abierto
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[80] w-80 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-[#1A1A1A]"
          style={{
            top: coords.top ?? undefined,
            bottom: coords.bottom ?? undefined,
            left: coords.left,
          }}
        >
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
              Condiciones · SharePoint
            </p>
          </div>
          {loading && (
            <p className="px-3 py-3 font-body text-sm text-gray-500">Cargando documentos…</p>
          )}
          {!loading && error && (
            <div className="space-y-2 px-3 py-3">
              <p className="font-body text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                className="font-body text-sm font-semibold text-fenix-primario hover:underline"
                onClick={cargar}
              >
                Reintentar
              </button>
            </div>
          )}
          {!loading && !error && docs.length === 0 && (
            <p className="px-3 py-3 font-body text-sm text-gray-500">
              No hay PDFs en la carpeta de pólizas.
            </p>
          )}
          {!loading &&
            !error &&
            docs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                role="menuitem"
                disabled={Boolean(openingId)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left font-body text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-800"
                onClick={() => abrirDocumento(doc)}
                title={doc.name}
              >
                <FaFilePdf className="mt-0.5 shrink-0 text-fenix-primario" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {openingId === doc.id ? 'Abriendo…' : labelFromFileName(doc.name)}
                  </span>
                  <span className="block truncate text-xs text-gray-400">{doc.name}</span>
                </span>
              </button>
            ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={expressBtnSecondary}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <FaBookOpen />
        Condiciones
        <FaChevronDown className="opacity-70" />
      </button>
      {menu}
    </>
  );
}
