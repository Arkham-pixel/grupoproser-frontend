# 📋 Guía de Autoguardado de Formularios

## 🎯 Descripción General

Sistema completo de autoguardado para formularios que protege la información del usuario ante cierres inesperados, problemas de conexión o refrescos de página.

## ✨ Características

- ✅ **Guardado automático cada 30 segundos** (configurable)
- ✅ **Guardado al salir de la página** (unmount del componente)
- ✅ **Detección inteligente** de cuándo activar el prompt
- ✅ **Restauración de datos** con confirmación del usuario
- ✅ **Notificaciones visuales** del estado de guardado
- ✅ **Limpieza automática** después de guardar exitosamente
- ✅ **Gestión de espacio** (limpieza de autoguardados antiguos)
- ✅ **Exclusión de campos** pesados o innecesarios

## 📂 Estructura del Sistema

```
frontend/src/
├── hooks/
│   └── useAutoSave.js          # Hook personalizado principal
├── services/
│   └── autoSaveService.js      # Servicio de localStorage
└── components/
    └── AutoSave/
        ├── AutoSaveNotification.jsx      # Notificación flotante
        └── AutoSaveRestoreDialog.jsx     # Diálogo de restauración
```

## 🚀 Implementación en un Formulario

### Paso 1: Importar los módulos necesarios

```javascript
import { useAutoSave } from '../../hooks/useAutoSave';
import AutoSaveNotification from '../AutoSave/AutoSaveNotification';
import AutoSaveRestoreDialog from '../AutoSave/AutoSaveRestoreDialog';
import { useCallback } from 'react'; // Si no está importado
```

### Paso 2: Agregar estados necesarios

Agregar estos estados en el componente del formulario:

```javascript
// Estados para autoguardado
const [showAutoSavePrompt, setShowAutoSavePrompt] = useState(false);
const [showRestoreDialog, setShowRestoreDialog] = useState(false);
const [savedDataToRestore, setSavedDataToRestore] = useState(null);
const [hasUserInteracted, setHasUserInteracted] = useState(false);
```

### Paso 3: Generar clave única para el formulario

```javascript
// Generar key única para autoguardado
// IMPORTANTE: Cambiar según el tipo de formulario
const autoSaveKey = initialData?._id 
  ? `formulario-[TIPO]-${initialData._id}`  // Modo edición
  : 'formulario-[TIPO]-nuevo';               // Modo creación

// Ejemplos:
// - 'formulario-complex-nuevo'
// - 'formulario-riesgo-123abc'
// - 'formulario-inspeccion-nuevo'
// - 'formulario-puertos-456def'
```

### Paso 4: Inicializar el hook useAutoSave

```javascript
// Hook de autoguardado
const {
  isAutoSaveEnabled,
  lastSaveTime,
  saveStatus,
  enableAutoSave,
  disableAutoSave,
  clearSavedData,
  saveNow,
  restoreFromStorage,
  hasSavedData,
} = useAutoSave({
  formKey: autoSaveKey,
  formData: formData,
  enabled: true,
  interval: 30000, // 30 segundos (ajustable)
  excludeFields: ['historialDocs', 'archivosTemporales'], // Campos a excluir (opcional)
  onRestore: (savedInfo) => {
    console.log('📦 Datos guardados encontrados');
    setSavedDataToRestore(savedInfo);
    setShowRestoreDialog(true);
  },
});
```

### Paso 5: Detectar interacción del usuario

Este efecto detecta cuándo el usuario ha llenado suficientes campos para mostrar el prompt de autoguardado:

```javascript
// Detectar cuando el usuario empieza a interactuar
useEffect(() => {
  if (!hasUserInteracted && formData) {
    // Verificar campos llenos
    const camposLlenos = Object.entries(formData).filter(([key, value]) => {
      // Excluir campos que no cuentan
      if (key === 'historialDocs' || key === '_id') return false;
      if (!value) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      return true;
    });

    // Si hay al menos 3 campos llenos, mostrar prompt
    if (camposLlenos.length >= 3 && !initialData?._id && !isAutoSaveEnabled) {
      setHasUserInteracted(true);
      setShowAutoSavePrompt(true);
    }
  }
}, [formData, hasUserInteracted, initialData, isAutoSaveEnabled]);
```

### Paso 6: Agregar handlers de restauración

```javascript
// Handlers para autoguardado
const handleRestoreData = useCallback(() => {
  if (savedDataToRestore && savedDataToRestore.data) {
    console.log('✅ Restaurando datos guardados');
    setFormData(prevData => ({
      ...prevData,
      ...savedDataToRestore.data,
    }));
    setShowRestoreDialog(false);
    enableAutoSave();
    alert('✅ Datos restaurados exitosamente');
  }
}, [savedDataToRestore, enableAutoSave]);

const handleDiscardSavedData = useCallback(() => {
  console.log('🗑️ Descartando datos guardados');
  clearSavedData();
  setShowRestoreDialog(false);
  setSavedDataToRestore(null);
}, [clearSavedData]);

const handleCancelRestore = useCallback(() => {
  console.log('⏸️ Decisión de restauración pospuesta');
  setShowRestoreDialog(false);
}, []);
```

### Paso 7: Limpiar autoguardado después de guardar

En la función de guardado del formulario (handleSubmit, guardarCaso, etc.):

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    // ... código de guardado existente ...
    await guardarFormulario(payload);
    
    // Limpiar autoguardado después de éxito
    console.log('✅ Guardado exitoso, limpiando autoguardado');
    clearSavedData();
    
    // ... resto del código ...
  } catch (error) {
    console.error('❌ Error al guardar:', error);
    // Mantener autoguardado en caso de error
  }
};
```

### Paso 8: Agregar componentes visuales

Al final del componente, antes del cierre del return, agregar:

**IMPORTANTE**: Si tu componente devuelve un solo elemento (como `<form>` o `<div>`), necesitas envolverlo en un Fragment (`<>...</>`):

```javascript
return (
  <>
    {/* Tu formulario existente */}
    <form onSubmit={handleSubmit}>
      {/* ... contenido del formulario ... */}
    </form>

    {/* Componentes de autoguardado */}
    <AutoSaveNotification
      isEnabled={isAutoSaveEnabled}
      lastSaveTime={lastSaveTime}
      saveStatus={saveStatus}
      onEnable={enableAutoSave}
      onDisable={disableAutoSave}
      onSaveNow={saveNow}
      hasUnsavedChanges={hasUserInteracted}
      showEnablePrompt={showAutoSavePrompt}
      onDismissPrompt={() => setShowAutoSavePrompt(false)}
    />

    <AutoSaveRestoreDialog
      isOpen={showRestoreDialog}
      savedData={savedDataToRestore?.data}
      metadata={savedDataToRestore?.metadata}
      onRestore={handleRestoreData}
      onDiscard={handleDiscardSavedData}
      onCancel={handleCancelRestore}
    />
  </>
);
```

## 📝 Ejemplo Completo

Ver la implementación completa en:
- `frontend/src/components/SubcomponenteCompex/FormularioCasoComplex.jsx`
- `frontend/src/components/SubcomponentesRiesgo/AgregarCasoRiesgo.jsx`

## ⚙️ Configuración Avanzada

### Cambiar intervalo de guardado

```javascript
const { ... } = useAutoSave({
  formKey: autoSaveKey,
  formData: formData,
  interval: 60000, // 60 segundos (1 minuto)
  // ...
});
```

### Excluir campos específicos

```javascript
const { ... } = useAutoSave({
  formKey: autoSaveKey,
  formData: formData,
  excludeFields: [
    'historialDocs',      // Documentos pesados
    'archivosTemporales', // Archivos temporales
    'imagenesPrevisualizacion', // Previsualizaciones
  ],
  // ...
});
```

### Guardar manualmente

```javascript
// En un botón o acción específica
<button onClick={saveNow}>
  💾 Guardar ahora
</button>
```

### Verificar si hay datos guardados

```javascript
useEffect(() => {
  if (hasSavedData()) {
    console.log('Hay datos guardados disponibles');
  }
}, []);
```

## 🔍 API del Hook useAutoSave

### Parámetros de entrada

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `formKey` | string | ✅ | - | Identificador único del formulario |
| `formData` | object | ✅ | - | Datos del formulario a guardar |
| `enabled` | boolean | ❌ | true | Si el autoguardado está activo |
| `interval` | number | ❌ | 30000 | Intervalo en milisegundos |
| `excludeFields` | array | ❌ | [] | Campos a excluir del guardado |
| `onRestore` | function | ❌ | - | Callback al encontrar datos guardados |

### Valores retornados

| Valor | Tipo | Descripción |
|-------|------|-------------|
| `isAutoSaveEnabled` | boolean | Si el autoguardado está activo |
| `lastSaveTime` | Date | Última vez que se guardó |
| `saveStatus` | string | Estado: 'idle', 'saving', 'saved', 'error' |
| `enableAutoSave` | function | Activar autoguardado |
| `disableAutoSave` | function | Desactivar autoguardado |
| `clearSavedData` | function | Limpiar datos guardados |
| `saveNow` | function | Guardar inmediatamente |
| `restoreFromStorage` | function | Obtener datos guardados |
| `hasSavedData` | function | Verificar si hay datos guardados |
| `getMetadata` | function | Obtener metadata del guardado |

## 🎨 Personalización Visual

### Personalizar colores del tema

Los componentes visuales (AutoSaveNotification y AutoSaveRestoreDialog) respetan automáticamente el tema (dark/light) usando el contexto `ThemeContext`.

### Personalizar mensajes

Puedes modificar los mensajes en los componentes:
- `AutoSaveNotification.jsx` - Notificaciones y prompts
- `AutoSaveRestoreDialog.jsx` - Diálogo de restauración

## 📊 Gestión de Espacio

El servicio de autoguardado incluye limpieza automática:

- **Limpieza automática**: Autoguardados con más de 7 días se eliminan automáticamente
- **Manejo de cuota**: Si se agota el espacio, se limpian autoguardados antiguos
- **Optimización**: Solo se guardan los campos necesarios (excludeFields)

### Ver tamaño usado

```javascript
import { autoSaveService } from '../services/autoSaveService';

console.log('Tamaño total:', autoSaveService.getTotalSizeFormatted());
console.log('Autoguardados:', autoSaveService.listAll());
```

## 🐛 Solución de Problemas

### El autoguardado no se activa

1. Verificar que `formKey` sea único
2. Verificar que `formData` tenga datos
3. Revisar la consola para mensajes de error

### Los datos no se restauran

1. Verificar que `onRestore` esté configurado correctamente
2. Revisar que `handleRestoreData` actualice `formData` correctamente
3. Verificar que no se estén limpiando datos prematuramente

### QuotaExceededError

1. Reducir `interval` para guardar menos frecuentemente
2. Agregar más campos a `excludeFields`
3. El sistema limpiará automáticamente datos antiguos

### El prompt no aparece

1. Verificar que `hasUserInteracted` se actualice correctamente
2. Ajustar el número mínimo de campos (actualmente 3)
3. Revisar que no esté en modo edición (`initialData._id`)

## 📱 Formularios Compatibles

El sistema de autoguardado puede implementarse en:

- ✅ FormularioCasoComplex (implementado)
- ✅ AgregarCasoRiesgo (implementado)
- ⏳ FormularioInspeccion (pendiente)
- ⏳ FormularioInspeccionPropiedades (pendiente)
- ⏳ FormularioAjuste (pendiente)
- ⏳ FormularioMaquinaria (pendiente)
- ⏳ FormularioPuertos (pendiente)

## 🔐 Seguridad y Privacidad

- Los datos se guardan en `localStorage` del navegador (cliente)
- Los datos NO se envían al servidor hasta que el usuario guarda
- Los datos se cifran a nivel de navegador (implementación del navegador)
- Cada usuario tiene su propio `localStorage`

## 📞 Soporte

Para dudas o problemas con el autoguardado:

1. Revisar esta guía completa
2. Ver ejemplos implementados
3. Revisar la consola del navegador para logs
4. Contactar al equipo de desarrollo

## 🎯 Mejores Prácticas

1. **Keys únicas**: Usar identificadores únicos para cada formulario y caso
2. **Excluir campos pesados**: No guardar archivos, imágenes grandes, etc.
3. **Limpiar después de guardar**: Siempre llamar `clearSavedData()` después de un guardado exitoso
4. **Manejar errores**: Mantener autoguardado si hay error al guardar
5. **Informar al usuario**: Usar las notificaciones visuales para feedback
6. **Respetar decisiones**: No forzar el autoguardado, dejar que el usuario decida

## 🚀 Próximas Mejoras

- [ ] Sincronización entre pestañas del navegador
- [ ] Guardado en IndexedDB para mayor capacidad
- [ ] Versionado de autoguardados (múltiples versiones)
- [ ] Exportar/importar autoguardados
- [ ] Estadísticas de uso del autoguardado
- [ ] Notificaciones push cuando hay datos guardados

---

**¡El autoguardado está listo para proteger tu trabajo!** 💾✨
