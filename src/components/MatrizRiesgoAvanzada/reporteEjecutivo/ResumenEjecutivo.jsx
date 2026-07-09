import React from 'react';
import { FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import './reporteEjecutivo.css';

const COLORES_NIVEL = {
  Crítico: '#dc3545',
  Alto: '#fd7e14',
  Medio: '#ffc107',
  Bajo: '#28a745',
};

export default function ResumenEjecutivo({ analitica }) {
  const { kpis, resumenEjecutivo, porNivel, porProceso, semaforoCategorias, hallazgos } = analitica;

  const datosNivel = porNivel
    .filter((item) => item.total > 0)
    .map((item) => ({
      name: item.nombre,
      value: item.total,
      color: COLORES_NIVEL[item.nombre],
    }));

  const topProcesos = porProceso.slice(0, 5);
  const maxProceso = topProcesos[0]?.total || 1;

  return (
    <div className="re-resumen">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Resumen ejecutivo para gerencia</h2>
          <p className="re-seccion-desc">
            Conclusiones principales en lenguaje gerencial, listas para junta directiva.
          </p>
        </div>
        <div className="re-nivel-general">
          <FaShieldAlt />
          <div>
            <span>Nivel general</span>
            <strong style={{ color: kpis.nivelGeneralDetalle.color }}>{kpis.nivelGeneral}</strong>
          </div>
        </div>
      </header>

      <div className="re-kpi-grid re-kpi-grid--resumen">
        <div className="re-kpi-mini">
          <span>Nivel general</span>
          <strong>{kpis.nivelGeneral}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Riesgos</span>
          <strong>{kpis.totalRiesgos}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Críticos</span>
          <strong>{kpis.criticos}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Residual prom.</span>
          <strong>{kpis.riesgoResidualPromedio}</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Reducción</span>
          <strong>{kpis.reduccionPromedio}%</strong>
        </div>
        <div className="re-kpi-mini">
          <span>Rec. abiertas</span>
          <strong>{kpis.recomendacionesAbiertas}</strong>
        </div>
      </div>

      <div className="re-resumen-layout">
        <section className="re-widget-card">
          <h3>Conclusiones principales</h3>
          <ol className="re-conclusiones-lista">
            {resumenEjecutivo.conclusiones.map((item) => (
              <li key={item.titulo}>
                <strong>{item.titulo}.</strong> {item.texto}
              </li>
            ))}
          </ol>
        </section>

        <section className="re-widget-card">
          <h3>Riesgos por nivel (residual)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={datosNivel} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                {datosNivel.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="re-widget-card">
          <h3>Top 5 procesos por exposición</h3>
          <div className="re-barras">
            {topProcesos.map((proceso) => (
              <div key={proceso.nombre} className="re-barra-item">
                <div className="re-barra-label">
                  <span>{proceso.nombre}</span>
                  <strong>{proceso.total}</strong>
                </div>
                <div className="re-barra-track">
                  <div
                    className="re-barra-fill"
                    style={{ width: `${(proceso.total / maxProceso) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="re-widget-card">
          <h3>Semáforo por frente de riesgo</h3>
          <div className="re-semaforo-lista">
            {semaforoCategorias.map((item) => (
              <div key={item.nombre} className="re-semaforo-item">
                <span
                  className="re-semaforo-punto"
                  style={{ backgroundColor: COLORES_NIVEL[item.nivel] || '#6b7280' }}
                />
                <div>
                  <strong>{item.nombre}</strong>
                  <span>{item.nivel}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="re-widget-card re-widget-card--wide">
          <h3>Próximos pasos recomendados</h3>
          <ul className="re-pasos-lista">
            {resumenEjecutivo.proximosPasos.map((paso) => (
              <li key={paso}>
                <FaCheckCircle />
                <span>{paso}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="re-conclusion-box">
        <h3>Conclusión general del análisis</h3>
        <p>{hallazgos.conclusion}</p>
      </section>
    </div>
  );
}
