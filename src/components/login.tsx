import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';
import { useTheme } from '../context/ThemeContext';
// @ts-ignore
import arnaldLogo from '../config/brandAssets.js';
import { FaUser, FaLock, FaKey, FaShieldAlt, FaMoon, FaSun } from 'react-icons/fa';
import LanguageSelector from './LanguageSelector';
// @ts-ignore
import i18n from '../i18n.js';
import { normalizeLocale } from '../context/LanguageContext';

async function applyUserLocale(locale?: string) {
  if (!locale) return;
  const normalized = normalizeLocale(locale);
  localStorage.setItem('appLocale', normalized);
  await i18n.changeLanguage(normalized);
  document.documentElement.lang = normalized;
}

export default function Login() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [login, setLogin] = useState('');
  const [pswd, setPswd] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: login, 2: código 2FA
  const [twoFACode, setTwoFACode] = useState('');
  const [infoCorreo, setInfoCorreo] = useState('');
  const [twoFAMethod, setTwoFAMethod] = useState(''); // 'totp' (app autenticación) o '' (correo)
  const [tempToken, setTempToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Colores según el tema
  const bgMain = theme === 'dark' ? '#0F172A' : '#F8FAFC';
  const cardBg = theme === 'dark' ? '#1E293B' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F1F5F9' : '#1E293B';
  const textSecondary = theme === 'dark' ? '#94A3B8' : '#64748B';
  const inputBg = theme === 'dark' ? '#0F172A' : '#FFFFFF';
  const borderColor = theme === 'dark' ? '#334155' : '#E2E8F0';
  
  // Animación del logo
  const [logoScale, setLogoScale] = useState(1);
  
  useEffect(() => {
    // Establecer título de la página
    document.title = `Arnald DataFlow - ${t('auth.pageTitle')}`;
    
    const interval = setInterval(() => {
      setLogoScale(prev => prev === 1 ? 1.05 : 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [t]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const requestData = { correo: login, password: pswd };
const res = await axios.post(`${BASE_URL}/api/secur-auth/login`, requestData, {
  headers: { 'Accept-Language': localStorage.getItem('appLocale') || 'es' }
});
if (res.data.token && res.data.usuario) {
         // Login exitoso - guardar datos y redirigir
         const currentTime = Date.now();
         localStorage.setItem('token', res.data.token);
         localStorage.setItem('tipoUsuario', 'secur');
         localStorage.setItem('rol', res.data.usuario.role);
         localStorage.setItem('login', res.data.usuario.login);
         localStorage.setItem('nombre', res.data.usuario.name);
         await applyUserLocale(res.data.usuario.locale);
         localStorage.setItem('sessionStartTime', currentTime.toString()); // Guardar timestamp de inicio de sesión
         if (res.data.twoFASetupRecommended || res.data.twoFASetupPending) {
           sessionStorage.setItem('aviso2fa_mostrar', '1');
           sessionStorage.removeItem('aviso2fa_modal_cerrado');
         }
navigate('/inicio');
       } else if (res.data.twoFARequired) {
setStep(2);
         setTwoFAMethod(res.data.method || '');
         setTempToken(res.data.tempToken || '');
         setInfoCorreo(res.data.email || '');
         setTwoFACode('');
} else {
         setError(t('auth.unexpectedResponse'));
       }
    } catch (err: any) {
      console.error('❌ Error completo:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error data:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      const errorMessage = err.response?.data?.message || err.response?.data?.mensaje || t('auth.invalidCredentials');
      console.error('❌ Mensaje de error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FA = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
const res = await axios.post(`${BASE_URL}/api/secur-auth/login/2fa`, {
        correo: login,
        code: twoFACode,
        tempToken
      }, { headers: { 'Accept-Language': localStorage.getItem('appLocale') || 'es' } });
      
if (res.data.token && res.data.usuario && res.data.usuario.role) {
        const currentTime = Date.now();
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('tipoUsuario', 'secur');
        localStorage.setItem('rol', res.data.usuario.role);
        localStorage.setItem('login', res.data.usuario.login);
        localStorage.setItem('nombre', res.data.usuario.name);
        await applyUserLocale(res.data.usuario.locale);
        localStorage.setItem('sessionStartTime', currentTime.toString()); // Guardar timestamp de inicio de sesión
        localStorage.setItem('sessionStart', currentTime.toString());
        
navigate('/inicio');
      } else {
        setError(t('auth.incompleteResponse'));
        console.error('❌ Respuesta incompleta:', res.data);
      }
    } catch (err: any) {
      console.error('❌ Error en 2FA:', err.response?.data);
      setError(err.response?.data?.message || t('auth.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-2 sm:px-4 relative overflow-hidden"
      style={{
        background: theme === 'dark' 
          ? 'linear-gradient(135deg, #1A0000 0%, #3D0000 50%, #5C0000 100%)'
          : '#FFFFFF'
      }}
    >
      {/* Controles superiores: idioma y tema, sin solaparse */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2 sm:top-6 sm:right-6 sm:gap-3">
        <div
          className="rounded-full bg-white/90 px-2 py-1 shadow-md backdrop-blur-md"
          style={{ border: `1px solid ${borderColor}` }}
        >
          <LanguageSelector compact />
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 sm:p-3 rounded-full backdrop-blur-lg transition-all transform hover:scale-110 active:scale-95 shadow-xl"
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)'
              : 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(153, 27, 27, 0.9) 100%)',
            border: theme === 'dark'
              ? '2px solid rgba(239, 68, 68, 0.5)'
              : '2px solid rgba(220, 38, 38, 0.3)',
          }}
          title={theme === 'dark' ? t('auth.switchToLightMode') : t('auth.switchToDarkMode')}
        >
          {theme === 'dark' ? (
            <FaSun className="text-lg sm:text-xl text-yellow-300" />
          ) : (
            <FaMoon className="text-lg sm:text-xl text-white" />
          )}
        </button>
      </div>

      {/* Círculos decorativos de fondo con animación */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute rounded-full blur-3xl opacity-30 animate-pulse"
          style={{
            width: '600px',
            height: '600px',
            top: '-15%',
            left: '-15%',
            background: theme === 'dark' 
              ? 'radial-gradient(circle, #EF4444 0%, #DC2626 50%, transparent 100%)'
              : 'radial-gradient(circle, rgba(229, 231, 235, 0.5) 0%, rgba(243, 244, 246, 0.3) 50%, transparent 100%)',
            animation: 'float 6s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute rounded-full blur-3xl opacity-30 animate-pulse"
          style={{
            width: '500px',
            height: '500px',
            bottom: '-15%',
            right: '-15%',
            background: theme === 'dark' 
              ? 'radial-gradient(circle, #DC2626 0%, #991B1B 50%, transparent 100%)'
              : 'radial-gradient(circle, rgba(229, 231, 235, 0.5) 0%, rgba(243, 244, 246, 0.3) 50%, transparent 100%)',
            animation: 'float 8s ease-in-out infinite reverse'
          }}
        />
        <div 
          className="absolute rounded-full blur-2xl opacity-20"
          style={{
            width: '300px',
            height: '300px',
            top: '50%',
            right: '10%',
            background: theme === 'dark' ? '#B91C1C' : 'rgba(229, 231, 235, 0.4)',
            animation: 'float 10s ease-in-out infinite'
          }}
        />
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.1); }
        }
      `}</style>

      <div 
        className="w-full max-w-sm sm:max-w-md p-5 sm:p-6 md:p-8 rounded-2xl backdrop-blur-xl relative z-10 border-2 mx-auto"
        style={{
          backgroundColor: theme === 'dark' 
            ? 'rgba(30, 41, 59, 0.85)' 
            : 'rgba(255, 255, 255, 0.92)',
          border: theme === 'dark' 
            ? '2px solid rgba(239, 68, 68, 0.3)'
            : '2px solid rgba(220, 38, 38, 0.2)',
          boxShadow: theme === 'dark'
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(239, 68, 68, 0.15)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 100px rgba(220, 38, 38, 0.1)'
        }}
      >
        {/* Badge superior decorativo */}
        <div 
          className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full backdrop-blur-lg flex items-center gap-2"
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(153, 27, 27, 0.9) 100%)',
            boxShadow: '0 10px 25px rgba(220, 38, 38, 0.3)'
          }}
        >
          <FaShieldAlt className="text-white text-xs" />
          <span className="text-white text-xs font-bold tracking-wider">{t('auth.secureAccess')}</span>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <div className="relative inline-block">
            <img 
              src={arnaldLogo} 
              alt="ARNALD Data Flow" 
              className="mx-auto mb-4 h-16 w-auto max-w-[min(100%,320px)] object-contain sm:mb-5 sm:h-20 md:h-24 transition-transform duration-500"
              style={{
                filter: 'drop-shadow(0 10px 30px rgba(220, 38, 38, 0.4))',
                transform: `scale(${logoScale})`
              }}
            />
            {/* Círculo decorativo detrás del logo */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10 rounded-full opacity-20 blur-xl"
              style={{
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle, #DC2626 0%, transparent 70%)'
              }}
            />
          </div>
          
          <p
            className="text-xs font-medium uppercase tracking-[0.1em] sm:text-sm"
            style={{
              color: textSecondary,
              letterSpacing: '0.1em',
            }}
          >
            {t('auth.tagline')}
          </p>
        </div>
        {step === 1 ? (
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label 
                className="block text-sm font-semibold mb-2 flex items-center gap-2"
                style={{ color: textPrimary }}
              >
                <FaUser className="text-red-600 text-sm" />
                {t('auth.idNumber')}
              </label>
              <div className="relative group">
                <div 
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors"
                  style={{ color: textSecondary }}
                >
                  <FaUser className="text-base group-focus-within:text-red-600 transition-colors" />
                </div>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  placeholder={t('auth.idNumberPlaceholder')}
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `2px solid ${borderColor}`,
                    boxShadow: theme === 'dark' 
                      ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                      : '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                  required
                />
              </div>
            </div>
            
            <div>
              <label 
                className="block text-sm font-semibold mb-2 flex items-center gap-2"
                style={{ color: textPrimary }}
              >
                <FaLock className="text-red-600 text-sm" />
                {t('auth.password')}
              </label>
              <div className="relative group">
                <div 
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors"
                  style={{ color: textSecondary }}
                >
                  <FaLock className="text-base group-focus-within:text-red-600 transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={pswd}
                  onChange={e => setPswd(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `2px solid ${borderColor}`,
                    boxShadow: theme === 'dark' 
                      ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                      : '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-bold transition-all text-sm shadow-2xl hover:shadow-red-500/50 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',

                color: '#FFFFFF'
              }}
            >
              {/* Efecto de brillo en hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 transform -skew-x-12 group-hover:translate-x-full" style={{width: '200%', left: '-100%'}} />
              
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">{t('auth.signingIn')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <FaShieldAlt className="text-lg" />
                  <span className="text-sm">{t('auth.login')}</span>
                </div>
              )}
            </button>
            {error && (
              <div 
                className="p-4 rounded-xl text-sm animate-shake border-2"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                  border: `2px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.5)' : '#FCA5A5'}`,
                  color: theme === 'dark' ? '#FCA5A5' : '#991B1B',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.2)'
                    }}>
                      <span className="text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold mb-0.5">{t('auth.authenticationError')}</p>
                    <p className="text-xs opacity-90">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-xs font-medium underline-offset-2 hover:underline"
                style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
              }
              .animate-shake {
                animation: shake 0.5s ease-in-out;
              }
            `}</style>
          </form>
        ) : (
          <form onSubmit={handle2FA} className="space-y-4 sm:space-y-5">
            {/* Mensaje informativo mejorado */}
            <div 
              className="p-4 sm:p-5 rounded-xl sm:rounded-2xl text-xs sm:text-sm relative overflow-hidden"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.1)',
                border: `2px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(220, 38, 38, 0.3)'}`,
                boxShadow: theme === 'dark' 
                  ? '0 4px 15px rgba(239, 68, 68, 0.2)'
                  : '0 4px 15px rgba(220, 38, 38, 0.1)'
              }}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <FaShieldAlt 
                  className="text-lg sm:text-2xl mt-0.5 flex-shrink-0" 
                  style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
                />
                <div className="flex-1 min-w-0">
                  <p 
                    className="font-semibold mb-1 text-xs sm:text-sm"
                    style={{ color: theme === 'dark' ? '#FCA5A5' : '#991B1B' }}
                  >
                    {t('auth.twoFactorEnabled')}
                  </p>
                  {twoFAMethod === 'totp' ? (
                    <p 
                      className="text-[10px] sm:text-xs"
                      style={{ color: theme === 'dark' ? '#FCA5A5' : '#991B1B', opacity: 0.9 }}
                    >
                      {t('auth.authenticatorInstructions')}
                    </p>
                  ) : (
                    <>
                      <p 
                        className="text-[10px] sm:text-xs"
                        style={{ color: theme === 'dark' ? '#FCA5A5' : '#991B1B', opacity: 0.9 }}
                      >
                        {t('auth.codeSentTo')}
                      </p>
                      <p 
                        className="font-bold text-sm sm:text-base mt-2 font-mono break-all"
                        style={{ color: theme === 'dark' ? '#EF4444' : '#DC2626' }}
                      >
                        {infoCorreo}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label 
                className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2"
                style={{ color: textPrimary }}
              >
                <FaKey className="text-red-600 text-xs sm:text-sm" />
                {t('auth.twoFactorCode')}
              </label>
              <div className="relative group">
                <div 
                  className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none"
                  style={{ color: textSecondary }}
                >
                  <FaKey className="text-base sm:text-lg group-focus-within:text-red-600 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="• • • • • •"
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl text-center tracking-[0.3em] sm:tracking-[0.5em] font-mono transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 sm:focus:ring-offset-2"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `2px solid ${borderColor}`,
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    boxShadow: theme === 'dark' 
                      ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                      : '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                  required
                  autoFocus
                  maxLength={6}
                />
              </div>
              <p 
                className="text-[10px] sm:text-xs mt-2 text-center"
                style={{ color: textSecondary }}
              >
                {t('auth.enterSixDigitCode')}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold transition-all text-sm sm:text-base md:text-lg shadow-2xl hover:shadow-red-500/50 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                color: '#FFFFFF'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 transform -skew-x-12 group-hover:translate-x-full" style={{width: '200%', left: '-100%'}} />
              
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 sm:border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs sm:text-base">{t('auth.verifying')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <FaKey className="text-lg sm:text-xl" />
                  <span className="text-xs sm:text-base md:text-lg">{t('auth.verifyCode')}</span>
                </div>
              )}
            </button>
            {error && (
              <div 
                className="p-3 sm:p-4 rounded-lg sm:rounded-xl text-xs sm:text-sm animate-shake border-2"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                  border: `2px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.5)' : '#FCA5A5'}`,
                  color: theme === 'dark' ? '#FCA5A5' : '#991B1B',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
                }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center" style={{
                      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.2)'
                    }}>
                      <span className="text-sm sm:text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold mb-0.5 text-xs sm:text-sm">{t('auth.verificationError')}</p>
                    <p className="text-[10px] sm:text-xs opacity-90 break-words">{error}</p>
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
                setTwoFACode('');
                setTempToken('');
                setTwoFAMethod('');
              }}
              className="w-full py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all hover:scale-105 active:scale-95 rounded-lg"
              style={{ 
                color: theme === 'dark' ? '#FCA5A5' : '#DC2626',
                backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.05)'
              }}
            >
              ← {t('auth.backToLogin')}
            </button>
          </form>
        )}
        {/* Footer */}
        <div className="mt-8 pt-5 text-center space-y-2" style={{ borderTop: `1px solid ${borderColor}` }}>
          <p
            className="inline-flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: textSecondary }}
          >
            <FaShieldAlt className="text-[10px]" />
            {t('auth.secureConnection')}
          </p>
          <p className="font-body text-xs font-medium text-gray-500 dark:text-gray-400">
            © 2025 · {t('auth.tagline')}
          </p>
        </div>
      </div>
    </div>
  );
} 