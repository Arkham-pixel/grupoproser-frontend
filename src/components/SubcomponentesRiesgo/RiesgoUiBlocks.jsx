import React from 'react';
import { Link } from 'react-router-dom';
import { FaChartLine, FaDownload, FaPlus } from 'react-icons/fa';
import {
  riesgoBadge,
  riesgoBtnGhost,
  riesgoBtnInfo,
  riesgoBtnPrimary,
  riesgoBtnSecondary,
  riesgoBtnSuccess,
  riesgoCard,
  riesgoCardBody,
  riesgoCardHeader,
  riesgoChartCard,
  riesgoInput,
  riesgoLabel,
  riesgoMetricCard,
  riesgoNavTabActive,
  riesgoNavTabIdle,
  riesgoPageSubtitle,
  riesgoPageTitle,
  riesgoSelect,
} from './riesgoFenixUi.js';

const NAV_RIESGO = [
  { path: '/riesgos/agregar', icon: FaPlus, label: 'Agregar casos' },
  { path: '/riesgos/dashboard', icon: FaChartLine, label: 'Dashboard' },
  { path: '/riesgos/exportar', icon: FaDownload, label: 'Exportar Excel' },
];

export function RiesgoNavTabs({ activePath }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Navegación Riesgos">
      {NAV_RIESGO.map(({ path, icon: Icon, label }) => {
        const activo = activePath === path;
        return (
          <Link
            key={path}
            to={path}
            className={activo ? riesgoNavTabActive : riesgoNavTabIdle}
          >
            <Icon className="text-sm" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function RiesgoPageHeader({
  badge = 'Riesgos',
  title,
  subtitle,
  actions,
  activePath,
  showNav = true,
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {badge && <span className={riesgoBadge}>{badge}</span>}
        <div>
          <h1 className={riesgoPageTitle}>{title}</h1>
          {subtitle && <p className={riesgoPageSubtitle}>{subtitle}</p>}
        </div>
        {showNav && activePath && <RiesgoNavTabs activePath={activePath} />}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Navegación del módulo dentro del panel de filtros (junto a filtros/búsqueda) */
export function RiesgoNavPanel({ activePath }) {
  return (
    <div className="mb-5 border-b border-gray-100 pb-5 dark:border-gray-800">
      <p className="mb-3 font-body text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Módulo Riesgos
      </p>
      <RiesgoNavTabs activePath={activePath} />
    </div>
  );
}

export function RiesgoMetricCard({ label, value, hint, accent = 'default' }) {
  const valueClass =
    accent === 'primario'
      ? 'text-fenix-primario'
      : accent === 'exito'
        ? 'text-fenix-exito'
        : 'text-gray-900 dark:text-white';

  return (
    <div className={riesgoMetricCard}>
      <p className="font-body text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-2 font-accent text-2xl font-bold sm:text-3xl ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function RiesgoFilterSection({ title = 'Filtros', subtitle, children, onClear, showClear }) {
  return (
    <section className={riesgoCard}>
      <div
        className={`${riesgoCardHeader} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div>
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        {showClear && onClear && (
          <button type="button" onClick={onClear} className={riesgoBtnGhost}>
            Limpiar filtros
          </button>
        )}
      </div>
      <div className={riesgoCardBody}>{children}</div>
    </section>
  );
}

export function Campo({ label, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className={riesgoLabel}>{label}</label>}
      {children}
    </div>
  );
}

export function InputFenix({ className = '', ...props }) {
  return <input className={`${riesgoInput} ${className}`} {...props} />;
}

export function SelectFenix({ children, className = '', ...props }) {
  return (
    <select className={`${riesgoSelect} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function RiesgoChartCard({ title, empty, children }) {
  return (
    <div className={riesgoChartCard}>
      <h3 className="mb-4 font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      {empty ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          No hay datos disponibles para mostrar.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export function RiesgoFormTabs({ tabs, activeId, onChange }) {
  return (
    <nav className="flex flex-wrap justify-center gap-1 border-b border-gray-200 dark:border-gray-800" aria-label="Secciones del caso">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={
            activeId === id
              ? 'border-b-2 border-fenix-primario px-4 py-2.5 font-body text-sm font-semibold text-fenix-primario'
              : 'px-4 py-2.5 font-body text-sm font-medium text-gray-500 transition hover:text-fenix-primario dark:text-gray-400'
          }
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export { riesgoBtnPrimary, riesgoBtnSecondary, riesgoBtnGhost, riesgoBtnSuccess, riesgoBtnInfo };
