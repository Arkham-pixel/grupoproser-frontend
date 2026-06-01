# Configuración de Google Maps API para Google Earth

## Pasos para obtener la API Key

1. **Ir a Google Cloud Console**
   - Visita: https://console.cloud.google.com/google/maps-apis

2. **Crear o seleccionar un proyecto**
   - Si no tienes un proyecto, crea uno nuevo
   - Selecciona el proyecto donde quieres habilitar las APIs

3. **Habilitar las APIs necesarias**
   - Ve a "APIs & Services" > "Library"
   - Busca y habilita:
     - **Maps JavaScript API** (obligatorio)
     - **Geocoding API** (obligatorio, para búsqueda de direcciones)
     - **Places API** (obligatorio, para autocompletado de direcciones)

4. **Crear una API Key**
   - Ve a "APIs & Services" > "Credentials"
   - Haz clic en "Create Credentials" > "API Key"
   - Copia la API key generada

5. **Configurar restricciones (recomendado)**
   - Haz clic en la API key creada
   - En "Application restrictions", selecciona "HTTP referrers"
   - Agrega los dominios permitidos:
     - `localhost:*` (para desarrollo)
     - `aplicacion.grupoproser.com.co/*` (para producción)
   - En "API restrictions", selecciona "Restrict key"
   - Selecciona solo las APIs que habilitaste

6. **Configurar la API Key en el proyecto**
   
   **Opción 1: Variable de entorno (Recomendado)**
   
   Crea un archivo `.env` en la carpeta `frontend/` con:
   ```
   VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
   ```
   
   O si usas Create React App:
   ```
   REACT_APP_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
   ```

   **Opción 2: Configuración directa (No recomendado para producción)**
   
   Puedes modificar directamente el componente `MapaGoogleEarth.jsx` y reemplazar:
   ```javascript
   apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
   ```
   por:
   ```javascript
   apiKey="tu_api_key_aqui"
   ```

## Costos

- **Plan gratuito**: $200 USD de crédito mensual
  - Equivale a aproximadamente 28,500 cargas de mapa estático
  - O 28,000 cargas de mapa dinámico (JavaScript API)

- **Después del crédito gratuito**:
  - Maps JavaScript API: $7 USD por cada 1,000 cargas
  - Geocoding API: $5 USD por cada 1,000 solicitudes

## Notas importantes

- ⚠️ **NUNCA** subas tu API key a un repositorio público
- ✅ Usa variables de entorno para almacenar la API key
- ✅ Configura restricciones en Google Cloud Console para mayor seguridad
- ✅ Monitorea el uso en Google Cloud Console para evitar costos inesperados

## Solución de problemas

### El mapa no carga
- Verifica que la API key esté correctamente configurada
- Verifica que las APIs estén habilitadas en Google Cloud Console
- Revisa la consola del navegador para ver errores específicos

### Error de CSP (Content Security Policy)
- El archivo `index.html` ya está configurado para permitir Google Maps
- Si persiste el error, verifica que los dominios estén correctos en el CSP

### Error de facturación
- Asegúrate de tener una cuenta de facturación configurada en Google Cloud
- El plan gratuito requiere una tarjeta de crédito (no se cobra hasta superar el crédito)

