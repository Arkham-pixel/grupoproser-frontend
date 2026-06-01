import {
  FaBalanceScale,
  FaBan,
  FaBolt,
  FaBullseye,
  FaChartBar,
  FaChartLine,
  FaFire,
  FaBuilding,
  FaBullhorn,
  FaDollarSign,
  FaLaptop,
  FaSearch,
  FaShieldAlt,
  FaUsers,
} from 'react-icons/fa';

/** Categorías de riesgo (identificación + pestaña Categorías) */
export const CATEGORIAS_RIESGO = [
  { valor: 'estrategico', etiqueta: 'Estratégico', icon: FaBullseye, ejemplos: ['Decisiones malas', 'Cambios de mercado', 'Competencia'] },
  { valor: 'cumplimiento', etiqueta: 'Cumplimiento', icon: FaBalanceScale, ejemplos: ['Multas', 'Regulaciones', 'Contratos'] },
  { valor: 'reputacional', etiqueta: 'Reputacional', icon: FaBullhorn, ejemplos: ['Redes sociales', 'Imagen', 'Clientes'] },
  { valor: 'operativo', etiqueta: 'Operativo', icon: FaBuilding, ejemplos: ['Equipos', 'Personal', 'Procesos'] },
  { valor: 'financiero', etiqueta: 'Financiero', icon: FaDollarSign, ejemplos: ['Pérdidas', 'Flujo de caja', 'Inversión'] },
  { valor: 'tecnologico', etiqueta: 'Tecnológico', icon: FaLaptop, ejemplos: ['Ciberseguridad', 'Sistemas', 'Datos'] },
  { valor: 'corrupcion', etiqueta: 'Corrupción', icon: FaBan, ejemplos: ['Sobornos', 'Fraude', 'Abuso'] },
  { valor: 'ddhh', etiqueta: 'DDHH', icon: FaUsers, ejemplos: ['Discriminación', 'Maltrato', 'Derechos'] },
];

export const PASOS_INICIO_RAPIDO = [
  { paso: 1, titulo: 'Identifica', descripcion: 'Encuentra todos los riesgos ocultos en tu organización', icon: FaSearch },
  { paso: 2, titulo: 'Evalúa', descripcion: 'Mide qué tan peligrosos son realmente', icon: FaChartBar },
  { paso: 3, titulo: 'Visualiza', descripcion: 'Ve todo en un mapa de calor súper claro', icon: FaFire },
];

export const BENEFICIOS_HERRAMIENTA = [
  { titulo: 'Súper Rápido', descripcion: 'En 30 minutos tienes tu análisis completo', icon: FaBolt },
  { titulo: 'Precisión Total', descripcion: 'Criterios profesionales validados', icon: FaBullseye },
  { titulo: 'Resultados Claros', descripcion: 'Visualizaciones que cualquiera entiende', icon: FaChartLine },
  { titulo: 'Protección Real', descripcion: 'Previene problemas antes de que ocurran', icon: FaShieldAlt },
];
