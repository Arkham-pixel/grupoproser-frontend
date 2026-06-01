# Instalación de Dependencias para Exportación

Para que funcionen las funciones de exportación a PDF y Excel, necesitas instalar las siguientes dependencias:

## 1. Instalar Dependencias

```bash
npm install html2canvas jspdf xlsx
```

## 2. Dependencias Requeridas

### Para PDF:
- **html2canvas**: Captura el contenido HTML como imagen
- **jspdf**: Genera archivos PDF

### Para Excel:
- **xlsx**: Genera archivos Excel

## 3. Uso

Una vez instaladas las dependencias, los botones de exportación funcionarán automáticamente:

- **📄 Exportar PDF**: Captura la visualización completa del mapa de calor
- **📊 Exportar Excel**: Exporta los datos tabulares de los riesgos

## 4. Características

### PDF:
- Captura visual completa del mapa de calor
- Incluye tablas de riesgos inherentes y residuales
- Formato A4 horizontal
- Alta resolución (scale: 2)

### Excel:
- Datos estructurados de riesgos
- Separación entre riesgos inherentes y residuales
- Columnas: Riesgo, Probabilidad, Impacto, Clasificación, Nivel
- Formato profesional con anchos de columna optimizados

## 5. Notas

- Las dependencias se cargan dinámicamente para optimizar el rendimiento
- Los archivos se descargan automáticamente al navegador
- Nombres de archivo: `mapa-calor-riesgos.pdf` y `mapa-calor-riesgos.xlsx`
