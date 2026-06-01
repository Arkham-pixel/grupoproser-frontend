import { SESSION_CONFIG, SESSION_MESSAGES } from '../config/session.js';

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
      if (!token) {
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
      } catch (error) {
        console.log('⚠️ Error en heartbeat, sesión puede haber expirado:', error);
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
            console.log('⚠️ Página estuvo oculta por más de 5 minutos, verificando sesión...');
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
        console.log('✅ Logout enviado al cerrar navegador (sendBeacon)');
      } catch (error) {
        console.log('⚠️ Error al enviar logout:', error);
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
        console.log('✅ Logout enviado al cerrar navegador (fetch)');
      } catch (error) {
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
    } catch (error) {
      // Si falla, la sesión puede haber expirado
      console.log('⚠️ Sesión no válida, cerrando...');
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
    
    this.isWarningShown = true;
    
    // Crear modal de advertencia
    const warningModal = document.createElement('div');
    warningModal.id = 'session-warning-modal';
    warningModal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      ">
        <div style="
          background: white;
          padding: 30px;
          border-radius: 10px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
          <h3 style="color: #dc2626; margin-bottom: 15px;">{SESSION_MESSAGES.WARNING_TITLE}</h3>
          <p style="color: #374151; margin-bottom: 25px;">
            {SESSION_MESSAGES.WARNING_MESSAGE}
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="extend-session" style="
              background: #059669;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
            ">
              {SESSION_MESSAGES.CONTINUE_BUTTON}
            </button>
            <button id="logout-now" style="
              background: #dc2626;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
            ">
              {SESSION_MESSAGES.LOGOUT_BUTTON}
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
        } catch (error) {
          console.log('⚠️ Error al registrar logout (no crítico):', error);
          // Continuar con el logout aunque falle el registro
        }
      }
    } catch (error) {
      console.error('Error en logout:', error);
    }

    // Limpiar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('login');
    localStorage.removeItem('nombre');
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionStart');

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