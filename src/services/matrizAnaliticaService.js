import { CATEGORIAS_RIESGO } from '../components/MatrizRiesgoAvanzada/matrizContenidoShared';
import {
  etiquetaEstadoRecomendacion,
  normalizarGestionRiesgos,
  resolverAvanceRecomendacion,
  resolverEstadoRecomendacion,
} from '../components/MatrizRiesgoAvanzada/gestionRiesgosHelpers';
import {
  calcularMaxImpacto,
  calcularNivelEjecutivo,
  calcularNivelInherente,
  calcularNivelResidualTecnico,
  calcularReduccion,
  categoriaPrincipal,
  etiquetasCategorias,
  extraerValoraciones,
  maxNivelEjecutivo,
  nivelEjecutivoDesdeResidualTecnico,
  nivelGeneralDesdePromedio,
  promedio,
  round1,
  roundPct,
  tieneControlDocumentado,
} from './matrizAnaliticaUtils';

function mapaRiesgosIdentificacion(identificacion = {}) {
  const mapa = new Map();
  for (const riesgo of identificacion.riesgos || []) {
    if (riesgo?.id) mapa.set(riesgo.id, riesgo);
  }
  return mapa;
}

function scoreInherenteDeValoracion(val) {
  const prob = Number(val.probabilidad) || 1;
  const impacto = Number(val.sumImpacto) || calcularMaxImpacto(val.impactosCategoria) || 1;
  return prob * impacto;
}

function scoreResidualDeValoracion(val) {
  const prob = Number(val.probResidual ?? val.probabilidad) || 1;
  const impacto = Number(val.sumImpactoResidual ?? val.sumImpacto) || 1;
  return prob * impacto;
}

function construirRiesgoEnriquecido(val, identificacionRiesgo = null) {
  const categorias = identificacionRiesgo?.categorias || {};
  const scoreInh = scoreInherenteDeValoracion(val);
  const scoreRes = scoreResidualDeValoracion(val);
  const nivelInh = calcularNivelInherente(
    val.probabilidad || 1,
    val.sumImpacto || calcularMaxImpacto(val.impactosCategoria) || 1
  );
  const nivelResTecnico = calcularNivelResidualTecnico(scoreRes);
  const nivelResEjecutivo =
    val.nivelRiesgo?.nivel != null
      ? nivelEjecutivoDesdeResidualTecnico(val.nivelRiesgo.nivel)
      : calcularNivelEjecutivo(scoreRes).nivel;

  return {
    id: val.id,
    numero: val.numero,
    nombre: val.riesgoIdentificado || identificacionRiesgo?.riesgoIdentificado || 'Sin nombre',
    proceso: val.nombreProceso || identificacionRiesgo?.nombreProceso || 'Sin proceso',
    tipoProceso: identificacionRiesgo?.tipoProceso || '',
    categorias: etiquetasCategorias(categorias, CATEGORIAS_RIESGO),
    categoriaPrincipal: categoriaPrincipal(categorias, CATEGORIAS_RIESGO),
    probabilidad: Number(val.probabilidad) || 1,
    impacto: Number(val.sumImpacto) || calcularMaxImpacto(val.impactosCategoria) || 1,
    scoreInherente: round1(scoreInh),
    nivelInherente: nivelInh.nivel,
    scoreResidual: round1(scoreRes),
    nivelResidual: nivelResEjecutivo,
    nivelResidualTecnico: nivelResTecnico.nivel,
    reduccionPorcentaje: calcularReduccion(scoreInh, scoreRes),
    responsable: val.controles?.cargoResponsable || '',
    tieneControles: tieneControlDocumentado(val.controles),
    controles: val.controles || {},
    tratamiento: val.nivelRiesgo?.nivel || nivelResTecnico.nivel,
  };
}

function construirRiesgosEnriquecidos(datosMatriz = {}) {
  const identificacionMap = mapaRiesgosIdentificacion(datosMatriz.identificacion);
  const valoraciones = extraerValoraciones(datosMatriz.valoracion);

  if (valoraciones.length > 0) {
    return valoraciones.map((val) =>
      construirRiesgoEnriquecido(val, identificacionMap.get(val.id))
    );
  }

  return (datosMatriz.identificacion?.riesgos || []).map((riesgo, index) =>
    construirRiesgoEnriquecido(
      {
        id: riesgo.id,
        numero: riesgo.numero ?? index + 1,
        nombreProceso: riesgo.nombreProceso,
        riesgoIdentificado: riesgo.riesgoIdentificado,
        probabilidad: 1,
        sumImpacto: 1,
        probResidual: 1,
        sumImpactoResidual: 1,
      },
      riesgo
    )
  );
}

function prioridadRecomendacion(nivelResidual = 'Medio') {
  if (nivelResidual === 'Crítico' || nivelResidual === 'Alto') return 'alta';
  if (nivelResidual === 'Medio') return 'media';
  return 'baja';
}

function analizarRecomendaciones(datosMatriz = {}, riesgos = []) {
  const gestion = normalizarGestionRiesgos(datosMatriz.gestionRiesgos || {});
  const lista = gestion.recomendaciones || [];
  const riesgoReferencia = riesgos.find((r) => r.nivelResidual === 'Crítico') || riesgos[0];

  const enriquecidas = lista
    .filter((rec) => String(rec.recomendacion || '').trim())
    .map((rec, index) => {
      const estado = resolverEstadoRecomendacion(rec);
      const avance = resolverAvanceRecomendacion(rec);
      return {
        id: rec.id ?? index,
        recomendacion: rec.recomendacion,
        riesgoAsociado: riesgoReferencia?.nombre || 'Matriz general',
        proceso: riesgoReferencia?.proceso || '',
        nivelResidual: riesgoReferencia?.nivelResidual || 'Medio',
        scoreResidual: riesgoReferencia?.scoreResidual || 0,
        responsable: riesgoReferencia?.responsable || '',
        fechaObjetivo: rec.fechaRecomendacion || '',
        estado,
        estadoEtiqueta: etiquetaEstadoRecomendacion(estado),
        avance,
        prioridad: prioridadRecomendacion(riesgoReferencia?.nivelResidual),
        comentarioSeguimiento:
          rec.seguimientos?.[rec.seguimientos.length - 1]?.comentarios || '',
      };
    });

  const abiertas = enriquecidas.filter((r) => r.estado === 'abierta').length;
  const enProceso = enriquecidas.filter((r) => r.estado === 'en_proceso').length;
  const avanzadas = enriquecidas.filter((r) => r.estado === 'avanzada').length;
  const cerradas = enriquecidas.filter((r) => r.estado === 'cerrada').length;
  const total = enriquecidas.length;
  const avancePlan =
    total > 0 ? roundPct(enriquecidas.reduce((sum, r) => sum + r.avance, 0) / total) : 0;

  return { lista: enriquecidas, abiertas, enProceso, avanzadas, cerradas, total, avancePlan };
}

function contarPorCampo(riesgos, campo) {
  const mapa = new Map();
  for (const riesgo of riesgos) {
    const clave = riesgo[campo] || 'Sin dato';
    mapa.set(clave, (mapa.get(clave) || 0) + 1);
  }
  return [...mapa.entries()]
    .map(([nombre, total]) => ({
      nombre,
      total,
      porcentaje: riesgos.length ? roundPct((total / riesgos.length) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function semaforoPorCampo(riesgos, campo) {
  const mapa = new Map();
  for (const riesgo of riesgos) {
    const clave = riesgo[campo] || 'Sin dato';
    const actual = mapa.get(clave) || [];
    actual.push(riesgo.nivelResidual);
    mapa.set(clave, actual);
  }
  return [...mapa.entries()]
    .map(([nombre, niveles]) => ({
      nombre,
      nivel: maxNivelEjecutivo(niveles),
      totalRiesgos: niveles.length,
    }))
    .sort((a, b) => b.totalRiesgos - a.totalRiesgos);
}

function generarHallazgos({ riesgos, kpis, porProceso, porCategoria, recomendaciones }) {
  const hallazgos = [];
  const topProcesos = porProceso.slice(0, 2);
  const concentracionProcesos = topProcesos.reduce((sum, p) => sum + p.porcentaje, 0);

  if (topProcesos.length >= 2) {
    hallazgos.push({
      id: 'concentracion-procesos',
      texto: `El ${roundPct(concentracionProcesos)}% de los riesgos se concentra en los procesos ${topProcesos[0].nombre} y ${topProcesos[1].nombre}.`,
    });
  }

  if (kpis.criticos > 0) {
    hallazgos.push({
      id: 'riesgos-criticos',
      texto: `Existen ${kpis.criticos} riesgos críticos que requieren intervención prioritaria (${roundPct((kpis.criticos / Math.max(kpis.totalRiesgos, 1)) * 100)}% del total).`,
    });
  }

  if (kpis.reduccionPromedio > 0) {
    hallazgos.push({
      id: 'reduccion-controles',
      texto: `Los controles actuales reducen el riesgo promedio en un ${kpis.reduccionPromedio}%.`,
    });
  }

  if (porProceso[0]) {
    hallazgos.push({
      id: 'mayor-exposicion',
      texto: `El proceso ${porProceso[0].nombre} presenta la mayor exposición al riesgo.`,
    });
  }

  if (porCategoria[0]) {
    hallazgos.push({
      id: 'categoria-dominante',
      texto: `La categoría ${porCategoria[0].nombre} concentra el ${porCategoria[0].porcentaje}% del total de riesgos.`,
    });
  }

  if (recomendaciones.total > 0) {
    const pctAbiertas = roundPct((recomendaciones.abiertas / recomendaciones.total) * 100);
    hallazgos.push({
      id: 'recomendaciones-abiertas',
      texto: `El ${pctAbiertas}% de las recomendaciones se encuentra abierta.`,
    });
  }

  const conclusion = [
    `La organización presenta un nivel de riesgo ${kpis.nivelGeneral}.`,
    kpis.reduccionPromedio > 0
      ? `Los controles reducen el riesgo en un ${kpis.reduccionPromedio}%.`
      : 'Aún no se evidencia reducción significativa del riesgo residual.',
    kpis.criticos > 0
      ? `Se identificaron ${kpis.criticos} riesgos críticos que requieren atención inmediata.`
      : 'No se registran riesgos críticos en esta evaluación.',
  ].join(' ');

  return { lista: hallazgos.slice(0, 8), conclusion };
}

const NIVELES_MADUREZ = [
  {
    nivel: 1,
    nombre: 'INICIAL',
    descripcion: 'Procesos ad-hoc. Sin estructura definida.',
  },
  {
    nivel: 2,
    nombre: 'BÁSICO',
    descripcion: 'Procesos definidos parcialmente.',
  },
  {
    nivel: 3,
    nombre: 'CONTROLADO',
    descripcion: 'Procesos estandarizados y documentados.',
  },
  {
    nivel: 4,
    nombre: 'GESTIONADO',
    descripcion: 'Gestión proactiva y medición continua.',
  },
  {
    nivel: 5,
    nombre: 'OPTIMIZADO',
    descripcion: 'Mejora continua e innovación.',
  },
];

const ACCIONES_MADUREZ = [
  {
    titulo: 'Fortalecer cultura de riesgos',
    descripcion: 'Capacitación y sensibilización en gestión de riesgos.',
  },
  {
    titulo: 'Mejorar evaluación de riesgos',
    descripcion: 'Análisis cuantitativo para riesgos críticos.',
  },
  {
    titulo: 'Automatizar seguimiento',
    descripcion: 'Herramientas de monitoreo en tiempo real.',
  },
  {
    titulo: 'Medir y reportar indicadores',
    descripcion: 'KPIs de riesgo para alta dirección.',
  },
];

function clamp15(n) {
  return Math.max(1, Math.min(5, round1(n)));
}

function calcularIndicadorMadurez(kpis, riesgos, recomendaciones) {
  const total = Math.max(riesgos.length, 1);
  const pctControles = kpis.controlesDocumentados / total;
  const pctValorados =
    riesgos.filter((r) => r.scoreInherente > 1 || r.probabilidad > 1).length / total;
  const pctReduccion = Math.min(kpis.reduccionPromedio / 55, 1);
  const pctSeguimiento =
    recomendaciones.total > 0
      ? (recomendaciones.cerradas + recomendaciones.avanzadas + recomendaciones.enProceso) /
        recomendaciones.total
      : 0;
  const avance = kpis.avancePlanAccion / 100;

  const factores = [
    {
      id: 'gobernanza',
      etiqueta: 'Gobernanza y cultura',
      puntaje: clamp15(avance * 2.5 + pctSeguimiento * 2.5),
    },
    {
      id: 'identificacion',
      etiqueta: 'Identificación de Riesgos',
      puntaje: clamp15(pctValorados * 5),
    },
    {
      id: 'evaluacion',
      etiqueta: 'Evaluación y Priorización',
      puntaje: clamp15(pctValorados * 3.5 + (1 - kpis.criticos / total) * 1.5),
    },
    {
      id: 'respuesta',
      etiqueta: 'Respuesta al Riesgo',
      puntaje: clamp15(pctControles * 2.5 + pctReduccion * 2.5),
    },
    {
      id: 'monitoreo',
      etiqueta: 'Monitoreo y Mejora Continua',
      puntaje: clamp15(pctSeguimiento * 2.5 + avance * 2.5),
    },
  ];

  const promedioMadurez = promedio(factores, (f) => f.puntaje);
  const nivelActual = Math.max(1, Math.min(5, Math.round(promedioMadurez)));
  const nivelDetalle = NIVELES_MADUREZ.find((n) => n.nivel === nivelActual) || NIVELES_MADUREZ[0];
  const proximoNivel = NIVELES_MADUREZ.find((n) => n.nivel === Math.min(5, nivelActual + 1));

  return {
    factores,
    promedioMadurez,
    nivelActual,
    nivelDetalle,
    proximoNivel,
    niveles: NIVELES_MADUREZ,
    acciones: ACCIONES_MADUREZ,
    resumen: `La organización se encuentra en nivel ${nivelDetalle.nombre} porque los procesos están ${nivelDetalle.descripcion.toLowerCase()}`,
  };
}

function construirEvolucion(analiticasPorPeriodo = []) {
  const porAnio = new Map();
  for (const punto of analiticasPorPeriodo) {
    const anio = punto.anio || new Date(punto.fecha || Date.now()).getFullYear();
    porAnio.set(anio, punto);
  }
  return [...porAnio.entries()]
    .sort(([a], [b]) => a - b)
    .map(([anio, punto]) => ({
      anio,
      inherente: punto.inherente,
      residual: punto.residual,
      madurez: punto.madurez,
    }));
}

function analiticaLigera(datosMatriz) {
  const riesgos = construirRiesgosEnriquecidos(datosMatriz);
  const recomendaciones = analizarRecomendaciones(datosMatriz, riesgos);
  const inh = promedio(riesgos, (r) => r.scoreInherente);
  const res = promedio(riesgos, (r) => r.scoreResidual);
  const kpisParciales = {
    totalRiesgos: riesgos.length,
    criticos: riesgos.filter((r) => r.nivelResidual === 'Crítico').length,
    controlesDocumentados: riesgos.filter((r) => r.tieneControles).length,
    reduccionPromedio: calcularReduccion(inh, res),
    avancePlanAccion: recomendaciones.avancePlan,
  };
  const madurez = calcularIndicadorMadurez(kpisParciales, riesgos, recomendaciones);
  return { inherente: inh, residual: res, madurez: madurez.promedioMadurez };
}

function procesosConCriticosAltos(riesgos = []) {
  const mapa = new Map();
  for (const riesgo of riesgos) {
    if (riesgo.nivelResidual !== 'Crítico' && riesgo.nivelResidual !== 'Alto') continue;
    const clave = riesgo.proceso || 'Sin proceso';
    mapa.set(clave, (mapa.get(clave) || 0) + 1);
  }
  return [...mapa.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
}

function agruparRecomendacionesPorPrioridad(lista = []) {
  const orden = { alta: 0, media: 1, baja: 2 };
  const grupos = { alta: [], media: [], baja: [] };
  for (const rec of lista) {
    grupos[rec.prioridad]?.push(rec);
  }
  for (const key of Object.keys(grupos)) {
    grupos[key].sort((a, b) => b.avance - a.avance || b.scoreResidual - a.scoreResidual);
  }
  return {
    alta: grupos.alta,
    media: grupos.media,
    baja: grupos.baja,
    ordenadas: [...grupos.alta, ...grupos.media, ...grupos.baja].sort(
      (a, b) => orden[a.prioridad] - orden[b.prioridad]
    ),
  };
}

function generarResumenEjecutivo({
  kpis,
  porProceso,
  porCategoria,
  hallazgos,
  recomendaciones,
  top10,
  comparativoPorProceso,
}) {
  const procesosTop = porProceso.slice(0, 2);
  const nombresProcesos = procesosTop.map((p) => p.nombre).join(' y ');
  const mayorReduccion =
    [...comparativoPorProceso].sort((a, b) => b.reduccion - a.reduccion)[0] || null;

  const conclusiones = [
    {
      titulo: 'Nivel general de riesgo',
      texto: `La organización presenta un nivel de riesgo ${kpis.nivelGeneral} (residual promedio ${kpis.riesgoResidualPromedio}).`,
    },
    {
      titulo: 'Procesos más críticos',
      texto:
        procesosTop.length >= 2
          ? `Los procesos ${nombresProcesos} concentran la mayor exposición al riesgo.`
          : 'Aún no hay suficientes procesos evaluados para determinar concentración.',
    },
    {
      titulo: 'Riesgos que requieren acción inmediata',
      texto:
        kpis.criticos > 0
          ? `Se identificaron ${kpis.criticos} riesgos críticos que requieren intervención prioritaria.`
          : 'No se registran riesgos críticos en esta evaluación.',
    },
    {
      titulo: 'Efectividad de controles',
      texto:
        kpis.reduccionPromedio > 0
          ? `Los controles reducen el riesgo promedio en un ${kpis.reduccionPromedio}%${
              mayorReduccion ? `; el mayor impacto se observa en ${mayorReduccion.proceso}.` : '.'
            }`
          : 'Los controles actuales no evidencian reducción significativa del riesgo.',
    },
    {
      titulo: 'Recomendaciones prioritarias',
      texto:
        recomendaciones.abiertas > 0
          ? `Hay ${recomendaciones.abiertas} recomendaciones abiertas (${recomendaciones.porPrioridad.alta.length} de prioridad alta).`
          : 'No hay recomendaciones pendientes de ejecución.',
    },
    {
      titulo: 'Conclusión general',
      texto: hallazgos.conclusion,
    },
  ];

  const proximosPasos = [];
  if (kpis.criticos > 0) {
    proximosPasos.push(`Atender los ${kpis.criticos} riesgos críticos identificados.`);
  }
  if (procesosTop[0]) {
    proximosPasos.push(`Fortalecer controles en el proceso ${procesosTop[0].nombre}.`);
  }
  if (recomendaciones.porPrioridad.alta.length > 0) {
    proximosPasos.push('Ejecutar las recomendaciones de prioridad alta.');
  }
  if (porCategoria[0]) {
    proximosPasos.push(`Revisar riesgos de la categoría ${porCategoria[0].nombre}.`);
  }
  if (top10[0]) {
    proximosPasos.push(`Monitorear de cerca: ${top10[0].nombre}.`);
  }
  if (!proximosPasos.length) {
    proximosPasos.push('Mantener el monitoreo periódico de la matriz de riesgos.');
  }

  return { conclusiones, proximosPasos, mayorReduccion };
}

/**
 * Punto de entrada: transforma datosMatriz en lectura ejecutiva.
 * @param {object} datosMatriz
 * @param {{ historicoMatrices?: Array<{ fecha?: string, datosMatriz: object }> }} opciones
 */
export function calcularAnaliticaMatriz(datosMatriz = {}, opciones = {}) {
  const riesgos = construirRiesgosEnriquecidos(datosMatriz);
  const recomendaciones = analizarRecomendaciones(datosMatriz, riesgos);

  const criticos = riesgos.filter((r) => r.nivelResidual === 'Crítico').length;
  const altos = riesgos.filter((r) => r.nivelResidual === 'Alto').length;
  const medios = riesgos.filter((r) => r.nivelResidual === 'Medio').length;
  const bajos = riesgos.filter((r) => r.nivelResidual === 'Bajo').length;

  const riesgoInherentePromedio = promedio(riesgos, (r) => r.scoreInherente);
  const riesgoResidualPromedio = promedio(riesgos, (r) => r.scoreResidual);
  const reduccionPromedio = calcularReduccion(riesgoInherentePromedio, riesgoResidualPromedio);

  const procesosEvaluados = new Set(riesgos.map((r) => r.proceso).filter(Boolean)).size;
  const controlesDocumentados = riesgos.filter((r) => r.tieneControles).length;

  const kpis = {
    totalRiesgos: riesgos.length,
    criticos,
    altos,
    medios,
    bajos,
    riesgoInherentePromedio,
    riesgoResidualPromedio,
    reduccionPromedio,
    procesosEvaluados,
    controlesDocumentados,
    recomendacionesAbiertas: recomendaciones.abiertas,
    recomendacionesEnProceso: recomendaciones.enProceso,
    recomendacionesAvanzadas: recomendaciones.avanzadas,
    recomendacionesCerradas: recomendaciones.cerradas,
    totalRecomendaciones: recomendaciones.total,
    avancePlanAccion: recomendaciones.avancePlan,
    nivelGeneral: nivelGeneralDesdePromedio(riesgoResidualPromedio),
    nivelGeneralDetalle: calcularNivelEjecutivo(riesgoResidualPromedio),
  };

  const porProceso = contarPorCampo(riesgos, 'proceso');
  const porCategoria = contarPorCampo(
    riesgos.flatMap((r) =>
      (r.categorias.length ? r.categorias : [r.categoriaPrincipal]).map((cat) => ({
        ...r,
        categoriaPrincipal: cat,
      }))
    ),
    'categoriaPrincipal'
  );

  const porNivel = [
    { nombre: 'Crítico', total: criticos },
    { nombre: 'Alto', total: altos },
    { nombre: 'Medio', total: medios },
    { nombre: 'Bajo', total: bajos },
  ];

  const top10 = [...riesgos]
    .sort((a, b) => b.scoreResidual - a.scoreResidual || b.scoreInherente - a.scoreInherente)
    .slice(0, 10)
    .map((riesgo, index) => ({
      ...riesgo,
      ranking: index + 1,
      recomendacionPrincipal:
        recomendaciones.lista.find((r) => r.prioridad === 'alta')?.recomendacion ||
        recomendaciones.lista[0]?.recomendacion ||
        'Definir plan de tratamiento',
      estadoTratamiento: riesgo.nivelResidual,
    }));

  const comparativo = riesgos
    .map((r) => ({
      nombre: r.nombre,
      proceso: r.proceso,
      inherente: r.scoreInherente,
      residual: r.scoreResidual,
      reduccion: r.reduccionPorcentaje,
    }))
    .sort((a, b) => b.inherente - a.inherente)
    .slice(0, 10);

  const comparativoPorProceso = semaforoPorCampo(riesgos, 'proceso').map((item) => {
    const delProceso = riesgos.filter((r) => r.proceso === item.nombre);
    return {
      proceso: item.nombre,
      inherentePromedio: promedio(delProceso, (r) => r.scoreInherente),
      residualPromedio: promedio(delProceso, (r) => r.scoreResidual),
      reduccion: calcularReduccion(
        promedio(delProceso, (r) => r.scoreInherente),
        promedio(delProceso, (r) => r.scoreResidual)
      ),
      nivel: item.nivel,
      total: item.totalRiesgos,
    };
  });

  const hallazgos = generarHallazgos({
    riesgos,
    kpis,
    porProceso,
    porCategoria,
    recomendaciones,
  });

  const recomendacionesPorPrioridad = agruparRecomendacionesPorPrioridad(recomendaciones.lista);
  recomendaciones.porPrioridad = recomendacionesPorPrioridad;

  const procesosCriticosAltos = procesosConCriticosAltos(riesgos);

  const resumenEjecutivo = generarResumenEjecutivo({
    kpis,
    porProceso,
    porCategoria,
    hallazgos,
    recomendaciones,
    top10,
    comparativoPorProceso,
  });

  const estadoRecomendaciones = [
    { nombre: 'No iniciadas', total: recomendaciones.abiertas, color: '#dc3545' },
    { nombre: 'En proceso', total: recomendaciones.enProceso, color: '#fd7e14' },
    { nombre: 'Avanzadas', total: recomendaciones.avanzadas, color: '#eab308' },
    { nombre: 'Completadas', total: recomendaciones.cerradas, color: '#28a745' },
  ].filter((item) => item.total > 0);

  const madurez = calcularIndicadorMadurez(kpis, riesgos, recomendaciones);

  const historico = Array.isArray(opciones.historicoMatrices) ? opciones.historicoMatrices : [];
  const puntosEvolucion = [
    ...historico.map((item) => ({
      fecha: item.fecha,
      ...analiticaLigera(item.datosMatriz || {}),
    })),
    {
      fecha: datosMatriz.informacion?.fechaCreacion || new Date().toISOString(),
      ...analiticaLigera(datosMatriz),
    },
  ];
  const evolucion = construirEvolucion(puntosEvolucion);

  return {
    meta: {
      empresa: datosMatriz.informacion?.nombreEmpresa || '',
      responsable: datosMatriz.informacion?.responsable || '',
      generadoEn: new Date().toISOString(),
    },
    kpis,
    riesgos,
    top10,
    porProceso,
    porCategoria,
    porNivel,
    semaforoProcesos: semaforoPorCampo(riesgos, 'proceso'),
    semaforoCategorias: semaforoPorCampo(riesgos, 'categoriaPrincipal'),
    comparativo,
    comparativoPorProceso,
    recomendaciones,
    hallazgos,
    resumenEjecutivo,
    procesosCriticosAltos,
    estadoRecomendaciones,
    madurez,
    evolucion,
  };
}
