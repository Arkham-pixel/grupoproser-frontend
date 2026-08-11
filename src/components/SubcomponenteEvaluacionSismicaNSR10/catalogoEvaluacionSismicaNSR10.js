/**
 * Plantilla exacta: Plantilla_Evaluacion_Sismica_NSR10.xlsx
 * Hojas: Listas | Portada | Evaluación | Dictamen | Presupuesto
 */

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

export const UNIDADES_PRESUPUESTO_NSR10 = ['m²', 'm³', 'ml', 'und', 'kg', 'día', 'gl', 'mes', 'otro'];

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

export const HOJAS_NSR10 = [
  { id: 'listas', label: 'Listas', oculta: true },
  { id: 'portada', label: 'Portada' },
  { id: 'evaluacion', label: 'Evaluación' },
  { id: 'dictamen', label: 'Dictamen' },
  { id: 'presupuesto', label: 'Presupuesto' },
];

export const HOJAS_VISIBLES_NSR10 = HOJAS_NSR10.filter((h) => !h.oculta);

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

export function totalFilaPresupuesto(row) {
  const cant = Number(row?.cantidad);
  const vu = Number(row?.valorUnitario);
  if (!Number.isFinite(cant) || !Number.isFinite(vu) || row?.cantidad === '' || row?.valorUnitario === '') {
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
    criterioFinal: null,
  };
}
