import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaSearch, FaTimes } from 'react-icons/fa';

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

/**
 * Lista desplegable con buscador interno.
 * El menú se renderiza en un portal (body) para no quedar debajo de secciones
 * siguientes del formulario (bug de apilamiento CSS en grids).
 * options: [{ value, label }]
 */
export default function SelectBuscable({
  options = [],
  value = '',
  onChange,
  placeholder,
  searchPlaceholder,
  noResultsText,
  disabled = false,
  className = '',
  buttonClassName = '',
  emptyOption = true,
  emptyLabel,
}) {
  const { t } = useTranslation();
  const placeholderText = placeholder ?? t('common.selectShort');
  const searchPlaceholderText = searchPlaceholder ?? t('common.searchEllipsis');
  const noResultsTextResolved = noResultsText ?? t('common.noResults');

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const opcionesFiltradas = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return options;
    return options.filter((o) => normalizar(o.label).includes(q));
  }, [options, busqueda]);

  const etiquetaSeleccion =
    options.find((o) => String(o.value) === String(value))?.label || value || '';

  const actualizarPosicion = () => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 180),
    });
  };

  useLayoutEffect(() => {
    if (!abierto) return undefined;
    actualizarPosicion();
    const onScrollOrResize = () => actualizarPosicion();
    window.addEventListener('resize', onScrollOrResize);
    // capture: true para detectar scroll en contenedores internos
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setAbierto(false);
      setBusqueda('');
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [abierto]);

  const abrir = () => {
    if (disabled) return;
    setAbierto(true);
    setBusqueda('');
  };

  const elegir = (val) => {
    onChange?.(val);
    setAbierto(false);
    setBusqueda('');
  };

  const baseBtn =
    buttonClassName ||
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

  const menu = abierto
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] overflow-hidden rounded-md border border-gray-300 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-900"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
          }}
          role="listbox"
        >
          <div className="border-b border-gray-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={searchPlaceholderText}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              {busqueda ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setBusqueda('')}
                >
                  <FaTimes className="text-xs" />
                </button>
              ) : (
                <FaSearch className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              )}
            </div>
          </div>

          <ul className="max-h-56 overflow-y-auto bg-white py-1 dark:bg-slate-900">
            {emptyOption && (
              <li>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-sky-950/40 ${
                    !value ? 'bg-blue-600 text-white hover:bg-blue-600' : 'text-gray-700 dark:text-slate-200'
                  }`}
                  onClick={() => elegir('')}
                >
                  {emptyLabel || placeholderText}
                </button>
              </li>
            )}
            {opcionesFiltradas.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">{noResultsTextResolved}</li>
            ) : (
              opcionesFiltradas.map((o) => {
                const seleccionado = String(o.value) === String(value);
                return (
                  <li key={String(o.value)}>
                    <button
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-sky-950/40 ${
                        seleccionado
                          ? 'bg-blue-600 text-white hover:bg-blue-600'
                          : 'text-gray-800 dark:text-slate-100'
                      }`}
                      onClick={() => elegir(o.value)}
                    >
                      {o.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${baseBtn} flex w-full items-center justify-between gap-2 text-left disabled:opacity-60`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
      >
        <span className={`truncate ${etiquetaSeleccion ? '' : 'text-gray-400'}`}>
          {etiquetaSeleccion || placeholderText}
        </span>
        <FaChevronDown
          className={`shrink-0 text-xs text-gray-400 transition ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
