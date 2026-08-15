import React from 'react';
import { Link } from 'react-router-dom';
import { FaChartLine, FaCalculator, FaPlus, FaTable } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { expressBadge, expressPageSubtitle, expressPageTitle } from '../SubcomponenteExpress/expressFenixUi.js';

const NAV_FDM = [
  { path: '/equidad-fdm/carga', icon: FaPlus, key: 'addCase' },
  { path: '/equidad-fdm/liquidador', icon: FaCalculator, key: 'settlement' },
  { path: '/equidad-fdm/dashboard', icon: FaChartLine, key: 'dashboard' },
  { path: '/equidad-fdm/reporte', icon: FaTable, key: 'report' },
];

export function FdmNavTabs({ activePath, pathOverrides = {} }) {
  const { t } = useTranslation();
  return (
    <nav className="flex flex-wrap gap-2" aria-label={t('equidadFdm.navigation')}>
      {NAV_FDM.map(({ path, icon: Icon, key }) => {
        const to = pathOverrides[path] || path;
        const activo = activePath === path;
        return (
          <Link
            key={path}
            to={to}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-body text-sm font-semibold transition ${
              activo
                ? 'bg-fenix-primario text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            {React.createElement(Icon, { className: 'text-sm' })}
            {t(`equidadFdm.nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}

export function FdmPageHeader({ badge = 'Equidad FDM', title, subtitle, actions, activePath, pathOverrides }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {badge && <span className={expressBadge}>{badge}</span>}
        <div>
          <h1 className={expressPageTitle}>{title}</h1>
          {subtitle && <p className={expressPageSubtitle}>{subtitle}</p>}
        </div>
        {activePath && <FdmNavTabs activePath={activePath} pathOverrides={pathOverrides} />}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
