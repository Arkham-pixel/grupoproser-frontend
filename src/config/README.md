# 🔄 API con Detección Automática de Entorno

## 🎯 **¿Qué hace?**

Este archivo **detecta automáticamente** dónde está corriendo tu aplicación:
- **En desarrollo:** `VITE_API_BASE_URL` en `frontend/.env` (por defecto `http://localhost:3000`)
- **En producción:** `frontend/.env.production` → `https://arnaldbackend.grupoproser.com.co`

**No hay failover** - solo detección inteligente del entorno.

## 🚀 **Cómo funciona:**

### **Detección automática:**
- **localhost** o **127.0.0.1** → Desarrollo
- **Puerto 5173** (Vite) → Desarrollo  
- **Puerto 3000** (React) → Desarrollo
- **Cualquier otro** → Producción

### **Uso:**
```javascript
import { apiRequest, API_ENDPOINTS } from './apiConfig.js';

// Automáticamente usa la URL correcta según el entorno
const usuarios = await apiRequest(API_ENDPOINTS.USUARIOS);

// Crear caso
const nuevoCaso = await apiRequest(API_ENDPOINTS.CASOS_COMPLEX, {
  method: 'POST',
  body: JSON.stringify(datosCaso)
});

// Ver configuración actual
import { showConfig } from './apiConfig.js';
showConfig();
```

## 📋 **Endpoints disponibles:**

- `API_ENDPOINTS.USUARIOS` → `/usuarios`
- `API_ENDPOINTS.CASOS_COMPLEX` → `/casos`
- `API_ENDPOINTS.SINIESTROS` → `/siniestros`
- Y muchos más...

## ✅ **Ventajas:**

- **🔄 Detección automática** - No más URLs hardcodeadas
- **📱 Funciona en ambos entornos** - Solo subir archivos
- **🐛 Logs automáticos** - Fácil debugging
- **🛡️ Configuración simple** - Un solo archivo
