# 📸 Estándar de Manejo de Imágenes para Todos los Formularios

## ✅ Solución Implementada

Se ha creado un sistema centralizado de manejo de imágenes en `imageUtils.js` que debe usarse en **TODOS** los formularios que manejen fotos.

## 📋 Formularios Actualizados

Los siguientes formularios ya usan el estándar:

1. ✅ **Formulario de Ajustes** (`InspeccionFotograficaAjuste.jsx`)
2. ✅ **Formulario de Propiedades** (`FormularioInspeccionPropiedades.jsx`)
3. ✅ **Formulario de Maquinaria** (`RegistroFotograficoMaquinaria.jsx`)
4. ✅ **Formulario de Puertos** (`RegistroFotograficoPuertos.jsx`)
5. ✅ **Formulario de Inspección General** (`RegistroFotografico.jsx`)

## 🚀 Cómo Usar en Nuevos Formularios

### 1. Importar las utilidades

```javascript
import { getImageUrl, createImageErrorHandler } from '../utils/imageUtils';
```

### 2. Obtener URL de imagen

```javascript
// En lugar de construir URLs manualmente:
const imageUrl = getImageUrl(imagen);
// Esto automáticamente maneja:
// - blob: URLs
// - base64 URLs
// - Rutas del servidor (/uploads/...)
// - Fallbacks entre BASE_URL y PROD_URL
```

### 3. Manejar errores de carga

```javascript
<img
  src={imageUrl}
  alt="Descripción"
  onError={createImageErrorHandler(imagen, (imgElement, imagenData) => {
    // Callback opcional cuando todas las URLs fallan
    // Por defecto muestra "Imagen no disponible en el servidor"
  })}
/>
```

## 📝 Ejemplo Completo

```javascript
import React from 'react';
import { getImageUrl, createImageErrorHandler } from '../utils/imageUtils';

function MiComponenteFotos({ imagenes }) {
  return (
    <div>
      {imagenes.map((imagen) => {
        const imageUrl = getImageUrl(imagen);
        
        return (
          <div key={imagen.id}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={imagen.descripcion || 'Imagen'}
                onError={createImageErrorHandler(imagen)}
              />
            ) : (
              <div>Sin imagen</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## 🔧 Funciones Disponibles

### `getImageUrl(imagen)`
Obtiene la primera URL disponible para una imagen.
- Prioridad: `url` → `base64` → `ruta` (con fallbacks)

### `getImageUrlCandidates(imagen)`
Obtiene todas las URLs candidatas en orden de prioridad.
- Útil para fallbacks automáticos

### `createImageErrorHandler(imagen, onAllFailed?)`
Crea un handler que intenta múltiples URLs automáticamente.
- Intenta todas las URLs candidatas antes de mostrar error
- Muestra mensaje claro si todas fallan

### `hasValidServerPath(imagen)`
Verifica si una imagen tiene una ruta válida del servidor.

### `normalizeImage(imagen)`
Normaliza una imagen a estructura consistente.

## ⚠️ Importante

- **SIEMPRE** usa `getImageUrl` y `createImageErrorHandler` para imágenes
- **NO** construyas URLs manualmente con `BASE_URL` o `PROD_URL`
- **NO** implementes tu propio manejo de errores de imágenes
- Las utilidades manejan automáticamente:
  - Fallbacks entre dev/prod
  - blob: URLs
  - base64 URLs
  - Rutas del servidor
  - Mensajes de error consistentes

## 🔄 Migración de Formularios Existentes

Si un formulario aún no usa estas utilidades:

1. Importa las funciones
2. Reemplaza construcción manual de URLs con `getImageUrl`
3. Reemplaza `onError` manual con `createImageErrorHandler`
4. Prueba que las imágenes carguen correctamente

## 📦 Ubicación

`frontend/src/utils/imageUtils.js`
