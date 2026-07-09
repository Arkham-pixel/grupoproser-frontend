import React from 'react';
import {
  FaArrowDown,
  FaChartBar,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaShieldAlt,
  FaTasks,
} from 'react-icons/fa';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import './reporteEjecutivo.css';

const COLORES_NIVEL = {
  Crítico: '#dc3545',
  Alto: '#fd7e14',
  Medio: '#ffc107',
  Bajo: '#28a745',
};

function KpiCard({ titulo, valor, subtitulo, icono: Icono, color = '#C53030', onClick }) {
  const contenido = (
    <>
      <div className="re-kpi-icono" style={{ color }}>
        <Icono />
      </div>
      <div className="re-kpi-body">
        <p className="re-kpi-titulo">{titulo}</p>
        <p className="re-kpi-valor">{valor}</p>
        {subtitulo ? <p className="re-kpi-sub">{subtitulo}</p> : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="re-kpi-card re-kpi-card--clickable" onClick={onClick}>
        {contenido}
      </button>
    );
  }

  return <div className="re-kpi-card">{contenido}</div>;
}

export default function DashboardEjecutivo({ analitica, onNavegar }) {
  const { kpis, porNivel, porProceso, hallazgos } = analitica;

  const datosDonut = porNivel
    .filter((item) => item.total > 0)
    .map((item) => ({
      name: item.nombre,
      value: item.total,
      color: COLORES_NIVEL[item.nombre],
    }));

  const topProcesos = porProceso.slice(0, 5);
  const maxProceso = topProcesos[0]?.total || 1;
  const hallazgoDestacado = hallazgos.lista[0];

  return (
    <div className="re-dashboard">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Dashboard ejecutivo</h2>
          <p className="re-seccion-desc">
            Lectura gerencial del estado de riesgos, controles y plan de acción.
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

      <div className="re-kpi-grid">
        <KpiCard
          titulo="Riesgos identificados"
          valor={kpis.totalRiesgos}
          subtitulo="Total evaluados"
          icono={FaTasks}
          onClick={() => onNavegar?.('graficos')}
        />
        <KpiCard
          titulo="Críticos"
          valor={kpis.criticos}
          subtitulo={`${kpis.totalRiesgos ? Math.round((kpis.criticos / kpis.totalRiesgos) * 100) : 0}% del total`}
          icono={FaExclamationTriangle}
          color="#dc3545"
          onClick={() => onNavegar?.('top10')}
        />
        <KpiCard
          titulo="Altos"
          valor={kpis.altos}
          icono={FaExclamationTriangle}
          color="#fd7e14"
          onClick={() => onNavegar?.('top10')}
        />
        <KpiCard
          titulo="Medios"
          valor={kpis.medios}
          icono={FaChartBar}
          color="#ffc107"
        />
        <KpiCard
          titulo="Bajos"
          valor={kpis.bajos}
          icono={FaCheckCircle}
          color="#28a745"
        />
        <KpiCard
          titulo="Riesgo inherente prom."
          valor={kpis.riesgoInherentePromedio}
          subtitulo="Escala 1–25"
          icono={FaChartBar}
          onClick={() => onNavegar?.('comparativo')}
        />
        <KpiCard
          titulo="Riesgo residual prom."
          valor={kpis.riesgoResidualPromedio}
          subtitulo="Escala 1–25"
          icono={FaShieldAlt}
          onClick={() => onNavegar?.('comparativo')}
        />
        <KpiCard
          titulo="Reducción del riesgo"
          valor={`${kpis.reduccionPromedio}%`}
          subtitulo="Efectividad de controles"
          icono={FaArrowDown}
          color="#16a34a"
          onClick={() => onNavegar?.('comparativo')}
        />
        <KpiCard
          titulo="Procesos evaluados"
          valor={kpis.procesosEvaluados}
          icono={FaTasks}
          onClick={() => onNavegar?.('semaforo')}
        />
        <KpiCard
          titulo="Controles documentados"
          valor={kpis.controlesDocumentados}
          icono={FaShieldAlt}
        />
        <KpiCard
          titulo="Recomendaciones abiertas"
          valor={kpis.recomendacionesAbiertas}
          icono={FaClipboardList}
          color="#dc3545"
          onClick={() => onNavegar?.('recomendaciones')}
        />
        <KpiCard
          titulo="Avance plan de acción"
          valor={`${kpis.avancePlanAccion}%`}
          icono={FaCheckCircle}
          color="#C53030"
          onClick={() => onNavegar?.('recomendaciones')}
        />
      </div>

      <div className="re-dashboard-widgets">
        <section className="re-widget-card">
          <h3>Riesgos por nivel (residual)</h3>
          <div className="re-donut-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={datosDonut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {datosDonut.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="re-donut-leyenda">
              {datosDonut.map((item) => (
                <div key={item.name}>
                  <span style={{ background: item.color }} />
                  {item.name}: {item.value}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="re-widget-card">
          <h3>Top 5 procesos por exposición</h3>
          <div className="re-barras">
            {topProcesos.map((proceso) => (
              <div key={proceso.nombre} className="re-barra-item">
                <div className="re-barra-label">
                  <span>{proceso.nombre}</span>
                  <strong>
                    {proceso.total} ({proceso.porcentaje}%)
                  </strong>
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
          <h3>Hallazgo destacado</h3>
          {hallazgoDestacado ? (
            <p className="re-hallazgo-destacado">{hallazgoDestacado.texto}</p>
          ) : (
            <p className="re-hallazgo-destacado re-hallazgo-destacado--vacio">
              Complete la valoración para generar hallazgos automáticos.
            </p>
          )}
          <button type="button" className="re-link-btn" onClick={() => onNavegar?.('hallazgos')}>
            Ver todos los hallazgos
          </button>
        </section>
      </div>
    </div>
  );
}
