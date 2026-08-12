// Configuración de tiempos de sesión
export const SESSION_CONFIG = {
  // Tiempo total de sesión (7 horas 50 minutos)
  SESSION_DURATION: 7 * 60 * 60 * 1000 + 50 * 60 * 1000, // 7 horas 50 minutos en milisegundos
  
  // Tiempo de advertencia antes de expirar (30 minutos)
  WARNING_DURATION: 30 * 60 * 1000, // 30 minutos en milisegundos
  
  // Tiempo de inactividad para mostrar advertencia (7 horas 20 minutos)
  WARNING_START: 7 * 60 * 60 * 1000 + 20 * 60 * 1000, // 7 horas 20 minutos en milisegundos
  
  // Intervalo de verificación (1 segundo)
  CHECK_INTERVAL: 1000,
  
  // Tiempo de notificación (3 segundos)
  NOTIFICATION_DURATION: 3000
};

// Mensajes de la aplicación
export const SESSION_MESSAGES = {
  WARNING_TITLE: 'Sesión por agotarse',
  WARNING_MESSAGE: 'Quedan 30 minutos o menos para el cierre automático de tu sesión. ¿Deseas continuar o cerrar ahora?',
  EXTEND_SUCCESS: 'Sesión extendida exitosamente',
  LOGOUT_MESSAGE: 'Sesión cerrada por inactividad',
  CONTINUE_BUTTON: 'Entendido',
  LOGOUT_BUTTON: 'Cerrar ahora'
};
