# Documentación de la Matriz de Riesgo Avanzada

## 📋 Resumen Ejecutivo

La carpeta `frontend/src/components/MatrizRiesgoAvanzada/` contiene un sistema completo de gestión de riesgos implementado como una aplicación React modular. Este sistema permite identificar, evaluar, visualizar y gestionar riesgos organizacionales de manera estructurada y profesional.

## 🏗️ Arquitectura General

### Estructura de Archivos

```
MatrizRiesgoAvanzada/
├── index.js                           # Punto de entrada y exportación
├── MatrizRiesgoAvanzada.jsx          # Componente principal (contenedor)
├── MatrizRiesgoAvanzada.css          # Estilos del componente principal
├── InformacionMatriz.jsx             # Sección de información y tutorial
├── InformacionMatriz.css             # Estilos de información
├── IdentificacionRiesgos.jsx         # Sección de identificación de riesgos
├── IdentificacionRiesgos.css         # Estilos de identificación
├── ValoracionRiesgos.jsx             # Sección de valoración de riesgos
├── ValoracionRiesgos.css             # Estilos de valoración
├── MapaCalorRiesgos.jsx              # Sección de mapa de calor
├── MapaCalorRiesgos.css              # Estilos del mapa de calor
├── GestionRiesgos.jsx                # Sección de gestión de riesgos
├── GestionRiesgos.css                # Estilos de gestión
└── AgregarFilaValoracion.jsx         # Componente auxiliar
```

## 🔄 Flujo de Datos y Conexiones

### Estado Global

El componente principal `MatrizRiesgoAvanzada.jsx` mantiene un estado global unificado:

```javascript
const [datosMatriz, setDatosMatriz] = useState({
  informacion: {},      // Datos de información general
  identificacion: {},   // Riesgos identificados
  valoracion: {},       // Valoraciones de riesgos
  mapaCalor: {},        // Datos del mapa de calor
  gestionRiesgos: {}    // Recomendaciones y seguimiento
});
```

### Comunicación Entre Componentes

1. **Props Down**: Cada componente recibe:
   - `datos`: Los datos específicos de su sección
   - `onDatosChange`: Función para actualizar el estado global

2. **State Up**: Los componentes actualizan el estado global llamando a `onDatosChange(seccion, nuevosDatos)`

3. **Persistencia**: Los datos se sincronizan automáticamente con `localStorage`

## 📱 Componentes y Funcionalidades

### 1. MatrizRiesgoAvanzada (Componente Principal)

**Archivo**: `MatrizRiesgoAvanzada.jsx`
**Responsabilidades**:
- Gestión del estado global de toda la aplicación
- Navegación entre secciones
- Persistencia de datos en localStorage
- Integración con servicios backend (guardado/exportación)
- Renderizado condicional de componentes secundarios

**Conexiones**:
- Importa todos los componentes secundarios
- Exporta acciones de guardado, reporte y exportación
- Maneja navegación lateral con botones por sección

### 2. InformacionMatriz

**Archivo**: `InformacionMatriz.jsx`
**Funcionalidad**: 
- Pantalla de bienvenida y tutorial del sistema
- Formulario de información general de la matriz
- Formulario de datos del ingeniero inspector
- Información introductoria sobre el proceso de gestión de riesgos

**Datos que maneja**:
- `informacion.nombreEmpresa`
- `informacion.responsable`
- `informacion.version`
- `informacion.descripcion`
- `informacion.ingeniero` (objeto con nombre, cargo, teléfono, email, empresa, dirección)

**Conexiones**:
- Recibe `datos.informacion` del estado global
- Actualiza vía `onDatosChange('informacion', nuevosDatos)`

### 3. IdentificacionRiesgos

**Archivo**: `IdentificacionRiesgos.jsx`
**Funcionalidad**:
- Identificación y categorización de riesgos por proceso
- Formulario estilo Excel para agregar riesgos
- Lista de riesgos identificados con categorías
- Resumen estadístico de riesgos por categoría

**Datos que maneja**:
- `identificacion.riesgos[]` (array de riesgos identificados)
- `identificacion.columnasAdicionales[]` (columnas personalizables)

**Estructura de un riesgo**:
```javascript
{
  id: string,
  numero: number,
  nombreProceso: string,
  tipoProceso: string,
  riesgoIdentificado: string,
  categorias: {
    estrategico: boolean,
    cumplimiento: boolean,
    reputacional: boolean,
    operativo: boolean,
    financiero: boolean,
    tecnologico: boolean,
    corrupcion: boolean,
    ddhh: boolean
  }
}
```

**Conexiones**:
- Recibe `datos.identificacion` del estado global
- Actualiza vía `onDatosChange('identificacion', nuevosDatos)`
- Proporciona datos a `ValoracionRiesgos` para valoración

### 4. ValoracionRiesgos

**Archivo**: `ValoracionRiesgos.jsx`
**Funcionalidad**:
- Valoración cuantitativa de probabilidad e impacto
- Evaluación de controles existentes
- Cálculo de riesgos inherentes y residuales
- Tabla estilo Excel con múltiples columnas

**Datos que maneja**:
- `valoracion.probabilidad{}` (objeto con probabilidades por riesgo)
- `valoracion.impacto{}` (impactos generales)
- `valoracion.impactosCategoria{}` (impactos por categoría)
- `valoracion.controles{}` (controles por riesgo)
- `valoracion.probResidual{}` (probabilidades residuales)
- `valoracion.impactosCategoriaResidual{}` (impactos residuales)
- `valoracion.valoraciones[]` (array completo de valoraciones)

**Conexiones**:
- Recibe `datos.valoracion` del estado global
- Recibe riesgos de `datos.identificacion.riesgos`
- Actualiza vía `onDatosChange('valoracion', nuevosDatos)`
- Proporciona datos calculados a `MapaCalorRiesgos`

### 5. MapaCalorRiesgos

**Archivo**: `MapaCalorRiesgos.jsx`
**Funcionalidad**:
- Visualización de riesgos en matriz de calor 5x5
- Cálculo automático de niveles de riesgo
- Exportación de datos como JSON
- Leyenda de colores y riesgos

**Datos que maneja**:
- `mapaCalor.riesgosInherentes[]` (riesgos sin controles)
- `mapaCalor.riesgosResiduales[]` (riesgos con controles)

**Conexiones**:
- Recibe `datos` completo del estado global
- Utiliza datos de `valoracion` para cálculos
- Actualiza vía `onDatosChange('mapaCalor', nuevosDatos)`

### 6. GestionRiesgos

**Archivo**: `GestionRiesgos.jsx`
**Funcionalidad**:
- Registro de recomendaciones de gestión
- Seguimiento de implementación con fechas
- Comentarios de progreso

**Datos que maneja**:
- `gestionRiesgos.recomendaciones[]` (array de recomendaciones)

**Estructura de una recomendación**:
```javascript
{
  id: number,
  recomendacion: string,
  fechaInicial: string,
  fechaImplementacion1: string,
  comentariosImplementacion1: string,
  fechaImplementacion2: string,
  comentariosImplementacion2: string
}
```

**Conexiones**:
- Recibe `datos.gestionRiesgos` del estado global
- Actualiza vía `onDatosChange('gestionRiesgos', nuevosDatos)`

### 7. AgregarFilaValoracion (Componente Auxiliar)

**Archivo**: `AgregarFilaValoracion.jsx`
**Funcionalidad**:
- Botón para agregar nuevas filas en valoración
- Componente reutilizable con estado deshabilitado

**Conexiones**:
- Utilizado por `ValoracionRiesgos` para agregar filas

## 🎨 Sistema de Estilos (CSS)

Cada componente tiene su archivo CSS correspondiente:

- **MatrizRiesgoAvanzada.css**: Layout principal, navegación, acciones
- **InformacionMatriz.css**: Hero section, tabs, formularios informativos
- **IdentificacionRiesgos.css**: Estilos de tabla Excel, formularios, categorías
- **ValoracionRiesgos.css**: Tabla compacta estilo Excel, badges, inputs
- **MapaCalorRiesgos.css**: Mapa de calor, leyendas, tooltips
- **GestionRiesgos.css**: Cards de recomendaciones, formularios

**Características comunes**:
- Diseño responsive con media queries
- Gradientes y efectos hover
- Paleta de colores consistente
- Animaciones sutiles

## 🔧 Servicios y Utilidades

### Servicios Backend
- `MatrizRiesgoService`: Guardado y recuperación de matrices
- `ReporteService`: Generación de reportes HTML y visualización

### Estado y Persistencia
- **localStorage**: Persistencia automática de datos
- **useState/useEffect**: Gestión de estado React
- **Debounced updates**: Optimización de actualizaciones

## 📊 Flujo de Trabajo del Usuario

1. **Información**: Usuario completa datos generales
2. **Identificación**: Identifica riesgos por proceso y categorías
3. **Valoración**: Evalúa probabilidad, impacto y controles
4. **Mapa de Calor**: Visualiza riesgos en matriz de calor
5. **Gestión**: Registra recomendaciones y seguimiento

## 🔄 Ciclo de Vida de los Datos

1. **Inicialización**: Carga desde localStorage
2. **Actualización**: Cambios se propagan al estado global
3. **Persistencia**: Auto-guardado en localStorage
4. **Sincronización**: Datos disponibles entre componentes
5. **Exportación**: Posibilidad de guardar como JSON/CSV/HTML

## 🚀 Puntos de Integración

- **Backend**: Servicios para guardar matrices y generar reportes
- **localStorage**: Persistencia local del estado
- **React Context**: Potencial futura migración a context global
- **Servicios externos**: APIs para cálculos avanzados

## 📝 Notas de Desarrollo

- **Modularidad**: Cada sección es un componente independiente
- **Reutilización**: Componentes auxiliares como `AgregarFilaValoracion`
- **Escalabilidad**: Fácil agregar nuevas secciones
- **Mantenibilidad**: Separación clara de responsabilidades
- **Performance**: Optimizaciones con memoización y debounced updates

---

## 🔍 Explicación Detallada: Identificación de Riesgos

### ¿Qué es la Identificación de Riesgos?

La identificación de riesgos es el **primer paso fundamental** en cualquier proceso de gestión de riesgos. Consiste en detectar, reconocer y describir los riesgos potenciales que podrían afectar el logro de los objetivos organizacionales.

### Funcionalidades del Componente `IdentificacionRiesgos.jsx`

#### 1. **Formulario Estilo Excel**
- **Interfaz intuitiva**: Tabla similar a Excel con columnas para proceso, tipo, riesgo y categorías
- **Auto-completado inteligente**: El tipo de proceso se selecciona automáticamente basado en el nombre del proceso
- **Categorización múltiple**: Cada riesgo puede pertenecer a varias categorías simultáneamente

#### 2. **Datos de Procesos Predefinidos**
El sistema incluye una base de datos de procesos organizacionales:

```javascript
const datosProcesos = [
  { nombre: 'Gerencia', tipo: 'Estratégico' },
  { nombre: 'Sistemas integrados de gestión', tipo: 'Estratégico' },
  { nombre: 'Deshuese Bovino, Ovino, Caprino', tipo: 'Misionales' },
  // ... más procesos
];
```

#### 3. **Categorías de Riesgo (8 categorías)**
Cada riesgo se puede clasificar en:
- **Estratégico**: Decisiones de alto nivel
- **Cumplimiento**: Normas y regulaciones
- **Reputacional**: Imagen de la organización
- **Operativo**: Procesos diarios
- **Financiero**: Aspectos económicos
- **Tecnológico**: Sistemas y tecnología
- **Corrupción**: Ética y corrupción
- **DDHH**: Derechos humanos

#### 4. **Flujo de Trabajo**
1. **Selección de proceso**: Dropdown con procesos predefinidos
2. **Auto-completado**: Tipo de proceso se asigna automáticamente
3. **Descripción del riesgo**: Texto libre para detallar el riesgo específico
4. **Categorización**: Checkboxes para múltiples categorías
5. **Procesamiento**: Botón para agregar riesgos a la lista final

### Estructura de Datos Generada

```javascript
{
  id: "riesgo-123456789-1",
  numero: 1,
  nombreProceso: "Gestión comercial",
  tipoProceso: "Misionales",
  riesgoIdentificado: "Falta de demanda en productos específicos",
  categorias: {
    estrategico: false,
    cumplimiento: false,
    reputacional: true,
    operativo: true,
    financiero: true,
    tecnologico: false,
    corrupcion: false,
    ddhh: false
  }
}
```

### Conexiones y Dependencias
- **Entrada**: Ninguna (primer paso del proceso)
- **Salida**: Array de riesgos identificados que alimenta la valoración
- **Persistencia**: Datos guardados en `datos.identificacion.riesgos[]`

---

## 📊 Explicación Detallada: Valoración de Riesgos

### ¿Qué es la Valoración de Riesgos?

La valoración de riesgos es el proceso de **asignar valores cuantitativos** a la probabilidad de ocurrencia y al impacto potencial de cada riesgo identificado. Esta evaluación permite priorizar riesgos y tomar decisiones informadas sobre su gestión.

### Metodología de Valoración

#### 1. **Escalas de Medición**

**Probabilidad (1-5)**:
- 1: Muy Baja (Remoto - máximo 1 vez/año)
- 2: Baja (Poco probable - 1 vez/año)
- 3: Media (Posible - 1 vez/6 meses)
- 4: Alta (Probable - 1 vez/3 meses)
- 5: Muy Alta (Casi seguro - 1 vez/mes)

**Impacto por Categoría (1-5)**:
- **Económico**: Pérdidas financieras
- **Operativo**: Interrupción de procesos
- **Reputacional**: Daño a la imagen
- **Legal**: Sanciones y multas

#### 2. **Riesgo Inherente vs Residual**

- **Inherente**: Riesgo sin considerar controles existentes
- **Residual**: Riesgo después de aplicar controles

### Funcionalidades del Componente `ValoracionRiesgos.jsx`

#### 1. **Tabla de Valoración Completa**
La tabla incluye múltiples secciones:

**Riesgo Inherente**:
- Probabilidad base
- Impacto por categorías (Económico, Operativo, Reputacional, Legal)
- Sumatoria de impacto (máximo de las categorías)
- Calificación cuantitativa (Probabilidad × Impacto)

**Controles Existentes**:
- ¿Existen controles? (Sí/No)
- Descripción de controles
- Evaluación de efectividad:
  - Manuales y procedimientos
  - Tipo de control (Preventivo/Detectivo/Correctivo)
  - Grado de automatización
  - Responsable asignado
  - Periodicidad de ejecución

**Cálculos Automáticos**:
- Probabilidad después de controles: `Probabilidad × (1 - %Controles/100)`
- Impacto residual: Aplicación de factor de reducción si los controles disminuyen impacto

#### 2. **Fórmulas de Cálculo**

```javascript
// Probabilidad residual
probResidual = probInherente × (1 - sumaControles/100)

// Impacto residual (si controles disminuyen impacto)
impactoResidual = impactoInherente × (1 - sumaControles/100)

// Valoración cuantitativa residual
valoracionResidual = probResidual × max(impactosCategoriaResidual)
```

#### 3. **Clasificación Final**
Basada en la valoración cuantitativa residual:
- **ACEPTABLE**: ≤ 4 puntos
- **TOLERABLE**: 5-8 puntos
- **ALTO**: 9-12 puntos
- **CRÍTICO**: > 12 puntos

### Tratamiento Recomendado por Nivel

| Nivel | Color | Tratamiento |
|-------|-------|-------------|
| ACEPTABLE | 🟢 Verde | Asumir el riesgo |
| TOLERABLE | 🟡 Amarillo | Monitorear y revisar periódicamente |
| ALTO | 🟠 Naranja | Reducir, evitar, transferir o compartir |
| CRÍTICO | 🔴 Rojo | Reducir, evitar, transferir o compartir |

### Estructura de Datos de Valoración

```javascript
{
  id: "val-123456789",
  numero: 1,
  nombreProceso: "Gestión comercial",
  riesgoIdentificado: "Falta de demanda",
  probabilidad: 3,
  impacto: 4,
  impactosCategoria: {
    economico: 4,
    operativo: 3,
    reputacional: 2,
    legal: 1
  },
  sumImpacto: 4,
  controles: {
    existen: "Sí",
    descripcion: "Sistema de pronósticos de venta",
    sumControles: 45.5
  },
  probResidual: 3,
  impactosCategoriaResidual: {
    economico: 3,
    operativo: 2,
    reputacional: 2,
    legal: 1
  },
  sumImpactoResidual: 3,
  nivelRiesgo: { nivel: "TOLERABLE", color: "#ffc107" }
}
```

### Conexiones y Dependencias
- **Entrada**: Riesgos identificados de `IdentificacionRiesgos`
- **Salida**: Valoraciones completas que alimentan el `MapaCalorRiesgos`
- **Persistencia**: Datos en `datos.valoracion`

---

## 🔥 Explicación Detallada: Mapa de Calor de Riesgos

### ¿Qué es un Mapa de Calor?

Un mapa de calor es una **representación visual matricial** que combina la probabilidad y el impacto de cada riesgo en una cuadrícula de colores. Es una herramienta estratégica que permite:

- **Priorizar riesgos** de un vistazo
- **Identificar patrones** de concentración de riesgos
- **Tomar decisiones** basadas en colores intuitivos
- **Comunicar riesgos** a stakeholders no técnicos

### Metodología del Mapa 5×5

#### 1. **Ejes de la Matriz**

- **Eje X (Horizontal)**: Probabilidad (1-5)
- **Eje Y (Vertical)**: Impacto (1-5)
- **Celdas**: 25 posiciones posibles (5×5)

#### 2. **Esquema de Colores**

| Rango | Color | Nivel | Significado |
|-------|-------|-------|-------------|
| 1-4 | 🟢 Verde | Bajo | Riesgo aceptable |
| 5-9 | 🟡 Amarillo | Medio-Bajo | Monitoreo requerido |
| 10-16 | 🟠 Naranja | Medio-Alto | Atención prioritaria |
| 17-25 | 🔴 Rojo | Alto | Acción inmediata |

#### 3. **Lógica de Color por Celda**

```javascript
// Patrón específico de la matriz
function obtenerColorCelda(probabilidad, impacto) {
  if (impacto === 5) {
    return probabilidad <= 2 ? 'yellow' : 'red';  // Fila 5
  }
  if (impacto === 4) {
    return probabilidad === 1 ? 'yellow' : 'red'; // Fila 4
  }
  if (impacto === 3) {
    return probabilidad <= 3 ? 'green' : 'red';  // Fila 3
  }
  if (impacto === 2) {
    return probabilidad <= 4 ? 'green' : 'orange'; // Fila 2
  }
  if (impacto === 1) {
    return probabilidad <= 3 ? 'green' : 'yellow'; // Fila 1
  }
}
```

### Funcionalidades del Componente `MapaCalorRiesgos.jsx`

#### 1. **Dos Tipos de Mapa**

**Mapa Inherente**:
- Riesgos sin considerar controles existentes
- Muestra el riesgo "bruto" o natural
- Basado en probabilidad e impacto iniciales

**Mapa Residual**:
- Riesgos después de aplicar controles
- Muestra el riesgo "neto" o efectivo
- Basado en probabilidades e impactos residuales

#### 2. **Visualización Interactiva**

- **Celdas coloreadas**: Cada celda representa una combinación probabilidad-impacto
- **Puntos de riesgo**: Marcadores circulares con ID del riesgo
- **Tooltips informativos**: Información detallada al pasar el mouse
- **Leyenda clara**: Explicación de colores y niveles

#### 3. **Cálculos Automáticos**

```javascript
// Cálculo de nivel de riesgo
const calcularNivelRiesgo = (prob, imp) => {
  const clasificacion = prob * imp;
  if (clasificacion <= 4) return { nivel: 'Bajo', color: '#28a745' };
  if (clasificacion <= 9) return { nivel: 'Medio', color: '#ffc107' };
  if (clasificacion <= 16) return { nivel: 'Alto', color: '#fd7e14' };
  return { nivel: 'Crítico', color: '#dc3545' };
};
```

#### 4. **Interpretación de Resultados**

**🟢 Verde (Bajo)**:
- Riesgos aceptables
- Monitoreo rutinario
- No requieren acción inmediata

**🟡 Amarillo (Medio)**:
- Riesgos moderados
- Requieren atención y planificación
- Desarrollo de planes de mitigación

**🟠 Naranja (Alto)**:
- Riesgos significativos
- Acción prioritaria requerida
- Implementación de controles preventivos

**🔴 Rojo (Crítico)**:
- Riesgos que amenazan la supervivencia
- Acción inmediata obligatoria
- Posible detención de operaciones

### Estructura de Datos del Mapa

```javascript
{
  id: "R1",
  numero: 1,
  probabilidad: 3,  // Para posicionamiento en eje X
  impacto: 4,       // Para posicionamiento en eje Y
  clasificacion: 12, // Probabilidad × Impacto
  nivel: "Alto",
  color: "#fd7e14",
  descripcion: "Descripción del riesgo"
}
```

### Funcionalidades Adicionales

#### 1. **Exportación de Datos**
- **JSON**: Estructura completa para análisis posterior
- **Actualización automática**: Botón para refrescar datos desde valoración

#### 2. **Leyenda Interactiva**
- Identificación de riesgos por código (R1, R2, R3...)
- Descripciones detalladas
- Estadísticas por nivel de riesgo

#### 3. **Validación de Datos**
- Mensaje informativo si no hay datos de valoración
- Verificación automática de integridad de datos

### Conexiones y Dependencias

- **Entrada**: Datos completos de valoración de `ValoracionRiesgos`
- **Salida**: Visualización final y datos para reportes
- **Persistencia**: Datos en `datos.mapaCalor`
- **Integración**: Alimenta reportes y exportaciones finales

### Beneficios Estratégicos

1. **Toma de Decisiones**: Priorización visual inmediata
2. **Comunicación**: Lenguaje universal de colores
3. **Optimización de Recursos**: Enfoque en riesgos críticos
4. **Cumplimiento Regulatorio**: Evidencia de gestión estructurada
5. **Mejora Continua**: Base para seguimiento y reevaluación

---

*Esta documentación proporciona una visión completa de cómo está estructurado y conectado el sistema de Matriz de Riesgo Avanzada. Para modificaciones o expansiones, se recomienda mantener la arquitectura modular y el patrón de comunicación vía props.*