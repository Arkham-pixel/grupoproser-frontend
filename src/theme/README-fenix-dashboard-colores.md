# Guía de colores para dashboards — ARNAL Data Flow (Fénix)

Documento de referencia para **todos los dashboards** del frontend (Express, Complex, Riesgos, etc.).  
Implementación centralizada: [`fenixChartPalette.js`](./fenixChartPalette.js).

---

## Línea visual

La plataforma usa una paleta corporativa coherente con `tailwind.config.js` → `theme.extend.colors.fenix`:

| Token | Hex | Uso en UI / gráficas |
|-------|-----|----------------------|
| `primario` | `#DC2626` | Botones, acentos, **una** serie o segmento destacado |
| `secundario` | `#EF4444` | Hover, modo oscuro (serie principal en líneas) |
| `texto` | `#1E1E1E` | Texto fuerte, barras/segmentos 2 |
| `textoMedio` | `#6B6B6B` | Subtítulos, series secundarias en líneas |
| `textoClaro` | `#9CA3AF` | Segmentos 3, ejes suaves |
| `info` | `#3878D9` | Azul — categorías adicionales |
| `exito` | `#2E8B57` | Verde — categorías adicionales |
| `editar` | `#F59E0B` | Ámbar — categorías adicionales |
| `advertencia` | `#E6B800` | Amarillo — alertas / categorías extra |
| `borde` / `fondo` | `#E6E6E6` / `#F5F5F7` | Tarjetas y fondos de dashboard |

**No usar arcoíris arbitrario** ni repetir rojo en varias categorías de la misma gráfica.

---

## Reglas para gráficas (Recharts u otra librería)

### 1. Tortas y barras (varias categorías)

- **Índice 0:** rojo corporativo **solo una vez** (primer segmento / barra).
- **Índices 1, 2, 3…:** escala de grises + azul / verde / ámbar / amarillo + tonos slate/teal/violeta de respaldo.
- **Nunca** volver a asignar `#DC2626` ni `#EF4444` en el índice 4, 5, etc. (ese era el bug típico: barra 1 y barra 5 ambas rojas).

```js
import {
  getFenixChartColor,
  buildPieLegendPayload,
} from '../../theme/fenixChartPalette.js';

// Cada celda / segmento
<Cell fill={getFenixChartColor(index, isDark)} />

// Leyenda alineada con los mismos colores
<Legend payload={buildPieLegendPayload(datos, 'nombreCampo', isDark)} />
```

### 2. Gráficas de líneas (tendencia / evolución)

- **Serie principal** (ej. casos totales): rojo `primario` (claro) / `secundario` (oscuro).
- **Series secundarias:** grises (`textoMedio`, `texto`), no rojo.

```js
import { getFenixLineChartColors } from '../../theme/fenixChartPalette.js';

const lineColors = getFenixLineChartColors(isDark);

<Line dataKey="casos" stroke={lineColors.casos} />
<Line dataKey="indemnizacion" stroke={lineColors.indemnizacion} />
<Line dataKey="reserva" stroke={lineColors.reserva} />
```

### 3. Modo oscuro

- Pasar `isDark` (p. ej. `theme === 'dark'` desde `ThemeContext`) a `getFenixChartColor` y `buildPieLegendPayload`.
- Bordes entre segmentos de torta: fondo de tarjeta (`#1A1A1A` oscuro / `#FFFFFF` claro).

### 4. Leyendas

- Usar `buildPieLegendPayload` o asignar el mismo color que en `<Cell />`.
- No dejar que Recharts genere la leyenda por defecto sin `payload` personalizado (suele pintar todo del mismo color).

---

## API rápida (`fenixChartPalette.js`)

| Export | Descripción |
|--------|-------------|
| `FENIX_PALETTE` | Objeto con todos los hex corporativos |
| `getFenixChartColor(index, isDark?)` | Color para barra/segmento por índice |
| `getFenixLineChartColors(isDark?)` | `{ casos, indemnizacion, reserva }` para líneas |
| `buildPieLegendPayload(items, labelKey, isDark?)` | Leyenda Recharts sincronizada |
| `FENIX_CHART_COLORS` | Lista plana (compatibilidad; preferir `getFenixChartColor`) |

---

## Checklist al crear o migrar un dashboard

- [ ] Importar colores desde `theme/fenixChartPalette.js`, no definir hex sueltos en el componente.
- [ ] Tortas/barras: `getFenixChartColor(index, isDark)` en cada `<Cell />`.
- [ ] Leyenda con `buildPieLegendPayload` o colores explícitos iguales a las celdas.
- [ ] Líneas: `getFenixLineChartColors(isDark)` para series temporales.
- [ ] Probar con **5+ categorías** y confirmar que el rojo no se repite.
- [ ] Probar en **modo claro y oscuro**.
- [ ] Tarjetas y tipografía: clases Fénix (`font-heading`, `font-body`, `border-fenix-primario`, `bg-fenix-primario`, etc.) como en Express / Inicio.

---

## Referencia implementada

- **Dashboard Express:** `frontend/src/components/SubcomponenteExpress/DashboardExpress.jsx`
- **Tokens UI Express:** `frontend/src/components/SubcomponenteExpress/expressFenixUi.js` (reexporta la paleta de gráficas)
- **Tailwind:** `frontend/tailwind.config.js` → `colors.fenix`

---

## Migración desde paletas antiguas

Si un dashboard tiene algo como:

```js
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', ...];
// o
const COLORS = ['#667eea', '#764ba2', ...];
```

Reemplazar por `getFenixChartColor(index, isDark)` y, en líneas, `getFenixLineChartColors(isDark)`.

---

*Última actualización: mayo 2026 — alineado con rediseño ARNAL Data Flow y módulo Express.*
