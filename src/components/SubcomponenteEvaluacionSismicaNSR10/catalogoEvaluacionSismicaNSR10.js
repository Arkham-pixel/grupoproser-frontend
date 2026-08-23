/**
 * Plantilla exacta: Plantilla_Evaluacion_Sismica_NSR10.xlsx
 * Hojas: Listas | Portada | Evaluación | Dictamen | Presupuesto
 */

import {
  SMMLV_DEFAULT,
  resolverSmmlvPorAnio,
} from '../SubcomponenteExpress/liquidadorExpressHelpers.js';

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
  { id: 'totales', label: 'Totales' },
];

/** En liquidador / informe único se navega entre Presupuesto, Contenidos y Totales. */
export const HOJAS_LIQUIDADOR_NSR10 = [
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'contenidos', label: 'Contenidos' },
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
    valorAsegurable: extras.valorAsegurable ?? '',
    porcentajeDeducible: extras.porcentajeDeducible ?? '',
    cantidadMinimoSMMLV: extras.cantidadMinimoSMMLV ?? '',
    valorMinimo: extras.valorMinimo ?? '',
    deducibleCalculado: extras.deducibleCalculado ?? '',
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

export function reglaDeduciblePorCobertura(cobertura) {
  const id = normalizarIdCobertura(cobertura);
  return REGLAS_DEDUCIBLE_POR_COBERTURA[id] || null;
}

/** Fila con artículo real y valor asegurable: ahí sí se hereda cobertura y se calcula. */
export function filaContenidoListaParaDeducible(row = {}) {
  const articulo = String(row.articulo || '').trim();
  const catalogoId = String(row.catalogoId || '').trim();
  const va = parseMontoNsr10(row.valorAsegurable);
  return Boolean(articulo || catalogoId) && va != null && va > 0;
}

export function filaContenidoTieneDeducibleArticulo(row = {}) {
  if (!filaContenidoListaParaDeducible(row)) return false;
  const cob = String(row.coberturaAfectar || row.tipoCobertura || '').trim();
  const ded = parseMontoNsr10(row.deducibleCalculado);
  return Boolean(cob) && ded != null && ded > 0;
}

/**
 * Recalcula % / mínimo / deducible de una fila según la cobertura.
 * Terremoto: MAX(valor asegurable × 3%, 3 SMMLV).
 * Filas vacías no muestran ni heredan cifras financieras.
 */
export function aplicarDeducibleCoberturaFila(row = {}, smmlvCfg = {}) {
  if (!filaContenidoListaParaDeducible(row)) {
    return {
      ...row,
      coberturaAfectar: '',
      tipoCobertura: '',
      porcentajeDeducible: '',
      cantidadMinimoSMMLV: '',
      valorMinimo: '',
      deducibleCalculado: '',
    };
  }

  const cobertura = row.coberturaAfectar || row.tipoCobertura || '';
  const idCob = normalizarIdCobertura(cobertura);
  const regla = reglaDeduciblePorCobertura(idCob);
  const etiqueta = etiquetaCoberturaArticulo(cobertura);
  const next = {
    ...row,
    coberturaAfectar: cobertura,
    tipoCobertura: etiqueta || row.tipoCobertura || '',
  };

  if (!idCob) {
    return {
      ...next,
      porcentajeDeducible: next.porcentajeDeducible ?? '',
      valorMinimo: next.valorMinimo ?? '',
      deducibleCalculado: next.deducibleCalculado ?? '',
    };
  }

  const anioRef = Number(smmlvCfg.anioSMMLV) || new Date().getFullYear();
  const smmlv = resolverSmmlvPorAnio(anioRef);
  const valorSMMLV =
    parseMontoNsr10(smmlvCfg.valorSMMLV) ||
    smmlv.valor ||
    SMMLV_DEFAULT;
  const va = parseMontoNsr10(next.valorAsegurable);

  if (regla) {
    const cantidadSMMLV = Number(regla.cantidadSMMLV) || 0;
    const porcentaje = Number(regla.porcentaje) || 0;
    const valorMinimo = Math.round(cantidadSMMLV * valorSMMLV * 100) / 100;
    next.porcentajeDeducible = porcentaje;
    next.cantidadMinimoSMMLV = cantidadSMMLV;
    next.valorMinimo = valorMinimo;
    const porPct = va * (porcentaje / 100);
    next.deducibleCalculado = Math.round(Math.max(porPct, valorMinimo) * 100) / 100;
    return next;
  }

  const porcentaje = Number(next.porcentajeDeducible);
  const valorMinimo = parseMontoNsr10(next.valorMinimo) || 0;
  if ((!Number.isFinite(porcentaje) || porcentaje <= 0) && valorMinimo <= 0) {
    next.deducibleCalculado = '';
    return next;
  }
  if (va == null || va <= 0) {
    next.deducibleCalculado = '';
    return next;
  }
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

export function calcularTotalesContenidos(contenidos = {}) {
  const items = Array.isArray(contenidos.items) ? contenidos.items : [];
  const subtotal = items.reduce((acc, row) => {
    const t = totalFilaContenido(row);
    return acc + (t == null ? 0 : t);
  }, 0);
  const filasConDeducible = items.filter(filaContenidoTieneDeducibleArticulo);
  const deduciblePorArticulos = filasConDeducible.reduce((acc, row) => {
    const n = parseMontoNsr10(row.deducibleCalculado);
    return acc + (n == null ? 0 : n);
  }, 0);
  const valorAsegurableTotal = items.reduce((acc, row) => {
    const n = parseMontoNsr10(row.valorAsegurable);
    return acc + (n == null ? 0 : n);
  }, 0);
  return {
    subtotal,
    total: subtotal,
    deduciblePorArticulos: Math.round(deduciblePorArticulos * 100) / 100,
    usaDeduciblePorArticulo: filasConDeducible.length > 0,
    valorAsegurableTotal: Math.round(valorAsegurableTotal * 100) / 100,
  };
}

/**
 * Resumen unificado para la ventana Totales y el informe único.
 * sumaCompleta = total presupuesto NSR-10 + total contenidos.
 */
export function calcularResumenTotalesNsr10(evalData = {}) {
  const presupuesto = evalData.presupuesto || {};
  const contenidos = evalData.contenidos || {};
  const totalesPresupuesto = calcularTotalesPresupuesto(presupuesto);
  const totalesContenidos = calcularTotalesContenidos(contenidos);
  const totalPresupuesto = Number(totalesPresupuesto.total) || 0;
  const totalContenidos = Number(totalesContenidos.total) || 0;
  const sumaCompleta = Math.round((totalPresupuesto + totalContenidos) * 100) / 100;
  return {
    presupuesto: totalesPresupuesto,
    contenidos: totalesContenidos,
    totalPresupuesto,
    totalContenidos,
    sumaCompleta,
    deduciblePorArticulos: totalesContenidos.deduciblePorArticulos || 0,
    usaDeduciblePorArticulo: Boolean(totalesContenidos.usaDeduciblePorArticulo),
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
  };
}

/** Parsea monto es-CO (1.313.178,75) o número. */
export function parseMontoNsr10(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  let numero = String(valor).replace(/[^\d.,-]/g, '').trim();
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
  if (cant == null || vu == null || row?.cantidad === '' || row?.valorUnitario === '') {
    return null;
  }
  return cant * vu;
}

export function calcularTotalesPresupuesto(presupuesto = {}) {
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
  return { subtotal, aiu, imprevistos, impuestos, total, aiuPct, imprPct, impPct };
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
export function fusionarEvaluacionSismicaNSR10Guardada(guardada = {}, prefill = {}) {
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
