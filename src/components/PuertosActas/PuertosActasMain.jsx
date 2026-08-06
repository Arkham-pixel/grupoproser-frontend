import React, { useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaList, FaPlus, FaShip, FaFileAlt, FaCog, FaBoxes } from 'react-icons/fa';
import {
  puertosBadge,
  puertosFormRoot,
  puertosPageSubtitle,
  puertosPageTitle,
  puertosPageWrap,
  puertosTabActive,
  puertosTabIdle,
} from './puertosFenixUi';

export default function PuertosActasMain() {
  const location = useLocation();
  const { t } = useTranslation();

  const tabs = useMemo(
    () => [
      { to: '/puertos/actas', labelKey: 'ports.ui.main.tabs.listado', icon: FaList, end: true },
      { to: '/puertos/actas/nueva', labelKey: 'ports.ui.main.tabs.nuevaActa', icon: FaPlus, end: false },
      {
        to: '/puertos/actas/caso/nueva',
        labelKey: 'ports.ui.main.tabs.informeExportacion',
        icon: FaFileAlt,
        end: false,
      },
      {
        to: '/puertos/actas/granel/nueva',
        labelKey: 'ports.ui.main.tabs.inspeccionGranel',
        icon: FaBoxes,
        end: false,
      },
      {
        to: '/puertos/actas/inspeccion-asegurado/nueva',
        labelKey: 'ports.ui.main.tabs.inspeccionAsegurado',
        icon: FaShip,
        end: false,
      },
      {
        to: '/puertos/actas/inspeccion-motorysa/nueva',
        labelKey: 'ports.ui.main.tabs.inspeccionMotorysa',
        icon: FaShip,
        end: false,
      },
      { to: '/puertos/actas/catalogos', labelKey: 'ports.ui.main.tabs.catalogos', icon: FaCog, end: false },
    ],
    []
  );

  return (
    <div className={puertosFormRoot}>
      <div className={puertosPageWrap}>
        <header className="mb-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-fenix-primario font-heading text-xl text-white shadow-sm">
              <FaShip />
            </span>
            <div>
              <h1 className={puertosPageTitle}>{t('ports.ui.main.title')}</h1>
              <p className={puertosPageSubtitle}>{t('ports.ui.main.subtitle')}</p>
            </div>
          </div>
          <span className={puertosBadge}>{t('ports.ui.common.operativo')}</span>
        </header>

        <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
          {tabs.map(({ to, labelKey, icon: Icon, end }) => {
            const active = end
              ? location.pathname === to
              : to.includes('/catalogos')
                ? location.pathname.startsWith('/puertos/actas/catalogos')
                : to.includes('/inspeccion-motorysa')
                ? location.pathname.startsWith('/puertos/actas/inspeccion-motorysa')
                : to.includes('/inspeccion-asegurado')
                ? location.pathname.startsWith('/puertos/actas/inspeccion-asegurado')
                : to.includes('/granel/')
                ? location.pathname.startsWith('/puertos/actas/granel')
                : to.includes('/caso/')
                  ? location.pathname.startsWith('/puertos/actas/caso')
                  : location.pathname.startsWith(to);
            return (
              <NavLink key={to} to={to} end={end} className={active ? puertosTabActive : puertosTabIdle}>
                <Icon />
                {t(labelKey)}
              </NavLink>
            );
          })}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
