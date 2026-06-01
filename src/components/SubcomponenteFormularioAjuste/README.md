# 📋 Componentes de Formulario de Ajuste

## 📋 Descripción General

Este directorio contiene todos los componentes necesarios para el sistema de formularios de ajuste, incluyendo el formulario principal, subcomponentes especializados, y funcionalidades de IA.

## 🚀 Componentes Principales

### 📝 Formulario Principal
- **`FormularioAjuste`** - Componente principal del formulario con versionado
- **Sistema de Versiones** - Manejo de estados: inicial, preliminar, actualización, informe final

### 🔧 Subcomponentes Especializados
- **`DatosGeneralesAjuste`** - Información básica del caso
- **`AntecedentesAjuste`** - Historial y antecedentes
- **`DescripcionRiesgoAjuste`** - Detalles del riesgo
- **`CircunstanciaSiniestroAjuste`** - Circunstancias del siniestro
- **`InspeccionFotograficaAjuste`** - Evidencia fotográfica
- **`CausaAjuste`** - Análisis de causas
- **`ReservaSugeridaAjuste`** - Cálculo de reservas
- **`FirmaAjuste`** - Sistema de firmas
- **`ObservacionesPreeliminar`** - Observaciones preliminares

### 🤖 Funcionalidades de IA
- **`ChatbotIA`** - Asistente inteligente para llenado de formularios
- **Botones Avanzados** - Mejora con IA, generación de texto profesional, análisis avanzado

## 🎯 Sistema de Versiones

### 📊 Estados del Formulario
1. **Inicial** - Formulario base con datos principales
2. **Preliminar** - Agrega observaciones preliminares
3. **Actualización** - Información actualizada del caso
4. **Informe Final** - Versión completa y final

### 🔄 Funcionalidades de Versión
- **Guardar en Historial** - Almacena cada versión independientemente
- **Exportar Individual** - Descarga de versiones específicas
- **Exportar Unificado** - Documento completo con todas las versiones
- **Generar Siguiente Reporte** - Transición automática entre estados

## 🎨 Características de Diseño

### 📱 Responsive Design
- **Mobile First** - Optimizado para dispositivos móviles
- **Tailwind CSS** - Sistema de diseño consistente
- **Componentes Modulares** - Fácil mantenimiento y reutilización

### 🎯 UX/UI
- **Validación en Tiempo Real** - Feedback inmediato al usuario
- **Estados de Carga** - Indicadores visuales durante operaciones
- **Manejo de Errores** - Mensajes claros y útiles
- **Accesibilidad** - Navegación por teclado y lectores de pantalla

## 🔌 Integración con Backend

### 📡 Servicios
- **`historialService`** - Comunicación con API del backend
- **Persistencia** - Guardado automático en base de datos
- **Sincronización** - Estado consistente entre frontend y backend

### 🗄️ Base de Datos
- **MongoDB** - Almacenamiento de formularios y versiones
- **Esquemas Flexibles** - Adaptación a diferentes tipos de datos
- **Índices Optimizados** - Búsquedas rápidas y eficientes

## 🧪 Testing y Calidad

### 🔍 Herramientas de Desarrollo
- **Console Logs** - Debugging detallado
- **Validación de Formularios** - Verificación de datos
- **Manejo de Estados** - Control de flujo de la aplicación

### 📊 Métricas
- **Rendimiento** - Tiempo de respuesta y carga
- **Usabilidad** - Facilidad de uso y navegación
- **Estabilidad** - Manejo robusto de errores

## 🚀 Mejoras Futuras

### 🔮 Funcionalidades Planificadas
- **Templates** - Formularios predefinidos por tipo de caso
- **Colaboración** - Múltiples usuarios trabajando en el mismo caso
- **Workflow** - Flujos de aprobación automatizados
- **Integración** - Conexión con sistemas externos

### 🎨 Mejoras de UX
- **Autoguardado** - Preservación automática de cambios
- **Historial de Cambios** - Seguimiento de modificaciones
- **Búsqueda Avanzada** - Filtros y búsquedas inteligentes
- **Exportación Múltiple** - Descarga de varios formularios

## 🤝 Contribución

### 📝 Guías de Desarrollo
- **Estilo de Código** - Convenciones de React y JavaScript
- **Componentes** - Creación de componentes reutilizables
- **Testing** - Implementación de tests unitarios
- **Documentación** - Mantenimiento de documentación actualizada

### 🐛 Reporte de Problemas
- **Descripción Clara** - Explicación detallada del problema
- **Pasos de Reproducción** - Secuencia exacta para reproducir
- **Información del Sistema** - Navegador, versión, entorno
- **Capturas de Pantalla** - Evidencia visual cuando sea posible
