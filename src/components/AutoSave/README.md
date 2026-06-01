# 📦 Componentes de Autoguardado

Este directorio contiene los componentes visuales del sistema de autoguardado de formularios.

## 📋 Componentes

### AutoSaveNotification.jsx

Componente de notificación y control del autoguardado.

**Características:**
- 🟢 Indicador de estado en tiempo real
- ⏰ Muestra tiempo desde último guardado
- 💾 Botón para guardar manualmente
- ✕ Botón para desactivar autoguardado
- 💡 Prompt para activar el autoguardado

**Props:**

```javascript
<AutoSaveNotification
  isEnabled={boolean}              // Si el autoguardado está activo
  lastSaveTime={Date}              // Última vez que se guardó
  saveStatus={string}              // 'idle' | 'saving' | 'saved' | 'error'
  onEnable={function}              // Activar autoguardado
  onDisable={function}             // Desactivar autoguardado
  onSaveNow={function}             // Guardar inmediatamente
  hasUnsavedChanges={boolean}      // Si hay cambios sin guardar
  showEnablePrompt={boolean}       // Mostrar prompt de activación
  onDismissPrompt={function}       // Cerrar prompt
/>
```

**Estados visuales:**

- 🟢 Verde: Guardado exitosamente
- 🟠 Naranja: Guardando...
- 🔴 Rojo: Error al guardar
- ⚪ Gris: En espera

---

### AutoSaveRestoreDialog.jsx

Diálogo modal para restaurar datos guardados.

**Características:**
- 📊 Muestra cantidad de campos guardados
- 🕐 Muestra fecha y hora del guardado
- ✅ Opción para restaurar datos
- 🗑️ Opción para descartar datos
- ⏸️ Opción para decidir después

**Props:**

```javascript
<AutoSaveRestoreDialog
  isOpen={boolean}                 // Si el diálogo está abierto
  savedData={object}               // Datos guardados a restaurar
  metadata={object}                // Metadata del guardado
  onRestore={function}             // Restaurar datos
  onDiscard={function}             // Descartar datos
  onCancel={function}              // Cerrar sin acción
/>
```

**Metadata incluye:**
- `savedAt`: Fecha y hora del guardado
- `version`: Versión del formato
- `formKey`: Identificador del formulario

---

## 🎨 Diseño

Ambos componentes:
- ✅ Soportan tema claro y oscuro (ThemeContext)
- ✅ Son responsive (mobile-first)
- ✅ Tienen animaciones suaves
- ✅ Se posicionan de forma no intrusiva

## 📍 Posicionamiento

- **AutoSaveNotification**: Esquina inferior derecha (fixed)
- **AutoSaveRestoreDialog**: Centro de la pantalla (modal)

## 🔧 Uso

Ver la guía completa en: `frontend/GUIA_AUTOGUARDADO.md`

### Ejemplo básico:

```javascript
import AutoSaveNotification from '../AutoSave/AutoSaveNotification';
import AutoSaveRestoreDialog from '../AutoSave/AutoSaveRestoreDialog';

function MiFormulario() {
  // ... configuración del hook useAutoSave ...
  
  return (
    <>
      <form>{/* ... */}</form>
      
      <AutoSaveNotification {...autoSaveProps} />
      <AutoSaveRestoreDialog {...restoreProps} />
    </>
  );
}
```

## 🎯 Dependencias

- `react`: ^18.x
- `../../context/ThemeContext`: Para soporte de temas

## 📝 Notas

- Los componentes son controlados (controlled components)
- No mantienen estado interno
- Dependen completamente de las props
- Son reutilizables en cualquier formulario

---

**Creado para proteger el trabajo de los usuarios** 💾✨
