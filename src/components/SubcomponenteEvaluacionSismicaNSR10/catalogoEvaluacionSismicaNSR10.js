/**
 * Plantilla exacta: Plantilla_Evaluacion_Sismica_NSR10.xlsx
 * Hojas: Listas | Portada | Evaluación | Dictamen | Presupuesto
 */

import {
  SMMLV_DEFAULT,
  resolverSmmlvPorAnio,
} from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
import { compactarMontosEnLineaCOP } from '../../utils/parsearMontoCOP.js';

/** Hoja Listas · Estado → Puntaje */
export const ESTADOS_DANO_NSR10 = [
  { label: 'Sin daño', puntaje: 0 },
  { label: 'Daño leve', puntaje: 1 },
  { label: 'Daño moderado', puntaje: 2 },
  { label: 'Daño severo', puntaje: 3 },
  { label: 'Colapso / peligro inminente', puntaje: 4 },
  { label: 'No aplica', puntaje: -1 },
  { label: 'No inspeccionado', puntaje: -1 },
];

/** Hoja Listas · Categoría operativa / Habitabilidad (referencia) */
export const CATEGORIAS_OPERATIVAS_NSR10 = [
  { categoria: 'Nivel 0 - Sin daño', habitabilidad: 'Habitable' },
  { categoria: 'Nivel 1 - Daño leve', habitabilidad: 'Habitable' },
  { categoria: 'Nivel 2 - Daño moderado', habitabilidad: 'Habitación restringida' },
  { categoria: 'Nivel 3 - Daño severo', habitabilidad: 'Inhabitable' },
  { categoria: 'Nivel 4 - Colapso / Peligro inminente', habitabilidad: 'Inhabitable' },
];

export const URGENCIAS_NSR10 = ['Bajo', 'Medio', 'Alto', 'Crítico'];

export const UNIDADES_PRESUPUESTO_NSR10 = [
  'm²',
  'm³',
  'ml',
  'und',
  'kg',
  'día',
  'gl',
  'mes',
  'juego',
  'kit',
  'punto',
  'otro',
];

export const COMPONENTES_LISTA_NSR10 = [
  'Condición general',
  'Columnas',
  'Vigas',
  'Conexiones',
  'Muros',
  'Bahareque',
  'Cubierta',
  'Cimentación',
  'Pisos',
  'Geotecnia',
  'No estructural',
  'Redes',
  'Preexistencias',
];

export const CAPITULOS_PRESUPUESTO_NSR10 = [
  'Medidas temporales',
  'Demoliciones',
  'Estructura',
  'Mampostería / Bahareque',
  'Cubierta',
  'Acabados',
  'Redes',
  'Geotecnia',
  'Equipos / Anclajes',
  'Limpieza / Retiro',
  'Otros',
];

export const PRIORIDADES_PRESUPUESTO_NSR10 = ['Bajo', 'Medio', 'Alto', 'Crítico'];

/** Tipos de inmueble / riesgo para liquidar contenidos */
export const TIPOS_INMUEBLE_CONTENIDOS_NSR10 = [
  'Casa',
  'Apartamento',
  'Industria',
  'Oficina',
  'Local comercial',
  'Bodega',
  'Finca / rural',
  'Otro',
];

export const CATEGORIAS_CONTENIDOS_NSR10 = [
  'Artículo de póliza',
  'Electrodomésticos',
  'Electrónicos',
  'Muebles',
  'Textiles / ropa',
  'Menaje / vajilla',
  'Cocina',
  'Baño',
  'Herramientas',
  'Maquinaria / equipo',
  'Inventario / mercancía',
  'Oficina / equipo de cómputo',
  'Otros',
];

/** Artículos de póliza (misma tabla de contenidos; no es una tabla nueva). */
export const ARTICULOS_ASEGURADOS_POLIZA = [
  { id: 'poliza_eee_fijo', articulo: 'Equipo eléctrico y electrónico fijo' },
  { id: 'poliza_contenidos', articulo: 'Contenidos' },
  { id: 'poliza_mercancias', articulo: 'Mercancías' },
  { id: 'poliza_edificio', articulo: 'Edificio' },
  { id: 'poliza_maquinaria', articulo: 'Maquinaria y equipo' },
  { id: 'poliza_dinero', articulo: 'Dinero en efectivo' },
  { id: 'poliza_lucro', articulo: 'Lucro cesante' },
];

/**
 * Coberturas parametrizables. Terremoto aplica 3% del valor asegurable, mínimo 3 SMMLV.
 * Otras coberturas se pueden agregar aquí sin cambiar la tabla.
 */
export const COBERTURAS_ARTICULO_ASEGURADO = [
  { id: 'terremoto', label: 'Terremoto' },
  { id: 'incendio', label: 'Incendio' },
  { id: 'inundacion', label: 'Inundación' },
  { id: 'amit', label: 'AMIT' },
  { id: 'huracan', label: 'Huracán / vendaval' },
  { id: 'otro', label: 'Otra' },
];

export const REGLAS_DEDUCIBLE_POR_COBERTURA = {
  terremoto: {
    porcentaje: 3,
    cantidadSMMLV: 3,
    modo: 'max_pct_minimo',
    tipoMinimo: 'SMMLV',
  },
};

/** Ambas vías quedan activas; se aplica el mayor. Los valores viejos se leen por compat. */
export const MODO_DEDUCIBLE_NSR10 = {
  GENERAL: 'general',
  POR_ARTICULO: 'por_articulo',
  AMBOS: 'ambos',
};

/**
 * CAT NSR-10: AIU por defecto 25% (editable). En Colombia AIU ya incluye
 * Administración, Imprevistos y Utilidad; imprevistos e impuestos no se muestran aparte.
 * Alfa (20%) y BBVA (AIU fijo) no usan este objeto.
 */
export const AIU_PORCENTAJE_DEFAULT_NSR10_CAT = 0.25;
export const RECARGOS_PRESUPUESTO_NSR10_CAT = {
  aiuDefault: AIU_PORCENTAJE_DEFAULT_NSR10_CAT,
  ocultarImprevistos: true,
  ocultarImpuestos: true,
};

export function aplicarRecargosPresupuestoNsr10(presupuesto = {}, recargos = null) {
  if (!recargos) return presupuesto;
  const next = { ...(presupuesto || {}) };
  if (recargos.aiuFijo != null && Number.isFinite(Number(recargos.aiuFijo))) {
    next.aiuPorcentaje = Number(recargos.aiuFijo);
  } else if (
    recargos.aiuDefault != null &&
    Number.isFinite(Number(recargos.aiuDefault)) &&
    (next.aiuPorcentaje == null || next.aiuPorcentaje === '')
  ) {
    next.aiuPorcentaje = Number(recargos.aiuDefault);
  }
  if (recargos.ocultarImprevistos) next.imprevistosPorcentaje = 0;
  if (recargos.ocultarImpuestos) next.impuestosPorcentaje = 0;
  return next;
}

export function aplicarRecargosEnEvaluacionNsr10(
  evalData = {},
  recargos = RECARGOS_PRESUPUESTO_NSR10_CAT
) {
  const next = evalData && typeof evalData === 'object' ? { ...evalData } : {};
  next.presupuesto = aplicarRecargosPresupuestoNsr10(next.presupuesto, recargos);
  return next;
}

export function resolverModoDeducibleNsr() {
  return MODO_DEDUCIBLE_NSR10.AMBOS;
}

/** Presupuesto: el usuario elige metodología. Contenidos siempre va por artículo. */
export function resolverModoDeduciblePresupuesto(liquidacion = {}, resumen = {}) {
  const raw = String(liquidacion?.modoDeduciblePresupuesto || '').trim();
  if (raw === MODO_DEDUCIBLE_NSR10.GENERAL) return MODO_DEDUCIBLE_NSR10.GENERAL;
  if (raw === MODO_DEDUCIBLE_NSR10.POR_ARTICULO) return MODO_DEDUCIBLE_NSR10.POR_ARTICULO;
  if (resumen?.usaDeduciblePorArticuloPresupuesto) return MODO_DEDUCIBLE_NSR10.POR_ARTICULO;
  return MODO_DEDUCIBLE_NSR10.GENERAL;
}

export function esModoDeduciblePorArticuloPresupuesto(liquidacion = {}, resumen = {}) {
  return (
    resolverModoDeduciblePresupuesto(liquidacion, resumen) ===
    MODO_DEDUCIBLE_NSR10.POR_ARTICULO
  );
}

/** Columnas y suma por ítem siempre disponibles en contenidos. */
export function esModoDeduciblePorArticuloNsr() {
  return true;
}

/** Si hay cálculo por artículo, no se mezcla el SMMLV/% general: solo se suma esa vía. */
export function argsDeduciblesPorArticuloDiagrama(liquidacion = {}, resumen = {}) {
  const usaPresPorArticulo = esModoDeduciblePorArticuloPresupuesto(liquidacion, resumen);
  return {
    deducibleContenidosPorArticulos:
      resumen.deduciblePorArticulosContenidos ?? resumen.deduciblePorArticulos ?? 0,
    deduciblePresupuestoPorArticulos: usaPresPorArticulo
      ? resumen.deduciblePorArticulosPresupuesto ?? 0
      : 0,
    usaDeduciblePorArticuloContenidos: Boolean(resumen.usaDeduciblePorArticulo),
    usaDeduciblePorArticuloPresupuesto: usaPresPorArticulo,
    contenidosNetoPorArticulo: resumen.contenidos?.valorAIndemnizar,
    presupuestoNetoPorArticulo: usaPresPorArticulo
      ? resumen.presupuesto?.valorAIndemnizar != null &&
        resumen.presupuesto?.valorAIndemnizar !== ''
        ? resumen.presupuesto.valorAIndemnizar
        : resumen.totalPresupuesto
      : null,
  };
}

export const ESTADOS_CONTENIDO_NSR10 = [
  'Dañado',
  'Destruido',
  'Perdido',
  'Reparable',
  'Sin daño',
];

export const UNIDADES_CONTENIDOS_NSR10 = ['und', 'juego', 'par', 'kg', 'm', 'm²', 'lt', 'gl', 'otro'];

/**
 * Catálogo inicial de contenidos (casa, apartamento, industria, oficina…).
 * El usuario puede elegir uno o agregar un ítem libre si no está en la lista.
 */
export const CATALOGO_CONTENIDOS_NSR10 = [
  ...ARTICULOS_ASEGURADOS_POLIZA.map((a) => ({
    id: a.id,
    categoria: 'Artículo de póliza',
    articulo: a.articulo,
    unidad: 'glb',
    tipos: TIPOS_INMUEBLE_CONTENIDOS_NSR10,
  })),
  // Electrodomésticos / casa-apartamento
  { id: 'nevera', categoria: 'Electrodomésticos', articulo: 'Nevera / refrigerador', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Finca / rural'] },
  { id: 'lavadora', categoria: 'Electrodomésticos', articulo: 'Lavadora', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Finca / rural'] },
  { id: 'secadora', categoria: 'Electrodomésticos', articulo: 'Secadora', unidad: 'und', tipos: ['Casa', 'Apartamento'] },
  { id: 'estufa', categoria: 'Electrodomésticos', articulo: 'Estufa / cocina', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Local comercial', 'Finca / rural'] },
  { id: 'horno', categoria: 'Electrodomésticos', articulo: 'Horno', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Local comercial'] },
  { id: 'microondas', categoria: 'Electrodomésticos', articulo: 'Microondas', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Local comercial'] },
  { id: 'lavavajillas', categoria: 'Electrodomésticos', articulo: 'Lavavajillas', unidad: 'und', tipos: ['Casa', 'Apartamento'] },
  { id: 'aire_acondicionado', categoria: 'Electrodomésticos', articulo: 'Aire acondicionado', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Local comercial', 'Industria'] },
  { id: 'ventilador', categoria: 'Electrodomésticos', articulo: 'Ventilador', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Local comercial'] },
  { id: 'calentador', categoria: 'Electrodomésticos', articulo: 'Calentador de agua', unidad: 'und', tipos: ['Casa', 'Apartamento'] },
  { id: 'aspiradora', categoria: 'Electrodomésticos', articulo: 'Aspiradora', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina'] },
  // Electrónicos
  { id: 'tv', categoria: 'Electrónicos', articulo: 'Televisor', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Local comercial', 'Oficina'] },
  { id: 'equipo_sonido', categoria: 'Electrónicos', articulo: 'Equipo de sonido', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Local comercial'] },
  { id: 'computador', categoria: 'Electrónicos', articulo: 'Computador de escritorio', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Industria'] },
  { id: 'portatil', categoria: 'Electrónicos', articulo: 'Portátil / laptop', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Industria'] },
  { id: 'impresora', categoria: 'Electrónicos', articulo: 'Impresora / multifuncional', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Industria'] },
  { id: 'tablet', categoria: 'Electrónicos', articulo: 'Tablet', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina'] },
  { id: 'celular', categoria: 'Electrónicos', articulo: 'Celular', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina'] },
  { id: 'router', categoria: 'Electrónicos', articulo: 'Router / modem', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Local comercial'] },
  // Muebles
  { id: 'cama', categoria: 'Muebles', articulo: 'Cama / camarote', unidad: 'und', tipos: ['Casa', 'Apartamento'] },
  { id: 'colchon', categoria: 'Muebles', articulo: 'Colchón', unidad: 'und', tipos: ['Casa', 'Apartamento'] },
  { id: 'sofa', categoria: 'Muebles', articulo: 'Sofá / sala', unidad: 'juego', tipos: ['Casa', 'Apartamento'] },
  { id: 'comedor', categoria: 'Muebles', articulo: 'Comedor (mesa y sillas)', unidad: 'juego', tipos: ['Casa', 'Apartamento'] },
  { id: 'closet', categoria: 'Muebles', articulo: 'Closet / ropero', unidad: 'und', tipos: ['Casa', 'Apartamento'] },
  { id: 'escritorio', categoria: 'Muebles', articulo: 'Escritorio', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina'] },
  { id: 'silla_oficina', categoria: 'Muebles', articulo: 'Silla de oficina', unidad: 'und', tipos: ['Oficina', 'Casa', 'Apartamento'] },
  { id: 'estanteria', categoria: 'Muebles', articulo: 'Estantería / biblioteca', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Bodega'] },
  { id: 'mesa_centro', categoria: 'Muebles', articulo: 'Mesa de centro', unidad: 'und', tipos: ['Casa', 'Apartamento'] },
  // Textiles
  { id: 'ropa', categoria: 'Textiles / ropa', articulo: 'Ropa / vestuario', unidad: 'gl', tipos: ['Casa', 'Apartamento'] },
  { id: 'ropa_cama', categoria: 'Textiles / ropa', articulo: 'Ropa de cama / toallas', unidad: 'gl', tipos: ['Casa', 'Apartamento'] },
  { id: 'cortinas', categoria: 'Textiles / ropa', articulo: 'Cortinas', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina'] },
  // Menaje / cocina / baño
  { id: 'vajilla', categoria: 'Menaje / vajilla', articulo: 'Vajilla / cristalería', unidad: 'juego', tipos: ['Casa', 'Apartamento', 'Local comercial'] },
  { id: 'ollas', categoria: 'Cocina', articulo: 'Ollas / utensilios de cocina', unidad: 'juego', tipos: ['Casa', 'Apartamento', 'Local comercial'] },
  { id: 'licuadora', categoria: 'Cocina', articulo: 'Licuadora', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Local comercial'] },
  { id: 'cafetera', categoria: 'Cocina', articulo: 'Cafetera', unidad: 'und', tipos: ['Casa', 'Apartamento', 'Oficina', 'Local comercial'] },
  { id: 'sanitarios', categoria: 'Baño', articulo: 'Aparatos sanitarios', unidad: 'und', tipos: ['Casa', 'Apartamento'] },
  // Herramientas / industria / bodega
  { id: 'herramientas_manuales', categoria: 'Herramientas', articulo: 'Herramientas manuales', unidad: 'juego', tipos: ['Casa', 'Finca / rural', 'Industria', 'Bodega'] },
  { id: 'taladro', categoria: 'Herramientas', articulo: 'Taladro / herramientas eléctricas', unidad: 'und', tipos: ['Casa', 'Industria', 'Bodega'] },
  { id: 'maquinaria', categoria: 'Maquinaria / equipo', articulo: 'Maquinaria industrial', unidad: 'und', tipos: ['Industria'] },
  { id: 'equipo_proceso', categoria: 'Maquinaria / equipo', articulo: 'Equipo de proceso / producción', unidad: 'und', tipos: ['Industria'] },
  { id: 'montacargas', categoria: 'Maquinaria / equipo', articulo: 'Montacargas', unidad: 'und', tipos: ['Industria', 'Bodega'] },
  { id: 'inventario', categoria: 'Inventario / mercancía', articulo: 'Inventario / mercancía', unidad: 'gl', tipos: ['Industria', 'Local comercial', 'Bodega'] },
  { id: 'materia_prima', categoria: 'Inventario / mercancía', articulo: 'Materia prima', unidad: 'gl', tipos: ['Industria', 'Bodega'] },
  { id: 'estanteria_bodega', categoria: 'Inventario / mercancía', articulo: 'Estantería de bodega', unidad: 'und', tipos: ['Bodega', 'Industria'] },
  // Oficina
  { id: 'servidor', categoria: 'Oficina / equipo de cómputo', articulo: 'Servidor / NAS', unidad: 'und', tipos: ['Oficina', 'Industria'] },
  { id: 'switch_red', categoria: 'Oficina / equipo de cómputo', articulo: 'Switch / equipo de red', unidad: 'und', tipos: ['Oficina', 'Industria'] },
  { id: 'archivo', categoria: 'Oficina / equipo de cómputo', articulo: 'Archivador', unidad: 'und', tipos: ['Oficina'] },
  { id: 'otro_contenido', categoria: 'Otros', articulo: 'Otro (especificar)', unidad: 'und', tipos: TIPOS_INMUEBLE_CONTENIDOS_NSR10 },
];

/** Filtra catálogo por tipo de inmueble; si no hay tipo, devuelve todo. */
export function catalogoContenidosPorTipo(tipoInmueble = '') {
  const tipo = String(tipoInmueble || '').trim();
  if (!tipo || tipo === 'Otro') return CATALOGO_CONTENIDOS_NSR10;
  return CATALOGO_CONTENIDOS_NSR10.filter(
    (item) => !item.tipos?.length || item.tipos.includes(tipo)
  );
}

/** Hoja Evaluación · filas de checklist (igual al Excel) */
export const ITEMS_EVALUACION_NSR10 = [
  {
    codigo: 'CG-01',
    componente: 'CONDICIÓN GENERAL',
    elemento: 'Estado global de la edificación',
    criterio: 'Revisar inclinaciones, desplazamientos, separaciones o colapso.',
  },
  {
    codigo: 'C-01',
    componente: 'COLUMNAS',
    elemento: 'Columnas / elementos verticales',
    criterio:
      'Fisuras, grietas diagonales, pérdida de sección, acero expuesto, deformación.',
  },
  {
    codigo: 'V-01',
    componente: 'VIGAS',
    elemento: 'Vigas principales',
    criterio: 'Grietas, desprendimientos, deformación o falla próxima a apoyos.',
  },
  {
    codigo: 'CX-01',
    componente: 'CONEXIONES',
    elemento: 'Conexiones viga-columna / uniones',
    criterio: 'Separación, aplastamiento, rotura o pérdida de continuidad.',
  },
  {
    codigo: 'M-01',
    componente: 'MUROS',
    elemento: 'Muros estructurales o de carga',
    criterio: 'Grietas diagonales/X, inclinación, pérdida de unidades, separación.',
  },
  {
    codigo: 'M-02',
    componente: 'MUROS',
    elemento: 'Muros divisorios / cerramientos',
    criterio: 'Fisuras, grietas, desprendimientos o riesgo de caída.',
  },
  {
    codigo: 'B-01',
    componente: 'BAHAREQUE',
    elemento: 'Muros de bahareque / entramado',
    criterio:
      'Fisuración diagonal, separación de esquinas, pérdida de recubrimiento.',
  },
  {
    codigo: 'B-02',
    componente: 'BAHAREQUE',
    elemento: 'Uniones de madera / guadua',
    criterio: 'Rotura, desconexión, deterioro o pérdida de apoyo.',
  },
  {
    codigo: 'CU-01',
    componente: 'CUBIERTA',
    elemento: 'Cubierta y estructura de soporte',
    criterio: 'Tejas desplazadas, apoyos fallados, deformación o colapso parcial.',
  },
  {
    codigo: 'CI-01',
    componente: 'CIMENTACIÓN',
    elemento: 'Cimentación y apoyo',
    criterio: 'Asentamiento, desplazamiento o evidencia de pérdida de capacidad.',
  },
  {
    codigo: 'P-01',
    componente: 'PISOS',
    elemento: 'Pisos / placas',
    criterio: 'Grietas, desniveles, levantamientos o asentamientos.',
  },
  {
    codigo: 'G-01',
    componente: 'GEOTECNIA',
    elemento: 'Terreno inmediato',
    criterio: 'Grietas, hundimientos, deslizamiento, movimiento de masa.',
  },
  {
    codigo: 'G-02',
    componente: 'GEOTECNIA',
    elemento: 'Taludes / laderas próximas',
    criterio: 'Inestabilidad, caída de material o amenaza sobre la edificación.',
  },
  {
    codigo: 'NE-01',
    componente: 'NO ESTRUCTURAL',
    elemento: 'Fachadas / vidrios / cielorrasos',
    criterio: 'Desprendimientos o elementos con riesgo de caída.',
  },
  {
    codigo: 'NE-02',
    componente: 'NO ESTRUCTURAL',
    elemento: 'Equipos / tanques / elementos pesados',
    criterio: 'Desplazamiento, volcamiento o pérdida de anclaje.',
  },
  {
    codigo: 'R-01',
    componente: 'REDES',
    elemento: 'Instalaciones eléctricas',
    criterio: 'Daño visible, cableado expuesto o riesgo eléctrico.',
  },
  {
    codigo: 'R-02',
    componente: 'REDES',
    elemento: 'Gas',
    criterio: 'Fuga, rotura o indicio de pérdida de estanqueidad.',
  },
  {
    codigo: 'R-03',
    componente: 'REDES',
    elemento: 'Hidráulicas / sanitarias',
    criterio: 'Roturas, fugas o pérdida funcional.',
  },
  {
    codigo: 'PE-01',
    componente: 'PREEXISTENCIAS',
    elemento: 'Patologías previas',
    criterio: 'Fisuras antiguas, humedad, corrosión, reparaciones anteriores.',
  },
];

/**
 * Evaluación y Dictamen se ocultan para todos los liquidadores catastróficos.
 * El código de esas hojas se conserva para reactivarlas después.
 */
export const OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 = true;

export const HOJAS_NSR10 = [
  { id: 'listas', label: 'Listas', oculta: true },
  { id: 'portada', label: 'Portada' },
  { id: 'evaluacion', label: 'Evaluación', oculta: OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 },
  { id: 'dictamen', label: 'Dictamen', oculta: OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'contenidos', label: 'Contenidos' },
  { id: 'gastos', label: 'Gastos sin deducible' },
  { id: 'totales', label: 'Totales' },
];

/** En liquidador / informe único se navega entre Presupuesto, Contenidos, gastos y Totales. */
export const HOJAS_LIQUIDADOR_NSR10 = [
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'contenidos', label: 'Contenidos' },
  { id: 'gastos', label: 'Gastos sin deducible' },
  { id: 'totales', label: 'Totales' },
];

export const HOJAS_VISIBLES_NSR10 = HOJAS_NSR10.filter((h) => !h.oculta);

export function hojaActivaVisibleNSR10(hojaId) {
  const id = String(hojaId || '').trim() || 'portada';
  const hoja = HOJAS_NSR10.find((h) => h.id === id);
  if (!hoja || hoja.oculta) return 'portada';
  return hoja.id;
}

const CONCEPTOS_POR_PUNTAJE = {
  0: 'No se identifican daños relevantes en los componentes evaluados. El inmueble se clasifica preliminarmente como habitable.',
  1: 'Se identifican daños leves, principalmente compatibles con afectaciones menores. No se evidencia, con la inspección visual, compromiso relevante de la estructura principal.',
  2: 'Se identifican daños moderados que justifican restricción de uso en las áreas afectadas, reparación y revisión técnica antes de normalizar la ocupación.',
  3: 'Se identifican daños severos o afectación de elementos resistentes. Se recomienda suspender la ocupación y realizar evaluación estructural detallada.',
  4: 'Se identifica colapso o condición de peligro inminente. Se requiere evacuación total, aislamiento del área y evaluación especializada inmediata.',
};

const RIESGOS_POR_PUNTAJE = {
  0: 'Riesgo aparente bajo: no se identifican daños relevantes en los componentes evaluados. La ocupación puede mantenerse, sin perjuicio de controles posteriores.',
  1: 'Riesgo aparente bajo: se registran afectaciones leves sin evidencia visual de compromiso relevante de la estructura principal. Se recomienda mantenimiento o reparación menor según el alcance observado.',
  2: 'Riesgo aparente medio: existen daños moderados que pueden afectar el uso seguro de sectores del inmueble. Debe restringirse el acceso a las áreas comprometidas y realizarse revisión técnica antes de normalizar su ocupación.',
  3: 'Riesgo aparente alto: se observan daños severos o afectación de elementos resistentes. Debe suspenderse la ocupación, aislar las zonas de peligro y efectuarse evaluación estructural detallada.',
  4: 'Riesgo crítico: se identifica colapso o peligro inminente. Se requiere evacuación total, aislamiento inmediato y evaluación especializada de emergencia.',
};

export function estadoPorLabel(label) {
  const key = String(label || '').trim().toLowerCase();
  return ESTADOS_DANO_NSR10.find((e) => e.label.toLowerCase() === key) || null;
}

export function puntajeDeEstado(estadoLabel) {
  const est = estadoPorLabel(estadoLabel);
  return est ? est.puntaje : null;
}

/** Excel G: Daño moderado/severo/colapso → Sí; Daño leve → Según alcance; resto → No */
export function requiereIntervencionPorEstado(estadoLabel) {
  const e = String(estadoLabel || '').trim();
  if (
    e === 'Daño moderado' ||
    e === 'Daño severo' ||
    e === 'Colapso / peligro inminente'
  ) {
    return 'Sí';
  }
  if (e === 'Daño leve') return 'Según alcance';
  return 'No';
}

export function crearItemsRespuestaVacios() {
  return ITEMS_EVALUACION_NSR10.map((item) => ({
    codigo: item.codigo,
    componente: item.componente,
    elemento: item.elemento,
    criterio: item.criterio,
    estado: '',
    puntaje: null,
    requiereIntervencion: '',
    observacion: '',
    fotoRef: '',
    fotoArchivoId: '',
    fotoRuta: '',
    fotoPreview: '',
    accionSugerida: '',
  }));
}

export function normalizarItemsRespuesta(itemsGuardados = []) {
  const porCodigo = new Map(
    (Array.isArray(itemsGuardados) ? itemsGuardados : []).map((it) => [
      String(it?.codigo || '').trim(),
      it,
    ])
  );
  return ITEMS_EVALUACION_NSR10.map((base) => {
    const prev = porCodigo.get(base.codigo) || {};
    const estado = prev.estado || '';
    const puntaje =
      prev.puntaje != null && prev.puntaje !== ''
        ? Number(prev.puntaje)
        : puntajeDeEstado(estado);
    return {
      ...base,
      estado,
      puntaje: Number.isFinite(puntaje) ? puntaje : null,
      requiereIntervencion:
        prev.requiereIntervencion ||
        (estado ? requiereIntervencionPorEstado(estado) : ''),
      observacion: prev.observacion || '',
      fotoRef: prev.fotoRef || '',
      fotoArchivoId: prev.fotoArchivoId || '',
      fotoRuta: prev.fotoRuta || '',
      fotoPreview: prev.fotoPreview || '',
      accionSugerida: prev.accionSugerida || '',
    };
  });
}

export function aplicarEstadoAItem(item, estadoLabel) {
  const puntaje = puntajeDeEstado(estadoLabel);
  return {
    ...item,
    estado: estadoLabel,
    puntaje: puntaje == null ? null : puntaje,
    requiereIntervencion: estadoLabel
      ? requiereIntervencionPorEstado(estadoLabel)
      : '',
  };
}

/**
 * Criterio final = fórmulas hoja Evaluación B31–B35 + E31 + textos Dictamen.
 */
export function calcularCriterioFinal(items = []) {
  const lista = Array.isArray(items) ? items : [];
  const conPuntaje = lista.filter((it) => it?.puntaje != null && it.puntaje !== '');
  if (!conPuntaje.length) {
    return {
      puntajeMaximo: null,
      categoria: 'Pendiente de evaluación',
      habitabilidad: 'Pendiente',
      urgencia: 'Pendiente',
      evacuacion: 'Pendiente',
      concepto: 'Pendiente de diligenciar la evaluación.',
      riesgo:
        'La evaluación no cuenta con información suficiente para establecer el nivel de riesgo. Complete los estados de los componentes inspeccionados.',
      descripcionDanios: 'No hay componentes diligenciados para describir daños.',
      dictamen:
        'Dictamen pendiente: complete la evaluación visual antes de emitir una clasificación operativa.',
      itemsConAfectacion: [],
    };
  }

  const puntajeMaximo = Math.max(...conPuntaje.map((it) => Number(it.puntaje)));
  // Si solo hay No aplica / No inspeccionado (-1), no hay clasificación operativa útil
  if (puntajeMaximo < 0) {
    return {
      puntajeMaximo,
      categoria: 'Pendiente de evaluación',
      habitabilidad: 'Pendiente',
      urgencia: 'Pendiente',
      evacuacion: 'Pendiente',
      concepto: 'Pendiente de diligenciar la evaluación.',
      riesgo:
        'La evaluación no cuenta con información suficiente para establecer el nivel de riesgo. Complete los estados de los componentes inspeccionados.',
      descripcionDanios: 'No se registran daños en los componentes inspeccionados.',
      dictamen:
        'Dictamen pendiente: complete la evaluación visual antes de emitir una clasificación operativa.',
      itemsConAfectacion: [],
    };
  }

  const categorias = [
    'Nivel 0 - Sin daño',
    'Nivel 1 - Daño leve',
    'Nivel 2 - Daño moderado',
    'Nivel 3 - Daño severo',
    'Nivel 4 - Colapso / Peligro inminente',
  ];
  const categoria = categorias[puntajeMaximo] || categorias[0];
  const habitabilidad =
    puntajeMaximo <= 1
      ? 'Habitable'
      : puntajeMaximo === 2
        ? 'Habitación restringida'
        : 'Inhabitable';
  const urgencias = ['Bajo', 'Bajo', 'Medio', 'Alto', 'Crítico'];
  const urgencia = urgencias[puntajeMaximo] || 'Bajo';
  const evacuacion = puntajeMaximo >= 3 ? 'Sí' : 'No';
  const concepto = CONCEPTOS_POR_PUNTAJE[puntajeMaximo] || CONCEPTOS_POR_PUNTAJE[0];
  const riesgoBase = RIESGOS_POR_PUNTAJE[puntajeMaximo] || RIESGOS_POR_PUNTAJE[0];
  const riesgo = `${riesgoBase} Clasificación operativa: ${habitabilidad}; urgencia: ${urgencia}; evacuación: ${evacuacion}.`;

  const conAfectacion = lista.filter((it) => Number(it.puntaje) > 0);
  let descripcionDanios;
  if (!conAfectacion.length) {
    descripcionDanios = 'No se registran daños en los componentes inspeccionados.';
  } else {
    const detalle = conAfectacion
      .map((it) => {
        const obs = String(it.observacion || '').trim();
        return `${it.codigo} – ${it.elemento} (${it.estado || `puntaje ${it.puntaje}`})${
          obs ? `: ${obs}` : ''
        }`;
      })
      .join('; ');
    descripcionDanios = `Se registran ${conAfectacion.length} componentes con afectación. Hallazgos: ${detalle}.`;
  }

  const dictamen = `${concepto} En consecuencia, la clasificación preliminar es ${categoria}, con condición de habitabilidad ${habitabilidad}, urgencia ${urgencia} y requerimiento de evacuación: ${evacuacion}. Este dictamen es resultado de una inspección visual rápida y no sustituye un estudio estructural detallado ni el concepto de la autoridad competente.`;

  return {
    puntajeMaximo,
    categoria,
    habitabilidad,
    urgencia,
    evacuacion,
    concepto,
    riesgo,
    descripcionDanios,
    dictamen,
    itemsConAfectacion: conAfectacion,
  };
}

export function crearFilaPresupuestoVacia() {
  return {
    capitulo: '',
    catalogoId: '',
    codigoEvaluacion: '',
    componente: '',
    actividad: '',
    unidad: 'und',
    cantidad: '',
    valorUnitario: '',
    prioridad: 'Medio',
    cubierto: '',
    observacion: '',
    fuente: '',
    coberturaAfectar: '',
    tipoCobertura: '',
    valorAsegurable: '',
    porcentajeDeducible: '',
    cantidadMinimoSMMLV: '',
    valorMinimo: '',
    deducibleCalculado: '',
    deducibleManual: false,
  };
}

/** Aplica un ítem de basePreciosPresupuesto.js a una fila del liquidador. */
export function aplicarCatalogoAFilaPresupuesto(row = {}, catalogoItem = null) {
  if (!catalogoItem) {
    return {
      ...row,
      catalogoId: '',
    };
  }
  return {
    ...row,
    catalogoId: catalogoItem.id,
    capitulo: catalogoItem.capitulo || row.capitulo || '',
    actividad: catalogoItem.actividad || row.actividad || '',
    unidad: catalogoItem.unidad || row.unidad || 'und',
    valorUnitario:
      catalogoItem.valorUnitario != null && catalogoItem.valorUnitario !== ''
        ? formatMilesNsr10(catalogoItem.valorUnitario)
        : row.valorUnitario,
    fuente: row.fuente || 'Base precios general',
  };
}

export function crearFilaContenidoVacia(extras = {}) {
  return {
    tipoInmueble: extras.tipoInmueble || '',
    categoria: '',
    catalogoId: '',
    articulo: '',
    marca: '',
    unidad: 'und',
    cantidad: '',
    valorUnitario: '',
    estado: 'Dañado',
    observacion: '',
    coberturaAfectar: extras.coberturaAfectar || '',
    tipoCobertura: extras.tipoCobertura || extras.coberturaAfectar || '',
    articuloPolizaId: extras.articuloPolizaId || '',
    valorAsegurable: extras.valorAsegurable ?? '',
    porcentajeDeducible: extras.porcentajeDeducible ?? '',
    cantidadMinimoSMMLV: extras.cantidadMinimoSMMLV ?? '',
    valorMinimo: extras.valorMinimo ?? '',
    deducibleCalculado: extras.deducibleCalculado ?? '',
    deducibleManual: extras.deducibleManual ?? false,
    ...extras,
  };
}

export function totalFilaContenido(row) {
  return totalFilaPresupuesto(row);
}

function normalizarIdCobertura(valor) {
  const n = String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (!n) return '';
  const hit = COBERTURAS_ARTICULO_ASEGURADO.find(
    (c) => c.id === n || c.label.toLowerCase() === n || n.includes(c.id)
  );
  return hit?.id || n;
}

export function etiquetaCoberturaArticulo(valor) {
  const id = normalizarIdCobertura(valor);
  return COBERTURAS_ARTICULO_ASEGURADO.find((c) => c.id === id)?.label || String(valor || '').trim();
}

export const GRUPO_DEDUCIBLE_EDIFICIO = 'poliza_edificio';
export const GRUPO_DEDUCIBLE_CONTENIDOS = 'poliza_contenidos';

export function etiquetaGrupoDeducible(id) {
  const hit = ARTICULOS_ASEGURADOS_POLIZA.find((a) => a.id === id);
  if (hit) return hit.articulo;
  if (id === 'edificio') return 'Edificio';
  if (id === 'contenidos') return 'Contenidos';
  return 'Grupo';
}

/** Artículo de póliza de la fila (independiente del ítem de catálogo). */
export function resolverArticuloPolizaId(row = {}) {
  const explicit = String(row.articuloPolizaId || '').trim();
  if (explicit) return explicit;
  const cat = String(row.catalogoId || '').trim();
  if (cat.startsWith('poliza_')) return cat;
  const hit = ARTICULOS_ASEGURADOS_POLIZA.find(
    (a) => a.id === cat || a.articulo === row.articulo
  );
  return hit?.id || '';
}

/**
 * Cada artículo de póliza (Contenidos, Mercancías, Edificio…) es un grupo aparte.
 * Los ítems de catálogo de esa misma categoría se suman y el deducible va una vez.
 */
export function resolverGrupoDeducibleId(row = {}, grupoDefault = GRUPO_DEDUCIBLE_CONTENIDOS) {
  const artId = resolverArticuloPolizaId(row);
  if (artId) return artId;
  if (grupoDefault === 'edificio' || grupoDefault === GRUPO_DEDUCIBLE_EDIFICIO) {
    return GRUPO_DEDUCIBLE_EDIFICIO;
  }
  if (grupoDefault === 'contenidos' || grupoDefault === GRUPO_DEDUCIBLE_CONTENIDOS) {
    return GRUPO_DEDUCIBLE_CONTENIDOS;
  }
  return grupoDefault || GRUPO_DEDUCIBLE_CONTENIDOS;
}

function parseValorAsegurableCaso(valor) {
  if (valor == null || valor === '') return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  return parseMontoNsr10(valor) || 0;
}

/** Campos de póliza para el liquidador NSR (inmueble vs contenidos). */
export function camposValorAseguradoParaNsr(caso = {}, encabezado = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  const enc = encabezado && typeof encabezado === 'object' ? encabezado : {};
  return {
    valorAseguradoInmueble:
      enc.valorAseguradoInmueble ?? c.valorAseguradoInmueble ?? '',
    valorAseguradoContenidos:
      enc.valorAseguradoContenidos ?? c.valorAseguradoContenidos ?? '',
  };
}

/** Valor asegurado de la póliza/caso: inmueble vs contenidos. */
export function valoresAsegurablesDesdeFormData(formData = {}) {
  const fd = formData && typeof formData === 'object' ? formData : {};
  const enc = fd.encabezado && typeof fd.encabezado === 'object' ? fd.encabezado : {};
  const liq = fd.liquidacionCatastrofico && typeof fd.liquidacionCatastrofico === 'object'
    ? fd.liquidacionCatastrofico
    : {};
  const inmuebleExplicito = parseValorAsegurableCaso(
    fd.valorAseguradoInmueble ?? enc.valorAseguradoInmueble
  );
  const contenidos = parseValorAsegurableCaso(
    fd.valorAseguradoContenidos ?? enc.valorAseguradoContenidos
  );
  const general = parseValorAsegurableCaso(liq.valorAsegurado);
  const inmueble = inmuebleExplicito || general;
  return { inmueble, contenidos, general, inmuebleExplicito };
}

export function valoresAsegurablesDesdeLiquidador(liquidador = {}) {
  const liq = liquidador && typeof liquidador === 'object' ? liquidador : {};
  return valoresAsegurablesDesdeFormData({
    valorAseguradoInmueble: liq.encabezado?.valorAseguradoInmueble,
    valorAseguradoContenidos: liq.encabezado?.valorAseguradoContenidos,
    liquidacionCatastrofico: liq.liquidacionCatastrofico,
  });
}

export function valorAsegurablePlataformaDeGrupo(grupoId, valores = {}) {
  const id = String(grupoId || '');
  const esEdificio =
    id === GRUPO_DEDUCIBLE_EDIFICIO || id === 'edificio' || id === 'poliza_edificio';
  const inmueble = Number(valores.inmueble) || 0;
  const contenidos = Number(valores.contenidos) || 0;
  const general = Number(valores.general) || 0;
  const inmuebleExplicito = Number(valores.inmuebleExplicito) || 0;
  if (esEdificio) return inmueble || general || 0;
  if (contenidos > 0) return contenidos;
  // Formulario CAT genérico: un solo VA de liquidación, sin campos inmueble/contenidos.
  if (!inmuebleExplicito && general > 0) return general;
  return 0;
}

export function claveGrupoDeducible(row = {}, grupoDefault = GRUPO_DEDUCIBLE_CONTENIDOS) {
  const cob = normalizarIdCobertura(row.coberturaAfectar || row.tipoCobertura || '');
  if (!cob) return '';
  return `${resolverGrupoDeducibleId(row, grupoDefault)}::${cob}`;
}

export function montosDeducibleGrupo(filas = [], { valorAsegurablePlataforma = 0 } = {}) {
  let vaCategoria = 0;
  let sumaPL = 0;
  let porcentaje = 0;
  let cantidadSMMLV = 0;
  let valorMinimo = 0;
  const lista = Array.isArray(filas) ? filas : [];
  const vaPrimera = lista.length ? parseMontoNsr10(lista[0].valorAsegurable) : null;
  if (vaPrimera != null && vaPrimera > 0) vaCategoria = vaPrimera;
  for (const row of lista) {
    const pl = totalFilaContenido(row);
    if (pl != null && pl > 0) sumaPL += pl;
    const pct = Number(row.porcentajeDeducible);
    if (Number.isFinite(pct) && pct > 0) porcentaje = pct;
    const cant = Number(row.cantidadMinimoSMMLV);
    if (Number.isFinite(cant) && cant > 0) cantidadSMMLV = cant;
    const vmin = parseMontoNsr10(row.valorMinimo);
    if (vmin != null && vmin > 0) valorMinimo = vmin;
  }
  const vaPlataforma = Number(valorAsegurablePlataforma) || 0;
  const sumaVA = vaCategoria > 0 ? vaCategoria : vaPlataforma;
  const porVA = sumaVA > 0 && porcentaje > 0 ? sumaVA * (porcentaje / 100) : 0;
  const porPL = sumaPL > 0 && porcentaje > 0 ? sumaPL * (porcentaje / 100) : 0;
  const montoPct = Math.max(porVA, porPL);
  const aplicado = Math.round(Math.max(montoPct, valorMinimo || 0) * 100) / 100;
  const sumaPLR = Math.round(sumaPL * 100) / 100;
  const neto = Math.round(Math.max(0, sumaPLR - aplicado) * 100) / 100;
  return {
    sumaVA: Math.round(sumaVA * 100) / 100,
    sumaPL: sumaPLR,
    vaDesdePlataforma: vaCategoria <= 0 && vaPlataforma > 0,
    porcentaje,
    cantidadSMMLV,
    valorMinimo,
    montoPct: Math.round(montoPct * 100) / 100,
    aplicado,
    neto,
  };
}

/** Suma (pérdida − deducible) de cada categoría. Si no hay grupos, null. */
export function valorAIndemnizarDesdeGrupos(grupos = []) {
  if (!Array.isArray(grupos) || !grupos.length) return null;
  const suma = grupos.reduce((acc, g) => {
    const pl = Number(g.sumaPL) || 0;
    const d = Number(g.deducible ?? g.aplicado) || 0;
    const neto =
      g.neto != null && g.neto !== ''
        ? Number(g.neto)
        : Math.max(0, pl - d);
    return acc + (Number.isFinite(neto) ? neto : 0);
  }, 0);
  return Math.round(suma * 100) / 100;
}

/** Usa el neto de la ventana (grupos) o, si no hay, el total bruto. */
export function resolverValorAIndemnizar(valorAIndemnizar, totalBruto) {
  if (valorAIndemnizar != null && valorAIndemnizar !== '') {
    const n = Number(valorAIndemnizar);
    if (Number.isFinite(n)) return Math.round(n * 100) / 100;
  }
  return Math.round((Number(totalBruto) || 0) * 100) / 100;
}

export function calcularGruposDeducibleDeItems(
  items = [],
  {
    grupoDefault = GRUPO_DEDUCIBLE_CONTENIDOS,
    tipo = 'contenidos',
    valoresAsegurablesCaso = null,
  } = {}
) {
  const buckets = new Map();
  (Array.isArray(items) ? items : []).forEach((row) => {
    const lista =
      tipo === 'presupuesto'
        ? filaPresupuestoListaParaDeducible(row)
        : filaContenidoListaParaDeducible(row, valoresAsegurablesCaso, grupoDefault);
    const cob = String(row.coberturaAfectar || row.tipoCobertura || '').trim();
    if (!lista || !cob) return;
    const clave = claveGrupoDeducible(row, grupoDefault);
    if (!clave) return;
    if (!buckets.has(clave)) buckets.set(clave, []);
    buckets.get(clave).push(row);
  });
  return [...buckets.entries()].map(([clave, filas]) => {
    const [grupoId, cobId] = String(clave).split('::');
    const vaPlat = valorAsegurablePlataformaDeGrupo(grupoId, valoresAsegurablesCaso || {});
    const montos = montosDeducibleGrupo(filas, { valorAsegurablePlataforma: vaPlat });
    return {
      clave,
      grupoId,
      grupoLabel: etiquetaGrupoDeducible(grupoId),
      coberturaId: cobId,
      coberturaLabel: etiquetaCoberturaArticulo(cobId),
      filas: filas.length,
      ...montos,
      deducible: montos.aplicado,
      total: montos.neto,
    };
  });
}

export function reglaDeduciblePorCobertura(cobertura) {
  const id = normalizarIdCobertura(cobertura);
  return REGLAS_DEDUCIBLE_POR_COBERTURA[id] || null;
}

/** Fila con artículo o catálogo: ya puede elegir cobertura y deducible. */
export function filaContenidoListaParaDeducible(
  row = {},
  valoresAsegurablesCaso = null,
  grupoDefault = GRUPO_DEDUCIBLE_CONTENIDOS
) {
  const articulo = String(row.articulo || '').trim();
  const catalogoId = String(row.catalogoId || '').trim();
  const artPoliza = String(row.articuloPolizaId || '').trim();
  const cob = String(row.coberturaAfectar || row.tipoCobertura || '').trim();
  const va = parseMontoNsr10(row.valorAsegurable);
  const pl = totalFilaContenido(row);
  const vaPlat = valorAsegurablePlataformaDeGrupo(
    resolverGrupoDeducibleId(row, grupoDefault),
    valoresAsegurablesCaso || {}
  );
  const tieneBase =
    (va != null && va > 0) || (pl != null && pl > 0) || vaPlat > 0;
  const tieneIdentidad = Boolean(articulo || catalogoId || artPoliza);
  return tieneIdentidad || Boolean(cob) || tieneBase;
}

export function filaContenidoTieneDeducibleArticulo(row = {}) {
  if (!filaContenidoListaParaDeducible(row)) return false;
  const cob = String(row.coberturaAfectar || row.tipoCobertura || '').trim();
  const ded = parseMontoNsr10(row.deducibleCalculado);
  return Boolean(cob) && ded != null && ded > 0;
}

/**
 * Recalcula % / mínimo / deducible de una fila según la cobertura.
 * Terremoto: MAX(base × 3%, 3 SMMLV). El deducible no es editable.
 * opts.baseValor: presupuesto usa total de fila si no hay suma asegurada.
 */
export function aplicarDeducibleCoberturaFila(row = {}, smmlvCfg = {}, opts = {}) {
  const cobertura = row.coberturaAfectar || row.tipoCobertura || '';
  const idCob = normalizarIdCobertura(cobertura);
  const etiqueta = etiquetaCoberturaArticulo(cobertura);
  const next = {
    ...row,
    coberturaAfectar: cobertura,
    tipoCobertura: etiqueta || row.tipoCobertura || '',
  };

  if (!idCob) {
    return next;
  }

  const anioRef = Number(smmlvCfg.anioSMMLV) || new Date().getFullYear();
  const smmlv = resolverSmmlvPorAnio(anioRef);
  const valorSMMLV =
    parseMontoNsr10(smmlvCfg.valorSMMLV) ||
    smmlv.valor ||
    SMMLV_DEFAULT;
  const regla = reglaDeduciblePorCobertura(idCob);

  if (regla) {
    const cantidadSMMLV = Number(regla.cantidadSMMLV) || 0;
    const porcentaje = Number(regla.porcentaje) || 0;
    next.porcentajeDeducible = porcentaje;
    next.cantidadMinimoSMMLV = cantidadSMMLV;
    next.valorMinimo = Math.round(cantidadSMMLV * valorSMMLV * 100) / 100;
  }

  const vaExpl = parseMontoNsr10(next.valorAsegurable);
  const va =
    vaExpl != null && vaExpl > 0
      ? vaExpl
      : opts.baseValor != null
        ? Number(opts.baseValor) || 0
        : 0;

  if (regla) {
    if (va <= 0) return next;
    const porPct = va * (Number(next.porcentajeDeducible) / 100);
    next.deducibleCalculado = Math.round(Math.max(porPct, next.valorMinimo || 0) * 100) / 100;
    return next;
  }

  const porcentaje = Number(next.porcentajeDeducible);
  const valorMinimo = parseMontoNsr10(next.valorMinimo) || 0;
  if ((!Number.isFinite(porcentaje) || porcentaje <= 0) && valorMinimo <= 0) {
    return next;
  }
  if (va == null || va <= 0) return next;
  const porPct = va * ((Number.isFinite(porcentaje) ? porcentaje : 0) / 100);
  next.deducibleCalculado = Math.round(Math.max(porPct, valorMinimo) * 100) / 100;
  return next;
}

/** Si la fila ya es un artículo real y no tiene cobertura propia, usa la predeterminada. */
export function prepararFilaDeducibleContenido(
  row = {},
  smmlvCfg = {},
  coberturaPredeterminada = ''
) {
  let next = { ...row };
  const propia = String(next.coberturaAfectar || next.tipoCobertura || '').trim();
  if (filaContenidoListaParaDeducible(next) && !propia && coberturaPredeterminada) {
    next = { ...next, coberturaAfectar: coberturaPredeterminada };
  }
  return aplicarDeducibleCoberturaFila(next, smmlvCfg);
}

export function baseValorDeduciblePresupuesto(row = {}) {
  const va = parseMontoNsr10(row.valorAsegurable);
  if (va != null && va > 0) return va;
  return totalFilaPresupuesto(row);
}

export function filaPresupuestoListaParaDeducible(row = {}) {
  const ident = String(
    row.actividad || row.capitulo || row.catalogoId || row.componente || ''
  ).trim();
  const cob = String(row.coberturaAfectar || row.tipoCobertura || '').trim();
  const base = baseValorDeduciblePresupuesto(row);
  return Boolean(ident) || Boolean(cob) || (base != null && base > 0);
}

export function filaPresupuestoTieneDeducibleArticulo(row = {}) {
  if (!filaPresupuestoListaParaDeducible(row)) return false;
  const cob = String(row.coberturaAfectar || row.tipoCobertura || '').trim();
  const ded = parseMontoNsr10(row.deducibleCalculado);
  return Boolean(cob) && ded != null && ded > 0;
}

export function prepararFilaDeduciblePresupuesto(
  row = {},
  smmlvCfg = {},
  coberturaPredeterminada = ''
) {
  let next = { ...row };
  const propia = String(next.coberturaAfectar || next.tipoCobertura || '').trim();
  const lista = filaPresupuestoListaParaDeducible(next);
  if (lista && !propia && coberturaPredeterminada) {
    next = { ...next, coberturaAfectar: coberturaPredeterminada };
  }
  return aplicarDeducibleCoberturaFila(next, smmlvCfg, {
    lista,
    baseValor: baseValorDeduciblePresupuesto(next) || 0,
  });
}

/**
 * Agrupa filas por artículo de póliza + cobertura, suma V.A. y pérdida,
 * y aplica un solo deducible al total del grupo (no uno por fila).
 */
export function aplicarDeduciblesAgrupados(items = [], smmlvCfg = {}, opts = {}) {
  const grupoDefault = opts.grupoDefault || GRUPO_DEDUCIBLE_CONTENIDOS;
  const tipo = opts.tipo || 'contenidos';
  const coberturaPredeterminada = opts.coberturaPredeterminada || '';
  const preparar =
    tipo === 'presupuesto'
      ? (row) =>
          prepararFilaDeduciblePresupuesto(row, smmlvCfg, coberturaPredeterminada)
      : (row) =>
          prepararFilaDeducibleContenido(row, smmlvCfg, coberturaPredeterminada);

  const conRegla = (Array.isArray(items) ? items : []).map((row) => {
    const next = preparar(row);
    return {
      ...next,
      articuloPolizaId: resolverArticuloPolizaId(next) || next.articuloPolizaId || '',
      deducibleGrupoClave: '',
      deducibleGrupoRepresentante: false,
      deducibleGrupoFilas: 0,
      deducibleGrupoSumaVA: '',
      deducibleGrupoSumaPL: '',
      deducibleGrupoIncluido: false,
    };
  });

  const valoresAsegurablesCaso = opts.valoresAsegurablesCaso || null;
  const grupos = calcularGruposDeducibleDeItems(conRegla, {
    grupoDefault,
    tipo,
    valoresAsegurablesCaso,
  });
  const porClave = new Map(grupos.map((g) => [g.clave, g]));
  const visto = new Set();

  return conRegla.map((row) => {
    const lista =
      tipo === 'presupuesto'
        ? filaPresupuestoListaParaDeducible(row)
        : filaContenidoListaParaDeducible(row, valoresAsegurablesCaso, grupoDefault);
    const cob = String(row.coberturaAfectar || row.tipoCobertura || '').trim();
    const clave = lista && cob ? claveGrupoDeducible(row, grupoDefault) : '';
    const grupo = clave ? porClave.get(clave) : null;
    if (!grupo) return row;
    const esPrimero = !visto.has(clave);
    if (esPrimero) visto.add(clave);
    return {
      ...row,
      deducibleGrupoClave: clave,
      deducibleGrupoRepresentante: esPrimero,
      deducibleGrupoFilas: grupo.filas,
      deducibleGrupoSumaVA: grupo.sumaVA,
      deducibleGrupoSumaPL: grupo.sumaPL,
      deducibleGrupoIncluido: !esPrimero,
      deducibleCalculado: esPrimero ? grupo.aplicado : '',
      valorAsegurable: esPrimero ? row.valorAsegurable : '',
    };
  });
}

function valorAsegurableTotalDeGrupos(grupos = []) {
  const porGrupo = new Map();
  (Array.isArray(grupos) ? grupos : []).forEach((g) => {
    if (!porGrupo.has(g.grupoId)) porGrupo.set(g.grupoId, Number(g.sumaVA) || 0);
  });
  return [...porGrupo.values()].reduce((acc, n) => acc + n, 0);
}

function sumarDeduciblesFilas(items = []) {
  return (Array.isArray(items) ? items : []).reduce((acc, row) => {
    if (row.deducibleGrupoIncluido && !row.deducibleManual) return acc;
    const n = parseMontoNsr10(row.deducibleCalculado);
    return acc + (n == null || n < 0 ? 0 : n);
  }, 0);
}

export function calcularTotalesContenidos(contenidos = {}, valoresAsegurablesCaso = null) {
  const items = Array.isArray(contenidos.items) ? contenidos.items : [];
  const subtotal = items.reduce((acc, row) => {
    const t = totalFilaContenido(row);
    return acc + (t == null ? 0 : t);
  }, 0);
  const gruposDeducible = calcularGruposDeducibleDeItems(items, {
    grupoDefault: GRUPO_DEDUCIBLE_CONTENIDOS,
    tipo: 'contenidos',
    valoresAsegurablesCaso,
  });
  const deduciblePorArticulos = sumarDeduciblesFilas(items);
  const valorAsegurableTotal = valorAsegurableTotalDeGrupos(gruposDeducible);
  const valorAIndemnizar = valorAIndemnizarDesdeGrupos(gruposDeducible);
  return {
    subtotal,
    total: subtotal,
    deduciblePorArticulos: Math.round(deduciblePorArticulos * 100) / 100,
    usaDeduciblePorArticulo: gruposDeducible.length > 0 || deduciblePorArticulos > 0,
    valorAsegurableTotal: Math.round(valorAsegurableTotal * 100) / 100,
    valorAIndemnizar,
    gruposDeducible,
  };
}

/**
 * Resumen unificado para la ventana Totales y el informe único.
 * sumaCompleta = totales brutos (pérdida).
 * sumaAIndemnizar = netos ya liquidados en presupuesto + contenidos (sin volver a restar deducible).
 */
export function calcularResumenTotalesNsr10(evalData = {}, valoresAsegurablesCaso = null) {
  const presupuesto = evalData.presupuesto || {};
  const contenidos = evalData.contenidos || {};
  const totalesPresupuesto = calcularTotalesPresupuesto(
    presupuesto,
    valoresAsegurablesCaso
  );
  const totalesContenidos = calcularTotalesContenidos(contenidos, valoresAsegurablesCaso);
  const totalPresupuesto = Number(totalesPresupuesto.total) || 0;
  const totalContenidos = Number(totalesContenidos.total) || 0;
  const sumaCompleta = Math.round((totalPresupuesto + totalContenidos) * 100) / 100;
  const deduciblePorArticulosContenidos = totalesContenidos.deduciblePorArticulos || 0;
  const deduciblePorArticulosPresupuesto = totalesPresupuesto.deduciblePorArticulos || 0;
  const valorAIndemnizarPresupuesto = resolverValorAIndemnizar(
    totalesPresupuesto.valorAIndemnizar,
    totalPresupuesto
  );
  const valorAIndemnizarContenidos = resolverValorAIndemnizar(
    totalesContenidos.valorAIndemnizar,
    totalContenidos
  );
  const sumaAIndemnizar =
    Math.round((valorAIndemnizarPresupuesto + valorAIndemnizarContenidos) * 100) / 100;
  return {
    presupuesto: totalesPresupuesto,
    contenidos: totalesContenidos,
    totalPresupuesto,
    totalContenidos,
    sumaCompleta,
    deduciblePorArticulos: deduciblePorArticulosContenidos,
    deduciblePorArticulosContenidos,
    deduciblePorArticulosPresupuesto,
    usaDeduciblePorArticulo: Boolean(totalesContenidos.usaDeduciblePorArticulo),
    usaDeduciblePorArticuloPresupuesto: Boolean(totalesPresupuesto.usaDeduciblePorArticulo),
    valorAIndemnizarContenidos,
    valorAIndemnizarPresupuesto,
    sumaAIndemnizar,
  };
}

/** Aplica un ítem del catálogo a la fila (conserva cantidad/valor/obs si ya hay). */
export function aplicarCatalogoAFilaContenido(row = {}, catalogoItem = null) {
  if (!catalogoItem) {
    return {
      ...row,
      catalogoId: '',
    };
  }
  return {
    ...row,
    catalogoId: catalogoItem.id,
    categoria: catalogoItem.categoria || row.categoria || '',
    articulo: catalogoItem.articulo || row.articulo || '',
    unidad: catalogoItem.unidad || row.unidad || 'und',
    articuloPolizaId: String(catalogoItem.id || '').startsWith('poliza_')
      ? catalogoItem.id
      : row.articuloPolizaId || '',
  };
}

/** Parsea monto es-CO (1.313.178,75) o número. */
export function parseMontoNsr10(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  let numero = compactarMontosEnLineaCOP(valor).replace(/[^\d.,-]/g, '').trim();
  if (!numero || numero === '-' || numero === '.' || numero === ',') return null;

  if (numero.includes(',') && numero.includes('.')) {
    if (numero.lastIndexOf(',') > numero.lastIndexOf('.')) {
      numero = numero.replace(/\./g, '').replace(',', '.');
    } else {
      numero = numero.replace(/,/g, '');
    }
  } else if (numero.includes(',')) {
    const partes = numero.split(',');
    if (partes.length === 2 && partes[1].length <= 2) {
      numero = `${partes[0].replace(/\./g, '')}.${partes[1]}`;
    } else {
      numero = numero.replace(/,/g, '');
    }
  } else if (numero.includes('.')) {
    const partes = numero.split('.');
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  }

  const n = Number(numero);
  return Number.isFinite(n) ? n : null;
}

/** 2107.5 → "2.107,50" (miles con punto). */
export function formatMilesNsr10(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = typeof valor === 'number' ? valor : parseMontoNsr10(valor);
  if (n === null || Number.isNaN(n)) return '';
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Mientras se escribe: miles con punto y decimales con coma. */
export function formatMilesInputNsr10(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const cleaned = String(valor).replace(/[^\d,]/g, '');
  const commaIdx = cleaned.indexOf(',');
  let enteros = (commaIdx >= 0 ? cleaned.slice(0, commaIdx) : cleaned).replace(/^0+(?=\d)/, '');
  const decimales =
    commaIdx >= 0 ? cleaned.slice(commaIdx + 1).replace(/,/g, '').slice(0, 2) : null;
  const enterosFmt = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (commaIdx >= 0) return `${enterosFmt},${decimales ?? ''}`;
  return enterosFmt;
}

export function totalFilaPresupuesto(row) {
  const cant = parseMontoNsr10(row?.cantidad);
  const vu = parseMontoNsr10(row?.valorUnitario);
  if (
    cant != null &&
    vu != null &&
    row?.cantidad !== '' &&
    row?.valorUnitario !== ''
  ) {
  return cant * vu;
  }
  // Fallback: total explícito (p. ej. liquidador Alfa sincronizado desde valorPerdida)
  const totalDirecto = parseMontoNsr10(row?.total);
  if (totalDirecto != null && row?.total !== '' && row?.total != null) {
    return totalDirecto;
  }
  return null;
}

export function calcularTotalesPresupuesto(presupuesto = {}, valoresAsegurablesCaso = null) {
  const items = Array.isArray(presupuesto.items) ? presupuesto.items : [];
  const subtotal = items.reduce((acc, row) => {
    const t = totalFilaPresupuesto(row);
    return acc + (t == null ? 0 : t);
  }, 0);
  const aiuPct = Number(presupuesto.aiuPorcentaje ?? 0.05);
  const imprPct = Number(presupuesto.imprevistosPorcentaje ?? 0.1);
  const impPct = Number(presupuesto.impuestosPorcentaje ?? 0);
  const aiu = subtotal * aiuPct;
  const imprevistos = (subtotal + aiu) * imprPct;
  const impuestos = (subtotal + aiu + imprevistos) * impPct;
  const total = subtotal + aiu + imprevistos + impuestos;
  const gruposDeducible = calcularGruposDeducibleDeItems(items, {
    grupoDefault: GRUPO_DEDUCIBLE_EDIFICIO,
    tipo: 'presupuesto',
    valoresAsegurablesCaso,
  });
  const deduciblePorArticulos = sumarDeduciblesFilas(items);
  return {
    subtotal,
    aiu,
    imprevistos,
    impuestos,
    total,
    aiuPct,
    imprPct,
    impPct,
    deduciblePorArticulos: Math.round(deduciblePorArticulos * 100) / 100,
    usaDeduciblePorArticulo: gruposDeducible.length > 0 || deduciblePorArticulos > 0,
    valorAIndemnizar: valorAIndemnizarDesdeGrupos(gruposDeducible),
    gruposDeducible,
  };
}

/** Traslada ítems con intervención Sí / Según alcance al presupuesto (si aún no están). */
export function sugerirFilasPresupuestoDesdeEvaluacion(items = [], filasActuales = []) {
  const existentes = new Set(
    (filasActuales || [])
      .map((f) => String(f?.codigoEvaluacion || '').trim())
      .filter(Boolean)
  );
  const nuevas = [];
  for (const it of items || []) {
    if (!it?.codigo || existentes.has(it.codigo)) continue;
    if (it.requiereIntervencion !== 'Sí' && it.requiereIntervencion !== 'Según alcance') {
      continue;
    }
    nuevas.push({
      ...crearFilaPresupuestoVacia(),
      codigoEvaluacion: it.codigo,
      componente: it.componente,
      actividad: it.elemento,
      observacion: it.observacion || '',
      prioridad:
        Number(it.puntaje) >= 3 ? 'Alto' : Number(it.puntaje) >= 2 ? 'Medio' : 'Bajo',
    });
  }
  return [...(filasActuales || []), ...nuevas];
}

export function crearPortadaNSR10Inicial(prefill = {}) {
  return {
    fechaInspeccion: prefill.fechaInspeccion || '',
    versionInforme: prefill.versionInforme || 'EVALUACIÓN PRELIMINAR',
    asegurado: prefill.asegurado || '',
    poliza: prefill.poliza || prefill.numeroPoliza || prefill.vigenciaPoliza || '',
    municipio: prefill.municipio || prefill.ciudad || '',
    direccion: prefill.direccion || prefill.direccionRiesgo || '',
    inspector:
      prefill.inspector ||
      prefill.actaAjustadorNombre ||
      prefill.funcionarioAsigna ||
      '',
    tipologiaPrincipal: prefill.tipologiaPrincipal || prefill.tipoInmueble || '',
    entorno: prefill.entorno || prefill.ubicacionRiesgo || '',
    numeroPisos: prefill.numeroPisos || prefill.nivelesInmueble || '',
    uso: prefill.uso || prefill.tipoRiesgoActa || prefill.tipoEvento || '',
    fechaSismo:
      prefill.fechaSismo || prefill.fechaOcurrencia || prefill.fechaSiniestro || '',
  };
}

/** Rellena vacíos de portada con datos del caso; no pisa lo ya digitado. */
export function fusionarPortadaConFormData(portadaActual = {}, formData = {}) {
  const desdeCaso = crearPortadaNSR10Inicial(formData || {});
  const actual = portadaActual && typeof portadaActual === 'object' ? portadaActual : {};
  const out = { ...desdeCaso };
  Object.keys(out).forEach((key) => {
    const v = actual[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      out[key] = v;
    }
  });
  if (!String(out.versionInforme || '').trim()) {
    out.versionInforme = 'EVALUACIÓN PRELIMINAR';
  }
  return out;
}

export function crearEvaluacionSismicaNSR10Inicial(prefill = {}) {
  return {
    hojaActiva: 'portada',
    portada: crearPortadaNSR10Inicial(prefill),
    items: crearItemsRespuestaVacios(),
    presupuesto: {
      items: Array.from({ length: 8 }, () => crearFilaPresupuestoVacia()),
      aiuPorcentaje: 0.05,
      imprevistosPorcentaje: 0.1,
      impuestosPorcentaje: 0,
    },
    contenidos: {
      tipoInmueble: prefill.tipoInmueble || prefill.tipologiaPrincipal || '',
      items: Array.from({ length: 6 }, () =>
        crearFilaContenidoVacia({
          tipoInmueble: prefill.tipoInmueble || prefill.tipologiaPrincipal || '',
        })
      ),
    },
    criterioFinal: null,
  };
}

/**
 * Restaura portada, presupuesto y contenidos; Evaluación/Dictamen quedan vacíos mientras estén ocultos.
 */
export function fusionarEvaluacionSismicaNSR10Guardada(guardada = {}, prefill = {}, opts = {}) {
  const base = crearEvaluacionSismicaNSR10Inicial(prefill);
  const actual = guardada && typeof guardada === 'object' ? guardada : {};
  const fusionada = {
    ...base,
    ...actual,
    hojaActiva: hojaActivaVisibleNSR10(actual.hojaActiva || base.hojaActiva),
    portada: fusionarPortadaConFormData(actual.portada || base.portada, prefill),
    presupuesto: {
      ...base.presupuesto,
      ...(actual.presupuesto || {}),
      items: Array.isArray(actual.presupuesto?.items)
        ? actual.presupuesto.items
        : base.presupuesto.items,
    },
    contenidos: {
      ...base.contenidos,
      ...(actual.contenidos || {}),
      items: Array.isArray(actual.contenidos?.items)
        ? actual.contenidos.items
        : base.contenidos.items,
    },
  };
  if (opts.recargosPresupuesto) {
    fusionada.presupuesto = aplicarRecargosPresupuestoNsr10(
      fusionada.presupuesto,
      opts.recargosPresupuesto
    );
  }
  if (!OCULTAR_EVALUACION_Y_DICTAMEN_NSR10) return fusionada;
  return {
    ...fusionada,
    items: crearItemsRespuestaVacios(),
    criterioFinal: null,
  };
}

/** Oculta Evaluación/Dictamen en el Excel (no las borra; Portada sigue leyendo fórmulas). */
export function ocultarHojasEvaluacionYDictamenExcel(workbook) {
  if (!OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 || !workbook) return;
  ['Evaluación', 'Dictamen', 'Listas'].forEach((nombre) => {
    const hoja = workbook.getWorksheet(nombre);
    if (hoja) hoja.state = 'hidden';
  });
  const portada = workbook.getWorksheet('Portada');
  if (!portada) return;
  const idx = workbook.worksheets.findIndex((h) => h.id === portada.id);
  if (idx < 0) return;
  workbook.views = [
    {
      x: 0,
      y: 0,
      width: 20000,
      height: 20000,
      firstSheet: 0,
      activeTab: idx,
      visibility: 'visible',
    },
  ];
}
