import React, { useState, useEffect } from 'react';
import { SESSION_CONFIG } from '../config/session.js';

const SessionIndicator = () => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Solo mostrar si hay un token
    const token = localStorage.getItem('token');
    if (!token) return;

    const checkSessionTime = () => {
      const sessionStart = localStorage.getItem('sessionStart');
      if (!sessionStart) {
        // Si no hay timestamp de inicio, crear uno
        localStorage.setItem('sessionStart', Date.now().toString());
        return;
      }

      const startTime = parseInt(sessionStart);
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const sessionDuration = SESSION_CONFIG.SESSION_DURATION;
      const remaining = sessionDuration - elapsed;

      if (remaining <= 0) {
        // Sesión expirada
        setTimeLeft(0);
        setIsVisible(false);
        return;
      }

      if (remaining <= SESSION_CONFIG.WARNING_DURATION) { // 5 minutos o menos
        setIsVisible(true);
        setTimeLeft(Math.ceil(remaining / 1000));
      } else {
        setIsVisible(false);
      }
    };

    // Verificar cada segundo
    const interval = setInterval(checkSessionTime, 1000);
    checkSessionTime(); // Verificar inmediatamente

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible || timeLeft === null) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: timeLeft <= 60 ? '#dc2626' : '#d97706',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '5px',
      fontSize: '10px',
      fontWeight: 'bold',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      animation: timeLeft <= 60 ? 'pulse 1s infinite' : 'none',
      '@media (min-width: 640px)': {
        padding: '8px 12px',
        fontSize: '12px',
      }
    }}>
      ⏰ Sesión: {formatTime(timeLeft)}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        @media (min-width: 640px) {
          .session-indicator {
            padding: 8px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default SessionIndicator; 