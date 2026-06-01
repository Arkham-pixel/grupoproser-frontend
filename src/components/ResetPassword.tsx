import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from '../config/apiConfig.js';
import { useTheme } from '../context/ThemeContext';
// @ts-ignore
import arnaldLogo from '../config/brandAssets.js';
import { FaEnvelope, FaShieldAlt, FaArrowLeft, FaCheckCircle, FaMoon, FaSun } from 'react-icons/fa';

export default function ResetPassword() {
  const { theme, toggleTheme } = useTheme();
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
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
    document.title = 'Arnald DataFlow - Recuperar Contraseña';
    
    const interval = setInterval(() => {
      setLogoScale(prev => prev === 1 ? 1.05 : 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setError("");
    setEmailError(false);
    setLoading(true);

    try {
      const response = await axios.post(`${BASE_URL}/api/secur-auth/forgot-password`, { correo });

      // Si hubo problema de correo, avisamos sin exponer token/link
      if (response.data.emailSent === false || response.data.emailError) {
        setEmailError(true);
      }
      
      setMensaje(response.data.message || "Si el correo está registrado, recibirás un enlace de recuperación.");
      setCorreo(""); // Limpiar el campo
    } catch (err: any) {
      console.error('Error al solicitar recuperación:', err);
      setError(err.response?.data?.message || "Error al solicitar el restablecimiento. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-2 sm:px-4 relative overflow-hidden"
      style={{
        background: theme === 'dark' 
          ? 'linear-gradient(135deg, #1A0000 0%, #3D0000 50%, #5C0000 100%)'
          : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #7F1D1D 100%)'
      }}
    >
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
              : 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
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
              : 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
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
            background: theme === 'dark' ? '#B91C1C' : 'rgba(255,255,255,0.6)',
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

      {/* Botón de cambio de tema flotante */}
      <button
        onClick={toggleTheme}
        className="fixed top-3 right-3 sm:top-6 sm:right-6 z-50 p-2.5 sm:p-4 rounded-full backdrop-blur-lg transition-all transform hover:scale-110 active:scale-95 shadow-2xl"
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(153, 27, 27, 0.9) 100%)',
          border: theme === 'dark' 
            ? '2px solid rgba(239, 68, 68, 0.5)'
            : '2px solid rgba(220, 38, 38, 0.3)',
          boxShadow: theme === 'dark'
            ? '0 8px 32px rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 8px 32px rgba(220, 38, 38, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)'
        }}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? (
          <FaSun className="text-lg sm:text-2xl text-yellow-300 animate-pulse" />
        ) : (
          <FaMoon className="text-lg sm:text-2xl text-white" />
        )}
      </button>

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
          className="absolute -top-4 sm:-top-6 left-1/2 transform -translate-x-1/2 px-3 sm:px-6 py-1.5 sm:py-2 rounded-full backdrop-blur-lg flex items-center gap-1.5 sm:gap-2"
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(153, 27, 27, 0.9) 100%)',
            boxShadow: '0 10px 25px rgba(220, 38, 38, 0.3)'
          }}
        >
          <FaShieldAlt className="text-white text-xs sm:text-sm" />
          <span className="text-white text-[10px] sm:text-xs font-bold tracking-wider">RECUPERACIÓN SEGURA</span>
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
          
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent mb-3"
            style={{
              backgroundImage: theme === 'dark'
                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                : 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
              textShadow: theme === 'dark' 
                ? '0 0 40px rgba(239, 68, 68, 0.3)'
                : '0 2px 20px rgba(220, 38, 38, 0.2)'
            }}
          >
            Recuperar Contraseña
          </h1>
          <p 
            className="text-xs sm:text-sm font-medium"
            style={{ 
              color: textSecondary,
              lineHeight: '1.6'
            }}
          >
            Ingresa tu correo electrónico o usuario y te enviaremos<br className="hidden sm:block" />instrucciones para restablecer tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label 
              className="block text-sm font-semibold mb-2 flex items-center gap-2"
              style={{ color: textPrimary }}
            >
              <FaEnvelope className="text-red-600 text-sm" />
              Correo Electrónico / Usuario / Cédula
            </label>
            <div className="relative group">
              <div 
                className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors"
                style={{ color: textSecondary }}
              >
                <FaEnvelope className="text-base group-focus-within:text-red-600 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="correo@ejemplo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
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
                disabled={loading}
              />
            </div>
            <p 
              className="text-xs mt-2"
              style={{ color: textSecondary, opacity: 0.8 }}
            >
              Puedes ingresar tu correo, usuario o cédula registrada
            </p>
          </div>

          {mensaje && (
            <div 
              className="p-5 rounded-2xl text-sm relative overflow-hidden border-2 animate-fade-in"
              style={{
                backgroundColor: emailError 
                  ? (theme === 'dark' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)')
                  : (theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(16, 185, 129, 0.1)'),
                border: `2px solid ${emailError
                  ? (theme === 'dark' ? 'rgba(251, 191, 36, 0.5)' : 'rgba(251, 191, 36, 0.3)')
                  : (theme === 'dark' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(16, 185, 129, 0.3)')}`,
                boxShadow: emailError
                  ? '0 4px 15px rgba(251, 191, 36, 0.2)'
                  : '0 4px 15px rgba(34, 197, 94, 0.2)'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: emailError
                        ? (theme === 'dark' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.2)')
                        : (theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(16, 185, 129, 0.2)')
                    }}
                  >
                    {emailError ? (
                      <span className="text-xl">⚠️</span>
                    ) : (
                      <FaCheckCircle 
                        className="text-xl" 
                        style={{ color: theme === 'dark' ? '#86EFAC' : '#059669' }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p 
                    className="font-bold mb-1"
                    style={{ 
                      color: emailError
                        ? (theme === 'dark' ? '#FCD34D' : '#D97706')
                        : (theme === 'dark' ? '#86EFAC' : '#166534')
                    }}
                  >
                    {emailError 
                      ? '⚠️ No fue posible enviar el correo'
                      : '✅ Correo enviado exitosamente'}
                  </p>
                  <p 
                    className="text-xs leading-relaxed mb-2"
                    style={{ 
                      color: emailError
                        ? (theme === 'dark' ? '#FCD34D' : '#D97706')
                        : (theme === 'dark' ? '#86EFAC' : '#166534'), 
                      opacity: 0.9 
                    }}
                  >
                    {mensaje}
                  </p>
                  {emailError && (
                    <p className="text-xs mt-2 italic" style={{ 
                      color: theme === 'dark' ? '#FCD34D' : '#D97706',
                      opacity: 0.85
                    }}>
                      Contacta al administrador para revisar la configuracion SMTP del servidor.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div 
              className="p-5 rounded-2xl text-sm animate-shake border-2"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                border: `2px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.5)' : '#FCA5A5'}`,
                color: theme === 'dark' ? '#FCA5A5' : '#991B1B',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center" 
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.2)'
                    }}
                  >
                    <span className="text-xl">⚠️</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-bold mb-1">Error al enviar</p>
                  <p className="text-xs leading-relaxed opacity-90">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
              20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            .animate-shake {
              animation: shake 0.5s ease-in-out;
            }
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
              animation: fade-in 0.4s ease-out;
            }
          `}</style>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold transition-all text-sm shadow-2xl hover:shadow-red-500/50 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
              color: '#FFFFFF'
            }}
          >
            {/* Efecto de brillo en hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 transform -skew-x-12 group-hover:translate-x-full" style={{width: '200%', left: '-100%'}} />
            
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Enviando instrucciones...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <FaEnvelope className="text-lg" />
                <span className="text-sm">Enviar Instrucciones</span>
              </div>
            )}
          </button>

          {/* Divisor decorativo */}
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px" style={{ backgroundColor: borderColor }} />
            <FaShieldAlt style={{ color: textSecondary, fontSize: '0.875rem' }} />
            <div className="flex-1 h-px" style={{ backgroundColor: borderColor }} />
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full py-2.5 text-xs font-medium transition-all hover:scale-105 active:scale-95 rounded-lg flex items-center justify-center gap-2"
            style={{ 
              color: theme === 'dark' ? '#FCA5A5' : '#DC2626',
              backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.05)',
              border: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.2)'}`
            }}
          >
            <FaArrowLeft className="text-xs" />
            Volver al inicio de sesión
          </button>
        </form>

        {/* Footer con versión mejorado */}
        <div className="mt-6 pt-4 text-center relative" style={{ borderTop: `2px solid ${borderColor}` }}>
          <div 
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-2"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.05)',
              color: textSecondary,
              border: `1px solid ${borderColor}`
            }}
          >
            <span>🔒</span>
            <span>Conexión Segura SSL</span>
          </div>
          <p className="text-xs font-medium" style={{ color: textSecondary }}>
            © 2025 <span style={{ color: theme === 'dark' ? '#EF4444' : '#DC2626', fontWeight: 'bold' }}>Arnald DataFlow</span>
          </p>
          <p className="text-xs mt-1" style={{ color: textSecondary, opacity: 0.7 }}>
            El corazón digital de Grupo Proser
          </p>
        </div>
      </div>
    </div>
  );
}
