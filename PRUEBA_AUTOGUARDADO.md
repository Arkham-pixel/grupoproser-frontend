# 🧪 Prueba del Autoguardado - Guía Paso a Paso

## ✅ Pasos para Probar el Autoguardado

### 1️⃣ **Abrir el Formulario**
- Ve a uno de estos formularios:
  - Casos Complex: `/complex/agregar`
  - Casos Riesgo: Desde el dashboard de riesgos
  - Inspección: Desde el menú de inspecciones

### 2️⃣ **Llenar al Menos 3 Campos**
- **IMPORTANTE**: Debes llenar al menos 3 campos diferentes
- Ejemplos:
  - Nombre del cliente
  - Ciudad
  - Dirección
  - Aseguradora
  - Fecha

### 3️⃣ **Esperar el Prompt de Activación**
- Después de llenar 3 campos, debe aparecer un cuadro en la esquina superior derecha:
  - 💾 **"Protege tu trabajo"**
  - Botón: **"✓ Activar"**
  
- **HAZ CLIC EN "ACTIVAR"** ← Esto es CRÍTICO

### 4️⃣ **Verificar que se Activó**
- En la esquina inferior derecha debe aparecer:
  - 🟢 "Autoguardado activo"
  - O "Guardado hace unos segundos"

### 5️⃣ **Esperar al Menos 5 Segundos**
- El autoguardado guarda cada 30 segundos
- PERO también guarda cuando cierras la página
- Espera al menos 5 segundos para que se ejecute

### 6️⃣ **Cerrar la Página**
- Puedes:
  - Cerrar la pestaña
  - Refrescar la página (F5)
  - Navegar a otra página

### 7️⃣ **Volver a Abrir el Formulario**
- Abre el mismo formulario (mismo tipo, mismo ID si estabas editando)
- Debe aparecer un diálogo en el centro:
  - 💾 **"Datos guardados encontrados"**
  - Muestra cuántos campos y la fecha
  - Botones: **Restaurar** / **Descartar** / **Decidir después**

---

## 🐛 **Si NO Aparece el Diálogo**

### **Verifica estos puntos:**

#### A) **Consola del Navegador**
1. Presiona F12 para abrir las herramientas de desarrollo
2. Ve a la pestaña "Console"
3. Busca mensajes que digan:
   - ✅ `"💾 Datos guardados en localStorage: formulario-..."`
   - ✅ `"📦 Datos guardados encontrados"`
   - ❌ Errores en rojo

#### B) **LocalStorage**
1. En las herramientas de desarrollo (F12)
2. Ve a "Application" (o "Almacenamiento")
3. Expande "Local Storage" → tu dominio
4. Busca claves que empiecen con:
   - `autosave_formulario-complex-nuevo`
   - `autosave_formulario-riesgo-nuevo`
   - `autosave_formulario-inspeccion-nuevo`

#### C) **¿Activaste el Autoguardado?**
- El prompt de activación aparece UNA SOLA VEZ
- Si le diste "Ahora no", no se activará
- Debes hacer clic en "✓ Activar"

#### D) **¿Esperaste Suficiente?**
- Espera al menos 5 segundos antes de cerrar
- O llena más campos (eso también dispara un guardado)

---

## 🎯 **Prueba Rápida (2 minutos)**

1. **Abre el navegador en modo incógnito** (para empezar limpio)
2. **Inicia sesión** en la plataforma
3. **Ve a FormularioCasoComplex** (casos complex)
4. **Llena estos campos:**
   - Número de ajuste: `TEST123`
   - Aseguradora: Selecciona cualquiera
   - Responsable: Selecciona cualquiera
5. **Espera que aparezca el prompt** "💾 Protege tu trabajo"
6. **HAZ CLIC EN "ACTIVAR"**
7. **Espera 5 segundos**
8. **Cierra la pestaña completamente**
9. **Abre de nuevo el formulario**
10. **Debe aparecer el diálogo de restauración** ✨

---

## 📱 **Capturas de Pantalla Esperadas**

### **1. Prompt de Activación** (después de 3 campos)
```
┌─────────────────────────────────┐
│ 💾 Protege tu trabajo           │
│                                 │
│ Activa el autoguardado para     │
│ evitar perder información...    │
│                                 │
│  [✓ Activar]  [Ahora no]       │
└─────────────────────────────────┘
```

### **2. Indicador Activo** (esquina inferior derecha)
```
┌──────────────────────────────────┐
│ 🟢 Guardado hace unos segundos   │
│ [💾 Guardar ahora] [✕ Desactivar]│
└──────────────────────────────────┘
```

### **3. Diálogo de Restauración** (al volver)
```
┌─────────────────────────────────────┐
│    💾 Datos guardados encontrados   │
│                                     │
│  📊 Información guardada            │
│  5 campos completados               │
│                                     │
│  🕐 Última actualización            │
│  20 ene 2026, 14:30                │
│                                     │
│  [✓ Restaurar datos] [🗑️ Descartar]│
│         [Decidir después]           │
└─────────────────────────────────────┘
```

---

## ❓ **Preguntas de Diagnóstico**

1. ¿En qué formulario estás probando?
2. ¿Apareció el prompt de activación?
3. ¿Hiciste clic en "Activar"?
4. ¿Viste el indicador verde en la esquina inferior derecha?
5. ¿Qué ves en la consola del navegador (F12)?
6. ¿Qué ves en localStorage (F12 → Application)?

---

**Responde estas preguntas y podremos identificar exactamente dónde está el problema** 🔍
