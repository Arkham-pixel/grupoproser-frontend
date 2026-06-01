import React from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer } from 'recharts';
import { FaChartLine, FaCheckCircle, FaClipboardList, FaExclamationTriangle, FaInbox, FaInfoCircle, FaTable } from 'react-icons/fa';
import { esUsuarioGerenteFacturacion } from '../../config/gerentesFacturacion';
import {
  complexBadge,
  complexBtnFormAction,
  complexBtnDanger,
  complexBtnGhost,
  complexNavTabActive,
  complexNavTabIdle,
  complexCard,
  complexCardBody,
  complexCardHeader,
  complexChartCard,
  complexInput,
  complexLabel,
  complexMetricCard,
  complexModalOverlay,
  complexPageSubtitle,
  complexPageTitle,
  complexSelect,
} from './complexFenixUi.js';

const COMPLEX_AVISO_ESTILOS = {
  warning: {
    icon: FaExclamationTriangle,
    iconWrap: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-900/50',
  },
  error: {
    icon: FaExclamationTriangle,
    iconWrap: 'bg-red-50 text-fenix-primario dark:bg-red-950/40 dark:text-red-400',
    border: 'border-red-200 dark:border-red-900/50',
  },
  info: {
    icon: FaInfoCircle,
    iconWrap: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
  },
  success: {
    icon: FaCheckCircle,
    iconWrap: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
    border: 'border-gray-200 dark:border-gray-700',
  },
};

/** Modal de aviso/confirmación dentro de la plataforma (sin alert/confirm del navegador) */
export function ComplexAvisoModal({
  open,
  onClose,
  titulo = 'Atención',
  mensaje = '',
  tipo = 'info',
  botonTexto = 'Entendido',
  onConfirm,
  confirmTexto = 'Sí',
  cancelTexto = 'No',
  confirmVariant = 'danger',
}) {
  if (!open) return null;

  const estilo = COMPLEX_AVISO_ESTILOS[tipo] || COMPLEX_AVISO_ESTILOS.info;
  const Icono = estilo.icon;
  const esConfirmacion = typeof onConfirm === 'function';
  const confirmClass = confirmVariant === 'danger' ? complexBtnDanger : complexBtnFormAction;

  return (
    <div className={`${complexModalOverlay} z-[60] backdrop-blur-[2px]`} role="presentation" onClick={onClose}>
      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-[#1A1A1A] ${estilo.border}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="complex-aviso-titulo"
        aria-describedby="complex-aviso-mensaje"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${estilo.iconWrap}`}
          >
            <Icono className="text-xl" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="complex-aviso-titulo"
              className="font-heading text-lg font-bold text-gray-900 dark:text-white"
            >
              {titulo}
            </h2>
            <p
              id="complex-aviso-mensaje"
              className="mt-2 font-body text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            >
              {mensaje}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          {esConfirmacion ? (
            <>
              <button type="button" className={complexBtnFormAction} onClick={onClose}>
                {cancelTexto}
              </button>
              <button type="button" className={confirmClass} onClick={onConfirm}>
                {confirmTexto}
              </button>
            </>
          ) : (
            <button type="button" className={complexBtnFormAction} onClick={onClose}>
              {botonTexto}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const NAV_COMPLEX_BASE = [
  { path: '/complex/dashboard', icon: FaChartLine, label: 'Dashboard' },
  { path: '/complex/excel', icon: FaTable, label: 'Reporte' },
  { path: '/complex/mis-casos', icon: FaClipboardList, label: 'Mis casos' },
];

const NAV_BANDEJA = {
  path: '/complex/bandeja-facturacion',
  icon: FaInbox,
  label: 'Bandeja facturación',
};

function navComplexItems() {
  const login = localStorage.getItem('login') || '';
  if (esUsuarioGerenteFacturacion(login)) {
    return [...NAV_COMPLEX_BASE, NAV_BANDEJA];
  }
  return NAV_COMPLEX_BASE;
}

export function ComplexNavTabs({ activePath }) {
  const items = navComplexItems();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Navegación Complex">
      {items.map(({ path, icon: Icon, label }) => {
        const activo = activePath === path;
        return (
          <Link
            key={path}
            to={path}
            className={activo ? complexNavTabActive : complexNavTabIdle}
          >
            <Icon className="text-sm" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ComplexPageHeader({ badge = 'Complex', title, subtitle, actions, activePath }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {badge && <span className={complexBadge}>{badge}</span>}
        <div>
          <h1 className={complexPageTitle}>{title}</h1>
          {subtitle && <p className={complexPageSubtitle}>{subtitle}</p>}
        </div>
        {activePath && <ComplexNavTabs activePath={activePath} />}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ComplexMetricCard({ label, value, hint }) {
  return (
    <div className={complexMetricCard}>
      <p className="font-body text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 font-accent text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function ComplexFilterSection({ title = 'Filtros', children, onClear, showClear }) {
  return (
    <section className={complexCard}>
      <div className={`${complexCardHeader} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {showClear && onClear && (
          <button type="button" onClick={onClear} className={complexBtnGhost}>
            Limpiar filtros
          </button>
        )}
      </div>
      <div className={complexCardBody}>{children}</div>
    </section>
  );
}

export function ComplexChartCard({ title, empty, children, className = '', subtitle }) {
  return (
    <div className={`${complexChartCard} min-w-0 ${className}`}>
      <div className="mb-4">
        <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && (
          <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {empty ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">No hay datos disponibles para mostrar.</p>
      ) : (
        <div className="min-w-0">{children}</div>
      )}
    </div>
  );
}

/** Contenedor con altura fija para ResponsiveContainer (evita gráficos colapsados o gigantes) */
export function ComplexChartPlot({ height, children }) {
  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function Campo({ label, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className={complexLabel}>{label}</label>}
      {children}
    </div>
  );
}

export function InputFenix({ className = '', ...props }) {
  return <input className={`${complexInput} ${className}`} {...props} />;
}

export function SelectFenix({ children, className = '', ...props }) {
  return (
    <select className={`${complexSelect} ${className}`} {...props}>
      {children}
    </select>
  );
}
