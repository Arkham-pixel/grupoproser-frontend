// src/components/Layout.jsx
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FaBars,
  FaUserCircle,
  FaFileAlt,
  FaChartBar,
  FaHome,
  FaUserShield,
  FaChevronRight,
  FaChevronDown,
  FaBolt,
  FaPlus,
  FaTable,
  FaList,
  FaExclamationTriangle,
  FaFileInvoice,
  FaCog,
  FaUsers,
  FaBuilding,
  FaHandshake,
  FaUserTie,
  FaTrash,
  FaEdit,
  FaTools,
  FaShieldAlt,
  FaChevronLeft,
  FaMoon,
  FaSun,
  FaShip,
  FaFolderOpen,
  FaBell,
  FaClock,
  FaChartLine,
  FaDownload,
  FaClipboardList,
  FaSearch,
  FaQuestionCircle,
  FaInbox,
} from 'react-icons/fa';
import { esUsuarioGerenteFacturacion } from '../config/gerentesFacturacion';
import { arnaldLogo, arnaldIcon } from '../config/brandAssets.js';
import LogoutButton from './LogoutButton';
import { useTheme } from '../context/ThemeContext';
import { usuarioAutorizadoGestionDocumentos } from '../config/gestionDocumentosPermitidos';
import { usuarioAutorizadoCatalogosExpress } from '../config/expressCatalogosPermitidos';

const SESSION_MAX_MS = 8 * 60 * 60 * 1000;

function formatTimer(time) {
  const h = String(time.hours).padStart(2, '0');
  const m = String(time.minutes).padStart(2, '0');
  const s = String(time.seconds).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatNombreCorto(nombre, login) {
  const base = (nombre || login || 'Usuario').trim();
  const partes = base.split(/\s+/);
  if (partes.length === 1) return partes[0];
  const inicial = partes[partes.length - 1].charAt(0).toUpperCase();
  return `${partes[0]} ${inicial}.`;
}

function formatRol(rol) {
  if (!rol) return 'Usuario';
  const r = rol.toLowerCase();
  if (r === 'admin') return 'Administrador';
  if (r === 'soporte') return 'Soporte';
  if (r === 'visualizador') return 'Visualizador';
  return rol.charAt(0).toUpperCase() + rol.slice(1);
}

/** Timer de sesión en pie del sidebar */
function SessionTimerSidebar({ compact = false }) {
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [remaining, setRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const start = localStorage.getItem('sessionStartTime');
      if (!start) return;
      const duration = Date.now() - parseInt(start, 10);
      const left = SESSION_MAX_MS - duration;
      if (left <= 0) return;

      setElapsed({
        hours: Math.floor(duration / 3600000),
        minutes: Math.floor((duration % 3600000) / 60000),
        seconds: Math.floor((duration % 60000) / 1000),
      });
      setRemaining({
        hours: Math.floor(left / 3600000),
        minutes: Math.floor((left % 3600000) / 60000),
        seconds: Math.floor((left % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-0.5 text-[10px] text-gray-400">
        <FaClock className="text-fenix-primario" />
        <span className="font-mono font-medium text-gray-300">{formatTimer(elapsed)}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700/80 bg-gray-800/50 px-3 py-2.5 text-xs text-gray-300">
      <div className="flex items-center gap-2">
        <FaClock className="shrink-0 text-fenix-primario" />
        <span>
          Sesión: <span className="font-mono font-semibold text-white">{formatTimer(elapsed)}</span>
        </span>
      </div>
      <p className="mt-1 pl-6 text-[11px] text-gray-500">
        Cierre automático en {formatTimer(remaining)}
      </p>
    </div>
  );
}

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState(() =>
    (localStorage.getItem('rol') || '').toLowerCase() === 'visualizador' ? 'matrices' : null
  );
  const [fotoUsuarioQueue, setFotoUsuarioQueue] = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const fotoUsuario = fotoUsuarioQueue[0] || null;
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const esMatrizRiesgo = location.pathname.includes('/matriz-riesgo-avanzada');

  const usuarioActual = {
    login: localStorage.getItem('login'),
    nombre: localStorage.getItem('nombre'),
    rol: localStorage.getItem('rol'),
    tipoUsuario: localStorage.getItem('tipoUsuario'),
  };

  const rolNorm = (usuarioActual.rol || '').toLowerCase();
  const esAdmin =
    rolNorm === 'admin' || rolNorm === 'administrador';
  const esAdminOSoporte = esAdmin || rolNorm === 'soporte';
  const esSoloSoporte = rolNorm === 'soporte';
  const esVisualizador = rolNorm === 'visualizador';
  const puedeCatalogosExpress = usuarioAutorizadoCatalogosExpress(
    localStorage.getItem('cedula'),
    localStorage.getItem('login'),
    localStorage.getItem('email'),
    usuarioActual.rol
  );
  const puedeBandejaFacturacion = esUsuarioGerenteFacturacion(usuarioActual.login);

  const routeTitles = {
    '/inicio': 'Inicio',
    '/formularioinspeccion': 'Formulario de Inspección',
    '/formulario-inspeccion-propiedades': 'Formulario Inspección Propiedades',
    '/complex/agregar': 'Agregar Caso Complex',
    '/complex/editar': 'Editar Caso Complex',
    '/complex/excel': 'Reporte Complex',
    '/complex/mis-casos': 'Mis Casos Complex',
    '/complex/bandeja-facturacion': 'Bandeja de Facturación',
    '/complex/reporte-mejorado': 'Reporte Complex',
    '/complex/dashboard': 'Dashboard Complex',
    '/complex/alertas': 'Alertas Complex',
    '/complex/gestion-estados': 'Gestión de Estados COMPLEX',
    '/editar-caso': 'Editar Caso',
    '/riesgos/agregar': 'Agregar Caso de Riesgo',
    '/riesgos/dashboard': 'Dashboard de Riesgos',
    '/riesgos/exportar': 'Exportar Riesgos',
    '/riesgos/editar': 'Editar Caso de Riesgo',
    '/cuenta': 'Cuenta',
    '/micuenta': 'Mi Cuenta',
    '/formulario-maquinaria': 'Formulario Maquinaria',
    '/reporte-pol': 'Reporte Póliza',
    '/ajuste': 'Formulario de Ajuste',
    '/matriz-riesgo-avanzada': 'Matriz de Riesgo',
    '/matrices-riesgo': 'Matrices de Riesgo',
    '/express/carga': 'Carga Express',
    '/express/reporte': 'Reporte Express',
    '/express/dashboard': 'Dashboard Express',
    '/express/tablero': 'Tablero operativo Express',
    '/admin/catalogos-express': 'Catálogos Express',
    '/puertos/formulario': 'Formulario de Puertos',
    '/historial': 'Historial de Formularios',
    '/siniestros': 'Siniestros',
    '/admin/usuarios': 'Administración de Usuarios',
    '/admin/estadisticas-tiempo-uso': 'Estadísticas de Tiempo de Uso',
    '/admin/session-settings': 'Configuración de Sesión',
    '/admin/clientes-funcionarios': 'Gestión Clientes y Funcionarios',
    '/admin/intermediarios': 'Gestión de Intermediarios',
    '/admin/responsables': 'Gestión de Responsables',
    '/admin/documentos': 'Gestión de Documentos',
    '/editar-perfil-usuario': 'Editar Perfil de Usuario',
    '/informacion-completa': 'Información Completa de Empleados',
  };

  useEffect(() => {
    const pathname = location.pathname;
    let pageTitle = routeTitles[pathname];
    if (!pageTitle) {
      for (const [route, title] of Object.entries(routeTitles)) {
        if (pathname.startsWith(route) && route !== '/inicio') {
          pageTitle = title;
          break;
        }
      }
    }
    document.title = pageTitle ? `Arnald DataFlow - ${pageTitle}` : 'Arnald DataFlow';
  }, [location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/inicio' || path === '/') setExpandedSection('principal');
    else if (path.startsWith('/complex')) setExpandedSection('complex');
    else if (path.startsWith('/riesgos')) setExpandedSection('riesgos');
    else if (path.startsWith('/express')) setExpandedSection('express');
    else if (path.startsWith('/puertos')) setExpandedSection('puertos');
    else if (
      path.startsWith('/formulario') ||
      path.startsWith('/ajuste') ||
      path.startsWith('/reporte-pol') ||
      path.startsWith('/historial')
    )
      setExpandedSection('formularios');
    else if (path.includes('matriz') || path.includes('matrices')) setExpandedSection('matrices');
    else if (path.startsWith('/admin') || path.startsWith('/editar-perfil')) setExpandedSection('admin');
    else if (path.startsWith('/cuenta') || path.startsWith('/micuenta') || path.startsWith('/informacion-completa'))
      setExpandedSection('cuenta');
  }, [location.pathname]);

  useEffect(() => {
    const obtenerFotoUsuario = async () => {
      const token = localStorage.getItem('token');
      const tipoUsuario = localStorage.getItem('tipoUsuario') || 'normal';
      if (!token) return;
      try {
        const { obtenerPerfil } = await import('../services/userService');
        const { data } = await obtenerPerfil(token, tipoUsuario);
        if (data?.foto) {
          const { getUploadsUrlCandidates } = await import('../config/apiConfig');
          const urls = getUploadsUrlCandidates(data.foto);
          setFotoUsuarioQueue(urls.length ? urls : []);
        }
      } catch {
        /* sin foto */
      }
    };
    obtenerFotoUsuario();
  }, []);

  const isActive = (path) => location.pathname === path;

  const toggleSection = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const menuItems = {
    principal: esVisualizador ? [] : [{ path: '/inicio', icon: FaHome, label: 'Inicio' }],
    matrices: [
      { path: '/matrices-riesgo', icon: FaList, label: 'Ver Matrices' },
      { path: '/matriz-riesgo-avanzada', icon: FaChartBar, label: 'Matriz de Riesgo' },
    ],
    complex: !esVisualizador
      ? [
          { path: '/complex/agregar', icon: FaPlus, label: 'Agregar Casos' },
          { path: '/complex/dashboard', icon: FaChartLine, label: 'Dashboard' },
          { path: '/complex/excel', icon: FaTable, label: 'Reporte Completo' },
          { path: '/complex/mis-casos', icon: FaList, label: 'Mis Casos Asignados' },
          ...(puedeBandejaFacturacion
            ? [{ path: '/complex/bandeja-facturacion', icon: FaInbox, label: 'Bandeja Facturación' }]
            : []),
          ...(esSoloSoporte
            ? [{ path: '/complex/alertas', icon: FaExclamationTriangle, label: 'Sistema de Alertas' }]
            : []),
        ]
      : [],
    riesgos: !esVisualizador
      ? [
          { path: '/riesgos/agregar', icon: FaPlus, label: 'Agregar Casos' },
          { path: '/riesgos/dashboard', icon: FaChartLine, label: 'Dashboard' },
          { path: '/riesgos/exportar', icon: FaDownload, label: 'Exportar Excel' },
        ]
      : [],
    formularios: !esVisualizador
      ? [
          { path: '/formularioinspeccion', icon: FaClipboardList, label: 'Formulario de Riesgo' },
          { path: '/ajuste', icon: FaFileAlt, label: 'Ajuste / Acta de inspección' },
          { path: '/reporte-pol', icon: FaFileInvoice, label: 'Formulario POL' },
          { path: '/formulario-maquinaria', icon: FaTools, label: 'Formulario de Maquinaria' },
          {
            path: '/formulario-inspeccion-propiedades',
            icon: FaClipboardList,
            label: 'Inspección de Propiedades',
          },
          { path: '/historial', icon: FaList, label: 'Historial de Formularios' },
        ]
      : [],
    express: !esVisualizador
      ? [
          { path: '/express/carga', icon: FaBolt, label: 'Carga Express' },
          { path: '/express/dashboard', icon: FaChartLine, label: 'Dashboard Express' },
          { path: '/express/tablero', icon: FaClipboardList, label: 'Tablero operativo' },
          { path: '/express/reporte', icon: FaTable, label: 'Reporte Express' },
        ]
      : [],
    puertos: !esVisualizador
      ? [{ path: '/puertos/formulario', icon: FaShip, label: 'Formulario de Inspección' }]
      : [],
    cuenta: !esVisualizador
      ? [
          { path: '/cuenta', icon: FaUserCircle, label: 'Mi Cuenta' },
          ...(usuarioAutorizadoGestionDocumentos(
            localStorage.getItem('cedula'),
            localStorage.getItem('login')
          ) && !esAdminOSoporte
            ? [{ path: '/admin/documentos', icon: FaFolderOpen, label: 'Gestión de Documentos' }]
            : []),
          ...(puedeCatalogosExpress && !esAdminOSoporte
            ? [{ path: '/admin/catalogos-express', icon: FaList, label: 'Catálogos Express' }]
            : []),
          ...(() => {
            const login = localStorage.getItem('login');
            const cedula = localStorage.getItem('cedula');
            const AUT = ['1065012991'];
            const ok =
              (login && AUT.includes(login)) || (cedula && AUT.includes(cedula));
            return ok
              ? [{ path: '/informacion-completa', icon: FaChartBar, label: 'Información Completa' }]
              : [];
          })(),
        ]
      : [],
    admin: esAdminOSoporte
      ? [
          { path: '/admin/usuarios', icon: FaUsers, label: 'Gestión de Usuarios' },
          { path: '/admin/estadisticas-tiempo-uso', icon: FaChartLine, label: 'Tiempo de Uso' },
          {
            path: '/cuenta',
            icon: FaPlus,
            label: 'Agregar Usuario',
            onClick: () => localStorage.setItem('cuentaTab', 'agregar'),
          },
          { path: '/editar-perfil-usuario', icon: FaEdit, label: 'Editar Usuarios' },
          {
            path: '/cuenta',
            icon: FaTrash,
            label: 'Eliminar Usuario',
            onClick: () => localStorage.setItem('cuentaTab', 'eliminar'),
          },
          { path: '/admin/clientes-funcionarios', icon: FaBuilding, label: 'Clientes/Funcionarios' },
          { path: '/admin/intermediarios', icon: FaHandshake, label: 'Intermediarios' },
          { path: '/admin/responsables', icon: FaUserTie, label: 'Responsables' },
          { path: '/admin/documentos', icon: FaFolderOpen, label: 'Gestión de Documentos' },
          { path: '/admin/catalogos-express', icon: FaList, label: 'Catálogos Express' },
          { path: '/complex/gestion-estados', icon: FaCog, label: 'Estados COMPLEX' },
        ]
      : [],
  };

  const sections = [
    { key: 'principal', title: 'PRINCIPAL', icon: FaHome, items: menuItems.principal },
    ...(!esVisualizador
      ? [
          { key: 'complex', title: 'COMPLEX', icon: FaFileAlt, items: menuItems.complex },
          { key: 'riesgos', title: 'RIESGOS', icon: FaChartBar, items: menuItems.riesgos },
          { key: 'express', title: 'EXPRESS', icon: FaBolt, items: menuItems.express },
          { key: 'puertos', title: 'PUERTOS', icon: FaShip, items: menuItems.puertos },
          { key: 'formularios', title: 'FORMULARIOS', icon: FaFileInvoice, items: menuItems.formularios },
        ]
      : []),
    { key: 'matrices', title: 'MATRICES', icon: FaChartBar, items: menuItems.matrices },
    ...(esAdminOSoporte
      ? [{ key: 'admin', title: 'ADMINISTRACIÓN', icon: FaShieldAlt, items: menuItems.admin }]
      : []),
    ...(!esVisualizador
      ? [{ key: 'cuenta', title: 'CUENTA', icon: FaUserCircle, items: menuItems.cuenta }]
      : []),
  ].filter((s) => s.items?.length > 0);

  const sectionHasActiveChild = (items) =>
    items?.some((item) => isActive(item.path) || location.pathname.startsWith(item.path + '/'));

  const NavSection = ({ section }) => {
    const { key, title, icon: Icon, items } = section;
    if (!items?.length) return null;

    const expanded = expandedSection === key;
    const active = sectionHasActiveChild(items);
    const singleItem = items.length === 1 && key === 'principal';

    const activeClasses =
      'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-900/30';
    const inactiveClasses =
      'text-gray-300 hover:bg-gray-800 hover:text-white';

    if (sidebarCollapsed) {
      return (
        <div className="relative mb-1 flex justify-center">
          <button
            type="button"
            title={title}
            onClick={() => toggleSection(key)}
            className={`rounded-lg p-2.5 transition-all ${
              active ? activeClasses : inactiveClasses
            }`}
          >
            <Icon className="text-lg" />
          </button>
          {expanded && (
            <div className="absolute left-full top-0 z-50 ml-2 min-w-[220px] rounded-lg border border-gray-700 bg-gray-900 py-2 shadow-xl">
              {items.map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  onClick={() => {
                    item.onClick?.();
                    setExpandedSection(null);
                  }}
                  className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    isActive(item.path)
                      ? 'bg-red-600/20 text-red-300'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <item.icon className="text-sm opacity-80" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mb-1">
        {singleItem ? (
          <Link
            to={items[0].path}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold tracking-wide transition-all ${
              isActive(items[0].path) ? activeClasses : inactiveClasses
            }`}
          >
            <Icon className="text-base shrink-0" />
            <span className="flex-1 text-left">{title}</span>
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={() => toggleSection(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold tracking-wide transition-all ${
                active && !expanded ? activeClasses : inactiveClasses
              } ${active && expanded ? 'text-red-400' : ''}`}
            >
              <Icon className="text-base shrink-0" />
              <span className="flex-1 text-left">{title}</span>
              <FaChevronDown
                className={`text-xs opacity-60 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="mt-1 space-y-0.5 border-l border-gray-700/60 ml-5 pl-2">
                {items.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => item.onClick?.()}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-red-600/90 to-red-700/90 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    }`}
                  >
                    <item.icon className="text-xs shrink-0 opacity-80" />
                    <span className="leading-tight">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const mainBg = theme === 'dark' ? 'bg-[#121212]' : 'bg-[#F5F5F7]';
  const topBarBg = theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';

  return (
    <div
      className={`flex ${esMatrizRiesgo ? 'h-screen min-h-0 overflow-hidden' : 'min-h-screen'} ${mainBg}`}
    >
      {/* Sidebar oscuro */}
      <aside
        className={`flex shrink-0 flex-col border-r border-gray-800 bg-[#141414] text-white transition-all duration-300 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64 lg:w-72'
        }`}
      >
        {/* Logo */}
        <div className={`border-b border-gray-800 px-3 py-4 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm transition hover:bg-gray-100"
              title="Expandir menú — ARNALD Data Flow"
            >
              <img
                src={arnaldIcon}
                alt="ARNALD"
                className="h-8 w-8 object-contain"
              />
            </button>
          ) : (
            <div>
              <div className="flex h-[4.75rem] w-full items-center overflow-hidden rounded-xl bg-white px-2 py-1 shadow-sm sm:h-20">
                <img
                  src={arnaldLogo}
                  alt="ARNALD Data Flow"
                  className="h-full w-full min-w-[108%] max-w-none scale-[1.22] object-contain object-left origin-left"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-400">Panel de Control</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
                    title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  >
                    {theme === 'dark' ? <FaSun className="text-sm" /> : <FaMoon className="text-sm" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarCollapsed(true);
                      setExpandedSection(null);
                    }}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
                    title="Colapsar menú"
                  >
                    <FaChevronLeft className="text-xs" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section) => (
            <NavSection key={section.key} section={section} />
          ))}
        </nav>

        {/* Pie: versión, sesión y logout */}
        <div className="border-t border-gray-800 p-3 space-y-3">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/80 px-3 py-2 text-[11px] text-gray-500">
              <FaShieldAlt className="shrink-0 text-fenix-primario" />
              <span className="leading-tight">
                ARNALD Data Flow
                <span className="block font-mono text-gray-400">V 2.5.0</span>
              </span>
            </div>
          )}
          <SessionTimerSidebar compact={sidebarCollapsed} />
          {!sidebarCollapsed && <LogoutButton variant="sidebar" />}
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="flex w-full justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              title="Expandir"
            >
              <FaChevronRight className="text-sm" />
            </button>
          )}
        </div>
      </aside>

      {/* Área principal */}
      <div className={`flex min-w-0 flex-1 flex-col ${esMatrizRiesgo ? 'min-h-0' : ''}`}>
        {/* Top bar — estilo dashboard */}
        <header
          className={`sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b px-4 shadow-sm sm:px-6 ${topBarBg}`}
        >
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-fenix-primario"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Menú lateral"
          >
            <FaBars className="text-lg" />
          </button>

          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <button
              type="button"
              className="rounded-lg p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              title="Buscar"
              onClick={() => {
                if (location.pathname === '/inicio') {
                  document.getElementById('buscar-tarea-inicio')?.focus();
                }
              }}
            >
              <FaSearch className="text-lg" />
            </button>

            {(esAdminOSoporte || esSoloSoporte) && (
              <button
                type="button"
                onClick={() => navigate('/complex/alertas')}
                className="relative rounded-lg p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-fenix-primario"
                title="Alertas"
              >
                <FaBell className="text-lg" />
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-fenix-primario px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  3
                </span>
              </button>
            )}

            <button
              type="button"
              className="hidden rounded-lg p-2.5 text-gray-500 transition hover:bg-gray-100 sm:block"
              title="Ayuda"
            >
              <FaQuestionCircle className="text-lg" />
            </button>

            <div className="relative ml-1 border-l border-gray-200 pl-2 sm:ml-2 sm:pl-3">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-gray-50 sm:gap-3 sm:pr-3"
              >
                {fotoUsuario ? (
                  <img
                    src={fotoUsuario}
                    alt=""
                    className="h-9 w-9 rounded-full border-2 border-fenix-primario/30 object-cover"
                    onError={() =>
                      setFotoUsuarioQueue((q) => (q.length > 1 ? q.slice(1) : []))
                    }
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-fenix-primario">
                    <FaUserCircle className="text-xl" />
                  </div>
                )}
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-gray-800">
                    {formatNombreCorto(usuarioActual.nombre, usuarioActual.login)}
                  </p>
                  <p className="text-xs text-gray-500">{formatRol(usuarioActual.rol)}</p>
                </div>
                <FaChevronDown
                  className={`hidden text-xs text-gray-400 transition sm:block ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {userMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40"
                    aria-label="Cerrar menú"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                    <Link
                      to="/micuenta"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Mi cuenta
                    </Link>
                    <Link
                      to="/cuenta"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Configuración
                    </Link>
                    {puedeCatalogosExpress && !esAdminOSoporte && (
                      <Link
                        to="/admin/catalogos-express"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Catálogos Express
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main
          className={`flex-1 min-h-0 ${
            esMatrizRiesgo ? 'overflow-hidden p-0' : 'overflow-auto'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
