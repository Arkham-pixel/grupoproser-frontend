# 🔐 Sistema de Gestión de Sesiones

## 📋 Descripción

El sistema de gestión de sesiones implementa un cierre automático por inactividad para mejorar la seguridad de la aplicación. Los usuarios reciben advertencias antes de que expire su sesión y pueden extenderla si lo desean.

## ⏰ Configuración por Defecto

- **Duración total de sesión**: 8 horas
- **Tiempo de advertencia**: 10 minutos antes de expirar
- **Actividad detectada**: Movimiento de mouse, clics, teclado, scroll, toques

## 🎯 Características

### ✅ Funcionalidades Implementadas

1. **Cierre automático por inactividad**
   - Sesión expira después de 8 horas sin actividad
   - Limpia automáticamente el localStorage
   - Redirige al login

2. **Advertencia previa**
   - Modal de advertencia 10 minutos antes de expirar
   - Opción para extender la sesión
   - Opción para cerrar inmediatamente

3. **Indicador visual**
   - Contador de tiempo restante en la esquina superior derecha
   - Cambia de color según el tiempo restante
   - Animación pulsante cuando queda menos de 1 minuto

4. **Detección de actividad**
   - Movimiento de mouse
   - Clics
   - Teclado
   - Scroll
   - Toques (dispositivos móviles)
   - Cambio de foco de ventana

5. **Configuración administrativa**
   - Panel de configuración para administradores
   - Ajuste de tiempos de sesión
   - Validación de permisos

## 🔧 Configuración

### Para Administradores

1. **Acceder a la configuración**:
   - Ir a "Administración" → "⚙️ Configuración de Sesión"
   - Solo visible para usuarios con rol `admin`

2. **Ajustar tiempos**:
   - **Duración de sesión**: 1-24 horas
   - **Tiempo de advertencia**: 5 minutos hasta (duración - 5 minutos)

3. **Guardar cambios**:
   - Los cambios se aplican en la próxima sesión
   - Se guardan en localStorage

### Para Desarrolladores

#### Archivos de configuración:
- `frontend/src/config/session.js` - Configuración centralizada
- `frontend/src/services/sessionManager.js` - Lógica principal
- `frontend/src/components/SessionIndicator.jsx` - Indicador visual

#### Personalización:
```javascript
// En frontend/src/config/session.js
export const SESSION_CONFIG = {
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas
  WARNING_DURATION: 10 * 60 * 1000,     // 10 minutos
  // ... más configuraciones
};
```

## 🚀 Uso

### Para Usuarios

1. **Inicio de sesión normal**
   - El timer se inicia automáticamente
   - Se reinicia con cualquier actividad

2. **Advertencia de expiración**
   - Aparece modal 10 minutos antes
   - Opción "Continuar sesión" para extender
   - Opción "Cerrar ahora" para salir

3. **Indicador visual**
   - Aparece en los últimos 10 minutos
   - Muestra tiempo restante en formato HH:MM:SS
   - Cambia de naranja a rojo según urgencia

### Para Administradores

1. **Configurar tiempos**:
   ```
   Administración → ⚙️ Configuración de Sesión
   ```

2. **Monitorear sesiones**:
   - Los logs aparecen en la consola del navegador
   - Se pueden verificar en las herramientas de desarrollador

## 🔒 Seguridad

### Medidas Implementadas

1. **Limpieza automática**
   - Elimina token al expirar
   - Limpia localStorage completo
   - Redirige al login

2. **Validación de permisos**
   - Solo admins pueden configurar
   - Verificación de roles en frontend y backend

3. **Detección robusta**
   - Múltiples eventos de actividad
   - Manejo de cambios de foco
   - Compatible con dispositivos móviles

### Recomendaciones

1. **Tiempo recomendado**: 8 horas para aplicaciones empresariales
2. **Advertencia**: 10 minutos para dar tiempo de reacción
3. **Mínimo**: 2 horas para evitar interrupciones frecuentes
4. **Máximo**: 24 horas para mantener seguridad

## 🐛 Troubleshooting

### Problemas Comunes

1. **Sesión expira muy rápido**
   - Verificar configuración en `session.js`
   - Revisar logs en consola del navegador

2. **Advertencia no aparece**
   - Verificar que el usuario tenga token válido
   - Revisar permisos de administrador

3. **Indicador no se muestra**
   - Verificar que esté importado en Layout.jsx
   - Revisar CSS y z-index

### Logs de Debug

```javascript
// En la consola del navegador
console.log('🔐 Session Manager initialized');
console.log('⏰ Timer reset due to activity');
console.log('⚠️ Warning modal shown');
console.log('🚪 Session expired, redirecting to login');
```

## 📝 Notas de Implementación

### Archivos Modificados

1. **Nuevos archivos**:
   - `frontend/src/services/sessionManager.js`
   - `frontend/src/components/SessionIndicator.jsx`
   - `frontend/src/components/SessionSettings.jsx`
   - `frontend/src/config/session.js`

2. **Archivos modificados**:
   - `frontend/src/App.jsx` - Agregada ruta de configuración
   - `frontend/src/components/Layout.jsx` - Agregado indicador
   - `frontend/src/components/login.tsx` - Agregado timestamp

### Dependencias

- React (ya incluido)
- No requiere dependencias adicionales
- Compatible con navegadores modernos

## 🎯 Próximas Mejoras

1. **Configuración por usuario**
   - Diferentes tiempos según rol
   - Preferencias personalizadas

2. **Notificaciones push**
   - Alertas en segundo plano
   - Integración con notificaciones del navegador

3. **Analytics de sesión**
   - Tiempo promedio de sesión
   - Patrones de actividad
   - Reportes de seguridad

4. **Configuración en backend**
   - Persistencia en base de datos
   - Configuración global por empresa
   - Sincronización entre dispositivos 