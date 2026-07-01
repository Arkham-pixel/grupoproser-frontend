import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FaList, FaPlus, FaShip, FaFileAlt } from 'react-icons/fa';
import {
  puertosBadge,
  puertosFormRoot,
  puertosPageSubtitle,
  puertosPageTitle,
  puertosPageWrap,
  puertosTabActive,
  puertosTabIdle,
} from './puertosFenixUi';

const tabs = [
  { to: '/puertos/actas', label: 'Listado', icon: FaList, end: true },
  { to: '/puertos/actas/nueva', label: 'Nueva Acta', icon: FaPlus, end: false },
  { to: '/puertos/actas/caso/nueva', label: 'Informe Exportación', icon: FaFileAlt, end: false },
  { to: '/puertos/actas/inspeccion-asegurado/nueva', label: 'Inspección Asegurado', icon: FaShip, end: false },
];

export default function PuertosActasMain() {
  const location = useLocation();

  return (
    <div className={puertosFormRoot}>
      <div className={puertosPageWrap}>
        <header className="mb-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-fenix-primario font-heading text-xl text-white shadow-sm">
              <FaShip />
            </span>
            <div>
              <h1 className={puertosPageTitle}>Puertos</h1>
              <p className={puertosPageSubtitle}>Actas y Descargues · ARNALD DataFlow</p>
            </div>
          </div>
          <span className={puertosBadge}>Módulo operativo</span>
        </header>

        <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
          {tabs.map(({ to, label, icon: Icon, end }) => {
            const active = end
              ? location.pathname === to
              : to.includes('/inspeccion-asegurado')
                ? location.pathname.startsWith('/puertos/actas/inspeccion-asegurado')
                : to.includes('/caso/')
                  ? location.pathname.startsWith('/puertos/actas/caso')
                  : location.pathname.startsWith(to);
            return (
              <NavLink key={to} to={to} end={end} className={active ? puertosTabActive : puertosTabIdle}>
                <Icon />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
