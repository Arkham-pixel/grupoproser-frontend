// src/components/Layout.jsx
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  FaCalculator,
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
  FaTasks,
  FaHandHoldingHeart,
  FaTimes,
  FaSignOutAlt,
  FaMapMarkerAlt,
  FaStar,
  FaMountain,
  FaUserCheck,
  FaUniversity,
  FaEye,
  FaLink,
  FaGlobeAmericas,
} from 'react-icons/fa';
import { esUsuarioGerenteFacturacion } from '../config/gerentesFacturacion';
import { obtenerMisSubtareas } from '../services/complexSubtareasService.js';
import { arnaldLogo, arnaldIcon } from '../config/brandAssets.js';
import { registrarNavegacionArnald } from '../services/arnaldPlataformaService.js';
import { flushArnaldDraftsNow } from '../services/arnaldDraftFlushRegistry.js';
import LogoutButton from './LogoutButton';
import Aviso2FAPrompt from './Aviso2FAPrompt';
import ArnaldBorradoresPendientesModal from './ArnaldBorradoresPendientesModal';
import LanguageSelector from './LanguageSelector';
import { useTheme } from '../context/ThemeContext';
import { usuarioAutorizadoGestionDocumentos } from '../config/gestionDocumentosPermitidos';
import { usuarioAutorizadoCatalogosExpress } from '../config/expressCatalogosPermitidos';
import { esRolContractor, esRolContractorZurich, esRolPuertos, esRolSoloBbva, esRolVisualizador, etiquetaRol, obtenerConfigContractor, obtenerRolAlmacenado } from '../config/roles';
import {
  obtenerMisAlertas,
  obtenerResumenAlertas,
} from '../services/alertasComplexService.js';
import { useIsMobileShell } from '../hooks/useMediaQuery';
import { apiRequest } from '../config/apiConfig.js';
import { limpiarSesionLocal } from '../utils/limpiarSesionLocal.js';

const SESSION_MAX_MS = 8 * 60 * 60 * 1000;
/** Aviso interno (modal de plataforma) 30 minutos antes del cierre automático */
const SESSION_WARNING_MS = 30 * 60 * 1000;
const SESSION_WARNING_DISMISSED_KEY = 'sessionWarning30Dismissed';

const ICONOS_ASEGURADORA = {
  alfa: FaStar,
  zurich: FaMountain,
  bbvaCat: FaUniversity,
  previsora: FaEye,
  allianz: FaLink,
  sura: FaGlobeAmericas,
};

function formatTimer(time) {
  const h = String(time.hours).padStart(2, '0');
  const m = String(time.minutes).padStart(2, '0');
  const s = String(time.seconds).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatNombreCorto(nombre, login) {
  const base = (nombre || login || 'Usuario').trim();
  const match = base.match(/^(.*?)(\s*\([^)]+\))\s*$/);
  const nombreSinSufijo = (match ? match[1] : base).trim();
  const sufijo = match ? match[2].replace(/\s+/g, ' ').trim() : '';
  const partes = nombreSinSufijo.split(/\s+/).filter(Boolean);
  let corto;
  if (partes.length <= 1) {
    corto = partes[0] || login || 'Usuario';
  } else {
    const inicial = partes[partes.length - 1].charAt(0).toUpperCase();
    corto = `${partes[0]} ${inicial}.`;
  }
  return sufijo ? `${corto} ${sufijo}` : corto;
}

function formatRol(rol, t) {
  return etiquetaRol(rol, t);
}

/** Timer de sesión en pie del sidebar + aviso modal 30 min antes del cierre */
function SessionTimerSidebar({ compact = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [remaining, setRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [remainingMs, setRemainingMs] = useState(SESSION_MAX_MS);
  const [showWarning, setShowWarning] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const warningOpenedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const start = localStorage.getItem('sessionStartTime');
      if (!start) return;
      const duration = Date.now() - parseInt(start, 10);
      const left = SESSION_MAX_MS - duration;
      if (left <= 0) {
        setRemainingMs(0);
        return;
      }

      setRemainingMs(left);
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

      const dismissedFor = sessionStorage.getItem(SESSION_WARNING_DISMISSED_KEY);
      const alreadyDismissed = dismissedFor === start;
      if (left <= SESSION_WARNING_MS && !alreadyDismissed && !warningOpenedRef.current) {
        warningOpenedRef.current = true;
        setShowWarning(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const dismissWarning = () => {
    const start = localStorage.getItem('sessionStartTime') || '';
    sessionStorage.setItem(SESSION_WARNING_DISMISSED_KEY, start);
    setShowWarning(false);
  };

  const handleLogoutNow = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await flushArnaldDraftsNow({ keepalive: true });
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await apiRequest('/secur-auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          /* continuar con cierre local */
        }
      }
    } finally {
      limpiarSesionLocal();
      sessionStorage.removeItem(SESSION_WARNING_DISMISSED_KEY);
      navigate('/login', { replace: true });
    }
  };

  const warningModal =
    showWarning &&
    createPortal(
      <div
        className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="presentation"
      >
        <div
          className="relative w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-warning-title"
        >
          <button
            type="button"
            onClick={dismissWarning}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-gray-300"
            aria-label={t('nav.sessionWarningClose')}
          >
            <FaTimes />
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <FaExclamationTriangle className="text-xl text-fenix-primario" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-fenix-primario">
                ARNALD Data Flow
              </p>
              <h2
                id="session-warning-title"
                className="text-lg font-bold text-white"
              >
                {t('nav.sessionWarningTitle')}
              </h2>
            </div>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-gray-300">
            {t('nav.sessionWarningMessage')}
          </p>

          <div className="mb-5 rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FaClock className="shrink-0 text-fenix-primario" />
              <span>
                {t('nav.autoLogoutIn', {
                  time: formatTimer(
                    remainingMs > 0
                      ? remaining
                      : { hours: 0, minutes: 0, seconds: 0 }
                  ),
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={dismissWarning}
              className="flex-1 rounded-xl bg-fenix-primario px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
            >
              {t('nav.sessionWarningContinue')}
            </button>
            <button
              type="button"
              onClick={handleLogoutNow}
              disabled={loggingOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-medium text-gray-200 transition hover:border-red-500/50 hover:bg-gray-700 hover:text-white disabled:opacity-60"
            >
              <FaSignOutAlt />
              {loggingOut ? t('nav.sessionWarningLoggingOut') : t('auth.logout')}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  if (compact) {
    return (
      <>
        <div className="flex flex-col items-center gap-0.5 text-[10px] text-gray-400">
          <FaClock
            className={
              remainingMs <= SESSION_WARNING_MS
                ? 'text-amber-400'
                : 'text-fenix-primario'
            }
          />
          <span className="font-mono font-medium text-gray-300">
            {formatTimer(elapsed)}
          </span>
        </div>
        {warningModal}
      </>
    );
  }

  return (
    <>
      <div
        className={`rounded-lg border px-3 py-2.5 text-xs text-gray-300 ${
          remainingMs <= SESSION_WARNING_MS
            ? 'border-amber-500/40 bg-amber-950/30'
            : 'border-gray-700/80 bg-gray-800/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <FaClock
            className={`shrink-0 ${
              remainingMs <= SESSION_WARNING_MS
                ? 'text-amber-400'
                : 'text-fenix-primario'
            }`}
          />
          <span>
            {t('nav.sessionLabel')}{' '}
            <span className="font-mono font-semibold text-white">
              {formatTimer(elapsed)}
            </span>
          </span>
        </div>
        <p
          className={`mt-1 pl-6 text-[11px] ${
            remainingMs <= SESSION_WARNING_MS
              ? 'font-medium text-amber-300/90'
              : 'text-gray-500'
          }`}
        >
          {t('nav.autoLogoutIn', { time: formatTimer(remaining) })}
        </p>
      </div>
      {warningModal}
    </>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const isMobileShell = useIsMobileShell();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(() => {
    const rol = obtenerRolAlmacenado();
    if (esRolVisualizador(rol)) return 'matrices';
    if (esRolPuertos(rol)) return 'puertos';
    const contractor = obtenerConfigContractor(rol);
    if (contractor) return contractor.seccionesMenu?.[0] || 'zurich';
    return null;
  });
  const [fotoUsuarioQueue, setFotoUsuarioQueue] = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [contadorAlertas, setContadorAlertas] = useState(0);
  const [contadorSubtareas, setContadorSubtareas] = useState(0);
  const fotoUsuario = fotoUsuarioQueue[0] || null;
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // En shell móvil el menú siempre se muestra expandido (drawer); sin flyouts.
  const menuCollapsed = isMobileShell ? false : sidebarCollapsed;

  const esMatrizRiesgo = location.pathname.includes('/matriz-riesgo-avanzada');
  const contenidoExpandido = esMatrizRiesgo;

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
  const esVisualizador = esRolVisualizador(rolNorm);
  const esPuertos = esRolPuertos(rolNorm);
  const configContractor = obtenerConfigContractor(rolNorm);
  const esContractor = Boolean(configContractor);
  const accesoRestringido = esVisualizador || esPuertos || esContractor || rolNorm === 'externo';
  const puedeCatalogosExpress = usuarioAutorizadoCatalogosExpress(
    localStorage.getItem('cedula'),
    localStorage.getItem('login'),
    localStorage.getItem('email'),
    usuarioActual.rol
  );
  const puedeBandejaFacturacion = esUsuarioGerenteFacturacion(usuarioActual.login);

  useEffect(() => {
    if (accesoRestringido) return undefined;
    let activo = true;
    const cargarContador = async () => {
      try {
        if (esAdminOSoporte) {
          const res = await obtenerResumenAlertas();
          if (activo) setContadorAlertas(res?.totalAlertas ?? 0);
        } else {
          const res = await obtenerMisAlertas();
          if (activo) setContadorAlertas(res?.totalAlertas ?? 0);
        }
      } catch {
        /* sin contador */
      }
      try {
        const resSub = await obtenerMisSubtareas();
        if (activo) setContadorSubtareas(resSub?.total ?? 0);
      } catch {
        /* sin contador subtareas */
      }
    };
    cargarContador();
    const intervalo = setInterval(cargarContador, 5 * 60 * 1000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [accesoRestringido, esAdminOSoporte, location.pathname]);

  const routeTitles = useMemo(() => ({
    '/inicio': t('nav.pageTitles.home'),
    '/ayuda': t('nav.pageTitles.help'),
    '/formularioinspeccion': t('nav.pageTitles.inspectionForm'),
    '/formulario-inspeccion-propiedades': t('nav.pageTitles.propertiesInspectionForm'),
    '/complex/agregar': t('nav.pageTitles.complexAdd'),
    '/complex/editar': t('nav.pageTitles.complexEdit'),
    '/complex/excel': t('nav.pageTitles.complexReport'),
    '/complex/mis-casos': t('nav.pageTitles.complexMyCases'),
    '/complex/mis-subtareas': t('nav.pageTitles.complexMyTasks'),
    '/complex/bandeja-facturacion': t('nav.pageTitles.complexBillingTray'),
    '/complex/reporte-mejorado': t('nav.pageTitles.complexReport'),
    '/complex/dashboard': t('nav.pageTitles.complexDashboard'),
    '/complex/indicadores-alertas': t('nav.pageTitles.complexIndicators'),
    '/complex/indicadores-historicos': t('nav.pageTitles.complexIndicators'),
    '/complex/indicadores-protocolo': t('nav.pageTitles.complexIndicators'),
    '/complex/mis-alertas': t('nav.pageTitles.complexIndicators'),
    '/complex/protocolo-tiempos': t('nav.pageTitles.complexTimeProtocol'),
    '/complex/alertas': t('nav.pageTitles.complexAlerts'),
    '/complex/gestion-estados': t('nav.pageTitles.complexStates'),
    '/editar-caso': t('nav.pageTitles.editCase'),
    '/riesgos/agregar': t('risks.ui.layout.page_title_agregar'),
    '/riesgos/dashboard': t('risks.ui.layout.page_title_dashboard'),
    '/riesgos/exportar': t('risks.ui.layout.page_title_exportar'),
    '/riesgos/editar': t('risks.ui.layout.page_title_editar'),
    '/cuenta': t('nav.pageTitles.account'),
    '/micuenta': t('nav.pageTitles.myAccount'),
    '/formulario-maquinaria': t('nav.pageTitles.machineryForm'),
    '/reporte-pol': t('nav.pageTitles.polReport'),
    '/ajuste': t('nav.pageTitles.adjustment'),
    '/matriz-riesgo-avanzada': t('nav.pageTitles.arnaldRiskIntelligence'),
    '/matrices-riesgo': t('nav.pageTitles.riskMatrices'),
    '/express/carga': t('nav.pageTitles.expressLoad'),
    '/express/liquidador': t('nav.pageTitles.expressSettlement'),
    '/express/reporte': t('nav.pageTitles.expressReport'),
    '/express/protocolo': t('nav.pageTitles.expressProtocol'),
    '/express/dashboard': t('nav.pageTitles.expressProtocol'),
    '/express/alertas': t('nav.pageTitles.expressProtocol'),
    '/express/tablero': t('nav.pageTitles.expressBoard'),
    '/admin/catalogos-express': t('nav.pageTitles.expressCatalogs'),
    '/equidad-fdm/carga': t('nav.pageTitles.fdmAdd'),
    '/equidad-fdm/liquidador': t('nav.pageTitles.fdmSettlement'),
    '/equidad-fdm/reporte': t('nav.pageTitles.fdmReport'),
    '/equidad-fdm/dashboard': t('nav.pageTitles.fdmDashboard'),
    '/seguros-alfa/carga': t('nav.pageTitles.alfaAdd'),
    '/seguros-alfa/reporte': t('nav.pageTitles.alfaReport'),
    '/seguros-alfa/dashboard': t('nav.pageTitles.alfaDashboard'),
    '/seguros-alfa/boletin': t('nav.pageTitles.alfaBulletin'),
    '/seguros-alfa/bloques': t('nav.pageTitles.alfaBlocks'),
    '/seguros-alfa/caso': t('nav.pageTitles.alfaCase'),
    '/seguros-alfa/liquidador': t('nav.pageTitles.alfaCase'),
    '/seguros-alfa/informe-unico': t('nav.pageTitles.alfaCase'),
    '/zurich/carga': t('nav.pageTitles.zurichAdd'),
    '/zurich/listado/reporte': t('nav.pageTitles.zurichListadoReport'),
    '/zurich/listado/dashboard': t('nav.pageTitles.zurichListadoDashboard'),
    '/zurich/listado/caso': t('nav.pageTitles.zurichCase'),
    '/zurich/reporte': t('nav.pageTitles.zurichReport'),
    '/zurich/dashboard': t('nav.pageTitles.zurichDashboard'),
    '/zurich/boletin': t('nav.pageTitles.zurichBulletin'),
    '/zurich/caso': t('nav.pageTitles.zurichCase'),
    '/zurich/liquidador': t('nav.pageTitles.zurichCase'),
    '/zurich/informe-unico': t('nav.pageTitles.zurichCase'),
    '/bbva-cat/carga': t('nav.pageTitles.bbvaCatAdd'),
    '/bbva-cat/listado/reporte': t('nav.pageTitles.bbvaCatListadoReport'),
    '/bbva-cat/listado/analista': t('nav.pageTitles.bbvaCatListadoAnalista'),
    '/bbva-cat/listado/dashboard': t('nav.pageTitles.bbvaCatListadoDashboard'),
    '/bbva-cat/listado/caso': t('nav.pageTitles.bbvaCatCase'),
    '/bbva-cat/reporte': t('nav.pageTitles.bbvaCatReport'),
    '/bbva-cat/dashboard': t('nav.pageTitles.bbvaCatDashboard'),
    '/bbva-cat/boletin': t('nav.pageTitles.bbvaCatBulletin'),
    '/bbva-cat/caso': t('nav.pageTitles.bbvaCatCase'),
    '/bbva-cat/liquidador': t('nav.pageTitles.bbvaCatCase'),
    '/bbva-cat/informe-unico': t('nav.pageTitles.bbvaCatCase'),
    '/bbva-cat/archivero': t('nav.pageTitles.bbvaCatArchive'),
    '/bbva-cat/bloques': t('nav.pageTitles.bbvaCatBlocks'),
    '/previsora/carga': t('nav.pageTitles.previsoraAdd'),
    '/previsora/listado/reporte': t('nav.pageTitles.previsoraListadoReport'),
    '/previsora/listado/dashboard': t('nav.pageTitles.previsoraListadoDashboard'),
    '/previsora/listado/caso': t('nav.pageTitles.previsoraCase'),
    '/previsora/reporte': t('nav.pageTitles.previsoraReport'),
    '/previsora/dashboard': t('nav.pageTitles.previsoraDashboard'),
    '/previsora/boletin': t('nav.pageTitles.previsoraBulletin'),
    '/previsora/caso': t('nav.pageTitles.previsoraCase'),
    '/previsora/liquidador': t('nav.pageTitles.previsoraCase'),
    '/previsora/informe-unico': t('nav.pageTitles.previsoraCase'),
    '/previsora/archivero': t('nav.pageTitles.previsoraArchive'),
    '/allianz/carga': t('nav.pageTitles.allianzAdd'),
    '/allianz/listado/reporte': t('nav.pageTitles.allianzListadoReport'),
    '/allianz/listado/dashboard': t('nav.pageTitles.allianzListadoDashboard'),
    '/allianz/listado/caso': t('nav.pageTitles.allianzCase'),
    '/allianz/reporte': t('nav.pageTitles.allianzReport'),
    '/allianz/dashboard': t('nav.pageTitles.allianzDashboard'),
    '/allianz/boletin': t('nav.pageTitles.allianzBulletin'),
    '/allianz/caso': t('nav.pageTitles.allianzCase'),
    '/allianz/liquidador': t('nav.pageTitles.allianzCase'),
    '/allianz/informe-unico': t('nav.pageTitles.allianzCase'),
    '/allianz/archivero': t('nav.pageTitles.allianzArchive'),
    '/sura/carga': t('nav.pageTitles.suraAdd'),
    '/sura/editar': t('nav.pageTitles.suraAdd'),
    '/sura/reporte': t('nav.pageTitles.suraReport'),
    '/sura/documentacion': 'Documentación SURA',
    '/sura/dashboard': t('nav.pageTitles.suraDashboard'),
    '/sura/boletin': t('nav.pageTitles.suraBulletin'),
    '/sura/bloques': t('nav.pageTitles.suraBlocks'),
    '/sura/caso': t('nav.pageTitles.suraCase'),
    '/sura/liquidador': t('nav.pageTitles.suraCase'),
    '/sura/informe-unico': t('nav.pageTitles.suraCase'),
    '/sura': t('nav.pageTitles.sura'),
    '/propiedades/carga': t('nav.pageTitles.propertiesNew'),
    '/propiedades/dashboard': t('nav.pageTitles.propertiesDashboard'),
    '/propiedades/reporte': t('nav.pageTitles.propertiesReport'),
    '/propiedades/inspeccion': t('nav.pageTitles.propertiesInspection'),
    '/sg-sst': t('nav.pageTitles.sgSst'),
    '/puertos/actas': t('nav.pageTitles.portsActas'),
    '/puertos/actas/nueva': t('nav.pageTitles.portsNewActa'),
    '/puertos/actas/caso/nueva': t('nav.pageTitles.portsExportCase'),
    '/puertos/formulario': t('nav.pageTitles.portsInstallations'),
    '/puertos/inspeccion-asegurado': t('nav.pageTitles.portsInsured'),
    '/puertos/actas/inspeccion-asegurado/nueva': t('nav.pageTitles.portsInsured'),
    '/puertos/actas/catalogos': t('nav.pageTitles.portsCatalogs'),
    '/historial': t('nav.pageTitles.formsHistory'),
    '/siniestros': t('nav.pageTitles.claims'),
    '/admin/usuarios': t('nav.pageTitles.adminUsers'),
    '/admin/estadisticas-tiempo-uso': t('nav.pageTitles.adminTimeUsage'),
    '/admin/auditoria': t('nav.pageTitles.adminAudit'),
    '/admin/session-settings': t('nav.pageTitles.adminSession'),
    '/admin/clientes-funcionarios': t('nav.pageTitles.adminClients'),
    '/admin/intermediarios': t('nav.pageTitles.adminIntermediaries'),
    '/admin/responsables': t('nav.pageTitles.adminResponsibles'),
    '/admin/ajustadores-catastrofico': t('nav.pageTitles.adminCatastrophicAdjusters'),
    '/admin/inspectores-catastrofico': t('nav.pageTitles.adminCatastrophicInspectors'),
    '/admin/documentos': t('nav.pageTitles.adminDocuments'),
    '/editar-perfil-usuario': t('nav.pageTitles.editUserProfile'),
    '/informacion-completa': t('nav.pageTitles.fullEmployeeInfo'),
  }), [t]);

  useEffect(() => {
    const pathname = location.pathname;
    const pageTitle =
      routeTitles[pathname] ||
      Object.entries(routeTitles)
        .filter(([route]) => route !== '/inicio' && pathname.startsWith(route))
        .sort((a, b) => b[0].length - a[0].length)[0]?.[1];
    document.title = pageTitle ? `Arnald DataFlow - ${pageTitle}` : 'Arnald DataFlow';
  }, [location.pathname, routeTitles]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    if (location.pathname === '/login') return;
    registrarNavegacionArnald({
      ruta: location.pathname,
      titulo: routeTitles[location.pathname] || document.title,
    });
  }, [location.pathname, routeTitles]);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/inicio' || path === '/') setExpandedSection('principal');
    else if (path.startsWith('/complex')) setExpandedSection('complex');
    else if (path.startsWith('/riesgos')) setExpandedSection('riesgos');
    else if (path.startsWith('/express')) setExpandedSection('express');
    else if (path.startsWith('/equidad-fdm')) setExpandedSection('equidadFdm');
    else if (path.startsWith('/seguros-alfa')) setExpandedSection('alfa');
    else if (path.startsWith('/zurich')) setExpandedSection('zurich');
    else if (path.startsWith('/bbva-cat')) setExpandedSection('bbvaCat');
    else if (path.startsWith('/previsora')) setExpandedSection('previsora');
    else if (path.startsWith('/allianz') || path.startsWith('/allias')) setExpandedSection('allianz');
    else if (path.startsWith('/sura')) setExpandedSection('sura');
    else if (path.startsWith('/propiedades')) setExpandedSection('propiedades');
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

  // Cerrar drawer al navegar o al pasar a desktop.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileShell) setMobileNavOpen(false);
  }, [isMobileShell]);

  useEffect(() => {
    if (!isMobileShell || !mobileNavOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileShell, mobileNavOpen]);

  const closeMobileNav = () => setMobileNavOpen(false);

  const handleNavToggle = () => {
    if (isMobileShell) {
      setMobileNavOpen((o) => !o);
    } else {
      setSidebarCollapsed((c) => !c);
    }
  };

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

  const destinoMenu = (path) => {
    const esLiquidadorOInforme =
      path === '/bbva-cat/liquidador' ||
      path === '/bbva-cat/informe-unico' ||
      path === '/previsora/liquidador' ||
      path === '/previsora/informe-unico' ||
      path === '/allianz/liquidador' ||
      path === '/allianz/informe-unico';
    if (!esLiquidadorOInforme) return path;
    const q = new URLSearchParams(location.search);
    const casoUrl = q.get('casoId') || q.get('id');
    let casoGuardado = '';
    try {
      const storageKey = path.startsWith('/previsora')
        ? 'previsoraWorkspaceCasoId'
        : path.startsWith('/allianz')
          ? 'allianzWorkspaceCasoId'
          : 'bbvaCatWorkspaceCasoId';
      casoGuardado =
        sessionStorage.getItem(storageKey) ||
        (path.startsWith('/allianz') ? sessionStorage.getItem('alliasWorkspaceCasoId') : '') ||
        '';
    } catch {
      casoGuardado = '';
    }
    const casoId = casoUrl || casoGuardado;
    if (!casoId) return path;
    const tab = path.endsWith('informe-unico') ? 'informe' : 'liquidador';
    return `${path}?casoId=${encodeURIComponent(casoId)}&tab=${tab}`;
  };

  const toggleSection = (section) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const menuItems = {
    principal:
      !accesoRestringido || configContractor?.incluirHome
        ? [{ path: '/inicio', icon: FaHome, label: t('nav.home') }]
        : [],
    matrices: esPuertos
      ? []
      : [
          { path: '/matrices-riesgo', icon: FaList, label: t('nav.viewRI') },
          { path: '/matriz-riesgo-avanzada', icon: FaChartBar, label: t('nav.arnaldRiskIntelligence') },
        ],
    complex: !accesoRestringido
      ? [
          { path: '/complex/agregar', icon: FaPlus, label: t('nav.addCases') },
          { path: '/complex/dashboard', icon: FaChartLine, label: t('nav.dashboard') },
          { path: '/complex/indicadores-alertas', icon: FaChartBar, label: t('nav.indicators') },
          { path: '/complex/excel', icon: FaTable, label: t('nav.completeReport') },
          { path: '/complex/mis-casos', icon: FaList, label: t('nav.assignedCases') },
          { path: '/complex/mis-subtareas', icon: FaTasks, label: t('nav.myTasks') },
          ...(puedeBandejaFacturacion
            ? [{ path: '/complex/bandeja-facturacion', icon: FaInbox, label: t('nav.billingTray') }]
            : []),
        ]
      : [],
    riesgos: !accesoRestringido
      ? [
          { path: '/riesgos/agregar', icon: FaPlus, label: t('nav.addCases') },
          { path: '/riesgos/dashboard', icon: FaChartLine, label: t('nav.dashboard') },
          { path: '/riesgos/exportar', icon: FaDownload, label: t('nav.exportExcel') },
        ]
      : [],
    formularios: !accesoRestringido
      ? [
          { path: '/complex/agregar', icon: FaFileAlt, label: t('nav.complexForm') },
          { path: '/formularioinspeccion', icon: FaClipboardList, label: t('nav.riskForm') },
          { path: '/ajuste', icon: FaFileAlt, label: t('nav.adjustmentForm') },
          { path: '/reporte-pol', icon: FaFileInvoice, label: t('nav.polForm') },
          { path: '/formulario-maquinaria', icon: FaTools, label: t('nav.machineryForm') },
          { path: '/express/carga', icon: FaBolt, label: t('nav.expressForm') },
          { path: '/equidad-fdm/carga', icon: FaHandHoldingHeart, label: t('nav.equidadFdmForm') },
          { path: '/propiedades/carga', icon: FaBuilding, label: t('nav.propertiesForm') },
          { path: '/puertos/formulario', icon: FaShip, label: t('nav.portsInstallationsForm') },
          {
            path: '/puertos/actas/inspeccion-asegurado/nueva',
            icon: FaFileAlt,
            label: t('nav.portsInsuredForm'),
          },
          { path: '/puertos/actas/nueva', icon: FaClipboardList, label: t('nav.portsActaForm') },
          { path: '/puertos/actas/caso/nueva', icon: FaFileInvoice, label: t('nav.portsExportForm') },
          { path: '/historial', icon: FaList, label: t('nav.formsHistory') },
        ]
      : [],
    propiedades: !accesoRestringido
      ? [
          { path: '/propiedades/carga', icon: FaPlus, label: t('nav.newCase') },
          { path: '/propiedades/dashboard', icon: FaChartLine, label: t('nav.dashboard') },
          { path: '/propiedades/reporte', icon: FaTable, label: t('nav.report') },
        ]
      : [],
    sgSst: !accesoRestringido
      ? [{ path: '/sg-sst', icon: FaShieldAlt, label: t('nav.sgSstSelfAssessment') }]
      : [],
    express: !accesoRestringido
      ? [
          { path: '/express/carga', icon: FaBolt, label: t('nav.expressLoad') },
          { path: '/express/liquidador', icon: FaCalculator, label: t('nav.expressSettlement') },
          { path: '/express/protocolo', icon: FaChartLine, label: t('nav.expressProtocol') },
          { path: '/express/tablero', icon: FaClipboardList, label: t('nav.expressBoard') },
          { path: '/express/reporte', icon: FaTable, label: t('nav.expressReport') },
        ]
      : [],
    equidadFdm:
      !accesoRestringido
        ? [
            { path: '/equidad-fdm/carga', icon: FaPlus, label: t('nav.fdmAddCase') },
            { path: '/equidad-fdm/liquidador', icon: FaCalculator, label: t('nav.fdmSettlement') },
            { path: '/equidad-fdm/dashboard', icon: FaChartLine, label: t('nav.fdmDashboard') },
            { path: '/equidad-fdm/reporte', icon: FaTable, label: t('nav.fdmReport') },
          ]
        : configContractor?.seccionesMenu?.includes('equidadFdm')
          ? (configContractor.rutasMenuFdm || ['/equidad-fdm/reporte']).map((path) => {
              if (path === '/equidad-fdm/dashboard') {
                return { path, icon: FaChartLine, label: t('nav.fdmDashboard') };
              }
              return {
                path,
                icon: FaTable,
                label: t('nav.fdmTray', { defaultValue: 'Bandeja Equidad FDM' }),
              };
            })
          : [],
    alfa: !accesoRestringido || configContractor?.seccionesMenu?.includes('alfa')
      ? [
          { path: '/seguros-alfa/carga', icon: FaPlus, label: t('nav.alfaAddCase') },
          { path: '/seguros-alfa/caso', icon: FaFileAlt, label: t('nav.alfaCase') },
          { path: '/seguros-alfa/dashboard', icon: FaChartBar, label: t('nav.alfaDashboard') },
          { path: '/seguros-alfa/reporte', icon: FaTable, label: t('nav.alfaReport') },
          { path: '/seguros-alfa/boletin', icon: FaChartLine, label: t('nav.alfaBulletin') },
          { path: '/seguros-alfa/bloques', icon: FaMapMarkerAlt, label: t('nav.alfaBlocks') },
        ]
      : [],
    zurich: !accesoRestringido || configContractor?.seccionesMenu?.includes('zurich')
      ? [
          ...(!esRolContractorZurich(rolNorm)
            ? [
                { path: '/zurich/carga', icon: FaPlus, label: t('nav.zurichAddCase') },
                { path: '/zurich/listado/dashboard', icon: FaChartBar, label: t('nav.zurichListadoDashboard') },
                { path: '/zurich/listado/reporte', icon: FaTable, label: t('nav.zurichListadoReport') },
              ]
            : []),
          { path: '/zurich/caso', icon: FaFileAlt, label: t('nav.zurichCase') },
          { path: '/zurich/dashboard', icon: FaChartBar, label: t('nav.zurichDashboard') },
          { path: '/zurich/reporte', icon: FaTable, label: t('nav.zurichReport') },
        ]
      : [],
    bbvaCat: !accesoRestringido || configContractor?.seccionesMenu?.includes('bbvaCat')
      ? [
          { path: '/bbva-cat/listado/analista', icon: FaUserCheck, label: t('nav.bbvaCatListadoAnalista') },
          { path: '/bbva-cat/carga', icon: FaPlus, label: t('nav.bbvaCatAddCase') },
          { path: '/bbva-cat/listado/dashboard', icon: FaChartBar, label: t('nav.bbvaCatListadoDashboard') },
          ...(!esRolSoloBbva(rolNorm)
            ? [{ path: '/bbva-cat/listado/reporte', icon: FaTable, label: t('nav.bbvaCatListadoReport') }]
            : []),
          { path: '/bbva-cat/bloques', icon: FaMapMarkerAlt, label: t('nav.bbvaCatBlocks') },
          { path: '/bbva-cat/archivero', icon: FaFolderOpen, label: t('nav.bbvaCatArchive') },
        ]
      : [],
    previsora: !accesoRestringido || configContractor?.seccionesMenu?.includes('previsora')
      ? [
          { path: '/previsora/carga', icon: FaPlus, label: t('nav.previsoraAddCase') },
          { path: '/previsora/listado/dashboard', icon: FaChartBar, label: t('nav.previsoraListadoDashboard') },
          { path: '/previsora/listado/reporte', icon: FaTable, label: t('nav.previsoraListadoReport') },
          { path: '/previsora/archivero', icon: FaFolderOpen, label: t('nav.previsoraArchive') },
        ]
      : [],
    allianz: !accesoRestringido || configContractor?.seccionesMenu?.includes('allianz') || configContractor?.seccionesMenu?.includes('allias')
      ? [
          { path: '/allianz/carga', icon: FaPlus, label: t('nav.allianzAddCase') },
          { path: '/allianz/listado/dashboard', icon: FaChartBar, label: t('nav.allianzListadoDashboard') },
          { path: '/allianz/listado/reporte', icon: FaTable, label: t('nav.allianzListadoReport') },
          { path: '/allianz/archivero', icon: FaFolderOpen, label: t('nav.allianzArchive') },
        ]
      : [],
    sura: !accesoRestringido || configContractor?.seccionesMenu?.includes('sura')
      ? [
          { path: '/sura/carga', icon: FaPlus, label: t('nav.suraAddCase') },
          { path: '/sura/caso', icon: FaFileAlt, label: t('nav.suraCase') },
          { path: '/sura/dashboard', icon: FaChartBar, label: t('nav.suraDashboard') },
          { path: '/sura/reporte', icon: FaTable, label: t('nav.suraReport') },
          { path: '/sura/documentacion', icon: FaFolderOpen, label: 'Documentación' },
          { path: '/sura/boletin', icon: FaChartLine, label: t('nav.suraBulletin') },
          { path: '/sura/bloques', icon: FaMapMarkerAlt, label: t('nav.suraBlocks') },
        ]
      : [],
    puertos: !esVisualizador
      ? [
          { path: '/puertos/actas', icon: FaClipboardList, label: t('nav.portsActas') },
          ...(esPuertos
            ? [
                { path: '/puertos/actas/catalogos', icon: FaList, label: t('nav.catalogs') },
              ]
            : [
                { path: '/puertos/actas/nueva', icon: FaPlus, label: t('nav.portsNewActa') },
                { path: '/puertos/formulario', icon: FaShip, label: t('nav.portsInstallations') },
                { path: '/puertos/actas/catalogos', icon: FaList, label: t('nav.portsCatalogs') },
              ]),
          { path: '/puertos/actas/inspeccion-asegurado/nueva', icon: FaFileAlt, label: t('nav.portsInsured') },
        ]
      : [],
    cuenta: !esVisualizador && !esContractor
      ? esPuertos
        ? [{ path: '/cuenta', icon: FaUserCircle, label: t('nav.myAccount') }]
        : [
          { path: '/cuenta', icon: FaUserCircle, label: t('nav.myAccount') },
          ...(usuarioAutorizadoGestionDocumentos(
            localStorage.getItem('cedula'),
            localStorage.getItem('login')
          ) && !esAdminOSoporte
            ? [{ path: '/admin/documentos', icon: FaFolderOpen, label: t('nav.documentManagement') }]
            : []),
          ...(puedeCatalogosExpress && !esAdminOSoporte
            ? [{ path: '/admin/catalogos-express', icon: FaList, label: t('nav.expressCatalogs') }]
            : []),
          ...(() => {
            const login = localStorage.getItem('login');
            const cedula = localStorage.getItem('cedula');
            const AUT = ['1065012991'];
            const ok =
              (login && AUT.includes(login)) || (cedula && AUT.includes(cedula));
            return ok
              ? [{ path: '/informacion-completa', icon: FaChartBar, label: t('nav.fullEmployeeInfo') }]
              : [];
          })(),
        ]
      : [],
    admin: esAdminOSoporte
      ? [
          { path: '/admin/usuarios', icon: FaUsers, label: t('nav.userManagement') },
          { path: '/admin/estadisticas-tiempo-uso', icon: FaChartLine, label: t('nav.timeUsage') },
          { path: '/admin/auditoria', icon: FaClipboardList, label: t('nav.platformAudit') },
          {
            path: '/cuenta',
            icon: FaPlus,
            label: t('nav.addUser'),
            onClick: () => localStorage.setItem('cuentaTab', 'agregar'),
          },
          { path: '/editar-perfil-usuario', icon: FaEdit, label: t('nav.editUsers') },
          {
            path: '/cuenta',
            icon: FaTrash,
            label: t('nav.deleteUser'),
            onClick: () => localStorage.setItem('cuentaTab', 'eliminar'),
          },
          { path: '/admin/clientes-funcionarios', icon: FaBuilding, label: t('nav.clientsOfficials') },
          { path: '/admin/intermediarios', icon: FaHandshake, label: t('nav.intermediaries') },
          { path: '/admin/responsables', icon: FaUserTie, label: t('nav.responsibles') },
          {
            path: '/admin/ajustadores-catastrofico',
            icon: FaUserTie,
            label: t('nav.catastrophicAdjusters'),
          },
          {
            path: '/admin/inspectores-catastrofico',
            icon: FaUserTie,
            label: t('nav.catastrophicInspectors'),
          },
          { path: '/admin/documentos', icon: FaFolderOpen, label: t('nav.documentManagement') },
          { path: '/admin/catalogos-express', icon: FaList, label: t('nav.expressCatalogs') },
          { path: '/complex/gestion-estados', icon: FaCog, label: t('nav.complexStates') },
          { path: '/complex/alertas', icon: FaExclamationTriangle, label: t('nav.alertSystem') },
          { path: '/complex/protocolo-tiempos', icon: FaCog, label: t('nav.timeProtocol') },
        ]
      : [],
  };

  const sections = [
    { key: 'principal', title: t('nav.sections.principal'), icon: FaHome, items: menuItems.principal },
    ...(esPuertos
      ? [{ key: 'puertos', title: t('nav.sections.puertos'), icon: FaShip, items: menuItems.puertos }]
      : esContractor && configContractor
        ? (configContractor.seccionesMenu || []).map((key) => ({
            key,
            title: t(`nav.sections.${key}`),
            icon: ICONOS_ASEGURADORA[key] || (key === 'equidadFdm' ? FaHandHoldingHeart : FaFileAlt),
            items: menuItems[key],
          }))
      : !esVisualizador
        ? [
            { key: 'complex', title: t('nav.sections.complex'), icon: FaFileAlt, items: menuItems.complex },
            { key: 'riesgos', title: t('nav.sections.riesgos'), icon: FaChartBar, items: menuItems.riesgos },
            { key: 'express', title: t('nav.sections.express'), icon: FaBolt, items: menuItems.express },
            { key: 'equidadFdm', title: t('nav.sections.equidadFdm'), icon: FaHandHoldingHeart, items: menuItems.equidadFdm },
            { key: 'alfa', title: t('nav.sections.alfa'), icon: ICONOS_ASEGURADORA.alfa, items: menuItems.alfa },
            { key: 'zurich', title: t('nav.sections.zurich'), icon: ICONOS_ASEGURADORA.zurich, items: menuItems.zurich },
            { key: 'bbvaCat', title: t('nav.sections.bbvaCat'), icon: ICONOS_ASEGURADORA.bbvaCat, items: menuItems.bbvaCat },
            { key: 'previsora', title: t('nav.sections.previsora'), icon: ICONOS_ASEGURADORA.previsora, items: menuItems.previsora },
            { key: 'allianz', title: t('nav.sections.allianz'), icon: ICONOS_ASEGURADORA.allianz, items: menuItems.allianz },
            { key: 'sura', title: t('nav.sections.sura'), icon: ICONOS_ASEGURADORA.sura, items: menuItems.sura },
            { key: 'propiedades', title: t('nav.sections.propiedades'), icon: FaBuilding, items: menuItems.propiedades },
            { key: 'sgSst', title: t('nav.sections.sgSst'), icon: FaShieldAlt, items: menuItems.sgSst },
            { key: 'puertos', title: t('nav.sections.puertos'), icon: FaShip, items: menuItems.puertos },
            { key: 'formularios', title: t('nav.sections.formularios'), icon: FaFileInvoice, items: menuItems.formularios },
          ]
        : []),
    ...(!esPuertos && !esContractor ? [{ key: 'matrices', title: t('nav.sections.matrices'), icon: FaChartBar, items: menuItems.matrices }] : []),
    ...(esAdminOSoporte
      ? [{ key: 'admin', title: t('nav.sections.admin'), icon: FaShieldAlt, items: menuItems.admin }]
      : []),
    ...(!esVisualizador && !esContractor
      ? [{ key: 'cuenta', title: t('nav.sections.cuenta'), icon: FaUserCircle, items: menuItems.cuenta }]
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

    const onItemClick = (item) => {
      item.onClick?.();
      closeMobileNav();
    };

    if (menuCollapsed) {
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
                  to={destinoMenu(item.path)}
                  onClick={() => {
                    onItemClick(item);
                    setExpandedSection(null);
                  }}
                  className={`flex min-h-[44px] items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
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
            to={destinoMenu(items[0].path)}
            onClick={() => onItemClick(items[0])}
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold tracking-wide transition-all ${
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
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold tracking-wide transition-all ${
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
                    to={destinoMenu(item.path)}
                    onClick={() => onItemClick(item)}
                    className={`flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
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

  // Sesión externa (enlace de subtarea): sin menú de la plataforma, solo el
  // formulario asignado y un enlace para volver a su tarea.
  if (rolNorm === 'externo') {
    const volverUrl = localStorage.getItem('subtareaExternaReturn') || '';
    return (
      <div className={`min-h-screen ${mainBg}`}>
        <header className={`flex items-center justify-between border-b px-4 py-3 ${topBarBg}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Grupo Proser
            </p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Formulario asignado · {usuarioActual.nombre || 'Externo'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {volverUrl && (
              <Link
                to={volverUrl}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Volver a mi tarea
              </Link>
            )}
            <LogoutButton variant="compact" label="Salir" />
          </div>
        </header>
        <main className="p-4">
          <ArnaldBorradoresPendientesModal />
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div
      className={`flex ${contenidoExpandido ? 'h-screen min-h-0 overflow-hidden' : 'min-h-screen'} ${mainBg}`}
    >
      {/* Backdrop drawer móvil */}
      {isMobileShell && mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[45] bg-black/50 lg:hidden"
          aria-label={t('nav.closeMenu')}
          onClick={closeMobileNav}
        />
      )}

      {/* Sidebar: drawer off-canvas < lg; fijo en flujo lg+ */}
      <aside
        className={`flex flex-col border-r border-gray-800 bg-[#141414] text-white transition-transform duration-300 lg:transition-[width] ${
          isMobileShell
            ? `fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] ${
                mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : `relative shrink-0 ${menuCollapsed ? 'w-[72px]' : 'w-64 lg:w-72'}`
        }`}
      >
        {/* Logo */}
        <div className={`border-b border-gray-800 px-3 py-4 ${menuCollapsed ? 'flex justify-center' : ''}`}>
          {menuCollapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm transition hover:bg-gray-100"
              title={t('nav.expandMenu')}
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
                <span className="text-sm font-medium text-gray-400">{t('layout.controlPanel')}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-800 hover:text-white"
                    title={theme === 'dark' ? t('layout.lightMode') : t('layout.darkMode')}
                  >
                    {theme === 'dark' ? <FaSun className="text-sm" /> : <FaMoon className="text-sm" />}
                  </button>
                  {isMobileShell ? (
                    <button
                      type="button"
                      onClick={closeMobileNav}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-800 hover:text-white"
                      title={t('nav.closeMenu')}
                      aria-label={t('nav.closeMenu')}
                    >
                      <FaChevronLeft className="text-xs" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarCollapsed(true);
                        setExpandedSection(null);
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-800 hover:text-white"
                      title={t('layout.collapseMenu')}
                    >
                      <FaChevronLeft className="text-xs" />
                    </button>
                  )}
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
          {!menuCollapsed && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/80 px-3 py-2 text-[11px] text-gray-500">
              <FaShieldAlt className="shrink-0 text-fenix-primario" />
              <span className="leading-tight">
                ARNALD Data Flow
                <span className="block font-mono text-gray-400">V 2.5.0</span>
              </span>
            </div>
          )}
          <SessionTimerSidebar compact={menuCollapsed} />
          {!menuCollapsed && <LogoutButton variant="sidebar" />}
          {menuCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="flex w-full justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              title={t('nav.expand')}
            >
              <FaChevronRight className="text-sm" />
            </button>
          )}
        </div>
      </aside>

      {/* Área principal */}
      <div className={`flex min-w-0 flex-1 flex-col ${contenidoExpandido ? 'min-h-0' : ''}`}>
        {/* Top bar — estilo dashboard */}
        <header
          className={`sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b px-3 shadow-sm sm:gap-3 sm:px-6 ${topBarBg}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-fenix-primario dark:hover:bg-gray-800"
              onClick={handleNavToggle}
              aria-label={t('nav.sideMenu')}
              aria-expanded={isMobileShell ? mobileNavOpen : !sidebarCollapsed}
            >
              <FaBars className="text-lg" />
            </button>
            <h1 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100 lg:hidden">
              {routeTitles[location.pathname] ||
                Object.entries(routeTitles)
                  .filter(
                    ([route]) =>
                      route !== '/inicio' && location.pathname.startsWith(route)
                  )
                  .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ||
                'ARNALD'}
            </h1>
          </div>

          <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-2">
            <div className="hidden md:block">
              <LanguageSelector compact />
            </div>
            {!esContractor && (
            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 sm:flex"
              title={t('layout.searchTasks')}
              aria-label={t('layout.searchTasks')}
              onClick={() => navigate('/inicio', { state: { focusBuscadorTareas: true } })}
            >
              <FaSearch className="text-lg" />
            </button>
            )}

            {!accesoRestringido && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/complex/mis-subtareas')}
                  className="relative flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-fenix-primario dark:hover:bg-gray-800"
                  title={t('nav.myComplexTasks')}
                >
                  <FaTasks className="text-lg" />
                  {contadorSubtareas > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                      {contadorSubtareas > 99 ? '99+' : contadorSubtareas}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      esAdminOSoporte
                        ? '/complex/alertas'
                        : '/complex/mis-alertas'
                    )
                  }
                  className="relative flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-fenix-primario dark:hover:bg-gray-800"
                  title={esAdminOSoporte ? t('nav.alertSystem') : t('nav.myAlerts')}
                >
                  <FaBell className="text-lg" />
                  {contadorAlertas > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-fenix-primario px-1 text-[10px] font-bold text-white ring-2 ring-white">
                      {contadorAlertas > 99 ? '99+' : contadorAlertas}
                    </span>
                  )}
                </button>
              </>
            )}

            {!esContractor && (
            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 md:flex"
              title={t('layout.openHelp')}
              aria-label={t('layout.openHelp')}
              onClick={() => navigate('/ayuda')}
            >
              <FaQuestionCircle className="text-lg" />
            </button>
            )}

            <div className="relative ml-1 border-l border-gray-200 pl-2 dark:border-gray-700 sm:ml-2 sm:pl-3">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex min-h-[44px] items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 sm:gap-3 sm:pr-3"
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
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {formatNombreCorto(usuarioActual.nombre, usuarioActual.login)}
                  </p>
                  <p className="text-xs text-gray-500">{formatRol(usuarioActual.rol, t)}</p>
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
                    aria-label={t('nav.closeMenu')}
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-100 px-2 py-1 md:hidden dark:border-gray-800">
                      <LanguageSelector compact />
                    </div>
                    {!esContractor && (
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 sm:hidden"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/inicio', { state: { focusBuscadorTareas: true } });
                      }}
                    >
                      {t('layout.searchTasks')}
                    </button>
                    )}
                    {!esContractor && (
                    <Link
                      to="/ayuda"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 md:hidden"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {t('layout.openHelp')}
                    </Link>
                    )}
                    <Link
                      to="/micuenta"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {t('common.myAccount')}
                    </Link>
                    {!esContractor && (
                    <Link
                      to="/cuenta"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {t('common.settings')}
                    </Link>
                    )}
                    {puedeCatalogosExpress && !esAdminOSoporte && !esContractor && (
                      <Link
                        to="/admin/catalogos-express"
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t('nav.expressCatalogs')}
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
            contenidoExpandido ? 'overflow-hidden p-0' : 'overflow-auto'
          }`}
        >
          <Aviso2FAPrompt />
          <ArnaldBorradoresPendientesModal />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
