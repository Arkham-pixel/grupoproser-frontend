import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';
import { debug, warn } from '../utils/appLogger.js';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Variable para evitar múltiples renovaciones simultáneas
let isRefreshing = false;
let refreshPromise = null;

// Duración máxima de sesión: 7 horas 50 minutos en milisegundos
const MAX_SESSION_DURATION = 7 * 60 * 60 * 1000 + 50 * 60 * 1000; // 7 horas 50 minutos

// Variable para controlar el intervalo de verificación periódica
let sessionCheckInterval = null;
let tokenRenewalCheckInterval = null;

/**
 * Verifica si la sesión ha excedido las 8 horas y cierra la sesión si es necesario
 * También muestra información de estado de la sesión en la consola
 * @returns {boolean} - true si la sesión fue cerrada, false si aún es válida
 */
const checkAndCloseSessionIfExpired = async () => {
  const sessionStartTime = localStorage.getItem('sessionStartTime');
  
  if (!sessionStartTime) {
    // Si no hay timestamp, verificar si hay token y crear el timestamp ahora
    const token = localStorage.getItem('token');
    if (token) {
      const now = Date.now();
      localStorage.setItem('sessionStartTime', now.toString());
      const sessionStartDate = new Date(now).toLocaleString('es-CO');
      debug(`⏱️ Nueva sesión iniciada: ${sessionStartDate}`);
      debug(`📊 Sesión válida hasta: ${new Date(now + MAX_SESSION_DURATION).toLocaleString('es-CO')}`);
      return false;
    }
    return false;
  }
  
  const sessionStart = parseInt(sessionStartTime, 10);
  const currentTime = Date.now();
  const sessionDuration = currentTime - sessionStart;
  const hoursElapsed = Math.floor(sessionDuration / (60 * 60 * 1000));
  const minutesElapsed = Math.floor((sessionDuration % (60 * 60 * 1000)) / (60 * 1000));
  const hoursRemaining = Math.floor((MAX_SESSION_DURATION - sessionDuration) / (60 * 60 * 1000));
  const minutesRemaining = Math.floor(((MAX_SESSION_DURATION - sessionDuration) % (60 * 60 * 1000)) / (60 * 1000));
  
  // Si han pasado 7 horas 50 minutos o más, cerrar sesión
  if (sessionDuration >= MAX_SESSION_DURATION) {
    warn('⏰ Sesión de 7h 50m completada. Cerrando sesión automáticamente...');
    warn(`Tiempo total de sesión: ${hoursElapsed}h ${minutesElapsed}m`);
    
    // Intentar registrar el logout en el servidor (pero no bloquear si falla)
    const token = localStorage.getItem('token');
    if (token && navigator.onLine) {
      try {
        const { apiRequest } = await import('../config/apiConfig.js');
        apiRequest('/secur-auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(err => {
          debug('⚠️ Error al registrar logout (no crítico):', err);
        });
      } catch (err) {
        debug('⚠️ Error al registrar logout (no crítico):', err);
      }
    }
    
    // Limpiar toda la sesión
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('login');
    localStorage.removeItem('nombre');
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionStart');
    localStorage.removeItem('tokenNeedsRenewal');
    
    // Limpiar todos los intervalos
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
    if (tokenRenewalCheckInterval) {
      clearInterval(tokenRenewalCheckInterval);
      tokenRenewalCheckInterval = null;
    }
    
    // Redirigir al login solo si no estamos ya ahí
    if (window.location.pathname !== '/login') {
      debug('🔐 Redirigiendo al login después de 7 horas 50 minutos de sesión...');
      
      // Forzar redirección inmediata
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
    
    return true;
  }
  
  // Log informativo - mostrar siempre en las primeras 5 minutos, luego cada 10 minutos
  const shouldLogStatus = sessionDuration < (5 * 60 * 1000) || sessionDuration % (10 * 60 * 1000) < 5000;
  if (shouldLogStatus) {
    debug(`⏱️ Estado de sesión: ${hoursElapsed}h ${minutesElapsed}m transcurridas | ${hoursRemaining}h ${minutesRemaining}m restantes`);
    const sessionEndTime = new Date(sessionStart + MAX_SESSION_DURATION).toLocaleString('es-CO');
    debug(`📅 Sesión válida hasta: ${sessionEndTime}`);
    
    // Información adicional del token en las primeras verificaciones
    if (sessionDuration < 60000) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const tokenExpiry = new Date(payload.exp * 1000).toLocaleString('es-CO');
          const minutesUntilTokenExpiry = Math.floor((payload.exp - Math.floor(Date.now() / 1000)) / 60);
          debug(`🔑 Token JWT expira en: ${tokenExpiry} (${minutesUntilTokenExpiry} minutos)`);
          debug(`🔄 El token se renovará automáticamente cuando queden ${50} minutos o menos`);
        } catch (e) {
          // Error al decodificar, no mostrar info del token
        }
      }
    }
  }
  
  return false;
};

/**
 * Verifica si un token JWT está cerca de expirar o expirado
 * @param {string} token - Token JWT a verificar
 * @param {number} minutesBeforeExpiry - Minutos antes de la expiración para considerar renovación (default: 50)
 * @returns {boolean} - true si está cerca de expirar o expirado
 */
const isTokenNearExpiry = (token, minutesBeforeExpiry = 50) => {
  if (!token) return true;
  
  try {
    // Decodificar el token sin verificar (solo para obtener el payload)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Verificar si el token tiene exp (expiración)
    if (!payload.exp) return false; // Si no tiene exp, asumimos que no expira
    
    // Comparar con el tiempo actual (en segundos)
    const currentTime = Math.floor(Date.now() / 1000);
    const secondsBeforeExpiry = minutesBeforeExpiry * 60;
    
    // Si exp está en el pasado o cerca de expirar (dentro de X minutos), necesita renovación
    return payload.exp <= (currentTime + secondsBeforeExpiry);
  } catch (error) {
    console.error('❌ Error al decodificar token:', error);
    // Si no se puede decodificar, consideramos que necesita renovación
    return true;
  }
};

/**
 * Renueva el token actual llamando al endpoint de refresh
 * @param {boolean} force - Si es true, fuerza la renovación incluso si no está cerca de expirar
 * @returns {Promise<string|null>} - Nuevo token o null si falla
 */
const refreshToken = async (force = false) => {
  // Si ya hay una renovación en curso, esperar a que termine
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  
  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      const currentToken = localStorage.getItem('token');
      
      if (!currentToken) {
        console.warn('⚠️ No hay token para renovar');
        return null;
      }
      
      // Verificar si hay conexión a internet
      const hasConnection = navigator.onLine;
      
      if (!hasConnection && !force) {
        debug('📡 Sin conexión a internet. El token seguirá siendo válido localmente.');
        // Guardar que se necesita renovar cuando haya conexión
        localStorage.setItem('tokenNeedsRenewal', 'true');
        return currentToken; // Devolver el token actual para que funcione offline
      }
      
      // Intentar renovar desde ambos endpoints (auth y secur-auth)
      // El backend decidirá cuál es el correcto basado en el token
      const endpoints = [
        `${BASE_URL}/api/secur-auth/refresh-token`,
        `${BASE_URL}/api/auth/refresh-token`
      ];
      
      let newToken = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.post(
            endpoint,
            {},
            {
              headers: {
                Authorization: `Bearer ${currentToken}`
              },
              timeout: 10000 // Aumentar timeout a 10 segundos
            }
          );
          
          if (response.data?.token) {
            newToken = response.data.token;
            
            // Actualizar localStorage con el nuevo token y datos del usuario
            localStorage.setItem('token', newToken);
            localStorage.removeItem('tokenNeedsRenewal'); // Limpiar flag de renovación pendiente
            
            if (response.data.usuario) {
              if (response.data.usuario.nombre || response.data.usuario.name) {
                localStorage.setItem('nombre', response.data.usuario.nombre || response.data.usuario.name);
              }
              if (response.data.usuario.rol || response.data.usuario.role) {
                localStorage.setItem('rol', response.data.usuario.rol || response.data.usuario.role);
              }
              if (response.data.usuario.login) {
                localStorage.setItem('login', response.data.usuario.login);
              }
            }
            
            // Log detallado de la renovación
            try {
              const oldPayload = JSON.parse(atob(currentToken.split('.')[1]));
              const newPayload = JSON.parse(atob(newToken.split('.')[1]));
              const oldExpiry = new Date(oldPayload.exp * 1000).toLocaleString('es-CO');
              const newExpiry = new Date(newPayload.exp * 1000).toLocaleString('es-CO');
              const minutesBeforeExpiry = Math.floor((oldPayload.exp - Math.floor(Date.now() / 1000)) / 60);
              
              debug(`✅ Token renovado exitosamente`);
              debug(`   📅 Token anterior expiraba: ${oldExpiry}`);
              debug(`   📅 Token nuevo expira: ${newExpiry}`);
              if (minutesBeforeExpiry > 0) {
                debug(`   🔄 Renovación realizada con ${minutesBeforeExpiry} minutos de anticipación`);
              }
              
              // Emitir evento personalizado para notificar al componente visual
              window.dispatchEvent(new CustomEvent('tokenRenewed', {
                detail: {
                  oldExpiry: oldExpiry,
                  newExpiry: newExpiry,
                  timestamp: Date.now()
                }
              }));
            } catch (e) {
              debug('✅ Token renovado exitosamente');
              // Emitir evento incluso si falla el parseo
              window.dispatchEvent(new CustomEvent('tokenRenewed', {
                detail: {
                  timestamp: Date.now()
                }
              }));
            }
            break; // Si uno funciona, no probar el otro
          }
        } catch (error) {
          lastError = error;
          // Si este endpoint falla, intentar el otro
          if (endpoint === endpoints[endpoints.length - 1]) {
            // Si es el último endpoint y falla, loguear el error
            console.warn(`⚠️ No se pudo renovar el token desde ${endpoint}:`, error.response?.status || error.message);
            // Si no hay conexión, guardar flag para intentar más tarde
            if (!hasConnection) {
              localStorage.setItem('tokenNeedsRenewal', 'true');
              debug('📡 Sin conexión. Se intentará renovar cuando haya conexión.');
              return currentToken; // Devolver token actual para funcionar offline
            }
          }
          continue;
        }
      }
      
      if (!newToken && lastError) {
        // Si falló pero hay token actual, permitir funcionar offline
        if (currentToken) {
          console.warn('⚠️ No se pudo renovar el token, pero se mantendrá el token actual para funcionar offline');
          localStorage.setItem('tokenNeedsRenewal', 'true');
          return currentToken;
        }
      }
      
      return newToken;
    } catch (error) {
      console.error('❌ Error al renovar token:', error);
      // En caso de error, devolver el token actual si existe para funcionar offline
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        localStorage.setItem('tokenNeedsRenewal', 'true');
        return currentToken;
      }
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
};

// Interceptor para agregar automáticamente el token de autorización y renovarlo si es necesario
api.interceptors.request.use(
  async (config) => {
    // Verificar si la sesión ha excedido las 8 horas ANTES de hacer cualquier petición
    // Esta función también muestra logs informativos del estado de la sesión
    const sessionClosed = await checkAndCloseSessionIfExpired();
    if (sessionClosed) {
      // Si la sesión fue cerrada, rechazar la petición con un error específico
      return Promise.reject(new Error('Sesión expirada por tiempo máximo (7 horas 50 minutos). Por favor, inicia sesión nuevamente.'));
    }
    
    let token = localStorage.getItem('token');
    
    // Si no hay token, continuar sin token
    if (!token) {
      debug(`🌐 ${config.method?.toUpperCase() || 'GET'} ${config.url} (sin token)`);
      return config;
    }
    
    // Verificar si el token está cerca de expirar (50 minutos antes) o si necesita renovación
    // Pero solo renovar si NO es una petición de refresh-token (para evitar loops)
    const needsRenewal = localStorage.getItem('tokenNeedsRenewal') === 'true';
    const isNearExpiry = !config.url?.includes('/refresh-token') && isTokenNearExpiry(token, 50);
    
    if (isNearExpiry || needsRenewal) {
      // Obtener información del token para logging
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const minutesUntilExpiry = Math.floor((payload.exp - currentTime) / 60);
        if (isNearExpiry) {
          debug(`🔄 Token cerca de expirar (${minutesUntilExpiry} minutos restantes), renovando automáticamente...`);
        } else if (needsRenewal) {
          debug(`🔄 Token marcado para renovación pendiente, intentando renovar ahora...`);
        }
      } catch (e) {
        debug('🔄 Token necesita renovación, renovando automáticamente...');
      }
      
      const newToken = await refreshToken(needsRenewal);
      
      if (newToken && newToken !== token) {
        token = newToken;
        try {
          const newPayload = JSON.parse(atob(newToken.split('.')[1]));
          const newExpiryTime = new Date(newPayload.exp * 1000).toLocaleString('es-CO');
          debug(`✅ Token renovado y actualizado. Nuevo token expira: ${newExpiryTime}`);
        } catch (e) {
          debug('✅ Token renovado y actualizado exitosamente');
        }
      } else if (newToken === token) {
        // Token no se renovó pero se mantiene el actual (funciona offline)
        debug('📡 Token actual se mantiene (funcionando offline o sin conexión)');
      } else {
        console.warn('⚠️ No se pudo renovar el token, usando el actual');
      }
    }
    
    // Agregar token a la petición
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    debug(`🌐 ${config.method?.toUpperCase() || 'GET'} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Error en interceptor de request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {
    debug(`✅ ${response.config.method?.toUpperCase() || 'GET'} ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Si recibimos 401 o 403, intentar renovar el token una vez
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      // Marcar esta petición como que ya intentamos retry
      originalRequest._retry = true;
      
      debug('🔄 Token expirado o inválido detectado, intentando renovar...');
      const newToken = await refreshToken(true);
      
      if (newToken && newToken !== originalRequest.headers.Authorization?.split(' ')[1]) {
        // Actualizar el header de autorización y reintentar la petición original
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        debug('✅ Token renovado, reintentando petición...');
        return api(originalRequest);
      } else if (newToken) {
        // Token no cambió pero se mantiene (funciona offline)
        debug('📡 Token actual se mantiene (funcionando offline). Reintentando petición...');
        return api(originalRequest);
      } else {
        // Si no se pudo renovar y no hay conexión, permitir funcionar offline
        if (!navigator.onLine) {
          console.warn('⚠️ Sin conexión. La sesión permanecerá activa localmente.');
          // NO eliminamos el localStorage - el usuario puede seguir trabajando offline
          // Cuando haya conexión, se intentará renovar automáticamente
        } else {
          console.warn('⚠️ No se pudo renovar el token. La sesión permanecerá activa en el cliente.');
        }
      }
    }
    
    console.error('❌ Error en respuesta:', error.message);
    return Promise.reject(error);
  }
);

// Inicializar verificación periódica de sesión (cada 30 segundos)
// Esto asegura que se verifique incluso si no hay peticiones HTTP
const initSessionCheck = () => {
  // Limpiar intervalos anteriores si existen
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  if (tokenRenewalCheckInterval) {
    clearInterval(tokenRenewalCheckInterval);
  }
  
  // Verificar inmediatamente
  checkAndCloseSessionIfExpired();
  
  // Verificar cada 30 segundos si la sesión ha expirado (8 horas)
  sessionCheckInterval = setInterval(async () => {
    const sessionClosed = await checkAndCloseSessionIfExpired();
    if (sessionClosed) {
      // Si la sesión fue cerrada, limpiar los intervalos
      clearInterval(sessionCheckInterval);
      clearInterval(tokenRenewalCheckInterval);
      sessionCheckInterval = null;
      tokenRenewalCheckInterval = null;
    }
  }, 30000); // 30 segundos
  
  // Verificar cada 5 minutos si el token necesita renovación
  tokenRenewalCheckInterval = setInterval(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Verificar si el token está cerca de expirar o si hay flag de renovación pendiente
    const needsRenewal = localStorage.getItem('tokenNeedsRenewal') === 'true';
    const isNearExpiry = isTokenNearExpiry(token, 50);
    
    if (isNearExpiry || needsRenewal) {
      debug('🔄 Verificación periódica: Token necesita renovación');
      await refreshToken(needsRenewal);
    }
  }, 5 * 60 * 1000); // 5 minutos
  
  // También verificar cuando la página recupera el foco (si el usuario vuelve a la pestaña)
  const handleFocus = async () => {
    const sessionClosed = await checkAndCloseSessionIfExpired();
    if (sessionClosed) {
      clearInterval(sessionCheckInterval);
      clearInterval(tokenRenewalCheckInterval);
      sessionCheckInterval = null;
      tokenRenewalCheckInterval = null;
      window.removeEventListener('focus', handleFocus);
    } else {
      // Verificar si el token necesita renovación cuando se recupera el foco
      const token = localStorage.getItem('token');
      if (token) {
        const needsRenewal = localStorage.getItem('tokenNeedsRenewal') === 'true';
        const isNearExpiry = isTokenNearExpiry(token, 50);
        if (isNearExpiry || needsRenewal) {
          refreshToken(needsRenewal);
        }
      }
    }
  };
  
  window.addEventListener('focus', handleFocus);
  
  // Verificar cuando la página se hace visible (si estaba en segundo plano)
  const handleVisibilityChange = async () => {
    if (!document.hidden) {
      const sessionClosed = await checkAndCloseSessionIfExpired();
      if (sessionClosed) {
        clearInterval(sessionCheckInterval);
        clearInterval(tokenRenewalCheckInterval);
        sessionCheckInterval = null;
        tokenRenewalCheckInterval = null;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      } else {
        // Verificar si el token necesita renovación cuando la página se hace visible
        const token = localStorage.getItem('token');
        if (token) {
          const needsRenewal = localStorage.getItem('tokenNeedsRenewal') === 'true';
          const isNearExpiry = isTokenNearExpiry(token, 50);
          if (isNearExpiry || needsRenewal) {
            refreshToken(needsRenewal);
          }
        }
      }
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Escuchar eventos de conexión para renovar token cuando se recupere la conexión
  const handleOnline = () => {
    debug('📡 Conexión a internet restaurada');
    const token = localStorage.getItem('token');
    const needsRenewal = localStorage.getItem('tokenNeedsRenewal') === 'true';
    if (token && (needsRenewal || isTokenNearExpiry(token, 50))) {
      debug('🔄 Intentando renovar token ahora que hay conexión...');
      refreshToken(true);
    }
  };
  
  window.addEventListener('online', handleOnline);
};

// Inicializar la verificación periódica cuando se carga el módulo
if (typeof window !== 'undefined') {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSessionCheck);
  } else {
    // Si el DOM ya está listo, inicializar después de un pequeño delay
    setTimeout(initSessionCheck, 1000);
  }
}

export default api; 