import React from 'react';
import { Link } from 'react-router-dom';
import { FaChartLine, FaPlus, FaTable } from 'react-icons/fa';
import { expressBadge, expressPageSubtitle, expressPageTitle } from '../SubcomponenteExpress/expressFenixUi.js';

const NAV_PROPIEDADES = [
  { path: '/propiedades/carga', icon: FaPlus, label: 'Nuevo caso' },
  { path: '/propiedades/dashboard', icon: FaChartLine, label: 'Dashboard' },
  { path: '/propiedades/reporte', icon: FaTable, label: 'Reporte' },
];

export function PropiedadesNavTabs({ activePath }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Navegación Propiedades">
      {NAV_PROPIEDADES.map(({ path, icon: Icon, label }) => {
        const activo =
          activePath === path ||
          (path === '/propiedades/carga' && String(activePath || '').startsWith('/propiedades/carga'));
        return (
          <Link
            key={path}
            to={path}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-body text-sm font-semibold transition ${
              activo
                ? 'bg-fenix-primario text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            <Icon className="text-sm" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PropiedadesPageHeader({ badge = 'Propiedades', title, subtitle, actions, activePath }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {badge && <span className={expressBadge}>{badge}</span>}
        <div>
          <h1 className={expressPageTitle}>{title}</h1>
          {subtitle && <p className={expressPageSubtitle}>{subtitle}</p>}
        </div>
        {activePath && <PropiedadesNavTabs activePath={activePath} />}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
