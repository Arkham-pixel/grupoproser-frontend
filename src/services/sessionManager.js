import { SESSION_CONFIG, SESSION_MESSAGES } from '../config/session.js';
import { esRolExterno } from '../config/roles.js';
import { limpiarSesionLocal } from '../utils/limpiarSesionLocal.js';

// Gestor de sesión con cierre automático por inactividad
class SessionManager {
  constructor() {
    this.timeoutDuration = SESSION_CONFIG.SESSION_DURATION;
    this.warningDuration = SESSION_CONFIG.WARNING_DURATION;
    this.timeoutId = null;
    this.warningId = null;
    this.isWarningShown = false;
    
    this.init();
  }

  init() {
    // Solo inicializar si hay un token válido
    const token = localStorage.getItem('token');
    if (!token) return;

    // Sesión limitada del enlace de subtarea: sin heartbeat de plataforma
    // (el token externo no es un SecurUser y la API lo rechaza con 403).
    if (esRolExterno()) return;

    // Establecer timestamp de inicio de sesión
    localStorage.setItem('sessionStart', Date.now().toString());
    
    this.resetTimer();
    this.setupEventListeners();
    this.iniciarHeartbeat(); // Iniciar heartbeat para mantener sesión activa
  }
  
  iniciarHeartbeat() {
    // Enviar heartbeat cada 2 minutos para mantener la sesión activa
    this.heartbeatInterval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token || esRolExterno()) {
        clearInterval(this.heartbeatInterval);
        return;
      }
      
      try {
        const { apiRequest } = await import('../config/apiConfig.js');
        await apiRequest('/secur-auth/verificar-sesion', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // Si la verificación es exitosa, la sesión se mantiene activa
      } catch {
        // Si falla, puede que la sesión haya expirado
        clearInterval(this.heartbeatInterval);
      }
    }, 2 * 60 * 1000); // Cada 2 minutos
  }

  setupEventListeners() {
    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimer(), true);
    });

    // Evento para cuando la ventana recupera el foco
    window.addEventListener('focus', () => this.resetTimer());
    
    // Cerrar sesión cuando el usuario cierra la pestaña/navegador
    window.addEventListener('beforeunload', () => {
      this.cerrarSesionAlSalir();
    });
    
    // También usar pagehide para mejor compatibilidad
    window.addEventListener('pagehide', () => {
      this.cerrarSesionAlSalir();
    });
    
    // Detectar cuando la página se oculta (cambio de pestaña, minimizar, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Cuando la página se oculta, marcar para verificar al volver
        this.lastHiddenTime = Date.now();
      } else {
        // Cuando la página vuelve a ser visible, verificar si pasó mucho tiempo
        if (this.lastHiddenTime) {
          const timeHidden = Date.now() - this.lastHiddenTime;
          // Si estuvo oculta más de 5 minutos, considerar cerrar sesión
          if (timeHidden > 5 * 60 * 1000) {
this.verificarSesionActiva();
          }
        }
      }
    });
  }
  
  async cerrarSesionAlSalir() {
    // Usar sendBeacon para asegurar que se envíe incluso si la página se cierra
    const token = localStorage.getItem('token');
    if (token && navigator.sendBeacon) {
      try {
        const { BASE_URL } = await import('../config/apiConfig.js');
        const url = `${BASE_URL}/api/secur-auth/logout`;
        // Crear FormData con el token para sendBeacon
        const formData = new FormData();
        formData.append('token', token);
        
        navigator.sendBeacon(url, formData);
      } catch {
        // Ignorar errores al cerrar la página.
      }
    } else if (token) {
      // Fallback: intentar con fetch (puede no completarse si se cierra muy rápido)
      try {
        const { BASE_URL } = await import('../config/apiConfig.js');
        fetch(`${BASE_URL}/api/secur-auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token }),
          keepalive: true // Mantener la petición activa incluso después de cerrar
        }).catch(() => {}); // Ignorar errores ya que la página se está cerrando
      } catch {
        // Ignorar errores
      }
    }
  }
  
  async verificarSesionActiva() {
    // Verificar si la sesión sigue activa en el servidor
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const { apiRequest } = await import('../config/apiConfig.js');
      // Hacer una petición simple para verificar que la sesión sigue activa
      await apiRequest('/secur-auth/verificar-sesion', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch {
      // Si falla, la sesión puede haber expirado
      this.logout();
    }
  }

  resetTimer() {
    // Limpiar timers existentes
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.warningId) {
      clearTimeout(this.warningId);
    }

    // Configurar nuevo timer de advertencia
    this.warningId = setTimeout(() => {
      this.showWarning();
    }, this.timeoutDuration - this.warningDuration);

    // Configurar timer de cierre de sesión
    this.timeoutId = setTimeout(() => {
      this.logout();
    }, this.timeoutDuration);
  }

  showWarning() {
    if (this.isWarningShown) return;
    // El aviso principal de 30 min lo muestra Layout (modal de plataforma).
    // Evitar un segundo diálogo duplicado desde este gestor.
    if (document.getElementById('session-warning-title')) {
      this.isWarningShown = true;
      return;
    }
    
    this.isWarningShown = true;
    
    // Crear modal de advertencia (estilo plataforma, no alert del navegador)
    const warningModal = document.createElement('div');
    warningModal.id = 'session-warning-modal';
    warningModal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10050;
        backdrop-filter: blur(4px);
        padding: 16px;
        box-sizing: border-box;
      ">
        <div style="
          background: #111827;
          padding: 24px;
          border-radius: 16px;
          max-width: 420px;
          width: 100%;
          text-align: left;
          box-shadow: 0 20px 50px rgba(0,0,0,0.45);
          border: 1px solid #374151;
          color: #e5e7eb;
        ">
          <h3 style="color: #f87171; margin: 0 0 12px; font-size: 18px;">${SESSION_MESSAGES.WARNING_TITLE}</h3>
          <p style="color: #d1d5db; margin: 0 0 20px; line-height: 1.5; font-size: 14px;">
            ${SESSION_MESSAGES.WARNING_MESSAGE}
          </p>
          <div style="display: flex; gap: 10px; justify-content: stretch; flex-wrap: wrap;">
            <button id="extend-session" style="
              flex: 1;
              background: #DC2626;
              color: white;
              border: none;
              padding: 12px 20px;
              border-radius: 12px;
              cursor: pointer;
              font-weight: bold;
              min-width: 120px;
            ">
              ${SESSION_MESSAGES.CONTINUE_BUTTON}
            </button>
            <button id="logout-now" style="
              flex: 1;
              background: #1f2937;
              color: #e5e7eb;
              border: 1px solid #4b5563;
              padding: 12px 20px;
              border-radius: 12px;
              cursor: pointer;
              min-width: 120px;
            ">
              ${SESSION_MESSAGES.LOGOUT_BUTTON}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(warningModal);

    // Event listeners para los botones
    document.getElementById('extend-session').addEventListener('click', () => {
      this.extendSession();
    });

    document.getElementById('logout-now').addEventListener('click', () => {
      this.logout();
    });
  }

  extendSession() {
    // Remover modal de advertencia
    const modal = document.getElementById('session-warning-modal');
    if (modal) {
      modal.remove();
    }
    
    this.isWarningShown = false;
    this.resetTimer();
    
    // Mostrar notificación de sesión extendida
    this.showNotification(SESSION_MESSAGES.EXTEND_SUCCESS, 'success');
  }

  async logout() {
    // Limpiar heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Intentar registrar el logout en el servidor
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const { apiRequest } = await import('../config/apiConfig.js');
        try {
          await apiRequest('/secur-auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch {
          // Continuar con el logout aunque falle el registro
        }
      }
    } catch (error) {
      console.error('Error en logout:', error);
    }

    limpiarSesionLocal();

    // Remover modal si existe
    const modal = document.getElementById('session-warning-modal');
    if (modal) {
      modal.remove();
    }

    // Mostrar notificación
    this.showNotification(SESSION_MESSAGES.LOGOUT_MESSAGE, 'info');

    // Redirigir al login
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  }

  showNotification(message, type = 'info') {
    // Crear notificación
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    // Color según tipo
    const colors = {
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706',
      info: '#2563eb'
    };

    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;

    // Agregar CSS para animación
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Método para limpiar timers (útil para testing)
  cleanup() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.warningId) {
      clearTimeout(this.warningId);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}

// Crear instancia global
const sessionManager = new SessionManager();

export default sessionManager; 