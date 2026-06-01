// Configuración de tiempos de sesión
export const SESSION_CONFIG = {
  // Tiempo total de sesión (7 horas 50 minutos)
  SESSION_DURATION: 7 * 60 * 60 * 1000 + 50 * 60 * 1000, // 7 horas 50 minutos en milisegundos
  
  // Tiempo de advertencia antes de expirar (10 minutos)
  WARNING_DURATION: 10 * 60 * 1000, // 10 minutos en milisegundos
  
  // Tiempo de inactividad para mostrar advertencia (7 horas 40 minutos)
  WARNING_START: 7 * 60 * 60 * 1000 + 40 * 60 * 1000, // 7 horas 40 minutos en milisegundos
  
  // Intervalo de verificación (1 segundo)
  CHECK_INTERVAL: 1000,
  
  // Tiempo de notificación (3 segundos)
  NOTIFICATION_DURATION: 3000
};

// Mensajes de la aplicación
export const SESSION_MESSAGES = {
  WARNING_TITLE: 'Sesión por expirar',
  WARNING_MESSAGE: 'Tu sesión expirará en 10 minutos por inactividad. ¿Deseas continuar con la sesión activa?',
  EXTEND_SUCCESS: 'Sesión extendida exitosamente',
  LOGOUT_MESSAGE: 'Sesión cerrada por inactividad',
  CONTINUE_BUTTON: 'Continuar sesión',
  LOGOUT_BUTTON: 'Cerrar ahora'
}; 