import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown, FaFilePdf, FaBookOpen, FaSearch } from 'react-icons/fa';
import { expressBtnSecondary } from '../SubcomponenteExpress/expressFenixUi.js';
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

function folderLabel(folder) {
  return folder ? String(folder) : 'Raíz PÓLIZAS';
}

function groupDocs(docs) {
  const map = new Map();
  for (const doc of docs) {
    const key = folderLabel(doc.folder);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  // POLIZAS GENERAL primero (más docs útiles), luego raíz
  return [...map.entries()].sort(([a], [b]) => {
    if (a.includes('GENERAL') && !b.includes('GENERAL')) return -1;
    if (!a.includes('GENERAL') && b.includes('GENERAL')) return 1;
    return a.localeCompare(b, 'es', { sensitivity: 'base' });
  });
}

/**
 * Botón Condiciones del reporte Alfa: panel con búsqueda y grupos
 * (raíz PÓLIZAS + carpeta POLIZAS GENERAL).
 */
export default function AlfaCondicionesMenu() {
  const [abierto, setAbierto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState('');
  const [error, setError] = useState('');
  const [docs, setDocs] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCondicionesAlfa();
      setDocs(Array.isArray(data?.documents) ? data.documents : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las condiciones');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      const name = String(d.name || '').toLowerCase();
      const folder = String(d.folder || '').toLowerCase();
      const label = labelFromFileName(d.name).toLowerCase();
      return name.includes(q) || folder.includes(q) || label.includes(q);
    });
  }, [docs, filtro]);

  const grupos = useMemo(() => groupDocs(filtrados), [filtrados]);

  useLayoutEffect(() => {
    if (!abierto || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuAncho = 400;
    const menuAltoApprox = 420;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const abrirArriba = espacioAbajo < menuAltoApprox && rect.top > 200;
    setCoords({
      top: abrirArriba ? null : rect.bottom + 4,
      bottom: abrirArriba ? window.innerHeight - rect.top + 4 : null,
      left: Math.min(Math.max(8, rect.right - menuAncho), window.innerWidth - menuAncho - 8),
      maxHeight: Math.min(
        440,
        abrirArriba ? rect.top - 16 : window.innerHeight - rect.bottom - 16
      ),
    });
  }, [abierto, docs.length, filtrados.length]);

  useEffect(() => {
    if (!abierto) {
      setFiltro('');
      return undefined;
    }
    cargar();
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    const cerrar = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setAbierto(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('keydown', onKey);
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
          role="dialog"
          aria-label="Condiciones SharePoint"
          className="fixed z-[80] flex w-[min(400px,calc(100vw-16px))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#1A1A1A]"
          style={{
            top: coords.top ?? undefined,
            bottom: coords.bottom ?? undefined,
            left: coords.left,
            maxHeight: coords.maxHeight || 440,
          }}
        >
          <div className="shrink-0 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
                Condiciones · SharePoint
              </p>
              {!loading && !error && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-body text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {filtrados.length}
                  {filtro.trim() ? ` / ${docs.length}` : ''}
                </span>
              )}
            </div>
            <label className="relative block">
              <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              <input
                ref={searchRef}
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar póliza, banco, INC…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 font-body text-sm text-gray-800 outline-none ring-fenix-primario/30 placeholder:text-gray-400 focus:border-fenix-primario focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
            {loading && (
              <p className="px-3 py-4 font-body text-sm text-gray-500">Cargando documentos…</p>
            )}
          {!loading && error && (
            <div className="space-y-2 px-3 py-3">
              <p className="font-body text-sm text-red-600 dark:text-red-400">
                {/AADSTS|unauthorized_client|MS_CLIENT/i.test(error)
                  ? 'No hay conexión con SharePoint (credenciales Microsoft). Reintente en unos segundos; si persiste, avise a TI.'
                  : error}
              </p>
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
              <p className="px-3 py-4 font-body text-sm text-gray-500">
                No hay PDFs en la carpeta de pólizas.
              </p>
            )}
            {!loading && !error && docs.length > 0 && filtrados.length === 0 && (
              <p className="px-3 py-4 font-body text-sm text-gray-500">
                Sin coincidencias para «{filtro.trim()}».
              </p>
            )}
            {!loading &&
              !error &&
              grupos.map(([grupo, items]) => (
                <div key={grupo} className="pb-1">
                  <p className="sticky top-0 z-[1] bg-gray-50/95 px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-wide text-gray-500 backdrop-blur dark:bg-[#1A1A1A]/95 dark:text-gray-400">
                    {grupo}
                    <span className="ml-1.5 font-normal normal-case text-gray-400">
                      ({items.length})
                    </span>
                  </p>
                  {items.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      role="menuitem"
                      disabled={Boolean(openingId)}
                      className="flex w-full items-start gap-2.5 px-3 py-2 text-left font-body text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-800/80"
                      onClick={() => abrirDocumento(doc)}
                      title={doc.name}
                    >
                      <FaFilePdf className="mt-0.5 shrink-0 text-fenix-primario" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold leading-snug">
                          {openingId === doc.id ? 'Abriendo…' : labelFromFileName(doc.name)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
          </div>
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
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <FaBookOpen />
        Condiciones
        {docs.length > 0 ? (
          <span className="rounded-full bg-fenix-primario/10 px-1.5 text-[11px] font-semibold text-fenix-primario">
            {docs.length}
          </span>
        ) : null}
        <FaChevronDown className="opacity-70" />
      </button>
      {menu}
    </>
  );
}
