import { calcularAnaliticaMatriz } from './matrizAnaliticaService';

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const COLORES_NIVEL = {
  Crítico: '#dc3545',
  Alto: '#fd7e14',
  Medio: '#ffc107',
  Bajo: '#28a745',
};

const COLORES_CATEGORIA = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

function kpiCard(titulo, valor, subtitulo = '', colorValor = '') {
  const estiloValor = colorValor ? ` style="color:${colorValor}"` : '';
  return `
    <div class="re-html-kpi">
      <p class="re-html-kpi-titulo">${escapar(titulo)}</p>
      <p class="re-html-kpi-valor"${estiloValor}>${escapar(valor)}</p>
      ${subtitulo ? `<p class="re-html-kpi-sub">${escapar(subtitulo)}</p>` : ''}
    </div>`;
}

function polarACartesiano(cx, cy, r, anguloGrados) {
  const rad = ((anguloGrados - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/** Donut SVG autónomo (sin dependencias). */
function donutSvg(datos, { tamaño = 180, radioInterno = 48, radioExterno = 74, textoCentro = '' } = {}) {
  const items = (datos || []).filter((d) => Number(d.value) > 0);
  const total = items.reduce((acc, d) => acc + Number(d.value), 0);
  const cx = tamaño / 2;
  const cy = tamaño / 2;

  if (!total) {
    return `
      <svg width="${tamaño}" height="${tamaño}" viewBox="0 0 ${tamaño} ${tamaño}" role="img">
        <circle cx="${cx}" cy="${cy}" r="${radioExterno}" fill="#f3f4f6" />
        <circle cx="${cx}" cy="${cy}" r="${radioInterno}" fill="#fff" />
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="12">Sin datos</text>
      </svg>`;
  }

  let paths = '';
  if (items.length === 1) {
    const color = items[0].color || '#6b7280';
    paths = `
      <circle cx="${cx}" cy="${cy}" r="${radioExterno}" fill="${color}" />
      <circle cx="${cx}" cy="${cy}" r="${radioInterno}" fill="#fff" />`;
  } else {
    let angulo = 0;
    paths = items
      .map((item) => {
        const valor = Number(item.value);
        const sweep = Math.min((valor / total) * 360, 359.99);
        const start = polarACartesiano(cx, cy, radioExterno, angulo);
        const end = polarACartesiano(cx, cy, radioExterno, angulo + sweep);
        const startIn = polarACartesiano(cx, cy, radioInterno, angulo + sweep);
        const endIn = polarACartesiano(cx, cy, radioInterno, angulo);
        const large = sweep > 180 ? 1 : 0;
        const d = [
          `M ${start.x} ${start.y}`,
          `A ${radioExterno} ${radioExterno} 0 ${large} 1 ${end.x} ${end.y}`,
          `L ${startIn.x} ${startIn.y}`,
          `A ${radioInterno} ${radioInterno} 0 ${large} 0 ${endIn.x} ${endIn.y}`,
          'Z',
        ].join(' ');
        angulo += (valor / total) * 360;
        return `<path d="${d}" fill="${item.color || '#6b7280'}" stroke="#fff" stroke-width="2" />`;
      })
      .join('');
  }

  const leyenda = items
    .map(
      (item) => `
      <div class="re-html-leyenda-item">
        <span style="background:${item.color || '#6b7280'}"></span>
        ${escapar(item.name)}: ${item.value}
      </div>`
    )
    .join('');

  return `
    <div class="re-html-donut">
      <div class="re-html-donut-svg">
        <svg width="${tamaño}" height="${tamaño}" viewBox="0 0 ${tamaño} ${tamaño}" role="img">
          ${paths}
          ${
            textoCentro
              ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#111827" font-size="11" font-weight="700">${escapar(textoCentro)}</text>`
              : ''
          }
        </svg>
      </div>
      <div class="re-html-leyenda">${leyenda}</div>
    </div>`;
}

function barrasHtml(items, { maxKey = 'total', labelKey = 'nombre', valorFmt } = {}) {
  const lista = items || [];
  if (!lista.length) return '<p class="re-html-vacio">Sin datos para mostrar.</p>';
  const max = Math.max(...lista.map((i) => Number(i[maxKey]) || 0), 1);
  return `
    <div class="re-html-barras">
      ${lista
        .map((item) => {
          const valor = Number(item[maxKey]) || 0;
          const pct = Math.round((valor / max) * 100);
          const etiqueta = valorFmt ? valorFmt(item) : String(valor);
          return `
            <div class="re-html-barra-item">
              <div class="re-html-barra-label">
                <span>${escapar(item[labelKey])}</span>
                <strong>${escapar(etiqueta)}</strong>
              </div>
              <div class="re-html-barra-track">
                <div class="re-html-barra-fill" style="width:${pct}%"></div>
              </div>
            </div>`;
        })
        .join('')}
    </div>`;
}

function barrasComparativoSvg(items) {
  const datos = (items || []).slice(0, 8);
  if (!datos.length) return '<p class="re-html-vacio">Sin datos para mostrar.</p>';

  const ancho = 640;
  const altoBarra = 28;
  const gap = 18;
  const margenIzq = 120;
  const margenDer = 24;
  const margenTop = 28;
  const altura = margenTop + datos.length * (altoBarra + gap) + 20;
  const maxVal = Math.max(...datos.flatMap((d) => [d.inherentePromedio, d.residualPromedio]), 1);
  const anchoUtil = ancho - margenIzq - margenDer;

  const filas = datos
    .map((item, index) => {
      const y = margenTop + index * (altoBarra + gap);
      const wInh = Math.max(2, (item.inherentePromedio / maxVal) * anchoUtil);
      const wRes = Math.max(2, (item.residualPromedio / maxVal) * anchoUtil);
      const label =
        item.proceso.length > 16 ? `${item.proceso.slice(0, 16)}…` : item.proceso;
      return `
        <text x="0" y="${y + 18}" font-size="11" fill="#374151">${escapar(label)}</text>
        <rect x="${margenIzq}" y="${y}" width="${wInh}" height="12" rx="3" fill="#dc2626" />
        <rect x="${margenIzq}" y="${y + 14}" width="${wRes}" height="12" rx="3" fill="#111827" />
        <text x="${margenIzq + wInh + 4}" y="${y + 10}" font-size="10" fill="#dc2626">${item.inherentePromedio}</text>
        <text x="${margenIzq + wRes + 4}" y="${y + 24}" font-size="10" fill="#111827">${item.residualPromedio}</text>`;
    })
    .join('');

  return `
    <div class="re-html-chart-wrap">
      <svg width="100%" viewBox="0 0 ${ancho} ${altura}" role="img" aria-label="Comparativo inherente vs residual">
        <text x="${margenIzq}" y="14" font-size="11" fill="#dc2626">■ Inherente</text>
        <text x="${margenIzq + 90}" y="14" font-size="11" fill="#111827">■ Residual</text>
        ${filas}
      </svg>
    </div>`;
}

function semaforoListaHtml(titulo, items = []) {
  if (!items.length) {
    return `
      <div class="re-html-widget">
        <h3>${escapar(titulo)}</h3>
        <p class="re-html-vacio">Sin datos para mostrar.</p>
      </div>`;
  }
  return `
    <div class="re-html-widget">
      <h3>${escapar(titulo)}</h3>
      <div class="re-html-semaforo-lista">
        ${items
          .map(
            (item) => `
          <div class="re-html-semaforo-item">
            <span class="re-html-semaforo-punto" style="background:${COLORES_NIVEL[item.nivel] || '#6b7280'}"></span>
            <div>
              <strong>${escapar(item.nombre)}</strong>
              <span>${escapar(item.nivel)} · ${item.totalRiesgos} riesgo(s)</span>
            </div>
          </div>`
          )
          .join('')}
      </div>
    </div>`;
}

function estilosEjecutivos() {
  return `
    <style>
      .re-html-ejecutivo { font-family: Inter, Arial, sans-serif; color: #111827; }
      .re-html-ejecutivo h2 { margin: 0 0 0.35rem; font-size: 1.5rem; }
      .re-html-ejecutivo h3 { margin: 0 0 0.75rem; font-size: 1rem; }
      .re-html-ejecutivo h4 { margin: 1rem 0 0.5rem; font-size: 0.9rem; }
      .re-html-ejecutivo p.desc { color: #6b7280; margin: 0 0 1rem; }
      .re-html-kicker { margin: 0; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }
      .re-html-header-flex { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
      .re-html-nivel-badge {
        display: inline-flex; align-items: center; gap: 0.5rem;
        background: #fffbeb; border: 1px solid #fcd34d; border-radius: 999px;
        padding: 0.45rem 0.85rem; font-size: 0.8rem; white-space: nowrap;
      }
      .re-html-nivel-badge strong { font-size: 0.95rem; }
      .re-html-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.65rem; margin-bottom: 1rem; }
      .re-html-kpi { background: #fff; border: 1px solid #f3f4f6; border-radius: 0.65rem; padding: 0.85rem; }
      .re-html-kpi-titulo { margin: 0; font-size: 0.68rem; text-transform: uppercase; color: #6b7280; letter-spacing: 0.03em; }
      .re-html-kpi-valor { margin: 0.25rem 0 0; font-size: 1.4rem; font-weight: 800; color: #111827; }
      .re-html-kpi-sub { margin: 0.15rem 0 0; font-size: 0.72rem; color: #9ca3af; }
      .re-html-tabla { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 1rem; }
      .re-html-tabla th, .re-html-tabla td { border-bottom: 1px solid #f3f4f6; padding: 0.55rem 0.65rem; text-align: left; }
      .re-html-tabla th { background: #fafafa; font-size: 0.72rem; text-transform: uppercase; color: #6b7280; }
      .re-html-bloque { background: #fff; border: 1px solid #f3f4f6; border-radius: 0.75rem; padding: 1.1rem; margin-bottom: 1rem; }
      .re-html-lista { margin: 0; padding-left: 1.1rem; line-height: 1.45; }
      .re-html-conclusion { background: #fff7f7; border: 1px solid #fecaca; border-radius: 0.75rem; padding: 1rem; margin-top: 0.75rem; }
      .re-html-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.85rem; }
      .re-html-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem; }
      .re-html-widget { background: #fafafa; border: 1px solid #f3f4f6; border-radius: 0.65rem; padding: 0.9rem; }
      .re-html-donut { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
      .re-html-donut-svg { line-height: 0; }
      .re-html-leyenda { display: flex; flex-wrap: wrap; gap: 0.4rem 0.75rem; justify-content: center; font-size: 0.75rem; color: #4b5563; }
      .re-html-leyenda-item { display: inline-flex; align-items: center; gap: 0.35rem; }
      .re-html-leyenda-item span { width: 0.65rem; height: 0.65rem; border-radius: 999px; display: inline-block; }
      .re-html-barras { display: flex; flex-direction: column; gap: 0.55rem; }
      .re-html-barra-label { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.78rem; margin-bottom: 0.2rem; }
      .re-html-barra-track { height: 0.55rem; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
      .re-html-barra-fill { height: 100%; background: #C53030; border-radius: 999px; }
      .re-html-barra-fill--oscuro { background: #111827; }
      .re-html-semaforo-lista { display: flex; flex-direction: column; gap: 0.55rem; }
      .re-html-semaforo-item { display: flex; gap: 0.65rem; align-items: flex-start; font-size: 0.82rem; }
      .re-html-semaforo-item span:last-child, .re-html-semaforo-item div span { display: block; color: #6b7280; font-size: 0.75rem; }
      .re-html-semaforo-punto { width: 0.75rem; height: 0.75rem; border-radius: 999px; margin-top: 0.25rem; flex-shrink: 0; }
      .re-html-hallazgo-destacado { margin: 0; line-height: 1.45; color: #374151; font-size: 0.9rem; }
      .re-html-hallazgos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; }
      .re-html-hallazgo-card { background: #fafafa; border: 1px solid #f3f4f6; border-radius: 0.65rem; padding: 0.85rem; font-size: 0.85rem; line-height: 1.4; }
      .re-html-hallazgo-num { display: inline-flex; width: 1.4rem; height: 1.4rem; border-radius: 999px; background: #C53030; color: #fff; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.4rem; }
      .re-html-vacio { margin: 0; color: #9ca3af; font-size: 0.85rem; }
      .re-html-chart-wrap { width: 100%; overflow-x: auto; }
      .re-html-nota { margin: 0.5rem 0 0; font-size: 0.8rem; color: #6b7280; }
      @media print {
        .re-html-bloque { break-inside: avoid; }
      }
    </style>`;
}

/**
 * Genera HTML estático de la lectura ejecutiva (mismo contenido que VistaReporteMatriz).
 * Incluye dashboard completo, semáforo y gráficos SVG autónomos.
 */
export function generarSeccionesEjecutivasHtml(datosMatriz = {}) {
  const analitica = calcularAnaliticaMatriz(datosMatriz);
  const {
    kpis,
    top10,
    hallazgos,
    resumenEjecutivo,
    comparativoPorProceso,
    recomendaciones,
    madurez,
    porNivel,
    porProceso,
    porCategoria,
    semaforoCategorias,
    semaforoProcesos,
    estadoRecomendaciones,
    procesosCriticosAltos,
  } = analitica;

  const pctCriticos = kpis.totalRiesgos
    ? Math.round((kpis.criticos / kpis.totalRiesgos) * 100)
    : 0;
  const colorNivel = kpis.nivelGeneralDetalle?.color || COLORES_NIVEL[kpis.nivelGeneral] || '#ffc107';

  const datosNivel = porNivel
    .filter((item) => item.total > 0)
    .map((item) => ({
      name: item.nombre,
      value: item.total,
      color: COLORES_NIVEL[item.nombre],
    }));

  const datosCategoria = porCategoria.slice(0, 6).map((item, index) => ({
    name: item.nombre,
    value: item.total,
    color: COLORES_CATEGORIA[index % COLORES_CATEGORIA.length],
  }));

  const datosEstadoRec = estadoRecomendaciones.map((item) => ({
    name: item.nombre,
    value: item.total,
    color: item.color,
  }));

  const topProcesos = porProceso.slice(0, 8);
  const top5Procesos = porProceso.slice(0, 5);
  const topCriticos = procesosCriticosAltos.slice(0, 6);
  const hallazgoDestacado = hallazgos.lista[0];

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

  const hallazgosCards = hallazgos.lista
    .map(
      (h, index) => `
      <article class="re-html-hallazgo-card">
        <div class="re-html-hallazgo-num">${index + 1}</div>
        <p>${escapar(h.texto)}</p>
      </article>`
    )
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
          <td>${escapar(rec.estadoEtiqueta || rec.estado)}</td>
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
    ${estilosEjecutivos()}

    <div class="re-html-ejecutivo">
      <section id="seccion-dashboard" class="re-html-bloque section">
        <div class="re-html-header-flex">
          <div>
            <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
            <h2>Dashboard ejecutivo</h2>
            <p class="desc">Lectura gerencial del estado de riesgos, controles y plan de acción.</p>
          </div>
          <div class="re-html-nivel-badge">
            <span>Nivel general</span>
            <strong style="color:${colorNivel}">${escapar(kpis.nivelGeneral)}</strong>
          </div>
        </div>
        <div class="re-html-kpis">
          ${kpiCard('Riesgos identificados', kpis.totalRiesgos, 'Total evaluados')}
          ${kpiCard('Críticos', kpis.criticos, `${pctCriticos}% del total`, '#dc3545')}
          ${kpiCard('Altos', kpis.altos, '', '#fd7e14')}
          ${kpiCard('Medios', kpis.medios, '', '#ffc107')}
          ${kpiCard('Bajos', kpis.bajos, '', '#28a745')}
          ${kpiCard('Riesgo inherente prom.', kpis.riesgoInherentePromedio, 'Escala 1–25')}
          ${kpiCard('Riesgo residual prom.', kpis.riesgoResidualPromedio, 'Escala 1–25')}
          ${kpiCard('Reducción del riesgo', `${kpis.reduccionPromedio}%`, 'Efectividad de controles', '#16a34a')}
          ${kpiCard('Procesos evaluados', kpis.procesosEvaluados)}
          ${kpiCard('Controles documentados', kpis.controlesDocumentados)}
          ${kpiCard('Recomendaciones abiertas', kpis.recomendacionesAbiertas, '', '#dc3545')}
          ${kpiCard('Avance plan de acción', `${kpis.avancePlanAccion}%`)}
        </div>
        <div class="re-html-grid-3">
          <div class="re-html-widget">
            <h3>Riesgos por nivel (residual)</h3>
            ${donutSvg(datosNivel, {
              textoCentro: String(kpis.totalRiesgos),
            })}
          </div>
          <div class="re-html-widget">
            <h3>Top 5 procesos por exposición</h3>
            ${barrasHtml(top5Procesos, {
              valorFmt: (p) => `${p.total} (${p.porcentaje}%)`,
            })}
          </div>
          <div class="re-html-widget">
            <h3>Hallazgo destacado</h3>
            <p class="re-html-hallazgo-destacado">
              ${
                hallazgoDestacado
                  ? escapar(hallazgoDestacado.texto)
                  : 'Complete la valoración para generar hallazgos automáticos.'
              }
            </p>
          </div>
        </div>
      </section>

      <section id="seccion-top10" class="re-html-bloque section">
        <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
        <h2>Top 10 riesgos prioritarios</h2>
        <p class="desc">Riesgos con mayor exposición residual.</p>
        <table class="re-html-tabla">
          <thead>
            <tr><th>#</th><th>Riesgo</th><th>Proceso</th><th>Categoría</th><th>Inh.</th><th>Res.</th><th>Reduc.</th></tr>
          </thead>
          <tbody>${filasTop10 || '<tr><td colspan="7">Sin datos</td></tr>'}</tbody>
        </table>
      </section>

      <section id="seccion-semaforo" class="re-html-bloque section">
        <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
        <h2>Semáforo gerencial</h2>
        <p class="desc">Lectura rápida por frente de riesgo y por proceso evaluado.</p>
        <div class="re-html-grid-2">
          ${semaforoListaHtml('Por categoría / frente', semaforoCategorias)}
          ${semaforoListaHtml('Por proceso', semaforoProcesos)}
        </div>
      </section>

      <section id="seccion-hallazgos" class="re-html-bloque section">
        <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
        <h2>Hallazgos clave automáticos</h2>
        <p class="desc">Conclusiones generadas a partir de ${kpis.totalRiesgos} riesgos evaluados.</p>
        <div class="re-html-hallazgos-grid">${hallazgosCards}</div>
        <div class="re-html-conclusion">
          <strong>Conclusión general:</strong> ${escapar(hallazgos.conclusion)}
        </div>
      </section>

      <section id="seccion-comparativo" class="re-html-bloque section">
        <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
        <h2>Comparativo inherente vs residual</h2>
        <p class="desc">Efectividad de los controles: cuánto disminuye el riesgo después de su aplicación.</p>
        <div class="re-html-kpis">
          ${kpiCard('Inherente prom.', kpis.riesgoInherentePromedio)}
          ${kpiCard('Residual prom.', kpis.riesgoResidualPromedio)}
          ${kpiCard('Reducción prom.', `${kpis.reduccionPromedio}%`)}
          ${kpiCard(
            'Mayor reducción',
            resumenEjecutivo.mayorReduccion
              ? `${resumenEjecutivo.mayorReduccion.reduccion}%`
              : '—',
            resumenEjecutivo.mayorReduccion?.proceso || ''
          )}
        </div>
        ${barrasComparativoSvg(comparativoPorProceso)}
      </section>

      <section id="seccion-graficos" class="re-html-bloque section">
        <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
        <h2>Gráficos ejecutivos</h2>
        <p class="desc">Visualizaciones automáticas para presentación a gerencia y junta directiva.</p>
        <div class="re-html-grid-2" style="margin-bottom:0.85rem">
          <div class="re-html-widget">
            <h3>1. Riesgos por proceso</h3>
            ${barrasHtml(topProcesos, {
              valorFmt: (p) => `${p.total} (${p.porcentaje}%)`,
            })}
          </div>
          <div class="re-html-widget">
            <h3>2. Riesgos por categoría</h3>
            ${donutSvg(datosCategoria, {
              textoCentro: `Total: ${kpis.totalRiesgos}`,
            })}
          </div>
          <div class="re-html-widget">
            <h3>3. Riesgos por nivel (residual)</h3>
            ${donutSvg(datosNivel, {
              textoCentro: `Prom: ${kpis.riesgoResidualPromedio}`,
            })}
          </div>
          <div class="re-html-widget">
            <h3>4. Comparativo inherente vs residual (top)</h3>
            ${barrasComparativoSvg(comparativoPorProceso.slice(0, 5))}
            <p class="re-html-nota">
              Reducción promedio gracias a controles: <strong>${kpis.reduccionPromedio}%</strong>
            </p>
          </div>
          <div class="re-html-widget">
            <h3>5. Estado de recomendaciones</h3>
            ${donutSvg(datosEstadoRec)}
          </div>
          <div class="re-html-widget">
            <h3>6. Procesos con más riesgos críticos y altos</h3>
            ${barrasHtml(topCriticos, {
              valorFmt: (p) => String(p.total),
            })}
          </div>
        </div>
      </section>

      <section id="seccion-recomendaciones-priorizadas" class="re-html-bloque section">
        <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
        <h2>Recomendaciones priorizadas</h2>
        <p class="desc">Plan de acción por prioridad.</p>
        ${recPrioridad || '<p class="re-html-vacio">Sin recomendaciones registradas.</p>'}
      </section>

      <section id="seccion-resumen-ejecutivo" class="re-html-bloque section">
        <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
        <h2>Resumen ejecutivo para gerencia</h2>
        <ol class="re-html-lista">${conclusionesHtml}</ol>
        <h3>Próximos pasos</h3>
        <ul class="re-html-lista">${pasosHtml}</ul>
        <div class="re-html-conclusion">
          <strong>Conclusión general:</strong> ${escapar(hallazgos.conclusion)}
        </div>
      </section>

      <section id="seccion-madurez" class="re-html-bloque section">
        <p class="re-html-kicker">Matriz de Riesgos Avanzada</p>
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
  { id: 'seccion-semaforo', titulo: 'Semáforo gerencial', num: 'E3' },
  { id: 'seccion-hallazgos', titulo: 'Hallazgos automáticos', num: 'E4' },
  { id: 'seccion-comparativo', titulo: 'Comparativo inh. vs res.', num: 'E5' },
  { id: 'seccion-graficos', titulo: 'Gráficos ejecutivos', num: 'E6' },
  { id: 'seccion-recomendaciones-priorizadas', titulo: 'Recomendaciones', num: 'E7' },
  { id: 'seccion-resumen-ejecutivo', titulo: 'Resumen ejecutivo', num: 'E8' },
  { id: 'seccion-madurez', titulo: 'Indicador de madurez', num: 'E9' },
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
