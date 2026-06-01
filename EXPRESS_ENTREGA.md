# Entrega módulo Express – Reporte y Dashboard

## 1. Resumen ejecutivo
- **Objetivo:** centralizar el seguimiento de siniestros Express con visualización rápida, filtros avanzados y exportación a Excel.  
- **Entregables:** nuevo reporte con exportación (`/express/reporte`) y dashboard analítico (`/express/dashboard`).  
- **Beneficios clave:** visualización de estados, responsables y montos; soporte para comités y seguimiento operativo con datos actualizados desde el backend existente.

## 2. Componentes entregados
| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| Reporte Express | `frontend/src/components/SubcomponenteExpress/ReporteExpress.jsx` | Tabla con filtros de búsqueda, exportación a Excel y detalle de siniestros. |
| Dashboard Express | `frontend/src/components/SubcomponenteExpress/DashboardExpress.jsx` | Panel con métricas, indicadores y gráficas usando Recharts. |
| Servicio de datos | `frontend/src/services/expressService.js` | Funciones `getSiniestrosExpress` y `getSiniestrosExpressPaginado`. |
| Navegación | `Layout.jsx`, `App.jsx` | Menú y rutas protegidas para carga, reporte y dashboard. |

## 3. Flujo funcional
1. **Inicio de sesión** → menú Express disponible según el rol del usuario.  
2. **Carga de datos** (`/express/carga`) → formulario existente para registrar siniestros.  
3. **Reporte** (`/express/reporte`) → filtros por texto, responsable, estado, aseguradora y rango de fechas; exportación a Excel en un clic.  
4. **Dashboard** (`/express/dashboard`) → métricas resumidas y cuatro visualizaciones principales:  
   - Casos por estado (barras)  
   - Distribución por aseguradora (pie)  
   - Top responsables (barras horizontales)  
   - Tendencia mensual (líneas con casos, indemnización y reservas)  

## 4. Preparación de la demo
1. **Datos:** verificar que el backend (`localhost:3000`) tenga registros en `gsk3cAppsiniestroExpress`.  
2. **Aplicación:** levantar frontend (`npm run dev`) y backend (`npm run dev` o `pm2`).  
3. **Demostración sugerida:**
   - Ingresar como usuario Express.
   - Mostrar navegación del menú y acceder al dashboard.
   - Explicar tarjetas de métricas y recorrer cada gráfico.
   - Aplicar filtros (estado, responsable, rango de fechas) y mostrar actualizaciones en tiempo real.
   - Ir al reporte y evidenciar los mismos filtros + exportación a Excel.
   - Descargar el archivo Excel y abrirlo para validar la estructura.

## 5. Métricas disponibles
- **Indicadores clave:** total de casos, valor de indemnización acumulado, reserva acumulada, porcentaje de casos cerrados.  
- **Gráficas:**  
  - `Casos por estado`: identifica cuellos de botella en ciclos Express.  
  - `Distribución por aseguradora`: permite priorizar clientes según volumen.  
  - `Top responsables`: detecta carga por ajustador o necesidad de balance.  
  - `Tendencia mensual`: correlaciona volumen con montos económicos.  

## 6. Aspectos técnicos
- **Tecnologías:** React 18, TailwindCSS, Recharts, Vite.  
- **Consumo de datos:** `GET /api/siniestros-express?page=1&limit=1500&_t=<timestamp>` con normalización en frontend.  
- **Formato monetario:** `Intl.NumberFormat('es-CO', { currency: 'COP' })`.  
- **Mantenimiento:** los límites y filtros están centralizados en `DashboardExpress.jsx` y `ReporteExpress.jsx`.  

## 7. Próximos pasos sugeridos
- Implementar paginación incremental si el volumen supera los 1.500 registros.  
- Incorporar descarga en PDF con resumen del dashboard para comités.  
- Añadir alertas automáticas según estados críticos (ej. sin avances > X días).  

---
**Contacto para soporte:** Equipo de desarrollo Grupo Proser – módulo Express.  

