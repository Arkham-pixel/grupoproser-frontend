import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FaCalculator,
  FaChevronDown,
  FaEllipsisV,
  FaFolderOpen,
  FaTrash,
} from 'react-icons/fa';

const btnAcciones =
  'inline-flex min-w-[7.5rem] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-body text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800';

/**
 * Menú de acciones estilo Complex (portal) para el reporte Express.
 */
export default function AccionesExpressMenu({
  onGestionar,
  onLiquidador,
  onEliminar,
  tieneLiquidador = false,
}) {
  const [abierto, setAbierto] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!abierto || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuAltoApprox = 160;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const abrirArriba = espacioAbajo < menuAltoApprox && rect.top > menuAltoApprox;
    setCoords({
      top: abrirArriba ? null : rect.bottom + 4,
      bottom: abrirArriba ? window.innerHeight - rect.top + 4 : null,
      left: Math.min(Math.max(8, rect.left), window.innerWidth - 200),
    });
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrar = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) {
        return;
      }
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

  const elegir = (fn) => {
    setAbierto(false);
    if (typeof fn === 'function') fn();
  };

  const menu = abierto
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[80] w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-[#1A1A1A]"
          style={{
            top: coords.top ?? undefined,
            bottom: coords.bottom ?? undefined,
            left: coords.left,
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-body text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
            onClick={() => elegir(onGestionar)}
          >
            <FaFolderOpen className="text-fenix-primario" aria-hidden />
            Gestionar
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-body text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
            onClick={() => elegir(onLiquidador)}
            title={
              tieneLiquidador
                ? 'Abrir / actualizar liquidador del caso'
                : 'Crear liquidador y guardar documentos en el caso'
            }
          >
            <FaCalculator className="text-fenix-primario" aria-hidden />
            Liquidador{tieneLiquidador ? ' ✓' : ''}
          </button>
          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-body text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => elegir(onEliminar)}
          >
            <FaTrash className="text-[10px]" aria-hidden />
            Eliminar
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        className={btnAcciones}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        title="Acciones del caso"
      >
        <span className="inline-flex items-center gap-1.5">
          <FaEllipsisV className="text-[10px] opacity-70" aria-hidden />
          Acciones
        </span>
        <FaChevronDown className={`text-[10px] transition ${abierto ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {menu}
    </div>
  );
}
