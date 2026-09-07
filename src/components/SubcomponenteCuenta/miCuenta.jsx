// src/components/SubcomponenteCuenta/miCuenta.jsx

import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { obtenerPerfil, actualizarFoto } from "../../services/userService";
import { resolverUrlArchivo } from '../../services/storageSignedUrl.js';
import { useTheme } from '../../context/ThemeContext';
import RecortarFotoPerfilModal from './RecortarFotoPerfilModal.jsx';
import Configurar2FA from './Configurar2FA.jsx';
import { formatNumber, getAppLocale } from '../../utils/locale.js';

// Estados con soporte para modo oscuro local
const getEstadoClasses = (estado, isDark) => {
const estados = {
    Conectado: isDark ? "bg-green-600 text-white" : "bg-green-500 text-white",
    Desconectado: isDark ? "bg-gray-500 text-white" : "bg-gray-400 text-white",
    "En reposo": isDark ? "bg-yellow-500 text-white" : "bg-yellow-400 text-black",
    "No molestar": isDark ? "bg-red-600 text-white" : "bg-red-500 text-white",
  };
  return estados[estado] || estados.Conectado;
};
const opcionesEstado = [
  { value: 'Conectado', labelKey: 'account.ui.cuenta.status.connected' },
  { value: 'Desconectado', labelKey: 'account.ui.cuenta.status.disconnected' },
  { value: 'En reposo', labelKey: 'account.ui.cuenta.status.idle' },
  { value: 'No molestar', labelKey: 'account.ui.cuenta.status.dnd' },
];

// Lista de usuarios autorizados para ver información completa
// TODO: Agregar los otros 2 usuarios autorizados aquí
const USUARIOS_AUTORIZADOS = [
  '1065012991', // Usuario principal
  // Agregar aquí los otros 2 usuarios autorizados
  // Ejemplo: '1234567890', '0987654321'
];

// Función helper para formatear fechas evitando problemas de zona horaria
const formatearFechaParaMostrar = (fecha, locale = 'es-ES') => {
  if (!fecha) return "";
  try {
    // Si es un string ISO, extraer directamente la fecha antes de crear Date
    // Esto evita problemas de zona horaria
    if (typeof fecha === 'string') {
      // Buscar patrón YYYY-MM-DD en cualquier parte del string
      const match = fecha.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        // Validar que sea una fecha válida
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          // Crear fecha en hora local usando los componentes extraídos
          const fechaLocal = new Date(year, month - 1, day);
          return fechaLocal.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
    }
    
    // Si es un objeto Date, usar métodos UTC para preservar el día original
    if (fecha instanceof Date) {
      const year = fecha.getUTCFullYear();
      const month = fecha.getUTCMonth();
      const day = fecha.getUTCDate();
      const fechaLocal = new Date(year, month, day);
      return fechaLocal.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Como último recurso, intentar crear Date y usar UTC
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return "";
    
    // Usar métodos UTC para preservar el día sin cambios de zona horaria
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const fechaLocal = new Date(year, month, day);
    
    return fechaLocal.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    console.error('Error formateando fecha:', fecha, e);
    return "";
  }
};

export default function MiCuenta() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("Conectado");
  const [fotoPreview, setFotoPreview] = useState("");
  const [fotoError, setFotoError] = useState(false);
  const [, setFotoLoaded] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  
  const isDark = theme === 'dark';
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'es-ES';

  const renderEvaluacion = (evaluacion) => {
    if (evaluacion === true) return t('account.ui.cuenta.evaluation.aprobado');
    if (evaluacion === false) return t('account.ui.cuenta.evaluation.pendiente');
    if (evaluacion === 'Aprobado') return t('account.ui.cuenta.evaluation.aprobado');
    if (evaluacion === 'Pendiente') return t('account.ui.cuenta.evaluation.pendiente');
    if (evaluacion === 'No Aprobado') return t('account.ui.cuenta.evaluation.noAprobado');
    return evaluacion;
  };

  const getStatusHint = (estadoActual) => {
    if (estadoActual === 'Conectado') return t('account.ui.cuenta.statusHint.online');
    if (estadoActual === 'Desconectado') return t('account.ui.cuenta.statusHint.offline');
    if (estadoActual === 'En reposo') return t('account.ui.cuenta.statusHint.away');
    if (estadoActual === 'No molestar') return t('account.ui.cuenta.statusHint.unavailable');
    return '';
  };
  
  // Verificar si el usuario actual está autorizado (se establece cuando se carga el perfil)
  const usuarioAutorizado = usuario?.esAutorizado ?? false;

  // Función para obtener la URL de la foto (sync fallback placeholder; remotas vía state/StorageLazyImage)
  const [fotoUrlFirmada, setFotoUrlFirmada] = useState('/img/placeholder.png');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!usuario?.foto) {
        if (!cancelado) setFotoUrlFirmada('/img/placeholder.png');
        return;
      }
      const url = (await resolverUrlArchivo(usuario.foto)) || '/img/placeholder.png';
      if (!cancelado) setFotoUrlFirmada(url);
    })();
    return () => {
      cancelado = true;
    };
  }, [usuario?.foto]);

  const obtenerUrlFoto = () => fotoUrlFirmada || '/img/placeholder.png';

  // Función para manejar errores de carga de imagen
  const handleImageError = () => {
setFotoError(true);
    setFotoLoaded(false);
  };

  // Función para manejar carga exitosa de imagen
  const handleImageLoad = () => {
setFotoError(false);
    setFotoLoaded(true);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const tipoUsuario = localStorage.getItem("tipoUsuario") || "normal";
obtenerPerfil(token, tipoUsuario)
      .then(({ data }) => {
// Log específico para la foto
// Log de los nuevos campos
// Verificar si el usuario actual está autorizado
        const loginActual = localStorage.getItem('login') || data.login;
        const cedulaActual = data.cedula || localStorage.getItem('cedula');
        const autorizado = (loginActual && USUARIOS_AUTORIZADOS.includes(loginActual)) || 
                          (cedulaActual && USUARIOS_AUTORIZADOS.includes(cedulaActual));
        
        // Guardar en el estado del componente para usar en el render
        setUsuario({ ...data, esAutorizado: autorizado });
      })
      .catch((err) => {
        console.error("❌ Error cargando perfil:", err);
        console.error("❌ Error response:", err.response?.data);
        console.error("❌ Error status:", err.response?.status);
        console.error("❌ Error message:", err.message);
        console.error("❌ Headers enviados:", err.config?.headers);
        console.error("❌ URL llamada:", err.config?.url);
        
        if (err.response?.status === 401) {
localStorage.clear();
          navigate("/login");
        } else {
          // Si hay error, mostrar datos del localStorage como respaldo
const datosRespaldo = {
            name: localStorage.getItem("nombre"),
            login: localStorage.getItem("login"),
            role: localStorage.getItem("rol"),
            email: localStorage.getItem("login") + "@proserpuertos.com.co", // Asumir dominio corporativo
            active: "Y"
          };
setUsuario(datosRespaldo);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFotoError(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropImageSrc(ev.target.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAjustarFotoActual = () => {
    if (!usuario?.foto) return;
    setCropImageSrc(obtenerUrlFoto());
    setCropModalOpen(true);
  };

  const handleCerrarRecorte = () => {
    if (subiendoFoto) return;
    setCropModalOpen(false);
    setCropImageSrc("");
  };

  const handleConfirmarRecorte = async (blob) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setSubiendoFoto(true);
    const previewUrl = URL.createObjectURL(blob);
    setFotoPreview(previewUrl);

    const formData = new FormData();
    formData.append("foto", blob, "perfil.jpg");

    try {
      const { data } = await actualizarFoto(formData, token);
      setUsuario((u) => ({ ...u, foto: data.fotoPerfil }));
      setFotoPreview("");
      setFotoError(false);
      setFotoLoaded(true);
      setCropModalOpen(false);
      setCropImageSrc("");
    } catch (err) {
      console.error("❌ Error subiendo foto:", err);
      setFotoPreview("");
      setFotoError(true);
      setFotoLoaded(false);
    } finally {
      URL.revokeObjectURL(previewUrl);
      setSubiendoFoto(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-16">
        <p className={isDark ? "text-gray-300" : "text-gray-700"}>{t('account.ui.cuenta.miCuenta.loading')}</p>
      </div>
    );
  }

  if (!usuario) {
    return null;
  }

  return (
    <div className={`max-w-6xl w-full mx-auto rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 mt-4 sm:mt-6 lg:mt-8 border transition-colors ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Sucursal - Banner compacto (más elegante y menos invasivo) */}
      {usuario.sucursal && (
        <div className="mb-5">
          <div
            className={`flex items-center justify-center sm:justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl border transition-all ${
              isDark
                ? 'bg-gradient-to-r from-blue-950/60 via-indigo-950/60 to-slate-950/40 border-blue-800/60 shadow-[0_10px_30px_-18px_rgba(59,130,246,0.6)]'
                : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-blue-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isDark ? 'bg-blue-900/50 border border-blue-800/60' : 'bg-blue-100 border border-blue-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke={isDark ? '#93c5fd' : '#1d4ed8'} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              <div className="text-center sm:text-left">
                <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] ${
                  isDark ? 'text-blue-200/70' : 'text-blue-700/70'
                }`}>
                  {t('account.ui.cuenta.fields.sucursal')}
                </div>
                <div className={`text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight ${
                  isDark ? 'text-blue-100' : 'text-blue-900'
                }`}>
                  {usuario.sucursal}
                </div>
              </div>
            </div>

            {/* Slot derecho opcional (por ahora lo dejamos solo como separador visual en desktop) */}
            <div className={`hidden sm:block text-xs font-medium ${
              isDark ? 'text-blue-200/60' : 'text-blue-700/60'
            }`}>
              {/* */}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Foto de perfil - Lado izquierdo, mejorada y más elegante */}
        <div className="flex flex-shrink-0 flex-col items-center gap-3 self-start">
          <div className="relative group">
            <div className={`relative ${isDark ? 'ring-4 ring-blue-600/50' : 'ring-4 ring-blue-200/50'} rounded-full p-1 transition-all duration-300 group-hover:ring-blue-500 group-hover:scale-105`}>
          {/* Mostrar foto de perfil o placeholder */}
          {fotoPreview ? (
            // Preview de la foto que se está subiendo
            <img
              src={fotoPreview}
              alt={t('account.ui.cuenta.miCuenta.altPreview')}
                className="w-40 h-40 sm:w-48 sm:h-48 lg:w-64 lg:h-64 xl:w-80 xl:h-80 rounded-full object-cover shadow-2xl"
            />
          ) : usuario.foto && !fotoError ? (
            // Foto del usuario desde la base de datos
            <img
              src={obtenerUrlFoto()}
              alt={t('account.ui.cuenta.miCuenta.altProfile')}
                className="w-40 h-40 sm:w-48 sm:h-48 lg:w-64 lg:h-64 xl:w-80 xl:h-80 rounded-full object-cover shadow-2xl transition-transform duration-300 group-hover:scale-105"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          ) : (
            // Placeholder cuando no hay foto o hay error
              <div className={`w-40 h-40 sm:w-48 sm:h-48 lg:w-64 lg:h-64 xl:w-80 xl:h-80 rounded-full ${isDark ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900' : 'bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-100'} flex items-center justify-center shadow-2xl`}>
              <div className="text-center">
                  <div className={`text-5xl sm:text-6xl lg:text-7xl xl:text-8xl mb-2 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>👤</div>
                  <div className={`text-xs sm:text-sm font-medium ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>{t('account.ui.cuenta.miCuenta.noPhoto')}</div>
                </div>
              </div>
            )}
            </div>

            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 lg:top-4 lg:right-4 xl:top-5 xl:right-5 z-10">
            <div className={`relative w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 ${getEstadoClasses(estado, isDark).includes('green') ? 'bg-green-500' : getEstadoClasses(estado, isDark).includes('yellow') ? 'bg-yellow-500' : getEstadoClasses(estado, isDark).includes('red') ? 'bg-red-500' : 'bg-gray-500'} rounded-full border-3 ${isDark ? 'border-gray-800' : 'border-white'} shadow-xl flex items-center justify-center`}>
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 xl:w-4.5 xl:h-4.5 bg-white rounded-full animate-pulse"></div>
              {estado === 'Conectado' && (
                <div className={`absolute inset-0 ${getEstadoClasses(estado, isDark).includes('green') ? 'bg-green-500' : 'bg-green-500'} rounded-full animate-ping opacity-75`}></div>
              )}
            </div>
          </div>
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFotoChange}
          />

          <div className="flex w-40 sm:w-48 lg:w-64 xl:w-80 flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-blue-900/40 text-blue-200 hover:bg-blue-900/60 border border-blue-800'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              {t('account.ui.cuenta.miCuenta.changePhoto')}
            </button>
            {usuario.foto && !fotoError && (
              <button
                type="button"
                onClick={handleAjustarFotoActual}
                className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {t('account.ui.cuenta.miCuenta.adjustCurrentPhoto')}
              </button>
            )}
          </div>
        </div>

        {/* Contenido principal - Lado derecho */}
        <div className="flex-1 w-full">
          {/* Nombre y estado mejorados */}
          <div className="mb-6">
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-800'} leading-tight`}>
            {usuario.name || usuario.nombre || t('account.ui.cuenta.miCuenta.userFallback')} {usuario.apellido || ''}
          </h2>
            
            {/* Selector de estado mejorado con iconos */}
            <div className="relative inline-block">
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
                className={`appearance-none w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 pr-10 sm:pr-12 rounded-full text-sm sm:text-base font-semibold outline-none transition-all duration-200 ${getEstadoClasses(estado, isDark)} ${isDark ? 'shadow-lg hover:shadow-xl' : 'shadow-md hover:shadow-lg'} cursor-pointer hover:scale-105 active:scale-95`}
          >
            {opcionesEstado.map((op) => (
              <option key={op.value} value={op.value}>
                {t(op.labelKey)}
              </option>
            ))}
          </select>
              {/* Icono de flecha personalizado */}
              <div className={`absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
        </div>
      </div>

            {/* Indicador visual del estado actual */}
            <div className="mt-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getEstadoClasses(estado, isDark).includes('green') ? 'bg-green-500' : getEstadoClasses(estado, isDark).includes('yellow') ? 'bg-yellow-500' : getEstadoClasses(estado, isDark).includes('red') ? 'bg-red-500' : 'bg-gray-500'} ${estado === 'Conectado' ? 'animate-pulse' : ''}`}></div>
              <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {getStatusHint(estado)}
              </span>
            </div>
          </div>

          {/* Información personal responsive - Diseño Híbrido Mejorado */}
          <div className={`space-y-4 sm:space-y-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {/* Información Personal */}
            <div className={`${isDark ? 'bg-blue-900/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'} p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${isDark ? 'hover:shadow-blue-900/20' : 'hover:shadow-blue-200/50'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-blue-800/50' : 'bg-blue-100'}`}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke={isDark ? '#93c5fd' : '#1e40af'} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>{t('account.ui.cuenta.sections.personal')}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {usuario.nombre || usuario.name ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#60a5fa' : '#2563eb'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{t('account.ui.cuenta.fields.nombre')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.nombre || usuario.name}</div>
                    </div>
                  </div>
                ) : null}
                
                {usuario.cedula ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#60a5fa' : '#2563eb'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{t('account.ui.cuenta.fields.cedula')}</div>
                      <span className={`inline-block px-3 py-1 rounded-lg font-mono text-sm font-semibold ${isDark ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-800'}`}>{usuario.cedula}</span>
                    </div>
            </div>
          ) : null}
          
                {usuario.fechaNacimiento ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#60a5fa' : '#2563eb'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{t('account.ui.cuenta.fields.fechaNacimiento')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        {formatearFechaParaMostrar(usuario.fechaNacimiento, dateLocale)}
                      </div>
                    </div>
            </div>
          ) : null}
          
                {usuario.tipoSangre ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#f87171' : '#dc2626'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{t('account.ui.cuenta.fields.tipoSangre')}</div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${isDark ? 'bg-red-900/50 text-red-200 border border-red-700' : 'bg-red-100 text-red-800 border border-red-300'}`}>{usuario.tipoSangre}</span>
                    </div>
            </div>
          ) : null}
          
                {usuario.direccion ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors sm:col-span-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#60a5fa' : '#2563eb'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{t('account.ui.cuenta.fields.direccion')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.direccion}</div>
                    </div>
            </div>
          ) : null}
        </div>
            </div>
            
            {/* Información de Contacto */}
            <div className={`${isDark ? 'bg-indigo-900/30 border-indigo-800/50' : 'bg-indigo-50 border-indigo-200'} p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${isDark ? 'hover:shadow-indigo-900/20' : 'hover:shadow-indigo-200/50'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-indigo-800/50' : 'bg-indigo-100'}`}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke={isDark ? '#a78bfa' : '#6366f1'} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>{t('account.ui.cuenta.sections.contacto')}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {usuario.telefonoFijo ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#a78bfa' : '#6366f1'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{t('account.ui.cuenta.fields.telefonoFijo')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.telefonoFijo}</div>
                    </div>
            </div>
          ) : null}
          
                {usuario.celular || usuario.celulares ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#a78bfa' : '#6366f1'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{t('account.ui.cuenta.fields.celulares')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.celulares || usuario.celular}</div>
                    </div>
            </div>
          ) : null}
          
                {(usuario.correo || usuario.email || usuario.correosElectronicos) && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors sm:col-span-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#a78bfa' : '#6366f1'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{t('account.ui.cuenta.fields.correosElectronicos')}</div>
                      <a href={`mailto:${usuario.correosElectronicos || usuario.correo || usuario.email}`} className={`text-sm sm:text-base font-medium break-all hover:underline ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                        {usuario.correosElectronicos || usuario.correo || usuario.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Seguridad: verificación en dos pasos con app de autenticación */}
            <Configurar2FA isDark={isDark} />
            
            {/* Información Laboral - Solo para usuarios autorizados */}
            {usuarioAutorizado && (
            <div className={`${isDark ? 'bg-green-900/30 border-green-800/50' : 'bg-green-50 border-green-200'} p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${isDark ? 'hover:shadow-green-900/20' : 'hover:shadow-green-200/50'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-green-800/50' : 'bg-green-100'}`}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke={isDark ? '#86efac' : '#16a34a'} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-green-300' : 'text-green-800'}`}>{t('account.ui.cuenta.sections.laboral')}</h3>
        </div>
        
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {usuario.empresa ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#86efac' : '#16a34a'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{t('account.ui.cuenta.fields.empresa')}</div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${isDark ? 'bg-green-800/50 text-green-200' : 'bg-green-100 text-green-800'}`}>{usuario.empresa}</span>
                    </div>
                  </div>
                ) : null}
                
                {usuario.fechaIngreso ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#86efac' : '#16a34a'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{t('account.ui.cuenta.fields.fechaIngreso')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        {formatearFechaParaMostrar(usuario.fechaIngreso, dateLocale)}
                      </div>
                    </div>
                  </div>
                ) : null}
                
                {usuario.cargos ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#86efac' : '#16a34a'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{t('account.ui.cuenta.fields.cargos')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.cargos}</div>
                    </div>
            </div>
          ) : null}
          
                {usuario.salario ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#86efac' : '#16a34a'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{t('account.ui.cuenta.fields.salario')}</div>
                      <span className={`inline-block px-3 py-1 rounded-lg font-mono text-sm font-bold ${isDark ? 'bg-green-800/50 text-green-200' : 'bg-green-100 text-green-800'}`}>
                        ${formatNumber(usuario.salario, getAppLocale()) || usuario.salario}
              </span>
                    </div>
                  </div>
                ) : null}
                
                {usuario.fechaModificacionSueldo ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors sm:col-span-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#86efac' : '#16a34a'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{t('account.ui.cuenta.fields.fechaModificacionSueldo')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        {formatearFechaParaMostrar(usuario.fechaModificacionSueldo, dateLocale)}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            )}
            
            {/* Información Contractual - Solo para usuarios autorizados */}
            {usuarioAutorizado && (
            <div className={`${isDark ? 'bg-orange-900/30 border-orange-800/50' : 'bg-orange-50 border-orange-200'} p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${isDark ? 'hover:shadow-orange-900/20' : 'hover:shadow-orange-200/50'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-orange-800/50' : 'bg-orange-100'}`}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke={isDark ? '#fdba74' : '#ea580c'} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>{t('account.ui.cuenta.sections.contractual')}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {usuario.tipoContrato ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#fdba74' : '#ea580c'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{t('account.ui.cuenta.fields.tipoContrato')}</div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${isDark ? 'bg-orange-800/50 text-orange-200' : 'bg-orange-100 text-orange-800'}`}>
                        {usuario.tipoContrato}
                      </span>
                    </div>
                  </div>
                ) : null}
                
                {usuario.fechaModificacionContrato ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={isDark ? '#fdba74' : '#ea580c'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{t('account.ui.cuenta.fields.fechaModificacionContrato')}</div>
                      <div className={`text-sm sm:text-base font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        {formatearFechaParaMostrar(usuario.fechaModificacionContrato, dateLocale)}
                      </div>
                    </div>
            </div>
          ) : null}
          
                {usuario.vencimiento ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors sm:col-span-2">
                    <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${new Date(usuario.vencimiento) < new Date() ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-orange-400' : 'text-orange-600')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${new Date(usuario.vencimiento) < new Date() ? (isDark ? 'text-red-400' : 'text-red-600') : (isDark ? 'text-orange-400' : 'text-orange-600')}`}>{t('account.ui.cuenta.fields.vencimiento')}</div>
                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${
                        new Date(usuario.vencimiento) < new Date()
                          ? (isDark ? 'bg-red-900/50 text-red-200 border border-red-700' : 'bg-red-100 text-red-800 border border-red-300')
                          : (isDark ? 'bg-orange-800/50 text-orange-200' : 'bg-orange-100 text-orange-800')
                      }`}>
                        {formatearFechaParaMostrar(usuario.vencimiento, dateLocale)}
              </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            )}
            
            {/* Información Adicional - Solo para usuarios autorizados */}
            {usuarioAutorizado && (
            <div className={`${isDark ? 'bg-purple-900/30 border-purple-800/50' : 'bg-purple-50 border-purple-200'} p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${isDark ? 'hover:shadow-purple-900/20' : 'hover:shadow-purple-200/50'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-purple-800/50' : 'bg-purple-100'}`}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke={isDark ? '#c084fc' : '#9333ea'} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>{t('account.ui.cuenta.sections.adicional')}</h3>
              </div>
              
              {/* APORTES - Sección con subcampos mejorada */}
              {(usuario.aportesSalud || usuario.aportesPension || usuario.aportesCesantias || usuario.aportesARL || usuario.aportesCCF || 
                usuario.aportes?.salud || usuario.aportes?.pension || usuario.aportes?.cesantias || usuario.aportes?.arl || usuario.aportes?.ccf) ? (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke={isDark ? '#c084fc' : '#9333ea'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <h4 className={`text-base font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{t('account.ui.cuenta.sections.aportes')}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {(usuario.aportesSalud || usuario.aportes?.salud) && (
                      <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{t('account.ui.cuenta.aportes.salud')}</div>
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.aportesSalud || usuario.aportes?.salud}</div>
                      </div>
                    )}
                    {(usuario.aportesPension || usuario.aportes?.pension) && (
                      <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{t('account.ui.cuenta.aportes.pension')}</div>
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.aportesPension || usuario.aportes?.pension}</div>
                      </div>
                    )}
                    {(usuario.aportesCesantias || usuario.aportes?.cesantias) && (
                      <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{t('account.ui.cuenta.aportes.cesantias')}</div>
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.aportesCesantias || usuario.aportes?.cesantias}</div>
                      </div>
                    )}
                    {(usuario.aportesARL || usuario.aportes?.arl) && (
                      <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{t('account.ui.cuenta.aportes.arl')}</div>
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.aportesARL || usuario.aportes?.arl}</div>
                      </div>
                    )}
                    {(usuario.aportesCCF || usuario.aportes?.ccf) && (
                      <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{t('account.ui.cuenta.aportes.ccf')}</div>
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{usuario.aportesCCF || usuario.aportes?.ccf}</div>
                      </div>
                    )}
                  </div>
            </div>
          ) : null}
          
              {usuario.evaluacionPeriodoPrueba !== undefined && usuario.evaluacionPeriodoPrueba !== null ? (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    usuario.evaluacionPeriodoPrueba === 'Aprobado' || usuario.evaluacionPeriodoPrueba === true
                      ? (isDark ? 'text-green-400' : 'text-green-600')
                      : (isDark ? 'text-yellow-400' : 'text-yellow-600')
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{t('account.ui.cuenta.fields.evaluacionPeriodoPrueba')}</div>
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${
                      usuario.evaluacionPeriodoPrueba === 'Aprobado' || usuario.evaluacionPeriodoPrueba === true
                        ? (isDark ? 'bg-green-800/50 text-green-200 border border-green-700' : 'bg-green-100 text-green-800 border border-green-300')
                        : usuario.evaluacionPeriodoPrueba === 'Pendiente' || usuario.evaluacionPeriodoPrueba === false
                        ? (isDark ? 'bg-yellow-800/50 text-yellow-200 border border-yellow-700' : 'bg-yellow-100 text-yellow-800 border border-yellow-300')
                        : usuario.evaluacionPeriodoPrueba === 'No Aprobado'
                        ? (isDark ? 'bg-red-800/50 text-red-200 border border-red-700' : 'bg-red-100 text-red-800 border border-red-300')
                        : (isDark ? 'bg-purple-800/50 text-purple-200 border border-purple-700' : 'bg-purple-100 text-purple-800 border border-purple-300')
                    }`}>
                      {renderEvaluacion(usuario.evaluacionPeriodoPrueba)}
            </span>
                  </div>
                </div>
              ) : null}
            </div>
            )}
          </div>
        </div>
      </div>

      <RecortarFotoPerfilModal
        open={cropModalOpen}
        imageSrc={cropImageSrc}
        isDark={isDark}
        subiendo={subiendoFoto}
        onClose={handleCerrarRecorte}
        onConfirm={handleConfirmarRecorte}
      />
    </div>
  );
}
