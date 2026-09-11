import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaFilter, FaTimes } from 'react-icons/fa';
import {
  Campo,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressBtnSecondary } from '../SubcomponenteExpress/expressFenixUi.js';
import {
  OPCIONES_FECHA_FILTRO_ZURICH_CAT,
  OPCIONES_FECHA_FILTRO_ZURICH_LISTADO,
} from './zurichHelpers.js';

/**
 * Botón para que el líder elija el filtro (póliza o fechas) sin saturar la barra.
 */
export default function FiltrosLiderZurich({
  variante = 'listado',
  filtroPoliza = '',
  onFiltroPoliza,
  filtroTipoPoliza = '',
  onFiltroTipoPoliza,
  opcionesTipoPoliza = [],
  tipoFecha,
  onTipoFecha,
  fechaInicio = '',
  onFechaInicio,
  fechaFin = '',
  onFechaFin,
}) {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const [mostrarPoliza, setMostrarPoliza] = useState(Boolean(filtroPoliza));
  const [mostrarTipoPoliza, setMostrarTipoPoliza] = useState(Boolean(filtroTipoPoliza));
  const cajaRef = useRef(null);
  const fechas = variante === 'cat' ? OPCIONES_FECHA_FILTRO_ZURICH_CAT : OPCIONES_FECHA_FILTRO_ZURICH_LISTADO;

  useEffect(() => {
    if (filtroPoliza) setMostrarPoliza(true);
  }, [filtroPoliza]);
  useEffect(() => {
    if (filtroTipoPoliza) setMostrarTipoPoliza(true);
  }, [filtroTipoPoliza]);

  useEffect(() => {
    if (!abierto) return undefined;
    const onDoc = (e) => {
      if (!cajaRef.current?.contains(e.target)) setAbierto(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [abierto]);

  const elegirPoliza = () => {
    setMostrarPoliza(true);
    setAbierto(false);
    window.setTimeout(() => document.getElementById('zurich-filtro-poliza')?.focus(), 0);
  };

  const elegirTipoPoliza = () => {
    setMostrarTipoPoliza(true);
    setAbierto(false);
  };

  const elegirFecha = (value) => {
    onTipoFecha?.(value);
    setAbierto(false);
    const desde = document.getElementById('zurich-filtro-fecha-desde');
    if (desde) desde.focus();
  };

  const quitarPoliza = () => {
    onFiltroPoliza?.('');
    setMostrarPoliza(false);
  };

  const quitarTipoPoliza = () => {
    onFiltroTipoPoliza?.('');
    setMostrarTipoPoliza(false);
  };

  const itemCls =
    'block w-full px-3 py-2 text-left font-body text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" ref={cajaRef}>
        <div className="relative">
          <button
            type="button"
            className={expressBtnSecondary}
            aria-expanded={abierto}
            aria-haspopup="menu"
            onClick={() => setAbierto((v) => !v)}
          >
            <FaFilter />
            {t('zurich.report.filterBy')}
            <FaChevronDown className="text-xs opacity-70" />
          </button>
          {abierto && (
            <div
              role="menu"
              className="absolute left-0 z-40 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <p className="border-b border-gray-100 px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                {t('zurich.report.filterGroupPolicy')}
              </p>
              <button type="button" role="menuitem" className={itemCls} onClick={elegirPoliza}>
                {t('zurich.fields.numeroPoliza')}
              </button>
              <button type="button" role="menuitem" className={itemCls} onClick={elegirTipoPoliza}>
                {t('zurich.fields.tipoPoliza')}
              </button>
              <p className="border-y border-gray-100 px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                {t('zurich.report.filterGroupDates')}
              </p>
              <div className="max-h-64 overflow-y-auto">
                {fechas.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitem"
                    className={`${itemCls} ${tipoFecha === opt.value ? 'font-semibold text-fenix-primario' : ''}`}
                    onClick={() => elegirFecha(opt.value)}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="font-body text-xs text-gray-500 dark:text-gray-400">
          {t('zurich.report.filterByHint')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mostrarPoliza && (
          <Campo label={t('zurich.fields.numeroPoliza')}>
            <div className="flex gap-2">
              <InputFenix
                id="zurich-filtro-poliza"
                value={filtroPoliza}
                onChange={(e) => onFiltroPoliza?.(e.target.value)}
                placeholder={t('zurich.report.policyPlaceholder')}
              />
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                onClick={quitarPoliza}
                title={t('zurich.report.removeFilter')}
              >
                <FaTimes />
              </button>
            </div>
          </Campo>
        )}
        {mostrarTipoPoliza && (
          <Campo label={t('zurich.fields.tipoPoliza')}>
            <div className="flex gap-2">
              <SelectFenix
                value={filtroTipoPoliza}
                onChange={(e) => onFiltroTipoPoliza?.(e.target.value)}
              >
                <option value="">{t('zurich.report.all')}</option>
                {opcionesTipoPoliza.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                onClick={quitarTipoPoliza}
                title={t('zurich.report.removeFilter')}
              >
                <FaTimes />
              </button>
            </div>
          </Campo>
        )}
        <Campo label={t('zurich.report.filterByDate')}>
          <SelectFenix value={tipoFecha} onChange={(e) => onTipoFecha?.(e.target.value)}>
            {fechas.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </SelectFenix>
        </Campo>
        <Campo label={t('zurich.report.from')}>
          <InputFenix
            id="zurich-filtro-fecha-desde"
            type="date"
            value={fechaInicio}
            onChange={(e) => onFechaInicio?.(e.target.value)}
          />
        </Campo>
        <Campo label={t('zurich.report.to')}>
          <InputFenix
            type="date"
            value={fechaFin}
            onChange={(e) => onFechaFin?.(e.target.value)}
          />
        </Campo>
      </div>
    </div>
  );
}
