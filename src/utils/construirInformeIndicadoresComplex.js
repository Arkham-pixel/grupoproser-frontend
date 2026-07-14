/**
 * Arma los datos del informe de indicadores COMPLEX (históricos + protocolo).
 */

import {
  INDICADORES_PROTOCOLO_DEF,
  PROTOCOLO_DOCUMENTO,
  PROTOCOLO_FECHA_ACTIVACION,
} from '../config/protocoloSiniestrosDefaults.js';
import {
  agruparIndicadoresProtocolo,
  calcularConsolidadoEstados,
  calcularIndicadoresGlobales,
  calcularIndicadoresPorResponsable,
  calcularIndicadoresProtocoloGlobales,
  combinarCasosComplex,
  filtrarCasosPorPeriodo,
  filtrarCasosProtocolo,
  formatearTiempoPromedio,
  resolverGrupoAjustador,
} from './complexTrazabilidadUtils.js';
import {
  agruparCumplimientoProtocolo,
  calcularCumplimientoProtocoloGlobales,
  formatearPorcentajeCumplimiento,
} from './complexProtocoloCumplimientoUtils.js';

const INDICADORES_HISTORICO_EXPORT = [
  { clave: 'promedioAsignacionContacto', muestra: 'asignacionContacto', titulo: 'Asignación → Primer contacto' },
  { clave: 'promedioContactoInspeccion', muestra: 'contactoInspeccion', titulo: 'Primer contacto → Inspección' },
  { clave: 'promedioEtapaPreliminar', muestra: 'etapaPreliminar', titulo: 'Inspección o solicitud → Informe preliminar' },
  { clave: 'promedioUltimoDocInformeFinal', muestra: 'ultimoDocInformeFinal', titulo: 'Último documento → Informe final' },
];

const ETAPAS_PROTOCOLO_EXPORT = INDICADORES_PROTOCOLO_DEF.filter(
  (d) => d.etapaId && d.imputableAjustador !== false
);

function acortarEtiqueta(texto, max = 28) {
  if (!texto) return '';
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

/** Valor numérico para barras (días; si es <1 día se grafica en horas). */
function valorNumericoTiempo(diasPromedio) {
  if (diasPromedio == null || Number.isNaN(diasPromedio)) return null;
  if (diasPromedio < 1) return Math.round(diasPromedio * 24 * 10) / 10;
  return Math.round(diasPromedio * 10) / 10;
}

function unidadTiempoGrafico(diasPromedio) {
  return diasPromedio != null && diasPromedio < 1 ? 'horas' : 'días';
}

function construirGraficosInforme({
  indicadoresHistoricos,
  porResponsableHistorico,
  indicadoresProtocolo,
  cumplimientoProtocolo,
  porAjustadorProtocolo,
  cumplimientoMapa,
  consolidadoHistorico,
}) {
  const historicoTiempos = INDICADORES_HISTORICO_EXPORT.map((ind) => ({
    nombre: ind.titulo,
    nombreCorto: acortarEtiqueta(ind.titulo, 22),
    dias: indicadoresHistoricos[ind.clave],
    valor: valorNumericoTiempo(indicadoresHistoricos[ind.clave]),
    unidad: unidadTiempoGrafico(indicadoresHistoricos[ind.clave]),
    etiqueta: formatearTiempoPromedio(indicadoresHistoricos[ind.clave]),
  })).filter((item) => item.valor != null);

  const historicoEsperaDocs = [...porResponsableHistorico]
    .filter((f) => f.casosEsperaDocumentos > 0)
    .sort((a, b) => b.casosEsperaDocumentos - a.casosEsperaDocumentos)
    .slice(0, 10)
    .map((f) => ({
      nombre: acortarEtiqueta(f.nombre, 20),
      nombreCompleto: f.nombre,
      cantidad: f.casosEsperaDocumentos,
    }));

  const volumenCasos = [
    { etiqueta: 'Total histórico', valor: indicadoresHistoricos.totalCasos },
    { etiqueta: 'Facturados', valor: consolidadoHistorico?.cierreExitoso ?? indicadoresHistoricos.cerradosPeriodo },
    { etiqueta: 'Otros cerrados', valor: consolidadoHistorico?.otrosCerrados ?? 0 },
    { etiqueta: 'En gestión', valor: consolidadoHistorico?.enGestion ?? 0 },
    { etiqueta: 'Casos protocolo', valor: indicadoresProtocolo.totalCasos },
    { etiqueta: 'Docs. > 30 días', valor: indicadoresProtocolo.pendientesDocs30Dias },
  ].filter((item) => item.valor > 0);

  const porcentajeCierre = [
    {
      etiqueta: '% cierre exitoso',
      valor: consolidadoHistorico?.porcentajeCierreExitoso ?? 0,
      color: '#16A34A',
    },
    {
      etiqueta: '% otros cerrados',
      valor: consolidadoHistorico?.porcentajeOtrosCerrados ?? 0,
      color: '#C8102E',
    },
    {
      etiqueta: '% en gestión',
      valor: consolidadoHistorico?.porcentajeEnGestion ?? 0,
      color: '#2563EB',
    },
  ];

  const consolidadoEstadosBarras = (consolidadoHistorico?.porEstado || [])
    .slice(0, 12)
    .map((f) => ({
      nombre: acortarEtiqueta(f.estado, 24),
      nombreCompleto: f.estado,
      cantidad: f.cantidad,
      porcentaje: f.porcentaje ?? null,
      categoria: f.categoria,
    }));

  const protocoloCumplimiento = ETAPAS_PROTOCOLO_EXPORT.map((ind, index) => {
    const datos = cumplimientoProtocolo[ind.muestra];
    return {
      orden: index + 1,
      nombre: ind.label,
      nombreCorto: `Paso ${index + 1}`,
      porcentaje: datos?.porcentaje ?? null,
      cumplidos: datos?.cumplidos ?? 0,
      evaluables: datos?.evaluables ?? 0,
    };
  }).filter((item) => item.evaluables > 0);

  const protocoloTiempos = ETAPAS_PROTOCOLO_EXPORT.map((ind, index) => ({
    orden: index + 1,
    nombre: ind.label,
    nombreCorto: `Paso ${index + 1}`,
    valor: valorNumericoTiempo(indicadoresProtocolo[ind.clave]),
    unidad: unidadTiempoGrafico(indicadoresProtocolo[ind.clave]),
    etiqueta: formatearTiempoPromedio(indicadoresProtocolo[ind.clave]),
  })).filter((item) => item.valor != null);

  const protocoloCasosPorAjustador = [...porAjustadorProtocolo]
    .sort((a, b) => b.totalCasos - a.totalCasos)
    .slice(0, 10)
    .map((f) => ({
      nombre: acortarEtiqueta(f.nombre, 20),
      nombreCompleto: f.nombre,
      casos: f.totalCasos,
    }));

  const protocoloCumplimientoAjustador = [...porAjustadorProtocolo]
    .map((f) => {
      const cumpl = cumplimientoMapa[f.clave] || cumplimientoMapa[f.nombre];
      return {
        nombre: acortarEtiqueta(f.nombre, 20),
        nombreCompleto: f.nombre,
        porcentaje: cumpl?.general?.porcentaje ?? null,
        casos: f.totalCasos,
      };
    })
    .filter((f) => f.porcentaje != null && f.casos > 0)
    .sort((a, b) => a.porcentaje - b.porcentaje)
    .slice(0, 10);

  return {
    volumenCasos,
    porcentajeCierre,
    consolidadoEstadosBarras,
    historicoTiempos,
    historicoEsperaDocs,
    protocoloCumplimiento,
    protocoloTiempos,
    protocoloCasosPorAjustador,
    protocoloCumplimientoAjustador,
    cumplimientoGeneral: cumplimientoProtocolo.general?.porcentaje ?? null,
    porcentajeCierreTotal: consolidadoHistorico?.porcentajeCierreTotal ?? null,
    porcentajeCierreExitoso: consolidadoHistorico?.porcentajeCierreExitoso ?? null,
  };
}

function etiquetaPeriodo(desde, hasta) {
  const fmt = (v) => {
    if (!v) return null;
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO');
  };
  const d = fmt(desde) || desde;
  const h = fmt(hasta);
  return h ? `${d} – ${h}` : `desde ${d}`;
}

function filaResumenHistorico(indicadores, consolidado, prefijo = '') {
  const fila = {
    Sección: `${prefijo}Resumen histórico`.trim(),
    'Total casos': consolidado?.total ?? indicadores.totalCasos,
    'Cierre exitoso (facturado)': consolidado?.cierreExitoso ?? indicadores.cerradosPeriodo ?? 0,
    '% cierre exitoso':
      consolidado?.porcentajeCierreExitoso != null
        ? `${consolidado.porcentajeCierreExitoso}%`
        : '—',
    'Otros cerrados (desistido/anulado)': consolidado?.otrosCerrados ?? 0,
    'Total cerrados': consolidado?.totalCerrados ?? 0,
    '% cierre total':
      consolidado?.porcentajeCierreTotal != null ? `${consolidado.porcentajeCierreTotal}%` : '—',
    'En gestión': consolidado?.enGestion ?? 0,
    '% en gestión':
      consolidado?.porcentajeEnGestion != null ? `${consolidado.porcentajeEnGestion}%` : '—',
  };
  INDICADORES_HISTORICO_EXPORT.forEach((ind) => {
    fila[`Prom. ${ind.titulo}`] = formatearTiempoPromedio(indicadores[ind.clave]);
    fila[`Muestras ${ind.titulo}`] = indicadores.muestras?.[ind.muestra] ?? 0;
  });
  return fila;
}

function filaResumenProtocolo(indicadores, cumplimiento, prefijo = '') {
  const fila = {
    Sección: `${prefijo}Resumen protocolo`.trim(),
    'Total casos': indicadores.totalCasos,
    'Docs. pendientes > 30 días': indicadores.pendientesDocs30Dias,
    'Cumplimiento general': formatearPorcentajeCumplimiento(cumplimiento.general?.porcentaje),
    'Etapas en plazo (general)': `${cumplimiento.general?.cumplidos ?? 0}/${cumplimiento.general?.evaluables ?? 0}`,
  };
  ETAPAS_PROTOCOLO_EXPORT.forEach((ind) => {
    fila[`Prom. ${ind.label}`] = formatearTiempoPromedio(indicadores[ind.clave]);
    fila[`Muestras ${ind.label}`] = indicadores.muestras?.[ind.muestra] ?? 0;
    const pct = cumplimiento[ind.muestra];
    fila[`% cumpl. ${ind.label}`] = formatearPorcentajeCumplimiento(pct?.porcentaje);
    fila[`En plazo ${ind.label}`] = pct ? `${pct.cumplidos}/${pct.evaluables}` : '—';
  });
  return fila;
}

export function construirInformeIndicadoresComplex({
  siniestros = [],
  complex = [],
  responsables = [],
  estados = [],
  protocolo = null,
  fechaDesdeHistorico = '2025-01-01',
  fechaHastaHistorico = '',
  fechaDesdeProtocolo = PROTOCOLO_FECHA_ACTIVACION,
  fechaHastaProtocolo = '',
  obtenerNombreResponsable,
}) {
  const casos = combinarCasosComplex(siniestros, complex);
  const periodoHistorico = { fechaDesde: fechaDesdeHistorico, fechaHasta: fechaHastaHistorico };
  const periodoProtocolo = { fechaDesde: fechaDesdeProtocolo, fechaHasta: fechaHastaProtocolo };

  const casosHistoricos = filtrarCasosPorPeriodo(casos, fechaDesdeHistorico, fechaHastaHistorico);
  const casosProtocolo = filtrarCasosProtocolo(casos, fechaDesdeProtocolo, fechaHastaProtocolo);

  const consolidadoHistorico = calcularConsolidadoEstados(casosHistoricos, estados);
  const indicadoresHistoricos = {
    ...calcularIndicadoresGlobales(casosHistoricos),
    // Alinear "cerrados" del KPI con FACTURADO real del consolidado
    cerradosPeriodo: consolidadoHistorico.cierreExitoso,
  };
  const porResponsableHistorico = calcularIndicadoresPorResponsable(
    casosHistoricos,
    obtenerNombreResponsable,
    { catalogoResponsables: responsables }
  );

  const indicadoresProtocolo = calcularIndicadoresProtocoloGlobales(casosProtocolo, periodoProtocolo);
  const cumplimientoProtocolo = calcularCumplimientoProtocoloGlobales(casosProtocolo, protocolo);

  const resolverAjustador = (caso, catalogo) =>
    resolverGrupoAjustador(caso, catalogo, obtenerNombreResponsable);

  const porAjustadorProtocolo = agruparIndicadoresProtocolo(casosProtocolo, resolverAjustador, {
    periodo: periodoProtocolo,
    catalogoResponsables: responsables,
  });

  const cumplimientoPorAjustador = agruparCumplimientoProtocolo(
    casosProtocolo,
    resolverAjustador,
    protocolo,
    { catalogoResponsables: responsables }
  );

  const cumplimientoMapa = Object.fromEntries(
    cumplimientoPorAjustador.map((f) => [f.clave, f])
  );

  const meta = {
    titulo: 'Informe de indicadores COMPLEX — Arnald DataFlow',
    generado: new Date().toLocaleString('es-CO'),
    protocolo: PROTOCOLO_DOCUMENTO,
    periodoHistorico: etiquetaPeriodo(fechaDesdeHistorico, fechaHastaHistorico),
    periodoProtocolo: etiquetaPeriodo(fechaDesdeProtocolo, fechaHastaProtocolo),
    totalCasosHistorico: casosHistoricos.length,
    totalCasosProtocolo: casosProtocolo.length,
  };

  const portada = [
    { Campo: 'Informe', Valor: meta.titulo },
    { Campo: 'Fecha de generación', Valor: meta.generado },
    { Campo: 'Protocolo de referencia', Valor: meta.protocolo },
    { Campo: 'Periodo indicadores históricos', Valor: meta.periodoHistorico },
    { Campo: 'Casos en periodo histórico', Valor: meta.totalCasosHistorico },
    { Campo: 'Periodo nuevo protocolo', Valor: meta.periodoProtocolo },
    { Campo: 'Casos nuevo protocolo', Valor: meta.totalCasosProtocolo },
    {
      Campo: 'Notas',
      Valor:
        'Tiempos en días u horas aproximadas. Cumplimiento medido vs plazos del protocolo. Secuencia hito a hito (solo el primer contacto parte de la asignación).',
    },
  ];

  const historicoResumen = [filaResumenHistorico(indicadoresHistoricos, consolidadoHistorico)];

  const consolidadoCategorias = consolidadoHistorico.resumenCategorias.map((f) => ({
    Categoría: f.categoria,
    Casos: f.cantidad,
    '%': f.porcentaje != null ? `${f.porcentaje}%` : '—',
    Criterio: f.detalle,
  }));

  const consolidadoCasosCerrados = (consolidadoHistorico.cerradosDetalle || []).map((f) => ({
    Estado: f.estado,
    Casos: f.cantidad,
    '% del total':
      consolidadoHistorico.total > 0
        ? `${Math.round((f.cantidad / consolidadoHistorico.total) * 1000) / 10}%`
        : '—',
    Tipo:
      f.categoria === 'cierreExitoso'
        ? 'Cerrado — éxito (facturado / pagado)'
        : 'Cerrado — desistido/anulado (finalizado)',
  }));

  const consolidadoEnGestion = (consolidadoHistorico.enGestionDetalle || []).map((f) => ({
    Estado: f.estado,
    Casos: f.cantidad,
    '% del total':
      consolidadoHistorico.total > 0
        ? `${Math.round((f.cantidad / consolidadoHistorico.total) * 1000) / 10}%`
        : '—',
    Tipo: 'En gestión',
  }));

  const consolidadoPorEstado = (consolidadoHistorico.consolidadoCompleto || []).map((f) => ({
    Estado: f.estado,
    Casos: f.cantidad,
    '%': f.porcentaje != null ? `${f.porcentaje}%` : '—',
    Clasificación: f.etiquetaCategoria,
  }));

  const historicoPorResponsable = porResponsableHistorico.map((fila) => {
    const out = {
      Responsable: fila.nombre,
      Casos: fila.totalCasos,
      'Cerrados (facturado)': fila.cerradosPeriodo ?? 0,
      'En espera documentos': fila.casosEsperaDocumentos,
    };
    INDICADORES_HISTORICO_EXPORT.forEach((ind) => {
      out[`Prom. ${ind.titulo}`] = formatearTiempoPromedio(fila[ind.clave]);
      out[`Muestras ${ind.titulo}`] = fila.muestras?.[ind.muestra] ?? 0;
    });
    return out;
  });

  const protocoloResumen = [filaResumenProtocolo(indicadoresProtocolo, cumplimientoProtocolo)];

  const protocoloPorAjustador = porAjustadorProtocolo.map((fila) => {
    const cumpl = cumplimientoMapa[fila.clave] || cumplimientoMapa[fila.nombre];
    const out = {
      Ajustador: fila.nombre,
      Casos: fila.totalCasos,
      'Cumplimiento general': formatearPorcentajeCumplimiento(cumpl?.general?.porcentaje),
      'Docs. > 30 días': fila.pendientesDocs30Dias,
    };
    ETAPAS_PROTOCOLO_EXPORT.forEach((ind) => {
      out[`Prom. ${ind.label}`] = formatearTiempoPromedio(fila[ind.clave]);
      out[`% ${ind.label}`] = formatearPorcentajeCumplimiento(cumpl?.[ind.muestra]?.porcentaje);
    });
    return out;
  });

  return {
    meta: {
      ...meta,
      consolidadoHistorico: {
        total: consolidadoHistorico.total,
        cierreExitoso: consolidadoHistorico.cierreExitoso,
        otrosCerrados: consolidadoHistorico.otrosCerrados,
        enGestion: consolidadoHistorico.enGestion,
        totalCerrados: consolidadoHistorico.totalCerrados,
        porcentajeCierreExitoso: consolidadoHistorico.porcentajeCierreExitoso,
        porcentajeOtrosCerrados: consolidadoHistorico.porcentajeOtrosCerrados,
        porcentajeCierreTotal: consolidadoHistorico.porcentajeCierreTotal,
        porcentajeEnGestion: consolidadoHistorico.porcentajeEnGestion,
      },
    },
    portada,
    historicoResumen,
    consolidadoCategorias,
    consolidadoCasosCerrados,
    consolidadoEnGestion,
    consolidadoPorEstado,
    consolidadoHistorico,
    historicoPorResponsable,
    protocoloResumen,
    protocoloPorAjustador,
    graficos: construirGraficosInforme({
      indicadoresHistoricos,
      porResponsableHistorico,
      indicadoresProtocolo,
      cumplimientoProtocolo,
      porAjustadorProtocolo,
      cumplimientoMapa,
      consolidadoHistorico,
    }),
  };
}
