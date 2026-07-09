import { calcularAnaliticaMatriz } from './matrizAnaliticaService';

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function kpiCard(titulo, valor, subtitulo = '') {
  return `
    <div class="re-html-kpi">
      <p class="re-html-kpi-titulo">${escapar(titulo)}</p>
      <p class="re-html-kpi-valor">${escapar(valor)}</p>
      ${subtitulo ? `<p class="re-html-kpi-sub">${escapar(subtitulo)}</p>` : ''}
    </div>`;
}

/**
 * Genera HTML estático de la lectura ejecutiva para exportación .html / impresión PDF.
 */
export function generarSeccionesEjecutivasHtml(datosMatriz = {}) {
  const analitica = calcularAnaliticaMatriz(datosMatriz);
  const { kpis, top10, hallazgos, resumenEjecutivo, comparativoPorProceso, recomendaciones, madurez } =
    analitica;

  const filasTop10 = top10
    .map(
      (r) => `
      <tr>
        <td>${r.ranking}</td>
        <td>${escapar(r.nombre)}</td>
        <td>${escapar(r.proceso)}</td>
        <td>${escapar(r.categoriaPrincipal)}</td>
        <td>${r.scoreInherente}</td>
        <td>${r.scoreResidual}</td>
        <td>${r.reduccionPorcentaje}%</td>
      </tr>`
    )
    .join('');

  const filasComparativo = comparativoPorProceso
    .slice(0, 10)
    .map(
      (item) => `
      <tr>
        <td>${escapar(item.proceso)}</td>
        <td>${item.inherentePromedio}</td>
        <td>${item.residualPromedio}</td>
        <td>${item.reduccion}%</td>
      </tr>`
    )
    .join('');

  const hallazgosHtml = hallazgos.lista
    .map((h) => `<li>${escapar(h.texto)}</li>`)
    .join('');

  const conclusionesHtml = resumenEjecutivo.conclusiones
    .map((c) => `<li><strong>${escapar(c.titulo)}.</strong> ${escapar(c.texto)}</li>`)
    .join('');

  const pasosHtml = resumenEjecutivo.proximosPasos
    .map((p) => `<li>${escapar(p)}</li>`)
    .join('');

  const recPrioridad = ['alta', 'media', 'baja']
    .map((prioridad) => {
      const filas = recomendaciones.porPrioridad[prioridad];
      if (!filas.length) return '';
      const filasHtml = filas
        .map(
          (rec, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapar(rec.recomendacion)}</td>
          <td>${escapar(rec.riesgoAsociado)}</td>
          <td>${escapar(rec.proceso || '—')}</td>
          <td>${escapar(rec.estado)}</td>
          <td>${rec.avance}%</td>
        </tr>`
        )
        .join('');
      return `
        <h4>Prioridad ${prioridad}</h4>
        <table class="re-html-tabla">
          <thead>
            <tr><th>#</th><th>Recomendación</th><th>Riesgo</th><th>Proceso</th><th>Estado</th><th>Avance</th></tr>
          </thead>
          <tbody>${filasHtml}</tbody>
        </table>`;
    })
    .join('');

  return `
    <style>
      .re-html-ejecutivo { font-family: Inter, Arial, sans-serif; color: #111827; }
      .re-html-ejecutivo h2 { margin: 0 0 0.35rem; font-size: 1.5rem; }
      .re-html-ejecutivo h3 { margin: 1rem 0 0.5rem; font-size: 1rem; }
      .re-html-ejecutivo p.desc { color: #6b7280; margin: 0 0 1rem; }
      .re-html-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; margin-bottom: 1rem; }
      .re-html-kpi { background: #fff; border: 1px solid #f3f4f6; border-radius: 0.5rem; padding: 0.75rem; }
      .re-html-kpi-titulo { margin: 0; font-size: 0.7rem; text-transform: uppercase; color: #6b7280; }
      .re-html-kpi-valor { margin: 0.2rem 0 0; font-size: 1.35rem; font-weight: 800; }
      .re-html-kpi-sub { margin: 0.15rem 0 0; font-size: 0.72rem; color: #9ca3af; }
      .re-html-tabla { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 1rem; }
      .re-html-tabla th, .re-html-tabla td { border-bottom: 1px solid #f3f4f6; padding: 0.55rem 0.65rem; text-align: left; }
      .re-html-tabla th { background: #fafafa; font-size: 0.72rem; text-transform: uppercase; color: #6b7280; }
      .re-html-bloque { background: #fff; border: 1px solid #f3f4f6; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1rem; }
      .re-html-lista { margin: 0; padding-left: 1.1rem; line-height: 1.45; }
      .re-html-conclusion { background: #fff7f7; border: 1px solid #fecaca; border-radius: 0.75rem; padding: 1rem; }
    </style>

    <div class="re-html-ejecutivo">
      <section id="seccion-dashboard" class="re-html-bloque section">
        <h2>Dashboard ejecutivo</h2>
        <p class="desc">Panorama gerencial de la matriz de riesgos.</p>
        <div class="re-html-kpis">
          ${kpiCard('Nivel general', kpis.nivelGeneral)}
          ${kpiCard('Riesgos', kpis.totalRiesgos)}
          ${kpiCard('Críticos', kpis.criticos)}
          ${kpiCard('Residual prom.', kpis.riesgoResidualPromedio)}
          ${kpiCard('Reducción', `${kpis.reduccionPromedio}%`)}
          ${kpiCard('Rec. abiertas', kpis.recomendacionesAbiertas)}
        </div>
      </section>

      <section id="seccion-top10" class="re-html-bloque section">
        <h2>Top 10 riesgos prioritarios</h2>
        <table class="re-html-tabla">
          <thead>
            <tr><th>#</th><th>Riesgo</th><th>Proceso</th><th>Categoría</th><th>Inh.</th><th>Res.</th><th>Reduc.</th></tr>
          </thead>
          <tbody>${filasTop10 || '<tr><td colspan="7">Sin datos</td></tr>'}</tbody>
        </table>
      </section>

      <section id="seccion-hallazgos" class="re-html-bloque section">
        <h2>Hallazgos clave automáticos</h2>
        <ul class="re-html-lista">${hallazgosHtml}</ul>
      </section>

      <section id="seccion-comparativo" class="re-html-bloque section">
        <h2>Comparativo inherente vs residual</h2>
        <table class="re-html-tabla">
          <thead>
            <tr><th>Proceso</th><th>Inherente prom.</th><th>Residual prom.</th><th>Reducción</th></tr>
          </thead>
          <tbody>${filasComparativo || '<tr><td colspan="4">Sin datos</td></tr>'}</tbody>
        </table>
      </section>

      <section id="seccion-recomendaciones-priorizadas" class="re-html-bloque section">
        <h2>Recomendaciones priorizadas</h2>
        ${recPrioridad || '<p>Sin recomendaciones registradas.</p>'}
      </section>

      <section id="seccion-resumen-ejecutivo" class="re-html-bloque section">
        <h2>Resumen ejecutivo para gerencia</h2>
        <ol class="re-html-lista">${conclusionesHtml}</ol>
        <h3>Próximos pasos</h3>
        <ul class="re-html-lista">${pasosHtml}</ul>
        <div class="re-html-conclusion">
          <strong>Conclusión general:</strong> ${escapar(hallazgos.conclusion)}
        </div>
      </section>

      <section id="seccion-madurez" class="re-html-bloque section">
        <h2>Indicador de madurez en gestión de riesgos</h2>
        <p><strong>Nivel ${madurez.nivelActual} — ${escapar(madurez.nivelDetalle.nombre)}</strong></p>
        <p>${escapar(madurez.resumen)}</p>
        <p>Puntaje promedio: ${madurez.promedioMadurez} / 5</p>
        <ul class="re-html-lista">
          ${madurez.factores
            .map((f) => `<li>${escapar(f.etiqueta)}: ${f.puntaje} / 5</li>`)
            .join('')}
        </ul>
      </section>
    </div>`;
}

export const SECCIONES_EJECUTIVAS_HTML = [
  { id: 'seccion-dashboard', titulo: 'Dashboard ejecutivo', num: 'E1' },
  { id: 'seccion-top10', titulo: 'Top 10 prioritarios', num: 'E2' },
  { id: 'seccion-hallazgos', titulo: 'Hallazgos automáticos', num: 'E3' },
  { id: 'seccion-comparativo', titulo: 'Comparativo inh. vs res.', num: 'E4' },
  { id: 'seccion-recomendaciones-priorizadas', titulo: 'Recomendaciones', num: 'E5' },
  { id: 'seccion-resumen-ejecutivo', titulo: 'Resumen ejecutivo', num: 'E6' },
  { id: 'seccion-madurez', titulo: 'Indicador de madurez', num: 'E7' },
];

export function generarNavEjecutivoHtml() {
  const enlaces = SECCIONES_EJECUTIVAS_HTML.map(
    (s) => `
      <a class="reporte-nav-link" href="#${s.id}">
        <span class="reporte-nav-num">${s.num}</span>
        <span class="reporte-nav-texto">${escapar(s.titulo)}</span>
      </a>`
  ).join('');

  return `
    <div class="reporte-nav-grupo">
      <p class="reporte-nav-sub">Lectura ejecutiva</p>
      ${enlaces}
    </div>`;
}
