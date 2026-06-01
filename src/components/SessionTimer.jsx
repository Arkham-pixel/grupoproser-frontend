import React, { useState, useEffect } from 'react';

// Duración máxima de sesión: 7 horas 50 minutos
const MAX_SESSION_DURATION = 7 * 60 * 60 * 1000 + 50 * 60 * 1000; // 7 horas 50 minutos

// Hook para detectar si es móvil
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isMobile;
};

const SessionTimer = () => {
  const [timeElapsed, setTimeElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [tokenInfo, setTokenInfo] = useState({ minutesRemaining: 0, expiryTime: null });
  const [showTokenRenewed, setShowTokenRenewed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsVisible(false);
      return;
    }
    
    setIsVisible(true);

    const updateTimer = () => {
      const sessionStartTime = localStorage.getItem('sessionStartTime');
      if (!sessionStartTime) return;

      const sessionStart = parseInt(sessionStartTime, 10);
      const currentTime = Date.now();
      const sessionDuration = currentTime - sessionStart;
      const remaining = MAX_SESSION_DURATION - sessionDuration;

      if (remaining <= 0) {
        setIsVisible(false);
        return;
      }

      // Tiempo transcurrido
      const elapsedHours = Math.floor(sessionDuration / (60 * 60 * 1000));
      const elapsedMinutes = Math.floor((sessionDuration % (60 * 60 * 1000)) / (60 * 1000));
      const elapsedSeconds = Math.floor((sessionDuration % (60 * 1000)) / 1000);
      
      // Tiempo restante
      const remainingHours = Math.floor(remaining / (60 * 60 * 1000));
      const remainingMinutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const remainingSeconds = Math.floor((remaining % (60 * 1000)) / 1000);

      setTimeElapsed({ hours: elapsedHours, minutes: elapsedMinutes, seconds: elapsedSeconds });
      setTimeRemaining({ hours: remainingHours, minutes: remainingMinutes, seconds: remainingSeconds });

      // Información del token JWT
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp) {
            const currentTimeSeconds = Math.floor(Date.now() / 1000);
            const tokenSecondsRemaining = payload.exp - currentTimeSeconds;
            const tokenMinutesRemaining = Math.floor(tokenSecondsRemaining / 60);
            const tokenExpiryTime = new Date(payload.exp * 1000);
            
            setTokenInfo({
              minutesRemaining: Math.max(0, tokenMinutesRemaining),
              expiryTime: tokenExpiryTime,
              needsRenewal: tokenMinutesRemaining <= 50 // Marca si necesita renovación
            });
          }
        } catch (e) {
          // Error al decodificar token
        }
      }
    };

    // Actualizar cada segundo
    const interval = setInterval(updateTimer, 1000);
    updateTimer(); // Ejecutar inmediatamente

    // Escuchar evento de token renovado
    const handleTokenRenewed = () => {
      setShowTokenRenewed(true);
      setTimeout(() => {
        setShowTokenRenewed(false);
      }, 5000); // Ocultar después de 5 segundos
    };

    window.addEventListener('tokenRenewed', handleTokenRenewed);

    return () => {
      clearInterval(interval);
      window.removeEventListener('tokenRenewed', handleTokenRenewed);
    };
  }, []);

  const formatTime = (time) => {
    const h = String(time.hours).padStart(2, '0');
    const m = String(time.minutes).padStart(2, '0');
    const s = String(time.seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Contador de sesión - Desktop: esquina inferior izquierda | Mobile: Header compacto */}
      {!isMobile ? (
        // Versión Desktop - Esquina inferior izquierda (para no interferir con chatbot)
        <div
          className="session-timer-container"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px', // Cambiado de right a left para no interferir con chatbot
            background: tokenInfo.needsRenewal 
              ? 'rgba(217, 119, 6, 0.95)' // Naranja si necesita renovación
              : 'rgba(37, 99, 235, 0.95)', // Azul normal
            color: 'white',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '600',
            zIndex: 1000, // Reducido para que no esté encima del chatbot
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minWidth: '220px',
            maxWidth: '280px',
            fontFamily: 'monospace'
          }}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Línea de sesión */}
          <div 
            className="session-info-line"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="session-info-icon" style={{ fontSize: '12px' }}>⏱️</span>
            <span>Sesión: {formatTime(timeElapsed)}</span>
          </div>
          
          {/* Línea de tiempo restante de sesión */}
          <div 
            className="session-info-line"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '10px',
              opacity: 0.9
            }}
          >
            <span>Restante: {formatTime(timeRemaining)}</span>
          </div>

          {/* Separador */}
          <div 
            className="session-separator"
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              margin: '2px 0'
            }}
          ></div>

          {/* Información del token */}
          <div 
            className="session-info-line"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '10px',
              opacity: 0.95
            }}
          >
            <span className="session-info-icon" style={{ fontSize: '12px' }}>🔑</span>
            <span>Token: {tokenInfo.minutesRemaining}m</span>
          </div>
          
          {tokenInfo.expiryTime && (
            <div 
              className="token-info-small"
              style={{ 
                fontSize: '9px',
                opacity: 0.85,
                fontStyle: 'italic'
              }}
            >
              Expira: {tokenInfo.expiryTime.toLocaleTimeString('es-CO', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          )}
        </div>
        </div>
      ) : (
        // Versión Mobile - Header compacto al lado del logo
        <div
          className="session-timer-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: tokenInfo.needsRenewal 
              ? 'rgba(217, 119, 6, 0.9)' // Naranja si necesita renovación
              : 'rgba(37, 99, 235, 0.9)', // Azul normal
            color: 'white',
            padding: '4px 6px',
            borderRadius: '6px',
            fontSize: '8px',
            fontWeight: '600',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            maxWidth: '120px'
          }}
        >
          <span style={{ fontSize: '9px' }}>⏱️</span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1', gap: '1px' }}>
            <span>{formatTime(timeElapsed)}</span>
            <span style={{ fontSize: '7px', opacity: 0.9 }}>🔑{tokenInfo.minutesRemaining}m</span>
          </div>
        </div>
      )}

      {/* Notificación de token renovado - Responsive */}
      {showTokenRenewed && (
        <div
          className="token-renewed-notification"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#059669',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            animation: 'slideIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '300px'
          }}
        >
          <style>{`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            
            @media (max-width: 640px) {
              .token-renewed-notification {
                top: 10px !important;
                right: 10px !important;
                left: 10px !important;
                max-width: calc(100% - 20px) !important;
                padding: 10px 12px !important;
                font-size: '12px' !important;
                border-radius: 6px !important;
              }
              
              .token-renewed-notification span:first-child {
                font-size: 14px !important;
              }
            }
            
            @media (max-width: 480px) {
              .token-renewed-notification {
                padding: 8px 10px !important;
                font-size: 11px !important;
                gap: 6px !important;
              }
            }
          `}</style>
          <span style={{ fontSize: '16px' }}>🔄</span>
          <span>Token renovado exitosamente</span>
        </div>
      )}
    </>
  );
};

export default SessionTimer;

